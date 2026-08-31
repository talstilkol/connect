#!/usr/bin/env python3

import base64
import hashlib
import json
import struct
import subprocess
import sys
import unicodedata
from pathlib import Path


REGISTRY_PATH = "docs/planning/trd2-v6-candidate-v2-2026-08-31/closed-schema-registry-v2.json"
REPORT_A_PATH = "docs/planning/trd2-v6-candidate-v2-2026-08-31/canonical-engine-a-report-v2.json"
REPORT_B_PATH = "docs/planning/trd2-v6-candidate-v2-2026-08-31/canonical-engine-b-report-v2.json"
SCRIPT_PATH = "scripts/verify-trd2-v6-canonical-v2-engine-b.py"
SAFE_MAX = 9007199254740991


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


def assert_expected_worktree():
    raw = run_git(["status", "--porcelain=v1", "-z", "--untracked-files=all"])
    records = [record for record in raw.decode("utf-8").split("\0") if record]
    paths = [record[3:] for record in records]
    if set(paths) != {REGISTRY_PATH, REPORT_A_PATH} or len(paths) != 2 or Path(REPORT_B_PATH).exists():
        raise RuntimeError("Canonical Engine B v2 requires exactly the registry and Engine A report")


def assert_scalar_nfc(value, label):
    if not isinstance(value, str):
        raise ValueError(f"{label}: expected string")
    try:
        value.encode("utf-8", errors="strict")
    except UnicodeEncodeError as error:
        raise ValueError(f"{label}: Unicode scalar required") from error
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
    parsed = json.loads(
        text,
        object_pairs_hook=pairs_object,
        parse_float=reject_float,
        parse_constant=reject_float,
    )
    if canonical(parsed).encode("utf-8") != value:
        raise ValueError("fixture bytes are not canonical JSON")
    return parsed


def valid_repo_path(value):
    if not isinstance(value, str) or value.startswith("/") or "\\" in value or "//" in value:
        return False
    if value != "package.json" and not value.startswith(("docs/planning/", "scripts/", "tests/")):
        return False
    return all(segment not in ("", ".", "..") for segment in value.split("/"))


def validate(value, spec, label="$"):
    kind = spec["kind"]
    if value is None and kind not in ("Null", "Nullable") and not (kind == "Const" and spec["value"] is None):
        fail("NULLABILITY-MISMATCH", f"{label}: null forbidden")
    if kind == "Null":
        if value is not None:
            fail("TYPE-MISMATCH", f"{label}: null required")
    elif kind == "Nullable":
        if value is not None:
            validate(value, spec["inner"], label)
    elif kind == "OneOf":
        accepted = 0
        for branch in spec["variants"]:
            try:
                validate(value, branch, label)
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
            validate(member, spec["items"], f"{label}[{index}]")
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
            validate(value[key], spec["properties"][key], f"{label}.{key}")
    else:
        raise RuntimeError(f"{label}: Engine B unimplemented kind {kind}")


def value_at(value, path):
    current = value
    for segment in path:
        current = current[segment]
    return current


def validate_identity(record, identity):
    if identity is None:
        return None
    if identity["mode"] == "EXCLUDE-IDENTITY-KEYS":
        body = {key: member for key, member in record.items() if key not in (identity["idKey"], identity["rootKey"])}
    elif identity["mode"] == "BODY-PATH":
        body = value_at(record, identity["bodyPath"])
    else:
        raise RuntimeError(f"unknown identity mode {identity['mode']}")
    expected_root = root_v6(identity["typeTag"], identity["schemaVersion"], body)
    if record[identity["rootKey"]] != expected_root:
        fail("CONTENT-IDENTITY-MISMATCH", "content root mismatch")
    if identity["idKey"] is not None and record[identity["idKey"]] != f"{identity['prefix']}-{expected_root}":
        fail("CONTENT-IDENTITY-MISMATCH", "content id mismatch")
    return expected_root


