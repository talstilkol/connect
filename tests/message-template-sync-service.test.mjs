import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresRailwayMessageTemplateSyncMutationExecutor, postgresRailwayMessageTemplateSyncSql as syncSql } from "../server/platform/postgresRailwayMessageTemplateSyncMutationExecutor.ts";
import { postgresRailwayMessageTemplateDraftMutationSql as receiptSql } from "../server/platform/postgresRailwayMessageTemplateDraftMutationExecutor.ts";
import { postgresMessageTemplateSql } from "../server/platform/postgresMessageTemplateRepository.ts";
import { deriveRailwayApiDeterministicIdempotencyKey, deriveRailwayApiMutationRequestDigest } from "../server/platform/railwayApiMutationExecutor.ts";

import {
  MessageTemplateIdentityConflictError,
} from "../db/messageTemplateRepository.ts";
import {
  MetaCredentialVaultError,
} from "../server/meta/metaCredentialVault.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";
import {
  createMessageTemplateSyncService,
  MessageTemplateSyncError,
} from "../server/templates/messageTemplateSyncService.ts";

const accessToken = toSensitiveMetaAccessToken(
  "template-sync-access-token",
);

// Reuse this file's template/session and the existing credential repository test envelope.
async function postgresSyncFixture(options = {}) {
  const calls = [];
  const tenantSession = session();
  const observedAt = persistedTemplate().updatedAt;
  const payload = { requestedAt: observedAt };
  const command = {
    session: tenantSession, operation: "templates.sync", payload,
    idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey("templates.sync", payload),
    requestDigest: await deriveRailwayApiMutationRequestDigest("templates.sync", payload),
  };
  const binding = { wabaId: "200002", version: 2, keyVersion: "v1",
    initializationVector: "AQIDBAUGBwgJCgsM", ciphertext: "AQIDBAUGBwgJCgsMDQ4PEA==" };
  let receipt = options.receipt ?? null;
  let transactionActive = false;
  let templateWrites = 0;
  let audits = 0;
  const counts = () => ({ templateWrites, audits });
  const queries = {
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      if (sql === options.failAt) throw new Error("private persistence failure");
      let rows;
      if (sql === syncSql.findReceipt) rows = receipt === null ? [] : [receipt];
      else if (sql === syncSql.readBinding) rows = [{ ...binding }];
      else if (sql === syncSql.lockBinding) rows = options.disconnect ? [] : [{ ...binding, ...(options.changedBinding ?? {}) }];
      else if (sql === syncSql.tenantBarrier) rows = [];
      else if (sql === syncSql.lockTenant) rows = [{ id: tenantSession.tenantId }];
      else if (sql === syncSql.lockMembership) rows = options.revoke ? [] : [{ role: tenantSession.role }];
      else if (sql === receiptSql.claimReceipt) rows = [{ idempotencyKey: command.idempotencyKey }];
      else if (sql === receiptSql.completeReceipt) {
        receipt = { requestDigest: command.requestDigest, status: "completed", responseJson: parameters[4] };
        rows = [{ idempotencyKey: command.idempotencyKey }];
      } else if (sql === syncSql.insertAudit) { audits += 1; rows = [{ id: 1 }]; }
      else if (sql === postgresMessageTemplateSql.applyStatusEvent) {
        templateWrites += 1;
        const stored = persistedTemplate();
        const { header, body, footer, variableExamples, buttonMode, quickReplies, urlButton, phoneButton } = stored;
        rows = [{ ...stored, definitionJson: { header, body, footer, variableExamples, buttonMode, quickReplies, urlButton, phoneButton } }];
        for (const key of ["header", "body", "footer", "variableExamples", "buttonMode", "quickReplies", "urlButton", "phoneButton"]) delete rows[0][key];
      } else if (sql === postgresMessageTemplateSql.listByTenant) rows = [];
      else throw new Error("Unexpected SQL");
      return { rows, rowCount: rows.length };
    },
  };
  const executor = createPostgresRailwayMessageTemplateSyncMutationExecutor({
    queries,
    transactions: { async transaction(_options, execute) {
      const before = { receipt, templateWrites, audits };
      transactionActive = true;
      try { const result = await execute(queries); calls.push("commit"); return result; }
      catch (error) {
        ({ receipt, templateWrites, audits } = before);
        calls.push("rollback"); throw error;
      } finally { transactionActive = false; }
    } },
    credentialVault: { async withAccessToken(tenantId, execute) {
      assert.equal(tenantId, tenantSession.tenantId);
      return execute(accessToken);
    } },
    lister: { async list(input) {
      calls.push("provider-read");
      assert.equal(transactionActive, false);
      assert.equal(input.wabaId, binding.wabaId);
      assert.equal(input.accessToken, accessToken);
      if (options.providerFailure) throw new Error("private provider failure");
      return [snapshot()];
    } },
    clock: () => observedAt,
  });
  return { executor, command, calls, counts };
}

