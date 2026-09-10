# 1. Connect — Cyber framework and Public-repository source refresh observation v2

## 1.1 Identity and boundary

1.1.1 `observationId=CONNECT-CYBER-FRAMEWORK-PUBLIC-REPOSITORY-SOURCE-REFRESH-2026-08-29-O2`.

1.1.2 `observedAtDate=2026-08-29`; exact trusted provider timestamp and signed source receipt=`unknown/unavailable`.

1.1.3 `observationClass=READ-ONLY-OFFICIAL-SOURCE-REFRESH; NOT-A-SOURCE-UNIVERSE-ACCEPTANCE; NOT-A-COMPLIANCE-CLAIM; NOT-LIVE-CONTROL-EVIDENCE`.

1.1.4 This observation records public documentation visible during the refresh. It does not prove that any GitHub feature is enabled, that Connect conforms to any framework, or that a provider account/plan supports a feature.

1.1.5 Repository visibility remains `PUBLIC`; this observation did not perform Product, Git, GitHub, provider, credential, deployment, Build or Runtime-test mutation.

## 1.2 Official source observations

### 1.2.1 NIST SSDF

1.2.1.1 canonical landing page=`https://csrc.nist.gov/pubs/sp/800/218/final`.

1.2.1.2 observed publication=`NIST SP 800-218, Secure Software Development Framework version 1.1`; observed final publication date=`2022-02-03`.

1.2.1.3 observed scope includes secure-development practices, secure development environments, provenance for software-release components, tracking security requirements/risks/design decisions, vulnerability response and prevention of recurrence.

1.2.1.4 planning use=`SDLC practice and Evidence crosswalk`; it is not a Product penetration-test result or a proof that a concrete control is operating.

### 1.2.2 NIST CSF

1.2.2.1 canonical landing page=`https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20`.

1.2.2.2 observed publication=`NIST Cybersecurity Framework 2.0`; observed publication date=`2024-02-26`.

1.2.2.3 observed scope is outcome-oriented risk governance across `GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER`; CSF does not prescribe one implementation.

1.2.2.4 planning use=`organizational-risk and lifecycle coverage`; CSF labels must not replace task, test, owner or Evidence records.

### 1.2.3 OWASP ASVS

1.2.3.1 canonical landing page=`https://owasp.org/www-project-application-security-verification-standard/`.

1.2.3.2 observed current release announcement=`ASVS 5.0.0`, released `2025-05-30`.

1.2.3.3 planning use=`web-application verification requirement source`; a version-pinned requirement crosswalk and applicability decision are required before any ASVS coverage metric.

### 1.2.4 OWASP API Security

1.2.4.1 canonical edition page=`https://owasp.org/API-Security/editions/2023/en/0x03-introduction/`.

1.2.4.2 observed stable edition=`OWASP API Security Top 10 2023`.

1.2.4.3 observed risk themes relevant to Connect include object/function/property authorization, resource consumption, sensitive business flows, SSRF and unsafe consumption of third-party APIs.

1.2.4.4 planning use=`threat and negative-test discovery`; a Top-10 mention is awareness coverage, not proof of secure API behavior.

### 1.2.5 SLSA

1.2.5.1 canonical current specification=`https://slsa.dev/spec/v1.2/`.

1.2.5.2 observed current approved version=`SLSA 1.2`; observed release announcement date=`2025-11-24`; observed v1.1 pages explicitly identify v1.1 as retired.

1.2.5.3 observed v1.2 includes separate Build and Source tracks; Build levels distinguish provenance, hosted signed provenance and hardened builds.

1.2.5.4 planning use=`source/build supply-chain provenance`; a claimed level requires the exact requirements and verifiable attestations, not merely a GitHub Actions workflow.

### 1.2.6 OpenSSF OSPS Baseline

1.2.6.1 canonical landing page=`https://baseline.openssf.org/`.

1.2.6.2 observed current version label=`v2026.02.19`; prior versions remain historical and must not be silently mixed with the current control denominator.

1.2.6.3 observed baseline purpose=`minimum actionable MUST controls organized by maturity and category`.

1.2.6.4 planning use=`Public repository governance and control denominator`; Connect must pin one version/root and record every applicable, inapplicable and blocked control one-to-one.

### 1.2.7 OpenSSF Scorecard

