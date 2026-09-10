import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresContactImportRepository,
  postgresContactImportSql,
} from "../server/platform/postgresContactImportRepository.ts";

const idempotencyKey = `contact_import_v1_${"a".repeat(64)}`;
const phoneFingerprint = "b".repeat(64);
const occurredAt = new Date("2026-08-17T08:30:00.000Z");

function jobRow(overrides = {}) {
  return {
    id: "31",
    tenantId: "7",
    idempotencyKey,
    fileName: "contacts.csv",
    totalRows: 2,
    processedRows: 0,
    createdRows: 0,
    updatedRows: 0,
    unchangedRows: 0,
    rejectedRows: 0,
    duplicateRows: 0,
    status: "processing",
    createdByExternalUserId: "driver-integration-owner",
    createdAt: occurredAt,
    updatedAt: occurredAt,
    completedAt: null,
    ...overrides,
  };
}

function importRow(overrides = {}) {
  return {
    id: "41",
    tenantId: "7",
    jobId: "31",
    sourceRowNumber: 2,
    contactId: "51",
    phoneFingerprint,
    status: "created",
    reason: null,
    ...overrides,
  };
}

function contactProfileRow(overrides = {}) {
  return {
    id: "51",
    tenantId: "7",
    phoneNumber: "+972501234569",
    firstName: "Imported",
    lastName: "Contact",
    email: null,
    company: "Connect",
    ...overrides,
  };
}

function dependenciesFixture({ transactionResults = [], queryResults = [] }) {
  const transactionCalls = [];
  const queryCalls = [];
  let transactionIndex = 0;
  let queryIndex = 0;

  return {
    transactionCalls,
    queryCalls,
    dependencies: {
      queries: {
        async query(sql, parameters) {
          queryCalls.push({ sql, parameters });
          const rows = queryResults[queryIndex] ?? [];
          queryIndex += 1;
          return { rows, rowCount: rows.length };
        },
      },
      transactions: {
        async transaction(options, execute) {
          assert.deepEqual(options, { isolationLevel: "read-committed" });
          return execute({
            async query(sql, parameters) {
              transactionCalls.push({ sql, parameters });
              const rows = transactionResults[transactionIndex] ?? [];
              transactionIndex += 1;
              return { rows, rowCount: rows.length };
            },
          });
        },
      },
    },
  };
}

function acceptedInput(overrides = {}) {
  return {
    tenantId: 7,
    jobId: 31,
    sourceRowNumber: 2,
    phoneFingerprint,
    status: "created",
    profile: {
      phoneNumber: "+972501234569",
      firstName: "Imported",
      lastName: "Contact",
      email: null,
      company: "Connect",
    },
    ...overrides,
  };
}

test("starts or reloads a tenant-scoped job in one transaction", async () => {
  const fixture = dependenciesFixture({
    transactionResults: [[{ id: "31" }], [jobRow()]],
  });
  const repository = createPostgresContactImportRepository(
    fixture.dependencies,
  );
  const job = await repository.startOrFind({
    tenantId: 7,
    idempotencyKey,
    fileName: "contacts.csv",
    totalRows: 2,
    createdByExternalUserId: "driver-integration-owner",
  });

  assert.equal(job.id, 31);
  assert.equal(job.tenantId, 7);
  assert.equal(job.status, "processing");
  assert.deepEqual(fixture.transactionCalls, [
    {
      sql: postgresContactImportSql.insertJob,
      parameters: [
        7,
        idempotencyKey,
        "contacts.csv",
        2,
        "driver-integration-owner",
      ],
    },
    {
      sql: postgresContactImportSql.findJobByKey,
      parameters: [7, idempotencyKey],
    },
  ]);
});

test("derives a created outcome from locked PostgreSQL state", async () => {
  const fixture = dependenciesFixture({
    transactionResults: [
      [jobRow()],
      [],
      [{ id: "51" }],
      [contactProfileRow()],
      [{ id: "41" }],
    ],
  });
  const repository = createPostgresContactImportRepository(
    fixture.dependencies,
  );

  await repository.recordAccepted(
    acceptedInput({ status: "unchanged" }),
  );

  assert.equal(fixture.transactionCalls.length, 5);
  assert.equal(
    fixture.transactionCalls[0].sql,
    postgresContactImportSql.lockJobById,
  );
  assert.deepEqual(fixture.transactionCalls[4].parameters, [
    7,
    31,
    2,
    51,
    phoneFingerprint,
    "created",
  ]);
});

test("updates an existing profile and records the actual updated outcome", async () => {
  const fixture = dependenciesFixture({
    transactionResults: [
      [jobRow()],
      [],
      [],
      [contactProfileRow({ firstName: "Previous" })],
      [{ id: "51" }],
      [{ id: "41" }],
    ],
  });
  const repository = createPostgresContactImportRepository(
    fixture.dependencies,
  );

  await repository.recordAccepted(acceptedInput());

  assert.equal(
    fixture.transactionCalls[4].sql,
    postgresContactImportSql.updateContactProfile,
  );
  assert.equal(
    fixture.transactionCalls[5].parameters[5],
    "updated",
  );
});

