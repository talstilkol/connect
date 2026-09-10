import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../postgres/migrations/0053_bot_reply_staging_provider_operation_fence.sql",
    import.meta.url,
  ),
  "utf8",
);

function functionBody(name) {
  const match = migration.match(new RegExp(
    `CREATE (?:OR REPLACE )?FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`,
  ));
  assert.equal(typeof match?.[0], "string");
  return match[0];
}

const reserve = functionBody(
  "reserve_bot_reply_staging_provider_operation_v1",
);
const finalize = functionBody(
  "finalize_bot_reply_staging_provider_operation_v1",
);

function scalarColumns(tableName) {
  const definition = migration.match(new RegExp(
    `CREATE TABLE public\\.${tableName} \\([\\s\\S]*?\\n\\);`,
  ))?.[0];
  assert.equal(typeof definition, "string");
  return Array.from(
    definition.matchAll(
      /^  ([a-z][a-z0-9_]*) (TEXT|BIGINT|INTEGER|TIMESTAMPTZ)\b/gm,
    ),
    ([, name, type]) => [name, type],
  );
}

test("defines two append-only and PII-free provider-operation ledgers", () => {
  const ledgerDefinitions = migration.match(
    /CREATE TABLE public\.bot_reply_staging_provider_operations \([\s\S]*?CREATE INDEX bot_reply_staging_provider_outcomes_run_idx[\s\S]*?\);/,
  )?.[0];
  assert.equal(typeof ledgerDefinitions, "string");
  assert.match(
    migration,
    /CREATE TABLE public\.bot_reply_staging_provider_operations \(/,
  );
  assert.match(
    migration,
    /CREATE TABLE public\.bot_reply_staging_provider_operation_outcomes \(/,
  );
  assert.match(
    migration,
    /UNIQUE \(delivery_key, delivery_claim_version\)/,
  );
  assert.match(migration, /UNIQUE \(reservation_key\)/);
  assert.match(migration, /UNIQUE \(provider_request_key\)/);
  assert.match(migration, /operation_key TEXT NOT NULL UNIQUE/);
  assert.match(
    migration,
    /DEFERRABLE INITIALLY DEFERRED/,
  );
  assert.equal(
    (migration.match(/BEFORE UPDATE ON public\.bot_reply_staging_provider_/g) ?? [])
      .length,
    2,
  );
  assert.equal(
    (migration.match(/BEFORE DELETE ON public\.bot_reply_staging_provider_/g) ?? [])
      .length,
    2,
  );
  assert.doesNotMatch(
    ledgerDefinitions,
    /recipient_phone|phone_e164|access_token|provider_message_id|reply_json|payload_json/i,
  );
});

test("locks the exact scalar ledger schemas and excludes PII-bearing columns", () => {
  const operationColumns = scalarColumns(
    "bot_reply_staging_provider_operations",
  );
  const outcomeColumns = scalarColumns(
    "bot_reply_staging_provider_operation_outcomes",
  );
  assert.deepEqual(operationColumns, [
    ["operation_key", "TEXT"],
    ["run_key", "TEXT"],
    ["tenant_id", "BIGINT"],
    ["request_digest", "TEXT"],
    ["audit_key", "TEXT"],
    ["release_id", "TEXT"],
    ["commit_sha", "TEXT"],
    ["artifact_digest", "TEXT"],
    ["run_claim_version", "INTEGER"],
    ["run_lease_expires_at", "TIMESTAMPTZ"],
    ["operation_kind", "TEXT"],
    ["delivery_key", "TEXT"],
    ["delivery_claim_version", "INTEGER"],
    ["reservation_key", "TEXT"],
    ["provider_request_key", "TEXT"],
    ["requested_at", "TIMESTAMPTZ"],
    ["created_at", "TIMESTAMPTZ"],
  ]);
  assert.deepEqual(outcomeColumns, [
    ["observation_key", "TEXT"],
    ["operation_key", "TEXT"],
    ["run_key", "TEXT"],
    ["tenant_id", "BIGINT"],
    ["provider_request_key", "TEXT"],
    ["operation_kind", "TEXT"],
    ["state", "TEXT"],
    ["provider_outcome_kind", "TEXT"],
    ["evidence_key", "TEXT"],
    ["observed_at", "TIMESTAMPTZ"],
    ["finalized_at", "TIMESTAMPTZ"],
    ["created_at", "TIMESTAMPTZ"],
  ]);
  for (const forbiddenColumn of [
    "payload",
    "phone",
    "recipient",
    "provider_message_id",
    "credential",
  ]) {
    assert.equal(
      operationColumns.concat(outcomeColumns)
        .some(([name]) => name.includes(forbiddenColumn)),
      false,
    );
  }
});

test("binds reserve to distinct run and delivery claims plus release identity", () => {
  for (const parameter of [
    "requested_run_key TEXT",
    "requested_tenant_id BIGINT",
    "requested_request_digest TEXT",
    "requested_audit_key TEXT",
    "requested_release_id TEXT",
    "requested_commit_sha TEXT",
    "requested_artifact_digest TEXT",
    "requested_run_claim_version INTEGER",
    "requested_run_lease_expires_at TIMESTAMPTZ",
    "requested_operation_key TEXT",
    "requested_operation_kind TEXT",
    "requested_delivery_key TEXT",
    "requested_delivery_claim_version INTEGER",
    "requested_reservation_key TEXT",
  ]) {
    assert.match(reserve, new RegExp(parameter));
    assert.match(finalize, new RegExp(parameter));
  }
  assert.match(
    reserve,
    /active_run\.release_id <> requested_release_id/,
  );
  assert.match(reserve, /active_run\.commit_sha <> requested_commit_sha/);
  assert.match(
    reserve,
    /active_run\.artifact_digest <> requested_artifact_digest/,
  );
  assert.match(
    reserve,
    /requested_run_lease_expires_at >[\s\S]*active_authorization\.recipient_expires_at/,
  );
  assert.match(
    reserve,
    /requested_run_lease_expires_at >[\s\S]*active_authorization\.rate_limit_expires_at/,
  );
  assert.match(
    reserve,
    /FROM public\.meta_connections AS connection[\s\S]*FOR UPDATE/,
  );
  assert.match(
    reserve,
    /current_policy\.delivery_state <> 'enabled'/,
  );
  assert.match(
    reserve,
    /current_policy\.meta_graph_api_version <>[\s\S]*active_run\.graph_api_version/,
  );
  assert.match(
    reserve,
    /requested_run_lease_expires_at >[\s\S]*current_policy\.evidence_expires_at/,
  );
  assert.match(
    reserve,
    /active_run\.claim_version <> requested_run_claim_version/,
  );
  assert.match(
    reserve,
    /locked_delivery\.claim_version <>[\s\S]*requested_delivery_claim_version/,
  );
  assert.doesNotMatch(reserve, /requested_requested_at|requested_provider_request_key/);
  assert.doesNotMatch(finalize, /requested_(?:outcome|verdict|finalized_at|provider_request_key)/i);
});

test("authorizes only the newly committed reservation and withholds capability on replay", () => {
  assert.match(
    reserve,
    /database_now := pg_catalog\.date_trunc\([\s\S]*pg_catalog\.clock_timestamp\(\)/,
  );
  assert.match(
    reserve,
    /database_now >= active_run\.lease_expires_at/,
  );
  assert.match(
    reserve,
    /database_now >= locked_reservation\.reservation_expires_at/,
  );
  assert.match(
    reserve,
    /INSERT INTO public\.bot_reply_staging_provider_operations[\s\S]*ON CONFLICT DO NOTHING[\s\S]*RETURNING \* INTO inserted_operation/,
  );
  assert.match(
    reserve,
    /IF NOT FOUND THEN[\s\S]*'replay-blocked'::TEXT,[\s\S]*NULL::TEXT,[\s\S]*NULL::TIMESTAMPTZ/,
  );
  assert.match(
    reserve,
    /stored_operation\.tenant_id <> requested_tenant_id[\s\S]*stored_operation\.reservation_key <> requested_reservation_key[\s\S]*replay scope conflicts/,
  );
  assert.match(
    reserve,
    /INSERT INTO public\.bot_reply_provider_request_claims[\s\S]*database_now,[\s\S]*database_now/,
  );
  assert.match(
    reserve,
    /'authorized'::TEXT,[\s\S]*inserted_operation\.provider_request_key/,
  );
  assert.equal(
    reserve.split("'authorized'::TEXT").length - 1,
    1,
  );
});

test("serializes reserve before sampling the clock and rechecks current safety", () => {
  const runLock = reserve.indexOf(
    "FROM public.bot_reply_staging_runs AS staging_run",
  );
  const connectionLock = reserve.indexOf(
    "FROM public.meta_connections AS connection",
  );
  const deliveryLock = reserve.indexOf(
    "INTO locked_delivery\n  FROM public.bot_reply_deliveries AS delivery",
  );
  const reservationLock = reserve.indexOf(
    "INTO locked_reservation\n  FROM public.whatsapp_rate_limit_reservations AS reservation",
  );
  const freshClock = reserve.indexOf(
    "database_now := pg_catalog.date_trunc",
  );
  assert.equal(
    [runLock, connectionLock, deliveryLock, reservationLock, freshClock]
      .every((index) => index >= 0),
    true,
  );
  assert.equal(runLock < connectionLock, true);
  assert.equal(connectionLock < deliveryLock, true);
  assert.equal(deliveryLock < reservationLock, true);
  assert.equal(reservationLock < freshClock, true);
  assert.match(
    reserve,
    /current_setting\('transaction_isolation'\)[\s\S]*'read committed'/,
  );
  assert.match(
    reserve,
    /ORDER BY policy\.policy_version DESC[\s\S]*current_policy\.delivery_state <> 'enabled'/,
  );
  assert.match(
    reserve,
    /database_now >= current_policy\.evidence_expires_at/,
  );
  assert.match(
    reserve,
    /EXISTS \([\s\S]*FROM public\.whatsapp_rate_limit_settlements AS settlement[\s\S]*requested_reservation_key/,
  );
});

test("returns an exact replay before stale admission checks and rechecks after the run lock", () => {
  const firstOperationLookup = reserve.indexOf(
    "FROM public.bot_reply_staging_provider_operations AS operation",
  );
  const runLock = reserve.indexOf(
    "FROM public.bot_reply_staging_runs AS staging_run",
  );
  const secondOperationLookup = reserve.indexOf(
    "FROM public.bot_reply_staging_provider_operations AS operation",
    firstOperationLookup + 1,
  );
  const replayReturn = reserve.indexOf("'replay-blocked'::TEXT");
  const connectionLock = reserve.indexOf(
    "FROM public.meta_connections AS connection",
  );
  assert.equal(firstOperationLookup < runLock, true);
  assert.equal(runLock < secondOperationLookup, true);
  assert.equal(secondOperationLookup < replayReturn, true);
  assert.equal(replayReturn < connectionLock, true);
  assert.match(
    reserve,
    /stored_operation\.release_id <> requested_release_id[\s\S]*stored_operation\.artifact_digest <> requested_artifact_digest[\s\S]*stored_operation\.reservation_key <> requested_reservation_key/,
  );
  assert.match(
    reserve,
    /'replay-blocked'::TEXT,[\s\S]*NULL::TEXT,[\s\S]*stored_outcome\.state[\s\S]*NULL::TIMESTAMPTZ/,
  );
});

test("keeps the later request timestamp exclusive to an exact staging operation", () => {
  const requestGuard = functionBody(
    "enforce_bot_reply_provider_request_insert",
  );
  assert.match(
    requestGuard,
    /reservation\.reserved_at = NEW\.requested_at[\s\S]*NEW\.requested_at <= reservation\.reservation_expires_at/,
  );
  assert.match(
    requestGuard,
    /reservation\.reserved_at <= NEW\.requested_at[\s\S]*NEW\.requested_at < reservation\.reservation_expires_at[\s\S]*FROM public\.bot_reply_staging_provider_operations AS operation/,
  );
  for (const exactField of [
    "operation.provider_request_key = NEW.request_key",
    "operation.delivery_key = NEW.delivery_key",
    "operation.tenant_id = NEW.tenant_id",
    "operation.delivery_claim_version = NEW.claim_version",
    "operation.reservation_key = NEW.reservation_key",
    "operation.requested_at = NEW.requested_at",
  ]) {
    assert.match(requestGuard, new RegExp(exactField.replaceAll(".", "\\.")));
  }
});

test("allows only dispatch operations and keeps observe-only and kill-switch outside", () => {
  for (const kind of [
    "text-send",
    "button-send",
    "customer-window-expired",
    "provider-retry",
    "pair-limit",
    "duplicate-safety",
  ]) {
    assert.match(reserve, new RegExp(`'${kind}'`));
  }
  for (const forbidden of [
    "button-reply",
    "status-sent",
    "status-delivered",
    "status-read",
    "kill-switch",
  ]) {
    assert.doesNotMatch(reserve, new RegExp(`'${forbidden}'`));
  }
});

test("derives finalize state only from exact durable request-fenced facts", () => {
  for (const relation of [
    "public.bot_reply_provider_request_claims",
    "public.bot_reply_delivery_provider_links",
    "public.bot_reply_provider_deferral_events",
    "public.bot_reply_service_window_rejection_events",
    "public.bot_reply_deliveries",
  ]) {
    assert.match(finalize, new RegExp(relation.replaceAll(".", "\\.")));
  }
  assert.match(
    finalize,
    /request\.request_key = stored_operation\.provider_request_key/,
  );
  assert.doesNotMatch(finalize, /FOR UPDATE OF request, delivery/);
  assert.match(
    finalize,
    /locked_request\.claim_version <>[\s\S]*stored_operation\.delivery_claim_version/,
  );
  assert.match(
    finalize,
    /locked_request\.reservation_key <>[\s\S]*stored_operation\.reservation_key/,
  );
  assert.match(
    finalize,
    /link\.provider_message_id = delivery\.provider_message_id/,
  );
  assert.match(
    finalize,
    /link\.accepted_at = delivery\.accepted_at/,
  );
  assert.match(finalize, /exact_fact_count > 1/);
  assert.match(
    finalize,
    /derived_state = 'completed'[\s\S]*derived_observed_at >= stored_operation\.run_lease_expires_at/,
  );
  assert.match(
    finalize,
    /RAISE EXCEPTION[\s\S]*provider outcome evidence conflicts/,
  );
  assert.match(
    finalize,
    /database_now < stored_operation\.run_lease_expires_at[\s\S]*'pending'::TEXT/,
  );
  assert.match(
    finalize,
    /derived_outcome_kind := 'lease-expired-without-outcome'/,
  );
  assert.match(
    finalize,
    /delivery\.status = 'ambiguous'[\s\S]*delivery\.last_error_code = 'DELIVERY_OUTCOME_UNKNOWN'/,
  );
});

test("serializes finalize and every durable outcome producer in one lock order", () => {
  const finalizeDelivery = finalize.indexOf(
    "INTO locked_delivery\n  FROM public.bot_reply_deliveries AS delivery",
  );
  const finalizeReservation = finalize.indexOf(
    "INTO locked_reservation\n  FROM public.whatsapp_rate_limit_reservations AS reservation",
  );
  const finalizeRequest = finalize.indexOf(
    "INTO locked_request\n  FROM public.bot_reply_provider_request_claims AS request",
  );
  const finalizeClock = finalize.indexOf(
    "database_now := pg_catalog.date_trunc",
  );
  assert.equal(finalizeDelivery < finalizeReservation, true);
  assert.equal(finalizeReservation < finalizeRequest, true);
  assert.equal(finalizeRequest < finalizeClock, true);
  assert.match(
    finalize,
    /current_setting\('transaction_isolation'\)[\s\S]*'read committed'/,
  );

  for (const name of [
    "enforce_bot_reply_provider_link_insert",
    "enforce_bot_reply_provider_deferral_insert",
    "enforce_bot_reply_window_rejection_insert",
  ]) {
    const producer = functionBody(name);
    const delivery = producer.indexOf(
      "FROM public.bot_reply_deliveries AS delivery",
    );
    const reservation = producer.indexOf(
      "FROM public.whatsapp_rate_limit_reservations AS reservation",
    );
    const request = producer.indexOf(
      "FROM public.bot_reply_provider_request_claims AS request",
    );
    assert.equal(delivery >= 0 && delivery < reservation, true);
    assert.equal(reservation < request, true);
    assert.match(
      producer,
      /(?:FROM|INNER JOIN) public\.bot_reply_staging_provider_operation_outcomes AS outcome/,
    );
    assert.match(producer, /follows a finalized staging operation/);
  }

  const settlementGuard = functionBody(
    "enforce_whatsapp_rate_settlement_insert",
  );
  assert.match(
    settlementGuard,
    /FROM public\.whatsapp_rate_limit_reservations AS reservation[\s\S]*FOR UPDATE/,
  );
  assert.match(
    settlementGuard,
    /outcome\.state = 'indeterminate'/,
  );
  assert.match(
    settlementGuard,
    /NEW\.outcome = 'cancelled-before-submit'[\s\S]*FROM public\.bot_reply_staging_provider_operations AS operation[\s\S]*operation\.reservation_key = NEW\.reservation_key/,
  );
  assert.match(
    settlementGuard,
    /cancellation follows a reserved staging provider operation/,
  );

  const ambiguousGuard = functionBody(
    "guard_bot_reply_staging_late_ambiguous_outcome",
  );
  assert.match(
    ambiguousGuard,
    /UPDATE already owns the delivery row lock[\s\S]*FROM public\.whatsapp_rate_limit_reservations AS reservation[\s\S]*FOR UPDATE[\s\S]*FROM public\.bot_reply_provider_request_claims AS request[\s\S]*FOR UPDATE/,
  );
  assert.match(
    migration,
    /BEFORE UPDATE OF status ON public\.bot_reply_deliveries[\s\S]*guard_bot_reply_staging_late_ambiguous_outcome/,
  );
});

test("atomically closes every terminal operation with immutable bounded observation", () => {
  assert.match(
    finalize,
    /INSERT INTO public\.bot_reply_staging_provider_operation_outcomes/,
  );
  assert.match(
    finalize,
    /RETURNING \* INTO stored_outcome/,
  );
  assert.match(
    finalize,
    /'finalized'::TEXT,[\s\S]*stored_outcome\.observation_key/,
  );
  assert.match(
    finalize,
    /'replayed'::TEXT,[\s\S]*stored_outcome\.observation_key/,
  );
  for (const state of ["completed", "indeterminate"]) {
    assert.match(migration, new RegExp(`'${state}'`));
  }
  for (const kind of [
    "accepted",
    "sender-deferred",
    "pair-deferred",
    "service-window-rejected",
    "ambiguous",
    "lease-expired-without-outcome",
  ]) {
    assert.match(migration, new RegExp(`'${kind}'`));
  }
  assert.match(
    migration,
    /\^bot_reply_staging_observation_v1_\[a-f0-9\]\{64\}\$/,
  );
});

test("blocks run reclaim and leaves the migration dormant without ambient rights", () => {
  assert.match(
    migration,
    /NEW\.claim_version > OLD\.claim_version[\s\S]*outcome\.operation_key IS NULL[\s\S]*outcome\.state <> 'completed'/,
  );
  assert.match(
    migration,
    /Bot reply staging provider operation requires reconciliation/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON TABLE[\s\S]*bot_reply_staging_provider_operations[\s\S]*FROM PUBLIC/,
  );
  assert.equal((migration.match(/\nSECURITY INVOKER\n/g) ?? []).length, 12);
  assert.equal(
    (migration.match(/SET search_path = pg_catalog, pg_temp/g) ?? []).length,
    12,
  );
  assert.match(
    migration,
    /hardened_function_count <> 12/,
  );
  assert.match(migration, /bound_trigger_count <> 13/);
  assert.match(migration, /D31-D1d-A postcondition failed:/);
  assert.match(
    migration,
    /immediate pre-send 24-hour customer-service-window recheck[\s\S]*commit-before-token bridge remain explicit D31-D1d-B activation blockers/,
  );
  assert.doesNotMatch(reserve, /FROM public\.messages AS inbound/);
  assert.doesNotMatch(
    migration,
    /^\s*(?:GRANT|CREATE ROLE|ALTER ROLE)\b|\nSECURITY DEFINER\n/gim,
  );
  assert.doesNotMatch(
    migration,
    /\b(?:random|gen_random_uuid|uuid_generate_v[1-5])\s*\(/i,
  );
  assert.doesNotMatch(migration, /https?:\/\/|graph\.facebook|fetch\s*\(/i);
});
