# 1. Connect — Public-repository and cyber-hardening v2 independent hostile-review Findings Manifest

## 1.1 Identity, denominator and claim limit

1.1.1 artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-V2-INDEPENDENT-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-30.

1.1.2 artifactClass=DETACHED-NON-MERGED-INDEPENDENT-FINDINGS-MANIFEST;PLANNING-ONLY;NOT-AUTHORITY;NOT-IMPLEMENTATION;NOT-ACCEPTANCE;NOT-CLOSURE.

1.1.3 frozen Subject=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-2026-08-29.md;SHA-256=322c5754f0f3540ceb1eb728c2399fa8be91cce6ead5a3acc6189468ca5a833a;781 lines;41862 bytes.

1.1.4 predecessor hostile-review root=af7bd90255fe0cb037d19ad8138609a3b35df50c33219470c845dec15919c6d5.

1.1.5 predecessor Findings Manifest root=a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4.

1.1.6 current observation roots: GitHub live readback v3=0dea5b462e4bff0d1866a585a585f7e0d0405609ad21ade4e8ecac1210e521cb;Legacy quarantine v2=00d8c970eb6f8a747d6353f309bc0c0109df6dd454582447325f123cf512df7c;license strategy=d5d8267370435cba5fcaa481f3af8a8d60641e319dfc3237ce3abd7a834b3f96;Secret scan v1=3ec83742da420a92d243b96cc0dae77112bb206fbe9f4d7a179a0f967d315755;corrective current Secret scan v2=3e8bb89858b660e8fe923643301c7225cafd622acdca6842a913a1f6d9bb9983.

1.1.7 companion review=docs/planning/public-repository-and-cyber-hardening-successor-requirements-v2-independent-hostile-review-2026-08-30.md.

1.1.8 frozen Finding denominator=59 distinct records: 32 predecessor Findings preserved separately and 27 new Findings.

1.1.9 severity totals=P0 31;P1 27;P2 1;P3 0.

1.1.10 state totals=OPEN 59/59;CLOSED 0/59;ACCEPTED 0/59;MERGED 0;SUPPRESSED 0.

1.1.11 each record has severity, evidence, impact, remediation, closureTest and noMergeKey. Evidence or remediation for one noMergeKey cannot close another.

1.1.12 PUBLIC is binding;Gate29=BLOCKED;development freeze=ACTIVE;Acceptance=0.

## 1.2 Severity semantics

| Severity | Meaning |
|---|---|
| P0 | permits false Public-Push, privileged-workflow, deploy, release or acceptance credit, or makes a foundational predicate non-causal |
| P1 | material mandatory assurance, privacy, provenance or operability gap that must close before acceptance |
| P2 | important policy precision defect retained at its predecessor severity |
| P3 | advisory only; none found |

# 2. Preserved predecessor Findings — 32 detached records

## 2.1 PRCH2V2-IHR-F001 — branch protection is not tag/release protection

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F001;Subject PRCH2-REQ-014,019,031,032,049,050 and crosswalk §3.1.1;Subject §§3.2 and 4 report no closure or configuration credit.
- impact=a movable tag, mutable asset or independently visible package can distribute bytes that branch review did not identify.
- remediation=produce and operationally enforce separate branch/tag Rulesets, immutable release/asset/package identity, publisher authority, attestations and consumer verification while remaining PUBLIC.
- closureTest=API readback matches exact active branch and tag contracts; tag move/delete and asset replacement fail; a consumer verifies every released digest against the reviewed Commit.
- noMergeKey=PRCS-HR-F001.

## 2.2 PRCH2V2-IHR-F002 — workflow event/actor/ref trust universe remains unproved

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F002;Subject PRCH2-REQ-020,021,022,027,043 and crosswalk §3.1.2;no WorkflowTrustMatrix instance or negative execution exists.
- impact=attacker-controlled code or artifacts can reach a privileged context through an omitted event, actor, checked-out ref or dispatch path.
- remediation=produce a closed per-workflow trust matrix with default DENY, exact event/actor/source/head/cache/artifact/token/environment/network and side-effect fields.
- closureTest=hostile fork, edited workflow, pull_request_target, workflow_run artifact, issue comment, unauthorized dispatch and unknown combinations deny before privilege.
- noMergeKey=PRCS-HR-F002.

## 2.3 PRCH2V2-IHR-F003 — untrusted and privileged workflow jobs are not operationally separated

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F003;Subject PRCH2-REQ-023,024,025,032,050 and crosswalk §3.1.3;the candidate graph and evidence roots are absent.
- impact=a malicious dependency, Pull Request or artifact can obtain OIDC, signing, attestation, deployment or release authority.
- remediation=separate validation from privilege and permit only digest-bound, policy-validated artifacts across an explicit one-way trust boundary.
- closureTest=no graph path from untrusted bytes reaches a write token, Secret, environment or signer except through the approved digest contract; poisoned inputs cannot produce accepted output.
- noMergeKey=PRCS-HR-F003.

## 2.4 PRCH2V2-IHR-F004 — OIDC trust remains unproved

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F004;Subject PRCH2-REQ-025,026,044,050 and crosswalk §3.1.4;provider policies and readbacks are absent.
- impact=the wrong repository, workflow, ref, environment or replayed session can receive a provider role.
- remediation=produce exact issuer, audience, immutable repository/workflow identity, subject/custom claim, environment/ref, role/scope, TTL, replay and revocation contracts per provider.
- closureTest=provider readback matches the approved policy root and denies fork, wrong ref/environment/workflow/repository ID, replay and expiry.
- noMergeKey=PRCS-HR-F004.

## 2.5 PRCH2V2-IHR-F005 — attestation presence is not provenance acceptance

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F005;Subject PRCH2-REQ-003,023,032,033,050 and crosswalk §3.1.5;no accepted producer/consumer policy or verification receipt exists.
- impact=an attestation can cover the wrong subject, come from the wrong workflow, leak metadata or overstate a SLSA claim.
- remediation=bind predicate type, exact subject digest Set, signer/repository/workflow/environment, transparency disclosure and failure=DENY to a separate consumer verifier.
- closureTest=only the approved artifact/signer/workflow verifies; wrong or missing subject, signer, repository, workflow, bundle or transparency material denies with no prohibited Public metadata.
- noMergeKey=PRCS-HR-F005.

## 2.6 PRCH2V2-IHR-F006 — cross-surface Public spill response remains unproved

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F006;Subject PRCH2-REQ-015,017,018,019,043 and crosswalk §3.1.6;no incident execution or surface-complete readback exists.
- impact=revocation can stop credential use while PII or sensitive bytes remain in refs, forks, caches, logs, artifacts, LFS, Releases, packages or transparency systems.
- remediation=produce and test a revoke-first incident state machine with private preservation, full surface inventory, purge/Support/fork coordination, recontamination prevention and residual-risk state.
- closureTest=one seeded spill per surface yields revocation, exact inventory, surface action/limitation receipts and post-remediation search; irreducible copies remain blocking.
- noMergeKey=PRCS-HR-F006.

