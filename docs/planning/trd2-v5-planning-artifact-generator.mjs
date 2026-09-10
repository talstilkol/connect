import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = '/Users/tal/Documents/connect';
const planning = path.join(root, 'web/docs/planning');
const P = {
  v4Subject: path.join(planning, 'section-35-6-trd-2-v4-immutable-successor-requirements-2026-08-29.md'),
  v4Inherited: path.join(planning, 'section-35-6-trd-2-v4-inherited-v3-requirement-byte-manifest-2026-08-29.json'),
  v4FieldMap: path.join(planning, 'section-35-6-trd-2-v4-field-map-and-portable-source-manifest-2026-08-29.json'),
  v4Controls: path.join(planning, 'section-35-6-trd-2-v4-executable-closure-control-registries-2026-08-29.json'),
  v4Packet: path.join(planning, 'section-35-6-trd-2-v4-detached-candidate-packet-binding-2026-08-29.json'),
  v4Review: path.join(planning, 'section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-2026-08-29.md'),
  v4Findings: path.join(planning, 'section-35-6-trd-2-v4-immutable-successor-requirements-independent-hostile-review-findings-manifest-2026-08-29.md'),
  publicCyber: path.join(planning, 'public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md'),
  engineA: path.join(planning, 'trd2-v5-mechanical-qa-engine-a.mjs'),
  engineB: path.join(planning, 'trd2-v5-mechanical-qa-engine-b.py'),
};
const EXPECTED = {
  v4Subject: '72c92fce01d3fd9996965469b0fbd23c32c1e43f38740ef9be6fa7bf4235d394',
  v4Inherited: 'a6fffd28d1d07a8fb1aba97c2ccbb2c6394e5d4f912043f7d5097e24d1fa24b5',
  v4FieldMap: '8c79211f49c3786726bed6b4a9327f6624fa4772a8da5f0db138977f09d45994',
  v4Controls: 'a932972321fb9d93be9277f1b732d0e4eb35a38477e863cd03ceb5f9bfc9ffdf',
  v4Packet: '30bfcf42bef95586592bf8f3d0ad8113dc2ac979117bfc05d6a0ad1cbb30405d',
  v4Review: 'cda2c96e1c0e699a237f6b3216ac9307d522829db245a390d8ce7734c9f5c00f',
  v4Findings: '0acdc6c8fd5e53875d779fb1b557fd6dc5a09d194fd2fbd2eb282ec8a29dc4ae',
  publicCyber: '322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a',
};
const O = {
  inherited: path.join(planning, 'section-35-6-trd-2-v5-inherited-v4-requirement-byte-manifest-2026-08-29.json'),
  subject: path.join(planning, 'section-35-6-trd-2-v5-immutable-successor-requirements-2026-08-29.md'),
  spec: path.join(planning, 'section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json'),
  graph: path.join(planning, 'section-35-6-trd-2-v5-complete-semantic-graph-2026-08-29.json'),
  packet: path.join(planning, 'section-35-6-trd-2-v5-detached-candidate-packet-binding-2026-08-29.json'),
  bindings: path.join(planning, 'section-35-6-trd-2-v5-requirement-root-bindings-2026-08-29.json'),
  subjectCapture: path.join(planning, 'section-35-6-trd-2-v5-portable-candidate-capture-2026-08-29.bin'),
  reconciliation: path.join(planning, 'section-35-6-trd-2-v5-dual-qa-reconciliation-2026-08-29.json'),
  producerQa: path.join(planning, 'section-35-6-trd-2-v5-immutable-successor-requirements-producer-qa-2026-08-29.md'),
  support: path.join(planning, 'section-35-6-trd-2-v5-support-manifests-2026-08-29.md'),
  qaA: path.join(planning, 'section-35-6-trd-2-v5-mechanical-qa-engine-a-2026-08-29.json'),
  qaB: path.join(planning, 'section-35-6-trd-2-v5-mechanical-qa-engine-b-2026-08-29.json'),
};

function bytes(file) { return fs.readFileSync(file); }
function text(file) { return bytes(file).toString('utf8'); }
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function fileSha(file) { return sha(bytes(file)); }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}
function recordDigest(domain, value) { const body = Buffer.from(canonical(value)); return sha(Buffer.concat([Buffer.from(domain), Buffer.from([0]), u32(body.length), body])); }
function collectionRoot(domain, records, key) {
  const ordered = [...records].sort((a, b) => Buffer.compare(Buffer.from(a[key]), Buffer.from(b[key])));
  const bodies = ordered.map(v => Buffer.from(canonical(v)));
  return sha(Buffer.concat([Buffer.from(domain), Buffer.from([0]), u32(bodies.length), ...bodies.flatMap(b => [u32(b.length), b])]));
}
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function physical(file) { const b = bytes(file); return { sha256: sha(b), bytes: b.length, lines: b.toString('utf8').split('\n').length - 1 }; }
function assert(value, message) { if (!value) throw new Error(message); }
function splitLines(buffer) {
  const out = []; let start = 0;
  for (let i = 0; i < buffer.length; i += 1) if (buffer[i] === 10) { out.push({ start, end: i + 1, text: buffer.subarray(start, i).toString('utf8') }); start = i + 1; }
  if (start < buffer.length) out.push({ start, end: buffer.length, text: buffer.subarray(start).toString('utf8') });
  return out;
}
function parseRequirements(file, prefix) {
  const b = bytes(file); const lines = splitLines(b); const rows = []; const re = new RegExp('^#{2,3} [^\\n]*`(' + prefix + '-\\d{3})`');
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].text.match(re); if (!m) continue;
    const fields = {}; let end = i;
    for (let j = i + 1; j < lines.length; j += 1) {
      const f = lines[j].text.match(/^- `([^`]+)`: (.*)$/); if (!f) continue;
      fields[f[1]] = f[2]; end = j; if (f[1] === 'sourceBasis') break;
    }
    const slice = b.subarray(lines[i].start, lines[end].end);
    rows.push({ id: m[1], locator: `L${i + 1}-L${end + 1}`, bytes: slice.length, digest: sha(slice), fields });
  }
  return rows;
}
for (const [name, expected] of Object.entries(EXPECTED)) assert(fileSha(P[name]) === expected, `${name} root mismatch`);

const v4 = parseRequirements(P.v4Subject, 'TRD2V4-REQ');
assert(v4.length === 113, `v4 Requirements ${v4.length}`);
const fieldNames = ['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis'];
assert(v4.every(r => fieldNames.every(f => Object.hasOwn(r.fields, f))), 'v4 five-field shape');
const inheritedRows = v4.map((r, i) => ({
  manifestId: `V4R-${String(i).padStart(3, '0')}`, sourceRequirementId: r.id, locator: r.locator, bytes: r.bytes,
  recordDigest: r.digest, exactFieldOrder: fieldNames, sourceFields: r.fields, status: 'PRESERVED-NOT-ACCEPTED', closureTransferred: 0,
}));
const inheritedCollectionRoot = collectionRoot('CONNECT-TRD2V5-INHERITED-V4-REQUIREMENTS-V1', inheritedRows, 'manifestId');
writeJson(O.inherited, {
  schemaVersion: 'CONNECT-TRD2V5-INHERITED-V4-BYTE-MANIFEST-V1', artifactClass: 'PLANNING-ONLY; BYTE-EXACT; NOT-ACCEPTANCE',
  sourceArtifact: { pathAdvisoryOnly: P.v4Subject, contentAddress: `sha256:${EXPECTED.v4Subject}`, ...physical(P.v4Subject) },
  recordSliceContract: 'heading-through-sourceBasis-inclusive-terminal-LF; no following blank line', exactFieldOrder: fieldNames,
  denominator: 113, records: inheritedRows, recordCollectionRoot: inheritedCollectionRoot,
  preservation: { missing: 0, duplicate: 0, merged: 0, suppressed: 0, closureTransferred: 0, accepted: 0 },
  publicInvariant: 'PUBLIC', privateRemediationAllowed: false,
});

const findingDefs = [
  ['TRD2V4-IHR-F001', 'executable dual-parser and Field-map contract', 'ParserFieldMapExecutionResult', 'SOURCE-FIELD-MAP-BLOCKED', 'derive 84 identical typed Field maps from 8 captures and 128 parts with two independent parser implementations and exact ambiguity/error terminals'],
  ['TRD2V4-IHR-F002', 'closed canonical schema, type and root oracle', 'CanonicalSchemaOracleResult', 'CANONICAL-ROOT-ORACLE-BLOCKED', 'prove every referenced type is declared and both schema engines agree over exact positive and mutation corpora'],
  ['TRD2V4-IHR-F003', 'complete typed semantic graph and Acceptance subgraph', 'CompleteSemanticGraphResult', 'TYPED-SEMANTIC-GRAPH-BLOCKED', 'prove every member family and all 46 Acceptance roots are typed, reachable and mutation-sensitive'],
  ['TRD2V4-IHR-F004', 'Requirement-specific semantic predicate programs', 'SemanticPredicateExecutionResult', 'PREDICATE-PROGRAM-BLOCKED', 'prove 128 Requirement-specific programs check actual clauses and reject a counterexample for every clause'],
  ['TRD2V4-IHR-F005', 'fully executable real-root vector corpus', 'ExecutableVectorCorpusResult', 'VECTOR-CORPUS-BLOCKED', 'execute exact rooted pre-state operation post-state terminal side-effect and readback oracles in two independent runners'],
  ['TRD2V4-IHR-F006', 'complete invalidation, freshness and fenced snapshot binding', 'FreshnessInvalidationResult', 'VALIDATION-RESULT-STALE', 'prove every mutable head and raw Candidate/packet binding invalidates stale receipts under CAS, replay and split-head attacks'],
  ['TRD2V4-IHR-F007', 'atomic generation, reconciliation and Acceptance operations', 'AtomicReviewAcceptanceResult', 'REVIEW-ACCEPTANCE-BLOCKED', 'prove separate CAS/fenced operations preserve two-generation isolation, lossless noMergeKey union and all-or-nothing Acceptance'],
  ['TRD2V4-IHR-F008', 'executable MissingValue transition machines and 135 vectors', 'MissingValueTransitionResult', 'SOURCE-REFERENCE-INVALID', 'prove 27 machines enforce authorized versioned transitions and every legal/illegal/race/replay/revoke path'],
  ['TRD2V4-IHR-F009', 'executable atomic-child closure and 295 vectors', 'AtomicChildClosureResult', 'ATOMIC-CLOSURE-BLOCKED', 'prove every one of 59 children has its own semantic program, five vectors and independent receipt before parent credit'],
  ['TRD2V4-IHR-F010', 'class-specific total DataLifecycle matrix', 'ClassSpecificLifecycleResult', 'DATA-LIFECYCLE-BLOCKED', 'prove all 10×16×20=3200 class/state/event tuples have one explicit disposition and active or held deletion always blocks'],
  ['TRD2V4-IHR-F011', 'Retention Plan v2 atomic deletion safety', 'RetentionPlanV2Result', 'RETENTION-DELETE-BLOCKED', 'prove short-lived plan identity/digest/policy/cutoff/exact provider-confirmed set and fenced atomic deletion never exceed authorization'],
  ['TRD2V4-IHR-F012', 'Backup and Restore Evidence v2 lineage', 'BackupRestoreEvidenceV2Result', 'RESTORE-PRIVACY-REPLAY-BLOCKED', 'prove source, backup and restore identities remain distinct and exact backupId/digests/R2/window/privacy replay bind every restore'],
  ['TRD2V4-IHR-F013', '52 executable Public hardening gates and 260 vectors', 'PublicHardeningGateResult', 'PUBLIC-HARDENING-BLOCKED', 'prove every Public control has five exact vectors, one state machine and disclosure-safe independent evidence while Private paths stay zero'],
  ['TRD2V4-IHR-F014', 'append-only severity history and conditional escalation', 'SeverityTransitionResult', 'SEVERITY-TRANSITION-BLOCKED', 'prove 84 genesis histories and authorized CAS transitions, including SOE-050 first accepted reachability escalation'],
  ['TRD2V4-IHR-F015', 'portable Candidate acquisition and detached raw-root binding', 'PortableCandidateAcquisitionResult', 'PORTABLE-PACKET-BLOCKED', 'prove a clean host acquires exact Candidate bytes by content address and all 128 Requirements bind raw Subject and packet roots'],
].map((x, i) => ({ ordinal: i, findingId: x[0], title: x[1], outputType: x[2], terminal: x[3], obligation: x[4] }));

function reqId(i) { return `TRD2V5-REQ-${String(i).padStart(3, '0')}`; }
const v5ByV4 = new Map(v4.map((r, i) => [r.id, reqId(15 + i)]));
const blueprints = findingDefs.map(f => ({
  requirementId: reqId(f.ordinal), title: f.title, outputType: f.outputType, sourceKind: 'V4-HOSTILE-FINDING', sourceId: f.findingId,
  dependencies: [...Array(f.ordinal).keys()].map(reqId), failureTerminal: f.terminal,
  statement: `require exactly one ${f.outputType} with resultId=TRD2V5-RESULT-${String(f.ordinal).padStart(3, '0')} proving ${f.obligation}`,
  defectCauseImpact: `v4 hostile review ${f.findingId} proved the prior contract could satisfy shape or count checks without the required semantics; ${f.terminal} is mandatory until this exact program and its independent receipts pass`,
  sourceBasis: `v4SubjectRoot=${EXPECTED.v4Subject};v4ReviewRoot=${EXPECTED.v4Review};v4FindingsRoot=${EXPECTED.v4Findings}#${f.findingId};noMergeKey=${f.findingId};producerClosureCredit=0`,
}));
for (let i = 0; i < v4.length; i += 1) {
  const source = v4[i]; const sourceDeps = [...source.fields.dependencies.matchAll(/TRD2V4-REQ-\d{3}/g)].map(m => m[0]);
  blueprints.push({
    requirementId: reqId(15 + i), title: `byte-exact preservation and semantic replay of ${source.id}`,
    outputType: 'InheritedV4RequirementReplayResult', sourceKind: 'INHERITED-V4-REQUIREMENT', sourceId: source.id,
    dependencies: [...findingDefs.map(f => reqId(f.ordinal)), ...sourceDeps.map(id => v5ByV4.get(id))],
    failureTerminal: 'INHERITED-V4-REQUIREMENT-REPLAY-BLOCKED',
    statement: `require exactly one InheritedV4RequirementReplayResult with resultId=TRD2V5-RESULT-${String(15 + i).padStart(3, '0')} proving byte-exact preservation of ${source.id} through V4R-${String(i).padStart(3, '0')} plus execution of its statement-specific predicate and five real-root vectors`,
    defectCauseImpact: `a byte mismatch, omitted inherited clause, shared-credit result, stale binding or label-only replay would silently lose v4 semantics; any such mismatch blocks this result and transfers zero closure`,
    sourceBasis: `v4SubjectRoot=${EXPECTED.v4Subject};inheritedV4ManifestRoot=${fileSha(O.inherited)}#V4R-${String(i).padStart(3, '0')};recordDigest=${source.digest};closureTransferred=0`,
  });
}
assert(blueprints.length === 128, 'v5 blueprint denominator');

