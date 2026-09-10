# 1. Connect — ביקורת אבטחה וסמנטיקה עוינת ל־Master Plan

## 1.1 זהות הביקורת

1.1.1 מזהה הדוח הוא `CONNECT-MASTER-PLAN-SECURITY-SEMANTIC-AUDIT-2026-08-29`.

1.1.2 מושא הביקורת היחיד הוא `/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`.

1.1.3 ה־Raw SHA-256 שנצפה ב־`2026-08-29T15:13:33Z` הוא `643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.1.4 הזהות הפיזית שנצפתה היא `10,425 lines`, ‏`1,059,872 bytes`, ‏UTF-8.

1.1.5 הביקורת היא Read-only כלפי המוצר, Runtime, Git, GitHub, ספקים וחשבונות. לא בוצעו Build, Test Runtime, Commit, Push, Deploy, Migration, Credential use, Provider call, רכישה או שינוי Production.

1.1.6 לא בוצע Browse או רענון אינטרנט במסגרת ביקורת זו. כל טענה דינמית במסמך נשפטה לפי Provenance, Digest, Freshness ו־Human authority שהמסמך עצמו מציג; לא לפי אמון בתוכן הטענה.

1.1.7 קובץ זה הוא Finding report בלבד. הוא אינו תיקון ל־Master, אינו Gate evidence, אינו Approval ואינו אישור לחזרה לפיתוח.

## 1.2 פסק דין

1.2.1 פסק הדין הוא `REJECT`.

1.2.2 `Gate 29=BLOCKED`.

1.2.3 `Development freeze=ACTIVE`.

1.2.4 `Planning materialization permit=NOT ISSUED`.

1.2.5 `Implementation, merge, release, deploy and provider activation authority=NONE`.

1.2.6 סיבת השורש היא שהמסמך מכיל עקרונות הגנה טובים, אך אינו מכיל את Registry העלים שהוא עצמו מגדיר כמקור הביצוע היחיד; אינו יכול להוכיח שרשרת מקור־משפט־Permit; אינו מפריד באופן מוגן את אישור ה־Definition מן ה־Candidate; וכל ה־Reviews, ה־Root digest, הבעלים והראיות החיים עדיין חסרים או לא קבילים.

1.2.7 מניין הממצאים בדוח זה הוא בדיוק `24/24`: ‏`P0=10`, ‏`P1=10`, ‏`P2=4`, ‏`P3=0`.

1.2.8 בנוסף, ה־Master עצמו מצהיר שכל `MP-F001–MP-F052` נשארים `open` או `planned-open`. מתוכם לפחות 20 מסומנים P0 מפורש ללא תנאי קידום, והיתר P1 או בעלי תנאי קידום ל־P0. דוח זה אינו סוגר אף MP-Finding.

# 2. שיטה, גבול ראיה ומדידות עצמאיות

## 2.1 כללי הבדיקה

2.1.1 טענת Design נספרה `DESIGN-PRESENT` בלבד.

2.1.2 טענת Implementation נספרה רק אם קיימים Task leaf, Output, Test, Evidence, Producer, Reviewer, checkedAt, expiry ו־Digest הקשורים לאותו Scope. לא נמצא בסיס כזה ב־Root הנבדק.

2.1.3 תיעוד ספק, חוק, Framework או Marketing page אינו Live entitlement, Contract acceptance, Legal decision או Runtime proof.

2.1.4 `unknown/unavailable`, ‏`pending`, ‏`planned-open`, ‏`digest-pending` או קובץ שאינו קיים אינם מצטרפים ל־Success join.

2.1.5 תיקון טקסטואלי אינו סוגר Finding הדורש Implementation או Evidence חי.

2.1.6 Self-review, Self-approval, Review שנוצר בתוך ה־Candidate שאותו הוא מאשר, או Approval שאינו קשור ל־Root המדויק מקבלים אפס Credit.

## 2.2 תוצאות מבניות שנמדדו

2.2.1 נמצאו בדיוק 52 מזהים ייחודיים `MP-F001–MP-F052`.

2.2.2 נמצאו בדיוק 32 מזהים ייחודיים `TH-001–TH-032`.

2.2.3 נמצאו בדיוק 20 מזהים ייחודיים `CTL-001–CTL-020`.

2.2.4 נמצאו בדיוק 25 מזהים ייחודיים `DS-001–DS-025` ושני מזהים `RG-001–RG-002`.

2.2.5 נמצאו 67 מזהי `FR-*` ייחודיים מתוך Lock מוצהר של 76. המזהים שאינם מופיעים כלל ב־Root הם `FR-044`, ‏`FR-045`, ‏`FR-046`, ‏`FR-047`, ‏`FR-048`, ‏`FR-050`, ‏`FR-051`, ‏`FR-054`, ‏`FR-056`.

2.2.6 אין Heading של `35.6`, ‏`35.8` או `35.9`; המספור עובר מ־`35.5.53.4` ישירות ל־`35.7`.

2.2.7 לכל 20 רשומות CTL יש `positiveTestIds`, ‏`negativeTestIds`, ‏`failureTestIds` ו־`concurrencyTestIds`; אין אפילו שדה אחד בשם `recoveryTestIds`.

2.2.8 לכל 32 רשומות Threat יש Recovery prose, אך אין קישור Recovery test executable אל Task leaf ו־Evidence.

2.2.9 כל 25 רשומות Dynamic source מכילות `response/document digest=unknown/unavailable`.

2.2.10 קובץ ה־Review ההיסטורי שאליו מפנה `34.38.10.5`, ‏`/private/tmp/connect-independent-review-a02a-a04-2026-08-27.md`, לא היה קיים בזמן הביקורת. גם אילו היה קיים, המסמך עצמו מגדיר אותו Checkpoint בלבד ומציין ששני ה־Artifacts שנבדקו נדחו.

2.2.11 Pattern scan מוגבל של מסמך ה־Master מצא אפס PEM private key, אפס GitHub token pattern, אפס AWS access key ואפס Bearer value. שישה Hits גנריים של `sk-` סווגו לאחר בדיקת Context כ־URL slugs כגון `risk-management`, לא כ־OpenAI keys. זו אינה Secret scan מלאה ואינה Gate evidence.

## 2.3 אמת Git מקומית

2.3.1 קיימים שני Git roots: ‏`/Users/tal/Documents/connect/.git` הוא Repository חיצוני ריק ללא Commit, ואילו `/Users/tal/Documents/connect/web/.git` הוא Repository המוצר.

2.3.2 Repository המוצר היה על Branch ‏`codex/cloudflare-evidence-builders`, ‏HEAD ‏`93c6b2dfe007f07c43c37389873a8a648a3ff69d`, עם `origin=https://github.com/talstilkol/connect.git`. נתונים אלה תואמים ל־Baseline שב־Master; אין לדחות אותם על סמך ה־Git root החיצוני.

