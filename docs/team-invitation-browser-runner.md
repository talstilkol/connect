# Team Invitation Browser Runner Contract

## 1. מצב ובעלות

1.1 Browser Runner ו־CI Provider עדיין `unknown/unavailable`.

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

4.1 כל Assertion כולל בדיוק `name`, ‏`source`, ‏`status`
ו־`outputDigest`.

4.2 `source` חייב להתאים ל־Registry: ‏`browser` או `database`.

4.3 `status` חייב להיות `passed`. תוצאה אחרת אינה נכנסת ל־Receipt;
הריצה כולה נכשלת.

4.4 `outputDigest` הוא SHA-256 של פלט Assertion קנוני ומסונן. כל
22 ה־Digests חייבים להיות ייחודיים באותה ריצה.

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

5.6 לאחר שבע הצלחות נבנה Receipt. כשל יחיד, Timeout או תוצאה לא
חד־משמעית מונעים יצירת Receipt.

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

7.7 Reader או Assertion אינם Route או Server Action. חשיפתם ל־CI
תתבצע רק דרך Adapter מאומת שייבנה לאחר בחירת סביבת ההרצה.
