import { Buffer } from 'node:buffer';

import {
  assertRepoRelativePath,
  attachContentIdentity,
  canonicalV6,
  rootV6,
  validateContentIdentity,
} from './trd2-v6-core.mjs';
import {
  validateClosedSchemaRegistryV3,
  validateV3Record,
} from './trd2-v6-pass2-v3-core.mjs';

export const TRD2_V6_PASS4_DIRECTORY = 'docs/planning/trd2-v6-candidate-v3-2026-08-31';
export const TRD2_V6_PASS4_CHARTER_PATH = 'docs/planning/section-35-6-trd-2-v6-pass4-build-charter-2026-08-31.md';
export const TRD2_V6_PASS4_TOOLCHAIN_REGISTRY_PATH = 'docs/planning/trd2-v6-pass4-toolchain-path-registry-v1-2026-08-31.json';
export const TRD2_V6_PASS4_OUTPUTS = Object.freeze([
  `${TRD2_V6_PASS4_DIRECTORY}/causal-graph.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/graph-engine-a-report.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/graph-engine-b-report.json`,
]);
export const TRD2_V6_PASS4_DEFERRED_OUTPUTS = Object.freeze([
  `${TRD2_V6_PASS4_DIRECTORY}/executable-vector-corpus.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/raw-root-overlay-and-invalidation.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/detached-acceptance-packet.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/finding-closure-crosswalk.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/atomic-package-manifest.json`,
]);
export const TRD2_V6_PASS4_INPUT_PATHS = Object.freeze([
  `${TRD2_V6_PASS4_DIRECTORY}/closed-schema-registry-v3.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/subject.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/clause-ast-registry.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/state-machine-registry.json`,
  'docs/planning/trd2-v6-candidate-2026-08-30/source-capture-manifest.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-grammar-and-corpus.json',
  'docs/planning/section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json',
  'docs/planning/trd2-v6-output-path-registry-v3-2026-08-31.json',
]);
export const TRD2_V6_PASS4_TOOLCHAIN_PATHS = Object.freeze([
  TRD2_V6_PASS4_CHARTER_PATH,
  'docs/planning/trd2-v6-pass3-v2-local-completion-report-2026-08-31.md',
  'docs/planning/trd2-v6-output-path-registry-v3-2026-08-31.json',
  TRD2_V6_PASS4_TOOLCHAIN_REGISTRY_PATH,
  `${TRD2_V6_PASS4_DIRECTORY}/closed-schema-registry-v3.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/canonical-engine-a-report-v3.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/canonical-engine-b-report-v3.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/subject.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/clause-ast-registry.json`,
  `${TRD2_V6_PASS4_DIRECTORY}/state-machine-registry.json`,
  'docs/planning/trd2-v6-candidate-2026-08-30/source-capture-manifest.json',
  'docs/planning/trd2-v6-candidate-2026-08-30/parser-grammar-and-corpus.json',
  'docs/planning/section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json',
  'docs/planning/section-35-6-trd-2-v5-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-30.md',
  'package.json',
  'scripts/trd2-v6-core.mjs',
  'scripts/trd2-v6-pass2-v2-core.mjs',
  'scripts/trd2-v6-pass2-v3-core.mjs',
  'scripts/trd2-v6-pass2-v3-schema-catalog.mjs',
  'scripts/trd2-v6-pass3-v2-core.mjs',
  'scripts/trd2-v6-pass4-core.mjs',
  'scripts/create-trd2-v6-pass4-candidate.mjs',
  'scripts/verify-trd2-v6-pass4-engine-a.mjs',
  'scripts/verify-trd2-v6-pass4-engine-b.py',
  'scripts/verify-trd2-v6-pass4-candidate.mjs',
  'tests/trd2-v6-pass4-core.test.mjs',
]);

const GRAPH_NODE_SCHEMA_ID = 'CONNECT-TRD2-V6-GRAPH-NODE-V3-SCHEMA';
const GRAPH_EDGE_SCHEMA_ID = 'CONNECT-TRD2-V6-GRAPH-EDGE-V3-SCHEMA';
const CAUSAL_GRAPH_SCHEMA_ID = 'CONNECT-TRD2-V6-CAUSAL-GRAPH-V3-SCHEMA';
const GRAPH_REPORT_SCHEMA_ID = 'CONNECT-TRD2-V6-GRAPH-REPORT-V3-SCHEMA';
const SHA256_RE = /^[0-9a-f]{64}$/;

const EXTERNAL_FAMILIES = new Set([
  'APPEAL-V3',
  'DEFINITION-ACCEPTANCE-V3',
  'EVIDENCE-CUSTODY-RECEIPT-V3',
  'EXPIRY-V3',
  'INDEPENDENT-REVIEW-V3',
  'LIFECYCLE-RECEIPT-V3',
  'MISSING-VALUE-RECEIPT-V3',
  'PUBLIC-FLOW-EVIDENCE-V3',
  'RECONCILIATION-V3',
  'RESTORE-EVIDENCE-V3',
  'RETENTION-DELETE-RECEIPT-V3',
  'REVIEW-AUTHORITY-V3',
  'REVIEW-GENERATION-V3',
  'REVIEW-OPERATION-RECEIPT-V3',
  'REVIEWER-APPOINTMENT-SET-V3',
  'REVIEWER-APPOINTMENT-V3',
  'REVOCATION-V3',
]);

const LOCAL_DEFERRED_FAMILIES = new Set([
  'ATOMIC-PACKAGE-MANIFEST-V3',
  'CAUSAL-GRAPH-V3',
  'DETACHED-ACCEPTANCE-PACKET-V3',
  'EXECUTABLE-VECTOR-V3',
  'EXPECTED-ORACLE-V3',
  'FINDING-CLOSURE-CROSSWALK-V3',
  'FINDING-CLOSURE-ROW-V3',
  'GRAPH-REPORT-V3',
  'INVALIDATION-RULE-V3',
  'PACKAGE-MEMBER-V3',
  'PRODUCER-QA-V3',
  'ROOT-OVERLAY-REGISTRY-V3',
  'ROOT-OVERLAY-V3',
  'VECTOR-CORPUS-V3',
  'VECTOR-OUTCOME-V3',
  'VECTOR-RUNNER-REPORT-V3',
]);

const utf8Compare = (left, right) => Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
const sortedStrings = (values) => [...values].sort(utf8Compare);

export class Pass4ValidationError extends Error {
  constructor(terminal, message) {
    super(message);
    this.terminal = terminal;
  }
}

function fail(terminal, message) {
  throw new Pass4ValidationError(terminal, message);
}

function assert(condition, terminal, message) {
  if (!condition) fail(terminal, message);
}

function exactKeys(value, expected, terminal, label) {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), terminal, `${label}: expected object`);
  assert(canonicalV6(sortedStrings(Object.keys(value))) === canonicalV6(sortedStrings(expected)), terminal, `${label}: exact keys mismatch`);
}

function schemaMap(registry) {
  return new Map(registry.schemas.map((schema) => [schema.schemaId, schema]));
}

function familyMap(registry) {
  return new Map(registry.schemas.map((schema) => [schema.family, schema]));
}

function schemaFor(registry, schemaId) {
  const schema = schemaMap(registry).get(schemaId);
  assert(schema !== undefined, 'GRAPH-SCHEMA-MISSING', `missing schema ${schemaId}`);
  return schema;
}

function schemaForFamily(registry, family) {
  const schema = familyMap(registry).get(family);
  assert(schema !== undefined, 'GRAPH-SCHEMA-MISSING', `missing schema family ${family}`);
  return schema;
}

