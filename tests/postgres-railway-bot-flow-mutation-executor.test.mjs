import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";
import {
  createPostgresRailwayBotFlowMutationExecutor,
  postgresRailwayBotFlowMutationSql,
} from "../server/platform/postgresRailwayBotFlowMutationExecutor.ts";

const idempotencyKey = `connect_idempotency_v1_${"a".repeat(64)}`;
const requestDigest = `railway_mutation_request_v1_${"b".repeat(64)}`;
const triggerKey = `bot_block_v1_${"c".repeat(64)}`;
const endKey = `bot_block_v1_${"d".repeat(64)}`;
const session = {
  tenantId: 7,
  externalUserId: "verified-user",
  displayName: "Verified workspace",
  status: "active",
  role: "manager",
};
const definition = {
  name: "מענה ראשוני",
  entryBlockKey: triggerKey,
  blocks: [
    {
      blockKey: triggerKey,
      type: "trigger",
      nextBlockKey: endKey,
    },
    { blockKey: endKey, type: "end" },
  ],
};
const botFlowKey = await deriveBotFlowKey(session.tenantId, definition.name);
const botFlowVersionKey = await deriveBotFlowVersionKey(
  session.tenantId,
  botFlowKey,
  1,
  definition,
);

function command(operation, payload, overrides = {}) {
  return {
    session,
    operation,
    idempotencyKey,
    requestDigest,
    payload,
    ...overrides,
  };
}

function result(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function flowRow(overrides = {}) {
  return {
    botFlowKey,
    tenantId: "7",
    name: definition.name,
    status: "draft",
    latestVersionKey: botFlowVersionKey,
    latestVersionNumber: "1",
    activeVersionKey: null,
    version: "1",
    createdAt: "2026-08-21T08:00:00.000Z",
    updatedAt: "2026-08-21T08:00:00.000Z",
    ...overrides,
  };
}

function versionRow(overrides = {}) {
  return {
    botFlowVersionKey,
    botFlowKey,
    tenantId: "7",
    versionNumber: "1",
    status: "draft",
    definitionJson: definition,
    publishedAt: null,
    createdAt: "2026-08-21T08:00:00.000Z",
    ...overrides,
  };
}

function transactionFixture(results) {
  const queue = [...results];
  const calls = {
    options: [],
    queries: [],
    committed: 0,
    rolledBack: 0,
  };
  const manager = {
    async transaction(options, execute) {
      calls.options.push(options);
      try {
        const value = await execute({
          async query(sql, parameters) {
            calls.queries.push({ sql, parameters });
            const next = queue.shift();
            if (next instanceof Error) throw next;
            if (next === undefined) throw new Error("unexpected query");
            return next;
          },
        });
        calls.committed += 1;
        return value;
      } catch (error) {
        calls.rolledBack += 1;
        throw error;
      }
    },
  };
  return { calls, manager, queue };
}

test("creates a bot flow draft with audit and receipt in one transaction", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([flowRow()]),
    result([], 0),
    result([versionRow()]),
    result([{ id: "91" }]),
    result([{ idempotencyKey }]),
  ]);
  const saved = await createPostgresRailwayBotFlowMutationExecutor(
    fixture.manager,
  ).execute(command("bot.flows.draft.save", {
    definition,
    expectedFlowVersion: null,
  }));

  assert.equal(saved.outcome, "committed");
  assert.equal(saved.state.outcome, "created");
  assert.equal(saved.state.flow.botFlowKey, botFlowKey);
  assert.equal(saved.state.draftVersion.botFlowVersionKey, botFlowVersionKey);
  assert.deepEqual(fixture.calls.options, [
    { isolationLevel: "read-committed" },
  ]);
  assert.equal(fixture.calls.committed, 1);
  assert.equal(fixture.calls.rolledBack, 0);
  assert.deepEqual(fixture.calls.queries[0].parameters, [
    7,
    "bot.flows.draft.save",
    idempotencyKey,
    requestDigest,
    "verified-user",
  ]);
  assert.deepEqual(fixture.calls.queries[4].parameters.slice(0, 5), [
    7,
    "verified-user",
    "bot.flows.draft.save",
    botFlowKey,
    idempotencyKey,
  ]);
  assert.deepEqual(
    JSON.parse(fixture.calls.queries[5].parameters[4]),
    saved.state,
  );
  assert.equal(fixture.queue.length, 0);
});

test("publishes the latest bot flow draft atomically", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([versionRow()]),
    result([flowRow()]),
    result([versionRow()]),
    result([], 0),
    result([versionRow({
      status: "published",
      publishedAt: "2026-08-21T08:01:00.000Z",
    })]),
    result([flowRow({
      status: "active",
      activeVersionKey: botFlowVersionKey,
      version: "2",
      updatedAt: "2026-08-21T08:01:00.000Z",
    })]),
    result([{ id: "92" }]),
    result([{ idempotencyKey }]),
  ]);
  const published = await createPostgresRailwayBotFlowMutationExecutor(
    fixture.manager,
  ).execute(command("bot.flows.publish", {
    botFlowKey,
    botFlowVersionKey,
    expectedFlowVersion: 1,
  }));

  assert.equal(published.outcome, "committed");
  assert.equal(published.state.outcome, "updated");
  assert.equal(published.state.flow.status, "active");
  assert.equal(published.state.publishedVersion.status, "published");
  assert.equal(fixture.calls.queries.length, 9);
  assert.deepEqual(
    JSON.parse(fixture.calls.queries[7].parameters[5]),
    {
      requestDigest,
      outcome: "updated",
      resultingFlowVersion: 2,
      resultingVersionKey: botFlowVersionKey,
      resultingVersionNumber: 1,
    },
  );
});

