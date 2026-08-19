# PostgreSQL Contact Organization & Import Data Migration Rehearsal

תאריך אימות: 2026-08-20

## 1. תוצאה

1.1 Slice 3 עבר חזרה מקומית מלאה מול SQLite ו־PostgreSQL 16 אמיתי:

`PASS (36 D1 migrations, 24 PostgreSQL migrations, 6 tables, 10 rows, replay rejected, tenant isolation verified, 7 parity scenarios)`

1.2 שש הטבלאות הן:

1. `contact_tags`.
2. `contact_lists`.
3. `contact_tag_assignments`.
4. `contact_list_memberships`.
5. `contact_import_jobs`.
6. `contact_import_rows`.

1.3 התוצאה היא ראיה מקומית דטרמיניסטית. היא אינה Export של נתוני לקוח,
אינה הרצת Staging ואינה אישור Cutover.

## 2. מנגנון ההעברה

2.1 ‏D1 נקרא בתוך Transaction יחיד לאחר `integrity_check`,
`foreign_key_check` ואימות סדר ועמודות מדויק לכל שש הטבלאות.

2.2 כל שורה עוברת נרמול מוגבל ואימות מול חוזה PostgreSQL הסופי. נתון ישן
לא תקין נדחה לפני יצירת Plan; אין תיקון שקט של שם, Actor, Filename,
Idempotency key או Fingerprint.

2.3 ה־Plan תקף עד 15 דקות, כולל HMAC נפרד לכל טבלה ו־SHA-256 ל־Manifest.
ה־Payload נקשר ל־Plan ID, לזמן היצירה ולתפוגה.

2.4 הביצוע משתמש ב־Advisory lock וב־`ACCESS EXCLUSIVE`, דורש שכל שש
טבלאות היעד ריקות וטוען אותן בסדר Parent-first. כל הפעולות נמצאות באותה
Transaction.

2.5 לפני Commit המנגנון:

1. משווה את ששת מוני ה־Import לכל השורות בפועל לפי Outcome.
2. מוודא שכל `source_row_number` נמצא בתוך מספר השורות של ה־Job.
3. מסנכרן ארבעה Identity sequences.
4. קורא את הנתונים בחזרה ומשווה Count ו־HMAC לכל טבלה.

## 3. פרטיות ואבטחה

3.1 ‏Manifest ו־Evidence מכילים רק Table name, Count ו־Digests. בדיקות
Regression מוודאות שלא מופיעים בהם Filename, Actor, Tag/List name או
Phone fingerprint.

3.2 שגיאת INSERT גולמית מה־Driver ממופה ל־Error מוגבל עם Code ו־Table
בלבד. כך Error detail של PostgreSQL אינו יכול להחזיר ערך שורה רגיש למעלה.

3.3 PostgreSQL דחה Assignment שחיבר `tenant_id=1` ל־Contact של Tenant 2,
וכן Import row שניסה לקשר Contact חוצה־Tenant. האכיפה משתמשת ב־Foreign
keys מורכבים ולא רק בבדיקה לאחר הכתיבה.

3.4 ניסיון להריץ שוב את אותו Plan נכשל ב־`target-not-empty`; אין Merge או
Overwrite אוטומטי.

## 4. פערי Legacy שנחסמים

4.1 ‏D1 הישן מאפשר כמה צורות שהיעד הקשיח אינו מקבל. ה־Snapshot חוסם:

1. שמות Group לא חתוכים או ריקים.
2. ‏Import idempotency key שאינו `contact_import_v1_` ועוד SHA-256.
3. Filename שאינו CSV/XLSX בטוח, חתוך ועד 255 תווים.
4. Actor לא חתוך, ארוך או עם Control characters.
5. ‏Job מעל 50,000 שורות או מונים/סטטוס/זמנים לא עקביים.
6. Phone fingerprint שאינו 64 תווי Hex קטנים.
7. Outcome, Reason, Contact או Source row שאינם תואמים לחוזה.

4.2 זו חסימת בטיחות מכוונת. אם Export חי יכיל שורה כזו, יש להפיק דוח
חריגות ולהחליט עסקית על תיקון; אין לשנות אותה אוטומטית בזמן Cutover.

## 5. Semantic parity

5.1 שבעת התרחישים רצו על D1 ועל PostgreSQL והשוו Accepted/Rejected:

1. Upsert של Tag קיים.
2. הקצאת Tag ל־Contact נוסף.
3. הוספת List membership.
4. חסימת Tag עם `normalized_name` כפול.
5. חסימת Import source row כפולה.
6. חסימת מוני Import לא עקביים.
7. יצירת Import job חדש במצב Processing.

5.2 לאחר התרחישים נקראו שוב כל שש הטבלאות וסדר השורות, הערכים וה־Digests
הושוו בין שני המנועים.

## 6. שחזור ההרצה

6.1 הפקודה היא:

```bash
CONNECT_POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_MIGRATION_REHEARSAL_URL="postgresql://<local-user>@127.0.0.1:<local-port>/connect_contact_organization_import_data_migration_rehearsal" \
  npm run verify:postgres-contact-organization-import-data-migration
```

6.2 ה־Verifier מקבל רק PostgreSQL מקומי, מסד בשם הקבוע, Port מפורש וללא
Password, Query או Fragment. יש ליצור מסד ריק ייעודי.

6.3 בהרצה המתועדת השרת היה זמני ומקומי בלבד. הוא נעצר ותיקיית הנתונים
הזמנית נמחקה מיד לאחר האימות.

## 7. מה עדיין לא הוכח

7.1 נותרו 33 מתוך 51 טבלאות בשמונה Slices, החל ב־`meta-connection`.

7.2 עדיין נדרשים Export חי חתום, דוח חריגות, Dry-run על עותק Staging,
Load/Recovery, Backup/Restore ו־Cutover מאושר.