2.3.3 Worktree המוצר הכיל בזמן המדידה 416 נתיבים: 128 Managed changed ו־288 Untracked. זהו Snapshot חי, לא קביעה אילו שינויים תקינים.

2.3.4 Branch tracking היה מוגדר ל־`origin/codex/cloudflare-evidence-builders` ללא ahead/behind מקומי מוצג. Remote reachability לא אומתה בביקורת זו עקב איסור Browse/Network.

2.3.5 קיום שני Git roots ללא WorkspaceRoot lock הוא סיכון סמנטי: אותו Command יכול למדוד Repository אחר לפי Current working directory.

## 2.4 Candidate חיצוני ל־35.6

2.4.1 נצפה קובץ נפרד `/Users/tal/Documents/connect/web/docs/planning/section-35-6-task-registry-definition-candidate-2026-08-29.md`, ב־Raw SHA-256 ‏`1e3b0a3d64a60108db358d52d98b399e8739e489a3ebb6742e9b10f20ea60beb` בזמן המדידה.

2.4.2 ה־Candidate מוסיף `recoveryTestIds`, שרשרת `MetadataObservation→LegalAssessment→LegalPermit→CapturePermit→AuthorizedCapture→RawDigest→SourceVerification→Parse→SourceUse→SourceSeal`, ‏Review B עיוור ו־DefinitionAcceptance חיצוני.

2.4.3 ה־Candidate מצהיר בעצמו `materialized Task leaves=0`, ‏`accepted Task leaves=0` ו־`DRAFT-NOT-REVIEWED-NOT-ACCEPTED`. הוא אינו חלק מ־Root ה־Master ואינו סוגר שום Finding.

# 3. בקרות תכנוניות חזקות שאינן מקבלות Credit ביצועי

## 3.1 חוזקות מאומתות ברמת טקסט

3.1.1 Fail-closed ו־`unknown/unavailable` מוגדרים נכון כברירת מחדל.

3.1.2 Tenant isolation מתוכנן באמצעות Server-derived tenant context, composite tenant keys, named PostgreSQL principals, FORCE RLS ו־bypass matrix.

3.1.3 Browser boundary מתוכנן כ־React/Vercel BFF same-origin ללא Browser Bearer או Direct Railway, עם Clerk user identity ו־Vercel workload identity נפרדות.

3.1.4 Meta published limits מופרדים נכון מ־Live entitlement; Outbound cap הוא אפס כאשר Snapshot חסר או פג.

3.1.5 One-attempt transport מתכנן exact provider binding, credential-by-revision, durable acquisition, no blind retry ו־unknown-after-attempt.

3.1.6 AI מתוכנן Draft-only, Human-approved, AI-off capable, ללא Tools/MCP/Autonomy ובלא Claim ש־`store:false` הוא ZDR.

3.1.7 File intake מתכנן Quarantine, exact VersionId+checksum, GuardDuty verdict מוגבל, format validation, parser sandbox ו־RAG poisoning controls.

3.1.8 Retention v2 מתוכנן כ־short-lived digest-bound Plan ו־durable cross-provider Saga, ללא Claim atomicity כוזב.

3.1.9 Backup/Restore מתכנן WORM, exact manifest, backupId↔restoreId binding, isolated restore ו־90-day cohort אמיתי.

3.1.10 Supply chain מתכנן SHA-pinned Actions, SBOM, provenance, signature verification ו־clean-checkout promotion.

3.1.11 SSRF/egress מתכנן fixed transports, scheme/host/port validation, redirect recheck וחסימת private/link-local/metadata; Generic URL features נשארים כבויים ללא enforcement.

3.1.12 No-fabrication מופרד לארבע מחלקות מקור אמיתיות/רשמיות/נורמטיביות/Attack-literal, עם איסור `Math.random()`.

3.1.13 אף סעיף 3.1 אינו `implemented`, ‏`verified-live`, ‏`approved` או `ready`; כל אחד נשאר Design claim עד Task/Evidence/Review.

# 4. ממצאי P0

## 4.1 MSSA-F001 — אין Registry עלים קנוני

