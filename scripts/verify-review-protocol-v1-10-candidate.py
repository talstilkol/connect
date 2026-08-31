#!/usr/bin/env python3
"""Cross-runtime structural Reader for Review Protocol v1.10 Candidate."""

from __future__ import annotations

import hashlib
import json
import os
import stat
import subprocess
from pathlib import Path, PurePosixPath
from typing import Any


DATE = "2026-08-30"
PACKAGE_DIR = f"docs/planning/three-review-protocol-v1-10-g1-package-{DATE}"
PATHS = {
    "manifest": f"{PACKAGE_DIR}/normative-package-manifest.json",
    "registry": f"{PACKAGE_DIR}/normative-registry.json",
    "source": f"{PACKAGE_DIR}/frozen-source-index.json",
    "crosswalk": f"{PACKAGE_DIR}/closure-crosswalk.json",
    "corpus": f"{PACKAGE_DIR}/mutation-corpus.json",
}
FINDINGS = [f"MPRR-V19-IHR-F{index:03d}" for index in range(1, 18)]
VALIDATORS = [
    "VALIDATOR-PACKAGE", "VALIDATOR-FROZEN-SOURCES", "VALIDATOR-SCHEMAS", "VALIDATOR-CLOSURE", "VALIDATOR-SEMANTIC-ENTAILMENT",
    "VALIDATOR-PREDECESSOR-BEHAVIOR", "VALIDATOR-CAUSAL-TRACE", "VALIDATOR-APPOINTMENTS", "VALIDATOR-EXTERNAL-SIGNATURES", "VALIDATOR-SCANNERS",
    "VALIDATOR-REMOTE-PUBLIC", "VALIDATOR-CAS", "VALIDATOR-RECOVERY", "VALIDATOR-TIME-REVOCATION-FINALITY", "VALIDATOR-THREE-REVIEWS-AND-HUMAN-APPROVAL",
]
ROLES = ["ROLE-PRODUCER-01", "ROLE-REVIEWER-01", "ROLE-REVIEWER-02", "ROLE-REVIEWER-03", "ROLE-RECONCILER-01", "ROLE-APPROVER-01", "ROLE-PERMIT-ISSUER-01"]
ALLOWED_PREFIXES = ("docs/planning/", "scripts/", "tests/")
SAFE_INTEGER_MAX = 9_007_199_254_740_991


def fail(message: str) -> None:
    raise ValueError(message)


def pairs_to_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            fail(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def normalize(value: Any) -> Any:
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, str):
        if any(0xD800 <= ord(character) <= 0xDFFF for character in value):
            fail("surrogate code point forbidden")
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        if abs(value) > SAFE_INTEGER_MAX:
            fail("unsafe integer")
        return value
    if isinstance(value, float):
        fail("float forbidden")
    if isinstance(value, list):
        return [normalize(item) for item in value]
    if isinstance(value, dict):
        return {key: normalize(value[key]) for key in sorted(value)}
    fail(f"unsupported canonical type: {type(value).__name__}")


