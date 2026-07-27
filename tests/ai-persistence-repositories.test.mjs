import assert from "node:assert/strict";
import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  DatabaseSync,
} from "node:sqlite";
import test from "node:test";

import {
  createAiAgentRepository,
} from "../db/aiAgentRepository.ts";
import {
  createKnowledgeSourceRepository,
} from "../db/knowledgeSourceRepository.ts";
import {
  createKnowledgePassageRepository,
} from "../db/knowledgePassageRepository.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgePassageKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";

class SqliteD1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return (
      this.statement.get(...this.values) ??
      null
    );
  }

  async all() {
    return {
      success: true,
      results: this.statement.all(
        ...this.values,
      ),
    };
  }

  async run() {
    const result = this.statement.run(
      ...this.values,
    );

    return {
      success: true,
      meta: {
        changes: Number(result.changes),
      },
    };
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(
      this.database.prepare(sql),
    );
  }

  async batch(statements) {
    const results = [];

    this.database.exec("BEGIN IMMEDIATE");

    try {
      for (const statement of statements) {
        results.push(await statement.run());
      }

      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

async function createFixture() {
  const migrationDirectory = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrationFiles = (
    await readdir(migrationDirectory)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();
  const database = new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON");

  for (const fileName of migrationFiles) {
    const migration = await readFile(
      new URL(fileName, migrationDirectory),
      "utf8",
    );

    for (const statement of migration.split(
      "--> statement-breakpoint",
    )) {
      if (statement.trim()) {
        database.exec(statement);
      }
    }
  }

  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-one");
  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?)",
    )
    .run("tenant-two");

  const d1 = new SqliteD1Database(database);

  return {
    database,
    sources:
      createKnowledgeSourceRepository(d1),
    passages:
      createKnowledgePassageRepository(d1),
    agents: createAiAgentRepository(d1),
  };
}

async function registerSource(
  fixture,
  tenantId = 1,
  digestCharacter = "a",
) {
  const contentSha256 =
    digestCharacter.repeat(64);
  const sourceKey =
    await deriveKnowledgeSourceKey(
      tenantId,
      contentSha256,
    );
  const result =
    await fixture.sources.registerUploaded({
      tenantId,
      sourceKey,
      contentSha256,
      fileName: "  מסמך-שירות.pdf  ",
      mediaType: " APPLICATION/PDF ",
      sizeBytes: 4_096,
    });

  return {
    sourceKey,
    contentSha256,
    result,
  };
}

async function processedPassage(
  tenantId,
  sourceKey,
  passageOrdinal,
  content,
) {
  const contentSha256 = await sha256Hex(
    new TextEncoder().encode(content),
  );
  const passageKey =
    await deriveKnowledgePassageKey(
      tenantId,
      sourceKey,
      passageOrdinal,
      contentSha256,
    );

  return {
    passageKey,
    passageOrdinal,
    contentSha256,
    content,
  };
}

function agentDefinition(
  sourceKeys,
  overrides = {},
) {
  return {
    name: "מענה מבוסס ידע",
    systemPrompt:
      "יש לענות רק על בסיס מקורות ידע מאושרים.",
    handoffMessage:
      "לא נמצא מידע מאושר. השיחה עוברת לנציג.",
    responseMode: null,
    minimumGroundingScoreBasisPoints: null,
    monthlyCostLimitMinorUnits: null,
    billingCurrency: null,
    knowledgeSourceKeys: sourceKeys,
    ...overrides,
  };
}

async function agentIdentity(
  tenantId,
  versionNumber,
  definition,
) {
  const aiAgentKey = await deriveAiAgentKey(
    tenantId,
    definition.name,
  );
  const aiAgentVersionKey =
    await deriveAiAgentVersionKey(
      tenantId,
      aiAgentKey,
      versionNumber,
      definition,
    );

  return {
    aiAgentKey,
    aiAgentVersionKey,
  };
}

test("registers tenant-scoped source metadata idempotently without storing file bytes", async () => {
  const fixture = await createFixture();
  const first = await registerSource(fixture);
  const repeated =
    await fixture.sources.registerUploaded({
      tenantId: 1,
      sourceKey: first.sourceKey,
      contentSha256: first.contentSha256,
      fileName: "מסמך-שירות.pdf",
      mediaType: "application/pdf",
      sizeBytes: 4_096,
    });

  assert.equal(first.result.outcome, "created");
  assert.equal(
    first.result.source.status,
    "pending-validation",
  );
  assert.equal(
    first.result.source.storageObjectKey,
    `knowledge/v1/${first.sourceKey}`,
  );
  assert.equal(repeated.outcome, "unchanged");
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM knowledge_sources",
      )
      .get().count,
    1,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM pragma_table_info('knowledge_sources') WHERE name IN ('file_bytes', 'content_blob')",
      )
      .get().count,
    0,
  );
});