function attachForSchema(registry, schemaId, body) {
  const schema = schemaFor(registry, schemaId);
  const identity = schema.contentIdentity;
  assert(identity?.mode === 'EXCLUDE-IDENTITY-KEYS', 'GRAPH-IDENTITY-MODE-UNSUPPORTED', `${schemaId}: unsupported identity mode`);
  const record = attachContentIdentity(identity.prefix, identity.typeTag, identity.schemaVersion, body, identity.idKey, identity.rootKey);
  validateV3Record(record, schema, schemaMap(registry));
  return record;
}

function boundRootForRecord(registry, schema, record) {
  validateV3Record(record, schema, schemaMap(registry));
  if (schema.contentIdentity !== null) return record[schema.contentIdentity.rootKey];
  return rootV6('TRD2V6-GRAPH-BOUND-RECORD-V3', `CONNECT-TRD2-V6-GRAPH-BOUND-${schema.family}`, record);
}

export function deriveExpectedFamilies(registry) {
  validateClosedSchemaRegistryV3(registry);
  const families = sortedStrings(new Set(registry.schemas.map(({ family }) => family)));
  assert(families.length === registry.schemaCount, 'GRAPH-FAMILY-DERIVATION-MISMATCH', 'schema family set is not one-to-one');
  return families;
}

function graphBuilder(registry) {
  const nodes = [];
  const edges = [];
  const nodeByKey = new Map();
  const edgeByKey = new Map();
  const recordNodeByIdentity = new Map();
  const schemas = schemaMap(registry);

  function addNode({ boundRoot, family, nodeKey, producerMode, status }) {
    assert(SHA256_RE.test(boundRoot), 'GRAPH-BOUND-ROOT-INVALID', `${nodeKey}: invalid bound root`);
    assert(!nodeByKey.has(nodeKey), 'GRAPH-DUPLICATE-NODE', `duplicate node key ${nodeKey}`);
    const node = attachForSchema(registry, GRAPH_NODE_SCHEMA_ID, {
      boundRoot,
      family,
      nodeKey,
      producerMode,
      recordKind: 'GRAPH-NODE-V3',
      schemaVersion: 'CONNECT-TRD2-V6-GRAPH-NODE-V3',
      status,
    });
    nodes.push(node);
    nodeByKey.set(nodeKey, node);
    return node;
  }

  function addEdge(from, to, edgeType, qualifier) {
    assert(from.recordRoot !== to.recordRoot, 'GRAPH-SELF-EDGE', `${from.nodeKey} -> ${to.nodeKey}`);
    const key = `${edgeType}\u0000${from.recordRoot}\u0000${to.recordRoot}\u0000${qualifier}`;
    if (edgeByKey.has(key)) return edgeByKey.get(key);
    const edge = attachForSchema(registry, GRAPH_EDGE_SCHEMA_ID, {
      edgeKey: `${edgeType}::${from.recordRoot}::${to.recordRoot}::${qualifier}`,
      edgeType,
      fromNodeRoot: from.recordRoot,
      qualifier,
      recordKind: 'GRAPH-EDGE-V3',
      schemaVersion: 'CONNECT-TRD2-V6-GRAPH-EDGE-V3',
      toNodeRoot: to.recordRoot,
    });
    edges.push(edge);
    edgeByKey.set(key, edge);
    return edge;
  }

  const schemaNodes = new Map();
  for (const schema of [...registry.schemas].sort((left, right) => utf8Compare(left.schemaId, right.schemaId))) {
    const node = addNode({
      boundRoot: schema.schemaRoot,
      family: schema.family,
      nodeKey: `SCHEMA::${schema.schemaId}`,
      producerMode: 'SOLE',
      status: 'PRODUCED',
    });
    schemaNodes.set(schema.schemaId, node);
  }

  function addRecord(schemaId, record, nodeKey, parent = null, qualifier = 'PARENT-PRODUCES-EXACT-RECORD') {
    const schema = schemas.get(schemaId);
    assert(schema !== undefined, 'GRAPH-SCHEMA-MISSING', `${nodeKey}: missing schema ${schemaId}`);
    const boundRoot = boundRootForRecord(registry, schema, record);
    const identityKey = `${schemaId}\u0000${boundRoot}`;
    if (recordNodeByIdentity.has(identityKey)) {
      const existing = recordNodeByIdentity.get(identityKey);
      if (parent !== null) addEdge(parent, existing, 'PRODUCES', qualifier);
      return existing;
    }
    const node = addNode({
      boundRoot,
      family: schema.family,
      nodeKey,
      producerMode: 'SOLE',
      status: 'PRODUCED',
    });
    recordNodeByIdentity.set(identityKey, node);
    addEdge(schemaNodes.get(schemaId), node, 'BINDS-EXACTLY', 'CLOSED-SCHEMA-BINDS-RECORD');
    if (parent !== null) addEdge(parent, node, 'PRODUCES', qualifier);
    return node;
  }

  function addDeclaration({ family, key, mode = 'SOLE', parent = null, status = 'DECLARED', basis = null }) {
    const schema = schemaForFamily(registry, family);
    const node = addNode({
      boundRoot: basis ?? rootV6('TRD2V6-GRAPH-DECLARATION-V3', 'CONNECT-TRD2-V6-GRAPH-DECLARATION-V3', { family, key, schemaRoot: schema.schemaRoot }),
      family,
      nodeKey: key,
      producerMode: mode,
      status,
    });
    addEdge(schemaNodes.get(schema.schemaId), node, status === 'BLOCKED' ? 'BLOCKS-AT' : 'PRODUCES', status === 'BLOCKED' ? 'AWAITING-EXACT-NON-FABRICATED-EVIDENCE' : 'SCHEMA-DECLARES-FUTURE-RECORD');
    if (parent !== null) addEdge(parent, node, 'PRODUCES', 'PARENT-DECLARES-EXACT-FUTURE-RECORD');
    return node;
  }

  return { addDeclaration, addEdge, addNode, addRecord, edges, nodeByKey, nodes, schemaNodes };
}

function linkSchemaFixtures(builder, registry) {
  const fixtureSchema = schemaForFamily(registry, 'PORTABLE-FIXTURE-V3');
  const portableSchemaNode = builder.schemaNodes.get(fixtureSchema.schemaId);
  for (const fixture of [...registry.fixtures].sort((left, right) => utf8Compare(left.fixtureId, right.fixtureId))) {
    const targetSchemaNode = builder.schemaNodes.get(fixture.schemaId);
    const node = builder.addNode({
      boundRoot: fixture.fixtureRoot,
      family: 'PORTABLE-FIXTURE-V3',
      nodeKey: `SCHEMA-FIXTURE::${fixture.fixtureId}`,
      producerMode: 'SOLE',
      status: 'PRODUCED',
    });
    builder.addEdge(portableSchemaNode, node, 'BINDS-EXACTLY', 'PORTABLE-SCHEMA-ORACLE-FIXTURE-ENVELOPE');
    builder.addEdge(targetSchemaNode, node, 'CONSUMES', 'FIXTURE-TESTS-TARGET-SCHEMA');
  }

  const bindingSchema = schemaForFamily(registry, 'OUTPUT-REGISTRY-BINDING-V1');
  for (const [index, binding] of registry.outputBindings.entries()) {
    const node = builder.addNode({
      boundRoot: rootV6('TRD2V6-OUTPUT-BINDING-V3', 'CONNECT-TRD2-V6-OUTPUT-BINDING-V3', binding),
      family: bindingSchema.family,
      nodeKey: `OUTPUT-BINDING::${String(index).padStart(2, '0')}::${binding.logicalPath}`,
      producerMode: 'SOLE',
      status: 'PRODUCED',
    });
    builder.addEdge(builder.schemaNodes.get(bindingSchema.schemaId), node, 'BINDS-EXACTLY', 'OUTPUT-PATH-BINDS-CLOSED-SCHEMA');
    const target = builder.schemaNodes.get(binding.schemaId);
    if (target !== undefined) builder.addEdge(node, target, 'BINDS-EXACTLY', 'OUTPUT-PATH-TARGET-SCHEMA');
  }
}

