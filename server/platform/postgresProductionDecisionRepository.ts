import type {
  ProductionDecisionRepository,
  SaveProductionDecisionCommand,
} from "../../db/productionDecisionRepository.ts";
import type {
  ProductionDecisionMutationResult,
  ProductionDecisionRecord,
} from "../../shared/domain/productionDecisionRecord.ts";
import {
  deriveProductionDecisionEventKey,
} from "../operations/productionDecisionKey.ts";
import {
  requireProductionDecisionActor,
  requireProductionDecisionCheckId,
  requireProductionDecisionEventKey,
  requireProductionDecisionRationale,
  requireProductionDecisionSelection,
  requireProductionDecisionTimestamp,
  requireProductionDecisionVersion,
} from "../operations/productionDecisionValidation.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const decisionCount = 11;
const recordRowKeys = Object.freeze([
  "checkId",
  "decidedAt",
  "decidedByExternalUserId",
  "lastEventKey",
  "rationale",
  "selection",
  "updatedAt",
  "version",
]);
const recordColumns = `
  check_id AS "checkId",
  selection,
  rationale,
  version,
  last_event_key AS "lastEventKey",
  decided_by_external_user_id AS "decidedByExternalUserId",
  decided_at AS "decidedAt",
  updated_at AS "updatedAt"
`;

export const postgresProductionDecisionSql = Object.freeze({
  list: `
    SELECT ${recordColumns}
    FROM production_decision_records
    ORDER BY check_id ASC
    LIMIT $1
  `,
  findByCheckId: `
    SELECT ${recordColumns}
    FROM production_decision_records
    WHERE check_id = $1
    LIMIT 1
  `,
  lockByCheckId: `
    SELECT ${recordColumns}
    FROM production_decision_records
    WHERE check_id = $1
    FOR UPDATE
  `,
  insert: `
    INSERT INTO production_decision_records (
      check_id,
      selection,
      rationale,
      version,
      last_event_key,
      decided_by_external_user_id,
      decided_at,
      updated_at
    ) VALUES (
      $1, $2, $3, 1, $4, $5,
      $6::timestamptz, $6::timestamptz
    )
    ON CONFLICT (check_id) DO NOTHING
    RETURNING ${recordColumns}
  `,
  update: `
    UPDATE production_decision_records
    SET
      selection = $3,
      rationale = $4,
      version = version + 1,
      last_event_key = $5,
      decided_by_external_user_id = $6,
      decided_at = $7::timestamptz,
      updated_at = $7::timestamptz
    WHERE check_id = $1
      AND version = $2
    RETURNING ${recordColumns}
  `,
});

export interface PostgresProductionDecisionDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function parseRecord(value: unknown): ProductionDecisionRecord {
  const row = requireExactPostgresRow(value, recordRowKeys);
  const decidedAt = requireProductionDecisionTimestamp(
    parsePostgresTimestamp(row.decidedAt),
  );
  const updatedAt = requireProductionDecisionTimestamp(
    parsePostgresTimestamp(row.updatedAt),
  );
  if (decidedAt !== updatedAt) {
    throw new Error("PostgreSQL returned inconsistent production decision time");
  }
  return Object.freeze({
    checkId: requireProductionDecisionCheckId(row.checkId),
    selection: requireProductionDecisionSelection(row.selection),
    rationale: requireProductionDecisionRationale(row.rationale),
    version: parsePostgresPositiveInteger(row.version),
    lastEventKey: requireProductionDecisionEventKey(row.lastEventKey),
    decidedByExternalUserId: requireProductionDecisionActor(
      row.decidedByExternalUserId,
    ),
    decidedAt,
    updatedAt,
  });
}

