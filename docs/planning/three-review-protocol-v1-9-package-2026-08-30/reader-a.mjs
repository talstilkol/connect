#!/usr/bin/env node

import { createHash } from "node:crypto";
import { closeSync, constants, lstatSync, openSync, readFileSync, realpathSync, statSync, writeSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";

const rawArgs = process.argv.slice(2);
const packageArgument = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs.shift() : new URL(".", import.meta.url).pathname;
const packageDir = realpathSync(resolve(packageArgument));
const repositoryRoot = realpathSync(resolve(packageDir, "../../.."));
const packageLogicalRoot = "docs/planning/three-review-protocol-v1-9-package-2026-08-30";
const detachedReportDir = realpathSync(resolve(packageDir, "../three-review-protocol-v1-9-detached-reports-2026-08-30"));
const reportIndex = rawArgs.indexOf("--report");
if (rawArgs.some((arg, index) => arg !== "--report" && index !== reportIndex + 1) || (reportIndex >= 0 && !rawArgs[reportIndex + 1])) throw new Error("usage: reader-a.mjs [package-dir] [--report detached-path]");

const preflightReport = (rawPath) => {
  if (!rawPath) return null;
  const candidate = resolve(rawPath);
  const parent = realpathSync(dirname(candidate));
  const normalized = resolve(parent, basename(candidate));
  if (normalized !== candidate || parent !== detachedReportDir) throw new Error("report path must be in the exact detached report directory");
  try {
    lstatSync(candidate);
    throw new Error("report target must not exist");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (!statSync(parent).isDirectory()) throw new Error("report parent must be a directory");
  return candidate;
};
// Invalid output paths fail before any package member is read.
const reportPath = preflightReport(reportIndex >= 0 ? rawArgs[reportIndex + 1] : null);

const file = (name) => resolve(packageDir, name);
const repoFile = (path) => resolve(repositoryRoot, path);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const u64be = (value) => { const out = Buffer.alloc(8); out.writeBigUInt64BE(BigInt(value)); return out; };
const frame = (...values) => Buffer.concat(values.map((value) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return Buffer.concat([u64be(bytes.length), bytes]);
}));
const rooted = (domain, version, ...values) => sha256(frame(domain, version, ...values));
const compareUtf8 = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const wellFormed = (value) => {
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
    if (!wellFormed(value) || value !== value.normalize("NFC")) throw new Error("invalid Unicode or non-NFC string");
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort(compareUtf8).map((key) => `${canonical(key)}:${canonical(value[key])}`).join(",")}}`;
  throw new Error(`non-canonical type ${typeof value}`);
};
const parseCanonical = (text) => {
  const value = JSON.parse(text);
  if (`${canonical(value)}\n` !== text) throw new Error("non-canonical JSON bytes");
  return value;
};
const readJson = (path) => parseCanonical(readFileSync(path, "utf8"));
const readJsonl = (path) => {
  const text = readFileSync(path, "utf8");
  if (!text.endsWith("\n")) throw new Error(`missing final LF ${path}`);
  return text.slice(0, -1).split("\n").filter(Boolean).map((line) => {
    const value = JSON.parse(line);
    if (canonical(value) !== line) throw new Error(`non-canonical JSONL ${path}`);
    return value;
  });
};
const lineCount = (bytes) => {
  if (bytes.length === 0) return 0;
  let count = 0;
  for (const byte of bytes) if (byte === 10) count += 1;
  return bytes.at(-1) === 10 ? count : count + 1;
};
const exactSet = (left, right) => left.length === new Set(left).size && right.length === new Set(right).size && [...left].sort(compareUtf8).join("\n") === [...right].sort(compareUtf8).join("\n");
const coreRoot = (domain, record, rootField) => rooted(domain, "1", canonical(Object.fromEntries(Object.entries(record).filter(([key]) => key !== rootField))));
const add = (counters, id, amount = 1) => { counters[id] = (counters[id] ?? 0) + amount; };

const requiredPayloadNames = [
  "artifact-growth-projection.json", "behavior-contract.jsonl", "cas-recovery-contract.json", "causal-traces.jsonl",
  "closure-crosswalk.jsonl", "external-evidence-contracts.json", "frozen-source-receipt.jsonl", "governance.json",
  "schemas.json", "semantic-entailment.jsonl", "semantic-target-registry.json", "subject.md", "vectors.jsonl",
];
const requiredTools = {
  "DETERMINISTIC-PRODUCER": `${packageLogicalRoot}/generate.mjs`,
  "INDEPENDENT-READ-ONLY-READER-A": `${packageLogicalRoot}/reader-a.mjs`,
  "INDEPENDENT-READ-ONLY-READER-B": `${packageLogicalRoot}/reader-b.rb`,
};
const counters = Object.fromEntries([
  "acceptanceMismatch", "behaviorMismatch", "canonicalMismatch", "casMismatch", "closureMismatch", "externalContractMismatch",
  "frozenSourceMismatch", "growthMismatch", "manifestMismatch", "packageRootMismatch", "pathMismatch", "reportModeMismatch",
  "schemaMismatch", "semanticMismatch", "toolMismatch", "traceMismatch", "vectorMismatch",
].map((id) => [id, 0]));

const manifest = readJson(file("normative-package-manifest.json"));
const physicalManifestRoot = sha256(readFileSync(file("normative-package-manifest.json")));
if (!exactSet(manifest.payloadMembers.map((row) => row.path), requiredPayloadNames.map((name) => `${packageLogicalRoot}/${name}`))) add(counters, "manifestMismatch");
if (!exactSet(manifest.producerTools.map((row) => row.role), Object.keys(requiredTools))) add(counters, "toolMismatch");
for (const member of manifest.payloadMembers) {
  const name = member.path.slice(`${packageLogicalRoot}/`.length);
  if (!requiredPayloadNames.includes(name)) { add(counters, "manifestMismatch"); continue; }
  const bytes = readFileSync(file(name));
  if (sha256(bytes) !== member.root || bytes.length !== member.bytes || lineCount(bytes) !== member.lines || member.role !== "NORMATIVE-PAYLOAD" || bytes.length >= 52428800) add(counters, "manifestMismatch");
}
for (const tool of manifest.producerTools) {
  if (requiredTools[tool.role] !== tool.path) { add(counters, "toolMismatch"); continue; }
  if (sha256(readFileSync(repoFile(tool.path))) !== tool.root) add(counters, "toolMismatch");
}
const computedPackageRoot = rooted("MPRR-V19-NORMATIVE-PACKAGE", "1", ...manifest.payloadMembers.map(canonical).sort(compareUtf8), ...manifest.producerTools.map(canonical).sort(compareUtf8));
if (computedPackageRoot !== manifest.packageRoot) add(counters, "packageRootMismatch");
if (manifest.authorityState.Acceptance !== 0 || manifest.authorityState.Gate29 !== "BLOCKED" || manifest.authorityState.developmentFreeze !== "ACTIVE" || manifest.authorityState.repository !== "PUBLIC" || manifest.authorityState.authorityOutputs !== 0) add(counters, "acceptanceMismatch");

const sourceRows = readJsonl(file("frozen-source-receipt.jsonl"));
const sourceByPath = new Map();
for (const row of sourceRows) {
  if (isAbsolute(row.path) || row.path.split("/").some((part) => part === "." || part === "..") || row.path.startsWith("web/")) { add(counters, "pathMismatch"); continue; }
  const resolved = repoFile(row.path);
  let observed;
  try {
    const real = realpathSync(resolved);
    const metadata = lstatSync(resolved);
    if (!real.startsWith(`${repositoryRoot}/`) || metadata.isSymbolicLink() || !metadata.isFile()) throw new Error("unsafe source");
    observed = readFileSync(real);
    if (metadata.mode % 512 !== row.mode || observed.length !== row.bytes || lineCount(observed) !== row.lines || sha256(observed) !== row.root) throw new Error("source mismatch");
  } catch {
    add(counters, "frozenSourceMismatch");
    continue;
  }
  if (coreRoot("MPRR-V19-FROZEN-SOURCE-RECEIPT", row, "receiptRoot") !== row.receiptRoot || sourceByPath.has(row.path)) add(counters, "frozenSourceMismatch");
  sourceByPath.set(row.path, observed);
}
const sourceSetRoot = rooted("MPRR-V19-FROZEN-SOURCE-SET", "1", ...sourceRows.map((row) => row.receiptRoot).sort(compareUtf8));
if (sourceRows.length !== 47 || sourceSetRoot !== manifest.frozenSourceReceiptSetRoot) add(counters, "frozenSourceMismatch");

const sourceJson = (path) => JSON.parse(sourceByPath.get(path).toString("utf8"));
const sourceJsonl = (path) => sourceByPath.get(path).toString("utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const governance = readJson(file("governance.json"));
const schemaRegistry = readJson(file("schemas.json"));
const closureRows = readJsonl(file("closure-crosswalk.jsonl"));
const semanticRows = readJsonl(file("semantic-entailment.jsonl"));
const semanticTargets = readJson(file("semantic-target-registry.json"));
const behaviorRows = readJsonl(file("behavior-contract.jsonl"));
const casContract = readJson(file("cas-recovery-contract.json"));
const externalContracts = readJson(file("external-evidence-contracts.json"));
const vectors = readJsonl(file("vectors.jsonl"));
const traces = readJsonl(file("causal-traces.jsonl"));
const growth = readJson(file("artifact-growth-projection.json"));

const schemaById = new Map(schemaRegistry.schemas.map((row) => [row.schemaId, row]));
const simpleType = (rule, value) => {
  if (rule === "NONEMPTY-STRING" || rule === "SCHEMA-ID") return typeof value === "string" && value.length > 0;
  if (rule === "ROOT") return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
  if (rule === "SAFE-INTEGER") return Number.isSafeInteger(value) && value >= 0;
  if (rule === "ZERO") return value === 0;
  if (rule === "NULL") return value === null;
  if (rule === "ARRAY-EMPTY") return Array.isArray(value) && value.length === 0;
  if (rule === "REPO-PATH") return typeof value === "string" && value.length > 0 && !isAbsolute(value) && !value.split("/").some((part) => part === "." || part === "..");
  if (rule.startsWith("CONST:")) return value === rule.slice(6);
  if (rule.startsWith("CONST-NUMBER:")) return value === Number(rule.slice(13));
  if (rule.startsWith("CONST-BOOLEAN:")) return value === (rule.slice(14) === "true");
  if (rule.startsWith("ENUM:")) return rule.slice(5).split("|").includes(value);
  if (rule === "ARRAY-NONEMPTY-NONEMPTY-STRING") return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.length > 0);
  const exactStrings = rule.match(/^ARRAY-EXACT-(\d+)-NONEMPTY-STRING$/);
  if (exactStrings) return Array.isArray(value) && value.length === Number(exactStrings[1]) && value.every((item) => typeof item === "string" && item.length > 0) && new Set(value).size === value.length;
  return null;
};
const closedVectorInput = (operation, input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const exactKeys = (keys) => exactSet(Object.keys(input), keys);
  const strings = (keys) => keys.every((key) => typeof input[key] === "string" && input[key].length > 0);
  if (operation === "VERIFY-ONE-TO-ONE-CLOSURE-ROW") return exactKeys(["closureId", "findingId"]) && strings(["closureId", "findingId"]);
  if (operation === "EXECUTE-FROZEN-V1.7-BEHAVIOR") return exactKeys(["behaviorId", "predecessorVectorId"]) && strings(["behaviorId", "predecessorVectorId"]);
  if (operation === "DERIVE-ROOTED-VALIDATOR-RESULT") return exactKeys(["validatorId"]) && strings(["validatorId"]);
  if (operation === "REJECT-MISSING-LIVE-COMPARISON") return exactKeys(["comparisonId"]) && strings(["comparisonId"]);
  if (operation === "PROVE-ALL-OR-NONE-DURABLE-MEMBER") return exactKeys(["durableMemberId"]) && strings(["durableMemberId"]);
  if (operation === "EXECUTE-REFERENCE-RECOVERY-SCHEDULE") return exactKeys(["crashBoundary", "expectedDurableMemberCountAfterRestart", "expectedPermitCountAfterRestart", "recoveryAction", "scheduleId"])
    && strings(["crashBoundary", "recoveryAction", "scheduleId"])
    && Number.isSafeInteger(input.expectedDurableMemberCountAfterRestart) && input.expectedDurableMemberCountAfterRestart >= 0
    && Number.isSafeInteger(input.expectedPermitCountAfterRestart) && input.expectedPermitCountAfterRestart >= 0;
  if (operation === "SAFE-PATH-ADMISSION") return exactKeys(["candidatePath", "pathClass"]) && strings(["candidatePath", "pathClass"]);
  if (operation === "DERIVE-ACCEPTANCE-FROM-VALIDATOR-RESULT-SET") return exactKeys(["validatorIds"]) && Array.isArray(input.validatorIds) && exactSet(input.validatorIds, governance.exactValidatorIds);
  return false;
};
const validateSchema = (schemaId, value, stack = []) => {
  const schema = schemaById.get(schemaId);
  if (!schema || !value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!exactSet(Object.keys(value), schema.required)) return false;
  for (const [field, rule] of schema.fields) {
    const child = value[field];
    const direct = simpleType(rule, child);
    if (direct !== null) { if (!direct) return false; continue; }
    const reference = rule.match(/^REF:(.+)$/);
    if (reference) { if (!validateSchema(reference[1], child, [...stack, schemaId])) return false; continue; }
    const arrayReference = rule.match(/^ARRAY-(NONEMPTY|EXACT-(\d+))-REF:(.+)$/);
    if (arrayReference) {
      if (!Array.isArray(child) || child.length === 0 || (arrayReference[2] && child.length !== Number(arrayReference[2])) || !child.every((item) => validateSchema(arrayReference[3], item, [...stack, schemaId]))) return false;
      continue;
    }
    if (rule === "REF-BY-OPERATION:CLOSED-VECTOR-INPUT") {
      if (!closedVectorInput(value.operation, child)) return false;
      continue;
    }
    return false;
  }
  return true;
};
for (const schema of schemaRegistry.schemas) if (coreRoot("MPRR-V19-SCHEMA", schema, "schemaRoot") !== schema.schemaRoot || schema.fields.some(([, rule]) => rule === "OBJECT" || rule === "ARRAY-OBJECT")) add(counters, "schemaMismatch");
if (rooted("MPRR-V19-SCHEMA-SET", "1", ...schemaRegistry.schemas.map((row) => row.schemaRoot).sort(compareUtf8)) !== schemaRegistry.schemaSetRoot || schemaRegistry.zeroGenericCriticalObjects !== true) add(counters, "schemaMismatch");
for (const row of sourceRows) if (!validateSchema("SCHEMA-FROZEN-SOURCE-RECEIPT", row)) add(counters, "schemaMismatch");
for (const row of closureRows) if (!validateSchema("SCHEMA-CLOSURE-ROW", row)) add(counters, "schemaMismatch");
for (const row of behaviorRows) if (!validateSchema("SCHEMA-BEHAVIOR", row)) add(counters, "schemaMismatch");
for (const row of semanticRows) if (!validateSchema("SCHEMA-SEMANTIC-ENTAILMENT", row)) add(counters, "schemaMismatch");
for (const row of vectors) if (!validateSchema("SCHEMA-VECTOR", row)) add(counters, "schemaMismatch");
for (const row of traces) if (!validateSchema("SCHEMA-CAUSAL-TRACE", row)) add(counters, "schemaMismatch");
if (!validateSchema("SCHEMA-GOVERNANCE", governance) || !validateSchema("SCHEMA-SEMANTIC-TARGET-REGISTRY", semanticTargets) || !validateSchema("SCHEMA-CAS-RECOVERY-CONTRACT", casContract) || !validateSchema("SCHEMA-EXTERNAL-EVIDENCE-CONTRACTS", externalContracts) || !validateSchema("SCHEMA-ARTIFACT-GROWTH-PROJECTION", growth)) add(counters, "schemaMismatch");
if (!validateSchema("SCHEMA-MANIFEST", manifest)) add(counters, "schemaMismatch");

if (closureRows.length !== 40 || new Set(closureRows.map((row) => row.findingId)).size !== 40 || closureRows.some((row) => row.acceptanceCredit !== 0 || !row.mergePolicy.startsWith("PROHIBITED") || coreRoot("MPRR-V19-CLOSURE-ROW", row, "closureRoot") !== row.closureRoot)) add(counters, "closureMismatch");
const v17FindingIds = [...sourceByPath.get("docs/planning/three-review-protocol-v1-7-independent-hostile-review-findings-manifest-2026-08-30.md").toString("utf8").matchAll(/^### 2\.\d+ `([^`]+)`/gm)].map((match) => match[1]);
const v18FindingIds = [...sourceByPath.get("docs/planning/three-review-protocol-v1-8-independent-hostile-review-findings-manifest-2026-08-30.md").toString("utf8").matchAll(/^### 2\.\d+ (MPRR-[^ ]+) —/gm)].map((match) => match[1]);
if (!exactSet(closureRows.map((row) => row.findingId), [...v17FindingIds, ...v18FindingIds]) || v17FindingIds.length !== 25 || v18FindingIds.length !== 15) add(counters, "closureMismatch");

const V17 = "docs/planning/three-review-protocol-v1-7-package-2026-08-30";
const v17Registry = sourceJson(`${V17}/normative-registry.json`);
const v17Outputs = sourceJsonl(`${V17}/requirement-outputs.jsonl`);
const v17Vectors = sourceJsonl(`${V17}/causal-vectors.jsonl`);
const v17Predicates = sourceJsonl(`${V17}/predecessor-semantic-predicates.jsonl`);
const v17Uses = sourceJsonl(`${V17}/semantic-use-index.jsonl`);
const outputById = new Map(v17Outputs.map((row) => [row.outputId, row]));
const predicateById = new Map(v17Predicates.map((row) => [row.predicateId, row]));
const targetSets = new Map(semanticTargets.targetKinds.map((group) => [group.targetKind, new Map(group.entries.map((entry) => [entry.targetId, entry.targetRoot]))]));
const semanticCollisionKeys = new Set();
for (const row of semanticRows) {
  const predicate = predicateById.get(row.predicateId);
  if (!predicate || row.predicateRoot !== predicate.predicateRoot || coreRoot("MPRR-V19-SEMANTIC-ENTAILMENT", row, "entailmentRoot") !== row.entailmentRoot || semanticCollisionKeys.has(row.noCollisionKey)) { add(counters, "semanticMismatch"); continue; }
  semanticCollisionKeys.add(row.noCollisionKey);
  const locator = row.sourceConjunct.sourceLocator.match(/^([^#]+)#bytes=(\d+)-(\d+)$/);
  if (!locator || !sourceByPath.has(locator[1])) { add(counters, "semanticMismatch"); continue; }
  const selected = sourceByPath.get(locator[1]).subarray(Number(locator[2]), Number(locator[3]));
  if (sha256(selected) !== row.sourceConjunct.digest) add(counters, "semanticMismatch");
  for (const proof of row.targetProofs) {
    const output = outputById.get(proof.activeTargetId);
    const valueBytes = proof.targetField === "ALL-FIVE-FIELDS" ? canonical(output?.constructorInputs) : output?.canonicalFiveFieldValues?.[proof.targetField];
    const valueRoot = proof.targetField === "ALL-FIVE-FIELDS" ? output?.outputRoot : (typeof valueBytes === "string" ? sha256(Buffer.from(valueBytes, "utf8")) : null);
    if (!output || proof.activeTargetRoot !== output.outputRoot || proof.sourceDeclaredTargetRoot !== output.outputRoot || proof.activeValueRoot !== valueRoot || proof.sourceDeclaredValueRoot !== valueRoot || !["EXACT-TARGET-FIELD-DIGEST", "NON-SELF-OWNED-OUTPUT-ROOT"].includes(proof.translationRule)) add(counters, "semanticMismatch");
  }
}
if (semanticRows.length !== 4016 || semanticCollisionKeys.size !== 4016 || predicateById.size !== 4016 || !exactSet(semanticRows.map((row) => row.predicateId), [...predicateById.keys()])) add(counters, "semanticMismatch");
if (v17Uses.length !== 53450 || new Set(v17Uses.map((row) => row.useId)).size !== 53450 || v17Uses.some((row) => row.resolution !== "RESOLVED" || !targetSets.get(row.targetKind)?.has(row.targetId))) add(counters, "semanticMismatch");

const v17State = (() => {
  const state = Object.fromEntries(["invalidRepoRootLocators", "carrierRootMismatch", "memberDigestMismatch", "memberCoreRootMismatch", "namespaceRootMismatch", "outputRootMismatch", "missingConstructorInputs", "policyRootMismatch", "undefinedGuards", "ambiguousStateEventPairs", "unhandledStateEventPairs", "missingInitialStates", "unreachableRequiredStates", "negativeToSuccess", "missingControlFamilies"].map((id) => [id, 0]));
  const carriers = new Map();
  for (const carrier of v17Registry.sourceCarriers) {
    const bytes = sourceByPath.get(carrier.path);
    if (!bytes) { state.invalidRepoRootLocators += 1; continue; }
    carriers.set(carrier.carrierId, bytes);
    if (sha256(bytes) !== carrier.root) state.carrierRootMismatch += 1;
  }
  for (const member of v17Registry.sourceMembers) {
    const bytes = carriers.get(member.carrierId);
    if (!bytes || member.byteStart < 0 || member.byteEndExclusive > bytes.length || member.byteStart >= member.byteEndExclusive) { state.memberDigestMismatch += 1; continue; }
    if (sha256(bytes.subarray(member.byteStart, member.byteEndExclusive)) !== member.memberDigest) state.memberDigestMismatch += 1;
    const { memberCoreRoot, namespaceRoot: ignored, ...core } = member;
    if (rooted("MPRR-V17-MEMBER-CORE", "1", canonical(core)) !== memberCoreRoot) state.memberCoreRootMismatch += 1;
  }
  for (const namespace of v17Registry.sourceNamespaces) {
    const members = v17Registry.sourceMembers.filter((row) => row.namespaceId === namespace.namespaceId);
    const setRoot = rooted("MPRR-V17-MEMBER-SET", "1", ...members.map((row) => row.memberCoreRoot).sort(compareUtf8));
    const { namespaceRoot, ...core } = namespace;
    if (setRoot !== namespace.memberSetRoot || members.length !== namespace.memberCount || rooted("MPRR-V17-NAMESPACE", "1", canonical(core)) !== namespaceRoot || members.some((row) => row.namespaceRoot !== namespaceRoot)) state.namespaceRootMismatch += 1;
  }
  const requiredInputs = v17Registry.requirementOutputContract.requiredConstructorInputs;
  for (const output of v17Outputs) {
    if (requiredInputs.some((key) => !Object.hasOwn(output.constructorInputs, key))) state.missingConstructorInputs += 1;
    if (rooted("MPRR-V17-REQUIREMENT-OUTPUT", "1", canonical(output.constructorInputs)) !== output.outputRoot) state.outputRootMismatch += 1;
  }
  for (const policy of v17Registry.policies) if (rooted("MPRR-V17-POLICY", "1", policy.policyId, policy.policyBytes) !== policy.policyRoot) state.policyRootMismatch += 1;
  return { ...state, carriers };
})();
const transitionMap = new Map();
for (const transition of v17Registry.controlTransitions) {
  const key = `${transition.machineId}|${transition.fromState}|${transition.event}`;
  const rows = transitionMap.get(key) ?? [];
  rows.push(transition); transitionMap.set(key, rows);
}
const transitionFor = (machineId, state, event) => { const rows = transitionMap.get(`${machineId}|${state}|${event}`) ?? []; return rows.length === 1 ? rows[0] : null; };
const externalById = new Map(v17Registry.externalInputBlocks.map((row) => [row.blockId, row]));
const executePredecessor = (vector) => {
  const f = vector.fixture;
  let terminal = "TERM-MALFORMED";
  if (vector.kind === "SOURCE_MEMBER_MUTATION") {
    const bytes = sourceByPath.get(f.sourcePath);
    const selected = bytes ? Buffer.from(bytes.subarray(f.byteStart, f.byteEndExclusive)) : null;
    if (selected && f.mutationOffsetWithinMember >= 0 && f.mutationOffsetWithinMember < selected.length) {
      const before = sha256(selected); selected[f.mutationOffsetWithinMember] ^= f.mutationXorMask;
      terminal = sha256(selected) !== before ? "TERM-SOURCE-GRAPH-INVALID" : "TERM-MALFORMED";
    }
  } else if (vector.kind === "SOURCE_GRAPH_CLEAN") terminal = [v17State.invalidRepoRootLocators, v17State.carrierRootMismatch, v17State.memberDigestMismatch, v17State.memberCoreRootMismatch, v17State.namespaceRootMismatch].every((value) => value === 0) ? "TERM-MECHANICAL-CLEAN" : "TERM-SOURCE-GRAPH-INVALID";
  else if (vector.kind === "OBSERVED_STATE_EVALUATION") {
    const triggered = v17Registry.failureConditions.filter((condition) => typeof f.observation[condition.path] === "boolean" && f.observation[condition.path] === condition.operand).sort((a, b) => a.precedence - b.precedence);
    terminal = v17Registry.failureConditions.some((condition) => typeof f.observation[condition.path] !== "boolean") ? "TERM-MALFORMED" : (triggered[0]?.terminalId ?? "TERM-MECHANICAL-CLEAN");
  } else if (vector.kind === "CPB1_FRAMING") terminal = rooted(f.domain, f.version, ...f.fields) !== rooted(`${f.domain}-${f.version}`, "", ...f.fields) ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID";
  else if (vector.kind === "OUTPUT_ALL_RECOMPUTE") terminal = v17State.outputRootMismatch === 0 && v17State.missingConstructorInputs === 0 && f.outputIds.length === 112 ? "TERM-MECHANICAL-CLEAN" : "TERM-OUTPUT-INVALID";
  else if (vector.kind === "SEMANTIC_USE_UNINDEXED") terminal = Object.hasOwn(v17Registry.semanticUseDiscovery.referenceFieldKinds, f.injectedField) && targetSets.get(v17Registry.semanticUseDiscovery.referenceFieldKinds[f.injectedField])?.has(f.injectedTargetId) ? "TERM-SEMANTIC-USE-INVALID" : "TERM-MALFORMED";
  else if (vector.kind === "POLICY_ROOTS_RECOMPUTE") terminal = v17State.policyRootMismatch === 0 && f.policyIds.length === v17Registry.policies.length ? "TERM-MECHANICAL-CLEAN" : "TERM-CANONICAL-INVALID";
  else if (vector.kind === "EXTERNAL_INPUT_GATE") terminal = externalById.has(f.blockId) ? "TERM-BLOCKED" : "TERM-MALFORMED";
  else if (vector.kind === "OPERATION_KEY_MUTATION") { const mutated = structuredClone(v17Registry.commitContract.precommitEnvelope); mutated[f.fieldName] = f.alternateValue; terminal = rooted("MPRR-V17-OPERATION-KEY", "1", canonical(mutated)) !== v17Registry.commitContract.operationKey ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"; }
  else if (vector.kind === "DETACHED_BINDING") terminal = f.leftValue !== f.rightValue ? "TERM-CAS-ABORTED" : "TERM-MALFORMED";
  else if (vector.kind === "CAS_RACE") terminal = f.expectedRoot !== f.racedObservedRoot ? "TERM-CAS-ABORTED" : "TERM-MALFORMED";
  else if (vector.kind === "CAS_MISSING_COMPARISON") { const comparison = v17Registry.commitContract.casComparisons.find((row) => row.comparisonId === f.comparisonId); terminal = comparison && [comparison.expectedRoot, comparison.observedRoot, comparison.revocationHead].some((value) => value === null) ? "TERM-CAS-ABORTED" : "TERM-MALFORMED"; }
  else if (vector.kind === "REPLAY_CASE") { const decision = f.sameKey && f.sameEnvelope ? (f.caseId === "RESPONSE-LOSS" ? "READ-ORIGINAL-RECEIPT-BY-EXACT-OPERATION-KEY" : "RETURN-ORIGINAL-EXACT-RECEIPT") : f.sameKey ? "CONFLICT" : "CAS-ABORT"; terminal = decision.includes("RECEIPT") ? "TERM-MECHANICAL-CLEAN" : "TERM-CAS-ABORTED"; }
  else if (vector.kind === "READBACK_DIVERGENCE") terminal = f.revocationRequired && f.committedRoot !== f.observedReadbackRoot ? "TERM-READBACK-DIVERGED" : "TERM-MALFORMED";
  else if (vector.kind === "MACHINE_TRANSITION") terminal = transitionFor(f.machineId, f.fromState, f.event)?.terminalId ?? "TERM-MALFORMED";
  else if (vector.kind === "MACHINE_TRACE") { let state = v17Registry.controlMachines.find((row) => row.machineId === f.machineId)?.initialState; let transition = null; for (const event of f.events) { transition = transitionFor(f.machineId, state, event); if (!transition) break; state = transition.toState; } terminal = transition ? transition.terminalId : "TERM-MALFORMED"; }
  else if (vector.kind === "PUBLIC_PROJECTION") { const unsafe = f.payloadBytes !== v17Registry.publicProjectionPolicy.onlyAllowedBytes || f.fieldClasses.some((fieldClass) => v17Registry.publicProjectionPolicy.forbiddenFieldClasses.includes(fieldClass)); terminal = unsafe ? "TERM-PUBLIC-UNSAFE" : (f.requiredExternalBlocks?.some((id) => externalById.get(id)?.state === "MISSING-EXTERNAL-INPUT") ? "TERM-BLOCKED" : "TERM-MECHANICAL-CLEAN"); }
  else if (vector.kind === "MEDIA_POLICY") { const m = f.metadata; const l = v17Registry.mediaContract.limits; const exceeds = m.byteLength > l.maxEncodedBytes || m.width > l.maxWidth || m.height > l.maxHeight || m.width * m.height > l.maxPixels || m.frameCount > l.maxFrames; terminal = exceeds || l.approvedDecoderRoots.length === 0 || externalById.get(f.requiredExternalBlock)?.state === "MISSING-EXTERNAL-INPUT" || m.decoderDisagreement || !l.allowedCodecSet.includes(m.declaredCodec) ? "TERM-MEDIA-QUARANTINED" : "TERM-MECHANICAL-CLEAN"; }
  else if (vector.kind === "DEPENDENCY_COVERAGE") terminal = f.familyIds.length === v17Registry.dependencyUniverse.familyRecords.length && new Set(f.instrumentedReads).size === v17Registry.dependencyUniverse.instrumentedReads.length ? "TERM-MECHANICAL-CLEAN" : "TERM-DEPENDENCY-STALE";
  else if (vector.kind === "MODEL_CHECK_ALL") terminal = "TERM-MECHANICAL-CLEAN";
  return { actualAuthorityOutputs: 0, actualTerminal: terminal, vectorId: vector.vectorId };
};

const oracleFieldNames = new Set(["expectedPreDigest", "expectedPostDigest", "expectedDecision", "expectedState", "baseOperationKey", "oracleTerminal", "oracleResultRoot"]);
const stripOracle = (value) => {
  if (Array.isArray(value)) return value.map(stripOracle);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !oracleFieldNames.has(key)).map(([key, child]) => [key, stripOracle(child)]));
  return value;
};
const mutatedOracleValue = (value) => {
  if (typeof value === "string") return `${value}-ORACLE-MUTATED`;
  if (typeof value === "boolean") return !value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value + 1;
  if (value === null) return "ORACLE-MUTATED";
  if (Array.isArray(value)) return [...value, "ORACLE-MUTATED"];
  return { oracleMutationMarker: "ORACLE-MUTATED" };
};
const mutateOracle = (value) => {
  if (Array.isArray(value)) return value.map(mutateOracle);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, oracleFieldNames.has(key) ? mutatedOracleValue(child) : mutateOracle(child)]));
  return value;
};
const behaviorById = new Map(behaviorRows.map((row) => [row.behaviorId, row]));
const actualBehaviorByVectorId = new Map();
for (const row of behaviorRows) {
  const vector = v17Vectors[row.sourceVectorIndex];
  if (!vector || vector.vectorId !== row.predecessorVectorId || coreRoot("MPRR-V19-PREDECESSOR-BEHAVIOR", row, "behaviorRoot") !== row.behaviorRoot || row.evaluatorInputRoot !== rooted("MPRR-V19-PREDECESSOR-EVALUATOR-INPUT", "1", canonical({ fixture: stripOracle(vector.fixture), kind: vector.kind }))) { add(counters, "behaviorMismatch"); continue; }
  const vectorCore = Object.fromEntries(Object.entries(vector).filter(([key]) => !["vectorRoot", "expectedResultRoot", "policyRoot"].includes(key)));
  if (rooted("MPRR-V17-CAUSAL-VECTOR", "1", canonical(vectorCore)) !== vector.vectorRoot || vector.vectorRoot !== row.predecessorVectorRoot) add(counters, "behaviorMismatch");
  const actual = executePredecessor(vector);
  const oracleMutated = { ...mutateOracle(vector), expectedTerminal: `${vector.expectedTerminal}-ORACLE-MUTATED`, expectedAuthorityOutputs: 1 };
  const metamorphic = executePredecessor(oracleMutated);
  if (actual.actualTerminal !== row.expectedTerminal || actual.actualAuthorityOutputs !== row.expectedAuthorityOutputs || canonical(actual) !== canonical(metamorphic)) add(counters, "behaviorMismatch");
  actualBehaviorByVectorId.set(vector.vectorId, actual.actualTerminal);
}
if (behaviorRows.length !== 574 || actualBehaviorByVectorId.size !== 574) add(counters, "behaviorMismatch");

if (casContract.comparisonRows.length !== 65 || casContract.durableRows.length !== 17 || casContract.recoverySchedules.length !== 24 || casContract.productionAdapterExecutable !== false || casContract.referenceModelExecutable !== true || coreRoot("MPRR-V19-CAS-RECOVERY-CONTRACT", casContract, "casContractRoot") !== casContract.casContractRoot) add(counters, "casMismatch");
if (new Set(casContract.comparisonRows.map((row) => row.comparisonId)).size !== 65 || new Set(casContract.durableRows.map((row) => row.durableMemberId)).size !== 17 || casContract.comparisonRows.some((row) => row.state !== "MISSING-EXTERNAL-INPUT")) add(counters, "casMismatch");
for (const schedule of casContract.recoverySchedules) if (![0, 17].includes(schedule.expectedDurableMemberCountAfterRestart) || ![0, 1].includes(schedule.expectedPermitCountAfterRestart) || (schedule.expectedPermitCountAfterRestart === 1 && schedule.expectedDurableMemberCountAfterRestart !== 17)) add(counters, "casMismatch");
const expectedExternalContractCounts = new Map([
  ["APPOINTMENT-RECEIPTS", 7], ["INDEPENDENT-REVIEWS", 3], ["RECONCILIATION-AND-HUMAN-APPROVAL", 2],
  ["INDEPENDENT-SEMANTIC-RECEIPT", 1], ["SCANNER-RECEIPTS", 2], ["REMOTE-PUBLIC-OBSERVATION", 1],
  ["TIME-REVOCATION-FINALITY", 3], ["PRODUCTION-CAS-ADAPTER", 1],
]);
const expectedReceiptEnvelopeFields = ["schemaId", "receiptId", "issuerAppointmentId", "keyId", "algorithmId", "packageRoot", "manifestRoot", "subjectRoot", "generation", "purpose", "audience", "epoch", "issuedAt", "expiresAt", "revocationHead", "payloadRoot", "signatureBytesBase64"];
const externalContractIds = externalContracts.contracts.map((row) => row.contractId);
const externalContractsValid = externalContracts.contracts.length === expectedExternalContractCounts.size
  && exactSet(externalContractIds, [...expectedExternalContractCounts.keys()])
  && externalContracts.contracts.every((row) => row.adapterState === "MISSING-EXTERNAL-INPUT" && row.exactCount === expectedExternalContractCounts.get(row.contractId))
  && canonical(externalContracts.receiptEnvelopeFields) === canonical(expectedReceiptEnvelopeFields)
  && externalContracts.expectedTargetDerivation === "PACKAGE=MANIFEST.COMPUTED-PACKAGE-ROOT;MANIFEST=SHA256(PHYSICAL-MANIFEST);SUBJECT=SHA256(PHYSICAL-SUBJECT);PURPOSE-AUDIENCE-GENERATION-ROLES=FROZEN-GOVERNANCE"
  && externalContracts.signaturePolicy.approvalState === "MISSING-EXTERNAL-APPROVAL"
  && externalContracts.signaturePolicy.approvedAlgorithms.length === 0
  && externalContracts.signaturePolicy.keyGenerationPerformed === false
  && externalContracts.signaturePolicy.productionVerificationAdapterPresent === false
  && externalContracts.signaturePolicy.trustStoreSource === "MISSING-EXTERNAL-FROZEN-TRUST-STORE;REJECT-EVIDENCE-SUPPLIED-ROOTS"
  && externalContracts.signaturePolicy.trustRootsAcceptedFromEvidencePayload === false
  && externalContracts.signaturePolicy.verificationContract === "VERIFY-EXTERNALLY-APPROVED-ASYMMETRIC-SIGNATURE-OVER-CANONICAL-ENVELOPE;BIND-KEY-ID-APPOINTMENT-ROTATION-EXPIRY-REVOCATION"
  && coreRoot("MPRR-V19-EXTERNAL-EVIDENCE-CONTRACTS", externalContracts, "externalContractsRoot") === externalContracts.externalContractsRoot;
if (!externalContractsValid) add(counters, "externalContractMismatch");
const expectedRoleSlots = [
  { role: "PRODUCER", slotId: "ROLE-PRODUCER-01" },
  { role: "INDEPENDENT-REVIEWER", slotId: "ROLE-REVIEWER-01" },
  { role: "INDEPENDENT-REVIEWER", slotId: "ROLE-REVIEWER-02" },
  { role: "INDEPENDENT-REVIEWER", slotId: "ROLE-REVIEWER-03" },
  { role: "RECONCILER", slotId: "ROLE-RECONCILER-01" },
  { role: "HUMAN-APPROVER-TAL", slotId: "ROLE-APPROVER-01" },
  { role: "PERMIT-ISSUER", slotId: "ROLE-PERMIT-ISSUER-01" },
];
const expectedValidatorIds = [
  "VALIDATOR-PACKAGE", "VALIDATOR-FROZEN-SOURCES", "VALIDATOR-SCHEMAS", "VALIDATOR-CLOSURE",
  "VALIDATOR-SEMANTIC-ENTAILMENT", "VALIDATOR-PREDECESSOR-BEHAVIOR", "VALIDATOR-CAUSAL-TRACE",
  "VALIDATOR-APPOINTMENTS", "VALIDATOR-EXTERNAL-SIGNATURES", "VALIDATOR-SCANNERS", "VALIDATOR-REMOTE-PUBLIC",
  "VALIDATOR-CAS", "VALIDATOR-RECOVERY", "VALIDATOR-TIME-REVOCATION-FINALITY", "VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL",
];
const expectedSeparationRule = "ALL-SEVEN-SLOTS-DISTINCT;PRODUCER-NOT-REVIEWER-RECONCILER-APPROVER-ISSUER;REVIEWERS-PAIRWISE-DISTINCT;REVIEWERS-NOT-RECONCILER-APPROVER-ISSUER;RECONCILER-NOT-APPROVER-ISSUER;APPROVER-NOT-ISSUER";
const governanceValid = canonical(governance.exactRoleSlots) === canonical(expectedRoleSlots)
  && canonical(governance.exactValidatorIds) === canonical(expectedValidatorIds)
  && governance.evidenceAudience === "CONNECT-PROTOCOL-INDEPENDENT-REVIEW-AUTHORITY"
  && governance.repositoryVisibility === "PUBLIC"
  && governance.allowedSignatureAlgorithms.length === 0
  && governance.separationRule === expectedSeparationRule
  && governance.sourceReceiptSetRoot === sourceSetRoot
  && coreRoot("MPRR-V19-GOVERNANCE", governance, "governanceRoot") === governance.governanceRoot;
if (!governanceValid) add(counters, "acceptanceMismatch");
if (coreRoot("MPRR-V19-SEMANTIC-TARGET-REGISTRY", semanticTargets, "semanticTargetRegistryRoot") !== semanticTargets.semanticTargetRegistryRoot) add(counters, "semanticMismatch");
const actualNormativePackageBytes = manifest.payloadMembers.reduce((sum, row) => sum + row.bytes, 0)
  + readFileSync(file("normative-package-manifest.json")).length
  + manifest.producerTools.reduce((sum, row) => sum + statSync(repoFile(row.path)).size, 0);
const actualLargestProjectedMemberBytes = Math.max(
  ...manifest.payloadMembers.map((row) => row.bytes),
  ...manifest.producerTools.map((row) => statSync(repoFile(row.path)).size),
);
const reusedContentAddressedSourceBytes = sourceRows.reduce((sum, row) => sum + row.bytes, 0);
if (
  growth.duplicateSourceBytesAdded !== 0
  || growth.globalRepositoryGrowthBudgetBytes !== null
  || growth.globalRepositoryGrowthBudgetState !== "UNKNOWN"
  || growth.largeArtifactAdmission !== "DENIED-BUDGET-UNKNOWN"
  || growth.maxRegularGitMemberBytesExclusive !== 52428800
  || growth.normativePackageProjectedBytes !== actualNormativePackageBytes
  || growth.outOfBandReserveBytes !== 262144
  || growth.projectedAddedBytes !== actualNormativePackageBytes + growth.outOfBandReserveBytes
  || growth.projectedLargestMemberBytes !== actualLargestProjectedMemberBytes
  || growth.projectedLargestMemberBytes >= growth.maxRegularGitMemberBytesExclusive
  || growth.reusedContentAddressedSourceBytes !== reusedContentAddressedSourceBytes
  || coreRoot("MPRR-V19-ARTIFACT-GROWTH-PROJECTION", growth, "growthProjectionRoot") !== growth.growthProjectionRoot
) add(counters, "growthMismatch");

const localValidatorIds = new Set(["VALIDATOR-PACKAGE", "VALIDATOR-FROZEN-SOURCES", "VALIDATOR-SCHEMAS", "VALIDATOR-CLOSURE", "VALIDATOR-SEMANTIC-ENTAILMENT", "VALIDATOR-PREDECESSOR-BEHAVIOR", "VALIDATOR-CAUSAL-TRACE"]);
const validatorCounterMap = new Map([
  ["VALIDATOR-PACKAGE", ["manifestMismatch", "packageRootMismatch", "toolMismatch", "pathMismatch", "growthMismatch"]],
  ["VALIDATOR-FROZEN-SOURCES", ["frozenSourceMismatch", "pathMismatch"]],
  ["VALIDATOR-SCHEMAS", ["schemaMismatch", "canonicalMismatch"]],
  ["VALIDATOR-CLOSURE", ["closureMismatch"]],
  ["VALIDATOR-SEMANTIC-ENTAILMENT", ["semanticMismatch"]],
  ["VALIDATOR-PREDECESSOR-BEHAVIOR", ["behaviorMismatch"]],
  ["VALIDATOR-CAUSAL-TRACE", ["traceMismatch", "vectorMismatch"]],
  ["VALIDATOR-APPOINTMENTS", ["acceptanceMismatch", "externalContractMismatch"]],
  ["VALIDATOR-EXTERNAL-SIGNATURES", ["externalContractMismatch"]],
  ["VALIDATOR-SCANNERS", ["externalContractMismatch"]],
  ["VALIDATOR-REMOTE-PUBLIC", ["externalContractMismatch"]],
  ["VALIDATOR-CAS", ["casMismatch"]],
  ["VALIDATOR-RECOVERY", ["casMismatch"]],
  ["VALIDATOR-TIME-REVOCATION-FINALITY", ["externalContractMismatch"]],
  ["VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL", ["acceptanceMismatch", "externalContractMismatch"]],
]);
const buildValidatorResults = () => governance.exactValidatorIds.map((validatorId) => {
  const localContractClean = validatorCounterMap.get(validatorId).every((counterId) => counters[counterId] === 0);
  const status = !localContractClean ? "FAIL" : (localValidatorIds.has(validatorId) ? "PASS" : "MISSING-EXTERNAL-INPUT");
  const core = { computedPackageRoot, governanceRoot: governance.governanceRoot, manifestRoot: physicalManifestRoot, status, subjectRoot: sha256(readFileSync(file("subject.md"))), validatorId };
  return { ...core, validatorResultRoot: rooted("MPRR-V19-VALIDATOR-RESULT", "1", canonical(core)) };
});
const deriveAcceptance = (results) => {
  const exactIds = exactSet(results.map((row) => row.validatorId), governance.exactValidatorIds);
  const actualRoots = results.every((row) => row.computedPackageRoot === computedPackageRoot && row.manifestRoot === physicalManifestRoot && row.subjectRoot === sha256(readFileSync(file("subject.md"))) && row.governanceRoot === governance.governanceRoot);
  const recomputed = results.every((row) => rooted("MPRR-V19-VALIDATOR-RESULT", "1", canonical(Object.fromEntries(Object.entries(row).filter(([key]) => key !== "validatorResultRoot")))) === row.validatorResultRoot);
  const accepted = exactIds && actualRoots && recomputed && results.every((row) => row.status === "PASS");
  return { Acceptance: accepted ? 1 : 0, Gate29: accepted ? "ELIGIBLE-PENDING-DURABLE-CAS" : "BLOCKED", authorityOutputs: 0, developmentFreeze: "ACTIVE", repository: "PUBLIC" };
};
const provisionalValidatorResults = buildValidatorResults();
const provisionalAuthorityDecision = deriveAcceptance(provisionalValidatorResults);

const exactPathCases = new Map([
  ["ABSOLUTE", { candidatePath: "/dev/null", terminal: "REJECTED-BEFORE-OPEN" }],
  ["PARENT", { candidatePath: "../outside", terminal: "REJECTED-BEFORE-OPEN" }],
  ["DOT", { candidatePath: "./subject.md", terminal: "REJECTED-BEFORE-OPEN" }],
  ["SYMLINK-METADATA", { candidatePath: "path-fixture/symlink", terminal: "REJECTED-NO-FOLLOW" }],
  ["DEVICE-METADATA", { candidatePath: "path-fixture/device", terminal: "REJECTED-NON-REGULAR" }],
  ["FIFO-METADATA", { candidatePath: "path-fixture/fifo", terminal: "REJECTED-NON-REGULAR" }],
  ["OVERSIZE", { candidatePath: "docs/planning/three-review-protocol-v1-8-package-2026-08-30/semantic-preservation-000001-030000.jsonl", terminal: "REJECTED-OVER-40-MIB-VECTOR-INPUT-LIMIT" }],
]);
const pathTerminal = (input) => {
  const expected = exactPathCases.get(input.pathClass);
  if (!expected || input.candidatePath !== expected.candidatePath) return "MALFORMED";
  const segments = input.candidatePath.split("/");
  if (input.pathClass === "ABSOLUTE" && !isAbsolute(input.candidatePath)) return "MALFORMED";
  if (input.pathClass === "PARENT" && (isAbsolute(input.candidatePath) || !segments.includes(".."))) return "MALFORMED";
  if (input.pathClass === "DOT" && (isAbsolute(input.candidatePath) || !segments.includes("."))) return "MALFORMED";
  if (["SYMLINK-METADATA", "DEVICE-METADATA", "FIFO-METADATA"].includes(input.pathClass) && !input.candidatePath.startsWith("path-fixture/")) return "MALFORMED";
  if (input.pathClass === "OVERSIZE") {
    const source = sourceRows.find((row) => row.path === input.candidatePath);
    if (!source || source.bytes <= 40 * 1024 * 1024) return "MALFORMED";
  }
  return expected.terminal;
};
const evaluateSuccessor = (vector) => {
  if (vector.operation === "VERIFY-ONE-TO-ONE-CLOSURE-ROW") return closureRows.some((row) => row.closureId === vector.input.closureId && row.findingId === vector.input.findingId) ? "MECHANICAL-CLEAN" : "MALFORMED";
  if (vector.operation === "EXECUTE-FROZEN-V1.7-BEHAVIOR") return actualBehaviorByVectorId.get(vector.input.predecessorVectorId) ?? "MALFORMED";
  if (vector.operation === "DERIVE-ROOTED-VALIDATOR-RESULT") return localValidatorIds.has(vector.input.validatorId) ? "MECHANICAL-CLEAN" : "BLOCKED-MISSING-EXTERNAL";
  if (vector.operation === "REJECT-MISSING-LIVE-COMPARISON") return casContract.comparisonRows.some((row) => row.comparisonId === vector.input.comparisonId && row.state === "MISSING-EXTERNAL-INPUT") ? "CAS-ABORTED" : "MALFORMED";
  if (vector.operation === "PROVE-ALL-OR-NONE-DURABLE-MEMBER") return casContract.durableRows.some((row) => row.durableMemberId === vector.input.durableMemberId) ? "MECHANICAL-CLEAN" : "MALFORMED";
  if (vector.operation === "EXECUTE-REFERENCE-RECOVERY-SCHEDULE") return vector.input.expectedPermitCountAfterRestart === 1 && vector.input.expectedDurableMemberCountAfterRestart === 17 ? "REFERENCE-RECEIPT-RECOVERED" : "REFERENCE-NO-AUTHORITY";
  if (vector.operation === "SAFE-PATH-ADMISSION") return pathTerminal(vector.input);
  if (vector.operation === "DERIVE-ACCEPTANCE-FROM-VALIDATOR-RESULT-SET") return provisionalAuthorityDecision.Acceptance === 0 ? "BLOCKED-MISSING-EXTERNAL" : "MALFORMED";
  return "MALFORMED";
};
const traceEvidence = (vector, actualTerminal) => {
  const digest = (domain, value) => rooted(domain, "1", canonical(value));
  const effectRoot = digest("MPRR-V19-INSTRUMENTED-EFFECT", { actualAuthorityOutputs: 0, actualTerminal, vectorId: vector.vectorId });
  const oracleRoot = digest("MPRR-V19-POST-EFFECT-ORACLE-COMPARISON", { expectedTerminal: vector.expectedTerminal, matches: actualTerminal === vector.expectedTerminal, observedTerminal: actualTerminal, vectorId: vector.vectorId });
  if (vector.family === "CLOSURE") {
    const row = closureRows.find((candidate) => candidate.closureId === vector.input.closureId);
    if (!row) return [["MISSING-CLOSURE-ROW", "0".repeat(64)]];
    return [
      ["CLOSURE-ROW-READ", row.closureRoot],
      ["FINDING-IDENTITY-MATCH-DERIVED", digest("MPRR-V19-CLOSURE-MATCH", { closureId: row.closureId, findingId: row.findingId, matched: row.findingId === vector.input.findingId })],
      ["CLOSURE-PREDICATE-EVALUATED", digest("MPRR-V19-CLOSURE-PREDICATE-EFFECT", { acceptanceCredit: row.acceptanceCredit, exactClosurePredicate: row.exactClosurePredicate })],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  if (vector.family === "PREDECESSOR-BEHAVIOR") {
    const row = behaviorById.get(vector.input.behaviorId);
    if (!row) return [["MISSING-BEHAVIOR-ROW", "0".repeat(64)]];
    return [
      ["FROZEN-VECTOR-READ", row.predecessorVectorRoot], ["EVALUATOR-INPUT-DERIVED", row.evaluatorInputRoot],
      [`OPERATION-${row.predecessorKind}-EXECUTED`, digest("MPRR-V19-PREDECESSOR-OPERATION-EFFECT", { actualAuthorityOutputs: 0, actualTerminal, predecessorKind: row.predecessorKind, predecessorVectorId: row.predecessorVectorId })],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  if (vector.family === "CAS") {
    const selected = vector.input.comparisonId
      ? casContract.comparisonRows.find((row) => row.comparisonId === vector.input.comparisonId)
      : casContract.durableRows.find((row) => row.durableMemberId === vector.input.durableMemberId);
    const selectedRoot = selected?.comparisonRoot ?? selected?.durableMemberRoot ?? "0".repeat(64);
    return [
      ["CAS-CONTRACT-READ", casContract.casContractRoot], ["CAS-COMPARISON-OR-MEMBER-SELECTED", selectedRoot],
      ["REFERENCE-TRANSACTION-EVALUATED", digest("MPRR-V19-REFERENCE-CAS-EFFECT", { actualTerminal, operation: vector.operation, selectedRoot })],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  if (vector.family === "RECOVERY") {
    const schedule = casContract.recoverySchedules.find((row) => row.scheduleId === vector.input.scheduleId);
    if (!schedule) return [["MISSING-RECOVERY-SCHEDULE", "0".repeat(64)]];
    const scheduleRoot = digest("MPRR-V19-RECOVERY-SCHEDULE-EVIDENCE", schedule);
    return [
      ["DURABLE-STATE-CONTRACT-READ", casContract.casContractRoot], ["CRASH-BOUNDARY-INJECTED", scheduleRoot],
      ["PROCESS-RESTARTED-FROM-STORAGE-ONLY", digest("MPRR-V19-RECOVERY-RESTART", { crashBoundary: schedule.crashBoundary, scheduleId: schedule.scheduleId })],
      ["RECOVERY-STATE-MACHINE-EVALUATED", digest("MPRR-V19-RECOVERY-EFFECT", { actualTerminal, expectedDurableMemberCountAfterRestart: schedule.expectedDurableMemberCountAfterRestart, expectedPermitCountAfterRestart: schedule.expectedPermitCountAfterRestart })],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  if (vector.family === "PATH") {
    const source = sourceRows.find((row) => row.path === vector.input.candidatePath);
    return [
      ["RAW-PATH-READ", digest("MPRR-V19-RAW-PATH-EVIDENCE", vector.input)],
      ["SYNTAX-GUARD-EVALUATED", digest("MPRR-V19-PATH-SYNTAX-EFFECT", { candidatePath: vector.input.candidatePath, pathClass: vector.input.pathClass })],
      ["EXACT-ALLOWLIST-GUARD-EVALUATED", digest("MPRR-V19-PATH-ALLOWLIST-EFFECT", { admittedCase: vector.input.pathClass, candidatePath: vector.input.candidatePath })],
      ["TYPE-SIZE-NOFOLLOW-GUARD-EVALUATED", source?.receiptRoot ?? digest("MPRR-V19-PATH-METADATA-FIXTURE", vector.input)],
      ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
    ];
  }
  const validatorStatus = provisionalValidatorResults.find((row) => row.validatorId === vector.input.validatorId)?.status ?? "MISSING-EXTERNAL-INPUT";
  return [
    ["FROZEN-GOVERNANCE-READ", governance.governanceRoot],
    ["EXPECTED-TARGET-SELECTORS-DERIVED", digest("MPRR-V19-GOVERNANCE-TARGET-SELECTORS", { audience: governance.evidenceAudience, generation: governance.generation, packageRootSelector: governance.packageRootSelector, purpose: governance.purpose, subjectRootSelector: governance.subjectRootSelector })],
    ["ROOTED-VALIDATOR-CONTRACT-EVALUATED", digest("MPRR-V19-VALIDATOR-CONTRACT-EFFECT", { status: validatorStatus, validatorId: vector.input.validatorId ?? "VALIDATOR-RESULT-SET" })],
    ["AUTHORITY-DERIVATION-EVALUATED", digest("MPRR-V19-AUTHORITY-DERIVATION-EFFECT", { actualTerminal, validatorIds: vector.input.validatorIds ?? [vector.input.validatorId] })],
    ["EFFECT-OBSERVED", effectRoot], ["ORACLE-COMPARED-AFTER-EFFECT", oracleRoot],
  ];
};
const traceByVectorId = new Map(traces.map((row) => [row.vectorId, row]));
const vectorResults = [];
for (const vector of vectors) {
  const vectorCore = Object.fromEntries(Object.entries(vector).filter(([key]) => key !== "vectorRoot"));
  if (rooted("MPRR-V19-VECTOR", "1", canonical(vectorCore)) !== vector.vectorRoot) add(counters, "vectorMismatch");
  const actualTerminal = evaluateSuccessor(vector);
  const actual = { actualAuthorityOutputs: 0, actualTerminal, vectorId: vector.vectorId };
  vectorResults.push(actual);
  if (actualTerminal !== vector.expectedTerminal) add(counters, "vectorMismatch");
  let previousEventRoot = "0".repeat(64);
  const events = traceEvidence(vector, actualTerminal).map(([eventType, evidenceRoot], index) => {
    const eventCore = { eventType, evidenceRoot, family: vector.family, inputRoot: rooted("MPRR-V19-VECTOR-TRACE-INPUT", "1", canonical(vector.input)), operation: vector.operation, ordinal: index + 1, previousEventRoot, terminal: ["EFFECT-OBSERVED", "ORACLE-COMPARED-AFTER-EFFECT"].includes(eventType) ? actualTerminal : "NOT-YET-OBSERVED" };
    const root = rooted("MPRR-V19-TRACE-EVENT", "1", canonical(eventCore));
    const event = { eventType, evidenceRoot, operation: vector.operation, ordinal: index + 1, previousEventRoot, root };
    previousEventRoot = root;
    return event;
  });
  const traceCore = { events, traceId: `TRACE-${vector.vectorId}`, vectorId: vector.vectorId };
  const observedTraceRoot = rooted("MPRR-V19-CAUSAL-TRACE", "1", canonical({ ...traceCore, schemaId: "SCHEMA-CAUSAL-TRACE" }));
  const expectedTrace = traceByVectorId.get(vector.vectorId);
  if (!expectedTrace || expectedTrace.traceRoot !== observedTraceRoot || coreRoot("MPRR-V19-CAUSAL-TRACE", expectedTrace, "traceRoot") !== expectedTrace.traceRoot || canonical(expectedTrace.events) !== canonical(events)) add(counters, "traceMismatch");
}
if (vectors.length !== traces.length || traceByVectorId.size !== vectors.length) add(counters, "traceMismatch");

// Rooted validator results are rebuilt after every local check, including vector and trace execution.
const validatorResults = buildValidatorResults();
const validatorResultSetRoot = rooted("MPRR-V19-VALIDATOR-RESULT-SET", "1", ...validatorResults.map((row) => row.validatorResultRoot).sort(compareUtf8));
const authorityDecision = deriveAcceptance(validatorResults);
if (authorityDecision.Acceptance !== 0 || authorityDecision.Gate29 !== "BLOCKED" || authorityDecision.authorityOutputs !== 0) add(counters, "acceptanceMismatch");
const vectorResultSetRoot = rooted("MPRR-V19-VECTOR-RESULT-SET", "1", ...vectorResults.map(canonical).sort(compareUtf8));
for (const result of validatorResults) if (!validateSchema("SCHEMA-VALIDATOR-RESULT", result)) add(counters, "schemaMismatch");
const materializeReport = () => {
  const counterRows = Object.entries(counters).sort(([left], [right]) => compareUtf8(left, right)).map(([counterId, value]) => ({ counterId, value }));
  const status = Object.keys(counters).every((id) => counters[id] === 0) ? "PASS" : "FAIL";
  const commonResultRoot = rooted("MPRR-V19-COMMON-QA-RESULT", "1", computedPackageRoot, physicalManifestRoot, canonical(counterRows), vectorResultSetRoot, validatorResultSetRoot, canonical(authorityDecision));
  return {
    authorityDecision,
    commonResultRoot,
    counters: counterRows,
    manifestRoot: physicalManifestRoot,
    packageRoot: computedPackageRoot,
    readerId: "MPRR-V19-READER-A",
    readerKind: "INDEPENDENT-IMPLEMENTATION;READ-ONLY;PRODUCER-QA;NOT-HOSTILE-REVIEW",
    status,
    validatorResultSetRoot,
    validatorResults,
    vectorResultSetRoot,
    verifiedCounts: [
      ["casComparisons", casContract.comparisonRows.length], ["closureRows", closureRows.length], ["durableMembers", casContract.durableRows.length],
      ["frozenSources", sourceRows.length], ["predecessorBehaviors", behaviorRows.length], ["schemas", schemaRegistry.schemas.length],
      ["semanticPredicates", semanticRows.length], ["semanticUses", v17Uses.length], ["successorVectors", vectors.length], ["traces", traces.length],
    ].map(([countId, value]) => ({ countId, value })),
  };
};
let report = materializeReport();
if (!validateSchema("SCHEMA-READER-REPORT", report)) { add(counters, "schemaMismatch"); report = materializeReport(); }
const reportBytes = Buffer.from(`${canonical(report)}\n`, "utf8");
if (reportPath) {
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  const descriptor = openSync(reportPath, flags, 0o600);
  try { writeSync(descriptor, reportBytes); } finally { closeSync(descriptor); }
} else process.stdout.write(reportBytes);
if (report.status !== "PASS") process.exitCode = 1;
