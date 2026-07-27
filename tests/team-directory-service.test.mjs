import assert from "node:assert/strict";
import test from "node:test";

import {
  createTeamDirectoryService,
} from "../server/team/teamDirectoryService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

function session(
  role = "owner",
) {
  return {
    tenantId: 7,
    displayName: "workspace",
    status: "active",
    role,
    externalUserId:
      "current-user",
  };
}

function member(
  externalUserId,
  role,
  overrides = {},
) {
  return {
    tenantId: 7,
    tenantDisplayName:
      "workspace",
    tenantStatus: "active",
    externalUserId,
    role,
    ...overrides,
  };
}

function createFixture(
  members,
) {
  let readTenantId = null;
  const service =
    createTeamDirectoryService({
      async findActiveByExternalUserId() {
        throw new Error(
          "unexpected identity read",
        );
      },
      async findActiveByTenantId(
        tenantId,
      ) {
        readTenantId = tenantId;
        return members;
      },
    });

  return {
    service,
    getReadTenantId:
      () => readTenantId,
  };
}

test("maps real tenant members to bounded opaque references", async () => {
  const {
    service,
    getReadTenantId,
  } = createFixture([
    member(
      "current-user",
      "owner",
    ),
    member(
      "other-user",
      "agent",
    ),
  ]);
  const directory =
    await service.list(session());

  assert.equal(
    getReadTenantId(),
    7,
  );
  assert.deepEqual(
    directory.members.map(
      (item) => ({
        role: item.role,
        currentUser:
          item.currentUser,
      }),
    ),
    [
      {
        role: "owner",
        currentUser: true,
      },
      {
        role: "agent",
        currentUser: false,
      },
    ],
  );
  assert.equal(
    directory.members.every(
      (item) =>
        /^team_member_v1_[a-f0-9]{64}$/.test(
          item.memberKey,
        ) &&
        /^[A-F0-9]{12}$/.test(
          item.referenceCode,
        ),
    ),
    true,
  );
  assert.doesNotMatch(
    JSON.stringify(directory),
    /current-user|other-user|tenantId|externalUserId/,
  );
});

test("denies team reads before repository access when permission is absent", async () => {
  const fixture =
    createFixture([
      member(
        "current-user",
        "agent",
      ),
    ]);

  await assert.rejects(
    fixture.service.list(
      session("agent"),
    ),
    (error) =>
      error instanceof
        TenantSessionError &&
      error.code ===
        "PERMISSION_DENIED",
  );
  assert.equal(
    fixture.getReadTenantId(),
    null,
  );
});

test("fails closed for cross-tenant, stale, or missing current membership data", async () => {
  for (const members of [
    [
      member(
        "current-user",
        "owner",
        {
          tenantId: 11,
        },
      ),
    ],
    [
      member(
        "current-user",
        "owner",
        {
          tenantStatus:
            "suspended",
        },
      ),
    ],
    [
      member(
        "other-user",
        "manager",
      ),
    ],
  ]) {
    const fixture =
      createFixture(members);

    await assert.rejects(
      fixture.service.list(
        session(),
      ),
    );
  }
});
