import assert from "node:assert/strict";
import test from "node:test";

import {
  createTeamInvitationBrowserExecutorProofPort,
  TeamInvitationBrowserExecutorProofPortError,
} from "../db/teamInvitationBrowserExecutorProofPort.ts";

const invitationKey =
  `team_invitation_v1_${"a".repeat(64)}`;
const input = {
  invitationKey,
  scope: {
    kind: "tenant-total",
  },
};
const proof = {
  invitationCount: 1,
  membershipCount: 2,
  activeMembershipCount: 1,
  acceptanceAuditCount: 0,
};

function expectsAborted(error) {
  return (
    error instanceof
      TeamInvitationBrowserExecutorProofPortError &&
    error.code === "ABORTED" &&
    error.message === "ABORTED"
  );
}

test("adapts the existing read-only proof reader without changing its bounded output", async () => {
  const calls = [];
  const database = {
    prepare(sql) {
      calls.push({ kind: "prepare", sql });

      return {
        bind(...values) {
          calls.push({ kind: "bind", values });

          return {
            async first() {
              calls.push({ kind: "first" });
              return proof;
            },
          };
        },
      };
    },
  };
  const port =
    createTeamInvitationBrowserExecutorProofPort(
      database,
    );
  const result =
    await port.readDatabaseProof(
      input,
      new AbortController().signal,
    );

  assert.deepEqual(result, proof);
  assert.deepEqual(
    calls.map((call) => call.kind),
    ["prepare", "bind", "first"],
  );
  assert.deepEqual(calls[1].values, [
    invitationKey,
  ]);
  assert.doesNotMatch(
    calls[0].sql,
    /INSERT|UPDATE|DELETE|DROP|ALTER/i,
  );
});

test("rejects an already aborted proof read before D1 access", async () => {
  let databaseCalls = 0;
  const database = {
    prepare() {
      databaseCalls += 1;
      throw new Error("must not run");
    },
  };
  const controller =
    new AbortController();
  controller.abort();
  const port =
    createTeamInvitationBrowserExecutorProofPort(
      database,
    );

  await assert.rejects(
    port.readDatabaseProof(
      input,
      controller.signal,
    ),
    expectsAborted,
  );
  assert.equal(databaseCalls, 0);
});

test("discards a proof that completes after the scenario was aborted", async () => {
  let finishRead;
  const database = {
    prepare() {
      return {
        bind() {
          return {
            first() {
              return new Promise((resolve) => {
                finishRead = resolve;
              });
            },
          };
        },
      };
    },
  };
  const controller =
    new AbortController();
  const port =
    createTeamInvitationBrowserExecutorProofPort(
      database,
    );
  const pending = port.readDatabaseProof(
    input,
    controller.signal,
  );

  await Promise.resolve();
  controller.abort();
  finishRead(proof);

  await assert.rejects(
    pending,
    expectsAborted,
  );
});
