import { MetaMediaUploadJournalError, storeMetaMediaWithJournal, metaMediaUploadObjectKey, deriveMetaMediaUploadJobKey, mediaUploadReceiptMatches, type MetaMediaUploadJournal } from "./metaMediaUploadJournal.ts";
import type { TenantMembershipRepository } from "../../db/tenantMembershipRepository.ts";
import { requireTenantPermission, resolveTenantSessionFromMemberships, TenantSessionError, type TenantSession } from "../auth/tenantSession.ts";
import type { BoundMetaHistoryMedia, MetaHistoryMediaSource } from "./metaHistoryMediaBinding.ts";
import type { MetaCredentialVault } from "./metaPorts.ts";
import { MetaCredentialVaultError } from "./metaCredentialVault.ts";
import { MetaMediaDownloadError, type DownloadedMetaMedia, type MetaMediaDownloader, type MetaMediaDownloadInput } from "./metaMediaDownload.ts";
import { sha256Hex } from "./metaWebhookSecurity.ts";
import { MetaMediaQuarantineError, type MetaMediaQuarantineStorage } from "./metaMediaQuarantine.ts";

function safeError(error: unknown): MetaMediaDownloadError | MetaMediaQuarantineError | MetaMediaUploadJournalError {
  if (error instanceof MetaMediaUploadJournalError) return error;
  if (error instanceof MetaMediaQuarantineError) return error;
  if (error instanceof MetaMediaDownloadError) return error;
  if (error instanceof TenantSessionError || (error instanceof MetaCredentialVaultError &&
    ["CREDENTIAL_NOT_FOUND", "AUTHORIZATION_CHANGED"].includes(error.code))) return new MetaMediaDownloadError("AUTHORIZATION_CHANGED");
  return new MetaMediaDownloadError("DEPENDENCY_UNAVAILABLE");
}

