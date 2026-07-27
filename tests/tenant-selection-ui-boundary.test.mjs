import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

async function readSource(path) {
  return readFile(
    new URL(`../${path}`, import.meta.url),
    "utf8",
  );
}

test("keeps tenant identifiers and browser persistence outside the selection gate", async () => {
  const source = await readSource(
    "features/workspace/TenantSelectionGate.tsx",
  );

  assert.match(
    source,
    /option\.selectionKey/,
  );
  assert.doesNotMatch(
    source,
    /\btenantId\b|\bexternalUserId\b/,
  );
  assert.doesNotMatch(
    source,
    /localStorage|sessionStorage|document\.cookie/,
  );
});

test("renders the selection gate before loading tenant business data", async () => {
  const source = await readSource(
    "app/workspace/layout.tsx",
  );
  const selectionIndex = source.indexOf(
    "await loadTenantSelectionAction()",
  );
  const gateIndex = source.indexOf(
    "<TenantSelectionGate",
  );
  const profileIndex = source.indexOf(
    "await readCurrentBusinessProfile()",
  );

  assert.ok(selectionIndex > 0);
  assert.ok(gateIndex > selectionIndex);
  assert.ok(profileIndex > gateIndex);
});

test("preserves button semantics and announces selection state", async () => {
  const source = await readSource(
    "features/workspace/TenantSelectionGate.tsx",
  );

  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-busy=/);
  assert.match(source, /type="button"/);
  assert.doesNotMatch(
    source,
    /role="listitem"/,
  );
});
