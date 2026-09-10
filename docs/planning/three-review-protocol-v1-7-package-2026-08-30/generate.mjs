#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(packageDir, "../../..");
const planningDir = resolve(repositoryRoot, "docs/planning");
const packageLogicalRoot = "docs/planning/three-review-protocol-v1-7-package-2026-08-30";
const artifactId = "CONNECT-THREE-REVIEW-PROTOCOL-V1-7-IMMUTABLE-SUCCESSOR-2026-08-30";

const paths = Object.freeze({
  subject: resolve(packageDir, "subject.md"),
  registry: resolve(packageDir, "normative-registry.json"),
  outputs: resolve(packageDir, "requirement-outputs.jsonl"),
  crosswalk: resolve(packageDir, "closure-crosswalk.jsonl"),
  predecessor: resolve(packageDir, "predecessor-closure.jsonl"),
  predecessorClauses: resolve(packageDir, "predecessor-clause-crosswalk.jsonl"),
  semanticPredicates: resolve(packageDir, "predecessor-semantic-predicates.jsonl"),
  vectors: resolve(packageDir, "causal-vectors.jsonl"),
  graph: resolve(packageDir, "causal-source-graph.json"),
  uses: resolve(packageDir, "semantic-use-index.jsonl"),
  manifest: resolve(packageDir, "normative-package-manifest.json"),
  readerA: resolve(packageDir, "reader-a.mjs"),
  readerB: resolve(packageDir, "reader-b.rb"),
  reportA: resolve(packageDir, "qa-reader-a-report.json"),
  reportB: resolve(packageDir, "qa-reader-b-report.json"),
  producerQA: resolve(packageDir, "producer-qa.md"),
});

const logical = (filename) => `${packageLogicalRoot}/${filename}`;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const u64be = (value) => {
  const out = Buffer.alloc(8);
  out.writeBigUInt64BE(BigInt(value));
  return out;
};
const frame = (...values) => Buffer.concat(values.map((value) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return Buffer.concat([u64be(bytes.length), bytes]);
}));
const rooted = (domain, version, ...values) => sha256(frame(domain, version, ...values));
const canonical = (value) => {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  throw new Error(`non-canonical value type: ${typeof value}`);
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const lineCount = (bytes) => {
  if (bytes.length === 0) return 0;
  let count = 0;
  for (const byte of bytes) if (byte === 10) count += 1;
  return bytes[bytes.length - 1] === 10 ? count : count + 1;
};
const lineNumberAt = (bytes, offset) => {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (bytes[index] === 10) line += 1;
  return line;
};
const writeJson = (path, value) => writeFileSync(path, `${canonical(value)}\n`, "utf8");
const writeJsonl = (path, values) => writeFileSync(path, `${values.map(canonical).join("\n")}\n`, "utf8");
const readJsonl = (path) => readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);

const inputSpecs = Object.freeze([
  ["V16-SUBJECT", "three-review-protocol-v1-6-successor-requirements-2026-08-30.md", "618b18c4ce61f066f7e400fe0ed9d0fec16c08a8a936f7559be1b9f0850b3a34", "PRIMARY-FROZEN"],
  ["V16-REVIEW", "three-review-protocol-v1-6-successor-requirements-independent-hostile-review-2026-08-30.md", "1d20ee7d8fd3dcfaf4a9d82369c38c658f895835c5a0d1b5422f7d0ef8dc55f3", "PRIMARY-FROZEN"],
  ["V16-FINDINGS", "three-review-protocol-v1-6-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md", "acdc17a0ee6b77a0cfa9dda0c00dbd5999e6518488c35667857f25d21517abbb", "PRIMARY-FROZEN"],
  ["V15-SUBJECT", "three-review-protocol-v1-5-successor-requirements-2026-08-29.md", "73c617c9702e3b2c4f68311bb611d4a03cca1c99938fdc7e6937ae718bab713c", "SUPPORTING-EXACT-ROOT"],
  ["V15-FINDINGS", "three-review-protocol-v1-5-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md", "310cdb86dedb5b26a4f948086e13ea42ce1c72c9fe8cf5e55e99612c0162ec85", "SUPPORTING-EXACT-ROOT"],
  ["GOVERNING-THREE-REVIEW", "master-plan-three-review-reconciliation-protocol-2026-08-29.md", "6f08bf3a00c995503a37ff930a826d915d85591277908b7813e52a0a6b6b8539", "SUPPORTING-EXACT-ROOT"],
  ["ELIGIBILITY-ASSESSMENT", "three-review-intake-and-reconciliation-eligibility-assessment-2026-08-29.md", "f970f0d62e4c62bf17f417967f2baebcbed78ef393e4622bfe3b85d5e10e4b08", "SUPPORTING-EXACT-ROOT"],
  ["B0-PROCEDURE", "bootstrap-authority-envelope-b0-successor-requirements-v3-2026-08-29.md", "872ffc806ac35614a9cba33cc9cbe5bc1a0f0cf7675d578183a60ca55d9611e9", "SUPPORTING-EXACT-ROOT"],
  ["PUBLIC-CYBER-POLICY", "public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md", "322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a", "SUPPORTING-EXACT-ROOT"],
]);

const carriers = inputSpecs.map(([carrierId, filename, expectedRoot, inputClass]) => {
  const physicalPath = resolve(planningDir, filename);
  const bytesValue = readFileSync(physicalPath);
  const observedRoot = sha256(bytesValue);
  assert(observedRoot === expectedRoot, `frozen input changed: ${carrierId}`);
  const path = `docs/planning/${filename}`;
  assert(!isAbsolute(path) && !path.startsWith("web/") && !path.split("/").includes(".."), `invalid logical path: ${path}`);
  assert(relative(repositoryRoot, physicalPath) === path, `repository-root mismatch: ${carrierId}`);
  return {
    bytes: bytesValue.length,
    carrierId,
    custodyLocator: `${path}@sha256:${observedRoot}`,
    inputClass,
    lines: lineCount(bytesValue),
    mediaType: "text/markdown;charset=utf-8",
    path,
    root: observedRoot,
    bytesValue,
  };
});
const carrierById = new Map(carriers.map((carrier) => [carrier.carrierId, carrier]));

const splitBufferLines = (bytes) => {
  const result = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 10) {
      result.push({ byteStart: start, byteEndExclusive: index + 1, bytes: bytes.subarray(start, index + 1) });
      start = index + 1;
    }
  }
  if (start < bytes.length) result.push({ byteStart: start, byteEndExclusive: bytes.length, bytes: bytes.subarray(start) });
  return result;
};

const findHeadingBlocks = (bytes, headingPattern, boundaryPattern) => {
  const text = bytes.toString("utf8");
  const matches = [...text.matchAll(headingPattern)];
  const boundaries = [...text.matchAll(boundaryPattern)].map((match) => match.index);
  return matches.map((match, index) => {
    const prefixBytes = Buffer.byteLength(text.slice(0, match.index), "utf8");
    const nextIndex = boundaries.find((boundary) => boundary > match.index) ?? text.length;
    const byteEnd = Buffer.byteLength(text.slice(0, nextIndex), "utf8");
    return {
      byteEndExclusive: byteEnd,
      byteStart: prefixBytes,
      memberId: match[1],
      ordinal: index + 1,
      selected: bytes.subarray(prefixBytes, byteEnd),
      title: match[2]?.trim() ?? match[1],
    };
  });
};

const v16Subject = carrierById.get("V16-SUBJECT");
const v16Findings = carrierById.get("V16-FINDINGS");
const v16PredecessorRows = splitBufferLines(v16Subject.bytesValue)
  .map((line) => ({ ...line, text: line.bytes.toString("utf8").trimEnd() }))
  .filter((line) => line.text.startsWith("{") && line.text.includes('"rowId":"MPRR-V16-XW-'))
  .map((line) => ({ ...line, row: JSON.parse(line.text) }));
