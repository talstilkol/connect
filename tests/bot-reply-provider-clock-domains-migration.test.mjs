import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const d1Migration = readFileSync(new URL(
  "../drizzle/0042_bot_reply_provider_clock_domains.sql",
  import.meta.url,
), "utf8");
const postgresMigration = readFileSync(new URL(
  "../postgres/migrations/0045_bot_reply_provider_clock_domains.sql",
  import.meta.url,
), "utf8");
const d1Repository = readFileSync(new URL(
  "../db/botReplyDeliveryProviderRepository.ts",
  import.meta.url,
), "utf8");
const postgresRepository = readFileSync(new URL(
  "../server/platform/postgresBotReplyDeliveryProviderRepository.ts",
  import.meta.url,
), "utf8");
const d1CampaignRepository = readFileSync(new URL(
  "../db/campaignDeliveryProviderRepository.ts",
  import.meta.url,
), "utf8");
const postgresCampaignRepository = readFileSync(new URL(
  "../server/platform/postgresCampaignDeliveryProviderRepository.ts",
  import.meta.url,
), "utf8");

test("keeps raw provider occurrence independent from local acceptance", () => {
  for (const migration of [d1Migration, postgresMigration]) {
    const normalized = migration.replaceAll("`", "");
    assert.doesNotMatch(
      normalized,
      /NEW\.last_status_event_at\s*<\s*NEW\.accepted_at/i,
    );
    assert.match(
      normalized,
      /NEW\.last_status_event_at\s*<\s*OLD\.last_status_event_at/i,
    );
  }
});

test("settles terminal status with trusted local reconciliation time", () => {
  assert.match(
    d1Repository,
    /terminal_settled_at = CASE[\s\S]*THEN max\(updated_at, \?7\)[\s\S]*updated_at = max\(updated_at, \?7\)/,
  );
  assert.match(
    postgresRepository,
    /terminal_settled_at = CASE[\s\S]*THEN greatest\(updated_at, \$7::timestamptz\)[\s\S]*updated_at = greatest\(updated_at, \$7::timestamptz\)/,
  );
  assert.match(
    d1CampaignRepository,
    /terminal_settled_at = CASE[\s\S]*THEN max\(updated_at, \?7\)[\s\S]*updated_at = max\(updated_at, \?7\)/,
  );
  assert.match(
    postgresCampaignRepository,
    /terminal_settled_at = CASE[\s\S]*THEN greatest\(updated_at, \$7::timestamptz\)[\s\S]*updated_at = greatest\(updated_at, \$7::timestamptz\)/,
  );
  for (const migration of [d1Migration, postgresMigration]) {
    const normalized = migration.replaceAll("`", "");
    assert.match(
      normalized,
      /NEW\.terminal_settled_at IS (?:NOT )?DISTINCT FROM NEW\.updated_at|NEW\.terminal_settled_at IS NOT NEW\.updated_at/i,
    );
  }
});

test("does not weaken the immutable identity or terminal outcome guards", () => {
  assert.match(d1Migration, /provider identity is immutable|terminal_outcome/);
  assert.match(
    d1Migration,
    /NEW\.`delivery_key` IS OLD\.`delivery_key`[\s\S]*NEW\.`created_at` IS OLD\.`created_at`/,
  );
  assert.match(postgresMigration, /Bot reply provider identity is immutable/);
  assert.match(postgresMigration, /Bot reply terminal outcome is immutable/);
  assert.match(
    postgresMigration,
    /Campaign delivery terminal outcome is immutable/,
  );
  assert.match(postgresMigration, /whatsapp_rate_limit_settlements/);
});
