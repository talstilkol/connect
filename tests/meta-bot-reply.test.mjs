import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaBotReplyAdapter,
  MetaBotReplyContractError,
} from "../server/bot/metaBotReplyAdapter.ts";
import {
  createMetaBotReplyProcessor as createMetaBotReplyProcessorBase,
} from "../server/bot/metaBotReplyProcessor.ts";
import {
  createMetaBotReplyRuntime,
} from "../server/bot/metaBotReplyRuntime.ts";
import {
  MetaCredentialVaultError,
} from "../server/meta/metaCredentialVault.ts";
import {
  MetaGraphError,
} from "../server/meta/metaGraphTransport.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";
import {
  createProviderRequestTelemetryScope,
} from "../server/operations/providerRequestTelemetry.ts";

const tenantId = 7;
const deliveryKey =
  `bot_reply_delivery_v1_${"a".repeat(64)}`;
const conversationKey =
  `conversation_v1_${"b".repeat(64)}`;
const inboundMessageKey =
  `message_v1_${"c".repeat(64)}`;
const botFlowKey =
  `bot_flow_v1_${"d".repeat(64)}`;
const botFlowVersionKey =
  `bot_flow_version_v1_${"e".repeat(64)}`;
const firstOptionKey =
  `bot_option_v1_${"f".repeat(64)}`;
const secondOptionKey =
  `bot_option_v1_${"1".repeat(64)}`;
const thirdOptionKey =
  `bot_option_v1_${"2".repeat(64)}`;
const fourthOptionKey =
  `bot_option_v1_${"3".repeat(64)}`;
const accessToken = toSensitiveMetaAccessToken(
  "bot-reply-access-token",
);
const providerMessageId = "wamid.bot-reply-provider-17";
const reservationKey =
  `whatsapp_rate_reservation_v1_${"9".repeat(64)}`;
const providerRequestKey =
  `bot_reply_provider_request_v1_${"8".repeat(64)}`;

function providerRequests(overrides = {}) {
  return {
    async claim(input) {
      if (overrides.claim) return overrides.claim(input);
      return { outcome: "created", requestKey: providerRequestKey };
    },
  };
}

function createMetaBotReplyProcessor(dependencies) {
  return createMetaBotReplyProcessorBase({
    ...dependencies,
    providerRequests:
      dependencies.providerRequests ?? providerRequests(),
  });
}

function textReply() {
  return {
    kind: "text",
    text: "קיבלנו את פנייתך.",
  };
}

function buttonsReply(overrides = {}) {
  return {
    kind: "buttons",
    text: "בחרו מחלקה",
    options: [
      {
        optionKey: firstOptionKey,
        label: "מכירות",
      },
      {
        optionKey: secondOptionKey,
        label: "שירות",
      },
    ],
    ...overrides,
  };
}

function delivery(overrides = {}) {
  return {
    deliveryKey,
    tenantId,
    conversationKey,
    inboundMessageKey,
    botFlowKey,
    botFlowVersionKey,
    replyIndex: 1,
    senderPhoneNumberId: "300003",
    recipientPhoneNumber: "+972501234567",
    reply: textReply(),
    status: "sending",
    attemptCount: 1,
    claimVersion: 1,
    nextAttemptAt: null,
    deferredAt: null,
    lastDeferralReasonCode: null,
    providerMessageId: null,
    lastErrorCode: null,
    acceptedAt: null,
    createdAt: "2026-08-21T10:00:00.000Z",
    updatedAt: "2026-08-21T10:00:00.000Z",
    ...overrides,
  };
}

function prepared(overrides = {}) {
  return {
    phoneNumberId: "300003",
    serviceWindowOpenedAt:
      "2026-08-21T09:00:00.000Z",
    serviceWindowExpiresAt:
      "2026-08-22T09:00:00.000Z",
    attemptedAt:
      "2026-08-21T10:00:00.000Z",
    delivery: delivery(),
    ...overrides,
  };
}

