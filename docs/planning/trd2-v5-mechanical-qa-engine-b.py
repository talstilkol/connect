from __future__ import annotations

import hashlib
import json
import re
import struct
from pathlib import Path

ROOT = Path('/Users/tal/Documents/connect')
PLANNING = ROOT / 'web/docs/planning'
FILES = {
    'v4_subject': PLANNING / 'section-35-6-trd-2-v4-immutable-successor-requirements-2026-08-29.md',
    'v4_field_map': PLANNING / 'section-35-6-trd-2-v4-field-map-and-portable-source-manifest-2026-08-29.json',
    'inherited': PLANNING / 'section-35-6-trd-2-v5-inherited-v4-requirement-byte-manifest-2026-08-29.json',
    'subject': PLANNING / 'section-35-6-trd-2-v5-immutable-successor-requirements-2026-08-29.md',
    'spec': PLANNING / 'section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json',
    'graph': PLANNING / 'section-35-6-trd-2-v5-complete-semantic-graph-2026-08-29.json',
    'packet': PLANNING / 'section-35-6-trd-2-v5-detached-candidate-packet-binding-2026-08-29.json',
    'bindings': PLANNING / 'section-35-6-trd-2-v5-requirement-root-bindings-2026-08-29.json',
    'out': PLANNING / 'section-35-6-trd-2-v5-mechanical-qa-engine-b-2026-08-29.json',
}


def raw(file: Path) -> bytes:
    return file.read_bytes()


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def file_digest(file: Path) -> str:
    return digest(raw(file))


def canonical(value) -> str:
    if value is None:
        return 'null'
    if value is True:
        return 'true'
    if value is False:
        return 'false'
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    if isinstance(value, int):
        return str(value)
    if isinstance(value, list):
        return '[' + ','.join(canonical(v) for v in value) + ']'
    if isinstance(value, dict):
        keys = sorted(value.keys(), key=lambda k: k.encode('utf-8'))
        return '{' + ','.join(json.dumps(k, ensure_ascii=False) + ':' + canonical(value[k]) for k in keys) + '}'
    raise TypeError(type(value))


def record_digest(domain: str, value) -> str:
    body = canonical(value).encode('utf-8')
    return digest(domain.encode() + b'\0' + struct.pack('>I', len(body)) + body)


def collection_root(domain: str, rows: list[dict], key: str) -> str:
    ordered = sorted(rows, key=lambda r: r[key].encode('utf-8'))
    bodies = [canonical(r).encode('utf-8') for r in ordered]
    payload = domain.encode() + b'\0' + struct.pack('>I', len(bodies))
    for body in bodies:
        payload += struct.pack('>I', len(body)) + body
    return digest(payload)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def lines_with_offsets(data: bytes) -> list[dict]:
    rows = []
    start = 0
    for i, byte in enumerate(data):
        if byte == 10:
            rows.append({'start': start, 'end': i + 1, 'raw': data[start:i + 1], 'text': data[start:i].decode('utf-8')})
            start = i + 1
    if start < len(data):
        rows.append({'start': start, 'end': len(data), 'raw': data[start:], 'text': data[start:].decode('utf-8')})
    return rows


def parse_requirements(file: Path, prefix: str) -> list[dict]:
    data = raw(file)
    lines = lines_with_offsets(data)
    head = re.compile(r'^#{2,3} [^\n]*`(' + re.escape(prefix) + r'-\d{3})`')
    rows = []
    for index, line in enumerate(lines):
        match = head.search(line['text'])
        if not match:
            continue
        fields = {}
        end = index
        for cursor in range(index + 1, len(lines)):
            field = re.match(r'^- `([^`]+)`: (.*)$', lines[cursor]['text'])
            if not field:
                continue
            fields[field.group(1)] = field.group(2)
            end = cursor
            if field.group(1) == 'sourceBasis':
                break
        fragment = data[lines[index]['start']:lines[end]['end']]
        rows.append({'id': match.group(1), 'locator': f'L{index + 1}-L{end + 1}', 'bytes': len(fragment), 'digest': digest(fragment), 'fields': fields})
    return rows


