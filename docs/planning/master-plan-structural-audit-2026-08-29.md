# Connect — ביקורת מבנית עוינת ל־Master Plan

תאריך ביקורת: 29.08.2026  
מסמך נבדק: `/Users/tal/Documents/connect/web/docs/connect-master-execution-plan-2026-08-26.md`  
גרסת המסמך המדווחת: `1.1-draft`  
SHA-256 גולמי שנצפה לקובץ: `643d3e9676130d18c0307d198c0ae7d632f7574eeb51333867f5a9401c642d67`  
הערה: זהו Digest אבחוני של הבתים הנוכחיים בלבד. הוא אינו ה־Canonical digest של התוכנית, שמסומן במסמך `pending-final-QA`.

## 1. פסק דין

1.1 פסק הדין הוא `REJECT — NOT EXECUTABLE`.

1.2 Gate 29 חייב להישאר `BLOCKED`.

1.3 אין כרגע Task Registry קנוני, אין מכנה שעות קנוני, אין DAG קנוני, אין Critical path שניתן להריץ, ואין Lifecycle אפשרי ל־Candidate/Review/Acceptance בלי Self-reference.

1.4 הקפאת הפיתוח שבסעיף 1 נשארת נכונה ובטוחה. מותר להמשיך רק בעבודת תכנון, ביקורת ויצירת Candidate מנותק לפי סעיף 8 בדוח זה.

1.5 חזרה לפיתוח מוצר אינה מותרת לאחר “תיקון סעיף אחד”. היא מותרת רק לאחר סגירת כל P0 המבניים, תיקון כל P1 החוסמים, QA מלא על Candidate קפוא, שתי ביקורות עצמאיות מנותקות, Manifest קבלה חתום ואישור טל לדיגסט המדויק.

1.6 משך העבודה ואחוז ההשלמה עד לפתיחת פיתוח הם `unknown/unavailable`. לפי חוזה המסמך עצמו, אי אפשר לחשב אותם לפני קיום §35.6 מלא ומאושר. כל מספר אחר יהיה המצאה או שימוש ב־ROM שבוטל.

## 2. היקף ושיטת הבדיקה

2.1 נקראו כל 10,425 שורות המסמך, מתחילתו ועד סופו.

2.2 בוצעה סריקה דטרמיניסטית של כל שורה שמתחילה במזהה מספרי היררכי.

2.3 נמצאו 5,164 מזהי סעיפים מספריים.

2.4 נמצאו אפס מזהים מספריים כפולים.

2.5 נמצאו 53 מזהי־הורה חסרים המשפיעים על 212 רשומות־ילד.

2.6 נמצאו 53 קבוצות עם דילוג פנימי: קבוצה אחת היא §35 החסר את §35.6, ועוד 52 קבוצות §35.5.1–§35.5.52 החסרות כל אחת את child מספר 6.

2.7 נבדקו במפורש:

2.7.1 מבנה ומספור.

2.7.2 הפניות פנימיות.

2.7.3 חוזה 18 השדות של Task leaf.

2.7.4 Registries ומכנים מובטחים.

2.7.5 סטטוסים וגרסאות.

2.7.6 תלויות ו־Critical path.

2.7.7 סדר Candidate, Acceptance, CAS, Provider attempt ו־Cutover.

2.7.8 כרונולוגיית Digest, Review וחתימה.

2.8 לא בוצעו Build, Runtime test, Git mutation, Commit, Push, Deploy, שינוי ספק או שינוי חשבון.

2.9 דוחות תחת `/private/tmp` לא הוסקו ולא שוחזרו. זמינותם ותוכנם הנוכחי הם `unknown/unavailable`.

2.10 זהות Git תפעולית שסופקה לביקורת Read-only היא:

2.10.1 ה־repository הקנוני הוא `/Users/tal/Documents/connect/web/.git`.

2.10.2 ה־toplevel הוא `/Users/tal/Documents/connect/web`.

2.10.3 ה־branch הוא `codex/cloudflare-evidence-builders`.

2.10.4 ה־HEAD הוא `93c6b2dfe007f07c43c37389873a8a648a3ff69d`.

2.10.5 ה־upstream הוא `origin/codex/cloudflare-evidence-builders`, במצב שנמסר `+0/-0`.

2.10.6 ה־remote הוא `https://github.com/talstilkol/connect.git`.

2.10.7 `/Users/tal/Documents/connect/.git` הוא Repository חיצוני נפרד וריק ואינו מקור סמכות למוצר.

2.10.8 טענות Branch/HEAD בסעיפים 4.1–4.2 תואמות לזהות ה־repository הפנימי שסופקה. הן אינן נפסלות על בסיס ה־repository החיצוני.

2.11 החלטה מאושרת חדשה שסופקה לביקורת היא `D18-A2`: ה־GitHub repository חייב להישאר `Public`. עצם ה־Public visibility אינה Finding. כל ניסוח שמחייב Private הוא Drift מן ההחלטה; בקרות ההקשחה של Repository ציבורי עדיין חובה.

## 3. סיכום ממצאים

3.1 נמצאו 23 ממצאים עצמאיים בדוח זה.

3.2 חלוקה לפי חומרה:

3.2.1 `P0`: שבעה.

3.2.2 `P1`: עשרה.

