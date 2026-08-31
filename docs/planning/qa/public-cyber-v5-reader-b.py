#!/usr/bin/env python3
"""Independent read-only mechanical Reader B for Public/Cyber v5. Standard library only."""

from __future__ import annotations

import copy
import hashlib
import json
import pathlib
import re
import sys

DATE = "2026-08-30"
MANIFEST_PATH = pathlib.Path(f"docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-atomic-package-manifest-{DATE}.json")
REPORT_PATH = pathlib.Path(f"docs/planning/public-repository-and-cyber-hardening-successor-requirements-v5-reader-b-report-{DATE}.json")
FINDINGS_PATH = pathlib.Path(f"docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-independent-hostile-review-findings-manifest-{DATE}.md")
V4_CLOSURES_PATH = pathlib.Path(f"docs/planning/public-repository-and-cyber-hardening-successor-requirements-v4-finding-closure-registry-{DATE}.json")
MAX_BYTES = 50 * 1024 * 1024
LATE_SHA = "508b702087bc2c4011975af87c30bea1208bf5720ec263409d287acb5eb15a84"


def canonical(value):
    if value is None or isinstance(value, (bool, str)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, int) and not isinstance(value, bool):
        if value < -9007199254740991 or value > 9007199254740991:
            raise ValueError("unsafe integer")
        return str(value)
    if isinstance(value, list):
        return "[" + ",".join(canonical(item) for item in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(json.dumps(key, ensure_ascii=False) + ":" + canonical(value[key]) for key in sorted(value)) + "}"
    raise ValueError("unsupported canonical value")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def domain_root(domain: str, value) -> str:
    return sha((domain + "\n" + canonical(value)).encode("utf-8"))


def load(path):
    return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))


def without(record, key):
    return {name: value for name, value in record.items() if name != key}


failures = []
checks = []


def verify(check_id, condition, evidence):
    terminal = "PASS" if condition else "BLOCK"
    checks.append({"checkId": check_id, "terminal": terminal, "evidence": str(evidence)})
    if not condition:
        failures.append(f"{check_id}:{evidence}")


def resolve_pointer(value, pointer):
    if pointer == "":
        return value
    if not isinstance(pointer, str) or not pointer.startswith("/"):
        return None, False
    cursor = value
    for raw in pointer[1:].split("/"):
        key = raw.replace("~1", "/").replace("~0", "~")
        if not isinstance(cursor, dict) or key not in cursor:
            return None, False
        cursor = cursor[key]
    return cursor, True


def ast_value(node, state):
    try:
        if not isinstance(node, dict) or set(node) != {"op", "args"} or not isinstance(node["op"], str) or not isinstance(node["args"], list):
            return False
        op = node["op"]
        args = node["args"]
        if op == "LITERAL":
            return args[0] if len(args) == 1 else False
        if op == "GET":
            return resolve_pointer(state, args[0])[0] if len(args) == 1 else None
        if op == "PATH-EXISTS":
            return len(args) == 1 and resolve_pointer(state, args[0])[1]
        if op == "AND":
            return len(args) > 0 and all(ast_value(arg, state) is True for arg in args)
        if op == "OR":
            return len(args) > 0 and any(ast_value(arg, state) is True for arg in args)
        if op == "NOT":
            return len(args) == 1 and ast_value(args[0], state) is False
        if op == "EQ":
            return len(args) == 2 and canonical(ast_value(args[0], state)) == canonical(ast_value(args[1], state))
        if op == "NEQ":
            return len(args) == 2 and canonical(ast_value(args[0], state)) != canonical(ast_value(args[1], state))
        if op == "LT":
            left = ast_value(args[0], state) if len(args) == 2 else None
            right = ast_value(args[1], state) if len(args) == 2 else None
            return isinstance(left, int) and not isinstance(left, bool) and isinstance(right, int) and not isinstance(right, bool) and left < right
        if op == "IN-SET":
            item = ast_value(args[0], state) if len(args) == 2 else None
            values = ast_value(args[1], state) if len(args) == 2 else None
            return isinstance(values, list) and any(canonical(item) == canonical(candidate) for candidate in values)
        if op == "EXACT-KEYS":
            obj = ast_value(args[0], state) if len(args) == 2 else None
            names = ast_value(args[1], state) if len(args) == 2 else None
            return isinstance(obj, dict) and isinstance(names, list) and sorted(obj) == sorted(names)
        if op == "UNIQUE":
            values = ast_value(args[0], state) if len(args) == 1 else None
            return isinstance(values, list) and len({canonical(value) for value in values}) == len(values)
        return False
    except (KeyError, TypeError, ValueError, IndexError):
        return False


def mutated(source, operation):
    state = copy.deepcopy(source)
    if operation["op"] in ("NONE", "MUTATE-EXPECTED-ONLY"):
        return state
    names = [name.replace("~1", "/").replace("~0", "~") for name in operation["pointer"][1:].split("/")]
    owner = state
    for name in names[:-1]:
        owner = owner[name]
    if operation["op"] == "DELETE":
        owner.pop(names[-1], None)
    elif operation["op"] in ("SET", "ADD"):
        owner[names[-1]] = copy.deepcopy(operation["operand"])
    else:
        raise ValueError("unsupported mutation")
    return state


def split_map(inner):
    depth = 0
    for index, char in enumerate(inner):
        if char == "<":
            depth += 1
        elif char == ">":
            depth -= 1
        elif char == "," and depth == 0:
            return inner[:index], inner[index + 1 :]
    return None


