import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveCsvSourceDigest,
} from "../shared/csv/sourceDigest.ts";

test("derives the same SHA-256 digest for identical CSV bytes", async () => {
  const csvText = "phone,name\n+972501234567,contact-name\n";
  const first = await deriveCsvSourceDigest(csvText);
  const second = await deriveCsvSourceDigest(csvText);

  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, second);
  assert.notEqual(
    first,
    await deriveCsvSourceDigest(`${csvText}\n`),
  );
});
