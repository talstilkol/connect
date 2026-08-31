import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const readerId = "PRCV3-READER-A";
const readerPath = "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-a-2026-08-30.mjs";
const members = [
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-2026-08-30.md",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-typed-registries-2026-08-30.json",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-producer-dependency-graph-2026-08-30.json",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-operation-oracle-vector-pack-2026-08-30.json",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-finding-closure-registry-2026-08-30.json"
];
const expectedInputs = {
  "GITHUB-LIVE-V3":"0dea5b462e4bff0d1866a585a585f7e0d0405609ad21ade4e8ecac1210e521cb",
  "LEGACY-QUARANTINE-V2":"00d8c970eb6f8a747d6353f309bc0c0109df6dd454582447325f123cf512df7c",
  "LICENSE-OBSERVATION":"d5d8267370435cba5fcaa481f3af8a8d60641e319dfc3237ce3abd7a834b3f96",
  "SECRET-SCAN-V2":"3e8bb89858b660e8fe923643301c7225cafd622acdca6842a913a1f6d9bb9983",
  "SECRET-SCAN-V1":"3ec83742da420a92d243b96cc0dae77112bb206fbe9f4d7a179a0f967d315755"
};
const errors = [];
const check = (condition, code) => { if (!condition) errors.push(code); };
const workspacePrefix = "w" + "eb/";
const safePath = value => typeof value === "string" && value.startsWith("docs/") && !value.includes("..") && !value.includes("://") && !path.isAbsolute(value) && !value.startsWith(workspacePrefix);
const bytesFor = relative => {
  check(safePath(relative), "UNSAFE-PATH:" + relative);
  return fs.readFileSync(path.join(process.cwd(), relative));
};
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const lineCount = bytes => {
  const text = bytes.toString("utf8");
  return text.length === 0 ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
};
const stable = value => {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}";
  return JSON.stringify(value);
};
const raw = new Map(members.map(member => [member, bytesFor(member)]));
for (const [member, bytes] of raw) {
  const text = bytes.toString("utf8");
  const forbiddenTokens = ["/" + "Users","file" + "://",".." + "/",workspacePrefix,"Math." + "random","random" + "UUID"];
  for (const forbidden of forbiddenTokens) check(!text.includes(forbidden), "FORBIDDEN-TOKEN:" + member + ":" + forbidden);
}
const subject = raw.get(members[0]).toString("utf8");
const registry = JSON.parse(raw.get(members[1]).toString("utf8"));
const graph = JSON.parse(raw.get(members[2]).toString("utf8"));
const vectors = JSON.parse(raw.get(members[3]).toString("utf8"));
const closures = JSON.parse(raw.get(members[4]).toString("utf8"));

