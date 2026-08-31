#!/usr/bin/env python3

import copy
import hashlib
import json
import struct
import subprocess
import sys
import unicodedata
from pathlib import Path


GRAPH_PATH = "docs/planning/trd2-v6-candidate-v3-2026-08-31/causal-graph.json"
REPORT_A_PATH = "docs/planning/trd2-v6-candidate-v3-2026-08-31/graph-engine-a-report.json"
REPORT_B_PATH = "docs/planning/trd2-v6-candidate-v3-2026-08-31/graph-engine-b-report.json"
REGISTRY_PATH = "docs/planning/trd2-v6-candidate-v3-2026-08-31/closed-schema-registry-v3.json"
SCRIPT_PATH = "scripts/verify-trd2-v6-pass4-engine-b.py"
SAFE_MAX = 9007199254740991
NODE_KEYS = {"boundRoot", "family", "nodeKey", "producerMode", "recordId", "recordKind", "recordRoot", "schemaVersion", "status"}
EDGE_KEYS = {"edgeKey", "edgeType", "fromNodeRoot", "qualifier", "recordId", "recordKind", "recordRoot", "schemaVersion", "toNodeRoot"}
GRAPH_KEYS = {"artifactId", "artifactRoot", "edgeCollectionRoot", "edgeCount", "edges", "expectedFamilies", "expectedFamilyCount", "nodeCollectionRoot", "nodeCount", "nodes", "omittedFamilies", "recordKind", "schemaVersion", "typedGraphRoot", "umbrellaEdgesCountTowardCausality"}
EDGE_TYPES = {"PRODUCES", "CONSUMES", "INVALIDATES", "FAILS-TO", "BLOCKS-AT", "SUPERSEDES", "BINDS-EXACTLY"}
MUTATIONS = [
    ("MANDATORY-FAMILY-OMISSION", "GRAPH-MANDATORY-FAMILY-OMITTED"),
    ("UNEXPECTED-FAMILY-INSERTION", "GRAPH-UNEXPECTED-FAMILY"),
    ("NODE-ROOT-SUBSTITUTION", "GRAPH-NODE-IDENTITY-MISMATCH"),
    ("EDGE-ENDPOINT-SUBSTITUTION", "GRAPH-EDGE-IDENTITY-MISMATCH"),
    ("DANGLING-ENDPOINT", "GRAPH-DANGLING-EDGE"),
    ("DUPLICATE-EDGE", "GRAPH-DUPLICATE-EDGE"),
    ("PROHIBITED-CYCLE", "GRAPH-PROHIBITED-CYCLE"),
    ("UMBRELLA-ONLY-REACHABILITY", "GRAPH-PRODUCED-NODE-UNREACHABLE"),
    ("FALSE-EXTERNAL-PRODUCER", "GRAPH-FALSE-PRODUCER-CLAIM"),
]


class EngineBError(Exception):
    def __init__(self, terminal, message):
        super().__init__(message)
        self.terminal = terminal


def fail(terminal, message):
    raise EngineBError(terminal, message)


def check(condition, terminal, message):
    if not condition:
        fail(terminal, message)


def scalar_nfc(value):
    if not isinstance(value, str):
        raise ValueError("string required")
    value.encode("utf-8", errors="strict")
    if unicodedata.normalize("NFC", value) != value:
        raise ValueError("NFC required")


