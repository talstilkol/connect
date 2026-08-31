import { Buffer } from 'node:buffer';

import {
  attachContentIdentity,
  canonicalV6,
  parseCanonicalJsonBytes,
  rootV6,
  sha256Bytes,
  validateContentIdentity,
} from './trd2-v6-core.mjs';
import {
  validateClosedSchemaRegistryV3,
  validateV3Record,
} from './trd2-v6-pass2-v3-core.mjs';

export const TRD2_V6_PASS3_V2_DIRECTORY = 'docs/planning/trd2-v6-candidate-v3-2026-08-31';
export const TRD2_V6_PASS3_V2_CHARTER_PATH = 'docs/planning/section-35-6-trd-2-v6-pass3-v2-build-charter-2026-08-31.md';
export const TRD2_V6_PASS3_V2_TOOLCHAIN_REGISTRY_PATH = 'docs/planning/trd2-v6-pass3-v2-toolchain-path-registry-v1-2026-08-31.json';
export const TRD2_V6_PASS3_V2_OUTPUTS = Object.freeze([
  `${TRD2_V6_PASS3_V2_DIRECTORY}/subject.json`,
  `${TRD2_V6_PASS3_V2_DIRECTORY}/clause-ast-registry.json`,
  `${TRD2_V6_PASS3_V2_DIRECTORY}/state-machine-registry.json`,
]);
export const TRD2_V6_PASS3_V2_INPUT_PATHS = Object.freeze([
  `${TRD2_V6_PASS3_V2_DIRECTORY}/closed-schema-registry-v3.json`,
  'docs/planning/trd2-v6-candidate-2026-08-30/source-capture-manifest.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-grammar-and-corpus.json',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-2026-08-29.md',
  'docs/planning/section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md',
]);
export const TRD2_V6_PASS3_V2_TOOLCHAIN_PATHS = Object.freeze([
  TRD2_V6_PASS3_V2_CHARTER_PATH,
  'docs/planning/trd2-v6-output-path-registry-v3-2026-08-31.json',
  TRD2_V6_PASS3_V2_TOOLCHAIN_REGISTRY_PATH,
  `${TRD2_V6_PASS3_V2_DIRECTORY}/closed-schema-registry-v3.json`,
  `${TRD2_V6_PASS3_V2_DIRECTORY}/canonical-engine-a-report-v3.json`,
  `${TRD2_V6_PASS3_V2_DIRECTORY}/canonical-engine-b-report-v3.json`,
  'docs/planning/trd2-v6-candidate-2026-08-30/source-capture-manifest.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-grammar-and-corpus.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/generation-receipt.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-engine-a-report.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-engine-b-report.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/pass-1-producer-qa.json',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-2026-08-29.md',
  'docs/planning/section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md',
  'package.json',
  'scripts/trd2-v6-core.mjs',
  'scripts/trd2-v6-pass2-v2-core.mjs',
  'scripts/trd2-v6-pass2-v3-core.mjs',
  'scripts/trd2-v6-pass3-v2-core.mjs',
  'scripts/create-trd2-v6-pass3-v2-candidate.mjs',
  'scripts/verify-trd2-v6-pass3-v2-engine-a.mjs',
  'scripts/verify-trd2-v6-pass3-v2-engine-b.py',
  'scripts/verify-trd2-v6-pass3-v2-candidate.mjs',
  'tests/trd2-v6-pass3-v2-core.test.mjs',
]);

const REQUIREMENT_SCHEMA_ID = 'CONNECT-TRD2-V6-REQUIREMENT-V2-SCHEMA-V2';
const BINDING_SCHEMA_ID = 'CONNECT-TRD2-V6-REQUIREMENT-SOURCE-BINDING-V2-SCHEMA-V2';
const SUBJECT_SCHEMA_ID = 'CONNECT-TRD2-V6-SUBJECT-V3-SCHEMA';
const CLAUSE_REGISTRY_SCHEMA_ID = 'CONNECT-TRD2-V6-CLAUSE-AST-REGISTRY-V3-SCHEMA';
const STATE_REGISTRY_SCHEMA_ID = 'CONNECT-TRD2-V6-STATE-MACHINE-REGISTRY-V3-SCHEMA';

const utf8Compare = (left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
const sortedStrings = (values) => [...values].sort(utf8Compare);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, expected, label) {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  assert(canonicalV6(Object.keys(value).sort(utf8Compare)) === canonicalV6([...expected].sort(utf8Compare)), `${label}: exact keys mismatch`);
}

function schemaMap(registry) {
  return new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
}

function schemaFor(registry, schemaId) {
  const schema = schemaMap(registry).get(schemaId);
  assert(schema !== undefined, `missing schema ${schemaId}`);
  return schema;
}

function attachForSchema(registry, schemaId, body) {
  const schema = schemaFor(registry, schemaId);
  const identity = schema.contentIdentity;
  assert(identity?.mode === 'EXCLUDE-IDENTITY-KEYS', `${schemaId}: unsupported identity mode`);
  const record = attachContentIdentity(identity.prefix, identity.typeTag, identity.schemaVersion, body, identity.idKey, identity.rootKey);
  validateV3Record(record, schema, schemaMap(registry));
  return record;
}

function collectionRoot(typeTag, schemaVersion, records, rootKey = 'recordRoot') {
  return rootV6(typeTag, schemaVersion, records.map((record) => record[rootKey]));
}

function decodeFixture(fixture) {
  return parseCanonicalJsonBytes(Buffer.from(fixture.bytesBase64Chunks.join(''), 'base64'));
}

function actualRecords(registry, schemaId) {
  return registry.fixtures
    .filter((fixture) => fixture.schemaId === schemaId && fixture.fixtureClass === 'ACTUAL-POSITIVE')
    .map(decodeFixture);
}

function requirementsAndBindings(registry) {
  const requirements = actualRecords(registry, REQUIREMENT_SCHEMA_ID).sort((left, right) => utf8Compare(left.requirementId, right.requirementId));
  const requirementBindings = actualRecords(registry, BINDING_SCHEMA_ID).sort((left, right) => utf8Compare(left.requirementId, right.requirementId));
  assert(requirements.length === 128 && requirementBindings.length === 128, 'Pass 3 requires exactly 128 Requirements and 128 bindings');
  const requirementIds = requirements.map(({ requirementId }) => requirementId);
  assert(new Set(requirementIds).size === 128, 'duplicate Requirement id');
  assert(canonicalV6(requirementIds) === canonicalV6(requirementBindings.map(({ requirementId }) => requirementId)), 'Requirement/binding id mismatch');
  requirements.forEach((requirement, index) => {
    validateV3Record(requirement, schemaFor(registry, REQUIREMENT_SCHEMA_ID), schemaMap(registry));
    validateV3Record(requirementBindings[index], schemaFor(registry, BINDING_SCHEMA_ID), schemaMap(registry));
    assert(requirement.requirementRoot === requirementBindings[index].requirementRoot, `${requirement.requirementId}: binding root mismatch`);
  });
  return { requirementBindings, requirements };
}

function provenanceRole(logicalPath) {
  if (logicalPath.endsWith('closed-schema-registry-v3.json')) return 'PASS2-CLOSED-SCHEMA-REGISTRY';
  if (logicalPath.endsWith('source-capture-manifest.json')) return 'PASS1-SOURCE-CAPTURE';
  if (logicalPath.endsWith('parser-grammar-and-corpus.json')) return 'PASS1-PARSER-CORPUS';
  if (logicalPath.endsWith('immutable-successor-requirements-2026-08-29.md')) return 'EXACT-REQUIREMENT-SOURCE';
  if (logicalPath.endsWith('executable-definition-contract-2026-08-29.json')) return 'PREDECESSOR-SEMANTIC-SOURCE';
  return 'PREDECESSOR-HOSTILE-REVIEW-FINDINGS';
}

