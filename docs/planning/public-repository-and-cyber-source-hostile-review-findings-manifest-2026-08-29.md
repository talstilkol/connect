# 1. Connect — Public-repository and cyber-source hostile-review findings manifest

## 1.1 Review identity

1.1.1 `artifactId=CONNECT-PUBLIC-REPOSITORY-AND-CYBER-SOURCE-HOSTILE-REVIEW-FINDINGS-MANIFEST-2026-08-29`.

1.1.2 `reviewId=PRCS-HR-2026-08-29`.

1.1.3 `reviewMode=INDEPENDENT-HOSTILE-PLANNING-REVIEW`.

1.1.4 subject A path=`web/docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md`.

1.1.5 subject A root=`sha256:448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`.

1.1.6 subject B path=`web/docs/planning/cyber-ai-and-supply-chain-source-refresh-supplement-2026-08-29.md`.

1.1.7 subject B root=`sha256:fa47fceef7df91fb9e46f1d09f451a3d1344cfdcbbe7ea100b6b85e4a4471250`.

1.1.8 repository-visibility invariant=`PUBLIC; no finding may be remediated by changing Connect to Private`.

1.1.9 boundary=`planning artifacts only; no Product code, Git mutation, Push, Release, Deployment, provider/account setting, credential, purchase or external mutation`.

1.1.10 manifest status=`RAW REVIEWER-LOCAL FINDINGS; NOT RECONCILED; NOT ACCEPTED; ALL OPEN`.

## 1.2 Finding schema

1.2.1 every finding has one unique ID, reviewer-local severity, exact Subject locator, defect, impact, required delta, deterministic acceptance predicate and official-source IDs.

1.2.2 severities mean: `P0=the successor cannot authorize the next Public Push/privileged workflow/release`; `P1=material security or assurance gap before Pilot/Production`; `P2=important hardening or claim-precision defect`.

1.2.3 a recommendation is not Evidence, a configured control is not proof that it operated, and a successful positive run does not satisfy a negative predicate.

# 2. Findings

## 2.1 `PRCS-HR-F001`

2.1.1 severity=`P0`.

2.1.2 exactSubjectLocator=`subject A 4.1.1; 5.1–5.2`.

2.1.3 defect=`one Ruleset cannot simultaneously be the required branch Ruleset and a tag/release control; the plan targets main and release branches but never defines a separate tag Ruleset, immutable-release policy, tag creation/update/deletion authority, release-asset identity or package publication boundary`.

2.1.4 impact=`a reviewed commit can be distributed under a movable/recreated tag, mutable asset or independently visible package, so protected main does not prove release identity or permanence`.

2.1.5 requiredDelta=`define separate active branch and tag Rulesets; deny tag move/delete except a two-person safe-expunging path; bind release tag, commit, assets, package coordinates and digests; decide immutable releases and consumer verification; retain Public visibility`.

2.1.6 acceptancePredicate=`API readback returns the exact active branch Ruleset and exact active tag Ruleset; attempts to move/delete a protected release tag and replace an immutable asset fail; a consumer verifies every release/package digest against a rooted release attestation`.

2.1.7 officialSourceIds=`GH-09; GH-14; GH-15; GH-16; GH-17; SLSA-01`.

## 2.2 `PRCS-HR-F002`

2.2.1 severity=`P0`.

2.2.2 exactSubjectLocator=`subject A 4.2.3–4.2.5; 5.2–5.3`.

2.2.3 defect=`the plan has no closed event/actor/ref trust matrix for pull_request, pull_request_target, workflow_run, issue_comment, workflow_dispatch, schedule, push and merge_group; “never expose Secrets” does not specify which events may execute untrusted bytes or who may authorize them`.

2.2.4 impact=`a future workflow can legally satisfy the prose while checking out or consuming attacker-controlled code/artifacts in a privileged context, or allow a previously accepted external contributor to trigger costly or sensitive jobs`.

2.2.5 requiredDelta=`publish a versioned per-workflow trust matrix covering event, actor class, source ref, checked-out ref, artifact/cache trust, token scopes, Secrets, environment, network and permitted side effects; default every unlisted combination to DENY; treat workflow-execution protections as defense in depth while the feature is preview`.

2.2.6 acceptancePredicate=`a generated matrix enumerates every workflow/event pair; hostile fork, edited-workflow, pull_request_target, workflow_run-artifact, issue_comment and unauthorized workflow_dispatch cases are denied before privileged execution; an unknown event/actor/ref combination fails closed`.

2.2.7 officialSourceIds=`GH-01; GH-02; GH-03; GH-04; GH-05; GH-10`.

## 2.3 `PRCS-HR-F003`

2.3.1 severity=`P0`.

2.3.2 exactSubjectLocator=`subject A 4.2.3–4.2.4; 5.1–5.2`.

2.3.3 defect=`the plan does not require privilege separation between untrusted build/install/test steps and jobs holding id-token:write, attestations:write, artifact-metadata:write, deployment credentials or release permissions`.

2.3.4 impact=`a compromised dependency install, malicious pull request or poisoned artifact can mint a valid-looking attestation, request an OIDC token or alter release metadata; signing attacker output would strengthen the attacker’s claim rather than protect the build`.

