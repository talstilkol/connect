#!/usr/bin/env python3

import base64
import binascii
import copy
import hashlib
import json
import pathlib
import re

P = 'docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6'
VECTOR_SHARD_COUNT = 16
PACKAGE_MEMBER_COUNT = 24
MAX_PUBLIC_GIT_FILE_BYTES = 50 * 1024 * 1024
PATHS = {
    'subject': f'{P}-2026-08-30.md',
    'registry': f'{P}-normative-registry-2026-08-30.json',
    'source_index': f'{P}-source-member-span-index-2026-08-30.json',
    'crosswalk': f'{P}-closure-crosswalk-2026-08-30.json',
    'vectors': f'{P}-portable-causal-vector-corpus-2026-08-30.json',
    'vector_shards': [f'{P}-portable-causal-vector-corpus-shard-{index:02d}-of-{VECTOR_SHARD_COUNT}-2026-08-30.json' for index in range(1, VECTOR_SHARD_COUNT + 1)],
    'manifest': f'{P}-atomic-package-manifest-2026-08-30.json',
    'generator': 'docs/planning/qa/generate-b0-v6-package.mjs',
    'reader_a': 'docs/planning/qa/b0-v6-qa-reader-a.mjs',
    'reader_b': 'docs/planning/qa/b0-v6-qa-reader-b.py',
}
errors = []
checks = []


def raw(file_name):
    return pathlib.Path(file_name).read_bytes()


def load(file_name):
    return json.loads(raw(file_name))


def digest(value):
    return hashlib.sha256(value).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def domain_root(domain, value):
    return digest((domain + '\n' + canonical(value)).encode('utf-8'))


def deterministic_id(prefix, domain, value):
    return f'{prefix}-{domain_root(domain, value)[:24]}'


def check(condition, code, detail=''):
    checks.append(code)
    if not condition:
        errors.append({'code': code, 'detail': detail})


def public_locator_violations(value, trail=()):
    violations = []
    if isinstance(value, list):
        for index, child in enumerate(value):
            violations.extend(public_locator_violations(child, trail + (str(index),)))
    elif isinstance(value, dict):
        for key, child in value.items():
            child_trail = trail + (key,)
            if isinstance(child, str) and key.lower().endswith(('logicalpath', 'repositorypath', 'artifactpath', 'filepath')):
                if not child.startswith('docs/') or child.startswith(('web/', '/')) or '..' in child:
                    violations.append({'trail': '/'.join(child_trail), 'value': child})
            violations.extend(public_locator_violations(child, child_trail))
    return violations


def is_acyclic(nodes, edges):
    adjacency = {(node if isinstance(node, str) else node['nodeId']): [] for node in nodes}
    for edge in edges:
        if edge['source'] not in adjacency or edge['target'] not in adjacency:
            return False
        adjacency[edge['source']].append(edge['target'])
    visiting = set()
    visited = set()

    def visit(node):
        if node in visiting:
            return False
        if node in visited:
            return True
        visiting.add(node)
        if not all(visit(target) for target in adjacency[node]):
            return False
        visiting.remove(node)
        visited.add(node)
        return True

    return all(visit(node) for node in adjacency)


def get_pointer(document, pointer):
    value = document
    for part in pointer.split('/')[1:]:
        part = part.replace('~1', '/').replace('~0', '~')
        if isinstance(value, list):
            value = value[int(part)]
        else:
            value = value[part]
    return value


def set_pointer(document, pointer, new_value):
    parts = [part.replace('~1', '/').replace('~0', '~') for part in pointer.split('/')[1:]]
    target = document
    for part in parts[:-1]:
        target = target[int(part)] if isinstance(target, list) else target[part]
    if isinstance(target, list):
        target[int(parts[-1])] = copy.deepcopy(new_value)
    else:
        if parts[-1] not in target:
            raise KeyError(pointer)
        target[parts[-1]] = copy.deepcopy(new_value)


def evaluate_axis(axis):
    kind = axis['kind']
    if kind == 'EQUAL':
        return canonical(axis['actual']) == canonical(axis['expected'])
    if kind == 'NON_NULL':
        return axis['actual'] is not None and axis['actual'] != ''
    if kind == 'ZERO':
        return axis['actual'] == 0
    if kind == 'COUNT_EQUAL':
        return isinstance(axis['actual'], int) and axis['actual'] >= 0 and axis['actual'] == axis['expected']
    if kind == 'UNIQUE_COUNT':
        actual = axis['actual']
        return isinstance(actual, list) and len(actual) == axis['expected'] and len({canonical(item) for item in actual}) == axis['expected']
    if kind == 'DISTINCT':
        return canonical(axis['actualLeft']) != canonical(axis['actualRight'])
    if kind == 'SET_CONTAINS_ALL':
        actual = {canonical(item) for item in axis['actual']}
        return all(canonical(item) in actual for item in axis['required'])
    if kind == 'PATH_REPO_RELATIVE':
        actual = axis['actual']
        return isinstance(actual, str) and actual.startswith('docs/') and not actual.startswith('web/') and not actual.startswith('/') and '..' not in actual
    if kind == 'BOOLEAN_TRUE':
        return axis['actual'] is True
    return False