3.2.3 `P2`: ארבעה.

3.2.4 `P3`: שניים.

3.3 הספירה אינה כוללת את 52 ממצאי `MP-F001–MP-F052` של התוכנית עצמה. אלה Registry אחר.

## 4. ממצאי P0

### 4.1 P0-001 — §35.6, ה־Task Registry הקנוני, אינו קיים

4.1.1 ראיה:

4.1.1.1 §2.13.1, שורה 66, קובע שרק עלים ייחודיים ב־§35.6 נכנסים לסכום Stage.

4.1.1.2 §35.1.1, שורה 7891, אוסר לבצע משימה שאינה רשומת־עלה ב־§35.

4.1.1.3 §34.18.1, שורה 4167, דורש כיסוי של שלבים 0–28 ועלים בעלי 18/18 שדות.

4.1.1.4 §34.36.2.2, שורה 7627, דורש אימות 18 השדות, Reviewer, זמן של עד שמונה שעות והיעדר שעות Parent.

4.1.1.5 §35.5.1.1, שורה 8555, מודה במפורש שאין עדיין רשומות־עלה מלאות ומאושרות.

4.1.1.6 הילדים הישירים של §35 הם 35.1, 35.2, 35.3, 35.4, 35.5 ו־35.7. §35.6 חסר.

4.1.2 השפעה:

4.1.2.1 מספר עלי §35.6 הכשירים הוא אפס.

4.1.2.2 אין מכנה משימות, שעות, Owners, Reviewers, Predecessors, Outputs, Evidence, Rollback או Status שניתן לחשב.

4.1.2.3 אין DAG, אין Critical path, אין Earliest start ואין דרך למדוד השלמה.

4.1.3 תיקון נדרש:

4.1.3.1 ליצור §35.6 מלא לשלבים 0–28 ולכל חבילה מותנית.

4.1.3.2 כל עלה יקבל בדיוק את 18 השדות שב־§35.1.3, ללא ירושה.

4.1.3.3 כל פעולה תהיה יחידה, עד שמונה שעות, עם Task ID דטרמיניסטי ו־Predecessors שהם Task IDs קיימים בלבד.

4.1.3.4 להפיק parser report שמוכיח אפס חסר, כפול, orphan, cycle, self-edge, output collision ו־double count.

4.1.4 נקודת חידוש מוקדמת: עבודת תכנון יכולה להתחיל מיד; פיתוח מוצר אינו יכול להתחיל לפני Candidate מלא שבו §35.6 עבר QA ו־Gate 29 נסגר.

### 4.2 P0-002 — Lifecycle האישור וה־Digest הוא Self-referential

4.2.1 ראיה:

4.2.1.1 המטא־דאטה בשורות 4, 7 ו־9 כולל בתוך הקובץ גרסה `1.1-draft`, אחד־עשר Reviewers במצב `pending` ו־Canonical digest במצב `pending-final-QA`.

4.2.1.2 §34.36.6.1–§34.36.6.2, שורות 7657–7659, מחריג רק את שורת ה־SHA מן החישוב וקובע ששינוי תו אחר מחייב Digest ו־Review חדשים.

4.2.1.3 §35.3.1, שורה 8301, דורש לקדם את הטקסט מ־`draft` ל־`approved` רק אחרי QA, שני Reviews וחתימת טל.

4.2.1.4 §34.38.10.10, שורה 7881, קובע סדר: Assembly, A09, Reviews, Root SHA ואז אישור טל.

4.2.2 כשל לוגי:

4.2.2.1 אם לאחר Reviews וחתימת טל משנים בתוך הקובץ `draft` ל־`approved` או `pending` ל־`approved`, משתנים הבתים שאושרו.

4.2.2.2 השינוי יוצר Digest חדש, ולכן ה־Reviews והחתימה הקודמים אינם חלים עליו.

4.2.2.3 אם משימות יצירת §35.6, ביקורתו והראיות שלהן הן members או ancestors של אותו Root שהן יוצרות, ה־Root תלוי בעצמו ולא יכול להיסגר.

4.2.3 תיקון נדרש — חוזה Multi-generation מנותק:

4.2.3.1 `Bootstrap Bn`: כתיבת Candidate מתבצעת מכוח הרשאת התכנון של §1.3. היא אינה מקבלת Credit ואינה חברה ב־Root שהיא יוצרת.

4.2.3.2 `Candidate Cn`: מקפיאים bytes בלתי־משתנים ומחשבים `candidateDigest` לפי Canonicalization מוגדר.

4.2.3.3 `Producer QA Qn`: פלט QA מנותק מציין במפורש את `candidateDigest`; הוא אינו משנה את Cn.

4.2.3.4 `Independent reviews Rn.1/Rn.2`: כל Review חותם על `candidateDigest` ועל Digest של QA manifest; Reviewer אינו Producer.

4.2.3.5 `Acceptance manifest Mn`: Manifest חדש ומנותק קושר `candidateDigest`, Digests של כל הראיות והביקורות, policy version, previous accepted digest, החלטה ו־effectiveAt.

4.2.3.6 טל מאשר את ה־Digest המדויק של Mn. אין עריכת Post-signature ל־Cn או Mn.

4.2.3.7 Pointer חיצוני וניתן ל־CAS בשם `current-approved` רשאי לעבור מ־M(n-1) ל־Mn. ה־Pointer אינו חלק מה־Root שהוא מצביע אליו.