2.3.5 requiredDelta=`split untrusted validation from privileged attestation/deployment; pass only digest-bound, policy-validated artifacts across an explicit trust boundary; prohibit dependency installation or untrusted checkout in the privileged signer job; grant write scopes only after event/ref/actor/environment predicates pass`.

2.3.6 acceptancePredicate=`the privilege graph proves no path from untrusted bytes to a write token/OIDC request except through a verified digest contract; a poisoned dependency/artifact cannot produce an accepted attestation or cloud token; every privileged job has a minimal explicit permission set`.

2.3.7 officialSourceIds=`GH-01; GH-05; GH-06; GH-07; GH-15; SLSA-01`.

## 2.4 `PRCS-HR-F004`

2.4.1 severity=`P0`.

2.4.2 exactSubjectLocator=`subject A 4.2.3–4.2.4; 5.1–5.3`.

2.4.3 defect=`OIDC is not modeled: there is no issuer, audience, subject/claim template, immutable repository identity, workflow identity, environment/ref binding, provider-role scope, session TTL, replay defense, revocation or negative trust policy`.

2.4.4 impact=`id-token:write can authenticate an unintended workflow, branch, environment or renamed/transferred repository to Railway, Vercel, Cloudflare or another provider`.

2.4.5 requiredDelta=`create a provider-neutral OIDC trust contract and one provider-specific policy per role; require audience plus narrowly matched sub/custom claims, stable repository/owner IDs where supported, job_workflow_ref, environment and protected ref; separate staging/production roles; eliminate long-lived deployment credentials where supported`.

2.4.6 acceptancePredicate=`provider readback exactly matches the approved issuer/audience/claim/role/TTL roots; tokens from fork, wrong ref, wrong environment, wrong workflow, wrong repository ID, replay and expired sessions are denied; only the approved protected workflow obtains the scoped short-lived role`.

2.4.7 officialSourceIds=`GH-06; GH-07; GH-21; GH-22`.

## 2.5 `PRCS-HR-F005`

2.5.1 severity=`P0`.

2.5.2 exactSubjectLocator=`subject A 4.2.4; 5.1; subject B 2.1.1–2.1.5; 3.4.1; 4.2; 4.6`.

2.5.3 defect=`“artifact attestations where used” defines neither producer identity nor consumer policy, expected provenance, subject digest set, verification time, signer/repository/workflow constraints, failure behavior or public-transparency disclosure; it also mixes SLSA 1.2 planning with GitHub’s documented SLSA v1.0 attestation claims`.

2.5.4 impact=`an attestation can exist and still provide zero accepted security benefit, disclose metadata publicly, cover the wrong artifact or be accepted from the wrong workflow; SLSA Track/Level may be overstated`.

2.5.5 requiredDelta=`define attestation production only for release-consumed artifacts, exact predicate types and subject digests; define a separate verifier/consumer policy with trusted signer/repository/workflow/environment and failure=DENY; classify public Sigstore entries before generation; record SLSA version, Track and Level independently`.

2.5.6 acceptancePredicate=`verification succeeds only for the approved artifact digest and exact signer/workflow policy; wrong subject, wrong signer, wrong repository, wrong workflow, missing transparency material and altered bundle fail; no public attestation contains prohibited metadata; no SLSA claim exceeds independently verified requirements`.

2.5.7 officialSourceIds=`GH-15; SLSA-01`.

## 2.6 `PRCS-HR-F006`

2.6.1 severity=`P0`.

2.6.2 exactSubjectLocator=`subject A 3.1–3.2; 4.3.5; 4.4.1–4.4.4; 5.5`.

2.6.3 defect=`the secret incident plan stops at revoke/rotate and generic disclosure analysis; it omits PR refs, cached GitHub views, forks/clones, caches, workflow logs/artifacts, releases, packages, SBOMs, attestations/transparency logs, Git LFS remote objects, provider logs and recontamination after history rewrite`.

2.6.4 impact=`a rotated credential may be safe operationally while PII, private keys, customer data or internal evidence remain publicly retrievable; an unsafe history rewrite can also break consumers, signatures and collaborators while old commits survive elsewhere`.

2.6.5 requiredDelta=`define an incident inventory and containment state machine: revoke first; classify data; enumerate every public surface; preserve private legal evidence; coordinate clones/forks; use GitHub Support for cached PR refs/LFS when eligible; purge logs/artifacts/releases/packages where possible; prevent recontamination; require two-person safe expunging for legal/privacy cases`.

2.6.6 acceptancePredicate=`a seeded spill in every listed surface produces a complete incident inventory, confirmed revocation, surface-specific purge/limitation receipt and fork/clone coordination record; post-remediation searches find zero reachable prohibited bytes under the accepted scope, and any irreducible copy remains an explicit blocking residual risk`.

2.6.7 officialSourceIds=`GH-01; GH-11; GH-12; GH-13; GH-16; GH-17; SLSA-01`.

## 2.7 `PRCS-HR-F007`

2.7.1 severity=`P0`.

2.7.2 exactSubjectLocator=`subject A 3.3; 4.2.4; 5.1–5.2`.

