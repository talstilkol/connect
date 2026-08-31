import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  inspectSystemAdminConfiguration,
} from "../auth/systemAdminConfiguration.ts";
import {
  inspectMetaEmbeddedSignupServerReadiness,
} from "../meta/metaEmbeddedSignupServerReadiness.ts";
import {
  requireMetaWebhookConfiguration,
} from "../meta/metaWebhookConfiguration.ts";
import {
  inspectKnowledgeUploadPolicyConfiguration,
} from "../ai/knowledgeUploadPolicy.ts";
import {
  inspectKnowledgeScanRecoveryConfiguration,
} from "../ai/knowledgeScanRecoveryPolicy.ts";
import {
  inspectSloAlertPolicyConfiguration,
} from "./sloAlertPolicy.ts";
import {
  inspectBackupRestorePolicy,
} from "./backupRestorePolicy.ts";
import {
  inspectRetentionPolicy,
} from "./retentionPolicy.ts";
import {
  inspectEnvironmentIsolationEvidence,
} from "./environmentIsolationEvidence.ts";
import {
  inspectSecretInventoryEvidence,
} from "./secretInventoryEvidence.ts";
import {
  inspectSourceControlGovernanceEvidence,
} from "./sourceControlGovernanceEvidence.ts";
import {
  inspectDeploymentProvenanceEvidence,
} from "./deploymentProvenanceEvidence.ts";
import {
  inspectCiExecutionEvidence,
} from "./ciExecutionEvidence.ts";
import {
  inspectDependencyAuditEvidence,
} from "./dependencyAuditEvidence.ts";
import {
  inspectTeamInvitationBrowserEvidence,
} from "./teamInvitationBrowserEvidence.ts";
import {
  inspectBetterStackStagingEvidence,
} from "./betterStackStagingEvidence.ts";
import {
  inspectBotReplyStagingEvidence,
} from "./botReplyStagingEvidence.ts";
import {
  inspectRailwayBotReplyStagingCrossServiceEvidence,
} from "../platform/railwayBotReplyStagingCrossServiceEvidence.ts";
import {
  inspectBetterStackIncidentAlertConfiguration,
} from "../platform/betterStackIncidentAlertSink.ts";
import {
  inspectTeamInvitationAcceptanceActivation,
} from "../team/teamInvitationAcceptanceActivation.ts";
import {
  inspectTeamInvitationPolicy,
} from "../team/teamInvitationPolicy.ts";
import type {
  ProductionReadinessCategory,
  ProductionReadinessCheck,
  ProductionReadinessReport,
  ProductionReadinessStatus,
} from "../../shared/domain/productionReadiness.ts";
import {
  currentProductionImplementationState,
  type ProductionImplementationState,
} from "./productionImplementationState.ts";

type ConfigurationState =
  | "configured"
  | "disabled"
  | "incomplete"
  | "invalid";

export interface ProductionHostingBindings {
  d1?: unknown;
  r2?: unknown;
}

export interface ProductionReadinessInput {
  clerk: ConfigurationState;
  systemAdmin: ConfigurationState;
  teamInvitationPolicy:
    ConfigurationState;
  teamInvitationBrowserEvidence:
    ConfigurationState;
  teamInvitationAcceptanceActivation:
    ConfigurationState;
  metaEmbeddedSignup: ConfigurationState;
  metaWebhook: ConfigurationState;
  knowledgeUploadPolicy: ConfigurationState;
  knowledgeScanRecovery: ConfigurationState;
  sloAlertPolicy: ConfigurationState;
  backupRestorePolicy: ConfigurationState;
  retentionPolicy: ConfigurationState;
  environmentIsolation: ConfigurationState;
  secretInventory: ConfigurationState;
  sourceControlGovernance: ConfigurationState;
  deploymentProvenance: ConfigurationState;
  ciExecution: ConfigurationState;
  dependencyAudit: ConfigurationState;
  betterStackStagingEvidence:
    ConfigurationState;
  botReplyStagingEvidence:
    ConfigurationState;
  botReplyStagingCrossServiceEvidence:
    ConfigurationState;
  betterStackIncidentAlerting:
    ConfigurationState;
  hosting: ProductionHostingBindings;
  implementation: ProductionImplementationState;
}

