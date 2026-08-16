---
id: ADR-0003
title: Claude and AI development account model
status: proposed
decision_owner: רועי
approved_option: unknown/unavailable
approved_at: unknown/unavailable
supersedes: none
---

# ADR-0003 — Claude and AI development account model

## 1. מצב ההחלטה

1.1 סטטוס: `proposed`.

1.2 בעל ההחלטה: רועי — רישיונות, Billing והרשאות כלי הפיתוח.

1.3 אפשרות שאושרה: `unknown/unavailable`.

1.4 מועד אישור: `unknown/unavailable`.

1.5 מדיניות מידע ארגונית מאושרת: `unknown/unavailable`.

## 2. הבעיה שצריך לפתור

2.1 כל מפתח צריך לעבוד בזהות אישית שניתן להעניק, למדוד ולבטל בלי
לשתף Password, ‏Cookie, ‏Session או קוד כניסה.

2.2 כלי AI עשוי לקרוא קוד ומסמכים עסקיים. לכן מודל החשבון חייב
להגדיר בעלות מידע, Retention, ‏Feedback, ‏Spend limits ו־Offboarding.

2.3 חיבור AnyDesk למחשב חברה אינו פותר רישוי או זהות. הוא רק ערוץ
גישה למחשב, והוא עלול להגדיל את הסיכון אם כמה אנשים משתמשים באותו
OS user או באותו Claude session.

## 3. החלופות

### 3.1 אפשרות A — Claude Team בבעלות החברה עם Seat אישי

3.1.1 כל מפתח מוזמן באמצעות כתובת עבודה מורשית ומקבל Seat וזהות
נפרדים.

3.1.2 החברה מנהלת Billing, ‏Roles, ‏Members, ‏Usage analytics,
Spend limits ו־Offboarding מתוך Organization אחד.

3.1.3 ‏Team דורש לפחות שני Members. סוג Seat, מחזור Billing ומחיר
מקומי צריכים להיבדק במסך הרכישה בזמן האישור ולא להיקבע מהמסמך.

3.1.4 יתרון: זהות ו־Usage נפרדים לכל אדם ושליטה ארגונית מרכזית.

### 3.2 אפשרות B — מנוי אישי נפרד לכל מפתח

3.2.1 כל מפתח מחזיק חשבון ו־Billing אישיים והחברה מחזירה הוצאות או
מגדירה תקציב.

3.2.2 יתרון: אפשר להתחיל בלי Organization משותף.

3.2.3 חיסרון: אין Membership, ‏Offboarding, ‏Spend policy ו־Data
governance ארגוניים אחידים. תנאי Consumer והגדרות הפרטיות אינם זהים
בהכרח ל־Claude for Work.

### 3.3 אפשרות C — חשבון משותף או Session משותף דרך AnyDesk

3.3.1 האפשרות נדחית.

3.3.2 אי אפשר לייחס פעולה לאדם, לבטל גישה באופן נקודתי או להוכיח
שהרישיון וה־Session שימשו רק משתמש מורשה.

3.3.3 AnyDesk מותר רק לצורך גישה מאושרת למחשב חברה, עם OS user
אישי ו־Permission Profile מצומצם. הוא אינו תחליף ל־Seat אישי.

## 4. ההמלצה

4.1 לבחור באפשרות A — Claude Team בבעלות החברה עם Seat אישי לכל
מפתח שמשתמש בכלי.

4.2 להתחיל ב־Seat המתאים לעבודה הרגילה, להגדיר Spend limit ולאפשר
Usage credits רק לאחר אישור תקציב. אין לבחור `unlimited` כברירת
מחדל.

4.3 להשבית Feedback לשיחות עד שמדיניות החברה מאשרת במפורש אילו
תכנים מותר להעביר כ־Feedback. ב־Claude for Work קלט ופלט אינם
משמשים כברירת מחדל לאימון, אך Feedback מפורש הוא חריג.

## 5. מדיניות שימוש נדרשת

5.1 אין להזין Secrets, ‏Tokens, ‏Cookies, ‏Private keys, ‏Production
database dumps, ‏PII או נתוני לקוחות לכלי AI.

5.2 קוד ומסמכים עסקיים מותרים רק לאחר אישור מדיניות החברה לגבי
קניין רוחני, Retention, ‏Subprocessors ומיקום מידע.

5.3 לכל משתמש יש Work email, ‏2FA וזהות אישית. אין לשתף Session
גם כאשר עובדים על אותו מחשב.

5.4 ‏Claude Code מקבל גישה רק ל־Repository ולפקודות שנדרשים למשימה.
כתיבה חיצונית, Deployment ופעולה הרסנית עדיין דורשות הרשאה נפרדת.

5.5 ‏Primary Owner, ‏Owners ו־Admins מקבלים הרשאה לפי Least
privilege. יש לתעד מי יכול לנהל Billing, ‏Members ו־Data exports.

5.6 Offboarding כולל ביטול Member, ביטול Sessions, הסרת גישה למחשב
ול־GitHub ובדיקה שאין Token אישי שנותר פעיל.

## 6. תנאי קבלה לפני שינוי ל־accepted

6.1 החברה מאשרת ש־Claude Team זמין במיקום ובדומיין העבודה שלה.

6.2 רועי בוחר Billing interval, מספר Seats וסוג Seat לכל תפקיד על
בסיס שימוש ותקציב אמיתיים.

6.3 מתועדים Primary Owner, ‏Owner חלופי, Admins, ‏Members ונתיב
התאוששות. אין לכתוב Password או Recovery code במסמך.

6.4 מוגדרים Spend limits ארגוניים ואישיים; Usage credits כבויים או
מוגבלים בסכום שאושר במפורש.

6.5 הגדרות Feedback, ‏Retention ו־Data export נבדקות ומתועדות.

6.6 כל משתמש מאשר את מדיניות המידע ומבצע התחברות אישית מוצלחת בלי
שיתוף Cookie, ‏Session או AnyDesk identity.

## 7. אישורים

7.1 רועי — `unknown/unavailable`.

7.2 אבטחה/פרטיות — `unknown/unavailable`.

7.3 כספים — `unknown/unavailable`.

7.4 חברי הצוות שקיבלו Seat — `unknown/unavailable`.

## 8. מקורות ו־Evidence

8.1 תיעוד Anthropic על
[Claude Team](https://support.claude.com/en/articles/9266767-what-is-the-team-plan)
ועל Seats, ניהול מרכזי ומגבלות לכל Member.

8.2 תיעוד Anthropic על
[ניהול Members](https://support.claude.com/en/articles/13133750-manage-members-on-team-and-enterprise-plans)
ועל הזמנות, Roles ו־Member export.

8.3 תיעוד Anthropic על
[Usage credits ו־Spend limits](https://support.claude.com/en/articles/12005970-manage-usage-credits-for-team-and-seat-based-enterprise-plans).

8.4 מרכז הפרטיות של Anthropic על
[שימוש במידע לאימון](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training)
ועל חריג Feedback מפורש.

8.5 המקורות נבדקו בתאריך `2026-08-16`. מחיר מקומי, Seats,
Organization settings ומדיניות חברה חיה: `unknown/unavailable`.
