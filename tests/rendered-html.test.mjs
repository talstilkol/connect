import assert from "node:assert/strict";
import test from "node:test";

let renderSequence = 0;

async function render(pathname = "/") {
  renderSequence += 1;
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${renderSequence}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, "http://localhost/"), {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the public Connect landing page in Hebrew", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="he"[^>]*dir="rtl"/i);
  assert.match(html, /<title>Connect \| WhatsApp Business Platform<\/title>/i);
  assert.match(html, /מנהלים WhatsApp עסקי/);
  assert.match(
    html,
    /href="#public-content"[^>]*>דילוג לתוכן הראשי/,
  );
  assert.match(html, /React מנהל את הממשק/);
  assert.match(html, /החבילות והמחירים טרם הוגדרו/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("server-renders the workspace dashboard", async () => {
  const response = await render("/workspace");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /מרכז השליטה/);
  assert.match(
    html,
    /href="#workspace-content"[^>]*>דילוג לתוכן הראשי/,
  );
  assert.match(html, /הגדרת Meta חסרה/);
  assert.match(html, /נדרשת הגדרת Meta בצד השרת/);
  assert.match(html, /בדיקת דרישות/);
  assert.match(html, /0 מתוך 10/);
  assert.match(html, /השלמת פרטי העסק/);
  assert.doesNotMatch(html, /השלב הראשון: חיבור רשמי ל־Meta/);
  assert.match(
    html,
    /החלטות חוסמות Production/,
  );
});

test("server-renders the system admin route in a fail-closed state", async () => {
  const response = await render("/admin");

  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(
    html,
    /סביבת Admin אינה מוגדרת/,
  );
  assert.match(
    html,
    /נדרשות תצורות Clerk/,
  );
  assert.doesNotMatch(
    html,
    /יצירת מנוי ידני/,
  );
});

test("server-renders the production decision admin route in a fail-closed state", async () => {
  const response = await render(
    "/admin/decisions",
  );

  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(
    html,
    /סביבת Admin אינה מוגדרת/,
  );
  assert.match(
    html,
    /לפני ניהול החלטות/,
  );
  assert.doesNotMatch(
    html,
    /name="rationale"/,
  );
});

test("server-renders every Admin boundary in English and Arabic", async () => {
  const responses = await Promise.all([
    render("/admin?lang=en"),
    render("/admin?lang=ar"),
    render("/admin/decisions?lang=en"),
    render("/admin/decisions?lang=ar"),
    render("/admin/whatsapp-delivery-policy/1?lang=en"),
    render("/admin/whatsapp-delivery-policy/1?lang=ar"),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 200);
  }

  const [
    englishTenants,
    arabicTenants,
    englishDecisions,
    arabicDecisions,
    englishPolicy,
    arabicPolicy,
  ] = await Promise.all(
    responses.map((response) => response.text()),
  );

  assert.match(englishTenants, /Admin environment is not configured/);
  assert.match(arabicTenants, /بيئة Admin غير معدّة/);
  assert.match(englishDecisions, /before managing decisions/);
  assert.match(arabicDecisions, /قبل إدارة القرارات/);
  assert.match(englishPolicy, /before managing delivery policy/);
  assert.match(arabicPolicy, /قبل إدارة سياسة الإرسال/);

  for (const html of [englishTenants, englishDecisions, englishPolicy]) {
    assert.match(html, /class="admin-state-shell" dir="ltr" lang="en"/);
    assert.doesNotMatch(html, /סביבת Admin אינה מוגדרת/);
  }

  for (const html of [arabicTenants, arabicDecisions, arabicPolicy]) {
    assert.match(html, /class="admin-state-shell" dir="rtl" lang="ar"/);
    assert.doesNotMatch(html, /סביבת Admin אינה מוגדרת/);
  }
});

test("server-renders local business profile completeness boundaries", async () => {
  const response = await render("/workspace/onboarding");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /שלמות פרופיל העסק/);
  assert.match(html, /שלמות פרטי העסק/);
  assert.match(html, /שמירת פרטי העסק מקומית/);
  assert.match(html, /לא נוצר Tenant/);
});

