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
  SensitiveMetaAccessToken,
} from "./metaPorts";

import type { MetaCoexistenceAssetResolver } from "./metaGraphAssetVerifier.ts";

export type MetaConnectionOrchestrationErrorCode =
  | "INVALID_INPUT"
  | "COEXISTENCE_SYNCHRONIZATION_REQUIRED"
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

export interface CompleteMetaBusinessAppSignupInput {
  flow: "business-app";
  authorizationCode: string;
  wabaId: string;
}

export function normalizeMetaBusinessAppSignupInput(input: unknown): CompleteMetaBusinessAppSignupInput {
  if (!isRecord(input) || input.flow !== "business-app" ||
    Object.keys(input).some((key) => !["flow","authorizationCode","wabaId","launchId"].includes(key))) {
    throw new MetaConnectionOrchestrationError("INVALID_INPUT", "Business app signup input is invalid");
  }
  const wabaId = requireBoundedValue(input.wabaId, "wabaId", 64);
  if (!/^[1-9][0-9]{0,63}$/.test(wabaId)) throw new MetaConnectionOrchestrationError("INVALID_INPUT", "Business app WABA is invalid");
  return { flow: "business-app", wabaId, authorizationCode: requireBoundedValue(input.authorizationCode, "authorizationCode", 4096) };
}

export interface MetaConnectionOrchestrator {
  completeBusinessAppSignup(
    session: TenantSession,
    input: unknown,
    context: { expectedConnectionVersion: number | null },
  ): Promise<MetaConnectionRecord>;
  completeEmbeddedSignup(
    session: TenantSession,
    input: unknown,
    context?: { expectedConnectionVersion: number | null },
  ): Promise<MetaConnectionRecord>;
  retryWabaSubscription(
    session: TenantSession,
  ): Promise<MetaConnectionRecord>;
}