def canonical(value):
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int) and not isinstance(value, bool):
        if value < -SAFE_MAX or value > SAFE_MAX:
            raise ValueError("integer outside safe domain")
        return str(value)
    if isinstance(value, str):
        scalar_nfc(value)
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(canonical(member) for member in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys(), key=lambda key: key.encode("utf-8"))
        return "{" + ",".join(f"{canonical(key)}:{canonical(value[key])}" for key in keys) + "}"
    raise ValueError(f"unsupported canonical type {type(value).__name__}")


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def root_v6(type_tag, schema_version, value):
    scalar_nfc(type_tag)
    scalar_nfc(schema_version)
    type_bytes = type_tag.encode("utf-8")
    schema_bytes = schema_version.encode("utf-8")
    body_bytes = canonical(value).encode("utf-8")
    preimage = b"CONNECT-TRD2-V6-ROOT-V1\0" + struct.pack(">I", len(type_bytes)) + type_bytes
    preimage += struct.pack(">I", len(schema_bytes)) + schema_bytes + struct.pack(">Q", len(body_bytes)) + body_bytes
    return sha256_bytes(preimage)


def sorted_strings(values):
    return sorted(values, key=lambda value: value.encode("utf-8"))


def identity_body(record, id_key, root_key):
    return {key: value for key, value in record.items() if key not in (id_key, root_key)}


def attach_identity(prefix, type_tag, schema_version, body, id_key, root_key):
    root = root_v6(type_tag, schema_version, body)
    return {**body, id_key: f"{prefix}-{root}", root_key: root}


def validate_node(node):
    check(isinstance(node, dict) and set(node.keys()) == NODE_KEYS, "GRAPH-NODE-IDENTITY-MISMATCH", "node exact keys")
    root = root_v6("GRAPH-NODE-V3", "CONNECT-TRD2-V6-GRAPH-NODE-V3", identity_body(node, "recordId", "recordRoot"))
    check(node["recordRoot"] == root and node["recordId"] == f"TRD2V6-GRAPH-NODE-V3-{root}", "GRAPH-NODE-IDENTITY-MISMATCH", node.get("nodeKey", "unknown"))
    check(isinstance(node["boundRoot"], str) and len(node["boundRoot"]) == 64 and all(character in "0123456789abcdef" for character in node["boundRoot"]), "GRAPH-NODE-IDENTITY-MISMATCH", "bound root")
    check(isinstance(node["family"], str) and node["family"] and isinstance(node["nodeKey"], str) and node["nodeKey"], "GRAPH-NODE-IDENTITY-MISMATCH", "node strings")
    check(node["producerMode"] in ("SOLE", "EXTERNAL", "COLLECTION") and node["status"] in ("DECLARED", "PRODUCED", "BLOCKED", "INVALIDATED"), "GRAPH-NODE-IDENTITY-MISMATCH", "node enums")


def validate_edge(edge):
    check(isinstance(edge, dict) and set(edge.keys()) == EDGE_KEYS, "GRAPH-EDGE-IDENTITY-MISMATCH", "edge exact keys")
    root = root_v6("GRAPH-EDGE-V3", "CONNECT-TRD2-V6-GRAPH-EDGE-V3", identity_body(edge, "recordId", "recordRoot"))
    check(edge["recordRoot"] == root and edge["recordId"] == f"TRD2V6-GRAPH-EDGE-V3-{root}", "GRAPH-EDGE-IDENTITY-MISMATCH", edge.get("edgeKey", "unknown"))
    check(edge["edgeType"] in EDGE_TYPES and edge["fromNodeRoot"] != edge["toNodeRoot"], "GRAPH-EDGE-IDENTITY-MISMATCH", edge["edgeKey"])
    expected_key = f'{edge["edgeType"]}::{edge["fromNodeRoot"]}::{edge["toNodeRoot"]}::{edge["qualifier"]}'
    check(edge["edgeKey"] == expected_key, "GRAPH-EDGE-IDENTITY-MISMATCH", edge["edgeKey"])


def validate_dag(nodes, edges):
    adjacent = {node["recordRoot"]: [] for node in nodes}
    indegree = {node["recordRoot"]: 0 for node in nodes}
    for edge in edges:
        if edge["edgeType"] == "INVALIDATES":
            continue
        adjacent[edge["fromNodeRoot"]].append(edge["toNodeRoot"])
        indegree[edge["toNodeRoot"]] += 1
    queue = sorted_strings([root for root, count in indegree.items() if count == 0])
    visited = 0
    while queue:
        root = queue.pop(0)
        visited += 1
        for target in adjacent[root]:
            indegree[target] -= 1
            if indegree[target] == 0:
                queue.append(target)
                queue.sort(key=lambda value: value.encode("utf-8"))
    check(visited == len(nodes), "GRAPH-PROHIBITED-CYCLE", f"{visited}/{len(nodes)}")


