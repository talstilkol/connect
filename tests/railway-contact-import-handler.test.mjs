import assert from "node:assert/strict";
import test from "node:test";

import { createRailwayContactImportHandler } from "../server/contacts/railwayContactImportHandler.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "../server/platform/railwayApiMutationExecutor.ts";

const configuredState = Object.freeze({
  status: "configured",
  missingKeys: [],
  invalidKeys: [],
  configuration: Object.freeze({
    apiOrigin: "https://connect-api.up.railway.app",
    deploymentEnvironment: "production",
  }),
});
const authenticatedState = Object.freeze({
  status: "authenticated",
  oidcToken: "oidcHeader.oidcPayload.oidcSignature",
  userSessionToken: "userHeader.userPayload.userSignature",
});
const startInput = Object.freeze({
  fileName: "contacts.csv",
  sourceDigest: "a".repeat(64),
  totalRows: 2,
  mapping: Object.freeze({
    phoneNumber: 0,
    firstName: 1,
    lastName: null,
    email: null,
    company: null,
  }),
});
const job = Object.freeze({
  id: 31,
  fileName: "contacts.csv",
  totalRows: 2,
  processedRows: 0,
  createdRows: 0,
  updatedRows: 0,
  unchangedRows: 0,
  rejectedRows: 0,
  duplicateRows: 0,
  status: "processing",
});

function success(responseJob = job, contacts = [], replayed = false) {
  return {
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: { replayed, job: responseJob, contacts },
  };
}

function fixture({
  applicationConfigured = true,
  configurationState = configuredState,
  identityState = authenticatedState,
  responseFor = () => success(),
  clientError = null,
} = {}) {
  const calls = { configurations: 0, identities: 0, requests: [] };
  const handler = createRailwayContactImportHandler({
    applicationConfigured() {
      return applicationConfigured;
    },
    inspectConfiguration() {
      calls.configurations += 1;
      return configurationState;
    },
    async resolveIdentity() {
      calls.identities += 1;
      return identityState;
    },
    createClient() {
      return {
        async call(request) {
          calls.requests.push(request);
          if (clientError) throw clientError;
          return responseFor(request);
        },
      };
    },
  });

  return { calls, handler };
}

test("starts an import through one deterministic Railway request", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.start(startInput);
  const expectedKey = await deriveRailwayApiDeterministicIdempotencyKey(
    "contacts.import.start",
    startInput,
  );

  assert.deepEqual(result, { status: "ready", job });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "contacts.import.start",
    requestKind: "mutation",
    idempotencyKey: expectedKey,
    payload: startInput,
  }]);
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests),
    /tenantId|externalUserId|role|permission/,
  );
});

test("processes a bounded chunk and validates returned contacts", async () => {
  const importedContact = {
    id: 51,
    phoneNumber: "+972501234569",
    firstName: "Imported",
    lastName: null,
    email: null,
    company: "Connect",
    mailingStatus: "unsubscribed",
    consentStatus: "unknown",
    consentSource: null,
    consentRecordedAt: null,
    consentWithdrawnAt: null,
    version: 1,
  };
  const completed = {
    ...job,
    processedRows: 2,
    createdRows: 1,
    rejectedRows: 1,
    status: "completed",
  };
  const testFixture = fixture({
    responseFor: () => success(completed, [importedContact]),
  });
  const input = {
    jobId: 31,
    rows: [{
      sourceRowNumber: 2,
      phoneNumber: "+972501234569",
      firstName: "Imported",
      lastName: "",
      email: "",
      company: "Connect",
    }],
  };

  assert.deepEqual(await testFixture.handler.processChunk(input), {
    status: "processed",
    job: completed,
    contacts: [importedContact],
  });
  assert.equal(
    testFixture.calls.requests[0].operation,
    "contacts.import.chunk",
  );
});

test("stops unsafe input and missing configuration before identity", async () => {
  const invalid = fixture();
  const disabled = fixture({ applicationConfigured: false });

  assert.deepEqual(await invalid.handler.start({
    ...startInput,
    tenantId: 7,
  }), {
    status: "validation-error",
    issue: "invalid-start-input",
  });
  assert.deepEqual(await invalid.handler.processChunk({
    jobId: 31,
    rows: [{ sourceRowNumber: 2 }],
  }), {
    status: "validation-error",
    issue: "invalid-chunk-input",
  });
  assert.deepEqual(await disabled.handler.start(startInput), {
    status: "configuration-required",
  });
  assert.equal(invalid.calls.identities, 0);
  assert.equal(disabled.calls.configurations, 0);
});

test("maps bounded failures and rejects inconsistent replay responses", async () => {
  for (const [code, status] of [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["NOT_FOUND", "not-found"],
    ["CONFLICT", "conflict"],
    ["RATE_LIMITED", "server-error"],
  ]) {
    const testFixture = fixture({
      responseFor: () => ({
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code,
      }),
    });
    assert.deepEqual(await testFixture.handler.start(startInput), { status });
  }

  const unsafe = fixture({
    responseFor: () => success({
      ...job,
      processedRows: 2,
      status: "processing",
    }),
  });
  assert.deepEqual(await unsafe.handler.start(startInput), {
    status: "server-error",
  });
});

test("sanitizes client failures and rejects fallback dependencies", async () => {
  const failed = fixture({ clientError: new Error("private Railway address") });

  assert.deepEqual(await failed.handler.start(startInput), {
    status: "server-error",
  });
  assert.throws(
    () => createRailwayContactImportHandler({
      applicationConfigured: () => true,
      inspectConfiguration: () => configuredState,
      resolveIdentity: async () => authenticatedState,
      createClient() {},
      database: "forbidden-fallback",
    }),
    /dependencies are invalid/,
  );
});
