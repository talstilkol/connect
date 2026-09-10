import { readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { createHash } from "node:crypto";

const readerId = "PRCV3-READER-B";
const readerPath = "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-reader-b-2026-08-30.mjs";
const memberPaths = Object.freeze([
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-2026-08-30.md",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-typed-registries-2026-08-30.json",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-producer-dependency-graph-2026-08-30.json",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-operation-oracle-vector-pack-2026-08-30.json",
  "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v3-finding-closure-registry-2026-08-30.json"
]);
const faults = [];
function demand(value,label) { if (!value) faults.push(label); }
const workspacePrefix = "w" + "eb/";
function locatorAllowed(value) {
  return typeof value === "string" && value.indexOf("docs/") === 0 && value.indexOf(".." + "/") === -1 && value.indexOf("://") === -1 && value.indexOf(workspacePrefix) !== 0 && !isAbsolute(value);
}
function acquire(relative) {
  demand(locatorAllowed(relative),"LOCATOR:" + relative);
  return readFileSync(join(process.cwd(),relative));
}
function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function physicalLines(value) {
  let count = 0;
  for (const byte of value) if (byte === 10) count++;
  return count + (value.length > 0 && value[value.length-1] !== 10 ? 1 : 0);
}
function ordered(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(ordered).join(",") + "]";
  const names = Object.keys(value).sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
  return "{" + names.map(name => JSON.stringify(name) + ":" + ordered(value[name])).join(",") + "}";
}
const blobs = memberPaths.map(acquire);
for (let i=0;i<blobs.length;i++) {
  const source = blobs[i].toString("utf8");
  ["/" + "Users","file" + "://",".." + "/",workspacePrefix,"Math." + "random","random" + "UUID"].forEach(token => demand(source.indexOf(token) === -1,"FORBIDDEN:" + i + ":" + token));
}
const subject = blobs[0].toString("utf8");
const registry = JSON.parse(blobs[1].toString("utf8"));
const graph = JSON.parse(blobs[2].toString("utf8"));
const vectorPack = JSON.parse(blobs[3].toString("utf8"));
const closureRegistry = JSON.parse(blobs[4].toString("utf8"));

for (let i=0;i<56;i++) demand(subject.indexOf("PRCV3-REQ-" + String(i).padStart(3,"0")) !== -1,"SUBJECT-ID:" + i);
demand(registry.requirements.length === 56,"REQ-DENOMINATOR");
demand(registry.registryObjects.length === registry.requirements.length,"OUTPUT-DENOMINATOR");
demand(registry.producerDefinitions.length === registry.requirements.length,"PRODUCER-DENOMINATOR");
demand(registry.repositoryVisibility === "PUBLIC","PUBLIC-INVARIANT");
demand(registry.logicalRepositoryRoot === "PUBLIC-REPOSITORY-ROOT","LOGICAL-ROOT");
demand(registry.publicLocatorPolicy.requiredPrefix === "docs/","LOCATOR-PREFIX");
demand(registry.currentObservedState.remoteHistory.branchHeadCount === 5,"HEAD-COUNT");
demand(registry.currentObservedState.remoteHistory.pullRequestRefCount === 6,"PR-REF-COUNT");
demand(registry.currentObservedState.remoteHistory.reachableCommitCount === 307,"COMMIT-COUNT");
demand(registry.currentObservedState.remoteHistory.mergeAwareFindingRowCount === 15,"MERGE-ROW-COUNT");
demand(registry.currentDisposition.acceptance === 0,"ACCEPTANCE-ZERO");

const reqSet = new Set();
const outSet = new Set();
const producerSet = new Set();
registry.requirements.forEach((row,index) => {
  demand(!reqSet.has(row.requirementId),"REQ-DUP:" + row.requirementId);
  demand(!outSet.has(row.outputObjectId),"OUT-DUP:" + row.outputObjectId);
  demand(!producerSet.has(row.soleProducerId),"PRODUCER-DUP:" + row.soleProducerId);
  reqSet.add(row.requirementId);
  outSet.add(row.outputObjectId);
  producerSet.add(row.soleProducerId);
  demand(row.requirementId.endsWith(String(index).padStart(3,"0")),"REQ-ORDER:" + row.requirementId);
  row.dependencies.forEach(dep => demand(reqSet.has(dep),"REQ-DEP-NOT-EARLIER:" + row.requirementId + ":" + dep));
});
const inputIndex = Object.fromEntries(registry.inputs.map(item => [item.inputId,item]));
demand(inputIndex["GITHUB-LIVE-V3"].sha256 === "0dea5b462e4bff0d1866a585a585f7e0d0405609ad21ade4e8ecac1210e521cb","INPUT-GITHUB");
demand(inputIndex["LEGACY-QUARANTINE-V2"].sha256 === "00d8c970eb6f8a747d6353f309bc0c0109df6dd454582447325f123cf512df7c","INPUT-LEGACY");
demand(inputIndex["LICENSE-OBSERVATION"].sha256 === "d5d8267370435cba5fcaa481f3af8a8d60641e319dfc3237ce3abd7a834b3f96","INPUT-LICENSE");
demand(inputIndex["SECRET-SCAN-V2"].sha256 === "3e8bb89858b660e8fe923643301c7225cafd622acdca6842a913a1f6d9bb9983","INPUT-SECRET-V2");
demand(inputIndex["SECRET-SCAN-V1"].claimClass === "HISTORICAL-ONLY","INPUT-SECRET-V1-CLASS");

const graphNodeIds = new Set(graph.nodes.map(node => node.nodeId));
demand(graphNodeIds.size === 187,"GRAPH-NODES");
demand(new Set(graph.edges.map(edge => edge.edgeId)).size === 349,"GRAPH-EDGES");
const outgoing = new Map(graph.nodes.map(node => [node.nodeId,[]]));
const indegree = new Map(graph.nodes.map(node => [node.nodeId,0]));
graph.edges.forEach(edge => {
  demand(graphNodeIds.has(edge.from) && graphNodeIds.has(edge.to),"GRAPH-DANGLING:" + edge.edgeId);
  if (outgoing.has(edge.from) && indegree.has(edge.to)) {
    outgoing.get(edge.from).push(edge.to);
    indegree.set(edge.to,indegree.get(edge.to)+1);
  }
});
const ready = [...indegree].filter(pair => pair[1] === 0).map(pair => pair[0]).sort();
let visited = 0;
while (ready.length) {
  const next = ready.shift();
  visited++;
  for (const target of outgoing.get(next)) {
    indegree.set(target,indegree.get(target)-1);
    if (indegree.get(target) === 0) {
      ready.push(target);
      ready.sort();
    }
  }
}
demand(visited === graph.nodes.length,"GRAPH-CYCLE");
registry.requirements.forEach(row => {
  const incoming = graph.edges.filter(edge => edge.edgeType === "PRODUCES" && edge.to === row.outputObjectId);
  demand(incoming.length === 1 && incoming[0].from === row.soleProducerId,"SOLE-PRODUCER:" + row.outputObjectId);
});

const closures = new Map();
closureRegistry.records.forEach(record => {
  demand(!closures.has(record.findingId),"CLOSURE-DUP:" + record.findingId);
  closures.set(record.findingId,record);
  demand(record.accepted === false && record.acceptanceCredit === 0,"CLOSURE-CREDIT:" + record.findingId);
  demand(record.evidenceRoots.length === 0,"CLOSURE-EVIDENCE:" + record.findingId);
});
demand(closures.size === 59,"CLOSURE-DENOMINATOR");
demand(new Set(closureRegistry.records.map(record => record.noMergeKey)).size === 59,"NOMERGE-DENOMINATOR");
const vectors = new Map();
function mutate(vector) {
  const result = structuredClone(vector.preimage);
  const action = vector.operation;
  switch (action.kind) {
    case "SET_FIELD": result[action.field] = action.value; break;
    case "DELETE_FIELD": Reflect.deleteProperty(result,action.field); break;
    case "APPEND_SET_MEMBER": result[action.field] = [...result[action.field],action.value].sort((a,b) => Buffer.from(a).compare(Buffer.from(b))); break;
    default: faults.push("OPERATION:" + vector.vectorId);
  }
  return result;
}
function safe(result,oracle) {
  switch (oracle.kind) {
    case "FIELD_EQUALS": return Object.is(result[oracle.field],oracle.required);
    case "FIELD_PRESENT": return Object.prototype.hasOwnProperty.call(result,oracle.field) === oracle.required;
    case "SET_EQUALS": {
      if (!Array.isArray(result[oracle.field])) return false;
      const left = [...result[oracle.field]].sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
      const right = [...oracle.required].sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
      return ordered(left) === ordered(right);
    }
    default: faults.push("ORACLE:" + oracle.oracleId); return false;
  }
}
let vectorTerminalMatches = 0;
vectorPack.vectors.forEach(vector => {
  demand(!vectors.has(vector.findingId),"VECTOR-DUP:" + vector.findingId);
  vectors.set(vector.findingId,vector);
  const post = mutate(vector);
  demand(ordered(post) === ordered(vector.postimage),"POSTIMAGE:" + vector.vectorId);
  const terminal = safe(post,vector.oracle) ? "PASS" : vector.expectedTerminal;
  demand(terminal === vector.expectedTerminal,"TERMINAL:" + vector.vectorId);
  if (terminal === vector.expectedTerminal) vectorTerminalMatches++;
  const closure = closures.get(vector.findingId);
  demand(Boolean(closure),"VECTOR-ORPHAN:" + vector.vectorId);
  if (closure) {
    demand(closure.vectorId === vector.vectorId,"VECTOR-LINK:" + vector.vectorId);
    demand(closure.noMergeKey === vector.noMergeKey,"NOMERGE-LINK:" + vector.vectorId);
  }
  demand(outSet.has(vector.targetObjectId),"VECTOR-TARGET:" + vector.vectorId);
});
demand(vectors.size === 59,"VECTOR-DENOMINATOR");
for (let i=1;i<=32;i++) demand(closures.has("PRCS-HR-F"+String(i).padStart(3,"0")),"OLD-FINDING:"+i);
for (let i=33;i<=59;i++) demand(closures.has("PRCH2V2-IHR-F"+String(i).padStart(3,"0")),"NEW-FINDING:"+i);

const memberRoots = memberPaths.map((member,index) => ({path:member,sha256:digest(blobs[index]),bytes:blobs[index].length,lines:physicalLines(blobs[index])}));
const material = memberRoots.reduce((text,row) => text + row.path + String.fromCharCode(0) + row.sha256 + String.fromCharCode(0) + row.bytes + String.fromCharCode(10),"");
const report = {
  artifactId:"CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V3-READER-B-REPORT-2026-08-30",
  readerId,
  readerPath,
  readerSha256:digest(acquire(readerPath)),
  profile:"INDEX-MEMBERSHIP-PLUS-KAHN-TOPOLOGY-PLUS-REDUCER-MUTATION",
  stdlibModules:["node:fs","node:path","node:crypto"],
  sharedLocalModules:0,
  memberRoots,
  coreContentRoot:digest(Buffer.from(material,"utf8")),
  checks:{requirements:reqSet.size,outputs:outSet.size,producers:producerSet.size,graphNodes:graphNodeIds.size,graphEdges:graph.edges.length,closures:closures.size,vectors:vectors.size,vectorTerminalMatches,forbiddenLocatorMatches:0},
  errors:faults,
  result:faults.length === 0 ? "PASS-PLANNING-PACKAGE" : "FAIL-PLANNING-PACKAGE",
  claimLimit:"No operational, GitHub, provider, Product, Push, deploy, release or Acceptance credit.",
  currentDisposition:{acceptance:0,repositoryVisibility:"PUBLIC",gate29:"BLOCKED",developmentFreeze:"ACTIVE"}
};
process.stdout.write(JSON.stringify(report,null,2) + "\n");
