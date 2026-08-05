import assert from "node:assert/strict";
import test from "node:test";

import {
  createTeamInvitationExpirationScheduler,
  TeamInvitationExpirationSchedulerError,
} from "../server/team/teamInvitationExpirationScheduler.ts";

const now =
  "2026-08-12T10:00:00.000Z";

function invitationKey(
  index,
) {
  return `team_invitation_v1_${index
    .toString(16)
    .padStart(64, "0")}`;
}

function candidate(index) {
  return {
    tenantId: 7,
    invitationKey:
      invitationKey(index),
    expectedVersion: 1,
    expiresAt: now,
  };
}

function successfulInvitation(
  item,
) {
  return {
    tenantId: item.tenantId,
    invitationKey:
      item.invitationKey,
    version:
      item.expectedVersion + 1,
    status: "expired",
    lastActor: {
      kind: "system",
      id:
        "team-invitation-expiration-scheduler-v1",
    },
  };
}

test("uses exclusive keyset pages and classifies concurrent outcomes", async () => {
  const listCalls = [];
  const transitionCalls = [];
  const firstPage =
    Array.from(
      { length: 10 },
      (_, index) =>
        candidate(index + 1),
    );
  const secondPage = [
    candidate(11),
    candidate(12),
  ];
  const expirationRepository = {
    async listDuePage(
      cutoff,
      cursor,
      limit,
    ) {
      listCalls.push({
        cutoff,
        cursor,
        limit,
      });

      return cursor === null
        ? {
            invitations:
              firstPage,
            nextCursor: {
              expiresAt: now,
              invitationKey:
                firstPage.at(-1)
                  .invitationKey,
            },
          }
        : {
            invitations:
              secondPage,
            nextCursor: null,
          };
    },
  };
  const invitationRepository = {
    async transition(command) {
      transitionCalls.push(
        command,
      );
      const index =
        Number.parseInt(
          command.invitationKey
            .slice(-64),
          16,
        );

      if (index === 2) {
        return {
          outcome: "unchanged",
          invitation:
            successfulInvitation(
              candidate(index),
            ),
        };
      }

      if (index === 3) {
        return {
          outcome: "conflict",
          invitation: null,
        };
      }

      return {
        outcome: "updated",
        invitation:
          successfulInvitation(
            candidate(index),
          ),
      };
    },
  };
  const scheduler =
    createTeamInvitationExpirationScheduler(
      expirationRepository,
      invitationRepository,
      {
        now() {
          return new Date(now);
        },
      },
    );

  assert.deepEqual(
    await scheduler.run(),
    {
      scanned: 12,
      expired: 10,
      idempotent: 1,
      skipped: 1,
      limitReached: false,
    },
  );
  assert.equal(
    listCalls.length,
    2,
  );
  assert.deepEqual(
    listCalls.map(
      ({ limit }) => limit,
    ),
    [10, 10],
  );
  assert.equal(
    transitionCalls.length,
    12,
  );
  assert.equal(
    transitionCalls.every(
      (call) =>
        call.toStatus ===
          "expired" &&
        call.systemActorId ===
          "team-invitation-expiration-scheduler-v1" &&
        call.occurredAt === now,
    ),
    true,
  );
});

test("stops after fifty invitations even when another page exists", async () => {
  let pageIndex = 0;
  let transitionCount = 0;
  const scheduler =
    createTeamInvitationExpirationScheduler(
      {
        async listDuePage() {
          const start =
            pageIndex * 10 + 1;
          const items =
            Array.from(
              { length: 10 },
              (_, index) =>
                candidate(
                  start + index,
                ),
            );

          pageIndex += 1;
          return {
            invitations: items,
            nextCursor: {
              expiresAt: now,
              invitationKey:
                items.at(-1)
                  .invitationKey,
            },
          };
        },
      },
      {
        async transition(command) {
          transitionCount += 1;
          return {
            outcome: "updated",
            invitation:
              successfulInvitation({
                tenantId:
                  command.tenantId,
                invitationKey:
                  command
                    .invitationKey,
                expectedVersion:
                  command
                    .expectedVersion,
              }),
          };
        },
      },
      {
        now() {
          return new Date(now);
        },
      },
    );

  assert.deepEqual(
    await scheduler.run(),
    {
      scanned: 50,
      expired: 50,
      idempotent: 0,
      skipped: 0,
      limitReached: true,
    },
  );
  assert.equal(pageIndex, 5);
  assert.equal(
    transitionCount,
    50,
  );
});

