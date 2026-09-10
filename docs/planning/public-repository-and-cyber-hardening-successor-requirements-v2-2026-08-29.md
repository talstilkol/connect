# 1. Connect — Public repository and cyber hardening successor requirements v2

## 1.1 Artifact identity

1.1.1 `artifactId=CONNECT-PUBLIC-REPOSITORY-CYBER-HARDENING-SUCCESSOR-REQUIREMENTS-V2-2026-08-29`.

1.1.2 `artifactClass=IMMUTABLE-PLANNING-CANDIDATE; NOT-AN-IMPLEMENTATION; NOT-A-GITHUB-SETTINGS-RECEIPT; NOT-ACCEPTED`.

1.1.3 binding visibility=`PUBLIC`; changing Connect to Private is forbidden as a repair, release action, rollback or incident response.

1.1.4 reviewed predecessor Decision root=`sha256:448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`.

1.1.5 reviewed cyber-source supplement root=`sha256:fa47fceef7df91fb9e46f1d09f451a3d1344cfdcbbe7ea100b6b85e4a4471250`.

1.1.6 hostile-review report root=`sha256:af7bd90255fe0cb037d19ad8138609a3b35df50c33219470c845dec15919c6d5`.

1.1.7 hostile-review Findings Manifest root=`sha256:a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4`.

1.1.8 stale-Private observation root=`sha256:b54a94c60db89f45dc3d2581360a9c61ae87b936451ea8420d27b6dc2fdd8ff4`.

1.1.9 current boundary=`Planning authoring/research/review only`; Product code, Build, runtime Test, Git/GitHub mutation, Commit, Push, Release, Provider, Credential, Purchase and Deployment remain prohibited.

1.1.10 canonical source token `D18-A2` resolves only to `sha256:448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9` plus the exact clause locator named in a `sourceBasis` field.

1.1.11 canonical source token `CYBER-SUPPLEMENT` resolves only to `sha256:fa47fceef7df91fb9e46f1d09f451a3d1344cfdcbbe7ea100b6b85e4a4471250` plus the named locator.

1.1.12 canonical source token `PRCS-REPORT` resolves only to `sha256:af7bd90255fe0cb037d19ad8138609a3b35df50c33219470c845dec15919c6d5` plus the named section/claim locator.

1.1.13 canonical source tokens `PRCS-HR`, `PRCS-FINDINGS` and `Findings Manifest` resolve only to `sha256:a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4` plus the named `PRCS-HR-Fnnn` record/field; they never mean a free-text family.

1.1.14 canonical source token `STALE-PRIVATE` resolves only to `sha256:b54a94c60db89f45dc3d2581360a9c61ae87b936451ea8420d27b6dc2fdd8ff4` plus the named locator.

1.1.15 official IDs such as `GH-01` or `NIST-03` resolve only to the reviewer-local URL observations at `PRCS-REPORT` section 4 until accepted Source Universe custody supplies exact authoritative byte roots; reviewer-local URL observation gives no implementation or compliance credit.

1.1.16 every dash/range in a human-readable `sourceBasis` expands to each individual Finding or official-source ID in the closed endpoints; machine closure must store the expanded identities and may not retain a range token.

## 1.2 Requirement schema and semantics

1.2.1 every Requirement below has exactly five fields: `requirement`, `sourceBasis`, `dependencies`, `proof`, `failure`.

1.2.2 every Requirement produces exactly one named canonical object or one closure-only assertion; an object has exactly one sole producer.

1.2.3 `dependencies` contains only earlier Requirement IDs or typed external roots declared by `PRCH2-REQ-000`.

1.2.4 a Requirement receives no credit from prose presence; its `proof` must bind exact roots, locators, evaluator profile, expected state and evidence boundary.

1.2.5 any missing, stale, contradictory, inaccessible or unverified input fails closed to the listed terminal; `UNKNOWN` never becomes `PASS`.

# 2. Topologically ordered Requirements

## 2.1 Authority, identity and Public boundary

### 2.1.1 `PRCH2-REQ-000`

2.1.1.1 requirement=`produce ExternalAuthorityInputRegistry containing exact accepted roots for B0, canonical Tal mandate receipt, accepted Review Protocol, accepted Source Universe, accepted Control Sequence, D18 Public Decision and canonical repository identity; absent roots remain typed absent`.

2.1.1.2 sourceBasis=`D18-A2 sections 1–6; PRCS-REPORT sections 1–2 and 9; B0 remains external/absent`.

2.1.1.3 dependencies=`none; external authority only`.

2.1.1.4 proof=`two readers serialize the same registry; every authority-bearing use resolves to one exact member; accepted-root substitution, omission, duplicate and self-issued authority counts are zero`.

2.1.1.5 failure=`FOUNDATION-AUTHORITY-BLOCKED; no downstream Acceptance, Push, privileged workflow or Release authorization`.

### 2.1.2 `PRCH2-REQ-001`

2.1.2.1 requirement=`produce CyberObjectSchemaRegistry defining canonical serialization, digest profile, deterministic content-derived IDs, object class, privacy class, owner, epoch, expiry, revocation and successor semantics for every object in this specification`.

2.1.2.2 sourceBasis=`PRCS-REPORT sections 7.1–7.2; PRCS-FINDINGS F003–F005,F010,F030; user no-random identity rule in the canonical mandate input`.

2.1.2.3 dependencies=`PRCH2-REQ-000`.

2.1.2.4 proof=`two independent serializers emit byte-identical objects and IDs; Math.random(), counters, clock-only IDs and unapproved randomness are rejected; ambiguous or non-canonical encodings are zero`.

2.1.2.5 failure=`CYBER-IDENTITY-BLOCKED`.

### 2.1.3 `PRCH2-REQ-002`

2.1.3.1 requirement=`produce PublicRepositoryInvariant whose only allowed canonical visibility is Public and whose incident/rollback actions freeze effects, revoke credentials and restore verified Public configuration without changing visibility`.

2.1.3.2 sourceBasis=`D18-A2 sections 2.1–2.6 and 6; STALE-PRIVATE sections 2–3; PRCS-REPORT sections 1.2 and 9`.

2.1.3.3 dependencies=`PRCH2-REQ-000;PRCH2-REQ-001`.

2.1.3.4 proof=`active Master/Decision/Task/Test/Gate/Runbook scan returns zero Private requirements; every historical occurrence resolves to exact old root+locator and cannot satisfy a live predicate; canonical readback requires isPrivate=false`.

