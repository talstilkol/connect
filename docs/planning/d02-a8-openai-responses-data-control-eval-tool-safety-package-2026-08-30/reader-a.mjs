#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const READER_ID = "D02A8-READER-A-NODE";
const LOGICAL = {
  schema: "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/schema.json",
  registry: "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/registry.json",
  dag: "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/dependency-dag.json",
  corpus: "docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/mutation-corpus.json"
};
const EXPECTED_TOP_LEVEL = [
  "artifactId", "schemaVersion", "canonicalization", "sourceCut", "safeState",
  "frozenInputs", "authorityChain", "predecessorClauseUniverses", "authorityConflict", "modelSelectionAuthority",
  "approvalRegistry", "a6FindingRegistry", "a7FindingRegistry", "aiProfileMembers",
  "promptPolicy", "accountParentRows", "accountChildren", "legalPrivacyMembers",
  "officialSourceReceipts", "rootDefinitions", "rootStates"
].sort();
const ID_FIELDS = {
  frozenInputs: "inputId",
  authorityChain: "nodeId",
  predecessorClauseUniverses: "universeId",
  approvalRegistry: "approvalId",
  a6FindingRegistry: "findingId",
  a7FindingRegistry: "findingId",
  aiProfileMembers: "memberId",
  accountParentRows: "rowId",
  accountChildren: "childId",
  legalPrivacyMembers: "memberId",
  officialSourceReceipts: "receiptId",
  rootDefinitions: "rootId",
  rootStates: "rootId",
  dagNodes: "nodeId",
  dagEdges: "edgeId"
};
const checks = [];
const errors = [];

function recordCheck(condition, code, detail = "") {
  const passed = Boolean(condition);
  checks.push({ code, passed });
  if (!passed) errors.push(detail ? code + ": " + detail : code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error("non-canonical number");
    return String(value);
  }
  if (typeof value === "string") {
    if (value !== value.normalize("NFC")) throw new Error("non-NFC string");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(function (key) {
      return canonical(key) + ":" + canonical(value[key]);
    }).join(",") + "}";
  }
  throw new Error("unsupported JSON value");
}

function root(domain, value) {
  return sha256(Buffer.from("CONNECT-D02-A8:" + domain + ":" + canonical(value), "utf8"));
}

function findRepoRoot(start) {
  let cursor = fs.realpathSync.native(start);
  for (;;) {
    if (fs.existsSync(path.join(cursor, ".git")) && fs.existsSync(path.join(cursor, "web", "docs"))) return cursor;
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error("repository root not found");
    cursor = parent;
  }
}

function resolveLogical(repoRoot, logicalPath) {
  if (typeof logicalPath !== "string" || !logicalPath.startsWith("docs/") ||
      logicalPath.includes("\\") || logicalPath.includes("\0") ||
      path.posix.normalize(logicalPath) !== logicalPath) {
    throw new Error("invalid logical path: " + String(logicalPath));
  }
  const namespaceRoot = fs.realpathSync.native(path.join(repoRoot, "web"));
  const physical = fs.realpathSync.native(path.join(namespaceRoot, logicalPath));
  if (!physical.startsWith(namespaceRoot + path.sep)) throw new Error("logical path escape");
  return physical;
}

function duplicateKeyCount(text) {
  let index = 0;
  let duplicates = 0;
  function skip() { while (/[\u0020\u000a\u000d\u0009]/.test(text[index] || "")) index += 1; }
  function stringToken() {
    const start = index;
    index += 1;
    while (index < text.length) {
      if (text[index] === "\\") { index += text[index + 1] === "u" ? 6 : 2; continue; }
      if (text[index] === "\"") { index += 1; return JSON.parse(text.slice(start, index)); }
      index += 1;
    }
    throw new Error("unterminated string");
  }
  function value() {
    skip();
    if (text[index] === "{") {
      index += 1; skip();
      const keys = new Set();
      if (text[index] === "}") { index += 1; return; }
      for (;;) {
        skip();
        const key = stringToken();
        if (keys.has(key)) duplicates += 1;
        keys.add(key);
        skip();
        if (text[index] !== ":") throw new Error("missing colon");
        index += 1; value(); skip();
        if (text[index] === "}") { index += 1; return; }
        if (text[index] !== ",") throw new Error("missing comma");
        index += 1;
      }
    }
    if (text[index] === "[") {
      index += 1; skip();
      if (text[index] === "]") { index += 1; return; }
      for (;;) {
        value(); skip();
        if (text[index] === "]") { index += 1; return; }
        if (text[index] !== ",") throw new Error("missing array comma");
        index += 1;
      }
    }
    if (text[index] === "\"") { stringToken(); return; }
    const token = text.slice(index).match(/^(?:-?(?:0|[1-9][0-9]*)|true|false|null)/);
    if (!token) throw new Error("invalid JSON token");
    index += token[0].length;
  }
  value(); skip();
  if (index !== text.length) throw new Error("trailing JSON bytes");
  return duplicates;
}

