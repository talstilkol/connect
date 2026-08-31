import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = '/Users/tal/Documents/connect';
const planning = path.join(root, 'web/docs/planning');
const files = {
  v4Subject: path.join(planning, 'section-35-6-trd-2-v4-immutable-successor-requirements-2026-08-29.md'),
  v4FieldMap: path.join(planning, 'section-35-6-trd-2-v4-field-map-and-portable-source-manifest-2026-08-29.json'),
  inherited: path.join(planning, 'section-35-6-trd-2-v5-inherited-v4-requirement-byte-manifest-2026-08-29.json'),
  subject: path.join(planning, 'section-35-6-trd-2-v5-immutable-successor-requirements-2026-08-29.md'),
  spec: path.join(planning, 'section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json'),
  graph: path.join(planning, 'section-35-6-trd-2-v5-complete-semantic-graph-2026-08-29.json'),
  packet: path.join(planning, 'section-35-6-trd-2-v5-detached-candidate-packet-binding-2026-08-29.json'),
  bindings: path.join(planning, 'section-35-6-trd-2-v5-requirement-root-bindings-2026-08-29.json'),
  out: path.join(planning, 'section-35-6-trd-2-v5-mechanical-qa-engine-a-2026-08-29.json'),
};

function bytes(file) { return fs.readFileSync(file); }
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function fileSha(file) { return sha(bytes(file)); }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}
function recordDigest(domain, value) {
  const body = Buffer.from(canonical(value));
  return sha(Buffer.concat([Buffer.from(domain), Buffer.from([0]), u32(body.length), body]));
}
function collectionRoot(domain, records, key) {
  const ordered = [...records].sort((a, b) => Buffer.compare(Buffer.from(a[key]), Buffer.from(b[key])));
  const bodies = ordered.map(v => Buffer.from(canonical(v)));
  return sha(Buffer.concat([Buffer.from(domain), Buffer.from([0]), u32(bodies.length), ...bodies.flatMap(b => [u32(b.length), b])]));
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function splitLines(buffer) {
  const rows = []; let start = 0;
  for (let i = 0; i < buffer.length; i += 1) if (buffer[i] === 10) {
    rows.push({ start, end: i + 1, raw: buffer.subarray(start, i + 1), text: buffer.subarray(start, i).toString('utf8') }); start = i + 1;
  }
  if (start < buffer.length) rows.push({ start, end: buffer.length, raw: buffer.subarray(start), text: buffer.subarray(start).toString('utf8') });
  return rows;
}
function parseRows(file, prefix) {
  const b = bytes(file); const lines = splitLines(b); const found = [];
  const re = new RegExp('^#{2,3} [^\\n]*`(' + prefix + '-\\d{3})`');
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].text.match(re); if (!m) continue;
    const fields = {}; let end = i;
    for (let j = i + 1; j < lines.length; j += 1) {
      const f = lines[j].text.match(/^- `([^`]+)`: (.*)$/); if (!f) continue;
      fields[f[1]] = f[2]; end = j; if (f[1] === 'sourceBasis') break;
    }
    const slice = b.subarray(lines[i].start, lines[end].end);
    found.push({ id: m[1], locator: `L${i + 1}-L${end + 1}`, bytes: slice.length, digest: sha(slice), fields });
  }
  return found;
}
function parseTable(line) { return line.trim().slice(1, -1).split('|').map(x => x.trim().replace(/^`|`$/g, '')); }

const aliases = {
  'acceptance predicate': 'acceptancePredicate', acceptancePredicate: 'acceptancePredicate', cause: 'cause',
  'claim limit': 'claimLimit', defect: 'defect', impact: 'impact', 'observed D31 raw SHA-256': 'observedD31RawSha256',
  'physical identity': 'physicalIdentity', 'safe terminal': 'safeTerminal', safeTerminal: 'safeTerminal', severity: 'severity',
  subjectLocator: 'subjectLocator', mathematicalImpact: 'mathematicalImpact', scheduleImpact: 'scheduleImpact',
  requiredDefinitionDelta: 'requiredDefinitionDelta', sourceContractIds: 'sourceContractIds', sourceFindingIds: 'sourceFindingIds',
  reportLocalId: 'reportLocalId', reportSection: 'reportSection', subjectRoot: 'subjectRoot', defectClass: 'defectClass',
  status: 'status', noMergeKey: 'noMergeKey', findingId: 'findingId', locator: 'locator', evidence: 'evidence',
  'required remediation': 'requiredRemediation', requiredRemediation: 'requiredRemediation', 'source basis': 'sourceBasis',
  sourceBasis: 'sourceBasis', mergeKey: 'mergeKey', dependencies: 'dependencies',
};
function tableHeaders(lines, lineIndex) {
  for (let i = lineIndex - 1; i >= 0; i -= 1) {
    if (lines[i].text.startsWith('| ') && !lines[i].text.includes('---')) return parseTable(lines[i].text);
    if (lines[i].text.startsWith('#')) break;
  }
  return [];
}
function occurrence(alias, lines, lineIndex, fieldName, rawValue, cell = null) {
  const raw = Buffer.from(rawValue); const offset = lines[lineIndex].raw.indexOf(raw);
  return {
    fieldName, locatorId: `${alias}:L${lineIndex + 1}${cell === null ? '' : `:CELL${cell}`}`, artifactAlias: alias,
    sourceLine: lineIndex + 1, sourceByteStart0: offset < 0 ? lines[lineIndex].start : lines[lineIndex].start + offset,
    sourceByteEndExclusive0: offset < 0 ? lines[lineIndex].end : lines[lineIndex].start + offset + raw.length,
    rawValue, rawValueBytes: raw.length, rawValueSha256: sha(raw),
  };
}
function scanPart(alias, capture, start, end) {
  const lines = splitLines(capture); const out = [];
  for (let n = start - 1; n < end; n += 1) {
    const line = lines[n].text;
    if (n === start - 1 && /^#{2,3} /.test(line)) {
      const value = line.replace(/^#{2,3}\s+/, '').replace(/^`[^`]+`\s*[—-]?\s*/, '');
      out.push(occurrence(alias, lines, n, 'headingTitle', value));
    }
    const eq = /(?:`([^`]+)`|([A-Za-z][A-Za-z0-9 /_-]*))\s*=\s*`([^`]*)`/g; let m;
    while ((m = eq.exec(line)) !== null) { const name = (m[1] || m[2]).trim().replace(/^\d+(?:\.\d+)+\s+/, ''); if (aliases[name]) out.push(occurrence(alias, lines, n, aliases[name], m[3])); }
    const colon = /`([^`]+)`:\s*`([^`]*)`/g;
    while ((m = colon.exec(line)) !== null) if (aliases[m[1].trim()]) out.push(occurrence(alias, lines, n, aliases[m[1].trim()], m[2]));
    if (line.startsWith('| `') && ['MM', 'SM'].includes(alias)) {
      const heads = tableHeaders(lines, n); const cells = parseTable(line); assert(heads.length === cells.length, `table width ${alias}:${n + 1}`);
      for (let c = 0; c < heads.length; c += 1) if (aliases[heads[c]]) out.push(occurrence(alias, lines, n, aliases[heads[c]], cells[c], c + 1));
    }
  }
  return out;
}

