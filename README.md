# Connect — WhatsApp Business Platform

ממשק Web ראשוני למערכת ה־SaaS החדשה שמחליפה את חיבור WhatsApp Web הלא־רשמי
ב־Connect הישן.

## מסמכי תכנון ותפעול מרכזיים

1. [תוכנית העבודה הצוותית](docs/team-operating-plan.md).
2. [Baseline מגבלות WhatsApp ו־Rate Limiting](docs/whatsapp-rate-limits.md).
3. [המלצות להחלטות החיצוניות](docs/external-decisions-recommendations.md).
4. [Release checklist](docs/release-checklist.md).

## מצב Master Plan — תשתית Stage 3

1. בחירת סביבת עבודה למשתמש רב־Tenant נשמרת ב־D1 ולא ב־Cookie
   או ב־Browser Storage.
2. הדפדפן מקבל מפתח בחירה SHA-256 אטום, שם תצוגה ו־Role בלבד;
   `tenantId` ו־External User ID נשארים בשרת.
3. השמירה משתמשת ב־Expected Version, בודקת מחדש Membership פעיל
   וסטטוס Tenant, וחוסמת שינוי מקביל או בחירה זרה.
4. בחירה ישנה שאיבדה כשירות מחייבת בחירה מחדש ואינה יוצרת Deadlock.
5. שער React מוצג לפני טעינת מידע עסקי, כולל Focus תקין,
   `aria-live`, מצב Pending ו־RTL.
6. ה־Sidebar כולל מחליף Tenant נגיש שמבצע שמירה בשרת ומרענן את
   כל נתוני ה־Workspace לאחר הצלחה.
7. מסך הצוות טוען Memberships פעילים אמיתיים מ־D1 ודורש
   `team.manage`. לכל Membership יש Version חיובי; Identity Display
   עובר דרך Port שנכשל סגור ומציג Reference Code אטום עד חיבור ספק
   מאומת. Audit Events הם immutable ומקושרים למצב שנשמר.
8. שכבת Team Mutation השרתית מבצעת שינוי Role/Status ו־Owner
   Transfer עם Expected Version ו־Audit אטומי. Server Actions
   מוגנים ב־Mutation Session וב־Rate Limit ומחזירים DTO אטום.
9. Invitation Request מאמת אימייל ותפקיד, דורש Policy מפורשת
   ומבודד Tenant דרך Server Action מוגן. State, ‏Audit ו־Outbox
   נשמרים לפני פרסום Delivery Key ל־Queue.
10. מחזור חיי Invitation נשמר ב־D1 עם Version, ‏Audit אטומי
   ומצבי Pending, ‏Revoked, ‏Expired ו־Accepted לוגי.
11. Durable Outbox נכתב באותה טרנזקציה עם Invitation ו־Audit.
   ה־Processor מבצע Claim יחיד, מסווג Provider unavailable כ־
   Blocked ותוצאה לא ידועה כ־Ambiguous ללא Retry אוטומטי.
12. Reconciliation בודק Delivery מסוג Ambiguous לפי המפתח
   הדטרמיניסטי, ללא שליחה חוזרת. רק תשובת ספק ודאית מעבירה אותו
   ל־Submitted או ל־Blocked; ספק לא זמין משאיר אותו Ambiguous.
13. Queue ייעודי ו־Worker מחוברים ל־Outbox דרך Message contract
   מצומצם. כל עוד ה־Provider אינו מוגדר, ההודעה עוברת Retry לפני
   Claim והרשומה נשארת Pending.
14. TTL ו־Re-request אינם מקבלים Defaults. הזמנה Pending שפג
   עוברת ל־Expired עם Audit וביטול Outbox אטומי לפני Re-request.
15. Expiration Scheduler סורק הזמנות שפגו ב־Keyset Pages של עשרה,
   עד 50 בריצה, ומבצע Transition עם Expected Version ו־System Actor.
16. Acceptance מאומת מבטל Outbox Pending, מעדכן Version, יוצר
   Membership פעיל וכותב Acceptance Audit immutable באותו D1 Batch.
   הוכחת הזהות אינה נשמרת, ו־Retry זהה אינו מכפיל Membership.
17. Server Action לקבלה קורא את Clerk session בצד השרת, דורש
   Primary Email מאומת ואוכף Rate Limit לפני Persistence. הדפדפן
   שולח רק Invitation Key ואינו רשאי לספק Proof או Identity.
18. נתיב `/invite/[invitationKey]` מציג Landing Page נגיש המוגדר
   `noindex` ו־`no-referrer` ואינו מציג נתוני Tenant או Identity.
19. ברירת המחדל של React היא כפתור מושבת. מצב `staging-e2e` נפתח
   רק ב־HTTPS מרוחק עם Clerk, ‏Policy וזהות Release מלאה.
20. שער Browser E2E דורש Evidence קצר־חיים עבור שבעה תרחישים,
   המקושר ל־Release, ‏Commit, ‏Artifact, ‏Staging Origin ו־Policy.
21. מצב `production` דורש בנוסף Browser Evidence ו־Deployment
   Provenance תואמים. Server Action משתמש באותו Activation Gate.
22. מחולל Evidence מקבל Receipt אמיתי בלבד, משווה אותו ל־Release
   ול־Commit הנקיים ושומר Artifact ללא PII שאינו נכנס ל־Git.
23. Scenario Registry מגדיר 22 Assertions קנוניים ממקורות Browser
   ו־Database. כל Scenario Digest קשור לתוצאות המסודרות שלו.
24. Database Proof Reader מבצע SELECT יחיד ומחזיר Counts מוגבלים.
   שכבת Assertion ממירה Before/After ל־Digest ללא Rows או מזהים.
25. Runner Adapter מאמת בעצמו 14 Browser Observations ושמונה
   Database Assertions ומרכיב Receipt אחד בעל 22 Digests; הוא אינו
   מקבל `passed`, ‏Digest או `verifiedAt` מה־Executor.
26. Executor Core מריץ את שבעת התרחישים ברצף, קורא D1 לפני ואחרי
   פעולת Browser ונכשל מיד על Timeout, Observation שגוי או מעבר
   Database לא בטוח.
27. Staging Case Inventory קצר־חיים מקושר לזהות הפריסה ומבודד שבעה
   Invitation Keys וזהויות. D1 Proof Port דוחה תוצאה שהושלמה לאחר
   Abort ואינו מוסיף Mutation או Route.
28. Browser Port Core ממפה שבעה Session Profiles ל־Observations
   מסוננים. Session חסר ואימייל לא מאומת מייצרים Outcomes נפרדים;
   תרחיש הנגישות משתמש ב־Invitation שכבר התקבל וללא Mutation חדש.
29. Playwright Adapter פותח Chromium Headless ו־Browser Context חדש
   לכל תרחיש, טוען Auth state מזיכרון בלבד וסוגר את ה־Context לפני
   הפקת Transcript. הוא חוסם Referrer וניווט Cross-origin ואינו
   מחזיר Cookies, ‏URL או Invitation Key.
30. Focus refs סמנטיים מקבעים את סדר ה־Keyboard בלי לקרוא טקסט מתורגם.
   ה־Launcher מחבר Inventory, ‏Playwright ו־D1 Remote Proof, אך
   Credentials אמיתיים עדיין חסרים ולכן אין Browser Evidence אמיתי.
31. Local Release Gate עובר עם 1218/1218 בדיקות, 30 Migrations,
   ‏396 קובצי Source, ‏26 Client dependency graphs, ‏755 קבצים
   בסריקת Secrets ו־23 Dependencies ישירים נעולים.
32. Next, ‏React, ‏Cloudflare Vite Plugin, ‏Vite ו־Wrangler שודרגו
   לגרסאות Stable מקובעות. `npm audit --omit=dev` מדווח אפס
   פגיעויות ידועות בגרף ה־Production.
33. בגרף הפיתוח נשארו שש התראות ב־`drizzle-kit` וב־`vinext`.
   הצעת התיקון האוטומטית היא Downgrade שובר ולכן אינה מיושמת.
34. Vite config משתמש כעת ב־JSON import attributes ובסיומת קובץ
   מפורשת, ללא אזהרת ה־Native config loader החדשה.