export interface ProductionReadinessEnvironment {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS?: string;
  TEAM_INVITATION_TTL_HOURS?: string;
  TEAM_INVITATION_REREQUEST_POLICY?: string;
  TEAM_INVITATION_BROWSER_E2E_ORIGIN?: string;
  TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON?: string;
  TEAM_INVITATION_ACCEPTANCE_MODE?: string;
  APP_RUNTIME_ENVIRONMENT?: string;
  APP_PUBLIC_ORIGIN?: string;
  NODE_ENV?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_EMBEDDED_SIGNUP_CONFIGURATION_ID?: string;
  META_WEBHOOK_VERIFY_TOKEN?: string;
  META_GRAPH_API_VERSION?: string;
  META_CREDENTIAL_ENCRYPTION_KEY_V1?: string;
  WHATSAPP_RATE_LIMIT_HMAC_KEY_V1?: string;
  KNOWLEDGE_UPLOAD_MAX_BYTES?: string;
  KNOWLEDGE_UPLOAD_ALLOWED_MEDIA_TYPES_JSON?: string;
  KNOWLEDGE_SCAN_RETRY_MIN_AGE_SECONDS?: string;
  SLO_MEASUREMENT_WINDOW_MINUTES?: string;
  SLO_MINIMUM_VALID_EVENTS?: string;
  SLO_ALERT_OWNER?: string;
  SLO_ALERT_ESCALATION_ROUTE?: string;
  BACKUP_SCHEDULE_INTERVAL_HOURS?: string;
  BACKUP_RETENTION_DAYS?: string;
  RESTORE_REHEARSAL_INTERVAL_DAYS?: string;
  RETENTION_POLICY_JSON?: string;
  ENVIRONMENT_ISOLATION_EVIDENCE_JSON?: string;
  SECRET_INVENTORY_EVIDENCE_JSON?: string;
  APP_DEPLOYED_COMMIT_SHA?: string;
  APP_RELEASE_ID?: string;
  APP_DEPLOYMENT_ARTIFACT_DIGEST?: string;
  SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON?: string;
  DEPLOYMENT_PROVENANCE_EVIDENCE_JSON?: string;
  CI_EXECUTION_EVIDENCE_JSON?: string;
  DEPENDENCY_AUDIT_EVIDENCE_JSON?: string;
  BETTER_STACK_STAGING_EVIDENCE_JSON?: string;
  BOT_REPLY_STAGING_EVIDENCE_JSON?: string;
  BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON?: string;
  BETTER_STACK_INCIDENT_API_TOKEN?: string;
  BETTER_STACK_INCIDENT_REQUESTER_EMAIL?: string;
  BETTER_STACK_INCIDENT_ESCALATION_POLICY_ID?: string;
  BETTER_STACK_INCIDENT_NOTIFY_CALL?: string;
  BETTER_STACK_INCIDENT_NOTIFY_SMS?: string;
  BETTER_STACK_INCIDENT_NOTIFY_EMAIL?: string;
  BETTER_STACK_INCIDENT_NOTIFY_PUSH?: string;
  BETTER_STACK_INCIDENT_NOTIFY_CRITICAL?: string;
  BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS?: string;
}

interface CheckDefinition {
  id: string;
  category: ProductionReadinessCategory;
  ready: boolean;
  readyCode: string;
  blockedCode: string;
  blockedStatus?: Exclude<
    ProductionReadinessStatus,
    "ready"
  >;
}

function toCheck(
  definition: CheckDefinition,
): ProductionReadinessCheck {
  return {
    id: definition.id,
    category: definition.category,
    status: definition.ready
      ? "ready"
      : (definition.blockedStatus ?? "blocked"),
    code: definition.ready
      ? definition.readyCode
      : definition.blockedCode,
  };
}

function isConfigured(
  state: ConfigurationState,
): boolean {
  return state === "configured";
}

function inspectMetaWebhook(
  environment: ProductionReadinessEnvironment,
): ConfigurationState {
  const hasAppSecret =
    typeof environment.META_APP_SECRET === "string" &&
    environment.META_APP_SECRET.trim().length > 0;
  const hasVerifyToken =
    typeof environment.META_WEBHOOK_VERIFY_TOKEN === "string" &&
    environment.META_WEBHOOK_VERIFY_TOKEN.trim().length > 0;

  if (!hasAppSecret && !hasVerifyToken) {
    return "disabled";
  }

  try {
    requireMetaWebhookConfiguration(environment);
    return "configured";
  } catch {
    return "incomplete";
  }
}

function countByStatus(
  checks: readonly ProductionReadinessCheck[],
): ProductionReadinessReport["counts"] {
  return {
    ready: checks.filter(
      (check) => check.status === "ready",
    ).length,
    blocked: checks.filter(
      (check) => check.status === "blocked",
    ).length,
    decisionRequired: checks.filter(
      (check) => check.status === "decision-required",
    ).length,
  };
}