2.7.3 defect=`dependency review, a lockfile and vulnerability alerts do not address dependency confusion, namespace takeover, typosquatting, malicious current versions, install scripts, registry substitution or compromised maintainer releases; registry/scope and publish controls are absent`.

2.7.4 impact=`npm ci can reproducibly install attacker-controlled bytes from an unintended registry or a malicious package with no known CVE, including inside a job that can attest output`.

2.7.5 requiredDelta=`bind every scope to an approved HTTPS registry, reserve internal namespaces, root the registry configuration and lockfile origin, set private:true for non-publishable workspaces, define publishConfig for publishable packages, audit lifecycle scripts/native binaries, quarantine new/changed packages, verify package provenance where available and maintain an allow/deny decision record`.

2.7.6 acceptancePredicate=`wrong-registry, same-name-public-package, scope-remap, lockfile-registry substitution, typosquat, lifecycle-script and provenance-mismatch fixtures are rejected before install/release; npm ci uses the rooted lock and approved registry set; accidental npm publish is denied`.

2.7.7 officialSourceIds=`NPM-01; NPM-02; GH-01; GH-15; SLSA-01`.

## 2.8 `PRCS-HR-F008`

2.8.1 severity=`P0`.

2.8.2 exactSubjectLocator=`subject A 2.1; 2.5; 4.1.2–4.1.6; 5.1`.

2.8.3 defect=`the canonical Public repository is personal-account-owned but the plan omits ownership continuity, organization enforcement, mandatory secure 2FA, team roles, least-privilege outside collaborators, audit-log retention, GitHub App versus PAT/deploy-key policy and break-glass recovery`.

2.8.4 impact=`one account or long-lived credential can become a governance and availability single point of failure, bypass protected workflows or leave insufficient audit evidence`.

2.8.5 requiredDelta=`plan transfer to a company GitHub Organization while keeping the repository Public; define two named owners, secure 2FA, recovery custody, team-based least privilege, periodic access review, GitHub App/short-lived token preference, deploy-key/PAT restrictions and audited break-glass with expiry`.

2.8.6 acceptancePredicate=`repository readback remains Public and organization-owned; two recoverable owners exist; every privileged identity has approved role and secure 2FA; no unexplained admin, classic PAT or write deploy key remains; break-glass drill succeeds and all access changes appear in retained audit evidence`.

2.8.7 officialSourceIds=`GH-21; GH-22`.

## 2.9 `PRCS-HR-F009`

2.9.1 severity=`P0`.

2.9.2 exactSubjectLocator=`subject B 2.1–2.8; 3.1.1–3.4.3; 5.1`.

2.9.3 defect=`the stated denominator is eight source groups, but the selected-role map introduces at least six additional uncaptured source families: NIST CSF 2.0, NIST SSDF 1.1/1.2 monitor, OWASP ASVS 5.0.0, OWASP API Security Top 10 2023, CIS Controls 8.1 and OWASP AISVS 1.0`.

2.9.4 impact=`0/8 reviewed and accepted cannot describe the actual selected framework universe; requirements can cite sources that never passed capture, authority, version or claim-limit review`.

2.9.5 requiredDelta=`create one closed SourceRecord denominator covering every source named anywhere in the supplement; split final and draft sources; give each exact version, role, authority, root, locator, license, freshness, change monitor and acceptance state`.

2.9.6 acceptancePredicate=`a parser resolves every framework/version token in sections 2–4 to exactly one rooted SourceRecord and inverse readback returns every use; dangling, duplicate, uncaptured and denominator-mismatch counts are zero`.

2.9.7 officialSourceIds=`NIST-06; NIST-07; OWASP-01; OWASP-05; OWASP-06; CIS-01`.

## 2.10 `PRCS-HR-F010`

2.10.1 severity=`P0`.

2.10.2 exactSubjectLocator=`subject B 1.1.3; 2.1–2.8; 4.1; 4.4–4.5; 5.3–5.4`.

2.10.3 defect=`the supplement records mutable URLs and prose observations but no captured source bytes, content digests, release asset identities, retrieval receipts, redirect chain, media locator or trusted observation time`.

2.10.4 impact=`a later reader cannot reproduce which official bytes supported any claim; mutable pages can change silently and local date text cannot prove when the observation occurred`.

2.10.5 requiredDelta=`capture exact authoritative bytes or immutable release assets in approved custody; record raw SHA-256, canonical URL, final URL, media type, retrieval receipt, trusted time or typed absence, locator and license; never replace an old root in place`.

2.10.6 acceptancePredicate=`two independent fetch/readback procedures resolve every admitted SourceRecord to identical raw bytes and claim locators; a mutable-page change creates a new root and invalidates affected mappings; unavailable trusted time remains blocking where freshness is required`.

2.10.7 officialSourceIds=`ALL-OFFICIAL-SOURCES-IN-SECTION-4`.

## 2.11 `PRCS-HR-F011`

2.11.1 severity=`P0`.

2.11.2 exactSubjectLocator=`subject B 2.2.1–2.2.4; 2.8.1–2.8.4; 5.3`.

2.11.3 defect=`current source identity is inaccurate or under-specified: SAMM’s model family is called 2.0 while the official core release is v2.2.0; ATT&CK v19.2 is asserted as dated April 28 although MITRE’s August release page identifies v19.2 on August 6; ATLAS is left as a living future snapshot although official v2026.07 is available`.