test("advances source processing explicitly and treats retries deterministically", async () => {
  const fixture = await createFixture();
  const source = await registerSource(fixture);
  const validation =
    await fixture.sources.transition({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedVersion: 1,
      action: "validation-passed",
      errorCode: null,
    });
  const scanning =
    await fixture.sources.transition({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedVersion: 2,
      action: "scan-started",
      errorCode: null,
    });
  const passage = await processedPassage(
    1,
    source.sourceKey,
    1,
    "שעות הפעילות מפורסמות במערכת השירות.",
  );
  const ready =
    await fixture.passages.storeProcessedAndMarkReady({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedSourceVersion: 3,
      passages: [passage],
    });
  const retry =
    await fixture.passages.storeProcessedAndMarkReady({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedSourceVersion: 3,
      passages: [passage],
    });
  const archived =
    await fixture.sources.transition({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedVersion: 4,
      action: "archive",
      errorCode: null,
    });

  assert.equal(
    validation.source.status,
    "pending-scan",
  );
  assert.equal(scanning.source.status, "scanning");
  assert.equal(ready.outcome, "updated");
  assert.equal(ready.source.status, "ready");
  assert.equal(ready.passages.length, 1);
  assert.equal(typeof ready.source.readyAt, "string");
  assert.equal(retry.outcome, "unchanged");
  assert.equal(archived.source.status, "archived");
  assert.equal(
    archived.source.readyAt,
    ready.source.readyAt,
  );
});

test("claims one scanning-source recovery behind the expected version", async () => {
  const fixture = await createFixture();
  const source = await registerSource(
    fixture,
    1,
    "e",
  );

  await fixture.sources.transition({
    tenantId: 1,
    sourceKey: source.sourceKey,
    expectedVersion: 1,
    action: "validation-passed",
    errorCode: null,
  });
  await fixture.sources.transition({
    tenantId: 1,
    sourceKey: source.sourceKey,
    expectedVersion: 2,
    action: "scan-started",
    errorCode: null,
  });

  const claimed =
    await fixture.sources.transition({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedVersion: 3,
      action: "scan-retry-started",
      errorCode: null,
    });
  const stale =
    await fixture.sources.transition({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedVersion: 3,
      action: "scan-retry-started",
      errorCode: null,
    });

  assert.equal(claimed.outcome, "updated");
  assert.equal(
    claimed.source.status,
    "scanning",
  );
  assert.equal(claimed.source.version, 4);
  assert.equal(stale.outcome, "conflict");
});

test("keeps a scanning source fail-closed until verified passages are stored atomically", async () => {
  const fixture = await createFixture();
  const source = await registerSource(
    fixture,
    1,
    "f",
  );

  await fixture.sources.transition({
    tenantId: 1,
    sourceKey: source.sourceKey,
    expectedVersion: 1,
    action: "validation-passed",
    errorCode: null,
  });
  await fixture.sources.transition({
    tenantId: 1,
    sourceKey: source.sourceKey,
    expectedVersion: 2,
    action: "scan-started",
    errorCode: null,
  });

  await assert.rejects(
    fixture.sources.transition({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedVersion: 3,
      action: "ready",
      errorCode: null,
    }),
    /action is invalid/,
  );
  const passage = await processedPassage(
    1,
    source.sourceKey,
    1,
    "המקור המאושר מכיל מידע תפעולי.",
  );
  const stored =
    await fixture.passages.storeProcessedAndMarkReady({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedSourceVersion: 3,
      passages: [passage],
    });

  assert.equal(stored.outcome, "updated");
  assert.equal(stored.source.status, "ready");
});

