import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft";
import type { MetaDataSyncView } from "../../shared/domain/metaDataSyncView";
import { readMetaDataSyncMessages } from "./metaDataSyncMessages";

export function MetaDataSyncStatus({ dataSync, language, onRefresh }: {
  dataSync: Readonly<MetaDataSyncView>;
  language: InterfaceLanguage;
  onRefresh: () => void;
}) {
  const messages = readMetaDataSyncMessages(language);
  const recovery = ["recovery-required", "connection-changed", "conflicted"].includes(dataSync.stage);
  const progressVisible = dataSync.providerProgress !== null;
  return (
    <section className="business-app-connection" aria-label={messages.title}>
      <h3>{messages.title}</h3>
      <p role="status">{messages.stages[dataSync.stage]}</p>
      <dl>
        <dt>{messages.contacts}</dt><dd>{messages.requests[dataSync.contacts]}</dd>
        <dt>{messages.history}</dt><dd>{messages.requests[dataSync.history]}</dd>
        {progressVisible ? <>
          <dt>{messages.providerProgress}</dt><dd><bdi>{dataSync.providerProgress}%</bdi></dd>
          <dt>{messages.chunks}</dt><dd><bdi>{dataSync.processedChunks} / {dataSync.receivedChunks}</bdi></dd>
          <dt>{messages.projectedMessages}</dt><dd>{dataSync.projectedMessages}</dd>
        </> : null}
      </dl>
      {progressVisible ? <p>{messages.verificationNotice}</p> : null}
      {recovery ? <p>{messages.recoveryNotice}</p> : null}
      <button type="button" className="secondary-button" onClick={onRefresh}>{messages.refresh}</button>
    </section>
  );
}
