# 1. Paid execution — R213, 11.09.2026

1.1 C3.2 now has locally verified entitlement policy and execution gates. Subscription management, shared-payer handling, repurchase and evidence-backed recovery are still unfinished. Billing must remain disabled for customers until those paths are complete. No provider account, live charge or deployment was used.

1.2 A first production checkout durably adopts paid policy, even before completion. An account or checkout cannot be deleted to regain pilot access. The gate reads persisted PostgreSQL records independently of PADDLE_ENABLED; disabling reconciliation eventually stops paid execution instead of restoring free access. Existing manually authorized pilots keep their administrative tenant policy. Sandbox records do not grant or revoke production entitlement. Public self-service commercial onboarding is not authorized by this pilot exception.

# 2. Access policy

| Database state | Paid execution |
|---|---|
| Tenant administratively inactive | Denied |
| No production checkout/account, administratively eligible pilot | Existing manual policy |
| Production checkout without a verified account | Denied; billing remains accessible |
| Active, current period, verified in the preceding 15 minutes, no review | Allowed |
| Trialing, past_due, paused, canceled | Denied |
| Future/expired period or effective cancel/pause | Denied |
| Conflicting projection, stale or future-dated verification | Denied |

2.1 The database clock controls period and scheduled-stop boundaries. Future scheduled cancellation preserves access until its effective time or the earlier period/freshness boundary. A five-minute reconciliation cadence and 15-minute verification allowance are Connect policy, not Paddle guarantees. There is no additional past-due grace for new resource-consuming actions. The original checkout contract disallows trials.

2.2 Webhooks still only wake canonical reconciliation. Duplicate and old responses cannot overwrite newer facts; an old projection cannot refresh verified_at. A lost webhook/provider outage can leave a cached entitlement valid only until the earliest configured boundary above. Revocation is therefore bounded by this cache policy, not claimed to be instantaneous at Paddle.

# 3. Execution boundaries

3.1 PostgreSQL API composition always supplies the paid gate. Core mutations default to requiring access, including newly registered mutations. Reads, consent withdrawal, conversation read/assignment, and campaign pause/cancel remain available. Campaign resume is gated. Billing and account recovery stay outside the paid gate; identity and role checks still apply.

3.2 Manual reply enqueue/seal, AI delivery claim/seal, Knowledge enqueue/worker authorization, AI generation admission/claim, Bot provider-request claim, campaign preparation and template submission check current entitlement. WhatsApp quota allocation also checks access. API admission alone is insufficient: a queued job is checked at its execution boundary.

3.3 Application gates acquire the existing tenant advisory barrier before row locks and then issue a fresh read. The production campaign repository receives a transaction manager for that boundary. Transaction-executor callers also retain the SQL predicate. Migration 0080 adds database guards for Bot provider-request insertion, generation claims, and transitions to manual/AI sending, Knowledge uploading, campaign sending and template submitting, including alternate pinned callers.

3.4 AI checks authority before input-token counting, then again when acquiring its durable generation claim. Already accepted sends and incurred usage settle after revocation. A cancellation after the committed execution admission cannot recall an in-flight provider request; evidence is retained and no automatic duplicate request is permitted. Read-only subscription status now exposes the access reason, rendered in Hebrew, Arabic and English without provider secrets.

# 4. Validation and remaining work

4.1 Full local release command: 4,571 tests passed, zero failures/skips, both vinext and Next builds passed. TypeScript passed; npm run lint reports zero errors and 28 existing warnings. Source guardrails passed. A broad direct eslint invocation included generated/legacy files; the project lint command is the applicable check.

4.2 Real PostgreSQL 16.13/17.11 rehearsals cover the complete 81-migration schema, paid period and schedule boundaries, durable production adoption, stale/conflicting evidence, concurrent revocation while waiting for admission, generation count/dispatch revocation, settlement after cancellation, and canceled manual/AI/Knowledge work. See the final validation report for exact suite counts. Protocol data reuses the existing deterministic test fixtures and database time; no provider was contacted.

4.3 Remaining C3.2: buyer-authorized billing management/cancellation/payment update, shared-payer privacy and repeated purchases, recovery of unknown creation and conflicting projections from provider evidence. C4.1 retains readiness wiring, operational reconciliation, S3 retention, the historical PostgreSQL verifier update and final review. The programming task is not complete.

# 5. Primary sources checked 11.09.2026

5.1 Paddle describes storing entitlement-critical state, scheduled changes and periodic reconciliation. The stricter past-due and freshness behavior here is Connect's decision. [Provision subscription access](https://developer.paddle.com/build/subscriptions/provision-access-webhooks/).

5.2 Authenticated customer portal sessions expose customer billing operations and contain temporary links that must not be cached. A subscription-specific link is not proof of tenant isolation for a payer with several businesses; that issue must be resolved before enabling customer billing management. [Customer portal sessions](https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session/).
