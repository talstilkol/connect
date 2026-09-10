import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../postgres/migrations/0055_bot_reply_staging_credential_bound_pre_send_permit.sql",
    import.meta.url,
  ),
  "utf8",
);
const admissionTable = migration.slice(
  migration.indexOf(
    "CREATE TABLE public.bot_reply_staging_pre_send_admission_bindings (",
  ),
  migration.indexOf(
    "CREATE TABLE public.bot_reply_staging_run_credential_bindings (",
  ),
);
const runBindingSchema = migration.slice(
  migration.indexOf(
    "CREATE TABLE public.bot_reply_staging_run_credential_bindings (",
  ),
  migration.indexOf(
    "CREATE TABLE public.bot_reply_staging_credential_bound_pre_send_permits (",
  ),
);
const permitTable = migration.slice(
  migration.indexOf(
    "CREATE TABLE public.bot_reply_staging_credential_bound_pre_send_permits (",
  ),
  migration.indexOf(
    "CREATE TABLE\n  public.bot_reply_staging_credential_bound_pre_send_permit_consumptions (",
  ),
);
const claimV2 = migration.slice(
  migration.indexOf("CREATE FUNCTION public.claim_bot_reply_staging_run_v2("),
  migration.indexOf(
    "CREATE FUNCTION\n  public.reserve_bot_reply_staging_credential_bound_pre_send_permit_v2(",
  ),
);
const reserveV2 = migration.slice(
  migration.indexOf(
    "CREATE FUNCTION\n  public.reserve_bot_reply_staging_credential_bound_pre_send_permit_v2(",
  ),
  migration.indexOf("REVOKE ALL ON TABLE"),
);

test("keeps legacy authorizations unbound and derives new credential identity", () => {
  for (const column of [
    "credential_revision BIGINT",
    "credential_envelope_digest TEXT",
    "credential_event_key TEXT",
  ]) {
    assert.match(migration, new RegExp(`ADD COLUMN ${column}`));
  }
  assert.match(
    migration,
    /credential_revision IS NULL[\s\S]*credential_envelope_digest IS NULL[\s\S]*credential_event_key IS NULL[\s\S]*credential_revision IS NOT NULL/,
  );
  assert.match(
    migration,
    /CREATE FUNCTION public\.bind_bot_reply_staging_authorization_credential_v1\(\)[\s\S]*NEW\.credential_revision := current_credential\.credential_revision[\s\S]*NEW\.credential_envelope_digest := current_credential\.envelope_digest[\s\S]*NEW\.credential_event_key := current_credential_event\.event_key/,
  );
  assert.doesNotMatch(migration, /\bUPDATE\s+public\.bot_reply_staging_authorization_events\b/i);
});

