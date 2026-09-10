import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = '/Users/tal/Documents/connect';
const planning = path.join(root, 'web/docs/planning');
const capturesDir = path.join(planning, 'section-35-6-trd-2-v4-source-captures');

const P = {
  v3: path.join(planning, 'section-35-6-trd-2-v3-lossless-closure-requirements-2026-08-29.md'),
  v3V2: path.join(planning, 'section-35-6-trd-2-v3-inherited-v2-requirement-byte-manifest-2026-08-29.md'),
  v3Obs: path.join(planning, 'section-35-6-trd-2-v3-lossless-source-observation-envelope-manifest-2026-08-29.md'),
  v3Controls: path.join(planning, 'section-35-6-trd-2-v3-closure-control-registries-2026-08-29.md'),
  review: path.join(planning, 'section-35-6-trd-2-v3-lossless-closure-requirements-independent-hostile-review-2026-08-29.md'),
  findings: path.join(planning, 'section-35-6-trd-2-v3-lossless-closure-requirements-independent-hostile-review-findings-manifest-2026-08-29.md'),
  publicCyber: path.join(planning, 'public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md'),
  v2: path.join(planning, 'section-35-6-trd-2-v2-review-closure-requirements-2026-08-29.md'),
  PR: path.join(planning, 'trd2-requirement-manifest-producer-coverage-audit-2026-08-29.md'),
  MR: path.join(planning, 'trd2-requirement-manifest-mathematical-hostile-review-2026-08-29.md'),
  MM: path.join(planning, 'trd2-requirement-manifest-mathematical-hostile-review-findings-manifest-2026-08-29.md'),
  SR: path.join(planning, 'trd2-requirement-manifest-security-hostile-review-2026-08-29.md'),
  SM: path.join(planning, 'trd2-requirement-manifest-security-hostile-review-findings-manifest-2026-08-29.md'),
  AR: path.join(planning, 'trd2-requirement-manifest-structural-hostile-review-2026-08-29.md'),
};

const EXPECTED = {
  v3: '797a027f604a6963758770fa9825345e4f0f636f1575be5370098b12806d772c',
  v3V2: '8ba8622f160e30855b5b3fdc6b5df195cbd9cb850979d7657e45381aa3b834ec',
  v3Obs: '392cb3fb7f289ac750dc227e28ec4e2ef5f9f2df7d9054571978faa68b3fadd3',
  v3Controls: 'caa5295bb280517535179a0ae88eaeba9285b3e866eaf7c0facda353fa09b6de',
  review: '143358b01da788dc7f38fa014d06f677b6d03ab48fb58a82ebfa3474083ca9de',
  findings: '9a44bf9e742613e9e4b2db2f93b680dc6fc9f70760fb305cb18824a65b175e75',
  publicCyber: '322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a',
};

const OUT = {
  inherited: path.join(planning, 'section-35-6-trd-2-v4-inherited-v3-requirement-byte-manifest-2026-08-29.json'),
  fieldMap: path.join(planning, 'section-35-6-trd-2-v4-field-map-and-portable-source-manifest-2026-08-29.json'),
  controls: path.join(planning, 'section-35-6-trd-2-v4-executable-closure-control-registries-2026-08-29.json'),
  subject: path.join(planning, 'section-35-6-trd-2-v4-immutable-successor-requirements-2026-08-29.md'),
  binding: path.join(planning, 'section-35-6-trd-2-v4-detached-candidate-packet-binding-2026-08-29.json'),
  summary: path.join(planning, 'section-35-6-trd-2-v4-support-manifests-2026-08-29.md'),
};

function bytes(file) { return fs.readFileSync(file); }
function text(file) { return bytes(file).toString('utf8'); }
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function fileSha(file) { return sha(bytes(file)); }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
function u64(n) { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; }
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
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function physical(file) {
  const b = bytes(file);
  return { sha256: sha(b), bytes: b.length, lines: b.length === 0 ? 0 : b.toString('utf8').split('\n').length - 1 };
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function exactRootGuard() {
  for (const [name, expected] of Object.entries(EXPECTED)) assert(fileSha(P[name]) === expected, `${name} root mismatch`);
}

function splitLinesWithOffsets(buffer) {
  const lines = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === 0x0a) {
      lines.push({ start, endExclusive: i + 1, raw: buffer.subarray(start, i + 1), text: buffer.subarray(start, i).toString('utf8') });
      start = i + 1;
    }
  }
  if (start < buffer.length) lines.push({ start, endExclusive: buffer.length, raw: buffer.subarray(start), text: buffer.subarray(start).toString('utf8') });
  return lines;
}

function parseFiveFieldRequirements(file, idPrefix, fieldNames) {
  const b = bytes(file);
  const lines = splitLinesWithOffsets(b);
  const heads = [];
  const re = new RegExp('^#{2,3} [^\\n]*`(' + idPrefix + '-\\d{3})`');
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].text.match(re);
    if (m) heads.push({ index: i, id: m[1] });
  }
  return heads.map(({ index, id }) => {
    let end = index;
    const fields = {};
    for (let j = index + 1; j < lines.length; j += 1) {
      const m = lines[j].text.match(/^- `([^`]+)`: (.*)$/);
      if (m && fieldNames.includes(m[1])) {
        fields[m[1]] = m[2];
        end = j;
        if (m[1] === fieldNames[fieldNames.length - 1]) break;
      }
    }
    assert(fieldNames.every(f => Object.hasOwn(fields, f)), `missing field in ${id}`);
    const slice = b.subarray(lines[index].start, lines[end].endExclusive);
    return {
      id,
      locator: `L${index + 1}-L${end + 1}`,
      bytes: slice.length,
      digest: sha(slice),
      fields,
      exactFieldOrder: fieldNames,
    };
  });
}

function parseMarkdownRow(line) {
  return line.trim().slice(1, -1).split('|').map(cell => cell.trim().replace(/^`|`$/g, ''));
}

function captureArtifact(file, authorityClass, parserSchemaId) {
  const b = bytes(file);
  const digest = sha(b);
  fs.mkdirSync(capturesDir, { recursive: true });
  const capture = path.join(capturesDir, `${digest}.bin`);
  if (!fs.existsSync(capture) || !bytes(capture).equals(b)) fs.writeFileSync(capture, b);
  return {
    artifactId: `SRC-${digest}`,
    originalPath: file,
    captureRelativePath: path.relative(planning, capture),
    contentAddress: `sha256:${digest}`,
    sha256: digest,
    bytes: b.length,
    mediaType: 'text/markdown; charset=utf-8',
    encoding: 'UTF-8',
    terminalLf: b.length > 0 && b[b.length - 1] === 0x0a,
    authorityClass,
    parserSchemaId,
    unavailableTerminal: 'PORTABLE-SOURCE-CAPTURE-BLOCKED',
  };
}

exactRootGuard();

const v3Requirements = parseFiveFieldRequirements(P.v3, 'TRD2V3-REQ', ['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis']);
assert(v3Requirements.length === 101, `v3 requirement count ${v3Requirements.length}`);
for (let i = 0; i < 101; i += 1) assert(v3Requirements[i].id === `TRD2V3-REQ-${String(i).padStart(3, '0')}`, `v3 sequence ${i}`);

const inheritedRows = v3Requirements.map((r, i) => ({
  manifestId: `V3R-${String(i).padStart(3, '0')}`,
  sourceRequirementId: r.id,
  locator: r.locator,
  bytes: r.bytes,
  recordDigest: r.digest,
  fieldProfile: 'TRD2V3-REQ-FIVE-V1',
  sourceFields: r.fields,
  sourceDependencies: r.fields.dependencies,
  status: 'PRESERVED-NOT-ACCEPTED',
}));
const inheritedCollectionRoot = collectionRoot('CONNECT-TRD2V4-INHERITED-V3-REQUIREMENTS-V1', inheritedRows, 'manifestId');
const inheritedRowBySourceId = new Map(inheritedRows.map(r => [r.sourceRequirementId, r]));
writeJson(OUT.inherited, {
  schemaVersion: 'CONNECT-TRD2V4-INHERITED-V3-BYTE-MANIFEST-V1',
  artifactClass: 'PLANNING-ONLY; IMMUTABLE-BYTE-PRESERVATION; NOT-ACCEPTANCE; NOT-GATE-CREDIT',
  sourceArtifact: { path: P.v3, ...physical(P.v3) },
  recordSliceContract: 'heading-through-sourceBasis-inclusive-terminal-LF; no following blank line',
  exactFieldOrder: ['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis'],
  denominator: 101,
  records: inheritedRows,
  recordCollectionRoot: inheritedCollectionRoot,
  preservation: { missing: 0, duplicate: 0, merged: 0, closureTransferred: 0, accepted: 0 },
  publicInvariant: 'PUBLIC',
  privateRemediationAllowed: false,
});

const sourceAliases = {
  PR: { file: P.PR, family: 'PRODUCER', authorityClass: 'REVIEWER-LOCAL-OBSERVATION' },
  MR: { file: P.MR, family: 'MATH', authorityClass: 'REVIEWER-LOCAL-OBSERVATION' },
  MM: { file: P.MM, family: 'MATH', authorityClass: 'REVIEWER-LOCAL-NORMALIZED-FINDING' },
  SR: { file: P.SR, family: 'SECURITY', authorityClass: 'REVIEWER-LOCAL-OBSERVATION' },
  SM: { file: P.SM, family: 'SECURITY', authorityClass: 'REVIEWER-LOCAL-NORMALIZED-FINDING' },
  AR: { file: P.AR, family: 'STRUCTURAL', authorityClass: 'REVIEWER-LOCAL-OBSERVATION' },
};

const parserSchemas = [
  {
    parserSchemaId: 'TRD2V4-PARSER-PRODUCER-V1',
    family: 'PRODUCER',
    grammar: 'heading := markdown-h2-with-backtick-id; field := numbered-prefix? label "=" backtick-value; multiple fields on one physical line are retained independently',
    fields: ['headingTitle', 'severity', 'defect', 'cause', 'observedD31RawSha256', 'physicalIdentity', 'claimLimit', 'impact', 'safeTerminal', 'acceptancePredicate'],
  },
  {
    parserSchemaId: 'TRD2V4-PARSER-MATH-V1',
    family: 'MATH',
    grammar: 'report heading+numbered label/value fields joined without overwrite to one exact normalized-manifest pipe-table row selected by local identity',
    fields: ['headingTitle', 'severity', 'subjectLocator', 'defect', 'mathematicalImpact', 'scheduleImpact', 'requiredDefinitionDelta', 'acceptancePredicate', 'sourceContractIds', 'sourceFindingIds', 'reportLocalId', 'reportSection', 'subjectRoot', 'defectClass', 'status', 'noMergeKey'],
  },
  {
    parserSchemaId: 'TRD2V4-PARSER-SECURITY-V1',
    family: 'SECURITY',
    grammar: 'report heading+numbered label/value fields joined without overwrite to one exact normalized-manifest pipe-table row selected by findingId',
    fields: ['headingTitle', 'severity', 'locator', 'evidence', 'defect', 'impact', 'requiredRemediation', 'safeTerminal', 'sourceBasis', 'findingId', 'status', 'mergeKey'],
  },
  {
    parserSchemaId: 'TRD2V4-PARSER-STRUCTURAL-V1',
    family: 'STRUCTURAL',
    grammar: 'heading := markdown-h2-with-backtick-id; field := numbered-prefix? label "=" backtick-value; every declared field receives PRESENT/MISSING/CONFLICT',
    fields: ['headingTitle', 'findingId', 'severity', 'subjectLocator', 'sourceBasis', 'defect', 'impact', 'requiredRemediation', 'acceptancePredicate', 'dependencies'],
  },
];
for (const schema of parserSchemas) schema.schemaRoot = recordDigest('CONNECT-TRD2V4-PARSER-SCHEMA-V1', { ...schema });
const parserByFamily = Object.fromEntries(parserSchemas.map(s => [s.family, s]));

const capturedSources = Object.entries(sourceAliases).map(([alias, s]) => ({
  alias,
  ...captureArtifact(s.file, s.authorityClass, parserByFamily[s.family].parserSchemaId),
}));
const v2Capture = captureArtifact(P.v2, 'IMMUTABLE-PREDECESSOR-CANDIDATE', 'TRD2V3-V2-REQ-FIVE-V1');
capturedSources.push({ alias: 'V2', ...v2Capture });
const v3Capture = captureArtifact(P.v3, 'IMMUTABLE-PREDECESSOR-CANDIDATE', 'TRD2V3-REQ-FIVE-V1');
capturedSources.push({ alias: 'V3', ...v3Capture });

function tableHeadersBefore(alias, lineNumber) {
  const lines = text(sourceAliases[alias].file).split('\n');
  for (let i = lineNumber - 2; i >= 0; i -= 1) {
    if (lines[i].startsWith('| ') && !lines[i].includes('---')) return parseMarkdownRow(lines[i]);
    if (lines[i].startsWith('#')) break;
  }
  return [];
}

const fieldAliases = {
  'acceptance predicate': 'acceptancePredicate',
  acceptancePredicate: 'acceptancePredicate',
  cause: 'cause',
  'claim limit': 'claimLimit',
  defect: 'defect',
  impact: 'impact',
  'observed D31 raw SHA-256': 'observedD31RawSha256',
  'physical identity': 'physicalIdentity',
  'safe terminal': 'safeTerminal',
  safeTerminal: 'safeTerminal',
  severity: 'severity',
  subjectLocator: 'subjectLocator',
  mathematicalImpact: 'mathematicalImpact',
  scheduleImpact: 'scheduleImpact',
  requiredDefinitionDelta: 'requiredDefinitionDelta',
  sourceContractIds: 'sourceContractIds',
  sourceFindingIds: 'sourceFindingIds',
  reportLocalId: 'reportLocalId',
  reportSection: 'reportSection',
  subjectRoot: 'subjectRoot',
  defectClass: 'defectClass',
  status: 'status',
  noMergeKey: 'noMergeKey',
  findingId: 'findingId',
  locator: 'locator',
  evidence: 'evidence',
  'required remediation': 'requiredRemediation',
  requiredRemediation: 'requiredRemediation',
  'source basis': 'sourceBasis',
  sourceBasis: 'sourceBasis',
  mergeKey: 'mergeKey',
  dependencies: 'dependencies',
};

function valueOccurrence(alias, lineNo, fieldName, rawValue, fieldOrdinal = null) {
  const source = bytes(sourceAliases[alias].file);
  const lines = splitLinesWithOffsets(source);
  const line = lines[lineNo - 1];
  const raw = Buffer.from(rawValue, 'utf8');
  const relative = line.raw.indexOf(raw);
  return {
    fieldName,
    locatorId: `${alias}:L${lineNo}${fieldOrdinal === null ? '' : `:CELL${fieldOrdinal}`}`,
    artifactAlias: alias,
    sourceLine: lineNo,
    sourceByteStart0: relative < 0 ? line.start : line.start + relative,
    sourceByteEndExclusive0: relative < 0 ? line.endExclusive : line.start + relative + raw.length,
    rawValue,
    rawValueBytes: raw.length,
    rawValueSha256: sha(raw),
  };
}

function extractOccurrences(alias, startLine, endLine) {
  const lines = text(sourceAliases[alias].file).split('\n');
  const occurrences = [];
  for (let n = startLine; n <= endLine; n += 1) {
    const line = lines[n - 1];
    if (n === startLine && /^#{2,3} /.test(line)) {
      const heading = line.replace(/^#{2,3}\s+/, '').replace(/^`[^`]+`\s*[—-]?\s*/, '');
      occurrences.push(valueOccurrence(alias, n, 'headingTitle', heading));
    }
    const eq = /(?:`([^`]+)`|([A-Za-z][A-Za-z0-9 /_-]*))\s*=\s*`([^`]*)`/g;
    let m;
    while ((m = eq.exec(line)) !== null) {
      const sourceName = (m[1] || m[2]).trim().replace(/^\d+(?:\.\d+)+\s+/, '');
      const mapped = fieldAliases[sourceName];
      if (mapped) occurrences.push(valueOccurrence(alias, n, mapped, m[3]));
    }
    const colon = /`([^`]+)`:\s*`([^`]*)`/g;
    while ((m = colon.exec(line)) !== null) {
      const mapped = fieldAliases[m[1].trim()];
      if (mapped) occurrences.push(valueOccurrence(alias, n, mapped, m[2]));
    }
    if (line.startsWith('| `') && (alias === 'MM' || alias === 'SM')) {
      const headers = tableHeadersBefore(alias, n);
      const cells = parseMarkdownRow(line);
      assert(headers.length === cells.length, `${alias} table width L${n}`);
      for (let c = 0; c < headers.length; c += 1) {
        const mapped = fieldAliases[headers[c]];
        if (mapped) occurrences.push(valueOccurrence(alias, n, mapped, cells[c], c + 1));
      }
    }
  }
  return occurrences;
}

