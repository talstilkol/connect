import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Binary tests use the repository's actual public PNG asset. Provider replies
// and IDs below are isolated transport fixtures, never application data.
export const mediaBytes = new Uint8Array(await readFile(new URL('../../public/og.png', import.meta.url)));
export const mediaSha256 = createHash('sha256').update(mediaBytes).digest('hex');
export const mediaId = '24230790383178626';
export const mediaUrl = `https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=${mediaId}&ext=1&hash=local-test-signature`;
export const mediaInput = { mediaId, phoneNumberId: '300003', contentKind: 'image', expectedSha256: mediaSha256, expectedMimeType: 'image/png' };
export function mediaMetadata(overrides = {}) {
  return { id: mediaId, messaging_product: 'whatsapp', url: mediaUrl, file_size: mediaBytes.byteLength, mime_type: 'image/png', sha256: mediaSha256, ...overrides };
}
export function metadataResponse(overrides = {}) { return Response.json(mediaMetadata(overrides)); }
export function binaryResponse(bytes = mediaBytes.slice(), headers = {}) {
  return new Response(bytes, { headers: { 'content-type': 'image/png', 'content-length': String(bytes.byteLength), ...headers } });
}