def produced_reachability(nodes, edges):
    adjacent = {node["recordRoot"]: [] for node in nodes}
    for edge in edges:
        if edge["edgeType"] != "INVALIDATES":
            adjacent[edge["fromNodeRoot"]].append(edge["toNodeRoot"])
    anchors = [node["recordRoot"] for node in nodes if node["nodeKey"].startswith("SCHEMA::")]
    reached = set(anchors)
    queue = list(anchors)
    while queue:
        root = queue.pop(0)
        for target in adjacent[root]:
            if target not in reached:
                reached.add(target)
                queue.append(target)
    produced = [node for node in nodes if node["status"] == "PRODUCED"]
    missing = next((node for node in produced if node["recordRoot"] not in reached), None)
    check(missing is None, "GRAPH-PRODUCED-NODE-UNREACHABLE", "unknown" if missing is None else missing["nodeKey"])
    return len(produced)


def validate_graph(graph, registry):
    check(isinstance(graph, dict) and set(graph.keys()) == GRAPH_KEYS, "GRAPH-ARTIFACT-IDENTITY-MISMATCH", "graph exact keys")
    for node in graph["nodes"]:
        validate_node(node)
    node_keys = [node["nodeKey"] for node in graph["nodes"]]
    node_roots = [node["recordRoot"] for node in graph["nodes"]]
    check(len(set(node_keys)) == len(node_keys) and len(set(node_roots)) == len(node_roots), "GRAPH-DUPLICATE-NODE", "duplicate node")
    expected_families = sorted_strings({schema["family"] for schema in registry["schemas"]})
    actual_families = sorted_strings({node["family"] for node in graph["nodes"]})
    omitted = [family for family in expected_families if family not in actual_families]
    unexpected = [family for family in actual_families if family not in expected_families]
    check(not omitted, "GRAPH-MANDATORY-FAMILY-OMITTED", "" if not omitted else omitted[0])
    check(not unexpected, "GRAPH-UNEXPECTED-FAMILY", "" if not unexpected else unexpected[0])
    check(canonical(graph["expectedFamilies"]) == canonical(expected_families) and graph["expectedFamilyCount"] == len(expected_families) and graph["omittedFamilies"] == [], "GRAPH-FAMILY-DECLARATION-MISMATCH", "family declaration")
    false_external = next((node for node in graph["nodes"] if node["producerMode"] == "EXTERNAL" and node["status"] == "PRODUCED"), None)
    check(false_external is None, "GRAPH-FALSE-PRODUCER-CLAIM", "unknown" if false_external is None else false_external["nodeKey"])

    for edge in graph["edges"]:
        validate_edge(edge)
    edge_keys = [edge["edgeKey"] for edge in graph["edges"]]
    edge_roots = [edge["recordRoot"] for edge in graph["edges"]]
    check(len(set(edge_keys)) == len(edge_keys) and len(set(edge_roots)) == len(edge_roots), "GRAPH-DUPLICATE-EDGE", "duplicate edge")
    node_set = set(node_roots)
    for edge in graph["edges"]:
        check(edge["fromNodeRoot"] in node_set and edge["toNodeRoot"] in node_set, "GRAPH-DANGLING-EDGE", edge["edgeKey"])
    ordered_node_roots = [node["recordRoot"] for node in sorted(graph["nodes"], key=lambda node: node["nodeKey"].encode("utf-8"))]
    ordered_edge_roots = [edge["recordRoot"] for edge in sorted(graph["edges"], key=lambda edge: edge["edgeKey"].encode("utf-8"))]
    check(graph["nodeCount"] == len(graph["nodes"]) and graph["edgeCount"] == len(graph["edges"]), "GRAPH-COUNT-MISMATCH", "counts")
    check(graph["nodeCollectionRoot"] == root_v6("TRD2V6-GRAPH-NODE-COLLECTION-V3", "CONNECT-TRD2-V6-GRAPH-NODE-COLLECTION-V3", ordered_node_roots), "GRAPH-NODE-COLLECTION-ROOT-MISMATCH", "nodes root")
    check(graph["edgeCollectionRoot"] == root_v6("TRD2V6-GRAPH-EDGE-COLLECTION-V3", "CONNECT-TRD2-V6-GRAPH-EDGE-COLLECTION-V3", ordered_edge_roots), "GRAPH-EDGE-COLLECTION-ROOT-MISMATCH", "edges root")
    typed_body = {"edgeRoots": ordered_edge_roots, "expectedFamilies": expected_families, "nodeRoots": ordered_node_roots}
    check(graph["typedGraphRoot"] == root_v6("TRD2V6-TYPED-CAUSAL-GRAPH-V3", "CONNECT-TRD2-V6-TYPED-CAUSAL-GRAPH-V3", typed_body), "GRAPH-TYPED-ROOT-MISMATCH", "typed root")
    artifact_root = root_v6("CAUSAL-GRAPH-V3", "CONNECT-TRD2-V6-CAUSAL-GRAPH-V3", identity_body(graph, "artifactId", "artifactRoot"))
    check(graph["artifactRoot"] == artifact_root and graph["artifactId"] == f"TRD2V6-CAUSAL-GRAPH-V3-{artifact_root}", "GRAPH-ARTIFACT-IDENTITY-MISMATCH", "graph identity")
    check(graph["umbrellaEdgesCountTowardCausality"] is False, "GRAPH-UMBRELLA-POLICY-MISMATCH", "umbrella policy")
    validate_dag(graph["nodes"], graph["edges"])
    produced_count = produced_reachability(graph["nodes"], graph["edges"])
    acceptance = next((node for node in graph["nodes"] if node["nodeKey"] == "EXTERNAL::DEFINITION-ACCEPTANCE-V3"), None)
    check(acceptance is not None and any(edge["edgeType"] != "INVALIDATES" and edge["toNodeRoot"] == acceptance["recordRoot"] for edge in graph["edges"]), "GRAPH-ACCEPTANCE-PATH-MISSING", "acceptance path")
    pre_head = next((node for node in graph["nodes"] if node["nodeKey"] == "DECLARED-HEAD::PRE-REVIEW"), None)
    successor_head = next((node for node in graph["nodes"] if node["nodeKey"] == "DECLARED-HEAD::SUCCESSOR"), None)
    check(pre_head is not None and successor_head is not None and pre_head["recordRoot"] != successor_head["recordRoot"], "GRAPH-HEAD-SEPARATION-MISSING", "head separation")
    check(not any(edge["edgeType"] == "INVALIDATES" and edge["toNodeRoot"] == pre_head["recordRoot"] for edge in graph["edges"]), "GRAPH-SELF-INVALIDATION", "pre-head invalidation")
    invalidation_count = sum(1 for edge in graph["edges"] if edge["edgeType"] == "INVALIDATES" and edge["toNodeRoot"] == successor_head["recordRoot"])
    check(invalidation_count > 0, "GRAPH-INVALIDATION-MAP-MISSING", "invalidation map")
    return {"invalidationEdgeCount": invalidation_count, "producedCount": produced_count}