export function inspectProductionReadiness(
  input: ProductionReadinessInput,
): ProductionReadinessReport {
  const implementation = input.implementation;
  const checks = Object.freeze([
    toCheck({
      id: "identity.clerk",
      category: "identity",
      ready: isConfigured(input.clerk),
      readyCode: "CLERK_CONFIGURED",
      blockedCode: "CLERK_CONFIGURATION_REQUIRED",
    }),
    toCheck({
      id: "identity.system-admin",
      category: "identity",
      ready: isConfigured(input.systemAdmin),
      readyCode: "SYSTEM_ADMIN_CONFIGURED",
      blockedCode: "SYSTEM_ADMIN_CONFIGURATION_REQUIRED",
    }),
    toCheck({
      id:
        "identity.team-invitation-policy",
      category: "identity",
      ready: isConfigured(
        input.teamInvitationPolicy,
      ),
      readyCode:
        "TEAM_INVITATION_POLICY_CONFIGURED",
      blockedCode:
        "TEAM_INVITATION_POLICY_REQUIRED",
      blockedStatus:
        "decision-required",
    }),
    toCheck({
      id:
        "identity.team-invitation-browser-e2e",
      category: "identity",
      ready: isConfigured(
        input.teamInvitationBrowserEvidence,
      ),
      readyCode:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_VERIFIED",
      blockedCode:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_REQUIRED",
    }),
    toCheck({
      id:
        "identity.team-invitation-acceptance-activation",
      category: "identity",
      ready: isConfigured(
        input
          .teamInvitationAcceptanceActivation,
      ),
      readyCode:
        "TEAM_INVITATION_ACCEPTANCE_ACTIVATION_VERIFIED",
      blockedCode:
        "TEAM_INVITATION_ACCEPTANCE_ACTIVATION_REQUIRED",
    }),
    toCheck({
      id: "storage.d1-binding",
      category: "storage",
      ready: input.hosting.d1 === "DB",
      readyCode: "D1_BINDING_DECLARED",
      blockedCode: "D1_BINDING_INVALID",
    }),
    toCheck({
      id: "storage.r2-binding",
      category: "storage",
      ready: input.hosting.r2 === "FILES",
      readyCode: "R2_BINDING_DECLARED",
      blockedCode: "R2_BINDING_INVALID",
    }),
    toCheck({
      id: "hosting.environment-isolation",
      category: "storage",
      ready: isConfigured(
        input.environmentIsolation,
      ),
      readyCode:
        "ENVIRONMENT_ISOLATION_EVIDENCE_VERIFIED",
      blockedCode:
        "ENVIRONMENT_ISOLATION_EVIDENCE_REQUIRED",
    }),
    toCheck({
      id: "hosting.deployment-provenance",
      category: "storage",
      ready: isConfigured(
        input.deploymentProvenance,
      ),
      readyCode:
        "DEPLOYMENT_PROVENANCE_EVIDENCE_VERIFIED",
      blockedCode:
        "DEPLOYMENT_PROVENANCE_EVIDENCE_REQUIRED",
    }),
    toCheck({
      id: "meta.embedded-signup",
      category: "meta",
      ready: isConfigured(input.metaEmbeddedSignup),
      readyCode: "META_EMBEDDED_SIGNUP_CONFIGURED",
      blockedCode:
        "META_EMBEDDED_SIGNUP_CONFIGURATION_REQUIRED",
    }),
    toCheck({
      id: "meta.webhook-security",
      category: "meta",
      ready: isConfigured(input.metaWebhook),
      readyCode: "META_WEBHOOK_SECURITY_CONFIGURED",
      blockedCode: "META_WEBHOOK_SECURITY_CONFIGURATION_REQUIRED",
    }),
    toCheck({
      id: "meta.webhook-queue",
      category: "meta",
      ready: implementation.metaWebhookQueue,
      readyCode: "META_WEBHOOK_QUEUE_DECLARED",
      blockedCode: "META_WEBHOOK_QUEUE_REQUIRED",
    }),
    toCheck({
      id: "messaging.campaign-queue",
      category: "messaging",
      ready: implementation.campaignDeliveryQueue,
      readyCode: "CAMPAIGN_DELIVERY_QUEUE_DECLARED",
      blockedCode: "CAMPAIGN_DELIVERY_QUEUE_REQUIRED",
    }),
    toCheck({
      id: "messaging.target-queue-adapter",
      category: "messaging",
      ready: implementation.targetQueueAdapter,
      readyCode: "TARGET_QUEUE_ADAPTER_AVAILABLE",
      blockedCode: "TARGET_QUEUE_ADAPTER_REQUIRED",
    }),
    toCheck({
      id: "messaging.campaign-scheduler",
      category: "messaging",
      ready: implementation.campaignScheduler,
      readyCode: "CAMPAIGN_SCHEDULER_DECLARED",
      blockedCode: "CAMPAIGN_SCHEDULER_REQUIRED",
    }),
    toCheck({
      id: "messaging.delivery-adapter",
      category: "messaging",
      ready: implementation.campaignDeliveryAdapter,
      readyCode: "CAMPAIGN_DELIVERY_ADAPTER_AVAILABLE",
      blockedCode: "CAMPAIGN_DELIVERY_ADAPTER_REQUIRED",
    }),
    toCheck({
      id: "automation.bot-reply-adapter",
      category: "automation",
      ready:
        implementation.botReplyDeliveryAdapter &&
        isConfigured(input.botReplyStagingEvidence) &&
        isConfigured(input.botReplyStagingCrossServiceEvidence),
      readyCode: "BOT_REPLY_DELIVERY_ADAPTER_AVAILABLE",
      blockedCode: "BOT_REPLY_DELIVERY_ADAPTER_REQUIRED",
    }),
    toCheck({
      id: "ai.provider",
      category: "ai",
      ready: implementation.aiProvider,
      readyCode: "AI_PROVIDER_AVAILABLE",
      blockedCode: "AI_PROVIDER_DECISION_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "billing.provider",
      category: "billing",
      ready: implementation.billingProvider,
      readyCode: "BILLING_PROVIDER_AVAILABLE",
      blockedCode: "BILLING_PROVIDER_DECISION_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "security.rate-limit-policy",
      category: "security",
      ready: implementation.rateLimitPolicy,
      readyCode: "RATE_LIMIT_POLICY_APPROVED",
      blockedCode: "RATE_LIMIT_POLICY_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "security.secret-inventory",
      category: "security",
      ready: isConfigured(
        input.secretInventory,
      ),
      readyCode:
        "SECRET_INVENTORY_EVIDENCE_VERIFIED",
      blockedCode:
        "SECRET_INVENTORY_EVIDENCE_REQUIRED",
    }),
    toCheck({
      id: "security.source-control-governance",
      category: "security",
      ready: isConfigured(
        input.sourceControlGovernance,
      ),
      readyCode:
        "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_VERIFIED",
      blockedCode:
        "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_REQUIRED",
    }),
    toCheck({
      id: "security.ci-execution",
      category: "security",
      ready: isConfigured(
        input.ciExecution,
      ),
      readyCode:
        "CI_EXECUTION_EVIDENCE_VERIFIED",
      blockedCode:
        "CI_EXECUTION_EVIDENCE_REQUIRED",
    }),
    toCheck({
      id: "security.dependency-audit",
      category: "security",
      ready: isConfigured(
        input.dependencyAudit,
      ),
      readyCode:
        "DEPENDENCY_AUDIT_EVIDENCE_VERIFIED",
      blockedCode: "DEPENDENCY_AUDIT_REQUIRED",
    }),
    toCheck({
      id: "security.file-scanner",
      category: "security",
      ready: implementation.fileScanner,
      readyCode: "FILE_SCANNER_AVAILABLE",
      blockedCode: "FILE_SCANNER_POLICY_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "security.knowledge-upload-policy",
      category: "security",
      ready: isConfigured(
        input.knowledgeUploadPolicy,
      ),
      readyCode:
        "KNOWLEDGE_UPLOAD_POLICY_CONFIGURED",
      blockedCode:
        "KNOWLEDGE_UPLOAD_POLICY_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "operations.monitoring-alerting",
      category: "operations",
      ready:
        implementation.monitoringAndAlerting &&
        isConfigured(
          input.betterStackStagingEvidence,
        ) &&
        isConfigured(
          input.betterStackIncidentAlerting,
        ),
      readyCode: "MONITORING_AND_ALERTING_AVAILABLE",
      blockedCode: "MONITORING_AND_ALERTING_REQUIRED",
    }),
    toCheck({
      id: "operations.knowledge-scan-recovery",
      category: "operations",
      ready: isConfigured(
        input.knowledgeScanRecovery,
      ),
      readyCode:
        "KNOWLEDGE_SCAN_RECOVERY_POLICY_CONFIGURED",
      blockedCode:
        "KNOWLEDGE_SCAN_RECOVERY_POLICY_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "operations.backup-policy",
      category: "operations",
      ready: isConfigured(
        input.backupRestorePolicy,
      ),
      readyCode:
        "BACKUP_RESTORE_POLICY_CONFIGURED",
      blockedCode:
        "BACKUP_RESTORE_POLICY_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "operations.backup-restore",
      category: "operations",
      ready: implementation.backupAndRestore,
      readyCode: "BACKUP_AND_RESTORE_VERIFIED",
      blockedCode: "BACKUP_AND_RESTORE_REQUIRED",
    }),
    toCheck({
      id: "operations.slo-measurement",
      category: "operations",
      ready:
        implementation.sloMeasurement &&
        isConfigured(
          input.betterStackStagingEvidence,
        ),
      readyCode: "SLO_MEASUREMENT_AVAILABLE",
      blockedCode: "SLO_DATA_SOURCE_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "operations.slo-alert-policy",
      category: "operations",
      ready:
        isConfigured(input.sloAlertPolicy) &&
        isConfigured(
          input.betterStackIncidentAlerting,
        ),
      readyCode: "SLO_ALERT_POLICY_CONFIGURED",
      blockedCode: "SLO_ALERT_POLICY_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "governance.data-retention-policy",
      category: "governance",
      ready: isConfigured(
        input.retentionPolicy,
      ),
      readyCode:
        "DATA_RETENTION_POLICY_CONFIGURED",
      blockedCode: "DATA_RETENTION_POLICY_REQUIRED",
      blockedStatus: "decision-required",
    }),
    toCheck({
      id: "governance.data-retention-execution",
      category: "governance",
      ready: implementation.dataRetentionPolicy,
      readyCode:
        "DATA_RETENTION_EXECUTION_AVAILABLE",
      blockedCode:
        "DATA_RETENTION_EXECUTION_REQUIRED",
    }),
  ] satisfies readonly ProductionReadinessCheck[]);
  const counts = countByStatus(checks);

  return {
    readyForProduction:
      counts.blocked === 0 &&
      counts.decisionRequired === 0,
    checks,
    counts,
  };
}

