import { S3Client, GetObjectTaggingCommand, HeadObjectCommand, ListObjectVersionsCommand,
  type HeadObjectCommandOutput, type ServiceOutputTypes, type ServiceInputTypes, type S3ClientResolvedConfig, type $Command } from "@aws-sdk/client-s3";
import { MetaMediaQuarantineError, type StoredMetaMediaQuarantine } from "../meta/metaMediaQuarantine.ts";
import { validateMetaMediaUploadIntent, type MetaMediaUploadIntent } from "../meta/metaMediaUploadJournal.ts";
import { META_MEDIA_SCAN_RESULTS, validMetaMediaObjectVersion, type MetaMediaInspector, type MetaMediaScanResult } from "../meta/metaMediaInspection.ts";
import { requireS3MetaMediaQuarantineConfiguration, type S3MetaMediaQuarantineEnvironment } from "./s3MetaMediaQuarantineConfiguration.ts";
import { metaMediaQuarantineS3ClientConfiguration, verifyS3MetaMediaQuarantineBucket, META_MEDIA_S3_REQUEST_TIMEOUT_MS } from "./s3MetaMediaQuarantineStorage.ts";

const fail = (code: MetaMediaQuarantineError["code"]): never => { throw new MetaMediaQuarantineError(code); };
export function verifiedS3MetaMediaReceipt(reply: HeadObjectCommandOutput, intent: MetaMediaUploadIntent, versionId: string): Readonly<StoredMetaMediaQuarantine> {
  const expectedMetadata = { "connect-tenant": String(intent.tenantId), "connect-generation": String(intent.connectionVersion),
    "connect-message": intent.messageKey, "connect-source-sha256": intent.sourceSha256, "connect-content-sha256": intent.contentSha256,
    "connect-media-type": intent.mediaType };
  if (reply.$metadata.httpStatusCode !== 200 || reply.VersionId !== versionId || reply.DeleteMarker === true ||
    reply.ContentLength !== intent.sizeBytes || reply.ChecksumSHA256 !== Buffer.from(intent.contentSha256, "hex").toString("base64") ||
    (reply.ChecksumType !== undefined && reply.ChecksumType !== "FULL_OBJECT") || reply.PartsCount !== undefined ||
    reply.ServerSideEncryption !== "aws:kms" || reply.SSEKMSKeyId !== intent.kmsKeyArn ||
    reply.ContentType !== "application/octet-stream" || reply.ContentDisposition !== "attachment" || reply.CacheControl !== "no-store" ||
    (reply.MissingMeta ?? 0) !== 0 || !reply.Metadata || Object.keys(reply.Metadata).length !== Object.keys(expectedMetadata).length ||
    Object.entries(expectedMetadata).some(([key, value]) => reply.Metadata?.[key] !== value)) return fail("CONTENT_MISMATCH");
  return Object.freeze({ tenantId: intent.tenantId, connectionVersion: intent.connectionVersion, messageKey: intent.messageKey,
    sourceSha256: intent.sourceSha256, contentSha256: intent.contentSha256, sizeBytes: intent.sizeBytes, mediaType: intent.mediaType,
    bucket: intent.bucket, objectKey: intent.objectKey, versionId, state: "quarantined" });
}

