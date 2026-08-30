# 1. Connect — D03-A5 Stripe/Paddle Billing reconciliation and adapter contract

## 1.1 Decision identity and boundary

1.1.1 `decisionId=D03-A5`; original intake identity=`D03`.

1.1.2 `artifactId=CONNECT-D03-A5-STRIPE-PADDLE-BILLING-RECONCILIATION-AND-ADAPTER-CONTRACT-2026-08-30`.

1.1.3 predecessor=`D03-A4`; exact predecessor raw SHA-256=`d57a5d2510d773c5b154908cf46b0b8dd510d7e2c3a254d1ee7f50df2ee71801`.

1.1.4 supersession scope=`preserve dual-port and Billing-off Pilot decisions; replace D03-A4 first-automated-provider=PADDLE-MOR because newly read current AUP evidence creates an unresolved product-category conflict`.

1.1.5 Tal instruction=`prepare for both Paddle and Stripe`.

1.1.6 artifact class=`CURRENT-OFFICIAL-SOURCE-RESEARCH; PLANNING-ONLY; ARCHITECTURE-DECISION-CANDIDATE; NOT-PROVIDER-APPROVAL; NOT-LEGAL-OR-TAX-ADVICE; NOT-IMPLEMENTATION; NOT-ACCEPTANCE`.

1.1.7 research date=`2026-08-30`; source facts can change and require a fresh readback before contract, launch or payment processing.

1.1.8 no provider account, credential, Product, Price, Customer, Checkout, transaction, subscription, invoice, refund, webhook, tax registration or payout was created, queried or changed.

1.1.9 repository remains `PUBLIC`; provider Secrets, customer/billing data and private contracts are forbidden in Git, logs, screenshots and Public planning evidence.

# 2. Decision first

## 2.1 Adopted planning direction

2.1.1 architecture decision=`PROVIDER-NEUTRAL-BILLING-CORE + DORMANT-STRIPE-ADAPTER + DORMANT-PADDLE-ADAPTER + ISRAEL-PROVIDER-EVALUATION-PORT`.

2.1.2 pilot decision=`BILLING-OFF; SINGLE-MANUAL-PILOT-PLAN`; this is consistent with D21 closed single-tenant Pilot and D23 single manually managed Pilot plan.

2.1.3 Paddle status=`BLOCKED-PENDING-WRITTEN-AUP-ELIGIBILITY-APPROVAL`.

2.1.4 Stripe status for a currently assumed Israeli company=`BLOCKED-PENDING-SUPPORTED-LEGAL-ENTITY-AND-PRODUCT-ELIGIBILITY`.

2.1.5 launch-provider status=`unknown/unavailable`; no provider may be activated merely because its adapter contract exists.

2.1.6 immediate build permission=`0`; the development freeze and Gate29 still apply.

## 2.2 Why this is the safe decision

2.2.1 Paddle's current official Acceptable Use guidance expressly lists `Mass Marketing Products`, including `Message App marketing`, among prohibited advertising/marketing categories. Connect's WhatsApp campaign functionality appears to overlap that wording. This is an inference from product scope and the provider text, not a binding Paddle decision; written Paddle approval is mandatory before integration or sales. Source: [Paddle — current Acceptable Use guidance](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle).

