# 1. Connect — WhatsApp live-limit verification plan for Tal

## 1.1 Goal and authority

1.1.1 goal=`prove the exact limits and policy state of the approved Pilot Meta assets without sending a message or changing an asset`.

1.1.2 owner Candidate=`Tal — research and development of WhatsApp rate limiting`; named Appointment and backup owner remain `unknown/unavailable` until formally recorded.

1.1.3 execution status=`PLANNED-ONLY`; this plan grants no credential use, Meta login, live read, message send, Template submission, phone registration or account mutation.

1.1.4 prerequisite=`accepted B0,accepted Source Universe,approved read-only Permit,named asset owner,approved secret handling,exact Pilot business portfolio/WABA/phone scope and sanitized Evidence destination`.

## 1.2 Beginner logic

1.2.1 Meta has several independent limits; one headline “messages per second” number cannot describe the real send permission.

1.2.2 a message may pass a speed limit and still be forbidden because consent, the 24-hour window, Template approval, quality, recipient suppression, business category or budget fails.

1.2.3 the dispatcher therefore computes an AND of authorization predicates and a minimum across numeric ceilings.

1.2.4 conceptual rule=`maySend = authorizationPassed AND everyRequiredLimitFresh AND everyRemainingBudget>0`.

1.2.5 conceptual allowance per dimension=`effectiveAllowance=min(approvedConnectCap,freshProviderObservedAllowance)`; unknown, stale or conflicting input contributes `0`.

## 1.3 Exact read-only inventory

1.3.1 record immutable scope identities for `Meta business portfolio,WABA,App,business phone number,Graph API version,Environment`; store only approved opaque references in Public-safe artifacts.

1.3.2 read phone connection/registration state, verified display-name state and `quality_rating` from the exact approved asset.

1.3.3 read the current business-initiated messaging limit, its scope, current consumption window, reset semantics and any scaling/restriction status exposed by WhatsApp Manager or an approved current API field.

1.3.4 read the active business-phone throughput/capacity state and any high-throughput eligibility; capture the exact field/label and source revision rather than translating it to a remembered tier.

1.3.5 read App/WABA Business Use Case call limits, applicable rolling window, observed remaining state and response-header semantics where officially exposed.

1.3.6 read all active Template identities, category, language, status, quality/pause/disable state and last provider change.

1.3.7 read account, portfolio, phone and per-user marketing restrictions visible to the approved operator; undisclosed limits remain typed `PROVIDER-UNDISCLOSED`, not zero Evidence.

1.3.8 read current webhook subscriptions, Graph version, message-status fields and retry/delivery documentation without triggering a send.

## 1.4 Canonical LimitSnapshot fields

1.4.1 identity fields=`snapshotId,sourceResponseRoot,businessPortfolioRef,wabaRef,appRef,phoneRef,graphVersion,environment`.

1.4.2 time fields=`observedAtTrusted,providerWindowStart,providerWindowEnd,expiresAt,clockSourceRoot`.

1.4.3 authority fields=`readerAppointmentRoot,readOnlyPermitRoot,assetOwnerReceiptRoot,secretProfileRoot,redactionProfileRoot`.

1.4.4 numeric fields=`dimension,scope,providerCeiling,providerRemaining,connectCap,connectRemaining,unit,windowDefinition,burstDefinition`.

1.4.5 policy fields=`phoneState,qualityState,messagingRestrictionState,templateState,consentPolicyRoot,serviceWindowPolicyRoot,optOutPolicyRoot`.

1.4.6 provenance fields=`officialURL,providerFieldPath,responseStatus,responseHeadersRoot,responseBodyRootOrWithheldReason,documentationRoot,collectionRevision`.

1.4.7 lifecycle fields=`status,changeTriggers,invalidationSet,safeState,successorSnapshotId,revokedAt,revocationReason`.

1.4.8 secret and customer-content fields are forbidden in the snapshot; raw credentials, phone numbers, message bodies and recipient lists must not enter Public Evidence.

## 1.5 Limit dimensions that must be proven separately

1.5.1 `LIM-WA-01=business-portfolio/WABA API-call budget`.

1.5.2 `LIM-WA-02=App-level Graph/API budget`.

1.5.3 `LIM-WA-03=business-phone send/receive throughput`.

1.5.4 `LIM-WA-04=recipient-pair pacing and concurrency`.

1.5.5 `LIM-WA-05=business-initiated unique-recipient allowance`.

