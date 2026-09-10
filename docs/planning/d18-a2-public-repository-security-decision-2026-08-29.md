# 1. Connect — D18-A2 Public Repository Security Decision

## 1.1 Decision identity and authority

1.1.1 `decisionId=D18-A2`.

1.1.2 `artifactId=CONNECT-D18-A2-PUBLIC-REPOSITORY-SECURITY-DECISION-2026-08-29`.

1.1.3 decision date=`2026-08-29`; trusted authority timestamp=`unknown/unavailable`.

1.1.4 Tal's exact clarification=`הערה: על המאגר להיות public`.

1.1.5 decision=`the canonical Connect source repository is intended to remain Public`.

1.1.6 this supersedes only the older D18/private-visibility requirement. It does not approve weaker branch protection, broader collaborator permissions, public Secrets/PII/Evidence, a software license, Push, Release or Deployment.

1.1.7 status=`SELECTED-FOR-PLANNING; LIVE-VISIBILITY-MATCHES; SECURITY-HARDENING-NOT-READY`.

# 2. Live read-only observations

2.1 repository=`talstilkol/connect`; URL=`https://github.com/talstilkol/connect`; visibility=`Public`; default branch=`main`.

2.2 application repository local branch=`codex/cloudflare-evidence-builders`; local HEAD=`93c6b2dfe007f07c43c37389873a8a648a3ff69d`; live remote branch head=`93c6b2dfe007f07c43c37389873a8a648a3ff69d`.

2.3 default-branch protection=`ABSENT`; GitHub API terminal=`404 Branch not protected`.

2.4 repository Rulesets count=`0`.

2.5 direct Collaborator count=`1`; identities intentionally omitted from this planning artifact.

2.6 GitHub Actions=`enabled`; allowed Actions policy=`all`; required full-length commit SHA pinning=`false`; read-only scan of the three current workflow files found every observed `uses:` reference pinned to a full hexadecimal commit SHA, but GitHub does not enforce that property for future edits.

2.7 Dependabot security updates=`enabled`; open Dependabot alerts=`1`.

2.8 Secret scanning=`disabled`; push protection=`disabled`; non-provider patterns=`disabled`; validity checks=`disabled`; open-alert enumeration terminal=`unavailable because feature is disabled`.

2.9 Code scanning analysis=`not found`; the observing token also lacked the additional scope named by the API, so absence of alerts is not proved.

2.10 local read-only pattern scan=`PASS`; scope=`1706 working files, 1413 tracked, 293 untracked, Git history included`; claim limit=`only patterns explicitly implemented by scripts/verify-secret-hygiene.mjs`.

# 3. Public-repository threat model

3.1 every committed byte must be treated as immediately world-readable, cloneable, indexable, cacheable, forkable and potentially permanent even after later deletion.

3.2 changing Visibility later cannot revoke prior clones, search indexes, package caches, screenshots, CI logs, release artifacts or forks.

3.3 Public source increases exposure to Secret harvesting, dependency reconnaissance, workflow injection, malicious pull requests, typosquatting, maintainer impersonation, social engineering, issue spam and vulnerability weaponization.

3.4 Public source does not itself make the software Open Source. License rights remain `unknown/unavailable` until Tal and Legal select and publish an exact License/NOTICE policy.

3.5 security through obscurity is not a Control. Runtime safety must rely on least privilege, server-only Secrets, independent authorization, tenant isolation, signed/fenced operations, monitoring, revocation and tested recovery.

# 4. Mandatory hardening before the next Push

## 4.1 Default branch and Ruleset

4.1.1 create one versioned repository Ruleset targeting `main` and every protected release branch.

4.1.2 require pull requests; direct Push, force Push, deletion and branch bypass are denied except named break-glass identities with audited expiry.

4.1.3 require at least one independent approval for ordinary changes and two independent approvals for authentication, authorization, tenancy, Secrets, CI, release, migrations, billing, retention, backup/restore and provider-side-effect paths.

4.1.4 dismiss stale approvals after new commits; require approval of the most recent reviewable Push; require conversation resolution.

4.1.5 require exact current CI checks, merge queue or equivalent serialized head validation, linear history where compatible, and an up-to-date branch before merge.

