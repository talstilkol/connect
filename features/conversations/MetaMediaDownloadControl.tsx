"use client";

import { useEffect, useRef, useState } from "react";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft.ts";
import { fetchMetaMediaDownload, getMetaMediaDownloadToken, MetaMediaDownloadError } from "./metaMediaDownloadClient.ts";

type Props = { messageKey: string; language: InterfaceLanguage };

const messages = {
  he: { download: "בדיקה והורדת קובץ", checking: "בודק ומוריד…", cancel: "ביטול הורדה", unavailable: "הקובץ אינו זמין להורדה כעת.",
    "rate-limited": "הגעת למגבלת ההורדות. נסה שוב בעוד דקה.", "signed-out": "יש להתחבר מחדש כדי להוריד.", saved: "הקובץ הועבר לדפדפן לשמירה.", cancelled: "ההורדה בוטלה." },
  en: { download: "Check and download file", checking: "Checking and downloading…", cancel: "Cancel download", unavailable: "This file is currently unavailable.",
    "rate-limited": "Download limit reached. Try again in a minute.", "signed-out": "Sign in again to download.", saved: "The file was sent to your browser to save.", cancelled: "Download cancelled." },
  ar: { download: "فحص الملف وتنزيله", checking: "جارٍ الفحص والتنزيل…", cancel: "إلغاء التنزيل", unavailable: "الملف غير متاح للتنزيل حاليًا.",
    "rate-limited": "تم بلوغ حد التنزيل. حاول مجددًا بعد دقيقة.", "signed-out": "سجّل الدخول مجددًا للتنزيل.", saved: "أُرسل الملف إلى المتصفح لحفظه.", cancelled: "تم إلغاء التنزيل." },
} as const;
export function MetaMediaDownloadControl({ language, messageKey, origin, getToken }: Props & {
  origin: string; getToken: () => Promise<string | null>;
}) {
  const text = messages[language];
  const [status, setStatus] = useState<"idle" | "checking" | "unavailable" | "rate-limited" | "signed-out" | "saved" | "cancelled">("idle");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  async function download() {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller; setStatus("checking");
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const token = await getMetaMediaDownloadToken(getToken, controller.signal);
      const blob = await fetchMetaMediaDownload({ origin, messageKey, token, signal: controller.signal });
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a"); link.href = url; link.download = "media.bin"; link.rel = "noopener";
        document.body.append(link); try { link.click(); } finally { link.remove(); }
      } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
      if (active.current === controller) setStatus("saved");
    } catch (error) {
      if (active.current === controller) setStatus(controller.signal.aborted ? "cancelled" : error instanceof MetaMediaDownloadError ? error.code : "unavailable");
    } finally { clearTimeout(timeout); if (active.current === controller) active.current = null; }
  }
  return <div className="media-download-control" aria-busy={status === "checking"}>
    <button type="button" className="secondary-button" onClick={() => { void download(); }} disabled={status === "checking"}>
      {status === "checking" ? text.checking : text.download}
    </button>
    {status === "checking" ? <button type="button" className="secondary-button" onClick={() => active.current?.abort()}>{text.cancel}</button> : null}
    <span role="status">{status === "idle" || status === "checking" ? "" : text[status]}</span>
  </div>;
}
