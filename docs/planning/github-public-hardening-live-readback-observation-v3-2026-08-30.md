# 1. Connect — GitHub Public hardening live-readback observation v3

## 1.1 Identity and authority boundary

1.1.1 `observationId=CONNECT-GITHUB-PUBLIC-HARDENING-LIVE-READBACK-V3-2026-08-30`.

1.1.2 observation date=`2026-08-30`; exact GitHub server timestamp=`unknown/unavailable`.

1.1.3 artifact class=`READ-ONLY-LIVE-UI-AND-LOCAL-REPOSITORY-OBSERVATION; SECURITY-PLANNING-INPUT; NOT-A-GITHUB-MUTATION; NOT-A-GIT-MUTATION; NOT-ACCEPTED`.

1.1.4 binding visibility decision=`PUBLIC`. No recommendation, failure state or future Task in this artifact permits changing `talstilkol/connect` to Private.

1.1.5 the in-app browser reused Tal's authenticated GitHub session only for visible readback. No repository setting, Rule, collaborator, credential, workflow, Branch, Commit, Pull Request, Issue, Deployment, Release or package was created, edited, approved, dismissed, enabled or deleted.

1.1.6 no credential value, collaborator identity, customer content or exploit-enabling Legacy value is recorded in this Public-safe artifact.

## 1.2 Claim boundary

1.2.1 the GitHub observations below describe UI state visible during one bounded readback. They are not an API export, signed receipt, continuous monitor or proof that the state was identical before or after the observation.

1.2.2 a page-load warning occurred on the Webhooks screen. Consequently webhook existence, count and configuration remain `unknown/unavailable`; an empty visible table is not admitted as proof of zero Webhooks.

1.2.3 the collaborator screen required an additional `Confirm access` step. Collaborator membership, invitations, outside-collaborator state, organization policy and collaborator MFA state therefore remain `unknown/unavailable`.

1.2.4 local Git facts were read without `fetch`. Any `origin/*` reference is explicitly stale-capable and cannot prove the current GitHub Branch head.

1.2.5 pattern scans are indicators only. A zero match does not prove the absence of every Secret, and a positive generic match does not prove that a Secret exists.

# 2. Repository identity and Public status

## 2.1 Live GitHub UI readback

2.1.1 repository=`talstilkol/connect`.

2.1.2 visibility displayed by GitHub=`Public`.

2.1.3 default Branch displayed by GitHub=`main`.

2.1.4 GitHub UI displayed=`64 Commits;5 Branches;0 Tags;3 Pull Requests;1 Issue;Security and quality (1);2 Deployments;0 Releases;0 Packages;1 contributor`.

2.1.5 the repository view exposed a latest-Commit link resolving to `aabaee803a0c00569806195ddf51995f873b27f0`; another visible UI reference used abbreviated Commit `5cb6a0f`. Their semantic relationship was not proven by this readback and no equality is claimed.

2.1.6 authoritative current Branch-head evidence remains absent until a later authorized, authenticated API or freshly fetched Git readback binds repository, Branch, immutable full Commit SHA, retrieval time and response digest.

## 2.2 Public-by-design consequence

2.2.1 every committed byte, Git object, workflow log, artifact, Pull Request comment, Issue, Release and package must be treated as potentially world-readable and indefinitely copied.

2.2.2 deletion from the current Branch cannot prove deletion from Git history, forks, caches, Actions artifacts, logs, Releases, packages or third-party mirrors.

2.2.3 therefore Public publication requires a fail-closed allowlist and pre-Push evidence; reactive scanning after Push is detection evidence, not a safe-publication mechanism.

# 3. Local repository topology and divergence

## 3.1 Two local Git directories

3.1.1 outer repository path=`/Users/tal/Documents/connect/.git`; observed branch=`master`; observed tracked-file count=`0`; observed Commit count=`0`; observed remote=`none`.

