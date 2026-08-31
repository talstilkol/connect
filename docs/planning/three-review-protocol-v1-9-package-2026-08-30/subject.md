# Protocol v1.9 — immutable planning successor

## 1. גבול סמכות

1.1 זוהי חבילת תכנון ו-QA מכנית בלבד. היא אינה Acceptance, Permit, HumanApproval, Review או הרשאת פיתוח.

1.2 מצב מחייב: Acceptance=0; Gate29=BLOCKED; developmentFreeze=ACTIVE; repository=PUBLIC; authorityOutputs=0.

1.3 אין שינוי Product, Git, GitHub, Provider או Deployment. אין יצירת key, credential או בחירת אלגוריתם חתימה.

## 2. מכנה סגירה

2.1 המכנה המדויק הוא 40 ממצאים בלתי ממוזגים: 25 מ-v1.7 ועוד 15 מ-v1.8. לכל ממצא שורת closure נפרדת ו-acceptanceCredit=0.

2.2 שחזור ההתנהגות הוא 574/574 operations מקוריים. Oracle אינו חלק מקלט ה-evaluator וההשוואה מתרחשת רק לאחר effect.

2.3 הוכחת semantics מכסה 4,016 predicates ו-53,450 semantic uses באמצעות exact active target roots, no weakening, no collision ו-bijective coverage. External semantic receipt עדיין חסר.

## 3. מקור אמת ושחזור

3.1 Readers קוראים רק exact allowlist מתוך frozen-source-receipt.jsonl. אין Git commands, אין network, אין enumeration של workspace ואין תלות בקבצים מאוחרים שאינם ברשימה.

3.2 כל receipt קושר repository-relative path, mode, bytes, lines ו-SHA-256. שינוי מקור מפורש נכשל; הוספת קובץ לא קשור אינה משנה תוצאה.

3.3 אין שכפול פיזי של carriers קיימים. artifact-growth-projection.json קובע duplicateSourceBytesAdded=0 ו-deny כאשר budget גלובלי אינו ידוע.

## 4. סמכות וראיות חיצוניות

4.1 Acceptance נגזרת רק מ-exact rooted validator result set שקושר computed packageRoot, physical manifestRoot, subjectRoot ו-frozen governance. אין caller-supplied validity booleans.

4.2 exact quorum כולל שבעה slots נפרדים. appointments, signatures, trust, time, revocation, scanners, remote PUBLIC observation, three reviews, reconciliation, Tal approval ו-production CAS adapter חסרים ולכן המסלול חסום.

4.3 חוזה החתימה הוא planning-only. allowed algorithms ריק עד אישור חיצוני; לא נוצרו keys או signatures.

## 5. CAS, Recovery ו-PUBLIC

5.1 חוזה CAS מגדיר בדיוק 65 comparisons ו-17 durable members, operation-key preimage, zero-or-one Permit, serializable transaction, response-loss replay, concurrency, revocation drift ו-partial-write rollback.

5.2 reference model ניתן להרצה; productionAdapterExecutable=false. אין טענה שמחיקה, remote, CAS או scanner אמיתיים מוכנים.

5.3 repository חייב להישאר PUBLIC. authenticated remote visibility/ref/write-object-set receipt חסר ולכן Push/Permit אינם מורשים.

## 6. Readers ונתיבים

6.1 שני Readers בלתי תלויים, read-only כברירת מחדל. report path אופציונלי חייב להיות בתוך ספריית detached reports המדויקת, עם parent קיים, target חדש, no-follow ו-create-new. invalid path נכשל לפני קריאת package.

6.2 vector paths הם exact closed set. absolute, dot segments, traversal, symlink, device, FIFO ו-oversize נדחים fail-closed.
