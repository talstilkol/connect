# 1. Connect — Cyber control coverage method and official-source refresh v2

## 1.1 זהות ומגבלת טענה

1.1.1 `artifactId=CONNECT-CYBER-CONTROL-COVERAGE-METHOD-SOURCE-REFRESH-V2-2026-08-30`.

1.1.2 research cutoff=`2026-08-30 Asia/Jerusalem`.

1.1.3 source policy=`official or primary sources only`; Search result, title או current URL אינם accepted source bytes בלי capture, digest ו־freshness.

1.1.4 purpose=`להגדיר דרך סופית, ניתנת לבדיקה ומתעדכנת לכיסוי סיכוני Cyber`; לא לטעון שכל חולשה אפשרית בעולם ידועה.

1.1.5 compliance claims=`0`;accepted controls=`0`;operational evidence=`0`;independent reviews=`0`.

1.1.6 repository=`PUBLIC`;Gate29=`BLOCKED`;development freeze=`ACTIVE`.

1.1.7 לא בוצעו Product code, Build, runtime test, Git/GitHub/provider mutation, scan against live customer data, penetration attempt או purchase.

# 2. היגיון למתחילים

## 2.1 ארבעה סוגי מקור שאסור לבלבל

2.1.1 `Framework` מסדר ניהול סיכונים; הוא אינו אומר אילו שורות קוד בטוחות.

2.1.2 `Threat catalogue` עוזר לשאול מה עלול להשתבש; הוא אינו הוכחה שהאיום קיים או טופל ב־Connect.

2.1.3 `Verification standard` מגדיר מה לבדוק; הוא עדיין דורש Test ו־Evidence בפועל.

2.1.4 `Operational observation` מראה מצב בחשבון, Build או Release מסוימים בלבד; הוא פג כאשר המצב משתנה.

2.1.5 לכן שרשרת תקינה היא `Asset/Flow→Threat→Control Requirement→Implementation Task→Test→Evidence→Independent Review→Release-bound Acceptance`.

2.1.6 רשימת OWASP או ציון Scanner לבדם אינם סוף השרשרת.

# 3. מקורות רשמיים והכרעות שימוש

## 3.1 NIST SP 800-53 ו־800-53A

3.1.1 [NIST SP 800-53 Rev.5 publication page](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final) מתאר קטלוג Security ו־Privacy רחב ומציין Release 5.2.0 מ־27.08.2025.

