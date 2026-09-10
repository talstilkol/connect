import { metaMediaUploadObjectKey } from "../meta/metaMediaUploadJournal.ts";
import { S3Client, type S3ClientConfig, PutObjectCommand, GetBucketVersioningCommand, GetPublicAccessBlockCommand,
  GetBucketOwnershipControlsCommand, GetBucketEncryptionCommand, GetBucketPolicyCommand, GetBucketPolicyStatusCommand } from "@aws-sdk/client-s3";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { MAXIMUM_META_MEDIA_DOWNLOAD_BYTES } from "../meta/metaMediaDownload.ts";
import { MetaMediaQuarantineError, type MetaMediaQuarantineStorage } from "../meta/metaMediaQuarantine.ts";
import { hasRequiredMetaMediaQuarantineBucketPolicy } from "./s3MetaMediaQuarantinePolicy.ts";
import { requireS3MetaMediaQuarantineConfiguration,
  type S3MetaMediaQuarantineEnvironment, type S3MetaMediaQuarantineConfiguration } from "./s3MetaMediaQuarantineConfiguration.ts";

export const META_MEDIA_S3_REQUEST_TIMEOUT_MS = 30_000;
const hashPattern = /^[0-9a-f]{64}$/;
const positive = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const fail = (code: ConstructorParameters<typeof MetaMediaQuarantineError>[0]): never => { throw new MetaMediaQuarantineError(code); };
export function metaMediaQuarantineS3ClientConfiguration(config: S3MetaMediaQuarantineConfiguration): S3ClientConfig {
  return { region: config.region, maxAttempts: 1,
    // A single-attempt strategy also avoids the SDK retry layer's generated
    // invocation ID. Object identity comes only from the verified source.
    retryStrategy: { mode: "standard", retry: async (next, args) => next(args) },
    followRegionRedirects: false, forcePathStyle: false, useAccelerateEndpoint: false,
    useDualstackEndpoint: false, useFipsEndpoint: false, ignoreConfiguredEndpointUrls: true };
}
function status(error: unknown): number | undefined {
  if (error !== null && typeof error === "object" && "$metadata" in error) {
    const meta = error.$metadata;
    if (meta !== null && typeof meta === "object" && "httpStatusCode" in meta && typeof meta.httpStatusCode === "number") return meta.httpStatusCode;
  }
}

export async function verifyS3MetaMediaQuarantineBucket(config: S3MetaMediaQuarantineConfiguration, client: Pick<S3Client, "send">,
  request: <T>(operation: (signal: AbortSignal) => Promise<T>) => Promise<T>) {
  const target = Object.freeze({ Bucket: config.bucket, ExpectedBucketOwner: config.accountId });
    const replies = await Promise.allSettled([
      request((abortSignal) => client.send(new GetPublicAccessBlockCommand(target), { abortSignal })),
      request((abortSignal) => client.send(new GetBucketVersioningCommand(target), { abortSignal })),
      request((abortSignal) => client.send(new GetBucketOwnershipControlsCommand(target), { abortSignal })),
      request((abortSignal) => client.send(new GetBucketEncryptionCommand(target), { abortSignal })),
      request((abortSignal) => client.send(new GetBucketPolicyStatusCommand(target), { abortSignal })),
      request((abortSignal) => client.send(new GetBucketPolicyCommand(target), { abortSignal })),
    ]);
    if (replies.some((reply) => reply.status === "rejected")) return fail("DEPENDENCY_UNAVAILABLE");
    const [access, versioning, ownership, encryption, policyStatus, policy] = replies.map((reply) => reply.status === "fulfilled" ? reply.value : null);
    // Deliberately exact deployment contract: absent/unknown values do not
    // become safe defaults. The bucket policy is enforced by AWS per request.
    const block = access && "PublicAccessBlockConfiguration" in access && access.PublicAccessBlockConfiguration;
    const rules = ownership && "OwnershipControls" in ownership && ownership.OwnershipControls?.Rules;
    const keys = encryption && "ServerSideEncryptionConfiguration" in encryption && encryption.ServerSideEncryptionConfiguration?.Rules;
    if (!block || ![block.BlockPublicAcls, block.IgnorePublicAcls, block.BlockPublicPolicy, block.RestrictPublicBuckets].every((flag) => flag === true) ||
      !versioning || !("Status" in versioning) || versioning.Status !== "Enabled" || !rules || rules.length !== 1 || rules[0].ObjectOwnership !== "BucketOwnerEnforced" ||
      !keys || keys.length !== 1 || keys[0].ApplyServerSideEncryptionByDefault?.SSEAlgorithm !== "aws:kms" ||
      keys[0].ApplyServerSideEncryptionByDefault.KMSMasterKeyID !== config.kmsKeyArn ||
      !policyStatus || !("PolicyStatus" in policyStatus) || policyStatus.PolicyStatus?.IsPublic !== false ||
      !policy || !("Policy" in policy) || !hasRequiredMetaMediaQuarantineBucketPolicy(policy.Policy, config)) return fail("UNSAFE_BUCKET");
  }

