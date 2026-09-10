import { S3Client, GetObjectCommand, GetObjectTaggingCommand, type ServiceInputTypes, type ServiceOutputTypes,
  type S3ClientResolvedConfig, type $Command } from "@aws-sdk/client-s3";
import { MetaMediaFileReadError, type MetaMediaFileReader } from "../meta/metaMediaFileRead.ts";
import { META_MEDIA_SCAN_RESULTS, validMetaMediaObjectVersion, type MetaMediaScanResult } from "../meta/metaMediaInspection.ts";
import { validateMetaMediaUploadIntent } from "../meta/metaMediaUploadJournal.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { MetaMediaQuarantineError } from "../meta/metaMediaQuarantine.ts";
import { requireS3MetaMediaQuarantineConfiguration, type S3MetaMediaQuarantineEnvironment } from "./s3MetaMediaQuarantineConfiguration.ts";
import { verifiedS3MetaMediaReceipt } from "./s3MetaMediaInspector.ts";
import { META_MEDIA_S3_REQUEST_TIMEOUT_MS, metaMediaQuarantineS3ClientConfiguration, verifyS3MetaMediaQuarantineBucket } from "./s3MetaMediaQuarantineStorage.ts";

const fail = (code: MetaMediaFileReadError["code"]): never => { throw new MetaMediaFileReadError(code); };
// A separate reader IAM role must stay subject to the quarantine bucket deny.
// This adapter only reads an already recorded, explicit object version. Bytes
// remain private until the entire body, post-read tag and authorization pass.
export function createS3MetaMediaFileReader(environment: S3MetaMediaQuarantineEnvironment,
  options: Readonly<{ client?: Pick<S3Client, "send">; requestTimeoutMs?: number }> = {}) {
  const config = requireS3MetaMediaQuarantineConfiguration(environment);
  const timeoutMs = options.requestTimeoutMs ?? META_MEDIA_S3_REQUEST_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000 ||
    Object.keys(options).some((key) => !["client", "requestTimeoutMs"].includes(key))) return fail("INVALID_INPUT");
  const ownedClient = options.client ? undefined : new S3Client(metaMediaQuarantineS3ClientConfiguration(config));
  const client = options.client ?? ownedClient!;
  const target = Object.freeze({ Bucket: config.bucket, ExpectedBucketOwner: config.accountId });
  let active = false, closed = false;
  let readSignal: AbortSignal | undefined;
  const requests = new Set<AbortController>();
  async function request<T>(operation: (signal: AbortSignal) => Promise<T>, cancel?: () => void): Promise<T> {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    const parent = readSignal;
    let abort: () => void = () => {};
    const deadline = new Promise<never>((_resolve, reject) => {
      abort = () => { controller.abort(); cancel?.(); reject(new MetaMediaFileReadError("DEPENDENCY_UNAVAILABLE")); };
      timer = setTimeout(abort, timeoutMs);
    });
    requests.add(controller);
    parent?.addEventListener("abort", abort, { once: true });
    controller.signal.addEventListener("abort", abort, { once: true });
    try {
      if (parent?.aborted || closed) { abort(); return await deadline; }
      return await Promise.race([operation(controller.signal), deadline]);
    } finally {
      clearTimeout(timer); parent?.removeEventListener("abort", abort);
      controller.signal.removeEventListener("abort", abort); controller.abort(); requests.delete(controller);
    }
  }
  const reader: MetaMediaFileReader = Object.freeze({
    async read(raw, versionId, authorize, observe, signal) {
      if (closed) return fail("DEPENDENCY_UNAVAILABLE");
      if (active) return fail("IN_PROGRESS");
      active = true;
      readSignal = signal;
      let bytes: Uint8Array<ArrayBuffer> | undefined, stream: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let succeeded = false;
      const cancel = () => { try { void stream?.cancel().catch(() => {}); } catch {} };
      const check = async (signal?: AbortSignal) => {
        if (closed || readSignal?.aborted || signal?.aborted) return fail("DEPENDENCY_UNAVAILABLE");
        await authorize();
        if (closed || readSignal?.aborted || signal?.aborted) return fail("DEPENDENCY_UNAVAILABLE");
      };
      try {
        const intent = validateMetaMediaUploadIntent(raw);
        if (intent.bucket !== config.bucket || intent.kmsKeyArn !== config.kmsKeyArn || !validMetaMediaObjectVersion(versionId) ||
          typeof authorize !== "function" || typeof observe !== "function") return fail("INVALID_INPUT");
        await check(); await verifyS3MetaMediaQuarantineBucket(config, client, request); await check();
        const object = { ...target, Key: intent.objectKey, VersionId: versionId };
        async function send<Input extends ServiceInputTypes, Output extends ServiceOutputTypes>(
          command: $Command<Input, Output, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>, signal: AbortSignal): Promise<Output> {
          await check(signal);
          command.middlewareStack.add((next) => async (args) => {
            // Runs after asynchronous credential resolution/signing, before I/O.
            await check(signal); return next(args);
          }, { step: "deserialize", priority: "low", name: "connectMediaAuthorizeBeforeFileRead" });
          return client.send(command, { abortSignal: signal });
        }
        async function scanTag(): Promise<MetaMediaScanResult> {
          return request(async (signal) => {
            const tags = await send(new GetObjectTaggingCommand(object), signal);
            if (signal.aborted) return fail("DEPENDENCY_UNAVAILABLE");
            if (tags.$metadata.httpStatusCode !== 200 || tags.VersionId !== versionId || !Array.isArray(tags.TagSet) || tags.TagSet.length > 10 ||
              tags.TagSet.some((tag) => typeof tag.Key !== "string" || typeof tag.Value !== "string") ||
              new Set(tags.TagSet.map((tag) => tag.Key)).size !== tags.TagSet.length) return fail("NOT_READY");
            const result = tags.TagSet.find((tag) => tag.Key === "GuardDutyMalwareScanStatus")?.Value;
            if (result === undefined) return "PENDING";
            if (result === "PENDING" || !META_MEDIA_SCAN_RESULTS.includes(result as MetaMediaScanResult)) return fail("NOT_READY");
            return result as MetaMediaScanResult;
          });
        }
        const first = await scanTag();
        if (first !== "NO_THREATS_FOUND") {
          await observe(Object.freeze({ versionId, result: first, receipt: null })); return fail("NOT_READY");
        }
        const receipt = await request(async (signal) => {
          const reply = await send(new GetObjectCommand({ ...object, ChecksumMode: "ENABLED" }), signal);
          // Acquire the body so that every rejection, including a late response
          // from a transport that ignored abort, can cancel the stream.
          if (!reply.Body || typeof reply.Body.transformToWebStream !== "function") return fail("CONTENT_MISMATCH");
          stream = reply.Body.transformToWebStream().getReader();
          if (signal.aborted) { cancel(); return fail("DEPENDENCY_UNAVAILABLE"); }
          if (reply.ContentRange !== undefined || (reply.ContentEncoding !== undefined && reply.ContentEncoding !== "identity") ||
            reply.WebsiteRedirectLocation !== undefined) return fail("CONTENT_MISMATCH");
          const verified = verifiedS3MetaMediaReceipt(reply, intent, versionId);
          await check(signal);
          bytes = new Uint8Array(intent.sizeBytes);
          let offset = 0;
          while (true) {
            const chunk = await stream.read();
            if (signal.aborted || closed) return fail("DEPENDENCY_UNAVAILABLE");
            if (chunk.done) break;
            if (!(chunk.value instanceof Uint8Array) || chunk.value.byteLength === 0 || offset + chunk.value.byteLength > intent.sizeBytes) return fail("CONTENT_MISMATCH");
            bytes.set(chunk.value, offset); offset += chunk.value.byteLength;
          }
          if (offset !== intent.sizeBytes || await sha256Hex(bytes) !== intent.contentSha256) return fail("CONTENT_MISMATCH");
          if (signal.aborted || closed) return fail("DEPENDENCY_UNAVAILABLE");
          return verified;
        }, () => { cancel(); bytes?.fill(0); });
        const last = await scanTag();
        await observe(Object.freeze({ versionId, result: last, receipt: last === "NO_THREATS_FOUND" ? receipt : null }));
        if (last !== "NO_THREATS_FOUND") return fail("NOT_READY");
        await check();
        succeeded = true;
        return bytes!;
      } catch (error) {
        if (error instanceof MetaMediaFileReadError) throw error;
        // The service normalizes known quarantine errors from metadata checks.
        if (error instanceof MetaMediaQuarantineError) throw error;
        return fail("DEPENDENCY_UNAVAILABLE");
      } finally {
        if (!succeeded) { cancel(); bytes?.fill(0); }
        try { stream?.releaseLock(); } catch {}
        active = false;
        readSignal = undefined;
      }
    },
  } satisfies MetaMediaFileReader);
  return Object.freeze({ ...reader, close() { closed = true; for (const request of requests) request.abort(); ownedClient?.destroy(); } });
}