const v4FieldMap = JSON.parse(text(P.v4FieldMap));
const v4Controls = JSON.parse(text(P.v4Controls));
const parserGrammar = {
  schemaVersion: 'CONNECT-TRD2V5-CLOSED-MARKDOWN-PARSER-GRAMMAR-V1',
  byteProfile: 'UTF-8; BOM-FORBIDDEN; CR-FORBIDDEN; LF=0x0A; NO-UNICODE-NORMALIZATION; BIDI-BYTES-PRESERVED',
  lexicalRules: [
    'DIGIT = %x30-39', 'BACKTICK = %x60', 'LF = %x0A', 'H2 = %x23.23.20', 'H3 = %x23.23.23.20',
    'ID = 1*(ALPHA / DIGIT / %x2D)', 'BACKTICK_VALUE = *UTF8-SCALAR-EXCEPT-BACKTICK-LF',
    'HEADING = (H2 / H3) *UTF8-SCALAR BACKTICK ID BACKTICK *UTF8-SCALAR LF',
    'EQ_FIELD = [BACKTICK] LABEL [BACKTICK] *SP %x3D *SP BACKTICK BACKTICK_VALUE BACKTICK',
    'COLON_FIELD = BACKTICK LABEL BACKTICK %x3A *SP BACKTICK BACKTICK_VALUE BACKTICK',
    'TABLE_ROW = %x7C SP 1*(TABLE_CELL %x7C); TABLE_CELL preserves decoded bytes after outer SP and one optional outer BACKTICK pair',
  ],
  matchPrecedence: ['HEADING-ONLY-AT-FIRST-LINE-OF-BOUND-PART', 'EQ_FIELD-LEFT-TO-RIGHT', 'COLON_FIELD-LEFT-TO-RIGHT', 'TABLE_ROW-ONLY-MM-OR-SM'],
  fieldAliasTable: {
    'acceptance predicate': 'acceptancePredicate', acceptancePredicate: 'acceptancePredicate', cause: 'cause', 'claim limit': 'claimLimit',
    defect: 'defect', impact: 'impact', 'observed D31 raw SHA-256': 'observedD31RawSha256', 'physical identity': 'physicalIdentity',
    'safe terminal': 'safeTerminal', safeTerminal: 'safeTerminal', severity: 'severity', subjectLocator: 'subjectLocator',
    mathematicalImpact: 'mathematicalImpact', scheduleImpact: 'scheduleImpact', requiredDefinitionDelta: 'requiredDefinitionDelta',
    sourceContractIds: 'sourceContractIds', sourceFindingIds: 'sourceFindingIds', reportLocalId: 'reportLocalId', reportSection: 'reportSection',
    subjectRoot: 'subjectRoot', defectClass: 'defectClass', status: 'status', noMergeKey: 'noMergeKey', findingId: 'findingId',
    locator: 'locator', evidence: 'evidence', 'required remediation': 'requiredRemediation', requiredRemediation: 'requiredRemediation',
    'source basis': 'sourceBasis', sourceBasis: 'sourceBasis', mergeKey: 'mergeKey', dependencies: 'dependencies',
  },
  resultRules: {
    occurrenceOrder: 'artifactAlias UTF-8 bytes, sourceLine UInt ascending, sourceByteStart0 ascending, fieldName UTF-8 bytes',
    disposition: 'zero occurrences=MISSING; one distinct raw byte value=PRESENT; more than one distinct raw byte value=CONFLICT',
    canonicalValue: 'PRESENT returns sole raw UTF-8 value; otherwise Null', missingTerminal: 'MISSING/SOURCE-FIELD-ABSENT',
    duplicateOccurrence: 'PRESERVE; never deduplicate occurrence records', unknownField: 'IGNORE-NON-ALIASED-SOURCE-TOKEN',
  },
  errors: {
    invalidUtf8: 'PARSER-INVALID-UTF8', bom: 'PARSER-BOM-FORBIDDEN', cr: 'PARSER-CR-FORBIDDEN', duplicateDeclaredSchemaField: 'PARSER-DUPLICATE-SCHEMA-FIELD',
    wrongOffset: 'PARSER-OFFSET-MISMATCH', normalizedBytes: 'PARSER-NORMALIZATION-FORBIDDEN', bidiReordered: 'PARSER-BIDI-REORDERED',
    missingCapture: 'PARSER-CAPTURE-MISSING', wrongCaptureRoot: 'PARSER-CAPTURE-ROOT-MISMATCH', ambiguousGrammar: 'PARSER-GRAMMAR-AMBIGUOUS',
  },
};
parserGrammar.grammarRoot = recordDigest('CONNECT-TRD2V5-PARSER-GRAMMAR-V1', parserGrammar);
const parserSchemas = v4FieldMap.parserSchemas.map(s => ({
  parserSchemaId: s.parserSchemaId, family: s.family, fields: s.fields, grammarRoot: parserGrammar.grammarRoot,
  exactFieldDenominator: s.fields.length, additionalFields: 'IGNORE-AS-UNALIASED-SOURCE-TOKEN', duplicateDeclaredField: 'REJECT',
}));
for (const s of parserSchemas) s.schemaRoot = recordDigest('CONNECT-TRD2V5-PARSER-SCHEMA-V1', s);

const canonicalSchema = {
  schemaVersion: 'CONNECT-CANONICAL-JSON-V1', mediaType: 'application/connect-canonical+json; charset=utf-8',
  encoding: { utf8: 'STRICT-SHORTEST-FORM', bom: 'FORBIDDEN', normalization: 'NONE', terminalLfInHashedBody: false },
  values: ['Null', 'Boolean', 'SafeInteger', 'Utf8RawString', 'Array', 'Object'],
  string: 'JSON double-quoted; escape quotation mark, reverse-solidus and U+0000..U+001F; preserve all other Unicode scalar UTF-8 bytes; lone surrogate forbidden',
  integer: 'base-10; range -9007199254740991..9007199254740991; no plus sign; no leading zero except zero; negative zero forbidden',
  float: 'FORBIDDEN', object: 'keys unique by raw Unicode scalar sequence; order unsigned UTF-8 byte lexicographic ascending',
  array: 'order significant; no implicit set semantics', set: 'represented as array sorted by member canonical bytes; duplicates forbidden; schema must declare Set<T>',
  domainConstructor: 'SHA-256(domain UTF-8 || 0x00 || uint32be(bodyByteLength) || canonicalBodyBytes)',
  collectionConstructor: 'SHA-256(domain UTF-8 || 0x00 || uint32be(count) || repeated(uint32be(recordByteLength)||canonicalRecordBytes)); records sorted by declared key unsigned UTF-8 bytes',
  errors: ['CANONICAL-INVALID-UTF8', 'CANONICAL-BOM-FORBIDDEN', 'CANONICAL-DUPLICATE-KEY', 'CANONICAL-UNKNOWN-KEY', 'CANONICAL-TYPE-MISMATCH', 'CANONICAL-FLOAT-FORBIDDEN', 'CANONICAL-INTEGER-RANGE', 'CANONICAL-LONE-SURROGATE', 'CANONICAL-SET-DUPLICATE', 'CANONICAL-SET-ORDER'],
  declaredTypes: {
    Null: 'literal null', Boolean: 'literal true|false', SafeInteger: 'integer profile above', UInt64Safe: 'SafeInteger 0..9007199254740991',
    Utf8RawString: 'string profile above', Bytes32LowerHex: '64 lowercase hexadecimal characters', RootBinding: 'object{artifactId:Utf8RawString,rawSha256:Bytes32LowerHex}',
    'Array<T>': 'ordered array of declared T', 'Set<T>': 'canonical-byte sorted unique array of declared T',
    Receipt: 'closed object conforming to named receipt schema', TransitionReceipt: 'Receipt with priorHead,newHead,operationId,fenceToken,commitIndex',
    'TransitionReceiptSet': 'Set<TransitionReceipt>', TimestampUtc: 'RFC3339 UTC second precision YYYY-MM-DDTHH:MM:SSZ; trusted-time receipt required',
    PredicateAst: 'closed discriminated object defined by semanticProgramSchema', TestVector: 'closed object defined by executableVectorSchema',
  },
};
canonicalSchema.schemaRoot = recordDigest('CONNECT-CANONICAL-JSON-SCHEMA-V1', canonicalSchema);
const canonicalCorpus = [
  { corpusId: 'CJ-P01', input: null, expectedCanonicalHex: Buffer.from('null').toString('hex'), accepted: true },
  { corpusId: 'CJ-P02', input: { b: 2, a: 1 }, expectedCanonicalHex: Buffer.from('{"a":1,"b":2}').toString('hex'), accepted: true },
  { corpusId: 'CJ-P03', input: ['\u200f', 0, true, false], expectedCanonicalHex: Buffer.from('["\u200f",0,true,false]').toString('hex'), accepted: true },
  { corpusId: 'CJ-N01', encodedMutation: '7b2261223a312c2261223a327d', error: 'CANONICAL-DUPLICATE-KEY', accepted: false },
  { corpusId: 'CJ-N02', encodedMutation: 'efbbbf7b7d', error: 'CANONICAL-BOM-FORBIDDEN', accepted: false },
  { corpusId: 'CJ-N03', encodedMutation: Buffer.from('{"a":1.5}').toString('hex'), error: 'CANONICAL-FLOAT-FORBIDDEN', accepted: false },
  { corpusId: 'CJ-N04', encodedMutation: Buffer.from('{"a":9007199254740992}').toString('hex'), error: 'CANONICAL-INTEGER-RANGE', accepted: false },
  { corpusId: 'CJ-N05', encodedMutation: Buffer.from('{"unknown":1}').toString('hex'), error: 'CANONICAL-UNKNOWN-KEY', accepted: false },
];
for (const c of canonicalCorpus) c.corpusRoot = recordDigest('CONNECT-TRD2V5-CANONICAL-CORPUS-V1', c);

const vectorModes = ['POSITIVE', 'NEGATIVE', 'FAILURE', 'CONCURRENCY', 'RECOVERY'];
const zeroRoot = '0'.repeat(64);
function exactVector({ vectorId, family, targetId, mode, baseRoot, pointer, failureTerminal, expectedHead = baseRoot }) {
  const pass = mode === 'POSITIVE';
  const operations = {
    POSITIVE: { opcode: 'VERIFY-EXACT-BOUND-STATE', jsonPointer: pointer, expectedValueRoot: baseRoot, suppliedValueRoot: baseRoot },
    NEGATIVE: { opcode: 'REPLACE-BOUND-VALUE', jsonPointer: pointer, expectedValueRoot: baseRoot, suppliedValueRoot: zeroRoot },
    FAILURE: { opcode: 'REMOVE-REQUIRED-FIELD', jsonPointer: `${pointer}/evidenceRoot`, removedField: 'evidenceRoot' },
    CONCURRENCY: { opcode: 'CAS-TWO-WRITERS', expectedHead, writerOneValueRoot: recordDigest('CONNECT-TRD2V5-WRITER-ONE-V1', { targetId }), writerTwoValueRoot: recordDigest('CONNECT-TRD2V5-WRITER-TWO-V1', { targetId }), permittedWinnerCount: 1 },
    RECOVERY: { opcode: 'CRASH-AFTER-PREPARE-BEFORE-COMMIT', expectedHead, recoveryRule: 'READ-HEAD-THEN-IDEMPOTENT-RETRY; ZERO-OR-ONE-COMPLETE-COMMIT' },
  };
  const v = {
    vectorId, schemaVersion: 'CONNECT-TRD2V5-EXECUTABLE-VECTOR-V1', family, targetId, mode,
    inputRoots: [{ artifactRole: 'EXACT-BASE', rawSha256: baseRoot }, { artifactRole: 'V4-SUBJECT', rawSha256: EXPECTED.v4Subject }, { artifactRole: 'V4-PACKET', rawSha256: EXPECTED.v4Packet }],
    preState: { expectedHead, targetPointer: pointer, expectedValueRoot: baseRoot, fenceToken: `FENCE:${targetId}:0`, commitIndex: 0 },
    operation: operations[mode],
    expectedPostState: { result: pass ? 'PASS' : 'BLOCKED', durableHead: pass ? expectedHead : expectedHead, committedWriterCount: pass ? 1 : 0 },
    expectedTerminal: pass ? 'NONE' : failureTerminal,
    sideEffectOracle: { allowedCount: pass ? 1 : 0, forbiddenEffects: ['UNAUTHORIZED-WRITE', 'UNAUTHORIZED-DELETE', 'PRIVATE-REPOSITORY-PATH', 'SECRET-OR-PII-EMISSION'] },
    readbackOracle: { reads: 2, bothMustEqualHead: expectedHead, mismatchTerminal: failureTerminal },
    realFixture: { kind: 'FROZEN-PLANNING-ARTIFACT-ROOT', root: baseRoot, noBusinessOrPersonalData: true }, deterministic: true,
  };
  v.vectorRoot = recordDigest('CONNECT-TRD2V5-EXECUTABLE-VECTOR-V1', v); return v;
}

function correctionAssertions(index) {
  const exact = [
    [{ op: 'PARSER-DUAL-DERIVATION-EQ', captures: 8, parts: 128, envelopes: 84 }, { op: 'PARSER-NEGATIVE-CORPUS-PASS', classes: ['AMBIGUITY', 'UNKNOWN-FIELD', 'DUPLICATE-FIELD', 'NORMALIZATION', 'WRONG-OFFSET', 'BIDI-REORDER'] }],
    [{ op: 'UNDECLARED-TYPE-COUNT-EQ', expected: 0 }, { op: 'CANONICAL-CORPUS-TWO-ENGINE-EQ', corpus: canonicalCorpus.map(c => c.corpusId) }],
    [{ op: 'GRAPH-MANDATORY-FAMILY-COVERAGE', expectedFamilies: ['AtomicChild', 'PublicControl', 'PublicHardeningGate', 'DataLifecycleClass', 'DataLifecycleTransition', 'PortableSourceLocator', 'BidiControl', 'SeverityBinding', 'AppointmentSet'] }, { op: 'ACCEPTANCE-INPUT-EDGE-COUNT-EQ', expected: 46 }],
    [{ op: 'SEMANTIC-PROGRAM-IMPLIES-STATEMENT', requirementCount: 128 }, { op: 'OMITTED-CLAUSE-COUNTEREXAMPLE-COUNT-GTE', perClause: 1 }],
    [{ op: 'EXECUTABLE-VECTOR-SHAPE-COMPLETE', main: 640, atomic: 295, missing: 135, public: 260 }, { op: 'DUAL-RUNNER-OUTCOME-ROOT-EQ' }],
    [{ op: 'INVALIDATION-UNIVERSE-COMPLETE' }, { op: 'RAW-SUBJECT-PACKET-BINDING-COUNT-EQ', expected: 128 }, { op: 'CAS-FENCE-TWO-READBACKS' }],
    [{ op: 'REVIEW-OPERATIONS-ATOMIC', operations: ['GENERATION-SEAL', 'RECONCILE', 'DEFINITION-ACCEPT'] }, { op: 'NO-SELF-APPROVAL' }, { op: 'EXACT-TWO-GENERATIONS' }],
    [{ op: 'MISSING-VALUE-MACHINE-COUNT-EQ', expected: 27 }, { op: 'MISSING-VALUE-VECTOR-COUNT-EQ', expected: 135 }],
    [{ op: 'ATOMIC-CHILD-PREDICATE-COUNT-EQ', expected: 59 }, { op: 'ATOMIC-CHILD-VECTOR-COUNT-EQ', expected: 295 }, { op: 'PARENT-CREDIT-REQUIRES-COMPLETE-CHILD-RECEIPTS' }],
    [{ op: 'LIFECYCLE-TUPLE-COUNT-EQ', expected: 3200 }, { op: 'ACTIVE-AND-HOLD-DELETE-ALWAYS-BLOCK' }, { op: 'TWO-ENGINE-TRANSITION-EQ' }],
    [{ op: 'RETENTION-V2-SCHEMA-COMPLETE' }, { op: 'ATOMIC-DELETE-AUTHORIZED-SUBSET-ONLY' }, { op: 'POST-DELETE-READBACK-AUDIT-ONLY' }],
    [{ op: 'BACKUP-RESTORE-V2-SCHEMA-COMPLETE' }, { op: 'RESTORE-BOUND-TO-BACKUP-ID-AND-DIGESTS' }, { op: 'R2-AND-RETENTION-WINDOW-PROVED' }, { op: 'PRIVACY-REPLAY-BEFORE-ACTIVATION' }],
    [{ op: 'PUBLIC-CONTROL-GATE-COUNT-EQ', expected: 52 }, { op: 'PUBLIC-VECTOR-COUNT-EQ', expected: 260 }, { op: 'PRIVATE-PATH-COUNT-EQ', expected: 0 }],
    [{ op: 'SEVERITY-GENESIS-EVENT-COUNT-EQ', expected: 84 }, { op: 'SOE-050-FIRST-REACHABILITY-ESCALATES-P0' }, { op: 'SEVERITY-CAS-HISTORY-APPEND-ONLY' }],
    [{ op: 'PORTABLE-CANDIDATE-CONTENT-ADDRESS-EQ', expected: 'DETACHED-SUBJECT-RAW-ROOT' }, { op: 'ABSOLUTE-PATH-ADVISORY-ONLY' }, { op: 'ACQUISITION-VECTOR-SET-PASS' }],
  ];
  return exact[index];
}

