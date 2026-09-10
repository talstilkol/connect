import { inspectionIntent, inspectionReply } from './meta-media-inspection.mjs';
import { mediaBytes } from './meta-media.mjs';
import { deriveMetaMediaUploadJobKey } from '../../server/meta/metaMediaUploadJournal.ts';

// Reuses the existing isolated S3 protocol fixtures and real repository image.
// These responses are never deployment configuration or a live scan receipt.
export const mediaFileVersion = 's3-integration-version-1';
export async function mediaFileJob() {
  const intent = inspectionIntent();
  const descriptor = { ...intent }; delete descriptor.actor; delete descriptor.kmsKeyArn;
  return { jobKey: await deriveMetaMediaUploadJobKey(intent), intent, status: 'quarantined', version: 4, claimVersion: 2, expired: false,
    receipt: { ...descriptor, versionId: mediaFileVersion, state: 'quarantined' } };
}
export function mediaFileReply(command, intent = inspectionIntent(), versionId = mediaFileVersion, options = {}) {
  if (command.constructor.name !== 'GetObjectCommand') return inspectionReply(command, intent, options.scan ?? 'NO_THREATS_FOUND', versionId);
  const metadata = inspectionReply({ constructor: { name: 'HeadObjectCommand' } }, intent, 'NO_THREATS_FOUND', versionId);
  return { ...metadata, Body: { transformToWebStream() {
    return options.stream ?? new ReadableStream({ start(controller) { controller.enqueue(mediaBytes.slice()); controller.close(); } });
  } }, ...options.metadata };
}
