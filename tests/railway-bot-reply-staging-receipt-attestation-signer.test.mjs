import assert from "node:assert/strict";
import {
  createPrivateKey,
  createPublicKey,
} from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  deriveBotReplyStagingReceiptAttestationKeyId,
  verifyBotReplyStagingReceiptAttestation,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  createRailwayBotReplyStagingReceiptAttestationSigner,
  RailwayBotReplyStagingReceiptAttestationSignerError,
  railwayBotReplyStagingReceiptAttestationSignerVersion,
} from "../server/platform/railwayBotReplyStagingReceiptAttestationSigner.ts";

// Published RFC 8032 test vector 1; never use this key outside tests.
const rfc8032PrivateSeed =
  "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";
const privateKeyPkcs8Base64Url = createPrivateKey({
  key: Buffer.from(
    `302e020100300506032b657004220420${rfc8032PrivateSeed}`,
    "hex",
  ),
  format: "der",
  type: "pkcs8",
}).export({ format: "der", type: "pkcs8" }).toString("base64url");
const publicKeySpkiBase64Url = createPublicKey(createPrivateKey({
  key: Buffer.from(privateKeyPkcs8Base64Url, "base64url"),
  format: "der",
  type: "pkcs8",
})).export({ format: "der", type: "spki" }).toString("base64url");
const keyId = deriveBotReplyStagingReceiptAttestationKeyId(
  publicKeySpkiBase64Url,
);
const now = new Date("2026-08-25T10:00:00.000Z");
const runKey = `bot_reply_staging_run_v1_${"1".repeat(64)}`;
const requestDigest = `sha256:${"2".repeat(64)}`;
const releaseId = `connect_release_v1_${"3".repeat(64)}`;
const commitSha = "4".repeat(40);
const artifactDigest = `sha256:${"5".repeat(64)}`;
const evidenceCoreDigest = `sha256:${"6".repeat(64)}`;
const auditKey =
  `bot_reply_staging_attestation_audit_v1_${"7".repeat(64)}`;

function receipt() {
  return {
    schemaVersion: 1,
    runKey,
    releaseId,
    commitSha,
    artifactDigest,
    scenarioCount: 7,
    status: "passed",
  };
}

function configuration(overrides = {}) {
  return {
    privateKeyPkcs8Base64Url,
    expectedKeyId: keyId,
    keyValidFrom: "2026-08-01T00:00:00.000Z",
    keyValidUntil: "2026-09-01T00:00:00.000Z",
    clock: { now: () => now },
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    receipt: receipt(),
    runKey,
    claimVersion: 11,
    requestDigest,
    releaseId,
    commitSha,
    artifactDigest,
    expectedEvidenceVersion: 0,
    evidenceCoreDigest,
    auditKey,
    lifetimeSeconds: 300,
    ...overrides,
  };
}

function expectsSignerError(code) {
  return (error) =>
    error instanceof RailwayBotReplyStagingReceiptAttestationSignerError &&
    error.code === code && !error.message.includes(privateKeyPkcs8Base64Url);
}

test("signs a deterministic evidence-core-bound Ed25519 attestation", () => {
  const signer =
    createRailwayBotReplyStagingReceiptAttestationSigner(configuration());
  const first = signer.sign(input());
  const second = signer.sign(input());

  assert.equal(
    signer.signerVersion,
    railwayBotReplyStagingReceiptAttestationSignerVersion,
  );
  assert.equal(signer.keyId, keyId);
  assert.deepEqual(first, second);
  assert.equal(first.keyId, keyId);
  assert.equal(first.claimVersion, 11);
  assert.equal(first.nonceSequence, first.claimVersion);
  assert.equal(first.evidenceCoreDigest, evidenceCoreDigest);
  assert.equal(first.issuedAt, now.toISOString());
  assert.equal(first.signedAt, now.toISOString());
  assert.equal(first.expiresAt, "2026-08-25T10:05:00.000Z");
  assert.match(first.signature, /^ed25519:[A-Za-z0-9_-]{86}$/);
  assert.doesNotMatch(JSON.stringify(first), new RegExp(privateKeyPkcs8Base64Url));
  assert.ok(Object.isFrozen(first));
});

test("produces an attestation accepted by the stateless verifier", () => {
  const signer =
    createRailwayBotReplyStagingReceiptAttestationSigner(configuration());
  const attestation = signer.sign(input());
  const verification = verifyBotReplyStagingReceiptAttestation({
    receipt: receipt(),
    attestation,
    expected: {
      trustedKeyId: keyId,
      runKey,
      claimVersion: 11,
      requestDigest,
      releaseId,
      commitSha,
      artifactDigest,
      expectedEvidenceVersion: 0,
      evidenceCoreDigest,
      auditKey,
    },
    trustedKeys: [{
      keyId,
      publicKeySpkiBase64Url,
      validFrom: "2026-08-01T00:00:00.000Z",
      validUntil: "2026-09-01T00:00:00.000Z",
    }],
    clock: { now: () => now },
  });

  assert.equal(verification.status, "signature-valid-only");
  assert.equal(verification.replayProtected, false);
});

test("rejects malformed, mismatched and extended key configuration", () => {
  const cases = [
    configuration({ privateKeyPkcs8Base64Url: "invalid" }),
    configuration({
      expectedKeyId:
        `bot_reply_staging_worker_key_v1_${"8".repeat(64)}`,
    }),
    configuration({
      keyValidUntil: "2026-07-01T00:00:00.000Z",
    }),
    {
      ...configuration(),
      publicKey: publicKeySpkiBase64Url,
    },
  ];
  for (const candidate of cases) {
    assert.throws(
      () => createRailwayBotReplyStagingReceiptAttestationSigner(candidate),
      expectsSignerError("configuration-invalid"),
    );
  }
});