4.1.1 Evidence: ‏`2.14`, ‏`34.34.7.1`, ‏`35.1.1`, ‏`35.5.1`, והמעבר הישיר מ־`35.5` אל `35.7`.

4.1.2 Defect: המסמך קובע שרק Task leaf בסעיף 35 מורשה לביצוע, אך Section 35.6 אינו קיים ואין Denominator של Tasks.

4.1.3 Impact: אין WBS executable, אין DAG, אין שעות Bottom-up, אין Coverage, אין אחוז, ואין דרך להוכיח שכל סיכון או Gate קיבל עבודה.

4.1.4 Remediation: לשלב Registry מלא של עלים בני עד שמונה שעות עם 18/18 שדות מקומיים, IDs דטרמיניסטיים, zero inherited fields ו־full coverage.

4.1.5 Acceptance: כל Requirement, Decision, Gate, Threat, Control, Finding, Dynamic source, Capability ו־Conditional package ממופים לפחות לעלה אחד; אפס orphan, duplicate, cycle, parent credit או leaf גדול משמונה שעות.

## 4.2 MSSA-F002 — Bootstrap ו־Self-approval אינם מופרדים

4.2.1 Evidence: ‏`34.20`, ‏`34.36.7.4`, ‏`34.38.10.10`, ‏`35.1.1`; אין `presealed Review B`, ‏`VetoSet`, ‏`DefinitionAcceptance` או external protected CAS ב־Root.

4.2.2 Defect: ה־Root אינו מגדיר גבול שבו Candidate, Producer QA, Review A, Review B, Vetoes, Tal approval ו־Gate29 acceptance הם סמכויות חיצוניות שאינן יכולות להיכתב או להיסגר על ידי אותו Candidate.

4.2.3 Impact: Task leaf בתוך ה־Root עלול להעניק לעצמו Credit, להפיק Review לעצמו, לסמן Veto כעבר או ליצור מעגל שבו Gate29 “מאשר” את ה־Task שמאשר את Gate29.

4.2.4 Remediation: Producer QA, presealed blind Review B, Review A, VetoSet, Tal exact-root approval ו־Gate29 DefinitionAcceptance יהיו Attestations חיצוניים ל־Candidate. הם אינם Task leaves, אינם שעות, אינם Status בתוך ה־Root ואינם נכתבים בידי Producer.

4.2.5 Acceptance: Review B envelope נחתם לפני Review A; שני ה־Reviews צורכים אותו Candidate/Evidence root; כל Veto holder הוא אדם שמי ונפרד; protected CAS מפיק `PlanningMaterializationPermit` רק לאחר readback זהה. Missing, stale, conflict, timeout, response loss או ambiguity מסתיימים `REJECTED/BLOCKED` ללא Permit.

## 4.3 MSSA-F003 — Root assembly, Digest ו־Review evidence אינם קבילים

4.3.1 Evidence: Header ‏`Canonical SHA-256=pending-final-QA`; כל 11 Reviewer statuses הם `pending`; ‏`34.38.10.3–10`; ‏`35.5.0.1`; קובץ Review זמני חסר.

4.3.2 Defect: אין A01–A09 root manifest זמין ודיגסטי, אין Canonical digest, אין Reviews על אותם Bytes ואין Receipt עמיד של Approval.

4.3.3 Impact: שינוי Byte, Source delta או החלפת Appendix אינם ניתנים לזיהוי סמכותי; Approval היסטורי עלול לעבור ל־Candidate אחר.

4.3.4 Remediation: Root manifest יחייב absolute durable locations, media type, raw/canonical digest, schema version, producer, reviewed root, checkedAt, expiry ו־supersession לכל A01–A09 ול־Master.

4.3.5 Acceptance: שני parsers בלתי תלויים מפיקים אותו manifest; Reviews A/B נקשרים לאותו Root; כל שינוי Byte מבטל review/approval תלוי; ה־Canonical digest מחושב רק אחרי freeze.

## 4.4 MSSA-F004 — החלטת D18 ב־Master סותרת את D18-A2 העדכנית

4.4.1 Evidence: ‏`4.7`, ‏`5.22`, ‏`7.4.1`, ‏`35.4.10.1` דורשים/מניחים Repository פרטי; ההחלטה העדכנית שסופקה לביקורת היא שה־Repository חייב להישאר Public.

4.4.2 Defect: מקור ההחלטות של ה־Master אינו כולל D18-A2 ואינו מעדכן את Threat model, Supplier/plan assumptions, secret policy, public disclosure posture, artifact-attestation path או Gate 2.

4.4.3 Impact: תוכנית עשויה “לסגור” Governance באמצעות מעבר ל־Private בניגוד להחלטת המוצר, או להשאיר Public repository ללא בקרות מחמירות המתאימות לחשיפה.

4.4.4 Remediation: להוסיף D18-A2 כ־superseding Decision, למחוק דרישת Private, ולעדכן כל Reference, DS-016, Threats, Controls, Tasks, Acceptance, VDP ו־GitHub recovery ל־Public-by-design.

4.4.5 Acceptance: zero stale `private repository required` decisions; Visibility Public מופיעה ב־Scope Manifest וב־live export; כל Secret/customer data path מוכח absent; Gate 2 נבנה עבור Public repository.

## 4.5 MSSA-F005 — אין שרשרת Source→Legal→Permit→Capture אטומית ומחויבת ל־Side effect

4.5.1 Evidence: ‏`35.4.1–13`, ‏`17.6.3`, ‏`17.10`, ‏`35.5.29.5`, ‏`35.7.3.3`; כל Source digest/Legal disposition חי חסר, ו־providerBindingDigest אינו מחייב במפורש Source artifact root, Legal disposition root, SourceUse revision ו־authority epoch.

