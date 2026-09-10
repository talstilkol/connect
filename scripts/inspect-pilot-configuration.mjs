import { pathToFileURL } from "node:url";
import { clerkEnvironmentKeys, inspectClerkConfiguration } from "../server/auth/clerkConfiguration.ts";
import { resolvePublicOrigin } from "../server/operations/publicOrigin.ts";
import { inspectMetaEmbeddedSignupServerReadiness } from "../server/meta/metaEmbeddedSignupServerReadiness.ts";
import { requireMetaWebhookConfiguration } from "../server/meta/metaWebhookConfiguration.ts";
import { inspectTeamInvitationPolicy } from "../server/team/teamInvitationPolicy.ts";
import { inspectNodePostgresPoolConfiguration, nodePostgresPoolEnvironmentKeys } from "../server/platform/nodePostgresPoolConfiguration.ts";
import { inspectRailwayApiClientConfiguration, railwayApiClientEnvironmentKeys } from "../server/platform/railwayApiClientConfiguration.ts";
import { inspectRailwayApiIdentityConfiguration, railwayApiIdentityEnvironmentKeys } from "../server/platform/railwayApiIdentityConfiguration.ts";
import { inspectRailwayBullMqConfiguration, railwayBullMqEnvironmentKeys } from "../server/platform/railwayBullMqConfiguration.ts";
import { inspectRailwayBetterStackTelemetryConfiguration } from "../server/platform/railwayBetterStackTelemetry.ts";
import { inspectRailwayWorkerMainConfiguration } from "../server/platform/railwayWorkerMain.ts";
import {
  inspectPostgresTenantMutationRateLimitConfiguration,
  inspectPostgresMetaWebhookRateLimitConfiguration,
  inspectPostgresClerkInvitationRateLimitConfiguration,
  postgresTenantMutationRateLimitEnvironmentKeys,
  postgresMetaWebhookRateLimitEnvironmentKeys,
  postgresClerkInvitationRateLimitEnvironmentKeys,
} from "../server/platform/postgresMutationRateLimitConfiguration.ts";
import { requireRailwayMetaMediaFileEnvironment } from "../server/platform/railwayMetaMediaFileConfiguration.ts";
import { requireMetaMediaWorkerConfiguration } from "../server/platform/railwayMetaMediaWorkerRuntime.ts";
import { inspectRailwayMessageTemplateSubmissionConfiguration } from "../server/platform/railwayMessageTemplateSubmissionConfiguration.ts";
import { inspectRailwayMessageTemplateSyncConfiguration } from "../server/platform/railwayMessageTemplateSyncConfiguration.ts";
import { inspectRailwayCampaignActivationConfiguration } from "../server/platform/railwayCampaignActivationConfiguration.ts";
import { requireRailwayManualReplyConfiguration } from "../server/platform/railwayManualReplyConfiguration.ts";

const services = Object.freeze(["web", "api", "worker"]);
const statuses = new Set([
  "configured", "disabled", "incomplete", "invalid",
  "configuration-required", "stdout-only",
]);
const mediaKeys = Object.freeze([
  "META_MEDIA_S3_REGION", "META_MEDIA_S3_BUCKET", "META_MEDIA_S3_ACCOUNT_ID",
  "META_MEDIA_S3_KMS_KEY_ARN", "META_MEDIA_S3_SCANNER_ROLE_ARN",
]);
const signupKeys = Object.freeze([
  "META_APP_ID", "META_APP_SECRET", "META_GRAPH_API_VERSION",
  "META_EMBEDDED_SIGNUP_CONFIGURATION_ID", "META_CREDENTIAL_ENCRYPTION_KEY_V1",
]);

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Project only explicitly named keys into each existing inspector. Neither
// configuration objects nor exception messages are part of the public report.
function inspectGroup(environment, id, keys, inspect, { optional = false } = {}) {
  const selected = Object.fromEntries(keys.map((key) => [key, environment[key]]));
  let state;
  try {
    state = inspect(selected);
  } catch {
    state = { status: "invalid" };
  }
  const status = statuses.has(state?.status) ? state.status : "invalid";
  const accepted = status === "configured" || (optional && status === "disabled");
  const missingKeys = accepted ? [] : Array.isArray(state?.missingKeys)
    ? keys.filter((key) => state.missingKeys.includes(key))
    : (status === "disabled" || status === "incomplete")
      ? keys.filter((key) => !hasValue(selected[key])) : [];
  const invalidKeys = Array.isArray(state?.invalidKeys)
    ? keys.filter((key) => state.invalidKeys.includes(key))
    : [];
  return Object.freeze({
    id, status, required: !optional, accepted,
    checkedKeys: Object.freeze([...keys]),
    missingKeys: Object.freeze(missingKeys),
    invalidKeys: Object.freeze(invalidKeys),
  });
}

function requireGroup(requireConfiguration) {
  return (environment) => {
    const configuration = requireConfiguration(environment);
    return { status: configuration === null ? "disabled" : "configured" };
  };
}

