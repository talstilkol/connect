# 1. Connect — Independent hostile review of Public-repository security and cyber/AI source refresh

## 1.1 Review identity

1.1.1 `artifactId=CONNECT-PUBLIC-REPOSITORY-AND-CYBER-SOURCE-HOSTILE-REVIEW-2026-08-29`.

1.1.2 `reviewId=PRCS-HR-2026-08-29`.

1.1.3 review date=`2026-08-29`.

1.1.4 subject A path=`web/docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md`.

1.1.5 subject A required SHA-256=`448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`.

1.1.6 subject A observed SHA-256=`448cf2a7596f3544966b1e992c33ea6bc569305d5a2af2a00378cf60bf1eeaa9`.

1.1.7 subject A identity result=`PASS; 131 lines; 9090 bytes`.

1.1.8 subject B path=`web/docs/planning/cyber-ai-and-supply-chain-source-refresh-supplement-2026-08-29.md`.

1.1.9 subject B required SHA-256=`fa47fceef7df91fb9e46f1d09f451a3d1344cfdcbbe7ea100b6b85e4a4471250`.

1.1.10 subject B observed SHA-256=`fa47fceef7df91fb9e46f1d09f451a3d1344cfdcbbe7ea100b6b85e4a4471250`.

1.1.11 subject B identity result=`PASS; 165 lines; 9378 bytes`.

1.1.12 findings manifest path=`web/docs/planning/public-repository-and-cyber-source-hostile-review-findings-manifest-2026-08-29.md`.

1.1.13 findings manifest SHA-256=`a84a26bd0439e4da5bed5a941b8956e041268fc33ba40e2d89d095b55dec51e4`.

1.1.14 findings manifest size=`573 lines; 41555 bytes`.

## 1.2 Binding boundary

1.2.1 Tal’s latest authority is binding: the canonical Connect repository remains `Public`.

1.2.2 no finding recommends changing repository visibility to Private; safe publication must be achieved through governance, least privilege, content control, reproducible provenance, monitoring and tested incident response.

1.2.3 this is an independent hostile planning review of the two exact immutable Subject byte roots only.

1.2.4 neither Subject was modified.

1.2.5 no finding was merged, reconciled, accepted, rejected, marked duplicate or closed by this reviewer.

1.2.6 no Product code, Git state, Commit, Push, Release, Deployment, GitHub/provider/account setting, credential, purchase or external system was changed.

1.2.7 current web pages were used as reviewer-local research observations, not admitted Source custody, compliance Evidence or implementation proof.

## 1.3 Method

1.3.1 pass 1 verified exact Subject roots, full readability, sizes and planning authority.

1.3.2 pass 2 modeled the complete Public repository egress surface: source/history, forks/PRs, Issues/Discussions, Actions, logs/artifacts/caches, LFS, Releases, Packages, SBOMs and attestations.

1.3.3 pass 3 challenged GitHub governance, Rulesets, CODEOWNERS, status checks, merge queue, bypasses, identities, organization ownership and vulnerability disclosure.

1.3.4 pass 4 challenged Actions event/actor/ref trust, fork execution, pull_request_target/workflow_run, script injection, cache poisoning, environments, OIDC and privileged attestation/deployment boundaries.

1.3.5 pass 5 challenged package/Action/container/download provenance, dependency confusion, registry selection, namespace and publish safety.

1.3.6 pass 6 compared framework roles and current identities across GitHub, npm, SLSA, OWASP SAMM, OpenSSF Scorecard, CISA, NIST, OWASP GenAI/AISVS/ASVS/API, MITRE ATT&CK/ATLAS and CIS official sources.

1.3.7 pass 7 separated research observation, captured source, derived requirement, configured control, negative Test and operational Evidence.

1.3.8 each defect remains separate when it has a distinct attack path, required repair object or acceptance predicate.

# 2. Executive verdict

## 2.1 Result

2.1.1 verdict=`REJECT AS PUBLIC-PUSH/PRIVILEGED-WORKFLOW/RELEASE ACCEPTANCE-READY; SUCCESSOR REQUIREMENTS REQUIRED`.

2.1.2 total reviewer-local findings=`32`.

2.1.3 P0=`12`.

2.1.4 P1=`19`.

2.1.5 P2=`1`.

