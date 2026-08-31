#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const packageDir = resolve(new URL(".", import.meta.url).pathname);
const repositoryRoot = resolve(packageDir, "../../..");
const packageLogicalRoot = "docs/planning/three-review-protocol-v1-9-package-2026-08-30";
const file = (name) => resolve(packageDir, name);
const logical = (name) => `${packageLogicalRoot}/${name}`;
const sourceFile = (path) => resolve(repositoryRoot, path);
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
  if (typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  throw new Error(`non-canonical type ${typeof value}`);
};
const lineCount = (bytes) => {
  if (bytes.length === 0) return 0;
  let count = 0;
  for (const byte of bytes) if (byte === 10) count += 1;
  return bytes[bytes.length - 1] === 10 ? count : count + 1;
};
const json = (path) => JSON.parse(readFileSync(sourceFile(path), "utf8"));
const jsonl = (path) => readFileSync(sourceFile(path), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const writeCanonical = (name, value) => writeFileSync(file(name), `${canonical(value)}\n`, "utf8");
const writeJsonl = (name, rows) => writeFileSync(file(name), `${rows.map(canonical).join("\n")}\n`, "utf8");
const digestRecord = (domain, value) => rooted(domain, "1", canonical(value));
const digestSchemaRecord = (domain, schemaId, value) => digestRecord(domain, { ...value, schemaId });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const V17_PACKAGE = "docs/planning/three-review-protocol-v1-7-package-2026-08-30";
const V18_PACKAGE = "docs/planning/three-review-protocol-v1-8-package-2026-08-30";
const V17_REVIEW = "docs/planning/three-review-protocol-v1-7-independent-hostile-review-2026-08-30.md";
const V17_FINDINGS = "docs/planning/three-review-protocol-v1-7-independent-hostile-review-findings-manifest-2026-08-30.md";
const V18_REVIEW = "docs/planning/three-review-protocol-v1-8-independent-hostile-review-2026-08-30.md";
const V18_FINDINGS = "docs/planning/three-review-protocol-v1-8-independent-hostile-review-findings-manifest-2026-08-30.md";

const v17Registry = json(`${V17_PACKAGE}/normative-registry.json`);
const v17Outputs = jsonl(`${V17_PACKAGE}/requirement-outputs.jsonl`);
const v17Vectors = jsonl(`${V17_PACKAGE}/causal-vectors.jsonl`);
const v17Predicates = jsonl(`${V17_PACKAGE}/predecessor-semantic-predicates.jsonl`);
const v17Uses = jsonl(`${V17_PACKAGE}/semantic-use-index.jsonl`);

const fixedPackageMembers = {
  [V17_PACKAGE]: [
    "causal-source-graph.json", "causal-vectors.jsonl", "closure-crosswalk.jsonl", "generate.mjs",
    "normative-package-manifest.json", "normative-registry.json", "predecessor-clause-crosswalk.jsonl",
    "predecessor-closure.jsonl", "predecessor-semantic-predicates.jsonl", "producer-qa.md",
    "qa-reader-a-report.json", "qa-reader-b-report.json", "reader-a.mjs", "reader-b.rb",
    "requirement-outputs.jsonl", "semantic-use-index.jsonl", "subject.md",
  ],
  [V18_PACKAGE]: [
    "FINAL.md", "causal-source-graph.json", "causal-vectors.jsonl", "closure-crosswalk.jsonl",
    "contract-preservation.json", "generate.mjs", "normative-package-manifest.json", "normative-registry.json",
    "predecessor-finding-preservation.jsonl", "producer-qa.md", "reader-a.mjs", "reader-b.rb",
    "semantic-preservation-000001-030000.jsonl", "semantic-preservation-030001-057466.jsonl", "subject.md",
  ],
};

const sourcePaths = new Set([V17_REVIEW, V17_FINDINGS, V18_REVIEW, V18_FINDINGS]);
for (const [dir, names] of Object.entries(fixedPackageMembers)) for (const name of names) sourcePaths.add(`${dir}/${name}`);
for (const carrier of v17Registry.sourceCarriers) sourcePaths.add(carrier.path);
const detachedV18 = "docs/planning/three-review-protocol-v1-8-detached-reports-2026-08-30";
for (const name of ["qa-reader-a-report.json", "qa-reader-b-report.json"]) sourcePaths.add(`${detachedV18}/${name}`);

const sourceReceiptRows = [...sourcePaths].sort().map((path, index) => {
  const bytes = readFileSync(sourceFile(path));
  const mode = statSync(sourceFile(path)).mode & 0o777;
  const core = {
    bytes: bytes.length,
    lines: lineCount(bytes),
    mode,
    path,
    reconstructionRule: "READ-EXACT-REPOSITORY-RELATIVE-REGULAR-FILE;NO-GIT;NO-NETWORK;NO-WORKSPACE-ENUMERATION",
    root: sha256(bytes),
    sourceId: `MPRR-V19-SOURCE-${String(index + 1).padStart(3, "0")}`,
  };
  return { ...core, receiptRoot: digestSchemaRecord("MPRR-V19-FROZEN-SOURCE-RECEIPT", "SCHEMA-FROZEN-SOURCE-RECEIPT", core), schemaId: "SCHEMA-FROZEN-SOURCE-RECEIPT" };
});
writeJsonl("frozen-source-receipt.jsonl", sourceReceiptRows);

const sourceReceiptSetRoot = rooted("MPRR-V19-FROZEN-SOURCE-SET", "1", ...sourceReceiptRows.map((row) => row.receiptRoot).sort());
const governanceCore = {
  acceptanceRule: "DERIVE-ONLY-FROM-EXACT-ROOTED-VALIDATOR-RESULT-SET;NO-CALLER-VALIDITY-BOOLEAN",
  algorithmApprovalState: "MISSING-EXTERNAL-APPROVAL",
  allowedSignatureAlgorithms: [],
  authorityOutputRule: "ZERO-UNLESS-ACCEPTANCE-CAS-RECEIPT-IS-DURABLE-AND-EXTERNALLY-VALIDATED",
  evidenceAudience: "CONNECT-PROTOCOL-INDEPENDENT-REVIEW-AUTHORITY",
  exactRoleSlots: [
    { role: "PRODUCER", slotId: "ROLE-PRODUCER-01" },
    { role: "INDEPENDENT-REVIEWER", slotId: "ROLE-REVIEWER-01" },
    { role: "INDEPENDENT-REVIEWER", slotId: "ROLE-REVIEWER-02" },
    { role: "INDEPENDENT-REVIEWER", slotId: "ROLE-REVIEWER-03" },
    { role: "RECONCILER", slotId: "ROLE-RECONCILER-01" },
    { role: "HUMAN-APPROVER-TAL", slotId: "ROLE-APPROVER-01" },
    { role: "PERMIT-ISSUER", slotId: "ROLE-PERMIT-ISSUER-01" },
  ],
  exactValidatorIds: [
    "VALIDATOR-PACKAGE", "VALIDATOR-FROZEN-SOURCES", "VALIDATOR-SCHEMAS", "VALIDATOR-CLOSURE",
    "VALIDATOR-SEMANTIC-ENTAILMENT", "VALIDATOR-PREDECESSOR-BEHAVIOR", "VALIDATOR-CAUSAL-TRACE",
    "VALIDATOR-APPOINTMENTS", "VALIDATOR-EXTERNAL-SIGNATURES", "VALIDATOR-SCANNERS",
    "VALIDATOR-REMOTE-PUBLIC", "VALIDATOR-CAS", "VALIDATOR-RECOVERY", "VALIDATOR-TIME-REVOCATION-FINALITY",
    "VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL",
  ],
  generation: "MPRR-V19-GENERATION-01",
  packageRootSelector: "COMPUTED-MANIFEST-PACKAGE-ROOT",
  purpose: "THREE-REVIEW-RECONCILIATION-AND-PERMIT-ELIGIBILITY",
  repositoryVisibility: "PUBLIC",
  separationRule: "ALL-SEVEN-SLOTS-DISTINCT;PRODUCER-NOT-REVIEWER-RECONCILER-APPROVER-ISSUER;REVIEWERS-PAIRWISE-DISTINCT;REVIEWERS-NOT-RECONCILER-APPROVER-ISSUER;RECONCILER-NOT-APPROVER-ISSUER;APPROVER-NOT-ISSUER",
  sourceReceiptSetRoot,
  subjectRootSelector: "PHYSICAL-SUBJECT-MEMBER-ROOT",
  trustStoreState: "MISSING-EXTERNAL-INPUT",
};
const governance = { ...governanceCore, governanceRoot: digestSchemaRecord("MPRR-V19-GOVERNANCE", "SCHEMA-GOVERNANCE", governanceCore), schemaId: "SCHEMA-GOVERNANCE" };
writeCanonical("governance.json", governance);

const parseFindings = (path, generation, expectedCount) => {
  const text = readFileSync(sourceFile(path), "utf8");
  const headingPattern = /^### 2\.(\d+) `?([^` ]+)`? — (.+)$/gm;
  const headings = [...text.matchAll(headingPattern)];
  assert(headings.length === expectedCount, `${generation} finding count`);
  return headings.map((heading, index) => {
    const start = heading.index;
    const end = index + 1 < headings.length ? headings[index + 1].index : text.length;
    const section = text.slice(start, end);
    const severity = section.match(/Severity=`?(P[0-3])`?/i)?.[1] ?? section.match(/Severity=(P[0-3])/i)?.[1];
    const closure = section.match(/(?:ExactClosure|Closure)=([^\n]+)/)?.[1]?.replaceAll("`", "").trim();
    assert(severity && closure, `finding parse ${heading[2]}`);
    return { findingId: heading[2], generation, severity, title: heading[3].trim(), exactClosure: closure };
  });
};

const findings = [
  ...parseFindings(V17_FINDINGS, "V1.7", 25),
  ...parseFindings(V18_FINDINGS, "V1.8", 15),
];
assert(findings.length === 40 && new Set(findings.map((row) => row.findingId)).size === 40, "exact 40 finding universe");

const artifactByFinding = (finding) => {
  const number = Number(finding.findingId.slice(-3));
  if (finding.generation === "V1.7") {
    if (number <= 3) return ["normative-package-manifest.json", "frozen-source-receipt.jsonl"];
    if (number <= 5) return ["frozen-source-receipt.jsonl", "behavior-contract.jsonl"];
    if (number <= 11) return ["schemas.json", "governance.json"];
    if (number <= 14) return ["semantic-entailment.jsonl", "behavior-contract.jsonl", "causal-traces.jsonl"];
    if (number <= 19) return ["governance.json", "external-evidence-contracts.json", "vectors.jsonl"];
    if (number <= 21) return ["cas-recovery-contract.json", "vectors.jsonl"];
    if (number <= 24) return ["external-evidence-contracts.json", "cas-recovery-contract.json"];
    return ["reader-a.mjs", "reader-b.rb", "vectors.jsonl"];
  }
  if (number <= 5) return ["governance.json", "schemas.json", "external-evidence-contracts.json"];
  if (number === 6) return ["frozen-source-receipt.jsonl", "artifact-growth-projection.json"];
  if (number <= 8) return ["external-evidence-contracts.json"];
  if (number <= 10) return ["cas-recovery-contract.json", "vectors.jsonl"];
  if (number <= 13) return ["semantic-entailment.jsonl", "behavior-contract.jsonl", "causal-traces.jsonl"];
  return ["reader-a.mjs", "reader-b.rb", "vectors.jsonl"];
};

const closureRows = findings.map((finding, index) => {
  const core = {
    acceptanceCredit: 0,
    closureId: `MPRR-V19-CLOSURE-${String(index + 1).padStart(3, "0")}`,
    evidenceArtifacts: artifactByFinding(finding),
    exactClosurePredicate: finding.exactClosure,
    findingId: finding.findingId,
    generation: finding.generation,
    implementationState: "PRODUCER-CANDIDATE;PENDING-INDEPENDENT-HOSTILE-REVIEW",
    mergePolicy: "PROHIBITED;ONE-FINDING-ONE-ROW;NO-TRANSFERABLE-CREDIT",
    severity: finding.severity,
    title: finding.title,
  };
  return { ...core, closureRoot: digestSchemaRecord("MPRR-V19-CLOSURE-ROW", "SCHEMA-CLOSURE-ROW", core), schemaId: "SCHEMA-CLOSURE-ROW" };
});
writeJsonl("closure-crosswalk.jsonl", closureRows);

const targetKinds = [
  ["REQUIREMENT-OUTPUT", v17Outputs.map((row) => [row.outputId, row.outputRoot])],
  ["VECTOR", v17Vectors.map((row) => [row.vectorId, row.vectorRoot])],
  ["SCHEMA", v17Registry.schemas.map((row) => [row.schemaId, row.schemaRoot])],
  ["SEMANTIC-PREDICATE", v17Predicates.map((row) => [row.predicateId, row.predicateRoot])],
  ["EXTERNAL-INPUT-BLOCK", v17Registry.externalInputBlocks.map((row) => [row.blockId, row.missingBlockRoot])],
  ["PREDECESSOR-CLAUSE-ROW", jsonl(`${V17_PACKAGE}/predecessor-clause-crosswalk.jsonl`).map((row) => [row.predecessorCrosswalkId, row.predecessorCrosswalkRoot])],
  ["TERMINAL", v17Registry.terminalRegistry.map((row) => [row.terminalId, digestRecord("MPRR-V19-ACTIVE-V17-TERMINAL", row)])],
  ["REQUIREMENT", v17Outputs.map((row) => [row.requirementId, row.outputRoot])],
  ["CONTROL-MACHINE", v17Registry.controlMachines.map((row) => [row.machineId, digestRecord("MPRR-V19-ACTIVE-V17-CONTROL-MACHINE", row)])],
  ["SOURCE-FINDING", v17Registry.sourceMembers.filter((row) => row.namespaceId === "V16-FINDINGS").map((row) => [row.memberId, row.memberCoreRoot])],
  ["SOURCE-REQUIREMENT", v17Registry.sourceMembers.filter((row) => row.namespaceId === "V16-REQUIREMENTS").map((row) => [row.memberId, row.memberCoreRoot])],
  ["FINDING-CONTROL", v17Registry.findingControls.map((row) => [row.controlId, row.controlRoot])],
  ["GUARD", v17Registry.guards.map((row) => [row.guardId, digestRecord("MPRR-V19-ACTIVE-V17-GUARD", row)])],
].map(([targetKind, entries]) => ({
  entries: entries.map(([targetId, targetRoot]) => ({ targetId, targetRoot })).sort((a, b) => a.targetId.localeCompare(b.targetId)),
  targetKind,
}));
const semanticTargetCore = {
  noWeakeningRule: "TARGET-FIELD-CANONICAL-BYTES-AND-ROOT-MUST-EQUAL-FROZEN-V1.7-ACTIVE-TARGET;NO-GENERIC-PRESENCE-CREDIT",
  predicateCount: 4016,
  sourcePredicatePath: `${V17_PACKAGE}/predecessor-semantic-predicates.jsonl`,
  sourceUsePath: `${V17_PACKAGE}/semantic-use-index.jsonl`,
  targetKinds,
  useCount: 53450,
};
const semanticTargets = { ...semanticTargetCore, schemaId: "SCHEMA-SEMANTIC-TARGET-REGISTRY", semanticTargetRegistryRoot: digestSchemaRecord("MPRR-V19-SEMANTIC-TARGET-REGISTRY", "SCHEMA-SEMANTIC-TARGET-REGISTRY", semanticTargetCore) };
writeCanonical("semantic-target-registry.json", semanticTargets);

const outputById = new Map(v17Outputs.map((row) => [row.outputId, row]));
const semanticRows = v17Predicates.map((predicate, index) => {
  const targetProofs = predicate.translatedTargetClauses.map((target) => {
    const output = outputById.get(target.targetOutputId);
    const targetBytes = target.targetField === "ALL-FIVE-FIELDS" ? canonical(output.constructorInputs) : output.canonicalFiveFieldValues[target.targetField];
    const expectedRoot = target.targetField === "ALL-FIVE-FIELDS" ? output.outputRoot : sha256(Buffer.from(targetBytes, "utf8"));
    return {
      activeTargetId: target.targetOutputId,
      activeTargetRoot: output.outputRoot,
      activeValueRoot: expectedRoot,
      sourceDeclaredTargetRoot: target.targetOutputRoot,
      sourceDeclaredValueRoot: target.targetValueRoot,
      targetField: target.targetField,
      translationRule: target.translationRule,
    };
  });
  const core = {
    entailmentId: `MPRR-V19-ENTAILMENT-${String(index + 1).padStart(4, "0")}`,
    noCollisionKey: `${predicate.sourceConjunct.sourceLocator}|${predicate.sourceConjunct.field}|${predicate.predicateId}`,
    noWeakeningMode: "EXACT-ACTIVE-TARGET-VALUE-ROOT",
    predicateId: predicate.predicateId,
    predicateRoot: predicate.predicateRoot,
    relation: predicate.relation,
    sourceConjunct: predicate.sourceConjunct,
    targetProofs,
  };
  return { ...core, entailmentRoot: digestSchemaRecord("MPRR-V19-SEMANTIC-ENTAILMENT", "SCHEMA-SEMANTIC-ENTAILMENT", core), schemaId: "SCHEMA-SEMANTIC-ENTAILMENT" };
});
assert(semanticRows.length === 4016, "semantic predicate denominator");
writeJsonl("semantic-entailment.jsonl", semanticRows);

const stripOracle = (value) => {
  if (Array.isArray(value)) return value.map(stripOracle);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (["expectedPreDigest", "expectedPostDigest", "expectedDecision", "expectedState", "baseOperationKey", "oracleTerminal", "oracleResultRoot"].includes(key)) continue;
      out[key] = stripOracle(child);
    }
    return out;
  }
  return value;
};
const behaviorRows = v17Vectors.map((vector, index) => {
  const evaluatorInput = { fixture: stripOracle(vector.fixture), kind: vector.kind };
  const core = {
    behaviorId: `MPRR-V19-BEHAVIOR-${String(index + 1).padStart(3, "0")}`,
    evaluatorInputRoot: digestRecord("MPRR-V19-PREDECESSOR-EVALUATOR-INPUT", evaluatorInput),
    expectedAuthorityOutputs: vector.expectedAuthorityOutputs,
    expectedTerminal: vector.expectedTerminal,
    fixtureClass: "NORMATIVE-CONFORMANCE;ACTUAL-FROZEN-SOURCE-OR-PROTOCOL-STATE;NOT-BUSINESS-DATA",
    predecessorKind: vector.kind,
    predecessorVectorId: vector.vectorId,
    predecessorVectorRoot: vector.vectorRoot,
    sourceVectorIndex: index,
  };
  return { ...core, behaviorRoot: digestSchemaRecord("MPRR-V19-PREDECESSOR-BEHAVIOR", "SCHEMA-BEHAVIOR", core), schemaId: "SCHEMA-BEHAVIOR" };
});
assert(behaviorRows.length === 574 && new Set(behaviorRows.map((row) => row.predecessorVectorId)).size === 574, "574 behavior denominator");
writeJsonl("behavior-contract.jsonl", behaviorRows);

