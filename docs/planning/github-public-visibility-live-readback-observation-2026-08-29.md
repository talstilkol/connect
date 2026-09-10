# 1. Connect — GitHub Public visibility live readback observation

## 1.1 Observation identity

1.1.1 `observationId=CONNECT-GITHUB-PUBLIC-VISIBILITY-READBACK-2026-08-29-O2`.

1.1.2 local observed time=`2026-08-29T22:16:28+0300 IDT`; trusted provider timestamp=`unknown/unavailable`.

1.1.3 observation class=`READ-ONLY-LIVE-CLI-READBACK; NOT-A-SETTINGS-MUTATION; NOT-A-HARDENING-GATE; NOT-ACCEPTANCE`.

1.1.4 command profile=`gh repo view talstilkol/connect --json nameWithOwner,visibility,isPrivate,defaultBranchRef,url`.

1.1.5 first sandboxed attempt failed to connect to `api.github.com`; one approved Read-only retry outside the restricted network boundary succeeded.

## 1.2 Exact provider response fields

1.2.1 `nameWithOwner=talstilkol/connect`.

1.2.2 `url=https://github.com/talstilkol/connect`.

1.2.3 `visibility=PUBLIC`.

1.2.4 `isPrivate=false`.

1.2.5 `defaultBranchRef.name=main`.

1.2.6 settings mutations performed=`0`.

## 1.3 Local repository correlation

1.3.1 local repository root=`/Users/tal/Documents/connect/web`.

1.3.2 local `origin` fetch/push URL=`https://github.com/talstilkol/connect.git`.

1.3.3 local active branch=`codex/cloudflare-evidence-builders`.

1.3.4 local HEAD=`93c6b2dfe007f07c43c37389873a8a648a3ff69d`.

1.3.5 local worktree state=`DIRTY`; this observation does not enumerate or attribute changes and does not authorize Commit or Push.

1.3.6 remote default branch and local active branch are distinct; neither identity may be silently substituted for the other in a Permit, diff or readback.

## 1.4 Claim limits

1.4.1 this response proves only the returned repository identity, visibility and default-branch fields at the observation boundary.

1.4.2 it does not prove Organization ownership, collaborators, 2FA, Rulesets, CODEOWNERS, Actions policy, workflow permissions, OIDC, Secrets, environments, packages, releases, vulnerability reporting, audit retention or Public-egress safety.

1.4.3 no provider response timestamp, ETag, request ID or signed receipt was returned by the selected CLI JSON projection; freshness must therefore expire under the future accepted observation policy.

1.4.4 a future mismatch must block and trigger investigation; it must not automatically change repository visibility.

1.4.5 current binding invariant remains `repository Public`; live Public-hardening gate remains `ABSENT`.

1.4.6 `Gate29=BLOCKED`; development freeze=`ACTIVE`.
