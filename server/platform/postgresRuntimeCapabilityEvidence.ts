import { types as nodeUtilTypes } from "node:util";

import {
  postgresMigrationOwnerRole,
  postgresRuntimeCapabilities,
  postgresRuntimeCapabilityLoginRoles,
  type PostgresRuntimeCapability,
} from "./postgresRuntimeCapabilityConfiguration.ts";

export const postgresRuntimeCapabilityEvidencePolicyVersion =
  "connect-postgres-runtime-capability-evidence-v1" as const;

export const postgresRuntimeCapabilityEvidenceCheckCodes = Object.freeze([
  "POSTGRES_VERSION_16",
  "POSTGRES_PRIMARY_SERVER",
  "POSTGRES_DATABASE_NAME",
  "POSTGRES_CLUSTER_SYSTEM_IDENTIFIER",
  "POSTGRES_TLS_SESSION",
  "POSTGRES_SESSION_ROLE",
  "POSTGRES_CURRENT_ROLE",
  "POSTGRES_LOGIN_ROLE_ATTRIBUTES",
  "POSTGRES_MIGRATION_OWNER_ATTRIBUTES",
  "POSTGRES_MIGRATION_OWNER_MEMBERSHIP",
  "POSTGRES_MIGRATION_OWNER_SET_ROLE",
  "POSTGRES_MIGRATION_OWNER_NO_INHERIT",
  "POSTGRES_PROTECTED_ROLE_TOPOLOGY",
  "POSTGRES_MIGRATION_OWNER_DEFAULT_ACL",
  "POSTGRES_DATABASE_CONNECT",
  "POSTGRES_DATABASE_CREATE_BLOCKED",
  "POSTGRES_DATABASE_TEMPORARY_BLOCKED",
  "POSTGRES_PUBLIC_SCHEMA_USAGE",
  "POSTGRES_PUBLIC_SCHEMA_CREATE_BLOCKED",
  "POSTGRES_SEARCH_PATH",
  "POSTGRES_PROTECTED_TABLES_EXIST",
  "POSTGRES_PROTECTED_TABLE_OWNERSHIP",
  "POSTGRES_PROTECTED_TABLE_ACL",
  "POSTGRES_PROTECTED_TABLE_ACCESS_BLOCKED",
  "POSTGRES_PROTECTED_FUNCTIONS_EXIST",
  "POSTGRES_PROTECTED_FUNCTION_OWNERSHIP",
  "POSTGRES_PROTECTED_FUNCTION_ACL",
  "POSTGRES_INTERNAL_FUNCTION_EXECUTE_BLOCKED",
  "POSTGRES_ATTESTED_PUBLISH_EXECUTE",
  "POSTGRES_READBACK_EXECUTE",
  "POSTGRES_PUBLIC_FUNCTION_EXECUTE_BLOCKED",
  "POSTGRES_ATTESTED_PUBLISH_SECURITY_DEFINER",
  "POSTGRES_READBACK_SECURITY_DEFINER",
  "POSTGRES_FUNCTION_SEARCH_PATH",
  "POSTGRES_READBACK_SHAPE",
] as const);

export type PostgresRuntimeCapabilityEvidenceCheckCode =
  (typeof postgresRuntimeCapabilityEvidenceCheckCodes)[number];

export type PostgresRuntimeCapabilityEvidenceFailureCode =
  | PostgresRuntimeCapabilityEvidenceCheckCode
  | "POSTGRES_RUNTIME_EVIDENCE_QUERY_FAILED"
  | "POSTGRES_RUNTIME_EVIDENCE_RESULT_INVALID";

type RuntimeEnvironment =
  | "development"
  | "test"
  | "staging"
  | "production";

export interface PostgresRuntimeCapabilityEvidencePolicy {
  readonly capability: PostgresRuntimeCapability;
  readonly runtimeEnvironment: RuntimeEnvironment;
  readonly expectedDatabaseName: string;
  readonly expectedSystemIdentifier: string;
}

export interface PostgresRuntimeCapabilityEvidence {
  readonly policyVersion:
    typeof postgresRuntimeCapabilityEvidencePolicyVersion;
  readonly capability: PostgresRuntimeCapability;
  readonly status: "candidate" | "blocked";
  readonly activationAllowed: false;
  readonly evaluatedCheckCount: number;
  readonly totalCheckCount: number;
  readonly failedChecks:
    readonly PostgresRuntimeCapabilityEvidenceFailureCode[];
}

export interface PostgresRuntimeCapabilityEvidenceDependencies {
  readonly query: (
    sql: string,
    parameters: readonly [string, string, string],
  ) => Promise<unknown>;
}

export interface PostgresRuntimeCapabilityEvidenceProbe {
  verify(): Promise<Readonly<PostgresRuntimeCapabilityEvidence>>;
}