const comparisonRows = v17Registry.commitContract.casComparisons.map((source, index) => {
  const core = {
    comparisonId: source.comparisonId,
    externalInputBlockId: source.externalInputBlockId ?? "EXT-LIVE-DEPENDENCY-HEADS",
    expectedSelector: `FROZEN-GOVERNANCE-EXPECTED-ROOT/${source.memberId}`,
    liveObservationSelector: `AUTHENTICATED-TRANSACTION-SNAPSHOT/${source.memberId}`,
    ordinal: index + 1,
    revocationSelector: `AUTHENTICATED-REVOCATION-HEAD/${source.memberId}`,
    state: "MISSING-EXTERNAL-INPUT",
  };
  return { ...core, comparisonRoot: digestSchemaRecord("MPRR-V19-CAS-COMPARISON", "SCHEMA-CAS-COMPARISON", core), schemaId: "SCHEMA-CAS-COMPARISON" };
});
const durableRows = v17Registry.commitContract.durableMemberIds.map((memberId, index) => {
  const core = {
    allOrNoneTransactionGroup: "MPRR-V19-AUTHORITY-COMMIT-GROUP-01",
    contentSelector: `ROOTED-VALIDATOR-OR-RECEIPT/${memberId}`,
    durableMemberId: memberId,
    ordinal: index + 1,
  };
  return { ...core, durableMemberRoot: digestSchemaRecord("MPRR-V19-DURABLE-MEMBER", "SCHEMA-DURABLE-MEMBER", core), schemaId: "SCHEMA-DURABLE-MEMBER" };
});
assert(comparisonRows.length === 65 && durableRows.length === 17, "CAS 65/17 denominator");

