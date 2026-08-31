#!/usr/bin/env python3

import base64
import hashlib
import json
import struct
import subprocess
import sys
import unicodedata
from pathlib import Path

REGISTRY_PATH = "docs/planning/trd2-v6-candidate-2026-08-30/closed-schema-registry.json"
REPORT_A_PATH = "docs/planning/trd2-v6-candidate-2026-08-30/canonical-engine-a-report.json"
REPORT_B_PATH = "docs/planning/trd2-v6-candidate-2026-08-30/canonical-engine-b-report.json"
SCRIPT_PATH = "scripts/verify-trd2-v6-canonical-engine-b.py"
SCHEMA_DEFINITION_VERSION = "CONNECT-TRD2-V6-CLOSED-SCHEMA-DEFINITION-V1"
REGISTRY_VERSION = "CONNECT-TRD2-V6-CLOSED-SCHEMA-REGISTRY-V1"
FIXTURE_VERSION = "CONNECT-TRD2-V6-SCHEMA-ORACLE-FIXTURE-V1"
REPORT_VERSION = "CONNECT-TRD2-V6-CANONICAL-ENGINE-REPORT-V1"
SAFE_MAX = 9007199254740991
FAMILIES = (
    "REQUIREMENT", "SUPERSESSION-RECORD", "NORMATIVE-REGISTRY", "SOURCE-CAPTURE-ROW",
    "SOURCE-CAPTURE-MANIFEST", "PARSER-FIXTURE", "CLAUSE-AST-PROGRAM", "CAUSAL-GRAPH-NODE",
    "CAUSAL-GRAPH-EDGE", "STATE-MACHINE", "STATE-TRANSITION", "EXECUTABLE-VECTOR", "ROOT-OVERLAY",
    "INVALIDATION-RULE", "DETACHED-ACCEPTANCE-PACKET", "FINDING-CLOSURE", "PACKAGE-MEMBER",
    "ATOMIC-PACKAGE-MANIFEST", "GENERATION-RECEIPT", "PARSER-REPORT", "CANONICAL-REPORT",
    "GRAPH-REPORT", "VECTOR-RUNNER-REPORT", "PRODUCER-QA", "REVIEWER-APPOINTMENT", "REVIEW-AUTHORITY",
    "EVIDENCE-CUSTODY-RECEIPT", "INDEPENDENT-REVIEW", "REVIEW-GENERATION", "RECONCILIATION", "APPEAL",
    "REVOCATION", "EXPIRY", "DEFINITION-ACCEPTANCE", "MISSING-VALUE-RECORD", "LIFECYCLE-EVENT",
    "LIFECYCLE-GUARD-AST", "DATA-CLASS", "DATA-RECORD", "LEGAL-HOLD", "PROVIDER-STORE",
    "TRUSTED-TIME-RECEIPT", "HEAD-POINTER", "CAS-RECEIPT", "RETENTION-PLAN", "PROVIDER-CONFIRMATION",
    "DELETE-RECEIPT", "BACKUP-EVIDENCE", "RESTORE-EVIDENCE", "PUBLIC-FLOW-CONTROL",
    "PUBLIC-SURFACE-INVENTORY", "SEVERITY-EVENT", "RESULT-RECEIPT",
)


class ValidationFailure(Exception):
    def __init__(self, terminal, message):
        super().__init__(message)
        self.terminal = terminal


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def canonical(value):
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int) and not isinstance(value, bool):
        if value < -SAFE_MAX or value > SAFE_MAX:
            raise ValueError("integer outside safe range")
        return str(value)
    if isinstance(value, float):
        raise ValueError("floats are forbidden")
    if isinstance(value, str):
        if unicodedata.normalize("NFC", value) != value:
            raise ValueError("NFC required")
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(canonical(member) for member in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys(), key=lambda key: key.encode("utf-8"))
        if any(not isinstance(key, str) for key in keys):
            raise ValueError("object keys must be strings")
        return "{" + ",".join(canonical(key) + ":" + canonical(value[key]) for key in keys) + "}"
    raise ValueError(f"unsupported canonical type {type(value).__name__}")