test("retrieves only ready passages from the exact tenant and selected sources", async () => {
  const fixture = await createFixture();
  const readySource = await registerSource(
    fixture,
    1,
    "1",
  );
  const scanningSource = await registerSource(
    fixture,
    1,
    "2",
  );
  const otherTenantSource =
    await registerSource(fixture, 2, "3");

  for (const source of [
    readySource,
    scanningSource,
    otherTenantSource,
  ]) {
    const tenantId =
      source === otherTenantSource ? 2 : 1;

    await fixture.sources.transition({
      tenantId,
      sourceKey: source.sourceKey,
      expectedVersion: 1,
      action: "validation-passed",
      errorCode: null,
    });
    await fixture.sources.transition({
      tenantId,
      sourceKey: source.sourceKey,
      expectedVersion: 2,
      action: "scan-started",
      errorCode: null,
    });
  }

  const readyPassage = await processedPassage(
    1,
    readySource.sourceKey,
    1,
    "מידע מאושר לדיירי tenant אחד.",
  );
  const otherTenantPassage =
    await processedPassage(
      2,
      otherTenantSource.sourceKey,
      1,
      "מידע מאושר לדיירי tenant שני.",
    );

  await fixture.passages.storeProcessedAndMarkReady({
    tenantId: 1,
    sourceKey: readySource.sourceKey,
    expectedSourceVersion: 3,
    passages: [readyPassage],
  });
  await fixture.passages.storeProcessedAndMarkReady({
    tenantId: 2,
    sourceKey: otherTenantSource.sourceKey,
    expectedSourceVersion: 3,
    passages: [otherTenantPassage],
  });

  const approved =
    await fixture.passages.listApprovedBySourceKeys(
      1,
      [
        scanningSource.sourceKey,
        readySource.sourceKey,
      ],
      10,
    );

  assert.deepEqual(
    approved.map((passage) => passage.passageKey),
    [readyPassage.passageKey],
  );
  assert.equal(approved[0].tenantId, 1);
  assert.doesNotMatch(
    approved[0].content,
    /tenant שני/,
  );
});

test("rejects unsafe source transitions and records only a bounded error code", async () => {
  const fixture = await createFixture();
  const source = await registerSource(fixture);
  const invalid =
    await fixture.sources.transition({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedVersion: 1,
      action: "scan-started",
      errorCode: null,
    });
  const rejected =
    await fixture.sources.transition({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedVersion: 1,
      action: "rejected",
      errorCode: "FILE_VALIDATION_FAILED",
    });

  assert.deepEqual(invalid, {
    outcome: "invalid-state",
  });
  assert.equal(rejected.outcome, "updated");
  assert.equal(rejected.source.status, "rejected");
  assert.equal(
    rejected.source.lastErrorCode,
    "FILE_VALIDATION_FAILED",
  );
  await assert.rejects(
    fixture.sources.transition({
      tenantId: 1,
      sourceKey: source.sourceKey,
      expectedVersion: 2,
      action: "archive",
      errorCode: "NOT_ALLOWED_HERE",
    }),
    /errorCode/,
  );
});

test("stores an immutable AI draft and exact tenant-scoped source links atomically", async () => {
  const fixture = await createFixture();
  const source = await registerSource(fixture);
  const definition = agentDefinition([
    source.sourceKey,
  ]);
  const identity = await agentIdentity(
    1,
    1,
    definition,
  );
  const result = await fixture.agents.saveDraft({
    tenantId: 1,
    ...identity,
    versionNumber: 1,
    expectedAgentVersion: null,
    definition,
  });

  assert.equal(result.outcome, "created");
  assert.equal(result.agent.status, "draft");
  assert.equal(
    result.draftVersion.status,
    "draft",
  );
  assert.deepEqual(
    result.draftVersion.definition
      .knowledgeSourceKeys,
    [source.sourceKey],
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM ai_agent_version_sources WHERE tenant_id = 1",
      )
      .get().count,
    1,
  );
  assert.doesNotMatch(
    fixture.database
      .prepare(
        "SELECT definition_json AS definitionJson FROM ai_agent_versions LIMIT 1",
      )
      .get().definitionJson,
    /tenantId|apiKey|providerSecret|providerPayload/,
  );
});

test("preserves identical retries and appends a new version only behind expected state", async () => {
  const fixture = await createFixture();
  const source = await registerSource(fixture);
  const firstDefinition = agentDefinition([
    source.sourceKey,
  ]);
  const firstIdentity = await agentIdentity(
    1,
    1,
    firstDefinition,
  );
  const firstInput = {
    tenantId: 1,
    ...firstIdentity,
    versionNumber: 1,
    expectedAgentVersion: null,
    definition: firstDefinition,
  };

  assert.equal(
    (await fixture.agents.saveDraft(firstInput))
      .outcome,
    "created",
  );
  assert.equal(
    (await fixture.agents.saveDraft(firstInput))
      .outcome,
    "unchanged",
  );

  const secondDefinition = agentDefinition(
    [source.sourceKey],
    {
      handoffMessage:
        "המידע אינו זמין. השיחה עוברת לנציג.",
    },
  );
  const secondIdentity = await agentIdentity(
    1,
    2,
    secondDefinition,
  );
  const updated = await fixture.agents.saveDraft({
    tenantId: 1,
    ...secondIdentity,
    versionNumber: 2,
    expectedAgentVersion: 1,
    definition: secondDefinition,
  });
  const versions =
    await fixture.agents.listVersions(
      1,
      firstIdentity.aiAgentKey,
      10,
    );

  assert.equal(updated.outcome, "updated");
  assert.equal(updated.agent.version, 2);
  assert.equal(
    updated.agent.latestVersionNumber,
    2,
  );
  assert.deepEqual(
    versions.map(
      (version) => version.versionNumber,
    ),
    [2, 1],
  );
});

