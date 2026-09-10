#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const packageDir = resolve(process.argv[2] ?? new URL(".", import.meta.url).pathname);
const repositoryRoot = resolve(packageDir, "../../..");
const packageLogicalRoot = "docs/planning/three-review-protocol-v1-7-package-2026-08-30";
const file = (name) => resolve(packageDir, name);
const logical = (name) => `${packageLogicalRoot}/${name}`;
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
const lineNumberAt = (bytes, offset) => {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (bytes[index] === 10) line += 1;
  return line;
};
const json = (name) => JSON.parse(readFileSync(file(name), "utf8"));
const jsonl = (name) => readFileSync(file(name), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);

const manifest = json("normative-package-manifest.json");
const registry = json("normative-registry.json");
const outputs = jsonl("requirement-outputs.jsonl");
const crosswalk = jsonl("closure-crosswalk.jsonl");
const predecessor = jsonl("predecessor-closure.jsonl");
const predecessorClauses = jsonl("predecessor-clause-crosswalk.jsonl");
const semanticPredicates = jsonl("predecessor-semantic-predicates.jsonl");
const vectors = jsonl("causal-vectors.jsonl");
const graph = json("causal-source-graph.json");
const semanticUses = jsonl("semantic-use-index.jsonl");

const counters = {
  ambiguousStateEventPairs: 0,
  carrierByteMismatch: 0,
  carrierLineMismatch: 0,
  carrierRootMismatch: 0,
  causalCycles: 0,
  conjunctDigestMismatch: 0,
  injectedFailurePreconditions: 0,
  invalidRepoRootLocators: 0,
  manifestMemberMismatch: 0,
  memberCoreRootMismatch: 0,
  memberDigestMismatch: 0,
  memberLineSpanMismatch: 0,
  memberSpanMismatch: 0,
  mergeOrRangeRows: 0,
  missingControlFamilies: 0,
  missingConstructorInputs: 0,
  missingInitialStates: 0,
  namespaceRootMismatch: 0,
  negativeToSuccess: 0,
  outputRootMismatch: 0,
  parserProfileRootMismatch: 0,
  policyRootMismatch: 0,
  predecessorClauseMismatch: 0,
  predecessorClauseSelfOwnedLocators: 0,
  predecessorMismatch: 0,
  predecessorSymbolicConjunctLocators: 0,
  selfOwnedLocators: 0,
  semanticUseIndexMismatch: 0,
  semanticPredicateMismatch: 0,
  symbolicConjunctLocators: 0,
  undefinedGuards: 0,
  unhandledStateEventPairs: 0,
  unreachableRequiredStates: 0,
  unresolvedSemanticUses: 0,
  vectorMismatch: 0,
};

for (const member of manifest.payloadMembers) {
  const expectedPrefix = `${packageLogicalRoot}/`;
  if (!member.path.startsWith(expectedPrefix) || isAbsolute(member.path) || member.path.split("/").includes("..")) {
    counters.manifestMemberMismatch += 1;
    continue;
  }
  const bytes = readFileSync(resolve(repositoryRoot, member.path));
  if (sha256(bytes) !== member.root || bytes.length !== member.bytes || lineCount(bytes) !== member.lines) counters.manifestMemberMismatch += 1;
}

const carrierBytes = new Map();
for (const carrier of registry.sourceCarriers) {
  if (isAbsolute(carrier.path) || carrier.path.startsWith("web/") || carrier.path.split("/").includes("..")) {
    counters.invalidRepoRootLocators += 1;
    continue;
  }
  const resolved = resolve(repositoryRoot, carrier.path);
  if (!resolved.startsWith(`${repositoryRoot}/`)) {
    counters.invalidRepoRootLocators += 1;
    continue;
  }
  const bytes = readFileSync(resolved);
  carrierBytes.set(carrier.carrierId, bytes);
  if (sha256(bytes) !== carrier.root) counters.carrierRootMismatch += 1;
  if (bytes.length !== carrier.bytes) counters.carrierByteMismatch += 1;
  if (lineCount(bytes) !== carrier.lines) counters.carrierLineMismatch += 1;
}

for (const profile of registry.parserProfiles) {
  const core = {
    mode: profile.mode,
    profileId: profile.profileId,
    repositoryRootRule: profile.repositoryRootRule,
    selectionRule: profile.selectionRule,
  };
  if (rooted("MPRR-V17-PARSER-PROFILE", "1", canonical(core)) !== profile.parserProfileRoot) counters.parserProfileRootMismatch += 1;
}

