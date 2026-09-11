"use client";
import "./billing.css";
import { useEffect, useState, useTransition } from "react";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft";
import type { PaddleBillingResult, PaddleBillingView } from "../../shared/domain/paddleBillingView";
import { createPaddleCheckoutAction, readPaddleBillingAction } from "../../server/billing/paddleActions";
interface PaddleBrowser {
  Environment: { set(environment: "sandbox"): void };
  Initialize(options: { token: string }): void;
  Checkout: { open(options: { transactionId: string; settings: { displayMode: "overlay"; locale: "en" | "ar" } }): void };
}
let loaded: Promise<PaddleBrowser> | null = null; let initializedToken: string | null = null;
async function openCheckout(view: PaddleBillingView, language: InterfaceLanguage) {
  if (!view.canManage || view.checkout?.state !== "ready" || !view.checkout.transactionId) throw Error("Checkout unavailable");
  if (!loaded) loaded = new Promise<PaddleBrowser>((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://cdn.paddle.com/paddle/v2/paddle.js"; script.async = true;
    const timeout = window.setTimeout(() => { script.remove(); loaded = null; reject(Error("Checkout unavailable")); }, 10000);
    script.onload = () => { window.clearTimeout(timeout); const paddle = (window as Window & { Paddle?: PaddleBrowser }).Paddle;
      if (paddle && typeof paddle.Initialize === "function" && typeof paddle.Checkout?.open === "function") resolve(paddle); else { loaded = null; reject(Error("Checkout unavailable")); } };
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); loaded = null; reject(Error("Checkout unavailable")); };
    document.head.appendChild(script);
  });
  const paddle = await loaded;
  if (initializedToken !== null && initializedToken !== view.clientToken) throw Error("Reload required");
  if (initializedToken === null) { if (view.environment === "sandbox") paddle.Environment.set("sandbox"); paddle.Initialize({ token: view.clientToken }); initializedToken = view.clientToken; }
  // Only the server's transaction is opened. Browser events and URL parameters grant no access.
  paddle.Checkout.open({ transactionId: view.checkout.transactionId, settings: { displayMode: "overlay", locale: language === "ar" ? "ar" : "en" } });
}
const copy = {
  he: { paidBlocked: "הפעולות בתשלום מושהות. אפשר לצפות במידע ולנהל את החיוב כדי לחדש את הגישה.", paidStale: "לא הצלחנו לאמת את המנוי לאחרונה. הפעולות בתשלום יחודשו לאחר אימות המנוי.", title: "מנוי וחיוב", config: "התשלום ייפתח לאחר חיבור חשבון Paddle והגדרת החבילה.", denied: "אין לך הרשאה לניהול החיוב בעסק זה.", failed: "לא ניתן להשלים את הפעולה כרגע. רענן את המצב לפני ניסיון נוסף.", create: "הכנת תשלום", open: "פתיחת תשלום מאובטח", refresh: "רענון מצב", loading: "טוען…", idle: "אין עדיין עסקת תשלום.", queued: "עסקת התשלום בהכנה. רענן את המצב בעוד כמה שניות.", unknown: "נדרש בירור של עסקת התשלום. פנה לתמיכה; לא תיווצר עסקה נוספת אוטומטית.", ready: "התשלום מוכן לפתיחה. המחיר והתנאים יוצגו ב־Paddle לפני האישור. חלון התשלום זמין באנגלית.", completed: "העסקה אומתה מול Paddle. מצב המנוי מוצג להלן.", rejected: "לא ניתן להכין תשלום בהרשאות הנוכחיות.", review: "מצב המנוי דורש בדיקה.", sandbox: "סביבת בדיקה — ללא חיוב אמיתי", ends: "סיום התקופה:", statuses: { active: "פעיל", trialing: "תקופת ניסיון", past_due: "תשלום באיחור", paused: "מושהה", canceled: "בוטל" } },
  en: { paidBlocked: "Paid actions are paused. You can still view your data and manage billing to restore access.", paidStale: "We could not verify your subscription recently. Paid actions resume after verification.", title: "Subscription and billing", config: "Checkout becomes available after connecting Paddle and configuring the plan.", denied: "You cannot manage billing for this workspace.", failed: "The operation could not complete. Refresh status before retrying.", create: "Prepare checkout", open: "Open secure checkout", refresh: "Refresh status", loading: "Loading…", idle: "No checkout has been created.", queued: "Preparing checkout. Refresh status in a few seconds.", unknown: "This checkout needs investigation. Contact support; another transaction will not be created automatically.", ready: "Checkout is ready. Paddle will show the price and terms before confirmation.", completed: "The transaction was verified with Paddle. Subscription status appears below.", rejected: "Current permissions do not allow preparing checkout.", review: "Subscription status needs review.", sandbox: "Sandbox — no real charge", ends: "Period ends:", statuses: { active: "Active", trialing: "Trial", past_due: "Past due", paused: "Paused", canceled: "Canceled" } },
  ar: { paidBlocked: "تم إيقاف العمليات المدفوعة مؤقتًا. يمكنك عرض بياناتك وإدارة الفوترة لاستعادة الوصول.", paidStale: "تعذر التحقق من الاشتراك مؤخرًا. تستأنف العمليات المدفوعة بعد التحقق.", title: "الاشتراك والفوترة", config: "يتاح الدفع بعد ربط Paddle وإعداد الخطة.", denied: "لا تملك صلاحية إدارة الفوترة لمساحة العمل هذه.", failed: "تعذر إكمال العملية. حدّث الحالة قبل المحاولة مجددًا.", create: "تحضير الدفع", open: "فتح الدفع الآمن", refresh: "تحديث الحالة", loading: "جارٍ التحميل…", idle: "لم يتم إنشاء عملية دفع بعد.", queued: "جارٍ تحضير الدفع. حدّث الحالة بعد بضع ثوانٍ.", unknown: "تحتاج عملية الدفع إلى مراجعة. اتصل بالدعم؛ لن تُنشأ عملية أخرى تلقائيًا.", ready: "الدفع جاهز. يعرض Paddle السعر والشروط قبل التأكيد.", completed: "تم التحقق من العملية لدى Paddle. تظهر حالة الاشتراك أدناه.", rejected: "الصلاحيات الحالية لا تسمح بتحضير الدفع.", review: "حالة الاشتراك تحتاج إلى مراجعة.", sandbox: "بيئة اختبار — دون دفع فعلي", ends: "نهاية الفترة:", statuses: { active: "نشط", trialing: "تجريبي", past_due: "دفع متأخر", paused: "متوقف مؤقتًا", canceled: "ملغى" } },
};
export function PaddleBillingPanel({ language }: { language: InterfaceLanguage }) {
  const m = copy[language]; const [result, setResult] = useState<PaddleBillingResult | null>(null); const [pending, start] = useTransition(); const [failed, setFailed] = useState(false);
  useEffect(() => { let active = true; void readPaddleBillingAction().then(value => { if (active) setResult(value); }).catch(() => { if (active) setResult({ status: "server-error" }); }); return () => { active = false; }; }, []);
  const view = result?.status === "ready" ? result.billing : null;
  function run(operation: () => Promise<void>) { setFailed(false); start(async () => { try { await operation(); } catch { setFailed(true); } }); }
  const state = view?.checkout?.state;
  const status = !result ? m.loading : !view ? result.status === "configuration-required" ? m.config : result.status === "permission-denied" || result.status === "unauthenticated" ? m.denied : m.failed :
    state === "queued" || state === "creating" ? m.queued : state === "unknown" ? m.unknown : state === "ready" ? m.ready : state === "completed" ? m.completed : state === "rejected" ? m.rejected : m.idle;
  return <section className="card billing-card paddle-billing-panel">
    <h2>{m.title}</h2><p role="status" aria-live="polite">{status}</p>
    {view?.environment === "sandbox" && <p>{m.sandbox}</p>}
    {view && !["manual-pilot", "paid-active"].includes(view.paidAccessReason) && <p role="status">{view.paidAccessReason === "verification-stale" ? m.paidStale : m.paidBlocked}</p>}
    {view?.subscription && <div><p>{m.statuses[view.subscription.status]}</p>{view.subscription.endsAt && <p>{m.ends} <time dateTime={view.subscription.endsAt}>{view.subscription.endsAt.slice(0, 10)}</time></p>}{view.subscription.needsReview && <p>{m.review}</p>}</div>}
    <div className="billing-logic">
      {view?.canManage && !view.checkout && <button className="primary-button" disabled={pending} onClick={() => run(async () => setResult(await createPaddleCheckoutAction()))}>{m.create}</button>}
      {view?.canManage && state === "ready" && <button className="primary-button" disabled={pending} onClick={() => run(async () => { const fresh = await readPaddleBillingAction(); setResult(fresh); if (fresh.status !== "ready") throw Error(); await openCheckout(fresh.billing, language); })}>{m.open}</button>}
      <button className="secondary-button" disabled={pending} onClick={() => run(async () => setResult(await readPaddleBillingAction()))}>{m.refresh}</button>
    </div>{failed && <p role="alert">{m.failed}</p>}
  </section>;
}