4.5.2 Defect: המסמך מתאר Freshness ו־Legal gates, אך אינו מגדיר שרשרת רשומות אחת שמחייבת את ה־Permit וה־Attempt בדיוק ל־Source bytes ול־Legal decision ששימשו.

4.5.3 Impact: Terms, account role, geography, rate, consent או Legal applicability יכולים להשתנות בין Review ל־Network; Permit ישן עלול להישאר ניתן לצריכה.

4.5.4 Remediation: השרשרת היחידה תהיה `MetadataObservation→LegalAssessment→LegalPermit→CapturePermit→AuthorizedCapture→RawDigest→SourceVerification→Parse→SourceUse→SourceSeal→CapabilityProfile→PreExecutionCASPermit→Attempt→ProviderFact/Capture`.

4.5.5 Acceptance: כל Permit מחייב exact SourceUse/Legal/Capability roots, effectiveAt, expiresAt ו־authorityEpoch; mutation או expiry בכל שלב מבטלים Permits שלא נוסו; concurrency test מוכיח ש־Delta בזמן Approval/Attempt מנצח את Snapshot הישן.

## 4.6 MSSA-F006 — Recovery אינו Test mode קנוני

4.6.1 Evidence: ‏`35.1.3.10` מחייב רק Positive/Negative/Failure/Concurrency; 20 CTLs מכילים ארבעת השדות; `recoveryTestIds=0`.

4.6.2 Defect: Recovery prose ו־Rollback אינם Test identity, Test execution או Evidence.

4.6.3 Impact: מחיקה, Restore, Unknown outcome, Queue rebuild, Credential recovery, Incident recovery ו־Cutover יכולים לעבור schema completeness בלי Recovery שנוסה.

4.6.4 Remediation: להוסיף `recoveryTestIds` כ־field mandatory לכל Control/Threat/Task/Capability; להוסיף `attackTestIds` למסלולי adversarial. N/A דורש Reviewer עצמאי ואסור ל־irreversible/P0 capability.

4.6.5 Acceptance: לכל Risky Capability קיימים Positive, Negative, Failure, Concurrency ו־Recovery tests נפרדים, עם producer, artifact root, expected terminal, observed result ו־independent review.

## 4.7 MSSA-F007 — אין Registry מדויק לכל Capability/Side-effect Instance

4.7.1 Evidence: ‏`17.16.1–6`, ‏`35.5.8`, ‏`TH/CTL capabilityIds=unknown/unavailable`, ‏`implementationTaskIds=unknown/unavailable`.

4.7.2 Defect: Gate 12 מפוצל לשמות משפחה, אך אין Instance records שמחייבים operation, asset, credential, transport, permit, unknown ledger, owner, tests, kill ו־reachability.

4.7.3 Impact: אישור Send מסוג אחד עלול לדלוף ל־Template submit, Media upload, Billing, Email, Delete או Connector אחר; Control coverage כללי יכול להסתיר Instance חסר.

4.7.4 Remediation: ליצור Registry אחד־לאחד לכל External/irreversible mutation Instance ולכל Disabled capability.

4.7.5 Acceptance: כל reachable callsite שייך ל־Instance אחד; כל Instance מקבל Gate עצמאי ו־five-mode tests; Instance חסר או shared permit משאיר את ה־route unimported/disabled.

## 4.8 MSSA-F008 — X24 לא אושר לשימוש ספציפי

4.8.1 Evidence: ‏`10.16.5`, ‏`13.5.5`, ‏`23.5.7.4`, ‏`34.33.25`, ‏`35.5.21`, ‏`35.5.51`; מצב X24 הוא `unknown/unavailable`.

4.8.2 Defect: Nonce, OAuth/Meta state, CSRF/app session token, PKCE, invitation/recovery capability, HMAC ephemeral key ו־security challenge דורשים CSPRNG, אך אין אישור נפרד לכל Use.

4.8.3 Impact: מסלולי Auth/Onboarding/BFF עלולים להשתמש בערך צפוי, Secret קבוע או API אקראי לא מאושר; לחלופין הם אינם ניתנים למימוש בטוח.

4.8.4 Remediation: Decision נפרד לכל Use עם purpose, primitive, entropy, encoding, TTL, single-use, storage, rotation, revocation, owner, tests ו־expiry. אין `Math.random()` ואין `crypto.randomUUID()` ללא אישור נפרד.

4.8.5 Acceptance: Tal מאשר כל Decision root מדויק בנפרד; source scan מוכיח שאין שימוש אחר; ביטול Decision משבית רק את ה־Use המתאים. אישור Master כללי אינו X24.

## 4.9 MSSA-F009 — Risk acceptance ו־Severity downgrade עמומים

4.9.1 Evidence: ‏`1.8`, ‏`10.17.1`, ‏`31.12.3` אוסרים P0/P1 ביכולת חיה; ‏`29.16.4` אומר ש־downgrade דורש Review עצמאי ו־Risk acceptance.

4.9.2 Defect: הניסוח האחרון מאפשר לפרש Risk acceptance ככלי להורדת Severity במקום כחריג זמני רק לאחר שהסיכון הוכח P2/P3.

4.9.3 Impact: ממצא Critical/High/P0/P1 עלול לעבור Reclassification מנהלי בלי שינוי Exposure, Fix ו־Retest.

