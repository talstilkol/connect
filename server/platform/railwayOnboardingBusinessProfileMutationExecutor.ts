import type {
  AuthenticatedIdentity,
  TenantSession,
} from "../auth/tenantSession.ts";
import type {
  BusinessProfileDraft,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  BusinessProfileSaveView,
} from "../../shared/domain/businessProfileView.ts";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import {
  parseRailwayBusinessProfileSaveView,
} from "../onboarding/railwayBusinessProfileResult.ts";
import {
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
} from "./railwayOnboardingBusinessProfileOperationContract.ts";

export {
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
} from "./railwayOnboardingBusinessProfileOperationContract.ts";

export type RailwayOnboardingBusinessProfileMutationState =
  Readonly<BusinessProfileSaveView>;

export interface RailwayOnboardingBusinessProfileMutationCommand {
  readonly identity: Readonly<AuthenticatedIdentity>;
  readonly session: Readonly<TenantSession> | null;
  readonly operation:
    typeof RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: Readonly<BusinessProfileDraft>;
}

export type RailwayOnboardingBusinessProfileMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      state: RailwayOnboardingBusinessProfileMutationState;
    }>
  | Readonly<{
      outcome: "conflict" | "unavailable";
      tenantId: null;
      state: null;
    }>;

const businessProfilePayloadKeys = Object.freeze([
  "businessName",
  "interfaceLanguage",
  "timezone",
]);

function snapshotBusinessProfilePayload(
  value: unknown,
): Readonly<BusinessProfileDraft> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  try {
    if (Array.isArray(value)) {
      return null;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return null;
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actualKeys = Reflect.ownKeys(descriptors);
    if (
      actualKeys.length !== businessProfilePayloadKeys.length ||
      actualKeys.some((key) =>
        typeof key !== "string" ||
        !businessProfilePayloadKeys.includes(key)
      )
    ) {
      return null;
    }

    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of businessProfilePayloadKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) {
        return null;
      }
      snapshot[key] = descriptor.value;
    }

    const validation = validatePersistedBusinessProfile(snapshot);
    if (
      !validation.success ||
      validation.value.businessName !== snapshot.businessName ||
      validation.value.timezone !== snapshot.timezone ||
      validation.value.interfaceLanguage !== snapshot.interfaceLanguage
    ) {
      return null;
    }

    return Object.freeze({ ...validation.value });
  } catch {
    return null;
  }
}

export function parseRailwayOnboardingBusinessProfileMutationState(
  payload: unknown,
  value: unknown,
): RailwayOnboardingBusinessProfileMutationState | null {
  const parsedPayload = snapshotBusinessProfilePayload(payload);
  const state = parseRailwayBusinessProfileSaveView(value);
  if (
    parsedPayload === null ||
    state === null ||
    state.profile.businessName !== parsedPayload.businessName ||
    state.profile.timezone !== parsedPayload.timezone ||
    state.profile.interfaceLanguage !== parsedPayload.interfaceLanguage
  ) {
    return null;
  }
  return state;
}

export interface RailwayOnboardingBusinessProfileMutationExecutor {
  execute(
    command: Readonly<RailwayOnboardingBusinessProfileMutationCommand>,
  ): Promise<RailwayOnboardingBusinessProfileMutationResult>;
}
