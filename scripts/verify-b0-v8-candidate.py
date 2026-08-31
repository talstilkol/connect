#!/usr/bin/env python3
"""Cross-runtime structural Reader for the B0 v8 planning Candidate."""

from __future__ import annotations

import hashlib
import json
import os
import stat
import subprocess
from pathlib import Path, PurePosixPath
from typing import Any


DATE = "2026-08-30"
PATHS = {
    "manifest": f"docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-atomic-package-manifest-{DATE}.json",
    "registry": f"docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-normative-registry-{DATE}.json",
    "source_index": f"docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-frozen-source-index-{DATE}.json",
    "crosswalk": f"docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-closure-crosswalk-{DATE}.json",
    "corpus": f"docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v8-mutation-corpus-{DATE}.json",
}
FINDING_IDS = [f"B0V7-IHR-F{index:03d}" for index in range(1, 15)]
ALLOWED_PREFIXES = ("docs/planning/", "scripts/", "tests/")
SAFE_INTEGER_MAX = 9_007_199_254_740_991


def fail(message: str) -> None:
    raise ValueError(message)


def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            fail(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def assert_unicode_scalars(value: str, label: str) -> None:
    for character in value:
        codepoint = ord(character)
        if 0xD800 <= codepoint <= 0xDFFF:
            fail(f"{label}: surrogate code point forbidden")


def normalize_for_canonical(value: Any) -> Any:
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, str):
        assert_unicode_scalars(value, "canonical string")
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        if abs(value) > SAFE_INTEGER_MAX:
            fail("canonical integer outside safe range")
        return value
    if isinstance(value, float):
        fail("canonical floats forbidden")
    if isinstance(value, list):
        return [normalize_for_canonical(item) for item in value]
    if isinstance(value, dict):
        normalized: dict[str, Any] = {}
        for key in sorted(value.keys()):
            if not isinstance(key, str):
                fail("canonical object key must be string")
            assert_unicode_scalars(key, "canonical key")
            normalized[key] = normalize_for_canonical(value[key])
        return normalized
    fail(f"unsupported canonical type: {type(value).__name__}")


