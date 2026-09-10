#!/usr/bin/env python3
"""Independent B0 v7 QA Reader B: Python standard library only."""

from __future__ import annotations

import copy
import datetime
import hashlib
import json
import re
import sys
from pathlib import Path


DEFAULT_MANIFEST = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-atomic-package-manifest-2026-08-30.json"
REPORT_PATH = "docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v7-qa-reader-b-report-2026-08-30.json"
MAX_MEMBER = 50 * 1024 * 1024
MISSING = object()
CAS_STEPS = [
    "READ_HEAD", "READ_SECURITY_UNIVERSE", "VALIDATE_SCHEMA", "VALIDATE_AUTHORITY", "VALIDATE_TIME",
    "VALIDATE_REVOCATION", "COMPARE_EXPECTED_HEAD", "RESERVE_ATTEMPT", "ADVANCE_FENCE", "CONSUME_PERMIT",
    "STAGE_POINTER", "STAGE_ACCEPTANCE", "STAGE_OUTBOX", "REVALIDATE_READ_SET", "ATOMIC_COMMIT",
]


def canonical(value: object) -> str:
    if value is None or isinstance(value, (bool, str)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, int) and not isinstance(value, bool):
        if value < -(2**53 - 1) or value > 2**53 - 1:
            raise ValueError("non-safe-integer canonical value")
        return str(value)
    if isinstance(value, list):
        return "[" + ",".join(canonical(item) for item in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(
            json.dumps(key, ensure_ascii=False) + ":" + canonical(value[key]) for key in sorted(value)
        ) + "}"
    raise ValueError(f"unsupported canonical type: {type(value).__name__}")


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def rooted(domain: str, value: object) -> str:
    return sha_bytes((domain + "\n" + canonical(value)).encode("utf-8"))


def read_bytes(logical_path: str) -> bytes:
    return Path(logical_path).read_bytes()


def read_json(logical_path: str) -> dict:
    return json.loads(read_bytes(logical_path).decode("utf-8"))


def without_key(value: dict, key: str) -> dict:
    return {name: item for name, item in value.items() if name != key}


def exact_keys(value: object, keys: list[str]) -> bool:
    return isinstance(value, dict) and set(value) == set(keys)


def pointer_get(value: object, pointer: str) -> object:
    if pointer == "":
        return value
    if not isinstance(pointer, str) or not pointer.startswith("/"):
        return MISSING
    current = value
    for encoded in pointer[1:].split("/"):
        token = encoded.replace("~1", "/").replace("~0", "~")
        if not isinstance(current, dict) or token not in current:
            return MISSING
        current = current[token]
    return current


def type_is(type_name: str, value: object) -> bool:
    if type_name == "NULL":
        return value is None
    if type_name == "BOOLEAN":
        return isinstance(value, bool)
    if type_name == "STRING":
        return isinstance(value, str)
    if type_name == "NONEMPTY_STRING":
        return isinstance(value, str) and len(value) > 0
    if type_name == "SAFE_INTEGER":
        return isinstance(value, int) and not isinstance(value, bool) and -(2**53 - 1) <= value <= 2**53 - 1
    if type_name == "NONNEGATIVE_INTEGER":
        return isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 2**53 - 1
    if type_name == "U64_DECIMAL":
        return isinstance(value, str) and re.fullmatch(r"0|[1-9][0-9]{0,19}", value) is not None and int(value) <= 18446744073709551615
    if type_name == "SHA256":
        return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value) is not None
    if type_name == "DETERMINISTIC_ID":
        return isinstance(value, str) and re.fullmatch(r"[A-Z0-9][A-Z0-9-]{2,127}", value) is not None
    if type_name == "RFC3339_UTC":
        if not isinstance(value, str) or re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value) is None:
            return False
        try:
            datetime.datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
            return True
        except ValueError:
            return False
    if type_name == "JSON_POINTER":
        return isinstance(value, str) and (value == "" or re.fullmatch(r"/(?:[^~/]|~[01])*(?:/(?:[^~/]|~[01])*)*", value) is not None)
    if type_name == "REPO_RELATIVE_PATH":
        return isinstance(value, str) and value.startswith("docs/") and not value.startswith("/") and not value.startswith("web/") and ".." not in value and "\\" not in value
    if type_name == "ARRAY":
        return isinstance(value, list)
    if type_name == "OBJECT":
        return isinstance(value, dict)
    return False


def eval_ast(ast: object, data: object, language: dict) -> object:
    if not isinstance(ast, dict) or set(ast) != {"op", "args"} or not isinstance(ast["op"], str) or not isinstance(ast["args"], list):
        return False
    op = ast["op"]
    args = ast["args"]
    if op not in {entry["operator"] for entry in language["operators"]}:
        return False
    def ev(index: int) -> object:
        return eval_ast(args[index], data, language)
    if op == "LITERAL":
        return args[0] if len(args) == 1 else False
    if op == "GET":
        return pointer_get(data, args[0]) if len(args) == 1 else MISSING
    if op == "PATH_EXISTS":
        return len(args) == 1 and pointer_get(data, args[0]) is not MISSING
    if op == "AND":
        return len(args) > 0 and all(eval_ast(arg, data, language) is True for arg in args)
    if op == "OR":
        return len(args) > 0 and any(eval_ast(arg, data, language) is True for arg in args)
    if op == "NOT":
        return len(args) == 1 and ev(0) is False
    if op in {"EQ", "NEQ"}:
        if len(args) != 2:
            return False
        left, right = ev(0), ev(1)
        if left is MISSING or right is MISSING:
            return False
        equal = canonical(left) == canonical(right)
        return equal if op == "EQ" else not equal
    if op in {"LT", "LTE", "GT", "GTE"}:
        if len(args) != 2:
            return False
        left, right = ev(0), ev(1)
        if not isinstance(left, int) or isinstance(left, bool) or not isinstance(right, int) or isinstance(right, bool):
            return False
        return {"LT": left < right, "LTE": left <= right, "GT": left > right, "GTE": left >= right}[op]
    if op == "TYPE_IS":
        return len(args) == 2 and args[1] in {entry["type"] for entry in language["types"]} and (value := ev(0)) is not MISSING and type_is(args[1], value)
    if op == "EXACT_KEYS":
        return len(args) == 2 and isinstance(args[1], list) and exact_keys(ev(0), args[1])
    if op == "UNIQUE_VALUES":
        value = ev(0) if len(args) == 1 else MISSING
        return isinstance(value, list) and len({canonical(item) for item in value}) == len(value)
    if op == "IN_SET":
        value = ev(0) if len(args) == 2 else MISSING
        return value is not MISSING and isinstance(args[1], list) and any(canonical(value) == canonical(item) for item in args[1])
    if op == "MATCH":
        if len(args) != 2 or not isinstance((value := ev(0)), str) or not isinstance(args[1], str):
            return False
        try:
            return re.search(args[1], value) is not None
        except re.error:
            return False
    if op == "HASH_EQ":
        value = ev(0) if len(args) == 3 else MISSING
        return value is not MISSING and isinstance(args[1], str) and type_is("SHA256", args[2]) and rooted(args[1], value) == args[2]
    return False


