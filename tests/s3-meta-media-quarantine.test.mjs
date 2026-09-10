import assert from 'node:assert/strict';
import test from 'node:test';
import { createS3MetaMediaQuarantineStorage } from '../server/platform/s3MetaMediaQuarantineStorage.ts';
import { MetaMediaQuarantineError } from '../server/meta/metaMediaQuarantine.ts';
import { requireS3MetaMediaQuarantineConfiguration } from '../server/platform/s3MetaMediaQuarantineConfiguration.ts';
import { requiredMetaMediaQuarantineBucketPolicy, hasRequiredMetaMediaQuarantineBucketPolicy } from '../server/platform/s3MetaMediaQuarantinePolicy.ts';
import { mediaBytes, mediaSha256 } from './fixtures/meta-media.mjs';
import { quarantineEnvironment as env, quarantineConfig as config, quarantineInput as input, s3Reply } from './fixtures/meta-media-quarantine.mjs';

function fixture(hook, requestTimeoutMs = 1000) {
  const calls = []; let authorizations = 0;
  const client = { async send(command, options) {
    calls.push({ command, signal: options.abortSignal, body: command.input.Body?.slice() });
    return hook ? hook(command, calls.length, options) : s3Reply(command);
  } };
  const storage = createS3MetaMediaQuarantineStorage(env, { client, requestTimeoutMs });
  return { storage, calls, authorize: async () => { authorizations++; }, get authorizations() { return authorizations; } };
}
const rejected = (promise, code) => assert.rejects(promise, (error) => {
  assert.ok(error instanceof MetaMediaQuarantineError); assert.equal(error.code, code);
  assert.doesNotMatch(error.message, /private-provider|AKIA|https:|arn:aws/); return true;
});
const puts = (f) => f.calls.filter(({ command }) => command.constructor.name === 'PutObjectCommand');

test('private versioned KMS upload returns a quarantined version receipt and never reads an object', async () => {
  const f = fixture(), raw = input(), result = await f.storage.store(raw, f.authorize);
  assert.equal(result.state, 'quarantined'); assert.equal(result.versionId, 's3-integration-version-1');
  assert.equal(result.contentSha256, mediaSha256); assert.equal(result.bucket, config.bucket);
  assert.equal(result.objectKey, `quarantine/meta-history/v1/7/3/${raw.messageKey}/${mediaSha256}/${mediaSha256}`);
  assert.equal(f.authorizations, 3); assert.equal(f.calls.length, 7); assert.equal(puts(f).length, 1);
  assert.deepEqual(puts(f)[0].body, mediaBytes); assert.ok(puts(f)[0].command.input.Body.every((byte) => byte === 0));
  assert.deepEqual(raw.bytes, mediaBytes); assert.equal(Object.hasOwn(result, 'bytes'), false); assert.equal(Object.hasOwn(result, 'url'), false);
  assert.ok(f.calls.every(({ command }) => command.input.ExpectedBucketOwner === config.accountId && command.input.Bucket === config.bucket));
  const put = puts(f)[0].command.input;
  assert.equal(put.IfNoneMatch, '*'); assert.equal(put.SSEKMSKeyId, config.kmsKeyArn); assert.equal(put.ServerSideEncryption, 'aws:kms');
  assert.equal(put.ChecksumAlgorithm, 'SHA256'); assert.equal(put.ContentLength, mediaBytes.byteLength);
  assert.equal(put.ContentType, 'application/octet-stream'); assert.equal(put.ContentDisposition, 'attachment'); assert.equal(put.CacheControl, 'no-store');
  for (const field of ['ACL', 'Tagging', 'WebsiteRedirectLocation', 'SSECustomerKey', 'ObjectLockMode']) assert.equal(Object.hasOwn(put, field), false);
  assert.equal(put.Metadata['connect-source-sha256'], mediaSha256); f.storage.close();
});

