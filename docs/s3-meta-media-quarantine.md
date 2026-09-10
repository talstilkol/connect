# 1. מדיה היסטורית — חוזה אחסון S3 פרטי

1.1 עודכן ב־10.09.2026. Owner: Tal. מימוש פנימי בלבד: קיימים יומן העלאות עמיד, Claims, שמירת אישורי גרסאות ובירור לפי תגית GuardDuty ב־S3. אין עדיין איסוף ותזמון הורדות ובירור ב־Worker, יצירת משאבי AWS או מסלול הגשת קובץ. בדיקות ספק אמיתיות עדיין נדרשות.

1.2 [מתאם האחסון](../server/platform/s3MetaMediaQuarantineStorage.ts) משתמש ב־AWS SDK הרשמי, בגרסה נעולה 3.1129.0. [Runtime](../server/platform/railwayMetaHistoryMediaRuntime.ts) מחבר אותו למקור PostgreSQL ולהורדה מ־Meta. ה־Runtime מחייב uploadJournal, ושומר את אישור גרסת הקובץ במצב quarantined. אישור זה אינו תוצאת סריקה, היתר הגשה או סיום ייבוא.

# 2. תצורה והרשאות

2.1 נדרשים ערכים אמיתיים למשתנים הבאים. בבדיקת התהליך וקובצי .env/.env.local ב־10.09.2026 אף אחד מהם לא נמצא; לא נבדקה מכך עצם קיומו של חשבון AWS.

| משתנה | דרישה |
|---|---|
| META_MEDIA_S3_REGION | אזור AWS רגיל; ללא China/GovCloud במימוש זה |
| META_MEDIA_S3_BUCKET | Bucket רגיל וייעודי, ללא נקודות, Alias או Access Point |
| META_MEDIA_S3_ACCOUNT_ID | בעל החשבון הצפוי; נשלח בכל בקשה |
| META_MEDIA_S3_KMS_KEY_ARN | ARN מלא של Key באותו חשבון ואזור; לא Alias |
| META_MEDIA_S3_SCANNER_ROLE_ARN | ARN מדויק של תפקיד GuardDuty ייעודי באותו חשבון |

2.2 הרשאות AWS מתקבלות ממנגנון Credentials של ה־SDK בשרת. אין סוד AWS בדפדפן או בקלט פעולת המדיה. תפקיד הכתיבה נפרד מתפקיד הסריקה, ואינו רשאי להניח אותו או לשנות תצורת Bucket/מדיניות/KMS. אין להעניק לו קריאת קבצים, עדכון תגיות או מחיקת קבצים. נדרשות הרשאות כתיבה ל־Prefix המדיה ו־KMS לפי הצפנת S3, וכן שש הרשאות התצורה הבאות על ה־Bucket בלבד: s3:GetBucketPublicAccessBlock, s3:GetBucketVersioning, s3:GetBucketOwnershipControls, s3:GetEncryptionConfiguration, s3:GetBucketPolicyStatus, s3:GetBucketPolicy. שמות ההרשאות נבדקו מול [מיפוי הפעולות הרשמי של AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html).

2.3 כל ארבע חסימות הגישה הציבורית חייבות להיות true, Versioning חייב להיות Enabled, הבעלות BucketOwnerEnforced, והצפנת ברירת המחדל aws:kms עם אותו ARN. ה־Bucket Policy חייב להיות לא ציבורי ולכלול את שבע הוראות Deny שמחזירה [פונקציית המדיניות](../server/platform/s3MetaMediaQuarantinePolicy.ts). זו תשתית הוראות חובה, לא תבנית פריסה מלאה ולא מתן הרשאות IAM. אפשר למזג הוראות נוספות בלי לשנות את הוראות החובה. שינויים בסדר שדות JSON וסדר ההוראות מותרים; שינוי במבנה הוראת חובה נכשל בבדיקה.

2.4 אחרי הגדרת הערכים האמיתיים בתהליך אפשר להפיק את המדיניות לבדיקה מקומית, ללא פנייה לענן:

```sh
node --input-type=module <<'JS'
import { requireS3MetaMediaQuarantineConfiguration } from './server/platform/s3MetaMediaQuarantineConfiguration.ts';
import { requiredMetaMediaQuarantineBucketPolicy } from './server/platform/s3MetaMediaQuarantinePolicy.ts';
const config = requireS3MetaMediaQuarantineConfiguration(process.env);
console.log(JSON.stringify(requiredMetaMediaQuarantineBucketPolicy(config), null, 2));
JS
```

# 3. כתיבה והסגר

3.1 מפתח הקובץ נגזר מ־Tenant, דור חיבור, מפתח הודעה, SHA-256 של מקור המדיה המאומת ו־SHA-256 של ה־Bytes. אין שם לקוח, טלפון, Token או מזהה אקראי במפתח. ה־Prefix הוא quarantine/meta-history/v1/. Metadata מצומצם שומר את אותה זהות ואת MIME המקור; תוכן האובייקט מוגדר application/octet-stream ו־attachment.

