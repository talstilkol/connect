from __future__ import annotations

import hashlib
import json
import pathlib
import re
import struct

PLANNING = pathlib.Path('/Users/tal/Documents/connect/web/docs/planning')
FILES = {
    'inherited': PLANNING / 'section-35-6-trd-2-v4-inherited-v3-requirement-byte-manifest-2026-08-29.json',
    'fieldMap': PLANNING / 'section-35-6-trd-2-v4-field-map-and-portable-source-manifest-2026-08-29.json',
    'controls': PLANNING / 'section-35-6-trd-2-v4-executable-closure-control-registries-2026-08-29.json',
    'subject': PLANNING / 'section-35-6-trd-2-v4-immutable-successor-requirements-2026-08-29.md',
    'binding': PLANNING / 'section-35-6-trd-2-v4-detached-candidate-packet-binding-2026-08-29.json',
}
EXPECTED = {
    'inherited': 'a6fffd28d1d07a8fb1aba97c2ccbb2c6394e5d4f912043f7d5097e24d1fa24b5',
    'fieldMap': '8c79211f49c3786726bed6b4a9327f6624fa4772a8da5f0db138977f09d45994',
    'controls': 'a932972321fb9d93be9277f1b732d0e4eb35a38477e863cd03ceb5f9bfc9ffdf',
    'subject': '72c92fce01d3fd9996965469b0fbd23c32c1e43f38740ef9be6fa7bf4235d394',
    'binding': '30bfcf42bef95586592bf8f3d0ad8113dc2ac979117bfc05d6a0ad1cbb30405d',
}


def raw(path: pathlib.Path) -> bytes:
    return path.read_bytes()


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load(path: pathlib.Path):
    return json.loads(path.read_text(encoding='utf-8'))


def canonical(value) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')


def record_root(domain: str, value) -> str:
    body = canonical(value)
    return sha(domain.encode() + b'\x00' + struct.pack('>I', len(body)) + body)


def collection_root(domain: str, records: list[dict], key: str) -> str:
    ordered = sorted(records, key=lambda r: r[key].encode('utf-8'))
    bodies = [canonical(r) for r in ordered]
    return sha(domain.encode() + b'\x00' + struct.pack('>I', len(bodies)) + b''.join(struct.pack('>I', len(body)) + body for body in bodies))


def check(condition: bool, label: str):
    if not condition:
        raise AssertionError(label)
    checks.append({'label': label, 'result': 'PASS'})


checks: list[dict] = []
inherited = load(FILES['inherited'])
field_map = load(FILES['fieldMap'])
controls = load(FILES['controls'])
binding = load(FILES['binding'])
subject = FILES['subject'].read_text(encoding='utf-8')

for name, digest in EXPECTED.items():
    check(sha(raw(FILES[name])) == digest, f'raw-root-{name}')

check(len(inherited['records']) == 101, 'inherited-101')
check(collection_root('CONNECT-TRD2V4-INHERITED-V3-REQUIREMENTS-V1', inherited['records'], 'manifestId') == inherited['recordCollectionRoot'], 'inherited-collection-root')
source_bytes = pathlib.Path(inherited['sourceArtifact']['path']).read_bytes()
source_lines = source_bytes.splitlines(keepends=True)
for record in inherited['records']:
    match = re.fullmatch(r'L(\d+)-L(\d+)', record['locator'])
    assert match
    start, end = map(int, match.groups())
    piece = b''.join(source_lines[start - 1:end])
    if len(piece) != record['bytes'] or sha(piece) != record['recordDigest']:
        raise AssertionError(f'inherited-slice-{record["manifestId"]}')
checks.append({'label': 'inherited-101-exact-slices', 'result': 'PASS'})

check(len(field_map['fieldMaps']) == 84, 'fieldmaps-84')
field_pointer_rows = [{'envelopeId': row['envelopeId'], 'fieldMapRoot': row['fieldMapRoot']} for row in field_map['fieldMaps']]
check(collection_root('CONNECT-TRD2V4-FIELD-MAP-COLLECTION-V1', field_pointer_rows, 'envelopeId') == field_map['fieldMapCollectionRoot'], 'fieldmap-collection-root')
logical_rows = [row['logicalEnvelope'] for row in field_map['fieldMaps']]
check(collection_root('CONNECT-TRD2V4-LOGICAL-OBSERVATION-COLLECTION-V1', logical_rows, 'envelopeId') == field_map['logicalObservationCollectionRoot'], 'observation-collection-root')
check(all(len(row['fields']) > 0 and {f['disposition'] for f in row['fields']} <= {'PRESENT', 'MISSING', 'CONFLICT'} for row in field_map['fieldMaps']), 'fieldmap-total-dispositions')

