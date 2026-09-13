import { parseMetaDataSyncView } from '../../shared/domain/metaDataSyncView.ts';
import { parseMetaMediaTaskPage } from '../../shared/domain/metaMediaTaskView.ts';
import { parseMetaMediaInspectionRetryInput } from '../../shared/domain/metaMediaInspectionRetry.ts';
import { parseMetaMediaCleanupInput } from '../../shared/domain/metaMediaCleanup.ts';

// User-authorized local fixtures only. No account, asset, token or code here is
// issued by a provider; they must never be sent to an external service.
export const metaLifecycleMediaAccounts = {
  scope: 'local-demo-fixture-only', tenant: { id: 43001, name: 'Connect Meta media demo' },
  owner: { id: 'user_demo_meta_media_owner', email: 'meta-media-owner@example.com', tenantId: 43001, role: 'owner' },
  viewer: { id: 'user_demo_meta_media_viewer', email: 'meta-media-viewer@example.com', tenantId: 43001, role: 'viewer' },
};
export const metaLifecycleMediaTime = '2026-09-13T09:00:00.000Z';
export const metaLifecycleMediaMessageKey = `message_v1_${'d'.repeat(64)}`;
export const metaLifecycleMediaBytes = 'LOCAL DEMO MEDIA ONLY\nNo provider file or personal data.\n';
export const metaLifecycleDeletedOriginalText = 'Demo stale deleted body must never be displayed';
export const metaLifecycleHistoryThread = {
  conversation: { conversationKey: `conversation_v1_${'e'.repeat(64)}`, status: 'agent_active',
    contact: { displayName: 'Demo history contact', phoneNumber: '+12025550108' },
    unreadCount: 0, assignment: 'unassigned', version: 3, lastMessage: null },
  manualReplyEnabled: false, manualReplies: [],
  messages: [
    { messageKey: `message_v1_${'a'.repeat(64)}`, source: 'history', historyDeliveryState: 'READ', direction: 'inbound', contentKind: 'text', status: null,
      textContent: 'Demo imported historical message', occurredAt: metaLifecycleMediaTime, statusUpdatedAt: null },
    { messageKey: `message_v1_${'b'.repeat(64)}`, direction: 'outbound', contentKind: 'text', status: 'delivered', contentState: 'edited',
      textContent: 'Demo edited Business App echo', occurredAt: metaLifecycleMediaTime, statusUpdatedAt: metaLifecycleMediaTime },
    { messageKey: `message_v1_${'c'.repeat(64)}`, direction: 'outbound', contentKind: 'text', status: 'delivered', contentState: 'deleted',
      // Deliberately stale boundary content exercises defensive UI redaction;
      // production deletion DTOs normally carry null here.
      textContent: metaLifecycleDeletedOriginalText, occurredAt: metaLifecycleMediaTime, statusUpdatedAt: metaLifecycleMediaTime },
  ],
};
// Syntactically token-shaped to exercise the real local download client. Not a signed JWT.
export const metaLifecycleMediaToken = 'ZGVtby1vbmx5.bG9jYWwtZml4dHVyZQ.bm90LWEtdmFsaWQtc2lnbmF0dXJl';
export const metaLifecycleSignup = {
  configuration: { status: 'configured', appId: '4300101', configurationId: '4300102', apiVersion: 'v21.0' },
  launch: { status: 'ready', launchId: 43001, expiresAt: '2026-09-13T10:00:00.000Z' },
  authorizationCode: 'local-demo-authorization-code-never-valid-with-provider',
  assets: { businessPortfolioId: '4300103', wabaId: '4300104', phoneNumberId: '4300105' },
};
export const metaLifecycleSyncStates = [
  { stage: 'receiving-history', contacts: 'accepted', history: 'accepted', providerProgress: 50, receivedChunks: 4, processedChunks: 2, projectedMessages: 6 },
  { stage: 'awaiting-verification', contacts: 'accepted', history: 'accepted', providerProgress: 100, receivedChunks: 4, processedChunks: 4, projectedMessages: 12 },
  { stage: 'recovery-required', contacts: 'accepted', history: 'unknown', providerProgress: null, receivedChunks: 0, processedChunks: 0, projectedMessages: 0 },
  { stage: 'connection-changed', contacts: 'cancelled', history: 'cancelled', providerProgress: null, receivedChunks: 0, processedChunks: 0, projectedMessages: 0 },
].map(value => {
  const parsed = parseMetaDataSyncView(value);
  if (!parsed) throw new Error('Invalid local sync fixture');
  return parsed;
});
const baseTask = {
  kind: 'inspect', status: 'recovery-required', attempts: 12, version: 4, operatorRetries: 0,
  canCleanup: false, cleanup: null, updatedAt: metaLifecycleMediaTime, nextAttemptAt: null,
  leaseExpiresAt: null, leaseExpired: false, scanResults: [], multipleScanVersions: false,
};
export const metaLifecycleMediaTasks = parseMetaMediaTaskPage({ tasks: [
  { ...baseTask, jobKey: `media_upload_v1_${'a'.repeat(64)}` },
  { ...baseTask, jobKey: `media_upload_v1_${'b'.repeat(64)}`, status: 'blocked', attempts: 1, version: 7, canCleanup: true, scanResults: ['THREATS_FOUND'] },
  { ...baseTask, jobKey: `media_upload_v1_${'c'.repeat(64)}`, attempts: 15, operatorRetries: 3 },
], nextCursor: null });
if (!metaLifecycleMediaTasks) throw new Error('Invalid local media task fixtures');

