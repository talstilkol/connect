# 1. Connect — ביקורת עוינת עצמאית על D02-A7

## 1.1 זהות, קלט קפוא וגבול סמכות

1.1.1 `reviewId=CONNECT-D02-A7-INDEPENDENT-HOSTILE-REVIEW-2026-08-30-R1`.

1.1.2 Subject=`docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-semantic-successor-2026-08-30.md`; SHA-256=`f1246bc52124a59645a2446d4c83075358c9f6214f84bc6ee7e7ce6b8208b446`; physical identity=`360 lines/4042 words/36482 bytes`.

1.1.3 Closure crosswalk=`docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-finding-closure-crosswalk-2026-08-30.md`; SHA-256=`3f2b6689b638453872c019b96ed451a6096d3d771935d73dde82ff116b3b3cbc`; physical identity=`47 lines/540 words/5195 bytes`.

1.1.4 Producer QA=`docs/planning/d02-a7-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md`; SHA-256=`4ef56a1332504d04fad5176eba41a4dc40ae5a82f611e8208e0e51ff6cb8a21e`; physical identity=`82 lines/743 words/7204 bytes`.

1.1.5 Frozen input roots were recomputed after producer freeze; all three match clauses 1.1.2–1.1.4. This review changed none of them.

1.1.6 Reviewer did not author D02-A7. Review authority is limited to independent planning analysis; it cannot close its own Findings, approve AI, lift the freeze, issue Gate29, mutate Git/GitHub, or operate an OpenAI account.

1.1.7 Repository invariant=`PUBLIC`; Public is a visibility requirement, not a Push, Release, Deployment, license, disclosure or readiness authorization.

1.1.8 Product code, Build, runtime tests, provider/account actions, Git/GitHub mutations, deployment and release performed by this review=`0`.

## 1.2 Method and severity

1.2.1 Method=`frozen-root verification + full Subject/crosswalk/QA reading + predecessor conflict tracing + official OpenAI source refresh + root/DAG/all-of/mutation reasoning + safe-state audit`.

1.2.2 `P0` means a currently reachable authority or execution bypass. `P1` means a material ambiguity or missing executable contract that can permit contradictory future admission or prevents deterministic closure. `P2` means a non-authorizing reproducibility/evidence defect. `P3` is editorial only.

1.2.3 No P0 is recorded because all live A7 acceptance, account, Legal, approval, Eval, Gate29 and runtime counters remain zero or missing. This safe current state does not convert P1 defects into acceptance.

1.2.4 Exact Finding universe=`D02-A7-IHR-F001`–`D02-A7-IHR-F007`; count=`7=0 P0+6 P1+1 P2+0 P3`; status=`OPEN` for all; accepted/closed/waived/merged=`0/7`.

# 2. Verdict

## 2.1 Overall result

2.1.1 `verdict=REJECT-D02-A7-SEMANTIC-AND-EXECUTABLE-SUCCESSOR-REQUIRED`.

2.1.2 A7 materially improves A6 and preserves the safe runtime state, but it does not yet provide one deterministic, executable and authority-complete admission contract.

2.1.3 Producer candidate remediation for the five A6 Findings remains a proposal=`5/5`; independently accepted closure remains=`0/5` because the closure predicates are not executable from the frozen A7 package.

2.1.4 Current state remains `A7 acceptance=0/1; AI runtime=OFF; Gate18.1=BLOCKED; Gate18.2=BLOCKED when Knowledge applies; Gate29=BLOCKED; development freeze=ACTIVE; repository=PUBLIC`.

2.1.5 Every P1 requires a new immutable successor. Editing A7 or this review in place cannot close a Finding.

# 3. Official OpenAI source refresh

## 3.1 Exact source set and observations

3.1.1 All eleven A7 official sources were reopened on `2026-08-30` from `developers.openai.com`; source observation is not Program source admission and accepted source roots remain=`0/11`.

