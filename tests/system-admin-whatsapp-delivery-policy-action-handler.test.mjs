import assert from "node:assert/strict";
import test from "node:test";

import {
  SystemAdminSessionError,
} from "../server/auth/systemAdminSession.ts";
import {
  createSystemAdminWhatsappDeliveryPolicyActionHandler,
} from "../server/campaigns/systemAdminWhatsappDeliveryPolicyActionHandler.ts";
import {
  SystemAdminWhatsappDeliveryPolicyError,
  SystemAdminWhatsappDeliveryPolicyInputError,
} from "../server/campaigns/systemAdminWhatsappDeliveryPolicyService.ts";

const record = {
  eventKey:
    `whatsapp_delivery_policy_event_v1_${"a".repeat(64)}`,
  tenantId: 7,
  connectionVersion: 3,
  policyVersion: 1,
  deliveryState: "enabled",
  portfolioCapacity: {
    kind: "bounded",
    maximumUniqueRecipients: 250,
  },
  reservationDurationSeconds: 300,
  metaGraphApiVersion: "v21.0",
  evidenceDigest: "b".repeat(64),
  evidenceCheckedAt:
    "2026-08-16T10:00:00.000Z",
  evidenceExpiresAt:
    "2026-08-16T11:00:00.000Z",
  actorExternalUserId:
    "system-admin-external-id",
  recordedAt:
    "2026-08-16T10:01:00.000Z",
};

test("requires configured system-admin context before policy mutation", async () => {
  let contextCalls = 0;
  const handler =
    createSystemAdminWhatsappDeliveryPolicyActionHandler(
      {
        applicationConfigured: () =>
          false,
        async createContext() {
          contextCalls += 1;
          throw new Error(
            "must not create context",
          );
        },
      },
    );

  assert.deepEqual(
    await handler.approve({}),
    { status: "configuration-required" },
  );
  assert.equal(contextCalls, 0);
});

test("maps authentication failures without reaching the service", async () => {
  for (const [code, status] of [
    [
      "AUTHENTICATION_REQUIRED",
      "unauthenticated",
    ],
    [
      "SYSTEM_ADMIN_REQUIRED",
      "permission-denied",
    ],
  ]) {
    const handler =
      createSystemAdminWhatsappDeliveryPolicyActionHandler(
        {
          applicationConfigured: () =>
            true,
          async createContext() {
            throw new SystemAdminSessionError(
              code,
            );
          },
        },
      );

    assert.deepEqual(
      await handler.activateKillSwitch(
        {},
      ),
      { status },
    );
  }
});

test("returns a bounded view without the audit actor", async () => {
  const handler =
    createSystemAdminWhatsappDeliveryPolicyActionHandler(
      {
        applicationConfigured: () => true,
        async createContext() {
          return {
            session: {
              externalUserId:
                "system-admin-external-id",
            },
            service: {
              async approve() {
                return {
                  outcome: "created",
                  record,
                };
              },
              async activateKillSwitch() {
                return {
                  outcome: "updated",
                  record: {
                    ...record,
                    deliveryState:
                      "disabled",
                  },
                };
              },
            },
          };
        },
      },
    );
  const result = await handler.approve(
    {},
  );

  assert.equal(result.status, "saved");
  assert.equal(result.outcome, "created");
  assert.equal(
    Object.hasOwn(
      result.record,
      "actorExternalUserId",
    ),
    false,
  );
});

test("maps bounded input, state, conflict, and persistence errors", async () => {
  const scenarios = [
    [
      new SystemAdminWhatsappDeliveryPolicyInputError(),
      "invalid-input",
    ],
    [
      new SystemAdminWhatsappDeliveryPolicyError(
        "NOT_FOUND",
      ),
      "not-found",
    ],
    [
      new SystemAdminWhatsappDeliveryPolicyError(
        "CONNECTION_NOT_READY",
      ),
      "connection-not-ready",
    ],
    [
      new SystemAdminWhatsappDeliveryPolicyError(
        "CONFLICT",
      ),
      "conflict",
    ],
    [
      new SystemAdminWhatsappDeliveryPolicyError(
        "PERSISTENCE_FAILED",
      ),
      "server-error",
    ],
  ];

  for (const [error, status] of scenarios) {
    const handler =
      createSystemAdminWhatsappDeliveryPolicyActionHandler(
        {
          applicationConfigured: () =>
            true,
          async createContext() {
            return {
              session: {
                externalUserId:
                  "system-admin-external-id",
              },
              service: {
                async approve() {
                  throw error;
                },
                async activateKillSwitch() {
                  throw error;
                },
              },
            };
          },
        },
      );

    assert.deepEqual(
      await handler.approve({}),
      { status },
    );
  }
});
