# מגבלות WhatsApp ו־Rate Limiting

תאריך אימות: 2026-08-16

Owner: **טל — מחקר ופיתוח**

## 1. מטרת המסמך ומקור האמת

1.1 זהו Baseline הנדסי למגבלות המשפיעות על שליחת הודעות, קמפיינים
ובוטים דרך WhatsApp Business Platform.

1.2 סדר מקורות האמת הוא:

1.2.1 תיעוד Meta הרשמי העדכני.

1.2.2 מצב ה־Business Portfolio, ‏WABA, המספר וה־Templates כפי שהוא
נקרא מ־API או מ־WhatsApp Manager בחשבון המורשה.

1.2.3 מדיניות Connect, שחייבת להיות מחמירה לפחות כמו מגבלת Meta.

1.3 תיעוד Meta אינו מציג Revision date. ‏2026-08-16 הוא מועד
האימות שלנו, לא תאריך הפרסום של Meta.

1.4 ערך שאינו מפורסם או שלא נקרא מחשבון אמיתי יסומן
`unknown/unavailable`. אין לקודד ערך משוער כמגבלת ספק.

## 2. Throughput לכל מספר עסקי

2.1 מספר Cloud API רשום תומך כברירת מחדל בעד **80 הודעות לשנייה**.

2.2 הספירה כוללת יחד הודעות נכנסות ויוצאות ואת כל סוגי ההודעות.
מדיניות Connect היא לא להקצות את מלוא הקיבולת לתעבורת Bot יוצאת.

2.3 מספר שמשמש במקביל את WhatsApp Business app ואת Cloud API
מוגבל ל־**20 הודעות לשנייה**.

2.4 מספר זכאי משודרג אוטומטית וללא תשלום לעד **1,000 הודעות
לשנייה**.

2.5 תנאי הזכאות ל־1,000:

2.5.1 ל־Business Portfolio יש Messaging limit מסוג `Unlimited`.

2.5.2 המספר שימש לשליחה אל לפחות 100,000 משתמשי WhatsApp ייחודיים
מחוץ לחלון השירות, בתוך חלון נע של 24 שעות.

2.5.3 איכות המספר היא לפחות `YELLOW`/Medium.

2.6 השדרוג יכול להשבית את המספר עד דקה. בזמן זה Meta עשויה להחזיר
`131057`. חריגה מה־Throughput הפעיל מחזירה `130429`.

2.7 יש לקרוא את רמת ה־Throughput הפעילה באמצעות Phone Number API;
אסור להסיק אותה מהיקף התוכנית או מהיקף תעבורה קודם.

2.8 עבור Media בתעבורה גבוהה, Meta ממליצה להעלות את הקובץ מראש
ולהשתמש ב־Media ID. שימוש ב־URL חיצוני עלול להגביל את היכולת לנצל
Throughput גבוה, אלא אם מנגנון ה־Caching המתאים זמין ומאומת.

## 3. Pair rate — אותו שולח ואותו נמען

3.1 מספר עסקי יכול לשלוח לאותו משתמש בממוצע **הודעה אחת בכל שש
שניות**: כ־10 בדקה או 600 בשעה.

3.2 Meta מאפשרת Burst של עד 45 הודעות בתוך שש שניות, אך ה־Burst
לווה מהמכסה העתידית. לדוגמה, Burst של 20 הודעות דורש בערך שתי דקות
המתנה לפני שליחה נוספת לאותו משתמש.

3.3 Connect לא ישתמש ב־Burst כברירת מחדל. שיחה של Bot תעבור Queue
סדרתית לפי Sender+Recipient כדי לשמור סדר ולהימנע מספאם.

3.4 חריגה מחזירה `131056`. ניתן להמשיך לשלוח לנמענים אחרים.

3.5 המלצת Meta ל־Retry לאחר כשל Pair היא המתנה של `4^X` שניות,
כאשר `X` מתחיל ב־0 וגדל בכל כשל נוסף.

## 4. Messaging limit — נמענים ייחודיים

4.1 המגבלה היא מספר משתמשי WhatsApp ייחודיים שאליהם נמסרה הודעה
מחוץ לחלון השירות, בתוך חלון נע של 24 שעות.

4.2 המגבלה מחושבת ברמת ה־Business Portfolio ומשותפת לכל המספרים
שבו. מספר יחיד יכול לצרוך את כל המכסה.

4.3 הדרגות הנוכחיות הן:

4.3.1 Portfolio חדש: **250**.

4.3.2 דרגה שנייה: **2,000**.

4.3.3 דרגה שלישית: **10,000**.

4.3.4 דרגה רביעית: **100,000**.

4.3.5 דרגה עליונה: **Unlimited**.

4.4 ניתן להגיע ל־2,000 באמצעות Business verification, ‏Partner
verification, או מסירת 2,000 הודעות למשתמשים ייחודיים מחוץ לחלון
השירות בתוך 30 ימים נעים, באמצעות Templates באיכות גבוהה. Meta עדיין
מאשרת או דוחה את ההגדלה לפי איכות ההודעות.