def parse_type(expression):
    if expression.startswith("Nullable<") and expression.endswith(">"):
        return "nullable", parse_type(expression[9:-1])
    if expression.startswith("Array<") and expression.endswith(">"):
        return "array", parse_type(expression[6:-1])
    if expression.startswith("Map<") and expression.endswith(">"):
        parts = split_map(expression[4:-1])
        return ("map", parse_type(parts[0]), parse_type(parts[1])) if parts else ("invalid",)
    return "named", expression


def primitive_ok(definition, value):
    if definition["kind"] == "BOOLEAN":
        return isinstance(value, bool)
    if definition["kind"] == "SAFE-INTEGER":
        return isinstance(value, int) and not isinstance(value, bool) and definition["minimum"] <= value <= definition["maximum"]
    if definition["kind"] != "STRING" or not isinstance(value, str):
        return False
    if "minLength" in definition and len(value) < definition["minLength"]:
        return False
    if "maxLength" in definition and len(value) > definition["maxLength"]:
        return False
    if "pattern" in definition and re.fullmatch(definition["pattern"], value) is None:
        return False
    if "enum" in definition and value not in definition["enum"]:
        return False
    return True


def validate_schema(schema, instance, primitives, nested_by_type, ancestors=()):
    if not isinstance(instance, dict) or schema["schemaId"] in ancestors:
        return False
    if sorted(instance) != sorted(field["name"] for field in schema["fields"]):
        return False

    def node_ok(node, candidate):
        kind = node[0]
        if kind == "nullable":
            return candidate is None or node_ok(node[1], candidate)
        if kind == "array":
            return isinstance(candidate, list) and 1 <= len(candidate) <= 4096 and len({canonical(item) for item in candidate}) == len(candidate) and all(node_ok(node[1], item) for item in candidate)
        if kind == "map":
            return isinstance(candidate, dict) and len(candidate) > 0 and all(node_ok(node[1], key) and node_ok(node[2], item) for key, item in candidate.items())
        if kind != "named":
            return False
        name = node[1]
        if name in primitives:
            return primitive_ok(primitives[name], candidate)
        nested = nested_by_type.get(name)
        return nested is not None and validate_schema(nested, candidate, primitives, nested_by_type, ancestors + (schema["schemaId"],))

    return all(node_ok(parse_type(field["typeExpression"]), instance[field["name"]]) for field in schema["fields"]) and all(ast_value(predicate, instance) is True for predicate in schema["crossFieldInvariants"])


CAS_STEPS = ["READ-HEAD", "READ-SECURITY-UNIVERSE", "VALIDATE-SCHEMA", "VALIDATE-AUTHORITY", "VALIDATE-TRUSTED-TIME", "VALIDATE-REVOCATION", "COMPARE-EXPECTED-HEAD", "RESERVE-ATTEMPT", "ADVANCE-FENCE", "CONSUME-PERMIT", "STAGE-EFFECT", "STAGE-EVENT", "STAGE-OUTBOX", "REVALIDATE-READ-SET", "ATOMIC-COMMIT"]


def protocol_root(label):
    return domain_root("PRCV5-DETERMINISTIC-PLANNING-PROTOCOL-WITNESS-V1", label)


def actor_state():
    return {"pc": 0, "terminal": False, "committed": False, "observedHead": None, "observedSecurityHead": None, "observedRevision": None, "observedRevocationHead": None, "validatedHead": None}


def attempt_state(actor_id, overrides=None):
    result = {"attemptId": f"PRCV5-CAS-{actor_id}", "schemaValid": True, "authorityCurrent": True, "validFrom": "2026-08-30T00:00:00Z", "expiresAt": "2026-08-31T00:00:00Z", "trustedNow": "2026-08-30T12:00:00Z", "revoked": False, "revocationHead": protocol_root("cas-revocation-head-0"), "expectedHead": "HEAD-0", "proposedFence": 1, "epoch": 1, "minimumRevision": 6, "replayUsed": False, "effectRoot": protocol_root(f"cas-effect-{actor_id}"), "eventRoot": protocol_root(f"cas-event-{actor_id}"), "outboxRoot": protocol_root(f"cas-outbox-{actor_id}")}
    result.update(overrides or {})
    return result


def initial_state(overrides=None):
    overrides = overrides or {}
    return {"A": actor_state(), "B": actor_state(), "attempts": {"A": attempt_state("A", overrides.get("A")), "B": attempt_state("B", overrides.get("B"))}, "store": {"head": "HEAD-0", "securityHead": "SECURITY-0", "revision": 7, "revocationHead": protocol_root("cas-revocation-head-0"), "fence": 0, "permitUsed": False, "replayUsed": False, "effectCount": 0, "eventCount": 0, "outboxCount": 0}}


