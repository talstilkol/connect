#!/usr/bin/env python3
"""Deterministically derive B0 v7 actual-interface evidence from frozen v6 bytes.

This program intentionally contains no expected-value table.  It measures only
the frozen predecessor artifacts named below and emits canonical JSON or an
apply_patch payload.  It is planning-only and grants no authority or Acceptance.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


OUT = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-independent-interface-evidence-2026-08-30.json"
SUBJECT = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-2026-08-30.md"
MANIFEST = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-atomic-package-manifest-2026-08-30.json"
REGISTRY = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-normative-registry-2026-08-30.json"
CROSSWALK = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-closure-crosswalk-2026-08-30.json"
CORPUS = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-portable-causal-vector-corpus-2026-08-30.json"
SOURCE_INDEX = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v6-source-member-span-index-2026-08-30.json"


def canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def root(domain: str, value: object) -> str:
    return sha_bytes((domain + "\n" + canonical(value)).encode("utf-8"))


def load_bytes(repo: Path, logical_path: str) -> bytes:
    path = repo / logical_path
    if not path.is_file():
        raise SystemExit(f"missing frozen input: {logical_path}")
    return path.read_bytes()


def load_json(repo: Path, logical_path: str) -> dict:
    return json.loads(load_bytes(repo, logical_path).decode("utf-8"))


def observation(interface_id: str, kind: str, value: object, paths: list[str], source_hashes: list[str]) -> dict:
    row = {
        "interfaceId": interface_id,
        "measurementKind": kind,
        "actualValue": value,
        "sourceLocators": paths,
        "sourceSha256": source_hashes,
        "producerId": "B0V7-INDEPENDENT-ACTUAL-INTERFACE-PRODUCER-PYTHON",
        "dependencyClass": "FROZEN-V6-BYTES-ONLY",
    }
    row["actualObservationRoot"] = root("B0V7-ACTUAL-INTERFACE-OBSERVATION-V1", row)
    return row


def build(repo: Path) -> dict:
    subject_bytes = load_bytes(repo, SUBJECT)
    manifest_bytes = load_bytes(repo, MANIFEST)
    manifest = json.loads(manifest_bytes.decode("utf-8"))
    registry = load_json(repo, REGISTRY)
    crosswalk = load_json(repo, CROSSWALK)
    corpus = load_json(repo, CORPUS)
    source_index = load_json(repo, SOURCE_INDEX)

    hashes = {
        SUBJECT: sha_bytes(subject_bytes),
        MANIFEST: sha_bytes(manifest_bytes),
        REGISTRY: sha_bytes(load_bytes(repo, REGISTRY)),
        CROSSWALK: sha_bytes(load_bytes(repo, CROSSWALK)),
        CORPUS: sha_bytes(load_bytes(repo, CORPUS)),
        SOURCE_INDEX: sha_bytes(load_bytes(repo, SOURCE_INDEX)),
    }

    single = lambda idx, kind, value, path: observation(
        f"B0V7-IF-{idx:02d}", kind, value, [path], [hashes[path]]
    )
    rows = [
        single(1, "V6-SUBJECT-SHA256", hashes[SUBJECT], SUBJECT),
        single(2, "V6-MANIFEST-SHA256", hashes[MANIFEST], MANIFEST),
        single(3, "V6-PACKAGE-CONTENT-ROOT", manifest["packageContentRoot"], MANIFEST),
        single(4, "V6-PACKAGE-MEMBER-COUNT", manifest["memberCount"], MANIFEST),
        single(5, "V6-REQUIREMENT-COUNT", len(crosswalk["v6Requirements"]), CROSSWALK),
        single(6, "V6-FIVE-FIELD-COUNT", crosswalk["v6FiveFieldCount"], CROSSWALK),
        single(7, "V6-ACTIVE-BLOCKER-DENOMINATOR", crosswalk["activeBlockerDenominator"], CROSSWALK),
        single(8, "V6-VECTOR-COUNT", corpus["vectorCount"], CORPUS),
        single(9, "V6-VECTOR-SHARD-COUNT", corpus["vectorShardCount"], CORPUS),
        single(10, "V6-SOURCE-ARTIFACT-COUNT", source_index["artifactCount"], SOURCE_INDEX),
        single(11, "V6-SOURCE-MEMBER-COUNT", source_index["memberCount"], SOURCE_INDEX),
        single(12, "V6-AUTHORITATIVE-BYTE-ATOM-COUNT", crosswalk["authoritativeInheritedByteAtomCount"], CROSSWALK),
        single(13, "V6-ACTIVE-NAMED-USE-COUNT", crosswalk["activeNamedUseCount"], CROSSWALK),
        single(14, "V6-ROLE-COUNT", registry["roleAndAppointmentAuthority"]["roleCount"], REGISTRY),
        single(15, "V6-HEAD-COUNT", registry["mutableHeadRegistry"]["headCount"], REGISTRY),
        single(16, "V6-MUTABLE-OBJECT-CLASS-COUNT", registry["mutableHeadRegistry"]["objectClassCount"], REGISTRY),
        single(17, "V6-PRIOR-INTERFACE-COUNT", registry["priorInterfaceRegistry"]["interfaceCount"], REGISTRY),
    ]
    doc = {
        "schemaVersion": "B0V7-INDEPENDENT-ACTUAL-INTERFACE-EVIDENCE-V1",
        "artifactId": "CONNECT-B0-V7-INDEPENDENT-ACTUAL-INTERFACE-EVIDENCE-2026-08-30-G0",
        "artifactClass": "PLANNING-ONLY;NON-AUTHORITATIVE;NON-ACCEPTANCE",
        "producerLanguage": "PYTHON-STDLIB",
        "producerId": "B0V7-INDEPENDENT-ACTUAL-INTERFACE-PRODUCER-PYTHON",
        "expectedValueDependency": "NONE",
        "futureProviderDependency": "NONE",
        "interfaceCount": len(rows),
        "observations": rows,
        "authorityCredit": 0,
        "acceptanceCredit": 0,
    }
    doc["evidenceContentRoot"] = root("B0V7-INDEPENDENT-ACTUAL-INTERFACE-EVIDENCE-V1", doc)
    return doc


def patch_for(path: str, content: str) -> str:
    lines = content.splitlines()
    return "*** Begin Patch\n*** Add File: " + path + "\n" + "\n".join("+" + line for line in lines) + "\n*** End Patch\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--emit-patch", action="store_true")
    args = parser.parse_args()
    repo = Path.cwd()
    doc = build(repo)
    content = json.dumps(doc, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.emit_patch:
        print(patch_for(OUT, content), end="")
    else:
        print(content, end="")


if __name__ == "__main__":
    main()