def root_v6(type_tag, schema_version, value):
    type_bytes = type_tag.encode("utf-8")
    schema_bytes = schema_version.encode("utf-8")
    body_bytes = canonical(value).encode("utf-8")
    preimage = (
        b"CONNECT-TRD2-V6-ROOT-V1\0"
        + struct.pack(">I", len(type_bytes)) + type_bytes
        + struct.pack(">I", len(schema_bytes)) + schema_bytes
        + struct.pack(">Q", len(body_bytes)) + body_bytes
    )
    return sha256_bytes(preimage)


def validate_identity(value, prefix, type_tag, schema_version, id_key="artifactId", root_key="artifactRoot"):
    if not isinstance(value, dict):
        raise ValueError(f"{type_tag}: expected object")
    body = {key: member for key, member in value.items() if key not in (id_key, root_key)}
    expected = root_v6(type_tag, schema_version, body)
    if value.get(root_key) != expected or value.get(id_key) != f"{prefix}-{expected}":
        raise ValueError(f"{type_tag}: content identity mismatch")


def attach_identity(prefix, type_tag, schema_version, body):
    result = dict(body)
    result["artifactId"] = f"{prefix}-{root_v6(type_tag, schema_version, body)}"
    result["artifactRoot"] = root_v6(type_tag, schema_version, body)
    return result


def exact_keys(value, expected, label):
    if not isinstance(value, dict) or set(value.keys()) != set(expected):
        raise ValueError(f"{label}: exact keys mismatch")


def pairs_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def parse_canonical(value):
    text = value.decode("utf-8", errors="strict")
    parsed = json.loads(text, object_pairs_hook=pairs_object, parse_float=lambda _: (_ for _ in ()).throw(ValueError("float forbidden")))
    if canonical(parsed).encode("utf-8") != value:
        raise ValueError("non-canonical fixture bytes")
    return parsed


def validate_logical_path(value):
    if value.startswith("/") or "\\" in value or "//" in value:
        return False
    if value != "package.json" and not value.startswith(("docs/planning/", "scripts/", "tests/")):
        return False
    return all(segment not in ("", ".", "..") for segment in value.split("/"))


def fail(terminal, message):
    raise ValidationFailure(terminal, message)


