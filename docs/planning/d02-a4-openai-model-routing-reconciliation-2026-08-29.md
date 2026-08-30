# 1. Connect — D02-A4 OpenAI Model-routing Reconciliation

## 1.1 Identity and decision status

1.1.1 `decisionId=D02-A4`.

1.1.2 `artifactId=CONNECT-D02-A4-OPENAI-MODEL-ROUTING-RECONCILIATION-2026-08-29`.

1.1.3 research date=`2026-08-29`; trusted authority timestamp=`unknown/unavailable`.

1.1.4 decision status=`SELECTED-FOR-PLANNING; NOT-EVALUATED; NOT-IMPLEMENTED; AI-OFF`.

1.1.5 this Decision resolves a planning conflict only. It performs no OpenAI request, API-key use, account mutation, purchase, Product Code change, Build, runtime Test, Git mutation, Push, Deployment or Production action.

1.1.6 official-source method=`OpenAI Docs skill; current official OpenAI documentation only`; no bundled fallback was required.

# 2. Conflict being reconciled

2.1 Tal's original D02 choice selects OpenAI Responses API behind an Adapter and requires an Eval gate.

2.2 `researched-decision-approval-2026-08-26.md` selects GPT-5.6 Luna as the default and permits Terra only after a material Eval improvement.

2.3 Master clauses5.2 and5.2.4 select Terra as the primary conversation model, Sol as constrained escalation and Luna only for narrow, high-volume Work after a separate Eval.

2.4 no exact supersession receipt was present in G0, so both documents could not remain authoritative.

# 3. Current official OpenAI facts

