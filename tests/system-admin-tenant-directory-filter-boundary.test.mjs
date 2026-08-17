import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";
import {
  readSystemAdminTenantMessages,
} from "../features/admin/systemAdminTenantMessages.ts";

const componentUrl = new URL(
  "../features/admin/SystemAdminTenantPanel.tsx",
  import.meta.url,
);
const repositoryUrl = new URL(
  "../db/systemAdminTenantDirectoryRepository.ts",
  import.meta.url,
);

test("keeps complete tenant search and filters behind an explicit accessible form", async () => {
  const source = await readFile(
    componentUrl,
    "utf8",
  );

  assert.match(
    source,
    /onSubmit=\{applyDirectoryFilters\}/,
  );
  assert.match(
    source,
    /aria-controls="admin-tenant-results"/,
  );
  assert.match(
    source,
    /id="admin-tenant-results"/,
  );
  assert.match(
    source,
    /messages\.searchLabel/,
  );
  assert.equal(
    readSystemAdminTenantMessages("he").searchLabel,
    "חיפוש בכל ה־Tenants",
  );
  assert.match(source, /maxLength=\{80\}/);
  assert.match(
    source,
    /value=\{tenantStatusFilter\}/,
  );
  assert.match(
    source,
    /value=\{subscriptionFilter\}/,
  );
  assert.match(
    source,
    /aria-live="polite"/,
  );
  assert.doesNotMatch(
    source,
    /visibleTenants/,
  );
});

test("reuses the exact applied server filters for the next keyset page", async () => {
  const source = await readFile(
    componentUrl,
    "utf8",
  );

  assert.match(
    source,
    /afterTenantId: nextCursor,\s+\.\.\.appliedFilters/,
  );
  assert.match(
    source,
    /afterTenantId: null,\s+\.\.\.normalizedFilters/,
  );
  assert.match(
    source,
    /setAppliedFilters\(normalizedFilters\)/,
  );
  assert.match(
    source,
    /matchesSystemAdminTenantDirectoryFilters/,
  );
});

test("uses literal substring matching instead of SQL wildcard interpolation", async () => {
  const source = await readFile(
    repositoryUrl,
    "utf8",
  );

  assert.match(
    source,
    /INSTR\(LOWER\(tenants\.display_name\), \?2\) > 0/,
  );
  assert.match(
    source,
    /INSTR\(CAST\(tenants\.id AS TEXT\), \?2\) > 0/,
  );
  assert.doesNotMatch(source, /\bLIKE\b/);
});
