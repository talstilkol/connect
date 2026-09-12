import assert from 'node:assert/strict';
import test from 'node:test';
import {createHmac} from 'node:crypto';
import {paddleFixture,billingId,billingTime,billingNow} from './fixtures/paddle-billing.mjs';
import {paddleDigest,paddleTimestamp,parsePaddleTransaction,parsePaddleSubscription} from '../server/billing/paddleProtocol.ts';
import {requirePaddleConfiguration} from '../server/billing/paddleConfiguration.ts';
import {createPaddleProvider,readPaddleBody} from '../server/billing/paddleProvider.ts';
import {verifyPaddleNotice,createPaddleWebhookHandler} from '../server/billing/paddleWebhook.ts';
import {createRailwayNodeRequestDispatcher} from '../server/platform/railwayNodeHttpServer.ts';
import {createRailwayPaddleOperations} from '../server/platform/railwayPaddleOperations.ts';
import {deriveRailwayApiDeterministicIdempotencyKey} from '../server/platform/railwayApiMutationExecutor.ts';
import {createRailwayPaddleHandler} from '../server/billing/railwayPaddleHandler.ts';
import {parsePaddleBillingView} from '../shared/domain/paddleBillingView.ts';
import {readRailwayBullMqWorkerEnvironment} from '../server/platform/railwayBullMqWorkerMain.ts';
const f=paddleFixture();
const bytes=input=>new TextEncoder().encode(JSON.stringify(input));
const event=(overrides={})=>({event_id:billingId('evt'),event_type:'transaction.completed',occurred_at:billingTime,notification_id:'delivery-one',data:f.paid,...overrides});
function signature(body,now=billingNow){const ts=String(Math.floor(now/1000));return`ts=${ts};h1=${createHmac('sha256',f.config.webhookSecret).update(`${ts}:`).update(body).digest('hex')}`;}
const request=(body=bytes(event()),sig=signature(body))=>new Request('http://127.0.0.1/webhooks/paddle',{method:'POST',headers:{'content-type':'application/json','paddle-signature':sig},body});
test('Paddle configuration stays disabled until explicit complete environment-matched account configuration',()=>{
  assert.equal(requirePaddleConfiguration({}),null);assert.equal(requirePaddleConfiguration({...f.environment,PADDLE_ENABLED:'false'}),null);
  for(const key of Object.keys(f.environment).filter(k=>k!=='PADDLE_ENABLED'))assert.throws(()=>requirePaddleConfiguration({...f.environment,[key]:undefined}),{code:'CONFIGURATION_REQUIRED'});
  for(const changes of [{PADDLE_ENABLED:'1'},{PADDLE_ENVIRONMENT:'live'},{PADDLE_ENVIRONMENT:'production'},{PADDLE_CHECKOUT_BASE_URL:'https://app.connect.example/workspace/billing?next=external'},{PADDLE_CHECKOUT_BASE_URL:'http://127.0.0.1'}])assert.throws(()=>requirePaddleConfiguration({...f.environment,...changes}),{code:'CONFIGURATION_REQUIRED'});
});
test('real BullMQ executable forwards every Paddle setting instead of silently keeping the worker disabled',()=>{
  const previous=Object.fromEntries(Object.keys(f.environment).map(key=>[key,process.env[key]]));
  try{Object.assign(process.env,f.environment);const actual=readRailwayBullMqWorkerEnvironment();for(const[key,value]of Object.entries(f.environment))assert.equal(actual[key],value);}
  finally{for(const[key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
test('Paddle timestamps preserve microsecond event ordering and reject invalid calendar dates',()=>{
  assert.equal(paddleTimestamp('2026-07-26T09:00:00.1Z'),'2026-07-26T09:00:00.100000Z');
  assert.ok(paddleTimestamp('2026-07-26T09:00:00.000001Z')>paddleTimestamp(billingTime));
  for(const value of ['2026-02-30T09:00:00Z','2026-07-26T24:00:00Z','2026-07-26T09:00:00.0000001Z','2026-07-26T09:00:00+00:00'])assert.throws(()=>paddleTimestamp(value));
});
test('Paddle signed bytes and freshness are verified before parsing; rotation and duplicate notification IDs remain supported',()=>{
  const body=bytes(event()),valid=signature(body),notice=verifyPaddleNotice(body,valid,f.config.webhookSecret,billingNow);
  assert.equal(notice.entityId,f.paid.id);
  const alternate=bytes(event({notification_id:'delivery-two'}));assert.equal(verifyPaddleNotice(alternate,signature(alternate),f.config.webhookSecret,billingNow).digest,notice.digest);
  assert.deepEqual(verifyPaddleNotice(body,`${valid};h1=${'0'.repeat(64)}`,f.config.webhookSecret,billingNow),notice);
  for(const [data,sig,now] of [[bytes(event({data:f.transaction})),valid,billingNow],[body,valid,billingNow+6000],[body,valid,billingNow-6000],[body,valid+';ts=1785056400',billingNow],[body,'ts=1785056400;h1=invalid',billingNow],[bytes(event()),null,billingNow]])assert.throws(()=>verifyPaddleNotice(data,sig,f.config.webhookSecret,now),{code:'INVALID_SIGNATURE'});
  const unknown=bytes(event({event_type:'customer.updated',data:{id:billingId('ctm')}}));assert.equal(verifyPaddleNotice(unknown,signature(unknown),f.config.webhookSecret,billingNow).entityId,null);
});
test('Paddle webhook commits once before ack and does not report success after a persistence failure',async()=>{
  let writes=0;let finish;const pending=new Promise(resolve=>finish=resolve);
  const handler=createPaddleWebhookHandler(f.config.webhookSecret,async()=>{writes++;await pending},()=>billingNow);
  let finished=false;const response=handler.handle(request()).then(r=>{finished=true;return r});await new Promise(resolve=>setImmediate(resolve));assert.equal(writes,1);assert.equal(finished,false);finish();assert.equal((await response).status,200);
  const failed=createPaddleWebhookHandler(f.config.webhookSecret,async()=>{throw Error('storage')},()=>billingNow);assert.equal((await failed.handle(request())).status,503);
  assert.equal((await handler.handle(request(bytes(event()),'invalid'))).status,401);assert.equal(writes,1);
  assert.equal((await handler.handle(new Request('http://127.0.0.1/webhooks/paddle'))).status,400);
});
test('Paddle raw route is reachable without BFF identity but only a verified handler can acknowledge it',async()=>{
  const runtime={handler:{async handle(){throw Error('BFF must not run')}},readiness:{async check(){return{status:'ready'}}}};
  assert.equal((await createRailwayNodeRequestDispatcher(runtime)(request())).status,503);
  let notice;runtime.paddleWebhookHandler=createPaddleWebhookHandler(f.config.webhookSecret,async value=>{notice=value},()=>billingNow);
  assert.equal((await createRailwayNodeRequestDispatcher(runtime)(request())).status,200);assert.equal(notice.eventId,billingId('evt'));
});
test('Paddle body readers cancel oversized, empty and aborted streams',async()=>{
  let cancelled=false;const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(262145))},cancel(){cancelled=true}});
  await assert.rejects(readPaddleBody(body,new AbortController().signal));assert.equal(cancelled,true);
  const controller=new AbortController();controller.abort();await assert.rejects(readPaddleBody(new Response('x').body,controller.signal));
});
test('Paddle provider emits one authorized transaction POST without idempotency headers, custom tenant data or retries',async()=>{
  const calls=[];const provider=createPaddleProvider(f.config,async(url,options)=>{calls.push({url,options});return Response.json({data:f.transaction})});
  assert.deepEqual(await provider.createTransaction(f.work,async()=>true),f.receipt);assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://sandbox-api.paddle.com/transactions');assert.equal(calls[0].options.redirect,'error');
  assert.deepEqual(JSON.parse(calls[0].options.body),{items:[{price_id:f.config.priceId,quantity:1}],collection_mode:'automatic',checkout:{url:f.config.checkoutBaseUrl}});
  assert.equal(new Headers(calls[0].options.headers).has('idempotency-key'),false);
  await assert.rejects(provider.createTransaction(f.work,async()=>false));assert.equal(calls.length,1);
  let attempts=0;const uncertain=createPaddleProvider(f.config,async()=>{attempts++;throw Error('lost response')});await assert.rejects(uncertain.createTransaction(f.work,async()=>true));assert.equal(attempts,1);
});
test('Paddle provider rejects foreign checkout URLs, changed prices, quantity, one-time products and invented trial periods',()=>{
  for(const changes of [{checkout:{url:'https://other.example/'}},{collection_mode:'manual'},{items:[...f.transaction.items,...f.transaction.items]},
    {items:[{...f.transaction.items[0],quantity:2}]},{items:[{quantity:1,price:{...f.transaction.items[0].price,product_id:billingId('pro','other')}}]},
    {items:[{quantity:1,price:{...f.transaction.items[0].price,billing_cycle:null}}]},
    {items:[{quantity:1,price:{...f.transaction.items[0].price,trial_period:{interval:'day',frequency:30}}}]}])assert.throws(()=>parsePaddleTransaction({...f.transaction,...changes},f.config));
  assert.throws(()=>parsePaddleSubscription({...f.sub,current_billing_period:null},f.config));
  assert.equal(parsePaddleSubscription({...f.sub,status:'canceled',current_billing_period:null},f.config).endsAt,null);
});
test('Paddle reads validate requested identity and preserve scheduled cancellation until its effective period',async()=>{
  const provider=createPaddleProvider(f.config,async url=>Response.json({data:url.includes('/subscriptions/')?f.sub:f.paid}));
  assert.deepEqual(await provider.getTransaction(f.paid.id,f.config),f.payment);assert.deepEqual(await provider.getSubscription(f.sub.id,f.config),f.subscription);
  await assert.rejects(provider.getSubscription(billingId('sub','foreign'),f.config));
  const scheduled=parsePaddleSubscription({...f.sub,scheduled_change:{action:'cancel',effective_at:f.sub.current_billing_period.ends_at}},f.config);
  assert.equal(scheduled.status,'active');assert.equal(scheduled.scheduledChange.action,'cancel');
});
const view={attempt:1,canCreateCheckout:false,customerPortalUrl:f.config.customerPortalUrl,paidAccessReason:'manual-pilot',environment:'sandbox',clientToken:f.config.clientToken,canManage:true,checkout:{state:'ready',transactionId:f.receipt.id,url:f.receipt.checkoutUrl},subscription:null};
test('Paddle BFF data rejects unwanted secrets and invalid checkout identity',()=>{
  assert.deepEqual(parsePaddleBillingView(view),view);assert.equal(parsePaddleBillingView({...view,apiKey:f.config.apiKey}),null);
  assert.equal(parsePaddleBillingView({...view,canManage:false}),null);
  assert.equal(parsePaddleBillingView({...view,checkout:{...view.checkout,transactionId:billingId('txn','foreign')}}),null);
});
test('Paddle authenticated operations restrict creation to owner and an observed attempt, with a durable domain replay key',async()=>{
  let enqueued=0,limited=false,session=f.session;const dependencies={tenantSessions:{async resolve(){return session}},mutationRateLimit:{async consume(){return{outcome:limited?'limited':'allowed'}}},billing:{plan:f.config,clientToken:f.config.clientToken,customerPortalUrl:f.config.customerPortalUrl,journal:{async enqueue(s,p,attempt){assert.equal(attempt,0);assert.equal(s.tenantId,7);assert.equal(p.priceId,f.config.priceId);enqueued++},async read(){return{attempt:view.attempt,canCreateCheckout:view.canCreateCheckout,paidAccessReason:view.paidAccessReason,environment:view.environment,canManage:view.canManage,checkout:view.checkout,subscription:view.subscription}}}}};
  const [read,create]=createRailwayPaddleOperations(dependencies),context={userIdentity:{externalUserId:session.externalUserId}},req={operation:create.id,requestKind:'mutation',idempotencyKey:await deriveRailwayApiDeterministicIdempotencyKey(create.id,{expectedAttempt:0}),payload:{expectedAttempt:0}};
  assert.deepEqual(await create.execute(context,{expectedAttempt:0},req),view);assert.equal(enqueued,1);
  for(const payload of [{},{expectedAttempt:-1},{expectedAttempt:0.5},{expectedAttempt:0,tenantId:7},{expectedAttempt:1}])await assert.rejects(create.execute(context,payload,req),{code:'INVALID_REQUEST'});
  await assert.rejects(create.execute(context,{priceId:f.config.priceId},req),{code:'INVALID_REQUEST'});
  session={...session,role:'manager'};await assert.rejects(create.execute(context,{expectedAttempt:0},req),{code:'PERMISSION_DENIED'});session=f.session;
  limited=true;await assert.rejects(create.execute(context,{expectedAttempt:0},req),{code:'RATE_LIMITED'});assert.equal(enqueued,1);
  assert.deepEqual(await read.execute(context,{},{operation:read.id,requestKind:'query',idempotencyKey:null}),view);
});
test('Paddle BFF derives server identity and no client can choose a tenant or price',async()=>{
  const calls=[];const handler=createRailwayPaddleHandler({applicationConfigured:()=>true,inspectConfiguration:()=>({status:'configured',configuration:{apiOrigin:'https://api.connect.example',deploymentEnvironment:'preview'}}),resolveIdentity:async()=>({status:'authenticated',oidcToken:'service-identity',userSessionToken:'user-session'}),createClient(config){assert.equal(config.userSessionToken,'user-session');return{async call(request){calls.push(request);return{outcome:'ok',data:view}}}}});
  for(const attempt of [undefined,-1,0.5,'0'])assert.equal((await handler.createCheckout(attempt)).status,'server-error');assert.equal(calls.length,0);assert.equal((await handler.createCheckout(0)).status,'ready');assert.equal((await handler.read()).status,'ready');assert.deepEqual(calls.map(c=>c.payload),[{expectedAttempt:0},{}]);assert.equal(calls[0].requestKind,'mutation');assert.equal(calls[1].idempotencyKey,null);
});

test('only public environment-matched Paddle portal login URLs cross the BFF; no bearer sessions or buyer prefill',()=>{
  for(const suffix of ['?token=secret','?action=cancel_subscription','/subscriptions','/','#portal',' ','\n']){
    assert.throws(()=>requirePaddleConfiguration({...f.environment,PADDLE_CUSTOMER_PORTAL_URL:f.config.customerPortalUrl+suffix}),{code:'CONFIGURATION_REQUIRED'});
    assert.equal(parsePaddleBillingView({...view,customerPortalUrl:f.config.customerPortalUrl+suffix}),null);
  }
  for(const url of [f.config.customerPortalUrl.replace('sandbox-',''),f.config.customerPortalUrl.replace('paddle.com','paddle.com.evil.example'),f.config.customerPortalUrl.replace('https://','http://'),f.config.customerPortalUrl.replace('https://','https://buyer@')])assert.equal(parsePaddleBillingView({...view,customerPortalUrl:url}),null);
  const production=requirePaddleConfiguration({...f.environment,PADDLE_ENVIRONMENT:'production',PADDLE_CLIENT_TOKEN:f.config.clientToken.replace('test_','live_'),PADDLE_CUSTOMER_PORTAL_URL:f.config.customerPortalUrl.replace('sandbox-','')});
  assert.equal(production.environment,'production');
});
test('billing view keeps repurchase, exact subscription reference and scheduled change internally consistent',()=>{
  const subscription={id:f.subscription.id,status:'canceled',endsAt:null,needsReview:false,scheduledChange:null};
  const canceled={...view,canCreateCheckout:true,checkout:{state:'completed',transactionId:null,url:null},subscription};
  assert.deepEqual(parsePaddleBillingView(canceled),canceled);
  for(const changes of [{attempt:0},{canManage:false},{subscription:{...subscription,status:'active'}},{subscription:{...subscription,needsReview:true}},{subscription:{...subscription,id:f.subscription.customerId}},{subscription:{...subscription,scheduledChange:{action:'cancel',effectiveAt:'2026-02-30T00:00:00.000Z'}}}])assert.equal(parsePaddleBillingView({...canceled,...changes}),null);
});

test('creation correlation is bounded, preserves support request IDs and precedes business validation',async()=>{
  const digest=paddleDigest(f.receipt.id),requestId=`${digest.slice(0,8)}-${digest.slice(8,12)}-${digest.slice(12,16)}-${digest.slice(16,20)}-${digest.slice(20,32)}`;
  const body={data:{...f.transaction,items:[]},meta:{request_id:requestId}},observations=[];
  const provider=createPaddleProvider(f.config,async()=>Response.json(body));
  await assert.rejects(provider.createTransaction(f.work,async()=>true,async value=>{observations.push(value)}));
  assert.deepEqual(observations,[{requestId,httpStatus:200,transactionId:f.transaction.id,responseDigest:paddleDigest(body)}]);
  const failure=createPaddleProvider(f.config,async()=>Response.json({error:{detail:'private failure'},meta:{request_id:'not-a-request-id'},data:f.transaction},{status:400}));
  await assert.rejects(failure.createTransaction(f.work,async()=>true,async value=>{assert.equal(value.transactionId,null);assert.equal(value.requestId,null);assert.equal(Object.keys(value).length,4)}));
});
test('billing UI contract permits a new attempt after evidenced closure but never exposes a closed transaction',()=>{
  const closed={...view,canCreateCheckout:true,checkout:{state:'closed',transactionId:null,url:null}};
  assert.deepEqual(parsePaddleBillingView(closed),closed);
  assert.equal(parsePaddleBillingView({...closed,checkout:{...closed.checkout,transactionId:f.receipt.id,url:f.receipt.checkoutUrl}}),null);
});
