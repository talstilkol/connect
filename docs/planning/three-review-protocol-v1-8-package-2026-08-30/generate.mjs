#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const generatorPath = fileURLToPath(import.meta.url);
const packageDir = dirname(generatorPath);
const repositoryRoot = resolve(packageDir, "../../..");
const packageLogicalRoot = "docs/planning/three-review-protocol-v1-8-package-2026-08-30";
const v17PackageRoot = "495ba345115f7623802adef7d7268ba7a6fe7049e68f9b04866f77f3602b5d39";
const v17PackageDir = "docs/planning/three-review-protocol-v1-7-package-2026-08-30";
const reviewPath = "docs/planning/three-review-protocol-v1-7-independent-hostile-review-2026-08-30.md";
const findingsPath = "docs/planning/three-review-protocol-v1-7-independent-hostile-review-findings-manifest-2026-08-30.md";
const readerAPath = resolve(packageDir, "reader-a.mjs");
const readerBPath = resolve(packageDir, "reader-b.rb");
const detachedReportLogicalRoot = "docs/planning/three-review-protocol-v1-8-detached-reports-2026-08-30";
const detachedReportDir = resolve(repositoryRoot, detachedReportLogicalRoot);
const reportAPath = resolve(detachedReportDir, "qa-reader-a-report.json");
const reportBPath = resolve(detachedReportDir, "qa-reader-b-report.json");
const producerQAPath = resolve(packageDir, "producer-qa.md");

