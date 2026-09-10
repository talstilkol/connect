import { MetaMediaQuarantineError } from "../meta/metaMediaQuarantine.ts";

export interface S3MetaMediaQuarantineEnvironment {
  META_MEDIA_S3_REGION?: string;
  META_MEDIA_S3_BUCKET?: string;
  META_MEDIA_S3_ACCOUNT_ID?: string;
  META_MEDIA_S3_KMS_KEY_ARN?: string;
  META_MEDIA_S3_SCANNER_ROLE_ARN?: string;
}
export interface S3MetaMediaQuarantineConfiguration {
  readonly region: string;
  readonly bucket: string;
  readonly accountId: string;
  readonly kmsKeyArn: string;
  readonly scannerRoleArn: string;
}
export const META_MEDIA_QUARANTINE_PREFIX = "quarantine/meta-history/v1/";
export function requireS3MetaMediaQuarantineConfiguration(environment: S3MetaMediaQuarantineEnvironment): Readonly<S3MetaMediaQuarantineConfiguration> {
  const { META_MEDIA_S3_REGION: region, META_MEDIA_S3_BUCKET: bucket, META_MEDIA_S3_ACCOUNT_ID: accountId,
    META_MEDIA_S3_KMS_KEY_ARN: kmsKeyArn, META_MEDIA_S3_SCANNER_ROLE_ARN: scannerRoleArn } = environment;
  const key = typeof kmsKeyArn === "string" && /^arn:aws:kms:([a-z0-9-]+):([0-9]{12}):key\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|mrk-[0-9a-f]{32})$/.exec(kmsKeyArn);
  const role = typeof scannerRoleArn === "string" && /^arn:aws:iam::([0-9]{12}):role\/[A-Za-z0-9+=,.@_/-]{1,512}$/.exec(scannerRoleArn);
  // Only ordinary regional AWS buckets are supported. No aliases, directory
  // buckets, access points, custom endpoints, or implicit key/account defaults.
  if (typeof region !== "string" || !/^(?:af|ap|ca|eu|il|me|mx|sa|us)-(?!gov-)[a-z]+-\d+$/.test(region) ||
    typeof bucket !== "string" || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) ||
    /^(?:xn--|sthree-|amzn-s3-demo-)/.test(bucket) || /(?:-s3alias|--ol-s3|--x-s3|--table-s3|\.mrap)$/.test(bucket) ||
    typeof accountId !== "string" || !/^[0-9]{12}$/.test(accountId) || !key || key[1] !== region || key[2] !== accountId ||
    !role || role[1] !== accountId || scannerRoleArn?.endsWith("/")) throw new MetaMediaQuarantineError("CONFIGURATION_INVALID");
  return Object.freeze({ region, bucket, accountId, kmsKeyArn, scannerRoleArn } as S3MetaMediaQuarantineConfiguration);
}
