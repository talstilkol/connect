#!/usr/bin/env python3

from __future__ import annotations

import copy
import hashlib
import json
import pathlib
import re
import sys

BASE = pathlib.Path('web/docs/planning')
FILES = {
    'manifest': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-atomic-package-manifest-2026-08-29.json',
    'subject': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-2026-08-29.md',
    'registry': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-normative-registry-2026-08-29.json',
    'source_index': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-source-member-span-index-2026-08-29.json',
    'crosswalk': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-closure-crosswalk-2026-08-29.json',
    'vectors': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-executable-vector-programs-2026-08-29.json',
}


def raw(path: pathlib.Path) -> bytes:
    return path.read_bytes()


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load(path: pathlib.Path):
    return json.loads(path.read_text(encoding='utf-8'))


failures: list[dict[str, str]] = []


def scenario_slug(value: str) -> str:
    normalized = re.sub(r'[^A-Z0-9]+', '-', value.upper()).strip('-')[:80]
    return normalized or 'UNSPECIFIED-ATTACK'


def derive_terminal(scenario: str, inherited_terminal: str) -> str:
    lower = scenario.lower()
    if any(value in lower for value in ('response loss', 'stale journal', 'mixed store revision', 'outage')):
        return 'UNCERTAIN'
    if 'revoke' in lower or 'revocation' in lower:
        return 'REVOKED'
    if 'collision' in lower:
        return 'COLLISION'
    if 'conflict' in lower or 'aba' in lower or 'concurrent pointer' in lower:
        return 'CONFLICT'
    if 'at-expiry' in lower:
        return 'EXPIRED'
    if any(value in lower for value in ('partial effect', 'mid-write', 'cleanup failure')):
        return 'QUARANTINED'
    if inherited_terminal == 'REVOKED':
        return 'REVOKED'
    if inherited_terminal == 'REJECTED':
        return 'REJECTED'
    return 'BLOCKED'


def require(condition: bool, code: str, detail: str) -> None:
    if not condition:
        failures.append({'code': code, 'detail': detail})


def split_requirements(text: str) -> list[dict]:
    lines = text.splitlines()
    starts: list[tuple[int, str, str]] = []
    heading = re.compile(r'^## \d+\.\d+ `(B0V4REQ-\d{3})` — (.+)$')
    for line_number, line in enumerate(lines):
        match = heading.match(line)
        if match:
            starts.append((line_number, match.group(1), match.group(2)))
    rows = []
    field_names = ('statement', 'threatCauseImpact', 'requiredProof', 'dependencies', 'sourceBasis')
    for position, (start, requirement_id, title) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        fields = {}
        for line in lines[start:end]:
            for field_name in field_names:
                marker = f'`{field_name}`: '
                if marker in line:
                    fields[field_name] = line.split(marker, 1)[1]
        dependencies = re.findall(r'B0V4REQ-\d{3}', fields.get('dependencies', ''))
        rows.append({'id': requirement_id, 'title': title, 'fields': fields, 'dependencies': dependencies})
    return rows


def resolve_pointer(document: dict, pointer: str):
    parts = [part.replace('~1', '/').replace('~0', '~') for part in pointer.split('/')[1:]]
    parent = document
    for part in parts[:-1]:
        parent = parent[part]
    return parent, parts[-1]


def apply_program(fixture: dict, operations: list[dict]) -> tuple[dict, list[dict]]:
    state = copy.deepcopy(fixture['payload'])
    events: list[dict] = []
    for operation in operations:
        if operation['op'] == 'REMOVE':
            parent, key = resolve_pointer(state, operation['path'])
            parent.pop(key, None)
        elif operation['op'] in ('REPLACE', 'SET'):
            parent, key = resolve_pointer(state, operation['path'])
            parent[key] = copy.deepcopy(operation['value'])
        elif operation['op'] == 'EVENT':
            events.append(copy.deepcopy(operation['event']))
        else:
            raise ValueError(f"Unsupported operation {operation['op']}")
    return state, events


