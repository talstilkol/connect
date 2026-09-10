import { createS3MetaMediaQuarantineStorage } from '../server/platform/s3MetaMediaQuarantineStorage.ts';
import { MetaMediaQuarantineError } from '../server/meta/metaMediaQuarantine.ts';
import { quarantineEnvironment, s3Reply } from './fixtures/meta-media-quarantine.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMetaHistoryMediaAcquisition } from '../server/meta/metaHistoryMediaAcquisition.ts';
import { createMetaMediaDownloader, MetaMediaDownloadError } from '../server/meta/metaMediaDownload.ts';
import { parseMetaHistorySync } from '../server/meta/metaHistorySync.ts';
import { mediaBytes, mediaInput, mediaSha256, metadataResponse, binaryResponse } from './fixtures/meta-media.mjs';
import { scope, customerPhone, message, chunk, value, mediaValue } from './fixtures/meta-history.mjs';

const key = `message_v1_${mediaSha256}`;
const session = { tenantId: scope.tenantId, externalUserId: 'media-test-owner', role: 'owner', status: 'active', displayName: 'Media acquisition test' };
function fixture(options = {}) {
  const mediaValueInput = mediaValue(); Object.assign(mediaValueInput.messages[0].image, { mime_type: 'image/png', sha256: mediaSha256 });
  const original = parseMetaHistorySync({ kind: 'history', value: value([chunk({ threads: [{ id: customerPhone, messages: [message({ id: 'wamid.history-media', type: 'media_placeholder', text: undefined })] }] })]) }, scope.phoneNumberId)[0].messages[0];
  const bound = { scope, messageKey: key, message: original, media: parseMetaHistorySync({ kind: 'history', value: mediaValueInput }, scope.phoneNumberId)[0] };
  const calls = [], reads = [], actors = [], tokens = [];
  let visible = true, owner = true, captured;
  const downloader = createMetaMediaDownloader({ apiVersion: 'v23.0' }, { requestTimeoutMs: 2000, async fetchImplementation(url, init) {
    calls.push({ url: String(url), init });
    if (options.fetch) return options.fetch(url, init, calls.length, controls);
    return new URL(url).hostname === 'graph.facebook.com' ? metadataResponse() : binaryResponse();
  } });
  const controls = { calls, reads, actors, tokens, bound, revoke() { visible = false; }, demote() { owner = false; }, get captured() { return captured; } };
  const service = createMetaHistoryMediaAcquisition({
    media: { async readBoundMedia(tenantId, messageKey) {
      reads.push({ tenantId, messageKey });
      if (options.read) return options.read(tenantId, messageKey, reads.length, controls);
      return visible ? structuredClone(bound) : null;
    } },
    memberships: { async findActiveByExternalUserId(actor) {
      actors.push(actor);
      if (options.membership) await options.membership(actors.length, controls);
      return [{ tenantId: scope.tenantId, externalUserId: session.externalUserId, role: owner ? 'owner' : 'manager', tenantStatus: 'active', tenantDisplayName: session.displayName, version: 1 }];
    } },
    credentials: { async withAccessToken(tenantId, operation) {
      tokens.push(tenantId);
      if (options.token) await options.token(tokens.length, controls);
      return operation('local-private-media-token');
    } },
    quarantine: options.quarantine,
    downloader: { async download(input, authorize) {
      captured = await downloader.download(input, authorize);
      if (options.downloaded) await options.downloaded(controls);
      return captured;
    } },
  });
  return { service, ...controls, controls };
}
const rejects = (promise, code) => assert.rejects(promise, (error) => {
  assert.ok(error instanceof MetaMediaDownloadError); assert.equal(error.code, code);
  assert.doesNotMatch(error.message, /local-private|lookaside|private database/); return true;
});

test('requires current owner and a saved binding, and returns binary only for private quarantine', async () => {
  const f = fixture(); const result = await f.service.download(session, key);
  assert.deepEqual(result.bytes, mediaBytes); assert.equal(result.quarantineRequired, true); assert.equal(result.messageKey, key);
  assert.deepEqual(result.scope, scope); assert.deepEqual(f.tokens, [session.tenantId, session.tenantId]);
  assert.equal(f.calls.length, 2); assert.equal(f.reads.length, 4); assert.equal(f.actors.length, 4);
  assert.ok(f.reads.every((read) => read.tenantId === session.tenantId && read.messageKey === key));
  assert.equal(Object.hasOwn(result, 'url'), false); assert.equal(Object.hasOwn(result, 'status'), false);
});