def validate_value(value, field_spec, label):
    kind = field_spec["kind"]
    if kind == "Const":
        expected = field_spec["value"]
        if type(value) is not type(expected):
            fail("TYPE-MISMATCH", f"{label}: const type mismatch")
        if canonical(value) != canonical(expected):
            fail("CONST-MISMATCH", f"{label}: const mismatch")
    elif kind == "Boolean":
        if not isinstance(value, bool):
            fail("TYPE-MISMATCH", f"{label}: expected boolean")
    elif kind == "UIntSafe":
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            fail("TYPE-MISMATCH", f"{label}: expected UIntSafe")
        if value < field_spec["minimum"] or value > field_spec["maximum"]:
            fail("RANGE-ERROR", f"{label}: integer out of range")
    elif kind == "String":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: expected string")
        if unicodedata.normalize("NFC", value) != value:
            fail("FORMAT-ERROR", f"{label}: NFC required")
        length = len(value.encode("utf-8"))
        if length < field_spec["minBytes"] or length > field_spec["maxBytes"]:
            fail("RANGE-ERROR", f"{label}: string range")
    elif kind == "Bytes32LowerHex":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: expected Bytes32 string")
        if len(value) != 64 or any(char not in "0123456789abcdef" for char in value):
            fail("FORMAT-ERROR", f"{label}: invalid Bytes32")
    elif kind == "CommitHex":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: expected commit string")
        if len(value) not in (40, 64) or any(char not in "0123456789abcdef" for char in value):
            fail("FORMAT-ERROR", f"{label}: invalid commit")
    elif kind == "LogicalPath":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: expected path string")
        if not validate_logical_path(value):
            fail("FORMAT-ERROR", f"{label}: invalid path")
    elif kind == "ContentId":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: expected ContentId string")
        prefix = field_spec["prefix"] + "-"
        suffix = value[len(prefix):] if value.startswith(prefix) else ""
        if len(suffix) != 64 or any(char not in "0123456789abcdef" for char in suffix):
            fail("FORMAT-ERROR", f"{label}: invalid ContentId")
    elif kind == "Enum":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: expected enum string")
        if value not in field_spec["values"]:
            fail("ENUM-MISMATCH", f"{label}: unknown enum")
    elif kind == "Array":
        if not isinstance(value, list):
            fail("TYPE-MISMATCH", f"{label}: expected array")
        if len(value) < field_spec["minItems"] or len(value) > field_spec["maxItems"]:
            fail("RANGE-ERROR", f"{label}: array range")
        for index, member in enumerate(value):
            validate_value(member, field_spec["items"], f"{label}[{index}]")
        encoded = [canonical(member) for member in value]
        if field_spec["unique"] and len(set(encoded)) != len(encoded):
            fail("CROSS-FIELD-INVARIANT", f"{label}: duplicate member")
        if field_spec["sorted"] and encoded != sorted(encoded, key=lambda member: member.encode("utf-8")):
            fail("CROSS-FIELD-INVARIANT", f"{label}: unsorted")
    else:
        raise ValueError(f"unimplemented spec kind {kind}")


def validate_invariant(record, rule, label):
    kind = rule["kind"]
    if kind == "ARRAY-LENGTH-EQUALS-FIELD" and len(record[rule["arrayField"]]) != record[rule["numberField"]]:
        fail("CROSS-FIELD-INVARIANT", f"{label}: denominator")
    if kind == "EQUAL-FIELDS" and canonical(record[rule["left"]]) != canonical(record[rule["right"]]):
        fail("CROSS-FIELD-INVARIANT", f"{label}: equality")
    if kind == "NOT-EQUAL-FIELDS" and canonical(record[rule["left"]]) == canonical(record[rule["right"]]):
        fail("CROSS-FIELD-INVARIANT", f"{label}: inequality")
    if kind == "LTE-FIELDS" and record[rule["left"]] > record[rule["right"]]:
        fail("CROSS-FIELD-INVARIANT", f"{label}: ordering")
    if kind == "SUBSET-ARRAY" and any(member not in record[rule["supersetField"]] for member in record[rule["subsetField"]]):
        fail("CROSS-FIELD-INVARIANT", f"{label}: subset")


def validate_record(record, schema):
    if not isinstance(record, dict):
        fail("TYPE-MISMATCH", f"{schema['family']}: record object required")
    expected = [field["name"] for field in schema["fields"]]
    unknown = sorted(set(record.keys()) - set(expected))
    if unknown:
        fail("UNKNOWN-FIELD", f"unknown field {unknown[0]}")
    missing = sorted(set(expected) - set(record.keys()))
    if missing:
        fail("MISSING-FIELD", f"missing field {missing[0]}")
    for declared in schema["fields"]:
        validate_value(record[declared["name"]], declared["spec"], f"{schema['family']}.{declared['name']}")
    for rule in schema["invariants"]:
        validate_invariant(record, rule, schema["family"])
    constructor = schema["domainConstructor"]
    body = {key: member for key, member in record.items() if key not in (constructor["idKey"], constructor["rootKey"])}
    expected_root = root_v6(constructor["typeTag"], constructor["schemaVersion"], body)
    if record[constructor["rootKey"]] != expected_root or record[constructor["idKey"]] != f"{constructor['prefix']}-{expected_root}":
        fail("CONTENT-IDENTITY-MISMATCH", f"{schema['family']}: identity mismatch")
    return expected_root