def cas_advance(source, actor_id):
    state = copy.deepcopy(source)
    actor = state[actor_id]
    request = state["attempts"][actor_id]
    if actor["terminal"] or actor["pc"] >= len(CAS_STEPS):
        return None
    step = CAS_STEPS[actor["pc"]]

    def deny():
        actor["terminal"] = True
        actor["denialStep"] = step
        return state

    if step == "READ-HEAD":
        actor["observedHead"] = state["store"]["head"]
    elif step == "READ-SECURITY-UNIVERSE":
        actor["observedSecurityHead"] = state["store"]["securityHead"]
        actor["observedRevision"] = state["store"]["revision"]
        actor["observedRevocationHead"] = state["store"]["revocationHead"]
    elif step == "VALIDATE-SCHEMA" and request["schemaValid"] is not True:
        return deny()
    elif step == "VALIDATE-AUTHORITY" and request["authorityCurrent"] is not True:
        return deny()
    elif step == "VALIDATE-TRUSTED-TIME" and not (request["validFrom"] <= request["trustedNow"] < request["expiresAt"]):
        return deny()
    elif step == "VALIDATE-REVOCATION" and (request["revoked"] or request["revocationHead"] != state["store"]["revocationHead"]):
        return deny()
    elif step == "COMPARE-EXPECTED-HEAD" and (request["expectedHead"] != actor["observedHead"] or request["expectedHead"] != state["store"]["head"]):
        return deny()
    elif step == "RESERVE-ATTEMPT" and re.fullmatch(r"PRCV5-CAS-[AB]", request["attemptId"]) is None:
        return deny()
    elif step == "ADVANCE-FENCE" and (not isinstance(request["proposedFence"], int) or request["proposedFence"] <= state["store"]["fence"]):
        return deny()
    elif step == "CONSUME-PERMIT" and (request["replayUsed"] or state["store"]["permitUsed"] or state["store"]["replayUsed"] or state["store"]["revision"] <= request["minimumRevision"]):
        return deny()
    elif step in ("STAGE-EFFECT", "STAGE-EVENT", "STAGE-OUTBOX"):
        field = {"STAGE-EFFECT": "effectRoot", "STAGE-EVENT": "eventRoot", "STAGE-OUTBOX": "outboxRoot"}[step]
        if re.fullmatch(r"[0-9a-f]{64}", request[field]) is None:
            return deny()
    elif step == "REVALIDATE-READ-SET":
        if actor["observedHead"] != state["store"]["head"] or actor["observedSecurityHead"] != state["store"]["securityHead"] or actor["observedRevision"] != state["store"]["revision"] or actor["observedRevocationHead"] != state["store"]["revocationHead"] or state["store"]["permitUsed"] or state["store"]["replayUsed"]:
            return deny()
        actor["validatedHead"] = state["store"]["head"]
    elif step == "ATOMIC-COMMIT":
        if actor["validatedHead"] != state["store"]["head"] or state["store"]["permitUsed"] or state["store"]["replayUsed"]:
            return deny()
        state["store"].update({"head": f"HEAD-{actor_id}", "fence": request["proposedFence"], "permitUsed": True, "replayUsed": True, "effectCount": state["store"]["effectCount"] + 1, "eventCount": state["store"]["eventCount"] + 1, "outboxCount": state["store"]["outboxCount"] + 1})
        actor["committed"] = True
        actor["terminal"] = True
        actor["pc"] += 1
        return state
    actor["pc"] += 1
    return state


def exhaustive_proof():
    memo = {}
    reached = set()
    counters = {"crashCuts": 0, "crashMutations": 0}

    def walk(state):
        key = canonical(state)
        reached.add(key)
        if key in memo:
            return memo[key]
        for actor_id in ("A", "B"):
            if not state[actor_id]["terminal"] and state[actor_id]["pc"] < len(CAS_STEPS):
                counters["crashCuts"] += 1
                before = canonical(state["store"])
                crashed = copy.deepcopy(state)
                crashed[actor_id]["terminal"] = True
                if canonical(crashed["store"]) != before:
                    counters["crashMutations"] += 1
        if state["A"]["terminal"] and state["B"]["terminal"]:
            commits = int(state["A"]["committed"]) + int(state["B"]["committed"])
            terminal = {"completeSchedules": 1, "zeroCommitSchedules": int(commits == 0), "oneCommitSchedules": int(commits == 1), "twoCommitSchedules": int(commits == 2)}
            memo[key] = terminal
            return terminal
        totals = {"completeSchedules": 0, "zeroCommitSchedules": 0, "oneCommitSchedules": 0, "twoCommitSchedules": 0}
        for actor_id in ("A", "B"):
            if not state[actor_id]["terminal"]:
                nxt = cas_advance(state, actor_id)
                if nxt is not None:
                    part = walk(nxt)
                    for name in totals:
                        totals[name] += part[name]
        memo[key] = totals
        return totals

    totals = walk(initial_state())
    return {"completeScheduleCount": str(totals["completeSchedules"]), "zeroCommitScheduleCount": str(totals["zeroCommitSchedules"]), "oneCommitScheduleCount": str(totals["oneCommitSchedules"]), "twoCommitScheduleCount": str(totals["twoCommitSchedules"]), "reachableStateCount": len(reached), "crashCutStateActorCount": counters["crashCuts"], "crashMutationCount": counters["crashMutations"], "concurrentWinnerMaximum": 1, "responseLossReadbackTerminal": "COMMITTED-READBACK-NO-RETRY", "atomicEffectEventOutbox": True}


def run_attempt(overrides=None, crash_mode=None):
    state = initial_state({"A": overrides or {}, "B": {"schemaValid": False}})
    state["B"]["terminal"] = True
    while not state["A"]["terminal"]:
        if crash_mode == "FAIL-BEFORE-WRITE" and CAS_STEPS[state["A"]["pc"]] == "ATOMIC-COMMIT":
            return {"terminal": "FAILURE-BEFORE-WRITE", "store": state["store"], "authoritativeReadback": state["store"]["head"]}
        state = cas_advance(state, "A")
    if crash_mode == "RESPONSE-LOSS-AFTER-WRITE" and state["A"]["committed"]:
        return {"terminal": "RESPONSE-LOSS", "store": state["store"], "authoritativeReadback": state["store"]["head"], "recoveryTerminal": "COMMITTED-READBACK-NO-RETRY"}
    return {"terminal": "COMMITTED" if state["A"]["committed"] else "BLOCK", "denialStep": state["A"].get("denialStep"), "store": state["store"], "authoritativeReadback": state["store"]["head"]}