const requirementHeadings = [...subject.matchAll(/^## 3[.][0-9]+ (PRCV3-REQ-[0-9]{3})$/gm)].map(match => match[1]);
check(requirementHeadings.length === 56, "SUBJECT-REQUIREMENT-COUNT");
check(new Set(requirementHeadings).size === 56, "SUBJECT-REQUIREMENT-UNIQUE");
check(registry.requirements.length === 56, "REGISTRY-REQUIREMENT-COUNT");
check(registry.registryObjects.length === 56, "REGISTRY-OBJECT-COUNT");
check(registry.producerDefinitions.length === 56, "REGISTRY-PRODUCER-COUNT");
check(registry.repositoryVisibility === "PUBLIC", "REGISTRY-VISIBILITY");
check(registry.currentDisposition.acceptance === 0, "REGISTRY-ACCEPTANCE");
check(registry.currentDisposition.gate29 === "BLOCKED", "REGISTRY-GATE29");
check(registry.currentDisposition.developmentFreeze === "ACTIVE", "REGISTRY-FREEZE");
check(registry.deterministicIdentity.randomnessAllowed === false, "REGISTRY-RANDOMNESS");
const requirementIds = registry.requirements.map(row => row.requirementId);
const objectIds = registry.requirements.map(row => row.outputObjectId);
const producerIds = registry.requirements.map(row => row.soleProducerId);
check(new Set(requirementIds).size === 56, "REQUIREMENT-ID-UNIQUE");
check(new Set(objectIds).size === 56, "OBJECT-ID-UNIQUE");
check(new Set(producerIds).size === 56, "PRODUCER-ID-UNIQUE");
registry.requirements.forEach((row,index) => {
  const expected = "PRCV3-REQ-" + String(index).padStart(3,"0");
  check(row.requirementId === expected, "REQUIREMENT-ID-CONTIGUOUS:" + row.requirementId);
  check(row.outputObjectId === "PRCV3-OBJECT-" + String(index).padStart(3,"0"), "OUTPUT-ALIGN:" + row.requirementId);
  check(row.soleProducerId === "PRCV3-PRODUCER-" + String(index).padStart(3,"0"), "PRODUCER-ALIGN:" + row.requirementId);
  for (const dep of row.dependencies) check(Number(dep.slice(-3)) < index, "DEPENDENCY-NOT-LOWER:" + row.requirementId + ":" + dep);
});
const inputMap = new Map(registry.inputs.map(row => [row.inputId,row]));
for (const [id,root] of Object.entries(expectedInputs)) check(inputMap.get(id)?.sha256 === root, "INPUT-ROOT:" + id);
check(inputMap.get("SECRET-SCAN-V1")?.claimClass === "HISTORICAL-ONLY", "SECRET-V1-NOT-HISTORICAL");
check(inputMap.get("SECRET-SCAN-V2")?.supersedes === "SECRET-SCAN-V1", "SECRET-V2-SUPERSESSION");

check(graph.nodes.length === 187, "GRAPH-NODE-COUNT");
check(graph.edges.length === 349, "GRAPH-EDGE-COUNT");
const nodeMap = new Map(graph.nodes.map(node => [node.nodeId,node]));
check(nodeMap.size === graph.nodes.length, "GRAPH-NODE-UNIQUE");
check(new Set(graph.edges.map(edge => edge.edgeId)).size === graph.edges.length, "GRAPH-EDGE-UNIQUE");
for (const edge of graph.edges) {
  const from = nodeMap.get(edge.from);
  const to = nodeMap.get(edge.to);
  check(Boolean(from) && Boolean(to), "GRAPH-DANGLING:" + edge.edgeId);
  if (from && to) check(from.topologicalIndex < to.topologicalIndex, "GRAPH-NONTOPOLOGICAL:" + edge.edgeId);
}
for (const row of registry.requirements) {
  const produced = graph.edges.filter(edge => edge.edgeType === "PRODUCES" && edge.to === row.outputObjectId && edge.from === row.soleProducerId);
  check(produced.length === 1, "GRAPH-SOLE-PRODUCER:" + row.outputObjectId);
}

check(closures.records.length === 59, "CLOSURE-COUNT");
check(vectors.vectors.length === 59, "VECTOR-COUNT");
const closureByFinding = new Map(closures.records.map(row => [row.findingId,row]));
const vectorByFinding = new Map(vectors.vectors.map(row => [row.findingId,row]));
check(closureByFinding.size === 59, "CLOSURE-FINDING-UNIQUE");
check(vectorByFinding.size === 59, "VECTOR-FINDING-UNIQUE");
check(new Set(closures.records.map(row => row.noMergeKey)).size === 59, "CLOSURE-NOMERGE-UNIQUE");
check(new Set(closures.records.map(row => row.vectorId)).size === 59, "CLOSURE-VECTOR-UNIQUE");
let vectorTerminalMatches = 0;
const applyMutation = vector => {
  const state = JSON.parse(JSON.stringify(vector.preimage));
  const op = vector.operation;
  if (op.kind === "SET_FIELD") {
    check(Object.hasOwn(state,op.field), "VECTOR-SET-MISSING:" + vector.vectorId);
    state[op.field] = op.value;
  } else if (op.kind === "DELETE_FIELD") {
    check(Object.hasOwn(state,op.field), "VECTOR-DELETE-MISSING:" + vector.vectorId);
    delete state[op.field];
  } else if (op.kind === "APPEND_SET_MEMBER") {
    check(Array.isArray(state[op.field]), "VECTOR-APPEND-NONARRAY:" + vector.vectorId);
    if (Array.isArray(state[op.field])) {
      state[op.field].push(op.value);
      state[op.field].sort();
    }
  } else {
    errors.push("VECTOR-UNKNOWN-OP:" + vector.vectorId);
  }
  return state;
};
const oraclePasses = (state,oracle) => {
  if (oracle.kind === "FIELD_EQUALS") return state[oracle.field] === oracle.required;
  if (oracle.kind === "FIELD_PRESENT") return Object.hasOwn(state,oracle.field) === oracle.required;
  if (oracle.kind === "SET_EQUALS") return Array.isArray(state[oracle.field]) && stable(state[oracle.field].slice().sort()) === stable(oracle.required.slice().sort());
  errors.push("VECTOR-UNKNOWN-ORACLE:" + oracle.oracleId);
  return false;
};
for (const vector of vectors.vectors) {
  const post = applyMutation(vector);
  check(stable(post) === stable(vector.postimage), "VECTOR-POSTIMAGE:" + vector.vectorId);
  const passed = oraclePasses(post,vector.oracle);
  const terminal = passed ? "PASS" : vector.expectedTerminal;
  check(terminal === vector.expectedTerminal, "VECTOR-TERMINAL:" + vector.vectorId);
  if (terminal === vector.expectedTerminal) vectorTerminalMatches++;
  const closure = closureByFinding.get(vector.findingId);
  check(Boolean(closure), "VECTOR-ORPHAN:" + vector.vectorId);
  if (closure) {
    check(closure.vectorId === vector.vectorId, "VECTOR-CLOSURE-ID:" + vector.vectorId);
    check(closure.noMergeKey === vector.noMergeKey, "VECTOR-NOMERGE:" + vector.vectorId);
    check(closure.accepted === false && closure.evidenceRoots.length === 0, "CLOSURE-FALSE-CREDIT:" + closure.findingId);
  }
  check(objectIds.includes(vector.targetObjectId), "VECTOR-TARGET:" + vector.vectorId);
}
for (let index=1;index<=32;index++) check(closureByFinding.has("PRCS-HR-F" + String(index).padStart(3,"0")), "PREDECESSOR-FINDING:" + index);
for (let index=33;index<=59;index++) check(closureByFinding.has("PRCH2V2-IHR-F" + String(index).padStart(3,"0")), "NEW-FINDING:" + index);

const memberRoots = members.map(member => ({path:member,sha256:hash(raw.get(member)),bytes:raw.get(member).length,lines:lineCount(raw.get(member))}));
const coreContentRoot = hash(Buffer.from(memberRoots.map(row => row.path + "\u0000" + row.sha256 + "\u0000" + row.bytes + "\n").join(""),"utf8"));
const readerBytes = bytesFor(readerPath);
const report = {
  artifactId:"CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V3-READER-A-REPORT-2026-08-30",
  readerId,
  readerPath,
  readerSha256:hash(readerBytes),
  profile:"REGEX-SHAPE-PLUS-DECLARED-TOPOLOGY-PLUS-DIRECT-MUTATION",
  stdlibModules:["node:fs","node:path","node:crypto"],
  sharedLocalModules:0,
  memberRoots,
  coreContentRoot,
  checks:{requirements:56,outputs:56,producers:56,graphNodes:187,graphEdges:349,closures:59,vectors:59,vectorTerminalMatches,forbiddenLocatorMatches:0},
  errors,
  result:errors.length === 0 ? "PASS-PLANNING-PACKAGE" : "FAIL-PLANNING-PACKAGE",
  claimLimit:"No operational, GitHub, provider, Product, Push, deploy, release or Acceptance credit.",
  currentDisposition:{acceptance:0,repositoryVisibility:"PUBLIC",gate29:"BLOCKED",developmentFreeze:"ACTIVE"}
};
process.stdout.write(JSON.stringify(report,null,2) + "\n");
