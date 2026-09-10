---
id: ADR-0002
title: Repository Authority and GitHub governance
status: superseded
decision_owner: טל
approved_option: current-private-personal-authority
approved_at: 2026-08-17T05:17:48Z
supersedes: none
superseded_by: ADR-0007
---

# ADR-0002 — Repository Authority and GitHub governance

## 1. מצב ההחלטה

1.1 סטטוס: `superseded` על ידי ADR-0007. מסמך זה נשמר כתיעוד
היסטורי של החלטת ה־Private הישנה ואינו מקור אמת ל־Visibility הנוכחי.

1.2 בעל ההחלטה: טל — בעל ה־Repository וה־Repository Authority.

1.3 אפשרות שאושרה: אפשרות B — `talstilkol/connect` הפרטי נשאר
Repository Authority יחיד בבעלות טל בשלב הנוכחי.

1.4 מועד אישור: `2026-08-17T05:17:48Z`.

1.5 שם GitHub Organization עתידי של החברה: `unknown/unavailable`.
היעדר Organization אינו פותח Repository מתחרה ואינו משנה את מקור
האמת שאושר.

## 2. הבעיה שצריך לפתור

2.1 קיים Repository פעיל בשם `talstilkol/connect` עם היסטוריית
הפיתוח, הבדיקות ומסמכי ה־Evidence. בבדיקת Governance חיה מ־
2026-08-16 הוא נמצא `public`. החשיפה תוקנה באותו יום ואימות חוזר
דיווח `private=true` ו־`visibility=private`. הבעלות עדיין אישית
ושאר דרישות ה־Governance אינן מושלמות.

2.2 הבעלות הנוכחית היא תחת חשבון אישי. מצב זה מתאים לעבודה של אדם
אחד, אך אינו מגדיר בעלות חברה, התאוששות מנהלית או תפקידים צוותיים
יציבים.

2.3 פתיחת Repository נוסף תיצור שני מקורות אמת, תפריד היסטוריה
ועלולה לגרום לפיתוח או Deployment מהעותק הלא נכון.

## 3. החלופות

### 3.1 אפשרות A — העברת ה־Repository הקיים ל־Organization של החברה

3.1.1 מעבירים את `talstilkol/connect` הקיים ולא מעתיקים את תוכנו
ל־Repository חדש.

3.1.2 לכל חבר צוות מוקצית זהות GitHub אישית ותפקיד מצומצם לפי
העבודה שלו.

3.1.3 יתרון: מקור אמת אחד, בעלות ארגונית, תפקידים מדורגים ותהליך
Offboarding שניתן לבצע בלי להחליף חשבון משותף.

3.1.4 תנאי: יש לבחור GitHub plan שתומך ב־Rulesets ובהגנות הנדרשות
ל־Repository פרטי לפני ההעברה. אין להניח שתוכנית חינמית מספקת את
כל תשעת ה־Checks וההגנות של ה־Release contract.

### 3.2 אפשרות B — השארת ה־Repository בבעלות האישית הקיימת

3.2.1 חברי הצוות מוזמנים כ־Collaborators לחשבון האישי.

3.2.2 יתרון: אין פעולת Transfer מיידית.

3.2.3 חיסרון: בעלות החברה, התאוששות, Roles ומדיניות ארגונית נשארים
תלויים בחשבון אישי אחד.

### 3.3 אפשרות C — פתיחת Repository חדש והעתקת הקוד

3.3.1 האפשרות אינה מומלצת ואינה מאושרת כברירת ביניים.

3.3.2 היא יוצרת Repository מתחרה, סיכון לאובדן היסטוריה ושאלה
חוזרת לגבי המקום שממנו מותר לפרוס.

## 4. ההחלטה

4.1 נבחרה אפשרות B — ה־Repository הפרטי `talstilkol/connect` נשאר
בבעלות טל ובשלב הנוכחי הוא Repository Authority היחיד.

4.2 לשמור על Repository פרטי ולהכריז עליו במפורש כ־Repository
Authority היחיד לקוד, Pull Requests, ‏Releases ו־Deployment.

4.3 אפשרות A נשארת המלצת התבגרות עתידית לאחר בחירת הישות המשפטית,
Organization, ‏Billing, שני Owners ונתיב התאוששות. אם תתבצע העברה,
מעבירים את אותו Repository ולא מעתיקים אותו.

4.4 חשיפת ה־Visibility נסגרה ב־2026-08-16 וה־Repository הקיים אומת
כ־`private`. לפני Transfer עדיין יש לאמת שלא נשמר Secret בהיסטוריה
ולסובב כל Credential שקיים ספק לגביו. החלטת ה־Authority אינה מוכיחה
Branch Protection, ‏Review, ‏CI, ‏Secret scanning או Push protection;
אלה נשארים תנאי Gate 1 נפרדים.

4.5 אפשרות C נדחית. אסור ליצור Repository רשמי נוסף או לפרוס מעותק
שאינו ה־Authority המאושר.

## 5. הקצאות ו־Gate היסטוריים שבוטלו

5.1 אין הקצאת Collaborators פעילה במסמך זה. טל הוא האחראי היחיד;
כל הוספת אדם או הרשאה בעתיד דורשת החלטה חדשה לפי ADR-0007.

5.2 תנאי ה־Private הישנים אינם Gate פעיל. תנאי העבודה במאגר PUBLIC,
לרבות Secret hygiene, ‏Rulesets ו־License hold, מוגדרים ב־ADR-0007.

## 7. אישורים

7.1 טל — Repository Authority ובעלות נוכחית: `approved` ב־
`2026-08-17T05:17:48Z`.

7.2 כל אישור או הקצאה היסטוריים לאדם אחר מבוטלים. טל אחראי לכל
פעולת Governance פעילה לפי ADR-0007.

## 8. מקורות ו־Evidence

8.1 תיעוד GitHub על
[העברת Repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)
ועל עדכון כתובת Remote.

8.2 תיעוד GitHub על
[תפקידי Repository בארגון](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)
ועל Least privilege.

8.3 תיעוד GitHub על
[Rulesets ל־Repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
ועל תלות הזמינות בתוכנית ובסוג ה־Repository.

8.4 המקורות נבדקו בתאריך `2026-08-16`. תוכנית GitHub, שם
Organization עתידי ו־Governance evidence חיים: `unknown/unavailable`.

8.5 [GitHub Governance live audit](../github-governance-live-audit.md)
— Snapshot מתוארך של Visibility, ‏Branches, ‏Rulesets, ‏Workflows,
PRs ו־Authentication.
