import assert from "node:assert/strict";
import test from "node:test";

import {
  createR2KnowledgeObjectStorage,
} from "../server/ai/knowledgeObjectStorage.ts";
import {
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";

class MemoryR2Bucket {
  constructor() {
    this.objects = new Map();
    this.lastPut = null;
  }

  async put(key, value, options) {
    const bytes =
      value instanceof ArrayBuffer
        ? value.slice(0)
        : value.buffer.slice(
            value.byteOffset,
            value.byteOffset + value.byteLength,
          );
    const metadata = {
      key,
      size: bytes.byteLength,
      httpMetadata: options?.httpMetadata,
      customMetadata: options?.customMetadata,
    };

    this.objects.set(key, {
      bytes,
      metadata,
    });
    this.lastPut = {
      key,
      options,
    };

    return metadata;
  }

  async head(key) {
    return this.objects.get(key)?.metadata ?? null;
  }

  async get(key) {
    const object = this.objects.get(key);

    if (!object) {
      return null;
    }

    return {
      ...object.metadata,
      async arrayBuffer() {
        return object.bytes.slice(0);
      },
    };
  }

  async delete(key) {
    this.objects.delete(key);
  }
}

async function storageInput() {
  const bytes = new TextEncoder().encode(
    "תוכן מקור ידע מאושר",
  ).buffer;
  const contentSha256 = await sha256Hex(bytes);
  const sourceKey =
    await deriveKnowledgeSourceKey(
      7,
      contentSha256,
    );

  return {
    sourceKey,
    contentSha256,
    mediaType: "application/pdf",
    bytes,
  };
}

test("stores an R2 knowledge object under a deterministic key with integrity metadata", async () => {
  const bucket = new MemoryR2Bucket();
  const storage =
    createR2KnowledgeObjectStorage(bucket);
  const input = await storageInput();
  const stored = await storage.store(input);

  assert.equal(
    stored.storageObjectKey,
    `knowledge/v1/${input.sourceKey}`,
  );
  assert.equal(
    bucket.lastPut.options.sha256,
    input.contentSha256,
  );
  assert.equal(
    bucket.lastPut.options.httpMetadata.contentType,
    "application/pdf",
  );
  assert.deepEqual(
    bucket.lastPut.options.customMetadata,
    {
      sourceKey: input.sourceKey,
      contentSha256: input.contentSha256,
    },
  );
  assert.deepEqual(
    new Uint8Array(await storage.read(stored)),
    new Uint8Array(input.bytes),
  );
});

test("rejects mismatched upload digests and corrupted R2 reads", async () => {
  const bucket = new MemoryR2Bucket();
  const storage =
    createR2KnowledgeObjectStorage(bucket);
  const input = await storageInput();

  await assert.rejects(
    storage.store({
      ...input,
      contentSha256: "a".repeat(64),
    }),
    /digest does not match/,
  );

  const stored = await storage.store(input);
  const object = bucket.objects.get(
    stored.storageObjectKey,
  );

  object.bytes = new TextEncoder().encode(
    "תוכן ששונה לאחר השמירה",
  ).buffer;

  await assert.rejects(
    storage.read(stored),
    /integrity check failed/,
  );
});

