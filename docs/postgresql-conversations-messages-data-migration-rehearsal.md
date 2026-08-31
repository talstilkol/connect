# PostgreSQL Conversations & Messages Data Migration Rehearsal

תאריך אימות: 2026-08-20

## 1. תוצאה

1.1 ‏Slice 6 עבר חזרה מקומית מלאה מול SQLite ו־PostgreSQL 16 אמיתי:

`PASS (36 D1 migrations, 24 PostgreSQL migrations, 2 tables, 5 rows, replay rejected, tenant isolation verified, message content private, 9 parity scenarios)`

1.2 שתי הטבלאות הן `conversations` ו־`messages`.

1.3 זו ראיה מקומית דטרמיניסטית. היא אינה Export של תוכן לקוח, אינה
משתמשת ב־Webhook חי ואינה אישור Cutover.

## 2. מנגנון ההעברה

2.1 ‏D1 נקרא ב־Transaction יחיד לאחר Schema, ‏Integrity ו־Foreign-key
checks. כל שורה נבדקת מול חוזה PostgreSQL לפני יצירת Plan.

2.2 ה־Plan תקף עד 15 דקות וקשור ל־HMAC נפרד לכל טבלה ול־Manifest digest.
PostgreSQL ננעל ב־Advisory lock וב־`ACCESS EXCLUSIVE`, ושתי טבלאות היעד
חייבות להיות ריקות.

2.3 הטעינה היא Conversations תחילה ו־Messages לאחר מכן. כך נסגר ה־Foreign
key של Message, אף ש־Conversation מחזיק במקביל הקרנה לוגית של Last message.

2.4 לפני Commit נבדק שכל `last_message_key` לא־ריק מצביע ל־Message באותו
Tenant ובאותה Conversation, וש־`occurred_at` שלו זהה ל־`last_message_at`.
לאחר מכן שתי הטבלאות נקראות בחזרה ו־Count/HMAC מושווים למקור.

## 3. פרטיות

3.1 ‏Message text ו־Provider message ID נמצאים רק ב־Payload המוגן של
ה־Plan. ה־Manifest וה־Evidence הציבוריים מכילים רק Table name, ‏Count
ו־HMAC digest.

3.2 בדיקות Regression מוודאות שטקסט שיחה, `wamid`, סטטוס השיחה ופרטי
שיוך אינם מופיעים ב־Evidence. אין להדפיס או לשמור את Plan payload ב־Git,
CI logs או Artifact ציבורי.

3.3 Non-text message חייבת לשמור `text_content=NULL`; Text message חייבת
לשמור תוכן לא־ריק ועד 16,384 תווים. ה־Migration אינו ממציא Placeholder
לתוכן מדיה שאינו קיים.

## 4. הקשחת Legacy

4.1 ‏D1 הישן מאפשר מספר צורות שהיעד הקשיח אינו מקבל. ה־Snapshot חוסם:

1. Assignee או Provider message ID עם רווחי קצה, Control chars או אורך עודף.
2. Message direction/status שאינם עקביים.
3. Content kind ו־Text content שאינם תואמים.
4. `status_updated_at` שקודם ל־`occurred_at`.
5. Status event key/time חסרים, לא תקינים או מוקדמים מההודעה.
6. `updated_at` שקודם ל־`created_at`.
7. Conversation/Message keys שאינם מזהים דטרמיניסטיים תקינים.

4.2 נתון Legacy שנכשל אינו מתוקן בשקט. יש להפיק דוח חריגות ולקבל החלטה
מפורשת לפני Export חוזר.

## 5. בידוד Tenant ו־Provider identity

5.1 PostgreSQL דחה Conversation של Tenant 1 שקישרה Contact של Tenant 2,
וכן Message של Tenant 1 שקישרה Conversation של Tenant 2. שני המסלולים
נאכפים ב־Foreign keys מורכבים.

5.2 Provider message ID הוא Unique בתוך Tenant. ניסיון לשמור Provider ID
קיים תחת Message חדש נדחה.

5.3 PostgreSQL דחה Provider ID עם רווחי קצה באמצעות Constraint. טבלת
`campaign_delivery_provider_links` נשארה ריקה ותועבר רק עם ראיית ה־
Rate-limit ב־Slice 10; אותו Provider ID לא יוכל להשתייך לשני יעדים.

## 6. Semantic parity

6.1 תשעת התרחישים רצו על D1 ועל PostgreSQL והשוו Accepted/Rejected:

1. מעבר הודעת Outbound ל־Delivered עם Status event.
2. מעבר מאוחר יותר ל־Read.
3. סימון Conversation כנקראה.
4. שיוך Conversation ל־Agent.
5. ביטול השיוך על ידי אותו Agent.
6. עדכון Last-message projection עבור Inbound חדש.
7. שמירת הודעת Image ללא Text content.
8. חסימת Provider message ID כפול.
9. חסימת Message שמפנה ל־Conversation של Tenant אחר.

6.2 לאחר התרחישים נקראו שוב שתי הטבלאות. סדר השורות, כל הערכים וה־Digests
היו זהים בשני המנועים.

## 7. שחזור ההרצה

7.1 הפקודה היא:

```bash
CONNECT_POSTGRES_CONVERSATIONS_MESSAGES_DATA_MIGRATION_REHEARSAL_URL="postgresql://<local-user>@127.0.0.1:<local-port>/connect_conversations_messages_data_migration_rehearsal" \
  npm run verify:postgres-conversations-messages-data-migration
```

7.2 ה־Verifier מקבל רק PostgreSQL מקומי, מסד בשם הקבוע, Port מפורש וללא
Password, ‏Query או Fragment. השרת המתועד נעצר ותיקייתו הזמנית נמחקה.

## 8. מה עדיין לא הוכח

8.1 ‏26 מתוך 51 טבלאות עברו Data migration ו־Semantic parity. נותרו 25
טבלאות בארבעה Slices; הבא הוא `bot-runtime` ובו שלוש טבלאות.

8.2 עדיין נדרשים Export חי חתום, סריקת חריגות PII, ‏Dry-run ב־Staging,
Load/Recovery, ‏Backup/Restore ו־Cutover מאושר.
