import { compileKeywordSequenceBotFlowComposerDraft } from '../server/bot/botFlowComposer.ts';
import { deriveBotFlowKey, deriveBotFlowVersionKey } from '../server/bot/botFlowKey.ts';
import { PRODUCTION_DECISION_REGISTRY } from '../shared/domain/productionDecisionRegistry.ts';

export async function createBotAdminDemoFixtures() {
  const tenantId=43001,at='2026-08-16T10:01:00.000Z';
  const botInput={name:'Connect demo support flow',keywords:['demo support'],matchMode:'exact',replyTexts:['This is a local demo reply.'],expectedFlowVersion:null};
  const compiled=await compileKeywordSequenceBotFlowComposerDraft(tenantId,botInput);
  if(!compiled.success)throw Error('BOT_ADMIN_DEMO_FIXTURE_INVALID');
  const botFlowKey=await deriveBotFlowKey(tenantId,botInput.name);
  const botFlowVersionKey=await deriveBotFlowVersionKey(tenantId,botFlowKey,1,compiled.definition);
  // These values reproduce existing policy service/action test fixtures. They
  // are not a live Meta allowance, current evidence, or a policy recommendation.
  const connection={tenantId:7,businessPortfolioId:'400001',wabaId:'400002',phoneNumberId:'400003',status:'connected',version:3};
  const policy={eventKey:`whatsapp_delivery_policy_event_v1_${'a'.repeat(64)}`,tenantId:7,connectionVersion:3,policyVersion:1,deliveryState:'enabled',portfolioCapacity:{kind:'bounded',maximumUniqueRecipients:250},phoneThroughput:{maximumMessagesPerSecond:80,maximumOutboundMessagesPerSecond:64},reservationDurationSeconds:300,metaGraphApiVersion:'v21.0',evidenceDigest:'b'.repeat(64),evidenceCheckedAt:'2026-08-16T10:00:00.000Z',evidenceExpiresAt:'2026-08-16T11:00:00.000Z',recordedAt:at};
  return {tenantId,at,botInput,botFlow:{botFlowKey,name:botInput.name,status:'draft',latestVersionKey:botFlowVersionKey,latestVersionNumber:1,activeVersionKey:null,version:1,createdAt:at,updatedAt:at},botVersion:{botFlowVersionKey,versionNumber:1,status:'draft',definition:compiled.definition,publishedAt:null,createdAt:at},connection,policy,
    actors:{owner:{id:'demo-bot-owner',tenantId,role:'owner'},viewer:{id:'demo-bot-viewer',tenantId,role:'viewer'},admin:{id:'demo-system-admin',role:'system-admin'},denied:{id:'demo-non-admin',role:'viewer'}},
    policyFixtureSources:['tests/system-admin-whatsapp-delivery-policy-action-handler.test.mjs','tests/system-admin-whatsapp-delivery-policy-service.test.mjs'],
    readiness:{readyForProduction:false,checks:PRODUCTION_DECISION_REGISTRY.map(({checkId})=>({id:checkId,category:'governance',status:'decision-required',code:'LOCAL_DEMO_NOT_READY'})),counts:{ready:0,blocked:0,decisionRequired:PRODUCTION_DECISION_REGISTRY.length}}};
}