const requirementBlocks = findHeadingBlocks(v16Subject.bytesValue, /^## 2\.\d+ `(MPRR-V16-REQ-\d{3})` — (.+)$/gm, /^#{1,2} /gm);
const findingBlocks = findHeadingBlocks(v16Findings.bytesValue, /^### \d+\.\d+ (MPRR-V16-IHR-F\d{3}) — (.+)$/gm, /^#{1,3} /gm);
assert(requirementBlocks.length === 112, `requirement denominator ${requirementBlocks.length}`);
assert(findingBlocks.length === 31, `finding denominator ${findingBlocks.length}`);
assert(v16PredecessorRows.length === 323, `predecessor crosswalk denominator ${v16PredecessorRows.length}`);

const predecessorNamespaceSpecs = Object.freeze({
  V15HR: { carrierId: "V15-FINDINGS", namespaceId: "V15-FINDINGS" },
  V15REQ: { carrierId: "V15-SUBJECT", namespaceId: "V15-REQUIREMENTS" },
  V15XW: { carrierId: "V15-SUBJECT", namespaceId: "V15-CROSSWALK" },
});
const predecessorBlocksByNamespace = new Map();
for (const namespaceSpec of Object.values(predecessorNamespaceSpecs)) predecessorBlocksByNamespace.set(namespaceSpec.namespaceId, []);
for (const { row } of v16PredecessorRows) {
  const namespaceSpec = predecessorNamespaceSpecs[row.sourceNamespaceId];
  assert(namespaceSpec, `unknown predecessor namespace ${row.sourceNamespaceId}`);
  const carrier = carrierById.get(namespaceSpec.carrierId);
  const spanMatch = String(row.sourceSpan).match(/^(\d+)-(\d+)$/);
  assert(spanMatch, `non-numeric predecessor member span ${row.rowId}`);
  const byteStart = Number(spanMatch[1]);
  const byteEndExclusive = Number(spanMatch[2]);
  const selected = carrier.bytesValue.subarray(byteStart, byteEndExclusive);
  assert(byteStart >= 0 && byteEndExclusive > byteStart && byteEndExclusive <= carrier.bytes, `invalid predecessor member span ${row.rowId}`);
  assert(sha256(selected) === row.sourceMemberDigest, `predecessor member digest mismatch ${row.rowId}`);
  predecessorBlocksByNamespace.get(namespaceSpec.namespaceId).push({ byteEndExclusive, byteStart, memberId: row.sourceMemberId, selected });
}
for (const [namespaceId, blocks] of predecessorBlocksByNamespace) {
  assert(new Set(blocks.map((block) => block.memberId)).size === blocks.length, `duplicate predecessor members ${namespaceId}`);
}

const parserProfileCores = [
  {
    profileId: "WHOLE-CARRIER-1",
    mode: "WHOLE-CARRIER",
    repositoryRootRule: "resolve logical path exactly from the directory that directly contains docs/; no fallback, prefix deletion, parent traversal or alternate root",
    selectionRule: "byteStart=0;byteEndExclusive=carrier byte length;lineStartInclusive=1;lineEndExclusive=carrier line count plus one",
  },
  {
    profileId: "V16-REQUIREMENT-BLOCK-1",
    mode: "MARKDOWN-HEADING-BLOCK",
    repositoryRootRule: "resolve logical path exactly from the directory that directly contains docs/; no fallback, prefix deletion, parent traversal or alternate root",
    selectionRule: "start at UTF-8 bytes of a line matching ^## 2.[0-9]+ `MPRR-V16-REQ-[0-9]{3}`; end at the next such heading; byte and line ranges are half-open",
  },
  {
    profileId: "V16-FINDING-BLOCK-1",
    mode: "MARKDOWN-HEADING-BLOCK",
    repositoryRootRule: "resolve logical path exactly from the directory that directly contains docs/; no fallback, prefix deletion, parent traversal or alternate root",
    selectionRule: "start at UTF-8 bytes of a line matching ^### [0-9]+.[0-9]+ MPRR-V16-IHR-F[0-9]{3}; end at the next such heading; byte and line ranges are half-open",
  },
  {
    profileId: "V15-PREDECESSOR-EXACT-SPAN-1",
    mode: "FROZEN-CROSSWALK-NUMERIC-SPAN",
    repositoryRootRule: "resolve logical path exactly from the directory that directly contains docs/; no fallback, prefix deletion, parent traversal or alternate root",
    selectionRule: "select the exact zero-based half-open sourceSpan carried by immutable MPRR-V16-XW-001..323; verify selected bytes against sourceMemberDigest before construction",
  },
];
const parserProfiles = parserProfileCores.map((core) => ({
  ...core,
  parserProfileRoot: rooted("MPRR-V17-PARSER-PROFILE", "1", canonical(core)),
  schemaVersion: "1",
  versionFraming: "CPB1 second framed field; never appended to domain",
}));
const parserById = new Map(parserProfiles.map((profile) => [profile.profileId, profile]));

const memberCoreFor = (namespaceId, carrier, parserProfileId, block) => {
  const core = {
    byteEndExclusive: block.byteEndExclusive,
    byteStart: block.byteStart,
    carrierId: carrier.carrierId,
    carrierRoot: carrier.root,
    lineEndExclusive: lineNumberAt(carrier.bytesValue, block.byteEndExclusive),
    lineStartInclusive: lineNumberAt(carrier.bytesValue, block.byteStart),
    memberDigest: sha256(block.selected),
    memberId: block.memberId,
    namespaceId,
    parserProfileRoot: parserById.get(parserProfileId).parserProfileRoot,
    schema: "MPRR-V17-MEMBER-CORE-1",
  };
  return { ...core, memberCoreRoot: rooted("MPRR-V17-MEMBER-CORE", "1", canonical(core)) };
};

const namespaceSpecs = [
  ["V16-REQUIREMENTS", v16Subject, "V16-REQUIREMENT-BLOCK-1", requirementBlocks, "MPRR-V16-REQ-[0-9]{3}"],
  ["V16-FINDINGS", v16Findings, "V16-FINDING-BLOCK-1", findingBlocks, "MPRR-V16-IHR-F[0-9]{3}"],
  ["V15-FINDINGS", carrierById.get("V15-FINDINGS"), "V15-PREDECESSOR-EXACT-SPAN-1", predecessorBlocksByNamespace.get("V15-FINDINGS"), "MPRR-V15-HR-F[0-9]{3}"],
  ["V15-REQUIREMENTS", carrierById.get("V15-SUBJECT"), "V15-PREDECESSOR-EXACT-SPAN-1", predecessorBlocksByNamespace.get("V15-REQUIREMENTS"), "MPRR-V15-REQ-[0-9]{3}"],
  ["V15-CROSSWALK", carrierById.get("V15-SUBJECT"), "V15-PREDECESSOR-EXACT-SPAN-1", predecessorBlocksByNamespace.get("V15-CROSSWALK"), "MPRR-V15-XW-[0-9]{3}"],
  ...carriers.map((carrier) => [
    `CARRIER-${carrier.carrierId}`,
    carrier,
    "WHOLE-CARRIER-1",
    [{ byteEndExclusive: carrier.bytes, byteStart: 0, memberId: `CARRIER-${carrier.carrierId}`, selected: carrier.bytesValue }],
    `CARRIER-${carrier.carrierId}`,
  ]),
];
const sourceMembers = [];
const sourceNamespaces = [];
for (const [namespaceId, carrier, parserProfileId, blocks, selector] of namespaceSpecs) {
  const cores = blocks.map((block) => memberCoreFor(namespaceId, carrier, parserProfileId, block));
  const memberSetRoot = rooted("MPRR-V17-MEMBER-SET", "1", ...cores.map((core) => core.memberCoreRoot).sort());
  const namespaceCore = {
    carrierId: carrier.carrierId,
    carrierRoot: carrier.root,
    custodyLocator: carrier.custodyLocator,
    memberCount: cores.length,
    memberSetRoot,
    namespaceId,
    parserProfileRoot: parserById.get(parserProfileId).parserProfileRoot,
    schema: "MPRR-V17-NAMESPACE-CORE-1",
    selector,
  };
  const namespaceRoot = rooted("MPRR-V17-NAMESPACE", "1", canonical(namespaceCore));
  sourceNamespaces.push({ ...namespaceCore, namespaceRoot });
  cores.forEach((core) => sourceMembers.push({ ...core, namespaceRoot }));
}
const sourceMemberByKey = new Map(sourceMembers.map((member) => [`${member.namespaceId}/${member.memberId}`, member]));

const requirementFieldNames = ["statement", "defectCauseImpact", "requiredProofPredicate", "dependencies", "sourceBasis"];
const parseRequirementFields = (block) => {
  const text = block.selected.toString("utf8");
  const fields = {};
  for (const field of requirementFieldNames) {
    const match = text.match(new RegExp("^\\d+\\.\\d+\\.[1-5] `" + field + "`: (.*)$", "m"));
    assert(match, `missing ${field} in ${block.memberId}`);
    fields[field] = match[1];
  }
  return fields;
};

const severityByFinding = Object.fromEntries(findingBlocks.map((block) => {
  const match = block.selected.toString("utf8").match(/^\d+\.\d+\.1 severity=(P[0-3])\.$/m);
  assert(match, `missing severity ${block.memberId}`);
  return [block.memberId, match[1]];
}));

const findingImplementation = Object.freeze({
  F001: ["REPO-ROOT-RESOLVER", "SOURCE-CARRIER-VERIFIER"],
  F002: ["MEMBER-CORE-CONSTRUCTOR", "MEMBER-SET-CONSTRUCTOR", "NAMESPACE-CONSTRUCTOR"],
  F003: ["REQUIREMENT-OUTPUT-CONSTRUCTOR", "OUTPUT-CUSTODY-VERIFIER"],
  F004: ["SCHEMA-AST-REFERENCE-DISCOVERY", "SEMANTIC-USE-INDEX-COMPARATOR"],
  F005: ["IMMUTABLE-SOURCE-CONJUNCT-SELECTOR", "EXTERNAL-TARGET-EVIDENCE-BINDER"],
  F006: ["SOURCE-BYTE-MUTATOR", "SOURCE-GRAPH-EVALUATOR"],
  F007: ["POLICY-REGISTRY-RESOLVER", "POLICY-BYTE-ROOT-VERIFIER"],
  F008: ["READER-PROVENANCE-VERIFIER", "EXTERNAL-APPOINTMENT-GATE"],
  F009: ["THREE-ENVELOPE-VALIDATOR", "RECONCILIATION-QUORUM-EVALUATOR"],
  F010: ["ROLE-INSTANCE-VALIDATOR", "SEPARATION-ELIGIBILITY-EVALUATOR"],
  F011: ["GOVERNING-CONTRACT-CUSTODY", "REVIEW-ENVELOPE-VALIDATOR"],
  F012: ["CLOSED-DEPENDENCY-DISCOVERY", "INSTRUMENTED-READ-COMPARATOR"],
  F013: ["COMPLETE-PRECOMMIT-OPERATION-KEY-CONSTRUCTOR", "REPLAY-EVALUATOR"],
  F014: ["DETACHED-BINDING-EVALUATOR", "PRE-CAS-ABORT-GATE"],
  F015: ["COMPLETE-CAS-COMPARISON-SET", "ATOMIC-CAS-EVALUATOR"],
  F016: ["POST-READBACK-EVALUATOR", "ATOMIC-PERMIT-REVOCATION", "CONSUMER-REVOCATION-CHECK"],
  F017: ["LIFECYCLE-TERMINAL-MAPPER", "NEGATIVE-AUTHORITY-ZERO-CHECK"],
  F018: ["SIGNED-RISK-DISPOSITION-VALIDATOR", "HUMAN-APPROVAL-GATE"],
  F019: ["CPB1-SEPARATE-VERSION-SERIALIZER", "CROSS-LANGUAGE-CANONICAL-VECTORS"],
  F020: ["HALF-OPEN-LINE-SPAN-VERIFIER", "BYTE-LINE-EQUIVALENCE-CHECK"],
  F021: ["NUMERIC-CONJUNCT-SPAN-SELECTOR", "CONJUNCT-DIGEST-VERIFIER"],
  F022: ["OBSERVED-STATE-FAILURE-EVALUATOR", "TOTAL-TERMINAL-SELECTOR"],
  F023: ["GUARD-REGISTRY-EVALUATOR", "TOTAL-MACHINE-MODEL-CHECKER"],
  F024: ["TRUST-RECORD-VALIDATOR", "TRUST-REVOCATION-EVALUATOR"],
  F025: ["CLOCK-QUORUM-EVALUATOR", "SPLIT-AND-ROLLBACK-DETECTOR"],
  F026: ["FINALITY-RECEIPT-VALIDATOR", "CONFLICT-AND-ROLLBACK-DETECTOR"],
  F027: ["GENERATED-NORMATIVE-REVIEW-MACHINE", "EXHAUSTIVE-STATE-EVENT-CHECK"],
  F028: ["CUSTODY-ATOMIC-TRANSITION-PRODUCER", "HOLD-DELETE-RACE-EVALUATOR"],
  F029: ["FIXED-PUBLIC-PROJECTION-EVALUATOR", "FIELD-CLASS-NONINTERFERENCE-CHECK"],
  F030: ["ALL-FAMILY-VECTOR-RUNNER", "ALL-FAMILY-MODEL-CHECKER"],
  F031: ["BOUNDED-MEDIA-VALIDATOR", "QUARANTINE-RECEIPT-PRODUCER"],
});

const controlSchemaRefs = Object.freeze({
  F001: ["SCHEMA-SOURCE-CARRIER", "SCHEMA-REPOSITORY-ROOT-POLICY"],
  F002: ["SCHEMA-MEMBER-CORE", "SCHEMA-NAMESPACE-CORE"],
  F003: ["SCHEMA-REQUIREMENT-OUTPUT"],
  F004: ["SCHEMA-SEMANTIC-USE"],
  F005: ["SCHEMA-CLOSURE-ROW", "SCHEMA-SOURCE-CONJUNCT", "SCHEMA-PREDECESSOR-CLAUSE-ROW", "SCHEMA-SEMANTIC-PREDICATE"],
  F006: ["SCHEMA-SOURCE-GRAPH-OBSERVATION"],
  F007: ["SCHEMA-POLICY-RECORD"],
  F008: ["SCHEMA-READER-PROVENANCE", "SCHEMA-READER-APPOINTMENT"],
  F009: ["SCHEMA-REVIEW-ENVELOPE", "SCHEMA-RECONCILIATION-RECEIPT"],
  F010: ["SCHEMA-ROLE-INSTANCE", "SCHEMA-APPOINTMENT", "SCHEMA-ELIGIBILITY-DECISION"],
  F011: ["SCHEMA-REVIEW-ENVELOPE", "SCHEMA-REVIEW-SEAL"],
  F012: ["SCHEMA-DEPENDENCY-UNIVERSE", "SCHEMA-DEPENDENCY-PROOF"],
  F013: ["SCHEMA-PRECOMMIT-ENVELOPE", "SCHEMA-REPLAY-RECEIPT"],
  F014: ["SCHEMA-DETACHED-BINDING"],
  F015: ["SCHEMA-CAS-COMPARISON", "SCHEMA-COMMIT-RECEIPT"],
  F016: ["SCHEMA-PERMIT", "SCHEMA-PERMIT-REVOCATION", "SCHEMA-POST-READBACK"],
  F017: ["SCHEMA-LIFECYCLE-TERMINAL"],
  F018: ["SCHEMA-RISK-DISPOSITION", "SCHEMA-HUMAN-APPROVAL"],
  F019: ["SCHEMA-CPB1"],
  F020: ["SCHEMA-MEMBER-CORE"],
  F021: ["SCHEMA-SOURCE-CONJUNCT", "SCHEMA-PREDECESSOR-CLAUSE-ROW", "SCHEMA-SEMANTIC-PREDICATE"],
  F022: ["SCHEMA-FAILURE-OBSERVATION", "SCHEMA-FAILURE-CONDITION"],
  F023: ["SCHEMA-GUARD", "SCHEMA-CONTROL-MACHINE", "SCHEMA-CONTROL-TRANSITION"],
  F024: ["SCHEMA-KEY-RECORD", "SCHEMA-SIGNATURE-RECORD", "SCHEMA-TRUST-ANCHOR-SET", "SCHEMA-ALGORITHM-POLICY"],
  F025: ["SCHEMA-CLOCK-OBSERVATION", "SCHEMA-TIME-RECEIPT"],
  F026: ["SCHEMA-FINALITY-CHECKPOINT", "SCHEMA-FINALITY-RECEIPT"],
  F027: ["SCHEMA-CONTROL-MACHINE", "SCHEMA-CONTROL-TRANSITION"],
  F028: ["SCHEMA-CUSTODY-CONTENT", "SCHEMA-LEGAL-HOLD", "SCHEMA-DELETION-PLAN", "SCHEMA-CUSTODY-CONFLICT", "SCHEMA-CUSTODY-RECEIPT", "SCHEMA-DELETION-RECEIPT", "SCHEMA-TOMBSTONE"],
  F029: ["SCHEMA-PUBLIC-PROJECTION-POLICY", "SCHEMA-PUBLIC-WRITE-INTENT"],
  F030: ["SCHEMA-CAUSAL-VECTOR", "SCHEMA-MODEL-CHECK-RESULT"],
  F031: ["SCHEMA-MEDIA-INPUT", "SCHEMA-MEDIA-LIMITS", "SCHEMA-DECODER-IDENTITY", "SCHEMA-MEDIA-VALIDATION-RECEIPT", "SCHEMA-QUARANTINE-RECEIPT"],
});

const schema = (schemaId, requiredFields, fieldTypes = {}) => ({
  fieldTypes,
  malformedDisposition: "BLOCK-BEFORE-AUTHORITY",
  requiredFields,
  schemaId,
  schemaVersion: "1",
  unknownFieldPolicy: "REJECT",
});
const schemas = [
  schema("SCHEMA-CPB1", ["domain", "version", "orderedFields"], { domain: "UTF8", orderedFields: "ARRAY<BYTES>", version: "UTF8" }),
  schema("SCHEMA-REPOSITORY-ROOT-POLICY", ["logicalRoot", "resolverRule", "forbiddenPrefixes"], { forbiddenPrefixes: "SET<UTF8>", logicalRoot: "UTF8", resolverRule: "UTF8" }),
  schema("SCHEMA-SOURCE-CARRIER", ["carrierId", "path", "root", "bytes", "lines", "mediaType", "inputClass", "custodyLocator"]),
  schema("SCHEMA-MEMBER-CORE", ["schema", "namespaceId", "memberId", "carrierId", "carrierRoot", "parserProfileRoot", "byteStart", "byteEndExclusive", "lineStartInclusive", "lineEndExclusive", "memberDigest"]),
  schema("SCHEMA-NAMESPACE-CORE", ["schema", "namespaceId", "carrierId", "carrierRoot", "parserProfileRoot", "memberSetRoot", "memberCount", "selector", "custodyLocator"]),
  schema("SCHEMA-REQUIREMENT-OUTPUT", ["outputId", "requirementId", "predecessorRequirementId", "sourceMemberDigest", "sourceMemberCoreRoot", "canonicalFiveFieldValues", "canonicalFiveFieldDigestVector", "constructorInputs", "outputRoot", "producerReceiptRoot", "custodyLocator", "independentReceiptBlockId"]),
  schema("SCHEMA-SEMANTIC-USE", ["useId", "artifactPath", "jsonPointer", "referenceField", "targetId", "targetKind", "resolution"]),
  schema("SCHEMA-CLOSURE-ROW", ["crosswalkId", "sourceFindingId", "sourceMemberDigest", "sourceConjuncts", "targetControlId", "targetControlRoot", "vectorIds", "producerImplementationState", "independentSemanticReceiptBlockId", "acceptanceCredit"]),
  schema("SCHEMA-SOURCE-CONJUNCT", ["conjunctId", "field", "absoluteByteStart", "absoluteByteEndExclusive", "memberRelativeByteStart", "memberRelativeByteEndExclusive", "digest", "sourceLocator"]),
  schema("SCHEMA-PREDECESSOR-CLAUSE-ROW", ["predecessorCrosswalkId", "sourceRowId", "sourceNamespaceId", "sourceMemberId", "sourceMemberCoreRoot", "sourceMemberDigest", "sourceConjuncts", "predicateIds", "predicateRoots", "targetOutputIds", "targetOutputRoots", "vectorIds", "mergePolicy", "producerImplementationState", "independentSemanticReceiptBlockId", "acceptanceCredit", "predecessorCrosswalkRoot"]),
  schema("SCHEMA-SEMANTIC-PREDICATE", ["predicateId", "predecessorCrosswalkId", "sourceConjunct", "relation", "translatedTargetClauses", "targetOutputIds", "independentSemanticReceiptBlockId", "acceptanceCredit", "predicateRoot"]),
  schema("SCHEMA-SOURCE-GRAPH-OBSERVATION", ["sourcePath", "byteStart", "byteEndExclusive", "expectedDigest", "observedDigest", "pathResolvedFromRepositoryRoot"]),
  schema("SCHEMA-POLICY-RECORD", ["policyId", "policyVersion", "policyBytes", "policyRoot", "custodyLocator"]),
  schema("SCHEMA-READER-PROVENANCE", ["readerId", "implementationRoot", "language", "toolchainVersion", "environmentRoot", "derivationFamily", "sharedProducerLibraryRoots", "appointmentBlockId"]),
  schema("SCHEMA-READER-APPOINTMENT", ["appointmentId", "issuerRoot", "readerPrincipalRoot", "subjectRoot", "scope", "validFromTimeRoot", "validUntilTimeRoot", "revocationHeadRoot", "signatureRoot"]),
  schema("SCHEMA-ROLE-INSTANCE", ["roleInstanceId", "role", "principalRoot", "appointmentRoot", "subjectRoot", "generation", "dimensionEvidenceRoots"]),
  schema("SCHEMA-APPOINTMENT", ["appointmentId", "issuerRoot", "principalRoot", "role", "subjectRoot", "generation", "validityIntervalRoot", "revocationHeadRoot", "signatureRoot"]),
  schema("SCHEMA-ELIGIBILITY-DECISION", ["decisionId", "leftRoleInstanceRoot", "rightRoleInstanceRoot", "dimensionResults", "eligible", "decisionAuthorityRoot", "signatureRoot"]),
  schema("SCHEMA-REVIEW-ENVELOPE", ["reviewId", "domain", "reviewerRoleInstanceRoot", "independenceDecisionRoots", "instructionRoot", "subjectPath", "subjectRoot", "observedSubjectBytes", "toolchainRoots", "startedTimeRoot", "sealedTimeRoot", "generation", "findingManifestRoot", "rawEvidenceRoot", "sealRoot"]),
  schema("SCHEMA-REVIEW-SEAL", ["reviewRoot", "reviewerPrincipalRoot", "appointmentRoot", "subjectRoot", "generation", "trustedTimeRoot", "signatureRoot", "revocationHeadRoot"]),
  schema("SCHEMA-RECONCILIATION-RECEIPT", ["reconciliationId", "subjectRoot", "generation", "threeDistinctReviewRoots", "comparisonRoot", "conflictRoot", "quorumDecision", "reconcilerRoleInstanceRoot", "trustedTimeRoot", "sealRoot"]),
  schema("SCHEMA-RISK-DISPOSITION", ["riskDispositionId", "findingId", "severity", "subjectRoot", "generation", "threeReviewerRecommendationRoots", "ownerRoleInstanceRoot", "dispositionTextRoot", "humanApprovalRoot", "validFromTimeRoot", "validUntilTimeRoot", "revocationHeadRoot", "signatureRoot"]),
  schema("SCHEMA-HUMAN-APPROVAL", ["approvalId", "approverRoleInstanceRoot", "operationKey", "subjectRoot", "riskDispositionRoots", "validityIntervalRoot", "revocationHeadRoot", "signatureRoot"]),
  schema("SCHEMA-DEPENDENCY-UNIVERSE", ["universeId", "discoveryAuthorityRoot", "familyRecords", "instrumentedReadSetRoot", "universeHeadRoot", "membershipProofs", "nonMembershipProofPolicy", "revocationHeadRoots"]),
  schema("SCHEMA-DEPENDENCY-PROOF", ["familyId", "memberId", "memberRoot", "sortedUniverse", "universeHeadRoot"]),
  schema("SCHEMA-PRECOMMIT-ENVELOPE", ["candidateRoot", "subjectRoot", "expectedProtocolHead", "externalB0ProcedureRoot", "consumedB0AuthorityRoot", "threeReviewRoots", "reconciliationRoot", "humanApprovalRoot", "riskDispositionRoots", "dependencyUniverseHead", "dependencyMemberHeads", "revocationHeads", "trustReceiptRoot", "clockReceiptRoot", "finalityReceiptRoot", "publicPolicyRoot", "appealStateRoot", "operationPurpose", "operationEpoch"]),
  schema("SCHEMA-DETACHED-BINDING", ["bindingId", "leftPath", "operator", "rightPath", "failureTerminal"]),
  schema("SCHEMA-CAS-COMPARISON", ["comparisonId", "memberId", "expectedRoot", "observedRoot", "revocationHead", "state"]),
  schema("SCHEMA-COMMIT-RECEIPT", ["operationKey", "precommitEnvelopeRoot", "comparisonSetRoot", "durableMemberRoots", "issuedPermitRoot", "commitSequence", "commitStateRoot"]),
  schema("SCHEMA-REPLAY-RECEIPT", ["operationKey", "requestEnvelopeRoot", "originalCommitReceiptRoot", "replayDecision", "headSnapshotRoot"]),
  schema("SCHEMA-PERMIT", ["permitId", "operationKey", "subjectRoot", "commitReceiptRoot", "issuedAtTimeRoot", "validUntilTimeRoot", "revocationHeadRoot", "state"]),
  schema("SCHEMA-PERMIT-REVOCATION", ["permitRoot", "reason", "divergenceRoot", "previousRevocationHeadRoot", "newRevocationHeadRoot", "revokedAtTimeRoot", "signatureRoot"]),
  schema("SCHEMA-POST-READBACK", ["commitReceiptRoot", "expectedDurableRoot", "observedDurableRoot", "divergence", "permitRevocationRoot", "consumerFenceRoot"]),
  schema("SCHEMA-FAILURE-OBSERVATION", ["sourceGraphValid", "canonicalValid", "outputValid", "semanticUseValid", "reviewValid", "independenceValid", "dependencyFresh", "trustValid", "clockValid", "finalityValid", "riskValid", "custodyValid", "publicSafe", "mediaSafe", "casMatched", "readbackConsistent"]),
  schema("SCHEMA-FAILURE-CONDITION", ["conditionId", "observationSchemaId", "path", "operator", "operand", "malformedDisposition", "terminalId", "precedence"]),
  schema("SCHEMA-GUARD", ["guardId", "contextSchemaId", "expression", "trueDisposition", "falseDisposition", "malformedDisposition"]),
  schema("SCHEMA-CONTROL-MACHINE", ["machineId", "contextSchemaId", "initialState", "states", "events", "terminalStates", "transitionKeyRule", "unknownDisposition"]),
  schema("SCHEMA-CONTROL-TRANSITION", ["transitionId", "machineId", "fromState", "event", "guardId", "toState", "authorityEffect", "terminalId"]),
  schema("SCHEMA-LIFECYCLE-TERMINAL", ["state", "terminalId", "resultStatus", "authorityEffect"]),
  schema("SCHEMA-KEY-RECORD", ["keyId", "algorithmPolicyRoot", "issuerRoot", "audience", "purpose", "epoch", "validFromTimeRoot", "validUntilTimeRoot", "revocationHeadRoot", "transparencyCheckpointRoot", "publicKeyBytesRoot"]),
  schema("SCHEMA-SIGNATURE-RECORD", ["signatureId", "keyId", "algorithm", "domain", "payloadRoot", "signatureBytesRoot"]),
  schema("SCHEMA-TRUST-ANCHOR-SET", ["anchorSetId", "issuerRoots", "algorithmPolicyRoot", "epoch", "revocationHeadRoot", "transparencyCheckpointRoot", "authoritySealRoot"]),
  schema("SCHEMA-ALGORITHM-POLICY", ["policyId", "version", "allowedAlgorithms", "forbiddenAlgorithms", "downgradePolicy", "externalAuthorityBlockId"]),
  schema("SCHEMA-CLOCK-OBSERVATION", ["sourceId", "sourceAppointmentRoot", "epoch", "counter", "lowerBoundNs", "upperBoundNsExclusive", "observedAtMonotonicCounter", "signatureRoot", "revocationHeadRoot"]),
  schema("SCHEMA-TIME-RECEIPT", ["observationRoots", "quorum", "intersectionLowerBoundNs", "intersectionUpperBoundNsExclusive", "freshnessLimitNs", "skewNs", "epoch", "rollbackDetected", "splitDetected", "receiptRoot"]),
  schema("SCHEMA-FINALITY-CHECKPOINT", ["sourceId", "sequence", "universeRoot", "previousCheckpointRoot", "confirmationRuleRoot", "observedTimeRoot", "signatureRoot", "revocationHeadRoot"]),
  schema("SCHEMA-FINALITY-RECEIPT", ["checkpointRoots", "membershipProofRoots", "consistencyProofRoots", "conflictEvidenceRoots", "decision", "receiptRoot"]),
  schema("SCHEMA-CUSTODY-CONTENT", ["contentId", "contentRoot", "custodyClass", "replicaSetRoot", "retentionPolicyRoot", "legalHoldHeadRoot", "deletionHeadRoot", "state"]),
  schema("SCHEMA-LEGAL-HOLD", ["holdId", "contentId", "authorityRoot", "scopeRoot", "effectiveTimeRoot", "releaseTimeRoot", "revocationHeadRoot", "signatureRoot"]),
  schema("SCHEMA-DELETION-PLAN", ["planId", "contentId", "expectedContentRoot", "replicaSetRoot", "legalHoldHeadRoot", "deletionHeadRoot", "retentionPolicyRoot", "authorizedTimeRoot", "authorityRoot", "signatureRoot"]),
  schema("SCHEMA-CUSTODY-CONFLICT", ["conflictId", "contentId", "leftHeadRoot", "rightHeadRoot", "conflictClass", "observedTimeRoot", "authorityEffect"]),
  schema("SCHEMA-CUSTODY-RECEIPT", ["receiptId", "contentId", "fromState", "event", "toState", "legalHoldHeadRoot", "deletionHeadRoot", "replicaSetRoot", "conflictRoot", "trustedTimeRoot", "signatureRoot"]),
  schema("SCHEMA-DELETION-RECEIPT", ["contentId", "deletionPlanRoot", "replicaReceiptRoots", "keyErasureReceiptRoots", "tombstoneRoot", "completedTimeRoot", "conflictRoot"]),
  schema("SCHEMA-TOMBSTONE", ["contentId", "destroyedContentRoot", "cutoffRoot", "restoreFenceRoot", "previousTombstoneRoot", "signatureRoot"]),
  schema("SCHEMA-PUBLIC-PROJECTION-POLICY", ["policyId", "repositoryState", "onlyAllowedBytes", "forbiddenFieldClasses", "privateEvidenceCustody", "dictionaryVersionBlockId", "externalSealBlockId"]),
  schema("SCHEMA-PUBLIC-WRITE-INTENT", ["surfaceId", "payloadBytes", "fieldClasses", "policyRoot", "privateEvidenceReferenceRoot", "decision"]),
  schema("SCHEMA-MEDIA-INPUT", ["mediaId", "contentRoot", "byteLength", "declaredCodec", "width", "height", "frameCount", "decoderIdentityRoot"]),
  schema("SCHEMA-MEDIA-LIMITS", ["policyId", "maxEncodedBytes", "maxDecodedBytes", "maxWidth", "maxHeight", "maxPixels", "maxFrames", "allowedCodecSet", "approvedDecoderRoots", "timeoutBudgetMs"]),
  schema("SCHEMA-DECODER-IDENTITY", ["decoderId", "implementationRoot", "toolchainRoot", "sandboxPolicyRoot", "resourcePolicyRoot", "appointmentRoot", "revocationHeadRoot", "signatureRoot"]),
  schema("SCHEMA-MEDIA-VALIDATION-RECEIPT", ["mediaRoot", "policyRoot", "decoderRoot", "metadataRoot", "resourceObservationRoot", "decision", "trustedTimeRoot", "revocationHeadRoot", "signatureRoot"]),
  schema("SCHEMA-QUARANTINE-RECEIPT", ["mediaRoot", "reasonCode", "policyRoot", "decoderRoot", "resourceObservationRoot", "custodyRoot", "authorityEffect"]),
  schema("SCHEMA-CAUSAL-VECTOR", ["vectorId", "findingIds", "family", "kind", "fixtureClass", "fixture", "program", "expectedTerminal", "expectedAuthorityOutputs"]),
  schema("SCHEMA-MODEL-CHECK-RESULT", ["machineId", "stateEventPairs", "ambiguousPairs", "unhandledPairs", "undefinedGuards", "unreachableRequiredStates", "negativeToSuccess"]),
].map((core) => ({ ...core, schemaRoot: rooted("MPRR-V17-SCHEMA", "1", canonical(core)) }));

const externalInputSpecs = [
  ["EXT-B0-ADMISSION", "ExternalB0AdmissionReceipt-1", "external B0 authority has not been issued"],
  ["EXT-REVIEWER-A-APPOINTMENT", "SCHEMA-APPOINTMENT", "reviewer A appointment is unknown/unavailable"],
  ["EXT-REVIEWER-B-APPOINTMENT", "SCHEMA-APPOINTMENT", "reviewer B appointment is unknown/unavailable"],
  ["EXT-REVIEWER-C-APPOINTMENT", "SCHEMA-APPOINTMENT", "reviewer C appointment is unknown/unavailable"],
  ["EXT-REVIEW-A-ENVELOPE", "SCHEMA-REVIEW-ENVELOPE", "independent Review A is unknown/unavailable"],
  ["EXT-REVIEW-B-ENVELOPE", "SCHEMA-REVIEW-ENVELOPE", "independent Review B is unknown/unavailable"],
  ["EXT-REVIEW-C-ENVELOPE", "SCHEMA-REVIEW-ENVELOPE", "independent Review C is unknown/unavailable"],
  ["EXT-RECONCILIATION", "SCHEMA-RECONCILIATION-RECEIPT", "independent reconciliation receipt is unknown/unavailable"],
  ["EXT-HUMAN-APPROVAL", "SCHEMA-HUMAN-APPROVAL", "HumanApproval is unknown/unavailable"],
  ["EXT-TRUST-ANCHORS", "SCHEMA-TRUST-ANCHOR-SET", "externally authoritative trust anchors are unknown/unavailable"],
  ["EXT-CLOCK-OBSERVATIONS", "SET<SCHEMA-CLOCK-OBSERVATION>", "signed clock-source observations are unknown/unavailable"],
  ["EXT-FINALITY-RECEIPT", "SCHEMA-FINALITY-RECEIPT", "external finality receipt is unknown/unavailable"],
  ["EXT-LIVE-DEPENDENCY-HEADS", "SCHEMA-DEPENDENCY-UNIVERSE", "live mutable dependency heads are unknown/unavailable"],
  ["EXT-PUBLIC-POLICY-SEAL", "ExternalPolicySeal-1", "externally sealed Public projection policy is unknown/unavailable"],
  ["EXT-PUBLIC-DICTIONARY", "ExternalSensitiveDictionary-1", "externally maintained sensitive dictionary/version is unknown/unavailable"],
  ["EXT-MEDIA-DECODER-APPROVAL", "SET<DecoderApproval-1>", "approved constrained decoder identities are unknown/unavailable"],
  ["EXT-READER-A-APPOINTMENT", "SCHEMA-READER-APPOINTMENT", "reader A external appointment is unknown/unavailable"],
  ["EXT-READER-B-APPOINTMENT", "SCHEMA-READER-APPOINTMENT", "reader B external appointment is unknown/unavailable"],
  ["EXT-INDEPENDENT-SEMANTIC-RECEIPT", "IndependentSemanticClosureReceipt-1", "independent hostile review has not been performed for v1.7"],
  ["EXT-PROTOCOL-HEAD", "AcceptedProtocolHead-1", "accepted protocol head is unknown/unavailable"],
];
const externalInputBlocks = externalInputSpecs.map(([blockId, expectedSchemaId, reason]) => {
  const core = {
    acceptanceCredit: 0,
    authorityEffect: "NONE",
    blockId,
    expectedSchemaId,
    reason,
    state: "MISSING-EXTERNAL-INPUT",
  };
  return { ...core, missingBlockRoot: rooted("MPRR-V17-MISSING-EXTERNAL-INPUT", "1", canonical(core)) };
});
const externalById = new Map(externalInputBlocks.map((block) => [block.blockId, block]));

const findingProperties = (block) => {
  const properties = {};
  const conjuncts = [];
  for (const line of splitBufferLines(block.selected)) {
    const text = line.bytes.toString("utf8").replace(/\n$/, "");
    const match = text.match(/^\d+\.\d+\.\d+ ([A-Za-z][A-Za-z0-9]*)=(.*)\.$/);
    if (!match) continue;
    const [, field, value] = match;
    properties[field] = value;
    if (!["severity", "state", "evidenceLocator", "observation", "impact", "remediation", "closureTest"].includes(field)) continue;
    const valueBytes = Buffer.from(value, "utf8");
    const offsetInLine = line.bytes.indexOf(valueBytes);
    assert(offsetInLine >= 0, `cannot locate ${block.memberId}/${field}`);
    const memberRelativeByteStart = line.byteStart + offsetInLine;
    const memberRelativeByteEndExclusive = memberRelativeByteStart + valueBytes.length;
    conjuncts.push({
      absoluteByteEndExclusive: block.byteStart + memberRelativeByteEndExclusive,
      absoluteByteStart: block.byteStart + memberRelativeByteStart,
      conjunctId: `${block.memberId}-${field}`,
      digest: sha256(valueBytes),
      field,
      memberRelativeByteEndExclusive,
      memberRelativeByteStart,
      sourceLocator: `docs/planning/three-review-protocol-v1-6-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md#bytes=${block.byteStart + memberRelativeByteStart}-${block.byteStart + memberRelativeByteEndExclusive}`,
    });
  }
  return { conjuncts, properties };
};

const findingControls = findingBlocks.map((block, index) => {
  const shortId = `F${String(index + 1).padStart(3, "0")}`;
  const { properties } = findingProperties(block);
  const core = {
    acceptanceCredit: 0,
    authorityEffect: "NONE-UNTIL-INDEPENDENT-ADMISSION",
    closurePredicate: properties.closureTest,
    controlId: `MPRR-V17-CONTROL-${shortId}`,
    evaluatorIds: findingImplementation[shortId],
    independentSemanticReceiptBlockId: "EXT-INDEPENDENT-SEMANTIC-RECEIPT",
    implementationState: "PRODUCER-IMPLEMENTED-PENDING-INDEPENDENT-REVIEW",
    remediationContract: properties.remediation,
    schemaRefs: controlSchemaRefs[shortId],
    severity: properties.severity,
    sourceFindingId: block.memberId,
    sourceObservation: properties.observation,
  };
  return { ...core, controlRoot: rooted("MPRR-V17-FINDING-CONTROL", "1", canonical(core)) };
});
const findingControlById = new Map(findingControls.map((control) => [control.sourceFindingId, control]));

const policyDefinitions = [
  ["POLICY-CANONICAL", "CPB1 frames domain and version as separate length-prefixed UTF-8 fields; canonical JSON sorts object keys, preserves array order, rejects non-integer numbers, duplicate semantic elements and unknown schema fields"],
  ["POLICY-SOURCE-GRAPH", "Every source observation starts at the logical repository root, opens the exact custody path, verifies carrier root, selects numeric half-open bytes, verifies member digest, MemberCore root, member-set root and namespace root in that causal order"],
  ["POLICY-REVIEW-ACCEPTANCE", "Acceptance requires exactly three distinct eligible sealed Review envelopes bound to one subject root and generation, a sealed reconciliation receipt, no unresolved P0 or P1, valid risk dispositions for every P2 or P3, trusted time, finality and fresh revocation heads"],
  ["POLICY-INDEPENDENCE", "Language diversity is not independence; external appointments, distinct principals, provenance roots, toolchain roots, environment roots, no shared producer library and signed independence decisions are mandatory"],
  ["POLICY-DEPENDENCY", "The universe is a closed sorted set of every consumed registry, artifact, head and revocation head; instrumented reads outside the set or any stale member block before commit"],
  ["POLICY-COMMIT", "The operation key covers the complete precommit envelope; one atomic CAS fences every expected head and revocation head; durable writes are all-or-none; a Permit is unique; post-readback divergence atomically advances the Permit revocation head"],
  ["POLICY-REPLAY", "The same operation key and byte-identical envelope returns the original exact receipt; any changed envelope, head, expiry or revocation returns conflict and emits no authority"],
  ["POLICY-RISK", "A boolean is never a risk disposition; P0 and P1 cannot be accepted; P2 and P3 require a typed signed disposition, bound reviewer recommendations, HumanApproval, trusted validity interval and a fresh revocation head"],
  ["POLICY-TRUST", "Trust validates canonical key and signature records, issuer, audience, purpose, epoch, allowed algorithm, validity interval, chain, transparency checkpoint and current revocation head; unknown or malformed input is invalid"],
  ["POLICY-CLOCK", "Trusted time is the non-empty intersection of a signed appointed-source quorum using integer nanosecond half-open intervals, bounded freshness and skew, monotonic epoch and counter; stale, rollback, missing or split observations block"],
  ["POLICY-FINALITY", "Finality requires signed checkpoint receipts, membership and consistency proofs, the configured confirmation rule and no conflicting checkpoint, reorganization, stale source or rollback"],
  ["POLICY-CUSTODY", "Legal Hold and revocation precede deletion; delete begins only from a fresh discovered replica set; completion requires per-replica and key-erasure receipts plus a restore-fencing tombstone; duplicates are idempotent and conflicts block"],
  ["POLICY-PUBLIC", "The repository is PUBLIC-PERMANENT and the only allowed Public payload bytes are NO-EVENT-LEVEL-EVIDENCE-IS-PUBLISHED; event class, time, count, cadence, identifier, content commitment and every Private-derived field class are forbidden"],
  ["POLICY-MEDIA", "No media is admitted until a decoder identity is externally approved; encoded and decoded bytes, dimensions, pixels, frame count and time are bounded; malformed, unsupported, oversized, policy-violating or decoder-disagreeing input is quarantined with zero authority"],
];
const policies = policyDefinitions.map(([policyId, policyBytes], index) => ({
  custodyLocator: `${logical("normative-registry.json")}#/policies/${index}`,
  policyBytes,
  policyId,
  policyRoot: rooted("MPRR-V17-POLICY", "1", policyId, policyBytes),
  policyVersion: "1",
}));
const policyById = new Map(policies.map((policy) => [policy.policyId, policy]));

const terminalRegistry = [
  ["TERM-MALFORMED", 0, "BLOCKED", "NONE"],
  ["TERM-SOURCE-GRAPH-INVALID", 10, "BLOCKED", "NONE"],
  ["TERM-CANONICAL-INVALID", 20, "BLOCKED", "NONE"],
  ["TERM-OUTPUT-INVALID", 30, "BLOCKED", "NONE"],
  ["TERM-SEMANTIC-USE-INVALID", 40, "BLOCKED", "NONE"],
  ["TERM-REVIEW-INVALID", 50, "BLOCKED", "NONE"],
  ["TERM-INDEPENDENCE-INVALID", 60, "BLOCKED", "NONE"],
  ["TERM-DEPENDENCY-STALE", 70, "BLOCKED", "NONE"],
  ["TERM-TRUST-INVALID", 80, "BLOCKED", "NONE"],
  ["TERM-CLOCK-INVALID", 90, "BLOCKED", "NONE"],
  ["TERM-FINALITY-INVALID", 100, "BLOCKED", "NONE"],
  ["TERM-RISK-INVALID", 110, "BLOCKED", "NONE"],
  ["TERM-CUSTODY-INVALID", 120, "BLOCKED", "NONE"],
  ["TERM-PUBLIC-UNSAFE", 130, "BLOCKED", "NONE"],
  ["TERM-MEDIA-QUARANTINED", 140, "QUARANTINED", "NONE"],
  ["TERM-CAS-ABORTED", 150, "ABORTED", "NONE"],
  ["TERM-READBACK-DIVERGED", 160, "REVOKED", "REVOKE"],
  ["TERM-REJECTED", 170, "REJECTED", "NONE"],
  ["TERM-CONFLICT", 180, "CONFLICT", "NONE"],
  ["TERM-REVOKED", 190, "REVOKED", "REVOKE"],
  ["TERM-BLOCKED", 200, "BLOCKED", "NONE"],
  ["TERM-CONTINUE", 900, "NONTERMINAL", "NONE"],
  ["TERM-MECHANICAL-CLEAN", 990, "PASS-NON-AUTHORITATIVE", "NONE"],
  ["TERM-ACCEPTED", 1000, "SUCCESS", "PERMIT-ELIGIBLE-NOT-ISSUED"],
].map(([terminalId, precedence, resultStatus, authorityEffect]) => ({ authorityEffect, precedence, resultStatus, terminalId }));
const terminalById = new Map(terminalRegistry.map((terminal) => [terminal.terminalId, terminal]));

const failureDefinitions = [
  ["FC-SOURCE-GRAPH", "sourceGraphValid", "TERM-SOURCE-GRAPH-INVALID"],
  ["FC-CANONICAL", "canonicalValid", "TERM-CANONICAL-INVALID"],
  ["FC-OUTPUT", "outputValid", "TERM-OUTPUT-INVALID"],
  ["FC-SEMANTIC-USE", "semanticUseValid", "TERM-SEMANTIC-USE-INVALID"],
  ["FC-REVIEW", "reviewValid", "TERM-REVIEW-INVALID"],
  ["FC-INDEPENDENCE", "independenceValid", "TERM-INDEPENDENCE-INVALID"],
  ["FC-DEPENDENCY", "dependencyFresh", "TERM-DEPENDENCY-STALE"],
  ["FC-TRUST", "trustValid", "TERM-TRUST-INVALID"],
  ["FC-CLOCK", "clockValid", "TERM-CLOCK-INVALID"],
  ["FC-FINALITY", "finalityValid", "TERM-FINALITY-INVALID"],
  ["FC-RISK", "riskValid", "TERM-RISK-INVALID"],
  ["FC-CUSTODY", "custodyValid", "TERM-CUSTODY-INVALID"],
  ["FC-PUBLIC", "publicSafe", "TERM-PUBLIC-UNSAFE"],
  ["FC-MEDIA", "mediaSafe", "TERM-MEDIA-QUARANTINED"],
  ["FC-CAS", "casMatched", "TERM-CAS-ABORTED"],
  ["FC-READBACK", "readbackConsistent", "TERM-READBACK-DIVERGED"],
];
const failureConditions = failureDefinitions.map(([conditionId, path, terminalId]) => ({
  conditionId,
  malformedDisposition: "TRIGGER-TERM-MALFORMED",
  observationSchemaId: "SCHEMA-FAILURE-OBSERVATION",
  operand: false,
  operator: "STRICT-EQUALS",
  path,
  precedence: terminalById.get(terminalId).precedence,
  terminalId,
}));

const separationDimensions = [
  "PERSON-ROOT",
  "LEGAL-EMPLOYER-ROOT",
  "ORGANIZATIONAL-CONTROL-ROOT",
  "FINANCIAL-CONTROL-ROOT",
  "CREDENTIAL-ROOT",
  "SIGNING-KEY-ROOT",
  "WORKSPACE-ROOT",
  "SOURCE-CODE-DERIVATION-ROOT",
  "TOOLCHAIN-ROOT",
  "ENVIRONMENT-ROOT",
  "PROMPT-OR-INSTRUCTION-ROOT",
  "EVIDENCE-CUSTODY-ROOT",
  "NETWORK-ADMINISTRATION-ROOT",
  "REVIEW-AUTHORSHIP-ROOT",
  "APPROVAL-AUTHORITY-ROOT",
];
const separationRules = separationDimensions.map((dimension, index) => {
  const core = {
    comparedRoles: ["CANDIDATE-AUTHOR", "PRODUCER-QA", "REVIEWER-A", "REVIEWER-B", "REVIEWER-C", "RECONCILER", "ACCEPTOR", "APPEAL-DECIDER"],
    dimension,
    evaluator: "STRICT-ROOT-INEQUALITY;MISSING-EVIDENCE=INELIGIBLE",
    ruleId: `MPRR-V17-SEPARATION-${String(index + 1).padStart(3, "0")}`,
  };
  return { ...core, ruleRoot: rooted("MPRR-V17-SEPARATION-RULE", "1", canonical(core)) };
});

const machineSpecs = [
  {
    machineId: "MACHINE-TRUST",
    states: ["UNCHECKED", "VALID", "INVALID", "BLOCKED"],
    events: ["VALIDATION_VALID", "VALIDATION_INVALID", "REVOKE"],
    allowed: { "UNCHECKED|VALIDATION_VALID": "VALID", "UNCHECKED|VALIDATION_INVALID": "INVALID", "VALID|REVOKE": "INVALID" },
  },
  {
    machineId: "MACHINE-CLOCK",
    states: ["UNCHECKED", "VALID", "STALE", "ROLLBACK", "SPLIT", "BLOCKED"],
    events: ["QUORUM_VALID", "SOURCE_STALE", "ROLLBACK_DETECTED", "SPLIT_DETECTED", "SOURCE_MISSING"],
    allowed: { "UNCHECKED|QUORUM_VALID": "VALID", "UNCHECKED|SOURCE_STALE": "STALE", "UNCHECKED|ROLLBACK_DETECTED": "ROLLBACK", "UNCHECKED|SPLIT_DETECTED": "SPLIT", "UNCHECKED|SOURCE_MISSING": "BLOCKED", "VALID|ROLLBACK_DETECTED": "ROLLBACK", "VALID|SPLIT_DETECTED": "SPLIT" },
  },
  {
    machineId: "MACHINE-FINALITY",
    states: ["UNCHECKED", "FINAL", "STALE", "CONFLICT", "ROLLBACK", "BLOCKED"],
    events: ["CHECKPOINT_FINAL", "CHECKPOINT_STALE", "CONFLICT_DETECTED", "ROLLBACK_DETECTED", "RECEIPT_MISSING"],
    allowed: { "UNCHECKED|CHECKPOINT_FINAL": "FINAL", "UNCHECKED|CHECKPOINT_STALE": "STALE", "UNCHECKED|CONFLICT_DETECTED": "CONFLICT", "UNCHECKED|ROLLBACK_DETECTED": "ROLLBACK", "UNCHECKED|RECEIPT_MISSING": "BLOCKED", "FINAL|CONFLICT_DETECTED": "CONFLICT", "FINAL|ROLLBACK_DETECTED": "ROLLBACK" },
  },
  {
    machineId: "MACHINE-REVIEW",
    states: ["DRAFT", "THREE_REVIEWS_BOUND", "RECONCILED", "ACCEPTED_PROVISIONAL", "APPEAL_FROZEN", "ACCEPTED_FINAL", "REJECTED_FINAL", "REVOKED_FINAL", "BLOCKED"],
    events: ["BIND_REVIEWS_OK", "BIND_REVIEWS_FAIL", "RECONCILE_OK", "RECONCILE_FAIL", "CLOSE_ACCEPT", "CLOSE_REJECT", "FILE_APPEAL_OK", "FILE_APPEAL_FAIL", "FINALIZE_NO_APPEAL", "AFFIRM", "REMAND", "REVOKE"],
    allowed: {
      "DRAFT|BIND_REVIEWS_OK": "THREE_REVIEWS_BOUND", "DRAFT|BIND_REVIEWS_FAIL": "BLOCKED",
      "THREE_REVIEWS_BOUND|RECONCILE_OK": "RECONCILED", "THREE_REVIEWS_BOUND|RECONCILE_FAIL": "REJECTED_FINAL",
      "RECONCILED|CLOSE_ACCEPT": "ACCEPTED_PROVISIONAL", "RECONCILED|CLOSE_REJECT": "REJECTED_FINAL",
      "ACCEPTED_PROVISIONAL|FILE_APPEAL_OK": "APPEAL_FROZEN", "ACCEPTED_PROVISIONAL|FILE_APPEAL_FAIL": "BLOCKED", "ACCEPTED_PROVISIONAL|FINALIZE_NO_APPEAL": "ACCEPTED_FINAL",
      "APPEAL_FROZEN|AFFIRM": "ACCEPTED_FINAL", "APPEAL_FROZEN|REMAND": "DRAFT", "APPEAL_FROZEN|REVOKE": "REVOKED_FINAL",
      "ACCEPTED_FINAL|REVOKE": "REVOKED_FINAL",
    },
  },
  {
    machineId: "MACHINE-APPEAL",
    states: ["NONE", "FILED", "FROZEN", "AFFIRMED", "REMANDED", "REVOKED", "BLOCKED"],
    events: ["FILE_VALID", "FILE_INVALID", "FREEZE", "AFFIRM", "REMAND", "REVOKE", "DUPLICATE"],
    allowed: { "NONE|FILE_VALID": "FILED", "NONE|FILE_INVALID": "BLOCKED", "FILED|FREEZE": "FROZEN", "FILED|DUPLICATE": "BLOCKED", "FROZEN|AFFIRM": "AFFIRMED", "FROZEN|REMAND": "REMANDED", "FROZEN|REVOKE": "REVOKED" },
  },
  {
    machineId: "MACHINE-CUSTODY",
    states: ["ACTIVE", "HELD", "DELETE_IN_PROGRESS", "DELETED", "TOMBSTONED", "CONFLICT", "BLOCKED"],
    events: ["PLACE_HOLD", "RELEASE_HOLD", "BEGIN_DELETE", "DELETE_COMPLETE", "WRITE_TOMBSTONE", "DELETE_CONFLICT", "RETRY", "RESTORE_ATTEMPT"],
    allowed: { "ACTIVE|PLACE_HOLD": "HELD", "HELD|RELEASE_HOLD": "ACTIVE", "ACTIVE|BEGIN_DELETE": "DELETE_IN_PROGRESS", "HELD|BEGIN_DELETE": "BLOCKED", "DELETE_IN_PROGRESS|DELETE_COMPLETE": "DELETED", "DELETE_IN_PROGRESS|DELETE_CONFLICT": "CONFLICT", "DELETE_IN_PROGRESS|RETRY": "DELETE_IN_PROGRESS", "DELETED|WRITE_TOMBSTONE": "TOMBSTONED", "TOMBSTONED|RESTORE_ATTEMPT": "BLOCKED", "CONFLICT|RETRY": "DELETE_IN_PROGRESS" },
  },
  {
    machineId: "MACHINE-MEDIA",
    states: ["PENDING", "VALIDATED", "INVALID", "QUARANTINED", "BLOCKED"],
    events: ["VALIDATE_OK", "VALIDATE_INVALID", "QUARANTINE", "DECODER_MISSING", "POLICY_VIOLATION"],
    allowed: { "PENDING|VALIDATE_OK": "VALIDATED", "PENDING|VALIDATE_INVALID": "INVALID", "PENDING|DECODER_MISSING": "QUARANTINED", "PENDING|POLICY_VIOLATION": "QUARANTINED", "INVALID|QUARANTINE": "QUARANTINED" },
  },
  {
    machineId: "MACHINE-PUBLIC",
    states: ["PENDING", "POLICY_VALIDATED", "PRIVATE_EVIDENCE_SEALED", "WRITTEN", "VETOED", "BLOCKED"],
    events: ["VALIDATE_SAFE", "VALIDATE_UNSAFE", "SEAL_PRIVATE", "WRITE_FIXED_BYTES", "VETO", "REORDER", "DUPLICATE"],
    allowed: { "PENDING|VALIDATE_SAFE": "POLICY_VALIDATED", "PENDING|VALIDATE_UNSAFE": "BLOCKED", "POLICY_VALIDATED|SEAL_PRIVATE": "PRIVATE_EVIDENCE_SEALED", "PRIVATE_EVIDENCE_SEALED|WRITE_FIXED_BYTES": "WRITTEN", "PENDING|VETO": "VETOED", "POLICY_VALIDATED|VETO": "VETOED", "WRITTEN|DUPLICATE": "WRITTEN", "PRIVATE_EVIDENCE_SEALED|REORDER": "BLOCKED" },
  },
  {
    machineId: "MACHINE-DEPENDENCY",
    states: ["UNDISCOVERED", "DISCOVERED", "FRESH", "STALE", "REVOKED", "BLOCKED"],
    events: ["DISCOVER_COMPLETE", "DISCOVER_INCOMPLETE", "VERIFY_FRESH", "HEAD_CHANGED", "MEMBER_REVOKED", "UNKNOWN_READ"],
    allowed: { "UNDISCOVERED|DISCOVER_COMPLETE": "DISCOVERED", "UNDISCOVERED|DISCOVER_INCOMPLETE": "BLOCKED", "DISCOVERED|VERIFY_FRESH": "FRESH", "DISCOVERED|HEAD_CHANGED": "STALE", "FRESH|HEAD_CHANGED": "STALE", "FRESH|MEMBER_REVOKED": "REVOKED", "DISCOVERED|UNKNOWN_READ": "BLOCKED" },
  },
  {
    machineId: "MACHINE-COMMIT",
    states: ["PREPARED", "CAS_PENDING", "COMMITTED", "POSTREADBACK_VERIFIED", "REVOKED", "ABORTED", "BLOCKED"],
    events: ["BINDINGS_VALID", "BINDINGS_INVALID", "CAS_MATCH", "CAS_MISMATCH", "READBACK_MATCH", "READBACK_DIVERGED", "RETRY_SAME_KEY", "RETRY_DIFFERENT_ENVELOPE"],
    allowed: { "PREPARED|BINDINGS_VALID": "CAS_PENDING", "PREPARED|BINDINGS_INVALID": "ABORTED", "CAS_PENDING|CAS_MATCH": "COMMITTED", "CAS_PENDING|CAS_MISMATCH": "ABORTED", "COMMITTED|READBACK_MATCH": "POSTREADBACK_VERIFIED", "COMMITTED|READBACK_DIVERGED": "REVOKED", "COMMITTED|RETRY_SAME_KEY": "COMMITTED", "COMMITTED|RETRY_DIFFERENT_ENVELOPE": "ABORTED", "POSTREADBACK_VERIFIED|READBACK_DIVERGED": "REVOKED" },
  },
  {
    machineId: "MACHINE-GENERATION",
    states: ["GENERATION_ONE", "REWORK", "GENERATION_TWO", "EXHAUSTED", "BLOCKED"],
    events: ["REMAND", "START_NEXT", "CLOSE", "EXCEED_LIMIT"],
    allowed: { "GENERATION_ONE|REMAND": "REWORK", "REWORK|START_NEXT": "GENERATION_TWO", "GENERATION_TWO|CLOSE": "EXHAUSTED", "GENERATION_TWO|REMAND": "BLOCKED", "GENERATION_TWO|EXCEED_LIMIT": "BLOCKED" },
  },
  {
    machineId: "MACHINE-SEALING",
    states: ["OPEN", "PRESEALED", "SEALED", "REVOKED", "BLOCKED"],
    events: ["PRESEAL", "SEAL", "MUTATION", "REVOKE", "MISSING_FIELD"],
    allowed: { "OPEN|PRESEAL": "PRESEALED", "OPEN|MISSING_FIELD": "BLOCKED", "PRESEALED|SEAL": "SEALED", "PRESEALED|MUTATION": "BLOCKED", "SEALED|MUTATION": "BLOCKED", "SEALED|REVOKE": "REVOKED" },
  },
  {
    machineId: "MACHINE-RECONCILIATION",
    states: ["PENDING", "THREE_BOUND", "COMPARED", "RECONCILED", "CONFLICT", "BLOCKED"],
    events: ["BIND_THREE", "BIND_INVALID", "COMPARE", "RESOLVE", "CONFLICT_DETECTED", "MISSING_REVIEW"],
    allowed: { "PENDING|BIND_THREE": "THREE_BOUND", "PENDING|BIND_INVALID": "BLOCKED", "PENDING|MISSING_REVIEW": "BLOCKED", "THREE_BOUND|COMPARE": "COMPARED", "COMPARED|RESOLVE": "RECONCILED", "COMPARED|CONFLICT_DETECTED": "CONFLICT" },
  },
  {
    machineId: "MACHINE-RISK",
    states: ["UNASSESSED", "DISPOSITION_PENDING", "DISPOSED", "EXPIRED", "REVOKED", "BLOCKED"],
    events: ["REQUIRE_DISPOSITION", "VALIDATE_DISPOSITION", "INVALID_DISPOSITION", "EXPIRE", "REVOKE", "P0_OR_P1"],
    allowed: { "UNASSESSED|REQUIRE_DISPOSITION": "DISPOSITION_PENDING", "UNASSESSED|P0_OR_P1": "BLOCKED", "DISPOSITION_PENDING|VALIDATE_DISPOSITION": "DISPOSED", "DISPOSITION_PENDING|INVALID_DISPOSITION": "BLOCKED", "DISPOSED|EXPIRE": "EXPIRED", "DISPOSED|REVOKE": "REVOKED" },
  },
  {
    machineId: "MACHINE-ACCEPTANCE",
    states: ["BLOCKED_INPUTS", "ELIGIBLE", "CAS_PENDING", "PERMIT_ISSUED", "REVOKED", "BLOCKED"],
    events: ["ALL_EVIDENCE_VALID", "EVIDENCE_INVALID", "BEGIN_CAS", "CAS_MATCH", "CAS_MISMATCH", "REVOKE"],
    allowed: { "BLOCKED_INPUTS|ALL_EVIDENCE_VALID": "ELIGIBLE", "BLOCKED_INPUTS|EVIDENCE_INVALID": "BLOCKED", "ELIGIBLE|BEGIN_CAS": "CAS_PENDING", "CAS_PENDING|CAS_MATCH": "PERMIT_ISSUED", "CAS_PENDING|CAS_MISMATCH": "BLOCKED", "PERMIT_ISSUED|REVOKE": "REVOKED" },
  },
];

const stateTerminalId = (machineId, state) => {
  if (["ACCEPTED_FINAL", "PERMIT_ISSUED"].includes(state)) return "TERM-ACCEPTED";
  if (["REJECTED_FINAL"].includes(state)) return "TERM-REJECTED";
  if (["CONFLICT"].includes(state)) return "TERM-CONFLICT";
  if (["REVOKED", "REVOKED_FINAL"].includes(state)) return "TERM-REVOKED";
  if (machineId === "MACHINE-TRUST" && state === "INVALID") return "TERM-TRUST-INVALID";
  if (machineId === "MACHINE-CLOCK" && ["STALE", "ROLLBACK", "SPLIT"].includes(state)) return "TERM-CLOCK-INVALID";
  if (machineId === "MACHINE-FINALITY" && ["STALE", "ROLLBACK"].includes(state)) return "TERM-FINALITY-INVALID";
  if (machineId === "MACHINE-DEPENDENCY" && ["STALE", "REVOKED"].includes(state)) return "TERM-DEPENDENCY-STALE";
  if (machineId === "MACHINE-RISK" && ["EXPIRED", "REVOKED"].includes(state)) return "TERM-RISK-INVALID";
  if (["QUARANTINED"].includes(state)) return "TERM-MEDIA-QUARANTINED";
  if (["ABORTED"].includes(state)) return "TERM-CAS-ABORTED";
  if (["BLOCKED", "BLOCKED_INPUTS", "VETOED", "EXPIRED"].includes(state)) return "TERM-BLOCKED";
  return "TERM-CONTINUE";
};
const guards = [];
const controlMachines = [];
const controlTransitions = [];
for (const spec of machineSpecs) {
  const contextSchemaId = `CONTEXT-${spec.machineId}-1`;
  controlMachines.push({
    contextSchemaId,
    events: spec.events,
    initialState: spec.states[0],
    machineId: spec.machineId,
    states: spec.states,
    terminalStates: spec.states.filter((state) => stateTerminalId(spec.machineId, state) !== "TERM-CONTINUE"),
    transitionKeyRule: "exactly one row for every (machineId,fromState,event); event is derived from typed observation before lookup",
    unknownDisposition: "TERM-MALFORMED;AUTHORITY=NONE",
  });
  for (const event of spec.events) {
    const guardId = `G-${spec.machineId.slice(8)}-${event}`;
    guards.push({
      contextSchemaId,
      expression: { leftPath: "derivedEvent", operator: "STRICT-EQUALS", rightLiteral: event },
      falseDisposition: "TERM-MALFORMED;AUTHORITY=NONE",
      guardId,
      malformedDisposition: "TERM-MALFORMED;AUTHORITY=NONE",
      trueDisposition: "ALLOW-REGISTERED-TRANSITION",
    });
    for (const fromState of spec.states) {
      const key = `${fromState}|${event}`;
      let toState = spec.allowed[key] ?? "BLOCKED";
      if (fromState === "BLOCKED") toState = "BLOCKED";
      const terminalId = stateTerminalId(spec.machineId, toState);
      controlTransitions.push({
        authorityEffect: terminalId === "TERM-ACCEPTED" ? "PERMIT-ELIGIBLE-NOT-ISSUED" : terminalById.get(terminalId).authorityEffect,
        event,
        fromState,
        guardId,
        machineId: spec.machineId,
        terminalId,
        toState,
        transitionId: `MPRR-V17-TRANSITION-${String(controlTransitions.length + 1).padStart(4, "0")}`,
      });
    }
  }
}

const findingOutputNumbers = {
  F001: [2],
  F002: [1, 2],
  F003: Array.from({ length: 112 }, (_, index) => index + 1),
  F004: [3],
  F005: [16],
  F006: [15],
  F007: [15],
  F008: [8, 15],
  F009: [8],
  F010: [8],
  F011: [8],
  F012: [13],
  F013: [14],
  F014: [14],
  F015: [13, 14],
  F016: [14],
  F017: [4, 9],
  F018: [8],
  F019: [1],
  F020: [2],
  F021: [16],
  F022: [4],
  F023: [4],
  F024: [5],
  F025: [6],
  F026: [7],
  F027: [8, 9],
  F028: [10],
  F029: [12],
  F030: [15],
  F031: [11],
};
const controlIdsForOutput = (number) => Object.entries(findingOutputNumbers)
  .filter(([, numbers]) => numbers.includes(number))
  .map(([shortId]) => `MPRR-V17-CONTROL-${shortId}`)
  .sort();

const generatorRoot = sha256(readFileSync(fileURLToPath(import.meta.url)));
const requirementOutputs = requirementBlocks.map((block, index) => {
  const number = index + 1;
  const predecessorFields = parseRequirementFields(block);
  const sourceMember = sourceMemberByKey.get(`V16-REQUIREMENTS/${block.memberId}`);
  const requirementId = `MPRR-V17-REQ-${String(number).padStart(3, "0")}`;
  const outputId = `MPRR-V17-OUT-${String(number).padStart(3, "0")}`;
  const closureControlIds = controlIdsForOutput(number);
  const outputTypeMatch = predecessorFields.statement.match(/outputType=([^;]+)/);
  const outputType = outputTypeMatch?.[1] ?? "LosslessPredecessorSemanticEnvelopeRoot";
  const successorFields = {
    statement: `atomicOutput=${outputId};outputType=${outputType}; materialize the complete exact five-field value vector and source bytes of ${block.memberId}; preserve every predecessor semantic clause without merge, range, presence-only credit or authority inflation; bind applicable closure controls ${closureControlIds.join(",") || "NONE"}`,
    defectCauseImpact: `If any field value, dependency edge, source span or closure binding of ${block.memberId} is omitted or weakened, the successor output root changes and the requirement remains blocked`,
    requiredProofPredicate: `both producer readers independently parse the immutable ${block.memberId} member, reproduce its exact source digest, predecessor five-field digest vector, successor five-field digest vector, output root and producer receipt; independent semantic receipt remains required and missing`,
    dependencies: predecessorFields.dependencies.replaceAll("MPRR-V16-REQ-", "MPRR-V17-REQ-"),
    sourceBasis: `docs/planning/three-review-protocol-v1-6-successor-requirements-2026-08-30.md#bytes=${sourceMember.byteStart}-${sourceMember.byteEndExclusive};sourceMemberDigest=${sourceMember.memberDigest};sourceMemberCoreRoot=${sourceMember.memberCoreRoot}`,
  };
  const canonicalFiveFieldDigestVector = Object.fromEntries(requirementFieldNames.map((field) => [field, sha256(Buffer.from(successorFields[field], "utf8"))]));
  const predecessorFiveFieldDigestVector = Object.fromEntries(requirementFieldNames.map((field) => [field, sha256(Buffer.from(predecessorFields[field], "utf8"))]));
  const constructorInputs = {
    canonicalFiveFieldDigestVector,
    closureControlIds,
    outputId,
    outputType,
    predecessorFiveFieldDigestVector,
    predecessorRequirementId: block.memberId,
    requirementId,
    sourceMemberCoreRoot: sourceMember.memberCoreRoot,
    sourceMemberDigest: sourceMember.memberDigest,
  };
  const outputRoot = rooted("MPRR-V17-REQUIREMENT-OUTPUT", "1", canonical(constructorInputs));
  return {
    authorityState: "CANDIDATE-IDENTITY-ONLY;ACCEPTANCE=0",
    canonicalFiveFieldDigestVector,
    canonicalFiveFieldValues: successorFields,
    closureControlIds,
    constructor: "SHA-256(CPB1(domain=MPRR-V17-REQUIREMENT-OUTPUT,version=1,canonical(constructorInputs)))",
    constructorInputs,
    custodyLocator: `${logical("requirement-outputs.jsonl")}#recordId=${outputId}`,
    independentReceiptBlockId: "EXT-INDEPENDENT-SEMANTIC-RECEIPT",
    outputId,
    outputRoot,
    outputType,
    predecessorFiveFieldDigestVector,
    predecessorFiveFieldValues: predecessorFields,
    predecessorRequirementId: block.memberId,
    producerReceiptRoot: rooted("MPRR-V17-PRODUCER-OUTPUT-RECEIPT", "1", outputId, outputRoot, generatorRoot),
    requirementId,
    sourceMemberCoreRoot: sourceMember.memberCoreRoot,
    sourceMemberDigest: sourceMember.memberDigest,
    title: block.title,
  };
});
assert(requirementOutputs.length === 112, "must materialize 112 requirement outputs");
const outputById = new Map(requirementOutputs.map((output) => [output.outputId, output]));

const numericConjunctFor = (legacyRow, legacyConjunct, sourceMember, carrier) => {
  const sourceMemberBytes = carrier.bytesValue.subarray(sourceMember.byteStart, sourceMember.byteEndExclusive);
  const expectedBytes = Buffer.from(legacyConjunct.sourceTextB64, "base64");
  assert(sha256(expectedBytes) === legacyConjunct.digest, `legacy conjunct digest mismatch ${legacyRow.rowId}/${legacyConjunct.sourceConjunctId}`);
  let memberRelativeByteStart;
  let memberRelativeByteEndExclusive;
  const numericMatch = String(legacyConjunct.sourceSpanRelative).match(/^(\d+)-(\d+)$/);
  if (numericMatch) {
    memberRelativeByteStart = Number(numericMatch[1]);
    memberRelativeByteEndExclusive = Number(numericMatch[2]);
  } else {
    const columnMatch = legacyConjunct.sourceConjunctId.match(/^column-(\d{2})$/);
    assert(legacyRow.sourceNamespaceId === "V15XW" && columnMatch, `unsupported symbolic locator ${legacyRow.rowId}/${legacyConjunct.sourceConjunctId}`);
    const columnNumber = Number(columnMatch[1]);
    const pipeOffsets = [];
    for (let index = 0; index < sourceMemberBytes.length; index += 1) if (sourceMemberBytes[index] === 124) pipeOffsets.push(index);
    assert(columnNumber >= 1 && columnNumber < pipeOffsets.length, `missing table column ${legacyRow.rowId}/${columnNumber}`);
    memberRelativeByteStart = pipeOffsets[columnNumber - 1] + 1;
    memberRelativeByteEndExclusive = pipeOffsets[columnNumber];
    while (memberRelativeByteStart < memberRelativeByteEndExclusive && [9, 32].includes(sourceMemberBytes[memberRelativeByteStart])) memberRelativeByteStart += 1;
    while (memberRelativeByteEndExclusive > memberRelativeByteStart && [9, 10, 13, 32].includes(sourceMemberBytes[memberRelativeByteEndExclusive - 1])) memberRelativeByteEndExclusive -= 1;
  }
  const selected = sourceMemberBytes.subarray(memberRelativeByteStart, memberRelativeByteEndExclusive);
  assert(selected.equals(expectedBytes), `numeric conjunct selection mismatch ${legacyRow.rowId}/${legacyConjunct.sourceConjunctId}`);
  const absoluteByteStart = sourceMember.byteStart + memberRelativeByteStart;
  const absoluteByteEndExclusive = sourceMember.byteStart + memberRelativeByteEndExclusive;
  return {
    absoluteByteEndExclusive,
    absoluteByteStart,
    conjunctId: `${legacyRow.rowId}-${legacyConjunct.sourceConjunctId}`,
    digest: legacyConjunct.digest,
    field: legacyConjunct.sourceConjunctId,
    memberRelativeByteEndExclusive,
    memberRelativeByteStart,
    sourceLocator: `${carrier.path}#bytes=${absoluteByteStart}-${absoluteByteEndExclusive}`,
  };
};

const translatedTargetClausesFor = (legacyRow, legacyConjunct, predicateId) => {
  const translated = [];
  for (const [legacyIndex, legacyPath] of legacyConjunct.targetClausePaths.entries()) {
    const requirementMatch = legacyPath.match(/^requirements\/MPRR-V16-REQ-(\d{3})\/(statement|defectCauseImpact|requiredProofPredicate|dependencies|sourceBasis)$/);
    const targetDescriptors = requirementMatch
      ? [{ field: requirementMatch[2], outputId: `MPRR-V17-OUT-${requirementMatch[1]}`, rule: "EXACT-TARGET-FIELD-DIGEST" }]
      : legacyRow.targetRequirementIds.map((requirementId) => ({ field: "ALL-FIVE-FIELDS", outputId: `MPRR-V17-OUT-${requirementId.slice(-3)}`, rule: "NON-SELF-OWNED-OUTPUT-ROOT" }));
    for (const descriptor of targetDescriptors) {
      const output = outputById.get(descriptor.outputId);
      assert(output, `unresolved translated target ${legacyRow.rowId}/${legacyConjunct.sourceConjunctId}/${descriptor.outputId}`);
      const targetValueRoot = descriptor.field === "ALL-FIVE-FIELDS" ? output.outputRoot : output.canonicalFiveFieldDigestVector[descriptor.field];
      translated.push({
        legacyTargetPathRoot: rooted("MPRR-V17-LEGACY-TARGET-PATH", "1", legacyPath),
        targetClauseId: `${predicateId}-TARGET-${String(legacyIndex + 1).padStart(2, "0")}-${descriptor.outputId}-${descriptor.field}`,
        targetField: descriptor.field,
        targetOutputId: descriptor.outputId,
        targetOutputRoot: output.outputRoot,
        targetValueRoot,
        translationRule: descriptor.rule,
      });
    }
  }
  const byIdentity = new Map(translated.map((item) => [`${item.targetOutputId}|${item.targetField}|${item.legacyTargetPathRoot}`, item]));
  return [...byIdentity.values()].sort((left, right) => left.targetClauseId.localeCompare(right.targetClauseId));
};

const predecessorSemanticPredicates = [];
const predecessorClauseCrosswalk = [];
let convertedSymbolicConjuncts = 0;
for (const [rowIndex, entry] of v16PredecessorRows.entries()) {
  const legacyRow = entry.row;
  const namespaceSpec = predecessorNamespaceSpecs[legacyRow.sourceNamespaceId];
  const sourceMember = sourceMemberByKey.get(`${namespaceSpec.namespaceId}/${legacyRow.sourceMemberId}`);
  const carrier = carrierById.get(namespaceSpec.carrierId);
  assert(sourceMember && sourceMember.memberDigest === legacyRow.sourceMemberDigest, `missing v1.5 predecessor member ${legacyRow.rowId}`);
  const targetOutputIds = legacyRow.targetRequirementIds.map((requirementId) => `MPRR-V17-OUT-${requirementId.slice(-3)}`).sort();
  targetOutputIds.forEach((outputId) => assert(outputById.has(outputId), `missing output target ${legacyRow.rowId}/${outputId}`));
  const sourceConjuncts = [];
  const predicateIds = [];
  const predicateRoots = [];
  for (const [conjunctIndex, legacyConjunct] of legacyRow.sourceConjuncts.entries()) {
    if (!/^\d+-\d+$/.test(String(legacyConjunct.sourceSpanRelative))) convertedSymbolicConjuncts += 1;
    const sourceConjunct = numericConjunctFor(legacyRow, legacyConjunct, sourceMember, carrier);
    const predicateId = `MPRR-V17-PRED-${String(rowIndex + 1).padStart(3, "0")}-${String(conjunctIndex + 1).padStart(2, "0")}`;
    const translatedTargetClauses = translatedTargetClausesFor(legacyRow, legacyConjunct, predicateId);
    const predicateCore = {
      acceptanceCredit: 0,
      independentSemanticReceiptBlockId: "EXT-INDEPENDENT-SEMANTIC-RECEIPT",
      predicateId,
      predecessorCrosswalkId: `MPRR-V17-PREDECESSOR-XW-${String(rowIndex + 1).padStart(3, "0")}`,
      relation: legacyConjunct.relation,
      sourceConjunct,
      targetOutputIds,
      translatedTargetClauses,
    };
    const predicate = { ...predicateCore, predicateRoot: rooted("MPRR-V17-SEMANTIC-PREDICATE", "1", canonical(predicateCore)) };
    predecessorSemanticPredicates.push(predicate);
    sourceConjuncts.push(sourceConjunct);
    predicateIds.push(predicate.predicateId);
    predicateRoots.push(predicate.predicateRoot);
  }
  const sourceV16CrosswalkRowLocator = `${v16Subject.path}#bytes=${entry.byteStart}-${entry.byteEndExclusive}`;
  const crosswalkCore = {
    acceptanceCredit: 0,
    independentSemanticReceiptBlockId: "EXT-INDEPENDENT-SEMANTIC-RECEIPT",
    mergePolicy: "PROHIBITED;ONE-LEGACY-ROW-ONLY;NO-RANGE-CREDIT;NO-PRESENCE-CREDIT",
    predicateIds,
    predicateRoots,
    predecessorCrosswalkId: `MPRR-V17-PREDECESSOR-XW-${String(rowIndex + 1).padStart(3, "0")}`,
    producerImplementationState: "NUMERIC-SOURCE-SPANS-AND-NON-SELF-TARGETS-MATERIALIZED-PENDING-INDEPENDENT-REVIEW",
    sourceConjuncts,
    sourceMemberCoreRoot: sourceMember.memberCoreRoot,
    sourceMemberDigest: sourceMember.memberDigest,
    sourceMemberId: legacyRow.sourceMemberId,
    sourceMemberLocator: `${carrier.path}#bytes=${sourceMember.byteStart}-${sourceMember.byteEndExclusive}`,
    sourceNamespaceId: namespaceSpec.namespaceId,
    sourceRowId: legacyRow.rowId,
    sourceV16CrosswalkRowDigest: sha256(entry.bytes),
    sourceV16CrosswalkRowLocator,
    targetEvidenceLocators: targetOutputIds.map((outputId) => `${logical("requirement-outputs.jsonl")}#recordId=${outputId}`),
    targetOutputIds,
    targetOutputRoots: targetOutputIds.map((outputId) => outputById.get(outputId).outputRoot),
    vectorIds: [`MPRR-V17-VEC-PREDECESSOR-XW-${String(rowIndex + 1).padStart(3, "0")}`],
  };
  predecessorClauseCrosswalk.push({ ...crosswalkCore, predecessorCrosswalkRoot: rooted("MPRR-V17-PREDECESSOR-CLAUSE-ROW", "1", canonical(crosswalkCore)) });
}
assert(predecessorClauseCrosswalk.length === 323, "must preserve 323 predecessor crosswalk rows separately");
assert(predecessorSemanticPredicates.length === 4016, "must materialize 4016 predecessor semantic conjunct predicates");
assert(convertedSymbolicConjuncts === 3376, `converted symbolic conjunct denominator ${convertedSymbolicConjuncts}`);
assert(predecessorClauseCrosswalk.every((row) => row.targetEvidenceLocators.every((locator) => !locator.includes("predecessor-clause-crosswalk.jsonl"))), "self-owned predecessor target locator");

const subjectLines = [
  "# Connect — Three-review Protocol v1.7 immutable successor Candidate",
  "",
  "## 1. Identity and immutable boundary",
  "",
  `1.1 artifactId=${artifactId}.`,
  "",
  `1.2 packageRoot=${packageLogicalRoot}.`,
  "",
  `1.3 frozen v1.6 Subject root=${carrierById.get("V16-SUBJECT").root}; independent hostile review root=${carrierById.get("V16-REVIEW").root}; Findings Manifest root=${carrierById.get("V16-FINDINGS").root}.`,
  "",
  "1.4 All logical locators resolve from the product repository root that directly contains docs/. A locator beginning with web/, an absolute locator, parent traversal, fallback lookup or prefix repair is invalid.",
  "",
  "1.5 This Candidate changes no frozen input, Product code, Git, GitHub, provider, deployment or account state.",
  "",
  "1.6 repository=PUBLIC-PERMANENT; Gate29=BLOCKED; developmentFreeze=ACTIVE; Acceptance=0; authorityOutputs=0.",
  "",
  "1.7 Producer mechanical QA is not Acceptance, independent hostile review, semantic Closure, B0 admission, HumanApproval or a ProtocolUsePermit.",
  "",
  "## 2. Canonical causality",
  "",
  "2.1 CPB1 is SHA-256 over independently length-prefixed fields. The first field is the domain and the second is version=1. Version is never concatenated into the domain token.",
  "",
  "2.2 MemberCore has the exact ordered schema in normative-registry.json and excludes namespaceRoot. memberCoreRoot derives first; memberSetRoot derives only from sorted memberCoreRoot values; namespaceRoot derives last from NamespaceCore. No field is silently omitted and no identity is circular.",
  "",
  "2.3 Every source span is zero-based byte half-open and one-based line half-open. The two ranges must select the same exact bytes.",
  "",
  "2.4 A source mutation is applied to an in-memory copy of actual frozen bytes. The source evaluator computes the mismatch and derives its failure condition. No vector accepts a caller-supplied trigger set or injects a failure precondition.",
  "",
  "2.5 All 323 v1.6 predecessor-crosswalk rows are rebuilt one-to-one. Their 4,016 source conjuncts are selected from actual v1.5 bytes by numeric byte spans. The former 3,376 symbolic table-cell locators are replaced by exact numeric spans; target evidence resolves only to materialized outputs and never to the row that asserts closure.",
  "",
  "## 3. Thirty-one non-merged closure controls",
  "",
];
for (const [index, control] of findingControls.entries()) {
  subjectLines.push(
    `### 3.${index + 1} ${control.sourceFindingId}`,
    "",
    `3.${index + 1}.1 controlId=${control.controlId}; controlRoot=${control.controlRoot}; severity=${control.severity}.`,
    "",
    `3.${index + 1}.2 remediation=${control.remediationContract}.`,
    "",
    `3.${index + 1}.3 producerImplementation=${control.evaluatorIds.join("+")}; state=${control.implementationState}.`,
    "",
    `3.${index + 1}.4 independentSemanticReceipt=EXT-INDEPENDENT-SEMANTIC-RECEIPT:MISSING-EXTERNAL-INPUT; acceptanceCredit=0.`,
    "",
  );
}
subjectLines.push(
  "## 4. Exactly 112 materialized successor Requirements and outputs",
  "",
  "4.1 The canonical records are in requirement-outputs.jsonl. Every record carries all constructor inputs, exact predecessor fields, exact successor fields, both five-field digest vectors, source member digest/core root, output root, producer receipt, custody locator and a typed missing independent receipt.",
  "",
);
for (const [index, output] of requirementOutputs.entries()) {
  const prefix = `4.${index + 2}`;
  subjectLines.push(
    `### ${prefix} ${output.requirementId} — ${output.title}`,
    "",
    `${prefix}.1 statement: ${output.canonicalFiveFieldValues.statement}.`,
    "",
    `${prefix}.2 defectCauseImpact: ${output.canonicalFiveFieldValues.defectCauseImpact}.`,
    "",
    `${prefix}.3 requiredProofPredicate: ${output.canonicalFiveFieldValues.requiredProofPredicate}.`,
    "",
    `${prefix}.4 dependencies: ${output.canonicalFiveFieldValues.dependencies}.`,
    "",
    `${prefix}.5 sourceBasis: ${output.canonicalFiveFieldValues.sourceBasis}.`,
    "",
    `${prefix}.6 outputRoot=${output.outputRoot}; producerReceiptRoot=${output.producerReceiptRoot}; acceptanceCredit=0.`,
    "",
  );
}
subjectLines.push(
  "## 5. Review, authority, time, finality and independence",
  "",
  "5.1 Exactly three externally appointed, pairwise-distinct Review envelopes are mandatory. Each envelope binds its domain, role instance, appointment, independence decisions, instruction root, observed Subject path/root/bytes, toolchains, trusted timing, generation, Finding Manifest, raw evidence and seal.",
  "",
  "5.2 No three Review envelopes, appointments, reconciliation receipt, HumanApproval, trust anchors, signed clock observations, finality receipt, live dependency heads or external reader appointments exist in this package. Each remains an explicit typed missing block and forces a blocked state.",
  "",
  "5.3 Risk acceptance is never a boolean. A P0 or P1 cannot be risk-accepted. A P2 or P3 requires the complete signed RiskDisposition schema, reviewer recommendations, HumanApproval, trusted validity interval and fresh revocation head.",
  "",
  "5.4 Language diversity alone is not external independence. The two bundled readers are separately implemented producer-side mechanical readers; their provenance is bound, their external appointments are missing, and their reports grant no Acceptance credit.",
  "",
  "## 6. Complete operation key, CAS, replay and revocation",
  "",
  "6.1 candidateRoot equals subjectRoot. Every Review, reconciliation, approval, risk, B0, dependency, trust, clock, finality, Public and appeal input is bound to the same subject, generation, purpose and epoch before CAS.",
  "",
  "6.2 operationKey is the CPB1 root of the complete canonical PrecommitEnvelope, including every expected mutable Head and revocation Head. Mutating any member changes the key.",
  "",
  "6.3 CAS compares the protocol Head, dependency-universe Head, every consumed dependency-member Head and every applicable revocation Head in one atomic decision. Missing or stale comparisons abort with zero durable authority.",
  "",
  "6.4 A same-key byte-identical replay returns the original exact receipt. Same-key different-envelope, changed Head, expiry or revocation fails closed. Response loss is recovered only by exact operation key readback.",
  "",
  "6.5 Post-readback divergence atomically advances the Permit revocation Head. Every consumer checks that head at use time; a divergent or revoked Permit is unusable.",
  "",
  "## 7. Lifecycle and safety",
  "",
  "7.1 All machines declare initial state, typed context, complete state/event Cartesian transitions and defined guards. Events are derived from typed observations before lookup. Unknown or malformed state, event or context blocks.",
  "",
  "7.2 REJECTED_FINAL, CONFLICT, REVOKED_FINAL, BLOCKED, expired, invalid, stale, split, quarantined and aborted states never map to SUCCESS and never create authority.",
  "",
  "7.3 Public repository state is immutable. The only allowed Public payload is NO-EVENT-LEVEL-EVIDENCE-IS-PUBLISHED. All event evidence stays in separately authorized sealed external Private custody.",
  "",
  "7.4 Media validation is fail-closed. With no externally approved decoder, all media is quarantined; no clean-media Acceptance is invented.",
  "",
  "## 8. Package artifacts and final counters",
  "",
  `8.1 normativeRegistry=${logical("normative-registry.json")}.`,
  "",
  `8.2 requirementOutputs=${logical("requirement-outputs.jsonl")}; exact count=112.`,
  "",
  `8.3 closureCrosswalk=${logical("closure-crosswalk.jsonl")}; exact count=31; merge/range credit=0.`,
  "",
  `8.4 causalVectors=${logical("causal-vectors.jsonl")}; causalGraph=${logical("causal-source-graph.json")}.`,
  "",
  `8.5 semanticUses=${logical("semantic-use-index.jsonl")}; predecessorClosure=${logical("predecessor-closure.jsonl")}.`,
  "",
  `8.6 predecessorClauseCrosswalk=${logical("predecessor-clause-crosswalk.jsonl")}; exact rows=323; predecessorSemanticPredicates=${logical("predecessor-semantic-predicates.jsonl")}; exact predicates=4016.`,
  "",
  "8.7 Producer implementation counters: v1.6 Findings represented separately=31/31; requirement outputs materialized=112/112; predecessor crosswalk rows=323/323; predecessor conjuncts=4016/4016; converted symbolic locators=3376/3376; source self-reference rows=0; symbolic conjunct locators=0; negative-to-success mappings=0; undefined guards=0.",
  "",
  "8.8 Authority counters: Acceptance=0; Gate29=BLOCKED; developmentFreeze=ACTIVE; repository=PUBLIC-PERMANENT; independentReceipt=MISSING-EXTERNAL-INPUT; ProtocolUsePermit=0; authorityOutputs=0.",
  "",
);
writeFileSync(paths.subject, `${subjectLines.join("\n")}\n`, "utf8");
const subjectBytes = readFileSync(paths.subject);
const subjectRoot = sha256(subjectBytes);

const aggregateRoot = (domain, records, selector) => rooted(domain, "1", ...records.map(selector).sort());
const recordRoot = (domain, record) => rooted(domain, "1", canonical(record));

const readerARoot = sha256(readFileSync(paths.readerA));
const readerBRoot = sha256(readFileSync(paths.readerB));
const rubyToolchainVersion = execFileSync("ruby", ["--version"], { encoding: "utf8" }).trim();
const readerProvenance = [
  {
    appointmentBlockId: "EXT-READER-A-APPOINTMENT",
    derivationFamily: "NODE-BYTE-INDEX-CANONICAL-AST-VALIDATOR",
    environmentRoot: rooted("MPRR-V17-READER-ENVIRONMENT", "1", process.platform, process.arch, process.version, "NODE"),
    implementationRoot: readerARoot,
    language: "JavaScript-ECMAScript-Module",
    readerId: "MPRR-V17-READER-A",
    sharedProducerLibraryRoots: [],
    toolchainVersion: process.version,
  },
  {
    appointmentBlockId: "EXT-READER-B-APPOINTMENT",
    derivationFamily: "RUBY-LINE-BUFFER-CANONICAL-TREE-VALIDATOR",
    environmentRoot: rooted("MPRR-V17-READER-ENVIRONMENT", "1", process.platform, process.arch, rubyToolchainVersion, "RUBY"),
    implementationRoot: readerBRoot,
    language: "Ruby",
    readerId: "MPRR-V17-READER-B",
    sharedProducerLibraryRoots: [],
    toolchainVersion: rubyToolchainVersion,
  },
];

const family = (familyId, members) => {
  const normalizedMembers = members.map(([memberId, memberRoot]) => ({ memberId, memberRoot })).sort((left, right) => left.memberId.localeCompare(right.memberId));
  const headRoot = rooted("MPRR-V17-DEPENDENCY-FAMILY-HEAD", "1", familyId, ...normalizedMembers.map((member) => canonical(member)));
  return {
    discoveryClass: "STATIC-PACKAGE-DISCOVERY;LIVE-AUTHORITY-REQUIRES-EXT-LIVE-DEPENDENCY-HEADS",
    familyId,
    headRoot,
    memberCount: normalizedMembers.length,
    members: normalizedMembers,
    nonMembershipProof: { completeSortedMemberIds: normalizedMembers.map((member) => member.memberId), rule: "candidate ID absent from complete sorted list at this exact family head" },
    revocationHead: { externalInputBlockId: "EXT-LIVE-DEPENDENCY-HEADS", root: null, state: "MISSING-EXTERNAL-INPUT" },
  };
};

const algorithmPolicy = {
  allowedAlgorithms: [],
  downgradePolicy: "BLOCK-UNKNOWN-UNREGISTERED-DEPRECATED-OR-DOWNGRADED-ALGORITHM",
  externalAuthorityBlockId: "EXT-TRUST-ANCHORS",
  forbiddenAlgorithms: ["UNKNOWN", "UNREGISTERED", "DEPRECATED", "DOWNGRADED"],
  policyId: "MPRR-V17-ALGORITHM-POLICY",
  version: "1",
};
const algorithmPolicyRoot = rooted("MPRR-V17-ALGORITHM-POLICY", "1", canonical(algorithmPolicy));

const dependencyFamilies = [
  family("SOURCE-CARRIER", carriers.map((item) => [item.carrierId, item.root])),
  family("PARSER-PROFILE", parserProfiles.map((item) => [item.profileId, item.parserProfileRoot])),
  family("SOURCE-NAMESPACE", sourceNamespaces.map((item) => [item.namespaceId, item.namespaceRoot])),
  family("SOURCE-MEMBER", sourceMembers.map((item) => [`${item.namespaceId}/${item.memberId}`, item.memberCoreRoot])),
  family("SCHEMA", schemas.map((item) => [item.schemaId, item.schemaRoot])),
  family("POLICY", policies.map((item) => [item.policyId, item.policyRoot])),
  family("ALGORITHM-POLICY", [[algorithmPolicy.policyId, algorithmPolicyRoot]]),
  family("REQUIREMENT-OUTPUT", requirementOutputs.map((item) => [item.outputId, item.outputRoot])),
  family("FINDING-CONTROL", findingControls.map((item) => [item.controlId, item.controlRoot])),
  family("PREDECESSOR-CLAUSE-ROW", predecessorClauseCrosswalk.map((item) => [item.predecessorCrosswalkId, item.predecessorCrosswalkRoot])),
  family("SEMANTIC-PREDICATE", predecessorSemanticPredicates.map((item) => [item.predicateId, item.predicateRoot])),
  family("FAILURE-CONDITION", failureConditions.map((item) => [item.conditionId, recordRoot("MPRR-V17-FAILURE-CONDITION", item)])),
  family("TERMINAL", terminalRegistry.map((item) => [item.terminalId, recordRoot("MPRR-V17-TERMINAL", item)])),
  family("CONTROL-MACHINE", controlMachines.map((item) => [item.machineId, recordRoot("MPRR-V17-CONTROL-MACHINE", item)])),
  family("CONTROL-TRANSITION", controlTransitions.map((item) => [item.transitionId, recordRoot("MPRR-V17-CONTROL-TRANSITION", item)])),
  family("CONTROL-GUARD", guards.map((item) => [item.guardId, recordRoot("MPRR-V17-GUARD", item)])),
  family("SEPARATION-RULE", separationRules.map((item) => [item.ruleId, item.ruleRoot])),
  family("EXTERNAL-INPUT-BLOCK", externalInputBlocks.map((item) => [item.blockId, item.missingBlockRoot])),
  family("READER-IMPLEMENTATION", readerProvenance.map((item) => [item.readerId, item.implementationRoot])),
  family("SUBJECT", [["MPRR-V17-SUBJECT", subjectRoot]]),
  family("PRODUCER", [["MPRR-V17-GENERATOR", generatorRoot]]),
  family("REVIEW-ENVELOPE", [["EXT-REVIEW-A-ENVELOPE", externalById.get("EXT-REVIEW-A-ENVELOPE").missingBlockRoot], ["EXT-REVIEW-B-ENVELOPE", externalById.get("EXT-REVIEW-B-ENVELOPE").missingBlockRoot], ["EXT-REVIEW-C-ENVELOPE", externalById.get("EXT-REVIEW-C-ENVELOPE").missingBlockRoot]]),
  family("APPOINTMENT", [["EXT-REVIEWER-A-APPOINTMENT", externalById.get("EXT-REVIEWER-A-APPOINTMENT").missingBlockRoot], ["EXT-REVIEWER-B-APPOINTMENT", externalById.get("EXT-REVIEWER-B-APPOINTMENT").missingBlockRoot], ["EXT-REVIEWER-C-APPOINTMENT", externalById.get("EXT-REVIEWER-C-APPOINTMENT").missingBlockRoot]]),
  family("RECONCILIATION", [["EXT-RECONCILIATION", externalById.get("EXT-RECONCILIATION").missingBlockRoot]]),
  family("HUMAN-APPROVAL", [["EXT-HUMAN-APPROVAL", externalById.get("EXT-HUMAN-APPROVAL").missingBlockRoot]]),
  family("TRUST-ANCHOR", [["EXT-TRUST-ANCHORS", externalById.get("EXT-TRUST-ANCHORS").missingBlockRoot]]),
  family("CLOCK-OBSERVATION", [["EXT-CLOCK-OBSERVATIONS", externalById.get("EXT-CLOCK-OBSERVATIONS").missingBlockRoot]]),
  family("FINALITY-RECEIPT", [["EXT-FINALITY-RECEIPT", externalById.get("EXT-FINALITY-RECEIPT").missingBlockRoot]]),
  family("PUBLIC-PROJECTION", [["POLICY-PUBLIC", policyById.get("POLICY-PUBLIC").policyRoot], ["EXT-PUBLIC-POLICY-SEAL", externalById.get("EXT-PUBLIC-POLICY-SEAL").missingBlockRoot], ["EXT-PUBLIC-DICTIONARY", externalById.get("EXT-PUBLIC-DICTIONARY").missingBlockRoot]]),
  family("MEDIA-DECODER", [["EXT-MEDIA-DECODER-APPROVAL", externalById.get("EXT-MEDIA-DECODER-APPROVAL").missingBlockRoot]]),
  family("COMMIT-MEMBER-SCHEMA", ["candidateRoot", "subjectRoot", "expectedProtocolHead", "externalB0ProcedureRoot", "consumedB0AuthorityRoot", "threeReviewRoots", "reconciliationRoot", "humanApprovalRoot", "riskDispositionRoots", "dependencyUniverseHead", "dependencyMemberHeads", "revocationHeads", "trustReceiptRoot", "clockReceiptRoot", "finalityReceiptRoot", "publicPolicyRoot", "appealStateRoot", "operationPurpose", "operationEpoch"].map((item) => [item, rooted("MPRR-V17-COMMIT-MEMBER-NAME", "1", item)])),
  family("NAMED-USE", [["SEMANTIC-USE-INDEX", rooted("MPRR-V17-DECLARED-NAMED-USE-FAMILY", "1", logical("semantic-use-index.jsonl"))]]),
];
const dependencyFamilyRoots = dependencyFamilies.map((item) => item.headRoot).sort();
const instrumentedReads = [
  ...carriers.map((item) => item.path),
  logical("subject.md"),
  logical("normative-registry.json"),
  logical("requirement-outputs.jsonl"),
  logical("closure-crosswalk.jsonl"),
  logical("predecessor-closure.jsonl"),
  logical("predecessor-clause-crosswalk.jsonl"),
  logical("predecessor-semantic-predicates.jsonl"),
  logical("causal-vectors.jsonl"),
  logical("causal-source-graph.json"),
  logical("semantic-use-index.jsonl"),
  logical("normative-package-manifest.json"),
].sort();
const dependencyUniverse = {
  discoveryAuthority: { externalInputBlockId: "EXT-LIVE-DEPENDENCY-HEADS", state: "MISSING-EXTERNAL-INPUT" },
  familyRecords: dependencyFamilies,
  instrumentedReadSetRoot: rooted("MPRR-V17-INSTRUMENTED-READ-SET", "1", ...instrumentedReads),
  instrumentedReads,
  membershipProofs: dependencyFamilies.map((item) => ({ familyId: item.familyId, familyHeadRoot: item.headRoot, completeSortedMembers: item.members })),
  nonMembershipProofPolicy: "full sorted member list at the bound family Head; insertion, removal, rename or reorder changes that Head",
  revocationHeadRoots: dependencyFamilies.map((item) => ({ externalInputBlockId: item.revocationHead.externalInputBlockId, familyId: item.familyId, root: item.revocationHead.root, state: item.revocationHead.state })),
  universeHeadRoot: rooted("MPRR-V17-DEPENDENCY-UNIVERSE-HEAD", "1", ...dependencyFamilyRoots),
  universeId: "MPRR-V17-DEPENDENCY-UNIVERSE",
};

const precommitEnvelope = {
  appealStateRoot: rooted("MPRR-V17-APPEAL-STATE", "1", subjectRoot, "NO-ACCEPTED-OBJECT;NO-APPEAL-AUTHORITY"),
  candidateRoot: subjectRoot,
  clockReceiptRoot: null,
  consumedB0AuthorityRoot: null,
  dependencyMemberHeads: Object.fromEntries(dependencyFamilies.map((item) => [item.familyId, item.headRoot])),
  dependencyUniverseHead: dependencyUniverse.universeHeadRoot,
  expectedProtocolHead: null,
  externalB0ProcedureRoot: carrierById.get("B0-PROCEDURE").root,
  finalityReceiptRoot: null,
  humanApprovalRoot: null,
  missingExternalBindings: ["EXT-PROTOCOL-HEAD", "EXT-B0-ADMISSION", "EXT-REVIEW-A-ENVELOPE", "EXT-REVIEW-B-ENVELOPE", "EXT-REVIEW-C-ENVELOPE", "EXT-RECONCILIATION", "EXT-HUMAN-APPROVAL", "EXT-TRUST-ANCHORS", "EXT-CLOCK-OBSERVATIONS", "EXT-FINALITY-RECEIPT", "EXT-LIVE-DEPENDENCY-HEADS"],
  operationEpoch: "MISSING-TRUSTED-CLOCK-EPOCH",
  operationPurpose: "PROTOCOL-V1-7-ADMISSION",
  publicPolicyRoot: policyById.get("POLICY-PUBLIC").policyRoot,
  reconciliationRoot: null,
  revocationHeads: dependencyFamilies.map((item) => ({ externalInputBlockId: "EXT-LIVE-DEPENDENCY-HEADS", familyId: item.familyId, root: null })),
  riskDispositionRoots: [],
  subjectRoot,
  threeReviewRoots: [],
  trustReceiptRoot: null,
};
const precommitEnvelopeRoot = rooted("MPRR-V17-PRECOMMIT-ENVELOPE", "1", canonical(precommitEnvelope));
const operationKey = rooted("MPRR-V17-OPERATION-KEY", "1", canonical(precommitEnvelope));

const detachedBindings = [
  ["BIND-CANDIDATE-SUBJECT", "candidateRoot", "subjectRoot"],
  ["BIND-REVIEW-A-SUBJECT", "reviewEnvelopes[0].subjectRoot", "subjectRoot"],
  ["BIND-REVIEW-B-SUBJECT", "reviewEnvelopes[1].subjectRoot", "subjectRoot"],
  ["BIND-REVIEW-C-SUBJECT", "reviewEnvelopes[2].subjectRoot", "subjectRoot"],
  ["BIND-REVIEWS-GENERATION", "reviewEnvelopes[*].generation", "operationGeneration"],
  ["BIND-RECONCILIATION-SUBJECT", "reconciliation.subjectRoot", "subjectRoot"],
  ["BIND-RECONCILIATION-REVIEWS", "reconciliation.threeDistinctReviewRoots", "threeReviewRoots"],
  ["BIND-APPROVAL-SUBJECT", "humanApproval.subjectRoot", "subjectRoot"],
  ["BIND-APPROVAL-OPERATION", "humanApproval.operationKey", "operationKey"],
  ["BIND-RISK-SUBJECT", "riskDispositions[*].subjectRoot", "subjectRoot"],
  ["BIND-B0-PROCEDURE", "consumedB0Authority.procedureRoot", "externalB0ProcedureRoot"],
  ["BIND-B0-SUBJECT", "consumedB0Authority.subjectRoot", "subjectRoot"],
].map(([bindingId, leftPath, rightPath]) => ({ bindingId, failureTerminal: "TERM-CAS-ABORTED", leftPath, operator: "CANONICAL-STRICT-EQUALS", rightPath }));

const casComparisons = [
  {
    comparisonId: "CAS-PROTOCOL-HEAD",
    expectedRoot: null,
    externalInputBlockId: "EXT-PROTOCOL-HEAD",
    memberId: "acceptedProtocolHead",
    observedRoot: null,
    revocationHead: null,
    state: "MISSING-EXTERNAL-INPUT",
  },
  ...dependencyFamilies.map((item, index) => ({
    comparisonId: `CAS-DEPENDENCY-${String(index + 1).padStart(3, "0")}`,
    expectedRoot: item.headRoot,
    externalInputBlockId: null,
    memberId: item.familyId,
    observedRoot: item.headRoot,
    revocationHead: null,
    state: "STATIC-HEAD-MATCH;LIVE-REVOCATION-MISSING",
  })),
  ...dependencyFamilies.map((item, index) => ({
    comparisonId: `CAS-REVOCATION-${String(index + 1).padStart(3, "0")}`,
    expectedRoot: null,
    externalInputBlockId: "EXT-LIVE-DEPENDENCY-HEADS",
    memberId: `${item.familyId}/revocationHead`,
    observedRoot: null,
    revocationHead: null,
    state: "MISSING-EXTERNAL-INPUT",
  })),
];
const comparisonSetRoot = rooted("MPRR-V17-CAS-COMPARISON-SET", "1", ...casComparisons.map((item) => canonical(item)).sort());
const commitContract = {
  admissionExecutable: false,
  atomicity: "all listed comparisons match and all durable members write, or no durable member and no Permit writes",
  bindings: detachedBindings,
  casComparisons,
  comparisonSetRoot,
  consumerRule: "before every use, read the current Permit revocation Head; missing, changed, stale or revoked blocks",
  durableMemberIds: ["protocolHead", "subjectRoot", "precommitEnvelopeRoot", "comparisonSetRoot", "threeReviewRoots", "reconciliationRoot", "humanApprovalRoot", "dependencyUniverseHead", "dependencyMemberHeads", "revocationHeads", "trustReceiptRoot", "clockReceiptRoot", "finalityReceiptRoot", "publicPolicyRoot", "appealStateRoot", "commitReceiptRoot", "issuedPermitRoot"],
  missingExternalInputBlockIds: precommitEnvelope.missingExternalBindings,
  operationKey,
  operationKeyConstructor: "SHA-256(CPB1(domain=MPRR-V17-OPERATION-KEY,version=1,canonical(complete PrecommitEnvelope)))",
  permitCountRule: "zero or one per operationKey",
  postReadback: {
    onDivergence: "atomically append PermitRevocation, advance revocation Head and make every later consumption fail",
    order: ["COMMIT", "ISSUE-PERMIT", "READBACK", "IF-DIVERGED-REVOKE", "CONSUMER-READS-REVOCATION-HEAD"],
    selfReference: false,
  },
  precommitEnvelope,
  precommitEnvelopeRoot,
  replay: {
    changedEnvelope: "CONFLICT;AUTHORITY=NONE",
    changedHeadExpiryOrRevocation: "CAS-ABORT;AUTHORITY=NONE",
    responseLoss: "READ-ORIGINAL-RECEIPT-BY-EXACT-OPERATION-KEY",
    sameKeySameEnvelope: "RETURN-ORIGINAL-EXACT-RECEIPT",
  },
};

const mediaLimits = {
  allowedCodecSet: [],
  approvedDecoderRoots: [],
  externalDecoderApprovalBlockId: "EXT-MEDIA-DECODER-APPROVAL",
  maxDecodedBytes: 67108864,
  maxEncodedBytes: 16777216,
  maxFrames: 1,
  maxHeight: 8192,
  maxPixels: 67108864,
  maxWidth: 8192,
  policyId: "MPRR-V17-MEDIA-LIMITS",
  timeoutBudgetMs: 5000,
};
const publicProjectionPolicy = {
  dictionaryVersionBlockId: "EXT-PUBLIC-DICTIONARY",
  externalSealBlockId: "EXT-PUBLIC-POLICY-SEAL",
  forbiddenFieldClasses: ["EVENT-CLASS", "TIME", "COUNT", "CADENCE", "IDENTIFIER", "CONTENT-COMMITMENT", "PRIVATE-DERIVED-METADATA", "SECRET", "PII"],
  onlyAllowedBytes: "NO-EVENT-LEVEL-EVIDENCE-IS-PUBLISHED",
  policyId: "MPRR-V17-PUBLIC-PROJECTION",
  privateEvidenceCustody: "SEALED-EXTERNAL-PRIVATE-CUSTODY;NO-PUBLIC-EVENT-RECORD",
  repositoryState: "PUBLIC-PERMANENT",
};

const predecessorFindingMap = [
  ["MPRR-V15-HR-F001", "MPRR-V16-REQ-002", ["F001", "F002", "F019", "F020"]],
  ["MPRR-V15-HR-F002", "MPRR-V16-REQ-003", ["F004"]],
  ["MPRR-V15-HR-F003", "MPRR-V16-REQ-015", ["F006", "F007", "F008", "F030"]],
  ["MPRR-V15-HR-F004", "MPRR-V16-REQ-016", ["F005", "F021"]],
  ["MPRR-V15-HR-F005", "MPRR-V16-REQ-012", ["F029"]],
  ["MPRR-V15-HR-F006", "MPRR-V16-REQ-013", ["F012", "F015"]],
  ["MPRR-V15-HR-F007", "MPRR-V16-REQ-014", ["F013", "F014", "F015", "F016"]],
  ["MPRR-V15-HR-F008", "MPRR-V16-REQ-008", ["F008", "F009", "F010", "F011"]],
  ["MPRR-V15-HR-F009", "MPRR-V16-REQ-005", ["F023", "F024"]],
  ["MPRR-V15-HR-F010", "MPRR-V16-REQ-006", ["F023", "F025"]],
  ["MPRR-V15-HR-F011", "MPRR-V16-REQ-007", ["F023", "F026"]],
  ["MPRR-V15-HR-F012", "MPRR-V16-REQ-004", ["F009", "F017", "F018", "F027"]],
  ["MPRR-V15-HR-F013", "MPRR-V16-REQ-010", ["F023", "F028"]],
  ["MPRR-V15-HR-F014", "MPRR-V16-REQ-009", ["F017", "F027"]],
  ["MPRR-V15-HR-F015", "MPRR-V16-REQ-001", ["F002", "F019", "F020"]],
  ["MPRR-V15-HR-F016", "MPRR-V16-REQ-011", ["F031"]],
];
const reviewLines = splitBufferLines(carrierById.get("V16-REVIEW").bytesValue);
const predecessorClosure = predecessorFindingMap.map(([findingId, v16RequirementId, shortIds], index) => {
  const row = reviewLines.find((line) => line.bytes.toString("utf8").startsWith(`| ${findingId} |`));
  assert(row, `missing predecessor review row ${findingId}`);
  const bytes = row.bytes;
  return {
    acceptanceCredit: 0,
    closureControlIds: shortIds.map((shortId) => `MPRR-V17-CONTROL-${shortId}`),
    independentSemanticReceiptBlockId: "EXT-INDEPENDENT-SEMANTIC-RECEIPT",
    predecessorId: findingId,
    predecessorKind: "V1.5-FINDING",
    preservationId: `MPRR-V17-PREDECESSOR-FINDING-${String(index + 1).padStart(3, "0")}`,
    semanticPreservationState: "FULLY-MATERIALIZED-PENDING-INDEPENDENT-REVIEW",
    sourceDigest: sha256(bytes),
    sourceLocator: `docs/planning/three-review-protocol-v1-6-successor-requirements-independent-hostile-review-2026-08-30.md#bytes=${row.byteStart}-${row.byteEndExclusive}`,
    v16Disposition: "PARTIAL-NO-CREDIT",
    v16RequirementId,
    v17OutputId: `MPRR-V17-OUT-${v16RequirementId.slice(-3)}`,
  };
});
for (const [index, output] of requirementOutputs.entries()) {
  predecessorClosure.push({
    acceptanceCredit: 0,
    closureControlIds: output.closureControlIds,
    independentSemanticReceiptBlockId: "EXT-INDEPENDENT-SEMANTIC-RECEIPT",
    predecessorId: output.predecessorRequirementId,
    predecessorKind: "V1.6-REQUIREMENT",
    preservationId: `MPRR-V17-PREDECESSOR-REQUIREMENT-${String(index + 1).padStart(3, "0")}`,
    semanticPreservationState: "EXACT-FIVE-FIELD-AND-SOURCE-BYTES-MATERIALIZED-PENDING-INDEPENDENT-REVIEW",
    sourceDigest: output.sourceMemberDigest,
    sourceLocator: output.canonicalFiveFieldValues.sourceBasis,
    v17OutputId: output.outputId,
    v17OutputRoot: output.outputRoot,
  });
}

const allValidObservation = Object.fromEntries(failureConditions.map((condition) => [condition.path, true]));
const vectorCores = [];
for (const [index, block] of findingBlocks.entries()) {
  const findingId = block.memberId;
  const sourceMember = sourceMemberByKey.get(`V16-FINDINGS/${findingId}`);
  const mutated = Buffer.from(block.selected);
  mutated[0] ^= 1;
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: "TERM-SOURCE-GRAPH-INVALID",
    family: "SOURCE-GRAPH",
    findingIds: [findingId],
    fixture: {
      byteEndExclusive: sourceMember.byteEndExclusive,
      byteStart: sourceMember.byteStart,
      expectedPostDigest: sha256(mutated),
      expectedPreDigest: sourceMember.memberDigest,
      mutationOffsetWithinMember: 0,
      mutationXorMask: 1,
      sourcePath: carrierById.get("V16-FINDINGS").path,
    },
    fixtureClass: "NORMATIVE-CONFORMANCE-FIXTURE;ACTUAL-FROZEN-SOURCE-BYTES;NOT-BUSINESS-DATA",
    kind: "SOURCE_MEMBER_MUTATION",
    program: ["RESOLVE_FROM_REPOSITORY_ROOT", "READ_EXACT_SOURCE_BYTES", "VERIFY_PREIMAGE_DIGEST", "COPY_IN_MEMORY", "XOR_ONE_BYTE", "RECOMPUTE_MEMBER_DIGEST", "DERIVE_FAILURE_CONDITIONS", "SELECT_TERMINAL", "COMPARE_WITH_ORACLE"],
    vectorId: `MPRR-V17-VEC-SOURCE-${String(index + 1).padStart(3, "0")}`,
  });
}
for (const [index, row] of predecessorClauseCrosswalk.entries()) {
  const sourceMember = sourceMemberByKey.get(`${row.sourceNamespaceId}/${row.sourceMemberId}`);
  const carrier = carrierById.get(sourceMember.carrierId);
  const selected = Buffer.from(carrier.bytesValue.subarray(sourceMember.byteStart, sourceMember.byteEndExclusive));
  const mutated = Buffer.from(selected);
  mutated[0] ^= 1;
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: "TERM-SOURCE-GRAPH-INVALID",
    family: "PREDECESSOR-SOURCE-GRAPH",
    findingIds: ["MPRR-V16-IHR-F005", "MPRR-V16-IHR-F006", "MPRR-V16-IHR-F021"],
    fixture: {
      byteEndExclusive: sourceMember.byteEndExclusive,
      byteStart: sourceMember.byteStart,
      expectedPostDigest: sha256(mutated),
      expectedPreDigest: sourceMember.memberDigest,
      mutationOffsetWithinMember: 0,
      mutationXorMask: 1,
      predecessorCrosswalkId: row.predecessorCrosswalkId,
      sourcePath: carrier.path,
    },
    fixtureClass: "NORMATIVE-CONFORMANCE-FIXTURE;ACTUAL-FROZEN-V1.5-SOURCE-BYTES;NOT-BUSINESS-DATA",
    kind: "SOURCE_MEMBER_MUTATION",
    program: ["RESOLVE_FROM_REPOSITORY_ROOT", "READ_EXACT-V1.5-SOURCE-MEMBER", "VERIFY_PREIMAGE_DIGEST", "COPY_IN_MEMORY", "XOR_ONE_BYTE", "RECOMPUTE_MEMBER_DIGEST", "DERIVE_FAILURE_CONDITIONS", "SELECT_TERMINAL", "COMPARE_WITH_ORACLE"],
    vectorId: `MPRR-V17-VEC-PREDECESSOR-XW-${String(index + 1).padStart(3, "0")}`,
  });
}
vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-MECHANICAL-CLEAN",
  family: "SOURCE-GRAPH",
  findingIds: ["MPRR-V16-IHR-F001", "MPRR-V16-IHR-F002", "MPRR-V16-IHR-F020"],
  fixture: { carrierIds: carriers.map((item) => item.carrierId), namespaceIds: sourceNamespaces.map((item) => item.namespaceId) },
  fixtureClass: "NORMATIVE-CONFORMANCE-FIXTURE;ACTUAL-FROZEN-SOURCE-BYTES;NOT-BUSINESS-DATA",
  kind: "SOURCE_GRAPH_CLEAN",
  program: ["RESOLVE_ALL_PATHS", "VERIFY_ALL-CARRIER-ROOTS", "VERIFY-ALL-HALF-OPEN-SPANS", "RECOMPUTE-ALL-MEMBER-CORES", "RECOMPUTE-ALL-MEMBER-SETS", "RECOMPUTE-ALL-NAMESPACE-ROOTS"],
  vectorId: "MPRR-V17-VEC-SOURCE-CLEAN",
});