test('stale owner sessions, absent binding and foreign binding fail before touching a token', async () => {
  for (const options of [{ membership: (_count, state) => state.demote() }, { read: () => null },
    { read: (_tenant, _key, _count, state) => ({ ...state.bound, scope: { ...scope, tenantId: 99 } }) },
    { read: (_tenant, _key, _count, state) => ({ ...state.bound, messageKey: `message_v1_${'f'.repeat(64)}` }) }]) {
    const f = fixture(options); await rejects(f.service.download(session, key), 'AUTHORIZATION_CHANGED');
    assert.deepEqual(f.calls, []); assert.deepEqual(f.tokens, []);
  }
});

test('revocation after the vault wait prevents metadata access', async () => {
  const f = fixture({ token: (_count, state) => state.revoke() });
  await rejects(f.service.download(session, key), 'AUTHORIZATION_CHANGED'); assert.deepEqual(f.calls, []);
});

test('changed source or actor after metadata blocks the binary GET', async () => {
  for (const change of ['revoke', 'demote']) {
    const f = fixture({ fetch: (_url, _init, _count, state) => { state[change](); return metadataResponse(); } });
    await rejects(f.service.download(session, key), 'AUTHORIZATION_CHANGED'); assert.equal(f.calls.length, 1);
  }
});

test('changed authorization after binary verification wipes bytes instead of releasing them', async () => {
  for (const change of ['revoke', 'demote']) {
    const f = fixture({ downloaded: (state) => state[change]() });
    await rejects(f.service.download(session, key), 'AUTHORIZATION_CHANGED');
    assert.ok(f.controls.captured.bytes.every((byte) => byte === 0)); assert.equal(f.calls.length, 2);
  }
});

test('a matching message key cannot hide a changed metadata snapshot', async () => {
  const f = fixture({ read: (_tenant, _key, count, state) => count < 3 ? structuredClone(state.bound) : {
    ...state.bound, media: { ...state.bound.media, content: { ...state.bound.media.content, id: '999999' } },
  } });
  await rejects(f.service.download(session, key), 'AUTHORIZATION_CHANGED'); assert.equal(f.calls.length, 1);
});

test('original MIME/hash constraints remain binding when the separate media event omits them', async () => {
  const f = fixture({ read: (_tenant, _key, _count, state) => ({ ...state.bound,
    message: { ...state.bound.message, contentKind: 'image', content: { sha256: '0'.repeat(64), mime_type: mediaInput.expectedMimeType } },
    media: { ...state.bound.media, content: { id: mediaInput.mediaId } },
  }) });
  await rejects(f.service.download(session, key), 'CONTENT_MISMATCH'); assert.equal(f.calls.length, 1);
});

test('actor and tenant are copied before waits, and dependency errors stay sanitized', async () => {
  const input = { ...session };
  const f = fixture({ membership: () => { input.externalUserId = 'changed-actor'; input.tenantId = 99; } });
  assert.deepEqual((await f.service.download(input, key)).scope, scope);
  assert.ok(f.actors.every((actor) => actor === session.externalUserId)); assert.ok(f.tokens.every((tenant) => tenant === session.tenantId));
  const failed = fixture({ read: () => { throw new Error('private database information'); } });
  await rejects(failed.service.download(session, key), 'DEPENDENCY_UNAVAILABLE'); assert.equal(failed.calls.length, 0);
});

test('one acquisition per service instance bounds memory and completion releases capacity', async () => {
  let release, reached;
  const waiting = new Promise((resolve) => { reached = resolve; });
  let held = false;
  const f = fixture({ fetch: (_url, _init, count) => {
    if (count === 1 && !held) { held = true; reached(); return new Promise((resolve) => { release = resolve; }); }
    return count % 2 === 1 ? metadataResponse() : binaryResponse();
  } });
  const first = f.service.download(session, key); await waiting;
  await rejects(f.service.download(session, key), 'IN_PROGRESS'); assert.equal(f.calls.length, 1);
  release(metadataResponse()); assert.deepEqual((await first).bytes, mediaBytes);
  assert.deepEqual((await f.service.download(session, key)).bytes, mediaBytes); assert.equal(f.calls.length, 4);
});