test('configuration rejects missing values, foreign accounts, aliases, endpoints and non-key KMS identifiers', () => {
  for (const field of Object.keys(env)) {
    const bad = { ...env }; delete bad[field]; assert.throws(() => requireS3MetaMediaQuarantineConfiguration(bad), { code: 'CONFIGURATION_INVALID' });
  }
  for (const [field, values] of Object.entries({
    META_MEDIA_S3_REGION: ['eu-west-1.evil', 'us-gov-west-1', 'cn-north-1', ' eu-west-1'],
    META_MEDIA_S3_BUCKET: ['https://bucket', 'bucket.with.dots', 'bucket--x-s3', 'bucket-s3alias', 'xn--bucket', 'a', 'a'.repeat(64)],
    META_MEDIA_S3_ACCOUNT_ID: ['123', '999999999999'],
    META_MEDIA_S3_KMS_KEY_ARN: [config.kmsKeyArn.replace('eu-west-1', 'eu-west-2'), config.kmsKeyArn.replace(':key/', ':alias/'), 'alias/aws/s3'],
    META_MEDIA_S3_SCANNER_ROLE_ARN: [config.scannerRoleArn.replace('123456789012', '999999999999'), 'arn:aws:iam::123456789012:root', config.scannerRoleArn + '*'],
  })) for (const value of values) assert.throws(() => requireS3MetaMediaQuarantineConfiguration({ ...env, [field]: value }), { code: 'CONFIGURATION_INVALID' });
  for (const requestTimeoutMs of [0, -1, NaN, 60001]) assert.throws(() => createS3MetaMediaQuarantineStorage(env, { requestTimeoutMs }), { code: 'CONFIGURATION_INVALID' });
  assert.throws(() => createS3MetaMediaQuarantineStorage(env, { endpoint: 'http://localhost' }), { code: 'CONFIGURATION_INVALID' });
});

test('invalid identity, MIME, length or unverified digest fails before any S3 operation', async () => {
  for (const change of [{ tenantId: 0 }, { connectionVersion: 0 }, { messageKey: '../escape' }, { sourceSha256: 'x' },
    { contentSha256: 'x' }, { contentSha256: '0'.repeat(64) }, { mediaType: 'image/png\r\nX: y' }, { sizeBytes: 0 },
    { sizeBytes: mediaBytes.byteLength + 1 }, { sizeBytes: 100 * 1024 * 1024 + 1 }, { extra: true }, { bytes: [] }]) {
    const f = fixture(); await rejected(f.storage.store({ ...input(), ...change }, f.authorize), change.contentSha256?.length === 64 ? 'CONTENT_MISMATCH' : 'INVALID_INPUT');
    assert.equal(f.calls.length, 0);
  }
});

test('tenant, connection generation, source and content form a deterministic object identity', async () => {
  const paths = [];
  for (const changes of [{}, {}, { tenantId: 8 }, { connectionVersion: 4 }, { sourceSha256: '1'.repeat(64) }, { messageKey: `message_v1_${'2'.repeat(64)}` }]) {
    const f = fixture(); paths.push((await f.storage.store({ ...input(), ...changes }, f.authorize)).objectKey);
  }
  assert.equal(paths[0], paths[1]); assert.equal(new Set(paths).size, 5);
});

test('input bytes and identity are copied before asynchronous authorization and preflight', async () => {
  const f = fixture(), raw = input(); let calls = 0;
  const result = await f.storage.store(raw, async () => {
    if (++calls === 1) { raw.bytes.fill(0); raw.tenantId = 99; raw.connectionVersion = 100; raw.sourceSha256 = '0'.repeat(64); }
  });
  assert.equal(result.tenantId, 7); assert.equal(result.connectionVersion, 3); assert.equal(result.sourceSha256, mediaSha256);
  assert.deepEqual(puts(f)[0].body, mediaBytes);
});

test('all four public access blocks must be explicitly true', async () => {
  for (const key of ['BlockPublicAcls', 'IgnorePublicAcls', 'BlockPublicPolicy', 'RestrictPublicBuckets']) for (const flag of [false, undefined]) {
    const f = fixture((command) => { const reply = s3Reply(command); if (reply.PublicAccessBlockConfiguration) reply.PublicAccessBlockConfiguration[key] = flag; return reply; });
    await rejected(f.storage.store(input(), f.authorize), 'UNSAFE_BUCKET'); assert.equal(puts(f).length, 0);
  }
});

