import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRuntimeCapabilityEvidenceProbe,
  postgresRuntimeCapabilityEvidenceCheckCodes,
  postgresRuntimeCapabilityEvidenceMigrationOwnerRole,
  postgresRuntimeCapabilityEvidencePolicyVersion,
  postgresRuntimeCapabilityEvidenceResultFieldNames,
  postgresRuntimeCapabilityEvidenceSql,
} from "../server/platform/postgresRuntimeCapabilityEvidence.ts";
import {
  postgresMigrationOwnerRole,
  postgresRuntimeCapabilities,
  postgresRuntimeCapabilityLoginRoles,
} from "../server/platform/postgresRuntimeCapabilityConfiguration.ts";

const unsignedBigintMaximum = (2n ** 64n - 1n).toString();

function policy(capability, overrides = {}) {
  return {
    capability,
    runtimeEnvironment: "production",
    expectedDatabaseName: "connect_test",
    expectedSystemIdentifier: unsignedBigintMaximum,
    ...overrides,
  };
}

function candidateRow(capability) {
  const migrationCapability = capability === "migration";
  const verifierCapability = capability === "verifier";
  return {
    postgres16: true,
    primaryServer: true,
    databaseNameMatches: true,
    systemIdentifierMatches: true,
    tlsSessionApproved: true,
    sessionRoleMatches: true,
    currentRoleMatches: true,
    loginRoleLeastPrivilege: true,
    migrationOwnerLeastPrivilege: true,
    migrationOwnerMember: migrationCapability,
    migrationOwnerSettable: migrationCapability,
    migrationOwnerInherited: false,
    protectedRoleTopologyLocked: true,
    migrationOwnerDefaultAclLocked: true,
    databaseConnect: true,
    databaseCreateBlocked: true,
    databaseTemporaryBlocked: true,
    publicSchemaUsage: true,
    publicSchemaCreateBlocked: true,
    searchPathLocked: true,
    protectedTablesExist: true,
    protectedTablesOwnedByMigrationOwner: true,
    protectedTableAclLocked: true,
    protectedTableAccess: false,
    protectedFunctionsExist: true,
    protectedFunctionsOwnedByMigrationOwner: true,
    protectedFunctionAclLocked: true,
    internalFunctionExecute: false,
    attestedPublishExecute: verifierCapability,
    readbackExecute: verifierCapability,
    publicProtectedFunctionExecute: false,
    attestedPublishSecurityDefiner: true,
    readbackSecurityDefiner: true,
    functionSearchPathLocked: true,
    readbackShapeLocked: true,
  };
}

function queryReturning(row, calls = []) {
  return {
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      return { rowCount: 1, rows: [row] };
    },
  };
}

test("declares one fixed read-only PostgreSQL catalog query", () => {
  const withoutStringLiterals = postgresRuntimeCapabilityEvidenceSql.replace(
    /'(?:''|[^'])*'/gu,
    "''",
  );

  assert.match(postgresRuntimeCapabilityEvidenceSql, /^\s*WITH expected AS/);
  assert.doesNotMatch(postgresRuntimeCapabilityEvidenceSql, /;/);
  assert.doesNotMatch(
    withoutStringLiterals,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE)\b/iu,
  );
  assert.doesNotMatch(postgresRuntimeCapabilityEvidenceSql, /\$4\b/);
  for (const requiredToken of [
    "$1::TEXT",
    "$2::TEXT",
    "$3::TEXT",
    "pg_catalog.pg_control_system()",
    "pg_catalog.pg_stat_ssl",
    "session_user",
    "current_user",
    "pg_catalog.pg_has_role",
    "pg_catalog.pg_auth_members",
    "pg_catalog.pg_default_acl",
    "pg_catalog.aclexplode",
    "pg_catalog.has_table_privilege",
    "pg_catalog.has_any_column_privilege",
    "pg_catalog.has_function_privilege",
    "is_grantable",
    "public_schema_owner.rolname",
    "public_schema_privilege.grantee <>",
    "bot_reply_staging_runs",
    "bot_reply_staging_attestation_nonces",
    "bot_reply_staging_release_evidence",
    "bot_reply_staging_release_evidence_operator_events",
    "publish_bot_reply_staging_attested_evidence_with_audit",
    "read_bot_reply_staging_attested_release_evidence_v1",
    "guard_bot_reply_staging_attestation_nonce_insert",
    "reject_bot_reply_staging_attestation_nonce_mutation",
    "enforce_bot_reply_staging_release_evidence_operator_insert",
    "reject_bot_reply_staging_release_evidence_operator_mutation",
  ]) {
    assert.equal(postgresRuntimeCapabilityEvidenceSql.includes(requiredToken), true);
  }
});