4.5 לאחר הגעה ל־2,000, Meta מעלה דרגה אחת בתוך עד שש שעות כאשר:

4.5.1 ההודעות בכל המספרים וה־Templates הן באיכות גבוהה.

4.5.2 בשבעת הימים האחרונים נוצלה לפחות מחצית מהמגבלה הפעילה.

4.6 השדה הישן `messaging_limit_tier` הוצא משימוש. יש לקרוא את
`whatsapp_business_manager_messaging_limit`.

## 5. חלון שירות, Opt-in וסוג הודעה

5.1 הודעה נכנסת של משתמש פותחת Customer service window נע של 24
שעות. כל הודעה נוספת מאותו משתמש מאפסת את החלון.

5.2 בתוך החלון ניתן לשלוח Service messages חופשיות. מחוץ לחלון
מותר לשלוח רק Template מאושר.

5.3 נדרש Opt-in לפני שליחה. האדם חייב למסור מספר נייד ולהסכים
לקבלת הודעות או שיחות מהעסק המסוים; דרך ההסכמה חייבת לעמוד בדין
החל.

5.4 Connect ישמור Consent scope ו־Opt-out לפי קטגוריית הודעה.
בקשת Opt-out חוסמת שליחות נוספות מהקטגוריה המתאימה.

5.5 `131047` מציין ניסיון לשלוח Free-form message מחוץ לחלון.
התגובה היא שימוש ב־Template מתאים, לא Retry של אותה הודעה.

## 6. מגבלות Templates

6.1 ניתן ליצור לכל היותר **100 Templates בשעה** בכל WABA.

6.2 Portfolio לא מאומת מוגבל ל־**250 Templates לכל WABA**.

6.3 Portfolio מאומת, שבו לפחות WABA אחד כולל מספר עם Display name
מאושר, מאפשר עד **6,000 Templates לכל WABA**.

6.4 Template חייב להיות `APPROVED` לפני שליחה. קטגוריות התמיכה הן
Authentication, ‏Marketing ו־Utility.

6.5 דירוגי האיכות הם `GREEN`, ‏`YELLOW`, ‏`RED` ו־`UNKNOWN`.
Template באיכות נמוכה יכול להישאר זמנית במצב `ACTIVE`, אך הוא נמצא
בסיכון לעבור ל־`PAUSED` או `DISABLED`.

6.6 כאשר Meta מעבירה Template באיכות נמוכה ל־`PAUSED`, מחזורי
האכיפה הם:

6.6.1 אירוע ראשון: Pause לשלוש שעות.

6.6.2 אירוע שני: Pause לשש שעות.

6.6.3 אירוע שלישי: Disabled.

6.7 ניסיון לשלוח Template במצב Paused נדחה, אינו מחויב ואינו נספר
ב־Messaging limit. ‏`132015` מציין Paused ו־`132016` מציין Disabled.

6.8 Template pacing חל על Marketing ו־Utility. Templates חדשים,
כאלה שחזרו מ־Pause או כאלה שאינם `GREEN` עשויים להיכנס ל־Pacing.

6.9 סף ה־Pacing אינו מפורסם. לאחר הסף הודעות יכולות לקבל
`held_for_quality_assessment`. איכות טובה תשחרר אותן; איכות נמוכה
תפיל אותן עם `132015` ותעצור את ה־Template.

## 7. מגבלת Marketing לכל משתמש

7.1 Meta מפעילה מגבלה דינמית על מספר הודעות Marketing שמשתמש יכול
לקבל מכלל העסקים. המספר עצמו אינו מפורסם.

7.2 המגבלה משתנה לפי Read rate עדכני ופעילות ה־Inbox של המשתמש.
אין לנסות לחשב או לעקוף אותה.

7.3 כל Marketing template שנמסר נספר. אם המשתמש מגיב ונפתח חלון
שירות, הודעות Marketing שנשלחות בתוך החלון אינן נספרות למגבלה זו.

7.4 `131049` מחייב המתנה של לפחות 24 שעות לפני ניסיון נוסף לאותו
משתמש. ניסיונות חוזרים בתוך 24 שעות עלולים לחסום שליחה אליו לעד 24
שעות נוספות.

7.5 `131050` מציין שהמשתמש ביקש להפסיק Marketing מהעסק. אין לבצע
Retry ואין לשלוח אליו Marketing נוסף עד שינוי Preference מאומת.

7.6 Meta אינה מוסרת כרגע Marketing templates למספרי ארצות הברית
בעלי קידומת `+1` ו־US area code.

7.7 מגבלת Per-user marketing אינה פעילה כרגע כאשר המספר העסקי
השולח נמצא ב־EEA, בריטניה, יפן או דרום קוריאה, או כאשר הנמען נמצא
באחד מאזורים אלה. יש לאמת מחדש לפני כל השקה אזורית.

## 8. איכות והגבלות התנהגותיות

