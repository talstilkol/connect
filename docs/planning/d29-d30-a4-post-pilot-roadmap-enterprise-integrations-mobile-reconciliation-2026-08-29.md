# 1. Connect — D29/D30-A4 Post-Pilot roadmap, Enterprise, Integrations and Mobile reconciliation

## 1.1 Identity and decision status

1.1.1 `decisionIds={D29-A4,D30-A4}`.

1.1.2 `artifactId=CONNECT-D29-D30-A4-POST-PILOT-ROADMAP-ENTERPRISE-INTEGRATIONS-MOBILE-RECONCILIATION-2026-08-29`.

1.1.3 research date=`2026-08-29`; trusted authority timestamp=`unknown/unavailable`.

1.1.4 decision status=`SELECTED-FOR-PLANNING; PILOT-EVIDENCE-ABSENT; CONDITIONAL-CAPABILITIES-OFF`.

1.1.5 this Decision performs no Product Code change, Build, runtime Test, Git mutation, Push, Deployment, provider/account mutation, credential use, purchase, customer contact, public API publication or Production action.

# 2. Beginner-facing logic

## 2.1 Why the Roadmap is gated

2.1.1 a feature can be technically impressive and still fail to solve a repeated paying-customer problem.

2.1.2 Enterprise, native Mobile, public APIs and many Integrations create permanent Security, Support, Compatibility and Documentation costs.

2.1.3 building them before evidence reduces the time available to make the core Inbox, Campaign, Consent and WhatsApp delivery loop reliable.

2.1.4 therefore Connect prepares stable internal boundaries now but creates no customer-facing surface until an explicit exit threshold passes.

## 2.2 Evidence hierarchy

2.2.1 strongest Product evidence=`repeated completed workflow and paid renewal behavior`.

2.2.2 next evidence=`multiple paying Tenants request the same outcome and accept the same boundary`.

2.2.3 weaker evidence=`qualified signed design-partner commitment with exact Scope and owner`.

2.2.4 insufficient evidence=`one loud request, competitor feature count, social-media trend, unqualified lead, internal preference or hypothetical persona`.

# 3. Current standards and risk observations

## 3.1 Future API contract