test("publishes one complete immutable check catalog", () => {
  assert.equal(postgresRuntimeCapabilityEvidenceCheckCodes.length, 35);
  assert.equal(
    new Set(postgresRuntimeCapabilityEvidenceCheckCodes).size,
    postgresRuntimeCapabilityEvidenceCheckCodes.length,
  );
  assert.equal(Object.isFrozen(postgresRuntimeCapabilityEvidenceCheckCodes), true);
  assert.equal(
    postgresRuntimeCapabilityEvidenceMigrationOwnerRole,
    postgresMigrationOwnerRole,
  );
  assert.equal(
    postgresRuntimeCapabilityEvidencePolicyVersion,
    "connect-postgres-runtime-capability-evidence-v1",
  );
  assert.equal(postgresRuntimeCapabilityEvidenceResultFieldNames.length, 35);
  assert.equal(
    new Set(postgresRuntimeCapabilityEvidenceResultFieldNames).size,
    postgresRuntimeCapabilityEvidenceResultFieldNames.length,
  );
  assert.equal(
    Object.isFrozen(postgresRuntimeCapabilityEvidenceResultFieldNames),
    true,
  );
  assert.deepEqual(postgresRuntimeCapabilityEvidenceResultFieldNames, [
    "postgres16",
    "primaryServer",
    "databaseNameMatches",
    "systemIdentifierMatches",
    "tlsSessionApproved",
    "sessionRoleMatches",
    "currentRoleMatches",
    "loginRoleLeastPrivilege",
    "migrationOwnerLeastPrivilege",
    "migrationOwnerMember",
    "migrationOwnerSettable",
    "migrationOwnerInherited",
    "protectedRoleTopologyLocked",
    "migrationOwnerDefaultAclLocked",
    "databaseConnect",
    "databaseCreateBlocked",
    "databaseTemporaryBlocked",
    "publicSchemaUsage",
    "publicSchemaCreateBlocked",
    "searchPathLocked",
    "protectedTablesExist",
    "protectedTablesOwnedByMigrationOwner",
    "protectedTableAclLocked",
    "protectedTableAccess",
    "protectedFunctionsExist",
    "protectedFunctionsOwnedByMigrationOwner",
    "protectedFunctionAclLocked",
    "internalFunctionExecute",
    "attestedPublishExecute",
    "readbackExecute",
    "publicProtectedFunctionExecute",
    "attestedPublishSecurityDefiner",
    "readbackSecurityDefiner",
    "functionSearchPathLocked",
    "readbackShapeLocked",
  ]);

  const finalSelectStart = postgresRuntimeCapabilityEvidenceSql.lastIndexOf(
    "\n  SELECT\n    pg_catalog.current_setting('server_version_num')",
  );
  const finalSelectEnd = postgresRuntimeCapabilityEvidenceSql.indexOf(
    "\n  FROM expected",
    finalSelectStart,
  );
  assert.notEqual(finalSelectStart, -1);
  assert.notEqual(finalSelectEnd, -1);
  const selectedAliases = [
    ...postgresRuntimeCapabilityEvidenceSql
      .slice(finalSelectStart, finalSelectEnd)
      .matchAll(/AS "([A-Za-z][A-Za-z0-9]*)"/g),
  ].map((match) => match[1]);
  assert.deepEqual(
    selectedAliases,
    postgresRuntimeCapabilityEvidenceResultFieldNames,
  );
});

