# 1. Connect — Manifest מנורמל לממצאי ביקורת Schedule ו־Estimate

## 1.1 זהות וגבולות

1.1.1 מזהה ה־Manifest הוא `CONNECT-MASTER-SCHEDULE-AUDIT-FINDINGS-MANIFEST-2026-08-29-V1`.

1.1.2 מקור הממצאים הוא `/Users/tal/Documents/connect/web/docs/planning/master-plan-schedule-and-estimate-audit-2026-08-29.md`, ‏SHA-256=`35869ec7bbd04eaf5db3f7e6637276bb7d35c7d942f20fc6ab1457c24da95fee`.

1.1.3 נושא הביקורת הוא `/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`, ‏SHA-256 בזמן הקפאת הביקורת=`643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`.

1.1.4 ה־Manifest מכיל בדיוק 26 רשומות: `12 P0`, ‏`9 P1`, ‏`4 P2`, ‏`1 P3`. כל רשומה מייצגת Finding אחד בלבד. אין איחוד לפי כותרת, תחום, תיקון משותף או Dependency משותף.

1.1.5 זהו Artifact תכנוני בלבד. הוא אינו סוגר Finding, אינו מעניק Credit, אינו מסיר את Gate 29 ואינו מאשר Product, Git, Push, Deployment, Provider או שינוי Visibility.

## 1.2 חוזה הרשומה

1.2.1 לכל רשומה יש עשרה שדות מפורשים: `reportLocalId`, ‏`sourceFindingId`, ‏`severity`, ‏`subjectLocator`, ‏`defect`, ‏`scheduleEstimateImpact`, ‏`requiredRemediation`, ‏`acceptancePredicate`, ‏`dependencies`, ‏`semanticDigestInput`.

1.2.2 `reportLocalId` הוא מזהה יציב בתוך דוח הביקורת. אין למחזר אותו, לשנות את משמעותו או להעבירו ל־Finding אחר.

1.2.3 `subjectLocator` הוא Locator מדויק לנושא הפגום. Locator למסמך המקור משתמש ב־Section IDs ולא במספרי שורה משתנים; Locator למצב Git כולל Root מוחלט, Git directory, Branch ו־HEAD שנצפו. האסימונים `PLAN@643d3e…` ו־`AUDIT@35869e…` הם Aliases סגורים בדיוק לנתיב ול־SHA-256 המלאים שב־1.1.3 וב־1.1.2 בהתאמה; הם אינם Prefix matching ואינם מקבלים Artifact אחר בעל אותה תחילית.

1.2.4 `dependencies` הוא מערך JSON מפורש וממוין לקסיקוגרפית של IDs הנדרשים לסגירת ה־Finding. Range notation אסור. הוא אינו מאחד את הרשומה עם Dependency ואינו מעביר אליה Hours או Credit.

1.2.5 `acceptancePredicate` הוא תנאי בינארי. `PASS` מותר רק על Candidate digest קפוא ו־Evidence הקשור לאותו Digest; אחרת התוצאה `FAIL`.

## 1.3 חוזה Semantic digest ללא Merge

1.3.1 לכל רשומה, `semanticDigestInput` הוא Projection מדויק של תשעת שדות התוכן 1–9 לאובייקט UTF-8 שמיוצג ב־JCS לפי RFC 8785 ובמפתחות הבאים: `schema`, ‏`reportLocalId`, ‏`sourceFindingId`, ‏`severity`, ‏`subjectLocator`, ‏`defect`, ‏`scheduleEstimateImpact`, ‏`requiredRemediation`, ‏`acceptancePredicate`, ‏`dependencies`. ערכי המפתחות הם בדיוק תוכן השדה לאחר התווית, ללא נקודת הסיום של Markdown. שדה 10 עצמו אינו חלק מן הקלט.

1.3.2 ערך `schema` הקבוע הוא `CONNECT-SCHEDULE-AUDIT-FINDING/v1`.

1.3.3 `reportLocalId` כלול בקלט ה־Digest ולכן שתי רשומות אינן מתמזגות גם כאשר הן חולקות Locator, Defect class, Remediation או Acceptance. Dedup לפי כותרת, Topic, Embedding, Similarity או Text normalization אסור.

1.3.4 מערך `dependencies` כבר נשמר ממוין לקסיקוגרפית ברשומה ונבדק שאינו מכיל Self-reference או Cycle בין `MSAF` records לפני Canonicalization. כל יתר המחרוזות נשמרות בדיוק כפי שהן ברשומה, לאחר Unicode NFC בלבד. אין השמטת `unknown/unavailable` ואין ירושת שדות.

1.3.5 ה־Digest המחושב אינו נכתב בתוך ה־Manifest עצמו, כדי שלא ליצור Self-reference. Receipt חיצוני רשאי לשמור `SHA-256(JCS(semanticDigestInput))` לכל רשומה ואת Raw SHA-256 של כל הקובץ.

# 2. רשומות P0

## 2.1 `MSAF-20260829-F001`

2.1.1 `reportLocalId`: `MSAF-20260829-F001`.

2.1.2 `sourceFindingId`: `SCHED-F001`.

2.1.3 `severity`: `P0`.

2.1.4 `subjectLocator`: `PLAN@643d3e…:§2.14;§34.15.1;§34.18.1;§34.34.7.1;§34.36.2.2;§35.1.1; boundary §35.5.53.4→§35.7`.

2.1.5 `defect`: סעיף 35.6, שהוגדר כמקור ה־Task Registry הקנוני, אינו קיים; אין רשומות עלה ואין `taskId`.

2.1.6 `scheduleEstimateImpact`: אין מכנה Work, אין DAG, אין סכום Bottom-up, אין Remaining ואין בסיס ל־Gate 29.

2.1.7 `requiredRemediation`: ליצור RegistryManifest ו־Work Registry מלאים לפי חוזה 18 השדות, לפרק את כל ה־Scope לעלים, לקשר Registries משלימים ולבצע QA ושתי ביקורות עצמאיות.

2.1.8 `acceptancePredicate`: `PASS` אם ורק אם Candidate קפוא מכיל §35.6, ‏RegistryManifest בעל Root digest ו־WorkRegistry שאינו ריק, לכל Record יש Task ID ייחודי, ואין Missing או Dangling subordinate registry reference. שלמות 18 השדות וה־Scope נבדקות בנפרד ב־F013 וב־F015.

