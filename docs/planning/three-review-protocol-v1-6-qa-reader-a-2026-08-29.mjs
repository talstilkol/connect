#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const planningDir = dirname(scriptPath);
const repositoryRoot = resolve(planningDir, "../../..");
const subjectPath = resolve(process.argv[2] ?? resolve(planningDir, "three-review-protocol-v1-6-successor-requirements-2026-08-29.md"));

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
const rooted = (domain, ...values) => sha256(frame(domain, ...values));
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

const fail = (message) => {
  throw new Error(message);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const subjectBytes = readFileSync(subjectPath);
const subject = subjectBytes.toString("utf8");

const jsonl = (name) => {
  const begin = `<!-- ${name}_JSONL_BEGIN -->`;
  const end = `<!-- ${name}_JSONL_END -->`;
  const start = subject.indexOf(begin);
  const finish = subject.indexOf(end);
  assert(start >= 0 && finish > start, `missing JSONL block ${name}`);
  return subject.slice(start + begin.length, finish)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .map((line) => {
      const parsed = JSON.parse(line);
      assert(canonical(parsed) === line, `non-canonical JSON in ${name}`);
      return parsed;
    });
};

const requirementHeading = /^## 2\.\d+ `(?<id>MPRR-V16-REQ-\d{3})` — (?<title>.+)$/gm;
const headings = [...subject.matchAll(requirementHeading)];
const requirements = headings.map((match, index) => {
  const start = match.index;
  const end = index + 1 < headings.length ? headings[index + 1].index : subject.indexOf("\n# 3.", start);
  assert(end > start, `unterminated requirement ${match.groups.id}`);
  const block = subject.slice(start, end);
  const fields = {};
  const fieldRegex = /^\d+\.\d+\.[1-5] `(statement|defectCauseImpact|requiredProofPredicate|dependencies|sourceBasis)`: (.+)\.$/gm;
  for (const field of block.matchAll(fieldRegex)) {
    assert(fields[field[1]] === undefined, `duplicate field ${match.groups.id}/${field[1]}`);
    fields[field[1]] = field[2];
  }
  assert(Object.keys(fields).length === 5, `five-field failure ${match.groups.id}`);
  return { id: match.groups.id, title: match.groups.title, fields };
});

assert(requirements.length === 112, `requirement denominator ${requirements.length}`);
const requirementById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
const dependencyEdges = [];
const extractedUses = [];
const tokenRegex = /@(local|source)\[([^\]]+)\]/g;

for (let index = 0; index < requirements.length; index += 1) {
  const requirement = requirements[index];
  const expectedId = `MPRR-V16-REQ-${String(index + 1).padStart(3, "0")}`;
  assert(requirement.id === expectedId, `non-contiguous requirement ${requirement.id}`);
  assert(requirement.fields.statement.includes(`MPRR-V16-OUT-${String(index + 1).padStart(3, "0")}`), `missing atomic output ${requirement.id}`);
  for (const [fieldName, fieldValue] of Object.entries(requirement.fields)) {
    let occurrence = 0;
    for (const match of fieldValue.matchAll(tokenRegex)) {
      occurrence += 1;
      const byteStart = Buffer.byteLength(fieldValue.slice(0, match.index), "utf8");
      const byteEnd = byteStart + Buffer.byteLength(match[0], "utf8");
      const providerId = match[2];
      extractedUses.push({
        byteEnd,
        byteStart,
        consumerRequirementId: requirement.id,
        field: fieldName,
        occurrence,
        providerId,
        providerKind: match[1] === "local" ? "LOCAL" : "SOURCE",
        token: match[0],
      });
      if (match[1] === "local" && fieldName === "dependencies") {
        dependencyEdges.push({ consumer: requirement.id, provider: providerId });
      }
    }
  }
}

for (const edge of dependencyEdges) {
  assert(requirementById.has(edge.provider), `unknown dependency ${edge.provider}`);
  const consumerNumber = Number(edge.consumer.slice(-3));
  const providerNumber = Number(edge.provider.slice(-3));
  assert(providerNumber < consumerNumber, `non-backward dependency ${edge.provider}->${edge.consumer}`);
}