35. שמונת שערי האיכות המקומיים מוגדרים כ־Pull Request Checks
   נפרדים ב־GitHub Actions; יחד עם Dependency Audit קיימים כל תשעת
   שמות ה־Checks שחוזה ה־Production דורש.
36. Node `24.18.1` LTS נעול ב־`.node-version` ומשמש את כל ה־workflows;
   `engines.node` דוחה גרסאות שאינן תומכות בהרצת קובצי TypeScript
   הנדרשת על ידי כלי הבדיקות וה־Evidence.
37. בדיקות Release ב־CI מורידות היסטוריית Git מלאה. במאגר פרטי
   בבעלות משתמש אישי, Dependency Audit נשאר Check מחייב ומעלה Evidence
   לא־חתום; שער Production אינו מקבל אותו כתחליף ל־Attestation אמיתי.
38. `npm run evidence:github` קורא ארבעה Endpoints של GitHub במצב
   Read-only, דורש Repository מפורש ו־Release נקי, ומפיק Governance
   ו־CI Evidence בני 24 שעות ללא שמות Repository, ‏Branch או Run.
   `npm run evidence:cloudflare` קורא רק Endpoints מסוג `GET`, מאמת
   52 משאבים מבודדים ופריסה יחידה המקושרת ל־Release ול־Artifact,
   ומפיק Evidence בני 24 שעות ללא מזהי משאבי Cloudflare גלויים.
35. D1 Remote Proof Adapter שולח רק את שתי שאילתות ה־SELECT
   הקנוניות ל־Cloudflare API endpoint קבוע ומחייב D1 Read token.
36. תגובת D1 מתקבלת רק כאשר ה־API מדווח `changed_db = false`,
   ‏`changes = 0` ו־`rows_written = 0`; שגיאות ספק ו־Rows גולמיים
   אינם נכנסים ל־Receipt.
37. Account, ‏Database ו־Token נשארים ב־Secrets של סביבת Staging.
   אין Route ציבורי, Mutation, ‏Retry אוטומטי או יצירת משאב ענן.
38. Production נשאר No-Go: ‏5 Ready, ‏17 Blocked ו־11
   Decision Required.
39. Launcher סגור דורש Release נקי, ‏Artifact Digest, ‏Policy,
   Inventory קצר־חיים ושישה Auth states מדויקים לפני פתיחת Chromium.
40. שבעת התרחישים רצים דרך אותם Core contracts. ה־Browser נסגר לפני
   כתיבת Receipt אטומי; כשל בכל Port מונע Evidence חלקי.
41. GitHub Actions ידני מוגן ב־`staging-e2e`, משתמש ב־Actions
   המקובעים ל־Commit ומעלה Receipt ו־Evidence ליום אחד בלבד.
42. הפעלת ה־Workflow נשארת פעולה חיצונית: יש ליצור את Environment,
   להזין Secrets ו־Variables אמיתיים ולהכין Inventory תואם לפריסה.
43. שלב Preflight מאמת Release נקי, ‏Artifact, ‏Origin, ‏Policy,
   Inventory, שישה Auth states ותצורת D1 לפני התקנת Chromium. הוא
   אינו פונה לרשת, אינו פותח Browser ואינו כותב Receipt.
44. מחולל Case Inventory מקבל שבעה Cases דרך Secret זמני, גוזר
   חלון של שעה וכותב JSON קנוני בהרשאות `0600` תחת `.artifacts`.
   Invitation Keys וזהויות אינם מודפסים ואינם נשמרים ב־Git.
45. Auth State Validator מאמת לעומק שישה Profiles: לפחות Cookie
   מאובטח אחד, Domain השייך ל־Staging, תפוגה המספיקה לריצה ו־Origin
   זהה. שדות נוספים, כפילויות, Domain זר ו־IndexedDB נדחים.
46. כלי Auth Capture אינטראקטיבי פותח שישה Browser Contexts מבודדים
   ומאפשר למפעיל להתחבר ידנית לכל Profile. הוא שומר רק State השייך
   ל־Staging בקובץ `0600`; הוא אינו מקבל או מדפיס סיסמה, Token או
   Cookie. הרצה אמיתית עדיין דורשת שש זהויות Staging מורשות.
47. File Safety Gate פותח את Auth Bundle ללא מעקב אחר Symlink,
   דורש קובץ רגיל בבעלות המשתמש, Link יחיד והרשאת `0600`, ומאמת שוב
   את התוכן והתפוגה לפני העברה ל־Secret Store. הפלט אינו כולל State.
48. אותו גבול קובץ פרטי מגן גם על Case Inventory. שער ייעודי מאמת
   שהקובץ עדיין קשור ל־Origin, ‏Release, ‏Commit, ‏Artifact ו־Policy
   המדויקים, ומבדיל בין קובץ פגום, פג תוקף או לא תואם בלי לחשוף Keys.
49. שער משולב מאמת את Auth Bundle ואת Case Inventory באותו Clock
   ומחייב התאמה ביניהם ובינם לבין ה־Release הנקי. כשל בקובץ הראשון
   עוצר לפני קריאת השני, והפלט כולל מונים ומזהי פריסה בטוחים בלבד.
50. לאחר העברה מאומתת ל־Secret Store וריצת שבעת תרחישי ה־Staging,
   GitHub Actions חותם את Browser Evidence באמצעות Sigstore. כלי
   Cleanup דורש Attestation תקף מאותו Repository, ‏Workflow ו־Commit,
   התאמה byte-for-byte ל־JSON שב־Runtime ואז Evidence סמנטי לאותו
   Release. רק לאחר מכן הוא מעביר את שני
   הקבצים ל־Quarantine, מאמת אותם שוב ומבצע `unlink`. כשל מוקדם מחזיר
   אותם; הכלי אינו טוען למחיקת SSD, ‏Snapshot או Backup.
51. Dependency Audit אינו עוד Boolean סטטי. מחולל ייעודי מריץ רק את
   גרף Production מול npm Registry הרשמי, שומר Evidence קצר־חיים
   הקשור ל־Release, ‏Commit, ‏Git Tree ו־Lockfile, ומציג פגיעויות
   כמחסום מפורש במקום להסתיר אותן כשגיאת Parsing.
52. Workflow נפרד מריץ את ה־Audit עבור Pull Request, חותם את
   ה־Evidence באמצעות GitHub Attestations ושומר אותו ליום אחד בלבד.
   שער Production דורש התאמה בין הקובץ החתום, ה־Repository,
   ה־Workflow, ה־Commit וה־JSON שמוזרק ל־Runtime.

## מצב שלב 14 — כל 7 היחידות הושלמו בקוד המקומי

1. שער Production מרכז 33 בדיקות ונכשל סגור עבור כל חסימה או
   החלטה חסרה.
2. Meta Webhook, פעולות Tenant ופעולות System Admin משתמשים בשלוש
   Policies נפרדות של Rate Limiting.
3. Upload Policy דורש גודל מרבי ורשימת MIME מפורשים ללא Defaults.
4. העלאת מקור דורשת `ai.write`, נגזרת מ־Tenant Session ומשתמשת
   בזהות SHA-256 דטרמיניסטית.
5. R2 נבדק לפי Object Key, ‏Digest, ‏MIME וגודל לפני Scan.
6. Scanner חסר, כושל או בעל תשובה פגומה נכשל סגור. גם Scan נקי
   אינו הופך מקור ל־`ready` לפני Extraction ו־Passages.
7. Server Action מחזיר DTO ללא Tenant, ‏Digest או R2 Object Key.
8. ממשק ההעלאה נשאר מושבת עד אישור Policy וחיבור Scanner אמיתי.
9. Queue Batch גדול מעשרה נעצר לפני גישה עסקית. בדיקה מקומית של
   1,000 הודעות מוכיחה עיבוד עם פריט פעיל יחיד.
10. Campaign DLQ ניתן להחזרה רק לאחר Confirmation דטרמיניסטי ולפני
    ACK.
11. Knowledge Scan תקוע ניתן ל־Retry רק לפי גיל ו־Expected Version.
12. נוסף חוזה Telemetry תפעולי מוגבל ל־Queue ול־Knowledge Recovery,
    ללא תוכן לקוח, Tenant או מזהים חיצוניים.
13. יעד הזמינות 99.5% מחושב ב־Basis Points שלמים, כולל Error Budget,
    מצב ללא נתונים וסף מינימום מפורש.
