# חוזה קבלה ל־Queue/DLQ

## 1. מטרה

1.1 המסמך מגדיר כיצד מוכיחים ש־Queue adapter חדש בטוח ל־Connect לפני
חיבורו ל־Railway Staging.

1.2 ‏Queue הוא תור עבודה: ה־Publisher מכניס הודעה, Worker מקבל אותה,
ומסמן `ack` לאחר הצלחה או `retry` כאשר מותר לנסות שוב. ‏DLQ הוא תור נפרד
להודעות שנכשלו שוב ושוב, כדי שלא יאבדו ולא ייצרו לולאה אינסופית.

1.3 זהו **Connect engineering policy**, לא מגבלה רשמית של WhatsApp או של
Meta. הערכים משמרים את קיבולת ה־Consumers והמדיניות הקיימת בפרויקט. שינוי
שלהם מחייב גרסת Policy חדשה ובדיקות עומס חדשות.

## 2. מקור האמת

2.1 החוזה ה־Machine-readable נמצא ב־
`shared/domain/queueAdapterAcceptance.ts`.

2.2 קיבולת Batch המשותפת נמצאת ב־`shared/domain/queuePolicy.ts` ומשמשת גם
את ה־Consumers. כך הבדיקה וה־Runtime אינם יכולים לסטות לערכים שונים.

2.3 גרסת המדיניות היא `connect-queue-adapter-acceptance-v1`.

## 3. דרישות משותפות

3.1 כל ארבעת התורים חייבים להוכיח:

3.1.1 ‏Delivery מסוג `at-least-once`. משמעות הדבר היא שהודעה לא אמורה
להיעלם, אך Duplicate אפשרי ולכן ה־Domain חייב להישאר Idempotent.

3.1.2 ‏Batch מקסימלי של 10 הודעות, זהה לקיבולת ה־Consumers.

3.1.3 עד 10 Retries ולאחריהם העברה ל־DLQ.

3.1.4 ‏Acknowledgement מפורש ונפרד לכל הודעה.

3.1.5 גוף ההודעה נשמר ללא שינוי בין Publish, ‏Retry ו־Delivery.

3.1.6 בדיקות Staging שעברו עבור Duplicate delivery, ‏Poison message ל־DLQ,
התאוששות מהשבתת הספק, Payload round-trip ובידוד `ack`/`retry` בין הודעות.

## 4. דרישות Delay לפי תור

4.1 ‏`meta-webhook` אינו דורש Delayed retry בחוזה v1.

4.2 ‏`campaign-delivery` חייב לתמוך ב־Delay מוגדר של עד 86,400 שניות,
כדי לכבד Retry ו־Cooldown של עד 24 שעות בלי Busy loop.

4.3 ‏`team-invitation` ו־`message-template-submission` חייבים לתמוך לפחות
ב־30 שניות Delay.

4.4 ערך Delay שמוגדר בראיה מוגבל לשבעה ימים כדי לחסום טעות תצורה. זהו
גבול פנימי של Connect ואינו טענה על יכולת הספק.

## 5. ראיית קבלה

5.1 הראיה חייבת להיות מ־Staging, קשורה ל־Commit SHA ול־Artifact digest
מדויקים, ולכלול את ארבעת התורים בסדר הקנוני.

5.2 תוקף הראיה הוא עד 24 שעות. ראיה ישנה, עתידית־הפוכה, מורחבת, חלקית,
כפולה או מסביבה אחרת נדחית.

5.3 הראיה אינה מכילה Resource name, ‏Account ID, ‏Connection string,
Payload, ‏Tenant או Secret. הפלט המאושר מחזיר רק זמנים, Digest ומספר התורים.

## 6. תנאי מעבר ל־Adapter חי

6.1 לבחור ספק ולתעד החלטה, עלות, Region, ‏Retention ונתיב Support.

6.2 לממש Publisher, ‏Consumer delivery mapper, ‏Retry/Delay mapper ו־DLQ
inspector ללא שינוי חוזי ה־Domain.

6.3 להריץ את חמש בדיקות ההתנהגות לכל ארבעת התורים ב־Staging ולהפיק ראיה
תקפה לפי סעיף 5.

