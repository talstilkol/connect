# Team Invitation Browser Runner Contract

## 1. מצב ובעלות

1.1 Browser Executor ו־CI Provider עדיין `unknown/unavailable`.
ה־Runner Adapter הספק־נייטרלי קיים בקוד המקומי.

1.2 החוזה נייטרלי לספק. הוא מגדיר מה חייב להיבדק, אך אינו בוחר
GitHub Actions, ספק CI אחר או שירות Browser חיצוני.

1.3 אין להריץ את החוזה מול Development, ‏Preview או Production.
היעד היחיד הוא Staging מבודד במצב `staging-e2e`.

## 2. יכולות Runner נדרשות

2.1 פתיחת HTTPS Origin קנוני.

2.2 Session נפרד לכל זהות בדיקה.

2.3 Snapshot נגיש לפני כל שימוש ב־Element Reference ורענון Snapshot
לאחר Navigation או שינוי משמעותי ב־DOM.

2.4 פעולות Keyboard מפורשות עבור Tab, ‏Enter ו־Focus checks.

2.5 קריאת תוצאת UI, ‏ARIA live region ו־מצב Disabled ללא שימוש
ב־DOM Injection או ב־Dynamic Evaluation.

2.6 גישת Read-only ל־D1 של Staging עבור Assertions של Membership
ו־Acceptance Audit. ה־Runner אינו כותב ישירות ל־D1.

2.7 יצירת SHA-256 Digests מתוך תוצאות Assertion מסוננות. Raw
Screenshot, ‏Trace, ‏Cookie, ‏Token או נתוני Identity אינם נכנסים
ל־Receipt.

## 3. תרחישים ו־Assertions

3.1 `unauthenticated-user-rejected`:

3.1.1 Browser: `sign-in-required`.

3.1.2 Database: `membership-count-unchanged`.

3.1.3 Browser: `private-fields-absent`.

3.2 `unverified-primary-email-rejected`:

3.2.1 Browser: `identity-verification-required`.

3.2.2 Database: `membership-count-unchanged`.

3.2.3 Browser: `private-fields-absent`.

3.3 `verified-matching-email-accepts`:

3.3.1 Browser: `acceptance-confirmed`.

3.3.2 Database: `membership-created-once`.

3.3.3 Database: `acceptance-audit-created-once`.

3.4 `mismatched-email-remains-private`:

3.4.1 Browser: `generic-unavailable-result`.

3.4.2 Database: `membership-count-unchanged`.

3.4.3 Browser: `invitation-details-private`.

3.5 `expired-invitation-rejected`:

3.5.1 Browser: `generic-unavailable-result`.

3.5.2 Database: `membership-count-unchanged`.

3.5.3 Browser: `invitation-details-private`.

3.6 `identical-retry-idempotent`:

3.6.1 Browser: `already-accepted-result`.

3.6.2 Database: `membership-count-unchanged`.

3.6.3 Database: `acceptance-audit-count-unchanged`.

3.7 `keyboard-and-focus-accessible`:

3.7.1 Browser: `initial-focus-order-valid`.

3.7.2 Browser: `submit-keyboard-operable`.

3.7.3 Browser: `status-announced`.

3.7.4 Browser: `focus-visible`.

## 4. מבנה תוצאת Assertion

4.1 קלט Browser Assertion כולל בדיוק `name`, ‏`source`
ו־`observation`. ה־Observation הוא Shape מצומצם וייעודי ל־Assertion;
הוא אינו מכיל DOM, טקסט חופשי או נתוני זהות.

4.2 קלט Database Assertion כולל בדיוק `name`, ‏`source`, ‏`before`
ו־`after`. שני ה־Snapshots עוברים את אותו Parser מוגבל של Counts.

4.3 ה־Adapter אינו מקבל `status` מה־Executor. הוא מחשב הצלחה מתוך
ה־Observation או מתוך מעבר ה־Database. כשל יחיד מונע Receipt.