2.11.4 impact=`delta monitoring and threat mappings can bind the wrong release date/content, omit current CI/CD and AI-agent supply-chain techniques or confuse a model major version with the exact content release`.

2.11.5 requiredDelta=`separate framework-family version from exact content release; root SAMM v2.2.0 assets/commit, ATT&CK v19.2 data and August 6 release identity, and ATLAS v2026.07 release asset plus content/format metadata; document the contradictory ATT&CK version-history display as an official-source conflict`.

2.11.6 acceptancePredicate=`each record resolves to immutable release bytes and a digest; ATT&CK’s observed page conflict is preserved rather than silently chosen; current ATLAS techniques including AI Agent Tool Poisoning and AI supply-chain additions enter the delta set`.

2.11.7 officialSourceIds=`SAMM-01; SAMM-02; MITRE-01; MITRE-02; MITRE-03; MITRE-04`.

## 2.12 `PRCS-HR-F012`

2.12.1 severity=`P0`.

2.12.2 exactSubjectLocator=`subject B 2.6.1–2.8.4; 3.3.1–3.3.4; 4.2; 4.7`.

2.12.3 defect=`AI/agent sources are assigned awareness or taxonomy roles but no complete threat-to-control-to-negative-test mapping is required; “human approval only” does not control indirect prompt injection, agent goal hijack, tool misuse, identity abuse, poisoned RAG/memory/MCP/tool metadata, output-to-code execution, exfiltration, resource abuse or deceptive approval context`.

2.12.4 impact=`an AI feature can remain formally human-approved while an attacker controls the information shown to the approver, the tool arguments, memory or downstream parser and thereby causes disclosure, unauthorized action or cost/availability harm`.

2.12.5 requiredDelta=`derive an applicability record for every AISVS chapter, OWASP LLM/Agentic item, NIST AML class and selected ATLAS technique; require untrusted-content taint, data/tool separation, least privilege, immutable approval binding, output validation, memory/tenant isolation, RAG provenance, MCP/tool allowlists, egress/cost limits, kill switch and adversarial tests`.

2.12.6 acceptancePredicate=`every applicable threat has an owner, control, positive test, negative test, evidence locator and residual-risk state; prompt injection, poisoned knowledge/tool metadata, stale approval, argument substitution, cross-tenant memory, exfiltration and resource-exhaustion fixtures fail without side effects`.

2.12.7 officialSourceIds=`NIST-01; NIST-02; NIST-03; NIST-04; NIST-05; OWASP-01; OWASP-02; OWASP-03; OWASP-04; MITRE-03`.

## 2.13 `PRCS-HR-F013`

2.13.1 severity=`P1`.

2.13.2 exactSubjectLocator=`subject A 4.1.5; 5.1–5.2`.

2.13.3 defect=`required checks are named only as “exact current CI checks”; expected status-check source, check-name collision defense and merge-queue merge_group execution are absent`.

2.13.4 impact=`another actor/integration with write permission can report a same-name status, or the merge queue can deadlock/merge without the intended head validation`.

2.13.5 requiredDelta=`root required check names and expected GitHub App sources; include merge_group:checks_requested in every merge-queue-required workflow; bind checks to the tested merge-group/head SHA and invalidate stale results`.

2.13.6 acceptancePredicate=`same-name status from a non-approved source cannot satisfy the Ruleset; merge_group runs every required check against the queued SHA; missing, stale or wrong-SHA checks deny merge`.

2.13.7 officialSourceIds=`GH-09; GH-10`.

## 2.14 `PRCS-HR-F014`

2.14.1 severity=`P1`.

2.14.2 exactSubjectLocator=`subject A 4.1.3; 4.1.6; 5.1`.

2.14.3 defect=`CODEOWNERS semantics are overstated: listing Primary and Backup requests both but one owner’s approval satisfies GitHub’s code-owner requirement; no protection for CODEOWNERS itself, syntax/API validation, owner write access, base-branch identity or catch-all coverage is required`.

2.14.4 impact=`one reviewer can approve a sensitive change despite the stated two-review policy, while an invalid or later overriding pattern can silently leave paths unowned`.

2.14.5 requiredDelta=`place and protect .github/CODEOWNERS; add a catch-all and explicit sensitive paths; validate syntax, precedence, case and owners; enforce the second approval separately through Ruleset/team policy; forbid author/self-review and protect the ownership file/directory`.

2.14.6 acceptancePredicate=`API reports zero CODEOWNERS errors and every tracked path resolves to approved ownership; one code-owner approval cannot satisfy a two-person sensitive-path rule; changes to .github/CODEOWNERS/workflows require the independent protected owner set`.

2.14.7 officialSourceIds=`GH-08; GH-09`.

## 2.15 `PRCS-HR-F015`

2.15.1 severity=`P1`.

2.15.2 exactSubjectLocator=`subject A 4.1.2; 4.3.1; 5.2; 5.5`.

2.15.3 defect=`bypass is not one control: branch/tag Ruleset bypass, push-protection bypass/exemption, environment review, Actions approval and emergency release each have different actors and logs; named break-glass expiry alone leaves self-approval and broad admin bypass undefined`.