4.2.3.8 כל שינוי Byte, Source או Registry יוצר C(n+1). אין Carry-over אוטומטי של QA או חתימות.

4.2.4 נקודת חידוש מוקדמת: רק לאחר שהחוזה המנותק כתוב, נבדק על שתי Generations מלאות, ואין שום ancestor/member שמקבל את עצמו.

### 4.3 P0-003 — Predicate של Gate 29 אינו ניתן להכרעה ועלול ליצור Deadlock

4.3.1 ראיה:

4.3.1.1 §34.18.2, שורה 4169, מתיר ל־P0/P1 להיות `planned-open` לפני Gate 29.

4.3.1.2 §34.20.1, שורה 4189, דורש אפס P0/P1 פתוח “על שלמות התוכנית”.

4.3.1.3 §35.5.0.1, שורה 8545, קובע שכל 52 הממצאים פתוחים או planned-open.

4.3.1.4 §35.5.53.1–§35.5.53.4, שורות 10115–10121, קובע שאין לסגור Finding מתכנון בלבד וש־Gate 29 חסום.

4.3.1.5 בקריאה דטרמיניסטית של שדה החומרה הראשי נמצאו 21 P0 ו־31 P1; לחלק מן ה־P1 יש קידום מותנה ל־P0.

4.3.2 כשל לוגי:

4.3.2.1 אין שדה שמבדיל בין Finding של שלמות התוכנית לבין Finding של Runtime/Product.

4.3.2.2 אם Gate 29 דורש לסגור את כל 52 הממצאים, הוא בלתי־אפשרי: Closure דורש Product artifact ו־live test, אך פיתוח חסום עד Gate 29.

4.3.2.3 אם Gate 29 דורש רק תת־קבוצה, אין Registry שמגדיר את התת־קבוצה ואת תנאי ה־Disposition שלה.

4.3.3 תיקון נדרש:

4.3.3.1 להוסיף לכל Finding שדות `findingClass`, `blocksPlanningGate`, `blocksProductGateIds`, `planningDisposition`, `runtimeDisposition`, `closureEvidenceType` ו־`statusEnumVersion`.

4.3.3.2 לקבוע ש־Gate 29 דורש סגירה מלאה של Findings מבניים בלבד, ו־accepted planning disposition עבור Runtime risks בלי לטעון שהם resolved.

4.3.3.3 להוסיף בדיקה שלילית: סיווג כל 52 כ־Gate29 blockers יוצר Deadlock ונפסל; סיווג Finding מבני כ־Runtime-only גם נפסל.

4.3.4 נקודת חידוש מוקדמת: לאחר ש־Gate 29 מחושב ממאפייני Registry מפורשים ומתקבל אותו Result בשני parsers עצמאיים.

### 4.4 P0-004 — ה־Critical path הגלובלי מקדים את Gate 12.1 ליוצר שלו

4.4.1 ראיה:

4.4.1.1 §34.10.2, שורה 4009, מציב `Gates 1–3 → §§9–12 → Gate 12.1`.

4.4.1.2 §34.10.3–§34.10.4, שורות 4011–4013, מציב לאחר התשתית את §§13–17 ורק בסופם את Trusted outbound.

4.4.1.3 §17.16, שורה 1687, קובע ש־Gate 12.1 מאשר Candidate רדום רק אחרי כל ראיות §17.

4.4.1.4 §17.3, שורה 1481, דורש ל־§17 את Gates 2, 7 ו־9–11.

4.4.2 מסקנה:

4.4.2.1 ה־Critical path ב־§34.10.2 סוגר Gate לפני ביצוע השלב שמייצר אותו.

4.4.2.2 סדר ה־CAS המקומי ב־§17.10.2–§17.10.6 דווקא נכון: Acquire Commit/ReadyForQuery → Consume Commit → Proof והשוואת digest → Decrypt בתוך callback → ניסיון HTTP יחיד.

4.4.2.3 הפרדת `provider-accepted` מ־`sent` ב־§17.11.1–§17.11.1.3 נכונה; `sent` נוצר רק מ־Webhook מאומת.

4.4.2.4 החוזה המקומי אינו ניתן לאכיפה כל עוד ה־DAG הגלובלי הפוך ו־§35.6 חסר.

4.4.3 תיקון נדרש:

4.4.3.1 סדר קנוני: Infra shell → PostgreSQL/RLS → Identity + Meta → Webhook → live capacity → Acquire committed → binding resolved → permit consumed committed → proof committed → vault callback/provider attempt → outcome ledger → Gate 12.1 dormant candidate → רק Gate instance ‏12.2.x המתאים.

4.4.3.2 כל חץ יהפוך ל־Predecessor edge בין Task IDs ב־§35.6.

4.4.4 נקודת חידוש מוקדמת: אין ניסיון Provider ואין Send לפני ש־DAG תקין מוכיח Reachability חד־כיוונית ל־12.1 ול־12.2.x.

### 4.5 P0-005 — שרשרת A01–A09 והמכנים שלה אינם מוגדרים או ניתנים לשחזור

4.5.1 ראיה:

4.5.1.1 §34.38.10.10, שורה 7881, דורש A01–A09, A08 בן 195 רשומות ו־A09 עם 13 Audits.