const carriers = jsonl("SOURCE_CARRIERS");
const parserProfiles = jsonl("PARSER_PROFILES");
const namespaces = jsonl("SOURCE_NAMESPACES");
const members = jsonl("SOURCE_MEMBERS");
const outputs = jsonl("REQUIREMENT_OUTPUTS");
const crosswalk = jsonl("CROSSWALK");
const residualRisks = jsonl("RESIDUAL_RISKS");
const namedUses = jsonl("NAMED_USES");
const terminals = jsonl("TERMINALS");
const failureConditions = jsonl("FAILURE_CONDITIONS");
const controlMachines = jsonl("CONTROL_MACHINES");
const controlTransitions = jsonl("CONTROL_TRANSITIONS");
const separationRules = jsonl("SEPARATION_RULES");
const dependencyFamilies = jsonl("DEPENDENCY_FAMILIES");
const commitMembers = jsonl("COMMIT_MEMBERS");
const vectors = jsonl("VECTORS");

const carrierById = new Map();
for (const carrier of carriers) {
  assert(!carrierById.has(carrier.carrierId), `duplicate carrier ${carrier.carrierId}`);
  const bytes = readFileSync(resolve(repositoryRoot, carrier.path));
  assert(bytes.length === carrier.bytes, `carrier byte mismatch ${carrier.carrierId}`);
  assert(sha256(bytes) === carrier.root, `carrier root mismatch ${carrier.carrierId}`);
  assert(bytes.toString("utf8").split("\n").length - 1 === carrier.lines, `carrier line mismatch ${carrier.carrierId}`);
  carrierById.set(carrier.carrierId, { ...carrier, bytes });
}

const readerARoot = sha256(readFileSync(scriptPath));
const readerBPath = resolve(planningDir, "three-review-protocol-v1-6-qa-reader-b-2026-08-29.rb");
const readerBRoot = sha256(readFileSync(readerBPath));
const profileById = new Map();
for (const profile of parserProfiles) {
  const computed = rooted("MPRR-V16-PARSER-PROFILE-1", profile.profileId, profile.schema, readerARoot, readerBRoot);
  assert(computed === profile.parserProfileRoot, `parser profile mismatch ${profile.profileId}`);
  profileById.set(profile.profileId, profile);
}

const namespaceById = new Map(namespaces.map((namespace) => [namespace.namespaceId, namespace]));
const membersByNamespace = new Map();
for (const member of members) {
  const carrier = carrierById.get(member.carrierId);
  assert(carrier, `unknown member carrier ${member.carrierId}`);
  assert(member.byteStart >= 0 && member.byteEnd <= carrier.bytes.length && member.byteStart < member.byteEnd, `invalid span ${member.memberId}`);
  const selected = carrier.bytes.subarray(member.byteStart, member.byteEnd);
  assert(sha256(selected) === member.memberDigest, `member digest mismatch ${member.namespaceId}/${member.memberId}`);
  const list = membersByNamespace.get(member.namespaceId) ?? [];
  list.push(member);
  membersByNamespace.set(member.namespaceId, list);
}

