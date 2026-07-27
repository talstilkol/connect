import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRetentionPolicy,
  RETENTION_DATA_CLASSES,
} from "../server/operations/retentionPolicy.ts";
import {
  createRetentionPurgeService,
  RetentionPurgeError,
} from "../server/operations/retentionPurgeService.ts";

function configuredPolicy() {
  const inspection = inspectRetentionPolicy({
    RETENTION_POLICY_JSON: JSON.stringify({
      version: 1,
      rules: RETENTION_DATA_CLASSES.map(
        (dataClass) => ({
          dataClass,
          trigger: "record-terminal",
          retainForDays: 30,
        }),
      ),
    }),
  });

  assert.equal(
    inspection.status,
    "configured",
  );

  return inspection.configuration;
}

test("requires complete retention coverage without defaults", () => {
  assert.deepEqual(inspectRetentionPolicy({}), {
    status: "configuration-required",
    issues: ["POLICY_REQUIRED"],
  });

  const inspection = inspectRetentionPolicy({
    RETENTION_POLICY_JSON: JSON.stringify({
      version: 1,
      rules: RETENTION_DATA_CLASSES.map(
        (dataClass) => ({
          dataClass,
          trigger: "record-terminal",
          retainForDays: 30,
        }),
      ),
    }),
  });

  assert.equal(
    inspection.status,
    "configured",
  );
  assert.deepEqual(
    inspection.configuration.rules.map(
      (rule) => rule.dataClass,
    ),
    RETENTION_DATA_CLASSES,
  );
});

test("rejects missing, duplicate, and extended retention rules", () => {
  const rules = RETENTION_DATA_CLASSES.map(
    (dataClass) => ({
      dataClass,
      trigger: "record-terminal",
      retainForDays: 30,
    }),
  );

  assert.deepEqual(
    inspectRetentionPolicy({
      RETENTION_POLICY_JSON: JSON.stringify({
        version: 1,
        rules: rules.slice(1),
      }),
    }),
    {
      status: "configuration-required",
      issues: [
        "DATA_CLASS_COVERAGE_INVALID",
      ],
    },
  );

  assert.equal(
    inspectRetentionPolicy({
      RETENTION_POLICY_JSON: JSON.stringify({
        version: 1,
        rules: [rules[0], ...rules.slice(0, -1)],
      }),
    }).status,
    "configuration-required",
  );

  assert.deepEqual(
    inspectRetentionPolicy({
      RETENTION_POLICY_JSON: JSON.stringify({
        version: 1,
        rules: [
          {
            ...rules[0],
            tenantId: 7,
          },
          ...rules.slice(1),
        ],
      }),
    }),
    {
      status: "configuration-required",
      issues: ["RULE_INVALID"],
    },
  );
});

test("prepares a deterministic bounded purge plan", async () => {
  const inspected = [];
  const service = createRetentionPurgeService({
    policy: configuredPolicy(),
    inventory: {
      async inspect(input) {
        inspected.push(input);
        return {
          eligibleRecords: 2,
          eligibleObjects:
            input.dataClass ===
            "knowledge-source-data-and-objects"
              ? 1
              : 0,
        };
      },
    },
    purge: {
      async purge() {
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

  const first = await service.prepare();
  const second = await service.prepare();

  assert.deepEqual(first, second);
  assert.equal(
    first.plan.entries.length,
    RETENTION_DATA_CLASSES.length,
  );
  assert.equal(
    first.plan.entries[0].cutoffAt,
    "2026-07-01T00:00:00.000Z",
  );
  assert.match(
    first.confirmationKey,
    /^retention_purge_v1_[0-9a-f]{64}$/,
  );
  assert.equal(
    JSON.stringify(first).includes(
      "tenantId",
    ),
    false,
  );
  assert.equal(
    inspected.length,
    RETENTION_DATA_CLASSES.length * 2,
  );
});

test("requires the exact plan confirmation before purge", async () => {
  let purgeCalls = 0;
  const service = createRetentionPurgeService({
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
      async purge() {
        purgeCalls += 1;
        return {
          purgedRecords:
            RETENTION_DATA_CLASSES.length,
          purgedObjects: 0,
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
  const prepared = await service.prepare();

  await assert.rejects(
    service.execute({
      plan: prepared.plan,
      confirmationKey:
        "retention_purge_v1_" +
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
      purgedRecords:
        RETENTION_DATA_CLASSES.length,
      purgedObjects: 0,
    },
  );
  assert.equal(purgeCalls, 1);
});

test("rejects malformed inventory and over-reported purge results", async () => {
  const invalidInventory =
    createRetentionPurgeService({
      policy: configuredPolicy(),
      inventory: {
        async inspect() {
          return {
            eligibleRecords: 1,
            eligibleObjects: 0,
            contactPhone: "+972500000000",
          };
        },
      },
      purge: {
        async purge() {
          return {
            purgedRecords: 0,
            purgedObjects: 0,
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
        async inspect() {
          return {
            eligibleRecords: 0,
            eligibleObjects: 0,
          };
        },
      },
      purge: {
        async purge() {
          return {
            purgedRecords: 1,
            purgedObjects: 0,
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
  const plan = await overReported.prepare();

  await assert.rejects(
    overReported.execute(plan),
    (error) =>
      error instanceof RetentionPurgeError &&
      error.code ===
        "INVALID_PURGE_RESULT",
  );
});