2.1.3.5 failure=`PUBLIC-INVARIANT-BLOCKED; automatic visibility mutation forbidden`.

### 2.1.4 `PRCH2-REQ-003`

2.1.4.1 requirement=`produce EvidenceDisclosurePolicy separating private operational Evidence from disclosure-minimized Public projections, including prohibited fields, opaque commitment profile, collision domain, key/indirection lifecycle, rotation, deletion, re-identification bound and independent approval`.

2.1.4.2 sourceBasis=`PRCS-FINDINGS F005,F006,F010,F015,F021,F022; PRCS-REPORT sections 7.1–7.2`.

2.1.4.3 dependencies=`PRCH2-REQ-001;PRCH2-REQ-002`.

2.1.4.4 proof=`every publication surface maps to one allowed projection schema; private raw digests/payloads cannot enter Public bytes; collision, linkage, rotation, deletion and replay evaluations bind an admitted adversarial-corpus root and accepted bounds`.

2.1.4.5 failure=`PUBLIC-EVIDENCE-BLOCKED`.

### 2.1.5 `PRCH2-REQ-004`

2.1.5.1 requirement=`produce CyberObjectProducerRegistry classifying each object as external input, normative output, observation or evidence and assigning exactly one sole producer`.

2.1.5.2 sourceBasis=`PRCS-FINDINGS F009,F010,F030; accepted Source Universe obligation; PRCS-REPORT section 7.1`.

2.1.5.3 dependencies=`PRCH2-REQ-000;PRCH2-REQ-001;PRCH2-REQ-003`.

2.1.5.4 proof=`producer count equals one for every output; self-production, dual classification, missing producer, hidden semantic dependency, forward edge and cycle counts are zero under two graph extractors`.

2.1.5.5 failure=`CYBER-DEPENDENCY-CLOSURE-BLOCKED`.

## 2.2 Cyber source custody and claim limits

### 2.2.1 `PRCH2-REQ-005`

2.2.1.1 requirement=`produce CyberFrameworkDenominator containing every framework, standard, taxonomy, vendor-document and official conflict cited by the predecessor and hostile review, with final/draft status kept separate`.

2.2.1.2 sourceBasis=`PRCS-HR F009; PRCS-REPORT sections 4 and 6; Source Universe accepted root required by PRCH2-REQ-000`.

2.2.1.3 dependencies=`PRCH2-REQ-000;PRCH2-REQ-004`.

2.2.1.4 proof=`forward and inverse token resolution cover every cited framework/version/URL exactly once; dangling, duplicate, uncaptured and denominator-mismatch counts are zero`.

2.2.1.5 failure=`CYBER-SOURCE-DENOMINATOR-BLOCKED`.

### 2.2.2 `PRCH2-REQ-006`

2.2.2.1 requirement=`produce CyberSourceCaptureRegistry with canonical/final URLs, redirects, authoritative bytes or immutable assets, raw SHA-256, media type, exact locator, license, retrieval receipt and trusted-time state`.

2.2.2.2 sourceBasis=`PRCS-HR F010; PRCS-REPORT sections 4.1 and 7.1; accepted Source Universe required`.

2.2.2.3 dependencies=`PRCH2-REQ-005`.

2.2.2.4 proof=`two independent fetch/readback procedures reproduce every admitted root and locator; mutable changes create successors rather than overwrites; unavailable trusted time blocks freshness-sensitive claims`.

2.2.2.5 failure=`CYBER-SOURCE-CUSTODY-BLOCKED`.

### 2.2.3 `PRCH2-REQ-007`

2.2.3.1 requirement=`produce CyberSourceConflictRegistry preserving SAMM family versus v2.2.0 release identity, ATT&CK v19.2 official date conflict, ATLAS v2026.07 identity, NIST AI errata and OWASP LLM 2026 publication-date conflict without silent selection`.

2.2.3.2 sourceBasis=`PRCS-HR F011,F027,F028; official-source IDs SAMM-01/02,MITRE-01..04,NIST-03/04,OWASP-02/03`.

2.2.3.3 dependencies=`PRCH2-REQ-006`.

2.2.3.4 proof=`each conflict has all exact roots, bounded claims, deterministic precedence or unresolved state and affected mappings; release/date metadata cannot substitute for content identity`.

2.2.3.5 failure=`CYBER-SOURCE-CONFLICT-BLOCKED`.

### 2.2.4 `PRCH2-REQ-008`

2.2.4.1 requirement=`produce CyberSourceFreshnessRegistry with immutable root, observed version, next review, source-specific signal/cadence, trusted-time rule, fetch-failure terminal, semantic Delta, affected Set, re-review SLA and old-root retention`.

2.2.4.2 sourceBasis=`PRCS-HR F027–F030; PRCS-REPORT section 7.1`.

2.2.4.3 dependencies=`PRCH2-REQ-006;PRCH2-REQ-007`.

2.2.4.4 proof=`unchanged refresh reproduces root; changed source creates exact successor/impact Set; expiry or failed refresh yields BLOCKED/UNKNOWN; historical roots stay readable but cannot satisfy current claims`.

2.2.4.5 failure=`CYBER-SOURCE-STALE-BLOCKED`.

## 2.3 Organization, access and governance

### 2.3.1 `PRCH2-REQ-009`

2.3.1.1 requirement=`produce RepoAuthorityRegistry specifying planned company-Organization ownership while Public, two named recoverable owners, secure 2FA, team roles, outside-collaborator limits, audit retention and exact canonical repository IDs`.

2.3.1.2 sourceBasis=`PRCS-HR F008; GH-21/GH-22 observations; D18 Public invariant`.

2.3.1.3 dependencies=`PRCH2-REQ-002;PRCH2-REQ-008`.

2.3.1.4 proof=`future provider readback must show Public Organization-owned canonical identity, two recoverable owners, approved roles and secure 2FA; unexplained admins are zero`.

2.3.1.5 failure=`REPO-AUTHORITY-BLOCKED; current personal ownership receives no Production governance credit`.

### 2.3.2 `PRCH2-REQ-010`

2.3.2.1 requirement=`produce PrivilegedIdentityRegistry preferring GitHub Apps and short-lived scoped identities and defining PAT/deploy-key restrictions, recovery custody, access review, revocation and audited expiring break-glass`.

2.3.2.2 sourceBasis=`PRCS-HR F008,F015; GH-21/GH-22`.

2.3.2.3 dependencies=`PRCH2-REQ-009`.