function connection(overrides = {}) {
  return {
    tenantId,
    businessPortfolioId: "100001",
    wabaId: "200002",
    phoneNumberId: "300003",
    status: "connected",
    webhookSubscribedAt: "2026-08-21T09:00:00.000Z",
    connectedAt: "2026-08-21T09:00:00.000Z",
    version: 2,
    createdAt: "2026-08-21T09:00:00.000Z",
    updatedAt: "2026-08-21T09:00:00.000Z",
    ...overrides,
  };
}

function senderInput(overrides = {}) {
  return {
    phoneNumberId: "300003",
    recipientPhoneNumber: "+972501234567",
    deliveryKey,
    accessToken,
    reply: textReply(),
    ...overrides,
  };
}

function credentialVault(operationOverride) {
  return {
    async storeAccessToken() {
      throw new Error("must-not-run");
    },
    async withAccessToken(requestedTenantId, operation) {
      assert.equal(requestedTenantId, tenantId);

      if (operationOverride) {
        return operationOverride(operation);
      }

      return operation(accessToken);
    },
  };
}

function admission(overrides = {}) {
  return {
    isConfigured() {
      return overrides.configured !== false;
    },
    async reserve(input) {
      if (overrides.reserve) {
        return overrides.reserve(input);
      }

      return {
        outcome: "reserved",
        reservationKey,
      };
    },
    async settleBeforeSubmit(key, settledAt) {
      if (overrides.settleBeforeSubmit) {
        return overrides.settleBeforeSubmit(
          key,
          settledAt,
        );
      }
    },
    async settleProviderFailure(key, settledAt) {
      if (overrides.settleProviderFailure) {
        return overrides.settleProviderFailure(
          key,
          settledAt,
        );
      }
    },
    async deferProviderRejection(
      key,
      scope,
      providerErrorCode,
      retryAfterSeconds,
      observedAt,
    ) {
      if (overrides.deferProviderRejection) {
        return overrides.deferProviderRejection(
          key,
          scope,
          providerErrorCode,
          retryAfterSeconds,
          observedAt,
        );
      }
    },
  };
}

test("builds one official Meta text reply and returns only its wamid", async () => {
  const requests = [];
  const adapter = createMetaBotReplyAdapter({
    async requestJson(request) {
      requests.push(request);
      return {
        messaging_product: "whatsapp",
        contacts: [{
          input: "972501234567",
          wa_id: "972501234567",
        }],
        messages: [{ id: providerMessageId }],
      };
    },
  });

  assert.deepEqual(
    await adapter.send(senderInput()),
    { providerMessageId },
  );
  assert.deepEqual(requests, [{
    method: "POST",
    pathSegments: ["300003", "messages"],
    accessToken,
    jsonBody: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      type: "text",
      text: {
        preview_url: false,
        body: "קיבלנו את פנייתך.",
      },
      to: "972501234567",
    },
  }]);
});

test("builds bounded interactive reply buttons with stable domain keys", async () => {
  let request;
  const adapter = createMetaBotReplyAdapter({
    async requestJson(value) {
      request = value;
      return {
        messaging_product: "whatsapp",
        messages: [{ id: providerMessageId }],
      };
    },
  });

  await adapter.send(senderInput({
    reply: buttonsReply(),
  }));

  assert.deepEqual(request.jsonBody, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: "בחרו מחלקה" },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: firstOptionKey,
              title: "מכירות",
            },
          },
          {
            type: "reply",
            reply: {
              id: secondOptionKey,
              title: "שירות",
            },
          },
        ],
      },
    },
    to: "972501234567",
  });
});

