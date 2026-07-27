import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  RETENTION_DATA_CLASSES,
  type RetentionDataClass,
  type RetentionPolicy,
  type RetentionTrigger,
} from "./retentionPolicy.ts";

const CONFIRMATION_PREFIX =
  "retention_purge_v1_";
const MAXIMUM_DATE_DAYS = 100_000_000;

export interface RetentionPurgeClock {
  now(): Date;
}

export interface RetentionInventoryPort {
  inspect(input: {
    dataClass: RetentionDataClass;
    trigger: RetentionTrigger;
    cutoffAt: string;
  }): Promise<unknown>;
}

export interface RetentionPurgePort {
  purge(plan: RetentionPurgePlan): Promise<unknown>;
}

export interface RetentionPurgePlanEntry {
  dataClass: RetentionDataClass;
  trigger: RetentionTrigger;
  cutoffAt: string;
  eligibleRecords: number;
  eligibleObjects: number;
}

export interface RetentionPurgePlan {
  version: 1;
  generatedAt: string;
  entries: readonly RetentionPurgePlanEntry[];
}

export interface PreparedRetentionPurge {
  plan: RetentionPurgePlan;
  confirmationKey: string;
}

export interface RetentionPurgeResult {
  outcome: "purged";
  purgedRecords: number;
  purgedObjects: number;
}

export type RetentionPurgeErrorCode =
  | "CONFIGURATION_INVALID"
  | "CLOCK_UNAVAILABLE"
  | "INVENTORY_UNAVAILABLE"
  | "INVALID_INVENTORY"
  | "INVALID_EXECUTION"
  | "CONFIRMATION_MISMATCH"
  | "PURGE_UNAVAILABLE"
  | "INVALID_PURGE_RESULT";

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
    policy.version !== 1 ||
    policy.rules.length !==
      RETENTION_DATA_CLASSES.length ||
    policy.rules.some(
      (rule, index) =>
        rule.dataClass !==
          RETENTION_DATA_CLASSES[index] ||
        !Number.isSafeInteger(
          rule.retainForDays,
        ) ||
        rule.retainForDays <= 0 ||
        rule.retainForDays >
          MAXIMUM_DATE_DAYS ||
        ![
          "record-created",
          "record-terminal",
          "tenant-closed",
        ].includes(rule.trigger),
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
} {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "eligibleRecords",
      "eligibleObjects",
    ]) ||
    !isNonNegativeSafeInteger(
      value.eligibleRecords,
    ) ||
    !isNonNegativeSafeInteger(
      value.eligibleObjects,
    )
  ) {
    throw new RetentionPurgeError(
      "INVALID_INVENTORY",
    );
  }

  return {
    eligibleRecords: value.eligibleRecords,
    eligibleObjects: value.eligibleObjects,
  };
}

function canonicalPlan(
  plan: RetentionPurgePlan,
): string {
  return JSON.stringify({
    version: plan.version,
    generatedAt: plan.generatedAt,
    entries: plan.entries.map((entry) => ({
      dataClass: entry.dataClass,
      trigger: entry.trigger,
      cutoffAt: entry.cutoffAt,
      eligibleRecords:
        entry.eligibleRecords,
      eligibleObjects:
        entry.eligibleObjects,
    })),
  });
}

async function confirmationKey(
  plan: RetentionPurgePlan,
): Promise<string> {
  return (
    CONFIRMATION_PREFIX +
    (await sha256Hex(
      new TextEncoder().encode(
        canonicalPlan(plan),
      ),
    ))
  );
}

function validatePlan(
  value: unknown,
): RetentionPurgePlan {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "version",
      "generatedAt",
      "entries",
    ]) ||
    value.version !== 1 ||
    typeof value.generatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value.generatedAt,
    ) ||
    !Number.isFinite(
      Date.parse(value.generatedAt),
    ) ||
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
        ]) ||
        entry.dataClass !==
          RETENTION_DATA_CLASSES[index] ||
        ![
          "record-created",
          "record-terminal",
          "tenant-closed",
        ].includes(String(entry.trigger)) ||
        typeof entry.cutoffAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          entry.cutoffAt,
        ) ||
        !Number.isFinite(
          Date.parse(entry.cutoffAt),
        ) ||
        !isNonNegativeSafeInteger(
          entry.eligibleRecords,
        ) ||
        !isNonNegativeSafeInteger(
          entry.eligibleObjects,
        )
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
      };
    },
  );

  return {
    version: 1,
    generatedAt: value.generatedAt,
    entries,
  };
}