4.9.4 Remediation: להפריד `severityReclassification` מ־`riskAcceptance`. Reclassification דורש facts, שני Reviewers, threat evidence ו־retest; Risk acceptance מותר רק לאחר Effective severity P2/P3 ולפי 1.8.

4.9.5 Acceptance: שום Transition מ־P0/P1 ל־accepted/conditional אינו אפשרי; self-approval אסור; immutable history שומר original severity, rationale, reviewers ו־evidence root.

## 4.10 MSSA-F010 — Next.js 16.3.0 נשאר Release blocker

4.10.1 Evidence: ‏`4.10–12`, ‏`7.7.8`, ‏`35.4.8.1`; Read-only בדיקה מקומית מצאה עדיין `next=16.3.0` ו־`eslint-config-next=16.3.0` ב־`web/package.json`.

4.10.2 Defect: לפי Source snapshot של ה־Master עצמו, גרסה זו נמצאת בטווח שתי הודעות Critical וה־safe state הוא Build/Preview/Deploy blocked. ביקורת זו לא רעננה את המקורות באינטרנט ולכן אינה קובעת אם נוצר Patch חדש יותר.

4.10.3 Impact: Build או Rollback לגרסה זו עלולים להחזיר Artifact פגיע; dirty worktree אינו Evidence לתיקון.

4.10.4 Remediation: לאחר Gate29 ו־Gate1 בלבד, לבצע Dependency-only slice אל הגרסה המתוקנת העדכנית שאושרה לאחר official refresh, עם lock graph/reachability/clean-build evidence.

4.10.5 Acceptance: אפס Next מושפע ב־resolved graph, שני Artifacts מאומתים, full regression, advisory mapping ו־rollback artifact מתוקן. עד אז אין Build/Preview/Deploy credit.

# 5. ממצאי P1

## 5.1 MSSA-F011 — Framework lock ו־Requirement crosswalk אינם שלמים

5.1.1 Evidence: ‏`35.3.10`, ‏`35.7.2.0.1`, ‏`35.7.4.5`; Root מציג 39 records מקומיים בלבד, 67 IDs ייחודיים, ותשעה FR IDs כלל אינם מופיעים.

5.1.2 Impact: Framework coverage, Applicability/N/A ו־Control assessment יכולים להיראות מלאים כאשר Requirement-level mappings חסרים.

5.1.3 Remediation/Acceptance: A08/A09 durable lock של `FR001–076`, ‏`RG001–002`, ‏`DS001–025`, exact artifacts/digests/licenses/freshness/mappings/two reviews; gap/duplicate/orphan count אפס.

## 5.2 MSSA-F012 — Dynamic-source evidence אינו Artifact-pinned

5.2.1 Evidence: כל 25 DS records מציגים Digest לא ידוע; live account/plan/region/contract evidence ו־Human reviewers רבים אינם ידועים.

5.2.2 Impact: תאריך בדיקה או URL יכולים להחליף את ה־Bytes, Entitlement, Legal authority או Account state שעליהם החלטה נשענת.

5.2.3 Remediation/Acceptance: exact captured bytes/API exports, digest, scope, human authority, legal disposition, expiry, safe state, delta trigger ו־SourceUse binding לכל DS; source ללא Snapshot תקף אינו נכנס ל־Gate.

## 5.3 MSSA-F013 — שני Git roots ללא Root lock

5.3.1 Evidence: ‏`/connect/.git` ריק ו־`/connect/web/.git` הוא Repository המוצר.

5.3.2 Impact: Script, Reviewer או Operator יכולים לסרוק, לספור, לחתום, לבצע Status או Staging על Repository אחר.

5.3.3 Remediation/Acceptance: כל Planning/QA Task מחייב `workspaceRoot=/Users/tal/Documents/connect/web`, ‏GitDir, remote identity, HEAD ו־path-containment proof; wrong-root negative test נכשל לפני פעולה.

## 5.4 MSSA-F014 — Public GitHub חסר Governance חי

5.4.1 Evidence חי שסופק לביקורת אך טרם ננעל כ־Artifact: Public הוא Intended; ‏`main` אינו protected; ‏rulesets=0; Actions policy רחבה; SHA pinning אינו מוכח; Secret scanning ו־Push protection כבויים; Dependabot alert אחד פתוח; Code scanning לא הוכח.

5.4.2 Impact: שינוי לא־מבוקר, mutable workflow, credential leak או dependency compromise עלולים להגיע ל־default branch ול־release path.

5.4.3 Remediation/Acceptance: לשמור Public; להפעיל Ruleset/PR/review/CODEOWNERS/required checks/no-force-push, full-SHA Actions, minimal permissions/OIDC, secret/push/code/dependency scanning, public-safe data policy ו־live signed export. עד אז merge/release/deploy blocked. הממצא מקודם ל־P0 אם merge או deploy reachable.

## 5.5 MSSA-F015 — Tenant/Auth/BFF controls אינם מוכחים חיים

5.5.1 Evidence: ‏TH-001/017/018 ו־CTL-004/005/006/020 מכילים assets, flows, boundaries, implementationTasks, evidence, owners ו־reviewers לא ידועים; ‏MP-F014/015/020/025/026/051 פתוחים.

5.5.2 Impact: BOLA, stale membership, Preview→Prod, CSRF/XSS session riding, RLS bypass או direct Railway route אינם נשללים.

5.5.3 Remediation/Acceptance: route/trust/session matrix, named roles, X24, Clerk/Vercel live exports, exact OIDC/user envelope, RLS live matrix, direct-ingress denial ו־five-mode recovery suite על אותו Artifact.