test("requires the trusted-driver search path without public", () => {
  assert.match(
    postgresRuntimeCapabilityEvidenceSql,
    /current_setting\('search_path'\)[\s\S]*'pg_catalog, pg_temp'/,
  );
  assert.match(
    postgresRuntimeCapabilityEvidenceSql,
    /current_schemas\(TRUE\)[\s\S]*ARRAY\['pg_catalog'\]::NAME\[\]/,
  );
  assert.doesNotMatch(
    postgresRuntimeCapabilityEvidenceSql,
    /'pg_catalog, public, pg_temp'/,
  );
});

test("returns a dormant candidate for every capability with one sanitized query", async () => {
  for (const capability of postgresRuntimeCapabilities) {
    const calls = [];
    const probe = createPostgresRuntimeCapabilityEvidenceProbe(
      policy(capability),
      queryReturning(candidateRow(capability), calls),
    );

    const evidence = await probe.verify();

    assert.deepEqual(evidence, {
      policyVersion: postgresRuntimeCapabilityEvidencePolicyVersion,
      capability,
      status: "candidate",
      activationAllowed: false,
      evaluatedCheckCount: 35,
      totalCheckCount: 35,
      failedChecks: [],
    });
    assert.equal(Object.isFrozen(probe), true);
    assert.equal(Object.isFrozen(evidence), true);
    assert.equal(Object.isFrozen(evidence.failedChecks), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].sql, postgresRuntimeCapabilityEvidenceSql);
    assert.deepEqual(calls[0].parameters, [
      "connect_test",
      unsignedBigintMaximum,
      postgresRuntimeCapabilityLoginRoles[capability],
    ]);
    assert.equal(Object.isFrozen(calls[0].parameters), true);

    const serialized = JSON.stringify(evidence);
    assert.equal(serialized.includes("connect_test"), false);
    assert.equal(serialized.includes(unsignedBigintMaximum), false);
    assert.equal(serialized.includes("postgresql://"), false);
  }
});

test("requires migration membership only for the migrator login", async () => {
  const cases = [
    ["api", true, false, "POSTGRES_MIGRATION_OWNER_MEMBERSHIP"],
    ["worker", false, true, "POSTGRES_MIGRATION_OWNER_SET_ROLE"],
    ["verifier", true, true, "POSTGRES_MIGRATION_OWNER_MEMBERSHIP"],
    ["migration", false, true, "POSTGRES_MIGRATION_OWNER_MEMBERSHIP"],
    ["migration", true, false, "POSTGRES_MIGRATION_OWNER_SET_ROLE"],
  ];

  for (const [capability, member, settable, expectedFailure] of cases) {
    const row = {
      ...candidateRow(capability),
      migrationOwnerMember: member,
      migrationOwnerSettable: settable,
    };
    const evidence = await createPostgresRuntimeCapabilityEvidenceProbe(
      policy(capability),
      queryReturning(row),
    ).verify();
    assert.equal(evidence.status, "blocked");
    assert.equal(evidence.failedChecks.includes(expectedFailure), true);
  }
});

test("allows publish and readback execute only to the verifier", async () => {
  for (const capability of postgresRuntimeCapabilities) {
    const expected = capability === "verifier";
    const row = {
      ...candidateRow(capability),
      attestedPublishExecute: !expected,
      readbackExecute: !expected,
    };
    const evidence = await createPostgresRuntimeCapabilityEvidenceProbe(
      policy(capability),
      queryReturning(row),
    ).verify();
    assert.deepEqual(evidence.failedChecks, [
      "POSTGRES_ATTESTED_PUBLISH_EXECUTE",
      "POSTGRES_READBACK_EXECUTE",
    ]);
  }
});

