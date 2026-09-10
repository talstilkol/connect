import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../postgres/migrations/0056_bot_reply_staging_credential_bound_pre_send_session_barrier.sql",
    import.meta.url,
  ),
  "utf8",
);

const capabilityFunctionNames = Object.freeze({
  consume:
    "consume_bot_reply_staging_credential_bound_pre_send_permit_v1",
  finalize:
    "finalize_bot_reply_staging_credential_bound_pre_send_permit_v1",
  reconcile:
    "reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1",
});

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requireFunctionName(pattern, description) {
  const matches = Array.from(
    migration.matchAll(/CREATE FUNCTION\s+public\.([a-z0-9_]+)\s*\(/g),
    (match) => match[1],
  ).filter((name) => pattern.test(name));

  assert.equal(
    matches.length,
    1,
    `${description} must have one unambiguous function`,
  );
  return matches[0];
}

function functionSource(functionName) {
  const startPattern = new RegExp(
    `CREATE FUNCTION\\s+public\\.${escapeRegularExpression(functionName)}\\s*\\(`,
  );
  const startMatch = startPattern.exec(migration);

  assert.notEqual(startMatch, null, `${functionName} is missing`);
  const end = migration.indexOf("\n$$;", startMatch.index);
  assert.notEqual(end, -1, `${functionName} body is incomplete`);
  return migration.slice(startMatch.index, end + 4);
}

function functionHeader(functionName) {
  const source = functionSource(functionName);
  const returnsIndex = source.indexOf("RETURNS");

  assert.notEqual(returnsIndex, -1, `${functionName} RETURNS is missing`);
  return source.slice(0, returnsIndex);
}

function functionParameters(functionName) {
  const header = functionHeader(functionName);
  const openParenthesis = header.indexOf("(");
  const closeParenthesis = header.lastIndexOf(")");

  assert.equal(openParenthesis >= 0, true, `${functionName} arguments are missing`);
  assert.equal(
    closeParenthesis > openParenthesis,
    true,
    `${functionName} arguments are incomplete`,
  );
  return header.slice(openParenthesis + 1, closeParenthesis);
}

function assertPermitKeyOnlySignature(functionName) {
  const normalizedHeader = functionHeader(functionName)
    .replace(/\s+/g, " ")
    .trim();

  assert.match(
    normalizedHeader,
    new RegExp(
      `^CREATE FUNCTION public\\.${escapeRegularExpression(functionName)}` +
        `\\( requested_permit_key TEXT \\)$`,
    ),
  );
}

function requireProviderRequestBindingTable() {
  const tableMatch =
    /CREATE TABLE\s+public\.(bot_reply_staging_[a-z0-9_]*provider_request[a-z0-9_]*bindings)\s*\(/
      .exec(migration);

  assert.notEqual(
    tableMatch,
    null,
    "0056 must define one provider-request binding table",
  );
  const nextObject = /\n(?:CREATE (?:TABLE|FUNCTION|TRIGGER|INDEX)|REVOKE)\b/g;
  nextObject.lastIndex = tableMatch.index + tableMatch[0].length;
  const endMatch = nextObject.exec(migration);
  assert.notEqual(endMatch, null, "provider-request binding table is incomplete");

  return Object.freeze({
    name: tableMatch[1],
    source: migration.slice(tableMatch.index, endMatch.index),
  });
}

function requireProviderUncertaintyTable() {
  const tableName =
    "bot_reply_staging_provider_uncertainty_events";
  const startPattern = new RegExp(
    `CREATE TABLE\\s+public\\.${tableName}\\s*\\(`,
  );
  const startMatch = startPattern.exec(migration);

  assert.notEqual(startMatch, null, "provider uncertainty table is missing");
  const end = migration.indexOf(
    "\nCREATE TRIGGER bot_reply_staging_uncertainty_mutation_guard",
    startMatch.index,
  );
  assert.notEqual(end, -1, "provider uncertainty table is incomplete");

  return Object.freeze({
    name: tableName,
    source: migration.slice(startMatch.index, end),
  });
}

function requireProviderBoundaryClaimTable() {
  const tableName = "bot_reply_staging_provider_boundary_claims";
  const startPattern = new RegExp(
    `CREATE TABLE\\s+public\\.${tableName}\\s*\\(`,
  );
  const startMatch = startPattern.exec(migration);

  assert.notEqual(startMatch, null, "provider boundary claim table is missing");
  const end = migration.indexOf(
    "\nCREATE TRIGGER bot_reply_staging_boundary_claims_mutation_guard",
    startMatch.index,
  );
  assert.notEqual(end, -1, "provider boundary claim table is incomplete");

  return Object.freeze({
    name: tableName,
    source: migration.slice(startMatch.index, end),
  });
}

const acquireBarrierFunctionName = requireFunctionName(
  /^acquire_bot_reply_staging_[a-z0-9_]*session_barrier_v1$/,
  "session-barrier acquisition",
);
const releaseBarrierFunctionName = requireFunctionName(
  /^release_bot_reply_staging_[a-z0-9_]*session_barrier_v1$/,
  "session-barrier release",
);
const proveBarrierFunctionName = requireFunctionName(
  /^prove_bot_reply_staging_[a-z0-9_]*session_barrier_v1$/,
  "post-commit session-barrier proof",
);

test("keeps 0056 dormant, invoker-rights, deterministic and provider-I/O free", () => {
  assert.doesNotMatch(
    migration,
    /\bSECURITY DEFINER\b|^\s*GRANT\b|^\s*(?:CREATE|ALTER) ROLE\b/gm,
  );
  assert.doesNotMatch(
    migration,
    /\b(?:random|gen_random_uuid|uuid_generate_v[1-5])\s*\(/i,
  );
  assert.doesNotMatch(
    migration,
    /graph\.facebook|access_token|sender\.send|requestJson|\bfetch\s*\(|\bdblink\b|\bpostgres_fdw\b|\bpg_notify\b|\bCOPY\s+[^;]*\bPROGRAM\b|\bCREATE\s+EXTENSION\b|\b(?:http|net)\s*\./i,
  );
  assert.match(migration, /B2a2[\s\S]*dormant/i);
  assert.match(migration, /B2b[\s\S]*D1e[\s\S]*Activation[\s\S]*NO-GO/i);
  assert.match(migration, /no Runtime importer|without a Runtime importer/i);
});

test("exposes only permit-key capability signatures", () => {
  for (const functionName of [
    acquireBarrierFunctionName,
    proveBarrierFunctionName,
    releaseBarrierFunctionName,
    capabilityFunctionNames.consume,
    capabilityFunctionNames.finalize,
    capabilityFunctionNames.reconcile,
  ]) {
    assertPermitKeyOnlySignature(functionName);
    assert.match(functionSource(functionName), /SECURITY INVOKER/);
    assert.match(
      functionSource(functionName),
      /SET search_path = pg_catalog, pg_temp/,
    );
  }

  for (const functionName of Object.values(capabilityFunctionNames)) {
    assert.doesNotMatch(
      functionParameters(functionName),
      /tenant|provider_request|verdict|outcome|reason|timestamp|recipient|credential/i,
    );
  }
});

test("derives the exact tenant session lock from the persisted permit", () => {
  const source = functionSource(acquireBarrierFunctionName);
  const permitLookup = source.indexOf(
    "FROM public.bot_reply_staging_credential_bound_pre_send_permits",
  );
  const ownershipProbe = source.indexOf("FROM pg_catalog.pg_locks");
  const tryLock = source.indexOf("pg_catalog.pg_try_advisory_lock(");

  assert.equal(permitLookup >= 0, true);
  assert.equal(permitLookup < ownershipProbe, true);
  assert.equal(ownershipProbe < tryLock, true);
  assert.match(
    source,
    /WHERE (?:persisted_permit|permit)\.permit_key = requested_permit_key[\s\S]*persisted_tenant_id := permit\.tenant_id/,
  );
  assert.match(
    source,
    /(?:'connect-bot-reply-tenant-barrier-v1:'\s*\|\|\s*persisted_tenant_id::pg_catalog\.TEXT|derive_bot_reply_staging_tenant_barrier_key_v1\(\s*persisted_tenant_id\s*\))/,
  );
  assert.match(
    source,
    /FROM pg_catalog\.pg_locks[\s\S]*pid = pg_catalog\.pg_backend_pid\(\)[\s\S]*locktype = 'advisory'[\s\S]*granted/,
  );
  assert.match(source, /pg_catalog\.pg_try_advisory_lock\(/);
  assert.doesNotMatch(
    source,
    /PERFORM\s+pg_catalog\.pg_advisory_lock\s*\(/,
  );
  assert.match(
    source,
    /current_advisory_lock_count > 0[\s\S]*client is contaminated/i,
  );
  assert.doesNotMatch(source, /already-held/);
});

test("keeps unresolved provider operations as a crash-durable tenant fence", () => {
  const source = functionSource(acquireBarrierFunctionName);
  const tryLock = source.indexOf("pg_catalog.pg_try_advisory_lock(");
  const unresolvedLookup = source.indexOf(
    "FROM public.bot_reply_staging_provider_operations",
    tryLock,
  );
  const outcomeLookup = source.indexOf(
    "bot_reply_staging_provider_operation_outcomes",
    unresolvedLookup,
  );

  assert.equal(tryLock >= 0, true);
  assert.equal(unresolvedLookup > tryLock, true);
  assert.equal(outcomeLookup > unresolvedLookup, true);
  assert.match(
    source,
    /FROM public\.bot_reply_staging_provider_operations AS operation[\s\S]*INNER JOIN public\.whatsapp_rate_limit_reservations[\s\S]*LEFT JOIN\s+public\.bot_reply_staging_credential_provider_request_bindings/,
  );
  assert.match(
    source,
    /request_binding\.permit_key = requested_permit_key[\s\S]*released_resolution\.resolution_key IS NOT NULL[\s\S]*provider_outcome\.operation_key IS NULL[\s\S]*provider_outcome\.state <> 'completed'/,
  );
  assert.match(
    source,
    /released_resolution\.permit_key = request_binding\.permit_key[\s\S]*released_resolution\.provider_request_key =\s*request_binding\.provider_request_key[\s\S]*released_resolution\.resolved_at = request_binding\.bound_at[\s\S]*released_resolution\.outcome = 'released'[\s\S]*released_resolution\.reason_code = 'CAPABILITY_RELEASED'/,
  );
  assert.match(
    source,
    /unresolved_operation_count = 1[\s\S]*requested_unresolved_operation_count = 1[\s\S]*'reconciliation-required'/,
  );
  assert.match(
    source,
    /pg_catalog\.pg_advisory_unlock\(barrier_key\)[\s\S]*'blocked-unresolved'/,
  );
  assert.match(
    source,
    /EXCEPTION WHEN OTHERS THEN[\s\S]*pg_catalog\.pg_advisory_unlock\(barrier_key\)[\s\S]*RAISE/,
  );
});

test("makes every Meta rate-limit asset exclusive to one tenant", () => {
  const normalizedMigration = migration.replace(/\s+/g, " ");

  assert.match(
    migration,
    /Migration 0056 Meta asset preflight failed:[\s\S]*invalid assets[\s\S]*shared portfolios/,
  );
  assert.match(
    migration,
    /ALTER TABLE public\.meta_connections\s+ADD CONSTRAINT meta_connections_business_portfolio_uq\s+UNIQUE \(business_portfolio_id\)/,
  );
  for (const column of [
    "business_portfolio_id",
    "waba_id",
    "phone_number_id",
  ]) {
    assert.match(
      normalizedMigration,
      new RegExp(
        `ADD CONSTRAINT meta_connections_${column}_canonical` +
          ` CHECK \\(\\s*${column} OPERATOR\\(pg_catalog\\.~\\)` +
          `\\s+'\\^\\[1-9\\]\\[0-9\\]\\{0,63\\}\\$'\\s*\\)`,
      ),
    );
  }
  assert.match(
    migration,
    /meta_connections_business_portfolio_uq[\s\S]*constraint_record\.contype = 'u'[\s\S]*attribute\.attname = 'business_portfolio_id'/,
  );
  assert.match(
    migration,
    /Rate-limit subjects are derived from Meta assets rather than tenant IDs/,
  );
});

test("releases an exact fresh or reconciliation lock shape and detects leaks", () => {
  const source = functionSource(releaseBarrierFunctionName);
  const unlockMatches = source.match(/pg_catalog\.pg_advisory_unlock\s*\(/g) ?? [];
  const unlockIndex = source.indexOf("pg_catalog.pg_advisory_unlock(");
  const postUnlockProbe = source.indexOf(
    "FROM pg_catalog.pg_locks",
    unlockIndex,
  );

  assert.equal(unlockMatches.length, 2);
  assert.equal(unlockIndex >= 0, true);
  assert.equal(postUnlockProbe > unlockIndex, true);
  assert.match(
    source,
    /derive_bot_reply_staging_reconciliation_marker_key_v1\([\s\S]*stored_permit\.tenant_id,[\s\S]*stored_permit\.permit_key/,
  );
  assert.match(
    source,
    /current_advisory_lock_count = 1[\s\S]*matching_barrier_lock_count = 1[\s\S]*matching_reconciliation_marker_lock_count = 0[\s\S]*OR \([\s\S]*current_advisory_lock_count = 2[\s\S]*matching_reconciliation_marker_lock_count = 1/,
  );
  assert.match(
    source,
    /pid = pg_catalog\.pg_backend_pid\(\)[\s\S]*locktype = 'advisory'/,
  );
  assert.match(source, /'lock-leaked'/);
  assert.doesNotMatch(source, /pg_advisory_unlock_all/);
});

test("adds an append-only exact provider-request binding ledger", () => {
  const binding = requireProviderRequestBindingTable();

  for (const column of [
    "binding_key TEXT",
    "permit_key TEXT",
    "tenant_id BIGINT",
    "credential_revision BIGINT",
    "credential_envelope_digest TEXT",
    "credential_event_key TEXT",
    "operation_key TEXT",
    "operation_kind TEXT",
    "delivery_key TEXT",
    "delivery_claim_version INTEGER",
    "reservation_key TEXT",
    "provider_request_key TEXT",
    "bound_at TIMESTAMPTZ",
    "created_at TIMESTAMPTZ",
  ]) {
    assert.match(binding.source, new RegExp(`${column}\\s+NOT NULL`));
  }
  assert.match(binding.source, /permit_key TEXT NOT NULL UNIQUE/);
  assert.match(binding.source, /provider_request_key TEXT NOT NULL UNIQUE/);
  assert.match(
    binding.source,
    /CONSTRAINT bot_reply_staging_request_bindings_consumption_fk[\s\S]*?FOREIGN KEY \(\s*consumption_key,\s*permit_key,\s*tenant_id,\s*credential_revision,\s*credential_envelope_digest,\s*credential_event_key,\s*provider_request_key,\s*operation_key,\s*delivery_key,\s*delivery_claim_version,\s*reservation_key,\s*bound_at\s*\)[\s\S]*?REFERENCES\s+public\.bot_reply_staging_credential_bound_pre_send_permit_consumptions/,
  );
  assert.match(
    binding.source,
    /FOREIGN KEY \([\s\S]*provider_request_key,[\s\S]*delivery_key,[\s\S]*tenant_id,[\s\S]*delivery_claim_version,[\s\S]*reservation_key[\s\S]*REFERENCES public\.bot_reply_provider_request_claims/,
  );
  assert.match(
    binding.source,
    /bound_at = pg_catalog\.date_trunc\('milliseconds', bound_at\)[\s\S]*created_at = bound_at/,
  );
  assert.match(
    migration,
    new RegExp(
      `BEFORE UPDATE OR DELETE ON public\\.${escapeRegularExpression(binding.name)}` +
        `[\\s\\S]*BEFORE TRUNCATE ON public\\.${escapeRegularExpression(binding.name)}`,
    ),
  );
});

test("records uncertainty as append-only nonterminal evidence", () => {
  const uncertainty = requireProviderUncertaintyTable();
  const finalizeSource = functionSource(capabilityFunctionNames.finalize);

  for (const column of [
    "event_key TEXT",
    "permit_key TEXT",
    "operation_key TEXT",
    "run_key TEXT",
    "tenant_id BIGINT",
    "delivery_key TEXT",
    "reservation_key TEXT",
    "provider_request_key TEXT",
    "requested_at TIMESTAMPTZ",
    "uncertainty_kind TEXT",
    "detected_at TIMESTAMPTZ",
    "created_at TIMESTAMPTZ",
  ]) {
    assert.match(uncertainty.source, new RegExp(`${column}\\s+NOT NULL`));
  }
  assert.match(
    uncertainty.source,
    /FOREIGN KEY \(\s*permit_key,\s*operation_key,\s*run_key,\s*tenant_id,\s*delivery_key,\s*reservation_key,\s*provider_request_key,\s*requested_at\s*\)[\s\S]*REFERENCES[\s\S]*bot_reply_staging_credential_provider_request_bindings/,
  );
  assert.match(
    uncertainty.source,
    /uncertainty_kind IN \(\s*'provider-response-ambiguous',\s*'lease-expired-without-outcome'\s*\)/,
  );
  assert.match(
    uncertainty.source,
    /detected_at >= requested_at[\s\S]*UNIQUE \(operation_key, uncertainty_kind\)/,
  );
  assert.match(
    migration,
    /BEFORE UPDATE OR DELETE\s+ON public\.bot_reply_staging_provider_uncertainty_events[\s\S]*BEFORE TRUNCATE ON public\.bot_reply_staging_provider_uncertainty_events/,
  );
  assert.match(
    finalizeSource,
    /INSERT INTO public\.bot_reply_staging_provider_uncertainty_events[\s\S]*ON CONFLICT ON CONSTRAINT[\s\S]*bot_reply_staging_uncertainty_operation_kind_uq[\s\S]*DO NOTHING/,
  );
});

test("mints one durable provider boundary claim before any Meta send", () => {
  const boundary = requireProviderBoundaryClaimTable();
  const proofSource = functionSource(proveBarrierFunctionName);

  for (const column of [
    "claim_key TEXT",
    "permit_key TEXT",
    "operation_key TEXT",
    "run_key TEXT",
    "tenant_id BIGINT",
    "delivery_key TEXT",
    "reservation_key TEXT",
    "provider_request_key TEXT",
    "requested_at TIMESTAMPTZ",
    "backend_pid INTEGER",
    "proved_at TIMESTAMPTZ",
    "send_before TIMESTAMPTZ",
    "created_at TIMESTAMPTZ",
  ]) {
    assert.match(boundary.source, new RegExp(`${column}\\s+NOT NULL`));
  }
  assert.match(
    boundary.source,
    /FOREIGN KEY \(\s*permit_key,\s*operation_key,\s*run_key,\s*tenant_id,\s*delivery_key,\s*reservation_key,\s*provider_request_key,\s*requested_at\s*\)[\s\S]*REFERENCES[\s\S]*bot_reply_staging_credential_provider_request_bindings/,
  );
  for (const uniqueColumn of [
    "permit_key",
    "operation_key",
    "provider_request_key",
  ]) {
    assert.match(boundary.source, new RegExp(`UNIQUE \\(${uniqueColumn}\\)`));
  }
  assert.match(
    migration,
    /BEFORE UPDATE OR DELETE\s+ON public\.bot_reply_staging_provider_boundary_claims[\s\S]*BEFORE TRUNCATE ON public\.bot_reply_staging_provider_boundary_claims/,
  );
  assert.match(
    proofSource,
    /INSERT INTO public\.bot_reply_staging_provider_boundary_claims[\s\S]*ON CONFLICT DO NOTHING[\s\S]*RETURNING \* INTO stored_boundary_claim/,
  );
  assert.match(
    proofSource,
    /bot_reply_staging_provider_operation_outcomes[\s\S]*proof follows terminal outcome/,
  );
  assert.match(proofSource, /IF NOT FOUND THEN[\s\S]*already consumed/);
  assert.match(
    proofSource,
    /stored_boundary_claim\.backend_pid,[\s\S]*stored_boundary_claim\.send_before/,
  );
  assert.match(
    migration,
    /claim[\s\S]{0,120}INSERT's unambiguous commit acknowledgement/i,
  );
});

test("consumes only while the current session owns the exact barrier", () => {
  const source = functionSource(capabilityFunctionNames.consume);
  const acquireCall = source.indexOf(
    `public.${acquireBarrierFunctionName}(requested_permit_key)`,
  );
  const permitLookup = source.indexOf(
    "FROM public.bot_reply_staging_credential_bound_pre_send_permits",
  );
  const ownershipProbe = source.indexOf("FROM pg_catalog.pg_locks");
  const databaseClock = source.indexOf("pg_catalog.clock_timestamp()");

  assert.match(
    source,
    /current_setting\('transaction_isolation'\)[\s\S]*'read committed'/,
  );
  assert.equal(
    acquireCall,
    -1,
    "consume must assert the existing session lock without re-entering it",
  );
  assert.equal(permitLookup >= 0, true);
  assert.equal(permitLookup < ownershipProbe, true);
  assert.equal(ownershipProbe < databaseClock, true);
  assert.match(
    source,
    /pid = pg_catalog\.pg_backend_pid\(\)[\s\S]*locktype = 'advisory'[\s\S]*granted/,
  );
  assert.match(
    source,
    /database_now := pg_catalog\.date_trunc\([\s\S]*pg_catalog\.clock_timestamp\(\)/,
  );
  assert.match(
    source,
    /permit_expires_at[\s\S]*database_now\s*\+\s*INTERVAL '15 seconds'|database_now\s*\+\s*INTERVAL '15 seconds'[\s\S]*permit_expires_at/,
  );
});

test("preserves lock continuity through consume, proof and finalization", () => {
  for (const functionName of [
    proveBarrierFunctionName,
    capabilityFunctionNames.consume,
  ]) {
    const source = functionSource(functionName);
    const ownershipProbe = source.indexOf("FROM pg_catalog.pg_locks");

    assert.equal(ownershipProbe >= 0, true);
    assert.match(
      source,
      /current_advisory_lock_count <> 1[\s\S]*matching_barrier_lock_count <> 1/,
    );
    assert.doesNotMatch(source, /pg_catalog\.pg_advisory_unlock\s*\(/);
    assert.doesNotMatch(source, /pg_catalog\.pg_try_advisory_lock\s*\(/);
  }

  const finalizeSource = functionSource(capabilityFunctionNames.finalize);
  assert.match(
    finalizeSource,
    /matching_barrier_lock_count <> 1[\s\S]*current_advisory_lock_count = 1[\s\S]*matching_reconciliation_marker_lock_count = 0[\s\S]*OR \([\s\S]*current_advisory_lock_count = 2[\s\S]*matching_reconciliation_marker_lock_count = 1/,
  );
  assert.doesNotMatch(finalizeSource, /pg_catalog\.pg_advisory_unlock\s*\(/);
  assert.doesNotMatch(finalizeSource, /pg_catalog\.pg_try_advisory_lock\s*\(/);

  const proofSource = functionSource(proveBarrierFunctionName);
  assert.match(proofSource, /"backendPid" INTEGER/);
  assert.match(proofSource, /"sendBefore" TIMESTAMPTZ/);
  assert.match(proofSource, /pg_catalog\.pg_backend_pid\(\)/);
  assert.match(
    proofSource,
    /database_now \+ INTERVAL '15 seconds' >=[\s\S]*permit_expires_at/,
  );
  assert.match(migration, /COMMIT[\s\S]*ReadyForQuery[\s\S]*same physical client/i);
});

test("post-commit proof requires the complete released capability chain", () => {
  const source = functionSource(proveBarrierFunctionName);

  for (const relation of [
    "bot_reply_staging_credential_bound_pre_send_permit_resolutions",
    "bot_reply_staging_credential_bound_pre_send_permit_consumptions",
    "bot_reply_staging_credential_provider_request_bindings",
    "bot_reply_staging_provider_operations",
    "bot_reply_provider_request_claims",
  ]) {
    assert.equal(source.includes(`public.${relation}`), true, relation);
  }
  assert.match(
    source,
    /stored_resolution\.outcome <> 'released'[\s\S]*stored_resolution\.reason_code <> 'CAPABILITY_RELEASED'/,
  );
  assert.match(
    source,
    /stored_resolution\.provider_request_key <>[\s\S]*stored_consumption\.provider_request_key <>[\s\S]*stored_binding\.provider_request_key <>[\s\S]*stored_operation\.provider_request_key <> stored_request\.request_key/,
  );
  assert.match(
    source,
    /stored_resolution\.resolved_at <> stored_consumption\.consumed_at[\s\S]*stored_consumption\.consumed_at <> stored_binding\.bound_at[\s\S]*stored_binding\.bound_at <> stored_operation\.requested_at[\s\S]*stored_operation\.requested_at <> stored_request\.requested_at/,
  );
  assert.match(source, /lacks committed released chain/);
});

test("locks cooldown evidence deterministically and rechecks it post-lock", () => {
  const source = functionSource(capabilityFunctionNames.consume);
  const cooldownLookup = source.indexOf(
    "FROM public.whatsapp_provider_cooldown_state",
  );
  const databaseClock = source.indexOf("database_now :=");

  assert.equal(cooldownLookup >= 0, true);
  assert.equal(cooldownLookup < databaseClock, true);
  assert.match(
    source,
    /FROM public\.whatsapp_provider_cooldown_state[\s\S]*ORDER BY[\s\S]*scope[\s\S]*sender_key[\s\S]*recipient_key[\s\S]*FOR UPDATE/,
  );
  assert.match(
    source,
    /blocked_until > database_now[\s\S]*scope = 'sender'[\s\S]*scope = 'pair'/,
  );
  assert.match(source, /PROVIDER_COOLDOWN_ACTIVE/);
});

test("releases capability only for the two real send operation kinds", () => {
  const source = functionSource(capabilityFunctionNames.consume);

  assert.match(
    source,
    /operation_kind NOT IN \(\s*'text-send',\s*'button-send'\s*\)/,
  );
  assert.match(source, /OPERATION_KIND_NOT_RELEASABLE/);
  for (const forbiddenKind of [
    "customer-window-expired",
    "provider-retry",
    "pair-limit",
    "duplicate-safety",
  ]) {
    assert.doesNotMatch(
      source,
      new RegExp(
        `operation_kind\\s+(?:=|IN)[^;]{0,160}'${forbiddenKind}'` +
          `[^;]{0,240}(?:released|authorized)`,
        "i",
      ),
    );
  }
});

test("atomically binds operation, request, consumption and released resolution", () => {
  const source = functionSource(capabilityFunctionNames.consume);
  const binding = requireProviderRequestBindingTable();
  const requiredInserts = [
    "INSERT INTO public.bot_reply_staging_provider_operations",
    "INSERT INTO public.bot_reply_provider_request_claims",
    "INSERT INTO public.bot_reply_staging_credential_bound_pre_send_permit_consumptions",
    `INSERT INTO public.${binding.name}`,
    "INSERT INTO public.bot_reply_staging_credential_bound_pre_send_permit_resolutions",
  ];
  let previousIndex = -1;

  for (const statement of requiredInserts) {
    const index = source.indexOf(statement, previousIndex + 1);
    assert.equal(index > previousIndex, true, statement);
    previousIndex = index;
  }
  assert.match(
    source,
    /INSERT INTO public\.bot_reply_staging_credential_bound_pre_send_permit_resolutions[\s\S]*'released'[\s\S]*'CAPABILITY_RELEASED'/,
  );
  assert.doesNotMatch(source, /\b(?:COMMIT|ROLLBACK)\b/);
});

test("never returns a provider-request key, timestamp or replay capability", () => {
  const source = functionSource(capabilityFunctionNames.consume);
  const returnsStart = source.indexOf("RETURNS TABLE");
  const languageStart = source.indexOf("LANGUAGE", returnsStart);
  const returnShape = source.slice(returnsStart, languageStart);
  const replayIndex = source.search(/replay-(?:blocked|denied)/i);

  assert.equal(returnsStart >= 0, true);
  assert.equal(languageStart > returnsStart, true);
  assert.doesNotMatch(returnShape, /providerRequestKey|provider_request_key/i);
  assert.doesNotMatch(returnShape, /preparedAt|TIMESTAMPTZ/i);
  assert.equal(replayIndex >= 0, true);
  assert.match(
    source.slice(replayIndex, replayIndex + 900),
    /CAPABILITY_ALREADY_RELEASED[\s\S]*ELSE stored_resolution\.reason_code[\s\S]*END;/,
  );
});

test("finalize and reconcile derive results from durable provider facts", () => {
  const finalizeSource = functionSource(capabilityFunctionNames.finalize);
  const reconcileSource = functionSource(capabilityFunctionNames.reconcile);

  for (const functionName of Object.values(capabilityFunctionNames).slice(1)) {
    assertPermitKeyOnlySignature(functionName);
    assert.doesNotMatch(
      functionParameters(functionName),
      /verdict|outcome|provider_message|provider_error|observed_at|requested_at/i,
    );
  }

  assert.match(finalizeSource, /bot_reply_staging_provider_operations/);
  assert.match(
    finalizeSource,
    /bot_reply_staging_provider_operation_outcomes/,
  );
  assert.match(finalizeSource, /bot_reply_delivery_provider_links/);
  assert.match(finalizeSource, /bot_reply_provider_deferral_events/);
  assert.match(finalizeSource, /bot_reply_service_window_rejection_events/);
  assert.match(finalizeSource, /deferral_provider_error_code = 130429/);
  assert.match(finalizeSource, /deferral_provider_error_code = 131056/);
  assert.match(
    finalizeSource,
    /stored_operation\.operation_kind NOT IN \('text-send', 'button-send'\)/,
  );
  assert.doesNotMatch(
    finalizeSource,
    /stored_operation\.operation_kind\s*=\s*'(?:provider-retry|pair-limit|customer-window-expired)'/,
  );
  assert.doesNotMatch(
    finalizeSource,
    /derived_state = 'completed'[\s\S]{0,180}run_lease_expires_at/,
  );
  assert.match(
    finalizeSource,
    /FROM pg_catalog\.pg_locks[\s\S]*pid = pg_catalog\.pg_backend_pid\(\)/,
  );
  assert.match(
    reconcileSource,
    /finalize_bot_reply_staging_credential_bound_pre_send_permit_v1\s*\(\s*requested_permit_key\s*\)/,
  );

  for (const source of [finalizeSource, reconcileSource]) {
    assert.doesNotMatch(
      source,
      /INSERT INTO public\.(?:bot_reply_provider_acceptances|bot_reply_provider_deferrals|bot_reply_service_window_rejections)/,
    );
  }
});

test("keeps ambiguous and lease-expired sends nonterminal for late truth", () => {
  const source = functionSource(capabilityFunctionNames.finalize);
  const ambiguousBranch = source.indexOf(
    "ELSIF ambiguous_observed_at IS NOT NULL THEN",
  );
  const leaseBranch = source.indexOf(
    "ELSIF database_now < stored_operation.run_lease_expires_at THEN",
    ambiguousBranch,
  );
  const outcomeInsert = source.indexOf(
    "INSERT INTO public.bot_reply_staging_provider_operation_outcomes",
    leaseBranch,
  );

  assert.equal(ambiguousBranch >= 0, true);
  assert.equal(leaseBranch > ambiguousBranch, true);
  assert.equal(outcomeInsert > leaseBranch, true);
  assert.match(
    source.slice(ambiguousBranch, leaseBranch),
    /uncertainty_kind := 'provider-response-ambiguous'[\s\S]*uncertainty_state := 'ambiguous'/,
  );
  assert.match(
    source.slice(leaseBranch, outcomeInsert),
    /database_now < stored_operation\.run_lease_expires_at[\s\S]*'pending'[\s\S]*ELSE[\s\S]*uncertainty_kind := 'lease-expired-without-outcome'[\s\S]*INSERT INTO public\.bot_reply_staging_provider_uncertainty_events[\s\S]*'manual-reconciliation-required'[\s\S]*RETURN;/,
  );
  assert.doesNotMatch(source, /derived_state := 'indeterminate'/);
});

test("revokes every new capability and verifies exact catalog postconditions", () => {
  const binding = requireProviderRequestBindingTable();
  const uncertainty = requireProviderUncertaintyTable();
  const boundary = requireProviderBoundaryClaimTable();

  for (const tableName of [binding.name, uncertainty.name, boundary.name]) {
    assert.match(
      migration,
      new RegExp(
        `REVOKE ALL ON TABLE\\s+public\\.${escapeRegularExpression(tableName)}` +
          `\\s+FROM PUBLIC`,
      ),
    );
  }
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION\s+public\.derive_bot_reply_staging_tenant_barrier_key_v1\(BIGINT\)\s+FROM PUBLIC/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION\s+public\.derive_bot_reply_staging_reconciliation_marker_key_v1\(BIGINT, TEXT\)\s+FROM PUBLIC/,
  );
  for (const functionName of [
    acquireBarrierFunctionName,
    proveBarrierFunctionName,
    releaseBarrierFunctionName,
    ...Object.values(capabilityFunctionNames),
  ]) {
    assert.match(
      migration,
      new RegExp(
        `REVOKE ALL ON FUNCTION\\s+public\\.${escapeRegularExpression(functionName)}` +
          `\\(\\s*TEXT\\s*\\)\\s+FROM PUBLIC`,
      ),
    );
  }
  for (const catalogProof of [
    "pg_catalog.pg_class",
    "pg_catalog.pg_proc",
    "pg_catalog.pg_constraint",
    "pg_catalog.pg_trigger",
    "prosecdef",
    "proacl",
    "relacl",
    "proargtypes",
    "tgtype",
    "tgfoid",
    "pg_catalog.aclexplode",
  ]) {
    assert.equal(migration.includes(catalogProof), true, catalogProof);
  }
  assert.match(migration, /prosecdef = FALSE/);
  assert.match(
    migration,
    /privilege\.grantee\s*<>\s*(?:procedure|relation)\.(?:proowner|relowner)/,
  );
  assert.match(migration, /Migration 0056 postcondition failed/);
});
