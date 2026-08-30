#!/usr/bin/env python3

import base64
import hashlib
import json
import struct
import subprocess
import sys
import unicodedata
from pathlib import Path


REGISTRY_PATH = "docs/planning/trd2-v6-candidate-v3-2026-08-31/closed-schema-registry-v3.json"
REPORT_A_PATH = "docs/planning/trd2-v6-candidate-v3-2026-08-31/canonical-engine-a-report-v3.json"
REPORT_B_PATH = "docs/planning/trd2-v6-candidate-v3-2026-08-31/canonical-engine-b-report-v3.json"
SCRIPT_PATH = "scripts/verify-trd2-v6-canonical-v3-engine-b.py"
SAFE_MAX = 9007199254740991
PART_COUNT = 8
BASE64_CHUNK_CHAR_COUNT = 4096


class EngineBError(Exception):
    def __init__(self, terminal, message):
        super().__init__(message)
        self.terminal = terminal


def fail(terminal, message):
    raise EngineBError(terminal, message)


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def run_git(arguments):
    result = subprocess.run(["git", *arguments], check=False, capture_output=True, cwd=Path.cwd())
    if result.returncode != 0:
        raise RuntimeError(f"git {' '.join(arguments)} failed: {result.stderr.decode('utf-8', errors='replace').strip()}")
    return result.stdout


def worktree_paths():
    raw = run_git(["status", "--porcelain=v1", "-z", "--untracked-files=all"])
    return [record[3:] for record in raw.decode("utf-8").split("\0") if record]


def assert_worktree(part):
    expected = {REGISTRY_PATH, REPORT_A_PATH} if part == 1 else {REGISTRY_PATH, REPORT_A_PATH, REPORT_B_PATH}
    paths = worktree_paths()
    if set(paths) != expected or len(paths) != len(expected):
        raise RuntimeError(f"Engine B v3 part {part} found an unexpected worktree")
    if part == 1 and Path(REPORT_B_PATH).exists():
        raise RuntimeError("Engine B v3 report exists before part 1")


def assert_scalar_nfc(value, label):
    if not isinstance(value, str):
        raise ValueError(f"{label}: expected string")
    value.encode("utf-8", errors="strict")
    if unicodedata.normalize("NFC", value) != value:
        raise ValueError(f"{label}: NFC required")


def canonical(value):
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int) and not isinstance(value, bool):
        if value < -SAFE_MAX or value > SAFE_MAX:
            raise ValueError("canonical number outside safe integer domain")
        return str(value)
    if isinstance(value, str):
        assert_scalar_nfc(value, "canonical string")
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(canonical(member) for member in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys(), key=lambda key: key.encode("utf-8"))
        return "{" + ",".join(f"{canonical(key)}:{canonical(value[key])}" for key in keys) + "}"
    raise ValueError(f"unsupported canonical type {type(value).__name__}")


def root_v6(type_tag, schema_version, value):
    assert_scalar_nfc(type_tag, "typeTag")
    assert_scalar_nfc(schema_version, "schemaVersion")
    type_bytes = type_tag.encode("utf-8")
    schema_bytes = schema_version.encode("utf-8")
    body_bytes = canonical(value).encode("utf-8")
    preimage = b"CONNECT-TRD2-V6-ROOT-V1\0" + struct.pack(">I", len(type_bytes)) + type_bytes
    preimage += struct.pack(">I", len(schema_bytes)) + schema_bytes + struct.pack(">Q", len(body_bytes)) + body_bytes
    return sha256_bytes(preimage)


def pairs_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def reject_float(_value):
    raise ValueError("floating-point numbers are forbidden")


def parse_canonical_bytes(value):
    text = value.decode("utf-8", errors="strict")
    parsed = json.loads(text, object_pairs_hook=pairs_object, parse_float=reject_float, parse_constant=reject_float)
    if canonical(parsed).encode("utf-8") != value:
        raise ValueError("fixture bytes are not canonical JSON")
    return parsed


def valid_repo_path(value):
    if not isinstance(value, str) or value.startswith("/") or "\\" in value or "//" in value:
        return False
    if value != "package.json" and not value.startswith(("docs/planning/", "scripts/", "tests/")):
        return False
    return all(segment not in ("", ".", "..") for segment in value.split("/"))


