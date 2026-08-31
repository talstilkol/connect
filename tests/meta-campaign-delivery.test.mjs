import assert from "node:assert/strict";
import test from "node:test";

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
  createMetaCampaignDeliveryProcessor,
} from "../server/campaigns/metaCampaignDeliveryProcessor.ts";
import {
  createMetaCampaignDeliveryRuntime,
} from "../server/campaigns/metaCampaignDeliveryRuntime.ts";
import {
  createMetaCampaignDeliveryRetryPolicy,
} from "../server/campaigns/metaCampaignDeliveryRetryPolicy.ts";
import {
  createMetaCampaignTemplateAdapter,
  MetaCampaignTemplateContractError,
} from "../server/campaigns/metaCampaignTemplateAdapter.ts";
import {
  observeCampaignDeliveryProcessor,
} from "../server/operations/campaignDeliveryTelemetry.ts";
import {
  createProviderRequestTelemetryScope,
} from "../server/operations/providerRequestTelemetry.ts";

const tenantId = 7;
const campaignKey = `campaign_v1_${"a".repeat(64)}`;
const deliveryKey =
  `campaign_delivery_v1_${"b".repeat(64)}`;
const reservationKey =
  `whatsapp_rate_reservation_v1_${"c".repeat(64)}`;
const templateKey = `template_v1_${"d".repeat(64)}`;
const accessToken = toSensitiveMetaAccessToken(
  "campaign-delivery-access-token",
);
const providerMessageId = "wamid.campaign-provider-17";

function template(overrides = {}) {
  return {
    templateKey,
    metaTemplateId: "400004",
    name: "order_update",
    category: "UTILITY",
    language: "he",
    version: 3,
    header: "עדכון הזמנה",
    body: "שלום {{1}}, הזמנה {{2}} עודכנה",
    footer: "Connect",
    variableExamples: {
      1: "ישראל ישראלי",
      2: "A-17",
    },
    buttonMode: "call_to_action",
    quickReplies: [],
    urlButton: {
      enabled: true,
      mode: "dynamic",
      text: "צפייה בהזמנה",
      value: "https://connect.example/orders/{{1}}",
      example: "A-17",
    },
    phoneButton: {
      enabled: true,
      text: "התקשרו אלינו",
      value: "+97235550000",
    },
    ...overrides,
  };
}

function campaign(overrides = {}) {
  return {
    campaignKey,
    tenantId,
    name: "עדכוני הזמנות",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: template(),
    audienceSnapshotKey: `campaign_audience_v1_${"e".repeat(64)}`,
    recipientCount: 1,
    status: "running",
    version: 4,
    activatedAt: "2026-08-16T10:00:00.000Z",
    startedAt: "2026-08-16T10:01:00.000Z",
    completedAt: null,
    lastErrorCode: null,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: "2026-08-16T10:01:00.000Z",
    ...overrides,
  };
}

function recipient(overrides = {}) {
  return {
    campaignKey,
    tenantId,
    contactId: 17,
    contactVersion: 2,
    phoneNumber: "+972501234567",
    personalization: {
      "body:1": "טל",
      "body:2": "A-17",
      "url:1": "A-17",
    },
    personalizationKey:
      `campaign_personalization_v1_${"f".repeat(64)}`,
    deliveryKey,
    status: "sending",
    attemptCount: 1,
    lastErrorCode: null,
    queuedAt: "2026-08-16T10:02:00.000Z",
    acceptedAt: null,
    createdAt: "2026-08-16T10:00:00.000Z",
    updatedAt: "2026-08-16T10:02:00.000Z",
    ...overrides,
  };
}

function preparedDelivery(overrides = {}) {
  return {
    campaign: campaign(),
    recipient: recipient(),
    rateLimitReservationKey: reservationKey,
    deliveryAttemptNumber: 1,
    queueAttemptNumber: 1,
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
    webhookSubscribedAt: "2026-08-16T09:00:00.000Z",
    connectedAt: "2026-08-16T09:00:00.000Z",
    version: 2,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: "2026-08-16T09:00:00.000Z",
    ...overrides,
  };
}

