import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresClerkOrganizationBindingReader,
  createPostgresClerkOrganizationBindingRepository,
  createPostgresClerkOrganizationBindingWriter,
  postgresClerkOrganizationBindingSql,
} from "../server/platform/postgresClerkOrganizationBindingRepository.ts";

function fixture(results) {
  const pending = [...results];
  const calls = [];
  const repository = createPostgresClerkOrganizationBindingRepository({
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      const result = pending.shift();
      if (result === undefined) throw new Error("Unexpected query");
      return result;
    },
  });
  return { calls, pending, repository };
}

test("reads and atomically binds the exact Clerk Organization", async () => {
  const database = fixture([
    {
      rowCount: 1,
      rows: [{ tenantId: "7", externalOrganizationId: "org_verified" }],
    },
    {
      rowCount: 1,
      rows: [{ tenantId: "7", externalOrganizationId: "org_verified" }],
    },
  ]);

  assert.deepEqual(await database.repository.findByTenantId(7), {
    tenantId: 7,
    externalOrganizationId: "org_verified",
  });
  assert.deepEqual(
    await database.repository.ensureBinding({
      tenantId: 7,
      externalOrganizationId: "org_verified",
    }),
    { tenantId: 7, externalOrganizationId: "org_verified" },
  );
  assert.deepEqual(database.calls, [
    {
      sql: postgresClerkOrganizationBindingSql.findByTenantId,
      parameters: [7],
    },
    {
      sql: postgresClerkOrganizationBindingSql.ensureBinding,
      parameters: [7, "org_verified"],
    },
  ]);
  assert.equal(database.pending.length, 0);
  assert.ok(Object.isFrozen(
    await fixture([{
      rowCount: 1,
      rows: [{ tenantId: "7", externalOrganizationId: "org_verified" }],
    }]).repository.findByTenantId(7),
  ));
});

test("separates read and write capabilities", async () => {
  const queries = {
    async query() {
      return { rowCount: 0, rows: [] };
    },
  };
  const reader = createPostgresClerkOrganizationBindingReader(queries);
  const writer = createPostgresClerkOrganizationBindingWriter(queries);

  assert.deepEqual(Object.keys(reader), ["findByTenantId"]);
  assert.deepEqual(Object.keys(writer), ["ensureBinding"]);
  assert.ok(Object.isFrozen(reader));
  assert.ok(Object.isFrozen(writer));
});

test("returns null for an unbound tenant and fails closed on conflicts", async () => {
  const database = fixture([
    { rowCount: 0, rows: [] },
    { rowCount: 0, rows: [] },
  ]);

  assert.equal(await database.repository.findByTenantId(7), null);
  await assert.rejects(
    database.repository.ensureBinding({
      tenantId: 7,
      externalOrganizationId: "org_other",
    }),
    /binding conflicts with tenant/,
  );
});

test("rejects a cross-tenant lookup result", async () => {
  const database = fixture([{
    rowCount: 1,
    rows: [{ tenantId: "8", externalOrganizationId: "org_tenant_8" }],
  }]);

  await assert.rejects(
    database.repository.findByTenantId(7),
    /conflicting Clerk organization binding/,
  );
  assert.deepEqual(database.calls, [{
    sql: postgresClerkOrganizationBindingSql.findByTenantId,
    parameters: [7],
  }]);
});

test("rejects malformed bindings, rows, and dependencies", async () => {
  const database = fixture([
    {
      rowCount: 1,
      rows: [{ tenantId: "7", externalOrganizationId: "org_wrong" }],
    },
  ]);
  await assert.rejects(
    database.repository.ensureBinding({
      tenantId: 7,
      externalOrganizationId: "org_expected",
    }),
    /conflicting Clerk binding/,
  );
  await assert.rejects(
    database.repository.ensureBinding({
      tenantId: 7,
      externalOrganizationId: " org_invalid ",
    }),
    /organization identity is invalid/,
  );
  assert.throws(
    () => createPostgresClerkOrganizationBindingRepository({}),
    /dependencies are invalid/,
  );
  assert.match(
    postgresClerkOrganizationBindingSql.findByTenantId,
    /FROM public\.tenants/,
  );
  assert.match(
    postgresClerkOrganizationBindingSql.ensureBinding,
    /UPDATE public\.tenants/,
  );
  assert.doesNotMatch(
    JSON.stringify(postgresClerkOrganizationBindingSql),
    /(?:FROM|UPDATE)\s+tenants\b/,
  );
  assert.match(
    postgresClerkOrganizationBindingSql.ensureBinding,
    /clerk_organization_id IS NULL[\s\S]*clerk_organization_id = \$2/,
  );
  assert.doesNotMatch(
    JSON.stringify(postgresClerkOrganizationBindingSql),
    /Math\.random|randomUUID|gen_random_uuid|uuid_generate/,
  );
});

