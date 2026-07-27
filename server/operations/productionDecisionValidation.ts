import {
  PRODUCTION_DECISION_REGISTRY,
} from "../../shared/domain/productionDecisionRegistry.ts";
import type {
  ProductionDecisionCheckId,
} from "../../shared/domain/productionDecisionRecord.ts";

const EVENT_KEY_PATTERN =
  /^production_decision_event_v1_[0-9a-f]{64}$/;
const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

export function isProductionDecisionCheckId(
  value: unknown,
): value is ProductionDecisionCheckId {
  return (
    typeof value === "string" &&
    PRODUCTION_DECISION_REGISTRY.some(
      (definition) =>
        definition.checkId === value,
    )
  );
}

export function requireProductionDecisionCheckId(
  value: unknown,
): ProductionDecisionCheckId {
  if (!isProductionDecisionCheckId(value)) {
    throw new Error(
      "production decision check ID is invalid",
    );
  }

  return value;
}

function requireBoundedText(
  value: unknown,
  maximumLength: number,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new Error(
      `${fieldName} is invalid`,
    );
  }

  const normalized = value
    .replace(/\r\n?/gu, "\n")
    .trim();

  if (
    normalized.length === 0 ||
    normalized.length > maximumLength ||
    CONTROL_CHARACTER_PATTERN.test(
      normalized,
    )
  ) {
    throw new Error(
      `${fieldName} is invalid`,
    );
  }

  return normalized;
}

export function requireProductionDecisionSelection(
  value: unknown,
): string {
  return requireBoundedText(
    value,
    120,
    "production decision selection",
  );
}

export function requireProductionDecisionRationale(
  value: unknown,
): string {
  return requireBoundedText(
    value,
    2_000,
    "production decision rationale",
  );
}

export function requireProductionDecisionVersion(
  value: unknown,
  allowZero = false,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < (allowZero ? 0 : 1)
  ) {
    throw new Error(
      "production decision version is invalid",
    );
  }

  return Number(value);
}

export function requireProductionDecisionEventKey(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !EVENT_KEY_PATTERN.test(value)
  ) {
    throw new Error(
      "production decision event key is invalid",
    );
  }

  return value;
}

export function requireProductionDecisionActor(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 255 ||
    value.trim() !== value ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    throw new Error(
      "production decision actor is invalid",
    );
  }

  return value;
}

export function requireProductionDecisionTimestamp(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    value.length !== 24 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(
      value,
    ) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(
      "production decision timestamp is invalid",
    );
  }

  return value;
}