const mainVectors = [];
const semanticPredicates = [];
for (let i = 0; i < blueprints.length; i += 1) {
  const b = blueprints[i]; const baseRoot = b.sourceKind === 'V4-HOSTILE-FINDING' ? EXPECTED.v4Findings : v4[i - 15].digest;
  const vectors = vectorModes.map(mode => exactVector({ vectorId: `TV-${b.requirementId}-${mode}`, family: 'MAIN-REQUIREMENT', targetId: b.requirementId, mode, baseRoot, pointer: `/requirements/${b.requirementId}`, failureTerminal: b.failureTerminal }));
  mainVectors.push(...vectors);
  const assertions = i < 15 ? correctionAssertions(i) : [
    { op: 'BYTE-SLICE-DIGEST-EQ', manifestId: `V4R-${String(i - 15).padStart(3, '0')}`, expected: v4[i - 15].digest },
    { op: 'EXACT-FIVE-FIELD-VALUES-EQ', expectedFieldRoot: recordDigest('CONNECT-TRD2V5-INHERITED-FIELDS-V1', v4[i - 15].fields) },
    { op: 'SEMANTIC-REPLAY-VECTORS-PASS', exactVectorIds: vectors.map(v => v.vectorId) },
    { op: 'NO-MERGE-NO-CLOSURE-TRANSFER', sourceRequirementId: v4[i - 15].id },
  ];
  const program = {
    predicateId: `TRD2V5-CP-${String(i).padStart(3, '0')}`, requirementId: b.requirementId, schemaVersion: 'CONNECT-TRD2V5-SEMANTIC-PROGRAM-V1',
    boundInputRefs: ['DETACHED:V5-SUBJECT-RAW-ROOT', 'DETACHED:V5-PACKET-RAW-ROOT', `SOURCE:${b.sourceId}`, `VECTORS:${b.requirementId}`],
    expectedInputRoots: [baseRoot, EXPECTED.v4Subject, EXPECTED.v4Packet, fileSha(O.inherited)],
    executionOrder: assertions.map((_, n) => n), assertions,
    counterexampleCoverage: assertions.map((assertion, n) => ({ assertionIndex: n, assertionOp: assertion.op, vectorId: vectors[1 + (n % 4)].vectorId, expected: 'BLOCKED' })),
    passRule: 'ALL-ASSERTIONS-TRUE-AND-ALL-FIVE-VECTOR-RECEIPTS-PASS-AND-TWO-READBACKS-EQUAL',
    missingRule: 'BLOCK', staleRule: 'BLOCK', conflictRule: 'BLOCK', failureTerminal: b.failureTerminal,
    vectorIds: vectors.map(v => v.vectorId), actualResultReceipt: null,
  };
  program.semanticProgramRoot = recordDigest('CONNECT-TRD2V5-SEMANTIC-PROGRAM-V1', program); semanticPredicates.push(program);
  b.proofPredicate = `predicateId=${program.predicateId};semanticProgramRoot=${program.semanticProgramRoot};vectorIds=${program.vectorIds.join(',')};expected=PASS;current=BLOCKED;failure=${b.failureTerminal};subjectRawRootBinding=DETACHED;packetRawRootBinding=DETACHED;evaluatorRoot=MISSING/EXTERNAL-APPOINTED;runnerRoots=MISSING/EXTERNAL-APPOINTED`;
}
assert(new Set(semanticPredicates.map(p => p.semanticProgramRoot)).size === 128, 'unique semantic program roots');

let subject = `# 1. Connect — Section 35.6 TRD-2 v5 immutable executable Definition successor requirements\n\n`;
subject += `## 1.1 Identity, authority and non-acceptance boundary\n\n`;
subject += `1.1.1 artifactId=CONNECT-SECTION-35-6-TRD-2-V5-IMMUTABLE-SUCCESSOR-REQUIREMENTS-2026-08-29-V1.\n\n`;
subject += `1.1.2 artifactClass=PLANNING-ONLY; IMMUTABLE-SUCCESSOR-CANDIDATE; NOT-DEFINITION-ACCEPTANCE; NOT-GATE-CREDIT.\n\n`;
subject += `1.1.3 frozen v4 Subject root=${EXPECTED.v4Subject}; v4 review root=${EXPECTED.v4Review}; findings root=${EXPECTED.v4Findings}; exact non-merged denominator=15.\n\n`;
subject += `1.1.4 inherited-v4 manifest root=${fileSha(O.inherited)}; preserved Requirements=113/113; closureTransferred=0.\n\n`;
subject += `1.1.5 repositoryVisibility=PUBLIC; Private remediation, rollback or incident paths=FORBIDDEN.\n\n`;
subject += `1.1.6 Product/Git/GitHub/Build/Runtime/Deploy/Provider actions=UNAUTHORIZED; Gate29=BLOCKED; Development freeze=ACTIVE.\n\n`;
subject += `1.1.7 Acceptance remains 0 pending a fresh independent hostile review, exact two appointed review generations, reconciliation and detached Definition Acceptance.\n\n`;
subject += `1.1.8 terminal convergence rule: zero unresolved P0/P1; every P2/P3 has explicit protocol-authorized disposition; no self-approval; exactly two eligible evidence-disjoint generations; any absent/stale/conflicted input routes to a named fail-closed terminal. A fresh review that finds no new P0/P1 may proceed to reconciliation; it does not require an empty universe of hypothetical future findings.\n\n`;
subject += `## 1.2 Exact Requirement contract\n\n1.2.1 Every Requirement contains exactly five ordered fields: statement, defectCauseImpact, proofPredicate, dependencies and sourceBasis.\n\n`;
subject += `1.2.2 Every predicate binds exact semantic assertions and five executable real-root vectors. Producer QA grants zero closure.\n\n`;
for (let i = 0; i < blueprints.length; i += 1) {
  const b = blueprints[i]; const chapter = i < 15 ? 2 : 3; const ordinal = i < 15 ? i + 1 : i - 14;
  if (i === 0) subject += `# 2. Fifteen distinct v4-review correction Requirements\n\n`;
  if (i === 15) subject += `# 3. One hundred thirteen byte-preserved v4 Requirement replay Requirements\n\n`;
  subject += `## ${chapter}.${ordinal} \`${b.requirementId}\` — ${b.title}\n\n`;
  subject += `- \`statement\`: ${b.statement}\n\n`;
  subject += `- \`defectCauseImpact\`: ${b.defectCauseImpact}\n\n`;
  subject += `- \`proofPredicate\`: ${b.proofPredicate}\n\n`;
  subject += `- \`dependencies\`: [${b.dependencies.join(',')}]\n\n`;
  subject += `- \`sourceBasis\`: ${b.sourceBasis}\n\n`;
}
subject += `# 4. Frozen current disposition\n\n4.1 accepted Requirements=0/128; executed externally appointed semantic receipts=0/128; review generations=0/2; Reconciliation=ABSENT; Definition Acceptance=ABSENT.\n\n4.2 This Candidate is ready only for detached Producer QA and then a fresh independent hostile review.\n`;
fs.writeFileSync(O.subject, subject);
fs.writeFileSync(O.subjectCapture, bytes(O.subject));
const subjectPhysical = physical(O.subject);
assert(fileSha(O.subjectCapture) === subjectPhysical.sha256, 'subject capture root');

const atomicChildren = [];
const atomicChildPredicates = [];
const atomicVectors = [];
for (const old of v4Controls.atomicChildren) {
  const parentOrdinal = Number(old.parentId.slice(-3)); const parentId = reqId(15 + parentOrdinal);
  const childId = old.childId.replace('TRD2V4-', 'TRD2V5-');
  const baseRoot = old.childRoot;
  const vectors = vectorModes.map(mode => exactVector({
    vectorId: `ATV-${childId}-${mode}`, family: 'ATOMIC-CHILD', targetId: childId, mode, baseRoot,
    pointer: `/atomicChildren/${childId}`, failureTerminal: old.failureTerminal,
  }));
  atomicVectors.push(...vectors);
  const child = {
    childId, inheritedChildId: old.childId, parentId, inheritedParentId: old.parentId, oneAction: old.oneAction,
    oneProductOutput: old.oneProductOutput.replace('TRD2V4-', 'TRD2V5-'), oneEvidenceOutput: old.oneEvidenceOutput.replace('TRD2V4-', 'TRD2V5-'),
    ownerRole: old.ownerRole, reviewerRole: old.reviewerRole, failureTerminal: old.failureTerminal,
    vectorIds: vectors.map(v => v.vectorId), actualReceipt: null, parentCredit: 0, closureTransferred: 0,
  };
  child.childRoot = recordDigest('CONNECT-TRD2V5-ATOMIC-CHILD-V1', child); atomicChildren.push(child);
  const predicate = {
    predicateId: `ACP-${childId}`, childId, parentId, assertions: [
      { op: 'ACTION-OUTPUT-EQ', action: child.oneAction, outputId: child.oneProductOutput },
      { op: 'EVIDENCE-OUTPUT-SCHEMA-VALID', evidenceId: child.oneEvidenceOutput },
      { op: 'FIVE-EXECUTED-VECTOR-RECEIPTS-EQ', vectorIds: child.vectorIds },
      { op: 'CHILD-RESULT-FRESH-AND-INDEPENDENT' },
    ], passRule: 'ALL; NO-SHARED-CREDIT; NO-PARENT-INFERENCE', failureTerminal: child.failureTerminal, actualReceipt: null,
  };
  predicate.predicateRoot = recordDigest('CONNECT-TRD2V5-ATOMIC-CHILD-PREDICATE-V1', predicate); atomicChildPredicates.push(predicate);
}
assert(atomicChildren.length === 59 && atomicVectors.length === 295, 'atomic denominators');
const atomicParentRules = blueprints.map(b => {
  const children = atomicChildren.filter(c => c.parentId === b.requirementId).map(c => c.childId);
  const row = { requirementId: b.requirementId, classification: children.length ? 'COMPOUND' : 'ATOMIC', mandatoryChildIds: children,
    passRule: children.length ? 'EXACT-COMPLETE-SET-OF-FRESH-INDEPENDENT-CHILD-PASS-RECEIPTS' : 'REQUIREMENT-SEMANTIC-PREDICATE-PASS',
    missingOrDuplicateChildTerminal: 'ATOMIC-CLOSURE-BLOCKED', parentCreditBeforeReceipts: 0 };
  row.ruleRoot = recordDigest('CONNECT-TRD2V5-ATOMIC-PARENT-RULE-V1', row); return row;
});

const missingValueTransitionSchema = {
  schemaVersion: 'CONNECT-TRD2V5-MISSING-VALUE-TRANSITION-V1', additionalProperties: false,
  states: ['UNRESOLVED', 'PROPOSED', 'UNDER-REVIEW', 'RESOLVED', 'REJECTED', 'REVOKED', 'CONFLICT'],
  legal: [
    ['UNRESOLVED', 'PROPOSE', 'PROPOSED', 'APPOINTED-DEFINITION-PRODUCER'],
    ['PROPOSED', 'START-REVIEW', 'UNDER-REVIEW', 'INDEPENDENT-REVIEWER'],
    ['UNDER-REVIEW', 'ACCEPT', 'RESOLVED', 'INDEPENDENT-REVIEWER+ACCEPTANCE-CONTROLLER'],
    ['UNDER-REVIEW', 'REJECT', 'REJECTED', 'INDEPENDENT-REVIEWER'],
    ['RESOLVED', 'REVOKE', 'REVOKED', 'REVOCATION-AUTHORITY'],
    ['PROPOSED', 'REVOKE', 'REVOKED', 'REVOCATION-AUTHORITY'],
    ['UNDER-REVIEW', 'REVOKE', 'REVOKED', 'REVOCATION-AUTHORITY'],
    ['REJECTED', 'REPROPOSE', 'PROPOSED', 'APPOINTED-DEFINITION-PRODUCER'],
  ].map((r, i) => ({ transitionId: `MVT-${String(i + 1).padStart(2, '0')}`, from: r[0], operation: r[1], to: r[2], authorityExpression: r[3], expectedVersionRequired: true, casRequired: true, fenceRequired: true, trustedTimeRequired: true })),
  default: { disposition: 'BLOCK', terminal: 'SOURCE-REFERENCE-INVALID' },
  receiptFields: ['transitionId', 'missingValueId', 'priorState', 'priorVersion', 'operation', 'authorityRoot', 'appointmentRoot', 'expectedHead', 'fenceToken', 'trustedTimeReceiptRoot', 'newState', 'newVersion', 'newHead', 'commitIndex', 'idempotencyKey', 'preReadbackRoot', 'postReadbackOneRoot', 'postReadbackTwoRoot'],
};
missingValueTransitionSchema.schemaRoot = recordDigest('CONNECT-TRD2V5-MISSING-VALUE-TRANSITION-SCHEMA-V1', missingValueTransitionSchema);
const missingValueMachines = v4Controls.missingValues.map((old, i) => {
  const row = { missingValueId: old.missingValueId, targetRecordId: old.targetRecordId, missingField: old.missingField, sourceRoot: old.sourceRoot,
    sourceLocalId: old.sourceLocalId, currentState: 'UNRESOLVED', currentVersion: 0, currentHead: old.recordRoot,
    transitionSchemaRoot: missingValueTransitionSchema.schemaRoot, appointmentRoot: 'MISSING/EXTERNAL-APPOINTMENT', authorityRoot: 'MISSING/EXTERNAL-B0-AUTHORITY',
    actualTransitionReceipts: [], acceptanceEligible: false, safeTerminal: old.safeTerminal, directDefaultOrInferenceAllowed: false };
  row.machineRoot = recordDigest('CONNECT-TRD2V5-MISSING-VALUE-MACHINE-V1', row); return row;
});
const missingValueVectors = missingValueMachines.flatMap(m => vectorModes.map(mode => exactVector({
  vectorId: `MVR-${m.missingValueId}-${mode}`, family: 'MISSING-VALUE-TRANSITION', targetId: m.missingValueId, mode,
  baseRoot: m.machineRoot, pointer: `/missingValues/${m.missingValueId}/currentHead`, failureTerminal: m.safeTerminal, expectedHead: m.currentHead,
})));
assert(missingValueVectors.length === 135, 'MVR vector denominator');

const publicControls = v4Controls.publicCyber.controls.map(old => ({
  controlId: old.controlId, sourceRequirementId: old.sourceRequirementId, sourceRoot: EXPECTED.publicCyber,
  sourceRequirementDigest: old.sourceRequirementDigest, publicInvariant: 'PUBLIC', privatePathCount: 0,
  vectorIds: vectorModes.map(mode => `PUBV-${old.controlId}-${mode}`), gateId: old.hardeningGateId,
  informationFlowInventoryRequired: true, runtimePublicSurfaceDenominatorRequired: true, currentState: 'UNEXECUTED', actualResultReceipt: null,
}));
for (const c of publicControls) c.controlRoot = recordDigest('CONNECT-TRD2V5-PUBLIC-CONTROL-V1', c);
const publicHardeningGates = publicControls.map(c => {
  const row = { gateId: c.gateId, controlId: c.controlId, states: ['UNEXECUTED', 'EVALUATING', 'PASS', 'BLOCKED', 'REVOKED'],
    initialState: 'UNEXECUTED', currentState: 'UNEXECUTED', legalTransitions: ['UNEXECUTED->EVALUATING', 'EVALUATING->PASS', 'EVALUATING->BLOCKED', 'PASS->REVOKED', 'BLOCKED->EVALUATING'],
    casRequired: true, fenceRequired: true, twoReadbacksRequired: true, disclosureSafeEvidenceOnly: true,
    requiredScans: ['GIT-HISTORY-AND-CURRENT-TREE', 'SECRETS', 'PII-AND-PRIVATE-EVIDENCE', 'DEPENDENCY-SUPPLY-CHAIN', 'PUBLIC-RUNTIME-SURFACE', 'GITHUB-GOVERNANCE', 'ROLLBACK-AND-RECOVERY'],
    actualReceipt: null, failTerminal: 'PUBLIC-HARDENING-BLOCKED' };
  row.gateRoot = recordDigest('CONNECT-TRD2V5-PUBLIC-HARDENING-GATE-V1', row); return row;
});
const publicVectors = publicControls.flatMap(c => vectorModes.map(mode => exactVector({
  vectorId: `PUBV-${c.controlId}-${mode}`, family: 'PUBLIC-HARDENING', targetId: c.controlId, mode,
  baseRoot: c.controlRoot, pointer: `/publicControls/${c.controlId}`, failureTerminal: 'PUBLIC-HARDENING-BLOCKED',
})));
assert(publicControls.length === 52 && publicHardeningGates.length === 52 && publicVectors.length === 260, 'Public denominators');