2.1.9 `dependencies`: `["MSAF-20260829-F002","MSAF-20260829-F011","SOURCE-FREEZE-DIGEST"]`.

2.1.10 `semanticDigestInput`: `JCS-v1(all fields 2.1.1–2.1.9; noMergeKey=MSAF-20260829-F001)`.

## 2.2 `MSAF-20260829-F002`

2.2.1 `reportLocalId`: `MSAF-20260829-F002`.

2.2.2 `sourceFindingId`: `SCHED-F002`.

2.2.3 `severity`: `P0`.

2.2.4 `subjectLocator`: `PLAN@643d3e…:§34.7.3;§34.38.10.10; AUDIT@35869e…:§8.1–§8.4`.

2.2.5 `defect`: Work שמייצר, בודק ומאשר Candidate מתוכנן בתוך אותו Candidate, ולכן נוצר Schedule recursion ואפשרות לאישור עצמי.

2.2.6 `scheduleEstimateImpact`: Candidate יכול לזכות את בנייתו בעצמו, שעות Lifecycle מתערבבות במכנה Product, ו־Digest או מכנה משתנים במהלך Review.

2.2.7 `requiredRemediation`: להפריד `BootstrapRoot B0`, ‏`SubjectCandidate S(n)`, ‏`LifecycleRegistry L(n)` ו־`AcceptanceEnvelope A(n)`; Work של Generation n חייב סמכות מ־B0 או Root מוקדם יותר.

2.2.8 `acceptancePredicate`: `PASS` אם ורק אם bytes של `S(n)` אינם כוללים Work או Receipts שמייצרים/בודקים/מאשרים את `S(n)`, כל Work ב־`L(n)` מוסמך מ־B0 או Generation קטן מ־n, ו־`A(n)` מקדם Pointer באמצעות CAS חיצוני ללא שינוי Subject bytes.

2.2.9 `dependencies`: `["SOURCE-FREEZE-DIGEST","USER-MANDATE-BOOTSTRAP"]`.

2.2.10 `semanticDigestInput`: `JCS-v1(all fields 2.2.1–2.2.9; noMergeKey=MSAF-20260829-F002)`.

## 2.3 `MSAF-20260829-F003`

2.3.1 `reportLocalId`: `MSAF-20260829-F003`.

2.3.2 `sourceFindingId`: `SCHED-F003`.

2.3.3 `severity`: `P0`.

2.3.4 `subjectLocator`: `PLAN@643d3e…:§6–§17↔§34.6.1;§18–§24↔§34.6.2;§25–§31↔§34.6.3;§34.6.5`.

2.3.5 `defect`: סיכומי ROM אינם שווים לסכומי סעיפי המקור: `697–1,216` מול `511–872`, ו־`688–1,154` מול `660–1,104`.

2.3.6 `scheduleEstimateImpact`: כל Envelope או ETA שנגזר מן הסיכומים הוא אריתמטית שגוי עוד לפני Dedup ותלויות.

2.3.7 `requiredRemediation`: להסיר Totals ידניים מהנתיב הקנוני ולהפיק Stage/Scope totals כ־Views של Union על Work IDs ייחודיים ב־Root מאושר.

2.3.8 `acceptancePredicate`: `PASS` אם ורק אם Recalculation עצמאי מאותו Root ומאותו Scope מחזיר בדיוק את כל ה־Min/Max המוצגים, ואין Total פעיל שאין לו Query ו־Digest של Work-ID set.

2.3.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F007","MSAF-20260829-F013"]`.

2.3.10 `semanticDigestInput`: `JCS-v1(all fields 2.3.1–2.3.9; noMergeKey=MSAF-20260829-F003)`.

## 2.4 `MSAF-20260829-F004`

2.4.1 `reportLocalId`: `MSAF-20260829-F004`.

2.4.2 `sourceFindingId`: `SCHED-F004`.

2.4.3 `severity`: `P0`.

2.4.4 `subjectLocator`: `PLAN@643d3e…:§34.7.5–§34.7.7↔§34.8.1–§34.8.3;§34.34.4.4–§34.34.6.21;§34.38.5.3;§34.38.10.10`.

2.4.5 `defect`: טווחים שבוטלו במפורש ממשיכים להופיע כתוצאות פעילות וכבסיס לחישובי שבועות.

2.4.6 `scheduleEstimateImpact`: ניתן לבחור בין Estimates סותרים לאותו Scope; Remaining ו־Calendar claims אינם ניתנים לאמון.

2.4.7 `requiredRemediation`: להעביר Estimates מבוטלים ל־Provenance שאינו Current view, ולהציג Estimate פעיל רק מ־A07 מאושר הקשור ל־Root ול־Scope digest.

2.4.8 `acceptancePredicate`: `PASS` אם ורק אם שום Current/Remaining/ETA view אינו צורך את הטווחים המבוטלים, כל הופעה היסטורית מסומנת Non-canonical, וכל Estimate פעיל מפנה ל־A07, Root ו־Scope digests תקפים.

2.4.9 `dependencies`: `["A07-ACCEPTED-SCHEDULE-SNAPSHOT","MSAF-20260829-F001","MSAF-20260829-F003"]`.

2.4.10 `semanticDigestInput`: `JCS-v1(all fields 2.4.1–2.4.9; noMergeKey=MSAF-20260829-F004)`.

## 2.5 `MSAF-20260829-F005`

2.5.1 `reportLocalId`: `MSAF-20260829-F005`.

2.5.2 `sourceFindingId`: `SCHED-F005`.

2.5.3 `severity`: `P0`.

2.5.4 `subjectLocator`: `PLAN@643d3e…:§34.10;§34.10.11.1`.

2.5.5 `defect`: קיים רצף מילולי של Sections/Gates אך אין DAG ברמת Work leaf ואין Critical path מחושב.

2.5.6 `scheduleEstimateImpact`: אי אפשר לחשב Longest path, Parallelism, Slack, Wait overlap, Near-critical path או ETA.

2.5.7 `requiredRemediation`: ליצור Supergraph typed מ־Tasks, Waits, Gates, Milestones ו־Generation constraints; לבצע Cycle, Reachability ו־Resource-constrained scheduling לכל Scope.

