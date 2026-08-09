# Source Control ו־Release

## 1. מצב נוכחי

1.1 ה־Repository שמכיל את האפליקציה הוא תיקיית `web`.

1.2 מעליו קיים Repository נוסף בתיקיית `connect`. המבנה המקונן
מתועד ואסור להסיר אחד מהם לפני בחירת Repository Authority מפורשת.

1.3 ל־Repository של `web` אין Remote מוגדר. לכן Branch Protection,
Review Rules, ‏CODEOWNERS ו־Secret Scanning של ספק Git עדיין אינם
פעילים.

1.4 אין במסמך זה שמות בעלים מומצאים. בעלי Security, ‏Operations,
Release ו־Secrets הם unknown/unavailable עד למינוי מפורש.

## 2. שער CI מקומי

2.1 `npm run verify:release-gate:local` מריץ לפי הסדר:

2.1.1 Source Guardrails.

2.1.2 Secret Hygiene על הקבצים העקובים ועל היסטוריית Git.

2.1.3 Interface Guardrails.

2.1.4 Dependency Lock.

2.1.5 הפעלת כל מיגרציות D1 על SQLite נקי ובדיקת Journal, ‏Integrity
ו־Foreign Keys.

2.1.6 TypeScript.

2.1.7 ESLint.

2.1.8 Build וכל הבדיקות.

2.2 `npm run verify:release-gate` מוסיף Production Readiness ונכשל
סגור כל עוד קיימת החלטה או תלות חיצונית חסרה.

2.3 `npm run verify:secret-hygiene` אינו מדפיס Secret, נתיב התאמה,
Commit פגוע או תוכן קובץ. הוא מחזיר קוד ממצא מוגבל בלבד.

2.4 הבדיקה המקומית אינה תחליף ל־Push Protection ולסריקה של ספק
ה־Repository.

## 3. מיגרציות

3.1 `npm run verify:migrations` דורש:

3.1.1 מספור רציף החל מ־`0000`.

3.1.2 התאמה מלאה ל־Drizzle Journal.

3.1.3 הפעלה מוצלחת לפי הסדר על מסד ריק.

3.1.4 `PRAGMA integrity_check` תקין.

3.1.5 אין הפרת Foreign Key לאחר ההפעלה.

3.2 אין לבצע Rollback הרסני למיגרציה שכבר הופעלה. תיקון Production
ייעשה ב־Forward Fix חדש, אלא אם קיים Runbook שחזור מאושר וראיות
Backup תקפות.

## 4. Release Manifest

4.1 `npm run release:manifest` פועל רק כאשר ה־Worktree נקי.

4.2 הפלט נשמר מקומית ב־`.artifacts/release-manifest.json` ואינו
נכנס ל־Git.

4.3 ה־Manifest כולל:

4.3.1 Commit SHA.

4.3.2 Git Tree SHA.

4.3.3 SHA-256 של `package-lock.json`.

4.3.4 רשימת המיגרציות ו־SHA-256 נפרד לכל קובץ.

4.3.5 Digest מאוחד של קבוצת המיגרציות.

4.3.6 Release ID דטרמיניסטי הנגזר מכל הראיות לעיל.

4.4 אין Timestamp או מזהה אקראי. אותו מצב מקור מייצר אותו Manifest.

4.5 `npm run release:changelog` יוצר Change Log דטרמיניסטי
מה־Commit subjects האמיתיים. Subject שאינו עומד בחוזה Conventional
Commit חוסם את היצירה במקום לייצר תיאור מומצא.

4.6 Checklist השחרור המלא נמצא ב־`docs/release-checklist.md`.

4.7 `npm run release:verify-artifacts` מחשב מחדש את שתי הראיות
מה־Commit, דורש Worktree נקי ונכשל אם Artifact חסר, פגום או ישן.

## 5. Secrets

5.1 שמות התצורה הציבורית:

5.1.1 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

5.1.2 כתובות Clerk הציבוריות.

5.2 שמות Secret המחייבים אחסון שרתי, בעלים ו־Rotation:

5.2.1 `CLERK_SECRET_KEY`.

5.2.2 `META_APP_SECRET`.

5.2.3 `META_WEBHOOK_VERIFY_TOKEN`.

5.2.4 `META_CREDENTIAL_ENCRYPTION_KEY_V1`.

