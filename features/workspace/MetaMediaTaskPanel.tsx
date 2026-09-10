import {MetaMediaCleanupControl,mediaCleanupMessages} from './MetaMediaCleanupControl.tsx';
import type {MetaMediaCleanupRequestStatus} from '../../shared/domain/metaMediaCleanup.ts';
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft.ts";
import { canRequestMetaMediaInspectionRetry, encodeMetaMediaTaskCursor, metaMediaTaskAttention, type MetaMediaTaskCursor, type MetaMediaTaskReadResult } from "../../shared/domain/metaMediaTaskView.ts";
import type { MetaMediaInspectionRetryStatus } from "../../shared/domain/metaMediaInspectionRetry.ts";
import { MetaMediaInspectionRetryControl } from "./MetaMediaInspectionRetryControl.tsx";
import { metaMediaTaskMessages } from "./metaMediaTaskMessages.ts";
export function metaMediaTasksPath(language: InterfaceLanguage, after?: MetaMediaTaskCursor | null): string {
  const parameters = new URLSearchParams({ lang: language });
  if (after) parameters.set("after", encodeMetaMediaTaskCursor(after));
  return `/workspace/media-tasks?${parameters}`;
}
function timestamp(value: string) { return value.replace("T", " ").slice(0, 19); }
export function MetaMediaTaskPanel({ result, language, after = null, requestRetry, requestCleanup }: {
  result: MetaMediaTaskReadResult; language: InterfaceLanguage; after?: MetaMediaTaskCursor | null;
  requestCleanup?: (input: unknown) => Promise<MetaMediaCleanupRequestStatus>;
  requestRetry?: (input: unknown) => Promise<MetaMediaInspectionRetryStatus>;
}) {
  const text = metaMediaTaskMessages[language];
  return <main className="media-diagnostics" dir={language === "en" ? "ltr" : "rtl"} lang={language}>
    <header className="media-diagnostics-header">
      <a href={`/workspace/onboarding?lang=${language}`}>{text.back}</a>
      <h1>{text.title}</h1><p>{text.intro}</p>
      <nav aria-label={text.title} className="media-diagnostics-actions">
        <a className="secondary-button" href={metaMediaTasksPath(language, after)}>{text.refresh}</a>
        {after || result.status === "invalid-request" ? <a className="secondary-button" href={metaMediaTasksPath(language)}>{text.first}</a> : null}
      </nav>
    </header>
    <p className="media-diagnostics-notice">{text.notice}</p>
    {result.status !== "ready" ? <p className="media-diagnostics-empty" role="status">{text.failures[result.status]}</p> : <>
      <p>{text.pageCount}: {result.page.tasks.length}</p>
      {result.page.tasks.length === 0 ? <section className="media-diagnostics-empty"><h2>{text.empty}</h2><p>{text.emptyDetail}</p></section> :
        <ol className="media-diagnostics-list">{result.page.tasks.map(task => {
          const attention = metaMediaTaskAttention(task);
          return <li className="media-diagnostics-task" key={`${task.jobKey}.${task.kind}`}>
            <div className="media-diagnostics-task-title"><h2>{text[task.kind]}</h2><span className="media-diagnostics-state">{text.states[task.status]}</span></div>
            {attention !== "none" ? <p className="media-diagnostics-attention">{text.attention[attention]}</p> : null}
            <dl className="media-diagnostics-facts">
              <div><dt>{text.attempts}</dt><dd><bdi dir="ltr">{task.attempts} / {task.kind === "upload" ? 3 : 12 + task.operatorRetries}</bdi></dd></div>
              {task.kind === "inspect" ? <div><dt>{text.operatorRequests}</dt><dd><bdi dir="ltr">{task.operatorRetries} / 3</bdi></dd></div> : null}
              <div><dt>{text.updated}</dt><dd><time dir="ltr" dateTime={task.updatedAt}>{timestamp(task.updatedAt)}</time></dd></div>
              {task.nextAttemptAt ? <div><dt>{text.nextAt}</dt><dd><time dir="ltr" dateTime={task.nextAttemptAt}>{timestamp(task.nextAttemptAt)}</time></dd></div> : null}
            </dl>
            <p className="media-diagnostics-evidence">{text.evidence}: {task.scanResults.length === 0 ? text.noEvidence : task.scanResults.map(r => text.scans[r]).join(" · ")}</p>
            {requestRetry && canRequestMetaMediaInspectionRetry(task) ? <MetaMediaInspectionRetryControl key={`${task.jobKey}.${task.version}`}
              language={language} input={{ jobKey: task.jobKey, expectedVersion: task.version }} requestRetry={requestRetry} /> : null}
            {task.cleanup ? <p role="status">{mediaCleanupMessages[language].states[task.cleanup.status]} <bdi dir="ltr">{task.cleanup.attempts} / 3</bdi></p> : null}
            {task.canCleanup && requestCleanup ? <MetaMediaCleanupControl key={`${task.jobKey}.${task.version}.cleanup`} language={language}
              jobKey={task.jobKey} expectedVersion={task.version} requestCleanup={requestCleanup} /> : null}
            <details><summary>{text.id}</summary><code dir="ltr">{encodeMetaMediaTaskCursor(task)}</code></details>
          </li>;
        })}</ol>}
      {result.page.nextCursor ? <a className="secondary-button" rel="next" href={metaMediaTasksPath(language, result.page.nextCursor)}>{text.next}</a> : null}
    </>}
  </main>;
}
