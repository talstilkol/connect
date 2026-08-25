import {
  postgresRuntimeCapabilities,
} from "./postgresRuntimeCapabilityConfiguration.ts";
import {
  postgresRuntimeCapabilityEvidencePolicyVersion,
  postgresRuntimeCapabilityEvidenceResultFieldNames,
  postgresRuntimeCapabilityEvidenceSql,
} from "./postgresRuntimeCapabilityEvidence.ts";

export const postgresRuntimeCapabilityTrustedDriverContractVersion =
  "connect-postgres-runtime-capability-trusted-driver-contract-v1" as const;

export const postgresRuntimeCapabilityTrustedDriverImplementationStatus =
  "contract-only" as const;

export const postgresRuntimeCapabilityTrustedDriverCollectionModes =
  Object.freeze([
    "isolated-one-shot-four-client-job",
    "four-service-signed-attestations",
  ] as const);

export const postgresRuntimeCapabilityTrustedDriverPhaseOrder = Object.freeze([
  "connect",
  "begin-read-only",
  "set-safe-search-path",
  "verify-session",
  "catalog-query",
  "rollback-read-only",
  "close",
] as const);

export const postgresRuntimeCapabilityTrustedDriverStatements = Object.freeze({
  beginReadOnly:
    "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
  setSafeSearchPath:
    "SET LOCAL search_path TO pg_catalog, pg_temp",
  verifySession: [
    "SELECT",
    "  pg_catalog.current_setting('transaction_isolation') =",
    "    'repeatable read' AS \"repeatableRead\",",
    "  pg_catalog.current_setting('transaction_read_only') =",
    "    'on' AS \"readOnly\",",
    "  pg_catalog.current_setting('search_path') =",
    "    'pg_catalog, pg_temp' AS \"searchPathLocked\",",
    "  pg_catalog.current_schemas(TRUE) =",
    "    ARRAY['pg_catalog']::NAME[] AS \"effectiveSchemasLocked\"",
  ].join("\n"),
  catalogQuery: postgresRuntimeCapabilityEvidenceSql,
  rollbackReadOnly: "ROLLBACK",
});

export const postgresRuntimeCapabilityTrustedDriverSessionFieldNames =
  Object.freeze([
    "repeatableRead",
    "readOnly",
    "searchPathLocked",
    "effectiveSchemasLocked",
  ] as const);

function booleanFieldContract(name: string) {
  return Object.freeze({
    name,
    dataTypeID: 16,
    dataTypeSize: 1,
    dataTypeModifier: -1,
    format: "text" as const,
    tableID: 0,
    columnID: 0,
  });
}

export const postgresRuntimeCapabilityTrustedDriverSessionFields =
  Object.freeze(
    postgresRuntimeCapabilityTrustedDriverSessionFieldNames.map(
      booleanFieldContract,
    ),
  );

export const postgresRuntimeCapabilityTrustedDriverExpectedSessionRow =
  Object.freeze([true, true, true, true] as const);

export const postgresRuntimeCapabilityTrustedDriverCatalogFields =
  Object.freeze(
    postgresRuntimeCapabilityEvidenceResultFieldNames.map(
      booleanFieldContract,
    ),
  );

export const postgresRuntimeCapabilityTrustedDriverCatalogParameters =
  Object.freeze([
    Object.freeze({
      position: 1,
      placeholder: "$1",
      source: "expectedDatabaseName",
      derivation: "trusted-request",
    }),
    Object.freeze({
      position: 2,
      placeholder: "$2",
      source: "expectedSystemIdentifier",
      derivation: "signed-out-of-band-binding",
    }),
    Object.freeze({
      position: 3,
      placeholder: "$3",
      source: "expectedLoginRole",
      derivation: "capability-registry",
    }),
  ] as const);

export const postgresRuntimeCapabilityTrustedDriverRequestKeys = Object.freeze([
  "releaseSha",
  "runtimeEnvironment",
  "expectedDatabaseName",
  "expectedSystemIdentifier",
  "evidencePolicyVersion",
  "connectionTimeoutMilliseconds",
  "statementTimeoutMilliseconds",
  "overallDeadlineMilliseconds",
  "cleanupTimeoutMilliseconds",
] as const);

