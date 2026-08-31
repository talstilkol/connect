# Railway BullMQ — תור הגשת תבניות WhatsApp

## 1. מצב

1.1 ‏Adapter מקומי ראשון ל־Railway Redis + BullMQ הושלם עבור
`message-template-submission`.

1.2 ה־Adapter עדיין **אינו ראיית Production או Staging**. ‏Provider-bound
composition ו־Start command fail-closed מחברים אותו ל־PostgreSQL Worker,
ל־Scheduler ולשלושת התורים האחרים. עדיין אין Redis account מאושר,
Telemetry provider חי, ‏Load evidence או Evidence חתום מהגרסה הנוכחית.

1.3 קבצי מקור האמת הם:

1.3.1 `server/platform/railwayBullMqConfiguration.ts` — תצורה שנכשלת סגור.

1.3.2 `server/platform/railwayBullMqMessageTemplateSubmissionQueue.ts` —
Publisher, ‏Worker mapper, ‏Retry, ‏DLQ, תחזוקה ו־Lifecycle.

1.3.3
`server/platform/railwayBullMqMessageTemplateSubmissionWorkerExecutable.ts` —
חיבור Provider-bound בין BullMQ, ‏PostgreSQL Worker ו־Scheduler.

1.3.4 `server/platform/railwayPostgresWorkerService.ts` — יצירת Consumer
מה־Repositories האמיתיים וסדר Startup/Shutdown.

1.3.5 `shared/domain/queueAdapterAcceptance.ts` — חוזה הקבלה המשותף לארבעת
התורים.

1.4 התלויות מקובעות ל־`bullmq@5.81.3` ול־`ioredis@5.11.1`. ‏BullMQ 6
שוחרר ב־30 ביולי 2026 עם שינויי API שוברים ו־Backend abstraction חדש לפי
[ה־Changelog הרשמי](https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/changelog.md).
הבחירה בקו 5 האחרון היא החלטת ייצוב ל־Pilot, לא ויתור קבוע על שדרוג.

## 2. זרימת העבודה

2.1 ה־Maintenance relay קורא Outbox מ־PostgreSQL ומפרסם הודעה תחומה:
`version`, ‏`tenantId` ו־`submissionKey` אטום בלבד.

2.2 ‏`submissionKey` משמש גם `jobId`. פרסום חוזר של אותה זהות מחזיר את
אותה עבודה ואינו יוצר Job נוסף כל עוד הזהות שמורה ב־BullMQ.

2.3 ה־Worker ממפה כל Job ל־Delivery יחיד עם `ack` או `retry`. רק `ack`
מסיים את העבודה בהצלחה.

2.4 כשל זמני מפעיל Delay קבוע של 30 שניות. המדיניות היא 10 Retries אחרי
הניסיון הראשון, כלומר לכל היותר 11 ניסיונות Delivery.

2.5 אין Jitter ואין מקור אקראיות. לאחר מיצוי הניסיונות, גוף ההודעה המקורי
עובר ל־DLQ נפרד עם Reason code תחום וללא טקסט שגיאה פרטי.

2.6 Envelope בלתי־חוקי עובר ישירות ל־DLQ ואינו מגיע ל־Domain consumer.

2.7 אם כתיבת ה־DLQ נכשלת, Processor נכשל. BullMQ משאיר את העבודה ב־Failed
set של התור הראשי, ולכן הכשל אינו מסומן בטעות כהצלחה.

## 3. חיבור Redis

3.1 ב־`staging` וב־`production` מתקבל רק `REDIS_URL` מאומת עם Host תחת
`railway.internal`, ‏Port מפורש ו־Credentials. חיבור Redis ציבורי או
Loopback נדחה.

