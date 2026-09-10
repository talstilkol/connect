import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(
  new URL(
    "../postgres/migrations/0001_railway_api_mutation_receipts.sql",
    import.meta.url,
  ),
  "utf8",
);

test("defines one tenant-scoped PostgreSQL mutation receipt table", () => {
  assert.equal(
    (schema.match(/CREATE TABLE/g) ?? []).length,
    1,
  );
  assert.match(
    schema,
    /PRIMARY KEY \(tenant_id, operation, idempotency_key\)/,
  );
  assert.match(
    schema,
    /FOREIGN KEY \(tenant_id\)[\s\S]*REFERENCES tenants \(id\)[\s\S]*ON DELETE RESTRICT/,
  );
  assert.match(schema, /response_json JSONB/);
  assert.match(schema, /created_at TIMESTAMPTZ/);
  assert.match(schema, /completed_at TIMESTAMPTZ/);
  assert.match(schema, /CHECK \(tenant_id > 0\)/);
});

test("enforces deterministic keys and complete receipt lifecycle", () => {
  assert.match(
    schema,
    /connect_idempotency_v1_\[0-9a-f\]\{64\}/,
  );
  assert.match(
    schema,
    /railway_mutation_request_v1_\[0-9a-f\]\{64\}/,
  );
  assert.match(schema, /status IN \('processing', 'completed'\)/);
  assert.match(schema, /actor_external_user_id !~ '\[\[:cntrl:\]\]'/);
  assert.match(
    schema,
    /status = 'processing'[\s\S]*response_json IS NULL[\s\S]*completed_at IS NULL/,
  );
  assert.match(
    schema,
    /status = 'completed'[\s\S]*response_json IS NOT NULL[\s\S]*completed_at IS NOT NULL/,
  );
  assert.match(schema, /completed_at >= created_at/);
});

test("keeps the schema contract non-destructive and randomness-free", () => {
  assert.doesNotMatch(schema, /\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/);
  assert.doesNotMatch(
    schema,
    /random\s*\(|gen_random_uuid|uuid_generate/,
  );
});