def attach_node(body):
    return attach_identity("TRD2V6-GRAPH-NODE-V3", "GRAPH-NODE-V3", "CONNECT-TRD2-V6-GRAPH-NODE-V3", body, "recordId", "recordRoot")


def attach_edge(body):
    body = {**body, "edgeKey": f'{body["edgeType"]}::{body["fromNodeRoot"]}::{body["toNodeRoot"]}::{body["qualifier"]}'}
    ordered = {
        "edgeKey": body["edgeKey"],
        "edgeType": body["edgeType"],
        "fromNodeRoot": body["fromNodeRoot"],
        "qualifier": body["qualifier"],
        "recordKind": body["recordKind"],
        "schemaVersion": body["schemaVersion"],
        "toNodeRoot": body["toNodeRoot"],
    }
    return attach_identity("TRD2V6-GRAPH-EDGE-V3", "GRAPH-EDGE-V3", "CONNECT-TRD2-V6-GRAPH-EDGE-V3", ordered, "recordId", "recordRoot")


def seal_graph(graph):
    nodes = sorted(graph["nodes"], key=lambda node: node["nodeKey"].encode("utf-8"))
    edges = sorted(graph["edges"], key=lambda edge: edge["edgeKey"].encode("utf-8"))
    node_roots = [node["recordRoot"] for node in nodes]
    edge_roots = [edge["recordRoot"] for edge in edges]
    body = {
        "edgeCollectionRoot": root_v6("TRD2V6-GRAPH-EDGE-COLLECTION-V3", "CONNECT-TRD2-V6-GRAPH-EDGE-COLLECTION-V3", edge_roots),
        "edgeCount": len(edges),
        "edges": edges,
        "expectedFamilies": graph["expectedFamilies"],
        "expectedFamilyCount": len(graph["expectedFamilies"]),
        "nodeCollectionRoot": root_v6("TRD2V6-GRAPH-NODE-COLLECTION-V3", "CONNECT-TRD2-V6-GRAPH-NODE-COLLECTION-V3", node_roots),
        "nodeCount": len(nodes),
        "nodes": nodes,
        "omittedFamilies": [],
        "recordKind": "CAUSAL-GRAPH-V3",
        "schemaVersion": "CONNECT-TRD2-V6-CAUSAL-GRAPH-V3",
        "typedGraphRoot": root_v6("TRD2V6-TYPED-CAUSAL-GRAPH-V3", "CONNECT-TRD2-V6-TYPED-CAUSAL-GRAPH-V3", {"edgeRoots": edge_roots, "expectedFamilies": graph["expectedFamilies"], "nodeRoots": node_roots}),
        "umbrellaEdgesCountTowardCausality": False,
    }
    return attach_identity("TRD2V6-CAUSAL-GRAPH-V3", "CAUSAL-GRAPH-V3", "CONNECT-TRD2-V6-CAUSAL-GRAPH-V3", body, "artifactId", "artifactRoot")