2.5.8 `acceptancePredicate`: `PASS` אם ורק אם לכל Task חובה ב־Scope יש Node יחיד, כל Dependency מתועד ב־Edge typed, אין Cycle או Dangling edge, וכל Scope 1/3/4 מפיק Critical path ו־Schedule snapshot שחוזרים דטרמיניסטית מאותו קלט.

2.5.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F006","MSAF-20260829-F015","MSAF-20260829-F016"]`.

2.5.10 `semanticDigestInput`: `JCS-v1(all fields 2.5.1–2.5.9; noMergeKey=MSAF-20260829-F005)`.

## 2.6 `MSAF-20260829-F006`

2.6.1 `reportLocalId`: `MSAF-20260829-F006`.

2.6.2 `sourceFindingId`: `SCHED-F006`.

2.6.3 `severity`: `P0`.

2.6.4 `subjectLocator`: `PLAN@643d3e…:§34.10.11.2–§34.10.11.3; owner/reviewer fields marked unknown throughout §34–§35`.

2.6.5 `defect`: אין Person, Assignment, CapacityCalendar, Skill eligibility או Mutex Registry; Roles ו־Capacity scenarios משמשים במקום משאבים אמיתיים.

2.6.6 `scheduleEstimateImpact`: חלוקה ידנית ב־30/60/90 שעות מסתירה Over-allocation, Reviewer bottleneck, חופשות, Conflict of interest ו־Environment/File locks.

2.6.7 `requiredRemediation`: ליצור Person/Role/Assignment/CapacityCalendar/Mutex registries עם אנשים שמיים, קיבולת נטו, תוקף, כשירות ואילוצי עצמאות.

2.6.8 `acceptancePredicate`: `PASS` אם ורק אם כל Work/Review leaf מתוזמן לאדם כשיר, כל Calendar ו־Mutex תקף לכל חלון ה־Schedule, אין Resource overallocation או Reviewer conflict, ו־RCPSP validation עובר.

2.6.9 `dependencies`: `["CAPACITY-DECLARATIONS","MSAF-20260829-F001","NAMED-OWNER-ROSTER"]`.

2.6.10 `semanticDigestInput`: `JCS-v1(all fields 2.6.1–2.6.9; noMergeKey=MSAF-20260829-F006)`.

## 2.7 `MSAF-20260829-F007`

2.7.1 `reportLocalId`: `MSAF-20260829-F007`.

2.7.2 `sourceFindingId`: `SCHED-F007`.

2.7.3 `severity`: `P0`.

2.7.4 `subjectLocator`: `PLAN@643d3e…:§34.34.1.3;§34.34.3.2;§34.34.4.3;§34.34.7.4;§34.38.6.5;§2.14;§34.10.11.1`.

2.7.5 `defect`: מניעת ספירה כפולה מתוארת כהבטחה ו־Reserve, אך אין Canonical Work IDs, Aliases או Union evidence.

2.7.6 `scheduleEstimateImpact`: אותה עבודה עלולה להיספר תחת Stage, Package, Finding, Control, Crosswalk ו־Gate; Hours ו־Progress denominator מנופחים.

2.7.7 `requiredRemediation`: להגדיר CanonicalWorkKey, ‏AliasRegistry ו־Scope membership many-to-many; Parent/Alias מקבלים אפס Hours ו־Credit, וכל Total נגזר מ־Union של Work IDs.

2.7.8 `acceptancePredicate`: `PASS` אם ורק אם לכל פעולה ותוצר סמכותי יש Work ID אחד, כל אזכור חלופי הוא Alias עם אפס Hours/Credit, וסכומי כל Views שווים לסכום Union ייחודי עם Duplicate count אפס.

2.7.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F013"]`.

2.7.10 `semanticDigestInput`: `JCS-v1(all fields 2.7.1–2.7.9; noMergeKey=MSAF-20260829-F007)`.

## 2.8 `MSAF-20260829-F008`

2.8.1 `reportLocalId`: `MSAF-20260829-F008`.

2.8.2 `sourceFindingId`: `SCHED-F008`.

2.8.3 `severity`: `P0`.

2.8.4 `subjectLocator`: `PLAN@643d3e…:§34.16.1;§34.16.3;§34.16.6;§34.34.8.1–§34.34.8.3`.

2.8.5 `defect`: אין מכנה Scope מאושר ואין הגדרה ל־Progress weight; Planning, Local completion, Verified execution ו־Gate state עלולים להתערבב.

2.8.6 `scheduleEstimateImpact`: אחוז Completion מספרי יהיה שרירותי ויכול לתת Credit ל־Work מתוכנן, מקומי או חסום חיצונית.

2.8.7 `requiredRemediation`: לפרסם בנפרד PlanningClosure, ‏VerifiedExecution ו־GateReadiness; לקפוא Weight בתוך Root מאושר ולהחזיר `unknown/unavailable` כאשר המכנה חסר.

2.8.8 `acceptancePredicate`: `PASS` אם ורק אם אין Overall blended percent, לכל Metric יש Numerator/Denominator ו־Root/Scope digest, ורק Tasks עם `Credit=1` נכנסים ל־VerifiedExecution.

2.8.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F007","MSAF-20260829-F015","MSAF-20260829-F018"]`.

2.8.10 `semanticDigestInput`: `JCS-v1(all fields 2.8.1–2.8.9; noMergeKey=MSAF-20260829-F008)`.

## 2.9 `MSAF-20260829-F009`

2.9.1 `reportLocalId`: `MSAF-20260829-F009`.

2.9.2 `sourceFindingId`: `SCHED-F009`.

2.9.3 `severity`: `P0`.

2.9.4 `subjectLocator`: `PLAN@643d3e…:header reviewer table+Canonical SHA;§34.20.1–§34.20.2;§34.38.10.3;§34.38.10.8–§34.38.10.10;§35.5`.

2.9.5 `defect`: Gate 29 חסום: 52/52 Findings מקוריים פתוחים, 11/11 Reviews pending, A07/A09 ו־Canonical SHA חסרים ואין אישור Tal ל־Digest המדויק.

