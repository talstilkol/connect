import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const migrationDirectory = join(projectRoot, "postgres", "migrations");
const environmentKey =
  "CONNECT_POSTGRES_META_CREDENTIAL_REVISION_LEDGER_URL";
const requiredDatabaseName =
  "connect_meta_credential_revision_ledger";
const migrationNamePattern = /^(\d{4})_[a-z0-9_]+\.sql$/;
const revisionMigrationName =
  "0054_meta_credential_revision_ledger.sql";

const envelopeA = Object.freeze({
  keyVersion: "v1",
  initializationVector: "AAAAAAAAAAAAAAAA",
  ciphertext: "AAAAAAAAAAAAAAAAAAAAAAAA",
});
const envelopeB = Object.freeze({
  keyVersion: "v1",
  initializationVector: "BBBBBBBBBBBBBBBB",
  ciphertext: "BBBBBBBBBBBBBBBBBBBBBBBB",
});
const envelopeC = Object.freeze({
  keyVersion: "v1",
  initializationVector: "CCCCCCCCCCCCCCCC",
  ciphertext: "CCCCCCCCCCCCCCCCCCCCCCCC",
});
const envelopeD = Object.freeze({
  keyVersion: "v1",
  initializationVector: "DDDDDDDDDDDDDDDD",
  ciphertext: "DDDDDDDDDDDDDDDDDDDDDDDD",
});
const envelopeE = Object.freeze({
  keyVersion: "v1",
  initializationVector: "EEEEEEEEEEEEEEEE",
  ciphertext: "EEEEEEEEEEEEEEEEEEEEEEEE",
});
const envelopeF = Object.freeze({
  keyVersion: "v1",
  initializationVector: "FFFFFFFFFFFFFFFF",
  ciphertext: "FFFFFFFFFFFFFFFFFFFFFFFF",
});
const envelopeG = Object.freeze({
  keyVersion: "v1",
  initializationVector: "GGGGGGGGGGGGGGGG",
  ciphertext: "GGGGGGGGGGGGGGGGGGGGGGGG",
});

const repositoryCompatibleStoreSql = `
  INSERT INTO meta_credential_envelopes (
    tenant_id,
    key_version,
    initialization_vector,
    ciphertext
  )
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (tenant_id) DO UPDATE SET
    key_version = EXCLUDED.key_version,
    initialization_vector = EXCLUDED.initialization_vector,
    ciphertext = EXCLUDED.ciphertext,
    updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
  RETURNING tenant_id AS "tenantId"
`;

function fail(code) {
  throw new Error(`META_CREDENTIAL_REVISION_LEDGER_${code}`);
}

export function requireLocalMetaCredentialRevisionLedgerVerifierUrl(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2_048
  ) {
    fail("URL_INVALID");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("URL_INVALID");
  }
  const port = Number(parsed.port);
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
    parsed.pathname !== `/${requiredDatabaseName}` ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    fail("DEDICATED_LOCAL_DATABASE_REQUIRED");
  }
  return parsed.toString();
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function frame(value) {
  const text = String(value);
  return `${Buffer.byteLength(text, "utf8")}:${text}`;
}

function envelopeDigest(tenantId, envelope) {
  return `sha256:${sha256Hex(
    "connect:meta-credential-envelope:v1|" +
    [
      tenantId,
      envelope.keyVersion,
      envelope.initializationVector,
      envelope.ciphertext,
    ].map(frame).join("|"),
  )}`;
}

function revisionEventKey(tenantId, revision, digest) {
  return `meta_credential_revision_v1_${sha256Hex(
    "connect:meta-credential-revision-event:v1|" +
    [tenantId, revision, digest].map(frame).join("|"),
  )}`;
}

function canonicalTimestamp(value) {
  assert.equal(value instanceof Date, true);
  return value.toISOString();
}

async function databaseTimestamp(client) {
  const result = await client.query(
    `SELECT pg_catalog.date_trunc(
       'milliseconds',
       pg_catalog.clock_timestamp()
     ) AS value`,
  );
  assert.equal(result.rowCount, 1);
  return canonicalTimestamp(result.rows[0]?.value);
}