const severityEventSchema = {
  schemaVersion: 'CONNECT-TRD2V5-SEVERITY-EVENT-V1', severities: ['P0', 'P1', 'P2', 'P3'],
  fields: ['eventId', 'envelopeId', 'priorVersion', 'priorSeverity', 'newSeverity', 'triggerPredicateRoot', 'triggerEvidenceRoot', 'evaluatorRoot', 'authorityRoot', 'appointmentRoot', 'trustedTimeReceiptRoot', 'expectedHead', 'fenceToken', 'commitIndex', 'reasonCode'],
  originalSeverityImmutable: true, appendOnly: true, casRequired: true, fenceRequired: true, revokedEvaluatorBlocks: true,
  failureTerminal: 'SEVERITY-TRANSITION-BLOCKED',
};
severityEventSchema.schemaRoot = recordDigest('CONNECT-TRD2V5-SEVERITY-EVENT-SCHEMA-V1', severityEventSchema);
const severityEvents = v4FieldMap.severityBindings.map((old, i) => {
  const event = { eventId: `SEV-GENESIS-${old.envelopeId}`, envelopeId: old.envelopeId, priorVersion: null, priorSeverity: null,
    newSeverity: old.originalSeverity, reasonCode: 'FROZEN-SOURCE-GENESIS', sourceLogicalRoot: old.severitySourceRoot,
    triggerPredicateRoot: recordDigest('CONNECT-TRD2V5-SEVERITY-GENESIS-PREDICATE-V1', { envelopeId: old.envelopeId, severity: old.originalSeverity }),
    evaluatorRoot: 'IMMUTABLE-SOURCE-PROJECTION', authorityRoot: 'IMMUTABLE-SOURCE-PROJECTION', appointmentRoot: 'NOT-APPLICABLE-GENESIS',
    trustedTimeReceiptRoot: 'NOT-APPLICABLE-GENESIS', expectedHead: zeroRoot, fenceToken: `SEVERITY:${old.envelopeId}:0`, commitIndex: 0 };
  event.eventRoot = recordDigest('CONNECT-TRD2V5-SEVERITY-EVENT-V1', event); return event;
});
const severityBindings = v4FieldMap.severityBindings.map((old, i) => {
  const history = [severityEvents[i].eventRoot];
  const row = { envelopeId: old.envelopeId, originalSeverity: old.originalSeverity, currentSeverity: old.effectiveSeverity,
    currentVersion: 0, eventRoots: history, historyRoot: collectionRoot(`CONNECT-TRD2V5-SEVERITY-HISTORY-${old.envelopeId}-V1`, severityEvents.filter(e => e.envelopeId === old.envelopeId), 'eventId'),
    pendingCondition: old.envelopeId === 'SOE-050' ? { from: 'P2', to: 'P0', trigger: 'FIRST-ACCEPTED-PUSH-MERGE-RELEASE-OR-DEPLOY-REACHABILITY-OBSERVATION', evaluatorRoot: 'MISSING/EXTERNAL-APPOINTED', evaluatedAt: null } : null,
    actualTransitionReceipts: [], schemaRoot: severityEventSchema.schemaRoot };
  row.bindingRoot = recordDigest('CONNECT-TRD2V5-SEVERITY-BINDING-V1', row); return row;
});
const severityVectors = severityBindings.flatMap(s => vectorModes.map(mode => exactVector({
  vectorId: `SEVV-${s.envelopeId}-${mode}`, family: 'SEVERITY-TRANSITION', targetId: s.envelopeId, mode, baseRoot: s.bindingRoot,
  pointer: `/severityBindings/${s.envelopeId}`, failureTerminal: 'SEVERITY-TRANSITION-BLOCKED', expectedHead: s.historyRoot,
})));
assert(severityBindings.length === 84 && severityVectors.length === 420, 'severity denominators');

const lifecycleClasses = v4Controls.dataLifecycle.classes.map((old, i) => ({
  dataClassId: old.dataClassId, scope: old.scope, identityModel: ['DL-CLASS-005'].includes(old.dataClassId) ? 'IMMUTABLE-BACKUP-COPY-IDENTITY' : ['DL-CLASS-006'].includes(old.dataClassId) ? 'NEW-RESTORE-COPY-IDENTITY' : 'SOURCE-OR-WORKFLOW-IDENTITY',
  admittedUniverseRoot: 'MISSING/EXTERNAL-ACCEPTED-SOURCE-UNIVERSE', admittedMembers: [], admittedDenominator: 0,
  defaultDisposition: 'BLOCK', providerStoreIdentityRequired: true, emptyDenominatorMayPass: false,
}));
for (const c of lifecycleClasses) c.classRoot = recordDigest('CONNECT-TRD2V5-DATA-CLASS-V1', c);
const states = [...v4Controls.dataLifecycle.states];
const events = [...v4Controls.dataLifecycle.events];
const deleteEvents = new Set(['REQUEST-DELETE', 'START-DELETE', 'START-REDELETE']);
const sourceClasses = new Set(['DL-CLASS-001', 'DL-CLASS-002', 'DL-CLASS-003', 'DL-CLASS-004', 'DL-CLASS-009']);
function lifecycleRule(dataClassId, state, event) {
  let disposition = 'BLOCK'; let toState = state; let guard = 'FALSE'; let terminal = 'DATA-LIFECYCLE-TRANSITION-NOT-PERMITTED'; let effect = 'NONE';
  const allow = (to, requiredGuard, sideEffect = 'UPDATE-STATE') => { disposition = 'ALLOW'; toState = to; guard = requiredGuard; terminal = 'NONE'; effect = sideEffect; };
  if (state === 'PURGED') return { disposition, toState, guard: 'PURGED-NON-RESURRECTABLE', terminal: 'DATA-LIFECYCLE-PURGED-TERMINAL', effect };
  if (state === 'ACTIVE' && deleteEvents.has(event)) return { disposition, toState, guard: 'ACTIVE-RECORD-DELETE-BLOCK', terminal: 'RETENTION-ACTIVE-RECORD-BLOCKED', effect };
  if (state === 'HOLD-ACTIVE' && deleteEvents.has(event)) return { disposition, toState, guard: 'LEGAL-HOLD-DELETE-BLOCK', terminal: 'RETENTION-LEGAL-HOLD-BLOCKED', effect };
  if (event === 'QUARANTINE' && ['ACTIVE', 'CONFLICT'].includes(state)) allow('QUARANTINED', 'APPOINTED-QUARANTINE-AUTHORITY+EXPECTED-HEAD+CAS+FENCE');
  if (event === 'APPLY-HOLD' && !['PURGED', 'DELETE-IN-FLIGHT'].includes(state) && dataClassId !== 'DL-CLASS-005') allow('HOLD-ACTIVE', 'LEGAL-HOLD-SCOPE-VERSION+AUTHORITY+EXPECTED-HEAD+CAS+FENCE');
  if (event === 'RELEASE-HOLD' && state === 'HOLD-ACTIVE') allow('HOLD-RELEASE-PENDING', 'DISTINCT-LEGAL-HOLD-RELEASE-AUTHORITY+CURRENT-SCOPE+CAS');
  if (event === 'HOLD-RELEASE-RECONCILED' && state === 'HOLD-RELEASE-PENDING') allow('QUARANTINED', 'ALL-PROVIDER-HOLD-READBACKS-EQUAL+TWO-READBACKS');
  if (event === 'EXPIRE' && ['ACTIVE', 'QUARANTINED'].includes(state) && !['DL-CLASS-005', 'DL-CLASS-008'].includes(dataClassId)) allow('EXPIRED', 'POLICY-VERSION+TRUSTED-TIME+INACTIVE-RECORD+NO-HOLD+CAS');
  if (event === 'REQUEST-DELETE' && state === 'EXPIRED' && dataClassId !== 'DL-CLASS-005') allow('DELETE-PLANNED', 'RETENTION-PLAN-V2-UNEXPIRED+CURRENT-POLICY+EXACT-CUTOFF+EXACT-IDENTITY+INACTIVE+NO-HOLD');
  if (event === 'START-DELETE' && state === 'DELETE-PLANNED' && dataClassId !== 'DL-CLASS-005') allow('DELETE-IN-FLIGHT', 'ATOMIC-DELETE-PREPARE+PROVIDER-AUTHORIZED-SUBSET+EXPECTED-HEAD+CAS+FENCE');
  if (event === 'PROVIDER-CONFIRMED' && state === 'DELETE-IN-FLIGHT') allow('PURGED', 'EXACT-PLAN-IDENTITY+PROVIDER-CONFIRMATION+ATOMIC-COMMIT', 'COMMIT-EXACT-AUTHORIZED-DELETION');
  if (event === 'PROVIDER-PARTIAL' && state === 'DELETE-IN-FLIGHT') allow('DELETE-PARTIAL', 'PARTIAL-RESULT-ROOT+ZERO-UNAUTHORIZED-IDENTITIES');
  if (event === 'PROVIDER-UNKNOWN' && state === 'DELETE-IN-FLIGHT') allow('DELETE-UNKNOWN', 'UNKNOWN-RESULT-ROOT+NO-SUCCESS-INFERENCE');
  if (event === 'RECONCILE-PARTIAL' && state === 'DELETE-PARTIAL') allow('DELETE-IN-FLIGHT', 'EXACT-REMAINDER-SET+IDEMPOTENT-RETRY+CAS');
  if (event === 'RECONCILE-UNKNOWN' && state === 'DELETE-UNKNOWN') allow('DELETE-IN-FLIGHT', 'PROVIDER-READBACK+EXACT-REMAINDER-SET+CAS');
  if (event === 'BACKUP-CAPTURED' && sourceClasses.has(dataClassId) && ['ACTIVE', 'QUARANTINED', 'EXPIRED'].includes(state)) allow(state, 'BACKUP-EVIDENCE-V2+NEW-BACKUP-IDENTITY+SOURCE-STATE-UNCHANGED', 'CREATE-DL-CLASS-005-COPY');
  if (event === 'BACKUP-CAPTURED' && dataClassId === 'DL-CLASS-005' && state === 'QUARANTINED') allow('BACKED-UP', 'BACKUP-ID+DATABASE-DIGEST+OBJECT-MANIFEST-DIGEST+R2-CONSISTENCY+WINDOW-PROOF');
  if (event === 'RESTORE-STARTED' && dataClassId === 'DL-CLASS-005' && state === 'BACKED-UP') allow('BACKED-UP', 'CREATE-NEW-DL-CLASS-006-IDENTITY+EXACT-BACKUP-ID-AND-DIGESTS', 'CREATE-DL-CLASS-006-RESTORE-COPY');
  if (event === 'RESTORE-STARTED' && dataClassId === 'DL-CLASS-006' && state === 'QUARANTINED') allow('RESTORE-QUARANTINE', 'RESTORE-EVIDENCE-V2+NEW-IDENTITY+R2-CONSISTENCY+WINDOW-PROOF');
  if (event === 'PRIVACY-REPLAY-ALLOW' && dataClassId === 'DL-CLASS-006' && state === 'RESTORE-QUARANTINE') allow('PRIVACY-REPLAY', 'COMPLETE-PRIOR-DELETION-HOLD-RETENTION-OBLIGATION-SET');
  if (event === 'PRIVACY-REPLAY-ALLOW' && dataClassId === 'DL-CLASS-006' && state === 'PRIVACY-REPLAY') allow('ACTIVE', 'REPLAY-COMPLETE+NO-REDELETE-OBLIGATION+TWO-READBACKS');
  if (event === 'PRIVACY-REPLAY-REDELETE' && dataClassId === 'DL-CLASS-006' && state === 'PRIVACY-REPLAY') allow('REDELETE-PENDING', 'PRIOR-DELETION-OBLIGATION-EXACT-SET');
  if (event === 'START-REDELETE' && dataClassId === 'DL-CLASS-006' && state === 'REDELETE-PENDING') allow('DELETE-IN-FLIGHT', 'RETENTION-PLAN-V2-FOR-RESTORE-COPY+NO-HOLD+ATOMIC-PREPARE');
  if (event === 'PRIVACY-REPLAY-FAIL' && dataClassId === 'DL-CLASS-006' && ['RESTORE-QUARANTINE', 'PRIVACY-REPLAY'].includes(state)) allow('QUARANTINED', 'FAIL-CLOSED-REPLAY-EVIDENCE');
  if (event === 'INVALIDATE' && !['PURGED', 'HOLD-ACTIVE'].includes(state)) allow('INVALIDATED', 'AUTHORIZED-INVALIDATION+EXPECTED-HEAD+CAS');
  if (event === 'CAS-CONFLICT' && state !== 'PURGED') allow('CONFLICT', 'CONFLICT-RECEIPT+ZERO-WRITE-COMMIT', 'WRITE-CONFLICT-EVIDENCE-ONLY');
  return { disposition, toState, guard, terminal, effect };
}
const matrixRows = [];
for (const cls of lifecycleClasses) for (const fromState of states) for (const event of events) {
  const policy = lifecycleRule(cls.dataClassId, fromState, event);
  const row = {
    transitionId: `DLT-${cls.dataClassId}-${String(states.indexOf(fromState) + 1).padStart(2, '0')}-${String(events.indexOf(event) + 1).padStart(2, '0')}`,
    dataClassId: cls.dataClassId, fromState, event, ...policy,
    triggerSchema: 'CONNECT-TRD2V5-DATA-LIFECYCLE-EVENT-V1', providerStoreIdentityRequired: true,
    expectedHeadRequired: policy.disposition === 'ALLOW', casRequired: policy.disposition === 'ALLOW', fenceRequired: policy.disposition === 'ALLOW',
    activeRecordMustBeFalseForDelete: deleteEvents.has(event), legalHoldMustBeFalseForDelete: deleteEvents.has(event),
    authorityRoot: policy.disposition === 'ALLOW' ? 'MISSING/EXTERNAL-APPOINTED-AUTHORITY' : 'NONE', actualReceipt: null,
  };
  row.transitionRoot = recordDigest('CONNECT-TRD2V5-DATA-LIFECYCLE-TRANSITION-V1', row); matrixRows.push(row);
}
assert(matrixRows.length === 3200, 'lifecycle matrix denominator');
assert(new Set(matrixRows.map(r => `${r.dataClassId}|${r.fromState}|${r.event}`)).size === 3200, 'lifecycle tuple uniqueness');
assert(matrixRows.filter(r => ['ACTIVE', 'HOLD-ACTIVE'].includes(r.fromState) && deleteEvents.has(r.event)).every(r => r.disposition === 'BLOCK'), 'active and hold deletion block');
const dataLifecycle = {
  schemaVersion: 'CONNECT-TRD2V5-CLASS-SPECIFIC-DATA-LIFECYCLE-V1', acceptedIdentityStoreProviderUniverseRoot: 'MISSING/EXTERNAL-ACCEPTED-SOURCE-UNIVERSE',
  admittedIdentityStoreProviderMembers: [], admittedDenominator: 0, emptyDenominatorMayPass: false,
  classes: lifecycleClasses, states, events, matrixRows, expectedTupleDenominator: 3200, missingTuples: 0, duplicateTuples: 0, ambiguousTuples: 0,
  defaultDenyOutsideMatrix: true, actualTransitionReceipts: [], currentResult: 'BLOCKED-PENDING-ACCEPTED-SOURCE-UNIVERSE-AND-EXTERNAL-EXECUTION',
};
dataLifecycle.classCollectionRoot = collectionRoot('CONNECT-TRD2V5-DATA-CLASSES-V1', lifecycleClasses, 'dataClassId');
dataLifecycle.transitionCollectionRoot = collectionRoot('CONNECT-TRD2V5-DATA-LIFECYCLE-TRANSITIONS-V1', matrixRows, 'transitionId');