4.4 פלט מאומת כולל בדיוק `name`, ‏`source`, ‏`status: passed`
ו־`outputDigest`. ה־Digest הוא SHA-256 של פלט קנוני ומסונן. כל 22
ה־Digests חייבים להיות ייחודיים באותה ריצה.

4.5 Scenario `outputDigest` מחושב באמצעות
`deriveTeamInvitationBrowserScenarioOutputDigest`. הוא קשור לסדר,
לשם, למקור, לסטטוס ול־Digest של כל Assertion.

## 5. זרימת הרצה

5.1 ה־CI מאמת Release, ‏Commit, ‏Artifact, ‏Origin ו־Policy לפני
פתיחת Browser ראשון.

5.2 כל תרחיש מקבל Session וזהויות Staging המתאימות לו בלבד.

5.3 לפני Mutation נשמרים Counts נדרשים דרך Reader בעל הרשאת
Read-only. אחרי הפעולה נקרא אותו Scope בדיוק.

5.4 Browser מבצע Snapshot, מאתר Element Reference, מבצע פעולה
ומבצע Snapshot נוסף לפני בדיקת התוצאה.

5.5 Runner סוגר Session ומוחק State מקומי לאחר כל תרחיש.

5.6 לאחר שבע הצלחות ה־Adapter מרכיב Receipt בסדר ה־Registry. זמן
`verifiedAt` נגזר מזמן ההשלמה המאוחר ביותר ואינו מתקבל מה־Caller.

5.7 ה־Receipt עובר מיד דרך `buildTeamInvitationBrowserEvidence`
באותו זמן קנוני. כשל יחיד, Timeout או תוצאה לא חד־משמעית מונעים
יצירת Receipt.

## 6. גבולות אבטחה

6.1 Credentials מוזרקים רק מ־Secret Store של CI ואינם נכתבים
לקובץ, ללוג, ל־Snapshot או ל־Receipt.

6.2 Invitation Keys נשמרים רק בזיכרון ה־Job וב־URL הנדרש לבדיקה.
הם אינם חלק מ־Digest input שניתן לשחזור ואינם נשמרים כ־Artifact.

6.3 Screenshot או Trace לצורכי Debug נשמרים רק ב־Artifact מוגן
בעל תפוגה קצרה ואינם משמשים Evidence ציבורי.

6.4 Database Assertion מחזיר Counts וסטטוס בלבד. הוא אינו מחזיר
Tenant ID, ‏User ID, אימייל או Row מלא.

6.5 אין Retry אוטומטי לתרחיש Mutation לאחר תוצאה לא ידועה. מצב כזה
דורש Reconciliation ונכשל סגור.

## 7. Database Proof Reader

7.1 ה־Reader מקבל Invitation Key ו־Scope מדויק בלבד.

7.2 `tenant-total` משמש כאשר אין זהות מאומתת, למשל בתרחיש משתמש
לא מחובר. `external-user` משמש כאשר ה־CI מחזיק External User ID
בזיכרון ה־Job.

7.3 כל Snapshot נלקח ב־SELECT יחיד ומחזיר רק:

7.3.1 `invitationCount`.

7.3.2 `membershipCount`.

7.3.3 `activeMembershipCount`.

7.3.4 `acceptanceAuditCount`.

7.4 Invitation ו־Acceptance Counts מוגבלים ל־0 או 1. Membership
Counts מוגבלים ל־10,000, ו־Active אינו יכול להיות גדול מהסך הכולל.

7.5 שכבת Database Assertion משווה Snapshot לפני ואחרי. היא מוכיחה
Unchanged, יצירת Membership יחיד, יצירת Audit יחיד או Retry יציב.

7.6 תוצאת Assertion אינה מחזירה Counts. היא מחזירה Name, ‏Source,
‏Passed ו־Digest הקשור ל־Scenario, ל־Assertion ולשני ה־Snapshots.

7.7 Reader או Assertion אינם Route או Server Action. ה־Adapter
המאומת מחבר את התוצאות ל־Receipt בלבד; חיבור D1 בפועל נשאר באחריות
Executor מבודד לאחר בחירת סביבת ההרצה.