test("rejects unsupported button count, title length, duplicate title, and identity before transport", async () => {
  let calls = 0;
  const adapter = createMetaBotReplyAdapter({
    async requestJson() {
      calls += 1;
      return {
        messaging_product: "whatsapp",
        messages: [{ id: providerMessageId }],
      };
    },
  });
  const invalidInputs = [
    senderInput({
      reply: buttonsReply({
        options: [
          ...buttonsReply().options,
          { optionKey: thirdOptionKey, label: "תמיכה" },
          { optionKey: fourthOptionKey, label: "הנהלה" },
        ],
      }),
    }),
    senderInput({
      reply: buttonsReply({
        options: [{
          optionKey: firstOptionKey,
          label: "א".repeat(21),
        }],
      }),
    }),
    senderInput({
      reply: buttonsReply({
        options: [
          { optionKey: firstOptionKey, label: "שירות" },
          { optionKey: secondOptionKey, label: "שירות" },
        ],
      }),
    }),
    senderInput({
      deliveryKey:
        `campaign_delivery_v1_${"a".repeat(64)}`,
    }),
    senderInput({
      reply: {
        ...textReply(),
        privateField: "must-not-pass",
      },
    }),
  ];

  for (const input of invalidInputs) {
    await assert.rejects(
      adapter.send(input),
      (error) =>
        error instanceof MetaBotReplyContractError &&
        error.code === "INVALID_REPLY_REQUEST",
    );
  }
  assert.equal(calls, 0);
});

test("treats a malformed acceptance as an unknown provider outcome", async () => {
  const adapter = createMetaBotReplyAdapter({
    async requestJson() {
      return {
        messaging_product: "whatsapp",
        messages: [{ id: "private-id" }],
      };
    },
  });

  await assert.rejects(
    adapter.send(senderInput()),
    (error) =>
      error instanceof MetaBotReplyContractError &&
      error.code === "INVALID_REPLY_RESPONSE",
  );
});

test("records bounded bot provider telemetry without message or tenant data", async () => {
  const timestamps = [
    new Date("2026-08-21T10:00:00.000Z"),
    new Date("2026-08-21T10:00:00.025Z"),
  ];
  const scope = createProviderRequestTelemetryScope();
  let measurements;
  const adapter = createMetaBotReplyAdapter(
    {
      async requestJson() {
        return {
          messaging_product: "whatsapp",
          messages: [{ id: providerMessageId }],
        };
      },
    },
    {
      scope,
      clock: {
        now() {
          const value = timestamps.shift();
          if (!value) throw new Error("test clock exhausted");
          return value;
        },
      },
    },
  );

  await scope.run(async () => {
    await adapter.send(senderInput());
    measurements = scope.snapshot();
  });

  assert.deepEqual(measurements, [{
    provider: "meta",
    operation: "bot-reply.send",
    outcome: "completed",
    startedAt: "2026-08-21T10:00:00.000Z",
    completedAt: "2026-08-21T10:00:00.025Z",
    durationMilliseconds: 25,
  }]);
  assert.doesNotMatch(
    JSON.stringify(measurements),
    /tenant|phone|deliveryKey|message|token|payload|content/i,
  );
});

test("resolves the current connected phone and tenant credential before sending", async () => {
  const sent = [];
  const providerClaims = [];
  const processor = createMetaBotReplyProcessor({
    metaConnections: {
      async findConnectionByTenantId(requestedTenantId) {
        assert.equal(requestedTenantId, tenantId);
        return connection();
      },
    },
    credentialVault: credentialVault(),
    admission: admission(),
    providerRequests: providerRequests({
      async claim(input) {
        providerClaims.push(structuredClone(input));
        return { outcome: "created", requestKey: providerRequestKey };
      },
    }),
    sender: {
      async send(input) {
        sent.push(input);
        return { providerMessageId };
      },
    },
  });

  assert.equal(processor.isConfigured(), true);
  assert.deepEqual(await processor.process(prepared()), {
    outcome: "accepted",
    providerMessageId,
    reservationKey,
  });
  assert.deepEqual(sent, [{
    phoneNumberId: "300003",
    recipientPhoneNumber: "+972501234567",
    deliveryKey,
    accessToken,
    reply: textReply(),
  }]);
  assert.deepEqual(providerClaims, [{
    tenantId,
    deliveryKey,
    expectedClaimVersion: 1,
    reservationKey,
    requestedAt: prepared().attemptedAt,
  }]);
});