export function inspectCurrentProductionReadiness(
  environment: ProductionReadinessEnvironment,
  hosting: ProductionHostingBindings,
): ProductionReadinessReport {
  return inspectProductionReadiness({
    clerk: inspectClerkConfiguration(environment).status,
    systemAdmin:
      inspectSystemAdminConfiguration(environment).status,
    teamInvitationPolicy:
      inspectTeamInvitationPolicy(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    teamInvitationBrowserEvidence:
      inspectTeamInvitationBrowserEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    teamInvitationAcceptanceActivation:
      inspectTeamInvitationAcceptanceActivation(
        environment,
      ).status === "ready"
        ? "configured"
        : "incomplete",
    metaEmbeddedSignup:
      inspectMetaEmbeddedSignupServerReadiness(
        environment,
      ).status,
    metaWebhook: inspectMetaWebhook(environment),
    knowledgeUploadPolicy:
      inspectKnowledgeUploadPolicyConfiguration(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    knowledgeScanRecovery:
      inspectKnowledgeScanRecoveryConfiguration(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    sloAlertPolicy:
      inspectSloAlertPolicyConfiguration(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    backupRestorePolicy:
      inspectBackupRestorePolicy(environment)
        .status === "configured"
        ? "configured"
        : "incomplete",
    retentionPolicy:
      inspectRetentionPolicy(environment).status ===
      "configured"
        ? "configured"
        : "incomplete",
    environmentIsolation:
      inspectEnvironmentIsolationEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    secretInventory:
      inspectSecretInventoryEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    sourceControlGovernance:
      inspectSourceControlGovernanceEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    deploymentProvenance:
      inspectDeploymentProvenanceEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    ciExecution:
      inspectCiExecutionEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    dependencyAudit:
      inspectDependencyAuditEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    betterStackStagingEvidence:
      inspectBetterStackStagingEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    botReplyStagingEvidence:
      inspectBotReplyStagingEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    botReplyStagingCrossServiceEvidence:
      inspectRailwayBotReplyStagingCrossServiceEvidence(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    betterStackIncidentAlerting:
      inspectBetterStackIncidentAlertConfiguration(
        environment,
      ).status === "configured"
        ? "configured"
        : "incomplete",
    hosting,
    implementation: currentProductionImplementationState,
  });
}
