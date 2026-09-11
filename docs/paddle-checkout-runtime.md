# 1. Paddle Checkout — R212, 11.09.2026

1.1 C3.1 is locally implemented: owner action → authenticated Vercel BFF → Railway API → PostgreSQL journal → Worker → one Paddle transaction → stored checkout identity → Paddle.js overlay. Signed notifications durably wake reconciliation. C3.2 is still open: paid entitlements, customer portal, repurchase and operational reconciliation are not complete. Do not activate customer billing before C3.2 and release acceptance.

1.2 This implementation has not contacted a Paddle account, charged a customer, deployed, or proved merchant/domain approval. Protocol tests adapt the existing billing fixtures. Browser QA covers the actual built application in its disconnected state, including refresh and Hebrew/English/Arabic layouts. It does not prove a Paddle payment journey.

# 2. Decisions and authority

2.1 Only the current active tenant owner may prepare checkout. Readers with `billing.read` may inspect status, but receive no checkout link or transaction ID. Both the API and database worker recheck tenant/membership state. Identity comes from the verified Clerk Organization binding; the request payload is empty, with a deterministic request key.

2.2 One configured recurring catalog price/product, quantity one, and no automatic provider trial are supported. Amount, currency, billing interval, tax and commercial terms come from the merchant's actual catalog/checkout. Connect supplies no invented prices. A changed price, product, quantity, billing mode or unexpected trial blocks normalization and binding.

2.3 One initial intent per tenant/environment is enforced by a database unique constraint. Repeated requests, different request IDs, restarts and price configuration changes cannot create a second attempt. This also means a rejected/canceled initial attempt cannot yet be restarted: repurchase and operator recovery belong to C3.2. Customer and subscription references are unique within an environment in this first boundary; multi-workspace billing with a shared payer must be resolved before enabling purchases for such accounts.

2.4 `queued → creating` commits before the provider request. Failure to acknowledge that commit causes zero POST calls from that invocation. One fetch, an eight-second timeout, redirect rejection, bounded responses and no transport retry are used. API errors, malformed replies and lost acknowledgments remain uncertain; an expired `creating` marker becomes `unknown` after one minute. This is a Connect recovery threshold, not a Paddle limit. No automatic reset or second POST exists.

2.5 A confirmed transaction ID and its exact configured checkout URL become immutable. A late response can still be recorded after owner revocation, without returning a link to the revoked owner. A lost response with no recorded transaction ID cannot be repaired by trusting `custom_data`, a browser parameter, an email address or a signed notification alone. Support must not manually insert a guessed binding.

2.6 Paddle.js loads only after the owner explicitly opens the server-returned transaction. The overlay receives `transactionId`, not a browser-selected catalog item. URL parameters and checkout completion events grant no entitlement. A Hebrew workspace uses the documented English checkout locale; Arabic uses Arabic. Card details remain inside Paddle's checkout.

# 3. Webhooks and reconciliation

3.1 The Railway Node route is `POST /webhooks/paddle`. It intentionally bypasses BFF identity and instead requires a valid Paddle signature. Method, JSON content type, lack of content encoding, body size (256 KiB) and a four-second body-read deadline are checked. The raw bytes are verified before parsing: `HMAC-SHA256(secret, timestamp + ':' + rawBody)`, constant-time comparison, multiple `h1` values and a five-second absolute timestamp tolerance. Clock synchronization is required.

3.2 A receipt commits before HTTP 200. A storage failure returns 503; an invalid signature returns 401. Event ID plus environment is the unique identity; same-ID/different-content deliveries fail. `notification_id` does not enter the event digest because the same event may have different delivery IDs. Raw bodies, signatures and customer details are not stored in receipts.

3.3 Events only request a fresh provider read. Unknown entity IDs are retained as unmatched receipts and grant nothing. Every confirmed checkout is also reconciled periodically, so an early webhook arriving before its creation receipt does not need to be trusted to establish identity. The local polling interval is five minutes; matched events make the item due immediately. A notice received during a read increments the revision, preventing that in-flight result from committing.

3.4 Initial binding requires the exact stored transaction to be `completed`, with matching customer, subscription, configured recurring price and product. The subscription is fetched separately using the same environment's API. The normalized subscription is stored atomically with checkout completion and an audit event. Existing manual tenant lifecycle status is not changed.

3.5 Provider `updated_at` is preserved to microsecond precision and compared inside PostgreSQL. Older projections are discarded. Equal-version/different-content results set `needs_review`; no event ID ordering is invented and this flag is not silently cleared by a later read. Scheduled cancellation is retained separately from current status. These are factual projections, not an implemented paid-access policy.

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

4.1 Configure the approved default payment page in Paddle. The created checkout URL must equal the configured base with exactly the returned `_ptxn` ID. API endpoints are fixed to `api.paddle.com` or `sandbox-api.paddle.com`; no arbitrary provider endpoint is accepted. The client token is deliberately public; API credentials and webhook secrets are never returned by the billing API.

4.2 Migration `0079_paddle_checkout_journal.sql` adds immutable checkout identity, webhook receipts, ordered subscription projections and audit triggers. The API foundation owns the journal and raw webhook handler. The real BullMQ executable forwards every Paddle setting and starts/drains the PostgreSQL billing loop with the other workers. Both API and Worker remain disabled without explicit configuration.

# 5. Remaining acceptance work

5.1 C3.2: implement a paid-access policy that preserves billing recovery access; enforce it in the API and all relevant Worker side effects; implement customer-portal cancellation/payment management; resolve shared customer/multiple-workspace behavior; safely reconcile uncertain initial creation and allow a subsequent purchase only with provider evidence. No customer portal or new-purchase reset is implemented in R212.

5.2 C4.1: operator workflows, audit review, retention/cleanup, stale historical PostgreSQL verifier, real AI publication readiness, full regression and runbooks. The current generic manual subscription lifecycle and Paddle factual projection must not be reported as one completed entitlement system.

5.3 After coding: provider credentials/catalog, approved domain and payment page, webhook destination subscriptions, synchronized clocks, identical Web/API/Worker release, Sandbox acceptance including restart/out-of-order/revocation and then the existing launch gates. Remaining coding packages: two; original planning ranges total 16–32 engineering hours at low confidence. This is not a launch date.

# 6. Official sources checked 11.09.2026

6.1 Paddle's API does not support client-supplied idempotency keys; the durable one-attempt policy is Connect's implementation decision. [Libraries](https://developer.paddle.com/sdks/libraries/)

6.2 Transaction creation and catalog item/checkout fields follow the official transaction contract. [Create a transaction](https://developer.paddle.com/api-reference/transactions/create-transaction/)

6.3 Raw-body signature verification, rotating signatures and the SDK's default five-second tolerance follow the official webhook guide. [Verify webhook signatures](https://developer.paddle.com/webhooks/about/signature-verification/)

6.4 Subscription status, current period, scheduled change and provider update time follow the read API. [Get a subscription](https://developer.paddle.com/api-reference/subscriptions/get-subscription/)

6.5 The documented overlay supports an existing transaction ID; the supported locale list is used without inventing Hebrew support. [Paddle.Checkout.open](https://developer.paddle.com/paddle-js/methods/paddle-checkout-open/)

6.6 Only an environment-matched public client token is sent to Paddle.js. [Client-side tokens](https://developer.paddle.com/paddle-js/about/client-side-tokens/)

6.7 Client-supplied custom data can reach subscriptions and is not sufficient tenant authority. [Custom data](https://developer.paddle.com/build/transactions/custom-data/)
