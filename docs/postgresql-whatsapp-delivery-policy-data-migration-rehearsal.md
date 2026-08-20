# PostgreSQL WhatsApp Delivery Policy Data Migration Rehearsal

תאריך אימות: 2026-08-20

## 1. תוצאה

1.1 ‏Slice 10 והאחרון עבר חזרה נקייה מול SQLite/D1 ומול PostgreSQL 16
אמיתי:

```text
PASS (36 D1 migrations, 25 PostgreSQL migrations, 8 tables, 12 rows,
replay rejected, legacy category unknown, delivery evidence private,
9 parity scenarios)
```

1.2 שמונה הטבלאות הן
`whatsapp_campaign_delivery_policy_events`,
`whatsapp_rate_limit_reservations`,
`whatsapp_pair_rate_limit_state`,
`whatsapp_portfolio_recipient_rate_limit_state`,
`whatsapp_rate_limit_settlements`,
`whatsapp_provider_cooldown_events`,
`whatsapp_provider_cooldown_state` ו־
`campaign_delivery_provider_links`.

1.3 יחד עם תשעת ה־Slices הקודמים הושלמו Data migration ו־Semantic parity
מקומיים לכל 10 ה־Slices ולכל 51 טבלאות D1.

## 2. מה החוזה מגן עליו

2.1 כל Policy event חייב מפתח SHA-256 דטרמיניסטי התואם לתוכן, גרסה רציפה,
חיבור Meta מאותו Tenant, ‏Audit מקורי וראיית Limits שלא פגה בעת ההפעלה.

2.2 לפני Cutover כל Reservation היסטורי חייב להיות Settled. ‏Reservation
חדש אינו נוצר במהלך הטעינה, ו־Replay של Plan שכבר נטען נדחה משום שהיעד כבר
אינו ריק.

2.3 כל Reservation בעל Policy מקושר ל־Policy פעיל ובתוקף. ‏Pair state,
‏Portfolio recipient state, ‏Settlement ו־Provider cooldown נבדקים מול
ה־Reservation והאירועים שמהם נגזרו.

2.4 כל Provider link מקושר ל־Campaign delivery, ל־Reservation ול־Settlement
הטרמינלי המתאימים. זהות Provider, סדר אירועי Status והתוצאה הסופית חייבים
להתאים ל־Campaign recipient projection.

2.5 שמונת גבולות ה־Trigger מושבתים רק בתוך Transaction הטעינה ומופעלים
מחדש לפני Verification ולפני Commit. כשל בכל בדיקה מבטל את כל הטעינה.

## 3. פער ה־Template category ההיסטורי

3.1 ‏D1 אינו שומר `template_category` ב־Reservation היסטורי. אין מקור אמין
שממנו ניתן לשחזר אם ההודעה הייתה `MARKETING` או `UTILITY`, ולכן אסור להמציא
ערך בזמן Migration.

3.2 Migration ‏`0024_whatsapp_legacy_reservation_category.sql` מאפשר
`NULL` רק כייצוג מפורש של Legacy value לא ידוע. כל `INSERT` חדש ל־PostgreSQL
עדיין נדחה אם לא נשלחה Category תקינה.

3.3 Legacy reservation בעל Category לא ידועה ניתן ל־Settlement ול־Cooldown,
אך Replay שלו דרך API חדש נחסם. כך נשמרת היסטוריה אמיתית בלי להפוך ערך חסר
להרשאה עסקית חדשה.

## 4. פרטיות וראיות

4.1 ה־Plan payload הוא Artifact רגיש ואסור לשמור אותו ב־Git, ב־Logs או
במערכת Tickets.

4.2 ‏Manifest ו־Evidence ציבוריים מכילים רק שמות טבלאות, Counts ו־HMAC
digests. הם אינם מכילים:

1. Provider message ID או מספר טלפון.
2. Sender, ‏Recipient, ‏Reservation או Delivery keys.
3. External user ID של Actor.
4. Evidence digest של Policy או ערכי Cooldown של משתמש.
5. Payload של Campaign או פרטי Personalization.

## 5. Semantic parity שנבדק

5.1 תשעת התרחישים הורצו בשני המנועים והשוו Accepted/Rejected ומצב סופי:

1. קידום Provider status ל־`read`.
2. הפעלת Kill switch באמצעות Policy במצב `disabled`.
3. חסימת שינוי Reservation בלתי־משתנה.
4. חסימת מחיקת Settlement.
5. חסימת קיצור Cooldown.
6. חסימת שינוי זהות Provider.
7. חסימת מחיקת Provider link.
8. חסימת דילוג בגרסת Policy באמצעות מפתח תקין וייחודי.
9. חסימת Reservation חדש לאחר Kill switch.

5.2 לאחר התרחישים נקראו שמונה הטבלאות מחדש והושוו Row-for-row. העמודה
`template_category` הנוספת ב־PostgreSQL אינה קיימת ב־D1 ולכן אינה משמשת
להשוואת Source columns; ערכה המיובא נבדק בנפרד כ־`NULL`.

## 6. הפעלה מקומית בטוחה

6.1 יש ליצור PostgreSQL מקומי, ריק וללא Password בשם:

```text
connect_whatsapp_delivery_policy_data_migration_rehearsal
```

6.2 הפקודה מקבלת רק Host מסוג loopback, ‏Port מפורש, שם המסד הקבוע וללא
Query string:

```bash
CONNECT_POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_MIGRATION_REHEARSAL_URL="postgresql://<local-user>@127.0.0.1:<local-port>/connect_whatsapp_delivery_policy_data_migration_rehearsal" \
  npm run verify:postgres-whatsapp-delivery-policy-data-migration
```

6.3 הסקריפט מסרב למסד יעד שאינו ריק. בסיום החזרה יש לעצור את השרת הזמני
ולמחוק את תיקייתו.

## 7. מה עדיין חסר

7.1 ‏Rehearsal מקומי אינו Cutover. לפני Production עדיין נדרשים Export חי
ועקבי, ‏Staging מבודד, ‏Load/Recovery rehearsal, ערכי Railway ו־Meta חיים,
חלון Cutover מאושר ו־Rollback שנבדק עם הנתונים המורשים.

7.2 אין עוד Slice מקומי מתוכנן. כל עבודה נוספת על Migration data היא ראיה
בסביבה מבוקרת או תיקון של פער שיימצא בנתונים החיים.
