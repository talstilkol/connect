import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";
import {
  BotFlowInputError,
  BotFlowServiceError,
  createBotFlowService,
} from "../server/bot/botFlowService.ts";

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

async function definitionFixture(
  versionNumber = 1,
) {
  const name = "מענה ראשוני ללקוחות";
  const botFlowKey = await deriveBotFlowKey(
    7,
    name,
  );
  const triggerKey =
    await deriveBotFlowBlockKey(botFlowKey, 1);
  const textKey =
    await deriveBotFlowBlockKey(botFlowKey, 2);
  const endKey =
    await deriveBotFlowBlockKey(botFlowKey, 3);
  const definition = {
    name,
    blocks: [
      {
        blockKey: triggerKey,
        type: "trigger",
        nextBlockKey: textKey,
      },
      {
        blockKey: textKey,
        type: "text",
        text:
          versionNumber === 1
            ? "כיצד אפשר לעזור?"
            : "כיצד נוכל לעזור?",
        nextBlockKey: endKey,
      },
      {
        blockKey: endKey,
        type: "end",
      },
    ],
  };
  const botFlowVersionKey =
    await deriveBotFlowVersionKey(
      7,
      botFlowKey,
      versionNumber,
      definition,
    );

  return {
    botFlowKey,
    botFlowVersionKey,
    definition,
    versionNumber,
  };
}

function flow(
  fixture,
  overrides = {},
) {
  return {
    botFlowKey: fixture.botFlowKey,
    tenantId: 7,
    name: fixture.definition.name,
    status: "draft",
    latestVersionKey:
      fixture.botFlowVersionKey,
    latestVersionNumber:
      fixture.versionNumber,
    activeVersionKey: null,
    version: fixture.versionNumber,
    createdAt: "2026-07-26 09:00:00",
    updatedAt: "2026-07-26 09:00:00",
    ...overrides,
  };
}

function version(
  fixture,
  overrides = {},
) {
  return {
    botFlowVersionKey:
      fixture.botFlowVersionKey,
    botFlowKey: fixture.botFlowKey,
    tenantId: 7,
    versionNumber: fixture.versionNumber,
    status: "draft",
    definition: {
      name: fixture.definition.name,
      entryBlockKey:
        fixture.definition.blocks[0].blockKey,
      blocks: [...fixture.definition.blocks].sort(
        (first, second) =>
          first.blockKey < second.blockKey
            ? -1
            : first.blockKey >
                second.blockKey
              ? 1
              : 0,
      ),
    },
    publishedAt: null,
    createdAt: "2026-07-26 09:00:00",
    ...overrides,
  };
}

function repositoryFixture(options = {}) {
  const calls = {
    findFlows: [],
    findVersions: [],
    lists: [],
    versionLists: [],
    saves: [],
    publications: [],
  };
  const repository = {
    async findByKey(tenantId, botFlowKey) {
      calls.findFlows.push({
        tenantId,
        botFlowKey,
      });

      if (options.findFlowError) {
        throw options.findFlowError;
      }

      return options.findFlow ?? null;
    },
    async findVersionByKey(
      tenantId,
      botFlowKey,
      botFlowVersionKey,
    ) {
      calls.findVersions.push({
        tenantId,
        botFlowKey,
        botFlowVersionKey,
      });

      if (options.findVersionError) {
        throw options.findVersionError;
      }

      return options.findVersion ?? null;
    },
    async listByTenant(tenantId, limit) {
      calls.lists.push({ tenantId, limit });

      if (options.listError) {
        throw options.listError;
      }

      return options.flows ?? [];
    },
    async listVersions(
      tenantId,
      botFlowKey,
      limit,
    ) {
      calls.versionLists.push({
        tenantId,
        botFlowKey,
        limit,
      });

      if (options.versionListError) {
        throw options.versionListError;
      }

      return options.versions ?? [];
    },
    async saveDraft(input) {
      calls.saves.push(input);

      if (options.saveError) {
        throw options.saveError;
      }

      if (options.saveResult) {
        return options.saveResult;
      }

      const storedFixture = {
        botFlowKey: input.botFlowKey,
        botFlowVersionKey:
          input.botFlowVersionKey,
        definition: input.definition,
        versionNumber: input.versionNumber,
      };

      return {
        outcome:
          input.expectedFlowVersion === null
            ? "created"
            : "updated",
        flow: flow(storedFixture, {
          version:
            input.expectedFlowVersion === null
              ? 1
              : input.expectedFlowVersion + 1,
        }),
        draftVersion: version(storedFixture),
      };
    },
    async publishDraft(
      tenantId,
      botFlowKey,
      botFlowVersionKey,
      expectedFlowVersion,
    ) {
      calls.publications.push({
        tenantId,
        botFlowKey,
        botFlowVersionKey,
        expectedFlowVersion,
      });

      if (options.publishError) {
        throw options.publishError;
      }

      return (
        options.publishResult ?? {
          outcome: "not-found",
        }
      );
    },
  };

  return {
    calls,
    service: createBotFlowService(repository),
  };
}

