# Railway BullMQ — תור Meta Webhook

## 1. מצב

1.1 ‏Adapter מקומי ל־Railway Redis + BullMQ הושלם עבור
`meta-webhook-v1`.

1.2 ה־Publisher מחובר ל־Railway API וה־Consumer מחובר ל־PostgreSQL
business runtime. זה עדיין **אינו אישור Production או Staging**: חסרים
Secrets חיים, ערכי Policy מאושרים, Telemetry, ‏Load/Outage evidence וראיית
Railway חתומה מהגרסה הנוכחית.

1.3 קבצי מקור האמת הם:

1.3.1 `server/platform/railwayBullMqMetaWebhookQueue.ts` — Publisher,
Worker, ‏Serialization, ‏Retry, ‏DLQ, תחזוקה ו־Lifecycle.

1.3.2 `server/platform/railwayBullMqPostgresApiRuntime.ts` — בעלות ה־API על
Publisher והוכחת Redis readiness לפני פתיחת HTTP.

1.3.3 `server/platform/railwayPostgresWorkerService.ts` — יצירת ה־Consumer
העסקי ממאגרי PostgreSQL וחיבורו ל־Worker.

1.3.4 `server/platform/railwayBullMqWorkerExecutable.ts` — תהליך Worker אחד
שמחזיק את ארבעת תורי BullMQ שמומשו.

1.3.5 `shared/domain/queueAdapterAcceptance.ts` — חוזה הקבלה המשותף לארבעת
התורים.

## 2. זרימת הקליטה

2.1 ‏Meta שולחת את הבקשה ל־`/webhooks/meta`. לפני פרסום לתור, ה־API בודק
מגבלת גודל, מבנה חתימה, חתימת HMAC, מכסת Ingress וחיבור WABA פעיל.

2.2 תשובת הצלחה מוחזרת רק לאחר ש־BullMQ אישר את כתיבת ה־Job ל־Redis. כשל
Redis ממופה לתשובה תחומה ואינו מאשר אירוע שלא נשמר.

2.3 `ArrayBuffer` אינו נשמר ישירות ב־JSON של BullMQ. האדפטר מקודד את גוף
הבקשה ל־Base64 קנוני ומשחזר ממנו `ArrayBuffer` חדש. לפני ה־Consumer נבדקים
ה־Schema, החתימה והקידוד הקנוני.

2.4 ‏SHA-256 של גוף הבקשה משמש `jobId` דטרמיניסטי. הוא מונע Job כפול בזמן
Retention בלי לחשוף Payload. לאחר Retention, מנגנון Receipt אטומי ב־
PostgreSQL נשאר שכבת ה־Idempotency הסמכותית.

2.5 ה־Worker מאמת שוב את חתימת Meta לפני עיבוד עסקי. לאחר Claim אטומי של
Receipt הוא מנתב הודעות נכנסות, סטטוסי מסירה וסטטוסי Templates למאגרי
PostgreSQL. Bot ו־AI נשארים Fail-closed כאשר ספק חיצוני אינו מוגדר.

## 3. Retry ו־DLQ

3.1 המדיניות היא ניסיון ראשון ועוד עד 10 Retries, בהפרש קבוע של 30 שניות
וללא Jitter או מקור אקראי.

3.2 ‏`ack()` ו־`retry()` מבודדים לכל Delivery. החלטה כפולה או Delay שאינו
30 שניות נדחים. חריגה לפני החלטה גורמת ל־Retry ולא ל־Ack שקט.

3.3 מעטפת BullMQ פגומה, Base64 לא־קנוני או Job ID שאינו תואם ל־digest
עוברים ישירות ל־`meta-webhook-dlq-v1` בלי להגיע ל־Domain consumer.

3.4 אחרי מיצוי 11 ניסיונות, ההודעה עוברת ל־DLQ עם Reason code תחום וגוף
ה־Wire המקורי. אם כתיבת ה־DLQ נכשלת, Job המקור נשאר Failed ואינו נעלם.

