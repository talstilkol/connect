# חוזה PostgreSQL ל־Tenant Access

## 1. מטרה ומצב

1.1 מסמך זה מקפיא את שכבת ה־PostgreSQL המקומית הנדרשת כדי לפתור Tenant
session ב־Railway בלי לסמוך על Tenant ID שמגיע מה־Browser.

1.2 קיימים Schema ו־Adapters ספק־נייטרליים, אך אין עדיין Node driver,
Database חי או Migration evidence. לכן אין טענה שהמסלול מוכן ל־Production.

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

## 5. מה נבדק מקומית

5.1 נרמול ערכי `BIGINT` שמוחזרים כמחרוזת על ידי Driver עתידי.

5.2 חסימת Row shape פגום, Cross-user, ‏Cross-tenant ויותר מ־100 Memberships.

5.3 Selection create, update, exact replay, stale conflict, rejection ו־rollback.

5.4 Business profile create/update, no-op ואימות Rollback כאשר התוצאה שונה
מהבקשה.

5.5 Migration guard מאמת שלוש Migrations ושבע טבלאות Critical Path בסדר
התלויות הנכון.

## 6. מה עדיין חסר

6.1 בחירת Node driver וכלי Migration.

6.2 המרת Membership event ledger ופעולות Team mutation ל־PostgreSQL.

6.3 Integration tests מול PostgreSQL אמיתי, כולל שתי Transactions מקבילות.

6.4 Runtime composition עם Driver אמיתי ו־Staging evidence.

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
