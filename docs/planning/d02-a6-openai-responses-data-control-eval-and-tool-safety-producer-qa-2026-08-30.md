# 1. Connect — D02-A6 producer QA

## 1.1 Identity

1.1.1 subject=`docs/planning/d02-a6-openai-responses-data-control-eval-and-tool-safety-reconciliation-2026-08-30.md`.

1.1.2 subject SHA-256=`3788b73457a3bb25a679dc42875b641a21156f3b93e3b29676a3489e826ad3db`.

1.1.3 subject physical size=`465 lines; 30,592 bytes`.

1.1.4 QA type=`PRODUCER-MECHANICAL-AND-SOURCE-CONSISTENCY-QA`; this is not an independent semantic review and grants no acceptance.

1.1.5 safe state=`AI-OFF; Gate18.1 BLOCKED; Gate18.2 BLOCKED when Knowledge is in scope; Gate29 BLOCKED; development freeze ACTIVE`.

## 1.2 Executed checks

1.2.1 `Q01 physical identity`=`PASS`; SHA-256, line count and byte count were recomputed after the last patch.

1.2.2 `Q02 numbered clauses`=`PASS`; 213 clause lines match the required `1.section.clause` structure.

1.2.3 `Q03 duplicate clause identifiers`=`PASS`; no duplicate numbered clause identifier was found.

1.2.4 `Q04 official-source domain`=`PASS`; all eleven registered sources use `developers.openai.com`.

1.2.5 `Q05 deprecation correction`=`PASS`; the artifact records announcement `2026-06-03`, read-only date `2026-10-31`, shutdown date `2026-11-30`, hosted Evals OFF and a Connect-owned successor contract.

1.2.6 `Q06 predecessor conflict`=`PASS-MECHANICALLY`; the exact D02-A5 clauses superseded for Background and hosted Evals are named; independent semantic review remains required.

1.2.7 `Q07 retention dimensionality`=`PASS`; request `store`, ZDR/MAM, application state, abuse logs, Safety Retention, prompt cache, residency and third-party retention are not aliased; no unsupported caller-side cache-disable claim is made.

1.2.8 `Q08 tool authority`=`PASS`; initial tool set is empty, schema validity is separated from authorization, side effects remain forbidden and future tools require exact admission.

1.2.9 `Q09 prohibited business data`=`PASS`; mock, fake, demo, sample and synthetic business records cannot satisfy quality or readiness; normative hostile literals are restricted to named security boundaries.

1.2.10 `Q10 randomness rule`=`PASS`; the only randomness reference states that `Math.random()` is forbidden and that cryptographic key generation remains blocked pending exact use-specific approval.

1.2.11 `Q11 zero ledger`=`PASS`; source admission, account readbacks, corpus, runner, profile, canary and production permit remain zero.

1.2.12 `Q12 public-repository invariant`=`PASS`; the artifact contains no request or permission to change repository visibility and grants no GitHub mutation authority.

1.2.13 `Q13 exact progress/time`=`PASS`; exact percentage, remaining hours and ETA remain `unknown/unavailable` pending an accepted denominator and schedule.

1.2.14 `Q14 source observation`=`PASS-AS-PRODUCER-OBSERVATION`; current official pages were re-opened on `2026-08-30`, but Program source acceptance remains `0/11`.

## 1.3 Source facts rechecked

1.3.1 OpenAI data controls=`API training opt-in rule; abuse logs up to 30 days; ZDR/MAM prior approval; Responses and storage exceptions; Background temporary polling state; prompt-cache state; image/file exception; Project residency prerequisites and exclusions`.

1.3.2 OpenAI deprecations=`hosted Evals announced deprecated; exact read-only and shutdown dates; Promptfoo identified only as a migration path`.

1.3.3 OpenAI function calling and MCP=`strict schemas, parallel-call control, allowed-tool narrowing, approvals, prompt-injection and third-party data risk`.

1.3.4 OpenAI safety, red-team, RBAC and evaluation guidance=`human review, constrained behavior, authorized red-team scope, Organization/Project permissions, task-specific evaluation and human calibration`.

1.3.5 OpenAI model catalog and Retrieve model reference=`current Terra/Luna/Sol positioning plus authenticated model ID, owner, creation time and optional shutdown-date readback surface`; neither proves behavioral immutability or Connect fitness.

1.3.6 no source observation proves account eligibility, commercial terms, live Project settings, model entitlement, rate limits, spend limits, legal compliance or production readiness.

## 1.4 Producer verdict

1.4.1 mechanical verdict=`PASS`.

1.4.2 source-consistency verdict=`PASS-AS-UNACCEPTED-PRODUCER-OBSERVATION`.

1.4.3 independent semantic verdict=`NOT-RUN`.

1.4.4 D02-A6 Program acceptance=`0/1`.

1.4.5 required next action=`independent hostile review against all eleven live official sources and the predecessor conflict surface`.

1.4.6 no implementation may begin from this QA.
