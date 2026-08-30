# 1. Connect — D02-A6 independent hostile review findings manifest

## 1.1 Identity and frozen scope

1.1.1 `artifactId=CONNECT-D02-A6-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30-R1`.

1.1.2 Review=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-2026-08-30.md`.

1.1.3 Frozen Subject=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-2026-08-30.md`; root=`sha256:3788b73457a3bb25a679dc42875b641a21156f3b93e3b29676a3489e826ad3db`.

1.1.4 Frozen Producer QA=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md`; root=`sha256:1e9a19ad93b451db36c371319789543f1f85e52c287a454936ecfe04dd6b04ba`.

1.1.5 Findings are independent records. `status=OPEN` is mandatory; this reviewer grants no closure, waiver, merge, acceptance or remediation credit.

1.1.6 `noMergeKey=findingId`; a successor must disposition and prove closure for every finding separately.

# 2. Atomic finding records

## 2.1 Complete manifest

| findingId | severity | status | exact evidence locator | defect | causal attack / impact | required successor correction | independent closure test | noMergeKey |
|---|---:|---|---|---|---|---|---|---|
| `D02-A6-IHR-F001` | `P1` | `OPEN` | D02-A5 1.7.2; Subject 1.2.7, 1.12.6, 1.16.12, 1.17.4; QA Q06/Q11 | Predecessor requires six approver domains including WhatsApp/Meta policy, but the successor counts five and neither supersedes nor preserves the sixth by an exact clause disposition. | Reader A applies the successor five-role denominator; reader B carries the unsuperseded six-role predecessor set. Acceptance membership and required receipts differ, so one interpretation can omit a policy authority still required by the other. | Add a total explicit disposition for D02-A5 1.7.2; define one canonical approver-member registry, exact domain IDs, applicability, minimum cardinality and same-root receipt binding. If a domain is not applicable, require a typed independently authorized non-applicability receipt rather than silent omission. | Two independent readers derive the identical approver set and cardinality; removal of any applicable member makes acceptance impossible; the predecessor/successor clause crosswalk has no unresolved or contradictory row. | `D02-A6-IHR-F001` |
| `D02-A6-IHR-F002` | `P1` | `OPEN` | Subject 1.4.1–1.4.11, 1.5.7–1.5.8, 1.6.11–1.6.12, 1.9.1–1.9.12, 1.10.3, 1.12.8; D02-A5 1.5.6; QA Q07/Q08 | The exact AiProfile/Eval-admission identity names model/snapshot/reasoning/token/schema/prompt/retrieval/safety/adapter roots but does not bind all request, account/data-control and tool-set members that determine retention and authority. | Keep every listed identity member constant, then change endpoint/background/store/cache mode, Organization/Project/region/retention control or exact tool set. The printed identity rule does not guarantee a distinct admission root, so an old accepted Run can be presented for materially different runtime semantics. | Define one canonical admission root that binds the complete Pilot request profile, effective authenticated account/Project data-control evidence, residency/cache/service-tier state, exact empty-or-versioned tool-set root and all existing AiProfile members. Bind legal receipts and Eval Runs to that same root; any member change must invalidate all prior runs and permits. | For every single-member mutation, two independent builders produce a different admission root and the prior Run returns `PROFILE-NOT-ADMITTED`; unchanged inputs reproduce the same root; tool-set/account/cache/endpoint omission and alias counts are zero. | `D02-A6-IHR-F002` |
| `D02-A6-IHR-F003` | `P1` | `OPEN` | Subject 1.7.1–1.7.14, 1.17.2; QA Q11 | `live account readbacks=0/9` has no exact nine-member registry. Section 1.7 contains compound fields and eleven unknown clauses, so grouping/exclusion is inferential. | A producer can group rate/spend/budget or Project/region differently, omit RBAC or training-sharing state, and still claim nine completed readbacks. The denominator cannot be independently recomputed. | Materialize nine exact member IDs with source surface, Organization/Project scope, expected type, capture time, freshness/expiry, redaction rule, required/conditional state and one-to-one counter membership. Keep legal/contract evidence in a separately typed manifest. | Two independent readers derive the same non-empty nine-member set and counter; every member has one fresh authenticated readback or a typed block; deleting or duplicating any member prevents `9/9` and never yields success. | `D02-A6-IHR-F003` |
| `D02-A6-IHR-F004` | `P1` | `OPEN` | Subject 1.7.5–1.7.6, 1.7.12, 1.16.2, 1.17.3; QA Q11 | `Legal/Privacy/contract dispositions=0/1 complete set` collapses processing, DPA, subprocessors, transfer/residency, retention, prohibited-data and amendment obligations into an untyped binary bundle. | A partial receipt can be labeled the one complete set, or a receipt for one Project/profile can be replayed for another because exact membership, scope, version, validity and same-admission-root binding are absent. | Define an atomic Legal/Privacy requirement manifest with every applicable member, governing provider/account/Project/profile/source roots, issuer authority, decision, constraints, effective/expiry/revocation state and aggregate rule. Missing, conditional, rejected, expired or scope-mismatched members must remain non-success. | Independent readers reconstruct identical member and applicability sets; all receipts bind the F002 admission root and current provider/subprocessor terms; any missing/stale/revoked/mismatched member keeps the aggregate blocked and cannot count as `1/1`. | `D02-A6-IHR-F004` |
| `D02-A6-IHR-F005` | `P2` | `OPEN` | Subject 1.1.9, 1.17.15; QA Q12 | Producer QA labels the public-repository invariant PASS solely because the Subject grants no Git/GitHub visibility mutation authority. Non-mutation is not evidence of current PUBLIC visibility. | A private or unknown repository also satisfies “no mutation occurred”; therefore the check can return PASS under a state that does not prove the commissioned PUBLIC invariant. | Rename the mechanical check to `NO-GIT-GITHUB-MUTATION-AUTHORITY`, or bind a detached authorized repository-visibility observation to the exact repository and observation cut. Never infer visibility from absence of a mutation instruction. | Evaluate PUBLIC, PRIVATE and UNKNOWN visibility observations: only a fresh exact PUBLIC readback may satisfy the visibility assertion; all three may independently satisfy the no-mutation check; no state transition or visibility mutation is authorized. | `D02-A6-IHR-F005` |

# 3. Cardinality, verdict and safe state

## 3.1 Deterministic counts

3.1.1 ID set=`D02-A6-IHR-F001`–`D02-A6-IHR-F005`; sequential; holes=`0`; duplicates=`0`.

3.1.2 Severity count=`P0 0 + P1 4 + P2 1 = 5`.

3.1.3 Status count=`OPEN 5; CLOSED 0; ACCEPTED 0; WAIVED 0; MERGED 0`.

3.1.4 Predecessor-finding closures asserted by this manifest=`0`; new-finding closures asserted=`0/5`.

## 3.2 Final disposition

3.2.1 `reviewVerdict=REJECT-D02-A6-SEMANTIC-SUCCESSOR-REQUIRED`.

3.2.2 Required response to any unresolved P1=`NEW-IMMUTABLE-SUCCESSOR-REQUIRED`; proposed text or Producer QA cannot self-close it.

3.2.3 `D02-A6 acceptance=0/1`; `official-source admission=0/11`; `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository visibility=`PUBLIC`.

3.2.4 No finding, remediation text or closure test grants Product, Build, runtime, provider, account, Git/GitHub, visibility, deployment, release or production authority.