test("publishes the latest AI draft atomically and archives the previously published version", async () => {
  const fixture = await createFixture();
  const source = await registerSource(fixture);
  const firstDefinition = agentDefinition(
    [source.sourceKey],
    {
      responseMode: "agent-approval",
      minimumGroundingScoreBasisPoints:
        8_000,
      monthlyCostLimitMinorUnits: 50_000,
      billingCurrency: "ILS",
    },
  );
  const firstIdentity = await agentIdentity(
    1,
    1,
    firstDefinition,
  );

  await fixture.agents.saveDraft({
    tenantId: 1,
    ...firstIdentity,
    versionNumber: 1,
    expectedAgentVersion: null,
    definition: firstDefinition,
  });
  const firstPublication =
    await fixture.agents.publishDraft(
      1,
      firstIdentity.aiAgentKey,
      firstIdentity.aiAgentVersionKey,
      1,
    );
  const firstRetry =
    await fixture.agents.publishDraft(
      1,
      firstIdentity.aiAgentKey,
      firstIdentity.aiAgentVersionKey,
      1,
    );
  const secondDefinition = agentDefinition(
    [source.sourceKey],
    {
      ...firstDefinition,
      handoffMessage:
        "אין כרגע תשובה מאושרת. השיחה עוברת לנציג.",
    },
  );
  const secondIdentity = await agentIdentity(
    1,
    2,
    secondDefinition,
  );

  await fixture.agents.saveDraft({
    tenantId: 1,
    ...secondIdentity,
    versionNumber: 2,
    expectedAgentVersion: 2,
    definition: secondDefinition,
  });
  const secondPublication =
    await fixture.agents.publishDraft(
      1,
      secondIdentity.aiAgentKey,
      secondIdentity.aiAgentVersionKey,
      3,
    );
  const versions =
    await fixture.agents.listVersions(
      1,
      firstIdentity.aiAgentKey,
      10,
    );
  const activeAgents =
    await fixture.agents.listActiveByTenant(
      1,
      2,
    );

  assert.equal(
    firstPublication.outcome,
    "updated",
  );
  assert.equal(firstRetry.outcome, "unchanged");
  assert.equal(
    secondPublication.outcome,
    "updated",
  );
  assert.equal(
    secondPublication.agent.activeVersionKey,
    secondIdentity.aiAgentVersionKey,
  );
  assert.deepEqual(
    versions.map((version) => ({
      number: version.versionNumber,
      status: version.status,
    })),
    [
      { number: 2, status: "published" },
      { number: 1, status: "archived" },
    ],
  );
  assert.deepEqual(
    activeAgents.map((agent) => ({
      key: agent.aiAgentKey,
      activeVersionKey:
        agent.activeVersionKey,
    })),
    [
      {
        key: firstIdentity.aiAgentKey,
        activeVersionKey:
          secondIdentity.aiAgentVersionKey,
      },
    ],
  );
});

test("fails closed when a draft references a missing or cross-tenant source", async () => {
  const fixture = await createFixture();
  const tenantTwoSource =
    await registerSource(fixture, 2, "b");
  const definition = agentDefinition([
    tenantTwoSource.sourceKey,
  ]);
  const identity = await agentIdentity(
    1,
    1,
    definition,
  );
  const result = await fixture.agents.saveDraft({
    tenantId: 1,
    ...identity,
    versionNumber: 1,
    expectedAgentVersion: null,
    definition,
  });

  assert.deepEqual(result, {
    outcome: "conflict",
  });
  assert.equal(
    await fixture.agents.findByKey(
      1,
      identity.aiAgentKey,
    ),
    null,
  );
  assert.deepEqual(
    await fixture.agents.listByTenant(2, 10),
    [],
  );
});

test("rejects stored version data when relational source links no longer match the immutable definition", async () => {
  const fixture = await createFixture();
  const source = await registerSource(fixture);
  const definition = agentDefinition([
    source.sourceKey,
  ]);
  const identity = await agentIdentity(
    1,
    1,
    definition,
  );

  await fixture.agents.saveDraft({
    tenantId: 1,
    ...identity,
    versionNumber: 1,
    expectedAgentVersion: null,
    definition,
  });
  fixture.database
    .prepare(
      "DELETE FROM ai_agent_version_sources WHERE tenant_id = 1 AND ai_agent_version_key = ?",
    )
    .run(identity.aiAgentVersionKey);

  await assert.rejects(
    fixture.agents.findVersionByKey(
      1,
      identity.aiAgentKey,
      identity.aiAgentVersionKey,
    ),
    /sources/,
  );
});