const retentionPlanSchema = {
  schemaVersion: 'CONNECT-RETENTION-PLAN-V2', additionalProperties: false,
  required: ['planId', 'planDigest', 'policyVersion', 'issuedAt', 'expiresAt', 'cutoffInclusive', 'dataClassId', 'candidateIdentitySetRoot', 'candidateIdentities', 'providerAuthorizationSetRoot', 'providerAuthorizations', 'expectedLifecycleHead', 'expectedPolicyHead', 'authorityRoot', 'appointmentRoot', 'trustedTimeReceiptRoot', 'fenceToken', 'idempotencyKey'],
  constraints: ['expiresAt-issuedAt<=900-seconds', 'policyVersion-equals-current-policy-head', 'candidate-identities-unique-and-at-or-before-cutoff', 'all-candidates-inactive', 'all-candidates-not-held', 'provider-confirmed-identities-subset-of-authorized-identities', 'planDigest-domain-separated-over-all-fields-except-planDigest', 'single-data-class', 'expected-head-CAS-and-fence-required'],
  forbidden: ['post-delete-readback-as-safety-decision', 'wildcard-identity', 'provider-confirmation-outside-authorized-set', 'active-record', 'legal-hold-record'],
};
retentionPlanSchema.schemaRoot = recordDigest('CONNECT-RETENTION-PLAN-V2-SCHEMA', retentionPlanSchema);
const atomicDeleteSchema = {
  schemaVersion: 'CONNECT-ATOMIC-RETENTION-DELETE-V2', phases: ['VALIDATE-PLAN', 'LOCK-HEAD', 'PREPARE-PROVIDERS', 'VERIFY-AUTHORIZED-SUBSET', 'CAS-COMMIT', 'FINALIZE-PROVIDERS', 'AUDIT-READBACK'],
  allOrNothingDurableState: true, crashRule: 'ZERO-COMMIT-OR-ONE-RECOVERABLE-EXACT-COMMIT', idempotencyRequired: true,
  requiredReceiptFields: ['deleteOperationId', 'planId', 'planDigest', 'policyVersion', 'cutoffInclusive', 'candidateIdentitySetRoot', 'providerConfirmedIdentitySetRoot', 'expectedHead', 'fenceToken', 'prepareReceiptRoots', 'commitReceiptRoot', 'providerOutcomeRoots', 'postDeleteAuditReadbackRoot', 'terminal'],
  postDeleteReadbackRole: 'AUDIT-ONLY-NOT-SAFETY', partialTerminal: 'RETENTION-DELETE-PARTIAL-RECONCILIATION-REQUIRED', unknownTerminal: 'RETENTION-DELETE-UNKNOWN-RECONCILIATION-REQUIRED', unauthorizedTerminal: 'RETENTION-DELETE-BLOCKED',
};
atomicDeleteSchema.schemaRoot = recordDigest('CONNECT-ATOMIC-RETENTION-DELETE-V2-SCHEMA', atomicDeleteSchema);
const retentionV2 = { planSchema: retentionPlanSchema, atomicDeleteSchema, actualPlans: [], executedDeletes: [], deletionAdapterConnected: false, currentState: 'BLOCKED-NO-ACCEPTED-PLAN-NO-ADAPTER-NO-AUTHORITY' };

const backupEvidenceSchema = {
  schemaVersion: 'CONNECT-BACKUP-EVIDENCE-V2', additionalProperties: false,
  required: ['backupId', 'sourceCohortRoot', 'databaseSnapshotDigest', 'objectManifestDigest', 'objectMemberDigestCollectionRoot', 'r2InventoryDigest', 'r2ConsistencyProofRoot', 'capturedAt', 'retentionWindowStart', 'retentionWindowEnd', 'windowObservationReceiptRoots', 'providerReceiptRoots', 'encryptionKeyVersionRoot', 'authorityRoot'],
  constraints: ['backupId-content-addresses-complete-evidence', 'database-and-object-digests-exact', 'R2-inventory-equals-object-manifest', 'retention-window-proved-by-at-least-two-boundary-observations', 'source-state-unchanged'],
};
backupEvidenceSchema.schemaRoot = recordDigest('CONNECT-BACKUP-EVIDENCE-V2-SCHEMA', backupEvidenceSchema);
const restoreEvidenceSchema = {
  schemaVersion: 'CONNECT-RESTORE-EVIDENCE-V2', additionalProperties: false,
  required: ['restoreId', 'newRestoreIdentity', 'backupId', 'backupEvidenceRoot', 'databaseSnapshotDigest', 'objectManifestDigest', 'r2ConsistencyProofRoot', 'retentionWindowProofRoot', 'quarantineHead', 'priorPrivacyObligationSetRoot', 'privacyReplayReceiptRoot', 'redeleteReceiptRoot', 'activationReceiptRoot', 'authorityRoot'],
  constraints: ['newRestoreIdentity-distinct-from-source-and-backup', 'all-digests-equal-bound-backup-evidence', 'quarantine-before-read-or-activation', 'R2-consistency-required', 'window-proof-required', 'privacy-replay-complete-before-activation', 'redelete-complete-before-activation-when-required', 'PURGED-never-resurrected'],
};
restoreEvidenceSchema.schemaRoot = recordDigest('CONNECT-RESTORE-EVIDENCE-V2-SCHEMA', restoreEvidenceSchema);
const backupRestoreV2 = { backupEvidenceSchema, restoreEvidenceSchema, actualBackupEvidence: [], actualRestoreEvidence: [], currentState: 'BLOCKED-NO-PROVIDER-EVIDENCE-NO-ACCEPTED-SOURCE-UNIVERSE' };

const mutableDependencyUniverse = [
  'candidateSubjectRawRoot', 'candidatePacketRawRoot', 'requirementBindingRoot', 'inheritedV4ManifestRoot', 'executableContractRawRoot', 'semanticGraphRawRoot',
  'b0AcceptanceHead', 'protocolAcceptanceHead', 'sourceUniverseAcceptanceHead', 'authorityEnvelopeHead', 'freezeHead', 'appointmentSetHead',
  'evaluatorPolicyHead', 'runnerAPolicyHead', 'runnerBPolicyHead', 'trustedTimePolicyHead', 'revocationHead', 'reviewGenerationOneHead',
  'reviewGenerationTwoHead', 'reconciliationHead', 'definitionAcceptanceHead', 'publicHardeningHead', 'dataLifecyclePolicyHead', 'retentionPolicyHead',
  'backupPolicyHead', 'restorePolicyHead', 'severityPolicyHead', 'missingValuePolicyHead', 'canonicalSchemaHead', 'parserSchemaHead',
].map((headName, i) => ({ headId: `MHEAD-${String(i + 1).padStart(2, '0')}`, headName, required: true, missingBehavior: 'BLOCK', changeBehavior: 'INVALIDATE-ALL-DEPENDENT-RECEIPTS', currentRoot: 'MISSING/DETACHED-OR-EXTERNAL-BINDING' }));
const invalidationContract = {
  schemaVersion: 'CONNECT-TRD2V5-INVALIDATION-BINDING-V1', universeClosed: true, heads: mutableDependencyUniverse,
  constructor: 'collectionRoot(CONNECT-TRD2V5-INVALIDATION-HEADS-V1, sorted exact {headId,headName,currentRoot})',
  snapshotOperation: { preReadback: true, expectedHeadCas: true, fencingToken: true, trustedTimeReceipt: true, postReadbackCount: 2, readbacksMustEqual: true },
  staleRule: 'ANY-HEAD-CHANGE-ADD-REMOVE-REVOKE-OR-CONFLICT-REJECTS-OLD-RECEIPT', splitHeadRule: 'BLOCK', replayRule: 'BLOCK-UNLESS-IDEMPOTENT-SAME-OPERATION-SAME-HEAD',
};
invalidationContract.contractRoot = recordDigest('CONNECT-TRD2V5-INVALIDATION-CONTRACT-V1', invalidationContract);

const reviewOperations = [
  {
    operationId: 'REVIEW-OP-GENERATION-SEAL', operation: 'GENERATION-SEAL', allowedGenerationIds: ['GENERATION-1', 'GENERATION-2'],
    required: ['candidatePacketRawRoot', 'mandatoryRootSetRoot', 'protocolAcceptanceRoot', 'appointmentSetRoot', 'reviewerIdentityRoot', 'independenceEvidenceRoot', 'completeFindingSetRoot', 'completeResultReceiptSetRoot', 'expectedGenerationHead', 'fenceToken', 'idempotencyKey', 'trustedTimeReceiptRoot', 'preReadbackRoot'],
    atomicRule: 'CAS EMPTY generation head to one immutable sealed generation; no overwrite; one reviewer/controller root cannot occupy both generations',
    postReadbacks: 2, failureTerminal: 'REVIEW-GENERATION-SEAL-BLOCKED',
  },
  {
    operationId: 'REVIEW-OP-RECONCILE', operation: 'RECONCILE', allowedGenerationIds: [],
    required: ['generationOneRoot', 'generationTwoRoot', 'losslessUnionFindingRoot', 'exactNoMergeKeySetRoot', 'oneDispositionPerFindingRoot', 'dispositionAuthorityRoot', 'expectedReconciliationHead', 'fenceToken', 'idempotencyKey', 'trustedTimeReceiptRoot', 'preReadbackRoot'],
    atomicRule: 'CAS EMPTY reconciliation head to exactly one immutable lossless union; P0/P1 cannot risk-accept; P2/P3 require explicit accepted Protocol authority; missing/conflict stays open veto',
    postReadbacks: 2, failureTerminal: 'RECONCILIATION-BLOCKED',
  },
  {
    operationId: 'REVIEW-OP-DEFINITION-ACCEPT', operation: 'DEFINITION-ACCEPT', allowedGenerationIds: [],
    required: ['candidatePacketRawRoot', 'mandatoryRootSetRoot', 'generationOneRoot', 'generationTwoRoot', 'reconciliationRoot', 'allResultReceiptsRoot', 'openVetoSetRoot', 'oneUseAcceptanceAuthorityRoot', 'expectedAcceptanceHead', 'fenceToken', 'idempotencyKey', 'trustedTimeReceiptRoot', 'preReadbackRoot'],
    atomicRule: 'CAS EMPTY acceptance head to one complete immutable envelope or commit zero durable members; consume one-use authority in same transaction; no self-approval',
    postReadbacks: 2, failureTerminal: 'DEFINITION-ACCEPTANCE-BLOCKED',
  },
];
for (const op of reviewOperations) {
  op.transitionProgram = [
    { step: 1, opcode: 'READ-CURRENT-HEAD', output: 'preReadbackRoot' },
    { step: 2, opcode: 'ASSERT-HEAD-EQUALS-EXPECTED', onFalse: op.failureTerminal },
    { step: 3, opcode: 'ASSERT-APPOINTMENT-CURRENT-NOT-REVOKED', onFalse: op.failureTerminal },
    { step: 4, opcode: 'ASSERT-TRUSTED-TIME-WITHIN-AUTHORITY-WINDOW', onFalse: op.failureTerminal },
    { step: 5, opcode: 'ASSERT-NO-SELF-APPROVAL-AND-REQUIRED-SEPARATION', onFalse: op.failureTerminal },
    { step: 6, opcode: 'BUILD-CANONICAL-COMPLETE-NEXT-ENVELOPE', onFalse: op.failureTerminal },
    { step: 7, opcode: 'CAS-HEAD-AND-CONSUME-ONE-USE-AUTHORITY', onFalse: op.failureTerminal },
    { step: 8, opcode: 'READ-CURRENT-HEAD-TWICE', onFalse: op.failureTerminal },
    { step: 9, opcode: 'ASSERT-BOTH-READBACKS-EQUAL-COMMITTED-ROOT', onFalse: op.failureTerminal },
  ];
  op.crashRecovery = { beforeCas: 'ZERO-COMMIT', afterCasBeforeReply: 'IDEMPOTENT-READBACK-RETURNS-ONE-EXACT-COMMIT', partialMembersVisible: false };
  op.operationRoot = recordDigest('CONNECT-TRD2V5-REVIEW-ATOMIC-OPERATION-V1', op);
}
const terminalAcceptanceCriteria = {
  schemaVersion: 'CONNECT-TRD2V5-TERMINAL-REVIEW-ACCEPTANCE-CRITERIA-V1',
  p0P1: 'EXACT-OPEN-SET-MUST-BE-EMPTY', p2P3: 'EVERY-MEMBER-REQUIRES-EXPLICIT-PROTOCOL-AUTHORIZED-DISPOSITION',
  selfApproval: 'FORBIDDEN-ACROSS-PRODUCER-REVIEWER-CONTROLLER-ACCEPTANCE-AUTHORITY', generations: 'EXACTLY-TWO-SEALED-EVIDENCE-DISJOINT-ELIGIBLE-GENERATIONS',
  convergence: 'A fresh hostile review that produces zero new P0/P1 and validly dispositions every P2/P3 may terminate in reconciliation and Acceptance; no recursive successor is required merely to prove absence of hypothetical future findings',
  failClosedRouting: { missing: 'DEFINITION-INPUT-MISSING', stale: 'VALIDATION-RESULT-STALE', conflict: 'DEFINITION-INPUT-CONFLICT', revoked: 'DEFINITION-AUTHORITY-REVOKED', concurrent: 'DEFINITION-CAS-CONFLICT', partial: 'DEFINITION-PARTIAL-COMMIT-RECOVERY' },
  currentStatus: 'UNSATISFIED; ACCEPTANCE-ZERO',
};
terminalAcceptanceCriteria.criteriaRoot = recordDigest('CONNECT-TRD2V5-TERMINAL-CRITERIA-V1', terminalAcceptanceCriteria);
const contractVectors = reviewOperations.flatMap(op => vectorModes.map(mode => exactVector({
  vectorId: `REVTV-${op.operationId}-${mode}`, family: 'REVIEW-ATOMIC-OPERATION', targetId: op.operationId, mode, baseRoot: op.operationRoot,
  pointer: `/reviewOperations/${op.operationId}`, failureTerminal: op.failureTerminal,
})));

const executableVectorSchema = {
  schemaVersion: 'CONNECT-TRD2V5-EXECUTABLE-VECTOR-SCHEMA-V1', additionalProperties: false,
  required: ['vectorId', 'schemaVersion', 'family', 'targetId', 'mode', 'inputRoots', 'preState', 'operation', 'expectedPostState', 'expectedTerminal', 'sideEffectOracle', 'readbackOracle', 'realFixture', 'deterministic', 'vectorRoot'],
  modes: vectorModes, operationOpcodes: ['VERIFY-EXACT-BOUND-STATE', 'REPLACE-BOUND-VALUE', 'REMOVE-REQUIRED-FIELD', 'CAS-TWO-WRITERS', 'CRASH-AFTER-PREPARE-BEFORE-COMMIT'],
  genericLabelAllowed: false, exactFrozenInputRootsRequired: true, businessOrPersonalDataAllowed: false,
};
executableVectorSchema.schemaRoot = recordDigest('CONNECT-TRD2V5-EXECUTABLE-VECTOR-SCHEMA-V1', executableVectorSchema);
const semanticProgramSchema = {
  schemaVersion: 'CONNECT-TRD2V5-SEMANTIC-PROGRAM-SCHEMA-V1', additionalProperties: false,
  required: ['predicateId', 'requirementId', 'boundInputRefs', 'expectedInputRoots', 'executionOrder', 'assertions', 'passRule', 'missingRule', 'staleRule', 'conflictRule', 'failureTerminal', 'vectorIds', 'actualResultReceipt', 'semanticProgramRoot'],
  declaredOperators: [...new Set(semanticPredicates.flatMap(p => p.assertions.map(a => a.op)))], operatorSemantics: 'Each operator is a closed assertion over the named exact registry field(s); unknown operator/argument/additional field blocks',
  passRule: 'ALL assertion results true AND exact five expected immutable vector receipt roots present AND both readbacks equal current invalidation snapshot',
  resultValues: ['PASS', 'FAIL', 'BLOCKED'], missingOrUnknown: 'BLOCKED',
};
semanticProgramSchema.schemaRoot = recordDigest('CONNECT-TRD2V5-SEMANTIC-PROGRAM-SCHEMA-V1', semanticProgramSchema);