8.1 איכות הודעה נמדדת לפי שבעת הימים האחרונים ומשוקללת לטובת מידע
חדש יותר.

8.2 אותות איכות ברמת המספר וההודעה כוללים Blocks, ‏Reports, ‏Mutes,
‏Archives וסיבות שהמשתמש מסר בעת חסימה.

8.3 איכות Template מביאה בחשבון גם Engagement ו־Read rate. אלה
שכבות איכות קשורות אך אינן אותו מדד.

8.4 במספר בעל תעבורה גבוהה האיכות יכולה להשתנות בתוך דקות.

8.5 `131048` מציין הגבלת מספר עקב איכות, Spam, Blocks או Flags.
Connect יעצור את הקמפיין וידרוש Review; אין לבצע Retry אוטומטי.

8.6 `131064` מציין אכיפה עקב סיווג Template שגוי. הוא חוסם גם
Template messages וגם Direct send messages למשך תקופת האכיפה.

8.7 Pacing, ‏Pause, ‏Quality restriction ו־Messaging limit הם
מנגנונים נפרדים. עמידה באחד אינה מבטיחה עמידה באחרים.

## 9. API request limits

9.1 ב־WABA management endpoints המוגדרים בתיעוד, ברירת המחדל היא
**200 בקשות בשעה לכל App+WABA**.

9.2 WABA פעיל עם לפחות מספר רשום אחד מאפשר **5,000 בקשות בשעה לכל
App+WABA** באותם Endpoints.

9.3 Credit Line API מוגבל ל־5,000 בקשות בשעה עבור ה־Endpoints
המפורטים בתיעוד.

9.4 אלו מגבלות Management API, לא Messaging throughput של
`POST /messages`.

9.5 `4` מציין App rate limit ו־`80007` מציין WABA request rate
limit. יש לכבד Header או זמן Retry כאשר Meta מספקת אותם.

9.6 Meta מציינת גם שכבות Test-message ו־Capacity rate limit, אך
בתיעוד הרשמי שנבדק לא פורסם עבורן סף מספרי נוסף. הערך יישאר
`unknown/unavailable` עד שמקור רשמי או מצב חשבון מורשה יספק אותו.

9.7 אם WhatsApp Flows ייכנס ל־Scope, יש לטפל גם ב־`132069`: Flow
במצב Throttled יכול להיחסם לאחר עשר הודעות שמשתמשות בו בשעה
האחרונה. Flows אינם חלק מ־Baseline המימוש הנוכחי, ולכן הוספתם דורשת
מחקר ואישור נפרדים של טל.

## 10. Delivery, Webhooks ו־TTL

10.1 תשובת `accepted` מ־Messages API מאשרת קבלת בקשה בלבד. מסירה
מוכחת רק באמצעות Status webhook.

10.2 סדר המסירה של כמה הודעות אינו מובטח. כאשר הסדר עסקי, יש
להמתין ל־`delivered` לפני שליחת ההודעה הבאה.

10.3 Meta ממליצה לתכנן Webhook capacity של פי שלושה מתעבורת
ההודעות היוצאות עבור Status events, ועוד פעם אחת התעבורה הנכנסת
הצפויה.

10.4 ברמת 1,000 הודעות לשנייה ו־30% תגובות, היעד הוא יכולת עיבוד
של 3,000 Status webhooks ועוד 300 הודעות נכנסות בשנייה.

10.5 יעד ה־Latency הרשמי לקליטת Webhooks הוא חציון של עד 250ms
ופחות מאחוז אחד מהבקשות מעל שנייה אחת.

10.6 Meta מנסה שוב Webhooks שלא נמסרו במשך עד שבעה ימים באמצעות
Exponential backoff. ה־Consumer חייב להיות Idempotent.

10.7 TTL ברירת המחדל הוא 30 ימים לכל הודעה שאינה Authentication
template, ועשר דקות ל־Authentication template. במקום שבו Meta
תומכת ב־Custom TTL עבור Authentication/Utility Templates או דרך
Marketing Messages API, מדיניות Connect היא לבחור את ה־TTL הקצר
ביותר שמתאים למטרה. אין להסיק מכך שניתן לשנות TTL לכל Service message.

## 11. מטריצת פעולות Connect לפי Error

11.1 `4`, ‏`80007`, ‏`130429` — Throttle ו־Retry מבוקר עם Backoff.

11.2 `131056` — עצירת Pair בלבד ו־`4^X` Backoff.

11.3 `131049` — Cooldown של 24 שעות לפחות לנמען Marketing.

11.4 `131050` — חסימת Marketing לנמען; ללא Retry.

11.5 `131047` — החלפת סוג הודעה ל־Template מאושר; ללא Retry זהה.

11.6 `131048`, ‏`131064` — Circuit breaker למספר או לקמפיין ו־Review
ידני.

11.7 `131057` — Maintenance זמני; Pause ו־Retry לאחר שהמספר חוזר.

11.8 `132015` — עצירת Template וקמפיינים תלויים.

11.9 `132016` — Template Disabled; אין Retry ויש ליצור תוכן מתוקן
ולעבור Approval מחדש.

