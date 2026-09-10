#!/usr/bin/env python3
"""Read-only independent root/count audit for the frozen B0 v7 package."""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path


WEB_ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-atomic-package-manifest-2026-08-30.json"
SUBJECT_PATH = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-2026-08-30.md"


def canonical(value: object) -> str:
    if value is None or isinstance(value, (bool, str)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, int) and not isinstance(value, bool):
        if not -(2**53 - 1) <= value <= 2**53 - 1:
            raise ValueError("non-safe integer")
        return str(value)
    if isinstance(value, list):
        return "[" + ",".join(canonical(item) for item in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(
            json.dumps(key, ensure_ascii=False) + ":" + canonical(value[key]) for key in sorted(value)
        ) + "}"
    raise ValueError(f"unsupported canonical type: {type(value).__name__}")


def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def rooted(domain: str, value: object) -> str:
    return sha_bytes((domain + "\n" + canonical(value)).encode("utf-8"))


def without_key(value: dict, key: str) -> dict:
    return {name: item for name, item in value.items() if name != key}


def read_bytes(logical_path: str) -> bytes:
    return (WEB_ROOT / logical_path).read_bytes()


def read_json(logical_path: str) -> dict:
    return json.loads(read_bytes(logical_path).decode("utf-8"))


manifest_bytes = read_bytes(MANIFEST_PATH)
manifest = json.loads(manifest_bytes.decode("utf-8"))
members = manifest["members"]
member_errors: list[str] = []
for member in members:
    candidate = WEB_ROOT / member["logicalPath"]
    data = candidate.read_bytes()
    if len(data) != member["bytes"] or sha_bytes(data) != member["sha256"]:
        member_errors.append(member["logicalPath"])
    if not candidate.is_file() or candidate.is_symlink():
        member_errors.append("non-regular-or-symlink:" + member["logicalPath"])

projection = [
    {name: member[name] for name in ("ordinal", "logicalPath", "sha256", "bytes", "required")}
    for member in members
]
package_root = rooted("B0V7-PACKAGE-CONTENT-ROOT-V1", projection)
manifest_projection_root = rooted(
    "B0V7-MANIFEST-PROJECTION-V1",
    {"members": projection, "packageContentRoot": manifest["packageContentRoot"], "rootAlgorithm": manifest["rootAlgorithm"]},
)

def member_path(suffix: str) -> str:
    matches = [member["logicalPath"] for member in members if member["logicalPath"].endswith(suffix)]
    if len(matches) != 1:
        raise ValueError(f"suffix cardinality {suffix}: {len(matches)}")
    return matches[0]


registry = read_json(member_path("-v7-normative-registry-2026-08-30.json"))
source_index = read_json(member_path("-v7-frozen-source-index-2026-08-30.json"))
crosswalk = read_json(member_path("-v7-closure-crosswalk-2026-08-30.json"))
corpus = read_json(member_path("-v7-validator-and-state-machine-corpus-2026-08-30.json"))
evidence = read_json(member_path("-v7-independent-interface-evidence-2026-08-30.json"))

root_checks: dict[str, bool] = {
    "manifest.packageContentRoot": package_root == manifest["packageContentRoot"],
    "manifest.manifestProjectionRoot": manifest_projection_root == manifest["manifestProjectionRoot"],
    "registry.registryContentRoot": rooted("B0V7-NORMATIVE-REGISTRY-V1", without_key(registry, "registryContentRoot")) == registry["registryContentRoot"],
    "sourceIndex.indexContentRoot": rooted("B0V7-FROZEN-SOURCE-INDEX-V1", without_key(source_index, "indexContentRoot")) == source_index["indexContentRoot"],
    "crosswalk.crosswalkContentRoot": rooted("B0V7-CLOSURE-CROSSWALK-V1", without_key(crosswalk, "crosswalkContentRoot")) == crosswalk["crosswalkContentRoot"],
    "corpus.corpusContentRoot": rooted("B0V7-VALIDATOR-AND-STATE-MACHINE-CORPUS-V1", without_key(corpus, "corpusContentRoot")) == corpus["corpusContentRoot"],
    "evidence.evidenceContentRoot": rooted("B0V7-INDEPENDENT-ACTUAL-INTERFACE-EVIDENCE-V1", without_key(evidence, "evidenceContentRoot")) == evidence["evidenceContentRoot"],
    "validatorLanguage.languageRoot": rooted("B0V7-VALIDATOR-LANGUAGE-V1", without_key(registry["validatorLanguage"], "languageRoot")) == registry["validatorLanguage"]["languageRoot"],
    "detachedAcceptance.planningPositiveEnvelopeRoot": rooted("B0V7-DETACHED-ACCEPTANCE-ENVELOPE-V1", registry["detachedAcceptance"]["planningPositiveEnvelope"]) == registry["detachedAcceptance"]["planningPositiveEnvelopeRoot"],
    "cas.exactStepSequenceRoot": rooted("B0V7-CAS-STEP-SEQUENCE-V1", registry["casStateMachine"]["steps"]) == registry["casStateMachine"]["exactStepSequenceRoot"],
    "cas.planningAttemptSetRoot": rooted("B0V7-CAS-PLANNING-ATTEMPT-SET-V1", registry["casStateMachine"]["planningAttempts"]) == registry["casStateMachine"]["planningAttemptSetRoot"],
    "recovery.planningPositiveStateRoot": rooted("B0V7-RECOVERY-PLANNING-STATE-V1", registry["recoveryReducer"]["planningPositiveState"]) == registry["recoveryReducer"]["planningPositiveStateRoot"],
    "global.planningPositiveModelRoot": rooted("B0V7-GLOBAL-PLANNING-MODEL-V1", registry["globalModel"]["planningPositiveModel"]) == registry["globalModel"]["planningPositiveModelRoot"],
}

schemas = [
    registry["detachedAcceptance"]["externalSchema"],
    registry["detachedAcceptance"]["validationContextSchema"],
    registry["detachedAcceptance"]["internalSchema"],
    *registry["authorityBootstrap"]["genesisSchemas"],
    registry["authorityBootstrap"]["recoverySchema"],
    registry["permitRevisionTimeRevocationReplay"]["permitSchema"],
]
schema_root_matches = sum(
    rooted("B0V7-CLOSED-SCHEMA-V1", without_key(schema, "schemaRoot")) == schema["schemaRoot"] for schema in schemas
)

source_errors: list[str] = []
for source in source_index["sources"]:
    candidate = WEB_ROOT / source["logicalPath"]
    data = candidate.read_bytes()
    if len(data) != source["bytes"] or sha_bytes(data) != source["sha256"]:
        source_errors.append(source["logicalPath"])
    if not candidate.is_file() or candidate.is_symlink():
        source_errors.append("non-regular-or-symlink:" + source["logicalPath"])
source_projection = [
    {name: source[name] for name in ("ordinal", "logicalPath", "sha256", "bytes", "sourceClass")}
    for source in source_index["sources"]
]
root_checks["sourceIndex.sourceSetRoot"] = rooted("B0V7-FROZEN-SOURCE-SET-V1", source_projection) == source_index["sourceSetRoot"]

observation_root_matches = sum(
    rooted("B0V7-ACTUAL-INTERFACE-OBSERVATION-V1", without_key(row, "actualObservationRoot")) == row["actualObservationRoot"]
    for row in evidence["observations"]
)

vectors: list[dict] = []
shard_root_matches = 0
shard_binding_matches = 0
for descriptor in corpus["shardDescriptors"]:
    data = read_bytes(descriptor["logicalPath"])
    if len(data) == descriptor["bytes"] and sha_bytes(data) == descriptor["sha256"]:
        shard_binding_matches += 1
    shard = json.loads(data.decode("utf-8"))
    if rooted("B0V7-VECTOR-SHARD-V1", without_key(shard, "shardContentRoot")) == shard["shardContentRoot"]:
        shard_root_matches += 1
    vectors.extend(shard["vectors"])
vector_root_matches = sum(
    rooted("B0V7-VECTOR-V1", without_key(vector, "vectorRoot")) == vector["vectorRoot"] for vector in vectors
)
root_checks["corpus.vectorSequenceRoot"] = rooted("B0V7-VECTOR-SEQUENCE-V1", [vector["vectorRoot"] for vector in vectors]) == corpus["vectorSequenceRoot"]
root_checks["corpus.shardSetRoot"] = rooted("B0V7-VECTOR-SHARD-SET-V1", corpus["shardDescriptors"]) == corpus["shardSetRoot"]

all_package_bytes = b"".join(read_bytes(member["logicalPath"]) for member in members)
forbidden_patterns = {
    "Math.random": rb"Math\.random",
    "crypto.randomUUID": rb"crypto\.randomUUID",
    "privateKeyHeader": rb"BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY",
    "openAiStyleSecret": rb"sk-[A-Za-z0-9]{20,}",
    "githubStyleSecret": rb"gh[pousr]_[A-Za-z0-9]{20,}",
    "emailShape": rb"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
}
forbidden_counts = {name: len(re.findall(pattern, all_package_bytes)) for name, pattern in forbidden_patterns.items()}

result = {
    "schemaVersion": "B0V7-INDEPENDENT-HOSTILE-ROOT-AUDIT-V1",
    "subjectSha256": sha_bytes(read_bytes(SUBJECT_PATH)),
    "manifestSha256": sha_bytes(manifest_bytes),
    "packageContentRoot": package_root,
    "memberCount": len(members),
    "uniqueMemberPathCount": len({member["logicalPath"] for member in members}),
    "uniqueMemberHashCount": len({member["sha256"] for member in members}),
    "totalMemberBytes": sum(member["bytes"] for member in members),
    "largestMemberBytes": max(member["bytes"] for member in members),
    "memberErrorCount": len(member_errors),
    "sourceCount": len(source_index["sources"]),
    "uniqueSourcePathCount": len({source["logicalPath"] for source in source_index["sources"]}),
    "uniqueSourceHashCount": len({source["sha256"] for source in source_index["sources"]}),
    "referencedSourceBytes": sum(source["bytes"] for source in source_index["sources"]),
    "sourceErrorCount": len(source_errors),
    "packageSourceHashIntersectionCount": len({member["sha256"] for member in members} & {source["sha256"] for source in source_index["sources"]}),
    "rootCheckCount": len(root_checks),
    "rootCheckPassCount": sum(root_checks.values()),
    "rootChecks": root_checks,
    "closedSchemaCount": len(schemas),
    "closedSchemaRootMatchCount": schema_root_matches,
    "interfaceObservationCount": len(evidence["observations"]),
    "interfaceObservationRootMatchCount": observation_root_matches,
    "closureRowCount": len(crosswalk["closureRows"]),
    "uniqueClosureSourceFindingCount": len({row["sourceFindingId"] for row in crosswalk["closureRows"]}),
    "uniqueClosureNoMergeKeyCount": len({row["noMergeKey"] for row in crosswalk["closureRows"]}),
    "vectorCount": len(vectors),
    "vectorRootMatchCount": vector_root_matches,
    "shardCount": len(corpus["shardDescriptors"]),
    "shardBindingMatchCount": shard_binding_matches,
    "shardRootMatchCount": shard_root_matches,
    "forbiddenPatternCounts": forbidden_counts,
    "realRepositoryStateNotInspected": True,
    "acceptanceCredit": 0,
    "authorityCredit": 0,
}
result["auditContentRoot"] = rooted("B0V7-INDEPENDENT-HOSTILE-ROOT-AUDIT-V1", result)
print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
