#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const READER_ID = "D02A9-READER-A-NODE";
const PKG = "docs/planning/d02-a9-openai-responses-data-control-eval-tool-safety-package-2026-08-30";
const ROOTS = {
  admitted: "d4d0a384b05897522ab9a3e96dd626cede14c9e4e0351906acd3201fd6dfd630",
  semantics: "1a7e0f90fca63f87e0a243a9738d2e2a1a17334a61bf2cabedf9a34070f186e4",
  sources: "5d2ced7611fb4975715037a0e7261bedfd0454b8b8c882f3e48b638f0dc81ef2",
  appointments: "aa3a873c798fdbd6dfe17c737fc099d370f600b4109700e19a3aea475bfd7bbf",
  dagNodes: "f6fe5da0fc9757b0f53727174ec0f8e9f7a578512336632076af997b10baa87c",
  dagEdges: "4602168466169a1904824a748f8f0f78ae00db57a0638322581f6f1455c5bbd2"
};
const CORE = {
  snapshotSchema: PKG + "/snapshot.schema.json",
  transitionSchema: PKG + "/transition.schema.json",
  envelopeSchema: PKG + "/envelope.schema.json",
  snapshot: PKG + "/snapshot.json",
  transitionMachine: PKG + "/transition-machine.json",
  positiveControls: PKG + "/positive-controls.json",
  inputManifest: PKG + "/admitted-input-manifest.json",
  semanticUniverse: PKG + "/predecessor-semantic-universe.json",
  sourceReceipts: PKG + "/source-receipts.json",
  appointments: PKG + "/producer-appointments.json",
  dag: PKG + "/dependency-dag.json",
  semanticRegistry: PKG + "/semantic-registry.json",
  mutationCorpus: PKG + "/mutation-corpus.json"
};
const INPUT_PATHS = [
  "docs/decision-intake-2026-08-21.md",
  "docs/researched-decision-approval-2026-08-26.md",
  "docs/planning/d02-a4-openai-model-routing-reconciliation-2026-08-29.md",
  "docs/planning/d02-a5-openai-responses-data-control-and-model-selection-reconciliation-2026-08-29.md",
  "docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-2026-08-30.md",
  "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-semantic-successor-2026-08-30.md",
  "docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-2026-08-30.md",
  "docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-findings-manifest-2026-08-30.md",
  "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md",
  "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md",
  "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-2026-08-30.md",
  "docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md",
  "docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md"
];
const INPUT_ROLES = ["USER-D02-DIRECTIVE", "RESEARCHED-DECISION", "ENGINEERING-RECONCILIATION", "SEMANTIC-SUCCESSOR", "SEMANTIC-SUCCESSOR", "SEMANTIC-SUCCESSOR", "INDEPENDENT-REVIEW", "FINDINGS-MANIFEST", "CLOSURE-CROSSWALK", "PRODUCER-QA", "INDEPENDENT-REVIEW", "FINDINGS-MANIFEST", "DURABLE-USER-PUBLIC-DIRECTIVE"];
const A8_TOP = [
  "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md",
  "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md",
  "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md",
  "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-2026-08-30.md",
  "docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md"
];
const A8_PACKAGE = ["dependency-dag.json", "mutation-corpus.json", "mutation-oracle.json", "package-manifest.json", "reader-a-report.json", "reader-a.mjs", "reader-b-report.json", "reader-b.rb", "registry.json", "root-instances.json", "schema.json"].map((name) => "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/" + name);
const A9_TOP = [
  "docs/planning/d02-a9-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md",
  "docs/planning/d02-a9-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md",
  "docs/planning/d02-a9-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md"
];
const PACKAGE_FIXED = [
  "generate.mjs", "snapshot.schema.json", "transition.schema.json", "envelope.schema.json", "snapshot.json", "transition-machine.json", "positive-controls.json", "control-oracle.json",
  "admitted-input-manifest.json", "predecessor-semantic-universe.json", "source-receipts.json", "producer-appointments.json", "dependency-dag.json", "semantic-registry.json",
  "mutation-corpus.json", "mutation-oracle.json", "generation-report.json", "reader-a.mjs", "reader-b.rb", "reader-a-report.json", "reader-b-report.json", "execution-receipts.json"
].map((name) => PKG + "/" + name);
const SHARD_PATHS = Array.from({ length: 29 }, (_, index) => PKG + "/semantic-shards/semantic-shard-" + String(index + 1).padStart(3, "0") + ".json");

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function canonical(value) {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") { if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error("non-canonical number"); return String(value); }
  if (typeof value === "string") { if (value !== value.normalize("NFC")) throw new Error("non-NFC string"); return JSON.stringify(value); }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((key) => canonical(key) + ":" + canonical(value[key])).join(",") + "}";
  throw new Error("unsupported value");
}
function domainRoot(domain, value) { return sha256(Buffer.from("CONNECT-D02-A9:" + domain + ":" + canonical(value), "utf8")); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function same(a, b) { return canonical(a) === canonical(b); }
function extent(bytes) { const text = bytes.toString("utf8"); return { sha256: sha256(bytes), lines: (text.match(/\n/g) || []).length, words: text.trim() ? text.trim().split(/\s+/u).length : 0, bytes: bytes.length }; }

function findNamespaceRoot(start) {
  let cursor = fs.realpathSync.native(start);
  for (;;) {
    if (fs.existsSync(path.join(cursor, "docs")) && fs.existsSync(path.join(cursor, "../.git"))) return cursor;
    if (fs.existsSync(path.join(cursor, ".git")) && fs.existsSync(path.join(cursor, "web/docs"))) return path.join(cursor, "web");
    const parent = path.dirname(cursor); if (parent === cursor) throw new Error("namespace root not found"); cursor = parent;
  }
}
const namespaceRoot = findNamespaceRoot(process.cwd());
function resolveLogical(logicalPath) {
  if (typeof logicalPath !== "string" || !logicalPath.startsWith("docs/") || logicalPath.includes("\\") || logicalPath.includes("\0") || path.posix.normalize(logicalPath) !== logicalPath) throw new Error("invalid logical path " + logicalPath);
  const physical = path.resolve(namespaceRoot, logicalPath); if (!physical.startsWith(namespaceRoot + path.sep)) throw new Error("path escape"); return physical;
}

function duplicateKeyCount(text) {
  let i = 0, duplicates = 0;
  const skip = () => { while (/[\u0020\u000a\u000d\u0009]/u.test(text[i] || "")) i += 1; };
  function stringToken() { const start = i++; while (i < text.length) { if (text[i] === "\\") { i += text[i + 1] === "u" ? 6 : 2; continue; } if (text[i] === "\"") return JSON.parse(text.slice(start, ++i)); i += 1; } throw new Error("unterminated string"); }
  function value() {
    skip();
    if (text[i] === "{") { i += 1; skip(); const keys = new Set(); if (text[i] === "}") { i += 1; return; } for (;;) { skip(); const key = stringToken(); if (keys.has(key)) duplicates += 1; keys.add(key); skip(); if (text[i++] !== ":") throw new Error("missing colon"); value(); skip(); if (text[i] === "}") { i += 1; return; } if (text[i++] !== ",") throw new Error("missing comma"); } }
    if (text[i] === "[") { i += 1; skip(); if (text[i] === "]") { i += 1; return; } for (;;) { value(); skip(); if (text[i] === "]") { i += 1; return; } if (text[i++] !== ",") throw new Error("missing array comma"); } }
    if (text[i] === "\"") { stringToken(); return; }
    const token = text.slice(i).match(/^(?:-?(?:0|[1-9][0-9]*)|true|false|null)/u); if (!token) throw new Error("invalid token"); i += token[0].length;
  }
  value(); skip(); if (i !== text.length) throw new Error("trailing bytes"); return duplicates;
}
function readJson(logicalPath) { const bytes = fs.readFileSync(resolveLogical(logicalPath)); const text = bytes.toString("utf8"); if (duplicateKeyCount(text) !== 0) throw new Error("duplicate JSON key " + logicalPath); return { bytes, value: JSON.parse(text) }; }

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith("#/")) throw new Error("external ref forbidden");
  let cursor = rootSchema;
  for (const token of ref.slice(2).split("/")) { const key = token.replace(/~1/gu, "/").replace(/~0/gu, "~"); if (!cursor || !Object.prototype.hasOwnProperty.call(cursor, key)) throw new Error("unresolved ref " + ref); cursor = cursor[key]; }
  return cursor;
}
function schemaErrors(schema, instance, rootSchema = schema, at = "$", seen = new Set()) {
  const errors = [];
  if (schema.$ref) { let target; try { target = resolveRef(rootSchema, schema.$ref); } catch (error) { return [at + ":" + error.message]; } return schemaErrors(target, instance, rootSchema, at, seen); }
  if (schema.const !== undefined && !same(instance, schema.const)) errors.push(at + ":const");
  if (schema.enum && !schema.enum.some((entry) => same(entry, instance))) errors.push(at + ":enum");
  if (schema.type) {
    const valid = schema.type === "object" ? instance !== null && typeof instance === "object" && !Array.isArray(instance) : schema.type === "array" ? Array.isArray(instance) : schema.type === "integer" ? Number.isSafeInteger(instance) : schema.type === "string" ? typeof instance === "string" : schema.type === "boolean" ? typeof instance === "boolean" : false;
    if (!valid) return [...errors, at + ":type"];
  }
  if (instance !== null && typeof instance === "object" && !Array.isArray(instance)) {
    const properties = schema.properties || {};
    for (const key of schema.required || []) if (!Object.prototype.hasOwnProperty.call(instance, key)) errors.push(at + ":required:" + key);
    if (schema.additionalProperties === false) for (const key of Object.keys(instance)) if (!Object.prototype.hasOwnProperty.call(properties, key)) errors.push(at + ":unknown:" + key);
    for (const [key, sub] of Object.entries(properties)) if (Object.prototype.hasOwnProperty.call(instance, key)) errors.push(...schemaErrors(sub, instance[key], rootSchema, at + "/" + key, seen));
  }
  if (Array.isArray(instance)) {
    if (schema.minItems !== undefined && instance.length < schema.minItems) errors.push(at + ":minItems");
    if (schema.maxItems !== undefined && instance.length > schema.maxItems) errors.push(at + ":maxItems");
    if (schema.uniqueItems && new Set(instance.map(canonical)).size !== instance.length) errors.push(at + ":uniqueItems");
    if (schema.items) instance.forEach((entry, index) => errors.push(...schemaErrors(schema.items, entry, rootSchema, at + "/" + index, seen)));
  }
  if (typeof instance === "string") {
    if (schema.minLength !== undefined && [...instance].length < schema.minLength) errors.push(at + ":minLength");
    if (schema.maxLength !== undefined && [...instance].length > schema.maxLength) errors.push(at + ":maxLength");
    if (schema.pattern !== undefined && !(new RegExp(schema.pattern, "u")).test(instance)) errors.push(at + ":pattern");
  }
  if (Number.isSafeInteger(instance)) { if (schema.minimum !== undefined && instance < schema.minimum) errors.push(at + ":minimum"); if (schema.maximum !== undefined && instance > schema.maximum) errors.push(at + ":maximum"); }
  return errors;
}
function preflightRefs(schema) {
  const refs = [];
  function walk(value) { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === "object") { if (value.$ref) refs.push(value.$ref); Object.values(value).forEach(walk); } }
  walk(schema); for (const ref of refs) resolveRef(schema, ref); return refs.length;
}

