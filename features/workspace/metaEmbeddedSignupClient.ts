import type { MetaFacebookSdk } from "./metaEmbeddedSignupSdk";
import type { MetaEmbeddedSignupFlow } from
  "../../shared/domain/metaEmbeddedSignupView";

const MAX_MESSAGE_LENGTH = 65_536;
const MAX_AUTHORIZATION_CODE_LENGTH = 4_096;
const META_ID_PATTERN = /^[1-9][0-9]{0,63}$/;
const SAFE_ERROR_CODE_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

export type MetaEmbeddedSignupFinishEvent =
  | "FINISH"
  | "FINISH_ONLY_WABA"
  | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
  | "FINISH_OBO_MIGRATION"
  | "FINISH_GRANT_ONLY_API_ACCESS";

export interface MetaCloudApiSignupAssets {
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
}

export interface MetaBusinessAppSignupAssets {
  flow: "business-app";
  wabaId: string;
}

export type MetaEmbeddedSignupAssets =
  | MetaCloudApiSignupAssets
  | MetaBusinessAppSignupAssets;

export type MetaEmbeddedSignupMessageResult =
  | {
      status: "ignored";
    }
  | {
      status: "invalid";
    }
  | {
      status: "cancelled";
    }
  | {
      status: "reported-error";
      errorCode: string | null;
    }
  | {
      status: "unsupported-finish";
      event: MetaEmbeddedSignupFinishEvent;
    }
  | {
      status: "finished";
      assets: MetaEmbeddedSignupAssets;
    };

export type MetaEmbeddedSignupLoginResult =
  | {
      status: "authorized";
      authorizationCode: string;
    }
  | {
      status: "cancelled";
    }
  | {
      status: "invalid";
    };

export type MetaEmbeddedSignupCompletionInput = MetaEmbeddedSignupAssets & {
  authorizationCode: string;
};

export type MetaEmbeddedSignupAttemptResult =
  | {
      status: "ready";
      input: MetaEmbeddedSignupCompletionInput;
    }
  | {
      status:
        | "client-cancelled"
        | "client-error"
        | "unsupported-flow";
    };

export interface MetaEmbeddedSignupAttemptCoordinator {
  acceptLoginResult(
    result: MetaEmbeddedSignupLoginResult,
  ): void;
  acceptMessageResult(
    result: MetaEmbeddedSignupMessageResult,
  ): void;
  expire(): void;
  isSettled(): boolean;
}

export type MetaEmbeddedSignupClientErrorCode =
  | "INVALID_CONFIGURATION"
  | "INVALID_SDK"
  | "LAUNCH_FAILED";

export class MetaEmbeddedSignupClientError extends Error {
  readonly code: MetaEmbeddedSignupClientErrorCode;

  constructor(
    code: MetaEmbeddedSignupClientErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MetaEmbeddedSignupClientError";
    this.code = code;
  }
}

export interface MetaEmbeddedSignupMessageTarget {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isMetaId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    META_ID_PATTERN.test(value)
  );
}

function isTrustedMetaOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      (hostname === "facebook.com" ||
        hostname.endsWith(".facebook.com"))
    );
  } catch {
    return false;
  }
}

function normalizeErrorCode(value: unknown): string | null {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return String(value);
  }

  if (
    typeof value === "string" &&
    SAFE_ERROR_CODE_PATTERN.test(value)
  ) {
    return value;
  }

  return null;
}

function parseFinishEvent(
  value: unknown,
): MetaEmbeddedSignupFinishEvent | null {
  switch (value) {
    case "FINISH":
    case "FINISH_ONLY_WABA":
    case "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING":
    case "FINISH_OBO_MIGRATION":
    case "FINISH_GRANT_ONLY_API_ACCESS":
      return value;
    default:
      return null;
  }
}

export function parseMetaEmbeddedSignupMessage(
  event: Pick<MessageEvent<unknown>, "origin" | "data">,
  flow: MetaEmbeddedSignupFlow = "cloud-api",
): MetaEmbeddedSignupMessageResult {
  if (!isTrustedMetaOrigin(event.origin)) {
    return { status: "ignored" };
  }

  if (
    typeof event.data !== "string" ||
    event.data.length === 0 ||
    event.data.length > MAX_MESSAGE_LENGTH
  ) {
    return { status: "invalid" };
  }

  let payload: unknown;

  try {
    payload = JSON.parse(event.data);
  } catch {
    return { status: "invalid" };
  }

  if (
    !isRecord(payload) ||
    payload.type !== "WA_EMBEDDED_SIGNUP"
  ) {
    return { status: "ignored" };
  }

  if (!isRecord(payload.data)) {
    return { status: "invalid" };
  }

  if (payload.event === "CANCEL") {
    return "error_message" in payload.data ||
      "error_code" in payload.data
      ? {
          status: "reported-error",
          errorCode: normalizeErrorCode(
            payload.data.error_code,
          ),
        }
      : { status: "cancelled" };
  }

  if (payload.event === "ERROR") {
    return {
      status: "reported-error",
      errorCode: normalizeErrorCode(
        payload.data.error_code,
      ),
    };
  }

  const finishEvent = parseFinishEvent(payload.event);

  if (finishEvent === null) {
    return { status: "invalid" };
  }

  if (
    finishEvent === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" &&
    flow === "business-app"
  ) {
    if (
      !isMetaId(payload.data.waba_id) ||
      payload.data.waba_ids !== undefined
    ) {
      return { status: "invalid" };
    }

    // Meta's documented Coexistence completion can contain only the WABA.
    // Resolve its owner and phone on the server, never invent missing IDs.
    return {
      status: "finished",
      assets: { flow: "business-app", wabaId: payload.data.waba_id },
    };
  }

  if (finishEvent !== "FINISH" || flow !== "cloud-api") {
    return {
      status: "unsupported-finish",
      event: finishEvent,
    };
  }

  if (
    "waba_ids" in payload.data &&
    payload.data.waba_ids !== undefined
  ) {
    return {
      status: "unsupported-finish",
      event: "FINISH",
    };
  }

  if (
    !isMetaId(payload.data.business_id) ||
    !isMetaId(payload.data.waba_id) ||
    !isMetaId(payload.data.phone_number_id)
  ) {
    return { status: "invalid" };
  }

  return {
    status: "finished",
    assets: {
      businessPortfolioId: payload.data.business_id,
      wabaId: payload.data.waba_id,
      phoneNumberId: payload.data.phone_number_id,
    },
  };
}

