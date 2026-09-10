#!/usr/bin/env python3

import base64
import copy
import hashlib
import json
import re
import sys
from pathlib import Path

BASE = Path('web/docs/planning')
FILES = {
    'subject': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v5-2026-08-30.md',
    'registry': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v5-normative-registry-2026-08-30.json',
    'index': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v5-source-member-span-index-2026-08-30.json',
    'crosswalk': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v5-closure-crosswalk-2026-08-30.json',
    'vectors': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v5-executable-vector-corpus-2026-08-30.json',
    'manifest': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v5-atomic-package-manifest-2026-08-30.json',
    'report': BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v5-qa-reader-b-report-2026-08-30.json',
}
EXPECTED_INPUTS = {
    BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-2026-08-29.md': '4a45fd1b9e2aeefefff28862676f5cfa7c87f5141d81edcf9691a908c7c8f0c9',
    BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-normative-registry-2026-08-29.json': '94a4d151425325e43832e57b2579e78bf7fa1e56bcdfda1ec704137eb53501d2',
    BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-source-member-span-index-2026-08-29.json': '641459c7a09b30eb0c5ea48359194b092f0d5d00109c7df3f43a3bf53030ad7a',
    BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-closure-crosswalk-2026-08-29.json': '24d3d90b404847d7a7ca5a457edf8117cca0f12a79cbc552eac8ef47d1763451',
    BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-executable-vector-programs-2026-08-29.json': 'a004e0dfed0e7741d5a1f9c02b7fa9a4efef644209ff730041aaf8cb819d9fbd',
    BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-atomic-package-manifest-2026-08-29.json': '8a782b55eb92768288a5f1d64e04f76869c4af739e1e2f997a257c34c65709ad',
    BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-independent-hostile-review-2026-08-30.md': '04911c4607c08ccd3763b4ac9ccf08e20722a0dfe321f1c94e6832b599bf9d83',
    BASE / 'bootstrap-authority-envelope-b0-successor-requirements-v4-independent-hostile-review-findings-manifest-2026-08-30.md': '409b81a79656c40ddad20cb56785650b886b23160f2df78ef359d8da247aceed',
}
PROOF_CLASSES = ['PARSER', 'SERIALIZER', 'GRAPH', 'SIGNATURE', 'TIME', 'ENVELOPE', 'STATE-REDUCER', 'VECTOR-RUNNER', 'READBACK']


def read_bytes(path):
    return Path(path).read_bytes()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def rooted(domain, value):
    return digest((domain + '\n' + canonical(value)).encode('utf-8'))


def load_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def package_root(domain, members):
    projection = [
        {
            'ordinal': member['ordinal'],
            'logicalPath': member['logicalPath'],
            'sha256': member['sha256'],
            'bytes': member['bytes'],
            'required': member['required'],
        }
        for member in members
    ]
    return digest((domain + '\n' + canonical(projection)).encode('utf-8'))


def parse_requirements(source, prefix):
    heading = re.compile(r'^## \d+\.\d+ `' + re.escape(prefix) + r'-(\d{3})` — (.+)$', re.MULTILINE)
    matches = list(heading.finditer(source))
    rows = []
    for index_number, match in enumerate(matches):
        end = matches[index_number + 1].start() if index_number + 1 < len(matches) else len(source)
        block = source[match.start():end]
        fields = {}
        for name in ['statement', 'threatCauseImpact', 'requiredProof', 'dependencies', 'sourceBasis']:
            field_match = re.search(r'`' + re.escape(name) + r'`: ([^\n]+)', block)
            if field_match is None:
                raise ValueError(f'missing {name} in {prefix}-{match.group(1)}')
            fields[name] = field_match.group(1)
        rows.append({'id': f'{prefix}-{match.group(1)}', 'fields': fields})
    return rows