2.9.6 `scheduleEstimateImpact`: Freeze נשאר; אין הרשאה להתחיל Product work ואין Baseline שממנו אפשר לפרסם Remaining או ETA.

2.9.7 `requiredRemediation`: להשלים Bootstrap, 35.6, A07, A09, ביקורות עצמאיות, כל Domain approvals, Root digest ו־Tal exact-digest acceptance; כל שינוי פותח Generation חדש.

2.9.8 `acceptancePredicate`: `PASS` אם ורק אם כל 52 ה־Findings המקוריים וכל 26 ממצאי Audit זה הם Closed או Superseded ב־Generation מאושר, 11 Domain approvals תקפים, A07/A09 ושתי ביקורות עצמאיות קשורים לאותו Root, ו־Tal אישר את ה־Digest המדויק.

2.9.9 `dependencies`: `["A07-ACCEPTED-SCHEDULE-SNAPSHOT","A09-FINAL-QA","MSAF-20260829-F001","MSAF-20260829-F002","MSAF-20260829-F003","MSAF-20260829-F004","MSAF-20260829-F005","MSAF-20260829-F006","MSAF-20260829-F007","MSAF-20260829-F008","MSAF-20260829-F010","MSAF-20260829-F011","MSAF-20260829-F012","MSAF-20260829-F013","MSAF-20260829-F014","MSAF-20260829-F015","MSAF-20260829-F016","MSAF-20260829-F017","MSAF-20260829-F018","MSAF-20260829-F019","MSAF-20260829-F020","MSAF-20260829-F021","MSAF-20260829-F022","MSAF-20260829-F023","MSAF-20260829-F024","MSAF-20260829-F025","MSAF-20260829-F026","TAL-EXACT-DIGEST-ACCEPTANCE"]`.

2.9.10 `semanticDigestInput`: `JCS-v1(all fields 2.9.1–2.9.9; noMergeKey=MSAF-20260829-F009)`.

## 2.10 `MSAF-20260829-F010`

2.10.1 `reportLocalId`: `MSAF-20260829-F010`.

2.10.2 `sourceFindingId`: `SCHED-F010`.

2.10.3 `severity`: `P0`.

2.10.4 `subjectLocator`: `PLAN@643d3e…:§34.30.2–§34.30.22;§34.34.2.4–§34.34.2.5;§34.38.2.3;§35.5.40; artifact A05`.

2.10.5 `defect`: ה־Conditional denominator מערבב תשע יכולות Product עם 21 Packages/Allocations, ללא A05 או Package instance list מאושרים.

2.10.6 `scheduleEstimateImpact`: Scope 4/5 יכול להשתנות בדיעבד; Hours, Completion denominator ו־ETA של Conditional work אינם יציבים.

2.10.7 `requiredRemediation`: להפריד PackageTemplate מ־PackageInstance, ליצור Instance רק בעקבות Trigger artifact, ולשייך exact Task/Gate/Scope IDs; Disabled evidence נשאר Base work נפרד.

2.10.8 `acceptancePredicate`: `PASS` אם ורק אם A05 מאושר מונה בנפרד Templates, Allocations ו־Product instances, כל Instance כולל Trigger ו־Scope/Gate/Task sets, ואין Template או Instance לא נבחר במכנה.

2.10.9 `dependencies`: `["A05-ACCEPTED-CONDITIONAL-MANIFEST","MSAF-20260829-F001"]`.

2.10.10 `semanticDigestInput`: `JCS-v1(all fields 2.10.1–2.10.9; noMergeKey=MSAF-20260829-F010)`.

## 2.11 `MSAF-20260829-F011`

2.11.1 `reportLocalId`: `MSAF-20260829-F011`.

2.11.2 `sourceFindingId`: `SCHED-F011`.

2.11.3 `severity`: `P0`.

2.11.4 `subjectLocator`: `GIT-SNAPSHOT-2026-08-29:{outer=/Users/tal/Documents/connect/.git, branch=master, commits=0; app=/Users/tal/Documents/connect/web/.git, branch=codex/cloudflare-evidence-builders, HEAD=93c6b2dfe007f07c43c37389873a8a648a3ff69d, upstream=+0/-0, origin=https://github.com/talstilkol/connect.git}`.

2.11.5 `defect`: שני שורשי Git מקוננים יוצרים סמכות דו־משמעית ל־Path, Status, Base commit, Staging, Diff ו־Digest.

2.11.6 `scheduleEstimateImpact`: משימות ו־Evidence עלולות להימדד מול Repository שגוי; Preflight ו־Public-hardening scope אינם דטרמיניסטיים.

2.11.7 `requiredRemediation`: ליצור RepoAuthorityRegistry, לאשר את `/Users/tal/Documents/connect/web` כשורש היישום הקנוני או לתעד החלטה מדויקת אחרת, לסווג את ה־Outer root ולחייב `repoRootId` בכל משימת Source/Git.

2.11.8 `acceptancePredicate`: `PASS` אם ורק אם Authority record מאושר מזהה Root מוחלט, Git dir, remote, branches ו־HEAD policy; ה־Outer root מסווג במפורש; וכל Git preflight נכשל מחוץ ל־Root המאושר.

2.11.9 `dependencies`: `["REPO-AUTHORITY-OWNER-DECISION"]`.

2.11.10 `semanticDigestInput`: `JCS-v1(all fields 2.11.1–2.11.9; noMergeKey=MSAF-20260829-F011)`.

## 2.12 `MSAF-20260829-F012`

2.12.1 `reportLocalId`: `MSAF-20260829-F012`.

2.12.2 `sourceFindingId`: `SCHED-F012`.

2.12.3 `severity`: `P0`.

2.12.4 `subjectLocator`: `PLAN@643d3e…:§4.7;§5.22;§7.4.1;§7.7.6.1;DS-016; DECISION=/Users/tal/Documents/connect/web/docs/planning/d18-a2-public-repository-security-decision-2026-08-29.md`.

2.12.5 `defect`: התוכנית עדיין מניחה Repository פרטי בניגוד להחלטת D18-A2 להשאירו Public, ואין שרשרת Public-hardening משובצת לפני Push.

2.12.6 `scheduleEstimateImpact`: Scope האבטחה, License, Rulesets, Actions, Scanning ו־Evidence boundary חסרים מן המכנה; כל ETA/A07 קיים אינו קולט את Delta.

