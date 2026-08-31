# תצפית סריקת Secrets למאגר Public — גרסה 1

## 1. זהות, מטרה ומצב מחייב

### 1.1 מטרת המסמך

1.1.1 מסמך זה מתעד סריקה מקומית, קריאה בלבד, של היסטוריית Git ושל תמונת מערכת הקבצים הנוכחית.

1.1.2 המטרה היא לזהות מועמדים לבדיקה פרטית לפני כל Public Push, ולא להכריז שהמאגר נקי.

1.1.3 המסמך אינו כולל ערכי Secret, מקטעי התאמה, שורות קוד חשודות, מזהי ספק או פרטי אדם.

### 1.2 מצב מחייב

1.2.1 Visibility היעד והמצב המחייב של המאגר נשארים `PUBLIC`.

1.2.2 מצב הפרסום הוא `PUBLIC-PUSH-BLOCKED`.

1.2.3 `Gate29=BLOCKED` ו־development freeze=`ACTIVE`.

1.2.4 לא בוצעו Commit, Push, שינוי הגדרת GitHub, מחיקת קובץ, רוטציה או בדיקת Credential מול ספק.

1.2.5 `confirmedSecretCount=0` פירושו שלא הוכח Secret חי בסריקה זו; הוא אינו הוכחה לניקיון.

1.2.6 `clearedCandidateCount=0` פירושו שאף מועמד לא נסגר עדיין באמצעות Owner, מקור יצירה ובדיקת תוקף פרטית.

## 2. שיטת הסריקה

### 2.1 כלי ותצורה

2.1.1 כלי הסריקה היה `Gitleaks 8.30.1` עם ה־default ruleset.

2.1.2 כל הפלט המפורט נכתב ל־private temporary reports מחוץ למאגר.

2.1.3 ההשחרות הופעלו ברמת `redact=100`.

2.1.4 קובצי הפלט הפרטיים אינם מועמדים להוספה למאגר Public.

### 2.2 סריקת היסטוריה

2.2.1 הסריקה הופעלה במצב Git עם `log-opts=--all` כדי לכלול את כל ה־refs המקומיים הנגישים לכלי.

2.2.2 Gitleaks דיווח שסקר `298` Commits וכ־`17.93 MB` של תוכן היסטורי.

2.2.3 בדיקה בלתי־תלויה באמצעות `git rev-list --all --count` החזירה גם היא `298`.

2.2.4 בזמן התצפית `git show-ref` מנה `10` refs מקומיים.

2.2.5 ההתאמה `298=298` מוכיחה כיסוי של Denominator ה־Commits המקומי הנגיש ל־`--all` בזמן הסריקה.

2.2.6 היא אינה מוכיחה שה־refs המקומיים מעודכנים מול GitHub, משום שלא בוצע Fetch.

2.2.7 היא גם אינה מוכיחה כיסוי של refs מרוחקים שאינם קיימים מקומית, GitHub objects שאינם reachable, Releases, Packages, Actions artifacts, Deployments, Issues, Pull Requests, Wikis או ספקים חיצוניים.

### 2.3 סריקת תמונת מערכת הקבצים

2.3.1 הסריקה השנייה הופעלה במצב Directory על עץ המוצר הנוכחי.

2.3.2 היא כללה גם תוצרי Build מקומיים ignored, ולכן אינה זהה ל־Public allowlist עתידי.

2.3.3 התוצאה מערבבת קבצים tracked, untracked ו־ignored; אין להשתמש בסכום שלה כ־Git publication denominator.

2.3.4 בדיקה נפרדת הוכיחה ש־`.next/` ו־`dist/` אינם tracked בזמן התצפית.

### 2.4 זהות דוחות פרטיים

2.4.1 דוח היסטוריה מפורש לכל ה־refs: raw SHA-256=`4c56642de40a0bf2719f6bc4eef1fa098e60977f4272fecdd3ac2e967dbcfbdf`; זהות פיזית=`176 lines/7220 bytes`.

2.4.2 דוח Directory: raw SHA-256=`96471007b5ad826d706820c54e0e232b8a090f0d4da1fd8e85a94a0cc01f4e67`; זהות פיזית=`4368 lines/144126 bytes`.

2.4.3 השורשים משמשים לזיהוי פנימי בלבד; הדוחות עצמם נשארים פרטיים ומחוץ למאגר.

## 3. תוצאות סריקת ההיסטוריה

### 3.1 מונים

3.1.1 Gitleaks החזיר `8` Finding rows.

3.1.2 כל `8` הרשומות סווגו בידי הכלי כ־`generic-api-key`.

3.1.3 הרשומות נפרסו על `6` קובצי Test ייחודיים ועל `6` Commits ייחודיים.

3.1.4 לא הודפס ולא נשמר במסמך זה ערך התאמה כלשהו.

### 3.2 פירוש נכון

3.2.1 `generic-api-key` הוא Detector רחב בעל פוטנציאל ל־false positives, במיוחד בקובצי Test.

