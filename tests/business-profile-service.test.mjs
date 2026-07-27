import assert from "node:assert/strict";
import test from "node:test";

import {
  createBusinessProfileService,
} from "../server/onboarding/businessProfileService.ts";

function tenantSession(role) {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function recordingRepository() {
  return {
    saved: [],
    async findByTenantId() {
      return null;
    },
    async save(input) {
      this.saved.push(input);
    },
  };
}

test("derives the business profile tenant scope from the server session", async () => {
  const repository = recordingRepository();
  const service = createBusinessProfileService(repository);

  await service.save(tenantSession("owner"), {
    businessName: "business-name",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  });

  assert.deepEqual(repository.saved, [
    {
      tenantId: 7,
      businessName: "business-name",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
    },
  ]);
});

test("rejects profile writes when the role lacks workspace permission", async () => {
  const repository = recordingRepository();
  const service = createBusinessProfileService(repository);

  await assert.rejects(
    service.save(tenantSession("viewer"), {
      businessName: "business-name",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
    }),
    (error) => error.code === "PERMISSION_DENIED",
  );

  assert.deepEqual(repository.saved, []);
});
