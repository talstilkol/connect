import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaCredentialVault,
  inspectMetaCredentialEncryptionConfiguration,
  MetaCredentialVaultError,
} from "../server/meta/metaCredentialVault.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";

const encryptionKey = Buffer.from(
  Array.from({ length: 32 }, (_, index) => index + 1),
).toString("base64");
const otherEncryptionKey = Buffer.from(
  Array.from({ length: 32 }, (_, index) => index + 33),
).toString("base64");

function deterministicCrypto() {
  return {
    subtle: crypto.subtle,
    getRandomValues(target) {
      target.set([
        1, 2, 3, 4, 5, 6,
        7, 8, 9, 10, 11, 12,
      ]);
      return target;
    },
  };
}

function createMemoryRepository() {
  const envelopes = new Map();

  return {
    envelopes,
    async store(input) {
      envelopes.set(input.tenantId, {
        ...input,
        createdAt: "2026-07-25 10:00:00",
        updatedAt: "2026-07-25 10:00:00",
      });
    },
    async findByTenantId(tenantId) {
      return envelopes.get(tenantId) ?? null;
    },
  };
}

test("encrypts a Meta token before storage and decrypts it only inside a callback", async () => {
  const repository = createMemoryRepository();
  const vault = createMetaCredentialVault(
    repository,
    {
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    },
    {
      crypto: deterministicCrypto(),
    },
  );
  const accessToken = toSensitiveMetaAccessToken(
    "sensitive-meta-access-token",
  );

  await vault.storeAccessToken(7, accessToken);

  const stored = repository.envelopes.get(7);
  assert.equal(stored.keyVersion, "v1");
  assert.equal(stored.initializationVector, "AQIDBAUGBwgJCgsM");
  assert.doesNotMatch(
    JSON.stringify(stored),
    /sensitive-meta-access-token/,
  );

  const result = await vault.withAccessToken(
    7,
    async (decryptedToken) => {
      assert.equal(
        decryptedToken,
        "sensitive-meta-access-token",
      );
      return "operation-complete";
    },
  );

  assert.equal(result, "operation-complete");
});

test("binds ciphertext authentication to the tenant ID", async () => {
  const repository = createMemoryRepository();
  const vault = createMetaCredentialVault(
    repository,
    {
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    },
    {
      crypto: deterministicCrypto(),
    },
  );

  await vault.storeAccessToken(
    7,
    toSensitiveMetaAccessToken("tenant-seven-token"),
  );
  repository.envelopes.set(8, {
    ...repository.envelopes.get(7),
    tenantId: 8,
  });

  await assert.rejects(
    vault.withAccessToken(8, async () => "must-not-run"),
    (error) =>
      error instanceof MetaCredentialVaultError &&
      error.code === "DECRYPTION_FAILED",
  );
});

test("rejects tampered ciphertext and a different encryption key", async () => {
  const repository = createMemoryRepository();
  const vault = createMetaCredentialVault(
    repository,
    {
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    },
    {
      crypto: deterministicCrypto(),
    },
  );

  await vault.storeAccessToken(
    7,
    toSensitiveMetaAccessToken("protected-token"),
  );
  const originalEnvelope = repository.envelopes.get(7);
  const firstCharacter =
    originalEnvelope.ciphertext[0] === "A" ? "B" : "A";
  repository.envelopes.set(7, {
    ...originalEnvelope,
    ciphertext:
      firstCharacter +
      originalEnvelope.ciphertext.slice(1),
  });

  await assert.rejects(
    vault.withAccessToken(7, async () => "must-not-run"),
    (error) =>
      error instanceof MetaCredentialVaultError &&
      error.code === "DECRYPTION_FAILED",
  );

  repository.envelopes.set(7, originalEnvelope);
  const wrongKeyVault = createMetaCredentialVault(
    repository,
    {
      META_CREDENTIAL_ENCRYPTION_KEY_V1:
        otherEncryptionKey,
    },
    {
      crypto: deterministicCrypto(),
    },
  );

  await assert.rejects(
    wrongKeyVault.withAccessToken(
      7,
      async () => "must-not-run",
    ),
    (error) =>
      error instanceof MetaCredentialVaultError &&
      error.code === "DECRYPTION_FAILED",
  );
});

test("reports missing credentials and repository failures with bounded codes", async () => {
  const missingRepository = createMemoryRepository();
  const vault = createMetaCredentialVault(
    missingRepository,
    {
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    },
    {
      crypto: deterministicCrypto(),
    },
  );

  await assert.rejects(
    vault.withAccessToken(7, async () => "must-not-run"),
    (error) =>
      error instanceof MetaCredentialVaultError &&
      error.code === "CREDENTIAL_NOT_FOUND",
  );

  const failingRepository = {
    async store() {
      throw new Error("private database failure");
    },
    async findByTenantId() {
      throw new Error("private database failure");
    },
  };
  const failingVault = createMetaCredentialVault(
    failingRepository,
    {
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    },
    {
      crypto: deterministicCrypto(),
    },
  );

  await assert.rejects(
    failingVault.storeAccessToken(
      7,
      toSensitiveMetaAccessToken("protected-token"),
    ),
    (error) => {
      assert.equal(error.code, "STORAGE_FAILED");
      assert.doesNotMatch(
        JSON.stringify(error),
        /private database failure|protected-token/,
      );
      return true;
    },
  );
  await assert.rejects(
    failingVault.withAccessToken(
      7,
      async () => "must-not-run",
    ),
    (error) => error.code === "STORAGE_FAILED",
  );
});

test("rejects invalid encryption configuration without touching storage", () => {
  let repositoryCalls = 0;
  const repository = {
    async store() {
      repositoryCalls += 1;
    },
    async findByTenantId() {
      repositoryCalls += 1;
      return null;
    },
  };

  assert.equal(
    inspectMetaCredentialEncryptionConfiguration({
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    }),
    "configured",
  );
  assert.equal(
    inspectMetaCredentialEncryptionConfiguration({}),
    "invalid",
  );
  assert.equal(
    inspectMetaCredentialEncryptionConfiguration({
      META_CREDENTIAL_ENCRYPTION_KEY_V1:
        "not-a-base64-aes-key",
    }),
    "invalid",
  );
  assert.throws(
    () =>
      createMetaCredentialVault(
        repository,
        {},
        {
          crypto: deterministicCrypto(),
        },
      ),
    (error) =>
      error instanceof MetaCredentialVaultError &&
      error.code === "INVALID_CONFIGURATION",
  );
  assert.equal(repositoryCalls, 0);
});

test("preserves callback failures after successful decryption", async () => {
  const repository = createMemoryRepository();
  const vault = createMetaCredentialVault(
    repository,
    {
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    },
    {
      crypto: deterministicCrypto(),
    },
  );

  await vault.storeAccessToken(
    7,
    toSensitiveMetaAccessToken("protected-token"),
  );

  await assert.rejects(
    vault.withAccessToken(7, async () => {
      throw new Error("subscriber failure");
    }),
    /subscriber failure/,
  );
});