2.15.4 impact=`a maintainer can bypass a secret block or governance gate under a generic role without independent approval, or a dormant exemption can remain permanently effective`.

2.15.5 requiredDelta=`create separate deny-by-default bypass registries; prefer PR-only Ruleset bypass; use delegated push-protection review with no general exemption; prohibit self-review; require reason, ticket, second approver, expiry, post-event readback and periodic zero-use review`.

2.15.6 acceptancePredicate=`every bypass surface returns the exact approved identity set and expiry; self-bypass and unlisted admin attempts fail; expired access is automatically ineffective; a drill yields complete immutable audit evidence and revocation readback`.

2.15.7 officialSourceIds=`GH-07; GH-09; GH-11; GH-21`.

## 2.16 `PRCS-HR-F016`

2.16.1 severity=`P1`.

2.16.2 exactSubjectLocator=`subject A 4.2.3; 5.2`.

2.16.3 defect=`the plan does not select “require approval for all external contributors” for Public fork workflows; GitHub documents that first-time-only trust can be gained by merging one innocuous contribution, and pull_request_target bypasses these approval settings`.

2.16.4 impact=`a low-risk prior merge can become authorization to execute a later malicious workflow or consume CI resources without fresh maintainer review`.

2.16.5 requiredDelta=`require approval for all external contributors; require approver inspection of the exact workflow diff and head SHA; prohibit privileged pull_request_target use; invalidate approval after workflow/head change; add cost/concurrency caps`.

2.16.6 acceptancePredicate=`a previously merged external contributor still requires approval; changing the head SHA/workflow invalidates approval; pull_request_target cannot execute untrusted checkout; rejected runs consume no privileged token or environment Secret`.

2.16.7 officialSourceIds=`GH-01; GH-02; GH-03`.

## 2.17 `PRCS-HR-F017`

2.17.1 severity=`P1`.

2.17.2 exactSubjectLocator=`subject A 4.2.3–4.2.4; 5.1–5.2`.

2.17.3 defect=`cache and artifact trust are not specified; low-trust triggers can poison a cache restored by privileged workflows, and workflow_run artifacts are untrusted inputs unless independently bound and validated`.

2.17.4 impact=`attacker bytes can cross a nominal workflow/job boundary and execute or be signed in a later trusted job`.

2.17.5 requiredDelta=`separate cache namespaces by trust domain; prevent low-trust cache writes consumed by privileged jobs; do not restore untrusted caches in signer/deploy jobs; bind artifacts to producer workflow/run/head/digest/schema and scan before use; define retention and deletion`.

2.17.6 acceptancePredicate=`a fork/issue-triggered poisoned cache or artifact is never restored by a privileged job; digest, producer, head or schema mismatch denies consumption; artifact retention and purge readback match the approved policy`.

2.17.7 officialSourceIds=`GH-01; GH-05; GH-15`.

## 2.18 `PRCS-HR-F018`

2.18.1 severity=`P1`.

2.18.2 exactSubjectLocator=`subject A 4.2.1–4.2.4; 5.2`.

2.18.3 defect=`full-SHA enforcement covers GitHub action references but not reusable workflows, local composite actions, container-action base images, Docker images, npm/browser/system downloads or transitive executable dependencies; “GitHub-owned” is treated as an allow signal without per-component review`.

2.18.4 impact=`a mutable or compromised executable outside uses:@SHA can alter CI results, steal tokens or forge evidence while the stated pinning gate passes`.

2.18.5 requiredDelta=`create a complete executable-dependency inventory; pin actions/reusable workflows to verified repository SHAs, images to digests and package/tool downloads to rooted versions/checksums; review ownership and source; define update cadence and emergency revocation; scan local actions and workflow dependencies`.

2.18.6 acceptancePredicate=`the inventory has zero mutable executable references and zero unresolved transitive executables under policy scope; a moved tag/image, wrong fork SHA or checksum mismatch fails before execution; each allowlisted component has an unexpired review record`.

2.18.7 officialSourceIds=`GH-01; GH-15; SLSA-01`.

## 2.19 `PRCS-HR-F019`

2.19.1 severity=`P1`.

2.19.2 exactSubjectLocator=`subject A 4.2.3–4.2.5; 5.1–5.3`.

2.19.3 defect=`environment and manual-dispatch safety are implicit; no required reviewers, prevent-self-review, protected branch/tag restriction, exact dispatch ref, actor role, input schema, concurrency fence or staging/production separation is mandated`.

2.19.4 impact=`an authorized collaborator may dispatch a sensitive workflow from an unreviewed ref, approve their own environment access or race two side-effecting executions`.

2.19.5 requiredDelta=`define environment protection per stage; require independent reviewers and prevent self-review; restrict deployment branches/tags; validate dispatch actor/ref/input; bind concurrency to environment/resource; separate read-only proof from deployment; use workflow-execution protection only as supplemental preview control`.

2.19.6 acceptancePredicate=`wrong actor/ref/input, self-review and concurrent duplicate dispatch are denied; environment Secrets are unavailable before independent approval; the run receipt binds actor, workflow root, ref SHA, environment and resource fence`.

2.19.7 officialSourceIds=`GH-03; GH-06; GH-07`.