function linkSourceAndParser(builder, registry, sourceCapture, parserCorpus) {
  const sourceManifest = builder.addRecord(schemaForFamily(registry, 'SOURCE-CAPTURE-MANIFEST-V1').schemaId, sourceCapture, 'ARTIFACT::SOURCE-CAPTURE-MANIFEST');
  const sourceRows = new Map();
  for (const source of sourceCapture.sources) {
    const row = builder.addRecord(schemaForFamily(registry, 'SOURCE-CAPTURE-ROW-V1').schemaId, source, `SOURCE::${source.sourceId}`, sourceManifest, 'SOURCE-MANIFEST-PRODUCES-ROW');
    sourceRows.set(source.sourceRoot, row);
    const capture = builder.addNode({
      boundRoot: rootV6('TRD2V6-SOURCE-CAPTURE-BODY-V3', 'CONNECT-TRD2-V6-SOURCE-CAPTURE-BODY-V3', source.capture),
      family: 'SOURCE-CAPTURE-V1',
      nodeKey: `CAPTURE::${source.sourceId}`,
      producerMode: 'SOLE',
      status: 'PRODUCED',
    });
    builder.addEdge(row, capture, 'PRODUCES', 'SOURCE-ROW-CONTAINS-EXACT-CAPTURE');
  }

  const parser = builder.addRecord(schemaForFamily(registry, 'PARSER-GRAMMAR-AND-CORPUS-V1').schemaId, parserCorpus, 'ARTIFACT::PARSER-GRAMMAR-CORPUS');
  builder.addEdge(sourceManifest, parser, 'PRODUCES', 'CAPTURED-SOURCES-PRODUCE-PARSER-CORPUS');
  const grammar = builder.addRecord(schemaForFamily(registry, 'PARSER-GRAMMAR-V1').schemaId, parserCorpus.grammar, `GRAMMAR::${parserCorpus.grammar.grammarId}`, parser, 'PARSER-CORPUS-PRODUCES-GRAMMAR');
  for (const fixture of [...parserCorpus.positiveFixtures, ...parserCorpus.negativeFixtures].sort((left, right) => utf8Compare(left.fixtureId, right.fixtureId))) {
    const node = builder.addRecord(schemaForFamily(registry, 'PARSER-FIXTURE-V1').schemaId, fixture, `PARSER-FIXTURE::${fixture.fixtureId}`, parser, 'PARSER-CORPUS-PRODUCES-FIXTURE');
    builder.addEdge(grammar, node, 'CONSUMES', 'FIXTURE-CONSUMES-FROZEN-GRAMMAR');
  }
  return { parser, sourceManifest, sourceRows };
}

function linkSubject(builder, registry, subject, sourceManifest, parser) {
  const subjectNode = builder.addRecord(schemaForFamily(registry, 'SUBJECT-V3').schemaId, subject, 'ARTIFACT::SUBJECT');
  builder.addEdge(sourceManifest, subjectNode, 'PRODUCES', 'SOURCE-CUSTODY-PRODUCES-SUBJECT');
  builder.addEdge(parser, subjectNode, 'PRODUCES', 'PARSER-PRODUCES-TYPED-SUBJECT');
  const currentState = builder.addRecord(schemaForFamily(registry, 'CURRENT-STATE-V3').schemaId, subject.currentState, 'SUBJECT::CURRENT-STATE', subjectNode);
  const provenanceNodes = subject.provenance.map((record, index) => builder.addRecord(schemaForFamily(registry, 'SOURCE-PROVENANCE-V3').schemaId, record, `SUBJECT-PROVENANCE::${String(index).padStart(2, '0')}::${record.recordRoot}`, subjectNode));
  const requirements = new Map();
  const bindings = new Map();
  for (const record of subject.requirementBindings) bindings.set(record.requirementId, builder.addRecord(schemaForFamily(registry, 'REQUIREMENT-SOURCE-BINDING-V2').schemaId, record, `REQUIREMENT-BINDING::${record.requirementId}`, subjectNode));
  for (const record of subject.requirements) {
    const node = builder.addRecord(schemaForFamily(registry, 'REQUIREMENT-V2').schemaId, record, `REQUIREMENT::${record.requirementId}`, subjectNode);
    requirements.set(record.requirementId, node);
    builder.addEdge(bindings.get(record.requirementId), node, 'BINDS-EXACTLY', 'SOURCE-BINDING-BINDS-EXACT-REQUIREMENT');
  }
  return { bindings, currentState, provenanceNodes, requirements, subjectNode };
}

function linkClause(builder, registry, clause, virtualClauseNodes, obligations, requirements, subjectNode) {
  const clauseArtifact = builder.addRecord(schemaForFamily(registry, 'CLAUSE-AST-REGISTRY-V3').schemaId, clause, 'ARTIFACT::CLAUSE-AST-REGISTRY');
  builder.addEdge(subjectNode, clauseArtifact, 'PRODUCES', 'SUBJECT-PRODUCES-LOSSLESS-CLAUSE-COMPILATION');
  for (const record of clause.operatorDefinitions) builder.addRecord(schemaForFamily(registry, 'OPERATOR-DEFINITION-V3').schemaId, record, `OPERATOR::${record.operator}`, clauseArtifact);

  const clauseNodeByRoot = new Map();
  for (const record of virtualClauseNodes) clauseNodeByRoot.set(record.recordRoot, builder.addRecord(schemaForFamily(registry, 'CLAUSE-NODE-V3').schemaId, record, `CLAUSE::${record.recordRoot}`, clauseArtifact));
  const obligationByRoot = new Map();
  for (const record of obligations) obligationByRoot.set(record.recordRoot, builder.addRecord(schemaForFamily(registry, 'COUNTEREXAMPLE-OBLIGATION-V3').schemaId, record, `COUNTEREXAMPLE::${record.recordRoot}`, clauseArtifact));

  const programs = new Map();
  const vectorNodes = new Map();
  const oracleNodes = new Map();
  const outcomeNodes = new Map();
  for (const record of clause.programs) {
    const program = builder.addRecord(schemaForFamily(registry, 'CLAUSE-AST-PROGRAM-V3').schemaId, record, `PROGRAM::${record.requirementId}`, clauseArtifact);
    programs.set(record.requirementId, program);
    builder.addEdge(requirements.get(record.requirementId), program, 'PRODUCES', 'REQUIREMENT-PRODUCES-CLAUSE-PROGRAM');
    for (const dependencyId of record.dependencyRequirementIds) builder.addEdge(requirements.get(dependencyId), requirements.get(record.requirementId), 'CONSUMES', 'DEPENDENCY-REQUIREMENT-CONSUMED-BY-REQUIREMENT');
    for (const root of record.clauseRoots) builder.addEdge(program, clauseNodeByRoot.get(root), 'PRODUCES', 'PROGRAM-PRODUCES-CLAUSE-NODE');
    for (const root of record.counterexampleRoots) builder.addEdge(program, obligationByRoot.get(root), 'PRODUCES', 'PROGRAM-PRODUCES-COUNTEREXAMPLE-OBLIGATION');
    for (const vectorId of record.vectorIds) {
      if (!vectorNodes.has(vectorId)) {
        const basis = { requirementId: record.requirementId, requirementRoot: record.requirementRoot, vectorId };
        const vector = builder.addDeclaration({ family: 'EXECUTABLE-VECTOR-V3', key: `VECTOR::${vectorId}`, parent: program, status: 'BLOCKED', basis: rootV6('TRD2V6-DECLARED-VECTOR-V3', 'CONNECT-TRD2-V6-DECLARED-VECTOR-V3', basis) });
        const oracle = builder.addDeclaration({ family: 'EXPECTED-ORACLE-V3', key: `ORACLE::${vectorId}`, parent: vector, status: 'BLOCKED', basis: rootV6('TRD2V6-DECLARED-ORACLE-V3', 'CONNECT-TRD2-V6-DECLARED-ORACLE-V3', basis) });
        const outcome = builder.addDeclaration({ family: 'VECTOR-OUTCOME-V3', key: `VECTOR-OUTCOME::${vectorId}`, parent: vector, status: 'BLOCKED', basis: rootV6('TRD2V6-DECLARED-VECTOR-OUTCOME-V3', 'CONNECT-TRD2-V6-DECLARED-VECTOR-OUTCOME-V3', basis) });
        builder.addEdge(vector, oracle, 'BINDS-EXACTLY', 'VECTOR-BINDS-INDEPENDENTLY-DERIVED-ORACLE');
        builder.addEdge(vector, outcome, 'PRODUCES', 'VECTOR-RUNNER-PRODUCES-OUTCOME');
        vectorNodes.set(vectorId, vector);
        oracleNodes.set(vectorId, oracle);
        outcomeNodes.set(vectorId, outcome);
      }
    }
  }
  for (const record of obligations) builder.addEdge(obligationByRoot.get(record.recordRoot), vectorNodes.get(record.vectorId), 'BINDS-EXACTLY', 'COUNTEREXAMPLE-OBLIGATION-BINDS-EXACT-VECTOR');
  return { clauseArtifact, obligationByRoot, oracleNodes, outcomeNodes, programs, vectorNodes };
}