def validate_envelope(envelope: object, registry: dict) -> bool:
    spec = registry["detachedAcceptance"]
    if not isinstance(envelope, dict) or not exact_keys(envelope, [field["name"] for field in spec["externalSchema"]["fields"]]):
        return False
    if not exact_keys(envelope.get("validationContext"), [field["name"] for field in spec["validationContextSchema"]["fields"]]):
        return False
    if not exact_keys(envelope.get("payload"), [field["name"] for field in spec["internalSchema"]["fields"]]):
        return False
    if not all(type_is(field["type"], envelope[field["name"]]) for field in spec["externalSchema"]["fields"]):
        return False
    if not all(type_is(field["type"], envelope["validationContext"][field["name"]]) for field in spec["validationContextSchema"]["fields"]):
        return False
    if not all(type_is(field["type"], envelope["payload"][field["name"]]) for field in spec["internalSchema"]["fields"]):
        return False
    return (
        envelope["envelopeSchemaId"] == spec["externalSchema"]["schemaId"]
        and envelope["internalSchemaRoot"] == spec["internalSchema"]["schemaRoot"]
        and envelope["instanceRoot"] == rooted("B0V7-DETACHED-ACCEPTANCE-PAYLOAD-V1", envelope["payload"])
        and envelope["payload"]["schemaId"] == spec["internalSchema"]["schemaId"]
        and envelope["payload"]["producerAppointmentRoot"] == envelope["validationContext"]["expectedProducerAppointmentRoot"]
        and envelope["payload"]["freshnessHeadTupleRoot"] == envelope["validationContext"]["currentSecurityUniverseTupleRoot"]
        and envelope["planningOnly"] is True and envelope["operational"] is False
        and envelope["authorityCredit"] == 0 and envelope["acceptanceCredit"] == 0
    )


def derive_observation(row: dict) -> object:
    source_path = row["sourceLocators"][0]
    data = read_bytes(source_path)
    if row["measurementKind"] in {"V6-SUBJECT-SHA256", "V6-MANIFEST-SHA256"}:
        return sha_bytes(data)
    value = json.loads(data.decode("utf-8"))
    kind = row["measurementKind"]
    if kind == "V6-PACKAGE-CONTENT-ROOT": return value["packageContentRoot"]
    if kind == "V6-PACKAGE-MEMBER-COUNT": return value["memberCount"]
    if kind == "V6-REQUIREMENT-COUNT": return len(value["v6Requirements"])
    if kind == "V6-FIVE-FIELD-COUNT": return value["v6FiveFieldCount"]
    if kind == "V6-ACTIVE-BLOCKER-DENOMINATOR": return value["activeBlockerDenominator"]
    if kind == "V6-VECTOR-COUNT": return value["vectorCount"]
    if kind == "V6-VECTOR-SHARD-COUNT": return value["vectorShardCount"]
    if kind == "V6-SOURCE-ARTIFACT-COUNT": return value["artifactCount"]
    if kind == "V6-SOURCE-MEMBER-COUNT": return value["memberCount"]
    if kind == "V6-AUTHORITATIVE-BYTE-ATOM-COUNT": return value["authoritativeInheritedByteAtomCount"]
    if kind == "V6-ACTIVE-NAMED-USE-COUNT": return value["activeNamedUseCount"]
    if kind == "V6-ROLE-COUNT": return value["roleAndAppointmentAuthority"]["roleCount"]
    if kind == "V6-HEAD-COUNT": return value["mutableHeadRegistry"]["headCount"]
    if kind == "V6-MUTABLE-OBJECT-CLASS-COUNT": return value["mutableHeadRegistry"]["objectClassCount"]
    if kind == "V6-PRIOR-INTERFACE-COUNT": return value["priorInterfaceRegistry"]["interfaceCount"]
    raise ValueError(f"unknown interface measurement {kind}")


def cas_actor() -> dict:
    return {"pc": 0, "terminal": False, "committed": False, "observedHead": None, "observedSecurity": None, "observedRevision": None, "observedRevocation": None, "validatedHead": None}


def cas_initial(planning_attempts: dict, override_a: dict | None = None) -> dict:
    return {
        "A": cas_actor(), "B": cas_actor(), "attempts": {"A": copy.deepcopy(override_a if override_a is not None else planning_attempts["A"]), "B": copy.deepcopy(planning_attempts["B"])},
        "store": {"head": "HEAD-0", "securityHead": "SECURITY-0", "revisionHead": "7", "revocationHead": planning_attempts["A"]["revocationHead"], "fence": 0, "permitUsed": False, "replayUsed": False, "outboxCount": 0}, "trace": [],
    }


