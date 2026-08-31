#!/usr/bin/env python3

import base64
import hashlib
import json
import re
import struct
import subprocess
import sys
import unicodedata
from pathlib import Path

DIRECTORY = "docs/planning/trd2-v6-candidate-2026-08-30"
SOURCE_CAPTURE_PATH = f"{DIRECTORY}/source-capture-manifest.json"
CORPUS_PATH = f"{DIRECTORY}/parser-grammar-and-corpus.json"
RECEIPT_PATH = f"{DIRECTORY}/generation-receipt.json"
PARSER_A_PATH = f"{DIRECTORY}/parser-engine-a-report.json"
REPORT_PATH = f"{DIRECTORY}/parser-engine-b-report.json"
SCRIPT_PATH = "scripts/verify-trd2-v6-parser-b.py"
FIXTURE_SCHEMA = "CONNECT-TRD2-V6-PARSER-FIXTURE-V1"
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class ParseFailure(Exception):
    def __init__(self, terminal, message):
        super().__init__(message)
        self.terminal = terminal


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def validate_unicode(value, label="string"):
    if not isinstance(value, str):
        raise ValueError(f"{label}: expected string")
    for character in value:
        code = ord(character)
        if 0xD800 <= code <= 0xDFFF:
            raise ParseFailure("UNICODE-SCALAR-INVALID", f"{label}: surrogate code point")
    if unicodedata.normalize("NFC", value) != value:
        raise ParseFailure("UNICODE-NORMALIZATION-INVALID", f"{label}: NFC required")
    return value


def canonical(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        validate_unicode(value)
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, int) and not isinstance(value, bool):
        if not -(2**53 - 1) <= value <= 2**53 - 1:
            raise ValueError("canonical number must be a safe integer")
        return str(value)
    if isinstance(value, list):
        return "[" + ",".join(canonical(item) for item in value) + "]"
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            raise ValueError("canonical object keys must be strings")
        keys = sorted(value.keys(), key=lambda key: key.encode("utf-8"))
        return "{" + ",".join(canonical(key) + ":" + canonical(value[key]) for key in keys) + "}"
    raise ValueError(f"unsupported canonical type: {type(value).__name__}")


def root_v6(type_tag, schema_version, value):
    validate_unicode(type_tag, "typeTag")
    validate_unicode(schema_version, "schemaVersion")
    type_bytes = type_tag.encode("utf-8")
    schema_bytes = schema_version.encode("utf-8")
    body_bytes = canonical(value).encode("utf-8")
    preimage = (
        b"CONNECT-TRD2-V6-ROOT-V1\x00"
        + struct.pack(">I", len(type_bytes))
        + type_bytes
        + struct.pack(">I", len(schema_bytes))
        + schema_bytes
        + struct.pack(">Q", len(body_bytes))
        + body_bytes
    )
    return sha256_bytes(preimage)


def validate_content_identity(value, prefix, type_tag, schema_version, id_key="artifactId", root_key="artifactRoot"):
    if not isinstance(value, dict):
        raise ValueError(f"{type_tag}: expected object")
    body = {key: item for key, item in value.items() if key not in (id_key, root_key)}
    expected_root = root_v6(type_tag, schema_version, body)
    if value.get(root_key) != expected_root or value.get(id_key) != f"{prefix}-{expected_root}":
        raise ValueError(f"{type_tag}: content identity mismatch")
    return value


def object_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ParseFailure("DUPLICATE-KEY", f"duplicate key {key}")
        result[key] = value
    return result


def parse_integer(token):
    value = int(token)
    if not -(2**53 - 1) <= value <= 2**53 - 1:
        raise ParseFailure("NUMBER-DOMAIN-INVALID", "integer outside safe range")
    return value


def parse_float_as_integer(token):
    try:
        value = float(token)
    except ValueError as error:
        raise ParseFailure("NUMBER-DOMAIN-INVALID", "invalid float") from error
    if not value.is_integer() or not -(2**53 - 1) <= value <= 2**53 - 1:
        raise ParseFailure("NUMBER-DOMAIN-INVALID", "number does not decode to a safe integer")
    return int(value)


def reject_constant(token):
    raise ParseFailure("NUMBER-DOMAIN-INVALID", f"unsupported number constant {token}")