artifacts = {a['artifactId']: a for a in field_map['sourceArtifacts']}
check(len(field_map['sourceRecordLocators']) == 213, 'portable-locator-213')
for artifact in artifacts.values():
    capture = PLANNING / artifact['captureRelativePath']
    if sha(capture.read_bytes()) != artifact['sha256'] or capture.stat().st_size != artifact['bytes']:
        raise AssertionError(f'capture-{artifact["alias"]}')
for locator in field_map['sourceRecordLocators']:
    artifact = artifacts[locator['sourceArtifactId']]
    capture = (PLANNING / locator['captureRelativePath']).read_bytes().splitlines(keepends=True)
    piece = b''.join(capture[locator['inclusiveLineStart'] - 1:locator['inclusiveLineEnd']])
    if len(piece) != locator['bytes'] or sha(piece) != locator['sha256']:
        raise AssertionError(f'locator-{locator["locatorId"]}')
checks.append({'label': 'portable-captures-and-locators', 'result': 'PASS'})

check(len(field_map['bidiRegistry']) == 13 and {r['codePoint'] for r in field_map['bidiRegistry']} == {'U+200F'}, 'bidi-registry-13-u200f')
unique_parts = {}
for locator in field_map['sourceRecordLocators'][:128]:
    key = (locator['sourceArtifactId'], locator['inclusiveLineStart'], locator['inclusiveLineEnd'], locator['sha256'])
    unique_parts[key] = locator
bidi_count = 0
for locator in unique_parts.values():
    capture_lines = (PLANNING / locator['captureRelativePath']).read_bytes().decode('utf-8').splitlines(keepends=True)
    bidi_count += ''.join(capture_lines[locator['inclusiveLineStart'] - 1:locator['inclusiveLineEnd']]).count('\u200f')
check(bidi_count == 13, 'bidi-source-count-13')

heads = list(re.finditer(r'^## [^\n]*`(TRD2V4-REQ-\d{3})`', subject, re.MULTILINE))
subject_dependency_pairs = []
check(len(heads) == 113 and len({m.group(1) for m in heads}) == 113, 'subject-113-unique')
for index, head in enumerate(heads):
    if head.group(1) != f'TRD2V4-REQ-{index:03d}':
        raise AssertionError(f'subject-sequence-{index}')
    end = heads[index + 1].start() if index + 1 < len(heads) else subject.index('\n# 4.', head.start())
    block = subject[head.start():end]
    fields = re.findall(r'^- `([^`]+)`: ', block, re.MULTILINE)
    if fields != ['statement', 'defectCauseImpact', 'proofPredicate', 'dependencies', 'sourceBasis']:
        raise AssertionError(f'field-order-{index}')
    if len(re.findall(r'resultId=TRD2V4-RESULT-', block)) != 1:
        raise AssertionError(f'sole-output-{index}')
    dep_match = re.search(r'^- `dependencies`: \[([^\]]*)\]', block, re.MULTILINE)
    for dep in re.findall(r'TRD2V4-REQ-(\d{3})', dep_match.group(1)):
        if int(dep) >= index:
            raise AssertionError(f'forward-dependency-{index}-{dep}')
        subject_dependency_pairs.append(f'TRD2V4-REQ-{dep}->{head.group(1)}')
checks.append({'label': 'subject-113x5-sole-output-backward-dag', 'result': 'PASS'})

check(len(controls['testVectors']) == 565, 'vectors-565')
check(collection_root('CONNECT-TRD2V4-TEST-VECTOR-COLLECTION-V1', controls['testVectors'], 'vectorId') == controls['vectorCollectionRoot'], 'vector-collection-root')
check(len(controls['conformancePredicates']) == 113, 'predicates-113')
check(collection_root('CONNECT-TRD2V4-CONFORMANCE-PREDICATE-COLLECTION-V1', controls['conformancePredicates'], 'predicateId') == controls['predicateCollectionRoot'], 'predicate-collection-root')
check(len(controls['resultSchemas']) == 13 and controls['resultReceiptInstances'] == [] and controls['emptyResultReceiptSetMayPass'] is False, 'result-schemas-nonvacuous')

