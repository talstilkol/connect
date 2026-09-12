import { S3Client, PutObjectCommand, GetObjectCommand, GetObjectTaggingCommand, ListObjectVersionsCommand,
  type HeadObjectCommandOutput, type ServiceInputTypes, type ServiceOutputTypes, type S3ClientResolvedConfig, type $Command } from "@aws-sdk/client-s3";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { deriveKnowledgeSourceKey } from "../ai/aiAgentKey.ts";
import { KNOWLEDGE_MAX_UPLOAD_BYTES, KnowledgeIngestionError } from "../ai/knowledgeUploadRequest.ts";
import { metaMediaQuarantineS3ClientConfiguration, verifyS3MetaMediaQuarantineBucket } from "./s3MetaMediaQuarantineStorage.ts";
import { hasRequiredKnowledgeQuarantineBucketPolicy } from "./s3KnowledgeQuarantinePolicy.ts";
import { KNOWLEDGE_QUARANTINE_PREFIX, type KnowledgeStorageConfiguration } from "./s3KnowledgeConfiguration.ts";
export interface KnowledgeObjectIntent {
  readonly tenantId: number; readonly sourceKey: string; readonly contentSha256: string;
  readonly sizeBytes: number; readonly mediaType: string; readonly bucket: string; readonly objectKey: string; readonly kmsKeyArn: string;
}
export type KnowledgeScanVerdict = "PENDING" | "NO_THREATS_FOUND" | "THREATS_FOUND" | "UNSUPPORTED" | "ACCESS_DENIED" | "FAILED";
export class KnowledgeStorageError extends Error {
  readonly code: "INVALID_INPUT" | "UNAVAILABLE" | "UNKNOWN" | "BLOCKED" | "MISMATCH";
  constructor(code: "INVALID_INPUT" | "UNAVAILABLE" | "UNKNOWN" | "BLOCKED" | "MISMATCH") { super(code); this.code=code; this.name = "KnowledgeStorageError"; }
}
function fail(code: KnowledgeStorageError["code"]): never { throw new KnowledgeStorageError(code); }
export function knowledgeObjectKey(tenantId: number, sourceKey: string) { return `${KNOWLEDGE_QUARANTINE_PREFIX}${tenantId}/${sourceKey}`; }
export function validKnowledgeObjectVersion(v: unknown): v is string {
  return typeof v === "string" && v !== "null" && v.length > 0 && v.length <= 1024 && !/[\u0000-\u0020\u007f]/.test(v);
}
function metadata(i: KnowledgeObjectIntent) { return { "connect-tenant": String(i.tenantId), "connect-source": i.sourceKey,
  "connect-content-sha256": i.contentSha256, "connect-media-type": i.mediaType }; }