def schema_root(registry, family):
    matches = [schema["schemaRoot"] for schema in registry["schemas"] if schema["family"] == family]
    if len(matches) != 1:
        raise RuntimeError(f"schema family denominator {family}")
    return matches[0]


def mutation_graph(source, registry, name):
    value = copy.deepcopy(source)
    if name == "MANDATORY-FAMILY-OMISSION":
        removed = {node["recordRoot"] for node in value["nodes"] if node["family"] == "APPEAL-V3"}
        value["nodes"] = [node for node in value["nodes"] if node["family"] != "APPEAL-V3"]
        value["edges"] = [edge for edge in value["edges"] if edge["fromNodeRoot"] not in removed and edge["toNodeRoot"] not in removed]
        return seal_graph(value)
    if name == "UNEXPECTED-FAMILY-INSERTION":
        value["nodes"].append(attach_node({"boundRoot": schema_root(registry, "APPEAL-V3"), "family": "UNDECLARED-GRAPH-FAMILY", "nodeKey": "MUTATION::UNEXPECTED-FAMILY", "producerMode": "SOLE", "recordKind": "GRAPH-NODE-V3", "schemaVersion": "CONNECT-TRD2-V6-GRAPH-NODE-V3", "status": "DECLARED"}))
        return seal_graph(value)
    if name == "NODE-ROOT-SUBSTITUTION":
        value["nodes"][0]["boundRoot"] = "f" * 64
        return value
    if name == "EDGE-ENDPOINT-SUBSTITUTION":
        value["edges"][0]["toNodeRoot"] = value["nodes"][-1]["recordRoot"]
        return value
    if name == "DANGLING-ENDPOINT":
        edge = value["edges"][0]
        edge["toNodeRoot"] = "e" * 64
        value["edges"][0] = attach_edge({key: val for key, val in edge.items() if key not in ("edgeKey", "recordId", "recordRoot")})
        return seal_graph(value)
    if name == "DUPLICATE-EDGE":
        value["edges"].append(copy.deepcopy(value["edges"][0]))
        return seal_graph(value)
    if name == "PROHIBITED-CYCLE":
        source_node = next(node for node in value["nodes"] if node["nodeKey"] == "ARTIFACT::SOURCE-CAPTURE-MANIFEST")
        parser_node = next(node for node in value["nodes"] if node["nodeKey"] == "ARTIFACT::PARSER-GRAMMAR-CORPUS")
        value["edges"].append(attach_edge({"edgeType": "CONSUMES", "fromNodeRoot": parser_node["recordRoot"], "qualifier": "MUTATION-CREATES-PROHIBITED-CYCLE", "recordKind": "GRAPH-EDGE-V3", "schemaVersion": "CONNECT-TRD2-V6-GRAPH-EDGE-V3", "toNodeRoot": source_node["recordRoot"]}))
        return seal_graph(value)
    if name == "UMBRELLA-ONLY-REACHABILITY":
        target = next(node for node in value["nodes"] if node["nodeKey"].startswith("TRANSITION::"))
        value["edges"] = [edge for edge in value["edges"] if edge["toNodeRoot"] != target["recordRoot"]]
        anchor = next(node for node in value["nodes"] if node["nodeKey"].startswith("SCHEMA::"))
        value["edges"].append(attach_edge({"edgeType": "INVALIDATES", "fromNodeRoot": anchor["recordRoot"], "qualifier": "MUTATION-UMBRELLA-ONLY", "recordKind": "GRAPH-EDGE-V3", "schemaVersion": "CONNECT-TRD2-V6-GRAPH-EDGE-V3", "toNodeRoot": target["recordRoot"]}))
        return seal_graph(value)
    if name == "FALSE-EXTERNAL-PRODUCER":
        value["nodes"].append(attach_node({"boundRoot": schema_root(registry, "DEFINITION-ACCEPTANCE-V3"), "family": "DEFINITION-ACCEPTANCE-V3", "nodeKey": "MUTATION::FALSE-EXTERNAL-PRODUCER", "producerMode": "EXTERNAL", "recordKind": "GRAPH-NODE-V3", "schemaVersion": "CONNECT-TRD2-V6-GRAPH-NODE-V3", "status": "PRODUCED"}))
        return seal_graph(value)
    raise RuntimeError(f"unknown mutation {name}")


