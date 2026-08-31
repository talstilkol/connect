"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  MetaEmbeddedSignupView,
} from "../../shared/domain/metaEmbeddedSignupView";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  MetaConnectionView,
} from "../../shared/domain/metaConnectionView";
import {
  completeMetaEmbeddedSignupAction,
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
      activeAttemptRef.current !== null
    ) {
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

          if (panelActiveRef.current) {
            setAttemptStatus("submitting");
          }

          void completeMetaEmbeddedSignupAction(result.input)
            .then((completionResult) => {
              if (!panelActiveRef.current) {
                return;
              }

              setAttemptStatus(completionResult.status);

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
            });
        },
      );

    activeAttemptRef.current = attempt;
    setAttemptStatus("launching");
    unsubscribe = subscribeToMetaEmbeddedSignupMessages(
      window,
      (result) => coordinator.acceptMessageResult(result),
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
      );

      if (!coordinator.isSettled()) {
        setAttemptStatus("awaiting-results");
      }
    } catch {
      coordinator.acceptLoginResult({ status: "invalid" });
    }
  };

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
    "launching",
    "awaiting-results",
    "submitting",
  ].includes(attemptStatus);
  const attemptDetail =
    messages.attemptDetails[attemptStatus];

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
        {attemptDetail ? (
          <div
            className={`inline-notice ${
              attemptStatus === "connected"
                ? "success"
                : attemptInProgress
                  ? "warning"
                  : "danger"
            }`}
            role={
              attemptInProgress ||
              attemptStatus === "connected"
                ? "status"
                : "alert"
            }
          >
            <span aria-hidden="true">
              {attemptStatus === "connected"
                ? "✓"
                : attemptInProgress
                  ? "i"
                  : "!"}
            </span>
            <p>{attemptDetail}</p>
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
              presentation.setupComplete ||
              !hasEmbeddedSignupConfiguration ||
              sdkStatus !== "ready" ||
              attemptInProgress ||
              attemptStatus === "connected"
            }
            onClick={startMetaEmbeddedSignup}
          >
            {presentation.setupComplete
              ? messages.actions.active
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
