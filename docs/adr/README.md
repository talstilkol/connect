# Architecture Decision Records

## 1. מטרת התיקייה

1.1 ‏Architecture Decision Record, או ADR, הוא מסמך קצר שמתעד החלטה
טכנית משמעותית, החלופות שנבדקו, הסיבה לבחירה וההשלכות שלה.

1.2 השאלון האינטראקטיבי עוזר לצוות לנהל דיון. ADR הוא המקום שבו
החלטת ארכיטקטורה מאושרת הופכת למחייבת וניתנת לביקורת.

## 2. סטטוסים חוקיים

2.1 `proposed` — קיימת המלצה, אך טרם התקבל אישור מחייב.

2.2 `accepted` — האפשרות, המאשרים ומועד האישור מתועדים במפורש.

2.3 `rejected` — ההצעה נדחתה ונדרשת הצעה חדשה או החלטה אחרת.

2.4 `superseded` — ADR מאוחר יותר החליף את ההחלטה, וקישור אליו
חייב להופיע במסמך הישן.

## 3. כלל Fail-closed

3.1 רק ADR בסטטוס `accepted` יכול לפתוח Gate שתלוי בהחלטה.

3.2 בחירה בשאלון, המלצה במסמך, הודעת צ'אט או ערך ברירת מחדל אינם
אישור.

3.3 ADR בסטטוס `accepted` חייב לכלול:

3.3.1 `approved_option` שאינו `unknown/unavailable`.

3.3.2 זמן UTC קנוני בשדה `approved_at`.

3.3.3 שמות ותפקידי המאשרים בסעיף האישורים.

3.3.4 קישורים ל־Evidence ולתנאי הקבלה שנבדקו.

## 4. אינדקס

4.1 [ADR-0001 — Hosting topology for Pilot](0001-hosting-topology.md) —
`proposed`.

4.2 [ADR-0002 — Repository Authority and GitHub governance](0002-repository-authority.md)
— `proposed`.

4.3 [ADR-0003 — Claude and AI development account model](0003-ai-development-account-model.md)
— `proposed`.
