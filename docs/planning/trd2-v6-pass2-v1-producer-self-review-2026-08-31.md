# 1. TRD-2 v6 Pass 2 v1 — Producer self-review and mandatory restart

## 1.1 מעמד וגבול סמכות

1.1.1 `artifactId=CONNECT-TRD2-V6-PASS2-V1-PRODUCER-SELF-REVIEW-2026-08-31`.

1.1.2 זהו Self-review מקומי של ה־Producer. הוא אינו ביקורת עצמאית,
אינו Finding closure, אינו Acceptance ואינו מתיר שינוי ב־Gate29.

1.1.3 Subject review root=
`0d71281e231c525c6defd79059ec31da630cf4a851e41876331735982ef0ce1e`;
Candidate commit=`8a08583b0adb4159a569ca32086769d2450199c7`.

1.1.4 verdict=`REJECT-PASS2-V1-AS-A-COMPLETE-CLOSED-SCHEMA-REGISTRY`;
safe terminal=`TRD2-V6-PASS2-SCHEMA-RESTART-REQUIRED`.

# 2. שיטת הבדיקה

2.1 נלקחה קבוצת השדות המוצהרת מכל Schema ב־Registry.

2.2 היא הושוותה לקבוצת השדות של רשומות v6 האמיתיות שכבר קיימות:
Source Capture Manifest, Source Capture Row, Parser Fixture, Generation
Receipt, Parser Report, Pass 1 Producer QA ו־Canonical Report.

2.3 בנוסף נבדק Schema המשפחה `REQUIREMENT` מול חוזה חמשת שדות החובה:
`statement`, ‏`defectCauseImpact`, ‏`proofPredicate`, ‏`dependencies`,
`sourceBasis`.

2.4 התאמה נדרשת פירושה exact closed key set, טיפוסים תואמים, מבנה nested
תואם ואותו ID/root constructor. הסכמה על fixtures שה־Registry יצר לעצמו
אינה תחליף להתאמה זו.

# 3. Findings

## 3.1 `TRD2V6-P2V1-SR-F001` — Schemas אינם מקבלים רשומות v6 אמיתיות

3.1.1 severity=`P0`; status=`OPEN`; noMergeKey=`TRD2V6-P2V1-SR-F001`.

3.1.2 שבע מתוך שבע משפחות אמיתיות שנדגמו מכילות missing ו/או extra
fields מול ה־Schema שהוצהר עבורן.

3.1.3 exact mismatches:

3.1.3.1 `SOURCE-CAPTURE-MANIFEST`: declared=`10`, actual=`14`;
declared-only=`5`; actual-only=`9`.

3.1.3.2 `SOURCE-CAPTURE-ROW`: declared=`12`, actual=`8`;
declared-only=`7`; actual-only=`3`; ה־Schema שיטח את `capture` במקום
לתאר את ה־Object הסגור הקיים.

3.1.3.3 `PARSER-FIXTURE`: declared=`11`, actual=`14`;
declared-only=`5`; actual-only=`8`.

3.1.3.4 `GENERATION-RECEIPT`: declared=`12`, actual=`17`;
declared-only=`9`; actual-only=`14`.

3.1.3.5 `PARSER-REPORT`: declared=`11`, actual=`16`;
declared-only=`4`; actual-only=`9`.

3.1.3.6 `PRODUCER-QA`: declared=`10`, actual=`18`;
declared-only=`8`; actual-only=`16`.

3.1.3.7 `CANONICAL-REPORT`: declared=`11`, actual=`16`;
declared-only=`6`; actual-only=`11`.

3.1.4 impact=הטענה "every positive v6 record validates" אינה נכונה;
F002 אינו יכול להיסגר.

## 3.2 `TRD2V6-P2V1-SR-F002` — Requirement schema מפר את חוזה חמשת השדות

3.2.1 severity=`P0`; status=`OPEN`; noMergeKey=`TRD2V6-P2V1-SR-F002`.

3.2.2 `statement` קיים, אך `defectCauseImpact`, ‏`proofPredicate`,
`dependencies` ו־`sourceBasis` חסרים מן ה־Schema.