test("replays the stored bounded state without another domain write", async () => {
  const state = {
    outcome: "created",
    flow: {
      botFlowKey,
      name: definition.name,
      status: "draft",
      latestVersionKey: botFlowVersionKey,
      latestVersionNumber: 1,
      activeVersionKey: null,
      version: 1,
      createdAt: "2026-08-21T08:00:00.000Z",
      updatedAt: "2026-08-21T08:00:00.000Z",
    },
    draftVersion: {
      botFlowVersionKey,
      versionNumber: 1,
      status: "draft",
      definition,
      publishedAt: null,
      createdAt: "2026-08-21T08:00:00.000Z",
    },
  };
  const fixture = transactionFixture([
    result([], 0),
    result([{
      requestDigest,
      status: "completed",
      responseJson: JSON.stringify(state),
    }]),
  ]);
  const replayed = await createPostgresRailwayBotFlowMutationExecutor(
    fixture.manager,
  ).execute(command("bot.flows.draft.save", {
    definition,
    expectedFlowVersion: null,
  }));

  assert.deepEqual(replayed, {
    outcome: "replayed",
    tenantId: 7,
    state,
  });
  assert.equal(fixture.calls.queries.length, 2);
  assert.equal(
    fixture.calls.queries[1].sql,
    postgresRailwayBotFlowMutationSql.lockReceipt,
  );
});

test("separates digest conflict from storage outages", async () => {
  const conflict = transactionFixture([
    result([], 0),
    result([{
      requestDigest: `railway_mutation_request_v1_${"e".repeat(64)}`,
      status: "completed",
      responseJson: null,
    }]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayBotFlowMutationExecutor(
      conflict.manager,
    ).execute(command("bot.flows.draft.save", {
      definition,
      expectedFlowVersion: null,
    })),
    { outcome: "conflict", tenantId: null, state: null },
  );

  const outage = transactionFixture([new Error("private database detail")]);
  assert.deepEqual(
    await createPostgresRailwayBotFlowMutationExecutor(
      outage.manager,
    ).execute(command("bot.flows.draft.save", {
      definition,
      expectedFlowVersion: null,
    })),
    { outcome: "unavailable", tenantId: null, state: null },
  );
});

test("maps missing, stale, and invalid publication states", async () => {
  const missing = transactionFixture([
    result([{ idempotencyKey }]),
    result([], 0),
  ]);
  assert.deepEqual(
    await createPostgresRailwayBotFlowMutationExecutor(
      missing.manager,
    ).execute(command("bot.flows.draft.save", {
      definition,
      expectedFlowVersion: 1,
    })),
    { outcome: "not-found", tenantId: null, state: null },
  );

  const stale = transactionFixture([
    result([{ idempotencyKey }]),
    result([flowRow({ version: "9" })]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayBotFlowMutationExecutor(
      stale.manager,
    ).execute(command("bot.flows.draft.save", {
      definition,
      expectedFlowVersion: 1,
    })),
    { outcome: "conflict", tenantId: null, state: null },
  );

  const invalidPublication = transactionFixture([
    result([{ idempotencyKey }]),
    result([versionRow()]),
    result([flowRow()]),
    result([versionRow({
      status: "archived",
      publishedAt: "2026-08-21T08:01:00.000Z",
    })]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayBotFlowMutationExecutor(
      invalidPublication.manager,
    ).execute(command("bot.flows.publish", {
      botFlowKey,
      botFlowVersionKey,
      expectedFlowVersion: 1,
    })),
    { outcome: "invalid-state", tenantId: null, state: null },
  );
});

test("rejects malformed commands before opening a transaction", async () => {
  const fixture = transactionFixture([]);
  const executor = createPostgresRailwayBotFlowMutationExecutor(
    fixture.manager,
  );
  const invalid = [
    command("bot.flows.draft.save", {
      definition: { ...definition, name: "" },
      expectedFlowVersion: null,
    }),
    command("bot.flows.draft.save", {
      definition,
      expectedFlowVersion: 0,
    }),
    command("bot.flows.publish", {
      botFlowKey: "invalid",
      botFlowVersionKey,
      expectedFlowVersion: 1,
    }),
    command("bot.flows.publish", {
      botFlowKey,
      botFlowVersionKey,
      expectedFlowVersion: 0,
    }),
    command("bot.flows.publish", {
      botFlowKey,
      botFlowVersionKey,
      expectedFlowVersion: 1,
    }, { idempotencyKey: "invalid" }),
  ];

  for (const candidate of invalid) {
    assert.deepEqual(await executor.execute(candidate), {
      outcome: "unavailable",
      tenantId: null,
      state: null,
    });
  }
  assert.deepEqual(fixture.calls.options, []);
});

test("freezes receipt and audit SQL without randomized identifiers", () => {
  assert.equal(Object.isFrozen(postgresRailwayBotFlowMutationSql), true);
  assert.match(
    postgresRailwayBotFlowMutationSql.claimReceipt,
    /ON CONFLICT \(tenant_id, operation, idempotency_key\)/,
  );
  assert.match(postgresRailwayBotFlowMutationSql.lockReceipt, /FOR UPDATE/);
  assert.match(postgresRailwayBotFlowMutationSql.insertAudit, /audit_logs/);
  assert.doesNotMatch(
    Object.values(postgresRailwayBotFlowMutationSql).join("\n"),
    /Math\.random|randomUUID/,
  );
});

test("rejects a missing PostgreSQL transaction manager", () => {
  assert.throws(
    () => createPostgresRailwayBotFlowMutationExecutor({}),
    /transaction manager is invalid/,
  );
});
