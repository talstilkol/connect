# Meta Bot Reply Adapter — חוזה מקומי

תאריך אימות: 2026-08-21

## 1. תוצאה

1.1 נוסף Adapter שרתי לשליחת תשובת Bot דרך WhatsApp Business Platform
הרשמי.

1.2 המימוש המקומי כולל שלושה גבולות נפרדים:

1.2.1 `metaBotReplyAdapter` בונה בקשת Graph API סגורה ומפרש את תשובת
Meta.

1.2.2 `metaBotReplyProcessor` פותר מחדש את חיבור Meta של ה־Tenant וקורא
את ה־Access token רק דרך ה־Credential Vault המוצפן.

1.2.3 `metaBotReplyRuntime` יוצר Transport רק עם גרסת Graph API מפורשת.

1.3 ה־Adapter מחובר מקומית למסלול ה־Railway/BullMQ Worker המוגבל לספק,
כולל Admission, ‏Due runner ו־Telemetry. ‏`botReplyDeliveryAdapter` נשאר
בכוונה `false` ב־Production Implementation State עד השלמת יתר Gates
הבטיחות והראיות החיות.

## 2. היגיון המסירה

2.1 הזרימה המקומית היא:

```text
Inbound webhook
  -> Parse verified Meta occurredAt + button context
  -> Enforce current time inside [occurredAt, occurredAt + 24h)
  -> Bot runtime
  -> Durable bot reply delivery
  -> Atomic fenced claim: pending -> sending
  -> Pair/Phone admission
  -> reserved | durable deferral until nextAttemptAt
  -> Re-check service-window boundary immediately before provider I/O
  -> Resolve current connected Meta phone for the Tenant
  -> Decrypt Tenant token inside Credential Vault operation
  -> POST /{phone-number-id}/messages
  -> accepted + immutable provider/reservation link | rejected | ambiguous
  -> Meta Status webhook
  -> sent | delivered | read | failed
  -> Atomic exact Reservation settlement on first terminal status
  -> Bounded delivery-attempt telemetry + nested provider timing
```

2.2 רק תשובה תקינה ובה `messaging_product=whatsapp`, רשומת Message יחידה
ו־ID שמתחיל ב־`wamid.` נחשבת Acceptance.

2.3 Timeout, שגיאת רשת, HTTP 5xx או תשובת Acceptance בלתי תקינה נחשבים
לתוצאה לא ידועה. הם אינם מומרים ל־Retry אוטומטי, ולכן ה־Outbox הקיים
מסמן אותם `ambiguous` ולא שולח שוב.

2.4 שגיאת Meta מפורשת מסוג HTTP 4xx ממופה לקוד פנימי מוגבל. הודעת הספק,
מספר הטלפון, Tenant, תוכן ההודעה ו־Token אינם נכנסים ל־Telemetry.

## 3. Payloads נתמכים

3.1 תשובת טקסט נשלחת כ־`type=text` עם `preview_url=false`.

3.2 תפריט קצר נשלח כ־`type=interactive` ו־`interactive.type=button`.
מפתחות הכפתורים הם מפתחות Domain דטרמיניסטיים קיימים, לא מזהים חדשים.

3.3 הגבול המקומי אוכף מראש:

3.3.1 מספר טלפון E.164 ו־Phone Number ID מספרי.

3.3.2 Delivery key, Conversation key, Message key וגרסת Flow תקינים.

3.3.3 בין כפתור אחד לשלושה.

3.3.4 כותרת כפתור באורך עד 20 תווים, ללא כפילות.

3.3.5 מבנה Reply סגור ללא שדות נוספים.

3.4 ה־Payload מבוסס על אוסף ה־API הרשמי של Meta ב־Postman:

3.4.1 [Messages — WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ba8d099d-007e-4b52-b9f2-3cf3c60e4fbc).

3.4.2 [Send Reply Button — WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/request/ne00kt6/send-reply-button).

3.4.3 [Messages Object — WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/folder/1dtuocp/messages-object).

3.5 בדפי Meta עצמם לא הופיע תאריך Revision; התאריך בראש המסמך הוא מועד
האימות של Connect, לא תאריך פרסום של Meta.

## 4. Gates להפעלה

4.1 **הושלם מקומית — Customer service window:** זמן הודעת Meta המאומת
מועבר עד Runtime השליחה. זמן עתידי, זמן לא קנוני ורגע השווה בדיוק
ל־`occurredAt + 24h` נחסמים. Gate נוסף בודק שוב את הזמן אחרי Claim ומיד
לפני Provider I/O; Delivery שגלש מעבר לחלון נדחה מקומית בלי בקשת רשת.