function senderInput(overrides = {}) {
  return {
    phoneNumberId: "300003",
    recipientPhoneNumber: "+972501234567",
    deliveryKey,
    accessToken,
    template: template(),
    personalization: {
      "body:1": "טל",
      "body:2": "A-17",
      "url:1": "A-17",
    },
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

function retryPolicy(decide = () => ({ action: "stop" })) {
  return {
    isConfigured() {
      return true;
    },
    decide,
  };
}

function retryEvidenceSource(
  load = () => ({
    providerRetryAfterSeconds: null,
    pairFailureExponent: null,
  }),
) {
  return {
    isConfigured() {
      return true;
    },
    load,
  };
}

test("builds one official template send request and returns only the wamid", async () => {
  const requests = [];
  const adapter = createMetaCampaignTemplateAdapter({
    async requestJson(request) {
      requests.push(request);
      return {
        messaging_product: "whatsapp",
        contacts: [
          {
            input: "972501234567",
            wa_id: "972501234567",
          },
        ],
        messages: [{ id: providerMessageId }],
      };
    },
  });

  const result = await adapter.send(senderInput());

  assert.deepEqual(result, { providerMessageId });
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], {
    method: "POST",
    pathSegments: ["300003", "messages"],
    accessToken,
    jsonBody: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "972501234567",
      type: "template",
      template: {
        name: "order_update",
        language: { code: "he" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "טל" },
              { type: "text", text: "A-17" },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "1",
            parameters: [
              { type: "text", text: "A-17" },
            ],
          },
        ],
      },
    },
  });
});

test("links the actual Meta campaign POST to one bounded delivery parent", async () => {
  const events = [];
  const timestamps = [
    "2026-08-21T10:00:00.000Z",
    "2026-08-21T10:00:00.010Z",
    "2026-08-21T10:00:00.030Z",
    "2026-08-21T10:00:00.040Z",
  ].map((value) => new Date(value));
  const telemetryClock = {
    now() {
      const value = timestamps.shift();
      if (value === undefined) throw new Error("test clock exhausted");
      return value;
    },
  };
  const scope = createProviderRequestTelemetryScope();
  const adapter = createMetaCampaignTemplateAdapter(
    {
      async requestJson() {
        return {
          messaging_product: "whatsapp",
          messages: [{ id: providerMessageId }],
        };
      },
    },
    { scope, clock: telemetryClock },
  );
  const observed = observeCampaignDeliveryProcessor(
    {
      isConfigured() {
        return true;
      },
      async process() {
        return {
          outcome: "accepted",
          ...(await adapter.send(senderInput())),
        };
      },
    },
    {
      async record(event) {
        events.push(event);
        return { outcome: "recorded" };
      },
    },
    telemetryClock,
    scope,
  );

  assert.equal(observed.isConfigured(), true);
  assert.deepEqual(await observed.process(preparedDelivery()), {
    outcome: "accepted",
    providerMessageId,
  });
  assert.deepEqual(events, [{
    version: 1,
    kind: "delivery-attempt",
    queue: "campaign-delivery",
    outcome: "accepted",
    startedAt: "2026-08-21T10:00:00.000Z",
    completedAt: "2026-08-21T10:00:00.040Z",
    durationMilliseconds: 40,
    providerRequests: [{
      provider: "meta",
      operation: "campaign-message.send",
      outcome: "completed",
      startedAt: "2026-08-21T10:00:00.010Z",
      completedAt: "2026-08-21T10:00:00.030Z",
      durationMilliseconds: 20,
    }],
  }]);
  assert.doesNotMatch(
    JSON.stringify(events),
    /tenant|phone|deliveryKey|templateKey|waba|token|payload|url/i,
  );
});