const conditionFinding = {
  "FC-SOURCE-GRAPH": "MPRR-V16-IHR-F006",
  "FC-CANONICAL": "MPRR-V16-IHR-F019",
  "FC-OUTPUT": "MPRR-V16-IHR-F003",
  "FC-SEMANTIC-USE": "MPRR-V16-IHR-F004",
  "FC-REVIEW": "MPRR-V16-IHR-F009",
  "FC-INDEPENDENCE": "MPRR-V16-IHR-F008",
  "FC-DEPENDENCY": "MPRR-V16-IHR-F012",
  "FC-TRUST": "MPRR-V16-IHR-F024",
  "FC-CLOCK": "MPRR-V16-IHR-F025",
  "FC-FINALITY": "MPRR-V16-IHR-F026",
  "FC-RISK": "MPRR-V16-IHR-F018",
  "FC-CUSTODY": "MPRR-V16-IHR-F028",
  "FC-PUBLIC": "MPRR-V16-IHR-F029",
  "FC-MEDIA": "MPRR-V16-IHR-F031",
  "FC-CAS": "MPRR-V16-IHR-F015",
  "FC-READBACK": "MPRR-V16-IHR-F016",
};
for (const condition of failureConditions) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: condition.terminalId,
    family: "FAILURE-PREDICATE",
    findingIds: [conditionFinding[condition.conditionId]],
    fixture: { observation: { ...allValidObservation, [condition.path]: false } },
    fixtureClass: "NORMATIVE-CONFORMANCE-LITERAL;NOT-EXTERNAL-EVIDENCE;NOT-BUSINESS-DATA",
    kind: "OBSERVED_STATE_EVALUATION",
    program: ["SCHEMA-VALIDATE-OBSERVATION", "EVALUATE-ALL-FAILURE-PREDICATES", "DERIVE-TRIGGER-SET", "SELECT-LOWEST-PRECEDENCE-TERMINAL", "COMPARE-WITH-ORACLE"],
    vectorId: `MPRR-V17-VEC-CONDITION-${condition.conditionId.slice(3)}`,
  });
}
vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-MECHANICAL-CLEAN",
  family: "FAILURE-PREDICATE",
  findingIds: ["MPRR-V16-IHR-F022"],
  fixture: { observation: allValidObservation },
  fixtureClass: "NORMATIVE-CONFORMANCE-LITERAL;NOT-EXTERNAL-EVIDENCE;NOT-BUSINESS-DATA",
  kind: "OBSERVED_STATE_EVALUATION",
  program: ["SCHEMA-VALIDATE-OBSERVATION", "EVALUATE-ALL-FAILURE-PREDICATES", "DERIVE-EMPTY-TRIGGER-SET", "SELECT-MECHANICAL-CLEAN-TERMINAL", "COMPARE-WITH-ORACLE"],
  vectorId: "MPRR-V17-VEC-CONDITION-CLEAN",
});
vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-MALFORMED",
  family: "FAILURE-PREDICATE",
  findingIds: ["MPRR-V16-IHR-F022"],
  fixture: { observation: Object.fromEntries(Object.entries(allValidObservation).filter(([key]) => key !== "clockValid")) },
  fixtureClass: "NORMATIVE-CONFORMANCE-LITERAL;NOT-EXTERNAL-EVIDENCE;NOT-BUSINESS-DATA",
  kind: "OBSERVED_STATE_EVALUATION",
  program: ["SCHEMA-VALIDATE-OBSERVATION", "DETECT-MISSING-FIELD", "FAIL-CLOSED", "COMPARE-WITH-ORACLE"],
  vectorId: "MPRR-V17-VEC-CONDITION-MALFORMED",
});

vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-MECHANICAL-CLEAN",
  family: "CANONICAL",
  findingIds: ["MPRR-V16-IHR-F002", "MPRR-V16-IHR-F019"],
  fixture: { domain: "MPRR-V17-CANONICAL-CONFORMANCE", fields: ["alpha", "beta"], version: "1" },
  fixtureClass: "NORMATIVE-PROTOCOL-LITERAL;NOT-BUSINESS-DATA",
  kind: "CPB1_FRAMING",
  program: ["FRAME-DOMAIN", "FRAME-VERSION-SEPARATELY", "FRAME-FIELDS-IN-ORDER", "HASH", "COMPARE-CROSS-LANGUAGE"],
  vectorId: "MPRR-V17-VEC-CPB1-SEPARATE-VERSION",
});
vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-MECHANICAL-CLEAN",
  family: "REQUIREMENT-OUTPUT",
  findingIds: ["MPRR-V16-IHR-F003"],
  fixture: { outputIds: requirementOutputs.map((item) => item.outputId) },
  fixtureClass: "ACTUAL-MATERIALIZED-PACKAGE-RECORDS;NOT-BUSINESS-DATA",
  kind: "OUTPUT_ALL_RECOMPUTE",
  program: ["LOAD-112-OUTPUTS", "VERIFY-ALL-CONSTRUCTOR-INPUTS", "RECOMPUTE-112-ROOTS", "VERIFY-PRODUCER-RECEIPTS"],
  vectorId: "MPRR-V17-VEC-OUTPUTS-ALL-112",
});
vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-SEMANTIC-USE-INVALID",
  family: "SEMANTIC-USE",
  findingIds: ["MPRR-V16-IHR-F004"],
  fixture: { injectedField: "targetControlId", injectedTargetId: findingControls[0].controlId },
  fixtureClass: "NORMATIVE-SCHEMA-MUTATION;USES-ACTUAL-CONTROL-ID;NOT-BUSINESS-DATA",
  kind: "SEMANTIC_USE_UNINDEXED",
  program: ["CLONE-INDEXED-AST", "INSERT-TYPED-REFERENCE-FIELD", "RUN-SCHEMA-AST-DISCOVERY", "COMPARE-DISCOVERED-USES-TO-INDEX", "FAIL-ON-UNINDEXED-USE"],
  vectorId: "MPRR-V17-VEC-SEMANTIC-USE-UNINDEXED",
});
vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-MECHANICAL-CLEAN",
  family: "POLICY",
  findingIds: ["MPRR-V16-IHR-F007"],
  fixture: { policyIds: policies.map((item) => item.policyId) },
  fixtureClass: "ACTUAL-MATERIALIZED-POLICY-RECORDS;NOT-BUSINESS-DATA",
  kind: "POLICY_ROOTS_RECOMPUTE",
  program: ["RESOLVE-POLICY-RECORDS", "HASH-EXACT-POLICY-BYTES", "VERIFY-ROOTS", "VERIFY-VECTOR-POLICY-BINDINGS"],
  vectorId: "MPRR-V17-VEC-POLICIES-ALL",
});

