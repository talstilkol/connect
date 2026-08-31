#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const READER_ID = "PRCV4-READER-A-NODE";
const EXPECTED_REPOSITORY = "github.com/talstilkol/connect";
const MANIFEST_PATH = "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-atomic-package-manifest-2026-08-30.json";
const MEMBER_PATHS = [
  ["subject", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-2026-08-30.md"],
  ["registries", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-schema-and-typed-registries-2026-08-30.json"],
  ["graph", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-producer-dependency-graph-2026-08-30.json"],
  ["vectors", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-operation-oracle-vector-pack-2026-08-30.json"],
  ["closures", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-finding-closure-registry-2026-08-30.json"],
  ["readerA", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-a-2026-08-30.mjs"],
  ["readerB", "docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-reader-b-2026-08-30.rb"]
];

const checks = [];
const errors = [];

function check(condition, code, detail = "") {
  const passed = Boolean(condition);
  checks.push({ code, passed });
  if (!passed) errors.push(detail ? `${code}: ${detail}` : code);
  return passed;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function lineCount(bytes) {
  let count = 0;
  for (const byte of bytes) if (byte === 10) count += 1;
  return count;
}

function normalizeOrigin(raw) {
  const value = raw.trim();
  const https = value.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  const ssh = value.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  const parsed = https || ssh;
  return parsed ? `github.com/${parsed[1]}/${parsed[2]}`.toLowerCase() : null;
}

function validatePlanningPath(relativePath) {
  if (typeof relativePath !== "string") throw new Error("path is not a string");
  if (relativePath !== relativePath.normalize("NFC")) throw new Error(`non-NFC path: ${relativePath}`);
  if (!relativePath.startsWith("docs/planning/")) throw new Error(`wrong planning prefix: ${relativePath}`);
  if (relativePath.includes("\0") || relativePath.includes("\\")) throw new Error(`forbidden path byte: ${relativePath}`);
  if (path.posix.isAbsolute(relativePath) || path.posix.normalize(relativePath) !== relativePath) {
    throw new Error(`non-canonical path: ${relativePath}`);
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`forbidden path segment: ${relativePath}`);
  }
}

function discoverRepositoryRoot() {
  const discovered = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
  const realRoot = fs.realpathSync.native(discovered);
  const cwdReal = fs.realpathSync.native(process.cwd());
  check(cwdReal === realRoot || cwdReal.startsWith(realRoot + path.sep), "ROOT-CWD-WITHIN-DISCOVERED", cwdReal);
  check(discovered === realRoot, "ROOT-REALPATH-CANONICAL", `${discovered} != ${realRoot}`);
  const origin = execFileSync("git", ["remote", "get-url", "origin"], {
    cwd: realRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  check(normalizeOrigin(origin) === EXPECTED_REPOSITORY, "ROOT-ORIGIN-IDENTITY", origin.trim());
  return realRoot;
}

function resolvePlanningFile(repoRoot, relativePath) {
  validatePlanningPath(relativePath);
  const lexical = path.resolve(repoRoot, ...relativePath.split("/"));
  if (!(lexical.startsWith(repoRoot + path.sep))) throw new Error(`lexical escape: ${relativePath}`);
  const real = fs.realpathSync.native(lexical);
  if (!(real.startsWith(repoRoot + path.sep))) throw new Error(`symlink escape: ${relativePath}`);
  return real;
}

function strictJsonLexical(text, label) {
  let index = 0;
  const skip = () => {
    while (index < text.length && /[\u0020\u000a\u000d\u0009]/.test(text[index])) index += 1;
  };
  const parseString = () => {
    const start = index;
    if (text[index] !== '"') throw new Error(`${label}: expected string at ${index}`);
    index += 1;
    while (index < text.length) {
      const char = text[index];
      if (char === '"') {
        index += 1;
        return JSON.parse(text.slice(start, index));
      }
      if (char === "\\") {
        index += 1;
        if (text[index] === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(index + 1, index + 5))) {
            throw new Error(`${label}: invalid Unicode escape at ${index}`);
          }
          index += 5;
        } else {
          if (!/["\\/bfnrt]/.test(text[index] || "")) throw new Error(`${label}: invalid escape at ${index}`);
          index += 1;
        }
      } else {
        if (char.charCodeAt(0) < 32) throw new Error(`${label}: control character in string`);
        index += 1;
      }
    }
    throw new Error(`${label}: unterminated string`);
  };
  const parseValue = () => {
    skip();
    if (text[index] === "{") {
      index += 1;
      skip();
      const keys = new Set();
      if (text[index] === "}") {
        index += 1;
        return;
      }
      while (index < text.length) {
        skip();
        const key = parseString();
        if (keys.has(key)) throw new Error(`${label}: duplicate key ${key}`);
        keys.add(key);
        skip();
        if (text[index] !== ":") throw new Error(`${label}: expected colon at ${index}`);
        index += 1;
        parseValue();
        skip();
        if (text[index] === "}") {
          index += 1;
          return;
        }
        if (text[index] !== ",") throw new Error(`${label}: expected comma at ${index}`);
        index += 1;
      }
      throw new Error(`${label}: unterminated object`);
    }
    if (text[index] === "[") {
      index += 1;
      skip();
      if (text[index] === "]") {
        index += 1;
        return;
      }
      while (index < text.length) {
        parseValue();
        skip();
        if (text[index] === "]") {
          index += 1;
          return;
        }
        if (text[index] !== ",") throw new Error(`${label}: expected array comma at ${index}`);
        index += 1;
      }
      throw new Error(`${label}: unterminated array`);
    }
    if (text[index] === '"') {
      parseString();
      return;
    }
    const token = text.slice(index).match(/^(?:-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|true|false|null)/);
    if (!token) throw new Error(`${label}: invalid token at ${index}`);
    index += token[0].length;
  };
  parseValue();
  skip();
  if (index !== text.length) throw new Error(`${label}: trailing bytes at ${index}`);
}

function validateJsonValue(value, label, trail = "$") {
  if (typeof value === "string") {
    if (value !== value.normalize("NFC")) throw new Error(`${label}: non-NFC string at ${trail}`);
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error(`${label}: unpaired high surrogate at ${trail}`);
        index += 1;
      } else if (code >= 0xdc00 && code <= 0xdfff) {
        throw new Error(`${label}: unpaired low surrogate at ${trail}`);
      }
    }
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error(`${label}: forbidden number at ${trail}`);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => validateJsonValue(entry, label, `${trail}[${index}]`));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => {
      if (key !== key.normalize("NFC")) throw new Error(`${label}: non-NFC key at ${trail}`);
      validateJsonValue(entry, label, `${trail}.${key}`);
    });
  }
}

function readJson(repoRoot, relativePath) {
  const bytes = fs.readFileSync(resolvePlanningFile(repoRoot, relativePath));
  const text = bytes.toString("utf8");
  strictJsonLexical(text, relativePath);
  const value = JSON.parse(text);
  validateJsonValue(value, relativePath);
  return { bytes, value };
}

function fileRecord(repoRoot, relativePath) {
  const bytes = fs.readFileSync(resolvePlanningFile(repoRoot, relativePath));
  return { path: relativePath, sha256: sha256(bytes), lines: lineCount(bytes), bytes: bytes.length };
}

function domainRoot(domain, members) {
  const material = members.map((member) =>
    `${member.path}\0${member.sha256}\0${member.bytes}\n`
  ).join("");
  return sha256(Buffer.concat([
    Buffer.from(`CONNECT-PRCV4:${domain}:`, "utf8"),
    Buffer.from(material, "utf8")
  ]));
}

function sameArray(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function suffix(index) {
  return String(index).padStart(3, "0");
}

function collectKeys(value, output = []) {
  if (Array.isArray(value)) value.forEach((entry) => collectKeys(entry, output));
  else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      output.push(key);
      collectKeys(entry, output);
    }
  }
  return output;
}

let report = {
  artifactId: "CONNECT-PRCV4-READER-A-REPORT-2026-08-30",
  artifactClass: "MECHANICAL-READER-RECEIPT-NOT-SEMANTIC-ACCEPTANCE",
  readerId: READER_ID,
  implementationLanguage: "JavaScript-Node.js",
  algorithmFamily: "recursive-descent-json-plus-kahn-dag",
  repositoryVisibility: "PUBLIC",
  manifestPath: MANIFEST_PATH,
  manifestSha256: null,
  coreRoot: null,
  packageRoot: null,
  counts: {},
  checks: { passed: 0, failed: 0, failedCodes: [] },
  mechanicalVerdict: "FAIL",
  semanticAcceptance: 0,
  gate29: "BLOCKED",
  developmentFreeze: "ACTIVE",
  publicPushPermit: "ABSENT",
  controlPlanePermit: "ABSENT",
  deploymentPermit: "ABSENT",
  releasePermit: "ABSENT",
  errors: []
};

try {
  const repoRoot = discoverRepositoryRoot();
  const registryPath = MEMBER_PATHS[1][1];
  const graphPath = MEMBER_PATHS[2][1];
  const vectorPath = MEMBER_PATHS[3][1];
  const closurePath = MEMBER_PATHS[4][1];
  const subjectPath = MEMBER_PATHS[0][1];
  const registry = readJson(repoRoot, registryPath).value;
  const graph = readJson(repoRoot, graphPath).value;
  const vectors = readJson(repoRoot, vectorPath).value;
  const closures = readJson(repoRoot, closurePath).value;
  const manifestRead = readJson(repoRoot, MANIFEST_PATH);
  const manifest = manifestRead.value;
  const subject = fs.readFileSync(resolvePlanningFile(repoRoot, subjectPath), "utf8");

  report.manifestSha256 = sha256(manifestRead.bytes);
  report.coreRoot = manifest.coreRoot;
  report.packageRoot = manifest.packageRoot;

  check(registry.repositoryBinding.logicalId === EXPECTED_REPOSITORY, "REGISTRY-REPOSITORY-BINDING");
  check(registry.repositoryVisibility === "PUBLIC", "REGISTRY-PUBLIC");
  check(registry.canonicalProfile.profileId === "PRCV4-CJ-1", "REGISTRY-CANONICAL-PROFILE");
  check(new Set(registry.artifactDomains).size === registry.artifactDomains.length, "REGISTRY-DOMAINS-UNIQUE");
  check(["CORE-PACKAGE-ROOT", "PACKAGE-ROOT", "MANIFEST-ENVELOPE", "READER-REPORT"].every((id) => registry.artifactDomains.includes(id)), "REGISTRY-DOMAINS-COMPLETE");

  check(registry.physicalInputs.length === 15, "INPUT-PHYSICAL-DENOMINATOR");
  const inputIds = new Set();
  const actualPhysicalInputs = [];
  for (const input of registry.physicalInputs) {
    inputIds.add(input.inputId);
    const actual = fileRecord(repoRoot, input.path);
    actualPhysicalInputs.push({ inputId: input.inputId, ...actual, claimClass: input.claimClass });
    check(actual.sha256 === input.sha256 && actual.lines === input.lines && actual.bytes === input.bytes, `INPUT-BYTES-${input.inputId}`);
  }
  check(inputIds.size === 15, "INPUT-PHYSICAL-UNIQUE");
  check(registry.typedAbsentInputs.length === 10, "INPUT-ABSENT-DENOMINATOR");
  check(new Set(registry.typedAbsentInputs.map((entry) => entry.inputId)).size === 10, "INPUT-ABSENT-UNIQUE");
  check(registry.typedAbsentInputs.every((entry) =>
    entry.state === "ABSENT"
    && !Object.keys(entry).some((key) => /path|locator|digest|sha/i.test(key))
  ), "INPUT-ABSENCE-TYPED-NO-LOCATOR");
  check(sameArray(manifest.physicalInputMembers, actualPhysicalInputs)
    && manifest.physicalInputRoot === domainRoot("INPUT-MANIFEST", actualPhysicalInputs)
    && sameArray(manifest.typedAbsentInputIds, registry.typedAbsentInputs.map((entry) => entry.inputId)),
  "MANIFEST-PHYSICAL-AND-ABSENT-INPUT-BINDING");

  const requirements = registry.requirementDefinitions;
  const producers = registry.producerDefinitions;
  const states = registry.plannedOutputStates;
  check(requirements.length === 42 && producers.length === 42 && states.length === 42, "REQUIREMENT-PRODUCER-STATE-DENOMINATORS");
  const reqById = new Map(requirements.map((entry) => [entry.requirementId, entry]));
  check(reqById.size === 42, "REQUIREMENT-IDS-UNIQUE");
  check(requirements.every((entry, index) => entry.requirementId === `PRCV4-REQ-${suffix(index)}`), "REQUIREMENT-IDS-CONTIGUOUS");
  check(requirements.every((entry, index) =>
    entry.dependencies.every((dependency) => Number(dependency.slice(-3)) < index)
  ), "REQUIREMENT-DEPENDENCIES-TOPOLOGICAL");
  check(requirements.every((entry) =>
    entry.outputSchema
    && entry.outputSchema.additionalProperties === false
    && Object.keys(entry.outputSchema.required || {}).length > 0
    && Array.isArray(entry.outputSchema.invariants)
    && entry.outputSchema.invariants.length > 0
    && typeof entry.failure === "string"
  ), "REQUIREMENT-SCHEMAS-CLOSED-NONVACUOUS");
  const criticalControlFields = {
    "PRCV4-REQ-002": ["planningPathGrammar", "repositoryPathGrammar", "gitTopLevelRealPathCommitment", "originIdentity"],
    "PRCV4-REQ-005": ["trustedTimeAuthorityRoot", "maximumTtls", "atomicConsumeRule", "descendantRevocationRule"],
    "PRCV4-REQ-011": ["head", "refs", "indexEntries", "worktreeEntries", "writerBarrierReceipt", "preHead", "postHead"],
    "PRCV4-REQ-012": ["cutStart", "cutEnd", "refs", "reachableObjectRoot", "forkRecords", "unreachableCapability", "inaccessibleRecords"],
    "PRCV4-REQ-013": ["surfaceDefinitions", "surfaceInstances", "paginationRoot", "retentionRoot", "inaccessibleRoot"],
    "PRCV4-REQ-014": ["entryRecords", "ownerAuthorityRoot", "deletionAuthorityRoot", "preservationRoot"],
    "PRCV4-REQ-015": ["generatedRecords", "buildContexts", "legacyTaintRecords", "symlinkEscapeState"],
    "PRCV4-REQ-018": ["privateLedgerCommitment", "candidateCount", "stateCounts", "rotationReceipts", "residualCopyRecords"],
    "PRCV4-REQ-019": ["scannerRecords", "identicalInputCutRoot", "detectorCorpusRoot", "executionReceipts", "disagreementRecords", "combinedOutcome"],
    "PRCV4-REQ-022": ["cacheRecords", "artifactRecords", "runnerRecords", "purgeRoot"],
    "PRCV4-REQ-025": ["permitRoot", "issuerRoot", "executorRoot", "readerRoot", "beforeRoot", "orderedOperations", "consumeReceipt", "afterRoot", "readbackRoot"],
    "PRCV4-REQ-027": ["baseRef", "expectedOldOid", "newCommitOid", "entryRecords", "sentObjectRoot", "builderARoot", "builderBRoot", "adjudicatorRoot", "allowlistRoot"],
    "PRCV4-REQ-028": ["requiredVisibility", "issueReadbackRoot", "consumeReadbackRoot", "monitorReceiptRoot", "maximumFreshnessSeconds", "descendantRevocationRoot"],
    "PRCV4-REQ-029": ["permitRoot", "refName", "expectedOldOid", "newOid", "sentObjectRoot", "allowlistRoot", "issuedAt", "expiresAt", "consumeReceipt", "remoteReceipt", "postReadbackRoot"],
    "PRCV4-REQ-031": ["permitRoot", "artifactRoot", "targetRoot", "planRoot", "consumeReceipt", "applyReceipt", "driftRoot", "recoveryRoot"],
    "PRCV4-REQ-032": ["permitRoot", "commitOid", "tagRef", "releaseRoot", "assetRoots", "packageCoordinates", "consumeReceipt", "consumerVerificationRoot"]
  };
  check(Object.entries(criticalControlFields).every(([requirementId, fields]) =>
    fields.every((field) => Object.prototype.hasOwnProperty.call(reqById.get(requirementId).outputSchema.required, field))
  ), "CRITICAL-CONTROL-FIELD-BINDINGS");
  check(new Set(requirements.map((entry) => entry.outputObjectId)).size === 42, "OUTPUT-OBJECTS-UNIQUE");
  check(new Set(requirements.map((entry) => entry.soleProducerId)).size === 42, "SOLE-PRODUCERS-UNIQUE");
  check(producers.every((producer, index) => {
    const requirement = requirements[index];
    return producer.producerId === requirement.soleProducerId
      && producer.outputObjectId === requirement.outputObjectId
      && sameArray(producer.inputObjectIds, requirement.dependencies.map((id) => `PRCV4-OBJECT-${id.slice(-3)}`))
      && producer.bootstrapAuthorityObjectId === (index >= 4 ? "PRCV4-OBJECT-003" : null)
      && producer.implementationRoot === null
      && producer.signerRoot === null
      && producer.capabilityRoot === null
      && producer.implementationState === "ABSENT"
      && producer.acceptanceCredit === 0;
  }), "SOLE-PRODUCER-AUTHORITY-ABSENT");
  check(states.every((state, index) => {
    const requirement = requirements[index];
    return state.objectId === requirement.outputObjectId
      && state.outputType === requirement.outputType
      && state.schemaRequirementId === requirement.requirementId
      && state.producerId === requirement.soleProducerId
      && sameArray(state.dependencyObjectIds, requirement.dependencies.map((id) => `PRCV4-OBJECT-${id.slice(-3)}`))
      && state.state === "DECLARED-UNIMPLEMENTED"
      && state.head === null
      && state.epoch === null
      && state.expiresAt === null
      && state.evidenceRoots.length === 0
      && state.acceptanceCredit === 0;
  }), "PLANNED-OUTPUT-STATES-NONACCEPTED");
  check(sameArray(requirements[40].dependencies, requirements.slice(0, 40).map((entry) => entry.requirementId)), "ACCEPTANCE-EXACT-PRIOR-CUT");
  check(sameArray(requirements[41].dependencies, requirements.slice(0, 41).map((entry) => entry.requirementId)), "FINAL-EXACT-PRIOR-CUT");

  check(graph.nodes.length === 109 && graph.edges.length === 619, "GRAPH-DENOMINATORS");
  const nodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  const edgeIds = new Set(graph.edges.map((edge) => edge.edgeId));
  check(nodeIds.size === 109 && edgeIds.size === 619, "GRAPH-IDENTITIES-UNIQUE");
  check(graph.edges.every((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)), "GRAPH-ENDPOINTS-CLOSED");
  const indegree = new Map([...nodeIds].map((id) => [id, 0]));
  const outgoing = new Map([...nodeIds].map((id) => [id, []]));
  for (const edge of graph.edges) {
    indegree.set(edge.to, indegree.get(edge.to) + 1);
    outgoing.get(edge.from).push(edge.to);
  }
  const queue = [...nodeIds].filter((id) => indegree.get(id) === 0);
  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    visited += 1;
    for (const next of outgoing.get(current)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  check(visited === nodeIds.size, "GRAPH-DAG-KAHN");
  check(requirements.every((requirement) =>
    graph.edges.some((edge) =>
      edge.from === requirement.soleProducerId
      && edge.to === requirement.outputObjectId
      && edge.edgeType === "PRODUCES"
    )
  ), "GRAPH-SOLE-PRODUCER-EDGES");
  check(requirements.every((requirement) =>
    requirement.dependencies.every((dependency) =>
      graph.edges.some((edge) =>
        edge.from === `PRCV4-OBJECT-${dependency.slice(-3)}`
        && edge.to === requirement.soleProducerId
        && edge.edgeType === "OBJECT-CONSUMED-BY"
      )
    )
  ), "GRAPH-DEPENDENCY-EDGES");

  check(closures.records.length === 93 && closures.aliasRecords.length === 32, "CLOSURE-DENOMINATORS");
  check(new Set(closures.records.map((entry) => entry.findingId)).size === 93, "CLOSURE-FINDINGS-UNIQUE");
  check(new Set(closures.records.map((entry) => entry.noMergeKey)).size === 93, "CLOSURE-NOMERGE-UNIQUE");
  check(new Set(closures.records.map((entry) => entry.vectorId)).size === 93, "CLOSURE-VECTORS-UNIQUE");
  const severityCounts = Object.fromEntries(["P0", "P1", "P2", "P3"].map((severity) => [
    severity,
    closures.records.filter((entry) => entry.severity === severity).length
  ]));
  check(sameArray([severityCounts.P0, severityCounts.P1, severityCounts.P2, severityCounts.P3], [54, 38, 1, 0]), "CLOSURE-SEVERITY-EXACT");
  const sourceCounts = new Map();
  closures.records.forEach((entry) => sourceCounts.set(entry.sourceFindingRoot, (sourceCounts.get(entry.sourceFindingRoot) || 0) + 1));
  check(sourceCounts.get("a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4") === 32, "CLOSURE-PREDECESSOR-ROOT-COUNT");
  check(sourceCounts.get("f049b4b681d1c03bed1b4856a61a064383faa3b3bab58a2baca85bf546f81c16") === 27, "CLOSURE-V2-ROOT-COUNT");
  check(sourceCounts.get("52d5b987ae710d6946c7f1f495493b6af2a852405fd0ecc295b0037899c79e4b") === 34, "CLOSURE-V3-ROOT-COUNT");
  check(closures.records.every((entry) =>
    entry.requirementIds.length > 0
    && entry.requirementIds.every((id) => reqById.has(id) && Number(id.slice(-3)) < 38)
    && sameArray(entry.requirementRootStates.map((state) => state.requirementId), entry.requirementIds)
    && entry.requirementRootStates.every((state) => state.acceptedRoot === null && state.state === "ABSENT")
    && entry.vectorExecutionReceiptRoot === null
    && entry.operationalEvidenceRoots.length === 0
    && entry.independentDispositionRoot === null
    && entry.accepted === false
    && entry.acceptanceCredit === 0
  ), "CLOSURE-ROOT-LIFECYCLE-NONACCEPTED");
  check(closures.aliasRecords.every((alias) =>
    alias.predecessorRoot === "a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4"
    && alias.wrapperRoot === "f049b4b681d1c03bed1b4856a61a064383faa3b3bab58a2baca85bf546f81c16"
    && alias.fieldEquivalenceRoot === null
    && alias.equivalenceState === "UNPROVED"
    && alias.acceptanceCredit === 0
  ), "ALIAS-32-UNPROVED-ZERO-CREDIT");
  const closureEdgeKeys = new Set(graph.edges
    .filter((edge) => edge.edgeType === "FINDING-CLOSURE-REQUIRES-ACCEPTED-ROOT")
    .map((edge) => `${edge.findingId}|${edge.from}|${edge.to}`));
  const expectedClosureEdgeKeys = new Set(closures.records.flatMap((entry) =>
    entry.requirementIds.map((requirementId) =>
      `${entry.findingId}|PRCV4-OBJECT-${requirementId.slice(-3)}|PRCV4-PRODUCER-038`
    )
  ));
  check(closureEdgeKeys.size === 204 && expectedClosureEdgeKeys.size === 204
    && sameArray([...closureEdgeKeys].sort(), [...expectedClosureEdgeKeys].sort()), "GRAPH-CLOSURE-ROOT-EDGES-EXACT");

  check(vectors.vectors.length === 93, "VECTOR-DENOMINATOR");
  check(new Set(vectors.vectors.map((entry) => entry.vectorId)).size === 93, "VECTOR-IDS-UNIQUE");
  check(new Set(vectors.vectors.map((entry) => entry.findingId)).size === 93, "VECTOR-FINDINGS-UNIQUE");
  const operations = new Map(vectors.operationDefinitions.map((entry) => [entry.operationId, entry]));
  const oracles = new Set(vectors.oracleDefinitions.map((entry) => entry.oracleId));
  check(operations.size === 7 && oracles.size === 2, "VECTOR-OPERATION-ORACLE-DENOMINATORS");
  check(new Set(vectors.vectors.map((entry) => entry.operation.kind)).size === 7, "VECTOR-ALL-OPERATIONS-NONVACUOUS");
  const closureByVector = new Map(closures.records.map((entry) => [entry.vectorId, entry]));
  check(vectors.vectors.every((vector) => {
    const requirement = reqById.get(vector.targetRequirementId);
    const closure = closureByVector.get(vector.vectorId);
    const definition = operations.get(vector.operation.operationId);
    return requirement
      && closure
      && closure.findingId === vector.findingId
      && closure.noMergeKey === vector.noMergeKey
      && closure.requirementIds.includes(vector.targetRequirementId)
      && vector.targetObjectId === requirement.outputObjectId
      && vector.targetOutputType === requirement.outputType
      && vector.targetSchemaRequirementId === requirement.requirementId
      && Object.prototype.hasOwnProperty.call(requirement.outputSchema.required, vector.operation.fieldPath)
      && requirement.outputSchema.required[vector.operation.fieldPath] === vector.operation.fieldType
      && definition
      && definition.kind === vector.operation.kind
      && definition.terminalSource === "TARGET-EVALUATOR"
      && oracles.has(vector.oracle.oracleId)
      && vector.oracle.targetEvaluatorRequirementId === requirement.requirementId
      && vector.oracle.terminalSource === "TARGET-REQUIREMENT-FAILURE-NOT-VECTOR"
      && vector.expectedTerminal === requirement.failure
      && vector.evaluatorImplementationRoot === null
      && vector.executionReceiptRoot === null
      && vector.executionState === "SPECIFIED-UNIMPLEMENTED"
      && vector.acceptanceCredit === 0;
  }), "VECTOR-CAUSAL-SCHEMA-TERMINAL-LINKAGE");
  check(!collectKeys(vectors).some((key) => key.startsWith("control_")), "VECTOR-NO-CONTROL-CHANNEL");

  check(manifest.members.length === 7, "MANIFEST-MEMBER-DENOMINATOR");
  check(sameArray(manifest.members.map((entry) => [entry.role, entry.path]), MEMBER_PATHS), "MANIFEST-MEMBER-ORDER-AND-PATHS");
  const actualMembers = MEMBER_PATHS.map(([, memberPath]) => fileRecord(repoRoot, memberPath));
  check(manifest.members.every((entry, index) =>
    entry.sha256 === actualMembers[index].sha256
    && entry.lines === actualMembers[index].lines
    && entry.bytes === actualMembers[index].bytes
  ), "MANIFEST-MEMBER-BYTES");
  const calculatedCoreRoot = domainRoot("CORE-PACKAGE-ROOT", actualMembers.slice(0, 5));
  const calculatedPackageRoot = domainRoot("PACKAGE-ROOT", actualMembers);
  check(manifest.coreRoot === calculatedCoreRoot, "MANIFEST-CORE-ROOT");
  check(manifest.packageRoot === calculatedPackageRoot, "MANIFEST-PACKAGE-ROOT");
  check(manifest.rootAlgorithms?.core?.domain === "CORE-PACKAGE-ROOT"
    && manifest.rootAlgorithms?.package?.domain === "PACKAGE-ROOT", "MANIFEST-DOMAIN-SEPARATION");
  check(manifest.reportsExcludedFromRoots === true && manifest.manifestExcludedFromPackageRoot === true, "MANIFEST-NO-SELF-HASH-CYCLE");
  check(sameArray(
    [
      manifest.denominators.members,
      manifest.denominators.semanticCoreMembers,
      manifest.denominators.physicalInputs,
      manifest.denominators.typedAbsentInputs,
      manifest.denominators.requirements,
      manifest.denominators.producers,
      manifest.denominators.outputStates,
      manifest.denominators.graphNodes,
      manifest.denominators.graphEdges,
      manifest.denominators.closureEdges,
      manifest.denominators.findings,
      manifest.denominators.inheritedFindings,
      manifest.denominators.newFindings,
      manifest.denominators.aliases,
      manifest.denominators.vectors
    ],
    [7, 5, 15, 10, 42, 42, 42, 109, 619, 204, 93, 59, 34, 32, 93]
  ), "MANIFEST-DENOMINATORS-EXACT");

  const disposition = registry.currentDisposition;
  check(registry.currentObservedState.secretCandidateCoordinates === 6
    && registry.currentObservedState.clearedSecretCandidates === 0
    && reqById.get("PRCV4-REQ-019").dependencies.includes("PRCV4-REQ-018")
    && reqById.get("PRCV4-REQ-019").outputSchema.invariants.includes("exactly two independent scanner roots minimum"),
  "SECRET-CANDIDATE-TWO-SCANNER-BLOCKING-STATE");
  check(disposition.repositoryVisibility === "PUBLIC"
    && disposition.acceptance === 0
    && disposition.gate29 === "BLOCKED"
    && disposition.developmentFreeze === "ACTIVE"
    && disposition.controlPlanePermit === "ABSENT"
    && disposition.publicPushPermit === "ABSENT"
    && disposition.deploymentPermit === "ABSENT"
    && disposition.releasePermit === "ABSENT", "CURRENT-DISPOSITION-FAIL-CLOSED-PUBLIC");
  check(closures.currentDisposition.acceptance === 0
    && closures.currentDisposition.gate29 === "BLOCKED"
    && closures.currentDisposition.repositoryVisibility === "PUBLIC", "CLOSURE-DISPOSITION-FAIL-CLOSED");
  check(manifest.currentDisposition.acceptance === 0
    && manifest.currentDisposition.gate29 === "BLOCKED"
    && manifest.currentDisposition.repositoryVisibility === "PUBLIC", "MANIFEST-DISPOSITION-FAIL-CLOSED");
  check(subject.includes("repository visibility=PUBLIC")
    && subject.includes("Gate29=BLOCKED")
    && subject.includes("development freeze=ACTIVE"), "SUBJECT-PUBLIC-BLOCKED-INVARIANT");
  const packageSource = MEMBER_PATHS.map(([, memberPath]) =>
    fs.readFileSync(resolvePlanningFile(repoRoot, memberPath), "utf8")
  ).join("\n");
  const bannedFragments = [["Math", "random"].join("."), ["random", "UUID"].join("")];
  check(!bannedFragments.some((fragment) => packageSource.includes(fragment)), "PACKAGE-NO-RANDOMNESS-API");

  report.counts = {
    physicalInputs: 15,
    typedAbsentInputs: 10,
    requirements: 42,
    producers: 42,
    outputStates: 42,
    graphNodes: 109,
    graphEdges: 619,
    closureEdges: 204,
    findings: 93,
    inheritedFindings: 59,
    newFindings: 34,
    aliases: 32,
    vectors: 93,
    acceptedRequirements: 0,
    acceptedClosures: 0,
    operationalEvidenceRoots: 0
  };
} catch (error) {
  errors.push(`READER-EXCEPTION: ${error instanceof Error ? error.message : String(error)}`);
}

report.checks = {
  passed: checks.filter((entry) => entry.passed).length,
  failed: checks.filter((entry) => !entry.passed).length,
  failedCodes: checks.filter((entry) => !entry.passed).map((entry) => entry.code)
};
report.errors = errors;
report.mechanicalVerdict = errors.length === 0 ? "PASS" : "FAIL";
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
if (errors.length > 0) process.exitCode = 1;