const obsText = text(P.v3Obs);
const observationRows = [];
for (const line of obsText.split('\n')) {
  if (!line.startsWith('| `SOE-')) continue;
  const cells = parseMarkdownRow(line);
  assert(cells.length === 12, `observation row width ${cells[0]}`);
  observationRows.push({
    envelopeId: cells[0], localObservationId: cells[1], family: cells[2], rawSourceParts: cells[3],
    v3ObservationRecordDigest: cells[4], v3FieldProfile: cells[5], originalSeverity: cells[6],
    v3EffectiveSeverity: cells[7], transitionCondition: cells[8], safeTerminalProjection: cells[9],
    statusProjection: cells[10], successorNoMergeKey: cells[11],
  });
}
assert(observationRows.length === 84, `observation count ${observationRows.length}`);

const sourcePartLocators = [];
const seenPart = new Map();
for (const row of observationRows) {
  row.sourcePartLocatorIds = [];
  for (const rawPart of row.rawSourceParts.split('+')) {
    const m = rawPart.match(/^([A-Z]+):L(\d+)(?:-L(\d+))?:(\d+):([0-9a-f]{64})$/);
    assert(m, `bad source part ${rawPart}`);
    const [, alias, startS, endS, bytesS, digest] = m;
    const startLine = Number(startS); const endLine = Number(endS || startS);
    const source = bytes(sourceAliases[alias].file);
    const lines = splitLinesWithOffsets(source);
    const slice = source.subarray(lines[startLine - 1].start, lines[endLine - 1].endExclusive);
    assert(slice.length === Number(bytesS), `source bytes ${rawPart}`);
    assert(sha(slice) === digest, `source digest ${rawPart}`);
    const locatorId = `SRL-${alias}-${String(startLine).padStart(4, '0')}-${String(endLine).padStart(4, '0')}-${digest.slice(0, 12)}`;
    row.sourcePartLocatorIds.push(locatorId);
    if (!seenPart.has(rawPart)) {
      const rec = {
        locatorId, sourceArtifactId: `SRC-${fileSha(sourceAliases[alias].file)}`, artifactAlias: alias,
        inclusiveLineStart: startLine, inclusiveLineEnd: endLine, bytes: slice.length, sha256: digest,
        captureRelativePath: path.relative(planning, path.join(capturesDir, `${fileSha(sourceAliases[alias].file)}.bin`)),
        parserSchemaId: parserByFamily[row.family].parserSchemaId,
        unavailableTerminal: 'PORTABLE-SOURCE-LOCATOR-BLOCKED',
      };
      sourcePartLocators.push(rec); seenPart.set(rawPart, rec);
    }
  }
}
assert(sourcePartLocators.length === 128, `unique source parts ${sourcePartLocators.length}`);

const v2ManifestRows = [];
for (const line of text(P.v3V2).split('\n')) {
  if (!line.startsWith('| `V2R-')) continue;
  const cells = parseMarkdownRow(line);
  v2ManifestRows.push({ manifestId: cells[0], sourceRequirementId: cells[1], locator: cells[2], bytes: Number(cells[3]), recordDigest: cells[4] });
}
assert(v2ManifestRows.length === 85, `v2 rows ${v2ManifestRows.length}`);
const v2Lines = splitLinesWithOffsets(bytes(P.v2));
const v2PortableLocators = v2ManifestRows.map(r => {
  const m = r.locator.match(/^L(\d+)-L(\d+)$/); assert(m, `v2 locator ${r.locator}`);
  const start = Number(m[1]); const end = Number(m[2]);
  const slice = bytes(P.v2).subarray(v2Lines[start - 1].start, v2Lines[end - 1].endExclusive);
  assert(slice.length === r.bytes && sha(slice) === r.recordDigest, `v2 portable mismatch ${r.manifestId}`);
  return {
    locatorId: `V2-LOC-${r.manifestId}`, sourceArtifactId: `SRC-${fileSha(P.v2)}`, sourceRecordId: r.sourceRequirementId,
    inclusiveLineStart: start, inclusiveLineEnd: end, bytes: slice.length, sha256: sha(slice),
    captureRelativePath: path.relative(planning, path.join(capturesDir, `${fileSha(P.v2)}.bin`)),
    parserSchemaId: 'TRD2V3-V2-REQ-FIVE-V1', unavailableTerminal: 'PORTABLE-V2-REQUIREMENT-BLOCKED',
  };
});

const fieldMaps = [];
for (const row of observationRows) {
  const schema = parserByFamily[row.family];
  const occurrences = [];
  for (const rawPart of row.rawSourceParts.split('+')) {
    const m = rawPart.match(/^([A-Z]+):L(\d+)(?:-L(\d+))?:/);
    occurrences.push(...extractOccurrences(m[1], Number(m[2]), Number(m[3] || m[2])));
  }
  const fields = schema.fields.map(fieldName => {
    const hits = occurrences.filter(o => o.fieldName === fieldName);
    const values = [...new Set(hits.map(h => h.rawValue))];
    const disposition = hits.length === 0 ? 'MISSING' : values.length === 1 ? 'PRESENT' : 'CONFLICT';
    const record = {
      fieldName, disposition,
      valueType: fieldName.toLowerCase().includes('severity') ? 'SeverityString' : 'Utf8RawString',
      occurrences: hits,
      canonicalValue: disposition === 'PRESENT' ? values[0] : null,
      missingTerminal: disposition === 'MISSING' ? 'MISSING/SOURCE-FIELD-ABSENT' : null,
      conflictValues: disposition === 'CONFLICT' ? values : [],
    };
    record.fieldValueRoot = recordDigest('CONNECT-TRD2V4-SOURCE-FIELD-V1', record);
    return record;
  });
  assert(fields.length === schema.fields.length, `field denominator ${row.envelopeId}`);
  assert(fields.every(f => ['PRESENT', 'MISSING', 'CONFLICT'].includes(f.disposition)), `field disposition ${row.envelopeId}`);
  const fieldMapRoot = collectionRoot(`CONNECT-TRD2V4-FIELD-MAP-${row.envelopeId}-V1`, fields, 'fieldName');
  const effectiveSeverity = row.v3EffectiveSeverity === 'P2-CONDITIONAL-P0' ? 'P2' : row.v3EffectiveSeverity;
  const pendingTransition = row.v3EffectiveSeverity === 'P2-CONDITIONAL-P0'
    ? { state: 'PENDING', from: 'P2', to: 'P0', condition: row.transitionCondition, evaluatorRoot: 'MISSING/EXTERNAL-EVALUATOR', evaluatedAt: 'MISSING/TRUSTED-TIME' }
    : { state: 'NONE' };
  const logical = {
    schemaVersion: 'CONNECT-TRD2V4-SOURCE-OBSERVATION-ENVELOPE-V1', envelopeId: row.envelopeId,
    localObservationId: row.localObservationId, family: row.family, sourcePartLocatorIds: row.sourcePartLocatorIds,
    v3ObservationRecordDigest: row.v3ObservationRecordDigest, parserSchemaId: schema.parserSchemaId, fieldMapRoot,
    originalSeverity: row.originalSeverity, effectiveSeverity, pendingTransition,
    safeTerminalProjection: row.safeTerminalProjection, statusProjection: row.statusProjection,
    successorNoMergeKey: row.successorNoMergeKey,
  };
  logical.logicalRecordDigest = recordDigest('CONNECT-TRD2V4-LOGICAL-OBSERVATION-V1', logical);
  fieldMaps.push({ envelopeId: row.envelopeId, fields, fieldMapRoot, logicalEnvelope: logical });
}

const bidiCodePoints = new Set([0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]);
const bidiRegistry = [];
for (const part of sourcePartLocators) {
  const source = bytes(sourceAliases[part.artifactAlias].file);
  const sourceLines = splitLinesWithOffsets(source);
  const sliceStart = sourceLines[part.inclusiveLineStart - 1].start;
  const sliceEnd = sourceLines[part.inclusiveLineEnd - 1].endExclusive;
  const slice = source.subarray(sliceStart, sliceEnd);
  const decoded = slice.toString('utf8');
  let utf16Index = 0; let byteOffset = 0;
  for (const char of decoded) {
    const cp = char.codePointAt(0);
    const charBytes = Buffer.byteLength(char);
    if (bidiCodePoints.has(cp)) {
      const absolute = sliceStart + byteOffset;
      let lineIndex = part.inclusiveLineStart - 1;
      while (lineIndex + 1 < sourceLines.length && sourceLines[lineIndex + 1].start <= absolute) lineIndex += 1;
      bidiRegistry.push({
        registryId: `BIDI-${String(bidiRegistry.length + 1).padStart(3, '0')}`,
        locatorId: part.locatorId, codePoint: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
        artifactByteOffset0: absolute, partByteOffset0: byteOffset, sourceLine: lineIndex + 1,
        lineByteColumn1: absolute - sourceLines[lineIndex].start + 1,
        handling: 'RAW-PRESERVE; DISPLAY-ESCAPE; SEMANTIC-COMPARE-RAW',
      });
    }
    utf16Index += char.length; byteOffset += charBytes;
  }
}
assert(bidiRegistry.length === 13, `bidi count ${bidiRegistry.length}`);
assert(bidiRegistry.every(r => r.codePoint === 'U+200F'), 'unexpected bidi code point');

const observationLogicalRecords = fieldMaps.map(m => m.logicalEnvelope);
const fieldMapCollectionRoot = collectionRoot('CONNECT-TRD2V4-FIELD-MAP-COLLECTION-V1', fieldMaps.map(m => ({ envelopeId: m.envelopeId, fieldMapRoot: m.fieldMapRoot })), 'envelopeId');
const observationLogicalCollectionRoot = collectionRoot('CONNECT-TRD2V4-LOGICAL-OBSERVATION-COLLECTION-V1', observationLogicalRecords, 'envelopeId');
const portableLocatorCollectionRoot = collectionRoot('CONNECT-TRD2V4-PORTABLE-LOCATORS-V1', [...sourcePartLocators, ...v2PortableLocators], 'locatorId');
const captureCollectionRoot = collectionRoot('CONNECT-TRD2V4-SOURCE-CAPTURES-V1', capturedSources, 'artifactId');
const bidiCollectionRoot = collectionRoot('CONNECT-TRD2V4-BIDI-REGISTRY-V1', bidiRegistry, 'registryId');
const severityBindings = observationLogicalRecords.map(o => ({
  envelopeId: o.envelopeId, originalSeverity: o.originalSeverity, effectiveSeverity: o.effectiveSeverity,
  pendingTransition: o.pendingTransition, severitySourceRoot: o.logicalRecordDigest,
  historyRoot: 'EMPTY-APPEND-ONLY-SEVERITY-HISTORY', status: 'CURRENT-UNACCEPTED',
}));
const severityCounts = severityBindings.reduce((a, r) => { a[r.effectiveSeverity] = (a[r.effectiveSeverity] || 0) + 1; return a; }, {});
assert(severityCounts.P0 === 39 && severityCounts.P1 === 37 && severityCounts.P2 === 6 && severityCounts.P3 === 2, `severity ${JSON.stringify(severityCounts)}`);
const severityCollectionRoot = collectionRoot('CONNECT-TRD2V4-SEVERITY-BINDINGS-V1', severityBindings, 'envelopeId');

writeJson(OUT.fieldMap, {
  schemaVersion: 'CONNECT-TRD2V4-FIELD-MAP-PORTABLE-SOURCE-MANIFEST-V1',
  artifactClass: 'PLANNING-ONLY; MACHINE-READABLE; NOT-ACCEPTANCE; NOT-GATE-CREDIT',
  immutableInputs: {
    v3ObservationManifestRoot: EXPECTED.v3Obs,
    v3InheritedV2ManifestRoot: EXPECTED.v3V2,
    v3SubjectRoot: EXPECTED.v3,
  },
  parserSchemas,
  sourceArtifacts: capturedSources,
  sourceArtifactCaptureCollectionRoot: captureCollectionRoot,
  sourceRecordLocators: [...sourcePartLocators, ...v2PortableLocators],
  sourcePartDenominator: 128,
  inheritedV2LocatorDenominator: 85,
  portableLocatorCollectionRoot,
  sourceObservationDenominator: 84,
  fieldMaps,
  fieldMapCollectionRoot,
  logicalObservationCollectionRoot: observationLogicalCollectionRoot,
  bidiRegistry,
  bidiCollectionRoot,
  bidiDenominator: 13,
  severityBindings,
  severityCollectionRoot,
  severityAggregates: { original: { P0: 39, P1: 37, P2: 6, P3: 2, total: 84 }, current: { ...severityCounts, total: 84 } },
  conflictPolicy: 'PRESERVE-ALL-OCCURRENCES; NO-LAST-WRITE-WINS; CONFLICT-BLOCKS-CLOSURE',
  publicInvariant: 'PUBLIC',
  privateRemediationAllowed: false,
});