## 8. Runner Adapter

8.1 `buildTeamInvitationBrowserRunnerReceipt` מקבל Metadata של
Deployment, ‏Policy ושבעה Scenario executions בלבד.

8.2 שמות התרחישים וה־Assertions, הסדר והמקור חייבים להתאים בדיוק
ל־Registry. שדה נוסף או `passed` שסופק מבחוץ נדחים.

8.3 Browser Observations הם Enums, ‏Booleans או Zero counts
ייעודיים. Text, ‏HTML, ‏Screenshot, ‏Token ו־Identity אינם מתקבלים.

8.4 Database Assertions נבנים מחדש דרך ה־Builder הקיים. ה־Adapter
אינו סומך על Digest או Status שנוצרו ב־Runner חיצוני.

8.5 ה־Adapter דוחה Fingerprint כפול, Timestamp לא קנוני, טווח
תרחישים מעל 24 שעות ו־Receipt שאינו עומד בחוזה ה־Evidence.

8.6 D1 Proof Port קיים, אך אין Adapter ל־CI, ‏Browser או Credentials.
לכן קיום הקוד אינו מפעיל Staging ואינו משנה את מצב Production.

## 9. Executor Port

9.1 `executeTeamInvitationBrowserRun` מריץ את שבעת התרחישים בסדר
ה־Registry ואינו מקבל רשימת תרחישים מה־Caller.

9.2 שלושה Ports חיצוניים בלבד מותרים:

9.2.1 פתרון Test Case סודי עבור Scenario קנוני.

9.2.2 הרצת Browser Scenario ב־Session מבודד.

9.2.3 קריאת Database Proof דרך D1 Read-only.

9.3 בכל תרחיש בעל Database Assertions הסדר הוא: Resolve, ‏Before
Snapshot, ‏Browser, ‏After Snapshot ואימות מיידי.

9.4 Browser Port מקבל Scenario Name ו־Invitation Key ומחזיר רק
זמן השלמה, Run Fingerprint ו־Observations מסודרים. הוא אינו מחזיר
Status, ‏Digest, טקסט חופשי או Session data.

9.5 לכל תרחיש נדרש Timeout מפורש של עד חמש דקות. Timeout מפעיל
AbortSignal, עוצר את הריצה ואינו גורם ל־Retry אוטומטי.

9.6 Observation או Database transition שאינם מוכיחים את ה־Assertion
נכשלים מיד. התרחיש הבא אינו נפתח.

9.7 ה־Executor אינו מכיל Credentials, אינו בוחר ספק ואינו Route.
Case Resolver, ‏D1 Port ו־Browser Port Core קיימים; מימוש ה־Session
Driver ייבנה רק לאחר בחירת CI ו־Browser Provider אמיתיים.

## 10. Staging Case Inventory

10.1 `TEAM_INVITATION_BROWSER_E2E_CASES_JSON` הוא Secret זמני של
Staging. הוא אינו נשמר ב־Git, ב־Artifact, ב־Evidence או בלוג.

10.2 ה־Inventory כולל בדיוק שבעה Cases בסדר ה־Registry. כל Case
כולל Scenario Name ו־Invitation Key ייחודי.

10.3 ששת התרחישים בעלי Database Assertions כוללים Proof Scope.
התרחיש הלא מחובר משתמש רק ב־`tenant-total`; יתר חמשת התרחישים
משתמשים ב־External User IDs ייחודיים.

10.4 ה־Inventory מקושר ל־Staging Origin, ‏Release, ‏Commit,
Artifact ו־Policy Digest המדויקים.

10.5 זמן החיים המרבי הוא שעתיים. לפני התחלת הריצה נדרש להישאר
חלון תקפות המספיק לכל שבעת ה־Scenario timeouts.

10.6 Resolver חושף פעולה אחת בלבד: פתרון Case לפי Scenario קנוני.
אין API לרשימה, חיפוש, Dump או קריאת Inventory מלא.

