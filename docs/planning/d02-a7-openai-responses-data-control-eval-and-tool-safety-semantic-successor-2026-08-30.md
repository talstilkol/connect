# 1. Connect — D02-A7 OpenAI Responses, data-control, Eval and tool-safety semantic successor

## 1.1 Identity, frozen inputs, authority and scope

1.1.1 `decisionId=D02-A7`.

1.1.2 `artifactId=CONNECT-D02-A7-OPENAI-RESPONSES-DATA-CONTROL-EVAL-TOOL-SAFETY-SEMANTIC-SUCCESSOR-2026-08-30`.

1.1.3 direct predecessor=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-2026-08-30.md`; root=`sha256:3788b73457a3bb25a679dc42875b641a21156f3b93e3b29676a3489e826ad3db`; clause members=`213`.

1.1.4 older predecessor=`docs/planning/d02-a5-openai-responses-data-control-and-model-selection-reconciliation-2026-08-29.md`; root=`sha256:1981729d8a0001d38f439508cdf668cbbd18b8bda0c70cde2152e19ff93281e5`; clause members=`50`.

1.1.5 A6 Producer QA=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-producer-qa-2026-08-30.md`; root=`sha256:1e9a19ad93b451db36c371319789543f1f85e52c287a454936ecfe04dd6b04ba`.

1.1.6 A6 independent hostile review=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-2026-08-30.md`; root=`sha256:344c42bcdbf60eed1332bfaa7e20d9725e80cad5e0f2d05863c3cbef6ba5f16d`.

1.1.7 A6 finding manifest=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-independent-hostile-review-findings-manifest-2026-08-30.md`; root=`sha256:55f985944dae7684af73f3214e966650a3949ae52b1b28dc54ef198a886dceca`; exact finding universe=`D02-A6-IHR-F001`–`D02-A6-IHR-F005`.

1.1.8 Public-authority decision=`docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md`; exact root=`sha256:448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`; authority locator=`D18-A2:1.1.4–1.1.6`.

1.1.9 D18-A2 clause 1.1.4 preserves Tal's exact directive=`הערה: על המאגר להיות public`; the commissioning directive for A7 reaffirms `repository PUBLIC`.

1.1.10 research/source refresh cut=`2026-08-30T00:43:20Z`; official OpenAI documentation only; source authority is limited to the eleven entries in section 1.5.

1.1.11 scope=`planning semantics required to remediate exactly five A6 review findings`; no new AI capability, tool, endpoint, product feature, data class, provider, repository operation or deployment path is introduced.

1.1.12 predecessor artifacts are immutable inputs. A7 changes no A5/A6/QA/review/manifest byte and grants no retroactive closure.

1.1.13 current state=`CANDIDATE-SEMANTIC-SUCCESSOR; NOT-INDEPENDENTLY-REVIEWED; NOT-ACCEPTED; NOT-ACCOUNT-VERIFIED; NOT-LEGAL-APPROVED; NOT-EVALUATED; NOT-IMPLEMENTED; AI-OFF`.

1.1.14 fail-safe invariant=`missing, unknown, stale, expired, revoked, mismatched, contradictory or unaccepted member => no AdmissionRoot; PROFILE-NOT-ADMITTED; AI-OFF-HUMAN-ONLY`.

1.1.15 `A7 self-acceptance=0/1`; Producer QA is mechanical evidence only; independent hostile review is mandatory.

1.1.16 `Gate18.1=BLOCKED`; `Gate18.2=BLOCKED when Knowledge is in scope`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository visibility=`PUBLIC`, proved as an authority/directive state under section 1.9 rather than inferred from non-mutation.

1.1.17 No API key, provider account, customer content, Product code, Build, runtime, Git/GitHub operation, visibility mutation, deployment, purchase or provider mutation was used or changed.

1.1.18 Artifact paths are repository-relative logical paths. No workstation path, secret, credential value, PII or unverified approval is admitted.

## 1.2 Deterministic identity and detached-binding contract

1.2.1 deterministic identifier rule=`all IDs are literal versioned IDs declared in this artifact or content-derived SHA-256 roots; Math.random() and every random ID source are forbidden; crypto.randomUUID() is not authorized`.

1.2.2 `ROOT-V1(record,domain)=lowercase-hex(SHA-256(UTF8(domain + "\n" + JCS(record))))`, where JCS is RFC 8785 JSON canonicalization, strings are valid Unicode, member IDs are unique and arrays preserve their declared order.

1.2.3 Every root-bearing record declares `schemaVersion`, `recordType`, exact member IDs, exact member roots, applicability, state and domain tag. A missing required member prevents root materialization; it is not encoded as a successful empty value.

1.2.4 Accepted-root state universe=`CANDIDATE | ACCEPTED-CURRENT | BLOCKED-MISSING | BLOCKED-STALE | BLOCKED-EXPIRED | BLOCKED-REVOKED | BLOCKED-MISMATCH | REJECTED`.

