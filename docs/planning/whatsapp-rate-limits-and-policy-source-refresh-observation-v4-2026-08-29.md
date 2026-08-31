# 1. Connect — WhatsApp rate limits and policy source refresh observation v4

## 1.1 Identity and boundary

1.1.1 `observationId=CONNECT-WHATSAPP-RATE-LIMIT-POLICY-SOURCE-REFRESH-2026-08-29-O4`.

1.1.2 predecessor=`/Users/tal/Documents/connect/web/docs/planning/whatsapp-rate-limits-and-policy-source-refresh-observation-v3-2026-08-29.md`.

1.1.3 `observationClass=READ-ONLY-OFFICIAL-SOURCE-AND-PUBLIC-COLLECTION-READBACK; NOT-LIVE-WABA-EVIDENCE; NOT-IMPLEMENTATION; NOT-ACCEPTANCE`.

1.1.4 no credentialed Meta call, message send, Template submission, account/asset mutation, Product change, Build, Runtime test, Git or GitHub action occurred.

1.1.5 repository visibility remains `PUBLIC`; secrets, tokens, WABA identifiers, phone-number identifiers and customer data were neither requested nor recorded.

## 1.2 Current official sources read

1.2.1 official WhatsApp Business Messaging Policy=`https://whatsappbusiness.com/policy/`; read on 2026-08-29; exact signed publication timestamp=`unknown/unavailable`.

1.2.2 official Meta WhatsApp Business Platform Postman workspace=`https://www.postman.com/meta/whatsapp-business-platform/overview`; the workspace identifies its WhatsApp Cloud API collection as Meta's official collection.

1.2.3 public collection identity=`owner 13382743;team 1367031;collection 84d01ff8-4253-4720-b454-af661f36acc2;name WhatsApp Cloud API;lastRevision 49422662705;updatedAt 2026-05-14T22:42:30.000Z`.

1.2.4 collection read endpoint=`https://www.postman.com/_api/collection/13382743-84d01ff8-4253-4720-b454-af661f36acc2?populate=true`; read-only response identity=`729545 bytes;SHA-256 b2e4501315b2e0f3cd9b444574b00af5a4e8757eadd40353db0beca5ae80ff1f`; observed cardinality=`78 folders/162 requests`.

1.2.5 the response bytes were inspected in temporary storage only and were not copied into the Public repository because the official collection includes provider examples/placeholders that are not Connect business data and are not an accepted Program corpus.

1.2.6 direct Meta developer pages for Cloud API overview, messaging limits, sending and error codes returned HTTP `429 Too Many Requests` during this refresh; their current exact bytes, revisions and numeric claims were therefore not admitted.

## 1.3 Official policy facts that are admissible for planning

1.3.1 a business may contact a person only after receiving the person's mobile number and opt-in permission for subsequent WhatsApp messages or calls.

1.3.2 the business must honor opt-out, block and discontinuation requests, including requests received outside WhatsApp.

1.3.3 a business may initiate a conversation only with an approved Message Template used for its designated purpose.

1.3.4 a non-Template reply is allowed only within 24 hours of the person's last message; outside that customer-service window, only an approved Template may be sent.

1.3.5 automation during the 24-hour window requires a prompt, clear and direct human-escalation path.

1.3.6 negative feedback, harmful behavior, policy violations, low sustained quality or unauthorized messaging at scale can cause messaging/calling restrictions or loss of access.

1.3.7 policy may change without notice where law permits; every policy-dependent allowance therefore needs freshness, invalidation and a safe state.

1.3.8 the current official collection names the permissions `whatsapp_business_management` and `whatsapp_business_messaging`, exposes phone-number `quality_rating`, and links to Meta quality-signal guidance; collection presence is not live entitlement or current WABA state.

## 1.4 Numeric limits that remain unproved

1.4.1 the exact current per-phone throughput, high-throughput eligibility and upgrade ceiling=`unknown/unavailable`.

1.4.2 the exact current business-portfolio/WABA API-call window and formula=`unknown/unavailable`.

