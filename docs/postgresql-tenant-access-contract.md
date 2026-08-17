# חוזה PostgreSQL ל־Tenant Access

## 1. מטרה ומצב

1.1 מסמך זה מקפיא את שכבת ה־PostgreSQL המקומית הנדרשת כדי לפתור Tenant
session ב־Railway בלי לסמוך על Tenant ID שמגיע מה־Browser.

1.2 קיימים Schema, ‏Adapters ספק־נייטרליים ו־Node driver adapter, ושרשרת
ה־Migrations הוחלה על PostgreSQL 16.13 מקומי ומבודד. עדיין אין Runtime
integration או Staging evidence, ולכן אין טענה שהמסלול מוכן ל־Production.

## 2. הסבר למתחילים

2.1 Authentication עונה על השאלה "מי המשתמש?". Clerk מספק את זהות המשתמש.

2.2 Authorization עונה על השאלה "לאיזו חברה מותר לו לגשת ומה מותר לו
לעשות?". התשובה נלקחת מ־`tenant_memberships` בצד Railway.

2.3 כאשר משתמש שייך ליותר מחברה אחת, `tenant_selections` שומרת את הבחירה
האחרונה. הבחירה חוקית רק אם קיים Membership פעיל לאותו User ולאותו Tenant.

```text
Clerk identity
  -> membership פעיל ב-PostgreSQL
  -> Tenant במצב מורשה
  -> בחירה שמורה כאשר יש יותר מ-Tenant אחד
  -> Tenant session
  -> Permission check
```

## 3. חוזה Schema

3.1 ‏`tenant_memberships` שומרת Tenant, ‏External user, ‏Role, ‏Status ו־Version.
הצירוף `(tenant_id, external_user_id)` הוא Unique.

3.2 ‏Role מוגבל ל־`owner`, ‏`manager`, ‏`agent` או `viewer`. ‏Status מוגבל
ל־`active` או `suspended`.

3.3 Trigger אוכף שכאשר Role או Status משתנים, Version עולה בדיוק באחד.
שינוי Version ללא שינוי State נחסם.

3.4 ‏`tenant_selections` משתמשת ב־Composite Foreign Key אל ה־Membership.
מחיקת Membership מוחקת אוטומטית בחירה שאינה חוקית יותר.

3.5 ‏`business_profiles` מקושרת ל־Tenant ומגבילה את שפת הממשק ל־`he`, ‏`en`
או `ar`.

3.6 ‏`tenant_membership_events` הוא Ledger בלתי־ניתן לשינוי. כל Event מכיל
מפתח פעולה דטרמיניסטי, Actor, מצב קודם, מצב חדש ומעבר Version מדויק. ‏Unique
constraint על `(operation_key, target_external_user_id)` מונע Event כפול.

3.7 Triggers חוסמים Update/Delete של Event, מוודאים שהמצב החדש כבר נשמר
ב־Membership ומונעים הסרה או השעיה של ה־Owner הפעיל האחרון.

## 4. חוזה Repository

4.1 Membership reads משתמשים רק ב־Parameters, מחזירים לכל היותר 100 שורות
ונכשלים סגור אם PostgreSQL מחזיר User או Tenant שונים מהבקשה.

4.2 Tenant selection נוצרת רק דרך `INSERT ... SELECT` שמוכיח Membership פעיל
ו־Tenant במצב `trial`, ‏`active` או `payment_failed`.

4.3 שינוי Selection דורש Expected version. אם כתיבה לא התבצעה, הרשומה נטענת
עם `FOR UPDATE`: תוצאה מדויקת היא Replay, Version מתקדם הוא Conflict, והיעדר
Membership חוקי הוא Rejected.

4.4 Business profile ו־Tenant display name נשמרים באותה Transaction. ‏`IS
DISTINCT FROM` מונע הגדלת Version כאשר הערכים לא השתנו, והתוצאה נטענת מחדש
ומאומתת לפני Commit.

4.5 שינוי Role או Status נועל תחילה את רשומת ה־Tenant ואחר כך את ה־Membership
באמצעות `FOR UPDATE`. העדכון וה־Event נשמרים באותה Transaction; כשל באחד מהם
מבטל את שניהם.

4.6 העברת Owner נועלת את ה־Tenant ואת שני ה־Memberships בסדר קבוע, מקדמת
קודם את ה־Owner החדש ורק אחר כך מורידה את הקודם. Retry מדויק מזוהה לפי שני
ה־Events ומוחזר כ־`unchanged` ללא כתיבה נוספת.

## 5. מה נבדק מקומית

5.1 נרמול ערכי `BIGINT` שמוחזרים כמחרוזת על ידי `node-postgres`.

5.2 חסימת Row shape פגום, Cross-user, ‏Cross-tenant ויותר מ־100 Memberships.

5.3 Selection create, update, exact replay, stale conflict, rejection ו־rollback.

5.4 Business profile create/update, no-op ואימות Rollback כאשר התוצאה שונה
מהבקשה.

5.5 Migration guard מאמת שבע Migrations ו־16 טבלאות Critical Path בסדר
התלויות הנכון.

5.6 Team mutation contract tests מכסים שינוי Role/Status, ‏Replay, העברת
Owner אטומית, Conflict, בידוד Tenant ו־Rollback כאשר שמירת Event נכשלת.

## 6. מה עדיין חסר

6.1 ‏Node driver וחוזה Pool/TLS/Timeouts נבחרו מקומית. נותרו כלי Migration
וערכי Pool/CA/Telemetry מאושרים ל־Production.

6.2 סכמת Invitation lifecycle וכל Repositories של Request, ‏Transition,
Expiration, ‏Delivery ו־Acceptance קיימים; Contact ו־Invitation
Delivery/Acceptance כבר נבדקו דרך Driver אמיתי, אך יתר המסלולים לא.

6.3 ‏Contact write/read ו־Invitation delivery/acceptance כבר נבדקו מול
PostgreSQL אמיתי. עדיין נדרשים Integration tests ליתר ה־Repositories, כולל
Transactions מקבילות לכל סדרי הנעילות של Membership ו־Selection.

6.4 Runtime composition עם Pool מאושר ו־Staging evidence.

6.5 Parity מלאה מול כל סט 35 ה־Migrations של D1.

## 7. מקורות רשמיים

7.1 [PostgreSQL — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
מגדיר ש־Foreign Key מרובה עמודות חייב להצביע על Primary key, ‏Unique
constraint או Unique index מתאים.

7.2 [PostgreSQL — CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html)
מגדיר `BEFORE UPDATE OF` ו־Row-level triggers המשמשים לאכיפת Version.

7.3 [PostgreSQL — INSERT ו־ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
מגדיר ש־`RETURNING` מחזיר רק שורות שנוספו או עודכנו בפועל וש־`ON CONFLICT`
מספק Upsert אטומי.

7.4 [PostgreSQL — Trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
מגדיר ש־Trigger רץ בתוך אותה Transaction; שגיאה ב־Trigger מבטלת גם את
הפקודה שהפעילה אותו.

7.5 [PostgreSQL — Explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
מגדיר ש־`FOR UPDATE` מונע שינוי או נעילה מתחרים של אותה שורה עד לסיום
ה־Transaction. נעילת Tenant יחידה מסדרת את פעולות ה־Membership באותו Workspace.