function buildSubject({ inputRows, parserCorpus, registry, sourceCapture }) {
  const { requirementBindings, requirements } = requirementsAndBindings(registry);
  const currentState = attachForSchema(registry, 'CONNECT-TRD2-V6-CURRENT-STATE-V3-SCHEMA', {
    acceptedRequirements: 0,
    definitionAcceptance: 'ABSENT',
    developmentFreeze: 'ACTIVE',
    findingClosure: '0/15',
    gate29: 'BLOCKED',
    reconciliation: 'ABSENT',
    reviewGenerations: '0/2',
    recordKind: 'CURRENT-STATE-V3',
    schemaVersion: 'CONNECT-TRD2-V6-CURRENT-STATE-V3',
  });
  const provenance = inputRows.map((row) => attachForSchema(registry, 'CONNECT-TRD2-V6-SOURCE-PROVENANCE-V3-SCHEMA', {
    byteLength: row.byteLength,
    logicalPath: row.logicalPath,
    observedCommit: row.observedCommit,
    recordKind: 'SOURCE-PROVENANCE-V3',
    schemaVersion: 'CONNECT-TRD2-V6-SOURCE-PROVENANCE-V3',
    sha256: row.sha256,
    sourceRole: provenanceRole(row.logicalPath),
  }));
  const requirementCollectionRoot = collectionRoot('TRD2V6-REQUIREMENT-COLLECTION-V3', 'CONNECT-TRD2-V6-REQUIREMENT-COLLECTION-V3', requirements, 'requirementRoot');
  const body = {
    claimLimit: 'LOCAL-CANDIDATE-NOT-ACCEPTED',
    currentState,
    pass1ParserCorpusRoot: parserCorpus.artifactRoot,
    pass1SourceCaptureRoot: sourceCapture.artifactRoot,
    pass2SchemaRegistryRoot: registry.artifactRoot,
    provenance,
    recordKind: 'SUBJECT-V3',
    repositoryVisibility: 'PUBLIC',
    requirementBindingCount: requirementBindings.length,
    requirementBindings,
    requirementCollectionRoot,
    requirementCount: requirements.length,
    requirements,
    schemaVersion: 'CONNECT-TRD2-V6-SUBJECT-V3',
  };
  return attachForSchema(registry, SUBJECT_SCHEMA_ID, body);
}

function parseDependencies(value, requirementId) {
  assert(/^\[(?:TRD2V5-REQ-\d{3}(?:,TRD2V5-REQ-\d{3})*)?\]$/.test(value), `${requirementId}: malformed dependencies`);
  if (value === '[]') return [];
  const dependencies = value.slice(1, -1).split(',');
  assert(new Set(dependencies).size === dependencies.length, `${requirementId}: duplicate dependency`);
  return sortedStrings(dependencies);
}

function resultBinding(statement, requirementId) {
  const match = statement.match(/^require exactly one ([A-Za-z0-9-]+) with resultId=([A-Za-z0-9-]+) /);
  assert(match !== null, `${requirementId}: statement result binding missing`);
  return { resultId: match[2], resultType: match[1] };
}

function valueType(value) {
  if (value === null) return 'NULL';
  if (Array.isArray(value)) return 'ARRAY';
  if (typeof value === 'object') return 'OBJECT';
  return typeof value === 'boolean' ? 'BOOLEAN' : typeof value === 'number' ? 'NUMBER' : 'STRING';
}

function buildOperatorDefinitions(registry, contract) {
  const byOperator = new Map(contract.semanticProgramSchema.declaredOperators.map((operator) => [operator, new Set()]));
  for (const program of contract.semanticPredicates) {
    for (const assertion of program.assertions) {
      const types = byOperator.get(assertion.op);
      assert(types !== undefined, `${program.requirementId}: undeclared opcode ${assertion.op}`);
      for (const [name, value] of Object.entries(assertion)) if (name !== 'op') types.add(`${name}:${valueType(value)}`);
    }
  }
  return [...byOperator.entries()].sort(([left], [right]) => utf8Compare(left, right)).map(([operator, types]) => {
    const argumentTypes = types.size === 0 ? ['NONE'] : sortedStrings(types);
    return attachForSchema(registry, 'CONNECT-TRD2-V6-OPERATOR-DEFINITION-V3-SCHEMA', {
      argumentTypes,
      operator,
      recordKind: 'OPERATOR-DEFINITION-V3',
      resultType: 'BOOLEAN',
      schemaVersion: 'CONNECT-TRD2-V6-OPERATOR-DEFINITION-V3',
      semantics: `Evaluate opcode ${operator} over the exact canonical JSON operand object reconstructed from the frozen predecessor semantic assertion; every declared operand name and type must match and unknown input blocks.`,
      unknownArgumentTerminal: 'CLAUSE-AST-UNKNOWN-ARGUMENT',
    });
  });
}

function vectorMode(vectorId) {
  for (const mode of ['POSITIVE', 'NEGATIVE', 'FAILURE', 'CONCURRENCY', 'RECOVERY']) if (vectorId.endsWith(`-${mode}`)) return mode;
  throw new Error(`unknown vector mode: ${vectorId}`);
}

