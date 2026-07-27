import assert from "node:assert/strict";
import test from "node:test";

import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";
import {
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  createConfiguredKnowledgeScanRecoveryPolicy,
  inspectKnowledgeScanRecoveryConfiguration,
} from "../server/ai/knowledgeScanRecoveryPolicy.ts";
import {
  createKnowledgeScanRecoveryService,
  KnowledgeScanRecoveryServiceError,
} from "../server/ai/knowledgeScanRecoveryService.ts";

const contentSha256 = "c".repeat(64);
const now = new Date(
  "2026-07-26T10:05:00.000Z",
);

function session(role = "owner") {
  return {
    externalUserId: "user_knowledge_owner",
    tenantId: 7,
    displayName: "צוות שירות",
    status: "active",
    role,
  };
}

async function createFixture({
  updatedAt = "2026-07-26 10:03:00",
  scanResult = { outcome: "clean" },
  minimumAgeSeconds = 60,
} = {}) {
  const sourceKey =
    await deriveKnowledgeSourceKey(
      7,
      contentSha256,
    );
  const bytes = new TextEncoder().encode(
    "מדיניות השירות המאושרת",
  ).buffer;
  let source = {
    sourceKey,
    tenantId: 7,
    contentSha256,
    fileName: "מדיניות-שירות.pdf",
    mediaType: "application/pdf",
    sizeBytes: bytes.byteLength,
    storageObjectKey:
      `knowledge/v1/${sourceKey}`,
    status: "scanning",
    lastErrorCode: null,
    readyAt: null,
    version: 3,
    createdAt: "2026-07-26T10:00:00.000Z",
    updatedAt,
  };
  const calls = {
    transition: 0,
    read: 0,
    scan: 0,
  };
  const knowledgeSources = {
    async findByKey() {
      return source;
    },
    async listByTenant() {
      return [source];
    },
    async registerUploaded() {
      throw new Error(
        "recovery must not register a source",
      );
    },
    async transition(input) {
      calls.transition += 1;

      if (
        input.expectedVersion !==
        source.version
      ) {
        return { outcome: "conflict" };
      }

      if (
        input.action ===
        "scan-retry-started"
      ) {
        source = {
          ...source,
          version: source.version + 1,
          updatedAt: now.toISOString(),
        };

        return {
          outcome: "updated",
          source,
        };
      }

      if (input.action === "rejected") {
        source = {
          ...source,
          status: "rejected",
          lastErrorCode: input.errorCode,
          version: source.version + 1,
          updatedAt: now.toISOString(),
        };

        return {
          outcome: "updated",
          source,
        };
      }

      return { outcome: "invalid-state" };
    },
  };
  const service =
    createKnowledgeScanRecoveryService({
      knowledgeSources,
      objectStorage: {
        async store() {
          throw new Error(
            "recovery must not rewrite the object",
          );
        },
        async read(expected) {
          calls.read += 1;
          assert.equal(
            expected.storageObjectKey,
            source.storageObjectKey,
          );
          return bytes.slice(0);
        },
      },
      scanner: {
        async scan(input) {
          calls.scan += 1;
          assert.equal(
            input.sourceKey,
            source.sourceKey,
          );
          return scanResult;
        },
      },
      recoveryPolicy:
        createConfiguredKnowledgeScanRecoveryPolicy(
          minimumAgeSeconds,
        ),
      clock: {
        now() {
          return new Date(now);
        },
      },
    });

  return {
    calls,
    service,
    source: () => source,
    sourceKey,
  };
}

test("requires an explicit scan retry age without a default", () => {
  assert.deepEqual(
    inspectKnowledgeScanRecoveryConfiguration(
      {},
    ),
    {
      status: "configuration-required",
      issue: "MINIMUM_AGE_REQUIRED",
    },
  );
  assert.deepEqual(
    inspectKnowledgeScanRecoveryConfiguration({
      KNOWLEDGE_SCAN_RETRY_MIN_AGE_SECONDS:
        "0",
    }),
    {
      status: "configuration-required",
      issue: "MINIMUM_AGE_INVALID",
    },
  );
  assert.deepEqual(
    inspectKnowledgeScanRecoveryConfiguration({
      KNOWLEDGE_SCAN_RETRY_MIN_AGE_SECONDS:
        "60",
    }),
    {
      status: "configured",
      minimumAgeSeconds: 60,
    },
  );
});

test("returns retry-later before claiming a scan that is not stale", async () => {
  const fixture = await createFixture({
    updatedAt: "2026-07-26T10:04:30.000Z",
  });
  const result = await fixture.service.recover(
    session(),
    {
      sourceKey: fixture.sourceKey,
      expectedVersion: 3,
    },
  );

  assert.equal(result.outcome, "retry-later");
  assert.deepEqual(fixture.calls, {
    transition: 0,
    read: 0,
    scan: 0,
  });
});

test("claims one stale scan attempt before reading R2 and invoking the scanner", async () => {
  const fixture = await createFixture();
  const result = await fixture.service.recover(
    session(),
    {
      sourceKey: fixture.sourceKey,
      expectedVersion: 3,
    },
  );

  assert.equal(result.outcome, "scan-clean");
  assert.equal(result.source.status, "scanning");
  assert.equal(result.source.version, 4);
  assert.deepEqual(fixture.calls, {
    transition: 1,
    read: 1,
    scan: 1,
  });
});

test("keeps an unavailable scanner fail-closed and rejects a stale retry version", async () => {
  const fixture = await createFixture({
    scanResult: { outcome: "unavailable" },
  });

  await assert.rejects(
    fixture.service.recover(session(), {
      sourceKey: fixture.sourceKey,
      expectedVersion: 3,
    }),
    (error) =>
      error instanceof
        KnowledgeScanRecoveryServiceError &&
      error.code ===
        "DEPENDENCY_UNAVAILABLE",
  );
  assert.equal(fixture.source().status, "scanning");
  assert.equal(fixture.source().version, 4);

  await assert.rejects(
    fixture.service.recover(session(), {
      sourceKey: fixture.sourceKey,
      expectedVersion: 3,
    }),
    (error) =>
      error instanceof
        KnowledgeScanRecoveryServiceError &&
      error.code === "STATE_CONFLICT",
  );
  assert.equal(fixture.calls.scan, 1);
});

test("records a bounded scanner rejection after a claimed recovery", async () => {
  const fixture = await createFixture({
    scanResult: {
      outcome: "rejected",
      errorCode: "MALWARE_DETECTED",
    },
  });
  const result = await fixture.service.recover(
    session(),
    {
      sourceKey: fixture.sourceKey,
      expectedVersion: 3,
    },
  );

  assert.equal(result.outcome, "rejected");
  assert.equal(
    result.errorCode,
    "MALWARE_DETECTED",
  );
  assert.equal(result.source.status, "rejected");
  assert.equal(result.source.version, 5);
});

test("rejects extended input and missing ai.write permission before recovery", async () => {
  const fixture = await createFixture();

  await assert.rejects(
    fixture.service.recover(session(), {
      sourceKey: fixture.sourceKey,
      expectedVersion: 3,
      tenantId: 7,
    }),
    (error) =>
      error instanceof
        KnowledgeScanRecoveryServiceError &&
      error.code === "INVALID_INPUT",
  );
  await assert.rejects(
    fixture.service.recover(
      session("viewer"),
      {
        sourceKey: fixture.sourceKey,
        expectedVersion: 3,
      },
    ),
    (error) =>
      error instanceof TenantSessionError &&
      error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(fixture.calls, {
    transition: 0,
    read: 0,
    scan: 0,
  });
});
