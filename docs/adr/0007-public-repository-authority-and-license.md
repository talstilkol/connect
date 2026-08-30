---
id: ADR-0007
title: Public repository authority and license hold
status: accepted
decision_owner: טל
approved_option: public-no-license-until-legal
approved_at: 2026-08-30T16:37:24Z
supersedes: ADR-0002
---

# ADR-0007 — Public repository authority and license hold

## 1. החלטה

1.1 ‏`talstilkol/connect` נשאר Repository Authority היחיד ובבעלות טל.

1.2 Visibility מחייב=`PUBLIC`. החזרה ל־Private אינה מסלול תיקון מותר.

1.3 המאגר נשאר ללא רישיון שימוש עד Legal review של זכויות הקוד,
מסמכי המקור, תלויות, סימנים מסחריים וחובות Attribution.

1.4 `PUBLIC` אומר שכל אדם יכול לקרוא את הקבצים. הוא אינו מעניק רשות
להשתמש, להעתיק, לשנות או להפיץ את הקוד בלי רישיון מתאים.

1.5 טל הוא האחראי היחיד לכל Governance, ‏Review, ‏Push, ‏הגדרה,
חשבון והכרעה. אין כרגע Primary/Backup/RACI או הקצאה לאדם נוסף.

## 2. גבולות סמכות

2.1 ההחלטה אינה פותחת Gate 29, אינה מסירה את הקפאת הפיתוח ואינה
מאשרת Deployment, ‏Production, ספק חי או מידע לקוח.

2.2 שינוי ל־PUBLIC אינו הוכחה לכך שאין Secret בהיסטוריה. Secret
hygiene, ‏Push protection, ‏Dependency review ו־Rulesets נשארים
בקרות חובה.

2.3 אין לפרסם Secret, נתון אישי, נתון לקוח, Locator פרטי או חומר
שאין לטל זכות לפרסם. ספק מחקר חסר זכויות נשאר מחוץ ל־Git.

2.4 אין ליצור Repository רשמי מתחרה. העברה עתידית ל־Organization
תעביר את אותו Repository ותדרוש ADR חדש ו־Evidence חי.

## 3. תנאי עבודה במאגר PUBLIC

3.1 כל Commit עובר Secret hygiene על Worktree ועל כל היסטוריית Git.

3.2 כל מסמך חדש משתמש בנתיבים יחסיים בלבד ואינו מכיל נתיב מחשב פרטי.

3.3 כל פלט ציבורי מסווג מראש, וכל מצב לא ידוע נכשל סגור.

3.4 אין להוסיף קובץ `LICENSE` לפני Legal review ואישור מפורש חדש של טל.

3.5 בחירת רישיון עתידית תתועד ב־ADR חדש או בגרסה שמחליפה מסמך זה.

## 4. מצב נוכחי

4.1 Repository visibility=`PUBLIC`.

4.2 License decision=`HOLD-PENDING-LEGAL`; קובץ License מאושר=`ABSENT`.

4.3 Gate29=`BLOCKED`; development freeze=`ACTIVE`.

4.4 Production acceptance=`0`; החלטה זו מעניקה Governance direction
בלבד ואינה Evidence לקבלת המוצר.