4.5.1.2 אין במסמך Artifact record שמגדיר ל־A01–A09 `artifactId`, schema, version, producer, input digests, output path, acceptance, reviewers או digest.

4.5.1.3 אין Enumeration של 13 ה־Audits של A09.

4.5.1.4 §35.3.10, שורה 8319, דורש FR-001–FR-076 אך §35.3.8 מכיל רק FR-001–FR-039.

4.5.1.5 §35.7.4.3, שורה 10421, דורש 42 Domain crosswalks ו־52 Finding crosswalks; בפועל מופיעים רק 34 ו־36, ומסומנים Historical partial.

4.5.1.6 §35.7.4.5, שורה 10425, מגדיר 76 FR + 2 RG + 25 DS, כלומר 103 רשומות Lock. בתוספת 32 TH ו־20 CTL מתקבל 155; בתוספת 42 Domains מתקבל 197. המספר 195 אינו נגזר מאף הרכב מפורש.

4.5.2 תמונת Registry נוכחית:

4.5.2.1 Framework: ‏39 מתוך 76 מפורטים מקומית; 37 חסרים.

4.5.2.2 Process: ‏RG-001–RG-002 מופיעים.

4.5.2.3 Dynamic source: ‏25 IDs מופיעים; חמישה records אינם עומדים בסכמה המלאה.

4.5.2.4 Threat: ‏32/32 מופיעים וכל שמות השדות של §35.3.4 קיימים.

4.5.2.5 Control: ‏20/20 מופיעים וכל שמות השדות של §35.3.5 קיימים.

4.5.2.6 Domain crosswalk: ‏34/42 בלבד, Historical partial.

4.5.2.7 Finding crosswalk: ‏36/52 בלבד, Historical partial.

4.5.2.8 Task leaves: אפס רשומות §35.6 כשירות.

4.5.3 תיקון נדרש:

4.5.3.1 ליצור Artifact Registry מפורש ל־A01–A09.

4.5.3.2 לכל Artifact להגדיר סוג, Schema version, Producer שאינו Reviewer, Inputs ודיגסטים, Output path עמיד, Expected count derivation, Acceptance, Freshness, Review receipts ו־Digest.

4.5.3.3 להגדיר אחד־לאחד את 195 הרשומות או לתקן את המספר למכנה שנגזר בפועל. אסור לשמר 195 כ־magic number.

4.5.3.4 למנות את 13 ה־Audits, Inputs, פלטים ותנאי PASS/FAIL שלהם.

4.5.4 נקודת חידוש מוקדמת: לאחר שכל A01–A09 ניתנים להפקה מחדש מנתיבים עמידים, בלי `/private/tmp`, ושני מריצים מקבלים Digests וספירות זהים.

### 4.6 P0-006 — Q23 מכיל שתי החלטות פעילות סותרות

4.6.1 ראיה:

4.6.1.1 §34.28.4.5.1, שורה 4759, קובע שהמספר המרבי הוא `unknown/unavailable` ועד חתימה המכסה אפס.

4.6.1.2 §34.28.4.5.3, שורה 4763, קובע `Pilot live limit fixed at 10 allowlisted contacts`.

4.6.1.3 §34.30.18.1 ו־§34.30.18.8, שורות 5733 ו־5747, חוזרים לקביעה שהמספר אינו ידוע ועד חתימה המכסה אפס.

4.6.2 השפעה: Parser או מפתח יכולים לבחור בטעות Limit=10 לפני Charter חתום, בניגוד ל־Fail-closed.

4.6.3 תיקון נדרש:

4.6.3.1 למחוק את Claim “fixed at 10” או לקשור אותו ל־Decision record חתום בעל version/digest/effectiveAt.

4.6.3.2 מקור האמת היחיד לפני חתימה הוא `cap=0`.

4.6.3.3 להוסיף בדיקה שמכשילה כל שני ערכים פעילים לאותו `limitKey` ו־Scope revision.

4.6.4 נקודת חידוש מוקדמת: יבוא אנשי קשר או Pilot נשארים כבויים עד Charter חתום וערך יחיד שנגזר ממנו.

### 4.7 P0-007 — החלטת D18-A2 Public אינה משולבת וה־Master Plan עדיין מחייב Private

4.7.1 ראיה:

4.7.1.1 החלטה מאושרת שסופקה לביקורת: `D18-A2 = repository remains Public`.

4.7.1.2 §4.7, שורה 100, מכנה את ה־repository פרטי.

4.7.1.3 §34.32.2.2.2, שורה 6291, מגדיר `Private repository` כבקרה.

4.7.1.4 §34.33.20.1, שורה 7171, דורש לאמת Private repo ownership.

4.7.1.5 §35.4.10.1, שורה 8501, מקבע ב־DS-016 ש־private repository exists.

4.7.1.6 §35.5.34.9, שורה 9567, מגדיר Rollback ל־new private repository.

4.7.2 מסקנה: Public עצמו הוא Intent מאושר ואינו חולשה. הממצא הוא ש־Source of truth לא קלט את D18-A2 ולכן Threat model, Rollback, Provider entitlement ו־Evidence contract בנויים על הנחה הפוכה.

4.7.3 תיקון נדרש:

4.7.3.1 להוסיף D18-A2 לרשם ההחלטות, לכל Crosswalk ול־§35.6.

4.7.3.2 להחליף בקרת “Private” בבקרות Public-repository: אפס Secrets/PII/history exposure, protected `main`, required reviews/checks, CODEOWNERS, least-privilege Actions, full-SHA pins, OIDC, signed artifacts, scanning, incident/rotation ו־offsite recovery.

4.7.3.3 לשנות Rollback כך שישיב ל־Public repository מאומת ובטוח; שינוי Visibility דורש החלטה חדשה ואינו Rollback אוטומטי.

4.7.4 נקודת חידוש מוקדמת: Gate 29 אינו נסגר לפני Delta מלא של D18-A2; Merge/Release נשארים חסומים עד Gate 2 live evidence.

## 5. ממצאי P1

### 5.1 P1-001 — היררכיית §35.5 שבורה באופן שיטתי

5.1.1 נמצאו 53 הורים חסרים ו־212 ילדים ללא הורה.

5.1.2 §35.5.0.1–§35.5.0.4 קיימים ללא §35.5.0.

5.1.3 בכל MP-F001–MP-F052 קיימים §35.5.n.6.1–§35.5.n.6.4 ללא §35.5.n.6.

5.1.4 דוגמה: שורות 8565–8571 מכילות §35.5.1.6.1–§35.5.1.6.4 בלי §35.5.1.6.

5.1.5 תיקון: ליצור את 53 ההורים או לשטח את הילדים; לאחר מכן להריץ parent/gap/order scan. נקודת חידוש: לפני Candidate freeze.

### 5.2 P1-002 — הפניות קנוניות מצביעות לסעיפים שאינם קיימים

5.2.1 §33.7, שורה 3819, מפנה לחבילת §35.8 הקנונית, אך המסמך מסתיים ב־§35.7.

5.2.2 Q62 והחבילה Notification מפנים ל־§35.8.21 בשורות 5079, 5083, 5441, 5449 ובמופעים סמוכים; §35.8.21 אינו קיים.

5.2.3 §35.4.8.1.2, שורה 8437, מפנה למשימות §35.6.2.19–§35.6.2.31; הטווח כולו אינו קיים.

5.2.4 תיקון: ליצור את החבילות והעלים או להחליף כל Reference ל־Task IDs קנוניים קיימים. נקודת חידוש: PWA/Push/Next remediation אינם נפתחים לפני אפס dangling references.

### 5.3 P1-003 — שימוש חוזר ב־Gate 6 המקוצר לאחר איסור מפורש

5.3.1 §11.15.5, שורה 845, אוסר להשתמש ב־`Gate 6` בלי 6.1, 6.2 או 6.3.

5.3.2 הפרות נמצאו ב־§13.3 שורה 995; §14.3 שורה 1107; §24.3 שורה 2501; §25.3 שורה 2645; §26.3 שורה 2753; §34.31.3.2 שורה 6027; §34.33.5.7 שורה 6943.

5.3.3 תיקון: להחליף כל Range או shorthand ברשימת Gate IDs מפורשת וב־applicability condition. נקודת חידוש: לפני בניית DAG.

### 5.4 P1-004 — סטטוסי Framework/Threat/Control מפרים את ה־enum של עצמם

5.4.1 §35.3.2, שורה 8303, מגדיר תשעה סטטוסים מותרים.

5.4.2 §35.3.7, שורה 8313, משתמש ב־`source-verified/digest-pending`, שאינו ערך מותר.

5.4.3 §35.7.4.4, שורה 10423, מחייב `planned-open` לכל Threat/Control, שגם הוא אינו ערך מותר.

5.4.4 תיקון: לבחור enum יחיד לכל record type, לאסור compound status string ולהפריד axes כגון `sourceState`, `implementationState`, `evidenceState`, `approvalState`. נקודת חידוש: לפני Registry export/A09.

### 5.5 P1-005 — חמישה מתוך 25 Dynamic-source records חסרים שדות חובה

5.5.1 הסכמה ב־§35.4.1, שורה 8323, מחייבת 15 שדות מפורשים.

5.5.2 `DS-021`, שורה 8525, חסר `effectiveAt`, `expiresAt`, `changeTriggers`.

5.5.3 `DS-022`, שורה 8529, חסר `effectiveAt`, `checkedBy`, `expiresAt`, `lastRefreshResult`, `changeTriggers`.

5.5.4 `DS-023`, שורה 8531, חסר אותם חמישה שדות.

5.5.5 `DS-024`, שורה 8533, חסר `effectiveAt`, `expiresAt`, `changeTriggers`.

5.5.6 `DS-025`, שורה 8537, חסר `effectiveAt`, `expiresAt`.

5.5.7 תיקון: להוסיף ערך מפורש לכל שדה; ערך לא ידוע יהיה `unknown/unavailable`, לא השמטה. נקודת חידוש: לפני 25/25 PASS.

### 5.6 P1-006 — אומדנים שבוטלו מוחזרים כאילו חושבו מחדש

5.6.1 §34.7.2–§34.7.8, שורות 3955–3967, מבטל 448–800, ‏2,611–5,044, ‏460–788, ‏3,071–5,832, ‏180–360, ‏3,251–6,192 והמרות Calendar, וקובע שרק A05/A07 רשאים לתת אומדן קנוני.