def oracle(vector: dict, state: dict, events: list[dict]) -> dict:
    if state['attack'] is not None or events:
        scenario = state['attack']['sourceScenario']
        return {
            'terminalState': derive_terminal(scenario, vector['inheritedExpectedTerminalText']),
            'reasonCode': f"NEG-{scenario_slug(scenario)}",
            'usableAuthority': 0,
            'postcondition': 'NO-CURRENT-POINTER;NO-EXTERNAL-EFFECT;NO-CLOSURE-CREDIT',
        }
    if 'requiredProof' not in state['fields']:
        return {'terminalState': 'BLOCKED', 'reasonCode': 'MISSING-MANDATORY-FIELD', 'usableAuthority': 0, 'postcondition': 'NO-CURRENT-POINTER;NO-EFFECT'}
    if state['source']['memberSha256'] != vector['fixtureMemberSha256']:
        return {'terminalState': 'BLOCKED', 'reasonCode': 'SOURCE-ROOT-MISMATCH', 'usableAuthority': 0, 'postcondition': 'NO-CURRENT-POINTER;NO-EFFECT'}
    return {'terminalState': 'REJECTED', 'reasonCode': 'NO-NEGATIVE-MUTATION', 'usableAuthority': 0, 'postcondition': 'NO-CURRENT-POINTER;NO-EFFECT'}


manifest = load(FILES['manifest'])
for member in manifest['members']:
    data = raw(pathlib.Path(member['logicalPath']))
    require(len(data) == member['bytes'], 'MANIFEST-BYTE-MISMATCH', member['logicalPath'])
    require(digest(data) == member['sha256'], 'MANIFEST-SHA-MISMATCH', member['logicalPath'])

requirements = split_requirements(FILES['subject'].read_text(encoding='utf-8'))
require(len(requirements) == 84, 'REQUIREMENT-DENOMINATOR', f"{len(requirements)}/84")
seen_requirements: set[str] = set()
for index, row in enumerate(requirements):
    expected_id = f'B0V4REQ-{index:03d}'
    require(row['id'] == expected_id, 'REQUIREMENT-ID-CONTIGUOUS', row['id'])
    require(row['id'] not in seen_requirements, 'REQUIREMENT-ID-UNIQUE', row['id'])
    seen_requirements.add(row['id'])
    require(len(row['fields']) == 5, 'FIVE-FIELD-SCHEMA', row['id'])
    require(f'B0V4OUT-{index:03d}' in row['fields'].get('statement', ''), 'OUTPUT-BINDING', row['id'])
    for dependency in row['dependencies']:
        require(int(dependency[-3:]) < index, 'FORWARD-BUILD-DEPENDENCY', f"{row['id']}->{dependency}")

registry = load(FILES['registry'])
require(len(registry['typedSupersessions']) == 10, 'SUPERSESSION-DENOMINATOR', str(len(registry['typedSupersessions'])))
require(len(registry['cycleBreaks']) == 17, 'CYCLE-BREAK-DENOMINATOR', str(len(registry['cycleBreaks'])))
require(len(registry['roleUniverse']['roles']) == 8, 'ROLE-DENOMINATOR', str(len(registry['roleUniverse']['roles'])))
require(len(registry['roleUniverse']['pairMatrix']) == 28, 'ROLE-PAIR-DENOMINATOR', str(len(registry['roleUniverse']['pairMatrix'])))
require(all(row['disposition'] == 'PROHIBITED-SHARED-EFFECTIVE-CONTROLLER' for row in registry['roleUniverse']['pairMatrix']), 'ROLE-PAIR-DISPOSITION', 'pair matrix')
heads = {row['headId'] for row in registry['mutableHeadRegistry']['heads']}
mapped_classes: set[str] = set()
for mapping in registry['mutableHeadRegistry']['objectToHead']:
    require(mapping['objectClass'] not in mapped_classes, 'DUPLICATE-MUTABLE-OBJECT-CLASS', mapping['objectClass'])
    mapped_classes.add(mapping['objectClass'])
    require(mapping['headId'] in heads, 'UNKNOWN-HEAD', mapping['headId'])
    require(len(mapping['membershipPath']) > 0, 'EMPTY-HEAD-MEMBERSHIP-PATH', mapping['objectClass'])