test("Railway sync writes status, audit and receipt together and replays without another provider read", async () => {
  const f = await postgresSyncFixture();
  const first = await f.executor.execute(f.command);
  assert.equal(first.outcome, "committed");
  assert.equal(first.state.summary.updated, 1);
  const replay = await f.executor.execute(f.command);
  assert.equal(replay.outcome, "replayed");
  assert.deepEqual(replay.state, first.state);
  assert.equal(f.calls.filter((call) => call === "provider-read").length, 1);
  assert.deepEqual(f.counts(), { templateWrites: 1, audits: 1 });
  assert.doesNotMatch(JSON.stringify(first), /ciphertext|initializationVector|accessToken|wabaId/);
});

test("Railway sync rejects revoked authorization or changed connection and credentials before writes", async () => {
  for (const options of [{ revoke: true }, { disconnect: true },
    { changedBinding: { version: 3 } }, { changedBinding: { ciphertext: "AQIDBAUGBwgJCgsMDQ4PEA==".repeat(2) } }]) {
    const f = await postgresSyncFixture(options);
    const result = await f.executor.execute(f.command);
    assert.ok(["authorization-changed", "meta-not-connected"].includes(result.outcome));
    assert.equal(result.state, null);
    assert.deepEqual(f.counts(), { templateWrites: 0, audits: 0 });
    assert.equal(f.calls.includes("rollback"), true);
  }
});

test("Railway sync rolls back status changes when the audit or receipt fails", async () => {
  for (const failAt of [syncSql.insertAudit, receiptSql.completeReceipt, postgresMessageTemplateSql.listByTenant]) {
    const f = await postgresSyncFixture({ failAt });
    assert.equal((await f.executor.execute(f.command)).outcome, "unavailable");
    assert.deepEqual(f.counts(), { templateWrites: 0, audits: 0 });
    assert.equal(f.calls.includes("rollback"), true);
  }
  const f = await postgresSyncFixture({ providerFailure: true });
  assert.equal((await f.executor.execute(f.command)).outcome, "unavailable");
  assert.equal(f.calls.includes("commit") || f.calls.includes("rollback"), false);
});