10.7 D1 Proof Port מעביר את ה־Case ל־Reader הקיים ובודק Abort לפני
הקריאה ואחריה. Proof שהסתיים לאחר Abort אינו נכנס ל־Assertion.

10.8 מיד לפני העברת ה־Inventory ל־Secret Store מריצים:

```sh
npm run verify:team-invitation-browser-case-file
```

10.9 השער דורש קובץ פרטי רגיל ומאמת מחדש Origin, ‏Release, ‏Commit,
Artifact, ‏Policy וכל שבעת ה־Cases. פלט השער אינו כולל Invitation Key
או External User ID.

## 11. Browser Session Driver

11.1 Browser Port ממפה כל Scenario ל־Session Profile קנוני. שמות
Profiles אינם Credentials וה־Provider Adapter אחראי לפתרונם.

11.2 ה־Driver מקבל URL מלא רק בזיכרון ה־Job. אסור לו להדפיס,
לשמור או לצרף אותו ל־Screenshot, ‏Trace או Artifact.

11.3 כל ריצה מחזירה Transcript מסונן בלבד:

11.3.1 זמן השלמה ו־Run Fingerprint.

11.3.2 אישור שה־Session היה מבודד ונסגר.

11.3.3 Origin שנצפה ו־Outcome סמנטי מתוך `data-invitation-status`.

11.3.4 Counts של שדות פרטיים ופרטי הזמנה שנחשפו.

11.3.5 בתרחיש נגישות בלבד: Focus order, ‏Keyboard submit,
Live-region observation ו־Focus indicator.

11.4 Transcript בעל טקסט חופשי, Origin זר, Session פתוח, זמן פגום
או שדה נוסף נפסל לפני יצירת Observations.

11.5 `sign-in-required` נפרד מ־`identity-verification-required`.
Clerk Session חסר ואימייל ראשי לא מאומת אינם עוד אותו Outcome.

11.6 תרחיש הנגישות משתמש ב־Invitation שכבר התקבל. Keyboard Submit
חייב להחזיר `already-accepted`, כדי לא ליצור Mutation לא מוכח.

11.7 Focus order הקנוני הוא Skip link, ‏Brand link, ‏Accept button
ו־Home link. סדר אחר הופך את Assertion ל־Failed.

11.8 Browser Port Core ו־Playwright Adapter קיימים מקומית. עדיין
אין CI Provider, ‏Credentials או Sessions אמיתיים מאומתים.

## 12. לכידת Auth State מאובטחת

12.1 מגדירים `TEAM_INVITATION_BROWSER_E2E_ORIGIN` ל־Origin הקנוני
של סביבת Staging המבודדת. הכלי דורש HTTPS מרוחק ודוחה Localhost;
האחריות לוודא שזה אינו Preview או Production נשארת אצל המפעיל.

12.2 מתקינים מקומית את Chromium התואם לגרסת Playwright, אם טרם
הותקן, ולאחר מכן מריצים ב־Terminal אינטראקטיבי:

```sh
npx playwright install chromium
npm run capture:team-invitation-browser-auth
```

12.3 הכלי פותח Context נקי ונפרד לכל אחד מששת ה־Profiles. המפעיל
מתחבר ידנית בחלון שנפתח ולוחץ Enter רק לאחר החזרה ל־Origin של
Staging. אין למסור סיסמה, Token או Cookie בשורת הפקודה.

12.4 לאחר כל התחברות הכלי מסנן Cookies ו־Local Storage שאינם שייכים
ל־Staging. State מורחב, Cookie לא מאובטח, תפוגה קצרה, Origin זר או
Profile חסר מפסיקים את התהליך ללא קובץ חלקי.

12.5 הקובץ המלא נכתב אטומית אל
`.artifacts/team-invitation-browser-auth-states.json` בהרשאת `0600`
ואינו נכנס ל־Git. הכלי אינו מדפיס את תוכנו.

12.6 מעבירים את תוכן הקובץ ל־Secret Store המאושר בשם
`TEAM_INVITATION_BROWSER_AUTH_STATES_JSON`, ומוחקים את העותק המקומי
לאחר אימות ההעברה. אין להעלות אותו כ־Artifact רגיל.