export const postgresRuntimeCapabilityTrustedDriverTimeoutBounds = Object.freeze({
  connectionTimeoutMilliseconds: Object.freeze({
    minimum: 250,
    maximum: 10_000,
  }),
  statementTimeoutMilliseconds: Object.freeze({
    minimum: 100,
    maximum: 15_000,
  }),
  overallDeadlineMilliseconds: Object.freeze({
    minimum: 1_000,
    maximum: 30_000,
  }),
  cleanupTimeoutMilliseconds: Object.freeze({
    minimum: 100,
    maximum: 5_000,
  }),
});

export const postgresRuntimeCapabilityTrustedDriverStartupContract =
  Object.freeze({
    defaultTransactionReadOnly: "on",
    idleInTransactionSessionTimeoutRequired: true,
    tlsHostnameVerificationRequiredInProductionLikeEnvironments: true,
    tlsCertificateAuthorityVerificationRequiredInProductionLikeEnvironments:
      true,
    catalogExtendedProtocolRequired: true,
    catalogParameterCount: 3,
  } as const);

export const postgresRuntimeCapabilityTrustedDriverCleanupContract =
  Object.freeze({
    success: "rollback-then-close",
    timeout: "destroy-client",
    abort: "destroy-client",
    connectTimeout: "destroy-late-client",
    queryFailure: "rollback-then-destroy-client",
    rollbackFailure: "destroy-client",
    closeFailure: "destroy-client-and-block-aggregate",
    cleanupDeadlineRequired: true,
  } as const);

export const postgresRuntimeCapabilityTrustedDriverAggregateContract =
  Object.freeze({
    semantics: "all-or-nothing-bounded-coherence",
    snapshotAtomicityClaimed: false,
    requiredCapabilityCount: postgresRuntimeCapabilities.length,
    capabilityOrder: postgresRuntimeCapabilities,
    evidencePolicyVersion: postgresRuntimeCapabilityEvidencePolicyVersion,
    statusWhenAllCapabilitiesPass: "candidate",
    activationAllowed: false,
    partialResultAllowed: false,
    persistentFourSecretRuntimeAllowed: false,
    selectedCollectionMode: null,
  } as const);

export const postgresRuntimeCapabilityTrustedDriverContract = Object.freeze({
  contractVersion: postgresRuntimeCapabilityTrustedDriverContractVersion,
  implementationStatus:
    postgresRuntimeCapabilityTrustedDriverImplementationStatus,
  runtimeImporterAllowed: false,
  dynamicSqlAllowed: false,
  mutationStatementAllowed: false,
  rawQueryResultAllowed: false,
  rawErrorAllowed: false,
  queryRowMode: "array",
  requiredQueryCommand: "SELECT",
  requiredQueryRowCount: 1,
  clientOwnership: "internal-node-postgres-client",
  oneClientPerCapability: true,
  duplicateClientAllowed: false,
  phaseOrder: postgresRuntimeCapabilityTrustedDriverPhaseOrder,
  statements: postgresRuntimeCapabilityTrustedDriverStatements,
  sessionFields: postgresRuntimeCapabilityTrustedDriverSessionFields,
  expectedSessionRow:
    postgresRuntimeCapabilityTrustedDriverExpectedSessionRow,
  catalogFields: postgresRuntimeCapabilityTrustedDriverCatalogFields,
  catalogParameters:
    postgresRuntimeCapabilityTrustedDriverCatalogParameters,
  requestKeys: postgresRuntimeCapabilityTrustedDriverRequestKeys,
  timeoutBounds: postgresRuntimeCapabilityTrustedDriverTimeoutBounds,
  startup: postgresRuntimeCapabilityTrustedDriverStartupContract,
  cleanup: postgresRuntimeCapabilityTrustedDriverCleanupContract,
  collectionModes:
    postgresRuntimeCapabilityTrustedDriverCollectionModes,
  aggregate: postgresRuntimeCapabilityTrustedDriverAggregateContract,
});
