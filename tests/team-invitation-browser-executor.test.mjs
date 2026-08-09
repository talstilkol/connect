import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  executeTeamInvitationBrowserRun,
  TeamInvitationBrowserExecutorError,
} from "../server/operations/teamInvitationBrowserExecutor.ts";
import {
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function fingerprint(value) {
  return `sha256:${sha256(value)}`;
}

function invitationKey(name) {
  return `team_invitation_v1_${sha256(
    `case:${name}`,
  )}`;
}

function proof(overrides = {}) {
  return {
    invitationCount: 1,
    membershipCount: 0,
    activeMembershipCount: 0,
    acceptanceAuditCount: 0,
    ...overrides,
  };
}

function observationFor(name) {
  switch (name) {
    case "sign-in-required":
      return {
        observed: "sign-in-required",
      };
    case "identity-verification-required":
      return {
        observed:
          "identity-verification-required",
      };
    case "acceptance-confirmed":
      return { observed: "accepted" };
    case "generic-unavailable-result":
      return {
        observed:
          "invitation-unavailable",
      };
    case "already-accepted-result":
      return {
        observed: "already-accepted",
      };
    case "private-fields-absent":
      return { exposedFieldCount: 0 };
    case "invitation-details-private":
      return { exposedDetailCount: 0 };
    case "initial-focus-order-valid":
      return { valid: true };
    case "submit-keyboard-operable":
      return { submittedWith: "keyboard" };
    case "status-announced":
      return {
        politeStatusObserved: true,
      };
    case "focus-visible":
      return { visible: true };
    default:
      throw new Error("UNKNOWN_ASSERTION");
  }
}

function createInput(overrides = {}) {
  return {
    origin:
      "https://staging.connect.test",
    releaseId:
      `connect_release_v1_${"a".repeat(64)}`,
    commitSha: "b".repeat(40),
    artifactDigest:
      fingerprint("artifact"),
    policy: {
      ttlHours: 72,
      reRequest: "after-terminal",
    },
    scenarioTimeoutMilliseconds: 1_000,
    ...overrides,
  };
}

function scenarioNameForKey(key) {
  return teamInvitationBrowserScenarioRegistry.find(
    (scenario) =>
      invitationKey(scenario.name) === key,
  )?.name;
}

function databaseProofFor(name, readIndex) {
  if (
    name ===
    "verified-matching-email-accepts"
  ) {
    return readIndex === 0
      ? proof()
      : proof({
          membershipCount: 1,
          activeMembershipCount: 1,
          acceptanceAuditCount: 1,
        });
  }

  if (
    name ===
    "identical-retry-idempotent"
  ) {
    return proof({
      membershipCount: 1,
      activeMembershipCount: 1,
      acceptanceAuditCount: 1,
    });
  }

  return proof({
    membershipCount: 2,
    activeMembershipCount: 1,
  });
}

function createPorts(overrides = {}) {
  const readCounts = new Map();

  return {
    resolveScenarioCase:
      overrides.resolveScenarioCase ??
      (async ({ scenarioName }) => {
        const hasDatabase =
          teamInvitationBrowserScenarioRegistry
            .find(
              (scenario) =>
                scenario.name === scenarioName,
            )
            .assertions.some(
              (assertion) =>
                assertion.source === "database",
            );
        const key = invitationKey(
          scenarioName,
        );

        return hasDatabase
          ? {
              invitationKey: key,
              proofScope:
                scenarioName ===
                "unauthenticated-user-rejected"
                  ? {
                      kind: "tenant-total",
                    }
                  : {
                      kind: "external-user",
                      externalUserId:
                        `staging_identity_${sha256(
                          scenarioName,
                        )}`,
                    },
            }
          : { invitationKey: key };
      }),
    executeBrowserScenario:
      overrides.executeBrowserScenario ??
      (async ({ scenarioName }) => {
        const scenarioIndex =
          teamInvitationBrowserScenarioRegistry.findIndex(
            (scenario) =>
              scenario.name === scenarioName,
          );
        const scenario =
          teamInvitationBrowserScenarioRegistry[
            scenarioIndex
          ];

        return {
          completedAt:
            `2026-08-09T10:0${scenarioIndex}:00.000Z`,
          runFingerprint: fingerprint(
            `run:${scenarioName}`,
          ),
          observations:
            scenario.assertions
              .filter(
                (assertion) =>
                  assertion.source === "browser",
              )
              .map((assertion) => ({
                name: assertion.name,
                observation:
                  observationFor(
                    assertion.name,
                  ),
              })),
        };
      }),
    readDatabaseProof:
      overrides.readDatabaseProof ??
      (async ({ invitationKey: key }) => {
        const name =
          scenarioNameForKey(key);
        const readIndex =
          readCounts.get(name) ?? 0;
        readCounts.set(
          name,
          readIndex + 1,
        );

        return databaseProofFor(
          name,
          readIndex,
        );
      }),
  };
}

function expectsCode(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserExecutorError &&
    error.code === code &&
    error.message === code;
}

test("runs seven isolated scenarios sequentially and emits one bounded 22-assertion receipt", async () => {
  const trace = [];
  const base = createPorts();
  const ports = {
    async resolveScenarioCase(input, signal) {
      assert.equal(signal.aborted, false);
      trace.push(`resolve:${input.scenarioName}`);
      return base.resolveScenarioCase(
        input,
        signal,
      );
    },
    async executeBrowserScenario(input, signal) {
      assert.deepEqual(Object.keys(input), [
        "scenarioName",
        "invitationKey",
      ]);
      assert.equal(signal.aborted, false);
      trace.push(`browser:${input.scenarioName}`);
      return base.executeBrowserScenario(
        input,
        signal,
      );
    },
    async readDatabaseProof(input, signal) {
      assert.equal(signal.aborted, false);
      trace.push(
        `database:${scenarioNameForKey(
          input.invitationKey,
        )}`,
      );
      return base.readDatabaseProof(
        input,
        signal,
      );
    },
  };
  const receipt =
    await executeTeamInvitationBrowserRun(
      createInput(),
      ports,
    );

  assert.equal(receipt.scenarios.length, 7);
  assert.equal(
    receipt.scenarios.flatMap(
      (scenario) => scenario.assertions,
    ).length,
    22,
  );
  assert.equal(trace.length, 26);
  assert.deepEqual(trace.slice(0, 4), [
    "resolve:unauthenticated-user-rejected",
    "database:unauthenticated-user-rejected",
    "browser:unauthenticated-user-rejected",
    "database:unauthenticated-user-rejected",
  ]);
  assert.deepEqual(trace.slice(-2), [
    "resolve:keyboard-and-focus-accessible",
    "browser:keyboard-and-focus-accessible",
  ]);
  assert.doesNotMatch(
    JSON.stringify(receipt),
    /"(?:invitationKey|externalUserId|proofScope)":/,
  );
});

test("rejects invalid deployment input and port shape before external access", async () => {
  let calls = 0;
  const base = createPorts();
  const ports = {
    async resolveScenarioCase(input, signal) {
      calls += 1;
      return base.resolveScenarioCase(
        input,
        signal,
      );
    },
    executeBrowserScenario:
      base.executeBrowserScenario,
    readDatabaseProof:
      base.readDatabaseProof,
  };
  const cases = [
    createInput({
      origin: "http://localhost:3000",
    }),
    createInput({
      scenarioTimeoutMilliseconds: 0,
    }),
    createInput({
      policy: {
        ttlHours: 72,
        reRequest: "unknown",
      },
    }),
    {
      ...createInput(),
      verifiedAt:
        "2026-08-09T10:06:00.000Z",
    },
  ];

  for (const input of cases) {
    await assert.rejects(
      executeTeamInvitationBrowserRun(
        input,
        ports,
      ),
      expectsCode("INVALID_INPUT"),
    );
  }

  await assert.rejects(
    executeTeamInvitationBrowserRun(
      createInput(),
      {
        ...ports,
        extra: async () => undefined,
      },
    ),
    expectsCode("INVALID_INPUT"),
  );
  assert.equal(calls, 0);
});

test("separates unavailable and malformed scenario cases without opening a browser", async () => {
  let browserCalls = 0;
  const unavailable = createPorts({
    async resolveScenarioCase() {
      throw new Error("provider detail");
    },
    async executeBrowserScenario() {
      browserCalls += 1;
    },
  });
  const invalid = createPorts({
    async resolveScenarioCase() {
      return {
        invitationKey:
          invitationKey(
            "unauthenticated-user-rejected",
          ),
        proofScope: {
          kind: "tenant-total",
        },
        secret: "forbidden",
      };
    },
    async executeBrowserScenario() {
      browserCalls += 1;
    },
  });

  await assert.rejects(
    executeTeamInvitationBrowserRun(
      createInput(),
      unavailable,
    ),
    expectsCode("CASE_UNAVAILABLE"),
  );
  await assert.rejects(
    executeTeamInvitationBrowserRun(
      createInput(),
      invalid,
    ),
    expectsCode("CASE_INVALID"),
  );
  assert.equal(browserCalls, 0);
});

test("separates browser transport failure from an extended browser result", async () => {
  const unavailable = createPorts({
    async executeBrowserScenario() {
      throw new Error("browser detail");
    },
  });
  const invalid = createPorts({
    async executeBrowserScenario() {
      return {
        completedAt:
          "2026-08-09T10:00:00.000Z",
        runFingerprint:
          fingerprint("invalid-run"),
        observations: [],
        rawText: "forbidden",
      };
    },
  });

  await assert.rejects(
    executeTeamInvitationBrowserRun(
      createInput(),
      unavailable,
    ),
    expectsCode("BROWSER_UNAVAILABLE"),
  );
  await assert.rejects(
    executeTeamInvitationBrowserRun(
      createInput(),
      invalid,
    ),
    expectsCode("BROWSER_RESULT_INVALID"),
  );
});

test("separates unavailable and malformed database proof before browser execution", async () => {
  let browserCalls = 0;
  const unavailable = createPorts({
    async readDatabaseProof() {
      throw new Error("database detail");
    },
    async executeBrowserScenario() {
      browserCalls += 1;
    },
  });
  const invalid = createPorts({
    async readDatabaseProof() {
      return {
        ...proof(),
        tenantId: 1,
      };
    },
    async executeBrowserScenario() {
      browserCalls += 1;
    },
  });

  await assert.rejects(
    executeTeamInvitationBrowserRun(
      createInput(),
      unavailable,
    ),
    expectsCode("DATABASE_UNAVAILABLE"),
  );
  await assert.rejects(
    executeTeamInvitationBrowserRun(
      createInput(),
      invalid,
    ),
    expectsCode("DATABASE_PROOF_INVALID"),
  );
  assert.equal(browserCalls, 0);
});

test("fails the complete run when a browser observation does not prove its assertion", async () => {
  let resolvedCases = 0;
  const base = createPorts();
  const ports = createPorts({
    async resolveScenarioCase(input, signal) {
      resolvedCases += 1;
      return base.resolveScenarioCase(
        input,
        signal,
      );
    },
    async executeBrowserScenario({
      scenarioName,
    }) {
      const scenario =
        teamInvitationBrowserScenarioRegistry.find(
          (candidate) =>
            candidate.name === scenarioName,
        );

      return {
        completedAt:
          "2026-08-09T10:00:00.000Z",
        runFingerprint:
          fingerprint(
            `failed:${scenarioName}`,
          ),
        observations:
          scenario.assertions
            .filter(
              (assertion) =>
                assertion.source === "browser",
            )
            .map((assertion) => ({
              name: assertion.name,
              observation: {
                observed: "wrong-result",
              },
            })),
      };
    },
  });

  await assert.rejects(
    executeTeamInvitationBrowserRun(
      createInput(),
      ports,
    ),
    expectsCode("ASSERTION_FAILED"),
  );
  assert.equal(resolvedCases, 1);
});

test("aborts a timed-out browser scenario and does not continue to the next case", async () => {
  let aborted = false;
  let resolvedCases = 0;
  const ports = createPorts({
    async resolveScenarioCase({
      scenarioName,
    }) {
      resolvedCases += 1;
      return {
        invitationKey:
          invitationKey(scenarioName),
        proofScope: {
          kind: "tenant-total",
        },
      };
    },
    executeBrowserScenario(_input, signal) {
      return new Promise((resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            aborted = true;
            reject(new Error("aborted"));
          },
          { once: true },
        );
      });
    },
  });

  await assert.rejects(
    executeTeamInvitationBrowserRun(
      createInput({
        scenarioTimeoutMilliseconds: 5,
      }),
      ports,
    ),
    expectsCode("TIMEOUT"),
  );
  assert.equal(aborted, true);
  assert.equal(resolvedCases, 1);
});
