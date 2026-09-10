# 1. Connect — Stale Private-repository claim observation

## 1.1 זהות וגבול

1.1.1 `artifactId=CONNECT-STALE-PRIVATE-REPOSITORY-CLAIM-OBSERVATION-2026-08-29-R1`.

1.1.2 `observationClass=READ-ONLY-SOURCE-DRIFT-INVENTORY; NOT-A-SOURCE-EDIT; NOT-A-GITHUB-MUTATION`.

1.1.3 binding Decision=`repository remains Public`; Decision root=`/Users/tal/Documents/connect/web/docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md`; SHA-256=`448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`.

1.1.4 live baseline observation reports `talstilkol/connect`, default branch `main`, `isPrivate=false`; no live setting was changed by this scan.

1.1.5 חיפוש זה מסווג Claims סותרים; הוא אינו מוחק Historical provenance ואינו משנה את הקבצים תחת Freeze.

# 2. Exact stale-source inventory

## 2.1 GitHub governance audit

2.1.1 source=`/Users/tal/Documents/connect/web/docs/github-governance-live-audit.md`; SHA-256=`12ff4ab1de74cfcc0d77fdcfaa40699e3217d9078043e1e58463aa3149b36d08`; physical=`348 lines/17094 bytes`.

2.1.2 stale locators=`L152;L173–L184;L310`; stale claims include approved Private repository, `repositoryPrivate`, `private=true`, `visibility=private` and an asserted Public→Private change.

2.1.3 disposition=`HISTORICAL-OR-SUPERSEDED-BY-D18-A2; NOT-CURRENT-AUTHORITY`; any historical live evidence remains applies-to-old-digest only.

## 2.2 Release checklist

2.2.1 source=`/Users/tal/Documents/connect/web/docs/release-checklist.md`; SHA-256=`6b9c1a546fd37d556c57967d53f7cf7808c80a374dd6d06bdb476fa3ac3580af`; physical=`272 lines/14939 bytes`.

2.2.2 stale locators=`L10;L44`; stale claims require `private=true`, ‏`visibility=private` ו־Private visibility as release evidence.

2.2.3 disposition=`RELEASE-CONTRACT-STALE-FOR-CURRENT-VISIBILITY; RELEASE/PUSH BLOCKED UNTIL PUBLIC SUCCESSOR`.

## 2.3 Team operating plan

2.3.1 source=`/Users/tal/Documents/connect/web/docs/team-operating-plan.md`; SHA-256=`5a5c1b87bc1b7a97d67d1fe68e15bf988be391c4c9ed66bc8e28cdb82d8b846c`; physical=`427 lines/21160 bytes`.

2.3.2 stale locator=`L30`; stale claim records `private=true` and `visibility=private` as current state.

2.3.3 disposition=`GOVERNANCE-STATE-STALE; role/RACI content may remain contextual but visibility claim receives zero current credit`.

## 2.4 Source-control and release plan

2.4.1 source=`/Users/tal/Documents/connect/web/docs/source-control-and-release.md`; SHA-256=`2cf7df8efc81d3c043d99235994df68cb0875c8912a42e1fba26b3ba9d9c8560`; physical=`479 lines/25428 bytes`.

2.4.2 stale locators=`L16;L241;L268`; stale claims require or assert Private visibility as governance/release evidence.

2.4.3 disposition=`SOURCE-CONTROL-CONTRACT-STALE-FOR-VISIBILITY; exact Public successor required`.

## 2.5 Rejected Master Candidate

2.5.1 source=`/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`; SHA-256=`643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`; physical=`10425 lines/1059872 bytes`.

2.5.2 stale locators include `L6291` Private repository control, `L8501` DS-016 private-repository scope and `L9567` rollback to a new Private repository.

2.5.3 disposition=`REJECTED-MASTER-INPUT; PRIVATE CONTROL/STATE/ROLLBACK CLAIMS MUST NOT PROPAGATE TO SUCCESSOR`.

# 3. Required successor actions

## 3.1 Source and Decision handling

3.1.1 Admitted Source records retain each stale root as Historical context with `appliesToDigest`, exact locator and supersession edge to D18-A2.

3.1.2 Requirement/Decision extraction must produce zero active `repository must be Private` statements and preserve the old claims only as Conflict/Superseded records.

3.1.3 A source-wide linter rejects any active Control, Gate, Rollback, Release predicate or live Status that requires `private=true` or `visibility=private` for the canonical repository.

## 3.2 Public-safe replacements

3.2.1 GitHub governance successor replaces `repositoryPrivate` with exact Public invariant, RepoAuthorityRegistry, branch/tag Rulesets, protected checks, CODEOWNERS/reviewer rules, Actions trust, OIDC, supply-chain and egress controls.

3.2.2 Release successor requires PublicRepoHardeningGate, content/history scans, live settings readbacks, exact-diff Permit, remote-head readbacks and private operational Evidence boundary.

3.2.3 Incident/rollback successor freezes Merge/Release/Push, revokes credentials, restores last verified Public settings and coordinates removal; it never changes Visibility as an automatic rollback.

3.2.4 Team plan successor assigns Organization ownership, two recoverable owners, least privilege, secure 2FA, audit and break-glass while keeping repository Public.

## 3.3 Acceptance predicates

3.3.1 active stale Private claim count=`0` across Master, Decisions, Tasks, Tests, Gates, Runbooks and generated human views.

3.3.2 every historical occurrence is traceable to old root+locator and cannot satisfy a current Predicate.

3.3.3 canonical Repo readback returns `isPrivate=false`, visibility Public and expected identity; mismatch blocks rather than triggering a visibility change.

3.3.4 no source file is edited until its accepted successor Task and post-Gate instruction exist; current action remains Planning-only.