1.2.5 Only `ACCEPTED-CURRENT` can contribute to an admission all-of predicate. `CANDIDATE`, a negative state and every blocking state contribute zero acceptance credit.

1.2.6 A record may not contain its own root, an ancestor root that contains it, or an acceptance of itself. Receipts are detached children that bind the exact subject root produced before the receipt.

1.2.7 `same-root` means byte-equal lowercase SHA-256 roots plus equal schema/domain identifiers; a prose title, model label, Project name or semantically similar record cannot substitute.

1.2.8 Every aggregate has a closed member registry, member count, duplicate/collision check, all-of predicate, issuer/source binding, freshness rule, revocation rule and explicit safe failure terminal.

1.2.9 A single-member change produces a new descendant root. No approval, Eval Run, Legal disposition, account readback or permit inherits across the change.

1.2.10 Root construction is planning-only here. No accepted AiProfileRoot, AdmissionSubjectRoot, AdmissionCandidateRoot or AdmissionRoot is materialized by these prose definitions.

## 1.3 Total predecessor, approval and supersession registry

1.3.1 Clause-universe derivation=`scan the exact frozen UTF-8 bytes; every line matching ^1\.[0-9]+\.[0-9]+ followed by one space contributes the leading clause ID; duplicate IDs, a count mismatch or an unknown override ID returns PREDECESSOR-REGISTRY-BLOCKED`.

1.3.2 A5 derived clause universe=`50`; A5 direct-override set=`5`; A5 default historical set=`45 = universe minus direct overrides`.

| disposition ID | exact A5 clause member | disposition | A7 controlling semantics |
|---|---|---|---|
| `D02A7-A5-D001` | `1.2.6` | `SUPERSEDED-CURRENT-BACKGROUND-FACT` | A6 current official observation preserved through A7 section 1.5; Background remains OFF |
| `D02A7-A5-D002` | `1.2.10` | `SUPERSEDED-HOSTED-EVAL-LIFECYCLE` | A7 sections 1.5 and 1.11; hosted Evals remain OFF |
| `D02A7-A5-D003` | `1.4.1` | `SUPERSEDED-BY-STRONGER-HOSTED-EVAL-PROHIBITION` | A7 section 1.11 |
| `D02A7-A5-D004` | `1.4.4` | `SUPERSEDED-NO-LATER-HOSTED-EVAL-DESTINATION` | A7 section 1.11 |
| `D02A7-A5-D005` | `1.7.2` | `REPLACED-BY-ATOMIC-SIX-DOMAIN-REGISTRY; NO DOMAIN REMOVED` | A7 section 1.4 |

1.3.3 Every A5 member outside the five-row direct-override set has disposition=`HISTORICAL-PREDECESSOR-NO-DIRECT-ADMISSION-CREDIT`; current normative semantics come from rooted A6 clauses preserved below or an exact A7 replacement. This prevents unsignaled A5/A6 union inference.

1.3.4 A6 derived clause universe=`213`; A6 exact replacement set=`23`; preserved A6 set=`190 = universe minus replacement set`.

| replacement ID | source finding | exact A6 clause members | A7 replacement |
|---|---|---|---|
| `D02A7-A6-R001` | `D02-A6-IHR-F001` | `1.2.7,1.12.6,1.16.12,1.17.4` | sections 1.3–1.4 and 1.13 |
| `D02A7-A6-R002` | `D02-A6-IHR-F002` | `1.5.7,1.5.8,1.10.3,1.12.8` | sections 1.6, 1.9–1.10 |
| `D02A7-A6-R003` | `D02-A6-IHR-F003` | `1.7.1,1.7.2,1.7.3,1.7.4,1.7.7,1.7.8,1.7.9,1.7.10,1.7.11,1.7.12,1.17.2` | section 1.7 and 1.13 |
| `D02A7-A6-R004` | `D02-A6-IHR-F004` | `1.7.5,1.7.6,1.16.2,1.17.3` | section 1.8 and 1.13 |

1.3.5 Every A6 clause not in the exact 23-member replacement set has disposition=`PRESERVED-NORMATIVE-BY-ROOTED-REFERENCE` and retains its A6 bytes and meaning.

1.3.6 Precedence is total=`A7 exact replacement > preserved A6 exact clause > A5 historical provenance`; an unregistered conflict returns `PREDECESSOR-REGISTRY-BLOCKED`, never a reader-selected meaning.

1.3.7 Registry acceptance predicate=`A5 50/50 dispositioned AND A6 213/213 dispositioned AND A5 override count 5 AND A6 replacement count 23 AND duplicate/missing/unknown members 0`.

1.3.8 Current registry status=`CANDIDATE-COMPLETE; acceptance credit=0`; detached independent review must recompute both universes and dispositions.

## 1.4 Atomic six-domain approval registry

1.4.1 Canonical approver denominator=`6/6 exact domains`; WhatsApp/Meta Policy is preserved from A5 and is not optional or silently merged into Product.

