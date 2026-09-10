import { types as nodeUtilTypes } from "node:util";

import type { Pool, PoolClient, QueryResult } from "pg";

import type {
  BotReplyStagingProviderFenceWorkerCapabilityPort,
} from "../operations/botReplyStagingProviderFenceCapabilityPorts.ts";
import {
  createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository,
} from "./postgresBotReplyStagingProviderFenceCapabilityRepository.ts";
import type {
  PostgresParameter,
  PostgresQueryResult,
} from "./postgresTransaction.ts";

const recoveryStatement = "ROLLBACK";
const resetSessionStatement = "DISCARD ALL";
const maximumStatementLength = 2_048;
const maximumParameterStringLength = 1_024;
const parameterCount = 14;
const dependencyKeys = Object.freeze(["pool"]);

const allowedStatements = Object.freeze(new Set([
  [
    "SELECT capability.*",
    "FROM public.reserve_bot_reply_staging_provider_operation_v1(",
    "$1::TEXT, $2::BIGINT, $3::TEXT, $4::TEXT, $5::TEXT,",
    "$6::TEXT, $7::TEXT, $8::INTEGER, $9::TIMESTAMPTZ, $10::TEXT,",
    "$11::TEXT, $12::TEXT, $13::INTEGER, $14::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  [
    "SELECT capability.*",
    "FROM public.finalize_bot_reply_staging_provider_operation_v1(",
    "$1::TEXT, $2::BIGINT, $3::TEXT, $4::TEXT, $5::TEXT,",
    "$6::TEXT, $7::TEXT, $8::INTEGER, $9::TIMESTAMPTZ, $10::TEXT,",
    "$11::TEXT, $12::TEXT, $13::INTEGER, $14::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
]));

type ExactRecord = Readonly<Record<string, unknown>>;

type CheckedPool = Readonly<{
  connect: Pool["connect"];
  pool: Pool;
}>;

type CheckedClient = Readonly<{
  client: PoolClient;
  query: PoolClient["query"];
  release: PoolClient["release"];
}>;

interface PostgresCommittedQueryExecutor {
  queryCommitted<TRow>(
    sql: string,
    parameters: readonly PostgresParameter[],
  ): Promise<Readonly<PostgresQueryResult<TRow>>>;
}

function fail(code: string): never {
  throw new Error(
    `node-postgres staging provider capability failed: ${code}`,
  );
}

function requireExactDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
  code: string,
): ExactRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail(code);
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return fail(code);
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      return fail(code);
    }
    const actualKeys = (ownKeys as string[]).sort();
    const normalizedExpectedKeys = [...expectedKeys].sort();
    if (
      actualKeys.length !== normalizedExpectedKeys.length ||
      actualKeys.some(
        (key, index) => key !== normalizedExpectedKeys[index],
      )
    ) {
      return fail(code);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of actualKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return fail(code);
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        `node-postgres staging provider capability failed: ${code}`
    ) {
      throw error;
    }
    return fail(code);
  }
}

function requirePool(value: unknown): CheckedPool {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-dependency");
  }

  let connect: unknown;
  try {
    connect = Reflect.get(value, "connect");
  } catch {
    return fail("invalid-dependency");
  }
  if (typeof connect !== "function") {
    return fail("invalid-dependency");
  }
  return Object.freeze({
    connect: connect as Pool["connect"],
    pool: value as Pool,
  });
}

function requireClient(value: unknown): CheckedClient {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-client");
  }

  let query: unknown;
  let release: unknown;
  try {
    query = Reflect.get(value, "query");
    release = Reflect.get(value, "release");
  } catch {
    return fail("invalid-client");
  }
  if (typeof query !== "function" || typeof release !== "function") {
    return fail("invalid-client");
  }
  return Object.freeze({
    client: value as PoolClient,
    query: query as PoolClient["query"],
    release: release as PoolClient["release"],
  });
}

function destroyUnknownClient(value: unknown): void {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return;
  }
  try {
    const release = Reflect.get(value, "release");
    if (typeof release === "function") {
      Reflect.apply(release, value, [true]);
    }
  } catch {
    // The capability still fails closed and exposes no committed result.
  }
}

function normalizeStatement(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumStatementLength
  ) {
    return fail("statement-not-allowlisted");
  }
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (!allowedStatements.has(normalized)) {
    return fail("statement-not-allowlisted");
  }
  return value;
}

function snapshotParameters(
  value: unknown,
): readonly PostgresParameter[] {
  if (
    !Array.isArray(value) ||
    nodeUtilTypes.isProxy(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    return fail("invalid-parameters");
  }

  try {
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const lengthDescriptor = descriptors.length;
    if (
      lengthDescriptor === undefined ||
      !("value" in lengthDescriptor) ||
      lengthDescriptor.value !== parameterCount ||
      Reflect.ownKeys(value).length !== parameterCount + 1
    ) {
      return fail("invalid-parameters");
    }
    const snapshot: PostgresParameter[] = [];
    for (let index = 0; index < parameterCount; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return fail("invalid-parameters");
      }
      const parameter = descriptor.value;
      const validString =
        typeof parameter === "string" &&
        parameter.length <= maximumParameterStringLength;
      const validNumber =
        typeof parameter === "number" &&
        Number.isSafeInteger(parameter);
      if (
        parameter !== null &&
        typeof parameter !== "boolean" &&
        !validString &&
        !validNumber
      ) {
        return fail("invalid-parameters");
      }
      snapshot.push(parameter as PostgresParameter);
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "node-postgres staging provider capability failed: invalid-parameters"
    ) {
      throw error;
    }
    return fail("invalid-parameters");
  }
}

