import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const planning = '/Users/tal/Documents/connect/web/docs/planning';
const files = {
  inherited: path.join(planning, 'section-35-6-trd-2-v4-inherited-v3-requirement-byte-manifest-2026-08-29.json'),
  fieldMap: path.join(planning, 'section-35-6-trd-2-v4-field-map-and-portable-source-manifest-2026-08-29.json'),
  controls: path.join(planning, 'section-35-6-trd-2-v4-executable-closure-control-registries-2026-08-29.json'),
  subject: path.join(planning, 'section-35-6-trd-2-v4-immutable-successor-requirements-2026-08-29.md'),
  binding: path.join(planning, 'section-35-6-trd-2-v4-detached-candidate-packet-binding-2026-08-29.json'),
};
const expectedRoots = {
  inherited: 'a6fffd28d1d07a8fb1aba97c2ccbb2c6394e5d4f912043f7d5097e24d1fa24b5',
  fieldMap: '8c79211f49c3786726bed6b4a9327f6624fa4772a8da5f0db138977f09d45994',
  controls: 'a932972321fb9d93be9277f1b732d0e4eb35a38477e863cd03ceb5f9bfc9ffdf',
  subject: '72c92fce01d3fd9996965469b0fbd23c32c1e43f38740ef9be6fa7bf4235d394',
  binding: '30bfcf42bef95586592bf8f3d0ad8113dc2ac979117bfc05d6a0ad1cbb30405d',
};
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(file);
const json = file => JSON.parse(bytes(file).toString('utf8'));
function check(value, label) { if (!value) throw new Error(label); }
const results = [];
function qa(label, fn) { fn(); results.push({ label, result: 'PASS' }); }

const inherited = json(files.inherited);
const fieldMap = json(files.fieldMap);
const controls = json(files.controls);
const binding = json(files.binding);
const subjectText = bytes(files.subject).toString('utf8');