def evaluate_mutations(graph, registry):
    outcomes = []
    for name, expected_terminal in MUTATIONS:
        terminal = "ACCEPT"
        try:
            validate_graph(mutation_graph(graph, registry, name), registry)
        except EngineBError as error:
            terminal = error.terminal
        check(terminal == expected_terminal, "GRAPH-MUTATION-TERMINAL-MISMATCH", f"{name}:{terminal}/{expected_terminal}")
        outcomes.append({"mutation": name, "result": "BLOCKED", "terminal": terminal})
    return outcomes


def build_report(graph, registry):
    validation = validate_graph(graph, registry)
    mutation_outcomes = evaluate_mutations(graph, registry)
    outcome_body = {
        "edgeCount": graph["edgeCount"],
        "expectedFamiliesRoot": root_v6("TRD2V6-PASS4-EXPECTED-FAMILY-SET", "CONNECT-TRD2-V6-PASS4-EXPECTED-FAMILY-SET-V1", graph["expectedFamilies"]),
        "graphRoot": graph["artifactRoot"],
        "invalidationEdgeCount": validation["invalidationEdgeCount"],
        "mutationOutcomes": mutation_outcomes,
        "nodeCount": graph["nodeCount"],
        "producedNodeCount": validation["producedCount"],
        "reachableProducedCount": validation["producedCount"],
        "typedGraphRoot": graph["typedGraphRoot"],
    }
    outcome_root = root_v6("TRD2V6-PASS4-GRAPH-OUTCOME", "CONNECT-TRD2-V6-PASS4-GRAPH-OUTCOME-V1", outcome_body)
    body = {
        "edgeCount": graph["edgeCount"],
        "engineId": "GRAPH-V3-ENGINE-B",
        "failureCount": 0,
        "graphRoot": graph["artifactRoot"],
        "mutationCount": len(MUTATIONS),
        "nodeCount": graph["nodeCount"],
        "outcomeRoot": outcome_root,
        "recordKind": "GRAPH-REPORT-V3",
        "schemaVersion": "CONNECT-TRD2-V6-GRAPH-REPORT-V3",
        "sourceSha256": sha256_bytes(Path(SCRIPT_PATH).read_bytes()),
        "status": "PASS",
    }
    return attach_identity("TRD2V6-GRAPH-REPORT-V3", "GRAPH-REPORT-V3", "CONNECT-TRD2-V6-GRAPH-REPORT-V3", body, "artifactId", "artifactRoot")


