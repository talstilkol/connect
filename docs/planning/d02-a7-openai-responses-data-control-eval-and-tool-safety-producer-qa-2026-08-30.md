# 1. Connect — D02-A7 Producer QA

## 1.1 Identity and immutable subjects

1.1.1 `artifactId=CONNECT-D02-A7-OPENAI-RESPONSES-DATA-CONTROL-EVAL-TOOL-SAFETY-PRODUCER-QA-2026-08-30`.

1.1.2 Subject=`docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-semantic-successor-2026-08-30.md`.

1.1.3 Subject root=`sha256:f1246bc52124a59645a2446d4c83075358c9f6214f84bc6ee7e7ce6b8208b446`; extent=`360 lines; 4042 words; 36482 bytes`; numbered clause lines=`114`.

1.1.4 Crosswalk=`docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md`.

1.1.5 Crosswalk root=`sha256:3f2b6689b638453872c019b96ed451a6096d3d771935d73dde82ff116b3b3cbc`; extent=`47 lines; 540 words; 5195 bytes`; numbered clause lines=`13`.

1.1.6 QA class=`PRODUCER-MECHANICAL-AND-SEMANTIC-CONSISTENCY-QA; NOT-INDEPENDENT-REVIEW; NOT-ACCEPTANCE`.

1.1.7 Safe state=`A7 self-acceptance 0/1; AI runtime OFF; Gate29 BLOCKED; development freeze ACTIVE; repository visibility PUBLIC under Tal directive/D18-A2 exact-root authority proof`.

## 1.2 Executed deterministic checks

1.2.1 `Q01 frozen input roots=PASS`; A5, A6, A6 QA, A6 review, A6 manifest and D18-A2 hashes exactly match the roots declared in the Subject.

1.2.2 `Q02 physical identity=PASS`; Subject and crosswalk SHA-256, line, word and byte counts were recomputed after the final patch.

1.2.3 `Q03 numbered clauses=PASS`; Subject has 114 clause lines, crosswalk has 13, and duplicate numbered clause IDs=`0` in both.

1.2.4 `Q04 predecessor totality=PASS-MECHANICALLY`; A5 clause universe=`50`, exact overrides=`5`, default historical dispositions=`45`, missing override IDs=`0`; A6 universe=`213`, exact replacements=`23`, rooted preserved clauses=`190`, missing replacement IDs=`0`.

1.2.5 `Q05 predecessor conflict correction=PASS-AS-PRODUCER-CANDIDATE`; A5 clause 1.7.2 is explicitly replaced, all six exact approval domains are present, WhatsApp/Meta Policy is separate, receipt denominator=`0/6`, and no domain is optional.

1.2.6 `Q06 AiProfile membership=PASS-MECHANICALLY`; exact IDs=`D02A7-AIP-001`–`D02A7-AIP-017`, count=`17`, holes/duplicates=`0`; request/runtime/model/prompt/context/output/tool/side-effect/account/data-control/cache/residency/privacy/policy/Eval/source dimensions are physically present.

1.2.7 `Q07 detached root DAG=PASS-MECHANICALLY`; dependency order is `AiProfile/Account/Source/Policy -> AdmissionSubject -> detached Legal and Eval -> AdmissionCandidate -> detached six receipts -> ApprovalSet -> AdmissionRoot`; no record contains its own or a descendant aggregate root, and detached Eval results are excluded from AiProfile configuration.

1.2.8 `Q08 invalidation=PASS-MECHANICALLY`; exact IDs=`D02A7-INV-001`–`D02A7-INV-010`, count=`10`, and every listed mutation invalidates the affected root descendants toward a blocking terminal.

1.2.9 `Q09 account denominator=PASS-MECHANICALLY`; exact rows=`D02A7-AR-001`–`D02A7-AR-009`, count=`9`, holes/duplicates=`0`; each row names source/scope/tuple/predicate/freshness/state; current accepted rows=`0/9`; AccountSnapshotRoot=`MISSING`.

1.2.10 `Q10 Legal/Privacy bundle=PASS-MECHANICALLY`; exact members=`D02A7-LP-001`–`D02A7-LP-007`, count=`7`, holes/duplicates=`0`; all-of, applicability receipt, same-subject, no-cherry-pick, expiry/revocation and safe failure rules exist; current members=`0/7`; bundle=`0/1`.

