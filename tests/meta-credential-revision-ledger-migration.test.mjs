import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  requireLocalMetaCredentialRevisionLedgerVerifierUrl,
} from "../scripts/verify-meta-credential-revision-ledger-postgres.mjs";

const migration = readFileSync(
  new URL(
    "../postgres/migrations/0054_meta_credential_revision_ledger.sql",
    import.meta.url,
  ),
  "utf8",
);
const verifier = readFileSync(
  new URL(
    "../scripts/verify-meta-credential-revision-ledger-postgres.mjs",
    import.meta.url,
  ),
  "utf8",
);

function functionBody(name) {
  const match = migration.match(new RegExp(
    `CREATE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`,
  ));
  assert.equal(typeof match?.[0], "string");
  return match[0];
}

function scalarColumns(tableName) {
  const definition = migration.match(new RegExp(
    `CREATE TABLE public\\.${tableName} \\(\\n[\\s\\S]*?\\n\\);`,
  ))?.[0];
  assert.equal(typeof definition, "string");
  return Array.from(
    definition.matchAll(
      /^  ([a-z][a-z0-9_]*) (TEXT|BIGINT|TIMESTAMPTZ)\b/gm,
    ),
    ([, name, type]) => [name, type],
  );
}

test("adds database-derived credential identity without changing the UPSERT input", () => {
  assert.match(
    migration,
    /ALTER TABLE public\.meta_credential_envelopes[\s\S]*ADD COLUMN credential_revision BIGINT,[\s\S]*ADD COLUMN envelope_digest TEXT;/,
  );
  assert.match(
    migration,
    /UPDATE public\.meta_credential_envelopes AS credential[\s\S]*credential_revision = 1,[\s\S]*derive_meta_credential_envelope_digest_v1/,
  );
  assert.match(
    migration,
    /ALTER COLUMN credential_revision SET NOT NULL,[\s\S]*ALTER COLUMN envelope_digest SET NOT NULL/,
  );
  assert.doesNotMatch(
    migration,
    /(?:credential_revision|envelope_digest)\s+(?:BIGINT|TEXT)\s+DEFAULT/i,
  );
});