const blockFindingMap = {
  "EXT-B0-ADMISSION": ["MPRR-V16-IHR-F014"],
  "EXT-REVIEWER-A-APPOINTMENT": ["MPRR-V16-IHR-F008", "MPRR-V16-IHR-F010"],
  "EXT-REVIEWER-B-APPOINTMENT": ["MPRR-V16-IHR-F008", "MPRR-V16-IHR-F010"],
  "EXT-REVIEWER-C-APPOINTMENT": ["MPRR-V16-IHR-F008", "MPRR-V16-IHR-F010"],
  "EXT-REVIEW-A-ENVELOPE": ["MPRR-V16-IHR-F009", "MPRR-V16-IHR-F011"],
  "EXT-REVIEW-B-ENVELOPE": ["MPRR-V16-IHR-F009", "MPRR-V16-IHR-F011"],
  "EXT-REVIEW-C-ENVELOPE": ["MPRR-V16-IHR-F009", "MPRR-V16-IHR-F011"],
  "EXT-RECONCILIATION": ["MPRR-V16-IHR-F009"],
  "EXT-HUMAN-APPROVAL": ["MPRR-V16-IHR-F018"],
  "EXT-TRUST-ANCHORS": ["MPRR-V16-IHR-F024"],
  "EXT-CLOCK-OBSERVATIONS": ["MPRR-V16-IHR-F025"],
  "EXT-FINALITY-RECEIPT": ["MPRR-V16-IHR-F026"],
  "EXT-LIVE-DEPENDENCY-HEADS": ["MPRR-V16-IHR-F012", "MPRR-V16-IHR-F015"],
  "EXT-PUBLIC-POLICY-SEAL": ["MPRR-V16-IHR-F029"],
  "EXT-PUBLIC-DICTIONARY": ["MPRR-V16-IHR-F029"],
  "EXT-MEDIA-DECODER-APPROVAL": ["MPRR-V16-IHR-F031"],
  "EXT-READER-A-APPOINTMENT": ["MPRR-V16-IHR-F008"],
  "EXT-READER-B-APPOINTMENT": ["MPRR-V16-IHR-F008"],
  "EXT-INDEPENDENT-SEMANTIC-RECEIPT": findingBlocks.map((item) => item.memberId),
  "EXT-PROTOCOL-HEAD": ["MPRR-V16-IHR-F013", "MPRR-V16-IHR-F015"],
};
for (const block of externalInputBlocks) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: "TERM-BLOCKED",
    family: "EXTERNAL-INPUT-GATE",
    findingIds: blockFindingMap[block.blockId],
    fixture: { blockId: block.blockId, expectedState: "MISSING-EXTERNAL-INPUT", missingBlockRoot: block.missingBlockRoot },
    fixtureClass: "ACTUAL-TYPED-MISSING-EXTERNAL-INPUT;NOT-A-PLACEHOLDER;NOT-BUSINESS-DATA",
    kind: "EXTERNAL_INPUT_GATE",
    program: ["LOAD-TYPED-BLOCK", "VERIFY-MISSING-BLOCK-ROOT", "DERIVE-GATE-BLOCKED", "ASSERT-ZERO-AUTHORITY"],
    vectorId: `MPRR-V17-VEC-EXTERNAL-${block.blockId.slice(4)}`,
  });
}