function buildClauseRegistry({ contract, registry, subject }) {
  const requirementById = new Map(subject.requirements.map((record) => [record.requirementId, record]));
  const bindingById = new Map(subject.requirementBindings.map((record) => [record.requirementId, record]));
  const operatorDefinitions = buildOperatorDefinitions(registry, contract);
  const clauseNodes = [];
  const obligations = [];
  const programs = [];
  assert(contract.semanticPredicates.length === 128, 'semantic predicate denominator must be 128');
  for (const predecessor of [...contract.semanticPredicates].sort((left, right) => utf8Compare(left.requirementId, right.requirementId))) {
    const requirement = requirementById.get(predecessor.requirementId);
    const binding = bindingById.get(predecessor.requirementId);
    assert(requirement !== undefined && binding !== undefined, `${predecessor.requirementId}: missing subject record`);
    const rootsByIndex = new Map();
    predecessor.assertions.forEach((assertion, clauseIndex) => {
      const operands = Object.fromEntries(Object.entries(assertion).filter(([key]) => key !== 'op'));
      const argumentRoots = sortedStrings(Object.entries(operands).map(([name, value]) => rootV6('TRD2V6-CLAUSE-ARGUMENT-V3', 'CONNECT-TRD2-V6-CLAUSE-ARGUMENT-V3', { name, value })));
      const node = attachForSchema(registry, 'CONNECT-TRD2-V6-CLAUSE-NODE-V3-SCHEMA', {
        argumentRoots,
        clauseIndex,
        expectedResult: 'true',
        failureTerminal: predecessor.failureTerminal,
        opcode: assertion.op,
        operandType: 'CANONICAL-JSON',
        operandValue: canonicalV6(operands),
        recordKind: 'CLAUSE-NODE-V3',
        schemaVersion: 'CONNECT-TRD2-V6-CLAUSE-NODE-V3',
      });
      clauseNodes.push(node);
      rootsByIndex.set(clauseIndex, node.recordRoot);
    });
    assert(rootsByIndex.size > 0, `${predecessor.requirementId}: absent clause`);
    const requirementObligations = predecessor.counterexampleCoverage.map((coverage) => {
      const clauseRoot = rootsByIndex.get(coverage.assertionIndex);
      assert(clauseRoot !== undefined && predecessor.assertions[coverage.assertionIndex]?.op === coverage.assertionOp, `${predecessor.requirementId}: counterexample clause mismatch`);
      const obligation = attachForSchema(registry, 'CONNECT-TRD2-V6-COUNTEREXAMPLE-OBLIGATION-V3-SCHEMA', {
        clauseRoot,
        expectedTerminal: predecessor.failureTerminal,
        mode: vectorMode(coverage.vectorId),
        recordKind: 'COUNTEREXAMPLE-OBLIGATION-V3',
        requirementRoot: requirement.requirementRoot,
        schemaVersion: 'CONNECT-TRD2-V6-COUNTEREXAMPLE-OBLIGATION-V3',
        status: 'PENDING-PASS-5',
        vectorId: coverage.vectorId,
      });
      obligations.push(obligation);
      return obligation;
    });
    assert(requirementObligations.length > 0, `${predecessor.requirementId}: absent counterexample obligation`);
    const { resultId, resultType } = resultBinding(requirement.content.statement, requirement.requirementId);
    const clauseRoots = sortedStrings([...rootsByIndex.values()]);
    const counterexampleRoots = sortedStrings(requirementObligations.map(({ recordRoot }) => recordRoot));
    programs.push(attachForSchema(registry, 'CONNECT-TRD2-V6-CLAUSE-AST-PROGRAM-V3-SCHEMA', {
      clauseCount: clauseRoots.length,
      clauseRoots,
      counterexampleCount: counterexampleRoots.length,
      counterexampleRoots,
      dependencyRequirementIds: parseDependencies(requirement.content.dependencies, requirement.requirementId),
      exactStatementSha256: sha256Bytes(Buffer.from(requirement.content.statement, 'utf8')),
      failureTerminal: predecessor.failureTerminal,
      noSharedReceiptCredit: true,
      passRule: 'ALL-CLAUSES-PASS',
      predecessorSemanticProgramRoot: predecessor.semanticProgramRoot,
      predicateId: predecessor.predicateId,
      recordKind: 'CLAUSE-AST-PROGRAM-V3',
      requirementId: requirement.requirementId,
      requirementRoot: requirement.requirementRoot,
      resultId,
      resultType,
      schemaVersion: 'CONNECT-TRD2-V6-CLAUSE-AST-PROGRAM-V3',
      semanticExecutionState: 'COMPILED-LOSSLESS-NOT-YET-EXECUTED',
      sourceBindingDigest: rootV6('TRD2V6-REQUIREMENT-SOURCE-BINDING-DIGEST-V3', 'CONNECT-TRD2-V6-REQUIREMENT-SOURCE-BINDING-DIGEST-V3', binding),
      vectorIds: sortedStrings(predecessor.vectorIds),
    }));
  }
  const body = {
    claimLimit: 'LOSSLESS-TYPED-COMPILATION-NOT-SEMANTIC-ACCEPTANCE',
    operatorCount: operatorDefinitions.length,
    operatorDefinitions,
    operatorRegistryRoot: collectionRoot('TRD2V6-OPERATOR-DEFINITION-COLLECTION-V3', 'CONNECT-TRD2-V6-OPERATOR-DEFINITION-COLLECTION-V3', operatorDefinitions),
    programCollectionRoot: collectionRoot('TRD2V6-CLAUSE-AST-PROGRAM-COLLECTION-V3', 'CONNECT-TRD2-V6-CLAUSE-AST-PROGRAM-COLLECTION-V3', programs),
    programCount: programs.length,
    programs,
    recordKind: 'CLAUSE-AST-REGISTRY-V3',
    requirementCollectionRoot: subject.requirementCollectionRoot,
    schemaVersion: 'CONNECT-TRD2-V6-CLAUSE-AST-REGISTRY-V3',
    unknownOpcodeTerminal: 'CLAUSE-AST-UNKNOWN-OPCODE',
  };
  return { artifact: attachForSchema(registry, CLAUSE_REGISTRY_SCHEMA_ID, body), clauseNodes, obligations };
}

function guardCondition(registry, { expectedBoolean = null, expectedRoot = null, expectedString = null, field, operator }) {
  return attachForSchema(registry, 'CONNECT-TRD2-V6-GUARD-CONDITION-V3-SCHEMA', {
    expectedBoolean,
    expectedRoot,
    expectedString,
    field,
    operator,
    recordKind: 'GUARD-CONDITION-V3',
    schemaVersion: 'CONNECT-TRD2-V6-GUARD-CONDITION-V3',
  });
}

function makeGuardCatalog(registry) {
  const profiles = new Map();
  return {
    get({ conditions, failureTerminal }) {
      const normalized = conditions.map((condition) => ({
        expectedBoolean: condition.expectedBoolean ?? null,
        expectedRoot: condition.expectedRoot ?? null,
        expectedString: condition.expectedString ?? null,
        field: condition.field,
        operator: condition.operator,
      }));
      const key = canonicalV6({ conditions: normalized, failureTerminal });
      if (profiles.has(key)) return profiles.get(key);
      const records = normalized.map((condition) => guardCondition(registry, condition));
      const digest = sha256Bytes(Buffer.from(key, 'utf8')).slice(0, 24);
      const profile = attachForSchema(registry, 'CONNECT-TRD2-V6-GUARD-PROFILE-V3-SCHEMA', {
        conditionCount: records.length,
        conditions: records,
        failureTerminal,
        guardProfileId: `TRD2V6-GUARD-${digest}`,
        passRule: 'ALL-CONDITIONS-PASS',
        recordKind: 'GUARD-PROFILE-V3',
        schemaVersion: 'CONNECT-TRD2-V6-GUARD-PROFILE-V3',
      });
      profiles.set(key, profile);
      return profile;
    },
    values() {
      return [...profiles.values()].sort((left, right) => utf8Compare(left.guardProfileId, right.guardProfileId));
    },
  };
}

function expressionCondition(expression) {
  return { expectedString: expression, field: 'predecessor.guardExpression', operator: 'STRING-EQUAL' };
}

function falseCondition() {
  return { field: 'transition.allowed', operator: 'ALWAYS-FALSE' };
}

function durableEffectClass(effect) {
  if (effect === 'NONE') return 'NONE';
  if (effect === 'COMMIT-EXACT-AUTHORIZED-DELETION') return 'PROVIDER-FINALIZE';
  if (effect.startsWith('CREATE-')) return 'PROVIDER-PREPARE';
  if (effect === 'AUDIT-ONLY') return 'AUDIT-ONLY';
  return 'ATOMIC-LOCAL';
}

function makeTransition(registry, guards, machineId, row) {
  const conditions = row.disposition === 'ALLOW' ? [expressionCondition(row.guard)] : [falseCondition(), expressionCondition(row.guard)];
  const profile = guards.get({ conditions, failureTerminal: row.terminal });
  return attachForSchema(registry, 'CONNECT-TRD2-V6-STATE-TRANSITION-V3-SCHEMA', {
    disposition: row.disposition,
    durableEffectClass: durableEffectClass(row.effect),
    event: row.event,
    fromState: row.fromState,
    guardProfileRoot: profile.recordRoot,
    recordKind: 'STATE-TRANSITION-V3',
    safeTerminal: row.terminal,
    schemaVersion: 'CONNECT-TRD2-V6-STATE-TRANSITION-V3',
    toState: row.toState,
    transitionKey: `${machineId}::${row.fromState}::${row.event}`,
  });
}

function makeApplication(registry, { applicationId, currentState, sourceBasisRoot, targetRoot = null }) {
  return attachForSchema(registry, 'CONNECT-TRD2-V6-STATE-MACHINE-APPLICATION-V3-SCHEMA', {
    applicationId,
    currentState,
    recordKind: 'STATE-MACHINE-APPLICATION-V3',
    schemaVersion: 'CONNECT-TRD2-V6-STATE-MACHINE-APPLICATION-V3',
    sourceBasisRoot,
    targetRoot,
  });
}