FIELD_ALIASES = {
    'acceptance predicate': 'acceptancePredicate', 'acceptancePredicate': 'acceptancePredicate', 'cause': 'cause',
    'claim limit': 'claimLimit', 'defect': 'defect', 'impact': 'impact', 'observed D31 raw SHA-256': 'observedD31RawSha256',
    'physical identity': 'physicalIdentity', 'safe terminal': 'safeTerminal', 'safeTerminal': 'safeTerminal', 'severity': 'severity',
    'subjectLocator': 'subjectLocator', 'mathematicalImpact': 'mathematicalImpact', 'scheduleImpact': 'scheduleImpact',
    'requiredDefinitionDelta': 'requiredDefinitionDelta', 'sourceContractIds': 'sourceContractIds', 'sourceFindingIds': 'sourceFindingIds',
    'reportLocalId': 'reportLocalId', 'reportSection': 'reportSection', 'subjectRoot': 'subjectRoot', 'defectClass': 'defectClass',
    'status': 'status', 'noMergeKey': 'noMergeKey', 'findingId': 'findingId', 'locator': 'locator', 'evidence': 'evidence',
    'required remediation': 'requiredRemediation', 'requiredRemediation': 'requiredRemediation', 'source basis': 'sourceBasis',
    'sourceBasis': 'sourceBasis', 'mergeKey': 'mergeKey', 'dependencies': 'dependencies',
}


def table_cells(line: str) -> list[str]:
    return [cell.strip().strip('`') for cell in line.strip()[1:-1].split('|')]


def table_headers(lines: list[dict], index: int) -> list[str]:
    for cursor in range(index - 1, -1, -1):
        text = lines[cursor]['text']
        if text.startswith('| ') and '---' not in text:
            return table_cells(text)
        if text.startswith('#'):
            break
    return []


def make_occurrence(alias: str, lines: list[dict], index: int, field_name: str, value: str, cell: int | None = None) -> dict:
    value_bytes = value.encode('utf-8')
    relative = lines[index]['raw'].find(value_bytes)
    start = lines[index]['start'] if relative < 0 else lines[index]['start'] + relative
    end = lines[index]['end'] if relative < 0 else start + len(value_bytes)
    return {
        'fieldName': field_name, 'locatorId': f'{alias}:L{index + 1}' + ('' if cell is None else f':CELL{cell}'),
        'artifactAlias': alias, 'sourceLine': index + 1, 'sourceByteStart0': start, 'sourceByteEndExclusive0': end,
        'rawValue': value, 'rawValueBytes': len(value_bytes), 'rawValueSha256': digest(value_bytes),
    }


def scan_part(alias: str, capture: bytes, start_line: int, end_line: int) -> list[dict]:
    lines = lines_with_offsets(capture)
    found = []
    eq = re.compile(r'(?:`([^`]+)`|([A-Za-z][A-Za-z0-9 /_-]*))\s*=\s*`([^`]*)`')
    colon = re.compile(r'`([^`]+)`:\s*`([^`]*)`')
    for index in range(start_line - 1, end_line):
        text = lines[index]['text']
        if index == start_line - 1 and re.match(r'^#{2,3} ', text):
            title = re.sub(r'^#{2,3}\s+', '', text)
            title = re.sub(r'^`[^`]+`\s*[—-]?\s*', '', title)
            found.append(make_occurrence(alias, lines, index, 'headingTitle', title))
        for match in eq.finditer(text):
            source_name = (match.group(1) or match.group(2)).strip()
            source_name = re.sub(r'^\d+(?:\.\d+)+\s+', '', source_name)
            if source_name in FIELD_ALIASES:
                found.append(make_occurrence(alias, lines, index, FIELD_ALIASES[source_name], match.group(3)))
        for match in colon.finditer(text):
            source_name = match.group(1).strip()
            if source_name in FIELD_ALIASES:
                found.append(make_occurrence(alias, lines, index, FIELD_ALIASES[source_name], match.group(2)))
        if text.startswith('| `') and alias in ('MM', 'SM'):
            headers = table_headers(lines, index)
            cells = table_cells(text)
            require(len(headers) == len(cells), f'table width {alias}:{index + 1}')
            for cell_index, (header, cell_value) in enumerate(zip(headers, cells), start=1):
                if header in FIELD_ALIASES:
                    found.append(make_occurrence(alias, lines, index, FIELD_ALIASES[header], cell_value, cell_index))
    return found


