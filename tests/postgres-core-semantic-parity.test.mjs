import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  requireLocalCoreParityUrl,
} from "../scripts/verify-postgres-core-semantic-parity.mjs";

test("accepts only the dedicated local PostgreSQL semantic parity database", () => {
  assert.equal(
    requireLocalCoreParityUrl(
      "postgresql://127.0.0.1:55432/connect_core_semantic_parity",
    ),
    "postgresql://127.0.0.1:55432/connect_core_semantic_parity",
  );

  for (const invalid of [
    undefined,
    "postgresql://127.0.0.1/connect",
    "postgresql://user:secret@127.0.0.1:55432/connect_core_semantic_parity",
    "postgresql://railway.internal:55432/connect_core_semantic_parity",
    "postgresql://127.0.0.1:55432/connect_core_semantic_parity?sslmode=disable",
  ]) {
    assert.throws(
      () => requireLocalCoreParityUrl(invalid),
      /POSTGRES_CORE_SEMANTIC_PARITY_URL_INVALID/,
    );
  }
});

test("semantic parity verifier covers core behavior and all seven migrated tables", async () => {
  const source = await readFile(
    new URL("../scripts/verify-postgres-core-semantic-parity.mjs", import.meta.url),
    "utf8",
  );

  for (const scenario of [
    "memberships-by-user",
    "memberships-by-tenant-role-order",
    "selection-idempotent-replay",
    "selection-stale-conflict",
    "selection-ineligible-tenant",
    "profile-idempotent-version",
    "contact-cross-tenant-isolation",
    "contact-page-cursor",
    "consent-idempotent-replay",
    "consent-older-event-does-not-win",
    "consent-newer-event-wins",
    "consent-idempotency-conflict",
  ]) {
    assert.match(source, new RegExp(`"${scenario}"`));
  }

  for (const table of [
    "tenants",
    "tenant_memberships",
    "tenant_selections",
    "business_profiles",
    "contacts",
    "contact_consent_events",
    "audit_logs",
  ]) {
    assert.match(source, new RegExp(`table: "${table}"`));
  }

  assert.match(source, /createPostgresCoreDataMigrationPlan/);
  assert.match(source, /executePostgresCoreDataMigration/);
  assert.match(source, /assert\.deepEqual\(normalizedPostgres, normalizedD1/);
  assert.match(source, /contractVersion: "connect_core_semantic_parity_v1"/);
  assert.doesNotMatch(source, /Math\.random|randomUUID/);
});
