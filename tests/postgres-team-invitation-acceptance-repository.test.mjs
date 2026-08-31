import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresTeamInvitationAcceptanceRepository,
  postgresTeamInvitationAcceptanceSql,
} from "../server/platform/postgresTeamInvitationAcceptanceRepository.ts";
import {
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationKey,
} from "../server/team/teamInvitationKey.ts";

const tenantId = 7;
const requestedAt = "2026-08-17T08:00:00.000Z";
const expiresAt = "2026-08-18T08:00:00.000Z";
const acceptedAt = "2026-08-17T09:00:00.000Z";

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function cloneState(source) {
  return {
    invitation: { ...source.invitation },
    acceptance:
      source.acceptance === null ? null : { ...source.acceptance },
    memberships: new Map(
      Array.from(source.memberships, ([key, membership]) => [
        key,
        { ...membership },
      ]),
    ),
    delivery: { ...source.delivery },
  };
}

async function createFixture({
  invitationStatus = "pending",
  deliveryStatus = "pending",
  rejectAcceptance = false,
} = {}) {
  const invitationKey = await deriveTeamInvitationKey({
    tenantId,
    email: "manager@example.com",
  });
  const deliveryKey = await deriveTeamInvitationDeliveryKey({
    tenantId,
    invitationKey,
    invitationVersion: 1,
  });
  const state = {
    invitation: {
      invitationKey,
      tenantId,
      normalizedEmail: "manager@example.com",
      role: "manager",
      physicalStatus: invitationStatus,
      version: 1,
      invitedByExternalUserId: "owner-user",
      lastActorKind: "user",
      lastActorId: "owner-user",
      requestedAt,
      expiresAt,
      updatedAt: requestedAt,
    },
    acceptance: null,
    memberships: new Map(),
    delivery: {
      deliveryKey,
      tenantId,
      invitationKey,
      invitationVersion: 1,
      status: deliveryStatus,
      lastErrorCode: null,
      updatedAt: requestedAt,
    },
  };
  const transactions = {
    attempts: 0,
    commits: 0,
    rollbacks: 0,
    options: [],
  };

  function createQuery(working) {
    return async (sql, parameters) => {
      if (sql === postgresTeamInvitationAcceptanceSql.lockInvitation) {
        return queryResult(
          working.invitation.invitationKey === parameters[0]
            ? [{ ...working.invitation }]
            : [],
        );
      }

      if (sql === postgresTeamInvitationAcceptanceSql.findAcceptance) {
        const acceptance = working.acceptance;
        const membership = acceptance === null
          ? null
          : working.memberships.get(acceptance.externalUserId);
        return queryResult(
          acceptance !== null && membership
            ? [
                {
                  ...acceptance,
                  membershipTenantId: membership.tenantId,
                  membershipExternalUserId: membership.externalUserId,
                  membershipRole: membership.role,
                  membershipStatus: membership.status,
                  membershipVersion: membership.version,
                },
              ]
            : [],
        );
      }

      if (sql === postgresTeamInvitationAcceptanceSql.lockMembership) {
        const membership = working.memberships.get(parameters[1]);
        return queryResult(
          membership?.tenantId === parameters[0]
            ? [{ ...membership }]
            : [],
        );
      }

      if (sql === postgresTeamInvitationAcceptanceSql.lockDelivery) {
        const delivery = working.delivery;
        const matches =
          delivery.deliveryKey === parameters[0] &&
          delivery.tenantId === parameters[1] &&
          delivery.invitationKey === parameters[2] &&
          delivery.invitationVersion === parameters[3];
        return queryResult(matches ? [{ status: delivery.status }] : []);
      }

      if (
        sql === postgresTeamInvitationAcceptanceSql.cancelPendingDelivery
      ) {
        const delivery = working.delivery;

        if (
          delivery.deliveryKey !== parameters[0] ||
          delivery.tenantId !== parameters[1] ||
          delivery.invitationKey !== parameters[2] ||
          delivery.invitationVersion !== parameters[3] ||
          delivery.status !== "pending"
        ) {
          return queryResult([]);
        }

        delivery.status = "cancelled";
        delivery.lastErrorCode = "INVITATION_ACCEPTED";
        delivery.updatedAt = parameters[4];
        return queryResult([{ status: "cancelled" }]);
      }

      if (sql === postgresTeamInvitationAcceptanceSql.updateInvitation) {
        const invitation = working.invitation;

        if (
          invitation.tenantId !== parameters[0] ||
          invitation.invitationKey !== parameters[1] ||
          invitation.version !== parameters[2] ||
          invitation.physicalStatus !== "pending" ||
          invitation.normalizedEmail !== parameters[3] ||
          invitation.expiresAt <= parameters[5] ||
          working.acceptance !== null
        ) {
          return queryResult([]);
        }

        invitation.version += 1;
        invitation.lastActorKind = "user";
        invitation.lastActorId = parameters[4];
        invitation.updatedAt = parameters[5];
        return queryResult([{ ...invitation }]);
      }

      if (sql === postgresTeamInvitationAcceptanceSql.insertMembership) {
        if (working.memberships.has(parameters[1])) {
          throw new Error("duplicate membership");
        }

        const membership = {
          tenantId: parameters[0],
          externalUserId: parameters[1],
          role: parameters[2],
          status: "active",
          version: 1,
        };
        working.memberships.set(membership.externalUserId, membership);
        return queryResult([{ ...membership }]);
      }

      if (sql === postgresTeamInvitationAcceptanceSql.insertAcceptance) {
        if (rejectAcceptance) {
          throw new Error("acceptance persistence rejected");
        }

        const membership = working.memberships.get(parameters[3]);
        const invitation = working.invitation;

        if (
          working.acceptance !== null ||
          !membership ||
          invitation.version !== parameters[7] ||
          invitation.lastActorId !== parameters[3] ||
          invitation.updatedAt !== parameters[8]
        ) {
          throw new Error("acceptance contract rejected");
        }

        working.acceptance = {
          acceptanceKey: parameters[0],
          tenantId: parameters[1],
          invitationKey: parameters[2],
          externalUserId: parameters[3],
          normalizedEmail: parameters[4],
          role: parameters[5],
          fromVersion: parameters[6],
          toVersion: parameters[7],
          acceptedAt: parameters[8],
          expiresAt: parameters[9],
        };
        return queryResult([{ acceptanceKey: parameters[0] }]);
      }

      throw new Error("unexpected PostgreSQL invitation acceptance query");
    };
  }

  const repository = createPostgresTeamInvitationAcceptanceRepository({
    transactions: {
      async transaction(options, execute) {
        transactions.attempts += 1;
        transactions.options.push(options);
        const working = cloneState(state);

        try {
          const value = await execute({ query: createQuery(working) });
          state.invitation = working.invitation;
          state.acceptance = working.acceptance;
          state.memberships = working.memberships;
          state.delivery = working.delivery;
          transactions.commits += 1;
          return value;
        } catch (error) {
          transactions.rollbacks += 1;
          throw error;
        }
      },
    },
  });

  return { repository, state, transactions, invitationKey };
}