test("server-renders localized Dashboard and Onboarding content", async () => {
  const [englishDashboard, arabicOnboarding] =
    await Promise.all([
      render("/workspace?lang=en"),
      render("/workspace/onboarding?lang=ar"),
    ]);

  assert.equal(englishDashboard.status, 200);
  assert.equal(arabicOnboarding.status, 200);

  const [englishHtml, arabicHtml] = await Promise.all([
    englishDashboard.text(),
    arabicOnboarding.text(),
  ]);

  assert.match(englishHtml, /Control center/);
  assert.match(englishHtml, /10 steps to the first message/);
  assert.match(englishHtml, /Server-side Meta configuration required/);
  assert.match(arabicHtml, /إعداد مساحة العمل/);
  assert.match(arabicHtml, /الخطوة 1 من 10/);
  assert.match(arabicHtml, /مسار الإعداد/);
});

test("server-renders the complete bot-flow workspace in English and Arabic", async () => {
  const [englishResponse, arabicResponse] = await Promise.all([
    render("/workspace/bot?lang=en"),
    render("/workspace/bot?lang=ar"),
  ]);

  assert.equal(englishResponse.status, 200);
  assert.equal(arabicResponse.status, 200);

  const [englishHtml, arabicHtml] = await Promise.all([
    englishResponse.text(),
    arabicResponse.text(),
  ]);

  assert.match(englishHtml, /Bot flow builder/);
  assert.match(englishHtml, /Flow library/);
  assert.match(englishHtml, /Keywords — one per line/);
  assert.doesNotMatch(englishHtml, /ספריית תהליכים/);

  assert.match(arabicHtml, /منشئ مسارات البوت/);
  assert.match(arabicHtml, /مكتبة المسارات/);
  assert.match(arabicHtml, /الكلمات المفتاحية — واحدة في كل سطر/);
  assert.doesNotMatch(arabicHtml, /ספריית תהליכים/);
});

test("server-renders the complete contacts surface in English and Arabic", async () => {
  const [englishResponse, arabicResponse] = await Promise.all([
    render("/workspace/contacts?lang=en"),
    render("/workspace/contacts?lang=ar"),
  ]);

  assert.equal(englishResponse.status, 200);
  assert.equal(arabicResponse.status, 200);

  const [englishHtml, arabicHtml] = await Promise.all([
    englishResponse.text(),
    arabicResponse.text(),
  ]);

  assert.match(englishHtml, /Persistent contact management/);
  assert.match(englishHtml, /Review a file before importing/);
  assert.match(englishHtml, /Choose a contact file/);
  assert.match(englishHtml, /Current implementation boundary/);
  assert.doesNotMatch(englishHtml, /ניהול אנשי קשר קבוע/);

  assert.match(arabicHtml, /إدارة جهات الاتصال الدائمة/);
  assert.match(arabicHtml, /فحص ملف قبل الاستيراد/);
  assert.match(arabicHtml, /اختيار ملف جهات اتصال/);
  assert.match(arabicHtml, /حد التنفيذ الحالي/);
  assert.doesNotMatch(arabicHtml, /ניהול אנשי קשר קבוע/);
});

test("server-renders the complete template surface in English and Arabic", async () => {
  const [englishResponse, arabicResponse] = await Promise.all([
    render("/workspace/templates?lang=en"),
    render("/workspace/templates?lang=ar"),
  ]);

  assert.equal(englishResponse.status, 200);
  assert.equal(arabicResponse.status, 200);

  const [englishHtml, arabicHtml] = await Promise.all([
    englishResponse.text(),
    arabicResponse.text(),
  ]);

  assert.match(englishHtml, /Persistent templates/);
  assert.match(englishHtml, /Template setup/);
  assert.match(englishHtml, /Save local rehearsal/);
  assert.match(englishHtml, /Message preview/);
  assert.doesNotMatch(englishHtml, /תבניות שמורות/);

  assert.match(arabicHtml, /قوالب دائمة/);
  assert.match(arabicHtml, /إعداد القالب/);
  assert.match(arabicHtml, /حفظ التجربة محليًا/);
  assert.match(arabicHtml, /معاينة الرسالة/);
  assert.doesNotMatch(arabicHtml, /תבניות שמורות/);
});

