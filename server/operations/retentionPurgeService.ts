import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS,
  RETENTION_DATA_CLASSES,
  type RetentionDataClass,
  type RetentionPolicy,
  type RetentionTrigger,
} from "./retentionPolicy.ts";

const PLAN_ID_PREFIX =
  "retention_plan_v2_";
const CONFIRMATION_PREFIX =
  "retention_purge_v2_";
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MAXIMUM_DATE_DAYS = 100_000_000;
export const RETENTION_PURGE_PLAN_TTL_MS =
  5 * 60 * 1_000;

export interface RetentionPurgeClock {
  now(): Date;
}

export interface RetentionPurgeProtections {
  excludeActiveRecords: true;
  excludeLegalHolds: true;
}

export const REQUIRED_RETENTION_PROTECTIONS:
  RetentionPurgeProtections = Object.freeze({
    excludeActiveRecords: true,
    excludeLegalHolds: true,
  });

export interface RetentionInventoryPort {
  inspect(input: {
    dataClass: RetentionDataClass;
    trigger: RetentionTrigger;
    cutoffAt: string;
    protections: RetentionPurgeProtections;
  }): Promise<unknown>;
}

export interface AtomicRetentionPurgePort {
  /**
   * The adapter must revalidate the candidate digest and
   * protections inside the same transaction/claim that
   * performs deletion. A rejected promise must mean that
   * the transaction was rolled back.
   */
  purgeAtomically(input: {
    plan: RetentionPurgePlan;
    expectedPlanId: string;
    expectedPolicyVersion: 2;
    protections: RetentionPurgeProtections;
  }): Promise<unknown>;
}

export interface RetentionPurgePlanEntry {
  dataClass: RetentionDataClass;
  trigger: RetentionTrigger;
  cutoffAt: string;
  eligibleRecords: number;
  eligibleObjects: number;
  candidateSetSha256: string;
  protections: RetentionPurgeProtections;
}

export interface RetentionPurgePlan {
  version: 2;
  planId: string;
  policyVersion: 2;
  generatedAt: string;
  expiresAt: string;
  entries: readonly RetentionPurgePlanEntry[];
}

export interface PreparedRetentionPurge {
  plan: RetentionPurgePlan;
  confirmationKey: string;
}

export interface RetentionPurgeResult {
  outcome: "purged";
  auditStatus:
    | "consistent"
    | "provider-count-mismatch"
    | "provider-result-invalid";
  purgedRecords: number | null;
  purgedObjects: number | null;
  committedAt: string | null;
}

export type RetentionPurgeErrorCode =
  | "CONFIGURATION_INVALID"
  | "CLOCK_UNAVAILABLE"
  | "INVENTORY_UNAVAILABLE"
  | "INVALID_INVENTORY"
  | "INVALID_EXECUTION"
  | "PLAN_EXPIRED"
  | "INVENTORY_CHANGED"
  | "CONFIRMATION_MISMATCH"
  | "PURGE_UNAVAILABLE";

export class RetentionPurgeError extends Error {
  readonly code: RetentionPurgeErrorCode;

  constructor(code: RetentionPurgeErrorCode) {
    super("Retention purge failed");
    this.name = "RetentionPurgeError";
    this.code = code;
  }
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

function isUtcTimestamp(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function isNonNegativeSafeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value) &&
    Number(value) >= 0
  );
}

function validatePolicy(
  policy: RetentionPolicy,
): void {
  if (
    policy.version !== 2 ||
    policy.rules.length !==
      RETENTION_DATA_CLASSES.length ||
    policy.rules.some(
      (rule, index) =>
        rule.dataClass !==
          RETENTION_DATA_CLASSES[index] ||
        rule.trigger !==
          RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS[
            rule.dataClass
          ] ||
        !Number.isSafeInteger(
          rule.retainForDays,
        ) ||
        rule.retainForDays <= 0 ||
        rule.retainForDays >
          MAXIMUM_DATE_DAYS,
    )
  ) {
    throw new RetentionPurgeError(
      "CONFIGURATION_INVALID",
    );
  }
}

