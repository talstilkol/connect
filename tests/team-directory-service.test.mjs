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
    version: 1,
    ...overrides,
  };
}

function createFixture(
  members,
  identityResult = {
    status: "unavailable",
    identities: [],
  },
) {
  let readTenantId = null;
  const service =
    createTeamDirectoryService({
      identities: {
        async resolve(
          externalUserIds,
        ) {
          assert.deepEqual(
            externalUserIds,
            members.map(
              (item) =>
                item.externalUserId,
            ),
          );
          return identityResult;
        },
      },
      memberships: {
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
  assert.equal(
    directory.identityStatus,
    "unavailable",
  );
  assert.deepEqual(
    directory.members.map(
      (item) => ({
        role: item.role,
        version: item.version,
        currentUser:
          item.currentUser,
      }),
    ),
    [
      {
        role: "owner",
        version: 1,
        currentUser: true,
      },
      {
        role: "agent",
        version: 1,
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

test("maps only complete validated identity display data", async () => {
  const members = [
    member(
      "current-user",
      "owner",
    ),
    member(
      "other-user",
      "viewer",
    ),
  ];
  const fixture =
    createFixture(
      members,
      {
        status: "ready",
        identities: [
          {
            externalUserId:
              "current-user",
            displayName:
              "Current User",
            primaryEmail:
              "current@example.com",
          },
          {
            externalUserId:
              "other-user",
            displayName:
              "Other User",
            primaryEmail:
              "other@example.com",
          },
        ],
      },
    );
  const directory =
    await fixture.service.list(
      session(),
    );

  assert.equal(
    directory.identityStatus,
    "ready",
  );
  assert.deepEqual(
    directory.members.map(
      (item) => ({
        displayName:
          item.displayName,
        primaryEmail:
          item.primaryEmail,
      }),
    ),
    [
      {
        displayName:
          "Current User",
        primaryEmail:
          "current@example.com",
      },
      {
        displayName:
          "Other User",
        primaryEmail:
          "other@example.com",
      },
    ],
  );
});

test("rejects incomplete, foreign, duplicate, and malformed identity results", async () => {
  const members = [
    member(
      "current-user",
      "owner",
    ),
    member(
      "other-user",
      "agent",
    ),
  ];
  const invalidIdentityLists = [
    [
      {
        externalUserId:
          "current-user",
        displayName:
          "Current User",
        primaryEmail:
          "current@example.com",
      },
    ],
    [
      {
        externalUserId:
          "current-user",
        displayName:
          "Current User",
        primaryEmail:
          "current@example.com",
      },
      {
        externalUserId:
          "foreign-user",
        displayName:
          "Foreign User",
        primaryEmail:
          "foreign@example.com",
      },
    ],
    [
      {
        externalUserId:
          "current-user",
        displayName:
          "Current User",
        primaryEmail:
          "current@example.com",
      },
      {
        externalUserId:
          "current-user",
        displayName:
          "Duplicate User",
        primaryEmail:
          "duplicate@example.com",
      },
    ],
    [
      {
        externalUserId:
          "current-user",
        displayName: " ",
        primaryEmail:
          "current@example.com",
      },
      {
        externalUserId:
          "other-user",
        displayName:
          "Other User",
        primaryEmail:
          "invalid email",
      },
    ],
  ];

  for (const identities of invalidIdentityLists) {
    const fixture =
      createFixture(
        members,
        {
          status: "ready",
          identities,
        },
      );

    await assert.rejects(
      fixture.service.list(
        session(),
      ),
    );
  }
});

test("rejects contradictory or unsupported identity directory states", async () => {
  const members = [
    member(
      "current-user",
      "owner",
    ),
  ];

  for (const identityResult of [
    {
      status: "unavailable",
      identities: [
        {
          externalUserId:
            "current-user",
          displayName:
            "Current User",
          primaryEmail:
            "current@example.com",
        },
      ],
    },
    {
      status: "unsupported",
      identities: [],
    },
  ]) {
    const fixture =
      createFixture(
        members,
        identityResult,
      );

    await assert.rejects(
      fixture.service.list(
        session(),
      ),
      /identity directory/,
    );
  }
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
