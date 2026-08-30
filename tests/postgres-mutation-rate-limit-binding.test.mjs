import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresMutationRateLimitBinding,
  postgresMutationRateLimitSql,
} from "../server/platform/postgresMutationRateLimitBinding.ts";

const subjectKey = `rate_limit_v1_${"a".repeat(64)}`;
const policy = Object.freeze({
  policyId: "tenant-mutation",
  policyVersion: 3,
  capacity: 120,
  refillPeriodSeconds: 60,
});

function transactionFixture(responses) {
  const remaining = [...responses];
  const calls = [];
  const manager = {
    async transaction(options, execute) {
      assert.deepEqual(options, { isolationLevel: "read-committed" });
      return execute({
        async query(sql, parameters) {
          calls.push({ sql, parameters });
          const response = remaining.shift();
          if (!response) {
            throw new Error("Unexpected PostgreSQL query");
          }
          return response;
        },
      });
    },
  };

  return {
    calls,
    manager,
    assertConsumed() {
      assert.equal(remaining.length, 0);
    },
  };
}

function lockResult() {
  return { rows: [{ lockResult: null }], rowCount: 1 };
}

test("creates one opaque token bucket and consumes its first token atomically", async () => {
  const fixture = transactionFixture([
    lockResult(),
    { rows: [], rowCount: 0 },
    { rows: [{ success: true }], rowCount: 1 },
  ]);
  const binding = createPostgresMutationRateLimitBinding(
    fixture.manager,
    policy,
  );

  assert.deepEqual(await binding.limit({ key: subjectKey }), {
    success: true,
  });
  assert.deepEqual(
    fixture.calls.map(({ sql }) => sql),
    [
      postgresMutationRateLimitSql.lockScope,
      postgresMutationRateLimitSql.findBucket,
      postgresMutationRateLimitSql.insertBucket,
    ],
  );
  assert.deepEqual(fixture.calls[2].parameters, [
    "tenant-mutation",
    3,
    subjectKey,
    120,
    60,
  ]);
  assert.equal(
    JSON.stringify(fixture.calls).includes("verified-user"),
    false,
  );
  fixture.assertConsumed();
});

test("returns the database token decision for an existing policy version", async () => {
  for (const success of [true, false]) {
    const fixture = transactionFixture([
      lockResult(),
      {
        rows: [{ capacity: 120, refillPeriodSeconds: 60 }],
        rowCount: 1,
      },
      { rows: [{ success }], rowCount: 1 },
    ]);
    const binding = createPostgresMutationRateLimitBinding(
      fixture.manager,
      policy,
    );

    assert.deepEqual(await binding.limit({ key: subjectKey }), { success });
    assert.equal(
      fixture.calls[2].sql,
      postgresMutationRateLimitSql.consumeBucket,
    );
    fixture.assertConsumed();
  }
});

test("isolates every API and provider bucket by policy", async () => {
  for (const policyId of [
    "clerk-organization-invitation",
    "tenant-mutation",
    "system-admin-mutation",
    "meta-webhook",
  ]) {
    const fixture = transactionFixture([
      lockResult(),
      { rows: [], rowCount: 0 },
      { rows: [{ success: true }], rowCount: 1 },
    ]);
    const binding = createPostgresMutationRateLimitBinding(
      fixture.manager,
      { ...policy, policyId },
    );

    assert.deepEqual(await binding.limit({ key: subjectKey }), {
      success: true,
    });
    assert.equal(fixture.calls[0].parameters[0], policyId);
    assert.equal(fixture.calls[2].parameters[0], policyId);
    fixture.assertConsumed();
  }
});

test("serializes every scope and uses database time for continuous refill", () => {
  assert.match(
    postgresMutationRateLimitSql.lockScope,
    /pg_advisory_xact_lock[\s\S]*hashtextextended/,
  );
  assert.match(
    postgresMutationRateLimitSql.findBucket,
    /policy_id = \$1[\s\S]*policy_version = \$2[\s\S]*subject_key = \$3[\s\S]*FOR UPDATE/,
  );
  assert.match(
    postgresMutationRateLimitSql.consumeBucket,
    /available_tokens[\s\S]*EXTRACT[\s\S]*statement_timestamp\(\)[\s\S]*refill_period_seconds[\s\S]*replenished_tokens >= 1/,
  );
  assert.doesNotMatch(
    postgresMutationRateLimitSql.consumeBucket,
    /Math\.random|random_uuid|gen_random|clock_timestamp/,
  );
});

test("rejects invalid keys, policy changes, dependencies, and database evidence", async () => {
  assert.throws(
    () => createPostgresMutationRateLimitBinding({}, policy),
    /dependency is invalid/,
  );
  assert.throws(
    () =>
      createPostgresMutationRateLimitBinding(
        { async transaction() {} },
        { ...policy, capacity: 0 },
      ),
    /policy is invalid/,
  );

  const never = createPostgresMutationRateLimitBinding(
    {
      async transaction() {
        throw new Error("must not transact");
      },
    },
    policy,
  );
  await assert.rejects(
    never.limit({ key: "plain-user-identity" }),
    /key is invalid/,
  );
  await assert.rejects(
    never.limit({ key: subjectKey, tenantId: 7 }),
    /input is invalid/,
  );

  const conflict = transactionFixture([
    lockResult(),
    {
      rows: [{ capacity: 121, refillPeriodSeconds: 60 }],
      rowCount: 1,
    },
  ]);
  await assert.rejects(
    createPostgresMutationRateLimitBinding(conflict.manager, policy).limit({
      key: subjectKey,
    }),
    /policy version conflicts/,
  );

  const malformed = transactionFixture([
    lockResult(),
    { rows: [], rowCount: 0 },
    { rows: [{ success: "yes" }], rowCount: 1 },
  ]);
  await assert.rejects(
    createPostgresMutationRateLimitBinding(malformed.manager, policy).limit({
      key: subjectKey,
    }),
    /invalid mutation rate-limit state/,
  );
});