def validate(value, spec, schemas, label="$", active=None):
    active = [] if active is None else active
    kind = spec["kind"]
    if kind == "Ref":
        schema_id = spec["schemaId"]
        if schema_id not in schemas:
            fail("UNRESOLVED-REF", f"{label}: {schema_id}")
        if schema_id in active:
            fail("CYCLIC-REF", f"{label}: {schema_id}")
        validate_record(value, schemas[schema_id], schemas, [*active, schema_id])
        return
    if value is None and kind not in ("Null", "Nullable") and not (kind == "Const" and spec["value"] is None):
        fail("NULLABILITY-MISMATCH", f"{label}: null forbidden")
    if kind == "Null":
        if value is not None:
            fail("TYPE-MISMATCH", f"{label}: null required")
    elif kind == "Nullable":
        if value is not None:
            validate(value, spec["inner"], schemas, label, active)
    elif kind == "OneOf":
        accepted = 0
        for branch in spec["variants"]:
            try:
                validate(value, branch, schemas, label, active)
                accepted += 1
            except EngineBError:
                pass
        if accepted != 1:
            fail("UNION-MISMATCH", f"{label}: exactly one branch required")
    elif kind == "Const":
        if canonical(value) != canonical(spec["value"]):
            fail("CONST-MISMATCH", f"{label}: const mismatch")
    elif kind == "Boolean":
        if not isinstance(value, bool):
            fail("TYPE-MISMATCH", f"{label}: boolean required")
    elif kind == "UIntSafe":
        if not isinstance(value, int) or isinstance(value, bool) or value < 0 or value > SAFE_MAX:
            fail("TYPE-MISMATCH", f"{label}: UIntSafe required")
        if value < spec["minimum"] or value > spec["maximum"]:
            fail("RANGE-ERROR", f"{label}: integer range")
    elif kind == "String":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: string required")
        try:
            assert_scalar_nfc(value, label)
        except ValueError as error:
            fail("FORMAT-ERROR", str(error))
        size = len(value.encode("utf-8"))
        if size < spec["minBytes"] or size > spec["maxBytes"]:
            fail("RANGE-ERROR", f"{label}: string range")
    elif kind == "Bytes32LowerHex":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: digest string required")
        if len(value) != 64 or any(character not in "0123456789abcdef" for character in value):
            fail("FORMAT-ERROR", f"{label}: digest format")
    elif kind == "CommitHex":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: commit string required")
        if len(value) not in (40, 64) or any(character not in "0123456789abcdef" for character in value):
            fail("FORMAT-ERROR", f"{label}: commit format")
    elif kind == "LogicalPath":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: path string required")
        if not valid_repo_path(value):
            fail("FORMAT-ERROR", f"{label}: path format")
    elif kind == "ContentId":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: content id string required")
        prefix = spec["prefix"] + "-"
        suffix = value[len(prefix):] if value.startswith(prefix) else ""
        if len(suffix) != 64 or any(character not in "0123456789abcdef" for character in suffix):
            fail("FORMAT-ERROR", f"{label}: content id format")
    elif kind == "Enum":
        if not isinstance(value, str):
            fail("TYPE-MISMATCH", f"{label}: enum string required")
        if value not in spec["values"]:
            fail("ENUM-MISMATCH", f"{label}: enum member")
    elif kind == "Array":
        if not isinstance(value, list):
            fail("TYPE-MISMATCH", f"{label}: array required")
        if len(value) < spec["minItems"] or len(value) > spec["maxItems"]:
            fail("RANGE-ERROR", f"{label}: array range")
        for index, member in enumerate(value):
            validate(member, spec["items"], schemas, f"{label}[{index}]", active)
        encoded = [canonical(member) for member in value]
        if spec["unique"] and len(set(encoded)) != len(encoded):
            fail("INVARIANT-MISMATCH", f"{label}: duplicate array member")
        if spec["sorted"] and encoded != sorted(encoded, key=lambda member: member.encode("utf-8")):
            fail("INVARIANT-MISMATCH", f"{label}: array order")
    elif kind == "Object":
        if not isinstance(value, dict):
            fail("TYPE-MISMATCH", f"{label}: object required")
        unknown = sorted(set(value.keys()) - set(spec["properties"].keys()))
        if unknown:
            fail("UNKNOWN-FIELD", f"{label}: unknown {unknown[0]}")
        missing = sorted(set(spec["required"]) - set(value.keys()))
        if missing:
            fail("MISSING-FIELD", f"{label}: missing {missing[0]}")
        for key in sorted(value.keys(), key=lambda member: member.encode("utf-8")):
            validate(value[key], spec["properties"][key], schemas, f"{label}.{key}", active)
    else:
        raise RuntimeError(f"{label}: Engine B unimplemented {kind}")