2.12.7 `requiredRemediation`: לבטל דרישות Visibility=Private ללא משימת שינוי Visibility; ליצור Work IDs ל־content/history classification, Ruleset/Actions/scanning hardening, License/NOTICE, private Evidence boundary, exact-diff Push permit ו־independent live readback.

2.12.8 `acceptancePredicate`: `PASS` אם ורק אם D18-A2 כלולה ב־Source root, אין Visibility-change task, PublicRepoHardeningGate כולל את כל הבקרות המפורטות, וכל Push עתידי חסום עד Evidence ו־Review תקפים ל־exact diff/branch/remote.

2.12.9 `dependencies`: `["D18-A2-PUBLIC-DECISION","MSAF-20260829-F011"]`.

2.12.10 `semanticDigestInput`: `JCS-v1(all fields 2.12.1–2.12.9; noMergeKey=MSAF-20260829-F012)`.

# 3. רשומות P1

## 3.1 `MSAF-20260829-F013`

3.1.1 `reportLocalId`: `MSAF-20260829-F013`.

3.1.2 `sourceFindingId`: `SCHED-F013`.

3.1.3 `severity`: `P1`.

3.1.4 `subjectLocator`: `PLAN@643d3e…:§2.10;§2.13;§34.30–§34.31;§35.1.3–§35.1.5;§35.5`.

3.1.5 `defect`: חוזה 18 השדות, פעולה יחידה ותקרת שמונה שעות לעלה אינו ממומש; Packages של 12–168 שעות ומשימות מורכבות נשארו Parents נרטיביים.

3.1.6 `scheduleEstimateImpact`: אין Atomic durations אמינים, אין Resource assignment ברמת ביצוע, ו־Critical path או Progress credit עלולים להיקשר ל־Parents.

3.1.7 `requiredRemediation`: לפרק כל Work לעלה בעל פעולה אחת, 18/18 שדות, `0<minMinutes≤maxMinutes≤480`, Product output אחד ו־Evidence output נפרד; Parents ללא Hours/Status/Credit.

3.1.8 `acceptancePredicate`: `PASS` אם ורק אם Schema audit מחזיר 18/18 לכל עלה, Atomicity audit עובר, אין עלה מעל 480 דקות, ואין Parent/Alias עם Estimate, Status או Credit.

3.1.9 `dependencies`: `["MSAF-20260829-F001"]`.

3.1.10 `semanticDigestInput`: `JCS-v1(all fields 3.1.1–3.1.9; noMergeKey=MSAF-20260829-F013)`.

## 3.2 `MSAF-20260829-F014`

3.2.1 `reportLocalId`: `MSAF-20260829-F014`.

3.2.2 `sourceFindingId`: `SCHED-F014`.

3.2.3 `severity`: `P1`.

3.2.4 `subjectLocator`: `PLAN@643d3e…:§34.7.3;§35.5.1–§35.5.52`.

3.2.5 `defect`: 52 משימות Remediation בסך נרטיבי `276–380` שעות אינן ממופות ל־Stage 0 ‏`168–300` באמצעות Work IDs או Aliases.

3.2.6 `scheduleEstimateImpact`: לא ידוע אילו שעות חופפות, נוספות או חסרות; Stage 0 total ו־Critical path אינם תקפים.

3.2.7 `requiredRemediation`: להמיר כל Remediation ל־Work ID ייחודי או Alias מפורש ל־Work קיים ולגזור את Stage 0 מחדש; Reserve אינו תחליף למיפוי.

3.2.8 `acceptancePredicate`: `PASS` אם ורק אם לכל אחת מ־52 משימות המקור יש Mapping אחד ל־Work ID או Alias, Unmapped count ו־Ambiguous count הם אפס, וסכום Stage 0 נגזר מ־Union ללא Reserve לא ממופה.

3.2.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F007","MSAF-20260829-F013"]`.

3.2.10 `semanticDigestInput`: `JCS-v1(all fields 3.2.1–3.2.9; noMergeKey=MSAF-20260829-F014)`.

## 3.3 `MSAF-20260829-F015`

3.3.1 `reportLocalId`: `MSAF-20260829-F015`.

3.3.2 `sourceFindingId`: `SCHED-F015`.

3.3.3 `severity`: `P1`.

3.3.4 `subjectLocator`: `PLAN@643d3e…:§34.34.2.1;§34.34.2.3–§34.34.2.5;§34.34.7.1;§34.34.8.3`.

3.3.5 `defect`: Scope 1, Scope 3 ו־Scope 4 מוגדרים בביטויים טקסטואליים ולא כ־sets ניתנים ל־Enumeration של Task/Gate/Package instances.

3.3.6 `scheduleEstimateImpact`: Work יכול להיכנס או לצאת ללא Delta digest; מכנה Completion, Hours ו־ETA אינו ניתן לשחזור.

3.3.7 `requiredRemediation`: ליצור ScopeManifest versioned לכל Scope עם exact Task/Gate/Package/Wait sets, Exclusion reasons, Disabled-evidence tasks ו־Root digest.

3.3.8 `acceptancePredicate`: `PASS` אם ורק אם Scope 1/3/4 ניתנים ל־Enumeration מלאה, כל Member ו־Exclusion מפנה ל־ID קיים, אין Query טקסטואלי סמוי, ושינוי חברות יוצר version ו־Delta חדשים.

3.3.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F010","MSAF-20260829-F013"]`.

3.3.10 `semanticDigestInput`: `JCS-v1(all fields 3.3.1–3.3.9; noMergeKey=MSAF-20260829-F015)`.

## 3.4 `MSAF-20260829-F016`

3.4.1 `reportLocalId`: `MSAF-20260829-F016`.

3.4.2 `sourceFindingId`: `SCHED-F016`.

3.4.3 `severity`: `P1`.

3.4.4 `subjectLocator`: `PLAN@643d3e…:§34.33.2 X01–X27;§34.33.29;§34.34.3.5;§34.10.11.1–§34.10.11.2`.

3.4.5 `defect`: External waits מתוארים כרשימה ללא Wait IDs, Trigger, Calendar bounds, overlap, expiry או completion receipt בתוך ה־Schedule.