## 2.20 `PRCS-HR-F020`

2.20.1 severity=`P1`.

2.20.2 exactSubjectLocator=`subject A 3.1–3.2; 4.4.1–4.4.4; 5.5`.

2.20.3 defect=`the permanence model names releases and package caches but no inventory/control exists for GitHub Releases, Packages, Container Registry visibility, anonymous pulls, fork access to private packages, package deletion limits, restore windows or residual Git LFS objects`.

2.20.4 impact=`sensitive or vulnerable content can remain publicly distributable after source cleanup; a Public package cannot be made private again, popular packages may require Support to delete, and LFS objects survive history changes`.

2.20.5 requiredDelta=`declare whether each release/package registry is used; define independent visibility/access, namespace, publish identity, retention/yank/delete and incident policy; prohibit Public-repo access to private packages unless fork exposure is accepted; include LFS remote-object and Support procedures`.

2.20.6 acceptancePredicate=`an API inventory accounts for every release, asset, package/version and LFS pointer/object; no prohibited bytes or unintended fork/private-package access exist; visibility and deletion limitations are explicitly accepted before first publication`.

2.20.7 officialSourceIds=`GH-13; GH-14; GH-16; GH-17`.

## 2.21 `PRCS-HR-F021`

2.21.1 severity=`P1`.

2.21.2 exactSubjectLocator=`subject A 3.1–3.2; 4.4.1–4.4.4`.

2.21.3 defect=`forbidden Public content is file-centric and omits commit author/email metadata, branch/tag/release names, issue/discussion/PR text and attachments, review comments, workflow annotations/logs/artifacts/caches, package metadata, SBOM paths, attestation subjects/transparency entries and social previews`.

2.21.4 impact=`Secrets, PII, internal identifiers or exploitable detail can be published without appearing in a tracked source file`.

2.21.5 requiredDelta=`define the full Public Egress Surface and pre-publication content classifier; apply minimization/redaction and source-specific scanners to metadata, collaboration, CI, release/package and attestation channels; keep private operational Evidence outside the Public repository and Public GitHub surfaces`.

2.21.6 acceptancePredicate=`a rooted prohibited-content corpus planted in every listed channel is blocked before publication and produces redacted evidence only; an allowed snapshot returns zero prohibited egress objects across API and Git-history enumeration`.

2.21.7 officialSourceIds=`GH-01; GH-12; GH-15; GH-16; GH-19; GH-20`.

## 2.22 `PRCS-HR-F022`

2.22.1 severity=`P1`.

2.22.2 exactSubjectLocator=`subject A 2.8–2.10; 4.3.1–4.3.2; 5.1–5.3`.

2.22.3 defect=`enabling scanners is treated as a bounded gate without defining supported-pattern gaps, custom-pattern scope, validity-check privacy/side effects, binary/LFS/archive coverage, detector versions, false-negative corpus, bypass disposition or redaction safety`.

2.22.4 impact=`a scanner PASS can be misread as absence of Secrets even when the credential format, encoded value or storage surface is outside its detector; scanner output itself can leak the value`.

2.22.5 requiredDelta=`publish a detector/coverage registry, custom-pattern policy, test corpus, exclusions and typed unknowns; require repository push protection with delegated bypass; cover history, binary/archive/LFS and CI output through complementary tools; redact findings and test validity-check behavior`.

2.22.6 acceptancePredicate=`every accepted secret class maps to at least one tested pre-egress detector and one incident detector or a blocking Unknown; the false-negative corpus has zero critical misses; bypass/self-exemption tests fail; logs never contain the seeded secret`.

2.22.7 officialSourceIds=`GH-01; GH-11; GH-12; GH-13`.

## 2.23 `PRCS-HR-F023`

2.23.1 severity=`P1`.

2.23.2 exactSubjectLocator=`subject A 4.4.5; 5.1`.

2.23.3 defect=`SECURITY.md plus Private Vulnerability Reporting is not a response process: supported versions, scope, safe contact, acknowledgement/triage/remediation targets, severity, embargo, duplicate handling, private advisory/fork, CVE decision, patch verification, publication and legal safe-harbor wording are undefined`.

2.23.4 impact=`researchers may disclose publicly or receive inconsistent handling, and a vulnerability may be published before a verified fix or without notifying consumers`.

2.23.5 requiredDelta=`define a legally reviewed vulnerability-disclosure lifecycle with private channel/PVR, supported versions, target times, roles, severity and embargo rules, private advisory/fix workflow, independent remediation verification, CVE/publication criteria and incident escalation`.

2.23.6 acceptancePredicate=`a tabletop report proceeds from private intake through acknowledgement, triage, private fix, independent verification and coordinated publication within the approved targets; no exploitable detail reaches a Public issue before release authorization`.

2.23.7 officialSourceIds=`GH-18`.

## 2.24 `PRCS-HR-F024`

2.24.1 severity=`P1`.

2.24.2 exactSubjectLocator=`subject A 3.4; 4.4.6; 5.1`.

2.24.3 defect=`“select a License and contribution policy” omits separate code/content/data/asset licenses, third-party NOTICE obligations, trademarks, contributor rights and inbound licensing, DCO/CLA decision, generated/AI-assisted material provenance and dependency-license policy`.