2.1.6 P3=`0`.

2.1.7 open=`32/32`.

2.1.8 accepted framework/source groups=`0`.

2.1.9 accepted SLSA Track/Level=`none`.

2.1.10 accepted SAMM maturity=`none`.

2.1.11 accepted Scorecard score=`none`.

2.1.12 current repository visibility decision=`PUBLIC; ACCEPTED AS AN INVARIANT, NOT AS A SECURITY PASS`.

2.1.13 next Public Push=`BLOCKED BY THE SUBJECT’S OWN HARDENING GATE AND THIS REVIEW’S OPEN P0 FINDINGS`.

## 2.2 Why rejection is mandatory

2.2.1 Public branch protection is not release protection: branch and tag Rulesets, immutable releases, packages and consumer verification require separate controls.

2.2.2 an Actions workflow can run attacker-controlled installs or artifacts while holding OIDC/attestation write permissions because the plan has no event/ref/actor matrix or privilege-separation invariant.

2.2.3 OIDC is named only indirectly; without audience/subject/repository/workflow/environment/ref conditions, a short-lived token can still authorize the wrong workflow.

2.2.4 Secret rotation does not remove PII or sensitive bytes from forks, PR refs, caches, logs, artifacts, LFS, releases, packages or public transparency logs.

2.2.5 lockfiles and known-vulnerability review do not prevent dependency confusion, malicious current packages, install-script abuse or registry substitution.

2.2.6 the framework denominator is internally inconsistent: section 3 introduces uncaptured frameworks beyond the eight groups counted in section 5.

2.2.7 current framework identity is not reproducible from exact bytes and contains material ambiguity/inaccuracy for SAMM, ATT&CK and ATLAS.

2.2.8 AI taxonomies remain awareness prose; no total threat-to-control-to-negative-test closure exists for untrusted WhatsApp content, RAG/knowledge, memory, tools or approval binding.

## 2.3 Positive seeds retained

2.3.1 subject A correctly treats every Public byte as copyable and potentially permanent.

2.3.2 subject A correctly rejects security through obscurity, forbids self-hosted runners pending separate review and recognizes rotation as distinct from deleting a Git line.

2.3.3 subject A correctly requires full Action SHAs, read-only default token permission, independent sensitive-path review and a private Evidence store.

2.3.4 subject B correctly separates awareness, taxonomy, maturity, governance, verification, provenance and control roles.

2.3.5 subject B correctly refuses SLSA Level, SAMM maturity, Scorecard and compliance claims without Evidence.

2.3.6 these strengths are design seeds only; they do not close any finding without deterministic negative Evidence and settings/provider readback.

# 3. Requested-dimension coverage and finding map

## 3.1 Public repository, history and egress

3.1.1 result=`REJECT`.

3.1.2 finding IDs=`PRCS-HR-F001; F006; F008; F020; F021; F022; F023; F024`.

3.1.3 missing control logic=`organization ownership, full egress inventory, safe expunging, releases/packages/LFS, disclosure and legal/license lifecycle`.

## 3.2 GitHub Actions, forks and pull requests

3.2.1 result=`REJECT`.

3.2.2 finding IDs=`PRCS-HR-F002; F003; F013; F014; F015; F016; F017; F018; F019; F031; F032`.

3.2.3 missing control logic=`closed trust matrix, privilege separation, expected check source, merge_group, dual-review semantics, bypass isolation, all-external approval, cache/artifact trust and runner/tool identity`.

## 3.3 Secrets, history, LFS, releases and packages

3.3.1 result=`REJECT`.

3.3.2 finding IDs=`PRCS-HR-F006; F015; F020; F021; F022`.

3.3.3 missing control logic=`surface-complete detection, revoke/purge/Support/fork coordination, delegated bypass, independent visibility and irreducible-copy residual risk`.

## 3.4 Provenance, attestations and SLSA

3.4.1 result=`REJECT`.

3.4.2 finding IDs=`PRCS-HR-F003; F005; F018; F025; F031`.

3.4.3 missing control logic=`trusted producer boundary, public-log classification, expected-provenance consumer policy, exact SLSA version/Track/Level and complete build-input identity`.

## 3.5 Dependency confusion and executable supply chain

3.5.1 result=`REJECT`.

