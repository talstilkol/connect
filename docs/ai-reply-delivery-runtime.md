# 1. Approved AI reply delivery — R210

1.1 An approved `agent-approval` draft is eligible only when its completed API mutation receipt and matching approval audit exist, and its settled generation journal contains the exact reply. Migration 0077 makes approval payloads immutable and gives delivery a separate durable lifecycle. Historical drafts lacking that evidence and automatic-mode drafts are not dispatched by this worker.

1.2 The poller stages one deterministic intent per approved outbox item. Before claiming and again before committing permission to POST, it checks tenant/membership permissions, the active published agent version, ready linked knowledge passages, recipient/contact state, and the current unassigned automation conversation. Another inbound or human takeover stops an unsent draft. The 24-hour service window derives from the original inbound message in `messages`; imported history and Business App echoes do not open it.

1.3 A claim captures the credential revision/digest, Meta asset IDs, policy event, contact/conversation versions and window expiry. No access token is written to the delivery table. Claims are reclaimable after 60 seconds only before a committed send. A changed binding stops the old claim.

# 2. Configuration and execution

2.1 Set `AI_REPLY_DELIVERY_ENABLED=true` explicitly on the Railway worker, alongside the existing verified `META_GRAPH_API_VERSION`, `META_CREDENTIAL_ENCRYPTION_KEY_V1` and `WHATSAPP_RATE_LIMIT_HMAC_KEY_V1`. The default is disabled. No account values or limits are supplied by this document. Generation (`AI_RESPONSES_ENABLED`) and human replies (`MANUAL_REPLY_ENABLED`) can be paused independently.

2.2 The executable forwards all AI settings into the worker. The delivery worker shares the existing Meta text transport, tenant credential vault and rate ledger with human/bot replies. Its own repository enforces AI approval authority; it does not assign the conversation to the approver. Migration 0056's exact tenant barrier hash is acquired before rate reservations or settlement/cooldown row locks, including in the historical 0053 migration rehearsal.

2.3 The provider POST occurs only after the `sending` transition commits. A timeout, 5xx or lost acknowledgement never authorizes another POST. After two minutes, an abandoned `sending` row becomes `unknown`. Verified provider rejection is terminal; evidenced 130429/131056 cooldowns apply through the shared ledger. These are existing retry-policy rules, not new Meta limits.

# 3. Results and operations

3.1 `queued` → `preparing` → `sending` → `sent` / `failed` / `unknown`. Deferral before POST returns to `queued`; a stale or revoked intent becomes `failed`. State transitions are audited without copying message text to audit metadata.

3.2 `sent` means provider acceptance. The same transaction inserts the outbound Inbox message. The existing webhook status path records delivery/read/failure afterward. Late acceptance still records the effect after revocation or takeover and preserves any newer inbound projection. Early status callbacks can be retried by the existing webhook queue until the message exists.

3.3 Pending/failed/unknown intents appear in the conversation's existing pending-delivery view, even when human sending is disabled. An unknown AI delivery blocks another direct human-send command for that conversation. Do not clear, recreate or requeue an uncertain intent. Verified operational reconciliation remains in C4.1; no guessed delivery result is presented as truth.

3.4 Local evidence is in [the R210 report](../outputs/launch-validation-2026-09-09/ai-delivery-validation-20260911.json). It does not prove a real provider connection, live QR onboarding, deployment or launch acceptance.


## R220 — בירור קבלת ההודעה המקורית

כלי פרטי יכול לקשור קבלת ספק מוכחת או לסגור אי־קבלה סופית. אין POST נוסף או שחרור מכסה מוקדם; אישור מאוחר נשמר ומתקן את מצב המסירה תוך שמירת ההכרעה המקורית. [הפעלה והרשאות](uncertain-outcome-recovery.md).