const memberByKey = new Map();
for (const member of registry.sourceMembers) {
  const bytes = carrierBytes.get(member.carrierId);
  if (!bytes || member.byteStart < 0 || member.byteEndExclusive <= member.byteStart || member.byteEndExclusive > bytes.length) {
    counters.memberSpanMismatch += 1;
    continue;
  }
  const selected = bytes.subarray(member.byteStart, member.byteEndExclusive);
  if (sha256(selected) !== member.memberDigest) counters.memberDigestMismatch += 1;
  if (lineNumberAt(bytes, member.byteStart) !== member.lineStartInclusive || lineNumberAt(bytes, member.byteEndExclusive) !== member.lineEndExclusive) counters.memberLineSpanMismatch += 1;
  const { memberCoreRoot, namespaceRoot: ignoredNamespaceRoot, ...core } = member;
  if (Object.hasOwn(core, "namespaceRoot")) counters.memberCoreRootMismatch += 1;
  if (rooted("MPRR-V17-MEMBER-CORE", "1", canonical(core)) !== memberCoreRoot) counters.memberCoreRootMismatch += 1;
  memberByKey.set(`${member.namespaceId}/${member.memberId}`, member);
}

for (const namespace of registry.sourceNamespaces) {
  const cores = registry.sourceMembers.filter((member) => member.namespaceId === namespace.namespaceId);
  const memberSetRoot = rooted("MPRR-V17-MEMBER-SET", "1", ...cores.map((member) => member.memberCoreRoot).sort());
  if (memberSetRoot !== namespace.memberSetRoot || cores.length !== namespace.memberCount) counters.namespaceRootMismatch += 1;
  const { namespaceRoot, ...core } = namespace;
  if (rooted("MPRR-V17-NAMESPACE", "1", canonical(core)) !== namespaceRoot) counters.namespaceRootMismatch += 1;
  if (cores.some((member) => member.namespaceRoot !== namespaceRoot)) counters.namespaceRootMismatch += 1;
}

const generatorRoot = manifest.producerTools.find((item) => item.role === "DETERMINISTIC-PRODUCER").root;
const requiredConstructorInputs = registry.requirementOutputContract.requiredConstructorInputs;
for (const output of outputs) {
  if (requiredConstructorInputs.some((key) => !Object.hasOwn(output.constructorInputs, key))) counters.missingConstructorInputs += 1;
  const outputRoot = rooted("MPRR-V17-REQUIREMENT-OUTPUT", "1", canonical(output.constructorInputs));
  if (outputRoot !== output.outputRoot) counters.outputRootMismatch += 1;
  const producerReceiptRoot = rooted("MPRR-V17-PRODUCER-OUTPUT-RECEIPT", "1", output.outputId, output.outputRoot, generatorRoot);
  if (producerReceiptRoot !== output.producerReceiptRoot) counters.outputRootMismatch += 1;
  for (const field of ["statement", "defectCauseImpact", "requiredProofPredicate", "dependencies", "sourceBasis"]) {
    if (sha256(Buffer.from(output.canonicalFiveFieldValues[field], "utf8")) !== output.canonicalFiveFieldDigestVector[field]) counters.outputRootMismatch += 1;
    if (sha256(Buffer.from(output.predecessorFiveFieldValues[field], "utf8")) !== output.predecessorFiveFieldDigestVector[field]) counters.outputRootMismatch += 1;
  }
}
if (outputs.length !== 112 || new Set(outputs.map((item) => item.outputId)).size !== 112 || new Set(outputs.map((item) => item.requirementId)).size !== 112) counters.outputRootMismatch += 1;

