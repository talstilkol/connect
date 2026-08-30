import assert from "node:assert/strict";
import test from "node:test";

import {
  Queue,
} from "bullmq";

import {
  createRailwayBullMqMessageTemplateSubmissionQueueRuntime,
  railwayBullMqMessageTemplateSubmissionQueueName,
} from "../../server/platform/railwayBullMqMessageTemplateSubmissionQueue.ts";
import {
  createRailwayBullMqCampaignDeliveryQueueRuntime,
  railwayBullMqCampaignDeliveryQueueName,
} from "../../server/platform/railwayBullMqCampaignDeliveryQueue.ts";
import {
  createMessageTemplateSubmissionQueueMessage,
} from "../../server/templates/messageTemplateSubmissionQueueMessage.ts";
import {
  createCampaignDeliveryQueueMessage,
} from "../../server/campaigns/campaignDeliveryQueueMessage.ts";
import {
  createRailwayBullMqMetaWebhookPublisherRuntime,
  createRailwayBullMqMetaWebhookWorkerRuntime,
  railwayBullMqMetaWebhookQueueName,
} from "../../server/platform/railwayBullMqMetaWebhookQueue.ts";
import {
  createMetaWebhookQueueMessage,
} from "../../server/meta/metaWebhookQueueMessage.ts";
import {
  sha256Hex,
} from "../../server/meta/metaWebhookSecurity.ts";
import {
  createRailwayBullMqTeamInvitationPublisherRuntime,
  createRailwayBullMqTeamInvitationWorkerRuntime,
  railwayBullMqTeamInvitationQueueName,
} from "../../server/platform/railwayBullMqTeamInvitationQueue.ts";

const redisUrl = process.env.CONNECT_BULLMQ_INTEGRATION_REDIS_URL;

test("publishes, consumes and deduplicates against a real Redis instance", {
  skip: typeof redisUrl !== "string" || redisUrl.length === 0,
}, async () => {
  const events = [];
  let deliveries = 0;
  let resolveFirstDelivery;
  const firstDelivery = new Promise((resolve) => {
    resolveFirstDelivery = resolve;
  });
  const runtime =
    createRailwayBullMqMessageTemplateSubmissionQueueRuntime({
      environment: {
        APP_RUNTIME_ENVIRONMENT: "test",
        REDIS_URL: redisUrl,
        BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
        BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
        BULLMQ_FAILED_RETENTION_SECONDS: "604800",
        BULLMQ_FAILED_RETENTION_COUNT: "2000",
        BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
        BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
      },
      consumer: {
        async handle(batch) {
          deliveries += 1;
          batch.messages[0].ack();
          resolveFirstDelivery();
        },
      },
      telemetry: {
        recordConnectionFailure() {
          events.push("connection-failure");
        },
        recordWorkerFailure() {
          events.push("worker-failure");
        },
        recordWorkerRuntimeFailure() {
          events.push("worker-runtime-failure");
        },
        recordPublisherFailure() {
          events.push("publisher-failure");
        },
        recordDeadLetter(reason) {
          events.push(`dead-letter.${reason}`);
        },
        recordDeadLetterCleanup(count) {
          events.push(`dead-letter-cleanup.${count}`);
        },
      },
    });
  const message = createMessageTemplateSubmissionQueueMessage(
    7001,
    `template_submission_v1_${"c".repeat(64)}`,
  );

  try {
    await runtime.start();
    await runtime.publisher.publish([message]);
    let deliveryTimeout;
    try {
      await Promise.race([
        firstDelivery,
        new Promise((_, reject) => {
          deliveryTimeout = setTimeout(() => {
            reject(new Error("BullMQ integration delivery timed out"));
          }, 5_000);
        }),
      ]);
    } finally {
      clearTimeout(deliveryTimeout);
    }

    await runtime.publisher.publish([message]);
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });

    assert.equal(deliveries, 1);
    assert.deepEqual(events, []);
  } finally {
    await runtime.close();
    const cleanupQueue = new Queue(
      railwayBullMqMessageTemplateSubmissionQueueName,
      {
        connection: {
          url: redisUrl,
          family: 0,
          connectTimeout: 5_000,
          keepAlive: 10_000,
          noDelay: true,
          connectionName: "connect-template-integration-cleanup-v1",
          maxRetriesPerRequest: 1,
        },
        prefix: "connect-test-v1",
      },
    );
    cleanupQueue.on("error", () => {
      // The test assertion reports cleanup failures without private details.
    });
    try {
      await cleanupQueue.remove(message.submissionKey);
    } finally {
      await cleanupQueue.close();
    }
  }
});

