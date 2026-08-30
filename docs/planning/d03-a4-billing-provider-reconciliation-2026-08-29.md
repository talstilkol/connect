# 1. Connect — D03-A4 Billing-provider reconciliation

## 1.1 Identity and decision status

1.1.1 `decisionId=D03-A4`.

1.1.2 `artifactId=CONNECT-D03-A4-BILLING-PROVIDER-RECONCILIATION-2026-08-29`.

1.1.3 research date=`2026-08-29`; trusted authority timestamp=`unknown/unavailable`.

1.1.4 Tal instruction=`prepare for both Paddle and Stripe`.

1.1.5 decision status=`SELECTED-FOR-PLANNING; NOT-FINANCE-APPROVED; NOT-IMPLEMENTED; CHECKOUT-OFF`.

1.1.6 this Decision performs no vendor signup, KYC, Terms acceptance, purchase, invoice, payment, credential use, Product Code change, Build, runtime Test, Git mutation, Push, Deployment or Production action.

# 2. Beginner-facing logic

## 2.1 One business authority, two technical ports

2.1.1 a Billing port is a stable internal contract that prevents Connect's domain logic from depending directly on one provider's API.

2.1.2 preparing two ports means Connect can support `Paddle` and `Stripe` through separate Adapters later.

2.1.3 it does not mean both providers process the same subscription or Event.

2.1.4 two live authorities create duplicate charge, conflicting refund, entitlement drift and reconciliation risk.

2.1.5 safe rule=`dual-port=true; dual-live=false; exactly one active BillingAuthority per Environment, Tenant and BillingAccount`.

## 2.2 Pilot boundary

2.2.1 the closed single-Tenant Pilot has no self-service Checkout and no automated recurring charge.

2.2.2 Pilot Billing is either a Finance-approved invoice plus bank transfer through an approved accounting system, or free if Finance/Tax/Legal do not approve that route.

2.2.3 Connect does not generate a tax invoice with home-built code and does not treat a bank transfer message as authoritative settlement.

2.2.4 manual Pilot status is observed by a named Finance role through a typed receipt; missing or ambiguous observation leaves entitlement unchanged and creates review Work.

# 3. Current official-source observations

## 3.1 Paddle

3.1.1 Paddle's current [supported-country guidance](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle) says it works with software suppliers outside its explicit unsupported-country list; Israel is not in the observed unsupported list, but account acceptance and payout eligibility still require Paddle review.

3.1.2 Paddle's current [Merchant-of-Record explanation](https://www.paddle.com/help/start/intro-to-paddle/how-paddle-is-able-to-take-on-your-vat-and-tax-responsibilities) says Paddle acts as reseller/seller of record and handles VAT/tax responsibilities for covered transactions.