5.6.2 §34.34.4.4–§34.34.5.4, שורות 7373–7391, מחזיר בדיוק את אותם טווחים ואת המרות השבועות.

5.6.3 §2.13.1, שורה 66, קובע שרק עלי §35.6 נספרים; §35.6 אינו קיים.

5.6.4 תיקון: לסמן את כל המספרים כ־Historical/Non-canonical בלבד עד A07, ולאחר מכן לחשב Bottom-up מעל Task IDs ייחודיים. נקודת חידוש: אין לפרסם שעות Remaining או אחוז לפני §35.6+Gate 1.

### 5.7 P1-007 — נוהל הגרסה הנוכחי מנסה לשדרג שוב מ־0.9 ל־1.0

5.7.1 הכותרת, שורה 4, מגדירה מסלול פעיל `1.1-draft → 1.1-approved`.

5.7.2 §34.36.6.3–§34.36.6.4, שורות 7661–7663, עדיין דורש `0.9 → 1.0` ומכנה את תוצר הנוהל “מסמך 1.0”.

5.7.3 תיקון: להפוך את הנוהל לגרסאי ודטרמיניסטי עבור `candidateVersion`, ולא לקודד מעבר היסטורי. נקודת חידוש: לפני Candidate הבא.

### 5.8 P1-008 — שמות Gate חופשיים ממשיכים להופיע לאחר שנאסרו

5.8.1 §34.35.2.3, שורה 7491, קובע ששמות חופשיים אינם Gate IDs.

5.8.2 דוגמאות פעילות: `Native conditional gate` ב־DS-022/DS-023, שורות 8529/8531; `Recurring conditional Gate`, שורה 9839; `Multi-region conditional Gate`, שורה 9869; `Native conditional Gate`, שורה 9899; `Certification conditional Gate`, שורה 9929; `Provider/Legal Delta Gate`, שורה 10395.

5.8.3 תיקון: להקצות לכל אחד ID מספרי לפי Gate registry, עם Scope revision ו־predecessors. נקודת חידוש: לפני DAG/A07.

### 5.9 P1-009 — Live GitHub governance אינו עומד עדיין בחוזה Public המאושר

5.9.1 עובדות Read-only שסופקו לביקורת: `main` אינו מוגן; `rulesets=0`; Actions policy מאפשרת הכול; Actions אינם pinned ל־full SHA; Secret scanning ו־Push protection כבויים; קיימת התראת Dependabot פתוחה אחת; אין Code scanning מאומת.

5.9.2 ה־export המדויק, checkedAt/digest וה־alert details לא צורפו למסמך ולכן פרטים נוספים הם `unknown/unavailable`.

5.9.3 Public visibility אינה ממצא. הממצא הוא היעדר בקרות Supply-chain הנדרשות דווקא כאשר Source ו־Workflows גלויים.

5.9.4 תיקון: להגדיר Ruleset ל־main, required PR/reviews/checks, CODEOWNERS, deny force-push/delete, least-privilege Actions allowlist, full-SHA pins, OIDC, Secret/Push protection, Dependabot disposition ו־verified code scan או חלופה מאושרת.

5.9.5 נקודת חידוש: אין Merge, Release או Deployment לפני Live export, negative bypass tests ו־Gate 2.

### 5.10 P1-010 — שני Git roots יוצרים סיכון לראיה מן Repository הלא נכון

5.10.1 ה־repository הקנוני הוא `/Users/tal/Documents/connect/web`; ה־repository החיצוני `/Users/tal/Documents/connect` נפרד וריק.

5.10.2 ללא Root contract, Audit עלול לדווח Branch, HEAD, Worktree, untracked count, diff או clean state מן ה־root הלא נכון.

5.10.3 תיקון: להוסיף ל־A01 ולכל Script `expectedRepoRoot`, `expectedGitDir`, `expectedRemote`, `expectedHead/branch policy`, ולחסום אם `git rev-parse --show-toplevel` אינו הנתיב הקנוני. אין להשתמש ב־outer repo כ־fallback.

5.10.4 נקודת חידוש: לפני כל Git/CI/evidence audit, גם Read-only.

## 6. ממצאי P2

### 6.1 P2-001 — ל־Finding statuses אין State machine או enum מוגדר

6.1.1 §35.5.0.1 מתאר רק `open` או `planned-open`, אך הרשומות משתמשות בין היתר ב־`open-text-corrected`, `open-partially-planned`, `open-external-blocked`, `open-unplanned`, `open-explicitly-invalidated`, `open-conditional` ו־`open-planning-remediation`.

6.1.2 תיקון: להגדיר enum אטומי ו־transition table; Reason/Disposition יהיו שדות נפרדים. נקודת חידוש: לפני חישוב Gate predicates.

### 6.2 P2-002 — QA היסטורי משולב בתוך מסמך פעיל ומסוכן ל־Parser

6.2.1 §34.38 מסומן Historical, וזה נכון.

6.2.2 עם זאת §34.38.2.1, שורה 7787, מכיל Claim של אפס Missing parent ואפס Gap, בעוד Snapshot הנוכחי מכיל 53 הורים חסרים ו־53 קבוצות Gap.

6.2.3 §34.38.5.3, שורה 7819, משמר טווחי אומדן שבוטלו במסלול 1.1.