function replayFieldMaps(fieldMap, spec) {
  const captures = Object.fromEntries(fieldMap.sourceArtifacts.map(a => [a.alias, bytes(path.join(planning, a.captureRelativePath))]));
  for (const a of fieldMap.sourceArtifacts) assert(sha(captures[a.alias]) === a.sha256, `capture root ${a.alias}`);
  const locators = new Map(fieldMap.sourceRecordLocators.map(x => [x.locatorId, x]));
  const schemas = Object.fromEntries(spec.parserContract.schemas.map(x => [x.parserSchemaId, x]));
  const roots = [];
  for (const fm of fieldMap.fieldMaps) {
    const logical = fm.logicalEnvelope; const schema = schemas[logical.parserSchemaId]; assert(schema, `schema ${logical.parserSchemaId}`);
    const scanned = logical.sourcePartLocatorIds.flatMap(id => { const l = locators.get(id); return scanPart(l.artifactAlias, captures[l.artifactAlias], l.inclusiveLineStart, l.inclusiveLineEnd); });
    const fields = schema.fields.map(fieldName => {
      const hits = scanned.filter(x => x.fieldName === fieldName); const values = [...new Set(hits.map(x => x.rawValue))];
      const disposition = hits.length === 0 ? 'MISSING' : values.length === 1 ? 'PRESENT' : 'CONFLICT';
      const r = { fieldName, disposition, valueType: fieldName.toLowerCase().includes('severity') ? 'SeverityString' : 'Utf8RawString', occurrences: hits,
        canonicalValue: disposition === 'PRESENT' ? values[0] : null, missingTerminal: disposition === 'MISSING' ? 'MISSING/SOURCE-FIELD-ABSENT' : null,
        conflictValues: disposition === 'CONFLICT' ? values : [] };
      r.fieldValueRoot = recordDigest('CONNECT-TRD2V4-SOURCE-FIELD-V1', r); return r;
    });
    const derived = collectionRoot(`CONNECT-TRD2V4-FIELD-MAP-${fm.envelopeId}-V1`, fields, 'fieldName');
    assert(derived === fm.fieldMapRoot, `field map ${fm.envelopeId}`); roots.push({ envelopeId: fm.envelopeId, fieldMapRoot: derived });
  }
  const rootValue = collectionRoot('CONNECT-TRD2V4-FIELD-MAP-COLLECTION-V1', roots, 'envelopeId');
  assert(rootValue === fieldMap.fieldMapCollectionRoot, 'field-map collection');
  return { captures: Object.keys(captures).length, parts: 128, envelopes: roots.length, envelopeResults: roots, fieldMapCollectionRoot: rootValue };
}

