"use client";
import { useState, useTransition, type FormEvent } from "react";
import type { KnowledgeSourceView } from "../../shared/domain/aiAgentView";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft";
import { uploadKnowledgeSourceAction, refreshKnowledgeSourcesAction } from "../../server/ai/knowledgeUploadActions";
const messages = {
  he: { formats:"קובצי TXT או Markdown בקידוד UTF-8, עד 128 KiB. המקור יהיה זמין לבחירה רק אחרי הסריקה והעיבוד.", upload:"העלאת מקור", refresh:"רענון מצב מקורות", busy:"מעבד…", queued:"הקובץ התקבל לעיבוד. אפשר לרענן את מצב המקורות.", invalid:"יש לבחור קובץ TXT או Markdown תקין, עד 128 KiB.", config:"שירות העלאת המקורות עדיין דורש הגדרת אחסון וסריקה.", failed:"הפעולה לא הושלמה. רענן את המצב לפני ניסיון נוסף.", denied:"אין לך הרשאה לעדכן מקורות בעסק זה.", refreshed:"מצב המקורות עודכן." },
  en: { formats:"UTF-8 TXT or Markdown files, up to 128 KiB. Sources become selectable after scanning and processing.", upload:"Upload source", refresh:"Refresh source status", busy:"Processing…", queued:"File accepted for processing. Refresh to check source status.", invalid:"Select a valid TXT or Markdown file up to 128 KiB.", config:"Source uploads still require storage and scanning configuration.", failed:"The operation did not complete. Refresh status before retrying.", denied:"You cannot update sources in this workspace.", refreshed:"Source status updated." },
  ar: { formats:"ملفات TXT أو Markdown بترميز UTF-8 حتى 128 KiB. يصبح المصدر متاحًا للاختيار بعد الفحص والمعالجة.", upload:"رفع مصدر", refresh:"تحديث حالة المصادر", busy:"جارٍ المعالجة…", queued:"تم قبول الملف للمعالجة. حدّث حالة المصادر للتحقق.", invalid:"اختر ملف TXT أو Markdown صالحًا حتى 128 KiB.", config:"رفع المصادر يتطلب إعداد التخزين والفحص.", failed:"لم تكتمل العملية. حدّث الحالة قبل المحاولة مجددًا.", denied:"لا تملك صلاحية تحديث المصادر في مساحة العمل هذه.", refreshed:"تم تحديث حالة المصادر." },
};
export function KnowledgeUploadPanel({ language, canWrite, onSources }: { language:InterfaceLanguage; canWrite:boolean; onSources:(sources:readonly KnowledgeSourceView[]) => void }) {
  const m=messages[language]; const [pending,startTransition]=useTransition(); const [status,setStatus]=useState("");
  async function refresh() {
    const result=await refreshKnowledgeSourcesAction();
    if (result.status === "ready" && "aiAgents" in result) { onSources(result.aiAgents.knowledgeSources); return true; }
    return false;
  }
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data=new FormData(event.currentTarget);
    const file=data.get("file"); if (!(file instanceof File) || file.size < 1 || file.size > 131072) { setStatus(m.invalid); return; }
    startTransition(async () => {
      try { const result=await uploadKnowledgeSourceAction(data);
        if (result.status === "processing") { setStatus(m.queued); await refresh(); }
        else setStatus(result.status === "invalid-input" || result.status === "rejected" ? m.invalid : result.status === "configuration-required" ? m.config : result.status === "permission-denied" ? m.denied : m.failed);
      } catch { setStatus(m.failed); }
    });
  }
  return <div className="knowledge-upload-panel">
    <p id="knowledge-upload-formats">{m.formats}</p>
    <form onSubmit={submit}>
      <input aria-label={m.upload} aria-describedby="knowledge-upload-formats" type="file" name="file" accept=".txt,.md,text/plain,text/markdown" required disabled={!canWrite || pending} />
      <button className="secondary-button" type="submit" disabled={!canWrite || pending}>{pending?m.busy:m.upload}</button>
      <button className="secondary-button" type="button" disabled={pending} onClick={() => startTransition(async () => { try { setStatus(await refresh()?m.refreshed:m.failed); } catch { setStatus(m.failed); } })}>{m.refresh}</button>
    </form>
    <p role="status" aria-live="polite">{status}</p>
  </div>;
}
