# 1. Paddle Checkout — R212, 11.09.2026

1.1 C3.1 is locally implemented: owner action → authenticated Vercel BFF → Railway API → PostgreSQL journal → Worker → one Paddle transaction → stored checkout identity → Paddle.js overlay. Signed notifications durably wake reconciliation. Current status after R215: paid entitlements, public customer portal and verified-cancellation repurchase are implemented locally; R215 adds evidenced checkout recovery; C3.2.5 operator investigation without an original identity and subscription conflict resolution remain open. See [checkout recovery](paddle-checkout-recovery.md). Do not activate customer billing before C3.2 and release acceptance.

1.2 This implementation has not contacted a Paddle account, charged a customer, deployed, or proved merchant/domain approval. Protocol tests adapt the existing billing fixtures. Browser QA covers the actual built application in its disconnected state, including refresh and Hebrew/English/Arabic layouts. It does not prove a Paddle payment journey.

# 2. Decisions and authority

2.1 Only the current active tenant owner may prepare checkout. Readers with `billing.read` may inspect status, but receive no checkout link or transaction ID. Both the API and database worker recheck tenant/membership state. Identity comes from the verified Clerk Organization binding; creation supplies only the observed `expectedAttempt`, included in the deterministic request key (R214).

2.2 One configured recurring catalog price/product, quantity one, and no automatic provider trial are supported. Amount, currency, billing interval, tax and commercial terms come from the merchant's actual catalog/checkout. Connect supplies no invented prices. A changed price, product, quantity, billing mode or unexpected trial blocks normalization and binding.

2.3 R214 replaces the initial one-attempt restriction with immutable sequential generations. A new attempt requires fresh verified cancellation of the preceding subscription. Old requests replay current status. A shared customer may fund several workspaces; each subscription remains unique within its environment. Unknown/rejected and canceled-before-payment recovery remains C3.2.5 work. [Current lifecycle contract](paddle-subscription-lifecycle.md).

2.4 `queued → creating` commits before the provider request. Failure to acknowledge that commit causes zero POST calls from that invocation. One fetch, an eight-second timeout, redirect rejection, bounded responses and no transport retry are used. API errors, malformed replies and lost acknowledgments remain uncertain; an expired `creating` marker becomes `unknown` after one minute. This is a Connect recovery threshold, not a Paddle limit. No automatic reset or second POST exists.

2.5 A confirmed transaction ID and its exact configured checkout URL become immutable. A late response can still be recorded after owner revocation, without returning a link to the revoked owner. A lost response with no recorded transaction ID cannot be repaired by trusting `custom_data`, a browser parameter, an email address or a signed notification alone. Support must not manually insert a guessed binding.

2.6 Paddle.js loads only after the owner explicitly opens the server-returned transaction. The overlay receives `transactionId`, not a browser-selected catalog item. URL parameters and checkout completion events grant no entitlement. A Hebrew workspace uses the documented English checkout locale; Arabic uses Arabic. Card details remain inside Paddle's checkout.

# 3. Webhooks and reconciliation

3.1 The Railway Node route is `POST /webhooks/paddle`. It intentionally bypasses BFF identity and instead requires a valid Paddle signature. Method, JSON content type, lack of content encoding, body size (256 KiB) and a four-second body-read deadline are checked. The raw bytes are verified before parsing: `HMAC-SHA256(secret, timestamp + ':' + rawBody)`, constant-time comparison, multiple `h1` values and a five-second absolute timestamp tolerance. Clock synchronization is required.

3.2 A receipt commits before HTTP 200. A storage failure returns 503; an invalid signature returns 401. Event ID plus environment is the unique identity; same-ID/different-content deliveries fail. `notification_id` does not enter the event digest because the same event may have different delivery IDs. Raw bodies, signatures and customer details are not stored in receipts.

3.3 Events only request a fresh provider read. Unknown entity IDs are retained as unmatched receipts and grant nothing. Every confirmed checkout is also reconciled periodically, so an early webhook arriving before its creation receipt does not need to be trusted to establish identity. The local polling interval is five minutes; matched events make the item due immediately. A notice received during a read increments the revision, preventing that in-flight result from committing.

3.4 Initial binding requires the exact stored transaction to be `completed`, with matching customer, subscription, configured recurring price and product. The subscription is fetched separately using the same environment's API. The normalized subscription is stored atomically with checkout completion and an audit event. Existing manual tenant lifecycle status is not changed.

3.5 Provider `updated_at` is preserved to microsecond precision and compared inside PostgreSQL. Older projections are discarded. Equal-version/different-content results set `needs_review`; no event ID ordering is invented and this flag is not silently cleared by a later read. Scheduled cancellation is retained separately from current status. R213 added paid execution policy; R214 selects only the latest checkout account for that policy.

