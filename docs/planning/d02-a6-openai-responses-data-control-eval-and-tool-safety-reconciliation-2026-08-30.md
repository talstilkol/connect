# 1. Connect — D02-A6 OpenAI Responses, data-control, Eval and tool-safety reconciliation

## 1.1 Identity, authority and safe state

1.1.1 `decisionId=D02-A6`.

1.1.2 `artifactId=CONNECT-D02-A6-OPENAI-RESPONSES-DATA-CONTROL-EVAL-TOOL-SAFETY-RECONCILIATION-2026-08-30`.

1.1.3 predecessor=`docs/planning/d02-a5-openai-responses-data-control-and-model-selection-reconciliation-2026-08-29.md`.

1.1.4 predecessor treatment=`IMMUTABLE INPUT`; this successor does not silently rewrite or erase the prior observation.

1.1.5 research cutoff=`2026-08-30 Asia/Jerusalem`.

1.1.6 research authority=`official OpenAI documentation only`, obtained under the OpenAI Docs workflow; no third-party source is treated as OpenAI product authority.

1.1.7 user decision preserved=`D02 openai-responses-eval`, but “eval” is reconciled below to a Connect-controlled, provider-neutral evaluation harness rather than the deprecated hosted OpenAI Evals platform.

1.1.8 current state=`SELECTED-FOR-PLANNING; NOT-ACCOUNT-VERIFIED; NOT-CONTRACT-VERIFIED; NOT-EVALUATED; NOT-IMPLEMENTED; AI-OFF`.

1.1.9 no API key was accessed; no OpenAI request, account mutation, purchase, product-code change, Build, Runtime test, Git/GitHub operation, deployment or provider mutation occurred.

1.1.10 fail-safe invariant=`missing, stale, contradictory or unaccepted evidence => AI-OFF-HUMAN-ONLY`.

## 1.2 Material correction to D02-A5

1.2.1 OpenAI's official deprecation page states that the Evals platform deprecation was announced on `2026-06-03`.

1.2.2 the same page schedules existing Evals to become read-only on `2026-10-31` and schedules the Evals dashboard and API to shut down on `2026-11-30`.

1.2.3 therefore Connect must not adopt `/v1/evals`, the hosted Evals dashboard or hosted Eval graders as a new architectural dependency.

1.2.4 the official migration link to Promptfoo proves that Promptfoo is a published migration path; it does not prove that Promptfoo is accepted, secure, compatible with Connect's data policy or authorized for installation.

1.2.5 `Promptfoo status=CANDIDATE-ONLY`; admission requires a separately accepted dependency, license, provenance, vulnerability, privacy, retention, network-egress and deterministic-runner review.

1.2.6 final planning interpretation of the user's selection=`OpenAI Responses API behind a server adapter + Connect-owned provider-neutral Eval contract and evidence store`.

1.2.7 this correction supersedes D02-A5 clauses `1.2.6`, `1.2.10`, `1.4.1` and `1.4.4` for current Background-mode facts and wherever they imply that hosted Evals remain a viable later destination.

1.2.8 historical hosted-Eval evidence, if any is ever discovered, may be imported only as untrusted historical input and never as current readiness proof.

## 1.3 Official OpenAI observations bound to the planning decision

1.3.1 [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) states: API training is opt-in; default abuse logs can retain content up to 30 days; ZDR/MAM need prior approval.

1.3.2 Responses is ZDR-eligible with limits; `store:true` or documented defaults can retain application state for at least 30 days; ZDR forces `store:false`, but `store:false` does not prove ZDR.

1.3.3 Background uses roughly ten minutes of polling storage; the documented MAM `store:false` case is then deleted; EU-region Responses disallows Background.

1.3.4 prompt caching can retain encrypted GPU-local tensors up to 24 hours and non-ZDR organizations use extended caching for supported models; a caller-side off switch is not established.

1.3.5 suspected-CSAM image/file input can trigger manual-review retention; hosted containers have temporary state; remote MCP follows third-party policy.

1.3.6 residency is Project- and capability-specific, excludes system data, and non-US use needs abuse-control approval plus a Modified Retention amendment; pricing and support remain dynamic.