| source ID | official page | independent observation used by this review |
|---|---|---|
| `OPENAI-DATA-CONTROLS` | [Data controls](https://developers.openai.com/api/docs/guides/your-data) | Responses retention, default abuse monitoring, ZDR/MAM, prompt-cache and regional exceptions remain distinct |
| `OPENAI-RESPONSES-CREATE` | [Responses create](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) | `store`, tools and GPT-5.6 prompt-cache options remain request/profile dimensions |
| `OPENAI-FUNCTION-CALLING` | [Function calling](https://developers.openai.com/api/docs/guides/function-calling) | tool availability does not grant business authority |
| `OPENAI-MCP-CONNECTORS` | [MCP and connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) | external tools can be automatic or approval-gated and introduce third-party authority/data paths |
| `OPENAI-SAFETY-BEST-PRACTICES` | [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices) | moderation, adversarial testing and human review remain independent controls |
| `OPENAI-RED-TEAMING` | [Red teaming](https://developers.openai.com/api/docs/guides/red-teaming) | adversarial testing complements quality Evals and does not replace them |
| `OPENAI-RBAC` | [RBAC](https://developers.openai.com/api/docs/guides/rbac) | Organization and Project roles/permissions are separate live account facts |
| `OPENAI-EVALUATION-BEST-PRACTICES` | [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | application-specific Evals need representative cases and calibrated human judgment |
| `OPENAI-DEPRECATIONS` | [Deprecations](https://developers.openai.com/api/docs/deprecations) | hosted Evals and reusable prompt objects both have 2026 shutdown schedules |
| `OPENAI-MODEL-CATALOG` | [Models](https://developers.openai.com/api/docs/models) | Terra remains positioned for balance; this does not establish Connect fitness or immutable snapshot identity |
| `OPENAI-RETRIEVE-MODEL` | [Retrieve model](https://developers.openai.com/api/reference/typescript/resources/models/methods/retrieve) | model readback supplies basic identity/ownership/shutdown fields, not proof of Connect quality or immutable behavior |

3.1.2 The data-control page still separates `store=false`, default abuse-monitoring retention, ZDR/MAM approval, application state, prompt-cache state, Safety/Eyes-Off exceptions, third-party retention and residency. A7 correctly keeps these dimensions non-aliased and blocks on unknown cache state.

3.1.3 The deprecations page confirms hosted Evals become read-only on `2026-10-31` and their dashboard/API is scheduled to shut down on `2026-11-30`. A7 correctly keeps hosted Evals OFF.

3.1.4 The same deprecations page also schedules reusable prompt objects and `/v1/prompts` for shutdown on `2026-11-30`. A7 does not disposition that directly relevant fact while its AiProfile uses the ambiguous phrase `prompt/template/version root`; this is Finding `D02-A7-IHR-F005`.

3.1.5 Current source-page bytes were not admitted or frozen as Program sources. Therefore this review grants source-verification observation credit only, never operational or acceptance credit.

# 4. Five predecessor-Finding remediation checks

## 4.1 A6 Finding F001 — predecessor and six approvals

4.1.1 A7 declares `A5 50=5+45`, `A6 213=23+190` and six explicit approval domains including WhatsApp/Meta Policy. Deleting an approval row is specified as blocking.

4.1.2 The direct A6 conflict is visibly corrected, but the authoritative D02 chain predates A5: user D02, `researched-decision-approval`, D02-A4, A5 and A6 contain a known Luna-first versus Terra-first conflict. A7 does not enumerate or disposition the earlier authority chain. Finding=`D02-A7-IHR-F001`.

4.1.3 Because the A7 package contains prose tables rather than canonical typed registries and two independent readers, the claimed predecessor totals and approval denominator cannot satisfy the source Finding's independent-reader closure predicate. Finding=`D02-A7-IHR-F002`.

## 4.2 A6 Finding F002 — complete admission identity

4.2.1 The seventeen AiProfile rows cover runtime, endpoint/request, model, prompt/context, output, tools, side effects, account, data control/cache/residency, policy, Eval and provider-source dimensions. Missing members keep AiProfileRoot absent.

4.2.2 The detached root order avoids the obvious Eval-result self-cycle: configuration enters AiProfile; results bind AdmissionSubjectRoot; approvals bind AdmissionCandidateRoot.

4.2.3 However the records supplied to `ROOT-V1` have no machine-readable schemas, field types, canonical JSON instances, sole producers or executable root constructors. JCS cannot remove semantic ambiguity from prose. Two implementations can build different records from the same table while claiming conformance. This is also Finding=`D02-A7-IHR-F002`.

4.2.4 The final root mixes three distinct authority generations—planning contract acceptance, operational AI-profile admission and runtime/global Gate29 authorization—without a typed cross-program DAG. This can form a dependency cycle with Public/Cyber and Gate29 and is Finding=`D02-A7-IHR-F006`.

## 4.3 A6 Finding F003 — nine account readbacks

4.3.1 A7 names nine rows and supplies common freshness, TTL, Organization/Project/environment, duplicate and all-of rules. Missing or stale rows remain non-success.

4.3.2 `D02A7-AR-006` combines provider rate/spend evidence and a Finance-approved local Connect budget under one record whose schema has one source/version/authority/freshness set. These are independently governed facts and may change on different clocks. Inner-field presence does not prove both child authorities. Finding=`D02-A7-IHR-F003`.

4.3.3 The absence of executable registries/readers also prevents independent `9/9` reconstruction and mutation tests. This is covered once by `D02-A7-IHR-F002`; it is not duplicated.

## 4.4 A6 Finding F004 — Legal/Privacy all-of bundle

4.4.1 Seven explicit Legal/Privacy domains, authorized non-applicability, same-subject binding, all-of, expiry/revocation and no-cherry-pick rules correct the untyped A6 `0/1` bundle at prose level.

4.4.2 Current members=`0/7`; therefore no partial DPA or generic counsel note receives credit.

4.4.3 Independent deletion/replay/cherry-pick execution is not possible from the prose package and remains within `D02-A7-IHR-F002`.

## 4.5 A6 Finding F005 — PUBLIC proof

4.5.1 A7 correctly binds the Public requirement to D18-A2 raw root `448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9` and separates it from `NO-GIT-GITHUB-MUTATION-AUTHORITY`.

4.5.2 The proof predicate additionally requires “the current A7 commissioning directive” but provides no durable source ID, bytes, root, locator, custody record or observation cut for that conjunct. A verifier using only the frozen package cannot reconstruct it. Finding=`D02-A7-IHR-F004`.

4.5.3 Live GitHub readback remains explicitly NOT-RUN. This is honest and grants no operational visibility or Push credit.

# 5. New semantic and lifecycle findings

## 5.1 Prompt ownership and deprecation

5.1.1 AIP-006 names a `prompt/template/version root` without stating whether it is application-owned content or an OpenAI reusable prompt object.

5.1.2 Current official deprecations schedule `/v1/prompts` and reusable prompt objects for shutdown. A provider object can therefore enter the declared profile while still matching the phrase. Finding=`D02-A7-IHR-F005`.

## 5.2 Planning, admission, Gate29 and runtime layers

5.2.1 Section 1.10 places `IndependentA7ReviewDispositionRoot`, `Gate29CurrentPermitRoot` and `FreezeLiftAuthorityRoot` inside AdmissionRoot. Section 1.14 also says source/account/Eval work starts after a freeze lift and only later reads Gate29.

5.2.2 Public/Cyber currently lists D02 as an absent authority input while Gate29 depends on foundational controls. Without explicit edge types, planning acceptance can be mistaken for runtime admission, or runtime admission can be made to depend on a Gate that depends back on D02. Finding=`D02-A7-IHR-F006`.

## 5.3 Source custody and reproducibility

5.3.1 A7 stores URLs and high-level observations but no accepted captured bytes, per-source digest, retrieval receipt, freshness window or conflict disposition. It correctly reports Program acceptance=`0/11`.

5.3.2 Producer QA nevertheless labels the source register `PASS-AS-UNACCEPTED-PRODUCER-OBSERVATION`. Reopening pages today supports the current facts, but a future reviewer cannot reproduce the exact A7 research cut from A7 bytes alone. Finding=`D02-A7-IHR-F007`.

# 6. Exact Findings and required successor

## 6.1 Finding summary

| Finding | Severity | Short title | State |
|---|---:|---|---|
| `D02-A7-IHR-F001` | `P1` | authoritative D02 predecessor chain and Luna/Terra conflict are not totally dispositioned | `OPEN` |
| `D02-A7-IHR-F002` | `P1` | prose-only roots cannot execute the independent-reader closure predicates | `OPEN` |
| `D02-A7-IHR-F003` | `P1` | provider limits and Finance budget are merged under one authority/freshness record | `OPEN` |
| `D02-A7-IHR-F004` | `P1` | PUBLIC predicate contains an unrooted current-directive conjunct | `OPEN` |
| `D02-A7-IHR-F005` | `P1` | prompt identity is ambiguous despite reusable-prompt deprecation | `OPEN` |
| `D02-A7-IHR-F006` | `P1` | planning acceptance, profile admission, Gate29 and runtime permission lack a typed acyclic separation | `OPEN` |
| `D02-A7-IHR-F007` | `P2` | official-source observation cut is not independently reproducible from frozen receipts | `OPEN` |

## 6.2 Required D02-A8 shape

6.2.1 Freeze one complete authority/predecessor registry spanning the user D02 directive, researched decision, D02-A4, A5, A6, A7 review inputs and every exact clause disposition; resolve Luna/Terra by an admitted authority record rather than implicit document age.

6.2.2 Materialize canonical typed JSON registries, schemas, root instances, dependency DAG, mutation corpus and two independently implemented read-only readers. Expected results must not enter actual evaluator logic.

6.2.3 Give every composite account row independently rooted child records with source, authority, time, freshness and all-of semantics, or split the canonical denominator and update every counter atomically.

6.2.4 Bind PUBLIC only to a durable admitted directive root. If a current reaffirmation is required, materialize its source record before it becomes a conjunct; live provider visibility remains a distinct readback.

6.2.5 Define prompts as Connect-owned application bytes and explicitly set OpenAI reusable prompts and `/v1/prompts` to OFF. Any later provider prompt-object use requires a new source and admission generation.

6.2.6 Separate `D02PlanningContractAcceptanceRoot`, `AiProfileAdmissionRoot` and `AiRuntimePermitRoot`; publish a typed cross-program DAG proving no cycle with Gate29, Public/Cyber, freeze lift or runtime Evidence.

6.2.7 Create detached official-source receipts with URL, authority, captured observation, retrieval cut, freshness, content root or permitted commitment, change detection and conflict terminal. Do not publish copyrighted or sensitive bytes merely to obtain a hash.

# 7. Final safe state

## 7.1 Immutable handoff

7.1.1 Exact Findings=`7`; `P0=0`; `P1=6`; `P2=1`; `P3=0`; open=`7`; closed/accepted/waived/merged=`0`.

7.1.2 `reviewVerdict=REJECT-D02-A7-SEMANTIC-AND-EXECUTABLE-SUCCESSOR-REQUIRED`.

7.1.3 A7 candidate remediation=`5/5 proposed`; independently accepted A6 closures=`0/5`; A7 acceptance=`0/1`.

7.1.4 `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository=`PUBLIC`; runtime permit=`ABSENT`.

7.1.5 Required next action=`build immutable D02-A8 against these seven one-to-one Findings, run detached Producer QA, then obtain a fresh independent hostile review of exact frozen roots`.