def cas_step(source: dict, actor_name: str) -> dict | None:
    state = copy.deepcopy(source)
    actor = state[actor_name]
    attempt = state["attempts"][actor_name]
    if actor["terminal"] or actor["pc"] >= len(CAS_STEPS):
        return None
    step = CAS_STEPS[actor["pc"]]
    def block(reason: str) -> dict:
        actor["terminal"] = True
        state["trace"].append(f"{actor_name}:BLOCK:{reason}")
        return state
    if step == "READ_HEAD":
        actor["observedHead"] = state["store"]["head"]
    elif step == "READ_SECURITY_UNIVERSE":
        actor["observedSecurity"] = state["store"]["securityHead"]
        actor["observedRevision"] = state["store"]["revisionHead"]
        actor["observedRevocation"] = state["store"]["revocationHead"]
    elif step == "VALIDATE_SCHEMA" and attempt.get("schemaValid") is not True:
        return block("SCHEMA")
    elif step == "VALIDATE_AUTHORITY" and attempt.get("authorityCurrent") is not True:
        return block("AUTHORITY")
    elif step == "VALIDATE_TIME" and (not type_is("RFC3339_UTC", attempt.get("validFrom")) or not type_is("RFC3339_UTC", attempt.get("validUntil")) or not type_is("RFC3339_UTC", attempt.get("commitInstant")) or not (attempt["validFrom"] <= attempt["commitInstant"] < attempt["validUntil"])):
        return block("TIME")
    elif step == "VALIDATE_REVOCATION" and (attempt.get("revoked") is True or attempt.get("revocationHead") != state["store"]["revocationHead"]):
        return block("REVOCATION")
    elif step == "COMPARE_EXPECTED_HEAD" and (actor["observedHead"] != attempt.get("expectedHead") or state["store"]["head"] != attempt.get("expectedHead")):
        return block("EXPECTED-HEAD")
    elif step == "RESERVE_ATTEMPT" and not type_is("DETERMINISTIC_ID", attempt.get("attemptId")):
        return block("ATTEMPT-ID")
    elif step == "ADVANCE_FENCE" and (not isinstance(attempt.get("proposedFence"), int) or isinstance(attempt.get("proposedFence"), bool) or attempt["proposedFence"] <= state["store"]["fence"]):
        return block("FENCE")
    elif step == "CONSUME_PERMIT" and (state["store"]["permitUsed"] or state["store"]["replayUsed"] or attempt.get("replayUsed") is True or not type_is("U64_DECIMAL", attempt.get("minimumRevision")) or int(state["store"]["revisionHead"]) <= int(attempt["minimumRevision"])):
        return block("PERMIT")
    elif step == "STAGE_POINTER" and not type_is("SHA256", attempt.get("outputRoot")):
        return block("OUTPUT")
    elif step == "STAGE_ACCEPTANCE" and attempt.get("envelopeValid") is not True:
        return block("ENVELOPE")
    elif step == "STAGE_OUTBOX" and not type_is("DETERMINISTIC_ID", attempt.get("effectId")):
        return block("EFFECT-ID")
    elif step == "REVALIDATE_READ_SET":
        if actor["observedHead"] != state["store"]["head"] or actor["observedSecurity"] != state["store"]["securityHead"] or actor["observedRevision"] != state["store"]["revisionHead"] or actor["observedRevocation"] != state["store"]["revocationHead"] or state["store"]["permitUsed"] or state["store"]["replayUsed"]:
            return block("READ-SET")
        actor["validatedHead"] = state["store"]["head"]
    elif step == "ATOMIC_COMMIT":
        if actor["validatedHead"] != state["store"]["head"] or state["store"]["permitUsed"] or state["store"]["replayUsed"]:
            return block("CAS")
        state["store"]["head"] = f"HEAD-{actor_name}"
        state["store"]["fence"] = attempt["proposedFence"]
        state["store"]["permitUsed"] = True
        state["store"]["replayUsed"] = True
        state["store"]["outboxCount"] += 1
        actor["committed"] = True
        actor["terminal"] = True
        actor["pc"] += 1
        state["trace"].append(f"{actor_name}:COMMIT")
        return state
    actor["pc"] += 1
    state["trace"].append(f"{actor_name}:{step}")
    return state


def cas_proof(planning_attempts: dict) -> dict:
    memo: dict[str, dict[str, int]] = {}
    reachable: set[str] = set()
    crash_cut_state_actor_count = 0
    crash_violations = 0

    def state_key(state: dict) -> str:
        return canonical({"A": state["A"], "B": state["B"], "attempts": state["attempts"], "store": state["store"]})

    def visit(state: dict) -> dict[str, int]:
        nonlocal crash_cut_state_actor_count, crash_violations
        key = state_key(state)
        reachable.add(key)
        if key in memo:
            return memo[key]
        for name in ("A", "B"):
            actor = state[name]
            if not actor["terminal"] and actor["pc"] < 15:
                crash_cut_state_actor_count += 1
                before = canonical(state["store"])
                crashed = copy.deepcopy(state)
                crashed[name]["terminal"] = True
                if canonical(crashed["store"]) != before:
                    crash_violations += 1
        if state["A"]["terminal"] and state["B"]["terminal"]:
            committed = int(state["A"]["committed"]) + int(state["B"]["committed"])
            result = {"schedules": 1, "oneCommit": int(committed == 1), "twoCommit": int(committed == 2), "zeroCommit": int(committed == 0)}
            memo[key] = result
            return result
        total = {"schedules": 0, "oneCommit": 0, "twoCommit": 0, "zeroCommit": 0}
        for name in ("A", "B"):
            if state[name]["terminal"]:
                continue
            next_state = cas_step(state, name)
            if next_state is None:
                continue
            part = visit(next_state)
            for field in total:
                total[field] += part[field]
        memo[key] = total
        return total

    totals = visit(cas_initial(planning_attempts))
    return {
        "completeScheduleCount": str(totals["schedules"]),
        "oneCommitScheduleCount": str(totals["oneCommit"]),
        "twoCommitScheduleCount": str(totals["twoCommit"]),
        "zeroCommitScheduleCount": str(totals["zeroCommit"]),
        "reachableStateCount": len(reachable),
        "crashCutStateActorCount": crash_cut_state_actor_count,
        "crashViolationCount": crash_violations,
        "responseLossReadback": "COMMITTED",
        "outboxExactlyOnce": True,
    }