## 2.7 PRCH2V2-IHR-F007 — dependency confusion and publish safety remain unproved

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F007;Subject PRCH2-REQ-029,030,043 and crosswalk §3.1.7;no rooted registry/lock/namespace policy instance exists.
- impact=a reproducible install can still fetch attacker-controlled current bytes or run malicious lifecycle/native code.
- remediation=bind each scope to approved registries, reserve namespaces, root lock and registry origin, prohibit unintended publication and quarantine lifecycle/native changes.
- closureTest=wrong registry, same-name public package, scope remap, lock substitution, typosquat, lifecycle script, provenance mismatch and accidental publish deny before install/release.
- noMergeKey=PRCS-HR-F007.

## 2.8 PRCH2V2-IHR-F008 — personal-account governance remains unresolved

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F008;Subject PRCH2-REQ-009,010,011,044 and crosswalk §3.1.8;GitHub live readback identifies talstilkol/connect and collaborator/MFA state is unknown.
- impact=one account or long-lived credential remains a governance, availability and audit single point of failure.
- remediation=keep PUBLIC while moving accepted authority to a company Organization with two recoverable owners, secure 2FA, teams, access review, scoped Apps and expiring audited break-glass.
- closureTest=authorized readback proves Organization ownership, two recoverable owners, approved roles and secure 2FA, with no unexplained admin, classic PAT or write deploy key.
- noMergeKey=PRCS-HR-F008.

## 2.9 PRCH2V2-IHR-F009 — cyber source denominator remains unproduced

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F009;Subject PRCH2-REQ-005,006,042 and crosswalk §3.1.9;accepted Source Universe remains an absent external dependency.
- impact=requirements can cite a framework family that never passed exact version, authority, capture, license or role review.
- remediation=produce one closed final/draft-separated source denominator for every framework, standard, taxonomy, vendor document and conflict used anywhere.
- closureTest=forward/inverse parsing resolves every source token exactly once with zero dangling, duplicate, uncaptured or denominator-mismatch records.
- noMergeKey=PRCS-HR-F009.

## 2.10 PRCH2V2-IHR-F010 — authoritative source-byte custody remains absent

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F010;Subject PRCH2-REQ-006,008,044 and crosswalk §3.1.10;official URL observations are expressly non-custodial.
- impact=mutable pages can change while later readers cannot reproduce the exact bytes or locator supporting a claim.
- remediation=capture authoritative bytes or immutable assets with raw SHA-256, URL/redirect, media type, receipt, trusted time/absence, locator, license and successor-only history.
- closureTest=two independent acquisitions reproduce every admitted byte root and locator; any page change creates a successor and invalidates affected claims.
- noMergeKey=PRCS-HR-F010.

## 2.11 PRCH2V2-IHR-F011 — SAMM, ATT&CK and ATLAS identity conflicts remain unresolved

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F011;Subject PRCH2-REQ-007,008,039 and crosswalk §3.1.11;no rooted conflict registry instance exists.
- impact=threat mappings and freshness decisions can bind a family label, wrong date or living page instead of exact release content.
- remediation=root SAMM v2.2.0, ATT&CK v19.2 and ATLAS v2026.07 assets and preserve official conflicts without silent selection.
- closureTest=every identity resolves to immutable bytes/digest; ATT&CK date conflict stays traceable and current ATLAS additions enter the affected delta.
- noMergeKey=PRCS-HR-F011.

## 2.12 PRCH2V2-IHR-F012 — AI threat-to-control closure remains absent

- severity=P0;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F012;Subject PRCH2-REQ-038,039,040,041,043 and crosswalk §3.1.12;AI side effects are stated inactive and no evaluation evidence exists.
- impact=human approval can be deceived by poisoned content, tools, memory, RAG or arguments and still authorize disclosure, action or resource abuse.
- remediation=produce total applicability, control, negative-test, evidence and residual-risk mapping for admitted AISVS, OWASP, NIST and ATLAS threats.
- closureTest=prompt injection, poisoned knowledge/tool metadata, stale approval, argument substitution, cross-tenant memory, exfiltration and resource exhaustion fail without side effects.
- noMergeKey=PRCS-HR-F012.

## 2.13 PRCH2V2-IHR-F013 — required-check source and merge-queue behavior remain unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F013;Subject PRCH2-REQ-013,014,043 and crosswalk §3.1.13;live main protection is absent.
- impact=a same-name wrong-source or stale status can satisfy an ambiguous rule, or merge-group validation can be missing.
- remediation=root check names, expected GitHub Apps/workflow roots, event and exact head/merge-group SHA with freshness/invalidation semantics.
- closureTest=wrong-source, stale, missing and wrong-SHA statuses deny; merge_group runs the complete expected Set against the queued SHA.
- noMergeKey=PRCS-HR-F013.

## 2.14 PRCH2V2-IHR-F014 — two-person CODEOWNERS protection remains unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F014;Subject PRCH2-REQ-012,014,043 and crosswalk §3.1.14;live Rulesets are absent.
- impact=one owner, an invalid pattern or ownership-file edit can defeat the intended independent sensitive-path review.
- remediation=protect .github/CODEOWNERS and workflows, add catch-all/sensitive paths, validate syntax and ownership, and enforce a second approval outside GitHub's one-owner semantics.
- closureTest=API validation reports zero errors; every path resolves; one owner/self-review cannot satisfy sensitive policy; ownership changes require independent protected owners.
- noMergeKey=PRCS-HR-F014.

## 2.15 PRCH2V2-IHR-F015 — bypass surfaces remain unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F015;Subject PRCH2-REQ-011,014,018,043 and crosswalk §3.1.15;no bypass identities/readback exist.
- impact=a maintainer or stale exemption can bypass Secret, review, environment or release gates without independent authorization.
- remediation=produce separate deny-by-default branch, tag, push-protection, environment, Actions, release and expunging registries with reason, second approver, scope, expiry and audit.
- closureTest=self/unlisted/admin/stale bypass attempts deny; expiry becomes ineffective automatically; a drill yields immutable use and revocation readback.
- noMergeKey=PRCS-HR-F015.

## 2.16 PRCH2V2-IHR-F016 — all-external-contributor approval remains absent

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F016;Subject PRCH2-REQ-021,027,043 and crosswalk §3.1.16;live setting requires approval only for first-time contributors.
- impact=a contributor can gain standing trust through one benign merge and later trigger malicious or costly execution.
- remediation=require approval for every external contributor/run, exact workflow/head inspection, approval invalidation after change, no privileged pull_request_target and bounded cost/concurrency.
- closureTest=a previously merged contributor still needs approval; any head/workflow change invalidates it; denied runs obtain no token, Secret or environment.
- noMergeKey=PRCS-HR-F016.

## 2.17 PRCH2V2-IHR-F017 — cache and artifact trust remain unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F017;Subject PRCH2-REQ-023,024,043 and crosswalk §3.1.17;no cache/artifact contract instance or execution exists.
- impact=low-trust bytes can cross into a privileged signer/deployer through cache or workflow_run artifacts.
- remediation=partition cache domains and bind artifact producer workflow/run/head/digest/schema/scan/retention/purge before privileged consumption.
- closureTest=fork/issue poisoned cache or artifact is never consumed by a privileged job; any producer/head/digest/schema mismatch denies.
- noMergeKey=PRCS-HR-F017.

