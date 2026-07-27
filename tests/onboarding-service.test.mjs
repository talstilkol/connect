import assert from "node:assert/strict";
import test from "node:test";

import {
  BusinessProfileInputError,
  createOnboardingService,
} from "../server/onboarding/onboardingService.ts";

const identity = {
  externalUserId: "external-user-id",
};

const validDraft = {
  businessName: "business-name",
  timezone: "Asia/Jerusalem",
  interfaceLanguage: "he",
};

const persistedProfile = {
  tenantId: 7,
  ...validDraft,
  version: 2,
  createdAt: "created-at",
  updatedAt: "updated-at",
};

function membership(role = "owner", tenantId = 7) {
  return {
    tenantId,
    tenantDisplayName: "business-name",
    tenantStatus: "active",
    externalUserId: identity.externalUserId,
    role,
  };
}

function dependenciesWith(memberships) {
  const state = {
    provisioningInputs: [],
    profileSaves: [],
    reloads: [],
  };

  return {
    state,
    dependencies: {
      memberships: {
        async findActiveByExternalUserId(externalUserId) {
          assert.equal(externalUserId, identity.externalUserId);
          return memberships;
        },
      },
      provisioning: {
        async provisionOwnerWorkspace(input) {
          state.provisioningInputs.push(input);
          return {
            tenantId: 7,
            tenantDisplayName: validDraft.businessName,
            tenantStatus: "trial",
            ...validDraft,
            profileVersion: 1,
            profileCreatedAt: "created-at",
            profileUpdatedAt: "updated-at",
          };
        },
      },
      businessProfiles: {
        async findByTenantId(tenantId) {
          state.reloads.push(tenantId);
          return persistedProfile;
        },
        async save() {
          throw new Error("Direct repository save is not expected");
        },
      },
      profileService: {
        async save(session, draft) {
          state.profileSaves.push({ session, draft });
        },
      },
    },
  };
}

test("provisions a first owner workspace using a deterministic opaque key", async () => {
  const fixture = dependenciesWith([]);
  const service = createOnboardingService(fixture.dependencies);

  const result = await service.saveBusinessProfile(identity, validDraft);

  assert.equal(result.createdTenant, true);
  assert.match(
    fixture.state.provisioningInputs[0].provisioningKey,
    /^tenant_v1_[0-9a-f]{64}$/,
  );
  assert.equal(
    fixture.state.provisioningInputs[0].provisioningKey.includes(
      identity.externalUserId,
    ),
    false,
  );
  assert.deepEqual(fixture.state.profileSaves, []);
  assert.equal(result.profile.version, 1);
});

test("updates and reloads an existing owner's scoped profile", async () => {
  const fixture = dependenciesWith([membership()]);
  const service = createOnboardingService(fixture.dependencies);

  const result = await service.saveBusinessProfile(identity, validDraft);

  assert.equal(result.createdTenant, false);
  assert.equal(fixture.state.provisioningInputs.length, 0);
  assert.equal(fixture.state.profileSaves.length, 1);
  assert.equal(fixture.state.profileSaves[0].session.tenantId, 7);
  assert.deepEqual(fixture.state.profileSaves[0].draft, validDraft);
  assert.deepEqual(fixture.state.reloads, [7]);
  assert.equal(result.profile, persistedProfile);
});

test("requires tenant selection when an owner has multiple workspaces", async () => {
  const fixture = dependenciesWith([
    membership("owner", 7),
    membership("owner", 11),
  ]);
  const service = createOnboardingService(fixture.dependencies);

  await assert.rejects(
    service.saveBusinessProfile(identity, validDraft),
    (error) => error.code === "TENANT_SELECTION_REQUIRED",
  );
  assert.deepEqual(fixture.state.profileSaves, []);
});

test("surfaces the central permission decision for an existing viewer", async () => {
  const fixture = dependenciesWith([membership("viewer")]);
  fixture.dependencies.profileService.save = async (session) => {
    const error = new Error(
      `The ${session.role} role does not grant workspace.manage`,
    );
    error.code = "PERMISSION_DENIED";
    throw error;
  };
  const service = createOnboardingService(fixture.dependencies);

  await assert.rejects(
    service.saveBusinessProfile(identity, validDraft),
    (error) => error.code === "PERMISSION_DENIED",
  );
});

test("rejects invalid input before reading memberships", async () => {
  let membershipReadCount = 0;
  const fixture = dependenciesWith([]);
  fixture.dependencies.memberships.findActiveByExternalUserId =
    async () => {
      membershipReadCount += 1;
      return [];
    };
  const service = createOnboardingService(fixture.dependencies);

  await assert.rejects(
    service.saveBusinessProfile(identity, {
      ...validDraft,
      timezone: "not-a-timezone",
    }),
    (error) =>
      error instanceof BusinessProfileInputError &&
      error.issues.some(
        (issue) =>
          issue.field === "timezone" &&
          issue.code === "unsupported",
      ),
  );
  assert.equal(membershipReadCount, 0);
});
