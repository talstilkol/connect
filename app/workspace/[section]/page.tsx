import { notFound } from "next/navigation";
import WorkspaceApp from "../../../features/workspace/WorkspaceApp";
import { hasClerkServerConfiguration } from "../../../server/auth/clerkConfiguration";
import { readCurrentContacts } from "../../../server/contacts/currentContacts";
import { readCurrentCampaigns } from "../../../server/campaigns/currentCampaigns";
import { readCurrentBotFlows } from "../../../server/bot/currentBotFlows";
import { readCurrentAiAgents } from "../../../server/ai/currentAiAgents";
import { readCurrentAiReplyApprovals } from "../../../server/ai/currentAiReplyApprovals";
import { readCurrentInbox } from "../../../server/conversations/currentInbox";
import { readCurrentMetaEmbeddedSignup } from "../../../server/meta/currentMetaEmbeddedSignup";
import { readCurrentMetaConnection } from "../../../server/meta/currentMetaConnection";
import { readCurrentMessageTemplates } from "../../../server/templates/currentMessageTemplates";
import { readCurrentOperationalReport } from "../../../server/reports/currentOperationalReport";
import { readCurrentTeamDirectory } from "../../../server/team/currentTeamDirectory";
import { readCurrentProductionReadiness } from "../../../server/operations/currentProductionReadiness";
import { configurationRequiredMetaEmbeddedSignup } from "../../../shared/domain/metaEmbeddedSignupView";
import { configurationRequiredMetaConnection } from "../../../shared/domain/metaConnectionView";
import { defaultInboxFilters } from "../../../shared/domain/conversationView";
import { isSectionId } from "../../../shared/workspace/navigation";

export default async function WorkspaceSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!isSectionId(section)) {
    notFound();
  }

  const authEnabled = hasClerkServerConfiguration();
  const [
    contactsResult,
    initialMetaConnection,
    initialMetaEmbeddedSignup,
    messageTemplatesResult,
    campaignsResult,
    inboxResult,
    aiReplyApprovalsResult,
    botFlowsResult,
    aiAgentsResult,
    operationalReportResult,
    teamDirectoryResult,
    initialProductionReadiness,
  ] = await Promise.all([
    section === "contacts" && authEnabled
      ? readCurrentContacts()
      : Promise.resolve({
          status: "configuration-required" as const,
          contacts: [],
          nextCursor: null,
          organization: {
            scopeContactIds: [],
            tags: [],
            lists: [],
            tagAssignments: [],
            listMemberships: [],
          },
        }),
    section === "dashboard" || section === "onboarding"
      ? readCurrentMetaConnection()
      : Promise.resolve(configurationRequiredMetaConnection),
    section === "dashboard" || section === "onboarding"
      ? readCurrentMetaEmbeddedSignup()
      : Promise.resolve(
          configurationRequiredMetaEmbeddedSignup,
        ),
    section === "templates" && authEnabled
      ? readCurrentMessageTemplates()
      : Promise.resolve({
          status: "configuration-required" as const,
          templates: [],
          canWrite: false as const,
        }),
    section === "campaigns" && authEnabled
      ? readCurrentCampaigns()
      : Promise.resolve({
          status: "configuration-required" as const,
          campaigns: [],
          templates: [],
          audiences: {
            lists: [],
            tags: [],
          },
          canWrite: false as const,
          deliveryStatus:
            "configuration-required" as const,
        }),
    section === "inbox" && authEnabled
      ? readCurrentInbox()
      : Promise.resolve({
          status: "configuration-required" as const,
          inbox: {
            conversations: [],
            selectedThread: null,
            canReply: false as const,
            filters: { ...defaultInboxFilters },
          },
        }),
    section === "inbox" && authEnabled
      ? readCurrentAiReplyApprovals()
      : Promise.resolve({
          status:
            "configuration-required" as const,
          directory: {
            approvals: [],
            canDecide: false as const,
          },
        }),
    section === "bot" && authEnabled
      ? readCurrentBotFlows()
      : Promise.resolve({
          status:
            "configuration-required" as const,
          botFlows: {
            flows: [],
            selectedFlow: null,
            canWrite: false as const,
          },
        }),
    section === "ai" && authEnabled
      ? readCurrentAiAgents()
      : Promise.resolve({
          status:
            "configuration-required" as const,
          aiAgents: {
            agents: [],
            selectedAgent: null,
            knowledgeSources: [],
            canWrite: false as const,
          },
        }),
    section === "reports" && authEnabled
      ? readCurrentOperationalReport()
      : Promise.resolve({
          status:
            "configuration-required" as const,
          report: null,
        }),
    section === "team" && authEnabled
      ? readCurrentTeamDirectory()
      : Promise.resolve({
          status:
            "configuration-required" as const,
          directory: {
            members: [],
          },
        }),
    Promise.resolve(
      readCurrentProductionReadiness(),
    ),
  ]);

  return (
    <WorkspaceApp
      activeSection={section}
      authEnabled={authEnabled}
      initialContacts={contactsResult.contacts}
      initialContactsCursor={contactsResult.nextCursor}
      initialContactOrganization={contactsResult.organization}
      initialContactsStatus={contactsResult.status}
      initialMetaConnection={initialMetaConnection}
      initialMetaEmbeddedSignup={initialMetaEmbeddedSignup}
      initialMessageTemplates={
        messageTemplatesResult.templates
      }
      initialMessageTemplateStatus={
        messageTemplatesResult.status
      }
      initialCanWriteMessageTemplates={
        messageTemplatesResult.canWrite
      }
      initialCampaigns={campaignsResult.campaigns}
      initialCampaignTemplates={
        campaignsResult.templates
      }
      initialCampaignAudiences={
        campaignsResult.audiences
      }
      initialCampaignStatus={campaignsResult.status}
      initialCanWriteCampaigns={
        campaignsResult.canWrite
      }
      initialCampaignDeliveryStatus={
        campaignsResult.deliveryStatus
      }
      initialInbox={inboxResult.inbox}
      initialInboxStatus={inboxResult.status}
      initialAiReplyApprovals={
        aiReplyApprovalsResult.directory
      }
      initialAiReplyApprovalStatus={
        aiReplyApprovalsResult.status
      }
      initialBotFlows={botFlowsResult.botFlows}
      initialBotFlowStatus={
        botFlowsResult.status
      }
      initialAiAgents={aiAgentsResult.aiAgents}
      initialAiAgentStatus={
        aiAgentsResult.status
      }
      initialOperationalReport={
        operationalReportResult.report
      }
      initialOperationalReportStatus={
        operationalReportResult.status
      }
      initialTeamDirectory={
        teamDirectoryResult.directory
      }
      initialTeamDirectoryStatus={
        teamDirectoryResult.status
      }
      initialProductionReadiness={
        initialProductionReadiness
      }
    />
  );
}