2.2.2 Paddle otherwise states that it operates as Merchant of Record, handles global indirect-tax collection/remittance and supports software businesses outside its enumerated unsupported-country list; Israel was not present in that list at readback. This makes Paddle technically attractive but does not override the product-category risk or seller review. Sources: [Paddle — how Paddle works](https://developer.paddle.com/get-started/how-paddle-works/); [Paddle — supported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle); [Paddle — tax handling](https://www.paddle.com/help/sell/tax/how-paddle-handles-vat-on-your-behalf).

2.2.3 Stripe's current global availability page did not list Israel as a supported business location. Stripe Managed Payments, which can act as Merchant of Record for eligible digital products, also did not list Israel among supported business locations and was marked Public preview. Therefore a direct Israeli-company assumption is not safe. Sources: [Stripe — global availability](https://stripe.com/global); [Stripe — Managed Payments eligibility and limits](https://docs.stripe.com/payments/managed-payments/how-it-works).

2.2.4 forming or using a foreign entity, using Stripe Atlas, changing the seller of record or restructuring contracts is a Legal/Tax/Finance decision outside this planning artifact; no such entity is assumed or recommended without professional review.

2.2.5 current Israeli-provider official documentation shows viable recurring-billing capabilities that merit a separate evaluation: Hyp documents hosted PCI-oriented payment pages, tokenization and recurring payments; PayPlus documents recurring-payment and hosted-payment-page APIs; Tranzila documents subscription schedules, tokenization and transaction notifications. These capabilities are candidates, not an approval or comparative winner. Sources: [Hyp — platform overview](https://developers.hyp.co.il/); [Hyp — recurring payments](https://developers.hyp.co.il/recurring-payments-and-subscriptions/overview-of-recurring-payments); [PayPlus — recurring payment API](https://docs.payplus.co.il/reference/post_recurringpayments-add); [Tranzila — My Billing API](https://docs.tranzila.com/docs/payments-and-billing/sto-api-for-my-billing).

# 3. Provider-independent boundary

## 3.1 Core ownership rule

3.1.1 Connect owns entitlement decisions, internal plan identity, tenant linkage, command history, provider mapping, reconciliation state and security/audit evidence.

3.1.2 a provider owns payment processing, its own Customer/Price/Subscription/Invoice/Transaction objects and provider-specific state.

3.1.3 Connect must not treat a browser redirect, client callback, unchecked webhook, email, dashboard screenshot or frontend state as payment or entitlement proof.

3.1.4 entitlement changes require a verified provider event or authoritative provider API readback, normalized through the accepted adapter contract, causally linked to one internal operation and committed atomically under expected-version control.

3.1.5 provider outage, missing event, signature failure, schema drift, stale API version, conflict, unknown status or reconciliation disagreement fails closed for new paid entitlement. Existing access follows a separately accepted grace/dunning policy; it is not guessed by an adapter.

## 3.2 Canonical record families

3.2.1 `BillingProviderProfile`: provider identity, mode, API/webhook schema version, supported capabilities, seller entity, Region/data terms, credential-reference class, activation state, approval roots and expiry.

3.2.2 `InternalPlan`: immutable Connect plan/version identity, currency, billing interval, feature/quota policy root and lifecycle state.

3.2.3 `ProviderCatalogMapping`: internal plan/version to exact provider Product/Price identity, price digest, environment, validity interval and expected provider readback root.

3.2.4 `BillingCustomerLink`: Tenant/Organization root to provider Customer identity, seller entity, environment, data-class policy and link state.

3.2.5 `BillingCommand`: deterministic command identity, tenant, operation kind, expected internal version, canonical payload digest, provider profile, requested actor/authority, created time and safe terminal.

3.2.6 `ProviderOperation`: deterministic operation key, provider request digest, provider idempotency key derivation, attempt number, request/response metadata roots, provider request ID and reconciliation state.

3.2.7 `InboundBillingEvent`: provider/event identity, exact raw-body digest, signature result, schema/API version, occurrence time, receipt time, relevant object identity, normalized event digest, deduplication state and processing outcome.

3.2.8 `CanonicalSubscriptionSnapshot`: internal and provider identities, current normalized state, provider raw-state digest, effective interval, cancellation/pause/trial fields, item/price mapping root and last authoritative event/readback.

3.2.9 `EntitlementDecision`: exact subscription snapshot, invoice/payment condition, internal policy version, expected tenant entitlement head, decision terminal, reason and committed readback.

3.2.10 `BillingReconciliationReceipt`: expected versus observed object roots, missing/duplicate/out-of-order event set, conflict classification, repair command or blocked state and reviewer/audit roots.

3.2.11 `RefundDisputeReceipt`: exact provider object, amount/currency, prior operation, entitlement impact policy, authority, current status and audit linkage.

3.2.12 `ProviderMigrationPlan`: source/target provider, exact affected subscription denominator, customer-consent requirement, double-charge exclusion, proration/credit rule, tax/invoice continuity, cutover/rollback and one-subscription-at-a-time evidence.

## 3.3 Deterministic identifiers

3.3.1 no identifier is generated with `Math.random()`.

3.3.2 no `crypto.randomUUID()` use is authorized.

3.3.3 internal command and mapping IDs are content-addressed from type-tagged canonical fields that exclude their own ID fields.

3.3.4 provider idempotency keys are derived deterministically from the stable internal command identity, provider profile version, operation kind and canonical request digest.

3.3.5 a provider requirement for a cryptographically random nonce is a separate security-primitive decision. For example, Tranzila currently documents a random nonce in request authentication. Implementation must pause and obtain Tal's exact use-specific approval before selecting a cryptographic random generator. Source: [Tranzila — My Billing authentication](https://docs.tranzila.com/docs/payments-and-billing/sto-api-for-my-billing).

# 4. Canonical state machines

## 4.1 Provider-profile state

4.1.1 states=`DORMANT|ELIGIBILITY-PENDING|SANDBOX-APPROVED|PRODUCTION-APPROVED|SUSPENDED|REVOKED`.

4.1.2 only `PRODUCTION-APPROVED` can process live billing.

4.1.3 approval requires current seller/entity eligibility, written product-category approval where risk exists, signed contract/fees, Legal/Tax/Finance approval, privacy/security review, exact account/environment evidence, accepted sandbox tests and named owners.

4.1.4 expiry, contract change, AUP conflict, security incident, credential compromise, unsupported schema/API version or reconciliation breach transitions to `SUSPENDED` or `REVOKED` and blocks new operations.

## 4.2 Internal subscription state

4.2.1 normalized states=`PENDING_CHECKOUT|PENDING_PROVIDER_CONFIRMATION|TRIALING|ACTIVE|PAST_DUE|PAUSED|CANCEL_AT_PERIOD_END|CANCELED|UNPAID|INCOMPLETE|EXPIRED|CONFLICT|MIGRATING`.

4.2.2 the adapter must preserve provider nuance rather than force every provider into a falsely identical state. `providerRawStatus` and normalized-state reason remain available for audit.

4.2.3 `ACTIVE` alone is insufficient where a provider documents asynchronous payment behavior or unpaid invoices. Entitlement uses an explicit policy over subscription, invoice, payment and grace states.

4.2.4 Stripe documents that asynchronous methods may leave a subscription active while a PaymentIntent is still processing or later fails; this is why `active=true` cannot be the only entitlement predicate. Source: [Stripe — subscription and payment statuses](https://docs.stripe.com/billing/subscriptions/overview).

4.2.5 Paddle cancellation can be immediate or scheduled for period end and a canceled subscription cannot be reinstated; the normalized machine must preserve those distinctions. Source: [Paddle — cancel a subscription](https://developer.paddle.com/build/subscriptions/cancel-subscriptions/).

## 4.3 Command state

4.3.1 states=`CREATED|VALIDATED|SUBMITTING|PROVIDER_ACCEPTED|AWAITING_EVENT|RECONCILING|COMMITTED|FAILED_SAFE|CONFLICT|UNKNOWN_EFFECT`.

4.3.2 every retry uses the same deterministic operation key only when the canonical request digest and expected internal version are identical.

4.3.3 changed parameters require a new command identity; reusing one provider idempotency key with changed parameters is forbidden.

4.3.4 provider-side idempotency retention is not the Connect safety boundary. The internal operation ledger outlives the provider window and prevents replay after provider key pruning.

4.3.5 Stripe v1 currently documents idempotent POST result retention for at least 24 hours and parameter comparison on key reuse; this behavior is version-scoped and must be reverified. Source: [Stripe — idempotent requests](https://docs.stripe.com/api/idempotent_requests).

# 5. Webhook security and ordering

## 5.1 Common ingress sequence

5.1.1 receive exact raw request bytes over HTTPS with a strict byte limit and short header/body timeout.

5.1.2 bind endpoint/environment/provider profile before selecting the verification Secret.

5.1.3 verify the provider signature against untouched raw bytes with trusted time and the provider-supported replay window.

5.1.4 reject missing, malformed, stale or ambiguous signatures before JSON parsing or queue admission.

5.1.5 compute a disclosure-safe raw-body digest; store raw billing payload only in the approved encrypted private data class with retention and access controls.

5.1.6 parse using the pinned provider event schema/API version; unknown event types or fields are quarantined for reconciliation rather than silently ignored when they affect known objects.

5.1.7 atomically insert an Inbox record keyed by provider+environment+event identity; duplicates return success only after the same raw/object digest is confirmed.

5.1.8 acknowledge quickly after durable Inbox commit; perform provider retrieval, ordering, normalization and entitlement changes asynchronously.

5.1.9 compare event occurrence time and object version/state, not HTTP arrival order.

5.1.10 retrieve the authoritative provider object when an event is missing, out of order, schema-incompatible or security-relevant before changing entitlement.

## 5.2 Stripe-specific rules

5.2.1 verify `Stripe-Signature` using the endpoint-specific Secret and exact raw body; test/live endpoints have different Secrets.

5.2.2 enforce a nonzero trusted-time tolerance and replay protection; Stripe currently documents a five-minute default tolerance in its libraries.

5.2.3 deduplicate exact Event IDs and separately handle semantically duplicate events using provider object identity plus event type.

5.2.4 never depend on delivery order; Stripe explicitly does not guarantee event order.

5.2.5 subscribe only to required event types and process asynchronously.

5.2.6 pin event-destination API version and preserve schema version on every Inbox record.

5.2.7 source for 5.2=`[Stripe — receive events and webhook security](https://docs.stripe.com/webhooks)`.

## 5.3 Paddle-specific rules

5.3.1 verify `Paddle-Signature` with the exact destination Secret and untouched raw body using the official SDK when its reviewed version is supported.

5.3.2 Paddle currently documents HMAC-SHA256 over timestamp plus raw body and a five-second default SDK tolerance; exact clock and deployment latency must be proven before accepting that default.

5.3.3 deduplicate using `event_id`; one Event may have multiple notification deliveries.

5.3.4 Paddle documents at-least-once and out-of-order delivery; use `occurred_at`, current object state and reconciliation rather than arrival order.

5.3.5 return `200` within the provider's documented five-second window only after durable Inbox admission, then queue processing.

5.3.6 sources: [Paddle — signature verification](https://developer.paddle.com/webhooks/about/signature-verification/); [Paddle — event delivery model](https://developer.paddle.com/webhooks/about/how-webhooks-work/); [Paddle — responding to webhooks](https://developer.paddle.com/webhooks/about/respond-to-webhooks/).

# 6. Adapter contract

## 6.1 Required capability interface

6.1.1 `probeEligibility(profile, productScope)` returns evidence-bound `ELIGIBLE|INELIGIBLE|UNKNOWN`, expiry and source roots; `UNKNOWN` blocks activation.

6.1.2 `readCatalog(mapping)` returns exact provider Product/Price state and digest.

6.1.3 `createCheckout(command)` creates only a hosted/embedded provider-approved Checkout and returns provider identity plus expiry; it never activates entitlement.

6.1.4 `readCustomer(providerCustomerId)` returns current customer metadata allowed by the approved privacy schema.

6.1.5 `readSubscription(providerSubscriptionId)` returns versioned provider raw state plus normalized candidate state.

6.1.6 `changeSubscription(command)` supports only explicitly advertised provider capabilities and returns `UNSUPPORTED` for absent semantics.

6.1.7 `cancelSubscription(command, timing)` distinguishes immediate and period-end cancellation.

6.1.8 `readInvoice`, `readPayment`, `refund`, `readDispute` and `openCustomerPortal` each bind exact provider object versions and authority.

6.1.9 `verifyWebhook(rawBytes, headers, profile, trustedTime)` returns a typed signed Event or a safe rejection without side effects.

6.1.10 `normalizeEvent(event, currentProviderObject)` returns a canonical event and explicit unmapped fields/statuses; unknown values never default to a permissive state.

6.1.11 `reconcile(scope, expectedHead)` compares internal and provider object sets and produces a receipt; it cannot silently repair destructive or financial differences.

## 6.2 Capability matrix rule

6.2.1 each adapter publishes a versioned matrix for Checkout, subscriptions, trial, pause, resume, immediate/end-period cancel, proration, discounts, taxes, invoices, refunds, disputes, customer portal, usage billing, local payment methods and migration/export.

6.2.2 unsupported capability is a typed terminal, not emulated through an undocumented API sequence.

6.2.3 provider-preview capabilities remain disabled unless the accepted Provider Profile explicitly admits the preview version, terms, rollback and monitoring.

6.2.4 Stripe Managed Payments remains preview-scoped in the current research and is not treated as a stable Israel launch route.

# 7. Data, privacy and PCI boundary

## 7.1 Card-data rule

7.1.1 Connect servers and logs must not receive, store or proxy PAN, CVV, track data or raw wallet credentials.

7.1.2 use provider-hosted Checkout/payment pages or an independently accepted PCI architecture; client-side success does not grant access.

7.1.3 provider Customer, invoice and transaction data are private data classes with purpose, retention, export, deletion and Legal Hold rules.

7.1.4 redact provider errors before user display and logging; preserve a private provider request/event correlation root for support.

## 7.2 Public repository rule

7.2.1 only variable names and schema descriptions may be Public; actual API keys, webhook Secrets, client tokens when sensitive, account IDs, Customer IDs, provider contracts and payloads are forbidden.

7.2.2 `.env.example` values must be non-authenticating documented sentinels and pass both history and worktree Secret scans.

7.2.3 provider SDK and Action dependencies are pinned to exact reviewed versions/digests and included in SBOM/license/provenance review.

# 8. Failure and reconciliation rules

## 8.1 Mandatory negative cases

8.1.1 duplicate delivery with identical bytes.

8.1.2 same Event ID with different raw/object digest.

8.1.3 two different Event IDs representing the same object/type transition.

8.1.4 out-of-order create/update/cancel/payment events.

8.1.5 valid signature with stale timestamp; invalid signature with fresh timestamp; wrong endpoint Secret; sandbox/live crossover.

8.1.6 provider request timeout before effect, after effect before response and after response before internal commit.

8.1.7 idempotency key replay inside and outside provider retention window; same key with changed payload.

8.1.8 provider object exists without internal command; internal command exists without provider object.

8.1.9 catalog price drift, currency mismatch, wrong Tenant mapping and cross-provider object substitution.

8.1.10 cancellation, pause, refund, dispute, chargeback, unpaid invoice and asynchronous payment failure after prior activation.

8.1.11 provider API version drift, unknown enum/event, truncated payload and provider outage.

8.1.12 migration partial failure, double charge, double entitlement, missing credit/proration and rollback after source cancellation.

## 8.2 Safe outcomes

8.2.1 duplicate-identical events are idempotently acknowledged without duplicate effects.

8.2.2 conflicting duplicate, unknown effect or ordering ambiguity enters `CONFLICT|UNKNOWN_EFFECT` and triggers authoritative readback/reconciliation.

8.2.3 no new entitlement is granted while payment/subscription proof is unknown.

8.2.4 no existing entitlement is revoked solely because a webhook was delayed; revocation follows the accepted billing/grace policy and authoritative state.

8.2.5 no refund, cancellation, migration or destructive repair runs automatically from an ambiguous event.

# 9. Provider evaluation gates

## 9.1 Paddle gate

9.1.1 obtain written Paddle classification of Connect's exact WhatsApp campaign, chatbot, CRM and automation use cases against the current AUP.

9.1.2 confirm seller country/entity, product type, supported buyer countries, settlement, payout, currency, invoicing, refund, chargeback, data processing, subprocessor and termination/export conditions.

9.1.3 accepted result must explicitly resolve the `Message App marketing` overlap; generic account creation or sandbox access is insufficient.

9.1.4 until then Paddle state=`DORMANT;INELIGIBILITY-RISK;NO-LIVE-CHECKOUT`.

## 9.2 Stripe gate

9.2.1 identify the actual selling legal entity and confirm it is in a currently supported Stripe country.

9.2.2 determine whether standard Stripe Payments+Billing+Tax or Managed Payments is legally and operationally intended; their Merchant-of-Record responsibilities differ.

9.2.3 if Managed Payments is considered, prove business-location support, product eligibility, preview acceptance, integration limitations and migration path.

9.2.4 until then Stripe state=`DORMANT;SELLER-ENTITY-UNRESOLVED;NO-LIVE-CHECKOUT`.

## 9.3 Israeli-provider gate

9.3.1 evaluate Hyp, PayPlus and Tranzila using the same weighted evidence matrix rather than selecting from marketing claims.

9.3.2 mandatory dimensions=`seller onboarding;recurring billing;hosted PCI boundary;3DS;ILS and required currencies;Israeli invoices/tax documents;refunds/chargebacks;webhook authentication/order/retry;idempotency;API versioning;sandbox quality;export/migration;DPA/subprocessors;SLA/support;total cost;contract exit`.

9.3.3 any provider requiring an undocumented callback, card data through Connect, weak webhook authentication, unbounded retry or non-exportable subscription state is rejected.

9.3.4 current winner=`unknown/unavailable`; live commercial and security evidence was not obtained.

# 10. Implementation sequence after Gate29

## 10.1 Phase 1 — core only

10.1.1 freeze canonical schemas, state machines, capability matrix and error terminals.

10.1.2 implement provider-independent command ledger, Inbox/Outbox, deterministic operation keys, entitlement decision and reconciliation interfaces.

10.1.3 write contract tests with formally constructed definition fixtures only; do not invent customer or transaction records.

## 10.2 Phase 2 — dormant adapters

10.2.1 implement Stripe and Paddle translators behind disabled Provider Profiles.

10.2.2 implement raw-body signature verification, idempotent Inbox and schema-version handling.

10.2.3 verify every adapter against official provider simulators/sandboxes only after credentials and external-test authority are separately approved.

10.2.4 no adapter activation, real Checkout or payment occurs in this phase.

## 10.3 Phase 3 — selected Pilot provider

10.3.1 accept Legal/Tax/Finance/product-eligibility and security gates for one exact provider/account/environment.

10.3.2 bind catalog, Checkout domains/origins, webhook destination, Secrets, owners, monitoring, runbooks and rollback.

10.3.3 execute provider sandbox lifecycle, duplication, ordering, retry, signature, cancellation, refund and outage tests.

10.3.4 run a separately authorized limited live transaction only after exact amount/currency/customer/owner approval; this charter grants none.

## 10.4 Phase 4 — second provider and migration readiness

10.4.1 activate a second provider only for a defined business/availability need; dormant code alone is not operational redundancy.

10.4.2 prove catalog parity, entitlement equivalence, reconciliation and no-double-charge migration before moving one subscription.

10.4.3 migration requires customer/legal/financial rules, explicit batch denominator, canary, stop conditions and rollback.

# 11. Acceptance checklist

11.1 Tal's dual-preparation instruction is represented=`YES`.

11.2 provider-independent contract defined=`CANDIDATE`.

11.3 Stripe seller/entity eligibility proven=`NO`.

11.4 Paddle written AUP eligibility proven=`NO`.

11.5 Israeli provider winner selected=`NO`.

11.6 Legal/Tax/Finance approval=`NO`.

11.7 provider contracts/prices/DPA/SLA bound=`NO`.

11.8 sandbox credentials and authorized tests=`NO`.

11.9 live payment or subscription evidence=`0`.

11.10 D03 final Acceptance=`0/1`; safe state=`BILLING-OFF`.

11.11 Gate29 remains `BLOCKED`; development freeze remains `ACTIVE`; repository remains `PUBLIC`.
