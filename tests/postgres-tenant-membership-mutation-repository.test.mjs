import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresTenantMembershipMutationRepository,
  postgresTenantMembershipMutationSql,
} from "../server/platform/postgresTenantMembershipMutationRepository.ts";

const occurredAt = "2026-08-17T07:00:00.000Z";
const actorExternalUserId = "owner-user";

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

function copyMembership(membership) {
  return { ...membership };
}

function createFixture({ rejectEvents = false } = {}) {
  const state = {
    tenantIds: new Set([7, 8]),
    memberships: [
      {
        tenantId: 7,
        externalUserId: "owner-user",
        role: "owner",
        status: "active",
        version: 1,
      },
      {
        tenantId: 7,
        externalUserId: "manager-user",
        role: "manager",
        status: "active",
        version: 1,
      },
      {
        tenantId: 7,
        externalUserId: "agent-user",
        role: "agent",
        status: "active",
        version: 1,
      },
      {
        tenantId: 8,
        externalUserId: "foreign-owner",
        role: "owner",
        status: "active",
        version: 1,
      },
    ],
    events: new Map(),
  };
  const transactionState = {
    attempts: 0,
    commits: 0,
    rollbacks: 0,
    options: [],
    calls: [],
  };

  function listMemberships(source, tenantId) {
    return source.memberships
      .filter((membership) => membership.tenantId === tenantId)
      .map(copyMembership);
  }

  function eventIdentity(operationKey, targetExternalUserId) {
    return `${operationKey}:${targetExternalUserId}`;
  }

  function createTransactionQuery(working) {
    return async (sql, parameters) => {
      transactionState.calls.push({ sql, parameters });

      if (sql === postgresTenantMembershipMutationSql.lockTenant) {
        return queryResult(
          working.tenantIds.has(parameters[0])
            ? [{ tenantId: parameters[0] }]
            : [],
        );
      }

      if (sql === postgresTenantMembershipMutationSql.lockMember) {
        return queryResult(
          working.memberships
            .filter(
              (membership) =>
                membership.tenantId === parameters[0] &&
                membership.externalUserId === parameters[1],
            )
            .map(copyMembership),
        );
      }

      if (sql === postgresTenantMembershipMutationSql.lockOwnerPair) {
        return queryResult(
          working.memberships
            .filter(
              (membership) =>
                membership.tenantId === parameters[0] &&
                (membership.externalUserId === parameters[1] ||
                  membership.externalUserId === parameters[2]),
            )
            .sort((left, right) =>
              left.externalUserId.localeCompare(right.externalUserId),
            )
            .map(copyMembership),
        );
      }

      if (sql === postgresTenantMembershipMutationSql.findEvent) {
        const event = working.events.get(
          eventIdentity(parameters[0], parameters[1]),
        );

        return queryResult(event ? [{ ...event }] : []);
      }

      if (
        sql === postgresTenantMembershipMutationSql.changeRole ||
        sql === postgresTenantMembershipMutationSql.changeStatus
      ) {
        const membership = working.memberships.find(
          (candidate) =>
            candidate.tenantId === parameters[0] &&
            candidate.externalUserId === parameters[1] &&
            candidate.version === parameters[2] &&
            candidate.role === parameters[3] &&
            candidate.status === parameters[4],
        );

        if (!membership) {
          return queryResult([]);
        }

        if (sql === postgresTenantMembershipMutationSql.changeRole) {
          membership.role = parameters[5];
        } else {
          membership.status = parameters[5];
        }

        membership.version += 1;
        return queryResult([copyMembership(membership)]);
      }

      if (sql === postgresTenantMembershipMutationSql.insertEvent) {
        if (rejectEvents) {
          throw new Error("membership event persistence rejected");
        }

        const event = {
          eventKey: parameters[0],
          operationKey: parameters[1],
          tenantId: parameters[2],
          targetExternalUserId: parameters[3],
          actorExternalUserId: parameters[4],
          eventType: parameters[5],
          fromRole: parameters[6],
          toRole: parameters[7],
          fromStatus: parameters[8],
          toStatus: parameters[9],
          fromVersion: parameters[10],
          toVersion: parameters[10] + 1,
          occurredAt: parameters[11],
        };
        const membership = working.memberships.find(
          (candidate) =>
            candidate.tenantId === event.tenantId &&
            candidate.externalUserId === event.targetExternalUserId,
        );
        const key = eventIdentity(
          event.operationKey,
          event.targetExternalUserId,
        );

        if (
          !membership ||
          membership.role !== event.toRole ||
          membership.status !== event.toStatus ||
          membership.version !== event.toVersion ||
          working.events.has(key)
        ) {
          throw new Error("membership event contract rejected");
        }

        working.events.set(key, event);
        return queryResult([{ ...event }]);
      }

      throw new Error("unexpected PostgreSQL mutation query");
    };
  }

  const dependencies = {
    queries: {
      async query(sql, parameters) {
        if (sql !== postgresTenantMembershipMutationSql.listByTenantId) {
          throw new Error("unexpected PostgreSQL read query");
        }

        return queryResult(listMemberships(state, parameters[0]));
      },
    },
    transactions: {
      async transaction(options, execute) {
        transactionState.attempts += 1;
        transactionState.options.push(options);
        const working = {
          tenantIds: new Set(state.tenantIds),
          memberships: state.memberships.map(copyMembership),
          events: new Map(
            Array.from(state.events, ([key, event]) => [
              key,
              { ...event },
            ]),
          ),
        };

        try {
          const result = await execute({
            query: createTransactionQuery(working),
          });

          state.memberships = working.memberships;
          state.events = working.events;
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
    repository:
      createPostgresTenantMembershipMutationRepository(dependencies),
  };
}

test("writes role and status transitions with exact immutable event intents", async () => {
  const fixture = createFixture();
  const changed = await fixture.repository.changeRole({
    tenantId: 7,
    targetExternalUserId: "agent-user",
    expectedVersion: 1,
    toRole: "viewer",
    actorExternalUserId,
    occurredAt,
  });
  const suspended = await fixture.repository.changeStatus({
    tenantId: 7,
    targetExternalUserId: "agent-user",
    expectedVersion: 2,
    toStatus: "suspended",
    actorExternalUserId,
    occurredAt: "2026-08-17T07:01:00.000Z",
  });

  assert.deepEqual(changed, {
    outcome: "updated",
    membership: {
      tenantId: 7,
      externalUserId: "agent-user",
      role: "viewer",
      status: "active",
      version: 2,
    },
  });
  assert.equal(suspended.outcome, "updated");
  assert.equal(suspended.membership.status, "suspended");
  assert.equal(suspended.membership.version, 3);
  assert.deepEqual(
    Array.from(fixture.state.events.values()).map(
      ({ eventType, fromVersion, toVersion }) => ({
        eventType,
        fromVersion,
        toVersion,
      }),
    ),
    [
      {
        eventType: "role-changed",
        fromVersion: 1,
        toVersion: 2,
      },
      {
        eventType: "suspended",
        fromVersion: 2,
        toVersion: 3,
      },
    ],
  );
  assert.deepEqual(fixture.transactionState.options, [
    { isolationLevel: "read-committed" },
    { isolationLevel: "read-committed" },
  ]);
});

test("returns unchanged for an exact retry without duplicating its event", async () => {
  const fixture = createFixture();
  const command = {
    tenantId: 7,
    targetExternalUserId: "agent-user",
    expectedVersion: 1,
    toRole: "viewer",
    actorExternalUserId,
    occurredAt,
  };

  assert.equal(
    (await fixture.repository.changeRole(command)).outcome,
    "updated",
  );
  assert.equal(
    (
      await fixture.repository.changeRole({
        ...command,
        occurredAt: "2026-08-17T07:02:00.000Z",
      })
    ).outcome,
    "unchanged",
  );
  assert.equal(fixture.state.events.size, 1);
  assert.equal(fixture.transactionState.commits, 2);
});

test("transfers ownership atomically and makes the complete retry idempotent", async () => {
  const fixture = createFixture();
  const command = {
    tenantId: 7,
    formerOwnerExternalUserId: "owner-user",
    formerOwnerExpectedVersion: 1,
    newOwnerExternalUserId: "manager-user",
    newOwnerExpectedVersion: 1,
    formerOwnerRole: "manager",
    actorExternalUserId,
    occurredAt,
  };
  const transferred = await fixture.repository.transferOwner(command);
  const repeated = await fixture.repository.transferOwner({
    ...command,
    occurredAt: "2026-08-17T07:03:00.000Z",
  });

  assert.equal(transferred.outcome, "updated");
  assert.equal(repeated.outcome, "unchanged");
  assert.deepEqual(
    {
      formerRole: repeated.formerOwner.role,
      formerVersion: repeated.formerOwner.version,
      newRole: repeated.newOwner.role,
      newVersion: repeated.newOwner.version,
    },
    {
      formerRole: "manager",
      formerVersion: 2,
      newRole: "owner",
      newVersion: 2,
    },
  );
  assert.equal(fixture.state.events.size, 2);
  assert.equal(
    fixture.state.memberships.filter(
      (membership) =>
        membership.tenantId === 7 &&
        membership.role === "owner" &&
        membership.status === "active",
    ).length,
    1,
  );
});

test("distinguishes stale, owner, and cross-tenant mutations without writes", async () => {
  const fixture = createFixture();
  const stale = await fixture.repository.changeRole({
    tenantId: 7,
    targetExternalUserId: "agent-user",
    expectedVersion: 2,
    toRole: "viewer",
    actorExternalUserId,
    occurredAt,
  });
  const ownerPromotion = await fixture.repository.changeRole({
    tenantId: 7,
    targetExternalUserId: "agent-user",
    expectedVersion: 1,
    toRole: "owner",
    actorExternalUserId,
    occurredAt,
  });
  const foreignMember = await fixture.repository.changeRole({
    tenantId: 7,
    targetExternalUserId: "foreign-owner",
    expectedVersion: 1,
    toRole: "viewer",
    actorExternalUserId,
    occurredAt,
  });

  assert.equal(stale.outcome, "conflict");
  assert.equal(ownerPromotion.outcome, "invalid-transition");
  assert.equal(foreignMember.outcome, "not-found");
  assert.equal(fixture.state.events.size, 0);
});

test("rolls back the membership update when event persistence fails", async () => {
  const fixture = createFixture({ rejectEvents: true });

  await assert.rejects(
    fixture.repository.changeRole({
      tenantId: 7,
      targetExternalUserId: "agent-user",
      expectedVersion: 1,
      toRole: "viewer",
      actorExternalUserId,
      occurredAt,
    }),
    /event persistence rejected/,
  );

  assert.deepEqual(
    fixture.state.memberships.find(
      (membership) => membership.externalUserId === "agent-user",
    ),
    {
      tenantId: 7,
      externalUserId: "agent-user",
      role: "agent",
      status: "active",
      version: 1,
    },
  );
  assert.equal(fixture.state.events.size, 0);
  assert.equal(fixture.transactionState.commits, 0);
  assert.equal(fixture.transactionState.rollbacks, 1);
});

test("bounds tenant reads and freezes PostgreSQL locking SQL", async () => {
  const fixture = createFixture();
  const memberships = await fixture.repository.listByTenantId(7);

  assert.equal(memberships.length, 3);
  assert.equal(Object.isFrozen(memberships), true);
  assert.match(
    postgresTenantMembershipMutationSql.lockTenant,
    /WHERE id = \$1[\s\S]*FOR UPDATE/,
  );
  assert.match(
    postgresTenantMembershipMutationSql.lockOwnerPair,
    /ORDER BY external_user_id ASC[\s\S]*FOR UPDATE/,
  );
  assert.match(
    postgresTenantMembershipMutationSql.changeRole,
    /version = version \+ 1[\s\S]*version = \$3/,
  );
  assert.match(
    postgresTenantMembershipMutationSql.insertEvent,
    /\$11, \$11 \+ 1, \$12::timestamptz/,
  );
  assert.doesNotMatch(
    Object.values(postgresTenantMembershipMutationSql).join("\n"),
    /\?\d?/,
  );
});

test("rejects invalid dependencies before PostgreSQL access", () => {
  assert.throws(
    () =>
      createPostgresTenantMembershipMutationRepository({
        queries: {},
        transactions: {},
      }),
    /dependencies are invalid/,
  );
});
