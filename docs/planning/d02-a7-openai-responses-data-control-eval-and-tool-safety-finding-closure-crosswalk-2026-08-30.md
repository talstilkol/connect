# 1. Connect — D02-A7 one-to-one candidate finding-closure crosswalk

## 1.1 Identity and frozen inputs

1.1.1 `artifactId=CONNECT-D02-A7-OPENAI-RESPONSES-DATA-CONTROL-EVAL-TOOL-SAFETY-FINDING-CLOSURE-CROSSWALK-2026-08-30`.

1.1.2 Subject=`docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-semantic-successor-2026-08-30.md`.

1.1.3 Source finding manifest=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-findings-manifest-2026-08-30.md`; root=`sha256:55f985944dae7684af73f3214e966650a3949ae52b1b28dc54ef198a886dceca`.

1.1.4 Source review=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-2026-08-30.md`; root=`sha256:344c42bcdbf60eed1332bfaa7e20d9725e80cad5e0f2d05863c3cbef6ba5f16d`.

1.1.5 Exact source finding universe=`D02-A6-IHR-F001`–`D02-A6-IHR-F005`; expected count=`5`; noMergeKey=`findingId`.

1.1.6 Crosswalk class=`PRODUCER-CANDIDATE-CLOSURE-MAP; NOT-INDEPENDENT-DISPOSITION; NOT-ACCEPTANCE`.

# 2. Atomic one-to-one records

## 2.1 Complete crosswalk

| closure record ID | source finding | severity | exact A7 requirement locators | remediation atom | closure predicate supplied for independent execution | producer candidate state | independent closure root | acceptance credit | noMergeKey |
|---|---|---:|---|---|---|---|---|---:|---|
| `D02A7-CR-001` | `D02-A6-IHR-F001` | `P1` | Subject 1.3.1–1.3.8; 1.4.1–1.4.6; 1.13 row F001 | Total rooted A5/A6 disposition plus exact required six-domain approval registry; A5 WhatsApp/Meta domain is preserved separately. | Two independent readers derive A5 `50=5+45`, A6 `213=23+190`, identical six approval members and zero unresolved predecessor conflict; deletion of one approval member blocks. | `CANDIDATE-REMEDIATED; INDEPENDENT-REVIEW-PENDING` | `MISSING` | `0` | `D02-A6-IHR-F001` |
| `D02A7-CR-002` | `D02-A6-IHR-F002` | `P1` | Subject 1.2; 1.6.1–1.6.5; 1.10.1–1.10.11; 1.11.1–1.11.3; 1.13 row F002 | Seventeen-member AiProfile plus non-circular detached AdmissionRoot chain covers runtime, request, model, prompt/context, tools/side effects, account/data/cache/residency, policy, Eval and invalidation. | Mutate each exact member alone: profile/admission roots must differ, prior receipts/Runs/permits become stale, unchanged records reproduce, and self/ancestor membership count remains zero. | `CANDIDATE-REMEDIATED; INDEPENDENT-REVIEW-PENDING` | `MISSING` | `0` | `D02-A6-IHR-F002` |
| `D02A7-CR-003` | `D02-A6-IHR-F003` | `P1` | Subject 1.7.1–1.7.7; 1.13 row F003 | Nine named readback rows, exact composite fields, common/row freshness, TTLPolicy and AccountSnapshot all-of root. | Readers reconstruct identical ordered IDs `D02A7-AR-001..009`; missing, duplicate, stale, expired, cross-Project or inner-field deletion prevents `9/9` and AdmissionRoot. | `CANDIDATE-REMEDIATED; INDEPENDENT-REVIEW-PENDING` | `MISSING` | `0` | `D02-A6-IHR-F003` |
| `D02A7-CR-004` | `D02-A6-IHR-F004` | `P1` | Subject 1.8.1–1.8.7; 1.10.2–1.10.4; 1.13 row F004 | Seven exact Legal/Privacy members, explicit applicability receipts, same AdmissionSubjectRoot, all-of bundle and no cherry-pick/replay. | Readers reconstruct `D02A7-LP-001..007`; missing, conditional, rejected, expired, revoked, wrong-root or unauthorized N/A member keeps bundle blocked and cannot count `1/1`. | `CANDIDATE-REMEDIATED; INDEPENDENT-REVIEW-PENDING` | `MISSING` | `0` | `D02-A6-IHR-F004` |
| `D02A7-CR-005` | `D02-A6-IHR-F005` | `P2` | Subject 1.1.8–1.1.9; 1.9.1–1.9.7; 1.14.5; 1.15.2; 1.13 row F005 | PUBLIC requirement derives from Tal directive in D18-A2 exact root; no-mutation and unperformed live readback are separate states. | Exact D18-A2 root/directive yields PUBLIC authority binding; wrong root or lower-authority conflict blocks; PRIVATE/UNKNOWN cannot pass; absence of Git mutation alone never supplies visibility proof. | `CANDIDATE-REMEDIATED; INDEPENDENT-REVIEW-PENDING` | `MISSING` | `0` | `D02-A6-IHR-F005` |

# 3. Deterministic cardinality and disposition

## 3.1 Crosswalk invariants

3.1.1 Source rows=`5`; closure rows=`5`; forward mapping cardinality=`1 per finding`; inverse mapping cardinality=`1 per closure record`; missing/duplicate/extra/merged rows=`0`.

3.1.2 Severity preservation=`4 P1 + 1 P2`; no finding is down-scored, waived, merged or represented as accepted.

3.1.3 Producer candidate-remediation coverage=`5/5`; independently accepted closure=`0/5`; independent closure roots present=`0/5`.

3.1.4 A proposed correction, QA PASS or crosswalk row cannot self-close its source finding. Only a new independent review of the exact immutable A7 roots may provide a disposition.

3.1.5 Crosswalk failure terminal=`D02-A7-CLOSURE-CROSSWALK-BLOCKED`; it yields no D02, Gate29, runtime or implementation credit.

## 3.2 Safe state

3.2.1 `A7 self-acceptance=0/1`; `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository visibility=`PUBLIC` under Tal directive/D18-A2 exact-root authority proof.

3.2.2 No Product, Build, runtime, provider/account, Git/GitHub, visibility, Push, Release, deployment or production authority is granted.
