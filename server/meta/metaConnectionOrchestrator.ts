import type {
  MetaConnectionRecord,
} from "../../shared/domain/metaConnection";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import type {
  MetaConnectionService,
  VerifiedMetaAssetSnapshot,
} from "./metaConnectionService";
import type {
  MetaAssetVerifier,
  MetaAuthorizationCodeExchanger,
  MetaCredentialVault,
  MetaWabaSubscriber,
} from "./metaPorts";

export type MetaConnectionOrchestrationErrorCode =
  | "INVALID_INPUT"
  | "CODE_EXCHANGE_FAILED"
  | "ASSET_VERIFICATION_FAILED"
  | "ASSET_MISMATCH"
  | "ASSET_PERSISTENCE_FAILED"
  | "CREDENTIAL_STORAGE_FAILED"
  | "WABA_SUBSCRIPTION_FAILED"
  | "CONNECTION_CONFIRMATION_FAILED"
  | "CONNECTION_NOT_FOUND"
  | "INVALID_CONNECTION_STATE";

export class MetaConnectionOrchestrationError extends Error {
  readonly code: MetaConnectionOrchestrationErrorCode;

  constructor(
    code: MetaConnectionOrchestrationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MetaConnectionOrchestrationError";
    this.code = code;
  }
}

export interface CompleteMetaEmbeddedSignupInput {
  authorizationCode: string;
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
}

export interface MetaConnectionOrchestrator {
  completeEmbeddedSignup(
    session: TenantSession,
    input: unknown,
  ): Promise<MetaConnectionRecord>;
  retryWabaSubscription(
    session: TenantSession,
  ): Promise<MetaConnectionRecord>;
}

export interface MetaConnectionOrchestratorDependencies {
  authorizationCodeExchanger: MetaAuthorizationCodeExchanger;
  assetVerifier: MetaAssetVerifier;
  credentialVault: MetaCredentialVault;
  wabaSubscriber: MetaWabaSubscriber;
  connectionService: MetaConnectionService;
}

function requireBoundedValue(
  value: unknown,
  fieldName: string,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    throw new MetaConnectionOrchestrationError(
      "INVALID_INPUT",
      `${fieldName} is invalid`,
    );
  }

  const normalizedValue = value.trim();

  if (
    normalizedValue.length === 0 ||
    normalizedValue.length > maximumLength
  ) {
    throw new MetaConnectionOrchestrationError(
      "INVALID_INPUT",
      `${fieldName} is invalid`,
    );
  }

  return normalizedValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeSignupInput(
  input: unknown,
): CompleteMetaEmbeddedSignupInput {
  if (!isRecord(input)) {
    throw new MetaConnectionOrchestrationError(
      "INVALID_INPUT",
      "Meta signup input is invalid",
    );
  }

  return {
    authorizationCode: requireBoundedValue(
      input.authorizationCode,
      "authorizationCode",
      4096,
    ),
    businessPortfolioId: requireBoundedValue(
      input.businessPortfolioId,
      "businessPortfolioId",
      255,
    ),
    wabaId: requireBoundedValue(input.wabaId, "wabaId", 255),
    phoneNumberId: requireBoundedValue(
      input.phoneNumberId,
      "phoneNumberId",
      255,
    ),
  };
}

function normalizeVerifiedSnapshot(
  snapshot: VerifiedMetaAssetSnapshot,
): VerifiedMetaAssetSnapshot {
  try {
    return {
      businessPortfolioId: requireBoundedValue(
        snapshot.businessPortfolioId,
        "verified.businessPortfolioId",
        255,
      ),
      wabaId: requireBoundedValue(
        snapshot.wabaId,
        "verified.wabaId",
        255,
      ),
      phoneNumberId: requireBoundedValue(
        snapshot.phoneNumberId,
        "verified.phoneNumberId",
        255,
      ),
    };
  } catch {
    throw new MetaConnectionOrchestrationError(
      "ASSET_VERIFICATION_FAILED",
      "Meta asset verification returned invalid data",
    );
  }
}