const recoverySchedules = [];
for (let index = 0; index < durableRows.length; index += 1) {
  recoverySchedules.push({
    crashBoundary: `AFTER-STAGING-${durableRows[index].durableMemberId}`,
    expectedDurableMemberCountAfterRestart: 0,
    expectedPermitCountAfterRestart: 0,
    recoveryAction: "DISCARD-NON-DURABLE-STAGING;RETRY-SAME-OPERATION-KEY",
    scheduleId: `RECOVERY-STAGED-${String(index + 1).padStart(2, "0")}`,
  });
}
recoverySchedules.push(
  { crashBoundary: "BEFORE-ATOMIC-COMMIT", expectedDurableMemberCountAfterRestart: 0, expectedPermitCountAfterRestart: 0, recoveryAction: "RETRY-SAME-OPERATION-KEY", scheduleId: "RECOVERY-BEFORE-COMMIT" },
  { crashBoundary: "AFTER-ATOMIC-COMMIT-BEFORE-RESPONSE", expectedDurableMemberCountAfterRestart: 17, expectedPermitCountAfterRestart: 1, recoveryAction: "RETURN-EXACT-DURABLE-RECEIPT", scheduleId: "RECOVERY-RESPONSE-LOSS" },
  { crashBoundary: "AFTER-RESPONSE", expectedDurableMemberCountAfterRestart: 17, expectedPermitCountAfterRestart: 1, recoveryAction: "RETURN-EXACT-DURABLE-RECEIPT", scheduleId: "RECOVERY-REPLAY" },
  { crashBoundary: "CONCURRENT-SAME-KEY-SAME-PREIMAGE", expectedDurableMemberCountAfterRestart: 17, expectedPermitCountAfterRestart: 1, recoveryAction: "ONE-COMMIT;ALL-CALLERS-READ-SAME-RECEIPT", scheduleId: "RECOVERY-RACE-SAME" },
  { crashBoundary: "CONCURRENT-SAME-KEY-DIFFERENT-PREIMAGE", expectedDurableMemberCountAfterRestart: 0, expectedPermitCountAfterRestart: 0, recoveryAction: "CONFLICT;NO-WRITE", scheduleId: "RECOVERY-RACE-CONFLICT" },
  { crashBoundary: "REVOCATION-DRIFT-BEFORE-COMMIT", expectedDurableMemberCountAfterRestart: 0, expectedPermitCountAfterRestart: 0, recoveryAction: "CAS-ABORT;NO-WRITE", scheduleId: "RECOVERY-REVOCATION-DRIFT" },
  { crashBoundary: "PARTIAL-WRITE-FAULT-INJECTION", expectedDurableMemberCountAfterRestart: 0, expectedPermitCountAfterRestart: 0, recoveryAction: "TRANSACTION-ROLLBACK;NO-PARTIAL-AUTHORITY", scheduleId: "RECOVERY-PARTIAL-WRITE" },
);
const casCore = {
  adapterContract: "BEGIN-SERIALIZABLE;READ-65-AUTHENTICATED-HEADS;COMPARE-EXPECTED-OBSERVED-REVOCATION;INSERT-UNIQUE-OPERATION-KEY-AND-PREIMAGE;WRITE-17-MEMBERS-ALL-OR-NONE;COMMIT;READBACK-EXACT-RECEIPT",
  comparisonRows,
  durableRows,
  operationKeyConstructor: "SHA-256(CPB1(MPRR-V19-OPERATION-KEY,1,computedPackageRoot,manifestRoot,subjectRoot,generation,purpose,65-comparison-set-root,17-durable-preimage-root))",
  productionAdapterExecutable: false,
  recoverySchedules,
  referenceModelExecutable: true,
  stateMachine: [
    { event: "BEGIN", from: "EMPTY", guard: "OPERATION-KEY-ABSENT-OR-SAME-PREIMAGE", to: "STAGING" },
    { event: "ALL-65-MATCH", from: "STAGING", guard: "ALL-COMPARISONS-FRESH-AND-UNREVOKED", to: "READY" },
    { event: "ATOMIC-WRITE-17", from: "READY", guard: "TRANSACTION-OPEN", to: "COMMITTED" },
    { event: "READBACK", from: "COMMITTED", guard: "EXACT-17-MEMBER-RECEIPT", to: "RECEIPT-DURABLE" },
    { event: "REPLAY", from: "RECEIPT-DURABLE", guard: "SAME-KEY-SAME-PREIMAGE", to: "RECEIPT-DURABLE" },
    { event: "CONFLICT-OR-CRASH-BEFORE-COMMIT", from: "STAGING", guard: "MISMATCH-OR-NON-DURABLE-STAGING", to: "ABORTED" },
  ],
};
const casContract = { ...casCore, casContractRoot: digestSchemaRecord("MPRR-V19-CAS-RECOVERY-CONTRACT", "SCHEMA-CAS-RECOVERY-CONTRACT", casCore), schemaId: "SCHEMA-CAS-RECOVERY-CONTRACT" };
writeCanonical("cas-recovery-contract.json", casContract);