test("lists and reads bot flows only through tenant read scope", async () => {
  const fixture = await definitionFixture();
  const repository = repositoryFixture({
    flows: [flow(fixture)],
    findFlow: flow(fixture),
    versions: [version(fixture)],
  });

  const listed = await repository.service.list(
    session("viewer"),
  );
  const details =
    await repository.service.readDetails(
      session("viewer"),
      fixture.botFlowKey,
    );

  assert.equal(listed.length, 1);
  assert.equal(details.versions.length, 1);
  assert.deepEqual(repository.calls.lists, [
    { tenantId: 7, limit: 100 },
  ]);
  assert.deepEqual(
    repository.calls.versionLists,
    [
      {
        tenantId: 7,
        botFlowKey: fixture.botFlowKey,
        limit: 100,
      },
    ],
  );
});

test("derives tenant, flow, first version, and canonical definition on create", async () => {
  const fixture = await definitionFixture();
  const repository = repositoryFixture();

  const saved =
    await repository.service.saveDraft(
      session(),
      {
        definition: fixture.definition,
        expectedFlowVersion: null,
      },
    );

  assert.equal(saved.outcome, "created");
  assert.equal(repository.calls.saves.length, 1);
  assert.deepEqual(
    {
      tenantId:
        repository.calls.saves[0].tenantId,
      botFlowKey:
        repository.calls.saves[0].botFlowKey,
      botFlowVersionKey:
        repository.calls.saves[0]
          .botFlowVersionKey,
      versionNumber:
        repository.calls.saves[0].versionNumber,
      expectedFlowVersion:
        repository.calls.saves[0]
          .expectedFlowVersion,
    },
    {
      tenantId: 7,
      botFlowKey: fixture.botFlowKey,
      botFlowVersionKey:
        fixture.botFlowVersionKey,
      versionNumber: 1,
      expectedFlowVersion: null,
    },
  );
  assert.equal(
    repository.calls.saves[0].definition
      .entryBlockKey,
    fixture.definition.blocks[0].blockKey,
  );
});

test("accepts the bounded composer request and derives every graph key on the server", async () => {
  const repository = repositoryFixture();

  await repository.service.saveDraft(
    session(),
    {
      name: "מענה לפניות שירות",
      keywords: ["עזרה", "שירות"],
      matchMode: "contains",
      replyText: "קיבלנו את פנייתך.",
      expectedFlowVersion: null,
    },
  );

  assert.equal(
    repository.calls.saves.length,
    1,
  );
  assert.equal(
    repository.calls.saves[0].tenantId,
    7,
  );
  assert.equal(
    repository.calls.saves[0]
      .definition.blocks.length,
    5,
  );
  assert.deepEqual(
    new Set(
      repository.calls.saves[0]
        .definition.blocks.map(
          (block) => block.type,
        ),
    ),
    new Set([
      "trigger",
      "keyword",
      "text",
      "end",
      "handoff",
    ]),
  );
});

test("accepts an ordered reply sequence without accepting browser block keys", async () => {
  const repository = repositoryFixture();

  await repository.service.saveDraft(
    session(),
    {
      name: "מענה מדורג לפניות שירות",
      keywords: ["עזרה", "שירות"],
      matchMode: "contains",
      replyTexts: [
        "קיבלנו את פנייתך.",
        "נציג יחזור אליך בהקדם.",
        "אין צורך לשלוח הודעה נוספת.",
      ],
      expectedFlowVersion: null,
    },
  );

  assert.equal(repository.calls.saves.length, 1);
  assert.equal(
    repository.calls.saves[0]
      .definition.blocks.length,
    7,
  );
  assert.equal(
    repository.calls.saves[0]
      .definition.blocks.filter(
        (block) => block.type === "text",
      ).length,
    3,
  );
  assert.ok(
    repository.calls.saves[0]
      .definition.blocks.every(
        (block) =>
          /^bot_block_v1_[0-9a-f]{64}$/.test(
            block.blockKey,
          ),
      ),
  );
});

