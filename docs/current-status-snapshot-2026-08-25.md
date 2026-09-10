# Connect — Snapshot מצב ותוכנית המשך

תאריך אימות: 2026-08-25

## 1. מטרת המסמך

1.1 זהו Snapshot קצר של המצב שנמדד בפועל.

1.2 הוא אינו מחליף מסמכי אפיון, ADRs או Runbooks. הוא מחליף רק מספרי
סטטוס ישנים במסמכים המצטברים.

1.3 אין לפרש הצלחה מקומית כהוכחת Production. ‏Accounts, ספקים,
Credentials, פריסה ותרגילי Staging דורשים Evidence חי ונפרד.

## 2. Evidence מקומי מאומת

2.1 בסיס המדידה של הקוד, לפני הוספת מסמך Snapshot זה, הוא
`3ed301fcbed4cdd7d64f9fcbb359a607d594991e`. בזמן המדידה ה־HEAD המקומי
והענף המרוחק `codex/cloudflare-evidence-builders` הצביעו שניהם אליו.

2.2 בבסיס המדידה הענף מכיל 200 Commits מעל `origin/main`. ‏`main` לא
מוזג ולא שונה במסגרת העבודה הזאת.

2.3 שער `npm run verify:release-gate:local` עבר:

2.3.1 ‏3,369 מתוך 3,369 בדיקות עברו, ללא כשל, Skip או Todo.

2.3.2 שני Builds, ‏TypeScript ו־ESLint עברו.

2.3.3 קיימת אזהרת ESLint אחת, ללא Error, ב־
`server/platform/postgresBotReplyStagingReleaseEvidenceOperatorRepository.ts`:
Import שאינו בשימוש.

2.3.4 Source guard סרק 790 קבצים, 35 Client graphs ו־1,840 קשרי
תלות של TypeScript.

2.3.5 Secret hygiene סרק 1,637 קובצי עבודה והיסטוריית Git: ‏1,336
קבצים מנוהלים ו־301 קבצים חדשים.

2.3.6 נבדקו 43 תלויות ישירות, 43 מיגרציות D1, ‏49 מיגרציות
PostgreSQL ו־55 טבלאות D1.

2.4 האימות המבודד האחרון של Queue Evidence עבר 2,613 מתוך 2,613
בדיקות יחד עם Builds, ‏TypeScript, ‏ESLint ו־Source guard.

## 3. עבודה מקומית שעדיין אינה מוגנת

3.1 נותרו 429 נתיבים לא מחויבים:

3.1.1 ‏128 קבצים מנוהלים ששונו.

3.1.2 ‏301 קבצים חדשים.

3.1.3 אין קובץ Staged בזמן יצירת Snapshot זה.

3.2 חלוקה לפי אזור:

| אזור | נתיבים |
|---|---:|
| `server/` | 225 |
| `tests/` | 157 |
| `docs/` | 24 |
| `scripts/` | 11 |
| `shared/` | 3 |
| `features/` | 3 |
| `db/` | 2 |
| קובצי שורש ו־`worker/` | 4 |
| **סך הכול** | **429** |

3.3 אין להשתמש ב־`git add .`. כל Slice דורש Review, בדיקות מבודדות,
Commit אטומי ו־Push נפרד.

## 4. מצב 15 השלבים

4.1 אף אחד מ־15 השלבים האסטרטגיים עדיין אינו עומד בכל תנאי הסגירה.

4.2 שני שלבים בביצוע פעיל:

4.2.1 שלב 1 — הגנת העבודה ומקור אמת.

4.2.2 שלב 3 — Runtime, ‏Readiness ו־Cutover.

4.3 שלושה שלבים תלויים בעיקר בהחלטות וב־Evidence חיצוני:

4.3.1 שלב 2 — Governance, ‏Accounts ובעלי תפקידים.

4.3.2 שלב 4 — Staging ואינטגרציות חיות.

4.3.3 שלב 5 — Operations ו־Pilot gate.

4.4 שלבים 6–15 נדחים עד לאחר Closed Pilot ומדידת שימוש אמיתי.

## 5. אחוזי השלמה

5.1 Baseline המקומי ההיסטורי: 100%.

5.2 בסיס הקוד המקומי הנוכחי: 80%–85%, אומדן.

5.3 מוכנות ל־Closed Pilot מוכח: 30%–40%, אומדן.

5.4 חזון Best-in-class: ‏15%–25%, אומדן.

5.5 אין להעלות את אחוז ה־Pilot על סמך מספר Commits או Tests בלבד.
עדיין חסרה השרשרת החיה:

`Accounts → Deployment → Meta → Monitoring → Restore → Go/No-Go`.

## 6. סיכונים פתוחים

6.1 ‏P1 — `package.json` ושני Scripts של BullMQ משנים את פקודות
ההפעלה. הם נשארים מחוץ ל־Commit עד קיום Kill switch אמיתי, D31
ו־Staging evidence.

6.2 ‏P1 — שכבות `current*` ו־Server Actions רבות מחליפות D1 ב־Railway
API. אין להכניס אותן ב־Commit חלקי או לפרוס אותן לפני Cutover מתוזמר.

6.3 ‏P1 — `worker/index.ts` משנה מסלול Cloudflare פעיל ולכן אינו משולב
עם עבודת Railway.

6.4 ‏P1 — מתגי Readiness כגון `targetQueueAdapter:false` ו־
`botReplyDeliveryAdapter:false` אינם Kill switch של Runtime.

6.5 ‏P1 — D31 פתוח: Production עדיין מבוסס על `DATABASE_URL` יחיד.
נדרשות ארבע זהויות PostgreSQL נפרדות: Migration owner, ‏API, ‏Worker
ו־Verifier/Readback.

6.6 ‏P1 שתוקן ונשמר ב־`3ed301f`: Queue acceptance evidence דורש זמן
בדיקה מפורש ונכשל סגור כאשר הראיה עתידית, פגה או פגומה.

6.7 ערכי Meta ו־WhatsApp חיים אינם מאושרים. כל Capacity, ‏Retry,
Throughput או Rate limit נשארים חסומים עד Evidence מחשבון Test WABA
ואישור טל.

## 7. החלטות חיצוניות שחוסמות

7.1 ‏D03 — ספק Billing פעיל; ניתן להשאיר Checkout מחוץ ל־Pilot.

7.2 ‏D05 — File scanner; ניתן להשאיר Knowledge uploads כבויים ב־Pilot.

7.3 ‏D14 — Object storage; נדרש לפני Knowledge uploads חיים.

7.4 ‏D31 — אישור ארבעת תפקידי PostgreSQL והקצאת Credentials נפרדים.

7.5 ‏ADR-0003, ‏ADR-0004 ו־ADR-0005 — Approver, מועד UTC ו־Evidence.

7.6 ‏D19–D21 — RACI שמי, נכסי Meta, גבולות Pilot ותנאי עצירה.

7.7 ‏D23/D28 — מחיר, מטבע, Quotas ותקרת עלות לכל ספק.

7.8 ‏D10/D16/D27 — שעות תמיכה, Domains, ‏Regions, ‏Canary ו־Rollback.

7.9 ‏D11/D26 — Retention, ‏Legal Hold, ‏Privacy, ‏Terms, ‏DPA ו־Data
residency באישור Legal.

7.10 ‏D29 ו־D30 אינן חוסמות Pilot ויישארו פתוחות עד שקיימים נתוני שימוש.

## 8. זמן שנותר

8.1 עד WhatsApp Closed Pilot: ‏164–322 שעות עבודה נטו.

8.2 אם AI ו־Knowledge uploads נכללים ב־Pilot: ‏188–370 שעות.

8.3 אחרי Pilot, שלבים 6–15: ‏1,840–3,560 שעות.

8.4 סך התוכנית שנותרה לפי אומדן התכנון הקיים: כ־2,000–3,890 שעות,
לפני זמני המתנה ל־Meta, ‏Legal, ‏GitHub וספקים.

8.5 אומדן שלב 3 דורש כיול מחדש אחרי פירוק D31, ‏Readback function
ו־Staging proof; עד אז אין להקטין את הטווח הפורמלי.

## 9. סדר הביצוע הבא

9.1 להמשיך Review ו־Commits קטנים עבור 429 הנתיבים שנותרו.

9.2 לאשר D31 ולבנות Capability credentials נפרדים.

9.3 להוסיף Runtime kill switches שאינם תלויים ב־Readiness UI.

9.4 להשלים GitHub Ruleset, ‏Required checks, ‏CODEOWNERS ו־RACI.

9.5 לפרוס Staging מבודד ורק בו להפעיל PostgreSQL, ‏Redis, ‏Clerk,
Test WABA ו־Better Stack.

9.6 להפיק Evidence חי עבור Idempotency, ‏429/Retry-After, ‏DLQ,
Restore, ‏Tenant isolation, ‏Load, ‏Rollback ו־Kill switch.

9.7 לבצע Go/No-Go ורק לאחר אישור טל לערכי WhatsApp לפתוח Closed Pilot.