14. חלון המדידה, מספר האירועים המינימלי, בעל ההתראה ונתיב
    ה־Escalation הם תצורת חובה ללא Defaults.
15. שירות הניטור מפעיל מדידה, הערכת Policy ושליחת Alert בזרימה אחת,
    ונכשל סגור אם מקור המדידה או ספק ההתראות אינם זמינים.
16. Backup Policy דורש תדירות Backup, תקופת שמירה ותדירות תרגיל
    Restore מפורשות ללא Defaults.
17. ראיית Backup מתקבלת רק עבור D1 ו־R2 מאומתים ותרגיל Restore
    לסביבה מבודדת שאינו ישן מהמדיניות.
18. Retention Policy דורש כיסוי מלא של 25 מחלקות המידע הקיימות.
19. Purge דורש Plan דטרמיניסטי ו־Confirmation תואם; אין Adapter
    מחיקה פעיל ולכן שום מידע אינו נמחק.
20. ביקורת מקור סטטית עוברת על קוד האפליקציה ומונעת Randomness אסור,
    Dynamic Code Execution, HTML Injection, ‏Browser Storage סמכותי
    ו־Secrets שרתיים במודולי Client.
21. 15 בדיקות ממשק מקבעות RTL, נקודות שבירה, Focus, ‏Reduced Motion,
    ניווט, Mobile Menu, ‏Dialog ו־Skip Link.
22. Dependency Lock מאמת 23 תלויות ישירות מול `package-lock.json`.
    Dependency Audit דורש Evidence בן 24 שעות לכל היותר, הקשור
    מתמטית לאותו Release וכולל רק מונים ללא פרטי Advisories.
23. Local Release Gate עובר. Production Release Gate דורש תחילה
    Attestations קריפטוגרפיים ל־Dependency Audit ול־Browser Evidence,
    ורק לאחר מכן מריץ את 33 בדיקות ה־Readiness. כרגע הוא נכשל בכוונה
    על Evidence חסר ועל 5 Ready, ‏17 Blocked ו־11 Decision Required.
24. כל הבדיקות, Build, ‏TypeScript ו־ESLint עוברים דרך Local
    Release Gate. Deployment Provenance דורש התאמה מלאה בין
    ה־Release Manifest, ‏Commit, ‏Artifact ופריסת Production.
    CI Execution Evidence דורש תשעה PR Checks מוצלחים ואינו יוצר
    מעגל תלות מול שער Production הסופי.
25. כל 14 השלבים הושלמו בקוד המקומי. פרסום נשאר חסום עד השלמת
    ההחלטות, הספקים, משאבי הענן והתרגילים החיצוניים.

## מצב שלב 13 — כל 5 היחידות הושלמו מקומית

1. נוספו Domain Contracts לדוח תפעולי מאוחד עבור קמפיינים, הודעות,
   שיחות, Bot ו־AI.
2. נוסף D1 Repository לקריאה בלבד, עם Prepared Statements וסינון
   `tenant_id` בכל שאילתה.
3. חלון הדוח הוא UTC קנוני, כולל את זמן ההתחלה ואינו כולל את זמן
   הסיום, ומוגבל ל־366 ימים.
4. עלויות AI מקובצות לפי מטבע ואינן מסוכמות בין מטבעות שונים.
5. הדוח נגזר מהטבלאות התפעוליות הקיימות; לא נוספו Schema, מיגרציה,
   נתוני Billing או נתוני תצוגה מומצאים.
6. Service דורש `reports.read`, גוזר Tenant מה־Session וממיר טווח
   תאריכים קלנדרי לחלון UTC של עד 366 ימים.
7. Server Action מחזיר DTO מפורש שאינו כולל Tenant, חלון SQL או
   שגיאה פנימית.
8. מסך React טוען 30 ימים כברירת מחדל, מאפשר בחירת טווח ומציג רק
   Aggregates אמיתיים. תוצאה ריקה מוצגת כאפס ללא נתוני תצוגה חלופיים.
9. מיגרציה 20 מוסיפה מנוי יחיד לכל Tenant והיסטוריית אירועים
   בלתי־ניתנת לדריסה לפי גרסת מנוי.
10. Repository תומך ביצירה, הארכה, שינוי מצב תפעולי וביטול, עם
    Expected Version, מפתח אירוע SHA-256 וסנכרון אטומי ל־Tenant.
11. לקוח יכול לקרוא את המנוי דרך `billing.read`. פעולות שינוי אינן
    חשופות ב־Server Action עד בניית הרשאות מנהל מערכת.
12. אין במודל מחיר, חבילה, ספק, חשבונית, מע״מ או אמצעי תשלום.
13. נוסף Contract ניטרלי לספק עבור אירועי הפעלה, חידוש, ביטול,
    פקיעה וכשל תשלום, ללא Plan, מחיר או פרטי סליקה.
14. גבול Webhook אוכף אימות Adapter לפני נרמול, גוזר Tenant דרך
    Resolver שרתי ואינו מקבל `tenantId` מאירוע הספק.
15. Receipt Port ומפתח SHA-256 דטרמיניסטי מגדירים Idempotency,
    Complete, ‏Fail ו־Retry ללא שמירת Payload גולמי.
16. ללא ספק מוגדר המערכת נכשלת סגור. אין Route חיצוני ואין שינוי
    Subscription אוטומטי לפני בחירת ספק ומדיניות תשלום.
17. נוספה זהות System Admin נפרדת המבוססת על Clerk ועל Allowlist
    שרתי בפורמט JSON; Tenant Owner אינו מקבל עוד `billing.write`.
18. פעולות יצירה, הארכה, שינוי מצב וביטול מחייבות System Admin,
    גוזרות Actor וזמן בשרת ומחזירות DTO מוגבל.
19. כל שינוי Subscription כותב באותה D1 Batch גם אירוע היסטוריה
    וגם Audit Log דטרמיניסטי, ללא Metadata רגיש.
20. כל 730 הבדיקות עברו לאחר השלמת גבול השרת של יחידה 5.
21. נוסף D1 Directory ל־System Admin עם Prepared Statement,
    Validation ו־Keyset Pagination של 50 Tenants.
22. נוסף Route דינמי `/admin` הנפרד מ־Workspace ומציג מצבי
    Configuration, Authentication, Permission, Empty ו־Server Error.
23. מסך React Admin מציג רק Tenants ומנויים מ־D1, ותומך ביצירה,
    הארכה, שינוי מצב וביטול דרך ה־Server Actions המאובטחים.
24. כל 742 הבדיקות, Build, ‏TypeScript ו־ESLint עוברים.
25. שלב 13 הושלם. השלב הבא הוא שלב 14 מתוך 14 — Hardening,
    אבטחה, עומסים והכנת Production.

## מצב שלב 12 — הושלם מקומית

1. כל 5 היחידות הושלמו. יחידה 5 כוללת:
   AI Agent Domain, ‏Validation, מפתחות SHA-256, שערי Readiness,
   ‏D1 Persistence, ‏Service, ‏RBAC, ‏Read Model, ‏Server Actions,
   ‏React Editor, ליבת Runtime ניטרלית לספק, D1 Runtime Ledger,
   ‏R2 Object Storage, ‏Retrieval Persistence, ‏AI Reply Outbox
   ומשטח אישור נציג ב־Inbox, וכן חיבור Inbound Bot/AI מבוקר.
2. Agent אינו יכול לעבור ל־Active בלי ספק מוכן, מדיניות חיוב,
   Response Mode, סף Grounding, מגבלת עלות, Handoff, ‏Audit ומקור
   ידע במצב `ready`.
3. פרסום גרסה הוא אטומי ומוגן ב־Expected Version; גרסה קודמת עוברת
   ל־Archived רק אחרי שהגרסה החדשה הפכה לפעילה.
4. פעולות שרת גוזרות Tenant מה־Session ומחזירות DTO ללא Tenant ID,
   ‏Digest, ‏Object Key או Error פנימי.
5. מסך React טוען Agents ומקורות מהשרת, שומר טיוטות, מציג היסטוריית
   גרסאות וחסמי הפעלה, ואינו מייצר נתוני תצוגה חלופיים.