const inheritedRawRoot = fileSha(OUT.inherited);
const fieldMapRawRoot = fileSha(OUT.fieldMap);

const fixes = [
  {
    findingId: 'TRD2V3-IHR-F001', title: 'complete typed source field maps', outputType: 'FieldMapEnvelopeValidationResult',
    failure: 'SOURCE-FIELD-MAP-BLOCKED', deps: [],
    defect: 'v3 preserved exact bytes but omitted executable parser grammars, typed present/missing/conflict fields and per-field locators/digests, so equivalent byte roots could decode differently',
    obligation: 'prove all 84 envelopes have a closed parser schema and a total typed Field-map whose value and collection roots agree under two independent parsers',
  },
  {
    findingId: 'TRD2V3-IHR-F002', title: 'unambiguous canonical schemas and root oracles', outputType: 'CanonicalRootOracleValidationResult',
    failure: 'CANONICAL-ROOT-ORACLE-BLOCKED', deps: [0],
    defect: 'v3 left schemaVersion, sourceParts type, Requirement grammar and expected logical/collection roots open to multiple conforming interpretations',
    obligation: 'prove closed JSON types, canonical UTF-8 serialization and published logical record, Requirement collection and observation collection roots with mutation rejection',
  },
  {
    findingId: 'TRD2V3-IHR-F003', title: 'materialized typed semantic edge registry', outputType: 'TypedSemanticGraphValidationResult',
    failure: 'TYPED-SEMANTIC-GRAPH-BLOCKED', deps: [0, 1],
    defect: 'v3 dependency lists were bare Requirement IDs and narrative edge families had no concrete external/source/predicate/result/invalidation records',
    obligation: 'prove an exact qualified typed node and edge registry, graph root, detached-Freeze reachability, backward Requirement DAG and invalidation coverage',
  },
  {
    findingId: 'TRD2V3-IHR-F004', title: 'executable predicate DSL and rooted vectors', outputType: 'PredicateProgramValidationResult',
    failure: 'PREDICATE-PROGRAM-BLOCKED', deps: [1, 2],
    defect: 'v3 predicate descriptors lacked a lexical grammar, typed operator semantics, resolver, full envelopes and immutable vector inputs/expected evidence',
    obligation: 'prove all predicates parse to one canonical AST, every identifier and vector resolves once and two independent evaluators agree or fail closed',
  },
  {
    findingId: 'TRD2V3-IHR-F005', title: 'closed ValidationResult receipt schemas', outputType: 'ValidationReceiptSchemaValidationResult',
    failure: 'VALIDATION-RECEIPT-SCHEMA-BLOCKED', deps: [1, 3],
    defect: 'v3 named output types without closed subject/input/predicate/evidence/result/time/supersession/invalidation receipt schemas',
    obligation: 'prove every sole output resolves to one closed immutable receipt family and wrong-root, omitted-subcheck, stale, replay and duplicate-producer records fail',
  },
  {
    findingId: 'TRD2V3-IHR-F006', title: 'fully bound review generations, reconciliation and Acceptance', outputType: 'ReviewAcceptanceBindingValidationResult',
    failure: 'REVIEW-ACCEPTANCE-BINDING-BLOCKED', deps: [0, 1, 2, 3, 4],
    defect: 'v3 under-bound generation, normalized finding, reconciliation and Definition Acceptance receipts and omitted mandatory roots',
    obligation: 'prove two receipt-disjoint eligible generations, total finding dispositions and detached Acceptance bind the same complete mandatory-root set with zero open vetoes',
  },
  {
    findingId: 'TRD2V3-IHR-F007', title: 'executable MissingValue resolution lifecycle', outputType: 'MissingValueLifecycleValidationResult',
    failure: 'MISSING-VALUE-LIFECYCLE-BLOCKED', deps: [0, 3, 4],
    defect: 'v3 had 27 safe unresolved rows but no executable resolution predicates, rooted authority appointments, transition receipts, CAS, expiry, revocation or conflict lifecycle',
    obligation: 'prove 27 distinct fail-closed lifecycle records with one authorized exactly-once transition path and stale/revoked/double/race mutations blocked',
  },
  {
    findingId: 'TRD2V3-IHR-F008', title: 'typed severity state and immutable history', outputType: 'SeverityHistoryValidationResult',
    failure: 'SEVERITY-HISTORY-BLOCKED', deps: [0, 1, 4],
    defect: 'v3 mixed a pending condition into the severity enum and did not bind transition condition/evaluator/result/time/history roots',
    obligation: 'prove 84 current severities remain P0 through P3, pending transitions are separate, aggregates derive from rows and late changes invalidate results',
  },
  {
    findingId: 'TRD2V3-IHR-F009', title: 'portable content-addressed source oracle', outputType: 'PortableSourceOracleValidationResult',
    failure: 'PORTABLE-SOURCE-ORACLE-BLOCKED', deps: [0, 1],
    defect: 'v3 locators worked only in the current workspace and lacked exact capture addresses, bytes, authority class, parser root and unavailable terminals',
    obligation: 'prove content-addressed captures and qualified locators replay 128 source parts plus 85 inherited-v2 records without filesystem search',
  },
  {
    findingId: 'TRD2V3-IHR-F010', title: 'non-vacuous AtomicClause denominator', outputType: 'AtomicClauseClosureValidationResult',
    failure: 'ATOMIC-CLAUSE-CLOSURE-BLOCKED', deps: [1, 3, 4],
    defect: 'v3 had no finite parent classification or mandatory child registry, allowing empty or selective decomposition to pass',
    obligation: 'prove all 113 parents are disjointly atomic or compound, every compound parent has a non-empty frozen child set and parent credit remains zero until all child receipts pass',
  },
  {
    findingId: 'TRD2V3-IHR-F011', title: 'total DataLifecycle state and event graph', outputType: 'DataLifecycleGraphValidationResult',
    failure: 'DATA-LIFECYCLE-GRAPH-BLOCKED', deps: [0, 1, 2, 3, 4, 8, 9],
    defect: 'v3 lifecycle omitted the accepted identity/store/provider denominator, total state-event matrix, Hold release, partial/unknown reconciliation, retention cutoff and full restore/re-delete lineage',
    obligation: 'prove a total fail-closed transition matrix and require a non-empty accepted Source-universe denominator before any concrete data identity receives closure',
  },
  {
    findingId: 'TRD2V3-IHR-F012', title: 'current Public cyber successor closure', outputType: 'PublicCyberControlValidationResult',
    failure: 'PUBLIC-CYBER-CLOSURE-BLOCKED', deps: [0, 1, 2, 3, 4, 8, 10],
    defect: 'v3 omitted the already-present Public/cyber successor root and did not enumerate control-to-vector-to-evidence-to-gate records',
    obligation: 'prove the exact current successor is explicitly dispositioned and all 52 controls map to five vector modes, evidence schemas and hardening gates while Private paths remain zero',
  },
];
assert(fixes.length === 12, 'fix count');

function v4Id(index) { return `TRD2V4-REQ-${String(index).padStart(3, '0')}`; }
const requirementBlueprints = fixes.map((f, i) => ({
  requirementId: v4Id(i), title: f.title, outputType: f.outputType, sourceKind: 'V3-HOSTILE-FINDING', sourceId: f.findingId,
  dependencies: f.deps.map(v4Id), failureTerminal: f.failure,
  statement: `require exactly one ${f.outputType} with resultId=TRD2V4-RESULT-${String(i).padStart(3, '0')} proving ${f.obligation}`,
  defectCauseImpact: `${f.defect}; without the requested output, ${f.failure} is mandatory and no closure, review or Gate credit transfers`,
  sourceBasis: `v3ReviewRoot=${EXPECTED.review};v3FindingsRoot=${EXPECTED.findings}#${f.findingId};noMergeKey=${f.findingId};closureTransferred=0`,
}));
const v3ReqById = new Map(v3Requirements.map((r, i) => [r.id, { ...r, sourceOrdinal: i }]));
const v3Deps = new Map(v3Requirements.map(r => [r.id, [...r.fields.dependencies.matchAll(/TRD2V3-REQ-\d{3}/g)].map(m => m[0])]));
const remainingV3 = new Set(v3Requirements.map(r => r.id));
const emittedV3 = new Set();
const v3Topo = [];
while (remainingV3.size > 0) {
  const ready = [...remainingV3].filter(id => v3Deps.get(id).every(d => emittedV3.has(d))).sort();
  assert(ready.length > 0, 'v3 source graph cycle or dangling dependency');
  for (const id of ready) { remainingV3.delete(id); emittedV3.add(id); v3Topo.push(id); }
}
assert(v3Topo.length === 101, 'v3 topological denominator');
const v4IdByV3 = new Map(v3Topo.map((id, position) => [id, v4Id(12 + position)]));
for (let position = 0; position < v3Topo.length; position += 1) {
  const src = v3ReqById.get(v3Topo[position]);
  const dependencies = [...new Set([...fixes.map((_, n) => v4Id(n)), ...v3Deps.get(src.id).map(id => v4IdByV3.get(id))])];
  const resultOrdinal = 12 + position;
  requirementBlueprints.push({
    requirementId: v4Id(resultOrdinal), title: `byte-exact preservation of ${src.id}`,
    outputType: 'InheritedV3RequirementPreservationResult', sourceKind: 'INHERITED-V3-REQUIREMENT', sourceId: src.id,
    dependencies, failureTerminal: 'INHERITED-V3-REQUIREMENT-PRESERVATION-BLOCKED',
    statement: `require exactly one InheritedV3RequirementPreservationResult with resultId=TRD2V4-RESULT-${String(resultOrdinal).padStart(3, '0')} proving byte-exact preservation of ${src.id} through V3R-${String(src.sourceOrdinal).padStart(3, '0')} without semantic merge, mutation, closure transfer or parent credit`,
    defectCauseImpact: `loss of the exact v3 Requirement slice, five-field order, historical dependency list or source basis would erase predecessor semantics or silently transfer closure; any mismatch blocks this result`,
    sourceBasis: `v3SubjectRoot=${EXPECTED.v3};inheritedV3ManifestRoot=${inheritedRawRoot}#V3R-${String(src.sourceOrdinal).padStart(3, '0')};recordDigest=${src.digest};v3SupportRoots=${EXPECTED.v3V2},${EXPECTED.v3Obs},${EXPECTED.v3Controls};closureTransferred=0`,
  });
}
assert(requirementBlueprints.length === 113, `requirement blueprints ${requirementBlueprints.length}`);
for (let i = 0; i < requirementBlueprints.length; i += 1) {
  assert(requirementBlueprints[i].requirementId === v4Id(i), `requirement sequence ${i}`);
  for (const d of requirementBlueprints[i].dependencies) assert(Number(d.slice(-3)) < i, `forward dependency ${requirementBlueprints[i].requirementId}->${d}`);
}

const evidenceSchemaBase = {
  schemaVersion: 'CONNECT-TRD2V4-VALIDATION-EVIDENCE-V1', additionalProperties: false,
  required: ['evidenceId', 'subjectRoot', 'predicateRoot', 'vectorRoot', 'runnerRoot', 'checks', 'evidenceRoot'],
  properties: {
    evidenceId: 'DeterministicContentId', subjectRoot: 'Bytes32', predicateRoot: 'Bytes32', vectorRoot: 'Bytes32',
    runnerRoot: 'Bytes32', checks: 'NonEmptyArray<CanonicalCheckResult>', evidenceRoot: 'Bytes32',
  },
};
const evidenceSchemaRoot = recordDigest('CONNECT-TRD2V4-EVIDENCE-SCHEMA-V1', evidenceSchemaBase);

const resultFamilies = [...new Set(requirementBlueprints.map(r => r.outputType))];
const resultSchemas = resultFamilies.map(outputType => {
  const schema = {
    schemaId: `RESULT-SCHEMA-${outputType}`, schemaVersion: 'CONNECT-TRD2V4-VALIDATION-RESULT-V1', outputType,
    additionalProperties: false,
    required: ['resultId', 'outputType', 'subjectRoot', 'inputRootSetRoot', 'predicateRoot', 'evaluatorRoot', 'runnerRoot', 'vectorSetRoot', 'status', 'subcheckDenominator', 'subchecks', 'evidenceRoot', 'startedAt', 'completedAt', 'validThrough', 'predecessorReceiptRoots', 'supersedesRoot', 'invalidationBindingRoot', 'producerIdentityRoot'],
    properties: {
      resultId: 'QualifiedDeterministicId', outputType: { const: outputType }, subjectRoot: 'Bytes32', inputRootSetRoot: 'Bytes32', predicateRoot: 'Bytes32', evaluatorRoot: 'Bytes32', runnerRoot: 'Bytes32', vectorSetRoot: 'Bytes32',
      status: ['PASS', 'FAIL', 'BLOCKED'], subcheckDenominator: 'UInt64>0', subchecks: 'NonEmptyArray<CanonicalSubcheckResult>', evidenceRoot: 'Bytes32',
      startedAt: 'TrustedInstant', completedAt: 'TrustedInstant', validThrough: 'TrustedInstant', predecessorReceiptRoots: 'SortedUniqueArray<Bytes32>',
      supersedesRoot: 'Bytes32|MISSING', invalidationBindingRoot: 'Bytes32', producerIdentityRoot: 'Bytes32',
    },
    wrongSubjectTerminal: 'VALIDATION-RESULT-WRONG-SUBJECT', staleTerminal: 'VALIDATION-RESULT-STALE', duplicateProducerTerminal: 'VALIDATION-RESULT-DUPLICATE-PRODUCER',
  };
  schema.schemaRoot = recordDigest('CONNECT-TRD2V4-RESULT-SCHEMA-V1', schema);
  return schema;
});
const resultSchemaByType = Object.fromEntries(resultSchemas.map(s => [s.outputType, s]));
const resultSchemaCollectionRoot = collectionRoot('CONNECT-TRD2V4-RESULT-SCHEMA-COLLECTION-V1', resultSchemas, 'schemaId');

