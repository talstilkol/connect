import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../postgres/migrations/0042_bot_reply_provider_outcome_request_fence.sql",
  import.meta.url,
);

function normalizeSql(value) {
  return value.replace(/\s+/g, " ").trim();
}

function functionContract(source, functionName) {
  const marker = `CREATE OR REPLACE FUNCTION ${functionName}()`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${functionName} is missing`);
  const end = source.indexOf("$$;", start);
  assert.notEqual(end, -1, `${functionName} body is incomplete`);
  return normalizeSql(source.slice(start, end + 3));
}

function assertExactRequestJoin(
  source,
  { claimVersion, outcomeTimestamp },
) {
  assert.match(
    source,
    /INNER JOIN bot_reply_provider_request_claims AS request/,
  );
  assert.match(source, /request\.delivery_key = NEW\.delivery_key/);
  assert.match(source, /request\.tenant_id = NEW\.tenant_id/);
  assert.match(
    source,
    new RegExp(`request\\.claim_version = ${claimVersion}`),
  );
  assert.match(source, /request\.reservation_key = NEW\.reservation_key/);
  assert.match(
    source,
    new RegExp(`request\\.requested_at <= ${outcomeTimestamp}`),
  );
}

test("rejects acceptance, deferral, and rejection without the exact request", async () => {
  const source = await readFile(migrationUrl, "utf8");
  const contracts = [
    {
      functionName: "enforce_bot_reply_provider_link_insert",
      claimVersion: "delivery\\.claim_version",
      outcomeTimestamp: "NEW\\.accepted_at",
      error: "Bot reply provider link lacks an exact provider request claim",
    },
    {
      functionName: "enforce_bot_reply_provider_deferral_insert",
      claimVersion: "NEW\\.claim_version",
      outcomeTimestamp: "NEW\\.attempted_at",
      error: "Bot reply provider deferral lacks an exact provider request claim",
    },
    {
      functionName: "enforce_bot_reply_window_rejection_insert",
      claimVersion: "NEW\\.claim_version",
      outcomeTimestamp: "NEW\\.attempted_at",
      error:
        "Bot reply service-window rejection lacks an exact provider request claim",
    },
  ];

  for (const contract of contracts) {
    const body = functionContract(source, contract.functionName);
    assertExactRequestJoin(body, contract);
    assert.match(body, new RegExp(contract.error));
  }
});

test("keeps the request-fence migration forward-only and payload-free", async () => {
  const source = await readFile(migrationUrl, "utf8");
  assert.doesNotMatch(
    source,
    /DROP\s+(?:TABLE|COLUMN|CONSTRAINT)|TRUNCATE|DELETE\s+FROM/i,
  );
  assert.doesNotMatch(
    source,
    /phone_e164|recipient_phone|message_payload|access_token|raw_payload/i,
  );
  assert.doesNotMatch(source, /Math\.random|randomUUID/);
});

test("the payload-free rejection observer view enforces the exact request", async () => {
  const source = normalizeSql(await readFile(migrationUrl, "utf8"));
  assert.match(
    source,
    /CREATE VIEW bot_reply_request_fenced_window_rejections AS/,
  );
  assert.match(source, /request\.delivery_key = event\.delivery_key/);
  assert.match(source, /request\.tenant_id = event\.tenant_id/);
  assert.match(source, /request\.claim_version = event\.claim_version/);
  assert.match(source, /request\.reservation_key = event\.reservation_key/);
  assert.match(source, /request\.requested_at <= event\.attempted_at/);
});