## 2.18 PRCH2V2-IHR-F018 — complete executable dependency pinning remains unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F018;Subject PRCH2-REQ-028,029,030,043 and crosswalk §3.1.18;live Actions full-SHA enforcement is unchecked.
- impact=mutable workflows, images, downloads or transitive executables can change CI behavior while visible Action pins appear safe.
- remediation=inventory and root every Action, reusable/local/container Action, image, package manager, binary and transitive executable with owner/review/expiry.
- closureTest=zero mutable or unresolved executables; moved tag/image, wrong fork SHA and checksum mismatch deny before execution.
- noMergeKey=PRCS-HR-F018.

## 2.19 PRCH2V2-IHR-F019 — environment and manual-dispatch safety remain unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F019;Subject PRCH2-REQ-025,026,043 and crosswalk §3.1.19;live environment/Secret state is unknown.
- impact=a collaborator can dispatch from an unreviewed ref, self-approve an environment or race duplicate side effects.
- remediation=bind stage, independent reviewer, prevent-self-review, protected refs, actor/input schema, resource concurrency and read-only/deploy separation.
- closureTest=wrong actor/ref/input, self-review and concurrent duplicate deny; Secrets remain unavailable pre-approval; receipt binds actor, workflow, SHA, environment and fence.
- noMergeKey=PRCS-HR-F019.

## 2.20 PRCH2V2-IHR-F020 — Releases, packages, containers and LFS remain unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F020;Subject PRCH2-REQ-015,018,019,031,043 and crosswalk §3.1.20;live UI displayed zero tags/releases/packages but this is not a complete future policy.
- impact=sensitive or vulnerable content can survive source cleanup or become irreversibly Public through an independent distribution surface.
- remediation=declare use/non-use, visibility, access, namespace, publisher, retention, delete/restore/Support and incident policy per surface.
- closureTest=authorized API inventory accounts for every release, asset, package/version, container and LFS object; unknown or unaccepted limitations block publication.
- noMergeKey=PRCS-HR-F020.

## 2.21 PRCH2V2-IHR-F021 — non-file Public egress remains unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F021;Subject PRCH2-REQ-003,015,016,017,043 and crosswalk §3.1.21;no complete Public-surface inventory/readback exists.
- impact=Secrets, PII, identifiers or exploit detail can leave through metadata, collaboration, CI, package, SBOM, attestation or preview channels without appearing in a tracked file.
- remediation=produce full Public-surface discovery and deterministic source-specific classification/redaction with private operational Evidence.
- closureTest=a rooted prohibited corpus planted in every channel is blocked with redacted evidence; allowed snapshot returns zero prohibited egress objects.
- noMergeKey=PRCS-HR-F021.

## 2.22 PRCH2V2-IHR-F022 — Secret detector coverage remains unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F022;Subject PRCH2-REQ-016,017,018,043 and crosswalk §3.1.22;current Secret scan used one default ruleset and left all candidates open.
- impact=a scanner PASS can miss unsupported, encoded, binary, historical or provider-specific credentials, and findings can leak the value.
- remediation=produce detector/version/class/surface/custom/exclusion/validity/redaction/bypass coverage and private triage, with blocking Unknown.
- closureTest=each admitted Secret class has pre-egress and incident detection; critical false negatives are zero; bypass/self-exemption/log-leak vectors deny.
- noMergeKey=PRCS-HR-F022.

## 2.23 PRCH2V2-IHR-F023 — vulnerability disclosure lifecycle remains unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F023;Subject PRCH2-REQ-036,043 and crosswalk §3.1.23;live Private Vulnerability Reporting is disabled.
- impact=researchers can disclose publicly or receive inconsistent handling before an independently verified fix reaches consumers.
- remediation=produce Legal-reviewed supported-version, intake, target-time, triage, embargo, advisory/fix, CVE, verification, publication and safe-harbor lifecycle.
- closureTest=a tabletop proceeds privately through triage, fix, independent verification and coordinated publication within targets; Public exploit detail is denied pre-authorization.
- noMergeKey=PRCS-HR-F023.

## 2.24 PRCH2V2-IHR-F024 — license and contributor-rights lifecycle remains unresolved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F024;Subject PRCH2-REQ-037,043 and crosswalk §3.1.24;license observation reports accepted license=0 and ownership denominator=0.
- impact=Public visibility permits viewing/forking but does not establish redistribution, contribution, patent, trademark or compatibility rights.
- remediation=obtain exact Legal decisions for code/content/data/assets/trademarks, LICENSE/NOTICE, third-party obligations, inbound rights and AI-assisted provenance.
- closureTest=every shipped and publicly distributed class has approved rights/notice; incompatible or unlicensed input denies; contribution acceptance binds exact bytes.
- noMergeKey=PRCS-HR-F024.

## 2.25 PRCH2V2-IHR-F025 — SLSA version/Track/Level remains unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F025;Subject PRCH2-REQ-032,033,043 and crosswalk §3.1.25;accepted SLSA claim is none.
- impact=a GitHub attestation can be miscredited as SLSA 1.2 Source or Build conformance.
- remediation=separate exact SLSA version, Source Track, Build Track and Level; map normative requirements to rooted platform evidence and expected-provenance consumer policy.
- closureTest=each claimed Track/Level has complete rooted assessment; attestation presence alone yields zero Source or Build credit.
- noMergeKey=PRCS-HR-F025.

## 2.26 PRCH2V2-IHR-F026 — Scorecard use remains unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F026;Subject PRCH2-REQ-003,029,034,043 and crosswalk §3.1.26;no selected executable/workflow/disclosure profile exists.
- impact=an official template can broaden permissions or publish findings, and an aggregate heuristic can become a false Gate.
- remediation=select local CLI or exact pinned Action, minimal isolated permissions, explicit publication, classified outputs and per-check evidence/exceptions.
- closureTest=workflow root and permissions match policy; public result publication is explicit; each Gate cites named checks and score alone changes no state.
- noMergeKey=PRCS-HR-F026.

## 2.27 PRCH2V2-IHR-F027 — NIST errata custody remains unresolved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F027;Subject PRCH2-REQ-007,008,039,043 and crosswalk §3.1.27;publication and errata roots are absent.
- impact=tests can bind known incorrect taxonomy indices or silently change when errata changes.
- remediation=capture publication and potential-updates bytes as distinct roots, define amendment semantics and invalidate only exact affected mappings.
- closureTest=taxonomy resolves publication plus exact errata; known correction is represented; errata change creates a successor delta and blocks affected mappings.
- noMergeKey=PRCS-HR-F027.

## 2.28 PRCH2V2-IHR-F028 — OWASP 2026 date conflict remains unresolved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F028;Subject PRCH2-REQ-007,008,043 and crosswalk §3.1.28;no canonical content root is admitted.
- impact=date-based freshness or precedence can select inconsistent identity.
- remediation=root canonical content bytes/commit and preserve both official date observations with bounded claims.
- closureTest=exact content identity is stable; both dates remain traceable and neither date alone changes Gate state.
- noMergeKey=PRCS-HR-F028.

