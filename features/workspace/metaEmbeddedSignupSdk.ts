const META_SDK_SCRIPT_ID = "connect-meta-facebook-sdk";
const META_SDK_SOURCE =
  "https://connect.facebook.net/en_US/sdk.js";
const DEFAULT_LOAD_TIMEOUT_MS = 15_000;

export interface MetaEmbeddedSignupSdkConfiguration {
  appId: string;
  apiVersion: string;
}

export interface MetaFacebookSdk {
  init(options: {
    appId: string;
    autoLogAppEvents: boolean;
    xfbml: boolean;
    version: string;
  }): void;
  login(
    callback: (response: unknown) => void,
    options: {
      config_id: string;
      response_type: "code";
      override_default_response_type: true;
      extras: {
        setup: Record<string, never>;
      };
    },
  ): void;
}

type MetaSdkWindow = Window & {
  FB?: MetaFacebookSdk;
  fbAsyncInit?: () => void;
};

export type MetaEmbeddedSignupSdkErrorCode =
  | "INVALID_CONFIGURATION"
  | "UNSUPPORTED_ENVIRONMENT"
  | "CONFIGURATION_CONFLICT"
  | "LOAD_FAILED"
  | "LOAD_TIMEOUT"
  | "INVALID_SDK"
  | "INITIALIZATION_FAILED";

export class MetaEmbeddedSignupSdkError extends Error {
  readonly code: MetaEmbeddedSignupSdkErrorCode;

  constructor(
    code: MetaEmbeddedSignupSdkErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MetaEmbeddedSignupSdkError";
    this.code = code;
  }
}

export interface MetaEmbeddedSignupSdkLoader {
  load(
    configuration: MetaEmbeddedSignupSdkConfiguration,
  ): Promise<MetaFacebookSdk>;
}

export interface MetaEmbeddedSignupSdkLoaderOptions {
  getWindow?: () => Window | undefined;
  getDocument?: () => Document | undefined;
  loadTimeoutMs?: number;
}

function requirePositiveInteger(
  value: number,
  fieldName: string,
): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return value;
}

function normalizeConfiguration(
  configuration: MetaEmbeddedSignupSdkConfiguration,
): MetaEmbeddedSignupSdkConfiguration {
  const appId = configuration.appId?.trim();
  const apiVersion = configuration.apiVersion?.trim();

  if (
    !appId ||
    !/^[1-9][0-9]{0,63}$/.test(appId) ||
    !apiVersion ||
    apiVersion.length > 20 ||
    !/^v[1-9][0-9]*\.[0-9]+$/.test(apiVersion)
  ) {
    throw new MetaEmbeddedSignupSdkError(
      "INVALID_CONFIGURATION",
      "Meta SDK configuration is invalid",
    );
  }

  return { appId, apiVersion };
}

function configurationKey(
  configuration: MetaEmbeddedSignupSdkConfiguration,
): string {
  return `${configuration.appId}:${configuration.apiVersion}`;
}

function defaultWindow(): Window | undefined {
  return typeof window === "undefined" ? undefined : window;
}

function defaultDocument(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}

