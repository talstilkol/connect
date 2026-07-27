import assert from "node:assert/strict";
import test from "node:test";

import {
  MetaGraphContractError,
  createMetaGraphWabaSubscriber,
} from "../server/meta/metaGraphWabaSubscriber.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";

const accessToken = toSensitiveMetaAccessToken(
  "subscriber-fixture-access-token",
);

test("subscribes the verified WABA through the Meta Graph contract", async () => {
  const requests = [];
  const subscriber = createMetaGraphWabaSubscriber({
    async requestJson(request) {
      requests.push(request);
      return { success: true };
    },
  });

  await subscriber.subscribeWaba(" waba-fixture ", accessToken);

  assert.deepEqual(requests, [
    {
      method: "POST",
      pathSegments: ["waba-fixture", "subscribed_apps"],
      accessToken,
    },
  ]);
});

test("rejects invalid WABA IDs before calling Meta", async () => {
  let transportCalls = 0;
  const subscriber = createMetaGraphWabaSubscriber({
    async requestJson() {
      transportCalls += 1;
      return { success: true };
    },
  });

  await assert.rejects(
    subscriber.subscribeWaba("../other-account", accessToken),
    /WABA ID is invalid/,
  );
  assert.equal(transportCalls, 0);
});

test("requires Meta to confirm the WABA subscription", async () => {
  const subscriber = createMetaGraphWabaSubscriber({
    async requestJson() {
      return { success: false };
    },
  });

  await assert.rejects(
    subscriber.subscribeWaba("waba-fixture", accessToken),
    (error) =>
      error instanceof MetaGraphContractError &&
      error.code === "INVALID_SUBSCRIPTION_RESPONSE",
  );
});

test("brands only validated non-empty Meta access tokens", () => {
  assert.equal(
    toSensitiveMetaAccessToken("validated-token"),
    "validated-token",
  );
  assert.throws(
    () => toSensitiveMetaAccessToken("  "),
    /Meta access token is invalid/,
  );
});