test("accepts a button menu while deriving block and option identities only on the server", async () => {
  const repository = repositoryFixture();

  await repository.service.saveDraft(
    session(),
    {
      name: "ניתוב למחלקה",
      keywords: ["עזרה", "שירות"],
      matchMode: "exact",
      introTexts: [
        "קיבלנו את פנייתך.",
        "בחרו מחלקה.",
      ],
      buttonText: "באיזו מחלקה לבחור?",
      options: [
        {
          label: "מכירות",
          replyText: "נעביר למכירות.",
        },
        {
          label: "שירות",
          replyText: "נעביר לשירות.",
        },
      ],
      expectedFlowVersion: null,
    },
  );

  assert.equal(repository.calls.saves.length, 1);
  const definition =
    repository.calls.saves[0].definition;
  const buttonBlock = definition.blocks.find(
    (block) => block.type === "buttons",
  );

  assert.equal(definition.blocks.length, 9);
  assert.ok(
    definition.blocks.every((block) =>
      /^bot_block_v1_[0-9a-f]{64}$/.test(
        block.blockKey,
      ),
    ),
  );
  assert.ok(buttonBlock);
  assert.ok(
    buttonBlock.options.every((option) =>
      /^bot_option_v1_[0-9a-f]{64}$/.test(
        option.optionKey,
      ),
    ),
  );
});

test("accepts two sequential button questions while deriving every graph identity on the server", async () => {
  const repository = repositoryFixture();

  await repository.service.saveDraft(
    session(),
    {
      name: "ניתוב מדורג למחלקה",
      keywords: ["עזרה", "שירות"],
      matchMode: "exact",
      introTexts: ["נמצא יחד את המחלקה המתאימה."],
      firstButtonText: "באיזה נושא הפנייה?",
      branches: [
        {
          label: "חשבונות",
          buttonText: "איזו פעולת חשבון נדרשת?",
          options: [
            {
              label: "חשבונית",
              replyText: "נעביר לטיפול בחשבוניות.",
            },
            {
              label: "זיכוי",
              replyText: "נעביר לטיפול בזיכויים.",
            },
          ],
        },
        {
          label: "תמיכה",
          buttonText: "באיזה מוצר נדרשת תמיכה?",
          options: [
            {
              label: "אתר",
              replyText: "נעביר לתמיכת האתר.",
            },
          ],
        },
      ],
      expectedFlowVersion: null,
    },
  );

  assert.equal(repository.calls.saves.length, 1);
  const definition =
    repository.calls.saves[0].definition;
  const buttonBlocks = definition.blocks.filter(
    (block) => block.type === "buttons",
  );
  const optionKeys = buttonBlocks.flatMap(
    (block) =>
      block.options.map(
        (option) => option.optionKey,
      ),
  );

  assert.equal(definition.blocks.length, 11);
  assert.equal(buttonBlocks.length, 3);
  assert.equal(optionKeys.length, 5);
  assert.equal(new Set(optionKeys).size, 5);
  assert.ok(
    definition.blocks.every((block) =>
      /^bot_block_v1_[0-9a-f]{64}$/.test(
        block.blockKey,
      ),
    ),
  );
  assert.ok(
    optionKeys.every((optionKey) =>
      /^bot_option_v1_[0-9a-f]{64}$/.test(
        optionKey,
      ),
    ),
  );
});

test("accepts a bounded condition while deriving every branch identity on the server", async () => {
  const repository = repositoryFixture();

  await repository.service.saveDraft(
    session(),
    {
      name: "פיצול מענה לפי מצב שיחה",
      keywords: ["בדיקה"],
      matchMode: "exact",
      introTexts: ["הבקשה התקבלה."],
      condition: {
        fact: "conversation-status",
        operator: "equals",
        value: "bot_active",
        matchedReplyText: "הבוט ממשיך בטיפול.",
        unmatchedReplyText: "הטיפול ייבדק מחדש.",
      },
      expectedFlowVersion: null,
    },
  );

  assert.equal(repository.calls.saves.length, 1);
  const definition =
    repository.calls.saves[0].definition;
  const condition = definition.blocks.find(
    (block) => block.type === "condition",
  );

  assert.equal(definition.blocks.length, 8);
  assert.ok(condition);
  assert.ok(
    definition.blocks.every((block) =>
      /^bot_block_v1_[0-9a-f]{64}$/.test(
        block.blockKey,
      ),
    ),
  );
  assert.notEqual(
    condition.matchedBlockKey,
    condition.unmatchedBlockKey,
  );
});

