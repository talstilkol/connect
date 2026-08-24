import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL(
  "../postgres/migrations/0043_bot_reply_staging_release_evidence_operator_audit.sql",
  import.meta.url,
), "utf8");

test("adds forward-only actor-bound audit for release evidence publication", () => {
  assert.match(
    source,
    /CREATE TABLE bot_reply_staging_release_evidence_operator_events/,
  );
  assert.match(
    source,
    /FOREIGN KEY \(release_id, commit_sha, artifact_digest\)[\s\S]*REFERENCES bot_reply_staging_release_evidence/,
  );
  assert.match(source, /actor_external_user_id TEXT NOT NULL/);
  assert.match(source, /idempotency_key TEXT NOT NULL/);
  assert.match(source, /published_version = expected_version \+ 1/);
  assert.match(
    source,
    /UNIQUE \(release_id, idempotency_key\)/,
  );
  assert.match(
    source,
    /UNIQUE \(release_id, published_version\)/,
  );
  assert.match(
    source,
    /enforce_bot_reply_staging_release_evidence_operator_insert[\s\S]*FOR KEY SHARE/,
  );
  assert.match(
    source,
    /evidence_version <> NEW\.published_version[\s\S]*evidence_digest <> NEW\.evidence_digest[\s\S]*expires_at <> NEW\.evidence_expires_at/,
  );
});

test("makes operator evidence immutable and excludes secret material", () => {
  assert.match(
    source,
    /BEFORE UPDATE OR DELETE[\s\S]*operator_events/,
  );
  assert.match(source, /events are immutable/);
  assert.doesNotMatch(
    source,
    /access_token|authorization_header|cookie|credential|phone_e164|recipient_phone|secret|random|uuid/i,
  );
});