const deriveMembers = (namespace, profile, carrier) => {
  if (profile.mode === "WHOLE-CARRIER") {
    return [{
      byteEnd: carrier.bytes.length,
      byteStart: 0,
      memberDigest: sha256(carrier.bytes),
      memberId: namespace.selector,
    }];
  }
  const lines = [];
  let start = 0;
  for (let index = 0; index < carrier.bytes.length; index += 1) {
    if (carrier.bytes[index] === 10) {
      lines.push({ byteStart: start, byteEnd: index + 1, text: carrier.bytes.subarray(start, index + 1).toString("utf8") });
      start = index + 1;
    }
  }
  if (start < carrier.bytes.length) lines.push({ byteStart: start, byteEnd: carrier.bytes.length, text: carrier.bytes.subarray(start).toString("utf8") });
  if (profile.mode === "TABLE-ROW-PREFIX") {
    return lines.filter((line) => line.text.startsWith(namespace.selector)).map((line) => {
      const memberId = line.text.match(/`([^`]+)`/)?.[1];
      assert(memberId, `unable to extract table member ID ${namespace.namespaceId}`);
      return { byteEnd: line.byteEnd, byteStart: line.byteStart, memberDigest: sha256(carrier.bytes.subarray(line.byteStart, line.byteEnd)), memberId };
    });
  }
  if (profile.mode === "MARKDOWN-HEADING-BLOCK") {
    const starts = lines.map((line, index) => ({ ...line, index })).filter((line) => line.text.startsWith("## ") && line.text.includes(`\`${namespace.selector}`));
    return starts.map((line) => {
      let end = carrier.bytes.length;
      for (let cursor = line.index + 1; cursor < lines.length; cursor += 1) {
        if (lines[cursor].text.startsWith("## ") || lines[cursor].text.startsWith("# ")) {
          end = lines[cursor].byteStart;
          break;
        }
      }
      const memberId = line.text.match(/`([^`]+)`/)?.[1];
      assert(memberId, `unable to extract heading member ID ${namespace.namespaceId}`);
      return { byteEnd: end, byteStart: line.byteStart, memberDigest: sha256(carrier.bytes.subarray(line.byteStart, end)), memberId };
    });
  }
  fail(`unknown parser mode ${profile.mode}`);
};

for (const namespace of namespaces) {
  const list = membersByNamespace.get(namespace.namespaceId) ?? [];
  assert(list.length === namespace.memberCount, `member count mismatch ${namespace.namespaceId}`);
  const profile = profileById.get(namespace.parserProfileId);
  const carrier = carrierById.get(namespace.carrierId);
  assert(profile && carrier, `namespace input missing ${namespace.namespaceId}`);
  const derived = deriveMembers(namespace, profile, carrier).map(canonical).sort();
  const declared = list.map(({ memberId, byteStart, byteEnd, memberDigest }) => canonical({ memberId, byteStart, byteEnd, memberDigest })).sort();
  assert(derived.length === declared.length && derived.every((row, index) => row === declared[index]), `independent member derivation mismatch ${namespace.namespaceId}`);
  const canonicalMembers = list.map(({ namespaceRoot: _namespaceRoot, ...member }) => canonical(member)).sort();
  const memberSetRoot = rooted("MPRR-V16-MEMBER-SET-1", ...canonicalMembers);
  assert(memberSetRoot === namespace.memberSetRoot, `member set root mismatch ${namespace.namespaceId}`);
  const namespaceRoot = rooted(
    "MPRR-V16-NAMESPACE-ENTRY-1",
    namespace.namespaceId,
    namespace.carrierId,
    namespace.carrierRoot,
    namespace.parserProfileRoot,
    namespace.memberSetRoot,
    String(namespace.memberCount),
    namespace.custodyLocator,
    namespace.selector,
    namespace.authorityState,
  );
  assert(namespaceRoot === namespace.namespaceRoot, `namespace root mismatch ${namespace.namespaceId}`);
}

const memberKeySet = new Set(members.map((member) => `${member.namespaceId}/${member.memberId}`));
for (const use of extractedUses) {
  if (use.providerKind === "LOCAL") {
    assert(requirementById.has(use.providerId), `unknown local NamedUse ${use.providerId}`);
    assert(Number(use.providerId.slice(-3)) < Number(use.consumerRequirementId.slice(-3)), `same/forward local NamedUse ${use.consumerRequirementId}/${use.providerId}`);
  } else {
    assert(memberKeySet.has(use.providerId), `unknown source NamedUse ${use.providerId}`);
  }
}
const canonicalUseSet = extractedUses.map(canonical).sort();
assert(canonicalUseSet.length === namedUses.length, `NamedUse denominator mismatch ${canonicalUseSet.length}/${namedUses.length}`);
const actualUseSet = namedUses.map(canonical).sort();
assert(canonicalUseSet.every((row, index) => row === actualUseSet[index]), "NamedUse extraction disagreement");

assert(outputs.length === requirements.length, `output denominator ${outputs.length}`);
assert(new Set(outputs.map((output) => output.outputId)).size === outputs.length, "duplicate atomic output");
for (const output of outputs) {
  assert(requirementById.has(output.requirementId), `orphan output ${output.outputId}`);
  assert(output.outputId.endsWith(output.requirementId.slice(-3)), `non-deterministic output mapping ${output.outputId}`);
}

assert(crosswalk.length === 323, `crosswalk denominator ${crosswalk.length}`);
assert(new Set(crosswalk.map((row) => row.noMergeKey)).size === crosswalk.length, "merged Crosswalk noMergeKey");
assert(residualRisks.length === crosswalk.length, `residual risk denominator ${residualRisks.length}`);
const residualById = new Map(residualRisks.map((risk) => [risk.residualRiskId, risk]));
for (const row of crosswalk) {
  assert(memberKeySet.has(`${row.sourceNamespaceId}/${row.sourceMemberId}`), `Crosswalk source missing ${row.rowId}`);
  assert(row.targetRequirementIds.length >= 1, `Crosswalk target empty ${row.rowId}`);
  assert(row.targetRequirementIds.every((id) => requirementById.has(id)), `Crosswalk unknown target ${row.rowId}`);
  assert(row.sourceConjuncts.length >= 1, `Crosswalk conjunct empty ${row.rowId}`);
  assert(row.sourceConjuncts.every((conjunct) => conjunct.sourceTextB64.length > 0 && conjunct.digest.length === 64 && conjunct.targetClausePaths.length > 0), `Crosswalk conjunct incomplete ${row.rowId}`);
  assert(residualById.has(row.residualRiskId), `Crosswalk risk missing ${row.rowId}`);
  assert(row.independentReceipt === "ABSENT-BLOCKING" && row.status === "OPEN", `premature Closure ${row.rowId}`);
}

const terminalById = new Map(terminals.map((terminal) => [terminal.terminalId, terminal]));
assert(terminals.length === 21, `terminal denominator ${terminals.length}`);
assert(new Set(terminals.map((terminal) => terminal.precedenceRank)).size === terminals.length, "duplicate terminal precedence");
assert(failureConditions.length === 16, `failure condition denominator ${failureConditions.length}`);
for (const condition of failureConditions) assert(terminalById.has(condition.terminalId), `condition terminal missing ${condition.conditionId}`);

const requiredMachines = ["TRUST", "CLOCK", "FINALITY", "REVIEW", "APPEAL", "CUSTODY-CONTENT", "CUSTODY-KEY", "CUSTODY-RECEIPT", "CUSTODY-PRIMARY", "CUSTODY-BACKUP", "CUSTODY-RESTORE", "MEDIA", "PUBLIC-PROJECTION", "DEPENDENCY-UNIVERSE", "BOOTSTRAP-COMMIT"];
assert(requiredMachines.every((machineId) => controlMachines.some((machine) => machine.machineId === machineId)), "missing required control machine");
for (const transition of controlTransitions) {
  assert(controlMachines.some((machine) => machine.machineId === transition.machineId), `transition unknown machine ${transition.transitionId}`);
  assert(terminalById.has(transition.terminalId), `transition unknown terminal ${transition.transitionId}`);
}

const requiredSeparationDimensions = ["PersonRoot", "AppointmentRoot", "outputAuthorRoot", "CandidateAuthorRoot", "sourceOwnerRoot", "ProducerRoot", "QARoot", "AcceptorRoot", "AppellateRoot", "RiskDispositionAuthorityRoot", "agentPolicyRoot", "toolRoot", "modelRoot", "employerRoot", "controllingPrincipalRoot"];
assert(requiredSeparationDimensions.every((dimension) => separationRules.some((rule) => rule.dimension === dimension)), "separation matrix incomplete");
assert(separationRules.every((rule) => rule.sameValueDisposition !== "ALLOW" || rule.allowanceRequired === true), "unbounded separation allowance");

assert(dependencyFamilies.length === 48, `DependencyHeadUniverse family denominator ${dependencyFamilies.length}`);
assert(new Set(dependencyFamilies.map((family) => family.familyId)).size === dependencyFamilies.length, "duplicate dependency family");
assert(dependencyFamilies.every((family) => family.invalidationEvents.length >= 4 && family.unknownStateTerminal === "TERM-FRESHNESS-BLOCKED"), "incomplete dependency invalidation");

assert(commitMembers.length === 22, `commit member denominator ${commitMembers.length}`);
assert(commitMembers.map((member) => member.order).join(",") === Array.from({ length: 22 }, (_, index) => index + 1).join(","), "commit member order mismatch");
assert(commitMembers.every((member) => member.memberId !== "postCommitReadbackRoot"), "causal post-readback cycle");

const selectTerminal = (triggerIds) => {
  if (triggerIds.length === 0) return terminalById.get("TERM-SUCCESS");
  const candidates = triggerIds.map((triggerId) => {
    const condition = failureConditions.find((item) => item.conditionId === triggerId);
    return condition ? terminalById.get(condition.terminalId) : terminalById.get("TERM-FAIL-CLOSED-UNKNOWN");
  });
  return [...candidates].sort((a, b) => a.precedenceRank - b.precedenceRank)[0];
};

const applyReviewEvent = (state, instruction) => {
  const next = structuredClone(state);
  if (instruction.event === "CLOSE_REVIEW") {
    if (next.p0 > 0 || next.p1 > 0) next.state = next.generation < 2 ? "REWORK_REQUIRED" : "REJECTED_FINAL";
    else if ((next.p2 > 0 || next.p3 > 0) && next.validRiskDisposition !== true) next.state = "REJECTED_FINAL";
    else next.state = "READY_FOR_ACCEPTOR";
  } else if (instruction.event === "SUBMIT_SUCCESSOR" && next.state === "REWORK_REQUIRED" && next.generation === 1) {
    next.generation = 2;
    next.state = "REVIEWING";
    next.p0 = instruction.p0;
    next.p1 = instruction.p1;
    next.p2 = instruction.p2;
    next.p3 = instruction.p3;
    next.validRiskDisposition = instruction.validRiskDisposition;
  } else if (instruction.event === "ACCEPT" && next.state === "READY_FOR_ACCEPTOR" && instruction.selfApproval === false) {
    next.state = "ACCEPTED_PROVISIONAL";
  } else if (instruction.event === "EXPIRE_APPEAL_WINDOW" && next.state === "ACCEPTED_PROVISIONAL" && instruction.trustedTime === true) {
    next.state = "ACCEPTED_FINAL";
  } else if (instruction.event === "FILE_APPEAL" && ["ACCEPTED_PROVISIONAL", "REJECTED_FINAL"].includes(next.state) && next.appealCount === 0 && instruction.timely === true && instruction.independent === true) {
    next.appealCount = 1;
    next.state = "APPEAL_FROZEN";
  } else if (instruction.event === "REMAND" && next.state === "APPEAL_FROZEN" && next.generation === 1) {
    next.generation = 2;
    next.state = "REVIEWING";
  } else if (instruction.event === "AFFIRM" && next.state === "APPEAL_FROZEN") {
    next.state = "AFFIRMED_FINAL";
  } else if (instruction.event === "REVOKE") {
    next.state = "REVOKED_FINAL";
  } else {
    next.state = "CONFLICT_FINAL";
  }
  return next;
};

const executeVector = (vector) => {
  let state = structuredClone(vector.fixture);
  let terminal = terminalById.get("TERM-SUCCESS");
  for (const instruction of vector.program) {
    if (instruction.op === "LOAD_MEMBER") {
      const member = members.find((item) => item.namespaceId === instruction.namespaceId && item.memberId === instruction.memberId);
      assert(member, `vector member missing ${vector.vectorId}`);
      const carrier = carrierById.get(member.carrierId);
      state = { bytesHex: carrier.bytes.subarray(member.byteStart, member.byteEnd).toString("hex") };
    } else if (instruction.op === "ASSERT_SHA256") {
      assert(sha256(Buffer.from(state.bytesHex, "hex")) === instruction.hex, `vector preimage mismatch ${vector.vectorId}`);
    } else if (instruction.op === "XOR_BYTE") {
      const bytes = Buffer.from(state.bytesHex, "hex");
      assert(instruction.offset >= 0 && instruction.offset < bytes.length, `vector XOR path invalid ${vector.vectorId}`);
      bytes[instruction.offset] ^= instruction.mask;
      state = { bytesHex: bytes.toString("hex") };
    } else if (instruction.op === "SET_TRIGGER_SET") {
      state = { ...state, triggerIds: [...instruction.triggerIds].sort() };
    } else if (instruction.op === "EVALUATE_TERMINAL") {
      terminal = selectTerminal(state.triggerIds ?? []);
    } else if (instruction.op === "REVIEW_EVENT") {
      state = applyReviewEvent(state, instruction);
    } else {
      fail(`unknown vector operation ${instruction.op}`);
    }
  }
  const postRoot = rooted("MPRR-V16-VECTOR-POST-STATE-1", canonical(state));
  assert(postRoot === vector.expectedPostRoot, `vector post root mismatch ${vector.vectorId}`);
  assert(canonical(terminal) === canonical(vector.expectedTerminal), `vector terminal mismatch ${vector.vectorId}`);
  assert(vector.sideEffectOracle.durableWriteCount === 0 && vector.sideEffectOracle.authorityOutputCount === 0 && vector.sideEffectOracle.publicationCount === 0, `unsafe vector oracle ${vector.vectorId}`);
};

vectors.forEach(executeVector);
const lifecycleVectors = vectors.filter((vector) => vector.family === "REVIEW-LIFECYCLE");
assert(lifecycleVectors.length >= 8, `two-generation vector denominator ${lifecycleVectors.length}`);
assert(lifecycleVectors.some((vector) => vector.expectedFinalLifecycleState === "ACCEPTED_FINAL"), "missing terminating two-generation success proof");
assert(lifecycleVectors.some((vector) => vector.expectedFinalLifecycleState === "REJECTED_FINAL"), "missing terminating generation-two reject proof");
assert(lifecycleVectors.some((vector) => vector.expectedFinalLifecycleState === "REVOKED_FINAL"), "missing revoke terminal proof");
assert(lifecycleVectors.some((vector) => vector.expectedFinalLifecycleState === "CONFLICT_FINAL"), "missing conflict terminal proof");

const expectedFindingIds = Array.from({ length: 16 }, (_, index) => `MPRR-V15-HR-F${String(index + 1).padStart(3, "0")}`);
assert(expectedFindingIds.every((findingId) => crosswalk.filter((row) => row.sourceMemberId === findingId).length === 1), "Finding closure not one-to-one");
assert(requirements.slice(0, 16).every((requirement) => requirement.fields.requiredProofPredicate.includes("independentReceipt=ABSENT-BLOCKING")), "remediation premature semantic Closure");

const report = {
  authority: {
    acceptance: 0,
    b0Admission: 0,
    closure: 0,
    gate29: "BLOCKED",
    producerSemanticAuthority: 0,
    publication: 0,
    repositoryVisibility: "PUBLIC-PERMANENT",
  },
  counters: {
    backwardDependencyEdges: dependencyEdges.length,
    carriers: carriers.length,
    commitMembers: commitMembers.length,
    controlMachines: controlMachines.length,
    controlTransitions: controlTransitions.length,
    crosswalkRows: crosswalk.length,
    dependencyFamilies: dependencyFamilies.length,
    failureConditions: failureConditions.length,
    findingRemediations: 16,
    lifecycleVectors: lifecycleVectors.length,
    namedUses: namedUses.length,
    namespaces: namespaces.length,
    parserProfiles: parserProfiles.length,
    requirementFields: requirements.length * 5,
    requirementOutputs: outputs.length,
    requirements: requirements.length,
    residualRisks: residualRisks.length,
    separationRules: separationRules.length,
    sourceMembers: members.length,
    terminals: terminals.length,
    v15Preservations: 96,
    vectors: vectors.length,
  },
  reader: "A-NODE-BYTE-REGEX-AND-INTERPRETER",
  readerRoot: readerARoot,
  subject: {
    bytes: subjectBytes.length,
    lines: subject.split("\n").length - 1,
    path: subjectPath,
    root: sha256(subjectBytes),
  },
  verdict: "MECHANICAL-CANDIDATE-PASS;SEMANTIC-CLOSURE-ZERO-PENDING-INDEPENDENT-REVIEW",
};

process.stdout.write(`${canonical(report)}\n`);