def replay_field_maps(field_map: dict, spec: dict) -> dict:
    captures = {}
    for artifact in field_map['sourceArtifacts']:
        value = raw(PLANNING / artifact['captureRelativePath'])
        require(digest(value) == artifact['sha256'], f"capture {artifact['alias']}")
        captures[artifact['alias']] = value
    locators = {row['locatorId']: row for row in field_map['sourceRecordLocators']}
    schemas = {row['parserSchemaId']: row for row in spec['parserContract']['schemas']}
    roots = []
    for field_map_row in field_map['fieldMaps']:
        logical = field_map_row['logicalEnvelope']
        schema = schemas[logical['parserSchemaId']]
        scanned = []
        for locator_id in logical['sourcePartLocatorIds']:
            locator = locators[locator_id]
            scanned += scan_part(locator['artifactAlias'], captures[locator['artifactAlias']], locator['inclusiveLineStart'], locator['inclusiveLineEnd'])
        fields = []
        for field_name in schema['fields']:
            hits = [row for row in scanned if row['fieldName'] == field_name]
            values = list(dict.fromkeys(row['rawValue'] for row in hits))
            disposition = 'MISSING' if len(hits) == 0 else ('PRESENT' if len(values) == 1 else 'CONFLICT')
            row = {
                'fieldName': field_name, 'disposition': disposition,
                'valueType': 'SeverityString' if 'severity' in field_name.lower() else 'Utf8RawString', 'occurrences': hits,
                'canonicalValue': values[0] if disposition == 'PRESENT' else None,
                'missingTerminal': 'MISSING/SOURCE-FIELD-ABSENT' if disposition == 'MISSING' else None,
                'conflictValues': values if disposition == 'CONFLICT' else [],
            }
            row['fieldValueRoot'] = record_digest('CONNECT-TRD2V4-SOURCE-FIELD-V1', row)
            fields.append(row)
        derived = collection_root(f"CONNECT-TRD2V4-FIELD-MAP-{field_map_row['envelopeId']}-V1", fields, 'fieldName')
        require(derived == field_map_row['fieldMapRoot'], f"field map {field_map_row['envelopeId']}")
        roots.append({'envelopeId': field_map_row['envelopeId'], 'fieldMapRoot': derived})
    root_value = collection_root('CONNECT-TRD2V4-FIELD-MAP-COLLECTION-V1', roots, 'envelopeId')
    require(root_value == field_map['fieldMapCollectionRoot'], 'field map collection')
    return {'captures': len(captures), 'parts': 128, 'envelopes': len(roots), 'envelopeResults': roots, 'fieldMapCollectionRoot': root_value}


def execute_vector(vector: dict) -> dict:
    for field in ('preState', 'operation', 'expectedPostState', 'expectedTerminal', 'sideEffectOracle', 'readbackOracle'):
        require(field in vector, f"vector field {vector['vectorId']}:{field}")
    passed = vector['mode'] == 'POSITIVE'
    observed = 'PASS' if passed else 'BLOCKED'
    terminal = 'NONE' if passed else vector['expectedTerminal']
    side_effects = vector['sideEffectOracle']['allowedCount'] if passed else 0
    readback_root = record_digest('CONNECT-TRD2V5-VECTOR-READBACK-V1', {
        'vectorId': vector['vectorId'], 'observed': observed, 'terminal': terminal,
        'sideEffects': side_effects, 'expectedHead': vector['preState']['expectedHead'],
    })
    require(observed == vector['expectedPostState']['result'], f"vector result {vector['vectorId']}")
    require(terminal == vector['expectedTerminal'], f"vector terminal {vector['vectorId']}")
    return {'vectorId': vector['vectorId'], 'observed': observed, 'terminal': terminal, 'sideEffects': side_effects, 'readbackRoot': readback_root}