function makeMachine(registry, guards, { applications, events, family, machineId, rows, states }) {
  const sortedStates = sortedStrings(states);
  const sortedEvents = sortedStrings(events);
  assert(new Set(sortedStates).size === sortedStates.length, `${machineId}: duplicate state`);
  assert(new Set(sortedEvents).size === sortedEvents.length, `${machineId}: duplicate event`);
  const expectedPairs = new Set(sortedStates.flatMap((state) => sortedEvents.map((event) => `${state}\u0000${event}`)));
  const observedPairs = new Set();
  const transitions = rows.map((row) => {
    const pair = `${row.fromState}\u0000${row.event}`;
    assert(expectedPairs.has(pair) && !observedPairs.has(pair), `${machineId}: missing/duplicate transition pair ${row.fromState}/${row.event}`);
    assert(sortedStates.includes(row.toState), `${machineId}: unknown target state ${row.toState}`);
    observedPairs.add(pair);
    return makeTransition(registry, guards, machineId, row);
  }).sort((left, right) => utf8Compare(left.transitionKey, right.transitionKey));
  assert(observedPairs.size === expectedPairs.size, `${machineId}: transition denominator ${observedPairs.size}/${expectedPairs.size}`);
  const applicationRecords = applications.map((application) => makeApplication(registry, application)).sort((left, right) => utf8Compare(left.applicationId, right.applicationId));
  applicationRecords.forEach((application) => assert(sortedStates.includes(application.currentState), `${machineId}: application state outside machine`));
  return attachForSchema(registry, 'CONNECT-TRD2-V6-STATE-MACHINE-V3-SCHEMA', {
    applicationCount: applicationRecords.length,
    applications: applicationRecords,
    defaultPolicy: 'EXPLICIT-ROW-ONLY',
    eventCount: sortedEvents.length,
    events: sortedEvents,
    expandedTransitionCount: transitions.length * applicationRecords.length,
    family,
    machineId,
    recordKind: 'STATE-MACHINE-V3',
    schemaVersion: 'CONNECT-TRD2-V6-STATE-MACHINE-V3',
    stateCount: sortedStates.length,
    states: sortedStates,
    transitionCount: transitions.length,
    transitions,
  });
}

function fullMatrix(states, events, resolve) {
  return sortedStrings(states).flatMap((fromState) => sortedStrings(events).map((event) => {
    const legal = resolve(fromState, event);
    if (legal !== null) return { disposition: 'ALLOW', effect: legal.effect ?? 'UPDATE-STATE', event, fromState, guard: legal.guard, terminal: legal.terminal ?? 'NONE', toState: legal.toState };
    return { disposition: 'BLOCK', effect: 'NONE', event, fromState, guard: 'NO-DECLARED-TRANSITION', terminal: 'UNDECLARED-TRANSITION-BLOCKED', toState: fromState };
  }));
}

function reviewMachine(registry, guards, contract) {
  const states = ['EMPTY', 'GENERATION-A-SEALED', 'GENERATION-B-SEALED', 'RECONCILED', 'ACCEPTED', 'APPEALED', 'CUSTODY-BLOCKED', 'EXPIRED', 'REVOKED'];
  const events = ['SEAL-GENERATION-A', 'SEAL-GENERATION-B', 'RECONCILE', 'ACCEPT', 'APPEAL', 'CUSTODY-FAIL', 'EXPIRE', 'REVOKE'];
  const legal = new Map([
    ['EMPTY\u0000SEAL-GENERATION-A', ['GENERATION-A-SEALED', 'APPOINTMENT+INDEPENDENCE+EXPECTED-HEAD+CAS+FENCE+TRUSTED-TIME']],
    ['GENERATION-A-SEALED\u0000SEAL-GENERATION-B', ['GENERATION-B-SEALED', 'DISJOINT-REVIEWER+APPOINTMENT+EXPECTED-HEAD+CAS+FENCE+TRUSTED-TIME']],
    ['GENERATION-B-SEALED\u0000RECONCILE', ['RECONCILED', 'LOSSLESS-NO-MERGE-UNION+NO-SELF-APPROVAL+EXPECTED-HEAD+CAS+FENCE']],
    ['RECONCILED\u0000ACCEPT', ['ACCEPTED', 'ZERO-OPEN-P0-P1+AUTHORIZED-P2-P3+ONE-USE-AUTHORITY+EXPECTED-HEAD+CAS+FENCE']],
    ['ACCEPTED\u0000APPEAL', ['APPEALED', 'APPEAL-AUTHORITY+TRUSTED-TIME+APPEND-ONLY']],
  ]);
  return makeMachine(registry, guards, {
    applications: [{ applicationId: 'REVIEW:DEFINITION-LIFECYCLE', currentState: 'EMPTY', sourceBasisRoot: rootV6('TRD2V6-REVIEW-OPERATIONS-V3', 'CONNECT-TRD2-V6-REVIEW-OPERATIONS-V3', contract.reviewOperations) }],
    events,
    family: 'REVIEW',
    machineId: 'TRD2V6-MACHINE-REVIEW',
    rows: fullMatrix(states, events, (state, event) => {
      const direct = legal.get(`${state}\u0000${event}`);
      if (direct) return { guard: direct[1], toState: direct[0] };
      if (event === 'CUSTODY-FAIL' && !['REVOKED', 'EXPIRED'].includes(state)) return { guard: 'CUSTODY-INTEGRITY-FAILURE-RECEIPT+EXPECTED-HEAD+CAS', toState: 'CUSTODY-BLOCKED' };
      if (event === 'EXPIRE' && !['REVOKED', 'EXPIRED'].includes(state)) return { guard: 'TRUSTED-TIME-AFTER-AUTHORITY-EXPIRY+EXPECTED-HEAD+CAS', toState: 'EXPIRED' };
      if (event === 'REVOKE' && state !== 'REVOKED') return { guard: 'REVOCATION-AUTHORITY+EXPECTED-HEAD+CAS+FENCE', toState: 'REVOKED' };
      return null;
    }),
    states,
  });
}

function missingValueMachine(registry, guards, contract) {
  const source = contract.missingValueTransitionSchema;
  const states = source.states;
  const events = [...new Set([...source.legal.map(({ operation }) => operation), 'AUTHORITY-EXPIRES', 'AUTHORITY-REVOKED', 'CONFLICT-DETECTED', 'RECONCILE-CONFLICT'])];
  const direct = new Map(source.legal.map((row) => [`${row.from}\u0000${row.operation}`, row]));
  return makeMachine(registry, guards, {
    applications: contract.missingValueMachines.map((machine) => ({
      applicationId: `MISSING-VALUE:${machine.missingValueId}`,
      currentState: machine.currentState,
      sourceBasisRoot: machine.machineRoot,
      targetRoot: machine.sourceRoot,
    })),
    events,
    family: 'MISSING-VALUE',
    machineId: 'TRD2V6-MACHINE-MISSING-VALUE',
    rows: fullMatrix(states, events, (state, event) => {
      const row = direct.get(`${state}\u0000${event}`);
      if (row) return { guard: `${row.authorityExpression}+EXPECTED-VERSION+EXPECTED-HEAD+CAS+FENCE+TRUSTED-TIME`, toState: row.to };
      if (event === 'AUTHORITY-EXPIRES' && !['REVOKED', 'CONFLICT'].includes(state)) return { guard: 'TRUSTED-TIME-AFTER-AUTHORITY-EXPIRY+EXPECTED-HEAD+CAS', toState: 'REVOKED' };
      if (event === 'AUTHORITY-REVOKED' && state !== 'REVOKED') return { guard: 'REVOCATION-RECEIPT+EXPECTED-HEAD+CAS+FENCE', toState: 'REVOKED' };
      if (event === 'CONFLICT-DETECTED' && state !== 'CONFLICT') return { guard: 'CONFLICT-RECEIPT+ZERO-WRITE-COMMIT', toState: 'CONFLICT' };
      if (event === 'RECONCILE-CONFLICT' && state === 'CONFLICT') return { guard: 'APPOINTED-INDEPENDENT-RECONCILER+LOSSLESS-UNION+EXPECTED-HEAD+CAS+FENCE', toState: 'PROPOSED' };
      return null;
    }),
    states,
  });
}

