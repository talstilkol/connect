import type {
  PersistedKnowledgePassage,
  PersistedKnowledgeSource,
} from "../shared/domain/aiAgent.ts";
import {
  deriveKnowledgePassageKey,
} from "../server/ai/aiAgentKey.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";
import {
  createKnowledgeSourceRepository,
} from "./knowledgeSourceRepository.ts";

const PASSAGE_KEY_PATTERN =
  /^knowledge_passage_v1_[0-9a-f]{64}$/;
const SOURCE_KEY_PATTERN =
  /^knowledge_source_v1_[0-9a-f]{64}$/;
const CONTENT_DIGEST_PATTERN =
  /^[0-9a-f]{64}$/;
const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MAX_PASSAGES_PER_SOURCE = 1_000;
const MAX_PASSAGE_CONTENT_LENGTH = 16_384;

const INSERT_PASSAGES_SQL = `
  INSERT INTO knowledge_passages (
    passage_key,
    tenant_id,
    source_key,
    passage_ordinal,
    content_sha256,
    content
  )
  SELECT
    json_extract(value, '$.passageKey'),
    ?1,
    ?2,
    json_extract(value, '$.passageOrdinal'),
    json_extract(value, '$.contentSha256'),
    json_extract(value, '$.content')
  FROM json_each(?4)
  WHERE EXISTS (
    SELECT 1
    FROM knowledge_sources
    WHERE tenant_id = ?1
      AND source_key = ?2
      AND version = ?3
      AND status = 'scanning'
  )
  ON CONFLICT (passage_key) DO NOTHING
`;

const MARK_SOURCE_READY_SQL = `
  UPDATE knowledge_sources
  SET
    status = 'ready',
    last_error_code = NULL,
    ready_at = CURRENT_TIMESTAMP,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND source_key = ?2
    AND version = ?3
    AND status = 'scanning'
    AND (
      SELECT count(*)
      FROM knowledge_passages
      WHERE tenant_id = ?1
        AND source_key = ?2
    ) = ?4
    AND NOT EXISTS (
      SELECT 1
      FROM json_each(?5) AS expected
      LEFT JOIN knowledge_passages AS stored
        ON stored.tenant_id = ?1
        AND stored.source_key = ?2
        AND stored.passage_key =
          json_extract(expected.value, '$.passageKey')
        AND stored.passage_ordinal =
          json_extract(expected.value, '$.passageOrdinal')
        AND stored.content_sha256 =
          json_extract(expected.value, '$.contentSha256')
        AND stored.content =
          json_extract(expected.value, '$.content')
      WHERE stored.passage_key IS NULL
    )
`;

const LIST_SOURCE_PASSAGES_SQL = `
  SELECT
    passage_key AS passageKey,
    tenant_id AS tenantId,
    source_key AS sourceKey,
    passage_ordinal AS passageOrdinal,
    content_sha256 AS contentSha256,
    content,
    created_at AS createdAt
  FROM knowledge_passages
  WHERE tenant_id = ?1
    AND source_key = ?2
  ORDER BY passage_ordinal ASC
`;

const LIST_APPROVED_PASSAGES_SQL = `
  SELECT
    passage.passage_key AS passageKey,
    passage.tenant_id AS tenantId,
    passage.source_key AS sourceKey,
    passage.passage_ordinal AS passageOrdinal,
    passage.content_sha256 AS contentSha256,
    passage.content AS content,
    passage.created_at AS createdAt
  FROM knowledge_passages AS passage
  INNER JOIN knowledge_sources AS source
    ON source.tenant_id = passage.tenant_id
    AND source.source_key = passage.source_key
  INNER JOIN json_each(?2) AS selected
    ON selected.value = passage.source_key
  WHERE passage.tenant_id = ?1
    AND source.status = 'ready'
  ORDER BY
    passage.source_key ASC,
    passage.passage_ordinal ASC
  LIMIT ?3
`;

interface KnowledgePassageRow {
  passageKey: string;
  tenantId: number;
  sourceKey: string;
  passageOrdinal: number;
  contentSha256: string;
  content: string;
  createdAt: string;
}

export interface ProcessedKnowledgePassageInput {
  passageKey: string;
  passageOrdinal: number;
  contentSha256: string;
  content: string;
}

export interface StoreProcessedKnowledgeInput {
  tenantId: number;
  sourceKey: string;
  expectedSourceVersion: number;
  passages:
    readonly ProcessedKnowledgePassageInput[];
}