require(registry['mutableHeadRegistry']['generatedHeadCount'] == len(heads), 'GENERATED-HEAD-COUNT', str(len(heads)))
fields = registry['acceptanceFieldRegistry']['fields']
require(len(fields) == registry['acceptanceFieldRegistry']['fieldCount'], 'ACCEPTANCE-FIELD-DENOMINATOR', str(len(fields)))
require(len({row['fieldId'] for row in fields}) == len(fields), 'ACCEPTANCE-FIELD-UNIQUE', 'duplicate')
require(len(registry['outputRegistry']) == 84, 'OUTPUT-DENOMINATOR', str(len(registry['outputRegistry'])))
require(all(row['repositoryVisibility'] == 'PUBLIC' for row in registry['outputRegistry']), 'PUBLIC-OUTPUT-INVARIANT', 'output registry')
require(all(row['authorityCredit'] == 0 for row in registry['applicableDirectiveRegistry']), 'DIRECTIVE-AUTHORITY-CREDIT', 'directive registry')
require(registry['convergencePolicy']['maximumSuccessorRoundsPerReviewEpoch'] == 3, 'BOUNDED-CONVERGENCE', 'round bound')
require(registry['convergencePolicy']['successPredicate']['minimumIndependentHostileReviews'] == 2, 'TWO-REVIEW-DENOMINATOR', 'review count')
require(registry['genesisFoundation']['currentFoundationReceipt'] is None, 'NO-BOOTSTRAP-SELF-APPROVAL', 'foundation receipt')

crosswalk = load(FILES['crosswalk'])
mapping_counts = {'v3Findings': 13, 'v3Requirements': 70, 'v2Requirements': 49, 'originalRequirements': 27, 'legacyFindings': 22, 'v2ReviewFindings': 21}
for name, expected in mapping_counts.items():
    rows = crosswalk['crosswalks'][name]
    require(len(rows) == expected, f'CROSSWALK-{name}', f'{len(rows)}/{expected}')
    require(len({row['sourceId'] for row in rows}) == expected, f'CROSSWALK-{name}-UNIQUE', 'source identity')
    require(all(not row['acceptanceTransferred'] and not row['closureTransferred'] for row in rows), f'CROSSWALK-{name}-NO-TRANSFER', 'transfer')
for name in ('v3Requirements', 'v2Requirements', 'originalRequirements'):
    require(all(len(row['exactFiveFieldPreservation']) == 5 and all(field['targetContainsExactSourceValue'] for field in row['exactFiveFieldPreservation']) for row in crosswalk['crosswalks'][name]), f'CROSSWALK-{name}-EXACT-FIELDS', 'predecessor field not exact target conjunct')
require(len(crosswalk['namedUseGraph']['hiddenV3CycleBreaks']) == 17, 'NAMED-USE-CYCLE-BREAKS', str(len(crosswalk['namedUseGraph']['hiddenV3CycleBreaks'])))
require(len(crosswalk['namedUseGraph']['unclassifiedTokenUses']) == 0, 'NAMED-USE-UNCLASSIFIED', str(len(crosswalk['namedUseGraph']['unclassifiedTokenUses'])))

source_index = load(FILES['source_index'])
require(len(source_index['artifacts']) == 16, 'SOURCE-ARTIFACT-DENOMINATOR', str(len(source_index['artifacts'])))
for artifact in source_index['artifacts']:
    require(not artifact['logicalPath'].startswith('/'), 'ABSOLUTE-PUBLIC-PATH', artifact['logicalPath'])
    data = raw(pathlib.Path(artifact['logicalPath']))
    require(digest(data) == artifact['sha256'], 'INDEX-SOURCE-SHA', artifact['logicalPath'])
    require(len(data) == artifact['bytes'], 'INDEX-SOURCE-BYTES', artifact['logicalPath'])
    for member in artifact['members']:
        start = member['startByteInclusive']
        end = member['endByteExclusive']
        require(0 <= start < end <= len(data), 'INVALID-MEMBER-SPAN', f"{artifact['alias']}:{member['locator']}")
        require(digest(data[start:end]) == member['sha256'], 'MEMBER-SPAN-SHA', f"{artifact['alias']}:{member['locator']}")