1.2.7.1 canonical landing page=`https://securityscorecards.dev/`.

1.2.7.2 observed page states that Scorecard applies automated checks across source, build, dependencies, testing and project maintenance and currently advertises `18` checks; check definitions are dynamic.

1.2.7.3 observed high or critical themes include dangerous workflows, branch protection, code review, unfixed vulnerabilities, dependency update tooling, pinned dependencies, token permissions, binary artifacts, SAST and signed releases.

1.2.7.4 planning use=`independent automated signal`; a score is neither a complete threat model nor Acceptance, and exact check/version/result roots are required for Evidence.

### 1.2.8 GitHub repository security features

1.2.8.1 canonical quickstart=`https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository`.

1.2.8.2 observed public-repository capabilities include dependency graph/review, Dependabot alerts and updates, CodeQL/code scanning, secret scanning, push protection, security policy and private security advisories, subject to current plan/repository/organization eligibility and configuration.

1.2.8.3 canonical push-protection concept=`https://docs.github.com/en/code-security/concepts/secret-security/push-protection`.

1.2.8.4 observed behavior includes command-line, UI, upload, REST and GitHub MCP paths; repository-level protection may allow bypass reasons unless delegated-bypass policy and eligibility are verified.

1.2.8.5 planning use=`desired-state and negative-readback specification`; documentation availability does not prove enablement, bypass restriction, alert routing or coverage on `talstilkol/connect`.

### 1.2.9 CISA Secure by Design

1.2.9.1 canonical updated notice=`https://www.cisa.gov/news-events/alerts/2025/01/17/cisa-and-fbi-release-updated-guidance-product-security-bad-practices`.

1.2.9.2 observed update date=`2025-01-17`; observed guidance remains voluntary and emphasizes manufacturer ownership of customer security outcomes, transparency and security across the product lifecycle.

1.2.9.3 planning use=`security-governance and prohibited-practice review`; it does not create a legal certification or substitute for Israel-specific Legal review.

## 1.3 Required Master Plan deltas

1.3.1 Framework registry must replace any stale ASVS pre-5.0, SLSA 1.1-current or pre-`v2026.02.19` OSPS-current assertion; historical versions may remain only with explicit historical status.

1.3.2 Every framework record must bind `frameworkId,version,status,canonicalURL,observedAt,sourceDigestOrTypedAbsence,applicabilityRoot,controlDenominatorRoot,refreshTrigger,expiry,owner`.

1.3.3 Every framework control admitted into the Program must map one-to-one to `Requirement,Threat,Task,Owner,NegativeTest,Evidence,Gate,FailureTerminal` or to an independently approved inapplicability record.

1.3.4 GitHub documentation must be separated from live repository Evidence. `feature documented` cannot satisfy `feature enabled`, `policy enforced`, `bypass restricted`, `alert delivered` or `control effective`.

1.3.5 Public repository hardening must include explicit negative tests for direct push, force push, branch deletion, stale review, last-push approval, missing required check, CODEOWNERS bypass, workflow token escalation, unpinned action, fork/PR secret exposure, push-protection bypass, artifact provenance mismatch and wrong-repository mutation.

1.3.6 Supply-chain planning must distinguish Source provenance, Build provenance, artifact attestation, signature verification, dependency inventory, vulnerability state and release authorization; none may be inferred from another.

1.3.7 Any future claim of ASVS, CSF, SSDF, SLSA, OSPS or Scorecard coverage must be generated from a version-pinned accepted denominator and exact Evidence, with unknown/unavailable retained for missing observations.

## 1.4 Unknowns and blocking inputs

1.4.1 live GitHub plan/feature availability, repository rulesets, bypass actors, Security settings, alert routing, Actions permissions and branch enforcement=`unknown/unavailable` beyond the separate Public visibility readback.

1.4.2 exact source bytes/digests for all dynamic pages, signed publication receipts and trusted provider timestamps=`not captured by this observation`.

1.4.3 Connect conformance to any framework=`0 claims accepted`; independent applicability review and accepted Source Universe remain absent.

1.4.4 legal/compliance applicability for Israel, customer contracts and regulated customer sectors=`requires named Legal authority`; no legal conclusion is made here.

1.4.5 `Gate29=BLOCKED`; development freeze=`ACTIVE`; repository remains `PUBLIC`.