async function migrationInventory() {
  const files = (await readdir(migrationDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  assert.equal(files.includes(revisionMigrationName), true);
  files.forEach((fileName, index) => {
    const match = migrationNamePattern.exec(fileName);
    assert.equal(match?.[1], String(index).padStart(4, "0"));
  });
  return files;
}

async function requireEmptyPublicSchema(pool) {
  const result = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM pg_catalog.pg_class AS relation
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')`,
  );
  assert.deepEqual(result.rows, [{ count: 0 }]);
}

async function cleanupDedicatedVerifierDatabase(pool) {
  const identity = await pool.query(
    `SELECT
       pg_catalog.current_database() AS database,
       pg_catalog.host(pg_catalog.inet_server_addr()) AS address`,
  );
  assert.equal(identity.rowCount, 1);
  assert.equal(identity.rows[0]?.database, requiredDatabaseName);
  assert.equal(
    ["127.0.0.1", "::1"].includes(identity.rows[0]?.address),
    true,
  );
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await requireEmptyPublicSchema(pool);
}

async function createTenant(pool, displayName) {
  const result = await pool.query(
    `INSERT INTO public.tenants (display_name, status)
     VALUES ($1, 'active')
     RETURNING id::integer AS id`,
    [displayName],
  );
  assert.equal(result.rowCount, 1);
  const tenantId = result.rows[0]?.id;
  assert.equal(Number.isSafeInteger(tenantId), true);
  return tenantId;
}

async function storeEnvelope(pool, tenantId, envelope) {
  const result = await pool.query(
    repositoryCompatibleStoreSql,
    [
      tenantId,
      envelope.keyVersion,
      envelope.initializationVector,
      envelope.ciphertext,
    ],
  );
  assert.equal(result.rowCount, 1);
  assert.equal(Number(result.rows[0]?.tenantId), tenantId);
}

async function applyAllMigrationsWithLegacyFixture(pool) {
  const files = await migrationInventory();
  let tenantId = null;

  for (const fileName of files) {
    if (fileName === revisionMigrationName) {
      tenantId = await createTenant(
        pool,
        "Meta credential revision verifier",
      );
      await storeEnvelope(pool, tenantId, envelopeA);
    }
    const source = await readFile(join(migrationDirectory, fileName), "utf8");
    await pool.query(source);
  }

  assert.equal(Number.isSafeInteger(tenantId), true);
  return Object.freeze({ files, tenantId });
}

async function readCredentialState(pool, tenantId) {
  const result = await pool.query(
    `SELECT
       tenant_id::integer AS "tenantId",
       key_version AS "keyVersion",
       initialization_vector AS "initializationVector",
       ciphertext,
       credential_revision::integer AS "credentialRevision",
       envelope_digest AS "envelopeDigest",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM public.meta_credential_envelopes
     WHERE tenant_id = $1`,
    [tenantId],
  );
  assert.equal(result.rowCount, 1);
  const row = result.rows[0];
  return Object.freeze({
    ...row,
    createdAt: canonicalTimestamp(row.createdAt),
    updatedAt: canonicalTimestamp(row.updatedAt),
  });
}

async function readEvents(pool, tenantId) {
  const result = await pool.query(
    `SELECT
       event_key AS "eventKey",
       tenant_id::integer AS "tenantId",
       credential_revision::integer AS "credentialRevision",
       envelope_digest AS "envelopeDigest",
       key_version AS "keyVersion",
       recorded_at AS "recordedAt",
       created_at AS "createdAt"
     FROM public.meta_credential_revision_events
     WHERE tenant_id = $1
     ORDER BY credential_revision`,
    [tenantId],
  );
  return result.rows.map((row) => Object.freeze({
    ...row,
    recordedAt: canonicalTimestamp(row.recordedAt),
    createdAt: canonicalTimestamp(row.createdAt),
  }));
}

function assertStateIdentity(state, tenantId, revision, envelope) {
  const digest = envelopeDigest(tenantId, envelope);
  assert.equal(state.tenantId, tenantId);
  assert.equal(state.keyVersion, envelope.keyVersion);
  assert.equal(
    state.initializationVector,
    envelope.initializationVector,
  );
  assert.equal(state.ciphertext, envelope.ciphertext);
  assert.equal(state.credentialRevision, revision);
  assert.equal(state.envelopeDigest, digest);
  return digest;
}

function assertEventIdentity(event, tenantId, revision, digest) {
  assert.deepEqual(event, {
    eventKey: revisionEventKey(tenantId, revision, digest),
    tenantId,
    credentialRevision: revision,
    envelopeDigest: digest,
    keyVersion: "v1",
    recordedAt: event.recordedAt,
    createdAt: event.recordedAt,
  });
}

async function verifyBackfillReplayAndRotation(pool, tenantId) {
  const initial = await readCredentialState(pool, tenantId);
  const digestA = assertStateIdentity(initial, tenantId, 1, envelopeA);
  let events = await readEvents(pool, tenantId);
  assert.equal(events.length, 1);
  assertEventIdentity(events[0], tenantId, 1, digestA);
  assert.equal(events[0].recordedAt, initial.updatedAt);

  await storeEnvelope(pool, tenantId, envelopeA);
  const replayed = await readCredentialState(pool, tenantId);
  assert.deepEqual(replayed, initial);
  assert.equal((await readEvents(pool, tenantId)).length, 1);

  await storeEnvelope(pool, tenantId, envelopeB);
  const rotated = await readCredentialState(pool, tenantId);
  const digestB = assertStateIdentity(rotated, tenantId, 2, envelopeB);
  assert.equal(Date.parse(rotated.updatedAt) > Date.parse(initial.updatedAt), true);
  events = await readEvents(pool, tenantId);
  assert.equal(events.length, 2);
  assertEventIdentity(events[1], tenantId, 2, digestB);

  await storeEnvelope(pool, tenantId, envelopeB);
  assert.deepEqual(await readCredentialState(pool, tenantId), rotated);
  assert.equal((await readEvents(pool, tenantId)).length, 2);
}

async function verifyDatabaseClockOwnership(pool) {
  const tenantId = 9_000_054;
  const suppliedCreatedAt = "2000-01-01T00:00:00.000Z";
  const suppliedUpdatedAt = "2099-01-01T00:00:00.000Z";
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query(
      `INSERT INTO public.tenants (id, display_name, status)
       VALUES ($1, 'Meta credential clock verifier', 'active')`,
      [tenantId],
    );
    const beforeInsert = await databaseTimestamp(client);
    await client.query(
      `INSERT INTO public.meta_credential_envelopes (
         tenant_id,
         key_version,
         initialization_vector,
         ciphertext,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $5)`,
      [
        tenantId,
        envelopeA.keyVersion,
        envelopeA.initializationVector,
        envelopeA.ciphertext,
        suppliedCreatedAt,
      ],
    );
    const afterInsert = await databaseTimestamp(client);
    const inserted = await readCredentialState(client, tenantId);
    assertStateIdentity(inserted, tenantId, 1, envelopeA);
    assert.equal(inserted.createdAt, inserted.updatedAt);
    assert.notEqual(inserted.createdAt, suppliedCreatedAt);
    assert.equal(
      Date.parse(inserted.createdAt) >= Date.parse(beforeInsert),
      true,
    );
    assert.equal(
      Date.parse(inserted.createdAt) <= Date.parse(afterInsert) + 1,
      true,
    );
    const insertedEvents = await readEvents(client, tenantId);
    assert.equal(insertedEvents.length, 1);
    assert.equal(insertedEvents[0].recordedAt, inserted.createdAt);

    const beforeRotation = await databaseTimestamp(client);
    await client.query(
      `UPDATE public.meta_credential_envelopes
       SET initialization_vector = $2,
           ciphertext = $3,
           updated_at = $4
       WHERE tenant_id = $1`,
      [
        tenantId,
        envelopeB.initializationVector,
        envelopeB.ciphertext,
        suppliedUpdatedAt,
      ],
    );
    const afterRotation = await databaseTimestamp(client);
    const rotated = await readCredentialState(client, tenantId);
    assertStateIdentity(rotated, tenantId, 2, envelopeB);
    assert.equal(rotated.createdAt, inserted.createdAt);
    assert.notEqual(rotated.updatedAt, suppliedUpdatedAt);
    assert.equal(
      Date.parse(rotated.updatedAt) > Date.parse(inserted.updatedAt),
      true,
    );
    assert.equal(
      Date.parse(rotated.updatedAt) >= Date.parse(beforeRotation),
      true,
    );
    assert.equal(
      Date.parse(rotated.updatedAt) <= Date.parse(afterRotation) + 1,
      true,
    );
    assert.equal((await readEvents(client, tenantId)).length, 2);

    await client.query("ROLLBACK");
    transactionOpen = false;
  } finally {
    if (transactionOpen) {
      await client.query("ROLLBACK");
    }
    client.release();
  }

  const cleanup = await pool.query(
    `SELECT
       (SELECT pg_catalog.count(*)::integer
        FROM public.tenants
        WHERE id = $1) AS tenants,
       (SELECT pg_catalog.count(*)::integer
        FROM public.meta_credential_envelopes
        WHERE tenant_id = $1) AS envelopes,
       (SELECT pg_catalog.count(*)::integer
        FROM public.meta_credential_revision_events
        WHERE tenant_id = $1) AS events`,
    [tenantId],
  );
  assert.deepEqual(cleanup.rows, [{ tenants: 0, envelopes: 0, events: 0 }]);
}

