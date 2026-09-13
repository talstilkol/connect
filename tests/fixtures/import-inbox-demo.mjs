import { parseManualReplyRequest } from '../../shared/domain/manualReply.ts';

// Explicitly authorized local demo identities. These are not provider accounts.
export const importInboxDemoAccounts = Object.freeze({
  scope: 'local-demo-fixture-only',
  tenant: { id: 7, displayName: 'Connect import/inbox demo' },
  owner: { externalUserId: 'demo-import-inbox-owner', email: 'import-inbox-owner@example.com', tenantId: 7, role: 'owner', status: 'active' },
  recipients: Array.from({ length: 7 }, (_, index) => ({
    id: 701 + index, phoneNumber: `+1202555010${index}`, firstName: `Demo recipient ${index + 1}`,
    lastName: 'Import', email: `import-inbox-recipient-${index + 1}@example.com`, company: 'Demo only',
    mailingStatus: 'unsubscribed', consentStatus: 'unknown', consentSource: null,
    consentRecordedAt: null, consentWithdrawnAt: null, version: 1,
  })),
});
export const importInboxDemoCsv = [
  'phone,first,last,email,company,rawConsent',
  ...importInboxDemoAccounts.recipients.map((row) => [row.phoneNumber, row.firstName, row.lastName, row.email, row.company, 'granted'].join(',')),
].join('\r\n');
export const importInboxDemoFileName = 'connect-import-inbox-demo.csv';
export const importInboxDemoReply = 'Demo reply: we received your request.';
export const importInboxDemoAt = '2026-09-13T09:00:00.000Z';
export const importInboxDemoConversationKey = `conversation_v1_${'b'.repeat(64)}`;
export const importInboxDemoOtherConversationKey = `conversation_v1_${'c'.repeat(64)}`;
const deliveryKey = `manual_reply_delivery_v1_${'d'.repeat(64)}`;
const clone = (value) => structuredClone(value);
const filters = { searchTerm: '', status: 'all', assignment: 'all' };

function conversation(key, recipient) {
  return {
    conversationKey: key, status: 'agent_active',
    contact: { displayName: recipient.firstName, phoneNumber: recipient.phoneNumber },
    unreadCount: 2, assignment: 'unassigned', version: 3,
    lastMessage: { direction: 'inbound', contentKind: 'text', textContent: 'Demo customer question', occurredAt: importInboxDemoAt },
  };
}