graph = controls['typedGraph']
check(collection_root('CONNECT-TRD2V4-TYPED-GRAPH-NODES-V1', graph['nodes'], 'nodeId') == graph['nodeCollectionRoot'], 'graph-node-root')
check(collection_root('CONNECT-TRD2V4-TYPED-GRAPH-EDGES-V1', graph['edges'], 'edgeId') == graph['edgeCollectionRoot'], 'graph-edge-root')
computed_graph_root = record_root('CONNECT-TRD2V4-TYPED-GRAPH-V1', {'typedNodeCollectionRoot': graph['nodeCollectionRoot'], 'typedEdgeCollectionRoot': graph['edgeCollectionRoot'], 'nodeCount': len(graph['nodes']), 'edgeCount': len(graph['edges'])})
check(computed_graph_root == graph['typedGraphRoot'], 'typed-graph-root')
node_ids = {n['nodeId'] for n in graph['nodes']}
indegree = {node_id: 0 for node_id in node_ids}
outgoing = {node_id: [] for node_id in node_ids}
edge_keys = set()
for edge in graph['edges']:
    if edge['fromQualifiedId'] not in node_ids or edge['toQualifiedId'] not in node_ids or edge['fromQualifiedId'] == edge['toQualifiedId']:
        raise AssertionError(f'bad-edge-{edge["edgeId"]}')
    key = (edge['edgeType'], edge['fromQualifiedId'], edge['toQualifiedId'])
    if key in edge_keys:
        raise AssertionError(f'duplicate-edge-{key}')
    edge_keys.add(key)
    outgoing[edge['fromQualifiedId']].append(edge['toQualifiedId'])
    indegree[edge['toQualifiedId']] += 1
queue = sorted(node_id for node_id, degree in indegree.items() if degree == 0)
visited = 0
while queue:
    current = queue.pop(0)
    visited += 1
    for target in outgoing[current]:
        indegree[target] -= 1
        if indegree[target] == 0:
            queue.append(target)
check(visited == len(node_ids), 'typed-graph-acyclic')
reachable = {'EXT:FREEZE'}
stack = ['EXT:FREEZE']
while stack:
    current = stack.pop()
    for target in outgoing[current]:
        if target not in reachable:
            reachable.add(target)
            stack.append(target)
check(all(f'REQ:TRD2V4-REQ-{i:03d}' in reachable for i in range(113)), 'freeze-reaches-113')
typed_dependency_pairs = sorted(f'{edge["fromQualifiedId"][4:]}->{edge["toQualifiedId"][4:]}' for edge in graph['edges'] if edge['edgeType'] == 'ClosurePrerequisite')
check(typed_dependency_pairs == sorted(subject_dependency_pairs), 'typed-dependency-projection-exact')
for predicate in controls['conformancePredicates']:
    predicate_node = f'PRED:{predicate["predicateId"]}'
    result_node = f'RESULT:{predicate["requirementId"]}'
    for input_root in set(predicate['inputSchemaRoots'] + predicate['inputArtifactRoots']):
        if not any(edge['edgeType'] == 'ValidationDependency' and edge['toQualifiedId'] == predicate_node and edge['sourceRoot'] == input_root for edge in graph['edges']):
            raise AssertionError(f'predicate-input-edge-{predicate["predicateId"]}-{input_root}')
        if not any(edge['edgeType'] == 'InvalidationEdge' and edge['toQualifiedId'] == result_node and edge['sourceRoot'] == input_root for edge in graph['edges']):
            raise AssertionError(f'predicate-invalidation-edge-{predicate["predicateId"]}-{input_root}')
checks.append({'label': 'predicate-input-and-invalidation-edges', 'result': 'PASS'})

check(len(controls['missingValues']) == 27 and len(controls['missingValuePredicates']) == 27 and all(row['state'] == 'UNRESOLVED' for row in controls['missingValues']), 'missing-value-27-lifecycle')
check(len(controls['atomicParents']) == 113 and controls['atomicDenominator'] == {'total': 113, 'atomic': 101, 'compound': 12, 'gap': 0, 'overlap': 0, 'emptyCompoundChildSets': 0}, 'atomic-denominator')
check(all(p['mandatoryChildIds'] for p in controls['atomicParents'] if p['classification'] == 'COMPOUND'), 'atomic-nonempty-children')

