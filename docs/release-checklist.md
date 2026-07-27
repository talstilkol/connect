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
ומוכיח שכל עשרת ה־Status Checks ושמונת בקרי ה־Repository פעילים.

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

## 6. Operations

6.1 Monitoring, ‏Alerting ו־SLO פעילים.

6.2 בעלי Security, ‏Operations ו־On-call מונו.

6.3 Rollback או Forward Fix נבחרו לפי סוג התקלה.

6.4 Smoke Test חיצוני עבר לאחר הפריסה.

6.5 רק לאחר שכל הסעיפים הוכחו ניתן לאשר Production.
