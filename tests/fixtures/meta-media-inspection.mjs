import { quarantineInput, quarantineConfig, s3Reply } from './meta-media-quarantine.mjs';
import { metaMediaUploadObjectKey } from '../../server/meta/metaMediaUploadJournal.ts';

// Isolated S3 protocol fixtures over the existing real og.png bytes; never
// application data, deployment configuration or evidence of a live scan.
export function inspectionIntent() {
  const descriptor = quarantineInput();
  delete descriptor.bytes;
  return { ...descriptor, actor: 'scan-integration-owner', bucket: quarantineConfig.bucket,
    kmsKeyArn: quarantineConfig.kmsKeyArn, objectKey: metaMediaUploadObjectKey(descriptor) };
}
export function inspectionReply(command, intent = inspectionIntent(), result = 'NO_THREATS_FOUND', versionId = 's3-integration-version-1') {
  const meta = { $metadata: { httpStatusCode: 200 } };
  switch (command.constructor.name) {
    case 'ListObjectVersionsCommand': return { ...meta, Name: intent.bucket, Prefix: intent.objectKey, MaxKeys: 2, IsTruncated: false,
      Versions: [{ Key: intent.objectKey, VersionId: versionId, Size: intent.sizeBytes, IsLatest: true }] };
    case 'GetObjectTaggingCommand': return { ...meta, VersionId: versionId, TagSet: result === 'PENDING' ? [] : [{ Key: 'GuardDutyMalwareScanStatus', Value: result }] };
    case 'HeadObjectCommand': return { ...meta, VersionId: versionId, ContentLength: intent.sizeBytes,
      ChecksumSHA256: Buffer.from(intent.contentSha256, 'hex').toString('base64'), ChecksumType: 'FULL_OBJECT',
      ServerSideEncryption: 'aws:kms', SSEKMSKeyId: intent.kmsKeyArn, ContentType: 'application/octet-stream', ContentDisposition: 'attachment', CacheControl: 'no-store',
      Metadata: { 'connect-tenant': String(intent.tenantId), 'connect-generation': String(intent.connectionVersion), 'connect-message': intent.messageKey,
        'connect-source-sha256': intent.sourceSha256, 'connect-content-sha256': intent.contentSha256, 'connect-media-type': intent.mediaType } };
    default: return s3Reply(command);
  }
}
