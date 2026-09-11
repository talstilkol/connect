# 1. Responses ו־Knowledge — חוזה המימוש המקומי

1.1 הקוד החדש נמצא ב־server/ai/openAiResponsesConfiguration.ts, openAiResponsesWire.ts, openAiResponsesProvider.ts, approvedKnowledgeRetriever.ts ו־knowledgeUtf8TextExtractor.ts. הוא נכתב לפי R208, כחלק מפיתוח AI לפני חיבורים.

1.2 לפי R209, Worker משתמש באחזור מאושר וב־durableOpenAiResponsesProvider עם postgresAiGenerationJournal כאשר AI_RESPONSES_ENABLED=true וכל התצורה תקינה. ללא הדגל הספק נשאר unavailable. מתאם ה־HTTP הפנימי מוגבל לניסיון אחד; היומן העמיד מונע Dispatch נוסף לאותה בקשה בין תהליכים ו־Restart. החיבור בקוד אינו הפעלה בחשבון או פריסה. שריון דורש סוכן פעיל, גרסה מפורסמת תואמת, מטבע USD ומצב agent-approval.

# 2. תצורה למתאם

| שם | דרישה |
|---|---|
| AI_RESPONSES_ENABLED | רק true מפורש; חסר או false מחזירים disabled |
| OPENAI_API_KEY | סוד שרתי אמיתי; אינו נכתב לקוד, Browser או Logs |
| OPENAI_MODEL | מזהה מדויק שהספק מחזיר ללא שינוי |
| OPENAI_ALLOWED_MODELS_JSON | רשימת מודלים שאושרו לאחר Eval, ללא כפילות |
| OPENAI_MAX_INPUT_TOKENS | מספר שלם מפורש, 1–1,000,000; תקרת משאב של Connect, לא טענה על חלון ההקשר של מודל |
| OPENAI_MAX_OUTPUT_TOKENS | מספר שלם מפורש, 1–16,384; כולל Tokens פנימיים לפי חוזה הספק |
| OPENAI_TIMEOUT_MS | מספר שלם מפורש, 1,000–60,000; תקציב HTTP כולל קריאת הגוף |
| OPENAI_RATE_CARD_JSON | שדות מפורטים בהמשך; מחירי חשבון מאומתים נדרשים בזמן החיבור |

2.1 שדות Rate card: model, currency=USD, inputMicroUsdPerMillionTokens, cachedInputMicroUsdPerMillionTokens, cacheWriteMicroUsdPerMillionTokens, outputMicroUsdPerMillionTokens, validUntil. cacheWrite הוא null רק כשהמודל אינו מחייב בנפרד על כתיבת מטמון. מחיר חיובי מחייב גם ספירת cache_write_tokens בתגובה. אין ערכי ברירת מחדל או מחירים לדוגמה.

2.2 Rate card הוא קלט תפעולי; תאריך תפוגה תקין אינו הוכחה שהמחיר אכן נכון. מתאם זה אינו מחשב מס, המרת מטבע או עלויות אחרות בחשבונית. עלות התגובה מעוגלת כלפי מעלה ל־USD cents פעם אחת, ב־BigInt. Model/Tier לא צפויים, Usage חסר או לא עקבי מונעים תוצאת generated. אפס output tokens אינו נתמך בחוזה Usage הנוכחי ונשאר בלתי מתומחר, לא מחיר אפס.

# 3. גבולות מידע ותשובה

3.1 יצירת טקסט נשלחת ב־POST ל־https://api.openai.com/v1/responses בלבד, בלי Redirect, בלי Retry ובלי כלים. לפני כן מתבצעת ספירת קלט ב־https://api.openai.com/v1/responses/input_tokens. מזהה requestKey הדטרמיניסטי נשלח בכותרת X-Client-Request-Id לצורכי בירור; זו אינה הבטחת Idempotency של הספק. store=false, stream=false, background=false ו־service_tier=default מפורשים. store=false אינו הבטחת Zero Data Retention; בקרות הנתונים של החשבון דורשות אימות נפרד.

3.2 התשובה חייבת להיות completed, הודעת assistant יחידה ובה JSON לפי הסכמה. ציטוטים חייבים להתאים למזהי הקטעים שנשלחו; אין קבלה של Tool call, Refusal, ציטוט מומצא, כפל או טקסט ארוך מדי. Usage תקף נשמר גם כשמסקנת הפענוח policy-violation, וה־Runtime רושם אותו לפני Handoff.

3.3 אחזור קורא עד 100 קטעים ראשונים לפי הסדר הקבוע במאגר, מתוך המקורות שנבחרו ומסומנים ready. הוא מאמת שיוך, Hash ומפתח דטרמיניסטי, מדרג לפי חפיפת מילות שאילתה ובוחר עד 20 קטעים/64 KiB. זהו אחזור לקסיקלי מוגבל, שאינו מוכיח Recall מלא או הבנה סמנטית. Tenant ID וכתובת אחסון אינם נשלחים למודל.

3.4 חילוץ TXT/Markdown דורש UTF-8 תקין, עד 1 MiB, וחלוקה דטרמיניסטית עד 4,096 תווי UTF-16 לקטע תוך שמירת זוגות Surrogate. קריאה של הקובץ חייבת להתבצע רק לאחר סריקה מאומתת ובדיקת גרסת האובייקט. PDF, Office, HTML, ארכיונים ו־OCR אינם נתמכים במפענח הזה.