3.5.2 finding IDs=`PRCS-HR-F007; F017; F018; F026; F031`.

3.5.3 missing control logic=`scope-to-registry binding, namespace reservation, private/publish configuration, lifecycle-script policy, Action/workflow/image/download roots and heuristic-tool threat modeling`.

## 3.6 OIDC, environments and external roles

3.6.1 result=`REJECT`.

3.6.2 finding IDs=`PRCS-HR-F003; F004; F019`.

3.6.3 missing control logic=`audience/subject/custom claims, immutable identity, workflow/environment/ref binding, role scope/TTL, negative policy, prevent-self-review and dispatch fences`.

## 3.7 CODEOWNERS, Rulesets and governance

3.7.1 result=`REJECT`.

3.7.2 finding IDs=`PRCS-HR-F001; F008; F013; F014; F015; F032`.

3.7.3 missing control logic=`separate branch/tag protections, organization control, exact status source, real two-person review, surface-specific bypass and signature policy`.

## 3.8 Vulnerability disclosure and licensing

3.8.1 result=`REJECT`.

3.8.2 finding IDs=`PRCS-HR-F023; F024`.

3.8.3 missing control logic=`coordinated private advisory/fix/CVE lifecycle and separately approved code/content/data/asset/contribution/license obligations`.

## 3.9 AI and agent threats

3.9.1 result=`REJECT`.

3.9.2 finding IDs=`PRCS-HR-F012; F027; F028; F029; F030`.

3.9.3 missing control logic=`applicability closure, taint/tool/memory/RAG/MCP boundaries, approval immutability, TEVV/change roots, errata/conflict handling and freshness invalidation`.

## 3.10 Framework roles and source custody

3.10.1 result=`REJECT`.

3.10.2 finding IDs=`PRCS-HR-F009; F010; F011; F025; F026; F027; F028; F030`.

3.10.3 missing control logic=`closed denominator, exact content roots, corrected release identity, role/claim limits, mutable-source successors and no transitive compliance credit`.

# 4. Official-source registry used by this review

## 4.1 Source-use rule

4.1.1 every URL in sections 4.2–4.10 was viewed on `2026-08-29`.

4.1.2 only official vendor, standards-body, foundation or project-owner sources were used.

4.1.3 these are reviewer-local URL observations; because exact response bytes and trusted retrieval receipts were not admitted to custody, they support Findings but do not themselves close F010.

## 4.2 GitHub Actions and OIDC

4.2.1 `GH-01` GitHub Secure use reference=`https://docs.github.com/en/actions/reference/security/secure-use`; observed roles=`least privilege, immutable Action SHA, untrusted checkout, self-hosted/Public risk, runner SBOM and OIDC guidance`.

4.2.2 `GH-02` GitHub Actions settings for a repository=`https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository`; observed roles=`Public fork approvals, first-time trust warning, all-external approval and token defaults`.

4.2.3 `GH-03` Workflow execution protections=`https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/actions-policies/workflow-execution-protections`; observed status=`Public preview`; observed roles=`event and actor allowlists, pull_request_target and workflow_dispatch restriction`.

4.2.4 `GH-04` Script injections=`https://docs.github.com/en/actions/concepts/security/script-injections`; observed role=`GitHub-context input is untrusted and must not be interpolated into generated scripts`.

4.2.5 `GH-05` Dependency caching=`https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching`; observed role=`low-trust trigger cache poisoning and cache-access boundaries`.

4.2.6 `GH-06` OpenID Connect reference=`https://docs.github.com/en/actions/reference/security/oidc`; observed roles=`aud/sub, repository_id, repository_visibility and job_workflow_ref conditions`.

4.2.7 `GH-07` Deployments and environments=`https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments`; observed roles=`reviewers, protected environments and branch/tag restrictions`.

4.2.8 `GH-10` Workflow events=`https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows`; observed role=`merge_group:checks_requested is required when merge-queue checks use Actions`.

## 4.3 GitHub governance, access and community

4.3.1 `GH-08` CODEOWNERS=`https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners`; observed roles=`base-branch file, syntax/precedence, owner access, any-one-owner approval and self-protection`.

4.3.2 `GH-09` Rulesets and available rules=`https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository` and `https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets`; observed roles=`separate branch/tag Rulesets, expected status source, bypass and signed-commit semantics`.

