import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageTemplateSubmissionQueueMessage,
  parseMessageTemplateSubmissionQueueMessage,
} from "../server/templates/messageTemplateSubmissionQueueMessage.ts";

const submissionKey = `template_submission_v1_${"a".repeat(64)}`;

test("creates and parses the exact message template submission queue contract", () => {
  const message = createMessageTemplateSubmissionQueueMessage(7, submissionKey);

  assert.deepEqual(message, {
    version: 1,
    tenantId: 7,
    submissionKey,
  });
  assert.deepEqual(parseMessageTemplateSubmissionQueueMessage(message), message);
});

test("rejects malformed, extended, and cross-version queue messages", () => {
  for (const value of [
    null,
    [],
    {},
    { version: 2, tenantId: 7, submissionKey },
    { version: 1, tenantId: 0, submissionKey },
    { version: 1, tenantId: 7, submissionKey: "invalid" },
    { version: 1, tenantId: 7, submissionKey, extra: true },
  ]) {
    assert.equal(parseMessageTemplateSubmissionQueueMessage(value), null);
  }
});

test("rejects inherited, accessor, symbolic, and non-enumerable fields", () => {
  const inherited = Object.assign(
    Object.create({ submissionKey }),
    {
      version: 1,
      tenantId: 7,
      extra: true,
    },
  );
  const accessor = {
    tenantId: 7,
    submissionKey,
    get version() {
      throw new Error("must not execute queue getters");
    },
  };
  const symbolic = {
    version: 1,
    tenantId: 7,
    submissionKey,
    [Symbol("extra")]: true,
  };
  const nonEnumerable = {
    version: 1,
    tenantId: 7,
  };
  Object.defineProperty(
    nonEnumerable,
    "submissionKey",
    {
      value: submissionKey,
      enumerable: false,
    },
  );

  for (const value of [
    inherited,
    accessor,
    symbolic,
    nonEnumerable,
  ]) {
    assert.equal(
      parseMessageTemplateSubmissionQueueMessage(value),
      null,
    );
  }
});

test("fails closed when proxy reflection is hostile", () => {
  const target = {
    version: 1,
    tenantId: 7,
    submissionKey,
  };
  const revokedObject = Proxy.revocable(target, {});
  const revokedArray = Proxy.revocable([], {});
  revokedObject.revoke();
  revokedArray.revoke();

  for (const value of [
    new Proxy(target, {
      ownKeys() {
        throw new Error("hostile ownKeys trap");
      },
    }),
    new Proxy(target, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile descriptor trap");
      },
    }),
    revokedObject.proxy,
    revokedArray.proxy,
  ]) {
    assert.equal(
      parseMessageTemplateSubmissionQueueMessage(value),
      null,
    );
  }
});