def validate_spec_definition(field_spec, label):
    key_sets = {
        "Array": {"items", "kind", "maxItems", "minItems", "sorted", "unique"},
        "Boolean": {"kind"},
        "Bytes32LowerHex": {"kind"},
        "CommitHex": {"kind"},
        "Const": {"kind", "value"},
        "ContentId": {"kind", "prefix"},
        "Enum": {"kind", "values"},
        "LogicalPath": {"kind"},
        "String": {"kind", "maxBytes", "minBytes"},
        "UIntSafe": {"kind", "maximum", "minimum"},
    }
    if not isinstance(field_spec, dict) or field_spec.get("kind") not in key_sets or set(field_spec.keys()) != key_sets[field_spec["kind"]]:
        raise ValueError(f"{label}: closed spec mismatch")
    kind = field_spec["kind"]
    if kind == "Array":
        if (
            not isinstance(field_spec["minItems"], int)
            or isinstance(field_spec["minItems"], bool)
            or not isinstance(field_spec["maxItems"], int)
            or isinstance(field_spec["maxItems"], bool)
            or field_spec["minItems"] < 0
            or field_spec["maxItems"] < field_spec["minItems"]
            or not isinstance(field_spec["unique"], bool)
            or not isinstance(field_spec["sorted"], bool)
        ):
            raise ValueError(f"{label}: invalid array spec")
        validate_spec_definition(field_spec["items"], label + ".items")
    if kind == "String" and (field_spec["minBytes"] < 0 or field_spec["maxBytes"] < field_spec["minBytes"]):
        raise ValueError(f"{label}: invalid string spec")
    if kind == "UIntSafe" and (field_spec["minimum"] < 0 or field_spec["maximum"] < field_spec["minimum"] or field_spec["maximum"] > SAFE_MAX):
        raise ValueError(f"{label}: invalid integer spec")
    if kind == "Enum" and (not isinstance(field_spec["values"], list) or not field_spec["values"] or len(set(field_spec["values"])) != len(field_spec["values"]) or any(not isinstance(value, str) for value in field_spec["values"])):
        raise ValueError(f"{label}: invalid enum spec")
    if kind == "ContentId" and (not isinstance(field_spec["prefix"], str) or not field_spec["prefix"]):
        raise ValueError(f"{label}: invalid content ID prefix")


def execute_fixture(fixture, schema):
    value = base64.b64decode(fixture["bytesBase64"], validate=True)
    digest = sha256_bytes(value)
    if (
        base64.b64encode(value).decode("ascii") != fixture["bytesBase64"]
        or len(value) != fixture["byteLength"]
        or digest != fixture["sha256"]
        or fixture["captureSha256"] != digest
        or fixture["captureId"] != f"TRD2V6-SCHEMA-CAPTURE-{digest}"
        or fixture["startByte"] != 0
        or fixture["endByte"] != len(value)
    ):
        raise ValueError("fixture byte/capture identity mismatch")
    record = parse_canonical(value)
    try:
        record_root = validate_record(record, schema)
        return {"observedRecordRoot": record_root, "status": "ACCEPT", "terminal": "ACCEPT"}
    except ValidationFailure as error:
        return {"observedRecordRoot": None, "status": "REJECT", "terminal": error.terminal}


