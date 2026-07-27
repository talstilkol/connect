export interface OperationalReportWindow {
  startAt: string;
  endAt: string;
}

export interface CampaignReportMetrics {
  total: number;
  recipientCount: number;
  draft: number;
  scheduled: number;
  running: number;
  paused: number;
  completed: number;
  cancelled: number;
  failed: number;
}

export interface MessageReportMetrics {
  total: number;
  inbound: number;
  outbound: number;
  received: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface ConversationReportMetrics {
  active: number;
  unreadCount: number;
  new: number;
  botActive: number;
  waitingForAgent: number;
  agentActive: number;
  waitingForContact: number;
  closed: number;
}

export interface BotReportMetrics {
  total: number;
  pending: number;
  sending: number;
  accepted: number;
  rejected: number;
  ambiguous: number;
}

export interface AiReportMetrics {
  totalTurns: number;
  replyPlanned: number;
  handoff: number;
}

export interface AiUsageCurrencyMetrics {
  currency: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  costMinorUnits: number;
}

export interface OperationalReportSnapshot {
  window: OperationalReportWindow;
  generatedAt: string;
  campaigns: CampaignReportMetrics;
  messages: MessageReportMetrics;
  conversations: ConversationReportMetrics;
  bot: BotReportMetrics;
  ai: AiReportMetrics;
  aiUsage:
    readonly AiUsageCurrencyMetrics[];
}
