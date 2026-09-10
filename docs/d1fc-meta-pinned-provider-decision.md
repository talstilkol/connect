# D1f-C — החלטת Meta Pinned Provider

תאריך החלטה: 2026-08-26
מצב: `GO` למתאם רדום; `NO-GO` לחיבור Runtime או לשליחה חיה

1. החלטה

   1.1 Connect תשתמש ב־WhatsApp Cloud API הרשמי של Meta בלבד.

   1.2 גרסת Graph המאושרת לשלב זה היא `v25.0` בלבד. המתאם ידחה כל גרסה אחרת. אין שימוש ב־`latest`, ושדרוג גרסה יחייב שינוי קוד, בדיקות Staging, עדכון Digest וביקורת חוזרת.

   1.3 נקודת הקצה היחידה היא:

   ```text
   POST https://graph.facebook.com/v25.0/{PHONE_NUMBER_ID}/messages
   ```

   1.4 ה־Access token יישלח רק בכותרת `Authorization: Bearer ...`. הוא לא ייכלל ב־URL, בגוף, בלוגים או ב־Error messages.

   1.5 המתאם יהיה One-shot: מופע יחיד רשאי להפעיל פעם אחת בלבד את יכולת ה־Transport שנקשרה אליו. כל עוד ה־Transport הוא Callback מוזרק, עובדה זו אינה מוכיחה לבדה שבוצע ניסיון HTTP בסיסי יחיד.

   1.6 אין Retry אוטומטי בתוך המתאם. לא נמצא חוזה Idempotency רשמי ל־Messages API, ולכן ניסיון חוזר אחרי תוצאה לא ודאית עלול ליצור הודעה כפולה. לפני Activation נדרש Trusted transport שמוכיח שגם מתחת למתאם אין Retry נסתר.

2. חוזה זמן וביטול

   2.1 המתאם יקבל את אותו `AbortSignal` שה־Pinned driver יצר ויעביר אותו ללא Wrapper אל `fetch`.

   2.2 מיד לפני `fetch` הוא יאמת:

   ```text
   0 < sendBefore - now <= 15,000ms
   ```

   2.3 חמש־עשרה שניות הן מדיניות בטיחות של Connect, לא מגבלה ש־Meta פרסמה.

   2.4 Timeout,‏ Abort,‏ Network error,‏ HTTP `5xx`, תגובת JSON פגומה או תגובת הצלחה ללא `wamid` תקין הם `unknown outcome`. אין לבצע בעקבותיהם שליחה חוזרת אוטומטית.

3. תוצאה ודאית

   3.1 רק HTTP `200` עם `messaging_product: "whatsapp"`, מערך `messages` יחיד ו־`messages[0].id` שמתחיל ב־`wamid.` ייחשב `accepted`.

   3.2 `accepted` מוכיח ש־Meta קיבלה את הבקשה, לא שההודעה נמסרה. סטטוסים `sent`,‏ `delivered`,‏ `read` ו־`failed` ייקלטו בנפרד דרך Webhook.

   3.3 גוף תגובת Meta ייקרא כ־Stream עם תקרה של `65,536` bytes. גוף גדול יותר ייחשב תוצאה לא ודאית ולא יישמר.

4. Rate limits ו־Error mapping

   4.1 `130429` הוא Phone throughput limit. הוא יומר ל־`sender-deferred` רק כאשר Meta החזירה `Retry-After` מספרי בטווח `1..86,400` שניות. Header חסר או לא תקין אינו היתר להמציא זמן Retry.

   4.2 `131056` הוא Sender–Recipient pair limit. זמן ההמתנה יהיה `4 ** X`, כאשר `X` הוא `pairFailureExponent` עמיד בטווח `0..8`. אסור להפיק אותו ממונה בזיכרון של Process.

   4.3 `131047` יומר ל־`service-window-rejected`. מחוץ לחלון שירות הלקוח יש להשתמש רק ב־Template מאושר.

   4.4 `131048`,‏ `131057`,‏ `4`,‏ `80007`, שגיאות Authentication/Permission וכל קוד אחר אינם ניתנים להמרה לעובדה מתוך החוזה הצר הנוכחי. הם יישארו Fail-closed וידרשו מסלול תפעולי מתאים.

   4.5 אין לקבע בתור מצב חשבון את ערכי ה־throughput של `20`,‏ `80` או `1,000` הודעות לשנייה. לפני Activation יש לקרוא Evidence חי מ־Meta ולשמור אותו במדיניות המאושרת.