for (const fieldName of Object.keys(precommitEnvelope).sort()) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: "TERM-CAS-ABORTED",
    family: "OPERATION-KEY",
    findingIds: ["MPRR-V16-IHR-F013"],
    fixture: { alternateValue: carrierById.get("V16-REVIEW").root, baseOperationKey: operationKey, fieldName },
    fixtureClass: "NORMATIVE-MUTATION-USING-ACTUAL-FROZEN-INPUT-ROOT;NOT-BUSINESS-DATA",
    kind: "OPERATION_KEY_MUTATION",
    program: ["LOAD-COMPLETE-PRECOMMIT-ENVELOPE", "REPLACE-ONE-TOP-LEVEL-MEMBER", "RECOMPUTE-OPERATION-KEY", "REQUIRE-KEY-CHANGE", "ABORT-REPLAY-ALIAS"],
    vectorId: `MPRR-V17-VEC-OPKEY-${fieldName.replaceAll(/[^A-Za-z0-9]+/g, "-").toUpperCase()}`,
  });
}
for (const binding of detachedBindings) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: "TERM-CAS-ABORTED",
    family: "DETACHED-BINDING",
    findingIds: ["MPRR-V16-IHR-F014"],
    fixture: { bindingId: binding.bindingId, leftValue: subjectRoot, rightValue: carrierById.get("V16-REVIEW").root },
    fixtureClass: "NORMATIVE-DETACHMENT-USING-TWO-ACTUAL-FROZEN-ROOTS;NOT-BUSINESS-DATA",
    kind: "DETACHED_BINDING",
    program: ["LOAD-BINDING-PREDICATE", "COMPARE-CANONICAL-VALUES", "DERIVE-BINDING-FAILURE", "ABORT-BEFORE-CAS"],
    vectorId: `MPRR-V17-VEC-${binding.bindingId}`,
  });
}
for (const comparison of casComparisons.filter((item) => item.expectedRoot !== null)) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: "TERM-CAS-ABORTED",
    family: "CAS-RACE",
    findingIds: ["MPRR-V16-IHR-F015"],
    fixture: { comparisonId: comparison.comparisonId, expectedRoot: comparison.expectedRoot, racedObservedRoot: carrierById.get("V16-REVIEW").root },
    fixtureClass: "NORMATIVE-RACE-USING-ACTUAL-FROZEN-ROOT;NOT-BUSINESS-DATA",
    kind: "CAS_RACE",
    program: ["LOAD-BOUND-COMPARISON", "APPLY-CONCURRENT-HEAD-OBSERVATION", "COMPARE-EXPECTED-TO-OBSERVED", "ABORT-ATOMICALLY", "ASSERT-NO-PERMIT"],
    vectorId: `MPRR-V17-VEC-RACE-${comparison.comparisonId.slice(4)}`,
  });
}
for (const comparison of casComparisons.filter((item) => [item.expectedRoot, item.observedRoot, item.revocationHead].some((value) => value === null))) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: "TERM-CAS-ABORTED",
    family: "CAS-COMPLETENESS",
    findingIds: ["MPRR-V16-IHR-F015", "MPRR-V16-IHR-F016"],
    fixture: { comparisonId: comparison.comparisonId },
    fixtureClass: "ACTUAL-NORMATIVE-CAS-COMPARISON-WITH-TYPED-MISSING-LIVE-HEAD;NOT-BUSINESS-DATA",
    kind: "CAS_MISSING_COMPARISON",
    program: ["LOAD-ACTUAL-BOUND-COMPARISON", "VERIFY-EXPECTED-OBSERVED-AND-REVOCATION-HEADS", "DERIVE-MISSING-LIVE-HEAD", "ABORT-ATOMICALLY", "ASSERT-NO-DURABLE-AUTHORITY"],
    vectorId: `MPRR-V17-VEC-CAS-MISSING-${comparison.comparisonId.slice(4)}`,
  });
}

const replayCases = [
  ["SAME-KEY-SAME-ENVELOPE", true, true, "TERM-MECHANICAL-CLEAN", "RETURN-ORIGINAL-EXACT-RECEIPT"],
  ["SAME-KEY-DIFFERENT-ENVELOPE", true, false, "TERM-CAS-ABORTED", "CONFLICT"],
  ["CHANGED-HEAD", false, true, "TERM-CAS-ABORTED", "CAS-ABORT"],
  ["RESPONSE-LOSS", true, true, "TERM-MECHANICAL-CLEAN", "READ-ORIGINAL-RECEIPT-BY-EXACT-OPERATION-KEY"],
];
for (const [caseId, sameKey, sameEnvelope, expectedTerminal, expectedDecision] of replayCases) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal,
    family: "REPLAY",
    findingIds: ["MPRR-V16-IHR-F013", "MPRR-V16-IHR-F016"],
    fixture: { caseId, expectedDecision, sameEnvelope, sameKey },
    fixtureClass: "NORMATIVE-REPLAY-STATE;NOT-EXTERNAL-EVIDENCE;NOT-BUSINESS-DATA",
    kind: "REPLAY_CASE",
    program: ["COMPARE-OPERATION-KEY", "COMPARE-ENVELOPE-ROOT", "COMPARE-HEAD-SNAPSHOT", "DERIVE-REPLAY-DECISION", "ASSERT-NO-DUPLICATE-PERMIT"],
    vectorId: `MPRR-V17-VEC-REPLAY-${caseId}`,
  });
}
vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-READBACK-DIVERGED",
  family: "POST-READBACK",
  findingIds: ["MPRR-V16-IHR-F016"],
  fixture: { committedRoot: subjectRoot, observedReadbackRoot: carrierById.get("V16-REVIEW").root, revocationRequired: true },
  fixtureClass: "NORMATIVE-DIVERGENCE-USING-ACTUAL-FROZEN-ROOTS;NOT-BUSINESS-DATA",
  kind: "READBACK_DIVERGENCE",
  program: ["COMPARE-COMMITTED-AND-READBACK-ROOTS", "DERIVE-DIVERGENCE", "APPEND-REVOCATION-BEFORE-CONSUMPTION", "ADVANCE-REVOCATION-HEAD", "ASSERT-CONSUMER-BLOCKED"],
  vectorId: "MPRR-V17-VEC-POSTREADBACK-REVOKE",
});

