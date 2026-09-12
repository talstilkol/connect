import assert from "node:assert/strict";
import test from "node:test";
import { createApprovedKnowledgeRetriever } from "../server/ai/approvedKnowledgeRetriever.ts";
import { knowledgeUtf8TextExtractor } from "../server/ai/knowledgeUtf8TextExtractor.ts";
import { deriveKnowledgePassageKey, deriveKnowledgeSourceKey } from "../server/ai/aiAgentKey.ts";
import { sha256Hex } from "../server/meta/metaWebhookSecurity.ts";
import { runtimeFixture } from "./fixtures/ai-runtime.mjs";

async function fixture() {
  const runtime = await runtimeFixture();
  await runtime.service.process(runtime.input);
  const original = runtime.calls.find((call) => call.dependency === "provider").request.passages[0];
  const contentSha256 = await sha256Hex(new TextEncoder().encode(original.content));
  const passage = { ...original, tenantId: runtime.input.tenantId, passageOrdinal: 1, contentSha256,
    passageKey: await deriveKnowledgePassageKey(runtime.input.tenantId, original.sourceKey, 1, contentSha256),
    createdAt: runtime.input.agent.createdAt };
  const request = { ...runtime.calls.find((call) => call.dependency === "retriever").request, query: passage.content };
  return { passage, request };
}

test("retrieves approved tenant-scoped passages with deterministic query coverage", async () => {
  const f = await fixture(); const calls = [];
  const retriever = createApprovedKnowledgeRetriever({ async listApprovedBySourceKeys(...args) {
    calls.push(args); return [f.passage];
  } });
  const result = await retriever.retrieve(f.request);
  assert.equal(result.outcome, "grounded");
  assert.equal(result.scoreBasisPoints, 10_000);
  assert.equal(result.passages[0].passageKey, f.passage.passageKey);
  assert.deepEqual(calls, [[7, [f.passage.sourceKey], 100, undefined]]);
  assert.deepEqual(await retriever.retrieve(f.request), result);
});

test("does not manufacture knowledge when the approved repository is empty", async () => {
  const f = await fixture();
  const retriever = createApprovedKnowledgeRetriever({ async listApprovedBySourceKeys() { return []; } });
  assert.deepEqual(await retriever.retrieve(f.request), { outcome: "no-approved-knowledge" });
});

test("cross-tenant, substituted source, tampered content and duplicate identity fail closed", async () => {
  const f = await fixture();
  for (const passages of [
    [{ ...f.passage, tenantId: f.passage.tenantId + 1 }],
    [{ ...f.passage, sourceKey: f.request.aiAgentVersionKey }],
    [{ ...f.passage, content: f.passage.content + " " }],
    [{ ...f.passage, contentSha256: "0".repeat(64) }],
    [f.passage, f.passage],
  ]) {
    const retriever = createApprovedKnowledgeRetriever({ async listApprovedBySourceKeys() { return passages; } });
    assert.deepEqual(await retriever.retrieve(f.request), { outcome: "unavailable" });
  }
});

test("punctuation-only or invalid input never accesses the repository", async () => {
  const f = await fixture();
  const retriever = createApprovedKnowledgeRetriever({ async listApprovedBySourceKeys() { assert.fail("no repository access"); } });
  assert.deepEqual(await retriever.retrieve({ ...f.request, query: "?!" }), { outcome: "no-approved-knowledge" });
  assert.deepEqual(await retriever.retrieve({ ...f.request, sourceKeys: [] }), { outcome: "no-approved-knowledge" });
  assert.deepEqual(await retriever.retrieve({ ...f.request, tenantId: 0 }), { outcome: "unavailable" });
  assert.deepEqual(await retriever.retrieve({ ...f.request, sourceKeys: [f.passage.sourceKey, f.passage.sourceKey] }), { outcome: "unavailable" });
});

test("reader failure never exposes source text or reports empty successful knowledge", async () => {
  const f = await fixture();
  const retriever = createApprovedKnowledgeRetriever({ async listApprovedBySourceKeys() { throw new Error(f.passage.content); } });
  assert.deepEqual(await retriever.retrieve(f.request), { outcome: "unavailable" });
});