2.3.2.4 proof=`every privileged identity resolves to owner, role, scope, credential class, expiry and revocation; unexplained classic PAT/write deploy key and permanent bypass counts are zero; drill readback proves expiry/revocation`.

2.3.2.5 failure=`PRIVILEGED-IDENTITY-BLOCKED`.

### 2.3.3 `PRCH2-REQ-011`

2.3.3.1 requirement=`produce BypassSurfaceRegistry with separate deny-by-default records for branch, tag, push protection, environment, Actions approval, emergency release and safe expunging`.

2.3.3.2 sourceBasis=`PRCS-HR F015; F006; GH-07/GH-09/GH-11/GH-21`.

2.3.3.3 dependencies=`PRCH2-REQ-010`.

2.3.3.4 proof=`each surface binds exact actors, prohibited self-review, purpose/ticket, second approver, scope, expiry, post-event readback and zero-use review; unlisted/admin/stale attempts deny`.

2.3.3.5 failure=`BYPASS-AUTHORITY-BLOCKED`.

### 2.3.4 `PRCH2-REQ-012`

2.3.4.1 requirement=`produce CodeOwnershipPolicy protecting .github/CODEOWNERS and workflows, catch-all and sensitive paths, syntax/precedence/case/owner validation, base-branch identity and a second independent approval beyond GitHub's one-owner semantics`.

2.3.4.2 sourceBasis=`PRCS-HR F014; GH-08/GH-09`.

2.3.4.3 dependencies=`PRCH2-REQ-009;PRCH2-REQ-011`.

2.3.4.4 proof=`future API validation reports zero errors and every tracked path has approved ownership; one owner or author/self-review cannot satisfy sensitive-path policy; ownership changes require protected independent owners`.

2.3.4.5 failure=`CODE-OWNERSHIP-BLOCKED`.

### 2.3.5 `PRCH2-REQ-013`

2.3.5.1 requirement=`produce RequiredCheckRegistry binding every check name to expected GitHub App/source, event, workflow root, head or merge-group SHA, freshness and invalidation behavior`.

2.3.5.2 sourceBasis=`PRCS-HR F013; GH-09/GH-10`.

2.3.5.3 dependencies=`PRCH2-REQ-009;PRCH2-REQ-012`.

2.3.5.4 proof=`same-name wrong-source, stale, missing and wrong-SHA statuses cannot satisfy policy; merge_group:checks_requested executes the complete expected Set`.

2.3.5.5 failure=`REQUIRED-CHECK-BLOCKED`.

### 2.3.6 `PRCH2-REQ-014`

2.3.6.1 requirement=`produce BranchTagRulesetContract defining separate active branch and tag Rulesets, protected refs, review/dismissal/update/delete rules, expected checks, bypass identities and signed-commit decision`.

2.3.6.2 sourceBasis=`PRCS-HR F001,F013–F015,F032; GH-08/GH-09/GH-10`.

2.3.6.3 dependencies=`PRCH2-REQ-011;PRCH2-REQ-012;PRCH2-REQ-013`.

2.3.6.4 proof=`future API readback must equal both exact active contracts; unapproved force/update/delete, single-review sensitive change, stale approval and wrong-source status deny`.

2.3.6.5 failure=`RULESET-CONTRACT-BLOCKED`.

## 2.4 Public egress, Secrets and incident handling

### 2.4.1 `PRCH2-REQ-015`

2.4.1.1 requirement=`produce PublicEgressDiscoveryInputSet covering Git/history/LFS, refs/names/metadata, forks/PRs/Issues/Discussions/comments/attachments, Actions/logs/annotations/artifacts/caches, releases/assets, packages/containers, SBOMs, attestations/transparency and social previews`.

2.4.1.2 sourceBasis=`PRCS-HR F006,F016,F020,F021; PRCS-REPORT sections 3.1 and 8.4`.

2.4.1.3 dependencies=`PRCH2-REQ-002;PRCH2-REQ-004;PRCH2-REQ-009`.

2.4.1.4 proof=`two enumerators produce identical seed/frontier/sink Sets; omitted, withheld or inaccessible eligible roots prevent COMPLETE and name the exact unknown frontier`.

2.4.1.5 failure=`UNKNOWN-PUBLIC-EGRESS-BLOCKED`.

### 2.4.2 `PRCH2-REQ-016`

2.4.2.1 requirement=`produce PublicContentClassificationPolicy with allowed/prohibited classes, data minimization, metadata handling, re-identification rules, source-specific prevention and redacted private Evidence`.

2.4.2.2 sourceBasis=`PRCS-HR F006,F021,F022; PRCH2-REQ-003 Evidence policy`.

2.4.2.3 dependencies=`PRCH2-REQ-003;PRCH2-REQ-015`.

2.4.2.4 proof=`every discovered sink and object class has a deterministic classification/action; unknown classification blocks; prohibited payload never appears in Public failure output`.

2.4.2.5 failure=`PUBLIC-CONTENT-CLASSIFICATION-BLOCKED`.

### 2.4.3 `PRCH2-REQ-017`

2.4.3.1 requirement=`produce SecretDetectorCoverageRegistry with detector/version, accepted Secret class, pre-egress and incident surfaces, binary/archive/LFS/history coverage, custom patterns, exclusions, validity-check privacy, redaction, bypass path and blocking Unknown`.

2.4.3.2 sourceBasis=`PRCS-HR F022; F006,F021; GH-01/GH-11/GH-12/GH-13`.

2.4.3.3 dependencies=`PRCH2-REQ-016`.

2.4.3.4 proof=`an admitted non-operational detector corpus root yields exact per-class confusion matrices; critical-secret false negatives equal zero; other metrics meet rooted thresholds; bypass/self-exemption and log-leak evaluations deny`.

2.4.3.5 failure=`SECRET-DETECTION-BLOCKED`.

### 2.4.4 `PRCH2-REQ-018`

2.4.4.1 requirement=`produce PublicSpillIncidentStateMachine ordering effect freeze and credential revocation before classification, complete surface inventory, private legal preservation, purge/Support/fork-clone coordination, recontamination prevention and residual-risk declaration`.

2.4.4.2 sourceBasis=`PRCS-HR F006,F020–F022; GH-11..17; Public invariant`.

2.4.4.3 dependencies=`PRCH2-REQ-011;PRCH2-REQ-015;PRCH2-REQ-016;PRCH2-REQ-017`.

2.4.4.4 proof=`every admitted incident scenario produces a deterministic inventory, revocation receipt, per-surface action/limitation, coordination record and post-remediation search; irreducible Public copies remain blocking residual risk`.