# 4. תנאים לפני הפעלה

4.1 יומן Generation, ספירת קלט, שריון, שמירת Usage ותוצאה אטומית ו־Replay מומשו ונבדקו מקומית ב־R209. נדרשת החלת מיגרציה 0076 לפני הפעלה. גרסת התצורה והמודל/מחירון בפועל ייבדקו בזמן החיבור.

4.2 נדרשים חיבור Upload/Scan/Extraction ל־S3 ול־PostgreSQL, אישור אדם ו־Sender עם גבולות WhatsApp הקיימים, בדיקות ביטול גישה ו־Evals בחשבון. אין לסמן C1 או C2 כסגורים מכוח מתאם HTTP.

4.3 [תוכנית ההשלמה](planning/code-completion-plan-2026-09-11.md), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Spending controller](https://developers.openai.com/cookbook/articles/per_run_spending_controller_responses_api).


# 5. שריון, שחזור ואי־ודאות — R209

5.1 ספירת הקלט כוללת את אותם model, input, instructions, tools, tool_choice, truncation ו־text.format של בקשת היצירה. הספירה אינה אומדן לפי אורך תווים. כשל ספירה דוחה את העבודה בלי ליצור Claim או קריאת Generation. הרשאה מוקדמת אינה שריון כספי.

5.2 תחת נעילת שורת הסוכן ב־PostgreSQL: מאמתים גרסה/מקורות/הוראה שרתיים, אישור תקציב לחודש UTC הנוכחי, עלות שכבר נרשמה וכל השריונים ללא Usage. השריון מכסה את כל טוקני הקלט במחיר האפשרי הגבוה ביותר, כולל Cache write, ואת תקרת טוקני הפלט. משתמשים ב־BigInt ובעיגול USD cents כלפי מעלה. החודש הקובע הוא חודש ה־Claim; אין טענה להתאמה מלאה לתאריך החיוב בחשבונית הספק.

5.3 רק אישור Commit של Claim מתיר קריאת Generation אחת. כשל או אובדן אישור Commit דוחים את העבודה; Claim קיים אינו נרכש שוב, גם אחרי תפוגה. בקשה כפולה בזמן עבודה מחזירה AiResponseDeferredError שעובר דרך ה־Runtime עד למנגנון Retry הקיים, בלי לכתוב Handoff מתחרה. כללי מספר הניסיונות ו־Dead letter של התור נשארים חלים.

5.4 תוצאה ו־Usage נכתבים באותה עסקה. קריסה לפני Commit משאירה Claim ושריון; קריסה אחרי Commit מאפשרת Replay בלי HTTP נוסף. הקריאה הרגילה ל־costGate.recordUsage מזהה את Usage שכבר נשמר. גם סירוב עם Usage תקף נרשם. Model/Tier/Usage בלתי מתומחרים משאירים מצב uncertain, ללא עלות אפס בדויה. עלות מעל השריון או קלט מעל הספירה נרשמים כאשר הם ידועים, אך התשובה אינה נמסרת ומצב uncertain חוסם קריאות נוספות.

5.5 תוצאת הבקשה מקושרת ל־Tenant, requestKey, גרסת הסוכן ולתוכן המדויק. מדיניות הספק המקורית קשורה ל־Claim ול־Settlement. חידוש מחירון או שינוי תקרת פלט אינם מצדיקים יצירה מחדש של תשובה שכבר נשמרה; תוכן שונה תחת אותו מפתח נדחה. בקשה עם מחירון פג אינה רשאית ליצור Generation חדש.

5.6 Claim שפג או שריון מחודש קודם חוסמים קריאות חדשות לאותו סוכן. uncertain חוסם גם בחודשים הבאים. אין מחיקה אוטומטית, Retry ל־Generation או שחרור לפי Timeout. תפעול יכול לזהות בקשה לפי request_key ולברר קבלה אצל OpenAI באמצעות X-Client-Request-Id. עצם קבלת הבקשה אינה מוכיחה את העלות. נדרש בירור חיוב ואישור תפעולי מתועד לפני פעולה; מסלול Reconciliation מאומת במוצר עדיין שייך ל־C4.1 ואינו מוצג כממומש.

5.7 בדיקות: 16 תרחישי PostgreSQL עברו בנפרד על 16.13 ועל 17.11, כולל תחרות, Rollback, אובדן אישור Claim/Settlement, אי־ודאות, שינוי מחירון, הרשאות ותפוגה. נוספה הרצה ל־CI על PostgreSQL 17.11 מוצמד; הרצה מרוחקת עדיין לא בוצעה. [דוח אימות](../outputs/launch-validation-2026-09-09/ai-journal-validation-20260911.json).

5.8 מקורות: [Token counting](https://developers.openai.com/api/docs/guides/token-counting), [חוזה שדות Input tokens](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count), [מעקב X-Client-Request-Id](https://developers.openai.com/api/reference/overview#supplying-your-own-request-id-with-x-client-request-id). המחירים בדוגמת Spending controller אינם מקור למחירי המוצר.
