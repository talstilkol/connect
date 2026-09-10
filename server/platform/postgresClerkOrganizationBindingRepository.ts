import type {
  ClerkOrganizationBinding,
  ClerkOrganizationBindingReader,
  ClerkOrganizationBindingRepository,
  ClerkOrganizationBindingWriter,
} from "../../db/clerkOrganizationBindingRepository.ts";
import type { TenantId } from "../../shared/domain/model.ts";
import {
  parsePostgresPositiveInteger,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresQueryResult,
} from "./postgresTransaction.ts";

const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const bindingKeys = Object.freeze([
  "externalOrganizationId",
  "tenantId",
]);
const queryResultKeys = Object.freeze(["rowCount", "rows"]);

export const postgresClerkOrganizationBindingSql = Object.freeze({
  findByTenantId: `
    SELECT
      id AS "tenantId",
      clerk_organization_id AS "externalOrganizationId"
    FROM public.tenants
    WHERE id = $1
      AND clerk_organization_id IS NOT NULL
    LIMIT 1
  `,
  ensureBinding: `
    UPDATE public.tenants
    SET
      clerk_organization_id = COALESCE(clerk_organization_id, $2),
      updated_at = CASE
        WHEN clerk_organization_id IS NULL THEN CURRENT_TIMESTAMP
        ELSE updated_at
      END
    WHERE id = $1
      AND (
        clerk_organization_id IS NULL
        OR clerk_organization_id = $2
      )
    RETURNING
      id AS "tenantId",
      clerk_organization_id AS "externalOrganizationId"
  `,
});

function requireTenantId(value: unknown): TenantId {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error("Clerk tenant identity is invalid");
  }
  return Number(value) as TenantId;
}

function parseTenantId(value: unknown): TenantId {
  return parsePostgresPositiveInteger(value) as TenantId;
}

function requireExternalOrganizationId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 255 ||
    value.trim() !== value ||
    controlCharacterPattern.test(value)
  ) {
    throw new Error("Clerk organization identity is invalid");
  }
  return value;
}

function snapshotExactDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
  errorMessage: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) {
    throw new Error(errorMessage);
  }

  try {
    if (Array.isArray(value)) {
      throw new Error(errorMessage);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(errorMessage);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actualKeys = Reflect.ownKeys(descriptors);
    if (
      actualKeys.length !== expectedKeys.length ||
      actualKeys.some((key) =>
        typeof key !== "string" || !expectedKeys.includes(key)
      )
    ) {
      throw new Error(errorMessage);
    }

    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw new Error(errorMessage);
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    throw new Error(errorMessage);
  }
}

function snapshotRows(
  value: unknown,
  rowCount: number,
): readonly unknown[] {
  const errorMessage = "PostgreSQL returned an invalid result";
  try {
    if (
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype
    ) {
      throw new Error(errorMessage);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const descriptorMap = descriptors as unknown as Record<
      PropertyKey,
      PropertyDescriptor
    >;
    const actualKeys = Reflect.ownKeys(descriptorMap);
    const expectedKeys = [
      ...Array.from({ length: rowCount }, (_, index) => String(index)),
      "length",
    ];
    if (
      actualKeys.length !== expectedKeys.length ||
      actualKeys.some((key) =>
        typeof key !== "string" || !expectedKeys.includes(key)
      ) ||
      descriptorMap.length?.value !== rowCount ||
      descriptorMap.length.enumerable
    ) {
      throw new Error(errorMessage);
    }
    const rows = Array.from({ length: rowCount }, (_, index) => {
      const descriptor = descriptorMap[String(index)];
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw new Error(errorMessage);
      }
      return descriptor.value;
    });
    return Object.freeze(rows);
  } catch {
    throw new Error(errorMessage);
  }
}

function requireRows(
  value: unknown,
  maximum: number,
): readonly unknown[] {
  const result = snapshotExactDataRecord(
    value,
    queryResultKeys,
    "PostgreSQL returned an invalid result",
  );
  if (
    !Number.isSafeInteger(result.rowCount) ||
    Number(result.rowCount) < 0 ||
    Number(result.rowCount) > maximum
  ) {
    throw new Error("PostgreSQL returned an invalid result");
  }
  return snapshotRows(result.rows, Number(result.rowCount));
}

