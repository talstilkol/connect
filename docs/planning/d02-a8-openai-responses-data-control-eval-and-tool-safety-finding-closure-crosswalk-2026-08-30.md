# 1. Connect — D02-A8 one-to-one Finding closure crosswalk

## 1.1 Identity and immutable inputs

1.1.1 `crosswalkId=CONNECT-D02-A8-A7-FINDING-CLOSURE-CROSSWALK-2026-08-30`.

1.1.2 Subject=`docs/planning/d02-a8-openai-responses-data-control-eval-and-tool-safety-immutable-successor-2026-08-30.md`; SHA-256=`61774fd3f54bf39d727ff7cdc09ef475fff9bd2b2561e5639e1b947dbbcaec0b`.

1.1.3 Frozen A7 Findings manifest=`docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-independent-hostile-review-findings-manifest-2026-08-30.md`; SHA-256=`d488c9f36d88797bf74b6db60e422c4bd9d55443eff032fa38aff490fd813c9b`.

1.1.4 Machine package manifest=`docs/planning/d02-a8-openai-responses-data-control-eval-tool-safety-package-2026-08-30/package-manifest.json`; SHA-256=`d5e60ec07595a5a55db40e029b815805c28a19ecbba9b0d6e1136af762461de6`; payloadRoot=`0027d09a844eaa79ac8d779e2691e5af77c8c3ffd1321c0b65b48f7fb085b636`.

1.1.5 Denominator=`7`; severity=`0 P0 + 6 P1 + 1 P2`; duplicate/hole/merge/waiver=`0`.

## 1.2 Exact non-merged closure candidates