def validate_all_unicode(value):
    if isinstance(value, str):
        validate_unicode(value)
    elif isinstance(value, list):
        for item in value:
            validate_all_unicode(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            validate_unicode(key)
            validate_all_unicode(item)


def parse_canonical_json_bytes(value):
    try:
        text = value.decode("utf-8", errors="strict")
    except UnicodeDecodeError as error:
        raise ParseFailure("UTF8-INVALID", "input is not valid UTF-8") from error
    try:
        decoded = json.loads(
            text,
            object_pairs_hook=object_pairs,
            parse_int=parse_integer,
            parse_float=parse_float_as_integer,
            parse_constant=reject_constant,
        )
    except ParseFailure:
        raise
    except (json.JSONDecodeError, UnicodeError, ValueError) as error:
        raise ParseFailure("JSON-SYNTAX-ERROR", "invalid JSON syntax") from error
    validate_all_unicode(decoded)
    try:
        canonical_bytes = canonical(decoded).encode("utf-8")
    except ParseFailure:
        raise
    if value != canonical_bytes:
        raise ParseFailure("NON-CANONICAL-ENCODING", "input differs from canonical encoding")
    return decoded


def validate_fixture_envelope(value):
    if not isinstance(value, dict):
        raise ParseFailure("SCHEMA-TYPE-ERROR", "fixture envelope must be an object")
    expected_top = ["kind", "ordinal", "payload", "schemaVersion"]
    extra_top = [key for key in value if key not in expected_top]
    if extra_top:
        raise ParseFailure("UNKNOWN-FIELD", f"unknown top-level field {extra_top[0]}")
    missing_top = [key for key in expected_top if key not in value]
    if missing_top:
        raise ParseFailure("MISSING-FIELD", f"missing top-level field {missing_top[0]}")
    if value["schemaVersion"] != FIXTURE_SCHEMA:
        raise ParseFailure("SCHEMA-VALUE-ERROR", "wrong fixture schemaVersion")
    if value["kind"] not in ("FINDING", "REQUIREMENT"):
        raise ParseFailure("SCHEMA-VALUE-ERROR", "unsupported fixture kind")
    if isinstance(value["ordinal"], bool) or not isinstance(value["ordinal"], int) or not 1 <= value["ordinal"] <= 999999:
        raise ParseFailure("SCHEMA-TYPE-ERROR", "ordinal outside UIntSafe range")
    payload = value["payload"]
    if not isinstance(payload, dict):
        raise ParseFailure("SCHEMA-TYPE-ERROR", "payload must be an object")
    expected_payload = ["claim", "enabled", "evidenceRoots"]
    extra_payload = [key for key in payload if key not in expected_payload]
    if extra_payload:
        raise ParseFailure("UNKNOWN-FIELD", f"unknown payload field {extra_payload[0]}")
    missing_payload = [key for key in expected_payload if key not in payload]
    if missing_payload:
        raise ParseFailure("MISSING-FIELD", f"missing payload field {missing_payload[0]}")
    if not isinstance(payload["claim"], str) or not 1 <= len(payload["claim"].encode("utf-8")) <= 512:
        raise ParseFailure("SCHEMA-TYPE-ERROR", "claim must be a bounded non-empty string")
    if not isinstance(payload["enabled"], bool):
        raise ParseFailure("SCHEMA-TYPE-ERROR", "enabled must be boolean")
    roots = payload["evidenceRoots"]
    if not isinstance(roots, list) or not 1 <= len(roots) <= 8:
        raise ParseFailure("SCHEMA-TYPE-ERROR", "evidenceRoots must contain 1..8 roots")
    if any(not isinstance(root, str) or not SHA256_RE.fullmatch(root) for root in roots):
        raise ParseFailure("SCHEMA-TYPE-ERROR", "evidenceRoots member is not SHA-256")
    if len(set(roots)) != len(roots) or roots != sorted(roots):
        raise ParseFailure("SCHEMA-INVARIANT-ERROR", "evidenceRoots must be unique and sorted")
    return value


def execute_fixture(value):
    try:
        decoded = validate_fixture_envelope(parse_canonical_json_bytes(value))
        return {
            "decodedRoot": root_v6("PARSER-TYPED-MAP", FIXTURE_SCHEMA, decoded),
            "status": "PASS",
            "terminal": "NONE",
            "value": decoded,
        }
    except ParseFailure as error:
        return {"decodedRoot": None, "status": "BLOCKED", "terminal": error.terminal, "value": None}


def validate_fixture_record(record):
    validate_content_identity(
        record,
        "TRD2V6-FIXTURE",
        "PARSER-FIXTURE",
        "CONNECT-TRD2-V6-PARSER-CORPUS-RECORD-V1",
        "fixtureId",
        "fixtureRoot",
    )
    try:
        value = base64.b64decode(record["bytesBase64"], validate=True)
    except (ValueError, base64.binascii.Error) as error:
        raise ValueError("fixture base64 is invalid") from error
    if base64.b64encode(value).decode("ascii") != record["bytesBase64"]:
        raise ValueError("fixture base64 is non-canonical")
    if len(value) != record["byteLength"] or sha256_bytes(value) != record["sha256"]:
        raise ValueError("fixture byte identity mismatch")
    if (
        record["captureId"] != f"TRD2V6-FIXTURE-CAPTURE-{record['sha256']}"
        or record["captureSha256"] != record["sha256"]
        or record["startByte"] != 0
        or record["endByte"] != record["byteLength"]
    ):
        raise ValueError("fixture capture identity mismatch")
    observed = execute_fixture(value)
    if (
        observed["status"] != record["expectedStatus"]
        or observed["terminal"] != record["expectedTerminal"]
        or observed["decodedRoot"] != record["expectedDecodedRoot"]
        or canonical(observed["value"]) != canonical(record["expectedTypedMap"])
    ):
        raise ValueError(f"fixture outcome mismatch for {record['mutation']}: {observed}")
    return value


def validate_corpus(artifact):
    schema = "CONNECT-TRD2-V6-PARSER-GRAMMAR-AND-CORPUS-V1"
    if artifact.get("schemaVersion") != schema:
        raise ValueError("parser corpus schema mismatch")
    validate_content_identity(artifact, "TRD2V6-PARSER-CORPUS", "PARSER-GRAMMAR-AND-CORPUS", schema)
    validate_content_identity(
        artifact["grammar"],
        "TRD2V6-GRAMMAR",
        "PARSER-GRAMMAR",
        "CONNECT-TRD2-V6-PARSER-GRAMMAR-V1",
        "grammarId",
        "grammarRoot",
    )
    validate_content_identity(
        artifact["fixtureSchema"],
        "TRD2V6-SCHEMA",
        "PARSER-FIXTURE-SCHEMA",
        "CONNECT-TRD2-V6-PARSER-FIXTURE-SCHEMA-V1",
        "schemaId",
        "schemaRoot",
    )
    positives = artifact["positiveFixtures"]
    negatives = artifact["negativeFixtures"]
    if artifact["positiveFixtureCount"] != len(positives) or artifact["negativeFixtureCount"] != len(negatives):
        raise ValueError("parser corpus count mismatch")
    fixtures = positives + negatives
    for fixture in fixtures:
        validate_fixture_record(fixture)
    if len({fixture["fixtureId"] for fixture in fixtures}) != len(fixtures):
        raise ValueError("duplicate fixture identity")
    expected_root = root_v6("PARSER-FIXTURE-COLLECTION", "CONNECT-TRD2-V6-PARSER-CORPUS-V1", fixtures)
    if artifact["fixtureCollectionRoot"] != expected_root:
        raise ValueError("fixture collection root mismatch")
    return artifact


def run_git(arguments):
    result = subprocess.run(["git", *arguments], check=False, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"git {' '.join(arguments)} failed: {result.stderr.decode('utf-8', errors='replace').strip()}")
    return result.stdout


def assert_expected_worktree():
    records = [record for record in run_git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]).decode("utf-8").split("\x00") if record]
    observed = {record[3:] for record in records}
    required = {SOURCE_CAPTURE_PATH, CORPUS_PATH, RECEIPT_PATH}
    allowed = required | {PARSER_A_PATH}
    if not required.issubset(observed) or not observed.issubset(allowed) or len(observed) not in (3, 4):
        raise RuntimeError("Parser B requires the three Pass 1 base outputs and optionally the Parser A report")
    if Path(REPORT_PATH).exists():
        raise RuntimeError("Parser B report already exists")