test("does not submit when the exact provider request was already claimed", async () => {
  let sends = 0;
  const processor = createMetaBotReplyProcessor({
    metaConnections: {
      async findConnectionByTenantId() {
        return connection();
      },
    },
    credentialVault: credentialVault(),
    admission: admission(),
    providerRequests: providerRequests({
      async claim() {
        return { outcome: "duplicate", requestKey: providerRequestKey };
      },
    }),
    sender: {
      async send() {
        sends += 1;
        return { providerMessageId };
      },
    },
  });

  await assert.rejects(
    processor.process(prepared()),
    /provider request is already claimed/,
  );
  assert.equal(sends, 0);
});

test("defers admission and scoped provider limits without double settlement", async () => {
  const settlements = [];
  const providerCooldowns = [];
  let sends = 0;
  const deferred = createMetaBotReplyProcessor({
    metaConnections: {
      async findConnectionByTenantId() {
        return connection();
      },
    },
    credentialVault: credentialVault(),
    admission: admission({
      async reserve(input) {
        assert.equal(input.deliveryAttemptNumber, 1);
        assert.equal(input.businessPortfolioId, "100001");
        return {
          outcome: "deferred",
          errorCode: "WHATSAPP_PAIR_LIMITED",
          retryAt: "2026-08-21T10:00:06.000Z",
        };
      },
    }),
    sender: {
      async send() {
        sends += 1;
        throw new Error("must-not-run");
      },
    },
  });
  const providerDeferred = createMetaBotReplyProcessor({
    metaConnections: {
      async findConnectionByTenantId() {
        return connection();
      },
    },
    credentialVault: credentialVault(),
    admission: admission({
      async deferProviderRejection(...input) {
        providerCooldowns.push(input);
      },
    }),
    sender: {
      async send() {
        throw new MetaGraphError(
          "API_ERROR",
          "private rejection",
          { httpStatus: 400, graphCode: 131056 },
        );
      },
    },
  });
  const locallyRejected = createMetaBotReplyProcessor({
    metaConnections: {
      async findConnectionByTenantId() {
        return connection();
      },
    },
    credentialVault: credentialVault(),
    admission: admission({
      async settleBeforeSubmit(key, settledAt) {
        settlements.push(["local", key, settledAt]);
      },
    }),
    sender: {
      async send() {
        throw new MetaBotReplyContractError(
          "INVALID_REPLY_REQUEST",
        );
      },
    },
  });

  assert.deepEqual(await deferred.process(prepared()), {
    outcome: "deferred",
    errorCode: "WHATSAPP_PAIR_LIMITED",
    retryAt: "2026-08-21T10:00:06.000Z",
  });
  assert.equal(sends, 0);
  assert.deepEqual(await providerDeferred.process(prepared()), {
    outcome: "deferred",
    errorCode: "META_PAIR_RATE_LIMITED",
    retryAt: "2026-08-21T10:00:01.000Z",
    reservationKey,
    providerErrorCode: 131056,
    cooldownScope: "pair",
    retryAfterSeconds: 1,
  });
  assert.deepEqual(await locallyRejected.process(prepared()), {
    outcome: "rejected",
    errorCode: "META_BOT_REPLY_REQUEST_INVALID",
  });
  assert.deepEqual(settlements, [
    ["local", reservationKey, prepared().attemptedAt],
  ]);
  assert.deepEqual(providerCooldowns, [[
    reservationKey,
    "pair",
    131056,
    1,
    prepared().attemptedAt,
  ]]);
});