test("rejects accessor and Proxy configuration without reading secrets", () => {
  let accessorCalls = 0;
  const accessorConfiguration = configuration();
  Object.defineProperty(accessorConfiguration, "privateKeyPkcs8Base64Url", {
    enumerable: true,
    get() {
      accessorCalls += 1;
      return privateKeyPkcs8Base64Url;
    },
  });
  assert.throws(
    () => createRailwayBotReplyStagingReceiptAttestationSigner(
      accessorConfiguration,
    ),
    expectsSignerError("configuration-invalid"),
  );
  assert.equal(accessorCalls, 0);

  let proxyReads = 0;
  const proxiedConfiguration = new Proxy(configuration(), {
    get(target, property, receiver) {
      proxyReads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  assert.throws(
    () => createRailwayBotReplyStagingReceiptAttestationSigner(
      proxiedConfiguration,
    ),
    expectsSignerError("configuration-invalid"),
  );
  assert.equal(proxyReads, 0);

  const protoExtended = configuration();
  Object.defineProperty(protoExtended, "__proto__", {
    configurable: true,
    enumerable: true,
    value: null,
    writable: true,
  });
  assert.throws(
    () => createRailwayBotReplyStagingReceiptAttestationSigner(protoExtended),
    expectsSignerError("configuration-invalid"),
  );
});

test("rejects invalid input before returning an attestation", () => {
  const signer =
    createRailwayBotReplyStagingReceiptAttestationSigner(configuration());
  const cases = [
    input({ lifetimeSeconds: 59 }),
    input({ claimVersion: 0 }),
    input({ evidenceCoreDigest: `sha256:${"z".repeat(64)}` }),
    input({ runKey: Symbol("invalid") }),
    input({ claimVersion: 1n }),
    { ...input(), accessToken: "forbidden" },
  ];
  for (const candidate of cases) {
    assert.throws(
      () => signer.sign(candidate),
      expectsSignerError("input-invalid"),
    );
  }
});

test("rejects accessor and Proxy signer inputs without invoking traps", () => {
  const signer =
    createRailwayBotReplyStagingReceiptAttestationSigner(configuration());
  let accessorCalls = 0;
  const accessorInput = input();
  Object.defineProperty(accessorInput, "claimVersion", {
    enumerable: true,
    get() {
      accessorCalls += 1;
      return 11;
    },
  });
  assert.throws(
    () => signer.sign(accessorInput),
    expectsSignerError("input-invalid"),
  );
  assert.equal(accessorCalls, 0);

  let proxyReads = 0;
  const proxiedInput = new Proxy(input(), {
    get(target, property, receiver) {
      proxyReads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  assert.throws(
    () => signer.sign(proxiedInput),
    expectsSignerError("input-invalid"),
  );
  assert.equal(proxyReads, 0);

  const proxiedReceiptInput = input({
    receipt: new Proxy(receipt(), {
      get() {
        proxyReads += 1;
        return "forbidden";
      },
    }),
  });
  assert.throws(
    () => signer.sign(proxiedReceiptInput),
    expectsSignerError("input-invalid"),
  );
  assert.equal(proxyReads, 0);
});

test("blocks signing outside the configured key lifetime", () => {
  const before = createRailwayBotReplyStagingReceiptAttestationSigner(
    configuration({
      clock: { now: () => new Date("2026-07-31T23:59:59.999Z") },
    }),
  );
  const nearExpiry = createRailwayBotReplyStagingReceiptAttestationSigner(
    configuration({
      clock: { now: () => new Date("2026-08-31T23:59:00.001Z") },
    }),
  );
  assert.throws(
    () => before.sign(input()),
    expectsSignerError("key-not-active"),
  );
  assert.throws(
    () => nearExpiry.sign(input()),
    expectsSignerError("key-not-active"),
  );

  const revokedClockValue = Proxy.revocable(new Date(now), {});
  revokedClockValue.revoke();
  const hostileClock = createRailwayBotReplyStagingReceiptAttestationSigner(
    configuration({
      clock: { now: () => revokedClockValue.proxy },
    }),
  );
  assert.throws(
    () => hostileClock.sign(input()),
    expectsSignerError("configuration-invalid"),
  );
});

test("contains no runtime key generation or randomized identity path", async () => {
  const source = await readFile(
    new URL(
      "../server/platform/railwayBotReplyStagingReceiptAttestationSigner.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /Math\.random|crypto\.randomUUID|randomBytes|generateKeyPair/,
  );
  assert.match(source, /canonicalPrivateKeyBytes\.fill\(0\)/);
  assert.match(source, /keyBytes\.fill\(0\)/);
});

test("keeps the signer dormant outside its isolated module", async () => {
  const projectRoot = new URL("../", import.meta.url);
  const signerFile =
    "server/platform/railwayBotReplyStagingReceiptAttestationSigner.ts";
  const sourceRoots = ["app", "db", "features", "server", "shared", "worker"];

  async function listSourceFiles(relativeDirectory) {
    const entries = await readdir(new URL(`${relativeDirectory}/`, projectRoot), {
      withFileTypes: true,
    });
    const files = [];
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) {
        files.push(...await listSourceFiles(relativePath));
      } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
        files.push(relativePath);
      }
    }
    return files;
  }

  const sourceFiles = (await Promise.all(
    sourceRoots.map(listSourceFiles),
  )).flat();
  const importers = [];
  for (const sourceFile of sourceFiles) {
    if (sourceFile === signerFile) continue;
    const source = await readFile(new URL(sourceFile, projectRoot), "utf8");
    if (source.includes("railwayBotReplyStagingReceiptAttestationSigner")) {
      importers.push(sourceFile);
    }
  }
  assert.deepEqual(importers, []);
});