5.3 ערכים ממשיים אינם נשמרים ב־`.env.example`, בקוד, במסמך זה או
ב־Release Manifest.

5.4 `SECRET_INVENTORY_EVIDENCE_JSON` מגדיר Inventory v1 עבור חמשת
ערכי השרת הרגישים הקיימים ובכל ארבע הסביבות.

5.5 כל אחת מ־20 הרשומות כוללת Secret Fingerprint, ‏Owner
Fingerprint, מועד Rotation אחרון ומועד Rotation הבא. Fingerprint
של Secret אינו יכול להופיע ביותר מסביבה אחת.

5.6 ה־Evidence אינו מכיל Secret או זהות בעלים גלויה. Evidence חסר,
פג תוקף, עם Rotation שעבר או עם Digest שונה חוסם Production.

## 6. סביבות

6.1 Development, ‏Preview, ‏Staging ו־Production חייבות להשתמש
במשאבי D1, ‏R2, ‏Queues, ‏Rate Limits ו־Secrets נפרדים.

6.2 מזהי המשאבים הממשיים והבעלים עדיין unknown/unavailable.

6.3 אין להעתיק נתוני Production ל־Preview או Development.

6.4 הגדרת המשאבים תושלם דרך ספק Hosting רק לאחר בחירת Repository
Authority, אישור הסביבות והרשאה מפורשת לפריסה.

6.5 `ENVIRONMENT_ISOLATION_EVIDENCE_JSON` מקבל Evidence v1 קצר־חיים
שמופק מ־Inventory אמיתי של ספק התשתית.

6.6 ה־Evidence מכיל רק 44 Fingerprints מסוג SHA-256: אחת לכל מחלקת
משאב בכל אחת מארבע הסביבות. הוא אינו מכיל Resource ID או Secret.

6.7 Fingerprint משותף, סביבה חסרה, Data Boundary שגוי, Digest שונה,
זמן עתידי או Evidence שפג תוקפו חוסמים Production.

6.8 עצם קיום החוזה אינו הוכחת בידוד. שער Production נשאר חסום עד
להזרקת Evidence שמופק ממשאבים אמיתיים.

## 7. Source Control Governance Evidence

7.1 `SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON` מקבל Evidence v2
קצר־חיים שמופק מ־Repository אמיתי לאחר הגדרת Remote.

7.2 ה־Evidence דורש תשעה Pull Request Status Checks: שמונת שערי
האיכות המקומיים ו־Dependency Audit.

7.3 ה־Evidence מאשר Branch Protection, ‏CODEOWNERS Review, ביטול
אישורים ישנים, פתרון שיחות Review, חסימת Force Push ומחיקת Branch,
‏Secret Scanning ו־Push Protection.

7.4 נדרש Reviewer אחד לפחות. `releaseCommitSha` חייב להתאים בדיוק
ל־`APP_DEPLOYED_COMMIT_SHA`.

7.5 שמות Repository, ‏Branch, ‏Owner או ספק אינם נשמרים בראיה.
במקומם נשמרים Fingerprints נפרדים מסוג SHA-256.

7.6 Evidence חסר, פג תוקף, עם Control כבוי, Status Check חסר,
Digest שונה או Commit שאינו תואם חוסם Production.

7.7 החוזה אינו מפעיל הגנות בעצמו. שער Production נשאר חסום עד
להגדרת Repository Authority והפקת Evidence מהספק שנבחר.

7.8 Production Readiness אינו Required Check של Pull Request.
הוא שער Release נפרד, משום שהוא דורש ראיות Runtime שנוצרות רק
לאחר פריסה. הפרדה זו מונעת מעגל תלות שאינו ניתן להשלמה.

## 8. Deployment Provenance Evidence

8.1 `DEPLOYMENT_PROVENANCE_EVIDENCE_JSON` מקבל Evidence v1
קצר־חיים עבור פריסת Production אמיתית.

8.2 ה־Release ID מחושב מחדש מתוך Commit SHA, ‏Git Tree SHA,
‏`package-lock.json` digest ו־Migration Set digest. חוסר התאמה
ביניהם חוסם Production.

8.3 `APP_DEPLOYED_COMMIT_SHA`, ‏`APP_RELEASE_ID`
ו־`APP_DEPLOYMENT_ARTIFACT_DIGEST` חייבים להתאים בדיוק לראיה.