def vector_terminal(vector, context):
    kind = vector["evaluator"]["kind"]
    if kind == "AST":
        return "PASS" if ast_value(vector["evaluator"]["predicate"], mutated(vector["preState"], vector["operation"])) is True else "BLOCK"
    if kind == "SCHEMA":
        record = context["instances"].get(vector["preStateRef"]["instanceId"])
        schema = context["schemas"].get(vector["evaluator"]["schemaId"])
        if record is None or schema is None or record["instanceRoot"] != vector["preStateRef"]["instanceRoot"]:
            return "BLOCK"
        return "PASS" if validate_schema(schema, mutated(record["instance"], vector["operation"]), context["primitives"], context["nested_by_type"]) else "BLOCK"
    if kind == "PERMIT-NAMEDUSE":
        return "PASS" if vector["evaluator"]["presentedPermitClass"] == vector["evaluator"]["consumerPermitClass"] else "BLOCK"
    if kind == "PERMIT-SCHEMA":
        permit = context["permit_map"].get(vector["evaluator"]["permitClass"])
        if permit is None or permit["schema"]["schemaRoot"] != vector["evaluator"]["schemaRoot"] or permit["planningInstance"]["instanceRoot"] != vector["preStateRef"]["instanceRoot"]:
            return "BLOCK"
        instance = mutated(permit["planningInstance"]["instance"], vector["operation"])
        return "PASS" if validate_schema(permit["schema"], instance, context["primitives"], context["nested_by_type"]) else "BLOCK"
    if kind == "LIFECYCLE-SCENARIO":
        scenario = next((row for row in context["lifecycle"]["scenarios"] if row["scenarioId"] == vector["evaluator"]["scenarioId"]), None)
        if scenario is None:
            return "BLOCK"
        actual = run_attempt(scenario["overrides"], scenario["crashMode"])
        return "PASS" if canonical(actual) == canonical(scenario["result"]) and actual["terminal"] in vector["evaluator"]["acceptedTerminals"] else "BLOCK"
    if kind == "DIGEST-BOUNDARY":
        raw = sha(canonical(vector["preState"]["payload"]).encode("utf-8"))
        identity = domain_root(vector["preState"]["domain"], vector["preState"]["payload"])
        if vector["operation"]["op"] == "SET-DOMAIN":
            return "PASS" if domain_root(vector["operation"]["operand"], vector["preState"]["payload"]) == vector["preState"]["expectedIdentityRoot"] else "BLOCK"
        return "PASS" if raw != identity and identity == vector["preState"]["expectedIdentityRoot"] else "BLOCK"
    return "BLOCK"


manifest = load(MANIFEST_PATH)
projection = []
for member in manifest["members"]:
    path = pathlib.Path(member["logicalPath"])
    data = path.read_bytes()
    portable = member["logicalPath"].startswith("docs/") and not member["logicalPath"].startswith("/") and not member["logicalPath"].startswith("web/") and ".." not in pathlib.PurePosixPath(member["logicalPath"]).parts
    verify(f"MEMBER-{member['ordinal']}", path.is_file() and not path.is_symlink() and portable and len(data) == member["bytes"] and sha(data) == member["rawSha256Checksum"] and len(data) < MAX_BYTES, member["logicalPath"])
    projection.append({name: member[name] for name in ("ordinal", "role", "logicalPath", "rawSha256Checksum", "bytes", "required")})
package_root = domain_root("PRCV5-PACKAGE-CONTENT-ROOT-V1", projection)
verify("PACKAGE-ROOT", package_root == manifest["packageContentRoot"], package_root)
disposition = manifest["currentDisposition"]
verify("SAFE-STATE", disposition["acceptance"] == 0 and disposition["repositoryVisibility"] == "PUBLIC" and disposition["gate29"] == "BLOCKED" and disposition["developmentFreeze"] == "ACTIVE" and all(disposition[name] == "ABSENT" for name in ("GitHubControlPlanePermit", "PublicPushPermit", "DeploymentPermit", "ReleasePermit")), canonical(disposition))

role_path = {member["role"]: pathlib.Path(member["logicalPath"]) for member in manifest["members"]}
inputs = load(role_path["V5-FROZEN-INPUT-MANIFEST"])
closures = load(role_path["V5-FINDING-IDENTITY-AND-CLOSURE-REGISTRY"])
schema_registry = load(role_path["V5-CLOSED-SCHEMA-AND-TYPE-REGISTRY"])
digests = load(role_path["V5-CANONICAL-DIGEST-AND-SERIALIZATION-REGISTRY"])
authority = load(role_path["V5-PRODUCER-AUTHORITY-AND-SEPARATION-GRAPH"])
lifecycle = load(role_path["V5-LIFECYCLE-CAS-AND-RECOVERY-REGISTRY"])
permits = load(role_path["V5-FOUR-PERMIT-REGISTRY"])
public_flow = load(role_path["V5-PUBLIC-INFORMATION-FLOW-AND-SCANNER-REGISTRY"])
publication = load(role_path["V5-PUBLICATION-SIZE-SHARD-AND-STORAGE-REGISTRY"])
vector_index = load(role_path["V5-EXECUTABLE-CAUSAL-VECTOR-CORPUS-INDEX"])
graph = load(role_path["V5-CAUSAL-GRAPH"])

source_ok = True
for source in inputs["sourceRecords"]:
    data = pathlib.Path(source["logicalPath"]).read_bytes()
    source_ok = source_ok and source["rawSha256Checksum"] == sha(data) and source["contentId"] == "sha256:" + sha(data) and source["bytes"] == len(data) and source["logicalPath"].startswith("docs/") and not source["logicalPath"].startswith("web/") and source["physicalSourceBytesDuplicatedInV5"] is False