## 5.6 MSSA-F016 — Meta/rate/one-attempt controls אינם מוכחים חיים

5.6.1 Evidence: DS-001 digest/Legal/live asset unknown; Tal owns research only; MP-F005–010/029/033 פתוחים; no Capability Instance evidence.

5.6.2 Impact: wrong asset/credential/recipient, stale consent/quality/rate, duplicate attempt, false sent status או blind retry.

5.6.3 Remediation/Acceptance: Test WABA asset graph, exact legal/source chain, live rate snapshots, layered minimum, one-attempt fault matrix, provider/webhook facts, kill/drain/reconciliation ו־Tal policy approval. עד אז Outbound cap=0.

## 5.7 MSSA-F017 — AI ו־File pipeline אינם מוכחים

5.7.1 Evidence: OpenAI Organization/Project/DPA/ZDR/retention evidence חסר; scanner/account/bucket/KMS live proof חסר; MP-F019/027/028/048/050 פתוחים.

5.7.2 Impact: prohibited data use, false ZDR claim, cross-tenant retrieval, malicious file release, parser escape או orphan derived data.

5.7.3 Remediation/Acceptance: AI-off/Upload-off physical absence evidence; live provider/admin exports; Legal classification; AISVS matrix; eval provenance; exact S3/GuardDuty TBAC; parser no-network/resource tests; cascade deletion/recovery. עד אז AI, Upload ו־Knowledge disabled לפי Scope.

## 5.8 MSSA-F018 — Retention/Backup/Restore אינם מוכחים

5.8.1 Evidence: Legal policy/owner/adapters absent; AWS accounts/SCP/KMS/WORM absent; 90-day cohort לא התחיל; MP-F011–013/016/019 פתוחים.

5.8.2 Impact: wrongful deletion, Legal Hold breach, false ransomware/90-day claim, inconsistent restore או resurrection של opt-out/deleted/unknown operations.

5.8.3 Remediation/Acceptance: approved data-class policy, provider-specific deletion saga, legal-hold race tests, WORM account separation, signed manifest, exact restore binding, quarantine after restore, re-deletion ledger ו־real 90-day cohort. Delete adapter ו־GA claim disabled עד Evidence.

## 5.9 MSSA-F019 — Supply-chain, SSRF ו־Deployment enforcement אינם חיים

5.9.1 Evidence: MP-F018/024/025/034–036 פתוחים; DS-004/005/009/010/016 אינם live-pinned; egress packet enforcement, attestation trust anchor, container/TLS, DNS/origin/callback proof חסרים.

5.9.2 Impact: dependency/workflow compromise, wrong Artifact, SSRF/private destination, Preview identity crossing to Production, certificate/callback takeover או rollback פגיע.

5.9.3 Remediation/Acceptance: clean resolved graph, SBOM+provenance+verified signature, fixed-destination adapters, DNS/IP/redirect tests, public GitHub governance, container/TLS proof, composite release manifest ו־external canary/rollback. Generic URL/connectors stay absent.

## 5.10 MSSA-F020 — No-fabrication policy חסר Workflow קנוני

5.10.1 Evidence: ‏`5.4`, ‏`29.5.5`, ‏`35.1.7` נכונים טקסטואלית; ‏MP-F050 נשאר open ואין Test-data provenance registry.

5.10.2 Impact: Artifact אמיתי יכול לשמש מעבר ל־Purpose/Expiry/Tenant, Sandbox יכול להיות מוצג כ־Live, או invented business data יכול לחדור ל־Evidence.

5.10.3 Remediation/Acceptance: Registry לכל test input עם source class, exact digest, data class, approval, purpose, scope, expiry, destruction receipt ו־dependent-results invalidation; `syntheticBusinessEvidenceCount=0`.

# 6. ממצאי P2

## 6.1 MSSA-F021 — זהות Message/Intent/Operation/Attempt אינה חד־משמעית בכל הטקסט

6.1.1 Evidence: ‏`17.1` אומר Message מגיע לניסיון אחד לכל היותר; ‏`16.9.3` ו־`17.11.6` מתארים Retry/new attempt בתנאים שונים.

6.1.2 Impact: Implementer עלול לאכוף uniqueness על Message במקום על immutable provider-attempt lineage, או ליצור “business decision חדש” בלי Intent/Approval מלאים.

6.1.3 Remediation/Acceptance: מילון זהויות פורמלי ו־state machine אחד; כל Provider attempt חדש דורש Intent/Approval/Permit חדשים, והקודם חייב fact מוכח `not-started` או להישאר UNKNOWN ללא retry.

## 6.2 MSSA-F022 — Severity מותנה אינו Machine-readable

6.2.1 Evidence: Risk/Findings משתמשים בטקסט כגון `P1, promoted to P0 if...` וב־`P0 if..., otherwise P1`.

6.2.2 Impact: Parser יכול לבחור Severity נמוך או לא להפעיל Promotion condition.

6.2.3 Remediation/Acceptance: שדות נפרדים `baseSeverity`, ‏`promotionPredicate`, ‏`effectiveSeverity`, ‏`evaluatedAt`, ‏`evidenceRoot`, ‏`reviewers`; unknown predicate מקבל את החומרה הגבוהה.

## 6.3 MSSA-F023 — Source researcher ו־Authority reviewer מעורבבים

6.3.1 Evidence: DS records משתמשים ב־`checkedBy=Codex research` לצד Human/Legal reviewer לא ידוע.