test('suspended versioning, ACL ownership, public policy or wrong default KMS prevent a write', async () => {
  for (const change of ['version', 'ownership', 'encryption', 'key', 'public', 'unknown']) {
    const f = fixture((command) => {
      const reply = s3Reply(command);
      if (reply.Status && change === 'version') reply.Status = 'Suspended';
      if (reply.OwnershipControls && change === 'ownership') reply.OwnershipControls.Rules[0].ObjectOwnership = 'ObjectWriter';
      if (reply.ServerSideEncryptionConfiguration && change === 'encryption') reply.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm = 'AES256';
      if (reply.ServerSideEncryptionConfiguration && change === 'key') reply.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.KMSMasterKeyID = 'alias/aws/s3';
      if (reply.PolicyStatus && change === 'public') reply.PolicyStatus.IsPublic = true;
      if (reply.PolicyStatus && change === 'unknown') return {};
      return reply;
    });
    await rejected(f.storage.store(input(), f.authorize), 'UNSAFE_BUCKET'); assert.equal(puts(f).length, 0);
  }
});

test('removing or weakening each required bucket deny prevents upload', async () => {
  const original = requiredMetaMediaQuarantineBucketPolicy(config);
  for (let index = 0; index < original.Statement.length; index++) for (const mutation of ['remove', 'allow', 'resource', 'condition', 'duplicate']) {
    const policy = structuredClone(original);
    if (mutation === 'remove') policy.Statement.splice(index, 1);
    if (mutation === 'allow') policy.Statement[index].Effect = 'Allow';
    if (mutation === 'resource') policy.Statement[index].Resource = 'arn:aws:s3:::unrelated/*';
    if (mutation === 'condition') policy.Statement[index].Condition = {};
    if (mutation === 'duplicate') policy.Statement.push(policy.Statement[index]);
    const f = fixture((command) => command.constructor.name === 'GetBucketPolicyCommand' ? { Policy: JSON.stringify(policy) } : s3Reply(command));
    await rejected(f.storage.store(input(), f.authorize), 'UNSAFE_BUCKET'); assert.equal(puts(f).length, 0);
  }
});

test('required policy covers version reads and scan-tag forgery at upload, update and deletion', () => {
  const p = requiredMetaMediaQuarantineBucketPolicy(config), byId = Object.fromEntries(p.Statement.map((s) => [s.Sid, s]));
  assert.deepEqual(byId.ConnectMediaDenyUnscannedRead.Action, ['s3:GetObject', 's3:GetObjectVersion']);
  assert.equal(byId.ConnectMediaDenyUnscannedRead.Condition.StringNotEquals['s3:ExistingObjectTag/GuardDutyMalwareScanStatus'], 'NO_THREATS_FOUND');
  assert.equal(byId.ConnectMediaDenyUnscannedRead.Condition.ArnNotEquals['aws:PrincipalArn'], config.scannerRoleArn);
  assert.equal(byId.ConnectMediaDenyVerdictOnUpload.Action, 's3:PutObject');
  assert.deepEqual(byId.ConnectMediaProtectVerdict.Action, ['s3:PutObjectTagging', 's3:PutObjectVersionTagging', 's3:DeleteObjectTagging', 's3:DeleteObjectVersionTagging']);
  assert.deepEqual(byId.ConnectMediaProtectVerdict.Condition, { ArnNotEquals: { 'aws:PrincipalArn': config.scannerRoleArn } });
  p.Statement.reverse(); assert.equal(hasRequiredMetaMediaQuarantineBucketPolicy(JSON.stringify(p), config), true);
  for (const bad of [undefined, 'null', '{}', '[1]', '{', ' '.repeat(21000)]) assert.equal(hasRequiredMetaMediaQuarantineBucketPolicy(bad, config), false);
});

test('preflight failure settles all requests, stays private and does not cache an earlier safe bucket', async () => {
  let unsafe = false;
  const f = fixture((command) => { if (unsafe && command.constructor.name === 'GetBucketVersioningCommand') throw new Error('private-provider credential'); return s3Reply(command); });
  await f.storage.store(input(), f.authorize); unsafe = true;
  await rejected(f.storage.store(input(), f.authorize), 'DEPENDENCY_UNAVAILABLE'); assert.equal(puts(f).length, 1); assert.equal(f.calls.length, 13);
});

