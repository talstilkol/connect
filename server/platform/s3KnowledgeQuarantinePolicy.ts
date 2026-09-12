import type { S3MetaMediaQuarantineConfiguration } from "./s3MetaMediaQuarantineConfiguration.ts";
import { KNOWLEDGE_QUARANTINE_PREFIX } from "./s3KnowledgeConfiguration.ts";

// Required denies, not a complete deployment or a grant of IAM permissions.
// Extra Allow statements cannot override them. Only the configured scanning
// role may read pending content or assign/remove the protected verdict tag.
export function requiredKnowledgeQuarantineBucketPolicy(config: S3MetaMediaQuarantineConfiguration) {
  const bucket = `arn:aws:s3:::${config.bucket}`, objects = `${bucket}/${KNOWLEDGE_QUARANTINE_PREFIX}*`;
  const exceptScanner = { ArnNotEquals: { "aws:PrincipalArn": config.scannerRoleArn } };
  const deny = (Sid: string, Action: string | string[], Resource: string | string[], Condition: object) =>
    ({ Sid, Effect: "Deny", Principal: "*", Action, Resource, Condition });
  return { Version: "2012-10-17", Statement: [
    deny("ConnectKnowledgeRequireTLS", "s3:*", [bucket, `${bucket}/*`], { Bool: { "aws:SecureTransport": "false" } }),
    deny("ConnectKnowledgeRequireKMS", "s3:PutObject", objects, { StringNotEquals: { "s3:x-amz-server-side-encryption": "aws:kms" } }),
    deny("ConnectKnowledgeRequireExactKey", "s3:PutObject", objects, { StringNotEquals: { "s3:x-amz-server-side-encryption-aws-kms-key-id": config.kmsKeyArn } }),
    deny("ConnectKnowledgeCreateOnly", "s3:PutObject", objects, { Null: { "s3:if-none-match": "true" } }),
    deny("ConnectKnowledgeDenyUnscannedRead", ["s3:GetObject", "s3:GetObjectVersion"], objects,
      { ...exceptScanner, StringNotEquals: { "s3:ExistingObjectTag/GuardDutyMalwareScanStatus": "NO_THREATS_FOUND" } }),
    deny("ConnectKnowledgeDenyVerdictOnUpload", "s3:PutObject", objects,
      { ...exceptScanner, "ForAnyValue:StringEquals": { "s3:RequestObjectTagKeys": ["GuardDutyMalwareScanStatus"] } }),
    // PutObjectTagging replaces the entire tag set. Blocking only requests
    // that mention the protected key would still permit its removal.
    deny("ConnectKnowledgeProtectVerdict", ["s3:PutObjectTagging", "s3:PutObjectVersionTagging", "s3:DeleteObjectTagging", "s3:DeleteObjectVersionTagging"], objects, exceptScanner),
  ] };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function hasRequiredKnowledgeQuarantineBucketPolicy(raw: unknown, config: S3MetaMediaQuarantineConfiguration): boolean {
  if (typeof raw !== "string" || raw.length > 20 * 1024) return false;
  try {
    const policy = JSON.parse(raw);
    if (policy?.Version !== "2012-10-17" || !Array.isArray(policy.Statement)) return false;
    const required = requiredKnowledgeQuarantineBucketPolicy(config).Statement;
    return required.every((statement) => {
      const matches = policy.Statement.filter((item: { Sid?: unknown } | null) => item?.Sid === statement.Sid);
      return matches.length === 1 && canonical(matches[0]) === canonical(statement);
    });
  } catch { return false; }
}