3.2 נשלח PUT יחיד עם If-None-Match:*, ChecksumSHA256, SSE-KMS ומפתח מדויק. האישור מחייב VersionId שאינו null, checksum תואם ואישור הצפנה תואם. אין שימוש ב־ETag כהוכחת Hash, אין Multipart, ACL, תגית סריקה, HeadObject, GetObject או DeleteObject. כתיבה מותנית ומזהי גרסאות מבוססים על [חוזה PutObject הרשמי](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html).

3.3 המדיניות חוסמת קריאת גרסה נוכחית ומפורשת כל עוד אין GuardDutyMalwareScanStatus=NO_THREATS_FOUND, למעט תפקיד הסורק המדויק. היא חוסמת הוספת תגית סריקה בזמן העלאה, וכל החלפה או מחיקה של תגיות בידי תפקיד אחר. החלפת קבוצת תגיות יכולה להסיר תגית קיימת גם בלי לציין את שמה, ולכן נבחרה חסימה מלאה למעדכנים שאינם הסורק. [AWS — תגיות אובייקט](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-tagging.html), [GuardDuty — בקרת קריאה](https://docs.aws.amazon.com/guardduty/latest/ug/tag-based-access-s3-malware-protection.html).

3.4 החרגת תפקיד הסורק משתמשת ב־ArnNotEquals עם aws:PrincipalArn לפי [הנחיית AWS ל־IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_notprincipal.html). יש להפעיל תוכנית Malware Protection ותגיות לפני ההעלאה ולוודא את הרשאות הסורק ל־Bucket ול־KMS. Preflight האחסון אינו מוכיח שסורק פעיל; ללא סריקה הקובץ יישאר בלתי קריא. [AWS — הפעלת הסריקה והתגיות](https://docs.aws.amazon.com/guardduty/latest/ug/how-malware-protection-for-s3-gdu-works.html).

# 4. הרשאה, מגבלות ותוצאות לא ודאיות

4.1 המקור והמבצע נבדקים לפני Preflight, אחריו, במנגנון SDK אחרי ההמתנה ל־Credentials ולחתימה ולפני Transport, ושוב לפני החזרת האישור. לאחר תשובת PUT תקינה נשמר האישור ביומן לפני בדיקת ההרשאה האחרונה. שינוי הרשאה בזמן PUT חוסם את החזרת האישור אך אינו מוחק את עובדת הכתיבה. אין טרנזקציה משותפת למסד ול־S3, ולכן קריסה לפני שמירת האישור עדיין מחייבת בירור. אין מחיקה אוטומטית, הנחת הצלחה או הרשאת קריאה כתוצאה מכך.

4.2 ניסיון אחד פעיל בכל מופע מתאם ובכל מופע שירות רכישה; עד 100 MiB לקובץ ו־30 שניות לכל בקשת S3 כברירת מחדל. ששת GET של תצורת ה־Bucket נבדקים בכל העלאה, במקביל; תוצאותיהם אינן נשמרות כהיתר עתידי. ה־PUT נפרד בזמן. בהעלאה נשמר עותק יציב של ה־Bytes, ולכן עשויים להיות שני Buffers של עד 100 MiB כל אחד, נוסף על תקורת SDK/Hash. נדרשת מדידת זיכרון ב־Staging; זו אינה מכסת AWS או תקרת זיכרון כוללת לתהליך. העותקים שבבעלות הקוד מאופסים בסיום.

4.3 אסטרטגיית SDK מבצעת ניסיון אחד בלבד ואינה יוצרת Invocation ID אקראי. אין מעבר אזור, Endpoint מותאם או הפניה אוטומטית. ערכי AWS_ENDPOINT_URL אינם מחליפים את מקור S3 במתאם.

| תוצאה | טיפול נדרש |
|---|---|
| OBJECT_EXISTS / 412 | קיים אובייקט לא מאומת; אין החזרת הצלחה או קריאת Bytes |
| OUTCOME_UNKNOWN | Timeout, 409, 5xx, כשל רשת או אישור חסר; לברר לפני ניסיון נוסף |
| WRITE_REJECTED | דחיית בקשת 4xx מוכרת; אין Retry אוטומטי |
| AUTHORIZATION_CHANGED | לעצור עבודה חדשה; ייתכן שכבר נשמר קובץ בהסגר |
| UNSAFE_BUCKET / DEPENDENCY_UNAVAILABLE | אין PUT לאחר כשל Preflight |

4.4 כוונת העלאה עמידה, Claim, גרסה ו־VersionId ממומשים במיגרציה 0068 וביומן PostgreSQL. אישור שנשמר משוחזר בלי לפנות לספקים. קריסה בין S3 למסד שבה האישור לא נשמר מטופלת כעת בבירור פנימי של אותה זהות, כמפורט בסעיף 6, ללא העלאה עיוורת או בחירת latest. תזמון הבירור, טיפול תפעולי בתוצאה שאינה נפתרת, מחיקה לפי מדיניות והגשת מדיה עם הרשאה נוכחית עדיין אינם ממומשים. אין מסלול הורדה ציבורי והפיילוט נשאר מושבת.


# 5. יומן העלאות וגבולות התאוששות

5.1 יש להחיל [0068](../postgres/migrations/0068_meta_media_upload_journal.sql) ולספק ל־Runtime את `createPostgresMetaMediaUploadJournal(transactions)` מה־[Repository](../server/platform/postgresMetaMediaUploadJournal.ts). הכוונה נכתבת אחרי אימות ההורדה ולפני בקשות S3. זהות המשימה נגזרת מהמקור; יעד, תוכן או מבצע סותרים נדחים. זו אינה עדיין תשתית לאיסוף מועמדי הורדה ולהרצתם ברקע.

| מצב | משמעות והמשך מותר |
|---|---|
| prepared | הכוונה וה־Audit נשמרו; ניתן לבצע Claim |
| claimed | עובד מחזיק Claim עם גרסה ו־Lease של חמש דקות; רק לפני שיגור ניתן לתפוס מחדש לאחר תפוגה |
| dispatching | היתר ההפעלה נשמר; אין Claim או PUT חוזר גם אם תשובת Commit אבדה |
| quarantined | אישור Bucket/Key/Version תואם נשמר; חזרה אליו מחייבת הרשאה ואינה מבצעת Meta/S3 |
| reconciliation-required | נדרש בירור; אישור מאוחר תואם מאותו Claim יכול להישמר |
| rejected | דחיית כתיבה מוכרת נשמרה; אין ניסיון חדש אוטומטי |

5.2 כל שינוי מצב ו־Audit אטומיים. בדיקת Claim אחרי המתנה לנעילה קוראת שוב את שעון המסד. עובד מדור ישן אינו רשאי לשגר או לסיים משימה שנמסרה לעובד אחר. dispatching שפג נשאר רשום ומחזיר RECOVERY_REQUIRED בקריאה; אין סריקת רקע לשינוי המצב.

5.3 אישור ספק נשמר לפני בדיקת ההרשאה הסופית דרך callback פנימי במתאם. פקיעת Lease או ביטול חיבור/בעלים אינם מונעים תיעוד של אותה בקשה שכבר יצאה. החזרת האישור עדיין דורשת הרשאה נוכחית. כשל או אובדן תשובת Commit בעת שמירת האישור אינם גורמים לכתיבת כשל שדורסת הצלחה. אין הבטחת exactly-once בין S3 למסד; אובדן האישור לפני שמירתו נשאר מצב לבירור.

5.4 בירור כתיבה וקריאת תוצאת סריקה לפי גרסה נוספו בסעיף 6. ההמשך הוא תזמון ב־Worker והגשה מורשית. אין בחירת latest או אישור הגשה על סמך quarantined. תרחישי הכשל ואימות השחרור מפורטים בסעיפים 37–38 של [Master Plan](planning/launch-master-plan-2026-09-09.md).


# 6. בירור בקריאה בלבד ותוצאות סריקה

6.1 [מתאם הבירור](../server/platform/s3MetaMediaInspector.ts) משתמש באותו SDK נעול ובאותן בדיקות תצורת Bucket. אין שינוי במדיניות ההסגר. [Runtime](../server/platform/railwayMetaMediaInspectionRuntime.ts) דורש transactions, environment ו־[מיגרציה 0069](../postgres/migrations/0069_meta_media_scan_observations.sql). הוא מופעל במפורש בלבד; אין HTTP, Worker אוטומטי או מסלול לקבלת אירועי לקוח. מקור הסריקה הוא תשובת S3 מאומתת ל־GetObjectTagging לפי גרסה.

6.2 יש להגדיר תפקיד IAM נפרד לבירור, עם הרשאות שש בדיקות התצורה שבסעיף 2.2, s3:ListBucketVersions ל־Bucket ול־Prefix המדיה, s3:GetObjectTagging ו־s3:GetObjectVersionTagging לאובייקטים המורשים, ו־s3:GetObjectVersion עבור HEAD לגרסה מפורשת. קריאת checksum של קובץ KMS מחייבת גם kms:GenerateDataKey ו־kms:Decrypt במפתח המדויק. HEAD משתמש בהרשאת קריאת גרסה, ולכן מדיניות ההסגר עדיין חוסמת אותו ללא תגית נקייה; אין להחריג את תפקיד הבירור מהחסימה. אין להעניק לו PUT, שינוי תגיות, Delete או שינוי תצורת Bucket. גם תפקיד הכתיבה נשאר ללא הרשאות קריאה חדשות. [AWS — HEAD והרשאות KMS](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html), [AWS — קריאת תגיות](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectTagging.html).

6.3 אם כבר נשמר VersionId, קוראים רק אותו. אחרת מתבצעת ListObjectVersions יחידה, עם Prefix של המפתח המלא ו־MaxKeys=2. נדרשת רשימה מלאה של גרסה אחת תואמת וללא Delete Marker; IsLatest אינו משמש לבחירה. תוצאה ריקה אינה מתירה ניסיון כתיבה נוסף. תוצאה חלקית, כמה גרסאות או שגיאת 403/404 נשארות לא פתורות. אין Pagination. [AWS — ListObjectVersions](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectVersions.html).

6.4 תגית GuardDuty חסרה מחזירה PENDING; תוצאות THREATS_FOUND, UNSUPPORTED, ACCESS_DENIED ו־FAILED חוסמות. NO_THREATS_FOUND מאפשר HEAD לאותה גרסה, עם אימות checksum מלא, גודל, כל שדות זהות המקור, KMS ונתוני Content-Type/Disposition. בדיקת תגית נוספת אחרי HEAD מונעת שמירת אישור שהתבסס על תגית שהשתנתה בזמן הבדיקה. אין GET של Bytes, מחיקה, עדכון תגיות או PUT. [GuardDuty — הגנת הקריאה לפי תגית](https://docs.aws.amazon.com/guardduty/latest/ug/tag-based-access-s3-malware-protection.html).

6.5 התצפיות נשמרות לפי משימה/גרסה/תוצאה, עם שיוך ל־Claim ששיגר את ההעלאה. תצפית נקייה מאומתת ואישור שחזור נשמרים יחד עם Audit באותה טרנזקציה. תוצאה מסוכנת מהעבר נשארת חוסמת גם אם תתקבל תוצאה נקייה אחריה; כמה גרסאות יוצרות conflict. תגית חסרה כעת מחזירה pending גם אם תועד בעבר clean-observed. אין כאן מדיניות אוטומטית לשחרור קובץ שנחסם לאחר סריקה חוזרת; נדרש טיפול תפעולי מתוכנן. [Repository](../server/platform/postgresMetaMediaScanRepository.ts).

6.6 ההרשאה נבדקת לפני קריאות אובייקט וגם במנגנון SDK אחרי המתנת Credentials ולפני Transport. תשובה שהתקבלה נשמרת כעובדה לפני בדיקת ההרשאה להחזרתה, כדי לא לאבד ראיות עם ביטול הרשאה. clean-observed הוא ממצא היסטורי ואינו היתר הגשה מתמשך. מסלול הגשה עתידי חייב לבדוק מקור, הרשאה ותגית עדכניים ולהישאר קשור לאותה גרסה. תצפיות יכולות להגיע אחרי ביטול הרשאה אך אינן מפעילות מחדש חיבור או גישה.

6.7 גבולות מקומיים: ניסיון פעיל אחד בכל מופע; 30 שניות לכל בקשת S3 כברירת מחדל. עד עשר בקשות לניסיון עם איתור גרסה, או תשע לגרסה ידועה. אין Backoff או תזמון רקע עדיין; יש להוסיף אותם ב־Worker לפני הפעלה אוטומטית. אין יצירת משאבי AWS או הוכחה לחשבון GuardDuty חי. נדרשים אימות IAM וסריקה אמיתית, הגשה מורשית ומדיניות ניקוי לפני שימוש במוצר.

# 7. הפעלה אוטומטית מבוקרת של מדיה ב־Worker — 10.09.2026

7.1 סעיף זה מעדכן את מצב ההפעלה בסעיפים הקודמים. [Runtime המדיה](../server/platform/railwayMetaMediaWorkerRuntime.ts) מחובר ל־Worker הקיים. META_MEDIA_WORKER_MODE חסר או disabled משאיר אותו כבוי; upload, inspect או cleanup מפעילים תפקיד אחד בלבד. cleanup נוסף ב־10.09.2026 ומפורט בסעיף 12. ערכים אחרים נדחים. אין מצב all ואין תצורת ספק מומצאת כברירת מחדל.

7.2 לפני הפעלה: להחיל מיגרציה 0070 ואת קוד ה־Worker התואם, להגדיר את חמשת משתני S3 שבסעיף 2 ולוודא מדיניות Bucket ו־GuardDuty חיות. תהליך upload משתמש בתפקיד הכתיבה; תהליך inspect בתפקיד הבירור שבסעיף 6.2. כל תהליך משתמש בזהות AWS שסופקה לו דרך סביבתו, בלי הרחבת הרשאות תפקיד הכתיבה או החרגת הבירור מהסגר. העלאה דורשת Graph ו־Vault. שאר משתני ה־Worker הראשי וה־PostgreSQL/Redis/Telemetry עדיין נדרשים במסלול ההפעלה הקיים.

7.3 נרשמת משימה עמידה לפני הורדה; המבצע המקורי נשמר ונבדק מחדש. עד 100 ניסיונות גילוי וחמש עבודות בסדרה לסבב, דקה המתנה בין סבבים, Lease של עשר דקות, עד שלושה ניסיונות upload ועד 12 ניסיונות inspect. Retry משתמש בהשהיה מעריכית מדקה ועד 15 דקות. התזמון המקומי אינו מכסה רשמית ואינו מגביל את מספר התהליכים בפריסה. יש להתאים את מספר התהליכים לתקציב ולזיכרון בפועל.

7.4 יומן העלאה לאחר dispatch אינו נשלח שוב ל־PUT. משימת הבירור נוצרת אטומית בסיום או מגילוי עצמאי של היומן לאחר קריסה. Retry בתור אינו איפוס כוונת העלאה. pending/missing חוזרים לבדיקה עד מיצוי הניסיונות; blocked/conflict נעצרים; recovery-required נשמר לטיפול תפעולי. אין פעולת reset, שינוי מבצע או החלפת יעד דרך מסלול זה.

7.5 הלולאות עצמאיות מהנעילה הכללית של הקמפיינים. Startup אינו ממתין לסבב מדיה; shutdown מונע עבודות חדשות וממתין לעבודה הפעילה לפני סגירת Pool. בדיקות Claim עוצרות עבודה שהתיישנה; סיווג כשל נעילה/מסד אינו הופך לביטול בעלות קבוע. שש בדיקות תצורת Bucket מקבילות עשויות כבר להיות בטיסה; הבדיקה שלאחריהן חוסמת פעולת אובייקט. ראיות שהתקבלו נשמרות לפני בדיקת ההיתר להחזירן.

7.6 הקוד אינו מפעיל חשבונות חסרים. לא נפרס Worker חי ולא נוצרו Bucket, IAM, KMS או GuardDuty. נדרשים אימות תשתית חי, טיפול תפעולי, הרשאת הגשה לפי גרסה ובדיקה עדכנית, ניקוי וחיבור ל־Inbox. תוצאת clean-observed אינה הרשאת גישה לקובץ. [תוכנית וראיות](planning/launch-master-plan-2026-09-09.md).

# 8. אבחון לבעל סביבת העבודה — 10.09.2026

8.1 מסך /workspace/media-tasks קורא את meta.media-tasks.read דרך Vercel BFF ו־Railway. נדרשים זהות שירות, משתמש מאומת, Tenant שנפתר בשרת ו־workspace.manage. בדיקת בעלים נוכחי ומצב Tenant מתבצעת שוב באותה שאילתת PostgreSQL שקוראת את העמוד. המסך זמין לאבחון גם לאחר ניתוק Meta, ואינו מחליף את המבצע המקורי של משימת Worker.

8.2 התצוגה כוללת עד 50 משימות בכל עמוד, מצב, ניסיונות, תזמון, Lease שפג וראיות סריקה היסטוריות. Cursor שייך ל־Tenant הנוכחי ומבוסס על זהות קבועה. אין סינון חופשי, count כולל או רענון אוטומטי. תגית נקייה שהתקבלה בעבר אינה בדיקה עדכנית, ואינה מתירה הגשה. כאשר לא נשמרה סיבה מדויקת, מוצג שהיא אינה זמינה.

8.3 ל־Reader אין תלות ב־AWS Client, ב־Meta או ב־Vault; הוא אינו מבצע כתיבות. DTO אינו כולל Bytes, מזהי ספק/אחסון, מבצע או מזהה Tenant. אין כפתור reset, העברת בעלות, ניסיון PUT חדש, הגשת קובץ או שינוי ראיית סריקה. בירור שמצריך פעולה נוספת דורש מסלול תפעולי נפרד; אין לתקן ידנית טבלאות כדי לעקוף יומן שיגור.

8.4 הקוד והבדיקות המקומיות אינם הוכחת הפעלה חיה. נדרשים חשבונות ותצורה חיה למסד ולזהות, IAM/GuardDuty/Meta, הגשת קבצים מורשית ומדיניות ניקוי. [תוכנית וראיות](planning/launch-master-plan-2026-09-09.md).


# 9. קריאת קובץ פנימית עם הרשאה עדכנית — 10.09.2026

9.1 [Runtime הקריאה](../server/platform/railwayMetaMediaFileReadRuntime.ts) מורכב במפורש מ־PostgreSQL, תצורת S3 ומתאם קריאה. אין מתג הפעלה או Route חדש. [השירות](../server/meta/metaMediaFileRead.ts) מקבל TenantSession מאומת, messageKey וצרכן פנימי; אינו מקבל יעד אחסון מהלקוח ואינו מחזיר URL. נדרשים conversations.read ב־Membership נוכחי, מקור מדיה תקף, אישור גרסה וראיה נקייה בלי ראיות חוסמות או סתירה. המבצע ההיסטורי אינו מוחלף, ואין דרישה שהוא יישאר הבעלים לצורך קריאת משתמש אחר שמורשה כעת.

9.2 לתפקיד הקריאה הייעודי נדרשות שש בדיקות תצורת Bucket, GetObjectVersionTagging ו־GetObjectVersion עבור האובייקטים המורשים, ו־kms:GenerateDataKey ו־kms:Decrypt במדיניות IAM ובמדיניות מפתח KMS המדויק, לפי חוזה GetObject עבור SSE-KMS. אין ListBucketVersions, PUT, שינוי תגיות, מחיקה או החרגה מהגנת ההסגר. מדיניות ה־Bucket הקיימת חייבת להמשיך לחסום קריאה ללא תגית נקייה. יש לאמת את IAM/KMS/GuardDuty החיים לפני הפעלה. [AWS — GET והרשאות](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html).

9.3 אחרי Preflight נקראת תגית הגרסה. תוצאה חסרה/חוסמת נשמרת ומונעת GET. תוצאה נקייה מאפשרת GET מלא לפי VersionId עם ChecksumMode=ENABLED ו־ExpectedBucketOwner. נבדקים סטטוס 200, גרסה, גודל, SHA-256 מפורסם ומחושב, Metadata מדויק, KMS, Attachment ו־no-store. Range, קידוד גוף שאינו identity, הפניה, Multipart או גרסה סותרת נדחים. לאחר הגוף נקראת שוב התגית; העובדה נשמרת וההרשאה נבדקת שוב לפני הצרכן. אין הסתמכות על ETag, latest, HEAD חלופי או קישור חתום.

9.4 ברירת המחדל היא 30 שניות לכל בקשה; Timeout של GET כולל גוף ו־Hash. עד תשע בקשות S3, עד 100 MiB ופעולה אחת פעילה למופע, כולל זמן הצרכן. Buffer פרטי מאופס כש־withFile מסתיים גם אם הצרכן נכשל; הצרכן חייב להשלים את שימושו ב־Bytes לפני סיום ה־Promise. אין הבטחה שזה כל הזיכרון לתהליך; SDK/Hash וצרכן ההעברה מוסיפים תקורה. נדרשת מדידה בפריסה. close מונע קריאות S3 חדשות; קריאה שעדיין באימות נעצרת בבדיקת הסגירה או ב־Timeout. הוא אינו מבטל מידע שהצרכן כבר קיבל.

9.5 בדיקות המסד קצרות ומסתיימות לפני S3. נעילת Upload Job מסדרת קריאת ראיות מול כותב הסריקה. מקור ההודעה נקרא שוב לאחר ההמתנות כדי לתפוס מחיקת Echo. בדיקות מקור, משתמש ותגית הן גבולות זמן נפרדים; אין טרנזקציה חוצת PostgreSQL/S3/דפדפן ואין ביטול בדיעבד של Bytes שכבר נמסרו. תצפית ספק שכבר התקבלה נשמרת גם לאחר ביטול הרשאה; היא אינה מחזירה גישה.

9.6 נתיב הורדה בינארי מאומת ב־Railway, Audit גישה שמזהה את הקורא הנוכחי, חיבור ה־Inbox, ביטול לקוח, Backpressure, מכסות פריסה ומדידת זיכרון עדיין נדרשים. ה־Audit הקיים של תצפיות סריקה קשור למשימת ההעלאה ולמבצע ההיסטורי; הוא אינו יומן הורדות המשתמשים. ה־JSON BFF הקיים אינו מוביל Bytes או Base64. אין שינוי בזמינות הקובץ בממשק או בסטטוס השלמת הסנכרון. נדרשים גם ניקוי, טיפול תפעולי וראיות AWS/Meta חיות. [תוכנית וראיות, סעיף 41](planning/launch-master-plan-2026-09-09.md).

# 10. נתיב HTTP וכפתור Inbox — 10.09.2026

10.1 סעיף זה מעדכן את גבול המימוש של סעיף 9: נוספו [Handler מאומת](../server/platform/railwayMetaMediaFileHttpHandler.ts), [כתיבת Node](../server/platform/railwayNodeMediaFileResponse.ts), [Audit ומכסה](../server/platform/postgresMetaMediaFileAdmission.ts) וכפתור Inbox. הקריאה אינה עוברת ב־JSON BFF. מופעלת ב־Railway Postgres API וב־BullMQ API רק כאשר META_MEDIA_FILE_READ_MODE=enabled; נדרשת אותה תצורת S3 ותפקיד קורא נפרד כמפורט ב־9.2. Web דורש NEXT_PUBLIC_META_MEDIA_DOWNLOAD_ORIGIN בזמן Build. ערך לא קנוני אינו מפעיל כפתור; תצורת שרת פעיל שאינה תקינה חוסמת עלייה.

10.2 Clerk Bearer מאומת בשרת. CORS מוגבל ל־APP_PUBLIC_ORIGIN ול־GET עם Authorization. Membership, בחירת סביבת עבודה וארגון נבדקים שוב לאורך הקריאה; ההרשאה האחרונה היא לפני תחילת כתיבת הקובץ. Audit של read-admitted נשמר לפני S3 ומכיל רק Tenant, קורא, action ומפתח הודעה. ניסיון מבוטל/נכשל לאחר קבלה נשאר נספר; אין טענה שנשמר קובץ אצל המשתמש. מכסת Connect היא 10 ניסיונות ב־60 שניות לכל משתמש ו־Tenant, במשותף בין מופעים.

10.3 גוף מאומת עד 100 MiB נשאר פרטי עד כל בדיקות הסריקה/מקור. בזמן כתיבה Node מעתיק עד 64 KiB למקטע וממתין ל־Callback, ולבסוף ל־finish לפני חזרת הצרכן. 120 שניות כוללות אימות, S3 ומסירה; בקשה אחת פעילה למופע וללא תור בזיכרון. ביטול/ניתוק/כיבוי מפעילים AbortSignal. פעולה שעדיין ממתינה לתלות אינה מפנה את המקום שלה עם Timeout בלבד. Body/Blob בצד הדפדפן נבדקים בגודל ובכותרות; קובץ חלקי אינו נשמר. Blob URL הוא ידית מקומית זמנית של הדפדפן, ונשללת לאחר הפעלת השמירה; אינה כתובת S3 או מזהה מוצר.

10.4 בדיקות מסד, HTTP ודפדפן עברו מקומית; תוכן הבדיקה הוא public/og.png מהמאגר. נדרשים מדידת זיכרון ותעבורה בקבצים גדולים, CORS/TLS בדומיינים חיים, אימות IAM/KMS/GuardDuty/Clerk, תפעול תוצאות חסומות, ניקוי ושלמות הייבוא. 100 MiB אינו תקרת הזיכרון הכוללת: SDK, Hash, Buffer ו־Blob עשויים להחזיק עותקים נוספים. גם finish אינו אישור שהמשתמש שמר את הקובץ. אין מסירה אטומית מול שינוי הרשאה או ביטול בדיעבד. [Master Plan, סעיף 42](planning/launch-master-plan-2026-09-09.md).

# 11. בקשת בעלים לניסיון בירור נוסף — 10.09.2026

11.1 מסך האבחון מאפשר לבעלים הנוכחי לבקש בדיקה נוספת רק למשימת inspect שהגיעה ל־recovery-required עקב מיצוי ניסיונות. זו קריאה חוזרת של תוצאת הסריקה הקיימת באמצעות ה־Worker. אין PUT, שינוי תגית או התחלת סריקה חדשה ב־GuardDuty. AWS מתעד ש־GetObjectTagging קורא את קבוצת התגיות, ושימוש ב־VersionId בוחר גרסת אובייקט מסוימת. [AWS — GetObjectTagging, נבדק 10.09.2026](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectTagging.html).

11.2 ברירת הבסיס נשארת 12 ניסיונות אוטומטיים. מיגרציה [0071](../postgres/migrations/0071_meta_media_inspection_retry.sql) מוסיפה עד שלוש בקשות מפורשות, עם ניסיון אחד לכל בקשה. מספר הניסיונות אינו מתאפס; התקרה הכוללת היא 15 רק אחרי שלוש בקשות. בקשה חוזרת זהה אינה צורכת בקשה נוספת. כשל קבוע מוקדם, upload, ביטול, חסימה וסתירת גרסאות אינם נפתחים מחדש. אלה גבולות Connect בבעלות Tal, לא מכסות AWS או Meta.

11.3 נדרשים מקור וחיבור תקפים, בעלים מבקש פעיל והמבצע המקורי שעדיין פעיל כבעלים. Identity ביומן ובתור נשמרת גם כשהמבקש הוא בעלים אחר. Worker קיים מאמת שוב הרשאות ומקור לפני תעבורת S3. אם בוטלה ההרשאה אחרי הקליטה, הבקשה יכולה להסתיים בביטול בלי קריאת ספק. בקשת HTTP אינה אישור שהבדיקה כבר רצה או שהקובץ בטוח.

11.4 כל THREATS_FOUND, UNSUPPORTED, ACCESS_DENIED או FAILED בהיסטוריה ממשיך לחסום בקשה חדשה, גם אחרי ראיה נקייה. AWS מבדיל בין התוצאות ובין סיבת כשל סריקה והרשאות. קריאת תגית נוספת לבדה אינה מתקנת אותן; טיפול תפעולי וניקוי נשארים פתוחים. [AWS — תוצאות Malware Protection for S3, נבדק 10.09.2026](https://docs.aws.amazon.com/guardduty/latest/ug/monitoring-malware-protection-s3-scans-gdu.html).

11.5 לפני פריסה נדרשת מיגרציה 0071; בסכמה כעת 72 מיגרציות PostgreSQL, מהן 43 ליעד בלבד. Web, API ו־Worker משתמשים ב־version וב־operatorRetries המעודכנים ולכן יש לפרוס אותם בתיאום. תהליך מומלץ: להשהות Worker, להחיל מיגרציה, לפרוס API/Worker ו־Web, לבדוק בריאות ואז להפעיל inspect. זו הכנה לפריסה; לא הופעלה סביבה חיה בסבב זה. Worker כבוי משאיר בקשה בתור. אין שינוי ב־IAM/KMS, במתגי הפעלה קיימים, במכסת ההורדות או בהרשאות קריאת הקובץ. [חוזה API](vercel-railway-api-contract.md), [Master Plan, סעיף 43](planning/launch-master-plan-2026-09-09.md).

# 12. הסרה מפורשת של עותק בהסגר — 10.09.2026

12.1 הבעלים מאשר בממשק הסרת עותק יחיד, עם jobKey ו־expectedVersion. נדרשים
אישור העלאה שמור, inspect במצב blocked או recovery-required, היעדר עבודה
פעילה והיעדר ראיות לגרסה אחרת. אין השלמת VersionId בהשערה או בחירת latest.
הבקשה ו־Audit אטומיים. מה־Commit נחסמת גישה גם אם המחיקה עדיין ממתינה,
בוטלה או דורשת בירור. אין העלאה מחדש, איפוס משימה או מחיקת ההודעה והראיות.

12.2 התהליך דורש META_MEDIA_WORKER_MODE=cleanup וחמש הגדרות S3 הקיימות.
יש לתת לתפקיד נפרד הרשאות שש בדיקות ה־Bucket הקיימות ו־s3:DeleteObjectVersion
למרחב המפתחות המאושר. אין צורך ב־GetObject, PUT, ListObjectVersions,
שינוי תגיות או s3:BypassGovernanceRetention לצורך פעולה זו. המימוש אינו שולח
BypassGovernanceRetention או MFA. Object Lock/MFA Delete יכולים לדחות את
הבקשה; יש להשאיר דחייה זו לבירור. אין כאן התקנת IAM או הפעלת שירות בפועל.

12.3 אחרי בדיקות ה־Bucket נשלח DeleteObject עם Bucket, Key, VersionId
ו־ExpectedBucketOwner הקבועים. הרשאת הבעלים המבקש נבדקת שוב לפני התעבורה,
כולל אחרי טעינת Credentials. המבצע המקורי יכול להיות לא פעיל והמקור יכול
להיות מנותק; אין בכך שינוי בהרשאות קריאה או בדיקה חוזרת.

12.4 HTTP 204 תקין נשמר כ־removed: אישור S3 להסרת הגרסה, לרבות יעד שכבר
אינו קיים. DeleteMarker=true, VersionId סותר או תשובה אחרת אינם הצלחה.
דחיית 403/Object Lock מחייבת בירור. תוצאה לא ידועה מקבלת עד שלושה ניסיונות
בסך הכול לאותה גרסה, 60/120 שניות השהיה ו־Claim לעשר דקות. אין SDK retry.
פעולה אחת פעילה, עד חמש משימות בסבב ודקה בין סבבים; עד שבע בקשות S3 לניסיון,
עם Timeout ברירת מחדל של 30 שניות לבקשה. אחרי Timeout אין פעולה נוספת לפני
סיום התלות הקודמת. כיבוי מבטל תעבורה ומסיים את הלולאה; אישור שהתקבל נרשם
תחת Claim תקף גם אם הבעלות השתנתה בזמן DELETE.

12.5 סדר פריסה: להשהות Workers של מדיה, להחיל 0072, לפרוס API/Worker ו־Web
עם canCleanup ו־cleanup ב־DTO, לבדוק בריאות ואז להפעיל תפקידים בנפרד.
מצב חסר/disabled נשאר כבוי. כעת 73 מיגרציות PostgreSQL, 44 מהן ליעד בלבד;
D1 נשאר 43 מיגרציות ו־55 טבלאות. אין שינוי במדיניות שמירה כללית: ניקוי לפי
גיל, גרסה לא ידועה, סתירת גרסאות ומחיקה ממערכות אחרות אינם מכוסים.

12.6 [AWS — DeleteObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html)
ו־[AWS — Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html)
נבדקו ב־10.09.2026. [המימוש](../server/platform/s3MetaMediaCleanupStorage.ts),
[המיגרציה](../postgres/migrations/0072_meta_media_cleanup.sql),
[האימות המקומי והגבולות, סעיף 44](planning/launch-master-plan-2026-09-09.md).
