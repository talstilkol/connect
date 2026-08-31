import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresMetaCredentialRepository,
  postgresMetaCredentialSql,
} from "../server/platform/postgresMetaCredentialRepository.ts";

const initializationVector = "AQIDBAUGBwgJCgsM";
const ciphertext = "AQIDBAUGBwgJCgsMDQ4PEA==";
const occurredAt = new Date("2026-08-17T08:30:00.000Z");

function envelopeRow(overrides = {}) {
  return {
    tenantId: "7",
    keyVersion: "v1",
    initializationVector,
    ciphertext,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  };
}

function queryFixture(results) {
  const calls = [];
  let index = 0;

  return {
    calls,
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        const rows = results[index] ?? [];
        index += 1;
        return { rows, rowCount: rows.length };
      },
    },
  };
}

test("stores only an encrypted tenant-scoped envelope", async () => {
  const fixture = queryFixture([[{ tenantId: "7" }]]);
  const repository = createPostgresMetaCredentialRepository(
    fixture.queries,
  );

  await repository.store({
    tenantId: 7,
    keyVersion: "v1",
    initializationVector,
    ciphertext,
  });

  assert.deepEqual(fixture.calls, [
    {
      sql: postgresMetaCredentialSql.store,
      parameters: [7, "v1", initializationVector, ciphertext],
    },
  ]);
  assert.doesNotMatch(
    postgresMetaCredentialSql.store,
    /access_token|plaintext|provider_payload/i,
  );
});

test("loads and validates one exact tenant envelope", async () => {
  const fixture = queryFixture([[envelopeRow()]]);
  const repository = createPostgresMetaCredentialRepository(
    fixture.queries,
  );

  assert.deepEqual(await repository.findByTenantId(7), {
    tenantId: 7,
    keyVersion: "v1",
    initializationVector,
    ciphertext,
    createdAt: "2026-08-17T08:30:00.000Z",
    updatedAt: "2026-08-17T08:30:00.000Z",
  });
  assert.deepEqual(fixture.calls[0].parameters, [7]);
});

test("rejects malformed input and cross-tenant driver results", async () => {
  const emptyRepository = createPostgresMetaCredentialRepository(
    queryFixture([]).queries,
  );

  await assert.rejects(
    emptyRepository.store({
      tenantId: 0,
      keyVersion: "v1",
      initializationVector,
      ciphertext,
    }),
    /tenantId/,
  );
  await assert.rejects(
    emptyRepository.store({
      tenantId: 7,
      keyVersion: "v1",
      initializationVector: "invalid",
      ciphertext,
    }),
    /initialization vector/,
  );
  await assert.rejects(
    createPostgresMetaCredentialRepository(
      queryFixture([[envelopeRow({ tenantId: "8" })]]).queries,
    ).findByTenantId(7),
    /cross-tenant Meta credential/,
  );
});

test("fails closed for malformed rows and unconfirmed writes", async () => {
  await assert.rejects(
    createPostgresMetaCredentialRepository(
      queryFixture([[envelopeRow({ ciphertext: "not-base64" })]]).queries,
    ).findByTenantId(7),
    /ciphertext/,
  );
  await assert.rejects(
    createPostgresMetaCredentialRepository(
      queryFixture([[]]).queries,
    ).store({
      tenantId: 7,
      keyVersion: "v1",
      initializationVector,
      ciphertext,
    }),
    /write was not confirmed/,
  );
});
