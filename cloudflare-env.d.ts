declare module "cloudflare:workers" {
  import type { D1DatabaseBinding } from "./db/d1";
  import type {
    MetaWebhookQueueBinding,
  } from "./server/meta/metaWebhookQueuePublisher";
  import type {
    R2BucketBinding,
  } from "./server/ai/knowledgeObjectStorage";
  import type {
    RateLimitBinding,
  } from "./server/security/rateLimit";

  export const env: {
    DB?: D1DatabaseBinding;
    FILES?: R2BucketBinding;
    META_APP_ID?: string;
    META_APP_SECRET?: string;
    META_EMBEDDED_SIGNUP_CONFIGURATION_ID?: string;
    META_WEBHOOK_VERIFY_TOKEN?: string;
    META_GRAPH_API_VERSION?: string;
    META_CREDENTIAL_ENCRYPTION_KEY_V1?: string;
    META_WEBHOOK_QUEUE?: MetaWebhookQueueBinding;
    META_WEBHOOK_RATE_LIMITER?: RateLimitBinding;
    TENANT_MUTATION_RATE_LIMITER?: RateLimitBinding;
    SYSTEM_ADMIN_MUTATION_RATE_LIMITER?: RateLimitBinding;
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
    TEAM_INVITATION_BROWSER_E2E_ORIGIN?: string;
    TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON?: string;
    TEAM_INVITATION_ACCEPTANCE_MODE?: string;
    APP_RUNTIME_ENVIRONMENT?: string;
  };
}
