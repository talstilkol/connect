import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRailwayMessageTemplateDraftMutationExecutor,
  postgresRailwayMessageTemplateDraftMutationSql,
} from "../server/platform/postgresRailwayMessageTemplateDraftMutationExecutor.ts";
import { postgresMessageTemplateSql } from "../server/platform/postgresMessageTemplateRepository.ts";
import { deriveMessageTemplateKey } from "../server/templates/messageTemplateKey.ts";

const idempotencyKey = `connect_idempotency_v1_${"a".repeat(64)}`;
const requestDigest = `railway_mutation_request_v1_${"b".repeat(64)}`;
const templateKey = await deriveMessageTemplateKey(7, "service_update", "he");
const occurredAt = new Date("2026-08-21T08:00:00.000Z");
const session = {
  tenantId: 7,
  externalUserId: "verified-user",
  displayName: "Verified workspace",
  status: "active",
  role: "manager",
};
const draft = {
  name: "service_update",
  category: "UTILITY",
  language: "he",
  header: "",
  body: "שלום {{1}}",
  footer: "",
  variableExamples: { 1: "טל" },
  buttonMode: "none",
  quickReplies: [],
  urlButton: {
    enabled: false,
    mode: "static",
    text: "",
    value: "",
    example: "",
  },
  phoneButton: {
    enabled: false,
    text: "",
    value: "",
  },
};

function command(overrides = {}) {
  return {
    session,
    operation: "templates.draft.save",
    idempotencyKey,
    requestDigest,
    payload: draft,
    ...overrides,
  };
}

function result(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function definition() {
  return {
    header: draft.header,
    body: draft.body,
    footer: draft.footer,
    variableExamples: draft.variableExamples,
    buttonMode: draft.buttonMode,
    quickReplies: draft.quickReplies,
    urlButton: draft.urlButton,
    phoneButton: draft.phoneButton,
  };
}

function templateRow(overrides = {}) {
  return {
    templateKey,
    tenantId: "7",
    metaTemplateId: null,
    name: draft.name,
    language: draft.language,
    category: draft.category,
    status: "draft",
    definitionJson: definition(),
    submissionKey: null,
    submissionStartedAt: null,
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 1,
    submittedAt: null,
    reviewedAt: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  };
}

function templateView() {
  return {
    templateKey,
    ...draft,
    status: "draft",
    submittedAt: null,
    reviewedAt: null,
    updatedAt: occurredAt.toISOString(),
  };
}

function transactionFixture(results) {
  const queue = [...results];
  const calls = { options: [], queries: [], committed: 0, rolledBack: 0 };
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

test("saves draft, audit, response, and receipt in one transaction", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([templateRow()]),
    result([{ id: "91" }]),
    result([{ idempotencyKey }]),
  ]);
  const saved = await createPostgresRailwayMessageTemplateDraftMutationExecutor(
    fixture.manager,
  ).execute(command());

  assert.deepEqual(saved, {
    outcome: "committed",
    tenantId: 7,
    template: templateView(),
  });
  assert.deepEqual(fixture.calls.options, [
    { isolationLevel: "read-committed" },
  ]);
  assert.equal(fixture.calls.committed, 1);
  assert.equal(fixture.calls.rolledBack, 0);
  assert.equal(fixture.calls.queries[1].sql, postgresMessageTemplateSql.insertDraft);
  assert.equal(
    fixture.calls.queries[2].sql,
    postgresRailwayMessageTemplateDraftMutationSql.insertAudit,
  );
  assert.deepEqual(
    JSON.parse(fixture.calls.queries[3].parameters[4]),
    templateView(),
  );
  assert.equal(fixture.queue.length, 0);
});

test("replays the exact stored draft without a domain write", async () => {
  const fixture = transactionFixture([
    result([], 0),
    result([{
      requestDigest,
      status: "completed",
      responseJson: JSON.stringify(templateView()),
    }]),
  ]);
  const replayed = await createPostgresRailwayMessageTemplateDraftMutationExecutor(
    fixture.manager,
  ).execute(command());

  assert.deepEqual(replayed, {
    outcome: "replayed",
    tenantId: 7,
    template: templateView(),
  });
  assert.equal(fixture.calls.queries.length, 2);
});

test("separates receipt conflict, locked draft, and unavailable persistence", async () => {
  const conflict = transactionFixture([
    result([], 0),
    result([{
      requestDigest: `railway_mutation_request_v1_${"c".repeat(64)}`,
      status: "completed",
      responseJson: null,
    }]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayMessageTemplateDraftMutationExecutor(
      conflict.manager,
    ).execute(command()),
    { outcome: "conflict", tenantId: null, template: null },
  );

  const lockedAt = new Date("2026-08-21T08:05:00.000Z");
  const locked = transactionFixture([
    result([{ idempotencyKey }]),
    result([], 0),
    result([], 0),
    result([templateRow({
      metaTemplateId: "400004",
      status: "approved",
      submissionKey: `template_submission_v1_${"d".repeat(64)}`,
      submissionStartedAt: occurredAt,
      submittedAt: occurredAt,
      reviewedAt: lockedAt,
      version: 4,
      updatedAt: lockedAt,
    })]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayMessageTemplateDraftMutationExecutor(
      locked.manager,
    ).execute(command()),
    { outcome: "not-editable", tenantId: null, template: null },
  );
  assert.equal(locked.calls.rolledBack, 1);
  assert.doesNotMatch(
    locked.calls.queries.map(({ sql }) => sql).join("\n"),
    /INSERT INTO audit_logs/,
  );

  const unavailable = transactionFixture([
    result([{ idempotencyKey }]),
    result([templateRow()]),
    result([], 0),
  ]);
  assert.deepEqual(
    await createPostgresRailwayMessageTemplateDraftMutationExecutor(
      unavailable.manager,
    ).execute(command()),
    { outcome: "unavailable", tenantId: null, template: null },
  );
  assert.equal(unavailable.calls.rolledBack, 1);
});

test("rejects unsafe commands before opening a transaction", async () => {
  const fixture = transactionFixture([]);
  const executor = createPostgresRailwayMessageTemplateDraftMutationExecutor(
    fixture.manager,
  );
  const invalid = [
    command({ payload: { ...draft, tenantId: 7 } }),
    command({ operation: "templates.submit" }),
    command({ idempotencyKey: "bad" }),
    command({ session: { ...session, externalUserId: " verified-user" } }),
  ];

  for (const candidate of invalid) {
    assert.deepEqual(await executor.execute(candidate), {
      outcome: "unavailable",
      tenantId: null,
      template: null,
    });
  }

  assert.deepEqual(fixture.calls.options, []);
});

test("freezes SQL and rejects a missing transaction manager", () => {
  assert.equal(
    Object.isFrozen(postgresRailwayMessageTemplateDraftMutationSql),
    true,
  );
  assert.match(
    postgresRailwayMessageTemplateDraftMutationSql.lockReceipt,
    /FOR UPDATE/,
  );
  assert.match(
    postgresRailwayMessageTemplateDraftMutationSql.insertAudit,
    /audit_logs/,
  );
  assert.doesNotMatch(
    Object.values(postgresRailwayMessageTemplateDraftMutationSql).join("\n"),
    /Math\.random|randomUUID/,
  );
  assert.throws(
    () => createPostgresRailwayMessageTemplateDraftMutationExecutor({}),
    /transaction manager is invalid/,
  );
});