const predicateDsl = {
  schemaVersion: 'CONNECT-TRD2V4-PREDICATE-DSL-V1',
  lexicalGrammar: {
    identifier: 'qualified-id := namespace ":" member *(":" member); member := ALPHA *(ALPHA / DIGIT / "-" / "_" / ".")',
    bytes32: '64 lowercase hexadecimal characters',
    ast: 'node := {op:String,args:Array<node|literal|ref>}; ref := {ref:QualifiedId,type:Type}; literal := {literal:CanonicalValue,type:Type}',
    encoding: 'RFC-8785-compatible canonical JSON subset; UTF-8; no duplicate/unknown keys; arrays ordered; sets pre-sorted bytewise',
  },
  types: ['String', 'Boolean', 'UInt64', 'Bytes32', 'TrustedInstant', 'Duration', 'Array<T>', 'Set<T>', 'MissingValue', 'ResultStatus'],
  operators: [
    { op: 'ALL', input: 'Array<Boolean|MissingValue>', output: 'Boolean|MissingValue', missing: 'BLOCKED' },
    { op: 'EQ', input: '[T,T]', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'ROOT_EQ', input: '[Bytes32,Bytes32]', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'COUNT_EQ', input: '[Array<T>|Set<T>,UInt64]', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'NONEMPTY', input: 'Array<T>|Set<T>', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'SET_EQ', input: '[Set<T>,Set<T>]', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'RESOLVES_EXACTLY_ONCE', input: 'QualifiedId', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'VALID_TIME', input: '[TrustedInstant,TrustedInstant,TrustedInstant]', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'ACYCLIC', input: 'TypedGraph', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'REACHABLE', input: '[TypedGraph,QualifiedId,Set<QualifiedId>]', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'FIELD_DISPOSITION_TOTAL', input: 'FieldMapCollection', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'MUTANT_SET_EQ', input: '[Set<QualifiedId>,Set<QualifiedId>]', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'RECEIPT_SCHEMA_VALID', input: '[Receipt,Bytes32]', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'CAS_EXACTLY_ONCE', input: 'TransitionReceiptSet', output: 'Boolean', missing: 'BLOCKED' },
    { op: 'NO_PRIVATE_PATH', input: 'PublicControlRegistry', output: 'Boolean', missing: 'BLOCKED' },
  ],
  identifierResolution: 'every ref resolves by exact namespace+member against the detached packet binding; zero or multiple matches returns BLOCKED',
  evaluationOrder: 'evaluate AST children left-to-right only for deterministic evidence ordering; no short-circuit suppresses a subcheck record',
  missingPropagation: 'MissingValue at any required input or unknown type/operator/syntax returns BLOCKED and the bound failure terminal',
  numericSemantics: 'UInt64 only; no float, implicit cast, truthiness, overflow or locale conversion',
};
predicateDsl.dslRoot = recordDigest('CONNECT-TRD2V4-PREDICATE-DSL-SCHEMA-V1', predicateDsl);

const vectorModes = ['POSITIVE', 'NEGATIVE', 'FAILURE', 'CONCURRENCY', 'RECOVERY'];
const vectors = [];
for (const req of requirementBlueprints) {
  for (const mode of vectorModes) {
    const vectorId = `TV-${req.requirementId}-${mode}`;
    const mutation = mode === 'POSITIVE' ? 'IDENTITY-OVER-EXACT-BOUND-ROOTS'
      : mode === 'NEGATIVE' ? 'REMOVE-ONE-MANDATORY-MEMBER-BY-LEXICALLY-FIRST-ID'
        : mode === 'FAILURE' ? 'SUBSTITUTE-ONE-BOUND-ROOT-WITH-DECLARED-WRONG-ROOT-CLASS'
          : mode === 'CONCURRENCY' ? 'TWO-WRITERS-SAME-CAS-VERSION-DIFFERENT-CONTENT-ROOTS'
            : 'REPLAY-EXACT-IMMUTABLE-INPUTS-AFTER-DECLARED-FAILURE-WITH-NO-STATE-CARRYOVER';
    const expectedSemanticResult = mode === 'POSITIVE' || mode === 'RECOVERY' ? 'PASS' : 'FAIL';
    const rec = {
      vectorId, schemaVersion: 'CONNECT-TRD2V4-TEST-VECTOR-V1', requirementId: req.requirementId,
      mode, baseInputBinding: req.sourceKind === 'INHERITED-V3-REQUIREMENT'
        ? `sha256:${EXPECTED.v3}#${req.sourceId}`
        : `sha256:${EXPECTED.findings}#${req.sourceId}`,
      mutation, expectedSemanticResult, expectedCurrentResult: 'BLOCKED',
      expectedTerminal: expectedSemanticResult === 'PASS' ? 'NONE-AFTER-EXTERNAL-EVALUATOR-AND-RUNNER-ACCEPTANCE' : req.failureTerminal,
      expectedEvidenceSchemaRoot: evidenceSchemaRoot,
      noBusinessOrPersonalData: true,
      deterministic: true,
    };
    rec.vectorRoot = recordDigest('CONNECT-TRD2V4-TEST-VECTOR-V1', rec);
    vectors.push(rec);
  }
}
assert(vectors.length === 565, `vector count ${vectors.length}`);
const vectorCollectionRoot = collectionRoot('CONNECT-TRD2V4-TEST-VECTOR-COLLECTION-V1', vectors, 'vectorId');

const localMandatoryInputRoots = [
  EXPECTED.v3, EXPECTED.v3V2, EXPECTED.v3Obs, EXPECTED.v3Controls, EXPECTED.review, EXPECTED.findings,
  EXPECTED.publicCyber, inheritedRawRoot, fieldMapRawRoot, inheritedCollectionRoot, fieldMapCollectionRoot,
  observationLogicalCollectionRoot, portableLocatorCollectionRoot, captureCollectionRoot, bidiCollectionRoot,
  severityCollectionRoot, predicateDsl.dslRoot, evidenceSchemaRoot, resultSchemaCollectionRoot, vectorCollectionRoot,
].sort();

const predicates = requirementBlueprints.map((req, index) => {
  const reqVectors = vectors.filter(v => v.requirementId === req.requirementId);
  const vectorSetRoot = collectionRoot(`CONNECT-TRD2V4-VECTOR-SET-${req.requirementId}-V1`, reqVectors, 'vectorId');
  const inheritedSourceRow = req.sourceKind === 'INHERITED-V3-REQUIREMENT' ? inheritedRowBySourceId.get(req.sourceId) : null;
  const inputArtifactRoots = req.sourceKind === 'INHERITED-V3-REQUIREMENT'
    ? [EXPECTED.v3, inheritedRawRoot, inheritedSourceRow.recordDigest, EXPECTED.v3V2, EXPECTED.v3Obs, EXPECTED.v3Controls].sort()
    : localMandatoryInputRoots;
  const ast = {
    op: 'ALL', args: [
      { op: 'RESOLVES_EXACTLY_ONCE', args: [{ literal: req.requirementId, type: 'String' }] },
      { op: 'COUNT_EQ', args: [{ ref: `vectors:${req.requirementId}`, type: 'Array<TestVector>' }, { literal: 5, type: 'UInt64' }] },
      { op: 'ROOT_EQ', args: [{ ref: `source:${req.sourceId}`, type: 'Bytes32' }, { literal: req.sourceKind === 'INHERITED-V3-REQUIREMENT' ? inheritedSourceRow.recordDigest : EXPECTED.findings, type: 'Bytes32' }] },
      { op: 'RECEIPT_SCHEMA_VALID', args: [{ ref: `result:${req.requirementId}`, type: 'Receipt' }, { literal: resultSchemaByType[req.outputType].schemaRoot, type: 'Bytes32' }] },
      { op: 'MUTANT_SET_EQ', args: [{ ref: `executedVectors:${req.requirementId}`, type: 'Set<String>' }, { literal: reqVectors.map(v => v.vectorId).sort(), type: 'Set<String>' }] },
    ],
  };
  const predicate = {
    predicateId: `TRD2V4-CP-${String(index).padStart(3, '0')}`,
    predicateVersion: predicateDsl.schemaVersion,
    requirementId: req.requirementId,
    inputSchemaRoots: [predicateDsl.dslRoot, evidenceSchemaRoot, resultSchemaByType[req.outputType].schemaRoot].sort(),
    inputArtifactRoots,
    evaluatorRoot: 'MISSING/EXTERNAL-ACCEPTED-EVALUATOR',
    runnerRoot: 'MISSING/EXTERNAL-ACCEPTED-RUNNER',
    testVectorIds: reqVectors.map(v => v.vectorId), vectorSetRoot,
    expressionAst: ast, expressionAstRoot: recordDigest('CONNECT-TRD2V4-PREDICATE-AST-V1', ast),
    expectedResult: 'PASS', currentResult: 'BLOCKED', failureTerminal: req.failureTerminal,
    evidenceSchemaRoot, asOf: 'MISSING/DETACHED-EVALUATION-RECEIPT', validThrough: 'MISSING/DETACHED-EVALUATION-RECEIPT',
  };
  predicate.predicateRoot = recordDigest('CONNECT-TRD2V4-CONFORMANCE-PREDICATE-V1', predicate);
  return predicate;
});
assert(predicates.length === 113, `predicate count ${predicates.length}`);
const predicateCollectionRoot = collectionRoot('CONNECT-TRD2V4-CONFORMANCE-PREDICATE-COLLECTION-V1', predicates, 'predicateId');

const missingValues = [];
for (const line of text(P.v3Controls).split('\n')) {
  if (!line.startsWith('| `MV-')) continue;
  const c = parseMarkdownRow(line);
  assert(c.length === 13, `missing value width ${c[0]}=${c.length}`);
  const n = Number(c[0].slice(-3));
  const rec = {
    missingValueId: c[0], targetRecordId: c[1], missingField: c[2], reasonCode: c[3], sourceRoot: c[4], sourceLocalId: c[5],
    blocker: c[6], requiredAuthorityRoleExpression: c[7], resolutionPredicateId: `TRD2V4-MVR-${String(n).padStart(3, '0')}`,
    safeTerminal: c[9], successorTrigger: c[10], state: 'UNRESOLVED', acceptanceEligible: false,
    roleRegistryRoot: 'MISSING/EXTERNAL-B0-ROLE-REGISTRY', appointmentRoot: 'MISSING/EXTERNAL-APPOINTMENT',
    casVersion: 0, proposalRoot: 'MISSING/NO-PROPOSAL', acceptedSuccessorRoot: 'MISSING/NO-ACCEPTED-SUCCESSOR',
    validFrom: 'MISSING/NO-RESOLUTION', validThrough: 'MISSING/NO-RESOLUTION', revocationRoot: 'MISSING/NO-RESOLUTION', conflictRoot: 'MISSING/NO-CONFLICT',
    allowedTransitions: ['UNRESOLVED->PROPOSED', 'PROPOSED->UNDER-REVIEW', 'UNDER-REVIEW->RESOLVED', 'UNDER-REVIEW->REJECTED', 'ANY->REVOKED', 'CONCURRENT-WINNER->CONFLICT'],
    directDefaultOrInferenceAllowed: false,
  };
  rec.recordRoot = recordDigest('CONNECT-TRD2V4-MISSING-VALUE-LIFECYCLE-V1', rec);
  missingValues.push(rec);
}
assert(missingValues.length === 27, `missing values ${missingValues.length}`);
const missingValuePredicates = missingValues.map(mv => {
  const ast = { op: 'ALL', args: [
    { op: 'EQ', args: [{ ref: `${mv.missingValueId}:state`, type: 'String' }, { literal: 'UNRESOLVED', type: 'String' }] },
    { op: 'EQ', args: [{ ref: `${mv.missingValueId}:acceptanceEligible`, type: 'Boolean' }, { literal: false, type: 'Boolean' }] },
    { op: 'CAS_EXACTLY_ONCE', args: [{ ref: `${mv.missingValueId}:transitionReceipts`, type: 'TransitionReceiptSet' }] },
  ] };
  const rec = {
    predicateId: mv.resolutionPredicateId, predicateVersion: predicateDsl.schemaVersion, missingValueId: mv.missingValueId,
    inputSchemaRoots: [predicateDsl.dslRoot], inputArtifactRoots: [EXPECTED.v3Controls, mv.recordRoot],
    evaluatorRoot: 'MISSING/EXTERNAL-ACCEPTED-EVALUATOR', runnerRoot: 'MISSING/EXTERNAL-ACCEPTED-RUNNER',
    testVectorIds: [`${mv.resolutionPredicateId}-DIRECT`, `${mv.resolutionPredicateId}-STALE`, `${mv.resolutionPredicateId}-REVOKED`, `${mv.resolutionPredicateId}-DOUBLE`, `${mv.resolutionPredicateId}-CAS-RACE`],
    expressionAst: ast, expressionAstRoot: recordDigest('CONNECT-TRD2V4-PREDICATE-AST-V1', ast),
    expectedResult: 'PASS', currentResult: 'BLOCKED', failureTerminal: mv.safeTerminal,
    evidenceSchemaRoot, asOf: 'MISSING/DETACHED-EVALUATION-RECEIPT', validThrough: 'MISSING/DETACHED-EVALUATION-RECEIPT',
  };
  rec.predicateRoot = recordDigest('CONNECT-TRD2V4-MISSING-VALUE-PREDICATE-V1', rec);
  return rec;
});
const missingValueCollectionRoot = collectionRoot('CONNECT-TRD2V4-MISSING-VALUE-COLLECTION-V1', missingValues, 'missingValueId');
const missingPredicateCollectionRoot = collectionRoot('CONNECT-TRD2V4-MISSING-PREDICATE-COLLECTION-V1', missingValuePredicates, 'predicateId');