export type StoreProcessedKnowledgeResult =
  | {
      outcome: "updated" | "unchanged";
      source: PersistedKnowledgeSource;
      passages:
        readonly PersistedKnowledgePassage[];
    }
  | {
      outcome:
        | "not-found"
        | "conflict"
        | "invalid-state";
    };

export interface KnowledgePassageRepository {
  storeProcessedAndMarkReady(
    input: StoreProcessedKnowledgeInput,
  ): Promise<StoreProcessedKnowledgeResult>;
  listApprovedBySourceKeys(
    tenantId: number,
    sourceKeys: readonly string[],
    limit: number,
  ): Promise<readonly PersistedKnowledgePassage[]>;
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${fieldName} must be a positive integer`,
    );
  }
}

function parsePassage(
  row: KnowledgePassageRow,
): PersistedKnowledgePassage {
  if (
    !PASSAGE_KEY_PATTERN.test(row.passageKey) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !SOURCE_KEY_PATTERN.test(row.sourceKey) ||
    !Number.isSafeInteger(row.passageOrdinal) ||
    row.passageOrdinal <= 0 ||
    !CONTENT_DIGEST_PATTERN.test(
      row.contentSha256,
    ) ||
    typeof row.content !== "string" ||
    row.content.length === 0 ||
    row.content.length >
      MAX_PASSAGE_CONTENT_LENGTH ||
    row.content !== row.content.trim() ||
    UNSAFE_CONTROL_CHARACTERS.test(row.content) ||
    typeof row.createdAt !== "string" ||
    row.createdAt.trim().length === 0
  ) {
    throw new Error(
      "D1 returned an invalid knowledge passage",
    );
  }

  return row;
}

async function validatePassages(
  tenantId: number,
  sourceKey: string,
  passages:
    readonly ProcessedKnowledgePassageInput[],
): Promise<
  readonly ProcessedKnowledgePassageInput[]
> {
  if (
    !Array.isArray(passages) ||
    passages.length === 0 ||
    passages.length > MAX_PASSAGES_PER_SOURCE
  ) {
    throw new Error(
      "passages must contain between 1 and 1000 items",
    );
  }

  const validated = [];
  const seenKeys = new Set<string>();
  const seenOrdinals = new Set<number>();

  for (const passage of passages) {
    assertPositiveInteger(
      passage.passageOrdinal,
      "passageOrdinal",
    );

    if (
      passage.passageOrdinal > passages.length ||
      typeof passage.content !== "string"
    ) {
      throw new Error(
        "knowledge passage ordinal or content is invalid",
      );
    }

    const content = passage.content.trim();

    if (
      content.length === 0 ||
      content.length >
        MAX_PASSAGE_CONTENT_LENGTH ||
      UNSAFE_CONTROL_CHARACTERS.test(content) ||
      content !== passage.content
    ) {
      throw new Error(
        "knowledge passage content is invalid",
      );
    }

    const digest = await sha256Hex(
      new TextEncoder().encode(content),
    );
    const expectedKey =
      await deriveKnowledgePassageKey(
        tenantId,
        sourceKey,
        passage.passageOrdinal,
        digest,
      );

    if (
      passage.contentSha256 !== digest ||
      passage.passageKey !== expectedKey ||
      seenKeys.has(passage.passageKey) ||
      seenOrdinals.has(passage.passageOrdinal)
    ) {
      throw new Error(
        "knowledge passage identity is invalid",
      );
    }

    seenKeys.add(passage.passageKey);
    seenOrdinals.add(passage.passageOrdinal);
    validated.push({
      passageKey: passage.passageKey,
      passageOrdinal: passage.passageOrdinal,
      contentSha256: digest,
      content,
    });
  }

  for (
    let ordinal = 1;
    ordinal <= validated.length;
    ordinal += 1
  ) {
    if (!seenOrdinals.has(ordinal)) {
      throw new Error(
        "knowledge passage ordinals must be contiguous",
      );
    }
  }

  return validated.sort(
    (left, right) =>
      left.passageOrdinal -
      right.passageOrdinal,
  );
}

function passagesMatch(
  stored: readonly PersistedKnowledgePassage[],
  expected:
    readonly ProcessedKnowledgePassageInput[],
): boolean {
  return (
    stored.length === expected.length &&
    stored.every((passage, index) => {
      const candidate = expected[index];

      return (
        candidate !== undefined &&
        passage.passageKey ===
          candidate.passageKey &&
        passage.passageOrdinal ===
          candidate.passageOrdinal &&
        passage.contentSha256 ===
          candidate.contentSha256 &&
        passage.content === candidate.content
      );
    })
  );
}

export function createKnowledgePassageRepository(
  database: D1DatabaseBinding,
): KnowledgePassageRepository {
  const sources =
    createKnowledgeSourceRepository(database);

  async function listBySource(
    tenantId: number,
    sourceKey: string,
  ): Promise<
    readonly PersistedKnowledgePassage[]
  > {
    const result = await database
      .prepare(LIST_SOURCE_PASSAGES_SQL)
      .bind(tenantId, sourceKey)
      .all<KnowledgePassageRow>();

    if (!result.success) {
      throw new Error(
        result.error ??
          "D1 knowledge passage read failed",
      );
    }

    return (result.results ?? []).map(
      (row) => {
        const passage = parsePassage(row);

        if (
          passage.tenantId !== tenantId ||
          passage.sourceKey !== sourceKey
        ) {
          throw new Error(
            "D1 returned a knowledge passage outside the requested scope",
          );
        }

        return passage;
      },
    );
  }

  return {
    async storeProcessedAndMarkReady(input) {
      assertPositiveInteger(
        input.tenantId,
        "tenantId",
      );
      assertPositiveInteger(
        input.expectedSourceVersion,
        "expectedSourceVersion",
      );

      if (!SOURCE_KEY_PATTERN.test(input.sourceKey)) {
        throw new Error("sourceKey is invalid");
      }

      const passages = await validatePassages(
        input.tenantId,
        input.sourceKey,
        input.passages,
      );
      const serialized = JSON.stringify(passages);
      let results;

      try {
        results = await database.batch([
          database
            .prepare(INSERT_PASSAGES_SQL)
            .bind(
              input.tenantId,
              input.sourceKey,
              input.expectedSourceVersion,
              serialized,
            ),
          database
            .prepare(MARK_SOURCE_READY_SQL)
            .bind(
              input.tenantId,
              input.sourceKey,
              input.expectedSourceVersion,
              passages.length,
              serialized,
            ),
        ]);
      } catch {
        throw new Error(
          "D1 knowledge processing write failed",
        );
      }

      if (
        results.length !== 2 ||
        results.some((result) => !result.success)
      ) {
        throw new Error(
          "D1 knowledge processing write failed",
        );
      }

      const source = await sources.findByKey(
        input.tenantId,
        input.sourceKey,
      );

      if (!source) {
        return { outcome: "not-found" };
      }

      const stored = await listBySource(
        input.tenantId,
        input.sourceKey,
      );
      const exactPassages = passagesMatch(
        stored,
        passages,
      );

      if (
        source.status === "ready" &&
        source.version ===
          input.expectedSourceVersion + 1 &&
        exactPassages
      ) {
        return {
          outcome:
            results[1]?.meta?.changes === 0
              ? "unchanged"
              : "updated",
          source,
          passages: stored,
        };
      }

      if (
        source.version !==
          input.expectedSourceVersion
      ) {
        return { outcome: "conflict" };
      }

      return { outcome: "invalid-state" };
    },

    async listApprovedBySourceKeys(
      tenantId,
      sourceKeys,
      limit,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(limit, "limit");

      if (limit > 100) {
        throw new Error(
          "limit must not exceed 100",
        );
      }

      if (
        !Array.isArray(sourceKeys) ||
        sourceKeys.length > 100 ||
        sourceKeys.some(
          (sourceKey) =>
            !SOURCE_KEY_PATTERN.test(sourceKey),
        ) ||
        new Set(sourceKeys).size !==
          sourceKeys.length
      ) {
        throw new Error("sourceKeys are invalid");
      }

      if (sourceKeys.length === 0) {
        return [];
      }

      const result = await database
        .prepare(LIST_APPROVED_PASSAGES_SQL)
        .bind(
          tenantId,
          JSON.stringify(sourceKeys),
          limit,
        )
        .all<KnowledgePassageRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 approved knowledge read failed",
        );
      }

      return (result.results ?? []).map(
        (row) => {
          const passage = parsePassage(row);

          if (
            passage.tenantId !== tenantId ||
            !sourceKeys.includes(
              passage.sourceKey,
            )
          ) {
            throw new Error(
              "D1 returned approved knowledge outside the requested scope",
            );
          }

          return passage;
        },
      );
    },
  };
}

