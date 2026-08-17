"use client";

import { lazy, Suspense } from "react";
import { BotFlowBuilder } from "../bot/BotFlowBuilder";
import {
  OperationalReports,
} from "../reports/OperationalReports";
import {
  ContactDirectory,
  type ContactDirectoryStatus,
} from "../contacts/ContactDirectory";
import { TemplateDraftEditor } from "../templates/TemplateDraftEditor";
import {
  TeamDirectory,
} from "../team/TeamDirectory";
import type { ContactRecord } from
  "../../shared/domain/contactRecord";
import type {
  MessageTemplateDirectoryStatus,
  MessageTemplateView,
} from "../../shared/domain/messageTemplateView";
import type {
  CampaignAudienceOptionsView,
  CampaignDeliveryReadinessStatus,
  CampaignDirectoryStatus,
  CampaignTemplateOptionView,
  CampaignView,
} from "../../shared/domain/campaignView";
import type {
  InboxDirectoryStatus,
  InboxView,
} from "../../shared/domain/conversationView";
import type {
  BotFlowDirectoryStatus,
  BotFlowDirectoryView,
} from "../../shared/domain/botFlowView";
import type {
  AiAgentDirectoryStatus,
  AiAgentDirectoryView,
} from "../../shared/domain/aiAgentView";
import type {
  AiReplyApprovalDirectoryStatus,
  AiReplyApprovalDirectoryView,
} from "../../shared/domain/aiReplyApprovalView";
import type {
  OperationalReportStatus,
  OperationalReportView,
} from "../../shared/domain/operationalReportView";
import type {
  ProductionReadinessReport,
} from "../../shared/domain/productionReadiness";
import type {
  MetaConnectionView,
} from "../../shared/domain/metaConnectionView";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization";
import type {
  TeamDirectoryStatus,
  TeamDirectoryView,
} from "../../shared/domain/teamDirectoryView";
import type { SectionId } from
  "../../shared/workspace/navigation";
import type { InterfaceLanguage } from
  "../../shared/domain/businessProfileDraft";
import { DecisionCenter } from "./DecisionCenter";
import { WorkspaceDashboard } from "./WorkspaceDashboard";
import { WorkspaceOnboarding } from "./WorkspaceOnboarding";
import { FeaturePage } from "./WorkspaceFeaturePage";
import {
  readContactDirectoryMessages,
} from "../contacts/contactDirectoryMessages";
import {
  readTemplateEditorMessages,
} from "../templates/templateEditorMessages";
import {
  readCampaignPageMessages,
} from "../campaigns/campaignPageMessages";
import {
  readConversationPageMessages,
} from "../conversations/conversationPageMessages";
import {
  readAiAgentPageMessages,
} from "../ai/aiAgentPageMessages";

const CampaignManager = lazy(() =>
  import("../campaigns/CampaignManager").then((module) => ({
    default: module.CampaignManager,
  })),
);

const ConversationInbox = lazy(() =>
  import("../conversations/ConversationInbox").then(
    (module) => ({
      default: module.ConversationInbox,
    }),
  ),
);

const AiAgentEditor = lazy(() =>
  import("../ai/AiAgentEditor").then((module) => ({
    default: module.AiAgentEditor,
  })),
);

