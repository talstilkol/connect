import type { KnowledgeIngestionRepository } from "../platform/postgresKnowledgeIngestionRepository.ts";
import { KnowledgeStorageError, type KnowledgeStorage } from "../platform/s3KnowledgeStorage.ts";
import { KnowledgeIngestionError } from "./knowledgeUploadRequest.ts";
import { knowledgeUtf8TextExtractor } from "./knowledgeUtf8TextExtractor.ts";
export function createKnowledgeIngestionWorker(jobs: KnowledgeIngestionRepository, storage: KnowledgeStorage) {
  return { async run(): Promise<void> {
    const c = await jobs.claim(); if (!c) return;
    let bytes: Uint8Array<ArrayBuffer> | undefined;
    try {
      const authorize = () => jobs.authorize(c);
      let versionId = c.versionId;
      if (c.state === "preparing") {
        if (!c.bytes) throw new KnowledgeIngestionError("CONFLICT");
        // Await the committed dispatch marker; an ambiguous acknowledgement
        // leaves recovery to inspection and never repeats PUT.
        await jobs.seal(c);
        versionId = await storage.put(c.intent,c.bytes,authorize);
        await jobs.receipt(c,versionId);
      }
      const observation = await storage.inspect(c.intent,versionId,authorize);
      if (!observation) { await jobs.defer(c); return; }
      if (observation.verdict === "PENDING") { await jobs.defer(c,"PENDING"); return; }
      if (observation.verdict !== "NO_THREATS_FOUND") { await jobs.reject(c,`KNOWLEDGE_SCAN_${observation.verdict}`); return; }
      bytes = await storage.read(c.intent,observation.versionId,authorize);
      // A recovered version becomes a receipt only after exact bytes, metadata,
      // checksum, encryption, owner, protected tags and authority have passed.
      await jobs.receipt(c,observation.versionId);
      const extraction = await knowledgeUtf8TextExtractor.extract({ sourceKey:c.intent.sourceKey,mediaType:c.intent.mediaType,bytes:bytes.buffer });
      if (!extraction || typeof extraction !== "object" || !("outcome" in extraction)) throw new Error("Knowledge extraction unavailable");
      if (extraction.outcome === "rejected" && "errorCode" in extraction && typeof extraction.errorCode === "string") { await jobs.reject(c,extraction.errorCode); return; }
      if (extraction.outcome !== "extracted" || !("sections" in extraction) || !Array.isArray(extraction.sections)) throw new Error("Knowledge extraction unavailable");
      await jobs.complete(c,observation.versionId,extraction.sections);
    } catch (e) {
      if (e instanceof KnowledgeIngestionError && e.code === "AUTHORIZATION_DENIED") await jobs.reject(c,"KNOWLEDGE_AUTHORIZATION_CHANGED").catch(() => {});
      else if (e instanceof KnowledgeStorageError && e.code === "MISMATCH") await jobs.reject(c,"KNOWLEDGE_CONTENT_MISMATCH").catch(() => {});
      else { await jobs.defer(c).catch(() => {}); throw e; }
    } finally { c.bytes?.fill(0); bytes?.fill(0); }
  } };
}