def run_git(arguments):
    result = subprocess.run(["git", *arguments], check=False, capture_output=True, cwd=Path.cwd())
    if result.returncode != 0:
        raise RuntimeError(f"git {' '.join(arguments)} failed: {result.stderr.decode('utf-8', errors='replace').strip()}")
    return result.stdout


def observed_head(graph):
    matches = [node["nodeKey"].split("::", 1)[1] for node in graph["nodes"] if node["nodeKey"].startswith("TOOLCHAIN-COMMIT::")]
    if len(matches) != 1 or len(matches[0]) not in (40, 64) or any(character not in "0123456789abcdef" for character in matches[0]):
        raise RuntimeError("Pass 4 graph lacks one frozen toolchain commit")
    return matches[0]


def verify_frozen_source(graph):
    frozen = run_git(["show", f"{observed_head(graph)}:{SCRIPT_PATH}"])
    if frozen != Path(SCRIPT_PATH).read_bytes():
        raise RuntimeError("Engine B differs from frozen Pass 4 toolchain")


def worktree_paths():
    raw = run_git(["status", "--porcelain=v1", "-z", "--untracked-files=all"])
    return [record[3:] for record in raw.decode("utf-8").split("\0") if record]


def assert_emit_worktree():
    paths = worktree_paths()
    if set(paths) != {GRAPH_PATH, REPORT_A_PATH} or len(paths) != 2 or Path(REPORT_B_PATH).exists():
        raise RuntimeError("Engine B emit requires only graph and Engine A report candidates")


def pretty(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def patch(report):
    lines = pretty(report).rstrip("\n").split("\n")
    return f"*** Begin Patch\n*** Add File: {REPORT_B_PATH}\n" + "\n".join(f"+{line}" for line in lines) + "\n*** End Patch\n"


def main():
    graph = json.loads(Path(GRAPH_PATH).read_text(encoding="utf-8"))
    registry = json.loads(Path(REGISTRY_PATH).read_text(encoding="utf-8"))
    verify_frozen_source(graph)
    report = build_report(graph, registry)
    if "--emit-patch" in sys.argv:
        assert_emit_worktree()
        sys.stdout.write(patch(report))
    else:
        sys.stdout.write(pretty(report))


if __name__ == "__main__":
    main()