vector_pack = load(FILES['vectors'])
require(len(vector_pack['fixtures']) == 252, 'FIXTURE-DENOMINATOR', str(len(vector_pack['fixtures'])))
require(len(vector_pack['vectors']) == 252, 'VECTOR-DENOMINATOR', str(len(vector_pack['vectors'])))
require(len({row['vectorId'] for row in vector_pack['vectors']}) == 252, 'VECTOR-ID-UNIQUE', 'duplicate')
fixtures = {row['fixtureId']: row for row in vector_pack['fixtures']}
receipts = []
for vector in vector_pack['vectors']:
    fixture = fixtures.get(vector['fixtureId'])
    require(fixture is not None, 'MISSING-FIXTURE', vector['vectorId'])
    if fixture is None:
        continue
    require(fixture['fixtureRoot'] == vector['fixtureRoot'], 'FIXTURE-ROOT-BINDING', vector['vectorId'])
    require(len(vector['program']) > 0, 'EMPTY-PROGRAM', vector['vectorId'])
    require(any(operation['op'] == 'SET' and operation.get('path') == '/attack' for operation in vector['program']), 'MISSING-ATTACK-OPERATION', vector['vectorId'])
    if vector['slot'] == 'A':
        require(any(operation['op'] == 'REMOVE' for operation in vector['program']), 'SLOT-A-MISSING-REMOVE', vector['vectorId'])
    if vector['slot'] == 'B':
        require(any(operation['op'] == 'REPLACE' for operation in vector['program']), 'SLOT-B-MISSING-REPLACE', vector['vectorId'])
    state, events = apply_program(fixture, vector['program'])
    observed = oracle(vector, state, events)
    require(observed == vector['expected'], 'EXPECTED-TERMINAL-MISMATCH', vector['vectorId'])
    receipt_body = {
        'vectorId': vector['vectorId'],
        'fixtureRoot': vector['fixtureRoot'],
        'programRoot': vector['programRoot'],
        'observed': observed,
        'engineId': 'B0V4-QA-ENGINE-B-PYTHON-V1',
    }
    compact = json.dumps(receipt_body, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    receipts.append({**receipt_body, 'receiptSha256': digest(compact)})

report = {
    'artifactId': 'CONNECT-B0-V4-QA-ENGINE-B-REPORT-2026-08-29',
    'artifactClass': 'DETACHED-PRODUCER-MECHANICAL-SEMANTIC-QA-ENGINE-REPORT;NOT-AUTHORITY;NOT-ACCEPTANCE',
    'engineId': 'B0V4-QA-ENGINE-B-PYTHON-V1',
    'engineSha256': digest(raw(BASE / 'qa/b0-v4-qa-engine-b.py')),
    'inspectedPackageManifestSha256': digest(raw(FILES['manifest'])),
    'status': 'PASS-CANDIDATE-MECHANICAL-ONLY' if not failures else 'FAIL',
    'denominators': {
        'requirements': f'{len(requirements)}/84',
        'fields': f"{sum(len(row['fields']) for row in requirements)}/420",
        'outputs': f"{len(registry['outputRegistry'])}/84",
        'vectorSpecifications': f"{len(vector_pack['vectors'])}/252",
        'vectorFixtures': f"{len(vector_pack['fixtures'])}/252",
        'planningDslExecutionReceipts': f'{len(receipts)}/252',
        'operationalExecutionReceipts': '0/252',
        'v3FindingsCandidateDeltas': f"{len(crosswalk['crosswalks']['v3Findings'])}/13",
        'v3FindingsIndependentlyClosed': '0/13',
        'v3RequirementsPreserved': f"{len(crosswalk['crosswalks']['v3Requirements'])}/70",
        'v2RequirementsPreserved': f"{len(crosswalk['crosswalks']['v2Requirements'])}/49",
        'originalRequirementsPreserved': f"{len(crosswalk['crosswalks']['originalRequirements'])}/27",
        'legacyFindingsPreserved': f"{len(crosswalk['crosswalks']['legacyFindings'])}/22",
        'v2ReviewFindingsPreserved': f"{len(crosswalk['crosswalks']['v2ReviewFindings'])}/21",
        'acceptedRequirements': '0/84',
        'implementedOutputs': '0/84',
    },
    'failures': failures,
    'planningDslReceipts': receipts,
    'authorityCredit': 0,
    'b0State': 'ABSENT',
    'repositoryVisibility': 'PUBLIC',
    'gate29': 'BLOCKED',
    'developmentFreeze': 'ACTIVE',
}

if len(sys.argv) != 2:
    raise SystemExit('Expected output report path')
output = pathlib.Path(sys.argv[1])
with output.open('x', encoding='utf-8') as handle:
    json.dump(report, handle, ensure_ascii=False, indent=2)
    handle.write('\n')
if failures:
    raise SystemExit(1)
