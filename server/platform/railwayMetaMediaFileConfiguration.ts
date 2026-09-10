import { requireS3MetaMediaQuarantineConfiguration, type S3MetaMediaQuarantineEnvironment } from "./s3MetaMediaQuarantineConfiguration.ts";
export interface RailwayMetaMediaFileEnvironment extends S3MetaMediaQuarantineEnvironment {
  META_MEDIA_FILE_READ_MODE?: string;
}
export function requireRailwayMetaMediaFileEnvironment(environment: RailwayMetaMediaFileEnvironment = {
  META_MEDIA_FILE_READ_MODE: process.env.META_MEDIA_FILE_READ_MODE,
  META_MEDIA_S3_REGION: process.env.META_MEDIA_S3_REGION, META_MEDIA_S3_BUCKET: process.env.META_MEDIA_S3_BUCKET,
  META_MEDIA_S3_ACCOUNT_ID: process.env.META_MEDIA_S3_ACCOUNT_ID, META_MEDIA_S3_KMS_KEY_ARN: process.env.META_MEDIA_S3_KMS_KEY_ARN,
  META_MEDIA_S3_SCANNER_ROLE_ARN: process.env.META_MEDIA_S3_SCANNER_ROLE_ARN,
}): RailwayMetaMediaFileEnvironment | null {
  const mode = environment.META_MEDIA_FILE_READ_MODE;
  if (mode === undefined || mode === "disabled") return null;
  if (mode !== "enabled") throw new Error("Media file read mode is invalid");
  requireS3MetaMediaQuarantineConfiguration(environment);
  return Object.freeze({ META_MEDIA_FILE_READ_MODE: mode,
    META_MEDIA_S3_REGION: environment.META_MEDIA_S3_REGION, META_MEDIA_S3_BUCKET: environment.META_MEDIA_S3_BUCKET,
    META_MEDIA_S3_ACCOUNT_ID: environment.META_MEDIA_S3_ACCOUNT_ID, META_MEDIA_S3_KMS_KEY_ARN: environment.META_MEDIA_S3_KMS_KEY_ARN,
    META_MEDIA_S3_SCANNER_ROLE_ARN: environment.META_MEDIA_S3_SCANNER_ROLE_ARN });
}