const unsignedBigintMaximum = "18446744073709551615";
const databaseNamePattern = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,62}$/;
const systemIdentifierPattern = /^(?:[1-9][0-9]{0,19})$/;
const policyKeys = Object.freeze([
  "capability",
  "runtimeEnvironment",
  "expectedDatabaseName",
  "expectedSystemIdentifier",
]);
const dependencyKeys = Object.freeze(["query"]);
const resultKeys = Object.freeze(["rowCount", "rows"]);
export const postgresRuntimeCapabilityEvidenceResultFieldNames = Object.freeze([
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
] as const);
const resultRowKeys: readonly string[] =
  postgresRuntimeCapabilityEvidenceResultFieldNames;
const runtimeEnvironments: readonly RuntimeEnvironment[] = Object.freeze([
  "development",
  "test",
  "staging",
  "production",
]);

export const postgresRuntimeCapabilityEvidenceSql = `
  WITH expected AS (
    SELECT
      $1::TEXT AS expected_database_name,
      $2::TEXT AS expected_system_identifier,
      $3::TEXT AS expected_login_role
  ),
  runtime_role AS (
    SELECT role_catalog.*
    FROM pg_catalog.pg_roles AS role_catalog
    CROSS JOIN expected
    WHERE role_catalog.rolname = expected.expected_login_role
  ),
  migration_owner AS (
    SELECT role_catalog.*
    FROM pg_catalog.pg_roles AS role_catalog
    WHERE role_catalog.rolname = 'connect_migration_owner'
  ),
  protected_roles AS (
    SELECT role_catalog.oid, role_catalog.rolname
    FROM pg_catalog.pg_roles AS role_catalog
    WHERE role_catalog.rolname IN (
      'connect_migration_owner',
      'connect_migrator_login',
      'connect_api_runtime',
      'connect_worker_runtime',
      'connect_verifier_runtime'
    )
  ),
  protected_role_topology AS (
    SELECT
      (SELECT pg_catalog.count(*) = 5 FROM protected_roles)
      AND pg_catalog.count(membership.oid) = 1
      AND COALESCE(
        pg_catalog.bool_and(
          granted_role.rolname = 'connect_migration_owner'
          AND member_role.rolname = 'connect_migrator_login'
          AND NOT membership.admin_option
          AND NOT membership.inherit_option
          AND membership.set_option
        ),
        FALSE
      ) AS protected_role_topology_locked
    FROM pg_catalog.pg_auth_members AS membership
    INNER JOIN pg_catalog.pg_roles AS granted_role
      ON granted_role.oid = membership.roleid
    INNER JOIN pg_catalog.pg_roles AS member_role
      ON member_role.oid = membership.member
    WHERE membership.roleid IN (SELECT oid FROM protected_roles)
       OR membership.member IN (SELECT oid FROM protected_roles)
  ),
  migration_owner_default_acl AS (
    SELECT
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_default_acl AS global_function_default
        WHERE global_function_default.defaclrole = migration_owner.oid
          AND global_function_default.defaclobjtype = 'f'
          AND global_function_default.defaclnamespace = 0
          AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.aclexplode(
              global_function_default.defaclacl
            ) AS default_privilege
            WHERE default_privilege.grantee <> migration_owner.oid
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_default_acl AS owner_default
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          owner_default.defaclacl
        ) AS default_privilege
        WHERE owner_default.defaclrole = migration_owner.oid
          AND default_privilege.grantee <> migration_owner.oid
      ) AS migration_owner_default_acl_locked
    FROM migration_owner
  ),
  protected_table_names (object_name) AS (
    VALUES
      ('bot_reply_staging_runs'::TEXT),
      ('bot_reply_staging_attestation_nonces'::TEXT),
      ('bot_reply_staging_release_evidence'::TEXT),
      ('bot_reply_staging_release_evidence_operator_events'::TEXT)
  ),
  protected_tables AS (
    SELECT
      protected_table_names.object_name,
      table_catalog.oid,
      table_catalog.relacl,
      table_catalog.relowner,
      table_owner.rolname AS owner_name
    FROM protected_table_names
    LEFT JOIN pg_catalog.pg_namespace AS namespace_catalog
      ON namespace_catalog.nspname = 'public'
    LEFT JOIN pg_catalog.pg_class AS table_catalog
      ON table_catalog.relnamespace = namespace_catalog.oid
     AND table_catalog.relname = protected_table_names.object_name
     AND table_catalog.relkind IN ('r', 'p')
    LEFT JOIN pg_catalog.pg_roles AS table_owner
      ON table_owner.oid = table_catalog.relowner
  ),
  protected_table_contract AS (
    SELECT
      pg_catalog.count(oid) = 4
        AS protected_tables_exist,
      COALESCE(
        pg_catalog.bool_and(
          owner_name = 'connect_migration_owner'
        ) FILTER (WHERE oid IS NOT NULL),
        FALSE
      ) AS protected_tables_owned_by_migration_owner,
      NOT EXISTS (
        SELECT 1
        FROM protected_tables AS acl_table
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(
            acl_table.relacl,
            pg_catalog.acldefault('r', acl_table.relowner)
          )
        ) AS table_privilege
        WHERE acl_table.oid IS NOT NULL
          AND table_privilege.grantee <> acl_table.relowner
      )
      AND NOT EXISTS (
        SELECT 1
        FROM protected_tables AS acl_table
        INNER JOIN pg_catalog.pg_attribute AS column_catalog
          ON column_catalog.attrelid = acl_table.oid
         AND column_catalog.attnum > 0
         AND NOT column_catalog.attisdropped
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          column_catalog.attacl
        ) AS column_privilege
        WHERE column_privilege.grantee <> acl_table.relowner
      ) AS protected_table_acl_locked,
      COALESCE(
        pg_catalog.bool_or(
          pg_catalog.has_table_privilege(
            current_user,
            oid,
            'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
          )
          OR pg_catalog.has_any_column_privilege(
            current_user,
            oid,
            'SELECT,INSERT,UPDATE,REFERENCES'
          )
        ) FILTER (WHERE oid IS NOT NULL),
        FALSE
      ) AS protected_table_access
    FROM protected_tables
  ),
  protected_function_names (signature, function_kind) AS (
    VALUES
      (
        'public.publish_bot_reply_staging_release_evidence_with_operator_audit(text,text,text,text,text,text,integer,text,text,text,timestamptz,timestamptz)'::TEXT,
        'internal'::TEXT
      ),
      (
        'public.initialize_publish_bot_reply_staging_evidence_with_audit(text,text,text,text,text,text,integer,text,text,text,timestamptz,timestamptz)'::TEXT,
        'internal'::TEXT
      ),
      (
        'public.consume_bot_reply_staging_attestation_nonce(text,text,text,integer,text,text,text,text,integer,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,text)'::TEXT,
        'internal'::TEXT
      ),
      (
        'public.guard_bot_reply_staging_attestation_nonce_insert()'::TEXT,
        'guard'::TEXT
      ),
      (
        'public.reject_bot_reply_staging_attestation_nonce_mutation()'::TEXT,
        'guard'::TEXT
      ),
      (
        'public.enforce_bot_reply_staging_release_evidence_operator_insert()'::TEXT,
        'guard'::TEXT
      ),
      (
        'public.reject_bot_reply_staging_release_evidence_operator_mutation()'::TEXT,
        'guard'::TEXT
      ),
      (
        'public.publish_bot_reply_staging_attested_evidence_with_audit(text,text,text,integer,text,text,text,text,integer,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,text,text,text,text,text,text,text,timestamptz,timestamptz)'::TEXT,
        'attested-publish'::TEXT
      ),
      (
        'public.read_bot_reply_staging_attested_release_evidence_v1(text,text,text)'::TEXT,
        'readback'::TEXT
      )
  ),
  protected_functions AS (
    SELECT
      protected_function_names.function_kind,
      function_catalog.oid,
      function_catalog.prosecdef,
      function_catalog.proisstrict,
      function_catalog.provolatile,
      function_catalog.proparallel,
      function_catalog.prorows,
      function_catalog.proconfig,
      function_catalog.proacl,
      function_catalog.proowner,
      function_owner.rolname AS owner_name
    FROM protected_function_names
    LEFT JOIN pg_catalog.pg_proc AS function_catalog
      ON function_catalog.oid = pg_catalog.to_regprocedure(
        protected_function_names.signature
      )
    LEFT JOIN pg_catalog.pg_roles AS function_owner
      ON function_owner.oid = function_catalog.proowner
  ),
  protected_function_contract AS (
    SELECT
      pg_catalog.count(oid) = 9 AS protected_functions_exist,
      COALESCE(
        pg_catalog.bool_and(owner_name = 'connect_migration_owner')
          FILTER (WHERE oid IS NOT NULL),
        FALSE
      ) AS protected_functions_owned_by_migration_owner,
      NOT EXISTS (
        SELECT 1
        FROM protected_functions AS acl_function
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(
            acl_function.proacl,
            pg_catalog.acldefault('f', acl_function.proowner)
          )
        ) AS function_privilege
        WHERE acl_function.oid IS NOT NULL
          AND (
            function_privilege.privilege_type <> 'EXECUTE'
            OR function_privilege.grantor <> acl_function.proowner
            OR (
              function_privilege.grantee <> acl_function.proowner
              AND function_privilege.is_grantable
            )
            OR (
              acl_function.function_kind IN ('internal', 'guard')
              AND function_privilege.grantee <> acl_function.proowner
            )
            OR (
              acl_function.function_kind IN ('attested-publish', 'readback')
              AND function_privilege.grantee NOT IN (
                acl_function.proowner,
                (
                  SELECT protected_roles.oid
                  FROM protected_roles
                  WHERE protected_roles.rolname =
                    'connect_verifier_runtime'
                )
              )
            )
          )
      )
      AND (
        SELECT pg_catalog.count(*)
        FROM protected_functions AS verifier_function
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(
            verifier_function.proacl,
            pg_catalog.acldefault('f', verifier_function.proowner)
          )
        ) AS verifier_privilege
        WHERE verifier_function.function_kind IN (
          'attested-publish',
          'readback'
        )
          AND verifier_privilege.grantee = (
            SELECT protected_roles.oid
            FROM protected_roles
            WHERE protected_roles.rolname = 'connect_verifier_runtime'
          )
          AND verifier_privilege.privilege_type = 'EXECUTE'
      ) = 2 AS protected_function_acl_locked,
      COALESCE(
        pg_catalog.bool_or(
          pg_catalog.has_function_privilege(
            current_user,
            oid,
            'EXECUTE'
          )
        ) FILTER (
          WHERE function_kind IN ('internal', 'guard')
            AND oid IS NOT NULL
        ),
        FALSE
      ) AS internal_function_execute,
      COALESCE(
        pg_catalog.bool_or(
          pg_catalog.has_function_privilege(
            current_user,
            oid,
            'EXECUTE'
          )
        ) FILTER (
          WHERE function_kind = 'attested-publish' AND oid IS NOT NULL
        ),
        FALSE
      ) AS attested_publish_execute,
      COALESCE(
        pg_catalog.bool_or(
          pg_catalog.has_function_privilege(
            current_user,
            oid,
            'EXECUTE'
          )
        ) FILTER (WHERE function_kind = 'readback' AND oid IS NOT NULL),
        FALSE
      ) AS readback_execute,
      COALESCE(
        (
          SELECT pg_catalog.bool_or(
            public_privilege.privilege_type = 'EXECUTE'
          )
          FROM protected_functions AS public_function
          CROSS JOIN LATERAL pg_catalog.aclexplode(
            COALESCE(
              public_function.proacl,
              pg_catalog.acldefault(
                'f',
                public_function.proowner
              )
            )
          ) AS public_privilege
          WHERE public_function.oid IS NOT NULL
            AND public_privilege.grantee = 0
        ),
        FALSE
      ) AS public_protected_function_execute,
      COALESCE(
        pg_catalog.bool_and(prosecdef)
          FILTER (
            WHERE function_kind = 'attested-publish' AND oid IS NOT NULL
          ),
        FALSE
      ) AS attested_publish_security_definer,
      COALESCE(
        pg_catalog.bool_and(prosecdef)
          FILTER (WHERE function_kind = 'readback' AND oid IS NOT NULL),
        FALSE
      ) AS readback_security_definer,
      COALESCE(
        pg_catalog.bool_and(
          proconfig = ARRAY[
            'search_path=pg_catalog, pg_temp'
          ]::TEXT[]
        ) FILTER (WHERE oid IS NOT NULL),
        FALSE
      ) AS function_search_path_locked,
      COALESCE(
        pg_catalog.bool_and(
          proisstrict
          AND provolatile = 'v'
          AND proparallel = 'u'
          AND prorows = 2
        ) FILTER (WHERE function_kind = 'readback' AND oid IS NOT NULL),
        FALSE
      ) AS readback_shape_locked
    FROM protected_functions
  )
  SELECT
    pg_catalog.current_setting('server_version_num')::INTEGER
      BETWEEN 160000 AND 169999 AS "postgres16",
    NOT pg_catalog.pg_is_in_recovery() AS "primaryServer",
    pg_catalog.current_database()::TEXT = expected.expected_database_name
      AS "databaseNameMatches",
    (
      (pg_catalog.pg_control_system()).system_identifier::TEXT =
        expected.expected_system_identifier
    ) AS "systemIdentifierMatches",
    COALESCE(
      (
        SELECT
          ssl_catalog.ssl
          AND ssl_catalog.version IN ('TLSv1.2', 'TLSv1.3')
          AND ssl_catalog.bits >= 128
        FROM pg_catalog.pg_stat_ssl AS ssl_catalog
        WHERE ssl_catalog.pid = pg_catalog.pg_backend_pid()
      ),
      FALSE
    ) AS "tlsSessionApproved",
    session_user::TEXT = expected.expected_login_role
      AS "sessionRoleMatches",
    current_user::TEXT = expected.expected_login_role
      AS "currentRoleMatches",
    runtime_role.rolcanlogin
      AND NOT runtime_role.rolsuper
      AND NOT runtime_role.rolinherit
      AND NOT runtime_role.rolcreaterole
      AND NOT runtime_role.rolcreatedb
      AND NOT runtime_role.rolreplication
      AND NOT runtime_role.rolbypassrls
      AS "loginRoleLeastPrivilege",
    NOT migration_owner.rolcanlogin
      AND NOT migration_owner.rolsuper
      AND NOT migration_owner.rolinherit
      AND NOT migration_owner.rolcreaterole
      AND NOT migration_owner.rolcreatedb
      AND NOT migration_owner.rolreplication
      AND NOT migration_owner.rolbypassrls
      AS "migrationOwnerLeastPrivilege",
    pg_catalog.pg_has_role(
      current_user,
      migration_owner.oid,
      'MEMBER'
    ) AS "migrationOwnerMember",
    pg_catalog.pg_has_role(
      current_user,
      migration_owner.oid,
      'SET'
    ) AS "migrationOwnerSettable",
    pg_catalog.pg_has_role(
      current_user,
      migration_owner.oid,
      'USAGE'
    ) AS "migrationOwnerInherited",
    protected_role_topology.protected_role_topology_locked
      AS "protectedRoleTopologyLocked",
    migration_owner_default_acl.migration_owner_default_acl_locked
      AS "migrationOwnerDefaultAclLocked",
    pg_catalog.has_database_privilege(
      current_user,
      pg_catalog.current_database(),
      'CONNECT'
    ) AS "databaseConnect",
    NOT pg_catalog.has_database_privilege(
      current_user,
      pg_catalog.current_database(),
      'CREATE'
    ) AS "databaseCreateBlocked",
    NOT pg_catalog.has_database_privilege(
      current_user,
      pg_catalog.current_database(),
      'TEMPORARY'
    ) AS "databaseTemporaryBlocked",
    pg_catalog.has_schema_privilege(
      current_user,
      'public',
      'USAGE'
    ) AS "publicSchemaUsage",
    NOT pg_catalog.has_schema_privilege(
      current_user,
      'public',
      'CREATE'
    )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_namespace AS public_schema
        INNER JOIN pg_catalog.pg_roles AS public_schema_owner
          ON public_schema_owner.oid = public_schema.nspowner
        WHERE public_schema.nspname = 'public'
          AND (
            public_schema_owner.rolname <>
              'connect_migration_owner'
            OR EXISTS (
              SELECT 1
              FROM pg_catalog.aclexplode(
                COALESCE(
                  public_schema.nspacl,
                  pg_catalog.acldefault('n', public_schema.nspowner)
                )
              ) AS public_schema_privilege
              WHERE public_schema_privilege.privilege_type = 'CREATE'
                AND public_schema_privilege.grantee <>
                  public_schema.nspowner
            )
          )
      ) AS "publicSchemaCreateBlocked",
    pg_catalog.current_setting('search_path') =
      'pg_catalog, pg_temp'
      AND pg_catalog.current_schemas(TRUE) =
        ARRAY['pg_catalog']::NAME[] AS "searchPathLocked",
    protected_table_contract.protected_tables_exist
      AS "protectedTablesExist",
    protected_table_contract.protected_tables_owned_by_migration_owner
      AS "protectedTablesOwnedByMigrationOwner",
    protected_table_contract.protected_table_acl_locked
      AS "protectedTableAclLocked",
    protected_table_contract.protected_table_access
      AS "protectedTableAccess",
    protected_function_contract.protected_functions_exist
      AS "protectedFunctionsExist",
    protected_function_contract.protected_functions_owned_by_migration_owner
      AS "protectedFunctionsOwnedByMigrationOwner",
    protected_function_contract.protected_function_acl_locked
      AS "protectedFunctionAclLocked",
    protected_function_contract.internal_function_execute
      AS "internalFunctionExecute",
    protected_function_contract.attested_publish_execute
      AS "attestedPublishExecute",
    protected_function_contract.readback_execute
      AS "readbackExecute",
    protected_function_contract.public_protected_function_execute
      AS "publicProtectedFunctionExecute",
    protected_function_contract.attested_publish_security_definer
      AS "attestedPublishSecurityDefiner",
    protected_function_contract.readback_security_definer
      AS "readbackSecurityDefiner",
    protected_function_contract.function_search_path_locked
      AS "functionSearchPathLocked",
    protected_function_contract.readback_shape_locked
      AS "readbackShapeLocked"
  FROM expected
  CROSS JOIN runtime_role
  CROSS JOIN migration_owner
  CROSS JOIN protected_role_topology
  CROSS JOIN migration_owner_default_acl
  CROSS JOIN protected_table_contract
  CROSS JOIN protected_function_contract
`;

