import assert from "node:assert/strict";
import test from "node:test";

import {
  TenantSelectionConflictError,
  TenantSelectionInputError,
  createTenantSelectionService,
} from "../server/auth/tenantSelectionService.ts";

const identity = {
  externalUserId: "user-a",
};

function membership({
  tenantId,
  displayName,
  role = "owner",
  tenantStatus = "active",
  externalUserId =
    identity.externalUserId,
}) {
  return {
    tenantId,
    tenantDisplayName:
      displayName,
    tenantStatus,
    externalUserId,
    role,
  };
}

function createFixture({
  initialSelection = null,
  saveOutcome = "saved",
  membershipRecords,
} = {}) {
  let selection =
    initialSelection;
  let saveInput = null;
  const memberships =
    membershipRecords ?? [
      membership({
        tenantId: 7,
        displayName:
          "First workspace",
      }),
      membership({
        tenantId: 11,
        displayName:
          "Second workspace",
        role: "manager",
      }),
      membership({
        tenantId: 13,
        displayName:
          "Blocked workspace",
        tenantStatus: "blocked",
      }),
      membership({
        tenantId: 17,
        displayName:
          "Foreign workspace",
        externalUserId: "user-b",
      }),
    ];
  const service =
    createTenantSelectionService({
      memberships: {
        async findActiveByExternalUserId(
          externalUserId,
        ) {
          assert.equal(
            externalUserId,
            identity.externalUserId,
          );
          return memberships;
        },
      },
      selections: {
        async findByExternalUserId(
          externalUserId,
        ) {
          assert.equal(
            externalUserId,
            identity.externalUserId,
          );
          return selection;
        },
        async save(input) {
          saveInput = input;

          if (
            saveOutcome === "conflict" ||
            saveOutcome === "rejected"
          ) {
            return {
              outcome: saveOutcome,
              selection: null,
            };
          }

          selection = {
            tenantId:
              input.tenantId,
            version:
              input.expectedVersion +
              1,
          };

          return {
            outcome: saveOutcome,
            selection,
          };
        },
      },
    });

  return {
    service,
    getSaveInput:
      () => saveInput,
  };
}

test("lists only eligible tenant options without exposing tenant or user IDs", async () => {
  const { service } =
    createFixture();
  const directory =
    await service.list(identity);

  assert.equal(
    directory.version,
    0,
  );
  assert.equal(
    directory.selectionRequired,
    true,
  );
  assert.deepEqual(
    directory.options.map(
      (option) => ({
        displayName:
          option.displayName,
        role: option.role,
        selected:
          option.selected,
      }),
    ),
    [
      {
        displayName:
          "First workspace",
        role: "owner",
        selected: false,
      },
      {
        displayName:
          "Second workspace",
        role: "manager",
        selected: false,
      },
    ],
  );
  assert.equal(
    directory.options.every(
      (option) =>
        /^tenant_selection_option_v1_[a-f0-9]{64}$/.test(
          option.selectionKey,
        ),
    ),
    true,
  );
  assert.doesNotMatch(
    JSON.stringify(directory),
    /user-a|"tenantId"/,
  );
});

test("selects an option only after resolving its opaque key", async () => {
  const {
    service,
    getSaveInput,
  } = createFixture();
  const directory =
    await service.list(identity);
  const result =
    await service.select(
      identity,
      {
        selectionKey:
          directory.options[1]
            .selectionKey,
        expectedVersion:
          directory.version,
      },
    );

  assert.deepEqual(result, {
    outcome: "saved",
    version: 1,
  });
  assert.deepEqual(
    getSaveInput(),
    {
      externalUserId: "user-a",
      tenantId: 11,
      expectedVersion: 0,
    },
  );
});

test("rejects malformed, extended, and unknown selection input before saving", async () => {
  const {
    service,
    getSaveInput,
  } = createFixture();
  const directory =
    await service.list(identity);
  const invalidInputs = [
    null,
    {
      selectionKey: "invalid",
      expectedVersion: 0,
    },
    {
      selectionKey:
        directory.options[0]
          .selectionKey,
      expectedVersion: -1,
    },
    {
      selectionKey:
        `tenant_selection_option_v1_${"0".repeat(
          64,
        )}`,
      expectedVersion: 0,
    },
    {
      selectionKey:
        directory.options[0]
          .selectionKey,
      expectedVersion: 0,
      tenantId: 7,
    },
  ];

  for (const input of invalidInputs) {
    await assert.rejects(
      service.select(
        identity,
        input,
      ),
      TenantSelectionInputError,
    );
  }

  assert.equal(
    getSaveInput(),
    null,
  );
});

test("maps stale persistence without returning the stored selection", async () => {
  const { service } =
    createFixture({
      initialSelection: {
        tenantId: 7,
        version: 2,
      },
      saveOutcome: "conflict",
    });
  const directory =
    await service.list(identity);

  await assert.rejects(
    service.select(identity, {
      selectionKey:
        directory.options[1]
          .selectionKey,
      expectedVersion: 2,
    }),
    TenantSelectionConflictError,
  );
});

test("requires reselection when the stored tenant is no longer eligible", async () => {
  const { service } =
    createFixture({
      initialSelection: {
        tenantId: 13,
        version: 4,
      },
    });
  const directory =
    await service.list(identity);

  assert.equal(
    directory.version,
    4,
  );
  assert.equal(
    directory.selectionRequired,
    true,
  );
  assert.equal(
    directory.options.every(
      (option) =>
        option.selected === false,
    ),
    true,
  );
});

test("presents the only eligible tenant as selected without creating storage", async () => {
  const {
    service,
    getSaveInput,
  } = createFixture({
    membershipRecords: [
      membership({
        tenantId: 7,
        displayName:
          "Only workspace",
      }),
    ],
  });
  const directory =
    await service.list(identity);

  assert.equal(
    directory.version,
    0,
  );
  assert.equal(
    directory.selectionRequired,
    false,
  );
  assert.equal(
    directory.options[0].selected,
    true,
  );
  assert.equal(
    getSaveInput(),
    null,
  );
});