export function inspectPilotConfiguration(service, environment) {
  if (!services.includes(service)) throw new Error("PILOT_CONFIGURATION_SERVICE_INVALID");
  if (!environment || typeof environment !== "object" || Array.isArray(environment)) {
    throw new Error("PILOT_CONFIGURATION_INPUT_INVALID");
  }
  const checks = [];
  const add = (...args) => checks.push(inspectGroup(environment, ...args));
  add("staging-boundary", ["APP_RUNTIME_ENVIRONMENT", "VERCEL_OIDC_ENVIRONMENT"], (env) => ({
    status: env.APP_RUNTIME_ENVIRONMENT === "staging" && env.VERCEL_OIDC_ENVIRONMENT === "preview"
      ? "configured" : "invalid",
    invalidKeys: [
      ...(env.APP_RUNTIME_ENVIRONMENT === "staging" ? [] : ["APP_RUNTIME_ENVIRONMENT"]),
      ...(env.VERCEL_OIDC_ENVIRONMENT === "preview" ? [] : ["VERCEL_OIDC_ENVIRONMENT"]),
    ],
  }));
  add("public-origin", ["APP_PUBLIC_ORIGIN"], (env) => ({
    status: resolvePublicOrigin(env) === null ? "invalid" : "configured",
  }));
  if (service === "web") {
    add("clerk", clerkEnvironmentKeys, inspectClerkConfiguration);
    add("web-api", railwayApiClientEnvironmentKeys, inspectRailwayApiClientConfiguration);
  } else {
    add("api-identity", railwayApiIdentityEnvironmentKeys, inspectRailwayApiIdentityConfiguration);
    add("postgres", [...nodePostgresPoolEnvironmentKeys, "POSTGRES_TLS_CA_PEM"], inspectNodePostgresPoolConfiguration);
    add("redis-queue", railwayBullMqEnvironmentKeys, inspectRailwayBullMqConfiguration);
    add("telemetry", ["APP_RUNTIME_ENVIRONMENT", "APP_RELEASE_SHA", "BETTER_STACK_OTLP_LOGS_ENDPOINT", "BETTER_STACK_SOURCE_TOKEN"],
      inspectRailwayBetterStackTelemetryConfiguration);
    add("meta-signup", signupKeys, inspectMetaEmbeddedSignupServerReadiness);
    add("meta-webhook", ["META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN"], requireGroup(requireMetaWebhookConfiguration));
    add("manual-replies", ["MANUAL_REPLY_ENABLED", "META_GRAPH_API_VERSION",
      "META_CREDENTIAL_ENCRYPTION_KEY_V1", "WHATSAPP_RATE_LIMIT_HMAC_KEY_V1"],
      (env) => ({ status: requireRailwayManualReplyConfiguration(env) ? "configured" : "disabled" }),
      { optional: true });
    if (service === "api") {
      add("tenant-mutation-limit", postgresTenantMutationRateLimitEnvironmentKeys, inspectPostgresTenantMutationRateLimitConfiguration);
      add("meta-webhook-limit", postgresMetaWebhookRateLimitEnvironmentKeys, inspectPostgresMetaWebhookRateLimitConfiguration);
      add("team-invitation-policy", ["TEAM_INVITATION_TTL_HOURS", "TEAM_INVITATION_REREQUEST_POLICY"], inspectTeamInvitationPolicy);
      add("template-submission", ["MESSAGE_TEMPLATE_SUBMISSION_ENABLED", "META_GRAPH_API_VERSION"],
        inspectRailwayMessageTemplateSubmissionConfiguration, { optional: true });
      add("template-sync", ["MESSAGE_TEMPLATE_SYNC_ENABLED", "META_GRAPH_API_VERSION", "META_CREDENTIAL_ENCRYPTION_KEY_V1"],
        (env) => ({ status: inspectRailwayMessageTemplateSyncConfiguration(env) }), { optional: true });
      add("campaign-activation", ["CAMPAIGN_ACTIVATION_ENABLED", "META_GRAPH_API_VERSION"],
        inspectRailwayCampaignActivationConfiguration, { optional: true });
      add("coexistence-pilot", ["META_COEXISTENCE_ONBOARDING_MODE"], (env) => ({
        status: env.META_COEXISTENCE_ONBOARDING_MODE === "controlled-pilot" ? "configured" : "invalid",
      }));
      add("media-file-read", ["META_MEDIA_FILE_READ_MODE", ...mediaKeys],
        requireGroup(requireRailwayMetaMediaFileEnvironment), { optional: true });
    } else {
      add("clerk-invitation-limit", postgresClerkInvitationRateLimitEnvironmentKeys, inspectPostgresClerkInvitationRateLimitConfiguration);
      add("worker-scheduler", ["RAILWAY_WORKER_SCHEDULER_OWNER_KEY"], inspectRailwayWorkerMainConfiguration);
      add("media-worker", ["META_MEDIA_WORKER_MODE", ...mediaKeys, "META_GRAPH_API_VERSION", "META_CREDENTIAL_ENCRYPTION_KEY_V1"],
        requireGroup(requireMetaMediaWorkerConfiguration), { optional: true });
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    service,
    scope: "local-staging-configuration-only",
    status: checks.every((check) => check.accepted) ? "configuration-valid" : "blocked",
    liveReadinessVerified: false,
    checks: Object.freeze(checks),
    unverified: Object.freeze([
      "provider-account-access-and-eligibility", "cross-service-identity-and-release-match",
      "database-schema-and-role-permissions", "queue-connectivity-and-worker-health",
      "provider-policy-and-budget", "media-storage-and-scanner-permissions",
      "live-qr-and-end-to-end-delivery",
    ]),
  });
}

export function runPilotConfigurationCli(arguments_, environment) {
  if (arguments_.length !== 1 || !services.some((service) => arguments_[0] === `--service=${service}`)) {
    return { exitCode: 1, stdout: "", stderr: "Pilot configuration: INVALID_ARGUMENTS\n" };
  }
  try {
    const report = inspectPilotConfiguration(arguments_[0].slice("--service=".length), environment);
    return {
      exitCode: report.status === "configuration-valid" ? 0 : 1,
      stdout: `${JSON.stringify(report, null, 2)}\n`, stderr: "",
    };
  } catch {
    return { exitCode: 1, stdout: "", stderr: "Pilot configuration: INSPECTION_FAILED\n" };
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = runPilotConfigurationCli(process.argv.slice(2), process.env);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
