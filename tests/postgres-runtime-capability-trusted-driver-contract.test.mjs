import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  postgresRuntimeCapabilityTrustedDriverAggregateContract,
  postgresRuntimeCapabilityTrustedDriverCatalogParameters,
  postgresRuntimeCapabilityTrustedDriverCatalogFields,
  postgresRuntimeCapabilityTrustedDriverCleanupContract,
  postgresRuntimeCapabilityTrustedDriverCollectionModes,
  postgresRuntimeCapabilityTrustedDriverContract,
  postgresRuntimeCapabilityTrustedDriverContractVersion,
  postgresRuntimeCapabilityTrustedDriverExpectedSessionRow,
  postgresRuntimeCapabilityTrustedDriverImplementationStatus,
  postgresRuntimeCapabilityTrustedDriverPhaseOrder,
  postgresRuntimeCapabilityTrustedDriverRequestKeys,
  postgresRuntimeCapabilityTrustedDriverSessionFields,
  postgresRuntimeCapabilityTrustedDriverSessionFieldNames,
  postgresRuntimeCapabilityTrustedDriverStartupContract,
  postgresRuntimeCapabilityTrustedDriverStatements,
  postgresRuntimeCapabilityTrustedDriverTimeoutBounds,
} from "../server/platform/postgresRuntimeCapabilityTrustedDriverContract.ts";
import {
  postgresRuntimeCapabilities,
} from "../server/platform/postgresRuntimeCapabilityConfiguration.ts";
import {
  postgresRuntimeCapabilityEvidencePolicyVersion,
  postgresRuntimeCapabilityEvidenceResultFieldNames,
  postgresRuntimeCapabilityEvidenceSql,
} from "../server/platform/postgresRuntimeCapabilityEvidence.ts";

function assertDeepFrozen(value, visited = new Set()) {
  if (value === null || typeof value !== "object" || visited.has(value)) {
    return;
  }
  visited.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const descriptor of Object.values(
    Object.getOwnPropertyDescriptors(value),
  )) {
    if ("value" in descriptor) assertDeepFrozen(descriptor.value, visited);
  }
}

test("publishes one immutable dormant trusted-driver contract", () => {
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverContractVersion,
    "connect-postgres-runtime-capability-trusted-driver-contract-v1",
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverImplementationStatus,
    "contract-only",
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverContract.runtimeImporterAllowed,
    false,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverContract.clientOwnership,
    "internal-node-postgres-client",
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverContract.oneClientPerCapability,
    true,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverContract.duplicateClientAllowed,
    false,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverContract.queryRowMode,
    "array",
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverContract.requiredQueryCommand,
    "SELECT",
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverContract.requiredQueryRowCount,
    1,
  );
  assertDeepFrozen(postgresRuntimeCapabilityTrustedDriverContract);
});

test("pins the exact read-only session sequence without public search path", () => {
  assert.deepEqual(postgresRuntimeCapabilityTrustedDriverPhaseOrder, [
    "connect",
    "begin-read-only",
    "set-safe-search-path",
    "verify-session",
    "catalog-query",
    "rollback-read-only",
    "close",
  ]);
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverStatements.beginReadOnly,
    "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverStatements.setSafeSearchPath,
    "SET LOCAL search_path TO pg_catalog, pg_temp",
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverStatements.catalogQuery,
    postgresRuntimeCapabilityEvidenceSql,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverStatements.rollbackReadOnly,
    "ROLLBACK",
  );
  assert.match(
    postgresRuntimeCapabilityTrustedDriverStatements.verifySession,
    /transaction_isolation[\s\S]*repeatable read/,
  );
  assert.match(
    postgresRuntimeCapabilityTrustedDriverStatements.verifySession,
    /transaction_read_only[\s\S]*'on'/,
  );
  assert.match(
    postgresRuntimeCapabilityTrustedDriverStatements.verifySession,
    /search_path[\s\S]*pg_catalog, pg_temp/,
  );
  assert.doesNotMatch(
    postgresRuntimeCapabilityTrustedDriverStatements.setSafeSearchPath,
    /public/i,
  );

  const allStatements = [
    postgresRuntimeCapabilityTrustedDriverStatements.beginReadOnly,
    postgresRuntimeCapabilityTrustedDriverStatements.setSafeSearchPath,
    postgresRuntimeCapabilityTrustedDriverStatements.verifySession,
    postgresRuntimeCapabilityTrustedDriverStatements.rollbackReadOnly,
  ].join("\n");
  assert.doesNotMatch(allStatements, /\bCOMMIT\b/i);
  assert.doesNotMatch(
    allStatements,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE)\b/i,
  );
});

test("pins every node-postgres field name, order, OID, and format", () => {
  assert.equal(postgresRuntimeCapabilityTrustedDriverCatalogFields.length, 35);
  assert.deepEqual(
    postgresRuntimeCapabilityTrustedDriverCatalogFields.map(
      (field) => field.name,
    ),
    postgresRuntimeCapabilityEvidenceResultFieldNames,
  );
  assert.equal(
    new Set(postgresRuntimeCapabilityEvidenceResultFieldNames).size,
    postgresRuntimeCapabilityEvidenceResultFieldNames.length,
  );
  assert.deepEqual(
    postgresRuntimeCapabilityTrustedDriverSessionFields.map(
      (field) => field.name,
    ),
    postgresRuntimeCapabilityTrustedDriverSessionFieldNames,
  );
  assert.deepEqual(
    postgresRuntimeCapabilityTrustedDriverExpectedSessionRow,
    [true, true, true, true],
  );
  assert.equal(
    Object.isFrozen(postgresRuntimeCapabilityTrustedDriverExpectedSessionRow),
    true,
  );

  for (const field of [
    ...postgresRuntimeCapabilityTrustedDriverSessionFields,
    ...postgresRuntimeCapabilityTrustedDriverCatalogFields,
  ]) {
    assert.deepEqual(field, {
      name: field.name,
      dataTypeID: 16,
      dataTypeSize: 1,
      dataTypeModifier: -1,
      format: "text",
      tableID: 0,
      columnID: 0,
    });
    assert.equal(Object.isFrozen(field), true);
  }
});