def validate_schema(schema, family):
    exact_keys(schema, ("additionalProperties", "collectionConstructor", "domainConstructor", "family", "fields", "invariants", "schemaId", "schemaRoot", "schemaVersion", "terminals"), f"schema.{family}")
    if schema["family"] != family or schema["schemaVersion"] != f"CONNECT-TRD2-V6-{family}-V1" or schema["additionalProperties"] is not False:
        raise ValueError(f"schema.{family}: identity")
    validate_identity(schema, "TRD2V6-SCHEMA", "CLOSED-SCHEMA-DEFINITION", SCHEMA_DEFINITION_VERSION, "schemaId", "schemaRoot")
    exact_keys(schema["domainConstructor"], ("excludedFields", "idKey", "prefix", "rootKey", "schemaVersion", "typeTag"), f"schema.{family}.domain")
    exact_keys(schema["collectionConstructor"], ("schemaVersion", "typeTag"), f"schema.{family}.collection")
    parts = family.lower().split("-")
    stem = parts[0] + "".join(part[0].upper() + part[1:] for part in parts[1:])
    expected_id = stem + "Id"
    expected_root = stem + "Root"
    domain = schema["domainConstructor"]
    if (
        domain["idKey"] != expected_id
        or domain["rootKey"] != expected_root
        or domain["prefix"] != "TRD2V6-" + family
        or domain["typeTag"] != family
        or domain["schemaVersion"] != schema["schemaVersion"]
        or domain["excludedFields"] != [expected_id, expected_root]
        or schema["collectionConstructor"]["typeTag"] != family + "-COLLECTION"
        or schema["collectionConstructor"]["schemaVersion"] != schema["schemaVersion"] + "-COLLECTION"
    ):
        raise ValueError(f"schema.{family}: constructor mismatch")
    names = [declared["name"] for declared in schema["fields"]]
    if len(names) != len(set(names)) or names != sorted(names, key=lambda name: name.encode("utf-8")):
        raise ValueError(f"schema.{family}: field order")
    for declared in schema["fields"]:
        exact_keys(declared, ("name", "required", "spec"), f"schema.{family}.field")
        if declared["required"] is not True:
            raise ValueError(f"schema.{family}: optional field forbidden")
        validate_spec_definition(declared["spec"], f"schema.{family}.{declared['name']}")
    identity = schema["domainConstructor"]
    if any(name not in names for name in (identity["idKey"], identity["rootKey"], "schemaVersion", "recordKind")):
        raise ValueError(f"schema.{family}: envelope missing")
    invariant_keys = {
        "ARRAY-LENGTH-EQUALS-FIELD": {"arrayField", "kind", "numberField"},
        "EQUAL-FIELDS": {"kind", "left", "right"},
        "LTE-FIELDS": {"kind", "left", "right"},
        "NOT-EQUAL-FIELDS": {"kind", "left", "right"},
        "SUBSET-ARRAY": {"kind", "subsetField", "supersetField"},
    }
    for rule in schema["invariants"]:
        if not isinstance(rule, dict) or rule.get("kind") not in invariant_keys or set(rule.keys()) != invariant_keys[rule["kind"]]:
            raise ValueError(f"schema.{family}: invariant schema")
        if any(value not in names for key, value in rule.items() if key != "kind"):
            raise ValueError(f"schema.{family}: invariant field")
    exact_keys(schema["terminals"], ("constMismatch", "contentIdentityMismatch", "enumMismatch", "formatError", "invariantError", "missingField", "rangeError", "typeMismatch", "unknownField"), f"schema.{family}.terminals")