| Closure row | Finding | Severity | Exact successor evidence | Executable causal evidence | Candidate predicate | Independent state | noMergeKey |
|---|---|---:|---|---|---|---|---|
| `D02A8-CR-001` | `D02-A7-IHR-F001` | `P1` | Subject 1.2–1.3; `registry.json`: `D02A8-AUTH-001..006`, `D02A8-PCU-001..006`, `D02A8-MSA-001`; authority root=`df945c2b9a4a39f35828f80bcec53df736a3fc5f24dc872e0b1c100bfff36060`; clause root=`f41790638619261da3ff71c47008feebd5f16485091f2bb10393f52e6ae11811` | `D02A8-MV-001..020`; `D02A8-MV-168..179`; both readers derive 6 ordered nodes, 473 clause members and terminal on deletion/reorder/count change | full user D02 → researched decision → A4 → A5 → A6 → A7 chain; every clause one disposition; Luna/Terra cannot become operational without current typed authority | `OPEN`; `independentClosureRoot=MISSING`; credit=`0` | `D02-A7-IHR-F001` |
| `D02A8-CR-002` | `D02-A7-IHR-F002` | `P1` | Subject 1.1, 1.8–1.9; `schema.json`, `registry.json`, `root-instances.json`, `dependency-dag.json`, `mutation-corpus.json`, `reader-a.mjs`, `reader-b.rb`; packageCoreRoot=`a1ce88c079503cade993bc11cf8f6f3be7ea13f5db990780030355d4fab8ef53` | Full `179`-vector corpus; actual readers read no oracle; roots=`15`, root/terminal/oracle mismatches=`0`, expected-to-actual=`0`, killed=`179/179` | typed closed registries and roots reproduce under two different algorithms; schema/reference/dangling/cycle mismatch blocks | `OPEN`; `independentClosureRoot=MISSING`; credit=`0` | `D02-A7-IHR-F002` |
| `D02A8-CR-003` | `D02-A7-IHR-F003` | `P1` | Subject 1.5.1–1.5.3; `registry.json`: `D02A8-AR-006`, `D02A8-AR-006-P`, `D02A8-AR-006-F`; account root=`b32181c09070f729075396b959cad775ac657a06e1337ec2fb186753396ecc9e` | `D02A8-MV-061..075`; deletion/staleness/cross-satisfaction of either child blocks both readers | provider limits and Finance budget have distinct source authority, issuer, scope, freshness, expiry/revocation fields; parent is exact all-of | `OPEN`; `independentClosureRoot=MISSING`; credit=`0` | `D02-A7-IHR-F003` |
| `D02A8-CR-004` | `D02-A7-IHR-F004` | `P1` | Subject 1.6; `D02A8-IN-013`; `D02A8-ROOT-PUBLIC-DIRECTIVE`; locator `D18-A2:1.1.4`; root=`b06aff4c20112596e51659b5ec8eeb688b0b58b9733a81876ef2a64fda27b7d8` | `D02A8-MV-121..124`; wrong input root, missing locator, added conversational conjunct or substituted evidence blocks | PUBLIC policy derives only from the durable D18-A2 directive; no non-mutation or live-readback substitution | `OPEN`; `independentClosureRoot=MISSING`; credit=`0` | `D02-A7-IHR-F004` |
| `D02A8-CR-005` | `D02-A7-IHR-F005` | `P1` | Subject 1.4; `promptPolicy`; `D02A8-AIP-006`; `D02A8-ROOT-PROMPT-ARTIFACT`; `D02A8-SRC-009`; prompt root=`0a5dad570aebe426c2407fbb4f730ff59ffccd9f3721b2ce60e988b701617b4d` | `D02A8-MV-117..120`; receipt-009 claim/stale/commitment vectors `D02A8-MV-102`, `D02A8-MV-113`, `D02A8-MV-165` | Connect-owned exact prompt bytes required; reusable provider prompts OFF; `/v1/prompts` and Responses prompt-object field forbidden; 2026 lifecycle changes invalidate descendants | `OPEN`; `independentClosureRoot=MISSING`; credit=`0` | `D02-A7-IHR-F005` |
| `D02A8-CR-006` | `D02-A7-IHR-F006` | `P1` | Subject 1.8; `dependency-dag.json`; three root states `D02A8-ROOT-PLANNING-ACCEPTANCE`, `D02A8-ROOT-AI-ADMISSION`, `D02A8-ROOT-RUNTIME-PERMIT`; DAG root=`8823b355bd9a75dd72c7cafa67f024f58dd426af13c92f16a4c9b80165639a09` | `D02A8-MV-125..133`; graph=`22` nodes/`23` edges/`0` cycles/`0` dangling; root-class substitutions block | planning, admission and runtime roots have distinct producers/classes and cannot substitute; Gate29/freeze only gate runtime; prohibited reverse edges prevent cycles | `OPEN`; `independentClosureRoot=MISSING`; credit=`0` | `D02-A7-IHR-F006` |
| `D02A8-CR-007` | `D02-A7-IHR-F007` | `P2` | Subject 1.7; `D02A8-SRC-001..011`; observation root=`b2305d4413492ce9efcf12d252e7e90c9b8f42adf1faff685a4c367671f931d0`; exact cut=`2026-08-30T01:14:43Z` | `D02A8-MV-083..116`; `D02A8-MV-157..167`; deletion, claim change, stale state, invalid acceptance or commitment change returns typed terminal | 11 disclosure-safe receipts bind URL, authority, cut and claim commitment; exact-cut freshness/change detector; page bytes excluded; observation never equals acceptance | `OPEN`; `independentClosureRoot=MISSING`; credit=`0` | `D02-A7-IHR-F007` |

## 1.3 Closure accounting and safe state

1.3.1 Candidate remediation=`7/7`; independent closure=`0/7`; merged=`0`; waived=`0`; accepted=`0`; Producer self-acceptance=`0`.

1.3.2 Each row has one unique `Closure row`, one exact source Finding and `noMergeKey` equal to that Finding. Range credit across Findings is forbidden.

1.3.3 The five A6 Findings remain five separate OPEN machine rows with accepted closure=`0/5`; this crosswalk does not reopen or merge their denominator.

1.3.4 Mechanical PASS cannot change Finding state. Only a future independent review disposition rooted to this exact byte set may supply an `independentClosureRoot`.

1.3.5 AI runtime=`OFF`; Gate29=`BLOCKED`; development freeze=`ACTIVE`; repository policy=`PUBLIC`; PlanningAcceptance/AiAdmission/RuntimePermit=`0/0/0`.