function linkState(builder, registry, state, subjectNode) {
  const stateArtifact = builder.addRecord(schemaForFamily(registry, 'STATE-MACHINE-REGISTRY-V3').schemaId, state, 'ARTIFACT::STATE-MACHINE-REGISTRY');
  builder.addEdge(subjectNode, stateArtifact, 'PRODUCES', 'SUBJECT-PRODUCES-CLOSED-STATE-MACHINES');
  for (const record of state.identityConstructors) builder.addRecord(schemaForFamily(registry, 'IDENTITY-CONSTRUCTOR-V3').schemaId, record, `IDENTITY-CONSTRUCTOR::${record.recordRoot}`, stateArtifact);
  const guardNodes = new Map();
  for (const record of state.guardProfiles) {
    const guard = builder.addRecord(schemaForFamily(registry, 'GUARD-PROFILE-V3').schemaId, record, `GUARD-PROFILE::${record.guardProfileId}`, stateArtifact);
    guardNodes.set(record.recordRoot, guard);
    for (const condition of record.conditions) {
      const node = builder.addRecord(schemaForFamily(registry, 'GUARD-CONDITION-V3').schemaId, condition, `GUARD-CONDITION::${condition.recordRoot}`);
      builder.addEdge(node, guard, 'CONSUMES', 'GUARD-PROFILE-CONSUMES-CONDITION');
    }
  }
  const machines = new Map();
  for (const record of state.machines) {
    const machine = builder.addRecord(schemaForFamily(registry, 'STATE-MACHINE-V3').schemaId, record, `MACHINE::${record.machineId}`, stateArtifact);
    machines.set(record.machineId, machine);
    for (const stateName of record.states) builder.addDeclaration({ family: 'STATE-MACHINE-V3', key: `STATE::${record.machineId}::${stateName}`, parent: machine, basis: rootV6('TRD2V6-DECLARED-STATE-V3', 'CONNECT-TRD2-V6-DECLARED-STATE-V3', { machineRoot: record.recordRoot, stateName }) });
    const eventFamily = record.family === 'DATA-LIFECYCLE' ? 'LIFECYCLE-EVENT-V3' : 'OPERATION-V3';
    for (const event of record.events) builder.addDeclaration({ family: eventFamily, key: `EVENT::${record.machineId}::${event}`, parent: machine, basis: rootV6('TRD2V6-DECLARED-EVENT-V3', 'CONNECT-TRD2-V6-DECLARED-EVENT-V3', { event, machineRoot: record.recordRoot }) });
    for (const application of record.applications) builder.addRecord(schemaForFamily(registry, 'STATE-MACHINE-APPLICATION-V3').schemaId, application, `APPLICATION::${application.applicationId}`, machine);
    for (const transition of record.transitions) {
      const node = builder.addRecord(schemaForFamily(registry, 'STATE-TRANSITION-V3').schemaId, transition, `TRANSITION::${transition.recordRoot}`, machine);
      builder.addEdge(guardNodes.get(transition.guardProfileRoot), node, 'CONSUMES', 'TRANSITION-CONSUMES-TYPED-GUARD');
    }
  }
  return { machines, stateArtifact };
}

function addFuturePipeline(builder, registry, produced) {
  const external = new Map();
  for (const family of sortedStrings(EXTERNAL_FAMILIES)) external.set(family, builder.addDeclaration({ family, key: `EXTERNAL::${family}`, mode: 'EXTERNAL', status: 'BLOCKED', basis: schemaForFamily(registry, family).schemaRoot }));
  const deferred = new Map();
  for (const family of sortedStrings(LOCAL_DEFERRED_FAMILIES)) deferred.set(family, builder.addDeclaration({ family, key: `DECLARED::${family}`, status: 'BLOCKED', basis: schemaForFamily(registry, family).schemaRoot }));

  const graph = deferred.get('CAUSAL-GRAPH-V3');
  for (const input of [produced.sourceManifest, produced.parser, produced.subjectNode, produced.clauseArtifact, produced.stateArtifact]) builder.addEdge(input, graph, 'CONSUMES', 'PASS4-GRAPH-CONSUMES-EXACT-NORMATIVE-ROOT');
  const vectorCorpus = deferred.get('VECTOR-CORPUS-V3');
  builder.addEdge(graph, vectorCorpus, 'PRODUCES', 'GRAPH-AUTHORIZES-COMPLETE-VECTOR-DENOMINATOR');
  for (const vector of produced.vectorNodes.values()) builder.addEdge(vector, vectorCorpus, 'CONSUMES', 'VECTOR-CORPUS-CONSUMES-EXACT-VECTOR');
  const overlay = deferred.get('ROOT-OVERLAY-REGISTRY-V3');
  builder.addEdge(vectorCorpus, overlay, 'PRODUCES', 'EXACT-VECTOR-ROOT-ENABLES-OVERLAY');
  builder.addEdge(graph, overlay, 'CONSUMES', 'OVERLAY-CONSUMES-EXACT-GRAPH-ROOT');
  const packet = deferred.get('DETACHED-ACCEPTANCE-PACKET-V3');
  builder.addEdge(overlay, packet, 'PRODUCES', 'OVERLAY-PRODUCES-DETACHED-PACKET-INPUT');
  const crosswalk = deferred.get('FINDING-CLOSURE-CROSSWALK-V3');
  builder.addEdge(vectorCorpus, crosswalk, 'PRODUCES', 'VECTOR-RESULTS-PRODUCE-FINDING-CROSSWALK');
  const packageManifest = deferred.get('ATOMIC-PACKAGE-MANIFEST-V3');
  builder.addEdge(packet, packageManifest, 'CONSUMES', 'PACKAGE-CONSUMES-DETACHED-PACKET');
  builder.addEdge(crosswalk, packageManifest, 'CONSUMES', 'PACKAGE-CONSUMES-FINDING-CROSSWALK');

  const generationA = builder.addDeclaration({ family: 'REVIEW-GENERATION-V3', key: 'EXTERNAL::REVIEW-GENERATION-V3::A', mode: 'EXTERNAL', status: 'BLOCKED', basis: schemaForFamily(registry, 'REVIEW-GENERATION-V3').schemaRoot });
  const generationB = builder.addDeclaration({ family: 'REVIEW-GENERATION-V3', key: 'EXTERNAL::REVIEW-GENERATION-V3::B', mode: 'EXTERNAL', status: 'BLOCKED', basis: schemaForFamily(registry, 'REVIEW-GENERATION-V3').schemaRoot });
  for (const generation of [generationA, generationB]) {
    builder.addEdge(packet, generation, 'CONSUMES', 'REVIEW-GENERATION-CONSUMES-DETACHED-PACKET');
    builder.addEdge(external.get('REVIEWER-APPOINTMENT-SET-V3'), generation, 'CONSUMES', 'GENERATION-CONSUMES-ELIGIBLE-APPOINTMENT');
    builder.addEdge(external.get('EVIDENCE-CUSTODY-RECEIPT-V3'), generation, 'CONSUMES', 'GENERATION-CONSUMES-CUSTODY-RECEIPT');
  }
  const review = external.get('INDEPENDENT-REVIEW-V3');
  builder.addEdge(generationA, review, 'PRODUCES', 'GENERATION-A-PRODUCES-REVIEW-INPUT');
  builder.addEdge(generationB, review, 'PRODUCES', 'GENERATION-B-PRODUCES-REVIEW-INPUT');
  const reconciliation = external.get('RECONCILIATION-V3');
  builder.addEdge(review, reconciliation, 'PRODUCES', 'TWO-GENERATION-REVIEW-PRODUCES-LOSSLESS-RECONCILIATION');
  const acceptance = external.get('DEFINITION-ACCEPTANCE-V3');
  builder.addEdge(reconciliation, acceptance, 'PRODUCES', 'RECONCILIATION-PRODUCES-DEFINITION-ACCEPTANCE-INPUT');
  builder.addEdge(packageManifest, acceptance, 'CONSUMES', 'ACCEPTANCE-CONSUMES-ATOMIC-PACKAGE');

  const preHead = builder.addDeclaration({ family: 'ROOT-OVERLAY-V3', key: 'DECLARED-HEAD::PRE-REVIEW', mode: 'EXTERNAL', status: 'BLOCKED', basis: schemaForFamily(registry, 'ROOT-OVERLAY-V3').schemaRoot });
  const successorHead = builder.addDeclaration({ family: 'ROOT-OVERLAY-V3', key: 'DECLARED-HEAD::SUCCESSOR', status: 'BLOCKED', basis: schemaForFamily(registry, 'ROOT-OVERLAY-V3').schemaRoot });
  builder.addEdge(preHead, review, 'CONSUMES', 'REVIEW-CONSUMES-IMMUTABLE-PRE-REVIEW-HEAD');
  builder.addEdge(acceptance, successorHead, 'PRODUCES', 'ACCEPTANCE-PRODUCES-SUCCESSOR-HEAD');
  return { acceptance, deferred, external, preHead, successorHead };
}