for (const spec of machineSpecs) {
  const initialState = spec.states[0];
  const invalidEvent = spec.events.find((candidate) => !Object.hasOwn(spec.allowed, `${initialState}|${candidate}`));
  const event = invalidEvent ?? spec.events[0];
  const targetState = spec.allowed[`${initialState}|${event}`] ?? "BLOCKED";
  const expectedTerminal = stateTerminalId(spec.machineId, targetState);
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal,
    family: spec.machineId.slice(8),
    findingIds: ["MPRR-V16-IHR-F023", "MPRR-V16-IHR-F030"],
    fixture: { event, fromState: initialState, machineId: spec.machineId },
    fixtureClass: "NORMATIVE-STATE-EVENT-CONFORMANCE-LITERAL;NOT-EXTERNAL-EVIDENCE;NOT-BUSINESS-DATA",
    kind: "MACHINE_TRANSITION",
    program: ["LOAD-NORMATIVE-MACHINE", "DERIVE-TYPED-EVENT", "LOOKUP-UNIQUE-TRANSITION", "EXECUTE-DEFINED-GUARD", "COMPARE-TARGET-AND-TERMINAL"],
    vectorId: `MPRR-V17-VEC-MACHINE-${spec.machineId.slice(8)}-${invalidEvent ? "INVALID" : "REGISTERED"}-FROM-INITIAL`,
  });
}
const reviewTraces = [
  ["MISSING-REVIEWS", ["BIND_REVIEWS_FAIL"], "BLOCKED", "TERM-BLOCKED"],
  ["RECONCILIATION-FAIL", ["BIND_REVIEWS_OK", "RECONCILE_FAIL"], "REJECTED_FINAL", "TERM-REJECTED"],
  ["REJECT", ["BIND_REVIEWS_OK", "RECONCILE_OK", "CLOSE_REJECT"], "REJECTED_FINAL", "TERM-REJECTED"],
  ["APPEAL-REVOKE", ["BIND_REVIEWS_OK", "RECONCILE_OK", "CLOSE_ACCEPT", "FILE_APPEAL_OK", "REVOKE"], "REVOKED_FINAL", "TERM-REVOKED"],
  ["REMAND", ["BIND_REVIEWS_OK", "RECONCILE_OK", "CLOSE_ACCEPT", "FILE_APPEAL_OK", "REMAND"], "DRAFT", "TERM-CONTINUE"],
];
for (const [caseId, events, expectedState, expectedTerminal] of reviewTraces) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal,
    family: "REVIEW-LIFECYCLE",
    findingIds: ["MPRR-V16-IHR-F009", "MPRR-V16-IHR-F017", "MPRR-V16-IHR-F027"],
    fixture: { events, expectedState, machineId: "MACHINE-REVIEW" },
    fixtureClass: "NORMATIVE-STATE-MACHINE-CONFORMANCE-LITERAL;DOES-NOT-CLAIM-EXTERNAL-REVIEWS;NOT-BUSINESS-DATA",
    kind: "MACHINE_TRACE",
    program: ["START-AT-DECLARED-INITIAL-STATE", "LOOKUP-EACH-EVENT-IN-NORMATIVE-TRANSITION-REGISTRY", "EXECUTE-DEFINED-GUARDS", "DERIVE-FINAL-STATE", "MAP-THROUGH-ONE-TERMINAL-REGISTRY"],
    vectorId: `MPRR-V17-VEC-REVIEW-${caseId}`,
  });
}
const custodyTraces = [
  ["HOLD-WINS", ["PLACE_HOLD", "BEGIN_DELETE"], "BLOCKED"],
  ["DELETE-AND-TOMBSTONE", ["BEGIN_DELETE", "DELETE_COMPLETE", "WRITE_TOMBSTONE"], "TOMBSTONED"],
  ["DELETE-CONFLICT-RETRY", ["BEGIN_DELETE", "DELETE_CONFLICT", "RETRY", "DELETE_COMPLETE", "WRITE_TOMBSTONE"], "TOMBSTONED"],
  ["RESTORE-FENCED", ["BEGIN_DELETE", "DELETE_COMPLETE", "WRITE_TOMBSTONE", "RESTORE_ATTEMPT"], "BLOCKED"],
];
for (const [caseId, events, expectedState] of custodyTraces) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: expectedState === "BLOCKED" ? "TERM-BLOCKED" : "TERM-CONTINUE",
    family: "CUSTODY",
    findingIds: ["MPRR-V16-IHR-F028"],
    fixture: { events, expectedState, machineId: "MACHINE-CUSTODY" },
    fixtureClass: "NORMATIVE-CUSTODY-CONCURRENCY-SCHEDULE;CONTENT-IDENTITY-IS-SUBJECT-ROOT;NOT-BUSINESS-DATA",
    kind: "MACHINE_TRACE",
    program: ["START-AT-DECLARED-INITIAL-STATE", "EXECUTE-ORDERED-SCHEDULE", "APPLY-HOLD-PRECEDENCE", "VERIFY-TOMBSTONE-RESTORE-FENCE", "ASSERT-NO-FORBIDDEN-DELETION"],
    vectorId: `MPRR-V17-VEC-CUSTODY-${caseId}`,
  });
}

for (const fieldClass of publicProjectionPolicy.forbiddenFieldClasses) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: "TERM-PUBLIC-UNSAFE",
    family: "PUBLIC-PROJECTION",
    findingIds: ["MPRR-V16-IHR-F029"],
    fixture: { fieldClasses: [fieldClass], payloadBytes: publicProjectionPolicy.onlyAllowedBytes },
    fixtureClass: "NORMATIVE-FIELD-CLASS-LEAKAGE-LITERAL;CONTAINS-NO-SECRET-OR-PII-VALUE;NOT-BUSINESS-DATA",
    kind: "PUBLIC_PROJECTION",
    program: ["LOAD-FIXED-PUBLIC-POLICY", "CLASSIFY-FIELD-CLASSES", "COMPARE-EXACT-PAYLOAD-BYTES", "DERIVE-UNSAFE-PROJECTION", "BLOCK-BEFORE-PUBLIC-WRITE"],
    vectorId: `MPRR-V17-VEC-PUBLIC-${fieldClass}`,
  });
}
vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-BLOCKED",
  family: "PUBLIC-PROJECTION",
  findingIds: ["MPRR-V16-IHR-F029"],
  fixture: { fieldClasses: [], payloadBytes: publicProjectionPolicy.onlyAllowedBytes, requiredExternalBlocks: ["EXT-PUBLIC-DICTIONARY", "EXT-PUBLIC-POLICY-SEAL"] },
  fixtureClass: "NORMATIVE-FIXED-POLICY-LITERAL;NO-EVENT-DATA;NOT-BUSINESS-DATA",
  kind: "PUBLIC_PROJECTION",
  program: ["VERIFY-EXACT-FIXED-PAYLOAD", "VERIFY-ZERO-FORBIDDEN-FIELD-CLASSES", "CHECK-EXTERNAL-DICTIONARY-AND-SEAL", "BLOCK-WHILE-EXTERNAL-INPUT-MISSING"],
  vectorId: "MPRR-V17-VEC-PUBLIC-FIXED-BYTES-EXTERNAL-SEAL-MISSING",
});

const mediaCases = [
  ["MALFORMED-HEADER", { byteLength: 1, declaredCodec: "UNKNOWN", frameCount: 1, height: 1, width: 1 }],
  ["DECOMPRESSION-BOUND", { byteLength: 1, declaredCodec: "UNAPPROVED", frameCount: 1, height: 8192, width: 8192 }],
  ["OVERSIZED-DIMENSION", { byteLength: 1, declaredCodec: "UNAPPROVED", frameCount: 1, height: 8193, width: 1 }],
  ["UNSUPPORTED-CODEC", { byteLength: 1, declaredCodec: "UNSUPPORTED", frameCount: 1, height: 1, width: 1 }],
  ["POLICY-VIOLATION", { byteLength: 16777217, declaredCodec: "UNAPPROVED", frameCount: 1, height: 1, width: 1 }],
  ["DECODER-DISAGREEMENT", { byteLength: 1, declaredCodec: "UNAPPROVED", decoderDisagreement: true, frameCount: 1, height: 1, width: 1 }],
  ["CLEAN-BUT-DECODER-APPROVAL-MISSING", { byteLength: 1, declaredCodec: "UNAPPROVED", frameCount: 1, height: 1, width: 1 }],
];
for (const [caseId, metadata] of mediaCases) {
  vectorCores.push({
    expectedAuthorityOutputs: 0,
    expectedTerminal: "TERM-MEDIA-QUARANTINED",
    family: "MEDIA",
    findingIds: ["MPRR-V16-IHR-F031"],
    fixture: { metadata, requiredExternalBlock: "EXT-MEDIA-DECODER-APPROVAL" },
    fixtureClass: "NORMATIVE-MEDIA-SECURITY-METADATA-LITERAL;NO-MEDIA-BYTES;NOT-BUSINESS-DATA",
    kind: "MEDIA_POLICY",
    program: ["VALIDATE-METADATA-SCHEMA", "ENFORCE-RESOURCE-BOUNDS", "RESOLVE-APPROVED-DECODER", "DERIVE-QUARANTINE", "EMIT-ZERO-AUTHORITY-QUARANTINE-RECEIPT"],
    vectorId: `MPRR-V17-VEC-MEDIA-${caseId}`,
  });
}

vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-MECHANICAL-CLEAN",
  family: "DEPENDENCY",
  findingIds: ["MPRR-V16-IHR-F012"],
  fixture: { familyIds: dependencyFamilies.map((item) => item.familyId), instrumentedReads },
  fixtureClass: "ACTUAL-PACKAGE-DEPENDENCY-UNIVERSE;NOT-BUSINESS-DATA",
  kind: "DEPENDENCY_COVERAGE",
  program: ["LOAD-CLOSED-FAMILY-UNIVERSE", "VERIFY-MEMBERSHIP-PROOFS", "COMPARE-INSTRUMENTED-READS", "REQUIRE-UNCOVERED-READS-ZERO"],
  vectorId: "MPRR-V17-VEC-DEPENDENCY-CLOSED-UNIVERSE",
});
vectorCores.push({
  expectedAuthorityOutputs: 0,
  expectedTerminal: "TERM-MECHANICAL-CLEAN",
  family: "MODEL-CHECK",
  findingIds: ["MPRR-V16-IHR-F023", "MPRR-V16-IHR-F027", "MPRR-V16-IHR-F030"],
  fixture: { machineIds: controlMachines.map((item) => item.machineId) },
  fixtureClass: "ACTUAL-NORMATIVE-MACHINE-REGISTRY;NOT-BUSINESS-DATA",
  kind: "MODEL_CHECK_ALL",
  program: ["ENUMERATE-EVERY-STATE-EVENT-PAIR", "VERIFY-EXACTLY-ONE-TRANSITION", "VERIFY-EVERY-GUARD-DEFINED", "VERIFY-REQUIRED-STATES-REACHABLE", "VERIFY-NEGATIVE-TO-SUCCESS-ZERO"],
  vectorId: "MPRR-V17-VEC-MODEL-CHECK-ALL-FAMILIES",
});

const causalVectors = vectorCores.map((core) => ({
  ...core,
  expectedResultRoot: rooted("MPRR-V17-EXPECTED-VECTOR-RESULT", "1", core.vectorId, core.expectedTerminal, String(core.expectedAuthorityOutputs)),
  policyRoot: policyById.get(
    core.family === "PUBLIC-PROJECTION" ? "POLICY-PUBLIC"
      : core.family === "MEDIA" ? "POLICY-MEDIA"
        : core.family === "REPLAY" ? "POLICY-REPLAY"
          : core.family === "OPERATION-KEY" || core.family === "CAS-RACE" || core.family === "CAS-COMPLETENESS" || core.family === "POST-READBACK" ? "POLICY-COMMIT"
            : core.family === "SOURCE-GRAPH" || core.family === "PREDECESSOR-SOURCE-GRAPH" ? "POLICY-SOURCE-GRAPH"
              : "POLICY-CANONICAL",
  ).policyRoot,
  vectorRoot: rooted("MPRR-V17-CAUSAL-VECTOR", "1", canonical(core)),
}));
const vectorById = new Map(causalVectors.map((vector) => [vector.vectorId, vector]));

const closureCrosswalk = findingBlocks.map((block, index) => {
  const shortId = `F${String(index + 1).padStart(3, "0")}`;
  const sourceMember = sourceMemberByKey.get(`V16-FINDINGS/${block.memberId}`);
  const control = findingControlById.get(block.memberId);
  const { conjuncts } = findingProperties(block);
  const vectorIds = causalVectors.filter((vector) => vector.findingIds.includes(block.memberId)).map((vector) => vector.vectorId).sort();
  const targetOutputIds = findingOutputNumbers[shortId].map((number) => `MPRR-V17-OUT-${String(number).padStart(3, "0")}`);
  const producerClosureReceiptCore = {
    controlRoot: control.controlRoot,
    sourceMemberDigest: sourceMember.memberDigest,
    targetOutputRoots: targetOutputIds.map((outputId) => outputById.get(outputId).outputRoot),
    vectorRoots: vectorIds.map((vectorId) => vectorById.get(vectorId).vectorRoot),
  };
  return {
    acceptanceCredit: 0,
    crosswalkId: `MPRR-V17-XW-${shortId}`,
    independentSemanticReceiptBlockId: "EXT-INDEPENDENT-SEMANTIC-RECEIPT",
    mergePolicy: "PROHIBITED;THIS-ROW-CREDITS-ONLY-ONE-SOURCE-FINDING",
    producerClosureReceiptRoot: rooted("MPRR-V17-PRODUCER-CLOSURE-RECEIPT", "1", canonical(producerClosureReceiptCore)),
    producerImplementationState: "IMPLEMENTED-PENDING-INDEPENDENT-HOSTILE-REVIEW",
    sourceFindingId: block.memberId,
    sourceMemberCoreRoot: sourceMember.memberCoreRoot,
    sourceMemberDigest: sourceMember.memberDigest,
    sourceMemberLocator: `${carrierById.get("V16-FINDINGS").path}#bytes=${sourceMember.byteStart}-${sourceMember.byteEndExclusive}`,
    sourceConjuncts: conjuncts,
    targetControlId: control.controlId,
    targetControlLocator: `${logical("normative-registry.json")}#/findingControls/${index}`,
    targetControlRoot: control.controlRoot,
    targetEvidenceLocators: [
      `${logical("normative-registry.json")}#/findingControls/${index}`,
      ...targetOutputIds.map((outputId) => `${logical("requirement-outputs.jsonl")}#recordId=${outputId}`),
      ...vectorIds.map((vectorId) => `${logical("causal-vectors.jsonl")}#recordId=${vectorId}`),
    ],
    targetOutputIds,
    vectorIds,
  };
});

const graphNodes = [];
const graphEdges = [];
for (const [index, block] of findingBlocks.entries()) {
  const findingId = block.memberId;
  const vectorId = `MPRR-V17-VEC-SOURCE-${String(index + 1).padStart(3, "0")}`;
  const nodeIds = {
    source: `SOURCE:${findingId}`,
    mutation: `MUTATION:${findingId}`,
    observation: `OBSERVATION:${findingId}`,
    condition: `DERIVED-CONDITION:${findingId}`,
    actual: `ACTUAL-TERMINAL:${findingId}`,
    expected: `EXPECTED-ORACLE:${findingId}`,
    compare: `ORACLE-COMPARISON:${findingId}`,
    control: `CONTROL:${findingId}`,
  };
  graphNodes.push(
    { nodeId: nodeIds.source, nodeType: "IMMUTABLE-SOURCE-MEMBER", root: sourceMemberByKey.get(`V16-FINDINGS/${findingId}`).memberCoreRoot },
    { nodeId: nodeIds.mutation, nodeType: "IN-MEMORY-MUTATION-PROGRAM", root: vectorById.get(vectorId).vectorRoot },
    { nodeId: nodeIds.observation, nodeType: "COMPUTED-DIGEST-OBSERVATION", root: null },
    { nodeId: nodeIds.condition, nodeType: "EVALUATOR-DERIVED-FAILURE-CONDITION", root: recordRoot("MPRR-V17-DERIVED-CONDITION-NODE", { findingId, conditionId: "FC-SOURCE-GRAPH" }) },
    { nodeId: nodeIds.actual, nodeType: "EVALUATOR-ACTUAL-TERMINAL", root: null },
    { nodeId: nodeIds.expected, nodeType: "NON-EXECUTING-EXPECTED-ORACLE", root: vectorById.get(vectorId).expectedResultRoot },
    { nodeId: nodeIds.compare, nodeType: "POST-EXECUTION-ORACLE-COMPARISON", root: null },
    { nodeId: nodeIds.control, nodeType: "MATERIALIZED-SUCCESSOR-CONTROL", root: findingControlById.get(findingId).controlRoot },
  );
  graphEdges.push(
    { from: nodeIds.source, relation: "READS-ACTUAL-BYTES", to: nodeIds.mutation },
    { from: nodeIds.mutation, relation: "PRODUCES-MUTATED-BYTES", to: nodeIds.observation },
    { from: nodeIds.observation, relation: "EVALUATOR-DERIVES;NO-CALLER-TRIGGER", to: nodeIds.condition },
    { from: nodeIds.condition, relation: "TOTAL-TERMINAL-FUNCTION", to: nodeIds.actual },
    { from: nodeIds.actual, relation: "POST-EXECUTION-ACTUAL", to: nodeIds.compare },
    { from: nodeIds.expected, relation: "POST-EXECUTION-ORACLE-ONLY", to: nodeIds.compare },
    { from: nodeIds.source, relation: "IMMUTABLE-SEMANTIC-BASIS", to: nodeIds.control },
  );
}
for (const [index, row] of predecessorClauseCrosswalk.entries()) {
  const rowKey = row.predecessorCrosswalkId;
  const vectorId = `MPRR-V17-VEC-PREDECESSOR-XW-${String(index + 1).padStart(3, "0")}`;
  const nodeIds = {
    source: `SOURCE:${rowKey}`,
    mutation: `MUTATION:${rowKey}`,
    observation: `OBSERVATION:${rowKey}`,
    condition: `DERIVED-CONDITION:${rowKey}`,
    actual: `ACTUAL-TERMINAL:${rowKey}`,
    expected: `EXPECTED-ORACLE:${rowKey}`,
    compare: `ORACLE-COMPARISON:${rowKey}`,
    predicates: `SEMANTIC-PREDICATES:${rowKey}`,
  };
  graphNodes.push(
    { nodeId: nodeIds.source, nodeType: "IMMUTABLE-SOURCE-MEMBER", root: row.sourceMemberCoreRoot },
    { nodeId: nodeIds.mutation, nodeType: "IN-MEMORY-MUTATION-PROGRAM", root: vectorById.get(vectorId).vectorRoot },
    { nodeId: nodeIds.observation, nodeType: "COMPUTED-DIGEST-OBSERVATION", root: null },
    { nodeId: nodeIds.condition, nodeType: "EVALUATOR-DERIVED-FAILURE-CONDITION", root: recordRoot("MPRR-V17-DERIVED-CONDITION-NODE", { predecessorCrosswalkId: rowKey, conditionId: "FC-SOURCE-GRAPH" }) },
    { nodeId: nodeIds.actual, nodeType: "EVALUATOR-ACTUAL-TERMINAL", root: null },
    { nodeId: nodeIds.expected, nodeType: "NON-EXECUTING-EXPECTED-ORACLE", root: vectorById.get(vectorId).expectedResultRoot },
    { nodeId: nodeIds.compare, nodeType: "POST-EXECUTION-ORACLE-COMPARISON", root: null },
    { nodeId: nodeIds.predicates, nodeType: "NON-SELF-OWNED-SEMANTIC-PREDICATE-SET", root: rooted("MPRR-V17-PREDICATE-SET", "1", ...row.predicateRoots) },
  );
  graphEdges.push(
    { from: nodeIds.source, relation: "READS-ACTUAL-BYTES", to: nodeIds.mutation },
    { from: nodeIds.mutation, relation: "PRODUCES-MUTATED-BYTES", to: nodeIds.observation },
    { from: nodeIds.observation, relation: "EVALUATOR-DERIVES;NO-CALLER-TRIGGER", to: nodeIds.condition },
    { from: nodeIds.condition, relation: "TOTAL-TERMINAL-FUNCTION", to: nodeIds.actual },
    { from: nodeIds.actual, relation: "POST-EXECUTION-ACTUAL", to: nodeIds.compare },
    { from: nodeIds.expected, relation: "POST-EXECUTION-ORACLE-ONLY", to: nodeIds.compare },
    { from: nodeIds.source, relation: "IMMUTABLE-SEMANTIC-BASIS", to: nodeIds.predicates },
  );
}
const causalSourceGraph = {
  edgeCount: graphEdges.length,
  edges: graphEdges,
  graphId: "MPRR-V17-CAUSAL-SOURCE-GRAPH",
  injectedFailurePreconditionEdges: 0,
  nodeCount: graphNodes.length,
  nodes: graphNodes,
  requiredOrder: ["IMMUTABLE-SOURCE-MEMBER", "IN-MEMORY-MUTATION-PROGRAM", "COMPUTED-DIGEST-OBSERVATION", "EVALUATOR-DERIVED-FAILURE-CONDITION", "EVALUATOR-ACTUAL-TERMINAL", "POST-EXECUTION-ORACLE-COMPARISON"],
  schemaVersion: "1",
};

const roleNames = ["CANDIDATE-AUTHOR", "PRODUCER-QA", "REVIEWER-A", "REVIEWER-B", "REVIEWER-C", "RECONCILER", "ACCEPTOR", "APPEAL-DECIDER"];
const roleAppointmentBlock = {
  "REVIEWER-A": "EXT-REVIEWER-A-APPOINTMENT",
  "REVIEWER-B": "EXT-REVIEWER-B-APPOINTMENT",
  "REVIEWER-C": "EXT-REVIEWER-C-APPOINTMENT",
};
const roleInstances = roleNames.map((role) => ({
  appointmentRoot: null,
  appointmentState: roleAppointmentBlock[role] ? "MISSING-EXTERNAL-INPUT" : "NO-EXTERNAL-APPOINTMENT-PROVIDED",
  appointmentBlockId: roleAppointmentBlock[role] ?? null,
  dimensionEvidenceRoots: [],
  generation: 1,
  principalRoot: null,
  role,
  roleInstanceId: `MPRR-V17-ROLE-${role}`,
  state: "INELIGIBLE-MISSING-EXTERNAL-IDENTITY-AND-APPOINTMENT",
  subjectRoot,
}));
const appointmentRecords = ["A", "B", "C"].map((label) => ({
  appointmentId: `MPRR-V17-REVIEWER-${label}-APPOINTMENT-SLOT`,
  externalInputBlockId: `EXT-REVIEWER-${label}-APPOINTMENT`,
  issuerRoot: null,
  principalRoot: null,
  revocationHeadRoot: null,
  role: `REVIEWER-${label}`,
  schemaId: "SCHEMA-APPOINTMENT",
  signatureRoot: null,
  state: "MISSING-EXTERNAL-INPUT",
  subjectRoot,
  validityIntervalRoot: null,
}));
const eligibilityDecisions = [];
for (let left = 0; left < roleInstances.length; left += 1) {
  for (let right = left + 1; right < roleInstances.length; right += 1) {
    const core = {
      decisionAuthorityRoot: null,
      dimensionResults: separationDimensions.map((dimension) => ({ dimension, result: "MISSING-EVIDENCE;INELIGIBLE" })),
      eligible: false,
      leftRoleInstanceRoot: recordRoot("MPRR-V17-ROLE-INSTANCE", roleInstances[left]),
      rightRoleInstanceRoot: recordRoot("MPRR-V17-ROLE-INSTANCE", roleInstances[right]),
      signatureRoot: null,
    };
    eligibilityDecisions.push({
      ...core,
      decisionId: `MPRR-V17-ELIGIBILITY-${String(eligibilityDecisions.length + 1).padStart(3, "0")}`,
      decisionRoot: rooted("MPRR-V17-ELIGIBILITY-DECISION", "1", canonical(core)),
      state: "BLOCKED-MISSING-EXTERNAL-DIMENSION-EVIDENCE-AND-AUTHORITY",
    });
  }
}
const reviewEnvelopeSlots = ["A", "B", "C"].map((label) => ({
  externalInputBlockId: `EXT-REVIEW-${label}-ENVELOPE`,
  requiredDomain: `REVIEW-${label}`,
  schemaId: "SCHEMA-REVIEW-ENVELOPE",
  slotId: `MPRR-V17-REVIEW-${label}-SLOT`,
  state: "MISSING-EXTERNAL-INPUT",
  subjectRoot,
}));

const referenceFieldKinds = {
  appointmentBlockId: "EXTERNAL-INPUT-BLOCK",
  closureControlIds: "FINDING-CONTROL",
  dictionaryVersionBlockId: "EXTERNAL-INPUT-BLOCK",
  expectedTerminal: "TERMINAL",
  externalSealBlockId: "EXTERNAL-INPUT-BLOCK",
  externalDecoderApprovalBlockId: "EXTERNAL-INPUT-BLOCK",
  externalInputBlockId: "EXTERNAL-INPUT-BLOCK",
  findingIds: "SOURCE-FINDING",
  guardId: "GUARD",
  humanApprovalBlockId: "EXTERNAL-INPUT-BLOCK",
  independentReceiptBlockId: "EXTERNAL-INPUT-BLOCK",
  independentSemanticReceiptBlockId: "EXTERNAL-INPUT-BLOCK",
  machineId: "CONTROL-MACHINE",
  missingAnchorBlockId: "EXTERNAL-INPUT-BLOCK",
  missingExternalBindings: "EXTERNAL-INPUT-BLOCK",
  missingExternalInputBlockIds: "EXTERNAL-INPUT-BLOCK",
  missingObservationBlockId: "EXTERNAL-INPUT-BLOCK",
  missingReceiptBlockId: "EXTERNAL-INPUT-BLOCK",
  predecessorRequirementId: "SOURCE-REQUIREMENT",
  predecessorCrosswalkId: "PREDECESSOR-CLAUSE-ROW",
  predicateIds: "SEMANTIC-PREDICATE",
  requiredExternalBlock: "EXTERNAL-INPUT-BLOCK",
  requiredExternalBlocks: "EXTERNAL-INPUT-BLOCK",
  requirementId: "REQUIREMENT",
  schemaId: "SCHEMA",
  schemaRefs: "SCHEMA",
  sourceFindingId: "SOURCE-FINDING",
  targetControlId: "FINDING-CONTROL",
  targetOutputId: "REQUIREMENT-OUTPUT",
  targetOutputIds: "REQUIREMENT-OUTPUT",
  terminalId: "TERMINAL",
  v16RequirementId: "SOURCE-REQUIREMENT",
  v17OutputId: "REQUIREMENT-OUTPUT",
  vectorIds: "VECTOR",
};

