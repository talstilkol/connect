import assert from "node:assert/strict";
import test from "node:test";

import {
  matchesSystemAdminTenantDirectoryFilters,
} from "../shared/domain/systemAdminTenantDirectory.ts";

const tenant = {
  tenantId: 51,
  displayName: "חנות ירושלים",
  tenantStatus: "active",
  businessProfile: null,
  subscription: {
    status: "active",
    startsAt: "2026-08-01T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
    cancelledAt: null,
    version: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
};

function filters(overrides = {}) {
  return {
    search: "",
    tenantStatus: "all",
    subscription: "all",
    ...overrides,
  };
}

test("matches normalized tenant names and identifiers", () => {
  assert.equal(
    matchesSystemAdminTenantDirectoryFilters(
      tenant,
      filters({
        search: " ירושלים ",
      }),
    ),
    true,
  );
  assert.equal(
    matchesSystemAdminTenantDirectoryFilters(
      tenant,
      filters({
        search: "51",
      }),
    ),
    true,
  );
  assert.equal(
    matchesSystemAdminTenantDirectoryFilters(
      tenant,
      filters({
        search: "52",
      }),
    ),
    false,
  );
});

test("removes a locally mutated tenant that no longer matches status or subscription filters", () => {
  assert.equal(
    matchesSystemAdminTenantDirectoryFilters(
      tenant,
      filters({
        tenantStatus: "active",
        subscription:
          "with-subscription",
      }),
    ),
    true,
  );
  assert.equal(
    matchesSystemAdminTenantDirectoryFilters(
      {
        ...tenant,
        tenantStatus: "suspended",
        subscription: {
          ...tenant.subscription,
          status: "suspended",
        },
      },
      filters({
        tenantStatus: "active",
      }),
    ),
    false,
  );
  assert.equal(
    matchesSystemAdminTenantDirectoryFilters(
      {
        ...tenant,
        subscription: null,
      },
      filters({
        subscription:
          "with-subscription",
      }),
    ),
    false,
  );
});