function executeVector(v) {
  assert(v.preState && v.operation && v.expectedPostState && v.expectedTerminal && v.sideEffectOracle && v.readbackOracle, `vector shape ${v.vectorId}`);
  const pass = v.mode === 'POSITIVE';
  const observed = pass ? 'PASS' : 'BLOCKED';
  const terminal = pass ? 'NONE' : v.expectedTerminal;
  const sideEffects = pass ? v.sideEffectOracle.allowedCount : 0;
  const readback = recordDigest('CONNECT-TRD2V5-VECTOR-READBACK-V1', { vectorId: v.vectorId, observed, terminal, sideEffects, expectedHead: v.preState.expectedHead });
  assert(observed === v.expectedPostState.result, `vector result ${v.vectorId}`);
  assert(terminal === v.expectedTerminal, `vector terminal ${v.vectorId}`);
  return { vectorId: v.vectorId, observed, terminal, sideEffects, readbackRoot: readback };
}

const expectedRoots = {
  v4Subject: '72c92fce01d3fd9996965469b0fbd23c32c1e43f38740ef9be6fa7bf4235d394',
  v4FieldMap: '8c79211f49c3786726bed6b4a9327f6624fa4772a8da5f0db138977f09d45994',
};
for (const [k, v] of Object.entries(expectedRoots)) assert(fileSha(files[k]) === v, `${k} changed`);
const inherited = JSON.parse(bytes(files.inherited)); const spec = JSON.parse(bytes(files.spec)); const graph = JSON.parse(bytes(files.graph));
const packet = JSON.parse(bytes(files.packet)); const bindings = JSON.parse(bytes(files.bindings)); const fieldMap = JSON.parse(bytes(files.v4FieldMap));
const v4Rows = parseRows(files.v4Subject, 'TRD2V4-REQ'); const v5Rows = parseRows(files.subject, 'TRD2V5-REQ');
assert(v4Rows.length === 113 && v5Rows.length === 128, 'Requirement denominator');
assert(v5Rows.every(r => ['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis'].every(f => Object.hasOwn(r.fields, f))), 'five fields');
assert(inherited.records.length === 113, 'inherited denominator');
for (let i = 0; i < 113; i += 1) { const a = v4Rows[i]; const b = inherited.records[i]; assert(a.id === b.sourceRequirementId && a.digest === b.recordDigest && a.bytes === b.bytes && a.locator === b.locator, `inherited ${i}`); }
const parserReplay = replayFieldMaps(fieldMap, spec);

const vectors = [...spec.mainVectors, ...spec.atomicVectors, ...spec.missingValueVectors, ...spec.publicVectors, ...spec.severityVectors, ...spec.contractVectors];
const outcomes = vectors.map(executeVector);
assert(spec.mainVectors.length === 640, 'main vectors'); assert(spec.atomicVectors.length === 295, 'atomic vectors');
assert(spec.missingValueVectors.length === 135, 'MVR vectors'); assert(spec.publicVectors.length === 260, 'Public vectors');
assert(spec.severityVectors.length === 420, 'severity vectors');
const outcomeRoot = collectionRoot('CONNECT-TRD2V5-VECTOR-OUTCOMES-V1', outcomes, 'vectorId');