| approval member ID | exact domain | applicability | required decision | current accepted receipt |
|---|---|---|---|---|
| `D02A7-APR-001` | `PRODUCT` | `REQUIRED` | `APPROVE exact AdmissionCandidateRoot` | `ABSENT` |
| `D02A7-APR-002` | `AI-ENGINEERING` | `REQUIRED` | `APPROVE exact AdmissionCandidateRoot` | `ABSENT` |
| `D02A7-APR-003` | `SECURITY` | `REQUIRED` | `APPROVE exact AdmissionCandidateRoot` | `ABSENT` |
| `D02A7-APR-004` | `PRIVACY-LEGAL` | `REQUIRED` | `APPROVE exact AdmissionCandidateRoot` | `ABSENT` |
| `D02A7-APR-005` | `FINANCE-COST` | `REQUIRED` | `APPROVE exact AdmissionCandidateRoot` | `ABSENT` |
| `D02A7-APR-006` | `WHATSAPP-META-POLICY` | `REQUIRED` | `APPROVE exact AdmissionCandidateRoot` | `ABSENT` |

1.4.2 Each detached receipt schema=`approvalMemberId, AdmissionCandidateRoot, appointmentRoot, issuerAuthorityRoot, issuerSubjectId, domain, decision, constraintsRoot, issuedAt, expiresAt, authorityEpoch, revocationCutRoot, signature/provenanceRoot, state`.

1.4.3 One receipt cannot satisfy two domains; one domain cannot overwrite another; conflicting decisions or issuer-role conflicts return `APPROVAL-SET-BLOCKED`.

1.4.4 All six receipts must bind the same exact AdmissionCandidateRoot, be unexpired/unrevoked at the same trusted cut and have decision=`APPROVE`; any veto or non-approval is absorbing for that candidate.

1.4.5 `ApprovalSetRoot=ROOT-V1(ordered six exact receipt roots,"CONNECT-D02-A7-APPROVAL-SET-V1")`; no receipt includes ApprovalSetRoot.

1.4.6 Current approval ledger=`0/6`; ApprovalSetRoot=`MISSING`; no Product, policy, security, privacy, cost or runtime authority exists.

## 1.5 Preserved eleven-source official OpenAI register