1.5.6 `LIM-WA-06=per-user marketing suppression`.

1.5.7 `LIM-WA-07=Template creation/submission/edit budget`.

1.5.8 `LIM-WA-08=media upload/download budget and object limits`.

1.5.9 `LIM-WA-09=Webhook delivery/retry capacity`.

1.5.10 `LIM-WA-10=Connect Tenant/Campaign/recipient/purpose cost and safety caps`.

1.5.11 a missing dimension cannot be silently removed from the denominator; it is `UNKNOWN`, `NOT-APPLICABLE` with approved proof, or `PROVED`.

## 1.6 Future non-mutating verification procedure

1.6.1 verify the approved reader identity, MFA, read-only Permit and exact asset allowlist before opening the provider console or API.

1.6.2 retrieve each value once through an approved read path; do not send test messages, submit Templates or change settings under this procedure.

1.6.3 retain the exact response bytes in a private Evidence store when policy permits; otherwise retain an approved digest plus typed withholding reason and independent screen/readback receipt.

1.6.4 redact secrets and direct identifiers before creating any Public-safe projection; verify the projection with two independent secret/PII scanners.

1.6.5 compare console and API values when both exist; disagreement yields `CONFLICT-BLOCKED` and allowance `0` for the affected dimension.

1.6.6 repeat the read after the documented provider propagation interval; do not infer stability from one observation.

1.6.7 obtain independent Security/Operations review, then Tal signs only the exact Snapshot root and claim scope—not a handwritten numeric summary.

## 1.7 Future controlled send characterization

1.7.1 this stage is post-Gate29 and requires a separate explicit instruction plus Legal/Meta/asset-owner approval.

1.7.2 use only real opted-in Pilot recipients authorized for the exact purpose; no fake, demo, sample or synthetic business recipient/data may satisfy readiness.

1.7.3 begin below approved Connect Pilot caps; one controlled message intent, one recipient, one Template/window context and one expected terminal per test.

1.7.4 increase load only through pre-approved deterministic steps; automatic upward scaling and exploratory bursts are forbidden.

1.7.5 stop immediately on opt-out, policy/quality/restriction change, unexpected error, stale snapshot, budget breach, duplicate/ambiguous terminal or owner revocation.

1.7.6 observe accepted request, provider message identity, webhook delivery states, latency, error class and limiter counters; accepted API response is not proof of recipient delivery.

1.7.7 pair/concurrency tests require explicit recipients and purpose authorization; they cannot be inferred from aggregate throughput tests.

## 1.8 Error and retry classification

1.8.1 `RATE-LIMIT-VERIFIED` may retry only according to a current verified provider hint or an approved bounded deterministic schedule.

1.8.2 `POLICY,QUALITY,CONSENT,OPT-OUT,TEMPLATE,PERMISSION,RECIPIENT,INVALID-PAYLOAD` are non-retryable until a new authoritative state exists.

1.8.3 `UNKNOWN,AMBIGUOUS,PROVIDER-SCHEMA-DRIFT` create human review and do not receive blind retry or provider fallback.

1.8.4 timeouts before and after provider acceptance are different terminals; recovery queries the original identity before any new attempt.

1.8.5 retry count, delay and deadline values remain `unknown/unavailable` until the exact error catalogue and live behavior are admitted.

1.8.6 no `Math.random()` may implement jitter; cryptographic randomness for a specifically approved use requires Tal's separate exact approval.

## 1.9 Acceptance checklist

1.9.1 all ten `LIM-WA` dimensions have one current state and one safe fallback.

1.9.2 every numeric value has unit, scope, window, provider field/source, root, trusted observation time and expiry.

1.9.3 console/API conflicts=`0`; stale required dimensions=`0`; secret/PII findings in Public projection=`0`.

1.9.4 every active limiter is below or equal to the corresponding provider observation and approved Connect cap.

1.9.5 all authorization predicates remain separate from throughput; passing one never grants another.

1.9.6 approved negative tests cover missing, stale, conflicting, lower, revoked and provider-undisclosed states.

1.9.7 named Tal/backup, Security, Operations, Meta asset owner, Privacy/Legal and Product approvals are current and exact-root bound.

1.9.8 current result=`0/10 limit dimensions live-proved`; autonomous campaign dispatch=`OFF`; numerical sign-off=`BLOCKED`; Gate29=`BLOCKED`; development freeze=`ACTIVE`; repository=`PUBLIC`.
