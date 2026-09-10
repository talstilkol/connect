import assert from 'node:assert/strict';
import test from 'node:test';
import { createMetaMediaDownloader, MAXIMUM_META_MEDIA_DOWNLOAD_BYTES, MetaMediaDownloadError } from '../server/meta/metaMediaDownload.ts';
import { mediaBytes, mediaSha256, mediaId, mediaUrl, mediaInput, metadataResponse, binaryResponse } from './fixtures/meta-media.mjs';

const token = 'local-private-media-token';
const authorize = (operation) => operation(token);
const config = { apiVersion: 'v23.0' };
function fixture(options = {}) {
  const calls = [];
  const downloader = createMetaMediaDownloader(config, { requestTimeoutMs: 2000, ...options, async fetchImplementation(url, init) {
    calls.push({ url: String(url), init });
    if (options.fetchImplementation) return options.fetchImplementation(url, init, calls.length);
    return calls.length % 2 === 1 ? metadataResponse() : binaryResponse();
  } });
  return { downloader, calls };
}
const rejects = (promise, code) => assert.rejects(promise, (error) => {
  assert.ok(error instanceof MetaMediaDownloadError);
  assert.equal(error.code, code);
  assert.doesNotMatch(JSON.stringify(error) + error.message, /local-private|lookaside|local-test-signature|private provider body/);
  return true;
});

test('downloads an actual PNG through two authorized GETs, binds metadata to the phone and returns no secret URL', async () => {
  const { downloader, calls } = fixture(); let authorizations = 0;
  const result = await downloader.download(mediaInput, (operation) => { authorizations++; return authorize(operation); });
  assert.equal(authorizations, 2); assert.equal(calls.length, 2);
  const graph = new URL(calls[0].url);
  assert.equal(graph.origin, 'https://graph.facebook.com'); assert.equal(graph.pathname, `/v23.0/${mediaId}`);
  assert.deepEqual([...graph.searchParams], [['phone_number_id', mediaInput.phoneNumberId]]);
  assert.equal(calls[1].url, mediaUrl);
  for (const { init } of calls) {
    assert.equal(init.method, 'GET'); assert.equal(init.headers.authorization, `Bearer ${token}`);
    assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit'); assert.equal(init.cache, 'no-store'); assert.equal(init.referrerPolicy, 'no-referrer');
    assert.equal(init.body, undefined);
  }
  assert.deepEqual(result.bytes, mediaBytes); assert.equal(result.contentSha256, mediaSha256);
  assert.equal(result.sizeBytes, mediaBytes.byteLength); assert.equal(result.mediaType, 'image/png');
  assert.deepEqual(Object.keys(result).sort(), ['bytes', 'contentSha256', 'mediaType', 'sizeBytes']);
});

test('accepts numeric/string sizes and canonical hexadecimal/base64 SHA-256 while still verifying the bytes', async () => {
  for (const sha256 of [mediaSha256.toUpperCase(), Buffer.from(mediaSha256, 'hex').toString('base64')]) {
    const { downloader } = fixture({ fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse({ sha256, file_size: String(mediaBytes.byteLength) }) : binaryResponse() });
    const result = await downloader.download({ ...mediaInput, expectedSha256: null, expectedMimeType: null }, authorize);
    assert.equal(result.contentSha256, mediaSha256);
  }
});

test('rejects invalid configuration and non-canonical identifiers before authorization or network access', async () => {
  for (const options of [{ maximumBytes: 0 }, { maximumBytes: MAXIMUM_META_MEDIA_DOWNLOAD_BYTES + 1 }, { requestTimeoutMs: 0 }, { requestTimeoutMs: 60001 }, { unknown: true }]) {
    assert.throws(() => createMetaMediaDownloader(config, options), (error) => error.code === 'CONFIGURATION_INVALID');
  }
  assert.throws(() => createMetaMediaDownloader({ apiVersion: '../v23' }), (error) => error.code === 'CONFIGURATION_INVALID');
  for (const changed of [{ mediaId: '../1' }, { mediaId: ' 1' }, { mediaId: '0' }, { phoneNumberId: 'host.test' }, { phoneNumberId: '' }, { contentKind: 'text' }, { url: mediaUrl }]) {
    const { downloader, calls } = fixture();
    await rejects(downloader.download({ ...mediaInput, ...changed }, () => { assert.fail('Authorization was reached'); }), 'INVALID_INPUT');
    assert.equal(calls.length, 0);
  }
});