dl = controls['dataLifecycle']
check(len(dl['matrixRows']) == len(dl['states']) * len(dl['events']) == 320, 'lifecycle-total-matrix')
check(len({(row['fromState'], row['event']) for row in dl['matrixRows']}) == 320, 'lifecycle-unique-pairs')
check(dl['admittedDenominator'] == 0 and dl['emptyDenominatorMayPass'] is False and dl['currentResult'].startswith('BLOCKED'), 'lifecycle-external-nonvacuity')

public = controls['publicCyber']
check(public['currentSuccessor']['sha256'] == '322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a', 'public-successor-root')
check(len(public['controls']) == 52 and all(len(c['vectorIds']) == 5 and c['privatePathCount'] == 0 for c in public['controls']), 'public-control-mapping-52')
check(controls['publicInvariant'] == 'PUBLIC' and controls['privateRemediationAllowed'] is False, 'public-no-private-path')

check(collection_root('CONNECT-TRD2V4-REQUIREMENT-COLLECTION-V1', binding['canonicalRequirementRecords'], 'requirementId') == binding['requirementCollectionRoot'], 'requirement-collection-root')
check(len(binding['findingToV4Crosswalk']) == 12 and len({row['findingId'] for row in binding['findingToV4Crosswalk']}) == 12 and all('NO-MERGE' in row['disposition'] and 'NO-CLOSURE-TRANSFER' in row['disposition'] for row in binding['findingToV4Crosswalk']), 'finding-crosswalk-12-distinct')
check(len(binding['v3ToV4Crosswalk']) == 101 and len({row['sourceRequirementId'] for row in binding['v3ToV4Crosswalk']}) == 101 and len({row['successorRequirementId'] for row in binding['v3ToV4Crosswalk']}) == 101, 'v3-crosswalk-101-distinct')
root_rows = [{'rootName': name, 'rootValue': value, 'state': 'MISSING' if value.startswith('MISSING/') else 'PRESENT'} for name, value in binding['mandatoryRoots'].items()]
check(collection_root('CONNECT-TRD2V4-MANDATORY-ROOT-SET-V1', root_rows, 'rootName') == binding['mandatoryRootSetRoot'], 'mandatory-root-set-root')
payload = dict(binding)
payload.pop('packetBindingPayloadRoot')
check(record_root('CONNECT-TRD2V4-PACKET-BINDING-PAYLOAD-V1', payload) == binding['packetBindingPayloadRoot'], 'packet-binding-payload-root')
check(binding['externalPrerequisitesSatisfied'] is False and binding['actualResultReceipts'] == [] and binding['actualReviewGenerations'] == [] and binding['actualAcceptance'] is None, 'zero-acceptance')

output = {
    'engineId': 'CONNECT-TRD2V4-MECHANICAL-QA-ENGINE-B-PYTHON-V1',
    'implementation': 'Python independent read-only verifier with independent canonical-root implementation',
    'inputRoots': EXPECTED,
    'verdict': 'PASS-MECHANICAL-CANDIDATE-NOT-ACCEPTANCE',
    'checks': checks,
    'counters': {
        'checks': len(checks), 'requirements': 113, 'inheritedV3': 101, 'observations': 84, 'sourceParts': 128,
        'v2Locators': 85, 'bidiU200F': 13, 'predicates': 113, 'vectors': 565,
        'graphNodes': len(graph['nodes']), 'graphEdges': len(graph['edges']), 'atomicChildren': len(controls['atomicChildren']),
        'lifecycleRows': len(dl['matrixRows']), 'publicControls': 52, 'accepted': 0,
    },
    'externalBlockers': ['B0', 'accepted Protocol', 'accepted Source Universe', 'Authority/Freeze', 'appointments', 'evaluator', 'runner A', 'runner B', 'two review generations', 'Reconciliation', 'Definition Acceptance'],
    'publicInvariant': 'PUBLIC',
    'privateRemediationAllowed': False,
}
out = PLANNING / 'section-35-6-trd-2-v4-mechanical-qa-engine-b-2026-08-29.json'
out.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'output': str(out), 'sha256': sha(out.read_bytes()), 'bytes': out.stat().st_size, 'lines': len(out.read_text(encoding='utf-8').splitlines()), 'verdict': output['verdict']}, indent=2))