function assertMatchingAssets(
  input: CompleteMetaEmbeddedSignupInput,
  verifiedSnapshot: VerifiedMetaAssetSnapshot,
): void {
  if (
    input.businessPortfolioId !==
      verifiedSnapshot.businessPortfolioId ||
    input.wabaId !== verifiedSnapshot.wabaId ||
    input.phoneNumberId !== verifiedSnapshot.phoneNumberId
  ) {
    throw new MetaConnectionOrchestrationError(
      "ASSET_MISMATCH",
      "Verified Meta assets do not match the signup result",
    );
  }
}

function assertConnectionStatus(
  connection: MetaConnectionRecord,
  expectedStatus: "pending" | "connected",
): MetaConnectionRecord {
  if (connection.status !== expectedStatus) {
    throw new MetaConnectionOrchestrationError(
      "INVALID_CONNECTION_STATE",
      `Meta connection must be ${expectedStatus}`,
    );
  }

  return connection;
}

async function runExternalStep<TResult>(
  operation: () => Promise<TResult>,
  code: MetaConnectionOrchestrationErrorCode,
  message: string,
): Promise<TResult> {
  try {
    return await operation();
  } catch {
    throw new MetaConnectionOrchestrationError(code, message);
  }
}

export function createMetaConnectionOrchestrator(
  dependencies: MetaConnectionOrchestratorDependencies,
): MetaConnectionOrchestrator {
  return {
    async completeEmbeddedSignup(session, input) {
      requireTenantPermission(session, "workspace.manage");
      const normalizedInput = normalizeSignupInput(input);
      const accessToken = await runExternalStep(
        () =>
          dependencies.authorizationCodeExchanger
            .exchangeAuthorizationCode(
              normalizedInput.authorizationCode,
            ),
        "CODE_EXCHANGE_FAILED",
        "Meta authorization code exchange failed",
      );
      const verifiedSnapshot = normalizeVerifiedSnapshot(
        await runExternalStep(
          () =>
            dependencies.assetVerifier.verifyAssets({
              accessToken,
              businessPortfolioId:
                normalizedInput.businessPortfolioId,
              wabaId: normalizedInput.wabaId,
              phoneNumberId: normalizedInput.phoneNumberId,
            }),
          "ASSET_VERIFICATION_FAILED",
          "Meta asset verification failed",
        ),
      );

      assertMatchingAssets(normalizedInput, verifiedSnapshot);

      const pendingConnection = await runExternalStep(
        () =>
          dependencies.connectionService.captureVerifiedAssets(
            session,
            verifiedSnapshot,
          ),
        "ASSET_PERSISTENCE_FAILED",
        "Verified Meta assets could not be persisted",
      );

      assertConnectionStatus(pendingConnection, "pending");

      await runExternalStep(
        () =>
          dependencies.credentialVault.storeAccessToken(
            session.tenantId,
            accessToken,
          ),
        "CREDENTIAL_STORAGE_FAILED",
        "Meta credential could not be stored",
      );
      await runExternalStep(
        () =>
          dependencies.wabaSubscriber.subscribeWaba(
            verifiedSnapshot.wabaId,
            accessToken,
          ),
        "WABA_SUBSCRIPTION_FAILED",
        "Meta WABA subscription failed",
      );

      return assertConnectionStatus(
        await runExternalStep(
          () =>
            dependencies.connectionService
              .confirmWebhookSubscription(session),
          "CONNECTION_CONFIRMATION_FAILED",
          "Meta connection could not be confirmed",
        ),
        "connected",
      );
    },

    async retryWabaSubscription(session) {
      const connection =
        await dependencies.connectionService.read(session);

      if (!connection) {
        throw new MetaConnectionOrchestrationError(
          "CONNECTION_NOT_FOUND",
          "Meta connection was not found",
        );
      }

      if (connection.status === "connected") {
        return connection;
      }

      await runExternalStep(
        () =>
          dependencies.credentialVault.withAccessToken(
            session.tenantId,
            (accessToken) =>
              dependencies.wabaSubscriber.subscribeWaba(
                connection.wabaId,
                accessToken,
              ),
          ),
        "WABA_SUBSCRIPTION_FAILED",
        "Meta WABA subscription failed",
      );

      return assertConnectionStatus(
        await runExternalStep(
          () =>
            dependencies.connectionService
              .confirmWebhookSubscription(session),
          "CONNECTION_CONFIRMATION_FAILED",
          "Meta connection could not be confirmed",
        ),
        "connected",
      );
    },
  };
}