test("derives framed SHA-256 envelope and event identities in PostgreSQL", () => {
  const envelopeDigest = functionBody(
    "derive_meta_credential_envelope_digest_v1",
  );
  const eventKey = functionBody(
    "derive_meta_credential_revision_event_key_v1",
  );

  assert.match(
    envelopeDigest,
    /connect:meta-credential-envelope:v1\|/,
  );
  assert.match(
    eventKey,
    /connect:meta-credential-revision-event:v1\|/,
  );
  for (const body of [envelopeDigest, eventKey]) {
    assert.match(body, /pg_catalog\.sha256\(/);
    assert.match(body, /pg_catalog\.octet_length\(/);
    assert.match(body, /pg_catalog\.convert_to\(/);
    assert.match(body, /IMMUTABLE/);
    assert.match(body, /STRICT/);
    assert.match(body, /PARALLEL SAFE/);
  }
});

test("keeps exact replay stable and increments one revision per rotation", () => {
  const prepare = functionBody(
    "prepare_meta_credential_envelope_revision",
  );
  assert.match(
    prepare,
    /IF TG_OP = 'INSERT'[\s\S]*NEW\.credential_revision := 1;/,
  );
  assert.match(
    prepare,
    /IF TG_OP = 'INSERT'[\s\S]*pg_catalog\.clock_timestamp\(\)[\s\S]*NEW\.created_at := database_updated_at;[\s\S]*NEW\.updated_at := database_updated_at;[\s\S]*NEW\.credential_revision := 1;/,
  );
  assert.match(
    prepare,
    /IS NOT DISTINCT FROM ROW\([\s\S]*NEW\.updated_at := OLD\.updated_at;[\s\S]*RETURN NEW;/,
  );
  assert.match(
    prepare,
    /NEW\.credential_revision := OLD\.credential_revision \+ 1;/,
  );
  assert.match(
    prepare,
    /NEW\.updated_at := database_updated_at;/,
  );
  assert.match(
    functionBody("record_meta_credential_revision_event"),
    /IF TG_OP = 'UPDATE'[\s\S]*NEW\.credential_revision = OLD\.credential_revision[\s\S]*RETURN NEW;/,
  );
});

test("rejects caller identity spoofing and every prior envelope digest", () => {
  const prepare = functionBody(
    "prepare_meta_credential_envelope_revision",
  );
  assert.equal(
    (prepare.match(
      /Meta credential revision identity is database-derived/g,
    ) ?? []).length,
    2,
  );
  assert.match(
    prepare,
    /NEW\.credential_revision IS DISTINCT FROM OLD\.credential_revision/,
  );
  assert.match(
    prepare,
    /NEW\.envelope_digest IS DISTINCT FROM OLD\.envelope_digest/,
  );
  assert.match(
    prepare,
    /FROM public\.meta_credential_revision_events AS event[\s\S]*event\.envelope_digest = derived_digest/,
  );
  assert.match(
    migration,
    /UNIQUE \(tenant_id, envelope_digest\)/,
  );
});

test("records envelope and event atomically behind an exact trigger-owned insert", () => {
  const recorder = functionBody(
    "record_meta_credential_revision_event",
  );
  const insertGuard = functionBody(
    "guard_meta_credential_revision_event_insert",
  );
  assert.match(
    migration,
    /AFTER INSERT OR UPDATE ON public\.meta_credential_envelopes[\s\S]*record_meta_credential_revision_event\(\)/,
  );
  assert.match(
    recorder,
    /INSERT INTO public\.meta_credential_revision_events \([\s\S]*NEW\.credential_revision,[\s\S]*NEW\.envelope_digest/,
  );
  assert.match(
    insertGuard,
    /pg_catalog\.pg_trigger_depth\(\) <> 2/,
  );
  assert.match(
    insertGuard,
    /credential\.tenant_id = NEW\.tenant_id[\s\S]*credential\.updated_at = NEW\.recorded_at/,
  );
  assert.match(
    insertGuard,
    /NEW\.event_key <>[\s\S]*derive_meta_credential_revision_event_key_v1/,
  );
});

test("defines one secret-free and PII-free append-only event ledger", () => {
  assert.deepEqual(
    scalarColumns("meta_credential_revision_events"),
    [
      ["event_key", "TEXT"],
      ["tenant_id", "BIGINT"],
      ["credential_revision", "BIGINT"],
      ["envelope_digest", "TEXT"],
      ["key_version", "TEXT"],
      ["recorded_at", "TIMESTAMPTZ"],
      ["created_at", "TIMESTAMPTZ"],
    ],
  );
  const tableDefinition = migration.match(
    /CREATE TABLE public\.meta_credential_revision_events \([\s\S]*?\n\);/,
  )?.[0];
  assert.equal(typeof tableDefinition, "string");
  assert.doesNotMatch(
    tableDefinition,
    /initialization_vector|ciphertext|access_token|secret|phone|email|payload|provider_message/i,
  );
  for (const operation of ["UPDATE", "DELETE", "TRUNCATE"]) {
    assert.match(
      migration,
      new RegExp(
        `BEFORE ${operation} ON public\\.meta_credential_revision_events`,
      ),
    );
  }
  assert.match(
    migration,
    /BEFORE INSERT ON public\.meta_credential_revision_events[\s\S]*guard_meta_credential_revision_event_insert/,
  );
});

test("keeps every new capability dormant and invoker-rights only", () => {
  assert.equal(
    (migration.match(/\nSECURITY INVOKER\n/g) ?? []).length,
    6,
  );
  assert.equal(
    (migration.match(/SET search_path = pg_catalog, pg_temp/g) ?? [])
      .length,
    6,
  );
  assert.equal(
    (migration.match(/^REVOKE ALL ON FUNCTION /gm) ?? []).length,
    6,
  );
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.meta_credential_revision_events FROM PUBLIC;/,
  );
  assert.doesNotMatch(
    migration,
    /\bSECURITY DEFINER\b|^\s*GRANT\b|^\s*(?:CREATE|ALTER) ROLE\b|\b(?:random|gen_random_uuid|uuid_generate_v[1-5])\s*\(/gim,
  );
});

test("locks migration preconditions, catalog shape and privilege cleanup", () => {
  assert.match(migration, /DO \$d31d1db_precondition\$/);
  assert.match(migration, /unsafe_default_acl_count/);
  assert.match(migration, /DO \$d31d1db_postcondition\$/);
  assert.match(migration, /event_columns IS DISTINCT FROM ARRAY\[/);
  assert.match(migration, /function_count <> 6/);
  assert.match(migration, /trigger_count <> 7/);
  assert.match(
    migration,
    /procedure\.oid = trigger\.tgfoid[\s\S]*procedure\.proname = expected\.function_name/,
  );
  assert.match(migration, /mismatched_event_count <> 0/);
  assert.match(migration, /non_owner_privilege_count <> 0/);
});

test("accepts only one parameter-free and userinfo-free local verifier URL", () => {
  const valid =
    "postgresql://127.0.0.1:55442/" +
    "connect_meta_credential_revision_ledger";
  assert.equal(
    requireLocalMetaCredentialRevisionLedgerVerifierUrl(valid),
    valid,
  );
  assert.equal(
    requireLocalMetaCredentialRevisionLedgerVerifierUrl(
      "postgres://localhost:55442/" +
      "connect_meta_credential_revision_ledger",
    ),
    "postgres://localhost:55442/" +
      "connect_meta_credential_revision_ledger",
  );

  for (const unsafe of [
    "postgresql://operator@127.0.0.1:55442/" +
      "connect_meta_credential_revision_ledger",
    "postgresql://operator:credential@127.0.0.1:55442/" +
      "connect_meta_credential_revision_ledger",
    valid + "?host=%2Ftmp%2Fpostgres",
    valid + "?options=-csearch_path%3Dpg_catalog",
    valid + "?sslmode=disable",
    valid + "#connection-override",
    "postgresql://127.0.0.1/" +
      "connect_meta_credential_revision_ledger",
    "postgresql://127.0.0.1:55442/%63onnect_" +
      "meta_credential_revision_ledger",
    "postgresql://database.example.com:55442/" +
      "connect_meta_credential_revision_ledger",
    "postgresql://127.0.0.1:55442/connect",
  ]) {
    assert.throws(
      () => requireLocalMetaCredentialRevisionLedgerVerifierUrl(unsafe),
      /META_CREDENTIAL_REVISION_LEDGER_DEDICATED_LOCAL_DATABASE_REQUIRED/,
    );
  }
});

test("limits destructive repeatability cleanup to a validated empty database", () => {
  assert.match(
    verifier,
    /await requireEmptyPublicSchema\(pool\);\n    cleanupAuthorized = true;/,
  );
  assert.match(
    verifier,
    /current_database\(\) AS database,[\s\S]*host\(pg_catalog\.inet_server_addr\(\)\) AS address/,
  );
  assert.match(
    verifier,
    /if \(cleanupAuthorized\) \{[\s\S]*cleanupDedicatedVerifierDatabase\(pool\)/,
  );
  assert.match(
    verifier,
    /DROP SCHEMA public CASCADE[\s\S]*CREATE SCHEMA public/,
  );
});