const atomicChildTemplates = [
  ['freeze parser schemas', 'materialize total field records', 'publish field roots', 'verify two parser outputs', 'reject boundary and conflict mutations'],
  ['freeze scalar and array types', 'freeze canonical serializer grammar', 'publish per-record roots', 'publish collection roots', 'reject Unicode order and hidden-field mutations'],
  ['materialize typed nodes', 'materialize typed edges', 'publish graph root', 'prove reachability and invalidation', 'reject edge mutations'],
  ['freeze lexical grammar', 'freeze typed operator semantics', 'materialize predicate envelopes', 'materialize exact vectors', 'compare independent evaluator outputs'],
  ['freeze result family schemas', 'bind sole producers', 'bind subcheck denominators', 'publish result collection contract', 'reject receipt mutations'],
  ['freeze generation receipt schema', 'freeze normalized finding schema', 'freeze reconciliation schema', 'freeze Acceptance schema', 'bind two distinct generations and every mandatory root'],
  ['materialize 27 resolution predicates', 'bind roles and appointments', 'freeze transition receipts', 'bind CAS expiry revocation and conflict', 'reject lifecycle mutations'],
  ['separate effective severity and pending transition', 'bind 84 rows', 'publish current aggregate', 'publish append-only history contract', 'reject late transition mutations'],
  ['capture exact source bytes by digest', 'materialize qualified locators', 'bind authority and parser roots', 'verify two clean-room resolvers', 'reject missing moved ambiguous and wrong-root sources'],
  ['classify every parent', 'freeze every compound child set', 'bind one action and one output per child', 'enforce zero parent credit until all child receipts'],
  ['freeze class and state/event universes', 'materialize total transition matrix', 'bind guards authority CAS and evidence', 'bind hold partial unknown cutoff cascade restore and re-delete', 'reject empty admitted denominator'],
  ['disposition exact current Public source', 'enumerate 52 controls', 'map five vectors per control', 'map evidence and gate per control', 'prove zero Private paths'],
];
const atomicParents = [];
const atomicChildren = [];
for (let i = 0; i < requirementBlueprints.length; i += 1) {
  const req = requirementBlueprints[i];
  const compound = i < 12;
  const childIds = compound ? atomicChildTemplates[i].map((_, n) => `TRD2V4-AC-${String(i).padStart(3, '0')}-${String(n + 1).padStart(2, '0')}`) : [];
  const parent = {
    parentId: req.requirementId, classification: compound ? 'COMPOUND' : 'ATOMIC', classifierVersion: 'TRD2V4-ATOMICITY-CLASSIFIER-V1',
    classifierReason: compound ? 'review correction requires multiple independently provable actions' : 'one byte-preservation action produces one immutable preservation receipt',
    mandatoryChildIds: childIds, mandatoryChildSetRoot: collectionRoot(`CONNECT-TRD2V4-ATOMIC-CHILD-SET-${req.requirementId}-V1`, childIds.map(childId => ({ childId })), 'childId'),
    parentEffortCredit: 0, parentClosureRule: compound ? 'ALL-MANDATORY-CHILD-RECEIPTS-PASS' : 'SOLE-ATOMIC-RESULT-RECEIPT-PASS',
  };
  parent.parentRoot = recordDigest('CONNECT-TRD2V4-ATOMIC-PARENT-V1', parent);
  atomicParents.push(parent);
  if (compound) {
    for (let n = 0; n < atomicChildTemplates[i].length; n += 1) {
      const child = {
        childId: childIds[n], parentId: req.requirementId, oneAction: atomicChildTemplates[i][n],
        oneProductOutput: `TRD2V4-AC-OUTPUT-${String(i).padStart(3, '0')}-${String(n + 1).padStart(2, '0')}`,
        oneEvidenceOutput: `TRD2V4-AC-EVIDENCE-${String(i).padStart(3, '0')}-${String(n + 1).padStart(2, '0')}`,
        ownerRole: 'EXTERNAL/APPOINTED-DEFINITION-PRODUCER', reviewerRole: 'EXTERNAL/INDEPENDENT-REVIEWER',
        testIds: vectorModes.map(mode => `ATV-${String(i).padStart(3, '0')}-${String(n + 1).padStart(2, '0')}-${mode}`),
        failureTerminal: req.failureTerminal, reworkTarget: childIds[n], status: 'UNEXECUTED',
      };
      child.childRoot = recordDigest('CONNECT-TRD2V4-ATOMIC-CHILD-V1', child);
      atomicChildren.push(child);
    }
  }
}
assert(atomicParents.length === 113 && atomicParents.filter(p => p.classification === 'COMPOUND').length === 12 && atomicChildren.length > 0, 'atomic denominator');
assert(atomicParents.filter(p => p.classification === 'COMPOUND').every(p => p.mandatoryChildIds.length > 0), 'empty compound');
const atomicParentCollectionRoot = collectionRoot('CONNECT-TRD2V4-ATOMIC-PARENTS-V1', atomicParents, 'parentId');
const atomicChildCollectionRoot = collectionRoot('CONNECT-TRD2V4-ATOMIC-CHILDREN-V1', atomicChildren, 'childId');

const lifecycleStates = ['ACTIVE', 'QUARANTINED', 'HOLD-ACTIVE', 'HOLD-RELEASE-PENDING', 'DELETE-PLANNED', 'DELETE-IN-FLIGHT', 'DELETE-PARTIAL', 'DELETE-UNKNOWN', 'PURGED', 'BACKED-UP', 'RESTORE-QUARANTINE', 'PRIVACY-REPLAY', 'REDELETE-PENDING', 'INVALIDATED', 'EXPIRED', 'CONFLICT'];
const lifecycleEvents = ['QUARANTINE', 'APPLY-HOLD', 'RELEASE-HOLD', 'HOLD-RELEASE-RECONCILED', 'REQUEST-DELETE', 'START-DELETE', 'PROVIDER-CONFIRMED', 'PROVIDER-PARTIAL', 'PROVIDER-UNKNOWN', 'RECONCILE-PARTIAL', 'RECONCILE-UNKNOWN', 'BACKUP-CAPTURED', 'RESTORE-STARTED', 'PRIVACY-REPLAY-ALLOW', 'PRIVACY-REPLAY-REDELETE', 'PRIVACY-REPLAY-FAIL', 'START-REDELETE', 'INVALIDATE', 'EXPIRE', 'CAS-CONFLICT'];
const allowedLifecycle = new Map([
  ['ACTIVE|QUARANTINE', ['QUARANTINED', 'QUARANTINE-AUTHORITY+VERSION-CAS']],
  ['ACTIVE|APPLY-HOLD', ['HOLD-ACTIVE', 'LEGAL-HOLD-AUTHORITY+SCOPE-CAS']],
  ['HOLD-ACTIVE|RELEASE-HOLD', ['HOLD-RELEASE-PENDING', 'LEGAL-HOLD-RELEASE-AUTHORITY+NO-DELETE-SIDE-EFFECT']],
  ['HOLD-RELEASE-PENDING|HOLD-RELEASE-RECONCILED', ['ACTIVE', 'TWO-READBACKS+RELEASE-RECEIPT+CAS']],
  ['ACTIVE|REQUEST-DELETE', ['DELETE-PLANNED', 'UNEXPIRED-RETENTION-PLAN+EXACT-CUTOFF+IDENTITY-SET+NO-HOLD']],
  ['DELETE-PLANNED|START-DELETE', ['DELETE-IN-FLIGHT', 'PLAN-ROOT+ATTEMPT-ID+ONE-ATTEMPT-CAS']],
  ['DELETE-IN-FLIGHT|PROVIDER-CONFIRMED', ['PURGED', 'PROVIDER-CONFIRMATION+EXACT-IDENTITY+EVIDENCE']],
  ['DELETE-IN-FLIGHT|PROVIDER-PARTIAL', ['DELETE-PARTIAL', 'PROVIDER-PARTIAL-RECEIPT+UNRESOLVED-IDENTITY-SET']],
  ['DELETE-IN-FLIGHT|PROVIDER-UNKNOWN', ['DELETE-UNKNOWN', 'PROVIDER-UNKNOWN-RECEIPT+NO-AUTOMATIC-RETRY']],
  ['DELETE-PARTIAL|RECONCILE-PARTIAL', ['DELETE-PLANNED', 'NEW-AUTHORIZED-PLAN+NEW-EVIDENCE+REMAINING-IDENTITIES']],
  ['DELETE-UNKNOWN|RECONCILE-UNKNOWN', ['DELETE-PLANNED', 'AUTHORITATIVE-PROVIDER-STATE+NEW-AUTHORIZED-PLAN']],
  ['ACTIVE|BACKUP-CAPTURED', ['BACKED-UP', 'BACKUP-ID+COHORT+DATABASE-AND-OBJECT-DIGESTS+RETENTION-WINDOW']],
  ['BACKED-UP|RESTORE-STARTED', ['RESTORE-QUARANTINE', 'BACKUP-ID+RESTORE-ID+R2-CONSISTENCY+NO-ACTIVATION']],
  ['RESTORE-QUARANTINE|PRIVACY-REPLAY-ALLOW', ['ACTIVE', 'PRIVACY-REPLAY-COMPLETE+NO-DELETION-OBLIGATION+CAS']],
  ['RESTORE-QUARANTINE|PRIVACY-REPLAY-REDELETE', ['REDELETE-PENDING', 'PRIVACY-REPLAY-DELETION-SET+LINEAGE-ROOT']],
  ['RESTORE-QUARANTINE|PRIVACY-REPLAY-FAIL', ['QUARANTINED', 'FAIL-CLOSED-QUARANTINE-EVIDENCE']],
  ['REDELETE-PENDING|START-REDELETE', ['DELETE-IN-FLIGHT', 'NEW-REDELETE-PLAN+RESTORE-LINEAGE+ATTEMPT-ID']],
  ['QUARANTINED|INVALIDATE', ['INVALIDATED', 'INVALIDATION-AUTHORITY+EVIDENCE+CAS']],
  ['ACTIVE|EXPIRE', ['EXPIRED', 'TEST-INPUT-EXPIRY-ONLY+TRUSTED-TIME']],
]);
const lifecycleTransitions = [];
for (const state of lifecycleStates) {
  for (const event of lifecycleEvents) {
    const id = `DLT-${String(lifecycleTransitions.length + 1).padStart(3, '0')}`;
    const allow = allowedLifecycle.get(`${state}|${event}`);
    const conflict = event === 'CAS-CONFLICT' && state !== 'CONFLICT';
    const disposition = allow || conflict ? 'ALLOW' : 'BLOCK';
    const toState = allow ? allow[0] : conflict ? 'CONFLICT' : state;
    const specialTerminal = state === 'HOLD-ACTIVE' && ['REQUEST-DELETE', 'START-DELETE'].includes(event) ? 'LEGAL-HOLD-ACTIVE'
      : state === 'PURGED' && event === 'RESTORE-STARTED' ? 'PURGED-IDENTITY-CANNOT-RESURRECT'
        : state === 'DELETE-UNKNOWN' && event === 'START-DELETE' ? 'UNKNOWN-PROVIDER-RESULT-NO-RETRY'
          : 'DATA-LIFECYCLE-TRANSITION-NOT-PERMITTED';
    lifecycleTransitions.push({
      transitionId: id, fromState: state, event, disposition, toState,
      triggerSchema: 'DataLifecycleEventV1', guard: allow ? allow[1] : conflict ? 'FENCED-CAS-LOSER-RECEIPT' : 'FALSE',
      authorityRoot: disposition === 'ALLOW' ? 'MISSING/EXTERNAL-AUTHORITY-OR-POLICY-ROOT' : 'NONE',
      casRequired: disposition === 'ALLOW', evidenceSchemaRoot, terminal: disposition === 'BLOCK' ? specialTerminal : 'NONE',
    });
  }
}
assert(lifecycleTransitions.length === lifecycleStates.length * lifecycleEvents.length, 'total lifecycle matrix');
const lifecycleClasses = [
  ['DL-CLASS-001', 'uploaded source object and immutable object version'], ['DL-CLASS-002', 'parsed OCR chunk and index derivative bound to source version'],
  ['DL-CLASS-003', 'operational message conversation and contact data'], ['DL-CLASS-004', 'AI input output tool trace and approval state'],
  ['DL-CLASS-005', 'backup cohort object and exact backupId/digests'], ['DL-CLASS-006', 'restore candidate in quarantine'],
  ['DL-CLASS-007', 'privacy deletion intent plan attempt result and audit'], ['DL-CLASS-008', 'Legal Hold scope version and CAS receipt'],
  ['DL-CLASS-009', 'real approved TestInput with consent and expiry'], ['DL-CLASS-010', 'provider deletion attempt with PARTIAL or UNKNOWN semantics'],
].map(([dataClassId, scope]) => ({ dataClassId, scope, admittedIdentityStoreProviderMembers: [], denominatorState: 'BLOCKED-PENDING-ACCEPTED-SOURCE-UNIVERSE', emptyDenominatorMayPass: false }));
const lifecycleTransitionCollectionRoot = collectionRoot('CONNECT-TRD2V4-DATA-LIFECYCLE-TRANSITIONS-V1', lifecycleTransitions, 'transitionId');
const lifecycleClassCollectionRoot = collectionRoot('CONNECT-TRD2V4-DATA-LIFECYCLE-CLASSES-V1', lifecycleClasses, 'dataClassId');

