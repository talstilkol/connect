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

3.2 בחירה מקומית או ברירת מחדל בשאלון אינן אישור. החלטה שמסומנת
במפורש `approved` על ידי בעל הסמכות חייבת לעבור ל־ADR עם זהות ומועד
UTC לפני שהיא פותחת Gate.

3.3 ADR בסטטוס `accepted` חייב לכלול:

3.3.1 `approved_option` שאינו `unknown/unavailable`.

3.3.2 זמן UTC קנוני בשדה `approved_at`.

3.3.3 שמות ותפקידי המאשרים בסעיף האישורים.

3.3.4 קישורים ל־Evidence ולתנאי הקבלה שנבדקו.

## 4. אינדקס

4.1 [ADR-0001 — Hosting topology for Pilot](0001-hosting-topology.md) —
`accepted`; נבחר Migration מלא ל־Vercel ול־Railway. ה־Deployment
עדיין חסום עד השלמת מפת המחליפים, ה־Adapters וה־Evidence.

4.2 [ADR-0002 — Repository Authority and GitHub governance](0002-repository-authority.md)
— `superseded`; נשמר כתיעוד היסטורי של מצב ה־Private הישן.

4.3 [ADR-0003 — Claude and AI development account model](0003-ai-development-account-model.md)
— `proposed`.

4.4 [ADR-0004 — Detailed Vercel and Railway target topology](0004-target-service-topology.md)
— `proposed`; מפרט את המלצת השירותים, OIDC, ‏PostgreSQL, ‏Redis,
Scheduler, ‏Storage, ‏Recovery ו־Observability בלי להמציא אישור.

4.5 [ADR-0005 — Bot-reply Release Evidence Storage](0005-bot-reply-release-evidence-storage.md)
— `proposed`; ממליץ על PostgreSQL transactional row במקום Railway
Variables עבור Evidence קצר־חיים, וממתין לאישור פורמלי ול־Adapter חי.

4.6 [ADR-0006 — Bot-reply Staging Evidence Attestation](0006-bot-reply-staging-evidence-attestation.md)
— `proposed`; ממליץ על חתימת Ed25519 ב־Railway Worker ועל צריכת nonce
אטומית ב־PostgreSQL. ה־primitive נשאר רדום ואינו פותח Gate.

4.7 [ADR-0007 — Public repository authority and license hold](0007-public-repository-authority-and-license.md)
— `accepted`; ‏`talstilkol/connect` הוא ה־Authority הציבורי היחיד,
ללא רישיון שימוש עד Legal review. ‏Gate29 והפיתוח נשארים חסומים.