// Use a separate IAM read/reconciliation role in deployment. This adapter
// cannot upload, change tags, delete objects or retrieve object bodies.
export function createS3MetaMediaInspector(environment: S3MetaMediaQuarantineEnvironment,
  options: Readonly<{ client?: Pick<S3Client, "send">; requestTimeoutMs?: number }> = {}) {
  const config = requireS3MetaMediaQuarantineConfiguration(environment);
  const timeoutMs = options.requestTimeoutMs ?? META_MEDIA_S3_REQUEST_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000 ||
    Object.keys(options).some((key) => !["client", "requestTimeoutMs"].includes(key))) return fail("CONFIGURATION_INVALID");
  const ownedClient = options.client ? undefined : new S3Client(metaMediaQuarantineS3ClientConfiguration(config));
  const client = options.client ?? ownedClient!;
  const target = Object.freeze({ Bucket: config.bucket, ExpectedBucketOwner: config.accountId });
  let active = false;
  async function request<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new MetaMediaQuarantineError("DEPENDENCY_UNAVAILABLE")); }, timeoutMs);
    });
    try { return await Promise.race([operation(controller.signal), deadline]); }
    finally { clearTimeout(timer); }
  }
  const inspector: MetaMediaInspector = Object.freeze({
    async inspect(raw, knownVersionId, authorize) {
      if (active) return fail("IN_PROGRESS");
      active = true;
      try {
        const intent = validateMetaMediaUploadIntent(raw);
        if (intent.bucket !== config.bucket || intent.kmsKeyArn !== config.kmsKeyArn ||
          (knownVersionId !== null && !validMetaMediaObjectVersion(knownVersionId)) || typeof authorize !== "function") return fail("INVALID_INPUT");
        const check = async () => { try { await authorize(); } catch { return fail("AUTHORIZATION_CHANGED"); } };
        await check(); await verifyS3MetaMediaQuarantineBucket(config, client, request); await check();
        async function read<Input extends ServiceInputTypes, Output extends ServiceOutputTypes>(
          command: $Command<Input, Output, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>): Promise<Output> {
          await check();
          return request(async (signal) => {
            // Credentials/signing can await after send(); authorization and
            // the timeout are checked again at the final transport boundary.
            command.middlewareStack.add((next) => async (args) => {
              await check(); if (signal.aborted) return fail("DEPENDENCY_UNAVAILABLE"); return next(args);
            }, { step: "deserialize", priority: "low", name: "connectMediaAuthorizeBeforeInspection" });
            return client.send(command, { abortSignal: signal });
          });
        }
        let versionId = knownVersionId;
        if (versionId === null) {
          const listing = await read(new ListObjectVersionsCommand({ ...target, Prefix: intent.objectKey, MaxKeys: 2 }));
          if (!("IsTruncated" in listing) || listing.$metadata.httpStatusCode !== 200 || listing.IsTruncated !== false ||
            listing.Name !== config.bucket || listing.Prefix !== intent.objectKey || listing.MaxKeys !== 2 ||
            (listing.DeleteMarkers?.length ?? 0) !== 0 || (listing.Versions?.length ?? 0) > 1) return fail("OUTCOME_UNKNOWN");
          const versions = listing.Versions ?? [];
          if (versions.length === 0) return null;
          if (versions[0].Key !== intent.objectKey || versions[0].Size !== intent.sizeBytes || !validMetaMediaObjectVersion(versions[0].VersionId)) return fail("CONTENT_MISMATCH");
          versionId = versions[0].VersionId;
        }
        const object = { ...target, Key: intent.objectKey, VersionId: versionId };
        async function scanTag(): Promise<MetaMediaScanResult> {
          const tags = await read(new GetObjectTaggingCommand(object));
          if (!("TagSet" in tags) || tags.$metadata.httpStatusCode !== 200 || tags.VersionId !== versionId || !Array.isArray(tags.TagSet) || tags.TagSet.length > 10 ||
            tags.TagSet.some((tag) => typeof tag.Key !== "string" || typeof tag.Value !== "string") ||
            new Set(tags.TagSet.map((tag) => tag.Key)).size !== tags.TagSet.length) return fail("OUTCOME_UNKNOWN");
          const verdict = tags.TagSet.find((tag) => tag.Key === "GuardDutyMalwareScanStatus")?.Value;
          if (verdict === undefined) return "PENDING";
          if (!META_MEDIA_SCAN_RESULTS.includes(verdict as MetaMediaScanResult) || verdict === "PENDING") return fail("OUTCOME_UNKNOWN");
          return verdict as MetaMediaScanResult;
        }
        const result = await scanTag();
        if (result !== "NO_THREATS_FOUND") return Object.freeze({ versionId, result, receipt: null });
        // HEAD is subject to the same S3 read deny as GET: never attempt it
        // until the protected tag reports clean. No quarantine exception.
        const head = await read(new HeadObjectCommand({ ...object, ChecksumMode: "ENABLED" }));
        const receipt = verifiedS3MetaMediaReceipt(head, intent, versionId);
        const confirmed = await scanTag();
        // A changed result is retained as a blocking fact; no stale clean
        // observation or upload-recovery receipt is emitted.
        return Object.freeze({ versionId, result: confirmed, receipt: confirmed === "NO_THREATS_FOUND" ? receipt : null });
      } catch (error) {
        if (error instanceof MetaMediaQuarantineError) throw error;
        return fail("DEPENDENCY_UNAVAILABLE");
      } finally { active = false; }
    },
  } satisfies MetaMediaInspector);
  return Object.freeze({ ...inspector, close() { ownedClient?.destroy(); } });
}
