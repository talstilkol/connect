#!/usr/bin/env python3

import base64
import hashlib
import json
import re
import struct
import subprocess
from pathlib import Path

ROOT = Path.cwd()
DIRECTORY = "docs/planning/trd2-v6-candidate-v3-2026-08-31"
OUTPUTS = [
    f"{DIRECTORY}/subject.json",
    f"{DIRECTORY}/clause-ast-registry.json",
    f"{DIRECTORY}/state-machine-registry.json",
]
REGISTRY_PATH = f"{DIRECTORY}/closed-schema-registry-v3.json"
CONTRACT_PATH = "docs/planning/section-35-6-trd-2-v5-executable-definition-contract-2026-08-29.json"
REQ_SCHEMA = "CONNECT-TRD2-V6-REQUIREMENT-V2-SCHEMA-V2"
BIND_SCHEMA = "CONNECT-TRD2-V6-REQUIREMENT-SOURCE-BINDING-V2-SCHEMA-V2"


def fail(message):
    raise RuntimeError(message)


def canonical(value):
    if isinstance(value, float):
        fail("Engine B: floating point is forbidden")
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def root_v6(type_tag, schema_version, value):
    type_bytes = type_tag.encode("utf-8")
    schema_bytes = schema_version.encode("utf-8")
    body_bytes = canonical(value).encode("utf-8")
    payload = (
        b"CONNECT-TRD2-V6-ROOT-V1\0"
        + struct.pack(">I", len(type_bytes))
        + type_bytes
        + struct.pack(">I", len(schema_bytes))
        + schema_bytes
        + struct.pack(">Q", len(body_bytes))
        + body_bytes
    )
    return sha256_bytes(payload)


