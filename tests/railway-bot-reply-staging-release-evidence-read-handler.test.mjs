import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayBotReplyStagingReleaseEvidenceReadHandler,
} from "../server/operations/railwayBotReplyStagingReleaseEvidenceReadHandler.ts";
import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";
import {
  createRailwayBotReplyStagingCrossServiceEvidence,
} from "../server/platform/railwayBotReplyStagingCrossServiceEvidence.ts";

const evidenceJson = JSON.stringify(
  createRailwayBotReplyStagingCrossServiceEvidence({
    report: {
      schemaVersion: 1,
      activationVersion:
        railwayBotReplyStagingCrossServiceActivationVersion,
      status: "ready",
      code: "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED",
      passedCheckCount: 4,
      requiredCheckCount: 4,
      checks: railwayBotReplyStagingCrossServiceCheckIds.map((id) => ({
        id,
        status: "passed",
      })),
    },
    releaseId: `connect_release_v1_${"a".repeat(64)}`,
    commitSha: "b".repeat(40),
    artifactDigest: `sha256:${"c".repeat(64)}`,
    lifetimeSeconds: 600,
  }, {
    now: () => new Date("2026-08-24T12:00:00.000Z"),
  }),
);
const evidenceDigest = JSON.parse(evidenceJson).evidenceDigest;

function fixture(overrides = {}) {
  const requests = [];
  let identityReads = 0;
  const handler =
    createRailwayBotReplyStagingReleaseEvidenceReadHandler({
      applicationConfigured: () =>
        overrides.applicationConfigured ?? true,
      inspectConfiguration: () => overrides.configuration ?? ({
        status: "configured",
        missingKeys: [],
        invalidKeys: [],
        configuration: {
          apiOrigin: "https://railway.example.com",
          deploymentEnvironment: "production",
        },
      }),
      async resolveIdentity() {
        identityReads += 1;
        return overrides.identity ?? {
          status: "authenticated",
          oidcToken: "oidc.token.value",
          userSessionToken: "session.token.value",
        };
      },
      createClient() {
        return {
          async call(request) {
            requests.push(request);
            return overrides.response ?? {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: {
                schemaVersion: 1,
                storageMode: "postgresql",
                evidenceVersion: 1,
                evidenceDigest,
                evidenceJson,
              },
            };
          },
        };
      },
    });
  return { handler, requests, identityReads: () => identityReads };
}

test("reads a bounded release evidence DTO through Railway API", async () => {
  const testFixture = fixture();

  assert.deepEqual(await testFixture.handler.read(), {
    status: "ready",
    evidenceVersion: 1,
    evidenceDigest,
    evidenceJson,
  });
  assert.deepEqual(testFixture.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "runtime.bot-reply-release-evidence.read",
    requestKind: "query",
    idempotencyKey: null,
    payload: {},
  }]);
});

test("fails closed before a Railway call without configuration or identity", async () => {
  const disabled = fixture({ applicationConfigured: false });
  assert.equal((await disabled.handler.read()).status, "unavailable");
  assert.equal(disabled.identityReads(), 0);
  assert.deepEqual(disabled.requests, []);

  const unauthenticated = fixture({
    identity: {
      status: "unauthenticated",
      oidcToken: null,
      userSessionToken: null,
    },
  });
  assert.equal(
    (await unauthenticated.handler.read()).status,
    "unavailable",
  );
  assert.deepEqual(unauthenticated.requests, []);
});

test("rejects provider failures and extended or inconsistent DTOs", async () => {
  const malformedValues = [
    {
      schemaVersion: 1,
      storageMode: "postgresql",
      evidenceVersion: 1,
      evidenceDigest,
      evidenceJson,
      extension: true,
    },
    {
      schemaVersion: 1,
      storageMode: "postgresql",
      evidenceVersion: 0,
      evidenceDigest,
      evidenceJson,
    },
    {
      schemaVersion: 1,
      storageMode: "postgresql",
      evidenceVersion: 1,
      evidenceDigest:
        `bot_reply_staging_cross_service_evidence_v1_${"b".repeat(64)}`,
      evidenceJson,
    },
  ];

  for (const data of malformedValues) {
    const testFixture = fixture({
      response: {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data,
      },
    });
    assert.equal((await testFixture.handler.read()).status, "unavailable");
  }

  const failure = fixture({
    response: {
      contractVersion: "connect.railway-api.v1",
      outcome: "error",
      code: "DEPENDENCY_UNAVAILABLE",
    },
  });
  assert.equal((await failure.handler.read()).status, "unavailable");
});

test("rejects malformed handler dependencies", () => {
  assert.throws(
    () => createRailwayBotReplyStagingReleaseEvidenceReadHandler({}),
    /dependencies are invalid/,
  );
});