6.2.4 תיקון: להעביר QA היסטורי ל־Artifact immutable נפרד עם `appliesToDigest`; Parser של Snapshot פעיל יתעלם ממנו לפי schema, לא לפי הבנת טקסט. נקודת חידוש: לפני A09.

### 6.3 P2-003 — Review checkpoint מפנה ל־`/private/tmp`

6.3.1 §34.38.10.5, שורה 7871, מפנה לדוח תחת `/private/tmp` ומציג Digest.

6.3.2 לפי גבול הביקורת לא נעשתה הנחה שהקובץ עוד קיים. זמינותו ותוכנו הם `unknown/unavailable`.

6.3.3 המסמך עצמו אומר שזה אינו Gate evidence, ולכן החומרה P2 ולא P0.

6.3.4 תיקון: להעביר Evidence נדרש לנתיב עמיד, Read-only וגרסאי; לשמור provenance ו־digest. נקודת חידוש: לפני שימוש כלשהו בממצאיו.

### 6.4 P2-004 — Stage, Section, Route ו־Gate אינם קשורים ב־Mapping מכונתי יחיד

6.4.1 הכותרות ממפות §6 ל־Stage 1, §7 ל־Stage 2 ועד §33 ל־Stage 28, בעוד §34 הוא Stage 0.

6.4.2 §34.20.2, שורה 4191, משתמש בו־זמנית ב־“שלב 7/Stage 2”. §34.38.2.2 ההיסטורי משתמש ב־Stage 1–29.

6.4.3 תיקון: ליצור Registry יחיד `stageId → sectionId → gateIds → scopeProfile`, ולהשתמש רק ב־IDs ממנו. נקודת חידוש: לפני DAG ודוחות התקדמות.

## 7. ממצאי P3

### 7.1 P3-001 — אין Index נגזר למסמך בן 5,164 מזהים

7.1.1 אין Table of contents או Index מכונתי ל־Section, Gate, Artifact, Requirement, Finding ו־Registry ID.

7.1.2 תיקון: להפיק Index מן ה־parser בלבד; הוא אינו Source of truth ואינו נערך ידנית. נקודת חידוש: אינו חוסם Restart בפני עצמו; להשלים לפני מסירת Candidate לביקורת אנושית.

### 7.2 P3-002 — רשומות ארוכות מאוד מופיעות בשורה יחידה

7.2.1 חלק מרשומות DS/TH/CTL מכילות עשרות שדות בשורה אחת. הדבר מקשה Review, Diff ואבחון שדה חסר.

7.2.2 תיקון: לשמור ID אחד לרשומה, אך להציג כל field בשורה נפרדת או ב־YAML/JSON canonical block שמאומת מול Schema. נקודת חידוש: אינו חוסם Restart בפני עצמו; להשלים לפני הרחבת Registry נוספת.

## 8. Chronology נדרשת לפני חזרה לעבודה

8.1 Generation 0 — Bootstrap תכנוני בלבד.

8.1.1 לקבע את `/Users/tal/Documents/connect/web` כ־repository root היחיד.

8.1.2 לשלב D18-A2 Public ולהסיר כל הנחת Private פעילה.

8.1.3 לתקן Q23, Gate 6 shorthand, Free Gate names, גרסה ו־status schemas.

8.1.4 להגדיר A01–A09 ואת 13 ה־Audits.

8.1.5 להגדיר Finding classification ואת Predicate Gate 29.

8.2 Generation 1 — Candidate מלא.

8.2.1 להשלים FR-040–FR-076.

8.2.2 להשלים את חמש רשומות DS החסרות שדות.

8.2.3 להשלים 42/42 Domain crosswalk ו־52/52 Finding crosswalk.

8.2.4 ליצור §35.6 מלא בעל 18 שדות לכל עלה.

8.2.5 ליצור §35.8/§35.8.21 או להסיר ולמפות מחדש את ההפניות.

8.2.6 לתקן את 53 ההורים החסרים ואת כל ה־References השבורים.

8.2.7 ליצור DAG נפרד ל־Scope 1, Scope 3 ו־Scope 4.

8.2.8 לקשור את שרשרת ה־CAS וה־Provider outcomes ל־Task edges מפורשים.

8.3 Candidate freeze.

8.3.1 להקפיא bytes של C1.

8.3.2 לחשב `candidateDigest` לפי Canonicalization יחיד.

8.3.3 לא לערוך את C1 לאחר נקודה זו.

8.4 Detached QA.

8.4.1 להריץ את 13 ה־Audits הממוספרים על ה־Digest המדויק.

8.4.2 לדרוש אפס duplicate, missing parent, gap, dangling reference, orphan, cycle, self-edge, output collision, count drift, status violation, free Gate, estimate mismatch, schema failure ו־secret/PII finding.

8.4.3 להפיק Q1 מנותק וחתום.

8.5 Independent review.

8.5.1 Reviewer 1 אינו Producer וחותם על C1+Q1.

8.5.2 Reviewer 2 בלתי־תלוי וחותם על אותם Digests.

8.5.3 שינוי כל Byte מחזיר ל־8.2 ואינו “מתוקן במקום”.

8.6 Acceptance manifest.

8.6.1 להרכיב M1 מ־C1, Q1 ושתי חתימות Review.

