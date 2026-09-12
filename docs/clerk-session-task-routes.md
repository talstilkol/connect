# Resuming incomplete account setup

A Clerk Development demo login reached `/login/tasks?redirect_url=...`,
which returned Connect's 404 page. The app only hosted its hash-routed
SignIn and SignUp components at the exact login and register paths.
Pending sessions can also resume through server-side task URLs.

## Changes

1. Host the existing authentication pages at `/login/tasks` and
   `/register/tasks`, including nested task paths and the existing English
   and Arabic locale prefixes. Reuse the same form and metadata so Clerk
   continues to own task selection, MFA, organization selection and redirects.
2. Run the Clerk proxy on the new root task routes. Existing protected
   resource checks and rejection of unsupported locales remain in place.
3. Describe incomplete workspace service connections accurately in Hebrew,
   English and Arabic across business profiles, contacts and import, reports,
   teams, campaigns, bot flows and conversations. These results cover both
   identity and API configuration; they cannot establish that Clerk or the
   former D1 service is the missing dependency. The profile message explicitly
   states that the profile was not saved. Configuration checks and persistence
   behavior remain unchanged.

No demo login endpoint, hardcoded identity, session token, authentication
bypass, dependency change, database migration or provider configuration is
added to the application.

## Validation

- Reproduced the 404 in a real browser while resuming a pending demo session.
- The middleware regression failed for `/login/tasks` before the matcher fix.
- Verified task routes and organization selection in the local browser;
  selecting the dedicated demo organization reached the protected workspace.
- The first full local release gate passed 4,624 tests and both builds.
  The final validation report records checks after the wording correction.
- Saving the demo business profile reached the server and reported missing
  service configuration. A live identity session is not proof of a persisted
  Connect tenant or a configured data service.

## References

- [Clerk session tasks](https://clerk.com/docs/guides/configure/session-tasks)
- [Clerk task redirects](https://clerk.com/docs/nextjs/reference/components/control/redirect-to-tasks)
- [Clerk Agent Tasks for isolated tests](https://clerk.com/docs/guides/development/testing/agent-tasks)

The demo uses a separately authorized Development user and organization.
Its resource IDs and short-lived session receipts are kept in local launch
evidence, outside this change. Personal MFA enrollment and production
acceptance remain separate requirements.