def set_pointer(document, pointer, value):
    components = [part.replace('~1', '/').replace('~0', '~') for part in pointer.split('/')[1:]]
    cursor = document
    for component in components[:-1]:
        cursor = cursor[int(component)] if isinstance(cursor, list) else cursor[component]
    if isinstance(cursor, list):
        cursor[int(components[-1])] = copy.deepcopy(value)
    else:
        cursor[components[-1]] = copy.deepcopy(value)


def apply_program(state, operations):
    result = copy.deepcopy(state)
    for operation in operations:
        if operation['op'] != 'SET':
            raise ValueError('unsupported operation ' + operation['op'])
        set_pointer(result, operation['path'], operation['value'])
    return result


def oracle(kind, state):
    if kind == 'SOURCE-MEMBER-IDENTITY':
        member = base64.b64decode(state['memberBytesBase64'])
        decoded = member.decode('utf-8')
        return (
            len(member) > 1
            and len(member) == state['endByteExclusive'] - state['startByteInclusive']
            and digest(member) == state['memberSha256']
            and f"`{state['locator']}`" in decoded
            and all(f'`{field}`' in decoded for field in state['requiredFieldLabels'])
        )
    if kind == 'TYPED-SUPERSESSION-LITERAL':
        source = base64.b64decode(state['sourceMemberBytesBase64'])
        atom = base64.b64decode(state['oldAtomBytesBase64'])
        start = state['oldAtomStartByteWithinMember']
        end = state['oldAtomEndByteWithinMember']
        return state['locatorResolvable'] is True and digest(source) == state['sourceMemberSha256'] and end - start == len(atom) and source[start:end] == atom and source.find(atom, start + 1) == -1
    if kind == 'LOCATOR-RESOLUTION':
        member = base64.b64decode(state['memberBytesBase64'])
        return state['resolves'] is True and state['locator'] == state['expectedLocator'] and state['logicalPath'].startswith('web/') and '..' not in state['logicalPath'] and not state['logicalPath'].startswith('/') and digest(member) == state['memberSha256'] and len(member) == state['endByteExclusive'] - state['startByteInclusive']
    if kind == 'SEMANTIC-INTERFACE':
        body = copy.deepcopy(state['interface'])
        declared = body.pop('instanceRoot')
        fields_present = all(body.get(name) for name in ['consumerClass', 'providerClass', 'inputRoot', 'outputRoot', 'validationPredicate', 'validationPredicateRoot'])
        consumes = any(edge['edgeClass'] == 'CONSUMES-PRIOR-INTERFACE' and edge['source'] == body['consumerRequirement'] and edge['target'] == body['interfaceId'] for edge in state['edges'])
        implements = any(edge['edgeClass'] == 'IMPLEMENTS-PRIOR-INTERFACE' and edge['source'] == body['providerRequirement'] and edge['target'] == body['interfaceId'] for edge in state['edges'])
        return fields_present and rooted('CONNECT-B0-V5-PRIOR-INTERFACE-V1', body) == declared and consumes and implements and state['citationEdgeClass'] == 'CITES-SOURCE-MEMBER' and state['citationEdgeClass'] not in state['semanticEdgeClasses']
    if kind == 'MUTABLE-HEAD-DAG':
        objects = state['objectToHead']
        class_names = [row['objectClass'] for row in objects]
        head_ids = state['headIds']
        heads = set(head_ids)
        valid_paths = all(
            row['headId'] in heads
            and len(row['membershipPath']) == 2
            and all(edge['sourceNode'] != edge['targetNode'] for edge in row['membershipPath'])
            and row['membershipPath'][0]['targetNode'] == row['membershipPath'][1]['sourceNode']
            and row['membershipPath'][1]['targetNode'] == 'Head:SecurityUniverseHead'
            for row in objects
        )
        return len(objects) == 94 and len(set(class_names)) == 94 and len(head_ids) == 36 and len(heads) == 36 and valid_paths
    if kind == 'VECTOR-CAUSAL-SPEC':
        data = base64.b64decode(state['fixtureBytesBase64'])
        return digest(data) == state['fixtureSha256'] and any(path in state['oracleReadPaths'] for path in state['operationPaths']) and state['oracleKind'] != 'STORED-EXPECTED' and state['storedExpectedUsedAsOracleInput'] is False and state['controlDecision'] == 'ELIGIBLE' and state['mutationDecision'] == 'BLOCKED'
    if kind == 'ACCEPTANCE-PERMIT-FIELDS':
        values = state['values']
        return all(name in state['acceptanceFieldNames'] for name in state['requiredAcceptanceNames']) and all(name in state['permitFieldNames'] for name in state['requiredPermitNames']) and values['notBefore'] <= values['trustedNow'] < values['validThrough'] and values['attemptUsed'] is False and values['providedFence'] >= values['currentFence'] and values['expectedPermitHead'] == values['currentPermitHead'] and values['expectedRevocationHead'] == values['currentRevocationHead']
    if kind == 'WITNESS-INDEPENDENCE':
        witnesses = state['witnesses']
        profiles = state['profiles']
        classes = {profile['proofClass'] for profile in profiles}
        witness_ok = len(witnesses) == 2 and witnesses[0]['controller'] != witnesses[1]['controller'] and witnesses[0]['checkpointRoot'] == witnesses[1]['checkpointRoot'] and all(witness['acknowledgementRoot'] for witness in witnesses)
        profiles_ok = len(profiles) == 9 and len(classes) == 9 and all(name in classes for name in PROOF_CLASSES) and all(profile['implementationRootA'] != profile['implementationRootB'] and profile['dependencyRootA'] != profile['dependencyRootB'] and profile['runtimeRootA'] != profile['runtimeRootB'] and profile['controllerRootA'] != profile['controllerRootB'] for profile in profiles)
        return witness_ok and profiles_ok
    if kind == 'ACCEPTANCE-CAS':
        return state['expectedPointerVersion'] == state['currentPointerVersion'] and state['expectedPointerRoot'] == state['currentPointerRoot'] and state['attemptUsed'] is False and state['providedFence'] >= state['currentFence'] and state['commitRevision'] > state['revocationRevision'] and state['notBefore'] <= state['trustedNow'] < state['validThrough'] and not (state['responseLost'] and state['retryEffectRequested'])
    if kind == 'GENESIS-CAUSALITY':
        ids = {member['memberId'] for member in state['memberSlots']}
        return len(state['memberSlots']) == state['expectedMemberCount'] and len(ids) == state['expectedMemberCount'] and all(member['slotSchemaRoot'] and member['currentInstanceRoot'] is None for member in state['memberSlots']) and state['externalIssuerClass'] == 'EXTERNAL-L0-QUORUM-PREEXISTING-B0' and len(state['validatorProfileIds']) == 2 and len(set(state['validatorProfileIds'])) == 2 and all(member_id in ids for member_id in state['firstPermitPrerequisiteMemberIds']) and state['createsOwnPrerequisite'] is False
    if kind == 'RECOVERY-QUORUM':
        all_controllers = state['memberControllers'] + state['witnessControllers']
        return len(state['memberControllers']) == 5 and len(set(state['memberControllers'])) == 5 and len(state['witnessControllers']) == 2 and len(set(all_controllers)) == 7 and all(controller not in state['excludedRoleControllers'] for controller in all_controllers) and 'AuthorityOwner' in state['excludedRoleControllers'] and len(set(state['signingMemberIds'])) >= state['threshold'] and state['attemptUsed'] is False and state['sameChallenge'] is True
    if kind == 'PACKAGE-CONTENT-ROOT':
        ordinals_ok = all(member['ordinal'] == index_number + 1 for index_number, member in enumerate(state['members']))
        paths_unique = len({member['logicalPath'] for member in state['members']}) == len(state['members'])
        return state['domain'] == 'CONNECT-B0-V5-PACKAGE-CONTENT-V1' and ordinals_ok and paths_unique and package_root(state['domain'], state['members']) == state['declaredRoot']
    if kind == 'INHERITED-ATOM':
        source = base64.b64decode(state['sourceValueBase64'])
        stored = base64.b64decode(state['storedValueBase64'])
        disposition = state['disposition'] == 'ACTIVE-INHERITED-MANDATORY-CONJUNCT' or ('SUPERSEDED' in state['disposition'] and len(state['replacementIds']) > 0)
        return source == stored and digest(stored) == state['storedValueSha256'] and disposition
    raise ValueError('unknown oracle ' + kind)