function readJson(repoRoot, logicalPath) {
  const bytes = fs.readFileSync(resolveLogical(repoRoot, logicalPath));
  const text = bytes.toString("utf8");
  recordCheck(duplicateKeyCount(text) === 0, "JSON-DUPLICATE-KEYS-" + path.basename(logicalPath));
  return { bytes, value: JSON.parse(text) };
}

function extent(bytes) {
  const text = bytes.toString("utf8");
  return {
    sha256: sha256(bytes),
    lines: (text.match(/\n/g) || []).length,
    words: text.trim() ? text.trim().split(/\s+/u).length : 0,
    bytes: bytes.length
  };
}

function expectedIds(prefix, count) {
  return Array.from({ length: count }, function (_, index) {
    return prefix + String(index + 1).padStart(3, "0");
  });
}

function same(left, right) {
  return canonical(left) === canonical(right);
}

function graphStatus(graph) {
  const ids = graph.nodes.map(function (node) { return node.nodeId; });
  const idSet = new Set(ids);
  const dangling = graph.edges.filter(function (edge) {
    return !idSet.has(edge.from) || !idSet.has(edge.to);
  }).length;
  const indegree = Object.fromEntries(ids.map(function (id) { return [id, 0]; }));
  const outgoing = Object.fromEntries(ids.map(function (id) { return [id, []]; }));
  for (const edge of graph.edges) {
    if (idSet.has(edge.from) && idSet.has(edge.to)) {
      outgoing[edge.from].push(edge.to);
      indegree[edge.to] += 1;
    }
  }
  const queue = ids.filter(function (id) { return indegree[id] === 0; }).sort();
  let visited = 0;
  while (queue.length) {
    const current = queue.shift();
    visited += 1;
    for (const next of outgoing[current].slice().sort()) {
      indegree[next] -= 1;
      if (indegree[next] === 0) {
        queue.push(next);
        queue.sort();
      }
    }
  }
  return { dangling, cycles: dangling === 0 && visited !== ids.length ? 1 : 0, visited };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findMember(container, collection, targetId) {
  const array = collection === "dagNodes" ? container.dag.nodes :
    collection === "dagEdges" ? container.dag.edges : container.registry[collection];
  const idField = ID_FIELDS[collection];
  return { array, idField, index: array.findIndex(function (item) { return item[idField] === targetId; }) };
}

function applyMutation(baseRegistry, baseDag, vector) {
  const state = { registry: clone(baseRegistry), dag: clone(baseDag) };
  const collection = vector.targetCollection;
  const operation = vector.operation;
  const params = vector.params || {};
  if (["promptPolicy", "safeState", "modelSelectionAuthority"].includes(collection)) {
    state.registry[collection][params.field] = params.value;
    return state;
  }
  if (operation === "ADD_EDGE") {
    state.dag.edges.push({ edgeId: vector.targetId, from: params.from, to: params.to, edgeType: params.edgeType });
    return state;
  }
  const located = findMember(state, collection, vector.targetId);
  if (located.index < 0) throw new Error("mutation target absent: " + vector.vectorId);
  const member = located.array[located.index];
  if (operation === "DELETE_MEMBER" || operation === "DELETE_NODE") {
    located.array.splice(located.index, 1);
  } else if (operation === "SWAP_WITH_NEXT") {
    const next = located.index + 1;
    if (next >= located.array.length) throw new Error("swap has no next member");
    const saved = located.array[located.index];
    located.array[located.index] = located.array[next];
    located.array[next] = saved;
  } else if (operation === "FLIP_LAST_SHA_HEX") {
    member.sha256 = member.sha256.slice(0, -1) + (member.sha256.endsWith("0") ? "1" : "0");
  } else if (operation === "FLIP_SHA_FIELD") {
    const field = params.field;
    member[field] = member[field].slice(0, -1) + (member[field].endsWith("0") ? "1" : "0");
  } else if (operation === "SET_FIELD") {
    member[params.field] = params.value;
  } else if (operation === "MUTATE_SEMANTIC_KEY_ONE_BYTE") {
    member.semanticKey = member.semanticKey + "X";
  } else if (operation === "MUTATE_CLAIM_ONE_BYTE") {
    member.claimCodes[0] = member.claimCodes[0] + "X";
  } else if (operation === "CROSS_SATISFY") {
    const other = state.registry.accountChildren.find(function (entry) { return entry.childId !== member.childId; });
    member.sourceAuthority = other.sourceAuthority;
    member.issuerClass = other.issuerClass;
  } else if (operation === "ADD_UNROOTED_CONJUNCT") {
    member.orderedDependencyIds.push(params.dependency);
  } else if (operation === "SUBSTITUTE_PUBLIC_EVIDENCE") {
    member.orderedDependencyIds = params.dependencies;
  } else {
    throw new Error("unknown mutation operation: " + operation);
  }
  return state;
}

function firstStructuralTerminal(registry, dag, baseline, physicalInputs) {
  if (registry.frozenInputs.length !== 13) return "INPUT-DENOMINATOR-INVALID";
  for (const input of registry.frozenInputs) {
    const actual = physicalInputs[input.inputId];
    if (!actual || input.sha256 !== actual.sha256 || input.lines !== actual.lines ||
        input.bytes !== actual.bytes) return "INPUT-ROOT-MISMATCH";
  }
  if (registry.safeState.aiRuntime !== "OFF" || registry.safeState.gate29 !== "BLOCKED" ||
      registry.safeState.developmentFreeze !== "ACTIVE" ||
      registry.safeState.repositoryVisibility !== "PUBLIC") return "SAFE-STATE-INVALID";
  const authorityIds = expectedIds("D02A8-AUTH-", 6);
  if (!same(registry.authorityChain.map(function (x) { return x.nodeId; }), authorityIds)) return "AUTHORITY-CHAIN-INVALID";
  for (let index = 0; index < registry.authorityChain.length; index += 1) {
    const entry = registry.authorityChain[index];
    const expectedPredecessor = index === 0 ? null : authorityIds[index - 1];
    if (entry.sequence !== index + 1 || entry.predecessorId !== expectedPredecessor) return "AUTHORITY-CHAIN-INVALID";
  }
  const universeIds = expectedIds("D02A8-PCU-", 6);
  if (!same(registry.predecessorClauseUniverses.map(function (x) { return x.universeId; }), universeIds)) {
    return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID";
  }
  for (let index = 0; index < registry.predecessorClauseUniverses.length; index += 1) {
    const universe = registry.predecessorClauseUniverses[index];
    if (universe.nodeId !== authorityIds[index] || universe.inputId !== expectedIds("D02A8-IN-", 6)[index]) {
      return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID";
    }
    let derivedMembers;
    if (universe.derivationMode === "EXPLICIT-D02-LOCATORS") {
      derivedMembers = universe.memberLocators;
    } else if (universe.derivationMode === "NUMBERED-CLAUSE-REGEX-WHOLE-DOCUMENT") {
      const inputText = physicalInputs[universe.inputId] && physicalInputs[universe.inputId].text;
      if (typeof inputText !== "string") return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID";
      derivedMembers = inputText.split(/\r?\n/u).map(function (line) {
        const match = line.match(/^([0-9]+(?:\.[0-9]+)+) /u);
        return match ? match[1] : null;
      }).filter(Boolean);
    } else {
      return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID";
    }
    const overrideIds = universe.overrideDispositions.map(function (x) { return x.memberId; });
    if (derivedMembers.length !== universe.expectedMemberCount ||
        new Set(derivedMembers).size !== derivedMembers.length ||
        new Set(overrideIds).size !== overrideIds.length ||
        overrideIds.some(function (id) { return !derivedMembers.includes(id); })) {
      return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID";
    }
  }
  if (!same(registry.predecessorClauseUniverses, baseline.predecessorClauseUniverses)) {
    return "PREDECESSOR-CLAUSE-DISPOSITION-INVALID";
  }
  const authority = registry.modelSelectionAuthority;
  if (authority.state !== "MISSING" || authority.acceptedSelection !== null ||
      authority.issuedAt !== null || authority.expiresAt !== null ||
      authority.revocationRoot !== null) return "MODEL-SELECTION-AUTHORITY-INVALID";
  if (!same(registry.approvalRegistry.map(function (x) { return x.approvalId; }), expectedIds("D02A8-APR-", 6))) {
    return "APPROVAL-DENOMINATOR-INVALID";
  }
  if (!same(registry.a6FindingRegistry.map(function (x) { return x.findingId; }), expectedIds("D02-A6-IHR-F", 5))) {
    return "A6-FINDING-DENOMINATOR-INVALID";
  }
  if (!same(registry.a7FindingRegistry.map(function (x) { return x.findingId; }), expectedIds("D02-A7-IHR-F", 7))) {
    return "A7-FINDING-DENOMINATOR-INVALID";
  }
  if (registry.a6FindingRegistry.concat(registry.a7FindingRegistry).some(function (x) { return x.noMergeKey !== x.findingId; })) {
    return "FINDING-NO-MERGE-VIOLATION";
  }
  if (!same(registry.aiProfileMembers.map(function (x) { return x.memberId; }), expectedIds("D02A8-AIP-", 17))) {
    return "AI-PROFILE-DENOMINATOR-INVALID";
  }
  if (!same(registry.aiProfileMembers, baseline.aiProfileMembers)) return "AI-PROFILE-MEMBER-MUTATED";
  if (registry.promptPolicy.providerReusablePromptObjects !== false ||
      registry.promptPolicy.responsesPromptObjectField !== "FORBIDDEN") return "PROVIDER-PROMPT-FORBIDDEN";
  if (registry.promptPolicy.owner !== "CONNECT" ||
      registry.promptPolicy.contentMode !== "APPLICATION-OWNED-EXACT-BYTES") return "PROMPT-OWNERSHIP-INVALID";
  if (!same(registry.accountParentRows.map(function (x) { return x.rowId; }), expectedIds("D02A8-AR-", 9))) {
    return "ACCOUNT-DENOMINATOR-INVALID";
  }
  if (!same(registry.accountChildren.map(function (x) { return x.childId; }), ["D02A8-AR-006-P", "D02A8-AR-006-F"])) {
    return "ACCOUNT-CHILD-DENOMINATOR-INVALID";
  }
  if (registry.accountChildren.some(function (x) { return x.state !== "ABSENT"; })) return "ACCOUNT-CHILD-STALE";
  if (!same(registry.accountChildren, baseline.accountChildren)) return "ACCOUNT-CHILD-AUTHORITY-MISMATCH";
  if (!same(registry.legalPrivacyMembers.map(function (x) { return x.memberId; }), expectedIds("D02A8-LP-", 7))) {
    return "LEGAL-DENOMINATOR-INVALID";
  }
  if (!same(registry.officialSourceReceipts.map(function (x) { return x.receiptId; }), expectedIds("D02A8-SRC-", 11))) {
    return "SOURCE-DENOMINATOR-INVALID";
  }
  for (let index = 0; index < registry.officialSourceReceipts.length; index += 1) {
    const source = registry.officialSourceReceipts[index];
    const original = baseline.officialSourceReceipts[index];
    if (source.state === "STALE") return "SOURCE-STALE";
    if (source.accepted === true && source.acceptanceRoot === null) return "SOURCE-ACCEPTANCE-INVALID";
    if (!same(source.claimCodes, original.claimCodes)) return "SOURCE-CHANGED";
    const commitmentMaterial = {
      sourceId: source.sourceId,
      url: source.url,
      publisherAuthority: source.publisherAuthority,
      retrievedAt: source.retrievedAt,
      claimCodes: source.claimCodes
    };
    if (source.observationCommitment !== root("SOURCE-CLAIM-COMMITMENT", commitmentMaterial)) {
      return "SOURCE-COMMITMENT-INVALID";
    }
  }
  const publicRoot = registry.rootDefinitions.find(function (x) { return x.rootId === "D02A8-ROOT-PUBLIC-DIRECTIVE"; });
  if (!publicRoot || !same(publicRoot.orderedDependencyIds, ["D02A8-IN-013", "D18-A2:1.1.4"])) {
    return "PUBLIC-AUTHORITY-INVALID";
  }
  const expectedNodeIds = expectedIds("D02A8-DAG-N", 22);
  if (!same(dag.nodes.map(function (x) { return x.nodeId; }), expectedNodeIds)) return "DAG-NODE-DENOMINATOR-INVALID";
  const graph = graphStatus(dag);
  if (graph.dangling !== 0) return "DAG-DANGLING-REFERENCE";
  if (graph.cycles !== 0) return "DAG-CYCLE";
  for (const node of dag.nodes) {
    const original = baseline.dag.nodes.find(function (x) { return x.nodeId === node.nodeId; });
    if (!original || node.nodeClass !== original.nodeClass) return "ROOT-CLASS-MISMATCH";
  }
  const exactRootClasses = {
    "D02A8-ROOT-PLANNING-ACCEPTANCE": "D02-PLANNING-CONTRACT-ACCEPTANCE",
    "D02A8-ROOT-AI-ADMISSION": "AI-PROFILE-ADMISSION",
    "D02A8-ROOT-RUNTIME-PERMIT": "AI-RUNTIME-PERMIT"
  };
  if (registry.rootStates.some(function (x) { return exactRootClasses[x.rootId] !== x.rootClass; })) {
    return "ROOT-CLASS-MISMATCH";
  }
  return "PROFILE-NOT-ADMITTED";
}

const report = {
  artifactId: "CONNECT-D02-A8-READER-A-REPORT-2026-08-30",
  artifactClass: "DETACHED-READ-ONLY-MECHANICAL-REPORT-NOT-ACCEPTANCE",
  readerId: READER_ID,
  implementationLanguage: "JavaScript-Node.js",
  algorithmFamily: "sorted-recursive-canonicalization-plus-kahn-dag",
  readOnly: true,
  oracleRead: false,
  rootInstancesRead: false,
  expectedToActualCount: 0,
  inputFiles: [],
  packageCoreRoot: null,
  roots: {},
  counters: {},
  graph: {},
  mutations: {},
  checks: {},
  safeState: {},
  currentTerminal: "READER-FAILED",
  mechanicalVerdict: "FAIL",
  semanticAcceptance: 0,
  errors: []
};

try {
  const repoRoot = findRepoRoot(process.cwd());
  const loaded = {};
  for (const [name, logicalPath] of Object.entries(LOGICAL)) {
    loaded[name] = readJson(repoRoot, logicalPath);
    report.inputFiles.push({ logicalPath, ...extent(loaded[name].bytes) });
  }
  const schema = loaded.schema.value;
  const registry = loaded.registry.value;
  const dag = loaded.dag.value;
  const corpus = loaded.corpus.value;
  recordCheck(schema.$id === "urn:connect:d02:a8:normative-registry-schema:2026-08-30", "SCHEMA-ID");
  recordCheck(same(Object.keys(registry).sort(), EXPECTED_TOP_LEVEL), "REGISTRY-TOP-LEVEL-CLOSED");
  recordCheck(registry.schemaVersion === "D02-A8-SCHEMA-1", "REGISTRY-SCHEMA-VERSION");
  recordCheck(registry.canonicalization.algorithm === "RFC8785-JCS-SHA256", "CANONICALIZATION-PROFILE");
  const physicalInputs = {};
  for (const input of registry.frozenInputs) {
    const bytes = fs.readFileSync(resolveLogical(repoRoot, input.path));
    physicalInputs[input.inputId] = { ...extent(bytes), text: bytes.toString("utf8") };
  }
  recordCheck(firstStructuralTerminal(registry, dag, { ...registry, dag }, physicalInputs) === "PROFILE-NOT-ADMITTED", "BASELINE-STRUCTURAL-CONFORMANCE");
  const baseGraph = graphStatus(dag);
  recordCheck(baseGraph.dangling === 0, "DAG-NO-DANGLING");
  recordCheck(baseGraph.cycles === 0, "DAG-ACYCLIC");
  recordCheck(corpus.oracleReadByReaders === false && corpus.expectedToActualFlow === "PROHIBITED", "NO-EXPECTED-TO-ACTUAL");
  recordCheck(corpus.vectors.length === corpus.vectorCount && corpus.vectorCount === 179, "MUTATION-DENOMINATOR");
  const fileMembers = report.inputFiles.map(function (x) {
    return { logicalPath: x.logicalPath, sha256: x.sha256, bytes: x.bytes };
  });
  report.packageCoreRoot = root("PACKAGE-CORE", fileMembers);
  report.roots = {
    frozenInputManifestRoot: root("FROZEN-INPUT-MANIFEST", registry.frozenInputs),
    authorityChainRoot: root("AUTHORITY-CHAIN", registry.authorityChain),
    predecessorClauseDispositionRoot: root("PREDECESSOR-CLAUSE-DISPOSITION", registry.predecessorClauseUniverses),
    publicDirectiveRoot: root("PUBLIC-DIRECTIVE", {
      input: registry.frozenInputs.find(function (x) { return x.inputId === "D02A8-IN-013"; }),
      definition: registry.rootDefinitions.find(function (x) { return x.rootId === "D02A8-ROOT-PUBLIC-DIRECTIVE"; })
    }),
    modelSelectionAuthorityRoot: root("MODEL-SELECTION-AUTHORITY", registry.modelSelectionAuthority),
    promptPolicyRoot: root("PROMPT-POLICY", registry.promptPolicy),
    aiProfileRegistryRoot: root("AI-PROFILE-REGISTRY", registry.aiProfileMembers),
    accountRegistryRoot: root("ACCOUNT-REGISTRY", { parents: registry.accountParentRows, children: registry.accountChildren }),
    legalPrivacyRegistryRoot: root("LEGAL-PRIVACY-REGISTRY", registry.legalPrivacyMembers),
    officialSourceObservationRoot: root("OFFICIAL-SOURCE-OBSERVATION", registry.officialSourceReceipts),
    approvalRegistryRoot: root("APPROVAL-REGISTRY", registry.approvalRegistry),
    a6FindingCarryRoot: root("A6-FINDING-CARRY", registry.a6FindingRegistry),
    a7FindingClosureCandidateRoot: root("A7-FINDING-CLOSURE-CANDIDATE", registry.a7FindingRegistry),
    rootDefinitionRoot: root("ROOT-DEFINITIONS", registry.rootDefinitions),
    crossProgramDagRoot: root("CROSS-PROGRAM-DAG", dag)
  };
  const results = [];
  const terminalCounts = {};
  for (const vector of corpus.vectors) {
    const mutated = applyMutation(registry, dag, vector);
    const terminal = firstStructuralTerminal(mutated.registry, mutated.dag, { ...registry, dag }, physicalInputs);
    results.push({ vectorId: vector.vectorId, actualTerminal: terminal });
    terminalCounts[terminal] = (terminalCounts[terminal] || 0) + 1;
  }
  recordCheck(results.every(function (x) { return x.actualTerminal !== "PROFILE-NOT-ADMITTED"; }), "ALL-MUTATIONS-KILLED");
  report.counters = {
    frozenInputs: registry.frozenInputs.length,
    authorityNodes: registry.authorityChain.length,
    predecessorClauseUniverses: registry.predecessorClauseUniverses.length,
    predecessorClauseMembers: registry.predecessorClauseUniverses.reduce(function (sum, x) { return sum + x.expectedMemberCount; }, 0),
    approvals: registry.approvalRegistry.length,
    a6Findings: registry.a6FindingRegistry.length,
    a7Findings: registry.a7FindingRegistry.length,
    aiProfileMembers: registry.aiProfileMembers.length,
    accountParents: registry.accountParentRows.length,
    accountChildren: registry.accountChildren.length,
    legalPrivacyMembers: registry.legalPrivacyMembers.length,
    officialSources: registry.officialSourceReceipts.length,
    acceptedOfficialSources: registry.officialSourceReceipts.filter(function (x) { return x.accepted; }).length,
    planningAcceptance: 0,
    aiAdmission: 0,
    runtimePermit: 0
  };
  report.graph = { nodes: dag.nodes.length, edges: dag.edges.length, cycleCount: baseGraph.cycles, danglingReferenceCount: baseGraph.dangling };
  report.mutations = { vectorCount: corpus.vectorCount, evaluatedCount: results.length, killedCount: results.filter(function (x) { return x.actualTerminal !== "PROFILE-NOT-ADMITTED"; }).length, terminalCounts, results };
  report.safeState = registry.safeState;
  report.currentTerminal = "PROFILE-NOT-ADMITTED";
} catch (error) {
  errors.push(error && error.stack ? error.stack : String(error));
}

report.checks = {
  passed: checks.filter(function (x) { return x.passed; }).length,
  failed: checks.filter(function (x) { return !x.passed; }).length,
  records: checks
};
report.errors = errors;
report.mechanicalVerdict = errors.length === 0 && report.checks.failed === 0 ? "PASS" : "FAIL";
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