def git_blob(commit_id, logical_path):
    result = subprocess.run(
        ["git", "show", f"{commit_id}:{logical_path}"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return result.stdout


def load_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def load_json_blob(commit_id, path):
    return json.loads(git_blob(commit_id, path).decode("utf-8"))


def utf8_sorted(values):
    return sorted(values, key=lambda value: value.encode("utf-8"))


def validate_identity(value, schema):
    identity = schema["contentIdentity"]
    id_key = identity["idKey"]
    root_key = identity["rootKey"]
    body = {key: member for key, member in value.items() if key not in (id_key, root_key)}
    expected_root = root_v6(identity["typeTag"], identity["schemaVersion"], body)
    if value.get(root_key) != expected_root or value.get(id_key) != f'{identity["prefix"]}-{expected_root}':
        fail(f'Engine B: content identity mismatch for {schema["schemaId"]}')


def validate_spec(value, spec, schemas, label):
    kind = spec["kind"]
    if kind == "Object":
        if not isinstance(value, dict) or set(value) != set(spec["required"]):
            fail(f"Engine B: {label} closed object mismatch")
        for key, child in spec["properties"].items():
            validate_spec(value[key], child, schemas, f"{label}.{key}")
    elif kind == "Ref":
        validate_record(value, schemas[spec["schemaId"]], schemas, label)
    elif kind == "Array":
        if not isinstance(value, list) or not spec["minItems"] <= len(value) <= spec["maxItems"]:
            fail(f"Engine B: {label} array bounds")
        for index, child in enumerate(value):
            validate_spec(child, spec["items"], schemas, f"{label}[{index}]")
        encoded = [canonical(child) for child in value]
        if spec["unique"] and len(set(encoded)) != len(encoded):
            fail(f"Engine B: {label} array uniqueness")
        if spec["sorted"] and encoded != utf8_sorted(encoded):
            fail(f"Engine B: {label} array ordering")
    elif kind == "Const":
        if value != spec["value"]:
            fail(f"Engine B: {label} constant")
    elif kind == "Enum":
        if value not in spec["values"]:
            fail(f"Engine B: {label} enum")
    elif kind == "UIntSafe":
        if isinstance(value, bool) or not isinstance(value, int) or not spec["minimum"] <= value <= spec["maximum"]:
            fail(f"Engine B: {label} uint")
    elif kind == "Boolean":
        if not isinstance(value, bool):
            fail(f"Engine B: {label} boolean")
    elif kind == "String":
        if not isinstance(value, str) or not spec["minBytes"] <= len(value.encode("utf-8")) <= spec["maxBytes"]:
            fail(f"Engine B: {label} string")
    elif kind == "Bytes32LowerHex":
        if not isinstance(value, str) or re.fullmatch(r"[0-9a-f]{64}", value) is None:
            fail(f"Engine B: {label} sha256")
    elif kind == "CommitHex":
        if not isinstance(value, str) or re.fullmatch(r"[0-9a-f]{40}([0-9a-f]{24})?", value) is None:
            fail(f"Engine B: {label} commit")
    elif kind == "LogicalPath":
        if not isinstance(value, str) or value.startswith("/") or ".." in value.split("/"):
            fail(f"Engine B: {label} logical path")
    elif kind == "ContentId":
        if not isinstance(value, str) or re.fullmatch(re.escape(spec["prefix"]) + r"-[0-9a-f]{64}", value) is None:
            fail(f"Engine B: {label} content id")
    elif kind == "Nullable":
        if value is not None:
            validate_spec(value, spec["inner"], schemas, label)
    elif kind == "OneOf":
        passed = 0
        for variant in spec["variants"]:
            try:
                validate_spec(value, variant, schemas, label)
                passed += 1
            except RuntimeError:
                pass
        if passed != 1:
            fail(f"Engine B: {label} union ambiguity")
    else:
        fail(f"Engine B: {label} unknown spec kind {kind}")


def validate_record(value, schema, schemas, label=None):
    label = label or schema["schemaId"]
    validate_spec(value, schema["rootSpec"], schemas, label)
    validate_identity(value, schema)
    for invariant in schema["invariants"]:
        if invariant["kind"] == "ARRAY-LENGTH-EQUALS-FIELD" and len(value[invariant["arrayField"]]) != value[invariant["numberField"]]:
            fail(f"Engine B: {label} count invariant")
    return value


def attach(schema, body, schemas):
    identity = schema["contentIdentity"]
    root = root_v6(identity["typeTag"], identity["schemaVersion"], body)
    value = dict(body)
    value[identity["idKey"]] = f'{identity["prefix"]}-{root}'
    value[identity["rootKey"]] = root
    validate_record(value, schema, schemas)
    return value


def actual_records(registry, schema_id):
    records = []
    for fixture in registry["fixtures"]:
        if fixture["schemaId"] == schema_id and fixture["fixtureClass"] == "ACTUAL-POSITIVE":
            raw = base64.b64decode("".join(fixture["bytesBase64Chunks"]))
            records.append(json.loads(raw.decode("utf-8")))
    return sorted(records, key=lambda row: row["requirementId"].encode("utf-8"))


def value_type(value):
    if value is None:
        return "NULL"
    if isinstance(value, list):
        return "ARRAY"
    if isinstance(value, dict):
        return "OBJECT"
    if isinstance(value, bool):
        return "BOOLEAN"
    if isinstance(value, int):
        return "NUMBER"
    return "STRING"


def collection_root(type_tag, schema_version, records, root_key="recordRoot"):
    return root_v6(type_tag, schema_version, [record[root_key] for record in records])


def reconstruct_clause(subject, contract, registry, schemas):
    requirements = {row["requirementId"]: row for row in subject["requirements"]}
    bindings = {row["requirementId"]: row for row in subject["requirementBindings"]}
    types = {operator: set() for operator in contract["semanticProgramSchema"]["declaredOperators"]}
    for program in contract["semanticPredicates"]:
        for assertion in program["assertions"]:
            if assertion["op"] not in types:
                fail(f'Engine B: undeclared opcode {assertion["op"]}')
            for name, value in assertion.items():
                if name != "op":
                    types[assertion["op"]].add(f"{name}:{value_type(value)}")
    operator_schema = schemas["CONNECT-TRD2-V6-OPERATOR-DEFINITION-V3-SCHEMA"]
    operators = []
    for operator in utf8_sorted(types):
        argument_types = utf8_sorted(types[operator]) if types[operator] else ["NONE"]
        operators.append(attach(operator_schema, {
            "argumentTypes": argument_types,
            "operator": operator,
            "recordKind": "OPERATOR-DEFINITION-V3",
            "resultType": "BOOLEAN",
            "schemaVersion": "CONNECT-TRD2-V6-OPERATOR-DEFINITION-V3",
            "semantics": f"Evaluate opcode {operator} over the exact canonical JSON operand object reconstructed from the frozen predecessor semantic assertion; every declared operand name and type must match and unknown input blocks.",
            "unknownArgumentTerminal": "CLAUSE-AST-UNKNOWN-ARGUMENT",
        }, schemas))
    node_schema = schemas["CONNECT-TRD2-V6-CLAUSE-NODE-V3-SCHEMA"]
    obligation_schema = schemas["CONNECT-TRD2-V6-COUNTEREXAMPLE-OBLIGATION-V3-SCHEMA"]
    program_schema = schemas["CONNECT-TRD2-V6-CLAUSE-AST-PROGRAM-V3-SCHEMA"]
    nodes = []
    obligations = []
    programs = []
    for predecessor in sorted(contract["semanticPredicates"], key=lambda row: row["requirementId"].encode("utf-8")):
        requirement = requirements[predecessor["requirementId"]]
        binding = bindings[predecessor["requirementId"]]
        roots_by_index = {}
        for index, assertion in enumerate(predecessor["assertions"]):
            operands = {key: value for key, value in assertion.items() if key != "op"}
            argument_roots = utf8_sorted([
                root_v6("TRD2V6-CLAUSE-ARGUMENT-V3", "CONNECT-TRD2-V6-CLAUSE-ARGUMENT-V3", {"name": name, "value": value})
                for name, value in operands.items()
            ])
            node = attach(node_schema, {
                "argumentRoots": argument_roots,
                "clauseIndex": index,
                "expectedResult": "true",
                "failureTerminal": predecessor["failureTerminal"],
                "opcode": assertion["op"],
                "operandType": "CANONICAL-JSON",
                "operandValue": canonical(operands),
                "recordKind": "CLAUSE-NODE-V3",
                "schemaVersion": "CONNECT-TRD2-V6-CLAUSE-NODE-V3",
            }, schemas)
            nodes.append(node)
            roots_by_index[index] = node["recordRoot"]
        requirement_obligations = []
        for coverage in predecessor["counterexampleCoverage"]:
            mode = next((candidate for candidate in ["POSITIVE", "NEGATIVE", "FAILURE", "CONCURRENCY", "RECOVERY"] if coverage["vectorId"].endswith("-" + candidate)), None)
            if mode is None or predecessor["assertions"][coverage["assertionIndex"]]["op"] != coverage["assertionOp"]:
                fail(f'Engine B: counterexample mismatch {predecessor["requirementId"]}')
            obligation = attach(obligation_schema, {
                "clauseRoot": roots_by_index[coverage["assertionIndex"]],
                "expectedTerminal": predecessor["failureTerminal"],
                "mode": mode,
                "recordKind": "COUNTEREXAMPLE-OBLIGATION-V3",
                "requirementRoot": requirement["requirementRoot"],
                "schemaVersion": "CONNECT-TRD2-V6-COUNTEREXAMPLE-OBLIGATION-V3",
                "status": "PENDING-PASS-5",
                "vectorId": coverage["vectorId"],
            }, schemas)
            obligations.append(obligation)
            requirement_obligations.append(obligation)
        result_match = re.match(r"^require exactly one ([A-Za-z0-9-]+) with resultId=([A-Za-z0-9-]+) ", requirement["content"]["statement"])
        if result_match is None:
            fail(f'Engine B: result binding missing {requirement["requirementId"]}')
        dependency_text = requirement["content"]["dependencies"]
        dependencies = [] if dependency_text == "[]" else utf8_sorted(dependency_text[1:-1].split(","))
        clause_roots = utf8_sorted(roots_by_index.values())
        counterexample_roots = utf8_sorted([row["recordRoot"] for row in requirement_obligations])
        programs.append(attach(program_schema, {
            "clauseCount": len(clause_roots),
            "clauseRoots": clause_roots,
            "counterexampleCount": len(counterexample_roots),
            "counterexampleRoots": counterexample_roots,
            "dependencyRequirementIds": dependencies,
            "exactStatementSha256": sha256_bytes(requirement["content"]["statement"].encode("utf-8")),
            "failureTerminal": predecessor["failureTerminal"],
            "noSharedReceiptCredit": True,
            "passRule": "ALL-CLAUSES-PASS",
            "predecessorSemanticProgramRoot": predecessor["semanticProgramRoot"],
            "predicateId": predecessor["predicateId"],
            "recordKind": "CLAUSE-AST-PROGRAM-V3",
            "requirementId": requirement["requirementId"],
            "requirementRoot": requirement["requirementRoot"],
            "resultId": result_match.group(2),
            "resultType": result_match.group(1),
            "schemaVersion": "CONNECT-TRD2-V6-CLAUSE-AST-PROGRAM-V3",
            "semanticExecutionState": "COMPILED-LOSSLESS-NOT-YET-EXECUTED",
            "sourceBindingDigest": root_v6("TRD2V6-REQUIREMENT-SOURCE-BINDING-DIGEST-V3", "CONNECT-TRD2-V6-REQUIREMENT-SOURCE-BINDING-DIGEST-V3", binding),
            "vectorIds": utf8_sorted(predecessor["vectorIds"]),
        }, schemas))
    body = {
        "claimLimit": "LOSSLESS-TYPED-COMPILATION-NOT-SEMANTIC-ACCEPTANCE",
        "operatorCount": len(operators),
        "operatorDefinitions": operators,
        "operatorRegistryRoot": collection_root("TRD2V6-OPERATOR-DEFINITION-COLLECTION-V3", "CONNECT-TRD2-V6-OPERATOR-DEFINITION-COLLECTION-V3", operators),
        "programCollectionRoot": collection_root("TRD2V6-CLAUSE-AST-PROGRAM-COLLECTION-V3", "CONNECT-TRD2-V6-CLAUSE-AST-PROGRAM-COLLECTION-V3", programs),
        "programCount": len(programs),
        "programs": programs,
        "recordKind": "CLAUSE-AST-REGISTRY-V3",
        "requirementCollectionRoot": subject["requirementCollectionRoot"],
        "schemaVersion": "CONNECT-TRD2-V6-CLAUSE-AST-REGISTRY-V3",
        "unknownOpcodeTerminal": "CLAUSE-AST-UNKNOWN-OPCODE",
    }
    return attach(schemas["CONNECT-TRD2-V6-CLAUSE-AST-REGISTRY-V3-SCHEMA"], body, schemas), nodes, obligations


def validate_state_source_binding(state_registry, contract):
    machines = state_registry["machines"]
    families = {machine["family"] for machine in machines}
    expected_families = {"REVIEW", "MISSING-VALUE", "DATA-LIFECYCLE", "RETENTION", "BACKUP-RESTORE", "PUBLIC-FLOW", "SEVERITY"}
    if families != expected_families or state_registry["familyCount"] != 7:
        fail("Engine B: state family coverage")
    guard_by_root = {profile["recordRoot"]: profile for profile in state_registry["guardProfiles"]}
    total_transitions = 0
    total_expanded = 0
    for machine in machines:
        expected_pairs = {(state, event) for state in machine["states"] for event in machine["events"]}
        observed_pairs = {(row["fromState"], row["event"]) for row in machine["transitions"]}
        if expected_pairs != observed_pairs or len(observed_pairs) != len(machine["transitions"]):
            fail(f'Engine B: transition matrix {machine["machineId"]}')
        if machine["expandedTransitionCount"] != machine["transitionCount"] * machine["applicationCount"]:
            fail(f'Engine B: expanded transition count {machine["machineId"]}')
        for transition in machine["transitions"]:
            if transition["guardProfileRoot"] not in guard_by_root:
                fail(f'Engine B: unknown guard root {machine["machineId"]}')
        total_transitions += machine["transitionCount"]
        total_expanded += machine["expandedTransitionCount"]
    if total_transitions != state_registry["totalTransitionCount"] or total_expanded != state_registry["totalExpandedTransitionCount"]:
        fail("Engine B: state aggregate denominator")

    lifecycle = [machine for machine in machines if machine["family"] == "DATA-LIFECYCLE"]
    if len(lifecycle) != 10 or sum(machine["expandedTransitionCount"] for machine in lifecycle) != 3200:
        fail("Engine B: lifecycle 10x16x20 denominator")
    source_rows = {(row["dataClassId"], row["fromState"], row["event"]): row for row in contract["dataLifecycle"]["matrixRows"]}
    observed_rows = {}
    for machine in lifecycle:
        class_id = machine["machineId"].removeprefix("TRD2V6-MACHINE-DATA-LIFECYCLE-")
        for transition in machine["transitions"]:
            key = (class_id, transition["fromState"], transition["event"])
            observed_rows[key] = transition
            source = source_rows.get(key)
            if source is None:
                fail(f"Engine B: lifecycle row outside source {key}")
            expected_effect = "NONE"
            if source["effect"] == "COMMIT-EXACT-AUTHORIZED-DELETION":
                expected_effect = "PROVIDER-FINALIZE"
            elif source["effect"].startswith("CREATE-"):
                expected_effect = "PROVIDER-PREPARE"
            elif source["effect"] != "NONE":
                expected_effect = "ATOMIC-LOCAL"
            if (
                transition["disposition"] != source["disposition"]
                or transition["toState"] != source["toState"]
                or transition["safeTerminal"] != source["terminal"]
                or transition["durableEffectClass"] != expected_effect
            ):
                fail(f"Engine B: lifecycle projection mismatch {key}")
            profile = guard_by_root[transition["guardProfileRoot"]]
            strings = [condition["expectedString"] for condition in profile["conditions"] if condition["operator"] == "STRING-EQUAL"]
            if source["guard"] not in strings:
                fail(f"Engine B: lifecycle guard not bound {key}")
            if transition["disposition"] == "ALLOW" and transition["event"] in ("START-DELETE", "PROVIDER-CONFIRMED", "START-REDELETE") and transition["fromState"] in ("ACTIVE", "HOLD-ACTIVE", "HOLD-RELEASE-PENDING"):
                fail(f"Engine B: Active/Hold delete allowed {key}")
            if transition["fromState"] == "PURGED" and transition["disposition"] == "ALLOW" and transition["toState"] != "PURGED":
                fail(f"Engine B: PURGED resurrection {key}")
    if len(observed_rows) != 3200 or set(observed_rows) != set(source_rows):
        fail("Engine B: lifecycle source coverage")

    missing = next(machine for machine in machines if machine["family"] == "MISSING-VALUE")
    expected_missing = {f'MISSING-VALUE:{row["missingValueId"]}' for row in contract["missingValueMachines"]}
    if {row["applicationId"] for row in missing["applications"]} != expected_missing:
        fail("Engine B: missing-value application coverage")
    public = next(machine for machine in machines if machine["family"] == "PUBLIC-FLOW")
    expected_public = {f'PUBLIC-FLOW:{row["controlId"]}' for row in contract["publicControls"]}
    if {row["applicationId"] for row in public["applications"]} != expected_public or len(expected_public) != 52:
        fail("Engine B: public control coverage")
    severity_apps = [row for machine in machines if machine["family"] == "SEVERITY" for row in machine["applications"]]
    expected_severity = {f'SEVERITY:{row["envelopeId"]}' for row in contract["severityBindings"]}
    if {row["applicationId"] for row in severity_apps} != expected_severity or len(expected_severity) != 84:
        fail("Engine B: severity envelope coverage")
    soe_machine = next(machine for machine in machines if machine["machineId"] == "TRD2V6-MACHINE-SEVERITY-SOE-050-FIRST-REACHABILITY")
    escalations = [row for row in soe_machine["transitions"] if row["disposition"] == "ALLOW" and row["event"] == "FIRST-REACHABILITY" and row["fromState"] == "P2" and row["toState"] == "P0"]
    duplicates = [row for row in soe_machine["transitions"] if row["disposition"] == "ALLOW" and row["event"] == "DUPLICATE-FIRST-REACHABILITY"]
    if len(escalations) != 1 or duplicates:
        fail("Engine B: SOE-050 append-once escalation")
    retention = next(machine for machine in machines if machine["family"] == "RETENTION")
    retention_guard_text = "\n".join(
        condition["expectedString"] or ""
        for transition in retention["transitions"]
        for condition in guard_by_root[transition["guardProfileRoot"]]["conditions"]
    )
    for required in ["AUTHORIZED-SET", "INACTIVE", "NO-LEGAL-HOLD", "AUDIT-ONLY-NOT-SAFETY", "CAS+FENCE"]:
        if required not in retention_guard_text:
            fail(f"Engine B: retention guard missing {required}")
    backup = next(machine for machine in machines if machine["family"] == "BACKUP-RESTORE")
    backup_guard_text = "\n".join(
        condition["expectedString"] or ""
        for transition in backup["transitions"]
        for condition in guard_by_root[transition["guardProfileRoot"]]["conditions"]
    )
    for required in ["BOUND-BACKUP-ID", "EXACT-DIGESTS", "R2-CONSISTENCY", "PRIVACY-REPLAY", "PURGED-NEVER-RESURRECTED"]:
        if required not in backup_guard_text:
            fail(f"Engine B: backup/restore guard missing {required}")


def main():
    artifacts = {path: load_json(path) for path in OUTPUTS}
    subject = artifacts[OUTPUTS[0]]
    commits = {row["observedCommit"] for row in subject["provenance"]}
    if len(commits) != 1:
        fail("Engine B: provenance commit mismatch")
    observed_head = next(iter(commits))
    registry = load_json_blob(observed_head, REGISTRY_PATH)
    contract = load_json_blob(observed_head, CONTRACT_PATH)
    schemas = {schema["schemaId"]: schema for schema in registry["schemas"]}
    validate_record(subject, schemas["CONNECT-TRD2-V6-SUBJECT-V3-SCHEMA"], schemas)
    clause = artifacts[OUTPUTS[1]]
    state_registry = artifacts[OUTPUTS[2]]
    validate_record(clause, schemas["CONNECT-TRD2-V6-CLAUSE-AST-REGISTRY-V3-SCHEMA"], schemas)
    validate_record(state_registry, schemas["CONNECT-TRD2-V6-STATE-MACHINE-REGISTRY-V3-SCHEMA"], schemas)

    expected_requirements = actual_records(registry, REQ_SCHEMA)
    expected_bindings = actual_records(registry, BIND_SCHEMA)
    if canonical(subject["requirements"]) != canonical(expected_requirements) or canonical(subject["requirementBindings"]) != canonical(expected_bindings):
        fail("Engine B: Subject differs from frozen actual fixtures")
    if subject["requirementCollectionRoot"] != collection_root("TRD2V6-REQUIREMENT-COLLECTION-V3", "CONNECT-TRD2-V6-REQUIREMENT-COLLECTION-V3", expected_requirements, "requirementRoot"):
        fail("Engine B: Requirement collection root")
    for row in subject["provenance"]:
        raw = git_blob(observed_head, row["logicalPath"])
        if row["byteLength"] != len(raw) or row["sha256"] != sha256_bytes(raw):
            fail(f'Engine B: provenance bytes {row["logicalPath"]}')

    expected_clause, nodes, obligations = reconstruct_clause(subject, contract, registry, schemas)
    if canonical(expected_clause) != canonical(clause):
        fail("Engine B: Clause AST differs from independent reconstruction")
    referenced_nodes = {root for program in clause["programs"] for root in program["clauseRoots"]}
    referenced_obligations = {root for program in clause["programs"] for root in program["counterexampleRoots"]}
    if referenced_nodes != {row["recordRoot"] for row in nodes} or referenced_obligations != {row["recordRoot"] for row in obligations}:
        fail("Engine B: virtual Clause record reachability")
    validate_state_source_binding(state_registry, contract)

    outcome = {
        "artifactRoots": [{"logicalPath": path, "artifactRoot": artifacts[path]["artifactRoot"]} for path in OUTPUTS],
        "clauseCount": sum(program["clauseCount"] for program in clause["programs"]),
        "counterexampleCount": sum(program["counterexampleCount"] for program in clause["programs"]),
        "familyCount": state_registry["familyCount"],
        "machineCount": state_registry["machineCount"],
        "requirementCount": subject["requirementCount"],
        "totalExpandedTransitionCount": state_registry["totalExpandedTransitionCount"],
        "totalTransitionCount": state_registry["totalTransitionCount"],
    }
    result = {
        **outcome,
        "claimLimit": "LOCAL-PASS3-COMPILATION-EVIDENCE;NO-SEMANTIC-ACCEPTANCE-CREDIT",
        "engineId": "TRD2-V6-PASS3-V2-ENGINE-B",
        "observedHead": observed_head,
        "outcomeRoot": root_v6("TRD2V6-PASS3-V2-ENGINE-OUTCOME", "CONNECT-TRD2-V6-PASS3-V2-ENGINE-OUTCOME-V1", outcome),
        "sourceSha256": sha256_bytes((ROOT / "scripts/verify-trd2-v6-pass3-v2-engine-b.py").read_bytes()),
        "status": "PASS",
        "virtualClauseNodeCount": len(nodes),
        "virtualCounterexampleCount": len(obligations),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
