import { S3Client, HeadObjectCommand, ListObjectVersionsCommand } from "@aws-sdk/client-s3";
import { MetaMediaRetentionError, type MetaMediaRetentionInspection } from "../operations/metaMediaRetention.ts";
import { validateMetaMediaUploadIntent, type MetaMediaUploadIntent } from "../meta/metaMediaUploadJournal.ts";
import { validMetaMediaObjectVersion } from "../meta/metaMediaInspection.ts";
import { requireS3MetaMediaQuarantineConfiguration, type S3MetaMediaQuarantineEnvironment } from "./s3MetaMediaQuarantineConfiguration.ts";
import { metaMediaQuarantineS3ClientConfiguration, verifyS3MetaMediaQuarantineBucket } from "./s3MetaMediaQuarantineStorage.ts";

// This private read role needs ListBucketVersions and GetObjectVersion, in
// addition to bucket checks. It never reads bytes or sends a mutation.
export function createS3MetaMediaRetentionInspection(environment: S3MetaMediaQuarantineEnvironment,
  options: { client?: Pick<S3Client, "send">; requestTimeoutMs?: number } = {}): MetaMediaRetentionInspection & { close(): void } {
  const config = requireS3MetaMediaQuarantineConfiguration(environment), timeout = options.requestTimeoutMs ?? 30_000;
  const fail = (): never => { throw new MetaMediaRetentionError("CONFLICT"); };
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60_000 || Object.keys(options).some(k => !["client", "requestTimeoutMs"].includes(k))) fail();
  const owned = options.client ? undefined : new S3Client(metaMediaQuarantineS3ClientConfiguration(config)), client = options.client ?? owned!;
  let closed = false, active = false;
  const pending = new Set<AbortController>();
  async function request<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (closed) fail();
    const controller = new AbortController(); pending.add(controller); let timer: ReturnType<typeof setTimeout> | undefined;
    const operation = Promise.resolve().then(() => { if (closed || controller.signal.aborted) fail(); return work(controller.signal); });
    void operation.then(() => pending.delete(controller), () => pending.delete(controller));
    const deadline = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { controller.abort(); reject(new MetaMediaRetentionError("CONFLICT")); }, timeout); });
    try { return await Promise.race([operation, deadline]); } finally { clearTimeout(timer); }
  }
  async function run<T>(raw: MetaMediaUploadIntent, authorize: () => Promise<void>, work: (intent: MetaMediaUploadIntent, check: () => Promise<void>) => Promise<T>) {
    if (closed || active || pending.size) fail(); active = true;
    try {
      const intent = validateMetaMediaUploadIntent(raw);
      if (intent.bucket !== config.bucket || intent.kmsKeyArn !== config.kmsKeyArn || typeof authorize !== "function") fail();
      const check = async () => { if (closed) fail(); await authorize(); };
      await check(); await verifyS3MetaMediaQuarantineBucket(config, client, request); await check();
      const result = await work(intent, check); await check(); return result;
    } finally { active = false; }
  }
  return Object.freeze({
    async verify(raw, versionId, authorize) {
      if (!validMetaMediaObjectVersion(versionId)) fail();
      await run(raw, authorize, async (intent, check) => {
        const command = new HeadObjectCommand({ Bucket: config.bucket, Key: intent.objectKey, VersionId: versionId, ExpectedBucketOwner: config.accountId });
        const result = await request(async signal => {
          command.middlewareStack.add(next => async args => { await check(); if (signal.aborted) fail(); return next(args); },
            { step: "deserialize", priority: "low", name: "connectMediaRetentionBeforeHead" });
          await check(); if (signal.aborted) fail(); return client.send(command, { abortSignal: signal });
        });
        const metadata = { "connect-tenant": String(intent.tenantId), "connect-generation": String(intent.connectionVersion), "connect-message": intent.messageKey,
          "connect-source-sha256": intent.sourceSha256, "connect-content-sha256": intent.contentSha256, "connect-media-type": intent.mediaType };
        if (result.$metadata.httpStatusCode !== 200 || result.DeleteMarker === true || result.VersionId !== versionId || result.ContentLength !== intent.sizeBytes ||
          result.ServerSideEncryption !== "aws:kms" || result.SSEKMSKeyId !== intent.kmsKeyArn || Object.entries(metadata).some(([k, v]) => result.Metadata?.[k] !== v)) fail();
        // Metadata proves the version's recorded binding, not scan cleanliness
        // or a rehash of its bytes. This evidence authorizes removal only.
      });
    },
    async versions(raw, authorize) {
      return run(raw, authorize, async (intent, check) => {
        const ids = new Set<string>(), cursors = new Set<string>(); let keyMarker: string | undefined, versionMarker: string | undefined;
        for (let page = 0; page < 10; page++) {
          const command = new ListObjectVersionsCommand({ Bucket: config.bucket, Prefix: intent.objectKey, MaxKeys: 100,
            ExpectedBucketOwner: config.accountId, ...(keyMarker ? { KeyMarker: keyMarker, VersionIdMarker: versionMarker } : {}) });
          const result = await request(async signal => {
            command.middlewareStack.add(next => async args => { await check(); if (signal.aborted) fail(); return next(args); },
              { step: "deserialize", priority: "low", name: "connectMediaRetentionBeforeVersions" });
            await check(); if (signal.aborted) fail(); return client.send(command, { abortSignal: signal });
          });
          if (result.$metadata.httpStatusCode !== 200 || typeof result.IsTruncated !== "boolean" ||
            (result.Versions?.length ?? 0) + (result.DeleteMarkers?.length ?? 0) > 100) fail();
          for (const entry of result.Versions ?? []) {
            if (entry.Key !== intent.objectKey) continue;
            if (!validMetaMediaObjectVersion(entry.VersionId)) fail(); ids.add(entry.VersionId!);
          }
          if (!result.IsTruncated) return Object.freeze([...ids].sort());
          const nextKey = result.NextKeyMarker, nextVersion = result.NextVersionIdMarker;
          if (typeof nextKey !== "string" || !nextKey.startsWith(intent.objectKey) || !validMetaMediaObjectVersion(nextVersion)) fail();
          const cursor = JSON.stringify([nextKey, nextVersion]); if (cursors.has(cursor)) fail(); cursors.add(cursor);
          keyMarker = nextKey; versionMarker = nextVersion;
        }
        // Never present a partial inventory as complete.
        return fail();
      });
    },
    close() { closed = true; for (const c of pending) c.abort(); owned?.destroy(); },
  } satisfies MetaMediaRetentionInspection & { close(): void });
}