2.4.4.5 failure=`PUBLIC-SPILL-INCIDENT-BLOCKED; visibility remains Public`.

### 2.4.5 `PRCH2-REQ-019`

2.4.5.1 requirement=`produce DistributionSurfaceRegistry declaring use/non-use and independent visibility, access, namespace, publisher, retention, yank/delete/restore/Support and incident behavior for Releases, assets, Packages, containers and Git LFS`.

2.4.5.2 sourceBasis=`PRCS-HR F001,F006,F020; GH-13..17`.

2.4.5.3 dependencies=`PRCH2-REQ-009;PRCH2-REQ-015;PRCH2-REQ-018`.

2.4.5.4 proof=`future API inventory accounts for every release, asset, package/version, container and LFS pointer/object; unknown surfaces and unaccepted visibility/deletion limitations block first publication`.

2.4.5.5 failure=`DISTRIBUTION-SURFACE-BLOCKED`.

## 2.5 Actions, forks, artifacts, OIDC and environments

### 2.5.1 `PRCH2-REQ-020`

2.5.1.1 requirement=`produce WorkflowInventory containing every local/reusable workflow, canonical root, triggers, inputs, checkout/source refs, jobs, permissions, Secrets, environments, caches, artifacts, network and side effects`.

2.5.1.2 sourceBasis=`PRCS-HR F002,F003,F017–F019,F031; PRCS-REPORT section 5.1 local corroborating observations`.

2.5.1.3 dependencies=`PRCH2-REQ-001;PRCH2-REQ-009;PRCH2-REQ-015`.

2.5.1.4 proof=`two parsers enumerate the same workflow/job/edge universe; unresolved dynamic expression, hidden reusable workflow, unknown permission or unknown side effect blocks`.

2.5.1.5 failure=`WORKFLOW-INVENTORY-BLOCKED`.

### 2.5.2 `PRCH2-REQ-021`

2.5.2.1 requirement=`produce WorkflowTrustMatrix for every workflow/event/actor/ref/checked-out-ref combination across pull_request, pull_request_target, workflow_run, issue_comment, workflow_dispatch, schedule, push and merge_group, defaulting unlisted combinations to DENY`.

2.5.2.2 sourceBasis=`PRCS-HR F002,F016,F019; GH-01..05/GH-10`.

2.5.2.3 dependencies=`PRCH2-REQ-020`.

2.5.2.4 proof=`hostile fork, edited workflow, pull_request_target checkout, workflow_run artifact, issue-comment and unauthorized dispatch transitions deny before privilege; matrix cardinality equals discovered workflow/event universe`.

2.5.2.5 failure=`WORKFLOW-TRUST-BLOCKED`.

### 2.5.3 `PRCH2-REQ-022`

2.5.3.1 requirement=`produce ScriptAndContextTaintPolicy labeling attacker-controlled contexts and forbidding direct interpolation/execution while binding sanitization, argument passing, parser and output provenance`.

2.5.3.2 sourceBasis=`PRCS-HR F002,F003; GH-01/GH-04`.

2.5.3.3 dependencies=`PRCH2-REQ-020;PRCH2-REQ-021`.

2.5.3.4 proof=`every tainted source-to-shell/tool sink has an approved typed boundary; interpolation, expression injection and argument-substitution evaluations fail without token, Secret or side effect`.

2.5.3.5 failure=`WORKFLOW-TAINT-BLOCKED`.

### 2.5.4 `PRCH2-REQ-023`

2.5.4.1 requirement=`produce WorkflowPrivilegeGraph separating untrusted install/build/test from signer, attestation, deployment and release jobs and allowing only digest-bound policy-validated artifacts across the trust boundary`.

2.5.4.2 sourceBasis=`PRCS-HR F003,F005,F017; GH-01/GH-05/GH-06/GH-07/GH-15/SLSA-01`.

2.5.4.3 dependencies=`PRCH2-REQ-021;PRCH2-REQ-022`.

2.5.4.4 proof=`graph contains no path from untrusted bytes to write token/OIDC/Secret/environment except through an approved immutable digest contract; privileged jobs install no untrusted dependency and use explicit minimal permissions`.

2.5.4.5 failure=`PRIVILEGE-SEPARATION-BLOCKED`.

### 2.5.5 `PRCH2-REQ-024`

2.5.5.1 requirement=`produce CacheArtifactTrustContract partitioning namespaces by trust domain and binding artifact producer workflow/run/head/digest/schema/scan/retention/purge before consumption`.

2.5.5.2 sourceBasis=`PRCS-HR F017; F003; GH-01/GH-05/GH-15`.

2.5.5.3 dependencies=`PRCH2-REQ-020;PRCH2-REQ-023`.

2.5.5.4 proof=`low-trust cache/artifact cannot be restored by privileged jobs; producer, head, digest, schema or retention mismatch denies; purge/readback matches policy`.

2.5.5.5 failure=`CACHE-ARTIFACT-TRUST-BLOCKED`.

### 2.5.6 `PRCH2-REQ-025`

2.5.6.1 requirement=`produce ProviderNeutralOIDCContract defining issuer, audience, subject/custom claims, immutable owner/repository/workflow identity, environment/ref, provider role/scope, TTL, replay, revocation and deny policy`.

2.5.6.2 sourceBasis=`PRCS-HR F004; GH-06/GH-07/GH-21/GH-22`.

2.5.6.3 dependencies=`PRCH2-REQ-009;PRCH2-REQ-020;PRCH2-REQ-023`.

2.5.6.4 proof=`provider-specific policies must deny fork, wrong ref/environment/workflow/repository ID, replay and expiry; only approved protected workflow obtains scoped short-lived role; long-lived deployment secret gives zero OIDC credit`.

2.5.6.5 failure=`OIDC-TRUST-BLOCKED`.

### 2.5.7 `PRCH2-REQ-026`

2.5.7.1 requirement=`produce EnvironmentDispatchContract for staging/production separation, required independent reviewers, prevent-self-review, protected refs, actor role, exact input schema, concurrency/resource fence and read-only-proof separation`.

2.5.7.2 sourceBasis=`PRCS-HR F019; GH-03/GH-06/GH-07`.

2.5.7.3 dependencies=`PRCH2-REQ-011;PRCH2-REQ-021;PRCH2-REQ-025`.

2.5.7.4 proof=`wrong actor/ref/input, self-review and concurrent duplicate dispatch deny; Secrets unavailable pre-approval; receipt binds actor, workflow root, ref SHA, environment and resource fence`.

