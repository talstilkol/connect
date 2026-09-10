# CONNECT-G0

Date: 2026-08-20
Executor: Grok (RC-004)
Product pin: `5cb6a0fc8e021ec4250e0f4652603cfd3369a61d` (5cb6a0fc) · 9 Aug 2026 14:36 UTC
This docs commit may move `connect/main` HEAD. The product pin stays `5cb6a0fc`.

## Verdict

G0 filled against the live tree, not a guess. 5 Ready = declared bindings. 17 Blocked. 11 decisions HOLD. The two journey blockers are send adapters — fail-closed on purpose. The next journey is local rehearsal with a visible error, not live WhatsApp. G4 this month: no.

Ready checks = **DECLARED** bindings in code/wrangler. They are not live D1/R2/Queue resources.

## Counts

- Total: 33
- Ready (DECLARED): 5
- Blocked: 17
- Decision required (HOLD 90 days): 11
- Production: 15.2% · intentional No-Go

## Forbidden

- Do not set `campaignDeliveryAdapter` or `botReplyDeliveryAdapter` to true.
- Do not mark Browser Evidence PASS.
- Do not mix local 1,172 tests with a future screenshot into one PASS.
- Do not run Session 446 in codextal.
- Do not declare PRODUCTION_COMPLETE.

## Journey (locked)

`J-REHEARSAL-FAILCLOSED` — local rehearsal

1. `npm run dev` without Clerk/Meta keys
2. Open Workspace in rehearsal — local draft marked, not durable save
3. Navigate: dashboard → contacts (local CSV) → template draft → campaign draft → Inbox
4. Attempt campaign activation / manual send → blocked in UI and server
5. Error visible to the user. No fake success. No live WhatsApp
6. Screenshot + log bound to `5cb6a0fc`

Out of scope: production Clerk login; Embedded Signup / real WABA; Meta send; Paddle / OpenAI / Scanner; team-invitation Browser Evidence; Cloudflare deploy.

Sad path: missing Clerk → rehearsal. missing adapter → fail-closed. That is journey success, not failure.

## Local release gate

NOT_RUN on this executor. Do not infer PASS from README 1,172.

## Browser evidence

NOT_RUN. No staging, no six identities, no D1 read token.

## Units

See `CONNECT-G0-QUEUE.md`. U01–U02 are this commit. U05/U06 stay NOT_RUN. U11–U14 stay BLOCKED_EXTERNAL (Tal).