registry = load_json(FILES['registry'])
source_index = load_json(FILES['index'])
crosswalk = load_json(FILES['crosswalk'])
corpus = load_json(FILES['vectors'])
manifest = load_json(FILES['manifest'])
subject_text = FILES['subject'].read_text(encoding='utf-8')
checks = []


def check(name, evaluator):
    try:
        detail = evaluator()
        if detail is False:
            raise ValueError('predicate returned false')
        checks.append({'name': name, 'state': 'PASS', 'detail': detail if isinstance(detail, str) else 'verified'})
    except Exception as error:
        checks.append({'name': name, 'state': 'FAIL', 'detail': str(error)})


def verify_frozen_inputs():
    for path, expected in EXPECTED_INPUTS.items():
        if digest(read_bytes(path)) != expected:
            raise ValueError(str(path))
    return f'{len(EXPECTED_INPUTS)}/{len(EXPECTED_INPUTS)}'


def verify_manifest():
    if manifest['memberCount'] != 8 or len(manifest['members']) != 8:
        return False
    for member in manifest['members']:
        data = read_bytes(member['logicalPath'])
        if digest(data) != member['sha256'] or len(data) != member['bytes']:
            raise ValueError(member['logicalPath'])
    computed = package_root(manifest['packageContentRootAlgorithm']['domainUtf8'], manifest['members'])
    preimage = base64.b64decode(manifest['packageRootPreimageBase64'])
    return computed == manifest['packageContentRoot'] and digest(preimage) == computed