export function WorkspaceSectionContent({
  activeSection,
  language,
  authEnabled,
  initialContacts,
  initialContactsCursor,
  initialContactOrganization,
  initialContactsStatus,
  initialMetaConnection,
  initialMessageTemplates,
  initialMessageTemplateStatus,
  initialCanWriteMessageTemplates,
  initialCampaigns,
  initialCampaignTemplates,
  initialCampaignAudiences,
  initialCampaignStatus,
  initialCanWriteCampaigns,
  initialCampaignDeliveryStatus,
  initialInbox,
  initialInboxStatus,
  initialAiReplyApprovals,
  initialAiReplyApprovalStatus,
  initialBotFlows,
  initialBotFlowStatus,
  initialAiAgents,
  initialAiAgentStatus,
  initialOperationalReport,
  initialOperationalReportStatus,
  initialTeamDirectory,
  initialTeamDirectoryStatus,
  initialProductionReadiness,
  onNavigate,
  onConnectMeta,
}: {
  activeSection: SectionId;
  language: InterfaceLanguage;
  authEnabled: boolean;
  initialContacts: readonly ContactRecord[];
  initialContactsCursor: number | null;
  initialContactOrganization: ContactOrganizationSnapshot;
  initialContactsStatus: ContactDirectoryStatus;
  initialMetaConnection: MetaConnectionView;
  initialMessageTemplates: readonly MessageTemplateView[];
  initialMessageTemplateStatus: MessageTemplateDirectoryStatus;
  initialCanWriteMessageTemplates: boolean;
  initialCampaigns: readonly CampaignView[];
  initialCampaignTemplates:
    readonly CampaignTemplateOptionView[];
  initialCampaignAudiences: CampaignAudienceOptionsView;
  initialCampaignStatus: CampaignDirectoryStatus;
  initialCanWriteCampaigns: boolean;
  initialCampaignDeliveryStatus:
    CampaignDeliveryReadinessStatus;
  initialInbox: InboxView;
  initialInboxStatus: InboxDirectoryStatus;
  initialAiReplyApprovals:
    AiReplyApprovalDirectoryView;
  initialAiReplyApprovalStatus:
    AiReplyApprovalDirectoryStatus;
  initialBotFlows: BotFlowDirectoryView;
  initialBotFlowStatus: BotFlowDirectoryStatus;
  initialAiAgents: AiAgentDirectoryView;
  initialAiAgentStatus: AiAgentDirectoryStatus;
  initialOperationalReport:
    OperationalReportView | null;
  initialOperationalReportStatus:
    OperationalReportStatus;
  initialTeamDirectory: TeamDirectoryView;
  initialTeamDirectoryStatus: TeamDirectoryStatus;
  initialProductionReadiness:
    ProductionReadinessReport;
  onNavigate: (section: SectionId) => void;
  onConnectMeta: () => void;
}) {
  return (
    <div className="page-content">
          {activeSection === "dashboard" ? (
            <WorkspaceDashboard
              metaConnection={initialMetaConnection}
              decisionRequiredCount={
                initialProductionReadiness.counts
                  .decisionRequired
              }
              language={language}
              onNavigate={onNavigate}
              onConnectMeta={onConnectMeta}
            />
          ) : null}
          {activeSection === "onboarding" ? (
            <WorkspaceOnboarding
              metaConnection={initialMetaConnection}
              language={language}
              onConnectMeta={onConnectMeta}
              serverPersistenceEnabled={authEnabled}
            />
          ) : null}
          {activeSection === "contacts" ? (
            <Contacts
              authEnabled={authEnabled}
              language={language}
              initialContacts={initialContacts}
              initialContactsCursor={initialContactsCursor}
              initialContactOrganization={initialContactOrganization}
              initialStatus={initialContactsStatus}
            />
          ) : null}
          {activeSection === "templates" ? (
            <Templates
              authEnabled={authEnabled}
              language={language}
              initialTemplates={initialMessageTemplates}
              initialStatus={initialMessageTemplateStatus}
              canWrite={initialCanWriteMessageTemplates}
            />
          ) : null}
          {activeSection === "campaigns" ? (
            <Campaigns
              authEnabled={authEnabled}
              language={language}
              initialCampaigns={initialCampaigns}
              initialTemplates={
                initialCampaignTemplates
              }
              initialAudiences={
                initialCampaignAudiences
              }
              initialStatus={initialCampaignStatus}
              canWrite={initialCanWriteCampaigns}
              deliveryStatus={
                initialCampaignDeliveryStatus
              }
            />
          ) : null}
          {activeSection === "inbox" ? (
            <Inbox
              authEnabled={authEnabled}
              language={language}
              initialInbox={initialInbox}
              initialStatus={initialInboxStatus}
              initialAiReplyApprovals={
                initialAiReplyApprovals
              }
              initialAiReplyApprovalStatus={
                initialAiReplyApprovalStatus
              }
            />
          ) : null}
          {activeSection === "bot" ? (
            <Bot
              initialDirectory={initialBotFlows}
              initialStatus={
                initialBotFlowStatus
              }
            />
          ) : null}
          {activeSection === "ai" ? (
            <AiAgent
              language={language}
              initialDirectory={initialAiAgents}
              initialStatus={
                initialAiAgentStatus
              }
            />
          ) : null}
          {activeSection === "reports" ? (
            <Reports
              initialReport={
                initialOperationalReport
              }
              initialStatus={
                initialOperationalReportStatus
              }
            />
          ) : null}
          {activeSection === "billing" ? <Billing /> : null}
          {activeSection === "team" ? (
            <TeamDirectory
              directory={
                initialTeamDirectory
              }
              status={
                initialTeamDirectoryStatus
              }
            />
          ) : null}
          {activeSection === "decisions" ? (
            <DecisionCenter
              report={initialProductionReadiness}
            />
          ) : null}
    </div>
  );
}