3.2.2 הימצאות מועמד בקובץ Test אינה הופכת אותו אוטומטית לנתון מלאכותי ומותר לפרסום.

3.2.3 בהתאם לאיסור להשתמש בנתוני Demo או Sample ללא אישור, כל מועמד דורש הוכחת מקור אמיתית ולא הנחה.

3.2.4 אף אחת מ־`8` הרשומות לא קיבלה סטטוס Cleared.

3.2.5 אף אחת מ־`8` הרשומות לא הוכחה כ־live Secret.

3.2.6 ההחלטה המחייבת היא `8 HISTORY-CANDIDATE-ROWS-OPEN`.

## 4. תוצאות סריקת תמונת מערכת הקבצים

### 4.1 מונים

4.1.1 Gitleaks החזיר `218` Finding rows על `49` קבצים ייחודיים.

4.1.2 `198` רשומות מסוג `generic-api-key` נפרסו על `46` קבצים ייחודיים.

4.1.3 `20` רשומות מסוג `private-key` נפרסו על `5` קבצים ייחודיים.

4.1.4 חלוקת `49` הקבצים הייחודיים לפי אזור היא: `.next=12`,‏ `dist=4`,‏ `docs=19`,‏ `tests=14`,‏ `other=0`.

4.1.5 אין לחבר את `8` רשומות ההיסטוריה ואת `218` רשומות ה־Directory למספר Unique אחד, משום שקיימת אפשרות לחפיפה.

### 4.2 מועמדי Private Key בתוצרי Build

4.2.1 כל `20` רשומות ה־`private-key` הופיעו בחמישה קובצי cache בינריים תחת `.next/`.

4.2.2 `.next/` מוחרג ב־`.gitignore` ואפס קבצים מתוכו tracked בזמן התצפית.

4.2.3 חיפוש בינרי נפרד מצא substring של `BEGIN PRIVATE KEY` בשישה קובצי cache.

4.2.4 אותו חיפוש מצא אפס substrings תואמים של `END PRIVATE KEY`.

4.2.5 Parser בלתי־תלוי מצא אפס PEM blocks שלמים ואפס Private Keys ניתנים לפענוח בקובצי ה־cache.

4.2.6 ההפרש בין חמשת קובצי ה־Detector לששת קובצי ה־substring אינו סתירה: מדובר בשני predicates שונים.

4.2.7 התוצאה תואמת fragments או מקור Scanner שנצרב ב־Build cache, אך אינה מוכיחה זאת.

4.2.8 לכן הסטטוס הוא `UNCONFIRMED-IGNORED-BUILD-CANDIDATES`, ולא `SECRET` ולא `CLEARED`.

### 4.3 מועמדים ב־Docs וב־Tests

4.3.1 `33` קבצים ייחודיים נמצאו יחד באזורי `docs/` ו־`tests/`.

4.3.2 מסמך תכנון או Test עשויים להכיל שמות שדות, fingerprints או fixtures שה־Detector מפרש כ־Secret.

4.3.3 מקור כזה עשוי גם להכיל Credential אמיתי שהועתק בטעות; שם התיקייה אינו מנגנון בטיחות.

4.3.4 כל מועמד דורש triage פרטי בלי להעתיק את ערכו למסמך, Issue או Pull Request ציבוריים.

4.3.5 אף אחד מהמועמדים לא קיבל סטטוס Cleared.

## 5. גבולות ראיה וסיכונים

### 5.1 False positives

5.1.1 Detector יכול לסמן טקסט שאינו Credential.

5.1.2 לכן Finding אינו הוכחת דליפה ואינו מצדיק רוטציה אוטומטית ללא זיהוי בטוח של ספק ו־Owner.

### 5.2 False negatives

5.2.1 סריקה נקייה אינה מוכיחה שאין Secret שאינו תואם ל־ruleset.

5.2.2 הסריקה אינה מזהה לבדה מידע אישי, נתוני לקוח, זכויות יוצרים, תנאי רישוי או סוד עסקי.

5.2.3 הסריקה אינה מאמתת אם ערך מועמד חי, בוטל, מוגבל Scope או שייך לספק מסוים.

5.2.4 הסריקה אינה מחליפה GitHub Secret Scanning, Push Protection, review אנושי או inventory של ספקים.

### 5.3 פערי Coverage

5.3.1 remote freshness=`unknown/unavailable`.

5.3.2 GitHub-only surfaces coverage=`0`.

5.3.3 independent second-scanner coverage=`0` משום שלא נמצא Scanner בלתי־תלוי מותקן.

5.3.4 custom-pattern coverage=`0`.

5.3.5 provider-validity checks=`0`.

5.3.6 candidate-owner attestations=`0`.

5.3.7 rotation or revocation receipts=`0`.

## 6. תוכנית סגירה מחייבת

### 6.1 יצירת Candidate Ledger פרטי

6.1.1 יש ליצור Ledger שאינו נכנס למאגר Public.