6.3.2 Impact: Retrieval accuracy עלולה להיקרא בטעות Legal applicability, contract acceptance או operational entitlement.

6.3.3 Remediation/Acceptance: להפריד `retrievedBy`, ‏`sourceVerifiedBy`, ‏`legalDispositionBy`, ‏`accountCapabilityVerifiedBy`, ‏`approvedForUseBy`; אדם או Agent אינו ממלא תפקיד שלא הוסמך לו.

## 6.4 MSSA-F024 — Review evidence ב־Temporary storage אינו עמיד

6.4.1 Evidence: ‏`34.38.10.5` מפנה ל־`/private/tmp`; הקובץ לא קיים בזמן הביקורת.

6.4.2 Impact: Digest ללא Bytes אינו ניתן לביקורת, Reproduction או Revocation; Reset מוחק את Chain of custody.

6.4.3 Remediation/Acceptance: כל promoted review מועתק ל־durable workspace evidence store לפני Reference, עם immutable path, bytes, digest, producer, retention, redaction ו־manifest membership. Temporary output הוא navigation hint בלבד.

# 7. ממצאי P3

## 7.1 מניין

7.1.1 `P3=0`.

7.1.2 לא נפתחו Cosmetic findings. כאשר קיימים P0/P1 מבניים, ניסוח או עיצוב שאינם משפיעים על Authority, Safety או Evidence אינם מקבלים עדיפות מלאכותית.

# 8. מטריצת תחומים ויכולת הוכחה

## 8.1 תוצאה לפי תחום

| תחום | Design | Positive/Negative/Failure/Concurrency | Recovery executable | Live evidence | Safe terminal |
|---|---|---|---|---|---|
| Tenant/RLS | חזק | קיים בנרטיב | חסר Task/Test ID | חסר | API/Worker mutation disabled |
| Auth/Clerk/BFF | חזק | קיים בנרטיב | חסר | חסר + X24 | privileged mutations disabled |
| Meta/WhatsApp | חזק | קיים בנרטיב | חסר | Legal/asset/source חסר | Outbound cap 0 |
| Rate/quality | חזק | קיים בנרטיב | חסר | Live entitlement חסר | cap 0/hold |
| One-attempt | חזק | fault prose רחב | חסר Registry | no live provider proof | adapter dormant/no retry |
| AI | חזק | eval/adversarial prose | חסר | account/DPA/Legal חסר | Human-only/AI-off |
| File/RAG | חזק | file/parser/RAG prose | חסר | AWS/scanner חסר | Upload/Knowledge disabled |
| Retention/Delete | חזק | saga/race prose | חסר | Legal/adapters חסר | destructive worker disabled |
| Backup/Restore | חזק | restore/failure prose | חסר | WORM/cohort/live restore חסר | no 90-day/ransomware claim |
| Supply chain | חזק | negative workflow prose | חסר | public governance/attestation חסר | merge/release/deploy blocked |
| SSRF/Egress | חזק | negative/concurrency prose | חסר | packet enforcement חסר | Generic URL/connectors absent |
| Frontend/Deploy | חזק | browser/release prose | חסר | route/OIDC/DNS proof חסר | read-only/disabled mutations |
| No-fabrication | חזק | MP-F050 test prose | destruction recovery חסר | registry חסר | evidence rejected |

8.1.1 מסקנה: אין אפילו Risky capability אחת שעוברת את חמשת מצבי הבדיקה יחד עם Evidence חי ו־Review עצמאי. זה אינו אומר שאין Tests בקוד; פירושו שה־Master Root אינו יכול להוכיח אותם.

# 9. רענון רשמי מתוארך שנדרש לאחר סגירת מבנה התכנון

## 9.1 כלל

9.1.1 ביקורת זו אינה קובעת שמקור השתנה. היא קובעת שאין Artifact digest קביל ולכן חובה לבצע Refresh רשמי לפני Gate הרלוונטי ובכל Expiry/trigger.

## 9.2 קבוצות רענון

9.2.1 `DS-001`: Meta/WhatsApp current terms, ‏23.09.2026 preview delta, role authorization, account acceptance, Graph/API, asset limits, quality, templates, error codes ו־webhooks; Legal+Meta human review; Refresh לפני כל Pilot send, שבועי ב־Pilot ובכל Delta.

9.2.2 `DS-002`: OpenAI models, returned model IDs, shutdown dates, Responses/Data controls, retention/ZDR/MAM/Eyes Off/Safety Retention, Admin controls, DPA/deprecations; לפני AI Gate ושבועי ב־Pilot.

9.2.3 `DS-003–DS-005`: Clerk sessions/MFA/webhooks; Vercel plans/protection/OIDC/firewall; Railway regions/network/PostgreSQL/Redis/BullMQ/backups/advisories; לפני environment/deploy/cutover ובתדירויות שב־Registry.

9.2.4 `DS-006–DS-008`: AWS GuardDuty/S3/KMS region/account/plan/status/policy/Object Lock/key evidence; לפני Upload/Backup/Restore ובכל policy/key change.

9.2.5 `DS-009–DS-010`: Next.js official security releases, resolved dependency graph, GitHub Advisory Database, CISA KEV ו־package metadata; לפני Build/Release ולכל היותר בתוך חלון שבעת הימים שנקבע.

9.2.6 `DS-011–DS-015`: חוקי ותקנות ישראליים לפרטיות, העברה, דיוור, נגישות, מס/חשבונאות; exact legal text + Israeli Legal/Tax/Accessibility authority; לפני Data flow/Billing/Pilot ובכל שינוי דין.