function addInvalidationEdges(builder, successorHead) {
  const dependencies = builder.nodes.filter((node) => node.status === 'PRODUCED' && node.recordRoot !== successorHead.recordRoot);
  for (const dependency of dependencies) builder.addEdge(dependency, successorHead, 'INVALIDATES', 'DEPENDENCY-ROOT-CHANGE-INVALIDATES-SUCCESSOR-HEAD');
  return dependencies;
}

function sealGraph(registry, nodes, edges, expectedFamilies) {
  const sortedNodes = [...nodes].sort((left, right) => utf8Compare(left.nodeKey, right.nodeKey));
  const sortedEdges = [...edges].sort((left, right) => utf8Compare(left.edgeKey, right.edgeKey));
  const nodeRoots = sortedNodes.map(({ recordRoot }) => recordRoot);
  const edgeRoots = sortedEdges.map(({ recordRoot }) => recordRoot);
  const nodeCollectionRoot = rootV6('TRD2V6-GRAPH-NODE-COLLECTION-V3', 'CONNECT-TRD2-V6-GRAPH-NODE-COLLECTION-V3', nodeRoots);
  const edgeCollectionRoot = rootV6('TRD2V6-GRAPH-EDGE-COLLECTION-V3', 'CONNECT-TRD2-V6-GRAPH-EDGE-COLLECTION-V3', edgeRoots);
  const typedGraphRoot = rootV6('TRD2V6-TYPED-CAUSAL-GRAPH-V3', 'CONNECT-TRD2-V6-TYPED-CAUSAL-GRAPH-V3', { edgeRoots, expectedFamilies, nodeRoots });
  return attachForSchema(registry, CAUSAL_GRAPH_SCHEMA_ID, {
    edgeCollectionRoot,
    edgeCount: sortedEdges.length,
    edges: sortedEdges,
    expectedFamilies,
    expectedFamilyCount: expectedFamilies.length,
    nodeCollectionRoot,
    nodeCount: sortedNodes.length,
    nodes: sortedNodes,
    omittedFamilies: [],
    recordKind: 'CAUSAL-GRAPH-V3',
    schemaVersion: 'CONNECT-TRD2-V6-CAUSAL-GRAPH-V3',
    typedGraphRoot,
    umbrellaEdgesCountTowardCausality: false,
  });
}

export function buildPass4Graph({ clause, contract, observedHead, outputRegistry, parserCorpus, registry, sourceCapture, state, subject, toolchainRoot, virtualClauseNodes, virtualObligations }) {
  validateClosedSchemaRegistryV3(registry);
  assert(outputRegistry.plannedTopLevelSchemas[TRD2_V6_PASS4_OUTPUTS[0]] === CAUSAL_GRAPH_SCHEMA_ID, 'GRAPH-OUTPUT-SCHEMA-MISMATCH', 'causal graph output binding mismatch');
  assert(outputRegistry.plannedTopLevelSchemas[TRD2_V6_PASS4_OUTPUTS[1]] === GRAPH_REPORT_SCHEMA_ID && outputRegistry.plannedTopLevelSchemas[TRD2_V6_PASS4_OUTPUTS[2]] === GRAPH_REPORT_SCHEMA_ID, 'GRAPH-OUTPUT-SCHEMA-MISMATCH', 'graph report output binding mismatch');
  assert(/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(observedHead), 'GRAPH-OBSERVED-HEAD-INVALID', 'observed commit format');
  assert(SHA256_RE.test(toolchainRoot), 'GRAPH-TOOLCHAIN-ROOT-INVALID', 'toolchain root format');
  const builder = graphBuilder(registry);
  linkSchemaFixtures(builder, registry);
  const source = linkSourceAndParser(builder, registry, sourceCapture, parserCorpus);
  const subjectGraph = linkSubject(builder, registry, subject, source.sourceManifest, source.parser);
  const clauseGraph = linkClause(builder, registry, clause, virtualClauseNodes, virtualObligations, subjectGraph.requirements, subjectGraph.subjectNode);
  const stateGraph = linkState(builder, registry, state, subjectGraph.subjectNode);
  const toolchain = builder.addNode({
    boundRoot: toolchainRoot,
    family: 'TOOLCHAIN-REGISTRY-BINDING-V1',
    nodeKey: `TOOLCHAIN-COMMIT::${observedHead}`,
    producerMode: 'SOLE',
    status: 'PRODUCED',
  });
  builder.addEdge(builder.schemaNodes.get(schemaForFamily(registry, 'TOOLCHAIN-REGISTRY-BINDING-V1').schemaId), toolchain, 'BINDS-EXACTLY', 'FROZEN-TOOLCHAIN-REGISTRY-BINDS-PASS4-COMMIT');
  builder.addEdge(toolchain, subjectGraph.subjectNode, 'BINDS-EXACTLY', 'FROZEN-TOOLCHAIN-BINDS-PASS4-INPUTS');
  const pipeline = addFuturePipeline(builder, registry, { ...source, ...subjectGraph, ...clauseGraph, ...stateGraph });
  addInvalidationEdges(builder, pipeline.successorHead);
  const expectedFamilies = deriveExpectedFamilies(registry);
  const graph = sealGraph(registry, builder.nodes, builder.edges, expectedFamilies);
  validateCausalGraph(graph, registry);
  assert(contract.semanticPredicates.length === 128, 'GRAPH-CONTRACT-DENOMINATOR-MISMATCH', 'semantic predicate denominator');
  return graph;
}