4.3.3 `GH-09A` Ruleset availability=`https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets`; observed limitation=`push Rulesets are for internal/private repositories and are not a substitute available to this intentionally Public repository`.

4.3.4 `GH-21` Organization 2FA=`https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-two-factor-authentication-for-your-organization/requiring-two-factor-authentication-in-your-organization`; observed role=`organization-level member/outside-collaborator identity requirement`.

4.3.5 `GH-22` credential design sources=`https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys` and `https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app`; observed role=`deploy-key risk versus scoped/short-lived GitHub App identity`.

4.3.6 `GH-18` vulnerability reporting/advisories=`https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately` and `https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/repository-security-advisories`; observed role=`Private Vulnerability Reporting and private advisory/fix/publication workflow`.

4.3.7 `GH-19` repository licensing=`https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository`; observed role=`no license means default copyright; Public visibility is not an open-source license`.

4.3.8 `GH-20` GitHub Terms=`https://docs.github.com/en/site-policy/github-terms/github-terms-of-service`; observed role=`service/fork permissions and contribution terms require Legal interpretation, not a technical PASS`.

## 4.4 GitHub Secrets, history and distribution

4.4.1 `GH-11` Push protection=`https://docs.github.com/en/code-security/concepts/secret-security/push-protection`; observed roles=`write-user bypass by default, delegated bypass, exemptions and alerts`.

4.4.2 `GH-12` Removing sensitive data=`https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository`; observed roles=`clones/forks/PR refs/cached views, Support, recontamination and history-rewrite cost`.

4.4.3 `GH-13` Removing Git LFS files=`https://docs.github.com/en/repositories/working-with-files/managing-large-files/removing-files-from-git-large-file-storage`; observed role=`remote LFS objects survive source removal and may require Support or repository recreation`.

4.4.4 `GH-14` Immutable releases=`https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases`; observed role=`tag/assets lock and automatic release attestation for future immutable releases`.

4.4.5 `GH-15` Artifact attestations=`https://docs.github.com/en/actions/concepts/security/artifact-attestations`; observed roles=`public Sigstore transparency, mandatory consumer verification and GitHub’s SLSA v1.0 claims`.

4.4.6 `GH-16` Package access/visibility=`https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility`; observed roles=`visibility separate from repository, anonymous public containers, fork/private-package risk and irreversible Public package visibility`.

4.4.7 `GH-17` Package deletion/restoration=`https://docs.github.com/en/packages/learn-github-packages/deleting-and-restoring-a-package`; observed roles=`5,000-download public deletion limit, Support path and 30-day/namespace restore constraints`.

## 4.5 npm supply chain

4.5.1 `NPM-01` npm registry behavior=`https://docs.npmjs.com/using-npm/registry.html/`; observed roles=`scope-based registry selection and lockfile registry behavior`.

4.5.2 `NPM-02` npm package.json=`https://docs.npmjs.com/files/package.json/`; observed roles=`private:true prevents publication and publishConfig constrains publish registry/tag/access`.

## 4.6 SLSA, SAMM, Scorecard and CISA

4.6.1 `SLSA-01` SLSA v1.2=`https://slsa.dev/spec/v1.2/`, `https://slsa.dev/spec/v1.2/tracks` and `https://slsa.dev/spec/v1.2/source-requirements`; observed status=`Approved`; observed roles=`separate Source/Build Tracks, expected-provenance verification, source roles, tag immutability and safe expunging`.

4.6.2 `SAMM-01` SAMM model=`https://owaspsamm.org/model/`; observed role=`five-function/fifteen-practice maturity model whose major model family is version 2`.

4.6.3 `SAMM-02` SAMM core release=`https://github.com/owaspsamm/core/releases/tag/v2.2.0`; observed identity=`latest v2.2.0; release commit displayed as 21352e0; exact asset capture still required`.

4.6.4 `OSSF-01` OpenSSF Scorecard=`https://openssf.org/scorecard/` and `https://github.com/ossf/scorecard/blob/main/docs/checks.md`; observed role=`repository heuristics, not proof or certification`.

4.6.5 `OSSF-02` Scorecard Action=`https://github.com/ossf/scorecard-action/blob/main/README.md`; observed roles=`id-token/security-events permissions, public results, trigger restrictions and short-lived public artifact exposure`.