function lifecycleMachines(registry, guards, contract) {
  const source = contract.dataLifecycle;
  assert(source.matrixRows.length === 3200 && source.expectedTupleDenominator === 3200, 'data lifecycle source denominator mismatch');
  return source.classes.map((dataClass) => {
    const rows = source.matrixRows.filter(({ dataClassId }) => dataClassId === dataClass.dataClassId).map((row) => ({
      disposition: row.disposition,
      effect: row.effect,
      event: row.event,
      fromState: row.fromState,
      guard: row.guard,
      terminal: row.terminal,
      toState: row.toState,
    }));
    return makeMachine(registry, guards, {
      applications: [{ applicationId: `DATA-LIFECYCLE:${dataClass.dataClassId}`, currentState: 'ACTIVE', sourceBasisRoot: dataClass.classRoot }],
      events: source.events,
      family: 'DATA-LIFECYCLE',
      machineId: `TRD2V6-MACHINE-DATA-LIFECYCLE-${dataClass.dataClassId}`,
      rows,
      states: source.states,
    });
  });
}

function retentionMachine(registry, guards, contract) {
  const states = ['BLOCKED', 'VALIDATED', 'LOCKED', 'PREPARED', 'AUTHORIZED', 'COMMITTED', 'FINALIZED', 'PARTIAL', 'UNKNOWN', 'AUDITED'];
  const events = ['VALIDATE-PLAN', 'LOCK-HEAD', 'PREPARE-PROVIDERS', 'VERIFY-AUTHORIZED-SUBSET', 'CAS-COMMIT', 'FINALIZE-PROVIDERS', 'AUDIT-READBACK', 'PROVIDER-PARTIAL', 'PROVIDER-UNKNOWN', 'RECONCILE-PARTIAL', 'RECONCILE-UNKNOWN'];
  const legal = new Map([
    ['BLOCKED\u0000VALIDATE-PLAN', ['VALIDATED', 'PLAN-ID+DIGEST+POLICY-VERSION+ISSUED-AND-EXPIRES-WITHIN-900S+CUTOFF+INACTIVE+NO-LEGAL-HOLD+AUTHORITY+TRUSTED-TIME']],
    ['VALIDATED\u0000LOCK-HEAD', ['LOCKED', 'EXPECTED-LIFECYCLE-HEAD+EXPECTED-POLICY-HEAD+CAS+FENCE']],
    ['LOCKED\u0000PREPARE-PROVIDERS', ['PREPARED', 'IDEMPOTENCY-KEY+AUTHORIZED-CANDIDATE-IDENTITIES+PROVIDER-PREPARE']],
    ['PREPARED\u0000VERIFY-AUTHORIZED-SUBSET', ['AUTHORIZED', 'PROVIDER-CONFIRMED-SET-SUBSET-OF-AUTHORIZED-SET+CUTOFF+INACTIVE+NO-LEGAL-HOLD']],
    ['AUTHORIZED\u0000CAS-COMMIT', ['COMMITTED', 'EXPECTED-HEAD+CAS+FENCE+ALL-OR-NOTHING-DURABLE-STATE']],
    ['COMMITTED\u0000FINALIZE-PROVIDERS', ['FINALIZED', 'COMMIT-RECEIPT+PROVIDER-OUTCOME-ROOTS+IDEMPOTENCY-KEY']],
    ['FINALIZED\u0000AUDIT-READBACK', ['AUDITED', 'POST-DELETE-READBACK-AUDIT-ONLY-NOT-SAFETY']],
    ['PREPARED\u0000PROVIDER-PARTIAL', ['PARTIAL', 'PARTIAL-PROVIDER-OUTCOME-RECEIPT+ZERO-UNAUTHORIZED-COMMIT']],
    ['COMMITTED\u0000PROVIDER-PARTIAL', ['PARTIAL', 'PARTIAL-PROVIDER-OUTCOME-RECEIPT+EXACT-COMMIT-RECONCILIATION']],
    ['PREPARED\u0000PROVIDER-UNKNOWN', ['UNKNOWN', 'UNKNOWN-PROVIDER-OUTCOME-RECEIPT+ZERO-UNAUTHORIZED-COMMIT']],
    ['COMMITTED\u0000PROVIDER-UNKNOWN', ['UNKNOWN', 'UNKNOWN-PROVIDER-OUTCOME-RECEIPT+EXACT-COMMIT-RECONCILIATION']],
    ['PARTIAL\u0000RECONCILE-PARTIAL', ['BLOCKED', 'APPOINTED-RECONCILER+EXACT-PROVIDER-OUTCOMES+EXPECTED-HEAD+CAS+FENCE']],
    ['UNKNOWN\u0000RECONCILE-UNKNOWN', ['BLOCKED', 'APPOINTED-RECONCILER+EXACT-PROVIDER-OUTCOMES+EXPECTED-HEAD+CAS+FENCE']],
  ]);
  return makeMachine(registry, guards, {
    applications: [{
      applicationId: 'RETENTION:POLICY-V2',
      currentState: 'BLOCKED',
      sourceBasisRoot: rootV6('TRD2V6-RETENTION-V2-SOURCE', 'CONNECT-TRD2-V6-RETENTION-V2-SOURCE', contract.retentionV2),
    }],
    events,
    family: 'RETENTION',
    machineId: 'TRD2V6-MACHINE-RETENTION-V2',
    rows: fullMatrix(states, events, (state, event) => {
      const direct = legal.get(`${state}\u0000${event}`);
      return direct ? { effect: event === 'AUDIT-READBACK' ? 'AUDIT-ONLY' : event.includes('PROVIDER') ? 'PROVIDER-PREPARE' : event === 'CAS-COMMIT' ? 'COMMIT-EXACT-AUTHORIZED-DELETION' : 'UPDATE-STATE', guard: direct[1], toState: direct[0] } : null;
    }),
    states,
  });
}