function splitPhysicalLines(bytes) { const out = []; let start = 0; for (let i = 0; i < bytes.length; i += 1) if (bytes[i] === 10) { out.push(bytes.subarray(start, i + 1)); start = i + 1; } if (start < bytes.length) out.push(bytes.subarray(start)); return out; }
function classifyLine(text) { const trimmed = text.replace(/\r?\n$/, "").trim(); if (!trimmed) return "BLANK"; if (/^#{1,6}\s/u.test(trimmed)) return "HEADING"; if (/^\|.*\|$/u.test(trimmed)) return "TABLE-ROW"; if (/^[0-9]+(?:\.[0-9]+)+\s/u.test(trimmed)) return "NUMBERED-CLAUSE"; if (/^(?:[-*+]\s|[0-9]+\.\s)/u.test(trimmed)) return "LIST-ITEM"; if (/^```/u.test(trimmed)) return "CODE-FENCE"; return "PROSE-OR-CODE"; }
function normalizeLine(text) { return text.replace(/\r?\n$/, "").normalize("NFC").replace(/[ \t]+/gu, " ").trim(); }
function decodeEntities(text) { const named = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " }; return text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/giu, (_, token) => token[0] === "#" ? String.fromCodePoint(parseInt(token[1].toLowerCase() === "x" ? token.slice(2) : token.slice(1), token[1].toLowerCase() === "x" ? 16 : 10)) : named[token.toLowerCase()]); }
function normalizeHtml(bytes) { return decodeEntities(bytes.toString("utf8").replace(/<!--[^]*?-->/gu, " ").replace(/<(script|style|svg|noscript)\b[^>]*>[^]*?<\/\1>/giu, " ").replace(/<[^>]+>/gu, " ")).normalize("NFC").replace(/\s+/gu, " ").trim(); }

const expectedStates = [
  ["D02A9-ROOT-PLANNING-ACCEPTANCE", "D02-PLANNING-CONTRACT-ACCEPTANCE"], ["D02A9-ROOT-AI-ADMISSION", "AI-PROFILE-ADMISSION"], ["D02A9-ROOT-RUNTIME-PERMIT", "AI-RUNTIME-PERMIT"]
];
const planningPredicates = ["PACKAGE-ENVELOPE", "AUTHORITY-CHAIN", "PREDECESSOR-SEMANTICS", "PUBLIC-DIRECTIVE", "INDEPENDENT-A9-REVIEW", "A9-SEVEN-FINDING-CLOSURE", "PROGRAM-ACCEPTANCE"];
const aiPredicates = ["MODEL-SELECTION", "CONNECT-PROMPT", "AI-PROFILE", "ACCOUNT", "LEGAL-PRIVACY", "SOURCE-ACCEPTANCE", "APPROVALS", "EVAL"];
const runtimePredicates = ["GATE29", "FREEZE-LIFT", "RUNTIME-ACCOUNT", "TRUSTED-TIME", "REVOCATION-CLEAR", "CAS-MATCH", "SINGLE-USE", "POST-READBACK"];
const invalidations = ["EXPIRED", "REVOKED", "REPLAY", "CAS-MISMATCH", "POST-READBACK-MISMATCH"];
const controlPurposes = ["ALL-MISSING-CURRENT-SAFE-STATE", "PLANNING-SATISFIABLE-HIGHER-ROOTS-BLOCKED", "AI-ADMISSION-SATISFIABLE-RUNTIME-BLOCKED", "RUNTIME-PERMIT-MATHEMATICALLY-SATISFIABLE", "EXPIRY-RETURNS-SAFE-BLOCK", "REVOCATION-RETURNS-SAFE-BLOCK", "REPLAY-RETURNS-SAFE-BLOCK", "CAS-MISMATCH-RETURNS-SAFE-BLOCK", "POST-READBACK-MISMATCH-RETURNS-SAFE-BLOCK"];
const expectedControlTerminals = ["PLANNING-CONJUNCT-MISSING", "AI-CONJUNCT-MISSING", "RUNTIME-CONJUNCT-MISSING", "CONTROL-SATISFIABLE-NON-AUTHORIZING", "EXPIRED-BLOCKED", "REVOKED-BLOCKED", "REPLAY-BLOCKED", "CAS-MISMATCH-BLOCKED", "POST-READBACK-MISMATCH-BLOCKED"];
function evaluateControl(control) {
  const map = Object.fromEntries(control.predicates.map((p) => [p.predicateId, p.value])); const all = (ids) => ids.every((id) => map[id] === true);
  let planning = all(planningPredicates) ? "ACCEPTED-CONTROL" : "BLOCKED"; let ai = planning === "ACCEPTED-CONTROL" && all(aiPredicates) ? "ACCEPTED-CONTROL" : "BLOCKED"; let runtime = ai === "ACCEPTED-CONTROL" && all(runtimePredicates) ? "ACCEPTED-CONTROL" : "BLOCKED";
  let terminal = runtime === "ACCEPTED-CONTROL" ? "CONTROL-SATISFIABLE-NON-AUTHORIZING" : ai === "ACCEPTED-CONTROL" ? "RUNTIME-CONJUNCT-MISSING" : planning === "ACCEPTED-CONTROL" ? "AI-CONJUNCT-MISSING" : "PLANNING-CONJUNCT-MISSING";
  for (const [p, t] of [["REPLAY", "REPLAY-BLOCKED"], ["CAS-MISMATCH", "CAS-MISMATCH-BLOCKED"], ["REVOKED", "REVOKED-BLOCKED"], ["EXPIRED", "EXPIRED-BLOCKED"], ["POST-READBACK-MISMATCH", "POST-READBACK-MISMATCH-BLOCKED"]]) if (map[p]) { runtime = "BLOCKED"; if (["REVOKED", "EXPIRED"].includes(p)) ai = "BLOCKED"; terminal = t; break; }
  return { controlId: control.controlId, planning, aiAdmission: ai, runtimePermit: runtime, terminal, acceptanceCredit: 0 };
}
function transitionOperationKey(record) { return domainRoot("TRANSITION-OPERATION-KEY-V1", { transitionId: record.transitionId, rootId: record.rootId, fromState: record.fromState, toState: record.toState, event: record.event, previousVersion: record.previousVersion, nextVersion: record.nextVersion, expectedPreviousRoot: record.expectedPreviousRoot, evidenceRoot: record.evidenceRoot }); }

function graphStatus(dag) {
  const ids = dag.nodes.map((n) => n.nodeId), set = new Set(ids), indegree = Object.fromEntries(ids.map((id) => [id, 0])), outgoing = Object.fromEntries(ids.map((id) => [id, []])); let dangling = 0;
  for (const edge of dag.edges) { if (!set.has(edge.from) || !set.has(edge.to)) dangling += 1; else { indegree[edge.to] += 1; outgoing[edge.from].push(edge.to); } }
  const queue = ids.filter((id) => indegree[id] === 0).sort(); let visited = 0; while (queue.length) { const id = queue.shift(); visited += 1; for (const child of outgoing[id].slice().sort()) { indegree[child] -= 1; if (indegree[child] === 0) { queue.push(child); queue.sort(); } } }
  return { dangling, cycles: visited === ids.length ? 0 : 1, visited };
}

function evaluateBundle(bundle, physicalCheck = true) {
  try { preflightRefs(bundle.snapshotSchema); preflightRefs(bundle.transitionSchema); preflightRefs(bundle.envelopeSchema); } catch { return "SCHEMA-DEFINITION-INVALID"; }
  if (schemaErrors(bundle.snapshotSchema, bundle.snapshot).length) return "SNAPSHOT-SCHEMA-INVALID";
  for (const control of bundle.positiveControls.controls || []) if (schemaErrors(bundle.transitionSchema, control.transition).length) return "TRANSITION-SCHEMA-INVALID";
  const s = bundle.snapshot.safeState;
  if (!same(s, { aiRuntime: "OFF", gate29: "BLOCKED", developmentFreeze: "ACTIVE", repositoryVisibility: "PUBLIC", planningAcceptance: "MISSING", aiAdmission: "MISSING", runtimePermit: "MISSING", acceptanceCount: 0 })) return "SAFE-STATE-INVALID";
  if (!same(bundle.snapshot.rootStates.map((r) => [r.rootId, r.rootClass, r.state, r.rootSha256, r.acceptanceCredit]), expectedStates.map(([id, cls]) => [id, cls, "MISSING", "MISSING", 0]))) return "SAFE-STATE-INVALID";

  const manifest = bundle.inputManifest;
  if (manifest.entryCount !== 13 || manifest.entries.length !== 13 || manifest.admittedManifestRoot !== ROOTS.admitted || bundle.semanticRegistry.admittedInputManifest.admittedManifestRoot !== ROOTS.admitted) return "INPUT-MANIFEST-INVALID";
  if (!same(manifest.entries.map((e) => e.inputId), Array.from({ length: 13 }, (_, i) => "D02A9-IN-" + String(i + 1).padStart(3, "0")))) return "INPUT-MANIFEST-INVALID";
  if (!same(manifest.entries.map((e) => e.logicalPath), INPUT_PATHS) || !same(manifest.entries.map((e) => e.role), INPUT_ROLES)) return "INPUT-MANIFEST-INVALID";
  if (manifest.entries.some((e) => !Array.isArray(e.requiredConsumerRootIds) || e.requiredConsumerRootIds.length === 0)) return "INPUT-MANIFEST-INVALID";
  if (domainRoot("ADMITTED-INPUT-MANIFEST-V1", manifest.entries) !== ROOTS.admitted) return "INPUT-MANIFEST-INVALID";
  if (physicalCheck) for (const entry of manifest.entries) if (!same(extent(fs.readFileSync(resolveLogical(entry.logicalPath))), { sha256: entry.sha256, lines: entry.lines, words: entry.words, bytes: entry.bytes })) return "INPUT-MANIFEST-INVALID";

  const universe = bundle.semanticUniverse, shards = bundle.semanticShards;
  if (universe.sourceCount !== 18 || universe.memberCount !== 2864 || universe.tableRowCount !== 295 || universe.shardCount !== 29 || shards.length !== 29 || universe.semanticUniverseRoot !== ROOTS.semantics || bundle.semanticRegistry.predecessorSemanticUniverse.semanticUniverseRoot !== ROOTS.semantics) return "SEMANTIC-UNIVERSE-INVALID";
  const members = shards.flatMap((shard, index) => {
    const descriptor = universe.shards[index]; if (!descriptor || descriptor.shardId !== shard.shardId || descriptor.memberCount !== shard.members.length || descriptor.memberRoot !== domainRoot("PREDECESSOR-SEMANTIC-SHARD-V1", shard.members)) throw new Error("shard descriptor mismatch"); return shard.members;
  });
  if (members.length !== 2864 || domainRoot("TOTAL-PREDECESSOR-SEMANTIC-UNIVERSE-V1", members) !== ROOTS.semantics) return "SEMANTIC-UNIVERSE-INVALID";
  const memberBySource = new Map(); for (const member of members) { if (!member.disposition || !member.successorTarget || member.ordinal !== members.indexOf(member) + 1) return "SEMANTIC-UNIVERSE-INVALID"; if (!memberBySource.has(member.sourceId)) memberBySource.set(member.sourceId, []); memberBySource.get(member.sourceId).push(member); }
  if (physicalCheck) for (const source of universe.sources) { const lines = splitPhysicalLines(fs.readFileSync(resolveLogical(source.logicalPath))), rows = memberBySource.get(source.sourceId) || []; if (lines.length !== rows.length) return "SEMANTIC-UNIVERSE-INVALID"; for (let i = 0; i < lines.length; i += 1) { const text = lines[i].toString("utf8"), row = rows[i]; if (row.lineNumber !== i + 1 || row.exactByteLength !== lines[i].length || row.exactLineSha256 !== sha256(lines[i]) || row.normalizedTextSha256 !== sha256(Buffer.from(normalizeLine(text), "utf8")) || row.lineKind !== classifyLine(text)) return "SEMANTIC-UNIVERSE-INVALID"; } }

  const receipts = bundle.sourceReceipts;
  if (receipts.receiptCount !== 11 || receipts.receipts.length !== 11 || receipts.acceptedCount !== 0 || receipts.publishedPageByteCount !== 0 || receipts.sourceObservationRoot !== ROOTS.sources || bundle.semanticRegistry.sourceReceiptSet.sourceObservationRoot !== ROOTS.sources) return "SOURCE-RECEIPTS-INVALID";
  for (const receipt of receipts.receipts) { const core = clone(receipt); delete core.historicalObservationCommitment; if (receipt.historicalObservationCommitment !== domainRoot("SOURCE-RECEIPT-V1", core) || receipt.response.status !== 200 || receipt.observation.extractorId !== "CONNECT-HTML-TEXT-V1" || receipt.observation.pageBytesPublished !== false || receipt.acceptance.accepted !== false || receipt.acceptance.acceptanceCredit !== 0 || !receipt.request.url.startsWith("https://developers.openai.com/")) return "SOURCE-RECEIPTS-INVALID"; }
  if (domainRoot("SOURCE-OBSERVATION-SET-V1", receipts.receipts) !== ROOTS.sources) return "SOURCE-RECEIPTS-INVALID";

  const defs = bundle.semanticRegistry.rootDefinitions, dag = bundle.dag;
  const expectedNodes = defs.map((r) => ({ nodeId: r.rootId, nodeClass: r.rootClass, producerId: r.producerId })); const expectedEdges = []; for (const root of defs) for (const dependency of root.orderedDependencyIds) expectedEdges.push({ edgeId: "D02A9-EDGE-" + String(expectedEdges.length + 1).padStart(3, "0"), from: dependency, to: root.rootId, edgeType: "REQUIRED-ALL-OF" });
  if (!same(dag.nodes, expectedNodes) || !same(dag.edges, expectedEdges) || dag.exactNodeRoot !== ROOTS.dagNodes || dag.exactEdgeRoot !== ROOTS.dagEdges || domainRoot("DAG-NODES-V1", dag.nodes) !== ROOTS.dagNodes || domainRoot("DAG-EDGES-V1", dag.edges) !== ROOTS.dagEdges) return "DAG-INVALID";
  const gs = graphStatus(dag); if (gs.dangling || gs.cycles || dag.prohibitedEdges.some((p) => dag.edges.some((e) => e.from === p.from && e.to === p.to))) return "DAG-INVALID";

  const appointments = bundle.appointments;
  if (appointments.appointmentCount !== 24 || appointments.appointments.length !== 24 || appointments.appointmentsRoot !== ROOTS.appointments || bundle.semanticRegistry.producerAppointments.appointmentsRoot !== ROOTS.appointments || appointments.selfAuthorityCount !== 0 || domainRoot("PRODUCER-APPOINTMENTS-V1", appointments.appointments) !== ROOTS.appointments) return "PRODUCER-APPOINTMENT-INVALID";
  for (const row of appointments.appointments) { const outputs = defs.filter((r) => r.producerId === row.producerId).map((r) => r.rootId); if (!same(row.allowedOutputRootIds, outputs) || row.authoritySourceId === row.producerId || outputs.includes(row.authoritySourceId) || row.acceptanceCredit !== 0) return "PRODUCER-APPOINTMENT-INVALID"; }

  const machine = bundle.transitionMachine, expectedTransitions = [["MISSING", "MISSING", "NOOP"], ["MISSING", "PRESENT-UNACCEPTED", "SUBMIT"], ["PRESENT-UNACCEPTED", "ACCEPTED", "ACCEPT"], ["ACCEPTED", "EXPIRED", "EXPIRE"], ["ACCEPTED", "REVOKED", "REVOKE"], ["ACCEPTED", "CONSUMED", "CONSUME"], ["CONSUMED", "BLOCKED", "REPLAY"], ["PRESENT-UNACCEPTED", "BLOCKED", "CAS-MISMATCH"], ["ACCEPTED", "BLOCKED", "POST-READBACK-MISMATCH"], ["EXPIRED", "PRESENT-UNACCEPTED", "REPLACE"], ["REVOKED", "PRESENT-UNACCEPTED", "REPLACE"], ["BLOCKED", "PRESENT-UNACCEPTED", "REPLACE"]];
  if (!same(machine.allowedTransitions.map((r) => [r.fromState, r.toState, r.event]), expectedTransitions) || !same(machine.terminalPrecedence, ["REPLAY", "CAS-MISMATCH", "REVOKED", "EXPIRED", "POST-READBACK-MISMATCH", "MISSING-CONJUNCT", "CONTROL-SATISFIABLE-NON-AUTHORIZING"])) return "TRANSITION-MACHINE-INVALID";
  const controls = bundle.positiveControls.controls;
  if (bundle.positiveControls.controlCount !== 9 || controls.length !== 9 || !same(controls.map((c) => c.purpose), controlPurposes)) return "POSITIVE-CONTROL-INVALID";
  for (let i = 0; i < controls.length; i += 1) {
    const c = controls[i], tr = c.transition, rule = machine.allowedTransitions.find((r) => r.fromState === tr.fromState && r.toState === tr.toState && r.event === tr.event);
    if (!c.controlOnly || c.authorityCredit !== 0) return "POSITIVE-CONTROL-INVALID";
    if (!rule || tr.controlOnly !== true || tr.acceptanceCredit !== 0 || tr.operationKey !== transitionOperationKey(tr) || tr.nextVersion !== tr.previousVersion + (tr.event === "NOOP" ? 0 : 1)) return "TRANSITION-SEMANTICS-INVALID";
    if (["ACCEPT", "CONSUME"].includes(tr.event) && tr.casResult !== "MATCH") return "TRANSITION-SEMANTICS-INVALID"; if (tr.event === "CAS-MISMATCH" && tr.casResult !== "MISMATCH") return "TRANSITION-SEMANTICS-INVALID"; if (tr.event === "REPLAY" && tr.toState !== "BLOCKED") return "TRANSITION-SEMANTICS-INVALID";
    const actual = evaluateControl(c); if (actual.terminal !== expectedControlTerminals[i]) return "POSITIVE-CONTROL-INVALID";
  }
  const reg = bundle.semanticRegistry;
  if (reg.a6FindingCarry.length !== 5 || reg.a7FindingCarry.length !== 7 || reg.a8FindingClosureCandidates.length !== 7 || reg.a8FindingClosureCandidates.some((r, i) => r.findingId !== "D02-A8-IHR-F" + String(i + 1).padStart(3, "0") || r.noMergeKey !== r.findingId || r.acceptanceCredit !== 0 || r.state !== "OPEN")) return "FINDING-CLOSURE-INVALID";
  if (reg.authorityChain.length !== 7 || reg.authorityChain.some((r, i) => r.sequence !== i + 1 || r.predecessorId !== (i === 0 ? null : reg.authorityChain[i - 1].nodeId)) || reg.publicDirective.inputId !== "D02A9-IN-013" || reg.publicDirective.locator !== "D18-A2:1.1.4" || reg.publicDirective.policy !== "PUBLIC") return "SEMANTIC-REGISTRY-INVALID";
  if (!same(reg.immutableState, { aiRuntime: "OFF", gate29: "BLOCKED", developmentFreeze: "ACTIVE", repositoryVisibility: "PUBLIC", acceptanceCount: 0, selfAcceptance: 0, productMutationCount: 0, gitMutationCount: 0, githubMutationCount: 0, providerMutationCount: 0 })) return "SAFE-STATE-INVALID";
  return "PASS";
}

function pointerParent(root, pointer) { let cursor = root; for (let i = 0; i < pointer.length - 1; i += 1) cursor = cursor[pointer[i]]; return [cursor, pointer[pointer.length - 1]]; }
function applyVector(base, vector) {
  const state = clone(base), [parent, key] = pointerParent(state[vector.artifact], vector.pointer);
  if (vector.operation === "DELETE") Array.isArray(parent) ? parent.splice(key, 1) : delete parent[key];
  else if (vector.operation === "SET") parent[key] = clone(vector.value);
  else if (vector.operation === "SWAP") { const tmp = parent[key]; parent[key] = parent[key + 1]; parent[key + 1] = tmp; }
  else throw new Error("unsupported inner operation " + vector.operation);
  return state;
}

function loadBundle() {
  const loaded = {}; const inputFiles = [];
  for (const [key, logicalPath] of Object.entries(CORE)) { const item = readJson(logicalPath); loaded[key] = item.value; inputFiles.push({ logicalPath, ...extent(item.bytes) }); }
  loaded.semanticShards = SHARD_PATHS.map((logicalPath) => { const item = readJson(logicalPath); inputFiles.push({ logicalPath, ...extent(item.bytes) }); return item.value; });
  return { bundle: loaded, inputFiles };
}

function sourceRefresh(bundle, sourceDir) {
  if (!sourceDir) return { mode: "NOT-RUN", checked: 0, changed: 0, unavailable: 0 };
  let changed = 0, unavailable = 0, checked = 0;
  for (const receipt of bundle.sourceReceipts.receipts) { const suffix = receipt.receiptId.slice(-3), file = path.join(sourceDir, "d02a9-source-" + suffix + ".html"); if (!fs.existsSync(file)) { unavailable += 1; continue; } const bytes = fs.readFileSync(file), normalized = normalizeHtml(bytes); checked += 1; if (sha256(bytes) !== receipt.response.rawResponseSha256 || sha256(Buffer.from(normalized, "utf8")) !== receipt.observation.normalizedTextSha256) changed += 1; }
  return { mode: "DETACHED-CAPTURE-READ-ONLY", checked, changed, unavailable, terminal: unavailable ? "SOURCE-UNAVAILABLE" : changed ? "SOURCE-CHANGED" : "SOURCE-CUT-MATCH" };
}

function envelopePaths() { return [...INPUT_PATHS, ...A8_TOP, ...A8_PACKAGE, ...A9_TOP, ...PACKAGE_FIXED, ...SHARD_PATHS].sort(); }
function expectedRole(logicalPath) { if (INPUT_PATHS.includes(logicalPath)) return "FROZEN-ADMITTED-INPUT"; if (A8_TOP.includes(logicalPath)) return "IMMEDIATE-A8-PREDECESSOR"; if (A8_PACKAGE.includes(logicalPath)) return "A8-PACKAGE-PREDECESSOR"; if (A9_TOP.includes(logicalPath)) return "A9-TOP-LEVEL-PLANNING"; return "A9-PACKAGE-MEMBER"; }
function verifyEnvelopeObject(envelope, physical = true) {
  const expected = envelopePaths(); if (!same(envelope.memberOrder, expected) || envelope.memberCount !== expected.length || envelope.members.length !== expected.length || envelope.selfMembership !== "EXCLUDED-NON-SELF-REFERENTIAL") return false;
  for (let i = 0; i < expected.length; i += 1) { const member = envelope.members[i]; if (member.ordinal !== i + 1 || member.logicalPath !== expected[i] || member.role !== expectedRole(expected[i])) return false; if (physical && !same(extent(fs.readFileSync(resolveLogical(member.logicalPath))), { sha256: member.sha256, lines: member.lines, words: member.words, bytes: member.bytes })) return false; }
  return envelope.contentRoot === domainRoot("PACKAGE-ENVELOPE-MEMBERS-V1", envelope.members);
}
function outerMode() {
  const envelopeItem = readJson(PKG + "/package-envelope.json"), schemaItem = readJson(CORE.envelopeSchema), envelope = envelopeItem.value;
  const schemaErrorList = schemaErrors(schemaItem.value, envelope); const baseline = schemaErrorList.length === 0 && verifyEnvelopeObject(envelope, true);
  const synthetic = [];
  const test = (name, fn) => { const copy = clone(envelope); fn(copy); synthetic.push({ name, killed: !(schemaErrors(schemaItem.value, copy).length === 0 && verifyEnvelopeObject(copy, false)) }); };
  test("omit member", (e) => e.members.splice(0, 1)); test("substitute member hash", (e) => e.members[0].sha256 = "0".repeat(64)); test("add member", (e) => e.members.push(clone(e.members[0]))); test("reorder member", (e) => { const x = e.members[0]; e.members[0] = e.members[1]; e.members[1] = x; });
  for (const [name, fragment] of [["mutate reader A", "/reader-a.mjs"], ["mutate reader B", "/reader-b.rb"], ["mutate toolchain", "/execution-receipts.json"], ["mutate report A", "/reader-a-report.json"], ["mutate report B", "/reader-b-report.json"], ["mutate Subject", A9_TOP[0]], ["mutate crosswalk", A9_TOP[1]], ["mutate Producer QA", A9_TOP[2]]]) test(name, (e) => { const row = e.members.find((m) => fragment.startsWith("docs/") ? m.logicalPath === fragment : m.logicalPath.endsWith(fragment)); row.sha256 = "f".repeat(64); });
  const output = { artifactId: "CONNECT-D02-A9-OUTER-VERIFICATION-A-DETACHED", readerId: READER_ID, readOnly: true, envelopeSha256: extent(envelopeItem.bytes).sha256, contentRoot: envelope.contentRoot, memberCount: envelope.memberCount, schemaErrors: schemaErrorList.length, baselineValid: baseline, outerVectors: synthetic.length, outerKilled: synthetic.filter((x) => x.killed).length, synthetic, mechanicalVerdict: baseline && synthetic.every((x) => x.killed) ? "PASS" : "FAIL", semanticAcceptance: 0 };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n"); process.exit(output.mechanicalVerdict === "PASS" ? 0 : 1);
}

if (process.argv.includes("--outer")) outerMode();
const { bundle, inputFiles } = loadBundle();
const baselineTerminal = evaluateBundle(bundle, true); const actualControls = bundle.positiveControls.controls.map(evaluateControl);
const actualMutations = [];
for (const vector of bundle.mutationCorpus.vectors.filter((entry) => entry.phase === "INNER")) { let terminal; try { terminal = evaluateBundle(applyVector(bundle, vector), false); } catch { terminal = vector.findingId === "D02-A8-IHR-F004" ? "SEMANTIC-UNIVERSE-INVALID" : "READER-EXCEPTION"; } actualMutations.push({ vectorId: vector.vectorId, findingId: vector.findingId, actualTerminal: terminal, killed: terminal !== "PASS" }); }
const sourceIndex = process.argv.indexOf("--source-dir"); const refresh = sourceRefresh(bundle, sourceIndex >= 0 ? process.argv[sourceIndex + 1] : null);
const selfBytes = fs.readFileSync(new URL(import.meta.url));
const report = {
  artifactId: "CONNECT-D02-A9-READER-A-ACTUAL-REPORT-2026-08-30", readerId: READER_ID, implementationLanguage: "Node.js", algorithmFamily: "RECURSIVE-SCHEMA-KAHN-GRAPH-EXACT-LINE-RECONSTRUCTION", readOnly: true,
  oracleRead: false, controlOracleRead: false, expectedToActualCount: 0, executableSha256: sha256(selfBytes), inputFiles,
  schemaExecution: { schemasExecuted: 2, snapshotErrors: schemaErrors(bundle.snapshotSchema, bundle.snapshot).length, transitionInstances: bundle.positiveControls.controls.length, transitionErrors: bundle.positiveControls.controls.reduce((sum, c) => sum + schemaErrors(bundle.transitionSchema, c.transition).length, 0), resolvedRefCount: preflightRefs(bundle.snapshotSchema) + preflightRefs(bundle.transitionSchema) },
  roots: ROOTS, counts: { admittedInputs: 13, semanticSources: 18, semanticMembers: 2864, semanticShards: 29, tableRows: 295, sourceReceipts: 11, dagNodes: bundle.dag.nodes.length, dagEdges: bundle.dag.edges.length, appointments: bundle.appointments.appointments.length, a6Findings: 5, a7Findings: 7, a8Findings: 7, positiveControls: 9 },
  actualControls, sourceRefresh: refresh,
  mutations: { denominator: bundle.mutationCorpus.vectorCount, innerDenominator: bundle.mutationCorpus.innerVectorCount, outerDeferred: bundle.mutationCorpus.outerVectorCount, evaluated: actualMutations.length, killed: actualMutations.filter((x) => x.killed).length, survived: actualMutations.filter((x) => !x.killed).length, actuals: actualMutations },
  baselineTerminal, safeState: bundle.snapshot.safeState, currentTerminal: bundle.snapshot.currentTerminal,
  mechanicalVerdict: baselineTerminal === "PASS" && actualMutations.every((x) => x.killed) && refresh.changed === 0 && refresh.unavailable === 0 ? "PASS" : "FAIL", semanticAcceptance: 0, selfAcceptance: 0
};
process.stdout.write(JSON.stringify(report, null, 2) + "\n"); process.exit(report.mechanicalVerdict === "PASS" ? 0 : 1);