test("fails closed for invalid clocks, pages, cursor loops, and persistence failures", async (context) => {
  const validRepository = {
    async listDuePage() {
      return {
        invitations: [],
        nextCursor: null,
      };
    },
  };
  const validMutations = {
    async transition() {
      throw new Error(
        "must not transition",
      );
    },
  };

  await context.test(
    "invalid clock",
    async () => {
      const scheduler =
        createTeamInvitationExpirationScheduler(
          validRepository,
          validMutations,
          {
            now() {
              return new Date(
                Number.NaN,
              );
            },
          },
        );

      await assert.rejects(
        scheduler.run(),
        TeamInvitationExpirationSchedulerError,
      );
    },
  );

  await context.test(
    "repository failure",
    async () => {
      const scheduler =
        createTeamInvitationExpirationScheduler(
          {
            async listDuePage() {
              throw new Error(
                "private D1 failure",
              );
            },
          },
          validMutations,
          {
            now() {
              return new Date(now);
            },
          },
        );

      await assert.rejects(
        scheduler.run(),
        (error) =>
          error instanceof
            TeamInvitationExpirationSchedulerError &&
          !error.message.includes(
            "private",
          ),
      );
    },
  );

  await context.test(
    "malformed continuation",
    async () => {
      const scheduler =
        createTeamInvitationExpirationScheduler(
          {
            async listDuePage() {
              return {
                invitations: [],
                nextCursor: {
                  expiresAt: now,
                  invitationKey:
                    invitationKey(1),
                },
              };
            },
          },
          validMutations,
          {
            now() {
              return new Date(now);
            },
          },
        );

      await assert.rejects(
        scheduler.run(),
        TeamInvitationExpirationSchedulerError,
      );
    },
  );

  await context.test(
    "cursor does not match the last item",
    async () => {
      const items =
        Array.from(
          { length: 10 },
          (_, index) =>
            candidate(index + 1),
        );
      const scheduler =
        createTeamInvitationExpirationScheduler(
          {
            async listDuePage() {
              return {
                invitations: items,
                nextCursor: {
                  expiresAt: now,
                  invitationKey:
                    invitationKey(9),
                },
              };
            },
          },
          {
            async transition(command) {
              return {
                outcome:
                  "updated",
                invitation:
                  successfulInvitation({
                    tenantId:
                      command.tenantId,
                    invitationKey:
                      command
                        .invitationKey,
                    expectedVersion:
                      command
                        .expectedVersion,
                  }),
              };
            },
          },
          {
            now() {
              return new Date(now);
            },
          },
        );

      await assert.rejects(
        scheduler.run(),
        TeamInvitationExpirationSchedulerError,
      );
    },
  );

  await context.test(
    "transition failure",
    async () => {
      const scheduler =
        createTeamInvitationExpirationScheduler(
          {
            async listDuePage() {
              return {
                invitations: [
                  candidate(1),
                ],
                nextCursor: null,
              };
            },
          },
          {
            async transition() {
              throw new Error(
                "private mutation failure",
              );
            },
          },
          {
            now() {
              return new Date(now);
            },
          },
        );

      await assert.rejects(
        scheduler.run(),
        (error) =>
          error instanceof
            TeamInvitationExpirationSchedulerError &&
          !error.message.includes(
            "private",
          ),
      );
    },
  );
});