1.3.7 the official [Responses create reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) exposes `store`, tool controls, typed tools and state mechanisms; availability does not prove fitness or authorization.

1.3.8 the official [function-calling guide](https://developers.openai.com/api/docs/guides/function-calling) recommends strict schemas and documents parallel-call control; schema conformance is not business authorization.

1.3.9 the official [MCP and connectors guide](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) recommends approvals, allowed-tool narrowing and prompt-injection/third-party safeguards.

1.3.10 the official [safety best-practices guide](https://developers.openai.com/api/docs/guides/safety-best-practices) recommends moderation, adversarial testing, constrained I/O and human review.

1.3.11 the official [red-teaming guide](https://developers.openai.com/api/docs/guides/red-teaming) makes red teaming complementary to Evals and limits it to owned or authorized assets.

1.3.12 the official [RBAC guide](https://developers.openai.com/api/docs/guides/rbac) documents Organization/Project roles; it does not prove Connect's live assignments.

1.3.13 the official [evaluation best-practices guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices) favors task-specific, representative, logged, human-calibrated continuous evaluation over subjective checks.

1.3.14 the official [deprecations page](https://developers.openai.com/api/docs/deprecations) controls the hosted Evals dates in section 1.2.

1.3.15 the official [model catalog](https://developers.openai.com/api/docs/models) positions Terra for balance, Luna for cost-sensitive volume and Sol for complex work; labels/prices are dynamic observations.

1.3.16 the official [Retrieve model reference](https://developers.openai.com/api/reference/typescript/resources/models/methods/retrieve) exposes ID, owner, creation time and optional `shutdown_date`; live readback still does not prove behavioral immutability.

## 1.4 Initial Pilot API profile

1.4.1 endpoint=`foreground /v1/responses`.

1.4.2 mandatory request flag=`store:false`.

1.4.3 OpenAI Conversations=`OFF`.

1.4.4 Background mode=`OFF`.

1.4.5 streaming=`OFF until a separate privacy, partial-output, cancellation and observability contract is accepted`.

1.4.6 input modalities=`text only`.

1.4.7 image input=`OFF`; file input=`OFF`; audio input/output=`OFF`; generated media=`OFF`.

1.4.8 built-in Web search=`OFF`; File search=`OFF`; Code Interpreter=`OFF`; hosted Shell=`OFF`; Computer use=`OFF`; remote MCP/connectors=`OFF`; hosted Skills=`OFF`.

1.4.9 hosted Files, Vector stores, Batches, Evals, Conversations, Assistants and Threads=`OFF`.

1.4.10 prompt-caching state=`UNVERIFIED-BLOCKING`; Connect must not claim that the caller can disable provider-side caching. The request omits cache keys/options, and AI stays OFF until authenticated account/Project evidence plus Legal/Privacy disposition accept the provider's effective cache mode and retention; no performance optimization may alter that profile silently.

1.4.11 server-side compaction=`OFF until separately evaluated`; the official retention statement for `store=false` is necessary but not sufficient for authorization.

1.4.12 initial task class=`draft-only conversational assistance for a human operator`.

1.4.13 forbidden AI authority=`WhatsApp send, consent/opt-out mutation, campaign activation, recipient import, retention deletion, Legal Hold, billing, refund, entitlement, permission, secret access, provider mutation, deployment or any irreversible external effect`.

1.4.14 every output is labeled as a draft and requires an authenticated, authorized human to make the business decision outside the model.

1.4.15 automatic provider fallback, model fallback, moving alias, prompt fallback, silent retry and automatic reasoning-effort escalation=`FORBIDDEN`.

1.4.16 an incomplete, timeout, cancelled, failed, ambiguous, policy-blocked or schema-invalid response terminates as a typed non-success and never creates an actionable draft.

## 1.5 Model-selection profile

1.5.1 candidate retained from D02-A5=`gpt-5.6-terra`, because the current official positioning describes it as the balance profile; it is not yet accepted for production.

1.5.2 `gpt-5.6-luna=DORMANT-CANDIDATE`; admission requires a separately frozen non-inferiority, safety, Hebrew-quality, latency and cost comparison.

1.5.3 `gpt-5.6-sol=DORMANT-CANDIDATE`; admission requires a proved material quality gain for a named high-complexity task and an approved budget.

1.5.4 current documentation labels, prices, context limits, rate limits and availability are live provider facts and expire at the evidence TTL defined by the future Control Plane.

1.5.5 model selection must use an exact supported snapshot or immutable provider identifier when one is available and accepted; moving aliases cannot satisfy reproducibility.

1.5.6 if the provider offers no immutable identifier for the selected model, the risk must be recorded and every behavior change detected by the continuous Eval gate must disable the profile.

1.5.7 exact model, snapshot, reasoning effort, output token bound, timeout, schema root, prompt root, retrieval-policy root, safety-policy root and adapter root form one immutable `AiProfile` identity.

1.5.8 changing any identity member creates a new candidate profile; it cannot inherit acceptance from an older profile.

## 1.6 Data minimization and retention profile

1.6.1 the server, never the browser, owns OpenAI credentials and request construction.

1.6.2 before each request, Connect must prove Tenant, user, purpose, conversation authority, data class, legal basis, retention state and Legal Hold interaction through accepted local controls.

1.6.3 only the minimum current message, minimum necessary approved context and minimum Tenant-scoped knowledge excerpt may leave Connect.

1.6.4 direct identifiers, credentials, secrets, payment data, government identifiers, authentication material and unrelated conversation history are removed or block the request according to an accepted classification policy.

1.6.5 knowledge retrieval remains Connect-owned, Tenant-isolated and read-only; OpenAI-hosted vector storage is not part of the Pilot.

1.6.6 customer prompt and response bytes are excluded from normal application logs, metrics, traces, error reports and analytics.

1.6.7 permitted Evidence fields are limited to approved pseudonymous subject/purpose identity, immutable profile root, request time bucket, provider request identifier when classification permits, token usage, cost facts, result terminal and redacted policy decisions.

1.6.8 raw PII and plain unsalted hashes are forbidden as `safety_identifier` or telemetry identity.

1.6.9 a `safety_identifier`, if later admitted, must be derived with an accepted keyed, framed, versioned and purpose-separated scheme.

1.6.10 any key generation that needs cryptographic randomness remains blocked until Tal gives exact use-specific approval; `Math.random()` is permanently forbidden.

1.6.11 local retention, OpenAI abuse-monitoring retention, OpenAI application state, Safety Retention, Eyes Off, prompt-cache state, regional storage, regional processing and third-party retention are separate dimensions and must never be collapsed into one boolean.

1.6.12 `store:false` is a request property; ZDR/MAM is an account/Project control; residency is a Project/endpoint/model property; none proves the others.

## 1.7 Required live account and contract evidence

1.7.1 required Organization identity=`unknown/unavailable`.

1.7.2 required Project identity and region=`unknown/unavailable`.

1.7.3 ZDR/MAM eligibility and selected Organization control=`unknown/unavailable`.

1.7.4 selected Project data-retention override=`unknown/unavailable`.

1.7.5 Modified Retention amendment status=`unknown/unavailable`.

1.7.6 DPA, subprocessors and contract-owner acceptance=`unknown/unavailable`.

1.7.7 exact approved model and snapshot inventory=`unknown/unavailable`.

1.7.8 exact rate limits, spend limits and account budget=`unknown/unavailable`.

1.7.9 exact regional endpoint/model/tool support at activation time=`unknown/unavailable`.

1.7.10 Organization RBAC assignments, Project memberships and service-account owner=`unknown/unavailable`.

1.7.11 training-data sharing opt-in state=`unknown/unavailable`; safe target=`OFF`.

1.7.12 required Evidence includes authenticated Organization and Project readbacks, retention-control readbacks, region, model inventory, rate/spend limits, named approvers, contract receipts and capture timestamps.

1.7.13 screenshot-only Evidence is insufficient where a machine-readable authenticated readback exists; secrets must be redacted before Evidence admission.

1.7.14 recommended target=`dedicated production Project and separate staging Project, EU regional storage and processing where the exact selected profile is supported, plus approved ZDR or MAM according to Legal/Privacy disposition`.

1.7.15 recommendation 1.7.14 is not a claim of eligibility or compliance and may be rejected by Legal, Privacy, Finance or the provider.

## 1.8 Authentication, authorization and least privilege

1.8.1 create no personal production API key.

1.8.2 required runtime identity=`dedicated Project service account or accepted workload identity`, scoped to the minimum Project and environment.

1.8.3 staging and production identities, Projects, budgets and Evidence are separate; staging acceptance cannot authorize production.

1.8.4 least-privilege roles must separate Organization owner, billing administrator, security auditor, Project administrator and runtime service identity.

1.8.5 every human administrator requires named primary and backup ownership, MFA evidence and periodic access review.

1.8.6 credential issuance, rotation, revocation and break-glass events require append-only Audit evidence and dual control where applicable.

1.8.7 API keys, service-account secrets and provider tokens may exist only in approved platform secret stores; they are forbidden in browser code, repository files, logs, documents and chat.

1.8.8 provider dashboard access cannot substitute for Connect Tenant authorization; the two authorization domains remain independent.

## 1.9 Tool-call security contract

1.9.1 initial Pilot tool set=`EMPTY`.

1.9.2 a future tool must be admitted by exact name, version, schema root, purpose, caller roles, Tenant boundary, read/write class, side-effect class, data classes, timeout, retry policy and terminal set.

1.9.3 function schemas use strict validation, explicit required fields, closed object shapes and bounded values; unknown fields are rejected.

1.9.4 model-supplied tool arguments are untrusted input and must pass independent authentication, authorization, Tenant ownership, business-rule, consent, retention, Legal Hold and replay checks.

1.9.5 schema validity is never authorization.

1.9.6 `allowed_tools` or equivalent provider selection is defense in depth; the Connect server allowlist is authoritative.

1.9.7 parallel tool calls=`false` for every side-effect-capable workflow; the Pilot admits no side-effect tool at all.

1.9.8 every future sensitive or side-effect call requires a fresh, specific, expiring, single-use human approval bound to exact canonical arguments and current state.

1.9.9 approval for one call cannot approve a retry, a changed argument, another Tenant, another recipient, another tool or another time window.

1.9.10 tool output is untrusted data; it cannot inject instructions, extend permissions or override the system/business policy.

1.9.11 remote MCP remains disabled until server identity, owner, exact tool inventory, data flow, DPA, retention, residency, authentication, authorization, prompt-injection defenses and revocation are independently accepted.

1.9.12 if remote MCP is ever admitted, sensitive actions retain mandatory approval and no model-generated approval bypass is valid.

## 1.10 Connect-owned provider-neutral Eval contract

1.10.1 Eval execution occurs in a Connect-controlled runner; it does not depend on the OpenAI Evals API or dashboard.

1.10.2 the runner's provider adapter is replaceable; test identities, expected outcomes and Evidence schema do not depend on OpenAI-specific hosted objects.

1.10.3 every Eval Run binds immutable roots for corpus, case membership, task taxonomy, AI profile, provider adapter, policy, grader set, environment, runner and dependency lock.

1.10.4 corpus source=`authorized, minimized and redacted real business records` only after Privacy/Legal/Data-owner approval.

1.10.5 mock, fake, demo, sample or synthetic business records are forbidden as quality, readiness or release evidence.

1.10.6 deterministic normative hostile literals may be authored only to prove a named security boundary; they must be labeled `NORMATIVE-SECURITY-VECTOR`, never presented as customer data and never counted as product-quality coverage.

1.10.7 each real case records provenance, authorization receipt, purpose, data classification, minimization transform, expected allowed claims, forbidden claims, required escalation and deletion/retention disposition.

1.10.8 each case must be disjoint across training/prompt-development, tuning, validation and final holdout roles; leakage between roles invalidates the run.

1.10.9 graders combine deterministic assertions, schema checks, policy checks, retrieval-grounding checks and named human review; an LLM grader alone is not ground truth.

1.10.10 human calibration measures disagreement and adjudicates a frozen subset before an automated grader can influence a gate.

1.10.11 “looks good”, ad-hoc chat trials and average score without hard safety floors cannot satisfy acceptance.

1.10.12 every execution stores redacted Evidence, exact provider request identity where permitted, usage, latency, cost, terminal, grader results and exceptions; raw protected content follows its own accepted repository and retention policy.

1.10.13 retries are separate attempts; a passing retry cannot erase a previous failure.

1.10.14 Eval failure, missing result, stale run, incomplete case membership or root mismatch returns `PROFILE-NOT-ADMITTED`.

## 1.11 Mandatory Eval dimensions

1.11.1 Hebrew instruction understanding and natural response quality.

1.11.2 factual faithfulness to the current authorized conversation and retrieved sources.

1.11.3 explicit uncertainty and human escalation when evidence is absent or conflicting.

1.11.4 refusal to invent contacts, prices, consent, delivery state, legal facts or provider limits.

1.11.5 prompt-injection resistance from user content, WhatsApp messages, imported documents, URLs and tool output.

1.11.6 cross-Tenant and cross-conversation data-isolation resistance.

1.11.7 secret, credential and personal-data leakage resistance.

1.11.8 refusal to bypass opt-out, suppression, consent, template, recipient, quiet-hour, rate-limit and WhatsApp policy gates.

1.11.9 refusal to send or claim a message was sent.

1.11.10 refusal to mutate billing, roles, retention, Legal Hold or deployment state.

1.11.11 correct structured schema and bounded output.

1.11.12 stable behavior under malformed, multilingual, long, adversarial and conflicting inputs.

1.11.13 latency, timeout, cancellation and partial-output behavior.

1.11.14 input tokens, output tokens, tool charges if any, retry cost and total cost per accepted task outcome.

1.11.15 accessibility and operator comprehension of AI labels, uncertainty and approval boundaries.

1.11.16 regression against every admitted production incident and every accepted security finding without exposing protected incident data.

## 1.12 Eval gates and thresholds

1.12.1 exact numerical thresholds=`unknown/unavailable` until the Task Registry binds product risk, real corpus cardinality, approvers and statistical method.

1.12.2 all P0 safety assertions require zero observed violations in the accepted frozen suite; passing the finite suite does not prove absence of unknown failures.

1.12.3 quality metrics require a predeclared aggregation, confidence method and subgroup floors; the team may not choose thresholds after seeing candidate results.

1.12.4 Hebrew, task class, customer segment and risk subgroup results are reported separately; a strong aggregate cannot hide a failing subgroup.

1.12.5 a cost or latency win cannot compensate for a safety, privacy, Tenant-isolation or authorization failure.

1.12.6 model promotion requires Product, AI Engineering, Security, Privacy/Legal and Cost approvals bound to the same Run root.

1.12.7 the final holdout is opened once per candidate decision; tuning after opening it creates a new holdout requirement.

1.12.8 continuous evaluation is triggered by every identity change listed in 1.5.7 and by provider behavior/deprecation notices, incidents or policy changes.

## 1.13 Red-team and abuse-safety plan

1.13.1 red-team scope is limited to Connect-owned or explicitly authorized assets.

1.13.2 test families include direct injection, indirect injection, data exfiltration, instruction hierarchy conflict, social engineering, Unicode/encoding ambiguity, multilingual bypass, oversized input, tool-output poisoning and cross-Tenant reference attempts.

1.13.3 production customer content cannot be copied into a red-team corpus without exact authorization, minimization and retention disposition.

1.13.4 moderation is a separately versioned control, not a substitute for authorization or product policy.

1.13.5 high-risk or ambiguous output is blocked and routed to a named human review queue; it is never auto-sent.

1.13.6 every discovered bypass becomes a uniquely identified finding, negative vector and release-blocking regression where severity requires it.

1.13.7 incident response must support immediate profile disablement independent of provider availability.

## 1.14 Rate, cost and reliability controls

1.14.1 provider rate limits and spend limits are live inputs, not source-code constants.

1.14.2 Connect applies stricter server-side budgets per Organization, Project, environment, Tenant, user, task class and AI profile.

1.14.3 missing, stale or contradictory provider-limit Evidence may only reduce or disable traffic.

1.14.4 admission uses bounded input tokens, bounded output tokens, timeout and concurrency; queued work cannot exceed an accepted maximum age.

1.14.5 provider `429`, timeout, incomplete, cancelled, server error and ambiguous network outcome receive distinct typed terminals and retry eligibility.

1.14.6 retries require idempotent local accounting and a bounded policy; no blind retry, retry storm or silent model change is permitted.

1.14.7 cost accounting binds observed usage to the exact dated price snapshot, region uplift, service tier, caching state, tool charge and retry attempts.

1.14.8 budget caps are enforced before request admission and reconciled after provider usage returns; a catalog price alone is not an invoice.

1.14.9 exhaustion returns a human-only path and never weakens privacy or safety controls.

## 1.15 Telemetry and Audit

1.15.1 telemetry default=`content-free`.

1.15.2 every AI attempt produces one immutable terminal from an accepted finite terminal registry.

1.15.3 Audit binds Tenant, actor, purpose, profile root, Eval admission root, request-admission decisions, provider identity, terminal and human approval state without storing prohibited content.

1.15.4 metrics expose accepted task success, hard-safety failures, refusal/escalation, latency, token use, cost, provider errors and profile-disable events.

1.15.5 traces cannot include raw prompts, responses, retrieved passages, secrets or identifiers outside the accepted classification policy.

1.15.6 alerts must distinguish provider outage, rate exhaustion, budget exhaustion, policy rejection, Eval invalidation and suspected leakage.

1.15.7 every operator-visible explanation must state whether the failure came from Connect, OpenAI, account policy, budget or unknown state without fabricating a cause.

## 1.16 Ordered execution plan after the development freeze is lifted

1.16.1 Stage 1=`admit D02-A6 and its official sources into the accepted Source Universe`; owner and duration remain unset until the Program Task denominator and resources are accepted.

1.16.2 Stage 2=`obtain Legal/Privacy disposition for OpenAI processing, DPA, subprocessors, transfer/residency, retention and prohibited data classes`.

1.16.3 Stage 3=`obtain Finance-approved Pilot budget and provider caps`.

1.16.4 Stage 4=`create separate staging and production Project design, RBAC matrix, named owners and credential lifecycle`; no live mutation occurs at planning time.

1.16.5 Stage 5=`capture authenticated live Organization/Project retention, region, model, rate and spend Evidence`.

1.16.6 Stage 6=`freeze AiProfile schema, terminal registry, request-minimization policy and content-free telemetry contract`.

1.16.7 Stage 7=`freeze provider-neutral Eval schema, corpus governance, split rules, grader contracts and hard gates`.

1.16.8 Stage 8=`assemble the authorized real redacted corpus and normative security-vector suite`; no fake business data is generated.

1.16.9 Stage 9=`implement the server-only OpenAI adapter and foreground store:false profile behind AI-OFF feature controls`.

1.16.10 Stage 10=`implement the Connect-owned Eval runner and immutable Evidence output`.

1.16.11 Stage 11=`execute candidate-model evaluation, human calibration, red team, privacy and Tenant-isolation tests`.

1.16.12 Stage 12=`independent Security, Privacy/Legal, AI-quality, Product and Cost review against one exact Run root`.

1.16.13 Stage 13=`staging canary with draft-only human approval, kill switch, budgets and alerting`.

1.16.14 Stage 14=`production Pilot admission only if all predecessor gates and D02 approvals are accepted`.

1.16.15 Stage 15=`continuous evaluation, deprecation monitoring, access review, budget reconciliation and instant profile revocation`.

## 1.17 Acceptance contract and zero ledger

1.17.1 required accepted sources=`0/11` in this artifact; observation does not equal Program admission.

1.17.2 live account readbacks=`0/9`.

1.17.3 Legal/Privacy/contract dispositions=`0/1 complete set`.

1.17.4 named approver receipts=`0/5 minimum roles`.

1.17.5 accepted real Eval corpus=`0/1`.

1.17.6 accepted normative security-vector suite=`0/1`.

1.17.7 accepted provider-neutral Eval runner=`0/1`.

1.17.8 accepted AiProfile=`0/1`.

1.17.9 candidate Eval Runs passing exact frozen gates=`0`.

1.17.10 staging canary acceptance=`0/1`.

1.17.11 production Pilot permit=`0/1`.

1.17.12 `AI runtime=OFF`.

1.17.13 `Gate18.1=BLOCKED`; `Gate18.2=BLOCKED when Knowledge is in scope`; `Gate29=BLOCKED`; development freeze=`ACTIVE`.

1.17.14 exact completion percentage, remaining hours and calendar ETA=`unknown/unavailable` until the accepted Task denominator, scope, owners, capacities, dependencies and schedule exist.

1.17.15 no clause in this planning artifact grants implementation, provider, GitHub, deployment or production authority.

## 1.18 Required independent review

1.18.1 reviewer must be independent from this artifact's producer.

1.18.2 reviewer must verify every official claim against the cited current OpenAI page and record observation time.

1.18.3 reviewer must test the Evals-deprecation correction, retention dimensionality, EU residency prerequisites, tool-authority separation, corpus prohibition, zero ledger and safe-state propagation.

1.18.4 reviewer must report findings without self-closing them and must not mark D02 accepted.

1.18.5 any P0/P1 semantic finding requires a new successor version; this file remains immutable Evidence.

## 1.19 Source register

1.19.1 `OPENAI-DATA-CONTROLS`=[https://developers.openai.com/api/docs/guides/your-data](https://developers.openai.com/api/docs/guides/your-data); observed `2026-08-30`; dynamic provider page; Program acceptance=`0`.

1.19.2 `OPENAI-RESPONSES-CREATE`=[https://developers.openai.com/api/reference/cli/resources/responses/methods/create](https://developers.openai.com/api/reference/cli/resources/responses/methods/create); observed `2026-08-30`; dynamic provider reference; Program acceptance=`0`.

1.19.3 `OPENAI-FUNCTION-CALLING`=[https://developers.openai.com/api/docs/guides/function-calling](https://developers.openai.com/api/docs/guides/function-calling); observed `2026-08-30`; dynamic provider guide; Program acceptance=`0`.

1.19.4 `OPENAI-MCP-CONNECTORS`=[https://developers.openai.com/api/docs/guides/tools-connectors-mcp](https://developers.openai.com/api/docs/guides/tools-connectors-mcp); observed `2026-08-30`; dynamic provider guide; Program acceptance=`0`.

1.19.5 `OPENAI-SAFETY-BEST-PRACTICES`=[https://developers.openai.com/api/docs/guides/safety-best-practices](https://developers.openai.com/api/docs/guides/safety-best-practices); observed `2026-08-30`; dynamic provider guide; Program acceptance=`0`.

1.19.6 `OPENAI-RED-TEAMING`=[https://developers.openai.com/api/docs/guides/red-teaming](https://developers.openai.com/api/docs/guides/red-teaming); observed `2026-08-30`; dynamic provider guide; Program acceptance=`0`.

1.19.7 `OPENAI-RBAC`=[https://developers.openai.com/api/docs/guides/rbac](https://developers.openai.com/api/docs/guides/rbac); observed `2026-08-30`; dynamic provider guide; Program acceptance=`0`.

1.19.8 `OPENAI-EVALUATION-BEST-PRACTICES`=[https://developers.openai.com/api/docs/guides/evaluation-best-practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices); observed `2026-08-30`; dynamic provider guide; Program acceptance=`0`.

1.19.9 `OPENAI-DEPRECATIONS`=[https://developers.openai.com/api/docs/deprecations](https://developers.openai.com/api/docs/deprecations); observed `2026-08-30`; dynamic provider lifecycle page; Program acceptance=`0`.

1.19.10 `OPENAI-MODEL-CATALOG`=[https://developers.openai.com/api/docs/models](https://developers.openai.com/api/docs/models); observed `2026-08-30`; dynamic provider catalog; Program acceptance=`0`.

1.19.11 `OPENAI-RETRIEVE-MODEL`=[https://developers.openai.com/api/reference/typescript/resources/models/methods/retrieve](https://developers.openai.com/api/reference/typescript/resources/models/methods/retrieve); observed `2026-08-30`; dynamic provider reference; Program acceptance=`0`.

1.19.12 source denominator=`11/11 register entries physically named; 0/11 admitted into an accepted Program Source Universe`.