async function verifyConcurrentRotations(pool, tenantId) {
  await Promise.all([
    storeEnvelope(pool, tenantId, envelopeC),
    storeEnvelope(pool, tenantId, envelopeC),
  ]);
  let state = await readCredentialState(pool, tenantId);
  assertStateIdentity(state, tenantId, 3, envelopeC);
  assert.equal((await readEvents(pool, tenantId)).length, 3);

  await Promise.all([
    storeEnvelope(pool, tenantId, envelopeD),
    storeEnvelope(pool, tenantId, envelopeE),
  ]);
  state = await readCredentialState(pool, tenantId);
  assert.equal(state.credentialRevision, 5);
  assert.equal(
    [
      envelopeDigest(tenantId, envelopeD),
      envelopeDigest(tenantId, envelopeE),
    ].includes(state.envelopeDigest),
    true,
  );
  const events = await readEvents(pool, tenantId);
  assert.equal(events.length, 5);
  assert.deepEqual(
    events.slice(3).map(({ envelopeDigest: digest }) => digest).sort(),
    [
      envelopeDigest(tenantId, envelopeD),
      envelopeDigest(tenantId, envelopeE),
    ].sort(),
  );
}

async function verifyTransactionRollback(pool, tenantId) {
  const before = await readCredentialState(pool, tenantId);
  const beforeEvents = await readEvents(pool, tenantId);
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await storeEnvelope(client, tenantId, envelopeF);
    const inside = await readCredentialState(client, tenantId);
    assert.equal(
      inside.credentialRevision,
      before.credentialRevision + 1,
    );
    assert.equal(
      (await readEvents(client, tenantId)).length,
      beforeEvents.length + 1,
    );
    await client.query("ROLLBACK");
    transactionOpen = false;
  } finally {
    if (transactionOpen) {
      await client.query("ROLLBACK");
    }
    client.release();
  }
  assert.deepEqual(await readCredentialState(pool, tenantId), before);
  assert.deepEqual(await readEvents(pool, tenantId), beforeEvents);
}