function recomputeGraphIdentity(graph, registry) {
  return sealGraph(registry, graph.nodes, graph.edges, graph.expectedFamilies);
}

function reattachEdge(edge, registry) {
  const body = Object.fromEntries(Object.entries(edge).filter(([key]) => !['recordId', 'recordRoot'].includes(key)));
  body.edgeKey = `${body.edgeType}::${body.fromNodeRoot}::${body.toNodeRoot}::${body.qualifier}`;
  return attachForSchema(registry, GRAPH_EDGE_SCHEMA_ID, body);
}

function addMutationEdge(graph, registry, fromNodeRoot, toNodeRoot, edgeType, qualifier) {
  return attachForSchema(registry, GRAPH_EDGE_SCHEMA_ID, {
    edgeKey: `${edgeType}::${fromNodeRoot}::${toNodeRoot}::${qualifier}`,
    edgeType,
    fromNodeRoot,
    qualifier,
    recordKind: 'GRAPH-EDGE-V3',
    schemaVersion: 'CONNECT-TRD2-V6-GRAPH-EDGE-V3',
    toNodeRoot,
  });
}

export const PASS4_MUTATION_EXPECTATIONS = Object.freeze([
  ['MANDATORY-FAMILY-OMISSION', 'GRAPH-MANDATORY-FAMILY-OMITTED'],
  ['UNEXPECTED-FAMILY-INSERTION', 'GRAPH-UNEXPECTED-FAMILY'],
  ['NODE-ROOT-SUBSTITUTION', 'GRAPH-NODE-IDENTITY-MISMATCH'],
  ['EDGE-ENDPOINT-SUBSTITUTION', 'GRAPH-EDGE-IDENTITY-MISMATCH'],
  ['DANGLING-ENDPOINT', 'GRAPH-DANGLING-EDGE'],
  ['DUPLICATE-EDGE', 'GRAPH-DUPLICATE-EDGE'],
  ['PROHIBITED-CYCLE', 'GRAPH-PROHIBITED-CYCLE'],
  ['UMBRELLA-ONLY-REACHABILITY', 'GRAPH-PRODUCED-NODE-UNREACHABLE'],
  ['FALSE-EXTERNAL-PRODUCER', 'GRAPH-FALSE-PRODUCER-CLAIM'],
]);

export function createPass4Mutations(graph, registry) {
  return PASS4_MUTATION_EXPECTATIONS.map(([name, expectedTerminal]) => {
    let value = structuredClone(graph);
    if (name === 'MANDATORY-FAMILY-OMISSION') {
      const family = 'APPEAL-V3';
      const removed = new Set(value.nodes.filter((node) => node.family === family).map(({ recordRoot }) => recordRoot));
      value.nodes = value.nodes.filter((node) => node.family !== family);
      value.edges = value.edges.filter((edge) => !removed.has(edge.fromNodeRoot) && !removed.has(edge.toNodeRoot));
      value = recomputeGraphIdentity(value, registry);
    } else if (name === 'UNEXPECTED-FAMILY-INSERTION') {
      value.nodes.push(attachForSchema(registry, GRAPH_NODE_SCHEMA_ID, {
        boundRoot: schemaForFamily(registry, 'APPEAL-V3').schemaRoot,
        family: 'UNDECLARED-GRAPH-FAMILY',
        nodeKey: 'MUTATION::UNEXPECTED-FAMILY',
        producerMode: 'SOLE',
        recordKind: 'GRAPH-NODE-V3',
        schemaVersion: 'CONNECT-TRD2-V6-GRAPH-NODE-V3',
        status: 'DECLARED',
      }));
      value = recomputeGraphIdentity(value, registry);
    } else if (name === 'NODE-ROOT-SUBSTITUTION') {
      value.nodes[0].boundRoot = 'f'.repeat(64);
    } else if (name === 'EDGE-ENDPOINT-SUBSTITUTION') {
      value.edges[0].toNodeRoot = value.nodes.at(-1).recordRoot;
    } else if (name === 'DANGLING-ENDPOINT') {
      value.edges[0].toNodeRoot = 'e'.repeat(64);
      value.edges[0] = reattachEdge(value.edges[0], registry);
      value = recomputeGraphIdentity(value, registry);
    } else if (name === 'DUPLICATE-EDGE') {
      value.edges.push(structuredClone(value.edges[0]));
      value = recomputeGraphIdentity(value, registry);
    } else if (name === 'PROHIBITED-CYCLE') {
      const source = value.nodes.find(({ nodeKey }) => nodeKey === 'ARTIFACT::SOURCE-CAPTURE-MANIFEST');
      const parser = value.nodes.find(({ nodeKey }) => nodeKey === 'ARTIFACT::PARSER-GRAMMAR-CORPUS');
      value.edges.push(addMutationEdge(value, registry, parser.recordRoot, source.recordRoot, 'CONSUMES', 'MUTATION-CREATES-PROHIBITED-CYCLE'));
      value = recomputeGraphIdentity(value, registry);
    } else if (name === 'UMBRELLA-ONLY-REACHABILITY') {
      const target = value.nodes.find(({ nodeKey }) => nodeKey.startsWith('TRANSITION::'));
      value.edges = value.edges.filter((edge) => edge.toNodeRoot !== target.recordRoot);
      const anchor = value.nodes.find(({ nodeKey }) => nodeKey.startsWith('SCHEMA::'));
      value.edges.push(addMutationEdge(value, registry, anchor.recordRoot, target.recordRoot, 'INVALIDATES', 'MUTATION-UMBRELLA-ONLY'));
      value = recomputeGraphIdentity(value, registry);
    } else if (name === 'FALSE-EXTERNAL-PRODUCER') {
      value.nodes.push(attachForSchema(registry, GRAPH_NODE_SCHEMA_ID, {
        boundRoot: schemaForFamily(registry, 'DEFINITION-ACCEPTANCE-V3').schemaRoot,
        family: 'DEFINITION-ACCEPTANCE-V3',
        nodeKey: 'MUTATION::FALSE-EXTERNAL-PRODUCER',
        producerMode: 'EXTERNAL',
        recordKind: 'GRAPH-NODE-V3',
        schemaVersion: 'CONNECT-TRD2-V6-GRAPH-NODE-V3',
        status: 'PRODUCED',
      }));
      value = recomputeGraphIdentity(value, registry);
    }
    return { expectedTerminal, graph: value, mutation: name };
  });
}

function validateNodeIdentity(node, registry) {
  try {
    validateV3Record(node, schemaFor(registry, GRAPH_NODE_SCHEMA_ID), schemaMap(registry));
  } catch (error) {
    fail('GRAPH-NODE-IDENTITY-MISMATCH', error.message);
  }
}

function validateEdgeIdentity(edge, registry) {
  try {
    validateV3Record(edge, schemaFor(registry, GRAPH_EDGE_SCHEMA_ID), schemaMap(registry));
  } catch (error) {
    fail('GRAPH-EDGE-IDENTITY-MISMATCH', error.message);
  }
}

function assertAcyclic(nodes, edges) {
  const adjacency = new Map(nodes.map(({ recordRoot }) => [recordRoot, []]));
  const indegree = new Map(nodes.map(({ recordRoot }) => [recordRoot, 0]));
  for (const edge of edges.filter(({ edgeType }) => edgeType !== 'INVALIDATES')) {
    adjacency.get(edge.fromNodeRoot).push(edge.toNodeRoot);
    indegree.set(edge.toNodeRoot, indegree.get(edge.toNodeRoot) + 1);
  }
  const queue = sortedStrings([...indegree.entries()].filter(([, count]) => count === 0).map(([root]) => root));
  let visited = 0;
  while (queue.length > 0) {
    const root = queue.shift();
    visited += 1;
    for (const next of adjacency.get(root)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
        queue.sort(utf8Compare);
      }
    }
  }
  assert(visited === nodes.length, 'GRAPH-PROHIBITED-CYCLE', `causal graph visited ${visited}/${nodes.length}`);
}