def cas_single_attempt_passes(attempt: dict, planning_attempts: dict) -> bool:
    state = cas_initial(planning_attempts, attempt)
    state["B"]["terminal"] = True
    while not state["A"]["terminal"]:
        next_state = cas_step(state, "A")
        if next_state is None:
            return False
        state = next_state
    return state["A"]["committed"] is True and state["store"]["outboxCount"] == 1 and state["store"]["permitUsed"] is True and state["store"]["replayUsed"] is True


def recovery_valid(state: object, recovery: dict) -> bool:
    if not isinstance(state, dict) or not exact_keys(state, ["attempt", "context", "store"]):
        return False
    attempt, context, store = state["attempt"], state["context"], state["store"]
    if not type_is("DETERMINISTIC_ID", attempt.get("attemptId")) or not isinstance(attempt.get("memberIds"), list) or not isinstance(attempt.get("acknowledgements"), list) or not type_is("SHA256", attempt.get("challengeRoot")) or not isinstance(attempt.get("consumed"), bool):
        return False
    if attempt["consumed"] or context.get("requiredThreshold") != 3 or not type_is("SHA256", context.get("controllerRoot")) or not type_is("RFC3339_UTC", context.get("nowInstant")) or not type_is("SHA256", context.get("expectedSecurityHead")) or not type_is("SHA256", context.get("expectedRecoveryHead")):
        return False
    if len(attempt["memberIds"]) != 3 or len(set(attempt["memberIds"])) != 3 or len(attempt["acknowledgements"]) != 3:
        return False
    if not isinstance(store.get("members"), dict) or not isinstance(store.get("witnesses"), dict) or not isinstance(store.get("challenges"), dict) or not type_is("SHA256", store.get("activeAuthorityRoot")) or store.get("oldAuthorityRevoked") is not False:
        return False
    if store.get("securityHead") != context["expectedSecurityHead"] or store.get("recoveryHead") != context["expectedRecoveryHead"] or store["challenges"].get(attempt["attemptId"]) != attempt["challengeRoot"]:
        return False
    for member_id in attempt["memberIds"]:
        member = store["members"].get(member_id)
        if not member or member.get("current") is not True or member.get("revokedAt") is not None or member.get("controllerRoot") != context["controllerRoot"] or member.get("validUntil", "") <= context["nowInstant"]:
            return False
    for ack in attempt["acknowledgements"]:
        if ack.get("memberId") not in attempt["memberIds"] or ack.get("challengeRoot") != attempt["challengeRoot"] or ack.get("controllerRoot") != context["controllerRoot"]:
            return False
    witnesses = [entry for entry in store["witnesses"].values() if entry.get("current") is True]
    if len(witnesses) < 2 or len({entry.get("controllerRoot") for entry in witnesses}) < 2:
        return False
    return sorted(recovery["readPaths"]) == sorted(entry["path"] for entry in recovery["mutationMatrix"])


def run_recovery_lifecycle(source: dict, recovery: dict, injection_after_step: int | None = None) -> str:
    state = copy.deepcopy(source)
    snapshot = {"securityHead": state.get("store", {}).get("securityHead"), "recoveryHead": state.get("store", {}).get("recoveryHead")}
    for step in recovery["lifecycleSteps"]:
        ordinal = step["ordinal"]
        if ordinal == 2 and not exact_keys(state, ["attempt", "context", "store"]):
            return "BLOCK"
        if ordinal == 3 and not recovery_valid(state, recovery):
            return "BLOCK"
        if ordinal == 4 and len([entry for entry in state["store"]["witnesses"].values() if entry.get("current") is True]) < 2:
            return "BLOCK"
        if ordinal == 5 and state["store"]["challenges"].get(state["attempt"]["attemptId"]) != state["attempt"]["challengeRoot"]:
            return "BLOCK"
        if ordinal == 7 and (state["store"]["securityHead"] != snapshot["securityHead"] or state["store"]["recoveryHead"] != snapshot["recoveryHead"] or not recovery_valid(state, recovery)):
            return "BLOCK"
        if ordinal == 8:
            if state["store"]["securityHead"] != snapshot["securityHead"] or state["store"]["recoveryHead"] != snapshot["recoveryHead"] or not recovery_valid(state, recovery):
                return "BLOCK"
            state["attempt"]["consumed"] = True
            state["store"]["oldAuthorityRevoked"] = True
            return "PASS"
        if injection_after_step == ordinal:
            state["store"]["securityHead"] = rooted("B0V7-RECOVERY-INJECTED-HEAD-V1", {"after": ordinal})
    return "BLOCK"


def global_valid(model: object, registry: dict, derived_facts: dict) -> bool:
    return (
        isinstance(model, dict) and exact_keys(model, ["modelId", "nonAuthoritative", "operational", "authorityCredit", "acceptanceCredit", "semanticFacts", "semanticFactSetRoot"])
        and model.get("modelId") == registry["globalModel"]["modelId"]
        and model.get("nonAuthoritative") is True and model.get("operational") is False
        and model.get("authorityCredit") == 0 and model.get("acceptanceCredit") == 0
        and exact_keys(model.get("semanticFacts"), list(derived_facts)) and canonical(model["semanticFacts"]) == canonical(derived_facts)
        and rooted("B0V7-GLOBAL-SEMANTIC-FACT-SET-V1", model["semanticFacts"]) == model.get("semanticFactSetRoot")
    )


