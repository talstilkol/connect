"use client";

import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ContactDirectoryStatus,
} from "../contacts/ContactDirectory";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
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
  type TeamDirectoryStatus,
  type TeamDirectoryView,
} from "../../shared/domain/teamDirectoryView";
import {
  workspaceSectionPath,
  type SectionId,
} from "../../shared/workspace/navigation";
import {
  readWorkspaceDirection,
  readWorkspaceLocaleLinks,
  readWorkspaceNavigation,
  readWorkspaceShellMessages,
} from "../../shared/i18n/workspace";
import {
  TenantWorkspaceSwitcher,
} from "./TenantWorkspaceSwitcher";
import { MetaConnectionPanel } from "./MetaConnectionPanel";
import {
  WorkspaceSectionContent,
} from "./WorkspaceSectionContent";

export default function WorkspaceApp({
  activeSection = "dashboard",
  language = "he",
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
  initialTeamDirectory = {
    identityStatus:
      "unavailable",
    members: [],
  },
  initialTeamDirectoryStatus =
    "configuration-required",
  initialProductionReadiness,
}: {
  activeSection?: SectionId;
  language?: InterfaceLanguage;
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
  initialTeamDirectory?:
    TeamDirectoryView;
  initialTeamDirectoryStatus?:
    TeamDirectoryStatus;
  initialProductionReadiness:
    ProductionReadinessReport;
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [metaPanelOpen, setMetaPanelOpen] = useState(false);
  const messages = readWorkspaceShellMessages(language);
  const direction = readWorkspaceDirection(language);
  const localizedNavigation = readWorkspaceNavigation(language);
  const localeLinks = readWorkspaceLocaleLinks(activeSection);

  const navigate = (section: SectionId) => {
    router.push(workspaceSectionPath(section, language));
    setMobileMenuOpen(false);
  };

  return (
    <main className="app-shell" lang={language} dir={direction}>
      <a
        className="skip-link"
        href="#workspace-content"
      >
        {messages.skipLink}
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

        <nav
          className="main-navigation"
          aria-label={messages.primaryNavigationAriaLabel}
        >
          {localizedNavigation.map((item, index) => {
            const previousGroup =
              index > 0 ? localizedNavigation[index - 1].group : null;
            const showGroup = item.group && item.group !== previousGroup;

            return (
              <div key={item.id}>
                {showGroup ? (
                  <p className="nav-group">{item.groupLabel}</p>
                ) : null}
                <button
                  type="button"
                  className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                  aria-current={
                    activeSection === item.id
                      ? "page"
                      : undefined
                  }
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

        <TenantWorkspaceSwitcher
          connectionStatus={
            messages.metaConnectionStatuses[
              initialMetaConnection.status
            ]
          }
          language={language}
        />
      </aside>

      {mobileMenuOpen ? (
        <button
          className="mobile-overlay"
          type="button"
          aria-label={messages.closeMenuAriaLabel}
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
              aria-label={messages.openMenuAriaLabel}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              ☰
            </button>
            <div className="breadcrumb">
              <span>Connect</span>
              <b>/</b>
              <strong>
                {localizedNavigation.find((item) => item.id === activeSection)?.label}
              </strong>
            </div>
          </div>
          <div className="topbar-actions">
            <nav
              className="workspace-language-switcher"
              aria-label={messages.languageSelectorAriaLabel}
            >
              {localeLinks.map((locale) => (
                <a
                  key={locale.language}
                  href={locale.href}
                  hrefLang={locale.language}
                  lang={locale.language}
                  dir={locale.direction}
                  aria-current={
                    locale.language === language
                      ? "page"
                      : undefined
                  }
                  title={locale.nativeName}
                >
                  {locale.language.toUpperCase()}
                </a>
              ))}
            </nav>
            <span className="environment-badge">
              <i />
              {messages.setupEnvironment}
            </span>
            <button
              type="button"
              className="topbar-icon"
              aria-label={messages.helpAriaLabel}
              aria-describedby="unavailable-navigation-actions"
              title={messages.helpUnavailableTitle}
              disabled
            >
              ?
            </button>
            <button
              type="button"
              className="topbar-icon"
              aria-label={messages.notificationsAriaLabel}
              aria-describedby="unavailable-navigation-actions"
              title={messages.notificationsUnavailableTitle}
              disabled
            >
              ♢
            </button>
            <span
              className="sr-only"
              id="unavailable-navigation-actions"
            >
              {messages.unavailableActionDescription}
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

        <WorkspaceSectionContent
          activeSection={activeSection}
          language={language}
          authEnabled={authEnabled}
          initialContacts={initialContacts}
          initialContactsCursor={initialContactsCursor}
          initialContactOrganization={initialContactOrganization}
          initialContactsStatus={initialContactsStatus}
          initialMetaConnection={initialMetaConnection}
          initialMessageTemplates={initialMessageTemplates}
          initialMessageTemplateStatus={initialMessageTemplateStatus}
          initialCanWriteMessageTemplates={initialCanWriteMessageTemplates}
          initialCampaigns={initialCampaigns}
          initialCampaignTemplates={initialCampaignTemplates}
          initialCampaignAudiences={initialCampaignAudiences}
          initialCampaignStatus={initialCampaignStatus}
          initialCanWriteCampaigns={initialCanWriteCampaigns}
          initialCampaignDeliveryStatus={initialCampaignDeliveryStatus}
          initialInbox={initialInbox}
          initialInboxStatus={initialInboxStatus}
          initialAiReplyApprovals={initialAiReplyApprovals}
          initialAiReplyApprovalStatus={initialAiReplyApprovalStatus}
          initialBotFlows={initialBotFlows}
          initialBotFlowStatus={initialBotFlowStatus}
          initialAiAgents={initialAiAgents}
          initialAiAgentStatus={initialAiAgentStatus}
          initialOperationalReport={initialOperationalReport}
          initialOperationalReportStatus={initialOperationalReportStatus}
          initialTeamDirectory={initialTeamDirectory}
          initialTeamDirectoryStatus={initialTeamDirectoryStatus}
          initialProductionReadiness={initialProductionReadiness}
          onNavigate={navigate}
          onConnectMeta={() => setMetaPanelOpen(true)}
        />
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