3.5 חתימה לא תקינה או WABA שאינו מחובר הם כשל קבוע ומקבלים Ack לפי החוזה
הקיים. כשלים זמניים ב־Storage, ‏Receipt transition או Processor מקבלים
Retry.

## 4. Lifecycle ותחזוקה

4.1 ה־API מחזיק Queue producer בלבד, עם `maxRetriesPerRequest: 1` ו־
`enableOfflineQueue: false`. כך בקשה אינה נשמרת בזיכרון ומאושרת מאוחר יותר
באופן לא ודאי.

4.2 ה־Worker מחזיק BullMQ Worker ו־DLQ. הוא, תור ההזמנות, תור הקמפיינים ותור התבניות
משלימים Readiness לפני שה־Scheduler מתחיל.

4.3 ניקוי ארבעת ה־DLQ רץ תחת אותו Fenced lease ובגבולות Retention ו־Batch
מפורשים. אין ברירות מחדל ואין מחיקה לא־תחומה.

4.4 בכיבוי, HTTP ו־Scheduler מפסיקים לקבל עבודה חדשה; משאבי Redis נסגרים
לפני PostgreSQL. Startup חלקי מנסה לסגור כל משאב שכבר נוצר.

4.5 פקודת ה־API המפורשת היא:

```bash
npm run start:railway-api
```

היא דורשת את כל משתני PostgreSQL, ‏Clerk, ‏Meta webhook, ‏Rate limit,
BullMQ ו־Redis. אין לשמור ערכים אלה בקוד או ב־Git.

## 5. בדיקות שהושלמו

5.1 בדיקות יחידה מכסות Payload round-trip, ‏Job ID דטרמיניסטי, Duplicate
publish, ‏Ack, ‏Retry, ‏Poison, ‏Retry exhaustion, כשל DLQ, ניקוי תחום,
Startup/Shutdown וכשלי Provider ללא דליפת פרטים.

5.2 בדיקות Composition מוכיחות ש־Redis עולה לפני ה־API, שה־Queue port
האמיתי מוזרק ל־Meta handler, ושה־Consumer נוצר ממאגרי PostgreSQL ומחובר
לתהליך Worker המאוחד.

5.3 בדיקת Redis אמיתית הוכיחה שחזור בתים זהה, Delivery יחיד ו־Duplicate
suppression לאחר פרסום חוזר של אותו Payload.

5.4 להרצה מקומית מול Redis זמני או Secret store:

```bash
CONNECT_BULLMQ_INTEGRATION_REDIS_URL=redis://127.0.0.1:6380/0 \
  npm run test:bullmq-integration
```

אין לשמור את ה־URL ב־Artifact, בקובץ או ב־Git.

## 6. מה חסר לפני Ready

6.1 להגדיר ב־Railway את Redis, ‏Retention, ‏Meta Secrets ומדיניות Ingress
מאושרת; לבצע Rotation rehearsal בלי להדפיס Secrets.

6.2 לאשר DLQ owner, ‏Replay policy, ‏Alerts ו־Kill switch. Requeue ידני
חייב להמשיך לדרוש Event key מאומת ואישור מפעיל.

6.3 להוכיח `noeviction`, ‏Persistence/Backup, ‏Memory alerts ו־Outage
recovery ב־Railway Redis.

6.4 להריץ Payload, ‏Duplicate, ‏Ack isolation, ‏Poison, ‏Retry exhaustion,
Load ו־Webhook latency tests ב־Railway Staging.

6.5 להפיק Evidence חתום וקצר־תוקף מה־Commit הנוכחי. הבדיקה המקומית אינה
מחליפה ראיית Staging.

6.6 ‏Clerk invitation adapter, ‏Deferral עמיד ל־429/Retry-After ופקודת
Worker מלאה קיימים מקומית. לפני הפעלה חיה יש לאשר את חשבון Clerk, ערכי
ה־shared rate limit וכל תצורות Railway, להוכיח 429 חי, ואז להפיק ראיית
Staging משותפת לארבעת התורים.
