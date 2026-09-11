# 1. Subscription management and sequential purchases — R214, 11.09.2026

1.1 C3.2.3/C3.2.4 are implemented and locally verified. An owner can open Paddle's public customer portal for cancellation, payment-method changes and invoices. A buyer may pay for multiple workspaces. Each workspace keeps its own immutable transaction and subscription history. C3.2.5 operator recovery remains unfinished; billing must remain disabled until that work and live acceptance pass.

1.2 Connect does not mint a customer-authenticated portal session from a workspace role. The portal authenticates the buyer using the payment email. Connect shows only the current workspace's subscription reference, so the authenticated buyer can select it when multiple subscriptions appear. The link contains no customer ID, email, subscription ID, token or action parameter. It opens with `noopener noreferrer`.

1.3 `PADDLE_CUSTOMER_PORTAL_URL` is required whenever Paddle is enabled, in both API and Worker configuration. Copy the actual public portal URL from the merchant account at the connection stage. Only canonical HTTPS URLs on `customer-portal.paddle.com` (production) or `sandbox-customer-portal.paddle.com` (sandbox), followed by the merchant's `cpl_` identifier, are accepted. No query, credentials, trailing path, fragment, whitespace, custom host or authenticated session link is accepted. The same validation protects the BFF response. No merchant identifier is seeded in the application.

# 2. Purchase admission

2.1 The billing read returns `attempt` and `canCreateCheckout`. The owner action sends only `{expectedAttempt}`. Tenant and actor come from verified identity; price/product and URLs come from server configuration. The request's deterministic replay key includes the observed attempt. A stale request cannot create a later generation even if the current subscription was subsequently canceled.

2.2 Under the tenant advisory barrier, the repository rechecks current owner membership and reads the latest generation. A request older than that generation only replays current status. A future generation conflicts. An equal generation may advance only when no checkout exists, or the current completed checkout has a subscription whose status is `canceled`, is not under review and was verified within the preceding 15 minutes using the database clock. Verification dated in the future is rejected. This freshness window is Connect policy, not a provider guarantee.

2.3 Scheduled cancellation, `active`, `trialing`, `past_due`, `paused`, stale verification, conflicting facts, `creating`, `unknown`, `ready` and `rejected` cannot authorize another purchase. A transaction canceled before completion still requires the operational recovery work in C3.2.5; this release does not reset it. Unknown creation never becomes safe to repeat merely because time passed or a GET did not find a guessed ID.

2.4 A newly admitted generation snapshots the current configured plan and owner, derives its ID from tenant/environment/generation and points to its immutable predecessor. The existing one-POST creation protocol applies independently to it. Earlier transactions and subscriptions remain immutable in identity; no row is deleted or repurposed. A browser replay after losing the acknowledgment returns the existing attempt.

# 3. Database and reconciliation

3.1 Migration `0081_paddle_subscription_lifecycle.sql` upgrades existing generation-one records without replacing their IDs. It replaces tenant/environment checkout uniqueness with tenant/environment/generation uniqueness. Subscription accounts are keyed by tenant/environment/intent. A shared customer ID is allowed; environment/subscription ID stays globally unique and cannot bind another workspace or attempt.

3.2 The database generation guard independently checks immutable sequencing and an eligible predecessor. Application callers acquire the tenant barrier before row locks. Direct writes still cannot insert a second purchase with an active or uncertain predecessor. Existing delete and identity guards remain in place.

3.3 Billing reads and production entitlement look up the account belonging to the latest checkout. Creating a new purchase changes entitlement to `payment-pending` until its own payment and subscription are verified. A historical paid or canceled account cannot determine current entitlement. Sandbox history remains separate from production policy.

3.4 Webhook matching and projection upserts include the exact intent key. Historical notifications update only that history, with existing reconciliation revision fencing and microsecond ordering. Periodic reconciliation currently retains historical completed attempts as well; pruning that polling is an optimization, not a correctness dependency. A newer non-canceled projection for an already canceled subscription is flagged for review; a database guard prevents reactivation. Review flags are never silently cleared.

3.5 Management changes are visible after provider reconciliation; opening the portal or returning to Connect grants no access. The existing five-minute polling and fifteen-minute verification policy still apply. In-flight provider execution that already passed admission cannot be recalled; its accepted usage can still settle.

# 4. Validation and remaining acceptance

4.1 Local checks: 4,573 general tests, both builds, TypeScript, lint with zero errors and 28 existing warnings, source and interface guardrails. Paddle integration has 24 passing cases on PostgreSQL 16.13 and 17.11, including a populated 0080 → 0081 upgrade. PostgreSQL 17 also passed 31 AI, 11 Knowledge and 14 manual-reply regression tests on all 82 migrations. Existing deterministic fixtures only; no Paddle account or payment was contacted.

4.2 This does not prove a live portal sign-in, payment-method update, cancellation or repurchase journey. At connection time, configure the real merchant portal and deploy the same contract revision to Web/API/Worker while Paddle remains disabled; old empty-payload clients fail closed. Then exercise sandbox portal authentication with the buyer, two workspaces paid by one buyer, correct subscription selection, scheduled and immediate cancellation, verified repurchase, replay and authority revocation.

4.3 Remaining C3.2.5: audited resolution of unknown creation, canceled-before-payment/rejected attempts and equal-version conflicts using verifiable provider evidence. Do not invent a replacement identity or clear uncertainty by timeout. Remaining C4.1: actual AI publication readiness, unknown cost/delivery/upload operations, S3 retention/deletion, the historical core PostgreSQL verifier and final review/runbooks. Local code has not been deployed or published from this turn.

# 5. Official sources checked 11.09.2026

5.1 Public portal linking and buyer email sign-in are supported. [Integrate the customer portal](https://developer.paddle.com/build/customers/integrate-customer-portal/).

5.2 The portal supports subscription cancellation, payment-method updates and invoices. [Customer portal release](https://developer.paddle.com/changelog/2024/customer-portal/).

5.3 The current portal domains and merchant portal path are documented. Connect intentionally accepts only the public base URL. [Subscription management links](https://developer.paddle.com/changelog/2025/subscription-management-links-customer-portal/).

5.4 A canceled subscription cannot be reinstated; a new transaction is required for a new subscription. A scheduled end-of-period cancellation leaves the subscription active until its effective date. [Cancel subscriptions](https://developer.paddle.com/build/subscriptions/cancel-subscriptions/).
