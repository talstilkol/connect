# 1. Checkout recovery — R215, 11.09.2026

1.1 Recovery now distinguishes a durable dispatch seal, an original POST response observation, and a provider-confirmed canceled transaction. No public API accepts a transaction ID or response observation as recovery evidence. C3.2.5 still has two operator cases to complete: an entire response lost without a stored identity, and resolution of conflicting subscription facts. Neither case is silently cleared.

# 2. Dispatch and outcome decisions

2.1 Creation first claims an intent, then atomically rechecks the owner and sets `dispatch_sealed=true` before calling Paddle. The authorization callback succeeds once. A lost seal acknowledgment remains uncertain even when the current invocation made no POST, because a committed seal must never be treated as an absence of dispatch.

2.2 A failure before sealing, including configuration mismatch, shutdown or owner revocation, can close the attempt as `not-dispatched`. Expired unsealed claims are closed under the tenant barrier. The old intent is retained. An owner can explicitly create a new generation with its observed attempt; old clicks only replay current status.

2.3 The upgrade treats existing attempts conservatively as sealed. Only an old queued attempt that is freshly claimed can become unsealed. Old unknown/rejected records cannot be retrospectively labeled safe to repeat. This avoids inventing proof about requests sent by an older release.

# 3. Original response observations

3.1 After reading a bounded JSON response to the original POST, the provider adapter persists only HTTP status, a validated `meta.request_id` when present, an exact transaction ID from a successful response when present, and a response digest. It does so before normalizing the business projection. Raw bodies, error details, customer information, credentials and signatures are not stored in this observation table or returned by billing reads.

3.2 A stored successful-response transaction ID can recover an unknown attempt through GET. The worker validates the transaction against the immutable environment/price/product snapshot, checks the reconciliation revision and restores the binding. Completion still requires the separately verified subscription/customer. Recovery does not call POST again, including after losing an observation commit acknowledgment.

3.3 Malformed business fields can be investigated and re-read without losing the original response identity. An oversized/unreadable body, storage failure before any evidence commits, network timeout or error-only response may provide no usable ID. Those attempts stay unknown. A guessed ID, email, browser parameter, custom data or webhook alone cannot fill that gap.

3.4 A stored request ID is a support correlation reference, not proof of payment or proof that no transaction exists. Paddle documents it for support requests. [Paddle errors and request IDs](https://developer.paddle.com/api-reference/about/errors/).

# 4. Canceled transaction closure

4.1 Only GET of the recorded original transaction can close a ready attempt as `transaction-canceled`. The returned ID, configured price/product and null subscription must match; an existing paid account blocks closure. A webhook arriving during GET changes the revision and invalidates the stale closure decision.

4.2 The closure stores the exact transaction reference, provider timestamp, normalized projection digest and database time. Evidence rows cannot be updated, deleted or truncated. Checkout identity is retained, the state cannot be reopened, and a new purchase uses the existing generation fence. A canceled transaction is documented as an immutable financial record. [Transaction lifecycle](https://developer.paddle.com/build/transactions/create-transaction/).

4.3 Returning from checkout, failing a payment, receiving a non-success response or waiting long enough does not prove cancellation. `paid`, `past_due` and unknown outcomes never become canceled through inference.

# 5. Operator investigation and release acceptance

5.1 Inspect the exact intent in the private operational database: its tenant/environment/generation, dispatch seal, reconciliation revision, saved observation, checkout closure and subscription review flag. Use a read-only session and bound query parameters. Keep customer data, API credentials and raw provider replies out of public issues and repository reports.

5.2 For unknown creation without an original response identity, retain the hold and investigate through Paddle support using any saved request ID, the recorded attempt window and the approved account. No new transaction is automatically created. For a subscription conflict, retain `needs_review`; a later successful GET alone does not authorize clearing it. An audited operator-resolution path remains required before customer billing is enabled.

5.3 Deploy the same Web/API/Worker contract and migration 0082 while Paddle is disabled. Then validate in Sandbox: normal creation, pre-seal failure, lost seal acknowledgment, lost observation acknowledgment, GET-only recovery, canceled checkout, old browser replay and a notice racing reconciliation. Local fixtures cannot establish live Paddle acceptance.

5.4 The original administrative tenant lifecycle and paid-access policy remain unchanged. An evidenced closed checkout permits a new purchase; it does not itself grant paid execution. An admitted provider request that is already in flight cannot be recalled.