test("server-renders both campaign flows in English and Arabic", async () => {
  const [englishResponse, arabicResponse] = await Promise.all([
    render("/workspace/campaigns?lang=en"),
    render("/workspace/campaigns?lang=ar"),
  ]);

  assert.equal(englishResponse.status, 200);
  assert.equal(arabicResponse.status, 200);

  const [englishHtml, arabicHtml] = await Promise.all([
    englishResponse.text(),
    arabicResponse.text(),
  ]);

  assert.match(englishHtml, /Campaign draft/);
  assert.match(englishHtml, /Local draft completeness/);
  assert.match(englishHtml, /No approved templates/);
  assert.match(englishHtml, /Delivery blocked/);
  assert.doesNotMatch(englishHtml, /שלמות הטיוטה המקומית/);

  assert.match(arabicHtml, /مسودة حملة/);
  assert.match(arabicHtml, /اكتمال المسودة المحلية/);
  assert.match(arabicHtml, /لا توجد قوالب معتمدة/);
  assert.match(arabicHtml, /الإرسال محظور/);
  assert.doesNotMatch(arabicHtml, /שלמות הטיוטה המקומית/);
});

test("server-renders the conversation inbox boundary in English and Arabic", async () => {
  const [englishResponse, arabicResponse] = await Promise.all([
    render("/workspace/inbox?lang=en"),
    render("/workspace/inbox?lang=ar"),
  ]);

  assert.equal(englishResponse.status, 200);
  assert.equal(arabicResponse.status, 200);

  const [englishHtml, arabicHtml] = await Promise.all([
    englishResponse.text(),
    arabicResponse.text(),
  ]);

  assert.match(englishHtml, /Conversation inbox/);
  assert.match(englishHtml, /Inbox unavailable/);
  assert.match(
    englishHtml,
    /Conversations are not loaded and no fallback display data is created/,
  );
  assert.doesNotMatch(englishHtml, /תיבת השיחות אינה זמינה/);

  assert.match(arabicHtml, /صندوق المحادثات/);
  assert.match(arabicHtml, /صندوق المحادثات غير متاح/);
  assert.match(arabicHtml, /لا يتم تحميل المحادثات/);
  assert.doesNotMatch(arabicHtml, /תיבת השיחות אינה זמינה/);
});

test("server-renders the AI agent boundary in English and Arabic", async () => {
  const [englishResponse, arabicResponse] = await Promise.all([
    render("/workspace/ai?lang=en"),
    render("/workspace/ai?lang=ar"),
  ]);

  assert.equal(englishResponse.status, 200);
  assert.equal(arabicResponse.status, 200);

  const [englishHtml, arabicHtml] = await Promise.all([
    englishResponse.text(),
    arabicResponse.text(),
  ]);

  assert.match(englishHtml, /AI agent library/);
  assert.match(
    englishHtml,
    /Configure Clerk and D1 before loading or saving AI agents/,
  );
  assert.match(englishHtml, /Server readiness check/);
  assert.match(englishHtml, /No saved knowledge sources/);
  assert.doesNotMatch(englishHtml, /ספריית סוכני AI/);

  assert.match(arabicHtml, /مكتبة وكلاء AI/);
  assert.match(arabicHtml, /يجب إعداد Clerk وD1/);
  assert.match(arabicHtml, /فحص الجاهزية على الخادم/);
  assert.match(arabicHtml, /لا توجد مصادر معرفة محفوظة/);
  assert.doesNotMatch(arabicHtml, /ספריית סוכני AI/);
});