test("fails each independent API capability check closed", async () => {
  const scenarios = [
    ["postgres16", false, "POSTGRES_VERSION_16"],
    ["primaryServer", false, "POSTGRES_PRIMARY_SERVER"],
    ["databaseNameMatches", false, "POSTGRES_DATABASE_NAME"],
    [
      "systemIdentifierMatches",
      false,
      "POSTGRES_CLUSTER_SYSTEM_IDENTIFIER",
    ],
    ["tlsSessionApproved", false, "POSTGRES_TLS_SESSION"],
    ["sessionRoleMatches", false, "POSTGRES_SESSION_ROLE"],
    ["currentRoleMatches", false, "POSTGRES_CURRENT_ROLE"],
    [
      "loginRoleLeastPrivilege",
      false,
      "POSTGRES_LOGIN_ROLE_ATTRIBUTES",
    ],
    [
      "migrationOwnerLeastPrivilege",
      false,
      "POSTGRES_MIGRATION_OWNER_ATTRIBUTES",
    ],
    [
      "migrationOwnerMember",
      true,
      "POSTGRES_MIGRATION_OWNER_MEMBERSHIP",
    ],
    [
      "migrationOwnerSettable",
      true,
      "POSTGRES_MIGRATION_OWNER_SET_ROLE",
    ],
    [
      "migrationOwnerInherited",
      true,
      "POSTGRES_MIGRATION_OWNER_NO_INHERIT",
    ],
    [
      "protectedRoleTopologyLocked",
      false,
      "POSTGRES_PROTECTED_ROLE_TOPOLOGY",
    ],
    [
      "migrationOwnerDefaultAclLocked",
      false,
      "POSTGRES_MIGRATION_OWNER_DEFAULT_ACL",
    ],
    ["databaseConnect", false, "POSTGRES_DATABASE_CONNECT"],
    [
      "databaseCreateBlocked",
      false,
      "POSTGRES_DATABASE_CREATE_BLOCKED",
    ],
    [
      "databaseTemporaryBlocked",
      false,
      "POSTGRES_DATABASE_TEMPORARY_BLOCKED",
    ],
    ["publicSchemaUsage", false, "POSTGRES_PUBLIC_SCHEMA_USAGE"],
    [
      "publicSchemaCreateBlocked",
      false,
      "POSTGRES_PUBLIC_SCHEMA_CREATE_BLOCKED",
    ],
    ["searchPathLocked", false, "POSTGRES_SEARCH_PATH"],
    [
      "protectedTablesExist",
      false,
      "POSTGRES_PROTECTED_TABLES_EXIST",
    ],
    [
      "protectedTablesOwnedByMigrationOwner",
      false,
      "POSTGRES_PROTECTED_TABLE_OWNERSHIP",
    ],
    [
      "protectedTableAclLocked",
      false,
      "POSTGRES_PROTECTED_TABLE_ACL",
    ],
    [
      "protectedTableAccess",
      true,
      "POSTGRES_PROTECTED_TABLE_ACCESS_BLOCKED",
    ],
    [
      "protectedFunctionsExist",
      false,
      "POSTGRES_PROTECTED_FUNCTIONS_EXIST",
    ],
    [
      "protectedFunctionsOwnedByMigrationOwner",
      false,
      "POSTGRES_PROTECTED_FUNCTION_OWNERSHIP",
    ],
    [
      "protectedFunctionAclLocked",
      false,
      "POSTGRES_PROTECTED_FUNCTION_ACL",
    ],
    [
      "internalFunctionExecute",
      true,
      "POSTGRES_INTERNAL_FUNCTION_EXECUTE_BLOCKED",
    ],
    [
      "attestedPublishExecute",
      true,
      "POSTGRES_ATTESTED_PUBLISH_EXECUTE",
    ],
    ["readbackExecute", true, "POSTGRES_READBACK_EXECUTE"],
    [
      "publicProtectedFunctionExecute",
      true,
      "POSTGRES_PUBLIC_FUNCTION_EXECUTE_BLOCKED",
    ],
    [
      "attestedPublishSecurityDefiner",
      false,
      "POSTGRES_ATTESTED_PUBLISH_SECURITY_DEFINER",
    ],
    [
      "readbackSecurityDefiner",
      false,
      "POSTGRES_READBACK_SECURITY_DEFINER",
    ],
    [
      "functionSearchPathLocked",
      false,
      "POSTGRES_FUNCTION_SEARCH_PATH",
    ],
    ["readbackShapeLocked", false, "POSTGRES_READBACK_SHAPE"],
  ];
  assert.equal(scenarios.length, postgresRuntimeCapabilityEvidenceCheckCodes.length);

  for (const [field, value, expectedFailure] of scenarios) {
    const evidence = await createPostgresRuntimeCapabilityEvidenceProbe(
      policy("api"),
      queryReturning({ ...candidateRow("api"), [field]: value }),
    ).verify();
    assert.deepEqual(evidence.failedChecks, [expectedFailure]);
    assert.equal(evidence.status, "blocked");
    assert.equal(evidence.evaluatedCheckCount, 35);
  }
});