3.1.3 the current [Paddle pricing page](https://www.paddle.com/pricing) describes an all-inclusive model with no monthly fee and includes payments, subscriptions, tax/compliance, fraud protection, reporting and buyer support; exact negotiated fees, currency conversion, payout and product eligibility remain live-account facts.

3.1.4 Paddle's current [webhook delivery guidance](https://developer.paddle.com/webhooks/about/how-webhooks-work/) documents at-least-once delivery, possible out-of-order arrival, `event_id` deduplication, `occurred_at` ordering, a five-second acknowledgement window and exponential-backoff retries.

3.1.5 Paddle's current [signature guidance](https://developer.paddle.com/webhooks/about/signature-verification/) requires verification against the exact raw body, timestamp and `Paddle-Signature`; SDK helpers currently use a five-second default replay tolerance.

## 3.2 Stripe

3.2.1 Stripe's current [global availability page](https://stripe.com/global) lists supported merchant countries and does not list Israel in the observed supported-country set.

3.2.2 the absence of Israel from that merchant list is not contradicted by Stripe pages that list Israel only as a payout recipient, connected-account country, customer country or forwarding destination; those are different capability scopes.

3.2.3 Stripe now offers [Managed Payments](https://docs.stripe.com/payments/managed-payments/how-it-works) as a Merchant-of-Record public preview for eligible digital products, but the observed supported business-location list also does not include Israel.

3.2.4 therefore a current Israel-only Connect entity cannot treat ordinary Stripe Payments or Stripe Managed Payments as an approved live path.

3.2.5 a future Stripe path requires a real supported legal entity, bank account, tax residence, business address, product eligibility, Terms/KYC approval and Finance/Legal authorization; no artificial foreign registration or borrowed identity is allowed.

## 3.3 Israel tax-invoice obligation

3.3.1 the current [Israel Tax Authority allocation-number service](https://www.gov.il/he/service/request-assignment-number-for-tax-invoice) states that the 2026 threshold is above ILS5,000 before VAT from 1 June 2026 for applicable B2B tax invoices.

3.3.2 Connect must not hard-code that amount as a permanent rule; Tax authority, effective date, business classification, invoice type and approved accounting-system behavior must be re-observed.

3.3.3 Paddle Merchant-of-Record treatment does not automatically answer Connect's Israeli corporate-income, payout, reverse-invoice, bookkeeping or local reporting obligations; Israeli Finance/Tax review remains mandatory.

# 4. Decision

## 4.1 Provider selection

4.1.1 Pilot active provider=`NONE`.

4.1.2 Pilot collection=`FINANCE-APPROVED-MANUAL-INVOICE-AND-BANK-TRANSFER` or `FREE-PILOT`.

4.1.3 first automated provider Candidate after Pilot=`PADDLE-MOR`, subject to exact KYC, Product, pricing, DPA, payout, tax, refund, chargeback, reconciliation and Staging Gates.

4.1.4 dormant provider Candidate=`STRIPE`, with both ordinary Payments and Managed Payments eligibility rechecked at activation time.

4.1.5 Stripe remains disabled unless the exact Connect legal entity and Product become eligible; a change in Stripe availability creates a new Decision Candidate, not an automatic enablement.

4.1.6 no automatic provider fallback, dual write, dual capture, shadow charge or entitlement decision from an inactive Adapter.

## 4.2 Port boundaries

4.2.1 one provider-neutral `BillingCommandPort` models Intent only.

4.2.2 one provider-neutral `BillingFactPort` observes provider facts without granting local authority by itself.

4.2.3 one `BillingAuthorityLedger` is the local authoritative entitlement projection after verified, reconciled facts and policy.

4.2.4 provider-specific IDs remain namespaced and never serve as cross-provider identity.

4.2.5 provider-specific status strings are mapped into a finite local union; unknown values fail closed and create an adapter-drift alert.

4.2.6 price, tax, currency, refund and entitlement semantics are never silently normalized when the providers differ.

## 4.3 Side-effect chronology

4.3.1 exact lifecycle=`BillingIntent→PolicyPermit→ProviderAttempt→ProviderFactObservation→Reconciliation→EntitlementDecision`.

4.3.2 timeout after provider acceptance is `UNKNOWN-SIDE-EFFECT`; it is never retried with a new idempotency identity.

4.3.3 recovery queries the provider using the original exact identity, records the fact and reconciles before any second attempt.

4.3.4 cancellation, refund, dispute, chargeback, payout and tax adjustment each use separate typed facts and authority rules.

4.3.5 one provider Event never directly mutates entitlement before signature, replay, identity, ordering, schema, provider, Environment and Tenant checks pass.

# 5. Webhook safety contract

## 5.1 Ingress

5.1.1 provider-specific HTTPS endpoint only.

5.1.2 read and retain only the exact raw bytes needed for signature verification under the approved Evidence/Retention policy.

5.1.3 verify signature, timestamp/replay window, active secret revision, endpoint identity and Environment before parsing business fields.

5.1.4 response acknowledgement is separated from durable processing through an accepted transactional ingress/outbox contract.

5.1.5 no Secret, full payload or customer payment datum enters normal logs.

## 5.2 Idempotency and ordering

5.2.1 provider Event ID plus provider and Environment is the deduplication key; delivery-attempt ID is retained separately.

5.2.2 duplicate delivery returns the prior terminal without repeating a side effect.

5.2.3 out-of-order events are projected by provider occurrence/version facts and reconciliation rules, not arrival time.

5.2.4 unknown Event type is quarantined and alerted; it cannot default to an existing mutation.

5.2.5 provider replay is accepted only through the same deduplication and ordering contract.

## 5.3 Reconciliation

5.3.1 scheduled reconciliation compares local ledger, provider transaction/subscription/refund/dispute facts and Finance settlement records.

5.3.2 missing, duplicated, conflicting, stale or provider-unavailable facts create explicit cases and cannot be counted as paid.

5.3.3 manual corrections require named Finance authority, reason, source receipt, dual review for money/entitlement changes and immutable Audit.

# 6. Security, privacy and financial controls

6.1 server-only credentials in approved platform vaults; Browser receives only approved public/client tokens where the provider contract explicitly permits them.

6.2 least-privilege keys are separated by Provider, Environment and Purpose; rotation supports overlap without accepting arbitrary historical signatures.

6.3 Checkout return URL, webhook URL and customer portal URL derive from validated server-side Public Origin, never a request header.

6.4 price IDs, plan IDs, currency and payable amount are resolved server-side from an accepted immutable commercial catalog; client values are untrusted hints.

6.5 Tenant authorization, subscription ownership and entitlement are checked independently of the provider payload.

6.6 refunds, credits, plan changes, manual entitlement and credential rotation are privileged actions with least privilege, step-up authorization where approved, maker-checker separation and Audit.

6.7 card data never traverses Connect servers unless a later PCI-scoped Decision explicitly changes the architecture; hosted provider surfaces are preferred.

6.8 data classes split Billing Intent, Provider Event, Financial Ledger, Entitlement, Invoice Reference, Audit and Support Evidence because their retention and authority differ.

# 7. Required verification before activation

## 7.1 Positive verification

7.1.1 exact eligible legal entity, Product, country, bank, currency, pricing, tax and payout configuration read back from the active provider.

7.1.2 one approved price produces one verified provider fact, one ledger fact and one entitlement decision.

7.1.3 duplicate and out-of-order Events converge to the same final state.

7.1.4 refund, cancellation, dispute and chargeback produce the approved entitlement transition and Finance record.

## 7.2 Negative verification

7.2.1 reject invalid/missing/expired/old-secret signature and transformed body.

7.2.2 reject client-substituted price, currency, Tenant, user or return URL.

7.2.3 reject Event from inactive Provider, wrong Environment or unknown schema.

7.2.4 reject duplicate charge, provider fallback and manual entitlement without authority.

## 7.3 Failure, concurrency and recovery verification

7.3.1 timeout before and after provider acceptance reaches different typed terminals.

7.3.2 concurrent Checkout, cancellation, refund and Event delivery resolve through exact fencing and reconciliation.

7.3.3 provider outage leaves prior entitlement under the approved grace/suspension policy; policy values remain `unknown/unavailable` until Product/Finance approval.

7.3.4 lost response and worker crash recover from the original identities without a second charge.

7.3.5 restore/replay does not resurrect canceled subscriptions, repeat an Event or grant stale entitlement.

# 8. Approval, unknowns and current terminal

8.1 required approvers=`Product, Finance/Tax, Legal/Privacy, Security, Engineering, Operations and Support`.

8.2 legal entity, approved accounting system, Pilot invoice policy, currency, price, refund policy, grace policy, KYC eligibility, live provider fees, payout schedule, DPA and budget=`unknown/unavailable`.

8.3 named Primary/Backup owners and appointment receipts=`unknown/unavailable`.

8.4 D03-A4 materialized=`1/1`; independently reviewed=`0/1`; accepted=`0/1`.

8.5 Billing runtime=`OFF`; Checkout=`OFF`; Paddle Adapter=`NOT-IMPLEMENTED`; Stripe Adapter=`NOT-IMPLEMENTED`.

8.6 Gate20/Gate29/Gate30 remain `BLOCKED`; development freeze=`ACTIVE`.

8.7 this selection belongs in the future accepted Task universe; it does not grant implementation credit or authorize Billing work during the current planning freeze.