/** A stateful action boundary, never an authentication or live provider emulator. */
export function createImportInboxDemoBoundary(scenario) {
  const state = {
    calls: [], failureConsumed: false, importedIds: [], acceptedReplies: [],
    approvals: scenario.startsWith('ai-') ? ['a','b'].map((character,index)=>({
      outboxKey:`ai_reply_outbox_v1_${character.repeat(64)}`, conversationKey:importInboxDemoConversationKey,
      replyText:`Demo proposed answer ${index+1}`, groundedSourceCount:2, groundingScoreBasisPoints:9000,
      version:1, createdAt:importInboxDemoAt,
    })) : [],
    canDecide:scenario==='ai-decision', approvalDecisions:[], approvalPending:false,
    job: { id: 71, fileName: importInboxDemoFileName, totalRows: 7, processedRows: 0, createdRows: 0,
      updatedRows: 0, unchangedRows: 0, rejectedRows: 0, duplicateRows: 0, status: 'processing' },
    threads: [importInboxDemoConversationKey, importInboxDemoOtherConversationKey].map((key, index) => ({
      conversation: conversation(key, importInboxDemoAccounts.recipients[index]),
      messages: [{ messageKey: `message_v1_${(index === 0 ? 'e' : 'f').repeat(64)}`, direction: 'inbound',
        contentKind: 'text', status: 'received', textContent: `Demo inbound message ${index + 1}`,
        occurredAt: importInboxDemoAt, statusUpdatedAt: importInboxDemoAt }],
      manualReplyEnabled: true, manualReplies: [],
    })),
  };
  if (scenario === 'reply-uncertain') state.threads[0].conversation.assignment = 'current-user';

  function inbox(nextFilters = filters, selectedKey = importInboxDemoConversationKey) {
    const visible = state.threads.filter(({ conversation: row }) =>
      row.contact.displayName.toLowerCase().includes(nextFilters.searchTerm.toLowerCase()) &&
      (nextFilters.status === 'all' || row.status === nextFilters.status) &&
      (nextFilters.assignment === 'all' || row.assignment === (nextFilters.assignment === 'mine' ? 'current-user' : 'unassigned')));
    return clone({ conversations: visible.map((thread) => thread.conversation),
      selectedThread: visible.find((thread) => thread.conversation.conversationKey === selectedKey) ?? visible[0] ?? null,
      canReply: true, filters: nextFilters });
  }

  async function action(name, input) {
    state.calls.push({ name, input: clone(input) });
    if (name === 'startContactImportAction') {
      state.job.fileName = input.fileName;
      return { status: 'ready', job: clone(state.job) };
    }
    if (name === 'processContactImportChunkAction') {
      if (scenario === 'import-resume' && input.rows[0]?.sourceRowNumber === 8 && !state.failureConsumed) {
        state.failureConsumed = true;
        return { status: 'server-error' };
      }
      const contacts = [];
      for (const row of input.rows) {
        const contact = importInboxDemoAccounts.recipients[row.sourceRowNumber - 2];
        if (!contact || input.jobId !== state.job.id || row.phoneNumber !== contact.phoneNumber) throw new Error('Unexpected demo import payload');
        if (!state.importedIds.includes(contact.id)) {
          state.importedIds.push(contact.id);
          contacts.push(clone(contact));
        }
      }
      state.job.processedRows = state.importedIds.length;
      state.job.createdRows = state.importedIds.length;
      state.job.status = state.importedIds.length === 7 ? 'completed' : 'processing';
      return { status: 'processed', job: clone(state.job), contacts };
    }
    if (name === 'loadAiReplyApprovalsAction') return { status: 'loaded', directory: { approvals: clone(state.approvals), canDecide: state.canDecide } };
    if (name === 'decideAiReplyApprovalAction') {
      if (!state.canDecide) return { status:'permission-denied' };
      state.approvalPending=true;
      await new Promise(resolve=>{state.releaseApproval=resolve;});
      state.approvalPending=false;delete state.releaseApproval;
      if (!state.failureConsumed) { state.failureConsumed=true;throw Error('Controlled AI decision acknowledgement failure before saving'); }
      const approval=state.approvals.find(row=>row.outboxKey===input.outboxKey&&row.version===input.expectedVersion);
      if (!approval) return { status:'state-conflict' };
      const decision={outboxKey:approval.outboxKey,status:input.decision==='approve'?'ready-for-delivery':'rejected',version:2};
      state.approvals=state.approvals.filter(row=>row.outboxKey!==approval.outboxKey);state.approvalDecisions.push(decision);
      return { status:'decided',approval:decision };
    }
    if (name === 'refreshInboxAction') return { status: 'refreshed', inbox: inbox(input.filters, input.selectedConversationKey) };
    const key = typeof input === 'string' ? input : input?.conversationKey;
    const thread = state.threads.find((candidate) => candidate.conversation.conversationKey === key);
    if (!thread) throw new Error(`Unexpected demo action ${name}`);
    if (name === 'loadConversationThreadAction') return { status: 'loaded', thread: clone(thread) };
    if (name === 'sendManualReplyAction') {
      const request = parseManualReplyRequest(input);
      if (!request) return { status: 'invalid-input' };
      const accepted = state.acceptedReplies.find((item) => JSON.stringify(item.request) === JSON.stringify(request));
      if (accepted) return { status: 'queued', submission: clone(accepted.submission) };
      if (thread.conversation.version !== request.expectedVersion) return { status: 'state-conflict' };
      if (thread.conversation.assignment !== 'current-user') return { status: 'assignment-required' };
      const submission = { conversationKey: key, version: request.expectedVersion + 1, deliveryKey };
      state.acceptedReplies.push({ request: clone(request), submission });
      thread.conversation.version = submission.version;
      thread.manualReplies.push({ deliveryKey, text: request.text, state: 'queued', createdAt: importInboxDemoAt, updatedAt: importInboxDemoAt });
      if (scenario === 'reply-uncertain' && !state.failureConsumed) {
        state.failureConsumed = true;
        throw new Error('Deliberate demo lost save confirmation');
      }
      return { status: 'queued', submission: clone(submission) };
    }
    if (input.expectedVersion !== thread.conversation.version) return { status: 'state-conflict' };
    if (name === 'markConversationReadAction') {
      thread.conversation.unreadCount = 0;
      thread.conversation.version += 1;
      return { status: 'marked-read', conversation: { conversationKey: key, unreadCount: 0, version: thread.conversation.version } };
    }
    if (name === 'changeConversationAssignmentAction') {
      if (scenario === 'inbox-conflict' && !state.failureConsumed) {
        state.failureConsumed = true;
        return { status: 'state-conflict' };
      }
      thread.conversation.assignment = input.action === 'assign-self' ? 'current-user' : 'unassigned';
      thread.conversation.version += 1;
      return { status: 'assignment-updated', conversation: { conversationKey: key, assignment: thread.conversation.assignment, version: thread.conversation.version } };
    }
    throw new Error(`Unimplemented demo action ${name}`);
  }
  return { state, inbox, action };
}