function reachableProduced(nodes, edges) {
  const nodeByRoot = new Map(nodes.map((node) => [node.recordRoot, node]));
  const anchors = nodes.filter(({ nodeKey }) => nodeKey.startsWith('SCHEMA::')).map(({ recordRoot }) => recordRoot);
  const adjacency = new Map(nodes.map(({ recordRoot }) => [recordRoot, []]));
  for (const edge of edges.filter(({ edgeType }) => edgeType !== 'INVALIDATES')) adjacency.get(edge.fromNodeRoot).push(edge.toNodeRoot);
  const reached = new Set(anchors);
  const queue = [...anchors];
  while (queue.length > 0) {
    const root = queue.shift();
    for (const next of adjacency.get(root)) if (!reached.has(next)) {
      reached.add(next);
      queue.push(next);
    }
  }
  const produced = nodes.filter(({ status }) => status === 'PRODUCED');
  const missing = produced.filter(({ recordRoot }) => !reached.has(recordRoot));
  assert(missing.length === 0, 'GRAPH-PRODUCED-NODE-UNREACHABLE', `unreachable produced node ${missing[0]?.nodeKey ?? 'unknown'}`);
  assert([...reached].every((root) => nodeByRoot.has(root)), 'GRAPH-DANGLING-EDGE', 'reachability referenced unknown node');
  return { producedCount: produced.length, reachableProducedCount: produced.length };
}

export function validateCausalGraph(graph, registry) {
  validateClosedSchemaRegistryV3(registry);
  const expectedFamilies = deriveExpectedFamilies(registry);
  for (const node of graph.nodes) validateNodeIdentity(node, registry);
  const nodeKeys = graph.nodes.map(({ nodeKey }) => nodeKey);
  const nodeRoots = graph.nodes.map(({ recordRoot }) => recordRoot);
  assert(new Set(nodeKeys).size === nodeKeys.length && new Set(nodeRoots).size === nodeRoots.length, 'GRAPH-DUPLICATE-NODE', 'duplicate node identity');
  const actualFamilies = sortedStrings(new Set(graph.nodes.map(({ family }) => family)));
  const omitted = expectedFamilies.filter((family) => !actualFamilies.includes(family));
  const unexpected = actualFamilies.filter((family) => !expectedFamilies.includes(family));
  assert(omitted.length === 0, 'GRAPH-MANDATORY-FAMILY-OMITTED', `omitted family ${omitted[0]}`);
  assert(unexpected.length === 0, 'GRAPH-UNEXPECTED-FAMILY', `unexpected family ${unexpected[0]}`);
  assert(canonicalV6(graph.expectedFamilies) === canonicalV6(expectedFamilies) && graph.expectedFamilyCount === expectedFamilies.length && canonicalV6(graph.omittedFamilies) === '[]', 'GRAPH-FAMILY-DECLARATION-MISMATCH', 'expected family declaration mismatch');
  const falseExternal = graph.nodes.find(({ producerMode, status }) => producerMode === 'EXTERNAL' && status === 'PRODUCED');
  assert(falseExternal === undefined, 'GRAPH-FALSE-PRODUCER-CLAIM', `external node falsely produced: ${falseExternal?.nodeKey}`);

  for (const edge of graph.edges) validateEdgeIdentity(edge, registry);
  const edgeRoots = graph.edges.map(({ recordRoot }) => recordRoot);
  const edgeKeys = graph.edges.map(({ edgeKey }) => edgeKey);
  assert(new Set(edgeRoots).size === edgeRoots.length && new Set(edgeKeys).size === edgeKeys.length, 'GRAPH-DUPLICATE-EDGE', 'duplicate edge identity');
  const nodeRootSet = new Set(nodeRoots);
  for (const edge of graph.edges) {
    assert(nodeRootSet.has(edge.fromNodeRoot) && nodeRootSet.has(edge.toNodeRoot), 'GRAPH-DANGLING-EDGE', `dangling edge ${edge.edgeKey}`);
    assert(edge.fromNodeRoot !== edge.toNodeRoot, 'GRAPH-SELF-EDGE', `self edge ${edge.edgeKey}`);
  }
  const sortedNodeRoots = [...graph.nodes].sort((left, right) => utf8Compare(left.nodeKey, right.nodeKey)).map(({ recordRoot }) => recordRoot);
  const sortedEdgeRoots = [...graph.edges].sort((left, right) => utf8Compare(left.edgeKey, right.edgeKey)).map(({ recordRoot }) => recordRoot);
  assert(graph.nodeCount === graph.nodes.length && graph.edgeCount === graph.edges.length, 'GRAPH-COUNT-MISMATCH', 'node/edge count mismatch');
  assert(graph.nodeCollectionRoot === rootV6('TRD2V6-GRAPH-NODE-COLLECTION-V3', 'CONNECT-TRD2-V6-GRAPH-NODE-COLLECTION-V3', sortedNodeRoots), 'GRAPH-NODE-COLLECTION-ROOT-MISMATCH', 'node collection root');
  assert(graph.edgeCollectionRoot === rootV6('TRD2V6-GRAPH-EDGE-COLLECTION-V3', 'CONNECT-TRD2-V6-GRAPH-EDGE-COLLECTION-V3', sortedEdgeRoots), 'GRAPH-EDGE-COLLECTION-ROOT-MISMATCH', 'edge collection root');
  assert(graph.typedGraphRoot === rootV6('TRD2V6-TYPED-CAUSAL-GRAPH-V3', 'CONNECT-TRD2-V6-TYPED-CAUSAL-GRAPH-V3', { edgeRoots: sortedEdgeRoots, expectedFamilies, nodeRoots: sortedNodeRoots }), 'GRAPH-TYPED-ROOT-MISMATCH', 'typed graph root');
  try {
    validateV3Record(graph, schemaFor(registry, CAUSAL_GRAPH_SCHEMA_ID), schemaMap(registry));
  } catch (error) {
    fail('GRAPH-ARTIFACT-IDENTITY-MISMATCH', error.message);
  }
  assert(graph.umbrellaEdgesCountTowardCausality === false, 'GRAPH-UMBRELLA-POLICY-MISMATCH', 'umbrella policy');
  assertAcyclic(graph.nodes, graph.edges);
  const reachability = reachableProduced(graph.nodes, graph.edges);
  const acceptance = graph.nodes.find(({ nodeKey }) => nodeKey === 'EXTERNAL::DEFINITION-ACCEPTANCE-V3');
  assert(acceptance !== undefined && graph.edges.some(({ edgeType, toNodeRoot }) => edgeType !== 'INVALIDATES' && toNodeRoot === acceptance.recordRoot), 'GRAPH-ACCEPTANCE-PATH-MISSING', 'Definition Acceptance has no causal producer path');
  const preHead = graph.nodes.find(({ nodeKey }) => nodeKey === 'DECLARED-HEAD::PRE-REVIEW');
  const successorHead = graph.nodes.find(({ nodeKey }) => nodeKey === 'DECLARED-HEAD::SUCCESSOR');
  assert(preHead !== undefined && successorHead !== undefined && preHead.recordRoot !== successorHead.recordRoot, 'GRAPH-HEAD-SEPARATION-MISSING', 'head declarations missing or merged');
  assert(!graph.edges.some(({ edgeType, toNodeRoot }) => edgeType === 'INVALIDATES' && toNodeRoot === preHead.recordRoot), 'GRAPH-SELF-INVALIDATION', 'pre-review head is invalidated');
  assert(graph.edges.some(({ edgeType, toNodeRoot }) => edgeType === 'INVALIDATES' && toNodeRoot === successorHead.recordRoot), 'GRAPH-INVALIDATION-MAP-MISSING', 'successor invalidation map missing');
  return {
    expectedFamilyCount: expectedFamilies.length,
    invalidationEdgeCount: graph.edges.filter(({ edgeType }) => edgeType === 'INVALIDATES').length,
    ...reachability,
  };
}