3.1.2 [NIST SP 800-53 downloads page](https://csrc.nist.gov/Projects/risk-management/sp800-53-controls/downloads) נצפה כשהוא מציג `CURRENT VERSION 5.1`.

3.1.3 שני דפי NIST הרשמיים מציגים metadata שונה; אין לבחור מספר בשקט. נדרש capture של ה־normative publication, supplemental release bytes ו־NIST disposition לפני version pin.

3.1.4 decision=`SP 800-53 משמש Control-catalog source בלבד`; Connect אינו מערכת Federal, אינו מאמץ Baseline שלם אוטומטית ואינו טוען NIST compliance.

3.1.5 [NIST SP 800-53A Rev.5](https://csrc.nist.gov/pubs/sp/800/53/a/r5/final) מספק Assessment methodology ו־procedures; הדף הרשמי מציין Release 5.2.0.

3.1.6 decision=`לכל Control שנבחר נדרש tailored assessment objective, method, evidence type, scope, assessor ו־result`; קיום Control ID בלבד מקבל אפס Credit.

## 3.2 Zero Trust ו־Cloud identity

3.2.1 [NIST SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final) קובע שאין אמון משתמע רק בגלל מיקום רשת או בעלות על Asset, ומתמקד בהגנת Resources.

3.2.2 [NIST SP 800-207A](https://csrc.nist.gov/pubs/sp/800/207/a/final) מרחיב ל־cloud-native access control ומדגיש user, service ו־application identities יחד עם identity-tier ו־network-tier policies.

3.2.3 decision=`כל Web/API/Worker/Queue/Database/Object-store/Provider operation מקבל explicit subject,service,tenant,resource,action,environment and policy decision`; trusted network אינו Authorization.

3.2.4 Connect אינו טוען Zero Trust architecture conformance; נדרשים live identity, policy-enforcement ו־telemetry receipts לכל boundary.

## 3.3 Threat modeling

3.3.1 [OWASP Threat Modeling Project](https://owasp.org/www-project-threat-modeling/) הוא Maintained guidance ומצהיר שאין מתודולוגיית OWASP יחידה ורשמית.

3.3.2 המקור מציע ארבע שאלות: מה בונים, מה עלול להשתבש, מה עושים, והאם עשינו עבודה מספקת.

3.3.3 decision=`Connect משתמש בארבע השאלות כ־process shell`, אך מקפיא Method profile משלו לכל Scope; STRIDE, attack trees, abuse cases, LINDDUN, ATT&CK או ATLAS הם טכניקות נבחרות עם applicability נפרד.

3.3.4 Threat model מתעדכן לכל Feature, data flow, trust-boundary, dependency, provider, identity, data-class, retention, AI-tool או deployment change.

3.3.5 `לא נמצא איום` אינו terminal חוקי אם surface inventory, attacker model או dependency frontier חסרים.

## 3.4 Web verification ו־awareness

3.4.1 [OWASP WSTG](https://wstg.owasp.org/) הוא מדריך לבדיקת Web applications ו־Web services וממליץ על versioned scenario identifiers.

3.4.2 decision=`WSTG stable, עם capture ו־versioned scenario links`, משמש Test-technique source; `latest` או Dev אינו Gate authority.

3.4.3 [OWASP Top 10:2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/) הוא Awareness list עדכני שנצפה; הוא כולל Access control, Misconfiguration, Supply chain, Crypto, Injection, Insecure design, Authentication, Integrity, Logging/Alerting ו־Exceptional conditions.

3.4.4 [OWASP עצמו](https://owasp.org/Top10/2025/0x03_2025-Establishing_a_Modern_Application_Security_Program/) מגדיר Top Ten awareness document; לכן הוא אינו Verification standard ואינו מחליף ASVS/WSTG.

3.4.5 [OWASP API Security Project](https://owasp.org/API-Security/) משמש API risk-awareness source; versioned accepted API list חייב להילכד לפני מיפוי.

3.4.6 decision=`ASVS requirement→WSTG/API technique→Connect-specific test`; Awareness items משמשים inverse gap check בלבד.

## 3.5 Mobile conditional scope

3.5.1 [OWASP MASVS](https://mas.owasp.org/MASVS/) מכסה Storage, Crypto, Auth, Network, Platform, Code, Resilience ו־Privacy ומקשר ל־MASTG ול־MASWE.

3.5.2 המקור מציין שמ־MASVS 2.0.0 אין verification levels ישנים בתוך התקן; אסור להעתיק L1/L2/R היסטוריים כמצב נוכחי.

3.5.3 decision=`MASVS/MASTG/MASWE נשארים CONDITIONAL-DORMANT`; הם נכנסים למכנה רק אם Native mobile Scope מאושר לפי D30.

3.5.4 React responsive Web או PWA אינם Native app ואינם מקבלים MASVS compliance claim.

## 3.6 Privacy Framework

3.6.1 [NIST Privacy Framework](https://www.nist.gov/privacy-framework) מציג Version 1.0 כגרסה הסופית הזמינה.

3.6.2 [Privacy Framework 1.1 page](https://www.nist.gov/privacy-framework/new-projects/privacy-framework-version-11) מציג 1.1 כ־Initial Public Draft ו־Coming soon, עם comment period שנסגר ב־2025.

3.6.3 decision=`Privacy Framework 1.0 הוא reference final`;1.1 הוא change-monitor input בלבד עד Final capture ו־migration review.

3.6.4 Privacy Framework אינו Legal opinion ואינו מחליף Israeli counsel, DPA, records of processing, consent/legitimate-basis analysis או data-subject procedures.

## 3.7 Vulnerability prioritization

3.7.1 [NVD vulnerability metrics](https://nvd.nist.gov/vuln-metrics/cvss) מבהיר ש־CVSS מודד Severity ואינו Risk.

3.7.2 [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) הוא מקור רשמי ל־vulnerabilities שנצפו מנוצלים ומומלץ כקלט לתעדוף.

3.7.3 [FIRST EPSS](https://www.first.org/epss/) מעריך הסתברות לניצול CVE ב־30 הימים הבאים ומתעדכן מדי יום.

3.7.4 [FIRST EPSS FAQ](https://www.first.org/epss/faq.html) מבהיר ש־EPSS אינו Risk score מלא ואינו יודע את ה־Environment, impact או compensating controls של Connect.

3.7.5 decision=`priority=f(asset presence and reachability,KEV,EPSS snapshot,CVSS vector,tenant/data impact,exposure,exploit prerequisites,compensating controls,fix availability,age)`; אין Threshold קשיח עד Security/Product/Operations approval.

3.7.6 missing inventory, stale feed או unresolved package identity נכשל ל־`VULNERABILITY-PRIORITY-UNKNOWN-BLOCKING`, לא ל־Low risk.

## 3.8 Resilience ו־Contingency

3.8.1 [NIST SP 800-34 Rev.1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) מספק Contingency-planning guidance ומקשר Business Impact Analysis, recovery ו־system lifecycle.

3.8.2 age אינו מבטל מקור רשמי, אך מחייב applicability review מול Cloud/SaaS architecture ומקורות Recovery עדכניים של הספקים.

3.8.3 decision=`BIA→RPO/RTO decision→Backup design→immutable evidence→Restore rehearsal→privacy/retention replay→independent result`.

3.8.4 Backup קיים בלי Restore rehearsal ו־exact backup binding אינו Recovery control שעבר.

# 4. Cyber Universe סופי לכל Generation

## 4.1 System model denominator

4.1.1 כל Generation מקפיא Components, processes, stores, queues, identities, trust boundaries, entry points, exit points, admin surfaces, provider callbacks ו־external dependencies.

4.1.2 כל Component מקבל version, owner, environment, tenant boundary, data classes, privileges, network policy, secret dependencies, logs, backups ו־decommission path.

4.1.3 כל Data flow מקבל source, transform, sink, protocol, authentication, authorization, encryption, validation, retry, idempotency, retention, deletion ו־failure terminal.

4.1.4 כל missing Component/Flow/Boundary נשאר `MODEL-INCOMPLETE-BLOCKING`.

## 4.2 Attacker and failure denominator

4.2.1 attacker classes=`anonymous external;authenticated tenant user;cross-tenant user;tenant admin;system admin;compromised collaborator;malicious dependency;compromised CI;provider insider;stolen credential;automated abuse;malicious uploaded content;prompt/content injector`.

4.2.2 non-malicious failure classes=`operator error;partial provider effect;timeout;duplicate;reorder;clock skew;stale cache;partition;quota;schema drift;data corruption;backup gap;restore resurrection;cost exhaustion;dependency outage`.

4.2.3 inclusion ברשימה אינה טענה שהמחלקה קיימת; omission scan חייב לבדוק Actors חדשים הנגזרים מן ה־System model.

4.2.4 לכל Actor/Failure נדרש reachable attack/failure path או rooted non-applicability rationale.

## 4.3 Threat surfaces

4.3.1 surfaces=`browser UI;React state;server actions;HTTP API;webhooks;WhatsApp templates/media;AI prompts/context/output;knowledge upload/parser;database;queue/DLQ;object storage;cache;logs/telemetry;billing;identity;email;CI/CD;dependencies;GitHub Public surfaces;backup/restore;admin/support;export/deletion`.

4.3.2 future surfaces=`Public API;outgoing webhook;connector;Enterprise SSO/SCIM;PWA worker/cache/push;Native mobile` remain dormant until Scope admission.

4.3.3 surface inventory הוא נגזר מה־SourceSet ומהארכיטקטורה, לא מספר ידני קבוע.

## 4.4 Threat-to-control record

4.4.1 required fields=`threatId,subjectRoot,scope,actor,asset,entryPath,trustBoundary,preconditions,attackOrFailureSteps,impact,dataClasses,applicability,sourceIds,controlIds,residualRisk,owner,status,expiry,changeTriggers`.

4.4.2 כל Control record כולל `requirement,testIds,evidenceIds,negativeTests,environment,releaseRoot,owner,reviewer,expiry,revocation,safeState`.

4.4.3 Control בלי Test ו־Evidence נשאר `PLANNED`; Test בלי attack/failure sensitivity נשאר `NON-PROBATIVE`.

4.4.4 Tool result בלי verified reachability, exploitability, environment ו־false-positive disposition אינו סוגר Threat.

# 5. סדר ביצוע Cyber בכל Feature ו־Release

## 5.1 שלבים 1–6

5.1.1 שלב 1 מקפיא Scope, Source roots, architecture ו־data classification.

5.1.2 שלב 2 מפיק System model ו־Data-flow graph בשני Readers.

5.1.3 שלב 3 מפיק Actor, abuse, failure ו־dependency frontier.

5.1.4 שלב 4 ממפה Threat sources ו־Connect-specific paths; אי־ישימות דורשת rationale rooted.

5.1.5 שלב 5 בוחר Controls לפי risk tolerance ו־legal/provider constraints.

5.1.6 שלב 6 מפיק Tasks, Tests, negative tests, Evidence ו־safe-state לכל Control.

## 5.2 שלבים 7–12

5.2.1 שלב 7 מפעיל static analysis, dependency/SBOM, secret, configuration ו־policy checks מול exact root.

5.2.2 שלב 8 מפעיל integration, authorization, tenant-isolation, concurrency, failure, recovery ו־abuse tests.

5.2.3 שלב 9 מפעיל WSTG/manual hostile assessment לפי Scope; automation לבדה אינה מספיקה ל־business logic.

5.2.4 שלב 10 אוסף live environment, identity, network, provider ו־telemetry Evidence.

5.2.5 שלב 11 מבצע independent review, Reconciliation ו־residual-risk approval בידי Role מוסמך.

5.2.6 שלב 12 קושר Acceptance ל־Release root ומגדיר expiry, revocation, incident ו־retest triggers.

# 6. Change monitoring ו־Fail-closed

## 6.1 Triggers

6.1.1 source version, errata, URL bytes, release, threat intelligence, KEV, EPSS, CVSS, dependency, cloud service, Region, contract, law או provider policy change מפעילים source refresh.

6.1.2 code, config, permission, identity, schema, data class, flow, endpoint, queue, bucket, model, prompt, tool, build, artifact או deployment change מפעילים applicability ו־test refresh.

6.1.3 Incident, near miss, control failure, false negative, restore failure או telemetry gap מפעילים Threat model ו־Control redesign.

## 6.2 Safe states

6.2.1 stale/missing Security source אינו מוכיח vulnerability, אך אינו יכול להעניק PASS או Release credit.

6.2.2 missing live identity/network/provider evidence משבית את היכולת המתאימה בלבד כאשר isolation אפשרי; אם boundary משותף, הוא חוסם את Release כולו.

6.2.3 unknown critical-secret coverage חוסם Public Push.

6.2.4 unknown tenant isolation חוסם כל multi-tenant Pilot.

6.2.5 unknown WhatsApp allowance מחזיר effective send allowance=`0`.

6.2.6 unknown AI privacy/tool authority מחזיר AI=`OFF/HUMAN-ONLY`.

# 7. תנאי קבלה ומצב נוכחי

## 7.1 Acceptance predicate

7.1.1 finite frozen System model coverage=`100%`;unmodeled Components/Flows/Boundaries=`0`.

7.1.2 every admitted Threat has one disposition and every accepted Control has root-bound Test+Evidence+owner+reviewer+safe-state.

7.1.3 every selected Framework requirement maps forward to applicable Controls או non-applicability rationale; every Control maps backward to source and Threat.

7.1.4 independent reviewers reproduce denominators, mappings, results ו־release binding.

7.1.5 open planning P0/P1=`0`;runtime planned-open remains open and cannot be mislabeled closed.

7.1.6 exact-root Tal approval and Gate29 are separate from cyber assessment; Gate30, Deploy ו־Production remain separate Gates.

## 7.2 Current state

7.2.1 official-source observations materialized by this artifact=`8 groups`;accepted source captures=`0/8`.

7.2.2 Cyber Universe generation=`ABSENT`;Threat records=`0`;accepted Controls=`0`;operational Evidence=`0`.

7.2.3 NIST SP 800-53 supplemental release metadata conflict=`OPEN-BLOCKING-FOR-VERSION-CLAIM`.

7.2.4 Privacy Framework 1.1=`DRAFT-MONITORING-ONLY`;Native mobile=`OUT-OF-CURRENT-PILOT-SCOPE`.

7.2.5 exact cyber coverage percentage=`unknown/unavailable` until frozen System/Threat/Control denominators exist.

7.2.6 Gate29 blocked;Gate30 not reached;development freeze active;repository PUBLIC;Public Push Permit absent.