interface PostgresRuntimeCapabilityEvidenceRow {
  readonly postgres16: boolean;
  readonly primaryServer: boolean;
  readonly databaseNameMatches: boolean;
  readonly systemIdentifierMatches: boolean;
  readonly tlsSessionApproved: boolean;
  readonly sessionRoleMatches: boolean;
  readonly currentRoleMatches: boolean;
  readonly loginRoleLeastPrivilege: boolean;
  readonly migrationOwnerLeastPrivilege: boolean;
  readonly migrationOwnerMember: boolean;
  readonly migrationOwnerSettable: boolean;
  readonly migrationOwnerInherited: boolean;
  readonly protectedRoleTopologyLocked: boolean;
  readonly migrationOwnerDefaultAclLocked: boolean;
  readonly databaseConnect: boolean;
  readonly databaseCreateBlocked: boolean;
  readonly databaseTemporaryBlocked: boolean;
  readonly publicSchemaUsage: boolean;
  readonly publicSchemaCreateBlocked: boolean;
  readonly searchPathLocked: boolean;
  readonly protectedTablesExist: boolean;
  readonly protectedTablesOwnedByMigrationOwner: boolean;
  readonly protectedTableAclLocked: boolean;
  readonly protectedTableAccess: boolean;
  readonly protectedFunctionsExist: boolean;
  readonly protectedFunctionsOwnedByMigrationOwner: boolean;
  readonly protectedFunctionAclLocked: boolean;
  readonly internalFunctionExecute: boolean;
  readonly attestedPublishExecute: boolean;
  readonly readbackExecute: boolean;
  readonly publicProtectedFunctionExecute: boolean;
  readonly attestedPublishSecurityDefiner: boolean;
  readonly readbackSecurityDefiner: boolean;
  readonly functionSearchPathLocked: boolean;
  readonly readbackShapeLocked: boolean;
}

function snapshotDataRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" || value === null ||
    nodeUtilTypes.isProxy(value) || Array.isArray(value)
  ) {
    return null;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of ownKeys as string[]) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      Object.defineProperty(snapshot, key, {
        configurable: false,
        enumerable: true,
        value: descriptor.value,
        writable: false,
      });
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function snapshotExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  const snapshot = snapshotDataRecord(value);
  if (snapshot === null) return null;
  const actualKeys = Object.keys(snapshot).sort();
  const normalizedExpectedKeys = [...expectedKeys].sort();
  return actualKeys.length === normalizedExpectedKeys.length &&
      actualKeys.every(
        (key, index) => key === normalizedExpectedKeys[index],
      )
    ? snapshot
    : null;
}

function snapshotDenseArray(
  value: unknown,
  expectedLength: number,
): readonly unknown[] | null {
  if (
    nodeUtilTypes.isProxy(value) || !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    return null;
  }
  try {
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== expectedLength + 1 || !ownKeys.includes("length") ||
      ownKeys.some((key) => typeof key !== "string")
    ) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const lengthDescriptor = descriptors.length;
    if (
      lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
      lengthDescriptor.value !== expectedLength ||
      lengthDescriptor.enumerable !== false ||
      lengthDescriptor.configurable !== false
    ) {
      return null;
    }
    const snapshot: unknown[] = [];
    for (let index = 0; index < expectedLength; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      snapshot.push(descriptor.value);
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function validSystemIdentifier(value: unknown): value is string {
  if (typeof value !== "string" || !systemIdentifierPattern.test(value)) {
    return false;
  }
  return value.length < unsignedBigintMaximum.length ||
    (
      value.length === unsignedBigintMaximum.length &&
      value <= unsignedBigintMaximum
    );
}

function snapshotPolicy(
  value: unknown,
): Readonly<PostgresRuntimeCapabilityEvidencePolicy> | null {
  const snapshot = snapshotExactRecord(value, policyKeys);
  if (
    snapshot === null ||
    typeof snapshot.capability !== "string" ||
    !postgresRuntimeCapabilities.includes(
      snapshot.capability as PostgresRuntimeCapability,
    ) ||
    typeof snapshot.runtimeEnvironment !== "string" ||
    !runtimeEnvironments.includes(
      snapshot.runtimeEnvironment as RuntimeEnvironment,
    ) ||
    typeof snapshot.expectedDatabaseName !== "string" ||
    !databaseNamePattern.test(snapshot.expectedDatabaseName) ||
    !validSystemIdentifier(snapshot.expectedSystemIdentifier)
  ) {
    return null;
  }
  return Object.freeze({
    capability: snapshot.capability as PostgresRuntimeCapability,
    runtimeEnvironment: snapshot.runtimeEnvironment as RuntimeEnvironment,
    expectedDatabaseName: snapshot.expectedDatabaseName,
    expectedSystemIdentifier: snapshot.expectedSystemIdentifier,
  });
}

function snapshotQuery(
  value: unknown,
): PostgresRuntimeCapabilityEvidenceDependencies["query"] | null {
  const snapshot = snapshotExactRecord(value, dependencyKeys);
  if (
    snapshot === null || typeof snapshot.query !== "function" ||
    nodeUtilTypes.isProxy(snapshot.query)
  ) {
    return null;
  }
  return snapshot.query as PostgresRuntimeCapabilityEvidenceDependencies["query"];
}

function parseResultRow(value: unknown):
  | Readonly<PostgresRuntimeCapabilityEvidenceRow>
  | null {
  const snapshot = snapshotExactRecord(value, resultRowKeys);
  if (
    snapshot === null ||
    resultRowKeys.some((key) => typeof snapshot[key] !== "boolean")
  ) {
    return null;
  }
  return Object.freeze(
    Object.fromEntries(
      resultRowKeys.map((key) => [key, snapshot[key]]),
    ),
  ) as unknown as Readonly<PostgresRuntimeCapabilityEvidenceRow>;
}

function parseSingleResult(value: unknown):
  | Readonly<PostgresRuntimeCapabilityEvidenceRow>
  | null {
  const snapshot = snapshotExactRecord(value, resultKeys);
  if (snapshot === null || snapshot.rowCount !== 1) return null;
  const rows = snapshotDenseArray(snapshot.rows, 1);
  return rows === null ? null : parseResultRow(rows[0]);
}

function terminalEvidence(
  capability: PostgresRuntimeCapability,
  evaluatedCheckCount: number,
  failedChecks: readonly PostgresRuntimeCapabilityEvidenceFailureCode[],
): Readonly<PostgresRuntimeCapabilityEvidence> {
  const frozenFailures = Object.freeze([...failedChecks]);
  return Object.freeze({
    policyVersion: postgresRuntimeCapabilityEvidencePolicyVersion,
    capability,
    status: frozenFailures.length === 0 ? "candidate" : "blocked",
    activationAllowed: false,
    evaluatedCheckCount,
    totalCheckCount: postgresRuntimeCapabilityEvidenceCheckCodes.length,
    failedChecks: frozenFailures,
  });
}

function evaluateRow(
  policy: Readonly<PostgresRuntimeCapabilityEvidencePolicy>,
  row: Readonly<PostgresRuntimeCapabilityEvidenceRow>,
): Readonly<PostgresRuntimeCapabilityEvidence> {
  const productionLike = policy.runtimeEnvironment === "staging" ||
    policy.runtimeEnvironment === "production";
  const migrationCapability = policy.capability === "migration";
  const verifierCapability = policy.capability === "verifier";
  const checks: readonly Readonly<{
    code: PostgresRuntimeCapabilityEvidenceCheckCode;
    passed: boolean;
  }>[] = Object.freeze([
    { code: "POSTGRES_VERSION_16", passed: row.postgres16 },
    { code: "POSTGRES_PRIMARY_SERVER", passed: row.primaryServer },
    { code: "POSTGRES_DATABASE_NAME", passed: row.databaseNameMatches },
    {
      code: "POSTGRES_CLUSTER_SYSTEM_IDENTIFIER",
      passed: row.systemIdentifierMatches,
    },
    {
      code: "POSTGRES_TLS_SESSION",
      passed: !productionLike || row.tlsSessionApproved,
    },
    { code: "POSTGRES_SESSION_ROLE", passed: row.sessionRoleMatches },
    { code: "POSTGRES_CURRENT_ROLE", passed: row.currentRoleMatches },
    {
      code: "POSTGRES_LOGIN_ROLE_ATTRIBUTES",
      passed: row.loginRoleLeastPrivilege,
    },
    {
      code: "POSTGRES_MIGRATION_OWNER_ATTRIBUTES",
      passed: row.migrationOwnerLeastPrivilege,
    },
    {
      code: "POSTGRES_MIGRATION_OWNER_MEMBERSHIP",
      passed: row.migrationOwnerMember === migrationCapability,
    },
    {
      code: "POSTGRES_MIGRATION_OWNER_SET_ROLE",
      passed: row.migrationOwnerSettable === migrationCapability,
    },
    {
      code: "POSTGRES_MIGRATION_OWNER_NO_INHERIT",
      passed: !row.migrationOwnerInherited,
    },
    {
      code: "POSTGRES_PROTECTED_ROLE_TOPOLOGY",
      passed: row.protectedRoleTopologyLocked,
    },
    {
      code: "POSTGRES_MIGRATION_OWNER_DEFAULT_ACL",
      passed: row.migrationOwnerDefaultAclLocked,
    },
    { code: "POSTGRES_DATABASE_CONNECT", passed: row.databaseConnect },
    {
      code: "POSTGRES_DATABASE_CREATE_BLOCKED",
      passed: row.databaseCreateBlocked,
    },
    {
      code: "POSTGRES_DATABASE_TEMPORARY_BLOCKED",
      passed: row.databaseTemporaryBlocked,
    },
    {
      code: "POSTGRES_PUBLIC_SCHEMA_USAGE",
      passed: row.publicSchemaUsage,
    },
    {
      code: "POSTGRES_PUBLIC_SCHEMA_CREATE_BLOCKED",
      passed: row.publicSchemaCreateBlocked,
    },
    { code: "POSTGRES_SEARCH_PATH", passed: row.searchPathLocked },
    {
      code: "POSTGRES_PROTECTED_TABLES_EXIST",
      passed: row.protectedTablesExist,
    },
    {
      code: "POSTGRES_PROTECTED_TABLE_OWNERSHIP",
      passed: row.protectedTablesOwnedByMigrationOwner,
    },
    {
      code: "POSTGRES_PROTECTED_TABLE_ACL",
      passed: row.protectedTableAclLocked,
    },
    {
      code: "POSTGRES_PROTECTED_TABLE_ACCESS_BLOCKED",
      passed: !row.protectedTableAccess,
    },
    {
      code: "POSTGRES_PROTECTED_FUNCTIONS_EXIST",
      passed: row.protectedFunctionsExist,
    },
    {
      code: "POSTGRES_PROTECTED_FUNCTION_OWNERSHIP",
      passed: row.protectedFunctionsOwnedByMigrationOwner,
    },
    {
      code: "POSTGRES_PROTECTED_FUNCTION_ACL",
      passed: row.protectedFunctionAclLocked,
    },
    {
      code: "POSTGRES_INTERNAL_FUNCTION_EXECUTE_BLOCKED",
      passed: !row.internalFunctionExecute,
    },
    {
      code: "POSTGRES_ATTESTED_PUBLISH_EXECUTE",
      passed: row.attestedPublishExecute === verifierCapability,
    },
    {
      code: "POSTGRES_READBACK_EXECUTE",
      passed: row.readbackExecute === verifierCapability,
    },
    {
      code: "POSTGRES_PUBLIC_FUNCTION_EXECUTE_BLOCKED",
      passed: !row.publicProtectedFunctionExecute,
    },
    {
      code: "POSTGRES_ATTESTED_PUBLISH_SECURITY_DEFINER",
      passed: row.attestedPublishSecurityDefiner,
    },
    {
      code: "POSTGRES_READBACK_SECURITY_DEFINER",
      passed: row.readbackSecurityDefiner,
    },
    {
      code: "POSTGRES_FUNCTION_SEARCH_PATH",
      passed: row.functionSearchPathLocked,
    },
    { code: "POSTGRES_READBACK_SHAPE", passed: row.readbackShapeLocked },
  ]);
  const failedChecks = checks
    .filter((check) => !check.passed)
    .map((check) => check.code);
  return terminalEvidence(policy.capability, checks.length, failedChecks);
}

export function createPostgresRuntimeCapabilityEvidenceProbe(
  policyInput: unknown,
  dependenciesInput: unknown,
): PostgresRuntimeCapabilityEvidenceProbe {
  const policy = snapshotPolicy(policyInput);
  if (policy === null) {
    throw new TypeError(
      "PostgreSQL runtime capability evidence policy is invalid",
    );
  }
  const query = snapshotQuery(dependenciesInput);
  if (query === null) {
    throw new TypeError(
      "PostgreSQL runtime capability evidence dependencies are invalid",
    );
  }
  const parameters = Object.freeze([
    policy.expectedDatabaseName,
    policy.expectedSystemIdentifier,
    postgresRuntimeCapabilityLoginRoles[policy.capability],
  ]) as readonly [string, string, string];

  return Object.freeze({
    async verify() {
      let result: unknown;
      try {
        result = await query(
          postgresRuntimeCapabilityEvidenceSql,
          parameters,
        );
      } catch {
        return terminalEvidence(
          policy.capability,
          0,
          ["POSTGRES_RUNTIME_EVIDENCE_QUERY_FAILED"],
        );
      }
      let row: Readonly<PostgresRuntimeCapabilityEvidenceRow> | null;
      try {
        row = parseSingleResult(result);
      } catch {
        row = null;
      }
      return row === null
        ? terminalEvidence(
            policy.capability,
            0,
            ["POSTGRES_RUNTIME_EVIDENCE_RESULT_INVALID"],
          )
        : evaluateRow(policy, row);
    },
  });
}

export const postgresRuntimeCapabilityEvidenceMigrationOwnerRole =
  postgresMigrationOwnerRole;
