import type {
  ProductionDecisionMutationResult,
  ProductionDecisionRecord,
} from "../shared/domain/productionDecisionRecord.ts";
import {
  deriveProductionDecisionEventKey,
} from "../server/operations/productionDecisionKey.ts";
import {
  requireProductionDecisionActor,
  requireProductionDecisionCheckId,
  requireProductionDecisionEventKey,
  requireProductionDecisionRationale,
  requireProductionDecisionSelection,
  requireProductionDecisionTimestamp,
  requireProductionDecisionVersion,
} from "../server/operations/productionDecisionValidation.ts";
import type {
  D1DatabaseBinding,
  D1Result,
} from "./d1.ts";

const RECORD_COLUMNS_SQL = `
  check_id AS checkId,
  selection,
  rationale,
  version,
  last_event_key AS lastEventKey,
  decided_by_external_user_id AS decidedByExternalUserId,
  decided_at AS decidedAt,
  updated_at AS updatedAt
`;

const LIST_RECORDS_SQL = `
  SELECT ${RECORD_COLUMNS_SQL}
  FROM production_decision_records
  ORDER BY check_id ASC
  LIMIT 11
`;

const FIND_RECORD_SQL = `
  SELECT ${RECORD_COLUMNS_SQL}
  FROM production_decision_records
  WHERE check_id = ?1
  LIMIT 1
`;

const INSERT_RECORD_SQL = `
  INSERT INTO production_decision_records (
    check_id,
    selection,
    rationale,
    version,
    last_event_key,
    decided_by_external_user_id,
    decided_at,
    updated_at
  )
  SELECT ?1, ?3, ?4, 1, ?5, ?6, ?7, ?7
  WHERE ?2 = 0
  ON CONFLICT (check_id) DO NOTHING
`;

const UPDATE_RECORD_SQL = `
  UPDATE production_decision_records
  SET
    selection = ?3,
    rationale = ?4,
    version = version + 1,
    last_event_key = ?5,
    decided_by_external_user_id = ?6,
    decided_at = ?7,
    updated_at = ?7
  WHERE check_id = ?1
    AND version = ?2
`;

interface ProductionDecisionRow {
  checkId: unknown;
  selection: unknown;
  rationale: unknown;
  version: unknown;
  lastEventKey: unknown;
  decidedByExternalUserId: unknown;
  decidedAt: unknown;
  updatedAt: unknown;
}

export interface SaveProductionDecisionCommand {
  checkId: unknown;
  expectedVersion: unknown;
  selection: unknown;
  rationale: unknown;
  actorExternalUserId: unknown;
  occurredAt: unknown;
}

export interface ProductionDecisionRepository {
  list():
    Promise<readonly ProductionDecisionRecord[]>;
  findByCheckId(
    checkId: unknown,
  ): Promise<ProductionDecisionRecord | null>;
  save(
    command: SaveProductionDecisionCommand,
  ): Promise<ProductionDecisionMutationResult>;
}

function parseRecord(
  row: ProductionDecisionRow,
): ProductionDecisionRecord {
  return {
    checkId:
      requireProductionDecisionCheckId(
        row.checkId,
      ),
    selection:
      requireProductionDecisionSelection(
        row.selection,
      ),
    rationale:
      requireProductionDecisionRationale(
        row.rationale,
      ),
    version:
      requireProductionDecisionVersion(
        row.version,
      ),
    lastEventKey:
      requireProductionDecisionEventKey(
        row.lastEventKey,
      ),
    decidedByExternalUserId:
      requireProductionDecisionActor(
        row.decidedByExternalUserId,
      ),
    decidedAt:
      requireProductionDecisionTimestamp(
        row.decidedAt,
      ),
    updatedAt:
      requireProductionDecisionTimestamp(
        row.updatedAt,
      ),
  };
}

function requireSuccessfulResult<TRow>(
  result: D1Result<TRow>,
): D1Result<TRow> {
  if (!result.success) {
    throw new Error(
      "production decision persistence failed",
    );
  }

  return result;
}

export function createProductionDecisionRepository(
  database: D1DatabaseBinding,
): ProductionDecisionRepository {
  async function findByCheckId(
    checkIdInput: unknown,
  ): Promise<ProductionDecisionRecord | null> {
    const checkId =
      requireProductionDecisionCheckId(
        checkIdInput,
      );
    const row = await database
      .prepare(FIND_RECORD_SQL)
      .bind(checkId)
      .first<ProductionDecisionRow>();

    return row === null
      ? null
      : parseRecord(row);
  }

  return {
    async list() {
      const result = requireSuccessfulResult(
        await database
          .prepare(LIST_RECORDS_SQL)
          .all<ProductionDecisionRow>(),
      );
      const rows = result.results ?? [];

      if (rows.length > 11) {
        throw new Error(
          "production decision list is unbounded",
        );
      }

      const records = rows.map(parseRecord);
      const checkIds = new Set(
        records.map(
          (record) => record.checkId,
        ),
      );

      if (checkIds.size !== records.length) {
        throw new Error(
          "production decision list contains duplicates",
        );
      }

      return records;
    },

    findByCheckId,

    async save(command) {
      const checkId =
        requireProductionDecisionCheckId(
          command.checkId,
        );
      const expectedVersion =
        requireProductionDecisionVersion(
          command.expectedVersion,
          true,
        );
      const selection =
        requireProductionDecisionSelection(
          command.selection,
        );
      const rationale =
        requireProductionDecisionRationale(
          command.rationale,
        );
      const actorExternalUserId =
        requireProductionDecisionActor(
          command.actorExternalUserId,
        );
      const occurredAt =
        requireProductionDecisionTimestamp(
          command.occurredAt,
        );
      const eventKey =
        await deriveProductionDecisionEventKey({
          checkId,
          expectedVersion,
          selection,
          rationale,
          actorExternalUserId,
        });
      const current =
        await findByCheckId(checkId);

      if (
        current !== null &&
        current.version ===
          expectedVersion &&
        current.selection === selection &&
        current.rationale === rationale
      ) {
        return {
          outcome: "unchanged",
          record: current,
        };
      }

      if (
        current !== null &&
        current.lastEventKey === eventKey
      ) {
        return {
          outcome: "unchanged",
          record: current,
        };
      }

      if (
        (current === null &&
          expectedVersion !== 0) ||
        (current !== null &&
          current.version !==
            expectedVersion)
      ) {
        return {
          outcome: "conflict",
          record: current,
        };
      }

      const statement = database
        .prepare(
          current === null
            ? INSERT_RECORD_SQL
            : UPDATE_RECORD_SQL,
        )
        .bind(
          checkId,
          expectedVersion,
          selection,
          rationale,
          eventKey,
          actorExternalUserId,
          occurredAt,
        );
      const result = requireSuccessfulResult(
        await statement.run(),
      );
      const saved =
        await findByCheckId(checkId);

      if (
        saved !== null &&
        saved.lastEventKey === eventKey &&
        saved.selection === selection &&
        saved.rationale === rationale &&
        saved.version ===
          expectedVersion + 1
      ) {
        return {
          outcome:
            Number(result.meta?.changes) === 1
              ? current === null
                ? "created"
                : "updated"
              : "unchanged",
          record: saved,
        };
      }

      return {
        outcome: "conflict",
        record: saved,
      };
    },
  };
}
