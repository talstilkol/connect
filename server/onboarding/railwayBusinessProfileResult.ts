import type {
  BusinessProfileSaveView,
  BusinessProfileView,
} from "../../shared/domain/businessProfileView.ts";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";

function snapshotExactDataRecord(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
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
      actualKeys.length !== keys.length ||
      actualKeys.some((key) =>
        typeof key !== "string" || !keys.includes(key)
      )
    ) {
      return null;
    }

    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
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

    return snapshot;
  } catch {
    return null;
  }
}

export function parseRailwayBusinessProfileView(
  value: unknown,
): Readonly<BusinessProfileView> | null {
  const record = snapshotExactDataRecord(value, [
    "businessName",
    "interfaceLanguage",
    "timezone",
    "version",
  ]);
  if (
    record === null ||
    !Number.isSafeInteger(record.version) ||
    Number(record.version) <= 0
  ) {
    return null;
  }
  const validation = validatePersistedBusinessProfile({
    businessName: record.businessName,
    timezone: record.timezone,
    interfaceLanguage: record.interfaceLanguage,
  });
  if (
    !validation.success ||
    validation.value.businessName !== record.businessName ||
    validation.value.timezone !== record.timezone ||
    validation.value.interfaceLanguage !== record.interfaceLanguage
  ) {
    return null;
  }
  return Object.freeze({
    ...validation.value,
    version: Number(record.version),
  });
}

export function parseRailwayBusinessProfileSaveView(
  value: unknown,
): Readonly<BusinessProfileSaveView> | null {
  const record = snapshotExactDataRecord(value, [
    "createdTenant",
    "profile",
  ]);
  if (
    record === null ||
    typeof record.createdTenant !== "boolean"
  ) {
    return null;
  }
  const profile = parseRailwayBusinessProfileView(record.profile);
  return profile === null
    ? null
    : Object.freeze({ createdTenant: record.createdTenant, profile });
}
