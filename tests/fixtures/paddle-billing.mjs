// Deterministic protocol adaptation of existing billing-webhook-ingress fixtures.
// These values are confined to tests; no Paddle account or payment is contacted.
import { paddleDigest, parsePaddleTransaction, parsePaddleSubscription } from '../../server/billing/paddleProtocol.ts';
import { requirePaddleConfiguration } from '../../server/billing/paddleConfiguration.ts';
export const billingTime='2026-07-26T09:00:00.000000Z';
export const billingNow=Date.parse(billingTime);
export const billingId=(prefix,subject='provider-event-001')=>`${prefix}_${paddleDigest(subject).slice(0,26)}`;
export function paddleFixture(tenantId=7){
  const environment={PADDLE_CUSTOMER_PORTAL_URL:`https://sandbox-customer-portal.paddle.com/${billingId('cpl','provider-event-001')}`,PADDLE_ENABLED:'true',PADDLE_ENVIRONMENT:'sandbox',PADDLE_API_KEY:'integration-access-key',PADDLE_WEBHOOK_SECRET:'integration-signing-key',
    PADDLE_CLIENT_TOKEN:`test_${paddleDigest('provider-event-001').slice(0,27)}`,PADDLE_PRICE_ID:billingId('pri','provider-price'),PADDLE_PRODUCT_ID:billingId('pro','provider-product'),PADDLE_CHECKOUT_BASE_URL:'https://app.connect.example/workspace/billing'};
  const config=requirePaddleConfiguration(environment),id=billingId('txn',`provider-event-001:${tenantId}`),customer=billingId('ctm',`provider-customer:${tenantId}`),subscription=billingId('sub',`provider-subscription:${tenantId}`);
  const items=[{quantity:1,price:{id:config.priceId,product_id:config.productId,billing_cycle:{interval:'month',frequency:1},trial_period:null}}];
  const transaction={id,status:'draft',customer_id:null,subscription_id:null,collection_mode:'automatic',updated_at:billingTime,items,checkout:{url:`${config.checkoutBaseUrl}?_ptxn=${id}`}};
  const paid={...transaction,status:'completed',customer_id:customer,subscription_id:subscription};
  const sub={id:subscription,customer_id:customer,status:'active',updated_at:billingTime,collection_mode:'automatic',items,
    current_billing_period:{starts_at:'2026-07-26T00:00:00.000000Z',ends_at:'2026-08-26T00:00:00.000000Z'},scheduled_change:null};
  const work={tenantId,intentKey:`paddle_checkout_v1_${paddleDigest({tenantId,environment:config.environment,generation:1})}`,environment:config.environment,
    priceId:config.priceId,productId:config.productId,checkoutBaseUrl:config.checkoutBaseUrl,actorExternalUserId:'user_knowledge_owner'};
  const session={tenantId,externalUserId:work.actorExternalUserId,role:'owner',status:'active',displayName:'צוות שירות'};
  return{environment,config,transaction,paid,sub,work,session,receipt:parsePaddleTransaction(transaction,config),payment:parsePaddleTransaction(paid,config),subscription:parsePaddleSubscription(sub,config)};
}