function Contacts({
  authEnabled,
  language,
  initialContacts,
  initialContactsCursor,
  initialContactOrganization,
  initialStatus,
}: {
  authEnabled: boolean;
  language: InterfaceLanguage;
  initialContacts: readonly ContactRecord[];
  initialContactsCursor: number | null;
  initialContactOrganization: ContactOrganizationSnapshot;
  initialStatus: ContactDirectoryStatus;
}) {
  const messages = readContactDirectoryMessages(language);

  return (
    <FeaturePage
      eyebrow={messages.page.eyebrow}
      title={messages.page.title}
      description={messages.page.description}
    >
      <ContactDirectory
        authEnabled={authEnabled}
        language={language}
        initialContacts={initialContacts}
        initialNextCursor={initialContactsCursor}
        initialOrganization={initialContactOrganization}
        initialStatus={initialStatus}
      />
    </FeaturePage>
  );
}

function Templates({
  authEnabled,
  language,
  initialTemplates,
  initialStatus,
  canWrite,
}: {
  authEnabled: boolean;
  language: InterfaceLanguage;
  initialTemplates: readonly MessageTemplateView[];
  initialStatus: MessageTemplateDirectoryStatus;
  canWrite: boolean;
}) {
  const messages = readTemplateEditorMessages(language);

  return (
    <FeaturePage
      eyebrow={messages.page.eyebrow}
      title={messages.page.title}
      description={messages.page.description}
    >
      <TemplateDraftEditor
        authEnabled={authEnabled}
        interfaceLanguage={language}
        initialTemplates={initialTemplates}
        initialStatus={initialStatus}
        canWrite={canWrite}
      />
    </FeaturePage>
  );
}

function Campaigns({
  authEnabled,
  language,
  initialCampaigns,
  initialTemplates,
  initialAudiences,
  initialStatus,
  canWrite,
  deliveryStatus,
}: {
  authEnabled: boolean;
  language: InterfaceLanguage;
  initialCampaigns: readonly CampaignView[];
  initialTemplates:
    readonly CampaignTemplateOptionView[];
  initialAudiences: CampaignAudienceOptionsView;
  initialStatus: CampaignDirectoryStatus;
  canWrite: boolean;
  deliveryStatus:
    CampaignDeliveryReadinessStatus;
}) {
  const messages = readCampaignPageMessages(language);

  return (
    <FeaturePage
      eyebrow={messages.eyebrow}
      title={messages.title}
      description={messages.description}
    >
      <Suspense
        fallback={
          <div className="inline-notice" role="status">
            <span aria-hidden="true">i</span>
            <p>{messages.loading}</p>
          </div>
        }
      >
        <CampaignManager
          authEnabled={authEnabled}
          language={language}
          initialCampaigns={initialCampaigns}
          initialTemplates={initialTemplates}
          initialAudiences={initialAudiences}
          initialStatus={initialStatus}
          canWrite={canWrite}
          deliveryStatus={deliveryStatus}
        />
      </Suspense>
    </FeaturePage>
  );
}