3.4.6 `scheduleEstimateImpact`: Calendar duration אינו ניתן לחישוב; Wait קריטי ללא upper bound הופך את ETA upper ל־`unknown/unavailable`.

3.4.7 `requiredRemediation`: ליצור ExternalWaitRegistry עם Instance נפרד לכל authority/provider event, Trigger Task, owner, min/max duration, overlap, completion Evidence, expiry ו־safe state.

3.4.8 `acceptancePredicate`: `PASS` אם ורק אם כל Wait החל על Scope הוא Node מקושר ב־Supergraph, לכל Wait קריטי יש upper bound או שה־ETA מסומן `unknown/unavailable`, ואין הוספת Wait ידנית אחרי חישוב הנתיב.

3.4.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F006"]`.

3.4.10 `semanticDigestInput`: `JCS-v1(all fields 3.4.1–3.4.9; noMergeKey=MSAF-20260829-F016)`.

## 3.5 `MSAF-20260829-F017`

3.5.1 `reportLocalId`: `MSAF-20260829-F017`.

3.5.2 `sourceFindingId`: `SCHED-F017`.

3.5.3 `severity`: `P1`.

3.5.4 `subjectLocator`: `PLAN@643d3e…:§34.10.11.2`.

3.5.5 `defect`: נוסחת Calendar מחברת Waits ידנית לאחר max של Hours/Role/Longest path ואינה מגדירה חפיפה חלקית, Calendars, Mutexes או Reviewers משותפים.

3.5.6 `scheduleEstimateImpact`: Wait עלול להיספר פעמיים או להישמט; Calendar ETA אינו נגזר מאותו Dependency graph.

3.5.7 `requiredRemediation`: להכניס Wait/Observation Nodes לאותו Supergraph ולהריץ Scheduler שמכבד Dependencies, Calendars, Capacity ו־Mutexes; לבטל Post-hoc addition.

3.5.8 `acceptancePredicate`: `PASS` אם ורק אם Low/High Calendar scenarios נגזרים מאותו Graph, כל Wait overlap מחושב דרך Edges, וכל Resource/Mutex constraint משפיע בתוך ה־Solver ולא בתיקון ידני.

3.5.9 `dependencies`: `["MSAF-20260829-F005","MSAF-20260829-F006","MSAF-20260829-F016"]`.

3.5.10 `semanticDigestInput`: `JCS-v1(all fields 3.5.1–3.5.9; noMergeKey=MSAF-20260829-F017)`.

## 3.6 `MSAF-20260829-F018`

3.6.1 `reportLocalId`: `MSAF-20260829-F018`.

3.6.2 `sourceFindingId`: `SCHED-F018`.

3.6.3 `severity`: `P1`.

3.6.4 `subjectLocator`: `PLAN@643d3e…:§2.11;§34.38;§35.3.1;§35.7`.

3.6.5 `defect`: Planned, admitted, executed, locally completed, proven ו־accepted אינם State dimensions נפרדים.

3.6.6 `scheduleEstimateImpact`: Draft או Rejected work עלול להיכנס למכנה; Local work עלול לקבל Ready credit; Rejected generation עלול לשמר Credit.

3.6.7 `requiredRemediation`: להפריד `recordAdmissionState`, ‏`executionStatus` ו־`creditState`; Credit=1 רק ל־Task בתוך Root מאושר עם Evidence ו־Reviews תקפים.

3.6.8 `acceptancePredicate`: `PASS` אם ורק אם State schema אוכף Draft/Rejected/Superseded מחוץ למכנה, Local completion ללא Ready credit, ו־Credit=1 רק ל־`הושלם ומוכח` ב־Root מאושר עם Acceptance receipt טרי.

3.6.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F013"]`.

3.6.10 `semanticDigestInput`: `JCS-v1(all fields 3.6.1–3.6.9; noMergeKey=MSAF-20260829-F018)`.

## 3.7 `MSAF-20260829-F019`

3.7.1 `reportLocalId`: `MSAF-20260829-F019`.

3.7.2 `sourceFindingId`: `SCHED-F019`.

3.7.3 `severity`: `P1`.

3.7.4 `subjectLocator`: `PLAN@643d3e…:§34.38.10.6;§34.38.10.8–§34.38.10.11; missing §35.6`.

3.7.5 `defect`: תוצאת 692/692 עלים חלה על שני Digests היסטוריים שנדחו, אך עלולה להיקרא כ־Evidence ל־Snapshot הנוכחי שבו 35.6 חסר.

3.7.6 `scheduleEstimateImpact`: Counter היסטורי עלול ליצור מכנה או Completion credit מדומים ולמסך את היעדר Registry נוכחי.

3.7.7 `requiredRemediation`: להעביר את 692/692 ל־Historical provenance הקשור רק ל־Subject digests שנבדקו ולאסור צריכתו בכל Current counter או Gate.

3.7.8 `acceptancePredicate`: `PASS` אם ורק אם כל 692/692 occurrence מסומן Historical+Rejected-digest, Current views מחזירים אפס רשומות קנוניות עד קבלת 35.6 חדש, ואין Credit שחוצה Digest.

3.7.9 `dependencies`: `["HISTORICAL-SUBJECT-DIGESTS","MSAF-20260829-F001","MSAF-20260829-F018"]`.

3.7.10 `semanticDigestInput`: `JCS-v1(all fields 3.7.1–3.7.9; noMergeKey=MSAF-20260829-F019)`.

## 3.8 `MSAF-20260829-F020`

3.8.1 `reportLocalId`: `MSAF-20260829-F020`.

3.8.2 `sourceFindingId`: `SCHED-F020`.

3.8.3 `severity`: `P1`.

3.8.4 `subjectLocator`: `PLAN@643d3e…:§7.4.2;§35.1.3.8;§34.35.8.5`.

3.8.5 `defect`: Review work ועצמאות Reviewers נדרשים בטקסט אך אינם Work leaves עם שעות, אנשים, Capacity או Conflict-of-interest constraints.

3.8.6 `scheduleEstimateImpact`: עומס Reviewer חסר מן Person-hours ומן Critical path; Implementer time עלול לבלוע Review time וליצור אישור עצמי.