function verifyHead(h: HeadObjectCommandOutput, i: KnowledgeObjectIntent, v: string) {
  const expected = metadata(i);
  if (h.$metadata.httpStatusCode !== 200 || h.VersionId !== v || h.DeleteMarker === true || h.ContentLength !== i.sizeBytes ||
    h.ChecksumSHA256 !== Buffer.from(i.contentSha256, "hex").toString("base64") || (h.ChecksumType !== undefined && h.ChecksumType !== "FULL_OBJECT") ||
    h.PartsCount !== undefined || h.ServerSideEncryption !== "aws:kms" || h.SSEKMSKeyId !== i.kmsKeyArn ||
    h.ContentType !== "application/octet-stream" || h.ContentDisposition !== "attachment" || h.CacheControl !== "no-store" ||
    (h.MissingMeta ?? 0) !== 0 || !h.Metadata || Object.keys(h.Metadata).length !== Object.keys(expected).length ||
    Object.entries(expected).some(([key, value]) => h.Metadata?.[key] !== value)) fail("MISMATCH");
}
export interface KnowledgeStorage {
  put(intent: KnowledgeObjectIntent, bytes: Uint8Array, authorize: () => Promise<void>): Promise<string>;
  inspect(intent: KnowledgeObjectIntent, versionId: string | null, authorize: () => Promise<void>): Promise<{ versionId: string; verdict: KnowledgeScanVerdict } | null>;
  read(intent: KnowledgeObjectIntent, versionId: string, authorize: () => Promise<void>): Promise<Uint8Array<ArrayBuffer>>;
  close(): void;
}
export function createS3KnowledgeStorage(config: KnowledgeStorageConfiguration,
  options: { client?: Pick<S3Client, "send">; timeoutMs?: number } = {}): KnowledgeStorage {
  config = Object.freeze({ ...config });
  const timeout = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60_000) fail("INVALID_INPUT");
  const owned = options.client ? null : new S3Client(metaMediaQuarantineS3ClientConfiguration(config));
  const client = options.client ?? owned!;
  const controllers = new Set<AbortController>(); let closed = false;
  async function request<T>(operation: (signal: AbortSignal) => Promise<T>, cancel?: () => void): Promise<T> {
    if (closed) fail("UNAVAILABLE");
    const controller = new AbortController(); controllers.add(controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { controller.abort(); cancel?.(); };
    try {
      return await Promise.race([operation(controller.signal), new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { stop(); reject(new KnowledgeStorageError("UNAVAILABLE")); }, timeout);
      })]);
    } finally { clearTimeout(timer); controllers.delete(controller); }
  }
  async function validate(i: KnowledgeObjectIntent, authorize: () => Promise<void>) {
    if (!i || !Number.isSafeInteger(i.tenantId) || i.tenantId < 1 || !/^[a-f0-9]{64}$/.test(i.contentSha256) ||
      i.sourceKey !== await deriveKnowledgeSourceKey(i.tenantId, i.contentSha256) || i.bucket !== config.bucket || i.kmsKeyArn !== config.kmsKeyArn ||
      i.objectKey !== knowledgeObjectKey(i.tenantId, i.sourceKey) || !Number.isSafeInteger(i.sizeBytes) || i.sizeBytes < 1 ||
      i.sizeBytes > KNOWLEDGE_MAX_UPLOAD_BYTES || !["text/plain", "text/markdown"].includes(i.mediaType)) fail("INVALID_INPUT");
    await authorize();
    await verifyS3MetaMediaQuarantineBucket(config, client, request, hasRequiredKnowledgeQuarantineBucketPolicy);
    await authorize();
  }
  async function send<I extends ServiceInputTypes, O extends ServiceOutputTypes>(cmd: $Command<I, O, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>,
    signal: AbortSignal, authorize: () => Promise<void>): Promise<O> {
    cmd.middlewareStack.add(next => async args => {
      await authorize(); if (signal.aborted || closed) fail("UNAVAILABLE"); return next(args);
    }, { step: "deserialize", priority: "low", name: "connectKnowledgeAuthorizeBeforeTransport" });
    await authorize(); if (signal.aborted || closed) fail("UNAVAILABLE");
    return client.send(cmd, { abortSignal: signal });
  }
  const target = { Bucket: config.bucket, ExpectedBucketOwner: config.accountId };
  async function tag(i: KnowledgeObjectIntent, versionId: string, authorize: () => Promise<void>): Promise<KnowledgeScanVerdict> {
    if (!validKnowledgeObjectVersion(versionId)) fail("INVALID_INPUT");
    const t = await request(s => send(new GetObjectTaggingCommand({ ...target, Key: i.objectKey, VersionId: versionId }), s, authorize));
    if (t.$metadata.httpStatusCode !== 200 || t.VersionId !== versionId || !Array.isArray(t.TagSet) || t.TagSet.length > 10 ||
      t.TagSet.some(t => typeof t.Key !== "string" || typeof t.Value !== "string") || new Set(t.TagSet.map(t => t.Key)).size !== t.TagSet.length) fail("UNKNOWN");
    const result = t.TagSet.find(t => t.Key === "GuardDutyMalwareScanStatus")?.Value;
    if (result === undefined) return "PENDING";
    if (!["NO_THREATS_FOUND", "THREATS_FOUND", "UNSUPPORTED", "ACCESS_DENIED", "FAILED"].includes(result)) fail("UNKNOWN");
    return result as KnowledgeScanVerdict;
  }
  return Object.freeze({
    async put(rawIntent, raw, authorize) {
      const i = Object.freeze({ ...rawIntent });
      const bytes = new Uint8Array(raw); let started = false;
      try {
        await validate(i, authorize);
        if (bytes.byteLength !== i.sizeBytes || await sha256Hex(bytes) !== i.contentSha256) fail("MISMATCH");
        const checksum = Buffer.from(i.contentSha256, "hex").toString("base64");
        started = true;
        const reply = await request(s => send(new PutObjectCommand({ ...target, Key: i.objectKey, Body: bytes,
          ContentLength: bytes.length, ContentType: "application/octet-stream", ContentDisposition: "attachment", CacheControl: "no-store",
          IfNoneMatch: "*", ChecksumAlgorithm: "SHA256", ChecksumSHA256: checksum, ServerSideEncryption: "aws:kms", SSEKMSKeyId: i.kmsKeyArn, Metadata: metadata(i) }), s, authorize));
        if (reply.$metadata.httpStatusCode !== 200 || !validKnowledgeObjectVersion(reply.VersionId) || reply.ChecksumSHA256 !== checksum ||
          reply.ServerSideEncryption !== "aws:kms" || reply.SSEKMSKeyId !== i.kmsKeyArn) fail("UNKNOWN");
        return reply.VersionId;
      } catch (e) { if (started) return fail("UNKNOWN"); throw e; } finally { bytes.fill(0); }
    },
    async inspect(rawIntent, known, authorize) {
      const i = Object.freeze({ ...rawIntent });
      try { await validate(i, authorize);
      let versionId = known;
      if (versionId === null) {
        const l = await request(s => send(new ListObjectVersionsCommand({ ...target, Prefix: i.objectKey, MaxKeys: 2 }), s, authorize));
        if (l.$metadata.httpStatusCode !== 200 || l.IsTruncated !== false || l.Name !== config.bucket || l.Prefix !== i.objectKey || l.MaxKeys !== 2 ||
          (l.DeleteMarkers?.length ?? 0) !== 0 || (l.Versions?.length ?? 0) > 1) fail("UNKNOWN");
        if (!l.Versions?.length) return null;
        const v = l.Versions[0];
        if (v.Key !== i.objectKey || v.Size !== i.sizeBytes || !validKnowledgeObjectVersion(v.VersionId)) fail("MISMATCH");
        versionId = v.VersionId;
      }
      return { versionId, verdict: await tag(i, versionId, authorize) };
      } catch (e) { if (e instanceof KnowledgeStorageError || e instanceof KnowledgeIngestionError) throw e; return fail("UNAVAILABLE"); }
    },
    async read(rawIntent, versionId, authorize) {
      const i = Object.freeze({ ...rawIntent });
      let stream: ReadableStreamDefaultReader<Uint8Array> | undefined, bytes: Uint8Array<ArrayBuffer> | undefined, success = false;
      const cancel = () => { try { void stream?.cancel().catch(() => {}); } catch {} };
      try {
        await validate(i, authorize);
        if (await tag(i, versionId, authorize) !== "NO_THREATS_FOUND") fail("BLOCKED");
        await request(async s => {
          const h = await send(new GetObjectCommand({ ...target, Key: i.objectKey, VersionId: versionId, ChecksumMode: "ENABLED" }), s, authorize);
          if (!h.Body || typeof h.Body.transformToWebStream !== "function") fail("MISMATCH");
          stream = h.Body.transformToWebStream().getReader();
          if (s.aborted || closed) { cancel(); fail("UNAVAILABLE"); }
          verifyHead(h, i, versionId);
          if (h.ContentRange !== undefined || h.WebsiteRedirectLocation !== undefined || (h.ContentEncoding !== undefined && h.ContentEncoding !== "identity")) fail("MISMATCH");
          bytes = new Uint8Array(i.sizeBytes); let offset = 0;
          while (true) {
            const chunk = await stream.read();
            if (s.aborted || closed) fail("UNAVAILABLE");
            if (chunk.done) break;
            if (!(chunk.value instanceof Uint8Array) || chunk.value.length === 0 || offset + chunk.value.length > bytes.length) fail("MISMATCH");
            bytes.set(chunk.value, offset); offset += chunk.value.length;
          }
          if (offset !== i.sizeBytes || await sha256Hex(bytes) !== i.contentSha256) fail("MISMATCH");
        }, cancel);
        if (await tag(i, versionId, authorize) !== "NO_THREATS_FOUND") fail("BLOCKED");
        await authorize(); if (closed) fail("UNAVAILABLE");
        success = true; return bytes!;
      } catch (e) { if (e instanceof KnowledgeStorageError || e instanceof KnowledgeIngestionError) throw e; return fail("UNAVAILABLE"); }
      finally { if (!success) { cancel(); bytes?.fill(0); } try { stream?.releaseLock(); } catch {} }
    },
    close() { closed = true; for (const c of controllers) c.abort(); owned?.destroy(); },
  } satisfies KnowledgeStorage);
}