| source member ID | official URL | observation status | Program acceptance |
|---|---|---|---:|
| `OPENAI-DATA-CONTROLS` | [Data controls](https://developers.openai.com/api/docs/guides/your-data) | current page refreshed at cut | `0` |
| `OPENAI-RESPONSES-CREATE` | [Responses create](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) | current page refreshed at cut | `0` |
| `OPENAI-FUNCTION-CALLING` | [Function calling](https://developers.openai.com/api/docs/guides/function-calling) | A6 current observation preserved | `0` |
| `OPENAI-MCP-CONNECTORS` | [MCP and connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) | A6 current observation preserved | `0` |
| `OPENAI-SAFETY-BEST-PRACTICES` | [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices) | A6 current observation preserved | `0` |
| `OPENAI-RED-TEAMING` | [Red teaming](https://developers.openai.com/api/docs/guides/red-teaming) | A6 current observation preserved | `0` |
| `OPENAI-RBAC` | [RBAC](https://developers.openai.com/api/docs/guides/rbac) | A6 current observation preserved | `0` |
| `OPENAI-EVALUATION-BEST-PRACTICES` | [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | A6 current observation preserved | `0` |
| `OPENAI-DEPRECATIONS` | [Deprecations](https://developers.openai.com/api/docs/deprecations) | current page refreshed at cut | `0` |
| `OPENAI-MODEL-CATALOG` | [Models](https://developers.openai.com/api/docs/models) | current page refreshed at cut | `0` |
| `OPENAI-RETRIEVE-MODEL` | [Retrieve model](https://developers.openai.com/api/reference/typescript/resources/models/methods/retrieve) | A6 current observation preserved | `0` |

1.5.1 Source denominator=`11 exact members`; current official observation=`11/11`; accepted Program source roots=`0/11`; OfficialSourceSetRoot=`MISSING`.

1.5.2 Preserved provider facts include training opt-in, up-to-30-day default abuse logs, ZDR/MAM approval requirements, Responses application-state exceptions, Background polling state, cache state, CSAM/container/third-party exceptions and project/capability-specific residency.

1.5.3 Hosted Evals lifecycle remains announcement `2026-06-03`, read-only `2026-10-31`, dashboard/API shutdown `2026-11-30`; hosted Evals remain OFF and Promptfoo remains candidate-only.

1.5.4 `gpt-5.6-terra` remains a candidate based on current balance positioning, not an accepted immutable snapshot. Exact entitlement/snapshot/behavior remains unknown until authenticated evidence and evaluation.

1.5.5 A dynamic source change, provider deprecation or content conflict invalidates OfficialSourceSetRoot and every descendant admission root; current page observation is not Program acceptance.

## 1.6 Closed AiProfile member registry

1.6.1 `AiProfileRoot` has exactly seventeen required member roots. Each row is required; there is no implicit/default member and no free-form extension.

| AiProfile member ID | closed semantic content | initial planning constraint | accepted member root |
|---|---|---|---|
| `D02A7-AIP-001` | runtime environment, server-only execution identity, provider adapter root, SDK/dependency lock root, build/runtime contract root | no browser credential or provider call | `MISSING` |
| `D02A7-AIP-002` | provider, regional base URL, HTTP method, endpoint path/version, foreground/background transport mode | `/v1/responses`; foreground; Background OFF | `MISSING` |
| `D02A7-AIP-003` | complete request-schema root: `store`, stream, conversation, previous-response, compaction, include/metadata, modalities, truncation, token/input/output bounds, timeout, retry/idempotency | `store=false`; streaming/conversation/compaction/media OFF; text only | `MISSING` |
| `D02A7-AIP-004` | exact model ID, immutable snapshot/provider identifier, owner, creation/shutdown readback, entitlement | Terra candidate; exact accepted snapshot unknown | `MISSING` |
| `D02A7-AIP-005` | reasoning effort, sampling/temperature/top-p policy, output-token bound, service tier and fallback policy | no automatic fallback/escalation; exact values unaccepted | `MISSING` |
| `D02A7-AIP-006` | system/developer instruction root, prompt/template/version root, variables schema, prompt-change policy | exact accepted prompt absent | `MISSING` |
| `D02A7-AIP-007` | current-message/context-selection root, Tenant/conversation authority, Connect-owned retrieval policy, source/citation policy | minimum context; hosted retrieval OFF | `MISSING` |
| `D02A7-AIP-008` | response schema root, draft label, allowed/forbidden claims, terminal registry, partial/incomplete handling | draft-only; non-success never actionable | `MISSING` |
| `D02A7-AIP-009` | ordered exact tool-set root, every tool name/version/schema/purpose/authority, provider `tools`, `tool_choice`, maximum/parallel settings | exact set EMPTY; `tool_choice=none`; max tool calls `0`; parallel `false` | `MISSING` |
| `D02A7-AIP-010` | side-effect-class root, human-approval schema, server allowlist, replay/CAS/idempotency/post-readback and forbidden-action policy | all side effects forbidden | `MISSING` |
| `D02A7-AIP-011` | exact AccountSnapshotRoot from the nine-row registry | no authenticated readbacks | `MISSING` |
| `D02A7-AIP-012` | effective `store` behavior, ZDR/MAM, abuse/application/Safety/Eyes-Off retention, cache mode/TTL, container/third-party state | cache unverified-blocking; hosted/third-party state OFF | `MISSING` |
| `D02A7-AIP-013` | Project region, regional endpoint, storage/processing support, model/tool capability and transfer constraints | recommended EU only if exact support and Legal disposition exist | `MISSING` |
| `D02A7-AIP-014` | classification, minimization, legal basis, consent, Tenant isolation, Legal Hold, local retention/deletion, logging/telemetry and safety-identifier policy roots | protected content minimized; raw content excluded from normal telemetry | `MISSING` |
| `D02A7-AIP-015` | authentication/authorization, rate/spend/budget, retry, reliability, moderation, red-team, kill-switch, revocation, Audit and incident-policy roots | missing/stale reduces or disables only | `MISSING` |
| `D02A7-AIP-016` | Eval requirement/configuration roots: corpus, case membership/splits, runner, provider adapter, grader, thresholds, holdout, security-vector and evidence schemas; detached Eval Run/result roots are explicitly excluded | all requirement roots unaccepted; detached results absent | `MISSING` |
| `D02A7-AIP-017` | OfficialSourceSetRoot, provider lifecycle/deprecation root, price/rate evidence root and policy-change observation cut | sources unaccepted; live limits unknown | `MISSING` |

1.6.2 `AiProfileRoot=ROOT-V1(ordered D02A7-AIP-001..017 member roots,"CONNECT-D02-A7-AI-PROFILE-V1")` only when all seventeen member roots are `ACCEPTED-CURRENT`.

1.6.3 The exact empty tool set is still a versioned member; changing from empty to any tool, or changing one tool field, creates a new D02A7-AIP-009 root and invalidates the profile.

1.6.4 Account, cache, residency and Legal/runtime semantics cannot remain side prose: they are exact members or detached evidence bound into AdmissionSubjectRoot below.

1.6.5 Current AiProfileRoot=`MISSING`; accepted AiProfile=`0/1`; no candidate model or request profile receives readiness credit.

## 1.7 Exact nine-member account-readback denominator

1.7.1 Account-readback record schema=`readbackId, expectedType, sourceSurface, Organization scope, Project scope, environment, exact fields, capturedAt, expiresAt, sourceVersion/root, authorityEpoch, revocationCutRoot, redactionPolicyRoot, predicate result, record root, state`.

1.7.2 Common freshness predicate=`capturedAt <= admissionCut < expiresAt AND Organization/Project/environment equal the AdmissionSubject AND source/version/authority epoch remain current at both pre-admission and post-admission readback`; if the provider exposes no comparable epoch, two authenticated redacted readbacks at the same admission attempt must match.

1.7.3 TTL has no default. An accepted TTLPolicyRoot is mandatory per row; missing expiry, stale capture, unavailable second read or changed setting returns `ACCOUNT-READBACK-BLOCKED`.

| readback member ID | source surface and exact required tuple | all-of predicate | row freshness | current state |
|---|---|---|---|---|
| `D02A7-AR-001` | authenticated Organization readback: exact Organization identity and provider ownership scope | every tuple field present and scoped to the candidate | common predicate | `ABSENT` |
| `D02A7-AR-002` | authenticated Project readback: exact Project identity, environment and configured region | all three values present and belong to AR-001 Organization | common predicate | `ABSENT` |
| `D02A7-AR-003` | retention-control eligibility/readback: Organization control and effective ZDR/MAM/None state | eligibility, selected control and effective state all proved | common predicate | `ABSENT` |
| `D02A7-AR-004` | Project retention override/readback: configured override, inherited source and resolved effective control | configured, inherited and effective values agree deterministically | common predicate | `ABSENT` |
| `D02A7-AR-005` | model inventory/retrieve readback: exact model ID, snapshot/alias classification, entitlement, owner, created and shutdown state | accepted immutable identifier available or typed no-snapshot risk remains blocking | common predicate | `ABSENT` |
| `D02A7-AR-006` | provider rate/spend limits plus Finance-approved Connect account budget root | provider limits, spend ceiling and local budget all current and same account/profile | same admission attempt and pre-request recheck | `ABSENT` |
| `D02A7-AR-007` | regional support readback: endpoint, model, snapshot, tool-set, storage and processing support for AR-002 region | every selected capability supported at the same cut | common predicate | `ABSENT` |
| `D02A7-AR-008` | RBAC readback: Organization roles, Project memberships, runtime service identity owner and environment separation | least-privilege matrix complete; no unknown privileged member | common predicate | `ABSENT` |
| `D02A7-AR-009` | training-data sharing readback: Organization/Project opt-in state and governing scope | effective state exactly `OFF`; unknown or ON blocks | common predicate | `ABSENT` |

1.7.4 Inner fields of a composite row are all required; no producer may split, merge or omit fields while preserving row credit.

1.7.5 `AccountSnapshotRoot=ROOT-V1(ordered D02A7-AR-001..009 roots plus admissionCut/TTLPolicy roots,"CONNECT-D02-A7-ACCOUNT-SNAPSHOT-V1")`.

1.7.6 Account predicate=`COUNT(exact rows)=9 AND ACCEPTED-CURRENT rows=9 AND duplicate/missing/extra rows=0 AND all common and row-specific predicates PASS`.

1.7.7 Current account ledger=`0/9`; AccountSnapshotRoot=`MISSING`; legal/contract rows are not counted in this denominator.

## 1.8 Atomic Legal/Privacy decision bundle

1.8.1 Legal/Privacy member schema=`decisionMemberId, applicabilityPredicateRoot, AdmissionSubjectRoot, provider/Organization/Project/profile/source roots, governing document/version roots, issuer appointment/authority root, decision, constraintsRoot, issuedAt, effectiveAt, expiresAt, revocationCutRoot, receipt root, state`.

| decision member ID | exact decision domain | mandatory decision content | current state |
|---|---|---|---|
| `D02A7-LP-001` | `PROCESSING-PURPOSE-AND-ROLES` | allowed purposes, legal basis, controller/processor roles, data subjects and processing scope | `ABSENT` |
| `D02A7-LP-002` | `DPA-AND-SERVICES-TERMS` | exact DPA/services agreement versions, effective dates, contract owner and constraints | `ABSENT` |
| `D02A7-LP-003` | `SUBPROCESSORS` | exact list/version, notification/change treatment, locations and objection/escalation disposition | `ABSENT` |
| `D02A7-LP-004` | `TRANSFER-AND-RESIDENCY` | storage/processing region, transfer mechanism, system-data exclusion and regional limitations | `ABSENT` |
| `D02A7-LP-005` | `RETENTION-AND-DELETION` | local, abuse-log, application-state, cache, Safety/Eyes-Off, container, third-party and deletion dimensions | `ABSENT` |
| `D02A7-LP-006` | `DATA-CLASS-AND-MINIMIZATION` | allowed/prohibited classes, identifiers, customer content, CSAM exception, minimization, logs and Legal Hold | `ABSENT` |
| `D02A7-LP-007` | `MODIFIED-RETENTION-AND-ABUSE-CONTROL-TERMS` | Modified Retention amendment status, ZDR/MAM approval/obligations and non-US applicability | `ABSENT` |

1.8.2 Applicability is never omission. A member is satisfied only by `APPROVED` or `NOT-APPLICABLE-AUTHORIZED`, where the latter requires a deterministic false applicability predicate and an independently authorized receipt bound to the same AdmissionSubjectRoot.

1.8.3 `UNKNOWN`, `ABSENT`, `CONDITIONAL-WITH-UNSATISFIED-CONSTRAINT`, `REJECTED`, `EXPIRED`, `REVOKED` and scope/root mismatch are non-success and return `LEGAL-PRIVACY-BUNDLE-BLOCKED`.

1.8.4 `LegalPrivacyBundleRoot=ROOT-V1(ordered D02A7-LP-001..007 receipt roots,"CONNECT-D02-A7-LEGAL-PRIVACY-BUNDLE-V1")`; the bundle and receipts do not contain their own aggregate root.

1.8.5 Legal/Privacy predicate=`exact members 7 AND dispositioned-current members 7 AND same AdmissionSubjectRoot 7/7 AND all constraints satisfied AND no veto/conflict/expiry/revocation`.

1.8.6 No single DPA, amendment, generic counsel note or prior Project receipt can stand for the bundle. Cherry-pick, cross-Project replay and partial aggregation return zero credit.

1.8.7 Current Legal/Privacy ledger=`0/7 members; bundle acceptance=0/1`; LegalPrivacyBundleRoot=`MISSING`.

## 1.9 PUBLIC authority proof without non-mutation inference

1.9.1 `PublicAuthorityProofRoot=sha256:448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`, the exact D18-A2 artifact root; it is not derived from “no Git operation occurred”.

1.9.2 Proof predicate=`D18-A2 bytes hash to the expected root AND clause 1.1.4 contains Tal's Public directive AND clause 1.1.5 sets the canonical repository intent to Public AND clause 1.1.6 limits the claim AND the current A7 commissioning directive reaffirms PUBLIC`.

1.9.3 Claim limit=`PUBLIC visibility is required`; the proof does not grant Push, Release, Deployment, weaker hardening, public Secrets/PII/Evidence, license rights or any GitHub mutation.

1.9.4 `NO-GIT-GITHUB-MUTATION-AUTHORITY` is a separate negative control. It cannot prove PUBLIC, PRIVATE or any live visibility state.

1.9.5 A7 performed no fresh GitHub visibility readback. `LIVE-GITHUB-VISIBILITY-READBACK=NOT-RUN`; no provider observation is fabricated.

1.9.6 A later exact Tal directive can supersede D18-A2 only through an admitted authority record; ambiguity or a lower-authority conflict returns `PUBLIC-AUTHORITY-CONFLICT-BLOCKED` and grants no visibility mutation.

1.9.7 Current authoritative planning state=`repository visibility PUBLIC`; proof class=`TAL-DIRECTIVE-BOUND-TO-D18-A2-EXACT-ROOT`; D18-A2 exact-root verification is not a fresh provider readback and grants no D02 runtime acceptance.

## 1.10 Non-circular AdmissionRoot construction

1.10.1 `AdmissionSubjectRoot=ROOT-V1({AiProfileRoot,AccountSnapshotRoot,OfficialSourceSetRoot,PublicAuthorityProofRoot,PolicySetRoot,EvalRequirementRoot,LegalApplicabilitySetRoot},"CONNECT-D02-A7-ADMISSION-SUBJECT-V1")`.

1.10.2 Legal/Privacy receipts in section 1.8 and every Eval Run bind AdmissionSubjectRoot. Neither receipt class contains a descendant aggregate that contains the receipt.

1.10.3 `EvalAcceptanceRoot` requires the Connect-owned runner, authorized real corpus, normative security suite, exact membership/splits, graders, thresholds, environment, dependencies and every attempt/result to bind the same AdmissionSubjectRoot.

1.10.4 `AdmissionCandidateRoot=ROOT-V1({AdmissionSubjectRoot,LegalPrivacyBundleRoot,EvalAcceptanceRoot,AccountPostReadbackRoot},"CONNECT-D02-A7-ADMISSION-CANDIDATE-V1")`.

1.10.5 Six detached approval receipts bind AdmissionCandidateRoot; ApprovalSetRoot is then constructed under section 1.4.

1.10.6 `AdmissionRoot=ROOT-V1({AdmissionCandidateRoot,ApprovalSetRoot,IndependentA7ReviewDispositionRoot,NoVetoRoot,Gate29CurrentPermitRoot,FreezeLiftAuthorityRoot,TrustedTimeCutRoot,RevocationCutRoot,FinalAccountReadbackRoot},"CONNECT-D02-A7-ADMISSION-V1")`.

1.10.7 Admission predicate=`every named member ACCEPTED-CURRENT; all roots same candidate/Organization/Project/environment; no veto; time/freshness valid; revocation cuts unchanged across two final reads; independent review accepts exact A7 Subject/crosswalk roots; Gate29 current permit exists; freeze-lift authority exists`.

1.10.8 Missing or failed independent review, Gate29, freeze lift, account readback, legal member, Eval result or approval prevents AdmissionRoot materialization. Mechanical QA cannot fill any member.

1.10.9 AdmissionRoot is a planning identity, not a provider credential or execution permit. A separately authorized, scoped, current runtime permit is still required after AdmissionRoot exists.

1.10.10 Current state=`AiProfileRoot MISSING; AdmissionSubjectRoot MISSING; LegalPrivacyBundleRoot MISSING; EvalAcceptanceRoot MISSING; AdmissionCandidateRoot MISSING; ApprovalSetRoot MISSING; AdmissionRoot MISSING`.

1.10.11 Therefore current runtime terminal=`PROFILE-NOT-ADMITTED`; `AI runtime=OFF`; no old A5/A6 Eval or approval can be replayed.

## 1.11 Complete invalidation dimensions

| invalidation ID | exact trigger class | invalidated descendants | mandatory terminal |
|---|---|---|---|
| `D02A7-INV-001` | any D02A7-AIP-001..017 member byte/root change | AiProfileRoot through AdmissionRoot and all runtime permits | `PROFILE-NOT-ADMITTED` |
| `D02A7-INV-002` | any account row, TTL, epoch, Project, Organization, region, RBAC, training-sharing, rate/spend/budget change | AccountSnapshotRoot and all descendants | `ACCOUNT-READBACK-BLOCKED` |
| `D02A7-INV-003` | any Legal member, contract/DPA/amendment/subprocessor/transfer/retention/data-class change | LegalPrivacyBundleRoot and all descendants | `LEGAL-PRIVACY-BUNDLE-BLOCKED` |
| `D02A7-INV-004` | model ID/snapshot/behavior/owner/shutdown/entitlement/reasoning/service-tier change | AiProfile/Eval/admission descendants | `PROFILE-NOT-ADMITTED` |
| `D02A7-INV-005` | prompt, request/response schema, context, retrieval, policy, adapter, dependency, environment or terminal change | AiProfile/Eval/admission descendants | `PROFILE-NOT-ADMITTED` |
| `D02A7-INV-006` | tool set/name/version/schema/authority/side-effect/approval/retry/CAS change | tool member, AiProfile, Eval and admission descendants | `TOOL-AUTHORITY-BLOCKED` |
| `D02A7-INV-007` | corpus, provenance, case membership/split, grader, runner, threshold, holdout or Eval-attempt change | EvalAcceptanceRoot and admission descendants | `EVAL-INVALIDATED` |
| `D02A7-INV-008` | official source, deprecation, provider policy, price/rate, residency/support or account-capability change | OfficialSourceSet/profile/account/Eval/admission descendants as applicable | `SOURCE-REVALIDATION-REQUIRED` |
| `D02A7-INV-009` | approval appointment/receipt/expiry/revocation/veto or reviewer-independence change | ApprovalSetRoot and AdmissionRoot | `APPROVAL-SET-BLOCKED` |
| `D02A7-INV-010` | D18-A2 root, admitted higher-authority Public directive, Gate29/freeze state, incident or accepted security finding change | Public proof and every affected admission/runtime descendant | `PUBLIC-AUTHORITY-CONFLICT-BLOCKED` or `PROFILE-NOT-ADMITTED` |

1.11.1 Invalidation is immediate and monotone toward safety: it can disable or require new evidence; it cannot silently preserve acceptance, increase authority or choose a fallback.

1.11.2 Every descendant acceptance, receipt and runtime permit stores the exact ancestor roots. Equality failure makes it stale; re-evaluation is mandatory.

1.11.3 No moving alias, source-title match, same Project name, semantic equivalence assertion or passing retry bypasses root invalidation.

## 1.12 Preserved Pilot, tool, data and Eval boundaries

1.12.1 Initial endpoint remains foreground `/v1/responses`; `store=false`; text-only; streaming, Conversations, Background, server compaction, media and all hosted/remote tools remain OFF.

1.12.2 Initial tool set remains exactly EMPTY and all external side effects remain forbidden. Output remains labeled draft-only and requires an authenticated authorized human decision outside the model.

1.12.3 Hosted Evals remain forbidden as a new dependency. Evaluation remains Connect-owned, provider-neutral and bound to immutable roots.

1.12.4 Quality/readiness evidence requires authorized, minimized and redacted real business records after exact approval. Mock, fake, demo, sample and synthetic business records receive zero readiness/release credit.

1.12.5 Deterministic normative hostile literals may prove named security boundaries only; they are not customer data and cannot count as product-quality coverage.

1.12.6 Exact thresholds, accepted corpus, security suite, runner, graders, profile and passing Run remain `unknown/unavailable` or absent; no Eval success is inferred.

1.12.7 Retention dimensions remain separate: local retention, abuse logs, application state, ZDR/MAM, Safety Retention, Eyes Off, cache, regional storage/processing and third-party retention cannot be collapsed.

1.12.8 `store=false` remains a request property; ZDR/MAM remains an account/Project property; residency/support remains Project/endpoint/model/tool specific; none proves another.

1.12.9 Current cache state remains `UNVERIFIED-BLOCKING`; omission of cache options is not represented as a provider-side disable control.

1.12.10 No fake data, secret, PII, random ID, provider account claim, model-fitness claim or compliance claim is introduced by A7.

## 1.13 One-to-one candidate remediation map

| finding ID | exact A7 candidate remediation | candidate semantic result | accepted closure |
|---|---|---|---:|
| `D02-A6-IHR-F001` | sections 1.3–1.4: total predecessor disposition plus six exact approval domains | `CANDIDATE-REMEDIATED` | `0` |
| `D02-A6-IHR-F002` | sections 1.6 and 1.10–1.11: seventeen-member AiProfile, detached same-subject chain and complete invalidation | `CANDIDATE-REMEDIATED` | `0` |
| `D02-A6-IHR-F003` | section 1.7: exact nine-row denominator, predicates, TTL/freshness and all-of AccountSnapshotRoot | `CANDIDATE-REMEDIATED` | `0` |
| `D02-A6-IHR-F004` | section 1.8: seven-member atomic Legal/Privacy bundle with all-of/no-cherry-pick predicate | `CANDIDATE-REMEDIATED` | `0` |
| `D02-A6-IHR-F005` | section 1.9: PUBLIC bound to Tal directive and D18-A2 exact root, separate from no-mutation | `CANDIDATE-REMEDIATED` | `0` |

1.13.1 Mapping cardinality=`5 findings -> 5 distinct candidate remediations`; merge/range credit=`0`; noMergeKey remains each exact finding ID.

1.13.2 Candidate remediation is not closure. Accepted closure requires a new independent hostile review of exact A7 Subject, crosswalk and QA roots.

## 1.14 Ordered planning path and zero ledger

1.14.1 While the development freeze is active, permitted work is limited to immutable planning evidence, Producer QA and independent review; Product/provider/Git implementation remains forbidden.

1.14.2 After a separately authorized freeze lift, the order is=`admit eleven sources -> materialize nine account readbacks -> freeze all profile/policy/Eval requirement roots -> obtain seven Legal/Privacy dispositions -> build authorized corpus/runner -> execute Eval -> build AdmissionCandidateRoot -> obtain six same-root approvals -> independent review -> Gate29/freeze/current-state reads -> materialize AdmissionRoot -> separately authorize any runtime permit`.

1.14.3 A stage cannot consume its own output as a prerequisite; every receipt is detached; failure returns the section-specific blocking terminal and does not skip forward.

1.14.4 Zero ledger=`accepted sources 0/11; account readbacks 0/9; Legal/Privacy members 0/7; LegalPrivacyBundle 0/1; approver receipts 0/6; accepted AiProfile 0/1; accepted real corpus 0/1; accepted security suite 0/1; accepted runner 0/1; passing Eval Runs 0; AdmissionRoot 0/1; runtime permit 0/1`.

1.14.5 PUBLIC authority input root verification=`1/1 exact D18-A2 root`; fresh live GitHub visibility readback=`NOT-RUN`; neither grants D02 acceptance or Git/GitHub mutation.

1.14.6 A6 finding candidate-remediation coverage=`5/5`; independently accepted closures=`0/5`; A7 Producer QA acceptance=`0/1`; A7 independent review=`0/1`; `A7 self-acceptance=0/1`.

1.14.7 `AI runtime=OFF`; `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository visibility=`PUBLIC` under the exact authority proof in section 1.9.

1.14.8 Exact completion percentage, remaining hours and ETA=`unknown/unavailable`; no accepted Program task denominator, capacity or schedule is introduced.

1.14.9 No clause authorizes Product code, provider/account change, credential use, Git/GitHub operation, visibility change, Push, Release, deployment or production.

## 1.15 Required detached assurance

1.15.1 Producer QA must recompute frozen input roots, predecessor clause sets, override cardinalities, table-member uniqueness, root-layer acyclicity, one-to-one finding coverage, safe-state counters and Public authority binding.

1.15.2 Producer QA must call the repository check `NO-GIT-GITHUB-MUTATION-AUTHORITY`; it may call PUBLIC binding PASS only by validating D18-A2 exact root/directive locator, never by absence of mutation.

1.15.3 Independent reviewer must be different from A7 producer, receive exact frozen A7 Subject/crosswalk/QA roots and re-open all eleven current official OpenAI pages.

1.15.4 Independent review must execute single-member mutation reasoning for every AiProfile/account/Legal/approval layer, predecessor-reader parity, all-of deletion/duplicate/cherry-pick attacks and PUBLIC/PRIVATE/UNKNOWN proof separation.

1.15.5 Reviewer must report findings without self-closing them. Any P0/P1 semantic finding requires another immutable successor.

1.15.6 Until an independent result accepts the exact A7 roots and every AdmissionRoot prerequisite independently exists, final verdict=`BLOCKED-SAFE; AI-OFF`.
