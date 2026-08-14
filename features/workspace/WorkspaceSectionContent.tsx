"use client";

import { CampaignManager } from "../campaigns/CampaignManager";
import { BotFlowBuilder } from "../bot/BotFlowBuilder";
import { AiAgentEditor } from "../ai/AiAgentEditor";
import {
  OperationalReports,
} from "../reports/OperationalReports";
import {
  ConversationInbox,
} from "../conversations/ConversationInbox";
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
import { DecisionCenter } from "./DecisionCenter";
import { WorkspaceDashboard } from "./WorkspaceDashboard";
import { WorkspaceOnboarding } from "./WorkspaceOnboarding";
import { FeaturePage } from "./WorkspaceFeaturePage";

export function WorkspaceSectionContent({
  activeSection,
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
              onNavigate={onNavigate}
              onConnectMeta={onConnectMeta}
            />
          ) : null}
          {activeSection === "onboarding" ? (
            <WorkspaceOnboarding
              metaConnection={initialMetaConnection}
              onConnectMeta={onConnectMeta}
              serverPersistenceEnabled={authEnabled}
            />
          ) : null}
          {activeSection === "contacts" ? (
            <Contacts
              authEnabled={authEnabled}
              initialContacts={initialContacts}
              initialContactsCursor={initialContactsCursor}
              initialContactOrganization={initialContactOrganization}
              initialStatus={initialContactsStatus}
            />
          ) : null}
          {activeSection === "templates" ? (
            <Templates
              authEnabled={authEnabled}
              initialTemplates={initialMessageTemplates}
              initialStatus={initialMessageTemplateStatus}
              canWrite={initialCanWriteMessageTemplates}
            />
          ) : null}
          {activeSection === "campaigns" ? (
            <Campaigns
              authEnabled={authEnabled}
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
  initialContacts,
  initialContactsCursor,
  initialContactOrganization,
  initialStatus,
}: {
  authEnabled: boolean;
  initialContacts: readonly ContactRecord[];
  initialContactsCursor: number | null;
  initialContactOrganization: ContactOrganizationSnapshot;
  initialStatus: ContactDirectoryStatus;
}) {
  return (
    <FeaturePage
      eyebrow="קהל ונתונים"
      title="אנשי קשר"
      description="ניהול אנשי קשר, תגיות, רשימות ותיעוד הסכמה לקבלת הודעות."
    >
      <ContactDirectory
        authEnabled={authEnabled}
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
  initialTemplates,
  initialStatus,
  canWrite,
}: {
  authEnabled: boolean;
  initialTemplates: readonly MessageTemplateView[];
  initialStatus: MessageTemplateDirectoryStatus;
  canWrite: boolean;
}) {
  return (
    <FeaturePage
      eyebrow="Meta Message Templates"
      title="תבניות הודעה"
      description="יצירה, תצוגה מקדימה ומעקב אחר תהליך האישור הרשמי מול Meta."
    >
      <TemplateDraftEditor
        authEnabled={authEnabled}
        initialTemplates={initialTemplates}
        initialStatus={initialStatus}
        canWrite={canWrite}
      />
    </FeaturePage>
  );
}

function Campaigns({
  authEnabled,
  initialCampaigns,
  initialTemplates,
  initialAudiences,
  initialStatus,
  canWrite,
  deliveryStatus,
}: {
  authEnabled: boolean;
  initialCampaigns: readonly CampaignView[];
  initialTemplates:
    readonly CampaignTemplateOptionView[];
  initialAudiences: CampaignAudienceOptionsView;
  initialStatus: CampaignDirectoryStatus;
  canWrite: boolean;
  deliveryStatus:
    CampaignDeliveryReadinessStatus;
}) {
  return (
    <FeaturePage
      eyebrow="שליחה ותזמון"
      title="קמפיינים"
      description="הכנת טיוטה, בחירת מועד ובדיקת התנאים הנדרשים לפני שליחה."
    >
      <CampaignManager
        authEnabled={authEnabled}
        initialCampaigns={initialCampaigns}
        initialTemplates={initialTemplates}
        initialAudiences={initialAudiences}
        initialStatus={initialStatus}
        canWrite={canWrite}
        deliveryStatus={deliveryStatus}
      />
    </FeaturePage>
  );
}

function Inbox({
  authEnabled,
  initialInbox,
  initialStatus,
  initialAiReplyApprovals,
  initialAiReplyApprovalStatus,
}: {
  authEnabled: boolean;
  initialInbox: InboxView;
  initialStatus: InboxDirectoryStatus;
  initialAiReplyApprovals:
    AiReplyApprovalDirectoryView;
  initialAiReplyApprovalStatus:
    AiReplyApprovalDirectoryStatus;
}) {
  return (
    <FeaturePage
      eyebrow="שירות לקוחות"
      title="תיבת שיחות"
      description="כל ההודעות הנכנסות, הקצאה לנציג ומעבר מבוט לאדם במקום אחד."
    >
      <ConversationInbox
        authEnabled={authEnabled}
        initialInbox={initialInbox}
        initialStatus={initialStatus}
        initialAiReplyApprovals={
          initialAiReplyApprovals
        }
        initialAiReplyApprovalStatus={
          initialAiReplyApprovalStatus
        }
      />
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
  initialDirectory,
  initialStatus,
}: {
  initialDirectory: AiAgentDirectoryView;
  initialStatus: AiAgentDirectoryStatus;
}) {
  return (
    <FeaturePage
      eyebrow="מענה חכם"
      title="סוכן AI"
      description="הגדרת תפקיד, כללי מענה, מקורות ידע ומעבר בטוח לנציג אנושי — עם טיוטות ופרסום מבוקר."
    >
      <AiAgentEditor
        initialDirectory={initialDirectory}
        initialStatus={initialStatus}
      />
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