qa('raw roots', () => { for (const [k, root] of Object.entries(expectedRoots)) check(sha(bytes(files[k])) === root, `root ${k}`); });
qa('v3 one-to-one byte manifest', () => {
  check(inherited.records.length === 101 && new Set(inherited.records.map(r => r.manifestId)).size === 101, 'inherited denominator');
  const source = bytes(inherited.sourceArtifact.path); check(sha(source) === inherited.sourceArtifact.sha256, 'v3 source root');
  const lines = source.toString('utf8').split(/(?<=\n)/);
  for (const r of inherited.records) {
    const [a, b] = r.locator.match(/L(\d+)-L(\d+)/).slice(1).map(Number);
    const slice = Buffer.from(lines.slice(a - 1, b).join(''));
    check(slice.length === r.bytes && sha(slice) === r.recordDigest, `inherited ${r.manifestId}`);
    check(Object.keys(r.sourceFields).join(',') === 'statement,defectCauseImpact,proofPredicate,dependencies,sourceBasis', `inherited fields ${r.manifestId}`);
  }
});
qa('field maps and canonical observation envelope', () => {
  check(fieldMap.fieldMaps.length === 84 && fieldMap.sourcePartDenominator === 128 && fieldMap.inheritedV2LocatorDenominator === 85, 'field denominator');
  for (const map of fieldMap.fieldMaps) {
    const schema = fieldMap.parserSchemas.find(s => s.parserSchemaId === map.logicalEnvelope.parserSchemaId);
    check(schema && map.fields.length === schema.fields.length, `field schema ${map.envelopeId}`);
    check(new Set(map.fields.map(f => f.fieldName)).size === schema.fields.length, `field unique ${map.envelopeId}`);
    check(map.fields.every(f => ['PRESENT', 'MISSING', 'CONFLICT'].includes(f.disposition)), `field disposition ${map.envelopeId}`);
  }
  check(fieldMap.logicalObservationCollectionRoot.length === 64, 'observation oracle');
});
qa('portable captures and 213 locators', () => {
  const artifacts = new Map(fieldMap.sourceArtifacts.map(a => [a.artifactId, a]));
  check(fieldMap.sourceRecordLocators.length === 213, 'portable locators');
  for (const a of artifacts.values()) {
    const capture = path.join(planning, a.captureRelativePath);
    check(fs.existsSync(capture) && sha(bytes(capture)) === a.sha256 && bytes(capture).length === a.bytes, `capture ${a.alias}`);
  }
  for (const locator of fieldMap.sourceRecordLocators) {
    const a = artifacts.get(locator.sourceArtifactId); check(a, `locator source ${locator.locatorId}`);
    const capture = bytes(path.join(planning, locator.captureRelativePath));
    const ls = capture.toString('utf8').split(/(?<=\n)/);
    const slice = Buffer.from(ls.slice(locator.inclusiveLineStart - 1, locator.inclusiveLineEnd).join(''));
    check(slice.length === locator.bytes && sha(slice) === locator.sha256, `locator ${locator.locatorId}`);
  }
});
qa('Bidi exact preservation', () => {
  check(fieldMap.bidiRegistry.length === 13 && fieldMap.bidiRegistry.every(r => r.codePoint === 'U+200F'), 'bidi registry');
  let count = 0;
  const seen = new Set();
  for (const locator of fieldMap.sourceRecordLocators.slice(0, 128)) {
    const key = `${locator.sourceArtifactId}:${locator.inclusiveLineStart}:${locator.inclusiveLineEnd}:${locator.sha256}`;
    if (seen.has(key)) continue; seen.add(key);
    const capture = bytes(path.join(planning, locator.captureRelativePath));
    const ls = capture.toString('utf8').split(/(?<=\n)/);
    const slice = ls.slice(locator.inclusiveLineStart - 1, locator.inclusiveLineEnd).join('');
    for (const ch of slice) if (ch.codePointAt(0) === 0x200f) count += 1;
  }
  check(count === 13, `bidi source count ${count}`);
});
const subjectDependencyPairs = [];
qa('subject 113x5, sole output and backward dependencies', () => {
  const heads = [...subjectText.matchAll(/^## [^\n]*`(TRD2V4-REQ-\d{3})`/gm)];
  check(heads.length === 113 && new Set(heads.map(m => m[1])).size === 113, 'subject IDs');
  for (let i = 0; i < heads.length; i += 1) {
    check(heads[i][1] === `TRD2V4-REQ-${String(i).padStart(3, '0')}`, `subject sequence ${i}`);
    const start = heads[i].index; const end = i + 1 < heads.length ? heads[i + 1].index : subjectText.indexOf('\n# 4.', start);
    const block = subjectText.slice(start, end);
    const names = [...block.matchAll(/^- `([^`]+)`: /gm)].map(m => m[1]);
    check(names.join(',') === 'statement,defectCauseImpact,proofPredicate,dependencies,sourceBasis', `five fields ${i}`);
    check((block.match(/resultId=TRD2V4-RESULT-/g) || []).length === 1, `sole output ${i}`);
    const depLine = block.match(/^- `dependencies`: \[([^\]]*)\]/m)[1];
    for (const d of depLine.match(/TRD2V4-REQ-\d{3}/g) || []) {
      check(Number(d.slice(-3)) < i, `backward dependency ${i}->${d}`);
      subjectDependencyPairs.push(`${d}->${heads[i][1]}`);
    }
  }
});
qa('predicate, vector and result-schema closure', () => {
  check(controls.conformancePredicates.length === 113 && controls.testVectors.length === 565, 'predicate/vector count');
  check(new Set(controls.conformancePredicates.map(p => p.predicateId)).size === 113, 'predicate unique');
  check(controls.conformancePredicates.every(p => p.testVectorIds.length === 5 && p.currentResult === 'BLOCKED'), 'predicate envelopes');
  check(controls.resultSchemas.length === 13 && controls.resultReceiptInstances.length === 0 && controls.emptyResultReceiptSetMayPass === false, 'result schemas');
});
qa('typed graph shape, reachability and exact input edges', () => {
  const graph = controls.typedGraph; check(graph.nodes.length === graph.nodeCount && graph.edges.length === graph.edgeCount, 'graph counts');
  const nodes = new Map(graph.nodes.map(n => [n.nodeId, n]));
  check(nodes.size === graph.nodes.length, 'node unique');
  const edgeKeys = new Set(); const outgoing = new Map(); const indegree = new Map(graph.nodes.map(n => [n.nodeId, 0]));
  for (const e of graph.edges) {
    check(nodes.has(e.fromQualifiedId) && nodes.has(e.toQualifiedId) && e.fromQualifiedId !== e.toQualifiedId, `edge ${e.edgeId}`);
    const key = `${e.edgeType}|${e.fromQualifiedId}|${e.toQualifiedId}`; check(!edgeKeys.has(key), `edge duplicate ${key}`); edgeKeys.add(key);
    check(nodes.get(e.fromQualifiedId).rank < nodes.get(e.toQualifiedId).rank, `edge rank ${e.edgeId}`);
    (outgoing.get(e.fromQualifiedId) || outgoing.set(e.fromQualifiedId, []).get(e.fromQualifiedId)).push(e.toQualifiedId);
    indegree.set(e.toQualifiedId, indegree.get(e.toQualifiedId) + 1);
  }
  const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id); let visited = 0;
  while (queue.length) { const id = queue.shift(); visited += 1; for (const to of outgoing.get(id) || []) { indegree.set(to, indegree.get(to) - 1); if (indegree.get(to) === 0) queue.push(to); } }
  check(visited === graph.nodes.length, 'graph cycle');
  const reach = new Set(['EXT:FREEZE']); const stack = ['EXT:FREEZE'];
  while (stack.length) { const id = stack.pop(); for (const to of outgoing.get(id) || []) if (!reach.has(to)) { reach.add(to); stack.push(to); } }
  check([...nodes.keys()].filter(id => id.startsWith('REQ:')).every(id => reach.has(id)), 'freeze reach requirements');
  for (const p of controls.conformancePredicates) {
    const to = `PRED:${p.predicateId}`;
    const resultTo = `RESULT:${p.requirementId}`;
    for (const root of new Set([...p.inputSchemaRoots, ...p.inputArtifactRoots])) {
      check(graph.edges.some(e => e.edgeType === 'ValidationDependency' && e.toQualifiedId === to && e.sourceRoot === root), `input edge ${p.predicateId}:${root}`);
      check(graph.edges.some(e => e.edgeType === 'InvalidationEdge' && e.toQualifiedId === resultTo && e.sourceRoot === root), `invalidation edge ${p.predicateId}:${root}`);
    }
  }
  const typedDependencyPairs = graph.edges.filter(e => e.edgeType === 'ClosurePrerequisite').map(e => `${e.fromQualifiedId.slice(4)}->${e.toQualifiedId.slice(4)}`).sort();
  check(JSON.stringify(typedDependencyPairs) === JSON.stringify([...subjectDependencyPairs].sort()), 'typed dependency projection exact');
});
qa('non-vacuous AtomicClause and total DataLifecycle', () => {
  check(controls.atomicParents.length === 113 && controls.atomicDenominator.atomic === 101 && controls.atomicDenominator.compound === 12, 'atomic counts');
  check(controls.atomicParents.filter(p => p.classification === 'COMPOUND').every(p => p.mandatoryChildIds.length > 0), 'compound nonempty');
  const dl = controls.dataLifecycle;
  check(dl.matrixRows.length === dl.states.length * dl.events.length && dl.matrixRows.length === 320, 'lifecycle matrix');
  check(new Set(dl.matrixRows.map(r => `${r.fromState}|${r.event}`)).size === 320, 'lifecycle pairs');
  check(dl.admittedDenominator === 0 && dl.emptyDenominatorMayPass === false && dl.currentResult.startsWith('BLOCKED'), 'lifecycle external denominator');
});
qa('Public successor and no Private path', () => {
  check(controls.publicCyber.currentSuccessor.sha256 === '322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a', 'public root');
  check(controls.publicCyber.controls.length === 52 && controls.publicCyber.controls.every(c => c.vectorIds.length === 5 && c.privatePathCount === 0), 'public mappings');
  check(controls.publicInvariant === 'PUBLIC' && controls.privateRemediationAllowed === false, 'public invariant');
});
qa('detached packet and zero acceptance', () => {
  check(binding.requirementDenominator === 113 && binding.canonicalRequirementRecords.length === 113 && binding.findingToV4Crosswalk.length === 12 && binding.v3ToV4Crosswalk.length === 101, 'binding denominators');
  check(new Set(binding.findingToV4Crosswalk.map(r => r.findingId)).size === 12 && binding.findingToV4Crosswalk.every(r => r.disposition.includes('NO-MERGE') && r.disposition.includes('NO-CLOSURE-TRANSFER')), 'finding crosswalk');
  check(binding.mandatoryRoots.candidateRoot === expectedRoots.subject && binding.mandatoryRoots.controlRegistryRoot === expectedRoots.controls, 'binding roots');
  check(binding.externalPrerequisitesSatisfied === false && binding.actualResultReceipts.length === 0 && binding.actualReviewGenerations.length === 0 && binding.actualAcceptance === null, 'zero acceptance');
  check(controls.currentState.acceptedRequirements === 0 && controls.currentState.gate29 === 'BLOCKED' && controls.currentState.developmentFreeze === 'ACTIVE', 'safe terminal');
});

const output = {
  engineId: 'CONNECT-TRD2V4-MECHANICAL-QA-ENGINE-A-NODE-V1', implementation: 'Node.js independent read-only verifier',
  inputRoots: expectedRoots, verdict: 'PASS-MECHANICAL-CANDIDATE-NOT-ACCEPTANCE', checks: results,
  counters: { checks: results.length, requirements: 113, inheritedV3: 101, observations: 84, sourceParts: 128, v2Locators: 85, bidiU200F: 13, predicates: 113, vectors: 565, graphNodes: controls.typedGraph.nodeCount, graphEdges: controls.typedGraph.edgeCount, atomicChildren: controls.atomicChildren.length, lifecycleRows: controls.dataLifecycle.matrixRows.length, publicControls: 52, accepted: 0 },
  externalBlockers: ['B0', 'accepted Protocol', 'accepted Source Universe', 'Authority/Freeze', 'appointments', 'evaluator', 'runner A', 'runner B', 'two review generations', 'Reconciliation', 'Definition Acceptance'],
  publicInvariant: 'PUBLIC', privateRemediationAllowed: false,
};
const out = path.join(planning, 'section-35-6-trd-2-v4-mechanical-qa-engine-a-2026-08-29.json');
fs.writeFileSync(out, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output: out, sha256: sha(bytes(out)), bytes: bytes(out).length, lines: bytes(out).toString('utf8').split('\n').length - 1, verdict: output.verdict }, null, 2));
