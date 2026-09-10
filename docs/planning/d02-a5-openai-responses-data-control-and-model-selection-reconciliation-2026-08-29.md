# 1. Connect — D02-A5 OpenAI Responses data-control and model-selection reconciliation

## 1.1 Identity and scope

1.1.1 `decisionId=D02-A5`.

1.1.2 `artifactId=CONNECT-D02-A5-OPENAI-RESPONSES-DATA-CONTROL-MODEL-SELECTION-RECONCILIATION-2026-08-29`.

1.1.3 predecessor=`/Users/tal/Documents/connect/web/docs/planning/d02-a4-openai-model-routing-reconciliation-2026-08-29.md`.

1.1.4 research method=`OpenAI Docs skill plus fetched official OpenAI documentation only`; no fallback or third-party source was used.

1.1.5 `decisionStatus=SELECTED-FOR-PLANNING; NOT-ACCOUNT-VERIFIED; NOT-EVALUATED; NOT-IMPLEMENTED; AI-OFF`.

1.1.6 this amendment refines retention, endpoint, Eval and current-model facts; it preserves the user's D02 choice of OpenAI Responses API behind a server Adapter and an Eval gate.

1.1.7 no OpenAI request, API key, account/project mutation, purchase, Product code, Build, Runtime test, Git/GitHub, deployment or provider mutation occurred.

## 1.2 Official OpenAI source observations

1.2.1 data-control source=`https://developers.openai.com/api/docs/guides/your-data`; fetched current page on 2026-08-29 without a trusted signed provider timestamp.

1.2.2 the official page states API data is not used to train or improve OpenAI models unless the customer explicitly opts in.

1.2.3 default abuse-monitoring logs may contain customer content and are retained for up to 30 days, subject to stated exceptions; Zero Data Retention and Modified Abuse Monitoring require eligibility, approval and additional requirements.

1.2.4 for `/v1/responses`, the official table lists no training, default abuse-monitoring retention of 30 days and ZDR eligibility subject to limitations.

1.2.5 under ZDR, `store` is treated as `false`; `store:false` alone is not proof that the Organization or Project has ZDR.

1.2.6 the current guide states Background mode stores response data temporarily for polling and is not compatible with ZDR; Code Interpreter is unavailable under ZDR; remote MCP data is also governed by the third-party MCP server's retention policy.

1.2.7 the current table lists `/v1/conversations`, `/v1/vector_stores`, `/v1/files` and `/v1/evals` as not ZDR eligible and records application-state retention until deletion for those classes as applicable.

1.2.8 Responses reference=`https://developers.openai.com/api/reference/cli/resources/responses/methods/create`; it documents foreground Responses, explicit `store`, `max_tool_calls`, `tool_choice`, function tools with typed arguments, Structured Outputs and stateless encrypted reasoning content for eligible use cases.

1.2.9 the Responses reference distinguishes `previous_response_id` from `conversation`; a Conversation automatically persists items, so Connect will not use Conversations during the privacy-constrained Pilot.

1.2.10 Evals reference=`https://developers.openai.com/api/reference/java/resources/evals/methods/create`; it documents Eval data-source schemas and graders but does not make Eval storage ZDR eligible.

1.2.11 model source=`https://developers.openai.com/api/docs/models/compare`; current official positioning observed is Sol=`flagship for complex professional work`, Terra=`balance of intelligence and cost`, Luna=`cost-sensitive workloads`.

1.2.12 current observed token prices per one million tokens are Sol `$4 input/$20 output`, Terra `$2/$12` and Luna `$0.20/$1.20`; prices, limits and account availability are dynamic observations and not budget authority.

1.2.13 all three current pages list Responses, function calling and Structured Outputs; presence of a capability does not prove Connect quality, latency, privacy, policy fitness or entitlement.

## 1.3 Final Pilot planning decision

1.3.1 endpoint=`foreground /v1/responses`; required request setting=`store:false`; OpenAI Conversations=`OFF`; Background mode=`OFF`.

1.3.2 initial conversation-draft candidate=`gpt-5.6-terra` using one exact versioned profile only after the frozen Eval, Privacy, Legal, Security, budget and human-approval gates pass.

1.3.3 `gpt-5.6-luna=DORMANT`; it may be admitted only for a separately named low-risk/high-volume profile after non-inferiority, safety, latency and cost evidence.

1.3.4 `gpt-5.6-sol=DORMANT`; it may be admitted only as a human-requested high-complexity escalation profile after material quality-gain and budget evidence.

