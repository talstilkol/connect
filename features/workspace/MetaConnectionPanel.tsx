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
  MetaConnectionView,
} from "../../shared/domain/metaConnectionView";
import {
  completeMetaEmbeddedSignupAction,
} from "../../server/meta/metaEmbeddedSignupActions";
import type {
  MetaEmbeddedSignupCompletionResult,
} from "../../server/meta/metaEmbeddedSignupCompletion";
import {
  createMetaEmbeddedSignupAttemptCoordinator,
  launchMetaEmbeddedSignup,
  subscribeToMetaEmbeddedSignupMessages,
} from "./metaEmbeddedSignupClient";
import { presentMetaConnection } from
  "./metaConnectionPresentation";
import {
  metaEmbeddedSignupSdkLoader,
  type MetaEmbeddedSignupSdkErrorCode,
  type MetaFacebookSdk,
} from "./metaEmbeddedSignupSdk";
import { useAccessibleDialog } from
  "./useAccessibleDialog";

type MetaSignupAttemptStatus =
  | "idle"
  | "launching"
  | "awaiting-results"
  | "submitting"
  | "client-cancelled"
  | "client-error"
  | "unsupported-flow"
  | MetaEmbeddedSignupCompletionResult["status"];

interface ActiveMetaSignupAttempt {
  cleanup: () => void;
}

const META_SIGNUP_FLOW_TIMEOUT_MS = 15 * 60 * 1_000;
const META_AUTHORIZATION_CODE_TIMEOUT_MS = 25_000;

export function MetaConnectionPanel({
  connection,
  embeddedSignup,
  onClose,
}: {
  connection: MetaConnectionView;
  embeddedSignup: MetaEmbeddedSignupView;
  onClose: () => void;
}) {
  const router = useRouter();
  const presentation = presentMetaConnection(connection);
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
  const [sdkStatus, setSdkStatus] = useState<
    | "idle"
    | "loading"
    | "ready"
    | MetaEmbeddedSignupSdkErrorCode
  >(() =>
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
        setSdkStatus(
          error &&
            typeof error === "object" &&
            "code" in error &&
            typeof error.code === "string"
            ? (error.code as MetaEmbeddedSignupSdkErrorCode)
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
    ? "החיבור כבר פעיל ואין צורך בטעינה מחדש"
    : sdkStatus === "ready"
      ? "Meta JavaScript SDK נטען ואותחל"
      : sdkStatus === "loading"
        ? "Meta JavaScript SDK נטען כעת"
        : sdkStatus === "idle"
          ? "הטעינה ממתינה לתצורת Embedded Signup תקינה"
          : "טעינת Meta JavaScript SDK נכשלה באופן בטוח";
  const steps = [
    {
      title: "הגדרת ספק ומזהי Meta",
      detail: hasEmbeddedSignupConfiguration
        ? `Meta App ו־Graph API ${embeddedSignup.apiVersion} הוגדרו בצד השרת`
        : embeddedSignup.status === "configuration-invalid"
          ? "הגדרת Embedded Signup חלקית או לא תקינה"
          : hasAssetSnapshot
        ? "נשמר Snapshot מאומת בצד השרת"
        : "החלטה ופרטי Meta App עדיין נדרשים",
      complete:
        hasEmbeddedSignupConfiguration || hasAssetSnapshot,
    },
    {
      title: "טעינת Meta JavaScript SDK",
      detail: sdkDetail,
      complete: sdkReady,
    },
    {
      title: "חוזה Embedded Signup v4",
      detail: presentation.setupComplete
        ? "תוצאת החיבור כבר אומתה ונשמרה בצד השרת"
        : sdkStatus === "ready"
          ? "FB.login ואירועי Meta מוכנים להעברה מיידית לשרת"
          : "קליטת האירועים תופעל רק לאחר טעינת SDK תקינה",
      complete:
        presentation.setupComplete ||
        attemptStatus === "submitting" ||
        attemptStatus === "connected",
    },
    {
      title: "Business Portfolio, WABA ומספר",
      detail: hasAssetSnapshot
        ? "המזהים נשמרו ואינם מוצגים בדפדפן"
        : "השלב יבוצע דרך Embedded Signup",
      complete: hasAssetSnapshot,
    },
    {
      title: "Webhook ואימות החיבור",
      detail: presentation.setupComplete
        ? "הרשמת ה־Webhook אושרה"
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
    attemptStatus === "launching"
      ? "פותח את חלון Meta"
      : attemptStatus === "awaiting-results"
        ? "ממתין להשלמת החיבור ב־Meta"
        : attemptStatus === "submitting"
          ? "מאמת ושומר את החיבור בצד השרת"
          : attemptStatus === "client-cancelled"
            ? "תהליך החיבור בוטל לפני השלמה"
            : attemptStatus === "unsupported-flow"
              ? "Meta החזירה זרימה שאינה נתמכת ב־MVP"
              : attemptStatus === "authorization-failed"
                ? "הקוד של Meta נדחה או פג תוקף"
                : attemptStatus === "verification-failed"
                  ? "נכסי Meta לא עברו אימות בעלות"
                  : attemptStatus === "subscription-failed"
                    ? "הרשמת ה־WABA נכשלה וניתן לנסות שוב"
                    : attemptStatus === "permission-denied" ||
                        attemptStatus === "unauthenticated" ||
                        attemptStatus === "onboarding-required" ||
                        attemptStatus ===
                          "tenant-selection-required"
                      ? "אין הרשאה להשלים את החיבור בסביבת העבודה"
                      : attemptStatus ===
                            "configuration-required" ||
                          attemptStatus ===
                            "configuration-invalid"
                        ? "תצורת השרת לחיבור Meta אינה מלאה"
                        : attemptStatus === "validation-error" ||
                            attemptStatus === "client-error" ||
                            attemptStatus === "server-error"
                          ? "החיבור לא הושלם באופן בטוח"
                          : attemptStatus === "connected"
                            ? "החיבור אומת ונשמר"
                            : null;

  return (
    <div className="modal-layer" role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="סגירת חלון חיבור"
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
            <span className="card-kicker">חיבור רשמי</span>
            <h2 id="meta-title">חיבור Meta ו־WhatsApp</h2>
          </div>
          <button
            type="button"
            className="close-button"
            aria-label="סגירה"
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
            סגירה
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
              ? "החיבור פעיל"
              : attemptStatus === "launching"
                ? "פותח את Meta"
                : attemptStatus === "awaiting-results"
                  ? "ממתין ל־Meta"
                  : attemptStatus === "submitting"
                    ? "מאמת את החיבור"
                    : attemptStatus === "connected"
                      ? "החיבור הושלם"
              : hasEmbeddedSignupConfiguration
                ? sdkStatus === "loading"
                  ? "טוען Meta SDK"
                  : sdkStatus === "ready"
                    ? attemptStatus === "idle"
                      ? "חיבור Meta ו־WhatsApp"
                      : "ניסיון חוזר לחיבור Meta"
                    : sdkStatus === "idle"
                      ? "טעינת Meta SDK ממתינה"
                      : "טעינת Meta SDK נכשלה"
                : embeddedSignup.status ===
                    "configuration-invalid"
                  ? "הגדרת Meta אינה תקינה"
                  : "פתיחת Meta טרם זמינה"}
          </button>
        </div>
      </section>
    </div>
  );
}
