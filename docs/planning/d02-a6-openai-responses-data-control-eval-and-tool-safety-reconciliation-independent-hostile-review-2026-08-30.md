# 1. Connect — Independent hostile review of D02-A6 OpenAI Responses, data-control, Eval and tool-safety reconciliation

## 1.1 Identity, frozen inputs and boundary

1.1.1 `artifactId=CONNECT-D02-A6-INDEPENDENT-HOSTILE-REVIEW-2026-08-30-R1`.

1.1.2 `reviewClass=INDEPENDENT-HOSTILE-SEMANTIC-AND-SOURCE-REVIEW; NOT-PRODUCER-QA; NOT-IMPLEMENTATION; NOT-ACCEPTANCE`.

1.1.3 Frozen Subject=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-2026-08-30.md`.

1.1.4 Frozen Subject root=`sha256:3788b73457a3bb25a679dc42875b641a21156f3b93e3b29676a3489e826ad3db`; extent=`465 lines; 3493 words; 30592 bytes`.

1.1.5 Frozen Producer QA=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md`.

1.1.6 Frozen Producer QA root=`sha256:1e9a19ad93b451db36c371319789543f1f85e52c287a454936ecfe04dd6b04ba`; extent=`71 lines; 518 words; 4541 bytes`.

1.1.7 Frozen predecessor read for supersession analysis=`docs/planning/d02-a5-openai-responses-data-control-and-model-selection-reconciliation-2026-08-29.md`; root=`sha256:1981729d8a0001d38f439508cdf668cbbd18b8bda0c70cde2152e19ff93281e5`; extent=`115 lines; 1134 words; 9302 bytes`.

1.1.8 The commissioned roots in 1.1.4 and 1.1.6 matched before review and again before materialization. Any byte change creates a different input and makes this review stale for that different root.

1.1.9 Reviewer independence=`PASS`: the reviewer did not produce D02-A6 or its Producer QA and did not edit either frozen input.

1.1.10 Official-source refresh cut=`2026-08-30T00:18:38Z`; all eleven registered pages were retrieved from `developers.openai.com` no later than this cut. They are dynamic provider pages, not immutable source snapshots.

1.1.11 Review authority was limited to read-only inspection of the Subject, Producer QA, predecessor and the eleven registered official OpenAI pages.

1.1.12 No API key, provider account, customer content, credential, Product code, Build, runtime, Git/GitHub operation, deployment, provider mutation, purchase or external communication was used or changed.

1.1.13 Publication rule=`repository-relative logical paths only; no workstation locator in artifact content; no secret, credential value, PII, unverified person or approval represented as fact`.

## 1.2 Method and severity

1.2.1 The review read all 213 numbered Subject clauses, all Producer-QA clauses and all D02-A5 clauses, then compared provider claims, local normative rules, predecessor inheritance, admission identities, denominator membership and safe-state propagation.

1.2.2 Source verification distinguishes `CURRENT-OFFICIAL-OBSERVATION` from Program admission. A currently matching provider page contributes no accepted-source credit because the Subject ledger remains `0/11`.

1.2.3 `P0` means a presently reachable authority, mutation or success bypass despite the declared safe state. `P1` means a material identity, denominator, inheritance or gate ambiguity that prevents deterministic future admission. `P2` means a lower-impact evidence or QA overclaim. No risk acceptance is granted.

1.2.4 Findings are recorded once each in `docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-findings-manifest-2026-08-30.md`.

1.2.5 This reviewer does not close, accept, waive, merge or remediate any finding.

# 2. Outcome first

## 2.1 Verdict

2.1.1 `verdict=REJECT-D02-A6-SEMANTIC-SUCCESSOR-REQUIRED`.

2.1.2 Official-source accuracy is materially strong: all eleven registered current pages support the provider observations attributed to them, including the hosted-Evals lifecycle dates, Responses retention exceptions, cache/residency limits, model positioning and tool-safety guidance.

2.1.3 The rejection is caused by five independent internal findings: an unresolved predecessor approver denominator, an incomplete admission identity, two non-enumerated acceptance bundles and an unsupported Producer-QA assertion of the PUBLIC invariant.

2.1.4 Exact finding set=`D02-A6-IHR-F001`–`D02-A6-IHR-F005`; total=`5 = 0 P0 + 4 P1 + 1 P2`; status=`OPEN` for every finding; accepted/closed/waived=`0/5`.

