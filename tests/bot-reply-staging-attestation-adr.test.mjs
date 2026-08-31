import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (relativePath) => readFileSync(
  new URL(`../${relativePath}`, import.meta.url),
  "utf8",
);
const adr = readProjectFile(
  "docs/adr/0006-bot-reply-staging-evidence-attestation.md",
);
const index = readProjectFile("docs/adr/README.md");

test("keeps the staging attestation decision proposed and fail closed", () => {
  assert.match(adr, /^---\nid: ADR-0006\n/);
  assert.match(adr, /status: proposed/);
  assert.match(adr, /approved_option: unknown\/unavailable/);
  assert.match(adr, /approved_at: unknown\/unavailable/);
  assert.match(adr, /Ed25519/);
  assert.match(adr, /Private key[\s\S]*Railway Worker/);
  assert.match(adr, /sanitized evidence core/);
  assert.match(adr, /signature-valid-only[\s\S]*replayProtected: false/);
  assert.match(adr, /attestationPayloadDigest[\s\S]*כל שלושת הזמנים/);
  assert.match(adr, /ה־Public key החדש[\s\S]*מבטלים מיד את ה־keyId/);
  assert.match(adr, /PostgreSQL[\s\S]*Replay/);
  assert.match(adr, /אינם פותחים Gate/);
  assert.match(
    index,
    /\(0006-bot-reply-staging-evidence-attestation\.md\)/,
  );
});

test("requires the dormant three-commit activation sequence", () => {
  assert.match(adr, /Commit A[\s\S]*primitive[\s\S]*רדומים בלבד/);
  assert.match(adr, /Commit B[\s\S]*Migration[\s\S]*ללא[\s\S]*`PUBLIC`/);
  assert.match(
    adr,
    /Commit C[\s\S]*המעטפת v2[\s\S]*Migration 0048[\s\S]*הוכחת PostgreSQL חיה/,
  );
  assert.match(
    adr,
    /רק אחרי Commit C[\s\S]*אפשר לשקול[\s\S]*`botReplyDeliveryAdapter`/,
  );
});
