# Team Invitation Browser Evidence

## 1. מטרה

1.1 המסמך מגדיר כיצד להפוך תוצאות Browser E2E אמיתיות ל־Evidence
קצר־חיים עבור Invitation Acceptance.

1.2 המחולל אינו מריץ דפדפן, אינו יוצר משתמשים ואינו ממציא תוצאות.
הוא מקבל Receipt שנוצר רק לאחר השלמת שבעת התרחישים בסביבת Staging.

1.3 Evidence עצמי אינו חתימה של ספק CI. הסמכות נשארת אצל מערכת
ה־CI והגורם המורשה להגדיר את Runtime Environment.

## 2. דרישות לפני ההפקה

2.1 ה־Worktree חייב להיות נקי ומחויב ל־Git.

2.2 ה־Release המקומי חייב להיות אותו Commit שנפרס ל־Staging.

2.3 `APP_RELEASE_ID`, ‏`APP_DEPLOYED_COMMIT_SHA` ו־Artifact Digest
של Staging חייבים להילקח מתהליך הפריסה האמיתי.

2.4 Clerk, ‏Invitation Policy, ‏D1 והזהויות הנדרשות לתרחישים חייבים
להיות משאבי Staging נפרדים. אין להשתמש בנתוני Production.

## 3. חוזה ה־Receipt

3.1 ה־Receipt הוא JSON בעל השדות המדויקים הבאים בלבד:

3.1.1 `schemaVersion` שערכו 1.

3.1.2 `verifiedAt` בפורמט ISO קנוני.

3.1.3 `environment` שערכו `staging`.

3.1.4 `origin` מסוג HTTPS מרוחק וקנוני.

3.1.5 `releaseId`, ‏`commitSha` ו־`artifactDigest` של הפריסה שנבדקה.

3.1.6 `policy` הכולל רק `ttlHours` ו־`reRequest`.

3.1.7 `scenarios` הכולל בדיוק את שבעת שמות התרחישים מה־Registry.

3.2 כל Scenario כולל רק:

3.2.1 `name`.

3.2.2 `status` שערכו `passed`.

3.2.3 `completedAt` קנוני.

3.2.4 `runFingerprint` ייחודי מסוג SHA-256.

3.2.5 `outputDigest` מסוג SHA-256 השונה מה־Run Fingerprint.

3.2.6 `assertions` לפי הסדר והמקור המוגדרים ב־Scenario Registry.

3.3 כל Assertion כולל בדיוק:

3.3.1 `name`.

3.3.2 `source` מסוג `browser` או `database` בהתאם ל־Registry.

3.3.3 `status` שערכו `passed`.

3.3.4 `outputDigest` ייחודי מסוג SHA-256.

3.4 Scenario `outputDigest` חייב להיות ה־Digest הקנוני של תוצאות
ה־Assertions המסודרות. שינוי סדר, מקור, סטטוס או פלט פוסל אותו.

3.5 אימייל, User ID, ‏Tenant ID, ‏Invitation Key, Cookie, Token,
Screenshot, Trace או לוג דפדפן אינם מותרים בתוך ה־Receipt.

## 4. הפקה

4.1 מגדירים `TEAM_INVITATION_RECEIPT_PATH` לנתיב המוחלט של ה־Receipt
האמיתי שנמשך ממערכת ה־CI המאושרת.

4.2 מריצים:

```sh
npm run evidence:team-invitation-browser -- --receipt "$TEAM_INVITATION_RECEIPT_PATH"
```

4.3 המחולל מחשב מחדש את Release Manifest מה־Commit הנקי ומשווה את
ה־Release ID ואת Commit SHA ל־Receipt.

4.4 הפלט נשמר ב־`.artifacts/team-invitation-browser-evidence.json`.
הקובץ אינו נכנס ל־Git.

## 5. כללי כשל

5.1 Receipt חסר, גדול, פגום או בעל שדה נוסף נכשל סגור.

5.2 תרחיש חסר, כפול, ישן, עתידי או בעל Fingerprint משותף נכשל סגור.

5.3 Release או Commit שאינם תואמים ל־Worktree הנקי נכשלים סגור.

5.4 Evidence מקבל תוקף מרבי של 24 שעות ממועד `verifiedAt` ואינו
מתחדש אוטומטית.

5.5 אין להגדיר `TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON` לפני
בדיקת ה־Artifact וה־Receipt על ידי בעל ה־Release הממונה.
