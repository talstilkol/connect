# Protocol v1.8 — Producer freeze record

## 1. Verdict and authority boundary

1.1 Producer verdict=`PRODUCER-MECHANICAL-PASS`.

1.2 Semantic acceptance=`0`; this record is not an independent review, semantic receipt, reconciliation, HumanApproval, Permit or release authority.

1.3 `Acceptance=0`; `authorityOutputs=0`; `Gate29=BLOCKED`; `developmentFreeze=ACTIVE`; `repository=PUBLIC`; `independentReceipt=MISSING-EXTERNAL-INPUT`.

1.4 The package bytes named in section 3 are frozen. No product, Git, GitHub, provider or deployment mutation was performed.

## 2. Exact roots and denominators

2.1 `packageRoot=2aec14f85da9068568a0e603292f036bd27a2d4e6c81720e7c59b7bed0c2618d`.

2.2 `manifestRoot=5adef086892216bc897e9e9507a6963d0c29dbb3776427a3d3347360ebf42c64`.

2.3 `commonResultRoot=3c71f0abdefe0ace8b977efd256537379bac380563203aef05ef5daf3246e0ad`.

2.4 `vectorResultSetRoot=b3e93ff141db602d79987b555ef45423a3332f22483c2f782a4a9bfaf395da13`.

2.5 `semanticProofSetRoot=5da713f8084083a0fa949244b65e3896044d74d91807d351b4473d376e757864`; `semanticShardSetRoot=577b84738b15ec48090f3881442f1a697021d4df22c374b09b91d9d2a8dd838b`; `semanticContractRoot=3abfc4fa20d84d78ed28b462e355c03540b9cdc8368f1fd6322a0ee6eca97fb5`.

2.6 `sourceUniverseRoot=80a6d1e1bb4d912ccbfb32726c96119159c088251584c8e2e64d1ca989fa03cb`; `v1.7PackageRoot=495ba345115f7623802adef7d7268ba7a6fe7049e68f9b04866f77f3602b5d39`.

2.7 Exact counts: payload members=`9`; physical producer tools=`3`; frozen inputs=`28`; v1.7 hostile-review findings=`25`; non-merged closure rows=`25`; predecessor finding rows=`31`; semantic preservation rows=`57,466`; predecessor predicates=`4,016`; predecessor semantic uses=`53,450`; causal vectors=`649`; graph nodes=`3,245`; graph edges=`2,596`; schemas=`69`; unresolved schema references=`0`; empty field-type tables=`0`.

2.8 Finding severity denominator: `P0=16`; `P1=8`; `P2=1`; `P3=0`. Closure acceptance-credit sum=`0`.

## 3. Frozen package inventory