test("Railway sync cannot bypass permission or request validation by calling the executor directly", async () => {
  const f = await postgresSyncFixture();
  for (const command of [
    { ...f.command, session: session("viewer") },
    { ...f.command, payload: { requestedAt: "invalid" } },
    { ...f.command, payload: { ...f.command.payload, tenantId: 7 } },
  ]) {
    assert.equal((await f.executor.execute(command)).outcome, "unavailable");
  }
  assert.deepEqual(f.calls, []);
});

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function persistedTemplate(overrides = {}) {
  return {
    templateKey: `template_v1_${"a".repeat(64)}`,
    tenantId: 7,
    metaTemplateId: "400004",
    name: "service_update",
    category: "UTILITY",
    language: "he",
    status: "approved",
    submissionKey:
      `template_submission_v1_${"b".repeat(64)}`,
    submissionStartedAt: "2026-07-25T09:59:00.000Z",
    lastSubmissionErrorCode: null,
    lastStatusEventKey: "c".repeat(64),
    lastStatusEventAt: "2026-07-25T10:00:00.000Z",
    version: 4,
    submittedAt: "2026-07-25T09:59:30.000Z",
    reviewedAt: "2026-07-25T10:00:00.000Z",
    createdAt: "2026-07-25T09:00:00.000Z",
    updatedAt: "2026-07-25T10:00:00.000Z",
    header: "",
    body: "שלום",
    footer: "",
    variableExamples: {},
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
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    metaTemplateId: "400004",
    name: "service_update",
    language: "he",
    category: "UTILITY",
    providerStatus: "APPROVED",
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = [];
  const outcomes = [
    ...(options.outcomes ?? ["applied"]),
  ];
  const templates = {
    async saveDraft() {
      throw new Error("must-not-run");
    },
    async findByKey() {
      throw new Error("must-not-run");
    },
    async findByMetaId() {
      throw new Error("must-not-run");
    },
    async claimSubmission() {
      throw new Error("must-not-run");
    },
    async completeSubmission() {
      throw new Error("must-not-run");
    },
    async releaseSubmission() {
      throw new Error("must-not-run");
    },
    async applyStatusEvent(input) {
      calls.push({
        operation: "apply-status",
        input,
      });

      if (options.applyError) {
        throw options.applyError;
      }

      const outcome = outcomes.shift() ?? "not-found";

      return outcome === "not-found"
        ? { outcome }
        : {
            outcome,
            template: persistedTemplate({
              metaTemplateId: input.metaTemplateId,
              name: input.name,
              language: input.language,
              category: input.category,
              status: input.status,
            }),
          };
    },
    async listByTenant(tenantId, limit) {
      calls.push({
        operation: "list-local",
        tenantId,
        limit,
      });

      if (options.listError) {
        throw options.listError;
      }

      return [persistedTemplate()];
    },
  };
  const service = createMessageTemplateSyncService({
    templates,
    metaConnections: {
      async findConnectionByTenantId(tenantId) {
        calls.push({
          operation: "find-connection",
          tenantId,
        });

        if (options.connectionError) {
          throw options.connectionError;
        }

        return options.connection === undefined
          ? {
              tenantId: 7,
              businessPortfolioId: "100001",
              wabaId: "200002",
              phoneNumberId: "300003",
              status: "connected",
              webhookSubscribedAt:
                "2026-07-25T09:00:00.000Z",
              connectedAt:
                "2026-07-25T09:00:00.000Z",
              version: 2,
              createdAt:
                "2026-07-25T08:00:00.000Z",
              updatedAt:
                "2026-07-25T09:00:00.000Z",
            }
          : options.connection;
      },
    },
    credentialVault: {
      async storeAccessToken() {
        throw new Error("must-not-run");
      },
      async withAccessToken(tenantId, operation) {
        calls.push({
          operation: "read-credential",
          tenantId,
        });

        if (options.credentialError) {
          throw options.credentialError;
        }

        return operation(accessToken);
      },
    },
    lister: {
      async list(input) {
        calls.push({
          operation: "list-meta",
          input,
        });

        if (options.listMetaError) {
          throw options.listMetaError;
        }

        return options.snapshots ?? [snapshot()];
      },
    },
    clock: () =>
      new Date("2026-07-25T10:00:00.000Z"),
  });

  return { calls, service };
}

test("synchronizes eligible snapshots and reports every outcome", async () => {
  const testFixture = fixture({
    snapshots: [
      snapshot(),
      snapshot({
        metaTemplateId: "400005",
        name: "account_notice",
        providerStatus: "PENDING",
      }),
      snapshot({
        metaTemplateId: "400006",
        name: "service_rejected",
        providerStatus: "REJECTED",
      }),
      snapshot({
        metaTemplateId: "400007",
        name: "service_disabled",
        providerStatus: "DISABLED",
      }),
      snapshot({
        metaTemplateId: "400008",
        name: "authentication_code",
        category: "AUTHENTICATION",
      }),
    ],
    outcomes: [
      "applied",
      "duplicate",
      "stale",
      "not-found",
    ],
  });

  const result = await testFixture.service.sync(session());

  assert.deepEqual(result.summary, {
    received: 5,
    eligible: 4,
    updated: 1,
    unchanged: 1,
    stale: 1,
    unmatched: 1,
    unsupported: 1,
    observedAt: "2026-07-25T10:00:00.000Z",
  });
  assert.equal(result.templates.length, 1);
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    [
      "find-connection",
      "read-credential",
      "list-meta",
      "apply-status",
      "apply-status",
      "apply-status",
      "apply-status",
      "list-local",
    ],
  );
  const appliedInputs = testFixture.calls
    .filter((call) => call.operation === "apply-status")
    .map((call) => call.input);
  assert.deepEqual(
    appliedInputs.map((input) => input.status),
    [
      "approved",
      "pending_review",
      "rejected",
      "disabled",
    ],
  );
  assert.ok(
    appliedInputs.every(
      (input) =>
        input.category === "UTILITY" &&
        /^[0-9a-f]{64}$/.test(input.statusEventKey) &&
        input.statusEventAt ===
          "2026-07-25T10:00:00.000Z",
    ),
  );
  assert.deepEqual(testFixture.calls.at(-1), {
    operation: "list-local",
    tenantId: 7,
    limit: 100,
  });
});

test("derives the same snapshot key for the same provider state", async () => {
  const testFixture = fixture({
    outcomes: ["applied", "duplicate"],
  });

  await testFixture.service.sync(session());
  await testFixture.service.sync(session());

  const keys = testFixture.calls
    .filter((call) => call.operation === "apply-status")
    .map((call) => call.input.statusEventKey);

  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
});

test("checks write permission before reading tenant dependencies", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.sync(session("viewer")),
    (error) => error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("requires an active Meta connection before credential access", async () => {
  const testFixture = fixture({
    connection: null,
  });

  await assert.rejects(
    testFixture.service.sync(session()),
    (error) =>
      error instanceof MessageTemplateSyncError &&
      error.code === "META_NOT_CONNECTED",
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["find-connection"],
  );
});

test("maps credential, identity, and provider failures to bounded errors", async () => {
  const cases = [
    {
      options: {
        credentialError: new MetaCredentialVaultError(
          "CREDENTIAL_NOT_FOUND",
          "sensitive credential detail",
        ),
      },
      code: "CREDENTIAL_UNAVAILABLE",
    },
    {
      options: {
        applyError:
          new MessageTemplateIdentityConflictError(),
      },
      code: "IDENTITY_CONFLICT",
    },
    {
      options: {
        listMetaError: new Error(
          "provider response detail",
        ),
      },
      code: "SYNC_FAILED",
    },
  ];

  for (const item of cases) {
    const testFixture = fixture(item.options);

    await assert.rejects(
      testFixture.service.sync(session()),
      (error) => {
        assert.ok(error instanceof MessageTemplateSyncError);
        assert.equal(error.code, item.code);
        assert.doesNotMatch(
          error.message,
          /sensitive|provider/,
        );
        return true;
      },
    );
  }
});