def verify_index():
    total = 0
    for artifact in source_index['artifacts']:
        path = artifact['logicalPath']
        if not path.startswith('web/') or '..' in path or path.startswith('/'):
            raise ValueError(path)
        data = read_bytes(path)
        if digest(data) != artifact['sha256'] or len(data) != artifact['bytes']:
            raise ValueError(artifact['alias'])
        locators = set()
        for member in artifact['members']:
            if member['locator'] in locators:
                raise ValueError(f"duplicate:{artifact['alias']}:{member['locator']}")
            locators.add(member['locator'])
            selected = data[member['startByteInclusive']:member['endByteExclusive']]
            if len(selected) != member['byteLength'] or digest(selected) != member['sha256']:
                raise ValueError(f"span:{artifact['alias']}:{member['locator']}")
            if re.match(r'^(B0V4REQ|B0V3REQ|B0V2REQ|B0REQ|B0V4-HR-F)', member['locator']) and '.' not in member['locator'] and len(selected) <= 1:
                raise ValueError(f"collapsed:{artifact['alias']}:{member['locator']}")
            total += 1
    return f"{total}/{source_index['memberCount']}" if total == source_index['memberCount'] else False


def verify_atoms():
    if len(registry['exactAtomSupersessions']) != 10:
        return False
    for row in registry['exactAtomSupersessions']:
        member = row['sourceMember']
        data = read_bytes(member['logicalPath'])[member['startByteInclusive']:member['endByteExclusive']]
        atom = base64.b64decode(row['oldAtomUtf8Base64'])
        start = row['oldAtomStartByteWithinMember']
        end = row['oldAtomEndByteWithinMember']
        if digest(data) != member['memberSha256'] or digest(atom) != row['oldAtomSha256'] or data[start:end] != atom or data.find(atom, start + 1) != -1:
            raise ValueError(row['supersessionId'])
    return '10/10'


