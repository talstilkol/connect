# Release Checklist

סדר הביצוע, נקודות העצירה ותרשים Rollback/Forward Fix נמצאים ב־
`docs/release-operator-runbook.md`.

## 1. Source authority

1.1 Repository Authority נבחר ומתועד.

1.2 ה־Repository המאושר מדווח `private=true` ו־`visibility=private`.

1.3 ה־Commit נמצא ב־Remote המאושר.

1.4 Branch Protection ו־Review חובה פעילים.

1.5 ה־Worktree נקי ואין קובץ שאינו שייך ל־Commit.

## 2. Quality gates

2.1 Local Release Gate עבר.

2.2 `npm run evidence:dependency-audit` עבר מול npm Registry הרשמי,
ו־`DEPENDENCY_AUDIT_EVIDENCE_JSON` מכיל Evidence שטרם פג תוקפו עבור
אותו Release, ‏Commit, ‏Git Tree ו־Lockfile.

2.2.1 כל מוני `info`, ‏`low`, ‏`moderate`, ‏`high` ו־`critical` הם
אפס. Evidence שמדווח על פגיעות נשמר לצורכי אבחון אך חוסם Production.

2.2.2 ה־Artifact כולל את קובץ ה־Evidence ואת Attestation Bundle
מאותו Workflow ומאותו Commit, ו־`gh attestation verify` עבר מול
ה־Repository המאושר ו־GitHub-hosted runner.

2.2.3 `DEPENDENCY_AUDIT_EVIDENCE_JSON` זהה מבחינה מבנית לקובץ
החתום. אין לקבל JSON מקומי אחר גם אם ה־Digest הפנימי שלו תקין.

2.3 Production Readiness מחזיר Ready עבור כל הבדיקות.

2.4 Secret Scanning ו־Push Protection של ספק ה־Repository עברו.

2.5 Secret Inventory Evidence תקף, וכל מועדי ה־Rotation עתידיים.

2.6 Source Control Governance Evidence תקף, מקושר ל־Commit הנפרס
ומוכיח שכל תשעת ה־PR Status Checks ותשעת בקרי ה־Repository פעילים,
כולל Visibility מסוג Private.

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

4.3.1 Credentials, מספרים, הודעות ונתוני לקוחות מפרויקט ה־WordPress
או מחשבון האב אינם נכנסים ל־Development או Preview. ‏Pilot אמיתי
מתבצע רק בסביבת Staging/Pilot מבודדת ובאישור בעל הנכס.

4.4 `APP_PUBLIC_ORIGIN` הוא HTTPS קנוני של סביבת היעד.

4.5 ספק ה־Hosting וה־Topology תואמים ל־ADR המאושר. אין פריסה
היברידית לא מתועדת בין Cloudflare, ‏Vercel ו־Railway.

4.6 כל גישת Deployment היא דרך Membership אישי ו־Least privilege;
לא נעשה שימוש ב־Token או חשבון משותף.

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

5.9.1 ששת Auth states נלכדו ב־Contexts מבודדים מול Staging בלבד,
עברו את ה־Validator והוזרקו מ־Secret Store. קובץ הלכידה המקומי אינו
נשמר ב־Git או כ־Artifact רגיל.

5.9.1.1 לפני ההעברה ל־Secret Store קובץ הלכידה עבר את File Safety
Gate עם בעלות מקומית, Link יחיד, הרשאת `0600` ותפוגה מספקת.

5.9.1.2 קובץ ה־Case Inventory עבר את אותו File Safety Gate ונמצא
תואם ל־Origin, ‏Release, ‏Commit, ‏Artifact ו־Policy של הריצה.

5.9.1.3 השער המשולב עבר עבור שני הקבצים באותו Clock ואישר שישה
Profiles, שבעה Scenarios, ‏Origin יחיד ו־Release נוכחי יחיד.

5.9.1.4 ה־Browser Evidence וה־Attestation Bundle הורדו מאותו Artifact
קצר־חיים. `gh attestation verify` אישר Digest, ‏Repository, ‏Signer
Workflow, ‏Release Commit ו־GitHub-hosted runner, והקובץ החתום נמצא
זהה byte-for-byte ל־`TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON` של
ה־Runtime.

5.9.1.5 לאחר אימות הערכים ב־Secret Store והרצה מוצלחת ממנו, קובץ
Browser Evidence קצר־חיים ותואם Release עבר גם את השער הסמנטי.

5.9.1.6 רק לאחר מכן שני הקבצים המקומיים הוסרו באמצעות Quarantine
ואימות חוזר. אין לסמן סעיף זה כהוכחת Secure Erase או כהוכחה שה־Secret
Store עצמו שמר את הערכים; החתימה מוכיחה את מקור ה־Evidence.

5.9.2 כל 22 ה־Assertions מה־Scenario Registry עברו, לרבות הוכחות
Database עבור Mutation, Rejection ו־Idempotency.

5.9.3 Database Proof נקרא מ־D1 של Staging בלבד דרך Reader
Read-only, ושום Row או Identifier לא נכתב ל־Receipt.

5.10 Browser Evidence הופק מה־Receipt באמצעות המחולל המקומי, טרם
פג תוקף ומתאים בדיוק לערכי Runtime של ה־Release.

5.11 `TEAM_INVITATION_BROWSER_ATTESTATION_REPOSITORY` מכיל את זהות
ה־Repository האמיתית, ו־Production Release Gate הפעיל את אימות
ה־Attestation לפני Production Readiness. Evidence סמנטי ללא חתימה
אינו מספיק למעבר השער.

## 6. Operations

6.1 Monitoring, ‏Alerting ו־SLO פעילים.

6.2 בעלי Security, ‏Operations ו־On-call מונו.

6.3 Rollback או Forward Fix נבחרו לפי סוג התקלה.

6.4 Smoke Test חיצוני עבר לאחר הפריסה.

6.5 קיים Evidence מתוארך וגרסתי המקשר את
`docs/whatsapp-rate-limits.md` ואת ה־Digest שלו ל־Release, ‏Commit,
‏Artifact, ‏Meta Graph API version ומצב ה־WABA, המספר וה־Templates.
טל ביצע Factual sign-off; ערך חי לא זמין מסומן `unknown/unavailable`
וחוסם Production כאשר הוא דרוש לבטיחות.

6.6 Alerts פעילים עבור `account_update`, שינויי Quality ו־Capability,
‏Template pacing/pause, שגיאות Throttling ו־Queue backlog.

6.7 דוד אישר את התאמת המימוש; אבטחה ומוצר אישרו את תקרות ה־Rollout,
‏Headroom ו־Kill switch, ואלה נבדקו בפועל בלי שליחה לנמען שאינו מורשה.

6.8 רק לאחר שכל הסעיפים הוכחו ניתן לאשר Production.