8.4 הראיה כוללת Artifact Digest ו־Deployment Fingerprint נפרדים.
היא אינה כוללת כתובת פריסה, מזהה ספק או Credentials.

8.5 Evidence חסר, פג תוקף, ארוך מ־24 שעות, שאינו עבור Production,
בעל Digest שונה או שאינו תואם לערכי Runtime חוסם Production.

8.6 קיום החוזה אינו הוכחת פריסה. הראיה תופק רק לאחר בניית Artifact
חד־ערכי ופריסתו בפועל דרך הספק המאושר.

## 9. CI Execution Evidence

9.1 `CI_EXECUTION_EVIDENCE_JSON` מקבל Evidence v1 קצר־חיים עבור
תוצאות CI אמיתיות.

9.2 נדרשת תוצאת `success` עבור כל תשעת ה־Pull Request Checks,
המקושרת לאותו Commit ולאותו Release ID.

9.3 לכל Check נדרשים Completed At קנוני, Run Fingerprint ייחודי
ו־Output Digest. תוצאה חסרה, כפולה, ישנה או שאינה `success` נפסלת.

9.4 כל Check חייב להסתיים לכל היותר 24 שעות לפני הפקת הראיה,
והראיה עצמה תקפה לכל היותר 24 שעות.

9.5 CI Execution Evidence אינו כולל לוגים, שמות Repository,
כתובות Build או Credentials.

## 10. Team Invitation Browser Evidence

10.1 Receipt ה־Browser נוצר רק על ידי ריצת Staging אמיתית וכולל
בדיוק שבעה Scenarios שעברו.

10.2 `npm run evidence:team-invitation-browser` דורש Worktree נקי,
מחשב מחדש את Release Manifest ומשווה את Release ID ו־Commit SHA
ל־Receipt לפני יצירת Evidence.

10.3 Receipt בעל PII, שדה נוסף, Scenario חסר או כפול, Fingerprint
משותף, זמן עתידי או תוצאה ישנה נכשל סגור.

10.4 הפלט נשמר ב־`.artifacts/team-invitation-browser-evidence.json`
ואינו נכנס ל־Git. תוקפו המרבי 24 שעות ואינו מתחדש אוטומטית.

10.5 המחולל מאמת Integrity וקישור ל־Release אך אינו מוכיח בעצמו
מי הפעיל את הדפדפן. מערכת CI מאושרת והרשאות Runtime הן גבול
ה־Authority עד בחירת ספק Attestation חיצוני.

10.6 Scenario Registry מרכז שבעה תרחישים ו־22 Assertions. כל
Scenario Output Digest נגזר מהסדר, מהשם, מהמקור ומה־Output Digest
של Assertions שלו; תוצאה כללית שאינה קשורה לבדיקות נפסלת.

10.7 `TEAM_INVITATION_BROWSER_E2E_CASES_JSON` הוא Secret זמני של
Staging המכיל Invitation Keys ו־External User Scopes. הוא מוזרק
מ־CI Secret Store, תקף עד שעתיים ואסור לשמור אותו כ־Artifact.

10.8 `npm run capture:team-invitation-browser-auth` יוצר מקומית
Bundle קצר־חיים של שישה Auth states לאחר התחברות ידנית. הפלט נכתב
אטומית בהרשאת `0600` תחת `.artifacts`, אינו מודפס ואינו נכנס ל־Git.

10.9 רק Cookies ו־Local Storage של Origin ה־Staging נשמרים. State
של ספק זהות חיצוני מסונן; State מורחב בתוך Scope של Staging נכשל
סגור. לאחר ההעברה ל־Secret Store יש למחוק את העותק המקומי.

10.10 `npm run verify:team-invitation-browser-auth-file` מאמת לפני
ההעברה שה־Bundle אינו Symlink או Hard link, נמצא בבעלות המשתמש,
פרטי בהרשאת `0600`, לא השתנה בזמן הקריאה ועדיין תקף לריצה.

10.11 `npm run verify:team-invitation-browser-case-file` מחיל את
אותו גבול קובץ על Case Inventory ומאמת מחדש את הקישור ל־Deployment
ול־Policy. המחולל שומר JSON קומפקטי כדי שגבול 24,000 התווים יישמר
גם בקובץ שנכתב בפועל.