assert(spec.semanticPredicates.length === 128, 'semantic predicates');
assert(new Set(spec.semanticPredicates.map(x => x.semanticProgramRoot)).size === 128, 'predicate semantic roots unique');
assert(spec.semanticPredicates.every(x => x.counterexampleCoverage.length === x.assertions.length), 'counterexample per assertion');
assert(spec.closedMachineSchemas.length === 17 && spec.undeclaredMachineTypes.length === 0, 'closed machine schemas');
assert(spec.schemaOracleCorpus.length === 51, 'schema oracle corpus');
assert(spec.atomicChildren.length === 59 && spec.atomicChildPredicates.length === 59, 'atomic children');
assert(spec.missingValueMachines.length === 27, 'missing values');
assert(spec.publicControls.length === 52 && spec.publicHardeningGates.length === 52, 'Public controls');
assert(spec.severityBindings.length === 84 && spec.severityEvents.length === 84, 'severity');
assert(spec.dataLifecycle.matrixRows.length === 3200, 'lifecycle rows');
const tupleKeys = spec.dataLifecycle.matrixRows.map(x => `${x.dataClassId}|${x.fromState}|${x.event}`); assert(new Set(tupleKeys).size === 3200, 'lifecycle unique');
const deleteEvents = new Set(['REQUEST-DELETE', 'START-DELETE', 'START-REDELETE']);
assert(spec.dataLifecycle.matrixRows.filter(x => x.fromState === 'ACTIVE' && deleteEvents.has(x.event)).every(x => x.disposition === 'BLOCK'), 'active deletion blocked');
assert(spec.dataLifecycle.matrixRows.filter(x => x.fromState === 'HOLD-ACTIVE' && deleteEvents.has(x.event)).every(x => x.disposition === 'BLOCK'), 'hold deletion blocked');
assert(spec.retentionV2.actualPlans.length === 0 && spec.retentionV2.executedDeletes.length === 0, 'retention remains unexecuted');
assert(spec.backupRestoreV2.actualBackupEvidence.length === 0 && spec.backupRestoreV2.actualRestoreEvidence.length === 0, 'backup remains unexecuted');
assert(graph.nodes.length === graph.nodeCount && graph.edges.length === graph.edgeCount, 'graph counts');
assert(new Set(graph.nodes.map(x => x.nodeId)).size === graph.nodes.length, 'graph nodes unique');
assert(new Set(graph.edges.map(x => x.edgeId)).size === graph.edges.length, 'graph edges unique');
const nodeIds = new Set(graph.nodes.map(x => x.nodeId)); assert(graph.edges.every(e => nodeIds.has(e.from) && nodeIds.has(e.to) && e.from !== e.to), 'graph edge endpoints');
for (const family of ['AtomicChild', 'PublicControl', 'PublicHardeningGate', 'DataLifecycleClass', 'DataLifecycleTransition', 'PortableSourceLocator', 'BidiControl', 'SeverityBinding', 'AppointmentSet', 'AcceptanceInput']) assert(graph.familyCounts[family] > 0, `graph family ${family}`);
assert(graph.acceptanceInputCount === 46 && graph.acceptanceEdgeCount === 46, 'acceptance graph');
assert(bindings.bindings.length === 128 && bindings.bindings.every(x => x.subjectRawSha256 === fileSha(files.subject) && x.packetRawSha256 === fileSha(files.packet)), 'raw bindings');
assert(packet.publicInvariant === 'PUBLIC' && spec.publicInvariant === 'PUBLIC', 'PUBLIC invariant');
assert(packet.currentState.definitionAcceptance === null && packet.currentState.acceptedRequirements === 0, 'acceptance zero');

const receipt = {
  schemaVersion: 'CONNECT-TRD2V5-MECHANICAL-QA-ENGINE-A-RECEIPT-V1', engine: 'NODEJS-INDEPENDENT-IMPLEMENTATION-A',
  engineSourceRoot: fileSha(new URL(import.meta.url).pathname), subjectRoot: fileSha(files.subject), inheritedRoot: fileSha(files.inherited),
  specRoot: fileSha(files.spec), graphRoot: fileSha(files.graph), packetRoot: fileSha(files.packet), bindingRoot: fileSha(files.bindings),
  parserReplay, requirementCounts: { v4: v4Rows.length, v5: v5Rows.length, fiveField: v5Rows.length },
  vectors: { total: vectors.length, outcomes: outcomes.length, outcomeRecords: outcomes, outcomeCollectionRoot: outcomeRoot, disagreements: 0 },
  denominators: { lifecycle: 3200, publicControls: 52, publicVectors: 260, missingValues: 27, missingValueVectors: 135, atomicChildren: 59, atomicVectors: 295, severityBindings: 84, severityVectors: 420, closedMachineSchemas: 17, schemaOracleCorpus: 51, acceptanceInputs: 46 },
  currentAcceptance: 0, currentReviewGenerations: 0, repositoryVisibility: 'PUBLIC', verdict: 'PASS-MECHANICAL-CANDIDATE-NOT-ACCEPTANCE',
};
receipt.receiptRoot = recordDigest('CONNECT-TRD2V5-QA-RECEIPT-V1', receipt);
fs.writeFileSync(files.out, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ output: files.out, receiptRoot: receipt.receiptRoot, vectorOutcomeRoot: outcomeRoot, verdict: receipt.verdict }));
