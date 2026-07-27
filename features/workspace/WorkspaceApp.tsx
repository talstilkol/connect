"use client";

import { UserButton } from "@clerk/nextjs";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
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
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft";
import type { ContactRecord } from "../../shared/domain/contactRecord";
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
import {
  defaultInboxFilters,
} from "../../shared/domain/conversationView";
import {
  configurationRequiredMetaEmbeddedSignup,
  type MetaEmbeddedSignupView,
} from "../../shared/domain/metaEmbeddedSignupView";
import {
  configurationRequiredMetaConnection,
  type MetaConnectionView,
} from "../../shared/domain/metaConnectionView";
import {
  emptyContactOrganizationSnapshot,
  type ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization";
import {
  roleLabels,
  rolePermissions,
  type TenantRole,
} from "../../shared/domain/model";
import { inspectBusinessProfileCompleteness } from "../../shared/validation/businessProfile";
import { inspectDashboardSetup } from "../../shared/validation/dashboardSetup";
import {
  saveBusinessProfileAction,
  type SaveBusinessProfileActionResult,
} from "../../server/onboarding/saveBusinessProfileAction";
import {
  completeMetaEmbeddedSignupAction,
} from "../../server/meta/metaEmbeddedSignupActions";
import type {
  MetaEmbeddedSignupCompletionResult,
} from "../../server/meta/metaEmbeddedSignupCompletion";
import {
  workspaceNavigation,
  workspaceSectionPath,
  type SectionId,
} from "../../shared/workspace/navigation";
import { presentMetaConnection } from "./metaConnectionPresentation";
import {
  metaEmbeddedSignupSdkLoader,
  type MetaEmbeddedSignupSdkErrorCode,
  type MetaFacebookSdk,
} from "./metaEmbeddedSignupSdk";
import {
  createMetaEmbeddedSignupAttemptCoordinator,
  launchMetaEmbeddedSignup,
  subscribeToMetaEmbeddedSignupMessages,
} from "./metaEmbeddedSignupClient";
import { useWorkspaceDrafts } from "./WorkspaceDraftProvider";
import { DecisionCenter } from "./DecisionCenter";
import { useAccessibleDialog } from "./useAccessibleDialog";

type MetaSignupAttemptStatus =
  | "idle"
  | "launching"
  | "awaiting-results"
  | "submitting"
  | "client-cancelled"
  | "client-error"
  | "unsupported-flow"
  | MetaEmbeddedSignupCompletionResult["status"];

interface ActiveMetaSignupAttempt {
  cleanup: () => void;
}

const META_SIGNUP_FLOW_TIMEOUT_MS = 15 * 60 * 1_000;
const META_AUTHORIZATION_CODE_TIMEOUT_MS = 25_000;

const setupSteps = [
  { title: "פרטי העסק", description: "שם, אזור זמן ושפת הממשק" },
  { title: "חיבור Meta", description: "Business Portfolio ו־WhatsApp Business" },
  { title: "בחירת חשבון WhatsApp", description: "בחירת WABA מאושר" },
  { title: "חיבור מספר טלפון", description: "אימות ושמירת מצב החיבור" },
  { title: "שם תצוגה", description: "השם שיוצג ללקוחות ב־WhatsApp" },
  { title: "תבנית ראשונה", description: "יצירה ושליחה לאישור Meta" },
  { title: "אנשי קשר", description: "ייבוא CSV או Excel ובדיקת הסכמה" },
  { title: "בוט או AI", description: "בחירת מסלול המענה הראשוני" },
  { title: "שליחת ניסיון", description: "בדיקת תהליך מקצה לקצה" },
  { title: "הפעלת סביבת העבודה", description: "מעבר ממצב הקמה למצב פעיל" },
];

export default function WorkspaceApp({
  activeSection = "dashboard",
  authEnabled = false,
  initialContacts = [],
  initialContactsCursor = null,
  initialContactOrganization = emptyContactOrganizationSnapshot,
  initialContactsStatus = "configuration-required",
  initialMetaConnection = configurationRequiredMetaConnection,
  initialMetaEmbeddedSignup =
    configurationRequiredMetaEmbeddedSignup,
  initialMessageTemplates = [],
  initialMessageTemplateStatus =
    "configuration-required",
  initialCanWriteMessageTemplates = false,
  initialCampaigns = [],
  initialCampaignTemplates = [],
  initialCampaignAudiences = {
    lists: [],
    tags: [],
  },
  initialCampaignStatus =
    "configuration-required",
  initialCanWriteCampaigns = false,
  initialCampaignDeliveryStatus =
    "configuration-required",
  initialInbox = {
    conversations: [],
    selectedThread: null,
    canReply: false,
    filters: { ...defaultInboxFilters },
  },
  initialInboxStatus =
    "configuration-required",
  initialAiReplyApprovals = {
    approvals: [],
    canDecide: false,
  },
  initialAiReplyApprovalStatus =
    "configuration-required",
  initialBotFlows = {
    flows: [],
    selectedFlow: null,
    canWrite: false,
  },
  initialBotFlowStatus =
    "configuration-required",
  initialAiAgents = {
    agents: [],
    selectedAgent: null,
    knowledgeSources: [],
    canWrite: false,
  },
  initialAiAgentStatus =
    "configuration-required",
  initialOperationalReport = null,
  initialOperationalReportStatus =
    "configuration-required",
  initialProductionReadiness,
}: {
  activeSection?: SectionId;
  authEnabled?: boolean;
  initialContacts?: readonly ContactRecord[];
  initialContactsCursor?: number | null;
  initialContactOrganization?: ContactOrganizationSnapshot;
  initialContactsStatus?: ContactDirectoryStatus;
  initialMetaConnection?: MetaConnectionView;
  initialMetaEmbeddedSignup?: MetaEmbeddedSignupView;
  initialMessageTemplates?: readonly MessageTemplateView[];
  initialMessageTemplateStatus?: MessageTemplateDirectoryStatus;
  initialCanWriteMessageTemplates?: boolean;
  initialCampaigns?: readonly CampaignView[];
  initialCampaignTemplates?:
    readonly CampaignTemplateOptionView[];
  initialCampaignAudiences?:
    CampaignAudienceOptionsView;
  initialCampaignStatus?: CampaignDirectoryStatus;
  initialCanWriteCampaigns?: boolean;
  initialCampaignDeliveryStatus?:
    CampaignDeliveryReadinessStatus;
  initialInbox?: InboxView;
  initialInboxStatus?: InboxDirectoryStatus;
  initialAiReplyApprovals?:
    AiReplyApprovalDirectoryView;
  initialAiReplyApprovalStatus?:
    AiReplyApprovalDirectoryStatus;
  initialBotFlows?: BotFlowDirectoryView;
  initialBotFlowStatus?: BotFlowDirectoryStatus;
  initialAiAgents?: AiAgentDirectoryView;
  initialAiAgentStatus?:
    AiAgentDirectoryStatus;
  initialOperationalReport?:
    OperationalReportView | null;
  initialOperationalReportStatus?:
    OperationalReportStatus;
  initialProductionReadiness:
    ProductionReadinessReport;
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [metaPanelOpen, setMetaPanelOpen] = useState(false);
  const workspaceMetaPresentation = presentMetaConnection(
    initialMetaConnection,
  );

  const navigate = (section: SectionId) => {
    router.push(workspaceSectionPath(section));
    setMobileMenuOpen(false);
  };

  return (
    <main className="app-shell" dir="rtl">
      <a
        className="skip-link"
        href="#workspace-content"
      >
        דילוג לתוכן הראשי
      </a>
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Connect</strong>
            <small>WhatsApp Business Platform</small>
          </div>
        </div>

        <nav className="main-navigation" aria-label="ניווט ראשי">
          {workspaceNavigation.map((item, index) => {
            const previousGroup =
              index > 0 ? workspaceNavigation[index - 1].group : null;
            const showGroup = item.group && item.group !== previousGroup;

            return (
              <div key={item.id}>
                {showGroup ? <p className="nav-group">{item.group}</p> : null}
                <button
                  type="button"
                  className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.id === "decisions" ? (
                    <span className="nav-count">
                      {
                        initialProductionReadiness.counts
                          .decisionRequired
                      }
                    </span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="workspace-avatar" aria-hidden="true">
            C
          </div>
          <div>
            <strong>סביבת עבודה חדשה</strong>
            <small>{workspaceMetaPresentation.statusLabel}</small>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="הגדרות חשבון"
            aria-describedby="unavailable-navigation-actions"
            title="הגדרות החשבון עדיין אינן זמינות"
            disabled
          >
            •••
          </button>
        </div>
      </aside>

      {mobileMenuOpen ? (
        <button
          className="mobile-overlay"
          type="button"
          aria-label="סגירת תפריט"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <section
        className="content-area"
        id="workspace-content"
        tabIndex={-1}
      >
        <header className="topbar">
          <div className="topbar-start">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="פתיחת תפריט"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              ☰
            </button>
            <div className="breadcrumb">
              <span>Connect</span>
              <b>/</b>
              <strong>
                {workspaceNavigation.find((item) => item.id === activeSection)?.label}
              </strong>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="environment-badge">
              <i />
              סביבת הקמה
            </span>
            <button
              type="button"
              className="topbar-icon"
              aria-label="עזרה"
              aria-describedby="unavailable-navigation-actions"
              title="מרכז העזרה עדיין אינו זמין"
              disabled
            >
              ?
            </button>
            <button
              type="button"
              className="topbar-icon"
              aria-label="התראות"
              aria-describedby="unavailable-navigation-actions"
              title="מרכז ההתראות עדיין אינו זמין"
              disabled
            >
              ♢
            </button>
            <span
              className="sr-only"
              id="unavailable-navigation-actions"
            >
              פעולה זו עדיין אינה זמינה בגרסה הנוכחית.
            </span>
            {authEnabled ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "workspace-user-avatar",
                  },
                }}
              />
            ) : null}
          </div>
        </header>

        <div className="page-content">
          {activeSection === "dashboard" ? (
            <Dashboard
              metaConnection={initialMetaConnection}
              decisionRequiredCount={
                initialProductionReadiness.counts
                  .decisionRequired
              }
              onNavigate={navigate}
              onConnectMeta={() => setMetaPanelOpen(true)}
            />
          ) : null}
          {activeSection === "onboarding" ? (
            <Onboarding
              metaConnection={initialMetaConnection}
              onConnectMeta={() => setMetaPanelOpen(true)}
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
          {activeSection === "team" ? <Team /> : null}
          {activeSection === "decisions" ? (
            <DecisionCenter
              report={initialProductionReadiness}
            />
          ) : null}
        </div>
      </section>

      {metaPanelOpen ? (
        <MetaConnectionPanel
          connection={initialMetaConnection}
          embeddedSignup={initialMetaEmbeddedSignup}
          onClose={() => setMetaPanelOpen(false)}
        />
      ) : null}
    </main>
  );
}

function Dashboard({
  metaConnection,
  decisionRequiredCount,
  onNavigate,
  onConnectMeta,
}: {
  metaConnection: MetaConnectionView;
  decisionRequiredCount: number;
  onNavigate: (section: SectionId) => void;
  onConnectMeta: () => void;
}) {
  const {
    businessProfileDraft,
    businessProfilePersistence,
  } = useWorkspaceDrafts();
  const setupState = inspectDashboardSetup(
    businessProfileDraft,
    metaConnection,
  );
  const metaPresentation = presentMetaConnection(metaConnection);
  const progressLabel = `${setupState.completedSteps} מתוך ${setupState.totalSteps}`;

  const continueSetup = () => {
    if (setupState.nextAction === "business-profile") {
      onNavigate("onboarding");
      return;
    }

    if (setupState.nextAction === "meta") {
      onConnectMeta();
      return;
    }

    onNavigate("onboarding");
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">מרכז השליטה</p>
          <h1>
            {setupState.businessProfileComplete
              ? `בוקר טוב, ${businessProfileDraft?.businessName}. ממשיכים לשלב הבא.`
              : "בוקר טוב, מתחילים לחבר את העסק."}
          </h1>
          {setupState.businessProfileComplete ? (
            <p>
              {setupState.metaConnectionComplete
                ? "פרטי העסק וחיבור Meta נשמרו בשרת. ניתן להמשיך לשלב הבא באשף."
                : businessProfilePersistence === "server"
                  ? "פרטי העסק נשמרו בשרת עבור Tenant מאומת. השלב הבא הוא חיבור רשמי ל־Meta."
                : "פרטי העסק נשמרו מקומית. השלב הבא הוא חיבור רשמי ל־Meta; עדיין לא נוצר Tenant ולא נשלחה בקשת Backend."}
            </p>
          ) : (
            <p>
              סביבת העבודה מוכנה. כדי להתקדם לחיבור הרשמי יש להשלים תחילה את
              פרטי העסק.
            </p>
          )}
        </div>
        <div className="heading-actions">
          <button type="button" className="secondary-button" onClick={() => onNavigate("decisions")}>
            הצגת החלטות פתוחות
          </button>
          <button type="button" className="primary-button" onClick={onConnectMeta}>
            {metaPresentation.actionLabel}
            <span aria-hidden="true">←</span>
          </button>
        </div>
      </div>

      <section className="connection-banner">
        <div className="connection-illustration" aria-hidden="true">
          <span className="phone-shape">◉</span>
          <span className="connection-line" />
          <span className="cloud-shape">M</span>
        </div>
        <div className="connection-copy">
          <span className={`status-pill ${metaPresentation.tone}`}>
            <i />
            {metaPresentation.statusLabel}
          </span>
          <h2>{metaPresentation.heading}</h2>
          <p>{metaPresentation.description}</p>
        </div>
        <button type="button" className="outline-button" onClick={onConnectMeta}>
          {metaPresentation.actionLabel}
        </button>
      </section>

      <section className="metrics-grid" aria-label="מדדי חשבון">
        <MetricCard label="הודעות החודש" icon="↗" />
        <MetricCard label="אנשי קשר" icon="♙" />
        <MetricCard label="קמפיינים פעילים" icon="◒" />
        <MetricCard label="צריכת AI" icon="✦" />
      </section>

      <div className="dashboard-grid">
        <section className="card onboarding-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">אשף הקמה</span>
              <h2>10 צעדים עד לשליחה הראשונה</h2>
            </div>
            <span className="progress-label">{progressLabel}</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={`התקדמות ${progressLabel}`}
            aria-valuemin={0}
            aria-valuemax={setupState.totalSteps}
            aria-valuenow={setupState.completedSteps}
          >
            <span style={{ width: `${setupState.progressPercent}%` }} />
          </div>
          <div className="setup-list">
            {setupSteps.slice(0, 5).map((step, index) => {
              const isReady =
                (index === 0 && setupState.businessProfileComplete) ||
                (index >= 1 &&
                  index <= 3 &&
                  setupState.metaConnectionComplete);

              return (
                <div
                  className={`setup-row ${isReady ? "ready" : ""}`}
                  key={step.title}
                >
                  <span className="step-number">
                    {isReady ? "✓" : index + 1}
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </div>
                  <span className="step-state">
                    {isReady
                      ? index >= 1
                        ? "נשמר בשרת"
                        : businessProfilePersistence === "server"
                        ? "נשמר בשרת"
                        : "נשמר מקומית"
                      : "טרם התחיל"}
                  </span>
                </div>
              );
            })}
          </div>
          <button type="button" className="text-button" onClick={continueSetup}>
            {setupState.nextAction === "business-profile"
              ? "השלמת פרטי העסק"
              : setupState.nextAction === "meta"
                ? "מעבר לחיבור Meta"
                : "המשך באשף ההקמה"}
            <span aria-hidden="true">←</span>
          </button>
        </section>

        <aside className="side-stack">
          <section className="card decision-card">
            <div className="decision-top">
              <span className="decision-icon">!</span>
              <span className="status-pill critical">דורש החלטה</span>
            </div>
            <h2>
              {decisionRequiredCount}{" "}
              החלטות חוסמות Production
            </h2>
            <p>
              ספק Meta, סליקה, חבילות, AI ומדיניות מידע עדיין לא הוגדרו באפיון.
            </p>
            <button type="button" className="text-button" onClick={() => onNavigate("decisions")}>
              פתיחת מרכז ההחלטות
              <span aria-hidden="true">←</span>
            </button>
          </section>

          <section className="card quick-actions-card">
            <span className="card-kicker">פעולות מהירות</span>
            <div className="quick-actions">
              <button type="button" onClick={() => onNavigate("contacts")}>
                <span>＋</span>
                ייבוא אנשי קשר
              </button>
              <button type="button" onClick={() => onNavigate("bot")}>
                <span>⌘</span>
                בניית תהליך
              </button>
              <button type="button" onClick={() => onNavigate("ai")}>
                <span>✦</span>
                הגדרת סוכן AI
              </button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function MetricCard({ label, icon }: { label: string; icon: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <span>{label}</span>
        <strong>—</strong>
        <small>טרם קיים מקור נתונים</small>
      </div>
    </article>
  );
}

function Onboarding({
  metaConnection,
  onConnectMeta,
  serverPersistenceEnabled,
}: {
  metaConnection: MetaConnectionView;
  onConnectMeta: () => void;
  serverPersistenceEnabled: boolean;
}) {
  const {
    businessProfileDraft,
    businessProfilePersistence,
    saveBusinessProfileDraft,
  } = useWorkspaceDrafts();
  const [businessName, setBusinessName] = useState(
    businessProfileDraft?.businessName ?? "",
  );
  const [timezone, setTimezone] = useState(
    businessProfileDraft?.timezone ?? "",
  );
  const [interfaceLanguage, setInterfaceLanguage] = useState<
    InterfaceLanguage | ""
  >(businessProfileDraft?.interfaceLanguage ?? "");
  const [profileSaved, setProfileSaved] = useState(
    Boolean(businessProfileDraft),
  );
  const [saveResult, setSaveResult] =
    useState<SaveBusinessProfileActionResult | null>(null);
  const [isSaving, startSaving] = useTransition();

  const canCaptureProfile =
    businessName.trim().length > 0 &&
    timezone.length > 0 &&
    interfaceLanguage.length > 0;
  const completeness = inspectBusinessProfileCompleteness({
    businessName,
    timezone,
    interfaceLanguage,
    isDraftSaved: profileSaved,
  });
  const currentSnapshotIsServer =
    profileSaved && businessProfilePersistence === "server";
  const metaPresentation = presentMetaConnection(metaConnection);
  const markChanged = () => {
    setProfileSaved(false);
    setSaveResult(null);
  };

  const persistBusinessProfile = () => {
    if (!canCaptureProfile || interfaceLanguage === "") {
      return;
    }

    const draft = {
      businessName: businessName.trim(),
      timezone,
      interfaceLanguage,
    };

    if (!serverPersistenceEnabled) {
      saveBusinessProfileDraft(draft, "local");
      setProfileSaved(true);
      setSaveResult(null);
      return;
    }

    startSaving(async () => {
      const result = await saveBusinessProfileAction(draft);
      setSaveResult(result);

      if (result.status === "saved") {
        saveBusinessProfileDraft(
          {
            businessName: result.profile.businessName,
            timezone: result.profile.timezone,
            interfaceLanguage: result.profile.interfaceLanguage,
          },
          "server",
        );
        setProfileSaved(true);
      }
    });
  };

  const serverSaveError =
    saveResult?.status === "validation-error"
      ? "השרת דחה אחד או יותר מהשדות. יש לבדוק את הערכים ולנסות שוב."
      : saveResult?.status === "unauthenticated"
        ? "ה-Session אינו פעיל. יש להתחבר מחדש."
        : saveResult?.status === "tenant-selection-required"
          ? "המשתמש שייך למספר Tenants ונדרשת בחירה מפורשת."
          : saveResult?.status === "permission-denied"
            ? "לתפקיד הנוכחי אין הרשאה לשנות את פרטי העסק."
            : saveResult?.status === "configuration-required"
              ? "חיבור Clerk אינו מוגדר במלואו."
              : saveResult?.status === "server-error"
                ? "השמירה בשרת נכשלה. לא בוצע מעבר שקט לשמירה מקומית."
                : null;

  return (
    <FeaturePage
      eyebrow="הקמת סביבת עבודה"
      title="אשף הקמה"
      description="השלבים בנויים לפי האפיון. רק נתונים שהוזנו בפועל מוצגים כמוכנים."
      action={
        <span className="decision-progress">
          {profileSaved
            ? currentSnapshotIsServer
              ? "שלב 1 נשמר בשרת"
              : "שלב 1 מוכן מקומית"
            : `פרטי העסק ${completeness.completedCount}/${completeness.totalCount}`}
        </span>
      }
    >
      <div className="onboarding-layout">
        <section className="card onboarding-form-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">שלב 1 מתוך 10</span>
              <h2>פרטי העסק</h2>
            </div>
            <span className={`status-pill ${profileSaved ? "success" : "warning"}`}>
              {isSaving
                ? "שומר בשרת"
                : currentSnapshotIsServer
                  ? "נשמר בשרת"
                  : profileSaved
                    ? "טיוטה מקומית נשמרה"
                    : "טרם נשמר"}
            </span>
          </div>
          <p className="form-explanation">
            {serverPersistenceEnabled
              ? "השמירה מתבצעת דרך Server Action מאומת. ה-Tenant נגזר מה-Session ולא מתקבל מהטופס."
              : "Clerk אינו פעיל ולכן הנתונים נשמרים רק ב־Workspace הזמני. רענון מלא מוחק אותם ולא נוצר Tenant."}
          </p>
          <form
            className="business-profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              persistBusinessProfile();
            }}
          >
            <label>
              <span>שם העסק</span>
              <input
                value={businessName}
                onChange={(event) => {
                  setBusinessName(event.target.value);
                  markChanged();
                }}
                autoComplete="organization"
                required
              />
            </label>
            <label>
              <span>אזור זמן</span>
              <select
                value={timezone}
                onChange={(event) => {
                  setTimezone(event.target.value);
                  markChanged();
                }}
                required
              >
                <option value="">יש לבחור</option>
                <option value="Asia/Jerusalem">Asia/Jerusalem</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </label>
            <label>
              <span>שפת ממשק</span>
              <select
                value={interfaceLanguage}
                onChange={(event) => {
                  setInterfaceLanguage(
                    event.target.value as InterfaceLanguage | "",
                  );
                  markChanged();
                }}
                required
              >
                <option value="">יש לבחור</option>
                <option value="he">עברית</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={!canCaptureProfile || isSaving}
            >
              {isSaving
                ? "שומר..."
                : serverPersistenceEnabled
                  ? "שמירת פרטי העסק בשרת"
                  : "שמירת פרטי העסק מקומית"}
            </button>
          </form>

          <section className="business-profile-completeness">
            <div className="card-header">
              <div>
                <span className="card-kicker">
                  Business profile completeness
                </span>
                <h3>שלמות פרטי העסק</h3>
              </div>
              <span
                className={`readiness-score ${
                  completeness.isComplete ? "complete" : ""
                }`}
              >
                {completeness.completedCount}/{completeness.totalCount}
              </span>
            </div>

            <div className="business-profile-checks">
              <BusinessProfileCheck
                complete={completeness.businessNameComplete}
                label="שם העסק הוזן"
              />
              <BusinessProfileCheck
                complete={completeness.timezoneComplete}
                label="אזור הזמן נבחר"
              />
              <BusinessProfileCheck
                complete={completeness.interfaceLanguageComplete}
                label="שפת הממשק נבחרה"
              />
              <BusinessProfileCheck
                complete={completeness.draftSaved}
                label="הגרסה הנוכחית נשמרה"
              />
            </div>

            <div
              className={`inline-notice ${
                completeness.isComplete ? "success" : "warning"
              }`}
              role="status"
            >
              <span aria-hidden="true">
                {completeness.isComplete ? "✓" : "i"}
              </span>
              <p>
                {completeness.isComplete
                  ? currentSnapshotIsServer
                    ? saveResult?.status === "saved" &&
                      saveResult.createdTenant
                      ? "Tenant, Owner Membership ופרטי העסק נוצרו ונשמרו בשרת."
                      : "פרטי העסק נשמרו מחדש בשרת עבור ה-Tenant המאומת."
                    : "פרטי העסק נשמרו מקומית. לא נוצר Tenant ולא נשלחה בקשה לשרת."
                  : canCaptureProfile
                    ? "כל השדות מולאו. יש לשמור את הגרסה הנוכחית."
                    : "יש להשלים את השדות החסרים; ניתן לעבור למסך אחר ולחזור לגרסה האחרונה שנשמרה."}
              </p>
            </div>
            {serverSaveError ? (
              <div className="inline-notice danger" role="alert">
                <span aria-hidden="true">!</span>
                <p>{serverSaveError}</p>
              </div>
            ) : null}
          </section>
        </section>

        <aside className="card onboarding-roadmap">
          <span className="card-kicker">מסלול הקמה</span>
          <div className="roadmap-steps">
            {setupSteps.map((step, index) => {
              const isReady =
                (index === 0 && profileSaved) ||
                (index >= 1 &&
                  index <= 3 &&
                  metaPresentation.setupComplete);
              const isMetaStep = index === 1;
              return (
                <div className={`roadmap-step ${isReady ? "ready" : ""}`} key={step.title}>
                  <span>{isReady ? "✓" : index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </div>
                  {isMetaStep ? (
                    <button type="button" onClick={onConnectMeta}>
                      {metaPresentation.actionLabel}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </FeaturePage>
  );
}

function BusinessProfileCheck({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <div className={complete ? "complete" : "incomplete"}>
      <span aria-hidden="true">{complete ? "✓" : "×"}</span>
      <strong>{label}</strong>
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

function Team() {
  const roles = Object.keys(roleLabels) as TenantRole[];

  return (
    <FeaturePage
      eyebrow="RBAC"
      title="צוות והרשאות"
      description="Clerk מזהה את המשתמש, Membership בצד השרת קובע את ה-Tenant, ומטריצת RBAC קובעת את הפעולות המותרות. הזמנת משתמשים תחובר בשלב ה-Onboarding המתמשך."
      action={
        <button type="button" className="primary-button" disabled>
          הזמנת משתמש
        </button>
      }
    >
      <section className="role-grid">
        {roles.map((role) => (
          <article className="card role-card" key={role}>
            <div className="role-card-heading">
              <span className="role-symbol" aria-hidden="true">
                {role === "owner" ? "O" : role === "manager" ? "M" : role === "agent" ? "A" : "V"}
              </span>
              <div>
                <span className="card-kicker">{role}</span>
                <h2>{roleLabels[role]}</h2>
              </div>
            </div>
            <strong className="permission-count">
              {rolePermissions[role].length} הרשאות מוגדרות
            </strong>
            <ul>
              {rolePermissions[role].map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </FeaturePage>
  );
}

function FeaturePage({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action ? <div className="heading-actions">{action}</div> : null}
      </div>
      {children}
    </>
  );
}

function MetaConnectionPanel({
  connection,
  embeddedSignup,
  onClose,
}: {
  connection: MetaConnectionView;
  embeddedSignup: MetaEmbeddedSignupView;
  onClose: () => void;
}) {
  const router = useRouter();
  const presentation = presentMetaConnection(connection);
  const hasAssetSnapshot = [
    "pending",
    "connected",
    "verification_required",
    "revoked",
    "error",
    "restricted",
  ].includes(connection.status);
  const hasEmbeddedSignupConfiguration =
    embeddedSignup.status === "configured";
  const [sdkStatus, setSdkStatus] = useState<
    | "idle"
    | "loading"
    | "ready"
    | MetaEmbeddedSignupSdkErrorCode
  >(() =>
    embeddedSignup.status === "configured" &&
    !presentation.setupComplete
      ? "loading"
      : "idle",
  );
  const [attemptStatus, setAttemptStatus] =
    useState<MetaSignupAttemptStatus>(() =>
      presentation.setupComplete ? "connected" : "idle",
    );
  const sdkRef = useRef<MetaFacebookSdk | null>(null);
  const activeAttemptRef =
    useRef<ActiveMetaSignupAttempt | null>(null);
  const panelActiveRef = useRef(true);
  const dialogRef =
    useAccessibleDialog(onClose);

  useEffect(() => {
    if (
      embeddedSignup.status !== "configured" ||
      presentation.setupComplete
    ) {
      return;
    }

    let active = true;

    metaEmbeddedSignupSdkLoader
      .load({
        appId: embeddedSignup.appId,
        apiVersion: embeddedSignup.apiVersion,
      })
      .then((sdk) => {
        if (active) {
          sdkRef.current = sdk;
          setSdkStatus("ready");
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        sdkRef.current = null;
        setSdkStatus(
          error &&
            typeof error === "object" &&
            "code" in error &&
            typeof error.code === "string"
            ? (error.code as MetaEmbeddedSignupSdkErrorCode)
            : "LOAD_FAILED",
        );
      });

    return () => {
      active = false;
    };
  }, [
    embeddedSignup,
    presentation.setupComplete,
  ]);

  useEffect(() => {
    panelActiveRef.current = true;

    return () => {
      panelActiveRef.current = false;
      activeAttemptRef.current?.cleanup();
      activeAttemptRef.current = null;
    };
  }, []);

  const startMetaEmbeddedSignup = () => {
    if (
      embeddedSignup.status !== "configured" ||
      sdkStatus !== "ready" ||
      sdkRef.current === null ||
      activeAttemptRef.current !== null
    ) {
      return;
    }

    let unsubscribe = () => {};
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const attempt: ActiveMetaSignupAttempt = {
      cleanup() {
        unsubscribe();

        if (timeout !== null) {
          clearTimeout(timeout);
        }

        if (activeAttemptRef.current === attempt) {
          activeAttemptRef.current = null;
        }
      },
    };
    const coordinator =
      createMetaEmbeddedSignupAttemptCoordinator(
        (result) => {
          attempt.cleanup();

          if (result.status !== "ready") {
            if (panelActiveRef.current) {
              setAttemptStatus(result.status);
            }
            return;
          }

          if (panelActiveRef.current) {
            setAttemptStatus("submitting");
          }

          void completeMetaEmbeddedSignupAction(result.input)
            .then((completionResult) => {
              if (!panelActiveRef.current) {
                return;
              }

              setAttemptStatus(completionResult.status);

              if (
                completionResult.status === "connected"
              ) {
                router.refresh();
              }
            })
            .catch(() => {
              if (panelActiveRef.current) {
                setAttemptStatus("server-error");
              }
            });
        },
      );

    activeAttemptRef.current = attempt;
    setAttemptStatus("launching");
    unsubscribe = subscribeToMetaEmbeddedSignupMessages(
      window,
      (result) => coordinator.acceptMessageResult(result),
    );
    timeout = setTimeout(
      () => coordinator.expire(),
      META_SIGNUP_FLOW_TIMEOUT_MS,
    );

    try {
      launchMetaEmbeddedSignup(
        sdkRef.current,
        embeddedSignup.configurationId,
        (result) => {
          if (result.status === "authorized") {
            if (timeout !== null) {
              clearTimeout(timeout);
            }

            timeout = setTimeout(
              () => coordinator.expire(),
              META_AUTHORIZATION_CODE_TIMEOUT_MS,
            );
          }

          coordinator.acceptLoginResult(result);
        },
      );

      if (!coordinator.isSettled()) {
        setAttemptStatus("awaiting-results");
      }
    } catch {
      coordinator.acceptLoginResult({ status: "invalid" });
    }
  };

  const sdkReady =
    presentation.setupComplete || sdkStatus === "ready";
  const sdkDetail = presentation.setupComplete
    ? "החיבור כבר פעיל ואין צורך בטעינה מחדש"
    : sdkStatus === "ready"
      ? "Meta JavaScript SDK נטען ואותחל"
      : sdkStatus === "loading"
        ? "Meta JavaScript SDK נטען כעת"
        : sdkStatus === "idle"
          ? "הטעינה ממתינה לתצורת Embedded Signup תקינה"
          : "טעינת Meta JavaScript SDK נכשלה באופן בטוח";
  const steps = [
    {
      title: "הגדרת ספק ומזהי Meta",
      detail: hasEmbeddedSignupConfiguration
        ? `Meta App ו־Graph API ${embeddedSignup.apiVersion} הוגדרו בצד השרת`
        : embeddedSignup.status === "configuration-invalid"
          ? "הגדרת Embedded Signup חלקית או לא תקינה"
          : hasAssetSnapshot
        ? "נשמר Snapshot מאומת בצד השרת"
        : "החלטה ופרטי Meta App עדיין נדרשים",
      complete:
        hasEmbeddedSignupConfiguration || hasAssetSnapshot,
    },
    {
      title: "טעינת Meta JavaScript SDK",
      detail: sdkDetail,
      complete: sdkReady,
    },
    {
      title: "חוזה Embedded Signup v4",
      detail: presentation.setupComplete
        ? "תוצאת החיבור כבר אומתה ונשמרה בצד השרת"
        : sdkStatus === "ready"
          ? "FB.login ואירועי Meta מוכנים להעברה מיידית לשרת"
          : "קליטת האירועים תופעל רק לאחר טעינת SDK תקינה",
      complete:
        presentation.setupComplete ||
        attemptStatus === "submitting" ||
        attemptStatus === "connected",
    },
    {
      title: "Business Portfolio, WABA ומספר",
      detail: hasAssetSnapshot
        ? "המזהים נשמרו ואינם מוצגים בדפדפן"
        : "השלב יבוצע דרך Embedded Signup",
      complete: hasAssetSnapshot,
    },
    {
      title: "Webhook ואימות החיבור",
      detail: presentation.setupComplete
        ? "הרשמת ה־Webhook אושרה"
        : presentation.statusLabel,
      complete: presentation.setupComplete,
    },
  ];
  const attemptInProgress = [
    "launching",
    "awaiting-results",
    "submitting",
  ].includes(attemptStatus);
  const attemptDetail =
    attemptStatus === "launching"
      ? "פותח את חלון Meta"
      : attemptStatus === "awaiting-results"
        ? "ממתין להשלמת החיבור ב־Meta"
        : attemptStatus === "submitting"
          ? "מאמת ושומר את החיבור בצד השרת"
          : attemptStatus === "client-cancelled"
            ? "תהליך החיבור בוטל לפני השלמה"
            : attemptStatus === "unsupported-flow"
              ? "Meta החזירה זרימה שאינה נתמכת ב־MVP"
              : attemptStatus === "authorization-failed"
                ? "הקוד של Meta נדחה או פג תוקף"
                : attemptStatus === "verification-failed"
                  ? "נכסי Meta לא עברו אימות בעלות"
                  : attemptStatus === "subscription-failed"
                    ? "הרשמת ה־WABA נכשלה וניתן לנסות שוב"
                    : attemptStatus === "permission-denied" ||
                        attemptStatus === "unauthenticated" ||
                        attemptStatus === "onboarding-required" ||
                        attemptStatus ===
                          "tenant-selection-required"
                      ? "אין הרשאה להשלים את החיבור בסביבת העבודה"
                      : attemptStatus ===
                            "configuration-required" ||
                          attemptStatus ===
                            "configuration-invalid"
                        ? "תצורת השרת לחיבור Meta אינה מלאה"
                        : attemptStatus === "validation-error" ||
                            attemptStatus === "client-error" ||
                            attemptStatus === "server-error"
                          ? "החיבור לא הושלם באופן בטוח"
                          : attemptStatus === "connected"
                            ? "החיבור אומת ונשמר"
                            : null;

  return (
    <div className="modal-layer" role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="סגירת חלון חיבור"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        className="connection-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meta-title"
        aria-describedby="meta-panel-notice"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="panel-header">
          <div>
            <span className="card-kicker">חיבור רשמי</span>
            <h2 id="meta-title">חיבור Meta ו־WhatsApp</h2>
          </div>
          <button
            type="button"
            className="close-button"
            aria-label="סגירה"
            data-dialog-initial-focus
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div
          className={`panel-notice ${presentation.tone}`}
          id="meta-panel-notice"
        >
          <span>{presentation.setupComplete ? "✓" : "!"}</span>
          <p>{presentation.panelNotice}</p>
        </div>
        <ol className="connection-steps">
          {steps.map((step, index) => (
            <li className={step.complete ? "ready" : ""} key={step.title}>
              <span>{step.complete ? "✓" : index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </div>
            </li>
          ))}
        </ol>
        {attemptDetail ? (
          <div
            className={`inline-notice ${
              attemptStatus === "connected"
                ? "success"
                : attemptInProgress
                  ? "warning"
                  : "danger"
            }`}
            role={
              attemptInProgress ||
              attemptStatus === "connected"
                ? "status"
                : "alert"
            }
          >
            <span aria-hidden="true">
              {attemptStatus === "connected"
                ? "✓"
                : attemptInProgress
                  ? "i"
                  : "!"}
            </span>
            <p>{attemptDetail}</p>
          </div>
        ) : null}
        <div className="panel-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            סגירה
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={
              presentation.setupComplete ||
              !hasEmbeddedSignupConfiguration ||
              sdkStatus !== "ready" ||
              attemptInProgress ||
              attemptStatus === "connected"
            }
            onClick={startMetaEmbeddedSignup}
          >
            {presentation.setupComplete
              ? "החיבור פעיל"
              : attemptStatus === "launching"
                ? "פותח את Meta"
                : attemptStatus === "awaiting-results"
                  ? "ממתין ל־Meta"
                  : attemptStatus === "submitting"
                    ? "מאמת את החיבור"
                    : attemptStatus === "connected"
                      ? "החיבור הושלם"
              : hasEmbeddedSignupConfiguration
                ? sdkStatus === "loading"
                  ? "טוען Meta SDK"
                  : sdkStatus === "ready"
                    ? attemptStatus === "idle"
                      ? "חיבור Meta ו־WhatsApp"
                      : "ניסיון חוזר לחיבור Meta"
                    : sdkStatus === "idle"
                      ? "טעינת Meta SDK ממתינה"
                      : "טעינת Meta SDK נכשלה"
                : embeddedSignup.status ===
                    "configuration-invalid"
                  ? "הגדרת Meta אינה תקינה"
                  : "פתיחת Meta טרם זמינה"}
          </button>
        </div>
      </section>
    </div>
  );
}