def validate_registry(registry):
    exact_keys(registry, ("artifactClass", "artifactId", "artifactRoot", "canonicalProfile", "claimLimit", "constructors", "fixtureCollectionRoot", "fixtureCount", "fixtures", "provenance", "schemaCollectionRoot", "schemaCount", "schemas", "schemaVersion"), "registry")
    if registry["schemaVersion"] != REGISTRY_VERSION:
        raise ValueError("registry version")
    if registry["artifactClass"] != "PASS-2-NORMATIVE-CANDIDATE-MEMBER; PRODUCER-GENERATED; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE" or registry["claimLimit"] != "CLOSED-SCHEMA-AND-CANONICAL-CONSTRUCTOR-MECHANICS-ONLY; SEMANTICS-AND-EXTERNAL-CLOSURE-REMAIN-PENDING":
        raise ValueError("registry claim boundary")
    validate_identity(registry, "TRD2V6-CLOSED-SCHEMA-REGISTRY", "CLOSED-SCHEMA-REGISTRY", REGISTRY_VERSION)
    if registry["canonicalProfile"]["encoding"] != "UTF-8-WITHOUT-BOM" or registry["canonicalProfile"]["unknownFieldRule"] != "REJECT-UNKNOWN-FIELD" or registry["constructors"]["domain"]["algorithm"] != "SHA-256":
        raise ValueError("canonical profile")
    if registry["schemaCount"] != len(FAMILIES) or [schema["family"] for schema in registry["schemas"]] != list(FAMILIES):
        raise ValueError("schema denominator")
    for schema, family in zip(registry["schemas"], FAMILIES):
        validate_schema(schema, family)
    if root_v6("CLOSED-SCHEMA-COLLECTION", SCHEMA_DEFINITION_VERSION, registry["schemas"]) != registry["schemaCollectionRoot"]:
        raise ValueError("schema collection root")
    if registry["fixtureCount"] != len(registry["fixtures"]) or registry["fixtureCount"] != len(FAMILIES) * 6:
        raise ValueError("fixture denominator")
    schema_by_id = {schema["schemaId"]: schema for schema in registry["schemas"]}
    if len(schema_by_id) != len(registry["schemas"]):
        raise ValueError("duplicate schema")
    fixture_ids = set()
    for index, fixture in enumerate(registry["fixtures"]):
        exact_keys(fixture, ("byteLength", "bytesBase64", "captureId", "captureSha256", "endByte", "expectedRecordRoot", "expectedStatus", "expectedTerminal", "fixtureId", "fixtureRoot", "mutation", "schemaId", "sha256", "startByte"), f"fixture[{index}]")
        validate_identity(fixture, "TRD2V6-SCHEMA-FIXTURE", "SCHEMA-ORACLE-FIXTURE", FIXTURE_VERSION, "fixtureId", "fixtureRoot")
        schema = schema_by_id.get(fixture["schemaId"])
        if schema is None or fixture["fixtureId"] in fixture_ids:
            raise ValueError("fixture identity")
        fixture_ids.add(fixture["fixtureId"])
        observed = execute_fixture(fixture, schema)
        if observed["status"] != fixture["expectedStatus"] or observed["terminal"] != fixture["expectedTerminal"] or observed["observedRecordRoot"] != fixture["expectedRecordRoot"]:
            raise ValueError(f"fixture oracle mismatch {index}")
    if root_v6("SCHEMA-ORACLE-FIXTURE-COLLECTION", FIXTURE_VERSION, registry["fixtures"]) != registry["fixtureCollectionRoot"]:
        raise ValueError("fixture collection root")
    provenance = registry["provenance"]
    exact_keys(provenance, ("observedHead", "observedObjectFormat", "outputRegistrySha256", "parserCorpusRoot", "pass1QaRoot", "sourceCaptureRoot", "toolchain", "toolchainRegistrySha256", "toolchainRoot"), "registry.provenance")
    if provenance["observedObjectFormat"] not in ("sha1", "sha256") or len(provenance["observedHead"]) not in (40, 64):
        raise ValueError("registry provenance identity")
    for index, row in enumerate(provenance["toolchain"]):
        exact_keys(row, ("byteLength", "logicalPath", "observedCommit", "sha256"), f"registry.toolchain[{index}]")
        if row["observedCommit"] != provenance["observedHead"] or row["byteLength"] < 1 or len(row["sha256"]) != 64:
            raise ValueError("registry toolchain row")
    if root_v6("TOOLCHAIN-FILE-COLLECTION", "CONNECT-TRD2-V6-PASS2-TOOLCHAIN-V1", provenance["toolchain"]) != provenance["toolchainRoot"]:
        raise ValueError("registry toolchain root")
    return registry