3.8.7 `requiredRemediation`: ליצור Review leaf נפרד לכל Review נדרש, עם Reviewer שמי, Estimate, Subject digest predecessor, Independence rule ו־Receipt output.

3.8.8 `acceptancePredicate`: `PASS` אם ורק אם לכל שינוי רגיל/רגיש יש מספר Review leaves כנדרש, Reviewer אינו Implementer ואינו בניגוד עניינים, Hours נספרים בנפרד, וכל Receipt קשור ל־Subject digest הקפוא.

3.8.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F006","MSAF-20260829-F013"]`.

3.8.10 `semanticDigestInput`: `JCS-v1(all fields 3.8.1–3.8.9; noMergeKey=MSAF-20260829-F020)`.

## 3.9 `MSAF-20260829-F021`

3.9.1 `reportLocalId`: `MSAF-20260829-F021`.

3.9.2 `sourceFindingId`: `SCHED-F021`.

3.9.3 `severity`: `P1`.

3.9.4 `subjectLocator`: `PLAN@643d3e…:§34.10.11.5;§34.34.7.6;§35.1.3`.

3.9.5 `defect`: אין ActualLedger או Schema ל־actualStart, actualFinish, effort, queue, rework ו־Estimate revision, אף ש־Actual/Remaining מובטחים.

3.9.6 `scheduleEstimateImpact`: Remaining אינו ניתן לחישוב מ־Actual cut; Rework ו־Queue time נעלמים; Estimate changes אינם ניתנים לביקורת.

3.9.7 `requiredRemediation`: ליצור ActualLedger append-only הקשור ל־Task version, Actor, timestamps, person-effort, queue/rework, Evidence digest ו־asOf; לקשור ETC snapshot ל־Actual cut.

3.9.8 `acceptancePredicate`: `PASS` אם ורק אם כל Actual event הוא append-only ובעל Task version ו־Actor, כל ETC מפנה ל־Actual-cut digest ול־revision reason, ו־Remaining recomputation מאותו Cut מחזיר אותה תוצאה.

3.9.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F018"]`.

3.9.10 `semanticDigestInput`: `JCS-v1(all fields 3.9.1–3.9.9; noMergeKey=MSAF-20260829-F021)`.

# 4. רשומות P2

## 4.1 `MSAF-20260829-F022`

4.1.1 `reportLocalId`: `MSAF-20260829-F022`.

4.1.2 `sourceFindingId`: `SCHED-F022`.

4.1.3 `severity`: `P2`.

4.1.4 `subjectLocator`: `PLAN@643d3e…:all Min/Max estimate fields in §6–§34;§34.10.11;§34.34`.

4.1.5 `defect`: טווחי Min/Max חסרים Method, Basis IDs, Assumptions, Estimator, Confidence, Calibration ו־Correlation contract.

4.1.6 `scheduleEstimateImpact`: אי אפשר לפרש את הטווח כהסתברות או להעריך Bias; חיבור Min/Max מניח Correlation לא מוגדרת.

4.1.7 `requiredRemediation`: ליצור Estimate record עם Method, Basis, Assumptions, Exclusions, Estimator, reviewedAt ו־Confidence label; לא לפרסם P50/P80 ללא Historical calibration.

4.1.8 `acceptancePredicate`: `PASS` אם ורק אם לכל Work leaf בעל Estimate יש Basis record מלא ותקף, Assumptions ו־Exclusions מפורשים, ו־P50/P80 labels אינם קיימים ללא Calibration evidence.

4.1.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F013"]`.

4.1.10 `semanticDigestInput`: `JCS-v1(all fields 4.1.1–4.1.9; noMergeKey=MSAF-20260829-F022)`.

## 4.2 `MSAF-20260829-F023`

4.2.1 `reportLocalId`: `MSAF-20260829-F023`.

4.2.2 `sourceFindingId`: `SCHED-F023`.

4.2.3 `severity`: `P2`.

4.2.4 `subjectLocator`: `PLAN@643d3e…:§34.10;§34.10.11.1–§34.10.11.3`.

4.2.5 `defect`: אין חישוב Total/free float, Near-critical paths, Resource bottlenecks, Mutex queues או Wait sensitivity.

4.2.6 `scheduleEstimateImpact`: אין דרך לזהות Tasks שיכולים להפוך קריטיים, Roles שמעכבים את התוכנית או Wait שהקטנתו משנה ETA.

4.2.7 `requiredRemediation`: להפיק לכל Schedule snapshot Critical ו־Near-critical paths, Float, Role utilization, Mutex queues ו־Top wait sensitivities.

4.2.8 `acceptancePredicate`: `PASS` אם ורק אם Snapshot שניתן לשחזור כולל Critical path, threshold מוגדר ל־Near-critical, total/free float לכל Node, bottleneck utilization ו־ranked wait sensitivity לאותו Root/Capacity digest.

4.2.9 `dependencies`: `["MSAF-20260829-F005","MSAF-20260829-F006","MSAF-20260829-F016","MSAF-20260829-F017","MSAF-20260829-F022"]`.

4.2.10 `semanticDigestInput`: `JCS-v1(all fields 4.2.1–4.2.9; noMergeKey=MSAF-20260829-F023)`.

## 4.3 `MSAF-20260829-F024`

4.3.1 `reportLocalId`: `MSAF-20260829-F024`.

4.3.2 `sourceFindingId`: `SCHED-F024`.

4.3.3 `severity`: `P2`.

4.3.4 `subjectLocator`: `PLAN@643d3e…:§34.34.4.8;§34.34.6.19`.

4.3.5 `defect`: Maintenance ו־Support מוצאים מן הפרויקט, אך recurring work חודשי מוזכר ללא Service Lifecycle Registry ומכנה נפרד.

4.3.6 `scheduleEstimateImpact`: Recurring effort עלול להיעלם מקיבולת תפעול או להתווסף בטעות לאחוז השלמת Build.

4.3.7 `requiredRemediation`: ליצור Service Lifecycle denominator נפרד ל־Patching, Reviews, Restore drills, Source freshness, On-call ו־Cost reviews; לא לערבב אותו עם Product Build.

4.3.8 `acceptancePredicate`: `PASS` אם ורק אם כל recurring obligation הפעילה מופיעה ב־Lifecycle schedule עם Cadence/Owner/Capacity, אינה חברה ב־Build denominator, וקיבולת עתידית מנכה אותה במפורש.