test("honors a campaign retry delay and then acknowledges against real Redis", {
  skip: typeof redisUrl !== "string" || redisUrl.length === 0,
}, async () => {
  const attempts = [];
  let resolveSecondDelivery;
  const secondDelivery = new Promise((resolve) => {
    resolveSecondDelivery = resolve;
  });
  const runtime = createRailwayBullMqCampaignDeliveryQueueRuntime({
    environment: {
      APP_RUNTIME_ENVIRONMENT: "test",
      REDIS_URL: redisUrl,
      BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
      BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
      BULLMQ_FAILED_RETENTION_SECONDS: "604800",
      BULLMQ_FAILED_RETENTION_COUNT: "2000",
      BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
      BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
    },
    consumer: {
      async handle(batch) {
        const delivery = batch.messages[0];
        attempts.push({
          attempt: delivery.attempts,
          observedAt: Date.now(),
        });
        if (delivery.attempts === 1) {
          delivery.retry({ delaySeconds: 1 });
          return;
        }
        delivery.ack();
        resolveSecondDelivery();
      },
    },
    telemetry: {
      recordConnectionFailure() {},
      recordWorkerFailure() {},
      recordWorkerRuntimeFailure() {},
      recordPublisherFailure() {},
      recordDeadLetter() {},
      recordDeadLetterCleanup() {},
    },
  });
  const message = createCampaignDeliveryQueueMessage(
    `campaign_delivery_v1_${"d".repeat(64)}`,
  );

  try {
    await runtime.start();
    await runtime.queue.sendBatch([{
      body: message,
      contentType: "json",
    }]);
    let deliveryTimeout;
    try {
      await Promise.race([
        secondDelivery,
        new Promise((_, reject) => {
          deliveryTimeout = setTimeout(() => {
            reject(new Error("BullMQ campaign retry timed out"));
          }, 5_000);
        }),
      ]);
    } finally {
      clearTimeout(deliveryTimeout);
    }

    assert.deepEqual(
      attempts.map(({ attempt }) => attempt),
      [1, 2],
    );
    assert.equal(
      attempts[1].observedAt - attempts[0].observedAt >= 900,
      true,
    );
  } finally {
    await runtime.close();
    const cleanupQueue = new Queue(
      railwayBullMqCampaignDeliveryQueueName,
      {
        connection: {
          url: redisUrl,
          family: 0,
          connectTimeout: 5_000,
          keepAlive: 10_000,
          noDelay: true,
          connectionName: "connect-campaign-integration-cleanup-v1",
          maxRetriesPerRequest: 1,
        },
        prefix: "connect-test-v1",
      },
    );
    cleanupQueue.on("error", () => {
      // The test assertion reports cleanup failures without private details.
    });
    try {
      await cleanupQueue.remove(message.deliveryKey);
    } finally {
      await cleanupQueue.close();
    }
  }
});

test("round-trips exact Meta webhook bytes and deduplicates against real Redis", {
  skip: typeof redisUrl !== "string" || redisUrl.length === 0,
}, async () => {
  const queueEnvironment = {
    APP_RUNTIME_ENVIRONMENT: "test",
    REDIS_URL: redisUrl,
    BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
    BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
    BULLMQ_FAILED_RETENTION_SECONDS: "604800",
    BULLMQ_FAILED_RETENTION_COUNT: "2000",
    BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
    BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
  };
  const payload = new TextEncoder().encode(
    '{"object":"whatsapp_business_account","entry":[{"id":"live-waba","time":1787310000,"changes":[]}]}',
  );
  const message = createMetaWebhookQueueMessage(
    payload,
    `sha256=${"b".repeat(64)}`,
  );
  const eventKey = await sha256Hex(payload);
  let deliveries = 0;
  let resolveFirstDelivery;
  const firstDelivery = new Promise((resolve) => {
    resolveFirstDelivery = resolve;
  });
  const telemetry = {
    recordConnectionFailure() {},
    recordWorkerFailure() {},
    recordWorkerRuntimeFailure() {},
    recordPublisherFailure() {},
    recordDeadLetter() {},
    recordDeadLetterCleanup() {},
  };
  const worker = createRailwayBullMqMetaWebhookWorkerRuntime({
    environment: queueEnvironment,
    consumer: {
      async handle(batch) {
        const delivery = batch.messages[0];
        assert.equal(
          Buffer.from(delivery.body.rawPayload).equals(Buffer.from(payload)),
          true,
        );
        deliveries += 1;
        delivery.ack();
        resolveFirstDelivery();
      },
    },
    telemetry,
  });
  const publisher = createRailwayBullMqMetaWebhookPublisherRuntime({
    environment: queueEnvironment,
    telemetry: {
      recordConnectionFailure: telemetry.recordConnectionFailure,
      recordPublisherFailure: telemetry.recordPublisherFailure,
    },
  });

  try {
    await worker.start();
    await publisher.start();
    await publisher.queue.publish(message);
    let deliveryTimeout;
    try {
      await Promise.race([
        firstDelivery,
        new Promise((_, reject) => {
          deliveryTimeout = setTimeout(() => {
            reject(new Error("BullMQ Meta webhook delivery timed out"));
          }, 5_000);
        }),
      ]);
    } finally {
      clearTimeout(deliveryTimeout);
    }

    await publisher.queue.publish(message);
    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.equal(deliveries, 1);
  } finally {
    await Promise.allSettled([publisher.close(), worker.close()]);
    const cleanupQueue = new Queue(
      railwayBullMqMetaWebhookQueueName,
      {
        connection: {
          url: redisUrl,
          family: 0,
          connectTimeout: 5_000,
          keepAlive: 10_000,
          noDelay: true,
          connectionName: "connect-meta-webhook-integration-cleanup-v1",
          maxRetriesPerRequest: 1,
        },
        prefix: "connect-test-v1",
      },
    );
    cleanupQueue.on("error", () => {
      // The test assertion reports cleanup failures without private details.
    });
    try {
      await cleanupQueue.remove(eventKey);
    } finally {
      await cleanupQueue.close();
    }
  }
});