6. ה־Runtime מתכנן Reply או Handoff בלבד ואינו שולח הודעה. הוא מפעיל
   Retrieval, ‏Grounding, ‏Cost ו־Audit בסדר Fail-Closed, ואינו כולל
   תוכן לקוח, Prompt, מקטעי ידע או תשובה ב־Audit.
7. מיגרציה 17 מוסיפה Cost Authorizations, ‏Usage ו־Audit Events
   מבודדי Tenant. ‏Handoff כותב Audit ומשנה את השיחה באותה D1 Batch.
8. Loader ייעודי מקבל רק Agent פעיל יחיד וגרסה פעילה שפורסמה; אפס
   או יותר מאחד נכשלים סגור.
9. מיגרציה 18 מוסיפה `knowledge_passages`. מקור עובר ל־`ready` רק
   באותה Batch ששומרת רשימת מקטעים מלאה ומאומתת; Retrieval מחזיר רק
   מקטעים ממקורות `ready` באותו Tenant.
10. R2 Adapter כותב וקורא Bytes במפתח דטרמיניסטי ומאמת SHA-256,
    גודל, MIME ו־Metadata. ה־Upload הציבורי, Scanner ומחלץ הטקסט
    נשארים Unavailable עד סגירת מדיניות הקבצים והספק.
11. מיגרציה 19 מוסיפה `ai_reply_outbox`. תשובה אוטומטית מתחילה
    `ready-for-delivery`; תשובה במצב `agent-approval` מתחילה
    `awaiting-approval` ויכולה לעבור רק לאישור או לדחייה מפורשים.
12. החלטת נציג נגזרת מה־Tenant Session, דורשת
    `conversations.reply`, מוגנת ב־Expected Version ונחסמת אם נכנסה
    הודעה חדשה לשיחה.
13. ה־Webhook מפעיל Orchestrator דטרמיניסטי: Bot פעיל מקבל קדימות,
    AI נשקל רק כאשר אין Bot פעיל, ומצב עמום נכשל סגור.
14. Retry נבדק End-to-End ואינו מפעיל Provider שוב לאחר שקיימת
    רשומת Outbox לאותה הודעה נכנסת, גם אם גרסת Agent השתנתה.
15. אין עדיין Provider Adapter אמיתי או חיבור Delivery של AI ל־Meta.
    גם `ready-for-delivery` אינו נחשב לשליחה או לקבלת Provider.
16. שלב 13 הושלם; כל 5 היחידות קיימות בקוד המקומי.

## מה קיים בגרסה הנוכחית

1. Dashboard רספונסיבי בעברית וב־RTL.
2. אשף הקמה בן 10 שלבים.
3. מסכי אנשי קשר, קמפיינים, תיבת שיחות, בונה בוט, AI, דוחות וחיוב.
4. מרכז לתיעוד 10 ההחלטות העסקיות החוסמות.
5. אינטראקציות מקומיות:
   1. ניווט בין המסכים.
   2. קריאת CSV מקומית, מיפוי עמודות וייבוא מאומת לאחר אישור מפורש.
   3. הוספת בלוקים דטרמיניסטית לתהליך בוט.
   4. מרכז ההחלטות ב־Workspace הוא Read-only; שמירה קבועה זמינה
      רק ל־System Admin דרך `/admin/decisions`.
   5. Dashboard שמציג 1 מתוך 10 לאחר שמירת פרטי העסק המקומיים.
6. תשתית נתונים מקומית:
   1. Schema ראשוני ל־D1 עבור Tenants, Memberships, Business Profiles ו־Audit Logs.
   2. מיגרציה ראשונה ללא Seed או נתוני דוגמה.
   3. Repository לפרטי עסק עם Prepared Statements וסינון לפי Tenant.
   4. Binding לוגי `FILES` ו־Adapter מאומת ל־R2; אין עדיין Route
      העלאה ציבורי או פעולה מול Bucket אמיתי.
7. תשתית זהות והרשאות:
   1. Clerk מחובר למסכי Login ו־Registration עם ממשק עברי.
   2. `proxy.ts` מגן על Routes של ה־Workspace כאשר Clerk מוגדר.
   3. Tenant Session נגזר מ־Clerk User ומ־Membership פעיל ב־D1,
      ורק כאשר זהות המשתמש תואמת והרשומה שייכת ל־Tenant נגיש.
   4. מטריצת RBAC נאכפת בצד השרת לפני גישה ל־Repository.
   5. משתמש ששייך ליותר מ־Tenant אחד נדרש לבחירה מפורשת; הבחירה
      מתקבלת רק אם Tenant ID נמצא ב־Memberships האמיתיים שלו.
   6. Tenant במצב `suspended`, ‏`cancelled`, ‏`expired` או `blocked`
      אינו יכול לייצר Session גם כאשר ה־Membership עצמו פעיל.
8. Onboarding קבוע:
   1. שמירת פרטי העסק עוברת דרך Server Action כאשר Clerk פעיל.
   2. משתמש מאומת ללא Membership מקבל Tenant ו־Owner Membership ראשוניים.
   3. יצירת Tenant, Membership, Business Profile ו־Audit מתבצעת ב־D1
      באצווה אטומית ו־idempotent.
   4. מזהה ה־provisioning נגזר באופן דטרמיניסטי מ־Clerk User ID ואינו משתמש
      ב־randomness.
   5. פרופיל קיים נטען מ־D1 לתוך React Workspace לאחר רענון.
   6. ללא Clerk נשמרת רק טיוטת rehearsal מקומית ומסומנת בהתאם.
9. תשתית Contacts ו־Consent:
   1. Schema מבודד Tenant עבור אנשי קשר והיסטוריית הסכמה.
   2. מספר טלפון קבוע מתקבל רק בפורמט בינלאומי מפורש; אין ניחוש קידומת.
   3. איש קשר חדש מתחיל חסום לדיוור עד לפעולת הסכמה מפורשת.
   4. הענקת הסכמה והסרה נרשמות כאירועים אטומיים ו־idempotent.
   5. עדכון פרטי איש קשר אינו משנה את מצב ההסכמה או ההסרה.
   6. שכבת RBAC מאמתת `contacts.write` לפני שינוי.
   7. מסך React טוען 50 Contacts בכל עמוד וממשיך עם Cursor מבודד Tenant.
   8. יצירה, תיעוד הסכמה והסרה מחוברים ל־Server Actions.
   9. ה־DTO לדפדפן אינו כולל `tenantId` או Evidence פנימי.
   10. Import Job קבוע שומר התקדמות ותוצאות שורה וניתן להמשך לאחר כשל.
   11. SHA-256 דטרמיניסטי מזהה קובץ, מיפוי ומספרי טלפון בלי Randomness.
   12. CSV מעובד במנות של שש שורות, עם Created, Updated, Unchanged,
       Rejected ו־Duplicate.
   13. ערכי Consent גולמיים בקובץ אינם מועברים למסלול הכתיבה ואינם
       מאפשרים דיוור.
   14. Pagination מסוג Keyset טוען רשומות ישנות יותר בלי Offset ובלי
       להעביר `tenantId` מהדפדפן.
   15. Tags ו־Lists קבועים מאפשרים ארגון ושיוך של אנשי קשר לפי Tenant.
   16. Unsubscribe הוא גלובלי; תגית או רשימה אינן יכולות לעקוף חסימת
       דיוור.
