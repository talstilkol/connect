"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { metaMediaTaskMessages } from "./metaMediaTaskMessages.ts";
import { MetaDataSyncStatus } from "./MetaDataSyncStatus";
import type {
  MetaEmbeddedSignupView,
  MetaEmbeddedSignupFlow,
} from "../../shared/domain/metaEmbeddedSignupView";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  MetaConnectionView,
} from "../../shared/domain/metaConnectionView";
import {
  completeMetaEmbeddedSignupAction,
  beginMetaEmbeddedSignupAction,
} from "../../server/meta/metaEmbeddedSignupActions";
import {
  createMetaEmbeddedSignupAttemptCoordinator,
  launchMetaEmbeddedSignup,
  subscribeToMetaEmbeddedSignupMessages,
} from "./metaEmbeddedSignupClient";
import { presentMetaConnection } from
  "./metaConnectionPresentation";
import {
  metaEmbeddedSignupSdkLoader,
  type MetaFacebookSdk,
} from "./metaEmbeddedSignupSdk";
import {
  isMetaEmbeddedSignupSdkErrorStatus,
  readMetaConnectionPanelMessages,
  type MetaEmbeddedSignupSdkStatus,
  type MetaSignupAttemptStatus,
} from "./metaConnectionPanelMessages";
import { useAccessibleDialog } from
  "./useAccessibleDialog";

import type { MetaSignupLaunch } from "../../server/meta/metaSignupLaunch";

interface ActiveMetaSignupAttempt {
  cleanup: () => void;
}

const META_SIGNUP_FLOW_TIMEOUT_MS = 15 * 60 * 1_000;
const META_AUTHORIZATION_CODE_TIMEOUT_MS = 25_000;