def evaluate_fixture(fixture, schema):
    observed_status = "PASS"
    observed_terminal = "ACCEPT"
    content_root = None
    try:
        raw = base64.b64decode(fixture["bytesBase64"], validate=True)
        if base64.b64encode(raw).decode("ascii") != fixture["bytesBase64"] or len(raw) != fixture["byteLength"] or sha256_bytes(raw) != fixture["sha256"]:
            fail("FIXTURE-BYTES-INVALID", "fixture byte binding mismatch")
        value = parse_canonical_bytes(raw)
        validate(value, schema["rootSpec"], schema["family"])
        content_root = validate_identity(value, schema["contentIdentity"])
    except EngineBError as error:
        observed_status = "BLOCK"
        observed_terminal = error.terminal
        content_root = None
    matches = (
        observed_status == fixture["expectedStatus"]
        and observed_terminal == fixture["expectedTerminal"]
        and content_root == fixture["expectedContentRoot"]
    )
    return {
        "contentRoot": content_root,
        "expectedStatus": fixture["expectedStatus"],
        "expectedTerminal": fixture["expectedTerminal"],
        "fixtureId": fixture["fixtureId"],
        "fixtureSha256": fixture["sha256"],
        "matchesExpectation": matches,
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
        "actualPositiveCount": registry["actualPositiveCount"],
        "claimLimit": "LOCAL-INDEPENDENT-CANONICAL-ENGINE-EVIDENCE;NO-EXTERNAL-CLOSURE",
        "engineId": "CANONICAL-V2-ENGINE-B",
        "fixtureCollectionRoot": registry["fixtureCollectionRoot"],
        "implementation": "PYTHON-INDEPENDENT-RECURSIVE-CLOSED-VALIDATOR-V2",
        "mismatchCount": mismatch_count,
        "mutationFixtureCount": registry["mutationFixtureCount"],
        "outcomeCount": len(outcomes),
        "outcomeRoot": root_v6("CANONICAL-V2-OUTCOME-COLLECTION", "CONNECT-TRD2-V6-CANONICAL-V2-OUTCOME-COLLECTION-V1", outcomes),
        "outcomes": outcomes,
        "registryRoot": registry["artifactRoot"],
        "schemaVersion": "CONNECT-TRD2-V6-CANONICAL-ENGINE-REPORT-V2",
        "sourceSha256": source_sha256,
        "status": "PASS" if mismatch_count == 0 else "BLOCKED",
    }
    return attach_identity("TRD2V6-CANONICAL-V2-REPORT", "CANONICAL-ENGINE-REPORT-V2", body["schemaVersion"], body)


def patch_for(content):
    lines = content[:-1].split("\n") if content.endswith("\n") else content.split("\n")
    return "*** Begin Patch\n*** Add File: " + REPORT_B_PATH + "\n" + "\n".join("+" + line for line in lines) + "\n*** End Patch\n"


def main():
    if "--emit-patch" not in sys.argv:
        raise RuntimeError("use --emit-patch; Canonical Engine B v2 never writes repository files directly")
    assert_expected_worktree()
    registry = json.loads(Path(REGISTRY_PATH).read_text(encoding="utf-8"), object_pairs_hook=pairs_object)
    source_sha256 = sha256_bytes(Path(SCRIPT_PATH).read_bytes())
    frozen = next((row for row in registry["provenance"]["toolchain"] if row["logicalPath"] == SCRIPT_PATH), None)
    if frozen is None or frozen["sha256"] != source_sha256:
        raise RuntimeError("Canonical Engine B v2 source differs from frozen toolchain")
    schemas = {schema["schemaId"]: schema for schema in registry["schemas"]}
    outcomes = [evaluate_fixture(fixture, schemas[fixture["schemaId"]]) for fixture in registry["fixtures"]]
    report = make_report(registry, source_sha256, outcomes)
    content = json.dumps(report, ensure_ascii=False, indent=2, separators=(",", ": ")) + "\n"
    sys.stdout.write(patch_for(content))


if __name__ == "__main__":
    main()
