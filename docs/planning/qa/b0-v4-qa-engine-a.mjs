#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = 'web/docs/planning';
const NAMES = {
  manifest: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-atomic-package-manifest-2026-08-29.json`,
  subject: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-2026-08-29.md`,
  registry: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-normative-registry-2026-08-29.json`,
  sourceIndex: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-source-member-span-index-2026-08-29.json`,
  crosswalk: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-closure-crosswalk-2026-08-29.json`,
  vectors: `${BASE}/bootstrap-authority-envelope-b0-successor-requirements-v4-executable-vector-programs-2026-08-29.json`,
};

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileBytes = (path) => readFileSync(resolve(path));
const json = (path) => JSON.parse(fileBytes(path).toString('utf8'));
const failures = [];
const check = (condition, code, detail) => {
  if (!condition) failures.push({ code, detail });
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const slug = (value) => value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'UNSPECIFIED-ATTACK';

function deriveTerminal(scenario, inheritedTerminal) {
  const lower = scenario.toLowerCase();
  if (lower.includes('response loss') || lower.includes('stale journal') || lower.includes('mixed store revision') || lower.includes('outage')) return 'UNCERTAIN';
  if (lower.includes('revoke') || lower.includes('revocation')) return 'REVOKED';
  if (lower.includes('collision')) return 'COLLISION';
  if (lower.includes('conflict') || lower.includes('aba') || lower.includes('concurrent pointer')) return 'CONFLICT';
  if (lower.includes('at-expiry')) return 'EXPIRED';
  if (lower.includes('partial effect') || lower.includes('mid-write') || lower.includes('cleanup failure')) return 'QUARANTINED';
  if (inheritedTerminal === 'REVOKED') return 'REVOKED';
  if (inheritedTerminal === 'REJECTED') return 'REJECTED';
  return 'BLOCKED';
}

function pointerParent(document, pointer) {
  const parts = pointer.split('/').slice(1).map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
  let parent = document;
  for (const part of parts.slice(0, -1)) parent = parent[part];
  return { parent, key: parts.at(-1) };
}

function executeProgram(fixture, program) {
  const state = clone(fixture.payload);
  const events = [];
  for (const operation of program) {
    if (operation.op === 'REMOVE') {
      const { parent, key } = pointerParent(state, operation.path);
      delete parent[key];
    } else if (operation.op === 'REPLACE' || operation.op === 'SET') {
      const { parent, key } = pointerParent(state, operation.path);
      parent[key] = clone(operation.value);
    } else if (operation.op === 'EVENT') {
      events.push(clone(operation.event));
    } else {
      throw new Error(`Unsupported operation ${operation.op}`);
    }
  }
  return { state, events };
}

function evaluate(vector, execution) {
  if (execution.state.attack !== null || execution.events.length > 0) {
    const scenario = execution.state.attack.sourceScenario;
    return { terminalState: deriveTerminal(scenario, vector.inheritedExpectedTerminalText), reasonCode: `NEG-${slug(scenario)}`, usableAuthority: 0, postcondition: 'NO-CURRENT-POINTER;NO-EXTERNAL-EFFECT;NO-CLOSURE-CREDIT' };
  }
  if (!Object.hasOwn(execution.state.fields, 'requiredProof')) {
    return { terminalState: 'BLOCKED', reasonCode: 'MISSING-MANDATORY-FIELD', usableAuthority: 0, postcondition: 'NO-CURRENT-POINTER;NO-EFFECT' };
  }
  if (execution.state.source.memberSha256 !== vector.fixtureMemberSha256) {
    return { terminalState: 'BLOCKED', reasonCode: 'SOURCE-ROOT-MISMATCH', usableAuthority: 0, postcondition: 'NO-CURRENT-POINTER;NO-EFFECT' };
  }
  return { terminalState: 'REJECTED', reasonCode: 'NO-NEGATIVE-MUTATION', usableAuthority: 0, postcondition: 'NO-CURRENT-POINTER;NO-EFFECT' };
}

function parseSubject(text) {
  const heading = /^## \d+\.\d+ `(?<id>B0V4REQ-\d{3})` — (?<title>.+)$/gm;
  const matches = [...text.matchAll(heading)];
  return matches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const block = text.slice(start, end);
    const fields = {};
    for (const name of ['statement', 'threatCauseImpact', 'requiredProof', 'dependencies', 'sourceBasis']) {
      const found = block.match(new RegExp('`' + name + '`: ([^\\n]+)'));
      if (found) fields[name] = found[1];
    }
    const dependencyIds = fields.dependencies ? [...fields.dependencies.matchAll(/B0V4REQ-\d{3}/g)].map((item) => item[0]) : [];
    return { id: match.groups.id, title: match.groups.title, fields, dependencyIds };
  });
}

const manifest = json(NAMES.manifest);
for (const member of manifest.members) {
  const bytes = fileBytes(member.logicalPath);
  check(bytes.length === member.bytes, 'MANIFEST-BYTE-MISMATCH', member.logicalPath);
  check(sha(bytes) === member.sha256, 'MANIFEST-SHA-MISMATCH', member.logicalPath);
}

const subjectText = fileBytes(NAMES.subject).toString('utf8');
const requirements = parseSubject(subjectText);
check(requirements.length === 84, 'REQUIREMENT-DENOMINATOR', `${requirements.length}/84`);
check(requirements.every((row) => Object.keys(row.fields).length === 5), 'FIVE-FIELD-SCHEMA', 'Every Requirement must expose exactly five named fields');
check(new Set(requirements.map((row) => row.id)).size === 84, 'REQUIREMENT-ID-UNIQUE', 'Duplicate Requirement ID');
requirements.forEach((row, index) => {
  check(row.id === `B0V4REQ-${String(index).padStart(3, '0')}`, 'REQUIREMENT-ID-CONTIGUOUS', row.id);
  check(row.fields.statement.includes(`B0V4OUT-${String(index).padStart(3, '0')}`), 'OUTPUT-BINDING', row.id);
  for (const dependency of row.dependencyIds) {
    const dependencyNumber = Number(dependency.slice(-3));
    check(dependencyNumber < index, 'FORWARD-BUILD-DEPENDENCY', `${row.id}->${dependency}`);
  }
});

const registry = json(NAMES.registry);
check(registry.typedSupersessions.length === 10, 'SUPERSESSION-DENOMINATOR', `${registry.typedSupersessions.length}/10`);
check(registry.cycleBreaks.length === 17, 'CYCLE-BREAK-DENOMINATOR', `${registry.cycleBreaks.length}/17`);
check(registry.roleUniverse.roles.length === 8, 'ROLE-DENOMINATOR', `${registry.roleUniverse.roles.length}/8`);
check(registry.roleUniverse.pairMatrix.length === 28, 'ROLE-PAIR-DENOMINATOR', `${registry.roleUniverse.pairMatrix.length}/28`);
check(registry.roleUniverse.pairMatrix.every((row) => row.disposition === 'PROHIBITED-SHARED-EFFECTIVE-CONTROLLER'), 'ROLE-PAIR-DISPOSITION', 'Every pair must be prohibited');
const headIds = new Set(registry.mutableHeadRegistry.heads.map((row) => row.headId));
const objectClasses = new Set();
for (const row of registry.mutableHeadRegistry.objectToHead) {
  check(!objectClasses.has(row.objectClass), 'DUPLICATE-MUTABLE-OBJECT-CLASS', row.objectClass);
  objectClasses.add(row.objectClass);
  check(headIds.has(row.headId), 'UNKNOWN-HEAD', `${row.objectClass}->${row.headId}`);
  check(row.membershipPath.length >= 1, 'EMPTY-HEAD-MEMBERSHIP-PATH', row.objectClass);
}
check(registry.mutableHeadRegistry.generatedHeadCount === headIds.size, 'GENERATED-HEAD-COUNT', `${headIds.size}`);
check(registry.acceptanceFieldRegistry.fields.length === registry.acceptanceFieldRegistry.fieldCount, 'ACCEPTANCE-FIELD-DENOMINATOR', `${registry.acceptanceFieldRegistry.fields.length}`);
check(new Set(registry.acceptanceFieldRegistry.fields.map((row) => row.fieldId)).size === registry.acceptanceFieldRegistry.fieldCount, 'ACCEPTANCE-FIELD-UNIQUE', 'Duplicate field');
check(registry.outputRegistry.length === 84, 'OUTPUT-DENOMINATOR', `${registry.outputRegistry.length}/84`);
check(registry.outputRegistry.every((row) => row.repositoryVisibility === 'PUBLIC'), 'PUBLIC-OUTPUT-INVARIANT', 'A row selected non-Public repository visibility');
check(registry.applicableDirectiveRegistry.every((row) => row.authorityCredit === 0), 'DIRECTIVE-AUTHORITY-CREDIT', 'Directive row granted B0 authority');
check(registry.convergencePolicy.maximumSuccessorRoundsPerReviewEpoch === 3, 'BOUNDED-CONVERGENCE', 'Expected exactly three bounded rounds');
check(registry.convergencePolicy.successPredicate.minimumIndependentHostileReviews === 2, 'TWO-REVIEW-DENOMINATOR', 'Two reviews required');
check(registry.genesisFoundation.currentFoundationReceipt === null, 'NO-BOOTSTRAP-SELF-APPROVAL', 'Foundation receipt must remain absent');

const crosswalk = json(NAMES.crosswalk);
const expectedMaps = { v3Findings: 13, v3Requirements: 70, v2Requirements: 49, originalRequirements: 27, legacyFindings: 22, v2ReviewFindings: 21 };
for (const [name, count] of Object.entries(expectedMaps)) {
  check(crosswalk.crosswalks[name].length === count, `CROSSWALK-${name}`, `${crosswalk.crosswalks[name].length}/${count}`);
  check(new Set(crosswalk.crosswalks[name].map((row) => row.sourceId)).size === count, `CROSSWALK-${name}-UNIQUE`, 'Duplicate source identity');
  check(crosswalk.crosswalks[name].every((row) => row.acceptanceTransferred === false && row.closureTransferred === false), `CROSSWALK-${name}-NO-TRANSFER`, 'Closure or Acceptance transfer detected');
}
for (const name of ['v3Requirements', 'v2Requirements', 'originalRequirements']) {
  check(crosswalk.crosswalks[name].every((row) => row.exactFiveFieldPreservation.length === 5 && row.exactFiveFieldPreservation.every((field) => field.targetContainsExactSourceValue === true)), `CROSSWALK-${name}-EXACT-FIELDS`, 'A predecessor field value is not an exact target conjunct');
}
check(crosswalk.namedUseGraph.hiddenV3CycleBreaks.length === 17, 'NAMED-USE-CYCLE-BREAKS', `${crosswalk.namedUseGraph.hiddenV3CycleBreaks.length}/17`);
check(crosswalk.namedUseGraph.unclassifiedTokenUses.length === 0, 'NAMED-USE-UNCLASSIFIED', `${crosswalk.namedUseGraph.unclassifiedTokenUses.length}`);

const sourceIndex = json(NAMES.sourceIndex);
check(sourceIndex.artifacts.length === 16, 'SOURCE-ARTIFACT-DENOMINATOR', `${sourceIndex.artifacts.length}/16`);
for (const artifact of sourceIndex.artifacts) {
  check(!artifact.logicalPath.startsWith('/'), 'ABSOLUTE-PUBLIC-PATH', artifact.logicalPath);
  const bytes = fileBytes(artifact.logicalPath);
  check(sha(bytes) === artifact.sha256, 'INDEX-SOURCE-SHA', artifact.logicalPath);
  check(bytes.length === artifact.bytes, 'INDEX-SOURCE-BYTES', artifact.logicalPath);
  for (const member of artifact.members) {
    check(member.startByteInclusive >= 0 && member.endByteExclusive <= bytes.length && member.startByteInclusive < member.endByteExclusive, 'INVALID-MEMBER-SPAN', `${artifact.alias}:${member.locator}`);
    check(sha(bytes.subarray(member.startByteInclusive, member.endByteExclusive)) === member.sha256, 'MEMBER-SPAN-SHA', `${artifact.alias}:${member.locator}`);
  }
}

const vectorPack = json(NAMES.vectors);
check(vectorPack.fixtures.length === 252, 'FIXTURE-DENOMINATOR', `${vectorPack.fixtures.length}/252`);
check(vectorPack.vectors.length === 252, 'VECTOR-DENOMINATOR', `${vectorPack.vectors.length}/252`);
check(new Set(vectorPack.vectors.map((row) => row.vectorId)).size === 252, 'VECTOR-ID-UNIQUE', 'Duplicate vector ID');
const fixtureMap = new Map(vectorPack.fixtures.map((row) => [row.fixtureId, row]));
const receipts = [];
for (const vector of vectorPack.vectors) {
  const fixture = fixtureMap.get(vector.fixtureId);
  check(Boolean(fixture), 'MISSING-FIXTURE', vector.vectorId);
  if (!fixture) continue;
  check(fixture.fixtureRoot === vector.fixtureRoot, 'FIXTURE-ROOT-BINDING', vector.vectorId);
  check(vector.program.length > 0, 'EMPTY-PROGRAM', vector.vectorId);
  check(vector.program.some((operation) => operation.op === 'SET' && operation.path === '/attack'), 'MISSING-ATTACK-OPERATION', vector.vectorId);
  if (vector.slot === 'A') check(vector.program.some((operation) => operation.op === 'REMOVE'), 'SLOT-A-MISSING-REMOVE', vector.vectorId);
  if (vector.slot === 'B') check(vector.program.some((operation) => operation.op === 'REPLACE'), 'SLOT-B-MISSING-REPLACE', vector.vectorId);
  const execution = executeProgram(fixture, vector.program);
  const observed = evaluate(vector, execution);
  check(JSON.stringify(observed) === JSON.stringify(vector.expected), 'EXPECTED-TERMINAL-MISMATCH', vector.vectorId);
  const receiptBody = { vectorId: vector.vectorId, fixtureRoot: vector.fixtureRoot, programRoot: vector.programRoot, observed, engineId: 'B0V4-QA-ENGINE-A-NODE-V1' };
  receipts.push({ ...receiptBody, receiptSha256: sha(Buffer.from(JSON.stringify(receiptBody))) });
}

const report = {
  artifactId: 'CONNECT-B0-V4-QA-ENGINE-A-REPORT-2026-08-29',
  artifactClass: 'DETACHED-PRODUCER-MECHANICAL-SEMANTIC-QA-ENGINE-REPORT;NOT-AUTHORITY;NOT-ACCEPTANCE',
  engineId: 'B0V4-QA-ENGINE-A-NODE-V1',
  engineSha256: sha(fileBytes(`${BASE}/qa/b0-v4-qa-engine-a.mjs`)),
  inspectedPackageManifestSha256: sha(fileBytes(NAMES.manifest)),
  status: failures.length === 0 ? 'PASS-CANDIDATE-MECHANICAL-ONLY' : 'FAIL',
  denominators: {
    requirements: `${requirements.length}/84`,
    fields: `${requirements.reduce((count, row) => count + Object.keys(row.fields).length, 0)}/420`,
    outputs: `${registry.outputRegistry.length}/84`,
    vectorSpecifications: `${vectorPack.vectors.length}/252`,
    vectorFixtures: `${vectorPack.fixtures.length}/252`,
    planningDslExecutionReceipts: `${receipts.length}/252`,
    operationalExecutionReceipts: '0/252',
    v3FindingsCandidateDeltas: `${crosswalk.crosswalks.v3Findings.length}/13`,
    v3FindingsIndependentlyClosed: '0/13',
    v3RequirementsPreserved: `${crosswalk.crosswalks.v3Requirements.length}/70`,
    v2RequirementsPreserved: `${crosswalk.crosswalks.v2Requirements.length}/49`,
    originalRequirementsPreserved: `${crosswalk.crosswalks.originalRequirements.length}/27`,
    legacyFindingsPreserved: `${crosswalk.crosswalks.legacyFindings.length}/22`,
    v2ReviewFindingsPreserved: `${crosswalk.crosswalks.v2ReviewFindings.length}/21`,
    acceptedRequirements: '0/84',
    implementedOutputs: '0/84',
  },
  failures,
  planningDslReceipts: receipts,
  authorityCredit: 0,
  b0State: 'ABSENT',
  repositoryVisibility: 'PUBLIC',
  gate29: 'BLOCKED',
  developmentFreeze: 'ACTIVE',
};

const outputPath = process.argv[2];
if (!outputPath) throw new Error('Expected output report path');
writeFileSync(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
if (failures.length > 0) process.exitCode = 1;