test("rejects hostile binding input without invoking accessors", async () => {
  let getterCalls = 0;
  const accessorBinding = {};
  Object.defineProperties(accessorBinding, {
    tenantId: {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 7;
      },
    },
    externalOrganizationId: {
      enumerable: true,
      value: "org_verified",
    },
  });
  const database = fixture([]);
  await assert.rejects(
    database.repository.ensureBinding(accessorBinding),
    /binding is invalid/,
  );
  assert.equal(getterCalls, 0);
  assert.equal(database.calls.length, 0);

  await assert.rejects(
    database.repository.findByTenantId("7"),
    /tenant identity is invalid/,
  );
  await assert.rejects(
    database.repository.ensureBinding({
      tenantId: "7",
      externalOrganizationId: "org_verified",
    }),
    /tenant identity is invalid/,
  );
  assert.equal(database.calls.length, 0);

  const valid = {
    tenantId: 7,
    externalOrganizationId: "org_verified",
  };
  let poisonMessageReads = 0;
  const poisonError = new Error();
  Object.defineProperty(poisonError, "message", {
    get() {
      poisonMessageReads += 1;
      return "private input trap";
    },
  });
  const poisonBinding = new Proxy(valid, {
    ownKeys() {
      throw poisonError;
    },
  });
  await assert.rejects(
    database.repository.ensureBinding(poisonBinding),
    /binding is invalid/,
  );
  assert.equal(poisonMessageReads, 0);

  const invalid = [
    Object.create(valid),
    { ...valid, extra: "forged" },
    Object.defineProperty({ ...valid }, "hidden", { value: true }),
    Object.assign({ ...valid }, { [Symbol("forged")]: true }),
    new Proxy(valid, {
      ownKeys() {
        throw new Error("private input trap");
      },
    }),
  ];
  const revoked = Proxy.revocable(valid, {});
  revoked.revoke();
  invalid.push(revoked.proxy);
  for (const binding of invalid) {
    await assert.rejects(
      database.repository.ensureBinding(binding),
      (error) => /binding is invalid/.test(String(error.message)) &&
        !String(error.message).includes("private"),
    );
  }
  assert.equal(database.calls.length, 0);
});

test("rejects hostile PostgreSQL rows without invoking accessors", async () => {
  let getterCalls = 0;
  const accessorRow = {};
  Object.defineProperties(accessorRow, {
    tenantId: { enumerable: true, value: "7" },
    externalOrganizationId: {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "org_verified";
      },
    },
  });
  const validRow = {
    tenantId: "7",
    externalOrganizationId: "org_verified",
  };
  const rows = [
    accessorRow,
    Object.create(validRow),
    { ...validRow, extra: "forged" },
    Object.defineProperty({ ...validRow }, "hidden", { value: true }),
    Object.assign({ ...validRow }, { [Symbol("forged")]: true }),
    new Proxy(validRow, {
      ownKeys() {
        throw new Error("private row trap");
      },
    }),
  ];
  const revoked = Proxy.revocable(validRow, {});
  revoked.revoke();
  rows.push(revoked.proxy);

  for (const row of rows) {
    const database = fixture([{ rowCount: 1, rows: [row] }]);
    await assert.rejects(
      database.repository.findByTenantId(7),
      (error) => /invalid Clerk organization binding/.test(
        String(error.message),
      ) && !String(error.message).includes("private"),
    );
  }
  assert.equal(getterCalls, 0);
});

test("rejects hostile PostgreSQL result and rows-array envelopes", async () => {
  let getterCalls = 0;
  const accessorResult = {};
  Object.defineProperties(accessorResult, {
    rowCount: {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    },
    rows: {
      enumerable: true,
      value: [{ tenantId: "7", externalOrganizationId: "org_verified" }],
    },
  });
  const resultCandidates = [
    accessorResult,
    {
      rowCount: 1,
      rows: Object.assign(
        [{ tenantId: "7", externalOrganizationId: "org_verified" }],
        { extra: "forged" },
      ),
    },
    new Proxy({ rowCount: 0, rows: [] }, {
      ownKeys() {
        throw new Error("private result trap");
      },
    }),
  ];
  const revoked = Proxy.revocable({ rowCount: 0, rows: [] }, {});
  revoked.revoke();
  resultCandidates.push(revoked.proxy);

  let poisonMessageReads = 0;
  const poisonError = new Error();
  Object.defineProperty(poisonError, "message", {
    get() {
      poisonMessageReads += 1;
      return "private rows trap";
    },
  });
  resultCandidates.push({
    rowCount: 0,
    rows: new Proxy([], {
      ownKeys() {
        throw poisonError;
      },
    }),
  });

  for (const result of resultCandidates) {
    const database = fixture([result]);
    await assert.rejects(
      database.repository.findByTenantId(7),
      (error) => /invalid result|query failed/.test(
        String(error.message),
      ) &&
        !String(error.message).includes("private"),
    );
  }
  assert.equal(getterCalls, 0);
  assert.equal(poisonMessageReads, 0);
});

test("rejects hostile query dependencies without invoking accessors", () => {
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "query", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return async () => ({ rowCount: 0, rows: [] });
    },
  });
  assert.throws(
    () => createPostgresClerkOrganizationBindingRepository(accessor),
    /dependencies are invalid/,
  );
  assert.equal(getterCalls, 0);
});

test("sanitizes query failures", async () => {
  const repository = createPostgresClerkOrganizationBindingRepository({
    async query() {
      throw new Error("private database failure");
    },
  });

  await assert.rejects(
    repository.findByTenantId(7),
    (error) => error.message ===
      "PostgreSQL Clerk organization query failed" &&
      !error.message.includes("private"),
  );
});
