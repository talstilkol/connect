import { createHash } from 'node:crypto';

// Explicitly authorized deterministic demo data, never provider identities.
const selectionKey = name => 'tenant_selection_option_v1_' + createHash('sha256').update(name).digest('hex');
export const tenantReportsDemoTenants = [
  { tenantId: 42001, selectionKey: selectionKey('connect-tenant-reports-demo-alpha'), organizationId: 'org_demo_reports_alpha', displayName: 'Connect Demo Alpha', role: 'owner' },
  { tenantId: 42002, selectionKey: selectionKey('connect-tenant-reports-demo-beta'), organizationId: 'org_demo_reports_beta', displayName: 'Connect Demo Beta', role: 'manager' },
];
export const tenantReportsDemoAccount = { id: 'user_tenant_reports_demo', email: 'reports@connect-demo.invalid' };
export function tenantReportsDemoReport(tenantIndex, updated = false) {
  const total = (tenantIndex === 0 ? 1 : 3) + Number(updated);
  return {
    period: { startDate: updated ? '2026-07-10' : '2026-07-01', endDate: updated ? '2026-07-20' : '2026-07-31' },
    generatedAt: '2026-07-31T10:00:00.000Z',
    campaigns: { total, recipientCount: total * 4, draft: 0, scheduled: 0, running: 0, paused: 0, completed: total, cancelled: 0, failed: 0 },
    messages: { total: total * 2, inbound: total, outbound: total, received: total, sent: 0, delivered: 0, read: total, failed: 0 },
    conversations: { active: total, unreadCount: 0, new: 0, botActive: 0, waitingForAgent: 0, agentActive: 0, waitingForContact: 0, closed: total },
    bot: { total, pending: 0, sending: 0, accepted: total, rejected: 0, ambiguous: 0 },
    ai: { totalTurns: total, replyPlanned: total, handoff: 0 },
    aiUsage: [{ currency: 'USD', requestCount: total, inputTokens: total * 120, outputTokens: total * 30, costMinorUnits: total * 8 }],
  };
}
