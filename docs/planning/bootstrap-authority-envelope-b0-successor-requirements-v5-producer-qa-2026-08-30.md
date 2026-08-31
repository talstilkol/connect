# 1. Connect — B0 v5 detached Producer QA

## 1.1 Identity and limit

1.1.1 `artifactId=CONNECT-B0-V5-DETACHED-PRODUCER-QA-2026-08-30-G0`.

1.1.2 `artifactClass=DETACHED-PRODUCER-MECHANICAL-QA;PLANNING-ONLY;NOT-INDEPENDENT-REVIEW;NOT-FINDING-CLOSURE;NOT-AUTHORITY;NOT-ACCEPTANCE`.

1.1.3 Atomic package manifest SHA-256=`5a054f5d4a482a0e74a9146dd3aeee865a5f28ee245d76784dbaa03ed3a118c4`; packageContentRoot=`666e121d998445e3134f3a1978ee9b7c5962324bd51376e2ebc5bf2646d689f8`.

1.1.4 Producer QA can prove deterministic bytes, schema/count invariants and planning-DSL behavior only. It cannot close any Finding or supply external authority, operational Evidence or Acceptance.

## 1.2 Exact artifact roots

| Artifact | SHA-256 | Lines | Bytes |
|---|---|---:|---:|
| `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-2026-08-30.md` | `bc91a6eee687f1cb9f651572fd84ee1fce9d578b502088a2e3c79fbb8062ff92` | 1317 | 167079 |
| `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-normative-registry-2026-08-30.json` | `6c5f9be8d61b684e3239fb30696e480dbc8138600bddd77d51c396c553bc97fc` | 9887 | 393514 |
| `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-source-member-span-index-2026-08-30.json` | `41204bbabfd32521f5ce13fbe8321099fb59e9881a9de64e5d1fcdab9aedb325` | 72098 | 2511616 |
| `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-closure-crosswalk-2026-08-30.json` | `89e8846ad28e4b157fd638eef56ebc72a02ab63e2b94e63608ee83be291e3b31` | 65942 | 3084549 |
| `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-executable-vector-corpus-2026-08-30.json` | `4bb7f44bc175b93fb8f616f75455a55cadd96c002db175857d53229bc6afd7e6` | 35531 | 3213227 |
| `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-atomic-package-manifest-2026-08-30.json` | `5a054f5d4a482a0e74a9146dd3aeee865a5f28ee245d76784dbaa03ed3a118c4` | 97 | 6980 |
| `web/docs/planning/qa/generate-b0-v5-package.mjs` | `65faf5dc2b2d3ea31ec4b8721b4e5bc1286f5f2cf39e4e67550cff0d75c7c261` | 1671 | 111356 |
| `web/docs/planning/qa/b0-v5-qa-reader-a.mjs` | `e30410def5c1b79e8b49ca3c85bbfed3ee8579c223769fbc34da9f6c5781e21b` | 267 | 25215 |
| `web/docs/planning/qa/b0-v5-qa-reader-b.py` | `ce52df9d637cf27b52848c8586b3ede55d92acd5b4548b3a8c7fab140d20214b` | 371 | 26255 |
| `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-qa-reader-a-report-2026-08-30.json` | `a2ff42b60a3c1c4fe80707fa36c6c0274b886b6821fafa6016a2b62d4d4ef3b4` | 120 | 3118 |
| `web/docs/planning/bootstrap-authority-envelope-b0-successor-requirements-v5-qa-reader-b-report-2026-08-30.json` | `71d51b86dcd584b664fe75df7135d55472e36c4d48f1f5ea7dd9d91cf6593c6f` | 105 | 2729 |

## 1.3 Mechanical checks

1.3.1 Reader A=`MECHANICAL-PASS`; checks=20/20; planning vectors=288/288; report root=`a2ff42b60a3c1c4fe80707fa36c6c0274b886b6821fafa6016a2b62d4d4ef3b4`.

1.3.2 Reader B=`MECHANICAL-PASS`; checks=17/17; planning vectors=288/288; report root=`71d51b86dcd584b664fe75df7135d55472e36c4d48f1f5ea7dd9d91cf6593c6f`.

1.3.3 Requirements=96/96; fields=480/480; inherited v4 Requirements=84/84; inherited v4 fields=420/420; non-merged Finding rows=12/12; interfaces=17/17; object classes=94/94; heads=36/36; Outputs=96/96; fixtures=288/288; vector programs=288/288.

1.3.4 Acceptance fields=156/156; Genesis slots=33/33; recovery members=5/5; recovery witnesses=2/2; independence profiles=9/9.

1.3.5 Both independently implemented readers recomputed every core member hash, the package content root, indexed source member spans, inherited field equality and all 288 control/mutation oracle results.

## 1.4 Explicit zero claims

1.4.1 `independentlyClosedV4FindingCount=0/12`; `acceptedRequirementCount=0/96`; `implementedOutputCount=0/96`; `operationalVectorExecutionCount=0/288`; `authorityCredit=0`; `acceptanceCredit=0`.

1.4.2 `externalL0Authority=ABSENT`; `genesisFoundationReceipt=ABSENT`; `canonicalMandateReceipt=ABSENT`; `B0=ABSENT`; `ControlSequenceAcceptance=BLOCKED`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repositoryVisibility=PUBLIC`.

1.4.3 Fresh independent hostile review of this exact package root remains mandatory. Producer QA and its two readers do not satisfy that denominator.
