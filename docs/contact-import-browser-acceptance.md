# ראיית Browser מקומית — ייבוא אנשי קשר

תאריך אימות: 2026-08-17

## 1. היקף

1.1 הבדיקה הורצה בדפדפן Chromium אמיתי מול `vinext start` מקומי ובנתיב
`/workspace/contacts`.

1.2 קובצי הבדיקה נוצרו דטרמיניסטית לצורכי Acceptance בלבד, נשמרו מחוץ
ל־Git ולא כללו PII, ‏Secrets או פרטי לקוח.

1.3 הבדיקה מוכיחה את מסלול Browser המקומי בלבד. היא אינה ראיית Staging,
אינה מוכיחה הרשאת Tenant אמיתית ואינה מחליפה שמירה ל־D1 מבודד.

## 2. מסלול חיובי

2.1 קובץ XLSX תקין בעל גיליון יחיד נטען בהצלחה.

2.2 הממשק הציג שתי כותרות ושתי שורות ושמר על ערכי הטלפון כמחרוזות.

2.3 עמודות הטלפון והשם מופו, Preview נוצר ו־Quality audit דיווח על שתי
שורות תקינות, אפס מספרים חסרים ואפס כפילויות.

2.4 שלב ההכנה לייבוא הסתיים במצב "המיפוי מוכן לייבוא". פעולת השמירה
נשארה מושבתת כנדרש, משום שבסביבה המקומית לא הוגדרו Clerk, ‏Tenant ו־D1
מורשים.

## 3. מסלול שלילי

3.1 קובץ XLSX שהכיל Formula נחסם לפני יצירת Mapping.

3.2 הודעת הכשל הוצגה כ־`role="alert"` והסבירה שיש להמיר נוסחאות לערכים.

3.3 לאחר החסימה לא נשאר Mapping מהקובץ הקודם ולא הוצגה אפשרות להמשיך
לייבוא.

## 4. ממצאי Runtime שתוקנו

4.1 בדיקת הדפדפן חשפה ש־Clerk מפרסם Adapter מסוג ESM שמכיל `require()`
גולמי. ‏Vinext production build ממיר אותו, אך Cloudflare Vite dev runner
הריץ אותו כ־ESM וקרס עם `require is not defined`.

4.2 `vite.config.ts` מפנה רק בזמן `serve` ורק עבור ה־private import המדויק
של Clerk ל־ESM מקומי שקול. Build ו־Production ממשיכים להשתמש בחבילה
הרשמית.

4.3 Clerk ו־`next/link` מוחרגים מ־Dependency pre-bundling בכל סביבות
Client/RSC/SSR כדי למנוע זהויות Module לא עקביות לאחר Re-optimization.

4.4 נוסף `public/favicon.svg` וקישור סטטי ב־Root Layout. הוא אינו משתמש
ב־Route-scoped Metadata ולכן אינו משכפל מפתחות נתיב רגישים ל־HTML.

## 5. תוצאות קבלה

5.1 Browser acceptance מקומי: **PASS**.

5.2 Dev Runtime smoke על `/workspace/contacts`: **PASS — HTTP 200**.

5.3 פער חיצוני שנותר לפני Pilot: בדיקת Staging עם קובץ מורשה אמיתי,
זהות Clerk אמיתית, Tenant מורשה, D1 מבודד ואימות הרשומה שנשמרה.