test("requires exact Retry-After before deferring phone throughput", async () => {
  const cooldowns = [];
  const settlements = [];
  const createProcessor = (retryAfterSeconds) =>
    createMetaBotReplyProcessor({
      metaConnections: {
        async findConnectionByTenantId() {
          return connection();
        },
      },
      credentialVault: credentialVault(),
      admission: admission({
        async deferProviderRejection(...input) {
          cooldowns.push(input);
        },
        async settleProviderFailure(...input) {
          settlements.push(input);
        },
      }),
      sender: {
        async send() {
          throw new MetaGraphError(
            "API_ERROR",
            "private rejection",
            {
              httpStatus: 429,
              graphCode: 130429,
              retryAfterSeconds,
            },
          );
        },
      },
    });

  assert.deepEqual(
    await createProcessor(17).process(prepared()),
    {
      outcome: "deferred",
      errorCode: "META_PHONE_THROUGHPUT_LIMITED",
      retryAt: "2026-08-21T10:00:17.000Z",
      reservationKey,
      providerErrorCode: 130429,
      cooldownScope: "sender",
      retryAfterSeconds: 17,
    },
  );
  assert.deepEqual(
    await createProcessor(null).process(prepared()),
    {
      outcome: "rejected",
      errorCode: "META_PHONE_THROUGHPUT_LIMITED",
    },
  );
  assert.equal(cooldowns.length, 1);
  assert.deepEqual(cooldowns[0], [
    reservationKey,
    "sender",
    130429,
    17,
    prepared().attemptedAt,
  ]);
  assert.deepEqual(settlements, [[
    reservationKey,
    prepared().attemptedAt,
  ]]);
});

test("does not expose a retry when provider cooldown persistence fails", async () => {
  const processor = createMetaBotReplyProcessor({
    metaConnections: {
      async findConnectionByTenantId() {
        return connection();
      },
    },
    credentialVault: credentialVault(),
    admission: admission({
      async deferProviderRejection() {
        throw new Error("private persistence failure");
      },
    }),
    sender: {
      async send() {
        throw new MetaGraphError(
          "API_ERROR",
          "private rejection",
          {
            httpStatus: 429,
            graphCode: 130429,
            retryAfterSeconds: 17,
          },
        );
      },
    },
  });

  await assert.rejects(
    processor.process(prepared()),
    /private persistence failure/,
  );
});

test("fails closed before credentials for invalid delivery, connection state, or phone scope", async () => {
  let credentialCalls = 0;
  const cases = [
    {
      prepared: prepared({
        delivery: delivery({ status: "pending" }),
      }),
      connection: connection(),
      expected: {
        outcome: "rejected",
        errorCode: "META_BOT_REPLY_REQUEST_INVALID",
      },
    },
    {
      prepared: prepared({
        delivery: delivery({
          senderPhoneNumberId: "300004",
        }),
      }),
      connection: connection(),
      expected: {
        outcome: "rejected",
        errorCode: "META_BOT_REPLY_REQUEST_INVALID",
      },
    },
    {
      prepared: prepared({
        delivery: delivery({ claimVersion: 0 }),
      }),
      connection: connection(),
      expected: {
        outcome: "rejected",
        errorCode: "META_BOT_REPLY_REQUEST_INVALID",
      },
    },
    {
      prepared: prepared(),
      connection: connection({ status: "revoked" }),
      expected: {
        outcome: "deferred",
        errorCode: "META_CONNECTION_UNAVAILABLE",
        retryAt: "2026-08-21T10:01:00.000Z",
      },
    },
    {
      prepared: prepared(),
      connection: connection({ phoneNumberId: "300004" }),
      expected: {
        outcome: "deferred",
        errorCode: "META_CONNECTION_UNAVAILABLE",
        retryAt: "2026-08-21T10:01:00.000Z",
      },
    },
    {
      prepared: prepared({
        attemptedAt:
          "2026-08-22T09:00:00.000Z",
      }),
      connection: connection(),
      expected: {
        outcome: "rejected",
        errorCode: "META_BOT_REPLY_REQUEST_INVALID",
      },
    },
    {
      prepared: prepared({
        serviceWindowExpiresAt:
          "2026-08-22T09:00:00.001Z",
      }),
      connection: connection(),
      expected: {
        outcome: "rejected",
        errorCode: "META_BOT_REPLY_REQUEST_INVALID",
      },
    },
    {
      prepared: prepared({
        attemptedAt: "2026-08-21 10:00:00",
      }),
      connection: connection(),
      expected: {
        outcome: "rejected",
        errorCode: "META_BOT_REPLY_REQUEST_INVALID",
      },
    },
  ];

  for (const value of cases) {
    const processor = createMetaBotReplyProcessor({
      metaConnections: {
        async findConnectionByTenantId() {
          return value.connection;
        },
      },
      credentialVault: {
        async storeAccessToken() {},
        async withAccessToken() {
          credentialCalls += 1;
          throw new Error("must-not-run");
        },
      },
      admission: admission(),
      sender: {
        async send() {
          throw new Error("must-not-run");
        },
      },
    });

    assert.deepEqual(
      await processor.process(value.prepared),
      value.expected,
    );
  }
  assert.equal(credentialCalls, 0);
});

