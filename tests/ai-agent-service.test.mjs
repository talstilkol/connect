import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  AiAgentActivationError,
  AiAgentInputError,
  AiAgentServiceError,
  createAiAgentService,
} from "../server/ai/aiAgentService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function definition(sourceKey, overrides = {}) {
  return {
    name: "מענה מבוסס ידע",
    systemPrompt:
      "יש לענות רק על בסיס מקורות ידע מאושרים.",
    handoffMessage:
      "אין מידע מאושר. השיחה עוברת לנציג.",
    responseMode: "agent-approval",
    minimumGroundingScoreBasisPoints:
      8_000,
    monthlyCostLimitMinorUnits: 50_000,
    billingCurrency: "ILS",
    knowledgeSourceKeys: [sourceKey],
    ...overrides,
  };
}

async function identityFixture(
  versionNumber = 1,
  definitionOverrides = {},
) {
  const contentSha256 = "a".repeat(64);
  const sourceKey =
    await deriveKnowledgeSourceKey(
      7,
      contentSha256,
    );
  const agentDefinition = definition(
    sourceKey,
    definitionOverrides,
  );
  const aiAgentKey = await deriveAiAgentKey(
    7,
    agentDefinition.name,
  );
  const aiAgentVersionKey =
    await deriveAiAgentVersionKey(
      7,
      aiAgentKey,
      versionNumber,
      agentDefinition,
    );

  return {
    contentSha256,
    sourceKey,
    definition: agentDefinition,
    aiAgentKey,
    aiAgentVersionKey,
    versionNumber,
  };
}

function source(fixture, overrides = {}) {
  return {
    sourceKey: fixture.sourceKey,
    tenantId: 7,
    contentSha256: fixture.contentSha256,
    fileName: "מדיניות-שירות.pdf",
    mediaType: "application/pdf",
    sizeBytes: 4_096,
    storageObjectKey:
      `knowledge/v1/${fixture.sourceKey}`,
    status: "ready",
    lastErrorCode: null,
    readyAt: "2026-07-26 09:01:00",
    version: 4,
    createdAt: "2026-07-26 09:00:00",
    updatedAt: "2026-07-26 09:01:00",
    ...overrides,
  };
}

function agent(fixture, overrides = {}) {
  return {
    aiAgentKey: fixture.aiAgentKey,
    tenantId: 7,
    name: fixture.definition.name,
    status: "draft",
    latestVersionKey:
      fixture.aiAgentVersionKey,
    latestVersionNumber:
      fixture.versionNumber,
    activeVersionKey: null,
    version: fixture.versionNumber,
    createdAt: "2026-07-26 09:00:00",
    updatedAt: "2026-07-26 09:00:00",
    ...overrides,
  };
}

function version(fixture, overrides = {}) {
  return {
    aiAgentVersionKey:
      fixture.aiAgentVersionKey,
    aiAgentKey: fixture.aiAgentKey,
    tenantId: 7,
    versionNumber: fixture.versionNumber,
    status: "draft",
    definition: fixture.definition,
    publishedAt: null,
    createdAt: "2026-07-26 09:00:00",
    ...overrides,
  };
}