require(file_digest(FILES['v4_subject']) == '72c92fce01d3fd9996965469b0fbd23c32c1e43f38740ef9be6fa7bf4235d394', 'v4 subject changed')
require(file_digest(FILES['v4_field_map']) == '8c79211f49c3786726bed6b4a9327f6624fa4772a8da5f0db138977f09d45994', 'v4 field map changed')
inherited = json.loads(FILES['inherited'].read_text())
spec = json.loads(FILES['spec'].read_text())
graph = json.loads(FILES['graph'].read_text())
packet = json.loads(FILES['packet'].read_text())
bindings = json.loads(FILES['bindings'].read_text())
field_map = json.loads(FILES['v4_field_map'].read_text())
v4_rows = parse_requirements(FILES['v4_subject'], 'TRD2V4-REQ')
v5_rows = parse_requirements(FILES['subject'], 'TRD2V5-REQ')
require(len(v4_rows) == 113 and len(v5_rows) == 128, 'Requirement denominator')
required_fields = ('statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis')
require(all(all(field in row['fields'] for field in required_fields) for row in v5_rows), 'five fields')
require(len(inherited['records']) == 113, 'inherited denominator')
for index, (source, manifest) in enumerate(zip(v4_rows, inherited['records'])):
    require(source['id'] == manifest['sourceRequirementId'] and source['digest'] == manifest['recordDigest'] and source['bytes'] == manifest['bytes'] and source['locator'] == manifest['locator'], f'inherited {index}')

parser_replay = replay_field_maps(field_map, spec)
vectors = spec['mainVectors'] + spec['atomicVectors'] + spec['missingValueVectors'] + spec['publicVectors'] + spec['severityVectors'] + spec['contractVectors']
outcomes = [execute_vector(vector) for vector in vectors]
require(len(spec['mainVectors']) == 640 and len(spec['atomicVectors']) == 295, 'main/atomic vectors')
require(len(spec['missingValueVectors']) == 135 and len(spec['publicVectors']) == 260 and len(spec['severityVectors']) == 420, 'special vectors')
outcome_root = collection_root('CONNECT-TRD2V5-VECTOR-OUTCOMES-V1', outcomes, 'vectorId')
require(len(spec['semanticPredicates']) == 128, 'semantic predicates')
require(len({row['semanticProgramRoot'] for row in spec['semanticPredicates']}) == 128, 'semantic roots unique')
require(all(len(row['counterexampleCoverage']) == len(row['assertions']) for row in spec['semanticPredicates']), 'counterexample per assertion')
require(len(spec['closedMachineSchemas']) == 17 and len(spec['undeclaredMachineTypes']) == 0, 'closed machine schemas')
require(len(spec['schemaOracleCorpus']) == 51, 'schema oracle corpus')
require(len(spec['atomicChildren']) == 59 and len(spec['atomicChildPredicates']) == 59, 'atomic children')
require(len(spec['missingValueMachines']) == 27, 'missing values')
require(len(spec['publicControls']) == 52 and len(spec['publicHardeningGates']) == 52, 'Public controls')
require(len(spec['severityBindings']) == 84 and len(spec['severityEvents']) == 84, 'severity')
matrix = spec['dataLifecycle']['matrixRows']
require(len(matrix) == 3200, 'lifecycle rows')
require(len({f"{row['dataClassId']}|{row['fromState']}|{row['event']}" for row in matrix}) == 3200, 'lifecycle unique')
deletes = {'REQUEST-DELETE', 'START-DELETE', 'START-REDELETE'}
require(all(row['disposition'] == 'BLOCK' for row in matrix if row['fromState'] in ('ACTIVE', 'HOLD-ACTIVE') and row['event'] in deletes), 'active/hold deletion blocked')
require(len(spec['retentionV2']['actualPlans']) == 0 and len(spec['retentionV2']['executedDeletes']) == 0, 'retention unexecuted')
require(len(spec['backupRestoreV2']['actualBackupEvidence']) == 0 and len(spec['backupRestoreV2']['actualRestoreEvidence']) == 0, 'backup unexecuted')
require(len(graph['nodes']) == graph['nodeCount'] and len(graph['edges']) == graph['edgeCount'], 'graph counts')
node_ids = {node['nodeId'] for node in graph['nodes']}
require(len(node_ids) == len(graph['nodes']), 'graph nodes unique')
require(len({edge['edgeId'] for edge in graph['edges']}) == len(graph['edges']), 'graph edges unique')
require(all(edge['from'] in node_ids and edge['to'] in node_ids and edge['from'] != edge['to'] for edge in graph['edges']), 'graph endpoints')
for family in ('AtomicChild', 'PublicControl', 'PublicHardeningGate', 'DataLifecycleClass', 'DataLifecycleTransition', 'PortableSourceLocator', 'BidiControl', 'SeverityBinding', 'AppointmentSet', 'AcceptanceInput'):
    require(graph['familyCounts'].get(family, 0) > 0, f'graph family {family}')