test('authorization denial before preflight or after preflight prevents the PUT', async () => {
  for (const denyAt of [1, 2]) {
    const f = fixture(); let checks = 0;
    await rejected(f.storage.store(input(), async () => { if (++checks === denyAt) throw new Error('private-provider authorization'); }), 'AUTHORIZATION_CHANGED');
    assert.equal(puts(f).length, 0); assert.equal(f.calls.length, denyAt === 1 ? 0 : 6);
  }
});

test('authorization denial after a successful PUT returns no receipt or deletion and wipes the buffer', async () => {
  const f = fixture(); let checks = 0;
  await rejected(f.storage.store(input(), async () => { if (++checks === 3) throw new Error('revoked'); }), 'AUTHORIZATION_CHANGED');
  assert.equal(puts(f).length, 1); assert.equal(f.calls.length, 7); assert.ok(puts(f)[0].command.input.Body.every((byte) => byte === 0));
});

test('412 is existing-unverified, while 409 and 5xx remain unknown without readback or retry', async () => {
  for (const [code, expected] of [[412, 'OBJECT_EXISTS'], [409, 'OUTCOME_UNKNOWN'], [408, 'OUTCOME_UNKNOWN'], [500, 'OUTCOME_UNKNOWN'], [503, 'OUTCOME_UNKNOWN'], [400, 'WRITE_REJECTED'], [403, 'WRITE_REJECTED']]) {
    const f = fixture((command) => { if (command.constructor.name === 'PutObjectCommand') throw Object.assign(new Error('private-provider failure'), { $metadata: { httpStatusCode: code } }); return s3Reply(command); });
    await rejected(f.storage.store(input(), f.authorize), expected); assert.equal(puts(f).length, 1); assert.equal(f.calls.length, 7);
  }
});

test('missing or invalid version, KMS and checksum in a successful PUT require reconciliation', async () => {
  for (const change of [{ VersionId: undefined }, { VersionId: 'null' }, { VersionId: '' }, { VersionId: 'bad\nversion' }, { ChecksumSHA256: undefined },
    { ChecksumSHA256: 'bad' }, { ServerSideEncryption: 'AES256' }, { SSEKMSKeyId: 'alias/aws/s3' }, { $metadata: { httpStatusCode: 201 } }]) {
    const f = fixture((command) => command.constructor.name === 'PutObjectCommand' ? { ...s3Reply(command), ...change } : s3Reply(command));
    await rejected(f.storage.store(input(), f.authorize), 'OUTCOME_UNKNOWN'); assert.equal(puts(f).length, 1);
  }
  const f = fixture((command) => command.constructor.name === 'PutObjectCommand' ? null : s3Reply(command));
  await rejected(f.storage.store(input(), f.authorize), 'OUTCOME_UNKNOWN');
});

test('write timeout remains unknown even when SDK ignores Abort and completes later', async () => {
  let release;
  const f = fixture((command) => command.constructor.name === 'PutObjectCommand' ? new Promise((resolve) => { release = () => resolve(s3Reply(command)); }) : s3Reply(command), 25);
  await rejected(f.storage.store(input(), f.authorize), 'OUTCOME_UNKNOWN'); assert.equal(puts(f).length, 1);
  assert.equal(puts(f)[0].signal.aborted, true); assert.ok(puts(f)[0].command.input.Body.every((byte) => byte === 0)); release();
});

test('preflight timeout never creates an object', async () => {
  const f = fixture((command) => command.constructor.name === 'GetBucketPolicyCommand' ? new Promise(() => {}) : s3Reply(command), 25);
  await rejected(f.storage.store(input(), f.authorize), 'DEPENDENCY_UNAVAILABLE'); assert.equal(puts(f).length, 0);
});

test('one active upload per adapter excludes overlap and releases capacity after success or failure', async () => {
  let release, reached; const waiting = new Promise((resolve) => { reached = resolve; }); let first = true;
  const f = fixture((command) => {
    if (command.constructor.name === 'PutObjectCommand' && first) { first = false; reached(); return new Promise((resolve) => { release = () => resolve(s3Reply(command)); }); }
    return s3Reply(command);
  });
  const pending = f.storage.store(input(), f.authorize); await waiting;
  await rejected(f.storage.store(input(), f.authorize), 'IN_PROGRESS'); release(); await pending;
  await f.storage.store(input(), f.authorize); assert.equal(puts(f).length, 2);
});
