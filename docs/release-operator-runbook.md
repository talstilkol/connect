# Release Operator Runbook

## 1. מטרת המסמך

1.1 זהו סדר העבודה של מפעיל Release עבור Connect.

1.2 ה־Rehearsal המקומי מוכיח שהקוד, ה־Artifacts המקומיים ושער
ה־Fail-closed עובדים עבור Commit יחיד.

1.3 הוא מסומן `local-only`, אינו מחליף Staging ואינו מאשר Production.
Production נשאר חסום עד שכל הראיות החיצוניות ב־
`docs/release-checklist.md` קיימות, חתומות, תקפות ותואמות לאותו Release.

## 2. תנאי התחלה

2.1 מפעיל ה־Release עובד מתוך Repository Authority שאושר.

2.2 ה־Commit המבוקש נמצא ב־Remote, עבר Review וכל תשעת Checks של
Pull Request עברו עבור אותו SHA.

2.3 ה־Worktree נקי. אין להסתיר שינוי מקומי באמצעות Stash כדי ליצור
Manifest כאילו הוא חלק מה־Release.

2.4 גרסת Node תואמת ל־`.node-version`, והתקנת החבילות בוצעה באמצעות
`npm ci` מתוך `package-lock.json` שב־Commit.

2.5 בעלי Release, ‏Operations, ‏Security ו־On-call מונו. כל בעלים
שלא מונה נשאר `unknown/unavailable` וחוסם Production.

2.6 לקבלת Snapshot בטוח לקריאה על ידי אוטומציה מריצים:

```bash
npm run --silent verify:production-readiness:json
```

2.6.1 הפלט הוא JSON בשורה אחת עם `schemaVersion`, סטטוס, מונים
ורשימת `id/status/code` בלבד. הוא אינו כולל ערכי Environment,
Credentials, ‏Tenant IDs או פרטי ספק.

2.6.2 הפקודה מחזירה Exit code שאינו אפס כל עוד שער כלשהו חסום או
דורש החלטה. אין לפרש יצירת JSON כהוכחת מוכנות; רק `status=ready`
ויציאה מוצלחת מאשרים שכל 33 הבדיקות עברו.

## 3. Rehearsal מקומי

3.1 מריצים על Worktree נקי:

```bash
npm run release:rehearse:local
```

3.2 הפקודה מריצה לפי הסדר:

3.2.1 Local Release Gate מלא.

3.2.2 יצירת `.artifacts/release-manifest.json`.

3.2.3 יצירת `.artifacts/CHANGELOG.md` מהיסטוריית Git האמיתית.

3.2.4 אימות מחדש של שני ה־Artifacts מול ה־Commit.

3.2.5 Production Release Gate בסביבה שממנה הוסרו במכוון סמכויות
ה־Evidence. תוצאה תקינה של ה־Probe היא חסימה מדויקת בקוד
`DEPENDENCY_AUDIT_ATTESTATION_ARGUMENTS_INVALID` לאחר שכל השערים
המקומיים עברו.

3.3 הצלחה יוצרת `.artifacts/local-release-rehearsal.json`. הקובץ
מכיל רק זהות Release, ‏Digests ותוצאות מוגבלות; הוא אינו מכיל Secret,
PII, ‏Timestamp או נתוני ספק.

3.4 אם ה־Production Gate עובר ב־Probe, נכשל מסיבה אחרת, או שה־Worktree
מלוכלך — ה־Rehearsal נכשל. אין לשנות את רשימת הכשלים הצפויה כדי
להתאים לתקלה חדשה; מתקנים תחילה את שורש התקלה.

## 4. סדר יצירת והורדת Artifacts

4.1 יוצרים Manifest ו־Change Log מה־Commit הנקי לפני פריסה.

4.2 מורידים את Build Artifact של אותו Commit ומחשבים לו SHA-256.
ה־Digest נכנס ל־Deployment Provenance ולא נכתב ידנית.

4.3 מורידים את `dependency-audit-evidence-<commit>` ואת קובץ
ה־Attestation שלו מאותה ריצת CI. ב־Repository פרטי שאינו תומך
Attestation, שלב זה נשאר חסום; אין ליצור Bundle מקומי חלופי.

4.4 לאחר פריסת Staging מבודדת מריצים את Workflow
`Team invitation browser E2E`, ואז מורידים את
`team-invitation-browser-evidence-<commit>` ואת ה־Attestation מאותה
ריצה.

4.5 מפיקים Evidence של GitHub ושל ספקי ה־Hosting המאושרים מקריאות
Read-only, לאחר שה־Deployment הפעיל כבר מצביע ל־Release הנבדק.
מחולל Cloudflare הקיים הוא ראיית המימוש הישן בלבד; הוא אינו מאשר
פריסת Vercel/Railway עד שיוחלף במחוללים תואמי ADR-0001.

4.6 סדר האימות המחייב הוא:

4.6.1 Release Manifest מול Commit, ‏Tree, ‏Lockfile ו־Migrations.

4.6.2 Dependency Audit file safety, תוכן ו־Attestation.

4.6.3 Browser Evidence file safety, תוכן ו־Attestation.

4.6.4 Environment Isolation, ‏Deployment Provenance, ‏Source Control,
CI Execution, ‏Backup/Restore ו־Secret Inventory.