3.1.2 product repository path=`/Users/tal/Documents/connect/web/.git`; observed branch=`codex/cloudflare-evidence-builders`; observed local `HEAD=93c6b2dfe007f07c43c37389873a8a648a3ff69d`.

3.1.3 product remote URL=`https://github.com/talstilkol/connect.git`.

3.1.4 locally stored `refs/remotes/origin/main=5cb6a0fc8e021ec4250e0f4652603cfd3369a61d`; because no `fetch` occurred, this is a local stale-capable pointer and not live GitHub evidence.

3.1.5 local merge-base between product `HEAD` and the stored `origin/main` was `5cb6a0fc8e021ec4250e0f4652603cfd3369a61d`; local comparison against that stored pointer was `0 behind/238 ahead`.

3.1.6 product worktree readback contained `128 modified + 288 untracked = 416` status entries. Ownership and intended publication of each entry remain unresolved; no entry was staged, reverted, removed or committed.

## 3.2 Topology risk

3.2.1 the outer empty repository can mislead commands executed from `/Users/tal/Documents/connect` into reporting no history, no remote or no tracked files while the actual product history exists under `/Users/tal/Documents/connect/web`.

3.2.2 the working branch and the live default Branch are not proven synchronized. A Push, merge or publication plan based only on the stale local `origin/main` could overwrite assumptions, omit remote work or publish unintended local files.

3.2.3 all future Git evidence and commands must bind an explicit repository root. Product Git operations use `/Users/tal/Documents/connect/web`; the outer repository receives no publication authority.

3.2.4 before any future Git mutation, the operator must produce a fresh remote readback, exact Branch/head comparison, worktree classification and user-change preservation manifest.

# 4. Live governance controls

## 4.1 Branch and Ruleset controls

4.1.1 GitHub prominently displayed `Your main branch isn't protected`.

4.1.2 repository Rulesets displayed `You haven't created any rulesets`.

4.1.3 current disposition=`P0 PUBLIC-GOVERNANCE-GAP`: the default Branch lacks observed policy enforcement for review, required status checks, force-push prevention, deletion prevention, signed Commit requirements, linear history, deployment gates or administrator bypass control.

4.1.4 this observation does not claim that every legacy Branch Protection endpoint is empty; it records only the visible default-Branch warning and empty Rulesets view.

4.1.5 GitHub currently documents that Rulesets are available for Public repositories, can protect Branches and Tags and can coexist with Branch Protection; therefore Public visibility is not a reason to omit a Ruleset. Source: [GitHub — About Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).

## 4.2 Required future default-Branch control family

4.2.1 create one repository Ruleset scoped to `main` only after exact owner authority and post-Gate29 instruction.

4.2.2 require Pull Requests, at least one independent approval, dismissal of stale approvals after material change, resolution of review conversations and approval of the exact final Commit.

4.2.3 require named CI checks only after their workflow identities, permissions, deterministic inputs and pass/fail semantics are frozen; a missing or skipped required check must fail closed.

4.2.4 block force pushes and Branch deletion; constrain bypass actors to named emergency roles with reason, expiry, audit and retrospective review.

4.2.5 decide signed-Commit and linear-history policies only after bot, deployment and recovery workflows are proven compatible; policy convenience cannot silently weaken Public history integrity.

4.2.6 protect Tags/Releases separately because default-Branch protection does not by itself secure release references, packages or deployment artifacts.

4.2.7 validate each selected rule against GitHub's current documented rule semantics and a disposable non-production Branch before enforcing it on `main`; available controls include restricting updates/deletions, linear history, required deployments and signed Commits. Source: [GitHub — available Ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).

# 5. GitHub security-feature readback

## 5.1 Enabled observations

5.1.1 Dependency graph displayed=`Enabled`.

5.1.2 Dependabot alerts displayed=`Enabled`.

5.1.3 Dependabot security updates displayed=`Enabled`.

5.1.4 GitHub displayed one enabled Dependabot rule.

