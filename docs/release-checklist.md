# Release Checklist

## 1. Source authority

1.1 Repository Authority נבחר ומתועד.

1.2 ה־Commit נמצא ב־Remote המאושר.

1.3 Branch Protection ו־Review חובה פעילים.

1.4 ה־Worktree נקי ואין קובץ שאינו שייך ל־Commit.

## 2. Quality gates

2.1 Local Release Gate עבר.

2.2 Dependency Audit חיצוני עבר מול מקור Advisories מאושר.

2.3 Production Readiness מחזיר Ready עבור כל הבדיקות.

2.4 Secret Scanning ו־Push Protection של ספק ה־Repository עברו.

2.5 Secret Inventory Evidence תקף, וכל מועדי ה־Rotation עתידיים.

2.6 Source Control Governance Evidence תקף, מקושר ל־Commit הנפרס
ומוכיח שכל תשעת ה־PR Status Checks ושמונת בקרי ה־Repository פעילים.

2.7 CI Execution Evidence תקף ומוכיח שכל תשעת ה־PR Checks הסתיימו
בהצלחה עבור אותו Commit ואותו Release ID.

## 3. Data

3.1 כל המיגרציות עברו Validation לפי הסדר.

3.2 סדר ההפעלה ו־Forward Fix תועדו.

3.3 קיים Backup Evidence v2 תקף.

3.4 קיים Restore Rehearsal מקושר ומאומת בסביבה מבודדת.

3.5 Retention Policy ו־Legal Hold מאושרים.

## 4. Environment isolation

4.1 Development, ‏Preview, ‏Staging ו־Production משתמשות במשאבים
נפרדים.

4.2 אין D1, ‏R2, ‏Queue, ‏DLQ, ‏Rate Limit או Secret המשותף לשתי
סביבות.

4.3 Preview ו־Development אינן משתמשות בנתוני Production.

4.4 `APP_PUBLIC_ORIGIN` הוא HTTPS קנוני של סביבת היעד.

## 5. Release evidence

5.1 `npm run release:manifest` הופעל על Worktree נקי.

5.2 Commit SHA ב־Manifest זהה ל־Commit הנפרס.

5.3 Git Tree, ‏Lockfile וכל Digests המיגרציות תואמים.

5.4 `npm run release:changelog` יצר Change Log מהיסטוריית Git
האמיתית.

5.5 `npm run release:verify-artifacts` אישר שה־Manifest וה־Change
Log זהים ל־Commit.

5.6 Artifact הפריסה מקושר ל־Release ID.

5.7 Deployment Provenance Evidence תקף ומוכיח התאמה בין Release ID,
‏Commit, ‏Git Tree, ‏Lockfile, ‏Migration Set ו־Artifact הפריסה.

5.8 שבעת תרחישי Invitation Browser E2E עברו מול Staging המבודד
ועבור אותו Release, ‏Commit, ‏Artifact ו־Invitation Policy.

5.9 Receipt הדפדפן אינו מכיל PII, ‏Token, ‏Cookie, ‏Invitation Key,
Trace או Screenshot, והוא הופק על ידי מערכת ה־CI המאושרת.

5.9.1 כל 22 ה־Assertions מה־Scenario Registry עברו, לרבות הוכחות
Database עבור Mutation, Rejection ו־Idempotency.

5.9.2 Database Proof נקרא מ־D1 של Staging בלבד דרך Reader
Read-only, ושום Row או Identifier לא נכתב ל־Receipt.

5.10 Browser Evidence הופק מה־Receipt באמצעות המחולל המקומי, טרם
פג תוקף ומתאים בדיוק לערכי Runtime של ה־Release.

## 6. Operations

6.1 Monitoring, ‏Alerting ו־SLO פעילים.

6.2 בעלי Security, ‏Operations ו־On-call מונו.

6.3 Rollback או Forward Fix נבחרו לפי סוג התקלה.

6.4 Smoke Test חיצוני עבר לאחר הפריסה.

6.5 רק לאחר שכל הסעיפים הוכחו ניתן לאשר Production.