test("derives bounded quick-reply payloads from the opaque delivery key", async () => {
  let body;
  const adapter = createMetaCampaignTemplateAdapter({
    async requestJson(request) {
      body = request.jsonBody;
      return {
        messaging_product: "whatsapp",
        messages: [{ id: providerMessageId }],
      };
    },
  });
  const quickReplyTemplate = template({
    body: "האם להמשיך?",
    variableExamples: {},
    buttonMode: "quick_reply",
    quickReplies: ["כן", "לא"],
    urlButton: {
      enabled: false,
      mode: "static",
      text: "",
      value: "",
      example: "",
    },
    phoneButton: {
      enabled: false,
      text: "",
      value: "",
    },
  });

  await adapter.send(
    senderInput({
      template: quickReplyTemplate,
      personalization: {},
    }),
  );

  assert.deepEqual(body.template.components, [
    {
      type: "button",
      sub_type: "quick_reply",
      index: "0",
      parameters: [
        { type: "payload", payload: `${deliveryKey}:0` },
      ],
    },
    {
      type: "button",
      sub_type: "quick_reply",
      index: "1",
      parameters: [
        { type: "payload", payload: `${deliveryKey}:1` },
      ],
    },
  ]);
});

test("omits components for a static template without parameters", async () => {
  let body;
  const adapter = createMetaCampaignTemplateAdapter({
    async requestJson(request) {
      body = request.jsonBody;
      return {
        messaging_product: "whatsapp",
        messages: [{ id: providerMessageId }],
      };
    },
  });

  await adapter.send(
    senderInput({
      template: template({
        body: "הזמנה נשלחה",
        variableExamples: {},
        buttonMode: "none",
        urlButton: {
          enabled: false,
          mode: "static",
          text: "",
          value: "",
          example: "",
        },
        phoneButton: {
          enabled: false,
          text: "",
          value: "",
        },
      }),
      personalization: {},
    }),
  );

  assert.equal("components" in body.template, false);
});

test("rejects invalid scope and incomplete personalization before transport", async () => {
  let calls = 0;
  const adapter = createMetaCampaignTemplateAdapter({
    async requestJson() {
      calls += 1;
      throw new Error("must-not-run");
    },
  });
  const invalidInputs = [
    senderInput({ phoneNumberId: "phone-id" }),
    senderInput({ recipientPhoneNumber: "972501234567" }),
    senderInput({ deliveryKey: "delivery" }),
    senderInput({
      personalization: {
        "body:1": "טל",
        "body:2": "A-17",
      },
    }),
    senderInput({
      template: template({ metaTemplateId: "pending" }),
    }),
  ];

  for (const input of invalidInputs) {
    await assert.rejects(
      adapter.send(input),
      (error) =>
        error instanceof MetaCampaignTemplateContractError &&
        error.code === "INVALID_DELIVERY_REQUEST",
    );
  }

  assert.equal(calls, 0);
});

test("treats a successful response without one valid wamid as uncertain", async () => {
  const invalidResponses = [
    {},
    { messaging_product: "messenger", messages: [] },
    { messaging_product: "whatsapp", messages: [] },
    {
      messaging_product: "whatsapp",
      messages: [{ id: "provider-message" }],
    },
    {
      messaging_product: "whatsapp",
      messages: [
        { id: providerMessageId },
        { id: "wamid.second" },
      ],
    },
  ];

  for (const response of invalidResponses) {
    const adapter = createMetaCampaignTemplateAdapter({
      async requestJson() {
        return response;
      },
    });

    await assert.rejects(
      adapter.send(senderInput()),
      (error) =>
        error instanceof MetaCampaignTemplateContractError &&
        error.code === "INVALID_DELIVERY_RESPONSE",
    );
  }
});

test("loads the connected phone and credential before provider submission", async () => {
  const calls = [];
  const processor = createMetaCampaignDeliveryProcessor({
    retryPolicy: retryPolicy(),
    metaConnections: {
      async findConnectionByTenantId(requestedTenantId) {
        calls.push({ operation: "connection", requestedTenantId });
        return connection();
      },
    },
    credentialVault: credentialVault(),
    sender: {
      async send(input) {
        calls.push({ operation: "send", input });
        return { providerMessageId };
      },
    },
  });

  assert.equal(processor.isConfigured(), true);
  assert.deepEqual(
    await processor.process(preparedDelivery()),
    {
      outcome: "accepted",
      providerMessageId,
    },
  );
  assert.equal(calls[0].operation, "connection");
  assert.equal(calls[1].operation, "send");
  assert.deepEqual(calls[1].input, senderInput());
});