export function parseMetaEmbeddedSignupLoginResponse(
  response: unknown,
): MetaEmbeddedSignupLoginResult {
  if (!isRecord(response)) {
    return { status: "invalid" };
  }

  if (!("authResponse" in response)) {
    return { status: "cancelled" };
  }

  if (!isRecord(response.authResponse)) {
    return { status: "invalid" };
  }

  const code = response.authResponse.code;

  if (
    typeof code !== "string" ||
    code.length === 0 ||
    code.length > MAX_AUTHORIZATION_CODE_LENGTH ||
    code.trim() !== code
  ) {
    return { status: "invalid" };
  }

  return {
    status: "authorized",
    authorizationCode: code,
  };
}

export function subscribeToMetaEmbeddedSignupMessages(
  target: MetaEmbeddedSignupMessageTarget,
  onResult: (
    result: Exclude<
      MetaEmbeddedSignupMessageResult,
      { status: "ignored" }
    >,
  ) => void,
  flow: MetaEmbeddedSignupFlow = "cloud-api",
): () => void {
  const listener = (event: MessageEvent<unknown>) => {
    const result = parseMetaEmbeddedSignupMessage(event, flow);

    if (result.status !== "ignored") {
      onResult(result);
    }
  };

  target.addEventListener("message", listener);

  return () => {
    target.removeEventListener("message", listener);
  };
}

export function createMetaEmbeddedSignupAttemptCoordinator(
  onResult: (
    result: MetaEmbeddedSignupAttemptResult,
  ) => void,
): MetaEmbeddedSignupAttemptCoordinator {
  let authorizationCode: string | null = null;
  let assets: MetaEmbeddedSignupAssets | null = null;
  let settled = false;

  const finish = (
    result: MetaEmbeddedSignupAttemptResult,
  ) => {
    if (settled) {
      return;
    }

    settled = true;
    authorizationCode = null;
    assets = null;
    onResult(result);
  };

  const submitWhenComplete = () => {
    if (
      settled ||
      authorizationCode === null ||
      assets === null
    ) {
      return;
    }

    finish({
      status: "ready",
      input: {
        authorizationCode,
        ...assets,
      },
    });
  };

  return {
    acceptLoginResult(result) {
      if (settled) {
        return;
      }

      if (result.status === "authorized") {
        authorizationCode = result.authorizationCode;
        submitWhenComplete();
        return;
      }

      finish({
        status:
          result.status === "cancelled"
            ? "client-cancelled"
            : "client-error",
      });
    },

    acceptMessageResult(result) {
      if (settled || result.status === "ignored") {
        return;
      }

      if (result.status === "finished") {
        assets = result.assets;
        submitWhenComplete();
        return;
      }

      if (result.status === "cancelled") {
        finish({ status: "client-cancelled" });
        return;
      }

      if (result.status === "unsupported-finish") {
        finish({ status: "unsupported-flow" });
        return;
      }

      finish({ status: "client-error" });
    },

    expire() {
      finish({ status: "client-error" });
    },

    isSettled() {
      return settled;
    },
  };
}

export function launchMetaEmbeddedSignup(
  sdk: MetaFacebookSdk,
  configurationId: string,
  onResult: (result: MetaEmbeddedSignupLoginResult) => void,
  flow: MetaEmbeddedSignupFlow = "cloud-api",
): void {
  const normalizedConfigurationId = configurationId.trim();

  if (
    !META_ID_PATTERN.test(normalizedConfigurationId) ||
    (flow !== "cloud-api" && flow !== "business-app")
  ) {
    throw new MetaEmbeddedSignupClientError(
      "INVALID_CONFIGURATION",
      "Meta Embedded Signup configuration is invalid",
    );
  }

  if (!sdk || typeof sdk.login !== "function") {
    throw new MetaEmbeddedSignupClientError(
      "INVALID_SDK",
      "Meta SDK did not expose the expected login interface",
    );
  }

  try {
    sdk.login(
      (response) => {
        onResult(
          parseMetaEmbeddedSignupLoginResponse(response),
        );
      },
      {
        config_id: normalizedConfigurationId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          ...(flow === "business-app"
            ? {
                featureType: "whatsapp_business_app_onboarding" as const,
                sessionInfoVersion: "3" as const,
              }
            : {}),
        },
      },
    );
  } catch {
    throw new MetaEmbeddedSignupClientError(
      "LAUNCH_FAILED",
      "Meta Embedded Signup could not be launched",
    );
  }
}