test("UTF8 extraction preserves Hebrew and treats Markdown as text", async () => {
  const f = await fixture();
  for (const mediaType of ["text/plain", "text/markdown"]) {
    const result = await knowledgeUtf8TextExtractor.extract({ sourceKey: f.passage.sourceKey, mediaType,
      bytes: new TextEncoder().encode(f.passage.content).buffer });
    assert.deepEqual(result, { outcome: "extracted", sections: [{ content: f.passage.content }] });
  }
});

test("text extraction rejects unsupported formats, invalid encoding, controls and excessive input", async () => {
  const f = await fixture();
  const base = { sourceKey: f.passage.sourceKey, mediaType: "text/plain", bytes: new TextEncoder().encode(f.passage.content).buffer };
  for (const patch of [
    { mediaType: "application/pdf" }, { mediaType: "text/html" },
    { bytes: new Uint8Array([255]).buffer }, { bytes: new Uint8Array([0]).buffer },
    { bytes: new Uint8Array(1_048_577).buffer }, { bytes: new Uint8Array(0).buffer },
  ]) assert.equal((await knowledgeUtf8TextExtractor.extract({ ...base, ...patch })).outcome, "rejected");
});

test("text extraction splits long content without breaking surrogate pairs", async () => {
  const f = await fixture();
  const content = f.passage.content.repeat(200) + "🙂".repeat(3000);
  const input = { sourceKey: f.passage.sourceKey, mediaType: "text/plain", bytes: new TextEncoder().encode(content).buffer };
  const result = await knowledgeUtf8TextExtractor.extract(input);
  assert.equal(result.outcome, "extracted");
  assert.ok(result.sections.length > 1);
  for (const section of result.sections) {
    assert.ok(section.content.length <= 4096);
    assert.equal(section.content.isWellFormed(), true);
  }
  assert.deepEqual(await knowledgeUtf8TextExtractor.extract(input), result);
});

async function pagedFixture() {
  const f=await fixture();
  const keys=[f.passage.sourceKey,await deriveKnowledgeSourceKey(f.request.tenantId,'e'.repeat(64))].sort();
  const runtime=await runtimeFixture();
  const unrelated=runtime.input.version.definition.handoffMessage;
  const make=async(sourceKey,passageOrdinal,content)=>{
    const contentSha256=await sha256Hex(new TextEncoder().encode(content));
    return{...f.passage,sourceKey,passageOrdinal,content,contentSha256,
      passageKey:await deriveKnowledgePassageKey(f.request.tenantId,sourceKey,passageOrdinal,contentSha256)};
  };
  const passages=[];
  for(let ordinal=1;ordinal<=101;ordinal++) passages.push(await make(keys[0],ordinal,ordinal===101?f.passage.content:unrelated));
  passages.push(await make(keys[1],1,f.passage.content));
  return{...f,passages,request:{...f.request,sourceKeys:keys}};
}
test('ranks a relevant passage after ordinal 100 and a later selected source before applying the global cap',async()=>{
  const f=await pagedFixture(),calls=[];
  const retriever=createApprovedKnowledgeRetriever({async listApprovedBySourceKeys(tenant,keys,limit,after){
    calls.push(after);
    return f.passages.filter(p=>!after||p.sourceKey>after.sourceKey||p.sourceKey===after.sourceKey&&p.passageOrdinal>after.passageOrdinal).slice(0,limit);
  }});
  const result=await retriever.retrieve(f.request);
  assert.equal(result.outcome,'grounded');assert.equal(result.scoreBasisPoints,10000);
  assert.deepEqual(result.passages.map(p=>p.passageKey).sort(),f.passages.slice(100).map(p=>p.passageKey).sort());
  assert.equal(calls.length,2);assert.deepEqual(calls[1],{sourceKey:f.request.sourceKeys[0],passageOrdinal:100});
  assert.deepEqual(await retriever.retrieve(f.request),result);
});
test('a repeated page or a later database failure cannot masquerade as a complete knowledge result',async()=>{
  const f=await pagedFixture();
  for(const fail of [false,true]){
    let calls=0;
    const retriever=createApprovedKnowledgeRetriever({async listApprovedBySourceKeys(){
      if(++calls===2&&fail)throw Error('reader unavailable');
      return f.passages.slice(0,100);
    }});
    assert.deepEqual(await retriever.retrieve(f.request),{outcome:'unavailable'});assert.equal(calls,2);
  }
});