test("rejects a reservation claim that does not match the persisted delivery attempt", async () => {
  let connectionCalls = 0;
  const processor = createMetaCampaignDeliveryProcessor({
    retryPolicy: retryPolicy(),
    metaConnections: {
      async findConnectionByTenantId() {
        connectionCalls += 1;
        return connection();
      },
    },
    credentialVault: credentialVault(),
    sender: {
      async send() {
        throw new Error("must-not-run");
      },
    },
  });

  assert.deepEqual(
    await processor.process(
      preparedDelivery({ deliveryAttemptNumber: 2 }),
    ),
    {
      outcome: "rejected",
      errorCode: "META_DELIVERY_REQUEST_INVALID",
    },
  );
  assert.equal(connectionCalls, 0);
});

test("maps explicit Meta rejections to bounded operational codes", async (context) => {
  const cases = [
    [4, "META_APP_RATE_LIMITED"],
    [80007, "META_WABA_RATE_LIMITED"],
    [130429, "META_PHONE_THROUGHPUT_LIMITED"],
    [131026, "META_MESSAGE_UNDELIVERABLE"],
    [131047, "META_SERVICE_WINDOW_CLOSED"],
    [131048, "META_QUALITY_RATE_LIMITED"],
    [131049, "META_RECIPIENT_MARKETING_LIMITED"],
    [131056, "META_PAIR_RATE_LIMITED"],
    [131057, "META_PHONE_MAINTENANCE"],
    [131064, "META_TEMPLATE_CLASSIFICATION_BLOCKED"],
    [132000, "META_TEMPLATE_PARAMETER_MISMATCH"],
    [132012, "META_TEMPLATE_UNAVAILABLE"],
    [132015, "META_TEMPLATE_PAUSED"],
    [132016, "META_TEMPLATE_DISABLED"],
    [190001, "META_DELIVERY_REJECTED"],
  ];

  for (const [graphCode, expectedErrorCode] of cases) {
    await context.test(String(graphCode), async () => {
      const processor = createMetaCampaignDeliveryProcessor({
        retryPolicy: retryPolicy(),
        metaConnections: {
          async findConnectionByTenantId() {
            return connection();
          },
        },
        credentialVault: credentialVault(),
        sender: {
          async send() {
            throw new MetaGraphError(
              "API_ERROR",
              "sensitive provider detail",
              { httpStatus: 400, graphCode },
            );
          },
        },
      });

      assert.deepEqual(
        await processor.process(preparedDelivery()),
        {
          outcome: "rejected",
          errorCode: expectedErrorCode,
        },
      );
    });
  }
});

test("defers only provider errors with an explicit scoped retry decision", async (context) => {
  const cases = [
    [
      130429,
      "META_PHONE_THROUGHPUT_LIMITED",
      "sender",
      12,
    ],
    [
      131049,
      "META_RECIPIENT_MARKETING_LIMITED",
      "portfolio-recipient",
      86_400,
    ],
    [131056, "META_PAIR_RATE_LIMITED", "pair", 6],
  ];

  for (const [
    graphCode,
    errorCode,
    cooldownScope,
    retryAfterSeconds,
  ] of cases) {
    await context.test(String(graphCode), async () => {
      const decisions = [];
      const templateCategory =
        graphCode === 131049
          ? "MARKETING"
          : "UTILITY";
      const processor = createMetaCampaignDeliveryProcessor({
        retryPolicy: retryPolicy((request) => {
          decisions.push(request);
          return {
            action: "defer",
            retryAfterSeconds,
          };
        }),
        metaConnections: {
          async findConnectionByTenantId() {
            return connection();
          },
        },
        credentialVault: credentialVault(),
        sender: {
          async send() {
            throw new MetaGraphError(
              "API_ERROR",
              "sensitive provider detail",
              { httpStatus: 400, graphCode },
            );
          },
        },
      });

      assert.deepEqual(
        await processor.process(
          preparedDelivery({
            campaign: campaign({
              template: template({
                category: templateCategory,
              }),
            }),
          }),
        ),
        {
          outcome: "deferred",
          errorCode,
          providerErrorCode: graphCode,
          cooldownScope,
          retryAfterSeconds,
        },
      );
      assert.deepEqual(decisions, [
        {
          tenantId,
          templateCategory,
          attemptCount: 1,
          providerRetryAfterSeconds: null,
          providerErrorCode: graphCode,
          cooldownScope,
        },
      ]);
    });
  }
});