test('blocks unapproved hosts, credentials, redirects targets and ambiguous URLs before disclosing a binary token', async () => {
  for (const url of ['http://lookaside.fbsbx.com/whatsapp_business/attachments/', 'https://127.0.0.1/whatsapp_business/attachments/',
    'https://lookaside.fbsbx.com.evil.test/whatsapp_business/attachments/', 'https://evil.lookaside.fbsbx.com/whatsapp_business/attachments/',
    'https://user:pass@lookaside.fbsbx.com/whatsapp_business/attachments/', 'https://lookaside.fbsbx.com:444/whatsapp_business/attachments/',
    `${mediaUrl}#fragment`, `${mediaUrl}&access_token=secret`, `${mediaUrl}&ACCESS_TOKEN=secret`, `${mediaUrl}&mid=${mediaId}`,
    'https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=999999', 'https://lookaside.fbsbx.com/elsewhere',
    'https://lookaside.fbsbx.com/whatsapp_business/attachments/%2f', 'https://lookaside.fbsbx.com\\@evil.test/whatsapp_business/attachments/', 'not a URL']) {
    const { downloader, calls } = fixture({ fetchImplementation: () => metadataResponse({ url }) });
    let count = 0;
    await rejects(downloader.download(mediaInput, (operation) => { count++; return authorize(operation); }), 'URL_NOT_ALLOWED');
    assert.equal(calls.length, 1); assert.equal(count, 1);
  }
});

test('metadata identity, product, MIME, size and digest are checked before binary transfer', async () => {
  for (const changed of [{ id: '999999' }, { messaging_product: 'other' }, { sha256: 'x' }, { sha256: Buffer.alloc(33).toString('base64') },
    { file_size: 0 }, { file_size: -1 }, { file_size: 1.5 }, { file_size: '01' }, { file_size: '1e3' },
    { mime_type: 'image/png; arbitrary=true' }, { mime_type: 'image/png\r\nX: secret' }]) {
    const { downloader, calls } = fixture({ fetchImplementation: () => metadataResponse(changed) });
    await rejects(downloader.download(mediaInput, authorize), 'INVALID_METADATA'); assert.equal(calls.length, 1);
  }
});

test('rejects disagreement with captured digest, MIME or message kind', async () => {
  for (const changed of [{ expectedSha256: '0'.repeat(64) }, { expectedMimeType: 'image/jpeg' }, { contentKind: 'audio', expectedMimeType: null }]) {
    const { downloader, calls } = fixture();
    await rejects(downloader.download({ ...mediaInput, ...changed }, authorize), 'CONTENT_MISMATCH'); assert.equal(calls.length, 1);
  }
});

test('a declared size above the local limit blocks the binary GET', async () => {
  const { downloader, calls } = fixture({ maximumBytes: mediaBytes.byteLength - 1 });
  await rejects(downloader.download(mediaInput, authorize), 'TOO_LARGE'); assert.equal(calls.length, 1);
});

test('accepts chunked content without Content-Length only when exact byte count and digest match', async () => {
  const { downloader } = fixture({ fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse() : new Response(new ReadableStream({ start(controller) {
    controller.enqueue(mediaBytes.slice(0, 17)); controller.enqueue(mediaBytes.slice(17)); controller.close();
  } }), { headers: { 'content-type': 'image/png' } }) });
  assert.deepEqual((await downloader.download(mediaInput, authorize)).bytes, mediaBytes);
});

test('rejects a mismatching Content-Length before reading the body', async () => {
  let cancelled = 0;
  const { downloader } = fixture({ fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse() : new Response(new ReadableStream({ cancel() { cancelled++; } }),
    { headers: { 'content-type': 'image/png', 'content-length': String(mediaBytes.byteLength - 1) } }) });
  await rejects(downloader.download(mediaInput, authorize), 'CONTENT_MISMATCH'); assert.equal(cancelled, 1);
});

test('rejects truncated and overflowing streamed content even when the headers claim the expected size', async () => {
  for (const bytes of [mediaBytes.slice(0, -1), new Uint8Array(mediaBytes.byteLength + 1)]) {
    const { downloader } = fixture({ fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse() : binaryResponse(bytes, { 'content-length': String(mediaBytes.byteLength) }) });
    await rejects(downloader.download(mediaInput, authorize), 'CONTENT_MISMATCH');
  }
});

test('rejects same-size modified bytes by SHA-256', async () => {
  const changed = mediaBytes.slice(); changed[0] ^= 1;
  const { downloader } = fixture({ fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse() : binaryResponse(changed) });
  await rejects(downloader.download(mediaInput, authorize), 'CONTENT_MISMATCH');
});

test('rejects content encoding, content ranges and inconsistent content type', async () => {
  for (const headers of [{ 'content-type': 'text/html' }, { 'content-encoding': 'gzip' }, { 'content-range': `bytes 0-${mediaBytes.byteLength - 1}/${mediaBytes.byteLength}` }]) {
    const { downloader } = fixture({ fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse() : binaryResponse(undefined, headers) });
    await rejects(downloader.download(mediaInput, authorize), 'CONTENT_MISMATCH');
  }
});

