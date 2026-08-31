import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validatePostgresMigrationSources,
} from "../scripts/verify-postgres-migration-contract.mjs";

const fileName =
  "0057_bot_reply_staging_writer_barrier_and_late_truth.sql";
const migration = readFileSync(
  new URL(`../postgres/migrations/${fileName}`, import.meta.url),
  "utf8",
);

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function functionSource(functionName) {
  const start = new RegExp(
    `CREATE (?:OR REPLACE )?FUNCTION public\\.${escapeRegularExpression(functionName)}\\(`,
  ).exec(migration);
  assert.notEqual(start, null, `${functionName} is missing`);
  const end = migration.indexOf("\n$$;", start.index);
  assert.notEqual(end, -1, `${functionName} is incomplete`);
  return migration.slice(start.index, end + 4);
}

test("keeps 0057 dormant, deterministic, invoker-rights and provider-I/O free", () => {
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
    /graph\.facebook|access_token|\bfetch\s*\(|\bdblink\b|\bpostgres_fdw\b|\bpg_notify\b|\bCREATE\s+EXTENSION\b/i,
  );
  assert.match(migration, /Activation remains false/);
  assert.match(migration, /no provider transport/i);
});

test("makes messages.occurred_at immutable before the update", () => {
  assert.match(
    migration,
    /CREATE TRIGGER messages_occurred_at_immutable_guard\s+BEFORE UPDATE OF occurred_at ON public\.messages/,
  );
  assert.match(
    functionSource("reject_message_occurred_at_mutation_v1"),
    /NEW\.occurred_at IS DISTINCT FROM OLD\.occurred_at[\s\S]*immutable/,
  );
});