test("maps explicit Meta rejection codes and credential failures", async () => {
  const graphProcessor = createMetaBotReplyProcessor({
    metaConnections: {
      async findConnectionByTenantId() {
        return connection();
      },
    },
    credentialVault: credentialVault(),
    admission: admission(),
    sender: {
      async send() {
        throw new MetaGraphError(
          "API_ERROR",
          "private rejection",
          { httpStatus: 400, graphCode: 131047 },
        );
      },
    },
  });
  const credentialProcessor = createMetaBotReplyProcessor({
    metaConnections: {
      async findConnectionByTenantId() {
        return connection();
      },
    },
    credentialVault: credentialVault(async () => {
      throw new MetaCredentialVaultError(
        "CREDENTIAL_NOT_FOUND",
        "private credential detail",
      );
    }),
    admission: admission(),
    sender: {
      async send() {
        throw new Error("must-not-run");
      },
    },
  });

  assert.deepEqual(
    await graphProcessor.process(prepared()),
    {
      outcome: "rejected",
      errorCode: "META_SERVICE_WINDOW_CLOSED",
      reservationKey:
        `whatsapp_rate_reservation_v1_${"9".repeat(64)}`,
      providerErrorCode: 131047,
    },
  );
  assert.deepEqual(
    await credentialProcessor.process(prepared()),
    {
      outcome: "deferred",
      errorCode: "META_CREDENTIAL_UNAVAILABLE",
      retryAt: "2026-08-21T10:01:00.000Z",
    },
  );
});

test("does not convert timeout, server failure, or invalid acceptance into a retryable result", async () => {
  for (const providerFailure of [
    new MetaGraphError("TIMEOUT", "private timeout"),
    new MetaGraphError(
      "API_ERROR",
      "private server error",
      { httpStatus: 500, graphCode: 2 },
    ),
    new MetaBotReplyContractError(
      "INVALID_REPLY_RESPONSE",
    ),
  ]) {
    const processor = createMetaBotReplyProcessor({
      metaConnections: {
        async findConnectionByTenantId() {
          return connection();
        },
      },
      credentialVault: credentialVault(),
      admission: admission(),
      sender: {
        async send() {
          throw providerFailure;
        },
      },
    });

    await assert.rejects(
      processor.process(prepared()),
      /outcome is uncertain/,
    );
  }
});

test("runtime requires an explicit Graph API version before creating transport", () => {
  assert.throws(
    () => createMetaBotReplyRuntime({
      environment: {},
      metaConnections: {
        async findConnectionByTenantId() {
          return null;
        },
      },
      credentialVault: credentialVault(),
      admission: admission(),
    }),
    /META_GRAPH_API_VERSION/,
  );
});