async function loadRows(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly unknown[]> {
  return requirePostgresRows(
    await queries.query<unknown>(sql, parameters),
    maximum,
  );
}

async function loadOne(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<ProductionDecisionRecord | null> {
  const rows = await loadRows(queries, sql, parameters, 1);
  return rows.length === 0 ? null : parseRecord(rows[0]);
}

function unchanged(
  record: ProductionDecisionRecord,
): ProductionDecisionMutationResult {
  return Object.freeze({ outcome: "unchanged", record });
}

function conflict(
  record: ProductionDecisionRecord | null,
): ProductionDecisionMutationResult {
  return Object.freeze({ outcome: "conflict", record });
}

function matchesTarget(
  record: ProductionDecisionRecord,
  selection: string,
  rationale: string,
): boolean {
  return record.selection === selection && record.rationale === rationale;
}

export function createPostgresProductionDecisionRepository(
  dependencies: Readonly<PostgresProductionDecisionDependencies>,
): ProductionDecisionRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL production decision dependencies are invalid");
  }

  const findByCheckId: ProductionDecisionRepository["findByCheckId"] = async (
    checkIdInput,
  ) => {
    const checkId = requireProductionDecisionCheckId(checkIdInput);
    return loadOne(
      dependencies.queries,
      postgresProductionDecisionSql.findByCheckId,
      [checkId],
    );
  };

  return Object.freeze({
    async list() {
      const rows = await loadRows(
        dependencies.queries,
        postgresProductionDecisionSql.list,
        [decisionCount + 1],
        decisionCount + 1,
      );
      if (rows.length > decisionCount) {
        throw new Error("production decision list is unbounded");
      }
      const records = rows.map(parseRecord);
      const checkIds = new Set(records.map(({ checkId }) => checkId));
      if (checkIds.size !== records.length) {
        throw new Error("production decision list contains duplicates");
      }
      return Object.freeze(records);
    },

    findByCheckId,

    async save(command: SaveProductionDecisionCommand) {
      const checkId = requireProductionDecisionCheckId(command?.checkId);
      const expectedVersion = requireProductionDecisionVersion(
        command?.expectedVersion,
        true,
      );
      const selection = requireProductionDecisionSelection(command?.selection);
      const rationale = requireProductionDecisionRationale(command?.rationale);
      const actorExternalUserId = requireProductionDecisionActor(
        command?.actorExternalUserId,
      );
      const occurredAt = requireProductionDecisionTimestamp(command?.occurredAt);
      const eventKey = await deriveProductionDecisionEventKey({
        checkId,
        expectedVersion,
        selection,
        rationale,
        actorExternalUserId,
      });

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const current = await loadOne(
            transaction,
            postgresProductionDecisionSql.lockByCheckId,
            [checkId],
          );
          if (
            current !== null &&
            current.version === expectedVersion &&
            matchesTarget(current, selection, rationale)
          ) {
            return unchanged(current);
          }
          if (current !== null && current.lastEventKey === eventKey) {
            return unchanged(current);
          }
          if (
            (current === null && expectedVersion !== 0) ||
            (current !== null && current.version !== expectedVersion)
          ) {
            return conflict(current);
          }

          if (current === null) {
            const insertedRows = await loadRows(
              transaction,
              postgresProductionDecisionSql.insert,
              [
                checkId,
                selection,
                rationale,
                eventKey,
                actorExternalUserId,
                occurredAt,
              ],
              1,
            );
            if (insertedRows.length === 1) {
              const record = parseRecord(insertedRows[0]);
              if (record.lastEventKey !== eventKey || record.version !== 1) {
                throw new Error("PostgreSQL returned conflicting decision creation");
              }
              return Object.freeze({ outcome: "created" as const, record });
            }
            const raced = await loadOne(
              transaction,
              postgresProductionDecisionSql.lockByCheckId,
              [checkId],
            );
            return raced !== null && raced.lastEventKey === eventKey
              ? unchanged(raced)
              : conflict(raced);
          }

          const updatedRows = await loadRows(
            transaction,
            postgresProductionDecisionSql.update,
            [
              checkId,
              expectedVersion,
              selection,
              rationale,
              eventKey,
              actorExternalUserId,
              occurredAt,
            ],
            1,
          );
          if (updatedRows.length !== 1) {
            throw new Error("PostgreSQL decision update failed after lock");
          }
          const record = parseRecord(updatedRows[0]);
          if (
            record.version !== expectedVersion + 1 ||
            record.lastEventKey !== eventKey ||
            !matchesTarget(record, selection, rationale)
          ) {
            throw new Error("PostgreSQL returned conflicting decision update");
          }
          return Object.freeze({ outcome: "updated" as const, record });
        },
      );
    },
  });
}
