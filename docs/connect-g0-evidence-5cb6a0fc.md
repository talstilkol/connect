# CONNECT-G0 evidence log — 5cb6a0fc

Date: 2026-08-20
Executor: Grok sandbox (not Tal-at-keyboard)
Product pin: `5cb6a0fc8e021ec4250e0f4652603cfd3369a61d`

## Allowed labels used

- `STRING_LOCK_VERIFIED` — source test still contains every mustSee / mustNot for the ten screens
- Photos: **NOT_RUN**
- `rendered-html.test.mjs` execution: **NOT_RUN** (needs `dist/server/index.js`; this sandbox has no clone token)
- Result: **not** `PASS_FAILCLOSED`. Human photos still required.

## Adapters on the pin

`server/operations/productionImplementationState.ts` @ `5cb6a0fc`:

- `campaignDeliveryAdapter`: **false**
- `botReplyDeliveryAdapter`: **false**

Do not flip.

## String lock vs `tests/rendered-html.test.mjs`

| screen | route | mustSee in test | mustNot in test |
|---|---|---|---|
| S01 landing | `/` | yes | yes (`codex-preview`) |
| S02 login | `/login` | yes | yes (`name="password"`) |
| S03 dashboard | `/workspace` | yes | yes |
| S04 onboarding | `/workspace/onboarding` | yes | Tenant not in this test; local-save strings yes |
| S05 contacts | `/workspace/contacts` | yes | yes |
| S06 templates | `/workspace/templates` | yes | pending_review not asserted; Meta-send strings yes |
| S07 campaigns | `/workspace/campaigns` | yes (`השליחה חסומה`) | Activation not asserted as mustNot in test |
| S08 inbox | `/workspace/inbox` | yes | yes |
| S09 ai | `/workspace/ai` | yes | yes |
| S10 admin | `/admin` | yes | yes |

Source file SHA: `dc907ffd0de950a4ce5d87899b1f9200059c8b2a`.

## What this is not

- Not a Tal walkthrough
- Not Playwright against a running vinext
- Not Browser Evidence for team invitations
- Not PRODUCTION_COMPLETE

Tal still photographs. Filenames stay `connect-g0-<screen>-5cb6a0fc.png`.