export function createMetaEmbeddedSignupSdkLoader(
  options: MetaEmbeddedSignupSdkLoaderOptions = {},
): MetaEmbeddedSignupSdkLoader {
  const getWindow = options.getWindow ?? defaultWindow;
  const getDocument = options.getDocument ?? defaultDocument;
  const loadTimeoutMs = requirePositiveInteger(
    options.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS,
    "loadTimeoutMs",
  );
  let activeConfigurationKey: string | null = null;
  let activeLoad: Promise<MetaFacebookSdk> | null = null;

  return {
    load(configuration) {
      const normalizedConfiguration =
        normalizeConfiguration(configuration);
      const nextConfigurationKey = configurationKey(
        normalizedConfiguration,
      );

      if (
        activeConfigurationKey !== null &&
        activeConfigurationKey !== nextConfigurationKey
      ) {
        return Promise.reject(
          new MetaEmbeddedSignupSdkError(
            "CONFIGURATION_CONFLICT",
            "Meta SDK is already loading with another configuration",
          ),
        );
      }

      if (activeLoad !== null) {
        return activeLoad;
      }

      const windowObject = getWindow() as
        | MetaSdkWindow
        | undefined;
      const documentObject = getDocument();

      if (!windowObject || !documentObject) {
        return Promise.reject(
          new MetaEmbeddedSignupSdkError(
            "UNSUPPORTED_ENVIRONMENT",
            "Meta SDK requires a browser environment",
          ),
        );
      }

      const existingElement = documentObject.getElementById(
        META_SDK_SCRIPT_ID,
      );

      if (
        existingElement !== null &&
        (existingElement.tagName.toLowerCase() !== "script" ||
          (existingElement as HTMLScriptElement).src !==
            META_SDK_SOURCE)
      ) {
        return Promise.reject(
          new MetaEmbeddedSignupSdkError(
            "LOAD_FAILED",
            "Meta SDK script slot is unavailable",
          ),
        );
      }

      const script =
        existingElement === null
          ? documentObject.createElement("script")
          : (existingElement as HTMLScriptElement);
      const createdScript = existingElement === null;
      activeConfigurationKey = nextConfigurationKey;

      let resolveLoad:
        | ((sdk: MetaFacebookSdk) => void)
        | null = null;
      let rejectLoad:
        | ((error: MetaEmbeddedSignupSdkError) => void)
        | null = null;
      const loadPromise = new Promise<MetaFacebookSdk>(
        (resolve, reject) => {
          resolveLoad = resolve;
          rejectLoad = reject;
        },
      );
      activeLoad = loadPromise;

      const previousAsyncInit = windowObject.fbAsyncInit;
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeout !== null) {
          clearTimeout(timeout);
        }

        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);

        if (windowObject.fbAsyncInit === handleAsyncInit) {
          windowObject.fbAsyncInit = previousAsyncInit;
        }
      };

      const fail = (
        code: MetaEmbeddedSignupSdkErrorCode,
        message: string,
      ) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();

        if (createdScript) {
          script.remove();
        }

        activeConfigurationKey = null;
        activeLoad = null;
        rejectLoad?.(
          new MetaEmbeddedSignupSdkError(code, message),
        );
      };

      const initialize = () => {
        if (settled) {
          return;
        }

        const sdk = windowObject.FB;

        if (
          !sdk ||
          typeof sdk.init !== "function" ||
          typeof sdk.login !== "function"
        ) {
          fail(
            "INVALID_SDK",
            "Meta SDK did not expose the expected interface",
          );
          return;
        }

        try {
          sdk.init({
            appId: normalizedConfiguration.appId,
            autoLogAppEvents: true,
            xfbml: true,
            version: normalizedConfiguration.apiVersion,
          });
        } catch {
          fail(
            "INITIALIZATION_FAILED",
            "Meta SDK initialization failed",
          );
          return;
        }

        settled = true;
        cleanup();
        resolveLoad?.(sdk);
      };

      function handleAsyncInit() {
        try {
          previousAsyncInit?.();
        } catch {
          // Another consumer must not block this loader.
        }

        initialize();
      }

      function handleLoad() {
        initialize();
      }

      function handleError() {
        fail("LOAD_FAILED", "Meta SDK could not be loaded");
      }

      windowObject.fbAsyncInit = handleAsyncInit;
      script.addEventListener("load", handleLoad, {
        once: true,
      });
      script.addEventListener("error", handleError, {
        once: true,
      });

      timeout = setTimeout(
        () =>
          fail(
            "LOAD_TIMEOUT",
            "Meta SDK loading timed out",
          ),
        loadTimeoutMs,
      );

      if (windowObject.FB) {
        initialize();
      } else if (createdScript) {
        script.id = META_SDK_SCRIPT_ID;
        script.src = META_SDK_SOURCE;
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        documentObject.head.appendChild(script);
      }

      return loadPromise;
    },
  };
}

export const metaEmbeddedSignupSdkLoader =
  createMetaEmbeddedSignupSdkLoader();