def verify_preservation():
    rows = crosswalk['inheritedV4Requirements']
    fields = [field for row in rows for field in row['fields']]
    if len(rows) != 84 or len(fields) != 420:
        return False
    for field in fields:
        value_bytes = field['exactOldValue'].encode('utf-8')
        source = field['sourceField']
        source_bytes = read_bytes(source['logicalPath'])[source['startByteInclusive']:source['endByteExclusive']]
        if base64.b64decode(field['exactOldValueUtf8Base64']) != value_bytes or source_bytes != value_bytes or digest(source_bytes) != source['memberSha256'] or digest(value_bytes) != field['exactOldValueSha256']:
            raise ValueError(field['sourceField']['locator'])
        for selector in field['supersededAtomSelectors']:
            atom = base64.b64decode(selector['exactOldAtomUtf8Base64'])
            start = selector['startByteWithinField']
            end = selector['endByteWithinField']
            if not atom or value_bytes[start:end] != atom or atom.decode('utf-8') != selector['exactOldAtom'] or digest(atom) != selector['exactOldAtomSha256'] or selector['replacementId'] not in field['replacementIds'] or not selector['disposition'].startswith('SUPERSEDED'):
                raise ValueError(selector['selectorId'])
    return '84/84;420/420'


def verify_interfaces_and_named_uses():
    graph = crosswalk['namedUseGraph']
    return len(registry['priorInterfaceRegistry']['interfaces']) == 17 and len(graph['priorInterfaces']) == 17 and len(graph['unclassifiedMarkerUses']) == 0 and all(row['consumerUseCount'] == 1 and row['providerImplementationCount'] == 1 for row in graph['priorInterfaces']) and graph['citationEdgeClass'] not in graph['semanticUseEdgeClasses'] and all(int(edge['targetRequirementId'][-3:]) < int(edge['sourceRequirementId'][-3:]) for edge in graph['buildEdges'])


def verify_heads():
    mutable = registry['mutableHeadRegistry']
    state = {'headIds': [head['headId'] for head in mutable['heads']], 'objectToHead': mutable['objectToHead']}
    return mutable['objectClassCount'] == 94 and mutable['generatedHeadCount'] == 36 and oracle('MUTABLE-HEAD-DAG', state)


def verify_acceptance():
    acceptance = registry['acceptanceFieldRegistry']
    names = {field['name'] for field in acceptance['fields']}
    permits = registry['permitSchemas']
    return acceptance['fieldCount'] == len(acceptance['fields']) and all(name in names for name in acceptance['requiredCausalFieldNames']) and len(permits) == 3 and len({permit['permitType'] for permit in permits}) == 3 and len(registry['independenceProfileRegistry']) == 9 and {profile['proofClass'] for profile in registry['independenceProfileRegistry']} == set(PROOF_CLASSES) and {'witness1AcknowledgementRoot', 'witness2AcknowledgementRoot', 'witnessCommonCheckpointRoot'}.issubset(names)