function parseBinding(value: unknown): Readonly<ClerkOrganizationBinding> {
  const row = snapshotExactDataRecord(
    value,
    bindingKeys,
    "PostgreSQL returned an invalid Clerk organization binding",
  );
  return Object.freeze({
    tenantId: parseTenantId(row.tenantId),
    externalOrganizationId: requireExternalOrganizationId(
      row.externalOrganizationId,
    ),
  });
}

function requireQueries(
  queries: PostgresQueryExecutor,
): PostgresQueryExecutor {
  const dependencies = snapshotExactDataRecord(
    queries,
    ["query"],
    "PostgreSQL Clerk organization dependencies are invalid",
  );
  if (typeof dependencies.query !== "function") {
    throw new Error("PostgreSQL Clerk organization dependencies are invalid");
  }
  const query = dependencies.query;
  return Object.freeze({
    query<TRow>(
      sql: string,
      parameters: readonly PostgresParameter[],
    ): Promise<Readonly<PostgresQueryResult<TRow>>> {
      return Reflect.apply(query, queries, [
        sql,
        parameters,
      ]) as Promise<Readonly<PostgresQueryResult<TRow>>>;
    },
  });
}

async function executeQuery(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<unknown> {
  try {
    return await queries.query(sql, parameters);
  } catch {
    throw new Error("PostgreSQL Clerk organization query failed");
  }
}

export function createPostgresClerkOrganizationBindingReader(
  queries: PostgresQueryExecutor,
): ClerkOrganizationBindingReader {
  const checkedQueries = requireQueries(queries);
  return Object.freeze({
    async findByTenantId(tenantId: TenantId) {
      const normalizedTenantId = requireTenantId(tenantId);
      const rows = requireRows(
        await executeQuery(
          checkedQueries,
          postgresClerkOrganizationBindingSql.findByTenantId,
          [normalizedTenantId],
        ),
        1,
      );
      if (rows.length === 0) {
        return null;
      }
      const binding = parseBinding(rows[0]);
      if (binding.tenantId !== normalizedTenantId) {
        throw new Error(
          "PostgreSQL returned a conflicting Clerk organization binding",
        );
      }
      return binding;
    },
  });
}

export function createPostgresClerkOrganizationBindingWriter(
  queries: PostgresQueryExecutor,
): ClerkOrganizationBindingWriter {
  const checkedQueries = requireQueries(queries);
  return Object.freeze({
    async ensureBinding(binding: Readonly<ClerkOrganizationBinding>) {
      const input = snapshotExactDataRecord(
        binding,
        bindingKeys,
        "Clerk organization binding is invalid",
      );
      const tenantId = requireTenantId(input.tenantId);
      const externalOrganizationId = requireExternalOrganizationId(
        input.externalOrganizationId,
      );
      const rows = requireRows(
        await executeQuery(
          checkedQueries,
          postgresClerkOrganizationBindingSql.ensureBinding,
          [tenantId, externalOrganizationId],
        ),
        1,
      );
      if (rows.length !== 1) {
        throw new Error("Clerk organization binding conflicts with tenant");
      }
      const persisted = parseBinding(rows[0]);
      if (
        persisted.tenantId !== tenantId ||
        persisted.externalOrganizationId !== externalOrganizationId
      ) {
        throw new Error("PostgreSQL returned a conflicting Clerk binding");
      }
      return persisted;
    },
  });
}

export function createPostgresClerkOrganizationBindingRepository(
  queries: PostgresQueryExecutor,
): ClerkOrganizationBindingRepository {
  const reader = createPostgresClerkOrganizationBindingReader(queries);
  const writer = createPostgresClerkOrganizationBindingWriter(queries);
  return Object.freeze({
    findByTenantId: reader.findByTenantId,
    ensureBinding: writer.ensureBinding,
  });
}