test("pins the exact extended-protocol catalog parameter order", () => {
  assert.deepEqual(postgresRuntimeCapabilityTrustedDriverCatalogParameters, [
    {
      position: 1,
      placeholder: "$1",
      source: "expectedDatabaseName",
      derivation: "trusted-request",
    },
    {
      position: 2,
      placeholder: "$2",
      source: "expectedSystemIdentifier",
      derivation: "signed-out-of-band-binding",
    },
    {
      position: 3,
      placeholder: "$3",
      source: "expectedLoginRole",
      derivation: "capability-registry",
    },
  ]);
  for (const parameter of postgresRuntimeCapabilityTrustedDriverCatalogParameters) {
    assert.equal(Object.isFrozen(parameter), true);
  }
});

test("requires an all-or-nothing four-capability candidate", () => {
  assert.deepEqual(
    postgresRuntimeCapabilityTrustedDriverAggregateContract.capabilityOrder,
    ["api", "worker", "verifier", "migration"],
  );
  assert.deepEqual(
    postgresRuntimeCapabilityTrustedDriverAggregateContract.capabilityOrder,
    postgresRuntimeCapabilities,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverAggregateContract
      .requiredCapabilityCount,
    4,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverAggregateContract
      .evidencePolicyVersion,
    postgresRuntimeCapabilityEvidencePolicyVersion,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverAggregateContract.semantics,
    "all-or-nothing-bounded-coherence",
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverAggregateContract
      .snapshotAtomicityClaimed,
    false,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverAggregateContract
      .statusWhenAllCapabilitiesPass,
    "candidate",
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverAggregateContract
      .activationAllowed,
    false,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverAggregateContract
      .partialResultAllowed,
    false,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverAggregateContract
      .persistentFourSecretRuntimeAllowed,
    false,
  );
  assert.equal(
    postgresRuntimeCapabilityTrustedDriverAggregateContract
      .selectedCollectionMode,
    null,
  );
  assert.deepEqual(postgresRuntimeCapabilityTrustedDriverCollectionModes, [
    "isolated-one-shot-four-client-job",
    "four-service-signed-attestations",
  ]);
});

test("bounds execution metadata and requires destructive timeout cleanup", () => {
  assert.deepEqual(postgresRuntimeCapabilityTrustedDriverRequestKeys, [
    "releaseSha",
    "runtimeEnvironment",
    "expectedDatabaseName",
    "expectedSystemIdentifier",
    "evidencePolicyVersion",
    "connectionTimeoutMilliseconds",
    "statementTimeoutMilliseconds",
    "overallDeadlineMilliseconds",
    "cleanupTimeoutMilliseconds",
  ]);
  assert.deepEqual(postgresRuntimeCapabilityTrustedDriverTimeoutBounds, {
    connectionTimeoutMilliseconds: { minimum: 250, maximum: 10_000 },
    statementTimeoutMilliseconds: { minimum: 100, maximum: 15_000 },
    overallDeadlineMilliseconds: { minimum: 1_000, maximum: 30_000 },
    cleanupTimeoutMilliseconds: { minimum: 100, maximum: 5_000 },
  });
  assert.deepEqual(postgresRuntimeCapabilityTrustedDriverStartupContract, {
    defaultTransactionReadOnly: "on",
    idleInTransactionSessionTimeoutRequired: true,
    tlsHostnameVerificationRequiredInProductionLikeEnvironments: true,
    tlsCertificateAuthorityVerificationRequiredInProductionLikeEnvironments:
      true,
    catalogExtendedProtocolRequired: true,
    catalogParameterCount: 3,
  });
  assert.deepEqual(postgresRuntimeCapabilityTrustedDriverCleanupContract, {
    success: "rollback-then-close",
    timeout: "destroy-client",
    abort: "destroy-client",
    connectTimeout: "destroy-late-client",
    queryFailure: "rollback-then-destroy-client",
    rollbackFailure: "destroy-client",
    closeFailure: "destroy-client-and-block-aggregate",
    cleanupDeadlineRequired: true,
  });
});

test("contains no secret reader, runtime adapter, activation seam, or randomness", async () => {
  const source = await readFile(
    new URL(
      "../server/platform/postgresRuntimeCapabilityTrustedDriverContract.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /DATABASE_URL/);
  assert.doesNotMatch(source, /POSTGRES_(?:API|WORKER|VERIFIER|MIGRATION)_URL/);
  assert.doesNotMatch(source, /from ["']pg["']/);
  assert.doesNotMatch(source, /Math\.random|randomUUID/);
  assert.doesNotMatch(source, /activationAllowed:\s*true/);
  assert.match(source, /activationAllowed:\s*false/);
  assert.match(
    source,
    /TrustedDriverImplementationStatus[\s\S]*"contract-only"/,
  );
  assert.match(source, /implementationStatus:/);
});
