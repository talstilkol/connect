import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

test("declares a separate campaign queue, DLQ, and one-minute UTC cron", async () => {
  const viteConfiguration = await readFile(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    viteConfiguration,
    /binding: "CAMPAIGN_DELIVERY_QUEUE"/,
  );
  assert.match(
    viteConfiguration,
    /queue: "connect-campaign-deliveries"/,
  );
  assert.match(
    viteConfiguration,
    /dead_letter_queue:\s*"connect-campaign-deliveries-dlq"/,
  );
  assert.match(
    viteConfiguration,
    /triggers:\s*\{[\s\S]+crons: \["\* \* \* \* \*"\]/,
  );
});

test("routes campaign cron and queue through fail-closed runtime handlers", async () => {
  const workerSource = await readFile(
    new URL("../worker/index.ts", import.meta.url),
    "utf8",
  );
  const runtimeSource = await readFile(
    new URL(
      "../server/campaigns/campaignDispatchRuntime.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    workerSource,
    /batch\.queue === CAMPAIGN_DELIVERY_QUEUE_NAME/,
  );
  assert.match(
    workerSource,
    /createCampaignDeliveryBatchHandler/,
  );
  assert.match(
    workerSource,
    /createUnavailableCampaignDeliveryProcessor/,
  );
  assert.match(
    workerSource,
    /createUnavailableCampaignDeliveryRateLimitContextResolver/,
  );
  assert.match(
    runtimeSource,
    /createCampaignDeliveryAdmission\([\s\S]+createWhatsappRateLimitRepository\(database\)/,
  );
  assert.match(
    workerSource,
    /controller\.cron !== CAMPAIGN_SCHEDULER_CRON/,
  );
  assert.match(
    workerSource,
    /createCampaignScheduledHandler/,
  );
  assert.match(
    workerSource,
    /createTeamInvitationExpirationScheduledHandler/,
  );
  assert.match(
    workerSource,
    /controller\.scheduledTime/,
  );
  assert.match(
    workerSource,
    /await Promise\.all/,
  );
  assert.doesNotMatch(
    workerSource,
    /console\.(?:log|error)/,
  );
});