const controlById = new Map(registry.findingControls.map((item) => [item.controlId, item]));
const vectorById = new Map(vectors.map((item) => [item.vectorId, item]));
const outputById = new Map(outputs.map((item) => [item.outputId, item]));
if (crosswalk.length !== 31 || new Set(crosswalk.map((item) => item.sourceFindingId)).size !== 31 || new Set(crosswalk.map((item) => item.crosswalkId)).size !== 31) counters.mergeOrRangeRows += 1;
for (const row of crosswalk) {
  if (typeof row.sourceFindingId !== "string" || !/^MPRR-V16-IHR-F\d{3}$/.test(row.sourceFindingId) || !row.mergePolicy.startsWith("PROHIBITED")) counters.mergeOrRangeRows += 1;
  const targetLocators = [row.targetControlLocator, ...row.targetEvidenceLocators];
  if (targetLocators.some((locator) => locator.includes("closure-crosswalk.jsonl"))) counters.selfOwnedLocators += 1;
  const control = controlById.get(row.targetControlId);
  if (!control || control.controlRoot !== row.targetControlRoot) counters.conjunctDigestMismatch += 1;
  const sourceMember = memberByKey.get(`V16-FINDINGS/${row.sourceFindingId}`);
  if (!sourceMember || sourceMember.memberDigest !== row.sourceMemberDigest || sourceMember.memberCoreRoot !== row.sourceMemberCoreRoot) counters.conjunctDigestMismatch += 1;
  const bytes = carrierBytes.get("V16-FINDINGS");
  for (const conjunct of row.sourceConjuncts) {
    if (![conjunct.absoluteByteStart, conjunct.absoluteByteEndExclusive, conjunct.memberRelativeByteStart, conjunct.memberRelativeByteEndExclusive].every(Number.isSafeInteger)) counters.symbolicConjunctLocators += 1;
    if (!/#bytes=\d+-\d+$/.test(conjunct.sourceLocator)) counters.symbolicConjunctLocators += 1;
    const selected = bytes.subarray(conjunct.absoluteByteStart, conjunct.absoluteByteEndExclusive);
    if (sha256(selected) !== conjunct.digest) counters.conjunctDigestMismatch += 1;
    if (sourceMember && (conjunct.absoluteByteStart - sourceMember.byteStart !== conjunct.memberRelativeByteStart || conjunct.absoluteByteEndExclusive - sourceMember.byteStart !== conjunct.memberRelativeByteEndExclusive)) counters.conjunctDigestMismatch += 1;
  }
  if (row.vectorIds.some((id) => !vectorById.has(id)) || row.targetOutputIds.some((id) => !outputById.has(id))) counters.conjunctDigestMismatch += 1;
}

const predecessorClauseById = new Map(predecessorClauses.map((item) => [item.predecessorCrosswalkId, item]));
const semanticPredicateById = new Map(semanticPredicates.map((item) => [item.predicateId, item]));
if (predecessorClauses.length !== 323 || new Set(predecessorClauses.map((item) => item.predecessorCrosswalkId)).size !== 323 || new Set(predecessorClauses.map((item) => item.sourceRowId)).size !== 323) counters.predecessorClauseMismatch += 1;
if (semanticPredicates.length !== 4016 || new Set(semanticPredicates.map((item) => item.predicateId)).size !== 4016) counters.semanticPredicateMismatch += 1;
for (const row of predecessorClauses) {
  const { predecessorCrosswalkRoot, ...core } = row;
  if (rooted("MPRR-V17-PREDECESSOR-CLAUSE-ROW", "1", canonical(core)) !== predecessorCrosswalkRoot) counters.predecessorClauseMismatch += 1;
  if (!row.mergePolicy.startsWith("PROHIBITED") || row.acceptanceCredit !== 0 || row.predicateIds.length !== row.sourceConjuncts.length || row.predicateRoots.length !== row.predicateIds.length) counters.predecessorClauseMismatch += 1;
  if (row.targetEvidenceLocators.some((locator) => locator.includes("predecessor-clause-crosswalk.jsonl"))) counters.predecessorClauseSelfOwnedLocators += 1;
  const sourceMember = memberByKey.get(`${row.sourceNamespaceId}/${row.sourceMemberId}`);
  if (!sourceMember || sourceMember.memberCoreRoot !== row.sourceMemberCoreRoot || sourceMember.memberDigest !== row.sourceMemberDigest) {
    counters.predecessorClauseMismatch += 1;
    continue;
  }
  const bytes = carrierBytes.get(sourceMember.carrierId);
  for (let index = 0; index < row.sourceConjuncts.length; index += 1) {
    const conjunct = row.sourceConjuncts[index];
    if (![conjunct.absoluteByteStart, conjunct.absoluteByteEndExclusive, conjunct.memberRelativeByteStart, conjunct.memberRelativeByteEndExclusive].every(Number.isSafeInteger) || !/#bytes=\d+-\d+$/.test(conjunct.sourceLocator)) counters.predecessorSymbolicConjunctLocators += 1;
    const selected = bytes.subarray(conjunct.absoluteByteStart, conjunct.absoluteByteEndExclusive);
    if (sha256(selected) !== conjunct.digest || conjunct.absoluteByteStart - sourceMember.byteStart !== conjunct.memberRelativeByteStart || conjunct.absoluteByteEndExclusive - sourceMember.byteStart !== conjunct.memberRelativeByteEndExclusive) counters.predecessorClauseMismatch += 1;
    const predicate = semanticPredicateById.get(row.predicateIds[index]);
    if (!predicate || predicate.predicateRoot !== row.predicateRoots[index] || canonical(predicate.sourceConjunct) !== canonical(conjunct) || predicate.predecessorCrosswalkId !== row.predecessorCrosswalkId) counters.semanticPredicateMismatch += 1;
  }
  if (row.vectorIds.some((id) => !vectorById.has(id)) || row.targetOutputIds.some((id) => !outputById.has(id)) || row.targetOutputRoots.some((root, index) => outputById.get(row.targetOutputIds[index])?.outputRoot !== root)) counters.predecessorClauseMismatch += 1;
  const locatorMatch = row.sourceV16CrosswalkRowLocator.match(/#bytes=(\d+)-(\d+)$/);
  const v16Bytes = carrierBytes.get("V16-SUBJECT");
  if (!locatorMatch || sha256(v16Bytes.subarray(Number(locatorMatch?.[1] ?? 0), Number(locatorMatch?.[2] ?? 0))) !== row.sourceV16CrosswalkRowDigest) counters.predecessorClauseMismatch += 1;
}
for (const predicate of semanticPredicates) {
  const { predicateRoot, ...core } = predicate;
  if (rooted("MPRR-V17-SEMANTIC-PREDICATE", "1", canonical(core)) !== predicateRoot) counters.semanticPredicateMismatch += 1;
  const row = predecessorClauseById.get(predicate.predecessorCrosswalkId);
  if (!row || !row.predicateIds.includes(predicate.predicateId)) counters.semanticPredicateMismatch += 1;
  for (const target of predicate.translatedTargetClauses) {
    const output = outputById.get(target.targetOutputId);
    const expectedValueRoot = target.targetField === "ALL-FIVE-FIELDS" ? output?.outputRoot : output?.canonicalFiveFieldDigestVector[target.targetField];
    if (!output || target.targetOutputRoot !== output.outputRoot || target.targetValueRoot !== expectedValueRoot) counters.semanticPredicateMismatch += 1;
  }
}

for (const policy of registry.policies) {
  if (rooted("MPRR-V17-POLICY", "1", policy.policyId, policy.policyBytes) !== policy.policyRoot) counters.policyRootMismatch += 1;
}

const guardIds = new Set(registry.guards.map((item) => item.guardId));
for (const transition of registry.controlTransitions) if (!guardIds.has(transition.guardId)) counters.undefinedGuards += 1;
const transitionsByKey = new Map();
for (const transition of registry.controlTransitions) {
  const key = `${transition.machineId}|${transition.fromState}|${transition.event}`;
  const rows = transitionsByKey.get(key) ?? [];
  rows.push(transition);
  transitionsByKey.set(key, rows);
}
for (const machine of registry.controlMachines) {
  if (!machine.initialState || !machine.states.includes(machine.initialState)) counters.missingInitialStates += 1;
  const reachable = new Set([machine.initialState]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const transition of registry.controlTransitions.filter((item) => item.machineId === machine.machineId)) {
      if (reachable.has(transition.fromState) && !reachable.has(transition.toState)) {
        reachable.add(transition.toState);
        changed = true;
      }
    }
  }
  for (const state of machine.states) {
    for (const event of machine.events) {
      const rows = transitionsByKey.get(`${machine.machineId}|${state}|${event}`) ?? [];
      if (rows.length === 0) counters.unhandledStateEventPairs += 1;
      if (rows.length > 1) counters.ambiguousStateEventPairs += 1;
    }
    if (!reachable.has(state)) counters.unreachableRequiredStates += 1;
  }
}
const negativeState = /(REJECT|CONFLICT|REVOK|BLOCK|INVALID|STALE|ROLLBACK|SPLIT|QUARANTIN|ABORT|EXPIRED|VETO)/;
for (const mapping of registry.lifecycleTerminalMap) {
  if (negativeState.test(mapping.state) && mapping.resultStatus === "SUCCESS") counters.negativeToSuccess += 1;
}
const vectorFamilies = new Set(vectors.map((vector) => vector.family));
for (const machine of registry.controlMachines) {
  if (!vectorFamilies.has(machine.machineId.slice(8))) counters.missingControlFamilies += 1;
}

const outgoing = new Map(graph.nodes.map((node) => [node.nodeId, []]));
const indegree = new Map(graph.nodes.map((node) => [node.nodeId, 0]));
for (const edge of graph.edges) {
  if (!outgoing.has(edge.from) || !indegree.has(edge.to)) {
    counters.causalCycles += 1;
    continue;
  }
  outgoing.get(edge.from).push(edge.to);
  indegree.set(edge.to, indegree.get(edge.to) + 1);
  if (edge.relation.includes("PRECONDITION") || (edge.from.startsWith("EXPECTED-ORACLE:") && !edge.to.startsWith("ORACLE-COMPARISON:"))) counters.injectedFailurePreconditions += 1;
}
const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id).sort();
let visited = 0;
while (queue.length > 0) {
  const id = queue.shift();
  visited += 1;
  for (const next of outgoing.get(id)) {
    indegree.set(next, indegree.get(next) - 1);
    if (indegree.get(next) === 0) queue.push(next);
  }
  queue.sort();
}
if (visited !== graph.nodes.length) counters.causalCycles += 1;
if (graph.injectedFailurePreconditionEdges !== 0) counters.injectedFailurePreconditions += graph.injectedFailurePreconditionEdges;

const targetSets = {
  "CONTROL-MACHINE": new Set(registry.controlMachines.map((item) => item.machineId)),
  "EXTERNAL-INPUT-BLOCK": new Set(registry.externalInputBlocks.map((item) => item.blockId)),
  "FINDING-CONTROL": new Set(registry.findingControls.map((item) => item.controlId)),
  GUARD: new Set(registry.guards.map((item) => item.guardId)),
  POLICY: new Set(registry.policies.map((item) => item.policyId)),
  "PREDECESSOR-CLAUSE-ROW": new Set(predecessorClauses.map((item) => item.predecessorCrosswalkId)),
  "REQUIREMENT-OUTPUT": new Set(outputs.map((item) => item.outputId)),
  REQUIREMENT: new Set(outputs.map((item) => item.requirementId)),
  SCHEMA: new Set(registry.schemas.map((item) => item.schemaId)),
  "SEMANTIC-PREDICATE": new Set(semanticPredicates.map((item) => item.predicateId)),
  "SOURCE-FINDING": new Set(registry.sourceMembers.filter((item) => item.namespaceId === "V16-FINDINGS").map((item) => item.memberId)),
  "SOURCE-REQUIREMENT": new Set(registry.sourceMembers.filter((item) => item.namespaceId === "V16-REQUIREMENTS").map((item) => item.memberId)),
  TERMINAL: new Set(registry.terminalRegistry.map((item) => item.terminalId)),
  VECTOR: new Set(vectors.map((item) => item.vectorId)),
};
const discoveredUses = [];
const traverse = (value, artifactPath, pointer = "") => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => traverse(item, artifactPath, `${pointer}/${index}`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPointer = `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
    const targetKind = Object.hasOwn(registry.semanticUseDiscovery.referenceFieldKinds, key) ? registry.semanticUseDiscovery.referenceFieldKinds[key] : null;
    if (targetKind) {
      const values = Array.isArray(child) ? child : [child];
      values.forEach((targetId, occurrenceIndex) => {
        if (typeof targetId !== "string") return;
        const identity = `${artifactPath}|${childPointer}|${occurrenceIndex}|${targetKind}|${targetId}`;
        const resolution = targetSets[targetKind]?.has(targetId) ? "RESOLVED" : "UNRESOLVED";
        discoveredUses.push({ artifactPath, jsonPointer: childPointer, occurrenceIndex, referenceField: key, resolution, targetId, targetKind, useId: `MPRR-V17-USE-${sha256(Buffer.from(identity, "utf8")).slice(0, 32).toUpperCase()}` });
      });
    }
    if (key !== "referenceFieldKinds") traverse(child, artifactPath, childPointer);
  }
};
traverse(registry, logical("normative-registry.json"));
outputs.forEach((record, index) => traverse(record, logical("requirement-outputs.jsonl"), `/${index}`));
crosswalk.forEach((record, index) => traverse(record, logical("closure-crosswalk.jsonl"), `/${index}`));
predecessor.forEach((record, index) => traverse(record, logical("predecessor-closure.jsonl"), `/${index}`));
predecessorClauses.forEach((record, index) => traverse(record, logical("predecessor-clause-crosswalk.jsonl"), `/${index}`));
semanticPredicates.forEach((record, index) => traverse(record, logical("predecessor-semantic-predicates.jsonl"), `/${index}`));
vectors.forEach((record, index) => traverse(record, logical("causal-vectors.jsonl"), `/${index}`));
const markdownReferencePatterns = [
  [/MPRR-V16-IHR-F\d{3}/g, "SOURCE-FINDING"],
  [/MPRR-V16-REQ-\d{3}/g, "SOURCE-REQUIREMENT"],
  [/MPRR-V17-CONTROL-F\d{3}/g, "FINDING-CONTROL"],
  [/MPRR-V17-REQ-\d{3}/g, "REQUIREMENT"],
  [/MPRR-V17-OUT-\d{3}/g, "REQUIREMENT-OUTPUT"],
  [/EXT-[A-Z0-9-]+/g, "EXTERNAL-INPUT-BLOCK"],
];
const subjectBytes = readFileSync(file("subject.md"));
const subjectText = subjectBytes.toString("utf8");
for (const [pattern, targetKind] of markdownReferencePatterns) {
  for (const match of subjectText.matchAll(pattern)) {
    const byteStart = Buffer.byteLength(subjectText.slice(0, match.index), "utf8");
    const byteEndExclusive = byteStart + Buffer.byteLength(match[0], "utf8");
    const artifactPath = logical("subject.md");
    const jsonPointer = `#bytes=${byteStart}-${byteEndExclusive}`;
    const targetId = match[0];
    const identity = `${artifactPath}|${jsonPointer}|0|${targetKind}|${targetId}`;
    discoveredUses.push({ artifactPath, jsonPointer, occurrenceIndex: 0, referenceField: "markdownToken", resolution: targetSets[targetKind]?.has(targetId) ? "RESOLVED" : "UNRESOLVED", targetId, targetKind, useId: `MPRR-V17-USE-${sha256(Buffer.from(identity, "utf8")).slice(0, 32).toUpperCase()}` });
  }
}
discoveredUses.sort((left, right) => left.useId.localeCompare(right.useId));
if (canonical(discoveredUses) !== canonical(semanticUses)) counters.semanticUseIndexMismatch += 1;
counters.unresolvedSemanticUses += discoveredUses.filter((item) => item.resolution !== "RESOLVED").length;