| Role | Repository-relative path | SHA-256 | Lines | Bytes |
|---|---|---|---:|---:|
| Payload | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/subject.md` | `4c971e25ad0f1db8e73bd0a18311001086b829705a3f5a44ac2646f889cec34a` | 252 | 17,055 |
| Payload | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/normative-registry.json` | `cd0b61ed570c2996b40058100262790132b1fa8f17e64088bd7997e4caf180bb` | 1 | 58,395 |
| Payload | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/closure-crosswalk.jsonl` | `2ec4e85d0c527891da2d60982c5c8e63c61279c2b85de6b81c00e51d7290fec0` | 25 | 16,403 |
| Payload | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/contract-preservation.json` | `63c32ffd9e23684fdf66cbc85dd546d83fee44c9a119e8229881f510f131a708` | 1 | 5,853 |
| Payload | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/predecessor-finding-preservation.jsonl` | `54b8b8d2517ed5302539ee5d0ce70d4af220668daeed18c753dc58f7899fa2ea` | 31 | 399,933 |
| Payload shard 1/2 | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/semantic-preservation-000001-030000.jsonl` | `2ef0e6de0bd1ec409f3baddba501f97d4f4347816b95c36e7a818de7a7ae4151` | 30,000 | 42,177,619 |
| Payload shard 2/2 | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/semantic-preservation-030001-057466.jsonl` | `62f07de979c2e5ef005ac9b348ee555d2494d4fab75620df8173bd6db19d17b3` | 27,466 | 28,295,030 |
| Payload | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/causal-vectors.jsonl` | `33a43801015a520c669b1fb6e670b0e3701f9968a9cdc1fe8d50ca624904b6ac` | 649 | 616,517 |
| Payload | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/causal-source-graph.json` | `c382290c135488c1bf4e07474f488dcdcd2b65327021af2aa756c69367f18634` | 1 | 1,184,753 |
| Manifest | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/normative-package-manifest.json` | `5adef086892216bc897e9e9507a6963d0c29dbb3776427a3d3347360ebf42c64` | 1 | 8,537 |
| Producer | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/generate.mjs` | `51b72a1e2e3f0934f093dc56684252ec4502ef371d6fccca2c22f241a6e848dd` | 1,089 | 69,956 |
| Reader A | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/reader-a.mjs` | `921bb2f54a6777da68e4548d4ae1a803439182889e509b54b32b9e292bcee799` | 775 | 59,008 |
| Reader B | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/reader-b.rb` | `c1804fe85caef8dec075f4ea2761ad53ade0984c0d6c041f8e1adc29b152034d` | 856 | 60,447 |
| Producer QA | `docs/planning/three-review-protocol-v1-8-package-2026-08-30/producer-qa.md` | `1c75210db3e80451e7bb0637bf8dda168bb292ac75a99b0e7f66a749dff35d9a` | 34 | 1,586 |
| Detached report A | `docs/planning/three-review-protocol-v1-8-detached-reports-2026-08-30/qa-reader-a-report.json` | `841f30b29934c2863b951c810d8593ba3b2973724ccfb1eb0237ee7704a27292` | 1 | 1,210 |
| Detached report B | `docs/planning/three-review-protocol-v1-8-detached-reports-2026-08-30/qa-reader-b-report.json` | `ae5c02a490a1b79c36e0ca7eac2e3f5e70ab88fe68e564e93dd4dfd3ebbfe66a` | 1 | 1,210 |

3.1 The two semantic shards are both strictly below the exclusive `50 MiB` regular-Git member limit (`52,428,800` bytes). Their declared sequence is exact and contiguous: `000001..030000`, then `030001..057466`.

3.2 The obsolete 70,472,649-byte single carrier and both package-local QA reports are absent. Reader reports exist only in the detached report directory.

3.3 This `FINAL.md` is a non-normative out-of-band freeze record and is deliberately excluded from `packageRoot`. Its physical SHA-256/lines/bytes must be reported outside the file to avoid self-reference.

## 4. Exact one-to-one v1.7 review closure crosswalk

| Finding | Requirement | Control | Bound vectors | Producer state | Independent credit |
|---|---|---|---:|---|---:|
| `MPRR-V17-IHR-F001` | `MPRR-V18-REQ-001` | `MPRR-V18-CONTROL-F001` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F002` | `MPRR-V18-REQ-002` | `MPRR-V18-CONTROL-F002` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F003` | `MPRR-V18-REQ-003` | `MPRR-V18-CONTROL-F003` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F004` | `MPRR-V18-REQ-004` | `MPRR-V18-CONTROL-F004` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F005` | `MPRR-V18-REQ-005` | `MPRR-V18-CONTROL-F005` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F006` | `MPRR-V18-REQ-006` | `MPRR-V18-CONTROL-F006` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F007` | `MPRR-V18-REQ-007` | `MPRR-V18-CONTROL-F007` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F008` | `MPRR-V18-REQ-008` | `MPRR-V18-CONTROL-F008` | 6 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F009` | `MPRR-V18-REQ-009` | `MPRR-V18-CONTROL-F009` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F010` | `MPRR-V18-REQ-010` | `MPRR-V18-CONTROL-F010` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F011` | `MPRR-V18-REQ-011` | `MPRR-V18-CONTROL-F011` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F012` | `MPRR-V18-REQ-012` | `MPRR-V18-CONTROL-F012` | 2 | Exact physical successor bytes implemented; external semantic receipt pending | 0 |
| `MPRR-V17-IHR-F013` | `MPRR-V18-REQ-013` | `MPRR-V18-CONTROL-F013` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F014` | `MPRR-V18-REQ-014` | `MPRR-V18-CONTROL-F014` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F015` | `MPRR-V18-REQ-015` | `MPRR-V18-CONTROL-F015` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F016` | `MPRR-V18-REQ-016` | `MPRR-V18-CONTROL-F016` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F017` | `MPRR-V18-REQ-017` | `MPRR-V18-CONTROL-F017` | 2 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F018` | `MPRR-V18-REQ-018` | `MPRR-V18-CONTROL-F018` | 8 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F019` | `MPRR-V18-REQ-019` | `MPRR-V18-CONTROL-F019` | 12 | Implemented, pending independent review | 0 |
| `MPRR-V17-IHR-F020` | `MPRR-V18-REQ-020` | `MPRR-V18-CONTROL-F020` | 2 | Reference executable; production adapter absent | 0 |
| `MPRR-V17-IHR-F021` | `MPRR-V18-REQ-021` | `MPRR-V18-CONTROL-F021` | 7 | Reference executable; production adapter absent | 0 |
| `MPRR-V17-IHR-F022` | `MPRR-V18-REQ-022` | `MPRR-V18-CONTROL-F022` | 2 | Implemented, external evidence missing | 0 |
| `MPRR-V17-IHR-F023` | `MPRR-V18-REQ-023` | `MPRR-V18-CONTROL-F023` | 2 | Contract implemented; continuous PUBLIC receipt and real scanner receipts missing | 0 |
| `MPRR-V17-IHR-F024` | `MPRR-V18-REQ-024` | `MPRR-V18-CONTROL-F024` | 2 | Reference instrumentation implemented; live heads pending | 0 |
| `MPRR-V17-IHR-F025` | `MPRR-V18-REQ-025` | `MPRR-V18-CONTROL-F025` | 2 | Read-only readers and detached reports verified | 0 |

