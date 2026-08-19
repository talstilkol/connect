# PostgreSQL Meta Connection Data Migration Rehearsal

תאריך אימות: 2026-08-20

## 1. תוצאה

1.1 Slice 4 עבר חזרה מקומית מלאה מול SQLite ו־PostgreSQL 16 אמיתי:

`PASS (36 D1 migrations, 24 PostgreSQL migrations, 3 tables, 6 rows, replay rejected, tenant isolation verified, no plaintext columns, 8 parity scenarios)`

1.2 שלוש הטבלאות הן:

1. `meta_connections`.
2. `meta_webhook_receipts`.
3. `meta_credential_envelopes`.

1.3 זו ראיה מקומית דטרמיניסטית. היא אינה משתמשת בחשבון Meta חי, אינה
מפענחת Access token ואינה מהווה אישור Cutover.

## 2. גבול ה־Credential

2.1 מקור הנתונים מכיל רק `key_version`, ‏IV ו־Ciphertext שכבר הוצפן
ב־AES-GCM על ידי ה־Vault הקיים. אין בטבלאות שדה Access token,
Authorization code, ‏Plaintext או Provider payload.

2.2 ל־Data migration אין Encryption key. הוא אינו מפענח, מחזיר או מדפיס
את ה־Ciphertext; הוא בודק רק Version, מבנה Base64, אורך, Tenant, זמנים
ו־Digest.

2.3 ה־Plan payload הוא Artifact סודי־תפעולי משום שהוא נושא Envelopes
מוצפנים. אין לשמור אותו ב־Git, CI logs או Evidence. ה־Manifest וה־Evidence
הציבוריים מכילים רק Table names, Counts ו־HMAC digests.

2.4 בדיקות Regression מאמתות ש־WABA, ‏Phone ID, ‏Object type, ‏IV
ו־Ciphertext אינם מופיעים ב־Manifest או Evidence.

## 3. מנגנון ההעברה

3.1 ‏D1 נקרא ב־Transaction יחיד לאחר Schema, ‏Integrity ו־Foreign-key
checks. כל שורה נבדקת מול החוזה הסופי לפני יצירת Plan קצר־תוקף.

3.2 PostgreSQL ננעל ב־Advisory lock וב־`ACCESS EXCLUSIVE`; שלוש טבלאות
היעד חייבות להיות ריקות. הטעינה היא Parent-first וב־Transaction אחת.

3.3 לפני Commit נבדק שחיבור `connected` מחזיק Envelope מוצפן ושאין
Envelope ללא Connection. לאחר מכן מסונכרן Identity של Receipts ונקראים
Counts/HMACs בחזרה.

3.4 Replay נכשל ב־`target-not-empty`. שגיאות Driver ממופות ל־Error מוגבל
שאינו חושף ערכי שורות.

## 4. הקשחת Legacy

4.1 ‏D1 הישן מאפשר צורות ש־PostgreSQL אינו מקבל. ה־Snapshot חוסם:

1. מזהי Portfolio, ‏WABA או Phone לא חתוכים, ארוכים או עם Control chars.
2. Object type מעל 255 תווים או Error code מעל 100 תווים.
3. זמנים שאינם במילישניות או סדר זמנים לא חוקי.
4. Event key שאינו SHA-256 Hex קטן.
5. Lifecycle לא עקבי של Connection או Receipt.
6. ‏IV שאינו Base64 מדויק של 16 תווים.
7. Ciphertext עם Padding שאינו בסוף או שאינו בטווח 24–12,000 תווים.

4.2 בהרצה הראשונה תרחיש Padding לא חוקי סווג בטעות כ־Parity. הוא חשף
ש־D1 מקבל `=` באמצע בעוד PostgreSQL דוחה. התרחיש הועבר ל־Security hardening:
ה־Snapshot והיעד דוחים אותו, בלי לטעון שה־D1 הישן כבר אוכף את הכלל החדש.

## 5. בידוד Tenant

5.1 ‏PostgreSQL דחה Receipt עם `tenant_id=1` ו־WABA השייך ל־Tenant 2.
ההגנה היא Foreign key מורכב `(tenant_id, waba_id)` ואינה תלויה בבדיקה
לאחר כתיבה.

5.2 Inventory חי של `information_schema` הוכיח שמעטפת Credential מכילה
רק שש העמודות המאושרות ושאין עמודת Plaintext או Access token.

## 6. Semantic parity

6.1 שמונת התרחישים שרצו בשני המנועים הם:

1. חיבור Tenant שהיה Pending.
2. מעבר חיבור קיים ל־Restricted.
3. תביעת Webhook receipt חדשה.
4. השלמת Receipt.
5. Retry של Receipt שנכשל.
6. כשל חוזר עם Error code מוגבל.
7. Rotation של Envelope מוצפן.
8. חסימת Event key כפול.

6.2 לאחר התרחישים כל שלוש הטבלאות נקראו שוב והושוו לפי סדר, ערכים
ו־SHA-256 digests.

## 7. שחזור ההרצה

7.1 הפקודה היא:

```bash
CONNECT_POSTGRES_META_CONNECTION_DATA_MIGRATION_REHEARSAL_URL="postgresql://<local-user>@127.0.0.1:<local-port>/connect_meta_connection_data_migration_rehearsal" \
  npm run verify:postgres-meta-connection-data-migration
```

7.2 ה־Verifier מקבל רק PostgreSQL מקומי, מסד בשם הקבוע, Port מפורש וללא
Password, Query או Fragment. בהרצה המתועדת השרת נעצר ותיקייתו נמחקה.

## 8. מה עדיין לא הוכח

8.1 נותרו 30 מתוך 51 טבלאות בשישה Slices, החל ב־`templates-campaigns`.

8.2 נדרשים Export חי חתום, Key availability ב־Staging, בדיקת פענוח מורשית
ב־Vault עצמו, ‏Load/Recovery, ‏Backup/Restore ו־Cutover מאושר.
