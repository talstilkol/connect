# 1. שחזור תוצאות לא ודאיות — R220, ‏12.09.2026

1.1 ארבעה כלי CLI פרטיים סוגרים בירור עלות AI, מסירת תשובת AI, מסירה ידנית והעלאת Knowledge. אין להם נתיב HTTP או כפתור לקוח. הם אינם שולחים שוב בקשת יצירה, הודעה או קובץ. מיגרציות 0086–0089 מוסיפות ראיות והרשאות; הן אינן מעניקות הרשאת מפעיל אוטומטית.

| כלי | ממצא נדרש | השפעה |
|---|---|---|
| `ai-generation-recovery.mjs` | שימוש ועלות סופיים של הבקשה המקורית, או אישור סופי שלא חויבה | רישום תיקון מצטבר והחלפת העלות האפקטיבית; הטיוטה הישנה אינה נשלחת |
| `ai-delivery-recovery.mjs` | קבלת ההודעה המקורית עם מזהה Meta מדויק, או אישור סופי שלא התקבלה | רישום הודעת Inbox אחת, או סגירת ההמתנה; ללא שליחה נוספת |
| `manual-delivery-recovery.mjs` | אותה בדיקה להודעה הידנית המקורית | שחרור חסימת השיחה לאחר הכרעה מתועדת, ללא החזרת ההודעה לתור |
| `knowledge-ingestion-recovery.mjs` | גרסת S3 המדויקת, סריקה נקייה ותוכן תואם; או אישור סופי שלא נוצר אובייקט | תור לסריקה ועיבוד מחדש של אותה גרסה, או סגירת ההעלאה |

1.2 מסמך הראיה הוא עדות מפעיל: התוכנה בודקת הרשאה, זהות, מצב מסד ו־SHA-256; היא אינה יכולה לאמת שהצהרת תמיכה אנושית נכונה. יש לשמור את התכתובת המקורית באחסון מוגבל ולזהותה באמצעות ה־Digest. הרשומה צריכה לזהות חשבון ספק, עסק, בקשה מקורית, חלון ניסיון, ממצא סופי וזהות ספק כשנמצאה. היעדר תשובה, חלוף זמן, 404, רשימה ריקה או Hash אינם ראיה שלא בוצעה פעולה. בלי ראיה מספקת משאירים את הבירור פתוח.