3.1 the current [OpenAI model catalog](https://developers.openai.com/api/docs/models) positions GPT-5.6 Sol as the flagship model for complex professional Work, Terra as the balance of intelligence and cost, and Luna for cost-sensitive high-volume Work.

3.2 the current [GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model) says the unsuffixed `gpt-5.6` alias routes to Sol and directs developers to select a model by workload; it also recommends representative testing and intentional Reasoning effort.

3.3 current listed model IDs are `gpt-5.6-sol`, `gpt-5.6-terra` and `gpt-5.6-luna`; Connect will never use the unsuffixed moving alias in an approved profile.

3.4 current official token prices observed on the catalog/model pages are Sol `$4 input/$20 output`, Terra `$2/$12` and Luna `$0.20/$1.20` per one million tokens, before cache/tool/service-tier and long-context effects. These are dated observations, not runtime constants or budget approvals.

3.5 all three model pages list Responses API, function calling and Structured Outputs support; documented capability presence does not prove Connect quality, safety, latency, retention, account entitlement or region suitability.

3.6 the [OpenAI data-controls guide](https://developers.openai.com/api/docs/guides/your-data) states that API data is not used for training by default, while default abuse-monitoring logs may contain customer content for up to 30 days unless approved controls apply.

3.7 `store:false` controls Response application-state storage; it is not by itself Zero Data Retention. ZDR/MAM require prior OpenAI approval and additional requirements.

3.8 without ZDR, supported-model queries use extended prompt caching; the same guide states that encrypted cache state may remain up to 24 hours, while GPT-5.6 `prompt_cache_options.ttl` is a minimum cache lifetime rather than that maximum-retention control.

3.9 the Responses create reference recommends a stable privacy-preserving `safety_identifier` for individual users; Connect's stronger keyed, versioned, purpose-separated derivation remains a local Security design and is not proved by the documentation.

# 4. Decision

## 4.1 Pilot model policy

4.1.1 `conversation-draft-primary=gpt-5.6-terra` after all Eval, Privacy, Meta, budget, account and human-approval Gates pass.

4.1.2 `gpt-5.6-luna=DORMANT` during the initial closed Pilot; it may become active later only for a separately named narrow, high-volume, low-risk profile whose own Eval meets every hard safety and quality threshold.

4.1.3 `gpt-5.6-sol=DORMANT` during the initial closed Pilot; it may become an explicit human-requested escalation profile only after a separate Eval proves material quality gain worth its latency and cost.

4.1.4 the unsuffixed `gpt-5.6` alias is forbidden because it routes to Sol and can hide a cost/behavior decision.

4.1.5 no automatic model fallback or silent upgrade/downgrade is permitted. Terra timeout, refusal, provider outage, budget exhaustion, stale profile or failed policy check yields `AI-OFF-HUMAN-ONLY`.

4.1.6 this is an engineering recommendation inferred from the official workload positioning and Connect's Hebrew customer-conversation drafting risk; OpenAI does not prescribe Terra specifically for Connect.

## 4.2 Reasoning and profile policy

4.2.1 Pilot starts with one immutable Terra profile Candidate and an Eval of `reasoning.effort=low` versus `medium`; no effort is promoted without measured quality, latency and cost evidence.

4.2.2 `high`, `xhigh`, `max` and Pro mode remain disabled for live customer drafts until a task-specific quality-first Eval and budget approval justify them.

4.2.3 every active profile binds exact model ID, Reasoning effort, prompt root, Structured Output schema root, allowed tool set, data-minimization profile, timeout, token ceilings, cost ceiling, safety policy, Eval root, release root and expiry.

4.2.4 any model, price, safeguard, SDK, endpoint, prompt, tool, retention, account setting or Terms change invalidates the profile and returns AI to Human-only until re-evaluation.

## 4.3 Endpoint and tool policy

4.3.1 use foreground `/v1/responses` only with explicit `store:false` after account/project Data-control readback.

4.3.2 Pilot forbids OpenAI Conversations, Files, Vector stores, hosted File search, Web search, Remote MCP, Computer use, Hosted shell, Code interpreter, Background mode and model-triggered business tools.

4.3.3 Knowledge/RAG stays Connect-owned and server-side; only minimized retrieved excerpts approved for the exact Tenant, Purpose and profile may enter the request after Gate18.2.

4.3.4 the model returns a draft only. It cannot send WhatsApp messages, change consent, modify a campaign, delete data, bill, alter permissions or call an external side-effect tool.

## 4.4 Privacy and Meta policy

4.4.1 no Raw phone number, email, Secret, access token, Tenant name, provider credential, full customer identifier or unnecessary personal field is sent.

4.4.2 `store:false` is mandatory but is not advertised as ZDR; Privacy notice, DPIA, DPA and subprocessor records disclose the actual account-approved retention boundary.

4.4.3 ZDR/MAM, if pursued, requires live OpenAI approval Evidence and project-level readback; absence or ambiguity leaves the default retention disclosure and may keep AI disabled if Legal rejects it.

4.4.4 `safety_identifier` uses only an approved keyed, framed, versioned, Environment+Tenant+Purpose-separated derivation. Raw PII and plain hashes are forbidden; any required CSPRNG/key-generation use remains blocked by exact use-specific X24 approval.

4.4.5 WhatsApp Business Solution Data is processed only under a written third-party-service-provider and Meta/Legal classification that permits the exact purpose. It is never used to train or improve a cross-customer model.

# 5. Eval and promotion contract

## 5.1 Eval input

5.1.1 quality evaluation uses only an approved, minimized and redacted real Pilot corpus with documented consent/purpose/provenance/retention, or a normative official vector where applicable.

5.1.2 no fake, mock, demo, sample or synthetic business conversation is readiness Evidence.

5.1.3 deterministic non-business attack literals may be used for prompt-injection, exfiltration, schema, refusal and boundary tests; they prove only the named security assertion.

5.1.4 until Legal/Privacy approve the real redacted corpus, no model may be promoted for customer drafting.

## 5.2 Eval partitions

5.2.1 separate immutable partitions cover Hebrew, English, mixed language, RTL/Bidi, spelling/noise, long context, ambiguous intent, regulated/sensitive content, opt-out, escalation, prompt injection, unsupported claims, policy refusal and provider failure.

5.2.2 training/tuning, threshold-selection and final holdout partitions are identity-separated; a case used to tune a prompt cannot receive final holdout credit.

5.2.3 every case binds expected allowed claims, forbidden claims, required escalation, Structured Output validity, data-leak oracle and one human-review rubric.

## 5.3 Hard gates

5.3.1 zero Tenant/customer cross-leak, Secret exposure, unauthorized tool/side-effect request, autonomous send, opt-out bypass, fabricated approval or unsafe policy override.

5.3.2 zero schema escape on fields used by downstream authorization or routing; model text is never Authority even when schema-valid.

5.3.3 all P0/P1 attack and failure cases pass twice under independent runners; every required mutation is killed twice.

5.3.4 quality, human-acceptance/edit-distance, escalation accuracy, latency and cost thresholds remain `unknown/unavailable` until Product, Support, Finance and AI/Security owners approve exact values from the real Pilot objective.

5.3.5 insufficient sample size, missing owner, changed corpus, changed model profile or statistical ambiguity is `NO-PROMOTION`, never a tie-break in favor of the cheaper or stronger model.

## 5.4 Comparative promotion

5.4.1 Terra must independently pass the Pilot hard gates; it is not promoted merely because it beats Luna.

5.4.2 Luna may replace Terra only for one named profile when it independently passes all hard gates and its quality lower bound meets the approved non-inferiority margin while providing material capacity/cost benefit.

5.4.3 Sol may be added only for one named escalation profile when it independently passes all hard gates and shows an approved material quality improvement over Terra within the escalation budget.

5.4.4 model comparison uses the same frozen corpus, prompt/profile constraints, service tier and scoring procedure; unequal inputs or hidden retries invalidate the comparison.

# 6. Runtime safety and Evidence requirements

6.1 one server-side Adapter owns all OpenAI calls; Browser and client bundle contain no OpenAI Key, Bearer token or direct OpenAI endpoint call.

6.2 every authorized call records a redacted Intent, profile digest, model ID, Reasoning effort, input classification outcome, token/cost observation, provider request identifier if safe, terminal, human approval and invalidation state.

6.3 no prompt or completion content enters logs by default; Evidence stores approved redacted assertions and digests, not customer content.

6.4 per-Tenant, per-user, per-purpose and provider-account rate/cost limits are layered; budget threshold or anomalous usage trips the AI Kill switch without affecting Human-only inbox operation.

6.5 timeout after provider acceptance is a typed unknown result; generation may be retried only under the exact idempotency/reconciliation contract and never causes a business side effect by itself.

6.6 detection covers model/profile drift, unexpected alias, missing `store:false`, forbidden tool, PII classifier, prompt injection, cost/latency, refusal, schema failure, safety event, Eval decay and provider/account-control drift.

6.7 rollback=`disable the exact model/profile, revoke its configuration permit and route the user to Human-only; do not silently substitute a model`.

# 7. Acceptance and supersession

7.1 this Decision supersedes the 26.08 Luna-default routing and adopts the Master Terra-primary direction with stricter initial-Pilot single-model and fail-closed constraints.

7.2 it does not supersede the user's Responses-API choice, human approval requirement, AI-as-assistive-only boundary, Eval ownership, Data minimization or ZDR caveats.

7.3 required named approvers=`Product, AI Engineering, Security, Privacy/Legal, Finance/Cost and WhatsApp/Meta policy`; current appointments=`unknown/unavailable`.

7.4 exact live OpenAI account/project eligibility, Data controls, region, rate limits and budget=`unknown/unavailable`.

7.5 D02-A4 accepted=`0/1`; Gate18.1=`BLOCKED`; Gate18.2=`BLOCKED when Knowledge/RAG/File is in Scope`; Gate29=`BLOCKED`; AI runtime=`OFF`.

7.6 no implementation may begin before this Decision is incorporated into an accepted Task universe and the current development freeze is explicitly lifted.
