# 1. Connect — D02-A7 independent hostile review Findings Manifest

## 1.1 Identity and denominator

1.1.1 `manifestId=CONNECT-D02-A7-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30-R1`.

1.1.2 Reviewed Subject root=`f1246bc52124a59645a2446d4c83075358c9f6214f84bc6ee7e7ce6b8208b446`; crosswalk root=`3f2b6689b638453872c019b96ed451a6096d3d771935d73dde82ff116b3b3cbc`; Producer-QA root=`4ef56a1332504d04fad5176eba41a4dc40ae5a82f611e8208e0e51ff6cb8a21e`.

1.1.3 Exact non-merged Finding denominator=`7`; IDs=`D02-A7-IHR-F001`–`D02-A7-IHR-F007`; holes/duplicates=`0`.

1.1.4 Severity denominator=`0 P0+6 P1+1 P2+0 P3`; state denominator=`7 OPEN+0 CLOSED`.

1.1.5 This manifest grants no closure, waiver, merge, risk acceptance, D02 acceptance, runtime authority, Gate29 authority or implementation permission.

# 2. Atomic Findings

## 2.1 Complete one-to-one manifest

| Finding ID | Severity | State | Exact evidence | Defect | Failure/attack | Required remediation | Independent closure predicate | noMergeKey |
|---|---:|---|---|---|---|---|---|---|
| `D02-A7-IHR-F001` | `P1` | `OPEN` | Subject 1.1.3–1.1.7, 1.3.1–1.3.8, 1.5.4; `researched-decision-approval` 3.2; D02-A4 2.1–2.4 and 4.1; A5 1.7 | A7's total predecessor registry begins at A5/A6 and does not disposition the earlier authoritative D02 chain or the Luna-first/Terra-first conflict. | A reader may select the lower-cost Luna-first decision while another selects the later Terra engineering recommendation; both can claim current authority because exact supersession authority is absent. | Add every authority/predecessor root and exact clause universe; give every clause one disposition; resolve the model-order conflict through an admitted authority receipt with scope, expiry and revocation. | Two independent readers derive the identical complete authority chain, model policy and approver set; removing or reordering any predecessor blocks; unresolved conflicts=`0`. | `D02-A7-IHR-F001` |
| `D02-A7-IHR-F002` | `P1` | `OPEN` | Subject 1.2, 1.3, 1.4, 1.6–1.11, 1.15.4; crosswalk closure predicates; QA Q04–Q15 | Root inputs, schemas and registries are prose tables; no canonical instances, field types, executable dependency graph, mutation corpus or two independent readers exist. | Two builders can map the same prose to different JSON while both compute valid JCS roots; six advertised producer vectors cannot prove every single-member mutation or the source Findings' two-reader predicates. | Materialize typed machine registries, schemas, exact root instances, DAG, full mutation corpus and two independently implemented read-only readers; keep expected outputs outside actual evaluators. | Readers independently reproduce all roots/counters and one terminal per vector; schema/reference/dangling/cycle/expected-to-actual counts=`0`; one-byte and single-member mutations block. | `D02-A7-IHR-F002` |
| `D02-A7-IHR-F003` | `P1` | `OPEN` | Subject 1.7.1–1.7.7 row `D02A7-AR-006`; QA Q09 | One account row merges provider rate/spend evidence with a Finance-owned local budget under a single source/version/authority/freshness record. | A fresh provider limit plus stale/unapproved local budget, or the inverse, can be represented as one present row without independently proving both authorities and time cuts. | Split the row or define exact independently rooted child members with separate source, issuer, scope, timestamps, freshness, revocation and an all-of parent. | Mutating/deleting/staling either child alone prevents the account aggregate; independent readers derive identical child and parent denominators and no child can satisfy another. | `D02-A7-IHR-F003` |
| `D02-A7-IHR-F004` | `P1` | `OPEN` | Subject 1.1.8–1.1.9 and 1.9.1–1.9.7; QA Q12–Q13 | PUBLIC proof requires a “current A7 commissioning directive” with no durable source ID, root, locator, custody or cut. | A package-only reader cannot reconstruct the conjunct; a producer can substitute paraphrased conversation context or omit it while claiming the D18-A2 root is sufficient. | Use D18-A2 exact root as the canonical admitted authority or materialize a separate current directive record before requiring it; keep live GitHub visibility independent. | Package-only readers produce the same PUBLIC authority result; wrong/missing directive root blocks; no-mutation and live readback never substitute for authority. | `D02-A7-IHR-F004` |
| `D02-A7-IHR-F005` | `P1` | `OPEN` | Subject 1.5.3, 1.6 row AIP-006; official OpenAI Deprecations 2026-06-03 reusable-prompts entry | `prompt/template/version root` does not say application-owned and does not disable deprecated OpenAI reusable prompt objects or `/v1/prompts`. | A provider prompt object can be admitted under the broad phrase and then become read-only/unavailable at shutdown, changing behavior and evidence outside the declared profile. | Bind prompt bytes/version to Connect-owned application artifacts; explicitly set provider reusable prompt objects and `/v1/prompts` OFF; add the deprecation to source/lifecycle invalidation. | Provider-prompt-object present/unknown/deprecated states block; application-owned exact prompt bytes reproduce; shutdown/source mutation invalidates descendants. | `D02-A7-IHR-F005` |
| `D02-A7-IHR-F006` | `P1` | `OPEN` | Subject 1.10.6–1.10.9, 1.14.2–1.14.7; Public/Cyber v4 D02 absent input | A7 lacks typed separation and cross-program DAG for planning-contract acceptance, operational profile admission, Gate29/freeze authority and runtime permit. | D02 planning acceptance can be confused with AI admission, or AI admission can depend on Gate29 while Gate29/Public depend back on D02, creating an authority cycle or permanent block. | Define three disjoint roots and sole producers; type every inter-program edge; prove an acyclic order and prohibit substitution between planning, admission and runtime permits. | Two graph builders derive the same DAG with cycles=`0`; substituting any root class fails; planning acceptance can exist with AI OFF and cannot authorize runtime. | `D02-A7-IHR-F006` |
| `D02-A7-IHR-F007` | `P2` | `OPEN` | Subject 1.1.10, 1.5.1–1.5.5; QA Q11 | The official-source observation cut contains URLs and summaries but no detached capture/retrieval/freshness receipts that reproduce the exact cut. | A later page change can make A7's prior observation impossible to distinguish from a new observation; reopening a page is not proof of the old bytes. | Create disclosure-safe detached receipts with URL, authority, capture time, observation digest/commitment, freshness, change detector and conflict terminal; do not publish restricted bytes. | Two readers reproduce the source member/cut root or return typed stale/unavailable; page change invalidates source descendants; Program acceptance remains separate. | `D02-A7-IHR-F007` |

# 3. Counts, verdict and safe state

## 3.1 Deterministic disposition

3.1.1 Findings=`7`; severity=`P0 0+P1 6+P2 1+P3 0`; states=`OPEN 7+CLOSED 0`; accepted/waived/merged=`0`.

3.1.2 `reviewVerdict=REJECT-D02-A7-SEMANTIC-AND-EXECUTABLE-SUCCESSOR-REQUIRED`.

3.1.3 Required response to every unresolved P1=`NEW-IMMUTABLE-D02-A8-SUCCESSOR`; Producer QA or this review cannot self-close it.

3.1.4 A7 proposed closure=`5/5`; independently accepted A6 closure=`0/5`; A7 acceptance=`0/1`.

3.1.5 `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository=`PUBLIC`; Product/Git/GitHub/provider/deployment mutations=`0`.