const allowedMachineTypes = ['Null', 'Boolean', 'SafeInteger', 'UInt64Safe', 'Utf8RawString', 'Bytes32LowerHex', 'TimestampUtc', 'RootBinding', 'PredicateAst', 'TestVector', 'Receipt', 'TransitionReceipt', 'Array<Bytes32LowerHex>', 'Array<Utf8RawString>', 'Set<Bytes32LowerHex>', 'Set<Utf8RawString>', 'TransitionReceiptSet'];
function closedSchema(schemaId, properties, invariantAst) {
  const row = { schemaId, profileRoot: canonicalSchema.schemaRoot, additionalProperties: false, properties,
    required: Object.keys(properties), invariantAst, unknownFieldTerminal: 'CANONICAL-UNKNOWN-KEY', typeMismatchTerminal: 'CANONICAL-TYPE-MISMATCH' };
  row.schemaRoot = recordDigest('CONNECT-TRD2V5-CLOSED-MACHINE-SCHEMA-V1', row); return row;
}
const closedMachineSchemas = [
  closedSchema('RequirementRootBinding', { bindingId: 'Utf8RawString', requirementId: 'Utf8RawString', subjectRawSha256: 'Bytes32LowerHex', packetRawSha256: 'Bytes32LowerHex', semanticProgramRoot: 'Bytes32LowerHex' }, { op: 'ALL-ROOTS-EXACT-AND-CURRENT' }),
  closedSchema('SemanticPredicateProgram', { predicateId: 'Utf8RawString', requirementId: 'Utf8RawString', semanticProgramRoot: 'Bytes32LowerHex', vectorIds: 'Set<Utf8RawString>', actualResultReceipt: 'Null' }, { op: 'EXACT-FIVE-VECTORS-AND-ALL-ASSERTIONS' }),
  closedSchema('ExecutableVector', { vectorId: 'Utf8RawString', family: 'Utf8RawString', targetId: 'Utf8RawString', mode: 'Utf8RawString', vectorRoot: 'Bytes32LowerHex' }, { op: 'PRE-OP-POST-TERMINAL-SIDE-EFFECT-READBACK-COMPLETE' }),
  closedSchema('VectorOutcomeReceipt', { vectorId: 'Utf8RawString', observed: 'Utf8RawString', terminal: 'Utf8RawString', sideEffects: 'UInt64Safe', readbackRoot: 'Bytes32LowerHex' }, { op: 'OBSERVED-EQUALS-EXPECTED-ORACLE' }),
  closedSchema('ParserExecutionReceipt', { engineSourceRoot: 'Bytes32LowerHex', captureCollectionRoot: 'Bytes32LowerHex', fieldMapCollectionRoot: 'Bytes32LowerHex', envelopeResultRoots: 'Set<Bytes32LowerHex>' }, { op: 'EIGHT-CAPTURES-128-PARTS-84-ENVELOPES' }),
  closedSchema('AtomicChildResultReceipt', { childId: 'Utf8RawString', predicateRoot: 'Bytes32LowerHex', vectorReceiptRoots: 'Set<Bytes32LowerHex>', result: 'Utf8RawString' }, { op: 'EXACT-FIVE-PASS-VECTORS-NO-SHARED-CREDIT' }),
  closedSchema('MissingValueTransitionReceipt', { missingValueId: 'Utf8RawString', priorHead: 'Bytes32LowerHex', newHead: 'Bytes32LowerHex', transitionId: 'Utf8RawString', authorityRoot: 'Bytes32LowerHex', fenceToken: 'Utf8RawString', commitIndex: 'UInt64Safe' }, { op: 'LEGAL-TRANSITION-AND-CAS-ONE-WINNER' }),
  closedSchema('PublicHardeningGateReceipt', { gateId: 'Utf8RawString', controlId: 'Utf8RawString', vectorReceiptRoots: 'Set<Bytes32LowerHex>', publicSurfaceScanRoot: 'Bytes32LowerHex', result: 'Utf8RawString' }, { op: 'PUBLIC-INVARIANT-AND-PRIVATE-PATH-ZERO' }),
  closedSchema('SeverityEvent', { eventId: 'Utf8RawString', envelopeId: 'Utf8RawString', priorVersion: 'UInt64Safe', newSeverity: 'Utf8RawString', expectedHead: 'Bytes32LowerHex', authorityRoot: 'Bytes32LowerHex', commitIndex: 'UInt64Safe' }, { op: 'APPEND-ONLY-CAS-AUTHORIZED' }),
  closedSchema('DataLifecycleTransitionReceipt', { transitionId: 'Utf8RawString', dataClassId: 'Utf8RawString', priorHead: 'Bytes32LowerHex', newHead: 'Bytes32LowerHex', event: 'Utf8RawString', providerStoreIdentityRoot: 'Bytes32LowerHex', result: 'Utf8RawString' }, { op: 'EXACT-CLASS-STATE-EVENT-ROW-AND-GUARD' }),
  closedSchema('RetentionPlanV2', { planId: 'Utf8RawString', planDigest: 'Bytes32LowerHex', policyVersion: 'Bytes32LowerHex', issuedAt: 'TimestampUtc', expiresAt: 'TimestampUtc', candidateIdentitySetRoot: 'Bytes32LowerHex', providerAuthorizationSetRoot: 'Bytes32LowerHex', expectedLifecycleHead: 'Bytes32LowerHex' }, { op: 'UNEXPIRED-CURRENT-POLICY-INACTIVE-NOT-HELD-EXACT-SET' }),
  closedSchema('AtomicDeleteReceiptV2', { deleteOperationId: 'Utf8RawString', planDigest: 'Bytes32LowerHex', providerConfirmedIdentitySetRoot: 'Bytes32LowerHex', expectedHead: 'Bytes32LowerHex', commitReceiptRoot: 'Bytes32LowerHex', terminal: 'Utf8RawString' }, { op: 'CONFIRMED-SUBSET-OF-AUTHORIZED-AND-ATOMIC-COMMIT' }),
  closedSchema('BackupEvidenceV2', { backupId: 'Utf8RawString', databaseSnapshotDigest: 'Bytes32LowerHex', objectManifestDigest: 'Bytes32LowerHex', r2ConsistencyProofRoot: 'Bytes32LowerHex', retentionWindowStart: 'TimestampUtc', retentionWindowEnd: 'TimestampUtc' }, { op: 'BACKUP-ID-BINDS-DIGESTS-R2-AND-PROVED-WINDOW' }),
  closedSchema('RestoreEvidenceV2', { restoreId: 'Utf8RawString', newRestoreIdentity: 'Utf8RawString', backupId: 'Utf8RawString', backupEvidenceRoot: 'Bytes32LowerHex', privacyReplayReceiptRoot: 'Bytes32LowerHex', activationReceiptRoot: 'Bytes32LowerHex' }, { op: 'DISTINCT-IDENTITY-QUARANTINE-PRIVACY-REPLAY-BEFORE-ACTIVE' }),
  closedSchema('ReviewGenerationReceipt', { generationId: 'Utf8RawString', candidatePacketRoot: 'Bytes32LowerHex', appointmentSetRoot: 'Bytes32LowerHex', reviewerIdentityRoot: 'Bytes32LowerHex', findingSetRoot: 'Bytes32LowerHex', expectedHead: 'Bytes32LowerHex', commitIndex: 'UInt64Safe' }, { op: 'GENERATION-ID-ONE-OR-TWO-AND-DISJOINT-REVIEWER' }),
  closedSchema('ReconciliationReceipt', { generationOneRoot: 'Bytes32LowerHex', generationTwoRoot: 'Bytes32LowerHex', losslessUnionFindingRoot: 'Bytes32LowerHex', dispositionSetRoot: 'Bytes32LowerHex', openVetoSetRoot: 'Bytes32LowerHex', commitIndex: 'UInt64Safe' }, { op: 'LOSSLESS-NOMERGE-UNION-ONE-DISPOSITION-EACH' }),
  closedSchema('DefinitionAcceptanceEnvelope', { candidatePacketRoot: 'Bytes32LowerHex', mandatoryRootSetRoot: 'Bytes32LowerHex', generationOneRoot: 'Bytes32LowerHex', generationTwoRoot: 'Bytes32LowerHex', reconciliationRoot: 'Bytes32LowerHex', allResultReceiptsRoot: 'Bytes32LowerHex', openVetoSetRoot: 'Bytes32LowerHex', issuedAt: 'TimestampUtc' }, { op: 'P0-P1-ZERO-P2-P3-AUTHORIZED-NO-SELF-APPROVAL-EXACT-TWO-GENERATIONS' }),
];
const usedMachineTypes = new Set(closedMachineSchemas.flatMap(s => Object.values(s.properties)));
const undeclaredMachineTypes = [...usedMachineTypes].filter(t => !allowedMachineTypes.includes(t));
assert(undeclaredMachineTypes.length === 0, `undeclared machine types ${undeclaredMachineTypes}`);
const schemaOracleCorpus = closedMachineSchemas.flatMap((s, i) => [
  { corpusId: `SCHEMA-${String(i + 1).padStart(2, '0')}-POSITIVE`, schemaId: s.schemaId, mutation: 'NONE-USE-TYPED-REAL-ROOT-FIXTURE', expected: 'ACCEPT' },
  { corpusId: `SCHEMA-${String(i + 1).padStart(2, '0')}-UNKNOWN`, schemaId: s.schemaId, mutation: 'ADD-UNKNOWN-PROPERTY', expected: 'REJECT', terminal: 'CANONICAL-UNKNOWN-KEY' },
  { corpusId: `SCHEMA-${String(i + 1).padStart(2, '0')}-TYPE`, schemaId: s.schemaId, mutation: 'REPLACE-FIRST-BYTES32-WITH-BOOLEAN', expected: 'REJECT', terminal: 'CANONICAL-TYPE-MISMATCH' },
]);
for (const c of schemaOracleCorpus) c.corpusRoot = recordDigest('CONNECT-TRD2V5-SCHEMA-ORACLE-CORPUS-V1', c);

const findingClosures = findingDefs.map((f, i) => {
  const assets = {
    0: ['parserContract', 'parser engine A/B receipts'], 1: ['canonicalSchema', 'canonicalCorpus'], 2: ['semanticGraph'],
    3: ['semanticPredicates'], 4: ['mainVectors', 'dual runner outcomes'], 5: ['invalidationContract', 'requirementRootBindings'],
    6: ['reviewOperations', 'terminalAcceptanceCriteria'], 7: ['missingValueMachines', 'missingValueVectors'],
    8: ['atomicChildren', 'atomicChildPredicates', 'atomicVectors'], 9: ['dataLifecycle.matrixRows'],
    10: ['retentionV2'], 11: ['backupRestoreV2'], 12: ['publicControls', 'publicHardeningGates', 'publicVectors'],
    13: ['severityBindings', 'severityEvents', 'severityVectors'], 14: ['portable Candidate capture', 'detached packet', 'requirementRootBindings'],
  }[i];
  const row = { findingId: f.findingId, noMergeKey: f.findingId, severity: i === 7 || i === 13 || i === 14 ? 'P1' : 'P0',
    remediationRequirementId: reqId(i), remediationAssets: assets, producerRemediationStatus: 'COMPLETE-CANDIDATE-PENDING-FRESH-INDEPENDENT-REVIEW',
    independentDisposition: 'NOT-YET-PERFORMED', accepted: false, closed: false, merged: false, suppressed: false, riskAccepted: false, closureTransferred: 0 };
  row.closureRecordRoot = recordDigest('CONNECT-TRD2V5-FINDING-CLOSURE-CANDIDATE-V1', row); return row;
});

const parserContract = {
  grammar: parserGrammar, schemas: parserSchemas,
  engineA: { path: path.relative(planning, P.engineA), sourceRoot: fileSha(P.engineA), language: 'Node.js', implementationIndependence: 'SEPARATE-SOURCE' },
  engineB: { path: path.relative(planning, P.engineB), sourceRoot: fileSha(P.engineB), language: 'Python', implementationIndependence: 'SEPARATE-SOURCE' },
  exactInputCaptures: v4FieldMap.sourceArtifacts.map(a => ({ alias: a.alias, contentAddress: a.contentAddress, bytes: a.bytes, captureRelativePath: a.captureRelativePath })),
  exactSourcePartLocatorIds: v4FieldMap.sourceRecordLocators.filter(x => x.locatorId.startsWith('SRL-')).map(x => x.locatorId),
  expected: { captures: 8, sourceParts: 128, envelopes: 84, fieldMapCollectionRoot: v4FieldMap.fieldMapCollectionRoot, occurrenceFieldMaps: 84 },
  negativeCorpus: [
    { vectorId: 'PARSE-N01-AMBIGUOUS', operation: 'ADD-SECOND-EQUAL-PRECEDENCE-GRAMMAR-RULE', expectedTerminal: 'PARSER-GRAMMAR-AMBIGUOUS' },
    { vectorId: 'PARSE-N02-UNKNOWN', operation: 'ADD-UNDECLARED-SCHEMA-FIELD', expectedTerminal: 'PARSER-DUPLICATE-SCHEMA-FIELD' },
    { vectorId: 'PARSE-N03-DUPLICATE', operation: 'DUPLICATE-DECLARED-FIELD-NAME', expectedTerminal: 'PARSER-DUPLICATE-SCHEMA-FIELD' },
    { vectorId: 'PARSE-N04-NORMALIZE', operation: 'NFC-NORMALIZE-CAPTURE-BYTES', expectedTerminal: 'PARSER-NORMALIZATION-FORBIDDEN' },
    { vectorId: 'PARSE-N05-OFFSET', operation: 'INCREMENT-OCCURRENCE-BYTE-OFFSET', expectedTerminal: 'PARSER-OFFSET-MISMATCH' },
    { vectorId: 'PARSE-N06-BIDI', operation: 'REORDER-U+200F-DISPLAY-ORDER-INTO-RAW-BYTES', expectedTerminal: 'PARSER-BIDI-REORDERED' },
  ], actualReceipts: 'DETACHED-AFTER-PACKET', currentStatus: 'READY-FOR-DUAL-EXECUTION',
};