function validatePlanAgainstPolicy(
  plan: RetentionPurgePlan,
  policy: RetentionPolicy,
  clock: RetentionPurgeClock,
): void {
  validatePolicy(policy);
  let nowMilliseconds: number;

  try {
    nowMilliseconds = clock.now().getTime();
  } catch {
    throw new RetentionPurgeError(
      "CLOCK_UNAVAILABLE",
    );
  }

  const generatedAtMilliseconds =
    Date.parse(plan.generatedAt);

  if (
    !Number.isFinite(nowMilliseconds) ||
    generatedAtMilliseconds >
      nowMilliseconds
  ) {
    throw new RetentionPurgeError(
      "INVALID_EXECUTION",
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

export function createRetentionPurgeService(
  dependencies: {
    policy: RetentionPolicy;
    inventory: RetentionInventoryPort;
    purge: RetentionPurgePort;
    clock: RetentionPurgeClock;
  },
) {
  return {
    async prepare(): Promise<PreparedRetentionPurge> {
      validatePolicy(dependencies.policy);
      let now: Date;

      try {
        now = dependencies.clock.now();
      } catch {
        throw new RetentionPurgeError(
          "CLOCK_UNAVAILABLE",
        );
      }

      const generatedAtMilliseconds =
        now.getTime();

      if (
        !Number.isFinite(
          generatedAtMilliseconds,
        )
      ) {
        throw new RetentionPurgeError(
          "CLOCK_UNAVAILABLE",
        );
      }

      const generatedAt = now.toISOString();
      const entries: RetentionPurgePlanEntry[] =
        [];

      for (const rule of dependencies.policy
        .rules) {
        const cutoffMilliseconds =
          generatedAtMilliseconds -
          rule.retainForDays *
            24 *
            60 *
            60 *
            1000;
        let cutoffAt: string;

        try {
          cutoffAt = new Date(
            cutoffMilliseconds,
          ).toISOString();
        } catch {
          throw new RetentionPurgeError(
            "CONFIGURATION_INVALID",
          );
        }

        let rawInventory: unknown;

        try {
          rawInventory =
            await dependencies.inventory.inspect({
              dataClass: rule.dataClass,
              trigger: rule.trigger,
              cutoffAt,
            });
        } catch {
          throw new RetentionPurgeError(
            "INVENTORY_UNAVAILABLE",
          );
        }

        entries.push({
          dataClass: rule.dataClass,
          trigger: rule.trigger,
          cutoffAt,
          ...parseInventory(rawInventory),
        });
      }

      const plan: RetentionPurgePlan = {
        version: 1,
        generatedAt,
        entries,
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

      const plan = validatePlan(input.plan);
      validatePlanAgainstPolicy(
        plan,
        dependencies.policy,
        dependencies.clock,
      );
      const expectedConfirmationKey =
        await confirmationKey(plan);

      if (
        input.confirmationKey !==
        expectedConfirmationKey
      ) {
        throw new RetentionPurgeError(
          "CONFIRMATION_MISMATCH",
        );
      }

      let rawResult: unknown;

      try {
        rawResult = await dependencies.purge.purge(
          structuredClone(plan),
        );
      } catch {
        throw new RetentionPurgeError(
          "PURGE_UNAVAILABLE",
        );
      }

      const plannedRecords = safePlanTotal(
        plan,
        "eligibleRecords",
      );
      const plannedObjects = safePlanTotal(
        plan,
        "eligibleObjects",
      );

      if (
        !isRecord(rawResult) ||
        !hasExactKeys(rawResult, [
          "purgedRecords",
          "purgedObjects",
        ]) ||
        !isNonNegativeSafeInteger(
          rawResult.purgedRecords,
        ) ||
        !isNonNegativeSafeInteger(
          rawResult.purgedObjects,
        ) ||
        rawResult.purgedRecords >
          plannedRecords ||
        rawResult.purgedObjects >
          plannedObjects
      ) {
        throw new RetentionPurgeError(
          "INVALID_PURGE_RESULT",
        );
      }

      return {
        outcome: "purged",
        purgedRecords:
          rawResult.purgedRecords,
        purgedObjects:
          rawResult.purgedObjects,
      };
    },
  };
}