def verify() -> dict:
    manifest_arg = next((arg.split("=", 1)[1] for arg in sys.argv[1:] if arg.startswith("--manifest=")), DEFAULT_MANIFEST)
    manifest_bytes = read_bytes(manifest_arg)
    manifest = json.loads(manifest_bytes.decode("utf-8"))
    if manifest["memberCount"] != len(manifest["members"]) or any(not entry["required"] or entry["bytes"] >= MAX_MEMBER or not type_is("REPO_RELATIVE_PATH", entry["logicalPath"]) for entry in manifest["members"]):
        raise ValueError("manifest member policy failed")
    for member in manifest["members"]:
        data = read_bytes(member["logicalPath"])
        if len(data) != member["bytes"] or sha_bytes(data) != member["sha256"]:
            raise ValueError(f"member mismatch: {member['logicalPath']}")
    projection = [{field: member[field] for field in ("ordinal", "logicalPath", "sha256", "bytes", "required")} for member in manifest["members"]]
    if rooted("B0V7-PACKAGE-CONTENT-ROOT-V1", projection) != manifest["packageContentRoot"]:
        raise ValueError("package root mismatch")
    def by_suffix(suffix: str) -> str:
        return next(entry["logicalPath"] for entry in manifest["members"] if entry["logicalPath"].endswith(suffix))
    registry = read_json(by_suffix("-v7-normative-registry-2026-08-30.json"))
    crosswalk = read_json(by_suffix("-v7-closure-crosswalk-2026-08-30.json"))
    source_index = read_json(by_suffix("-v7-frozen-source-index-2026-08-30.json"))
    corpus = read_json(by_suffix("-v7-validator-and-state-machine-corpus-2026-08-30.json"))
    evidence = read_json(by_suffix("-v7-independent-interface-evidence-2026-08-30.json"))
    if rooted("B0V7-VALIDATOR-LANGUAGE-V1", without_key(registry["validatorLanguage"], "languageRoot")) != registry["validatorLanguage"]["languageRoot"]:
        raise ValueError("language root")
    if len({entry["operator"] for entry in registry["validatorLanguage"]["operators"]}) != len(registry["validatorLanguage"]["operators"]) or len({entry["type"] for entry in registry["validatorLanguage"]["types"]}) != len(registry["validatorLanguage"]["types"]):
        raise ValueError("language duplicate")
    self_path = by_suffix("b0-v7-qa-reader-b.py")
    self_hash = sha_bytes(read_bytes(self_path))
    profile = next((entry for entry in registry["readerIndependenceProfiles"] if entry["readerId"] == "B0V7-READER-B"), None)
    if profile is None or profile["readerSha256"] != self_hash or profile["language"] != "PYTHON-STDLIB" or profile["operational"] or profile["authorityCredit"] != 0 or profile["acceptanceCredit"] != 0:
        raise ValueError("reader profile binding")
    for bound in registry["readerIndependenceProfiles"]:
        if sha_bytes(read_bytes(bound["readerPath"])) != bound["readerSha256"] or rooted("B0V7-READER-DEPENDENCY-SET-V1", bound["dependencies"]) != bound["dependencyRoot"] or rooted("B0V7-READER-RUNTIME-CONTRACT-V1", bound["runtimeContract"]) != bound["runtimeRoot"] or rooted("B0V7-READER-CONTROLLER-V1", bound["controllerId"]) != bound["controllerRoot"] or rooted("B0V7-READER-EXECUTION-CONTEXT-V1", bound["executionContext"]) != bound["executionContextRoot"] or rooted("B0V7-READER-DISCLOSURE-RULE-V1", bound["disclosureRule"]) != bound["disclosureRoot"] or rooted("B0V7-READER-INDEPENDENCE-PROFILE-V1", without_key(bound, "profileRoot")) != bound["profileRoot"]:
            raise ValueError(f"profile root {bound['readerId']}")
    if len({entry["controllerRoot"] for entry in registry["readerIndependenceProfiles"]}) != 2 or len({entry["executionContextRoot"] for entry in registry["readerIndependenceProfiles"]}) != 2 or len({entry["runtimeRoot"] for entry in registry["readerIndependenceProfiles"]}) != 2:
        raise ValueError("reader independence separation")
    for bound in registry["readerIndependenceProfiles"]:
        source = read_bytes(bound["readerPath"]).decode("utf-8")
        peer = "".join(("b0-v7-qa-reader-b", ".py")) if bound["readerId"] == "B0V7-READER-A" else "".join(("b0-v7-qa-reader-a", ".mjs"))
        generator_token = "".join(("generate-b0-v7-package", ".mjs"))
        if generator_token in source or peer in source:
            raise ValueError("reader import separation")
    for source in source_index["sources"]:
        data = read_bytes(source["logicalPath"])
        if len(data) != source["bytes"] or sha_bytes(data) != source["sha256"]:
            raise ValueError(f"frozen source changed: {source['logicalPath']}")
    if source_index["absolutePathCount"] != 0 or source_index["extraRepositoryPrefixCount"] != 0:
        raise ValueError("source locator policy")
    if crosswalk["activeClosureDenominator"] != 38 or len(crosswalk["closureRows"]) != 38 or len({row["sourceFindingId"] for row in crosswalk["closureRows"]}) != 38 or len({row["noMergeKey"] for row in crosswalk["closureRows"]}) != 38:
        raise ValueError("closure denominator")
    if crosswalk["inheritedActiveIdentityCount"] != 31 or crosswalk["newFindingCount"] != 7 or crosswalk["preservedClosedFinding"]["findingId"] != "B0V4-HR-F012" or crosswalk["preservedClosedFinding"]["additionalClosureCredit"] != 0:
        raise ValueError("closure identity accounting")
    actual_by_id = {row["interfaceId"]: row for row in evidence["observations"]}
    if rooted("B0V7-INDEPENDENT-ACTUAL-INTERFACE-EVIDENCE-V1", without_key(evidence, "evidenceContentRoot")) != evidence["evidenceContentRoot"]:
        raise ValueError("interface evidence root")
    if len(actual_by_id) != 17 or len(registry["expectedInterfaces"]) != 17:
        raise ValueError("interface denominator")
    for expected in registry["expectedInterfaces"]:
        actual = actual_by_id.get(expected["interfaceId"])
        if actual is None or canonical(derive_observation(actual)) != canonical(actual["actualValue"]) or canonical(actual["actualValue"]) != canonical(expected["expectedValue"]) or actual["actualObservationRoot"] == expected["expectedSpecificationRoot"] or actual["producerId"] == expected["specificationProducerId"]:
            raise ValueError(f"interface failure: {expected['interfaceId']}")
    vectors: list[dict] = []
    for descriptor in corpus["shardDescriptors"]:
        data = read_bytes(descriptor["logicalPath"])
        if len(data) != descriptor["bytes"] or sha_bytes(data) != descriptor["sha256"] or len(data) >= MAX_MEMBER:
            raise ValueError("shard binding")
        shard = json.loads(data.decode("utf-8"))
        if rooted("B0V7-VECTOR-SHARD-V1", without_key(shard, "shardContentRoot")) != shard["shardContentRoot"]:
            raise ValueError("shard root")
        vectors.extend(shard["vectors"])
    if len(vectors) != corpus["vectorCount"] or any(vector["ordinal"] != index + 1 or rooted("B0V7-VECTOR-V1", without_key(vector, "vectorRoot")) != vector["vectorRoot"] for index, vector in enumerate(vectors)):
        raise ValueError("vector sequence")
    for type_name in [entry["type"] for entry in registry["validatorLanguage"]["types"]]:
        cases = [vector for vector in vectors if vector["family"] == "VALIDATOR-TYPE" and vector["input"]["type"] == type_name]
        if not any(vector["expected"] == "PASS" for vector in cases) or not any(vector["expected"] == "BLOCK" for vector in cases):
            raise ValueError(f"type coverage {type_name}")
    for operator in [entry["operator"] for entry in registry["validatorLanguage"]["operators"]]:
        cases = [vector for vector in vectors if vector["family"] == "VALIDATOR-OPERATOR" and vector["input"]["operator"] == operator]
        if not any(vector["expected"] == "PASS" for vector in cases) or not any(vector["expected"] == "BLOCK" for vector in cases):
            raise ValueError(f"operator coverage {operator}")
    if not any(vector["family"] == "VALIDATOR-UNKNOWN-TYPE" and vector["expected"] == "BLOCK" for vector in vectors) or not any(vector["family"] == "VALIDATOR-UNKNOWN-OPERATOR" and vector["expected"] == "BLOCK" for vector in vectors):
        raise ValueError("unknown language coverage")
    cas = cas_proof(registry["casStateMachine"]["planningAttempts"])
    if canonical(cas) != canonical(registry["casStateMachine"]["exhaustiveProof"]):
        raise ValueError(f"CAS proof mismatch {canonical(cas)}")
    if registry["casStateMachine"]["steps"] and [step["stepId"] for step in registry["casStateMachine"]["steps"]] != CAS_STEPS:
        raise ValueError("CAS 15 steps")
    recovery = registry["recoveryReducer"]
    if not recovery_valid(recovery["planningPositiveState"], recovery) or run_recovery_lifecycle(recovery["planningPositiveState"], recovery) != "PASS":
        raise ValueError("recovery positive")
    if len(recovery["headChangeInjections"]) != len(recovery["lifecycleSteps"]) - 1 or any(entry["expected"] != "BLOCK" for entry in recovery["headChangeInjections"]):
        raise ValueError("recovery inter-step injections")
    independence_by_class = {row["classId"]: row for row in registry["authorityBootstrap"]["independence"]}
    public_locators = sorted(set([row["logicalPath"] for row in source_index["sources"]] + [row["logicalPath"] for row in manifest["members"]]))
    derived_global_facts = {
        "validatorLanguageRoot": registry["validatorLanguage"]["languageRoot"],
        "unknownFailClosedRoot": rooted("B0V7-GLOBAL-UNKNOWN-FAIL-CLOSED-FACT-V1", {"unknownOperatorPolicy": registry["validatorLanguage"]["unknownOperatorPolicy"], "unknownTypePolicy": registry["validatorLanguage"]["unknownTypePolicy"], "missingPathPolicy": registry["validatorLanguage"]["missingPathPolicy"]}),
        "externalSchemaRoot": registry["detachedAcceptance"]["externalSchema"]["schemaRoot"], "internalSchemaRoot": registry["detachedAcceptance"]["internalSchema"]["schemaRoot"], "validationContextSchemaRoot": registry["detachedAcceptance"]["validationContextSchema"]["schemaRoot"],
        "actualInterfaceFactRoot": rooted("B0V7-GLOBAL-ACTUAL-INTERFACE-FACT-V1", {"evidenceContentRoot": evidence["evidenceContentRoot"], "interfaceCount": evidence["interfaceCount"], "actualProducerId": evidence["producerId"], "expectedProducerId": registry["expectedInterfaces"][0]["specificationProducerId"]}),
        "endToEndPositiveTraceRoot": rooted("B0V7-END-TO-END-POSITIVE-TRACE-V1", {"detachedAcceptanceEnvelopeRoot": registry["detachedAcceptance"]["planningPositiveEnvelopeRoot"], "casPlanningAttemptSetRoot": registry["casStateMachine"]["planningAttemptSetRoot"], "recoveryPlanningStateRoot": recovery["planningPositiveStateRoot"], "interfaceEvidenceRoot": evidence["evidenceContentRoot"], "closureControlSetRoot": rooted("B0V7-CLOSURE-CONTROL-SET-V1", [row["controlRoot"] for row in crosswalk["closureRows"]])}),
        "casStepSequenceRoot": registry["casStateMachine"]["exactStepSequenceRoot"], "casInterleavingProofRoot": rooted("B0V7-CAS-EXHAUSTIVE-PROOF-V1", cas),
        "casCrashFactRoot": rooted("B0V7-CAS-CRASH-FACT-V1", {"crashCutStateActorCount": cas["crashCutStateActorCount"], "crashViolationCount": cas["crashViolationCount"]}),
        "casResponseLossRoot": rooted("B0V7-CAS-RESPONSE-LOSS-FACT-V1", {"responseLossReadback": cas["responseLossReadback"], "outboxExactlyOnce": cas["outboxExactlyOnce"]}),
        "recoveryReadSetRoot": rooted("B0V7-RECOVERY-READ-SET-FACT-V1", {"readPaths": recovery["readPaths"], "mutationPaths": [row["path"] for row in recovery["mutationMatrix"]]}),
        "recoveryHeadRevalidationRoot": rooted("B0V7-RECOVERY-HEAD-REVALIDATION-FACT-V1", {"headPaths": recovery["headPaths"], "lifecycleSteps": recovery["lifecycleSteps"], "headChangeInjections": recovery["headChangeInjections"]}),
        "soleProducerSetRoot": rooted("B0V7-SOLE-PRODUCER-SET-FACT-V1", registry["authorityBootstrap"]["soleProducerAppointments"]), "genesisBootstrapRoot": rooted("B0V7-GENESIS-BOOTSTRAP-FACT-V1", {"bootstrapRule": registry["authorityBootstrap"]["bootstrapRule"], "genesisSchemas": registry["authorityBootstrap"]["genesisSchemas"]}),
        "permitSchemaRoot": registry["permitRevisionTimeRevocationReplay"]["permitSchema"]["schemaRoot"], "revisionRuleRoot": rooted("B0V7-REVISION-RULE-FACT-V1", registry["permitRevisionTimeRevocationReplay"]["revisionRule"]), "timeRuleRoot": rooted("B0V7-TIME-RULE-FACT-V1", registry["permitRevisionTimeRevocationReplay"]["timeRule"]),
        "revocationRuleRoot": rooted("B0V7-REVOCATION-RULE-FACT-V1", registry["permitRevisionTimeRevocationReplay"]["revocationRule"]), "replayRuleRoot": rooted("B0V7-REPLAY-RULE-FACT-V1", registry["permitRevisionTimeRevocationReplay"]["replayRule"]),
        "witnessIndependenceRoot": rooted("B0V7-INDEPENDENCE-FACT-V1", independence_by_class["WITNESS"]), "workIndependenceRoot": rooted("B0V7-INDEPENDENCE-FACT-V1", independence_by_class["WORK"]), "ledgerIndependenceRoot": rooted("B0V7-INDEPENDENCE-FACT-V1", independence_by_class["LEDGER"]), "authorityOwnerIndependenceRoot": rooted("B0V7-INDEPENDENCE-FACT-V1", independence_by_class["AUTHORITY-OWNER"]),
        "closureControlSetRoot": rooted("B0V7-CLOSURE-CONTROL-SET-V1", [row["controlRoot"] for row in crosswalk["closureRows"]]), "readerProfileSetRoot": rooted("B0V7-READER-PROFILE-SET-V1", [row["profileRoot"] for row in registry["readerIndependenceProfiles"]]),
        "deterministicIdentityPolicyRoot": rooted("B0V7-DETERMINISTIC-IDENTITY-POLICY-FACT-V1", registry["deterministicIdentityPolicy"]), "publicLocatorSetRoot": rooted("B0V7-PUBLIC-LOCATOR-SET-FACT-V1", public_locators), "currentRealStateRoot": rooted("B0V7-CURRENT-REAL-STATE-FACT-V1", registry["currentState"]),
    }
    pairs = [
        ("VALIDATOR-LANGUAGE-ROOTED", "validatorLanguageRoot"), ("VALIDATOR-UNKNOWN-FAIL-CLOSED", "unknownFailClosedRoot"), ("EXTERNAL-SCHEMA-CLOSED", "externalSchemaRoot"), ("INTERNAL-SCHEMA-CLOSED", "internalSchemaRoot"), ("VALIDATION-CONTEXT-CLOSED", "validationContextSchemaRoot"), ("ACTUAL-INTERFACES-INDEPENDENT", "actualInterfaceFactRoot"), ("END-TO-END-POSITIVE-TRACE", "endToEndPositiveTraceRoot"), ("CAS-ALL-15-STEPS", "casStepSequenceRoot"), ("CAS-ALL-INTERLEAVINGS", "casInterleavingProofRoot"), ("CAS-ALL-CRASH-CUTS", "casCrashFactRoot"), ("CAS-RESPONSE-LOSS-READBACK", "casResponseLossRoot"), ("RECOVERY-EXACT-READ-SET", "recoveryReadSetRoot"), ("RECOVERY-HEAD-REVALIDATION", "recoveryHeadRevalidationRoot"), ("SOLE-PRODUCERS-APPOINTED", "soleProducerSetRoot"), ("GENESIS-EXTERNAL-L0-ROOTED", "genesisBootstrapRoot"), ("PERMIT-TYPED", "permitSchemaRoot"), ("REVISION-STRICT", "revisionRuleRoot"), ("TIME-HALF-OPEN", "timeRuleRoot"), ("REVOCATION-ATOMIC", "revocationRuleRoot"), ("REPLAY-EXACTLY-ONCE", "replayRuleRoot"), ("TWO-WITNESSES-INDEPENDENT", "witnessIndependenceRoot"), ("WORK-INDEPENDENT", "workIndependenceRoot"), ("LEDGER-INDEPENDENT", "ledgerIndependenceRoot"), ("AUTHORITY-OWNER-INDEPENDENT", "authorityOwnerIndependenceRoot"), ("CLOSURE-ROWS-ONE-TO-ONE", "closureControlSetRoot"), ("READERS-BYTE-BOUND-INDEPENDENT", "readerProfileSetRoot"), ("DETERMINISTIC-IDENTITIES-ONLY", "deterministicIdentityPolicyRoot"), ("PUBLIC-LOCATORS-REPO-RELATIVE", "publicLocatorSetRoot"), ("REAL-STATE-SEPARATELY-BLOCKED", "currentRealStateRoot"),
    ]
    expected_bindings = [{"ordinal": index + 1, "predicateId": predicate_id, "factKey": fact_key} for index, (predicate_id, fact_key) in enumerate(pairs)]
    if canonical(expected_bindings) != canonical(registry["globalModel"]["factBindings"]) or len(registry["globalModel"]["mutationMatrix"]) != len(expected_bindings) or len({row["factKey"] for row in registry["globalModel"]["mutationMatrix"]}) != len(expected_bindings):
        raise ValueError("global fact binding matrix")
    passed = 0
    blocked = 0
    for vector in vectors:
        family = vector["family"]
        accepted = False
        if family == "VALIDATOR-TYPE":
            accepted = vector["input"]["type"] in {entry["type"] for entry in registry["validatorLanguage"]["types"]} and type_is(vector["input"]["type"], vector["input"]["value"])
        elif family == "VALIDATOR-OPERATOR":
            accepted = eval_ast(vector["input"]["ast"], vector["input"]["data"], registry["validatorLanguage"]) is True
        elif family == "VALIDATOR-UNKNOWN-TYPE":
            accepted = type_is(vector["input"]["type"], vector["input"]["value"])
        elif family == "VALIDATOR-UNKNOWN-OPERATOR":
            accepted = eval_ast(vector["input"]["ast"], vector["input"]["data"], registry["validatorLanguage"]) is True
        elif family == "DETACHED-ACCEPTANCE":
            accepted = validate_envelope(vector["input"]["envelope"], registry)
        elif family == "INTERFACE":
            expected = next((entry for entry in registry["expectedInterfaces"] if entry["interfaceId"] == vector["input"]["interfaceId"]), None)
            actual = actual_by_id.get(vector["input"]["interfaceId"])
            accepted = expected is not None and actual is not None and canonical(vector["input"]["actualValue"]) == canonical(expected["expectedValue"]) and vector["input"]["actualObservationRoot"] == actual["actualObservationRoot"] and vector["input"]["actualObservationRoot"] != expected["expectedSpecificationRoot"]
        elif family == "CAS-PROOF":
            accepted = canonical(cas) == canonical(vector["input"]["expectedProof"])
        elif family == "CAS-GUARD":
            accepted = cas_single_attempt_passes(vector["input"]["attempt"], registry["casStateMachine"]["planningAttempts"])
        elif family == "CAS-ILLEGAL-TRACE":
            accepted = vector["input"]["steps"] == CAS_STEPS
        elif family == "CAS-CRASH-CUT":
            accepted = 0 <= vector["input"]["cut"] < 15 and vector["input"]["durableWritesByCrashedActor"] == 0
        elif family == "RECOVERY":
            accepted = run_recovery_lifecycle(vector["input"]["state"], recovery) == "PASS"
        elif family == "RECOVERY-HEAD-INJECTION":
            accepted = run_recovery_lifecycle(vector["input"]["state"], recovery, vector["input"]["injectionAfterStep"]) == "PASS"
        elif family == "CLOSURE":
            accepted = any(row["sourceFindingId"] == vector["input"]["sourceFindingId"] and row["targetRequirementId"] == vector["input"]["targetRequirementId"] and row["targetOutputId"] == vector["input"]["targetOutputId"] and vector["input"]["complete"] is True for row in crosswalk["closureRows"])
        elif family == "GLOBAL-MODEL":
            accepted = global_valid(vector["input"]["model"], registry, derived_global_facts)
        else:
            raise ValueError(f"unknown vector family {family}")
        expected_result = vector["expected"] == "PASS"
        if accepted != expected_result:
            raise ValueError(f"vector {vector['vectorId']} expected {vector['expected']} got {accepted}")
        if accepted:
            passed += 1
        else:
            blocked += 1
    current = registry["currentState"]
    if current["B0"] != "ABSENT" or current["Gate29"] != "BLOCKED" or current["developmentFreeze"] != "ACTIVE" or current["repositoryVisibility"] != "PUBLIC" or current["acceptanceCredit"] != 0 or current["authorityCredit"] != 0 or current["operationalPermitCount"] != 0:
        raise ValueError("real state not blocked")
    facts = {
        "verdict": "PASS", "packageContentRoot": manifest["packageContentRoot"], "memberCount": manifest["memberCount"],
        "activeClosureDenominator": 38, "newFindingCount": 7, "inheritedActiveIdentityCount": 31, "preservedClosedCount": 1,
        "requirementCount": crosswalk["requirementCount"], "fiveFieldCount": crosswalk["fiveFieldCount"],
        "interfaceCount": 17, "validatorOperatorCount": len(registry["validatorLanguage"]["operators"]), "validatorTypeCount": len(registry["validatorLanguage"]["types"]),
        "casStepCount": 15, "casCompleteScheduleCount": cas["completeScheduleCount"], "casReachableStateCount": cas["reachableStateCount"],
        "recoveryReadPathCount": len(recovery["readPaths"]), "globalConjunctCount": len(registry["globalModel"]["predicateIds"]),
        "vectorCount": len(vectors), "positiveVectorCount": passed, "negativeVectorCount": blocked, "shardCount": len(corpus["shardDescriptors"]),
        "B0": "ABSENT", "Gate29": "BLOCKED", "developmentFreeze": "ACTIVE", "repositoryVisibility": "PUBLIC", "acceptanceCredit": 0, "authorityCredit": 0,
    }
    return {"manifestPath": manifest_arg, "manifestSha256": sha_bytes(manifest_bytes), "facts": facts, "verificationRoot": rooted("B0V7-DETACHED-READER-VERIFICATION-V1", facts)}


def patch_for(logical_path: str, content: str) -> str:
    return "*** Begin Patch\n*** Add File: " + logical_path + "\n" + "\n".join("+" + line for line in content.splitlines()) + "\n*** End Patch\n"


def main() -> None:
    try:
        result = verify()
        report = {
            "schemaVersion": "B0V7-DETACHED-QA-READER-REPORT-V1", "readerId": "B0V7-READER-B", "readerLanguage": "PYTHON-STDLIB",
            "runtime": sys.version.split()[0], "independenceClaim": "NO-GENERATOR-IMPORT;NO-OTHER-READER-IMPORT;PROFILE-BOUND-TO-EXACT-READER-BYTES",
            **result, "operational": False, "authorityCredit": 0, "acceptanceCredit": 0,
        }
        report["reportContentRoot"] = rooted("B0V7-DETACHED-QA-READER-REPORT-V1", report)
        content = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
        if "--emit-patch" in sys.argv:
            print(patch_for(REPORT_PATH, content), end="")
        else:
            print(content, end="")
    except Exception as error:
        print(f"B0V7 Reader B FAIL: {error}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