2.5.7.5 failure=`ENVIRONMENT-DISPATCH-BLOCKED`.

### 2.5.8 `PRCH2-REQ-027`

2.5.8.1 requirement=`produce ExternalContributorExecutionPolicy requiring approval for every external contributor on every eligible run, exact workflow-diff/head inspection, approval invalidation after change, privileged pull_request_target prohibition and cost/concurrency caps`.

2.5.8.2 sourceBasis=`PRCS-HR F016; GH-01/GH-02/GH-03`.

2.5.8.3 dependencies=`PRCH2-REQ-021;PRCH2-REQ-022;PRCH2-REQ-026`.

2.5.8.4 proof=`prior merged contribution grants no standing trust; head/workflow change invalidates approval; denied run obtains no token, Secret or environment and cannot exceed bounded resources`.

2.5.8.5 failure=`EXTERNAL-CONTRIBUTOR-BLOCKED`.

### 2.5.9 `PRCH2-REQ-028`

2.5.9.1 requirement=`produce RunnerEnvironmentContract binding runner label and resolved image/release/SBOM, tool/download roots, network-egress policy, workspace-state boundary and hermeticity exceptions`.

2.5.9.2 sourceBasis=`PRCS-HR F031; GH-01/SLSA-01`.

2.5.9.3 dependencies=`PRCH2-REQ-020;PRCH2-REQ-023`.

2.5.9.4 proof=`release Evidence binds resolved image and tool/input inventory; unapproved outbound host, changed checksum or undeclared workspace inheritance denies; no credential precedes untrusted install`.

2.5.9.5 failure=`RUNNER-ENVIRONMENT-BLOCKED`.

## 2.6 Executable supply chain, provenance and release identity

### 2.6.1 `PRCH2-REQ-029`

2.6.1.1 requirement=`produce ExecutableDependencyInventory covering Actions, reusable workflows, local/composite/container actions, images, package managers, browser/system downloads, native binaries and transitive executables with immutable roots and review expiry`.

2.6.1.2 sourceBasis=`PRCS-HR F018,F031; GH-01/GH-15/SLSA-01`.

2.6.1.3 dependencies=`PRCH2-REQ-006;PRCH2-REQ-020;PRCH2-REQ-028`.

2.6.1.4 proof=`mutable/unresolved executable references equal zero; moved tag/image, wrong fork SHA and checksum mismatch deny before execution; every component has unexpired owner/source review`.

2.6.1.5 failure=`EXECUTABLE-SUPPLY-CHAIN-BLOCKED`.

### 2.6.2 `PRCH2-REQ-030`

2.6.2.1 requirement=`produce PackageRegistryNamespacePolicy binding every scope to an approved HTTPS registry, namespace reservation, rooted registry/lock origin, non-publishable private:true, publishConfig, lifecycle/native policy, quarantine and allow/deny record`.

2.6.2.2 sourceBasis=`PRCS-HR F007; NPM-01/NPM-02/GH-01/GH-15/SLSA-01`.

2.6.2.3 dependencies=`PRCH2-REQ-029`.

2.6.2.4 proof=`wrong registry, same-name public package, scope remap, lock substitution, typosquat, lifecycle script, provenance mismatch and accidental publish all deny before install/release`.

2.6.2.5 failure=`DEPENDENCY-CONFUSION-BLOCKED`.

### 2.6.3 `PRCH2-REQ-031`

2.6.3.1 requirement=`produce ReleaseIdentityContract binding protected tag, exact commit, immutable release, asset and package coordinates/digests, publisher identity, attestation and consumer verification`.

2.6.3.2 sourceBasis=`PRCS-HR F001; GH-09/GH-14..17/SLSA-01`.

2.6.3.3 dependencies=`PRCH2-REQ-014;PRCH2-REQ-019;PRCH2-REQ-029;PRCH2-REQ-030`.

2.6.3.4 proof=`tag move/delete, asset replacement, coordinate/digest/publisher mismatch deny; every released consumer artifact resolves to exact reviewed commit and immutable digest`.

2.6.3.5 failure=`RELEASE-IDENTITY-BLOCKED`.

### 2.6.4 `PRCH2-REQ-032`

2.6.4.1 requirement=`produce AttestationProducerConsumerPolicy defining allowed predicate types, subject digest Set, trusted signer/repository/workflow/environment, transparency disclosure classification, verification time and failure=DENY`.

2.6.4.2 sourceBasis=`PRCS-HR F005; GH-15/SLSA-01; EvidenceDisclosurePolicy`.

2.6.4.3 dependencies=`PRCH2-REQ-003;PRCH2-REQ-023;PRCH2-REQ-025;PRCH2-REQ-031`.

2.6.4.4 proof=`approved digest/signer/workflow verifies; wrong/missing subject, signer, repository, workflow, environment, bundle or transparency material denies; prohibited metadata never enters Public entry`.

2.6.4.5 failure=`ATTESTATION-VERIFICATION-BLOCKED`.

### 2.6.5 `PRCH2-REQ-033`

2.6.5.1 requirement=`produce SLSAClaimRegistry separating exact SLSA version, Source Track, Build Track and Level and mapping each normative claim to platform Evidence and expected-provenance consumer policy`.

2.6.5.2 sourceBasis=`PRCS-HR F005,F025; GH-15/SLSA-01`.

2.6.5.3 dependencies=`PRCH2-REQ-006;PRCH2-REQ-032`.

2.6.5.4 proof=`presence of GitHub attestation gives zero automatic Source/Build credit; every claimed Track/Level has complete rooted matrix and independent assessment; unproved claim remains none`.

2.6.5.5 failure=`SLSA-CLAIM-BLOCKED`.

### 2.6.6 `PRCH2-REQ-034`

2.6.6.1 requirement=`produce ScorecardUsePolicy deciding local CLI or exact pinned Action, minimal permissions, publish_results, SARIF/artifact disclosure, per-check evidence/exceptions and no aggregate-score Gate`.

2.6.6.2 sourceBasis=`PRCS-HR F026; OSSF-01/OSSF-02/GH-01`.

2.6.6.3 dependencies=`PRCH2-REQ-003;PRCH2-REQ-020;PRCH2-REQ-029`.

2.6.6.4 proof=`exact executable/workflow root, permissions and disclosure match approved profile; each Gate references named checks/thresholds; aggregate score alone changes no state`.

2.6.6.5 failure=`SCORECARD-USE-BLOCKED`.