export function createMetaLifecycleMediaBoundary() {
  const state = { refreshes: 0, retryCalls: [], cleanupCalls: [], retryIntents: 0, cleanupIntents: 0,
    sdkLoads: [], sdkLogins: [], beginCalls: [], completeCalls: [], tokenMode: 'pending', tokenCalls: 0 };
  let pendingRetry;
  let pendingCleanup;
  let sdkCallback;
  return {
    state,
    async requestRetry(input) {
      if (!parseMetaMediaInspectionRetryInput(input)) throw new Error('Invalid demo retry payload');
      state.retryCalls.push(structuredClone(input));
      if (state.retryIntents) return 'already-requested';
      state.retryIntents += 1;
      return new Promise(resolve => { pendingRetry = resolve; });
    },
    resolveRetry(status) { if (!pendingRetry) throw new Error('No pending retry'); pendingRetry(status); pendingRetry = undefined; },
    async requestCleanup(input) {
      if (!parseMetaMediaCleanupInput(input)) throw new Error('Invalid demo cleanup payload');
      state.cleanupCalls.push(structuredClone(input));
      return new Promise(resolve => { pendingCleanup = resolve; });
    },
    resolveCleanup(status) {
      if (!pendingCleanup) throw new Error('No pending cleanup');
      if (status === 'queued') state.cleanupIntents += 1;
      pendingCleanup(status); pendingCleanup = undefined;
    },
    async getToken() {
      state.tokenCalls += 1;
      if (state.tokenMode === 'pending') return new Promise(() => {});
      return state.tokenMode === 'signed-out' ? null : metaLifecycleMediaToken;
    },
    async sdkLoad(configuration) {
      state.sdkLoads.push(structuredClone(configuration));
      return { login(callback, options) { state.sdkLogins.push(structuredClone(options)); sdkCallback = callback; } };
    },
    loginResponse(response) { if (!sdkCallback) throw new Error('SDK was not launched'); sdkCallback(response); },
    async beginSignup(flow) { state.beginCalls.push(flow); return structuredClone(metaLifecycleSignup.launch); },
    async completeSignup(input) {
      state.completeCalls.push(structuredClone(input));
      return { status: 'connected', connection: { status: 'connected' }, ...(input.flow === 'business-app' ? { synchronization: 'background' } : {}) };
    },
  };
}
