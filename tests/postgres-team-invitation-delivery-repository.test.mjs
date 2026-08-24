import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresTeamInvitationDeliveryRepository,
  postgresTeamInvitationDeliverySql,
} from "../server/platform/postgresTeamInvitationDeliveryRepository.ts";
import {
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationKey,
} from "../server/team/teamInvitationKey.ts";

const tenantId = 7;
const requestedAt = "2026-08-17T08:00:00.000Z";
const expiresAt = "2026-08-18T08:00:00.000Z";

function queryResult(rows) {
  return { rows, rowCount: rows.length };
}

async function createFixture({
  deliveryStatus = "pending",
  invitationStatus = "pending",
  invitationExpiresAt = expiresAt,
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
  const invitation = {
    tenantId,
    invitationKey,
    normalizedEmail: "manager@example.com",
    role: "manager",
    invitedByExternalUserId: "owner-user",
    requestedAt,
    expiresAt: invitationExpiresAt,
    version: 1,
    status: invitationStatus,
  };
  const delivery = {
    deliveryKey,
    tenantId,
    invitationKey,
    invitationVersion: 1,
    status: deliveryStatus,
    attemptCount: deliveryStatus === "pending" ? 0 : 1,
    lastErrorCode:
      deliveryStatus === "ambiguous" ? "PROVIDER_OUTCOME_UNKNOWN" : null,
    submittedAt: null,
    createdAt: requestedAt,
    updatedAt: requestedAt,
  };
  const calls = [];
  let deferral = null;

  const repository = createPostgresTeamInvitationDeliveryRepository({
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });

        if (sql === postgresTeamInvitationDeliverySql.find) {
          return queryResult(
            delivery.tenantId === parameters[0] &&
              delivery.deliveryKey === parameters[1]
              ? [{ ...delivery }]
              : [],
          );
        }

        if (sql === postgresTeamInvitationDeliverySql.claim) {
          const occurredAt = parameters[2];
          const eligible =
            invitation.tenantId === parameters[0] &&
            delivery.deliveryKey === parameters[1] &&
            delivery.status === "pending" &&
            invitation.invitationKey === delivery.invitationKey &&
            invitation.version === delivery.invitationVersion &&
            invitation.status === "pending" &&
            invitation.expiresAt > occurredAt &&
            !(
              deferral !== null &&
              deferral.retryAfterAt > occurredAt
            );

          if (!eligible) {
            return queryResult([]);
          }

          delivery.status = "sending";
          delivery.attemptCount = 1;
          delivery.updatedAt = occurredAt;
          return queryResult([{ ...delivery }]);
        }

        if (
          sql === postgresTeamInvitationDeliverySql.findActiveDeferral
        ) {
          return queryResult(
            deferral !== null &&
              deferral.retryAfterAt > parameters[2]
              ? [{ ...deferral }]
              : [],
          );
        }

        if (sql === postgresTeamInvitationDeliverySql.defer) {
          if (
            delivery.tenantId !== parameters[0] ||
            delivery.deliveryKey !== parameters[1] ||
            delivery.status !== "sending"
          ) {
            return queryResult([]);
          }

          deferral = {
            retryAfterAt: parameters[3],
            deferredAt: parameters[2],
          };
          delivery.status = "pending";
          delivery.attemptCount = 0;
          delivery.updatedAt = parameters[2];
          return queryResult([{ ...deferral }]);
        }

        if (sql === postgresTeamInvitationDeliverySql.cancelObsolete) {
          const occurredAt = parameters[2];
          const eligible =
            invitation.status === "pending" &&
            invitation.version === delivery.invitationVersion &&
            invitation.expiresAt > occurredAt;

          if (delivery.status !== "pending" || eligible) {
            return queryResult([]);
          }

          delivery.status = "cancelled";
          delivery.lastErrorCode = "INVITATION_NOT_DELIVERABLE";
          delivery.updatedAt = occurredAt;
          return queryResult([{ ...delivery }]);
        }

        if (sql === postgresTeamInvitationDeliverySql.findPreparedInvitation) {
          const matches =
            invitation.tenantId === parameters[0] &&
            invitation.invitationKey === parameters[1] &&
            invitation.version === parameters[2] &&
            invitation.status === "pending";
          return queryResult(
            matches
              ? [
                  {
                    normalizedEmail: invitation.normalizedEmail,
                    role: invitation.role,
                    invitedByExternalUserId:
                      invitation.invitedByExternalUserId,
                    requestedAt: invitation.requestedAt,
                    expiresAt: invitation.expiresAt,
                  },
                ]
              : [],
          );
        }

        if (
          sql === postgresTeamInvitationDeliverySql.settle ||
          sql === postgresTeamInvitationDeliverySql.reconcile
        ) {
          const expectedStatus =
            sql === postgresTeamInvitationDeliverySql.settle
              ? "sending"
              : "ambiguous";

          if (
            delivery.tenantId !== parameters[0] ||
            delivery.deliveryKey !== parameters[1] ||
            delivery.status !== expectedStatus
          ) {
            return queryResult([]);
          }

          delivery.status = parameters[2];
          delivery.lastErrorCode = parameters[3];
          delivery.submittedAt = parameters[4];
          delivery.updatedAt = parameters[5];
          return queryResult([{ ...delivery }]);
        }

        throw new Error("unexpected PostgreSQL invitation delivery query");
      },
    },
  });

  return { repository, delivery, invitation, deliveryKey, calls };
}