3.2 החיבור משתמש ב־`family: 0`, כדי לתמוך ב־IPv4 וב־IPv6 ברשת הפרטית של
Railway בהתאם ל־[Railway library configuration](https://docs.railway.com/networking/private-networking/library-configuration).

3.3 חיבור Publisher מוגדר Fail-fast באמצעות `maxRetriesPerRequest: 1`
ו־`enableOfflineQueue: false`. חיבורי Worker ו־DLQ ממתינים להתאוששות Redis
באמצעות `maxRetriesPerRequest: null`, בהתאם להפרדה שממליצה
[BullMQ production guide](https://docs.bullmq.io/guide/going-to-production).

3.4 ‏Startup מוגבל ל־15 שניות. ‏Worker נסגר באמצעות `worker.close()`, אשר
מפסיק לקבל Jobs חדשים וממתין ל־Jobs הפעילים לפי
[BullMQ graceful shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown).

3.5 נדרש עדיין להוכיח בסביבת Railway ש־Redis מפעיל AOF,
`maxmemory-policy=noeviction`, ‏Memory alerts ו־Backup/Restore. ה־Adapter
אינו מניח שהגדרות אלה קיימות.

## 4. Retention ו־DLQ

4.1 אין ערכי Retention ברירת מחדל. ה־Runtime נשאר חסום עד שמוגדרים ערכים
מפורשים עבור Completed, ‏Failed ו־DLQ.

4.2 ‏Completed jobs מוגבלים ל־60 שניות עד 7 ימים ול־1 עד 1,000,000
רשומות. ‏Failed jobs מוגבלים לשעה עד 30 ימים ובאותו טווח Count.

4.3 ‏DLQ retention מוגבל ליום עד 90 ימים. פעולת התחזוקה מוחקת בכל קריאה
רק Batch מוגדר של Jobs ממתינים שפג תוקפם.

4.4 ניקוי DLQ מחובר כעת ל־Maintenance task כאשר נבחר ה־BullMQ runtime.
הוא רץ במקביל ל־Relay/Reconciliation אך כל פעולה מוגבלת ל־Retention ול־Batch
המפורשים. ערכי Production, ‏Owner, ‏Audit ונתיב Requeue ידני עדיין דורשים
אישור לפני הפעלה חיה.

4.5 ‏BullMQ מבצע ניקוי Completed/Failed לפי Age/Count באופן Best-effort
כאשר Job נוסף מסתיים. לכן Evidence חייב לבדוק גם Retention בפועל ולא רק את
ערכי התצורה.

## 5. משתני סביבה

5.1 נדרשים כל המשתנים הבאים; ערך חסר או מורחב חוסם Startup:

5.1.1 `APP_RUNTIME_ENVIRONMENT`.

5.1.2 `REDIS_URL`.

5.1.3 `BULLMQ_COMPLETED_RETENTION_SECONDS`.

5.1.4 `BULLMQ_COMPLETED_RETENTION_COUNT`.

5.1.5 `BULLMQ_FAILED_RETENTION_SECONDS`.

5.1.6 `BULLMQ_FAILED_RETENTION_COUNT`.

5.1.7 `BULLMQ_DLQ_RETENTION_SECONDS`.

5.1.8 `BULLMQ_DLQ_CLEAN_BATCH_SIZE`.

5.2 ‏`REDIS_URL` הוא Secret שרתי. הוא נוסף ל־Client/Server source guard
ואסור לייבא אותו ל־React או לחשוף אותו ב־Telemetry ובשגיאות.

## 6. בדיקות שהושלמו

6.1 בדיקות יחידה מכסות תצורה חסרה/זדונית, Batch גדול, Envelope פגום,
Publisher outage, ‏Retry, ‏DLQ exhaustion, כשל DLQ, ניקוי Retention,
Telemetry מבודד, Startup failure וכיבוי חלקי.

6.2 בדיקת אינטגרציה אופציונלית מפעילה Queue ו־Worker אמיתיים מול Redis,
מוכיחה Publish, ‏Consume ו־Deduplication, ומנקה את Job הבדיקה בסיום.

6.3 ב־21 באוגוסט 2026 הבדיקה עברה מול Redis מקומי אמיתי. ההרצה גם חשפה
ותיקנה כשל Startup: אין לשלב `enableOfflineQueue: false` עם
`skipWaitingForReady`, משום שבדיקת ה־INFO הראשונית של BullMQ עלולה להישלח
לפני שה־Stream מוכן.

6.3.1 בדיקות Composition מוכיחות שה־Consumer נוצר מתוך PostgreSQL foundation,
שה־Queue עולה לפני ה־Scheduler, ש־Startup כושל מנקה Queue ו־Database, ושבכיבוי
ה־Scheduler מפסיק לפני ניקוז BullMQ וסגירת PostgreSQL. חיבור כפול של Publisher
חיצוני ושל Queue factory נדחה.

6.4 לאחר הזרקת `CONNECT_BULLMQ_INTEGRATION_REDIS_URL` דרך Secret store של
סביבת הבדיקה, מריצים:

```bash
npm run test:bullmq-integration
```

אין לשמור את ה־URL בקובץ, ב־Git או ב־Artifact.

## 7. מה חסר לפני Ready

7.1 הושלם מקומית: ה־Adapter מחובר ל־Provider-bound composition. כל ארבעת
התורים עולים לפני ה־Scheduler; בכיבוי ה־Scheduler מפסיק, Worker מנקז Jobs
פעילים ורק אז PostgreSQL נסגר. פקודת ההפעלה היא
`npm run start:railway-worker:bullmq`; היא נכשלת סגור כאשר Identity,
Rate limit או תצורת Worker אחרת חסרים.

7.2 לחבר Telemetry sink חי והתראות ל־Publisher failures, ‏Worker failures,
DLQ depth, ‏Oldest job age ו־Cleanup.

7.3 לאשר ערכי Retention, ‏DLQ cleanup owner ו־Requeue policy.

7.4 הושלמו מקומית גם Meta webhook ו־Team invitation. לפני הפעלה חיה יש
להוכיח את ספק Clerk, מדיניות Retry ואת כל התצורות מול חשבונות מורשים.

7.5 להריץ Duplicate, ‏Poison, ‏Outage recovery, ‏Payload round-trip ו־Ack
isolation ב־Railway Staging ולהפיק Evidence חתום וקצר־תוקף.

7.6 עד להשלמת סעיפים 7.1–7.5, שער Production נשאר חסום בכוונה.

7.7 לבצע Evaluation נפרד ל־BullMQ 6 אחרי שכל ארבעת ה־Adapters עוברים את
אותו Conformance suite. אין לבצע Major upgrade יחד עם Cutover ל־Staging.