def identity_body(record, identity):
    if identity["mode"] == "EXCLUDE-IDENTITY-KEYS":
        return {key: value for key, value in record.items() if key not in (identity["idKey"], identity["rootKey"])}
    if identity["mode"] == "BODY-PATH":
        current = record
        for segment in identity["bodyPath"]:
            current = current[segment]
        return current
    raise RuntimeError(f"unknown identity mode {identity['mode']}")


def validate_invariants(record, schema):
    for invariant in schema["invariants"]:
        kind = invariant["kind"]
        accepted = False
        if kind == "ARRAY-LENGTH-EQUALS-FIELD":
            accepted = len(record[invariant["arrayField"]]) == record[invariant["numberField"]]
        elif kind == "NOT-EQUAL-FIELDS":
            accepted = canonical(record[invariant["left"]]) != canonical(record[invariant["right"]])
        elif kind == "LTE-FIELDS":
            accepted = record[invariant["left"]] <= record[invariant["right"]]
        elif kind == "SUBSET-ARRAY":
            superset = {canonical(member) for member in record[invariant["supersetField"]]}
            accepted = all(canonical(member) in superset for member in record[invariant["subsetField"]])
        if not accepted:
            fail("INVARIANT-MISMATCH", f"{schema['family']}: {kind}")


def validate_record(record, schema, schemas, active=None):
    validate(record, schema["rootSpec"], schemas, schema["family"], active)
    validate_invariants(record, schema)
    identity = schema["contentIdentity"]
    if identity is None:
        return None
    expected_root = root_v6(identity["typeTag"], identity["schemaVersion"], identity_body(record, identity))
    if record[identity["rootKey"]] != expected_root:
        fail("CONTENT-IDENTITY-MISMATCH", f"{schema['family']}: root mismatch")
    if identity["idKey"] is not None and record[identity["idKey"]] != f"{identity['prefix']}-{expected_root}":
        fail("CONTENT-IDENTITY-MISMATCH", f"{schema['family']}: id mismatch")
    return expected_root


def evaluate_fixture(fixture, schema, schemas):
    observed_status = "PASS"
    observed_terminal = "ACCEPT"
    content_root = None
    try:
        chunks = fixture["bytesBase64Chunks"]
        if not isinstance(chunks, list) or not chunks or any(not isinstance(chunk, str) or len(chunk) == 0 or len(chunk) > BASE64_CHUNK_CHAR_COUNT or (index < len(chunks) - 1 and len(chunk) != BASE64_CHUNK_CHAR_COUNT) for index, chunk in enumerate(chunks)):
            fail("FIXTURE-BYTES-INVALID", "fixture chunk framing mismatch")
        encoded = "".join(chunks)
        raw = base64.b64decode(encoded, validate=True)
        if base64.b64encode(raw).decode("ascii") != encoded or len(raw) != fixture["byteLength"] or sha256_bytes(raw) != fixture["sha256"]:
            fail("FIXTURE-BYTES-INVALID", "fixture byte binding mismatch")
        content_root = validate_record(parse_canonical_bytes(raw), schema, schemas)
    except EngineBError as error:
        observed_status = "BLOCK"
        observed_terminal = error.terminal
        content_root = None
    return {
        "contentRoot": content_root,
        "expectedStatus": fixture["expectedStatus"],
        "expectedTerminal": fixture["expectedTerminal"],
        "fixtureId": fixture["fixtureId"],
        "fixtureSha256": fixture["sha256"],
        "matchesExpectation": observed_status == fixture["expectedStatus"] and observed_terminal == fixture["expectedTerminal"] and content_root == fixture["expectedContentRoot"],
        "observedStatus": observed_status,
        "observedTerminal": observed_terminal,
        "schemaId": fixture["schemaId"],
    }


def attach_identity(prefix, type_tag, schema_version, body):
    root = root_v6(type_tag, schema_version, body)
    return {**body, "artifactId": f"{prefix}-{root}", "artifactRoot": root}