test('failure also releases the local acquisition slot without performing an automatic retry', async () => {
  let first = true;
  const f = fixture({ fetch: (url) => {
    if (first) { first = false; throw new Error('private database network detail'); }
    return new URL(url).hostname === 'graph.facebook.com' ? metadataResponse() : binaryResponse();
  } });
  await rejects(f.service.download(session, key), 'NETWORK_ERROR'); assert.equal(f.calls.length, 1);
  assert.deepEqual((await f.service.download(session, key)).bytes, mediaBytes); assert.equal(f.calls.length, 3);
});


function withQuarantine(hook) {
  const commands = []; let controls;
  const quarantine = createS3MetaMediaQuarantineStorage(quarantineEnvironment, { client: { async send(command) {
    commands.push(command);
    return hook ? hook(command, controls) : s3Reply(command);
  } } });
  const f = fixture({ quarantine }); controls = f.controls;
  return { ...f, commands };
}
const quarantineRejected = (promise, code) => assert.rejects(promise, (error) => {
  assert.ok(error instanceof MetaMediaQuarantineError); assert.equal(error.code, code); return true;
});

test('acquisition uploads through the actual S3 adapter and returns only a quarantined version receipt', async () => {
  const f = withQuarantine(), result = await f.service.downloadAndQuarantine(session, key);
  assert.equal(result.state, 'quarantined'); assert.equal(result.tenantId, session.tenantId); assert.equal(result.messageKey, key);
  assert.equal(result.connectionVersion, scope.connectionVersion); assert.equal(result.versionId, 's3-integration-version-1');
  assert.equal(Object.hasOwn(result, 'bytes'), false); assert.equal(Object.hasOwn(result, 'url'), false);
  assert.ok(f.controls.captured.bytes.every((byte) => byte === 0));
  assert.equal(f.commands.filter((command) => command.constructor.name === 'PutObjectCommand').length, 1);
  assert.equal(f.reads.length, 8); assert.equal(f.actors.length, 8);
});

test('missing quarantine configuration fails before contacting Meta or S3', async () => {
  const f = fixture(); await quarantineRejected(f.service.downloadAndQuarantine(session, key), 'CONFIGURATION_INVALID');
  assert.equal(f.calls.length, 0);
});

test('source or owner revocation during S3 preflight prevents the upload', async () => {
  for (const change of ['revoke', 'demote']) {
    const f = withQuarantine((command, state) => { if (command.constructor.name === 'GetBucketPolicyCommand') state[change](); return s3Reply(command); });
    await quarantineRejected(f.service.downloadAndQuarantine(session, key), 'AUTHORIZATION_CHANGED');
    assert.equal(f.commands.filter((command) => command.constructor.name === 'PutObjectCommand').length, 0);
    assert.ok(f.controls.captured.bytes.every((byte) => byte === 0));
  }
});

test('revocation during the S3 write discards its receipt without pretending to undo the remote write', async () => {
  const f = withQuarantine((command, state) => { if (command.constructor.name === 'PutObjectCommand') state.revoke(); return s3Reply(command); });
  await quarantineRejected(f.service.downloadAndQuarantine(session, key), 'AUTHORIZATION_CHANGED');
  assert.equal(f.commands.length, 7); assert.ok(f.controls.captured.bytes.every((byte) => byte === 0));
});

test('ambiguous storage failure retains its safe error and clears downloaded bytes without an automatic retry', async () => {
  const f = withQuarantine((command) => { if (command.constructor.name === 'PutObjectCommand') throw new Error('private-provider timeout'); return s3Reply(command); });
  await quarantineRejected(f.service.downloadAndQuarantine(session, key), 'OUTCOME_UNKNOWN');
  assert.equal(f.commands.length, 7); assert.equal(f.calls.length, 2); assert.ok(f.controls.captured.bytes.every((byte) => byte === 0));
});

test('the acquisition slot remains held through quarantine upload', async () => {
  let release, reached; const waiting = new Promise((resolve) => { reached = resolve; });
  const f = withQuarantine((command) => {
    if (command.constructor.name === 'PutObjectCommand') { reached(); return new Promise((resolve) => { release = () => resolve(s3Reply(command)); }); }
    return s3Reply(command);
  });
  const pending = f.service.downloadAndQuarantine(session, key); await waiting;
  await rejects(f.service.download(session, key), 'IN_PROGRESS'); assert.equal(f.calls.length, 2);
  release(); await pending;
  assert.deepEqual((await f.service.download(session, key)).bytes, mediaBytes);
});