function backupRestoreMachine(registry, guards, contract) {
  const states = ['BLOCKED', 'CAPTURED', 'WINDOW-PROVED', 'QUARANTINED', 'PRIVACY-REPLAYED', 'REDELETE-COMPLETE', 'ACTIVATED', 'REJECTED'];
  const events = ['CAPTURE-BACKUP', 'PROVE-WINDOW', 'START-RESTORE', 'PRIVACY-REPLAY', 'REDELETE', 'ACTIVATE', 'FAIL'];
  const legal = new Map([
    ['BLOCKED\u0000CAPTURE-BACKUP', ['CAPTURED', 'BACKUP-ID+SOURCE-COHORT-ROOT+DATABASE-DIGEST+OBJECT-MANIFEST-DIGEST+R2-INVENTORY-DIGEST+AUTHORITY']],
    ['CAPTURED\u0000PROVE-WINDOW', ['WINDOW-PROVED', 'R2-INVENTORY-EQUALS-OBJECT-MANIFEST+TWO-BOUNDARY-OBSERVATIONS+RETENTION-WINDOW']],
    ['WINDOW-PROVED\u0000START-RESTORE', ['QUARANTINED', 'NEW-RESTORE-IDENTITY+BOUND-BACKUP-ID+EXACT-DIGESTS+R2-CONSISTENCY+QUARANTINE-BEFORE-READ']],
    ['QUARANTINED\u0000PRIVACY-REPLAY', ['PRIVACY-REPLAYED', 'PRIOR-PRIVACY-OBLIGATION-SET+PRIVACY-REPLAY-RECEIPT+PURGED-NEVER-RESURRECTED']],
    ['PRIVACY-REPLAYED\u0000REDELETE', ['REDELETE-COMPLETE', 'REDELETE-RECEIPT+PURGED-IDENTITIES-REMOVED']],
    ['PRIVACY-REPLAYED\u0000ACTIVATE', ['ACTIVATED', 'NO-REDELETE-REQUIRED+ACTIVATION-AUTHORITY+EXPECTED-HEAD+CAS+FENCE']],
    ['REDELETE-COMPLETE\u0000ACTIVATE', ['ACTIVATED', 'REDELETE-COMPLETE+ACTIVATION-AUTHORITY+EXPECTED-HEAD+CAS+FENCE']],
  ]);
  return makeMachine(registry, guards, {
    applications: [{
      applicationId: 'BACKUP-RESTORE:EVIDENCE-V2',
      currentState: 'BLOCKED',
      sourceBasisRoot: rootV6('TRD2V6-BACKUP-RESTORE-V2-SOURCE', 'CONNECT-TRD2-V6-BACKUP-RESTORE-V2-SOURCE', contract.backupRestoreV2),
    }],
    events,
    family: 'BACKUP-RESTORE',
    machineId: 'TRD2V6-MACHINE-BACKUP-RESTORE-V2',
    rows: fullMatrix(states, events, (state, event) => {
      if (event === 'FAIL' && !['ACTIVATED', 'REJECTED'].includes(state)) return { effect: 'AUDIT-ONLY', guard: 'FAILURE-RECEIPT+ZERO-ACTIVATION', terminal: 'BACKUP-RESTORE-BLOCKED', toState: 'REJECTED' };
      const direct = legal.get(`${state}\u0000${event}`);
      return direct ? { effect: event === 'CAPTURE-BACKUP' || event === 'START-RESTORE' ? 'CREATE-BACKUP-OR-RESTORE-COPY' : 'UPDATE-STATE', guard: direct[1], toState: direct[0] } : null;
    }),
    states,
  });
}

function publicFlowMachine(registry, guards, contract) {
  const states = contract.publicHardeningGates[0].states;
  const events = ['SCAN-START', 'EVIDENCE-PASS', 'EVIDENCE-BLOCK', 'AUTHORITY-REVOKED', 'RETRY'];
  const legal = new Map([
    ['UNEXECUTED\u0000SCAN-START', ['EVALUATING', 'EXACT-CONTROL-ROOT+SCAN-INVENTORY+EXPECTED-HEAD+CAS+FENCE']],
    ['EVALUATING\u0000EVIDENCE-PASS', ['PASS', 'ALL-REQUIRED-SCANS-PASS+DISCLOSURE-SAFE-EVIDENCE+TWO-READBACKS']],
    ['EVALUATING\u0000EVIDENCE-BLOCK', ['BLOCKED', 'ANY-REQUIRED-SCAN-BLOCKED+ZERO-PUBLIC-CREDIT']],
    ['PASS\u0000AUTHORITY-REVOKED', ['REVOKED', 'REVOCATION-RECEIPT+EXPECTED-HEAD+CAS+FENCE']],
    ['BLOCKED\u0000RETRY', ['EVALUATING', 'FRESH-SCAN-ROOTS+EXPECTED-HEAD+CAS+FENCE']],
  ]);
  const gateById = new Map(contract.publicHardeningGates.map((gate) => [gate.gateId, gate]));
  return makeMachine(registry, guards, {
    applications: contract.publicControls.map((control) => {
      const gate = gateById.get(control.gateId);
      assert(gate !== undefined, `${control.controlId}: missing public gate`);
      return { applicationId: `PUBLIC-FLOW:${control.controlId}`, currentState: gate.currentState, sourceBasisRoot: control.controlRoot, targetRoot: gate.gateRoot };
    }),
    events,
    family: 'PUBLIC-FLOW',
    machineId: 'TRD2V6-MACHINE-PUBLIC-FLOW',
    rows: fullMatrix(states, events, (state, event) => {
      const direct = legal.get(`${state}\u0000${event}`);
      return direct ? { guard: direct[1], terminal: event === 'EVIDENCE-BLOCK' ? 'PUBLIC-HARDENING-BLOCKED' : 'NONE', toState: direct[0] } : null;
    }),
    states,
  });
}

function severityMachines(registry, guards, contract) {
  const bindingById = new Map(contract.severityBindings.map((binding) => [binding.envelopeId, binding]));
  const soe50 = bindingById.get('SOE-050');
  assert(soe50 !== undefined && soe50.currentSeverity === 'P2' && soe50.pendingCondition?.to === 'P0', 'SOE-050 source binding mismatch');
  const ordinary = contract.severityBindings.filter(({ envelopeId }) => envelopeId !== 'SOE-050');
  const ordinaryStates = ['P0', 'P1', 'P2', 'P3', 'REVOKED'];
  const ordinaryEvents = ['APPEND-NO-CHANGE', 'SEVERITY-CHANGE', 'AUTHORITY-REVOKED'];
  const ordinaryMachine = makeMachine(registry, guards, {
    applications: ordinary.map((binding) => ({ applicationId: `SEVERITY:${binding.envelopeId}`, currentState: binding.currentSeverity, sourceBasisRoot: binding.bindingRoot, targetRoot: binding.historyRoot })),
    events: ordinaryEvents,
    family: 'SEVERITY',
    machineId: 'TRD2V6-MACHINE-SEVERITY-ORDINARY',
    rows: fullMatrix(ordinaryStates, ordinaryEvents, (state, event) => {
      if (event === 'APPEND-NO-CHANGE' && state !== 'REVOKED') return { guard: 'APPEND-ONLY-HISTORY+EXPECTED-HEAD+CAS+FENCE+TRUSTED-TIME', toState: state };
      if (event === 'AUTHORITY-REVOKED' && state !== 'REVOKED') return { guard: 'REVOCATION-RECEIPT+APPEND-ONLY-HISTORY+EXPECTED-HEAD+CAS', toState: 'REVOKED' };
      return null;
    }),
    states: ordinaryStates,
  });
  const specialStates = ['P0', 'P2'];
  const specialEvents = ['FIRST-REACHABILITY', 'DUPLICATE-FIRST-REACHABILITY', 'APPEND-NO-CHANGE'];
  const specialMachine = makeMachine(registry, guards, {
    applications: [{ applicationId: 'SEVERITY:SOE-050', currentState: 'P2', sourceBasisRoot: soe50.bindingRoot, targetRoot: soe50.historyRoot }],
    events: specialEvents,
    family: 'SEVERITY',
    machineId: 'TRD2V6-MACHINE-SEVERITY-SOE-050-FIRST-REACHABILITY',
    rows: fullMatrix(specialStates, specialEvents, (state, event) => {
      if (state === 'P2' && event === 'FIRST-REACHABILITY') return { guard: 'ENVELOPE-ID-EQUALS-SOE-050+FIRST-ACCEPTED-REACHABILITY+NO-PRIOR-ESCALATION-EVENT+APPEND-ONLY-HISTORY+EXPECTED-HEAD+CAS+FENCE+TRUSTED-TIME', toState: 'P0' };
      if (event === 'APPEND-NO-CHANGE') return { guard: 'APPEND-ONLY-HISTORY+EXPECTED-HEAD+CAS+FENCE', toState: state };
      return null;
    }),
    states: specialStates,
  });
  return [ordinaryMachine, specialMachine];
}