4.2 **הושלם מקומית — Button continuation:** ‏`interactive/button_reply`
נקרא רק כאשר Option key הוא מפתח Domain תקין וכאשר `context.id` מצביע
ל־Provider message. ‏D1 ו־PostgreSQL דורשים התאמה ל־Delivery שהתקבל
ב־Meta, היה שייך להודעה הנכנסת הקודמת ולגרסת ה־Flow הפעילה. כותרת
הכפתור אינה מקור ההכרעה כאשר קיים Option key.

4.3 **הושלם בשכבת הליבה — Rate limiting:** ‏D1 ו־PostgreSQL מסווגים כל
Reservation כ־`business-initiated` או `service-reply`. תשובת שירות
משריינת אטומית את אותם Pair ו־Phone throughput scopes של קמפיין, אבל
אינה יוצרת Portfolio occupancy, אינה מפעילה Recipient in-flight ואינה
מורשית ליצור Marketing recipient cooldown. מפתחות ה־Provider scope
משותפים; מפתח ה־Reservation נגזר בנפרד ובאופן דטרמיניסטי.

4.4 **הושלם מקומית — Flow publication:** מודל הטיוטה הכללי ממשיך לאפשר
עד עשר אפשרויות וכותרת ארוכה יותר לצורך עריכה עתידית. עם זאת, פרסום
WhatsApp נכשל סגור אם Block כלשהו מכיל יותר משלושה Reply buttons או
כותרת באורך מעל 20 תווים. אותה בדיקה פועלת ב־D1 ובמסלול PostgreSQL/
Railway לפני Mutation. אין קיצוץ, פיצול או המרה שקטה ל־List message;
תמיכת List תתווסף בעתיד כחוזה מפורש ונפרד.

4.5 **הושלם בשכבת ה־Persistence — Durable deferral:** ‏D1 ו־PostgreSQL
שומרים `nextAttemptAt`, זמן וסיבת דחייה מוגבלת, Sender Phone Number ID
ו־`claimVersion`. ‏Claim מוקדם מחזיר `deferred`; סריקת Due מחזירה עבודה
בסדר דטרמיניסטי; Claim חוזר מגדיל Fence, ולכן Worker ישן אינו יכול לבצע
Settlement. ‏Retry חייב להתרחש לפני סוף חלון השירות.

4.6 **הושלם מקומית — Worker composition:** מסלול Railway/BullMQ מחבר את
Resolver המדיניות, גזירת מפתחות HMAC ו־`reserveServiceReply` מיד לפני
Provider I/O. ‏Pair/Phone/Provider cooldown זמני נכתב כ־Deferral עמיד.
ה־Scheduler סורק Due deliveries תחת Lease מגודר ומוסר אותן ישירות
מה־Outbox בלי להפעיל שוב Webhook או Flow. צפייה ב־Claim פעיל מחזירה
`in-progress` ואינה מסמנת Worker אחר כעמום ואינה שולחת שוב.

4.7 **הושלם מקומית — Telemetry:** כל ניסיון Processor נרשם כאירוע
`delivery-attempt/bot-reply`. בקשת Meta מקושרת כ־Child timing מסוג
`bot-reply.send`. החוזה אינו מאפשר Tenant, טלפון, תוכן, Payload, מזהה
Delivery או Token.

4.8 **הושלם מקומית — Provider-status settlement:** Acceptance של Graph
API מוכיח רק קבלה לביצוע ואינו מוכיח Delivery. לכן אותו Transaction
יוצר רשומת Evidence בלתי־ניתנת לשינוי המקשרת בין `deliveryKey`,
`providerMessageId` ו־`reservationKey`, ומעביר את ה־Bot delivery מ־
`sending` ל־`accepted`; הוא אינו מסמן אותו `delivered` בזמן ה־POST.

4.8.1 ‏Status webhook מחפש במקביל יעד מסוג Message, ‏Campaign delivery
או Bot reply. עבור Bot, אירועי `sent`, ‏`delivered`, ‏`read` ו־`failed`
מתקדמים לפי זמן ודרגה. Replay זהה הוא Idempotent, אירוע ישן אינו מחזיר
מצב אחורה, וזהות אירוע או תוצאה טרמינלית סותרות נכשלות סגור.