2.1.5 Under Subject clause 1.18.5, the four P1 findings require a new successor. This review cannot convert proposed remediation into closure evidence.

2.1.6 Current safe state remains `D02-A6 Program acceptance=0/1; official-source admission=0/11; AI runtime=OFF; Gate18.1=BLOCKED; Gate18.2=BLOCKED when Knowledge is in scope; Gate29=BLOCKED; development freeze=ACTIVE; repository visibility=PUBLIC`.

2.1.7 No negative, missing, unknown, stale or contradictory state is converted into success or acceptance by this review.

# 3. Eleven-source current official verification

## 3.1 Complete source matrix

| source ID | current official page | independent observation at the cut | result |
|---|---|---|---|
| `OPENAI-DATA-CONTROLS` | [Data controls](https://developers.openai.com/api/docs/guides/your-data) | API training remains opt-in; default abuse-monitoring retention is up to 30 days; ZDR/MAM need approval; Responses default/application-state, Background polling, cache, CSAM, container, third-party and residency exceptions are separately documented. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-RESPONSES-CREATE` | [Create a response](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) | The reference exposes `store`, `background`, state fields, typed tools, tool choice, parallel-call control, cache options, reasoning controls and response identity fields. Exposure proves neither Connect authority nor fitness. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-FUNCTION-CALLING` | [Function calling](https://developers.openai.com/api/docs/guides/function-calling) | Strict schemas are recommended; required/closed shapes and parallel-call control are documented; schema validity is not business authorization. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-MCP-CONNECTORS` | [MCP and connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) | Approval defaults, tool narrowing, prompt-injection risk and third-party data handling are documented. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-SAFETY-BEST-PRACTICES` | [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices) | Moderation, adversarial testing, constrained inputs/outputs, human review and communicating limitations are recommended. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-RED-TEAMING` | [Red teaming](https://developers.openai.com/api/docs/guides/red-teaming) | Red teaming complements evaluation, and submitted code/assets must be owned or expressly authorized. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-RBAC` | [RBAC](https://developers.openai.com/api/docs/guides/rbac) | Organization and Project roles, combined role effects and least-privilege separation are documented; the page does not prove Connect assignments. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-EVALUATION-BEST-PRACTICES` | [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Task-specific and representative evaluation, production/historical evidence, continuous evaluation and human calibration are recommended. The Subject's prohibition on synthetic business-quality evidence is a stricter local rule, not a claim attributed to OpenAI. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-DEPRECATIONS` | [Deprecations](https://developers.openai.com/api/docs/deprecations) | Hosted Evals deprecation was announced `2026-06-03`; existing Evals become read-only `2026-10-31`; the dashboard and API shut down `2026-11-30`; Promptfoo is linked as a migration path only. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-MODEL-CATALOG` | [Models](https://developers.openai.com/api/docs/models) | Current catalog positioning matches Terra=`balance`, Luna=`cost-sensitive/high-volume`, Sol=`complex/flagship`; IDs, prices, limits and availability remain dynamic provider facts. | `SUPPORTED-CURRENT; UNACCEPTED` |
| `OPENAI-RETRIEVE-MODEL` | [Retrieve model](https://developers.openai.com/api/reference/typescript/resources/models/methods/retrieve) | The readback surface includes model ID, creation time, owner and optional shutdown date; it does not establish behavioral immutability, snapshot equivalence, entitlement or Connect fitness. | `SUPPORTED-CURRENT; UNACCEPTED` |

3.1.1 Source retrieval count=`11/11`; HTTP/page-content verification failures=`0/11`; Program source acceptance remains `0/11`.

3.1.2 No third-party page was used as OpenAI product authority. The official Promptfoo link was not treated as dependency, security, privacy, licensing or installation approval.

3.1.3 No long quotation, copied documentation section or provider example was reproduced. Copyright/source-overreach result=`PASS`.

## 3.2 Deprecation and predecessor fact correction

3.2.1 The three hosted-Evals dates in Subject clauses 1.2.1–1.2.2 exactly match the current deprecations page.

3.2.2 Hosted Evals, `/v1/evals`, hosted graders and dashboard remain OFF in the proposed Pilot; Promptfoo remains candidate-only. No deprecation-to-readiness conversion was found.

3.2.3 The correction of D02-A5 Background wording is source-supported: current documentation describes roughly ten minutes of disk state for polling, the MAM `store=false` deletion case and the EU Background limitation rather than the predecessor's blanket incompatibility sentence.

3.2.4 D02-A6 names D02-A5 clauses 1.2.6, 1.2.10, 1.4.1 and 1.4.4 as the targeted Background/hosted-Evals correction surface. A separate unresolved predecessor denominator is recorded as `D02-A6-IHR-F001`.

# 4. Topic-by-topic hostile audit

## 4.1 Retention, cache and residency

4.1.1 Subject clauses 1.3.1–1.3.6 correctly keep training use, abuse logs, application state, Background polling state, prompt-cache state, CSAM exception, container state, third-party retention, regional storage and regional processing as separate dimensions.

4.1.2 `store=false` is correctly treated as a request property rather than proof of ZDR/MAM, residency or local deletion.

4.1.3 The current data-controls page supports the Subject's 30-day default/application-state warning, ZDR forcing `store=false`, Background polling interval, non-ZDR extended caching, 24-hour maximum cache-state warning, EU Background limitation and non-US Modified Retention requirement.

4.1.4 The proposed request omits cache keys/options but does not claim that omission disables provider caching. Its cache state remains `UNVERIFIED-BLOCKING`; result=`PASS-SAFE-BLOCK`.

4.1.5 The Pilot keeps Background, media, hosted state stores, hosted tools, server-side compaction and third-party MCP OFF. No current retention claim authorizes runtime activation.

4.1.6 The exact runtime/account/data-control dimensions are not all members of the immutable admission identity. That separate root-binding defect is `D02-A6-IHR-F002`.

## 4.2 Model and snapshot claims

4.2.1 `gpt-5.6-terra` is a current official model ID and its balance positioning is supported. Luna and Sol are correctly dormant candidates rather than accepted fallbacks.

4.2.2 The Subject does not claim that the model ID is an immutable behavioral snapshot. Exact supported snapshot inventory is explicitly `unknown/unavailable`; moving aliases, automatic fallback and silent substitution are forbidden.

4.2.3 Retrieve-model fields are correctly limited to identity/owner/creation/shutdown metadata and are not promoted to behavioral proof.

4.2.4 Model acceptance, account entitlement, regional support, reasoning effort, rate limits, prices and spend limits remain unverified and contribute zero readiness credit.

## 4.3 Tool authority

4.3.1 Initial Pilot tool set=`EMPTY`; all hosted and remote tools are OFF; model output is draft-only; all external side effects are forbidden. Present tool-authority leakage=`not observed`.

4.3.2 Future-tool clauses correctly separate strict schema validation from authentication, authorization, Tenant ownership, consent, retention, Legal Hold, replay control and specific single-use human approval.

4.3.3 Provider allowed-tool narrowing is correctly treated as defense in depth, while the Connect server allowlist remains authoritative.

4.3.4 A future exact tool-set root is not included in the immutable `AiProfile`/Eval-admission identity, so a tool-set change is not mechanically guaranteed to create a distinct admission root. This is part of `D02-A6-IHR-F002` and remains open despite the current empty set.

## 4.4 Evaluation corpus and runner

4.4.1 Hosted Evals are not a dependency. The planned runner, evidence store, case identity and gate contract are Connect-owned and provider-neutral.

4.4.2 Quality/readiness evidence is restricted to authorized, minimized and redacted real records after Privacy/Legal/Data-owner approval. Mock, fake, demo, sample and synthetic business records receive zero quality/readiness/release credit.

4.4.3 Deterministic hostile literals are limited to named security boundaries, must be labeled as normative security vectors and cannot count as customer data or product-quality coverage.

4.4.4 Case provenance, split separation, human calibration, hard safety floors, subgroup reporting, retry preservation and immutable Run roots are required. Exact thresholds remain `unknown/unavailable`; corpus, security suite and runner acceptance remain zero.

4.4.5 Because the corpus, split rules, grader contracts, thresholds and runner are not accepted, no evaluation success or model promotion is reachable from this artifact. Result=`PASS-SAFE-BLOCK; NO-ACCEPTANCE`.

## 4.5 Legal, Privacy, account and ledger

4.5.1 Organization, Project, region, ZDR/MAM, Project retention override, Modified Retention amendment, DPA/subprocessors, model/snapshot inventory, rates/spend, regional capability, RBAC and training-sharing state remain `unknown/unavailable`.

4.5.2 The proposed legal/account stages and final multi-role review prevent these unknowns from becoming present-tense provider or compliance claims.

4.5.3 The `0/9` live-account denominator has no exact member registry or one-to-one mapping to the compound unknowns in section 1.7. This prevents independent recomputation and is `D02-A6-IHR-F003`.

4.5.4 The `0/1 complete set` Legal/Privacy/contract counter bundles multiple independently required dispositions without an exact membership/root contract and is `D02-A6-IHR-F004`.

4.5.5 Every printed ledger numerator is zero and no negative-to-success conversion was found. The defect is denominator determinism, not a claim that any receipt currently exists.

## 4.6 Predecessor inheritance and supersession

4.6.1 D02-A5 remains an immutable historical input and D02-A6 does not edit or erase it.

4.6.2 The four explicitly named Background/hosted-Evals predecessor clauses are source-correctly displaced for those topics.

4.6.3 D02-A5 clause 1.7.2 still requires six approval domains including WhatsApp/Meta policy, while D02-A6 clauses 1.12.6, 1.16.12 and 1.17.4 specify five roles and do not supersede or disposition D02-A5 clause 1.7.2. Two readers can derive different mandatory sets. Finding=`D02-A6-IHR-F001`.

4.6.4 All other predecessor safeguards must remain fail-closed while F001 is unresolved. This review grants no inheritance-based acceptance.

## 4.7 Producer QA and mechanical checks

4.7.1 Independent recomputation confirmed the commissioned Subject and QA hashes/extents, 213 numbered Subject clause lines, no duplicate numbered clause ID and eleven registered official domains.

4.7.2 Producer-QA checks Q01–Q05, Q07, Q09–Q10, Q13 and the limited current-source observations are reproducible within their stated non-acceptance boundary.

4.7.3 Q06 does not detect the unresolved D02-A5 approver-set conflict; Q08 does not test complete admission-root membership; Q11 does not prove denominator membership. Their broad PASS wording cannot override findings F001–F004.

4.7.4 Q12 calls the public-repository invariant PASS, but absence of Git/GitHub mutation authority does not prove current visibility. The commissioned review boundary supplies `repository visibility=PUBLIC`; the frozen Subject/QA do not independently evidence it. Finding=`D02-A6-IHR-F005`.

4.7.5 Producer QA remains mechanical/source-consistency evidence only. It is not independent review or acceptance.

# 5. New independent findings

## 5.1 P1 findings

5.1.1 `D02-A6-IHR-F001` — unresolved predecessor approver denominator. D02-A5 requires six domains; D02-A6 counts five without an explicit disposition of the predecessor clause. Status=`OPEN`.

5.1.2 `D02-A6-IHR-F002` — incomplete immutable admission identity. Exact request, retention/account and tool-authority dimensions can vary without a guaranteed distinct AiProfile/Eval-admission root. Status=`OPEN`.

5.1.3 `D02-A6-IHR-F003` — live-account `0/9` denominator has no canonical member set. Status=`OPEN`.

5.1.4 `D02-A6-IHR-F004` — Legal/Privacy/contract `0/1 complete set` is an untyped aggregate that can hide partial disposition. Status=`OPEN`.

## 5.2 P2 finding

5.2.1 `D02-A6-IHR-F005` — Producer QA equates no repository mutation authority with proof of PUBLIC visibility. Status=`OPEN`.

# 6. Final disposition

## 6.1 Immutable handoff state

6.1.1 Findings total=`5`; `P0=0`; `P1=4`; `P2=1`; open=`5`; closed/accepted/waived=`0`.

6.1.2 Source observations verified=`11/11`; accepted Program sources=`0/11`.

6.1.3 `D02-A6 acceptance=0/1`; `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository visibility=`PUBLIC`.

6.1.4 Review verdict=`REJECT-D02-A6-SEMANTIC-SUCCESSOR-REQUIRED`.

6.1.5 Exact completion percentage, remaining hours and ETA=`unknown/unavailable`; no accepted task denominator or schedule was introduced.

6.1.6 Required next action=`produce a new immutable successor that resolves each P1 finding separately, then run detached Producer QA and a new independent hostile review against the new exact roots`.

6.1.7 This artifact and its manifest are review evidence only. They authorize no Product, Build, runtime, provider, account, Git/GitHub, visibility, deployment, release or production action.