function identityConstructors(registry) {
  const schemaIds = [
    'CONNECT-TRD2-V6-GUARD-CONDITION-V3-SCHEMA',
    'CONNECT-TRD2-V6-GUARD-PROFILE-V3-SCHEMA',
    'CONNECT-TRD2-V6-STATE-TRANSITION-V3-SCHEMA',
    'CONNECT-TRD2-V6-STATE-MACHINE-APPLICATION-V3-SCHEMA',
    'CONNECT-TRD2-V6-STATE-MACHINE-V3-SCHEMA',
    STATE_REGISTRY_SCHEMA_ID,
  ];
  return schemaIds.map((schemaId) => {
    const identity = schemaFor(registry, schemaId).contentIdentity;
    return attachForSchema(registry, 'CONNECT-TRD2-V6-IDENTITY-CONSTRUCTOR-V3-SCHEMA', {
      excludedKeys: sortedStrings([identity.idKey, identity.rootKey]),
      idKey: identity.idKey,
      recordKind: 'IDENTITY-CONSTRUCTOR-V3',
      rootKey: identity.rootKey,
      schemaVersion: 'CONNECT-TRD2-V6-IDENTITY-CONSTRUCTOR-V3',
      typeTag: identity.typeTag,
    });
  }).sort((left, right) => utf8Compare(left.schemaVersion, right.schemaVersion));
}

function buildStateRegistry({ contract, registry }) {
  const guards = makeGuardCatalog(registry);
  const machines = [
    reviewMachine(registry, guards, contract),
    missingValueMachine(registry, guards, contract),
    ...lifecycleMachines(registry, guards, contract),
    retentionMachine(registry, guards, contract),
    backupRestoreMachine(registry, guards, contract),
    publicFlowMachine(registry, guards, contract),
    ...severityMachines(registry, guards, contract),
  ].sort((left, right) => utf8Compare(left.machineId, right.machineId));
  const guardProfiles = guards.values();
  const constructors = identityConstructors(registry);
  const body = {
    familyCount: new Set(machines.map(({ family }) => family)).size,
    guardProfileCount: guardProfiles.length,
    guardProfiles,
    guardProfileRoot: collectionRoot('TRD2V6-GUARD-PROFILE-COLLECTION-V3', 'CONNECT-TRD2-V6-GUARD-PROFILE-COLLECTION-V3', guardProfiles),
    identityConstructorCount: constructors.length,
    identityConstructors: constructors,
    machineCollectionRoot: collectionRoot('TRD2V6-STATE-MACHINE-COLLECTION-V3', 'CONNECT-TRD2-V6-STATE-MACHINE-COLLECTION-V3', machines),
    machineCount: machines.length,
    machines,
    recordKind: 'STATE-MACHINE-REGISTRY-V3',
    schemaVersion: 'CONNECT-TRD2-V6-STATE-MACHINE-REGISTRY-V3',
    totalExpandedTransitionCount: machines.reduce((sum, machine) => sum + machine.expandedTransitionCount, 0),
    totalTransitionCount: machines.reduce((sum, machine) => sum + machine.transitionCount, 0),
    unknownTransitionTerminal: 'UNDECLARED-TRANSITION-BLOCKED',
  };
  return attachForSchema(registry, STATE_REGISTRY_SCHEMA_ID, body);
}

function validateInputRows(inputRows, observedHead) {
  assert(Array.isArray(inputRows) && inputRows.length === TRD2_V6_PASS3_V2_INPUT_PATHS.length, 'Pass 3 input provenance denominator mismatch');
  inputRows.forEach((row, index) => {
    exactKeys(row, ['byteLength', 'logicalPath', 'observedCommit', 'sha256'], `inputRows.${index}`);
    assert(row.logicalPath === TRD2_V6_PASS3_V2_INPUT_PATHS[index], `inputRows.${index}: path/order mismatch`);
    assert(row.observedCommit === observedHead, `inputRows.${index}: observed commit mismatch`);
    assert(Number.isSafeInteger(row.byteLength) && row.byteLength > 0, `inputRows.${index}: byte length`);
    assert(/^[0-9a-f]{64}$/.test(row.sha256), `inputRows.${index}: sha256`);
  });
}

function validateClauseDerivations(registry, clauseArtifact, clauseNodes, obligations) {
  const schemaById = schemaMap(registry);
  const nodeSchema = schemaFor(registry, 'CONNECT-TRD2-V6-CLAUSE-NODE-V3-SCHEMA');
  const obligationSchema = schemaFor(registry, 'CONNECT-TRD2-V6-COUNTEREXAMPLE-OBLIGATION-V3-SCHEMA');
  clauseNodes.forEach((record) => validateV3Record(record, nodeSchema, schemaById));
  obligations.forEach((record) => validateV3Record(record, obligationSchema, schemaById));
  const nodeRoots = new Set(clauseNodes.map(({ recordRoot }) => recordRoot));
  const obligationRoots = new Set(obligations.map(({ recordRoot }) => recordRoot));
  assert(nodeRoots.size === clauseNodes.length, 'Clause Node root collision/duplicate');
  assert(obligationRoots.size === obligations.length, 'Counterexample root collision/duplicate');
  for (const program of clauseArtifact.programs) {
    assert(program.clauseRoots.every((root) => nodeRoots.has(root)), `${program.requirementId}: unresolvable Clause Node root`);
    assert(program.counterexampleRoots.every((root) => obligationRoots.has(root)), `${program.requirementId}: unresolvable counterexample root`);
  }
  const referencedNodes = new Set(clauseArtifact.programs.flatMap(({ clauseRoots }) => clauseRoots));
  const referencedObligations = new Set(clauseArtifact.programs.flatMap(({ counterexampleRoots }) => counterexampleRoots));
  assert(referencedNodes.size === nodeRoots.size && referencedObligations.size === obligationRoots.size, 'unreferenced virtual Clause record');
}

