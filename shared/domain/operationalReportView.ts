import type {
  AiReportMetrics,
  AiUsageCurrencyMetrics,
  BotReportMetrics,
  CampaignReportMetrics,
  ConversationReportMetrics,
  MessageReportMetrics,
} from "./operationalReport.ts";

export type OperationalReportStatus =
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "ready"
  | "server-error";

export interface OperationalReportPeriodView {
  startDate: string;
  endDate: string;
}

export interface OperationalReportView {
  period: OperationalReportPeriodView;
  generatedAt: string;
  campaigns: CampaignReportMetrics;
  messages: MessageReportMetrics;
  conversations: ConversationReportMetrics;
  bot: BotReportMetrics;
  ai: AiReportMetrics;
  aiUsage:
    readonly AiUsageCurrencyMetrics[];
}