export function MetaConnectionPanel({
  connection,
  embeddedSignup,
  language,
  onClose,
}: {
  connection: MetaConnectionView;
  embeddedSignup: MetaEmbeddedSignupView;
  language: InterfaceLanguage;
  onClose: () => void;
}) {
  const router = useRouter();
  const presentation = presentMetaConnection(
    connection,
    language,
  );
  const messages = readMetaConnectionPanelMessages(language);
  const hasAssetSnapshot = [
    "pending",
    "connected",
    "verification_required",
    "revoked",
    "error",
    "restricted",
  ].includes(connection.status);
  const hasEmbeddedSignupConfiguration =
    embeddedSignup.status === "configured";
  const businessAppEnabled = embeddedSignup.status === "configured" && embeddedSignup.businessAppEnabled === true;
  const [selectedFlow, setSelectedFlow] = useState<MetaEmbeddedSignupFlow>(() => businessAppEnabled ? "business-app" : "cloud-api");
  const flow = selectedFlow === "business-app" && businessAppEnabled ? "business-app" : "cloud-api";
  const [sdkStatus, setSdkStatus] =
    useState<MetaEmbeddedSignupSdkStatus>(() =>
    embeddedSignup.status === "configured" &&
    !presentation.setupComplete
      ? "loading"
      : "idle",
  );
  const [attemptStatus, setAttemptStatus] =
    useState<MetaSignupAttemptStatus>(() =>
      presentation.setupComplete ? "connected" : "idle",
    );
  const preparedLaunchRef = useRef<(MetaSignupLaunch & { flow: MetaEmbeddedSignupFlow }) | null>(null);
  const preparationPendingRef = useRef(false);
  const completionPendingRef = useRef(false);
  const sdkRef = useRef<MetaFacebookSdk | null>(null);
  const activeAttemptRef =
    useRef<ActiveMetaSignupAttempt | null>(null);
  const panelActiveRef = useRef(true);
  const dialogRef =
    useAccessibleDialog(onClose);

  useEffect(() => {
    if (
      embeddedSignup.status !== "configured" ||
      presentation.setupComplete
    ) {
      return;
    }

    let active = true;

    metaEmbeddedSignupSdkLoader
      .load({
        appId: embeddedSignup.appId,
        apiVersion: embeddedSignup.apiVersion,
      })
      .then((sdk) => {
        if (active) {
          sdkRef.current = sdk;
          setSdkStatus("ready");
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        sdkRef.current = null;
        const errorCode =
          error &&
          typeof error === "object" &&
          "code" in error
            ? error.code
            : null;
        setSdkStatus(
          isMetaEmbeddedSignupSdkErrorStatus(errorCode)
            ? errorCode
            : "LOAD_FAILED",
        );
      });

    return () => {
      active = false;
    };
  }, [
    embeddedSignup,
    presentation.setupComplete,
  ]);

  useEffect(() => {
    panelActiveRef.current = true;

    return () => {
      panelActiveRef.current = false;
      activeAttemptRef.current?.cleanup();
      activeAttemptRef.current = null;
    };
  }, []);

  const startMetaEmbeddedSignup = () => {
    if (
      embeddedSignup.status !== "configured" ||
      sdkStatus !== "ready" ||
      sdkRef.current === null ||
      activeAttemptRef.current !== null ||
      preparationPendingRef.current || completionPendingRef.current
    ) {
      return;
    }

    const prepared = preparedLaunchRef.current;
    if (prepared === null || prepared.flow !== flow || Date.parse(prepared.expiresAt) <= Date.now()) {
      preparedLaunchRef.current = null;
      preparationPendingRef.current = true;
      setAttemptStatus("preparing");
      void beginMetaEmbeddedSignupAction(flow).then((result) => {
        if (!panelActiveRef.current) return;
        if (result.status === "ready") {
          preparedLaunchRef.current = { ...result, flow };
          setAttemptStatus("ready-to-launch");
        } else setAttemptStatus(result.status);
      }).catch(() => {
        if (panelActiveRef.current) setAttemptStatus("server-error");
      }).finally(() => { preparationPendingRef.current = false; });
      // FB.login stays on the next explicit click, preserving the browser's
      // user activation instead of opening a popup after an async server call.
      return;
    }

    let unsubscribe = () => {};
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const attempt: ActiveMetaSignupAttempt = {
      cleanup() {
        unsubscribe();

        if (timeout !== null) {
          clearTimeout(timeout);
        }

        if (activeAttemptRef.current === attempt) {
          activeAttemptRef.current = null;
        }
      },
    };
    const coordinator =
      createMetaEmbeddedSignupAttemptCoordinator(
        (result) => {
          attempt.cleanup();

          if (result.status !== "ready") {
            if (panelActiveRef.current) {
              setAttemptStatus(result.status);
            }
            return;
          }

          preparedLaunchRef.current = null;
          completionPendingRef.current = true;
          if (panelActiveRef.current) {
            setAttemptStatus("submitting");
          }

          void completeMetaEmbeddedSignupAction({ ...result.input, launchId: prepared.launchId })
            .then((completionResult) => {
              if (!panelActiveRef.current) {
                return;
              }

              setAttemptStatus(completionResult.status === "connected" && completionResult.synchronization === "background" ? "synchronization-pending" : completionResult.status);

              if (
                completionResult.status === "connected"
              ) {
                router.refresh();
              }
            })
            .catch(() => {
              if (panelActiveRef.current) {
                setAttemptStatus("server-error");
              }
            }).finally(() => { completionPendingRef.current = false; });
        },
      );

    activeAttemptRef.current = attempt;
    setAttemptStatus("launching");
    unsubscribe = subscribeToMetaEmbeddedSignupMessages(
      window,
      (result) => coordinator.acceptMessageResult(result),
      prepared.flow,
    );
    timeout = setTimeout(
      () => coordinator.expire(),
      META_SIGNUP_FLOW_TIMEOUT_MS,
    );

    try {
      launchMetaEmbeddedSignup(
        sdkRef.current,
        embeddedSignup.configurationId,
        (result) => {
          if (result.status === "authorized") {
            if (timeout !== null) {
              clearTimeout(timeout);
            }

            timeout = setTimeout(
              () => coordinator.expire(),
              META_AUTHORIZATION_CODE_TIMEOUT_MS,
            );
          }

          coordinator.acceptLoginResult(result);
        },
        prepared.flow,
      );

      if (!coordinator.isSettled()) {
        setAttemptStatus("awaiting-results");
      }
    } catch {
      coordinator.acceptLoginResult({ status: "invalid" });
    }
  };

  const backgroundPending = attemptStatus === "synchronization-pending";
  const pollEnabled = connection.dataSync
    ? ["awaiting-worker", "ready-to-request", "requesting-contacts", "requesting-history", "receiving-history", "projecting-history"].includes(connection.dataSync.stage)
    : backgroundPending;
  useEffect(() => {
    if (!pollEnabled) return;
    let refreshes = 0;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      refreshes++;
      if (refreshes >= 12) clearInterval(timer);
    }, 5_000);
    return () => clearInterval(timer);
  }, [pollEnabled, router]);

  const sdkReady =
    presentation.setupComplete || sdkStatus === "ready";
  const sdkDetail = presentation.setupComplete
    ? messages.sdkDetails["setup-complete"]
    : messages.sdkDetails[sdkStatus];
  const steps = [
    {
      title: messages.steps.provider.title,
      detail: hasEmbeddedSignupConfiguration
        ? messages.steps.provider.configured(
            embeddedSignup.apiVersion,
          )
        : embeddedSignup.status === "configuration-invalid"
          ? messages.steps.provider.invalid
          : hasAssetSnapshot
            ? messages.steps.provider.snapshot
            : messages.steps.provider.required,
      complete:
        hasEmbeddedSignupConfiguration || hasAssetSnapshot,
    },
    {
      title: messages.steps.sdk.title,
      detail: sdkDetail,
      complete: sdkReady,
    },
    {
      title: messages.steps.contract.title,
      detail: presentation.setupComplete
        ? messages.steps.contract.verified
        : sdkStatus === "ready"
          ? messages.steps.contract.ready
          : messages.steps.contract.waiting,
      complete:
        presentation.setupComplete ||
        attemptStatus === "submitting" ||
        attemptStatus === "connected",
    },
    {
      title: messages.steps.assets.title,
      detail: hasAssetSnapshot
        ? messages.steps.assets.stored
        : messages.steps.assets.embeddedSignup,
      complete: hasAssetSnapshot,
    },
    {
      title: messages.steps.webhook.title,
      detail: presentation.setupComplete
        ? messages.steps.webhook.verified
        : presentation.statusLabel,
      complete: presentation.setupComplete,
    },
  ];
  const attemptInProgress = [
    "preparing",
    "launching",
    "awaiting-results",
    "submitting",
  ].includes(attemptStatus);
  const attemptDetail =
    backgroundPending && connection.dataSync ? null : messages.attemptDetails[attemptStatus];

  return (
    <div className="modal-layer" role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label={messages.aria.closeBackdrop}
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        className="connection-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meta-title"
        aria-describedby="meta-panel-notice"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="panel-header">
          <div>
            <span className="card-kicker">
              {messages.header.kicker}
            </span>
            <h2 id="meta-title">{messages.header.title}</h2>
          </div>
          <button
            type="button"
            className="close-button"
            aria-label={messages.aria.closeButton}
            data-dialog-initial-focus
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div
          className={`panel-notice ${presentation.tone}`}
          id="meta-panel-notice"
        >
          <span>{presentation.setupComplete ? "✓" : "!"}</span>
          <p>{presentation.panelNotice}</p>
        </div>
        {hasAssetSnapshot || connection.status === "disconnected" ? <p><a href={`/workspace/media-tasks?lang=${language}`}>{metaMediaTaskMessages[language].title}</a></p> : null}
        {connection.dataSync ? <MetaDataSyncStatus dataSync={connection.dataSync} language={language} onRefresh={() => router.refresh()} /> : null}
        {!presentation.setupComplete && !backgroundPending ? (
          <fieldset className="meta-signup-flow" disabled={attemptInProgress}>
            <legend>{messages.businessApp.flowLabel}</legend>
            <label><input type="radio" name="meta-signup-flow" value="business-app" checked={flow === "business-app"}
              disabled={!businessAppEnabled} onChange={() => { preparedLaunchRef.current = null; setSelectedFlow("business-app"); setAttemptStatus("idle"); }} />
              {messages.businessApp.businessChoice}</label>
            <label><input type="radio" name="meta-signup-flow" value="cloud-api" checked={flow === "cloud-api"}
              onChange={() => { preparedLaunchRef.current = null; setSelectedFlow("cloud-api"); setAttemptStatus("idle"); }} />
              {messages.businessApp.cloudChoice}</label>
          </fieldset>
        ) : null}
        <ol className="connection-steps">
          {steps.map((step, index) => (
            <li className={step.complete ? "ready" : ""} key={step.title}>
              <span>{step.complete ? "✓" : index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </div>
            </li>
          ))}
        </ol>
        {!presentation.setupComplete ? (
          <details className="business-app-connection" data-business-app-onboarding={businessAppEnabled ? "controlled-pilot" : "unavailable"}>
            <summary>{messages.businessApp.title}</summary>
            <p>{messages.businessApp.description}</p>
            <ol>
              {messages.businessApp.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p>{businessAppEnabled ? messages.businessApp.pilotNotice : messages.businessApp.unavailable}</p>
          </details>
        ) : null}
        {attemptDetail ? (
          <div
            className={`inline-notice ${
              (backgroundPending || attemptStatus === "connected" || attemptStatus === "ready-to-launch")
                ? "success"
                : attemptInProgress
                  ? "warning"
                  : "danger"
            }`}
            role={
              attemptInProgress ||
              (backgroundPending || attemptStatus === "connected" || attemptStatus === "ready-to-launch")
                ? "status"
                : "alert"
            }
          >
            <span aria-hidden="true">
              {backgroundPending || attemptStatus === "connected" || attemptStatus === "ready-to-launch"
                ? "✓"
                : attemptInProgress
                  ? "i"
                  : "!"}
            </span>
            <p>{attemptDetail}</p>
            {backgroundPending && !connection.dataSync ? <button type="button" className="secondary-button" onClick={() => router.refresh()}>{messages.businessApp.refresh}</button> : null}
          </div>
        ) : null}
        <div className="panel-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            {messages.actions.close}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={
              presentation.setupComplete || backgroundPending ||
              !hasEmbeddedSignupConfiguration ||
              sdkStatus !== "ready" ||
              attemptInProgress ||
              attemptStatus === "connected"
            }
            onClick={startMetaEmbeddedSignup}
          >
            {backgroundPending
              ? messages.actions.connected
              : presentation.setupComplete
              ? messages.actions.active
              : attemptStatus === "preparing"
                ? messages.actions.preparing
              : attemptStatus === "ready-to-launch"
                ? messages.actions.openMeta
              : attemptStatus === "launching"
                ? messages.actions.launching
                : attemptStatus === "awaiting-results"
                  ? messages.actions.awaitingResults
                  : attemptStatus === "submitting"
                    ? messages.actions.submitting
                    : attemptStatus === "connected"
                      ? messages.actions.connected
              : hasEmbeddedSignupConfiguration
                ? sdkStatus === "loading"
                  ? messages.actions.sdkLoading
                  : sdkStatus === "ready"
                    ? attemptStatus === "idle"
                      ? messages.actions.connect
                      : messages.actions.retry
                    : sdkStatus === "idle"
                      ? messages.actions.sdkWaiting
                      : messages.actions.sdkFailed
                : embeddedSignup.status ===
                    "configuration-invalid"
                  ? messages.actions.invalidConfiguration
                  : messages.actions.unavailable}
          </button>
        </div>
      </section>
    </div>
  );
}