3.2.3 impact=Pass 3 אינו יכול להפיק Subject חוקי או 128 Clause ASTs
מבלי ליצור פורמט שאינו מוכר ל־Pass 2.

## 3.3 `TRD2V6-P2V1-SR-F003` — Corpus מעגלי ומכסה רק רשומות שנוצרו ממנו

3.3.1 severity=`P0`; status=`OPEN`; noMergeKey=`TRD2V6-P2V1-SR-F003`.

3.3.2 כל `318` ה־fixtures נגזרו מן ה־53 schemas עצמם. Actual-positive
inventory של הרשומות הקיימות=`0`.

3.3.3 impact=שני engines יכולים להסכים לחלוטין על מודל שגוי; agreement
אינו conformance.

## 3.4 `TRD2V6-P2V1-SR-F004` — Nested ו־nullable shapes אינם מתוארים

3.4.1 severity=`P1`; status=`OPEN`; noMergeKey=`TRD2V6-P2V1-SR-F004`.

3.4.2 DSL v1 תומך Scalars ו־Arrays בלבד. אין closed nested Object,
Nullable, tagged union או exact map schema, אף שהרשומות האמיתיות משתמשות
ב־Objects nested וב־null terminals.

## 3.5 `TRD2V6-P2V1-SR-F005` — Verifier אינו בודק actual-positive denominator

3.5.1 severity=`P0`; status=`OPEN`; noMergeKey=`TRD2V6-P2V1-SR-F005`.

3.5.2 ה־Verifier הוכיח `318/318` agreement ו־`0` mismatches על corpus
הפנימי, אך לא ניסה להעביר שום רשומת v6 קבועה דרך ה־Schema המשויך לה.

3.5.3 impact=ה־status `PASS-2-LOCAL-CANDIDATE-COMPLETE` היה רחב מדי
ומבוטל במסמך זה.

# 4. Disposition ו־Recovery

4.1 Pass 2 v1 נשמר ב־Git כראיה היסטורית שנדחתה. אין לשנות את שלושת
הקבצים הקבועים ואין למחוק את Roots שלהם.

4.2 ייווצר Output Path Registry v2 לפני כל פלט חדש. הנתיבים החדשים
יכללו `closed-schema-registry-v2`, שני Canonical Reports v2 ו־Pass 3–6
successor outputs. ה־Registry הישן לא יוחלף בשקט.

4.3 DSL v2 חייב לתמוך לפחות ב־closed Object, Array, Nullable, Enum,
Const, UIntSafe, String, Bytes32, Commit, LogicalPath, ContentId ו־tagged
union, עם unknown-field rejection בכל עומק.

4.4 Actual-positive inventory חייב לכלול כל משפחת Record שכבר קיימת,
כל nested record וכל רשומת Subject/Pass חדשה. לכל positive נדרש מקור
קבוע, locator, digest, schema ID ותוצאת שני engines.

4.5 `REQUIREMENT` v2 יכלול בדיוק את חמשת שדות התוכן המחייבים, זהות
מקור ו־spans; כל הרחבה סמנטית תישמר ברשומה נפרדת ולא תשנה את מכנה
חמשת השדות.

4.6 כל mutation corpus חייב להיגזר גם מן actual positives, כולל nested
unknown/missing/type/nullability/union/invariant/content-ID mutations.

4.7 תנאי חזרה ל־Pass 3: כל actual-positive record עובר בשני engines;
כל mutation נחסם באותו terminal; roots זהים; missing/extra denominator=
`0`; Self-review Findings `5/5` מטופלים מקומית. Closure חיצוני נשאר `0`.

# 5. מצב בטיחות

5.1 accepted Requirements=`0/128`; accepted Findings=`0/15`;
review generations=`0/2`; Reconciliation ו־Definition Acceptance=
`ABSENT`.

5.2 ‏Gate29=`BLOCKED`; ‏development freeze=`ACTIVE`; repository=
`PUBLIC`; לא בוצע פיתוח Product, חיבור Provider או Deploy.