test("delivers an invitation once across separate publisher and worker runtimes", {
  skip: typeof redisUrl !== "string" || redisUrl.length === 0,
}, async () => {
  const queueEnvironment = {
    APP_RUNTIME_ENVIRONMENT: "test",
    REDIS_URL: redisUrl,
    BULLMQ_COMPLETED_RETENTION_SECONDS: "86400",
    BULLMQ_COMPLETED_RETENTION_COUNT: "1000",
    BULLMQ_FAILED_RETENTION_SECONDS: "604800",
    BULLMQ_FAILED_RETENTION_COUNT: "2000",
    BULLMQ_DLQ_RETENTION_SECONDS: "2592000",
    BULLMQ_DLQ_CLEAN_BATCH_SIZE: "100",
  };
  const invitationDeliveryKey =
    `team_invitation_delivery_v1_${"e".repeat(64)}`;
  let deliveries = 0;
  let resolveFirstDelivery;
  const firstDelivery = new Promise((resolve) => {
    resolveFirstDelivery = resolve;
  });
  const telemetry = {
    recordConnectionFailure() {},
    recordWorkerFailure() {},
    recordWorkerRuntimeFailure() {},
    recordPublisherFailure() {},
    recordDeadLetter() {},
    recordDeadLetterCleanup() {},
  };
  const worker = createRailwayBullMqTeamInvitationWorkerRuntime({
    environment: queueEnvironment,
    consumer: {
      async handle(batch) {
        const delivery = batch.messages[0];
        assert.deepEqual(delivery.body, {
          version: 1,
          tenantId: 7,
          deliveryKey: invitationDeliveryKey,
        });
        deliveries += 1;
        delivery.ack();
        resolveFirstDelivery();
      },
    },
    telemetry,
  });
  const publisher = createRailwayBullMqTeamInvitationPublisherRuntime({
    environment: queueEnvironment,
    telemetry: {
      recordConnectionFailure: telemetry.recordConnectionFailure,
      recordPublisherFailure: telemetry.recordPublisherFailure,
    },
  });

  try {
    await worker.start();
    await publisher.start();
    await publisher.publisher.publish(7, invitationDeliveryKey);
    let deliveryTimeout;
    try {
      await Promise.race([
        firstDelivery,
        new Promise((_, reject) => {
          deliveryTimeout = setTimeout(() => {
            reject(new Error("BullMQ invitation delivery timed out"));
          }, 5_000);
        }),
      ]);
    } finally {
      clearTimeout(deliveryTimeout);
    }

    await publisher.publisher.publish(7, invitationDeliveryKey);
    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.equal(deliveries, 1);
  } finally {
    await Promise.allSettled([publisher.close(), worker.close()]);
    const cleanupQueue = new Queue(
      railwayBullMqTeamInvitationQueueName,
      {
        connection: {
          url: redisUrl,
          family: 0,
          connectTimeout: 5_000,
          keepAlive: 10_000,
          noDelay: true,
          connectionName: "connect-invitation-integration-cleanup-v1",
          maxRetriesPerRequest: 1,
        },
        prefix: "connect-test-v1",
      },
    );
    cleanupQueue.on("error", () => {
      // The test assertion reports cleanup failures without private details.
    });
    try {
      await cleanupQueue.remove(invitationDeliveryKey);
    } finally {
      await cleanupQueue.close();
    }
  }
});