10. תשתית Meta ו־Webhook:
   1. Meta Connection שומר Business Portfolio ID, WABA ID ו־Phone Number
      ID בצד השרת בלבד.
   2. WABA ומספר Meta מוגבלים לחיבור יחיד כדי לשמור על בידוד Tenants.
   3. Challenge מאומת מול Verify Token שמוגדר בסביבת השרת.
   4. `X-Hub-Signature-256` מאומת על Raw Bytes באמצעות HMAC SHA-256.
   5. WABA נגזר גם ממבנה `PARTNER_ADDED` של Embedded Signup.
   6. Webhook Receipt מונע עיבוד כפול ותומך בניסיון חוזר לאחר כשל.
   7. Payload גולמי, תוכן הודעה, Access Token ו־App Secret אינם נשמרים
      במסד או נשלחים ל־React.
   8. קיימת מיגרציה שביעית ללא Seed עבור Connections ו־Receipts.
   9. React מקבל מהשרת `status` בלבד ומציג Connected, Pending, Restricted,
      Revoked ושגיאות בלי לחשוף מזהי נכסים.
   10. Connected מסמן את שלבי Meta, WABA ומספר כמושלמים ב־Dashboard;
       מצבים אחרים אינם נחשבים Send Ready.
   11. גרסת Graph API היא הגדרת שרת חובה ומפורשת; אין שימוש ב־`latest`
       או בגרסת ברירת מחדל סמויה.
   12. Graph Transport משתמש ב־origin קבוע של Meta, מעביר Access Token
       רק ב־`Authorization` header, חוסם redirects ומגביל timeout וגודל
       תשובה.
   13. Adapter להרשמת WABA קורא
       `POST /<WABA_ID>/subscribed_apps` ומקבל הצלחה רק כאשר Meta מחזירה
       `success: true`.
   14. שגיאות Graph נחשפות פנימית רק עם קוד בטוח, HTTP status וקודים
       מספריים של Meta; הודעת הספק וה־Token אינם נשמרים בשגיאה.
   15. Connection Orchestrator אוכף הרשאה ומחבר Code Exchange, אימות
       נכסים, שמירת Snapshot, Credential Vault והרשמת WABA בסדר
       Fail-Closed.
   16. מסלול Retry משתמש ב־Credential השמור ואינו דורש שימוש חוזר
       ב־Authorization Code.
   17. תצורת Embedded Signup נבדקת בצד השרת ומבדילה בין Missing, Invalid
       ו־Configured ללא חשיפת App Secret.
   18. React מקבל רק App ID, Configuration ID וגרסת Graph API, שהם
       הערכים הציבוריים הנחוצים להפעלת Meta SDK.
   19. Completion Handler ממפה תוצאת החיבור לסטטוס מוגבל בלבד; Authorization
       Code, מזהי נכסים ושגיאות ספק אינם חוזרים לדפדפן.
   20. Graph Asset Verifier מאמת ש־WABA שייך ל־Business Portfolio ושמספר
       הטלפון מופיע ב־WABA לפני שמירת ה־Snapshot.
   21. רשימת מספרי הטלפון נקראת עם Pagination מוגבל; המערכת משתמשת רק
       ב־Cursor ואינה עוקבת אחר `next` URL שמוחזר מ־Meta.
   22. Webhook HTTP Handler מטפל ב־GET Challenge וב־POST על Raw Bytes,
       עם Content-Type, Signature Header ומגבלת גוף Fail-Closed.
   23. Duplicate מקבל ACK ללא חשיפת Receipt; כשל עיבוד מוחזר כ־Retryable
       ואינו מסומן בטעות כהצלחה.
   24. Authorization Code Exchange Adapter ממיר את הקוד החד־פעמי דרך
       endpoint קבוע של Meta בצד השרת בלבד, עם timeout, חסימת redirect,
       הגבלת תגובה ושגיאות מסוננות.
   25. App Secret, Authorization Code ו־Access Token אינם נכללים
       בהודעות שגיאה או ב־Read Model של React.
   26. Meta Connection Runtime מחבר את Code Exchange, ‏Graph Asset
       Verification ו־WABA Subscription ל־Orchestrator אחד. Credential
       Vault ו־Connection Service מוזרקים מבחוץ.
   27. Loader מבוקר טוען את Meta JavaScript SDK פעם אחת ורק לאחר
       ש־Embedded Signup מוגדר. הוא מאמת source קבוע, תצורה, timeout
       ומונע אתחול מקביל עם App אחר.
   28. חוזה Client עבור Embedded Signup v4 מאמת את תשובת `FB.login`
       ואת אירועי `FINISH`, ‏`CANCEL` ו־`ERROR` מ־Meta.
   29. הודעות מתקבלות רק מ־HTTPS תחת `facebook.com`, מוגבלות בגודל
       ונכשלות סגורות עבור מזהים, Payload או זרימת Multi-WABA שאינם
       נתמכים ב־MVP.
   30. פרטי שגיאה, Session ו־Timestamp של Meta אינם עוברים ל־UI.
   31. Credential Vault מצפין Access Token באמצעות AES-GCM לפני
       שמירה. ה־Ciphertext קשור ל־Tenant באמצעות Additional
       Authenticated Data ואינו ניתן להעברה בין Tenants.
   32. מיגרציה שמינית מוסיפה Envelope מוצפן בלבד: Key Version, ‏IV
       ו־Ciphertext. אין עמודת Access Token או Payload גולמי.
   33. Server Action מחבר Tenant Session, ‏Credential Vault,
       Connection Service ו־Runtime. הכפתור פעיל רק כאשר כל תצורת
       השרת קיימת.
   34. React מתאם את ה־Authorization Code ואת אירוע ה־FINISH בכל סדר,
       שולח אותם לשרת פעם אחת בלבד ומקצר את חלון ההמתנה ל־25 שניות
       מרגע קבלת הקוד.
   35. ה־Worker חושף רק את הנתיב המדויק `/webhooks/meta` ומעביר GET
       Challenge ו־POST Events ל־Webhook HTTP Handler הקיים.
   36. POST מאומת נשלח ל־Cloudflare Queue כ־Raw Bytes עד 120,000 bytes.
       ה־HTTP Route מחזיר `200` רק לאחר שכתיבת ההודעה ל־Queue הצליחה.
   37. ה־Queue Consumer מאמת שוב את החתימה, מנתב לפי WABA מחובר בלבד
       ומשתמש ב־D1 Receipt הקיים כדי לספק Idempotency תחת מסירה
       מסוג At-Least-Once.
   38. כל הודעה ב־Batch מקבלת ACK או Retry בנפרד. לאחר עשרה ניסיונות
       היא מועברת ל־Dead Letter Queue; Processor עסקי שאינו מוגדר
       נכשל סגור ואינו מסמן אירוע בטעות כמעובד.
   39. Dispatcher טיפוסי מסווג את ה־Payload המאומת ל־Inbound Messages,
       ‏Delivery Statuses, ‏Template Status או Account Update. לכל
       יחידת עיבוד נוצר Dispatch Key דטרמיניסטי מ־Event Hash וממיקום
       האירוע ב־Payload.
   40. כלי ה־Dead Letter מציג רק Message ID, זמן, מספר ניסיונות, גודל
       ו־SHA-256. Replay דורש התאמה מפורשת ל־SHA-256, כותב מחדש ל־Queue
       ורק לאחר הצלחה מבצע ACK להודעה הישנה.
   41. ה־Worker מעבד רק את `connect-meta-webhooks`. ה־Dead Letter Queue
       אינה מחוברת ל־Consumer אוטומטי ולכן אינה יכולה ליצור Replay Loop
       או למחוק אירוע בלי פעולה תפעולית מפורשת.
   42. מיגרציה תשיעית מוסיפה `message_templates` עם בידוד Tenant,
       Unique לפי Tenant, שם ושפה, ומזהה Meta ייחודי כאשר הוא קיים.
   43. מפתח Template נגזר באופן דטרמיניסטי מ־Tenant, שם ושפה באמצעות
       SHA-256; אין מזהה אקראי.
   44. Validation שרתי מנרמל את ה־Definition, חוסם Authentication עד
       עורך OTP ייעודי ומאמת משתנים, Examples, Quick Replies ו־CTA.
   45. Repository ו־Service שומרים וקוראים טיוטות תחת RBAC. רק סטטוס
       `draft` ניתן לדריסה; תבנית שכבר נשלחה ל־Meta ננעלת לעריכת תוכן.
   46. Graph Transport תומך בגוף JSON מוגבל ל־POST, דוחה
       `access_token` בכל עומק ומעביר Credentials רק ב־Authorization
       Header.
   47. Template Submission Adapter ממפה Header, ‏Body, ‏Footer,
       Variable Examples, ‏Quick Replies ו־CTA לחוזה
       `POST /<WABA_ID>/message_templates`.
   48. מיגרציה עשירית מוסיפה מצב `submitting`, מפתח Submission
       דטרמיניסטי, זמן התחלה וקוד שגיאה בטוח ללא Payload ספק.
   49. Repository מבצע מעברים אטומיים
       `draft → submitting → pending_review`; דחייה מפורשת מחזירה את
       התבנית ל־Draft.
   50. Submission Service גוזר Tenant מה־Session, דורש Meta Connection
       מחובר, קורא Token רק דרך Credential Vault ואינו שולח שוב אחרי
       Timeout או כשל רשת שתוצאתם אינה ידועה.
   51. Read Model ייעודי מעביר ל־React רק את הגדרת התבנית, הסטטוס
       והזמנים הדרושים למסך; Tenant, מזהי Meta ופרטי Submission נשארים
       בצד השרת.
   52. Loader ו־Server Actions מחברים Clerk Session, ‏Tenant, ‏D1,
       ‏RBAC ו־Credential Vault לשמירה ולשליחה לאישור.
   53. מסך React טוען תבניות קבועות, מאפשר עריכת Draft ושליחתו ל־Meta,
       ומציג את מצבי `submitting`, ‏`pending_review`, ‏`approved`,
       ‏`rejected`, ‏`disabled` ו־`deleted`.
   54. Rehearsal מקומית נשארת זמינה רק כאשר Clerk או D1 אינם מוגדרים.
       חוסר הרשאה, Onboarding חסר או שגיאת שרת אינם מוצגים כשמירה
       מקומית מוצלחת.
   55. מיגרציה אחת־עשרה מוסיפה זמן אירוע Status אחרון בצמוד למפתח
       האירוע. שני הערכים חייבים להישמר יחד.
   56. Dispatcher דורש Timestamp תקין מכל Entry לפני עיבוד אירוע עסקי.
   57. Template Status Processor מאמת מזהה, שם ושפה וממפה את אירועי
       Meta למצבי Lifecycle מקומיים שחוסמים שליחה בעת ספק.
   58. לכל Change נגזר מפתח SHA-256 דטרמיניסטי. אירוע כפול אינו נכתב
       שוב ואירוע ישן אינו דורס סטטוס חדש יותר.
   59. `reason`, תיאורי ספק ו־Webhook Payload גולמי אינם נשמרים בטבלת
       התבניות.
   60. ה־Worker מחובר ל־Business Processor. ‏Template Status,
       ‏Inbox ו־Delivery Status מעובדים; Account Update עדיין נכשל
       סגור לפני כתיבה עסקית.
   61. List Adapter קורא את
       `GET /<WABA_ID>/message_templates` עם רשימת שדות ו־Page Size
       קבועים. הוא משתמש רק ב־Cursor מאומת ולא פותח URL המשך מהספק.
   62. מספר העמודים והתבניות מוגבל. Cursor חוזר, Template ID כפול,
       Status לא מוכר או תשובה לא תקינה מפסיקים את הסנכרון לפני כתיבה.
   63. Sync Service דורש `templates.write`, חיבור Meta פעיל ו־Token
       שנקרא רק דרך Credential Vault.
   64. לכל Snapshot נגזר SHA-256 דטרמיניסטי. סטטוס כפול אינו נכתב
       שוב, וסטטוס ישן אינו דורס סטטוס חדש יותר.
   65. תבנית שאינה מנוהלת מקומית נספרת אך אינה מיובאת, משום שחוזה
       הרשימה אינו מספק את כל ה־Definition ואת זמן שינוי הספק.
   66. Server Action וכפתור React מפעילים את הסנכרון ומחזירים רק DTO
       בטוח ללא Tenant, מזהי Meta או Credential.
   67. Campaign Foundation מגדיר Template Snapshot, ‏Audience Snapshot
       ו־Recipient Snapshot קבועים לפני Queue או שליחה.
   68. Consent Gate מאפשר נמען רק עם E.164, ‏`subscribed`, ‏`granted`
       ומפתח Personalization תקין.
   69. Campaign, ‏Audience ו־Delivery Keys נגזרים ב־SHA-256 ללא
       Randomness. Retry משתמש באותו Delivery Key.
   70. מיגרציה שתים־עשרה מוסיפה `campaigns` ו־`campaign_recipients`
       ללא Seed ועם Tenant Foreign Keys מורכבים.
   71. Scheduled Campaign דורש Timestamp קנוני ב־UTC ושומר גם את
       Timezone המקור. המרת זמן מקומי תחובר ב־Service.
   72. Campaign Repository שומר Campaign וכל Recipient Snapshot ב־D1
       Batch אטומי בן שתי פקודות, ללא פקודה נפרדת לכל נמען.
   73. כתיבת Campaign בודקת שוב בתוך SQL שה־Template עדיין מאושר,
       שייך ל־Tenant ותואם לגרסה ולזהות Meta שהוקפאו.
   74. Campaign Service דורש `campaigns.write`, מקבל Timezone מפרופיל
       העסק ודורש Personalization מלא לכל משתני הגוף וה־Dynamic URL.
   75. Retry משתמש באותם מפתחות דטרמיניסטיים, וקריאת הרשימה דורשת
       `campaigns.read` ונשארת תחומה ל־Tenant.
   76. Audience Source תומך בכל אנשי הקשר, רשימה אחת או תגית אחת, ללא
       קבלת `tenantId` מהדפדפן.
   77. Audience Repository מחזיר רק Contacts עם `subscribed + granted`
       ומבודד גם את קשרי הרשימה והתגית לפי Tenant.
   78. Personalization Mapping מקבל רק שם פרטי, שם משפחה, דוא"ל, חברה
       או מספר טלפון. ערך חסר אינו מוחלף בערך מומצא.
   79. Campaign Service אינו מקבל מהקלט מספרי טלפון או סטטוסי Consent;
       הוא מפיק אותם מ־D1.
   80. כתיבת Campaign בודקת שוב Contact Version, טלפון ו־Consent בתוך
       ה־Batch האטומי כדי לחסום שינוי מקביל.
   81. Activation דורש `campaigns.write`, גרסה צפויה ו־Template שעדיין
       מאושר ותואם ל־Snapshot.
   82. Cron של פעם בדקה משלים Campaigns שהתייצבו, מקדם Scheduled
       Campaigns ותובע עד 50 נמענים ל־Queue.
   83. תור `connect-campaign-deliveries` נפרד מתור ה־Webhook ומקבל רק
       גרסה ו־Delivery Key דטרמיניסטי, ללא PII.
   84. כשל בפרסום Queue משחרר את ה־Batch מ־`queued` חזרה ל־`pending`.
   85. לפני Claim, ה־Campaign נטען ללא שינוי מצב; כשל אחסון מקבל Retry.
       לאחר מכן פקודת D1 אטומית בודקת Campaign, ‏Template ו־Consent
       ועוברת ל־`sending` או ל־`skipped`.
   86. הודעת Queue כפולה אינה יכולה לתבוע שוב Delivery שכבר עובד.
   87. תוצאה מפורשת נשמרת כ־`accepted` או `failed`; תוצאה לא ידועה
       נשארת `sending` ללא Retry אוטומטי כדי למנוע שליחה כפולה.
   88. Campaign נסגר כ־`completed` רק כשאין Recipient פתוח.
   89. Processor השליחה הנוכחי נכשל סגור לפני Claim ואינו מדמה Meta.
   90. Build, ‏TypeScript, ‏ESLint ו־434 בדיקות עוברים.
   91. Campaign Read Model קורא Campaigns, תבניות מאושרות, רשימות
       ותגיות רק מתוך Tenant Session ומ־D1.
   92. Campaign DTO אינו חושף Tenant, מזהי Meta, ‏Audience Hash,
       תוכן Template, מספרי טלפון, Personalization או Delivery Keys.
   93. Save Action מקבל רק הגדרת Campaign ומפיק את הנמענים וה־Consent
       בצד השרת.
   94. Activation Action מקבל Campaign Key וגרסה צפויה בלבד וממפה
       שגיאות לסטטוסים ציבוריים מוגבלים.
   95. React מציג טופס D1 ורשימת Campaigns אמיתית כשהמערכת מוגדרת;
       Rehearsal מקומי נשאר רק כאשר Clerk או D1 חסרים.
   96. Activation חסום גם ב־UI וגם בשרת עד חיבור Adapter שליחה אמיתי.
   97. Build, ‏TypeScript, ‏ESLint ו־443 בדיקות עוברים.
   98. שלב 10 התחיל עם Domain קבוע עבור Conversation ו־Message,
       כולל כיוון, סוג תוכן ו־Lifecycle מוגבל.
   99. Conversation Key ו־Inbound Message Key נגזרים ב־SHA-256
       מ־Tenant, ‏Contact ומזהה הודעת הספק ללא Randomness.
   100. מיגרציה שלוש־עשרה מוסיפה Conversations ו־Messages ללא Seed
        או Payload גולמי, עם Foreign Keys מורכבים לבידוד Tenant.
   101. טקסט נכנס נשמר רק לאחר Validation ובגבול גודל קבוע. סוג תוכן
        אחר נשמר ללא גוף עד החלטת Retention ו־R2.
   102. Build, ‏TypeScript, ‏ESLint ו־454 בדיקות עוברים.
   103. Conversation Repository מאתר או יוצר Contact נכנס בלי לשנות
        Profile, ‏Consent או Mailing Status.
   104. Conversation, ‏Unread Count ו־Message נכתבים ב־D1 Batch אחד.
        Retry אינו מגדיל שוב את מונה ההודעות שלא נקראו.
   105. Parser ההודעות דורש Phone Number ID תואם, Sender, ‏Message ID
        ו־Timestamp תקינים ואינו שומר Payload או Metadata של Media.
   106. Delivery Status נכתב לפי זמן הספק; אירוע כפול או ישן הוא No-Op.
   107. Business Processor מבצע Preflight מלא ומנתב Template, ‏Inbound
        ו־Delivery לפני כתיבה.
   108. Build, ‏TypeScript, ‏ESLint ו־471 בדיקות עוברים.
   109. Conversation Service קורא רשימת Inbox ושרשור רק מתוך Tenant
        Session ודורש הרשאות `conversations.read` או
        `conversations.reply` לפי הפעולה.
   110. רשימת השיחות מוגבלת ל־50 ושרשור מוגבל ל־100 ההודעות האחרונות.
        ה־Repository בודק מחדש שכל שורה שהוחזרה תואמת ל־Tenant.
   111. Mark Read משתמש ב־Expected Version; שינוי מקביל מוחזר כ־Conflict
        ולא נדרס.
   112. Read Model ו־Server Actions אינם חושפים Tenant, ‏Contact ID,
        מזהי Meta, ‏Assignee חיצוני או מזהי אירועי Webhook.
   113. Build, ‏TypeScript, ‏ESLint ו־489 בדיקות עוברים.
   114. Route ה־Inbox טוען Read Model אמיתי בצד השרת ומחבר אותו לרכיב
        React ייעודי.
   115. המסך מציג רשימת שיחות, שרשור, פרטי Contact, מצבי Lifecycle
        ומונה Unread מתוך D1 בלבד.
   116. בחירת שיחה ו־Mark Read משתמשים ב־Server Actions. Viewer נשאר
        במצב קריאה בלבד, ו־State מתעדכן רק מתוצאת השרת.
   117. מצבי Configuration, ‏Authentication, ‏Onboarding, ‏Tenant,
        Permission, ‏Server Error ו־Empty מוצגים ללא נתוני דמה.
   118. Placeholder של חיפוש ו־Tabs הוסר. שליחה ידנית ו־Media נשארים
        Fail-Closed עד חיבור התשתית המתאימה.
   119. Build, ‏TypeScript, ‏ESLint, ‏SSR של Route ה־Inbox ו־495 בדיקות
        עוברים.
   120. חיפוש שם או טלפון, Conversation Status ומסנן שיוך פועלים
        בצד השרת בלבד, ב־Tenant Scope ובמגבלה של 50 תוצאות.
   121. נציג יכול לשייך שיחה לעצמו או להסיר את השיוך שלו עם Expected
        Version. שיחה של נציג אחר נשארת נעולה.
   122. DTO השיוך מחזיר רק `unassigned`, ‏`current-user` או
        `other-user` ואינו חושף External User ID.
   123. ה־Inbox מבצע Polling מאומת כל 15 שניות כשהטאב גלוי וללא
        בקשות חופפות. אין WebSocket או הבטחת Push בזמן אמת.
   124. שליחה ידנית נשארת Fail-Closed.
   125. Build, ‏TypeScript, ‏ESLint, ‏SSR וכל 504 הבדיקות עוברים.
   126. שלב 11 התחיל עם Domain ל־Trigger, ‏Keyword, ‏Text, ‏Buttons,
        ‏Condition, ‏Handoff ו־End.
   127. Validation דורש Trigger יחיד, Graph מחובר, יעדים קיימים וללא
        Cycles. סוגי AI/API/Media נשארים חסומים.
   128. Flow, ‏Block, ‏Option ו־Version Keys נגזרים ב־SHA-256 ללא
        Randomness.
   129. Handoff עוצר את הבוט ומבקש `waiting_for_agent`, אך אינו בוחר
        נציג ואינו משנה Assignment.
   130. End מסיים את ה־Flow בלבד ואינו סוגר Conversation אוטומטית.
   131. Build, ‏TypeScript, ‏ESLint וכל 516 הבדיקות עוברים.
   132. מיגרציה ארבע־עשרה מוסיפה `bot_flows` ו־
        `bot_flow_versions` ללא Seed, עם Foreign Key מורכב לפי Tenant.
   133. גרסאות Flow נשמרות כ־Snapshots בלתי משתנים בסטטוס Draft,
        ‏Published או Archived, ורק Published אחד מותר בכל Flow.
   134. שמירת Draft דורשת Expected Version ומספר גרסה עוקב; רשומת
        ה־Flow וה־Snapshot נכתבות ב־D1 Batch אטומי.
   135. פרסום מעדכן מצביע Active, מארכב Published קודם ומפרסם את
        ה־Draft המבוקש באותה אצווה.
   136. Flow Key ו־Version Key נגזרים מחדש לפני כתיבה. כל קריאה
        מ־D1 עוברת Validation מלא מחדש ובידוד Tenant.
   137. Definition קנוני מוגבל ל־1MB. אין Payload של ספק ואין
        נתוני דוגמה.
   138. Retry זהה של פרסום מוחזר כ־Unchanged וכתיבה מקבילה אינה
        דורסת גרסה קיימת.
   139. Build, ‏TypeScript, ‏ESLint וכל 524 הבדיקות עוברים.
   140. Bot Flow Service גוזר Tenant רק מ־Tenant Session ודורש
        `bot.read` לקריאה או `bot.write` לשמירה ולפרסום.
   141. Save Draft מקבל Definition ו־Expected Version בלבד. Flow Key,
        מספר הגרסה ו־Version Key נגזרים בצד השרת.
   142. Retry זהה עם Expected Version המקורי מוחזר כ־Unchanged;
        תוכן שונה או מצב ישן יותר מוחזרים כ־Conflict.
   143. Publish טוען את Snapshot היעד וגוזר מחדש את זהותו לפני שינוי
        מצב אטומי.
   144. לפני יצירת DTO, זהות כל Flow וגרסה נגזרת מחדש והגרסה האחרונה
        חייבת להימצא בהיסטוריה. Tenant ID ו־External User ID מושמטים.
   145. Server Actions קיימות לטעינת פרטים, שמירת Draft ופרסום,
        ומחזירות רק סטטוסים ציבוריים מוגבלים.
   146. Read Model מחזיר עד 100 Flows ואת 100 הגרסאות האחרונות של
        ה־Flow הנבחר, ללא Fallback או נתוני דוגמה.
   147. Viewer הוא Read-Only; Agent ללא הרשאת Bot נחסם לפני גישה
        ל־Repository.
   148. Build, ‏TypeScript, ‏ESLint וכל 541 הבדיקות עוברים.
   149. Runtime דטרמיניסטי מריץ Trigger, ‏Keyword, ‏Condition, ‏Text,
        ‏Buttons, ‏Handoff ו־End על Definition מאומת.
   150. Exact ו־Contains פועלים על טקסט שעבר Trim ו־Lowercase;
        Condition יכול לבדוק גם Conversation Status.
   151. Text ו־Buttons מוחזרים כ־Reply Plan בלבד. Button ללא Label
        תואם מחזיר `awaiting-input`.
   152. Runtime דורש Flow פעיל יחיד. אפס Flows הוא No-Op ושניים
        ומעלה מוחזרים כ־Ambiguous ללא בחירה שרירותית.
   153. שיחה משויכת, אנושית או סגורה נעצרת לפני טעינת Flow. רק
        `new` ו־`bot_active` ללא Assignee מורשים.
   154. זהות ה־Flow וה־Published Version הפעילה נגזרת מחדש לפני
        ביצוע ה־Graph.
   155. Handoff דורש Tenant, ‏Conversation Key, ‏Expected Version,
        ‏Assignee ריק ומצב Eligible באותו UPDATE.
   156. Handoff משנה רק ל־`waiting_for_agent`; הוא אינו מקצה נציג
        ואינו עוקף Assignment Lock.
   157. מסך הבוט טוען Flows וגרסאות מ־D1 ומאפשר שמירת Draft ופרסום
        דרך Server Actions ו־Expected Version.
   158. Composer השרת מרכיב מסלול MVP של Trigger, ‏Keyword, ‏Text,
        ‏End ו־Handoff וגוזר את כל המפתחות ללא Tenant מהדפדפן.
   159. מיגרציה חמש־עשרה מוסיפה Outbox בשם
        `bot_reply_deliveries`, עם זהות תשובה דטרמיניסטית ו־Claim אטומי.
   160. Inbound Webhook מפעיל Runtime לאחר אחסון ההודעה. Retry חוזר
        לאותו Outbox ואינו יוצר משלוח נוסף.
   161. תוצאה חיצונית לא ידועה מסומנת Ambiguous ואינה נשלחת שוב.
        ספק Meta עדיין אינו מחובר ולכן הרשומה נשארת Pending וה־Queue
        מבקש Retry באופן Fail-Closed.
   162. שלב 11 הושלם בקוד המקומי. Build, ‏TypeScript, ‏ESLint וכל
        573 הבדיקות עוברים.

