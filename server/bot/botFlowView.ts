import type {
  PersistedBotFlow,
  PersistedBotFlowVersion,
} from "../../shared/domain/botFlow.ts";
import type {
  BotFlowDetailsView,
  BotFlowSummaryView,
  BotFlowVersionView,
} from "../../shared/domain/botFlowView.ts";
import type {
  BotFlowDetails,
} from "./botFlowService.ts";

export function toBotFlowSummaryView(
  flow: PersistedBotFlow,
): BotFlowSummaryView {
  return {
    botFlowKey: flow.botFlowKey,
    name: flow.name,
    status: flow.status,
    latestVersionKey: flow.latestVersionKey,
    latestVersionNumber:
      flow.latestVersionNumber,
    activeVersionKey: flow.activeVersionKey,
    version: flow.version,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
  };
}

export function toBotFlowVersionView(
  version: PersistedBotFlowVersion,
): BotFlowVersionView {
  return {
    botFlowVersionKey:
      version.botFlowVersionKey,
    versionNumber: version.versionNumber,
    status: version.status,
    definition: version.definition,
    publishedAt: version.publishedAt,
    createdAt: version.createdAt,
  };
}

export function toBotFlowDetailsView(
  details: BotFlowDetails,
): BotFlowDetailsView {
  return {
    flow: toBotFlowSummaryView(details.flow),
    versions: details.versions.map(
      toBotFlowVersionView,
    ),
  };
}