4.1 Denominator is exactly `25/25`; unique findings=`25`; unique requirements=`25`; unique controls=`25`; merged rows=`0`; implicit credit=`0`; independent receipts=`0`.

4.2 Preservation denominator is exact: predecessor finding rows=`31/31`; predecessor semantic records=`57,466/57,466`; duplicate or omitted source locators=`0`.

## 5. Independent-reader parity and negative causality

5.1 JavaScript Reader A=`PASS`; Ruby Reader B=`PASS`; all 19 counters in each reader=`0`.

5.2 Both readers independently recomputed the same package, manifest, vector-result and common-result roots from physical bytes and exact closed universes.

5.3 Graph coverage=`649/649`; every vector has exactly five typed nodes and four typed edges; graph node/edge totals=`3,245/2,596`; oracle input to evaluator edges=`0`.

5.4 Vectors comprise predecessor vectors=`574` and successor vectors=`75`. Successor coverage includes cross-language canonical corpus=`4`, authority-state mutations=`6`, no-self-acceptance=`1`, prerequisite mutations=`9`, and crash-boundary vectors=`5`, in addition to the exact positive/negative pair for each finding.

5.5 A second post-generation read-only execution of both readers returned the same roots and zero counters. Package-local report creation and legacy-carrier presence are fail-closed.

## 6. Secret-candidate check and PUBLIC boundary

6.1 A strict local Gitleaks scan reported three candidates. Manual structural triage found two occurrences of one deterministic SHA-256 `operationKey` in F020 vectors and one uppercase truncated SHA-256 suffix inside a v1.7-generated `useId`; none is a credential. Their redacted candidate SHA-256 values are `c4bd19a665bcfd3d70a7f6ac72038bd89a0a7103e2ef058e98d35cdfb86ce7ba` and `953d81424040e1f95af0299bfdcd45cd285b70c41249aec0cab4a0ccfea1a518`.

6.2 An independent credential/JWT pattern scan returned zero candidates. This local triage is not the required pair of externally trusted scanner receipts and grants no PUBLIC admission credit.

6.3 The package requires `repository=PUBLIC` continuously. It neither changes visibility nor authorizes a push. Exact remote/ref/old-head/new-head/write-object-set receipts, two fresh real scanner receipts and a trusted dictionary seal remain external prerequisites.

## 7. Residual blockers and no-self-acceptance proof boundary

7.1 Missing external artifacts: an independent package-bound semantic receipt; three independent reviews; reconciliation; HumanApproval; trusted issuer/time/finality/revocation evidence; live CAS and dependency heads; production storage/CAS adapter; continuous PUBLIC visibility receipt; and two real scanner receipts over an exact push transaction.

7.2 The positive acceptance path is synthetic and non-authoritative. Its evaluator may derive `Permit-eligible`, but `authorityOutputs` remains `0`; no producer, generator, reader, QA report or this freeze record can issue or imply Acceptance.

7.3 Therefore the only valid final interpretation is: mechanical successor evidence exists; semantic acceptance remains external and absent; Gate29 remains blocked; freeze remains active; repository policy remains PUBLIC.