4.6.6 `CISA-01` Secure by Demand guide=`https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf`; observed role=`secure-by-design procurement/outcome questions, not certification or runtime Evidence`.

## 4.7 NIST cyber, secure development and AI

4.7.1 `NIST-01` AI Resource Center=`https://airc.nist.gov/`; observed role=`AI RMF 1.0 lifecycle governance and revision monitoring`.

4.7.2 `NIST-02` AI 600-1=`https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence`; observed role=`final Generative-AI profile for Govern/Map/Measure/Manage, not penetration-test proof`.

4.7.3 `NIST-03` AI 100-2e2025=`https://csrc.nist.gov/pubs/ai/100/2/e2025/final`; observed role=`final adversarial-machine-learning taxonomy with an official potential-updates link`.

4.7.4 `NIST-04` AI 100-2e2025 potential updates=`https://csrc.nist.gov/files/pubs/ai/100/2/e2025/final/docs/nist.ai.100-2e2025_potential_updates.pdf`; observed role=`known taxonomy-index correction; separately rooted errata input`.

4.7.5 `NIST-05` IR 8596=`https://csrc.nist.gov/pubs/ir/8596/iprd`; observed status=`Initial Preliminary Draft dated 2025-12-16; monitoring/delta input only`.

4.7.6 `NIST-06` CSF 2.0=`https://www.nist.gov/cyberframework`; observed role=`organizational cybersecurity-risk outcomes and profiles, not Product test Evidence`.

4.7.7 `NIST-07` SSDF 1.1=`https://csrc.nist.gov/pubs/sp/800/218/final`; observed role=`final high-level secure-development practices and root-cause reduction`.

## 4.8 OWASP application and AI sources

4.8.1 `OWASP-01` AISVS=`https://owasp.org/www-project-artificial-intelligence-security-verification-standard-aisvs-docs/`; observed identity=`v1.0 released 2026-06-24`; observed role=`testable AI lifecycle requirements across 12 chapters and levels 1–3`.

4.8.2 `OWASP-02` LLM Top 10 project page=`https://owasp.org/www-project-top-10-for-large-language-model-applications/`; observed identity=`2026/final canonical source; page says published 2026-08-04`.

4.8.3 `OWASP-03` GenAI LLM Top 10 resource=`https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/`; observed conflict=`page says 2026-08-03`.

4.8.4 `OWASP-04` Agentic Top 10=`https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/`; observed roles=`goal hijack, tool misuse, identity abuse, agentic supply chain, code execution, memory/context poisoning, inter-agent communication, cascading failures, human-trust exploitation and rogue agents`.

4.8.5 `OWASP-05` ASVS=`https://owasp.org/www-project-application-security-verification-standard/`; observed identity=`latest stable 5.0.0`; observed role=`versioned Web/application verification requirements`.

4.8.6 `OWASP-06` API Security Top 10 2023=`https://owasp.org/API-Security/editions/2023/en/0x11-t10/`; observed role=`API risk awareness and mapping input, not a complete requirement/test standard`.

## 4.9 MITRE sources

4.9.1 `MITRE-01` ATT&CK version history=`https://attack.mitre.org/resources/versions/`; observed conflict=`shows current v19.2 while displaying April 28, 2026–current`.

4.9.2 `MITRE-02` ATT&CK August 2026 update=`https://attack.mitre.org/resources/updates/updates-august-2026/`; observed identity=`v19.2 released August 6, 2026; first Agile release; includes CI/CD/software-supply-chain activity`.

4.9.3 `MITRE-03` ATLAS data release=`https://github.com/mitre-atlas/atlas-data/releases/tag/v2026.07`; observed identity=`latest v2026.07, displayed release date August 7, commit 2306eca, 101 techniques and new AI Agent Tool Poisoning entries`.

4.9.4 `MITRE-04` ATLAS manifest=`https://github.com/mitre-atlas/atlas-data/blob/main/dist/manifest.yaml`; observed role=`machine-readable content inventory whose exact release bytes, content version and format version must be captured separately`.

## 4.10 CIS source

4.10.1 `CIS-01` CIS Controls v8.1=`https://www.cisecurity.org/controls/v8-1`; observed role=`tailored operational control baseline and Implementation Group input, not blanket compliance proof`.