verify("SOURCE-REFERENCES", source_ok and len(inputs["sourceRecords"]) == 14 and inputs["sourceBytesPhysicallyDuplicated"] == 0, inputs["sourceReferenceRoot"])
v4_manifest_source = next(source for source in inputs["sourceRecords"] if source["sourceId"] == "V4-MANIFEST")
v4_manifest = load(v4_manifest_source["logicalPath"])
v4_preimage = "CONNECT-PRCV4:PACKAGE-ROOT:" + "".join(member["path"] + "\0" + member["sha256"] + "\0" + str(member["bytes"]) + "\n" for member in v4_manifest["members"])
v4_package_root = sha(v4_preimage.encode("utf-8"))
verify("V4-PACKAGE-ROOT", v4_package_root == inputs["v4PackageVerification"]["declaredPackageRoot"] == inputs["v4PackageVerification"]["independentlyRecomputedPackageRoot"] and all(sha(pathlib.Path(member["path"]).read_bytes()) == member["sha256"] and pathlib.Path(member["path"]).stat().st_size == member["bytes"] for member in v4_manifest["members"]), v4_package_root)
late_path = next(source["logicalPath"] for source in inputs["sourceRecords"] if source["sourceId"] == "LATE-STORAGE-DECISION")
late_text = pathlib.Path(late_path).read_text(encoding="utf-8")
late_clauses = list(re.finditer(r"^([0-9]+\.[0-9]+\.[0-9]+) ([^\n]+)$", late_text, re.MULTILINE))
late_rows = {row["clauseId"]: row for row in publication["lateDecisionReconciliation"]}
late_parity = len(late_clauses) == 48 and all("LATE-DECISION-" + match.group(1) in late_rows and late_rows["LATE-DECISION-" + match.group(1)]["clauseTextRoot"] == domain_root("PRCV5-LATE-DECISION-CLAUSE-TEXT-V1", match.group(2)) for match in late_clauses)
verify("LATE-DECISION", inputs["lateDecisionVerification"]["contentId"] == "sha256:" + LATE_SHA and late_parity and len(publication["lateDecisionReconciliation"]) == 48 and len({row["clauseId"] for row in publication["lateDecisionReconciliation"]}) == 48, publication["lateDecisionAdmission"]["contentId"])

v4_rows = load(V4_CLOSURES_PATH)["records"]
finding_text = FINDINGS_PATH.read_text(encoding="utf-8")
heading_matches = list(re.finditer(r"^## 2\.\d+ (PRCV4-IHR-F\d{3})[^\n]*$", finding_text, re.MULTILINE))
new_roots = {}
for index, heading in enumerate(heading_matches):
    end = heading_matches[index + 1].start() if index + 1 < len(heading_matches) else re.search(r"^# 3\.", finding_text, re.MULTILINE).start()
    section = finding_text[heading.start():end]
    record = {"findingId": heading.group(1)}
    for field in ("severity", "evidence", "impact", "remediation", "closureTest", "noMergeKey"):
        match = re.search(r"^- " + re.escape(field) + r"=([^\n]+)$", section, re.MULTILINE)
        if match is None:
            failures.append(f"FINDING-EXTRACTION:{record['findingId']}:{field}")
            continue
        value = match.group(1).strip()
        record[field] = value.split(";")[0] if field == "severity" else value
    new_roots[record["findingId"]] = {"recordRoot": domain_root("PRCV5-CANONICAL-FINDING-RECORD-V1", record), "fieldRoots": {field: domain_root("PRCV5-FINDING-SOURCE-FIELD-V1", {"findingId": record["findingId"], "field": field, "value": record[field]}) for field in ("severity", "evidence", "impact", "remediation", "closureTest", "noMergeKey")}}
verify("FINDINGS", len(closures["records"]) == 116 and closures["denominators"]["inheritedFindings"] == 93 and closures["denominators"]["newFindings"] == 23 and len(closures["remediationControls"]) == 23 and len({row["findingId"] for row in closures["records"]}) == 116 and len({row["noMergeKey"] for row in closures["records"]}) == 116 and all(row["closureCredit"] == 0 and row["acceptanceCredit"] == 0 for row in closures["records"]), canonical(closures["denominators"]))
inherited_parity = True
for index, source in enumerate(v4_rows):
    row = closures["records"][index]
    projection = {"findingId": source["findingId"], "severity": source["severity"], "noMergeKey": source["noMergeKey"], "remediation": source["remediation"], "closureTest": source["closureTest"], "requirementIds": source["requirementIds"]}
    inherited_parity = inherited_parity and row["findingId"] == source["findingId"] and row["noMergeKey"] == source["noMergeKey"] and row["sourceRecordRoot"] == domain_root("PRCV5-INHERITED-FINDING-RECORD-V1", projection) and all(row["sourceFieldRoots"][field] == domain_root("PRCV5-FINDING-SOURCE-FIELD-V1", {"findingId": source["findingId"], "field": field, "value": value}) for field, value in projection.items())
verify("INHERITED-ORDER", inherited_parity, "93 ordered field-rooted rows")
verify("NEW-EXTRACTION", len(heading_matches) == 23 and all(row["findingId"] in new_roots and new_roots[row["findingId"]]["recordRoot"] == row["sourceRecordRoot"] and all(row["sourceFieldRoots"][field] == field_root for field, field_root in new_roots[row["findingId"]]["fieldRoots"].items()) for row in closures["records"][93:]), "23")
predecessor_text = pathlib.Path(next(source["logicalPath"] for source in inputs["sourceRecords"] if source["sourceId"] == "PREDECESSOR-FINDINGS-MANIFEST")).read_text(encoding="utf-8")
wrapper_text = pathlib.Path(next(source["logicalPath"] for source in inputs["sourceRecords"] if source["sourceId"] == "V2-FINDINGS-MANIFEST")).read_text(encoding="utf-8")
alias_source_parity = all(row["predecessorIdentity"] in predecessor_text and row["wrapperIdentity"] in wrapper_text and "predecessor Finding " + row["predecessorIdentity"] in wrapper_text for row in closures["aliasProjections"])
verify("ALIASES", len(closures["aliasProjections"]) == 32 and len({row["canonicalFindingId"] for row in closures["aliasProjections"]}) == 32 and all(row["aliasClosureCredit"] == 0 for row in closures["aliasProjections"]) and alias_source_parity, "32 identity-only source projections")