5.1.5 these are useful detection and update controls but do not prove dependency completeness, runtime reachability, timely remediation, lockfile integrity or safe automatic merge.

## 5.2 Disabled or absent observations

5.2.1 Private vulnerability reporting displayed=`Disabled`.

5.2.2 CodeQL displayed=`Disabled`.

5.2.3 Secret Protection displayed=`Disabled`.

5.2.3.1 this UI label is not interpreted as `zero GitHub secret detection`: GitHub currently documents that Secret-scanning alerts for supported patterns run automatically on Public repositories and that user-level Push Protection is enabled by default. The missing repository-suite state still matters because repository Push Protection, alert/bypass governance, generic/custom patterns and organization controls are distinct. Sources: [GitHub — Secret-scanning alerts](https://docs.github.com/en/code-security/concepts/secret-security/about-alerts); [GitHub — Push Protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection).

5.2.4 malware alerts displayed=`Disabled`.

5.2.5 grouped security updates displayed=`Disabled`.

5.2.6 the settings view offered creation of `dependabot.yml`; no current version-update configuration was admitted by the observation.

5.2.7 Copilot Autofix displayed `On`, but CodeQL was disabled. No CodeQL-derived Autofix protection is credited while its finding source is disabled.

## 5.3 Required future security-feature sequence

5.3.1 first complete Public-byte provenance, Secret-history review and workflow-permission review; enabling a detector cannot make already disclosed bytes private.

5.3.2 enable Secret Protection and Push Protection only through an authorized configuration change with positive and negative test repositories, bypass governance, alert routing and response ownership.

5.3.3 enable CodeQL with explicit languages, build mode, query suites, schedule, Pull Request trigger, default-Branch trigger, permissions and triage SLA; prove a seeded safe test finding is detected in a non-production fixture repository before credit.

5.3.4 enable Private vulnerability reporting with a public `SECURITY.md`, supported-version policy, response targets, disclosure process, safe contact path and named primary/backup owners.

5.3.5 create exact Dependabot version-update configuration with ecosystem, directory, cadence, labels, grouping policy, reviewer ownership and Pull Request cap; automated merge remains OFF until test and supply-chain gates are accepted.

5.3.6 decide malware-alert and grouped-update settings against exact repository capability, signal routing and operational ownership; their disabled state is recorded but no unsupported protection claim is made.

5.3.7 enable and require Dependency Review for Pull Requests after pinning the Action and defining severity/license failure policy; the dependency graph alone does not block a risky dependency change. Source: [GitHub — reviewing dependency changes](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-dependency-changes-in-a-pull-request).

5.3.8 after the Release process exists, generate and verify artifact attestations that bind the artifact to repository, workflow, environment and Commit; an attestation proves provenance/integrity claims, not application safety. Source: [GitHub — artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations).

5.3.9 GitHub currently recommends CodeQL default setup as the initial low-maintenance path for eligible Public repositories, then evaluating coverage and moving to customization or advanced setup when needed; enablement without a successful supported-language analysis receives zero scan credit. Sources: [GitHub — configuring CodeQL default setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning); [GitHub — evaluating default setup](https://docs.github.com/en/code-security/tutorials/customize-code-scanning/evaluate-default-setup).

# 6. GitHub Actions policy readback

## 6.1 Observed settings

6.1.1 allowed Actions policy=`Allow all actions and reusable workflows`.

6.1.2 `Require actions to be pinned to a full-length commit SHA` displayed unchecked.

6.1.3 default workflow token permission displayed=`Read repository contents and packages permissions` rather than write; this is a positive least-privilege baseline observation.

6.1.4 `Allow GitHub Actions to create and approve pull requests` displayed unchecked; this is a positive separation-of-duty baseline observation.

6.1.5 fork Pull Request workflow approval policy displayed=`Require approval for first-time contributors` rather than all external contributors.

## 6.2 Public Actions risk

6.2.1 allowing every Action and unpinned mutable references permits upstream tag movement or compromised third-party Actions to change executed code without a Connect Commit changing.

6.2.2 first-time-only approval can allow a previously admitted external contributor to trigger future workflows; any workflow that exposes privileged tokens, writes artifacts, accesses environments or processes attacker-controlled input requires a stricter trust model.

6.2.3 read-only default token does not constrain jobs that explicitly request broader permissions, consume environment Secrets, use cloud credentials or invoke self-hosted runners.

## 6.3 Required future Actions control family

6.3.1 inventory every workflow, reusable workflow, composite Action, external Action, script, runner, permission, Secret, environment and artifact path by exact Commit digest.

6.3.2 replace mutable third-party Action tags with reviewed full Commit SHAs and record upstream source, version intent, digest, license, maintainer and update owner.

6.3.3 move from `allow all` to an exact allowlist after the inventory proves every required Action; unknown Actions fail closed.

6.3.4 declare job-level or workflow-level minimal permissions explicitly; privileged jobs must not run on untrusted fork code or use attacker-controlled artifact names, cache keys, paths, scripts or environments.

6.3.5 require approval for all outside collaborators before privileged workflow execution unless an independently reviewed threat model proves a narrower policy safe.

6.3.6 forbid long-lived deployment credentials; use environment-scoped OIDC where supported, protected environments, exact audience/subject conditions, short TTL, named reviewers and immutable deployment evidence.

6.3.7 negative tests cover mutable Action refs, permission escalation, `pull_request_target` checkout confusion, poisoned cache/artifact, expression injection, malicious filename/path, fork Secret access, self-hosted runner persistence and bypass actor abuse.

6.3.8 GitHub states that a full-length Commit SHA is currently the only immutable way to reference an Action release; all future third-party `uses:` references must therefore be SHA-pinned and verified as belonging to the intended upstream repository. Source: [GitHub — secure use of Actions](https://docs.github.com/en/actions/reference/security/secure-use).

# 7. Access and integration observations

## 7.1 Deploy keys

7.1.1 GitHub displayed no Deploy Keys.

7.1.2 this is a point-in-time UI observation only; it does not prove absence of GitHub Apps, OAuth Apps, personal tokens, Actions credentials, environment Secrets, organization credentials or provider-side GitHub connections.

## 7.2 Webhooks and collaborators

7.2.1 Webhook state=`unknown/unavailable` because the screen emitted load warnings.

7.2.2 collaborator, invitation, role and MFA state=`unknown/unavailable` because access confirmation was not completed.

7.2.3 future readback must use an authorized authenticated API or complete UI views and redact identity/credential values from Public artifacts.

7.2.4 required access review binds every human, bot, App, Deploy Key, token issuer, environment and external provider to least privilege, owner, business purpose, creation time, last use, expiry/review time and revocation procedure.

7.2.5 enable Private vulnerability reporting only after named triage ownership and a safe disclosure process exist; GitHub documents it as a secure reporting path for Public repositories. Pair it with a `SECURITY.md` that states supported versions and reporting instructions. Sources: [GitHub — Private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting); [GitHub — repository security policy](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/add-security-policy).

# 8. Bounded local disclosure scan

## 8.1 Pattern observations

8.1.1 exact PEM private-key header-pattern matches=`0` in the bounded scanned workspace.

8.1.2 common token-like pattern results=`13 files`, all under `/Users/tal/Documents/connect/web`; the matches were not admitted as Secrets and require value-redacted classification.

8.1.3 generic Secret-assignment pattern results=`165 files`: `16` under the Legacy `analysis` tree, `2` under top-level `docs`, and `147` under `web`; this broad pattern has a high false-positive rate and provides no Secret-presence count.

8.1.4 sensitive-suffix candidate files=`1`: `/Users/tal/Documents/connect/web/.env.example`.

8.1.5 no Secret value was printed, copied or recorded by this observation.

## 8.2 Claim limits and required proof

8.2.1 `0` PEM-pattern matches means only that the selected header expression did not match; encoded keys, tokens, passwords, credentials in history, generated artifacts or provider state can still exist.

8.2.2 `.env.example` is not automatically a Secret, but every value and comment must be classified before Public publication and scanners must prove that example placeholders cannot authenticate.

8.2.3 future Public-safe evidence requires separate scans of worktree, index, every reachable Git object, untracked files, ignored files, LFS, submodules, workflow logs/artifacts, Releases and packages using at least two independently maintained detector approaches plus manual review of unresolved candidates.

8.2.4 any confirmed credential is handled in a private incident record: revoke/rotate first, determine exposure and use, remove current references, assess history-rewrite tradeoffs, notify affected owners and retain non-secret audit evidence. Deleting a Git string alone is not remediation.

# 9. Public publication gate

## 9.1 Required preconditions

9.1.1 exact repository root and fresh remote Branch heads are bound to immutable digests.

9.1.2 all `416` current product-worktree entries are classified as `USER-OWNED-PRESERVE|PUBLIC-ALLOW|PRIVATE-QUARANTINE|GENERATED-IGNORE|DELETE-ONLY-WITH-SEPARATE-AUTHORITY`; no unclassified entry can enter a Commit.

9.1.3 complete Public allowlist binds path, raw digest, provenance, owner, license/publication authority, privacy class, Secret-scan result, dependency/asset treatment and intended Commit.

9.1.4 Legacy `analysis` artifacts remain quarantined unless each selected byte passes independent ownership, licensing, security, current-relevance and test review. Bulk import is forbidden.

9.1.5 Branch/Ruleset, Actions, CodeQL, Secret Protection, vulnerability reporting, access, Webhook and deployment controls have accepted configuration evidence and negative tests.

9.1.6 the interim license state remains `LICENSE-INTERIM-NONE;CONTRIBUTIONS-CLOSED;RELEASE-AND-PACKAGE-BLOCKED` until the separate Legal/ownership gate accepts exact license bytes.

9.1.7 a dry-run Commit manifest and review packet prove exact additions, modifications, deletions, generated outputs and expected CI effects without performing a Push.

9.1.8 an authorized human approves the exact immutable Commit/Push packet after Gate29; broad approval of the Master Plan is not a reusable Push Permit.

## 9.2 Fail-closed conditions

9.2.1 block publication on missing or stale remote state, unresolved Secret candidate, unknown provenance, personal/customer data, unlicensed byte, unreviewed workflow, mutable external Action, privileged fork path, unresolved user-owned worktree overlap, missing required check, bypass ambiguity or review disagreement.

9.2.2 scanner failure, API/UI read failure, rate limit, timeout, parser disagreement or absent evidence returns `BLOCKED`, never `PASS`.

9.2.3 repository visibility remains `PUBLIC` while publication is blocked; the mitigation is to stop unsafe writes, not to silently change visibility.

# 10. Current disposition

10.1 verified live visibility=`PUBLIC`.

10.2 observed default-Branch protection=`ABSENT`; observed Rulesets=`0`.

10.3 observed GitHub security baseline=`Dependency graph/Dependabot alerts/security updates enabled; CodeQL/Secret Protection/private vulnerability reporting disabled`.

10.4 observed Actions baseline=`allow all;full-SHA pinning not required;default token read-only;Actions PR approval disabled`.

10.5 exact current remote head, Webhooks, collaborators/MFA, GitHub Apps/OAuth, Secrets, environments, protection API state and full historical disclosure state=`unknown/unavailable`.

10.6 Public hardening Acceptance=`0`; Public Push Permit=`ABSENT`; GitHub mutation authority=`NONE`.

10.7 Gate29 remains `BLOCKED`; development freeze remains `ACTIVE`; repository remains `PUBLIC`.