test("server-renders auth and workspace feature routes", async () => {
  const [
    loginResponse,
    templateResponse,
    contactsResponse,
    campaignsResponse,
    inboxResponse,
    aiResponse,
    decisionsResponse,
  ] = await Promise.all([
    render("/login"),
    render("/workspace/templates"),
    render("/workspace/contacts"),
    render("/workspace/campaigns"),
    render("/workspace/inbox"),
    render("/workspace/ai"),
    render("/workspace/decisions"),
  ]);

  assert.equal(loginResponse.status, 200);
  assert.equal(templateResponse.status, 200);
  assert.equal(contactsResponse.status, 200);
  assert.equal(campaignsResponse.status, 200);
  assert.equal(inboxResponse.status, 200);
  assert.equal(aiResponse.status, 200);
  assert.equal(
    decisionsResponse.status,
    200,
  );

  const [
    loginHtml,
    templateHtml,
    contactsHtml,
    campaignsHtml,
    inboxHtml,
    aiHtml,
    decisionsHtml,
  ] =
    await Promise.all([
      loginResponse.text(),
      templateResponse.text(),
      contactsResponse.text(),
      campaignsResponse.text(),
      inboxResponse.text(),
      aiResponse.text(),
      decisionsResponse.text(),
    ]);

  assert.match(loginHtml, /Clerk מוכן לחיבור אך טרם הופעל/);
  assert.match(loginHtml, /לא נוצר משתמש חלופי ולא בוצעה כניסה מדומה/);
  assert.doesNotMatch(loginHtml, /name="password"/);
  assert.match(templateHtml, /תבניות הודעה/);
  assert.match(templateHtml, /תבניות שמורות/);
  assert.match(templateHtml, /סנכרון מול Meta/);
  assert.match(templateHtml, /תרגול מקומי/);
  assert.match(
    templateHtml,
    /שמירת תרגול מקומי/,
  );
  assert.match(
    templateHtml,
    /יימחק ברענון ולא יישלח ל־Meta/,
  );
  assert.match(templateHtml, /Footer — רשות/);
  assert.match(templateHtml, /Quick Reply/);
  assert.match(templateHtml, /Call to Action/);
  assert.match(templateHtml, /מסלול כפתורים/);
  assert.match(contactsHtml, /בחירת קובץ אנשי קשר/);
  assert.match(contactsHtml, /הנתונים אינם מועלים/);
  assert.match(contactsHtml, /ניהול אנשי קשר קבוע/);
  assert.match(contactsHtml, /Clerk אינו מוגדר/);
  assert.doesNotMatch(contactsHtml, /שמירת איש קשר/);
  assert.match(campaignsHtml, /טיוטת קמפיין/);
  assert.match(campaignsHtml, /שלמות תכנון/);
  assert.match(campaignsHtml, /שלמות הטיוטה המקומית/);
  assert.match(campaignsHtml, /אין תבניות מאושרות/);
  assert.match(campaignsHtml, /אין טיוטת Template מקומית/);
  assert.match(campaignsHtml, /יש לשמור תחילה טיוטת Template מקומית/);
  assert.match(campaignsHtml, /השליחה חסומה/);
  assert.match(inboxHtml, /תיבת שיחות/);
  assert.match(
    inboxHtml,
    /לא נטענות שיחות ולא נוצרים נתוני תצוגה חלופיים/,
  );
  assert.doesNotMatch(
    inboxHtml,
    /חיפוש בשיחות|פתוחות|ממתינות|סגורות/,
  );
  assert.doesNotMatch(
    inboxHtml,
    /תשובה מוצעת|אישור התשובה|אישור נציג/,
  );
  assert.match(aiHtml, /ספריית סוכני AI/);
  assert.match(aiHtml, /Agent Definition/);
  assert.match(aiHtml, /בדיקת מוכנות שרתית/);
  assert.match(
    aiHtml,
    /נדרשת הגדרת Clerk ו־D1/,
  );
  assert.match(
    aiHtml,
    /אין מקורות ידע שמורים/,
  );
  assert.match(
    aiHtml,
    /העלאה תופעל רק לאחר הגדרת R2/,
  );
  assert.doesNotMatch(
    aiHtml,
    /מדיניות-שירות\.pdf|מענה מבוסס ידע/,
  );
  assert.match(
    decisionsHtml,
    /מקור הנתונים זהה לשער המוכנות/,
  );
  assert.match(
    decisionsHtml,
    /AI_PROVIDER_DECISION_REQUIRED/,
  );
  assert.doesNotMatch(
    decisionsHtml,
    /textarea|החלטה \/ הערה/,
  );
});