export function createMetaHistoryMediaAcquisition(dependencies: Readonly<{
  media: MetaHistoryMediaSource;
  memberships: Pick<TenantMembershipRepository, "findActiveByExternalUserId">;
  credentials: Pick<MetaCredentialVault, "withAccessToken">;
  downloader: MetaMediaDownloader;
  quarantine?: MetaMediaQuarantineStorage;
  uploadJournal?: MetaMediaUploadJournal;
  uploadTarget?: Readonly<{ bucket: string; kmsKeyArn: string }>;
  authorizeWork?: (bound: Readonly<BoundMetaHistoryMedia>) => Promise<void>;
}>) {
  // One active acquisition per service instance bounds memory. Production
  // scheduling and durable claims are owned by the separate media Worker.
  let active = false;
  async function acquire<T>(rawSession: TenantSession, rawMessageKey: string,
    consume: (downloaded: Readonly<DownloadedMetaMedia>, bound: Readonly<BoundMetaHistoryMedia>, requireCurrent: () => Promise<void>, actor: string) => Promise<T>,
    wipeOnSuccess = false,
    resume?: (bound: Readonly<BoundMetaHistoryMedia>, requireCurrent: () => Promise<void>, actor: string) => Promise<{ value: T } | null>) {
    let downloaded: Readonly<DownloadedMetaMedia> | undefined;
    if (active) throw new MetaMediaDownloadError("IN_PROGRESS");
    active = true;
    try {
      const session = Object.freeze({ ...rawSession }), messageKey = rawMessageKey;
      requireTenantPermission(session, "workspace.manage");
      if (!Number.isSafeInteger(session.tenantId) || session.tenantId <= 0 || typeof session.externalUserId !== "string" ||
        session.externalUserId.trim().length === 0 || typeof messageKey !== "string" || !/^message_v1_[0-9a-f]{64}$/.test(messageKey)) throw new MetaMediaDownloadError("INVALID_INPUT");
      const requireMembership = async () => {
        const memberships = await dependencies.memberships.findActiveByExternalUserId(session.externalUserId);
        requireTenantPermission(resolveTenantSessionFromMemberships({ externalUserId: session.externalUserId }, memberships, session.tenantId), "workspace.manage");
      };
      await requireMembership();
      const bound = await dependencies.media.readBoundMedia(session.tenantId, messageKey);
      if (bound === null || bound.scope.tenantId !== session.tenantId || bound.messageKey !== messageKey) throw new MetaMediaDownloadError("AUTHORIZATION_CHANGED");
      const snapshot = JSON.stringify(bound);
      await dependencies.authorizeWork?.(bound);
      const content = bound.media.content as Record<string, unknown>;
      const original = bound.message.content !== null && typeof bound.message.content === "object" && !Array.isArray(bound.message.content)
        ? bound.message.content as Record<string, unknown> : {};
      const input: MetaMediaDownloadInput = Object.freeze({ mediaId: content.id as string, phoneNumberId: bound.scope.phoneNumberId,
        contentKind: bound.media.contentKind, expectedSha256: (content.sha256 ?? original.sha256 ?? null) as string | null,
        expectedMimeType: (content.mime_type ?? original.mime_type ?? null) as string | null });
      const requireCurrent = async () => {
        const current = await dependencies.media.readBoundMedia(session.tenantId, messageKey);
        if (current === null || JSON.stringify(current) !== snapshot) throw new MetaMediaDownloadError("AUTHORIZATION_CHANGED");
        await dependencies.authorizeWork?.(current);
        await requireMembership();
      };
      if (resume) {
        const replay = await resume(bound, requireCurrent, session.externalUserId);
        if (replay !== null) return replay.value;
      }
      downloaded = await dependencies.downloader.download(input, async (operation) => {
        try {
          return await dependencies.credentials.withAccessToken(session.tenantId, async (token) => {
            // Recheck message and actor after the vault's decryption wait,
            // before each GET. Preserve denial semantics across transport.
            await requireCurrent();
            return operation(token);
          });
        } catch (error) { throw safeError(error); }
      });
      await requireCurrent();
      return await consume(downloaded, bound, requireCurrent, session.externalUserId);
    } catch (error) {
      downloaded?.bytes.fill(0);
      throw safeError(error);
    } finally { if (wipeOnSuccess) downloaded?.bytes.fill(0); active = false; }
  }
  return Object.freeze({
    download(session: TenantSession, messageKey: string) {
      return acquire(session, messageKey, async (downloaded, bound) =>
        Object.freeze({ ...downloaded, scope: bound.scope, messageKey: bound.messageKey, quarantineRequired: true as const }));
    },
    async downloadAndQuarantine(session: TenantSession, messageKey: string) {
      const storage = dependencies.quarantine;
      if (!storage) throw new MetaMediaQuarantineError("CONFIGURATION_INVALID");
      return acquire(session, messageKey, async (downloaded, bound, requireCurrent, actor) => {
        const sourceSha256 = await sha256Hex(new TextEncoder().encode(JSON.stringify(bound)));
        const input = Object.freeze({ ...downloaded, tenantId: bound.scope.tenantId,
          connectionVersion: bound.scope.connectionVersion, messageKey: bound.messageKey, sourceSha256 });
        if (Boolean(dependencies.uploadJournal) !== Boolean(dependencies.uploadTarget)) throw new MetaMediaUploadJournalError("INVALID_INPUT");
        const receipt = dependencies.uploadJournal && dependencies.uploadTarget
          ? await storeMetaMediaWithJournal({ journal: dependencies.uploadJournal, storage },
            { tenantId: input.tenantId, connectionVersion: input.connectionVersion, messageKey: input.messageKey, sourceSha256,
              contentSha256: input.contentSha256, mediaType: input.mediaType, sizeBytes: input.sizeBytes, actor,
              ...dependencies.uploadTarget, objectKey: metaMediaUploadObjectKey(input) }, input, requireCurrent)
          : await storage.store(input, requireCurrent);
        await requireCurrent();
        return receipt;
      }, true, async (bound, requireCurrent, actor) => {
        const journal = dependencies.uploadJournal, target = dependencies.uploadTarget;
        if (Boolean(journal) !== Boolean(target)) throw new MetaMediaUploadJournalError("INVALID_INPUT");
        if (!journal || !target) return null;
        const sourceSha256 = await sha256Hex(new TextEncoder().encode(JSON.stringify(bound)));
        const jobKey = await deriveMetaMediaUploadJobKey({ tenantId: bound.scope.tenantId, connectionVersion: bound.scope.connectionVersion,
          messageKey: bound.messageKey, sourceSha256 });
        const job = await journal.lookup(jobKey, bound.scope.tenantId, actor);
        if (job === null) return null;
        if (job.jobKey !== jobKey || job.intent.tenantId !== bound.scope.tenantId || job.intent.connectionVersion !== bound.scope.connectionVersion ||
          job.intent.messageKey !== bound.messageKey || job.intent.sourceSha256 !== sourceSha256 || job.intent.actor !== actor ||
          job.intent.bucket !== target.bucket || job.intent.kmsKeyArn !== target.kmsKeyArn) throw new MetaMediaUploadJournalError("CONFLICT");
        if (job.status === "quarantined") {
          if (!job.receipt || !mediaUploadReceiptMatches(job.receipt, job.intent)) throw new MetaMediaUploadJournalError("CONFLICT");
          await requireCurrent(); return { value: job.receipt };
        }
        if (["claimed","dispatching"].includes(job.status) && !job.expired) throw new MetaMediaUploadJournalError("IN_PROGRESS");
        if (["dispatching","reconciliation-required","rejected"].includes(job.status)) throw new MetaMediaUploadJournalError("RECOVERY_REQUIRED");
        return null;
      });
    },
  });
}