def attach_identity(prefix, type_tag, schema_version, body):
    artifact_root = root_v6(type_tag, schema_version, body)
    return {**body, "artifactId": f"{prefix}-{artifact_root}", "artifactRoot": artifact_root}


def patch_for(logical_path, content):
    lines = content[:-1].split("\n") if content.endswith("\n") else content.split("\n")
    return "*** Begin Patch\n*** Add File: " + logical_path + "\n" + "\n".join("+" + line for line in lines) + "\n*** End Patch\n"


def main():
    if "--emit-patch" not in sys.argv[1:]:
        raise RuntimeError("use --emit-patch; Parser B never writes repository files directly")
    assert_expected_worktree()
    artifact = validate_corpus(json.loads(Path(CORPUS_PATH).read_text(encoding="utf-8")))
    receipt = json.loads(Path(RECEIPT_PATH).read_text(encoding="utf-8"))
    validate_content_identity(
        receipt,
        "TRD2V6-GENERATION-RECEIPT",
        "PASS1-GENERATION-RECEIPT",
        "CONNECT-TRD2-V6-PASS1-GENERATION-RECEIPT-V1",
    )
    generated = next((row for row in receipt["generatedArtifacts"] if row["logicalPath"] == CORPUS_PATH), None)
    if generated is None or generated["artifactRoot"] != artifact["artifactRoot"]:
        raise RuntimeError("Parser B corpus is not bound by the generation receipt")
    source_sha256 = sha256_bytes(Path(SCRIPT_PATH).read_bytes())
    frozen_source = next((row for row in receipt["toolchain"] if row["logicalPath"] == SCRIPT_PATH), None)
    if frozen_source is None or frozen_source["sha256"] != source_sha256:
        raise RuntimeError("Parser B source differs from the frozen toolchain")
    fixtures = artifact["positiveFixtures"] + artifact["negativeFixtures"]
    outcomes = []
    for fixture in fixtures:
        value = base64.b64decode(fixture["bytesBase64"], validate=True)
        observed = execute_fixture(value)
        outcomes.append({
            "decodedRoot": observed["decodedRoot"],
            "expectedStatus": fixture["expectedStatus"],
            "expectedTerminal": fixture["expectedTerminal"],
            "fixtureId": fixture["fixtureId"],
            "fixtureSha256": fixture["sha256"],
            "observedStatus": observed["status"],
            "observedTerminal": observed["terminal"],
        })
    mismatch_count = sum(
        row["expectedStatus"] != row["observedStatus"]
        or row["expectedTerminal"] != row["observedTerminal"]
        or row["decodedRoot"] != fixtures[index]["expectedDecodedRoot"]
        for index, row in enumerate(outcomes)
    )
    body = {
        "artifactClass": "PRODUCER-ONLY; LOCAL-PARSER-REPORT; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE",
        "claimLimit": "MECHANICAL-PARSER-AGREEMENT-ONLY; EXTERNAL-CLOSURE-CREDIT-ZERO",
        "corpusRoot": artifact["artifactRoot"],
        "fixtureCollectionRoot": artifact["fixtureCollectionRoot"],
        "implementation": "PYTHON-STDLIB-OBJECT-PAIRS-STRICT-CANONICAL-V1",
        "mismatchCount": mismatch_count,
        "outcomeCount": len(outcomes),
        "outcomeRoot": root_v6("PARSER-OUTCOME-COLLECTION", "CONNECT-TRD2-V6-PARSER-REPORT-V1", outcomes),
        "outcomes": outcomes,
        "parserId": "PARSER-B",
        "schemaVersion": "CONNECT-TRD2-V6-PARSER-REPORT-V1",
        "sourceSha256": source_sha256,
        "status": "PASS-LOCAL-CANDIDATE-NOT-ACCEPTED" if mismatch_count == 0 else "BLOCKED-PARSER-DISAGREEMENT",
        "toolchainRoot": receipt["toolchainRoot"],
    }
    report = attach_identity("TRD2V6-PARSER-REPORT", "PARSER-REPORT", body["schemaVersion"], body)
    content = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    sys.stdout.write(patch_for(REPORT_PATH, content))


if __name__ == "__main__":
    main()