1.2.11 `Q11 source register=PASS-AS-UNACCEPTED-PRODUCER-OBSERVATION`; eleven unique `developers.openai.com` sources are retained; hosted-Evals dates and current Terra positioning remain consistent with refreshed official pages; Program acceptance=`0/11`.

1.2.12 `Q12 PUBLIC authority=PASS-MECHANICALLY`; D18-A2 bytes hash to `448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`, the Subject binds clauses 1.1.4–1.1.6 and the current Tal directive, and the check name is `PUBLIC-AUTHORITY-BINDING`, not inference from non-mutation.

1.2.13 `Q13 visibility-state separation=PASS`; `NO-GIT-GITHUB-MUTATION-AUTHORITY` is separate from PUBLIC proof; fresh live GitHub readback is explicitly `NOT-RUN`; no Git/GitHub state or visibility was changed.

1.2.14 `Q14 one-to-one crosswalk=PASS-MECHANICALLY`; source findings=`5`, closure records=`5`, exact forward/inverse cardinality=`1:1`, severity=`4 P1 + 1 P2`, missing/duplicate/extra/merged rows=`0`, independent closure roots=`0/5`, acceptance credit=`0/5`.

1.2.15 `Q15 negative-to-success=PASS`; every unknown, absent, missing, stale, expired, revoked, vetoed, mismatched or unaccepted member is non-success; current AdmissionRoot=`MISSING`; terminal=`PROFILE-NOT-ADMITTED`.

1.2.16 `Q16 deterministic ID rule=PASS`; no generated/random ID, executable `Math.random()` or `crypto.randomUUID()` use exists; their only mentions are explicit prohibitions.

1.2.17 `Q17 publication hygiene=PASS`; artifact locators are repository-relative, workstation locators=`0`, secret/credential values=`0`, PII records=`0`, and no fake/mock/demo/sample/synthetic business record was introduced.

1.2.18 `Q18 scope and mutation=PASS`; only the three commissioned A7 planning artifacts were materialized; no A5/A6 artifact, Product code, provider/account, Git/GitHub, deployment or external state was changed.

## 1.3 Producer causal-vector results

| vector ID | mutation | expected result | producer result |
|---|---|---|---|
| `D02A7-QV-001` | remove WhatsApp/Meta approval member | approval count mismatch; no ApprovalSetRoot | `PASS-BLOCKED` |
| `D02A7-QV-002` | change one endpoint/cache/tool/account/profile member while retaining an older Run | descendant root mismatch; `PROFILE-NOT-ADMITTED` | `PASS-BLOCKED` |
| `D02A7-QV-003` | delete one inner field or one row from the account denominator | no `9/9`; `ACCOUNT-READBACK-BLOCKED` | `PASS-BLOCKED` |
| `D02A7-QV-004` | present only a DPA or omit one Legal member | no `7/7`; `LEGAL-PRIVACY-BUNDLE-BLOCKED` | `PASS-BLOCKED` |
| `D02A7-QV-005` | claim PUBLIC from no Git mutation with absent/wrong D18-A2 root | PUBLIC predicate fails; no visibility proof or mutation authority | `PASS-BLOCKED` |
| `D02A7-QV-006` | attempt to include a detached Eval result inside AiProfile and bind it back to AdmissionSubject | self/ancestor dependency rejected before root materialization | `PASS-BLOCKED` |

1.3.1 These are Producer schema checks, not independent hostile-review evidence and not operational/runtime tests.

## 1.4 Producer verdict and zero ledger

1.4.1 mechanical verdict=`PASS`.

1.4.2 candidate five-finding semantic coverage=`5/5 PASS-AS-PRODUCER-PROPOSAL`.

1.4.3 independently accepted finding closures=`0/5`; independent semantic verdict=`NOT-RUN`.

1.4.4 Accepted counters=`sources 0/11; account 0/9; Legal members 0/7; Legal bundle 0/1; approvals 0/6; AiProfile 0/1; Eval Runs 0; AdmissionRoot 0/1; runtime permit 0/1`.

1.4.5 `A7 self-acceptance=0/1`; `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository visibility=`PUBLIC` under Tal directive/D18-A2 exact-root authority proof.

1.4.6 Required next action=`new independent hostile review against the exact immutable Subject, crosswalk and Producer-QA roots`; no implementation may begin from this QA.
