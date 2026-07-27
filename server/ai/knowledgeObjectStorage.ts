import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

const SOURCE_KEY_PATTERN =
  /^knowledge_source_v1_[0-9a-f]{64}$/;
const CONTENT_DIGEST_PATTERN =
  /^[0-9a-f]{64}$/;
const MEDIA_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;

export interface R2HttpMetadata {
  contentType?: string;
}

export interface R2ObjectMetadata {
  key: string;
  size: number;
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBody
  extends R2ObjectMetadata {
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2PutOptions {
  sha256?: string | ArrayBuffer;
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2BucketBinding {
  head(
    key: string,
  ): Promise<R2ObjectMetadata | null>;
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value:
      | ArrayBuffer
      | ArrayBufferView
      | ReadableStream<Uint8Array>,
    options?: R2PutOptions,
  ): Promise<R2ObjectMetadata | null>;
  delete(key: string): Promise<void>;
}

export interface StoreKnowledgeObjectInput {
  sourceKey: string;
  contentSha256: string;
  mediaType: string;
  bytes: ArrayBuffer;
}

export interface StoredKnowledgeObject {
  storageObjectKey: string;
  contentSha256: string;
  mediaType: string;
  sizeBytes: number;
}

export interface KnowledgeObjectStorage {
  store(
    input: StoreKnowledgeObjectInput,
  ): Promise<StoredKnowledgeObject>;
  read(
    expected: StoredKnowledgeObject,
  ): Promise<ArrayBuffer>;
}

function objectKey(sourceKey: string): string {
  return `knowledge/v1/${sourceKey}`;
}

function normalizeMediaType(
  value: string,
): string {
  if (typeof value !== "string") {
    throw new Error("mediaType is invalid");
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized.length > 255 ||
    !MEDIA_TYPE_PATTERN.test(normalized)
  ) {
    throw new Error("mediaType is invalid");
  }

  return normalized;
}

function validateIdentity(
  sourceKey: string,
  contentSha256: string,
): void {
  if (!SOURCE_KEY_PATTERN.test(sourceKey)) {
    throw new Error("sourceKey is invalid");
  }

  if (!CONTENT_DIGEST_PATTERN.test(contentSha256)) {
    throw new Error("contentSha256 is invalid");
  }
}

function metadataMatches(
  metadata: R2ObjectMetadata,
  expected: StoredKnowledgeObject,
): boolean {
  return (
    metadata.key === expected.storageObjectKey &&
    metadata.size === expected.sizeBytes &&
    metadata.httpMetadata?.contentType ===
      expected.mediaType &&
    metadata.customMetadata?.sourceKey ===
      expected.storageObjectKey.slice(
        "knowledge/v1/".length,
      ) &&
    metadata.customMetadata?.contentSha256 ===
      expected.contentSha256
  );
}

export function createR2KnowledgeObjectStorage(
  bucket: R2BucketBinding,
): KnowledgeObjectStorage {
  return {
    async store(input) {
      validateIdentity(
        input.sourceKey,
        input.contentSha256,
      );
      const mediaType = normalizeMediaType(
        input.mediaType,
      );

      if (
        !(input.bytes instanceof ArrayBuffer) ||
        input.bytes.byteLength <= 0
      ) {
        throw new Error("bytes are invalid");
      }

      const actualDigest = await sha256Hex(
        input.bytes,
      );

      if (actualDigest !== input.contentSha256) {
        throw new Error(
          "knowledge object digest does not match",
        );
      }

      const expected: StoredKnowledgeObject = {
        storageObjectKey: objectKey(input.sourceKey),
        contentSha256: input.contentSha256,
        mediaType,
        sizeBytes: input.bytes.byteLength,
      };

      try {
        await bucket.put(
          expected.storageObjectKey,
          input.bytes,
          {
            sha256: input.contentSha256,
            httpMetadata: {
              contentType: mediaType,
            },
            customMetadata: {
              sourceKey: input.sourceKey,
              contentSha256:
                input.contentSha256,
            },
          },
        );

        const stored = await bucket.head(
          expected.storageObjectKey,
        );

        if (
          !stored ||
          !metadataMatches(stored, expected)
        ) {
          throw new Error(
            "stored knowledge object metadata does not match",
          );
        }
      } catch {
        throw new Error(
          "R2 knowledge object write verification failed",
        );
      }

      return expected;
    },

    async read(expected) {
      validateIdentity(
        expected.storageObjectKey.slice(
          "knowledge/v1/".length,
        ),
        expected.contentSha256,
      );
      const mediaType = normalizeMediaType(
        expected.mediaType,
      );

      if (
        expected.storageObjectKey !==
          objectKey(
            expected.storageObjectKey.slice(
              "knowledge/v1/".length,
            ),
          ) ||
        !Number.isSafeInteger(expected.sizeBytes) ||
        expected.sizeBytes <= 0 ||
        mediaType !== expected.mediaType
      ) {
        throw new Error(
          "knowledge object expectation is invalid",
        );
      }

      let stored: R2ObjectBody | null;

      try {
        stored = await bucket.get(
          expected.storageObjectKey,
        );
      } catch {
        throw new Error(
          "R2 knowledge object read failed",
        );
      }

      if (
        !stored ||
        !metadataMatches(stored, expected)
      ) {
        throw new Error(
          "R2 knowledge object is missing or inconsistent",
        );
      }

      let bytes: ArrayBuffer;

      try {
        bytes = await stored.arrayBuffer();
      } catch {
        throw new Error(
          "R2 knowledge object body read failed",
        );
      }

      if (
        bytes.byteLength !== expected.sizeBytes ||
        (await sha256Hex(bytes)) !==
          expected.contentSha256
      ) {
        throw new Error(
          "R2 knowledge object integrity check failed",
        );
      }

      return bytes;
    },
  };
}