# 5. Corroborating local read-only observations

## 5.1 Workflow roots and locators

5.1.1 these files are not additional Subjects; they were inspected read-only only to test whether the plans address currently plausible attack paths.

5.1.2 `.github/workflows/dependency-audit-evidence.yml` root=`sha256:15c3859ecc607ceb9cd842421d8fd0a9d323cc8b11da98746032c7890986c0a5`; lines 3–11 allow pull_request/workflow_dispatch and grant id-token/attestation/artifact-metadata writes; lines 35–52 run npm ci and then attest in the same job.

5.1.3 `.github/workflows/team-invitation-browser-e2e.yml` root=`sha256:e5c4e1deafa96232198a84dc7634addf5e8eab63987e491a309e413414990d5a`; lines 3–10 allow manual dispatch with OIDC/attestation writes; lines 20 and 41–86 use the staging environment, Secrets and attestation in one job.

5.1.4 `.github/workflows/pull-request-quality-gates.yml` root=`sha256:46b050c2129b7ef6a56d54ac5756cd68830de9b7bb145f532357382bb5151ccd`; lines 3–8 use pull_request/workflow_dispatch with contents read, but no merge_group trigger exists in the inspected bytes.

5.1.5 all observed external `uses:` references were full hexadecimal SHAs; this is a positive current observation, not enforcement for future edits.

5.1.6 no project-level `SECURITY.md`, root `LICENSE*`, or CODEOWNERS at `.github/CODEOWNERS`, root or `docs/CODEOWNERS` existed at inspection time.

## 5.2 Claim limit

5.2.1 no workflow was executed and no GitHub/provider setting or entitlement was read back during this review.

5.2.2 therefore the local observations prove only the exact inspected file bytes and absence at the inspected paths, not current remote execution policy or protection state.

# 6. Correct framework-role model

## 6.1 Governance and maturity

6.1.1 NIST CSF 2.0=`organizational cybersecurity outcome/profile taxonomy`.

6.1.2 NIST AI RMF 1.0 plus AI 600-1=`AI lifecycle risk governance`.

6.1.3 OWASP SAMM exact release=`software-security program maturity and improvement`.

6.1.4 CISA Secure by Design/Demand=`manufacturer principles, outcome and procurement questions`.

6.1.5 none of these roles can substitute for a release test or settings readback.

## 6.2 Development and verification

6.2.1 NIST SSDF=`secure-development practice baseline and root-cause improvement`.

6.2.2 OWASP ASVS=`versioned Web/application requirements`.

6.2.3 OWASP AISVS=`versioned AI-system requirements`.

6.2.4 OWASP API Security Top 10, LLM Top 10 and Agentic Top 10=`risk-awareness and applicability inputs; not complete verification on their own`.

## 6.3 Threat intelligence and taxonomy

6.3.1 MITRE ATT&CK=`enterprise adversary technique/intelligence mapping`.

6.3.2 MITRE ATLAS and NIST AI 100-2e2025=`AI adversary/taxonomy inputs with separate version/errata handling`.

6.3.3 a mapped technique proves awareness only; implementation requires a derived requirement, control, negative Test and Evidence.

## 6.4 Supply-chain assurance

6.4.1 SLSA=`source/build provenance and verified-property specification with versioned Tracks/Levels`.

6.4.2 OpenSSF Scorecard=`automated Public-repository heuristic/regression signal`.

6.4.3 artifact attestation=`signed provenance statement requiring consumer verification; existence alone is zero readiness credit`.

# 7. Mandatory research-to-proof separation

## 7.1 Allowed state machine

7.1.1 state 1=`OFFICIAL-URL-OBSERVED`: current page observation only; no control credit.

7.1.2 state 2=`SOURCE-CAPTURED`: exact authoritative bytes/root, locator, custody, license, time/freshness and conflict state; still no implementation credit.

7.1.3 state 3=`REQUIREMENT-DERIVED`: reviewed applicability and claim linked to exact source root; still no control credit.

7.1.4 state 4=`CONTROL-CONFIGURED`: exact code/settings/provider root and owner; still no operating-effectiveness credit.

7.1.5 state 5=`NEGATIVE-TEST-PASSED`: hostile mutation and failure cases demonstrate denial; still bounded to tested environment/time.