function parseInventory(
  value: unknown,
): {
  eligibleRecords: number;
  eligibleObjects: number;
  candidateSetSha256: string;
} {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "eligibleRecords",
      "eligibleObjects",
      "candidateSetSha256",
    ]) ||
    !isNonNegativeSafeInteger(
      value.eligibleRecords,
    ) ||
    !isNonNegativeSafeInteger(
      value.eligibleObjects,
    ) ||
    typeof value.candidateSetSha256 !==
      "string" ||
    !SHA256_PATTERN.test(
      value.candidateSetSha256,
    )
  ) {
    throw new RetentionPurgeError(
      "INVALID_INVENTORY",
    );
  }

  return {
    eligibleRecords: value.eligibleRecords,
    eligibleObjects: value.eligibleObjects,
    candidateSetSha256:
      value.candidateSetSha256,
  };
}

function canonicalUnsignedPlan(
  plan: Omit<RetentionPurgePlan, "planId">,
): string {
  return JSON.stringify({
    version: plan.version,
    policyVersion: plan.policyVersion,
    generatedAt: plan.generatedAt,
    expiresAt: plan.expiresAt,
    entries: plan.entries.map((entry) => ({
      dataClass: entry.dataClass,
      trigger: entry.trigger,
      cutoffAt: entry.cutoffAt,
      eligibleRecords:
        entry.eligibleRecords,
      eligibleObjects:
        entry.eligibleObjects,
      candidateSetSha256:
        entry.candidateSetSha256,
      protections: {
        excludeActiveRecords:
          entry.protections
            .excludeActiveRecords,
        excludeLegalHolds:
          entry.protections
            .excludeLegalHolds,
      },
    })),
  });
}

async function derivePlanId(
  plan: Omit<RetentionPurgePlan, "planId">,
): Promise<string> {
  return (
    PLAN_ID_PREFIX +
    (await sha256Hex(
      new TextEncoder().encode(
        `plan:${canonicalUnsignedPlan(plan)}`,
      ),
    ))
  );
}

async function confirmationKey(
  plan: RetentionPurgePlan,
): Promise<string> {
  return (
    CONFIRMATION_PREFIX +
    (await sha256Hex(
      new TextEncoder().encode(
        `confirmation:${plan.planId}:${canonicalUnsignedPlan(
          plan,
        )}`,
      ),
    ))
  );
}

function parseProtections(
  value: unknown,
): RetentionPurgeProtections | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "excludeActiveRecords",
      "excludeLegalHolds",
    ]) ||
    value.excludeActiveRecords !== true ||
    value.excludeLegalHolds !== true
  ) {
    return null;
  }

  return REQUIRED_RETENTION_PROTECTIONS;
}

async function validatePlan(
  value: unknown,
): Promise<RetentionPurgePlan> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "version",
      "planId",
      "policyVersion",
      "generatedAt",
      "expiresAt",
      "entries",
    ]) ||
    value.version !== 2 ||
    value.policyVersion !== 2 ||
    typeof value.planId !== "string" ||
    !/^retention_plan_v2_[0-9a-f]{64}$/.test(
      value.planId,
    ) ||
    !isUtcTimestamp(value.generatedAt) ||
    !isUtcTimestamp(value.expiresAt) ||
    !Array.isArray(value.entries) ||
    value.entries.length !==
      RETENTION_DATA_CLASSES.length
  ) {
    throw new RetentionPurgeError(
      "INVALID_EXECUTION",
    );
  }

  const entries = value.entries.map(
    (entry, index) => {
      if (
        !isRecord(entry) ||
        !hasExactKeys(entry, [
          "dataClass",
          "trigger",
          "cutoffAt",
          "eligibleRecords",
          "eligibleObjects",
          "candidateSetSha256",
          "protections",
        ]) ||
        entry.dataClass !==
          RETENTION_DATA_CLASSES[index] ||
        entry.trigger !==
          RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS[
            RETENTION_DATA_CLASSES[index]
          ] ||
        !isUtcTimestamp(entry.cutoffAt) ||
        !isNonNegativeSafeInteger(
          entry.eligibleRecords,
        ) ||
        !isNonNegativeSafeInteger(
          entry.eligibleObjects,
        ) ||
        typeof entry.candidateSetSha256 !==
          "string" ||
        !SHA256_PATTERN.test(
          entry.candidateSetSha256,
        ) ||
        parseProtections(entry.protections) ===
          null
      ) {
        throw new RetentionPurgeError(
          "INVALID_EXECUTION",
        );
      }

      return {
        dataClass:
          entry.dataClass as RetentionDataClass,
        trigger:
          entry.trigger as RetentionTrigger,
        cutoffAt: entry.cutoffAt,
        eligibleRecords:
          entry.eligibleRecords,
        eligibleObjects:
          entry.eligibleObjects,
        candidateSetSha256:
          entry.candidateSetSha256,
        protections:
          REQUIRED_RETENTION_PROTECTIONS,
      };
    },
  );
  const plan: RetentionPurgePlan = {
    version: 2,
    planId: value.planId,
    policyVersion: 2,
    generatedAt: value.generatedAt,
    expiresAt: value.expiresAt,
    entries,
  };

  if (
    plan.planId !==
    (await derivePlanId(plan))
  ) {
    throw new RetentionPurgeError(
      "INVALID_EXECUTION",
    );
  }

  return plan;
}

