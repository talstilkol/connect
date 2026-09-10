# 1. Connect — Cyber, AI and supply-chain source refresh supplement

## 1.1 Identity and claim limit

1.1.1 `artifactId=CONNECT-CYBER-AI-AND-SUPPLY-CHAIN-SOURCE-REFRESH-SUPPLEMENT-2026-08-29`.

1.1.2 `supplementVersion=CASSR-1.0-draft`.

1.1.3 observation date=`2026-08-29`; trusted server timestamp=`unknown/unavailable`.

1.1.4 status=`OFFICIAL-SOURCE-OBSERVATION; NOT-INDEPENDENTLY-REVIEWED; NOT-A-COMPLIANCE-OR-IMPLEMENTATION-CLAIM`.

1.1.5 predecessor refresh raw SHA-256=`99165fa78752269a26a21cc0394a81a9345463439961e316db3252f46351ee88`.

1.1.6 every framework below is a bounded planning source. Publication, score, maturity label or threat entry does not prove Connect implementation, provider entitlement, legal compliance or Production readiness.

1.1.7 no Product Code, Build, runtime Test, Git mutation, Push, Deployment, provider/account action, credential use or purchase was performed.

# 2. Official observations

## 2.1 SLSA supply-chain specification

2.1.1 the official [SLSA v1.2 specification](https://slsa.dev/spec/v1.2/) identifies version `1.2` and status `Approved`.

2.1.2 v1.2 includes Build and Source tracks, threat/mitigation material and provenance/Verification Summary attestation formats.

2.1.3 role=`supply-chain integrity specification and attestation model`; it is not a generic application-security verification standard.

2.1.4 decision=`use SLSA v1.2 as the version-pinned source for future Source/Build provenance Requirements; select any claimed Track/Level only after exact GitHub Actions/build-platform Evidence and independent verification`.

2.1.5 current SLSA level for Connect=`unknown/unavailable`; no Track/Level claim is authorized.

## 2.2 OWASP SAMM

2.2.1 the official [OWASP SAMM model](https://owaspsamm.org/model/) presents version `2.0`, five business functions and fifteen security practices.

2.2.2 role=`software-security program maturity and improvement model`; it is not per-release proof and does not replace ASVS/API/AISVS test Requirements.

2.2.3 decision=`use SAMM 2.0 to structure Governance, Design, Implementation, Verification and Operations improvement; record maturity per practice from Evidence rather than assign one marketing score`.

2.2.4 current Connect SAMM maturity=`unknown/unavailable`; no inferred level.

## 2.3 OpenSSF Scorecard

2.3.1 the official [OpenSSF Scorecard page](https://openssf.org/scorecard/) describes an automated set of security heuristics for open-source repositories.

2.3.2 role=`Public-repository hygiene signal and regression input`; a score is not proof of secure code, complete controls or SLSA conformance.

2.3.3 decision=`plan a pinned Scorecard workflow/readback only after GitHub hardening authority; retain individual check Evidence and justified exceptions rather than accept an aggregate score alone`.

2.3.4 current Connect Scorecard result=`unknown/unavailable`; no Action was installed or run.

## 2.4 CISA Secure by Design

2.4.1 CISA’s official [Secure by Demand guide](https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf) distinguishes product security from enterprise security and emphasizes security as a manufacturer responsibility.

2.4.2 role=`secure-by-design principles and procurement questions`; voluntary guidance is not a certification or legal safe harbor.

2.4.3 decision=`map the principles of customer security outcomes, safe defaults and transparency to Product/Operations Requirements; require evidence for every derived control`.

## 2.5 NIST AI RMF and Generative-AI profile

2.5.1 NIST’s [AI Resource Center](https://airc.nist.gov/) states that AI RMF `1.0` is being revised; it remains the current observed core but must have a change monitor.

2.5.2 [NIST AI 600-1](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence), published July 2024, is the final Generative-AI Profile observed.

2.5.3 the Profile is a companion risk-management source for Govern/Map/Measure/Manage activities; it is not an application penetration-test standard.

2.5.4 decision=`use AI RMF 1.0 plus NIST AI 600-1 for AI governance and lifecycle risk; bind version and re-review when the revised AI RMF becomes final`.

2.5.5 NIST IR 8596 Cyber AI Profile remains an initial preliminary draft and is monitoring/delta input only.

## 2.6 NIST adversarial-machine-learning taxonomy

2.6.1 [NIST AI 100-2e2025](https://csrc.nist.gov/pubs/ai/100/2/e2025/final), published March 2025, is a final taxonomy and terminology source for attacks and mitigations.

2.6.2 role=`AI attack taxonomy and common vocabulary`; NIST explicitly does not set Connect’s risk tolerance.

2.6.3 decision=`use its predictive/generative AI attack classes to derive threat cases and red-team assertions; do not convert taxonomy entries directly into PASS claims`.

## 2.7 OWASP GenAI LLM Top 10

2.7.1 the official [OWASP project page](https://owasp.org/www-project-top-10-for-large-language-model-applications/) identifies `OWASP GenAI LLM Top 10 2026` as the current release, published August 4, 2026, with canonical source under `2026/final`.

2.7.2 role=`current awareness/risk list for LLM and GenAI applications`; it complements but does not replace AISVS 1.0, ASVS or requirement-level Tests.

2.7.3 decision=`replace the 2025 awareness baseline in the future source registry with the exact 2026 final source after capture/root verification; preserve 2025 as historical only`.

2.7.4 the separate OWASP Agentic Top 10 2026 remains awareness input for future agentic capabilities; the Pilot’s AI stays human-approval-only and tool/action capability remains OFF unless explicitly activated.

## 2.8 MITRE ATT&CK and ATLAS

2.8.1 the official [MITRE ATT&CK version history](https://attack.mitre.org/resources/versions/) identifies `ATT&CK v19.2`, dated April 28, 2026, as current.

2.8.2 [MITRE ATLAS](https://atlas.mitre.org/) is a living AI-adversary knowledge base covering predictive, generative, agentic and enterprise contexts.

2.8.3 role=`threat intelligence and attack-technique mapping`; neither source is a control certification or proof of complete coverage.

2.8.4 decision=`pin ATT&CK v19.2 and an exact ATLAS data snapshot/root for threat mapping; treat future versions as delta inputs that invalidate affected mappings`.

# 3. Selected framework roles

## 3.1 Governance and program maturity

3.1.1 Governance taxonomy=`NIST CSF 2.0`.

3.1.2 secure-development baseline=`NIST SSDF 1.1 final`; SSDF 1.2 remains draft monitoring until final.

3.1.3 maturity/improvement model=`OWASP SAMM 2.0`.

3.1.4 secure-by-design principles=`CISA Secure by Design`; no pledge/compliance claim.

## 3.2 Product and API verification

3.2.1 Web/application verification=`OWASP ASVS 5.0.0`.

3.2.2 API awareness plus requirement mapping=`OWASP API Security Top 10 2023`; awareness list does not replace ASVS/API tests.

3.2.3 operational baseline=`CIS Controls 8.1`, tailored by explicit implementation group and risk rather than blanket compliance.

## 3.3 AI governance, verification and threats

3.3.1 AI governance=`NIST AI RMF 1.0 + NIST AI 600-1`, both under freshness monitoring.

3.3.2 AI verification=`OWASP AISVS 1.0`.

3.3.3 LLM/agent awareness=`OWASP GenAI LLM Top 10 2026 + Agentic Top 10 2026`.

3.3.4 attack taxonomy/intelligence=`NIST AI 100-2e2025 + exact MITRE ATLAS snapshot`.

## 3.4 Supply chain and repository

3.4.1 provenance/verified-properties source=`SLSA 1.2 Approved`.

3.4.2 repository heuristic/regression source=`OpenSSF Scorecard`; aggregate score alone has zero Gate credit.

3.4.3 threat mapping=`MITRE ATT&CK v19.2`; current-version URLs require captured version/root.

# 4. Required Master-plan consequences

4.1 create versioned Framework records with role, exact source root, effective observation, expiry/change monitor and claim limit.

4.2 create requirement-level crosswalks; framework existence or category coverage never equals implementation.

4.3 separate awareness/taxonomy/maturity/governance/verification/provenance/control roles so one cannot substitute for another.

4.4 add current-version delta Tasks only after the accepted Program registry; mutable sources cannot silently change a Gate.

4.5 require source capture/readback before adopting OWASP GenAI LLM Top 10 2026 or a living ATLAS dataset into an accepted root.

4.6 define Pilot targets only after exact environment and resource Evidence; do not invent SLSA Level, SAMM maturity, Scorecard score or control coverage.

4.7 every derived AI requirement must retain Human approval, minimized data, no automatic side-effect fallback, provider/account/legal entitlement and cost/rate safety.

# 5. Current disposition

5.1 research observations materialized=`8 groups`; independently reviewed=`0/8`; accepted=`0/8`.

5.2 direct control/Requirement crosswalk materialized by this supplement=`0`; framework PASS claims=`0`.

5.3 changed-source observations relative to the predecessor refresh include SLSA 1.2 selection, OWASP GenAI LLM Top 10 2026, ATT&CK v19.2 and expanded AI/supply-chain role separation.

5.4 next safe action=`admit exact captured source bytes/roots through the future Source-universe protocol, then derive reviewed Requirements and Tests`.

5.5 Gate29=`BLOCKED`; development freeze=`ACTIVE`; Product completion/hours/ETA=`unknown/unavailable`.
