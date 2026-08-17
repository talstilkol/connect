import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  requireLocalIntegrationUrl,
} from "../scripts/verify-node-postgres-integration.mjs";

test("accepts only the dedicated loopback integration database", () => {
  assert.equal(
    requireLocalIntegrationUrl(
      "postgresql://tal@127.0.0.1:55433/connect_driver_integration",
    ),
    "postgresql://tal@127.0.0.1:55433/connect_driver_integration",
  );
  assert.equal(
    requireLocalIntegrationUrl(
      "postgres://tal@localhost:55434/connect_driver_integration",
    ),
    "postgres://tal@localhost:55434/connect_driver_integration",
  );
});

test("rejects remote, reusable, credential-bearing, and extended URLs", () => {
  const invalidUrls = [
    "postgresql://tal@database.example.com:5432/connect_driver_integration",
    "postgresql://tal@127.0.0.1:5432/connect",
    "postgresql://tal:secret@127.0.0.1:5432/connect_driver_integration",
    "postgresql://tal@127.0.0.1:5432/connect_driver_integration?sslmode=disable",
    "postgresql://tal@127.0.0.1/connect_driver_integration",
    "https://127.0.0.1:5432/connect_driver_integration",
  ];

  for (const value of invalidUrls) {
    assert.throws(
      () => requireLocalIntegrationUrl(value),
      {
        message: "NODE_POSTGRES_INTEGRATION_URL_INVALID",
      },
    );
  }
});

test("keeps the real integration proof explicit and outside the default gate", async () => {
  const [packageJson, source] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../scripts/verify-node-postgres-integration.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  const scripts = JSON.parse(packageJson).scripts;

  assert.equal(
    scripts["verify:node-postgres-integration"],
    "node scripts/verify-node-postgres-integration.mjs",
  );
  assert.doesNotMatch(scripts.test, /node-postgres-integration/);
  assert.match(source, /DATABASE_NOT_EMPTY/);
  assert.match(source, /Promise\.all/);
  assert.match(source, /0004_team_invitation_lifecycle\.sql/);
  assert.match(source, /0005_conversations_messages\.sql/);
  assert.match(source, /0006_message_templates_campaigns\.sql/);
  assert.match(source, /0007_bot_flows_deliveries\.sql/);
  assert.match(source, /0008_ai_reporting\.sql/);
  assert.match(source, /verifyConversationMessageSchema/);
  assert.match(source, /verifyTemplateCampaignSchema/);
  assert.match(source, /verifyBotDeliverySchema/);
  assert.match(source, /verifyAiReportingSchema/);
  assert.match(source, /verifyPostgresHttpRuntime/);
  assert.match(source, /foundation\.reports\.read/);
  assert.match(source, /runtime\.handler\.handle/);
  assert.match(source, /runtime\.readiness\.check/);
  assert.match(source, /createRailwayPostgresApiRuntime/);
  assert.match(source, /messages_direction_status_consistent|23514/);
  assert.match(source, /createRailwayPostgresFoundation/);
  assert.doesNotMatch(source, /Math\.random|randomUUID/);
});