if (predecessor.length !== 128 || predecessor.filter((item) => item.predecessorKind === "V1.5-FINDING").length !== 16 || predecessor.filter((item) => item.predecessorKind === "V1.6-REQUIREMENT").length !== 112) counters.predecessorMismatch += 1;
if (new Set(predecessor.map((item) => item.preservationId)).size !== predecessor.length) counters.predecessorMismatch += 1;

const terminalById = new Map(registry.terminalRegistry.map((item) => [item.terminalId, item]));
const failureById = new Map(registry.failureConditions.map((item) => [item.conditionId, item]));
const externalById = new Map(registry.externalInputBlocks.map((item) => [item.blockId, item]));
const policyRoots = new Set(registry.policies.map((item) => item.policyRoot));
const transitionFor = (machineId, state, event) => {
  const rows = transitionsByKey.get(`${machineId}|${state}|${event}`) ?? [];
  return rows.length === 1 ? rows[0] : null;
};
const executeVector = (vector) => {
  let terminalId = "TERM-MALFORMED";
  const fixture = vector.fixture;
  if (vector.kind === "SOURCE_MEMBER_MUTATION") {
    const bytes = readFileSync(resolve(repositoryRoot, fixture.sourcePath));
    const selected = Buffer.from(bytes.subarray(fixture.byteStart, fixture.byteEndExclusive));
    if (sha256(selected) === fixture.expectedPreDigest && fixture.mutationOffsetWithinMember >= 0 && fixture.mutationOffsetWithinMember < selected.length) {
      selected[fixture.mutationOffsetWithinMember] ^= fixture.mutationXorMask;
      terminalId = sha256(selected) === fixture.expectedPostDigest && sha256(selected) !== fixture.expectedPreDigest ? "TERM-SOURCE-GRAPH-INVALID" : "TERM-MALFORMED";
    }
  } else if (vector.kind === "SOURCE_GRAPH_CLEAN") {
    terminalId = [counters.invalidRepoRootLocators, counters.carrierRootMismatch, counters.memberDigestMismatch, counters.memberCoreRootMismatch, counters.namespaceRootMismatch].every((value) => value === 0) ? "TERM-MECHANICAL-CLEAN" : "TERM-SOURCE-GRAPH-INVALID";
  } else if (vector.kind === "OBSERVED_STATE_EVALUATION") {
    const observation = fixture.observation;
    if (registry.failureConditions.some((condition) => typeof observation[condition.path] !== "boolean")) {
      terminalId = "TERM-MALFORMED";
    } else {
      const triggered = registry.failureConditions.filter((condition) => observation[condition.path] === condition.operand).sort((left, right) => left.precedence - right.precedence);
      terminalId = triggered[0]?.terminalId ?? "TERM-MECHANICAL-CLEAN";
    }
  } else if (vector.kind === "CPB1_FRAMING") {
    const separate = rooted(fixture.domain, fixture.version, ...fixture.fields);
    const suffixed = rooted(`${fixture.domain}-${fixture.version}`, "", ...fixture.fields);
    terminalId = separate !== suffixed ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID";
  } else if (vector.kind === "OUTPUT_ALL_RECOMPUTE") {
    terminalId = counters.outputRootMismatch === 0 && counters.missingConstructorInputs === 0 && fixture.outputIds.length === 112 ? "TERM-MECHANICAL-CLEAN" : "TERM-OUTPUT-INVALID";
  } else if (vector.kind === "SEMANTIC_USE_UNINDEXED") {
    terminalId = Object.hasOwn(registry.semanticUseDiscovery.referenceFieldKinds, fixture.injectedField) && targetSets[registry.semanticUseDiscovery.referenceFieldKinds[fixture.injectedField]].has(fixture.injectedTargetId) ? "TERM-SEMANTIC-USE-INVALID" : "TERM-MALFORMED";
  } else if (vector.kind === "POLICY_ROOTS_RECOMPUTE") {
    terminalId = counters.policyRootMismatch === 0 && fixture.policyIds.length === registry.policies.length ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID";
  } else if (vector.kind === "EXTERNAL_INPUT_GATE") {
    const block = externalById.get(fixture.blockId);
    terminalId = block && block.state === fixture.expectedState && block.missingBlockRoot === fixture.missingBlockRoot ? "TERM-BLOCKED" : "TERM-MALFORMED";
  } else if (vector.kind === "OPERATION_KEY_MUTATION") {
    const mutated = structuredClone(registry.commitContract.precommitEnvelope);
    mutated[fixture.fieldName] = fixture.alternateValue;
    const changedKey = rooted("MPRR-V17-OPERATION-KEY", "1", canonical(mutated));
    terminalId = changedKey !== fixture.baseOperationKey ? "TERM-CAS-ABORTED" : "TERM-MALFORMED";
  } else if (vector.kind === "DETACHED_BINDING") {
    terminalId = fixture.leftValue !== fixture.rightValue ? "TERM-CAS-ABORTED" : "TERM-MALFORMED";
  } else if (vector.kind === "CAS_RACE") {
    terminalId = fixture.expectedRoot !== fixture.racedObservedRoot ? "TERM-CAS-ABORTED" : "TERM-MALFORMED";
  } else if (vector.kind === "CAS_MISSING_COMPARISON") {
    const comparison = registry.commitContract.casComparisons.find((item) => item.comparisonId === fixture.comparisonId);
    terminalId = comparison && [comparison.expectedRoot, comparison.observedRoot, comparison.revocationHead].some((value) => value === null) ? "TERM-CAS-ABORTED" : "TERM-MALFORMED";
  } else if (vector.kind === "REPLAY_CASE") {
    const decision = fixture.sameKey && fixture.sameEnvelope ? (fixture.caseId === "RESPONSE-LOSS" ? "READ-ORIGINAL-RECEIPT-BY-EXACT-OPERATION-KEY" : "RETURN-ORIGINAL-EXACT-RECEIPT") : fixture.sameKey ? "CONFLICT" : "CAS-ABORT";
    terminalId = decision === fixture.expectedDecision ? (decision.includes("RECEIPT") ? "TERM-MECHANICAL-CLEAN" : "TERM-CAS-ABORTED") : "TERM-MALFORMED";
  } else if (vector.kind === "READBACK_DIVERGENCE") {
    terminalId = fixture.revocationRequired && fixture.committedRoot !== fixture.observedReadbackRoot ? "TERM-READBACK-DIVERGED" : "TERM-MALFORMED";
  } else if (vector.kind === "MACHINE_TRANSITION") {
    terminalId = transitionFor(fixture.machineId, fixture.fromState, fixture.event)?.terminalId ?? "TERM-MALFORMED";
  } else if (vector.kind === "MACHINE_TRACE") {
    const machine = registry.controlMachines.find((item) => item.machineId === fixture.machineId);
    let state = machine?.initialState;
    let transition = null;
    for (const event of fixture.events) {
      transition = transitionFor(fixture.machineId, state, event);
      if (!transition) break;
      state = transition.toState;
    }
    terminalId = transition && state === fixture.expectedState ? transition.terminalId : "TERM-MALFORMED";
  } else if (vector.kind === "PUBLIC_PROJECTION") {
    const unsafe = fixture.payloadBytes !== registry.publicProjectionPolicy.onlyAllowedBytes || fixture.fieldClasses.some((fieldClass) => registry.publicProjectionPolicy.forbiddenFieldClasses.includes(fieldClass));
    terminalId = unsafe ? "TERM-PUBLIC-UNSAFE" : (fixture.requiredExternalBlocks?.some((id) => externalById.get(id)?.state === "MISSING-EXTERNAL-INPUT") ? "TERM-BLOCKED" : "TERM-MECHANICAL-CLEAN");
  } else if (vector.kind === "MEDIA_POLICY") {
    const metadata = fixture.metadata;
    const limits = registry.mediaContract.limits;
    const exceeds = metadata.byteLength > limits.maxEncodedBytes || metadata.width > limits.maxWidth || metadata.height > limits.maxHeight || metadata.width * metadata.height > limits.maxPixels || metadata.frameCount > limits.maxFrames;
    const decoderMissing = limits.approvedDecoderRoots.length === 0 || externalById.get(fixture.requiredExternalBlock)?.state === "MISSING-EXTERNAL-INPUT";
    terminalId = exceeds || decoderMissing || metadata.decoderDisagreement || !limits.allowedCodecSet.includes(metadata.declaredCodec) ? "TERM-MEDIA-QUARANTINED" : "TERM-MECHANICAL-CLEAN";
  } else if (vector.kind === "DEPENDENCY_COVERAGE") {
    terminalId = fixture.familyIds.length === registry.dependencyUniverse.familyRecords.length && new Set(fixture.instrumentedReads).size === registry.dependencyUniverse.instrumentedReads.length ? "TERM-MECHANICAL-CLEAN" : "TERM-DEPENDENCY-STALE";
  } else if (vector.kind === "MODEL_CHECK_ALL") {
    terminalId = [counters.undefinedGuards, counters.ambiguousStateEventPairs, counters.unhandledStateEventPairs, counters.missingInitialStates, counters.unreachableRequiredStates, counters.negativeToSuccess, counters.missingControlFamilies].every((value) => value === 0) ? "TERM-MECHANICAL-CLEAN" : "TERM-BLOCKED";
  }
  if (!terminalById.has(terminalId) || !policyRoots.has(vector.policyRoot)) terminalId = "TERM-MALFORMED";
  return { actualAuthorityOutputs: 0, actualTerminal: terminalId, vectorId: vector.vectorId };
};