test("asserts row-trigger cooperation without acquiring a reversed barrier", () => {
  const triggerGuard = functionSource(
    "guard_bot_reply_staging_tenant_barrier_write_v1",
  );
  const tenantAssertion = functionSource(
    "assert_bot_reply_staging_tenant_barrier_owned_v1",
  );
  const admissionWriter = functionSource(
    "write_bot_reply_staging_pre_send_admission_v1",
  );

  assert.doesNotMatch(triggerGuard, /pg_advisory_(?:xact_)?lock\s*\(/);
  assert.doesNotMatch(tenantAssertion, /pg_advisory_(?:xact_)?lock\s*\(/);
  assert.match(tenantAssertion, /FROM pg_catalog\.pg_locks/);
  assert.match(tenantAssertion, /lock\.mode = 'ExclusiveLock'/);
  assert.match(
    functionSource("assert_bot_reply_staging_exact_session_barrier_v1"),
    /count\(\*\) FILTER \(\s*WHERE lock\.mode = 'ExclusiveLock'[\s\S]*count\(\*\) FILTER \(\s*WHERE lock\.mode = 'ExclusiveLock'/,
  );
  assert.match(
    functionSource("assert_bot_reply_staging_exact_session_barrier_v1"),
    /FROM pg_catalog\.pg_locks AS lock\s+WHERE lock\.pid = pg_catalog\.pg_backend_pid\(\)\s+AND lock\.locktype = 'advisory'\s+AND lock\.granted/,
  );
  assert.match(
    functionSource("assert_bot_reply_staging_exact_session_barrier_v1"),
    /matching_barrier_lock_count <> 1\s+OR NOT \(/,
  );

  for (const functionName of [
    "guard_bot_reply_staging_exact_permit_insert_v1",
    "guard_bot_reply_staging_exact_operation_insert_v1",
  ]) {
    const exactGuard = functionSource(functionName);
    assert.match(exactGuard, /SECURITY INVOKER/);
    assert.match(exactGuard, /SET search_path = pg_catalog, pg_temp/);
    assert.match(
      exactGuard,
      /assert_bot_reply_staging_exact_session_barrier_v1/,
    );
  }
  for (const triggerName of [
    "aa_staging_boundary_claim_exact_session_guard",
    "aa_staging_request_binding_exact_session_guard",
    "aa_staging_uncertainty_exact_session_guard",
    "aa_staging_operation_exact_session_guard",
    "aa_staging_outcome_exact_session_guard",
  ]) {
    assert.equal(migration.includes(`CREATE TRIGGER ${triggerName}`), true);
  }

  const acquire = admissionWriter.indexOf(
    "pg_catalog.pg_advisory_xact_lock(",
  );
  const lockedRun = admissionWriter.indexOf(
    "FROM public.bot_reply_staging_runs AS staging_run",
    acquire,
  );
  assert.equal(acquire >= 0, true);
  assert.equal(lockedRun > acquire, true);
});

test("hardens the complete settlement and cooldown projection chain", () => {
  const hardenedFunctions = [
    "project_whatsapp_rate_settlement_state",
    "enforce_whatsapp_pair_state_write",
    "enforce_whatsapp_portfolio_state_write",
    "enforce_whatsapp_portfolio_state_business_class",
    "enforce_whatsapp_provider_cooldown_insert",
    "enforce_whatsapp_provider_cooldown_reservation_class",
    "project_whatsapp_provider_cooldown_state",
    "enforce_whatsapp_provider_cooldown_state_write",
    "reject_whatsapp_rate_limit_evidence_mutation",
    "reject_whatsapp_rate_limit_state_delete",
    "enforce_whatsapp_rate_limit_throughput",
    "enforce_whatsapp_reservation_category_insert",
    "enforce_whatsapp_rate_reservation_insert",
    "project_whatsapp_rate_reservation_state",
  ];
  for (const functionName of hardenedFunctions) {
    const source = functionSource(functionName);
    assert.match(source, /SECURITY INVOKER/);
    assert.match(source, /SET search_path = pg_catalog, pg_temp/);
    assert.doesNotMatch(
      source,
      /\b(?:FROM|JOIN|UPDATE|INTO)\s+whatsapp_/,
      functionName,
    );
  }
  assert.match(migration, /aa_pair_state_tenant_barrier_guard/);
  assert.match(migration, /aa_portfolio_state_tenant_barrier_guard/);
});

test("uses one caller-bounded provider fact union and database-derived identity", () => {
  const source = functionSource(
    "write_bot_reply_staging_provider_fact_v1",
  );
  const header = source.slice(0, source.indexOf("RETURNS TABLE"));

  assert.match(
    header.replace(/\s+/g, " "),
    /requested_permit_key TEXT, requested_outcome_kind TEXT, requested_provider_message_id TEXT, requested_error_code INTEGER, requested_retry_after_seconds INTEGER/,
  );
  assert.doesNotMatch(
    header,
    /requested_(?:tenant|operation|provider_request|delivery|claim|reservation|timestamp|observed_at|attempted_at)/i,
  );
  assert.match(
    source,
    /requested_outcome_kind = 'accepted'[\s\S]*requested_error_code IS NULL[\s\S]*requested_retry_after_seconds IS NULL/,
  );
  assert.match(source, /requested_outcome_kind IS NULL/);
  assert.match(source, /\) IS NOT TRUE\s+THEN/);
  assert.equal(
    (source.match(/requested_error_code IS NOT NULL/g) ?? []).length,
    3,
  );
  assert.equal(
    (
      source.match(
        /requested_retry_after_seconds IS NOT NULL/g,
      ) ?? []
    ).length,
    2,
  );
  assert.match(source, /requested_error_code = 130429/);
  assert.match(source, /requested_error_code = 131056/);
  assert.match(source, /requested_error_code = 131047/);
  assert.match(source, /database_now := pg_catalog\.date_trunc/);
  assert.doesNotMatch(
    source,
    /pg_advisory_(?:xact_)?lock\s*\([^\n]*derive_bot_reply_staging_tenant_barrier/i,
  );
  assert.doesNotMatch(source, /pg_advisory_unlock\s*\(/);
  assert.match(
    source,
    /stored_boundary_claim\.backend_pid <>\s*pg_catalog\.pg_backend_pid\(\)/,
  );
});

test("locks the exact provider chain in the canonical order", () => {
  const source = functionSource(
    "write_bot_reply_staging_provider_fact_v1",
  );
  const orderedTokens = [
    "FROM public.bot_reply_staging_runs",
    "FROM public.meta_credential_envelopes",
    "FROM public.meta_credential_revision_events",
    "FROM public.bot_reply_staging_authorization_events",
    "FROM public.meta_connections",
    "FROM public.whatsapp_campaign_delivery_policy_events",
    "FROM public.bot_reply_staging_run_credential_bindings",
    "FROM public.bot_reply_deliveries",
    "FROM public.messages",
    "FROM public.whatsapp_rate_limit_reservations",
    "FROM public.whatsapp_provider_cooldown_state",
    "FROM public.bot_reply_staging_pre_send_admission_bindings",
    "FROM public.bot_reply_staging_credential_bound_pre_send_permits",
    "FROM public.bot_reply_staging_provider_operations",
    "FROM public.bot_reply_provider_request_claims",
  ];
  let previous = -1;
  for (const token of orderedTokens) {
    const index = source.indexOf(token, previous + 1);
    assert.equal(index > previous, true, token);
    previous = index;
  }
});

test("binds 131047 to the committed boundary time and a database rejection time", () => {
  const writer = functionSource(
    "write_bot_reply_staging_provider_fact_v1",
  );
  const guard = functionSource(
    "enforce_bot_reply_window_rejection_insert",
  );

  assert.match(writer, /attempted_at := stored_boundary_claim\.proved_at/);
  assert.match(
    writer,
    /'provider-failed',[\s\S]*attempted_at,[\s\S]*attempted_at[\s\S]*131047[\s\S]*database_now/,
  );
  assert.match(
    guard,
    /boundary_claim\.proved_at = NEW\.attempted_at/,
  );
  assert.doesNotMatch(
    guard,
    /locked_reservation\.reserved_at\s*<>\s*NEW\.attempted_at/,
  );
});

test("records ambiguity without terminalizing and lets exact truth supersede", () => {
  const source = functionSource(
    "write_bot_reply_staging_provider_uncertainty_v1",
  );
  const exactProbe = source.indexOf("INTO exact_fact_count");
  const ambiguousUpdate = source.indexOf("status = 'ambiguous'");
  const uncertaintyInsert = source.indexOf(
    "INSERT INTO public.bot_reply_staging_provider_uncertainty_events",
  );

  assert.equal(exactProbe >= 0, true);
  assert.equal(ambiguousUpdate > exactProbe, true);
  assert.equal(uncertaintyInsert > ambiguousUpdate, true);
  assert.match(
    source,
    /exact_fact_count > 0[\s\S]*'superseded'[\s\S]*'exact-provider-fact'/,
  );
  assert.match(source, /requested_reason NOT IN \('timeout', 'threw'\)/);
  assert.match(source, /requested_reason IS NULL/);
  assert.match(
    source,
    /existing_uncertainty\.source_reason <> requested_reason[\s\S]*uncertainty replay conflicts/,
  );
  assert.doesNotMatch(
    source,
    /INSERT INTO public\.bot_reply_staging_provider_operation_outcomes/,
  );
});

test("binds admission to one database-derived immutable service scope", () => {
  const reservationWriter = functionSource(
    "reserve_and_bind_bot_reply_staging_service_reply_v1",
  );
  const admissionWriter = functionSource(
    "write_bot_reply_staging_pre_send_admission_v1",
  );
  const admissionHeader = admissionWriter.slice(
    0,
    admissionWriter.indexOf("RETURNS TABLE"),
  ).replace(/\s+/g, " ");

  assert.match(
    admissionHeader,
    /write_bot_reply_staging_pre_send_admission_v1\( requested_scope_binding_key TEXT \)/,
  );
  assert.doesNotMatch(
    admissionHeader,
    /requested_(?:run|delivery|reservation|tenant|claim|timestamp)/,
  );
  assert.match(
    migration,
    /CREATE TABLE public\.bot_reply_staging_service_reply_scope_bindings/,
  );
  assert.match(
    migration,
    /bot_reply_admission_scope_fk[\s\S]*REFERENCES public\.bot_reply_staging_service_reply_scope_bindings/,
  );
  assert.match(
    reservationWriter,
    /locked_inbound\.conversation_key <>[\s\S]*locked_delivery\.conversation_key/,
  );
  assert.match(
    reservationWriter,
    /locked_contact\.phone_e164 <>[\s\S]*locked_delivery\.recipient_phone_e164/,
  );
  assert.match(
    reservationWriter,
    /current_connection\.phone_number_id IS DISTINCT FROM[\s\S]*locked_delivery\.sender_phone_number_id/,
  );
  assert.match(
    reservationWriter,
    /authorized_recipient_source_digest[\s\S]*portfolio_source_digest[\s\S]*sender_source_digest[\s\S]*rate_recipient_source_digest/,
  );
  assert.match(
    reservationWriter,
    /INSERT INTO public\.whatsapp_rate_limit_reservations[\s\S]*INSERT INTO public\.bot_reply_staging_service_reply_scope_bindings/,
  );
  assert.match(
    admissionWriter,
    /FROM public\.bot_reply_staging_service_reply_scope_bindings AS scope[\s\S]*pg_catalog\.pg_advisory_xact_lock/,
  );
});

test("replays an exact provider fact after finalization", () => {
  const source = functionSource(
    "write_bot_reply_staging_provider_fact_v1",
  );
  const exactFactReplay = source.indexOf("exact_fact_count = 1");
  const finalizedOutcomeConflict = source.indexOf(
    "stored_outcome.operation_key IS NOT NULL",
  );
  assert.equal(exactFactReplay >= 0, true);
  assert.equal(finalizedOutcomeConflict > exactFactReplay, true);
});

test("allows accepted late truth only for the exact staging boundary chain", () => {
  const transition = functionSource(
    "enforce_bot_reply_delivery_transition",
  );
  const linkGuard = functionSource(
    "enforce_bot_reply_provider_link_insert",
  );
  const projection = functionSource(
    "project_bot_reply_provider_acceptance",
  );

  assert.match(
    transition,
    /OLD\.status IN \('sending', 'ambiguous'\)[\s\S]*NEW\.status = 'accepted'/,
  );
  assert.match(
    transition,
    /OLD\.last_error_code <> 'DELIVERY_OUTCOME_UNKNOWN'[\s\S]*bot_reply_staging_provider_boundary_claims/,
  );
  assert.match(
    linkGuard,
    /staging_chain_count = 1[\s\S]*locked_delivery\.status IN \('sending', 'ambiguous'\)/,
  );
  assert.match(
    projection,
    /last_error_code = NULL[\s\S]*status IN \('sending', 'ambiguous'\)/,
  );
  assert.doesNotMatch(projection, /claim_version\s*=/);
});

test("allows every exact fact to supersede immutable uncertainty", () => {
  const transition = functionSource(
    "enforce_bot_reply_delivery_transition",
  );
  const writer = functionSource(
    "write_bot_reply_staging_provider_fact_v1",
  );

  assert.match(
    transition,
    /OLD\.status = 'ambiguous' AND NEW\.status = 'pending'[\s\S]*bot_reply_provider_deferral_events[\s\S]*bot_reply_staging_provider_uncertainty_events/,
  );
  assert.match(
    transition,
    /OLD\.status = 'ambiguous' AND NEW\.status = 'rejected'[\s\S]*bot_reply_service_window_rejection_events[\s\S]*bot_reply_staging_provider_uncertainty_events/,
  );
  assert.match(
    writer,
    /status = 'pending',[\s\S]*attempt_count = 0,[\s\S]*last_error_code = NULL/,
  );
  assert.match(
    writer,
    /status = 'rejected'[\s\S]*status IN \('sending', 'ambiguous'\)/,
  );
  assert.doesNotMatch(
    writer,
    /DELETE FROM public\.bot_reply_staging_provider_uncertainty_events/,
  );
});

test("closes append-only evidence against TRUNCATE and PUBLIC access", () => {
  const safetyTruncateTargets = [
    "bot_reply_delivery_provider_links",
    "bot_reply_provider_deferral_events",
    "bot_reply_service_window_rejection_events",
    "whatsapp_rate_limit_reservations",
    "whatsapp_rate_limit_settlements",
    "whatsapp_provider_cooldown_events",
    "whatsapp_provider_cooldown_state",
    "whatsapp_pair_rate_limit_state",
    "whatsapp_portfolio_recipient_rate_limit_state",
  ];
  assert.equal(safetyTruncateTargets.length, 9);
  for (const table of safetyTruncateTargets) {
    assert.match(
      migration,
      new RegExp(`BEFORE TRUNCATE ON public\\.${table}`),
      table,
    );
  }
  assert.match(
    migration,
    /whatsapp_pair_state_truncate_guard[\s\S]*BEFORE TRUNCATE ON public\.whatsapp_pair_rate_limit_state/,
  );
  assert.match(
    migration,
    /whatsapp_portfolio_state_truncate_guard[\s\S]*BEFORE TRUNCATE ON public\.whatsapp_portfolio_recipient_rate_limit_state/,
  );
  assert.match(
    migration,
    /bot_reply_staging_service_scope_truncate_guard[\s\S]*BEFORE TRUNCATE[\s\S]*ON public\.bot_reply_staging_service_reply_scope_bindings/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION\s+public\.write_bot_reply_staging_provider_fact_v1\([\s\S]*FROM PUBLIC/,
  );
  assert.match(migration, /Migration 0057 postcondition failed/);
  assert.match(
    migration,
    /protected_function_count <> 37[\s\S]*protected_trigger_count <> 35/,
  );
});

test("keeps the general migration contract closed to extra D1e writes", () => {
  const extraInsert = `${migration}\nCREATE FUNCTION public.forbidden_d1e_writer()\nRETURNS void LANGUAGE plpgsql AS $$\nBEGIN\n  INSERT INTO public.tenants (display_name, status) VALUES ('forbidden', 'active');\nEND;\n$$;\n`;
  const migrationFiles = Array.from(
    { length: 58 },
    (_, index) =>
      index === 57
        ? fileName
        : `${String(index).padStart(4, "0")}_prior.sql`,
  );
  const sources = migrationFiles.map(
    (_, index) => index === 57 ? extraInsert : "SELECT 1;",
  );
  const findings = validatePostgresMigrationSources({
    migrationFiles,
    sources,
  });
  assert.equal(
    findings.some(({ code }) => code === "POSTGRES_SEED_DATA_PRESENT"),
    true,
  );
});
