import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresTeamInvitationRepository,
  postgresTeamInvitationSql,
} from "../server/platform/postgresTeamInvitationRepository.ts";
import {
  teamInvitationExpirationSystemActorId,
} from "../shared/domain/teamInvitation.ts";

const tenantId = 7;
const actorExternalUserId = "owner-user";
const requestedAt = "2026-08-17T08:00:00.000Z";
const expiresAt = "2026-08-18T08:00:00.000Z";

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function copyRecord(value) {
  return value === undefined ? undefined : { ...value };
}

function copyMap(source) {
  return new Map(
    Array.from(source, ([key, value]) => [key, copyRecord(value)]),
  );
}

function createFixture({ rejectEvents = false } = {}) {
  const state = {
    tenantIds: new Set([tenantId]),
    invitations: new Map(),
    events: new Map(),
    deliveries: new Map(),
    acceptedInvitationKeys: new Set(),
  };
  const transactionState = {
    attempts: 0,
    commits: 0,
    rollbacks: 0,
    options: [],
    calls: [],
  };

  function invitationIdentity(scopedTenantId, invitationKey) {
    return `${scopedTenantId}:${invitationKey}`;
  }

  function invitationView(source, invitation) {
    return invitation === undefined
      ? undefined
      : {
          ...invitation,
          status: source.acceptedInvitationKeys.has(invitation.invitationKey)
            ? "accepted"
            : invitation.status,
        };
  }

  function findInvitation(source, scopedTenantId, invitationKey) {
    return invitationView(
      source,
      source.invitations.get(
        invitationIdentity(scopedTenantId, invitationKey),
      ),
    );
  }

  function createTransactionQuery(working) {
    return async (sql, parameters) => {
      transactionState.calls.push({ sql, parameters });

      if (sql === postgresTeamInvitationSql.lockTenant) {
        return queryResult(
          working.tenantIds.has(parameters[0])
            ? [{ tenantId: parameters[0] }]
            : [],
        );
      }

      if (sql === postgresTeamInvitationSql.lockInvitation) {
        const invitation = findInvitation(
          working,
          parameters[0],
          parameters[1],
        );
        return queryResult(invitation ? [invitation] : []);
      }

      if (sql === postgresTeamInvitationSql.findEvent) {
        const event = working.events.get(parameters[0]);
        return queryResult(event ? [copyRecord(event)] : []);
      }

      if (sql === postgresTeamInvitationSql.findEventByVersion) {
        const event = Array.from(working.events.values()).find(
          (candidate) =>
            candidate.tenantId === parameters[0] &&
            candidate.invitationKey === parameters[1] &&
            candidate.toVersion === parameters[2],
        );
        return queryResult(event ? [copyRecord(event)] : []);
      }

      if (sql === postgresTeamInvitationSql.lockDelivery) {
        const delivery = working.deliveries.get(parameters[0]);
        return queryResult(delivery ? [copyRecord(delivery)] : []);
      }

      if (sql === postgresTeamInvitationSql.insertInvitation) {
        const key = invitationIdentity(parameters[1], parameters[0]);

        if (working.invitations.has(key)) {
          throw new Error("duplicate invitation");
        }

        const invitation = {
          invitationKey: parameters[0],
          tenantId: parameters[1],
          normalizedEmail: parameters[2],
          role: parameters[3],
          status: "pending",
          version: 1,
          invitedByExternalUserId: parameters[4],
          lastActorKind: "user",
          lastActorId: parameters[4],
          requestedAt: parameters[5],
          expiresAt: parameters[6],
          updatedAt: parameters[5],
        };
        working.invitations.set(key, invitation);
        return queryResult([copyRecord(invitation)]);
      }

      if (sql === postgresTeamInvitationSql.reopenInvitation) {
        const invitation = working.invitations.get(
          invitationIdentity(parameters[0], parameters[1]),
        );

        if (
          !invitation ||
          invitation.version !== parameters[2] ||
          invitation.status !== parameters[3]
        ) {
          return queryResult([]);
        }

        invitation.role = parameters[4];
        invitation.status = "pending";
        invitation.version += 1;
        invitation.lastActorKind = "user";
        invitation.lastActorId = parameters[5];
        invitation.requestedAt = parameters[6];
        invitation.expiresAt = parameters[7];
        invitation.updatedAt = parameters[6];
        return queryResult([copyRecord(invitation)]);
      }

      if (sql === postgresTeamInvitationSql.transitionInvitation) {
        const invitation = working.invitations.get(
          invitationIdentity(parameters[0], parameters[1]),
        );

        if (
          !invitation ||
          invitation.version !== parameters[2] ||
          invitation.status !== parameters[3]
        ) {
          return queryResult([]);
        }

        invitation.status = parameters[4];
        invitation.version += 1;
        invitation.lastActorKind = parameters[5];
        invitation.lastActorId = parameters[6];
        invitation.updatedAt = parameters[7];
        return queryResult([copyRecord(invitation)]);
      }

      if (sql === postgresTeamInvitationSql.insertEvent) {
        if (rejectEvents) {
          throw new Error("invitation event persistence rejected");
        }

        const event = {
          eventKey: parameters[0],
          operationKey: parameters[1],
          invitationKey: parameters[2],
          tenantId: parameters[3],
          actorKind: parameters[4],
          actorId: parameters[5],
          eventType: parameters[6],
          fromRole: parameters[7],
          toRole: parameters[8],
          fromStatus: parameters[9],
          toStatus: parameters[10],
          fromVersion: parameters[11],
          toVersion: parameters[12],
          occurredAt: parameters[13],
          expiresAt: parameters[14],
        };
        const invitation = working.invitations.get(
          invitationIdentity(event.tenantId, event.invitationKey),
        );

        if (
          !invitation ||
          invitation.role !== event.toRole ||
          invitation.status !== event.toStatus ||
          invitation.version !== event.toVersion ||
          invitation.lastActorKind !== event.actorKind ||
          invitation.lastActorId !== event.actorId ||
          invitation.updatedAt !== event.occurredAt ||
          invitation.expiresAt !== event.expiresAt ||
          working.events.has(event.operationKey)
        ) {
          throw new Error("invitation event contract rejected");
        }

        working.events.set(event.operationKey, event);
        return queryResult([copyRecord(event)]);
      }

      if (sql === postgresTeamInvitationSql.insertDelivery) {
        const invitation = working.invitations.get(
          invitationIdentity(parameters[1], parameters[2]),
        );

        if (
          !invitation ||
          invitation.status !== "pending" ||
          invitation.version !== parameters[3] ||
          invitation.requestedAt !== parameters[4] ||
          working.deliveries.has(parameters[0])
        ) {
          throw new Error("invitation delivery contract rejected");
        }

        const delivery = {
          deliveryKey: parameters[0],
          tenantId: parameters[1],
          invitationKey: parameters[2],
          invitationVersion: parameters[3],
          status: "pending",
          attemptCount: 0,
          lastErrorCode: null,
          submittedAt: null,
          createdAt: parameters[4],
          updatedAt: parameters[4],
        };
        working.deliveries.set(delivery.deliveryKey, delivery);
        return queryResult([copyRecord(delivery)]);
      }

      if (sql === postgresTeamInvitationSql.cancelPendingDelivery) {
        const delivery = Array.from(working.deliveries.values()).find(
          (candidate) =>
            candidate.tenantId === parameters[0] &&
            candidate.invitationKey === parameters[1] &&
            candidate.invitationVersion === parameters[2] &&
            candidate.status === "pending",
        );

        if (!delivery) {
          return queryResult([]);
        }

        delivery.status = "cancelled";
        delivery.lastErrorCode = parameters[3];
        delivery.updatedAt = parameters[4];
        return queryResult([copyRecord(delivery)]);
      }

      throw new Error("unexpected PostgreSQL invitation query");
    };
  }

  const dependencies = {
    queries: {
      async query(sql, parameters) {
        if (sql !== postgresTeamInvitationSql.find) {
          throw new Error("unexpected PostgreSQL invitation read");
        }

        const invitation = findInvitation(
          state,
          parameters[0],
          parameters[1],
        );
        return queryResult(invitation ? [invitation] : []);
      },
    },
    transactions: {
      async transaction(options, execute) {
        transactionState.attempts += 1;
        transactionState.options.push(options);
        const working = {
          tenantIds: new Set(state.tenantIds),
          invitations: copyMap(state.invitations),
          events: copyMap(state.events),
          deliveries: copyMap(state.deliveries),
          acceptedInvitationKeys: new Set(state.acceptedInvitationKeys),
        };

        try {
          const result = await execute({
            query: createTransactionQuery(working),
          });
          state.invitations = working.invitations;
          state.events = working.events;
          state.deliveries = working.deliveries;
          state.acceptedInvitationKeys = working.acceptedInvitationKeys;
          transactionState.commits += 1;
          return result;
        } catch (error) {
          transactionState.rollbacks += 1;
          throw error;
        }
      },
    },
  };

  return {
    state,
    transactionState,
    repository: createPostgresTeamInvitationRepository(dependencies),
  };
}

