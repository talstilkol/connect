import assert from "node:assert/strict";
import test from "node:test";

import {
  requireStoredTeamInvitationActor,
  requireTeamInvitationActor,
  requireTeamInvitationActorKind,
  requireTeamInvitationSystemActorId,
} from "../server/team/teamInvitationActor.ts";
import {
  deriveTeamInvitationKey,
  deriveTeamInvitationOperationKey,
} from "../server/team/teamInvitationKey.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";

const systemActorId =
  "team-invitation-expiration-scheduler-v1";

test("parses explicit user and approved system invitation actors", () => {
  assert.deepEqual(
    requireTeamInvitationActor({
      actorExternalUserId:
        "manager-user",
    }),
    {
      kind: "user",
      id: "manager-user",
    },
  );
  assert.deepEqual(
    requireTeamInvitationActor({
      systemActorId,
    }),
    {
      kind: "system",
      id: systemActorId,
    },
  );
  assert.deepEqual(
    requireStoredTeamInvitationActor(
      "system",
      systemActorId,
    ),
    {
      kind: "system",
      id: systemActorId,
    },
  );
});

test("rejects absent, ambiguous, and unapproved invitation actors", () => {
  for (
    const input of [
      {},
      {
        actorExternalUserId:
          "manager-user",
        systemActorId,
      },
      {
        systemActorId:
          "unknown-scheduler",
      },
    ]
  ) {
    assert.throws(
      () =>
        requireTeamInvitationActor(
          input,
        ),
      /actor|system actor/,
    );
  }

  assert.throws(
    () =>
      requireTeamInvitationActorKind(
        "service",
      ),
    /actor kind/,
  );
  assert.throws(
    () =>
      requireTeamInvitationSystemActorId(
        "unknown-scheduler",
      ),
    /system actor ID/,
  );
  assert.throws(
    () =>
      requireStoredTeamInvitationActor(
        "system",
        "manager-user",
      ),
    /system actor ID/,
  );
});

test("preserves user operation identity and separates system operations", async () => {
  const invitationKey =
    await deriveTeamInvitationKey({
      tenantId: 7,
      email:
        "member@example.com",
    });
  const common = {
    operation: "expire",
    tenantId: 7,
    invitationKey,
    expectedVersion: 1,
    role: "agent",
    fromStatus: "pending",
    occurredAt:
      "2026-08-12T10:00:00.000Z",
    expiresAt:
      "2026-08-12T10:00:00.000Z",
  };
  const userKey =
    await deriveTeamInvitationOperationKey(
      {
        ...common,
        actorExternalUserId:
          "manager-user",
      },
    );
  const legacyDigest =
    await sha256Hex(
      new TextEncoder().encode(
        JSON.stringify({
          namespace:
            "team_invitation_operation_v1",
          operation:
            common.operation,
          tenantId:
            common.tenantId,
          invitationKey:
            common.invitationKey,
          expectedVersion:
            common.expectedVersion,
          role: common.role,
          fromStatus:
            common.fromStatus,
          actorExternalUserId:
            "manager-user",
          occurredAt:
            common.occurredAt,
          expiresAt:
            common.expiresAt,
        }),
      ),
    );
  const systemKey =
    await deriveTeamInvitationOperationKey(
      {
        ...common,
        systemActorId,
      },
    );

  assert.equal(
    userKey,
    `team_invitation_operation_v1_${legacyDigest}`,
  );
  assert.notEqual(
    systemKey,
    userKey,
  );
});