test("accepts an exact source replay and rejects conflicting stored evidence", async () => {
  const replayFixture = dependenciesFixture({
    transactionResults: [
      [jobRow()],
      [importRow()],
      [contactProfileRow()],
    ],
  });

  await createPostgresContactImportRepository(
    replayFixture.dependencies,
  ).recordAccepted(acceptedInput({ status: "unchanged" }));
  assert.equal(replayFixture.transactionCalls.length, 3);

  const conflictFixture = dependenciesFixture({
    transactionResults: [
      [jobRow()],
      [importRow({ phoneFingerprint: "c".repeat(64) })],
      [contactProfileRow()],
    ],
  });
  await assert.rejects(
    createPostgresContactImportRepository(
      conflictFixture.dependencies,
    ).recordAccepted(acceptedInput()),
    /conflicts with stored data/,
  );
});

test("records rejected and duplicate outcomes behind the locked job", async () => {
  const rejectedFixture = dependenciesFixture({
    transactionResults: [[jobRow()], [], [{ id: "41" }]],
  });
  await createPostgresContactImportRepository(
    rejectedFixture.dependencies,
  ).recordRejected(7, 31, 2, "missing_phone");
  assert.equal(
    rejectedFixture.transactionCalls[2].sql,
    postgresContactImportSql.insertRejectedRow,
  );

  const duplicateFixture = dependenciesFixture({
    transactionResults: [[jobRow()], [], [{ id: "42" }]],
  });
  await createPostgresContactImportRepository(
    duplicateFixture.dependencies,
  ).recordDuplicate(7, 31, 3, 51, phoneFingerprint);
  assert.deepEqual(duplicateFixture.transactionCalls[2].parameters, [
    7,
    31,
    3,
    51,
    phoneFingerprint,
  ]);
});

test("refreshes exact counters and returns a completed job", async () => {
  const completed = jobRow({
    processedRows: 2,
    createdRows: 1,
    rejectedRows: 1,
    status: "completed",
    completedAt: occurredAt,
  });
  const fixture = dependenciesFixture({
    transactionResults: [
      [jobRow()],
      [
        {
          processedRows: "2",
          createdRows: "1",
          updatedRows: "0",
          unchangedRows: "0",
          rejectedRows: "1",
          duplicateRows: "0",
        },
      ],
      [completed],
    ],
  });
  const refreshed = await createPostgresContactImportRepository(
    fixture.dependencies,
  ).refreshJob(7, 31);

  assert.equal(refreshed.status, "completed");
  assert.equal(refreshed.processedRows, 2);
  assert.deepEqual(fixture.transactionCalls[2].parameters, [
    7,
    31,
    2,
    1,
    0,
    0,
    1,
    0,
  ]);
});

test("reads jobs and row outcomes only from the requested scope", async () => {
  const fixture = dependenciesFixture({
    queryResults: [
      [jobRow()],
      [importRow()],
      [importRow()],
    ],
  });
  const repository = createPostgresContactImportRepository(
    fixture.dependencies,
  );

  assert.equal((await repository.findJob(7, 31))?.id, 31);
  assert.equal((await repository.findRowBySource(7, 31, 2))?.id, 41);
  assert.equal(
    (
      await repository.findRowByPhoneFingerprint(
        7,
        31,
        phoneFingerprint,
      )
    )?.id,
    41,
  );
  assert.deepEqual(
    fixture.queryCalls.map(({ parameters }) => parameters),
    [
      [7, 31],
      [7, 31, 2],
      [7, 31, phoneFingerprint],
    ],
  );
});

test("rejects invalid inputs and cross-tenant driver rows fail-closed", async () => {
  const fixture = dependenciesFixture({});
  const repository = createPostgresContactImportRepository(
    fixture.dependencies,
  );

  await assert.rejects(
    repository.startOrFind({
      tenantId: 7,
      idempotencyKey: "invalid",
      fileName: "contacts.csv",
      totalRows: 2,
      createdByExternalUserId: "driver-integration-owner",
    }),
    /start input is invalid/,
  );
  await assert.rejects(
    repository.recordAccepted(
      acceptedInput({ phoneFingerprint: "invalid" }),
    ),
    /lowercase SHA-256/,
  );
  await assert.rejects(
    repository.recordRejected(7, 31, 2, "unsupported"),
    /reason is invalid/,
  );
  assert.equal(fixture.transactionCalls.length, 0);

  await assert.rejects(
    createPostgresContactImportRepository(
      dependenciesFixture({
        queryResults: [[jobRow({ tenantId: "8" })]],
      }).dependencies,
    ).findJob(7, 31),
    /cross-tenant import job/,
  );
  assert.throws(
    () => createPostgresContactImportRepository({}),
    /dependencies are invalid/,
  );
});