function acceptInput(invitationKey, overrides = {}) {
  return {
    invitationKey,
    externalUserId: "invited-user",
    verifiedEmail: "manager@example.com",
    acceptedAt,
    ...overrides,
  };
}

test("accepts once and returns an exact idempotent replay", async () => {
  const fixture = await createFixture();
  const created = await fixture.repository.accept(
    acceptInput(fixture.invitationKey),
  );

  assert.equal(created.outcome, "created");
  assert.equal(created.invitation.status, "accepted");
  assert.equal(created.invitation.version, 2);
  assert.deepEqual(created.membership, {
    tenantId,
    externalUserId: "invited-user",
    role: "manager",
    status: "active",
    version: 1,
  });
  assert.equal(fixture.state.delivery.status, "cancelled");
  assert.equal(fixture.state.delivery.lastErrorCode, "INVITATION_ACCEPTED");

  const replayed = await fixture.repository.accept(
    acceptInput(fixture.invitationKey),
  );
  assert.equal(replayed.outcome, "unchanged");
  assert.equal(replayed.invitation.status, "accepted");
  assert.equal(fixture.state.memberships.size, 1);
  assert.equal(fixture.transactions.rollbacks, 0);
  assert.deepEqual(
    new Set(
      fixture.transactions.options.map((option) => option.isolationLevel),
    ),
    new Set(["read-committed"]),
  );
});

test("rejects email mismatch, terminal state, and active delivery", async () => {
  const emailFixture = await createFixture();
  const emailMismatch = await emailFixture.repository.accept(
    acceptInput(emailFixture.invitationKey, {
      verifiedEmail: "other@example.com",
    }),
  );
  assert.equal(emailMismatch.outcome, "email-mismatch");

  const revokedFixture = await createFixture({
    invitationStatus: "revoked",
  });
  const revoked = await revokedFixture.repository.accept(
    acceptInput(revokedFixture.invitationKey),
  );
  assert.equal(revoked.outcome, "invalid-transition");

  const sendingFixture = await createFixture({ deliveryStatus: "sending" });
  const sending = await sendingFixture.repository.accept(
    acceptInput(sendingFixture.invitationKey),
  );
  assert.equal(sending.outcome, "invalid-transition");
});

test("rejects an existing member without changing the invitation", async () => {
  const fixture = await createFixture();
  fixture.state.memberships.set("invited-user", {
    tenantId,
    externalUserId: "invited-user",
    role: "viewer",
    status: "active",
    version: 1,
  });
  const conflict = await fixture.repository.accept(
    acceptInput(fixture.invitationKey),
  );

  assert.equal(conflict.outcome, "conflict");
  assert.equal(fixture.state.invitation.version, 1);
  assert.equal(fixture.state.acceptance, null);
});

test("rolls back invitation, membership, delivery, and acceptance together", async () => {
  const fixture = await createFixture({ rejectAcceptance: true });

  await assert.rejects(
    fixture.repository.accept(acceptInput(fixture.invitationKey)),
    /acceptance persistence rejected/,
  );
  assert.equal(fixture.state.invitation.version, 1);
  assert.equal(fixture.state.delivery.status, "pending");
  assert.equal(fixture.state.memberships.size, 0);
  assert.equal(fixture.state.acceptance, null);
  assert.equal(fixture.transactions.commits, 0);
  assert.equal(fixture.transactions.rollbacks, 1);
});

test("rejects invalid dependencies and input before starting a transaction", async () => {
  assert.throws(
    () => createPostgresTeamInvitationAcceptanceRepository({}),
    /dependencies are invalid/,
  );

  const fixture = await createFixture();
  await assert.rejects(
    fixture.repository.accept(
      acceptInput(fixture.invitationKey, { externalUserId: "" }),
    ),
    /external user ID is invalid/,
  );
  assert.equal(fixture.transactions.attempts, 0);
});