## 2.29 PRCH2V2-IHR-F029 — AI BOM, TEVV and change invalidation remain unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F029;Subject PRCH2-REQ-038,039,040,041,043 and crosswalk §3.1.29;no component/evaluation root exists.
- impact=model, prompt, tool, memory, RAG, dataset or provider drift can invalidate a one-time safety case.
- remediation=produce exact AI BOM/change graph and continuous security/privacy/safety/cost TEVV with triggers, human review and residual-risk owner/expiry.
- closureTest=every behavior resolves to exact current roots/evaluations; any component or threshold change invalidates approval and disables side effects.
- noMergeKey=PRCS-HR-F029.

## 2.30 PRCH2V2-IHR-F030 — source freshness and semantic delta remain unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F030;Subject PRCH2-REQ-008,038,041,045 and crosswalk §3.1.30;no accepted freshness records or trusted-time receipts exist.
- impact=mutable guidance can become silently stale or fetch failure can leave an old PASS active.
- remediation=bind source-specific signals/cadence, immutable roots, next review, failed-refresh terminal, semantic delta, affected graph, SLA and old-root retention.
- closureTest=unchanged refresh reproduces root; change creates exact successor/impact; expiry or failure yields BLOCKED/UNKNOWN; history stays readable.
- noMergeKey=PRCS-HR-F030.

## 2.31 PRCH2V2-IHR-F031 — runner and tool environment remain unproved

- severity=P1;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F031;Subject PRCH2-REQ-023,028,029,043 and crosswalk §3.1.31;no release environment Evidence exists.
- impact=mutable runner images, downloads, egress or inherited workspace bytes can change/exfiltrate build inputs while source pins remain unchanged.
- remediation=bind runner label/resolved image/SBOM, tools/downloads, egress, workspace boundary and hermeticity exceptions; delay credentials until after untrusted install.
- closureTest=release Evidence binds environment/input roots; unapproved host, changed checksum or undeclared workspace inheritance denies.
- noMergeKey=PRCS-HR-F031.

## 2.32 PRCH2V2-IHR-F032 — signed-Commit decision remains unresolved

- severity=P2;state=OPEN-PRESERVED;closureCredit=0.
- evidence=predecessor Finding PRCS-HR-F032;Subject PRCH2-REQ-014,035,043 and crosswalk §3.1.32;live main protection and Rulesets are absent.
- impact=an unenforceable unsigned-denial claim can create false assurance or break legitimate bot/recovery paths.
- remediation=either select no signature Gate or define accepted identities/types, bot path, key revocation, vigilant-mode handling and incident behavior independently of review/checks.
- closureTest=valid, invalid, expired/revoked, bot and Partially verified fixtures produce the selected result; signatures never bypass review/checks.
- noMergeKey=PRCS-HR-F032.

# 3. New independent Findings — 27 detached records

## 3.1 PRCH2V2-IHR-F033 — no exact content-addressed Public allowlist producer

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Subject PRCH2-REQ-015 and 016 produce a surface input Set and a classification policy, while PRCH2-REQ-049 asks only for a pre-egress pass and exact next diff/ref. No Requirement produces the exact allowlist required by GitHub live-readback §9.1.3 or Secret-scan v2 §§5.2.1 and 5.3.3.
- impact=a diff can pass generic classification without proving every admitted path/raw digest/provenance/owner/license/privacy/scan/dependency/generated status and intended Commit; omitted bytes and surplus Git objects can enter a Public Commit.
- remediation=add one sole-producer PublicChangesetAllowlist binding repository ID, base/head/expected Commit, exact path/mode/blob/object roots, provenance, owner, publication right, privacy class, Secret/PII results, dependency/asset/generated disposition and expiry.
- closureTest=two independent builders derive byte-identical allowlists from the frozen worktree/index/object Set; one omitted, added, mode-changed, renamed, generated, unlicensed or unresolved item invalidates the Permit and no broad glob is accepted.
- noMergeKey=PRCH2V2-EXACT-PUBLIC-ALLOWLIST-ABSENT.

## 3.2 PRCH2V2-IHR-F034 — repository root, worktree/index and user-change preservation are not gated

- severity=P0;state=OPEN;closureCredit=0.
- evidence=GitHub live-readback §§3.1-3.2 observes an empty outer Git directory, the nested Product repository and 416 Product status entries; §9.1.2 requires five-way classification. Subject PRCH2-REQ-000 names canonical identity and PRCH2-REQ-049 names a diff, but no Requirement produces a wrong-root guard, worktree/index/untracked/ignored/submodule denominator, user-change ownership ledger or dry-run Commit manifest.
- impact=commands can inspect the wrong repository, overwrite user work, omit untracked bytes, include ignored/generated bytes or authorize a Commit different from the reviewed snapshot.
- remediation=produce a ProductRepoRootGuard plus frozen WorktreeIndexManifest classifying every entry as preserve, allow, quarantine, generated-ignore or separately authorized deletion, including submodules and sparse/shallow state.
- closureTest=outer-root execution, dirty overlap, unclassified entry, index/worktree mismatch, new writer, ignored candidate, submodule drift and dry-run/resulting-tree mismatch all deny before staging or network access.
- noMergeKey=PRCH2V2-WORKTREE-INDEX-ROOT-PRESERVATION-GATE-ABSENT.

## 3.3 PRCH2V2-IHR-F035 — remote ref/object denominator and push compare-and-swap are incomplete

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Secret-scan v2 proves the local store missed two current heads and replaces 298 local Commits with a mirror denominator of 5 heads,6 Pull Request refs and307 reachable Commits, while excluding unreachable objects and several remote surfaces. Subject PRCH2-REQ-015 says Git/history/refs generally and PRCH2-REQ-049 binds diff/ref/head, but neither binds exact refnames, expected-old OIDs, complete update Set, object closure, acquisition root or atomic multi-ref result.
- impact=a stale base, hidden ref, concurrently advanced Branch or additional pushed object can invalidate review while a nominal head/diff Permit still appears valid.
- remediation=produce a RemoteRefObjectSnapshot and PushTransactionIntent with canonical repository ID, acquisition receipt/time, every admitted ref/object, expected-old and proposed-new OID, new/delete/force flags, object reachability, atomicity and one-use expiry.
- closureTest=stale expected-old, unseen ref, concurrent update, extra ref/object, shallow/promisor/alternate ambiguity, wrong base, non-atomic partial update and post-review object substitution all deny; post-Push readback equals the entire intended transaction.
- noMergeKey=PRCH2V2-REMOTE-REF-OBJECT-EXPECTED-OLD-TRANSACTION-GAP.

