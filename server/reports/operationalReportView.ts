import type {
  OperationalReportResult,
} from "./operationalReportService.ts";
import type {
  OperationalReportView,
} from "../../shared/domain/operationalReportView.ts";

export function toOperationalReportView(
  result: OperationalReportResult,
): OperationalReportView {
  return {
    period: {
      startDate: result.period.startDate,
      endDate: result.period.endDate,
    },
    generatedAt:
      result.snapshot.generatedAt,
    campaigns: {
      total: result.snapshot.campaigns.total,
      recipientCount:
        result.snapshot.campaigns
          .recipientCount,
      draft: result.snapshot.campaigns.draft,
      scheduled:
        result.snapshot.campaigns.scheduled,
      running:
        result.snapshot.campaigns.running,
      paused:
        result.snapshot.campaigns.paused,
      completed:
        result.snapshot.campaigns.completed,
      cancelled:
        result.snapshot.campaigns.cancelled,
      failed:
        result.snapshot.campaigns.failed,
    },
    messages: {
      total: result.snapshot.messages.total,
      inbound:
        result.snapshot.messages.inbound,
      outbound:
        result.snapshot.messages.outbound,
      received:
        result.snapshot.messages.received,
      sent: result.snapshot.messages.sent,
      delivered:
        result.snapshot.messages.delivered,
      read: result.snapshot.messages.read,
      failed:
        result.snapshot.messages.failed,
    },
    conversations: {
      active:
        result.snapshot.conversations.active,
      unreadCount:
        result.snapshot.conversations
          .unreadCount,
      new: result.snapshot.conversations.new,
      botActive:
        result.snapshot.conversations
          .botActive,
      waitingForAgent:
        result.snapshot.conversations
          .waitingForAgent,
      agentActive:
        result.snapshot.conversations
          .agentActive,
      waitingForContact:
        result.snapshot.conversations
          .waitingForContact,
      closed:
        result.snapshot.conversations.closed,
    },
    bot: {
      total: result.snapshot.bot.total,
      pending: result.snapshot.bot.pending,
      sending: result.snapshot.bot.sending,
      accepted: result.snapshot.bot.accepted,
      rejected: result.snapshot.bot.rejected,
      ambiguous:
        result.snapshot.bot.ambiguous,
    },
    ai: {
      totalTurns:
        result.snapshot.ai.totalTurns,
      replyPlanned:
        result.snapshot.ai.replyPlanned,
      handoff: result.snapshot.ai.handoff,
    },
    aiUsage: result.snapshot.aiUsage.map(
      (usage) => ({
        currency: usage.currency,
        requestCount: usage.requestCount,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costMinorUnits:
          usage.costMinorUnits,
      }),
    ),
  };
}