9.2.7 `DS-016`: GitHub Public visibility, owner/plan, rulesets, branch protection, Actions policy, SHA pins, CODEOWNERS, collaborators/2FA, secret/push/code/dependency scanning, attestations ו־recovery; לפני Gate2 וכל release-path change.

9.2.8 `DS-017–DS-024`: Paddle, Stripe, Better Stack, SES, PayPlus, Apple, Google Play ו־Tranzila; official contract/plan/account/API/security/retention/eligibility evidence רק אם ה־Provider/conditional package נכנס ל־Scope.

9.2.9 `DS-025`: exact Browser/OS/PWA/Push support matrix; רק אם Sub-capability נבחרת; אחרת Disabled evidence.

# 10. סדר תיקון תכנוני מחייב

## 10.1 Bootstrap

10.1.1 להקפיא Raw Root, ‏WorkspaceRoot `/web`, D18-A2 ו־24 Findings אלה כ־inputs; אין לשנות את ה־Master הישן בדיעבד.

10.1.2 להגדיר external Definition acceptance, presealed blind Review B, Review A, VetoSet, Tal exact-root approval ו־safe terminals.

10.1.3 להגדיר Source→Legal→Permit→Capture chain ו־X24 external decisions לפני Materialization.

## 10.2 Registry

10.2.1 לאשר את Schema candidate רק אחרי Review; להוסיף mandatory recovery/attack modes.

10.2.2 להפיק Leaf universe מלא מכל Requirements/Decisions/Gates/Threats/Controls/Findings/Sources/Capabilities.

10.2.3 להפיק Capability Instance registry, external waits, mutexes, resources ו־Disabled proofs.

10.2.4 לבצע שני parsers, semantic mutation audit, no-fabrication provenance audit ו־no-self-approval audit.

## 10.3 Sources and crosswalk

10.3.1 לבנות A08 מלא של 76 FR, שני RG ו־25 DS עם exact artifacts/digests/reviews.

10.3.2 לבנות A06/A07 מתוך העלים בלבד; לא להעתיק Counts/Hours ידניים.

10.3.3 לעדכן Public GitHub architecture/governance, Next source snapshot וכל Decision delta.

## 10.4 Final acceptance

10.4.1 Assemble A01–A09 אל Root חדש; להפיק canonical manifest/digest.

10.4.2 להריץ Producer QA ללא self-credit, Review A ו־presealed blind Review B על אותם roots.

10.4.3 לקבל Veto approvals שמיים ו־Tal approval רק ל־Digest המדויק.

10.4.4 protected Gate29 CAS מפיק Planning materialization handoff בלבד. הוא אינו מאשר קוד, Git, Deploy, Credential, Provider, Delete, Billing או X24.

# 11. תנאי קבלה בינריים לדוח תיקון עתידי

## 11.1 תנאים

11.1.1 `MSSA findings closed=24/24` עם evidence ו־independent retest; אין סגירה על בסיס טקסט.

11.1.2 `MP findings disposition=52/52`; כל Planning-integrity P0/P1 נסגר; Implementation risk יכול להישאר planned רק כאשר Capability disabled ומופרדת מן Gate29 bootstrap.

11.1.3 `Task leaves>0` ומכסים 100% מן ה־Universe המאושר; Count נגזר ולא ידני.

11.1.4 `Risky capability five-mode coverage=100%` ו־Recovery evidence קיים לכל Capability.

11.1.5 `FR=76/76`, ‏`RG=2/2`, ‏`DS=25/25`, ‏`TH=32/32`, ‏`CTL=20/20`, ‏`MP-F=52/52`, ללא gap/duplicate/orphan.

11.1.6 `Dynamic source artifact digest known=25/25` או Dynamic API capture עם response digest; Human authority קיים לפי סוג המקור.

11.1.7 D18-A2 Public מופיעה בכל ה־Crosswalks; Public GitHub governance עובר live negative tests.

11.1.8 `Review A root=Review B root=Candidate root=Evidence root`; Review B presealed; Producer/Reviewer/Veto/Acceptance separation עוברת attack test.

11.1.9 Canonical SHA תקף, all named reviewer statuses approved, VetoSet clear ו־Tal מאשר את אותו Digest.

## 11.2 Safe terminal

11.2.1 כל חסר, Stale, Conflict, Ambiguity, timeout, response loss, revoked approval, mismatched digest או unresolved P0/P1 מסתיים ב־`REJECTED/BLOCKED`.

11.2.2 במצב זה Freeze נשאר פעיל; Outbound cap=0; AI off; Upload/Knowledge/Billing/Delete/Generic connectors disabled; Merge/Release/Deploy blocked; Evidence היסטורי אינו מקודם.

# 12. מסקנה סופית

12.1 ה־Master הוא בסיס Design עשיר וזהיר, אך אינו Master executable או approvable בגרסה שנבדקה.

12.2 החולשה המרכזית אינה מחסור בעוד Controls תיאורטיים. החולשה היא חוסר בשרשרת סמכות וראיה שמחברת Source, Legal, Task, Test, Recovery, Reviewer, Veto ו־Acceptance לאותם Bytes ולאותה Capability.

12.3 עד סגירת 24/24 ממצאי דוח זה ו־52/52 הממצאים הקנוניים לפי תנאי הקבלה שלהם, פסק הדין נשאר `REJECT`, ‏Gate29 נשאר `BLOCKED`, ואסור להסיק אחוז התקדמות, ETA סופי או Ready/Production status.