11.10 ההחלטה תתבסס על `code` ו־`details` מה־Response או מה־Webhook,
לא על HTTP status או Title בלבד.

## 12. Business Portfolio pacing ואכיפת מדיניות

12.1 Meta פורסת Business Portfolio pacing בהדרגה. הוא עשוי לחול
כאשר כלל המספרים ב־Portfolio שלחו יחד פחות מ־500,000 הודעות Template
בתוך 365 ימים נעים, או כאשר מערכות הבקרה מזהות פעילות חשודה. התנאי
אינו מבטיח שהמנגנון כבר פעיל בחשבון מסוים.

12.2 בזמן Pacing, ‏Meta משחררת הודעות בקבוצות כדי למדוד משוב. אם
המשוב שלילי או שהפעילות מסווגת כחשודה, הודעות מוחזקות עשויות להיכשל
מאוחר יותר עם `135000`. ‏`held_for_quality_assessment` אינו Failure;
רק Status webhook מאוחר קובע אם ההודעה נמסרה או נכשלה. בזמן Review,
יצירת Templates ושליחה עלולות להיחסם; Disable מלא מותנה בממצא הפרה.

12.3 Pacing ברמת Portfolio שונה מ־Template pacing שבסעיף 6.8.
Connect חייב לעקוב אחר שני המצבים ולא לבצע Retry אגרסיבי של הודעות
מוחזקות.

12.4 מדרגות האכיפה המתועדות כוללות Warning, חסימה של שליחת
Templates והוספת מספרים למשך יום או שלושה ימים, וחסימה של כל סוגי
ההודעות והוספת מספרים למשך 5, 7 או 30 ימים.

12.5 אכיפה חמורה יכולה להוביל לחסימה בלתי מוגבלת עד Appeal או
להשבתה קבועה. Connect יעצור שליחה אוטומטית מיד עם אירוע אכיפה ולא
ינסה לעקוף את ההגבלה באמצעות מספר, Template או App אחר.

12.5.1 הפרות חמורות, לרבות Scams, טרור, ניצול ילדים או מכירת סמים
בלתי חוקיים, עשויות להוביל ל־Offboarding מיידי ללא מדרגות מקדימות.

12.6 יש לצרוך `account_update` Webhooks ולהציג לבעל החשבון את סוג
האכיפה, ה־Scope ונתיב ה־Appeal. ‏Meta מציינת שסקירת Appeal נמשכת
בדרך כלל 24–48 שעות, אך לא כל החלטת Spam ניתנת לערעור.

## 13. מגבלות Bot ו־AI

13.1 בתוך חלון השירות ניתן לשלוח תשובות אוטומטיות חופשיות במסגרת
WhatsApp Business Messaging Policy, עם דרך ברורה ומהירה להסלמה לנציג
אנושי. מחוץ לחלון ניתן לבצע Automation רק באמצעות Template מאושר,
לאחר Opt-in מתאים.

13.2 לפי WhatsApp Business Solution Terms, ספק AI יכול לשמש
Third Party Service Provider של העסק רק לפי הוראות העסק, למטרה
המבוקשת, תחת הסכם כתוב ואמצעי אבטחה מתאימים.

13.3 אסור לאפשר ל־WhatsApp Business Solution Data ליצור, לפתח,
לאמן או לשפר מערכת או מודל AI כלשהם, גם לא בצורה אנונימית, מצטברת או
נגזרת, בכפוף רק לחריג המצומצם שבסעיף 13.4.

13.4 מותר לבצע Fine-tuning עבור מודל לשימושו הבלעדי של העסק רק אם
הנתונים אינם משמשים ליצור, לאמן או לשפר שום מודל אחר. בנוסף לתנאי
Meta, ‏Connect דורשת לפני שימוש כזה אישור משפטי, DPA, ‏Data-flow
מתועד ובקרת מחיקה.

13.5 מוצר AI כללי שבו ה־AI הוא הפונקציה הראשית כפוף להגבלות
מיוחדות של Meta, עם חריג למשתמשים שמספריהם רשומים בקידומת EEA או
ברזיל. ההכרעה אם AI הוא Primary או רק Incidental/Ancillary נתונה
לשיקול דעת Meta. תכנון Connect כפתרון עסקי ממוקד שבו AI הוא רכיב עזר
מפחית סיכון, אך אינו Safe harbor או אישור תאימות.

13.6 דף WhatsApp Business Solution Terms הציג בעת הבדיקה
`Last Modified: March 6, 2026`. תנאי WhatsApp יכולים להשתנות; טל
חייב לבצע Review מתוארך של התנאים ושל מדיניות ההודעות לפני Pilot
ולפני כל Production release. בנוסף, Meta הודיעה שתנאים מעודכנים
ייכנסו לתוקף ב־23 בספטמבר 2026; נדרש Review נוסף לא יאוחר מתאריך זה.

## 14. ארכיטקטורת Rate Limiter המומלצת ל־Connect