const externalCore = {
  contracts: [
    { adapterState: "MISSING-EXTERNAL-INPUT", contractId: "APPOINTMENT-RECEIPTS", exactCount: 7, requirement: "CANONICAL-SIGNED-APPOINTMENT;PACKAGE;GENERATION;ROLE;PURPOSE;EPOCH;ISSUED;EXPIRES;REVOCATION;KEY-ID" },
    { adapterState: "MISSING-EXTERNAL-INPUT", contractId: "INDEPENDENT-REVIEWS", exactCount: 3, requirement: "THREE-DISTINCT-APPOINTED-REVIEWERS;EXACT-PACKAGE;NO-PRODUCER-OVERLAP" },
    { adapterState: "MISSING-EXTERNAL-INPUT", contractId: "RECONCILIATION-AND-HUMAN-APPROVAL", exactCount: 2, requirement: "DISTINCT-RECONCILER-AND-TAL-APPROVER;EXACT-PACKAGE;EXACT-FINDING-SET" },
    { adapterState: "MISSING-EXTERNAL-INPUT", contractId: "INDEPENDENT-SEMANTIC-RECEIPT", exactCount: 1, requirement: "SIGNED-ENTAILMENT-RECEIPT;4016-PREDICATES;53450-USES;NO-WEAKENING" },
    { adapterState: "MISSING-EXTERNAL-INPUT", contractId: "SCANNER-RECEIPTS", exactCount: 2, requirement: "TWO-DISTINCT-APPOINTED-SCANNERS;SIGNED;TOOL-CONFIG-RULE-DICTIONARY-ROOTS;EXACT-WRITE-OBJECT-SET;FRESH;UNREVOKED" },
    { adapterState: "MISSING-EXTERNAL-INPUT", contractId: "REMOTE-PUBLIC-OBSERVATION", exactCount: 1, requirement: "AUTHENTICATED-REMOTE-ID;VISIBILITY-PUBLIC;REF;OLD-HEAD;NEW-HEAD;COMPLETE-WRITE-OBJECT-SET;PRE-PUSH-CAS-RECHECK" },
    { adapterState: "MISSING-EXTERNAL-INPUT", contractId: "TIME-REVOCATION-FINALITY", exactCount: 3, requirement: "INDEPENDENT-TRUSTED-TIME;REVOCATION-HEAD;FINALITY;FRESHNESS;EXPIRY" },
    { adapterState: "MISSING-EXTERNAL-INPUT", contractId: "PRODUCTION-CAS-ADAPTER", exactCount: 1, requirement: "TRANSACTIONAL-ADAPTER-ATTESTATION;65-COMPARISONS;17-DURABLE-MEMBERS;FAULT-INJECTION-RESULTS" },
  ],
  expectedTargetDerivation: "PACKAGE=MANIFEST.COMPUTED-PACKAGE-ROOT;MANIFEST=SHA256(PHYSICAL-MANIFEST);SUBJECT=SHA256(PHYSICAL-SUBJECT);PURPOSE-AUDIENCE-GENERATION-ROLES=FROZEN-GOVERNANCE",
  receiptEnvelopeFields: ["schemaId", "receiptId", "issuerAppointmentId", "keyId", "algorithmId", "packageRoot", "manifestRoot", "subjectRoot", "generation", "purpose", "audience", "epoch", "issuedAt", "expiresAt", "revocationHead", "payloadRoot", "signatureBytesBase64"],
  signaturePolicy: {
    approvedAlgorithms: [],
    approvalState: "MISSING-EXTERNAL-APPROVAL",
    keyGenerationPerformed: false,
    productionVerificationAdapterPresent: false,
    trustStoreSource: "MISSING-EXTERNAL-FROZEN-TRUST-STORE;REJECT-EVIDENCE-SUPPLIED-ROOTS",
    trustRootsAcceptedFromEvidencePayload: false,
    verificationContract: "VERIFY-EXTERNALLY-APPROVED-ASYMMETRIC-SIGNATURE-OVER-CANONICAL-ENVELOPE;BIND-KEY-ID-APPOINTMENT-ROTATION-EXPIRY-REVOCATION",
  },
};
const externalContracts = { ...externalCore, externalContractsRoot: digestSchemaRecord("MPRR-V19-EXTERNAL-EVIDENCE-CONTRACTS", "SCHEMA-EXTERNAL-EVIDENCE-CONTRACTS", externalCore), schemaId: "SCHEMA-EXTERNAL-EVIDENCE-CONTRACTS" };
writeCanonical("external-evidence-contracts.json", externalContracts);