4.8.2 אירוע `delivered` או `failed` הראשון סוגר אטומית את ה־Reservation
המדויק כ־`delivered` או `provider-failed`. אירוע `read` מאוחר משפר את
מצב הספק בלי לשנות את זמן ה־Settlement הראשון. החוזה וה־Triggers זהים
ב־D1 וב־PostgreSQL, והעברת הנתונים משתמשת בחוזה v2 בן תשע טבלאות.

4.8.3 **הושלם מקומית — Failure evidence ו־Cooldown:** אירוע `failed`
מחייב מערך `errors` תחום עם קוד מספרי יחיד ועקבי. רק הקוד עובר ל־
Reconciler; ‏`title`, ‏`message` ו־`error_data.details` של Meta אינם נשמרים
ואינם נכנסים ל־Telemetry. אירוע שאינו `failed` ובכל זאת מכיל `errors`,
אירוע כשל ללא קוד או מערך עם קודים סותרים נכשל סגור.

4.8.4 ‏Status webhook טרמינלי לעולם אינו מחזיר Delivery שכבר התקבל אל
תור השליחה. הוא גם אינו ממציא `Retry-After` או Pair exponent שאינם קיימים
ב־Status payload. ‏Cooldown עמיד נוצר רק בזמן דחיית Graph מפורשת: `130429`
דורש `Retry-After` מספרי של 1–86,400 שניות, ו־`131056` משתמש ב־`4^X`
כאשר `X` נגזר ממספר הניסיון העמיד. `131049` חסום עבור Service reply.
Cooldown ו־Settlement מסוג `provider-failed` נכתבים אטומית לפני שה־Outbox
עובר ל־Deferred; כשל באחת הפעולות משאיר את ה־Delivery ללא Retry אוטומטי.

4.9 **Live evidence:** נדרשים WABA/Phone מורשים, Token מוצפן, Staging,
שליחת Text, לחיצה על Button, Status webhooks, כשל 131047, ‏Retry-After
חי, מגבלת Pair,
Kill switch וראיית שאין שליחה כפולה.

4.10 **הושלם מקומית — חוזה Evidence:** ‏
`BOT_REPLY_STAGING_EVIDENCE_JSON` מתקבל רק כחוזה v1 סגור וקצר־חיים של עד
24 שעות. הוא נקשר ל־Release ID, ‏Commit SHA ו־Artifact digest המדויקים,
ולכן ראיה מגרסה קודמת או מ־Build אחר אינה יכולה לשמש את השער הנוכחי.

4.10.1 החוזה דורש שבעה תרחישים בסדר קבוע: Text, ‏Button, ‏Button reply,
שלושת מצבי ה־Status ו־Customer-window expiry עם קוד `131047`. בנוסף הוא
דורש Throughput שנקרא מ־Graph API, דחיית `130429` עם `Retry-After` אמיתי,
Pair limit מסוג `131056`, ‏Kill switch עם אפס Provider requests, מסירת
Queue כפולה שהובילה ל־Provider POST יחיד, Credential Vault ואפס ממצאי
Redaction.

4.10.2 החוזה אינו מכיל Tenant, ‏WABA ID, ‏Phone Number ID, ‏App ID,
Token, Payload או תוכן הודעה. זהויות נכס ותרחיש נשמרות רק כ־SHA-256
fingerprints נפרדים. Fields נוספים, Fingerprints כפולים, Observation ישן,
תוקף עתידי או ארוך מדי, Digest שונה וערך Throughput שאינו 20/80/1,000
נכשלים סגור.

4.10.3 ‏Production Readiness דורש גם Evidence במצב `configured` וגם את
`botReplyDeliveryAdapter=true`. הדגל נשאר `false`: JSON תקין לבדו אינו
פותח את השער, ומימוש מקומי לבדו אינו פותח אותו ללא ניסוי WABA חי.

4.10.4 ‏Production Release Gate מפעיל בנוסף את
`npm run verify:bot-reply-staging-evidence`. המאמת קורא רק את
`.artifacts/bot-reply-staging-evidence.json` דרך מנגנון Trusted file
שחוסם Symbolic links, בעלות זרה, יותר מ־Hard link יחיד והרשאת כתיבה ל־
Group או Others. תוכן הקובץ חייב להיות זהה byte-for-byte ל־
`BOT_REPLY_STAGING_EVIDENCE_JSON` של ה־Runtime; גם Newline שונה גורם
לכשל. השער המקומי אינו דורש קובץ חיצוני ולכן ממשיך לבדוק את הקוד בלי
לייחס לו ראיית WABA.

