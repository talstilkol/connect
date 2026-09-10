import { mediaBytes, mediaSha256 } from './meta-media.mjs';
import { requireS3MetaMediaQuarantineConfiguration } from '../../server/platform/s3MetaMediaQuarantineConfiguration.ts';
import { requiredMetaMediaQuarantineBucketPolicy } from '../../server/platform/s3MetaMediaQuarantinePolicy.ts';

// Isolated SDK protocol fixtures, never deployment configuration or UI data.
export const quarantineEnvironment = Object.freeze({ META_MEDIA_S3_REGION: 'eu-west-1', META_MEDIA_S3_BUCKET: 'connect-media-integration',
  META_MEDIA_S3_ACCOUNT_ID: '123456789012', META_MEDIA_S3_KMS_KEY_ARN: 'arn:aws:kms:eu-west-1:123456789012:key/12345678-1234-1234-1234-123456789012',
  META_MEDIA_S3_SCANNER_ROLE_ARN: 'arn:aws:iam::123456789012:role/connect-media-scanner' });
export const quarantineConfig = requireS3MetaMediaQuarantineConfiguration(quarantineEnvironment);
export const quarantineInput = () => ({ tenantId: 7, connectionVersion: 3, messageKey: `message_v1_${mediaSha256}`,
  sourceSha256: mediaSha256, contentSha256: mediaSha256, mediaType: 'image/png', sizeBytes: mediaBytes.byteLength, bytes: mediaBytes.slice() });
export function s3Reply(command) {
  const meta = { $metadata: { httpStatusCode: 200 } };
  switch (command.constructor.name) {
    case 'GetPublicAccessBlockCommand': return { ...meta, PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true } };
    case 'GetBucketVersioningCommand': return { ...meta, Status: 'Enabled' };
    case 'GetBucketOwnershipControlsCommand': return { ...meta, OwnershipControls: { Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }] } };
    case 'GetBucketEncryptionCommand': return { ...meta, ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'aws:kms', KMSMasterKeyID: quarantineConfig.kmsKeyArn } }] } };
    case 'GetBucketPolicyStatusCommand': return { ...meta, PolicyStatus: { IsPublic: false } };
    case 'GetBucketPolicyCommand': return { ...meta, Policy: JSON.stringify(requiredMetaMediaQuarantineBucketPolicy(quarantineConfig)) };
    case 'PutObjectCommand': return { ...meta, VersionId: 's3-integration-version-1', ChecksumSHA256: Buffer.from(mediaSha256, 'hex').toString('base64'), ServerSideEncryption: 'aws:kms', SSEKMSKeyId: quarantineConfig.kmsKeyArn };
    default: throw new Error(`Unexpected SDK command: ${command.constructor.name}`);
  }
}
