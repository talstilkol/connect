import type { TenantSession } from "../auth/tenantSession.ts";
import type { MetaEmbeddedSignupCompletionResult } from "./metaEmbeddedSignupCompletion.ts";

export const META_SIGNUP_COMPLETE_OPERATION = "meta.embedded-signup.complete" as const;
export const META_SIGNUP_CONFIGURATION_OPERATION = "meta.embedded-signup.configuration" as const;

export interface MetaSignupAttemptCommand {
  readonly session: Readonly<TenantSession>;
  readonly claimKey: string;
  readonly requestDigest: string;
  readonly launchId?: number;
  readonly launchConfigurationKey?: string;
  // Set only by the trusted Business App composition, never from HTTP input.
  readonly synchronizeBusinessApp?: true;
}

export interface MetaSignupAttemptResult {
  readonly status: MetaEmbeddedSignupCompletionResult["status"];
  readonly connectionVersion: number | null;
}

export interface MetaSignupAttemptRepository {
  claim(command: MetaSignupAttemptCommand): Promise<
    | { outcome: "claimed"; baselineConnectionVersion?: number | null }
    | { outcome: "in-progress" | "conflict" }
    | { outcome: "completed"; result: MetaSignupAttemptResult }
  >;
  complete(command: MetaSignupAttemptCommand, result: MetaSignupAttemptResult): Promise<void>;
}

const failureStatuses = [
  "configuration-required", "configuration-invalid", "unauthenticated",
  "onboarding-required", "tenant-selection-required", "permission-denied",
  "validation-error", "authorization-failed", "verification-failed",
  "subscription-failed", "synchronization-required", "server-error",
] as const;

export function parseMetaSignupAttemptResult(value: unknown): MetaSignupAttemptResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "connectionVersion,status" ||
    !("status" in value) || !("connectionVersion" in value)) return null;
  if (value.status === "connected" && Number.isSafeInteger(value.connectionVersion) &&
    Number(value.connectionVersion) > 0) {
    return Object.freeze({ status: "connected", connectionVersion: Number(value.connectionVersion) });
  }
  const status = failureStatuses.find((status) => status === value.status);
  return status && value.connectionVersion === null
    ? Object.freeze({ status, connectionVersion: null }) : null;
}

export function parseMetaSignupCompletionResult(value: unknown): MetaEmbeddedSignupCompletionResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("status" in value)) return null;
  const background = Object.hasOwn(value,'synchronization');
  if (value.status === "connected" && Object.keys(value).sort().join(",") === (background ? "connection,status,synchronization" : "connection,status") &&
    (!background || ('synchronization' in value && value.synchronization === 'background')) &&
    "connection" in value && typeof value.connection === "object" && value.connection !== null &&
    Object.keys(value.connection).join(",") === "status" && "status" in value.connection &&
    value.connection.status === "connected") {
    return { status: "connected", connection: { status: "connected" }, ...(background ? { synchronization:'background' as const } : {}) };
  }
  const status = failureStatuses.find((status) => status === value.status);
  return status && Object.keys(value).join(",") === "status" ? { status } : null;
}