test("binds an exact run claim to an exact authorization and credential event", () => {
  assert.match(
    migration,
    /CREATE TABLE public\.bot_reply_staging_run_credential_bindings/,
  );
  assert.match(
    migration,
    /UNIQUE \(run_key, run_claim_version\)/,
  );
  assert.match(
    runBindingSchema,
    /FOREIGN KEY \([\s\S]*authorization_event_key,[\s\S]*tenant_id,[\s\S]*authorization_version,[\s\S]*credential_revision,[\s\S]*credential_envelope_digest,[\s\S]*credential_event_key[\s\S]*REFERENCES public\.bot_reply_staging_authorization_events/,
  );
  assert.match(
    migration,
    /CREATE FUNCTION public\.claim_bot_reply_staging_run_v2\([\s\S]*public\.claim_bot_reply_staging_run_v1\([\s\S]*INSERT INTO public\.bot_reply_staging_run_credential_bindings/,
  );
  assert.match(migration, /"runBindingKey" TEXT/);
  assert.match(
    claimV2,
    /current_setting\('transaction_isolation'\)[\s\S]*'read committed'[\s\S]*FROM public\.claim_bot_reply_staging_run_v1\([\s\S]*IF NOT FOUND THEN/,
  );
  assert.doesNotMatch(claimV2, /receiptJson|claim_receipt_json/);
});

test("requires an immutable exact admission binding before permit reservation", () => {
  assert.match(
    migration,
    /CREATE TABLE public\.bot_reply_staging_pre_send_admission_bindings/,
  );
  assert.match(
    admissionTable,
    /bot_reply_staging_pre_send_admission_policy_fk[\s\S]*phone_throughput_messages_per_second,[\s\S]*maximum_outbound_messages_per_second[\s\S]*REFERENCES public\.whatsapp_campaign_delivery_policy_events/,
  );
  assert.match(
    admissionTable,
    /bot_reply_staging_pre_send_admission_reservation_fk[\s\S]*sender_key,[\s\S]*recipient_key,[\s\S]*policy_event_key,[\s\S]*reservation_reserved_at,[\s\S]*pair_reserved_until,[\s\S]*reservation_expires_at[\s\S]*REFERENCES public\.whatsapp_rate_limit_reservations/,
  );
  assert.match(
    runBindingSchema,
    /bot_reply_staging_pre_send_admission_run_binding_fk[\s\S]*FOREIGN KEY \([\s\S]*run_binding_key,[\s\S]*run_key,[\s\S]*tenant_id,[\s\S]*run_claim_version,[\s\S]*authorization_event_key,[\s\S]*authorization_version,[\s\S]*credential_revision,[\s\S]*credential_envelope_digest,[\s\S]*credential_event_key[\s\S]*REFERENCES public\.bot_reply_staging_run_credential_bindings/,
  );
  assert.match(
    permitTable,
    /bot_reply_staging_pre_send_permits_admission_fk[\s\S]*admission_binding_key,[\s\S]*run_binding_key,[\s\S]*run_key,[\s\S]*tenant_id,[\s\S]*run_claim_version,[\s\S]*authorization_event_key,[\s\S]*credential_revision,[\s\S]*delivery_key[\s\S]*REFERENCES public\.bot_reply_staging_pre_send_admission_bindings/,
  );
  assert.match(
    reserveV2,
    /requested_admission_binding_key TEXT[\s\S]*FROM public\.bot_reply_staging_pre_send_admission_bindings AS admission[\s\S]*locked_admission\.policy_event_key IS DISTINCT FROM[\s\S]*current_policy\.event_key/,
  );
  for (const comparison of [
    "locked_admission.run_binding_key IS DISTINCT FROM",
    "locked_admission.run_key IS DISTINCT FROM active_run.run_key",
    "locked_admission.run_claim_version IS DISTINCT FROM",
    "locked_admission.authorization_event_key IS DISTINCT FROM",
    "locked_admission.authorization_version IS DISTINCT FROM",
    "locked_admission.credential_revision IS DISTINCT FROM",
    "locked_admission.credential_envelope_digest IS DISTINCT FROM",
    "locked_admission.credential_event_key IS DISTINCT FROM",
  ]) {
    assert.equal(reserveV2.includes(comparison), true, comparison);
  }
  assert.doesNotMatch(
    migration,
    /INSERT INTO public\.bot_reply_staging_pre_send_admission_bindings/,
  );
  assert.match(
    migration,
    /no INSERT wrapper exists for this table in 0055[\s\S]*D1e/,
  );
});

test("reserves only an inert one-shot permit and never releases a provider capability", () => {
  for (const tableName of [
    "bot_reply_staging_credential_bound_pre_send_permits",
    "bot_reply_staging_credential_bound_pre_send_permit_consumptions",
    "bot_reply_staging_credential_bound_pre_send_permit_resolutions",
  ]) {
    assert.match(
      migration,
      new RegExp(`CREATE TABLE\\s+public\\.${tableName}`),
    );
  }
  assert.match(
    migration,
    /CREATE FUNCTION\s+public\.reserve_bot_reply_staging_credential_bound_pre_send_permit_v2\([\s\S]*RETURNS TABLE \(\s*"permitKey" TEXT\s*\)/,
  );
  assert.match(
    migration,
    /RETURN QUERY SELECT NULL::TEXT/,
  );
  assert.doesNotMatch(
    migration,
    /CREATE (?:OR REPLACE )?FUNCTION public\.(?:consume|release|finalize|reconcile)_bot_reply_staging_credential_bound_pre_send_permit/i,
  );
  assert.doesNotMatch(
    migration,
    /INSERT INTO public\.bot_reply_provider_request_claims/,
  );
  assert.doesNotMatch(
    migration,
    /INSERT INTO public\.bot_reply_staging_credential_bound_pre_send_permit_(?:consumptions|resolutions)/,
  );
});

test("derives tenant barriers from persisted identity and uses a post-lock database clock", () => {
  assert.match(
    migration,
    /FROM public\.bot_reply_staging_authorization_events AS authorization_event[\s\S]*persisted_tenant_id := authorization_lookup\.tenant_id[\s\S]*pg_catalog\.pg_advisory_xact_lock/,
  );
  assert.match(
    migration,
    /FROM public\.bot_reply_staging_run_credential_bindings AS binding_lookup[\s\S]*persisted_tenant_id := initial_binding\.tenant_id[\s\S]*pg_catalog\.pg_advisory_xact_lock/,
  );
  assert.match(
    migration,
    /FOR UPDATE;[\s\S]*database_now := pg_catalog\.date_trunc\([\s\S]*pg_catalog\.clock_timestamp\(\)/,
  );
  assert.match(
    migration,
    /D1e[\s\S]*session advisory lock[\s\S]*0056/,
  );
});

test("rejects run-binding mismatch before locking and tenant-scopes permit replay", () => {
  const bindingLookup = reserveV2.indexOf(
    "FROM public.bot_reply_staging_run_credential_bindings AS binding_lookup",
  );
  const tenantCheck = reserveV2.indexOf(
    "IF persisted_tenant_id <> requested_tenant_id THEN",
  );
  const runCheck = reserveV2.indexOf(
    "IF initial_binding.run_key <> requested_run_key",
  );
  const tenantLock = reserveV2.indexOf(
    "PERFORM pg_catalog.pg_advisory_xact_lock(",
  );
  assert.equal(bindingLookup >= 0, true);
  assert.equal(bindingLookup < tenantCheck, true);
  assert.equal(tenantCheck < runCheck, true);
  assert.equal(runCheck < tenantLock, true);
  assert.match(
    reserveV2.slice(runCheck, tenantLock),
    /initial_binding\.run_claim_version <>[\s\S]*requested_run_claim_version/,
  );

  const tenantScopedPermitLookup =
    /WHERE permit\.tenant_id = persisted_tenant_id\s+AND \(\s*permit\.operation_key = requested_operation_key\s+OR \(\s*permit\.delivery_key = requested_delivery_key\s+AND permit\.delivery_claim_version =\s*requested_delivery_claim_version\s*\)\s*OR permit\.reservation_key = requested_reservation_key\s*\)\s*ORDER BY permit\.permit_key\s+LIMIT 1\s+FOR UPDATE;/g;
  assert.equal(
    (reserveV2.match(tenantScopedPermitLookup) ?? []).length,
    2,
  );
});

test("derives and validates the permit key from persisted DB identity", () => {
  assert.match(
    migration,
    /derive_bot_reply_staging_pre_send_permit_key_v1\([\s\S]*persisted_tenant_id BIGINT[\s\S]*persisted_credential_revision BIGINT[\s\S]*persisted_credential_envelope_digest TEXT[\s\S]*persisted_reserved_at TIMESTAMPTZ/,
  );
  assert.match(
    reserveV2,
    /derive_bot_reply_staging_pre_send_permit_key_v1\([\s\S]*persisted_tenant_id,[\s\S]*current_credential\.credential_revision,[\s\S]*locked_admission\.admission_binding_key,[\s\S]*database_now/,
  );
  assert.equal(
    (reserveV2.match(/recomputed_permit_key :=/g) ?? []).length,
    2,
  );

  const firstReplayQuery = reserveV2.slice(
    reserveV2.indexOf("SELECT permit.*"),
    reserveV2.indexOf("-- All time-sensitive rechecks"),
  );
  assert.match(firstReplayQuery, /permit\.operation_key = requested_operation_key/);
  assert.match(firstReplayQuery, /permit\.reservation_key = requested_reservation_key/);
  assert.doesNotMatch(firstReplayQuery, /permit\.permit_key = derived_permit_key/);
});

test("rechecks every pre-send fence against the post-lock clock", () => {
  for (const token of [
    "current_credential.credential_revision",
    "active_authorization.status <> 'approved'",
    "current_connection.status <> 'connected'",
    "current_policy.delivery_state <> 'enabled'",
    "active_run.status <> 'running'",
    "locked_delivery.status <> 'sending'",
    "locked_reservation.reservation_class <> 'service-reply'",
    "active_run.started_at > locked_reservation.reserved_at",
    "locked_delivery.updated_at > locked_reservation.reserved_at",
    "database_now >= service_window_expires_at",
    "fact_kind = 'kill-switch'",
  ]) {
    assert.equal(migration.includes(token), true, token);
  }
  assert.match(reserveV2, /database_permit_expires_at := LEAST\(/);
  assert.doesNotMatch(reserveV2, /pg_catalog\.least\(/i);
});

test("binds consumption and released resolution to exact one-shot identity", () => {
  assert.match(
    migration,
    /bot_reply_staging_pre_send_consumptions_permit_fk[\s\S]*operation_key,[\s\S]*delivery_key,[\s\S]*delivery_claim_version,[\s\S]*reservation_key[\s\S]*REFERENCES public\.bot_reply_staging_credential_bound_pre_send_permits/,
  );
  assert.match(
    migration,
    /bot_reply_staging_pre_send_consumptions_request_fk[\s\S]*provider_request_key,[\s\S]*delivery_key,[\s\S]*tenant_id,[\s\S]*delivery_claim_version,[\s\S]*reservation_key[\s\S]*REFERENCES public\.bot_reply_provider_request_claims/,
  );
  assert.match(
    migration,
    /bot_reply_staging_pre_send_resolutions_consumption_fk[\s\S]*provider_request_key,[\s\S]*operation_key,[\s\S]*delivery_key,[\s\S]*delivery_claim_version,[\s\S]*reservation_key[\s\S]*REFERENCES[\s\S]*bot_reply_staging_credential_bound_pre_send_permit_consumptions[\s\S]*MATCH SIMPLE/,
  );
});

test("keeps all new evidence append-only, invoker-rights and dormant", () => {
  assert.match(
    migration,
    /BEFORE UPDATE OR DELETE[\s\S]*BEFORE TRUNCATE/g,
  );
  assert.equal(
    (migration.match(/SECURITY INVOKER/g) ?? []).length >= 5,
    true,
  );
  assert.equal(
    (migration.match(/SET search_path = pg_catalog, pg_temp/g) ?? []).length >= 5,
    true,
  );
  assert.match(migration, /REVOKE ALL ON TABLE[\s\S]*FROM PUBLIC/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC/);
  assert.doesNotMatch(
    migration,
    /\bSECURITY DEFINER\b|^\s*GRANT\b|^\s*(?:CREATE|ALTER) ROLE\b/gm,
  );
  assert.doesNotMatch(
    migration,
    /initialization_vector|ciphertext|access_token|recipient_phone_e164|reply_json/i,
  );
  assert.doesNotMatch(migration, /\b(?:random|gen_random_uuid|uuid_generate_v[1-5])\s*\(/i);
  assert.match(
    migration,
    /trigger\.tgfoid = pg_catalog\.to_regprocedure\([\s\S]*trigger\.tgtype = expected\.trigger_type/,
  );
});
