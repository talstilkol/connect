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

test("server-renders local business profile completeness boundaries", async () => {
  const response = await render("/workspace/onboarding");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Business profile completeness/);
  assert.match(html, /שלמות פרטי העסק/);
  assert.match(html, /שמירת פרטי העסק מקומית/);
  assert.match(html, /לא נוצר Tenant/);
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
  assert.match(templateHtml, /Local rehearsal/);
  assert.match(
    templateHtml,
    /שמירת Rehearsal מקומית/,
  );
  assert.match(
    templateHtml,
    /תימחק ברענון ולא תישלח ל־Meta/,
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
  assert.match(campaignsHtml, /Campaign draft/);
  assert.match(campaignsHtml, /Planning completeness/);
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