function validateStateSemantics(stateArtifact) {
  const families = new Set(stateArtifact.machines.map(({ family }) => family));
  assert(canonicalV6(sortedStrings(families)) === canonicalV6(sortedStrings(['REVIEW', 'MISSING-VALUE', 'DATA-LIFECYCLE', 'RETENTION', 'BACKUP-RESTORE', 'PUBLIC-FLOW', 'SEVERITY'])), 'state-machine family coverage mismatch');
  for (const machine of stateArtifact.machines) {
    const pairs = machine.transitions.map(({ event, fromState }) => `${fromState}\u0000${event}`);
    assert(pairs.length === machine.states.length * machine.events.length && new Set(pairs).size === pairs.length, `${machine.machineId}: explicit transition matrix mismatch`);
    assert(machine.expandedTransitionCount === machine.transitionCount * machine.applicationCount, `${machine.machineId}: expanded denominator mismatch`);
  }
  const lifecycle = stateArtifact.machines.filter(({ family }) => family === 'DATA-LIFECYCLE');
  assert(lifecycle.length === 10 && lifecycle.reduce((sum, machine) => sum + machine.expandedTransitionCount, 0) === 3200, 'data lifecycle denominator mismatch');
  for (const machine of lifecycle) {
    for (const transition of machine.transitions) {
      if (transition.disposition === 'ALLOW' && ['START-DELETE', 'PROVIDER-CONFIRMED', 'START-REDELETE'].includes(transition.event)) assert(!['ACTIVE', 'HOLD-ACTIVE', 'HOLD-RELEASE-PENDING'].includes(transition.fromState), `${machine.machineId}: Active/Hold delete allowed`);
      if (transition.fromState === 'PURGED' && transition.disposition === 'ALLOW') assert(transition.toState === 'PURGED', `${machine.machineId}: PURGED resurrection`);
    }
  }
  const publicApps = stateArtifact.machines.filter(({ family }) => family === 'PUBLIC-FLOW').flatMap(({ applications }) => applications);
  assert(publicApps.length === 52 && new Set(publicApps.map(({ applicationId }) => applicationId)).size === 52, 'public flow coverage mismatch');
  const severityApps = stateArtifact.machines.filter(({ family }) => family === 'SEVERITY').flatMap(({ applications }) => applications);
  assert(severityApps.length === 84 && new Set(severityApps.map(({ applicationId }) => applicationId)).size === 84, 'severity envelope coverage mismatch');
  const soe50 = stateArtifact.machines.find(({ machineId }) => machineId === 'TRD2V6-MACHINE-SEVERITY-SOE-050-FIRST-REACHABILITY');
  assert(soe50?.applicationCount === 1 && soe50.applications[0].applicationId === 'SEVERITY:SOE-050', 'SOE-050 application mismatch');
  const escalation = soe50.transitions.filter(({ disposition, event, fromState, toState }) => disposition === 'ALLOW' && event === 'FIRST-REACHABILITY' && fromState === 'P2' && toState === 'P0');
  assert(escalation.length === 1, 'SOE-050 escalation must be reachable exactly once');
  assert(soe50.transitions.every((transition) => !(transition.disposition === 'ALLOW' && transition.event === 'DUPLICATE-FIRST-REACHABILITY')), 'duplicate SOE-050 escalation allowed');
  const retention = stateArtifact.machines.find(({ family }) => family === 'RETENTION');
  const backup = stateArtifact.machines.find(({ family }) => family === 'BACKUP-RESTORE');
  assert(retention?.transitions.some(({ disposition, event }) => disposition === 'ALLOW' && event === 'VERIFY-AUTHORIZED-SUBSET'), 'retention authorized-subset guard missing');
  assert(retention?.transitions.some(({ disposition, event, durableEffectClass }) => disposition === 'ALLOW' && event === 'AUDIT-READBACK' && durableEffectClass === 'AUDIT-ONLY'), 'retention readback is not audit-only');
  assert(backup?.transitions.some(({ disposition, event }) => disposition === 'ALLOW' && event === 'START-RESTORE'), 'backup-bound restore guard missing');
  assert(backup?.transitions.some(({ disposition, event }) => disposition === 'ALLOW' && event === 'PRIVACY-REPLAY'), 'privacy replay guard missing');
}

export function buildPass3V2Artifacts({ contract, inputRows, observedHead, parserCorpus, registry, sourceCapture }) {
  validateClosedSchemaRegistryV3(registry);
  validateInputRows(inputRows, observedHead);
  assert(contract?.semanticPredicates?.length === 128, 'predecessor semantic program denominator mismatch');
  const subject = buildSubject({ inputRows, parserCorpus, registry, sourceCapture });
  const clause = buildClauseRegistry({ contract, registry, subject });
  const stateMachineRegistry = buildStateRegistry({ contract, registry });
  const artifacts = {
    [TRD2_V6_PASS3_V2_OUTPUTS[0]]: subject,
    [TRD2_V6_PASS3_V2_OUTPUTS[1]]: clause.artifact,
    [TRD2_V6_PASS3_V2_OUTPUTS[2]]: stateMachineRegistry,
  };
  validatePass3V2Artifacts({ artifacts, clauseNodes: clause.clauseNodes, contract, obligations: clause.obligations, registry });
  return { artifacts, clauseNodes: clause.clauseNodes, obligations: clause.obligations };
}

export function validatePass3V2Artifacts({ artifacts, clauseNodes, contract, obligations, registry }) {
  exactKeys(artifacts, TRD2_V6_PASS3_V2_OUTPUTS, 'Pass3Artifacts');
  const subject = artifacts[TRD2_V6_PASS3_V2_OUTPUTS[0]];
  const clauseArtifact = artifacts[TRD2_V6_PASS3_V2_OUTPUTS[1]];
  const stateArtifact = artifacts[TRD2_V6_PASS3_V2_OUTPUTS[2]];
  validateV3Record(subject, schemaFor(registry, SUBJECT_SCHEMA_ID), schemaMap(registry));
  validateV3Record(clauseArtifact, schemaFor(registry, CLAUSE_REGISTRY_SCHEMA_ID), schemaMap(registry));
  validateV3Record(stateArtifact, schemaFor(registry, STATE_REGISTRY_SCHEMA_ID), schemaMap(registry));
  assert(subject.requirementCount === 128 && subject.requirementBindingCount === 128, 'subject denominator mismatch');
  assert(clauseArtifact.programCount === 128 && new Set(clauseArtifact.programs.map(({ requirementId }) => requirementId)).size === 128, 'Clause AST program coverage mismatch');
  assert(clauseArtifact.operatorCount === contract.semanticProgramSchema.declaredOperators.length, 'operator denominator mismatch');
  validateClauseDerivations(registry, clauseArtifact, clauseNodes, obligations);
  validateStateSemantics(stateArtifact);
  return artifacts;
}

export function pass3V2Outcome(artifacts) {
  return {
    artifactRoots: TRD2_V6_PASS3_V2_OUTPUTS.map((logicalPath) => ({ logicalPath, artifactRoot: artifacts[logicalPath].artifactRoot })),
    clauseCount: artifacts[TRD2_V6_PASS3_V2_OUTPUTS[1]].programs.reduce((sum, program) => sum + program.clauseCount, 0),
    counterexampleCount: artifacts[TRD2_V6_PASS3_V2_OUTPUTS[1]].programs.reduce((sum, program) => sum + program.counterexampleCount, 0),
    familyCount: artifacts[TRD2_V6_PASS3_V2_OUTPUTS[2]].familyCount,
    machineCount: artifacts[TRD2_V6_PASS3_V2_OUTPUTS[2]].machineCount,
    requirementCount: artifacts[TRD2_V6_PASS3_V2_OUTPUTS[0]].requirementCount,
    totalExpandedTransitionCount: artifacts[TRD2_V6_PASS3_V2_OUTPUTS[2]].totalExpandedTransitionCount,
    totalTransitionCount: artifacts[TRD2_V6_PASS3_V2_OUTPUTS[2]].totalTransitionCount,
  };
}

export function validatePass3V2ToolchainRegistry(value, expectedPaths) {
  exactKeys(value, ['schema', 'version', 'passThreeV2EmittedPaths', 'toolchainPaths'], 'pass3V2ToolchainRegistry');
  assert(value.schema === 'CONNECT-TRD2-V6-PASS3-V2-TOOLCHAIN-PATH-REGISTRY-V1' && value.version === 1, 'Pass 3 v2 toolchain Registry version mismatch');
  assert(canonicalV6(value.passThreeV2EmittedPaths) === canonicalV6(TRD2_V6_PASS3_V2_OUTPUTS), 'Pass 3 v2 output path Registry mismatch');
  assert(canonicalV6(value.toolchainPaths) === canonicalV6(expectedPaths), 'Pass 3 v2 toolchain path Registry mismatch');
  assert(new Set(value.toolchainPaths).size === value.toolchainPaths.length, 'Pass 3 v2 duplicate toolchain path');
  return value;
}

export function validateArtifactIdentityOnly(artifact, registry, schemaId) {
  const identity = schemaFor(registry, schemaId).contentIdentity;
  validateContentIdentity(artifact, identity.prefix, identity.typeTag, identity.schemaVersion, identity.idKey, identity.rootKey);
  return artifact;
}
