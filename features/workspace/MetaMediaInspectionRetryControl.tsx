"use client";

import { useEffect, useRef, useState } from "react";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft.ts";
import type { MetaMediaInspectionRetryInput, MetaMediaInspectionRetryStatus } from "../../shared/domain/metaMediaInspectionRetry.ts";

export const mediaInspectionRetryMessages = {
  he: { label: "בדיקה חוזרת של תוצאת הסריקה", pending: "רושם בקשה…", queued: "נרשמה בקשה לבדיקה חוזרת. רעננו את המצב בהמשך.",
    "already-requested": "הבקשה כבר נרשמה. רעננו את המצב.", "permission-denied": "אין הרשאה לבקש בדיקה של המשימה כעת.",
    conflict: "מצב המשימה השתנה או שאינו מאפשר בדיקה נוספת. רעננו את המצב.", "invalid-request": "הבקשה אינה תקינה. רעננו את העמוד.",
    "configuration-required": "הפעולה דורשת השלמת הגדרת השירות.", "server-error": "לא ניתן לאמת את רישום הבקשה. אפשר לנסות שוב; אותה בקשה לא תיספר פעמיים." },
  en: { label: "Recheck the scan result", pending: "Recording request…", queued: "A recheck was requested. Refresh the status later.",
    "already-requested": "This request was already recorded. Refresh the status.", "permission-denied": "You cannot request a recheck for this task right now.",
    conflict: "The task changed or is not eligible for another check. Refresh the status.", "invalid-request": "The request is invalid. Refresh the page.",
    "configuration-required": "Service configuration is required.", "server-error": "Could not confirm the request. You can retry; the same request will not count twice." },
  ar: { label: "إعادة التحقق من نتيجة الفحص", pending: "جارٍ تسجيل الطلب…", queued: "سُجّل طلب إعادة التحقق. حدّث الحالة لاحقًا.",
    "already-requested": "سُجّل هذا الطلب مسبقًا. حدّث الحالة.", "permission-denied": "لا تملك صلاحية طلب التحقق من هذه المهمة حاليًا.",
    conflict: "تغيّرت المهمة أو لا تسمح بتحقق إضافي. حدّث الحالة.", "invalid-request": "الطلب غير صالح. حدّث الصفحة.",
    "configuration-required": "يلزم إكمال إعداد الخدمة.", "server-error": "تعذر تأكيد تسجيل الطلب. يمكنك المحاولة مجددًا؛ لن يُحتسب الطلب نفسه مرتين." },
} as const;
export function MetaMediaInspectionRetryControl({ language, input, requestRetry }: {
  language: InterfaceLanguage; input: MetaMediaInspectionRetryInput;
  requestRetry: (input: unknown) => Promise<MetaMediaInspectionRetryStatus>;
}) {
  const [status, setStatus] = useState<"idle" | "pending" | MetaMediaInspectionRetryStatus>("idle");
  const active = useRef(false), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const text = mediaInspectionRetryMessages[language];
  async function request() {
    if (active.current) return;
    active.current = true; setStatus("pending");
    try {
      const result = await requestRetry(input);
      if (mounted.current) setStatus(["queued", "already-requested", "configuration-required", "permission-denied", "conflict", "invalid-request", "server-error"].includes(result) ? result : "server-error");
    } catch { if (mounted.current) setStatus("server-error"); }
    finally { active.current = false; }
  }
  return <div className="media-inspection-retry" aria-busy={status === "pending"}>
    <button type="button" className="secondary-button" disabled={status === "pending" || status === "queued" || status === "already-requested"}
      onClick={() => { void request(); }}>{status === "pending" ? text.pending : text.label}</button>
    <p role="status">{status === "idle" || status === "pending" ? "" : text[status]}</p>
  </div>;
}