5. פרטיות

   5.1 מותר לשמור רק Outcome מצומצם, HTTP class/status, קוד Meta, זמן תגובה ו־`wamid` במאגר הראיות המורשה.

   5.2 אסור לכתוב ללוג Access token,‏ Authorization header, תוכן הודעה, מספר נמען, Phone Number ID,‏ WABA ID, גוף Request/Response גולמי או `error_data.details` גולמי.

6. חסמי P0 לפני Activation

   6.1 **Provider binding חסר:** ה־Proof הנוכחי מעביר ל־Provider רק `sendBefore`. אין Digest שמוכיח שה־Token, גרסת Credential,‏ Phone Number ID, הנמען וה־Payload שנקשרו למתאם הם אותם נתונים שאושרו על־ידי ה־Permit.

   6.2 נדרש `providerBindingDigest` קנוני שייגזר במסד מ־Delivery payload, נכסי Meta, גרסת Credential וגרסת Graph; יוחזר מה־Proof; ויושווה במתאם לפני `fetch`.

   6.3 **Acquisition provenance חסר:** `pg_locks` מוכיח ש־Lock מוחזק, אך לא שה־Lock נרכש דרך פעולת `acquire` המאושרת. נדרש Capability נוסף ומוגן יחד עם Runtime identity ו־Direct-DML denial.

   6.4 **Credential-by-revision חסר:** ה־Vault הקיים טוען Credential לפי Tenant. לפני Activation הוא חייב לטעון בדיוק את Revision וה־Envelope digest שנקשרו ל־Permit.

   6.5 אין Named production grants ואין Runtime importer מאושר למתאם. ה־Source Guard חייב להפיל כל ניסיון חיבור מוקדם.

   6.6 **Trusted transport חסר:** `fetchImplementation` הוא Callback מוזרק. המתאם מגביל את מספר ההפעלות שלו לאחת, אך Callback עוין יכול לבצע בתוכו כמה ניסיונות HTTP. לפני Activation ה־Production factory לא יקבל Callback שרירותי: הוא יחויב ליכולת Transport ממותגת, מקובעת ומאומתת שמבצעת ניסיון בסיסי יחיד וללא Retry.

   6.7 לכידת Web intrinsics בזמן טעינת המודול מגינה מפני החלפת `Response`,‏ `Headers`,‏ `ReadableStream` ו־`AbortSignal` לאחר הטעינה; היא אינה תחליף ל־Trusted transport שבסעיף 6.6.

7. תנאי קבלה ל־D1f-C

   7.1 Factory ללא Network I/O, ללא Environment וללא Global fetch.

   7.2 Payload של Text ו־Buttons נבנה מקלט קנוני ומצומצם בלבד.

   7.3 `sendBefore`,‏ One-shot של יכולת ה־Transport, אותו `AbortSignal` ו־Origin קבוע מוכחים בבדיקות שליליות. ניסיון HTTP בסיסי יחיד הוא תנאי Activation נפרד לפי סעיף 6.6.

   7.4 כל תגובה נקראת באופן מוגבל; אין חשיפת Secrets; אין Retry; אין Randomness.

   7.5 הקובץ מקובע ב־SHA-256 בתוך Source Guard ונשאר עם אפס Importers של Production.

   7.6 השלמת סעיף 7 אינה מסירה את חסמי סעיף 6.

8. מקורות רשמיים

   8.1 [Meta — Send messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)

   8.2 [Meta — WhatsApp error codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes)

   8.3 [Meta — Platform and pair rate limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform#rate-limits)

   8.4 [Meta — Throughput](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput)

   8.5 [Meta official Postman — Send text message](https://www.postman.com/meta/whatsapp-business-platform/request/8gvd47s/send-text-message)

   8.6 [Meta official Postman — Message status notifications](https://www.postman.com/meta/whatsapp-business-platform/request/rgtfq23/message-status-update-notifications)

9. מגבלת המחקר

   9.1 דפי Meta Developers החזירו HTTP `429` בחלק מקריאות האימות האוטומטיות. `v25.0` מופיעה בדוגמת השליחה הרשמית הנוכחית, אך דף Changelog לא אומת באופן מלא. לכן נדרש אימות Changelog נוסף לפני Staging חי.

   9.2 לא נמצא תיעוד שמבטיח `Retry-After` עבור `130429`, Idempotency key עבור Send Message או Timeout שרתי קבוע. המימוש לא יניח שאחד מהם קיים.