def is_typed_value(value, type_name):
    if type_name == 'NULL-CONSTANT':
        return value is None
    if type_name == 'BOOLEAN' or type_name.startswith('BOOLEAN-'):
        return isinstance(value, bool)
    if type_name.startswith(('U8', 'U64')):
        return isinstance(value, int) and not isinstance(value, bool) and value >= 0
    if type_name == 'SHA256':
        return isinstance(value, str) and re.fullmatch(r'[0-9a-f]{64}', value) is not None
    if type_name == 'SHA256-ARRAY' or 'ARRAY' in type_name:
        return isinstance(value, list) and len(value) > 0
    if type_name == 'RFC3339-UTC':
        return isinstance(value, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', value) is not None
    if 'DETERMINISTIC-ID' in type_name:
        return isinstance(value, str) and len(value) > 8
    if 'ENUM' in type_name or 'ALGORITHM-ID' in type_name or type_name == 'CANONICAL-UTF8':
        return isinstance(value, str) and len(value) > 0
    return value is not None


def is_typed_field(value, field):
    if not isinstance(field, dict) or field.get('cardinality') != 'EXACTLY-ONE' or not is_typed_value(value, field.get('type', '')):
        return False
    if 'constant' in field and canonical(value) != canonical(field['constant']):
        return False
    if isinstance(field.get('enum'), list) and all(canonical(item) != canonical(value) for item in field['enum']):
        return False
    if isinstance(value, list):
        match = re.search(r'EXACTLY-(\d+)$', field['type'])
        exact = field.get('elementCardinality', {}).get('exact')
        if exact is None and match:
            exact = int(match.group(1))
        if exact is not None and len(value) != exact:
            return False
        minimum = field.get('elementCardinality', {}).get('minimum')
        maximum = field.get('elementCardinality', {}).get('maximum')
        if minimum is not None and len(value) < minimum:
            return False
        if maximum is not None and len(value) > maximum:
            return False
        if field['type'].startswith('SHA256-ARRAY') and not all(isinstance(item, str) and re.fullmatch(r'[0-9a-f]{64}', item) for item in value):
            return False
    return True


def expression_value(expression, side, state):
    const_key = side + 'Const'
    if const_key in expression:
        return expression[const_key]
    return get_pointer(state, expression[side + 'Path'])


def evaluate_constraint(expression, state):
    if not isinstance(expression, dict):
        return False
    op = expression.get('op')
    if op == 'AND':
        args = expression.get('args')
        return isinstance(args, list) and len(args) > 0 and all(evaluate_constraint(item, state) for item in args)
    if op == 'EQ':
        return canonical(expression_value(expression, 'left', state)) == canonical(expression_value(expression, 'right', state))
    if op == 'NEQ':
        return canonical(expression_value(expression, 'left', state)) != canonical(expression_value(expression, 'right', state))
    if op == 'LT':
        return expression_value(expression, 'left', state) < expression_value(expression, 'right', state)
    if op == 'LTE':
        return expression_value(expression, 'left', state) <= expression_value(expression, 'right', state)
    if op == 'GT':
        return expression_value(expression, 'left', state) > expression_value(expression, 'right', state)
    if op == 'COUNT_EQ':
        actual = get_pointer(state, expression['path'])
        return isinstance(actual, list) and len(actual) == expression['expected']
    if op == 'UNIQUE_COUNT':
        actual = get_pointer(state, expression['path'])
        return isinstance(actual, list) and len(actual) == expression['expected'] and len({canonical(item) for item in actual}) == expression['expected']
    if op == 'NON_NULL':
        actual = get_pointer(state, expression['path'])
        return actual is not None and actual != ''
    if op == 'ZERO':
        return get_pointer(state, expression['path']) == 0
    if op == 'BOOLEAN_TRUE':
        return get_pointer(state, expression['path']) is True
    if op == 'SET_CONTAINS_ALL':
        actual = get_pointer(state, expression['actualPath'])
        required = get_pointer(state, expression['requiredPath'])
        return isinstance(actual, list) and isinstance(required, list) and all(any(canonical(candidate) == canonical(item) for candidate in actual) for item in required)
    if op == 'PATH_REPO_RELATIVE':
        actual = get_pointer(state, expression['path'])
        if not isinstance(actual, str) or not actual.startswith('docs/') or actual.startswith(('web/', '/')) or '..' in actual:
            return False
        candidate = pathlib.Path(actual)
        return candidate.is_file() and not candidate.is_symlink()
    if op == 'TYPE_VALID':
        return is_typed_value(get_pointer(state, expression['valuePath']), get_pointer(state, expression['typePath']))
    return False


def reduce_cas_schedule(state):
    schedule = state.get('schedule')
    allowed_ops = {'COMPARE', 'RESERVE', 'BLOCK', 'CRASH-PRECOMMIT', 'COMMIT'}
    if not isinstance(schedule, list) or len(schedule) < 2:
        return False
    if not all(isinstance(event, dict) and event.get('ordinal') == index + 1 and event.get('actor') in {'W1', 'W2'} and event.get('op') in allowed_ops for index, event in enumerate(schedule)):
        return False
    if len({event['actor'] for event in schedule}) != 2:
        return False
    commits = [event for event in schedule if event['op'] == 'COMMIT']
    if len(commits) != 1:
        return False
    loser = 'W2' if commits[0]['actor'] == 'W1' else 'W1'
    loser_events = [event for event in schedule if event['actor'] == loser]
    if not any(event['op'] in {'BLOCK', 'CRASH-PRECOMMIT'} for event in loser_events) or any(event['op'] == 'COMMIT' for event in loser_events):
        return False
    terminal_index = next((index for index, event in enumerate(schedule) if event['actor'] == loser and event['op'] in {'BLOCK', 'CRASH-PRECOMMIT'}), -1)
    return terminal_index >= 0 and not any(event['actor'] == loser and event['op'] in {'RESERVE', 'COMMIT'} for event in schedule[terminal_index + 1:])


def classify_response_loss(state):
    if state.get('retryEffectRequested') is True:
        return 'BLOCK'
    if state.get('independentReadbacksAgree') is not True:
        return 'CONFLICT'
    if state.get('reservationPresent') is False and state.get('finalizationPresent') is False and state.get('outboxPresent') is False:
        return 'NO-RESERVATION'
    if state.get('reservationPresent') is True and state.get('finalizationPresent') is False and state.get('outboxPresent') is False:
        return 'RESERVED-NOT-COMMITTED'
    if state.get('reservationPresent') is True and state.get('finalizationPresent') is True and state.get('pointerMatches') is True and state.get('outboxPresent') is True and state.get('receiptConfirmed') is False:
        return 'COMMITTED-UNCONFIRMED'
    if state.get('reservationPresent') is True and state.get('finalizationPresent') is True and state.get('pointerMatches') is True and state.get('outboxPresent') is True and state.get('receiptConfirmed') is True:
        return 'COMMITTED-CONFIRMED'
    return 'CONFLICT'


def evaluate_program(program, state):
    op = program['oracleBody']['op']
    if op == 'ASSERT_TYPED_AXIS':
        return evaluate_axis(get_pointer(state, program['oracleBody']['path']))
    if op == 'EXACT_UTF8_FIELD':
        source = base64.b64decode(state['sourceValueBase64'], validate=True)
        candidate = base64.b64decode(state['candidateValueBase64'], validate=True)
        return source == candidate and digest(candidate) == state['sourceSha256']
    if op == 'EVAL_CONSTRAINT_AST':
        return evaluate_constraint(program['oracleBody']['expression'], state)
    if op == 'FILE_SPAN_SHA256':
        if not evaluate_constraint({'op': 'PATH_REPO_RELATIVE', 'path': '/logicalPath'}, state):
            return False
        artifact = raw(state['logicalPath'])
        if digest(artifact) != state['artifactSha256'] or state['startByteInclusive'] < 0 or state['endByteExclusive'] > len(artifact) or state['startByteInclusive'] >= state['endByteExclusive']:
            return False
        selected = artifact[state['startByteInclusive']:state['endByteExclusive']]
        return len(selected) == state['byteLength'] and digest(selected) == state['memberSha256']
    if op == 'EXACT_SELECTOR_IN_FIELD':
        if not evaluate_program({'oracleBody': {'op': 'FILE_SPAN_SHA256'}}, state['sourceField']):
            return False
        source = state['sourceField']
        artifact = raw(source['logicalPath'])
        field_bytes = artifact[source['startByteInclusive']:source['endByteExclusive']]
        selector = state['selector']
        if selector['startByteWithinField'] < 0 or selector['endByteWithinField'] > len(field_bytes) or selector['startByteWithinField'] >= selector['endByteWithinField']:
            return False
        selected = field_bytes[selector['startByteWithinField']:selector['endByteWithinField']]
        return len(selected) == selector['byteLength'] and digest(selected) == selector['exactOldAtomSha256'] and selected == base64.b64decode(selector['exactOldAtomUtf8Base64'], validate=True)
    if op == 'SEMANTIC_EXTRACTION_EQ':
        value = base64.b64decode(state['exactValueUtf8Base64'], validate=True).decode('utf-8')
        tokens = semantic_tokens(value)
        coverage = semantic_coverage(value, tokens, state['atomId'])
        projection = {'tokens': tokens, 'coverageSegments': coverage['segments'], 'namedUses': coverage['namedUses'], 'coveredByteLength': coverage['coveredByteLength'], 'exactCoverage': coverage['exactCoverage']}
        return canonical(projection) == canonical(state['extractionProjection'])
    if op == 'PACKAGE_ROOT_EQ':
        projection = []
        for member in state['members']:
            encoded_path = member.get('legacyFrozenLogicalPathUtf8Base64')
            if not isinstance(encoded_path, str):
                return False
            try:
                path_bytes = base64.b64decode(encoded_path, validate=True)
                logical_path = path_bytes.decode('utf-8')
            except (binascii.Error, ValueError, UnicodeDecodeError):
                return False
            if base64.b64encode(path_bytes).decode('ascii') != encoded_path:
                return False
            projection.append({'ordinal': member['ordinal'], 'logicalPath': logical_path, 'sha256': member['sha256'], 'bytes': member['bytes'], 'required': member['required']})
        preimage = (state['domain'] + '\n' + canonical(projection)).encode('utf-8')
        return base64.b64encode(preimage).decode('ascii') == state['preimageBase64'] and digest(preimage) == state['expectedRoot']
    if op == 'CAS_SCHEDULE_REDUCE':
        return reduce_cas_schedule(state)
    if op == 'RESPONSE_LOSS_CLASSIFY':
        return classify_response_loss(state) == program['oracleBody']['requiredClass']
    if op == 'TYPED_FIELD_VALID':
        return is_typed_field(state['value'], state['field'])
    return False


def semantic_tokens(value):
    pattern = re.compile(r'\b[A-Za-z][A-Za-z0-9]*=|\bB0[A-Z0-9-]{3,}\b|\b[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]+)+\b|\b[A-Z][A-Z0-9_-]{2,}\b')
    tokens = []
    for match in pattern.finditer(value):
        raw_value = match.group(0)
        token = raw_value
        if raw_value.endswith('='):
            token_class, token = 'RELATION', raw_value[:-1]
        elif re.fullmatch(r'B0[A-Z0-9-]{3,}', raw_value):
            token_class = 'ARTIFACT-ID'
        elif re.fullmatch(r'[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]+)+', raw_value):
            token_class = 'TYPE'
        else:
            token_class = 'ENUM'
        tokens.append({'tokenClass': token_class, 'token': token, 'rawUtf8Base64': base64.b64encode(raw_value.encode('utf-8')).decode('ascii'), 'startByteInclusive': len(value[:match.start()].encode('utf-8')), 'endByteExclusive': len(value[:match.end()].encode('utf-8'))})
    return tokens


def semantic_coverage(value, tokens, atom_id):
    value_bytes = value.encode('utf-8')
    segments = []
    cursor = 0
    for index, token in enumerate(tokens):
        if cursor < token['startByteInclusive']:
            literal = value_bytes[cursor:token['startByteInclusive']]
            segments.append({'segmentClass': 'LITERAL-TEXT', 'startByteInclusive': cursor, 'endByteExclusive': token['startByteInclusive'], 'utf8Base64': base64.b64encode(literal).decode('ascii'), 'sha256': digest(literal)})
        semantic = value_bytes[token['startByteInclusive']:token['endByteExclusive']]
        segments.append({'segmentClass': 'MACHINE-SEMANTIC', 'tokenOrdinal': index + 1, 'tokenClass': token['tokenClass'], 'token': token['token'], 'startByteInclusive': token['startByteInclusive'], 'endByteExclusive': token['endByteExclusive'], 'utf8Base64': base64.b64encode(semantic).decode('ascii'), 'sha256': digest(semantic)})
        cursor = token['endByteExclusive']
    if cursor < len(value_bytes):
        literal = value_bytes[cursor:]
        segments.append({'segmentClass': 'LITERAL-TEXT', 'startByteInclusive': cursor, 'endByteExclusive': len(value_bytes), 'utf8Base64': base64.b64encode(literal).decode('ascii'), 'sha256': digest(literal)})
    rebuilt = b''.join(base64.b64decode(segment['utf8Base64'], validate=True) for segment in segments)
    named_uses = []
    for index, token in enumerate(tokens):
        edge_class = 'RELATION-NAMES-VALUE' if token['tokenClass'] == 'RELATION' else 'NAMES-ARTIFACT' if token['tokenClass'] == 'ARTIFACT-ID' else 'NAMES-TYPE' if token['tokenClass'] == 'TYPE' else 'NAMES-ENUM'
        named_uses.append({'namedUseId': deterministic_id('B0V6-NAMED-USE', 'CONNECT-B0-V6-NAMED-USE-ID-V1', {'atomId': atom_id, 'index': index, 'tokenClass': token['tokenClass'], 'token': token['token'], 'start': token['startByteInclusive'], 'end': token['endByteExclusive']}), 'atomId': atom_id, 'tokenOrdinal': index + 1, 'edgeClass': edge_class, 'sourceNode': f'Atom:{atom_id}', 'targetNode': f"{token['tokenClass']}:{token['token']}", 'sourceSpan': {'startByteInclusive': token['startByteInclusive'], 'endByteExclusive': token['endByteExclusive']}})
    return {'segments': segments, 'namedUses': named_uses, 'coveredByteLength': len(rebuilt), 'exactCoverage': rebuilt == value_bytes}


def selector_reduction_projection(field_bytes, occurrences, order):
    by_id = {item['occurrenceId']: item for item in occurrences}
    selected = [by_id[item_id] for item_id in order]
    intervals = sorted(([item['startByteWithinField'], item['endByteWithinField']] for item in selected), key=lambda item: (item[0], -item[1]))
    merged = []
    for interval in intervals:
        if not merged or interval[0] > merged[-1][1]:
            merged.append(list(interval))
        else:
            merged[-1][1] = max(merged[-1][1], interval[1])
    segments = []
    cursor = 0
    for start, end in merged:
        if cursor < start:
            segment = field_bytes[cursor:start]
            segments.append({'startByteWithinField': cursor, 'endByteWithinField': start, 'utf8Base64': base64.b64encode(segment).decode('ascii'), 'sha256': digest(segment)})
        cursor = max(cursor, end)
    if cursor < len(field_bytes):
        segment = field_bytes[cursor:]
        segments.append({'startByteWithinField': cursor, 'endByteWithinField': len(field_bytes), 'utf8Base64': base64.b64encode(segment).decode('ascii'), 'sha256': digest(segment)})
    return {'activeRemainderSegments': segments, 'replacementIds': sorted({item['replacementId'] for item in selected}), 'consumedOccurrenceIds': sorted(item['occurrenceId'] for item in selected)}


manifest = load(PATHS['manifest'])
registry = load(PATHS['registry'])
source_index = load(PATHS['source_index'])
crosswalk = load(PATHS['crosswalk'])
vector_index = load(PATHS['vectors'])
vector_shards = [load(logical_path) for logical_path in PATHS['vector_shards']]
vectors = dict(vector_index)
vectors['fixtures'] = [fixture for shard in vector_shards for fixture in shard['fixtures']]
vectors['vectors'] = [vector for shard in vector_shards for vector in shard['vectors']]
vectors['domainMutationCoverageMatrix'] = [row for shard in vector_shards for row in shard['domainMutationCoverageMatrix']]
subject = raw(PATHS['subject'])

locator_problems = public_locator_violations([registry, source_index, crosswalk, vector_index, *vector_shards, manifest])
check(len(locator_problems) == 0, 'ALL-STRUCTURED-PUBLIC-LOCATORS-REPO-RELATIVE', canonical(locator_problems))
check(manifest['memberCount'] == PACKAGE_MEMBER_COUNT and len(manifest['members']) == PACKAGE_MEMBER_COUNT, 'MANIFEST-MEMBER-DENOMINATOR')
check(all(member['ordinal'] == index + 1 and member['required'] is True for index, member in enumerate(manifest['members'])), 'MANIFEST-ORDINALS')
check(len({member['logicalPath'] for member in manifest['members']}) == PACKAGE_MEMBER_COUNT, 'MANIFEST-PATH-UNIQUE')
expected_package_paths = [PATHS['registry'], PATHS['subject'], PATHS['source_index'], PATHS['crosswalk'], PATHS['vectors'], *PATHS['vector_shards'], PATHS['generator'], PATHS['reader_a'], PATHS['reader_b']]
check(sorted(member['logicalPath'] for member in manifest['members']) == sorted(expected_package_paths), 'MANIFEST-EXACT-PACKAGE-MEMBER-SET')
for member in manifest['members']:
    logical_path = member['logicalPath']
    check(logical_path.startswith('docs/') and not logical_path.startswith('web/') and not logical_path.startswith('/') and '..' not in logical_path, 'MANIFEST-REPO-RELATIVE-PATH', logical_path)
    actual = raw(logical_path)
    check(len(actual) == member['bytes'] and digest(actual) == member['sha256'], 'MANIFEST-MEMBER-BYTES', logical_path)
    member_path = pathlib.Path(logical_path)
    check(member_path.is_file() and not member_path.is_symlink(), 'MANIFEST-MEMBER-REGULAR-NONSYMLINK', logical_path)
    check(len(actual) < MAX_PUBLIC_GIT_FILE_BYTES, 'PUBLIC-GIT-MEMBER-BELOW-50-MIB', f'{logical_path}:{len(actual)}')
projection = [{key: member[key] for key in ('ordinal', 'logicalPath', 'sha256', 'bytes', 'required')} for member in manifest['members']]
preimage = (manifest['packageContentRootAlgorithm']['domainUtf8'] + '\n' + canonical(projection)).encode('utf-8')
check(base64.b64decode(manifest['packageRootPreimageBase64'], validate=True) == preimage, 'MANIFEST-PREIMAGE')
check(digest(preimage) == manifest['packageContentRoot'], 'MANIFEST-PACKAGE-ROOT')

registry_base = {key: value for key, value in registry.items() if key != 'registryContentRoot'}
check(domain_root('CONNECT-B0-V6-NORMATIVE-REGISTRY-CONTENT-V1', registry_base) == registry['registryContentRoot'], 'REGISTRY-CONTENT-ROOT')
controls = registry['blockerClosureControls']
check(registry['blockerDenominator']['activeBlockerCount'] == 31 and len(controls) == 31, 'BLOCKER-DENOMINATOR')
check(len({item['findingId'] for item in controls}) == 31 and len({item['noMergeKey'] for item in controls}) == 31, 'BLOCKER-NO-MERGE-IDENTITY')
check(registry['preservedClosedFinding']['findingId'] == 'B0V4-HR-F012' and registry['preservedClosedFinding']['additionalClosureCredit'] == 0, 'PRESERVED-CLOSED-F012')
check(all(len(control['axes']) == 5 and all(evaluate_axis(axis) for axis in control['axes']) for control in controls), 'CONTROL-AXES-EXECUTE')
selector_reducer = registry['inheritedSelectorReducer']
check(selector_reducer['selectorOccurrenceCount'] == 128 and selector_reducer['selectorBearingFieldCount'] == 119 and selector_reducer['inheritedOverlapPairCount'] == 10 and all(row['confluenceDecision'] is True and len({item['projectionRoot'] for item in row['orderResults']}) == 1 for row in selector_reducer['fieldReductions']), 'INHERITED-SELECTOR-CONFLUENCE')
selector_occurrence_by_id = {item['occurrenceId']: item for item in selector_reducer['selectorOccurrences']}
for reduction in selector_reducer['fieldReductions']:
    field_bytes = base64.b64decode(reduction['exactFieldUtf8Base64'], validate=True)
    source = reduction['sourceField']
    source_bytes = raw(source['logicalPath'])[source['startByteInclusive']:source['endByteExclusive']]
    operations = reduction['reducerProgram']['operations']
    check(field_bytes == source_bytes and digest(field_bytes) == reduction['exactFieldSha256'] and len(operations) == 6 and all(operation['ordinal'] == index + 1 and isinstance(operation['op'], str) for index, operation in enumerate(operations)), 'SELECTOR-REDUCER-EXACT-TYPED-PROGRAM', reduction['fieldLocator'])
    occurrences = [selector_occurrence_by_id[item_id] for item_id in reduction['selectorOccurrenceIds']]
    derived = selector_reduction_projection(field_bytes, occurrences, sorted(reduction['selectorOccurrenceIds']))
    check(canonical(derived) == canonical(reduction['canonicalProjection']), 'SELECTOR-REDUCER-CANONICAL-PROJECTION', reduction['fieldLocator'])
    for order_result in reduction['orderResults']:
        derived_order = selector_reduction_projection(field_bytes, occurrences, order_result['order'])
        check(domain_root('CONNECT-B0-V6-INHERITED-SELECTOR-REDUCTION-PROJECTION-V1', derived_order) == order_result['projectionRoot'], 'SELECTOR-REDUCER-ALL-ORDERS', reduction['fieldLocator'])
nonweakening = registry['predecessorSemanticNonWeakening']
check(nonweakening['rowCount'] == 10 and all(row['nonWeakeningDecision'] is True and set(row['beforeState']['mandatorySafetyIntents']).issubset(set(row['afterState']['mandatorySafetyIntents'])) and row['beforeState']['prefixSha256'] == row['afterState']['retainedPrefixSha256'] and row['beforeState']['suffixSha256'] == row['afterState']['retainedSuffixSha256'] for row in nonweakening['rows']), 'PREDECESSOR-SEMANTIC-NONWEAKENING')
for row in nonweakening['rows']:
    artifact = raw(row['sourceMember']['logicalPath'])
    member = artifact[row['sourceMember']['startByteInclusive']:row['sourceMember']['endByteExclusive']]
    selector = row['atomSelector']
    atom = member[selector['startByteWithinMember']:selector['endByteWithinMember']]
    operations = row['reducerProgram']['operations']
    check(digest(artifact) == row['sourceMember']['artifactSha256'] and digest(member) == row['sourceMember']['memberSha256'] and digest(atom) == selector['exactOldAtomSha256'] and atom == base64.b64decode(selector['exactOldAtomUtf8Base64'], validate=True) and digest(member[:selector['startByteWithinMember']]) == row['beforeState']['prefixSha256'] and digest(member[selector['endByteWithinMember']:]) == row['beforeState']['suffixSha256'] and len(operations) == 6 and all(operation['ordinal'] == index + 1 and isinstance(operation['op'], str) for index, operation in enumerate(operations)), 'NONWEAKENING-EXACT-TYPED-REDUCER', row['rowId'])

supersessions = registry['typedSupersessionEngine']['rows']
check(len(supersessions) == 31 and registry['typedSupersessionEngine']['overlapCount'] == 0, 'SUPERSESSION-DENOMINATOR')
overlap = 0
for left_index, left in enumerate(supersessions):
    for right in supersessions[left_index + 1:]:
        a, b = left['sourceFinding'], right['sourceFinding']
        if a['artifactSha256'] == b['artifactSha256'] and max(a['startByteInclusive'], b['startByteInclusive']) < min(a['endByteExclusive'], b['endByteExclusive']):
            overlap += 1
check(overlap == 0, 'SUPERSESSION-NO-OVERLAP')
check(all(set(row['beforeState']['mandatorySafetyIntents']).issubset(set(row['afterState']['mandatorySafetyIntents'])) for row in supersessions), 'SUPERSESSION-NONWEAKENING')

roles = registry['roleAndAppointmentAuthority']
check(roles['roleCount'] == 21 and len(roles['roles']) == 21 and roles['pairCount'] == 210 and len(roles['pairMatrix']) == 210, 'ROLE-PAIR-DENOMINATOR')
check(len({item['effectiveControllerRoot'] for item in roles['planningAdmittedAppointments']}) == 21, 'APPOINTMENT-CONTROLLER-DISTINCT')
check(all(role in roles['roles'] for role in ('AuthorityOwner', 'AcceptanceWriter', 'Witness1', 'Witness2', 'WitnessQuorum', 'EvidenceLedgerWriter')), 'SOLE-PRODUCER-ROLE-CLOSURE')
producer_registry = registry['acceptanceSoleProducerRegistry']
check(producer_registry['assignmentCount'] == 156 and producer_registry['acceptanceProducerRoleCount'] == 12 and all(item['assignmentCardinality'] == 1 and item['soleProducer'] is True and item['producerAppointmentRoot'] for item in producer_registry['assignments']), 'ACCEPTANCE-SOLE-PRODUCER-ASSIGNMENTS')
acceptance_field_by_id = {field['fieldId']: field for field in registry['acceptanceEnvelopeSchema']['fields']}
check(len({item['fieldId'] for item in producer_registry['assignments']}) == 156 and all(acceptance_field_by_id[item['fieldId']]['producerRole'] == item['producerRole'] for item in producer_registry['assignments']) and sorted({field['producerRole'] for field in registry['acceptanceEnvelopeSchema']['fields']}) == sorted(producer_registry['acceptanceProducerRoles']), 'SOLE-PRODUCER-COMPLETE-SET-EQUALITY')
profiles = registry['independenceProfileRegistry']['planningAdmittedProfiles']
check(len(profiles) == 9 and all(item['planningAdmittedInstanceRoot'] and item['operationalCurrentInstanceRoot'] is None for item in profiles), 'INDEPENDENCE-PROFILES')
check(all(item['implementationRootA'] != item['implementationRootB'] and item['transitiveDependencyRootA'] != item['transitiveDependencyRootB'] and item['runtimeRootA'] != item['runtimeRootB'] and item['authorControllerRootA'] != item['authorControllerRootB'] and item['executionContextRootA'] != item['executionContextRootB'] and item['resultRootA'] != item['resultRootB'] and item['resultDisclosedBeforeBothSubmissions'] is False and item['operational'] is False for item in profiles), 'INDEPENDENCE-PROFILE-FULL-PAIR-SEPARATION')
witnesses = registry['witnessAndProofIndependence']
check(len(witnesses['planningAdmittedAcknowledgements']) == 2 and len({item['effectiveControllerRoot'] for item in witnesses['planningAdmittedAcknowledgements']}) == 2 and len({item['checkpointRoot'] for item in witnesses['planningAdmittedAcknowledgements']}) == 1 and witnesses['twoWitnessIndependenceProgram']['programRoot'], 'TWO-WITNESS-ADMITTED-INDEPENDENCE')

interfaces = registry['priorInterfaceRegistry']['interfaces']
check(len(interfaces) == 17 and all(item['interfaceSchemaRoot'] and item['planningAdmittedInstance']['instanceRoot'] and item['planningAdmittedInstance']['validationReceiptRoot'] and item['planningAdmittedInstance']['actualInputRoot'] == item['planningAdmittedInstance']['expectedInputRoot'] and item['planningAdmittedInstance']['actualOutputRoot'] == item['planningAdmittedInstance']['expectedOutputRoot'] and item['planningAdmittedInstance']['providerInstanceRoot'] is None and item['planningAdmittedInstance']['availableAtOrdinal'] < item['planningAdmittedInstance']['providerConstructionOrdinal'] and item['operationalCurrentInstanceRoot'] is None for item in interfaces), 'PRIOR-INTERFACE-INSTANCES')
permits = registry['permitAndTemporalAuthority']['permitSchemas']
check(len(permits) == 3 and all(all(field.get('name') and field.get('type') and field.get('cardinality') for field in schema['fields']) and schema['planningAdmittedInstance']['instanceRoot'] and schema['operationalCurrentInstanceRoot'] is None for schema in permits) and len(registry['permitAndTemporalAuthority']['permitLifecycleProgram']['transitions']) == 8 and len(registry['permitAndTemporalAuthority']['permitRuleMutationMatrix']) == 10, 'TYPED-PERMIT-SCHEMAS')
genesis = registry['genesisFoundation']
check(genesis['memberCount'] == 33 and len({item['schemaRoot'] for item in genesis['classSpecificSchemas']}) == 33 and all(item['classSpecificFieldCount'] >= 3 and item['planningAdmittedInstance']['instanceRoot'] and item['planningAdmissionReceipt']['receiptRoot'] and item['operationalCurrentInstanceRoot'] is None for item in genesis['classSpecificSchemas']), 'GENESIS-CLASS-SPECIFIC-INSTANCES')
check(len(genesis['authorityGraph']['nodes']) == 35 and len(genesis['planningExternalAdmission']['foundationMemberRoots']) == 33 and len(genesis['firstGenesisPermitTransitionProgram']['operations']) == 6 and len(genesis['firstGenesisPermitTransitionProgram']['forbiddenWrites']) == 6 and genesis['externalOperationalAdmissionRoot'] is None and genesis['firstOperationalGenesisPermitRoot'] is None, 'GENESIS-AUTHORITY-GRAPH')
check(is_acyclic(genesis['authorityGraph']['nodes'], genesis['authorityGraph']['edges']) and all(edge['source'] != edge['target'] for edge in genesis['authorityGraph']['edges']), 'GENESIS-AUTHORITY-DAG-ACYCLIC')
recovery = registry['recoveryQuorum']
participants = recovery['memberSchemas'] + recovery['witnessSchemas']
check(recovery['threshold'] == 3 and len(recovery['memberSchemas']) == 5 and len(recovery['witnessSchemas']) == 2 and len({item['planningAdmittedInstance']['effectiveControllerRoot'] for item in participants}) == 7 and len(recovery['planningAdmittedAttempt']['memberAcknowledgementRoots']) == 3 and len(recovery['planningAdmittedAttempt']['witnessAcknowledgementRoots']) == 2 and len(recovery['lifecycleProgram']['transitions']) == 7, 'RECOVERY-TYPED-DISTINCT')
check(all(transition['ordinal'] == index + 1 and isinstance(transition.get('precondition'), dict) and all(isinstance(write, dict) and isinstance(write.get('op'), str) for write in transition.get('writes', [])) for index, transition in enumerate(recovery['lifecycleProgram']['transitions'])), 'RECOVERY-EXECUTABLE-NONLABEL-TRANSITIONS')
detached = registry['detachedAcceptanceSchema']
check(detached['schemaRoot'] and detached['planningAdmittedInstanceRoot'] and detached['planningAdmittedInstance']['instanceRoot'] == detached['planningAdmittedInstanceRoot'] and detached['planningValidationReceipt']['receiptRoot'] and detached['operationalCurrentInstanceRoot'] is None, 'DETACHED-ACCEPTANCE-SCHEMA')

heads = registry['mutableHeadRegistry']
check(heads['objectClassCount'] == 94 and heads['headCount'] == 36, 'HEAD-DENOMINATOR')
check(all(len(row['membershipPath']) == 2 and row['membershipPath'][0]['targetNode'] == row['membershipPath'][1]['sourceNode'] and all(edge['sourceNode'] != edge['targetNode'] for edge in row['membershipPath']) and row['membershipPath'][1]['targetNode'] == 'Head:SecurityUniverseHead' for row in heads['objectToHead']), 'HEAD-PATHS-ACYCLIC')
cas = registry['acceptanceCas']
check(len(cas['transactionProgram']['operations']) == 15 and len(cas['crashMatrix']) == 16 and len(cas['twoWriterInterleavingClasses']) == 6 and len(cas['mutationMatrix']) == 13 and cas['responseLossRecoveryProgram']['programRoot'] and bool(cas['transactionProgram']['programRoot']), 'CAS-PROGRAM-CRASH-MATRIX')
check(all(operation['ordinal'] == index + 1 and operation['typed'] is True and isinstance(operation['op'], str) for index, operation in enumerate(cas['transactionProgram']['operations'])) and isinstance(cas['transactionProgram']['stateTransitionSemantics'], dict) and isinstance(cas['transactionProgram']['crashSemantics'], dict) and 'predicates' not in cas['transactionProgram']['operations'][8], 'CAS-TYPED-NONLABEL-AST')
check(all(isinstance(row['schedule'], list) and all(isinstance(event, dict) for event in row['schedule']) and reduce_cas_schedule({'schedule': row['schedule']}) and row['scheduleRoot'] for row in cas['twoWriterInterleavingClasses']) and len(cas['responseLossRecoveryProgram']['operations'][3]['orderedRules']) == 6 and all(isinstance(rule, dict) for rule in cas['responseLossRecoveryProgram']['operations'][3]['orderedRules']) and all('predicateSatisfied' not in row['domainState'] for row in cas['mutationMatrix']), 'CAS-EXECUTABLE-SCHEDULE-READBACK')
acceptance = registry['acceptanceEnvelopeSchema']
check(acceptance['fieldCount'] == 156 and acceptance['completeOutputDenominator']['outputCount'] == 127 and len(registry['outputRegistry']) == 127, 'ACCEPTANCE-OUTPUT-DENOMINATOR')
check(all(domain_root('CONNECT-B0-V6-PLANNING-OUTPUT-ARTIFACT-V1', row['planningArtifact']) == row['planningArtifactRoot'] and domain_root('CONNECT-B0-V6-PLANNING-OUTPUT-VALIDATION-RECEIPT-V1', row['planningValidationReceipt']) == row['planningValidationReceiptRoot'] and row['operationalImplementationRoot'] is None and row['implementationRoot'] is None and row['authorityCredit'] == 0 and row['acceptanceCredit'] == 0 for row in registry['outputRegistry']), 'ALL-127-PLANNING-OUTPUTS-MATERIALIZED-OPERATIONAL-ZERO')
check(acceptance['completeOutputDenominator']['mutationMatrixCount'] == 508 and acceptance['headInvalidationMatrixCount'] == 36 and sum(len(row['dependentFieldIds']) for row in acceptance['headInvalidationMatrix']) == 156, 'ACCEPTANCE-FULL-MUTATION-DENOMINATORS')
check(any(field['name'] == 'all127OutputsRoot' for field in acceptance['fields']) and not any(field['name'] == 'all84OutputsRoot' for field in acceptance['fields']), 'ACCEPTANCE-ALL127-FIELD')
check('B0V4-HEAD' not in json.dumps(acceptance['fields'], ensure_ascii=False), 'ACCEPTANCE-V6-HEAD-INVALIDATION')
current = registry['currentAuthorityState']
check(current['B0'] == 'ABSENT' and current['Gate29'] == 'BLOCKED' and current['developmentFreeze'] == 'ACTIVE', 'ZERO-AUTHORITY-STATE')

subject_text = subject.decode('utf-8')
check(len(re.findall(r'^## \d+\.\d+ `B0V6REQ-\d{3}`', subject_text, re.MULTILINE)) == 127, 'SUBJECT-REQUIREMENT-COUNT')
check(len(re.findall(r'^\d+\.\d+\.\d+ `(statement|threatCauseImpact|requiredProof|dependencies|sourceBasis)`: ', subject_text, re.MULTILINE)) == 635, 'SUBJECT-FIELD-COUNT')

index_base = {key: value for key, value in source_index.items() if key != 'indexContentRoot'}
check(domain_root('CONNECT-B0-V6-SOURCE-INDEX-CONTENT-V1', index_base) == source_index['indexContentRoot'], 'SOURCE-INDEX-CONTENT-ROOT')
check(source_index['absolutePathCount'] == 0 and source_index['extraRepositoryPrefixCount'] == 0 and source_index['collapsedSpanCount'] == 0, 'SOURCE-INDEX-PATH-SPAN-POLICY')
indexed_members = 0
for artifact in source_index['artifacts']:
    logical_path = artifact['logicalPath']
    check(logical_path.startswith('docs/') and not logical_path.startswith('web/') and '..' not in logical_path, 'SOURCE-ARTIFACT-PATH', logical_path)
    artifact_bytes = raw(logical_path)
    check(len(artifact_bytes) == artifact['bytes'] and digest(artifact_bytes) == artifact['sha256'], 'SOURCE-ARTIFACT-BYTES', artifact['alias'])
    check(artifact['memberCount'] == len(artifact['members']), 'SOURCE-MEMBER-DECLARED-COUNT', artifact['alias'])
    for member in artifact['members']:
        indexed_members += 1
        selected = artifact_bytes[member['startByteInclusive']:member['endByteExclusive']]
        check(len(selected) == member['byteLength'] and digest(selected) == member['sha256'] and member['byteLength'] > 1, 'SOURCE-MEMBER-SPAN', f"{artifact['alias']}::{member['locator']}")
check(indexed_members == source_index['memberCount'], 'SOURCE-MEMBER-TOTAL')

crosswalk_base = {key: value for key, value in crosswalk.items() if key != 'crosswalkContentRoot'}
check(domain_root('CONNECT-B0-V6-CROSSWALK-CONTENT-V1', crosswalk_base) == crosswalk['crosswalkContentRoot'], 'CROSSWALK-CONTENT-ROOT')
check(crosswalk['activeBlockerDenominator'] == 31 and len(crosswalk['blockerClosureRows']) == 31, 'CROSSWALK-BLOCKERS')
check(crosswalk['inheritedV5RequirementCount'] == 96 and crosswalk['inheritedV5FieldCount'] == 480 and crosswalk['authoritativeInheritedByteAtomCount'] == 900, 'CROSSWALK-INHERITANCE-DENOMINATORS')
artifact_by_alias = {artifact['alias']: artifact for artifact in source_index['artifacts']}
for row in crosswalk['inheritedV5Requirements']:
    for field in row['fields']:
        source = field['sourceField']
        artifact = artifact_by_alias[source['alias']]
        artifact_bytes = raw(artifact['logicalPath'])
        selected = artifact_bytes[source['startByteInclusive']:source['endByteExclusive']]
        check(selected == field['exactOldValue'].encode('utf-8') and base64.b64decode(field['exactOldValueUtf8Base64'], validate=True) == selected and digest(selected) == field['exactOldValueSha256'], 'INHERITED-V5-EXACT-FIELD', source['locator'])
check(crosswalk['semanticExtractionRecordCount'] == 900 and crosswalk['unclassifiedSemanticTokenCount'] == 0, 'SEMANTIC-EXTRACTION-DENOMINATOR')
for atom, extraction in zip(crosswalk['authoritativeInheritedByteAtoms'], crosswalk['semanticExtraction']):
    source = atom['sourceField']
    source_artifact = artifact_by_alias[source['alias']]
    source_artifact_bytes = raw(source_artifact['logicalPath'])
    exact_source_bytes = source_artifact_bytes[source['startByteInclusive']:source['endByteExclusive']]
    check(source['logicalPath'] == source_artifact['logicalPath'] and digest(source_artifact_bytes) == source['artifactSha256'] and exact_source_bytes == atom['exactValue'].encode('utf-8') and len(exact_source_bytes) == source['byteLength'] and digest(exact_source_bytes) == atom['exactValueSha256'] and atom['exactValueSha256'] == source['memberSha256'], 'ALL-900-INHERITED-ATOMS-EXACT-SOURCE-BYTES', atom['atomId'])
    tokens = semantic_tokens(atom['exactValue'])
    coverage = semantic_coverage(atom['exactValue'], tokens, atom['atomId'])
    check(extraction['atomId'] == atom['atomId'] and canonical(tokens) == canonical(extraction['tokens']) and canonical(coverage['segments']) == canonical(extraction['coverageSegments']) and canonical(coverage['namedUses']) == canonical(extraction['namedUses']) and coverage['exactCoverage'] is True and extraction['exactCoverage'] is True and domain_root('CONNECT-B0-V6-SEMANTIC-TOKEN-STREAM-V1', tokens) == extraction['tokenStreamRoot'] and len(extraction['unclassifiedTokens']) == 0, 'SEMANTIC-TOKEN-STREAM', atom['atomId'])
semantic_graph = crosswalk['activeSemanticGraph']
check(semantic_graph['authoritativeAtomCount'] == 900 and semantic_graph['extractionRecordCount'] == 900 and semantic_graph['namedUseCount'] == crosswalk['activeNamedUseCount'] and len({item['namedUseId'] for item in semantic_graph['namedUses']}) == crosswalk['activeNamedUseCount'] and semantic_graph['duplicateNamedUseCount'] == 0 and semantic_graph['unclassifiedMachineTokenCount'] == 0, 'ACTIVE-SEMANTIC-NAMEDUSE-GRAPH')

vector_index_base = {key: value for key, value in vector_index.items() if key != 'vectorCorpusContentRoot'}
check(domain_root('CONNECT-B0-V6-VECTOR-CORPUS-CONTENT-V1', vector_index_base) == vector_index['vectorCorpusContentRoot'], 'VECTOR-CORPUS-CONTENT-ROOT')
check(all(key not in vector_index for key in ('fixtures', 'vectors', 'domainMutationCoverageMatrix')), 'VECTOR-INDEX-CONTAINS-DESCRIPTORS-NOT-BULK-ARRAYS')
descriptors = vector_index['vectorShardDescriptors']
check(vector_index['vectorShardCount'] == VECTOR_SHARD_COUNT and len(descriptors) == VECTOR_SHARD_COUNT and len(vector_shards) == VECTOR_SHARD_COUNT and vector_index['maximumPublicGitMemberBytesExclusive'] == MAX_PUBLIC_GIT_FILE_BYTES and vector_index['everyVectorShardBelowMaximum'] is True, 'VECTOR-SHARD-DENOMINATOR-POLICY')
check(domain_root('CONNECT-B0-V6-VECTOR-CORPUS-SHARD-SET-V1', descriptors) == vector_index['vectorShardSetRoot'] and vector_index['vectorShardSetRoot'] == manifest['portableCausalVectorCorpusShardSetRoot'] and canonical(descriptors) == canonical(manifest['portableCausalVectorCorpusShardDescriptors']), 'VECTOR-SHARD-SET-ROOT-MANIFEST-BINDING')
manifest_member_by_path = {member['logicalPath']: member for member in manifest['members']}
for index, (descriptor, shard, logical_path) in enumerate(zip(descriptors, vector_shards, PATHS['vector_shards'])):
    expected_start = (index * 7430) // VECTOR_SHARD_COUNT + 1
    expected_end = ((index + 1) * 7430) // VECTOR_SHARD_COUNT
    actual = raw(logical_path)
    shard_base = {key: value for key, value in shard.items() if key != 'shardContentRoot'}
    check(descriptor['shardOrdinal'] == index + 1 and descriptor['shardCount'] == VECTOR_SHARD_COUNT and descriptor['logicalPath'] == logical_path and descriptor['startVectorOrdinalInclusive'] == expected_start and descriptor['endVectorOrdinalInclusive'] == expected_end and descriptor['vectorCount'] == expected_end - expected_start + 1 and descriptor['fixtureCount'] == descriptor['vectorCount'], 'VECTOR-SHARD-CONTIGUOUS-RANGE', logical_path)
    check(len(actual) == descriptor['bytes'] and digest(actual) == descriptor['sha256'] and len(actual) < MAX_PUBLIC_GIT_FILE_BYTES and descriptor['bytes'] < MAX_PUBLIC_GIT_FILE_BYTES, 'VECTOR-SHARD-PUBLIC-GIT-SIZE-HASH', f'{logical_path}:{len(actual)}')
    check(domain_root('CONNECT-B0-V6-VECTOR-CORPUS-SHARD-CONTENT-V1', shard_base) == shard['shardContentRoot'] and shard['shardContentRoot'] == descriptor['shardContentRoot'], 'VECTOR-SHARD-CONTENT-ROOT', logical_path)
    check(shard['shardOrdinal'] == descriptor['shardOrdinal'] and shard['shardCount'] == descriptor['shardCount'] and shard['startVectorOrdinalInclusive'] == descriptor['startVectorOrdinalInclusive'] and shard['endVectorOrdinalInclusive'] == descriptor['endVectorOrdinalInclusive'] and shard['fixtureCount'] == len(shard['fixtures']) and shard['vectorCount'] == len(shard['vectors']) and shard['domainMutationVectorCount'] == len(shard['domainMutationCoverageMatrix']), 'VECTOR-SHARD-DESCRIPTOR-PAYLOAD-PARITY', logical_path)
    shard_vector_ids = {vector['vectorId'] for vector in shard['vectors']}
    check(all(fixture['fixtureId'] == shard['vectors'][offset]['fixtureId'] for offset, fixture in enumerate(shard['fixtures'])) and all(row['vectorId'] in shard_vector_ids for row in shard['domainMutationCoverageMatrix']), 'VECTOR-SHARD-FIXTURE-VECTOR-COVERAGE-COLOCATION', logical_path)
    manifest_member = manifest_member_by_path.get(logical_path, {})
    check(manifest_member.get('sha256') == descriptor['sha256'] and manifest_member.get('bytes') == descriptor['bytes'] and manifest_member.get('required') is True, 'VECTOR-SHARD-MANIFEST-MEMBER-BINDING', logical_path)
check(vector_index['largestVectorShardBytes'] == max(descriptor['bytes'] for descriptor in descriptors), 'VECTOR-SHARD-LARGEST-BYTE-COUNT')
fixture_projection = [{'ordinal': index + 1, 'fixtureId': fixture['fixtureId'], 'fixtureSha256': fixture['fixtureSha256'], 'byteLength': fixture['byteLength']} for index, fixture in enumerate(vectors['fixtures'])]
vector_projection = [{'ordinal': index + 1, 'vectorId': vector['vectorId'], 'fixtureId': vector['fixtureId'], 'programRoot': vector['programRoot']} for index, vector in enumerate(vectors['vectors'])]
check(domain_root('CONNECT-B0-V6-COMPLETE-FIXTURE-SEQUENCE-V1', fixture_projection) == vector_index['completeFixtureSequenceRoot'], 'VECTOR-COMPLETE-FIXTURE-SEQUENCE-ROOT')
check(domain_root('CONNECT-B0-V6-COMPLETE-VECTOR-SEQUENCE-V1', vector_projection) == vector_index['completeVectorSequenceRoot'], 'VECTOR-COMPLETE-VECTOR-SEQUENCE-ROOT')
check(domain_root('CONNECT-B0-V6-COMPLETE-DOMAIN-MUTATION-COVERAGE-MATRIX-V1', vectors['domainMutationCoverageMatrix']) == vector_index['completeDomainMutationCoverageMatrixRoot'], 'VECTOR-COMPLETE-DOMAIN-MATRIX-ROOT')
check(domain_root('CONNECT-B0-V6-REQUIRED-DOMAIN-VECTOR-FAMILY-MAP-V1', vector_index['requiredDomainVectorFamilies']) == vector_index['requiredDomainVectorFamiliesRoot'], 'VECTOR-REQUIRED-FAMILY-MAP-ROOT')
check(vectors['fixtureCount'] == 7430 and vectors['vectorCount'] == 7430 and len(vectors['fixtures']) == 7430 and len(vectors['vectors']) == 7430 and vectors['baseFiveFieldVectorCount'] == 635 and vectors['domainMutationVectorCount'] == 6795 and len(vectors['domainMutationCoverageMatrix']) == 6795 and vectors['domainMutationUniqueCreditKeyCount'] == 6795, 'VECTOR-DENOMINATOR')
domain_finding_family_keys = {(item['findingId'], item['family']) for item in vectors['domainMutationCoverageMatrix']}
check(len({item['findingId'] for item in vectors['domainMutationCoverageMatrix']}) == 31, 'DOMAIN-VECTORS-ALL-31-NO-MERGE-FINDINGS')
control_by_finding = {item['findingId']: item for item in controls}
for control in controls:
    check(len(control['requiredDomainVectorFamilies']) > 0 and all((control['findingId'], family) in domain_finding_family_keys for family in control['requiredDomainVectorFamilies']), 'CONTROL-REQUIRED-DOMAIN-FAMILIES', control['findingId'])
for row in crosswalk['blockerClosureRows']:
    control = control_by_finding[row['sourceFindingId']]
    check(canonical(row['requiredDomainVectorFamilies']) == canonical(control['requiredDomainVectorFamilies']) and all((row['sourceFindingId'], family) in domain_finding_family_keys for family in row['requiredDomainVectorFamilies']), 'CROSSWALK-NO-MERGE-DOMAIN-FAMILIES', row['sourceFindingId'])
fixture_by_id = {fixture['fixtureId']: fixture for fixture in vectors['fixtures']}
planning_pass = 0
for vector in vectors['vectors']:
    fixture = fixture_by_id[vector['fixtureId']]
    fixture_body = {key: value for key, value in fixture.items() if key not in ('fixtureBytesBase64', 'fixtureSha256', 'byteLength')}
    fixture_bytes = canonical(fixture_body).encode('utf-8')
    check(digest(fixture_bytes) == fixture['fixtureSha256'] and base64.b64encode(fixture_bytes).decode('ascii') == fixture['fixtureBytesBase64'] and len(fixture_bytes) == fixture['byteLength'], 'VECTOR-FIXTURE-ROOT', fixture['fixtureId'])
    check(domain_root('CONNECT-B0-V6-PORTABLE-VECTOR-PROGRAM-V1', vector['program']) == vector['programRoot'], 'VECTOR-PROGRAM-ROOT', vector['vectorId'])
    control = copy.deepcopy(fixture['domainState'])
    control_decision = evaluate_program(vector['program'], control)
    mutated = copy.deepcopy(control)
    for operation in vector['program']['operations']:
        check(operation['op'] == 'SET', 'VECTOR-OP-ENUM', vector['vectorId'])
        set_pointer(mutated, operation['path'], operation['value'])
    mutation_decision = evaluate_program(vector['program'], mutated)
    check(control_decision is True and mutation_decision is False and vector['operationalObserved'] is None and vector['operationalEvidenceRoot'] is None, 'VECTOR-CAUSAL-TERMINATION', vector['vectorId'])
    if control_decision and not mutation_decision:
        planning_pass += 1
check(planning_pass == 7430 and vectors['planningExecutionCount'] == '7430/7430' and vectors['operationalVectorExecutionCount'] == '0/7430', 'VECTOR-PLANNING-PASS-OPERATIONAL-ZERO')

report = {
    'artifactId': 'CONNECT-B0-V6-QA-READER-B-REPORT-2026-08-30-G0',
    'artifactClass': 'DETACHED-INDEPENDENT-STDLIB-QA-REPORT;NOT-AUTHORITY;NOT-ACCEPTANCE',
    'readerId': 'B0V6-QA-READER-B-PYTHON-STDLIB',
    'independence': 'DOES-NOT-IMPORT-OR-EXECUTE-PRODUCER-GENERATOR-OR-READER-A',
    'readerSha256': digest(raw('docs/planning/qa/b0-v6-qa-reader-b.py')),
    'packageManifestSha256': digest(raw(PATHS['manifest'])),
    'packageContentRoot': manifest['packageContentRoot'],
    'pass': len(errors) == 0,
    'errorCount': len(errors),
    'errors': errors,
    'checkInvocationCount': len(checks),
    'uniqueCheckClasses': len(set(checks)),
    'counts': {
        'blockers': 31, 'requirements': 127, 'fields': 635, 'outputs': 127,
        'sourceArtifacts': source_index['artifactCount'], 'sourceMembers': source_index['memberCount'],
        'authoritativeAtoms': 900, 'activeNamedUses': crosswalk['activeNamedUseCount'],
        'baseVectors': 635, 'domainMutationVectors': 6795, 'vectors': 7430,
        'vectorShards': VECTOR_SHARD_COUNT, 'packageMembers': PACKAGE_MEMBER_COUNT,
        'largestVectorShardBytes': vector_index['largestVectorShardBytes'],
        'planningVectorPass': planning_pass, 'operationalVectors': 0,
        'inheritedSelectors': 128, 'selectorBearingFields': 119, 'selectorOverlapPairs': 10,
        'nonWeakeningRows': 10, 'genesisSchemas': 33, 'recoveryMembers': 5,
        'recoveryWitnesses': 2, 'roles': 21, 'rolePairs': 210, 'heads': 36, 'mutableObjects': 94,
    },
    'state': {
        'authorityCredit': 0, 'acceptanceCredit': 0, 'B0': 'ABSENT', 'Gate29': 'BLOCKED',
        'developmentFreeze': 'ACTIVE', 'repositoryVisibility': 'PUBLIC', 'freshIndependentHostileReview': 'PENDING',
    },
}
print(json.dumps(report, indent=2, ensure_ascii=False))