test("requires TLS only outside development and test", async () => {
  for (const runtimeEnvironment of ["development", "test"]) {
    const evidence = await createPostgresRuntimeCapabilityEvidenceProbe(
      policy("api", { runtimeEnvironment }),
      queryReturning({
        ...candidateRow("api"),
        tlsSessionApproved: false,
      }),
    ).verify();
    assert.equal(evidence.status, "candidate");
  }

  for (const runtimeEnvironment of ["staging", "production"]) {
    const evidence = await createPostgresRuntimeCapabilityEvidenceProbe(
      policy("api", { runtimeEnvironment }),
      queryReturning({
        ...candidateRow("api"),
        tlsSessionApproved: false,
      }),
    ).verify();
    assert.deepEqual(evidence.failedChecks, ["POSTGRES_TLS_SESSION"]);
  }
});

test("maps query failure to a sanitized blocked result", async () => {
  const sensitiveValue = "postgresql://role:must-not-leak@host:5432/database";
  const evidence = await createPostgresRuntimeCapabilityEvidenceProbe(
    policy("api"),
    {
      async query() {
        throw new Error(sensitiveValue);
      },
    },
  ).verify();

  assert.deepEqual(evidence, {
    policyVersion: postgresRuntimeCapabilityEvidencePolicyVersion,
    capability: "api",
    status: "blocked",
    activationAllowed: false,
    evaluatedCheckCount: 0,
    totalCheckCount: 35,
    failedChecks: ["POSTGRES_RUNTIME_EVIDENCE_QUERY_FAILED"],
  });
  assert.equal(JSON.stringify(evidence).includes(sensitiveValue), false);
});

test("rejects malformed or hostile query results without inspecting partial data", async () => {
  const baseline = candidateRow("api");
  const accessorRow = { ...baseline };
  Object.defineProperty(accessorRow, "postgres16", {
    enumerable: true,
    get() {
      throw new Error("must-not-run");
    },
  });
  const nonEnumerableRow = { ...baseline };
  Object.defineProperty(nonEnumerableRow, "postgres16", {
    enumerable: false,
    value: true,
  });
  const symbolRow = { ...baseline, [Symbol.for("hidden")]: true };
  const customPrototypeRow = Object.assign(Object.create({ hidden: true }), baseline);
  const sparseRows = [];
  sparseRows.length = 1;
  const trailingSparseRows = [baseline];
  trailingSparseRows.length = 2;
  const resultAccessor = {};
  Object.defineProperty(resultAccessor, "rowCount", {
    enumerable: true,
    get() {
      throw new Error("must-not-run");
    },
  });
  Object.defineProperty(resultAccessor, "rows", {
    enumerable: true,
    value: [baseline],
  });
  const revokedResult = Proxy.revocable(
    { rowCount: 1, rows: [baseline] },
    {},
  );
  revokedResult.revoke();
  const revokedRows = Proxy.revocable([baseline], {});
  revokedRows.revoke();
  const revokedRow = Proxy.revocable(baseline, {});
  revokedRow.revoke();

  const malformedResults = [
    null,
    { rowCount: 0, rows: [] },
    { rowCount: 2, rows: [baseline, baseline] },
    { rowCount: "1", rows: [baseline] },
    { rowCount: 1, rows: [] },
    { rowCount: 1, rows: [baseline], extra: true },
    { rowCount: 1, rows: [{ ...baseline, postgres16: "true" }] },
    { rowCount: 1, rows: [{ ...baseline, extra: true }] },
    { rowCount: 1, rows: [accessorRow] },
    { rowCount: 1, rows: [nonEnumerableRow] },
    { rowCount: 1, rows: [symbolRow] },
    { rowCount: 1, rows: [customPrototypeRow] },
    { rowCount: 1, rows: sparseRows },
    { rowCount: 1, rows: trailingSparseRows },
    { rowCount: 1, rows: [new Proxy(baseline, {})] },
    { rowCount: 1, rows: revokedRows.proxy },
    { rowCount: 1, rows: [revokedRow.proxy] },
    resultAccessor,
    new Proxy({ rowCount: 1, rows: [baseline] }, {}),
  ];

  for (const result of malformedResults) {
    const evidence = await createPostgresRuntimeCapabilityEvidenceProbe(
      policy("api"),
      { async query() { return result; } },
    ).verify();
    assert.deepEqual(evidence.failedChecks, [
      "POSTGRES_RUNTIME_EVIDENCE_RESULT_INVALID",
    ]);
    assert.equal(evidence.evaluatedCheckCount, 0);
  }

  const revokedEvidence = await createPostgresRuntimeCapabilityEvidenceProbe(
    policy("api"),
    { async query() { return revokedResult.proxy; } },
  ).verify();
  assert.deepEqual(revokedEvidence.failedChecks, [
    "POSTGRES_RUNTIME_EVIDENCE_QUERY_FAILED",
  ]);
  assert.equal(revokedEvidence.evaluatedCheckCount, 0);
});