function snapshotRow(value: unknown): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-query-result");
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return fail("invalid-query-result");
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      return fail("invalid-query-result");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of ownKeys as string[]) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return fail("invalid-query-result");
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "node-postgres staging provider capability failed: invalid-query-result"
    ) {
      throw error;
    }
    return fail("invalid-query-result");
  }
}

function snapshotQueryResult<TRow>(
  value: unknown,
): Readonly<PostgresQueryResult<TRow>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-query-result");
  }

  try {
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const commandDescriptor = descriptors.command;
    const rowCountDescriptor = descriptors.rowCount;
    const rowsDescriptor = descriptors.rows;
    if (
      commandDescriptor === undefined ||
      !("value" in commandDescriptor) ||
      rowCountDescriptor === undefined ||
      !("value" in rowCountDescriptor) ||
      rowsDescriptor === undefined ||
      !("value" in rowsDescriptor)
    ) {
      return fail("invalid-query-result");
    }
    const command = commandDescriptor.value;
    const rawRowCount = rowCountDescriptor.value;
    const rawRows = rowsDescriptor.value;
    if (
      command !== "SELECT" ||
      !Number.isSafeInteger(rawRowCount) ||
      Number(rawRowCount) < 0 ||
      !Array.isArray(rawRows) ||
      nodeUtilTypes.isProxy(rawRows) ||
      Object.getPrototypeOf(rawRows) !== Array.prototype
    ) {
      return fail("invalid-query-result");
    }
    const rowCount = Number(rawRowCount);
    const rowDescriptors = Object.getOwnPropertyDescriptors(rawRows) as Record<
      string,
      PropertyDescriptor
    >;
    const lengthDescriptor = rowDescriptors.length;
    if (
      lengthDescriptor === undefined ||
      !("value" in lengthDescriptor) ||
      lengthDescriptor.value !== rowCount ||
      rowCount > 2 ||
      Reflect.ownKeys(rawRows).length !== rowCount + 1
    ) {
      return fail("invalid-query-result");
    }
    const rows: Readonly<Record<string, unknown>>[] = [];
    for (let index = 0; index < rowCount; index += 1) {
      const descriptor = rowDescriptors[String(index)];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return fail("invalid-query-result");
      }
      rows.push(snapshotRow(descriptor.value));
    }
    return Object.freeze({
      rows: Object.freeze(rows) as readonly TRow[],
      rowCount,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "node-postgres staging provider capability failed: invalid-query-result"
    ) {
      throw error;
    }
    return fail("invalid-query-result");
  }
}

function releaseClient(client: CheckedClient, destroy: boolean): void {
  Reflect.apply(
    client.release,
    client.client,
    destroy ? [true] : [],
  );
}

function createCommittedQueryExecutor(
  checkedPool: CheckedPool,
): PostgresCommittedQueryExecutor {
  return Object.freeze({
    async queryCommitted<TRow>(
      rawSql: string,
      rawParameters: readonly PostgresParameter[],
    ): Promise<Readonly<PostgresQueryResult<TRow>>> {
      const sql = normalizeStatement(rawSql);
      const parameters = snapshotParameters(rawParameters);
      let rawClient: unknown;
      try {
        rawClient = await Reflect.apply(
          checkedPool.connect,
          checkedPool.pool,
          [],
        );
      } catch {
        return fail("connection-failed");
      }
      let client: CheckedClient;
      try {
        client = requireClient(rawClient);
      } catch {
        destroyUnknownClient(rawClient);
        return fail("connection-failed");
      }
      let destroy = true;
      let result: Readonly<PostgresQueryResult<TRow>> | undefined;
      let failureCode: "committed-query-failed" | "client-release-failed" |
        undefined;

      try {
        await Reflect.apply(client.query, client.client, [recoveryStatement]);
        await Reflect.apply(client.query, client.client, [
          resetSessionStatement,
        ]);
        const rawResult = await Reflect.apply(
          client.query,
          client.client,
          [sql, [...parameters]],
        ) as QueryResult<Record<string, unknown>>;
        result = snapshotQueryResult<TRow>(rawResult);
        destroy = false;
      } catch {
        failureCode = "committed-query-failed";
      }

      try {
        releaseClient(client, destroy);
      } catch {
        failureCode = "client-release-failed";
      }

      if (failureCode !== undefined || result === undefined) {
        return fail(failureCode ?? "committed-query-failed");
      }
      return result;
    },
  });
}

export function createNodePostgresBotReplyStagingProviderFenceWorkerCapability(
  dependencies: Readonly<{ pool: Pool }>,
): BotReplyStagingProviderFenceWorkerCapabilityPort {
  const checkedDependencies = requireExactDataRecord(
    dependencies,
    dependencyKeys,
    "invalid-dependency",
  );
  const pool = requirePool(checkedDependencies.pool);
  return createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository({
    committedQueries: createCommittedQueryExecutor(pool),
  });
}