def make_report(registry, source_sha256, outcomes):
    mismatch_count = sum(1 for outcome in outcomes if not outcome["matchesExpectation"])
    body = {
        "actualMutationCount": registry["actualMutationCount"],
        "actualPositiveCount": registry["actualPositiveCount"],
        "claimLimit": "LOCAL-INDEPENDENT-CANONICAL-V3-EVIDENCE;NO-EXTERNAL-CLOSURE",
        "engineId": "CANONICAL-V3-ENGINE-B",
        "fixtureCollectionRoot": registry["fixtureCollectionRoot"],
        "futureConstructionCount": registry["futureConstructionCount"],
        "futureMutationCount": registry["futureMutationCount"],
        "implementation": "PYTHON-INDEPENDENT-REF-INVARIANT-VALIDATOR-V3",
        "mismatchCount": mismatch_count,
        "outcomeCount": len(outcomes),
        "outcomeRoot": root_v6("CANONICAL-V3-OUTCOME-COLLECTION", "CONNECT-TRD2-V6-CANONICAL-V3-OUTCOME-COLLECTION-V1", outcomes),
        "outcomes": outcomes,
        "registryRoot": registry["artifactRoot"],
        "schemaVersion": "CONNECT-TRD2-V6-CANONICAL-ENGINE-REPORT-V3",
        "sourceSha256": source_sha256,
        "status": "PASS" if mismatch_count == 0 else "BLOCKED",
    }
    return attach_identity("TRD2V6-CANONICAL-V3-REPORT", "CANONICAL-ENGINE-REPORT-V3", body["schemaVersion"], body)


def marker(part, prefix_lines):
    digest = sha256_bytes(("\n".join(prefix_lines) + "\n").encode("utf-8"))
    return f"__TRD2_V6_V3_ENGINE_B_PART_{part}_PREFIX_SHA256_{digest}__"


def patch_part(content, part):
    if part < 1 or part > PART_COUNT:
        raise RuntimeError(f"part must be 1..{PART_COUNT}")
    lines = content[:-1].split("\n") if content.endswith("\n") else content.split("\n")
    start = ((part - 1) * len(lines)) // PART_COUNT
    end = (part * len(lines)) // PART_COUNT
    chunk = lines[start:end]
    if part == 1:
        added = [*("+" + line for line in chunk), "+" + marker(part, lines[:end])]
        return f"*** Begin Patch\n*** Add File: {REPORT_B_PATH}\n" + "\n".join(added) + "\n*** End Patch\n"
    replacement = ["+" + line for line in chunk]
    if part < PART_COUNT:
        replacement.append("+" + marker(part, lines[:end]))
    return f"*** Begin Patch\n*** Update File: {REPORT_B_PATH}\n@@\n-{marker(part - 1, lines[:start])}\n" + "\n".join(replacement) + "\n*** End Patch\n"


def main():
    argument = next((value for value in sys.argv if value.startswith("--emit-patch-part=")), None)
    if argument is None:
        raise RuntimeError(f"use --emit-patch-part=N where N is 1..{PART_COUNT}")
    part = int(argument.split("=", 1)[1])
    assert_worktree(part)
    registry = json.loads(Path(REGISTRY_PATH).read_text(encoding="utf-8"), object_pairs_hook=pairs_object)
    if registry["schemaCount"] != 82 or registry["actualPositiveCount"] != 391 or registry["futureConstructionCount"] != 57 or registry["outputBindingCount"] != 30:
        raise RuntimeError("Engine B v3 registry denominator mismatch")
    source_sha256 = sha256_bytes(Path(SCRIPT_PATH).read_bytes())
    frozen = next((row for row in registry["provenance"]["toolchain"] if row["logicalPath"] == SCRIPT_PATH), None)
    if frozen is None or frozen["sha256"] != source_sha256:
        raise RuntimeError("Engine B v3 differs from frozen toolchain")
    schemas = {schema["schemaId"]: schema for schema in registry["schemas"]}
    outcomes = [evaluate_fixture(fixture, schemas[fixture["schemaId"]], schemas) for fixture in registry["fixtures"]]
    report = make_report(registry, source_sha256, outcomes)
    content = json.dumps(report, ensure_ascii=False, indent=2, separators=(",", ": ")) + "\n"
    sys.stdout.write(patch_part(content, part))


if __name__ == "__main__":
    main()