function requestCommand(overrides = {}) {
  return {
    tenantId,
    email: "manager@example.com",
    role: "manager",
    expectedVersion: 0,
    actorExternalUserId,
    requestedAt,
    expiresAt,
    ...overrides,
  };
}

test("creates, replays, revokes, re-requests, and expires atomically", async () => {
  const fixture = createFixture();
  const created = await fixture.repository.request(requestCommand());

  assert.equal(created.outcome, "created");
  assert.equal(created.invitation?.version, 1);
  assert.equal(fixture.state.events.size, 1);
  assert.equal(fixture.state.deliveries.size, 1);

  const replayed = await fixture.repository.request(requestCommand());
  assert.equal(replayed.outcome, "unchanged");
  assert.equal(fixture.state.events.size, 1);
  assert.equal(fixture.state.deliveries.size, 1);

  const revoked = await fixture.repository.transition({
    tenantId,
    invitationKey: created.invitation.invitationKey,
    expectedVersion: 1,
    toStatus: "revoked",
    actorExternalUserId,
    occurredAt: "2026-08-17T09:00:00.000Z",
  });
  assert.equal(revoked.outcome, "updated");
  assert.equal(revoked.invitation.status, "revoked");
  assert.equal(revoked.invitation.version, 2);

  const secondRequestedAt = "2026-08-17T10:00:00.000Z";
  const secondExpiresAt = "2026-08-18T10:00:00.000Z";
  const reopened = await fixture.repository.request(
    requestCommand({
      expectedVersion: 2,
      role: "viewer",
      requestedAt: secondRequestedAt,
      expiresAt: secondExpiresAt,
    }),
  );
  assert.equal(reopened.outcome, "updated");
  assert.equal(reopened.invitation.status, "pending");
  assert.equal(reopened.invitation.version, 3);
  assert.equal(reopened.invitation.role, "viewer");

  const expired = await fixture.repository.transition({
    tenantId,
    invitationKey: created.invitation.invitationKey,
    expectedVersion: 3,
    toStatus: "expired",
    systemActorId: teamInvitationExpirationSystemActorId,
    occurredAt: secondExpiresAt,
  });
  assert.equal(expired.outcome, "updated");
  assert.equal(expired.invitation.status, "expired");
  assert.equal(expired.invitation.version, 4);
  assert.deepEqual(expired.invitation.lastActor, {
    kind: "system",
    id: teamInvitationExpirationSystemActorId,
  });
  assert.equal(fixture.transactionState.rollbacks, 0);
  assert.deepEqual(
    new Set(
      fixture.transactionState.options.map(
        (options) => options.isolationLevel,
      ),
    ),
    new Set(["read-committed"]),
  );
});

