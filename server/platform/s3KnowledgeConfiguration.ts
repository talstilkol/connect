import { requireS3MetaMediaQuarantineConfiguration } from "./s3MetaMediaQuarantineConfiguration.ts";
export const KNOWLEDGE_QUARANTINE_PREFIX = "quarantine/knowledge/v1/";
export interface KnowledgeRuntimeEnvironment {
  KNOWLEDGE_ENABLED?: string;
  KNOWLEDGE_S3_REGION?: string;
  KNOWLEDGE_S3_BUCKET?: string;
  KNOWLEDGE_S3_ACCOUNT_ID?: string;
  KNOWLEDGE_S3_KMS_KEY_ARN?: string;
  KNOWLEDGE_S3_SCANNER_ROLE_ARN?: string;
}
export function requireKnowledgeConfiguration(env: KnowledgeRuntimeEnvironment) {
  if (env.KNOWLEDGE_ENABLED === undefined || env.KNOWLEDGE_ENABLED === "false") return null;
  if (env.KNOWLEDGE_ENABLED !== "true") throw new Error("Knowledge configuration invalid");
  return requireS3MetaMediaQuarantineConfiguration({ META_MEDIA_S3_REGION: env.KNOWLEDGE_S3_REGION,
    META_MEDIA_S3_BUCKET: env.KNOWLEDGE_S3_BUCKET, META_MEDIA_S3_ACCOUNT_ID: env.KNOWLEDGE_S3_ACCOUNT_ID,
    META_MEDIA_S3_KMS_KEY_ARN: env.KNOWLEDGE_S3_KMS_KEY_ARN, META_MEDIA_S3_SCANNER_ROLE_ARN: env.KNOWLEDGE_S3_SCANNER_ROLE_ARN });
}
export type KnowledgeStorageConfiguration = NonNullable<ReturnType<typeof requireKnowledgeConfiguration>>;

export function readKnowledgeEnvironment(): KnowledgeRuntimeEnvironment {
  return { KNOWLEDGE_ENABLED:process.env.KNOWLEDGE_ENABLED, KNOWLEDGE_S3_REGION:process.env.KNOWLEDGE_S3_REGION,
    KNOWLEDGE_S3_BUCKET:process.env.KNOWLEDGE_S3_BUCKET,KNOWLEDGE_S3_ACCOUNT_ID:process.env.KNOWLEDGE_S3_ACCOUNT_ID,
    KNOWLEDGE_S3_KMS_KEY_ARN:process.env.KNOWLEDGE_S3_KMS_KEY_ARN,KNOWLEDGE_S3_SCANNER_ROLE_ARN:process.env.KNOWLEDGE_S3_SCANNER_ROLE_ARN };
}