## מה לא קיים עדיין

1. מפתחות Clerk אמיתיים והפעלת הזרימה מול משתמש אמיתי.
2. משאבי D1/R2 בענן, החלת המיגרציות או נתוני Production.
3. ייבוא Excel; מסלול ה־MVP הקבוע תומך כרגע ב־CSV.
4. WebSocket/Push בזמן אמת, משאבי Queue אמיתיים, החלטת
   Tech Provider/BSP וחיבור End-to-End מול Meta App אמיתי. ה־Inbox
   המקומי כולל חיפוש, סינון, שיוך עצמי ו־Polling מאומת.
5. ספק סליקה.
6. ספק AI ומאגר וקטורי.
7. העלאת קבצים ל־R2.
8. חיבור Adapter שליחת Campaign אמיתי ל־Meta.
9. Adapter אמיתי לשליחת תשובות Bot ל־Meta ובדיקת End-to-End מול
   WABA. מסך D1, ‏Runtime, ‏Inbound וחוזה Outbound Idempotent הושלמו
   מקומית; ה־Adapter נשאר Fail-Closed.

לא נוצרו נתוני דוגמה. מסכים ללא מקור נתונים מוצגים במצב ריק.

## הרצה מקומית

```bash
npm install
npm run dev
```

## בדיקות