6.1.2 לכל רשומה יוגדר deterministic candidate identifier מתוך report root,‏ rule,‏ file locator,‏ Commit locator ו־fingerprint מושחר.

6.1.3 אין לשמור את ערך ההתאמה הגולמי ב־Ledger הציבורי או ב־Log.

6.1.4 יש לבצע deduplication בין היסטוריה, worktree ו־generated artifacts.

6.1.5 יש לקשור לכל מועמד Owner, מקור יצירה, expected format, סטטוס ובדיקת סגירה.

### 6.2 Triage פרטי

6.2.1 קודם ייבדקו שמונת מועמדי ההיסטוריה, משום שהם עשויים כבר להימצא במאגר Public.

6.2.2 אחריהם ייבדקו קבצים tracked או מועמדים ל־allowlist.

6.2.3 תוצרי Build ignored ייבדקו כדי להוכיח מקור, אך לא יקבלו עדיפות על תוכן reachable שכבר פורסם.

6.2.4 כל מועמד יסווג רק כאחת מהאפשרויות: `CONFIRMED-LIVE`,‏ `CONFIRMED-REVOKED`,‏ `FALSE-POSITIVE-PROVEN`,‏ `NON-SECRET-SENSITIVE`,‏ `UNKNOWN`.

6.2.5 `UNKNOWN` נשאר Blocking.

### 6.3 תגובה לממצא מאומת

6.3.1 אם מועמד מוכח כ־Credential, יש לעצור פרסום ו־Deployment רלוונטיים.

6.3.2 יש לזהות Owner וספק במרחב פרטי.

6.3.3 יש לבטל או לסובב את ה־Credential לפני טיפול בהיסטוריה.

6.3.4 יש לאסוף receipt של revocation/rotation בלי לחשוף את הערך.

6.3.5 מחיקת ה־Secret מה־Branch הנוכחי לבדה אינה מספיקה כאשר הוא נמצא בהיסטוריה.

6.3.6 rewriting של Public history הוא שינוי הרסני ותיאום חיצוני; הוא דורש תוכנית, גיבוי, exact object set ואישור נפרד.

6.3.7 אין לבצע rewrite או force push במסגרת מסמך זה.

### 6.4 סריקה משלימה

6.4.1 יש להריץ Scanner בלתי־תלוי שני על אותו exact ref set ועל Public allowlist קפוא.

6.4.2 יש להוסיף custom detectors רק עבור formats אמיתיים של הספקים שנבחרו.

6.4.3 יש לסרוק Git objects reachable ו־unreachable בהתאם למדיניות השמירה המאושרת.

6.4.4 יש לסרוק GitHub Issues, Pull Requests, Releases, Packages, Actions artifacts ו־deployment metadata באמצעות הרשאות Read-only מתאימות.

6.4.5 יש להפעיל GitHub Secret Scanning ו־Push Protection כחלק מ־Public hardening, בכפוף ל־Ruleset ולהוכחת enforcement.

6.4.6 יש לבצע negative canary בטוח שאינו Credential אמיתי כדי להוכיח שה־gate חוסם pattern מאושר; תוכן ה־canary חייב להיות מוגדר במפורש ואינו נוצר אוטומטית.

### 6.5 תנאי Acceptance

6.5.1 exact remote ref snapshot קפוא ומאומת.

6.5.2 exact Public allowlist קפוא ומאומת.

6.5.3 `openHistoryCandidateCount=0`.

6.5.4 `openAllowlistCandidateCount=0`.

6.5.5 כל Confirmed Secret כולל revocation/rotation receipt ו־Owner approval.

6.5.6 שני Scanners בלתי־תלויים עברו על אותו snapshot.

6.5.7 custom patterns עבור כל ספק מאושר עברו.

6.5.8 GitHub Secret Scanning ו־Push Protection הוכחו באמצעות live readback ו־negative canary בטוח.

6.5.9 Public Push Permit חתום קושר את roots של snapshot, allowlist, reports, triage ledger ו־approvals.

6.5.10 כל שינוי באחד מה־roots מבטל את ה־Permit.

## 7. מסקנה

### 7.1 פסק דין

7.1.1 היסטוריית Git המקומית נסרקה לכל `298` ה־Commits הנגישים דרך `--all`.

7.1.2 נמצאו `8` מועמדי היסטוריה פתוחים ו־`218` Finding rows בתמונת Directory; אין לפרש אותם כמספר Secrets.

7.1.3 אפס Secrets חיים הוכחו ואפס מועמדים נסגרו.

7.1.4 תוצרי Build ignored אינם tracked, אך אינם פותרים את מועמדי ההיסטוריה, Docs ו־Tests.

7.1.5 תוצאת הבקרה היא `REJECT-PUBLIC-PUSH` עד השלמת כל תנאי סעיף 6.5.

7.1.6 המאגר נשאר `PUBLIC`; האכיפה היא חסימת כתיבה מסוכנת ולא שינוי Visibility.

7.1.7 Gate29 נשאר חסום וה־development freeze נשאר פעיל.
