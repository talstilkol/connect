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

## 6. סביבות

6.1 Development, ‏Preview, ‏Staging ו־Production חייבות להשתמש
במשאבי D1, ‏R2, ‏Queues, ‏Rate Limits ו־Secrets נפרדים.

6.2 מזהי המשאבים הממשיים והבעלים עדיין unknown/unavailable.

6.3 אין להעתיק נתוני Production ל־Preview או Development.

6.4 הגדרת המשאבים תושלם דרך ספק Hosting רק לאחר בחירת Repository
Authority, אישור הסביבות והרשאה מפורשת לפריסה.
