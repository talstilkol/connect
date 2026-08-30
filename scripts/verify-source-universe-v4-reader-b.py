#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path.cwd()
REGISTRY_PATH = Path("docs/planning/source-universe-v4-output-path-registry-v1-2026-08-30.json")
TOOLCHAIN_REGISTRY_PATH = Path("docs/planning/source-universe-v4-toolchain-path-registry-v1-2026-08-30.json")
CUTOFF_DIR = Path("docs/planning/discovery-cutoff-candidate-v3-2026-08-30")
CUTOFF_PATHS = [
    CUTOFF_DIR / "manifest.json",
    CUTOFF_DIR / "receipt.json",
    CUTOFF_DIR / "source-candidates.json",
    CUTOFF_DIR / "verification-report.json",
]
EXPECTED_TOOLCHAIN_PATHS = [
    str(TOOLCHAIN_REGISTRY_PATH),
    "scripts/b0-v8-core.mjs",
    "scripts/verify-secret-hygiene.mjs",
    "scripts/source-universe-v4-core.mjs",
    "scripts/create-source-universe-v4-candidate.mjs",
    "scripts/verify-source-universe-v4-reader-a.mjs",
    "scripts/verify-source-universe-v4-reader-b.py",
    "scripts/finalize-source-universe-v4-candidate.mjs",
    "scripts/verify-source-universe-v4-candidate.mjs",
    "tests/source-universe-v4-core.test.mjs",
    "package.json",
]
CHECKS = [
    ("SURS4-READ-001", "OUTPUT-REGISTRY"),
    ("SURS4-READ-002", "SUBJECT-INVARIANTS"),
    ("SURS4-READ-003", "CUTOFF-BINDING"),
    ("SURS4-READ-004", "DISCOVERY-MANIFEST"),
    ("SURS4-READ-005", "CANDIDATE-INVENTORY"),
    ("SURS4-READ-006", "PUBLIC-METADATA-PROJECTION"),
    ("SURS4-READ-007", "PRIVATE-CUSTODY-FAIL-CLOSED"),
    ("SURS4-READ-008", "SOURCE-OCCURRENCES"),
    ("SURS4-READ-009", "TARGET-SPANS"),
    ("SURS4-READ-010", "OBJECT-CLASS-SOLE-PRODUCER"),
    ("SURS4-READ-011", "EXPLICIT-SEMANTIC-GRAPH-IDENTITY"),
    ("SURS4-READ-012", "CONTROL-REGISTRIES"),
    ("SURS4-READ-013", "PUBLIC-CONTRACTS"),
    ("SURS4-READ-014", "LIFECYCLE-CONTRACTS"),
    ("SURS4-READ-015", "CLAUSE-PRESERVATION-78"),
    ("SURS4-READ-016", "FINDING-CROSSWALK-24"),
    ("SURS4-READ-017", "CONFORMANCE-VECTORS-24"),
    ("SURS4-READ-018", "MUTATION-VECTORS-102"),
    ("SURS4-READ-019", "CONTROLLED-GENERATION-FAIL-CLOSED"),
    ("SURS4-READ-020", "NO-RANDOM-TOOLCHAIN-SCAN"),
    ("SURS4-READ-021", "LOCAL-CONTROLS-24"),
    ("SURS4-READ-022", "NO-PRIVATE-LOCATOR"),
    ("SURS4-READ-023", "NO-SECRET-SHAPED-CONTENT"),
    ("SURS4-READ-024", "PUBLIC-FREEZE-GATE-INVARIANTS"),
]
SOURCE_TOKEN = re.compile(rb"SRC-[A-Z0-9-]+#[A-Z0-9._-]+")
FORBIDDEN_RANDOM = re.compile(rb"Math\.random\s*\(|crypto\.randomUUID\s*\(|\brandomUUID\s*\(")
PRIVATE_LOCATOR = re.compile(rb"/Users/|file:|[A-Za-z]:\\")
SECRET_SHAPE = re.compile(
    rb"-----BEGIN [A-Z ]*PRIVATE KEY-----"
    rb"|(?<![A-Za-z0-9_])gh[pousr]_[A-Za-z0-9_]{20,}(?![A-Za-z0-9_])"
    rb"|(?<![A-Za-z0-9_])sk-(?:proj-)?[A-Za-z0-9_-]{20,}(?![A-Za-z0-9_])"
)