## 3.4 PRCH2V2-IHR-F036 — Legacy quarantine and provenance taint have no sole producer

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Legacy quarantine v2 §§2-6 requires Product-root binding, selective-import taint, parent-context denial, history similarity checks and semantic-reuse tests. The Subject contains no Legacy/analysis sibling input, quarantine registry, provenance-taint object, outer-context guard or associated negative vectors.
- impact=Legacy bytes can enter through explicit copy, rename/reformat, generator/archive/build context or behavioral recreation without retaining the restricted sibling boundary or security/license risk.
- remediation=admit the corrective Legacy observation as a bounded input and produce a LegacyQuarantineAndTaintRegistry with exact restricted roots, supported similarity/decoder profiles, selective-import authority, build-context allowlist and security-sensitive semantic tests.
- closureTest=direct normal Product staging remains impossible; copied, renamed, normalized, encoded/archive and generated members retain taint; outer context denies; a zero-byte-similarity recreation of the known weak behavior fails independent authorization tests without Public exploit disclosure.
- noMergeKey=PRCH2V2-LEGACY-QUARANTINE-IMPORT-TAINT-PRODUCER-ABSENT.

## 3.5 PRCH2V2-IHR-F037 — generated outputs lack a complete provenance/publication contract

- severity=P1;state=OPEN;closureCredit=0.
- evidence=Subject PRCH2-REQ-015 covers remote Actions artifacts and PRCH2-REQ-028/029 cover runner/tools, but no output owns local generated files, caches, compiled assets, archives, code generation, screenshots, SBOM generation or build/deploy contexts. Secret-scan v1 found ignored build candidates and v2 §4.3 says a new generated-artifact scan is required after freeze.
- impact=generated bytes can contain stale source, Secrets, PII, unlicensed assets or undeclared inputs and can be committed/uploaded without a traceable source/recipe/tool root.
- remediation=produce a GeneratedArtifactRegistry binding each output to source Set, deterministic recipe/tool/environment roots, reproducibility class, ignored/tracked/publish destination, license/privacy/scan result, owner and retention.
- closureTest=undeclared generator input, changed tool/environment, nondeterministic unexplained output, ignored-to-Public promotion, archive/context expansion and stale generated output deny; regenerated admitted output matches its declared root or accepted variance proof.
- noMergeKey=PRCH2V2-GENERATED-OUTPUT-PROVENANCE-CLASSIFICATION-GAP.

## 3.6 PRCH2V2-IHR-F038 — current Secret evidence is blocking but absent from the acceptance graph

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Secret-scan v2 §§3-6 records 307 reachable Commits,15 merge-aware detector rows over6 coordinates,cleared candidates=0,no second scanner,no provider validity/Owner closure,incomplete GitHub-only/unreachable/fork coverage and no current frozen worktree/index/allowlist scan. Subject does not bind either Secret observation root and PRCH2-REQ-017 allows a future corpus proof without requiring current candidate closure on the exact Push snapshot.
- impact=the successor can reason about detector quality while unresolved bytes already in Public history or the proposed changeset remain unknown; confirmedSecretCount=0 can be misread as cleanliness.
- remediation=admit v2 as the current bounded observation, create a private redacted CandidateLedger, freeze the exact remote/object/worktree/index/allowlist roots, run a second independent scanner and selected-provider custom detectors, and bind triage/revocation receipts to the Push Permit.
- closureTest=openHistoryCoordinateCount=0,openHistoryRowCount=0,openAllowlistCandidateCount=0;two scanners cover the same roots;GitHub-only coverage closes;every confirmed credential has revocation/rotation;any root change invalidates the Permit.
- noMergeKey=PRCH2V2-CURRENT-SECRET-CANDIDATE-AND-COVERAGE-BLOCKERS-UNBOUND.

## 3.7 PRCH2V2-IHR-F039 — PII and customer-data policy lacks a closed denominator

- severity=P1;state=OPEN;closureCredit=0.
- evidence=Subject PRCH2-REQ-003 and016 mention privacy classes, re-identification and prohibited content, but do not define PII/customer/employee/special-category classes, lawful publication authority, data subject/tenant ownership, retention/deletion, jurisdictional decision, breach escalation or exact structured/binary/metadata detectors.
- impact=non-credential personal or customer data can be classified inconsistently, published through metadata/artifacts/logs or retained in immutable history while generic Secret scanning passes.
- remediation=produce a Legal-approved SensitiveDataTaxonomyAndPublicationPolicy with field/object/surface classes, tenant/subject owner, purpose/authority, minimization, re-identification bounds, retention/deletion and private incident escalation.
- closureTest=a rooted PII/customer corpus across source, history, metadata, documents, images, archives, logs, artifacts, issues and releases is blocked/redacted; unknown class or authority denies; Public evidence reveals neither value nor equality oracle.
- noMergeKey=PRCH2V2-PII-CUSTOMER-DATA-DENOMINATOR-UNDERDEFINED.

## 3.8 PRCH2V2-IHR-F040 — interim license, closed Contributions and release/package block are not encoded

- severity=P0;state=OPEN;closureCredit=0.
- evidence=license observation §§3.1 and5 requires LICENSE-INTERIM-NONE,CONTRIBUTIONS-CLOSED,RELEASE-AND-PACKAGE-BLOCKED with accepted license=0. Subject PRCH2-REQ-037 only says produce a future LegalLicenseRegistry; no Requirement produces the current interim state or a contribution-intake denial/readback predicate.
- impact=Public Push or contribution handling can proceed as though the absence of a license were neutral, or a future recommendation can be mistaken for an accepted grant.
- remediation=produce an InterimLicenseState object, make Push/contribution/release/package gates depend on it, and require a separately authorized LegalDecision successor before exact LICENSE/NOTICE/contribution bytes can replace it.
- closureTest=external contribution, package, binary Release, Open Source claim or license-file addition denies in the interim state; only exact counsel-approved owner/text/scope/provenance inputs permit the selected transition.
- noMergeKey=PRCH2V2-INTERIM-NO-LICENSE-CONTRIBUTION-RELEASE-BLOCK-ABSENT.

## 3.9 PRCH2V2-IHR-F041 — every-Public-byte ownership and publication provenance are absent

- severity=P0;state=OPEN;closureCredit=0.
- evidence=license observation §4.1 requires every code, document, image, font, dataset, generated output and copied specification byte to bind author/assignment/license/source/modification/scope and reports the proven denominator as zero. Subject PRCH2-REQ-037 proves only every shipped artifact class and dependency/asset, not every byte entering Public Git history or existing-history ownership.
- impact=planning docs, tests, fixtures, images, fonts, copied text or generated output can be publicly committed without proven ownership or redistribution authority even when no Release occurs.
- remediation=produce an EveryPublicByteProvenanceRegistry integrated with the exact allowlist and existing-history audit, retaining author/employment/contract/assignment/license/source/modification/publication-scope and Legal disposition per content root.
- closureTest=forward/inverse coverage equals every allowlisted blob and relevant existing-history object; missing/conflicting owner, unlicensed text/asset, unauthorized generated/copied material or incompatible scope denies; no shipped-only filter is allowed.
- noMergeKey=PRCH2V2-EVERY-PUBLIC-BYTE-OWNERSHIP-PROVENANCE-DENOMINATOR-ABSENT.