2.24.4 impact=`Public visibility permits viewing/forking under GitHub terms but does not grant a complete open-source license; redistribution or contribution may create copyright, patent, trademark or incompatible-license risk`.

2.24.5 requiredDelta=`obtain Legal selection for code, docs/content, data/assets and trademarks; create LICENSE/NOTICE/third-party attribution policy; decide DCO versus CLA and contribution sign-off; scan and review dependency/assets licenses; document AI-assisted contribution provenance and exclusions`.

2.24.6 acceptancePredicate=`Legal-approved files and policy cover every shipped artifact class; every dependency/asset has a compatible license and required notice; an unlicensed/incompatible fixture blocks release; contributor acceptance is bound to the exact contribution`.

2.24.7 officialSourceIds=`GH-19; GH-20`.

## 2.25 `PRCS-HR-F025`

2.25.1 severity=`P1`.

2.25.2 exactSubjectLocator=`subject A 4.2.4; subject B 2.1.1–2.1.5; 3.4.1; 4.6`.

2.25.3 defect=`SLSA 1.2 is selected without a producer/consumer implementation profile, while GitHub’s artifact-attestation documentation states SLSA v1.0 Build Level 2/3 properties; Source Track, Build Track and verification are not separated`.

2.25.4 impact=`the plan can accidentally credit a GitHub-generated attestation as SLSA 1.2 Source or Build conformance without satisfying the selected track’s requirements or consumer expectations`.

2.25.5 requiredDelta=`create separate SLSA-version/Track/Level claims; map every normative requirement to platform evidence; define source provenance/VSA where claimed; define consumer expected-provenance policy and failure action; require an independent assessor before any Level claim`.

2.25.6 acceptancePredicate=`every claimed version/Track/Level has a complete rooted requirement matrix and independent assessment; GitHub attestation presence alone yields zero Source-Track credit and no SLSA 1.2 Level unless all selected requirements pass`.

2.25.7 officialSourceIds=`GH-15; SLSA-01`.

## 2.26 `PRCS-HR-F026`

2.26.1 severity=`P1`.

2.26.2 exactSubjectLocator=`subject B 2.3.1–2.3.4; 3.4.2; 4.6`.

2.26.3 defect=`Scorecard is called a future heuristic input but installation itself is not threat-modeled: the Action can require id-token:write/security-events:write, publish results publicly, upload publicly accessible artifacts for a period and has trigger/workflow restrictions`.

2.26.4 impact=`copying the official template can broaden permissions or publish repository findings; a mutable example or aggregate score can become an unjustified Gate`.

2.26.5 requiredDelta=`decide local CLI versus pinned Action; pin and review the exact action SHA; select publish_results explicitly; isolate its job and minimal scopes; classify SARIF/artifact/result disclosure; store per-check evidence and exceptions; never gate on aggregate score alone`.

2.26.6 acceptancePredicate=`the exact reviewed Scorecard executable and workflow root are pinned; permissions and outputs match the approved disclosure profile; public result publication is explicit; each Gate maps to named checks/thresholds and a score change alone cannot alter readiness`.

2.26.7 officialSourceIds=`OSSF-01; OSSF-02; GH-01`.

## 2.27 `PRCS-HR-F027`

2.27.1 severity=`P1`.

2.27.2 exactSubjectLocator=`subject B 2.6.1–2.6.3; 4.1; 4.4`.

2.27.3 defect=`NIST AI 100-2e2025 is treated as one final immutable taxonomy source but its official page links a potential-updates/errata file correcting taxonomy index IDs; no errata root or merge policy is recorded`.

2.27.4 impact=`Connect can derive tests from known incorrect taxonomy indices or silently change mappings when NIST updates the errata`.

2.27.5 requiredDelta=`capture the final publication and potential-updates file as distinct rooted records; define whether errata amends interpretation, preserve both locators and monitor both; invalidate only affected mappings through an explicit delta`.

2.27.6 acceptancePredicate=`taxonomy resolution reproduces the accepted publication plus exact errata root; the known index correction is represented; an errata change creates a new delta and blocks affected mappings until review`.

2.27.7 officialSourceIds=`NIST-03; NIST-04`.

## 2.28 `PRCS-HR-F028`

2.28.1 severity=`P1`.

2.28.2 exactSubjectLocator=`subject B 2.7.1–2.7.4; 4.5; 5.3`.

2.28.3 defect=`two official OWASP pages disagree on the LLM Top 10 2026 publication date: August 4 versus August 3; the supplement selects one date before exact canonical-source capture`.

2.28.4 impact=`a date-based freshness or precedence rule can choose inconsistent content, and the observation appears more certain than the official evidence permits`.

2.28.5 requiredDelta=`record the official-source conflict; use canonical 2026/final content bytes and immutable commit/release root as identity rather than publication-page date; retain both page observations with claim limits`.

2.28.6 acceptancePredicate=`the accepted source record is rooted to exact canonical content; both conflicting page dates remain traceable; neither date alone changes the content root or Gate`.

2.28.7 officialSourceIds=`OWASP-02; OWASP-03`.

## 2.29 `PRCS-HR-F029`

2.29.1 severity=`P1`.