def fail(message: str) -> None:
    raise ValueError(message)


def git(args: list[str]) -> bytes:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        fail(f"git {' '.join(args)} failed: {result.stderr.decode('utf-8', errors='replace').strip()}")
    return result.stdout


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def domain_root(domain: str, value: object) -> str:
    return sha256(f"{domain}\n{canonical(value)}".encode("utf-8"))


def read_json(path: Path) -> tuple[bytes, dict]:
    data = path.read_bytes()
    return data, json.loads(data.decode("utf-8"))


def exact_keys(value: dict, expected: set[str], label: str) -> None:
    if set(value) != expected:
        fail(f"{label}: exact keys mismatch")


def expected_identities() -> list[tuple[str, str]]:
    groups = [
        ("V2-REQUIREMENT", "SURS", "-", 26),
        ("V2-REVIEW-FINDING", "SURS2-HR-F", "", 20),
        ("V1-REVIEW-FINDING", "SURS-HR-F", "", 32),
        ("V3-REVIEW-FINDING", "SURS3-HR-F", "", 24),
    ]
    return [
        (category, f"{prefix}{separator}{index:03d}")
        for category, prefix, separator, count in groups
        for index in range(1, count + 1)
    ]


def assert_worktree(registry: dict) -> None:
    records = [row for row in git(["status", "--porcelain=v1", "-z"]).split(b"\0") if row]
    observed = [row[3:].decode("utf-8") for row in records]
    expected = {
        *(str(path) for path in CUTOFF_PATHS),
        *registry["packageMemberPaths"][:20],
    }
    if len(observed) != len(expected) or set(observed) != expected:
        fail("Reader B requires exactly Cutoff v3, 19 normative members and Reader A")


def validate_occurrences(subject_bytes: bytes, ledger: dict) -> None:
    rows = []
    for ordinal, match in enumerate(SOURCE_TOKEN.finditer(subject_bytes), start=1):
        token = match.group(0).decode("ascii")
        basis = f"{token}\n{match.start()}\n{match.end()}".encode("utf-8")
        rows.append(
            {
                "consumerId": "SOURCE-UNIVERSE-V4-SUBJECT",
                "endByte": match.end(),
                "occurrenceId": f"SURS4-OCC-{sha256(basis)[:24].upper()}",
                "ordinal": ordinal,
                "startByte": match.start(),
                "targetId": token,
                "token": token,
            }
        )
    if ledger["subjectSha256"] != sha256(subject_bytes) or ledger["rows"] != rows or ledger["occurrenceCount"] != len(rows):
        fail("Reader B: occurrence ledger mismatch")
    expected_root = domain_root(
        "CONNECT-SOURCE-UNIVERSE-V4-OCCURRENCES-V1",
        {"rows": rows, "subjectSha256": sha256(subject_bytes)},
    )
    if ledger["occurrenceRoot"] != expected_root:
        fail("Reader B: occurrence root mismatch")


def validate_graph(graph: dict) -> None:
    nodes = [row["nodeId"] for row in graph["nodes"]]
    if len(nodes) != len(set(nodes)) or graph["nodeCount"] != len(nodes):
        fail("Reader B: graph nodes invalid")
    adjacency = {node: [] for node in nodes}
    incoming = {node: 0 for node in nodes}
    for edge in graph["edges"]:
        if edge["from"] not in adjacency or edge["to"] not in adjacency or edge["from"] == edge["to"]:
            fail("Reader B: graph edge invalid")
        adjacency[edge["from"]].append(edge["to"])
        incoming[edge["to"]] += 1
    queue = sorted(node for node, count in incoming.items() if count == 0)
    visited = 0
    while queue:
        node = queue.pop(0)
        visited += 1
        for target in sorted(adjacency[node]):
            incoming[target] -= 1
            if incoming[target] == 0:
                queue.append(target)
                queue.sort()
    if visited != len(nodes):
        fail("Reader B: graph cycle")
    if any(graph[key] != 0 for key in ("cycleCount", "hiddenEdgeCount", "selfEdgeCount", "unknownNodeCount")):
        fail("Reader B: graph blocking counter")
    expected_root = domain_root(
        "CONNECT-SOURCE-UNIVERSE-V4-DEPENDENCY-GRAPH-V1",
        {"edges": graph["edges"], "nodes": graph["nodes"]},
    )
    if graph["graphRoot"] != expected_root:
        fail("Reader B: graph root mismatch")