test("rejects non-canonical policies before database access", () => {
  const invalidPolicies = [
    undefined,
    null,
    {},
    policy("owner"),
    policy("api", { runtimeEnvironment: "preview" }),
    policy("api", { expectedDatabaseName: "public.connect" }),
    policy("api", { expectedDatabaseName: "a".repeat(64) }),
    policy("api", { expectedSystemIdentifier: "0" }),
    policy("api", { expectedSystemIdentifier: "01" }),
    policy("api", { expectedSystemIdentifier: (2n ** 64n).toString() }),
    { ...policy("api"), extra: true },
    new Proxy(policy("api"), {}),
    { ...policy("api"), [Symbol.for("hidden")]: true },
    Object.assign(Object.create({ hidden: true }), policy("api")),
  ];
  const accessorPolicy = policy("api");
  Object.defineProperty(accessorPolicy, "expectedSystemIdentifier", {
    enumerable: true,
    get() {
      throw new Error("must-not-run");
    },
  });
  invalidPolicies.push(accessorPolicy);

  let queryCalls = 0;
  const dependencies = {
    async query() {
      queryCalls += 1;
      return { rowCount: 1, rows: [candidateRow("api")] };
    },
  };
  for (const invalidPolicy of invalidPolicies) {
    assert.throws(
      () => createPostgresRuntimeCapabilityEvidenceProbe(
        invalidPolicy,
        dependencies,
      ),
      /evidence policy is invalid/,
    );
  }
  assert.equal(queryCalls, 0);
});

test("rejects hostile dependency containers before verification", () => {
  const query = async () => ({ rowCount: 1, rows: [candidateRow("api")] });
  const queryProxy = new Proxy(query, {});
  const accessor = {};
  Object.defineProperty(accessor, "query", {
    enumerable: true,
    get() {
      throw new Error("must-not-run");
    },
  });
  const invalidDependencies = [
    undefined,
    null,
    {},
    { query: true },
    { query, extra: true },
    { query: queryProxy },
    accessor,
    new Proxy({ query }, {}),
    { query, [Symbol.for("hidden")]: true },
    Object.assign(Object.create({ hidden: true }), { query }),
  ];
  const revokedDependencies = Proxy.revocable({ query }, {});
  revokedDependencies.revoke();
  invalidDependencies.push(revokedDependencies.proxy);

  for (const dependencies of invalidDependencies) {
    assert.throws(
      () => createPostgresRuntimeCapabilityEvidenceProbe(
        policy("api"),
        dependencies,
      ),
      /evidence dependencies are invalid/,
    );
  }
});