### 2.6.7 `PRCH2-REQ-035`

2.6.7.1 requirement=`produce SignedCommitDecision selecting either no signature Gate or a complete accepted identity/signature/bot/key-revocation/vigilant-mode policy independent of review and expected-check source`.

2.6.7.2 sourceBasis=`PRCS-HR F032; GH-09/GH-21`.

2.6.7.3 dependencies=`PRCH2-REQ-010;PRCH2-REQ-014`.

2.6.7.4 proof=`selected behavior is deterministic for valid, invalid, expired/revoked, bot and Partially verified signatures; signature never bypasses review/checks`.

2.6.7.5 failure=`SIGNED-COMMIT-POLICY-BLOCKED`.

## 2.7 Vulnerability disclosure, legal and licensing

### 2.7.1 `PRCH2-REQ-036`

2.7.1.1 requirement=`produce VulnerabilityDisclosureLifecycle covering supported versions/scope, private contact/PVR, acknowledgement/triage/remediation targets, severity, embargo, duplicates, private advisory/fix, CVE decision, independent verification, publication, safe harbor and incident escalation`.

2.7.1.2 sourceBasis=`PRCS-HR F023; GH-18`.

2.7.1.3 dependencies=`PRCH2-REQ-009;PRCH2-REQ-018;PRCH2-REQ-031`.

2.7.1.4 proof=`tabletop event reaches private intake, triage, private fix, independent verification and coordinated publication under accepted targets; exploitable detail cannot enter Public issue pre-authorization`.

2.7.1.5 failure=`VULNERABILITY-DISCLOSURE-BLOCKED`.

### 2.7.2 `PRCH2-REQ-037`

2.7.2.1 requirement=`produce LegalLicenseRegistry for code, docs/content, data/assets, trademarks, LICENSE/NOTICE, third-party obligations, DCO/CLA, contribution binding, dependency/assets compatibility and AI-assisted provenance`.

2.7.2.2 sourceBasis=`PRCS-HR F024; GH-19/GH-20; legal selection remains external`.

2.7.2.3 dependencies=`PRCH2-REQ-000;PRCH2-REQ-005;PRCH2-REQ-019`.

2.7.2.4 proof=`every shipped artifact class and dependency/asset resolves to Legal-approved license and required notice; incompatible/unlicensed input blocks; contributor acceptance binds exact contribution`.

2.7.2.5 failure=`LEGAL-LICENSE-BLOCKED`.

## 2.8 AI, agent, RAG, memory and TEVV

### 2.8.1 `PRCH2-REQ-038`

2.8.1.1 requirement=`produce AISystemBillOfMaterials containing exact provider/model, prompt/policy, tool/MCP, knowledge/RAG, memory, parser, evaluator, dataset, tenant-boundary and configuration roots plus component change graph`.

2.8.1.2 sourceBasis=`PRCS-HR F029; NIST-01/02/03/05,OWASP-01/04,MITRE-03; D02/D25 decisions as future admitted inputs`.

2.8.1.3 dependencies=`PRCH2-REQ-005;PRCH2-REQ-006;PRCH2-REQ-008`.

2.8.1.4 proof=`every AI behavior resolves to exact component roots; missing/dynamic root remains inactive; any root change yields exact affected evaluation/control Set`.

2.8.1.5 failure=`AI-BOM-BLOCKED; AI side effects remain disabled`.

### 2.8.2 `PRCH2-REQ-039`

2.8.2.1 requirement=`produce AIThreatApplicabilityRegistry for every accepted AISVS chapter, OWASP LLM/Agentic item, NIST AML class and selected ATLAS technique with applicability, owner, attack path, affected component and rooted rationale`.

2.8.2.2 sourceBasis=`PRCS-HR F012; F027–F030; accepted cyber source roots required`.

2.8.2.3 dependencies=`PRCH2-REQ-007;PRCH2-REQ-038`.

2.8.2.4 proof=`forward/inverse mappings cover the complete admitted threat denominator; unreviewed, stale, duplicate and unsupported exclusions are blocking`.

2.8.2.5 failure=`AI-THREAT-APPLICABILITY-BLOCKED`.

### 2.8.3 `PRCH2-REQ-040`

2.8.3.1 requirement=`produce AIControlRegistry mapping each applicable threat to untrusted-content taint, data/instruction/tool separation, least privilege, immutable approval binding, output validation, tenant/memory isolation, RAG provenance, tool allowlists, egress/cost limits and kill switch as applicable`.

2.8.3.2 sourceBasis=`PRCS-HR F012; F029; D25 agent-approval-only Decision`.

2.8.3.3 dependencies=`PRCH2-REQ-003;PRCH2-REQ-039`.

2.8.3.4 proof=`each applicable threat has at least one exact control and residual-risk state; stale approval, argument substitution, cross-tenant context, poisoned source/tool metadata, exfiltration and resource exhaustion have no permitted side-effect path`.

2.8.3.5 failure=`AI-CONTROL-CLOSURE-BLOCKED`.

### 2.8.4 `PRCH2-REQ-041`

2.8.4.1 requirement=`produce AITEVVRegistry binding pre-release and continuous security/privacy/safety/cost evaluations, admitted evaluation-data roots, evaluator roots, thresholds, drift/incident triggers, human review, residual-risk owner and expiry to the AI BOM`.

2.8.4.2 sourceBasis=`PRCS-HR F029,F030; NIST AI and OWASP AISVS roles`.

2.8.4.3 dependencies=`PRCH2-REQ-038;PRCH2-REQ-039;PRCH2-REQ-040`.

2.8.4.4 proof=`all approved AI behavior has current exact-root evaluations; component change or threshold/incident crossing invalidates approval and disables side effects until re-evaluation`.

2.8.4.5 failure=`AI-TEVV-BLOCKED`.

## 2.9 Executable verification, Evidence and Acceptance

### 2.9.1 `PRCH2-REQ-042`

2.9.1.1 requirement=`produce CyberConformanceEnvelopeRegistry for every Requirement with subject-row digest, dependency-output roots, admitted fixture/corpus root, evaluator profile, operation, canonical expected bytes and allowed terminal`.

2.9.1.2 sourceBasis=`PRCS-HR F001–F032 acceptancePredicate fields; PRCS-REPORT sections 7.1–7.2; accepted Review Protocol required`.