```bash
npm test
npm run lint
npm run typecheck
```

## Schema ומיגרציות

```bash
npm run db:generate
```

## הפעלת Clerk

1. יש להעתיק את שמות המשתנים מתוך `.env.example` לקובץ `.env.local`.
2. את הערכים האמיתיים יש לקבל מ־Clerk Dashboard.
3. אין לשמור את `CLERK_SECRET_KEY` ב־Git או בקוד.
4. ללא שני המפתחות מסכי Auth מציגים מצב הגדרה ולא יוצרים משתמש חלופי.
5. לאחר הגדרת Clerk יש להחיל את עשרים המיגרציות על D1 לפני בדיקת שמירה
   קבועה; הקוד אינו יוצר משאב ענן או מחיל מיגרציה אוטומטית.

## הגדרת System Admin

1. יש להגדיר `CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS` בצד השרת בלבד.
2. הערך הוא מערך JSON לא־ריק שהערכים בו הם Clerk External User IDs
   אמיתיים ומדויקים.
3. הרשימה מוגבלת ל־50 זהויות, ללא כפילויות, רווחים חיצוניים או שורות
   חדשות.
4. אין להוסיף למשתנה קידומת `NEXT_PUBLIC_` ואין לשמור ערך אמיתי ב־Git.
5. תצורה חסרה או פגומה חוסמת את פעולות Admin. Tenant Owner אינו
   משמש כתחליף ל־System Admin.