function readNow(
  clock: RetentionPurgeClock,
): number {
  let nowMilliseconds: number;

  try {
    nowMilliseconds = clock.now().getTime();
  } catch {
    throw new RetentionPurgeError(
      "CLOCK_UNAVAILABLE",
    );
  }

  if (!Number.isFinite(nowMilliseconds)) {
    throw new RetentionPurgeError(
      "CLOCK_UNAVAILABLE",
    );
  }

  return nowMilliseconds;
}

function validatePlanAgainstPolicy(
  plan: RetentionPurgePlan,
  policy: RetentionPolicy,
  clock: RetentionPurgeClock,
): void {
  validatePolicy(policy);
  const nowMilliseconds = readNow(clock);
  const generatedAtMilliseconds =
    Date.parse(plan.generatedAt);
  const expiresAtMilliseconds =
    Date.parse(plan.expiresAt);

  if (
    generatedAtMilliseconds >
      nowMilliseconds ||
    expiresAtMilliseconds !==
      generatedAtMilliseconds +
        RETENTION_PURGE_PLAN_TTL_MS
  ) {
    throw new RetentionPurgeError(
      "INVALID_EXECUTION",
    );
  }

  if (nowMilliseconds > expiresAtMilliseconds) {
    throw new RetentionPurgeError(
      "PLAN_EXPIRED",
    );
  }

  for (
    let index = 0;
    index < plan.entries.length;
    index += 1
  ) {
    const entry = plan.entries[index];
    const rule = policy.rules[index];
    let expectedCutoffAt: string;

    try {
      expectedCutoffAt = new Date(
        generatedAtMilliseconds -
          rule.retainForDays *
            24 *
            60 *
            60 *
            1000,
      ).toISOString();
    } catch {
      throw new RetentionPurgeError(
        "CONFIGURATION_INVALID",
      );
    }

    if (
      entry.dataClass !== rule.dataClass ||
      entry.trigger !== rule.trigger ||
      entry.cutoffAt !== expectedCutoffAt
    ) {
      throw new RetentionPurgeError(
        "INVALID_EXECUTION",
      );
    }
  }
}

function safePlanTotal(
  plan: RetentionPurgePlan,
  field:
    | "eligibleRecords"
    | "eligibleObjects",
): number {
  let total = 0;

  for (const entry of plan.entries) {
    total += entry[field];

    if (!Number.isSafeInteger(total)) {
      throw new RetentionPurgeError(
        "INVALID_EXECUTION",
      );
    }
  }

  return total;
}

function assessProviderResult(
  rawResult: unknown,
  plan: RetentionPurgePlan,
): RetentionPurgeResult {
  if (
    !isRecord(rawResult) ||
    !hasExactKeys(rawResult, [
      "planId",
      "purgedRecords",
      "purgedObjects",
      "committedAt",
    ]) ||
    rawResult.planId !== plan.planId ||
    !isNonNegativeSafeInteger(
      rawResult.purgedRecords,
    ) ||
    !isNonNegativeSafeInteger(
      rawResult.purgedObjects,
    ) ||
    !isUtcTimestamp(rawResult.committedAt)
  ) {
    return {
      outcome: "purged",
      auditStatus: "provider-result-invalid",
      purgedRecords: null,
      purgedObjects: null,
      committedAt: null,
    };
  }

  const plannedRecords = safePlanTotal(
    plan,
    "eligibleRecords",
  );
  const plannedObjects = safePlanTotal(
    plan,
    "eligibleObjects",
  );
  const countsMatch =
    rawResult.purgedRecords <=
      plannedRecords &&
    rawResult.purgedObjects <= plannedObjects;

  return {
    outcome: "purged",
    auditStatus: countsMatch
      ? "consistent"
      : "provider-count-mismatch",
    purgedRecords: rawResult.purgedRecords,
    purgedObjects: rawResult.purgedObjects,
    committedAt: rawResult.committedAt,
  };
}