const semanticShardNames = [
  "semantic-preservation-000001-030000.jsonl",
  "semantic-preservation-030001-057466.jsonl",
];
const publicRegularGitMemberByteLimitExclusive = 50 * 1024 * 1024;
const payloadNames = [
  "subject.md",
  "normative-registry.json",
  "closure-crosswalk.jsonl",
  "contract-preservation.json",
  "predecessor-finding-preservation.jsonl",
  ...semanticShardNames,
  "causal-vectors.jsonl",
  "causal-source-graph.json",
];
const frozenPaths = [
  `${v17PackageDir}/subject.md`,
  `${v17PackageDir}/normative-registry.json`,
  `${v17PackageDir}/requirement-outputs.jsonl`,
  `${v17PackageDir}/closure-crosswalk.jsonl`,
  `${v17PackageDir}/predecessor-closure.jsonl`,
  `${v17PackageDir}/predecessor-clause-crosswalk.jsonl`,
  `${v17PackageDir}/predecessor-semantic-predicates.jsonl`,
  `${v17PackageDir}/causal-vectors.jsonl`,
  `${v17PackageDir}/causal-source-graph.json`,
  `${v17PackageDir}/semantic-use-index.jsonl`,
  `${v17PackageDir}/normative-package-manifest.json`,
  `${v17PackageDir}/generate.mjs`,
  `${v17PackageDir}/reader-a.mjs`,
  `${v17PackageDir}/reader-b.rb`,
  `${v17PackageDir}/qa-reader-a-report.json`,
  `${v17PackageDir}/qa-reader-b-report.json`,
  `${v17PackageDir}/producer-qa.md`,
  reviewPath,
  findingsPath,
  "docs/planning/three-review-protocol-v1-6-successor-requirements-2026-08-30.md",
  "docs/planning/three-review-protocol-v1-6-successor-requirements-independent-hostile-review-2026-08-30.md",
  "docs/planning/three-review-protocol-v1-6-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md",
  "docs/planning/three-review-protocol-v1-5-successor-requirements-2026-08-29.md",
  "docs/planning/three-review-protocol-v1-5-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md",
  "docs/planning/master-plan-three-review-reconciliation-protocol-2026-08-29.md",
  "docs/planning/three-review-intake-and-reconciliation-eligibility-assessment-2026-08-29.md",
  "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v3-2026-08-29.md",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md",
];

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
const compareUtf8 = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const wellFormedString = (value) => {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
};
const canonical = (value) => {
  if (value === null) return "null";
  if (typeof value === "string") {
    if (!wellFormedString(value) || value !== value.normalize("NFC")) throw new Error("invalid or non-NFC string");
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort(compareUtf8).map((key) => `${canonical(key)}:${canonical(value[key])}`).join(",")}}`;
  throw new Error(`non-canonical type ${typeof value}`);
};
const lineCount = (bytes) => {
  if (bytes.length === 0) return 0;
  let count = 0;
  for (const byte of bytes) if (byte === 10) count += 1;
  return bytes.at(-1) === 10 ? count : count + 1;
};
const stat = (logicalPath) => {
  const bytes = readFileSync(resolve(repositoryRoot, logicalPath));
  return { bytes: bytes.length, lines: lineCount(bytes), path: logicalPath, root: sha256(bytes) };
};
const writeJson = (name, value) => writeFileSync(resolve(packageDir, name), `${canonical(value)}\n`, "utf8");
const writeJsonl = (name, values) => writeFileSync(resolve(packageDir, name), `${values.map(canonical).join("\n")}\n`, "utf8");
const withRoot = (domain, record, rootField) => {
  const result = { ...record };
  result[rootField] = rooted(domain, "1", canonical(record));
  return result;
};
const labelRoot = (label) => sha256(Buffer.from(`MPRR-V18-SYMBOLIC-TEST-ROOT:${label}`, "utf8"));

const findingsBytes = readFileSync(resolve(repositoryRoot, findingsPath));
const findingsText = findingsBytes.toString("utf8");
const findingHeading = /^### 2\.(\d+) `?(MPRR-V17-IHR-F\d{3})`? — (.+)$/gm;
const findingMatches = [...findingsText.matchAll(findingHeading)];
if (findingMatches.length !== 25) throw new Error(`expected 25 v1.7 review findings, got ${findingMatches.length}`);
const findings = findingMatches.map((match, index) => {
  const startChar = match.index;
  const endChar = index + 1 < findingMatches.length ? findingMatches[index + 1].index : findingsText.indexOf("\n## 3.", startChar);
  const section = findingsText.slice(startChar, endChar < 0 ? findingsText.length : endChar);
  const severity = section.match(/Severity=`(P[0-3])`/)?.[1];
  const closure = section.match(/\d+\.\d+\.5 Closure=([^\n]+)/)?.[1];
  if (!severity || !closure) throw new Error(`failed to parse ${match[2]}`);
  const byteStart = Buffer.byteLength(findingsText.slice(0, startChar), "utf8");
  const byteEndExclusive = Buffer.byteLength(findingsText.slice(0, endChar < 0 ? findingsText.length : endChar), "utf8");
  return {
    byteEndExclusive,
    byteStart,
    closure,
    findingId: match[2],
    index: index + 1,
    severity,
    sourceRoot: sha256(findingsBytes.subarray(byteStart, byteEndExclusive)),
    title: match[3],
  };
});

const schemas = [];
const addSchema = (schemaId, fieldTypes) => {
  const record = {
    fieldTypes,
    requiredFields: Object.keys(fieldTypes).sort(compareUtf8),
    schemaId,
    unknownFieldPolicy: "REJECT",
  };
  const schema = withRoot("MPRR-V18-SCHEMA", record, "schemaRoot");
  schemas.push(schema);
  return schema;
};
addSchema("SCHEMA-SCHEMA", { fieldTypes: "object", requiredFields: "array<string>", schemaId: "string", schemaRoot: "sha256", unknownFieldPolicy: "enum:REJECT" });
addSchema("SCHEMA-REGISTRY", {
  acceptanceContract: "object:SCHEMA-ACCEPTANCE-CONTRACT", artifactId: "string", authorityState: "object:SCHEMA-AUTHORITY-STATE", canonicalContract: "object:SCHEMA-CANONICAL-CONTRACT", casContract: "object:SCHEMA-CAS-CONTRACT", controls: "array<object>:SCHEMA-CONTROL", evaluatorRegistry: "array<string>", externalInputs: "array<object>:SCHEMA-EXTERNAL-INPUT", governance: "object:SCHEMA-GOVERNANCE", guards: "array<object>:SCHEMA-GUARD", machineExecutionContract: "object:SCHEMA-MACHINE-EXECUTION-CONTRACT", machines: "array<object>:SCHEMA-MACHINE", parserRediscoveryContract: "object:SCHEMA-PARSER-REDISCOVERY-CONTRACT", publicInvariant: "object:SCHEMA-PUBLIC-INVARIANT", recoveryContract: "object:SCHEMA-RECOVERY-CONTRACT", repositoryIdentity: "object:SCHEMA-REPOSITORY-IDENTITY", schemaId: "string", schemas: "array<object>:SCHEMA-SCHEMA", semanticPreservationContract: "object:SCHEMA-SEMANTIC-PRESERVATION-CONTRACT",
});
addSchema("SCHEMA-CONTROL", { acceptanceCredit: "uint", closurePredicate: "string", controlId: "string", controlRoot: "sha256", findingId: "string", requirementId: "string", schemaId: "string", severity: "enum:P0|P1|P2|P3", state: "enum:IMPLEMENTED-PENDING-INDEPENDENT-REVIEW", title: "string" });
addSchema("SCHEMA-GUARD", { contextSchemaId: "string", event: "string", falseTerminal: "string", guardId: "string", guardRoot: "sha256", malformedTerminal: "string", requiredTrueFields: "array<string>", schemaId: "string" });
addSchema("SCHEMA-TRANSITION", { authorityEffect: "enum:ELIGIBLE-NOT-ISSUED|NONE", event: "enum:ALL_VALID|INPUT_INVALID", fromState: "string", guardId: "string", terminal: "string", toState: "string" });
addSchema("SCHEMA-MACHINE", { contextSchemaId: "string", initialState: "string", machineId: "string", machineRoot: "sha256", schemaId: "string", states: "array<string>", transitions: "array<object>:SCHEMA-TRANSITION" });
addSchema("SCHEMA-GUARD-CONTEXT", { casValid: "boolean", externalValid: "boolean", independenceValid: "boolean", publicValid: "boolean", semanticValid: "boolean", timeValid: "boolean" });
addSchema("SCHEMA-EXTERNAL-INPUT", { acceptanceCredit: "uint", expectedSchemaId: "string", inputId: "string", inputRoot: "sha256", schemaId: "string", state: "enum:MISSING-EXTERNAL-INPUT|VALID" });
addSchema("SCHEMA-EXTERNAL-RECEIPT", { audience: "string", epoch: "uint", fresh: "boolean", generation: "uint", headRoots: "array<sha256>", issuerRoot: "sha256", manifestRoot: "sha256", packageRoot: "sha256", purpose: "string", receiptRoot: "sha256", revoked: "boolean", schemaId: "string", signatureRoot: "sha256", subjectRoot: "sha256" });
addSchema("SCHEMA-CLOSURE", { acceptanceCredit: "uint", controlId: "string", independentReceiptState: "enum:MISSING|VALID", requirementId: "string", rowRoot: "sha256", schemaId: "string", sourceByteEndExclusive: "uint", sourceByteStart: "uint", sourceFindingId: "string", sourceFindingRoot: "sha256", sourceLocator: "string", vectorIds: "array<string>" });
addSchema("SCHEMA-PREDECESSOR-PRESERVATION", { acceptanceCredit: "uint", mode: "enum:NORMATIVE-INCLUSION-BY-EXACT-BYTES", proofId: "string", proofRoot: "sha256", schemaId: "string", sourceFindingId: "string", sourceLine: "uint", sourcePath: "string", sourceRecordRoot: "sha256", successorCanonicalRecord: "string", successorClauseRoot: "sha256" });
addSchema("SCHEMA-EXACT-SEMANTIC-PRESERVATION", { acceptanceCredit: "uint", mode: "enum:NORMATIVE-INCLUSION-BY-EXACT-CANONICAL-BYTES", proofId: "string", proofRoot: "sha256", schemaId: "string", sourceLine: "uint", sourcePath: "string", sourceRecordId: "string", sourceRecordRoot: "sha256", successorCanonicalRecord: "string", successorClauseRoot: "sha256" });
addSchema("SCHEMA-VECTOR-ORACLE", { authorityOutputs: "uint", permitEligible: "boolean", terminal: "string" });
addSchema("SCHEMA-OUTPUT-ENVELOPE", { authorityState: "string", custodyLocator: "string", independentReceiptBlockId: "string", statementRoot: "sha256" });
addSchema("SCHEMA-DETACHED-EVIDENCE", { audience: "string", epoch: "uint", generation: "uint", headRoots: "array<sha256>", manifestRoot: "sha256", packageRoot: "sha256", purpose: "string", subjectRoot: "sha256" });
addSchema("SCHEMA-BINDING", { leftPath: "string", multiplicity: "enum:EXACTLY-ONE", operator: "enum:CANONICAL-STRICT-EQUALS", rightPath: "string" });
addSchema("SCHEMA-CAS-COMPARISON-OBSERVATION", { comparisonId: "string", expectedRoot: "sha256", observedRoot: "sha256", revocationFresh: "boolean", revoked: "boolean" });
addSchema("SCHEMA-PUSH-TRANSACTION", { newHead: "string", oldHead: "string", ref: "string", remote: "string", transactionRoot: "sha256", writeObjectRoots: "array<sha256>", writeObjectSetRoot: "sha256" });
addSchema("SCHEMA-SCANNER-RECEIPT", { candidateCount: "uint", clean: "boolean", dictionarySealRoot: "sha256", receiptRoot: "sha256", scannerId: "string", scannerRoot: "sha256", transactionRoot: "sha256" });
addSchema("SCHEMA-DEPENDENCY-OBSERVATION", { expectedRoot: "sha256", memberId: "string", observedRoot: "sha256", readCount: "uint", revocationFresh: "boolean", revoked: "boolean" });
addSchema("SCHEMA-VECTOR", { controlIds: "array<string>", family: "string", input: "object", inputRoot: "sha256", inputSchemaId: "string", oracle: "object:SCHEMA-VECTOR-ORACLE", oracleRoot: "sha256", oracleSchemaId: "enum:SCHEMA-VECTOR-ORACLE", schemaId: "string", vectorId: "string", vectorRoot: "sha256" });
addSchema("SCHEMA-GRAPH-NODE", { nodeId: "string", nodeType: "enum:RAW-INPUT|EVALUATOR|ACTUAL-RESULT|EXPECTED-ORACLE|POST-EXECUTION-COMPARISON", root: "sha256", vectorId: "string" });
addSchema("SCHEMA-GRAPH-EDGE", { edgeId: "string", from: "string", relation: "enum:INPUT-TO-EVALUATOR|EVALUATOR-TO-ACTUAL|ACTUAL-TO-COMPARISON|ORACLE-TO-COMPARISON", to: "string", vectorId: "string" });
addSchema("SCHEMA-GRAPH", { edgeCount: "uint", edges: "array<object>:SCHEMA-GRAPH-EDGE", graphId: "string", graphRoot: "sha256", nodeCount: "uint", nodes: "array<object>:SCHEMA-GRAPH-NODE", requiredOrder: "array<string>", schemaId: "string" });
addSchema("SCHEMA-FILE-MEMBER", { bytes: "uint", lines: "uint", path: "string", root: "sha256" });
addSchema("SCHEMA-TOOL-MEMBER", { path: "string", role: "enum:DETERMINISTIC-PRODUCER|INDEPENDENT-MECHANICAL-READER-A|INDEPENDENT-MECHANICAL-READER-B", root: "sha256" });
addSchema("SCHEMA-CONTRACT-PRESERVATION", { artifactId: "string", predecessorPackageRoot: "sha256", schemaId: "string", sourceUniverse: "array<object>:SCHEMA-FILE-MEMBER", sourceUniverseRoot: "sha256" });
addSchema("SCHEMA-REPOSITORY-IDENTITY", { expectedGitHead: "string", expectedGitRef: "string", expectedOrigin: "string", externalUntrackedSetRoot: "sha256", gitStateRoot: "sha256", gitTopLevelPolicy: "string", identityRoot: "sha256", indexListingRoot: "sha256", intendedGitStatePolicy: "string", logicalRoot: "string", marker: "string", schemaId: "string", symlinkPolicy: "string", trackedDiffRoot: "sha256" });
addSchema("SCHEMA-CANONICAL-CONTRACT", { canonicalRoot: "sha256", duplicateKeyPolicy: "string", floatPolicy: "string", integerPolicy: "string", keyOrder: "string", normalization: "string", schemaId: "string" });
addSchema("SCHEMA-ACCEPTANCE-CONTRACT", { acceptanceRoot: "sha256", authorityAdapterPresent: "boolean", noSelfAcceptance: "boolean", positiveControlNonAuthoritative: "boolean", requiredExternalInputIds: "array<string>", schemaId: "string" });
addSchema("SCHEMA-CAS-CONTRACT", { casRoot: "sha256", comparisonMemberIds: "array<string>", comparisonSetRoot: "sha256", currentAdmissionState: "string", durableMemberIds: "array<string>", durableMemberSetRoot: "sha256", operationKeyRule: "string", permitCountRule: "string", productionAdapterExecutable: "boolean", referenceEvaluatorExecutable: "boolean", schemaId: "string" });
addSchema("SCHEMA-RECOVERY-CONTRACT", { crashPoints: "array<string>", durableMemberIds: "array<string>", productionAdapterExecutable: "boolean", recoveryRoot: "sha256", referenceEvaluatorExecutable: "boolean", requiredOutcomes: "array<string>", schemaId: "string", storageAdapterState: "string" });
addSchema("SCHEMA-PUBLIC-INVARIANT", { currentContinuousReceiptState: "string", publicRoot: "sha256", requiredScannerCount: "uint", requiredVisibility: "enum:PUBLIC", schemaId: "string", transactionBinding: "string" });
addSchema("SCHEMA-GOVERNANCE", { freezeRequired: "boolean", governanceRoot: "sha256", independentSemanticReceiptRequired: "boolean", schemaId: "string", zeroImplicitCredit: "boolean" });
addSchema("SCHEMA-SEMANTIC-SHARD", { bytes: "uint", firstProofId: "string", lastProofId: "string", lines: "uint", path: "string", recordCount: "uint", root: "sha256", sequence: "uint" });
addSchema("SCHEMA-SEMANTIC-PRESERVATION-CONTRACT", { exactByteIdentityRequired: "boolean", maxShardBytesExclusive: "uint", proofCount: "uint", proofSetRoot: "sha256", schemaId: "string", semanticRoot: "sha256", shardCount: "uint", shardMembers: "array<object>:SCHEMA-SEMANTIC-SHARD", shardSetRoot: "sha256", sourcePaths: "array<string>" });
addSchema("SCHEMA-PARSER-REDISCOVERY-CONTRACT", { contractRoot: "sha256", parserProfileIds: "array<string>", parserProfileRoots: "array<sha256>", rediscoverySetRoot: "sha256", schemaId: "string", sourceMemberCount: "uint", sourceNamespaceCount: "uint" });
addSchema("SCHEMA-MACHINE-EXECUTION-CONTRACT", { contractRoot: "sha256", exhaustiveContextCount: "uint", guardIds: "array<string>", machineIds: "array<string>", modelInvariantRoot: "sha256", schemaId: "string" });
addSchema("SCHEMA-AUTHORITY-STATE", { Acceptance: "uint", Gate29: "enum:BLOCKED", authorityOutputs: "uint", developmentFreeze: "enum:ACTIVE", independentReceipt: "enum:MISSING-EXTERNAL-INPUT", repository: "enum:PUBLIC" });
addSchema("SCHEMA-MANIFEST", { artifactId: "string", authorityState: "object:SCHEMA-AUTHORITY-STATE", frozenInputs: "array<object>:SCHEMA-FILE-MEMBER", packageRoot: "sha256", packageRootConstructor: "string", packageSchemaVersion: "string", payloadMembers: "array<object>:SCHEMA-FILE-MEMBER", producerTools: "array<object>:SCHEMA-TOOL-MEMBER", schemaId: "string" });
addSchema("SCHEMA-READER-REPORT", { Acceptance: "uint", Gate29: "string", authorityOutputs: "uint", commonResultRoot: "sha256", counters: "object", developmentFreeze: "string", independentReceipt: "string", manifestRoot: "sha256", packageRoot: "sha256", readerId: "string", readerKind: "string", repository: "string", status: "string", vectorResultSetRoot: "sha256", verifiedCounts: "object" });

const vectorInputFieldTypes = Object.freeze({
  ACCEPTANCE_DERIVATION: { operation: "enum:ACCEPTANCE_DERIVATION", snapshot: "object" },
  AUTHORITY_DERIVATION: { claimedAcceptance: "uint", claimedAuthorityOutputs: "uint", operation: "enum:AUTHORITY_DERIVATION", snapshot: "object" },
  AUTHORITY_STATE_CHECK: { claimedState: "object", operation: "enum:AUTHORITY_STATE_CHECK" },
  BINDING_PATHS: { bindings: "array<object>:SCHEMA-BINDING", evidence: "object", operation: "enum:BINDING_PATHS" },
  BYTE_MUTATION: { bytesHex: "string", offset: "uint", operation: "enum:BYTE_MUTATION", xorMask: "uint" },
  CANONICAL_JSON: { operation: "enum:CANONICAL_JSON", rawJson: "string" },
  CAS_TRANSACTION: { comparisons: "array<object>:SCHEMA-CAS-COMPARISON-OBSERVATION", crashPoint: "string", durableWriteIds: "array<string>", operation: "enum:CAS_TRANSACTION", operationKey: "sha256", permitCount: "uint", readbackMatches: "boolean", receiptDurable: "boolean" },
  DEPENDENCY_HEADS: { dependencies: "array<object>:SCHEMA-DEPENDENCY-OBSERVATION", operation: "enum:DEPENDENCY_HEADS" },
  DETACHED_PACKAGE_BINDING: { expectedEnvelope: "object:SCHEMA-DETACHED-EVIDENCE", operation: "enum:DETACHED_PACKAGE_BINDING", receiptEnvelope: "object:SCHEMA-DETACHED-EVIDENCE" },
  ENVELOPE_ROOT: { declaredRoot: "sha256", envelope: "object:SCHEMA-OUTPUT-ENVELOPE", operation: "enum:ENVELOPE_ROOT" },
  EVENT_DERIVATION: { context: "object:SCHEMA-GUARD-CONTEXT", operation: "enum:EVENT_DERIVATION" },
  EXTERNAL_EVIDENCE: { expectedAudience: "string", expectedManifestRoot: "sha256", expectedPackageRoot: "sha256", expectedPurpose: "string", expectedSubjectRoot: "sha256", operation: "enum:EXTERNAL_EVIDENCE", receipt: "object:SCHEMA-EXTERNAL-RECEIPT", trustedIssuerRoots: "array<sha256>" },
  GRAPH_COVERAGE: { graphVectorIds: "array<string>", operation: "enum:GRAPH_COVERAGE", oracleToEvaluatorEdges: "uint", vectorIds: "array<string>" },
  MACHINE_STEP: { context: "object", machineId: "string", operation: "enum:MACHINE_STEP", state: "string" },
  MODEL_INVARIANT: { declaredModelInvariantRoot: "sha256", operation: "enum:MODEL_INVARIANT" },
  NO_SELF_ACCEPTANCE: { operation: "enum:NO_SELF_ACCEPTANCE", snapshot: "object" },
  PACKAGE_ROOT_CHECK: { declaredRoot: "sha256", operation: "enum:PACKAGE_ROOT_CHECK", payloadRecords: "array<string>", toolRoots: "array<sha256>" },
  PARSER_REDISCOVERY: { declaredRediscoveryRoot: "sha256", operation: "enum:PARSER_REDISCOVERY" },
  PREDECESSOR_VECTOR_INTEGRITY: { baselineRoot: "sha256", mutationOffset: "uint", operation: "enum:PREDECESSOR_VECTOR_INTEGRITY", sourceLine: "uint", sourcePath: "string", xorMask: "uint" },
  PUBLIC_INVARIANT: { observedVisibility: "string", operation: "enum:PUBLIC_INVARIANT", requiredVisibility: "enum:PUBLIC", scannerReceipts: "array<object>:SCHEMA-SCANNER-RECEIPT", transaction: "object:SCHEMA-PUSH-TRANSACTION" },
  READER_OUTPUT_MODE: { defaultMode: "string", explicitDetachedOutput: "boolean", operation: "enum:READER_OUTPUT_MODE", writeRequested: "boolean" },
  RECOVERY_SCHEDULE: { committedMemberIds: "array<string>", crashPoint: "string", exactReceiptAvailable: "boolean", operation: "enum:RECOVERY_SCHEDULE", revocationConsumed: "boolean" },
  REPOSITORY_IDENTITY: { expectedGitStateRoot: "sha256", expectedOrigin: "string", operation: "enum:REPOSITORY_IDENTITY" },
  SCHEMA_RECORD: { operation: "enum:SCHEMA_RECORD", record: "object", schemaId: "string" },
  SCHEMA_REFERENCES: { operation: "enum:SCHEMA_REFERENCES", references: "array<string>" },
  SEMANTIC_IDENTITY: { mode: "string", operation: "enum:SEMANTIC_IDENTITY", sourceRoot: "sha256", targetRoot: "sha256" },
  SET_EQUALITY: { actual: "array<string>", expected: "array<string>", operation: "enum:SET_EQUALITY" },
  TOOL_ROOT_CHECK: { declaredRoot: "sha256", operation: "enum:TOOL_ROOT_CHECK", path: "string" },
});
const vectorInputSchemaIdByOperation = new Map();
for (const [operation, fieldTypes] of Object.entries(vectorInputFieldTypes)) {
  const schemaId = `SCHEMA-VECTOR-INPUT-${operation.replaceAll("_", "-")}`;
  addSchema(schemaId, fieldTypes);
  vectorInputSchemaIdByOperation.set(operation, schemaId);
}

const controls = findings.map((finding) => withRoot("MPRR-V18-CONTROL", {
  acceptanceCredit: 0,
  closurePredicate: finding.closure,
  controlId: `MPRR-V18-CONTROL-F${String(finding.index).padStart(3, "0")}`,
  findingId: finding.findingId,
  requirementId: `MPRR-V18-REQ-${String(finding.index).padStart(3, "0")}`,
  schemaId: "SCHEMA-CONTROL",
  severity: finding.severity,
  state: "IMPLEMENTED-PENDING-INDEPENDENT-REVIEW",
  title: finding.title,
}, "controlRoot"));

const allTrueContext = { casValid: true, externalValid: true, independenceValid: true, publicValid: true, semanticValid: true, timeValid: true };
const invalidContext = { ...allTrueContext, semanticValid: false };
const guards = [
  withRoot("MPRR-V18-GUARD", { contextSchemaId: "SCHEMA-GUARD-CONTEXT", event: "ALL_VALID", falseTerminal: "TERM-GUARD-REJECTED", guardId: "MPRR-V18-GUARD-ALL-VALID", malformedTerminal: "TERM-MALFORMED", requiredTrueFields: Object.keys(allTrueContext).sort(compareUtf8), schemaId: "SCHEMA-GUARD" }, "guardRoot"),
  withRoot("MPRR-V18-GUARD", { contextSchemaId: "SCHEMA-GUARD-CONTEXT", event: "INPUT_INVALID", falseTerminal: "TERM-GUARD-REJECTED", guardId: "MPRR-V18-GUARD-INPUT-INVALID", malformedTerminal: "TERM-MALFORMED", requiredTrueFields: [], schemaId: "SCHEMA-GUARD" }, "guardRoot"),
];
const machines = [withRoot("MPRR-V18-MACHINE", {
  contextSchemaId: "SCHEMA-GUARD-CONTEXT",
  initialState: "PENDING",
  machineId: "MPRR-V18-MACHINE-ACCEPTANCE",
  schemaId: "SCHEMA-MACHINE",
  states: ["PENDING", "PERMIT-ELIGIBLE", "BLOCKED"],
  transitions: [
    { authorityEffect: "ELIGIBLE-NOT-ISSUED", event: "ALL_VALID", fromState: "PENDING", guardId: "MPRR-V18-GUARD-ALL-VALID", terminal: "TERM-PERMIT-ELIGIBLE", toState: "PERMIT-ELIGIBLE" },
    { authorityEffect: "NONE", event: "INPUT_INVALID", fromState: "PENDING", guardId: "MPRR-V18-GUARD-INPUT-INVALID", terminal: "TERM-BLOCKED", toState: "BLOCKED" },
  ],
}, "machineRoot")];
const modelInvariantRoot = rooted("MPRR-V18-MODEL-INVARIANT", "1", ...[...guards, ...machines].map(canonical).sort(compareUtf8));
const machineExecutionContract = withRoot("MPRR-V18-MACHINE-EXECUTION-CONTRACT", {
  exhaustiveContextCount: 7,
  guardIds: guards.map((item) => item.guardId).sort(compareUtf8),
  machineIds: machines.map((item) => item.machineId).sort(compareUtf8),
  modelInvariantRoot,
  schemaId: "SCHEMA-MACHINE-EXECUTION-CONTRACT",
}, "contractRoot");

const externalInputIds = [
  "EXT-INDEPENDENT-SEMANTIC-RECEIPT",
  "EXT-REVIEW-A",
  "EXT-REVIEW-B",
  "EXT-REVIEW-C",
  "EXT-RECONCILIATION",
  "EXT-HUMAN-APPROVAL",
  "EXT-TRUST-TIME-FINALITY",
  "EXT-LIVE-CAS-HEADS",
  "EXT-CONTINUOUS-PUBLIC-RECEIPT",
];
const externalInputs = externalInputIds.map((inputId) => withRoot("MPRR-V18-EXTERNAL-INPUT", {
  acceptanceCredit: 0,
  expectedSchemaId: "SCHEMA-EXTERNAL-RECEIPT",
  inputId,
  schemaId: "SCHEMA-EXTERNAL-INPUT",
  state: "MISSING-EXTERNAL-INPUT",
}, "inputRoot"));

const sourceUniverse = frozenPaths.map(stat);
const sourceUniverseRoot = rooted("MPRR-V18-SOURCE-UNIVERSE", "1", ...sourceUniverse.map(canonical).sort(compareUtf8));
const contractPreservation = {
  artifactId: "MPRR-V18-CONTRACT-PRESERVATION",
  predecessorPackageRoot: v17PackageRoot,
  schemaId: "SCHEMA-CONTRACT-PRESERVATION",
  sourceUniverse,
  sourceUniverseRoot,
};
writeJson("contract-preservation.json", contractPreservation);

const v17RegistrySnapshot = JSON.parse(readFileSync(resolve(repositoryRoot, `${v17PackageDir}/normative-registry.json`), "utf8"));
const parserRediscoverySetRoot = rooted(
  "MPRR-V18-PARSER-REDISCOVERY-SET",
  "1",
  ...[
    ...v17RegistrySnapshot.parserProfiles,
    ...v17RegistrySnapshot.sourceNamespaces,
    ...v17RegistrySnapshot.sourceMembers,
  ].map(canonical).sort(compareUtf8),
);
const parserRediscoveryContract = withRoot("MPRR-V18-PARSER-REDISCOVERY-CONTRACT", {
  parserProfileIds: v17RegistrySnapshot.parserProfiles.map((item) => item.profileId).sort(compareUtf8),
  parserProfileRoots: v17RegistrySnapshot.parserProfiles.map((item) => item.parserProfileRoot).sort(compareUtf8),
  rediscoverySetRoot: parserRediscoverySetRoot,
  schemaId: "SCHEMA-PARSER-REDISCOVERY-CONTRACT",
  sourceMemberCount: v17RegistrySnapshot.sourceMembers.length,
  sourceNamespaceCount: v17RegistrySnapshot.sourceNamespaces.length,
}, "contractRoot");
const casComparisonMemberIds = v17RegistrySnapshot.commitContract.casComparisons.map((item) => item.comparisonId);
const casDurableMemberIds = [...v17RegistrySnapshot.commitContract.durableMemberIds];
if (casComparisonMemberIds.length !== 65 || casDurableMemberIds.length !== 17) throw new Error("predecessor CAS denominator changed");
const casComparisonSetRoot = rooted("MPRR-V18-CAS-COMPARISON-ID-SET", "1", ...casComparisonMemberIds.slice().sort(compareUtf8));
const casDurableMemberSetRoot = rooted("MPRR-V18-CAS-DURABLE-MEMBER-ID-SET", "1", ...casDurableMemberIds.slice().sort(compareUtf8));
const casOperationKeyForTest = labelRoot("CAS-OPERATION-KEY");
const validCasComparisonsForTest = casComparisonMemberIds.map((comparisonId) => {
  const head = labelRoot(`CAS-HEAD:${comparisonId}`);
  return { comparisonId, expectedRoot: head, observedRoot: head, revocationFresh: true, revoked: false };
});
const dependencyMemberIds = casComparisonMemberIds.filter((item) => /^CAS-DEPENDENCY-\d{3}$/.test(item));
if (dependencyMemberIds.length !== 32) throw new Error("predecessor dependency denominator changed");
const validDependencyObservationsForTest = dependencyMemberIds.map((memberId) => {
  const head = labelRoot(`DEPENDENCY-HEAD:${memberId}`);
  return { expectedRoot: head, memberId, observedRoot: head, readCount: 1, revocationFresh: true, revoked: false };
});

const gitBytes = (...args) => execFileSync("git", ["-C", repositoryRoot, ...args], { maxBuffer: 64 * 1024 * 1024 });
const gitText = (...args) => gitBytes(...args).toString("utf8").trim();
const expectedGitHead = gitText("rev-parse", "HEAD");
const expectedGitRef = gitText("rev-parse", "--abbrev-ref", "HEAD");
const indexListingRoot = sha256(gitBytes("ls-files", "--stage"));
const trackedDiffRoot = sha256(gitBytes("diff", "--binary", "--", ".", `:(exclude)${packageLogicalRoot}/**`));
const externalUntrackedPaths = gitText("ls-files", "--others", "--exclude-standard")
  .split("\n")
  .filter((path) => path && !path.startsWith(`${packageLogicalRoot}/`))
  .sort(compareUtf8);
const externalUntrackedSetRoot = rooted("MPRR-V18-EXTERNAL-UNTRACKED-SET", "1", ...externalUntrackedPaths);
const gitStateRoot = rooted("MPRR-V18-GIT-STATE", "1", expectedGitHead, expectedGitRef, indexListingRoot, trackedDiffRoot, externalUntrackedSetRoot);

const v17ClosureLines = readFileSync(resolve(repositoryRoot, `${v17PackageDir}/closure-crosswalk.jsonl`), "utf8").trimEnd().split("\n");
const predecessorRows = v17ClosureLines.map((line, index) => {
  const source = JSON.parse(line);
  return withRoot("MPRR-V18-PREDECESSOR-PRESERVATION", {
    acceptanceCredit: 0,
    mode: "NORMATIVE-INCLUSION-BY-EXACT-BYTES",
    proofId: `MPRR-V18-PREDECESSOR-FINDING-${String(index + 1).padStart(3, "0")}`,
    schemaId: "SCHEMA-PREDECESSOR-PRESERVATION",
    sourceFindingId: source.sourceFindingId,
    sourceLine: index + 1,
    sourcePath: `${v17PackageDir}/closure-crosswalk.jsonl`,
    sourceRecordRoot: sha256(Buffer.from(line, "utf8")),
    successorCanonicalRecord: line,
    successorClauseRoot: sha256(Buffer.from(line, "utf8")),
  }, "proofRoot");
});
if (predecessorRows.length !== 31) throw new Error("v1.7 predecessor finding denominator changed");
writeJsonl("predecessor-finding-preservation.jsonl", predecessorRows);

const semanticSourcePaths = [
  `${v17PackageDir}/predecessor-semantic-predicates.jsonl`,
  `${v17PackageDir}/semantic-use-index.jsonl`,
];
const semanticRows = [];
for (const sourcePath of semanticSourcePaths) {
  const lines = readFileSync(resolve(repositoryRoot, sourcePath), "utf8").trimEnd().split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const parsed = JSON.parse(lines[index]);
    if (canonical(parsed) !== lines[index]) throw new Error(`non-canonical predecessor semantic record ${sourcePath}:${index + 1}`);
    const sourceRecordId = parsed.predicateId ?? parsed.useId;
    const sourceRecordRoot = sha256(Buffer.from(lines[index], "utf8"));
    semanticRows.push(withRoot("MPRR-V18-SEMANTIC-PRESERVATION", {
      acceptanceCredit: 0,
      mode: "NORMATIVE-INCLUSION-BY-EXACT-CANONICAL-BYTES",
      proofId: `MPRR-V18-SEMANTIC-PROOF-${String(semanticRows.length + 1).padStart(6, "0")}`,
      schemaId: "SCHEMA-EXACT-SEMANTIC-PRESERVATION",
      sourceLine: index + 1,
      sourcePath,
      sourceRecordId,
      sourceRecordRoot,
      successorCanonicalRecord: lines[index],
      successorClauseRoot: sourceRecordRoot,
    }, "proofRoot"));
  }
}
if (semanticRows.length !== 57_466) throw new Error(`expected 57466 semantic proofs, got ${semanticRows.length}`);
const semanticShardRanges = [[0, 30_000], [30_000, 57_466]];
for (let index = 0; index < semanticShardNames.length; index += 1) {
  const [start, end] = semanticShardRanges[index];
  writeJsonl(semanticShardNames[index], semanticRows.slice(start, end));
}
const semanticShardMembers = semanticShardNames.map((name, index) => {
  const [start, end] = semanticShardRanges[index];
  const member = stat(`${packageLogicalRoot}/${name}`);
  if (member.bytes >= publicRegularGitMemberByteLimitExclusive) throw new Error(`PUBLIC regular-Git member size limit reached: ${name}:${member.bytes}`);
  return {
    ...member,
    firstProofId: semanticRows[start].proofId,
    lastProofId: semanticRows[end - 1].proofId,
    recordCount: end - start,
    sequence: index + 1,
  };
});
const semanticShardSetRoot = rooted("MPRR-V18-SEMANTIC-SHARD-SET", "1", ...semanticShardMembers.map(canonical));
const semanticProofSetRoot = rooted("MPRR-V18-SEMANTIC-PROOF-SET", "1", ...semanticRows.map((row) => row.proofRoot).sort(compareUtf8));

const generatorRoot = sha256(readFileSync(generatorPath));
const readerARoot = sha256(readFileSync(readerAPath));
const readerBRoot = sha256(readFileSync(readerBPath));

const vectors = [];
const addVector = ({ controlIds = [], family, id, input, oracle }) => {
  const inputSchemaId = vectorInputSchemaIdByOperation.get(input.operation);
  if (!inputSchemaId) throw new Error(`missing vector input schema for ${input.operation}`);
  const inputRoot = rooted("MPRR-V18-VECTOR-INPUT", "1", canonical(input));
  const oracleRoot = rooted("MPRR-V18-VECTOR-ORACLE", "1", canonical(oracle));
  vectors.push(withRoot("MPRR-V18-VECTOR", {
    controlIds,
    family,
    input,
    inputRoot,
    inputSchemaId,
    oracle,
    oracleRoot,
    oracleSchemaId: "SCHEMA-VECTOR-ORACLE",
    schemaId: "SCHEMA-VECTOR",
    vectorId: id,
  }, "vectorRoot"));
  return id;
};
const oracle = (terminal, permitEligible = false, authorityOutputs = 0) => ({ authorityOutputs, permitEligible, terminal });

const v17VectorLines = readFileSync(resolve(repositoryRoot, `${v17PackageDir}/causal-vectors.jsonl`), "utf8").trimEnd().split("\n");
for (let index = 0; index < v17VectorLines.length; index += 1) {
  const line = v17VectorLines[index];
  addVector({
    family: "V17-PREDECESSOR-VECTOR",
    id: `MPRR-V18-VEC-PREDECESSOR-${String(index + 1).padStart(3, "0")}`,
    input: { baselineRoot: sha256(Buffer.from(line, "utf8")), mutationOffset: 0, operation: "PREDECESSOR_VECTOR_INTEGRITY", sourceLine: index + 1, sourcePath: `${v17PackageDir}/causal-vectors.jsonl`, xorMask: 1 },
    oracle: oracle("TERM-SOURCE-MUTATION-DETECTED"),
  });
}
if (v17VectorLines.length !== 574) throw new Error("v1.7 vector denominator changed");

const syntheticPayloadRecords = [canonical({ path: "a", root: labelRoot("PAYLOAD-A") }), canonical({ path: "b", root: labelRoot("PAYLOAD-B") })];
const syntheticToolRoots = [labelRoot("TOOL-G"), labelRoot("TOOL-A"), labelRoot("TOOL-B")];
const syntheticPackageRoot = rooted("MPRR-V18-NORMATIVE-PACKAGE", "1", ...syntheticPayloadRecords.sort(compareUtf8), ...syntheticToolRoots);
const envelope = { authorityState: "CANDIDATE", custodyLocator: "sha256:bound", independentReceiptBlockId: "EXT-INDEPENDENT-SEMANTIC-RECEIPT", statementRoot: labelRoot("STATEMENT") };
const envelopeRoot = rooted("MPRR-V18-OUTPUT-ENVELOPE", "1", canonical(envelope));
const subjectRoot = labelRoot("SUBJECT");
const packageRootForTest = labelRoot("PACKAGE");
const manifestRootForTest = labelRoot("MANIFEST");
const detachedEvidenceForTest = {
  audience: "MPRR-V18-ACCEPTANCE",
  epoch: 1,
  generation: 1,
  headRoots: [labelRoot("PROTOCOL-HEAD"), labelRoot("REVOCATION-HEAD")],
  manifestRoot: manifestRootForTest,
  packageRoot: packageRootForTest,
  purpose: "THREE-REVIEW-PROTOCOL-INDEPENDENT-REVIEW",
  subjectRoot,
};
const bindingEvidenceForTest = {
  candidate: { manifestRoot: manifestRootForTest, packageRoot: packageRootForTest, subjectRoot },
  receipt: { manifestRoot: manifestRootForTest, packageRoot: packageRootForTest, subjectRoot },
};
const trustedIssuerRootForTest = labelRoot("TRUSTED-ISSUER");
const externalReceiptCoreForTest = {
  audience: "MPRR-V18-ACCEPTANCE",
  epoch: 1,
  fresh: true,
  generation: 1,
  headRoots: [labelRoot("PROTOCOL-HEAD"), labelRoot("REVOCATION-HEAD")],
  issuerRoot: trustedIssuerRootForTest,
  manifestRoot: manifestRootForTest,
  packageRoot: packageRootForTest,
  purpose: "INDEPENDENT-SEMANTIC-RECEIPT",
  revoked: false,
  schemaId: "SCHEMA-EXTERNAL-RECEIPT",
  subjectRoot,
};
const externalReceiptRootForTest = rooted("MPRR-V18-EXTERNAL-RECEIPT", "1", canonical(externalReceiptCoreForTest));
const validExternalReceiptForTest = {
  ...externalReceiptCoreForTest,
  receiptRoot: externalReceiptRootForTest,
  signatureRoot: rooted("MPRR-V18-REFERENCE-SIGNATURE", "1", trustedIssuerRootForTest, externalReceiptRootForTest),
};
const pushWriteObjectRootsForTest = [labelRoot("WRITE-OBJECT-1"), labelRoot("WRITE-OBJECT-2"), labelRoot("WRITE-OBJECT-3")];
const pushTransactionCoreForTest = {
  newHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  oldHead: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ref: "refs/heads/main",
  remote: "https://github.com/talstilkol/connect.git",
  writeObjectRoots: pushWriteObjectRootsForTest,
  writeObjectSetRoot: rooted("MPRR-V18-WRITE-OBJECT-SET", "1", ...pushWriteObjectRootsForTest.slice().sort(compareUtf8)),
};
const pushTransactionForTest = { ...pushTransactionCoreForTest, transactionRoot: rooted("MPRR-V18-PUSH-TRANSACTION", "1", canonical(pushTransactionCoreForTest)) };
const scannerDictionarySealForTest = labelRoot("SCANNER-DICTIONARY-SEAL");
const scannerReceiptForTest = (scannerId) => {
  const core = { candidateCount: 0, clean: true, dictionarySealRoot: scannerDictionarySealForTest, scannerId, scannerRoot: labelRoot(`SCANNER:${scannerId}`), transactionRoot: pushTransactionForTest.transactionRoot };
  return { ...core, receiptRoot: rooted("MPRR-V18-SCANNER-RECEIPT", "1", canonical(core)) };
};
const scannerReceiptsForTest = [scannerReceiptForTest("SCANNER-A"), scannerReceiptForTest("SCANNER-B")];
const validPrincipals = Array.from({ length: 7 }, (_, index) => labelRoot(`PRINCIPAL-${index + 1}`));
const validAcceptanceSnapshot = {
  acceptorPrincipal: validPrincipals[6],
  casCommitted: true,
  closureComplete: true,
  executionMode: "NON-AUTHORITATIVE-QA",
  externalReceiptsValid: true,
  finalityValid: true,
  packageRoot: packageRootForTest,
  principals: validPrincipals,
  producerPrincipals: validPrincipals.slice(0, 2),
  publicInvariant: true,
  receiptPackageRoots: [packageRootForTest, packageRootForTest, packageRootForTest],
  reviewerPrincipals: validPrincipals.slice(2, 5),
  semanticReceiptValid: true,
  timeFresh: true,
};
const expectedAuthorityStateForTest = { Acceptance: 0, Gate29: "BLOCKED", authorityOutputs: 0, developmentFreeze: "ACTIVE", independentReceipt: "MISSING-EXTERNAL-INPUT", repository: "PUBLIC" };
const validControlRecord = controls[5];
const testDefinitions = [
  {
    negative: { declaredRoot: labelRoot("WRONG-PACKAGE"), operation: "PACKAGE_ROOT_CHECK", payloadRecords: syntheticPayloadRecords, toolRoots: syntheticToolRoots },
    negativeTerminal: "TERM-PACKAGE-INVALID",
    positive: { declaredRoot: syntheticPackageRoot, operation: "PACKAGE_ROOT_CHECK", payloadRecords: syntheticPayloadRecords, toolRoots: syntheticToolRoots },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { declaredRoot: labelRoot("WRONG-TOOL"), operation: "TOOL_ROOT_CHECK", path: `${packageLogicalRoot}/reader-a.mjs` },
    negativeTerminal: "TERM-TOOL-INVALID",
    positive: { declaredRoot: readerARoot, operation: "TOOL_ROOT_CHECK", path: `${packageLogicalRoot}/reader-a.mjs` },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { actual: ["a"], expected: ["a", "b"], operation: "SET_EQUALITY" },
    negativeTerminal: "TERM-UNIVERSE-INVALID",
    positive: { actual: ["b", "a"], expected: ["a", "b"], operation: "SET_EQUALITY" },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { expectedGitStateRoot: labelRoot("WRONG-GIT-STATE"), expectedOrigin: "https://github.com/talstilkol/connect.git", operation: "REPOSITORY_IDENTITY" },
    negativeTerminal: "TERM-REPOSITORY-INVALID",
    positive: { expectedGitStateRoot: gitStateRoot, expectedOrigin: "https://github.com/talstilkol/connect.git", operation: "REPOSITORY_IDENTITY" },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { declaredRediscoveryRoot: labelRoot("OMITTED-PARSER-MEMBER"), operation: "PARSER_REDISCOVERY" },
    negativeTerminal: "TERM-PARSER-INVALID",
    positive: { declaredRediscoveryRoot: parserRediscoverySetRoot, operation: "PARSER_REDISCOVERY" },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { operation: "SCHEMA_RECORD", record: { ...validControlRecord, unexpected: true }, schemaId: "SCHEMA-CONTROL" },
    negativeTerminal: "TERM-SCHEMA-INVALID",
    positive: { operation: "SCHEMA_RECORD", record: validControlRecord, schemaId: "SCHEMA-CONTROL" },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { operation: "SCHEMA_REFERENCES", references: ["SCHEMA-CONTROL", "SCHEMA-UNDEFINED"] },
    negativeTerminal: "TERM-SCHEMA-INVALID",
    positive: { operation: "SCHEMA_REFERENCES", references: ["SCHEMA-CONTROL", "SCHEMA-EXTERNAL-RECEIPT"] },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { operation: "CANONICAL_JSON", rawJson: "{\"a\":1,\"a\":2}" },
    negativeTerminal: "TERM-CANONICAL-INVALID",
    positive: { operation: "CANONICAL_JSON", rawJson: canonical({ "\uE000": 2, "😀": 1 }) },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { declaredRoot: labelRoot("WRONG-ENVELOPE"), envelope, operation: "ENVELOPE_ROOT" },
    negativeTerminal: "TERM-ENVELOPE-INVALID",
    positive: { declaredRoot: envelopeRoot, envelope, operation: "ENVELOPE_ROOT" },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { expectedEnvelope: detachedEvidenceForTest, operation: "DETACHED_PACKAGE_BINDING", receiptEnvelope: { ...detachedEvidenceForTest, packageRoot: labelRoot("OTHER-PACKAGE") } },
    negativeTerminal: "TERM-BINDING-INVALID",
    positive: { expectedEnvelope: detachedEvidenceForTest, operation: "DETACHED_PACKAGE_BINDING", receiptEnvelope: detachedEvidenceForTest },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { bindings: [{ leftPath: "candidate.packageRoot", multiplicity: "EXACTLY-ONE", operator: "CANONICAL-STRICT-EQUALS", rightPath: "receipt.subjectRoot" }], evidence: bindingEvidenceForTest, operation: "BINDING_PATHS" },
    negativeTerminal: "TERM-BINDING-INVALID",
    positive: { bindings: [
      { leftPath: "candidate.packageRoot", multiplicity: "EXACTLY-ONE", operator: "CANONICAL-STRICT-EQUALS", rightPath: "receipt.packageRoot" },
      { leftPath: "candidate.manifestRoot", multiplicity: "EXACTLY-ONE", operator: "CANONICAL-STRICT-EQUALS", rightPath: "receipt.manifestRoot" },
      { leftPath: "candidate.subjectRoot", multiplicity: "EXACTLY-ONE", operator: "CANONICAL-STRICT-EQUALS", rightPath: "receipt.subjectRoot" },
    ], evidence: bindingEvidenceForTest, operation: "BINDING_PATHS" },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { mode: "NORMATIVE-INCLUSION-BY-EXACT-CANONICAL-BYTES", operation: "SEMANTIC_IDENTITY", sourceRoot: labelRoot("SOURCE"), targetRoot: labelRoot("TARGET") },
    negativeTerminal: "TERM-SEMANTIC-INVALID",
    positive: { mode: "NORMATIVE-INCLUSION-BY-EXACT-CANONICAL-BYTES", operation: "SEMANTIC_IDENTITY", sourceRoot: labelRoot("IDENTICAL"), targetRoot: labelRoot("IDENTICAL") },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { bytesHex: "616263", offset: 99, operation: "BYTE_MUTATION", xorMask: 1 },
    negativeTerminal: "TERM-MALFORMED",
    positive: { bytesHex: "616263", offset: 0, operation: "BYTE_MUTATION", xorMask: 1 },
    positiveTerminal: "TERM-SOURCE-MUTATION-DETECTED",
  },
  {
    negative: { graphVectorIds: ["a"], operation: "GRAPH_COVERAGE", oracleToEvaluatorEdges: 1, vectorIds: ["a", "b"] },
    negativeTerminal: "TERM-GRAPH-INVALID",
    positive: { graphVectorIds: ["b", "a"], operation: "GRAPH_COVERAGE", oracleToEvaluatorEdges: 0, vectorIds: ["a", "b"] },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { context: { ...allTrueContext, timeValid: "yes" }, machineId: "MPRR-V18-MACHINE-ACCEPTANCE", operation: "MACHINE_STEP", state: "PENDING" },
    negativeTerminal: "TERM-MALFORMED",
    positive: { context: allTrueContext, machineId: "MPRR-V18-MACHINE-ACCEPTANCE", operation: "MACHINE_STEP", state: "PENDING" },
    positiveTerminal: "TERM-PERMIT-ELIGIBLE",
    positivePermitEligible: false,
  },
  {
    negative: { context: invalidContext, operation: "EVENT_DERIVATION" },
    negativeTerminal: "TERM-INPUT-INVALID",
    positive: { context: allTrueContext, operation: "EVENT_DERIVATION" },
    positiveTerminal: "TERM-EVENT-DERIVED",
  },
  {
    negative: { declaredModelInvariantRoot: labelRoot("WRONG-MODEL-INVARIANT"), operation: "MODEL_INVARIANT" },
    negativeTerminal: "TERM-MODEL-INVALID",
    positive: { declaredModelInvariantRoot: modelInvariantRoot, operation: "MODEL_INVARIANT" },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { claimedAcceptance: 1, claimedAuthorityOutputs: 1, operation: "AUTHORITY_DERIVATION", snapshot: { ...validAcceptanceSnapshot, finalityValid: false } },
    negativeTerminal: "TERM-AUTHORITY-MISMATCH",
    positive: { claimedAcceptance: 0, claimedAuthorityOutputs: 0, operation: "AUTHORITY_DERIVATION", snapshot: { ...validAcceptanceSnapshot, finalityValid: false } },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { operation: "ACCEPTANCE_DERIVATION", snapshot: { ...validAcceptanceSnapshot, reviewerPrincipals: [validPrincipals[0], validPrincipals[3], validPrincipals[4]] } },
    negativeTerminal: "TERM-BLOCKED",
    positive: { operation: "ACCEPTANCE_DERIVATION", snapshot: validAcceptanceSnapshot },
    positiveTerminal: "TERM-PERMIT-ELIGIBLE",
    positivePermitEligible: true,
  },
  {
    negative: { comparisons: validCasComparisonsForTest.map((item, index) => index === 32 ? { ...item, observedRoot: labelRoot("SAME-CARDINALITY-SUBSTITUTION") } : item), crashPoint: "NONE", durableWriteIds: [], operation: "CAS_TRANSACTION", operationKey: casOperationKeyForTest, permitCount: 0, readbackMatches: true, receiptDurable: false },
    negativeTerminal: "TERM-CAS-ABORTED",
    positive: { comparisons: validCasComparisonsForTest, crashPoint: "NONE", durableWriteIds: casDurableMemberIds, operation: "CAS_TRANSACTION", operationKey: casOperationKeyForTest, permitCount: 1, readbackMatches: true, receiptDurable: true },
    positiveTerminal: "TERM-COMMITTED",
  },
  {
    negative: { committedMemberIds: casDurableMemberIds.slice(0, 1), crashPoint: "AFTER-COMMIT-BEFORE-RESPONSE", exactReceiptAvailable: false, operation: "RECOVERY_SCHEDULE", revocationConsumed: false },
    negativeTerminal: "TERM-RECOVERY-INVALID",
    positive: { committedMemberIds: casDurableMemberIds, crashPoint: "AFTER-COMMIT-BEFORE-RESPONSE", exactReceiptAvailable: true, operation: "RECOVERY_SCHEDULE", revocationConsumed: false },
    positiveTerminal: "TERM-RECOVERED-EXACT-RECEIPT",
  },
  {
    negative: { expectedAudience: "MPRR-V18-ACCEPTANCE", expectedManifestRoot: manifestRootForTest, expectedPackageRoot: packageRootForTest, expectedPurpose: "INDEPENDENT-SEMANTIC-RECEIPT", expectedSubjectRoot: subjectRoot, operation: "EXTERNAL_EVIDENCE", receipt: { ...validExternalReceiptForTest, packageRoot: labelRoot("OTHER-PACKAGE") }, trustedIssuerRoots: [trustedIssuerRootForTest] },
    negativeTerminal: "TERM-EXTERNAL-INVALID",
    positive: { expectedAudience: "MPRR-V18-ACCEPTANCE", expectedManifestRoot: manifestRootForTest, expectedPackageRoot: packageRootForTest, expectedPurpose: "INDEPENDENT-SEMANTIC-RECEIPT", expectedSubjectRoot: subjectRoot, operation: "EXTERNAL_EVIDENCE", receipt: validExternalReceiptForTest, trustedIssuerRoots: [trustedIssuerRootForTest] },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { observedVisibility: "PUBLIC", operation: "PUBLIC_INVARIANT", requiredVisibility: "PUBLIC", scannerReceipts: scannerReceiptsForTest.map((item, index) => index === 1 ? { ...item, candidateCount: 1, clean: false } : item), transaction: pushTransactionForTest },
    negativeTerminal: "TERM-PUBLIC-UNSAFE",
    positive: { observedVisibility: "PUBLIC", operation: "PUBLIC_INVARIANT", requiredVisibility: "PUBLIC", scannerReceipts: scannerReceiptsForTest, transaction: pushTransactionForTest },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { dependencies: validDependencyObservationsForTest.map((item, index) => index === 17 ? { ...item, observedRoot: labelRoot("SAME-CARDINALITY-DEPENDENCY-SUBSTITUTION") } : item), operation: "DEPENDENCY_HEADS" },
    negativeTerminal: "TERM-DEPENDENCY-STALE",
    positive: { dependencies: validDependencyObservationsForTest, operation: "DEPENDENCY_HEADS" },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
  {
    negative: { defaultMode: "WRITE-IN-PACKAGE", explicitDetachedOutput: false, operation: "READER_OUTPUT_MODE", writeRequested: true },
    negativeTerminal: "TERM-READER-MUTATION-RISK",
    positive: { defaultMode: "READ-ONLY", explicitDetachedOutput: true, operation: "READER_OUTPUT_MODE", writeRequested: true },
    positiveTerminal: "TERM-MECHANICAL-CLEAN",
  },
];
if (testDefinitions.length !== 25) throw new Error(`expected 25 successor test definitions, got ${testDefinitions.length}`);
const controlVectorIds = new Map();
for (let index = 0; index < testDefinitions.length; index += 1) {
  const number = String(index + 1).padStart(3, "0");
  const controlId = `MPRR-V18-CONTROL-F${number}`;
  const definition = testDefinitions[index];
  const positiveId = addVector({ controlIds: [controlId], family: `SUCCESSOR-F${number}`, id: `MPRR-V18-VEC-F${number}-POSITIVE`, input: definition.positive, oracle: oracle(definition.positiveTerminal, definition.positivePermitEligible ?? false) });
  const negativeId = addVector({ controlIds: [controlId], family: `SUCCESSOR-F${number}`, id: `MPRR-V18-VEC-F${number}-NEGATIVE`, input: definition.negative, oracle: oracle(definition.negativeTerminal, definition.negativePermitEligible ?? false) });
  controlVectorIds.set(controlId, [positiveId, negativeId]);
}
for (const [suffix, rawJson] of [
  ["FLOAT", '{"a":1.5}'],
  ["UNSAFE-INTEGER", '{"a":9007199254740992}'],
  ["NON-NFC", '{"a":"e\\u0301"}'],
  ["LONE-SURROGATE", '{"a":"\\ud800"}'],
]) {
  const vectorId = addVector({
    controlIds: ["MPRR-V18-CONTROL-F008"],
    family: "SUCCESSOR-F008-CROSS-LANGUAGE-CORPUS",
    id: `MPRR-V18-VEC-F008-${suffix}`,
    input: { operation: "CANONICAL_JSON", rawJson },
    oracle: oracle("TERM-CANONICAL-INVALID"),
  });
  controlVectorIds.get("MPRR-V18-CONTROL-F008").push(vectorId);
}
for (const [suffix, snapshot] of [
  ["CLOSURE", { ...validAcceptanceSnapshot, closureComplete: false }],
  ["EXTERNAL", { ...validAcceptanceSnapshot, externalReceiptsValid: false }],
  ["SEMANTIC", { ...validAcceptanceSnapshot, semanticReceiptValid: false }],
  ["CAS", { ...validAcceptanceSnapshot, casCommitted: false }],
  ["PUBLIC", { ...validAcceptanceSnapshot, publicInvariant: false }],
  ["TIME", { ...validAcceptanceSnapshot, timeFresh: false }],
  ["FINALITY", { ...validAcceptanceSnapshot, finalityValid: false }],
  ["PACKAGE-BINDING", { ...validAcceptanceSnapshot, receiptPackageRoots: [labelRoot("OTHER-PACKAGE")] }],
  ["PRINCIPAL-UNIQUENESS", { ...validAcceptanceSnapshot, principals: [validPrincipals[0], validPrincipals[0]] }],
]) {
  const vectorId = addVector({
    controlIds: ["MPRR-V18-CONTROL-F019"],
    family: "SUCCESSOR-F019-PREREQUISITE-MUTATION",
    id: `MPRR-V18-VEC-F019-${suffix}`,
    input: { operation: "ACCEPTANCE_DERIVATION", snapshot },
    oracle: oracle("TERM-BLOCKED"),
  });
  controlVectorIds.get("MPRR-V18-CONTROL-F019").push(vectorId);
}
for (const [suffix, claimedState] of [
  ["POSITIVE", expectedAuthorityStateForTest],
  ["ACCEPTANCE", { ...expectedAuthorityStateForTest, Acceptance: 1 }],
  ["GATE", { ...expectedAuthorityStateForTest, Gate29: "OPEN" }],
  ["AUTHORITY-OUTPUT", { ...expectedAuthorityStateForTest, authorityOutputs: 1 }],
  ["FREEZE", { ...expectedAuthorityStateForTest, developmentFreeze: "INACTIVE" }],
  ["REPOSITORY", { ...expectedAuthorityStateForTest, repository: "PRIVATE" }],
]) {
  const positive = suffix === "POSITIVE";
  const vectorId = addVector({ controlIds: ["MPRR-V18-CONTROL-F018"], family: "SUCCESSOR-F018-DERIVED-AUTHORITY-STATE", id: `MPRR-V18-VEC-F018-STATE-${suffix}`, input: { claimedState, operation: "AUTHORITY_STATE_CHECK" }, oracle: oracle(positive ? "TERM-MECHANICAL-CLEAN" : "TERM-AUTHORITY-MISMATCH") });
  controlVectorIds.get("MPRR-V18-CONTROL-F018").push(vectorId);
}
{
  const vectorId = addVector({
    controlIds: ["MPRR-V18-CONTROL-F019"],
    family: "SUCCESSOR-F019-NO-SELF-ACCEPTANCE",
    id: "MPRR-V18-VEC-F019-AUTHORITATIVE-WITHOUT-ADAPTER",
    input: { operation: "NO_SELF_ACCEPTANCE", snapshot: { ...validAcceptanceSnapshot, executionMode: "AUTHORITATIVE" } },
    oracle: oracle("TERM-NO-SELF-ACCEPTANCE", true, 0),
  });
  controlVectorIds.get("MPRR-V18-CONTROL-F019").push(vectorId);
}
for (const [suffix, input, terminal] of [
  ["BEFORE-COMPARE", { committedMemberIds: [], crashPoint: "BEFORE-COMPARE", exactReceiptAvailable: false, operation: "RECOVERY_SCHEDULE", revocationConsumed: false }, "TERM-RECOVERED-NO-WRITE"],
  ["AFTER-COMPARE-BEFORE-COMMIT", { committedMemberIds: [], crashPoint: "AFTER-COMPARE-BEFORE-COMMIT", exactReceiptAvailable: false, operation: "RECOVERY_SCHEDULE", revocationConsumed: false }, "TERM-RECOVERED-NO-WRITE"],
  ["DURING-REVOCATION-CONSUMED", { committedMemberIds: casDurableMemberIds, crashPoint: "DURING-REVOCATION", exactReceiptAvailable: true, operation: "RECOVERY_SCHEDULE", revocationConsumed: true }, "TERM-REVOKED"],
  ["DURING-REVOCATION-NOT-CONSUMED", { committedMemberIds: casDurableMemberIds, crashPoint: "DURING-REVOCATION", exactReceiptAvailable: true, operation: "RECOVERY_SCHEDULE", revocationConsumed: false }, "TERM-RECOVERY-INVALID"],
  ["AFTER-REVOCATION", { committedMemberIds: casDurableMemberIds, crashPoint: "AFTER-REVOCATION", exactReceiptAvailable: true, operation: "RECOVERY_SCHEDULE", revocationConsumed: true }, "TERM-REVOKED"],
]) {
  const vectorId = addVector({ controlIds: ["MPRR-V18-CONTROL-F021"], family: "SUCCESSOR-F021-CRASH-BOUNDARY", id: `MPRR-V18-VEC-F021-${suffix}`, input, oracle: oracle(terminal) });
  controlVectorIds.get("MPRR-V18-CONTROL-F021").push(vectorId);
}
writeJsonl("causal-vectors.jsonl", vectors);

const graphNodes = [];
const graphEdges = [];
for (const vector of vectors) {
  const prefix = `${vector.vectorId}:`;
  const expectedActualRoot = rooted("MPRR-V18-ACTUAL-RESULT", "1", vector.oracle.terminal, String(vector.oracle.permitEligible), String(vector.oracle.authorityOutputs));
  const comparisonRoot = rooted("MPRR-V18-POST-EXECUTION-COMPARISON", "1", expectedActualRoot, vector.oracleRoot);
  const nodeSpecs = [
    ["INPUT", "RAW-INPUT", vector.inputRoot],
    ["EVALUATOR", "EVALUATOR", labelRoot(`EVALUATOR:${vector.input.operation}`)],
    ["ACTUAL", "ACTUAL-RESULT", expectedActualRoot],
    ["ORACLE", "EXPECTED-ORACLE", vector.oracleRoot],
    ["COMPARE", "POST-EXECUTION-COMPARISON", comparisonRoot],
  ];
  for (const [suffix, nodeType, root] of nodeSpecs) graphNodes.push({ nodeId: `${prefix}${suffix}`, nodeType, root, vectorId: vector.vectorId });
  const edgeSpecs = [
    ["INPUT", "EVALUATOR", "INPUT-TO-EVALUATOR"],
    ["EVALUATOR", "ACTUAL", "EVALUATOR-TO-ACTUAL"],
    ["ACTUAL", "COMPARE", "ACTUAL-TO-COMPARISON"],
    ["ORACLE", "COMPARE", "ORACLE-TO-COMPARISON"],
  ];
  edgeSpecs.forEach(([from, to, relation], edgeIndex) => graphEdges.push({ edgeId: `${vector.vectorId}:EDGE-${edgeIndex + 1}`, from: `${prefix}${from}`, relation, to: `${prefix}${to}`, vectorId: vector.vectorId }));
}
const graph = withRoot("MPRR-V18-CAUSAL-GRAPH", {
  edgeCount: graphEdges.length,
  edges: graphEdges,
  graphId: "MPRR-V18-CAUSAL-GRAPH",
  nodeCount: graphNodes.length,
  nodes: graphNodes,
  requiredOrder: ["INPUT-TO-EVALUATOR", "EVALUATOR-TO-ACTUAL", "ACTUAL-TO-COMPARISON", "ORACLE-TO-COMPARISON"],
  schemaId: "SCHEMA-GRAPH",
}, "graphRoot");
writeJson("causal-source-graph.json", graph);

const closureRows = findings.map((finding) => {
  const number = String(finding.index).padStart(3, "0");
  const controlId = `MPRR-V18-CONTROL-F${number}`;
  return withRoot("MPRR-V18-CLOSURE", {
    acceptanceCredit: 0,
    controlId,
    independentReceiptState: "MISSING",
    requirementId: `MPRR-V18-REQ-${number}`,
    schemaId: "SCHEMA-CLOSURE",
    sourceByteEndExclusive: finding.byteEndExclusive,
    sourceByteStart: finding.byteStart,
    sourceFindingId: finding.findingId,
    sourceFindingRoot: finding.sourceRoot,
    sourceLocator: `${findingsPath}#bytes=${finding.byteStart}-${finding.byteEndExclusive}`,
    vectorIds: controlVectorIds.get(controlId),
  }, "rowRoot");
});
writeJsonl("closure-crosswalk.jsonl", closureRows);

const repositoryIdentity = withRoot("MPRR-V18-REPOSITORY-IDENTITY", {
  expectedGitHead,
  expectedGitRef,
  expectedOrigin: "https://github.com/talstilkol/connect.git",
  externalUntrackedSetRoot,
  gitStateRoot,
  gitTopLevelPolicy: "REALPATH-MUST-EQUAL-DIRECTORY-CONTAINING-DOCS",
  indexListingRoot,
  intendedGitStatePolicy: "EXACT-BOUND-HEAD+REF+INDEX+TRACKED-DIFF+EXTERNAL-UNTRACKED-SET;PACKAGE-CONTAINER-EXCLUDED",
  logicalRoot: ".",
  marker: "docs/",
  schemaId: "SCHEMA-REPOSITORY-IDENTITY",
  symlinkPolicy: "REALPATH-CONTAINMENT-REQUIRED;ESCAPE-REJECTED",
  trackedDiffRoot,
}, "identityRoot");
const canonicalContract = withRoot("MPRR-V18-CANONICAL-CONTRACT", {
  duplicateKeyPolicy: "REJECT-BY-EXACT-RESERIALIZATION",
  floatPolicy: "REJECT",
  integerPolicy: "SAFE-SIGNED-INTEGER;SCHEMA-BOUNDS-APPLY",
  keyOrder: "UTF8-BYTE-LEXICOGRAPHIC",
  normalization: "NFC",
  schemaId: "SCHEMA-CANONICAL-CONTRACT",
}, "canonicalRoot");
const acceptanceContract = withRoot("MPRR-V18-ACCEPTANCE-CONTRACT", {
  authorityAdapterPresent: false,
  noSelfAcceptance: true,
  positiveControlNonAuthoritative: true,
  requiredExternalInputIds: externalInputIds,
  schemaId: "SCHEMA-ACCEPTANCE-CONTRACT",
}, "acceptanceRoot");
const casContract = withRoot("MPRR-V18-CAS-CONTRACT", {
  comparisonMemberIds: casComparisonMemberIds,
  comparisonSetRoot: casComparisonSetRoot,
  currentAdmissionState: "BLOCKED-MISSING-EXTERNAL-HEADS",
  durableMemberIds: casDurableMemberIds,
  durableMemberSetRoot: casDurableMemberSetRoot,
  operationKeyRule: "EXACTLY-ONE-CONTENT-ADDRESSED-OPERATION-KEY;REPLAY-RETURNS-EXACT-RECEIPT",
  permitCountRule: "ZERO-OR-ONE;NEVER-MORE-THAN-ONE",
  productionAdapterExecutable: false,
  referenceEvaluatorExecutable: true,
  schemaId: "SCHEMA-CAS-CONTRACT",
}, "casRoot");
const recoveryContract = withRoot("MPRR-V18-RECOVERY-CONTRACT", {
  crashPoints: ["BEFORE-COMPARE", "AFTER-COMPARE-BEFORE-COMMIT", "AFTER-COMMIT-BEFORE-RESPONSE", "DURING-REVOCATION", "AFTER-REVOCATION"],
  durableMemberIds: casDurableMemberIds,
  productionAdapterExecutable: false,
  referenceEvaluatorExecutable: true,
  requiredOutcomes: ["NO-PARTIAL-AUTHORITY", "EXACT-RECEIPT-REPLAY", "ATOMIC-REVOCATION-HEAD", "CONSUMER-READS-CURRENT-HEAD"],
  schemaId: "SCHEMA-RECOVERY-CONTRACT",
  storageAdapterState: "REFERENCE-EXECUTABLE;PRODUCTION-ABSENT",
}, "recoveryRoot");
const publicInvariant = withRoot("MPRR-V18-PUBLIC-INVARIANT", {
  currentContinuousReceiptState: "MISSING-EXTERNAL-INPUT",
  requiredScannerCount: 2,
  requiredVisibility: "PUBLIC",
  schemaId: "SCHEMA-PUBLIC-INVARIANT",
  transactionBinding: "EXACT-REMOTE+REF+OLD-HEAD+NEW-HEAD+WRITE-OBJECT-SET+SCANNER-RECEIPTS",
}, "publicRoot");
const governance = withRoot("MPRR-V18-GOVERNANCE", {
  freezeRequired: true,
  independentSemanticReceiptRequired: true,
  schemaId: "SCHEMA-GOVERNANCE",
  zeroImplicitCredit: true,
}, "governanceRoot");
const semanticPreservationContract = withRoot("MPRR-V18-SEMANTIC-PRESERVATION-CONTRACT", {
  exactByteIdentityRequired: true,
  maxShardBytesExclusive: publicRegularGitMemberByteLimitExclusive,
  proofCount: semanticRows.length,
  proofSetRoot: semanticProofSetRoot,
  schemaId: "SCHEMA-SEMANTIC-PRESERVATION-CONTRACT",
  shardCount: semanticShardMembers.length,
  shardMembers: semanticShardMembers,
  shardSetRoot: semanticShardSetRoot,
  sourcePaths: semanticSourcePaths,
}, "semanticRoot");
const authorityState = {
  Acceptance: 0,
  Gate29: "BLOCKED",
  authorityOutputs: 0,
  developmentFreeze: "ACTIVE",
  independentReceipt: "MISSING-EXTERNAL-INPUT",
  repository: "PUBLIC",
};
const evaluatorRegistry = [...new Set(vectors.map((vector) => vector.input.operation))].sort(compareUtf8);
const registry = {
  acceptanceContract,
  artifactId: "CONNECT-THREE-REVIEW-PROTOCOL-V1-8-IMMUTABLE-SUCCESSOR-2026-08-30",
  authorityState,
  canonicalContract,
  casContract,
  controls,
  evaluatorRegistry,
  externalInputs,
  governance,
  guards,
  machineExecutionContract,
  machines,
  parserRediscoveryContract,
  publicInvariant,
  recoveryContract,
  repositoryIdentity,
  schemaId: "SCHEMA-REGISTRY",
  schemas,
  semanticPreservationContract,
};
writeJson("normative-registry.json", registry);

const subjectLines = [
  "# Protocol v1.8 immutable successor requirements",
  "",
  "## 1. Identity and non-authority",
  "",
  "1.1 Artifact=CONNECT-THREE-REVIEW-PROTOCOL-V1-8-IMMUTABLE-SUCCESSOR-2026-08-30.",
  "",
  "1.2 This package is a formal non-authoritative successor to Protocol v1.7 and its independent hostile review.",
  "",
  "1.3 Acceptance=0; Gate29=BLOCKED; developmentFreeze=ACTIVE; repository=PUBLIC; authorityOutputs=0.",
  "",
  "1.4 Mechanical PASS is not semantic Acceptance, HumanApproval, B0 authority, a CommitReceipt, a Permit or deployment authority.",
  "",
  "1.5 v1.7 bytes, its 31 predecessor finding closures, 4016 semantic predicates and 53450 semantic uses remain normative only by exact content-addressed inclusion; no translation or weakening is allowed.",
  "",
  "1.6 All external review, semantic, trust, time, finality, live-head and continuous-PUBLIC receipts remain missing. No package member can self-supply them.",
  "",
  "## 2. Exact one-to-one closure requirements",
  "",
];
for (const finding of findings) {
  const number = String(finding.index).padStart(3, "0");
  subjectLines.push(`### 2.${finding.index} MPRR-V18-REQ-${number} — ${finding.title}`);
  subjectLines.push("");
  subjectLines.push(`2.${finding.index}.1 sourceFinding=${finding.findingId};severity=${finding.severity};control=MPRR-V18-CONTROL-F${number}.`);
  subjectLines.push("");
  subjectLines.push(`2.${finding.index}.2 requiredClosure=${finding.closure}`);
  subjectLines.push("");
  subjectLines.push(`2.${finding.index}.3 proof=exact source bytes + typed control + positive/negative causal vectors + independent reader parity; acceptanceCredit=0 pending external hostile review.`);
  subjectLines.push("");
}
subjectLines.push(
  "## 3. Executable contracts",
  "",
  `3.1 Both readers independently recompute packageRoot from the exact ${payloadNames.length}-member payload and all three physical tool roots.`,
  "",
  "3.2 Both readers require exact canonical JSON bytes, NFC, UTF-8 byte key order, duplicate rejection, safe integers and no floats.",
  "",
  "3.3 Every schema reference resolves to a non-empty closed typed schema. Every normative record rejects missing, extra and ill-typed fields.",
  "",
  `3.4 semanticPreservationRows=${semanticRows.length}; predecessorFindingRows=${predecessorRows.length}; relation=exact canonical byte identity, not asserted equivalence.`,
  "",
  `3.5 causalVectors=${vectors.length}; predecessorVectors=574; successorVectors=${vectors.length - 574}; graphNodes=${graphNodes.length}; graphEdges=${graphEdges.length}.`,
  "",
  "3.6 Evaluators receive only vector.input. vector.oracle is read only after actual evaluation. Every vector has one five-node/four-edge causal path, and oracle has no path to evaluator.",
  "",
  "3.7 Machine events derive from typed raw context. Exactly one registered guard executes before transition and authority effect.",
  "",
  "3.8 Acceptance is derived from exact closure, valid package-bound external receipts, semantic proof, independent principals, CAS, PUBLIC, time and finality. Producer/readers cannot satisfy external roles.",
  "",
  "3.9 The positive acceptance control is synthetic and non-authoritative: it may reach Permit-eligible but always emits zero authority outputs.",
  "",
  "3.10 CAS and recovery have executable reference evaluators covering stale heads, atomic commit, response loss, exact receipt replay, partial writes, readback divergence and revocation.",
  "",
  "3.11 Production CAS/public/trust adapters remain absent. Current admission is blocked and no Permit can be issued.",
  "",
  "3.12 Readers are read-only by default. Reports require an explicit detached output path during Producer QA before freeze.",
  "",
  "## 4. Freeze and review boundary",
  "",
  "4.1 This Subject and all normative payload members freeze only after manifest/tool roots, two-reader parity and Producer QA are materialized.",
  "",
  "4.2 Producer QA cannot close any of the 25 findings. A later independent hostile review must verify every row separately.",
  "",
  "4.3 Repository visibility must remain PUBLIC. No product, Git, GitHub, provider or deployment mutation is authorized by this package.",
  "",
);
writeFileSync(resolve(packageDir, "subject.md"), `${subjectLines.join("\n")}\n`, "utf8");

const payloadMembers = payloadNames.map((name) => stat(`${packageLogicalRoot}/${name}`));
if (payloadMembers.some((member) => member.bytes >= publicRegularGitMemberByteLimitExclusive)) throw new Error("PUBLIC regular-Git payload member is not below 50 MiB");
const producerTools = [
  { path: `${packageLogicalRoot}/${basename(generatorPath)}`, role: "DETERMINISTIC-PRODUCER", root: generatorRoot },
  { path: `${packageLogicalRoot}/${basename(readerAPath)}`, role: "INDEPENDENT-MECHANICAL-READER-A", root: readerARoot },
  { path: `${packageLogicalRoot}/${basename(readerBPath)}`, role: "INDEPENDENT-MECHANICAL-READER-B", root: readerBRoot },
];
const packageRoot = rooted(
  "MPRR-V18-NORMATIVE-PACKAGE",
  "1",
  ...payloadMembers.map(canonical).sort(compareUtf8),
  generatorRoot,
  readerARoot,
  readerBRoot,
);
const manifest = {
  artifactId: "CONNECT-THREE-REVIEW-PROTOCOL-V1-8-IMMUTABLE-SUCCESSOR-2026-08-30",
  authorityState,
  frozenInputs: sourceUniverse,
  packageRoot,
  packageRootConstructor: "SHA-256(CPB1(MPRR-V18-NORMATIVE-PACKAGE,1,sorted-canonical-payload-records,generatorRoot,readerARoot,readerBRoot))",
  packageSchemaVersion: "1",
  payloadMembers,
  producerTools,
  schemaId: "SCHEMA-MANIFEST",
};
writeJson("normative-package-manifest.json", manifest);

mkdirSync(detachedReportDir, { recursive: true });
execFileSync(process.execPath, [readerAPath, packageDir, "--report", reportAPath], { stdio: "inherit" });
execFileSync("ruby", [readerBPath, packageDir, "--report", reportBPath], { stdio: "inherit" });
const reportA = JSON.parse(readFileSync(reportAPath, "utf8"));
const reportB = JSON.parse(readFileSync(reportBPath, "utf8"));
if (reportA.status !== "PASS" || reportB.status !== "PASS" || reportA.commonResultRoot !== reportB.commonResultRoot || reportA.vectorResultSetRoot !== reportB.vectorResultSetRoot) throw new Error("independent reader parity failed");

const qaLines = [
  "# Protocol v1.8 immutable successor — detached Producer QA",
  "",
  "## 1. Outcome",
  "",
  "1.1 PRODUCER-MECHANICAL-QA=PASS.",
  "",
  "1.2 Reader A and Reader B independently recomputed identical packageRoot, vectorResultSetRoot and commonResultRoot.",
  "",
  `1.3 packageRoot=${packageRoot}.`,
  "",
  `1.4 manifestRoot=${sha256(readFileSync(resolve(packageDir, "normative-package-manifest.json")))}.`,
  "",
  `1.5 readerAReportRoot=${sha256(readFileSync(reportAPath))};readerBReportRoot=${sha256(readFileSync(reportBPath))};commonResultRoot=${reportA.commonResultRoot}.`,
  "",
  "## 2. Exact denominators",
  "",
  `2.1 v1.7ReviewFindings=25;closureRows=${closureRows.length};mergedRows=0;acceptanceCredit=0.`,
  "",
  `2.2 predecessorFindingRows=${predecessorRows.length};semanticPreservationRows=${semanticRows.length};v1.7PredicateRows=4016;v1.7SemanticUseRows=53450.`,
  "",
  `2.3 vectors=${vectors.length};predecessorVectors=574;successorVectors=${vectors.length - 574};graphNodes=${graphNodes.length};graphEdges=${graphEdges.length};graphCoverage=${vectors.length}/${vectors.length}.`,
  "",
  `2.4 schemas=${schemas.length};unresolvedSchemaReferences=0;emptyFieldTypes=0.`,
  "",
  "## 3. Authority boundary",
  "",
  "3.1 Acceptance=0;Gate29=BLOCKED;developmentFreeze=ACTIVE;repository=PUBLIC;authorityOutputs=0.",
  "",
  "3.2 Mechanical PASS is not semantic Acceptance. Independent semantic receipt, three reviews, reconciliation, HumanApproval, trust/time/finality, live CAS heads and continuous PUBLIC receipt remain missing.",
  "",
  "3.3 The positive path is synthetic and non-authoritative. Production adapters are absent. No self-acceptance or Permit issuance occurred.",
  "",
  "3.4 No product, Git, GitHub, provider or deployment mutation was performed.",
  "",
];
writeFileSync(producerQAPath, `${qaLines.join("\n")}\n`, "utf8");

for (const artifact of [...payloadNames, "normative-package-manifest.json", "generate.mjs", "reader-a.mjs", "reader-b.rb", "producer-qa.md"]) {
  const bytes = readFileSync(resolve(packageDir, artifact));
  process.stdout.write(`${packageLogicalRoot}/${artifact}\t${sha256(bytes)}\t${lineCount(bytes)}\t${bytes.length}\n`);
}
for (const artifact of ["qa-reader-a-report.json", "qa-reader-b-report.json"]) {
  const bytes = readFileSync(resolve(detachedReportDir, artifact));
  process.stdout.write(`${detachedReportLogicalRoot}/${artifact}\t${sha256(bytes)}\t${lineCount(bytes)}\t${bytes.length}\n`);
}
process.stdout.write(`PACKAGE_ROOT\t${packageRoot}\n`);
process.stdout.write(`COMMON_RESULT_ROOT\t${reportA.commonResultRoot}\n`);