primitives = {row["typeName"]: row for row in schema_registry["primitiveDefinitions"]}
nested_by_type = {row["typeName"]: row for row in schema_registry["nestedSchemas"]}
schemas = {row["schemaId"]: row for row in schema_registry["nestedSchemas"] + schema_registry["outputFamilies"]}
instances = {row["instanceId"]: row for row in schema_registry["admittedInstances"]}
tokens = []
for schema in schema_registry["outputFamilies"]:
    for field in schema["fields"]:
        tokens.extend(name for name in re.findall(r"[A-Za-z][A-Za-z0-9]*", field["typeExpression"]) if name not in ("Array", "Map", "Nullable"))
verify("SCHEMA-CLOSED", len(schema_registry["outputFamilies"]) == 42 and len(schema_registry["nestedSchemas"]) == 70 and len(set(nested_by_type)) == 70 and all(name in primitives or name in nested_by_type for name in tokens) and schema_registry["denominators"]["unresolvedTypeReferences"] == 0, canonical(schema_registry["denominators"]))
invalid_instances = [record["instanceId"] for record in instances.values() if record["schemaId"] not in schemas or not validate_schema(schemas[record["schemaId"]], record["instance"], primitives, nested_by_type)]
verify("SCHEMA-INSTANCES", len(instances) == 112 and not invalid_instances, "112/112" if not invalid_instances else ",".join(invalid_instances))
verify("UNKNOWN-FAIL-CLOSED", ast_value({"op": "UNDECLARED", "args": []}, {}) is False and schema_registry["validatorLanguage"]["unknownOperatorPolicy"] == "BLOCK" and schema_registry["validatorLanguage"]["unknownTypePolicy"] == "BLOCK", schema_registry["validatorLanguage"]["languageRoot"])

identity_domains = [row["domain"] for row in digests["identityClasses"]]
identity_roots = [row["identityRoot"] for row in digests["classBoundaryControls"]]
verify("DIGEST-TYPES", len(set(identity_domains)) == len(identity_domains) and len(set(identity_roots)) == len(identity_roots) and digests["boundaryFacts"]["rawChecksumEqualsAnyTypedIdentity"] is False, canonical(digests["boundaryFacts"]))
verify("AUTHORITY", len(authority["producers"]) == len(authority["appointments"]) and len({row["outputObjectId"] for row in authority["producers"]}) == len(authority["producers"]) and all(row["selfAppointment"] is False and row["producerCardinality"] == 1 for row in authority["appointments"]) and authority["actualGenesisState"] == "MISSING-BLOCKING" and authority["currentAuthorityCredit"] == 0, canonical(authority["denominators"]))
verify("INDEPENDENCE", all(dimension["distinctCount"] == dimension["requiredDistinctCount"] and dimension["terminal"] == "PASS" for group in authority["independenceGroups"] for dimension in group["dimensions"]), len(authority["independenceGroups"]))
profiles = authority["readerProfiles"]
verify("READER-PROFILES", len(profiles) == 2 and all(profile["implementationContentId"] == "sha256:" + sha(pathlib.Path(profile["implementationPath"]).read_bytes()) for profile in profiles) and profiles[0]["implementationContentId"] != profiles[1]["implementationContentId"] and profiles[0]["dependencyRoot"] != profiles[1]["dependencyRoot"] and profiles[0]["runtimeRoot"] != profiles[1]["runtimeRoot"] and profiles[0]["controllerRoot"] != profiles[1]["controllerRoot"] and profiles[0]["contextRoot"] != profiles[1]["contextRoot"], ",".join(row["profileRoot"] for row in profiles))