4.3.9 `dependencies`: `["MSAF-20260829-F001","MSAF-20260829-F015","MSAF-20260829-F018","MSAF-20260829-F021"]`.

4.3.10 `semanticDigestInput`: `JCS-v1(all fields 4.3.1–4.3.9; noMergeKey=MSAF-20260829-F024)`.

## 4.4 `MSAF-20260829-F025`

4.4.1 `reportLocalId`: `MSAF-20260829-F025`.

4.4.2 `sourceFindingId`: `SCHED-F025`.

4.4.3 `severity`: `P2`.

4.4.4 `subjectLocator`: `PLAN@643d3e…:§34.10.11.5; Source expiry contracts in §34–§35; Schedule/Capacity/Estimate outputs without validThrough`.

4.4.5 `defect`: Schedule snapshots, Capacity, Calendars ו־Estimates אינם מקבלים `validThrough` או Invalidation triggers הקשורים לשינוי קלט.

4.4.6 `scheduleEstimateImpact`: ETA ישן עלול להמשיך להופיע לאחר שינוי Scope, Actuals, Capacity, Estimate או External wait.

4.4.7 `requiredRemediation`: לשמור בכל Snapshot את `asOf`, ‏Source/Capacity/Scope/Actual-cut digests, ‏`validThrough` ו־Invalidation triggers; שינוי קלט מסמן Stale לפני פרסום.

4.4.8 `acceptancePredicate`: `PASS` אם ורק אם כל Schedule snapshot כולל את כל Digests ושדות התוקף, כל שינוי באחד הקלטים או חלוף `validThrough` מונע הצגתו כ־Current, ו־Recompute יוצר Snapshot version חדש.

4.4.9 `dependencies`: `["MSAF-20260829-F005","MSAF-20260829-F006","MSAF-20260829-F015","MSAF-20260829-F016","MSAF-20260829-F021","MSAF-20260829-F022"]`.

4.4.10 `semanticDigestInput`: `JCS-v1(all fields 4.4.1–4.4.9; noMergeKey=MSAF-20260829-F025)`.

# 5. רשומת P3

## 5.1 `MSAF-20260829-F026`

5.1.1 `reportLocalId`: `MSAF-20260829-F026`.

5.1.2 `sourceFindingId`: `SCHED-F026`.

5.1.3 `severity`: `P3`.

5.1.4 `subjectLocator`: `PLAN@643d3e…:§34.20.2 and document-wide uses of Section/Stage/Gate/Route/Scope as ordering identifiers`.

5.1.5 `defect`: Namespace אנושי מערבב Section, Stage, Gate, Route ו־Scope; לדוגמה “שלב 7/Stage 2” מתאר אותו מעבר.

5.1.6 `scheduleEstimateImpact`: References ו־Dependency mappings עלולים להיקשר לישות הלא נכונה, אף שהפגם אינו לבדו חסם ETA.

5.1.7 `requiredRemediation`: להפריד Human label מ־Canonical IDs מסוג `TASK`, ‏`GATE`, ‏`SCOPE`, ‏`PKG`, ‏`WAIT`, ‏`MILESTONE`, ‏`ROOT`; Machine references משתמשים רק ב־ID.

5.1.8 `acceptancePredicate`: `PASS` אם ורק אם כל Reference מכונה עובר Schema לפי Namespace, אין ID אחד ביותר מסוג אחד, וכל Label עמום ממופה ל־Canonical ID יחיד.

5.1.9 `dependencies`: `["MSAF-20260829-F001"]`.

5.1.10 `semanticDigestInput`: `JCS-v1(all fields 5.1.1–5.1.9; noMergeKey=MSAF-20260829-F026)`.

# 6. בדיקות שלמות מחייבות

## 6.1 Cardinality וייחודיות

6.1.1 מספר הרשומות חייב להיות `26` בדיוק.

6.1.2 קבוצת `reportLocalId` חייבת להיות בדיוק `MSAF-20260829-F001`–`MSAF-20260829-F026`, ללא חור, כפילות או ID נוסף.

6.1.3 קבוצת `sourceFindingId` חייבת להיות בדיוק `SCHED-F001`–`SCHED-F026`, ביחס אחד־לאחד ל־`reportLocalId` בעל אותה סיומת מספרית.

6.1.4 התפלגות Severity חייבת להיות `P0=12`, ‏`P1=9`, ‏`P2=4`, ‏`P3=1`.

## 6.2 Field completeness

6.2.1 לכל רשומה חייבים להופיע כל עשרת השדות פעם אחת בלבד.

6.2.2 `subjectLocator`, ‏`defect`, ‏`scheduleEstimateImpact`, ‏`requiredRemediation` ו־`acceptancePredicate` אינם רשאים להיות ריקים או `unknown/unavailable`.

6.2.3 `dependencies` רשאי לכלול External artifact או החלטה, אך אסור לו לכלול את `reportLocalId` של הרשומה עצמה.

## 6.3 No-merge ו־Digest

6.3.1 לכל רשומה חייב להיות `noMergeKey` השווה בדיוק ל־`reportLocalId` שלה.

6.3.2 אין לקבץ שתי רשומות ל־“אותו נושא” גם כאשר תיקון אחד משרת את שתיהן. Closure, Evidence ו־Credit נבדקים לכל `reportLocalId` בנפרד.

6.3.3 שינוי בכל אחד מתשעת שדות התוכן 1–9 מחייב Semantic digest חדש לרשומה; שינוי Byte בקובץ מחייב Raw file digest חדש ו־Acceptance Envelope חדש.

## 6.4 מצב קבלה

6.4.1 כל 26 הרשומות נוצרו במצב `open-manifested`; מצב זה אינו Finding closure.

6.4.2 קידום רשומה ל־`accepted-closed` דורש Predicate 8 שעבר, Evidence digest, Reviewer עצמאי ו־Root generation מאושר.

6.4.3 פסק הדין נשאר `REJECT-AS-SCHEDULE-BASELINE`, ‏Gate 29 נשאר `BLOCKED`, ואחוז/ETA נשארים `unknown/unavailable` עד סגירת החסמים במכנה מאושר.