4.6.5 רק לאחר שכל אימות עבר, מעתיקים את תוכן ה־Evidence המאומת
ל־Secret Store של סביבת היעד ומפעילים `npm run verify:release-gate`.

4.7 אין להדפיס Evidence JSON למסוף, להעביר Token בצ'אט או לשתף
Platform token. גישה ניתנת ב־Membership אישי וב־Least privilege.

## 5. סדר הפריסה

5.1 פריסה ראשונה היא ל־Staging מבודד בלבד, עם Vercel Web ושירותי
Railway API/Worker נפרדים לפי ADR-0001. אין לבצע Hybrid זמני עם
D1 או Cloudflare Queues.

5.2 מחילים Migrations בסדר עולה ומאמתים Journal, ‏Integrity ו־Foreign
Keys. מיגרציה שנכשלה עוצרת את ה־Release.

5.3 פורסים את Artifact המקושר ל־Release ID ומוודאים שה־Deployment
הפעיל מצביע ל־Commit ול־Digest המדויקים.

5.4 מריצים Browser E2E, בדיקות Queue/DLQ, ‏Rate-limit ו־Kill switch
על זהויות ונמענים מורשים בלבד.

5.5 מפיקים את כל הראיות הקצרות ומריצים את שער Production. חסימה אחת
מפסיקה את התהליך; אין Override ידני.

5.6 רק לאחר PASS מלא ואישור הבעלים מבצעים Rollout מדורג לפי התקרות
שאושרו. ערך Meta חי שהוא `unknown/unavailable` אינו מוחלף במספר
משוער.

## 6. Rollback מול Forward Fix

```text
תקלה זוהתה
  |
  +-- לא הוחלה Migration ולא בוצעה כתיבת Production
  |     -> Rollback ל-Artifact הקודם + Smoke מלא
  |
  +-- הוחלה Migration
        |
        +-- Runtime קודם הוכח כתואם ל-Schema החדש
        |     -> Rollback מבוקר + Smoke מלא
        |
        +-- אין הוכחת תאימות
              -> עצירת Traffic/Queues לפי Runbook + Forward Fix
```

6.1 Rollback מותר רק ל־Artifact ש־Release ID, ‏Commit ו־Digest שלו
מאומתים ושעדיין תואם ל־Schema הפעיל.

6.2 לאחר Migration אין להריץ SQL הפוך אד־הוק ואין למחוק Migration
שכבר הופעלה. אם תאימות לא הוכחה, ברירת המחדל היא Forward Fix חדש.

6.3 Restore של נתונים אינו Rollback תוכנה. הוא דורש Backup Evidence
v2 תקף, Restore המקושר ל־`backupId` ול־Digests המדויקים וסביבת שחזור
מבודדת לפני כל פעולה ב־Production.

6.4 כאשר תוצאת ספק אינה ודאית, אין לשלוח שוב אוטומטית. עוצרים את
ה־Consumer או ה־Rollout, מבצעים Reconciliation ורק אז מחליטים על
Replay מאושר.

## 7. Smoke checklist לאחר פריסה

7.1 ה־Origin הוא HTTPS קנוני ותואם ל־`APP_PUBLIC_ORIGIN`.

7.2 `/login` נטען ללא שגיאת 5xx וללא Mixed Content.

7.3 גישה לא מורשית ל־`/workspace` נשארת חסומה ואינה חושפת Tenant,
PII או פרטי Storage.

7.4 משתמש Staging מורשה נכנס ל־Workspace הנכון בלבד; Tenant switch
אינו מאפשר מעבר ל־Tenant שאין לו Membership פעיל.

7.5 Webhook verification, קליטת Event ו־Queue processing נבדקים
דרך תרחיש מאושר, ללא Payload או Credentials בלוגים.

7.6 הודעת בדיקה נשלחת רק לנמען Opt-in מורשה. נבדקים Provider message
ID, ‏Webhook settlement, ‏Pair limit ו־Retry ללא שליחה כפולה.

7.7 Queue backlog, ‏DLQ, ‏SLO alerts, ‏Quality/Capability alerts
ו־Kill switch נצפים בפועל.

7.8 Read-only בדיקות Backup/Restore, ‏Retention ו־Legal Hold מחזירות
את ה־Evidence הצפוי ואינן מפעילות מחיקה.

7.9 Smoke שנכשל עוצר Rollout. המפעיל שומר רק קודי שגיאה מוגבלים,
Release ID ו־Digests; אין לשמור Message body, מספר טלפון, Token או
Cookie בראיית השחרור.

## 8. סיום והעברה

8.1 מתעדים Release ID, ‏Commit SHA, ‏Artifact Digest, תוצאות השערים
והחלטת Rollback/Forward Fix במערכת העבודה המאושרת.

8.2 מוחקים עותקי Evidence ו־Auth מקומיים לפי Runbook הקיים רק לאחר
אימות ההעברה. מחיקה זו אינה Secure Erase.

8.3 Production מאושר רק כאשר כל סעיפי `docs/release-checklist.md`
עברו. ה־Rehearsal המקומי לבדו נשאר ראיית פיתוח ולא ראיית Production.