export function createRetentionPurgeService(
  dependencies: {
    policy: RetentionPolicy;
    inventory: RetentionInventoryPort;
    purge: AtomicRetentionPurgePort;
    clock: RetentionPurgeClock;
  },
) {
  async function inspectRule(
    rule: RetentionPolicy["rules"][number],
    cutoffAt: string,
  ) {
    let rawInventory: unknown;

    try {
      rawInventory =
        await dependencies.inventory.inspect({
          dataClass: rule.dataClass,
          trigger: rule.trigger,
          cutoffAt,
          protections:
            REQUIRED_RETENTION_PROTECTIONS,
        });
    } catch {
      throw new RetentionPurgeError(
        "INVENTORY_UNAVAILABLE",
      );
    }

    return parseInventory(rawInventory);
  }

  return {
    async prepare(): Promise<PreparedRetentionPurge> {
      validatePolicy(dependencies.policy);
      const generatedAtMilliseconds = readNow(
        dependencies.clock,
      );
      const generatedAt = new Date(
        generatedAtMilliseconds,
      ).toISOString();
      const expiresAt = new Date(
        generatedAtMilliseconds +
          RETENTION_PURGE_PLAN_TTL_MS,
      ).toISOString();
      const entries: RetentionPurgePlanEntry[] =
        [];

      for (const rule of dependencies.policy
        .rules) {
        let cutoffAt: string;

        try {
          cutoffAt = new Date(
            generatedAtMilliseconds -
              rule.retainForDays *
                24 *
                60 *
                60 *
                1000,
          ).toISOString();
        } catch {
          throw new RetentionPurgeError(
            "CONFIGURATION_INVALID",
          );
        }

        entries.push({
          dataClass: rule.dataClass,
          trigger: rule.trigger,
          cutoffAt,
          ...(await inspectRule(
            rule,
            cutoffAt,
          )),
          protections:
            REQUIRED_RETENTION_PROTECTIONS,
        });
      }

      const unsignedPlan = {
        version: 2 as const,
        policyVersion: 2 as const,
        generatedAt,
        expiresAt,
        entries,
      };
      const plan: RetentionPurgePlan = {
        ...unsignedPlan,
        planId:
          await derivePlanId(unsignedPlan),
      };

      return {
        plan: structuredClone(plan),
        confirmationKey:
          await confirmationKey(plan),
      };
    },

    async execute(
      input: unknown,
    ): Promise<RetentionPurgeResult> {
      if (
        !isRecord(input) ||
        !hasExactKeys(input, [
          "plan",
          "confirmationKey",
        ]) ||
        typeof input.confirmationKey !==
          "string"
      ) {
        throw new RetentionPurgeError(
          "INVALID_EXECUTION",
        );
      }

      const plan = await validatePlan(input.plan);
      validatePlanAgainstPolicy(
        plan,
        dependencies.policy,
        dependencies.clock,
      );

      if (
        input.confirmationKey !==
        (await confirmationKey(plan))
      ) {
        throw new RetentionPurgeError(
          "CONFIRMATION_MISMATCH",
        );
      }

      for (
        let index = 0;
        index < plan.entries.length;
        index += 1
      ) {
        const entry = plan.entries[index];
        const latest = await inspectRule(
          dependencies.policy.rules[index],
          entry.cutoffAt,
        );

        if (
          latest.eligibleRecords !==
            entry.eligibleRecords ||
          latest.eligibleObjects !==
            entry.eligibleObjects ||
          latest.candidateSetSha256 !==
            entry.candidateSetSha256
        ) {
          throw new RetentionPurgeError(
            "INVENTORY_CHANGED",
          );
        }
      }

      let rawResult: unknown;

      try {
        rawResult =
          await dependencies.purge.purgeAtomically({
            plan: structuredClone(plan),
            expectedPlanId: plan.planId,
            expectedPolicyVersion: 2,
            protections:
              REQUIRED_RETENTION_PROTECTIONS,
          });
      } catch {
        throw new RetentionPurgeError(
          "PURGE_UNAVAILABLE",
        );
      }

      return assessProviderResult(
        rawResult,
        plan,
      );
    },
  };
}