# 4. Configuration and runtime ownership

| Setting | Requirement |
|---|---|
| `PADDLE_ENABLED` | Disabled unless exactly `true`; invalid enabled configuration fails startup |
| `PADDLE_ENVIRONMENT` | Explicit `sandbox` or `production`, without a fallback |
| `PADDLE_API_KEY` | Server-only API credential; transaction read/write and subscription read are required |
| `PADDLE_WEBHOOK_SECRET` | Secret for the exact Paddle notification destination |
| `PADDLE_CLIENT_TOKEN` | Public Paddle.js token whose environment matches the configuration |
| `PADDLE_PRICE_ID` / `PADDLE_PRODUCT_ID` | Actual recurring catalog price/product; no seeded values |
| `PADDLE_CHECKOUT_BASE_URL` | Canonical HTTPS URL of the Connect billing page; no query/fragment/credentials/port |
| `PADDLE_CUSTOMER_PORTAL_URL` | Actual public merchant portal URL on the matching Paddle environment; no authenticated token or deep link |

4.1 Configure the approved default payment page in Paddle. The created checkout URL must equal the configured base with exactly the returned `_ptxn` ID. API endpoints are fixed to `api.paddle.com` or `sandbox-api.paddle.com`; no arbitrary provider endpoint is accepted. The client token is deliberately public; API credentials and webhook secrets are never returned by the billing API.

4.2 Migration `0079_paddle_checkout_journal.sql` adds immutable checkout identity, webhook receipts, ordered subscription projections and audit triggers. The API foundation owns the journal and raw webhook handler. The real BullMQ executable forwards every Paddle setting and starts/drains the PostgreSQL billing loop with the other workers. Both API and Worker remain disabled without explicit configuration.

# 5. Remaining acceptance work

5.1 C3.2.1–C3.2.4 are locally verified. C3.2.5 remains open: safe, audited operator resolution for unknown initial creation, rejected/canceled-before-payment transactions and projection conflicts. No automatic reset or guessed binding is allowed.

5.2 C4.1: operator workflows, audit review, retention/cleanup, stale historical PostgreSQL verifier, real AI publication readiness, full regression and runbooks. The current generic manual subscription lifecycle and Paddle factual projection must not be reported as one completed entitlement system.

5.3 After coding: provider credentials/catalog, approved domain and payment page, webhook destination subscriptions, synchronized clocks, identical Web/API/Worker release, Sandbox acceptance including restart/out-of-order/revocation and then the existing launch gates. Remaining coding packages: two, with six subtasks; revised planning estimate 12–24 engineering hours at low confidence. This is not a launch date.

# 6. Official sources checked 11.09.2026

6.1 Paddle's API does not support client-supplied idempotency keys; the durable one-attempt policy is Connect's implementation decision. [Libraries](https://developer.paddle.com/sdks/libraries/)

6.2 Transaction creation and catalog item/checkout fields follow the official transaction contract. [Create a transaction](https://developer.paddle.com/api-reference/transactions/create-transaction/)

6.3 Raw-body signature verification, rotating signatures and the SDK's default five-second tolerance follow the official webhook guide. [Verify webhook signatures](https://developer.paddle.com/webhooks/about/signature-verification/)

6.4 Subscription status, current period, scheduled change and provider update time follow the read API. [Get a subscription](https://developer.paddle.com/api-reference/subscriptions/get-subscription/)

6.5 The documented overlay supports an existing transaction ID; the supported locale list is used without inventing Hebrew support. [Paddle.Checkout.open](https://developer.paddle.com/paddle-js/methods/paddle-checkout-open/)

6.6 Only an environment-matched public client token is sent to Paddle.js. [Client-side tokens](https://developer.paddle.com/paddle-js/about/client-side-tokens/)

6.7 Client-supplied custom data can reach subscriptions and is not sufficient tenant authority. [Custom data](https://developer.paddle.com/build/transactions/custom-data/)

# 7. R213 update — paid execution

7.1 Production checkout now durably adopts paid execution policy, enforced in API and Worker boundaries with database guards. Earlier statements that no entitlement gate exists describe R212 only. C3.2 remains incomplete for management, repurchase and operational recovery. [Current policy and tests](paddle-paid-access-runtime.md).

# 8. R214 update — management and sequential purchases

8.1 C3.2.3/C3.2.4 are locally implemented. Earlier limitations in the R212/R213 snapshots are superseded by the [current lifecycle contract](paddle-subscription-lifecycle.md). No live portal/payment acceptance or deployment is claimed.
