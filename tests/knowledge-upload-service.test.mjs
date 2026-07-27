import assert from "node:assert/strict";
import test from "node:test";

import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";
import {
  createKnowledgeUploadService,
  KnowledgeUploadServiceError,
} from "../server/ai/knowledgeUploadService.ts";

const encoder = new TextEncoder();

function session(
  tenantId = 7,
  role = "owner",
) {
  return {
    externalUserId: "user_knowledge_owner",
    tenantId,
    displayName: "צוות שירות",
    status: "active",
    role,
  };
}

function uploadFile(
  content = "מדיניות השירות המאושרת",
) {
  const bytes = encoder.encode(content).buffer;

  return {
    name: "מדיניות-שירות.pdf",
    type: "application/pdf",
    size: bytes.byteLength,
    async arrayBuffer() {
      return bytes.slice(0);
    },
  };
}

function createMemoryDependencies({
  policyResult = { outcome: "accepted" },
  scanResult = { outcome: "clean" },
} = {}) {
  let source = null;
  let object = null;
  const calls = {
    policy: 0,
    register: 0,
    store: 0,
    read: 0,
    scan: 0,
  };

  const knowledgeSources = {
    async registerUploaded(input) {
      calls.register += 1;

      if (source) {
        return {
          outcome: "unchanged",
          source,
        };
      }

      source = {
        ...input,
        storageObjectKey:
          `knowledge/v1/${input.sourceKey}`,
        status: "pending-validation",
        lastErrorCode: null,
        readyAt: null,
        version: 1,
        createdAt: "2026-07-26T10:00:00.000Z",
        updatedAt: "2026-07-26T10:00:00.000Z",
      };

      return {
        outcome: "created",
        source,
      };
    },
    async transition(input) {
      if (
        !source ||
        source.sourceKey !== input.sourceKey
      ) {
        return { outcome: "not-found" };
      }

      if (source.version !== input.expectedVersion) {
        return { outcome: "conflict" };
      }

      const nextStatus =
        input.action === "validation-passed"
          ? "pending-scan"
          : input.action === "scan-started"
            ? "scanning"
            : input.action === "rejected"
              ? "rejected"
              : "archived";

      source = {
        ...source,
        status: nextStatus,
        lastErrorCode:
          input.action === "rejected"
            ? input.errorCode
            : source.lastErrorCode,
        version: source.version + 1,
        updatedAt: "2026-07-26T10:01:00.000Z",
      };

      return {
        outcome: "updated",
        source,
      };
    },
    async findByKey() {
      return source;
    },
    async listByTenant() {
      return source ? [source] : [];
    },
  };

  const objectStorage = {
    async store(input) {
      calls.store += 1;
      object = {
        bytes: input.bytes.slice(0),
        stored: {
          storageObjectKey:
            `knowledge/v1/${input.sourceKey}`,
          contentSha256: input.contentSha256,
          mediaType: input.mediaType,
          sizeBytes: input.bytes.byteLength,
        },
      };

      return object.stored;
    },
    async read(expected) {
      calls.read += 1;
      assert.deepEqual(object?.stored, expected);
      return object.bytes.slice(0);
    },
  };

  return {
    calls,
    source: () => source,
    service: createKnowledgeUploadService({
      knowledgeSources,
      objectStorage,
      uploadPolicy: {
        async evaluate() {
          calls.policy += 1;
          return policyResult;
        },
      },
      scanner: {
        async scan() {
          calls.scan += 1;
          return scanResult;
        },
      },
    }),
  };
}

test("stores tenant-scoped bytes, verifies R2, and stops fail-closed after a clean scan", async () => {
  const fixture = createMemoryDependencies();
  const result = await fixture.service.upload(
    session(),
    uploadFile(),
  );

  assert.equal(result.outcome, "processing");
  assert.equal(result.source.tenantId, 7);
  assert.equal(result.source.status, "scanning");
  assert.match(
    result.source.sourceKey,
    /^knowledge_source_v1_[0-9a-f]{64}$/,
  );
  assert.deepEqual(fixture.calls, {
    policy: 1,
    register: 1,
    store: 1,
    read: 1,
    scan: 1,
  });
});

test("rejects by policy before reading bytes or mutating persistence", async () => {
  const fixture = createMemoryDependencies({
    policyResult: {
      outcome: "rejected",
      errorCode: "MEDIA_TYPE_NOT_ALLOWED",
    },
  });
  let bodyRead = false;
  const file = uploadFile();
  file.arrayBuffer = async () => {
    bodyRead = true;
    return new ArrayBuffer(file.size);
  };

  const result = await fixture.service.upload(
    session(),
    file,
  );

  assert.deepEqual(result, {
    outcome: "rejected",
    stage: "policy",
    errorCode: "MEDIA_TYPE_NOT_ALLOWED",
    source: null,
  });
  assert.equal(bodyRead, false);
  assert.equal(fixture.calls.register, 0);
  assert.equal(fixture.calls.store, 0);
  assert.equal(fixture.calls.scan, 0);
});

test("treats unavailable or malformed scanner responses as fail-closed", async () => {
  for (const scanResult of [
    { outcome: "unavailable" },
    {
      outcome: "clean",
      untrustedExtraField: true,
    },
  ]) {
    const fixture = createMemoryDependencies({
      scanResult,
    });

    await assert.rejects(
      fixture.service.upload(
        session(),
        uploadFile(),
      ),
      (error) =>
        error instanceof
          KnowledgeUploadServiceError &&
        error.code ===
          "DEPENDENCY_UNAVAILABLE",
    );
    assert.equal(
      fixture.source().status,
      "scanning",
    );
  }
});

test("persists a scanner rejection with a bounded error code", async () => {
  const fixture = createMemoryDependencies({
    scanResult: {
      outcome: "rejected",
      errorCode: "MALWARE_DETECTED",
    },
  });
  const result = await fixture.service.upload(
    session(),
    uploadFile(),
  );

  assert.equal(result.outcome, "rejected");
  assert.equal(result.stage, "scanner");
  assert.equal(result.errorCode, "MALWARE_DETECTED");
  assert.equal(result.source.status, "rejected");
  assert.equal(
    result.source.lastErrorCode,
    "MALWARE_DETECTED",
  );
});

test("requires ai.write permission before evaluating upload policy", async () => {
  const fixture = createMemoryDependencies();

  await assert.rejects(
    fixture.service.upload(
      session(7, "viewer"),
      uploadFile(),
    ),
    (error) =>
      error instanceof TenantSessionError &&
      error.code === "PERMISSION_DENIED",
  );
  assert.equal(fixture.calls.policy, 0);
  assert.equal(fixture.calls.register, 0);
});

test("rejects a body whose actual length differs from declared File.size", async () => {
  const fixture = createMemoryDependencies();
  const file = uploadFile();
  file.size += 1;

  await assert.rejects(
    fixture.service.upload(session(), file),
    (error) =>
      error instanceof
        KnowledgeUploadServiceError &&
      error.code === "INVALID_INPUT",
  );
  assert.equal(fixture.calls.register, 0);
  assert.equal(fixture.calls.store, 0);
});