def canonical(value: Any) -> str:
    return json.dumps(normalize(value), ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def root(domain: str, value: Any) -> str:
    return sha256_bytes(f"{domain}\n{canonical(value)}".encode("utf-8"))


def exact(value: Any, keys: list[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or sorted(value.keys()) != sorted(keys):
        fail(f"{label}: exact keys mismatch")
    return value


def assert_path(logical_path: str) -> None:
    if not isinstance(logical_path, str) or not logical_path.startswith(ALLOWED_PREFIXES) or logical_path.startswith("/") or "\\" in logical_path or "//" in logical_path:
        fail("invalid repository path")
    if any(part in ("", ".", "..") for part in logical_path.split("/")) or str(PurePosixPath(logical_path)) != logical_path:
        fail("non-canonical repository path")


def read_current(repository: Path, logical_path: str, maximum: int) -> bytes:
    assert_path(logical_path)
    root_path = repository.resolve(strict=True)
    cursor = root_path
    for index, component in enumerate(logical_path.split("/")):
        cursor = cursor / component
        observed = os.lstat(cursor)
        if stat.S_ISLNK(observed.st_mode):
            fail(f"symlink rejected: {logical_path}")
        if index < len(logical_path.split("/")) - 1 and not stat.S_ISDIR(observed.st_mode):
            fail("non-directory ancestor")
        if index == len(logical_path.split("/")) - 1 and not stat.S_ISREG(observed.st_mode):
            fail("non-regular file")
    resolved = cursor.resolve(strict=True)
    try:
        resolved.relative_to(root_path)
    except ValueError as error:
        raise ValueError("path escapes repository") from error
    before = os.stat(cursor, follow_symlinks=False)
    if before.st_nlink != 1 or before.st_size >= maximum:
        fail("hard-link or oversize rejected")
    descriptor = os.open(cursor, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        opened = os.fstat(descriptor)
        if (opened.st_dev, opened.st_ino, opened.st_size) != (before.st_dev, before.st_ino, before.st_size):
            fail("file changed during open")
        with os.fdopen(os.dup(descriptor), "rb") as stream:
            data = stream.read()
        if len(data) != opened.st_size:
            fail("short read")
        return data
    finally:
        os.close(descriptor)


def read_git(repository: Path, commit: str, logical_path: str, maximum: int) -> tuple[bytes, int]:
    assert_path(logical_path)
    tree = subprocess.run(["git", "ls-tree", "-z", "--full-tree", commit, "--", logical_path], cwd=repository, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout
    entries = [entry for entry in tree.split(b"\0") if entry]
    if len(entries) != 1:
        fail(f"Git path count mismatch: {logical_path}")
    metadata, observed_path = entries[0].split(b"\t", 1)
    mode, kind, oid = metadata.decode("ascii").split(" ")
    if mode not in ("100644", "100755") or kind != "blob" or observed_path.decode("utf-8") != logical_path:
        fail(f"Git path is not regular blob: {logical_path}")
    data = subprocess.run(["git", "cat-file", "blob", oid], cwd=repository, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout
    if len(data) >= maximum:
        fail("Git blob oversize")
    return data, int(mode[-3:], 8)


def load(repository: Path, logical_path: str) -> dict[str, Any]:
    data = read_current(repository, logical_path, 25 * 1024 * 1024)
    value = json.loads(data.decode("utf-8"), object_pairs_hook=pairs_to_object)
    canonical(value)
    if not isinstance(value, dict):
        fail("JSON root must be object")
    return value


def validate_manifest(repository: Path, manifest: dict[str, Any]) -> None:
    exact(manifest, ["artifactClass", "artifactId", "generatedAt", "maxMemberBytesExclusive", "maxTotalBytesInclusive", "memberCount", "members", "packageContentRoot", "packageId", "repositoryVisibility", "schemaVersion", "sourceCommit", "totalBytes"], "manifest")
    if manifest["repositoryVisibility"] != "PUBLIC" or manifest["schemaVersion"] != "MPRR-V1-10-PACKAGE-MANIFEST-V1" or manifest["memberCount"] != 11 or len(manifest["members"]) != 11:
        fail("manifest invariant mismatch")
    paths: set[str] = set(); hashes: set[str] = set(); roles: set[str] = set(); total = 0
    for index, member in enumerate(manifest["members"]):
        exact(member, ["bytes", "logicalPath", "ordinal", "role", "sha256"], f"member[{index}]")
        if member["ordinal"] != index + 1 or member["logicalPath"] in paths or member["sha256"] in hashes or member["role"] in roles:
            fail("manifest uniqueness/order mismatch")
        paths.add(member["logicalPath"]); hashes.add(member["sha256"]); roles.add(member["role"])
        if member["logicalPath"].startswith(("scripts/", "tests/")):
            data, _ = read_git(repository, manifest["sourceCommit"], member["logicalPath"], manifest["maxMemberBytesExclusive"])
        else:
            data = read_current(repository, member["logicalPath"], manifest["maxMemberBytesExclusive"])
        if len(data) != member["bytes"] or sha256_bytes(data) != member["sha256"]:
            fail("manifest member drift")
        total += member["bytes"]
    if not any(member["role"] == "MPRRV110-B0-CORE-DEPENDENCY" and member["logicalPath"] == "scripts/b0-v8-core.mjs" for member in manifest["members"]):
        fail("manifest missing transitive B0 core dependency")
    if total != manifest["totalBytes"] or total > manifest["maxTotalBytesInclusive"]:
        fail("manifest byte budget mismatch")
    projection = {"members": manifest["members"], "packageId": manifest["packageId"], "sourceCommit": manifest["sourceCommit"]}
    if root("MPRR-V1-10-PACKAGE-CONTENT-V1", projection) != manifest["packageContentRoot"]:
        fail("manifest root mismatch")


def validate_registry(registry: dict[str, Any]) -> None:
    exact(registry, ["algorithmPolicy", "artifactClass", "artifactId", "controlRows", "currentState", "externalEvidence", "growthPolicy", "ownerModel", "receiptSchema", "reportPolicy", "repositoryVisibility", "roleSlots", "schemaVersion", "validatorIds"], "registry")
    if registry["repositoryVisibility"] != "PUBLIC" or registry["validatorIds"] != VALIDATORS or registry["roleSlots"] != ROLES:
        fail("registry denominator mismatch")
    if registry["ownerModel"] != {"ownerCount": 1, "primaryBackupModel": "REMOVED", "workOwner": "Tal"}:
        fail("owner model mismatch")
    current = registry["currentState"]
    if current["acceptance"] != 0 or current["authorityOutputs"] != 0 or current["b0"] != "ABSENT" or current["gate29"] != "BLOCKED" or current["developmentFreeze"] != "ACTIVE" or current["status"] != "BLOCKED":
        fail("current state overclaim")
    if registry["externalEvidence"]["externalClosureCount"] != 0 or registry["externalEvidence"]["operationalEvidencePresent"] is not False:
        fail("external evidence overclaim")
    if registry["algorithmPolicy"]["approvedAlgorithms"] != [] or registry["algorithmPolicy"]["keyGenerationPerformed"] is not False:
        fail("cryptographic policy overclaim")
    if registry["reportPolicy"]["writesAllowed"] is not False or registry["growthPolicy"]["globalBudgetPresent"] is not False:
        fail("report/growth policy overclaim")
    schema = registry["receiptSchema"]
    schema_base = {key: value for key, value in schema.items() if key != "schemaRoot"}
    if schema["additionalProperties"] is not False or root("MPRR-V1-10-CLOSED-SCHEMA-V1", schema_base) != schema["schemaRoot"]:
        fail("receipt schema root mismatch")
    if len(registry["controlRows"]) != 17 or [row["findingId"] for row in registry["controlRows"]] != FINDINGS:
        fail("control denominator mismatch")
    if any(row["localStatus"] != "IMPLEMENTED-CANDIDATE" or row["closureStatus"] != "OPEN-PENDING-INDEPENDENT-EVIDENCE" for row in registry["controlRows"]):
        fail("control closure overclaim")


def validate_source(repository: Path, source: dict[str, Any], commit: str) -> None:
    exact(source, ["artifactClass", "artifactId", "repositoryVisibility", "rows", "schemaVersion", "sourceCount", "sourceSetRoot"], "source")
    if source["sourceCount"] != 11 or len(source["rows"]) != 11:
        fail("source denominator mismatch")
    paths: set[str] = set(); hashes: set[str] = set()
    for index, row in enumerate(source["rows"]):
        exact(row, ["bytes", "logicalPath", "mode", "ordinal", "sha256"], f"source[{index}]")
        if row["ordinal"] != index + 1 or row["logicalPath"] in paths or row["sha256"] in hashes:
            fail("source uniqueness/order mismatch")
        paths.add(row["logicalPath"]); hashes.add(row["sha256"])
        data, mode = read_git(repository, commit, row["logicalPath"], 50 * 1024 * 1024)
        if len(data) != row["bytes"] or sha256_bytes(data) != row["sha256"] or mode != row["mode"]:
            fail("source drift")
    if not any(row["logicalPath"] == "scripts/b0-v8-core.mjs" for row in source["rows"]):
        fail("source index missing transitive B0 core dependency")
    if root("MPRR-V1-10-SOURCE-SET-V1", source["rows"]) != source["sourceSetRoot"]:
        fail("source root mismatch")


def validate_crosswalk(registry: dict[str, Any], crosswalk: dict[str, Any]) -> None:
    if crosswalk["findingCount"] != 17 or crosswalk["closureCount"] != 0 or crosswalk["inheritedFindingCount"] != 40 or crosswalk["inheritedIndependentMechanicalClosureCount"] != 1 or len(crosswalk["rows"]) != 17:
        fail("crosswalk denominator mismatch")
    for index, row in enumerate(crosswalk["rows"]):
        control = {key: value for key, value in row.items() if key != "ordinal"}
        if row["ordinal"] != index + 1 or canonical(control) != canonical(registry["controlRows"][index]):
            fail("crosswalk row mismatch")
    base = {key: value for key, value in crosswalk.items() if key != "crosswalkRoot"}
    if root("MPRR-V1-10-CROSSWALK-V1", base) != crosswalk["crosswalkRoot"]:
        fail("crosswalk root mismatch")


def validate_corpus(corpus: dict[str, Any]) -> None:
    if corpus["caseCount"] != 17 or corpus["blockedCount"] != 17 or len(corpus["cases"]) != 17:
        fail("corpus denominator mismatch")
    for index, row in enumerate(corpus["cases"]):
        base = {key: value for key, value in row.items() if key != "testRoot"}
        if row["ordinal"] != index + 1 or row["findingId"] != FINDINGS[index] or row["actual"] != "BLOCK" or root("MPRR-V1-10-MUTATION-RESULT-V1", base) != row["testRoot"]:
            fail("corpus row mismatch")
    base = {key: value for key, value in corpus.items() if key != "corpusRoot"}
    if root("MPRR-V1-10-MUTATION-CORPUS-V1", base) != corpus["corpusRoot"]:
        fail("corpus root mismatch")


def main() -> None:
    repository = Path.cwd()
    manifest = load(repository, PATHS["manifest"]); validate_manifest(repository, manifest)
    registry = load(repository, PATHS["registry"]); validate_registry(registry)
    source = load(repository, PATHS["source"]); validate_source(repository, source, manifest["sourceCommit"])
    crosswalk = load(repository, PATHS["crosswalk"]); validate_crosswalk(registry, crosswalk)
    corpus = load(repository, PATHS["corpus"]); validate_corpus(corpus)
    reader = next((member for member in manifest["members"] if member["role"] == "MPRRV110-READER-B"), None)
    if reader is None:
        fail("Reader B not pinned")
    base = {"artifactClass": "CROSS-RUNTIME-STRUCTURAL-READER-B-NOT-INDEPENDENT-NOT-ACCEPTANCE", "artifactId": "MPRR-V1-10-READER-B-REPORT-2026-08-30-G1", "closureCount": 0, "corpusRoot": corpus["corpusRoot"], "findingCount": 17, "packageContentRoot": manifest["packageContentRoot"], "positiveValidatorCount": 15, "readerArtifactSha256": reader["sha256"], "result": "PASS-STRUCTURAL-CANDIDATE-NOT-ACCEPTED", "sourceCommit": manifest["sourceCommit"], "sourceSetRoot": source["sourceSetRoot"]}
    report = {**base, "reportRoot": root("MPRR-V1-10-READER-B-REPORT-V1", base)}
    print(json.dumps(report, ensure_ascii=False, separators=(",", ":"), sort_keys=True))


if __name__ == "__main__":
    main()