8.6.2 לחשב Digest של M1.

8.6.3 טל מאשר את Digest M1 המדויק.

8.6.4 לעדכן Pointer חיצוני באמצעות CAS; לא לערוך את C1 או M1.

8.7 Gate 29.

8.7.1 לחשב את ה־Predicate מן Registry, לא מטקסט ידני.

8.7.2 לוודא שכל Planning-completeness P0/P1 נסגר.

8.7.3 Runtime findings נשארים planned-open וממופים ל־Product Gates בלי להיחשב resolved.

8.7.4 רק לאחר PASS ואישור טל להסיר Freeze תכנוני.

8.8 Gate 1.

8.8.1 לבצע Inventory על ה־repository הקנוני בלבד.

8.8.2 לקשור Evidence קיים לכל Task leaf.

8.8.3 לחשב Remaining ו־Estimate-to-complete בלי ליצור Tasks חדשים.

8.8.4 רק כאן ניתן לפרסם אחוז השלמה ושעות Remaining.

8.9 Gate 2 והמשך Product path.

8.9.1 להקשיח את ה־Public GitHub repository ולהוכיח את ה־Live governance.

8.9.2 אין Merge/Release/Deploy לפני Gate 2.

8.9.3 לאחר מכן לבצע את ה־DAG הקנוני בלבד.

## 9. בדיקת Candidate, Acceptance ו־CAS

9.1 `Plan candidate → plan acceptance`: נכשל כרגע בגלל Self-reference. התיקון הוא Lifecycle מנותק לפי §4.2 ו־§8.

9.2 `Outbound candidate`: הסדר המקומי ב־§17.10 נכון, אך ה־Critical path הגלובלי ב־§34.10 הפוך. לכן הוא מתוכנן אך לא executable.

9.3 `Provider acceptance → sent`: ההפרדה ב־§17.11 נכונה. HTTP/`wamid` נותנים לכל היותר `provider-accepted`; Webhook מאומת בלבד נותן `sent`.

9.4 `Cutover Ready/Go → traffic → Accepted`: הסדר המקומי ב־§34.31.8 וב־§34.31.10 נכון: Gate 26.0.1 לפני traffic/freeze/migration ו־Gate 26.0.2 לאחר reconciliation ו־24h/72h/7-day evidence.

9.5 סביבת ה־Rehearsal הנדרשת ב־§34.31.10.1 אינה מוגדרת במפורש. האם היא Staging בלבד או כוללת פעולה Production-like הוא `unknown/unavailable`; יש להגדיר זאת בעלה ייעודי בלי לשנות Production לפני Gate 26.0.1.

## 10. מה הוכח כחיובי

10.1 אין Duplicate במספור הסעיפים שנבדק.

10.2 יש 32 Threat records, וכל שמות השדות שב־§35.3.4 נמצאו בכל אחת.

10.3 יש 20 Control records, וכל שמות השדות שב־§35.3.5 נמצאו בכל אחת.

10.4 יש 25 Dynamic-source IDs נפרדים; הבעיה היא completeness בחמישה records ולא חסר ID.

10.5 המסמך אינו טוען ש־Gate 29 עבר; הכותרת ו־§35.5.53.4 משאירים אותו חסום.

10.6 סדר CAS המקומי, הפרדת accepted/sent וסדר Cutover המקומי כתובים באופן בטוח יחסית. נדרש להפוך אותם ל־Task DAG שניתן להריץ.

10.7 Branch ו־HEAD המתועדים תואמים ל־repository הפנימי הקנוני שסופק; ה־outer empty repository אינו סיבה לפסול אותם.

## 11. Unknowns וחסמים חיצוניים

11.1 שמות רוב ה־Primary, Backup ו־Reviewers נשארים `unknown/unavailable`.

11.2 כל אחד־עשר ה־Review statuses נשארים `pending` במסמך.

11.3 תוכן וזמינות דוח `/private/tmp` הם `unknown/unavailable`.

11.4 ה־export/digest המדויק של הגדרות GitHub החיות שסופקו אינם בתוך ה־Master Plan ולכן הם `unknown/unavailable` עד Artifact עמיד.

11.5 הרכב 195 רשומות A08 הוא `unknown/unavailable`.

11.6 רשימת 13 ה־Audits של A09 היא `unknown/unavailable`.

11.7 שעות ואחוז עד סיום הם `unknown/unavailable` עד §35.6 ו־Gate 1.

## 12. הכרעת Restart

12.1 `Planning restart`: מותר מיד, ורק לצורך תיקון המסמך, יצירת Registries, QA ו־Review מנותק.

12.2 `Product coding restart`: אסור כרגע.

12.3 `Git mutation, Merge, Release, Deploy, Provider activation`: אסורים כרגע.

12.4 ה־restart המוקדם ביותר לפיתוח הוא לאחר השלמת §§8.1–8.7 בדוח זה וסגירת Gate 29 על Manifest מנותק חתום.

12.5 ה־restart המוקדם ביותר ל־Merge/Release הוא לאחר Gate 1 ו־Gate 2, לרבות הקשחת ה־Public repository והוכחת Live governance.

12.6 Verdict סופי: `REJECT — Gate 29 BLOCKED — planning-only remediation authorized — no executable master plan yet`.