4.10.5 **הושלם מקומית — Live-driver safety core:** פעולת Railway
אופציונלית בשם `system-admin.bot-reply-staging.run` דורשת System Admin,
מכסה, Idempotency ו־Confirmation מפורש. היא חוסמת כל Environment שאינו
Staging, ‏Tenant שאינו ברשימה השרתית, Kill switch, גרסה שונה, נמען ללא
Opt-in, ‏Vault שאינו מוצפן ותרחיש Rate-limit שלא אושר בתוקף על ידי טל.
התוצאה הציבורית אינה כוללת Receipt, ‏Proof, מזהה ספק או מידע אישי.

4.10.6 פעולת Railway אינה נרשמת ב־Runtime ללא Driver מפורש. מימוש
PostgreSQL/BullMQ העמיד, ‏Queue handoff, ‏Scenario executor ורוב Producers
הושלמו מקומית. עדיין חסרים Kill-switch Producer, ‏Graph/Security readers,
תצורת Railway/WABA חיה ו־Evidence חתום; לכן אין עדיין Receipt חי ודגל
ה־Adapter נשאר `false` ללא תצורה מפורשת.

## 5. בדיקות מקומיות

5.1 הבדיקות מכסות Text, ‏Interactive buttons, גבולות 3/20, מבנה סגור,
Scope של Tenant/Phone, Credential failure, שגיאת חלון שירות, Timeout,
HTTP 5xx, Acceptance פגומה ו־Telemetry ללא מידע עסקי. הן מכסות גם את
שני גבולות חלון 24 השעות, סגירה בין Claim לשליחה, Replay, ‏Context ID
מדויק, Option key לא תואם ו־D1/PostgreSQL parity. שכבת ה־Admission
מכסה גם הפרדת Reservation classes, שיתוף Pair/Phone, אי־צריכת Portfolio,
חסימת Marketing cooldown ל־Service reply, Idempotency ומפתחות HMAC
משותפים ללא מזהה אקראי. ‏Outbox tests מוכיחים גם Early claim חסום,
Due scan, ‏Retry claim, Fence חדש ודחיית Settlement מ־Worker ישן. בדיקות
ה־Worker מוכיחות גם דחיית Dependency לפני I/O, מסירה מתוזמנת ללא הרצת
Flow חוזרת, אי־דריסת Claim פעיל וחוזה Telemetry מוגבל. בדיקות Publication
מוכיחות שגבולות 3/20 מתקבלים וש־4 כפתורים או 21 תווים נחסמים ללא
Repository mutation. בדיקות Status
מוכיחות גם קישור מדויק ל־Reservation, חילוץ קוד כשל ללא טקסט ספק,
דחיית Status errors סותרים, ‏Replay, ‏Stale event, מעבר
Delivered→Read, סתירת Terminal, בידוד Tenant וזהות Provider בלתי־ניתנת
לשינוי.

5.2 מעבר הבדיקות מוכיח את חוזה הקוד המקומי בלבד. הוא אינו מוכיח הרשאת
Meta, חלון שירות חי, Capacity, Delivery או Read receipt אמיתיים.

5.3 בדיקות חוזה ה־Evidence מכסות מבנה סגור, Release mismatch, תפוגה,
Observation ישן, Digest ששונה, שדות זהות גולמיים, מגבלות מומצאות, חשיפת
Credential, ‏Kill switch שדלף אל הספק ושליחה כפולה. הן מוכיחות גם את
שער שני המפתחות; אינן מייצרות או טוענות לקיומה של ראיה חיה.

5.4 בדיקות Trusted-file מכסות קובץ תקין, Symbolic link, הרשאת כתיבה
מסוכנת, Runtime mismatch, ‏Release/Artifact mismatch, זמן עתידי, תפוגה,
קלט פגום, קובץ גדול מדי ותצורת CLI לא חוקית.

## 6. Receipt ל־Evidence

6.1 נוסף Builder סגור שמקבל Receipt מ־Runner, דורש התאמה ל־Release ול־
Artifact ומפיק Evidence שתוקפו 24 שעות. ‏Receipt עתידי או בן יותר משעה
נדחה.

6.2 Proofs גולמיים של נכסים ותרחישים עוברים Hash ואינם נשמרים ב־
Evidence. ‏CLI בשם `npm run evidence:bot-reply-staging` קורא Receipt
מהימן וכותב קובץ חדש בהרשאות `0600`; הוא אינו דורס קובץ קיים.

6.3 הוראות ההפעלה והגבול החסר של Live driver נמצאים ב־
`docs/meta-bot-reply-staging-runner.md`.