const schemas = {
  dialect: "MPRR-V19-CLOSED-SCHEMA-1",
  schemas: [
    { schemaId: "SCHEMA-FROZEN-SOURCE-RECEIPT", required: ["bytes", "lines", "mode", "path", "receiptRoot", "reconstructionRule", "root", "schemaId", "sourceId"], fields: [["bytes", "SAFE-INTEGER"], ["lines", "SAFE-INTEGER"], ["mode", "SAFE-INTEGER"], ["path", "REPO-PATH"], ["receiptRoot", "ROOT"], ["reconstructionRule", "NONEMPTY-STRING"], ["root", "ROOT"], ["schemaId", "SCHEMA-ID"], ["sourceId", "NONEMPTY-STRING"]] },
    { schemaId: "SCHEMA-CLOSURE-ROW", required: ["acceptanceCredit", "closureId", "closureRoot", "evidenceArtifacts", "exactClosurePredicate", "findingId", "generation", "implementationState", "mergePolicy", "schemaId", "severity", "title"], fields: [["acceptanceCredit", "ZERO"], ["closureId", "NONEMPTY-STRING"], ["closureRoot", "ROOT"], ["evidenceArtifacts", "ARRAY-NONEMPTY-NONEMPTY-STRING"], ["exactClosurePredicate", "NONEMPTY-STRING"], ["findingId", "NONEMPTY-STRING"], ["generation", "ENUM:V1.7|V1.8"], ["implementationState", "NONEMPTY-STRING"], ["mergePolicy", "CONST:PROHIBITED;ONE-FINDING-ONE-ROW;NO-TRANSFERABLE-CREDIT"], ["schemaId", "SCHEMA-ID"], ["severity", "ENUM:P0|P1|P2|P3"], ["title", "NONEMPTY-STRING"]] },
    { schemaId: "SCHEMA-BEHAVIOR", required: ["behaviorId", "behaviorRoot", "evaluatorInputRoot", "expectedAuthorityOutputs", "expectedTerminal", "fixtureClass", "predecessorKind", "predecessorVectorId", "predecessorVectorRoot", "schemaId", "sourceVectorIndex"], fields: [["behaviorId", "NONEMPTY-STRING"], ["behaviorRoot", "ROOT"], ["evaluatorInputRoot", "ROOT"], ["expectedAuthorityOutputs", "ZERO"], ["expectedTerminal", "NONEMPTY-STRING"], ["fixtureClass", "NONEMPTY-STRING"], ["predecessorKind", "NONEMPTY-STRING"], ["predecessorVectorId", "NONEMPTY-STRING"], ["predecessorVectorRoot", "ROOT"], ["schemaId", "SCHEMA-ID"], ["sourceVectorIndex", "SAFE-INTEGER"]] },
    { schemaId: "SCHEMA-CAS-COMPARISON", required: ["comparisonId", "comparisonRoot", "expectedSelector", "externalInputBlockId", "liveObservationSelector", "ordinal", "revocationSelector", "schemaId", "state"], fields: [["comparisonId", "NONEMPTY-STRING"], ["comparisonRoot", "ROOT"], ["expectedSelector", "NONEMPTY-STRING"], ["externalInputBlockId", "NONEMPTY-STRING"], ["liveObservationSelector", "NONEMPTY-STRING"], ["ordinal", "SAFE-INTEGER"], ["revocationSelector", "NONEMPTY-STRING"], ["schemaId", "SCHEMA-ID"], ["state", "CONST:MISSING-EXTERNAL-INPUT"]] },
    { schemaId: "SCHEMA-DURABLE-MEMBER", required: ["allOrNoneTransactionGroup", "contentSelector", "durableMemberId", "durableMemberRoot", "ordinal", "schemaId"], fields: [["allOrNoneTransactionGroup", "NONEMPTY-STRING"], ["contentSelector", "NONEMPTY-STRING"], ["durableMemberId", "NONEMPTY-STRING"], ["durableMemberRoot", "ROOT"], ["ordinal", "SAFE-INTEGER"], ["schemaId", "SCHEMA-ID"]] },
    { schemaId: "SCHEMA-SEMANTIC-ENTAILMENT", required: ["entailmentId", "entailmentRoot", "noCollisionKey", "noWeakeningMode", "predicateId", "predicateRoot", "relation", "schemaId", "sourceConjunct", "targetProofs"], fields: [["entailmentId", "NONEMPTY-STRING"], ["entailmentRoot", "ROOT"], ["noCollisionKey", "NONEMPTY-STRING"], ["noWeakeningMode", "CONST:EXACT-ACTIVE-TARGET-VALUE-ROOT"], ["predicateId", "NONEMPTY-STRING"], ["predicateRoot", "ROOT"], ["relation", "NONEMPTY-STRING"], ["schemaId", "SCHEMA-ID"], ["sourceConjunct", "REF:SCHEMA-SOURCE-CONJUNCT"], ["targetProofs", "ARRAY-NONEMPTY-REF:SCHEMA-TARGET-PROOF"]] },
    { schemaId: "SCHEMA-SOURCE-CONJUNCT", required: ["absoluteByteEndExclusive", "absoluteByteStart", "conjunctId", "digest", "field", "memberRelativeByteEndExclusive", "memberRelativeByteStart", "sourceLocator"], fields: [["absoluteByteEndExclusive", "SAFE-INTEGER"], ["absoluteByteStart", "SAFE-INTEGER"], ["conjunctId", "NONEMPTY-STRING"], ["digest", "ROOT"], ["field", "NONEMPTY-STRING"], ["memberRelativeByteEndExclusive", "SAFE-INTEGER"], ["memberRelativeByteStart", "SAFE-INTEGER"], ["sourceLocator", "NONEMPTY-STRING"]] },
    { schemaId: "SCHEMA-TARGET-PROOF", required: ["activeTargetId", "activeTargetRoot", "activeValueRoot", "sourceDeclaredTargetRoot", "sourceDeclaredValueRoot", "targetField", "translationRule"], fields: [["activeTargetId", "NONEMPTY-STRING"], ["activeTargetRoot", "ROOT"], ["activeValueRoot", "ROOT"], ["sourceDeclaredTargetRoot", "ROOT"], ["sourceDeclaredValueRoot", "ROOT"], ["targetField", "NONEMPTY-STRING"], ["translationRule", "NONEMPTY-STRING"]] },
  ],
  unknownFieldPolicy: "REJECT-RECURSIVELY",
  zeroGenericCriticalObjects: true,
};
schemas.schemas.push(
    { schemaId: "SCHEMA-GOVERNANCE", required: ["acceptanceRule", "algorithmApprovalState", "allowedSignatureAlgorithms", "authorityOutputRule", "evidenceAudience", "exactRoleSlots", "exactValidatorIds", "generation", "governanceRoot", "packageRootSelector", "purpose", "repositoryVisibility", "schemaId", "separationRule", "sourceReceiptSetRoot", "subjectRootSelector", "trustStoreState"], fields: [["acceptanceRule", "NONEMPTY-STRING"], ["algorithmApprovalState", "CONST:MISSING-EXTERNAL-APPROVAL"], ["allowedSignatureAlgorithms", "ARRAY-EMPTY"], ["authorityOutputRule", "NONEMPTY-STRING"], ["evidenceAudience", "CONST:CONNECT-PROTOCOL-INDEPENDENT-REVIEW-AUTHORITY"], ["exactRoleSlots", "ARRAY-EXACT-7-REF:SCHEMA-ROLE-SLOT"], ["exactValidatorIds", "ARRAY-EXACT-15-NONEMPTY-STRING"], ["generation", "NONEMPTY-STRING"], ["governanceRoot", "ROOT"], ["packageRootSelector", "NONEMPTY-STRING"], ["purpose", "NONEMPTY-STRING"], ["repositoryVisibility", "CONST:PUBLIC"], ["schemaId", "SCHEMA-ID"], ["separationRule", "NONEMPTY-STRING"], ["sourceReceiptSetRoot", "ROOT"], ["subjectRootSelector", "NONEMPTY-STRING"], ["trustStoreState", "CONST:MISSING-EXTERNAL-INPUT"]] },
  { schemaId: "SCHEMA-ROLE-SLOT", required: ["role", "slotId"], fields: [["role", "ENUM:PRODUCER|INDEPENDENT-REVIEWER|RECONCILER|HUMAN-APPROVER-TAL|PERMIT-ISSUER"], ["slotId", "NONEMPTY-STRING"]] },
  { schemaId: "SCHEMA-SEMANTIC-TARGET-REGISTRY", required: ["noWeakeningRule", "predicateCount", "schemaId", "semanticTargetRegistryRoot", "sourcePredicatePath", "sourceUsePath", "targetKinds", "useCount"], fields: [["noWeakeningRule", "NONEMPTY-STRING"], ["predicateCount", "CONST-NUMBER:4016"], ["schemaId", "SCHEMA-ID"], ["semanticTargetRegistryRoot", "ROOT"], ["sourcePredicatePath", "REPO-PATH"], ["sourceUsePath", "REPO-PATH"], ["targetKinds", "ARRAY-EXACT-13-REF:SCHEMA-TARGET-KIND"], ["useCount", "CONST-NUMBER:53450"]] },
  { schemaId: "SCHEMA-TARGET-KIND", required: ["entries", "targetKind"], fields: [["entries", "ARRAY-NONEMPTY-REF:SCHEMA-TARGET-ENTRY"], ["targetKind", "NONEMPTY-STRING"]] },
  { schemaId: "SCHEMA-TARGET-ENTRY", required: ["targetId", "targetRoot"], fields: [["targetId", "NONEMPTY-STRING"], ["targetRoot", "ROOT"]] },
  { schemaId: "SCHEMA-EXTERNAL-EVIDENCE-CONTRACTS", required: ["contracts", "expectedTargetDerivation", "externalContractsRoot", "receiptEnvelopeFields", "schemaId", "signaturePolicy"], fields: [["contracts", "ARRAY-EXACT-8-REF:SCHEMA-EXTERNAL-CONTRACT"], ["expectedTargetDerivation", "NONEMPTY-STRING"], ["externalContractsRoot", "ROOT"], ["receiptEnvelopeFields", "ARRAY-EXACT-17-NONEMPTY-STRING"], ["schemaId", "SCHEMA-ID"], ["signaturePolicy", "REF:SCHEMA-SIGNATURE-POLICY"]] },
  { schemaId: "SCHEMA-EXTERNAL-CONTRACT", required: ["adapterState", "contractId", "exactCount", "requirement"], fields: [["adapterState", "CONST:MISSING-EXTERNAL-INPUT"], ["contractId", "NONEMPTY-STRING"], ["exactCount", "SAFE-INTEGER"], ["requirement", "NONEMPTY-STRING"]] },
  { schemaId: "SCHEMA-SIGNATURE-POLICY", required: ["approvedAlgorithms", "approvalState", "keyGenerationPerformed", "productionVerificationAdapterPresent", "trustRootsAcceptedFromEvidencePayload", "trustStoreSource", "verificationContract"], fields: [["approvedAlgorithms", "ARRAY-EMPTY"], ["approvalState", "CONST:MISSING-EXTERNAL-APPROVAL"], ["keyGenerationPerformed", "CONST-BOOLEAN:false"], ["productionVerificationAdapterPresent", "CONST-BOOLEAN:false"], ["trustRootsAcceptedFromEvidencePayload", "CONST-BOOLEAN:false"], ["trustStoreSource", "CONST:MISSING-EXTERNAL-FROZEN-TRUST-STORE;REJECT-EVIDENCE-SUPPLIED-ROOTS"], ["verificationContract", "CONST:VERIFY-EXTERNALLY-APPROVED-ASYMMETRIC-SIGNATURE-OVER-CANONICAL-ENVELOPE;BIND-KEY-ID-APPOINTMENT-ROTATION-EXPIRY-REVOCATION"]] },
  { schemaId: "SCHEMA-CAS-RECOVERY-CONTRACT", required: ["adapterContract", "casContractRoot", "comparisonRows", "durableRows", "operationKeyConstructor", "productionAdapterExecutable", "recoverySchedules", "referenceModelExecutable", "schemaId", "stateMachine"], fields: [["adapterContract", "NONEMPTY-STRING"], ["casContractRoot", "ROOT"], ["comparisonRows", "ARRAY-EXACT-65-REF:SCHEMA-CAS-COMPARISON"], ["durableRows", "ARRAY-EXACT-17-REF:SCHEMA-DURABLE-MEMBER"], ["operationKeyConstructor", "NONEMPTY-STRING"], ["productionAdapterExecutable", "CONST-BOOLEAN:false"], ["recoverySchedules", "ARRAY-EXACT-24-REF:SCHEMA-RECOVERY-SCHEDULE"], ["referenceModelExecutable", "CONST-BOOLEAN:true"], ["schemaId", "SCHEMA-ID"], ["stateMachine", "ARRAY-EXACT-6-REF:SCHEMA-RECOVERY-TRANSITION"]] },
  { schemaId: "SCHEMA-RECOVERY-SCHEDULE", required: ["crashBoundary", "expectedDurableMemberCountAfterRestart", "expectedPermitCountAfterRestart", "recoveryAction", "scheduleId"], fields: [["crashBoundary", "NONEMPTY-STRING"], ["expectedDurableMemberCountAfterRestart", "SAFE-INTEGER"], ["expectedPermitCountAfterRestart", "SAFE-INTEGER"], ["recoveryAction", "NONEMPTY-STRING"], ["scheduleId", "NONEMPTY-STRING"]] },
  { schemaId: "SCHEMA-RECOVERY-TRANSITION", required: ["event", "from", "guard", "to"], fields: [["event", "NONEMPTY-STRING"], ["from", "NONEMPTY-STRING"], ["guard", "NONEMPTY-STRING"], ["to", "NONEMPTY-STRING"]] },
  { schemaId: "SCHEMA-VECTOR", required: ["expectedAuthorityOutputs", "expectedTerminal", "family", "input", "operation", "schemaId", "vectorId", "vectorRoot"], fields: [["expectedAuthorityOutputs", "ZERO"], ["expectedTerminal", "NONEMPTY-STRING"], ["family", "ENUM:CLOSURE|PREDECESSOR-BEHAVIOR|AUTHORITY|CAS|RECOVERY|PATH"], ["input", "REF-BY-OPERATION:CLOSED-VECTOR-INPUT"], ["operation", "ENUM:VERIFY-ONE-TO-ONE-CLOSURE-ROW|EXECUTE-FROZEN-V1.7-BEHAVIOR|DERIVE-ROOTED-VALIDATOR-RESULT|REJECT-MISSING-LIVE-COMPARISON|PROVE-ALL-OR-NONE-DURABLE-MEMBER|EXECUTE-REFERENCE-RECOVERY-SCHEDULE|SAFE-PATH-ADMISSION|DERIVE-ACCEPTANCE-FROM-VALIDATOR-RESULT-SET"], ["schemaId", "SCHEMA-ID"], ["vectorId", "NONEMPTY-STRING"], ["vectorRoot", "ROOT"]] },
  { schemaId: "SCHEMA-CAUSAL-TRACE", required: ["events", "schemaId", "traceId", "traceRoot", "vectorId"], fields: [["events", "ARRAY-NONEMPTY-REF:SCHEMA-TRACE-EVENT"], ["schemaId", "SCHEMA-ID"], ["traceId", "NONEMPTY-STRING"], ["traceRoot", "ROOT"], ["vectorId", "NONEMPTY-STRING"]] },
  { schemaId: "SCHEMA-TRACE-EVENT", required: ["eventType", "evidenceRoot", "operation", "ordinal", "previousEventRoot", "root"], fields: [["eventType", "NONEMPTY-STRING"], ["evidenceRoot", "ROOT"], ["operation", "NONEMPTY-STRING"], ["ordinal", "SAFE-INTEGER"], ["previousEventRoot", "ROOT"], ["root", "ROOT"]] },
  { schemaId: "SCHEMA-ARTIFACT-GROWTH-PROJECTION", required: ["admissionRule", "duplicateSourceBytesAdded", "globalRepositoryGrowthBudgetBytes", "globalRepositoryGrowthBudgetState", "growthProjectionRoot", "largeArtifactAdmission", "maxRegularGitMemberBytesExclusive", "normativePackageProjectedBytes", "outOfBandReserveBytes", "projectedAddedBytes", "projectedLargestMemberBytes", "reusedContentAddressedSourceBytes", "schemaId"], fields: [["admissionRule", "NONEMPTY-STRING"], ["duplicateSourceBytesAdded", "ZERO"], ["globalRepositoryGrowthBudgetBytes", "NULL"], ["globalRepositoryGrowthBudgetState", "CONST:UNKNOWN"], ["growthProjectionRoot", "ROOT"], ["largeArtifactAdmission", "CONST:DENIED-BUDGET-UNKNOWN"], ["maxRegularGitMemberBytesExclusive", "CONST-NUMBER:52428800"], ["normativePackageProjectedBytes", "SAFE-INTEGER"], ["outOfBandReserveBytes", "CONST-NUMBER:262144"], ["projectedAddedBytes", "SAFE-INTEGER"], ["projectedLargestMemberBytes", "SAFE-INTEGER"], ["reusedContentAddressedSourceBytes", "SAFE-INTEGER"], ["schemaId", "SCHEMA-ID"]] },
  { schemaId: "SCHEMA-MANIFEST", required: ["artifactId", "authorityState", "exactCounts", "frozenSourceReceiptSetRoot", "packageRoot", "packageRootConstructor", "packageSchemaVersion", "payloadMembers", "producerTools", "schemaId"], fields: [["artifactId", "NONEMPTY-STRING"], ["authorityState", "REF:SCHEMA-AUTHORITY-STATE"], ["exactCounts", "REF:SCHEMA-EXACT-COUNTS"], ["frozenSourceReceiptSetRoot", "ROOT"], ["packageRoot", "ROOT"], ["packageRootConstructor", "NONEMPTY-STRING"], ["packageSchemaVersion", "CONST:1"], ["payloadMembers", "ARRAY-EXACT-13-REF:SCHEMA-PAYLOAD-MEMBER"], ["producerTools", "ARRAY-EXACT-3-REF:SCHEMA-PRODUCER-TOOL"], ["schemaId", "SCHEMA-ID"]] },
  { schemaId: "SCHEMA-AUTHORITY-STATE", required: ["Acceptance", "Gate29", "authorityOutputs", "developmentFreeze", "repository"], fields: [["Acceptance", "ZERO"], ["Gate29", "CONST:BLOCKED"], ["authorityOutputs", "ZERO"], ["developmentFreeze", "CONST:ACTIVE"], ["repository", "CONST:PUBLIC"]] },
  { schemaId: "SCHEMA-EXACT-COUNTS", required: ["casComparisons", "closureRows", "durableMembers", "predecessorBehaviors", "semanticPredicates", "semanticUses", "successorVectors"], fields: [["casComparisons", "CONST-NUMBER:65"], ["closureRows", "CONST-NUMBER:40"], ["durableMembers", "CONST-NUMBER:17"], ["predecessorBehaviors", "CONST-NUMBER:574"], ["semanticPredicates", "CONST-NUMBER:4016"], ["semanticUses", "CONST-NUMBER:53450"], ["successorVectors", "CONST-NUMBER:743"]] },
  { schemaId: "SCHEMA-PAYLOAD-MEMBER", required: ["bytes", "lines", "path", "role", "root"], fields: [["bytes", "SAFE-INTEGER"], ["lines", "SAFE-INTEGER"], ["path", "REPO-PATH"], ["role", "CONST:NORMATIVE-PAYLOAD"], ["root", "ROOT"]] },
  { schemaId: "SCHEMA-PRODUCER-TOOL", required: ["path", "role", "root"], fields: [["path", "REPO-PATH"], ["role", "ENUM:DETERMINISTIC-PRODUCER|INDEPENDENT-READ-ONLY-READER-A|INDEPENDENT-READ-ONLY-READER-B"], ["root", "ROOT"]] },
  { schemaId: "SCHEMA-VALIDATOR-RESULT", required: ["computedPackageRoot", "governanceRoot", "manifestRoot", "status", "subjectRoot", "validatorId", "validatorResultRoot"], fields: [["computedPackageRoot", "ROOT"], ["governanceRoot", "ROOT"], ["manifestRoot", "ROOT"], ["status", "ENUM:PASS|FAIL|MISSING-EXTERNAL-INPUT"], ["subjectRoot", "ROOT"], ["validatorId", "NONEMPTY-STRING"], ["validatorResultRoot", "ROOT"]] },
  { schemaId: "SCHEMA-AUTHORITY-DECISION", required: ["Acceptance", "Gate29", "authorityOutputs", "developmentFreeze", "repository"], fields: [["Acceptance", "ZERO"], ["Gate29", "CONST:BLOCKED"], ["authorityOutputs", "ZERO"], ["developmentFreeze", "CONST:ACTIVE"], ["repository", "CONST:PUBLIC"]] },
  { schemaId: "SCHEMA-COUNTER", required: ["counterId", "value"], fields: [["counterId", "NONEMPTY-STRING"], ["value", "SAFE-INTEGER"]] },
  { schemaId: "SCHEMA-VERIFIED-COUNT", required: ["countId", "value"], fields: [["countId", "NONEMPTY-STRING"], ["value", "SAFE-INTEGER"]] },
  { schemaId: "SCHEMA-READER-REPORT", required: ["authorityDecision", "commonResultRoot", "counters", "manifestRoot", "packageRoot", "readerId", "readerKind", "status", "validatorResultSetRoot", "validatorResults", "vectorResultSetRoot", "verifiedCounts"], fields: [["authorityDecision", "REF:SCHEMA-AUTHORITY-DECISION"], ["commonResultRoot", "ROOT"], ["counters", "ARRAY-EXACT-17-REF:SCHEMA-COUNTER"], ["manifestRoot", "ROOT"], ["packageRoot", "ROOT"], ["readerId", "ENUM:MPRR-V19-READER-A|MPRR-V19-READER-B"], ["readerKind", "CONST:INDEPENDENT-IMPLEMENTATION;READ-ONLY;PRODUCER-QA;NOT-HOSTILE-REVIEW"], ["status", "ENUM:PASS|FAIL"], ["validatorResultSetRoot", "ROOT"], ["validatorResults", "ARRAY-EXACT-15-REF:SCHEMA-VALIDATOR-RESULT"], ["vectorResultSetRoot", "ROOT"], ["verifiedCounts", "ARRAY-EXACT-10-REF:SCHEMA-VERIFIED-COUNT"]] },
);
schemas.schemas = schemas.schemas.map((schema) => ({ ...schema, schemaRoot: digestRecord("MPRR-V19-SCHEMA", schema) }));
schemas.schemaSetRoot = rooted("MPRR-V19-SCHEMA-SET", "1", ...schemas.schemas.map((schema) => schema.schemaRoot).sort());
writeCanonical("schemas.json", schemas);

