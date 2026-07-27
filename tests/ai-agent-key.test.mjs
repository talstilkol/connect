import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgePassageKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";

const sourceKey = (character) =>
  `knowledge_source_v1_${character.repeat(64)}`;

function definition(overrides = {}) {
  return {
    name: "מענה מבוסס ידע",
    systemPrompt:
      "יש לענות רק על בסיס מקורות ידע מאושרים.",
    handoffMessage:
      "לא נמצא מידע מאושר. השיחה עוברת לנציג.",
    responseMode: "agent-approval",
    minimumGroundingScoreBasisPoints: 8_000,
    monthlyCostLimitMinorUnits: 50_000,
    billingCurrency: "ILS",
    knowledgeSourceKeys: [
      sourceKey("b"),
      sourceKey("a"),
    ],
    ...overrides,
  };
}

test("derives one tenant-scoped AI agent identity from the normalized name", async () => {
  const first = await deriveAiAgentKey(
    7,
    "  מענה מבוסס ידע  ",
  );
  const repeated = await deriveAiAgentKey(
    7,
    "מענה מבוסס ידע",
  );
  const anotherTenant = await deriveAiAgentKey(
    8,
    "מענה מבוסס ידע",
  );

  assert.match(
    first,
    /^ai_agent_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, repeated);
  assert.notEqual(first, anotherTenant);
});

test("derives canonical agent version identities from validated policy", async () => {
  const agentKey = await deriveAiAgentKey(
    7,
    "מענה מבוסס ידע",
  );
  const first = await deriveAiAgentVersionKey(
    7,
    agentKey,
    1,
    definition(),
  );
  const reorderedSources =
    await deriveAiAgentVersionKey(
      7,
      agentKey,
      1,
      definition({
        knowledgeSourceKeys: [
          sourceKey("a"),
          sourceKey("b"),
        ],
      }),
    );
  const nextVersion =
    await deriveAiAgentVersionKey(
      7,
      agentKey,
      2,
      definition(),
    );

  assert.match(
    first,
    /^ai_agent_version_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, reorderedSources);
  assert.notEqual(first, nextVersion);
});

test("derives a tenant-scoped knowledge source identity from a real content digest", async () => {
  const digest = "c".repeat(64);
  const first = await deriveKnowledgeSourceKey(
    7,
    digest,
  );
  const repeated = await deriveKnowledgeSourceKey(
    7,
    digest,
  );
  const anotherTenant =
    await deriveKnowledgeSourceKey(8, digest);

  assert.match(
    first,
    /^knowledge_source_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, repeated);
  assert.notEqual(first, anotherTenant);
});

test("derives a source-scoped passage identity from ordinal and content digest", async () => {
  const source = sourceKey("d");
  const digest = "e".repeat(64);
  const first = await deriveKnowledgePassageKey(
    7,
    source,
    1,
    digest,
  );
  const repeated =
    await deriveKnowledgePassageKey(
      7,
      source,
      1,
      digest,
    );
  const nextOrdinal =
    await deriveKnowledgePassageKey(
      7,
      source,
      2,
      digest,
    );

  assert.match(
    first,
    /^knowledge_passage_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, repeated);
  assert.notEqual(first, nextOrdinal);
});

test("rejects invalid scope, digest, version, and mismatched identity", async () => {
  const agentKey = await deriveAiAgentKey(
    7,
    "מענה מבוסס ידע",
  );
  const anotherAgentKey =
    await deriveAiAgentKey(7, "סוכן אחר");

  await assert.rejects(
    deriveAiAgentKey(0, "מענה"),
    /tenantId/,
  );
  await assert.rejects(
    deriveKnowledgeSourceKey(
      7,
      "not-a-digest",
    ),
    /SHA-256/,
  );
  await assert.rejects(
    deriveKnowledgePassageKey(
      7,
      "invalid-source",
      1,
      "a".repeat(64),
    ),
    /sourceKey/,
  );
  await assert.rejects(
    deriveAiAgentVersionKey(
      7,
      agentKey,
      0,
      definition(),
    ),
    /version/,
  );
  await assert.rejects(
    deriveAiAgentVersionKey(
      7,
      anotherAgentKey,
      1,
      definition(),
    ),
    /does not match/,
  );
});