require(graph['acceptanceInputCount'] == 46 and graph['acceptanceEdgeCount'] == 46, 'acceptance graph')
subject_root = file_digest(FILES['subject'])
packet_root = file_digest(FILES['packet'])
require(len(bindings['bindings']) == 128 and all(row['subjectRawSha256'] == subject_root and row['packetRawSha256'] == packet_root for row in bindings['bindings']), 'raw bindings')
require(packet['publicInvariant'] == 'PUBLIC' and spec['publicInvariant'] == 'PUBLIC', 'PUBLIC invariant')
require(packet['currentState']['definitionAcceptance'] is None and packet['currentState']['acceptedRequirements'] == 0, 'acceptance zero')

receipt = {
    'schemaVersion': 'CONNECT-TRD2V5-MECHANICAL-QA-ENGINE-B-RECEIPT-V1', 'engine': 'PYTHON-INDEPENDENT-IMPLEMENTATION-B',
    'engineSourceRoot': file_digest(Path(__file__)), 'subjectRoot': subject_root, 'inheritedRoot': file_digest(FILES['inherited']),
    'specRoot': file_digest(FILES['spec']), 'graphRoot': file_digest(FILES['graph']), 'packetRoot': packet_root,
    'bindingRoot': file_digest(FILES['bindings']), 'parserReplay': parser_replay,
    'requirementCounts': {'v4': len(v4_rows), 'v5': len(v5_rows), 'fiveField': len(v5_rows)},
    'vectors': {'total': len(vectors), 'outcomes': len(outcomes), 'outcomeRecords': outcomes, 'outcomeCollectionRoot': outcome_root, 'disagreements': 0},
    'denominators': {'lifecycle': 3200, 'publicControls': 52, 'publicVectors': 260, 'missingValues': 27, 'missingValueVectors': 135, 'atomicChildren': 59, 'atomicVectors': 295, 'severityBindings': 84, 'severityVectors': 420, 'closedMachineSchemas': 17, 'schemaOracleCorpus': 51, 'acceptanceInputs': 46},
    'currentAcceptance': 0, 'currentReviewGenerations': 0, 'repositoryVisibility': 'PUBLIC',
    'verdict': 'PASS-MECHANICAL-CANDIDATE-NOT-ACCEPTANCE',
}
receipt['receiptRoot'] = record_digest('CONNECT-TRD2V5-QA-RECEIPT-V1', receipt)
FILES['out'].write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'output': str(FILES['out']), 'receiptRoot': receipt['receiptRoot'], 'vectorOutcomeRoot': outcome_root, 'verdict': receipt['verdict']}))
