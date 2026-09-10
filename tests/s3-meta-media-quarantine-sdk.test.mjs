import assert from 'node:assert/strict';
import test from 'node:test';
import { S3Client } from '@aws-sdk/client-s3';
import { createS3MetaMediaQuarantineStorage, metaMediaQuarantineS3ClientConfiguration } from '../server/platform/s3MetaMediaQuarantineStorage.ts';
import { requiredMetaMediaQuarantineBucketPolicy } from '../server/platform/s3MetaMediaQuarantinePolicy.ts';
import { quarantineEnvironment as env, quarantineConfig as config, quarantineInput as input } from './fixtures/meta-media-quarantine.mjs';
import { mediaBytes, mediaSha256 } from './fixtures/meta-media.mjs';

function wireReply(request, putStatus) {
  const headers = { 'content-type': 'application/xml' };
  let body = '', statusCode = 200;
  if (request.method === 'PUT') {
    statusCode = putStatus;
    if (statusCode === 200) Object.assign(headers, { 'x-amz-version-id': 'wire-version-1', 'x-amz-checksum-sha256': Buffer.from(mediaSha256, 'hex').toString('base64'),
      'x-amz-server-side-encryption': 'aws:kms', 'x-amz-server-side-encryption-aws-kms-key-id': config.kmsKeyArn });
    else body = `<Error><Code>${statusCode === 412 ? 'PreconditionFailed' : statusCode === 301 ? 'PermanentRedirect' : 'InternalError'}</Code><Message>private-provider failure</Message></Error>`;
  } else {
    const query = request.query;
    if ('publicAccessBlock' in query) body = '<PublicAccessBlockConfiguration><BlockPublicAcls>true</BlockPublicAcls><IgnorePublicAcls>true</IgnorePublicAcls><BlockPublicPolicy>true</BlockPublicPolicy><RestrictPublicBuckets>true</RestrictPublicBuckets></PublicAccessBlockConfiguration>';
    else if ('versioning' in query) body = '<VersioningConfiguration><Status>Enabled</Status></VersioningConfiguration>';
    else if ('ownershipControls' in query) body = '<OwnershipControls><Rule><ObjectOwnership>BucketOwnerEnforced</ObjectOwnership></Rule></OwnershipControls>';
    else if ('encryption' in query) body = `<ServerSideEncryptionConfiguration><Rule><ApplyServerSideEncryptionByDefault><SSEAlgorithm>aws:kms</SSEAlgorithm><KMSMasterKeyID>${config.kmsKeyArn}</KMSMasterKeyID></ApplyServerSideEncryptionByDefault></Rule></ServerSideEncryptionConfiguration>`;
    else if ('policyStatus' in query) body = '<PolicyStatus><IsPublic>false</IsPublic></PolicyStatus>';
    else if ('policy' in query) { body = JSON.stringify(requiredMetaMediaQuarantineBucketPolicy(config)); headers['content-type'] = 'application/json'; }
    else assert.fail('Unexpected S3 read');
  }
  return { response: { statusCode, headers, body: new TextEncoder().encode(body) } };
}
async function run(putStatus = 200, options = {}) {
  const requests = [];
  const client = new S3Client({ ...metaMediaQuarantineS3ClientConfiguration(config),
    credentials: async () => { if (options.credentials) await options.credentials(requests); return { accessKeyId: 'integration-access-key', secretAccessKey: 'integration-signing-key', ...(options.credentials ? { expiration: new Date(Date.now() + 1000) } : {}) }; },
    requestHandler: { async handle(request) {
      requests.push({ ...request, headers: { ...request.headers }, body: request.body?.slice() });
      return wireReply(request, putStatus);
    } },
  });
  const storage = createS3MetaMediaQuarantineStorage(env, { client });
  try { return { result: await storage.store(input(), async () => { if (options.authorize) await options.authorize(requests); }), requests }; }
  catch (error) { return { error, requests }; }
  finally { client.destroy(); }
}

test('actual AWS SDK signs and serializes one conditional KMS upload without object reads or invocation IDs', async () => {
  const result = await run(); assert.equal(result.error, undefined); assert.equal(result.result.versionId, 'wire-version-1');
  assert.equal(result.requests.length, 7);
  for (const request of result.requests) {
    assert.equal(request.protocol, 'https:'); assert.equal(request.hostname, `${config.bucket}.s3.${config.region}.amazonaws.com`);
    assert.equal(request.headers['x-amz-expected-bucket-owner'], config.accountId);
    assert.match(request.headers.authorization, /^AWS4-HMAC-SHA256 Credential=integration-access-key\//);
    assert.equal(request.headers['amz-sdk-invocation-id'], undefined);
  }
  const put = result.requests.find((r) => r.method === 'PUT');
  assert.equal(put.headers['if-none-match'], '*'); assert.equal(put.headers['x-amz-server-side-encryption'], 'aws:kms');
  assert.equal(put.headers['x-amz-server-side-encryption-aws-kms-key-id'], config.kmsKeyArn);
  assert.equal(put.headers['x-amz-checksum-sha256'], Buffer.from(mediaSha256, 'hex').toString('base64'));
  assert.equal(put.headers['x-amz-tagging'], undefined); assert.equal(put.headers['x-amz-acl'], undefined); assert.deepEqual(put.body, mediaBytes);
});

test('actual SDK does not retry 5xx, redirect or conditional conflict responses', async () => {
  for (const [code, expected] of [[500, 'OUTCOME_UNKNOWN'], [301, 'OUTCOME_UNKNOWN'], [412, 'OBJECT_EXISTS']]) {
    const result = await run(code); assert.equal(result.error?.code, expected);
    assert.equal(result.requests.filter((r) => r.method === 'PUT').length, 1);
  }
});

test('SDK ignores configured endpoint override environment variables', async () => {
  const saved = process.env.AWS_ENDPOINT_URL_S3;
  process.env.AWS_ENDPOINT_URL_S3 = 'http://127.0.0.1:1/credential-sink';
  try { const result = await run(); assert.equal(result.error, undefined); assert.ok(result.requests.every((r) => r.hostname.endsWith('.amazonaws.com'))); }
  finally { if (saved === undefined) delete process.env.AWS_ENDPOINT_URL_S3; else process.env.AWS_ENDPOINT_URL_S3 = saved; }
});


test('revocation during AWS credential resolution is checked after signing and before the actual PUT transport', async () => {
  let revoked = false;
  const result = await run(200, {
    credentials(requests) { if (requests.length === 6) revoked = true; },
    authorize() { if (revoked) throw new Error('revoked during AWS credentials'); },
  });
  assert.equal(revoked, true); assert.equal(result.error?.code, 'AUTHORIZATION_CHANGED');
  assert.equal(result.requests.length, 6); assert.equal(result.requests.some((r) => r.method === 'PUT'), false);
});