## 3.10 PRCH2V2-IHR-F042 — CyberObjectProducerRegistry contradicts its own producer rule

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Subject §1.2.2 says every object has exactly one sole producer. PRCH2-REQ-004 produces CyberObjectProducerRegistry containing every object and its proof requires self-production count=0. The registry is itself an object under PRCH2-REQ-001, so either PRCH2-REQ-004 produces itself, violating zero self-production, or an unnamed producer exists, violating sole-producer/dependency closure.
- impact=object ownership and build topology have no satisfiable canonical model; two implementations can disagree whether Requirement, tool, actor or prior registry is the producer.
- remediation=define bootstrap meta-schema and producer semantics explicitly: distinguish Requirement declaration, executable producer identity and produced object; give schema/registry roots an acyclic external bootstrap or layered construction with exact admission proof.
- closureTest=two graph extractors reconstruct the same complete object/producer graph including bootstrap objects, with exactly one executable producer per object and zero hidden, self, dual, forward or cyclic production edges.
- noMergeKey=PRCH2V2-PRODUCER-REGISTRY-SELF-PRODUCTION-CONTRADICTION.

## 3.11 PRCH2V2-IHR-F043 — conformance and negative-vector registries are self/forward circular

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCH2-REQ-042 says CyberConformanceEnvelopeRegistry covers every Requirement but its dependencies stop at PRCH2-REQ-041; Requirements 043-051 are later. PRCH2-REQ-043 says at least one hostile vector for each Requirement, literally including itself and Requirements 044-051, while depending only on 042.
- impact=literal interpretation creates self/forward dependency cycles; restricted interpretation leaves the acceptance, closure, review, Push and Release requirements without required conformance/vector coverage.
- remediation=replace every Requirement with explicit generation-bounded ID Sets and construct staged meta-conformance generations whose next generation validates the prior registry and all later gate/review rows without self-authentication.
- closureTest=machine enumeration proves exact coverage of all 52 Requirements with no self-generated oracle, no forward reference, no omitted gate row and stale-generation rejection; two independent evaluators execute the staged construction.
- noMergeKey=PRCH2V2-CONFORMANCE-NEGATIVE-VECTOR-SELF-FORWARD-CYCLE.

## 3.12 PRCH2V2-IHR-F044 — no canonical machine grammar or causal evaluator operation

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Subject fields use unconstrained prose terms such as exact,current,approved,admitted,eligible,critical,sensitive,Set,root,receipt,operation and terminal. PRCH2-REQ-001 defers serialization/schema to a future object, while PRCH2-REQ-042 claims clean-room execution without prose judgment but provides no normative artifact format, field types, canonical algorithms, error semantics or executable operation roots.
- impact=two honest implementations can serialize different objects, choose different denominators or return PASS for different causal states while satisfying the same prose.
- remediation=publish a machine-readable normative registry with closed schemas, enums, domain-separated digest profile, canonical path/ref/object grammar, algorithms, evaluator binaries/source roots, input/output/error contracts and test oracles.
- closureTest=two independently implemented parsers/evaluators consume only frozen machine bytes, emit byte-identical outcomes for every positive/negative case and fail unknown field, ambiguous encoding, unsupported operation and hidden prose fallback.
- noMergeKey=PRCH2V2-CANONICAL-GRAMMAR-CAUSAL-EVALUATOR-ABSENT.

## 3.13 PRCH2V2-IHR-F045 — two-reader/parser/runner independence is vacuous

- severity=P1;state=OPEN;closureCredit=0.
- evidence=Subject proof clauses repeatedly say two readers,fetch procedures,enumerators,graph extractors,parsers,clean-room evaluators,runners or readbacks, but no Requirement binds implementation roots, authorship, shared libraries, build provenance, organizational independence, collusion/conflict rules or disagreement terminal for those pairs.
- impact=the same codebase, parser bug, data source or operator can produce two matching outputs and receive false independence credit; two enumerators can omit the same unknown surface.
- remediation=produce an EvaluatorIndependenceRegistry with exact implementation/build roots, authors/organizations, dependency-overlap thresholds, acquisition separation, witness identity, conflict rules and fail-closed disagreement handling.
- closureTest=shared implementation/library/operator and coordinated omission fixtures fail independence; independently rooted evaluators disagree safely to BLOCKED and agreement alone cannot prove denominator completeness.
- noMergeKey=PRCH2V2-TWO-EVALUATOR-INDEPENDENCE-PREDICATE-VACUOUS.

## 3.14 PRCH2V2-IHR-F046 — provider-specific OIDC policies have no sole producer

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCH2-REQ-025 produces only ProviderNeutralOIDCContract, yet its proof requires provider-specific policies to deny wrong fork/ref/environment/workflow/repository/replay/expiry. No Requirement produces a provider policy registry, selected provider/role denominator, provider API adapter or policy-application receipt.
- impact=the neutral contract can pass as prose while one or more actual cloud roles remain broad, stale, long-lived or unverified.
- remediation=add a sole-producer ProviderOIDCPolicySet after an exact selected-provider/role input, with one immutable policy per role and separate plan/apply/readback/revoke records.
- closureTest=forward/inverse coverage equals every selected provider role; exact provider API readback matches each policy root; omitted role, unsupported claim, wrong audience/subject or long-lived fallback credential denies.
- noMergeKey=PRCH2V2-PROVIDER-SPECIFIC-OIDC-POLICY-PRODUCER-ABSENT.

## 3.15 PRCH2V2-IHR-F047 — hidden Legal and D02/D25 external authority dependencies

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Subject §1.2.3 permits only earlier Requirements or typed external roots declared by PRCH2-REQ-000. PRCH2-REQ-037 uses legal selection remains external, PRCH2-REQ-038 uses D02/D25 future inputs and PRCH2-REQ-040 uses D25, but PRCH2-REQ-000 does not declare exact Legal, D02 or D25 input members and their Requirements do not list typed external roots.
- impact=an unrooted recommendation, stale Decision or self-issued Legal/AI policy can silently enter normative objects while the declared dependency graph remains mechanically acyclic.
- remediation=declare each exact external authority class and required root/absence terminal in PRCH2-REQ-000 or a predecessor external-input registry; add explicit dependency edges and prohibit free-text sourceBasis authority.
- closureTest=every authority-bearing token resolves forward/inverse to one exact accepted external member; absent Legal/D02/D25 roots block dependent outputs; substitution, omission and self-issued roots deny.
- noMergeKey=PRCH2V2-UNDECLARED-LEGAL-D02-D25-EXTERNAL-DEPENDENCIES.

## 3.16 PRCH2V2-IHR-F048 — the closure denominator is permanently capped at the old 32 Findings

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCH2-REQ-043 and046 require exactly PRCS-HR-F001 through F032, PRCH2-REQ-046 says exactly32 detached records, and PRCH2-REQ-051 requires32/32 closures. No Requirement discovers or imports Findings from the independent review of this v2 Subject, including this manifest's27 new records.
- impact=all new P0/P1 defects can remain open while the hardcoded predecessor denominator reports complete closure and contributes to Acceptance.
- remediation=replace the fixed closure registry with a review-universe manifest that imports every admitted review root and every Finding/noMergeKey, preserving version lineage and allowing no acceptance before the current review cut is frozen.
- closureTest=adding, removing, reordering or withholding any Finding changes the denominator root and invalidates Acceptance; forward/inverse coverage includes all59 current records and future successor-review records without Merge.
- noMergeKey=PRCH2V2-THIRTY-TWO-ONLY-FINDING-CLOSURE-CEILING.

