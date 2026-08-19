# PostgreSQL Templates & Campaigns Data Migration Rehearsal

תאריך אימות: 2026-08-20

## 1. תוצאה

1.1 ‏Slice 5 עבר חזרה מקומית מלאה מול SQLite ו־PostgreSQL 16 אמיתי:

`PASS (36 D1 migrations, 24 PostgreSQL migrations, 3 tables, 8 rows, replay rejected, tenant isolation verified, provider evidence deferred, 8 parity scenarios)`

1.2 שלוש הטבלאות הן:

1. `message_templates`.
2. `campaigns`.
3. `campaign_recipients`.

1.3 זו ראיה מקומית דטרמיניסטית. היא אינה Export של נתוני לקוח, אינה
משתמשת בחשבון Meta חי ואינה אישור Cutover.

## 2. תיקון סדר התלויות

2.1 התכנון המקורי כלל גם את `campaign_delivery_provider_links`. במהלך
בדיקת ה־Foreign keys נמצא שכל Link תלוי ב־
`whatsapp_rate_limit_reservations`, שמתוכננת להגר ב־Slice 10.

2.2 טעינת Link לפני Reservation הייתה מחייבת עקיפת Foreign key או יצירת
ראיית ספק חסרה. לכן הטבלה הועברה ל־`whatsapp-delivery-policy`, שמכיל כעת
את ה־Reservation, ‏Settlement, ‏Cooldown וה־Provider link באותה יחידת
Rehearsal. ה־Slice הזה תלוי גם ב־`templates-campaigns`.

2.3 אין כאן אובדן נתונים: הטבלה עדיין מופיעה בדיוק פעם אחת ב־Registry.
ההעברה נדחתה לשלב שבו ניתן להוכיח את כל שרשרת הראיות האטומית.

## 3. מנגנון ההעברה

3.1 ‏D1 נקרא ב־Transaction יחיד לאחר אימות Schema מדויק, ‏Integrity ו־
Foreign keys. כל Definition ו־Snapshot עוברים נרמול JSON קנוני.

3.2 ה־Plan תקף עד 15 דקות, קשור ל־HMAC נפרד לכל טבלה ול־Manifest digest.
שינוי Payload, ‏Count, זמן או סדר שורות מבטל את ה־Plan.

3.3 PostgreSQL ננעל ב־Advisory lock וב־`ACCESS EXCLUSIVE`. שלוש טבלאות
היעד חייבות להיות ריקות והטעינה מתבצעת לפי הסדר Template, ‏Campaign,
Recipient באותה Transaction.

3.4 לפני Commit נספרים הנמענים בפועל לכל Campaign ומושווים ל־
`recipient_count`. לאחר מכן שלוש הטבלאות נקראות בחזרה ו־Count/HMAC של כל
אחת מושווים למקור. Replay נכשל ב־`target-not-empty`.

## 4. Frozen snapshots ופרטיות

4.1 `definition_json` חייב להכיל רק את שמונת שדות הגדרת ה־Template
המאושרים. `template_snapshot_json` חייב להכיל רק אותם ואת ששת שדות זהות
ה־Template הקפואים. שדה לא מוכר, לרבות Provider payload, נדחה.

4.2 ה־Campaign snapshot נבדק דרך אותו Validator שמשמש את ה־Runtime.
ה־`templateKey` שבתוך ה־JSON חייב להיות זהה לעמודת `template_key`.

4.3 `personalization_json` חייב להיות Object שמכיל רק מפתחות
`body:<number>` או `url:1` וערכי String תחומים. Array, מפתח לא מוכר או ערך
ריק נדחים לפני יצירת Plan.

4.4 ‏Manifest ו־Evidence ציבוריים מכילים רק שמות טבלאות, Counts ו־HMAC
digests. בדיקות Regression מוודאות שטקסט תבנית, טלפון, Personalization,
שם Template ו־Meta Template ID אינם מופיעים בהם. ה־Plan payload נשאר
Artifact תפעולי מוגן ואינו מיועד ל־Git או Logs.

## 5. Lifecycle ובידוד Tenant

5.1 ה־Snapshot בודק את כל שבעת מצבי ה־Template ואת הקשרים בין Meta ID,
Submission key, ‏Status event, ‏Submitted/Reviewed timestamps ו־Version.

5.2 Recipient נבדק מול תשעת המצבים. `pending` אינו יכול להחזיק Queue או
Acceptance time; ‏`accepted/delivered/read` חייבים להחזיק את שניהם; יתר
המצבים אינם יכולים להחזיק Acceptance time.

5.3 PostgreSQL דחה Campaign של Tenant 1 שניסה להפנות ל־Template של Tenant
2, וכן Recipient של Tenant 1 שניסה להפנות ל־Contact של Tenant 2. ההגנה
היא Foreign key מורכב ואינה תלויה בבדיקה לאחר כתיבה.

5.4 PostgreSQL דחה `personalization_json` מסוג Array באמצעות Constraint
של `jsonb_typeof`. טבלת Provider links נשארה ריקה במכוון עד ל־Slice 10.

## 6. Semantic parity

6.1 שמונת התרחישים רצו על D1 ועל PostgreSQL והשוו Accepted/Rejected:

1. התחלת Submission של Template במצב Draft.
2. קבלת Meta Template ID ומעבר ל־Pending review.
3. אישור Template עם Status event.
4. הפעלת Campaign במצב Draft.
5. קידום Campaigns מתוזמנים ל־Running.
6. Claim של Recipients מ־Pending ל־Queued.
7. שחרור Recipient לאחר כשל פרסום ל־Queue.
8. חסימת Recipient שמפנה ל־Contact של Tenant אחר.

6.2 לאחר התרחישים נקראו שוב כל שלוש הטבלאות. סדר השורות, כל הערכים
וה־SHA-256 digests היו זהים בשני המנועים.

## 7. שחזור ההרצה

7.1 הפקודה היא:

```bash
CONNECT_POSTGRES_TEMPLATES_CAMPAIGNS_DATA_MIGRATION_REHEARSAL_URL="postgresql://<local-user>@127.0.0.1:<local-port>/connect_templates_campaigns_data_migration_rehearsal" \
  npm run verify:postgres-templates-campaigns-data-migration
```

7.2 ה־Verifier מקבל רק PostgreSQL מקומי, מסד בשם הקבוע, Port מפורש וללא
Password, ‏Query או Fragment. בהרצה המתועדת השרת נעצר ותיקייתו הזמנית
נמחקה מיד לאחר האימות.

## 8. מה עדיין לא הוכח

8.1 ‏24 מתוך 51 טבלאות עברו Data migration ו־Semantic parity. נותרו 27
טבלאות בחמישה Slices; הבא הוא `conversations-messages` ובו שתי טבלאות.

8.2 ‏Provider link evidence יוכח רק יחד עם Rate-limit Reservation ו־
Settlement ב־Slice 10. אין לסמן אותו כ־Rehearsed לפני כן.

8.3 עדיין נדרשים Export חי חתום, דוח חריגות, Dry-run על עותק Staging,
Load/Recovery, ‏Backup/Restore ו־Cutover מאושר.