1.3.5 moving aliases, silent model substitution, automatic fallback and automatic reasoning-effort escalation are forbidden; any profile/provider failure returns `AI-OFF-HUMAN-ONLY`.

1.3.6 all OpenAI built-in side-effect tools, Computer use, Shell, Code Interpreter, remote MCP, hosted File search, hosted Web search, Files, Vector stores and Conversations remain disabled for the initial Pilot.

1.3.7 Knowledge retrieval remains Connect-owned and Tenant-scoped; only the minimum approved excerpt enters a request after the separate Knowledge/Privacy gates.

1.3.8 model output is a draft fact, never Authority. Structured schema validity cannot authorize WhatsApp send, consent change, campaign change, deletion, billing, permission or external tool effect.

## 1.4 Eval storage and evidence decision

1.4.1 customer conversation bytes must not be uploaded to `/v1/evals` during the Pilot because the current official data-control table marks Evals not ZDR eligible and retained until deletion.

1.4.2 the initial readiness Eval runs in a Connect-controlled evaluator over an approved minimized/redacted real corpus or normative security literals, with only request-minimized cases sent to foreground Responses under the active data-control contract.

1.4.3 no mock, fake, demo, sample or synthetic business conversation may satisfy quality readiness; deterministic hostile strings may prove only the named security boundary.

1.4.4 if hosted Evals are later desired, a separate amendment must bind exact Project, retention, deletion verification, corpus classification, Legal/Privacy approval and an Evidence export/erasure plan.

1.4.5 every Eval case binds immutable input identity, provenance/purpose, profile root, expected allowed/forbidden claims, required escalation, schema oracle, security oracle, grader identity and one terminal.

1.4.6 graders that use another model are not ground truth by themselves; hard safety assertions require deterministic or independently human-reviewed oracles.

## 1.5 Privacy, identity and retention gates

1.5.1 live OpenAI Organization and Project settings, ZDR/MAM eligibility, region, approved models, rate limits and spend limits=`unknown/unavailable` until authorized read-only provider Evidence.

1.5.2 Connect must disclose the actually proved retention mode. `store:false`, ZDR, MAM, Eyes Off, Safety Retention, data residency and local deletion are separate states and may not be aliased.

1.5.3 a privacy-preserving `safety_identifier` may be sent only from an approved keyed, framed, versioned and purpose-separated derivation; raw PII and plain unsalted hashes are forbidden.

1.5.4 key generation requiring cryptographic randomness remains blocked until Tal gives exact use-specific approval; no random identifier or `Math.random()` is permitted.

1.5.5 prompt/completion content is excluded from normal logs; Evidence records allowed redacted facts, roots, usage, terminal and request identifier only when classification permits.

1.5.6 every change in model ID, model behavior, endpoint, data-control page, account setting, price, rate/spend limit, prompt, schema, tool set, evaluator, Legal basis or Meta classification invalidates the active profile.

## 1.6 Rate, cost and operational controls

1.6.1 enforce server-side per-Organization, Project, Tenant, user, purpose and profile request/token/cost budgets below the live provider ceilings.

1.6.2 provider rate-limit and spend-limit values are live inputs, not constants; missing or stale values may reduce/disable AI and may never increase allowance.

1.6.3 `max_tool_calls` is a provider request bound, not complete business authorization; Connect's tool allowlist, per-call approval and side-effect prohibition remain mandatory.

1.6.4 timeout, incomplete, cancelled, failed, queued or ambiguous provider states receive typed terminals; there is no blind retry or silent alternate model.

1.6.5 cost forecasts must use observed token counts, exact profile price snapshot, tool charges, cache/service tier and retry state; a catalog price alone is not an invoice or spend cap.

## 1.7 Acceptance and supersession

1.7.1 D02-A5 supersedes D02-A4 only for official-source facts and the added hosted-Eval restriction; it preserves the Terra-first evaluated Pilot decision and dormant Luna/Sol policy.

1.7.2 required approvers=`Product, AI Engineering, Security, Privacy/Legal, Finance/Cost, WhatsApp/Meta policy`; named appointments and exact receipts=`unknown/unavailable`.

1.7.3 accepted Source Universe, Task membership, real redacted Eval corpus, account Evidence and independent review remain absent.

1.7.4 `D02-A5 accepted=0/1`; AI runtime=`OFF`; Gate18.1=`BLOCKED`; Gate18.2=`BLOCKED when Knowledge is in scope`; Gate29=`BLOCKED`.

1.7.5 no implementation may begin until this Decision is admitted into an accepted Program Task universe and the development freeze is explicitly lifted after exact-root Master approval.
