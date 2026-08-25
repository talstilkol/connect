import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  deriveBotReplyStagingReceiptDigest,
  serializeCanonicalBotReplyStagingReceipt,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";

const migrationUrl = new URL(
  "../postgres/migrations/0051_bot_reply_staging_run_capability_wrappers.sql",
  import.meta.url,
);

async function readMigration() {
  return readFile(migrationUrl, "utf8");
}

function functionBody(source, functionName) {
  const match = source.match(new RegExp(
    `CREATE FUNCTION public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`,
  ));
  assert.equal(typeof match?.[0], "string");
  return match[0];
}

test("defines exactly three dormant and bounded staging-run capabilities", async () => {
  const source = await readMigration();
  const names = [
    "claim_bot_reply_staging_run_v1",
    "read_bot_reply_staging_run_v1",
    "complete_bot_reply_staging_run_v1",
  ];

  assert.deepEqual(
    Array.from(
      source.matchAll(/CREATE FUNCTION public\.([a-z0-9_]+)\(/g),
      (match) => match[1],
    ),
    names,
  );
  assert.equal((source.match(/\nSECURITY INVOKER\n/g) ?? []).length, 3);
  assert.equal((source.match(/\nROWS 1\n/g) ?? []).length, 3);
  assert.equal(
    (source.match(/SET search_path = pg_catalog, pg_temp/g) ?? []).length,
    3,
  );
  assert.equal(
    (source.match(/REVOKE ALL ON FUNCTION public\.[a-z0-9_]+\(/g) ?? [])
      .length,
    3,
  );
  assert.match(
    source,
    /REVOKE ALL ON TABLE public\.bot_reply_staging_runs FROM PUBLIC/,
  );
  assert.doesNotMatch(source, /\nSECURITY DEFINER\n/);
  assert.doesNotMatch(source, /^\s*GRANT\b/gm);
  assert.doesNotMatch(source, /^\s*(?:CREATE|ALTER) ROLE\b/gm);
  assert.doesNotMatch(source, /^\s*ALTER FUNCTION\b/gm);
});

test("uses the database clock and a half-open lease boundary", async () => {
  const source = await readMigration();
  const claim = functionBody(source, "claim_bot_reply_staging_run_v1");
  const read = functionBody(source, "read_bot_reply_staging_run_v1");
  const complete = functionBody(source, "complete_bot_reply_staging_run_v1");

  assert.match(claim, /requested_lease_duration_seconds INTEGER/);
  assert.match(
    claim,
    /requested_lease_duration_seconds NOT BETWEEN 60 AND 3600/,
  );
  assert.match(claim, /pg_catalog\.clock_timestamp\(\)/);
  assert.match(claim, /lease_expires_at <= database_now/);
  assert.doesNotMatch(claim, /requested_claimed_at|requested_lease_expires_at/);

  assert.match(read, /pg_catalog\.clock_timestamp\(\)/);
  assert.match(read, /database_now >= stored_run\.lease_expires_at/);
  assert.match(read, /'expired'::TEXT/);

  assert.match(complete, /pg_catalog\.clock_timestamp\(\)/);
  assert.match(complete, /database_now >= stored_run\.lease_expires_at/);
  assert.match(complete, /database_now < staging_run\.lease_expires_at/);
  assert.doesNotMatch(complete, /requested_completed_at/);
});

test("binds claim, poll, completion, and replay to exact identities", async () => {
  const source = await readMigration();
  const claim = functionBody(source, "claim_bot_reply_staging_run_v1");
  const read = functionBody(source, "read_bot_reply_staging_run_v1");
  const complete = functionBody(source, "complete_bot_reply_staging_run_v1");

  assert.match(
    claim,
    /pg_catalog\.sha256\([\s\S]*pg_catalog\.decode\('00', 'hex'\)/,
  );
  for (const column of [
    "tenant_id",
    "request_digest",
    "actor_external_user_id",
    "connection_version",
    "policy_version",
    "release_id",
    "commit_sha",
    "artifact_digest",
    "graph_api_version",
    "recipient_fingerprint",
    "rate_limit_method_fingerprint",
    "audit_key",
  ]) {
    assert.match(claim, new RegExp(`stored_run\\.${column}`));
  }
  assert.match(claim, /ON CONFLICT DO NOTHING/);
  assert.match(claim, /FOR UPDATE/);
  assert.match(claim, /claim_version = staging_run\.claim_version \+ 1/);

  for (const body of [read, complete]) {
    assert.match(body, /staging_run\.tenant_id = requested_tenant_id/);
    assert.match(body, /stored_run\.request_digest <> requested_request_digest/);
    assert.match(body, /stored_run\.audit_key <> requested_audit_key/);
    assert.match(body, /stored_run\.release_id <> requested_release_id/);
    assert.match(body, /stored_run\.commit_sha <> requested_commit_sha/);
    assert.match(body, /stored_run\.artifact_digest <> requested_artifact_digest/);
  }
  assert.doesNotMatch(read, /FOR UPDATE|\bINSERT\b|\bUPDATE\b|\bDELETE\b/);
  assert.match(
    complete,
    /stored_run\.receipt_json <> requested_canonical_receipt_json[\s\S]*stored_run\.receipt_digest <> requested_receipt_digest/,
  );
  assert.match(
    complete,
    /stored_run\.lease_expires_at <> requested_lease_expires_at/,
  );
  assert.match(
    complete,
    /expected_receipt_digest := 'sha256:'[\s\S]*pg_catalog\.sha256\([\s\S]*pg_catalog\.convert_to\(requested_canonical_receipt_json, 'UTF8'\)/,
  );
  assert.match(
    complete,
    /requested_receipt_digest <> expected_receipt_digest[\s\S]*receipt digest does not match its exact bytes/,
  );
  assert.doesNotMatch(claim, /\\\.0\$/);
  assert.match(claim, /\^v\[1-9\]\[0-9\]\{0,2\}\[\.\]0\$/);
});

test("binds completion to the shared canonical receipt bytes", async () => {
  const source = await readMigration();
  const complete = functionBody(source, "complete_bot_reply_staging_run_v1");
  const receipt = { z: 1, a: { y: true, b: null } };
  const canonicalReceipt = serializeCanonicalBotReplyStagingReceipt(receipt);
  const exactBytesDigest = `sha256:${createHash("sha256")
    .update(canonicalReceipt, "utf8")
    .digest("hex")}`;

  assert.equal(canonicalReceipt, '{"a":{"b":null,"y":true},"z":1}');
  assert.equal(
    deriveBotReplyStagingReceiptDigest(receipt),
    exactBytesDigest,
  );
  assert.notEqual(JSON.stringify(receipt), canonicalReceipt);
  assert.match(complete, /requested_canonical_receipt_json TEXT/);
  assert.match(
    complete,
    /pg_catalog\.convert_to\(requested_canonical_receipt_json, 'UTF8'\)/,
  );
  assert.doesNotMatch(complete, /requested_receipt_json/);
});

test("fails before or after change when ACL and catalog shape are unsafe", async () => {
  const source = await readMigration();

  assert.match(source, /FROM pg_catalog\.pg_default_acl/);
  assert.match(source, /unsafe_default_function_acl_count/);
  assert.equal((source.match(/pg_catalog\.aclexplode\(/g) ?? []).length, 7);
  assert.equal((source.match(/FROM pg_catalog\.pg_attribute/g) ?? []).length, 2);
  assert.equal((source.match(/attribute\.attacl IS NOT NULL/g) ?? []).length, 2);
  assert.equal((source.match(/trigger\.tgenabled = 'O'/g) ?? []).length, 2);
  assert.equal((source.match(/matched_trigger_count <> 6/g) ?? []).length, 2);
  assert.equal((source.match(/bound_trigger_count <> 5/g) ?? []).length, 2);
  assert.equal(
    (source.match(/protected_table_trigger_count <> 6/g) ?? []).length,
    2,
  );
  for (const triggerName of [
    "bot_reply_staging_runs_update_guard",
    "bot_reply_staging_runs_delete_guard",
    "bot_reply_staging_runs_audit_start",
    "bot_reply_staging_runs_audit_completion",
    "audit_logs_bot_reply_staging_update_guard",
    "audit_logs_bot_reply_staging_authorization_guard",
  ]) {
    assert.equal(source.split(`'${triggerName}'`).length - 1, 2);
  }
  assert.match(
    source,
    /D31-D1a precondition failed: hardened functions %, triggers %, bindings %, table triggers %, protected tables %, existing wrappers %, unsafe default ACLs %/,
  );
  assert.match(
    source,
    /pg_catalog\.pg_get_function_identity_arguments\(procedure\.oid\)/,
  );
  assert.match(
    source,
    /pg_catalog\.pg_get_function_result\(procedure\.oid\)/,
  );
  assert.match(
    source,
    /D31-D1a postcondition failed: wrappers %, bodies %, triggers %, bindings %, table triggers %, protected tables %/,
  );
});

test("keeps activation and the remaining staging fences explicitly outside 0051", async () => {
  const source = await readMigration();

  assert.match(
    source,
    /canonical ownership, definer rights, worker EXECUTE and direct-table denial require a later reviewed role migration/,
  );
  assert.match(
    source,
    /claim\/read EXECUTE only to connect_api_runtime and complete EXECUTE only to[\s\S]*connect_worker_runtime/,
  );
  assert.doesNotMatch(
    source,
    /bot_reply_staging_authorization_events|bot_reply_staging_observation_events/,
  );
  assert.doesNotMatch(source, /Math\.random|randomUUID|gen_random_uuid/i);
  assert.doesNotMatch(source, /\bEXECUTE\s+(?:FORMAT|IMMEDIATE)\b/i);
});
