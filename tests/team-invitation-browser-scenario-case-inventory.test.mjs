import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  deriveTeamInvitationPolicyDigest,
} from "../server/operations/teamInvitationBrowserEvidence.ts";
import {
  buildTeamInvitationBrowserScenarioCaseInventory,
  createTeamInvitationBrowserScenarioCaseResolver,
  TeamInvitationBrowserScenarioCaseInventoryError,
} from "../server/operations/teamInvitationBrowserScenarioCaseInventory.ts";
import {
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";

const now = new Date(
  "2026-08-09T12:00:00.000Z",
);
const policy = {
  ttlHours: 72,
  reRequest: "after-terminal",
};

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function fingerprint(value) {
  return `sha256:${sha256(value)}`;
}

function expected(overrides = {}) {
  return {
    origin:
      "https://staging.connect.test",
    releaseId:
      `connect_release_v1_${"a".repeat(64)}`,
    commitSha: "b".repeat(40),
    artifactDigest:
      fingerprint("artifact"),
    policy,
    minimumRemainingLifetimeMilliseconds:
      30 * 60 * 1_000,
    ...overrides,
  };
}

function createInventory(overrides = {}) {
  const deployment = expected();

  return {
    schemaVersion: 1,
    preparedAt:
      "2026-08-09T11:30:00.000Z",
    expiresAt:
      "2026-08-09T13:00:00.000Z",
    environment: "staging",
    origin: deployment.origin,
    releaseId: deployment.releaseId,
    commitSha: deployment.commitSha,
    artifactDigest:
      deployment.artifactDigest,
    policyDigest:
      deriveTeamInvitationPolicyDigest(
        policy,
      ),
    cases:
      teamInvitationBrowserScenarioRegistry.map(
        (scenario) => {
          const base = {
            name: scenario.name,
            invitationKey:
              `team_invitation_v1_${sha256(
                `case:${scenario.name}`,
              )}`,
          };
          const hasDatabase =
            scenario.assertions.some(
              (assertion) =>
                assertion.source === "database",
            );

          if (!hasDatabase) {
            return base;
          }

          return {
            ...base,
            proofScope:
              scenario.name ===
              "unauthenticated-user-rejected"
                ? {
                    kind: "tenant-total",
                  }
                : {
                    kind: "external-user",
                    externalUserId:
                      `staging_identity_${sha256(
                        scenario.name,
                      )}`,
                  },
          };
        },
      ),
    ...overrides,
  };
}

function createResolver(
  inventory = createInventory(),
  expectedValue = expected(),
  clock = now,
) {
  return createTeamInvitationBrowserScenarioCaseResolver(
    JSON.stringify(inventory),
    expectedValue,
    clock,
  );
}

function expectsCode(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserScenarioCaseInventoryError &&
    error.code === code &&
    error.message === code;
}

test("builds one canonical one-hour inventory from the seven real case inputs", () => {
  const deployment = expected();
  const inventory =
    buildTeamInvitationBrowserScenarioCaseInventory(
      {
        origin: deployment.origin,
        releaseId: deployment.releaseId,
        commitSha: deployment.commitSha,
        artifactDigest:
          deployment.artifactDigest,
        policy,
        cases: createInventory().cases,
        lifetimeMinutes: 60,
      },
      now,
    );

  assert.equal(
    inventory.preparedAt,
    "2026-08-09T12:00:00.000Z",
  );
  assert.equal(
    inventory.expiresAt,
    "2026-08-09T13:00:00.000Z",
  );
  assert.equal(
    inventory.policyDigest,
    deriveTeamInvitationPolicyDigest(policy),
  );
  assert.equal(inventory.cases.length, 7);
  assert.ok(Object.isFrozen(inventory));
  assert.doesNotThrow(() =>
    createTeamInvitationBrowserScenarioCaseResolver(
      JSON.stringify(inventory),
      expected(),
      now,
    ),
  );
});

test("rejects unsafe generated lifetimes and malformed case input", () => {
  const deployment = expected();
  const base = {
    origin: deployment.origin,
    releaseId: deployment.releaseId,
    commitSha: deployment.commitSha,
    artifactDigest:
      deployment.artifactDigest,
    policy,
    cases: createInventory().cases,
    lifetimeMinutes: 60,
  };

  for (const input of [
    { ...base, lifetimeMinutes: 8 },
    { ...base, lifetimeMinutes: 121 },
    { ...base, policy: { ttlHours: 0 } },
    { ...base, cases: base.cases.slice(1) },
    { ...base, extra: "forbidden" },
  ]) {
    assert.throws(
      () =>
        buildTeamInvitationBrowserScenarioCaseInventory(
          input,
          now,
        ),
      expectsCode("INVENTORY_INVALID"),
    );
  }
});

test("resolves exactly seven isolated cases without exposing an inventory listing", async () => {
  const resolver = createResolver();
  const signal =
    new AbortController().signal;

  assert.deepEqual(Object.keys(resolver), [
    "resolveScenarioCase",
  ]);

  for (
    const scenario of
      teamInvitationBrowserScenarioRegistry
  ) {
    const scenarioCase =
      await resolver.resolveScenarioCase(
        {
          scenarioName: scenario.name,
        },
        signal,
      );
    const hasDatabase =
      scenario.assertions.some(
        (assertion) =>
          assertion.source === "database",
      );

    assert.deepEqual(
      Object.keys(scenarioCase),
      hasDatabase
        ? ["invitationKey", "proofScope"]
        : ["invitationKey"],
    );
    assert.match(
      scenarioCase.invitationKey,
      /^team_invitation_v1_[a-f0-9]{64}$/,
    );
    assert.ok(Object.isFrozen(scenarioCase));
  }
});

test("rejects a missing, malformed, extended, or locally scoped inventory", () => {
  const extended = createInventory({
    secretDescription: "forbidden",
  });
  const local = createInventory({
    origin: "http://localhost:3000",
  });
  const inputs = [
    undefined,
    "",
    "not-json",
    JSON.stringify(extended),
    JSON.stringify(local),
  ];

  assert.throws(
    () =>
      createTeamInvitationBrowserScenarioCaseResolver(
        inputs[0],
        expected(),
        now,
      ),
    expectsCode("INVENTORY_REQUIRED"),
  );

  for (const input of inputs.slice(1)) {
    assert.throws(
      () =>
        createTeamInvitationBrowserScenarioCaseResolver(
          input,
          expected(),
          now,
        ),
      (error) =>
        error instanceof
          TeamInvitationBrowserScenarioCaseInventoryError &&
        [
          "INVENTORY_REQUIRED",
          "INVENTORY_INVALID",
        ].includes(error.code),
    );
  }
});

test("rejects expired, future, and overlong inventory lifetimes", () => {
  const cases = [
    {
      preparedAt:
        "2026-08-09T09:00:00.000Z",
      expiresAt:
        "2026-08-09T11:00:00.000Z",
      code: "INVENTORY_EXPIRED",
    },
    {
      preparedAt:
        "2026-08-09T11:30:00.000Z",
      expiresAt:
        "2026-08-09T12:20:00.000Z",
      code: "INVENTORY_EXPIRED",
    },
    {
      preparedAt:
        "2026-08-09T12:01:00.000Z",
      expiresAt:
        "2026-08-09T13:00:00.000Z",
      code: "INVENTORY_INVALID",
    },
    {
      preparedAt:
        "2026-08-09T11:00:00.000Z",
      expiresAt:
        "2026-08-09T13:01:00.000Z",
      code: "INVENTORY_INVALID",
    },
  ];

  for (const item of cases) {
    assert.throws(
      () =>
        createResolver(
          createInventory({
            preparedAt: item.preparedAt,
            expiresAt: item.expiresAt,
          }),
        ),
      expectsCode(item.code),
    );
  }
});

test("binds the case inventory to origin, release, commit, artifact, and policy", () => {
  const mismatches = [
    expected({
      origin:
        "https://other-staging.connect.test",
    }),
    expected({
      releaseId:
        `connect_release_v1_${"c".repeat(
          64,
        )}`,
    }),
    expected({
      commitSha: "c".repeat(40),
    }),
    expected({
      artifactDigest:
        fingerprint("other-artifact"),
    }),
    expected({
      policy: {
        ttlHours: 48,
        reRequest: "after-terminal",
      },
    }),
  ];

  for (const deployment of mismatches) {
    assert.throws(
      () =>
        createResolver(
          createInventory(),
          deployment,
        ),
      expectsCode("INVENTORY_MISMATCH"),
    );
  }
});

test("rejects missing, reordered, and duplicate invitation cases", () => {
  const missing = createInventory();
  missing.cases.pop();
  const reordered = createInventory();
  [
    reordered.cases[0],
    reordered.cases[1],
  ] = [
    reordered.cases[1],
    reordered.cases[0],
  ];
  const duplicate = createInventory();
  duplicate.cases[1].invitationKey =
    duplicate.cases[0].invitationKey;

  for (const inventory of [
    missing,
    reordered,
    duplicate,
  ]) {
    assert.throws(
      () => createResolver(inventory),
      expectsCode("INVENTORY_INVALID"),
    );
  }
});

test("enforces tenant-total only for unauthenticated access and unique external identities", () => {
  const wrongUnauthenticated =
    createInventory();
  wrongUnauthenticated.cases[0].proofScope = {
    kind: "external-user",
    externalUserId:
      `staging_identity_${sha256(
        "unauthenticated",
      )}`,
  };
  const wrongAuthenticated = createInventory();
  wrongAuthenticated.cases[1].proofScope = {
    kind: "tenant-total",
  };
  const duplicateIdentity = createInventory();
  duplicateIdentity.cases[2].proofScope =
    duplicateIdentity.cases[1].proofScope;
  const extendedAccessibility =
    createInventory();
  extendedAccessibility.cases[6].proofScope = {
    kind: "external-user",
    externalUserId:
      `staging_identity_${sha256(
        "accessibility",
      )}`,
  };

  for (const inventory of [
    wrongUnauthenticated,
    wrongAuthenticated,
    duplicateIdentity,
    extendedAccessibility,
  ]) {
    assert.throws(
      () => createResolver(inventory),
      expectsCode("INVENTORY_INVALID"),
    );
  }
});

test("rejects unknown scenario requests and an already aborted run", async () => {
  const resolver = createResolver();
  const activeSignal =
    new AbortController().signal;
  const abortedController =
    new AbortController();
  abortedController.abort();

  await assert.rejects(
    resolver.resolveScenarioCase(
      { scenarioName: "unknown" },
      activeSignal,
    ),
    expectsCode("SCENARIO_INVALID"),
  );
  await assert.rejects(
    resolver.resolveScenarioCase(
      {
        scenarioName:
          "unauthenticated-user-rejected",
      },
      abortedController.signal,
    ),
    expectsCode("ABORTED"),
  );
});
