import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { deriveKnowledgeSourceKey } from "../ai/aiAgentKey.ts";
import { KNOWLEDGE_MAX_UPLOAD_BYTES } from "../ai/knowledgeUploadRequest.ts";
import { knowledgeObjectKey, validKnowledgeObjectVersion, type KnowledgeObjectIntent } from "./s3KnowledgeStorage.ts";
import type { KnowledgeStorageConfiguration } from "./s3KnowledgeConfiguration.ts";
import { hasRequiredKnowledgeQuarantineBucketPolicy } from "./s3KnowledgeQuarantinePolicy.ts";
import { metaMediaQuarantineS3ClientConfiguration, verifyS3MetaMediaQuarantineBucket } from "./s3MetaMediaQuarantineStorage.ts";

export class KnowledgeCleanupError extends Error {
  readonly code: "INVALID_INPUT" | "UNAVAILABLE" | "DELETE_REJECTED" | "OUTCOME_UNKNOWN";
  constructor(code: KnowledgeCleanupError["code"]) { super("Knowledge cleanup failed"); this.code = code; }
}
export interface KnowledgeCleanupStorage {
  remove(intent: KnowledgeObjectIntent, versionId: string, authorize: () => Promise<void>): Promise<void>;
  close(): void;
}
const fail = (code: KnowledgeCleanupError["code"]): never => { throw new KnowledgeCleanupError(code); };
// Run with a separate IAM role: DeleteObjectVersion only within the Knowledge
// prefix. No body access, listing, tag changes or Object Lock bypass is needed.
export function createS3KnowledgeCleanupStorage(configuration: KnowledgeStorageConfiguration,
  options: { client?: Pick<S3Client, "send">; timeoutMs?: number } = {}): KnowledgeCleanupStorage {
  const config = Object.freeze({ ...configuration }), timeout = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60_000) fail("INVALID_INPUT");
  const owned = options.client ? null : new S3Client(metaMediaQuarantineS3ClientConfiguration(config)), client = options.client ?? owned!;
  let active = false, closed = false;
  const pending = new Set<AbortController>();
  async function request<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController(); pending.add(controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const operation = Promise.resolve().then(() => { if (closed || controller.signal.aborted) fail("UNAVAILABLE"); return work(controller.signal); });
    void operation.then(() => pending.delete(controller), () => pending.delete(controller));
    const deadline = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { controller.abort(); reject(new KnowledgeCleanupError("OUTCOME_UNKNOWN")); }, timeout); });
    try { return await Promise.race([operation, deadline]); } finally { clearTimeout(timer); }
  }
  return Object.freeze({
    async remove(raw, versionId, authorize) {
      if (active || closed || pending.size) fail("UNAVAILABLE"); active = true;
      try {
        const i = Object.freeze({ ...raw });
        if (!Number.isSafeInteger(i.tenantId) || i.tenantId < 1 || !/^[a-f0-9]{64}$/.test(i.contentSha256) ||
          i.sourceKey !== await deriveKnowledgeSourceKey(i.tenantId, i.contentSha256) || i.bucket !== config.bucket || i.kmsKeyArn !== config.kmsKeyArn ||
          i.objectKey !== knowledgeObjectKey(i.tenantId, i.sourceKey) || !Number.isSafeInteger(i.sizeBytes) || i.sizeBytes < 1 || i.sizeBytes > KNOWLEDGE_MAX_UPLOAD_BYTES ||
          !["text/plain", "text/markdown"].includes(i.mediaType) || !validKnowledgeObjectVersion(versionId)) fail("INVALID_INPUT");
        const check = async () => { if (closed) fail("UNAVAILABLE"); await authorize(); };
        await check(); await verifyS3MetaMediaQuarantineBucket(config, client, request, hasRequiredKnowledgeQuarantineBucketPolicy); await check();
        const command = new DeleteObjectCommand({ Bucket: config.bucket, ExpectedBucketOwner: config.accountId, Key: i.objectKey, VersionId: versionId });
        const result = await request(async signal => {
          command.middlewareStack.add(next => async args => { await check(); if (signal.aborted) fail("OUTCOME_UNKNOWN"); return next(args); },
            { step: "deserialize", priority: "low", name: "connectKnowledgeAuthorizeBeforeDeletion" });
          await check(); if (signal.aborted) fail("OUTCOME_UNKNOWN");
          return client.send(command, { abortSignal: signal });
        });
        if (result.$metadata.httpStatusCode !== 204 || result.DeleteMarker === true || result.VersionId !== undefined && result.VersionId !== versionId) fail("OUTCOME_UNKNOWN");
        // Do not discard an acknowledgement because authority changed in flight.
      } catch (error) {
        if (error instanceof KnowledgeCleanupError) throw error;
        if (error && typeof error === "object" && "code" in error && ["AUTHORIZATION_DENIED", "CONFLICT", "RETENTION_NOT_DUE", "CONFIGURATION_REQUIRED", "UNSAFE_BUCKET", "INVALID_INPUT"].includes(String(error.code))) throw error;
        const status = error && typeof error === "object" && "$metadata" in error ? (error.$metadata as { httpStatusCode?: number })?.httpStatusCode : undefined;
        if (status !== undefined && status >= 400 && status < 500 && ![408, 409, 429].includes(status)) fail("DELETE_REJECTED");
        fail("OUTCOME_UNKNOWN");
      } finally { active = false; }
    },
    close() { closed = true; for (const controller of pending) controller.abort(); owned?.destroy(); },
  } satisfies KnowledgeCleanupStorage);
}