## 3.17 PRCH2V2-IHR-F049 — scoped open-P0/P1 zero is a vacuous exclusion mechanism

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCH2-REQ-049 requires no open P0/P1 for that bounded scope and PRCH2-REQ-051 repeats open P0=0 and open P1=0 for the exact next-Push/privileged-workflow/release scope, but no closed Finding denominator, applicability function, exclusion authority or inverse scope audit is produced.
- impact=a reviewer can label a material Finding out of scope and obtain zero open counts without rejecting or closing it; cross-cutting history, identity, provider and license Findings are especially suppressible.
- remediation=bind each admitted Finding to a deterministic applicability record for Push, workflow, deploy and release scopes; exclusions require exact rooted rationale, independent review and must remain blocking when they can affect shared state.
- closureTest=withholding, relabeling, range-mapping or scoping away any applicable P0/P1 denies; forward/inverse audit accounts for every Finding exactly once per gate and zero is computed only over the frozen complete denominator.
- noMergeKey=PRCH2V2-SCOPED-OPEN-SEVERITY-ZERO-PREDICATE-VACUOUS.

## 3.18 PRCH2V2-IHR-F050 — GitHub control-plane change Permit and rollback are absent

- severity=P0;state=OPEN;closureCredit=0.
- evidence=live readback shows unprotected main,zero Rulesets,allow-all Actions,full-SHA enforcement off,first-time-only contributor approval and multiple disabled security features. The Subject defines desired contracts/readbacks and Push/Release gates, but no Requirement produces an authorized GitHub settings change plan, exact before/after state, mutation actor/Permit, partial-failure handling, staged rollout, rollback or post-change reconciliation.
- impact=hardening cannot be reached under the planning-only freeze without an undefined authority jump, and an operator can mutate the wrong setting or leave partial controls while later readback appears acceptable.
- remediation=produce a GitHubControlPlaneChangeStateMachine separate from code Push, with exact repository ID, before-root, intended API operations, actor/scope, one-use approval, ordering, dry run, partial failure, rollback, post-state root and independent verification.
- closureTest=wrong repo/actor, stale before-state, omitted setting, reordered unsafe operation, partial apply, concurrent change and rollback failure deny; post-readback equals the full intended state before any control credit.
- noMergeKey=PRCH2V2-GITHUB-CONTROL-PLANE-CHANGE-PERMIT-ROLLBACK-ABSENT.

## 3.19 PRCH2V2-IHR-F051 — current live-readback roots and blocking deficits are not dependencies

- severity=P0;state=OPEN;closureCredit=0.
- evidence=Subject artifact identity predates and does not name the GitHub v3,Legacy v2,license or Secret v2 roots. PRCH2-REQ-044 defines future receipt schemas and PRCH2-REQ-051 says both Public readbacks without identifying which two producers/roots. Current facts include zero Rulesets, an unprotected main, unknown access/Webhooks, open Secret coordinates and interim no-license state.
- impact=a future acceptance evaluator can bind a favorable new snapshot while ignoring unresolved current continuity, corrected observations or surfaces that remain unknown; both readbacks is not a resolvable machine denominator.
- remediation=produce a CurrentObservationInputManifest with exact supersession/continuity semantics and one named readback producer per required local/GitHub/provider/consumer surface; require deltas from each current blocking state.
- closureTest=omitting v2 correction, substituting v1 history denominator, leaving an unknown surface, skipping a current gap or supplying fewer/different readback classes invalidates the acceptance root; all changes are explicit successor deltas.
- noMergeKey=PRCH2V2-CURRENT-LIVE-OBSERVATION-ROOTS-AND-READBACK-DENOMINATOR-UNBOUND.

## 3.20 PRCH2V2-IHR-F052 — deployment target/change/drift/rollback state machine is absent

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCH2-REQ-025 and026 define identity/environment dispatch, and PRCH2-REQ-050 is a privileged workflow/release gate, but no Requirement produces deployment target inventory, desired/current config roots, plan/apply separation, resource diff, health verification, drift monitor, data/schema compatibility, rollback artifact/config or deployment incident transition. Live UI displayed two Deployments but exact state is unknown.
- impact=an authorized workflow can deploy the wrong configuration/resource, partially apply, drift after success or roll back to an unreviewed/vulnerable artifact.
- remediation=produce a DeploymentStateMachine per target/environment with exact desired/current roots, resource fence, immutable artifact/config/secret references, plan approval, apply receipt, health/SLO checks, drift invalidation, data compatibility and tested rollback.
- closureTest=wrong target/config/artifact, stale plan, partial apply, concurrent deploy, health failure, drift and rollback-to-unreviewed bytes deny; successful rollback restores an exact accepted Public-compatible state without changing visibility.
- noMergeKey=PRCH2V2-DEPLOYMENT-CHANGE-DRIFT-ROLLBACK-STATE-MACHINE-ABSENT.

## 3.21 PRCH2V2-IHR-F053 — release rollback, revocation and consumer notification are absent

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCH2-REQ-019 and031 cover distribution identity and delete/restore behavior, while PRCH2-REQ-050 verifies a release. No Requirement defines bad-release detection, deprecation/yank/revocation decision, immutable corrected successor, signing/attestation revocation, consumer notification, supported-version transition or rollback compatibility.
- impact=an immutable but vulnerable or malicious release can remain the preferred consumer artifact, and deletion may destroy evidence or fail on copied/package surfaces.
- remediation=produce a ReleaseIncidentAndRollbackStateMachine that preserves immutable history, marks compromised coordinates, revokes trust/attestations where supported, publishes verified successors, notifies consumers and records irreducible copies.
- closureTest=seeded compromised release cannot remain recommended/accepted; each surface receives exact yank/deprecation/notification/readback; rollback/successor resolves to reviewed Commit/digests and incompatible or unavailable rollback remains blocking.
- noMergeKey=PRCH2V2-RELEASE-ROLLBACK-REVOCATION-CONSUMER-NOTIFICATION-ABSENT.

## 3.22 PRCH2V2-IHR-F054 — general cyber compromise incident lifecycle is absent

- severity=P0;state=OPEN;closureCredit=0.
- evidence=PRCH2-REQ-018 is limited to Public spills and PRCH2-REQ-036 to vulnerability disclosure. No sole output covers compromised maintainer/App/PAT,Ruleset tampering,Action or dependency compromise,runner persistence,OIDC/provider abuse,signer/attestation compromise,malicious release,availability attack or evidence-system compromise.
- impact=the system has no deterministic contain-eradicate-recover sequence for attacks that do not begin as a Public content spill, and compromised evidence can be trusted during response.
- remediation=produce a CyberIncidentResponseStateMachine with scenario taxonomy, independent detection, authority/isolation, credential and trust revocation, evidence preservation, blast-radius inventory, eradication, recovery, post-incident verification, notification and control invalidation.
- closureTest=one hostile vector per scenario reaches deterministic containment before recovery; compromised identity/evidence cannot self-attest cleanup; recovery re-roots every affected control and PUBLIC visibility is preserved.
- noMergeKey=PRCH2V2-GENERAL-CYBER-COMPROMISE-INCIDENT-LIFECYCLE-ABSENT.