const spec = {
  schemaVersion: 'CONNECT-TRD2V5-EXECUTABLE-DEFINITION-CONTRACT-V1', artifactClass: 'PLANNING-ONLY; MACHINE-EXECUTABLE-CANDIDATE; NOT-ACCEPTANCE',
  immutableInputs: Object.fromEntries(Object.entries(EXPECTED)),
  subject: { pathAdvisoryOnly: O.subject, contentAddress: `sha256:${subjectPhysical.sha256}`, captureRelativePath: path.relative(planning, O.subjectCapture), ...subjectPhysical },
  inheritedV4Manifest: { rawRoot: fileSha(O.inherited), collectionRoot: inheritedCollectionRoot, denominator: 113 },
  canonicalSchema, canonicalCorpus, allowedMachineTypes, closedMachineSchemas, undeclaredMachineTypes, schemaOracleCorpus, parserContract, semanticProgramSchema, executableVectorSchema,
  semanticPredicates, mainVectors, atomicParentRules, atomicChildren, atomicChildPredicates, atomicVectors,
  missingValueTransitionSchema, missingValueMachines, missingValueVectors,
  publicControls, publicHardeningGates, publicVectors,
  severityEventSchema, severityEvents, severityBindings, severityVectors,
  dataLifecycle, retentionV2, backupRestoreV2, invalidationContract, reviewOperations, terminalAcceptanceCriteria, contractVectors,
  findingClosures,
  currentState: { acceptedRequirements: 0, executedExternallyAppointedPredicates: 0, acceptedFindings: 0, reviewGenerations: 0, reconciliation: null, definitionAcceptance: null, gate29: 'BLOCKED', developmentFreeze: 'ACTIVE' },
  actualResultReceipts: [], actualReviewGenerations: [], actualReconciliation: null, actualDefinitionAcceptance: null,
  publicInvariant: 'PUBLIC', privatePathCount: 0, privateRemediationAllowed: false,
};
spec.roots = {
  semanticPredicateCollectionRoot: collectionRoot('CONNECT-TRD2V5-SEMANTIC-PREDICATES-V1', semanticPredicates, 'predicateId'),
  mainVectorCollectionRoot: collectionRoot('CONNECT-TRD2V5-MAIN-VECTORS-V1', mainVectors, 'vectorId'),
  atomicChildCollectionRoot: collectionRoot('CONNECT-TRD2V5-ATOMIC-CHILDREN-V1', atomicChildren, 'childId'),
  atomicPredicateCollectionRoot: collectionRoot('CONNECT-TRD2V5-ATOMIC-PREDICATES-V1', atomicChildPredicates, 'predicateId'),
  atomicVectorCollectionRoot: collectionRoot('CONNECT-TRD2V5-ATOMIC-VECTORS-V1', atomicVectors, 'vectorId'),
  missingValueMachineCollectionRoot: collectionRoot('CONNECT-TRD2V5-MISSING-VALUE-MACHINES-V1', missingValueMachines, 'missingValueId'),
  missingValueVectorCollectionRoot: collectionRoot('CONNECT-TRD2V5-MISSING-VALUE-VECTORS-V1', missingValueVectors, 'vectorId'),
  publicControlCollectionRoot: collectionRoot('CONNECT-TRD2V5-PUBLIC-CONTROLS-V1', publicControls, 'controlId'),
  publicGateCollectionRoot: collectionRoot('CONNECT-TRD2V5-PUBLIC-GATES-V1', publicHardeningGates, 'gateId'),
  publicVectorCollectionRoot: collectionRoot('CONNECT-TRD2V5-PUBLIC-VECTORS-V1', publicVectors, 'vectorId'),
  severityBindingCollectionRoot: collectionRoot('CONNECT-TRD2V5-SEVERITY-BINDINGS-V1', severityBindings, 'envelopeId'),
  severityEventCollectionRoot: collectionRoot('CONNECT-TRD2V5-SEVERITY-EVENTS-V1', severityEvents, 'eventId'),
  severityVectorCollectionRoot: collectionRoot('CONNECT-TRD2V5-SEVERITY-VECTORS-V1', severityVectors, 'vectorId'),
  findingClosureCollectionRoot: collectionRoot('CONNECT-TRD2V5-FINDING-CLOSURES-V1', findingClosures, 'findingId'),
  closedMachineSchemaCollectionRoot: collectionRoot('CONNECT-TRD2V5-CLOSED-MACHINE-SCHEMAS-V1', closedMachineSchemas, 'schemaId'),
  schemaOracleCorpusRoot: collectionRoot('CONNECT-TRD2V5-SCHEMA-ORACLE-CORPUS-V1', schemaOracleCorpus, 'corpusId'),
};
writeJson(O.spec, spec);
const specPhysical = physical(O.spec);

const nodes = []; const edges = []; const nodeSet = new Set(); const edgeSet = new Set();
function addNode(nodeId, nodeType, boundRoot, status = 'PRESENT') {
  assert(!nodeSet.has(nodeId), `duplicate node ${nodeId}`); nodeSet.add(nodeId);
  const row = { nodeId, nodeType, boundRoot, status }; row.nodeRoot = recordDigest('CONNECT-TRD2V5-GRAPH-NODE-V1', row); nodes.push(row); return nodeId;
}
function addEdge(from, to, edgeType, qualifier = '') {
  assert(nodeSet.has(from) && nodeSet.has(to), `edge endpoint ${from}->${to}`); assert(from !== to, `self edge ${from}`);
  const edgeId = `EDGE:${edgeType}:${from}:${to}:${qualifier}`; assert(!edgeSet.has(edgeId), `duplicate edge ${edgeId}`); edgeSet.add(edgeId);
  const row = { edgeId, from, to, edgeType, qualifier }; row.edgeRoot = recordDigest('CONNECT-TRD2V5-GRAPH-EDGE-V1', row); edges.push(row);
}
const acceptanceNode = addNode('ACCEPTANCE:DEFINITION', 'DefinitionAcceptance', 'MISSING/NOT-ACCEPTED', 'MISSING');
const freezeNode = addNode('FREEZE:DETACHED', 'DetachedFreeze', 'MISSING/EXTERNAL-FREEZE', 'MISSING');
for (const artifact of v4FieldMap.sourceArtifacts) addNode(`CAPTURE:${artifact.alias}`, 'SourceCapture', artifact.sha256);
for (const locator of v4FieldMap.sourceRecordLocators) {
  addNode(`LOCATOR:${locator.locatorId}`, 'PortableSourceLocator', locator.sha256);
  const alias = locator.artifactAlias || (locator.locatorId.startsWith('V2-LOC') ? 'V2' : null);
  if (alias && nodeSet.has(`CAPTURE:${alias}`)) addEdge(`CAPTURE:${alias}`, `LOCATOR:${locator.locatorId}`, 'ContainsPortableLocator');
}
for (const bidi of v4FieldMap.bidiRegistry) {
  addNode(`BIDI:${bidi.registryId}`, 'BidiControl', recordDigest('CONNECT-TRD2V5-BIDI-NODE-V1', bidi));
  addEdge(`LOCATOR:${bidi.locatorId}`, `BIDI:${bidi.registryId}`, 'ContainsBidiControl');
}
for (const b of blueprints) {
  addNode(`REQ:${b.requirementId}`, 'Requirement', semanticPredicates.find(p => p.requirementId === b.requirementId).semanticProgramRoot);
  addNode(`PRED:${b.requirementId}`, 'SemanticPredicate', semanticPredicates.find(p => p.requirementId === b.requirementId).semanticProgramRoot);
  addEdge(`PRED:${b.requirementId}`, `REQ:${b.requirementId}`, 'ProvesRequirement');
  addEdge(freezeNode, `REQ:${b.requirementId}`, 'FreezeReachability');
  for (const dep of b.dependencies) addEdge(`REQ:${dep}`, `REQ:${b.requirementId}`, 'ClosurePrerequisite');
}
for (const v of mainVectors) { addNode(`VECTOR:${v.vectorId}`, 'ExecutableVector', v.vectorRoot); addEdge(`VECTOR:${v.vectorId}`, `PRED:${v.targetId}`, 'TestsPredicate'); }
for (const c of atomicChildren) {
  addNode(`ACHILD:${c.childId}`, 'AtomicChild', c.childRoot); addEdge(`ACHILD:${c.childId}`, `REQ:${c.parentId}`, 'MandatoryAtomicChild');
}
for (const v of atomicVectors) { addNode(`AVECTOR:${v.vectorId}`, 'AtomicVector', v.vectorRoot); addEdge(`AVECTOR:${v.vectorId}`, `ACHILD:${v.targetId}`, 'TestsAtomicChild'); }
for (const m of missingValueMachines) addNode(`MISSING:${m.missingValueId}`, 'MissingValueMachine', m.machineRoot);
for (const v of missingValueVectors) { addNode(`MVECTOR:${v.vectorId}`, 'MissingValueVector', v.vectorRoot); addEdge(`MVECTOR:${v.vectorId}`, `MISSING:${v.targetId}`, 'TestsMissingValueMachine'); }
for (const c of publicControls) addNode(`PUBLIC:${c.controlId}`, 'PublicControl', c.controlRoot);
for (const g of publicHardeningGates) { addNode(`PUBLIC-GATE:${g.gateId}`, 'PublicHardeningGate', g.gateRoot); addEdge(`PUBLIC:${g.controlId}`, `PUBLIC-GATE:${g.gateId}`, 'ControlsGate'); }
for (const v of publicVectors) { addNode(`PVECTOR:${v.vectorId}`, 'PublicVector', v.vectorRoot); addEdge(`PVECTOR:${v.vectorId}`, `PUBLIC:${v.targetId}`, 'TestsPublicControl'); }
for (const c of lifecycleClasses) addNode(`DCLASS:${c.dataClassId}`, 'DataLifecycleClass', c.classRoot);
for (const t of matrixRows) { addNode(`DTRANS:${t.transitionId}`, 'DataLifecycleTransition', t.transitionRoot); addEdge(`DCLASS:${t.dataClassId}`, `DTRANS:${t.transitionId}`, 'DefinesClassTransition'); }
for (const s of severityBindings) addNode(`SEVERITY:${s.envelopeId}`, 'SeverityBinding', s.bindingRoot);
for (const e of severityEvents) { addNode(`SEVEVENT:${e.eventId}`, 'SeverityEvent', e.eventRoot); addEdge(`SEVEVENT:${e.eventId}`, `SEVERITY:${e.envelopeId}`, 'AppendsSeverityHistory'); }
addNode('APPOINTMENTS:SET', 'AppointmentSet', 'MISSING/EXTERNAL-APPOINTMENT-SET', 'MISSING');
for (const op of reviewOperations) addNode(`REVIEWOP:${op.operationId}`, 'ReviewAtomicOperation', op.operationRoot);
addEdge('APPOINTMENTS:SET', 'REVIEWOP:REVIEW-OP-GENERATION-SEAL', 'AuthorizesReviewOperation');
addEdge('REVIEWOP:REVIEW-OP-GENERATION-SEAL', 'REVIEWOP:REVIEW-OP-RECONCILE', 'PrecedesReviewOperation');
addEdge('REVIEWOP:REVIEW-OP-RECONCILE', 'REVIEWOP:REVIEW-OP-DEFINITION-ACCEPT', 'PrecedesReviewOperation');
addEdge('REVIEWOP:REVIEW-OP-DEFINITION-ACCEPT', acceptanceNode, 'MayCommitAcceptanceOnlyIfAllCriteriaPass');

const mandatoryRootFieldNames = [
  'candidatePacketCoreRoot', 'candidateRoot', 'candidateRequirementCollectionRoot', 'inheritedV4ManifestRoot', 'executableContractRoot', 'semanticGraphRoot',
  'requirementBindingRoot', 'v4SubjectRoot', 'v4InheritedManifestRoot', 'v4FieldMapManifestRoot', 'v4ControlRegistryRoot', 'v4PacketRoot',
  'v4ReviewRoot', 'v4FindingsRoot', 'publicCyberSuccessorRoot', 'parserGrammarRoot', 'canonicalSchemaRoot', 'semanticPredicateCollectionRoot',
  'mainVectorCollectionRoot', 'atomicChildCollectionRoot', 'atomicPredicateCollectionRoot', 'atomicVectorCollectionRoot', 'missingValueMachineCollectionRoot',
  'missingValueVectorCollectionRoot', 'publicControlCollectionRoot', 'publicGateCollectionRoot', 'publicVectorCollectionRoot', 'severityBindingCollectionRoot',
  'severityEventCollectionRoot', 'severityVectorCollectionRoot', 'dataLifecycleClassCollectionRoot', 'dataLifecycleTransitionCollectionRoot', 'retentionPlanSchemaRoot',
  'atomicDeleteSchemaRoot', 'backupEvidenceSchemaRoot', 'restoreEvidenceSchemaRoot', 'invalidationContractRoot', 'terminalAcceptanceCriteriaRoot',
  'b0AcceptanceRoot', 'protocolAcceptanceRoot', 'sourceUniverseAcceptanceRoot', 'authorityEnvelopeRoot', 'freezeReceiptRoot', 'appointmentSetRoot',
  'generationPairRoot', 'reconciliationRoot',
];
assert(mandatoryRootFieldNames.length === 46, `mandatory roots ${mandatoryRootFieldNames.length}`);
const knownMandatoryRoots = {
  candidateRoot: subjectPhysical.sha256, inheritedV4ManifestRoot: fileSha(O.inherited), executableContractRoot: specPhysical.sha256,
  v4SubjectRoot: EXPECTED.v4Subject, v4InheritedManifestRoot: EXPECTED.v4Inherited, v4FieldMapManifestRoot: EXPECTED.v4FieldMap,
  v4ControlRegistryRoot: EXPECTED.v4Controls, v4PacketRoot: EXPECTED.v4Packet, v4ReviewRoot: EXPECTED.v4Review, v4FindingsRoot: EXPECTED.v4Findings,
  publicCyberSuccessorRoot: EXPECTED.publicCyber, parserGrammarRoot: parserGrammar.grammarRoot, canonicalSchemaRoot: canonicalSchema.schemaRoot,
  semanticPredicateCollectionRoot: spec.roots.semanticPredicateCollectionRoot, mainVectorCollectionRoot: spec.roots.mainVectorCollectionRoot,
  atomicChildCollectionRoot: spec.roots.atomicChildCollectionRoot, atomicPredicateCollectionRoot: spec.roots.atomicPredicateCollectionRoot,
  atomicVectorCollectionRoot: spec.roots.atomicVectorCollectionRoot, missingValueMachineCollectionRoot: spec.roots.missingValueMachineCollectionRoot,
  missingValueVectorCollectionRoot: spec.roots.missingValueVectorCollectionRoot, publicControlCollectionRoot: spec.roots.publicControlCollectionRoot,
  publicGateCollectionRoot: spec.roots.publicGateCollectionRoot, publicVectorCollectionRoot: spec.roots.publicVectorCollectionRoot,
  severityBindingCollectionRoot: spec.roots.severityBindingCollectionRoot, severityEventCollectionRoot: spec.roots.severityEventCollectionRoot,
  severityVectorCollectionRoot: spec.roots.severityVectorCollectionRoot, dataLifecycleClassCollectionRoot: dataLifecycle.classCollectionRoot,
  dataLifecycleTransitionCollectionRoot: dataLifecycle.transitionCollectionRoot, retentionPlanSchemaRoot: retentionPlanSchema.schemaRoot,
  atomicDeleteSchemaRoot: atomicDeleteSchema.schemaRoot, backupEvidenceSchemaRoot: backupEvidenceSchema.schemaRoot,
  restoreEvidenceSchemaRoot: restoreEvidenceSchema.schemaRoot, invalidationContractRoot: invalidationContract.contractRoot,
  terminalAcceptanceCriteriaRoot: terminalAcceptanceCriteria.criteriaRoot,
};
for (const name of mandatoryRootFieldNames) {
  const currentRoot = knownMandatoryRoots[name] || `MISSING/DETACHED-OR-EXTERNAL:${name}`;
  addNode(`AINPUT:${name}`, 'AcceptanceInput', currentRoot, currentRoot.startsWith('MISSING/') ? 'MISSING' : 'PRESENT');
  addEdge(`AINPUT:${name}`, acceptanceNode, 'MandatoryAcceptanceInput');
}
// Every semantic member is deliberately placed on a typed Freeze -> member -> Acceptance path.
// These are contract-reachability edges, not evidence that the external Freeze or Acceptance exists.
for (const member of [...nodes]) {
  if ([freezeNode, acceptanceNode].includes(member.nodeId)) continue;
  addEdge(freezeNode, member.nodeId, 'FreezeIncludesMandatoryMember');
  addEdge(member.nodeId, acceptanceNode, 'MandatoryMemberForAcceptance');
}
const familyCounts = nodes.reduce((a, n) => { a[n.nodeType] = (a[n.nodeType] || 0) + 1; return a; }, {});
const nodeCollectionRoot = collectionRoot('CONNECT-TRD2V5-GRAPH-NODES-V1', nodes, 'nodeId');
const edgeCollectionRoot = collectionRoot('CONNECT-TRD2V5-GRAPH-EDGES-V1', edges, 'edgeId');
const typedGraphRoot = recordDigest('CONNECT-TRD2V5-TYPED-GRAPH-V1', { nodeCollectionRoot, edgeCollectionRoot, nodeCount: nodes.length, edgeCount: edges.length });
const graph = {
  schemaVersion: 'CONNECT-TRD2V5-COMPLETE-SEMANTIC-GRAPH-V1', nodes, edges, nodeCollectionRoot, edgeCollectionRoot, typedGraphRoot,
  nodeCount: nodes.length, edgeCount: edges.length, familyCounts, acceptanceInputCount: mandatoryRootFieldNames.length,
  acceptanceEdgeCount: edges.filter(e => e.edgeType === 'MandatoryAcceptanceInput').length,
  omittedMandatoryFamilies: [], danglingCount: 0, duplicateNodeCount: 0, duplicateEdgeCount: 0, selfEdgeCount: 0,
  membershipProof: { expectedRequirementIds: blueprints.map(b => b.requirementId), expectedAtomicChildIds: atomicChildren.map(c => c.childId), expectedPublicControlIds: publicControls.map(c => c.controlId), expectedLifecycleTransitionIds: matrixRows.map(t => t.transitionId), expectedAcceptanceInputs: mandatoryRootFieldNames },
  mutationCorpus: ['OMIT-NODE', 'ADD-UNKNOWN-NODE', 'WRONG-NODE-TYPE', 'REVERSE-EDGE', 'REPLACE-MEMBER-SAME-COUNT', 'DANGLING-EDGE', 'DUPLICATE-EDGE', 'SELF-EDGE', 'CYCLE-DEPENDENCY', 'OMIT-ACCEPTANCE-INPUT'].map((operation, i) => ({ vectorId: `GRAPH-N${String(i + 1).padStart(2, '0')}`, operation, expected: 'BLOCK', terminal: 'TYPED-SEMANTIC-GRAPH-BLOCKED' })),
  publicInvariant: 'PUBLIC', currentAcceptance: 0,
};
writeJson(O.graph, graph);
const graphPhysical = physical(O.graph);