function Inbox({
  authEnabled,
  language,
  initialInbox,
  initialStatus,
  initialAiReplyApprovals,
  initialAiReplyApprovalStatus,
}: {
  authEnabled: boolean;
  language: InterfaceLanguage;
  initialInbox: InboxView;
  initialStatus: InboxDirectoryStatus;
  initialAiReplyApprovals:
    AiReplyApprovalDirectoryView;
  initialAiReplyApprovalStatus:
    AiReplyApprovalDirectoryStatus;
}) {
  const messages = readConversationPageMessages(language);

  return (
    <FeaturePage
      eyebrow={messages.eyebrow}
      title={messages.title}
      description={messages.description}
    >
      <Suspense
        fallback={
          <div className="inline-notice" role="status">
            <span aria-hidden="true">i</span>
            <p>{messages.loading}</p>
          </div>
        }
      >
        <ConversationInbox
          authEnabled={authEnabled}
          language={language}
          initialInbox={initialInbox}
          initialStatus={initialStatus}
          initialAiReplyApprovals={
            initialAiReplyApprovals
          }
          initialAiReplyApprovalStatus={
            initialAiReplyApprovalStatus
          }
        />
      </Suspense>
    </FeaturePage>
  );
}

function Bot({
  initialDirectory,
  initialStatus,
}: {
  initialDirectory: BotFlowDirectoryView;
  initialStatus: BotFlowDirectoryStatus;
}) {
  return (
    <FeaturePage
      eyebrow="אוטומציה"
      title="בונה תהליכי בוט"
      description="בניית זרימה ויזואלית הנשמרת ב־D1, עם גרסאות טיוטה ופרסום מבוקר למנוע הבוט."
    >
      <BotFlowBuilder
        initialDirectory={initialDirectory}
        initialStatus={initialStatus}
      />
    </FeaturePage>
  );
}

function AiAgent({
  language,
  initialDirectory,
  initialStatus,
}: {
  language: InterfaceLanguage;
  initialDirectory: AiAgentDirectoryView;
  initialStatus: AiAgentDirectoryStatus;
}) {
  const messages = readAiAgentPageMessages(language);

  return (
    <FeaturePage
      eyebrow={messages.eyebrow}
      title={messages.title}
      description={messages.description}
    >
      <Suspense
        fallback={
          <div className="inline-notice" role="status">
            <span aria-hidden="true">i</span>
            <p>{messages.loading}</p>
          </div>
        }
      >
        <AiAgentEditor
          language={language}
          initialDirectory={initialDirectory}
          initialStatus={initialStatus}
        />
      </Suspense>
    </FeaturePage>
  );
}

function Reports({
  initialReport,
  initialStatus,
}: {
  initialReport:
    OperationalReportView | null;
  initialStatus: OperationalReportStatus;
}) {
  return (
    <FeaturePage
      eyebrow="ביצועים"
      title="דוחות"
      description="מדדי שליחה, מסירה, קריאה, תגובה, עלות וביצועי בוט ו־AI."
    >
      <OperationalReports
        initialReport={initialReport}
        initialStatus={initialStatus}
      />
    </FeaturePage>
  );
}

function Billing() {
  return (
    <FeaturePage
      eyebrow="חשבון"
      title="מנוי וחיוב"
      description="חבילה, מגבלות שימוש, אמצעי תשלום, חשבוניות והיסטוריית חיובים."
    >
      <section className="card billing-card">
        <div>
          <span className="status-pill critical">לא הוגדר באפיון</span>
          <h2>אין עדיין חבילה או מחיר להצגה</h2>
          <p>
            ספק הסליקה, המחירים, המע״מ, תקופת הניסיון ומדיניות ניסיונות החיוב
            טרם הוכרעו. לכן לא מוצגים כאן נתוני חיוב מומצאים.
          </p>
        </div>
        <div className="billing-logic">
          <span>בחירת חבילה</span>
          <b>←</b>
          <span>אישור תשלום</span>
          <b>←</b>
          <span>יצירת Tenant</span>
          <b>←</b>
          <span>אשף הקמה</span>
        </div>
      </section>
    </FeaturePage>
  );
}