4.1.6 CODEOWNERS must map sensitive paths to named Primary and Backup reviewers; presence alone is not sufficient unless the Ruleset requires code-owner review.

## 4.2 GitHub Actions supply chain

4.2.1 change allowed Actions from `all` to the smallest reviewed allowlist of GitHub-owned and explicitly approved third-party Actions.

4.2.2 require every Action reference to use a full immutable commit SHA; human-readable version comments may accompany it but never replace the SHA.

4.2.3 set default workflow token permission to read-only; grant write scopes per Job only; never expose Secrets to untrusted fork code or `pull_request_target` checkout paths.

4.2.4 enable dependency review, artifact attestations where used, lockfile review and workflow-change ownership.

4.2.5 self-hosted runners remain forbidden until network, cleanup, image, isolation, persistence and untrusted-PR policy receive separate approval.

## 4.3 Secret and code scanning

4.3.1 enable GitHub Secret scanning, push protection, non-provider patterns and validity checks where the repository/account plan supports them.

4.3.2 add an independently maintained local/CI secret scanner with history coverage, verified exclusions, redacted output and a rotation playbook; one scanner is not sufficient assurance.

4.3.3 configure CodeQL or an approved equivalent for JavaScript/TypeScript and Actions workflows; absence of an analysis is not a PASS.

4.3.4 triage the one open Dependabot alert by reachability, fixed version and regression evidence before the next Push or document a short, scoped, expiring P3 RiskAcceptance if and only if severity permits.

4.3.5 any discovered credential is revoked and rotated before disclosure analysis; deleting the Git line is not remediation.

## 4.4 Public-content policy

4.4.1 forbidden Public content includes Secrets, Tokens, private keys, production identifiers, full phone numbers, customer data, unredacted logs, signed URLs, provider account details, internal-only Evidence, incident-sensitive data and exploitable unpublished vulnerability detail.

4.4.2 `.env.example` may contain names and clearly non-secret placeholders only; it must never contain a value accepted by a live service.

4.4.3 public fixtures are limited to normative standard vectors or deterministic non-business security literals with explicit provenance; no fake, mock, demo, sample or synthetic business data may become readiness Evidence.

4.4.4 separate Public documentation from private operational Evidence using an approved private Evidence store; the Public repository stores only redacted, non-secret references and digests when disclosure risk is acceptable.

4.4.5 add `SECURITY.md` with a private reporting channel and response expectations; enable GitHub Private Vulnerability Reporting if supported.

4.4.6 select and document an exact software/content License and contribution policy. Until Legal approval, do not infer contribution or redistribution rights from Public visibility.

## 4.5 Repository identity and nested-root safety

4.5.1 declare `/Users/tal/Documents/connect/web` as the intended application repository root in operator instructions and tooling.

4.5.2 classify the empty outer `/Users/tal/Documents/connect/.git` repository before removal or retention; no destructive action is authorized by this Decision.

4.5.3 every Git command, CI evidence record and planned commit binds the exact repository top-level path and HEAD root; a command run against the outer repository is rejected.

# 5. Verification and safe state

5.1 positive verification=`Public visibility is intentional; protected main; exact Ruleset; required checks/reviews; allowed Actions; SHA pins; secret/code/dependency scanning; security policy; license decision; remote readback all match the approved profile`.

5.2 negative verification=`direct Push, force Push, branch deletion, unsigned/unreviewed workflow edit, unpinned Action, write-all token, fork Secret exposure, secret-bearing commit and wrong repository root are denied`.

5.3 failure verification=`GitHub API unavailable, settings ambiguous, plan feature missing or readback conflict causes no Push/Release and creates a blocking observation`.

5.4 concurrency verification=`Ruleset or default branch changes during a merge invalidate the prior approval and require a fresh head/settings readback`.

5.5 rollback/disable=`disable merges and Releases; revoke affected credentials/tokens; preserve redacted evidence; restore the last verified Ruleset; do not make the repository Private unless Tal issues a later superseding decision`.

5.6 current terminal=`PUBLIC-AS-INTENDED-BUT-HARDENING-BLOCKED`.

5.7 current acceptance=`0/1`; Gate2/Gate29/Gate30 remain blocked for repository governance; development freeze remains active.

5.8 no GitHub setting, file, Commit, Push or external state was changed while creating this Decision artifact.