def canonical(value: Any) -> str:
    return json.dumps(normalize_for_canonical(value), ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def content_root(domain: str, value: Any) -> str:
    return sha256_bytes(f"{domain}\n{canonical(value)}".encode("utf-8"))


def assert_exact_keys(value: Any, expected: list[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail(f"{label}: expected object")
    if sorted(value.keys()) != sorted(expected):
        fail(f"{label}: exact keys mismatch")
    return value


def assert_repo_path(logical_path: str) -> None:
    if not isinstance(logical_path, str) or not logical_path.startswith(ALLOWED_PREFIXES):
        fail("logical path outside allowed prefixes")
    if logical_path.startswith("/") or "\\" in logical_path or "//" in logical_path:
        fail("logical path has forbidden separator")
    parts = logical_path.split("/")
    if any(part in ("", ".", "..") for part in parts):
        fail("logical path traversal")
    if str(PurePosixPath(logical_path)) != logical_path:
        fail("logical path is not canonical")


def read_regular_no_follow(repository_root: Path, logical_path: str, max_bytes_exclusive: int) -> tuple[bytes, os.stat_result]:
    assert_repo_path(logical_path)
    root_real = repository_root.resolve(strict=True)
    cursor = root_real
    parts = logical_path.split("/")
    for index, component in enumerate(parts):
        cursor = cursor / component
        observed = os.lstat(cursor)
        if stat.S_ISLNK(observed.st_mode):
            fail(f"symlink rejected: {logical_path}")
        if index < len(parts) - 1 and not stat.S_ISDIR(observed.st_mode):
            fail(f"non-directory ancestor: {logical_path}")
        if index == len(parts) - 1 and not stat.S_ISREG(observed.st_mode):
            fail(f"non-regular final file: {logical_path}")
    resolved = cursor.resolve(strict=True)
    try:
        resolved.relative_to(root_real)
    except ValueError as error:
        raise ValueError(f"path escapes repository: {logical_path}") from error
    before = os.stat(cursor, follow_symlinks=False)
    if before.st_nlink != 1:
        fail(f"hard-linked file rejected: {logical_path}")
    if before.st_size >= max_bytes_exclusive:
        fail(f"file exceeds byte limit: {logical_path}")
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(cursor, flags)
    try:
        opened = os.fstat(descriptor)
        if not stat.S_ISREG(opened.st_mode) or (opened.st_dev, opened.st_ino, opened.st_size) != (before.st_dev, before.st_ino, before.st_size):
            fail(f"file changed during open: {logical_path}")
        with os.fdopen(os.dup(descriptor), "rb") as stream:
            data = stream.read()
        if len(data) != opened.st_size:
            fail(f"short read: {logical_path}")
        return data, opened
    finally:
        os.close(descriptor)


def read_json(repository_root: Path, logical_path: str, max_bytes_exclusive: int = 25 * 1024 * 1024) -> tuple[dict[str, Any], bytes]:
    data, _ = read_regular_no_follow(repository_root, logical_path, max_bytes_exclusive)
    value = json.loads(data.decode("utf-8"), object_pairs_hook=reject_duplicate_keys)
    canonical(value)
    if not isinstance(value, dict):
        fail(f"{logical_path}: root must be object")
    return value, data


def read_git_blob_at_commit(repository_root: Path, commit_oid: str, logical_path: str, max_bytes_exclusive: int) -> tuple[bytes, int]:
    assert_repo_path(logical_path)
    tree = subprocess.run(
        ["git", "ls-tree", "-z", "--full-tree", commit_oid, "--", logical_path],
        cwd=repository_root,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    entries = [entry for entry in tree.stdout.split(b"\0") if entry]
    if len(entries) != 1:
        fail(f"Git source lookup must resolve exactly one entry: {logical_path}")
    metadata, observed_path = entries[0].split(b"\t", 1)
    mode, object_type, object_oid = metadata.decode("ascii").split(" ")
    if mode not in ("100644", "100755") or object_type != "blob" or observed_path.decode("utf-8") != logical_path:
        fail(f"Git source is not an exact regular blob: {logical_path}")
    blob = subprocess.run(
        ["git", "cat-file", "blob", object_oid],
        cwd=repository_root,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ).stdout
    if len(blob) >= max_bytes_exclusive:
        fail(f"Git source exceeds byte limit: {logical_path}")
    return blob, int(mode[-3:], 8)


def validate_manifest(repository_root: Path, manifest: dict[str, Any]) -> None:
    assert_exact_keys(manifest, ["artifactClass", "artifactId", "generatedAt", "maxMemberBytesExclusive", "maxTotalBytesInclusive", "memberCount", "members", "packageContentRoot", "packageId", "repositoryVisibility", "schemaVersion", "sourceCommit", "totalBytes"], "manifest")
    if manifest["repositoryVisibility"] != "PUBLIC" or manifest["schemaVersion"] != "CONNECT-B0-V8-PACKAGE-MANIFEST-V1":
        fail("manifest invariant mismatch")
    if not isinstance(manifest["members"], list) or len(manifest["members"]) != manifest["memberCount"]:
        fail("manifest member count mismatch")
    paths: set[str] = set()
    hashes: set[str] = set()
    roles: set[str] = set()
    total = 0
    for index, member in enumerate(manifest["members"]):
        assert_exact_keys(member, ["bytes", "logicalPath", "ordinal", "role", "sha256"], f"member[{index}]")
        if member["ordinal"] != index + 1:
            fail("manifest ordinal mismatch")
        if member["logicalPath"] in paths or member["sha256"] in hashes or member["role"] in roles:
            fail("manifest member uniqueness mismatch")
        paths.add(member["logicalPath"])
        hashes.add(member["sha256"])
        roles.add(member["role"])
        if member["logicalPath"].startswith(("scripts/", "tests/")):
            data, _ = read_git_blob_at_commit(repository_root, manifest["sourceCommit"], member["logicalPath"], manifest["maxMemberBytesExclusive"])
        else:
            data, _ = read_regular_no_follow(repository_root, member["logicalPath"], manifest["maxMemberBytesExclusive"])
        if len(data) != member["bytes"] or sha256_bytes(data) != member["sha256"]:
            fail(f"manifest member drift: {member['logicalPath']}")
        total += member["bytes"]
    if total != manifest["totalBytes"] or total > manifest["maxTotalBytesInclusive"]:
        fail("manifest total budget mismatch")
    projection = {"packageId": manifest["packageId"], "sourceCommit": manifest["sourceCommit"], "members": manifest["members"]}
    if content_root("CONNECT-B0-V8-PACKAGE-CONTENT-V1", projection) != manifest["packageContentRoot"]:
        fail("manifest package root mismatch")


def validate_registry(registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    top_keys = ["artifactClass", "artifactId", "authorityModel", "canonicalization", "currentState", "externalEvidence", "findingControls", "globalPolicy", "interfaceProvenancePolicy", "noSelfAcceptancePolicy", "pathPolicy", "permitPolicy", "predecessorPolicy", "recoveryPolicy", "repositoryVisibility", "schemaCatalog", "schemaVersion", "storagePolicy", "transactionModel"]
    assert_exact_keys(registry, top_keys, "registry")
    if registry["repositoryVisibility"] != "PUBLIC" or registry["schemaVersion"] != "CONNECT-B0-V8-NORMATIVE-REGISTRY-V1":
        fail("registry invariant mismatch")
    current = assert_exact_keys(registry["currentState"], ["acceptance", "authorityOutputs", "b0", "developmentFreeze", "externalClosureCount", "gate29", "localControlCount", "status"], "currentState")
    if current != {"acceptance": 0, "authorityOutputs": 0, "b0": "ABSENT", "developmentFreeze": "ACTIVE", "externalClosureCount": 0, "gate29": "BLOCKED", "localControlCount": 14, "status": "CANDIDATE-NOT-ACCEPTED"}:
        fail("registry current state overclaim")
    external = registry["externalEvidence"]
    for key in ("authenticatedPublicRemoteReceiptPresent", "independentReviewerReceiptPresent", "operationalEvidencePresent", "productionKeysGenerated", "trustedTimePresent"):
        if external[key] is not False:
            fail("registry external evidence overclaim")
    if external["signatureAlgorithmSelection"] != "UNSELECTED-PER-USE-APPROVAL-REQUIRED":
        fail("unapproved signature selection")
    authority = registry["authorityModel"]
    if authority["workOwner"] != "Tal" or authority["ownerCount"] != 1 or authority["primaryBackupModel"] != "REMOVED" or authority["controllerSeparationSatisfied"] is not False or authority["currentAppointments"] != []:
        fail("registry authority state mismatch")
    predecessor = registry["predecessorPolicy"]
    if predecessor["activeFindingCount"] != 38 or predecessor["behaviorOracleComplete"] is not False or predecessor["closureTransfer"] != 0:
        fail("predecessor closure overclaim")
    controls = registry["findingControls"]
    if len(controls) != 14 or [row["findingId"] for row in controls] != FINDING_IDS:
        fail("finding control identity mismatch")
    for row in controls:
        if row["localStatus"] != "IMPLEMENTED-CANDIDATE" or row["closureStatus"] != "OPEN-PENDING-INDEPENDENT-EVIDENCE":
            fail("finding closure overclaim")
    schemas: dict[str, dict[str, Any]] = {}
    for schema in registry["schemaCatalog"]:
        assert_exact_keys(schema, ["additionalProperties", "nullableKeys", "requiredKeys", "schemaId", "schemaRoot"], "schema")
        base = {"additionalProperties": schema["additionalProperties"], "nullableKeys": schema["nullableKeys"], "requiredKeys": schema["requiredKeys"], "schemaId": schema["schemaId"]}
        if schema["additionalProperties"] is not False or sorted(set(schema["requiredKeys"])) != schema["requiredKeys"] or sorted(set(schema["nullableKeys"])) != schema["nullableKeys"] or content_root("CONNECT-B0-V8-CLOSED-SCHEMA-V1", base) != schema["schemaRoot"]:
            fail("closed schema mismatch")
        if schema["schemaId"] in schemas:
            fail("duplicate schema ID")
        schemas[schema["schemaId"]] = schema
    return schemas


def validate_against_schema(value: dict[str, Any], schemas: dict[str, dict[str, Any]], schema_id: str, label: str) -> None:
    schema = schemas.get(schema_id)
    if schema is None:
        fail(f"missing schema: {schema_id}")
    assert_exact_keys(value, schema["requiredKeys"], label)
    for key in schema["requiredKeys"]:
        if value[key] is None and key not in schema["nullableKeys"]:
            fail(f"{label}: forbidden null")


def validate_source_index(repository_root: Path, source_index: dict[str, Any], schemas: dict[str, dict[str, Any]], source_commit: str) -> None:
    validate_against_schema(source_index, schemas, "B0V8-SOURCE-INDEX", "sourceIndex")
    rows = source_index["sourceRows"]
    if source_index["repositoryVisibility"] != "PUBLIC" or source_index["sourceCount"] != len(rows) or len(rows) < 9:
        fail("source index count mismatch")
    paths: set[str] = set()
    hashes: set[str] = set()
    for index, row in enumerate(rows):
        validate_against_schema(row, schemas, "B0V8-SOURCE-ROW", f"sourceRow[{index}]")
        if row["ordinal"] != index + 1 or row["logicalPath"] in paths or row["sha256"] in hashes:
            fail("source row order/uniqueness mismatch")
        paths.add(row["logicalPath"])
        hashes.add(row["sha256"])
        data, observed_mode = read_git_blob_at_commit(repository_root, source_commit, row["logicalPath"], 50 * 1024 * 1024)
        if len(data) != row["bytes"] or sha256_bytes(data) != row["sha256"] or observed_mode != row["mode"]:
            fail(f"source drift: {row['logicalPath']}")
    if content_root("CONNECT-B0-V8-FROZEN-SOURCE-SET-V1", rows) != source_index["sourceSetRoot"]:
        fail("source set root mismatch")


def validate_crosswalk(crosswalk: dict[str, Any], schemas: dict[str, dict[str, Any]]) -> None:
    validate_against_schema(crosswalk, schemas, "B0V8-CLOSURE-CROSSWALK", "crosswalk")
    rows = crosswalk["rows"]
    if crosswalk["findingCount"] != 14 or crosswalk["closureCount"] != 0 or len(rows) != 14:
        fail("crosswalk count mismatch")
    for index, row in enumerate(rows):
        validate_against_schema(row, schemas, "B0V8-CLOSURE-ROW", f"crosswalkRow[{index}]")
        if row["ordinal"] != index + 1 or row["findingId"] != FINDING_IDS[index] or row["localStatus"] != "IMPLEMENTED-CANDIDATE" or row["closureStatus"] != "OPEN-PENDING-INDEPENDENT-EVIDENCE":
            fail("crosswalk row mismatch")
    base = {key: value for key, value in crosswalk.items() if key != "crosswalkRoot"}
    if content_root("CONNECT-B0-V8-CLOSURE-CROSSWALK-V1", base) != crosswalk["crosswalkRoot"]:
        fail("crosswalk root mismatch")


def validate_corpus(corpus: dict[str, Any], schemas: dict[str, dict[str, Any]]) -> None:
    validate_against_schema(corpus, schemas, "B0V8-MUTATION-CORPUS", "corpus")
    rows = corpus["cases"]
    if corpus["caseCount"] != 14 or corpus["blockedCount"] != 14 or len(rows) != 14:
        fail("corpus count mismatch")
    for index, row in enumerate(rows):
        validate_against_schema(row, schemas, "B0V8-MUTATION-CASE", f"mutation[{index}]")
        if row["ordinal"] != index + 1 or row["findingId"] != FINDING_IDS[index] or row["actual"] != "BLOCK":
            fail("mutation row mismatch")
        base = {key: value for key, value in row.items() if key != "testRoot"}
        if content_root("CONNECT-B0-V8-MUTATION-RESULT-V1", base) != row["testRoot"]:
            fail("mutation result root mismatch")
    base = {key: value for key, value in corpus.items() if key != "corpusRoot"}
    if content_root("CONNECT-B0-V8-MUTATION-CORPUS-V1", base) != corpus["corpusRoot"]:
        fail("corpus root mismatch")


def main() -> None:
    repository_root = Path.cwd()
    manifest, _ = read_json(repository_root, PATHS["manifest"])
    validate_manifest(repository_root, manifest)
    registry, _ = read_json(repository_root, PATHS["registry"])
    schemas = validate_registry(registry)
    source_index, _ = read_json(repository_root, PATHS["source_index"])
    crosswalk, _ = read_json(repository_root, PATHS["crosswalk"])
    corpus, _ = read_json(repository_root, PATHS["corpus"])
    validate_source_index(repository_root, source_index, schemas, manifest["sourceCommit"])
    validate_crosswalk(crosswalk, schemas)
    validate_corpus(corpus, schemas)
    reader_member = next((member for member in manifest["members"] if member["role"] == "B0V8-PYTHON-STRUCTURAL-READER"), None)
    if reader_member is None:
        fail("Reader B is not pinned by manifest")
    report_base = {
        "artifactClass": "CROSS-RUNTIME-STRUCTURAL-READER-B-NOT-INDEPENDENT-NOT-ACCEPTANCE",
        "artifactId": "CONNECT-B0-V8-QA-READER-B-REPORT-2026-08-30-G0",
        "b0": "ABSENT",
        "closureCount": 0,
        "corpusRoot": corpus["corpusRoot"],
        "findingCount": crosswalk["findingCount"],
        "gate29": "BLOCKED",
        "memberCount": manifest["memberCount"],
        "mutationBlockedCount": corpus["blockedCount"],
        "packageContentRoot": manifest["packageContentRoot"],
        "readerArtifactSha256": reader_member["sha256"],
        "result": "PASS-STRUCTURAL-CANDIDATE-NOT-ACCEPTED",
        "sourceCommit": manifest["sourceCommit"],
        "sourceSetRoot": source_index["sourceSetRoot"],
    }
    report = {**report_base, "reportRoot": content_root("CONNECT-B0-V8-QA-READER-B-REPORT-V1", report_base)}
    print(json.dumps(report, ensure_ascii=False, separators=(",", ":"), sort_keys=True))


if __name__ == "__main__":
    main()