test("claims one prepared delivery and settles provider acceptance once", async () => {
  const fixture = await createFixture();
  const claimed = await fixture.repository.claim(
    tenantId,
    fixture.deliveryKey,
    "2026-08-17T08:01:00.000Z",
  );

  assert.equal(claimed.outcome, "claimed");
  assert.equal(claimed.prepared.delivery.status, "sending");
  assert.equal(claimed.prepared.normalizedEmail, "manager@example.com");
  assert.equal(claimed.prepared.role, "manager");

  const submitted = await fixture.repository.markSubmitted(
    tenantId,
    fixture.deliveryKey,
    "2026-08-17T08:02:00.000Z",
  );
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.submittedAt, "2026-08-17T08:02:00.000Z");

  const replayed = await fixture.repository.markSubmitted(
    tenantId,
    fixture.deliveryKey,
    "2026-08-17T08:02:00.000Z",
  );
  assert.equal(replayed.status, "submitted");

  const duplicate = await fixture.repository.claim(
    tenantId,
    fixture.deliveryKey,
    "2026-08-17T08:03:00.000Z",
  );
  assert.equal(duplicate.outcome, "duplicate");
});

test("records an ambiguous result and reconciles without a second claim", async () => {
  const fixture = await createFixture();
  await fixture.repository.claim(
    tenantId,
    fixture.deliveryKey,
    "2026-08-17T08:01:00.000Z",
  );
  const ambiguous = await fixture.repository.markAmbiguous(
    tenantId,
    fixture.deliveryKey,
    "PROVIDER_OUTCOME_UNKNOWN",
    "2026-08-17T08:02:00.000Z",
  );
  assert.equal(ambiguous.status, "ambiguous");

  const reconciled = await fixture.repository.reconcileBlocked(
    tenantId,
    fixture.deliveryKey,
    "PROVIDER_CONFIRMED_NOT_SUBMITTED",
    "2026-08-17T08:03:00.000Z",
  );
  assert.equal(reconciled.status, "blocked");
  assert.equal(
    reconciled.lastErrorCode,
    "PROVIDER_CONFIRMED_NOT_SUBMITTED",
  );
});

test("persists a provider deferral, returns the remaining delay, and reclaims only when due", async () => {
  const fixture = await createFixture();
  assert.equal(
    (
      await fixture.repository.claim(
        tenantId,
        fixture.deliveryKey,
        "2026-08-17T08:01:00.000Z",
      )
    ).outcome,
    "claimed",
  );

  const released =
    await fixture.repository.defer(
      tenantId,
      fixture.deliveryKey,
      "2026-08-17T08:02:00.000Z",
      "2026-08-17T09:02:00.000Z",
    );
  assert.equal(released.status, "pending");
  assert.equal(released.attemptCount, 0);

  assert.deepEqual(
    await fixture.repository.claim(
      tenantId,
      fixture.deliveryKey,
      "2026-08-17T08:03:00.000Z",
    ),
    {
      outcome: "deferred",
      retryAfterSeconds: 3_540,
      delivery: released,
    },
  );
  assert.equal(
    (
      await fixture.repository.claim(
        tenantId,
        fixture.deliveryKey,
        "2026-08-17T09:02:00.000Z",
      )
    ).outcome,
    "claimed",
  );
});

test("cancels a pending delivery whose invitation is no longer eligible", async () => {
  const fixture = await createFixture({ invitationStatus: "revoked" });
  const cancelled = await fixture.repository.claim(
    tenantId,
    fixture.deliveryKey,
    "2026-08-17T08:01:00.000Z",
  );

  assert.equal(cancelled.outcome, "cancelled");
  assert.equal(cancelled.delivery.status, "cancelled");
  assert.equal(
    cancelled.delivery.lastErrorCode,
    "INVITATION_NOT_DELIVERABLE",
  );
});

test("classifies missing and uncertain state and rejects invalid dependencies", async () => {
  const uncertainFixture = await createFixture({
    deliveryStatus: "sending",
  });
  const uncertain = await uncertainFixture.repository.claim(
    tenantId,
    uncertainFixture.deliveryKey,
    "2026-08-17T08:01:00.000Z",
  );
  assert.equal(uncertain.outcome, "uncertain");

  const missing = await uncertainFixture.repository.find(
    8,
    uncertainFixture.deliveryKey,
  );
  assert.equal(missing, null);

  assert.throws(
    () => createPostgresTeamInvitationDeliveryRepository({}),
    /dependencies are invalid/,
  );
});