const publicRequirements = [];
const pubLines = text(P.publicCyber).split('\n');
for (let i = 0; i < pubLines.length; i += 1) {
  const m = pubLines[i].match(/^### [^`]*`(PRCH2-REQ-\d{3})`/);
  if (!m) continue;
  const fields = {};
  for (let j = i + 1; j < Math.min(pubLines.length, i + 12); j += 1) {
    const f = pubLines[j].match(/^\d+(?:\.\d+)+\s+(requirement|sourceBasis|dependencies|proof|failure)=`([\s\S]*)`\.$/);
    if (f) fields[f[1]] = f[2];
  }
  assert(['requirement', 'sourceBasis', 'dependencies', 'proof', 'failure'].every(k => Object.hasOwn(fields, k)), `public fields ${m[1]}`);
  publicRequirements.push({ requirementId: m[1], fields });
}
assert(publicRequirements.length === 52, `public requirements ${publicRequirements.length}`);
const publicControls = publicRequirements.map((p, i) => {
  const controlId = `PUBLIC-CONTROL-${String(i).padStart(3, '0')}`;
  const rec = {
    controlId, sourceRequirementId: p.requirementId, sourceRoot: EXPECTED.publicCyber,
    sourceDisposition: 'ADMITTED-AS-CURRENT-CANDIDATE-CONTROL-SOURCE-PENDING-ACCEPTED-SOURCE-UNIVERSE',
    sourceRequirementDigest: recordDigest('CONNECT-TRD2V4-PUBLIC-SOURCE-REQUIREMENT-V1', p),
    vectorIds: vectorModes.map(mode => `${controlId}-${mode}`), evidenceSchemaRoot,
    hardeningGateId: `PUBLIC-HARDENING-GATE-${String(i).padStart(3, '0')}`,
    publicInvariant: 'PUBLIC', privatePathCount: 0, currentState: 'BLOCKED-PENDING-SOURCE-UNIVERSE-AND-EXTERNAL-EXECUTION-AUTHORITY',
  };
  rec.controlRoot = recordDigest('CONNECT-TRD2V4-PUBLIC-CONTROL-V1', rec);
  return rec;
});
const publicControlCollectionRoot = collectionRoot('CONNECT-TRD2V4-PUBLIC-CONTROLS-V1', publicControls, 'controlId');

const graphNodes = [];
const nodeIds = new Set();
function addNode(nodeId, nodeType, rank, rootValue, state = 'PRESENT') {
  assert(!nodeIds.has(nodeId), `duplicate node ${nodeId}`); nodeIds.add(nodeId);
  graphNodes.push({ nodeId, nodeType, rank, root: rootValue, state });
}
addNode('EXT:B0', 'ExternalAuthorityRoot', 0, 'MISSING/EXTERNAL-B0', 'MISSING');
addNode('EXT:AUTHORITY', 'ExternalAuthorityEnvelope', 1, 'MISSING/EXTERNAL-AUTHORITY', 'MISSING');
addNode('EXT:PROTOCOL', 'AcceptedReviewProtocolRoot', 0, 'MISSING/EXTERNAL-ACCEPTED-PROTOCOL', 'MISSING');
addNode('EXT:SOURCE-UNIVERSE', 'AcceptedSourceUniverseRoot', 0, 'MISSING/EXTERNAL-ACCEPTED-SOURCE-UNIVERSE', 'MISSING');
addNode('EXT:EVALUATOR', 'AcceptedEvaluatorRoot', 0, 'MISSING/EXTERNAL-ACCEPTED-EVALUATOR', 'MISSING');
addNode('EXT:RUNNER-A', 'AcceptedRunnerRoot', 0, 'MISSING/EXTERNAL-ACCEPTED-RUNNER-A', 'MISSING');
addNode('EXT:RUNNER-B', 'AcceptedRunnerRoot', 0, 'MISSING/EXTERNAL-ACCEPTED-RUNNER-B', 'MISSING');
addNode('EXT:FREEZE', 'DetachedFreezeReceipt', 2, 'MISSING/DETACHED-FREEZE-RECEIPT', 'MISSING');

const supportNodeDefs = [
  ['SRC:V3-SUBJECT', EXPECTED.v3], ['SRC:V3-V2-BYTE-MANIFEST', EXPECTED.v3V2], ['SRC:V3-OBS-MANIFEST', EXPECTED.v3Obs],
  ['SRC:V3-CONTROLS', EXPECTED.v3Controls], ['SRC:V3-REVIEW', EXPECTED.review], ['SRC:V3-FINDINGS', EXPECTED.findings],
  ['SRC:PUBLIC-CYBER-V2', EXPECTED.publicCyber], ['SUPPORT:INHERITED-V3', inheritedRawRoot], ['SUPPORT:FIELD-MAP', fieldMapRawRoot],
  ['COLLECTION:INHERITED-V3', inheritedCollectionRoot], ['COLLECTION:FIELD-MAP', fieldMapCollectionRoot],
  ['COLLECTION:OBSERVATIONS', observationLogicalCollectionRoot], ['COLLECTION:PORTABLE-LOCATORS', portableLocatorCollectionRoot],
  ['COLLECTION:CAPTURES', captureCollectionRoot], ['COLLECTION:BIDI', bidiCollectionRoot], ['COLLECTION:SEVERITY', severityCollectionRoot],
  ['SCHEMA:PREDICATE-DSL', predicateDsl.dslRoot], ['SCHEMA:EVIDENCE', evidenceSchemaRoot], ['COLLECTION:RESULT-SCHEMAS', resultSchemaCollectionRoot],
  ['COLLECTION:VECTORS', vectorCollectionRoot], ['COLLECTION:MISSING-VALUES', missingValueCollectionRoot], ['COLLECTION:MISSING-PREDICATES', missingPredicateCollectionRoot],
  ['COLLECTION:ATOMIC-PARENTS', atomicParentCollectionRoot], ['COLLECTION:ATOMIC-CHILDREN', atomicChildCollectionRoot],
  ['COLLECTION:LIFECYCLE-CLASSES', lifecycleClassCollectionRoot], ['COLLECTION:LIFECYCLE-TRANSITIONS', lifecycleTransitionCollectionRoot],
  ['COLLECTION:PUBLIC-CONTROLS', publicControlCollectionRoot],
];
for (const [id, digest] of supportNodeDefs) addNode(id, id.startsWith('SRC:') ? 'SourceArtifact' : id.startsWith('SCHEMA:') ? 'SchemaRoot' : 'CollectionRoot', 3, digest);
for (const schema of resultSchemas) addNode(`SCHEMA:RESULT:${schema.outputType}`, 'ResultSchemaRoot', 3, schema.schemaRoot);
for (const row of inheritedRows) addNode(`V3R:${row.manifestId}`, 'InheritedV3RequirementRecord', 4, row.recordDigest);
for (const row of observationLogicalRecords) addNode(`SOE:${row.envelopeId}`, 'SourceObservationEnvelope', 4, row.logicalRecordDigest);
for (const f of fixes) addNode(`FINDING:${f.findingId}`, 'ReviewerLocalFinding', 4, EXPECTED.findings);
for (const v of vectors) addNode(`VECTOR:${v.vectorId}`, 'TestVector', 5, v.vectorRoot);
for (const mv of missingValues) addNode(`MISSING:${mv.missingValueId}`, 'MissingValueLifecycle', 5, mv.recordRoot);
for (const p of missingValuePredicates) addNode(`MVR:${p.predicateId}`, 'MissingValuePredicate', 6, p.predicateRoot);
for (const req of requirementBlueprints) addNode(`REQ:${req.requirementId}`, 'Requirement', 100 + Number(req.requirementId.slice(-3)), 'BOUND-BY-DETACHED-CANDIDATE-PACKET');
for (const p of predicates) addNode(`PRED:${p.predicateId}`, 'ConformancePredicate', 300 + Number(p.requirementId.slice(-3)), p.predicateRoot);
for (const req of requirementBlueprints) addNode(`RESULT:${req.requirementId}`, 'ValidationResultReceipt', 500 + Number(req.requirementId.slice(-3)), 'MISSING/UNEXECUTED-RESULT', 'MISSING');
addNode('REVIEW:GENERATION-1', 'ReviewGenerationReceipt', 700, 'MISSING/GENERATION-1', 'MISSING');
addNode('REVIEW:GENERATION-2', 'ReviewGenerationReceipt', 700, 'MISSING/GENERATION-2', 'MISSING');
addNode('REVIEW:RECONCILIATION', 'ReconciliationReceipt', 701, 'MISSING/RECONCILIATION', 'MISSING');
addNode('REVIEW:ACCEPTANCE', 'DefinitionAcceptanceEnvelope', 702, 'MISSING/DEFINITION-ACCEPTANCE', 'MISSING');

const graphEdges = [];
const edgeKeys = new Set();
function addEdge(edgeType, fromQualifiedId, toQualifiedId, rationale, sourceRoot, status = 'MANDATORY') {
  assert(nodeIds.has(fromQualifiedId) && nodeIds.has(toQualifiedId), `dangling edge ${fromQualifiedId}->${toQualifiedId}`);
  const key = `${edgeType}|${fromQualifiedId}|${toQualifiedId}`;
  assert(!edgeKeys.has(key), `duplicate edge ${key}`); edgeKeys.add(key);
  graphEdges.push({ edgeId: `TRD2V4-EDGE-${String(graphEdges.length + 1).padStart(5, '0')}`, edgeType, fromQualifiedId, toQualifiedId, rationale, sourceRoot, status });
}
addEdge('AuthorityDependency', 'EXT:B0', 'EXT:AUTHORITY', 'B0 must pre-exist authority use', 'MISSING/EXTERNAL-B0');
addEdge('AuthorityDependency', 'EXT:AUTHORITY', 'EXT:FREEZE', 'external authority issues detached freeze only after candidate root exists', 'MISSING/EXTERNAL-AUTHORITY');
for (const [id, digest] of supportNodeDefs) addEdge('FreezeMembership', 'EXT:FREEZE', id, 'freeze packet admits exact local support/source root', digest);
for (const row of inheritedRows) {
  addEdge('FreezeMembership', 'EXT:FREEZE', `V3R:${row.manifestId}`, 'freeze admits exact inherited v3 record', row.recordDigest);
  addEdge('ProvenanceDependency', 'SRC:V3-SUBJECT', `V3R:${row.manifestId}`, 'record is sliced from exact v3 Subject root', EXPECTED.v3);
}
for (const row of observationLogicalRecords) {
  addEdge('FreezeMembership', 'EXT:FREEZE', `SOE:${row.envelopeId}`, 'freeze admits exact logical observation', row.logicalRecordDigest);
  addEdge('ProvenanceDependency', 'SRC:V3-OBS-MANIFEST', `SOE:${row.envelopeId}`, 'logical envelope preserves exact v3 observation row and source bytes', EXPECTED.v3Obs);
}
for (const f of fixes) {
  addEdge('FreezeMembership', 'EXT:FREEZE', `FINDING:${f.findingId}`, 'freeze admits one distinct reviewer-local Finding', EXPECTED.findings);
  addEdge('ProvenanceDependency', 'SRC:V3-FINDINGS', `FINDING:${f.findingId}`, 'Finding is an exact member of the frozen manifest', EXPECTED.findings);
}
for (const v of vectors) addEdge('FreezeMembership', 'EXT:FREEZE', `VECTOR:${v.vectorId}`, 'freeze admits exact immutable vector', v.vectorRoot);
for (const mv of missingValues) {
  addEdge('FreezeMembership', 'EXT:FREEZE', `MISSING:${mv.missingValueId}`, 'freeze admits unresolved MissingValue state', mv.recordRoot);
  addEdge('ValidationDependency', `MISSING:${mv.missingValueId}`, `MVR:${mv.resolutionPredicateId}`, 'resolution predicate reads one exact MissingValue record', mv.recordRoot);
  addEdge('ValidationDependency', 'EXT:B0', `MVR:${mv.resolutionPredicateId}`, 'role and appointment authority originate outside candidate', 'MISSING/EXTERNAL-B0');
}
const rootNodeMap = new Map();
for (const node of graphNodes) if (/^[0-9a-f]{64}$/.test(node.root) && !rootNodeMap.has(node.root)) rootNodeMap.set(node.root, node.nodeId);
for (let i = 0; i < requirementBlueprints.length; i += 1) {
  const req = requirementBlueprints[i]; const reqNode = `REQ:${req.requirementId}`; const pred = predicates[i];
  addEdge('FreezeMembership', 'EXT:FREEZE', reqNode, 'detached freeze reaches every mandatory Requirement', 'MISSING/DETACHED-FREEZE-RECEIPT');
  for (const dep of req.dependencies) addEdge('ClosurePrerequisite', `REQ:${dep}`, reqNode, 'authoritative typed projection of Requirement dependency', 'BOUND-BY-DETACHED-CANDIDATE-PACKET');
  if (req.sourceKind === 'V3-HOSTILE-FINDING') addEdge('ProvenanceDependency', `FINDING:${req.sourceId}`, reqNode, 'one-to-one finding correction without merge or closure transfer', EXPECTED.findings);
  else {
    const sourceRow = inheritedRowBySourceId.get(req.sourceId);
    addEdge('ProvenanceDependency', `V3R:${sourceRow.manifestId}`, reqNode, 'one-to-one byte-preservation provenance', sourceRow.recordDigest);
  }
  addEdge('ValidationDefinition', reqNode, `PRED:${pred.predicateId}`, 'Requirement resolves to one executable predicate envelope', pred.predicateRoot);
  for (const inputRoot of [...new Set([...pred.inputSchemaRoots, ...pred.inputArtifactRoots])]) {
    const inputNode = rootNodeMap.get(inputRoot);
    assert(inputNode, `predicate input root has no typed node ${pred.predicateId}:${inputRoot}`);
    addEdge('ValidationDependency', inputNode, `PRED:${pred.predicateId}`, 'predicate reads one exact declared input root', inputRoot);
  }
  addEdge('ValidationDependency', 'EXT:EVALUATOR', `PRED:${pred.predicateId}`, 'predicate requires an externally accepted evaluator root', 'MISSING/EXTERNAL-ACCEPTED-EVALUATOR');
  addEdge('ValidationDependency', 'EXT:RUNNER-A', `PRED:${pred.predicateId}`, 'predicate requires an externally accepted runner root', 'MISSING/EXTERNAL-ACCEPTED-RUNNER');
  for (const vectorId of pred.testVectorIds) addEdge('ValidationDependency', `VECTOR:${vectorId}`, `PRED:${pred.predicateId}`, 'predicate consumes exact vector', vectorCollectionRoot);
  addEdge('ResultProduction', `PRED:${pred.predicateId}`, `RESULT:${req.requirementId}`, 'sole predicate produces sole typed result receipt', resultSchemaByType[req.outputType].schemaRoot);
  addEdge('InvalidationEdge', 'EXT:FREEZE', `RESULT:${req.requirementId}`, 'freeze root change invalidates result', 'MISSING/DETACHED-FREEZE-RECEIPT');
  for (const inputRoot of [...new Set([...pred.inputSchemaRoots, ...pred.inputArtifactRoots])]) {
    const inputNode = rootNodeMap.get(inputRoot);
    addEdge('InvalidationEdge', inputNode, `RESULT:${req.requirementId}`, 'declared predicate-input root change invalidates result receipt', inputRoot);
  }
  addEdge('ReviewInput', `RESULT:${req.requirementId}`, 'REVIEW:GENERATION-1', 'generation one requires complete 113-result set', resultSchemaCollectionRoot);
  addEdge('ReviewInput', `RESULT:${req.requirementId}`, 'REVIEW:GENERATION-2', 'generation two requires complete 113-result set', resultSchemaCollectionRoot);
}
for (const ext of ['EXT:PROTOCOL', 'EXT:SOURCE-UNIVERSE', 'EXT:B0', 'EXT:EVALUATOR', 'EXT:RUNNER-A']) addEdge('ReviewEligibility', ext, 'REVIEW:GENERATION-1', 'generation one binds every external prerequisite', 'MISSING/EXTERNAL');
for (const ext of ['EXT:PROTOCOL', 'EXT:SOURCE-UNIVERSE', 'EXT:B0', 'EXT:EVALUATOR', 'EXT:RUNNER-B']) addEdge('ReviewEligibility', ext, 'REVIEW:GENERATION-2', 'generation two binds every external prerequisite', 'MISSING/EXTERNAL');
addEdge('ReconciliationInput', 'REVIEW:GENERATION-1', 'REVIEW:RECONCILIATION', 'complete normalized finding set generation one', 'MISSING/GENERATION-1');
addEdge('ReconciliationInput', 'REVIEW:GENERATION-2', 'REVIEW:RECONCILIATION', 'complete normalized finding set generation two', 'MISSING/GENERATION-2');
addEdge('AcceptanceInput', 'REVIEW:RECONCILIATION', 'REVIEW:ACCEPTANCE', 'total authorized dispositions and zero open vetoes', 'MISSING/RECONCILIATION');
for (const id of ['EXT:B0', 'EXT:PROTOCOL', 'EXT:SOURCE-UNIVERSE', 'EXT:FREEZE', 'COLLECTION:RESULT-SCHEMAS', 'COLLECTION:PUBLIC-CONTROLS', 'COLLECTION:LIFECYCLE-TRANSITIONS']) addEdge('AcceptanceInput', id, 'REVIEW:ACCEPTANCE', 'Definition Acceptance binds mandatory root', 'MISSING-OR-EXACT-ROOT');

const graphRanks = Object.fromEntries(graphNodes.map(n => [n.nodeId, n.rank]));
const rankViolation = graphEdges.find(e => graphRanks[e.fromQualifiedId] >= graphRanks[e.toQualifiedId]);
assert(!rankViolation, `typed graph not forward by rank ${rankViolation ? `${rankViolation.fromQualifiedId}(${graphRanks[rankViolation.fromQualifiedId]})->${rankViolation.toQualifiedId}(${graphRanks[rankViolation.toQualifiedId]})` : ''}`);
const typedNodeCollectionRoot = collectionRoot('CONNECT-TRD2V4-TYPED-GRAPH-NODES-V1', graphNodes, 'nodeId');
const typedEdgeCollectionRoot = collectionRoot('CONNECT-TRD2V4-TYPED-GRAPH-EDGES-V1', graphEdges, 'edgeId');
const typedGraphRoot = recordDigest('CONNECT-TRD2V4-TYPED-GRAPH-V1', { typedNodeCollectionRoot, typedEdgeCollectionRoot, nodeCount: graphNodes.length, edgeCount: graphEdges.length });

const mandatoryRootFieldNames = [
  'candidatePacketBindingRoot', 'candidateRoot', 'candidateRequirementCollectionRoot', 'inheritedV3ManifestRoot', 'fieldMapManifestRoot', 'controlRegistryRoot',
  'v3SubjectRoot', 'v3InheritedV2ManifestRoot', 'v3ObservationManifestRoot', 'v3ControlRegistryRoot', 'v3ReviewRoot', 'v3FindingsRoot', 'publicCyberSuccessorRoot',
  'typedGraphRoot', 'predicateDslRoot', 'predicateCollectionRoot', 'vectorCollectionRoot', 'evidenceSchemaRoot', 'resultSchemaCollectionRoot',
  'fieldMapCollectionRoot', 'logicalObservationCollectionRoot', 'portableLocatorCollectionRoot', 'captureCollectionRoot', 'bidiCollectionRoot', 'severityCollectionRoot',
  'missingValueCollectionRoot', 'missingPredicateCollectionRoot', 'atomicParentCollectionRoot', 'atomicChildCollectionRoot',
  'dataLifecycleClassCollectionRoot', 'dataLifecycleTransitionCollectionRoot', 'publicControlCollectionRoot',
  'b0AcceptanceRoot', 'protocolAcceptanceRoot', 'sourceUniverseAcceptanceRoot', 'authorityEnvelopeRoot', 'freezeReceiptRoot', 'appointmentSetRoot',
  'evaluatorRoot', 'runnerARoot', 'runnerBRoot', 'generationOneRoot', 'generationTwoRoot', 'reconciliationRoot', 'allResultReceiptsRoot', 'openVetoSetRoot',
];
const reviewSchemas = {
  ReviewGenerationReceipt: {
    additionalProperties: false,
    required: ['generationId', 'candidatePacketBindingRoot', 'mandatoryRootSetRoot', 'protocolAcceptanceRoot', 'appointmentSetRoot', 'reviewerIdentityRoots', 'independenceEvidenceRoot', 'normalizerRoot', 'completeResultReceiptSetRoot', 'completeFindingSetRoot', 'receiptSetRoot', 'startedAt', 'completedAt', 'status'],
    constraints: ['generationId is exactly GENERATION-1 or GENERATION-2', 'receipt sets are non-empty', 'the two receiptSetRoots are disjoint', 'all mandatory roots equal detached packet binding'],
  },
  NormalizedFinding: {
    additionalProperties: false,
    required: ['findingId', 'generationId', 'severity', 'subjectRoot', 'location', 'defect', 'cause', 'consequence', 'requiredFix', 'acceptancePredicateRoot', 'status', 'noMergeKey', 'findingRoot'],
    constraints: ['noMergeKey equals findingId', 'one immutable record per finding per generation', 'no closure transfer'],
  },
  ReconciliationDisposition: {
    additionalProperties: false,
    required: ['dispositionId', 'mandatoryRootSetRoot', 'generationOneRoot', 'generationTwoRoot', 'findingId', 'generationFindingRoots', 'disposition', 'authorityReceiptRoot', 'evidenceRoot', 'openVeto', 'reconciliationRoot'],
    constraints: ['exactly one disposition per union finding', 'P0/P1 cannot be risk-accepted', 'merge requires explicit protocol authority but transfers zero closure', 'all omitted or conflicted findings remain open vetoes'],
  },
  DefinitionAcceptanceEnvelope: {
    additionalProperties: false,
    required: ['acceptanceId', 'mandatoryRootSetRoot', ...mandatoryRootFieldNames, 'status', 'issuedByAuthorityRoot', 'issuedAt', 'validThrough', 'supersedesRoot', 'invalidationBindingRoot'],
    constraints: ['all root fields exact and non-missing', 'generation roots distinct', 'allResultReceiptsRoot denominator equals 113 and every receipt PASS', 'openVetoSetRoot denotes empty set only after nonempty reviewed finding denominator', 'PUBLIC invariant', 'Private paths zero'],
  },
};
for (const [name, schema] of Object.entries(reviewSchemas)) schema.schemaRoot = recordDigest(`CONNECT-TRD2V4-${name.toUpperCase()}-SCHEMA-V1`, schema);
const reviewSchemaCollectionRoot = collectionRoot('CONNECT-TRD2V4-REVIEW-SCHEMAS-V1', Object.entries(reviewSchemas).map(([schemaId, schema]) => ({ schemaId, ...schema })), 'schemaId');

writeJson(OUT.controls, {
  schemaVersion: 'CONNECT-TRD2V4-EXECUTABLE-CLOSURE-CONTROLS-V1',
  artifactClass: 'PLANNING-ONLY; MACHINE-READABLE-CONTRACT; NOT-EXECUTED; NOT-ACCEPTANCE; NOT-GATE-CREDIT',
  immutableInputs: { ...EXPECTED, inheritedV3ManifestRoot: inheritedRawRoot, fieldMapManifestRoot: fieldMapRawRoot },
  predicateDsl,
  evidenceSchema: { ...evidenceSchemaBase, schemaRoot: evidenceSchemaRoot },
  resultSchemas,
  resultSchemaCollectionRoot,
  resultReceiptInstances: [],
  mandatoryResultReceiptDenominator: 113,
  emptyResultReceiptSetMayPass: false,
  testVectors: vectors,
  vectorCollectionRoot,
  conformancePredicates: predicates,
  predicateCollectionRoot,
  missingValues,
  missingValueCollectionRoot,
  missingValuePredicates,
  missingPredicateCollectionRoot,
  atomicParents,
  atomicParentCollectionRoot,
  atomicChildren,
  atomicChildCollectionRoot,
  atomicDenominator: { total: 113, atomic: 101, compound: 12, gap: 0, overlap: 0, emptyCompoundChildSets: 0 },
  dataLifecycle: {
    acceptedIdentityStoreProviderUniverseRoot: 'MISSING/EXTERNAL-ACCEPTED-SOURCE-UNIVERSE',
    admittedIdentityStoreProviderMembers: [], admittedDenominator: 0, emptyDenominatorMayPass: false,
    classes: lifecycleClasses, classCollectionRoot: lifecycleClassCollectionRoot,
    states: lifecycleStates, events: lifecycleEvents, matrixRows: lifecycleTransitions,
    transitionCollectionRoot: lifecycleTransitionCollectionRoot,
    matrixExpectedRows: lifecycleStates.length * lifecycleEvents.length,
    lineageSchema: ['dataIdentity', 'storeIdentity', 'providerIdentity', 'tenantIdentity', 'sourceVersion', 'derivativeRoots', 'backupId', 'restoreId', 'deletionPlanId', 'retentionCutoff', 'cascadeMemberSetRoot', 'predecessorLineageRoot'],
    currentResult: 'BLOCKED-PENDING-NONEMPTY-ACCEPTED-SOURCE-UNIVERSE',
  },
  publicCyber: {
    currentSuccessor: { path: P.publicCyber, sha256: EXPECTED.publicCyber, disposition: 'ADMITTED-AS-CURRENT-CANDIDATE-PENDING-ACCEPTED-SOURCE-UNIVERSE' },
    controls: publicControls, controlCollectionRoot: publicControlCollectionRoot, controlDenominator: 52,
    mappingContract: 'each control has exact source Requirement, five vector modes, evidence schema and one hardening gate',
    publicInvariant: 'PUBLIC', privatePathCount: 0, privateRemediationAllowed: false,
  },
  typedGraph: { nodes: graphNodes, edges: graphEdges, nodeCollectionRoot: typedNodeCollectionRoot, edgeCollectionRoot: typedEdgeCollectionRoot, typedGraphRoot, nodeCount: graphNodes.length, edgeCount: graphEdges.length, cycleCount: 0, danglingCount: 0, selfEdgeCount: 0, duplicateEdgeCount: 0 },
  reviewSchemas,
  reviewSchemaCollectionRoot,
  mandatoryRootFieldNames,
  actualReviewGenerations: [], actualReconciliation: null, actualDefinitionAcceptance: null,
  externalPrerequisites: { b0: 'MISSING', protocol: 'MISSING', sourceUniverse: 'MISSING', authorityEnvelope: 'MISSING', freezeReceipt: 'MISSING', appointments: 'MISSING', evaluator: 'MISSING', runnerA: 'MISSING', runnerB: 'MISSING' },
  currentState: { acceptedRequirements: 0, acceptedObservations: 0, acceptedFindings: 0, executedPredicates: 0, reviewGenerations: 0, definitionAcceptance: 'ABSENT', gate29: 'BLOCKED', developmentFreeze: 'ACTIVE' },
  publicInvariant: 'PUBLIC', privateRemediationAllowed: false,
});

const controlsRawRoot = fileSha(OUT.controls);
const controlPhysical = physical(OUT.controls);
for (let i = 0; i < requirementBlueprints.length; i += 1) {
  const req = requirementBlueprints[i]; const pred = predicates[i];
  req.proofPredicate = `predicateId=${pred.predicateId};predicateRoot=${pred.predicateRoot};predicateCollectionRoot=${predicateCollectionRoot};controlRegistryRoot=${controlsRawRoot};vectorSetRoot=${pred.vectorSetRoot};resultSchemaRoot=${resultSchemaByType[req.outputType].schemaRoot};expected=PASS;current=BLOCKED;evaluatorRoot=MISSING/EXTERNAL-ACCEPTED-EVALUATOR;runnerRoot=MISSING/EXTERNAL-ACCEPTED-RUNNER;failure=${req.failureTerminal}`;
}

const subjectHeader = `# 1. Connect — Section 35.6 TRD-2 v4 immutable executable-closure successor requirements

## 1.1 Identity, exact inputs and authority boundary

1.1.1 \`artifactId=CONNECT-SECTION-35-6-TRD-2-V4-IMMUTABLE-SUCCESSOR-REQUIREMENTS-2026-08-29-V1\`.

1.1.2 artifactClass=\`PLANNING-ONLY; IMMUTABLE-SUCCESSOR-REQUIREMENTS-CANDIDATE; NOT-DEFINITION; NOT-ACCEPTANCE; NOT-GATE-CREDIT\`.

1.1.3 immutable v3 Subject root=\`${EXPECTED.v3}\`; physical identity=\`${physical(P.v3).lines} lines/${physical(P.v3).bytes} bytes\`.

1.1.4 v3 inherited-v2 byte manifest root=\`${EXPECTED.v3V2}\`; v3 observation manifest root=\`${EXPECTED.v3Obs}\`; v3 closure-control root=\`${EXPECTED.v3Controls}\`.

1.1.5 independent v3 hostile-review root=\`${EXPECTED.review}\`; findings-manifest root=\`${EXPECTED.findings}\`; exact new Finding denominator=\`12\`, each distinct and open.

1.1.6 v4 inherited-v3 byte manifest root=\`${inheritedRawRoot}\`; record collection root=\`${inheritedCollectionRoot}\`; exact preserved v3 Requirement denominator=\`101\`.

1.1.7 v4 Field-map and portable-source manifest root=\`${fieldMapRawRoot}\`; Field-map collection root=\`${fieldMapCollectionRoot}\`; logical-observation root=\`${observationLogicalCollectionRoot}\`; exact observations=\`84\`; exact source parts=\`128\`; exact registered Bidi controls=\`13 U+200F\`.

1.1.8 v4 executable control registries root=\`${controlsRawRoot}\`; physical identity=\`${controlPhysical.lines} lines/${controlPhysical.bytes} bytes\`; typed graph root=\`${typedGraphRoot}\`; predicate collection root=\`${predicateCollectionRoot}\`; vector collection root=\`${vectorCollectionRoot}\`.

1.1.9 current Public/cyber successor root=\`${EXPECTED.publicCyber}\`; disposition=\`CURRENT-CANDIDATE-PENDING-ACCEPTED-SOURCE-UNIVERSE\`; binding repository invariant=\`PUBLIC\`; Private remediation, rollback and incident paths=\`FORBIDDEN\`.

1.1.10 external B0, accepted Protocol, accepted Source Universe, Authority/Freeze receipts, appointments, evaluator/runners, two review generations, Reconciliation and Definition Acceptance remain typed absent. This Candidate creates none of them.

1.1.11 Product code, Git, GitHub settings, Build, Push, Merge, Release, Deploy and Provider action are outside this artifact and unauthorized.

## 1.2 Exact Requirement contract

1.2.1 every Requirement below has exactly and in order: \`statement\`, \`defectCauseImpact\`, \`proofPredicate\`, \`dependencies\`, \`sourceBasis\`.

1.2.2 every \`statement\` names exactly one result instance and exactly one output type. Atomic decomposition creates children only in the support Registry and transfers zero Parent effort, closure or credit.

1.2.3 \`dependencies\` is a human-readable projection of the exact typed \`ClosurePrerequisite\` rows in graph root \`${typedGraphRoot}\`; only earlier v4 Requirement IDs are legal.

1.2.4 \`proofPredicate\` resolves to one full predicate envelope and exactly five immutable vector modes. Missing external evaluator/runner or any stale/wrong root returns \`BLOCKED\`, never PASS.

1.2.5 v3 Requirement, v2 Requirement, Observation and Finding identities remain separate. Similarity, shared source, shared output or shared fix grants no Merge, closure transfer, suppression or acceptance.

1.2.6 detached candidate-packet binding is generated only after these bytes freeze. It may bind this Candidate root, but no self-root is inserted into these bytes.

# 2. Twelve distinct v3-review correction Requirements
`;

let subject = subjectHeader;
for (let i = 0; i < requirementBlueprints.length; i += 1) {
  const req = requirementBlueprints[i];
  if (i === 12) subject += `\n# 3. One-to-one inherited v3 Requirement preservation — 101\n`;
  const section = i < 12 ? `2.${i + 1}` : `3.${i - 11}`;
  subject += `\n## ${section} \`${req.requirementId}\` — ${req.title}\n\n`;
  subject += `- \`statement\`: ${req.statement}\n\n`;
  subject += `- \`defectCauseImpact\`: ${req.defectCauseImpact}\n\n`;
  subject += `- \`proofPredicate\`: ${req.proofPredicate}\n\n`;
  subject += `- \`dependencies\`: [${req.dependencies.join(',')}]\n\n`;
  subject += `- \`sourceBasis\`: ${req.sourceBasis}\n`;
}
subject += `

# 4. One-to-one crosswalks and non-transfer state

## 4.1 v3 hostile Findings

4.1.1 exact crosswalk=\`TRD2V3-IHR-F001..F012 → TRD2V4-REQ-000..011\`; mapping cardinality=\`12/12\`; merged=\`0\`; suppressed=\`0\`; closure transferred=\`0\`; accepted=\`0\`.

4.1.2 each correction Requirement has a distinct result ID, predicate, five-vector set, failure terminal and noMergeKey inherited only as provenance.

## 4.2 v3 Requirements and underlying evidence

4.2.1 exact member-level crosswalk is published in the detached packet binding; source set=\`TRD2V3-REQ-000..100\`; successor set=\`TRD2V4-REQ-012..112\` in deterministic topological order; mapping cardinality=\`101/101\`; byte mismatches=\`0\`; closure transferred=\`0\`; accepted=\`0\`.

4.2.2 underlying exact v2 byte slices remain \`85/85\` under root \`${EXPECTED.v3V2}\`; exact observations remain \`84/84\`, source parts \`128/128\`, registered Bidi controls \`13/13 U+200F\`; none receives acceptance credit from preservation.

# 5. Non-vacuity, external prerequisites and safe terminal

## 5.1 Closed denominators

5.1.1 v4 Requirement denominator=\`113\`; correction=\`12\`; inherited=\`101\`; exactly-five-field records=\`113\`; sole outputs=\`113\`.

5.1.2 Atomic parent denominator=\`113\`; atomic=\`101\`; compound=\`12\`; compound empty child sets=\`0\`; gap=\`0\`; overlap=\`0\`; parent effort and credit=\`0\`.

5.1.3 predicate denominator=\`113\`; test vectors=\`565\`; result receipt mandatory denominator=\`113\`; actual result receipts=\`0\`; empty result set may pass=\`false\`.

5.1.4 DataLifecycle state-event template is total, but admitted identity/store/provider denominator remains external and empty; empty denominator may pass=\`false\`; therefore current DataLifecycle result=\`BLOCKED\`.

## 5.2 Review and Acceptance

5.2.1 two review generations must bind the same detached mandatory-root set, use distinct eligible receipt sets and produce complete normalized Finding sets. Current generations=\`0/2\`.

5.2.2 Reconciliation must give every union Finding exactly one authorized disposition without merge or closure transfer. Current Reconciliation=\`ABSENT\`.

5.2.3 Definition Acceptance must bind all 113 PASS receipts and every mandatory local/external root with zero open vetoes. Current Acceptance=\`ABSENT\`.

## 5.3 Current state

5.3.1 accepted Requirements=\`0/113\`; accepted observations=\`0/84\`; closed v3 Findings=\`0/12\`; executed predicates=\`0/113\`.

5.3.2 \`Gate29=BLOCKED\`; \`Development freeze=ACTIVE\`; repository visibility invariant=\`PUBLIC\`; Private remediation=\`FORBIDDEN\`.

5.3.3 Product completion, remaining person-hours, critical path and calendar ETA=\`unknown/unavailable\`.
`;
fs.writeFileSync(OUT.subject, subject, 'utf8');

const subjectRawRoot = fileSha(OUT.subject);
const v4Requirements = parseFiveFieldRequirements(OUT.subject, 'TRD2V4-REQ', ['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis']);
assert(v4Requirements.length === 113, `v4 parsed requirements ${v4Requirements.length}`);
const canonicalRequirementRecords = v4Requirements.map((r, i) => {
  const rec = {
    schemaVersion: 'CONNECT-TRD2V4-REQUIREMENT-RECORD-V1', requirementId: r.id,
    statement: r.fields.statement, defectCauseImpact: r.fields.defectCauseImpact, proofPredicate: r.fields.proofPredicate,
    dependencies: [...r.fields.dependencies.matchAll(/TRD2V4-REQ-\d{3}/g)].map(m => m[0]), sourceBasis: r.fields.sourceBasis,
    sourceSliceLocator: r.locator, sourceSliceBytes: r.bytes, sourceSliceSha256: r.digest,
  };
  rec.requirementRecordRoot = recordDigest('CONNECT-TRD2V4-REQUIREMENT-RECORD-V1', rec);
  assert(rec.requirementId === v4Id(i), `canonical req sequence ${i}`);
  return rec;
});
const requirementCollectionRoot = collectionRoot('CONNECT-TRD2V4-REQUIREMENT-COLLECTION-V1', canonicalRequirementRecords, 'requirementId');

const mandatoryRoots = {
  candidateRoot: subjectRawRoot,
  candidateRequirementCollectionRoot: requirementCollectionRoot,
  inheritedV3ManifestRoot: inheritedRawRoot,
  fieldMapManifestRoot: fieldMapRawRoot,
  controlRegistryRoot: controlsRawRoot,
  v3SubjectRoot: EXPECTED.v3,
  v3InheritedV2ManifestRoot: EXPECTED.v3V2,
  v3ObservationManifestRoot: EXPECTED.v3Obs,
  v3ControlRegistryRoot: EXPECTED.v3Controls,
  v3ReviewRoot: EXPECTED.review,
  v3FindingsRoot: EXPECTED.findings,
  publicCyberSuccessorRoot: EXPECTED.publicCyber,
  typedGraphRoot,
  predicateDslRoot: predicateDsl.dslRoot,
  predicateCollectionRoot,
  vectorCollectionRoot,
  evidenceSchemaRoot,
  resultSchemaCollectionRoot,
  fieldMapCollectionRoot,
  logicalObservationCollectionRoot: observationLogicalCollectionRoot,
  portableLocatorCollectionRoot,
  captureCollectionRoot,
  bidiCollectionRoot,
  severityCollectionRoot,
  missingValueCollectionRoot,
  missingPredicateCollectionRoot,
  atomicParentCollectionRoot,
  atomicChildCollectionRoot,
  dataLifecycleClassCollectionRoot: lifecycleClassCollectionRoot,
  dataLifecycleTransitionCollectionRoot: lifecycleTransitionCollectionRoot,
  publicControlCollectionRoot,
  reviewSchemaCollectionRoot,
  b0AcceptanceRoot: 'MISSING/EXTERNAL-B0-ACCEPTANCE',
  protocolAcceptanceRoot: 'MISSING/EXTERNAL-PROTOCOL-ACCEPTANCE',
  sourceUniverseAcceptanceRoot: 'MISSING/EXTERNAL-SOURCE-UNIVERSE-ACCEPTANCE',
  authorityEnvelopeRoot: 'MISSING/EXTERNAL-AUTHORITY-ENVELOPE',
  freezeReceiptRoot: 'MISSING/DETACHED-FREEZE-RECEIPT',
  appointmentSetRoot: 'MISSING/EXTERNAL-APPOINTMENT-SET',
  evaluatorRoot: 'MISSING/EXTERNAL-ACCEPTED-EVALUATOR',
  runnerARoot: 'MISSING/EXTERNAL-ACCEPTED-RUNNER-A',
  runnerBRoot: 'MISSING/EXTERNAL-ACCEPTED-RUNNER-B',
  generationOneRoot: 'MISSING/REVIEW-GENERATION-1',
  generationTwoRoot: 'MISSING/REVIEW-GENERATION-2',
  reconciliationRoot: 'MISSING/RECONCILIATION',
  allResultReceiptsRoot: 'MISSING/113-PASS-RESULT-RECEIPTS',
  openVetoSetRoot: 'MISSING/NONEMPTY-REVIEW-FINDING-DENOMINATOR',
};
const mandatoryRootRecords = Object.entries(mandatoryRoots).map(([rootName, rootValue]) => ({ rootName, rootValue, state: rootValue.startsWith('MISSING/') ? 'MISSING' : 'PRESENT' }));
const mandatoryRootSetRoot = collectionRoot('CONNECT-TRD2V4-MANDATORY-ROOT-SET-V1', mandatoryRootRecords, 'rootName');
const packetPayload = {
  schemaVersion: 'CONNECT-TRD2V4-DETACHED-CANDIDATE-PACKET-BINDING-V1',
  subjectArtifactId: 'CONNECT-SECTION-35-6-TRD-2-V4-IMMUTABLE-SUCCESSOR-REQUIREMENTS-2026-08-29-V1',
  subjectPath: OUT.subject,
  subjectPhysical: physical(OUT.subject),
  mandatoryRoots,
  mandatoryRootSetRoot,
  canonicalRequirementRecords,
  findingToV4Crosswalk: fixes.map((finding, index) => ({
    findingId: finding.findingId,
    findingManifestRoot: EXPECTED.findings,
    successorRequirementId: v4Id(index),
    resultId: `TRD2V4-RESULT-${String(index).padStart(3, '0')}`,
    disposition: 'ADDRESSED-IN-CANDIDATE; OPEN-PENDING-INDEPENDENT-REVIEW; NO-MERGE; NO-CLOSURE-TRANSFER',
  })),
  v3ToV4Crosswalk: requirementBlueprints.filter(r => r.sourceKind === 'INHERITED-V3-REQUIREMENT').map(r => ({
    sourceRequirementId: r.sourceId,
    sourceManifestId: inheritedRowBySourceId.get(r.sourceId).manifestId,
    sourceRecordDigest: inheritedRowBySourceId.get(r.sourceId).recordDigest,
    successorRequirementId: r.requirementId,
    disposition: 'PRESERVED-IN-TOPOLOGICAL-SUCCESSOR; OPEN; NO-CLOSURE-TRANSFER',
  })),
  requirementCollectionRoot,
  requirementDenominator: 113,
  externalMissingRootCount: mandatoryRootRecords.filter(r => r.state === 'MISSING').length,
  externalPrerequisitesSatisfied: false,
  actualResultReceipts: [], actualReviewGenerations: [], actualReconciliation: null, actualAcceptance: null,
  publicInvariant: 'PUBLIC', privateRemediationAllowed: false,
  currentState: 'CANDIDATE-GENERATED; NOT-FROZEN-BY-EXTERNAL-AUTHORITY; NOT-REVIEW-ELIGIBLE; NOT-ACCEPTED',
};
packetPayload.packetBindingPayloadRoot = recordDigest('CONNECT-TRD2V4-PACKET-BINDING-PAYLOAD-V1', packetPayload);
writeJson(OUT.binding, packetPayload);
const bindingRawRoot = fileSha(OUT.binding);

const summary = `# 1. Connect — TRD-2 v4 support-manifest index

## 1.1 Exact immutable outputs

1.1.1 Subject=\`${OUT.subject}\`; SHA-256=\`${subjectRawRoot}\`; physical=\`${physical(OUT.subject).lines} lines/${physical(OUT.subject).bytes} bytes\`.

1.1.2 inherited-v3 byte manifest=\`${OUT.inherited}\`; SHA-256=\`${inheritedRawRoot}\`; physical=\`${physical(OUT.inherited).lines} lines/${physical(OUT.inherited).bytes} bytes\`; rows=\`101\`; record collection=\`${inheritedCollectionRoot}\`.

1.1.3 Field-map/portable-source manifest=\`${OUT.fieldMap}\`; SHA-256=\`${fieldMapRawRoot}\`; physical=\`${physical(OUT.fieldMap).lines} lines/${physical(OUT.fieldMap).bytes} bytes\`; observations=\`84\`; source parts=\`128\`; v2 locators=\`85\`; U+200F=\`13\`.

1.1.4 executable control registries=\`${OUT.controls}\`; SHA-256=\`${controlsRawRoot}\`; physical=\`${physical(OUT.controls).lines} lines/${physical(OUT.controls).bytes} bytes\`; typed graph=\`${typedGraphRoot}\`; nodes=\`${graphNodes.length}\`; edges=\`${graphEdges.length}\`.

1.1.5 detached candidate packet binding=\`${OUT.binding}\`; SHA-256=\`${bindingRawRoot}\`; physical=\`${physical(OUT.binding).lines} lines/${physical(OUT.binding).bytes} bytes\`; payload root=\`${packetPayload.packetBindingPayloadRoot}\`; mandatory root set=\`${mandatoryRootSetRoot}\`.

## 1.2 Exact denominators and claim limit

1.2.1 Requirements=\`113=12 distinct new Findings+101 inherited v3 Requirements\`; exactly five fields=\`113/113\`; sole outputs=\`113/113\`; accepted=\`0/113\`.

1.2.2 predicates=\`113\`; exact vectors=\`565\`; result schema families=\`${resultSchemas.length}\`; actual result receipts=\`0/113\`.

1.2.3 Atomic parents=\`113\`; atomic=\`101\`; compound=\`12\`; children=\`${atomicChildren.length}\`; empty compound sets=\`0\`.

1.2.4 DataLifecycle matrix=\`${lifecycleStates.length} states × ${lifecycleEvents.length} events = ${lifecycleTransitions.length} explicit rows\`; actual admitted identity/store/provider denominator=\`0; BLOCKED-PENDING-ACCEPTED-SOURCE-UNIVERSE\`.

1.2.5 Public successor exact root=\`${EXPECTED.publicCyber}\`; control mappings=\`52/52\`; visibility invariant=\`PUBLIC\`; Private paths=\`0\`.

1.2.6 external B0/Protocol/Source/Authority/Freeze/Appointments/Evaluator/Runners remain MISSING; review generations=\`0/2\`; Reconciliation/Acceptance=\`ABSENT\`; Gate29=\`BLOCKED\`; Development freeze=\`ACTIVE\`.

1.2.7 no Product, Git, GitHub, Provider, Build, Push, Merge, Release or Deploy action occurred.
`;
fs.writeFileSync(OUT.summary, summary, 'utf8');

console.log(JSON.stringify({
  outputs: Object.fromEntries(Object.entries(OUT).map(([k, file]) => [k, { path: file, ...physical(file) }])),
  counts: { requirements: 113, v3Preserved: 101, observations: 84, sourceParts: 128, v2Locators: 85, bidiU200F: 13, findings: 12, predicates: 113, vectors: 565, graphNodes: graphNodes.length, graphEdges: graphEdges.length, atomicChildren: atomicChildren.length, lifecycleRows: lifecycleTransitions.length, publicControls: 52 },
  roots: { inheritedCollectionRoot, fieldMapCollectionRoot, observationLogicalCollectionRoot, typedGraphRoot, predicateCollectionRoot, vectorCollectionRoot, requirementCollectionRoot, mandatoryRootSetRoot, packetBindingPayloadRoot: packetPayload.packetBindingPayloadRoot },
  accepted: 0,
}, null, 2));