1.3 Connect משתמש ב־Responses עם `store:false`; אין להניח שאפשר לשחזר תשובה באמצעות GET. מדיניות השמירה מתועדת ב[תיעוד OpenAI](https://developers.openai.com/api/docs/guides/conversation-state). Meta מתעדת מעקב סטטוס לפי מזהה הודעה באמצעות Webhooks ב[אוסף Messages הרשמי](https://www.postman.com/meta/whatsapp-business-platform/folder/o48mro7/messages). קבלת בקשה מסומנת `sent`; היא אינה ראיית `delivered` או `read`.

# 2. הרשאות פרטיות

2.1 מנהל המסד יוצר LOGIN מזוהה ונפרד, ללא Superuser, יצירת Roles/Database/Schema או חברות ב־Migration/Runtime. סודות המפעיל נשמרים רק בסביבת התפעול. URL מרוחק מחייב `sslmode=verify-full` יחיד. אין לשתף אותו עם Web/API/Worker.

| תחום | משתנה URL | טבלת הרשאה מוגבלת בזמן | פונקציות שהמפעיל מקבל עליהן EXECUTE בלבד |
|---|---|---|---|
| עלות AI | `AI_RECOVERY_DATABASE_URL` | `ai_recovery_authorizations` | `ai_generation_recovery_snapshot_v1(bigint,text)`, `apply_ai_generation_recovery_v1(bigint,text,text,timestamptz,text,text,bigint,bigint,bigint,text)` |
| מסירת AI | `AI_RECOVERY_DATABASE_URL` | `ai_recovery_authorizations` | `ai_delivery_recovery_snapshot_v1(bigint,text)`, `apply_ai_delivery_recovery_v1(bigint,text,text,timestamptz,text,text,text,text)` |
| מסירה ידנית | `MANUAL_RECOVERY_DATABASE_URL` | `manual_recovery_authorizations` | `manual_delivery_recovery_snapshot_v1(bigint,text)`, `apply_manual_delivery_recovery_v1(bigint,text,text,timestamptz,text,text,text,text)` |
| Knowledge | `KNOWLEDGE_RECOVERY_DATABASE_URL` | `knowledge_recovery_authorizations` | `knowledge_recovery_snapshot_v1(bigint,text)`, `apply_knowledge_recovery_v1(bigint,text,text,timestamptz,text,text,text,text)` |

2.2 נוסף לכך נדרשת USAGE על `public`. מנהל המסד מכניס הרשאה עבור `database_role` האמיתי, `tenant_id` המדויק ו־`expires_at`. המפעיל אינו מקבל כתיבה לטבלת ההרשאות או לטבלאות המוצר. `session_user` קובע מי ביצע; `SET ROLE` או שדה Actor אינם מחליפים זהות. ביטול הרשאה ותפוגה נבדקים גם בהחלה וגם ב־Replay.

2.3 פונקציות הכתיבה הן SECURITY DEFINER עם שמות טבלה מלאים ו־search_path מוגבל. יש להחיל את המיגרציות באמצעות Migration owner מהימן, ולוודא בעלות ו־PUBLIC revokes לאחר הפריסה. בדיקות מקומיות מפעילות Logins נפרדים ומוכיחות שאין להם הרשאה להעניק לעצמם סמכות או לשכתב ראיות.

2.4 הרשאות Runtime החדשות נפרדות מהרשאות המפעיל. API הקורא דוחות דורש SELECT על `ai_generation_effective_usage`; Worker של AI דורש גם SELECT על `ai_generation_recovery_state` ועל `ai_generation_late_usage` עבור השריון, ו־EXECUTE על `record_ai_generation_late_usage_v1(bigint,text,bigint,bigint,bigint)`. Worker של מסירה דורש EXECUTE על פונקציית `record_ai_delivery_late_acceptance_v1(bigint,text,integer,text)` או `record_manual_delivery_late_acceptance_v1(bigint,text,integer,text)` לפי תפקידו. Guard של מסירת AI קורא `ai_delivery_late_acceptances`, ולכן נדרשת בו SELECT ל־Worker. Worker של Knowledge דורש SELECT על `source_key,action,recorded_at` ב־`knowledge_ingestion_reconciliations` ו־EXECUTE על `record_knowledge_late_receipt_v1(bigint,text,text)`. אין להעניק ל־Runtime פונקציות Prepare/Apply או כתיבה ישירה ליומני השחזור. יש להוכיח את המטריצה תחת ה־Logins האמיתיים ב־Staging.

# 3. הכנה והחלה

3.1 Node 24. כל קובץ קלט חייב להיות נתיב מוחלט, קובץ רגיל בבעלות המשתמש עם הרשאות `0600`, ללא Symlink. קלט/הצעה מוגבלים ל־64 KiB; ראיה ל־1 MiB. פלט ההכנה נוצר ב־0600 ואינו דורס קובץ קיים. חומרי תיק גדולים נשמרים בנפרד ומקושרים ברשומת ראיה נאמנה; אין להמציא ממצא כדי למלא קובץ.

| כלי | שדות JSON מדויקים |
|---|---|
| עלות AI | `tenantId, requestKey, action, inputTokens, outputTokens, costMinorUnits, currency` |
| מסירת AI/ידנית | `tenantId, deliveryKey, action, providerMessageId` |
| Knowledge | `tenantId, sourceKey, action, versionId` |

3.2 הפעולות והאישורים:

| תחום / action | תנאי | `RECOVERY_CONFIRMATION` |
|---|---|---|
| AI / `usage-confirmed` | ספירות ועלות סופיות, USD, יחידות סנט שלמות | `CONFIRM_PROVIDER_FINAL_USAGE` |
| AI / `no-charge-confirmed` | כל הספירות והעלות אפס, ממצא סופי שאין חיוב | `CONFIRM_PROVIDER_TERMINAL_NO_CHARGE` |
| מסירה / `accepted` | `providerMessageId` אמיתי של ההודעה המקורית | `CONFIRM_PROVIDER_ORIGINAL_ACCEPTANCE` |
| מסירה / `not-accepted` | ממצא סופי שלא התקבלה, מזהה null | `CONFIRM_PROVIDER_TERMINAL_NOT_ACCEPTED` |
| Knowledge / `reprocess` | VersionId מדויק ומאומת | `CONFIRM_EXACT_VERSION_REPROCESS` |
| Knowledge / `absent` | ממצא סופי שלא נוצר אובייקט, VersionId null | `CONFIRM_PROVIDER_TERMINAL_OBJECT_ABSENT` |

3.3 יש לקבוע את המשתנים הבאים מתוך הקבצים והכלי האמיתיים שנבחרו. אין כאן מזהים או נתוני ספק לדוגמה:

```sh
node "$RECOVERY_SCRIPT_PATH" prepare "$RECOVERY_REQUEST_PATH" "$RECOVERY_PROPOSAL_PATH"
node "$RECOVERY_SCRIPT_PATH" apply "$RECOVERY_PROPOSAL_PATH" "$RECOVERY_EVIDENCE_PATH" "$RECOVERY_CONFIRMATION"
```

3.4 בין שתי הפקודות בודקים את ההצעה מול תיק הראיות. ההצעה קשורה למשתמש, לעסק, למצב המדויק ולשעון המסד, ותקפה לחמש דקות. שינוי מצב, הרשאה או ראיה מחייב הכנה מחדש. אין לערוך Digest או זמן כדי לעקוף פקיעה. Retry זהה לאחר אובדן אישור Commit מחזיר את אותה קבלה, בכפוף להרשאה עדכנית.

# 4. התנהגות וגבולות

4.1 עלות AI: היומן המקורי ו־Usage המקורי נשארים ללא שינוי. תיקון מוסיף Revision; הדוחות והתקציב משתמשים בעלות האפקטיבית. מותר לתעד חיוב גם ללא Output. ראיית חיוב חיובית אינה יכולה להימחק בהחלטת “אין חיוב”. תשובת רשת תקינה שמגיעה אחרי Timeout שומרת Usage בלי לפרסם טיוטה. אם היא סותרת החלטה, נפתח בירור נוסף והשריון נשאר שמרני עד להכרעה חדשה. אובדן התהליך לפני שמירת הראיה עדיין מחייב בירור אצל הספק.

4.2 מסירה: רק `unknown`, או `sending` חתום שעברו עליו שתי דקות, ניתנים לבירור. אישור יוצר לכל היותר הודעת Inbox אחת עם הטקסט המקורי; שיוך נציג או הודעה חדשה אינם נדרסים. סגירה שלילית אינה משחררת מכסה מוקדם. אישור חיובי מאוחר מאותו Claim נשמר ומתקן את מצב המסירה; הראיה השלילית המקורית נשארת. יומן השחזור אינו מספק יכולת שליחה.

4.3 Knowledge: ההכנה קוראת את הגרסה המדויקת בהרשאות AWS של קריאה בלבד, בודקת סריקה, גודל ו־SHA-256 ומאפסת את מערך הבתים. ההחלה רק מחזירה לתור סריקה; Worker בודק שוב את הגרסה והתוכן לפני חילוץ והפיכה ל־ready. אין PUT חוזר. נדרשת תצורת `KNOWLEDGE_ENABLED` ומשתני `KNOWLEDGE_S3_*` הקיימים בעת Prepare מסוג reprocess. אין צורך ב־AWS בהחלת ההצעה או בסגירת היעדרות.

4.4 גרסה שהכילה איום, תוכן שאינו תואם, פורמט אסור או מקור שיצא משימוש אינה חוזרת לשימוש דרך הכלי. קבלה מאוחרת לאחר סגירת היעדרות נשמרת עם VersionId, אך המקור נשאר חסום עד בירור חדש. הסריקה לפי גרסה נשענת על [GetObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html) ו[תוצאות GuardDuty](https://docs.aws.amazon.com/guardduty/latest/ug/monitor-with-eventbridge-s3-malware-protection.html). מחיקה נשארת במסלול [Retention](knowledge-object-retention.md).

4.5 כל הבדיקות מקומיות. לפני הפעלה: הרשאות אמת, TLS, אחסון ראיות, התראות על בירורים, אחראי תפעול ותרגול ב־Staging באותה גרסת Web/API/Worker. אין לייצר חיוב או לשלוח הודעה רק כדי להמציא מקרה בירור.
