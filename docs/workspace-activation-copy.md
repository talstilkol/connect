# Workspace activation status

The dashboard and decision center distinguish recorded planning choices from
provider configuration and verification in the active environment. The existing
readiness report remains the source of status and counts. This display change
does not approve decision records or enable provider features.

The team view uses a localized workspace label instead of naming a database
adapter. It explains unavailable invitations in terms of connection and joining
the workspace. Role permissions, protected references, and disabled mutation
controls are unchanged.

The knowledge policy display now matches the implemented first release:
TXT/Markdown up to 128 KiB, quarantine and verified scanning before use.
PDF and Office remain outside that release. The historical decision intake is
preserved; its registry assertion follows the current implementation scope.

Validation: 39 existing focused and rendered tests, TypeScript, targeted ESLint,
Vinext build, source/interface/secret guardrails, and browser checks of the team,
decision center, and dashboard in Hebrew, English, and Arabic. The browser used
the actual local Clerk/PostgreSQL demo. Provider acceptance remains pending.