const vectorResults = vectors.map(executeVector);
for (let index = 0; index < vectors.length; index += 1) {
  const vector = vectors[index];
  const result = vectorResults[index];
  const resultRoot = rooted("MPRR-V17-EXPECTED-VECTOR-RESULT", "1", result.vectorId, result.actualTerminal, String(result.actualAuthorityOutputs));
  if (result.actualTerminal !== vector.expectedTerminal || result.actualAuthorityOutputs !== vector.expectedAuthorityOutputs || resultRoot !== vector.expectedResultRoot) counters.vectorMismatch += 1;
}

const errorCounterNames = Object.keys(counters);
const status = errorCounterNames.every((key) => counters[key] === 0) ? "PASS" : "FAIL";
const vectorResultSetRoot = rooted("MPRR-V17-VECTOR-RESULT-SET", "1", ...vectorResults.map((result) => canonical(result)).sort());
const commonResultRoot = rooted("MPRR-V17-COMMON-QA-RESULT", "1", manifest.packageRoot, canonical(counters), vectorResultSetRoot);
const report = {
  Acceptance: 0,
  Gate29: "BLOCKED",
  authorityOutputs: 0,
  commonResultRoot,
  counters,
  developmentFreeze: "ACTIVE",
  independentReceipt: "MISSING-EXTERNAL-INPUT",
  manifestRoot: sha256(readFileSync(file("normative-package-manifest.json"))),
  packageRoot: manifest.packageRoot,
  readerId: "MPRR-V17-READER-A",
  readerKind: "PRODUCER-MECHANICAL;NOT-INDEPENDENT-HOSTILE-REVIEW",
  repository: "PUBLIC-PERMANENT",
  status,
  vectorResultSetRoot,
  verifiedCounts: {
    carriers: registry.sourceCarriers.length,
    closureRows: crosswalk.length,
    guards: registry.guards.length,
    outputs: outputs.length,
    predecessorClauseRows: predecessorClauses.length,
    predecessorRows: predecessor.length,
    predecessorSemanticPredicates: semanticPredicates.length,
    semanticUses: semanticUses.length,
    transitions: registry.controlTransitions.length,
    vectors: vectors.length,
  },
};
writeFileSync(file("qa-reader-a-report.json"), `${canonical(report)}\n`, "utf8");
if (status !== "PASS") process.exitCode = 1;
