import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("declares the webhook producer and consumer with bounded retries and a dead-letter queue", async () => {
  const viteConfiguration = await readFile(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    viteConfiguration,
    /binding: "META_WEBHOOK_QUEUE"/,
  );
  assert.match(
    viteConfiguration,
    /queue: "connect-meta-webhooks"/,
  );
  assert.match(viteConfiguration, /max_batch_size: 10/);
  assert.match(viteConfiguration, /max_batch_timeout: 5/);
  assert.match(viteConfiguration, /max_retries: 10/);
  assert.match(
    viteConfiguration,
    /dead_letter_queue: "connect-meta-webhooks-dlq"/,
  );
});

test("routes only the exact Meta path and connects the business processors fail-closed", async () => {
  const workerSource = await readFile(
    new URL("../worker/index.ts", import.meta.url),
    "utf8",
  );
  const businessProcessorSource = await readFile(
    new URL(
      "../server/meta/metaWebhookBusinessProcessor.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    workerSource,
    /url\.pathname === "\/webhooks\/meta"/,
  );
  assert.match(
    workerSource,
    /handleMetaWebhookQueueRoute\(request, env\)/,
  );
  assert.match(
    workerSource,
    /createMetaWebhookQueueBatchHandler/,
  );
  assert.match(
    workerSource,
    /batch\.queue === META_WEBHOOK_QUEUE_NAME/,
  );
  assert.match(
    workerSource,
    /throw new Error\("Unsupported queue"\)/,
  );
  assert.match(
    workerSource,
    /createMetaWebhookEventDispatcher/,
  );
  assert.match(
    workerSource,
    /createMetaWebhookBusinessBatchProcessor/,
  );
  assert.match(
    workerSource,
    /createConversationRepository\(env\.DB\)/,
  );
  assert.match(
    workerSource,
    /createMessageTemplateRepository\(env\.DB\)/,
  );
  assert.match(
    businessProcessorSource,
    /PROCESSOR_NOT_CONFIGURED/,
  );
  assert.doesNotMatch(
    workerSource,
    /console\.(?:log|error)|rawPayload\s*:/,
  );
});