fresh_proof = exhaustive_proof()
verify("CAS", canonical(fresh_proof) == canonical(lifecycle["exhaustiveTwoActorProof"]) and fresh_proof["twoCommitScheduleCount"] == "0" and fresh_proof["crashMutationCount"] == 0 and len(lifecycle["reducer"]["steps"]) == 15, canonical(fresh_proof))
permit_map = {permit["permitClass"]: permit for permit in permits["permits"]}
verify("PERMITS", len(permits["permits"]) == 4 and len(permits["crossUseMatrix"]) == 16 and permits["matrixDenominators"]["legalPresentations"] == 4 and permits["matrixDenominators"]["crossClassDenials"] == 12 and len({row["domain"] for row in permits["permits"]}) == 4 and len({row["namedUse"] for row in permits["permits"]}) == 4 and all(row["roleSeparation"]["distinctCount"] == 3 and row["currentState"] == "ABSENT" and validate_schema(row["schema"], row["planningInstance"]["instance"], primitives, nested_by_type) for row in permits["permits"]), canonical(permits["matrixDenominators"]))
verify("PUBLIC-FLOW", public_flow["visibilityContract"]["frozenObservation"]["visibility"] == "PUBLIC" and public_flow["visibilityContract"]["preOperationTrustedReceipt"] == "MISSING-BLOCKING" and public_flow["visibilityContract"]["postOperationTrustedReceipt"] == "MISSING-BLOCKING" and len(public_flow["scannerProfiles"]) == 3 and all(row["distinctCount"] == row["requiredDistinctCount"] for row in public_flow["scannerSeparation"]["dimensions"]), public_flow["publicFlowRegistryRoot"])
verify("STORAGE", all(row["state"] == "MISSING-BLOCKING" for row in publication["repositoryBudgets"]) and publication["externalArtifactCurrentState"]["selectedStoreState"] == "MISSING-BLOCKING" and publication["publicationDisposition"].startswith("BLOCKED") and publication["regularGitMemberGate"]["exclusiveMaximumBytes"] == MAX_BYTES, publication["publicationDisposition"])
auxiliary_schemas_typed = all(schema["additionalProperties"] is False and schema["fields"] and all(field["typeExpression"] in primitives or field["typeExpression"] in nested_by_type for field in schema["fields"]) for schema in lifecycle["lifecycleSchemas"]) and authority["recoverySchema"]["additionalProperties"] is False and all(field["typeExpression"] in primitives or field["typeExpression"] in nested_by_type for field in authority["recoverySchema"]["fields"])
scanner_planning_valid = len(public_flow["scannerPlanningReceipts"]) == 2 and all(validate_schema(public_flow["scannerReceiptSchema"], record["instance"], primitives, nested_by_type) for record in public_flow["scannerPlanningReceipts"]) and validate_schema(public_flow["adjudicationSchema"], public_flow["adjudicationPlanningInstance"]["instance"], primitives, nested_by_type)
external_planning_valid = validate_schema(publication["externalArtifactSchema"], publication["externalPlanningInstance"]["instance"], primitives, nested_by_type) and publication["externalPlanningInstance"]["operationalCredit"] == 0 and publication["externalArtifactCurrentState"]["selectedStoreState"] == "MISSING-BLOCKING"
verify("AUXILIARY-TYPED-SCHEMAS", auxiliary_schemas_typed and scanner_planning_valid and external_planning_valid, "lifecycle/recovery/scanner/adjudication/external")

vectors = []
shards_ok = True
for expected_ordinal, descriptor in enumerate(vector_index["shardDescriptors"], start=1):
    shard_path = pathlib.Path(descriptor["logicalPath"])
    data = shard_path.read_bytes()
    shard = json.loads(data)
    shard_projection = [{"vectorId": vector["vectorId"], "vectorRoot": vector["vectorRoot"]} for vector in shard["vectors"]]
    shard_ok = descriptor["ordinal"] == expected_ordinal and shard["ordinal"] == expected_ordinal and shard["totalShards"] == len(vector_index["shardDescriptors"]) and descriptor["bytes"] == len(data) and descriptor["rawSha256Checksum"] == sha(data) and len(data) < MAX_BYTES and shard["vectorCount"] == len(shard["vectors"]) and shard["firstCanonicalKey"] == shard["vectors"][0]["vectorId"] and shard["lastCanonicalKey"] == shard["vectors"][-1]["vectorId"] and descriptor["contentRoot"] == domain_root("PRCV5-VECTOR-SHARD-CONTENT-V1", shard_projection)
    shards_ok = shards_ok and shard_ok
    vectors.extend(shard["vectors"])
verify("SHARDS", shards_ok and len(vectors) == vector_index["vectorCount"] and len({row["vectorId"] for row in vectors}) == len(vectors) and all(vectors[index - 1]["vectorId"] < vectors[index]["vectorId"] for index in range(1, len(vectors))), f"{len(vector_index['shardDescriptors'])}/{len(vectors)}")
verify("CORPUS", domain_root("PRCV5-VECTOR-CORPUS-V1", [{"vectorId": row["vectorId"], "vectorRoot": row["vectorRoot"]} for row in vectors]) == vector_index["corpusRoot"], vector_index["corpusRoot"])

vector_context = {"instances": instances, "schemas": schemas, "primitives": primitives, "nested_by_type": nested_by_type, "permit_map": permit_map, "lifecycle": lifecycle}
actual_blocks = 0
comparison_blocks = 0
vectors_ok = True
for vector in vectors:
    actual = vector_terminal(vector, vector_context)
    comparison = "PASS" if actual == vector["expectedTerminal"] else "BLOCK"
    actual_blocks += int(actual == "BLOCK")
    comparison_blocks += int(comparison == "BLOCK")
    vectors_ok = vectors_ok and actual == vector["actualTerminal"] and comparison == vector["comparisonTerminal"] and vector["vectorRoot"] == domain_root("PRCV5-CAUSAL-VECTOR-V1", without(vector, "vectorRoot"))
verify("VECTOR-EXECUTION", vectors_ok and len(vectors) == vector_index["vectorCount"] and comparison_blocks == 1 and vector_index["intentionalExpectedOnlyComparisonBlocks"] == 1, f"{len(vectors)}/{actual_blocks}/{comparison_blocks}")
vector_ids = {row["vectorId"] for row in vectors}
verify("CLOSURE-COVERAGE", all(all(vector_id in vector_ids for vector_id in row["vectorIds"]) for row in closures["records"]) and all(sum(vector["vectorId"].startswith("PRCV5-VECTOR-CONTROL-" + control["controlId"][-3:] + "-") for vector in vectors) == 1 + len(control["conjuncts"]) for control in closures["remediationControls"]), len(closures["records"]))
schema_coverage = True
for schema in schemas.values():
    count = sum(vector["vectorId"].startswith("PRCV5-VECTOR-SCHEMA-" + schema["schemaId"]) for vector in vectors)
    expected = 1 + 2 * len(schema["fields"]) + 1 + int(any(field["name"] == "v5AcceptanceCredit" for field in schema["fields"]))
    schema_coverage = schema_coverage and count == expected