async function verifyAtomicEventFailure(pool, tenantId) {
  const before = await readCredentialState(pool, tenantId);
  const beforeEvents = await readEvents(pool, tenantId);
  await pool.query(`
    CREATE FUNCTION public.reject_meta_credential_test_event()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp
    AS $$
    BEGIN
      RAISE EXCEPTION 'Intentional Meta credential event failure';
    END;
    $$;

    CREATE TRIGGER meta_credential_revision_events_test_reject
    BEFORE INSERT ON public.meta_credential_revision_events
    FOR EACH ROW
    EXECUTE FUNCTION public.reject_meta_credential_test_event();
  `);
  try {
    await assert.rejects(
      storeEnvelope(pool, tenantId, envelopeG),
      (error) => (
        error?.code === "P0001" &&
        /Intentional Meta credential event failure/.test(error.message)
      ),
    );
  } finally {
    await pool.query(`
      DROP TRIGGER meta_credential_revision_events_test_reject
        ON public.meta_credential_revision_events;
      DROP FUNCTION public.reject_meta_credential_test_event();
    `);
  }
  assert.deepEqual(await readCredentialState(pool, tenantId), before);
  assert.deepEqual(await readEvents(pool, tenantId), beforeEvents);
}

async function verifyCallerSpoofAndOldDigestReuse(pool, tenantId) {
  const before = await readCredentialState(pool, tenantId);
  const beforeEvents = await readEvents(pool, tenantId);
  const spoofTenantId = await createTenant(
    pool,
    "Meta credential spoof verifier",
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO public.meta_credential_envelopes (
         tenant_id,
         key_version,
         initialization_vector,
         ciphertext,
         credential_revision,
         envelope_digest
       ) VALUES ($1, $2, $3, $4, 9, $5)`,
      [
        spoofTenantId,
        envelopeA.keyVersion,
        envelopeA.initializationVector,
        envelopeA.ciphertext,
        envelopeDigest(spoofTenantId, envelopeA),
      ],
    ),
    /revision identity is database-derived/,
  );
  const spoofCount = await pool.query(
    `SELECT
       (SELECT pg_catalog.count(*)::integer
        FROM public.meta_credential_envelopes
        WHERE tenant_id = $1) AS envelopes,
       (SELECT pg_catalog.count(*)::integer
        FROM public.meta_credential_revision_events
        WHERE tenant_id = $1) AS events`,
    [spoofTenantId],
  );
  assert.deepEqual(spoofCount.rows, [{ envelopes: 0, events: 0 }]);

  await assert.rejects(
    pool.query(
      `UPDATE public.meta_credential_envelopes
       SET credential_revision = credential_revision + 1
       WHERE tenant_id = $1`,
      [tenantId],
    ),
    /revision identity is database-derived/,
  );
  await assert.rejects(
    pool.query(
      `UPDATE public.meta_credential_envelopes
       SET envelope_digest = $2
       WHERE tenant_id = $1`,
      [tenantId, envelopeDigest(tenantId, envelopeG)],
    ),
    /revision identity is database-derived/,
  );
  await assert.rejects(
    storeEnvelope(pool, tenantId, envelopeA),
    /envelope digest cannot be reused/,
  );
  assert.deepEqual(await readCredentialState(pool, tenantId), before);
  assert.deepEqual(await readEvents(pool, tenantId), beforeEvents);
}

async function verifyDirectLedgerMutationDenial(pool, tenantId) {
  const state = await readCredentialState(pool, tenantId);
  const directDigest = envelopeDigest(tenantId, envelopeG);
  await assert.rejects(
    pool.query(
      `INSERT INTO public.meta_credential_revision_events (
         event_key,
         tenant_id,
         credential_revision,
         envelope_digest,
         key_version,
         recorded_at,
         created_at
       ) VALUES (
         $1, $2, $3, $4, 'v1',
         date_trunc('milliseconds', CURRENT_TIMESTAMP),
         date_trunc('milliseconds', CURRENT_TIMESTAMP)
       )`,
      [
        revisionEventKey(
          tenantId,
          state.credentialRevision + 1,
          directDigest,
        ),
        tenantId,
        state.credentialRevision + 1,
        directDigest,
      ],
    ),
    /event insert is trigger-owned/,
  );
  await assert.rejects(
    pool.query(
      `UPDATE public.meta_credential_revision_events
       SET created_at = created_at
       WHERE tenant_id = $1`,
      [tenantId],
    ),
    /events are append-only/,
  );
  await assert.rejects(
    pool.query(
      `DELETE FROM public.meta_credential_revision_events
       WHERE tenant_id = $1`,
      [tenantId],
    ),
    /events are append-only/,
  );
  await assert.rejects(
    pool.query("TRUNCATE public.meta_credential_revision_events"),
    /events are append-only/,
  );
}

async function verifyLedgerCatalogAndRedaction(pool, tenantId) {
  const columns = await pool.query(
    `SELECT
       column_name AS name,
       data_type AS type,
       is_nullable AS nullable,
       column_default AS "default"
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'meta_credential_revision_events'
     ORDER BY ordinal_position`,
  );
  assert.deepEqual(columns.rows, [
    { name: "event_key", type: "text", nullable: "NO", default: null },
    { name: "tenant_id", type: "bigint", nullable: "NO", default: null },
    {
      name: "credential_revision",
      type: "bigint",
      nullable: "NO",
      default: null,
    },
    {
      name: "envelope_digest",
      type: "text",
      nullable: "NO",
      default: null,
    },
    { name: "key_version", type: "text", nullable: "NO", default: null },
    {
      name: "recorded_at",
      type: "timestamp with time zone",
      nullable: "NO",
      default: null,
    },
    {
      name: "created_at",
      type: "timestamp with time zone",
      nullable: "NO",
      default: null,
    },
  ]);
  assert.doesNotMatch(
    columns.rows.map(({ name }) => name).join("|"),
    /initialization|ciphertext|token|secret|phone|email|payload|provider/i,
  );

  const constraints = await pool.query(
    `SELECT conname AS name, contype AS type
     FROM pg_catalog.pg_constraint
     WHERE conrelid =
       'public.meta_credential_revision_events'::pg_catalog.regclass
     ORDER BY conname`,
  );
  assert.deepEqual(constraints.rows, [
    { name: "meta_credential_revision_events_digest_sha256", type: "c" },
    { name: "meta_credential_revision_events_event_key_sha256", type: "c" },
    { name: "meta_credential_revision_events_key_version_valid", type: "c" },
    { name: "meta_credential_revision_events_pkey", type: "p" },
    { name: "meta_credential_revision_events_revision_positive", type: "c" },
    { name: "meta_credential_revision_events_tenant_digest_uq", type: "u" },
    { name: "meta_credential_revision_events_tenant_fk", type: "f" },
    { name: "meta_credential_revision_events_tenant_revision_uq", type: "u" },
    { name: "meta_credential_revision_events_timestamps_canonical", type: "c" },
  ]);

  const triggers = await pool.query(
    `SELECT
       relation.relname AS "table",
       trigger.tgname AS name,
       trigger.tgtype::integer AS type,
       procedure.proname AS function
     FROM pg_catalog.pg_trigger AS trigger
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = trigger.tgrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     INNER JOIN pg_catalog.pg_proc AS procedure
       ON procedure.oid = trigger.tgfoid
      AND procedure.pronamespace = namespace.oid
     WHERE namespace.nspname = 'public'
       AND relation.relname IN (
         'meta_credential_envelopes',
         'meta_credential_revision_events'
       )
       AND trigger.tgisinternal = false
       AND trigger.tgenabled = 'O'
     ORDER BY relation.relname, trigger.tgname`,
  );
  assert.deepEqual(triggers.rows, [
    {
      table: "meta_credential_envelopes",
      name: "meta_credential_envelopes_prepare_insert",
      type: 7,
      function: "prepare_meta_credential_envelope_revision",
    },
    {
      table: "meta_credential_envelopes",
      name: "meta_credential_envelopes_prepare_update",
      type: 19,
      function: "prepare_meta_credential_envelope_revision",
    },
    {
      table: "meta_credential_envelopes",
      name: "meta_credential_envelopes_record_revision",
      type: 21,
      function: "record_meta_credential_revision_event",
    },
    {
      table: "meta_credential_revision_events",
      name: "meta_credential_revision_events_delete_guard",
      type: 11,
      function: "reject_meta_credential_revision_event_mutation",
    },
    {
      table: "meta_credential_revision_events",
      name: "meta_credential_revision_events_insert_guard",
      type: 7,
      function: "guard_meta_credential_revision_event_insert",
    },
    {
      table: "meta_credential_revision_events",
      name: "meta_credential_revision_events_truncate_guard",
      type: 34,
      function: "reject_meta_credential_revision_event_mutation",
    },
    {
      table: "meta_credential_revision_events",
      name: "meta_credential_revision_events_update_guard",
      type: 19,
      function: "reject_meta_credential_revision_event_mutation",
    },
  ]);

  const functions = await pool.query(
    `SELECT
       procedure.proname AS name,
       procedure.prosecdef AS "securityDefiner",
       procedure.proconfig AS config
     FROM pg_catalog.pg_proc AS procedure
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = procedure.pronamespace
     WHERE namespace.nspname = 'public'
       AND procedure.proname IN (
         'derive_meta_credential_envelope_digest_v1',
         'derive_meta_credential_revision_event_key_v1',
         'prepare_meta_credential_envelope_revision',
         'record_meta_credential_revision_event',
         'guard_meta_credential_revision_event_insert',
         'reject_meta_credential_revision_event_mutation'
       )
     ORDER BY procedure.proname`,
  );
  assert.equal(functions.rowCount, 6);
  assert.equal(
    functions.rows.every((row) => (
      row.securityDefiner === false &&
      JSON.stringify(row.config) ===
        JSON.stringify(["search_path=pg_catalog, pg_temp"])
    )),
    true,
  );

  const access = await pool.query(
    `SELECT
       pg_catalog.has_table_privilege(
         'public',
         'public.meta_credential_revision_events',
         'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
       ) AS "publicTableAccess",
       pg_catalog.has_function_privilege(
         'public',
         'public.derive_meta_credential_envelope_digest_v1(bigint,text,text,text)',
         'EXECUTE'
       ) AS "publicEnvelopeDigestExecute",
       pg_catalog.has_function_privilege(
         'public',
         'public.derive_meta_credential_revision_event_key_v1(bigint,bigint,text)',
         'EXECUTE'
       ) AS "publicEventKeyExecute"`,
  );
  assert.deepEqual(access.rows, [{
    publicTableAccess: false,
    publicEnvelopeDigestExecute: false,
    publicEventKeyExecute: false,
  }]);

  const currentLedger = await readEvents(pool, tenantId);
  const serializedLedger = JSON.stringify(currentLedger);
  for (const envelope of [
    envelopeA,
    envelopeB,
    envelopeC,
    envelopeD,
    envelopeE,
    envelopeF,
    envelopeG,
  ]) {
    assert.equal(
      serializedLedger.includes(envelope.initializationVector),
      false,
    );
    assert.equal(serializedLedger.includes(envelope.ciphertext), false);
  }

  const integrity = await pool.query(
    `SELECT pg_catalog.count(*)::integer AS count
     FROM public.meta_credential_envelopes AS credential
     LEFT JOIN public.meta_credential_revision_events AS event
       ON event.tenant_id = credential.tenant_id
      AND event.credential_revision = credential.credential_revision
      AND event.envelope_digest = credential.envelope_digest
      AND event.key_version = credential.key_version
      AND event.recorded_at = credential.updated_at
     WHERE event.event_key IS NULL`,
  );
  assert.deepEqual(integrity.rows, [{ count: 0 }]);

  const testObjects = await pool.query(
    `SELECT
       (SELECT pg_catalog.count(*)::integer
        FROM pg_catalog.pg_trigger AS trigger
        WHERE trigger.tgname =
          'meta_credential_revision_events_test_reject') AS triggers,
       (SELECT pg_catalog.count(*)::integer
        FROM pg_catalog.pg_proc AS procedure
        INNER JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public'
          AND procedure.proname =
            'reject_meta_credential_test_event') AS functions`,
  );
  assert.deepEqual(testObjects.rows, [{ triggers: 0, functions: 0 }]);
}

export async function verifyMetaCredentialRevisionLedgerPostgres(
  connectionString,
) {
  const checkedUrl =
    requireLocalMetaCredentialRevisionLedgerVerifierUrl(
      connectionString,
    );
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: checkedUrl,
    max: 6,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 2_000,
  });
  let cleanupAuthorized = false;

  try {
    const identity = await pool.query(
      `SELECT
         pg_catalog.current_database() AS database,
         pg_catalog.current_setting('server_version') AS version`,
    );
    assert.deepEqual(identity.rows.map(({ database }) => database), [
      requiredDatabaseName,
    ]);
    assert.match(identity.rows[0]?.version, /^16\./);
    await requireEmptyPublicSchema(pool);
    cleanupAuthorized = true;

    const { files, tenantId } =
      await applyAllMigrationsWithLegacyFixture(pool);
    await verifyBackfillReplayAndRotation(pool, tenantId);
    await verifyDatabaseClockOwnership(pool);
    await verifyConcurrentRotations(pool, tenantId);
    await verifyTransactionRollback(pool, tenantId);
    await verifyAtomicEventFailure(pool, tenantId);
    await verifyCallerSpoofAndOldDigestReuse(pool, tenantId);
    await verifyDirectLedgerMutationDenial(pool, tenantId);
    await verifyLedgerCatalogAndRedaction(pool, tenantId);

    return Object.freeze({
      migrationCount: files.length,
      backfill: true,
      exactReplay: true,
      rotation: true,
      concurrentReplay: true,
      concurrentDistinctRotations: true,
      transactionRollback: true,
      atomicEventFailure: true,
      callerSpoofBlocked: true,
      oldDigestReuseBlocked: true,
      directMutationBlocked: true,
      ledgerRedacted: true,
      catalogVerified: true,
      testObjectsCleaned: true,
      repeatabilityCleanup: true,
    });
  } finally {
    try {
      if (cleanupAuthorized) {
        await cleanupDedicatedVerifierDatabase(pool);
      }
    } finally {
      await pool.end();
    }
  }
}

async function main() {
  const connectionString = process.env[environmentKey];
  if (!connectionString) fail("URL_MISSING");
  const result = await verifyMetaCredentialRevisionLedgerPostgres(
    connectionString,
  );
  process.stdout.write(
    "PostgreSQL Meta credential revision ledger: PASS (" +
    `${result.migrationCount} migrations, backfill, replay, rotation, ` +
    "concurrency, rollback, atomicity, spoof/rollback denial, " +
    "redaction, catalog and repeatability cleanup verified)\n",
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : "";
if (import.meta.url === invokedPath) {
  await main();
}
