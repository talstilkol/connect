import { parseMetaMediaInspectionRetryInput, type MetaMediaInspectionRetryInput } from './metaMediaInspectionRetry.ts';
export const META_MEDIA_CLEANUP_OPERATION = 'meta.media-cleanup.request';
export const metaMediaCleanupStates = ['pending','running','removed','recovery-required','cancelled'] as const;
export type MetaMediaCleanupState = typeof metaMediaCleanupStates[number];
export interface MetaMediaCleanupInput extends MetaMediaInspectionRetryInput { readonly confirm: 'remove-quarantined-copy' }
export type MetaMediaCleanupRequestStatus = 'queued'|'already-requested'|'permission-denied'|'conflict'|'invalid-request'|'configuration-required'|'server-error';
export function parseMetaMediaCleanupInput(raw: unknown): Readonly<MetaMediaCleanupInput>|null {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join(',')!=='confirm,expectedVersion,jobKey')return null;
  const value=raw as MetaMediaCleanupInput,identity=parseMetaMediaInspectionRetryInput({jobKey:value.jobKey,expectedVersion:value.expectedVersion});
  return identity&&value.confirm==='remove-quarantined-copy'?Object.freeze({...identity,confirm:value.confirm}):null;
}