def run_git(args):
    result = subprocess.run(["git", *args], cwd=Path.cwd(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace"))
    return result.stdout


def assert_expected_worktree():
    records = [record for record in run_git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]).split(b"\0") if record]
    paths = [record[3:].decode("utf-8") for record in records]
    expected = {REGISTRY_PATH, REPORT_A_PATH}
    if len(paths) != len(expected) or set(paths) != expected or Path(REPORT_B_PATH).exists():
        raise RuntimeError("Canonical Engine B requires exactly the registry and Engine A report")


def patch_for(content):
    lines = content[:-1].split("\n") if content.endswith("\n") else content.split("\n")
    return "*** Begin Patch\n*** Add File: " + REPORT_B_PATH + "\n" + "\n".join("+" + line for line in lines) + "\n*** End Patch\n"


def main():
    if "--emit-patch" not in sys.argv:
        raise RuntimeError("use --emit-patch; Canonical Engine B never writes repository files directly")
    assert_expected_worktree()
    registry = validate_registry(json.loads(Path(REGISTRY_PATH).read_text(encoding="utf-8")))
    frozen = next((row for row in registry["provenance"]["toolchain"] if row["logicalPath"] == SCRIPT_PATH), None)
    source_sha256 = sha256_bytes(Path(SCRIPT_PATH).read_bytes())
    if frozen is None or frozen["sha256"] != source_sha256:
        raise RuntimeError("Canonical Engine B source differs from the frozen toolchain")
    schema_by_id = {schema["schemaId"]: schema for schema in registry["schemas"]}
    outcomes = []
    for fixture in registry["fixtures"]:
        observed = execute_fixture(fixture, schema_by_id[fixture["schemaId"]])
        outcomes.append({
            "expectedRecordRoot": fixture["expectedRecordRoot"],
            "expectedStatus": fixture["expectedStatus"],
            "expectedTerminal": fixture["expectedTerminal"],
            "fixtureId": fixture["fixtureId"],
            "fixtureSha256": fixture["sha256"],
            "observedRecordRoot": observed["observedRecordRoot"],
            "observedStatus": observed["status"],
            "observedTerminal": observed["terminal"],
            "schemaId": fixture["schemaId"],
        })
    mismatch_count = sum(
        row["expectedRecordRoot"] != row["observedRecordRoot"]
        or row["expectedStatus"] != row["observedStatus"]
        or row["expectedTerminal"] != row["observedTerminal"]
        for row in outcomes
    )
    body = {
        "artifactClass": "PRODUCER-ONLY; LOCAL-CANONICAL-ENGINE-REPORT; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE",
        "claimLimit": "SCHEMA-ORACLE-AND-CANONICAL-ROOT-AGREEMENT-ONLY; FINDING-CLOSURE-CREDIT-ZERO",
        "engineId": "CANONICAL-ENGINE-B",
        "fixtureCount": registry["fixtureCount"],
        "implementation": "PYTHON-STDLIB-STRICT-CLOSED-SCHEMA-ENGINE-V1",
        "mismatchCount": mismatch_count,
        "outcomeRoot": root_v6("CANONICAL-ENGINE-OUTCOME-COLLECTION", REPORT_VERSION, outcomes),
        "outcomes": outcomes,
        "registryRoot": registry["artifactRoot"],
        "schemaCount": registry["schemaCount"],
        "schemaVersion": REPORT_VERSION,
        "sourceSha256": source_sha256,
        "status": "PASS-LOCAL-CANDIDATE-NOT-ACCEPTED" if mismatch_count == 0 else "BLOCKED-CANONICAL-DISAGREEMENT",
        "toolchainRoot": registry["provenance"]["toolchainRoot"],
    }
    report = attach_identity("TRD2V6-CANONICAL-REPORT", "CANONICAL-ENGINE-REPORT", REPORT_VERSION, body)
    sys.stdout.write(patch_for(json.dumps(report, ensure_ascii=False, indent=2) + "\n"))


if __name__ == "__main__":
    main()
