# מצב השלמה ומשימות מקומיות

תאריך בדיקה: 2026-08-14

## 1. אחוזי השלמה

1.1 תוכנית הפיתוח המקומית: **100%**.

1.1.1 כל 14 שלבי ה־Master Plan הושלמו בקוד המקומי.

1.1.2 Build, ‏TypeScript, ‏ESLint וכל 1,192 הבדיקות עוברים.

1.2 מוכנות פורמלית ל־Production: **15.2%**.

1.2.1 חמש מתוך 33 בדיקות ה־Production Readiness הן `ready`.

1.2.2 17 בדיקות חסומות על תצורה, ספק, תשתית או Evidence חיצוני.

1.2.3 11 בדיקות ממתינות להחלטת מוצר או מדיניות.

1.3 אומדן ניהולי לכל הדרך מהאפיון עד מערכת חיה: **70% ±5%**.

1.3.1 זהו אומדן מאמץ, לא יחס בין בדיקות. רוב עבודת ה־Domain, ה־UI,
האבטחה והבדיקות כבר בוצעה; העבודה שנותרה תלויה יותר בספקים,
חשבונות ענן, תרגילי שחזור וראיות CI.

1.3.2 אין לחשב ממוצע פשוט בין 100% ל־15.2%, משום ששני המדדים מודדים
דברים שונים וחלק מבדיקות ה־Production הן שערים ולא יחידות מאמץ.

## 2. משימות מקומיות: הושלם ונותר

האומדנים הם זמן פיתוח נטו של מפתח אחד, ללא המתנה לאישור ספק,
Credentials, בדיקת עורך דין או זמני Review.

2.1 **הושלם:** שמונת PR Checks המקומיים נוספו ל־GitHub Actions.

2.1.1 כל שער רץ כ־Job נפרד בשם החוזי שלו: Source guardrails,
‏Secret hygiene, ‏Interface guardrails, ‏Dependency lock, ‏Migrations,
‏TypeScript, ‏ESLint ו־Tests/Build.

2.1.2 יחד עם `dependency-audit` הקיים, ה־Repository מגדיר את כל תשעת
ה־Checks שדורשים חוזי Governance ו־CI Evidence. הפעלה חיה תאומת דרך
Pull Request לפני סימון Governance כמוכן.

2.2 **הושלם מקומית:** מחוללי Evidence ל־GitHub Governance ול־CI
Execution.

2.2.1 המחולל דורש `GITHUB_REPOSITORY` מפורש, קורא ארבעה Endpoints
ב־`GET` בלבד, מאמת Branch Protection, ‏CODEOWNERS, ‏Secret Scanning,
‏Push Protection ותשעת ה־Checks, וקושר את הפלט ל־Commit ול־Release.

2.2.2 הפלט תקף ל־24 שעות ואינו כולל Repository, ‏Branch, ‏URL, לוג
או Run ID גלוי. הרצה חיה נשארת חסומה עד שההגנות יופעלו ב־GitHub.

2.3 **הושלם מקומית:** כלי Evidence ל־Cloudflare Environment
Isolation ול־Deployment Provenance.

2.3.1 המחולל קורא ב־`GET` בלבד Deployments, ‏Version bindings,
Schedules ו־Queues, ומאמת שמשאבי D1, ‏R2, שלושה Queues ושלושה DLQs,
Rate Limits, ‏Secrets ו־Scheduler אינם משותפים בין ארבע הסביבות.

2.3.2 חוזה Environment Isolation שודרג ל־v2 עם 52 Fingerprints
ותפוגה של 24 שעות. Deployment Provenance נקשר ל־Release, ‏Commit,
Artifact, ‏Deployment, ‏Version ו־script ETag. אימות חי עדיין דורש
חשבון Cloudflare, ארבע פריסות מבודדות ו־Token לקריאה בלבד.

2.4 **הושלם מקומית:** קישור Browser Evidence החתום ל־JSON המדויק
של Runtime.

2.4.1 גם Verifier החתימה וגם Verifier הקובץ דורשים התאמה
byte-for-byte בין הקובץ המוגן לבין
`TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON`. שינוי תוכן או אפילו
Whitespace נכשל סגור לפני Production Readiness או מחיקת Secrets.

2.4.2 האימות מתבצע באותה קריאה שבה נבדקים קובץ ה־Evidence וה־Bundle
לפני ואחרי `gh attestation verify`, ולכן Digest תקין אינו יכול לאשר
ערך Runtime אחר.

2.5 **בביצוע:** פיצול `WorkspaceApp` לפי Feature ללא שינוי התנהגות
עסקית.

2.5.1 ה־Dashboard ו־Metric cards הועברו ל־`WorkspaceDashboard`.
ה־Onboarding, שמירת פרופיל העסק ובדיקות השלמות הועברו
ל־`WorkspaceOnboarding`. עשרת שלבי ההקמה נמצאים ב־Registry משותף
וקפוא, ו־Feature heading משותף נמצא ב־`WorkspaceFeaturePage`.

2.5.2 בדיקות Boundary מונעות החזרת לוגיקת Dashboard או Onboarding
ל־`WorkspaceApp`.

2.5.3 נותרו לפיצול: Meta connection panel ו־Shell/section composition.
אומדן שנותר למשימה: **4–8 שעות**.

2.6 פיצול `ConversationInbox` ל־Thread list, ‏Message view,
Assignment ו־Composer.

2.6.1 אומדן: **6–10 שעות**.

2.7 פיצול `app/globals.css` לקובצי Feature ושכבת Tokens.

2.7.1 הקובץ הנוכחי מכיל כ־7,890 שורות ולכן יש לבצע את הפיצול
במנות קטנות עם בדיקות Regression.

2.7.2 אומדן: **12–20 שעות**.

2.8 בדיקות עומס וכשל מקומיות נוספות.

2.8.1 תכולה: Queue backlog, ‏DLQ, ‏Retry, ‏Provider timeout,
Retention plan expiry ו־Restore evidence mismatch.

2.8.2 אומדן: **8–12 שעות**.

2.9 Release rehearsal מקומי ותיעוד מפעיל.

2.9.1 תכולה: Fail-closed production gate, סדר הורדת Artifacts,
הזרקת Evidence, Rollback/Forward-fix ו־Smoke checklist.

2.9.2 אומדן: **4–6 שעות**.

2.10 סך העבודה המקומית שנותרה:

2.10.1 מאמץ ישיר שנותר: **34–56 שעות**, שהם כ־**5–8 ימי עבודה**.

2.10.2 עם Review, תיקוני Regression ותיעוד: **6–10 ימי עבודה**.

## 3. עבודה שאינה מקומית בלבד

3.1 חיבור Meta, ‏AI, ‏Billing, ‏File Scanner ו־Alert provider מתחיל
רק לאחר בחירת ספקים ופתיחת חשבונות אמיתיים.

3.2 Staging Browser E2E דורש פריסה מבודדת, שש זהויות בדיקה,
Case Inventory ו־D1 Read token.

3.3 Backup/Restore ו־Retention אינם יכולים להיחשב מוכנים עד להרצה
מול משאבי ענן אמיתיים ושמירת Evidence מתאים.

3.4 Retention deletion adapter יישאר מושבת עד אישור משפטי של
המדיניות ומימוש Legal Hold.