6.4 לחבר Monitoring sink והתראות עבור Backlog, ‏Retry rate, ‏DLQ depth,
Oldest message age וכשלי Publisher/Consumer.

6.5 ‏Entry module ו־Package script fail-closed קיימים כעת מקומית. אין להפעיל
אותם ב־Railway חי לפני השלמת ראיית Staging שבסעיף 6.3 ו־Monitoring שבסעיף
6.4.

6.6 ‏Slice מקומי ראשון עבור `message-template-submission` מתועד ב־
`docs/railway-bullmq-message-template-submission-adapter.md`. הוא מיישם את
שכבת ה־Adapter, מחבר אותה ל־Provider-bound PostgreSQL Worker lifecycle
ונבדק מול Redis מקומי אמיתי. הוא עדיין אינו מספק את ראיית Staging המשותפת
של סעיף 6.3.

6.7 ‏Slice מקומי שני עבור `campaign-delivery` מתועד ב־
`docs/railway-bullmq-campaign-delivery-adapter.md`. הוא מיישם Delay דינמי
עד 24 שעות, DLQ, חיבור ל־PostgreSQL/Meta/Rate limiting ו־Lifecycle משותף עם
תור התבניות.

6.8 שני ה־Slices הנוספים, `meta-webhook` ו־`team-invitation`, הושלמו
מקומית ומחוברים יחד עם שני התורים הראשונים דרך
`npm run start:railway-worker:bullmq`. הפקודה דורשת Identity, ‏Rate limit,
PostgreSQL, ‏Redis, ‏Meta ו־Retention מפורשים ונכשלת סגור לפני חיבורים כאשר
התצורה חסרה. ‏Better Stack OTLP Logs מחובר מקומית עם Batch ו־Flush בסגירה;
Source, ‏Token, ‏Live-tail, ‏Retention, ‏Alerts וראיית Staging עדיין חסרים.

6.9 חוזה עמידות Redis נפרד נמצא ב־
`shared/domain/redisDurabilityAcceptance.ts`. תרגיל מקומי אמיתי הוכיח AOF
עם `everysec`, ‏`noeviction`, כשל Publisher בזמן השבתה, שחזור Job לאחר
`SIGKILL` ועיבוד 500 מתוך 500 עבודות ללא כשל. ראיית Railway Staging עדיין
נדרשת ואינה נגזרת מהתרגיל המקומי.

## 7. אימות קובץ הראיה

7.1 ה־CLI המקומי נמצא ב־`scripts/verify-queue-adapter-evidence.mjs` ומופעל
באמצעות `npm run verify:queue-adapter-evidence`.

7.2 ה־CLI קורא רק את
`.artifacts/queue-adapter-acceptance-evidence.json`. הוא אינו יוצר ראיה
ואינו משלים ערכים חסרים; הקובץ חייב להגיע מהרצת Staging אמיתית.

7.3 לפני ההפעלה יש לספק את `APP_DEPLOYMENT_ARTIFACT_DIGEST` בפורמט
`sha256:` ואחריו 64 תווי Hex קטנים. ה־Digest בקובץ חייב להתאים בדיוק לערך
זה, ו־Commit הראיה חייב להתאים ל־HEAD הנקי שממנו נוצר ה־Release manifest.

7.4 הקובץ חייב להיות קובץ רגיל בבעלות המשתמש הנוכחי, בעל Link יחיד,
ללא הרשאת כתיבה ל־Group או ל־Others ובגודל של עד 48,000 Bytes. ‏Symlink,
שינוי הקובץ בזמן הקריאה, UTF-8 לא תקין, JSON מורחב או קובץ גדול נדחים.

7.5 הפלט מכיל רק PASS/FAIL, מספר תורים ו־Digest של קובץ הראיה. הוא אינו
מדפיס Resource names, ‏Provider, ‏Account, ‏Payload או Secret.

7.6 עבודה מקומית לא שמורה גורמת ליצירת Release manifest להיכשל בכוונה.
המשמעות היא שלא ניתן לקשור Evidence באופן אמין לגרסה שטרם קובעה ב־Git.