1.4.3 the exact per-recipient pair limit and burst/recovery rule=`unknown/unavailable`.

1.4.4 the exact business-initiated unique-recipient tiers, scope, scaling criteria and downgrade rule=`unknown/unavailable`.

1.4.5 the exact per-user marketing-message limit and suppression behavior=`unknown/unavailable`.

1.4.6 test-number/unverified-account recipient and message limits=`unknown/unavailable` for Production planning.

1.4.7 exact error-code catalogue, retryability, `Retry-After` behavior and cool-down periods=`unknown/unavailable`.

1.4.8 Template creation/submission/edit limits, media upload/download limits, Webhook delivery/retry limits and Graph API version-specific limits=`unknown/unavailable` unless separately admitted from current official bytes.

1.4.9 provider-side message retention and deletion behavior=`unknown/unavailable`; no retained third-party or stale-copy numeric statement receives authority from this observation.

1.4.10 the current populated official collection contains zero matches for `Message Throughput`, `80 messages per second`, `1000 mps`, `1800000`, `80007`, `130429`, `131056` and `retention period`; absence does not prove that no limit exists, only that this exact collection root cannot prove those claims.

## 1.5 Binding planning decision for Tal's rate-limit responsibility

1.5.1 no numeric Meta limit may be hard-coded as provider truth from memory, a blog, an unofficial collection fork, a search snippet or an older copied page.

1.5.2 each active allowance is computed as the minimum of independently scoped Connect safety caps and fresh live provider/account observations; missing, stale or conflicting provider state may only reduce or disable allowance.

1.5.3 required limiter dimensions are at least `Business portfolio/WABA,App,PhoneNumber,Tenant,Campaign,TemplateCategory,Recipient,Purpose,MessageClass,MediaClass,GraphVersion,TimeWindow`.

1.5.4 queue admission, scheduling and dispatch must re-read the same versioned LimitSnapshot; a queued item does not reserve permanent permission to send.

1.5.5 consent, opt-out, 24-hour window, Template status, quality/restriction state, Tenant budget and recipient suppression are authorization predicates, not throughput counters.

1.5.6 Connect must implement lower Pilot caps chosen by Security/Operations after live observation; a provider ceiling is not a recommended operating rate.

1.5.7 retry policy is error-class-specific and bounded; ambiguous, policy, permission, quality, recipient, Template or unknown errors never receive blind automatic retry.

1.5.8 backoff must honor a verified provider retry hint when present, otherwise use a bounded deterministic schedule; jitter requiring cryptographic randomness remains blocked until Tal gives exact use-specific approval, and `Math.random()` is forbidden.

1.5.9 every send attempt records only approved minimized Evidence: immutable intent, consent/window/template snapshot roots, limiter snapshot root, queue/dispatch terminal, provider request/message identifier when permitted, and redacted error classification.

1.5.10 required live Pilot Evidence includes current WABA/business-portfolio limits, phone status and quality, Template states, current Graph version, observed response headers/error payloads, Webhook terminals, actual account restrictions, budget and named owner; secrets and customer content are excluded.

## 1.6 Safe state and next verification

1.6.1 until 1.5.10 is admitted and reviewed, autonomous campaign dispatch=`OFF`; business-initiated bulk messaging=`OFF`; unknown numeric allowance=`0` for the affected dimension.

1.6.2 approved human-supervised Pilot sends remain blocked until the separate Meta asset, consent, Template, Legal, Security, budget and release gates pass.

1.6.3 next verification path=`authorized read-only export from the exact Pilot Meta assets plus current accessible official limit/error documentation`; it must not send a message or mutate an asset.

1.6.4 Tal's planning recommendation=`live-derived layered limiter, fail-closed, low internal Pilot caps, no automatic upward scaling, and one explicit approval before every outbound AI draft during the Pilot`.

1.6.5 numerical research status=`PARTIALLY IMPROVED BUT NOT LIVE-PROVED`; Tal numerical sign-off remains blocked; Gate29 remains blocked; development freeze remains active.