export interface MetaConnectionOrchestratorDependencies {
  authorizationCodeExchanger: MetaAuthorizationCodeExchanger;
  assetVerifier: MetaAssetVerifier;
  coexistenceAssetResolver?: MetaCoexistenceAssetResolver;
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

export function normalizeMetaEmbeddedSignupInput(
  input: unknown,
): CompleteMetaEmbeddedSignupInput {
  if (!isRecord(input)) {
    throw new MetaConnectionOrchestrationError(
      "INVALID_INPUT",
      "Meta signup input is invalid",
    );
  }

  // Do not register or mark a Coexistence account connected before its
  // durable contacts/history/echo pipeline is implemented and wired.
  // This is deliberately a server gate; bypassing the UI cannot enable it.
  if (input.flow === "business-app") {
    throw new MetaConnectionOrchestrationError(
      "COEXISTENCE_SYNCHRONIZATION_REQUIRED",
      "WhatsApp Business app synchronization is not ready",
    );
  }

  if (input.flow !== undefined && input.flow !== "cloud-api") {
    throw new MetaConnectionOrchestrationError(
      "INVALID_INPUT",
      "Meta signup flow is invalid",
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
  input: VerifiedMetaAssetSnapshot,
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

async function assertCurrentPendingConnection(
  service: MetaConnectionService,
  session: TenantSession,
  expected: MetaConnectionRecord,
): Promise<void> {
  const current = await service.read(session);
  if (
    !current ||
    current.tenantId !== session.tenantId ||
    current.status !== "pending" ||
    current.version !== expected.version
  ) {
    throw new MetaConnectionOrchestrationError(
      "INVALID_CONNECTION_STATE",
      "Meta connection changed before subscription",
    );
  }
  assertMatchingAssets(expected, current);
}

export function createMetaConnectionOrchestrator(
  dependencies: MetaConnectionOrchestratorDependencies,
): MetaConnectionOrchestrator {
  async function finishRegistration(session: TenantSession, verifiedSnapshot: VerifiedMetaAssetSnapshot,
    accessToken: SensitiveMetaAccessToken, context?: { expectedConnectionVersion: number | null }): Promise<MetaConnectionRecord> {
    const pendingConnection = await runExternalStep(
      () =>
        dependencies.connectionService.captureVerifiedAssets(
          session,
          verifiedSnapshot,
          context?.expectedConnectionVersion,
        ),
      "ASSET_PERSISTENCE_FAILED",
      "Verified Meta assets could not be persisted",
    );

    assertConnectionStatus(pendingConnection, "pending");
    assertMatchingAssets(verifiedSnapshot, pendingConnection);
    if (pendingConnection.tenantId !== session.tenantId) {
      throw new MetaConnectionOrchestrationError("ASSET_MISMATCH", "Persisted Meta connection does not match the workspace");
    }

    await runExternalStep(
      () =>
        dependencies.credentialVault.storeAccessToken(
          session.tenantId,
          accessToken,
          pendingConnection.version,
        ),
      "CREDENTIAL_STORAGE_FAILED",
      "Meta credential could not be stored",
    );
    await runExternalStep(
      async () => {
        await assertCurrentPendingConnection(
          dependencies.connectionService,
          session,
          pendingConnection,
        );
        await dependencies.wabaSubscriber.subscribeWaba(
          verifiedSnapshot.wabaId,
          accessToken,
        );
      },
      "WABA_SUBSCRIPTION_FAILED",
      "Meta WABA subscription failed",
    );

    return assertConnectionStatus(
      await runExternalStep(
        () =>
          dependencies.connectionService
            .confirmWebhookSubscription(session, pendingConnection.version),
        "CONNECTION_CONFIRMATION_FAILED",
        "Meta connection could not be confirmed",
      ),
      "connected",
    );
  }
  return {
    async completeEmbeddedSignup(session, input, context) {
      requireTenantPermission(session, "workspace.manage");
      const normalizedInput = normalizeMetaEmbeddedSignupInput(input);
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

      return finishRegistration(session, verifiedSnapshot, accessToken, context);
    },

    async completeBusinessAppSignup(session, input, context) {
      requireTenantPermission(session, "workspace.manage");
      const normalized = normalizeMetaBusinessAppSignupInput(input);
      if (!dependencies.coexistenceAssetResolver || !context || typeof context !== "object" ||
        (context.expectedConnectionVersion !== null && (!Number.isSafeInteger(context.expectedConnectionVersion) || context.expectedConnectionVersion <= 0))) {
        throw new MetaConnectionOrchestrationError("COEXISTENCE_SYNCHRONIZATION_REQUIRED", "Business app orchestration is unavailable");
      }
      const accessToken = await runExternalStep(
        () => dependencies.authorizationCodeExchanger.exchangeAuthorizationCode(normalized.authorizationCode),
        "CODE_EXCHANGE_FAILED", "Meta authorization code exchange failed",
      );
      const assets = normalizeVerifiedSnapshot(await runExternalStep(
        () => dependencies.coexistenceAssetResolver!.resolveAssets({ accessToken, wabaId: normalized.wabaId }),
        "ASSET_VERIFICATION_FAILED", "Business app assets could not be resolved",
      ));
      if (assets.wabaId !== normalized.wabaId) throw new MetaConnectionOrchestrationError("ASSET_MISMATCH", "Resolved WABA does not match signup");
      // The number is already registered. Shared verification, storage and
      // subscription do not contain a phone registration POST.
      return finishRegistration(session, assets, accessToken, context);
    },

    async retryWabaSubscription(session) {
      requireTenantPermission(session, "workspace.manage");
      const connection =
        await dependencies.connectionService.read(session);

      if (!connection) {
        throw new MetaConnectionOrchestrationError(
          "CONNECTION_NOT_FOUND",
          "Meta connection was not found",
        );
      }

      if (connection.tenantId !== session.tenantId) {
        throw new MetaConnectionOrchestrationError(
          "ASSET_MISMATCH",
          "Meta connection does not belong to the current workspace",
        );
      }

      if (connection.status === "connected") {
        return connection;
      }

      // Revoked/restricted connections need fresh authorization, not a retry
      // using an old credential. Only a failed initial subscription is retried.
      assertConnectionStatus(connection, "pending");

      await runExternalStep(
        () =>
          dependencies.credentialVault.withAccessToken(
            session.tenantId,
            async (accessToken) => {
              const verified = normalizeVerifiedSnapshot(
                await dependencies.assetVerifier.verifyAssets({
                  accessToken,
                  businessPortfolioId: connection.businessPortfolioId,
                  wabaId: connection.wabaId,
                  phoneNumberId: connection.phoneNumberId,
                }),
              );
              assertMatchingAssets(connection, verified);
              await assertCurrentPendingConnection(
                dependencies.connectionService,
                session,
                connection,
              );
              await dependencies.wabaSubscriber.subscribeWaba(
                connection.wabaId,
                accessToken,
              );
            },
          ),
        "WABA_SUBSCRIPTION_FAILED",
        "Meta WABA subscription failed",
      );

      return assertConnectionStatus(
        await runExternalStep(
          () =>
            dependencies.connectionService
              .confirmWebhookSubscription(session, connection.version),
          "CONNECTION_CONFIRMATION_FAILED",
          "Meta connection could not be confirmed",
        ),
        "connected",
      );
    },
  };
}