## 3.23 PRCH2V2-IHR-F055 — dependency/SBOM vulnerability lifecycle is incomplete

- severity=P1;state=OPEN;closureCredit=0.
- evidence=Subject PRCH2-REQ-029/030 inventory executables and registry threats and PRCH2-REQ-031/032 bind release provenance, but no Requirement defines complete runtime/dev/optional/peer/workspace dependency denominator, lock-to-installed reconciliation, SBOM completeness, vulnerability/reachability triage, remediation SLA, exception expiry or re-scan on advisory change. Live Dependabot signals are explicitly not completeness proof.
- impact=known vulnerable or omitted transitive components can ship with correct registry and provenance; alert presence alone can be mistaken for closure.
- remediation=produce DependencyAndVulnerabilityLifecycleRegistry across every ecosystem and artifact, binding graph/SBOM/lock/installed roots, advisory sources, reachability, severity policy, owner/SLA, exception expiry and release impact.
- closureTest=omitted transitive/workspace component, lock/install mismatch, stale advisory, vulnerable reachable fixture, expired exception and incomplete SBOM deny; advisory delta invalidates affected releases.
- noMergeKey=PRCH2V2-DEPENDENCY-SBOM-VULNERABILITY-LIFECYCLE-GAP.

## 3.24 PRCH2V2-IHR-F056 — repository-relative path and locator grammar is not normative

- severity=P1;state=OPEN;closureCredit=0.
- evidence=the frozen Subject currently contains zero host-absolute paths, but PRCH2-REQ-001 does not define canonical repository-relative path normalization or forbid absolute paths,file URIs,parent traversal,symlink escape,case/Unicode aliases,Windows drive/UNC paths or host-specific evidence locators in produced objects.
- impact=future registries can leak workstation identity, become non-portable, address the wrong file or allow two textual locators to select one byte object.
- remediation=define one repo-relative locator grammar bound to canonical Product root, byte-oriented normalization, case/Unicode policy, symlink/submodule boundary and disclosure-safe external indirection; reject host paths in Public projections.
- closureTest=absolute POSIX,Windows drive/UNC,file URI,parent traversal,symlink escape,case collision,Unicode alias and outer-root locators deny; two readers resolve every admitted locator to the same object.
- noMergeKey=PRCH2V2-REPOSITORY-RELATIVE-PATH-LOCATOR-GRAMMAR-ABSENT.

## 3.25 PRCH2V2-IHR-F057 — sourceBasis shorthand is not canonically parseable

- severity=P1;state=OPEN;closureCredit=0.
- evidence=Subject §1.1.13 requires PRCS tokens plus exact record/field and §1.1.16 requires range expansion, yet sourceBasis fields use unqualified tokens after semicolons such as F006,F003,F027-F030,F029 and mixed range forms GH-11..17,GH-14..17,GH-01..05. No grammar says how qualifier inheritance, slash lists, en dashes, two dots or section ranges canonicalize.
- impact=two parsers can bind a Finding to different manifests or expand different official-source Sets while each claims exact token resolution.
- remediation=replace shorthand with machine arrays of fully qualified artifact root, member ID, field/clause locator and explicit individual source IDs; prohibit inherited qualifiers and range tokens in normative bytes.
- closureTest=all 52 sourceBasis values parse without context inheritance; forward/inverse member resolution is unique; unqualified ID, range, slash alias, unknown locator and alternate punctuation deny.
- noMergeKey=PRCH2V2-SOURCEBASIS-QUALIFIER-RANGE-GRAMMAR-AMBIGUOUS.

## 3.26 PRCH2V2-IHR-F058 — Evidence custody, trusted time and immutable receipt lifecycle are missing

- severity=P1;state=OPEN;closureCredit=0.
- evidence=PRCH2-REQ-003 defines disclosure and PRCH2-REQ-044 defines receipt schemas, while several Requirements require trusted time,current/fresh evidence and endpoint/response roots. No Requirement produces an Evidence store/custodian, access control, append-only custody, trusted-time authority, retention/legal hold, deletion/tombstone, corruption detection, receipt revocation or continuity proof.
- impact=mutable/private evidence can be replaced, expired selectively, lost or disclosed; local clock claims can make stale controls current and a raw digest can become a Public equality oracle.
- remediation=produce PrivateEvidenceCustodyAndTimeRegistry with sole custodian/producer identities, append-only commitments, trusted-time source/absence, access/audit, encryption/key rotation, retention/hold, redaction-safe projections, revocation and successor continuity.
- closureTest=clock skew, stale/replayed/replaced/deleted receipt, broken chain, unauthorized reader, corrupted object, key rotation and Public equality-oracle vectors deny; private bytes remain recoverable to authorized reviewers only.
- noMergeKey=PRCH2V2-EVIDENCE-CUSTODY-TRUSTED-TIME-IMMUTABILITY-GAP.

## 3.27 PRCH2V2-IHR-F059 — reproducible build and complete build-material provenance are not required

- severity=P1;state=OPEN;closureCredit=0.
- evidence=PRCH2-REQ-028/029 bind runner/tools, PRCH2-REQ-031 binds released digests and PRCH2-REQ-032/033 can attest/claim SLSA, but no Requirement requires canonical build recipe, complete source/material/environment input Set, reproducibility or bounded variance, independent rebuild comparison, or source-archive equivalence. A valid attestation can therefore describe an opaque non-reproducible build.
- impact=a compromised or misconfigured trusted producer can emit malicious bytes with internally consistent provenance that consumers cannot independently relate to reviewed source.
- remediation=produce BuildRecipeAndMaterialManifest plus reproducibility policy per artifact class, binding source tree, dependency/SBOM, toolchain, environment, flags, generated inputs and allowed nondeterminism; require independent rebuild or explicit accepted non-reproducible risk.
- closureTest=source/material/tool/flag/environment omission or substitution changes identity and denies; reproducible classes match independent artifact digests, and bounded-variance classes pass canonical semantic comparison with rooted rationale.
- noMergeKey=PRCH2V2-REPRODUCIBLE-BUILD-COMPLETE-MATERIAL-PROVENANCE-ABSENT.

# 4. Manifest totals and disposition

4.1 total Findings=59.

4.2 predecessor Findings preserved separately=32/32.

4.3 new Findings=27.

4.4 P0=31.

4.5 P1=27.

4.6 P2=1.

4.7 P3=0.

4.8 OPEN=59/59.

4.9 CLOSED=0/59.

4.10 MERGED=0.

4.11 SUPPRESSED=0.

4.12 Subject Acceptance=0.

4.13 Public Push Permit=ABSENT.

4.14 privileged workflow/release Permit=ABSENT.

4.15 repository visibility=PUBLIC.

4.16 Gate29=BLOCKED.

4.17 development freeze=ACTIVE.

4.18 no Finding closes from prose presence, crosswalk presence, a configured checkbox, a positive run, scanner zero-confirmed count, or another Finding's evidence.