14.1 זהו Design proposal של Connect, לא מגבלת Meta רשמית.

14.2 לפני Queue publication:

14.2.1 אימות Consent, ‏Opt-out, חלון שירות ו־Template eligibility.

14.2.2 Reservation אטומי משותף ברמת Portfolio עבור
Unique-recipient rolling quota, כדי שמספרים מקבילים לא יצרכו מכסה
מעבר למותר. ה־Reservation אינו הוכחת מסירה.

14.2.3 בדיקת Phone throughput לפי הרמה שנקראה בזמן אמת.

14.2.4 בדיקת Marketing cooldown ו־Country rules.

14.3 בתוך Queue:

14.3.1 Token bucket נפרד לכל מספר עסקי עם Headroom לתעבורה נכנסת.

14.3.2 Queue סדרתית לכל Sender+Recipient בקצב שאינו גבוה מהודעה
אחת בשש שניות.

14.3.3 Transactional claim ו־Idempotency key לפני קריאה ל־Meta.

14.4 לאחר Response/Webhook:

14.4.1 Error action לפי סעיף 11.

14.4.2 Circuit breaker ל־Template, מספר או קמפיין לפי Scope השגיאה.

14.4.3 Kill switch ידני שיכול לעצור Campaign בלי למחוק State.

14.4.4 Alerts על Quality downgrade, ‏Pacing, ‏Pause, ‏131048,
131049, ‏131064 וחריגת Queue backlog. ‏`phone_number_quality_update`
עם `THROUGHPUT_UPGRADE`, ‏`business_capability_update` ו־`account_update`
משמשים Trigger לקריאה חוזרת מה־API, לא כמקור יחיד לערך החי.

14.4.5 Reconcile של Portfolio reservation לפי `delivered` או
`failed` Webhook; ‏`accepted` לבדו אינו מעדכן שימוש סופי.

14.5 אין לקבע Internal throughput מספרי לפני שטל מאמת את נתוני
ה־Load test, התעבורה הנכנסת וה־Tier החי, דוד מאשר את התאמת המימוש,
ואבטחה ומוצר מאשרים את ה־Headroom כמדיניות.

14.6 `server/meta/metaMessageFailurePolicy.ts` מממש Decision engine
קשיח לקודי Throttling ואכיפה. הוא דורש Signal מצומצם, מסרב להמציא
Retry delay ומחזיר Defer, ‏Pause, ‏Block, ‏Circuit break או Manual
review. המנוע עצמו אינו משנה Campaign state ואינו שולח הודעה.

14.7 `db/whatsappRateLimitRepository.ts` ומיגרציה `0030` מממשים את
שכבת ה־Reservation האטומית עבור הודעה Business-initiated:

14.7.1 State של `Sender+Recipient` נאכף גלובלית לפי מפתחות אטומים
לחלון שמרני של שש שניות ללא Burst.

14.7.2 State של `Portfolio+Recipient` משותף לכל Tenant של Connect,
כדי שחיבור אותו Business Portfolio במספר Workspaces לא יפצל את
המכסה של Meta.

14.7.3 Reservation ו־Settlement נשמרים כראיות Immutable. מצב
`delivered` מעדכן את חלון 24 השעות; `provider-failed` או
`cancelled-before-submit` משחררים Reservation מתאים. אירוע מאוחר
אינו מוחק Reservation חדש יותר.

14.7.4 D1 מקבל רק Portfolio tiers רשמיים או `unlimited` מפורש,
אינו שומר מספר טלפון או Provider payload, ודוחה State שאין לו
Reservation/Settlement proof תואם.

14.7.5 זהו עדיין רכיב Persistence ללא Provider adapter חי וללא
WABA/Throughput tier מאומת. לפיכך אין לראות בו Rate limiter מלא או
Production evidence.

14.8 `CampaignDeliveryAdmissionController` מחובר כעת לפני Claim של
נמען ב־Campaign Queue:

14.8.1 תוצאה `reserved` בלבד מאפשרת מעבר מ־`queued` ל־`sending`
וקריאה ל־Provider. מפתח ה־Reservation מועבר ל־Delivery processor.

