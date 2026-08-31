# 1. Connect — Cyber-framework and Public-repository source refresh

## 1.1 Identity and limits

1.1.1 `artifactId=CONNECT-CYBER-FRAMEWORK-AND-PUBLIC-REPOSITORY-SOURCE-REFRESH-2026-08-29`.

1.1.2 `refreshVersion=CFSR-1.0-draft`.

1.1.3 `checkedDate=2026-08-29`; trusted server timestamp=`unknown/unavailable`.

1.1.4 status=`OFFICIAL-SOURCE-OBSERVATION-MATERIALIZED; NOT-INDEPENDENTLY-REVIEWED; NOT-A-COMPLIANCE-CLAIM`.

1.1.5 this receipt records current documentation observations and planning implications only. It does not prove implementation, assessment, certification, provider entitlement or Production readiness.

1.1.6 no Product Code, Build, runtime Test, Git mutation, Push, Deployment, provider/account mutation, credential use, purchase or Production action was performed.

# 2. Framework version decisions

## 2.1 Governance and secure development

2.1.1 [NIST CSF 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20) remains the selected high-level risk-governance taxonomy; it organizes outcomes and does not prescribe or prove implementation.

2.1.2 [NIST SP 800-218 SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final) remains the current final secure-development baseline observed.

2.1.3 NIST lists SSDF 1.2 as a December 2025 draft on its [SSDF publications page](https://csrc.nist.gov/Projects/ssdf/publications); therefore 1.2 is delta-monitoring input and not a Production Gate until final release plus reviewed migration.

2.1.4 [NIST SP 800-61 Revision 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final), published April 2025, supersedes Revision2 and is the selected Incident-response reference.

2.1.5 [NIST SP 800-63-4](https://csrc.nist.gov/pubs/sp/800/63/4/final), published July 2025, supersedes SP 800-63-3 and is the current observed Digital Identity reference family.

2.1.6 safe rule=`framework existence creates Requirements to assess and map; it never creates a PASS claim`.

## 2.2 Application, API and AI verification

2.2.1 [OWASP ASVS releases](https://github.com/OWASP/ASVS/releases) identify `5.0.0` as the latest stable release observed; bleeding-edge content is preview input only.

2.2.2 ASVS role=`testable Web application/service verification baseline`; Connect target remains Level2 plus explicitly risk-selected Level3 requirements, not a blanket Level3 claim.

2.2.3 [OWASP API Security Top10 2023](https://owasp.org/www-project-api-security/) remains the stable observed API awareness list; it supplements and does not replace requirement-level ASVS mapping.

2.2.4 [OWASP AISVS 1.0](https://owasp.org/www-project-artificial-intelligence-security-verification-standard-aisvs-docs/) is observed as released on 24.06.2026 and is the selected AI-specific verification catalogue when an AI capability is in live scope.

2.2.5 [OWASP Top10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) is an awareness/threat-discovery input for autonomous tool-using systems; it is not proof of AISVS/ASVS conformance.

2.2.6 Connect Pilot AI is Human-approval-only with hosted tools and autonomous side effects OFF; Agentic requirements remain mapped as disabled-state and future-delta controls rather than claimed implemented features.

## 2.3 Operational prioritization

2.3.1 [CIS Controls v8.1 Implementation Groups](https://www.cisecurity.org/controls/implementation-groups) identify 153 Safeguards across the complete v8/v8.1 set and define IG1 as essential cyber hygiene.

2.3.2 planning selection=`IG1 is the minimum organizational baseline before Pilot; additional applicable IG2/IG3 safeguards are selected by threat, data, provider and contractual risk rather than by a blanket maturity claim`.

2.3.3 CIS Controls are a prioritized control catalogue; they do not replace ASVS tests, legal analysis, provider configuration Evidence or independent assessment.

# 3. Public GitHub repository implications

## 3.1 Feature availability and mandatory baseline

3.1.1 GitHub's [repository-security quickstart](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository) documents Code Security and Secret Protection capabilities for Public repositories.

3.1.2 GitHub's [security-and-analysis guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository) recommends at minimum Dependabot alerts, Secret scanning, Push protection and Code scanning for Public repositories.

3.1.3 GitHub documents [Ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) for Public repositories, including required Pull requests/reviews and stale-approval controls.

3.1.4 GitHub documents [Private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting) for Public repositories; this is separate from, and should accompany, a `SECURITY.md` policy.

3.1.5 current Connect live observation remains=`Public as intended; main unprotected; zero Rulesets; Actions-all; no enforced full-SHA pinning; repository Secret scanning/push protection disabled; one open Dependabot alert; verified Code scanning absent`.

3.1.6 because the required GitHub controls are documented as available for the Public case, Public visibility is not a valid reason to defer their planning Gate.

## 3.2 GitHub detection limits that prevent single-control reliance

3.2.1 GitHub's [Secret scanning scope](https://docs.github.com/en/code-security/reference/secret-security/secret-scanning-scope) states that paired credential patterns can require both values in the same file.

3.2.2 the same source states that Push protection can skip a Public-repository Push larger than `50 MB`.

3.2.3 GitHub's [Push protection guidance](https://docs.github.com/en/code-security/concepts/secret-security/push-protection) distinguishes user-level and repository-level protection and documents bypass behavior.

3.2.4 consequence=`GitHub scanning is mandatory but not sufficient`; Connect also requires independent history/worktree scanning, review of large-file/LFS paths, forbidden-content classification, credential rotation on discovery and negative bypass tests.

3.2.5 a local pattern scan is also insufficient because it proves only the implemented patterns; the safe design is layered prevention, detection, response and verified remote readback.

## 3.3 Public repository hardening gate

3.3.1 before any future Push, exact-source tasks must cover Repo-root authority, history/worktree classification, forbidden Public content, Ruleset/branch protection, required reviewers/checks, CODEOWNERS, Actions allowlist and least privilege, full-SHA pins, OIDC where applicable, Secret/Push protection, CodeQL or approved equivalent, dependency alert disposition, `SECURITY.md`, private vulnerability reporting and License/NOTICE Decision.

3.3.2 verification requires positive configuration readback and negative attempts for direct Push, force Push, branch deletion, unreviewed workflow edit, unpinned Action, write-all token, fork Secret exposure, secret-bearing Push and wrong repository root.

3.3.3 failure terminal=`NO PUSH; NO MERGE; NO RELEASE`; repository remains Public unless Tal explicitly supersedes D18-A2.

# 4. Meta source-refresh attempt

## 4.1 Attempt result

4.1.1 attempted official pages=`throughput; platform rate limits; messaging limits; template overview` under `developers.facebook.com/documentation/business-messaging/whatsapp`.

4.1.2 observed terminal=`HTTP 429 Too Many Requests` for all four direct retrieval attempts on 29.08.2026.

4.1.3 no content bytes, revision marker or changed limit were captured; therefore the attempt provides no freshness extension and no permission to alter a numeric Meta limit.

4.1.4 existing local research source=`/Users/tal/Documents/connect/web/docs/whatsapp-rate-limits.md`; recorded verification date=`2026-08-24`; owner=`Tal`.

4.1.5 the local document remains a recent research Baseline, not live account Evidence. Business Portfolio limit, WABA state, Phone throughput, Quality, Templates and active Graph API version remain `unknown/unavailable` until an authorized live observation.

4.1.6 safe state=`new WhatsApp sending remains disabled when the exact live Policy evidence is absent, stale, conflicting or not bound to the selected account/number/release`.

# 5. Required cyber crosswalk behavior

## 5.1 Framework records

5.1.1 each framework receives immutable `frameworkId`, exact version, authority URL, captured content root or explicit unavailable state, effective observation, expiry, change trigger, role classification and claim limit.

5.1.2 role classification is exactly one of `GOVERNANCE|CONTROL-CATALOG|VERIFICATION-STANDARD|TEST-GUIDE|AWARENESS|THREAT-INTELLIGENCE|PROVIDER-GUIDANCE|LEGAL-AUTHORITY`.

5.1.3 a record cannot satisfy a task outside its role: Awareness cannot prove Verification; provider docs cannot prove live entitlement; compliance catalogue cannot prove Legal applicability.

5.1.4 every applicable framework Requirement maps forward to Threat, Control, Task, Test, Evidence and Gate, and every security Task maps inversely to at least one exact Requirement/Threat/Decision source.

5.1.5 `latest` URLs are discovery locators only; Production claims bind exact captured version/content roots.

## 5.2 Refresh and invalidation

5.2.1 refresh triggers include official release, terms/policy update, provider API/version change, Incident, new Data class, new trust boundary, new external integration, new AI tool/action, new region and every planned Release.

5.2.2 source-unavailable does not erase the last observation; it marks Freshness unknown or expired according to policy and enforces the linked safe state.

5.2.3 changed source creates a Delta record, impact set, successor Tasks and protected Gate reopen; it never silently patches accepted Evidence.

# 6. Current disposition

6.1 official-source categories refreshed=`NIST/OWASP/CIS/GitHub`; Meta refresh succeeded=`0/4` because every direct fetch returned 429.

6.2 framework-version selection status=`planning input only; not independently reviewed or accepted`.

6.3 Public-repository hardening status=`0/1 accepted; live controls not ready; repository remains Public`.

6.4 exact Product completion, remaining hours and calendar ETA=`unknown/unavailable`.

6.5 next safe action=`include this receipt in the three-audit/TRD-2 requirement universe; independently reproduce mutable-source observations before any Gate credit`.

6.6 Gate29=`BLOCKED`; development freeze=`ACTIVE`.