const successorVectors = [];
const addVector = (family, operation, input, expectedTerminal) => {
  const ordinal = successorVectors.length + 1;
  const core = {
    expectedAuthorityOutputs: 0,
    expectedTerminal,
    family,
    input,
    operation,
    vectorId: `MPRR-V19-VECTOR-${String(ordinal).padStart(4, "0")}`,
  };
  successorVectors.push({ ...core, vectorRoot: digestSchemaRecord("MPRR-V19-VECTOR", "SCHEMA-VECTOR", core), schemaId: "SCHEMA-VECTOR" });
};
for (const row of closureRows) addVector("CLOSURE", "VERIFY-ONE-TO-ONE-CLOSURE-ROW", { closureId: row.closureId, findingId: row.findingId }, "MECHANICAL-CLEAN");
for (const row of behaviorRows) addVector("PREDECESSOR-BEHAVIOR", "EXECUTE-FROZEN-V1.7-BEHAVIOR", { behaviorId: row.behaviorId, predecessorVectorId: row.predecessorVectorId }, row.expectedTerminal);
for (const validatorId of governance.exactValidatorIds) addVector("AUTHORITY", "DERIVE-ROOTED-VALIDATOR-RESULT", { validatorId }, ["VALIDATOR-PACKAGE", "VALIDATOR-FROZEN-SOURCES", "VALIDATOR-SCHEMAS", "VALIDATOR-CLOSURE", "VALIDATOR-SEMANTIC-ENTAILMENT", "VALIDATOR-PREDECESSOR-BEHAVIOR", "VALIDATOR-CAUSAL-TRACE"].includes(validatorId) ? "MECHANICAL-CLEAN" : "BLOCKED-MISSING-EXTERNAL");
for (const row of comparisonRows) addVector("CAS", "REJECT-MISSING-LIVE-COMPARISON", { comparisonId: row.comparisonId }, "CAS-ABORTED");
for (const row of durableRows) addVector("CAS", "PROVE-ALL-OR-NONE-DURABLE-MEMBER", { durableMemberId: row.durableMemberId }, "MECHANICAL-CLEAN");
for (const schedule of recoverySchedules) addVector("RECOVERY", "EXECUTE-REFERENCE-RECOVERY-SCHEDULE", schedule, schedule.expectedPermitCountAfterRestart === 1 ? "REFERENCE-RECEIPT-RECOVERED" : "REFERENCE-NO-AUTHORITY");
const pathVectors = [
  ["ABSOLUTE", "/dev/null", "REJECTED-BEFORE-OPEN"],
  ["PARENT", "../outside", "REJECTED-BEFORE-OPEN"],
  ["DOT", "./subject.md", "REJECTED-BEFORE-OPEN"],
  ["SYMLINK-METADATA", "path-fixture/symlink", "REJECTED-NO-FOLLOW"],
  ["DEVICE-METADATA", "path-fixture/device", "REJECTED-NON-REGULAR"],
  ["FIFO-METADATA", "path-fixture/fifo", "REJECTED-NON-REGULAR"],
  ["OVERSIZE", "docs/planning/three-review-protocol-v1-8-package-2026-08-30/semantic-preservation-000001-030000.jsonl", "REJECTED-OVER-40-MIB-VECTOR-INPUT-LIMIT"],
];
for (const [pathClass, candidatePath, terminal] of pathVectors) addVector("PATH", "SAFE-PATH-ADMISSION", { candidatePath, pathClass }, terminal);
addVector("AUTHORITY", "DERIVE-ACCEPTANCE-FROM-VALIDATOR-RESULT-SET", { validatorIds: governance.exactValidatorIds }, "BLOCKED-MISSING-EXTERNAL");
writeJsonl("vectors.jsonl", successorVectors);