def verify_genesis_cas_recovery():
    genesis = registry['genesisFoundation']
    operations = {step['op'] for step in registry['acceptanceCas']['orderedTransaction']}
    expected_operations = {'COMPARE-EXPECTED-ACCEPTANCE-POINTER-VERSION-AND-ROOT', 'COMPARE-EXPECTED-PERMIT-LEDGER-HEAD-AND-UNUSED-PERMIT-ID', 'COMPARE-EXPECTED-REVOCATION-HEAD-AUTHORITY-REVISION-AND-FENCING-TOKEN', 'RESERVE-UNIQUE-DETERMINISTIC-ATTEMPT-ID-AND-ADVANCE-FENCE', 'COMMIT-DURABLY'}
    recovery = registry['recoveryQuorum']
    return genesis['memberSlotCount'] == 33 and len(genesis['memberSlots']) == 33 and all(member['slotSchemaRoot'] and member['currentInstanceRoot'] is None for member in genesis['memberSlots']) and genesis['currentFoundationInstanceRoot'] is None and genesis['createsOwnPrerequisite'] is False and expected_operations.issubset(operations) and 'NEVER-RETRY-EFFECT' in registry['acceptanceCas']['responseLossRecovery']['rule'] and len(recovery['memberSlots']) == 5 and len(recovery['witnessSlots']) == 2 and recovery['threshold'] == 3 and len(recovery['controllerExclusionRoles']) == 8 and 'AuthorityOwner' in recovery['controllerExclusionRoles'] and len(registry['roleUniverse']['pairMatrix']) == 28


vector_pass_count = 0


def verify_vectors():
    global vector_pass_count
    if corpus['fixtureCount'] != 288 or corpus['vectorCount'] != 288 or len(corpus['fixtures']) != 288 or len(corpus['vectors']) != 288:
        return False
    fixtures = {fixture['fixtureId']: fixture for fixture in corpus['fixtures']}
    for vector in corpus['vectors']:
        fixture = fixtures[vector['fixtureId']]
        fixture_bytes = base64.b64decode(fixture['fixtureBytesBase64'])
        if fixture_bytes.decode('utf-8') != canonical(fixture['fixtureDocument']) or digest(fixture_bytes) != fixture['fixtureSha256'] or vector['fixtureSha256'] != fixture['fixtureSha256']:
            raise ValueError(vector['vectorId'] + ':fixture')
        kind = vector['program']['oracle']['kind']
        if vector['program']['oracle']['storedExpectedValueIsOracleInput'] is not False:
            raise ValueError(vector['vectorId'] + ':oracle-input')
        initial = fixture['fixtureDocument']['domainState']
        if not oracle(kind, initial):
            raise ValueError(vector['vectorId'] + ':control')
        mutated = apply_program(initial, vector['program']['operations'])
        if oracle(kind, mutated):
            raise ValueError(vector['vectorId'] + ':mutation')
        if vector['expected']['controlDecision'] != 'ELIGIBLE' or vector['expected']['mutationDecision'] != 'BLOCKED' or vector['expected']['usableAuthority'] != 0:
            raise ValueError(vector['vectorId'] + ':expected')
        if vector['programRoot'] != rooted('CONNECT-B0-V5-VECTOR-PROGRAM-V1', vector['program']):
            raise ValueError(vector['vectorId'] + ':program-root')
        vector_pass_count += 1
    return f'{vector_pass_count}/288'