test("server-renders a private read-only invitation landing route", async () => {
  const invitationKey =
    `team_invitation_v1_${"a".repeat(64)}`;
  const response = await render(
    `/invite/${invitationKey}`,
  );

  assert.equal(response.status, 200);
  const html =
    await response.text();

  assert.match(
    html,
    /הזמנה להצטרף לצוות/,
  );
  assert.match(
    html,
    /מבנה הקישור תקין/,
  );
  assert.match(
    html,
    /קבלת ההזמנה[^<]*<\/button>/,
  );
  assert.match(
    html,
    /disabled=""/,
  );
  assert.match(
    html,
    /name="robots" content="noindex, nofollow"/,
  );
  assert.match(
    html,
    /name="referrer" content="no-referrer"/,
  );
  const visibleHtml =
    html.replace(
      /<script\b[\s\S]*?<\/script>/gi,
      "",
    );

  assert.doesNotMatch(
    visibleHtml,
    new RegExp(invitationKey),
  );
  assert.doesNotMatch(
    html,
    /name="email"|tenantId|externalUserId|acceptTeamInvitationAction/,
  );

  const invalidResponse =
    await render(
      "/invite/not-an-invitation",
    );
  const invalidHtml =
    await invalidResponse.text();

  assert.equal(
    invalidResponse.status,
    200,
  );
  assert.match(
    invalidHtml,
    /הקישור אינו תקין/,
  );
  assert.match(
    invalidHtml,
    /לא ניתן להמשיך עם הקישור הזה/,
  );
  assert.match(
    invalidHtml,
    /disabled=""/,
  );
});

test("server-renders localized invitation views without copying the key into visible HTML", async () => {
  const invitationKey =
    `team_invitation_v1_${"b".repeat(64)}`;
  const englishResponse = await render(
    `/invite/${invitationKey}?lang=en`,
  );
  const englishHtml = await englishResponse.text();

  assert.equal(englishResponse.status, 200);
  assert.match(
    englishHtml,
    /<title>Team invitation \| Connect<\/title>/,
  );
  assert.match(
    englishHtml,
    /<main[^>]*lang="en"[^>]*dir="ltr"/,
  );
  assert.match(englishHtml, /Invitation to join the team/);
  assert.match(englishHtml, /href="\?lang=ar"/);

  const englishVisibleHtml = englishHtml.replace(
    /<script\b[\s\S]*?<\/script>/gi,
    "",
  );
  assert.doesNotMatch(
    englishVisibleHtml,
    new RegExp(invitationKey),
  );

  const arabicResponse = await render(
    `/invite/${invitationKey}?lang=ar`,
  );
  const arabicHtml = await arabicResponse.text();

  assert.equal(arabicResponse.status, 200);
  assert.match(
    arabicHtml,
    /<main[^>]*lang="ar"[^>]*dir="rtl"/,
  );
  assert.match(arabicHtml, /دعوة للانضمام إلى الفريق/);
  assert.match(arabicHtml, /href="\?lang=en"/);

  const ambiguousResponse = await render(
    `/invite/${invitationKey}?lang=en&lang=ar`,
  );
  const ambiguousHtml = await ambiguousResponse.text();

  assert.equal(ambiguousResponse.status, 200);
  assert.match(ambiguousHtml, /הזמנה להצטרף לצוות/);
});
