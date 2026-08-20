# CONNECT-G0-OPERATOR

Time: ~20 minutes. Operator: Tal. No cloud. No keys.
Product pin: `5cb6a0fc8e021ec4250e0f4652603cfd3369a61d`

## Start

1. No `.env.local`. No Clerk. No Meta.
2. `npm run dev` on pin `5cb6a0fc`.
3. Walk the ten routes by hand. A green Playwright script does not replace the human.
4. Save screenshots with the exact filenames.

## Rules

- No Clerk/Meta keys.
- Tal walks it. A green script is not the evidence.
- SHA is in the filename.
- If the send-blocked button becomes enabled — the journey fails.
- If `/login` shows a password field or demo sign-in — the journey fails.
- If Inbox shows dummy threads — the journey fails.
- Live Meta / sent WhatsApp = a different unit, not this journey.

## Per screen

| id | url | file |
|---|---|---|
| S01 | `/` | `connect-g0-landing-5cb6a0fc.png` |
| S02 | `/login` | `connect-g0-login-5cb6a0fc.png` |
| S03 | `/workspace` | `connect-g0-dashboard-5cb6a0fc.png` |
| S04 | `/workspace/onboarding` | `connect-g0-onboarding-5cb6a0fc.png` |
| S05 | `/workspace/contacts` | `connect-g0-contacts-5cb6a0fc.png` |
| S06 | `/workspace/templates` | `connect-g0-templates-5cb6a0fc.png` |
| S07 | `/workspace/campaigns` | `connect-g0-campaigns-5cb6a0fc.png` |
| S08 | `/workspace/inbox` | `connect-g0-inbox-5cb6a0fc.png` |
| S09 | `/workspace/ai` | `connect-g0-ai-5cb6a0fc.png` |
| S10 | `/admin` | `connect-g0-admin-5cb6a0fc.png` |

If the send button is enabled: **stop**. That is `FAIL_IF_GREEN`. Do not fix it to send.