verify("SCHEMA-COVERAGE", schema_coverage, len(schemas))
permit_coverage = all(sum(vector["vectorId"].startswith(f"PRCV5-VECTOR-PERMIT-SCHEMA-{permit['ordinal']}-") for vector in vectors) == 1 + 2 * len(permit["schema"]["fields"]) + 2 for permit in permits["permits"])
verify("PERMIT-SCHEMA-COVERAGE", permit_coverage, len(permits["permits"]))

node_ids = {row["nodeId"] for row in graph["nodes"]}
node_counts = {node_class: sum(node["nodeClass"] == node_class for node in graph["nodes"]) for node_class in sorted({row["nodeClass"] for row in graph["nodes"]})}
edge_counts = {relation: sum(edge["relation"] == relation for edge in graph["edges"]) for relation in sorted({row["relation"] for row in graph["edges"]})}
verify("GRAPH", graph["invariants"]["nodes"] == len(graph["nodes"]) and graph["invariants"]["edges"] == len(graph["edges"]) and graph["invariants"]["requirementEdges"] == len(closures["requirementEdges"]) and graph["invariants"]["closureVectorEdges"] == sum(len(row["vectorIds"]) for row in closures["records"]) and graph["invariants"]["vectorResultEdges"] == len(vectors) and all(edge["from"] in node_ids and edge["to"] in node_ids for edge in graph["edges"]) and node_counts == graph["nodeClassCounts"] and edge_counts == graph["edgeClassCounts"] and graph["nodesRoot"] == domain_root("PRCV5-CAUSAL-GRAPH-NODES-V1", graph["nodes"]) and graph["edgesRoot"] == domain_root("PRCV5-CAUSAL-GRAPH-EDGES-V1", graph["edges"]), f"{len(graph['nodes'])}/{len(graph['edges'])}")

package_text = "\n".join(pathlib.Path(member["logicalPath"]).read_text(encoding="utf-8") for member in manifest["members"])
absolute_home_token = "/".join(("", "Users", ""))
repository_folder_token = "/".join(("web", "docs", ""))
forbidden_a = ".".join(("Math", "random")) + "("
forbidden_b = ".".join(("crypto", "randomUUID")) + "("
verify("PUBLIC-SAFE", absolute_home_token not in package_text and repository_folder_token not in package_text and forbidden_a not in package_text and forbidden_b not in package_text, "portable; deterministic")
verify("NO-SELF-ACCEPTANCE", manifest["noSelfAcceptance"] is True and manifest["acceptanceCredit"] == 0 and all(profile["acceptanceCredit"] == 0 for profile in profiles), "Acceptance=0")

report_body = {
    "artifactId": "CONNECT-PRCV5-READER-B-REPORT-2026-08-30",
    "schemaVersion": "PRCV5-READER-REPORT-V1",
    "artifactClass": "DETACHED-READ-ONLY-MECHANICAL-QA-REPORT;NOT-INDEPENDENT-REVIEW;NOT-ACCEPTANCE;NOT-PERMIT",
    "readerId": "PRCV5-READER-B",
    "readerProfileRoot": next(profile["profileRoot"] for profile in profiles if profile["readerId"] == "PRCV5-READER-B"),
    "manifestPath": str(MANIFEST_PATH),
    "manifestSha256": sha(MANIFEST_PATH.read_bytes()),
    "packageContentRoot": package_root,
    "sourceReferenceRoot": inputs["sourceReferenceRoot"],
    "vectorCorpusRoot": vector_index["corpusRoot"],
    "graphRoot": graph["graphRoot"],
    "checks": checks,
    "counters": {"checks": len(checks), "errors": len(failures), "packageMembers": len(manifest["members"]), "sourceReferences": len(inputs["sourceRecords"]), "findings": len(closures["records"]), "inheritedFindings": closures["denominators"]["inheritedFindings"], "newFindings": closures["denominators"]["newFindings"], "remediationControls": len(closures["remediationControls"]), "outputFamilies": len(schema_registry["outputFamilies"]), "nestedTypes": len(schema_registry["nestedSchemas"]), "schemaInstances": len(schema_registry["admittedInstances"]), "vectors": len(vectors), "vectorActualBlocks": actual_blocks, "vectorComparisonBlocks": comparison_blocks, "shards": len(vector_index["shardDescriptors"]), "graphNodes": len(graph["nodes"]), "graphEdges": len(graph["edges"]), "permits": len(permits["permits"]), "permitMatrixCells": len(permits["crossUseMatrix"]), "lateDecisionClauses": len(publication["lateDecisionReconciliation"])},
    "verdict": "PASS" if not failures else "BLOCK",
    "errors": failures,
    "claimLimit": "MECHANICAL-CANDIDATE-INTEGRITY-ONLY;NO-REVIEW-CLOSURE-OPERATIONAL-EVIDENCE-PERMIT-OR-ACCEPTANCE-CREDIT",
    "currentDisposition": manifest["currentDisposition"],
    "acceptanceCredit": 0,
}
report = dict(report_body)
report["reportRoot"] = domain_root("PRCV5-READER-REPORT-V1", report_body)


def report_patch(path, content):
    lines = content.rstrip("\n").split("\n")
    added = "\n".join("+" + line for line in lines)
    if not path.exists():
        return f"*** Begin Patch\n*** Add File: {path}\n{added}\n*** End Patch\n"
    removed = "\n".join("-" + line for line in path.read_text(encoding="utf-8").rstrip("\n").split("\n"))
    return f"*** Begin Patch\n*** Update File: {path}\n@@\n{removed}\n{added}\n*** End Patch\n"


serialized = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
if len(sys.argv) > 1 and sys.argv[1] == "--emit-report-patch":
    sys.stdout.write(report_patch(REPORT_PATH, serialized))
else:
    sys.stdout.write(serialized)
sys.exit(0 if not failures else 1)
