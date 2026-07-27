const MAXIMUM_DATE_DAYS = 100_000_000;

export const RETENTION_DATA_CLASSES = [
  "tenant-account-data",
  "contact-and-consent-data",
  "meta-connection-and-credential-data",
  "webhook-receipts",
  "template-records",
  "campaign-and-delivery-records",
  "conversation-and-message-data",
  "bot-flow-and-delivery-data",
  "ai-agent-and-runtime-data",
  "knowledge-source-data-and-objects",
  "billing-and-subscription-events",
  "audit-logs",
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

export interface RetentionPolicyRule {
  dataClass: RetentionDataClass;
  trigger: RetentionTrigger;
  retainForDays: number;
}

export interface RetentionPolicy {
  version: 1;
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
  | "RULE_INVALID";

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
): RetentionPolicyRule | null {
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
    return null;
  }

  return {
    dataClass: value.dataClass,
    trigger: value.trigger,
    retainForDays: Number(
      value.retainForDays,
    ),
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
    parsed.version !== 1 ||
    !Array.isArray(parsed.rules)
  ) {
    return {
      status: "configuration-required",
      issues: ["POLICY_SHAPE_INVALID"],
    };
  }

  const rules = parsed.rules.map(parseRule);

  if (rules.some((rule) => rule === null)) {
    return {
      status: "configuration-required",
      issues: ["RULE_INVALID"],
    };
  }

  const validRules =
    rules as RetentionPolicyRule[];
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
      version: 1,
      rules: RETENTION_DATA_CLASSES.map(
        (dataClass) => ({
          ...ruleByDataClass.get(dataClass)!,
        }),
      ),
    },
  };
}