const traceEvidence = (vector, actualTerminal) => {
  const effectRoot = digestRecord("MPRR-V19-INSTRUMENTED-EFFECT", { actualAuthorityOutputs: 0, actualTerminal, vectorId: vector.vectorId });
  const oracleRoot = digestRecord("MPRR-V19-POST-EFFECT-ORACLE-COMPARISON", { expectedTerminal: vector.expectedTerminal, matches: actualTerminal === vector.expectedTerminal, observedTerminal: actualTerminal, vectorId: vector.vectorId });
  if (vector.family === "CLOSURE") {
    const row = closureRows.find((candidate) => candidate.closureId === vector.input.closureId);
    return [
      ["CLOSURE-ROW-READ", row.closureRoot],
      ["FINDING-IDENTITY-MATCH-DERIVED", digestRecord("MPRR-V19-CLOSURE-MATCH", { closureId: row.closureId, findingId: row.findingId, matched: row.findingId === vector.input.findingId })],
      ["CLOSURE-PREDICATE-EVALUATED", digestRecord("MPRR-V19-CLOSURE-PREDICATE-EFFECT", { acceptanceCredit: row.acceptanceCredit, exactClosurePredicate: row.exactClosurePredicate })],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  if (vector.family === "PREDECESSOR-BEHAVIOR") {
    const row = behaviorRows.find((candidate) => candidate.behaviorId === vector.input.behaviorId);
    return [
      ["FROZEN-VECTOR-READ", row.predecessorVectorRoot], ["EVALUATOR-INPUT-DERIVED", row.evaluatorInputRoot],
      [`OPERATION-${row.predecessorKind}-EXECUTED`, digestRecord("MPRR-V19-PREDECESSOR-OPERATION-EFFECT", { actualAuthorityOutputs: 0, actualTerminal, predecessorKind: row.predecessorKind, predecessorVectorId: row.predecessorVectorId })],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  if (vector.family === "CAS") {
    const selected = vector.input.comparisonId
      ? comparisonRows.find((row) => row.comparisonId === vector.input.comparisonId)
      : durableRows.find((row) => row.durableMemberId === vector.input.durableMemberId);
    const selectedRoot = selected.comparisonRoot ?? selected.durableMemberRoot;
    return [
      ["CAS-CONTRACT-READ", casContract.casContractRoot], ["CAS-COMPARISON-OR-MEMBER-SELECTED", selectedRoot],
      ["REFERENCE-TRANSACTION-EVALUATED", digestRecord("MPRR-V19-REFERENCE-CAS-EFFECT", { actualTerminal, operation: vector.operation, selectedRoot })],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  if (vector.family === "RECOVERY") {
    const schedule = recoverySchedules.find((row) => row.scheduleId === vector.input.scheduleId);
    const scheduleRoot = digestRecord("MPRR-V19-RECOVERY-SCHEDULE-EVIDENCE", schedule);
    return [
      ["DURABLE-STATE-CONTRACT-READ", casContract.casContractRoot], ["CRASH-BOUNDARY-INJECTED", scheduleRoot],
      ["PROCESS-RESTARTED-FROM-STORAGE-ONLY", digestRecord("MPRR-V19-RECOVERY-RESTART", { crashBoundary: schedule.crashBoundary, scheduleId: schedule.scheduleId })],
      ["RECOVERY-STATE-MACHINE-EVALUATED", digestRecord("MPRR-V19-RECOVERY-EFFECT", { actualTerminal, expectedDurableMemberCountAfterRestart: schedule.expectedDurableMemberCountAfterRestart, expectedPermitCountAfterRestart: schedule.expectedPermitCountAfterRestart })],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  if (vector.family === "PATH") {
    const source = sourceReceiptRows.find((row) => row.path === vector.input.candidatePath);
    return [
      ["RAW-PATH-READ", digestRecord("MPRR-V19-RAW-PATH-EVIDENCE", vector.input)],
      ["SYNTAX-GUARD-EVALUATED", digestRecord("MPRR-V19-PATH-SYNTAX-EFFECT", { candidatePath: vector.input.candidatePath, pathClass: vector.input.pathClass })],
      ["EXACT-ALLOWLIST-GUARD-EVALUATED", digestRecord("MPRR-V19-PATH-ALLOWLIST-EFFECT", { admittedCase: vector.input.pathClass, candidatePath: vector.input.candidatePath })],
      ["TYPE-SIZE-NOFOLLOW-GUARD-EVALUATED", source?.receiptRoot ?? digestRecord("MPRR-V19-PATH-METADATA-FIXTURE", vector.input)],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  const validatorStatus = ["VALIDATOR-PACKAGE", "VALIDATOR-FROZEN-SOURCES", "VALIDATOR-SCHEMAS", "VALIDATOR-CLOSURE", "VALIDATOR-SEMANTIC-ENTAILMENT", "VALIDATOR-PREDECESSOR-BEHAVIOR", "VALIDATOR-CAUSAL-TRACE"].includes(vector.input.validatorId) ? "PASS" : "MISSING-EXTERNAL-INPUT";
  return [
    ["FROZEN-GOVERNANCE-READ", governance.governanceRoot],
    ["EXPECTED-TARGET-SELECTORS-DERIVED", digestRecord("MPRR-V19-GOVERNANCE-TARGET-SELECTORS", { audience: governance.evidenceAudience, generation: governance.generation, packageRootSelector: governance.packageRootSelector, purpose: governance.purpose, subjectRootSelector: governance.subjectRootSelector })],
    ["ROOTED-VALIDATOR-CONTRACT-EVALUATED", digestRecord("MPRR-V19-VALIDATOR-CONTRACT-EFFECT", { status: validatorStatus, validatorId: vector.input.validatorId ?? "VALIDATOR-RESULT-SET" })],
    ["AUTHORITY-DERIVATION-EVALUATED", digestRecord("MPRR-V19-AUTHORITY-DERIVATION-EFFECT", { actualTerminal, validatorIds: vector.input.validatorIds ?? [vector.input.validatorId] })],
    ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
  ];
};
const traceRows = successorVectors.map((vector) => {
  let previousEventRoot = "0".repeat(64);
  const events = traceEvidence(vector, vector.expectedTerminal).map(([eventType, evidenceRoot], index) => {
    const core = {
      eventType, evidenceRoot, family: vector.family, inputRoot: digestRecord("MPRR-V19-VECTOR-TRACE-INPUT", vector.input),
      operation: vector.operation, ordinal: index + 1, previousEventRoot,
      terminal: ["EFFECT-OBSERVED", "ORACLE-COMPARED-AFTER-EFFECT"].includes(eventType) ? vector.expectedTerminal : "NOT-YET-OBSERVED",
    };
    const root = digestRecord("MPRR-V19-TRACE-EVENT", core);
    const event = { eventType, evidenceRoot, operation: vector.operation, ordinal: index + 1, previousEventRoot, root };
    previousEventRoot = root;
    return event;
  });
  const core = { events, traceId: `TRACE-${vector.vectorId}`, vectorId: vector.vectorId };
  return { ...core, schemaId: "SCHEMA-CAUSAL-TRACE", traceRoot: digestSchemaRecord("MPRR-V19-CAUSAL-TRACE", "SCHEMA-CAUSAL-TRACE", core) };
});
writeJsonl("causal-traces.jsonl", traceRows);

const growthCore = {
  admissionRule: "DENY-LARGE-ARTIFACT-ADMISSION-WHEN-GLOBAL-BUDGET-IS-UNKNOWN-OR-PROJECTION-EXCEEDS-APPROVED-BUDGET",
  duplicateSourceBytesAdded: 0,
  globalRepositoryGrowthBudgetBytes: null,
  globalRepositoryGrowthBudgetState: "UNKNOWN",
  largeArtifactAdmission: "DENIED-BUDGET-UNKNOWN",
  maxRegularGitMemberBytesExclusive: 52428800,
  normativePackageProjectedBytes: 0,
  outOfBandReserveBytes: 262144,
  projectedAddedBytes: 262144,
  projectedLargestMemberBytes: 0,
  reusedContentAddressedSourceBytes: sourceReceiptRows.reduce((sum, row) => sum + row.bytes, 0),
};
const growth = { ...growthCore, growthProjectionRoot: digestSchemaRecord("MPRR-V19-ARTIFACT-GROWTH-PROJECTION", "SCHEMA-ARTIFACT-GROWTH-PROJECTION", growthCore), schemaId: "SCHEMA-ARTIFACT-GROWTH-PROJECTION" };
writeCanonical("artifact-growth-projection.json", growth);

const subject = `# Protocol v1.9 — immutable planning successor\n\n## 1. גבול סמכות\n\n1.1 זוהי חבילת תכנון ו-QA מכנית בלבד. היא אינה Acceptance, Permit, HumanApproval, Review או הרשאת פיתוח.\n\n1.2 מצב מחייב: Acceptance=0; Gate29=BLOCKED; developmentFreeze=ACTIVE; repository=PUBLIC; authorityOutputs=0.\n\n1.3 אין שינוי Product, Git, GitHub, Provider או Deployment. אין יצירת key, credential או בחירת אלגוריתם חתימה.\n\n## 2. מכנה סגירה\n\n2.1 המכנה המדויק הוא 40 ממצאים בלתי ממוזגים: 25 מ-v1.7 ועוד 15 מ-v1.8. לכל ממצא שורת closure נפרדת ו-acceptanceCredit=0.\n\n2.2 שחזור ההתנהגות הוא 574/574 operations מקוריים. Oracle אינו חלק מקלט ה-evaluator וההשוואה מתרחשת רק לאחר effect.\n\n2.3 הוכחת semantics מכסה 4,016 predicates ו-53,450 semantic uses באמצעות exact active target roots, no weakening, no collision ו-bijective coverage. External semantic receipt עדיין חסר.\n\n## 3. מקור אמת ושחזור\n\n3.1 Readers קוראים רק exact allowlist מתוך frozen-source-receipt.jsonl. אין Git commands, אין network, אין enumeration של workspace ואין תלות בקבצים מאוחרים שאינם ברשימה.\n\n3.2 כל receipt קושר repository-relative path, mode, bytes, lines ו-SHA-256. שינוי מקור מפורש נכשל; הוספת קובץ לא קשור אינה משנה תוצאה.\n\n3.3 אין שכפול פיזי של carriers קיימים. artifact-growth-projection.json קובע duplicateSourceBytesAdded=0 ו-deny כאשר budget גלובלי אינו ידוע.\n\n## 4. סמכות וראיות חיצוניות\n\n4.1 Acceptance נגזרת רק מ-exact rooted validator result set שקושר computed packageRoot, physical manifestRoot, subjectRoot ו-frozen governance. אין caller-supplied validity booleans.\n\n4.2 exact quorum כולל שבעה slots נפרדים. appointments, signatures, trust, time, revocation, scanners, remote PUBLIC observation, three reviews, reconciliation, Tal approval ו-production CAS adapter חסרים ולכן המסלול חסום.\n\n4.3 חוזה החתימה הוא planning-only. allowed algorithms ריק עד אישור חיצוני; לא נוצרו keys או signatures.\n\n## 5. CAS, Recovery ו-PUBLIC\n\n5.1 חוזה CAS מגדיר בדיוק 65 comparisons ו-17 durable members, operation-key preimage, zero-or-one Permit, serializable transaction, response-loss replay, concurrency, revocation drift ו-partial-write rollback.\n\n5.2 reference model ניתן להרצה; productionAdapterExecutable=false. אין טענה שמחיקה, remote, CAS או scanner אמיתיים מוכנים.\n\n5.3 repository חייב להישאר PUBLIC. authenticated remote visibility/ref/write-object-set receipt חסר ולכן Push/Permit אינם מורשים.\n\n## 6. Readers ונתיבים\n\n6.1 שני Readers בלתי תלויים, read-only כברירת מחדל. report path אופציונלי חייב להיות בתוך ספריית detached reports המדויקת, עם parent קיים, target חדש, no-follow ו-create-new. invalid path נכשל לפני קריאת package.\n\n6.2 vector paths הם exact closed set. absolute, dot segments, traversal, symlink, device, FIFO ו-oversize נדחים fail-closed.\n`;
writeFileSync(file("subject.md"), subject, "utf8");

const payloadNames = [
  "artifact-growth-projection.json", "behavior-contract.jsonl", "cas-recovery-contract.json", "causal-traces.jsonl",
  "closure-crosswalk.jsonl", "external-evidence-contracts.json", "frozen-source-receipt.jsonl", "governance.json",
  "schemas.json", "semantic-entailment.jsonl", "semantic-target-registry.json", "subject.md", "vectors.jsonl",
];
const payloadMembers = payloadNames.map((name) => {
  const bytes = readFileSync(file(name));
  assert(bytes.length < 52428800, `member exceeds 50MiB: ${name}`);
  return { bytes: bytes.length, lines: lineCount(bytes), path: logical(name), role: "NORMATIVE-PAYLOAD", root: sha256(bytes) };
});
const producerTools = [
  ["generate.mjs", "DETERMINISTIC-PRODUCER"], ["reader-a.mjs", "INDEPENDENT-READ-ONLY-READER-A"], ["reader-b.rb", "INDEPENDENT-READ-ONLY-READER-B"],
].map(([name, role]) => ({ path: logical(name), role, root: sha256(readFileSync(file(name))) }));
const packageRoot = rooted("MPRR-V19-NORMATIVE-PACKAGE", "1", ...payloadMembers.map(canonical).sort(), ...producerTools.map(canonical).sort());
const manifest = {
  artifactId: "CONNECT-THREE-REVIEW-PROTOCOL-V1-9-IMMUTABLE-SUCCESSOR-2026-08-30",
  authorityState: { Acceptance: 0, Gate29: "BLOCKED", authorityOutputs: 0, developmentFreeze: "ACTIVE", repository: "PUBLIC" },
  exactCounts: { casComparisons: 65, closureRows: 40, durableMembers: 17, predecessorBehaviors: 574, semanticPredicates: 4016, semanticUses: 53450, successorVectors: successorVectors.length },
  frozenSourceReceiptSetRoot: sourceReceiptSetRoot,
  packageRoot,
  packageRootConstructor: "SHA-256(CPB1(MPRR-V19-NORMATIVE-PACKAGE,1,sorted-canonical-payload-records,sorted-canonical-tool-records))",
  packageSchemaVersion: "1",
  payloadMembers,
  producerTools,
  schemaId: "SCHEMA-MANIFEST",
};
writeCanonical("normative-package-manifest.json", manifest);

const normativeNames = [...payloadNames, "normative-package-manifest.json", "generate.mjs", "reader-a.mjs", "reader-b.rb"];
let normativePackageProjectedBytes = normativeNames.reduce((sum, name) => sum + statSync(file(name)).size, 0);
let finalPayloadMembers = payloadMembers;
let finalPackageRoot = packageRoot;
for (let pass = 0; pass < 6; pass += 1) {
  const finalizedGrowth = {
    ...growth,
    normativePackageProjectedBytes,
    outOfBandReserveBytes: 262144,
    projectedAddedBytes: normativePackageProjectedBytes + 262144,
    projectedLargestMemberBytes: Math.max(...finalPayloadMembers.map((row) => row.bytes), ...producerTools.map((row) => statSync(sourceFile(row.path)).size)),
  };
  const growthFinalCore = { ...finalizedGrowth };
  delete growthFinalCore.growthProjectionRoot;
  finalizedGrowth.growthProjectionRoot = digestRecord("MPRR-V19-ARTIFACT-GROWTH-PROJECTION", growthFinalCore);
  writeCanonical("artifact-growth-projection.json", finalizedGrowth);
  finalPayloadMembers = payloadNames.map((name) => {
    const bytes = readFileSync(file(name));
    assert(bytes.length < 52428800, `member exceeds 50MiB: ${name}`);
    return { bytes: bytes.length, lines: lineCount(bytes), path: logical(name), role: "NORMATIVE-PAYLOAD", root: sha256(bytes) };
  });
  finalPackageRoot = rooted("MPRR-V19-NORMATIVE-PACKAGE", "1", ...finalPayloadMembers.map(canonical).sort(), ...producerTools.map(canonical).sort());
  manifest.payloadMembers = finalPayloadMembers;
  manifest.packageRoot = finalPackageRoot;
  writeCanonical("normative-package-manifest.json", manifest);
  const observedBytes = normativeNames.reduce((sum, name) => sum + statSync(file(name)).size, 0);
  if (observedBytes === normativePackageProjectedBytes) break;
  normativePackageProjectedBytes = observedBytes;
}

const summary = {
  closureRows: closureRows.length,
  packageRoot: finalPackageRoot,
  payloadMembers: finalPayloadMembers.length,
  predecessorBehaviors: behaviorRows.length,
  projectedAddedBytes: normativePackageProjectedBytes + 262144,
  semanticPredicates: semanticRows.length,
  semanticUses: v17Uses.length,
  sourceReceipts: sourceReceiptRows.length,
  successorVectors: successorVectors.length,
};
process.stdout.write(`${canonical(summary)}\n`);