2.29.2 exactSubjectLocator=`subject B 2.5.1–2.8.4; 3.3.1–3.3.4; 4.2; 4.7`.

2.29.3 defect=`AI governance and threat sources are not connected to lifecycle TEVV, change control, evaluation datasets, model/prompt/tool/knowledge roots, data/tenant boundaries, residual-risk acceptance, monitoring or post-deployment incident feedback`.

2.29.4 impact=`a one-time adversarial test can pass while provider model drift, prompt/knowledge changes, new tools or observed abuse invalidate the safety case`.

2.29.5 requiredDelta=`define an AI-system bill of materials and change graph; create pre-release and continuous TEVV for safety/security/privacy/cost; bind evaluations to exact model/prompt/tool/knowledge/provider roots; set drift/incident triggers, human review and residual-risk owner/expiry`.

2.29.6 acceptancePredicate=`every deployed AI behavior resolves to exact component/config/data roots and accepted evaluations; changing any root or crossing a drift/incident threshold invalidates approval and disables side effects until re-evaluation`.

2.29.7 officialSourceIds=`NIST-01; NIST-02; NIST-03; NIST-05; OWASP-01; OWASP-04; MITRE-03`.

## 2.30 `PRCS-HR-F030`

2.30.1 severity=`P1`.

2.30.2 exactSubjectLocator=`subject B 2.5.1; 2.8.2–2.8.4; 4.1; 4.4–4.5; 5.4`.

2.30.3 defect=`change monitoring is required but has no source-specific cadence, ETag/release/tag/digest observation, failed-refresh terminal, semantic-delta classifier, affected-claim graph, re-review SLA or old-root retention rule`.

2.30.4 impact=`mutable sources can become stale silently, or a fetch failure can leave old guidance operational with no known-expired state`.

2.30.5 requiredDelta=`define one freshness/invalidation profile per source class with immutable root, observed version, next review, change signal, trusted-time requirement, fetch-failure behavior, semantic delta, affected mappings and successor-only history`.

2.30.6 acceptancePredicate=`unchanged refresh reproduces the root; changed source creates a successor and exact impact set; expired or failed refresh yields BLOCKED/UNKNOWN rather than stale PASS; historical roots remain readable`.

2.30.7 officialSourceIds=`SLSA-01; SAMM-02; NIST-01; NIST-04; OWASP-02; MITRE-02; MITRE-03`.

## 2.31 `PRCS-HR-F031`

2.31.1 severity=`P1`.

2.31.2 exactSubjectLocator=`subject A 4.2.5; 5.1–5.3`.

2.31.3 defect=`self-hosted runners are correctly blocked, but GitHub-hosted runner image identity, preinstalled SBOM, network egress, downloaded browser/system packages, workspace persistence between steps and build-environment evidence are not covered`.

2.31.4 impact=`a mutable runner image or unrestricted network download can change or exfiltrate build inputs while source/action pins remain unchanged`.

2.31.5 requiredDelta=`record runner label and resolved image/release/SBOM; inventory system/browser downloads; restrict or observe egress for privileged builds; prohibit credentials before untrusted installs; capture hermeticity exceptions and rebuild triggers`.

2.31.6 acceptancePredicate=`release Evidence binds the resolved runner image and tool/input inventory; an unapproved outbound host or changed download checksum fails; privileged steps do not inherit untrusted workspace state outside the declared boundary`.

2.31.7 officialSourceIds=`GH-01; SLSA-01`.

## 2.32 `PRCS-HR-F032`

2.32.1 severity=`P2`.

2.32.2 exactSubjectLocator=`subject A 4.1.5; 5.2`.

2.32.3 defect=`negative verification mentions an unsigned workflow edit, but the plan does not decide whether signed commits are required, which signature types/identities are accepted, how bots are handled, how keys are revoked, or how GitHub “Partially verified” under vigilant mode is interpreted`.

2.32.4 impact=`an unenforceable “unsigned denied” assertion can create false assurance or block legitimate automation; compromised but still verified identities remain unaddressed`.

2.32.5 requiredDelta=`either remove the unsigned-commit acceptance claim or define a complete signed-commit policy with accepted identities/signature types, bot path, key lifecycle/revocation, vigilant-mode treatment and incident response; keep review and expected-source checks independent`.

2.32.6 acceptancePredicate=`the Ruleset and conformance corpus produce the selected result for valid, invalid, expired/revoked, bot and Partially verified signatures; signature validity alone never bypasses review/check requirements`.

2.32.7 officialSourceIds=`GH-09; GH-21`.

# 3. Manifest totals and disposition

3.1 total findings=`32`.

3.2 P0=`12`.

3.3 P1=`19`.

3.4 P2=`1`.

3.5 P3=`0`.

3.6 open=`32/32`.

3.7 reconciled=`0/32`.

3.8 accepted=`0/32`.

3.9 rejected=`0/32`.

3.10 duplicate=`0/32`.

3.11 subject bytes modified=`NO`.

3.12 Public visibility changed or challenged=`NO; PUBLIC is a binding invariant`.

3.13 next state=`independent reconciliation must preserve every finding ID and record ACCEPT/REJECT/DUPLICATE with rationale; no finding closes from this report alone`.