3.1.1 the [OpenAPI Specification](https://spec.openapis.org/oas/) remains the selected machine-readable contract family; an exact supported minor version is frozen per API release rather than following `latest` silently.

3.1.2 [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) is the selected Problem Details basis for HTTP API errors; human-readable `detail` is never parsed as authority and must not leak internals.

3.1.3 [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) defines current HTTP semantics including `Retry-After`; Connect still needs an application-specific idempotency and side-effect contract.

3.1.4 [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html) is a Candidate basis for future signed HTTP messages; it is not sufficient alone and requires a Connect profile for covered components, content digest, algorithm, key, time, replay and rotation.

3.1.5 the current [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x03-introduction/) remains an awareness input, not an exhaustive Security acceptance standard; object/function authorization and sensitive business-flow abuse must receive explicit controls and tests.

## 3.2 Enterprise identity

3.2.1 [SAML 2.0](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) is a Candidate federation protocol for qualified Enterprise demand.

3.2.2 [SCIM RFC 7644](https://www.rfc-editor.org/info/rfc7644/) is a Candidate provisioning protocol and has later updates; an exact profile/version/errata set must be frozen when that capability enters Scope.

3.2.3 SAML or SCIM presence does not prove Tenant authorization, role mapping, deprovisioning, break-glass, session invalidation, Audit or customer IdP interoperability.

## 3.3 PWA versus native Mobile

3.3.1 the current [W3C Web Application Manifest](https://www.w3.org/TR/appmanifest/) is still a Working Draft while browser implementations ship subsets.

3.3.2 Connect therefore treats installability as progressive enhancement and tests each supported browser/device matrix; PWA cannot be advertised as equal to every native capability.

3.3.3 native iOS/Android remains unjustified until a measured workflow failure requires an approved native-only capability.

# 4. D29 Roadmap decision

## 4.1 Ranking method

4.1.1 selected method=`PILOT-EVIDENCE-RANKED`.

4.1.2 candidate score numerator=`payingTenantsAffected × workflowFrequency × measuredOutcomeMagnitude × evidenceConfidence`.

4.1.3 candidate score denominator=`acceptedNetEffort + expectedRework + recurringOperationsAndSupportCost`.

4.1.4 Security, Legal, Privacy, Meta policy and external-authority constraints are hard Gates, not numeric discounts.

4.1.5 exact scale, observation window, confidence rubric and tie-break values remain `unknown/unavailable` until Product/Finance/Data approve a real Pilot measurement plan.

4.1.6 the score ranks eligible candidates only; it never overrides a blocked Gate or creates an entitlement to build.

## 4.2 Capacity rule

4.2.1 first post-Pilot cycle reserves `50%` of accepted team capacity for Reliability, Security, Privacy, Compliance, accessibility and operational debt.

4.2.2 the reserve may fall no lower than `30%` only after four consecutive weeks inside accepted SLOs, zero open P0/P1, passed Restore and Rollback exercises and no unresolved Meta/provider safety incident.

4.2.3 missing or low-quality telemetry keeps the reserve at 50%; it is not evidence that Reliability is good.

4.2.4 capacity percentages are planning policies, not current staffing evidence; named role calendars remain `unknown/unavailable`.

## 4.3 Ordered post-Pilot Gates

4.3.1 `R0=SafetyAndReliabilityClosure`.

4.3.2 R0 includes P0/P1 closure, Tenant isolation, Consent, Retention, Export/Delete, Backup/Restore, Rollback, rate limits, Observability, incident response, accessibility and Product-event quality.

4.3.3 `R1=CoreDailyWorkflow`.

4.3.4 R1 improves Inbox, assignment, handoff, contact/CRM context, templates, consent, Campaign review and delivery investigation using measured friction.

4.3.5 `R2=RepeatablePaidOnboarding`.

4.3.6 R2 proves assisted onboarding, one paid package, quotas, usage visibility, support ownership, invoice/reconciliation and renewal behavior.

4.3.7 `R3=OneGrowthBranch`.

4.3.8 R3 selects exactly one of `OUTBOUND-SEGMENTATION-DELIVERY-RECURRING` or `INBOUND-AUTOMATION-BOT` based on qualified evidence; both are not funded simultaneously by default.

4.3.9 R3 tie-break order=`paying Tenants affected→workflow frequency→measured outcome→lower recurring risk→lower accepted effort`.

4.3.10 `R4=AssistiveAIAndKnowledge`.

4.3.11 R4 remains human-approval-only and requires exact model/profile Eval, Privacy/Meta approval, redacted real corpus, cost/latency budgets, fail-closed Adapter and AI kill switch.

4.3.12 `R5=AdvancedAnalyticsAndOptimization`.

4.3.13 R5 begins only when event semantics, coverage, loss/duplication rate, identity, clock and retention quality are independently proved.

## 4.4 Pilot exit evidence

4.4.1 exact Pilot cohort=`single-Tenant closed Pilot` until a later Decision changes it.

4.4.2 Pilot exit requires all Scope-1 acceptance Gates, no open P0/P1/P2, named owners, live provider readbacks, successful Restore/Rollback, accepted SLO observation and a signed Pilot outcome review.

4.4.3 Product-market evidence requires at least three paying Israeli direct-SMB Tenants validating the same core job before a broad Roadmap branch is promoted.

4.4.4 if fewer than three qualify, the next cycle is learning/reliability Work; it is not relabeled GA.

# 5. D30 conditional-capability decision

## 5.1 Pilot surface

5.1.1 Pilot client=`responsive React Web application`.

5.1.2 PWA installability=`conditional progressive enhancement after browser/security/offline tests`.

5.1.3 native iOS/Android=`OUT-OF-SCOPE`.

5.1.4 public API=`OUT-OF-SCOPE`.

5.1.5 public webhook platform=`OUT-OF-SCOPE`.

5.1.6 Integration marketplace=`OUT-OF-SCOPE`.

5.1.7 SAML/SCIM/Enterprise CMK/Agency mode/Omnichannel=`OUT-OF-SCOPE`.

## 5.2 Public API exit threshold

5.2.1 at least three paying Tenants require the same API outcome and accept the same resource/permission boundary.

5.2.2 approved business owner, API Product owner, Security owner, Support owner and deprecation budget exist.

5.2.3 Abuse, Tenant authorization, quotas, pricing, versioning, pagination, idempotency, error, Audit, SLO and data-minimization designs pass independent review.

5.2.4 private Partner API may precede Public API only under an exact allowlist, contract and visibility policy; it does not receive Public-readiness credit.

## 5.3 Connector exit threshold

5.3.1 at least three paying Tenants request the same external system and workflow.

5.3.2 provider Sandbox, Terms/Legal permit, DPA, rate limits, OAuth/credential model and support escalation are available.

5.3.3 exact source-of-truth, mapping, sync cursor, deletion propagation, conflict and reconciliation contracts are approved.

5.3.4 one Connector is built and supported at a time unless accepted capacity proves otherwise.

## 5.4 Enterprise exit threshold

5.4.1 at least two qualified Prospects request the same Enterprise boundary.

5.4.2 at least one paying design partner or binding contract funds the accepted Scope.

5.4.3 requested capabilities are split; SAML, SCIM, Audit export, data residency, CMK, SLA, procurement and Agency hierarchy do not share one automatic approval.

5.4.4 every capability requires named Product, Security, Legal/Privacy, Operations and Support owners plus lifecycle and deprecation budgets.

## 5.5 Native Mobile exit threshold

5.5.1 a supported-PWA workflow has a measured failure that cannot be adequately solved in Web technology.

5.5.2 at least three paying Tenants need the same native-only outcome.

5.5.3 app-store policy, release, signing, device security, push notification, background work, offline conflict, privacy disclosure and support ownership pass separate Gates.

5.5.4 wrapper-only duplication or competitor parity is not an exit reason.

# 6. Dormant contract preparation

## 6.1 API contract

6.1.1 versioned resources and commands with opaque stable identifiers.

6.1.2 Tenant-scoped authentication plus object-level and function-level authorization on every operation.

6.1.3 exact idempotency identity for side-effecting commands and `UNKNOWN-SIDE-EFFECT` recovery.

6.1.4 cursor pagination with stable ordering and snapshot/change semantics.

6.1.5 RFC3339 UTC instants plus documented timezone presentation rules.

6.1.6 exact OpenAPI version, schema root, compatibility checks, changelog, sunset and deprecation policy.

6.1.7 RFC9457 Problem types with safe, versioned machine fields and no internal/PII leakage.

6.1.8 per-Tenant/user/token/operation/business-flow quotas and standards-aligned `Retry-After` where applicable.

6.1.9 private-by-default documentation and access; publication itself requires an approved disclosure review.

## 6.2 Webhook contract

6.2.1 transactional outbox binds business commit and delivery Intent.

6.2.2 versioned envelope includes Event identity, type, occurrence time, Tenant-scoped opaque subject, schema version and content digest.

6.2.3 delivery is at-least-once, may be out of order and requires consumer idempotency.

6.2.4 signature profile covers exact method, authority, target, timestamp, content digest and key ID with constant-time verification, rotation and replay window.

6.2.5 no Raw PII or Secret by default; every exposed field has purpose, classification, retention and compatibility review.

6.2.6 retry uses bounded backoff, `Retry-After` where trusted, terminal DLQ, customer-visible delivery log and safe replay.

6.2.7 SSRF-safe destination validation, DNS/IP revalidation and egress policy are mandatory.

## 6.3 Connector contract

6.3.1 provider-neutral Port plus one exact provider/version Adapter.

6.3.2 least-privilege OAuth scopes or secret references; no credential in code, URL, log or public Evidence.

6.3.3 source-of-truth and per-field authority matrix.

6.3.4 monotonic cursor/checkpoint, replay, backfill and deletion propagation.

6.3.5 normalized provider errors, rate limits, backoff, circuit breaker and kill switch.

6.3.6 mapping-version migration, conflict queue and reconciliation Evidence.

## 6.4 Enterprise identity contract

6.4.1 SAML metadata, signature, issuer, audience, recipient, clock, replay, certificate rotation and IdP-initiated policy are explicit.

6.4.2 SCIM schemas, filtering, pagination, uniqueness, PATCH semantics, deactivation, group mapping and replay are exact and versioned.

6.4.3 JIT creation and SCIM provisioning cannot race into duplicate or over-privileged accounts.

6.4.4 deprovisioning revokes sessions, API tokens and queued privileged actions under an accepted latency SLO.

6.4.5 Enterprise role/group mapping never bypasses Connect Tenant boundary or privileged-role approval.

## 6.5 PWA contract

6.5.1 manifest `id`, `scope`, `start_url`, names, icons, language and direction are explicit and validated across Hebrew RTL and English.

6.5.2 Service Worker caches only explicitly public/static assets unless a later offline-data Decision approves encrypted/authenticated storage.

6.5.3 no customer conversation, contact, token, Secret or privileged response is placed in shared/public cache.

6.5.4 offline mutation queue is disabled until conflict, expiry, authorization recheck and user-visible reconciliation are approved.

6.5.5 installability, updates, logout, account switch, multi-Tenant isolation and lost-device behavior are tested per supported browser/device.

# 7. Measurement and governance

7.1 Product events use a versioned taxonomy and minimize personal data.

7.2 every Roadmap candidate binds exact affected paying Tenants without exposing their identities in Public planning artifacts.

7.3 qualitative interview Evidence and quantitative workflow Evidence remain separate and may disagree.

7.4 every promoted capability has one measurable outcome, baseline, target, observation window, counter-metric and rollback rule.

7.5 leading metrics cannot replace retention, renewal, support burden, reliability or customer outcome.

7.6 no fake, mock, demo, sample or synthetic business data satisfies a Roadmap exit threshold.

7.7 Decision review cadence=`after each Pilot learning cycle or on material provider/market/legal change`; missing review keeps dormant capabilities off.

# 8. Approval, unknowns and current terminal

8.1 required approvers=`Product, paying-customer Evidence owner, Engineering, Architecture, Security, Privacy/Legal, Operations/SRE, QA, UX/Accessibility, Support and Finance`.

8.2 exact Pilot cohort outcome, paying-Tenant evidence, telemetry quality, team capacity, pricing, business outcome thresholds and customer commitments=`unknown/unavailable`.

8.3 D29/D30-A4 materialized=`1/1`; independently reviewed=`0/1`; accepted=`0/1`.

8.4 post-Pilot branch=`NOT-SELECTED`; Enterprise/Integrations/Public API/native Mobile=`OFF`.

8.5 Gate29/Gate30 and every conditional-package Gate remain `BLOCKED`; development freeze=`ACTIVE`.

8.6 this selection belongs in the future accepted Task universe and grants no implementation or Product-readiness credit.
