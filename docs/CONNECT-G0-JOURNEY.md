# CONNECT-G0-JOURNEY

Date: 2026-08-20
Executor: Grok (RC-005)
Product pin: `5cb6a0fc8e021ec4250e0f4652603cfd3369a61d` (5cb6a0fc)
Docs HEAD may move. Product pin stays `5cb6a0fc`.
`rendered-html.test.mjs`: **NOT_RUN** on this executor. Strings locked from that test on the pin.

## Verdict

Success is fail-closed. A live WhatsApp send is a **failure** of this journey.
Ten screens are locked. Tal photographs. Nobody fakes a send.

## Screens

### S01 · Hebrew landing
- route: `/`
- mustSee: Hebrew WhatsApp landing, prices not yet defined
- mustNot: `codex-preview`, `Your site is taking shape`
- file: `connect-g0-landing-5cb6a0fc.png`

### S02 · Login without Clerk
- route: `/login`
- mustSee: Clerk ready but not enabled, no substitute user, no fake login
- mustNot: password field, `Sign in as demo`
- file: `connect-g0-login-5cb6a0fc.png`

### S03 · Rehearsal dashboard
- route: `/workspace`
- mustSee: control center, Meta missing, 0/10, production-blocking decisions
- mustNot: first step official Meta connect as a green path
- file: `connect-g0-dashboard-5cb6a0fc.png`

### S04 · Local business profile
- route: `/workspace/onboarding`
- mustSee: local business save, no Tenant created
- mustNot: Tenant ID, externalUserId
- file: `connect-g0-onboarding-5cb6a0fc.png`

### S05 · CSV import rehearsal
- route: `/workspace/contacts`
- mustSee: choose contacts file, data not uploaded, Clerk unset
- mustNot: save contact
- file: `connect-g0-contacts-5cb6a0fc.png`

### S06 · Local template draft
- route: `/workspace/templates`
- mustSee: Local rehearsal, local save, deleted on refresh, not sent to Meta
- mustNot: sent to Meta, pending_review
- file: `connect-g0-templates-5cb6a0fc.png`

### S07 · Send blocked
- route: `/workspace/campaigns`
- mustSee: Campaign draft, save a local template first, «השליחה חסומה»
- mustNot: Activation, sent, accepted
- file: `connect-g0-campaigns-5cb6a0fc.png`
- note: disabled send button = journey **success**

### S08 · Empty inbox (real empty)
- route: `/workspace/inbox`
- mustSee: conversation box, no substitute threads
- mustNot: suggested reply, approve reply, search threads
- file: `connect-g0-inbox-5cb6a0fc.png`

### S09 · Agent blocked
- route: `/workspace/ai`
- mustSee: AI agent library needs Clerk+D1, upload needs R2
- mustNot: knowledge reply, fake policy PDF
- file: `connect-g0-ai-5cb6a0fc.png`

### S10 · Admin fail-closed
- route: `/admin`
- mustSee: Admin unset, Clerk required
- mustNot: manual subscription create
- file: `connect-g0-admin-5cb6a0fc.png`

## Forbidden

- Flip send adapters
- Mock Clerk user / password field
- Mark Browser Evidence PASS
- Session 446
- PRODUCTION_COMPLETE