export function createS3MetaMediaQuarantineStorage(environment: S3MetaMediaQuarantineEnvironment,
  options: Readonly<{ client?: Pick<S3Client, "send">; requestTimeoutMs?: number }> = {}) {
  const config = requireS3MetaMediaQuarantineConfiguration(environment);
  const timeoutMs = options.requestTimeoutMs ?? META_MEDIA_S3_REQUEST_TIMEOUT_MS;
  if (!positive(timeoutMs) || timeoutMs > 60_000 || Object.keys(options).some((key) => !["client", "requestTimeoutMs"].includes(key))) return fail("CONFIGURATION_INVALID");
  const ownedClient = options.client ? undefined : new S3Client(metaMediaQuarantineS3ClientConfiguration(config));
  const client = options.client ?? ownedClient!;
  const target = Object.freeze({ Bucket: config.bucket, ExpectedBucketOwner: config.accountId });
  let active = false;
  async function request<T>(operation: (signal: AbortSignal) => Promise<T>, write = false): Promise<T> {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new MetaMediaQuarantineError(write ? "OUTCOME_UNKNOWN" : "DEPENDENCY_UNAVAILABLE")); }, timeoutMs);
    });
    try { return await Promise.race([operation(controller.signal), deadline]); }
    catch (error) {
      if (error instanceof MetaMediaQuarantineError) throw error;
      if (!write) return fail("DEPENDENCY_UNAVAILABLE");
      const code = status(error);
      if (code === 412) return fail("OBJECT_EXISTS");
      // 409, 5xx, transport failures and malformed successful replies need
      // durable reconciliation. They must never be treated as a safe retry.
      if (code !== undefined && code >= 400 && code < 500 && code !== 409 && code !== 408) return fail("WRITE_REJECTED");
      return fail("OUTCOME_UNKNOWN");
    } finally { clearTimeout(timer); }
  }
  const storage: MetaMediaQuarantineStorage = Object.freeze({
    async store(raw, authorize, recordReceipt) {
      if (active) return fail("IN_PROGRESS");
      active = true;
      let bytes: Uint8Array<ArrayBuffer> | undefined;
      let writeStarted = false;
      try {
        if (typeof raw !== "object" || raw === null || typeof authorize !== "function" ||
          (recordReceipt !== undefined && typeof recordReceipt !== "function") ||
          Object.keys(raw).sort().join(",") !== "bytes,connectionVersion,contentSha256,mediaType,messageKey,sizeBytes,sourceSha256,tenantId") return fail("INVALID_INPUT");
        const input = Object.freeze({ ...raw });
        if (!positive(input.tenantId) || !positive(input.connectionVersion) || typeof input.messageKey !== "string" || !/^message_v1_[0-9a-f]{64}$/.test(input.messageKey) ||
          typeof input.sourceSha256 !== "string" || !hashPattern.test(input.sourceSha256) || typeof input.contentSha256 !== "string" || !hashPattern.test(input.contentSha256) ||
          typeof input.mediaType !== "string" || input.mediaType.length > 255 || !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*(?:; codecs=opus)?$/.test(input.mediaType) ||
          !positive(input.sizeBytes) || input.sizeBytes > MAXIMUM_META_MEDIA_DOWNLOAD_BYTES || !(input.bytes instanceof Uint8Array) ||
          !(input.bytes.buffer instanceof ArrayBuffer) || input.bytes.byteLength !== input.sizeBytes) return fail("INVALID_INPUT");
        // Own a snapshot across hashing, preflight and SDK credential waits.
        bytes = new Uint8Array(input.bytes);
        if (await sha256Hex(bytes) !== input.contentSha256) return fail("CONTENT_MISMATCH");
        const checkAuthorization = async () => { try { await authorize(); } catch { return fail("AUTHORIZATION_CHANGED"); } };
        await checkAuthorization(); await verifyS3MetaMediaQuarantineBucket(config, client, request); await checkAuthorization();
        const objectKey = metaMediaUploadObjectKey(input);
        const checksum = Buffer.from(input.contentSha256, "hex").toString("base64");
        const command = new PutObjectCommand({ ...target, Key: objectKey, Body: bytes,
          ContentLength: input.sizeBytes, ContentType: "application/octet-stream", ContentDisposition: "attachment", CacheControl: "no-store",
          IfNoneMatch: "*", ChecksumAlgorithm: "SHA256", ChecksumSHA256: checksum, ServerSideEncryption: "aws:kms", SSEKMSKeyId: config.kmsKeyArn,
          Metadata: { "connect-tenant": String(input.tenantId), "connect-generation": String(input.connectionVersion),
            "connect-message": input.messageKey, "connect-source-sha256": input.sourceSha256, "connect-content-sha256": input.contentSha256,
            "connect-media-type": input.mediaType },
        });
        let uploadSignal: AbortSignal | undefined;
        // The SDK can wait for AWS credentials and signing after send(). Its
        // deserialize step wraps the transport after those waits, so check
        // the current actor/source again at that final boundary.
        command.middlewareStack.add((next) => async (args) => {
          await checkAuthorization();
          if (uploadSignal?.aborted) return fail("OUTCOME_UNKNOWN");
          return next(args);
        }, { step: "deserialize", priority: "low", name: "connectMediaAuthorizeBeforeUpload" });
        writeStarted = true;
        const reply = await request((abortSignal) => {
          uploadSignal = abortSignal;
          return client.send(command, { abortSignal });
        }, true);
        if (reply.$metadata.httpStatusCode !== 200 || typeof reply.VersionId !== "string" || reply.VersionId === "null" ||
          reply.VersionId.length === 0 || reply.VersionId.length > 1024 || /[\u0000-\u0020\u007f]/.test(reply.VersionId) ||
          reply.ChecksumSHA256 !== checksum || reply.ServerSideEncryption !== "aws:kms" || reply.SSEKMSKeyId !== config.kmsKeyArn) return fail("OUTCOME_UNKNOWN");
        const receipt = Object.freeze({ tenantId: input.tenantId, connectionVersion: input.connectionVersion, messageKey: input.messageKey,
          sourceSha256: input.sourceSha256, bucket: config.bucket, objectKey, versionId: reply.VersionId, contentSha256: input.contentSha256,
          mediaType: input.mediaType, sizeBytes: input.sizeBytes, state: "quarantined" as const });
        // Preserve the confirmed remote result before checking whether the
        // caller is still authorized to receive it after this in-flight PUT.
        await recordReceipt?.(receipt);
        await checkAuthorization();
        return receipt;
      } catch (error) {
        if (error instanceof MetaMediaQuarantineError) throw error;
        return fail(writeStarted ? "OUTCOME_UNKNOWN" : "DEPENDENCY_UNAVAILABLE");
      } finally { bytes?.fill(0); active = false; }
    },
  } satisfies MetaMediaQuarantineStorage);
  return Object.freeze({ ...storage, close() { ownedClient?.destroy(); } });
}
