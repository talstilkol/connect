# 1. Connect — TRD-2 v6 Pass 2 v2 restart charter

## 1.1 סמכות ומטרה

1.1.1 `artifactId=CONNECT-TRD2-V6-PASS2-V2-RESTART-CHARTER-2026-08-31`.

1.1.2 המטרה היא להחליף את Pass 2 v1 שנדחה ב־successor חדש, בלי לשנות,
למחוק או להציג מחדש את שלושת Roots שנדחו.

1.1.3 מקור ה־Restart=
`docs/planning/trd2-v6-pass2-v1-producer-self-review-2026-08-31.md`;
Self-review Findings=`5=4 P0+1 P1`.

1.1.4 המאגר `PUBLIC`; ‏Gate29=`BLOCKED`; ‏development freeze=`ACTIVE`;
כל Acceptance ו־Closure counters נשארים `0`.

# 2. גבול הפלט

2.1 Output Path Registry v2 הוא המקור היחיד לנתיבי successor:
`docs/planning/trd2-v6-output-path-registry-v2-2026-08-31.json`.

2.2 ששת פלטי Pass 1 נשארים immutable ונעשה בהם שימוש חוזר לפי Root.

2.3 שלושת פלטי Pass 2 v1 נשארים immutable אך אינם חברים בחבילת v2.

2.4 כל פלט חדש נכתב רק תחת
`docs/planning/trd2-v6-candidate-v2-2026-08-31/`.

2.5 שינוי byte בכל Toolchain לאחר קיבוע מחייב Restart נוסף; אין overwrite,
rename substitution או reuse של Root ישן.

# 3. דרישות Schema DSL v2

3.1 כל schema הוא closed recursively: unknown fields נחסמים גם בתוך
Object nested.

3.2 טיפוסים מחייבים=`Object|Array|Nullable|OneOf|Const|Enum|Boolean|
UIntSafe|String|Bytes32LowerHex|CommitHex|LogicalPath|ContentId|Null`.

3.3 כל Object מצהיר properties, required, additionalProperties=false,
optional/nullability ורשימת invariants סגורה.

3.4 `REQUIREMENT` מכיל בדיוק את חמשת שדות התוכן `statement`,
`defectCauseImpact`, `proofPredicate`, `dependencies`, `sourceBasis`;
זהות, version ו־recordKind הם envelope; locators נשמרים ב־Record נפרד.

3.5 לכל משפחת Root-bearing Record מוגדר constructor שאינו כולל את שדות
ה־ID וה־Root בעצמו.

# 4. Actual-positive inventory

4.1 המכנה מופק מה־Git commit הקבוע ולא מרשימת מספרים ידנית.

4.2 הוא כולל את כל פלטי Pass 1 ברמת top-level ואת כל המשפחות nested
החוזרות: Source rows/captures, F015 rows, Parser fixtures, Generation
rows, Parser outcomes ו־QA subrecords.

4.3 הוא כולל `128/128` Requirements שנקראים מחמשת שדות המקור, עם
source spans ו־predecessor identity ברשומת Binding נפרדת.

4.4 כל Positive קושר logical path, source SHA-256, start/end byte,
capture SHA-256, schema ID, exact bytes ו־expected content root.

4.5 actual-positive missing schema=`0`; schema ללא Positive=`0`, למעט
schemas המיועדים במפורש לפלט עתידי ומסומנים `FUTURE-CONSTRUCTION`.

# 5. Mutation ו־dual-engine acceptance

5.1 לכל actual-positive family נדרשות מוטציות exact bytes של unknown,
missing, type, nullability/union, invariant ו־content identity כאשר
הן ישימות.

5.2 Engine A ו־Engine B אינם רשאים לשתף parser/validator implementation.

5.3 שניהם חייבים להפיק אותו outcome ו־root לכל Positive ולכל Mutation.

5.4 תנאי Pass 2 v2 מקומי=`actual positives all PASS; mutations all BLOCK
at expected terminal; mismatch=0; missing/extra=0; self-review findings
remediated 5/5 locally`.

5.5 גם לאחר תנאי 5.4: external Finding closure=`0`; Acceptance=`0`;
Pass 3 רשאי להתחיל כמועמד מקומי בלבד.