function repositoryFixture(
  fixture,
  options = {},
) {
  const calls = {
    agentLists: [],
    agentReads: [],
    versionReads: [],
    versionLists: [],
    sourceReads: [],
    sourceLists: [],
    saves: [],
    publications: [],
    readiness: [],
  };
  const storedSource =
    options.source ?? source(fixture);
  const agents = {
    async listByTenant(tenantId, limit) {
      calls.agentLists.push({
        tenantId,
        limit,
      });
      return options.agents ?? [];
    },
    async findByKey(tenantId, aiAgentKey) {
      calls.agentReads.push({
        tenantId,
        aiAgentKey,
      });
      return options.agent ?? null;
    },
    async findVersionByKey(
      tenantId,
      aiAgentKey,
      aiAgentVersionKey,
    ) {
      calls.versionReads.push({
        tenantId,
        aiAgentKey,
        aiAgentVersionKey,
      });
      return options.version ?? null;
    },
    async listVersions(
      tenantId,
      aiAgentKey,
      limit,
    ) {
      calls.versionLists.push({
        tenantId,
        aiAgentKey,
        limit,
      });
      return options.versions ?? [];
    },
    async saveDraft(input) {
      calls.saves.push(input);

      if (options.saveResult) {
        return options.saveResult;
      }

      const storedFixture = {
        ...fixture,
        aiAgentKey: input.aiAgentKey,
        aiAgentVersionKey:
          input.aiAgentVersionKey,
        definition: input.definition,
        versionNumber: input.versionNumber,
      };

      return {
        outcome:
          input.expectedAgentVersion === null
            ? "created"
            : "updated",
        agent: agent(storedFixture, {
          version:
            input.expectedAgentVersion === null
              ? 1
              : input.expectedAgentVersion + 1,
        }),
        draftVersion: version(
          storedFixture,
        ),
      };
    },
    async publishDraft(
      tenantId,
      aiAgentKey,
      aiAgentVersionKey,
      expectedAgentVersion,
    ) {
      calls.publications.push({
        tenantId,
        aiAgentKey,
        aiAgentVersionKey,
        expectedAgentVersion,
      });
      return (
        options.publishResult ?? {
          outcome: "not-found",
        }
      );
    },
  };
  const knowledgeSources = {
    async findByKey(tenantId, sourceKey) {
      calls.sourceReads.push({
        tenantId,
        sourceKey,
      });

      if (options.missingSource) {
        return null;
      }

      return sourceKey === fixture.sourceKey
        ? storedSource
        : null;
    },
    async listByTenant(tenantId, limit) {
      calls.sourceLists.push({
        tenantId,
        limit,
      });
      return options.sources ?? [];
    },
    async registerUploaded() {
      throw new Error("must-not-run");
    },
    async transition() {
      throw new Error("must-not-run");
    },
  };
  const operationalReadiness = {
    async readForTenant(tenantId) {
      calls.readiness.push(tenantId);
      return (
        options.operationalReadiness ?? {
          providerReady: true,
          billingPolicyApproved: true,
          handoffPolicyApproved: true,
          auditSinkReady: true,
        }
      );
    },
  };

  return {
    calls,
    service: createAiAgentService({
      agents,
      knowledgeSources,
      operationalReadiness,
    }),
  };
}

test("lists and reads AI agents and sources only through tenant read scope", async () => {
  const identity = await identityFixture();
  const repositories =
    repositoryFixture(identity, {
      agents: [agent(identity)],
      agent: agent(identity),
      versions: [version(identity)],
      sources: [source(identity)],
    });

  const listed =
    await repositories.service.list(
      session("viewer"),
    );
  const sources =
    await repositories.service
      .listKnowledgeSources(
        session("viewer"),
      );
  const details =
    await repositories.service.readDetails(
      session("viewer"),
      identity.aiAgentKey,
    );

  assert.equal(listed.length, 1);
  assert.equal(sources.length, 1);
  assert.equal(
    details.activationReadiness.ready,
    true,
  );
  assert.deepEqual(
    repositories.calls.agentLists,
    [{ tenantId: 7, limit: 100 }],
  );
  assert.deepEqual(
    repositories.calls.sourceLists,
    [{ tenantId: 7, limit: 100 }],
  );
  assert.deepEqual(
    repositories.calls.versionLists,
    [
      {
        tenantId: 7,
        aiAgentKey:
          identity.aiAgentKey,
        limit: 100,
      },
    ],
  );
});

test("derives tenant-scoped agent and version identities on draft save", async () => {
  const identity = await identityFixture();
  const repositories =
    repositoryFixture(identity);
  const saved =
    await repositories.service.saveDraft(
      session(),
      {
        definition: identity.definition,
        expectedAgentVersion: null,
      },
    );

  assert.equal(saved.outcome, "created");
  assert.equal(
    repositories.calls.saves.length,
    1,
  );
  assert.deepEqual(
    {
      tenantId:
        repositories.calls.saves[0]
          .tenantId,
      aiAgentKey:
        repositories.calls.saves[0]
          .aiAgentKey,
      aiAgentVersionKey:
        repositories.calls.saves[0]
          .aiAgentVersionKey,
      versionNumber:
        repositories.calls.saves[0]
          .versionNumber,
    },
    {
      tenantId: 7,
      aiAgentKey: identity.aiAgentKey,
      aiAgentVersionKey:
        identity.aiAgentVersionKey,
      versionNumber: 1,
    },
  );
});