7.1.6 state 6=`OPERATIONAL-EVIDENCE-READ-BACK`: independent runtime/provider/API evidence binds subject, environment, time and control root.

7.1.7 state 7=`ACCEPTED`: independent review and reconciliation accept the bounded claim with residual risk, expiry and invalidation triggers.

## 7.2 Prohibited promotions

7.2.1 framework publication must not become compliance, maturity, SLSA, readiness or implementation credit.

7.2.2 a configured GitHub checkbox must not become proof that a negative path was denied.

7.2.3 an Action run success must not prove the run used the expected source, event, actor, ref, environment, role or artifact without bound readback.

7.2.4 an attestation must not prove the artifact is safe, and a score must not replace individual requirements.

# 8. Ordered successor plan

## 8.1 Stage 1 — close source identity before deriving new requirements

8.1.1 resolve `F009–F011` and `F027–F030`.

8.1.2 create the complete framework SourceRecord denominator and capture exact bytes/roots, conflicts, errata, versions, roles and change monitors.

8.1.3 terminal=`every framework token resolves exactly once; 0 dangling and 0 uncaptured selected sources`.

## 8.2 Stage 2 — define Public repository governance

8.2.1 resolve `F001; F008; F013–F016; F023–F024; F032`.

8.2.2 define organization-owned-but-Public authority, branch/tag/release protections, check sources, CODEOWNERS/dual approval, bypass registries, all-external fork approval, disclosure and licensing.

8.2.3 terminal=`Public is preserved and every governance negative predicate is machine-testable before a settings mutation is authorized`.

## 8.3 Stage 3 — define Actions/OIDC privilege boundaries

8.3.1 resolve `F002–F005; F017–F019; F031`.

8.3.2 materialize workflow trust matrices, signer/deployer isolation, OIDC trust contracts, environment/dispatch fences, cache/artifact trust and runner/input identity.

8.3.3 terminal=`no untrusted-input path reaches a privileged token, signer, Secret, environment or side effect without the approved digest-bound transition`.

## 8.4 Stage 4 — define Secret/content/distribution incident controls

8.4.1 resolve `F006; F020–F022`.

8.4.2 inventory the complete Public egress surface and define detection, delegated bypass, revoke/purge/Support/fork coordination, LFS/release/package handling and residual-risk states.

8.4.3 terminal=`the seeded cross-surface incident corpus is contained and no irreducible Public copy is silently called remediated`.

## 8.5 Stage 5 — define executable dependency and provenance controls

8.5.1 resolve `F007; F018; F025–F026`.

8.5.2 define registry/namespace/publish controls, complete executable inventory, SLSA claims/consumer verification and Scorecard’s bounded role.

8.5.3 terminal=`wrong registry, namespace, executable root, signer or expected provenance fails closed; no aggregate heuristic creates Gate credit`.

## 8.6 Stage 6 — derive AI/agent security requirements

8.6.1 resolve `F012; F029` after Stage 1 source roots are accepted.

8.6.2 build the total applicability/threat/control/test/Evidence graph and AI bill of materials with change invalidation.

8.6.3 terminal=`every applicable threat has a passing hostile negative Test and bounded Evidence; every component/root change invalidates affected approval`.

## 8.7 Stage 7 — independent reconciliation and acceptance

8.7.1 preserve all 32 IDs and record one disposition per finding: `ACCEPTED-FOR-SUCCESSOR`, `REJECTED-WITH-ROOTED-RATIONALE` or `DUPLICATE-OF-EXACT-ID`.

8.7.2 do not close a finding from prose; require its acceptance predicate and exact Evidence root.

8.7.3 terminal=`open P0=0; open P1=0 for the bounded next-Push/privileged-workflow/release scope; Subject successors and accepted SourceSet roots are immutable`.

# 9. Final disposition

9.1 Subject A remains a useful decision seed but is not sufficiently complete to authorize the next Public Push, privileged workflow or release.

9.2 Subject B remains bounded research but is not a closed, current or reproducible framework Source registry.

9.3 Public visibility remains mandatory and unchanged.

9.4 findings manifest is the authoritative reviewer-local finding list for this review; this narrative report does not replace its locators, defects, impacts, deltas or predicates.

9.5 no implementation or external mutation is authorized by this report.