test("accepts a keyword handoff that contains no reply block", async () => {
  const repository = repositoryFixture();

  await repository.service.saveDraft(
    session(),
    {
      name: "בקשה לדבר עם נציג",
      keywords: ["נציג", "אדם"],
      matchMode: "contains",
      handoffReason: "customer-request",
      expectedFlowVersion: null,
    },
  );

  assert.equal(repository.calls.saves.length, 1);
  const definition =
    repository.calls.saves[0].definition;
  const keyword = definition.blocks.find(
    (block) => block.type === "keyword",
  );

  assert.equal(definition.blocks.length, 4);
  assert.equal(
    definition.blocks.some(
      (block) => block.type === "text",
    ),
    false,
  );
  assert.equal(
    definition.blocks.find(
      (block) =>
        block.blockKey ===
        keyword.matchedBlockKey,
    ).type,
    "handoff",
  );
  assert.equal(
    definition.blocks.find(
      (block) =>
        block.blockKey ===
        keyword.unmatchedBlockKey,
    ).type,
    "end",
  );
});

test("accepts a free graph draft while deriving every persisted identity on the server", async () => {
  const repository = repositoryFixture();

  await repository.service.saveDraft(
    session(),
    {
      name: "ניתוב חופשי",
      keywords: ["ניתוב"],
      matchMode: "contains",
      entryDraftNodeKey: "draft_node_v1_1",
      nodes: [
        {
          draftNodeKey: "draft_node_v1_1",
          type: "condition",
          fact: "last-inbound-text",
          operator: "contains",
          value: "חיוב",
          matchedDraftNodeKey:
            "draft_node_v1_2",
          unmatchedDraftNodeKey:
            "draft_node_v1_4",
        },
        {
          draftNodeKey: "draft_node_v1_2",
          type: "text",
          text: "הפנייה תועבר לבדיקת חיוב.",
          nextDraftNodeKey: "draft_node_v1_3",
        },
        {
          draftNodeKey: "draft_node_v1_3",
          type: "end",
        },
        {
          draftNodeKey: "draft_node_v1_4",
          type: "handoff",
          reason: "flow-rule",
        },
      ],
      expectedFlowVersion: null,
    },
  );

  assert.equal(repository.calls.saves.length, 1);
  const definition =
    repository.calls.saves[0].definition;

  assert.equal(definition.blocks.length, 7);
  assert.ok(
    definition.blocks.every((block) =>
      /^bot_block_v1_[0-9a-f]{64}$/.test(
        block.blockKey,
      ),
    ),
  );
  assert.equal(
    JSON.stringify(definition).includes(
      "draft_node_v1_",
    ),
    false,
  );
});

test("derives the next version from stored state without accepting a browser ordinal", async () => {
  const first = await definitionFixture(1);
  const second = await definitionFixture(2);
  const repository = repositoryFixture({
    findFlow: flow(first, {
      version: 2,
    }),
  });

  await repository.service.saveDraft(
    session(),
    {
      definition: second.definition,
      expectedFlowVersion: 2,
    },
  );

  assert.equal(
    repository.calls.saves[0].versionNumber,
    2,
  );
  assert.equal(
    repository.calls.saves[0]
      .botFlowVersionKey,
    second.botFlowVersionKey,
  );
});

test("preserves an identical save retry behind the original expected version", async () => {
  const second = await definitionFixture(2);
  const unchanged = {
    outcome: "unchanged",
    flow: flow(second, { version: 3 }),
    draftVersion: version(second),
  };
  const repository = repositoryFixture({
    findFlow: flow(second, { version: 3 }),
    saveResult: unchanged,
  });

  const result =
    await repository.service.saveDraft(
      session(),
      {
        definition: second.definition,
        expectedFlowVersion: 2,
      },
    );

  assert.equal(result.outcome, "unchanged");
  assert.equal(
    repository.calls.saves[0].versionNumber,
    2,
  );
});

test("rejects malformed or extended draft input before repository access", async () => {
  const fixture = await definitionFixture();
  const repository = repositoryFixture();

  await assert.rejects(
    repository.service.saveDraft(
      session(),
      {
        definition: fixture.definition,
        expectedFlowVersion: null,
        tenantId: 9,
      },
    ),
    (error) =>
      error instanceof BotFlowInputError &&
      error.issues.includes("invalid-input"),
  );
  assert.deepEqual(repository.calls.saves, []);
  assert.deepEqual(
    repository.calls.findFlows,
    [],
  );
});