test("rejects unknown draft fields before persistence", async () => {
  const identity = await identityFixture();
  const repositories =
    repositoryFixture(identity);

  await assert.rejects(
    repositories.service.saveDraft(
      session(),
      {
        definition: identity.definition,
        expectedAgentVersion: null,
        tenantId: 8,
      },
    ),
    (error) =>
      error instanceof AiAgentInputError &&
      error.issues.includes(
        "invalid-input",
      ),
  );
  assert.deepEqual(
    repositories.calls.saves,
    [],
  );
});

test("blocks publication before persistence when operational dependencies are unavailable", async () => {
  const identity = await identityFixture();
  const repositories =
    repositoryFixture(identity, {
      version: version(identity),
      operationalReadiness: {
        providerReady: false,
        billingPolicyApproved: false,
        handoffPolicyApproved: false,
        auditSinkReady: false,
      },
    });

  await assert.rejects(
    repositories.service.publishDraft(
      session(),
      {
        aiAgentKey:
          identity.aiAgentKey,
        aiAgentVersionKey:
          identity.aiAgentVersionKey,
        expectedAgentVersion: 1,
      },
    ),
    (error) =>
      error instanceof
        AiAgentActivationError &&
      error.issues.includes(
        "provider-required",
      ) &&
      error.issues.includes(
        "audit-sink-required",
      ),
  );
  assert.deepEqual(
    repositories.calls.publications,
    [],
  );
});

test("publishes only after server-side readiness and source status checks pass", async () => {
  const identity = await identityFixture();
  const publishedAgent = agent(identity, {
    status: "active",
    activeVersionKey:
      identity.aiAgentVersionKey,
    version: 2,
  });
  const publishedVersion = version(identity, {
    status: "published",
    publishedAt:
      "2026-07-26 09:05:00",
  });
  const repositories =
    repositoryFixture(identity, {
      version: version(identity),
      publishResult: {
        outcome: "updated",
        agent: publishedAgent,
        publishedVersion,
      },
    });
  const result =
    await repositories.service.publishDraft(
      session("manager"),
      {
        aiAgentKey:
          identity.aiAgentKey,
        aiAgentVersionKey:
          identity.aiAgentVersionKey,
        expectedAgentVersion: 1,
      },
    );

  assert.equal(result.outcome, "updated");
  assert.deepEqual(
    repositories.calls.publications,
    [
      {
        tenantId: 7,
        aiAgentKey:
          identity.aiAgentKey,
        aiAgentVersionKey:
          identity.aiAgentVersionKey,
        expectedAgentVersion: 1,
      },
    ],
  );
  assert.deepEqual(
    repositories.calls.readiness,
    [7],
  );
});

test("enforces separate AI read and write permissions", async () => {
  const identity = await identityFixture();
  const repositories =
    repositoryFixture(identity);

  await assert.rejects(
    repositories.service.saveDraft(
      session("viewer"),
      {
        definition: identity.definition,
        expectedAgentVersion: null,
      },
    ),
    (error) =>
      error instanceof TenantSessionError &&
      error.code === "PERMISSION_DENIED",
  );
  await assert.rejects(
    repositories.service.list(
      session("agent"),
    ),
    (error) =>
      error instanceof TenantSessionError &&
      error.code === "PERMISSION_DENIED",
  );
});

test("maps cross-tenant persisted source data to a bounded persistence failure", async () => {
  const identity = await identityFixture();
  const repositories =
    repositoryFixture(identity, {
      sources: [
        source(identity, {
          tenantId: 8,
        }),
      ],
    });

  await assert.rejects(
    repositories.service
      .listKnowledgeSources(session()),
    (error) =>
      error instanceof AiAgentServiceError &&
      error.code === "PERSISTENCE_FAILED" &&
      !error.message.includes("tenantId"),
  );
});