const lifecycleTerminalMap = controlMachines.flatMap((machine) => machine.states.map((state) => {
  const terminalId = stateTerminalId(machine.machineId, state);
  return {
    authorityEffect: terminalById.get(terminalId).authorityEffect,
    machineId: machine.machineId,
    resultStatus: terminalById.get(terminalId).resultStatus,
    state,
    terminalId,
  };
}));

const normativeRegistry = {
  artifactId,
  authorityState: {
    Acceptance: 0,
    Gate29: "BLOCKED",
    authorityOutputs: 0,
    developmentFreeze: "ACTIVE",
    independentReceipt: "MISSING-EXTERNAL-INPUT",
    repository: "PUBLIC-PERMANENT",
  },
  canonicalConstruction: {
    canonicalJson: "UTF-8 JSON; object keys sorted by Unicode code-point order; arrays preserve declared order; strings use JSON escaping; booleans lowercase; null literal; integers base-10 without leading zero; floats forbidden",
    cpb1: "for each field: unsigned 64-bit big-endian byte length followed by exact bytes",
    root: "SHA-256(CPB1(domain,version,...orderedFields)); domain and version are separate frames",
    schemaVersion: "1",
  },
  causalExecution: {
    expectedOracleTiming: "after actual evaluation only",
    failureConditionSource: "typed observed state only; caller-supplied trigger IDs forbidden",
    graphPath: logical("causal-source-graph.json"),
    injectedFailurePreconditionEdges: 0,
  },
  closureCounters: {
    findingControls: findingControls.length,
    findingMergeRows: 0,
    findingRangeRows: 0,
    predecessorFindingRows: 16,
    predecessorClauseRows: predecessorClauseCrosswalk.length,
    predecessorSemanticPredicates: predecessorSemanticPredicates.length,
    predecessorSymbolicLocatorsConverted: convertedSymbolicConjuncts,
    predecessorRequirementRows: 112,
    requirementOutputs: requirementOutputs.length,
  },
  commitContract,
  controlMachines,
  controlTransitions,
  dependencyUniverse,
  detachedBindings,
  custodyContract: {
    atomicTransitionRule: "compare legalHoldHead, deletionHead, replicaSetRoot, retentionPolicyRoot and trusted time in one transition; any missing, changed or conflicting value blocks",
    conflictPrecedence: "LEGAL-HOLD-OR-REVOCATION-WINS;DELETE-CONFLICT-BLOCKS;RESTORE-AFTER-TOMBSTONE-BLOCKS",
    idempotencyRule: "same contentId, plan root and operation key returns the original exact receipt; any changed member is CONFLICT",
    receiptSchemaIds: ["SCHEMA-DELETION-PLAN", "SCHEMA-CUSTODY-CONFLICT", "SCHEMA-CUSTODY-RECEIPT", "SCHEMA-DELETION-RECEIPT", "SCHEMA-TOMBSTONE"],
    requiredCompletionEvidence: ["ALL-DISCOVERED-REPLICA-RECEIPTS", "ALL-KEY-ERASURE-RECEIPTS", "RESTORE-FENCING-TOMBSTONE", "TRUSTED-TIME", "FRESH-REVOCATION-HEADS"],
  },
  eligibilityDecisions,
  externalInputBlocks,
  failureConditions,
  findingControls,
  guards,
  lifecycleTerminalMap,
  mediaContract: {
    decoderIdentityRule: "decoder root must be present in externally approved set; current set is unavailable and admission is zero",
    limits: mediaLimits,
    malformedDisposition: "QUARANTINE;AUTHORITY=NONE",
    receiptSchemas: ["SCHEMA-MEDIA-INPUT", "SCHEMA-MEDIA-LIMITS", "SCHEMA-DECODER-IDENTITY", "SCHEMA-MEDIA-VALIDATION-RECEIPT", "SCHEMA-QUARANTINE-RECEIPT"],
  },
  parserProfiles,
  policies,
  publicProjectionPolicy,
  readerProvenance,
  repositoryRootPolicy: {
    forbiddenPrefixes: ["web/", "/"],
    logicalRoot: ".",
    marker: "directory that directly contains docs/",
    parentTraversal: "FORBIDDEN",
    resolverRule: "resolve every emitted path exactly once from logicalRoot; no fallback, repair, prefix stripping or alternate root",
  },
  requirementOutputContract: {
    constructor: "SHA-256(CPB1(domain=MPRR-V17-REQUIREMENT-OUTPUT,version=1,canonical(constructorInputs)))",
    count: 112,
    custodyPath: logical("requirement-outputs.jsonl"),
    requiredConstructorInputs: ["outputId", "requirementId", "predecessorRequirementId", "outputType", "sourceMemberDigest", "sourceMemberCoreRoot", "predecessorFiveFieldDigestVector", "canonicalFiveFieldDigestVector", "closureControlIds"],
  },
  predecessorSemanticContract: {
    clauseCrosswalkCount: 323,
    clauseCrosswalkPath: logical("predecessor-clause-crosswalk.jsonl"),
    mergeOrRangeCredit: 0,
    semanticPredicateCount: 4016,
    semanticPredicatePath: logical("predecessor-semantic-predicates.jsonl"),
    selfOwnedTargetLocators: 0,
    symbolicConjunctLocators: 0,
    translatedSymbolicConjuncts: 3376,
  },
  reviewGovernance: {
    acceptancePredicate: "exactly three pairwise-distinct eligible sealed Review roots AND one matching reconciliation root AND P0=0 AND P1=0 AND every P2/P3 has a valid signed RiskDisposition AND every external authority/time/finality/dependency input is valid and fresh",
    appointmentRecords,
    externalContractCarrier: { carrierId: "GOVERNING-THREE-REVIEW", root: carrierById.get("GOVERNING-THREE-REVIEW").root, custodyLocator: carrierById.get("GOVERNING-THREE-REVIEW").custodyLocator },
    generationLimit: 2,
    noSelfApproval: true,
    quorum: { domains: ["REVIEW-A", "REVIEW-B", "REVIEW-C"], requiredDistinctEligibleSeals: 3 },
    reviewEnvelopeSlots,
    roleInstances,
    separationRules,
  },
  riskContract: {
    booleanDispositionForbidden: true,
    p0p1Disposition: "NON-WAIVABLE;BLOCK",
    p2p3RequiredSchemaId: "SCHEMA-RISK-DISPOSITION",
    currentP2FindingSlots: [{ findingId: "MPRR-V16-IHR-F031", riskDispositionRoot: null, state: "MISSING-EXTERNAL-INPUT", humanApprovalBlockId: "EXT-HUMAN-APPROVAL" }],
    revocationWins: true,
  },
  schemas,
  semanticUseDiscovery: {
    comparisonRule: "independently traverse typed JSON AST fields listed in referenceFieldKinds, independently byte-scan declared Subject Markdown token grammars, and compare exact occurrence tuples to semantic-use-index.jsonl",
    implicitProducerAnnotationGrammar: "FORBIDDEN-AS-SOLE-DISCOVERY-MECHANISM",
    mutationRule: "an inserted typed reference field must be discovered and makes the old index invalid",
    referenceFieldKinds,
  },
  sourceCarriers: carriers.map(({ bytesValue: ignored, ...carrier }) => carrier),
  sourceMemberConstruction: {
    memberCoreExcludes: ["namespaceRoot"],
    memberCoreRoot: "SHA-256(CPB1(MPRR-V17-MEMBER-CORE,1,canonical(MemberCore)))",
    memberSetRoot: "SHA-256(CPB1(MPRR-V17-MEMBER-SET,1,sorted memberCoreRoot values))",
    namespaceRoot: "SHA-256(CPB1(MPRR-V17-NAMESPACE,1,canonical(NamespaceCore)))",
    order: ["carrierRoot", "parserProfileRoot", "MemberCore", "memberCoreRoot", "memberSetRoot", "NamespaceCore", "namespaceRoot"],
  },
  sourceMembers,
  sourceNamespaces,
  terminalRegistry,
  timeContract: {
    boundaryRule: "integer nanosecond half-open intervals [lowerBoundNs,upperBoundNsExclusive)",
    missingObservationBlockId: "EXT-CLOCK-OBSERVATIONS",
    quorumRule: "appointed signed sources; non-empty intersection; bounded skew and freshness; monotonic epoch/counter",
    states: ["VALID", "STALE", "ROLLBACK", "SPLIT", "MISSING"],
  },
  trustContract: {
    algorithmPolicy: { ...algorithmPolicy, algorithmPolicyRoot },
    algorithmDowngrade: "BLOCK",
    missingAnchorBlockId: "EXT-TRUST-ANCHORS",
    orderedChecks: ["SCHEMA", "DOMAIN", "ALGORITHM", "ISSUER", "AUDIENCE", "PURPOSE", "EPOCH", "VALIDITY", "CHAIN", "TRANSPARENCY", "REVOCATION", "SIGNATURE"],
    templates: { keyRecordSchemaId: "SCHEMA-KEY-RECORD", signatureRecordSchemaId: "SCHEMA-SIGNATURE-RECORD", trustAnchorSetSchemaId: "SCHEMA-TRUST-ANCHOR-SET" },
  },
  finalityContract: {
    conflictReachableEvent: "CONFLICT_DETECTED",
    missingReceiptBlockId: "EXT-FINALITY-RECEIPT",
    orderedChecks: ["SCHEMA", "SOURCE-APPOINTMENT", "SIGNATURE", "REVOCATION", "CONFIRMATION-RULE", "MEMBERSHIP", "CONSISTENCY", "CONFLICT", "ROLLBACK", "FRESHNESS"],
    templates: { checkpointSchemaId: "SCHEMA-FINALITY-CHECKPOINT", receiptSchemaId: "SCHEMA-FINALITY-RECEIPT" },
  },
};

writeJson(paths.registry, normativeRegistry);
writeJsonl(paths.outputs, requirementOutputs);
writeJsonl(paths.crosswalk, closureCrosswalk);
writeJsonl(paths.predecessor, predecessorClosure);
writeJsonl(paths.predecessorClauses, predecessorClauseCrosswalk);
writeJsonl(paths.semanticPredicates, predecessorSemanticPredicates);
writeJsonl(paths.vectors, causalVectors);
writeJson(paths.graph, causalSourceGraph);

const targetSets = {
  "CONTROL-MACHINE": new Set(controlMachines.map((item) => item.machineId)),
  "EXTERNAL-INPUT-BLOCK": new Set(externalInputBlocks.map((item) => item.blockId)),
  "FINDING-CONTROL": new Set(findingControls.map((item) => item.controlId)),
  GUARD: new Set(guards.map((item) => item.guardId)),
  POLICY: new Set(policies.map((item) => item.policyId)),
  "REQUIREMENT-OUTPUT": new Set(requirementOutputs.map((item) => item.outputId)),
  REQUIREMENT: new Set(requirementOutputs.map((item) => item.requirementId)),
  "PREDECESSOR-CLAUSE-ROW": new Set(predecessorClauseCrosswalk.map((item) => item.predecessorCrosswalkId)),
  "SEMANTIC-PREDICATE": new Set(predecessorSemanticPredicates.map((item) => item.predicateId)),
  SCHEMA: new Set(schemas.map((item) => item.schemaId)),
  "SOURCE-FINDING": new Set(findingBlocks.map((item) => item.memberId)),
  "SOURCE-REQUIREMENT": new Set(requirementBlocks.map((item) => item.memberId)),
  TERMINAL: new Set(terminalRegistry.map((item) => item.terminalId)),
  VECTOR: new Set(causalVectors.map((item) => item.vectorId)),
};
const semanticUses = [];
const traverseReferences = (value, artifactPath, pointer = "") => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => traverseReferences(item, artifactPath, `${pointer}/${index}`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPointer = `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
    const targetKind = Object.hasOwn(referenceFieldKinds, key) ? referenceFieldKinds[key] : null;
    if (targetKind) {
      const targetValues = Array.isArray(child) ? child : [child];
      targetValues.forEach((targetId, occurrenceIndex) => {
        if (typeof targetId !== "string") return;
        const resolved = targetSets[targetKind]?.has(targetId) ?? false;
        const identity = `${artifactPath}|${childPointer}|${occurrenceIndex}|${targetKind}|${targetId}`;
        semanticUses.push({
          artifactPath,
          jsonPointer: childPointer,
          occurrenceIndex,
          referenceField: key,
          resolution: resolved ? "RESOLVED" : "UNRESOLVED",
          targetId,
          targetKind,
          useId: `MPRR-V17-USE-${sha256(Buffer.from(identity, "utf8")).slice(0, 32).toUpperCase()}`,
        });
      });
    }
    if (key !== "referenceFieldKinds") traverseReferences(child, artifactPath, childPointer);
  }
};
traverseReferences(normativeRegistry, logical("normative-registry.json"));
requirementOutputs.forEach((record, index) => traverseReferences(record, logical("requirement-outputs.jsonl"), `/${index}`));
closureCrosswalk.forEach((record, index) => traverseReferences(record, logical("closure-crosswalk.jsonl"), `/${index}`));
predecessorClosure.forEach((record, index) => traverseReferences(record, logical("predecessor-closure.jsonl"), `/${index}`));
predecessorClauseCrosswalk.forEach((record, index) => traverseReferences(record, logical("predecessor-clause-crosswalk.jsonl"), `/${index}`));
predecessorSemanticPredicates.forEach((record, index) => traverseReferences(record, logical("predecessor-semantic-predicates.jsonl"), `/${index}`));
causalVectors.forEach((record, index) => traverseReferences(record, logical("causal-vectors.jsonl"), `/${index}`));
const markdownReferencePatterns = [
  [/MPRR-V16-IHR-F\d{3}/g, "SOURCE-FINDING"],
  [/MPRR-V16-REQ-\d{3}/g, "SOURCE-REQUIREMENT"],
  [/MPRR-V17-CONTROL-F\d{3}/g, "FINDING-CONTROL"],
  [/MPRR-V17-REQ-\d{3}/g, "REQUIREMENT"],
  [/MPRR-V17-OUT-\d{3}/g, "REQUIREMENT-OUTPUT"],
  [/EXT-[A-Z0-9-]+/g, "EXTERNAL-INPUT-BLOCK"],
];
const subjectText = subjectBytes.toString("utf8");
for (const [pattern, targetKind] of markdownReferencePatterns) {
  for (const match of subjectText.matchAll(pattern)) {
    const byteStart = Buffer.byteLength(subjectText.slice(0, match.index), "utf8");
    const byteEndExclusive = byteStart + Buffer.byteLength(match[0], "utf8");
    const artifactPath = logical("subject.md");
    const jsonPointer = `#bytes=${byteStart}-${byteEndExclusive}`;
    const targetId = match[0];
    const identity = `${artifactPath}|${jsonPointer}|0|${targetKind}|${targetId}`;
    semanticUses.push({
      artifactPath,
      jsonPointer,
      occurrenceIndex: 0,
      referenceField: "markdownToken",
      resolution: targetSets[targetKind]?.has(targetId) ? "RESOLVED" : "UNRESOLVED",
      targetId,
      targetKind,
      useId: `MPRR-V17-USE-${sha256(Buffer.from(identity, "utf8")).slice(0, 32).toUpperCase()}`,
    });
  }
}
semanticUses.sort((left, right) => left.useId.localeCompare(right.useId));
assert(new Set(semanticUses.map((item) => item.useId)).size === semanticUses.length, "semantic-use IDs collide");
assert(
  semanticUses.every((item) => item.resolution === "RESOLVED"),
  `unresolved semantic uses: ${semanticUses.filter((item) => item.resolution !== "RESOLVED").length}; ${[...new Set(semanticUses.filter((item) => item.resolution !== "RESOLVED").map((item) => `${item.referenceField}=${item.targetId}`))].slice(0, 20).join(";")}`,
);
writeJsonl(paths.uses, semanticUses);

const payloadPaths = [paths.subject, paths.registry, paths.outputs, paths.crosswalk, paths.predecessor, paths.predecessorClauses, paths.semanticPredicates, paths.vectors, paths.graph, paths.uses];
const payloadMembers = payloadPaths.map((path) => {
  const bytes = readFileSync(path);
  return {
    bytes: bytes.length,
    lines: lineCount(bytes),
    path: logical(path.slice(packageDir.length + 1)),
    root: sha256(bytes),
  };
});
const packageRoot = rooted("MPRR-V17-NORMATIVE-PACKAGE", "1", ...payloadMembers.map((item) => canonical(item)).sort(), generatorRoot, readerARoot, readerBRoot);
const packageManifest = {
  artifactId,
  authorityState: normativeRegistry.authorityState,
  frozenInputs: carriers.filter((item) => item.inputClass === "PRIMARY-FROZEN").map((item) => ({ bytes: item.bytes, lines: item.lines, path: item.path, root: item.root })),
  packageRoot,
  packageRootConstructor: "SHA-256(CPB1(MPRR-V17-NORMATIVE-PACKAGE,1,sorted canonical payload member records,generatorRoot,readerARoot,readerBRoot))",
  packageSchemaVersion: "1",
  payloadMembers,
  producerTools: [
    { path: logical("generate.mjs"), root: generatorRoot, role: "DETERMINISTIC-PRODUCER" },
    { path: logical("reader-a.mjs"), root: readerARoot, role: "PRODUCER-MECHANICAL-READER-A" },
    { path: logical("reader-b.rb"), root: readerBRoot, role: "PRODUCER-MECHANICAL-READER-B" },
  ],
  repositoryRootPolicy: normativeRegistry.repositoryRootPolicy,
};
writeJson(paths.manifest, packageManifest);

execFileSync(process.execPath, [paths.readerA, packageDir], { stdio: "inherit" });
execFileSync("ruby", [paths.readerB, packageDir], { stdio: "inherit" });
const reportA = JSON.parse(readFileSync(paths.reportA, "utf8"));
const reportB = JSON.parse(readFileSync(paths.reportB, "utf8"));
assert(reportA.status === "PASS" && reportB.status === "PASS", "reader QA did not pass");
assert(reportA.commonResultRoot === reportB.commonResultRoot, "readers disagree on common result root");

const reportABytes = readFileSync(paths.reportA);
const reportBBytes = readFileSync(paths.reportB);
const producerQALines = [
  "# Protocol v1.7 immutable successor — detached Producer QA",
  "",
  "## 1. Outcome",
  "",
  "1.1 PRODUCER-MECHANICAL-QA=PASS.",
  "",
  "1.2 This document is detached from the normative package root and is not Acceptance, an independent hostile review, a semantic-closure receipt, B0 authority, HumanApproval or a ProtocolUsePermit.",
  "",
  `1.3 normativePackageRoot=${packageRoot}.`,
  "",
  `1.4 readerAReportRoot=${sha256(reportABytes)}; readerBReportRoot=${sha256(reportBBytes)}; commonResultRoot=${reportA.commonResultRoot}.`,
  "",
  "## 2. Frozen-input integrity",
  "",
  ...carriers.filter((item) => item.inputClass === "PRIMARY-FROZEN").flatMap((item, index) => [
    `2.${index + 1} path=${item.path}; SHA-256=${item.root}; bytes=${item.bytes}; lines=${item.lines}.`,
    "",
  ]),
  "## 3. Mechanical counters",
  "",
  `3.1 sourceCarriers=${carriers.length}; sourceNamespaces=${sourceNamespaces.length}; sourceMembers=${sourceMembers.length}; invalidRepoRootLocators=${reportA.counters.invalidRepoRootLocators}.`,
  "",
  `3.2 requirementOutputs=${requirementOutputs.length}; outputRootMismatch=${reportA.counters.outputRootMismatch}; missingConstructorInputs=${reportA.counters.missingConstructorInputs}.`,
  "",
  `3.3 closureRows=${closureCrosswalk.length}; distinctSourceFindings=${new Set(closureCrosswalk.map((item) => item.sourceFindingId)).size}; mergeOrRangeRows=${reportA.counters.mergeOrRangeRows}; selfOwnedLocators=${reportA.counters.selfOwnedLocators}; symbolicConjunctLocators=${reportA.counters.symbolicConjunctLocators}.`,
  "",
  `3.4 guards=${guards.length}; transitions=${controlTransitions.length}; undefinedGuards=${reportA.counters.undefinedGuards}; ambiguousStateEventPairs=${reportA.counters.ambiguousStateEventPairs}; unhandledStateEventPairs=${reportA.counters.unhandledStateEventPairs}; missingInitialStates=${reportA.counters.missingInitialStates}; negativeToSuccess=${reportA.counters.negativeToSuccess}.`,
  "",
  `3.5 vectors=${causalVectors.length}; vectorMismatch=${reportA.counters.vectorMismatch}; injectedFailurePreconditions=${reportA.counters.injectedFailurePreconditions}; causalCycles=${reportA.counters.causalCycles}; policyRootMismatch=${reportA.counters.policyRootMismatch}.`,
  "",
  `3.6 semanticUses=${semanticUses.length}; unresolvedSemanticUses=${reportA.counters.unresolvedSemanticUses}; predecessorRows=${predecessorClosure.length}.`,
  "",
  `3.7 predecessorClauseRows=${predecessorClauseCrosswalk.length}; predecessorSemanticPredicates=${predecessorSemanticPredicates.length}; convertedSymbolicConjuncts=${convertedSymbolicConjuncts}; predecessorClauseMismatch=${reportA.counters.predecessorClauseMismatch}; predecessorClauseSelfOwnedLocators=${reportA.counters.predecessorClauseSelfOwnedLocators}; predecessorSymbolicConjunctLocators=${reportA.counters.predecessorSymbolicConjunctLocators}; semanticPredicateMismatch=${reportA.counters.semanticPredicateMismatch}.`,
  "",
  "## 4. External blockers and authority",
  "",
  `4.1 typedMissingExternalInputs=${externalInputBlocks.length}; external B0 admission, appointments, three independent Review envelopes, reconciliation, HumanApproval, trust, time, finality, live dependency Heads, policy seals, decoder approval and independent semantic receipts remain unknown/unavailable.`,
  "",
  "4.2 Acceptance=0; Gate29=BLOCKED; developmentFreeze=ACTIVE; repository=PUBLIC-PERMANENT; authorityOutputs=0.",
  "",
];
writeFileSync(paths.producerQA, `${producerQALines.join("\n")}\n`, "utf8");

const finalArtifacts = [
  ...payloadPaths,
  paths.manifest,
  paths.reportA,
  paths.reportB,
  paths.producerQA,
  fileURLToPath(import.meta.url),
  paths.readerA,
  paths.readerB,
];
for (const path of finalArtifacts) {
  const bytes = readFileSync(path);
  process.stdout.write(`${relative(repositoryRoot, path)}\t${sha256(bytes)}\t${lineCount(bytes)}\t${bytes.length}\n`);
}
process.stdout.write(`PACKAGE_ROOT\t${packageRoot}\n`);
process.stdout.write(`COUNTERS\trequirementOutputs=${requirementOutputs.length};closureRows=${closureCrosswalk.length};predecessorClauseRows=${predecessorClauseCrosswalk.length};predecessorSemanticPredicates=${predecessorSemanticPredicates.length};convertedSymbolicConjuncts=${convertedSymbolicConjuncts};vectors=${causalVectors.length};semanticUses=${semanticUses.length};transitions=${controlTransitions.length};guards=${guards.length};Acceptance=0;Gate29=BLOCKED;freeze=ACTIVE;repository=PUBLIC-PERMANENT\n`);