check('frozen-input-roots', verify_frozen_inputs)
check('atomic-member-hashes-and-package-root', verify_manifest)
check('cross-root-bindings', lambda: manifest['subjectSha256'] == digest(read_bytes(FILES['subject'])) and manifest['normativeRegistrySha256'] == digest(read_bytes(FILES['registry'])) and manifest['sourceMemberSpanIndexSha256'] == digest(read_bytes(FILES['index'])) and manifest['closureCrosswalkSha256'] == digest(read_bytes(FILES['crosswalk'])) and manifest['executableVectorCorpusSha256'] == digest(read_bytes(FILES['vectors'])))
check('requirements-and-five-fields', lambda: len(parse_requirements(subject_text, 'B0V5REQ')) == 96 and all(row['id'] == f'B0V5REQ-{index_number:03d}' and len(row['fields']) == 5 for index_number, row in enumerate(parse_requirements(subject_text, 'B0V5REQ'))))
check('non-merged-finding-replacements', lambda: len(registry['replacementRegistry']) == 12 and len(crosswalk['hostileFindingClosureRows']) == 12 and len({row['findingId'] for row in registry['replacementRegistry']}) == 12 and len({row['noMergeKey'] for row in registry['replacementRegistry']}) == 12 and all(row['oldMembers'] and all(member['disposition'].startswith('SUPERSEDED') for member in row['oldMembers']) for row in registry['replacementRegistry']))
check('literal-atom-supersessions', verify_atoms)
check('source-index-artifacts-and-member-spans', verify_index)
check('inherited-v4-requirements-and-fields', verify_preservation)
check('all-inherited-source-references-resolve', lambda: not crosswalk['inheritedSourceReferenceResolution']['unresolved'] and crosswalk['inheritedSourceReferenceResolution']['referenceCount'] == crosswalk['inheritedSourceReferenceResolution']['resolvedCount'] and all(row['state'] == 'RESOLVED-EXACT' for row in crosswalk['inheritedSourceReferenceResolution']['references']))
check('named-use-and-interface-instances', verify_interfaces_and_named_uses)
check('closed-mutable-head-map', verify_heads)
check('acceptance-witness-independence-closure', verify_acceptance)
check('genesis-cas-recovery-role-closure', verify_genesis_cas_recovery)
check('directive-head-and-bounded-convergence', lambda: registry['directiveUniverse']['directiveCount'] == len(registry['directiveUniverse']['directives']) and all(row['currentHeadId'] == 'B0V5-HEAD-07' for row in registry['directiveUniverse']['directives']) and registry['convergencePolicy']['maximumSuccessorRoundsPerReviewEpoch'] == 3 and registry['convergencePolicy']['automaticRecursionAllowed'] is False)
check('public-output-and-zero-state', lambda: len(registry['outputRegistry']) == 96 and all(row['repositoryVisibility'] == 'PUBLIC' and row['implementationRoot'] is None and row['acceptanceCredit'] == 0 for row in registry['outputRegistry']) and registry['currentAuthorityState']['acceptedRequirementCount'] == '0/96' and registry['currentAuthorityState']['operationalVectorExecutionCount'] == '0/288' and registry['currentAuthorityState']['Gate29'] == 'BLOCKED')
check('causal-vector-corpus', verify_vectors)
check('public-package-path-scan', lambda: all('/Users/' not in Path(FILES[name]).read_text(encoding='utf-8') and 'file://' not in Path(FILES[name]).read_text(encoding='utf-8') for name in ['subject', 'registry', 'index', 'crosswalk', 'vectors', 'manifest']))

failures = [row for row in checks if row['state'] == 'FAIL']
report = {
    'artifactId': 'CONNECT-B0-V5-INDEPENDENTLY-IMPLEMENTED-QA-READER-B-REPORT-2026-08-30-G0',
    'artifactClass': 'DETACHED-PRODUCER-QA-READER-REPORT;PLANNING-MECHANICAL-EVIDENCE-ONLY;NOT-INDEPENDENT-HOSTILE-REVIEW;NOT-AUTHORITY;NOT-ACCEPTANCE',
    'readerLanguage': 'PYTHON-STANDARD-LIBRARY-ONLY',
    'atomicPackageManifestSha256': digest(read_bytes(FILES['manifest'])),
    'packageContentRoot': manifest['packageContentRoot'],
    'checkCount': len(checks),
    'passedCheckCount': len(checks) - len(failures),
    'failedCheckCount': len(failures),
    'planningDslVectorPassCount': vector_pass_count,
    'operationalVectorExecutionCount': 0,
    'independentlyClosedFindingCount': '0/12',
    'acceptedRequirementCount': '0/96',
    'Gate29': 'BLOCKED',
    'verdict': 'MECHANICAL-PASS' if not failures else 'MECHANICAL-FAIL',
    'checks': checks,
    'authorityCredit': 0,
    'acceptanceCredit': 0,
}
FILES['report'].write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'verdict': report['verdict'], 'passed': report['passedCheckCount'], 'checks': report['checkCount'], 'vectors': vector_pass_count}, separators=(',', ':')))
if failures:
    sys.exit(1)
