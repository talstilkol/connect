import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  inspectRetentionPolicy,
  RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS,
  RETENTION_DATA_CLASSES,
} from "../server/operations/retentionPolicy.ts";
import {
  createRetentionPurgeService,
  RETENTION_PURGE_PLAN_TTL_MS,
  RetentionPurgeError,
} from "../server/operations/retentionPurgeService.ts";

function digest(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function policyRules() {
  return RETENTION_DATA_CLASSES.map(
    (dataClass) => ({
      dataClass,
      trigger:
        RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS[
          dataClass
        ],
      retainForDays: 30,
    }),
  );
}

function configuredPolicy() {
  const inspection = inspectRetentionPolicy({
    RETENTION_POLICY_JSON: JSON.stringify({
      version: 2,
      rules: policyRules(),
    }),
  });

  assert.equal(
    inspection.status,
    "configured",
  );

  return inspection.configuration;
}

function inventoryFor(input) {
  return {
    eligibleRecords: 1,
    eligibleObjects:
      input.dataClass ===
      "knowledge-source-objects"
        ? 1
        : 0,
    candidateSetSha256: digest(
      `${input.dataClass}:${input.cutoffAt}`,
    ),
  };
}

test("requires v2 coverage and the approved trigger for every data class", () => {
  assert.deepEqual(inspectRetentionPolicy({}), {
    status: "configuration-required",
    issues: ["POLICY_REQUIRED"],
  });

  const inspection = inspectRetentionPolicy({
    RETENTION_POLICY_JSON: JSON.stringify({
      version: 2,
      rules: policyRules(),
    }),
  });

  assert.equal(
    inspection.status,
    "configured",
  );
  assert.deepEqual(
    inspection.configuration.rules.map(
      (rule) => [
        rule.dataClass,
        rule.trigger,
      ],
    ),
    RETENTION_DATA_CLASSES.map(
      (dataClass) => [
        dataClass,
        RETENTION_ALLOWED_TRIGGER_BY_DATA_CLASS[
          dataClass
        ],
      ],
    ),
  );
});

test("rejects legacy, incomplete, duplicate, extended, and unsafe trigger policies", () => {
  const rules = policyRules();

  assert.deepEqual(
    inspectRetentionPolicy({
      RETENTION_POLICY_JSON: JSON.stringify({
        version: 1,
        rules,
      }),
    }),
    {
      status: "configuration-required",
      issues: ["POLICY_SHAPE_INVALID"],
    },
  );
  assert.deepEqual(
    inspectRetentionPolicy({
      RETENTION_POLICY_JSON: JSON.stringify({
        version: 2,
        rules: rules.slice(1),
      }),
    }).issues,
    ["DATA_CLASS_COVERAGE_INVALID"],
  );
  assert.equal(
    inspectRetentionPolicy({
      RETENTION_POLICY_JSON: JSON.stringify({
        version: 2,
        rules: [
          rules[0],
          ...rules.slice(0, -1),
        ],
      }),
    }).status,
    "configuration-required",
  );
  assert.deepEqual(
    inspectRetentionPolicy({
      RETENTION_POLICY_JSON: JSON.stringify({
        version: 2,
        rules: [
          {
            ...rules[0],
            tenantId: 7,
          },
          ...rules.slice(1),
        ],
      }),
    }).issues,
    ["RULE_INVALID"],
  );
  assert.deepEqual(
    inspectRetentionPolicy({
      RETENTION_POLICY_JSON: JSON.stringify({
        version: 2,
        rules: [
          {
            ...rules[0],
            trigger: "record-created",
          },
          ...rules.slice(1),
        ],
      }),
    }).issues,
    ["TRIGGER_NOT_ALLOWED"],
  );
});

test("prepares a deterministic expiring plan with immutable candidates and protections", async () => {
  const inspected = [];
  const clock = {
    now() {
      return new Date(
        "2026-07-31T00:00:00.000Z",
      );
    },
  };
  const service = createRetentionPurgeService({
    policy: configuredPolicy(),
    inventory: {
      async inspect(input) {
        inspected.push(input);
        return inventoryFor(input);
      },
    },
    purge: {
      async purgeAtomically() {
        throw new Error("not called");
      },
    },
    clock,
  });

  const first = await service.prepare();
  const second = await service.prepare();

  assert.deepEqual(first, second);
  assert.equal(first.plan.version, 2);
  assert.equal(first.plan.policyVersion, 2);
  assert.match(
    first.plan.planId,
    /^retention_plan_v2_[0-9a-f]{64}$/,
  );
  assert.equal(
    Date.parse(first.plan.expiresAt) -
      Date.parse(first.plan.generatedAt),
    RETENTION_PURGE_PLAN_TTL_MS,
  );
  assert.equal(
    first.plan.entries[0].cutoffAt,
    "2026-07-01T00:00:00.000Z",
  );
  assert.deepEqual(
    first.plan.entries[0].protections,
    {
      excludeActiveRecords: true,
      excludeLegalHolds: true,
    },
  );
  assert.match(
    first.confirmationKey,
    /^retention_purge_v2_[0-9a-f]{64}$/,
  );
  assert.equal(
    inspected.length,
    RETENTION_DATA_CLASSES.length * 2,
  );
});

test("requires confirmation, rechecks inventory, and calls the atomic port", async () => {
  let purgeCalls = 0;
  const clock = {
    now() {
      return new Date(
        "2026-07-31T00:00:00.000Z",
      );
    },
  };
  const service = createRetentionPurgeService({
    policy: configuredPolicy(),
    inventory: {
      async inspect(input) {
        return inventoryFor(input);
      },
    },
    purge: {
      async purgeAtomically(input) {
        purgeCalls += 1;
        assert.equal(
          input.expectedPlanId,
          input.plan.planId,
        );
        assert.equal(
          input.expectedPolicyVersion,
          2,
        );

        return {
          planId: input.plan.planId,
          purgedRecords:
            RETENTION_DATA_CLASSES.length,
          purgedObjects: 1,
          committedAt:
            "2026-07-31T00:00:00.000Z",
        };
      },
    },
    clock,
  });
  const prepared = await service.prepare();

  await assert.rejects(
    service.execute({
      plan: prepared.plan,
      confirmationKey:
        "retention_purge_v2_" +
        "0".repeat(64),
    }),
    (error) =>
      error instanceof RetentionPurgeError &&
      error.code ===
        "CONFIRMATION_MISMATCH",
  );
  assert.equal(purgeCalls, 0);

  assert.deepEqual(
    await service.execute(prepared),
    {
      outcome: "purged",
      auditStatus: "consistent",
      purgedRecords:
        RETENTION_DATA_CLASSES.length,
      purgedObjects: 1,
      committedAt:
        "2026-07-31T00:00:00.000Z",
    },
  );
  assert.equal(purgeCalls, 1);
});

test("rejects expired plans and changed candidate inventories before deletion", async () => {
  let now =
    "2026-07-31T00:00:00.000Z";
  let inspectionCount = 0;
  const service = createRetentionPurgeService({
    policy: configuredPolicy(),
    inventory: {
      async inspect(input) {
        inspectionCount += 1;
        const value = inventoryFor(input);

        return inspectionCount >
          RETENTION_DATA_CLASSES.length
          ? {
              ...value,
              candidateSetSha256: digest(
                `changed:${input.dataClass}`,
              ),
            }
          : value;
      },
    },
    purge: {
      async purgeAtomically() {
        throw new Error("must not delete");
      },
    },
    clock: {
      now() {
        return new Date(now);
      },
    },
  });
  const prepared = await service.prepare();

  await assert.rejects(
    service.execute(prepared),
    (error) =>
      error instanceof RetentionPurgeError &&
      error.code === "INVENTORY_CHANGED",
  );

  const expiringService =
    createRetentionPurgeService({
      policy: configuredPolicy(),
      inventory: {
        async inspect(input) {
          return inventoryFor(input);
        },
      },
      purge: {
        async purgeAtomically() {
          throw new Error("must not delete");
        },
      },
      clock: {
        now() {
          return new Date(now);
        },
      },
    });
  now = "2026-07-31T00:00:00.000Z";
  const expiringPlan =
    await expiringService.prepare();
  now = "2026-07-31T00:05:00.001Z";

  await assert.rejects(
    expiringService.execute(expiringPlan),
    (error) =>
      error instanceof RetentionPurgeError &&
      error.code === "PLAN_EXPIRED",
  );
});

test("rejects malformed inventory and reports provider count anomalies as audit evidence", async () => {
  const invalidInventory =
    createRetentionPurgeService({
      policy: configuredPolicy(),
      inventory: {
        async inspect() {
          return {
            eligibleRecords: 1,
            eligibleObjects: 0,
          };
        },
      },
      purge: {
        async purgeAtomically() {
          throw new Error("not called");
        },
      },
      clock: {
        now() {
          return new Date(
            "2026-07-31T00:00:00.000Z",
          );
        },
      },
    });

  await assert.rejects(
    invalidInventory.prepare(),
    (error) =>
      error instanceof RetentionPurgeError &&
      error.code === "INVALID_INVENTORY",
  );

  const overReported =
    createRetentionPurgeService({
      policy: configuredPolicy(),
      inventory: {
        async inspect(input) {
          return {
            ...inventoryFor(input),
            eligibleRecords: 0,
            eligibleObjects: 0,
          };
        },
      },
      purge: {
        async purgeAtomically(input) {
          return {
            planId: input.plan.planId,
            purgedRecords: 1,
            purgedObjects: 0,
            committedAt:
              "2026-07-31T00:00:00.000Z",
          };
        },
      },
      clock: {
        now() {
          return new Date(
            "2026-07-31T00:00:00.000Z",
          );
        },
      },
    });
  const prepared =
    await overReported.prepare();
  const result =
    await overReported.execute(prepared);

  assert.equal(
    result.auditStatus,
    "provider-count-mismatch",
  );
  assert.equal(result.purgedRecords, 1);
});