12.7 הלכידה מוכיחה Shape, ‏Scope ובידוד מקומי בלבד. ריצת שבעת
תרחישי ה־E2E היא שמוכיחה שכל Profile אכן מייצג את הזהות המיועדת.

12.8 מיד לפני ההעברה ל־Secret Store מריצים:

```sh
npm run verify:team-invitation-browser-auth-file
```

12.9 שער הקובץ דוחה Symlink, ‏Hard link, בעלות זרה, הרשאה שאינה
`0600`, קובץ גדול או משתנה תוך כדי קריאה, UTF-8 פגום ו־State שאינו
תקף לשמונה דקות נוספות לפחות. הוא אינו מדפיס את תוכן הקובץ.

12.10 לאחר ששני הקבצים קיימים ולפני העברתם ל־Secret Store מריצים
את השער המשולב:

```sh
npm run verify:team-invitation-browser-secret-files
```

12.11 השער משתמש ב־Clock יחיד, דורש שישה Profiles ושבעה Scenarios,
ומאמת ששני הקבצים שייכים לאותו Origin וש־Case Inventory שייך ל־Release
הנוכחי. כשל אינו מדפיס תוכן מאחד הקבצים.

12.12 לאחר יצירת ה־Evidence, ה־Workflow מפעיל `actions/attest` בגרסה
מקובעת וחותם את Digest הקובץ באמצעות GitHub OIDC ו־Sigstore. ה־Bundle
נשמר בשם
`.artifacts/team-invitation-browser-evidence-attestation.json` ומועלה
יחד עם ה־Evidence ליום אחד בלבד.

12.13 Artifact Attestations דורש Repository ו־Plan נתמכים ב־GitHub.
אם יכולת זו אינה זמינה, ה־Workflow נכשל סגור ואין למחוק את העותקים
המקומיים או להפעיל Invitation Acceptance.

12.14 לאחר הורדת ה־Artifact, מגדירים `GITHUB_REPOSITORY` לערך
`owner/repository` האמיתי ומריצים:

```sh
npm run verify:team-invitation-browser-evidence-attestation -- --repo "$GITHUB_REPOSITORY"
```

12.15 ה־Verifier דורש חתימת SLSA תקפה, Repository ו־Signer Workflow
מדויקים, Commit SHA של ה־Release ו־GitHub-hosted runner. הוא משתמש
ב־Bundle שהורד ואינו מסתמך על Metadata לא חתום מתוך ה־Evidence.

12.16 רק לאחר שאומת כי שני הערכים נשמרו ב־Secret Store המאושר,
הריצה ממנו הסתיימה בהצלחה ושער ה־Attestation עבר, מריצים גם:

```sh
npm run verify:team-invitation-browser-evidence-file
```

12.17 לאחר ששני השערים עברו מריצים:

```sh
npm run remove:team-invitation-browser-secret-files -- --confirm-secret-store-transfer --repo "$GITHUB_REPOSITORY"
```

12.18 הפקודה מאמתת בעצמה מחדש גם את ה־Attestation וגם את ה־Evidence,
ורק אז מאמתת את שני הקבצים, מעבירה אותם ל־Quarantine פרטי ומאמתת
שוב לפני `unlink`. כשל לפני תחילת המחיקה מחזיר את הקבצים לנתיביהם.

12.19 קובצי ה־Evidence וה־Bundle נפתחים ללא מעקב אחר Symlink. כל אחד
מהם חייב להיות בבעלות המפעיל, בעל Link יחיד וללא הרשאת כתיבה ל־Group
או ל־Others. הם נשארים במקום לצורכי Audit ואינם כוללים את שני
ה־Secrets.

12.20 `unlink` מסיר את קישורי הקבצים המקומיים בלבד. הוא אינו מוכיח
מחיקה פיזית מ־SSD, ‏Filesystem Snapshot, גיבוי או Secret Store.