2.9.1.3 dependencies=`PRCH2-REQ-005;PRCH2-REQ-006;PRCH2-REQ-007;PRCH2-REQ-008;PRCH2-REQ-009;PRCH2-REQ-010;PRCH2-REQ-011;PRCH2-REQ-012;PRCH2-REQ-013;PRCH2-REQ-014;PRCH2-REQ-015;PRCH2-REQ-016;PRCH2-REQ-017;PRCH2-REQ-018;PRCH2-REQ-019;PRCH2-REQ-020;PRCH2-REQ-021;PRCH2-REQ-022;PRCH2-REQ-023;PRCH2-REQ-024;PRCH2-REQ-025;PRCH2-REQ-026;PRCH2-REQ-027;PRCH2-REQ-028;PRCH2-REQ-029;PRCH2-REQ-030;PRCH2-REQ-031;PRCH2-REQ-032;PRCH2-REQ-033;PRCH2-REQ-034;PRCH2-REQ-035;PRCH2-REQ-036;PRCH2-REQ-037;PRCH2-REQ-038;PRCH2-REQ-039;PRCH2-REQ-040;PRCH2-REQ-041`.

2.9.1.4 proof=`two clean-room evaluators execute every envelope without prose judgment and emit byte-identical results; changing any row/root/input/operation/expected byte invalidates test identity`.

2.9.1.5 failure=`CYBER-CONFORMANCE-BLOCKED`.

### 2.9.2 `PRCH2-REQ-043`

2.9.2.1 requirement=`produce CyberNegativeVectorRegistry with at least one separately traceable hostile vector for each Requirement and each PRCS-HR-F001..F032, exact target locator, preimage, canonical mutation operation, postimage, affected Set and expected terminal`.

2.9.2.2 sourceBasis=`PRCS-FINDINGS F001–F032; noMergeKey=findingId`.

2.9.2.3 dependencies=`PRCH2-REQ-042`.

2.9.2.4 proof=`coverage is one-to-one with no ranges, Merge or presence-only credit; two runners reproduce every preimage/postimage/affected Set/terminal; missing admitted corpus bytes remain blocking rather than invented`.

2.9.2.5 failure=`CYBER-NEGATIVE-COVERAGE-BLOCKED`.

### 2.9.3 `PRCH2-REQ-044`

2.9.3.1 requirement=`produce CyberObservationReadbackRegistry defining independent local, GitHub API, provider API and consumer-verification Evidence schemas with subject/config/environment/actor/time roots and disclosure boundary`.

2.9.3.2 sourceBasis=`PRCS-REPORT sections 7.1.4–7.1.6 and 7.2; PRCS-HR F001–F032 acceptancePredicate fields`.

2.9.3.3 dependencies=`PRCH2-REQ-003;PRCH2-REQ-042;PRCH2-REQ-043`.

2.9.3.4 proof=`configured checkbox or positive run gives no operating credit without bound negative Evidence/readback; every receipt has exact producer, authority, endpoint/response root, environment, asset and freshness`.

2.9.3.5 failure=`CYBER-OPERATIONAL-EVIDENCE-BLOCKED`.

### 2.9.4 `PRCH2-REQ-045`

2.9.4.1 requirement=`produce CyberGenerationPair freezing exact Generation-A and Generation-B subjects/inputs, one canonical Delta, expected affected/unaffected Sets, outputs and stale-A rejection`.

2.9.4.2 sourceBasis=`PRCS-HR F030; research-to-proof state machine; accepted Protocol two-generation rule`.

2.9.4.3 dependencies=`PRCH2-REQ-008;PRCH2-REQ-042;PRCH2-REQ-043;PRCH2-REQ-044`.

2.9.4.4 proof=`two independent envelopes reproduce A/B roots and exact impact Sets; A receipt submitted to B is stale-blocked; changed Delta or root invalidates pair`.

2.9.4.5 failure=`CYBER-GENERATION-BLOCKED`.

### 2.9.5 `PRCH2-REQ-046`

2.9.5.1 requirement=`produce PRCSFindingClosureRegistry with exactly 32 detached records, one per PRCS-HR-F001..F032, preserving reviewer severity/identity and binding exact successor clauses, negative vectors, Evidence and independent disposition`.

2.9.5.2 sourceBasis=`PRCS-FINDINGS F001–F032 and all 32 noMergeKeys`.

2.9.5.3 dependencies=`PRCH2-REQ-043;PRCH2-REQ-044;PRCH2-REQ-045`.

2.9.5.4 proof=`forward/inverse orphans, Merge, suppression, range credit, presence-only credit and unrooted closure equal zero; every reviewer predicate is reproduced and independently evaluated`.

2.9.5.5 failure=`PRCS-FINDING-CLOSURE-BLOCKED`.

### 2.9.6 `PRCH2-REQ-047`

2.9.6.1 requirement=`produce CyberReviewReconciliationEnvelope under the accepted Review Protocol, with exact reviewer eligibility, independence/non-collusion, frozen inputs, findings, allowed dispositions, objections, veto, appeals, expiry and revocation`.

2.9.6.2 sourceBasis=`PRCS-REPORT sections 8.7 and 9; accepted Review Protocol required by PRCH2-REQ-000`.

2.9.6.3 dependencies=`PRCH2-REQ-000;PRCH2-REQ-046`.

2.9.6.4 proof=`two state-machine evaluators agree for valid, conflicting, vetoed, appealed, expired, revoked, duplicate, reordered and concurrent events; author/self-review cannot admit the subject`.

2.9.6.5 failure=`CYBER-REVIEW-BLOCKED`.

### 2.9.7 `PRCH2-REQ-048`

2.9.7.1 requirement=`produce CyberAcceptanceEnvelope binding exact Subject, all dependency heads, Public invariant, closure registry, review/reconciliation root, generation evidence, residual risks, scope, epoch, expiry and invalidation triggers`.

2.9.7.2 sourceBasis=`PRCS-REPORT sections 7.1.7 and 8.7; D18-A2 Public invariant`.

2.9.7.3 dependencies=`PRCH2-REQ-002;PRCH2-REQ-045;PRCH2-REQ-046;PRCH2-REQ-047`.

2.9.7.4 proof=`atomic CAS re-reads every exact dependency head and consumes one eligible authority Permit; stale/missing/changed roots deny; one accepted current pointer wins and two independent readbacks agree`.

2.9.7.5 failure=`CYBER-ACCEPTANCE-BLOCKED`.

### 2.9.8 `PRCH2-REQ-049`

2.9.8.1 requirement=`produce PublicPushHardeningGate that may authorize only the exact next diff/ref after CyberAcceptance and requires no open P0/P1 for that bounded scope, Public readback, pre-egress pass, workflow trust pass and rollback/incident readiness`.