test('binary HTTP rejection does not retry or expose provider response bodies', async () => {
  for (const status of [206, 302, 403, 404, 429, 500]) {
    const { downloader, calls } = fixture({ fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse() : new Response('private provider body', { status, headers: { 'retry-after': '60' } }) });
    await rejects(downloader.download(mediaInput, authorize), 'PROVIDER_REJECTED'); assert.equal(calls.length, 2);
  }
});

test('rejects a fetch adapter reporting a followed redirect or a different final URL', async () => {
  for (const property of [{ redirected: true }, { url: 'https://evil.test/secret' }]) {
    const { downloader } = fixture({ fetchImplementation: (_url, _init, count) => {
      if (count === 1) return metadataResponse();
      const response = binaryResponse();
      for (const [key, value] of Object.entries(property)) Object.defineProperty(response, key, { value });
      return response;
    } });
    await rejects(downloader.download(mediaInput, authorize), 'URL_NOT_ALLOWED');
  }
});

test('Graph API errors remain sanitized and stop before resolving a binary token', async () => {
  const { downloader, calls } = fixture({ fetchImplementation: () => Response.json({ error: { code: 190, message: `private provider body ${token}` } }, { status: 400 }) });
  await rejects(downloader.download(mediaInput, authorize), 'PROVIDER_REJECTED'); assert.equal(calls.length, 1);
});

test('metadata response size is bounded independently from binary size', async () => {
  const { downloader, calls } = fixture({ fetchImplementation: () => metadataResponse({ extra: 'a'.repeat(65536) }) });
  await rejects(downloader.download(mediaInput, authorize), 'INVALID_METADATA'); assert.equal(calls.length, 1);
});

test('the metadata deadline covers a fetch that ignores abort', async () => {
  let release;
  const { downloader, calls } = fixture({ requestTimeoutMs: 25, fetchImplementation: () => new Promise((resolve) => { release = resolve; }) });
  await rejects(downloader.download(mediaInput, authorize), 'TIMEOUT');
  release(metadataResponse()); await new Promise((resolve) => setImmediate(resolve)); assert.equal(calls.length, 1);
});

test('binary deadline covers a fetch that ignores abort and cancels its late response body', async () => {
  let release, cancelled = 0;
  const { downloader, calls } = fixture({ requestTimeoutMs: 25, fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse() : new Promise((resolve) => { release = resolve; }) });
  await rejects(downloader.download(mediaInput, authorize), 'TIMEOUT');
  release(new Response(new ReadableStream({ cancel() { cancelled++; } })));
  await new Promise((resolve) => setImmediate(resolve)); assert.equal(cancelled, 1); assert.equal(calls.length, 2);
});

test('binary deadline also covers a stalled body and a cancellation hook that never settles', async () => {
  let cancelled = 0;
  const { downloader } = fixture({ requestTimeoutMs: 25, fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse() : new Response(new ReadableStream({
    start(controller) { controller.enqueue(mediaBytes.slice(0, 1)); }, cancel() { cancelled++; return new Promise(() => {}); },
  }), { headers: { 'content-type': 'image/png' } }) });
  await rejects(downloader.download(mediaInput, authorize), 'TIMEOUT'); assert.equal(cancelled, 1);
});

test('body read failure is sanitized and cannot return partially downloaded content', async () => {
  const { downloader } = fixture({ fetchImplementation: (_url, _init, count) => count === 1 ? metadataResponse() : new Response(new ReadableStream({
    pull(controller) { controller.error(new Error(`private provider body ${token}`)); },
  }), { headers: { 'content-type': 'image/png' } }) });
  await rejects(downloader.download(mediaInput, authorize), 'NETWORK_ERROR');
});

test('a second authorization denial prevents the binary GET and preserves only a safe error', async () => {
  const { downloader, calls } = fixture(); let count = 0;
  await rejects(downloader.download(mediaInput, (operation) => {
    if (++count === 2) throw new MetaMediaDownloadError('AUTHORIZATION_CHANGED'); return authorize(operation);
  }), 'AUTHORIZATION_CHANGED'); assert.equal(calls.length, 1);
  await rejects(downloader.download(mediaInput, () => { throw new Error(`private provider body ${token}`); }), 'DEPENDENCY_UNAVAILABLE');
});

test('mutating input during metadata retrieval cannot select a different media ID or phone', async () => {
  const input = { ...mediaInput };
  const { downloader, calls } = fixture({ fetchImplementation: (_url, _init, count) => {
    if (count === 1) { input.mediaId = '999999'; input.phoneNumberId = '888888'; return metadataResponse(); }
    return binaryResponse();
  } });
  assert.deepEqual((await downloader.download(input, authorize)).bytes, mediaBytes);
  assert.equal(calls[1].url, mediaUrl);
});