export function evaluatePass4Mutations(graph, registry) {
  return createPass4Mutations(graph, registry).map(({ expectedTerminal, graph: mutation, mutation: name }) => {
    let observedTerminal = 'ACCEPT';
    try {
      validateCausalGraph(mutation, registry);
    } catch (error) {
      if (!(error instanceof Pass4ValidationError)) throw error;
      observedTerminal = error.terminal;
    }
    assert(observedTerminal === expectedTerminal, 'GRAPH-MUTATION-TERMINAL-MISMATCH', `${name}: ${observedTerminal}/${expectedTerminal}`);
    return { mutation: name, result: 'BLOCKED', terminal: observedTerminal };
  });
}

export function pass4Outcome(graph, registry, mutationOutcomes = evaluatePass4Mutations(graph, registry)) {
  const validation = validateCausalGraph(graph, registry);
  const body = {
    edgeCount: graph.edgeCount,
    expectedFamiliesRoot: rootV6('TRD2V6-PASS4-EXPECTED-FAMILY-SET', 'CONNECT-TRD2-V6-PASS4-EXPECTED-FAMILY-SET-V1', graph.expectedFamilies),
    graphRoot: graph.artifactRoot,
    invalidationEdgeCount: validation.invalidationEdgeCount,
    mutationOutcomes,
    nodeCount: graph.nodeCount,
    producedNodeCount: validation.producedCount,
    reachableProducedCount: validation.reachableProducedCount,
    typedGraphRoot: graph.typedGraphRoot,
  };
  return { ...body, outcomeRoot: rootV6('TRD2V6-PASS4-GRAPH-OUTCOME', 'CONNECT-TRD2-V6-PASS4-GRAPH-OUTCOME-V1', body) };
}

export function makePass4GraphReport({ engineId, graph, registry, sourceSha256 }) {
  const outcome = pass4Outcome(graph, registry);
  return attachForSchema(registry, GRAPH_REPORT_SCHEMA_ID, {
    edgeCount: graph.edgeCount,
    engineId,
    failureCount: 0,
    graphRoot: graph.artifactRoot,
    mutationCount: PASS4_MUTATION_EXPECTATIONS.length,
    nodeCount: graph.nodeCount,
    outcomeRoot: outcome.outcomeRoot,
    recordKind: 'GRAPH-REPORT-V3',
    schemaVersion: 'CONNECT-TRD2-V6-GRAPH-REPORT-V3',
    sourceSha256,
    status: 'PASS',
  });
}

export function validatePass4GraphReport(report, graph, registry) {
  validateV3Record(report, schemaFor(registry, GRAPH_REPORT_SCHEMA_ID), schemaMap(registry));
  const outcome = pass4Outcome(graph, registry);
  assert(report.graphRoot === graph.artifactRoot && report.nodeCount === graph.nodeCount && report.edgeCount === graph.edgeCount, 'GRAPH-REPORT-BINDING-MISMATCH', 'report graph/count binding');
  assert(report.mutationCount === PASS4_MUTATION_EXPECTATIONS.length && report.failureCount === 0 && report.status === 'PASS', 'GRAPH-REPORT-STATUS-MISMATCH', 'report status/mutations');
  assert(report.outcomeRoot === outcome.outcomeRoot, 'GRAPH-REPORT-OUTCOME-MISMATCH', 'report outcome root');
  return report;
}

export function validateOverlayPrerequisites(value) {
  const required = ['bindingRoot', 'graphRoot', 'packetRoot', 'preReviewHead', 'schemaRegistryRoot', 'subjectRoot', 'successorHead', 'vectorCorpusRoot'];
  const missing = required.filter((key) => value?.[key] === undefined || value[key] === null || value[key] === '');
  if (missing.length > 0) return { missing, status: 'BLOCKED', terminal: 'ROOT-OVERLAY-PREREQUISITES-MISSING' };
  exactKeys(value, required, 'ROOT-OVERLAY-KEY-MISMATCH', 'overlay prerequisites');
  for (const key of required) assert(SHA256_RE.test(value[key]), 'ROOT-OVERLAY-ROOT-FORMAT-INVALID', `${key}: root format`);
  assert(value.preReviewHead !== value.successorHead, 'ROOT-OVERLAY-SELF-INVALIDATION', 'pre-review and successor heads must differ');
  return { missing: [], status: 'READY', terminal: 'NONE' };
}

export function buildInvalidationBlueprint(graph, registry) {
  validateCausalGraph(graph, registry);
  const dependencyRoots = sortedStrings(new Set(graph.nodes.filter(({ status }) => status === 'PRODUCED').map(({ boundRoot }) => boundRoot)));
  return {
    dependencyRoots,
    excludedSelfHeadRole: 'PRE-REVIEW-HEAD',
    invalidatingEvents: ['DEPENDENCY-ADVANCED', 'DEPENDENCY-MISSING', 'DEPENDENCY-SUBSTITUTED'],
    safeTerminal: 'ROOT-OVERLAY-INVALIDATED',
    trackedHeadRole: 'SUCCESSOR-HEAD',
  };
}

export function validatePass4ToolchainRegistry(value, expectedPaths = TRD2_V6_PASS4_TOOLCHAIN_PATHS) {
  exactKeys(value, ['deferredNormativePaths', 'passFourEmittedPaths', 'schema', 'toolchainPaths', 'version'], 'PASS4-TOOLCHAIN-REGISTRY-SHAPE', 'Pass 4 toolchain registry');
  assert(value.schema === 'CONNECT-TRD2-V6-PASS4-TOOLCHAIN-PATH-REGISTRY-V1' && value.version === 1, 'PASS4-TOOLCHAIN-REGISTRY-IDENTITY', 'Pass 4 registry identity');
  assert(canonicalV6(value.passFourEmittedPaths) === canonicalV6(TRD2_V6_PASS4_OUTPUTS), 'PASS4-OUTPUT-BOUNDARY-MISMATCH', 'Pass 4 emitted paths');
  assert(canonicalV6(value.deferredNormativePaths) === canonicalV6(TRD2_V6_PASS4_DEFERRED_OUTPUTS), 'PASS4-DEFERRED-BOUNDARY-MISMATCH', 'Pass 4 deferred paths');
  assert(canonicalV6(value.toolchainPaths) === canonicalV6(expectedPaths), 'PASS4-TOOLCHAIN-PATH-MISMATCH', 'Pass 4 toolchain paths');
  const all = [...value.passFourEmittedPaths, ...value.deferredNormativePaths, ...value.toolchainPaths];
  all.forEach(assertRepoRelativePath);
  assert(new Set(value.toolchainPaths).size === value.toolchainPaths.length, 'PASS4-TOOLCHAIN-DUPLICATE-PATH', 'duplicate toolchain path');
  return value;
}

export function pass4ToolchainRoot(rows) {
  return rootV6('TRD2V6-PASS4-TOOLCHAIN', 'CONNECT-TRD2-V6-PASS4-TOOLCHAIN-V1', rows);
}

export function validateGraphArtifactIdentityOnly(graph, registry) {
  const schema = schemaFor(registry, CAUSAL_GRAPH_SCHEMA_ID);
  validateContentIdentity(graph, schema.contentIdentity.prefix, schema.contentIdentity.typeTag, schema.contentIdentity.schemaVersion, schema.contentIdentity.idKey, schema.contentIdentity.rootKey);
}