test("classifies missing, stale, accepted, and active-delivery state", async () => {
  const fixture = createFixture();
  const missing = await fixture.repository.transition({
    tenantId,
    invitationKey:
      "team_invitation_v1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    expectedVersion: 1,
    toStatus: "revoked",
    actorExternalUserId,
    occurredAt: "2026-08-17T09:00:00.000Z",
  });
  assert.equal(missing.outcome, "not-found");

  const created = await fixture.repository.request(requestCommand());
  const staleRequest = await fixture.repository.request(
    requestCommand({
      role: "viewer",
      requestedAt: "2026-08-17T09:00:00.000Z",
      expiresAt: "2026-08-18T09:00:00.000Z",
    }),
  );
  assert.equal(staleRequest.outcome, "conflict");

  fixture.state.acceptedInvitationKeys.add(
    created.invitation.invitationKey,
  );
  const accepted = await fixture.repository.request(
    requestCommand({ expectedVersion: 1 }),
  );
  assert.equal(accepted.outcome, "invalid-transition");

  fixture.state.acceptedInvitationKeys.clear();
  const delivery = Array.from(fixture.state.deliveries.values())[0];
  delivery.status = "sending";
  const activeDelivery = await fixture.repository.transition({
    tenantId,
    invitationKey: created.invitation.invitationKey,
    expectedVersion: 1,
    toStatus: "revoked",
    actorExternalUserId,
    occurredAt: "2026-08-17T09:00:00.000Z",
  });
  assert.equal(activeDelivery.outcome, "invalid-transition");
});

test("rolls back invitation state when immutable event persistence fails", async () => {
  const fixture = createFixture({ rejectEvents: true });

  await assert.rejects(
    fixture.repository.request(requestCommand()),
    /invitation event persistence rejected/,
  );
  assert.equal(fixture.state.invitations.size, 0);
  assert.equal(fixture.state.events.size, 0);
  assert.equal(fixture.state.deliveries.size, 0);
  assert.equal(fixture.transactionState.commits, 0);
  assert.equal(fixture.transactionState.rollbacks, 1);
});

test("rejects invalid dependencies and input before PostgreSQL access", async () => {
  assert.throws(
    () => createPostgresTeamInvitationRepository({}),
    /dependencies are invalid/,
  );

  const fixture = createFixture();
  await assert.rejects(
    fixture.repository.request(
      requestCommand({ expectedVersion: -1 }),
    ),
    /version is invalid/,
  );
  assert.equal(fixture.transactionState.attempts, 0);
});