test("fails closed when retry policy is unavailable or returns an unsafe delay", async () => {
  let connectionCalls = 0;
  const unavailable = createMetaCampaignDeliveryProcessor({
    retryPolicy: {
      isConfigured() {
        return false;
      },
      decide() {
        throw new Error("must-not-run");
      },
    },
    metaConnections: {
      async findConnectionByTenantId() {
        connectionCalls += 1;
        return connection();
      },
    },
    credentialVault: credentialVault(),
    sender: {
      async send() {
        throw new Error("must-not-run");
      },
    },
  });
  const unsafe = createMetaCampaignDeliveryProcessor({
    retryPolicy: retryPolicy(() => ({
      action: "defer",
      retryAfterSeconds: 86_400,
    })),
    metaConnections: {
      async findConnectionByTenantId() {
        return connection();
      },
    },
    credentialVault: credentialVault(),
    sender: {
      async send() {
        throw new MetaGraphError(
          "API_ERROR",
          "sensitive provider detail",
          { httpStatus: 400, graphCode: 131049 },
        );
      },
    },
  });

  assert.equal(unavailable.isConfigured(), false);
  assert.deepEqual(
    await unavailable.process(preparedDelivery()),
    {
      outcome: "rejected",
      errorCode: "META_RETRY_POLICY_UNAVAILABLE",
    },
  );
  assert.equal(connectionCalls, 0);
  assert.deepEqual(
    await unsafe.process(preparedDelivery()),
    {
      outcome: "rejected",
      errorCode: "META_RECIPIENT_MARKETING_LIMITED",
    },
  );
});

test("derives campaign retry delays from the shared Meta failure policy", async () => {
  const evidenceByCode = new Map([
    [
      130429,
      {
        providerRetryAfterSeconds: null,
        pairFailureExponent: null,
      },
    ],
    [
      131049,
      {
        providerRetryAfterSeconds: null,
        pairFailureExponent: null,
      },
    ],
    [
      131056,
      {
        providerRetryAfterSeconds: null,
        pairFailureExponent: 2,
      },
    ],
    [
      131057,
      {
        providerRetryAfterSeconds: null,
        pairFailureExponent: null,
      },
    ],
  ]);
  const policy = createMetaCampaignDeliveryRetryPolicy(
    retryEvidenceSource((request) =>
      evidenceByCode.get(request.providerErrorCode) ?? null,
    ),
  );
  const baseRequest = {
    tenantId,
    templateCategory: "UTILITY",
    attemptCount: 1,
    providerRetryAfterSeconds: null,
  };

  assert.deepEqual(
    await policy.decide({
      ...baseRequest,
      providerErrorCode: 130429,
      cooldownScope: "sender",
      providerRetryAfterSeconds: 17,
    }),
    { action: "defer", retryAfterSeconds: 17 },
  );
  assert.deepEqual(
    await policy.decide({
      ...baseRequest,
      templateCategory: "MARKETING",
      providerErrorCode: 131049,
      cooldownScope: "portfolio-recipient",
    }),
    { action: "defer", retryAfterSeconds: 86_400 },
  );
  assert.deepEqual(
    await policy.decide({
      ...baseRequest,
      providerErrorCode: 131049,
      cooldownScope: "portfolio-recipient",
    }),
    { action: "stop" },
  );
  assert.deepEqual(
    await policy.decide({
      ...baseRequest,
      providerErrorCode: 131056,
      cooldownScope: "pair",
    }),
    { action: "defer", retryAfterSeconds: 16 },
  );
  assert.deepEqual(
    await policy.decide({
      ...baseRequest,
      providerErrorCode: 131057,
      cooldownScope: "sender",
    }),
    { action: "stop" },
  );
  const conflicting =
    createMetaCampaignDeliveryRetryPolicy(
      retryEvidenceSource(() => ({
        providerRetryAfterSeconds: 31,
        pairFailureExponent: null,
      })),
    );

  assert.deepEqual(
    await conflicting.decide({
      ...baseRequest,
      providerErrorCode: 130429,
      cooldownScope: "sender",
      providerRetryAfterSeconds: 17,
    }),
    { action: "stop" },
  );
});