2.9.8.2 sourceBasis=`PRCS-REPORT verdict section 2.1 and ordered successor plan section 8; D18-A2`.

2.9.8.3 dependencies=`PRCH2-REQ-018;PRCH2-REQ-027;PRCH2-REQ-031;PRCH2-REQ-048`.

2.9.8.4 proof=`Permit is one-use, diff/ref/head/environment-bound and expiry-fenced; any stale dependency, unknown egress, open P0/P1, Private readback or unapproved workflow path denies`.

2.9.8.5 failure=`PUBLIC-PUSH-BLOCKED`.

### 2.9.9 `PRCH2-REQ-050`

2.9.9.1 requirement=`produce PrivilegedWorkflowReleaseGate separately from Push, binding exact trusted producer, artifact digest, attestation consumer policy, OIDC/environment contract, release identity and distribution readbacks`.

2.9.9.2 sourceBasis=`PRCS-HR F001,F003–F005,F019,F025,F031; PRCS-REPORT section 2.2`.

2.9.9.3 dependencies=`PRCH2-REQ-019;PRCH2-REQ-025;PRCH2-REQ-026;PRCH2-REQ-032;PRCH2-REQ-033;PRCH2-REQ-048`.

2.9.9.4 proof=`a Push PASS cannot satisfy this Gate; wrong artifact/signer/workflow/ref/environment/role/distribution state denies; consumer verification and two readbacks bind exact release`.

2.9.9.5 failure=`PRIVILEGED-RELEASE-BLOCKED`.

### 2.9.10 `PRCH2-REQ-051`

2.9.10.1 requirement=`assert bounded successor acceptance only when Requirements 000–050, 32/32 Finding closures, all required negative vectors, two-generation evidence, independent reconciliation and both Public readbacks are accepted simultaneously`.

2.9.10.2 sourceBasis=`PRCS-HR F001–F032; D18-A2 Public invariant; accepted B0/Protocol/Source Universe/Control Sequence required`.

2.9.10.3 dependencies=`PRCH2-REQ-048;PRCH2-REQ-049;PRCH2-REQ-050`.

2.9.10.4 proof=`open P0=0 and open P1=0 for the exact next-Push/privileged-workflow/release scope; Accepted pointer is detached, immutable, non-self-issued, current and disclosure-safe`.

2.9.10.5 failure=`PUBLIC-CYBER-SUCCESSOR-NOT-ACCEPTED; Gate29 remains BLOCKED`.

# 3. Reviewer-Finding preservation crosswalk

## 3.1 Exact one-to-one mapping

3.1.1 `PRCS-HR-F001 -> PRCH2-REQ-014,019,031,032,049,050`.

3.1.2 `PRCS-HR-F002 -> PRCH2-REQ-020,021,022,027,043`.

3.1.3 `PRCS-HR-F003 -> PRCH2-REQ-023,024,025,032,050`.

3.1.4 `PRCS-HR-F004 -> PRCH2-REQ-025,026,044,050`.

3.1.5 `PRCS-HR-F005 -> PRCH2-REQ-003,023,032,033,050`.

3.1.6 `PRCS-HR-F006 -> PRCH2-REQ-015,017,018,019,043`.

3.1.7 `PRCS-HR-F007 -> PRCH2-REQ-029,030,043`.

3.1.8 `PRCS-HR-F008 -> PRCH2-REQ-009,010,011,044`.

3.1.9 `PRCS-HR-F009 -> PRCH2-REQ-005,006,042`.

3.1.10 `PRCS-HR-F010 -> PRCH2-REQ-006,008,044`.

3.1.11 `PRCS-HR-F011 -> PRCH2-REQ-007,008,039`.

3.1.12 `PRCS-HR-F012 -> PRCH2-REQ-038,039,040,041,043`.

3.1.13 `PRCS-HR-F013 -> PRCH2-REQ-013,014,043`.

3.1.14 `PRCS-HR-F014 -> PRCH2-REQ-012,014,043`.

3.1.15 `PRCS-HR-F015 -> PRCH2-REQ-011,014,018,043`.

3.1.16 `PRCS-HR-F016 -> PRCH2-REQ-021,027,043`.

3.1.17 `PRCS-HR-F017 -> PRCH2-REQ-023,024,043`.

3.1.18 `PRCS-HR-F018 -> PRCH2-REQ-028,029,030,043`.

3.1.19 `PRCS-HR-F019 -> PRCH2-REQ-025,026,043`.

3.1.20 `PRCS-HR-F020 -> PRCH2-REQ-015,018,019,031,043`.

3.1.21 `PRCS-HR-F021 -> PRCH2-REQ-003,015,016,017,043`.

3.1.22 `PRCS-HR-F022 -> PRCH2-REQ-016,017,018,043`.

3.1.23 `PRCS-HR-F023 -> PRCH2-REQ-036,043`.

3.1.24 `PRCS-HR-F024 -> PRCH2-REQ-037,043`.

3.1.25 `PRCS-HR-F025 -> PRCH2-REQ-032,033,043`.

3.1.26 `PRCS-HR-F026 -> PRCH2-REQ-003,029,034,043`.

3.1.27 `PRCS-HR-F027 -> PRCH2-REQ-007,008,039,043`.

3.1.28 `PRCS-HR-F028 -> PRCH2-REQ-007,008,043`.

3.1.29 `PRCS-HR-F029 -> PRCH2-REQ-038,039,040,041,043`.

3.1.30 `PRCS-HR-F030 -> PRCH2-REQ-008,038,041,045`.

3.1.31 `PRCS-HR-F031 -> PRCH2-REQ-023,028,029,043`.

3.1.32 `PRCS-HR-F032 -> PRCH2-REQ-014,035,043`.

## 3.2 Crosswalk claim limit

3.2.1 the crosswalk proves identity preservation only; it closes no Finding.

3.2.2 closure requires the detached `PRCH2-REQ-046` record, executable negative vector, operational Evidence and independent reviewer disposition.

# 4. Current disposition

4.1 Requirements=`52 candidates; PRCH2-REQ-000..051`.

4.2 reviewer-local Findings represented=`32/32`.

4.3 independently accepted Requirements=`0/52`.

4.4 independently closed Findings=`0/32`.

4.5 live GitHub/provider readback and configuration credit=`0`.

4.6 Public visibility=`binding and unchanged`.

4.7 `Gate29=BLOCKED`; development freeze remains active.