14.8.2 תוצאה `deferred` משאירה את הנמען `queued` ומבצעת Retry בלי
קריאה ל־Provider. ‏Delay שאינו מספר שלם חיובי או גדול מ־86,400
שניות נדחה סגור, בהתאם ל־[Cloudflare Queues JavaScript API](https://developers.cloudflare.com/queues/configuration/javascript-apis/).

14.8.3 Skip, ‏Duplicate או כשל D1 לפני Submit משחררים את
ה־Reservation כ־`cancelled-before-submit`. דחיית Provider מפורשת
נרשמת כ־`provider-failed`; תוצאה חיצונית לא ידועה נשארת
`sending` ללא Retry אוטומטי.

14.8.4 ה־Runtime בונה את ה־Admission adapter מעל
`WhatsappRateLimitRepository` של אותו D1. ה־Worker עדיין מזריק
Context Resolver מושבת שנכשל סגור, ולכן אי־אפשר לעקוף את שכבת
ה־Reservation באמצעות Controller חלופי בזמן פריסה.

14.8.5 ה־Adapter ממפה Pair lock ו־Recipient in-flight ל־Delay
הנגזר מ־`retryAt`, ודוחה Timestamp עבר או Delay גדול מ־24 שעות.
Portfolio מלא נדחה בחלון שמרני של 24 שעות ורק כאשר תוצאת ה־D1
תואמת בדיוק ל־Capacity המאומת שסיפק ה־Resolver.

14.8.6 ה־Context Resolver קורא רק Meta connection במצב `connected`,
מקבל את מספר הנמען מרשומת Campaign במצב `queued`, ודורש Policy
מפורשת עם Portfolio capacity רשמי ו־Reservation duration בין שש
שניות ל־24 שעות. אין Tier או Duration ברירת מחדל.

14.8.7 מפתחות Portfolio, ‏Sender, ‏Recipient ו־Reservation נגזרים
באמצעות HMAC-SHA-256 עם Purpose separation ו־Secret ייעודי בשם
`WHATSAPP_RATE_LIMIT_HMAC_KEY_V1`. מזהי Meta ומספר הטלפון אינם
נשמרים בטבלאות ה־Rate Limit. החלפת Key version ללא Drain או Migration
תפצל State ולכן אסורה. זהות Reservation כוללת גם את מספר ניסיון
ה־Delivery השמור, מספר ניסיון ה־Queue ומזהה הודעת ה־Queue האטום;
Retry לאחר Settlement מקבל Claim חדש, Retry זהה של אותו Claim נשאר
Idempotent, ושתי רשומות Queue בעלות מזהים שונים אינן חולקות
Reservation.

14.8.8 ה־Worker עדיין מזריק Policy source מושבת, מפני שאין קריאת
Capacity חיה ומאושרת. חסימה זו מונעת שליחה חדשה אך אינה חוסמת עיבוד
Status webhooks עבור הודעות שכבר התקבלו אצל Meta.

14.9 מיגרציה `0031` ו־
`CampaignDeliveryStatusReconciler` משלימים את מסלול ה־Webhook:

14.9.1 תשובת `accepted` מה־Delivery processor חייבת לכלול
`providerMessageId`. ‏D1 מקשר אותו אטומית ל־`deliveryKey` ול־
`reservationKey` לפני מעבר הנמען ל־`accepted`. התוכן, מספר הטלפון
ו־Provider payload אינם נשמרים בטבלת הקישור.

14.9.2 `sent` משאיר את ה־Reservation פעילה. ‏`delivered` או `read`
יוצרים Settlement מסוג `delivered`; ‏`failed` יוצר
`provider-failed`. ‏`read` נחשב הוכחת מסירה אך אינו משנה את זמן
ה־Settlement הראשון שכבר נרשם עבור `delivered`.

14.9.3 Retry של אותו Webhook מחזיר את אותה הוראת Settlement בדיוק.
Event key שחוזר עם תוכן שונה או ניסיון להחליף תוצאה טרמינלית נכשלים
סגור. Trigger של D1 כותב את ה־Settlement ואת מצב הנמען באותה
טרנזקציה שבה נשמרת התוצאה הטרמינלית; Retry מאמת לאחר מכן את אותה
ראיה בדיוק. Settlement ו־Provider identity נשמרים כראיות Immutable.

14.9.4 Trigger מונע מאותו `providerMessageId` להיות גם הודעת
Conversation וגם Campaign delivery באותו Tenant. קמפיין אינו עובר
ל־`completed` כל עוד נמען נשאר `accepted` וממתין לתוצאה טרמינלית.

14.9.5 מקור Capacity חי וחיבור Delivery adapter ל־Worker עדיין
חסרים. לכן השלמת Reconciliation אינה הופכת את שליחת הקמפיינים
ל־Production-ready.

14.10 ‏Meta sender המקומי:

14.10.1 `MetaCampaignTemplateAdapter` מממש את חוזה Meta הרשמי של
`POST /{phone-number-id}/messages` עבור Template מאושר. הוא שולח
`messaging_product: whatsapp`, מספר נמען מנורמל, שם ושפת Template,
Body parameters, ‏Dynamic URL parameter ו־Quick Reply payload אטום
ודטרמיניסטי. המקור הוא
[אוסף WhatsApp Cloud API הרשמי של Meta](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api).

14.10.2 ה־Adapter מקבל הצלחה רק כאשר Meta מחזירה מערך יחיד עם
`messages[0].id` תקין שמתחיל ב־`wamid.`. קבלה זו אינה מסירה; הנמען
עובר ל־`accepted` ורק Status webhook טרמינלי סוגר את ה־Reservation.

14.10.3 `MetaCampaignDeliveryProcessor` טוען Connection מחובר ואת
ה־Access Token המוצפן בצד השרת דרך `MetaCredentialVault`. ה־Token
נשלח רק ב־Authorization header של `MetaGraphTransport`; הוא אינו
נכנס ל־URL, ‏Payload, ‏D1 או תוצאת ה־Processor.

14.10.4 דחיית HTTP מפורשת מסוג 4xx ממופה לקוד תפעולי מוגבל, כולל
`4`, ‏`80007`, ‏`130429`, ‏`131048`, ‏`131049`, ‏`131056`,
`131057`, ‏`131064`, ‏`132015` ו־`132016`. ‏Timeout, כשל רשת,
5xx או תשובת 2xx ללא `wamid` נחשבים תוצאה חיצונית לא ודאית; ה־Queue
אינה שולחת אותם שוב אוטומטית.

14.10.5 המימוש אינו מחובר עדיין ל־Worker. לפני החיבור נדרשים מקור
Capacity חי, מקור Retry evidence מאושר, Kill switch וראיות Sandbox
של WABA. עד אז ה־Worker ממשיך להזריק Processor ו־Policy source
מושבתים ונכשל סגור.

14.11 ‏Provider Backoff/Cooldown מקומי:

14.11.1 `MetaCampaignDeliveryRetryPolicy` אינו מגדיר מספרי Retry
עצמאיים. ה־Runtime מעביר Evidence מפורשת אל
`MetaMessageFailurePolicy`, שהוא מקור ההחלטה המשותף גם ל־Graph
responses וגם ל־Status webhooks. ‏Evidence חסרה, מורחבת או לא תקינה
מחזירה `stop` ואינה יוצרת Retry.

14.11.2 רק שלושה Scopes ניתנים כרגע לייצוג בטוח במסד: `130429`
ברמת Sender, ‏`131049` ברמת Portfolio+Recipient ו־`131056` ברמת
Sender+Recipient. חסימת `131049` חלה רק על Campaign מסוג
`MARKETING`; הודעת `UTILITY` לא נחסמת על בסיס מגבלת Marketing של
אותו נמען. ‏`4` ו־`80007` אינם נשלחים שוב אוטומטית מפני שאין עדיין
מפתחות אטומים ל־App ול־WABA. ‏`131057` מקבל החלטת `pause` במדיניות
המשותפת, אך עד למימוש מצב השהיה עמיד הוא מסתיים ללא Retry אוטומטי
ואינו נשמר כ־Cooldown מתוזמן.

14.11.3 מיגרציה `0032` שומרת אירוע Cooldown בלתי־ניתן לשינוי ומצב
חסימה נגזר. שתי הטבלאות מכילות רק Reservation key ומפתחות HMAC
אטומים; אין בהן Tenant ID, מזהה Meta גולמי, מספר טלפון, תוכן הודעה,
Token או Provider payload.

14.11.4 כתיבת אירוע ה־Cooldown ו־Settlement מסוג `provider-failed`
מתבצעת באותו D1 batch. ‏Triggers דורשים Reservation קיים, Scope
התואם לקוד, זמן עתידי של עד 24 שעות ו־Settlement מדויק מאותו רגע;
מצב חסימה קיים ניתן רק להאריך ולא לקצר ידנית.

14.11.5 ה־Queue מחזיר נמען מ־`sending` ל־`queued` רק לאחר שה־D1
אישר את ה־Cooldown וה־Settlement. כשל בכתיבת הראיה או במעבר המצב
משאיר את ה־Delivery חסום ללא Retry אוטומטי, כדי שלא תיווצר שליחה
כפולה. ניסיון חדש נדרש לקבל Claim ו־Reservation חדשים; Repository
מסרב להחזיר כ־Idempotent Reservation שכבר קיבלה Settlement.

14.11.6 ‏`MetaGraphTransport` קולט רק ערך `Retry-After` מספרי ובטווח
של שנייה עד 24 שעות ואינו שומר את ה־Header הגולמי. עדיין חסרים חיבור
הערך אל מקור Evidence חי, ‏Pair exponent מתמשך, Capacity חי, Kill
switch ו־WABA Sandbox; אלה נשארים `unknown/unavailable` עד חיבור
החשבון המורשה.

## 15. אחריות ועדכון

15.1 טל מתחזק מטריצה מתוארכת המכילה לכל מגבלה: Scope, ערך,
חלון זמן, מקור רשמי, Error, פעולת Retry, ‏Telemetry וגרסת API.

15.2 בדיקה חוזרת תתבצע לפני כל Production release ולפחות אחת ל־30
יום בזמן פיתוח פעיל.

15.3 RACI: טל אחראי למחקר ולאימות העובדות; דוד Accountable למימוש;
אבטחה ומוצר מאשרים את המדיניות. שינוי Meta שובר יפתח Decision event.

15.4 מצב ה־WABA החי, ה־Messaging tier ורמת ה־Throughput עדיין
`unknown/unavailable` עד חיבור חשבון מורשה.

## 16. מטריצת Baseline מתוארכת

16.1 Metadata:

16.1.1 `checkedAt`: ‏2026-08-16.

16.1.2 `META_GRAPH_API_VERSION`: ‏`unknown/unavailable` עד החלטת
גרסה והגדרת סביבת היעד.

16.1.3 מצב Portfolio, ‏WABA, מספר ו־Templates חי:
`unknown/unavailable` עד חיבור מורשה.

16.1.4 סטטוס: Baseline מחקרי, לא Production evidence. ‏Release
Evidence חייב לקשור את המסמך והמצב החי ל־Commit, ‏Artifact ו־Digest.

16.2 מטריצת המגבלות:

| Scope | ערך ספק | חלון/יחידה | Error או Signal | פעולת Connect | מקור רשמי |
| --- | --- | --- | --- | --- | --- |
| Phone throughput | ‏20 ב־Coexistence, ‏80 ברירת מחדל, עד 1,000 לאחר שדרוג | לשנייה; נכנס ויוצא יחד | `130429`, `131057`, `THROUGHPUT_UPGRADE` | Token bucket לפי ערך חי ו־Headroom | [Throughput](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput) |
| Sender+Recipient | הודעה אחת בכל 6 שניות; Burst עד 45 על חשבון המכסה העתידית | Pair | `131056` | Queue סדרתית ו־`4^X` Backoff | [Platform rate limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform#rate-limits) |
| Portfolio recipients | ‏250, 2K, 10K, 100K, Unlimited | נמענים ייחודיים שנמסרו מחוץ לחלון ב־24h נע | `business_capability_update` | Reservation אטומי ו־Reconcile לפי Delivery | [Messaging limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits) |
| Service window | ‏24 שעות מהודעת המשתמש האחרונה | Sender+Recipient | `131047` | Free-form רק בחלון; מחוץ לו Template+Opt-in | [Sending messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages) |
| Template creation | ‏100 | לשעה לכל WABA | לא פורסם קוד ייעודי | מכסת Admin פנימית ללא Retry עיוור | [Template overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) |
| Template inventory | ‏250 ב־Portfolio לא מאומת; 6,000 ב־WABA זכאי | לכל WABA | מצב Template | חסימת יצירה לפני חריגה | [Template overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) |
| Template pacing | סף דינמי לא מפורסם | Template | `held_for_quality_assessment`, `132015`, `132016` | להמתין ל־Webhook; Circuit breaker | [Template pacing](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pacing) |
| Portfolio pacing | עשוי לחול מתחת ל־500K Templates ב־365d או בפעילות חשודה | כלל המספרים ב־Portfolio | `held_for_quality_assessment`, `135000` | עצירת Campaign ו־Review | [Portfolio pacing](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/portfolio-pacing) |
| Per-user marketing | דינמי ולא מפורסם | לפי נמען; Cooldown של לפחות 24h אחרי הגבלה | `131049`, `131050` | Cooldown או Opt-out block; ללא Retry מוקדם | [Per-user limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits) |
| Management API | ‏200 ברירת מחדל או 5,000 ל־WABA פעיל | לשעה לכל App+WABA | `4`, `80007` | Backoff לפי Response | [Platform rate limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform#rate-limits) |
| Webhook receiver | קיבולת 3x יוצא ועוד נכנס צפוי; median עד 250ms ופחות מ־1% מעל 1s | לשנייה | Delivery statuses ו־Retry עד 7d | Idempotency, Backpressure ו־DLQ | [Throughput](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput) |
| Policy enforcement | Warning; ‏1/3d; ‏5/7/30d; חסימה בלתי מוגבלת או קבועה | Portfolio/Account | `account_update` | עצירה, Audit ו־Appeal כאשר זמין | [Policy enforcement](https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement) |
| WhatsApp Flows | ‏10 הודעות בשעה כאשר Flow כבר במצב Throttled | Flow | `132069` | חסימה; דורש Scope ואישור נפרדים | [Error codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes) |

## 17. מקורות Meta רשמיים

17.1 [Platform rate limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform#rate-limits).

17.2 [Throughput](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput).

17.3 [Messaging limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits).

17.4 [Sending messages and customer service window](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages).

17.5 [Message quality](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages#message-quality).

17.6 [Template fundamentals and limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview).

17.7 [Template quality](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality).

17.8 [Template pacing](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pacing).

17.9 [Template pausing](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pausing).

17.10 [Per-user marketing limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits).

17.11 [Opt-in](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in).

17.12 [Error codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes).

17.13 [Business portfolio pacing](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/portfolio-pacing).

17.14 [Policy enforcement](https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement).

17.15 [WhatsApp Business Solution Terms — Last Modified March 6, 2026; accessed August 16, 2026](https://www.whatsapp.com/legal/business-solution-terms/).

17.16 [Meta Terms for WhatsApp Business — Last Modified October 15, 2025; new terms effective September 23, 2026; accessed August 16, 2026](https://www.whatsapp.com/legal/meta-terms-whatsapp-business).

17.17 [WhatsApp Business Messaging Policy — accessed August 16, 2026](https://whatsappbusiness.com/policy/).