const candidateRequirementCollectionRoot = collectionRoot('CONNECT-TRD2V5-REQUIREMENT-COLLECTION-V1', blueprints.map((b, i) => ({ requirementId: b.requirementId, semanticProgramRoot: semanticPredicates[i].semanticProgramRoot, outputType: b.outputType })), 'requirementId');
const packetCore = {
  schemaVersion: 'CONNECT-TRD2V5-DETACHED-PACKET-CORE-V1', candidateArtifactId: 'CONNECT-SECTION-35-6-TRD-2-V5-IMMUTABLE-SUCCESSOR-REQUIREMENTS-2026-08-29-V1',
  candidateRoot: subjectPhysical.sha256, candidateBytes: subjectPhysical.bytes, candidateLines: subjectPhysical.lines,
  candidateContentAddress: `sha256:${subjectPhysical.sha256}`, candidateCaptureRelativePath: path.relative(planning, O.subjectCapture),
  inheritedV4ManifestRoot: fileSha(O.inherited), executableContractRoot: specPhysical.sha256, semanticGraphRoot: graphPhysical.sha256,
  candidateRequirementCollectionRoot, exactRequirementDenominator: 128, exactCorrectionDenominator: 15, exactInheritedDenominator: 113,
  mandatoryRootFieldNames, publicInvariant: 'PUBLIC', privatePathCount: 0,
};
const packetCoreRoot = recordDigest('CONNECT-TRD2V5-DETACHED-PACKET-CORE-V1', packetCore);
const packet = {
  ...packetCore, packetCoreRoot,
  acquisitionContract: { absoluteOriginalPathRole: 'ADVISORY-ONLY', resolutionOrder: ['packet-relative-capture', 'repository-relative-content-address'], symlinkFollowing: false, hashBeforeParse: true, missingTerminal: 'PORTABLE-PACKET-BLOCKED', wrongRootTerminal: 'PORTABLE-PACKET-BLOCKED' },
  acquisitionVectors: [
    ['ACQ-POSITIVE', 'READ-PACKET-RELATIVE-CAPTURE-AND-HASH', 'PASS', 'NONE'], ['ACQ-MISSING', 'REMOVE-CAPTURE', 'BLOCKED', 'PORTABLE-PACKET-BLOCKED'],
    ['ACQ-PATH-SUBSTITUTE', 'USE-ABSOLUTE-ADVISORY-PATH', 'BLOCKED', 'PORTABLE-PACKET-BLOCKED'], ['ACQ-SYMLINK', 'REPLACE-CAPTURE-WITH-SYMLINK', 'BLOCKED', 'PORTABLE-PACKET-BLOCKED'],
    ['ACQ-WRONG-ROOT', 'REPLACE-ONE-CANDIDATE-BYTE', 'BLOCKED', 'PORTABLE-PACKET-BLOCKED'], ['ACQ-POST-FREEZE', 'MUTATE-CAPTURE-AFTER-PACKET', 'BLOCKED', 'PORTABLE-PACKET-BLOCKED'],
  ].map(x => ({ vectorId: x[0], operation: x[1], expectedResult: x[2], expectedTerminal: x[3], expectedCandidateRoot: subjectPhysical.sha256 })),
  artifactRoots: { inherited: fileSha(O.inherited), subject: subjectPhysical.sha256, spec: specPhysical.sha256, graph: graphPhysical.sha256 },
  requirementRootBindings: { state: 'DETACHED-AFTER-PACKET', expectedDenominator: 128 },
  externalPrerequisites: { b0AcceptanceRoot: null, protocolAcceptanceRoot: null, sourceUniverseAcceptanceRoot: null, authorityEnvelopeRoot: null, freezeReceiptRoot: null, appointmentSetRoot: null, evaluatorRoot: null, runnerARoot: null, runnerBRoot: null },
  currentState: { acceptedRequirements: 0, acceptedFindings: 0, reviewGenerations: 0, reconciliation: null, definitionAcceptance: null, gate29: 'BLOCKED', developmentFreeze: 'ACTIVE' },
  publicInvariant: 'PUBLIC', privatePathCount: 0, privateRemediationAllowed: false,
};
writeJson(O.packet, packet);
const packetPhysical = physical(O.packet);
const bindingRows = blueprints.map((b, i) => {
  const row = { bindingId: `RB-${b.requirementId}`, requirementId: b.requirementId, subjectRawSha256: subjectPhysical.sha256,
    packetRawSha256: packetPhysical.sha256, packetCoreRoot, executableContractRawSha256: specPhysical.sha256, semanticGraphRawSha256: graphPhysical.sha256,
    inheritedV4ManifestRawSha256: fileSha(O.inherited), semanticProgramRoot: semanticPredicates[i].semanticProgramRoot,
    predicateInputOverlayId: `PIO-${b.requirementId}`, requiredForPredicateEvaluation: true,
    acquisitionReceiptRule: 'HASH-PACKET-THEN-PACKET-RELATIVE-CANDIDATE-CAPTURE-BEFORE-ANY-REVIEW', staleRule: 'ANY-ROOT-CHANGE-INVALIDATES',
  }; row.bindingRoot = recordDigest('CONNECT-TRD2V5-REQUIREMENT-ROOT-BINDING-V1', row); return row;
});
writeJson(O.bindings, {
  schemaVersion: 'CONNECT-TRD2V5-REQUIREMENT-ROOT-BINDINGS-V1', artifactClass: 'DETACHED-POST-PACKET-RAW-BINDING; PLANNING-ONLY; NOT-ACCEPTANCE',
  subject: { contentAddress: `sha256:${subjectPhysical.sha256}`, captureRelativePath: path.relative(planning, O.subjectCapture), ...subjectPhysical },
  packet: { contentAddress: `sha256:${packetPhysical.sha256}`, relativePath: path.relative(planning, O.packet), ...packetPhysical },
  bindings: bindingRows, denominator: 128, bindingCollectionRoot: collectionRoot('CONNECT-TRD2V5-REQUIREMENT-ROOT-BINDINGS-V1', bindingRows, 'bindingId'),
  absolutePathsAdvisoryOnly: true, publicInvariant: 'PUBLIC', acceptanceCredit: 0,
});

if (fs.existsSync(O.qaA) && fs.existsSync(O.qaB)) {
  const qaA = JSON.parse(text(O.qaA)); const qaB = JSON.parse(text(O.qaB));
  const baseFields = ['subjectRoot', 'inheritedRoot', 'specRoot', 'graphRoot', 'packetRoot', 'bindingRoot'];
  const disagreements = [];
  for (const field of baseFields) if (qaA[field] !== qaB[field]) disagreements.push({ field, engineA: qaA[field], engineB: qaB[field] });
  const currentBaseRoots = { subjectRoot: fileSha(O.subject), inheritedRoot: fileSha(O.inherited), specRoot: fileSha(O.spec), graphRoot: fileSha(O.graph), packetRoot: fileSha(O.packet), bindingRoot: fileSha(O.bindings) };
  for (const field of baseFields) {
    if (qaA[field] !== currentBaseRoots[field]) disagreements.push({ field: `engineA.${field}.stale`, observed: qaA[field], current: currentBaseRoots[field] });
    if (qaB[field] !== currentBaseRoots[field]) disagreements.push({ field: `engineB.${field}.stale`, observed: qaB[field], current: currentBaseRoots[field] });
  }
  if (qaA.parserReplay.fieldMapCollectionRoot !== qaB.parserReplay.fieldMapCollectionRoot) disagreements.push({ field: 'parserReplay.fieldMapCollectionRoot', engineA: qaA.parserReplay.fieldMapCollectionRoot, engineB: qaB.parserReplay.fieldMapCollectionRoot });
  if (qaA.vectors.outcomeCollectionRoot !== qaB.vectors.outcomeCollectionRoot) disagreements.push({ field: 'vectors.outcomeCollectionRoot', engineA: qaA.vectors.outcomeCollectionRoot, engineB: qaB.vectors.outcomeCollectionRoot });
  const reconciliation = {
    schemaVersion: 'CONNECT-TRD2V5-DUAL-QA-RECONCILIATION-V1', engineAReceiptRawRoot: fileSha(O.qaA), engineBReceiptRawRoot: fileSha(O.qaB),
    engineASourceRoot: fileSha(P.engineA), engineBSourceRoot: fileSha(P.engineB), implementationCount: 2, languages: ['Node.js', 'Python'],
    parserInputs: { captures: 8, sourceParts: 128, envelopes: 84 }, parserFieldMapRoot: qaA.parserReplay.fieldMapCollectionRoot,
    vectorOutcomeDenominator: qaA.vectors.total, vectorOutcomeCollectionRoot: qaA.vectors.outcomeCollectionRoot,
    disagreements, disagreementCount: disagreements.length, suppressedDisagreements: 0,
    currentAcceptance: 0, currentReviewGenerations: 0, verdict: disagreements.length === 0 ? 'PASS-DUAL-MECHANICAL-CANDIDATE-NOT-ACCEPTANCE' : 'BLOCKED-DUAL-QA-DISAGREEMENT',
  };
  reconciliation.reconciliationReceiptRoot = recordDigest('CONNECT-TRD2V5-DUAL-QA-RECONCILIATION-V1', reconciliation);
  writeJson(O.reconciliation, reconciliation);
  const artifacts = [O.subject, O.inherited, O.spec, O.graph, O.packet, O.bindings, O.subjectCapture, P.engineA, P.engineB, O.qaA, O.qaB, O.reconciliation];
  const identities = artifacts.map(file => ({ path: file, ...physical(file) }));
  let qa = `# 1. Connect — TRD-2 v5 immutable successor requirements Producer QA\n\n`;
  qa += `## 1.1 Claim limit and immutable identities\n\n1.1.1 artifactClass=PLANNING-ONLY; PRODUCER-QA; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE; NOT-GATE-CREDIT.\n\n`;
  qa += `1.1.2 repositoryVisibility=PUBLIC; Private path count=0; Product/Git/GitHub/Build/Runtime/Deploy/Provider actions=0.\n\n`;
  for (let i = 0; i < identities.length; i += 1) qa += `1.1.${i + 3} path=${identities[i].path}; SHA-256=${identities[i].sha256}; physical=${identities[i].lines} lines/${identities[i].bytes} bytes.\n\n`;
  qa += `## 2. Exact denominators\n\n2.1 Requirements=128=15 correction+113 inherited; five ordered fields=128/128; accepted=0/128.\n\n`;
  qa += `2.2 semantic predicates=128; main executable vectors=640; actual externally appointed result receipts=0/128.\n\n`;
  qa += `2.3 parser captures=8; source parts=128; envelopes=84; independent parsers=2; Field-map disagreements=${disagreements.filter(x => x.field.includes('parser')).length}.\n\n`;
  qa += `2.4 atomic children=59; child predicates=59; vectors=295; child PASS receipts=0/59.\n\n`;
  qa += `2.5 MissingValue machines=27; executable vectors=135; actual transition receipts=0.\n\n`;
  qa += `2.6 DataLifecycle tuples=10×16×20=3200; missing=0; duplicate=0; active-delete ALLOW=0; Legal-Hold-delete ALLOW=0; admitted data identities=0 pending accepted Source Universe.\n\n`;
  qa += `2.7 Public controls=52; hardening gates=52; executable vectors=260; Public runtime scans executed=0; Private paths=0.\n\n`;
  qa += `2.8 severity bindings=84; nonempty genesis histories=84; vectors=420; SOE-050 transition remains pending external accepted reachability observation.\n\n`;
  qa += `2.9 dual vector outcomes=${qaA.vectors.total}; engine disagreements=${disagreements.length}; outcome root=${qaA.vectors.outcomeCollectionRoot}.\n\n`;
  qa += `## 3. One-to-one v4 Finding remediation ledger\n\n`;
  for (let i = 0; i < findingClosures.length; i += 1) {
    const f = findingClosures[i]; qa += `3.${i + 1} ${f.findingId}; noMergeKey=${f.noMergeKey}; remediationRequirement=${f.remediationRequirementId}; producerStatus=${f.producerRemediationStatus}; independentDisposition=${f.independentDisposition}; accepted=0; closed=0; closureTransferred=0.\n\n`;
  }
  qa += `## 4. Remaining zeros and terminal disposition\n\n4.1 external B0/Protocol/Source Universe/Authority/Freeze/Appointments/Evaluator/Runners=MISSING.\n\n`;
  qa += `4.2 actual Retention plans=0; deletion adapter connected=false; executed deletes=0; actual Backup Evidence v2=0; actual Restore Evidence v2=0.\n\n`;
  qa += `4.3 eligible independent review generations=0/2; Reconciliation=ABSENT; Definition Acceptance=ABSENT; accepted Findings=0/15; Gate29=BLOCKED; Development freeze=ACTIVE.\n\n`;
  qa += `4.4 Producer verdict=${reconciliation.verdict}. A fresh independent hostile review is mandatory and Producer QA cannot close any Finding.\n`;
  fs.writeFileSync(O.producerQa, qa);
  const finalArtifacts = [...identities, { path: O.producerQa, ...physical(O.producerQa) }];
  let support = `# 1. Connect — TRD-2 v5 support-manifest index\n\n## 1.1 Exact immutable outputs\n\n`;
  for (let i = 0; i < finalArtifacts.length; i += 1) support += `1.1.${i + 1} path=${finalArtifacts[i].path}; SHA-256=${finalArtifacts[i].sha256}; physical=${finalArtifacts[i].lines} lines/${finalArtifacts[i].bytes} bytes.\n\n`;
  support += `## 1.2 Denominators and claim limit\n\n1.2.1 Requirements=128; predicates=128; main vectors=640; atomic vectors=295; MVR vectors=135; Public vectors=260; severity vectors=420; review vectors=${contractVectors.length}.\n\n`;
  support += `1.2.2 lifecycle matrix=3200 exact class/state/event tuples; Public invariant=PUBLIC; Private paths=0.\n\n`;
  support += `1.2.3 Producer remediation candidates=15/15; independently accepted or closed=0/15; external result receipts=0/128; review generations=0/2; Acceptance=0.\n\n`;
  support += `1.2.4 no Product/Git/GitHub/Build/Runtime/Deploy/Provider action occurred.\n`;
  fs.writeFileSync(O.support, support);
  console.log(JSON.stringify({ phase: 'FINALIZED', subject: physical(O.subject), spec: physical(O.spec), graph: physical(O.graph), packet: physical(O.packet), bindings: physical(O.bindings), reconciliation: physical(O.reconciliation), producerQa: physical(O.producerQa), support: physical(O.support), disagreements: disagreements.length, acceptance: 0 }));
} else {
  console.log(JSON.stringify({ phase: 'BASE-GENERATED', subject: physical(O.subject), spec: physical(O.spec), graph: physical(O.graph), packet: physical(O.packet), bindings: physical(O.bindings), next: 'run both QA engines then rerun generator', acceptance: 0 }));
}