test("publishes only a stored version whose deterministic identity is valid", async () => {
  const fixture = await definitionFixture();
  const publishedFlow = flow(fixture, {
    status: "active",
    activeVersionKey:
      fixture.botFlowVersionKey,
    version: 2,
  });
  const publishedVersion = version(fixture, {
    status: "published",
    publishedAt: "2026-07-26 09:05:00",
  });
  const repository = repositoryFixture({
    findVersion: version(fixture),
    publishResult: {
      outcome: "updated",
      flow: publishedFlow,
      publishedVersion,
    },
  });

  const result =
    await repository.service.publishDraft(
      session(),
      {
        botFlowKey: fixture.botFlowKey,
        botFlowVersionKey:
          fixture.botFlowVersionKey,
        expectedFlowVersion: 1,
      },
    );

  assert.equal(result.outcome, "updated");
  assert.deepEqual(
    repository.calls.publications,
    [
      {
        tenantId: 7,
        botFlowKey: fixture.botFlowKey,
        botFlowVersionKey:
          fixture.botFlowVersionKey,
        expectedFlowVersion: 1,
      },
    ],
  );
});

test("maps repository outcomes to bounded service errors", async () => {
  const fixture = await definitionFixture();
  const cases = [
    ["not-found", "NOT_FOUND"],
    ["conflict", "STATE_CONFLICT"],
    ["invalid-state", "INVALID_STATE"],
  ];

  for (const [outcome, code] of cases) {
    const repository = repositoryFixture({
      findVersion: version(fixture),
      publishResult: { outcome },
    });

    await assert.rejects(
      repository.service.publishDraft(
        session(),
        {
          botFlowKey: fixture.botFlowKey,
          botFlowVersionKey:
            fixture.botFlowVersionKey,
          expectedFlowVersion: 1,
        },
      ),
      (error) =>
        error instanceof BotFlowServiceError &&
        error.code === code,
    );
  }
});

test("fails closed when a stored version does not match its deterministic key", async () => {
  const fixture = await definitionFixture();
  const repository = repositoryFixture({
    findVersion: {
      ...version(fixture),
      definition: {
        ...version(fixture).definition,
        name: "Flow אחר",
      },
    },
  });

  await assert.rejects(
    repository.service.publishDraft(
      session(),
      {
        botFlowKey: fixture.botFlowKey,
        botFlowVersionKey:
          fixture.botFlowVersionKey,
        expectedFlowVersion: 1,
      },
    ),
    (error) =>
      error instanceof BotFlowServiceError &&
      error.code === "PERSISTENCE_FAILED",
  );
  assert.deepEqual(
    repository.calls.publications,
    [],
  );
});

test("enforces bot read and write permissions before repository access", async () => {
  const fixture = await definitionFixture();
  const repository = repositoryFixture();

  await assert.rejects(
    repository.service.list(session("agent")),
    (error) => error.code === "PERMISSION_DENIED",
  );
  await assert.rejects(
    repository.service.saveDraft(
      session("viewer"),
      {
        definition: fixture.definition,
        expectedFlowVersion: null,
      },
    ),
    (error) => error.code === "PERMISSION_DENIED",
  );

  assert.deepEqual(repository.calls.lists, []);
  assert.deepEqual(repository.calls.saves, []);
});

test("sanitizes repository failures as persistence errors", async () => {
  const repository = repositoryFixture({
    listError: new Error(
      "private database detail",
    ),
  });

  await assert.rejects(
    repository.service.list(session()),
    (error) =>
      error instanceof BotFlowServiceError &&
      error.code === "PERSISTENCE_FAILED" &&
      !error.message.includes("private"),
  );
});

test("fails closed when list or details contain inconsistent stored identities", async () => {
  const fixture = await definitionFixture();
  const invalidFlow = flow(fixture, {
    name: "מענה ששייך למפתח אחר",
  });
  const invalidVersion = version(fixture, {
    definition: {
      ...version(fixture).definition,
      name: "מענה ששייך לגרסה אחרת",
    },
  });
  const listRepository = repositoryFixture({
    flows: [invalidFlow],
  });
  const detailsRepository = repositoryFixture({
    findFlow: flow(fixture),
    versions: [invalidVersion],
  });

  await assert.rejects(
    listRepository.service.list(session()),
    (error) =>
      error instanceof BotFlowServiceError &&
      error.code === "PERSISTENCE_FAILED",
  );
  await assert.rejects(
    detailsRepository.service.readDetails(
      session(),
      fixture.botFlowKey,
    ),
    (error) =>
      error instanceof BotFlowServiceError &&
      error.code === "PERSISTENCE_FAILED",
  );
});