def main() -> None:
    if sys.argv[1:] != ["--emit-report"]:
        fail("usage: python3 scripts/verify-source-universe-v4-reader-b.py --emit-report")
    registry_bytes, registry = read_json(REGISTRY_PATH)
    exact_keys(
        registry,
        {"artifactId", "outputDirectory", "owner", "packageMemberPaths", "reviewAndAcceptancePaths", "schema", "version"},
        "registry",
    )
    if registry["schema"] != "CONNECT-SOURCE-UNIVERSE-V4-OUTPUT-PATH-REGISTRY-V1" or len(registry["packageMemberPaths"]) != 23 or len(registry["reviewAndAcceptancePaths"]) != 5:
        fail("Reader B: output registry mismatch")
    toolchain_registry_bytes, toolchain_registry = read_json(TOOLCHAIN_REGISTRY_PATH)
    exact_keys(
        toolchain_registry,
        {"schema", "toolchainPaths", "version"},
        "toolchain registry",
    )
    if (
        toolchain_registry["schema"]
        != "CONNECT-SOURCE-UNIVERSE-V4-TOOLCHAIN-PATH-REGISTRY-V1"
        or toolchain_registry["version"] != 1
        or toolchain_registry["toolchainPaths"] != EXPECTED_TOOLCHAIN_PATHS
    ):
        fail("Reader B: toolchain path registry mismatch")
    assert_worktree(registry)

    artifacts: dict[str, dict] = {}
    raw_files: dict[str, bytes] = {}
    for path_text in registry["packageMemberPaths"][:19]:
        path = Path(path_text)
        data, value = read_json(path)
        artifacts[path.name] = value
        raw_files[path_text] = data
    subject = artifacts["subject.json"]
    observed_head = subject["sourceCommit"]
    if not re.fullmatch(r"[0-9a-f]{40}", observed_head):
        fail("Reader B: observed head invalid")
    if (
        subject["repositoryVisibility"] != "PUBLIC"
        or subject["developmentFreeze"] != "ACTIVE"
        or subject["gate29"] != "BLOCKED"
        or subject["acceptance"] != 0
        or subject["independentClosureCount"] != 0
        or subject["status"] != "CANDIDATE-NOT-ACCEPTED"
        or git(["rev-parse", "HEAD"]).decode().strip() != observed_head
    ):
        fail("Reader B: subject invariants")
    controls = subject["findingControls"]
    if len(controls) != 24 or len({row["findingId"] for row in controls}) != 24:
        fail("Reader B: finding controls")
    if sum(row["severity"] == "P0" for row in controls) != 12 or sum(row["severity"] == "P1" for row in controls) != 12:
        fail("Reader B: severity denominator")
    if any(row["closureStatus"] != "OPEN-INDEPENDENT-CLOSURE-REQUIRED" for row in controls):
        fail("Reader B: false closure")

    cutoff_receipt_bytes, cutoff_receipt = read_json(CUTOFF_DIR / "receipt.json")
    cutoff_manifest_bytes, cutoff_manifest = read_json(CUTOFF_DIR / "manifest.json")
    if cutoff_receipt["payload"]["productRepository"]["observedHead"] != observed_head or cutoff_manifest["payload"]["observedHead"] != observed_head:
        fail("Reader B: cutoff binding")
    discovery = artifacts["discovery-input-manifest.json"]
    if (
        discovery["observedHead"] != observed_head
        or discovery["cutoffReceiptSha256"] != sha256(cutoff_receipt_bytes)
        or discovery["cutoffManifestSha256"] != sha256(cutoff_manifest_bytes)
        or discovery["outputRegistrySha256"] != sha256(registry_bytes)
        or discovery["toolchainRegistrySha256"] != sha256(toolchain_registry_bytes)
    ):
        fail("Reader B: discovery manifest")

    tree_count = len([row for row in git(["ls-tree", "-r", "-z", "--full-tree", observed_head]).split(b"\0") if row])
    inventory = artifacts["source-candidate-inventory.json"]
    public_projection = artifacts["public-source-projection.json"]
    private_custody = artifacts["private-custody-reference-manifest.json"]
    if inventory["trackedFileCount"] != tree_count or len(inventory["trackedRows"]) != tree_count or len(public_projection["metadataRows"]) != tree_count or public_projection["byteProjectionIncluded"] is not False:
        fail("Reader B: inventory projection")
    if len(private_custody["rows"]) != 2 or any(row["admissionEnabled"] is not False for row in private_custody["rows"]):
        fail("Reader B: private custody")

    validate_occurrences(raw_files[registry["packageMemberPaths"][0]], artifacts["source-occurrence-ledger.json"])
    source_bytes: dict[str, bytes] = {}
    target_ledger = artifacts["target-span-ledger.json"]
    for row in target_ledger["rows"]:
        data = Path(row["path"]).read_bytes() if row["sourceCommit"] == "DETACHED-CUTOFF-V3" else git(["show", f"{observed_head}:{row['path']}"])
        source_bytes[row["path"]] = data
        span = data[row["startByte"] : row["endByte"]]
        if row["sourceBlobSha256"] != sha256(data) or row["spanSha256"] != sha256(span) or row["byteLength"] != len(span):
            fail("Reader B: target span")
    expected_target_root = domain_root("CONNECT-SOURCE-UNIVERSE-V4-TARGET-SPANS-V1", {"rows": target_ledger["rows"]})
    if target_ledger["targetRoot"] != expected_target_root:
        fail("Reader B: target root")

    object_registry = artifacts["object-class-sole-producer-registry.json"]
    if any(object_registry[key] != 0 for key in ("dualClassCount", "missingProducerCount", "semanticAtomicityViolationCount")) or object_registry["objectCount"] != len(object_registry["objects"]):
        fail("Reader B: object registry")
    if len({row["objectId"] for row in object_registry["objects"]}) != len(object_registry["objects"]):
        fail("Reader B: duplicate object identity")
    explicit_graph = artifacts["explicit-dependency-graph.json"]
    semantic_graph = artifacts["semantic-dependency-graph.json"]
    validate_graph(explicit_graph)
    validate_graph(semantic_graph)
    if canonical({"edges": explicit_graph["edges"], "nodes": explicit_graph["nodes"]}) != canonical({"edges": semantic_graph["edges"], "nodes": semantic_graph["nodes"]}):
        fail("Reader B: graph pair mismatch")

    control_registry = artifacts["authority-admission-state-terminal-field-registries.json"]
    if (
        len(control_registry["terminals"]) != 9
        or control_registry["admission"]["independentReviewRequired"] is not True
        or control_registry["admission"]["selectorMayReviewOwnAdmission"] is not False
        or control_registry["authoritativeFields"]["fieldIds"] != control_registry["authoritativeFields"]["triggerFieldIds"]
        or control_registry["providerRuntime"]["admissionEnabled"] is not False
        or control_registry["reviewLifecycle"]["selfAcceptanceForbidden"] is not True
    ):
        fail("Reader B: control registry")
    public_contracts = artifacts["public-handling-egress-detector-contracts.json"]
    if public_contracts["detector"]["publicWritesEnabled"] is not False or public_contracts["egress"]["unknownSinkAction"] != "BLOCK" or public_contracts["opaqueProjection"]["publicOpaqueProjectionEnabled"] is not False:
        fail("Reader B: public contract")
    lifecycle = artifacts["lifecycle-contracts.json"]
    if lifecycle["copyClasses"] != lifecycle["erasureRequiresEveryCopyClass"] or lifecycle["legalHoldBlocksDeletion"] is not True or lifecycle["resurrectionAction"] != "BLOCK":
        fail("Reader B: lifecycle contract")

    preservation = artifacts["clause-preservation-crosswalk.json"]
    finding_crosswalk = artifacts["finding-closure-crosswalk.json"]
    conformance = artifacts["conformance-vectors.json"]
    if preservation["rowCount"] != 78 or preservation["fullLocalCount"] != 78 or len(preservation["rows"]) != 78:
        fail("Reader B: preservation denominator")
    if finding_crosswalk["findingCount"] != 24 or finding_crosswalk["closureCount"] != 0 or len(finding_crosswalk["rows"]) != 24:
        fail("Reader B: finding crosswalk")
    if conformance["vectorCount"] != 24 or conformance["passCount"] != 24 or len(conformance["vectors"]) != 24:
        fail("Reader B: conformance denominator")

    mutation = artifacts["hostile-mutation-vectors.json"]
    identities = expected_identities()
    observed_identities = [(row["category"], row["sourceIdentity"]) for row in mutation["vectors"]]
    if mutation["vectorCount"] != 102 or mutation["blockedCount"] != 102 or observed_identities != identities:
        fail("Reader B: mutation denominator")
    for row in mutation["vectors"]:
        data = source_bytes.get(row["path"])
        if data is None:
            data = git(["show", f"{observed_head}:{row['path']}"])
            source_bytes[row["path"]] = data
        delta = row["delta"]
        postimage = data[: delta["startByte"]] + data[delta["startByte"] + delta["deleteByteCount"] :]
        if row["preimageSha256"] != sha256(data) or row["postimageSha256"] != sha256(postimage) or delta != {"deleteByteCount": 1, "operation": "DELETE-EXACT-BYTE", "startByte": row["startByte"]}:
            fail("Reader B: mutation vector operation")
    expected_vectors_root = domain_root("CONNECT-SOURCE-UNIVERSE-V4-MUTATION-VECTORS-V1", {"vectors": mutation["vectors"]})
    if mutation["vectorsRoot"] != expected_vectors_root:
        fail("Reader B: mutation root")
    generation = artifacts["controlled-generation-vectors.json"]
    if generation["status"] != "BLOCKED-PENDING-GENERATION-B" or generation["generationB"] is not None or generation["acceptanceCandidate"] is not None:
        fail("Reader B: generation fail-closed state")

    toolchain_rows = []
    for ordinal, path in enumerate(toolchain_registry["toolchainPaths"], start=1):
        data = git(["show", f"{observed_head}:{path}"])
        mode = git(["ls-tree", observed_head, "--", path]).decode("utf-8").strip().split()[0]
        toolchain_rows.append(
            {
                "byteLength": len(data),
                "mode": mode,
                "ordinal": ordinal,
                "path": path,
                "sha256": sha256(data),
            }
        )
        if FORBIDDEN_RANDOM.search(data):
            fail(f"Reader B: forbidden random API in {path}")
    toolchain_root = domain_root(
        "CONNECT-SOURCE-UNIVERSE-V4-TOOLCHAIN-V1",
        toolchain_rows,
    )
    for path_text, data in {**raw_files, str(CUTOFF_DIR / 'receipt.json'): cutoff_receipt_bytes, str(CUTOFF_DIR / 'manifest.json'): cutoff_manifest_bytes}.items():
        if PRIVATE_LOCATOR.search(data) or SECRET_SHAPE.search(data):
            fail(f"Reader B: unsafe public content in {path_text}")

    checks = [
        {"checkId": check_id, "evidence": evidence, "ordinal": ordinal, "result": "PASS"}
        for ordinal, (check_id, evidence) in enumerate(CHECKS, start=1)
    ]
    report = {
        "artifactId": "CONNECT-SOURCE-UNIVERSE-V4-READER-B-REPORT-2026-08-30-G0",
        "checks": checks,
        "limitations": [
            "PRODUCER-CONTROLLED-READER-NOT-INDEPENDENT-REVIEW",
            "GENERATION-B-ABSENT",
            "B0-AND-REVIEW-PROTOCOL-NOT-ACCEPTED",
            "TRUSTED-TIME-ABSENT",
            "PRIVATE-CUSTODY-ABSENT",
        ],
        "normativeMemberCount": 19,
        "observedHead": observed_head,
        "readerId": "READER-B",
        "readerImplementation": "PYTHON-STDLIB",
        "schemaVersion": "CONNECT-SOURCE-UNIVERSE-V4-READER-REPORT-V1",
        "status": "PASS-LOCAL-CANDIDATE-NOT-ACCEPTED",
        "toolchainRoot": toolchain_root,
        "verificationRoot": domain_root("CONNECT-SOURCE-UNIVERSE-V4-READER-CHECKS-V1", checks),
    }
    report_path = Path(registry["packageMemberPaths"][20])
    if report_path.exists():
        fail("Reader B report already exists")
    content = json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    patch_lines = ["*** Begin Patch", f"*** Add File: {report_path}"]
    patch_lines.extend(f"+{line}" for line in content[:-1].split("\n"))
    patch_lines.append("*** End Patch")
    sys.stdout.write("\n".join(patch_lines) + "\n")


if __name__ == "__main__":
    main()
