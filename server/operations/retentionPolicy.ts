const MAXIMUM_DATE_DAYS = 100_000_000;

export const RETENTION_DATA_CLASSES = [
  "tenant-account-data",
  "contact-data",
  "consent-events",
  "meta-connection-data",
  "meta-credential-data",
  "webhook-receipts",
  "template-records",
  "campaign-records",
  "delivery-records",
  "conversation-data",
  "message-data",
  "bot-flow-data",
  "bot-delivery-data",
  "ai-agent-data",
  "ai-runtime-data",
  "knowledge-source-data",
  "knowledge-source-objects",
  "billing-events",
  "subscription-data",
  "audit-logs",
  "production-decision-data",
  "production-decision-events",
  "team-invitation-data",
  "team-invitation-delivery-data",
  "team-invitation-events",
] as const;

export type RetentionDataClass =
  (typeof RETENTION_DATA_CLASSES)[number];

export const RETENTION_TRIGGERS = [
  "record-created",
  "record-terminal",
  "tenant-closed",
] as const;

export type RetentionTrigger =
  (typeof RETENTION_TRIGGERS)[number];

export const RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS =
  Object.freeze({
    "tenant-account-data": "tenant-closed",
    "contact-data": "tenant-closed",
    "consent-events": "record-created",
    "meta-connection-data": "tenant-closed",
    "meta-credential-data": "tenant-closed",
    "webhook-receipts": "record-terminal",
    "template-records": "tenant-closed",
    "campaign-records": "record-terminal",
    "delivery-records": "record-terminal",
    "conversation-data": "record-terminal",
    "message-data": "record-terminal",
    "bot-flow-data": "tenant-closed",
    "bot-delivery-data": "record-terminal",
    "ai-agent-data": "tenant-closed",
    "ai-runtime-data": "record-terminal",
    "knowledge-source-data": "tenant-closed",
    "knowledge-source-objects": "tenant-closed",
    "billing-events": "record-created",
    "subscription-data": "record-terminal",
    "audit-logs": "record-created",
    "production-decision-data":
      "record-terminal",
    "production-decision-events":
      "record-created",
    "team-invitation-data":
      "record-terminal",
    "team-invitation-delivery-data":
      "record-terminal",
    "team-invitation-events":
      "record-created",
  } satisfies Record<
    RetentionDataClass,
    RetentionTrigger
  >);

export interface RetentionPolicyRule {
  dataClass: RetentionDataClass;
  trigger: RetentionTrigger;
  retainForDays: number;
}

export interface RetentionPolicy {
  version: 2;
  rules: readonly RetentionPolicyRule[];
}

export interface RetentionPolicyEnvironment {
  RETENTION_POLICY_JSON?: string;
}

export type RetentionPolicyIssue =
  | "POLICY_REQUIRED"
  | "POLICY_JSON_INVALID"
  | "POLICY_SHAPE_INVALID"
  | "DATA_CLASS_COVERAGE_INVALID"
  | "RULE_INVALID"
  | "TRIGGER_NOT_ALLOWED";

export type RetentionPolicyInspection =
  | {
      status: "configured";
      configuration: RetentionPolicy;
    }
  | {
      status: "configuration-required";
      issues: readonly RetentionPolicyIssue[];
    };

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);

  return (
    actual.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(value, key),
    )
  );
}

function isDataClass(
  value: unknown,
): value is RetentionDataClass {
  return (
    typeof value === "string" &&
    RETENTION_DATA_CLASSES.some(
      (candidate) => candidate === value,
    )
  );
}

function isTrigger(
  value: unknown,
): value is RetentionTrigger {
  return (
    typeof value === "string" &&
    RETENTION_TRIGGERS.some(
      (candidate) => candidate === value,
    )
  );
}

function parseRule(
  value: unknown,
):
  | {
      status: "valid";
      rule: RetentionPolicyRule;
    }
  | {
      status: "invalid";
      issue:
        | "RULE_INVALID"
        | "TRIGGER_NOT_ALLOWED";
    } {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "dataClass",
      "trigger",
      "retainForDays",
    ]) ||
    !isDataClass(value.dataClass) ||
    !isTrigger(value.trigger) ||
    !Number.isSafeInteger(
      value.retainForDays,
    ) ||
    Number(value.retainForDays) <= 0 ||
    Number(value.retainForDays) >
      MAXIMUM_DATE_DAYS
  ) {
    return {
      status: "invalid",
      issue: "RULE_INVALID",
    };
  }

  if (
    RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS[
      value.dataClass
    ] !== value.trigger
  ) {
    return {
      status: "invalid",
      issue: "TRIGGER_NOT_ALLOWED",
    };
  }

  return {
    status: "valid",
    rule: {
      dataClass: value.dataClass,
      trigger: value.trigger,
      retainForDays: Number(
        value.retainForDays,
      ),
    },
  };
}

export function inspectRetentionPolicy(
  environment: RetentionPolicyEnvironment,
): RetentionPolicyInspection {
  if (
    environment.RETENTION_POLICY_JSON ===
    undefined
  ) {
    return {
      status: "configuration-required",
      issues: ["POLICY_REQUIRED"],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(
      environment.RETENTION_POLICY_JSON,
    );
  } catch {
    return {
      status: "configuration-required",
      issues: ["POLICY_JSON_INVALID"],
    };
  }

  if (
    !isRecord(parsed) ||
    !hasExactKeys(parsed, [
      "version",
      "rules",
    ]) ||
    parsed.version !== 2 ||
    !Array.isArray(parsed.rules)
  ) {
    return {
      status: "configuration-required",
      issues: ["POLICY_SHAPE_INVALID"],
    };
  }

  const parsedRules = parsed.rules.map(parseRule);
  const invalidRule = parsedRules.find(
    (result) => result.status === "invalid",
  );

  if (invalidRule?.status === "invalid") {
    return {
      status: "configuration-required",
      issues: [invalidRule.issue],
    };
  }

  const validRules = parsedRules.map(
    (result) => {
      if (result.status !== "valid") {
        throw new Error(
          "Retention rule parsing invariant failed",
        );
      }

      return result.rule;
    },
  );
  const receivedClasses = new Set(
    validRules.map((rule) => rule.dataClass),
  );

  if (
    validRules.length !==
      RETENTION_DATA_CLASSES.length ||
    receivedClasses.size !==
      RETENTION_DATA_CLASSES.length ||
    !RETENTION_DATA_CLASSES.every(
      (dataClass) =>
        receivedClasses.has(dataClass),
    )
  ) {
    return {
      status: "configuration-required",
      issues: [
        "DATA_CLASS_COVERAGE_INVALID",
      ],
    };
  }

  const ruleByDataClass = new Map(
    validRules.map((rule) => [
      rule.dataClass,
      rule,
    ]),
  );

  return {
    status: "configured",
    configuration: {
      version: 2,
      rules: RETENTION_DATA_CLASSES.map(
        (dataClass) => ({
          ...ruleByDataClass.get(dataClass)!,
        }),
      ),
    },
  };
}