## הגדרת Meta בצד השרת

1. שמות ה־Secrets נמצאים ב־`.env.example`.
2. יש להגדיר `META_APP_SECRET` ו־`META_WEBHOOK_VERIFY_TOKEN` בסביבת השרת
   בלבד.
3. אין להוסיף להם קידומת `NEXT_PUBLIC_`.
4. יש להגדיר `META_GRAPH_API_VERSION` לערך מפורש בתבנית
   `v<major>.<minor>` לפי גרסת ה־Meta App המאושרת. הקוד אינו מנחש גרסה.
5. Embedded Signup דורש גם `META_APP_ID` ו־
   `META_EMBEDDED_SIGNUP_CONFIGURATION_ID`. שני הערכים נקראים בשרת ורק
   התצורה הציבורית המצומצמת מועברת ל־React.
6. הנתיב `/webhooks/meta` מחובר ל־Cloudflare Queue. ה־Producer מאשר
   בקשה רק אחרי כתיבה מוצלחת ל־Queue; ה־Consumer משתמש ב־D1 Receipt,
   Retry ו־Dead Letter Queue. ‏Template Status, ‏Inbox ו־Delivery Status
   מעובדים; Account Update עדיין נכשל סגור.
7. יש להגדיר `META_CREDENTIAL_ENCRYPTION_KEY_V1` כמפתח AES באורך
   32 bytes המקודד ב־Base64. המפתח נשאר Secret שרתי ואינו נשמר ב־D1.
8. Adapter ההרשמה מופעל רק לאחר Code Exchange, אימות WABA ומספר
   ושמירת Credential מוצפן; אין בקוד Token או מזהה נכס חלופי.
9. Code Exchange, Asset Verifier, Credential Vault ו־WABA Subscriber
   מחוברים ב־Runtime דרך Server Action מאומת.
10. ה־Runtime טרם הורץ מול Access Token ונכסי Meta אמיתיים.
11. Meta SDK Loader, ‏Launcher, ‏Parser ו־Listener פעילים רק כאשר
    תצורת ה־Client והשרת מלאה. תוצאה תקינה נשלחת מיד ל־Server Action.
12. תצורת הפיתוח המקומית מגדירה Producer בשם `META_WEBHOOK_QUEUE`,
    Consumer עם Batch של עד 10 הודעות, עשרה ניסיונות ו־Dead Letter
    Queue בשם `connect-meta-webhooks-dlq`. יצירת המשאבים בענן לא
    מתבצעת אוטומטית.
13. תצורת Campaign מגדירה `CAMPAIGN_DELIVERY_QUEUE`, ‏Consumer עם
    Batch של עד 10 הודעות, עשרה ניסיונות ו־Dead Letter Queue בשם
    `connect-campaign-deliveries-dlq`. Cron מתוזמן פעם בדקה; יצירת
    המשאבים בענן ושליחת Meta אמיתית אינן מתבצעות אוטומטית.

## Rate Limiting

1. השרת מגדיר שלוש Policies נפרדות: `meta-webhook`,
   `tenant-mutation` ו־`system-admin-mutation`.
2. Meta Webhook מוגבל לפי WABA רק לאחר חתימה תקפה ולפני D1 ו־Queue.
3. פעולות Tenant שמשנות מידע מוגבלות לפי Clerk External User ID
   שנגזר בשרת. המזהה הגולמי אינו נשלח ל־Binding.
4. פעולות קריאה, Pagination ורענון אינן צורכות Mutation quota.
5. יש לחבר `META_WEBHOOK_RATE_LIMITER` ו־
   `TENANT_MUTATION_RATE_LIMITER` ו־
   `SYSTEM_ADMIN_MUTATION_RATE_LIMITER` כ־Cloudflare Rate Limiting
   Bindings בצד השרת.
6. ערכי Limit ו־Period אינם מוגדרים בקוד עד לאישור מדיניות.
7. Binding חסר או כושל נכשל סגור. אין Fallback בזיכרון Worker.
8. שינויי מנוי ב־Admin משתמשים ב־`system-admin-mutation`; קריאת
   Directory אינה צורכת מכסה.