test("rejects unavailable connection and credential without provider access", async () => {
  let senderCalls = 0;
  const sender = {
    async send() {
      senderCalls += 1;
      throw new Error("must-not-run");
    },
  };
  const disconnected = createMetaCampaignDeliveryProcessor({
    retryPolicy: retryPolicy(),
    metaConnections: {
      async findConnectionByTenantId() {
        return connection({ status: "restricted" });
      },
    },
    credentialVault: credentialVault(),
    sender,
  });
  const missingCredential =
    createMetaCampaignDeliveryProcessor({
      retryPolicy: retryPolicy(),
      metaConnections: {
        async findConnectionByTenantId() {
          return connection();
        },
      },
      credentialVault: credentialVault(async () => {
        throw new MetaCredentialVaultError(
          "CREDENTIAL_NOT_FOUND",
          "sensitive credential detail",
        );
      }),
      sender,
    });

  assert.deepEqual(
    await disconnected.process(preparedDelivery()),
    {
      outcome: "rejected",
      errorCode: "META_CONNECTION_UNAVAILABLE",
    },
  );
  assert.deepEqual(
    await missingCredential.process(preparedDelivery()),
    {
      outcome: "rejected",
      errorCode: "META_CREDENTIAL_UNAVAILABLE",
    },
  );
  assert.equal(senderCalls, 0);
});

test("keeps network, server, and malformed success outcomes ambiguous", async () => {
  const errors = [
    new MetaGraphError(
      "NETWORK_ERROR",
      "sensitive network detail",
    ),
    new MetaGraphError(
      "API_ERROR",
      "sensitive server detail",
      { httpStatus: 503, graphCode: 2 },
    ),
    new MetaCampaignTemplateContractError(
      "INVALID_DELIVERY_RESPONSE",
    ),
  ];

  for (const providerError of errors) {
    const processor = createMetaCampaignDeliveryProcessor({
      retryPolicy: retryPolicy(),
      metaConnections: {
        async findConnectionByTenantId() {
          return connection();
        },
      },
      credentialVault: credentialVault(),
      sender: {
        async send() {
          throw providerError;
        },
      },
    });

    await assert.rejects(
      processor.process(preparedDelivery()),
      (error) =>
        error instanceof Error &&
        error.message ===
          "Meta campaign delivery outcome is uncertain" &&
        !error.message.includes("sensitive"),
    );
  }
});

test("composes Graph transport without exposing the access token", async () => {
  const requests = [];
  const processor = createMetaCampaignDeliveryRuntime({
    retryEvidenceSource: retryEvidenceSource(),
    environment: {
      META_GRAPH_API_VERSION: "v21.0",
    },
    metaConnections: {
      async findConnectionByTenantId() {
        return connection();
      },
    },
    credentialVault: credentialVault(),
    transportOptions: {
      async fetchImplementation(url, init) {
        requests.push({ url, init });
        return Response.json({
          messaging_product: "whatsapp",
          messages: [{ id: providerMessageId }],
        });
      },
    },
  });

  assert.deepEqual(
    await processor.process(preparedDelivery()),
    {
      outcome: "accepted",
      providerMessageId,
    },
  );
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url.toString(),
    "https://graph.facebook.com/v21.0/300003/messages",
  );
  assert.equal(
    requests[0].init.headers.authorization,
    `Bearer ${accessToken}`,
  );
  assert.equal(
    requests[0].url.toString().includes(accessToken),
    false,
  );
  assert.equal(
    requests[0].init.body.includes(accessToken),
    false,
  );
});

test("requires an explicit Graph API version before building the runtime", () => {
  assert.throws(
    () =>
      createMetaCampaignDeliveryRuntime({
        environment: {},
        metaConnections: {
          async findConnectionByTenantId() {
            throw new Error("must-not-run");
          },
        },
        credentialVault: credentialVault(),
      }),
    /META_GRAPH_API_VERSION/,
  );
});
