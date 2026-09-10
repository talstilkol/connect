import assert from "node:assert/strict";
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import test from "node:test";

import {
  botReplyStagingReceiptAttestationPolicyVersion,
  deriveBotReplyStagingReceiptAttestationKeyId,
  deriveBotReplyStagingReceiptAttestationNonce,
  deriveBotReplyStagingReceiptAttestationPayloadDigest,
  deriveBotReplyStagingReceiptDigest,
  serializeCanonicalBotReplyStagingReceipt,
  serializeBotReplyStagingReceiptAttestationPayload,
  verifyAndConsumeBotReplyStagingReceiptAttestation,
  verifyBotReplyStagingReceiptAttestation,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";

// Published RFC 8032 test vector 1. It is deliberately not a production key.
const rfc8032PrivateSeed =
  "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";
const ed25519Pkcs8Prefix = "302e020100300506032b657004220420";
const privateKey = createPrivateKey({
  key: Buffer.from(`${ed25519Pkcs8Prefix}${rfc8032PrivateSeed}`, "hex"),
  format: "der",
  type: "pkcs8",
});
const publicKeySpkiBase64Url = createPublicKey(privateKey)
  .export({ format: "der", type: "spki" })
  .toString("base64url");
const keyId = deriveBotReplyStagingReceiptAttestationKeyId(
  publicKeySpkiBase64Url,
);
const runKey = `bot_reply_staging_run_v1_${"1".repeat(64)}`;
const claimVersion = 7;
const requestDigest = `sha256:${"6".repeat(64)}`;
const releaseId = `connect_release_v1_${"2".repeat(64)}`;
const commitSha = "3".repeat(40);
const artifactDigest = `sha256:${"4".repeat(64)}`;
const expectedEvidenceVersion = 0;
const evidenceCoreDigest = `sha256:${"7".repeat(64)}`;
const auditKey =
  `bot_reply_staging_attestation_audit_v1_${"8".repeat(64)}`;
const issuedAt = "2026-08-25T09:00:00.000Z";
const signedAt = "2026-08-25T09:00:01.000Z";
const expiresAt = "2026-08-25T09:05:00.000Z";
const now = new Date("2026-08-25T09:02:00.000Z");

function receipt(overrides = {}) {
  return {
    schemaVersion: 1,
    runnerVersion: "connect-bot-reply-staging-runner-v1",
    runKey,
    releaseId,
    commitSha,
    artifactDigest,
    observedAt: "2026-08-25T08:59:59.000Z",
    result: {
      scenarioCount: 7,
      status: "passed",
    },
    ...overrides,
  };
}

function unsignedAttestation(
  attestedReceipt = receipt(),
  overrides = {},
) {
  const binding = {
    schemaVersion: 1,
    policyVersion: botReplyStagingReceiptAttestationPolicyVersion,
    algorithm: "Ed25519",
    audience: "connect-release-evidence-builder",
    environment: "staging",
    keyId,
    runKey,
    claimVersion,
    requestDigest,
    releaseId,
    commitSha,
    artifactDigest,
    expectedEvidenceVersion,
    receiptDigest: deriveBotReplyStagingReceiptDigest(attestedReceipt),
    evidenceCoreDigest,
    auditKey,
    nonceSequence: claimVersion,
    issuedAt,
    signedAt,
    expiresAt,
    signature: `ed25519:${"A".repeat(86)}`,
    ...overrides,
  };
  return {
    ...binding,
    nonce: deriveBotReplyStagingReceiptAttestationNonce(binding),
  };
}

function signedAttestation(attestedReceipt = receipt(), overrides = {}) {
  const unsigned = unsignedAttestation(attestedReceipt, overrides);
  const signature = sign(
    null,
    serializeBotReplyStagingReceiptAttestationPayload(unsigned),
    privateKey,
  ).toString("base64url");
  assert.equal(signature.length, 86);
  return {
    ...unsigned,
    signature: `ed25519:${signature}`,
  };
}

function expected(overrides = {}) {
  return {
    trustedKeyId: keyId,
    runKey,
    claimVersion,
    requestDigest,
    releaseId,
    commitSha,
    artifactDigest,
    expectedEvidenceVersion,
    evidenceCoreDigest,
    auditKey,
    ...overrides,
  };
}

function trustedKey(overrides = {}) {
  return {
    keyId,
    publicKeySpkiBase64Url,
    validFrom: "2026-08-01T00:00:00.000Z",
    validUntil: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function replayedNonce(overrides = {}) {
  const attestation = signedAttestation();
  return {
    status: "replayed",
    nonce: attestation.nonce,
    receiptDigest: deriveBotReplyStagingReceiptDigest(receipt()),
    evidenceCoreDigest,
    expectedEvidenceVersion,
    attestationPayloadDigest:
      deriveBotReplyStagingReceiptAttestationPayloadDigest(attestation),
    ...overrides,
  };
}

function fixture({
  attestedReceipt = receipt(),
  attestation = signedAttestation(attestedReceipt),
  expectedBinding = expected(),
  trustedKeys = [trustedKey()],
  currentTime = now,
  nonceResult,
  consumeNonce,
} = {}) {
  const claims = [];
  const resolvedNonceResult = nonceResult ?? {
    status: "consumed",
    attestationPayloadDigest:
      deriveBotReplyStagingReceiptAttestationPayloadDigest(attestation),
  };
  return {
    claims,
    verify: () => verifyAndConsumeBotReplyStagingReceiptAttestation({
      receipt: attestedReceipt,
      attestation,
      expected: expectedBinding,
      trustedKeys,
      dependencies: {
        clock: { now: () => currentTime },
        consumeNonce: consumeNonce ?? (async (claim) => {
          claims.push(claim);
          return resolvedNonceResult;
        }),
      },
    }),
  };
}

test("verifies Ed25519 binding before atomically consuming the nonce", async () => {
  const testFixture = fixture();
  const result = await testFixture.verify();

  const expectedNonce = signedAttestation().nonce;
  assert.deepEqual(result, {
    status: "verified",
    code: "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_VERIFIED",
    receiptDigest: deriveBotReplyStagingReceiptDigest(receipt()),
    keyId,
    nonce: expectedNonce,
    expiresAt,
    replayed: false,
  });
  assert.deepEqual(testFixture.claims, [{
    policyVersion: botReplyStagingReceiptAttestationPolicyVersion,
    keyId,
    runKey,
    claimVersion,
    requestDigest,
    releaseId,
    commitSha,
    artifactDigest,
    expectedEvidenceVersion,
    receiptDigest: deriveBotReplyStagingReceiptDigest(receipt()),
    evidenceCoreDigest,
    auditKey,
    nonce: expectedNonce,
    nonceSequence: claimVersion,
    issuedAt,
    signedAt,
    expiresAt,
    attestationPayloadDigest:
      deriveBotReplyStagingReceiptAttestationPayloadDigest(
        signedAttestation(),
      ),
  }]);
  assert.ok(Object.isFrozen(testFixture.claims[0]));
});

test("canonical receipt digest is order-independent and rejects non-JSON input", () => {
  const original = receipt();
  const reordered = {
    result: { status: "passed", scenarioCount: 7 },
    observedAt: original.observedAt,
    artifactDigest,
    commitSha,
    releaseId,
    runKey,
    runnerVersion: original.runnerVersion,
    schemaVersion: 1,
  };
  const canonicalReceipt = serializeCanonicalBotReplyStagingReceipt(original);
  assert.equal(
    serializeCanonicalBotReplyStagingReceipt(reordered),
    canonicalReceipt,
  );
  assert.notEqual(JSON.stringify(original), canonicalReceipt);
  assert.equal(
    deriveBotReplyStagingReceiptDigest(reordered),
    deriveBotReplyStagingReceiptDigest(original),
  );
  assert.equal(
    deriveBotReplyStagingReceiptDigest(original),
    `sha256:${createHash("sha256")
      .update(canonicalReceipt, "utf8")
      .digest("hex")}`,
  );
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest({ value: undefined }),
    /unsupported JSON value/,
  );
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(cyclic),
    /cyclic JSON value/,
  );
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(new Date(now)),
    /plain canonical JSON/,
  );
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(new Map()),
    /plain canonical JSON/,
  );
  const sparse = [];
  sparse.length = 1;
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(sparse),
    /dense canonical JSON/,
  );
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest({ value: "\ud800" }),
    /lone Unicode surrogate/,
  );
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest({ "\ud800": true }),
    /object key contains a lone Unicode surrogate/,
  );
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest({ value: "x".repeat(48_001) }),
    /canonicalization byte boundary/,
  );
  assert.match(
    deriveBotReplyStagingReceiptDigest("x".repeat(47_998)),
    /^sha256:/,
  );
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest("x".repeat(47_999)),
    /canonicalization byte boundary/,
  );
  assert.match(
    deriveBotReplyStagingReceiptDigest("é".repeat(23_999)),
    /^sha256:/,
  );
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest("é".repeat(24_000)),
    /canonicalization byte boundary/,
  );
  assert.match(
    deriveBotReplyStagingReceiptDigest("\u0000".repeat(7_999)),
    /^sha256:/,
  );
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest("\u0000".repeat(8_000)),
    /canonicalization byte boundary/,
  );
});

test("rejects array accessors and hidden properties without invoking getters", () => {
  let getterCalls = 0;
  const accessorArray = [];
  Object.defineProperty(accessorArray, "0", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "forbidden";
    },
  });
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(accessorArray),
    /dense canonical JSON/,
  );
  assert.equal(getterCalls, 0);

  const hidden = ["visible"];
  Object.defineProperty(hidden, "hidden", {
    enumerable: false,
    value: "forbidden",
  });
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(hidden),
    /dense canonical JSON/,
  );

  const symbolExtended = ["visible"];
  symbolExtended[Symbol("hidden")] = "forbidden";
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(symbolExtended),
    /dense canonical JSON/,
  );
});

test("rejects object accessors and hidden properties without invoking getters", () => {
  let getterCalls = 0;
  const accessorObject = {};
  Object.defineProperty(accessorObject, "value", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "forbidden";
    },
  });
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(accessorObject),
    /accessor properties/,
  );
  assert.equal(getterCalls, 0);

  const hidden = { visible: true };
  Object.defineProperty(hidden, "hidden", {
    enumerable: false,
    value: "forbidden",
  });
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(hidden),
    /accessor properties/,
  );

  const symbolExtended = { visible: true };
  symbolExtended[Symbol("hidden")] = "forbidden";
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(symbolExtended),
    /non-canonical properties/,
  );
});

test("enforces canonical depth at the documented boundary", () => {
  let accepted = "leaf";
  for (let index = 0; index < 32; index += 1) accepted = [accepted];
  assert.match(deriveBotReplyStagingReceiptDigest(accepted), /^sha256:/);

  let rejected = "leaf";
  for (let index = 0; index < 33; index += 1) rejected = [rejected];
  assert.throws(
    () => deriveBotReplyStagingReceiptDigest(rejected),
    /canonicalization bounds/,
  );
});

test("blocks receipt and release tampering before nonce storage", async () => {
  const originalReceipt = receipt();
  const attestation = signedAttestation(originalReceipt);
  const candidates = [
    fixture({
      attestedReceipt: receipt({ observedAt: "2026-08-25T08:59:58.000Z" }),
      attestation,
    }),
    fixture({
      attestedReceipt: originalReceipt,
      attestation,
      expectedBinding: expected({ commitSha: "6".repeat(40) }),
    }),
    fixture({
      attestedReceipt: originalReceipt,
      attestation,
      expectedBinding: expected({
        evidenceCoreDigest: `sha256:${"9".repeat(64)}`,
      }),
    }),
    fixture({
      attestedReceipt: originalReceipt,
      attestation: {
        ...attestation,
        nonce:
          `bot_reply_staging_attestation_nonce_v1_${"a".repeat(64)}`,
      },
    }),
    fixture({
      attestedReceipt: originalReceipt,
      attestation,
      expectedBinding: expected({
        trustedKeyId:
          `bot_reply_staging_worker_key_v1_${"b".repeat(64)}`,
      }),
    }),
  ];

  for (const candidate of candidates) {
    assert.deepEqual(await candidate.verify(), {
      status: "blocked",
      code: "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_BINDING_MISMATCH",
      receiptDigest: null,
      keyId: null,
      nonce: null,
      expiresAt: null,
      replayed: false,
    });
    assert.equal(candidate.claims.length, 0);
  }
});

test("blocks a forged signature and an untrusted or inactive key", async () => {
  const valid = signedAttestation();
  const forged = {
    ...valid,
    signature: `ed25519:B${valid.signature.slice(9)}`,
  };
  const inactive = trustedKey({
    validFrom: "2026-08-25T09:00:02.000Z",
  });
  const cases = [
    [fixture({ attestation: forged }),
      "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_SIGNATURE_INVALID"],
    [fixture({ trustedKeys: [] }),
      "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID"],
    [fixture({ trustedKeys: [inactive] }),
      "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_KEY_UNTRUSTED"],
  ];

  for (const [candidate, code] of cases) {
    assert.equal((await candidate.verify()).code, code);
    assert.equal(candidate.claims.length, 0);
  }
});

test("enforces short validity windows before consuming a nonce", async () => {
  const notYetValid = fixture({
    currentTime: new Date("2026-08-25T08:59:59.000Z"),
  });
  const expired = fixture({
    currentTime: new Date("2026-08-25T09:05:00.001Z"),
  });
  const excessiveLifetimeAttestation = signedAttestation(receipt(), {
    expiresAt: "2026-08-25T09:15:00.001Z",
  });
  const excessiveLifetime = fixture({
    attestation: excessiveLifetimeAttestation,
  });
  const signatureFromFuture = fixture({
    currentTime: new Date("2026-08-25T09:00:00.500Z"),
  });
  const exactExpiry = fixture({
    currentTime: new Date(expiresAt),
  });
  const zeroSigningWindow = fixture({
    attestation: signedAttestation(receipt(), {
      signedAt: expiresAt,
    }),
  });
  const keyExpiresBeforeEvidence = fixture({
    trustedKeys: [trustedKey({
      validUntil: "2026-08-25T09:04:59.999Z",
    })],
  });
  const revokedClockValue = Proxy.revocable(new Date(now), {});
  revokedClockValue.revoke();
  const hostileClock = fixture({
    currentTime: revokedClockValue.proxy,
  });

  assert.equal(
    (await notYetValid.verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NOT_YET_VALID",
  );
  assert.equal(
    (await expired.verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_EXPIRED",
  );
  assert.equal(
    (await excessiveLifetime.verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID",
  );
  assert.equal(
    (await signatureFromFuture.verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NOT_YET_VALID",
  );
  assert.equal(
    (await exactExpiry.verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_EXPIRED",
  );
  assert.equal(
    (await zeroSigningWindow.verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID",
  );
  assert.equal(
    (await keyExpiresBeforeEvidence.verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_KEY_UNTRUSTED",
  );
  assert.equal(
    (await hostileClock.verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID",
  );
  assert.equal(notYetValid.claims.length, 0);
  assert.equal(expired.claims.length, 0);
  assert.equal(excessiveLifetime.claims.length, 0);
  assert.equal(signatureFromFuture.claims.length, 0);
  assert.equal(exactExpiry.claims.length, 0);
  assert.equal(zeroSigningWindow.claims.length, 0);
  assert.equal(keyExpiresBeforeEvidence.claims.length, 0);
  assert.equal(hostileClock.claims.length, 0);
});

test("returns exact nonce replay idempotently and fails closed otherwise", async () => {
  assert.equal(
    (await fixture({ nonceResult: replayedNonce() }).verify()).replayed,
    true,
  );
  assert.equal(
    (await fixture({
      nonceResult: replayedNonce({
        evidenceCoreDigest: `sha256:${"a".repeat(64)}`,
      }),
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NONCE_CONFLICT",
  );
  assert.equal(
    (await fixture({
      nonceResult: {
        status: "consumed",
        attestationPayloadDigest: `sha256:${"b".repeat(64)}`,
      },
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NONCE_CONFLICT",
  );
  const shiftedAttestation = signedAttestation(receipt(), {
    issuedAt: "2026-08-25T09:00:30.000Z",
    signedAt: "2026-08-25T09:00:31.000Z",
    expiresAt: "2026-08-25T09:05:30.000Z",
  });
  assert.equal(shiftedAttestation.nonce, signedAttestation().nonce);
  assert.equal(
    (await fixture({
      attestation: shiftedAttestation,
      nonceResult: replayedNonce(),
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NONCE_CONFLICT",
  );
  assert.equal(
    (await fixture({ nonceResult: { status: "conflict" } }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NONCE_CONFLICT",
  );
  assert.equal(
    (await fixture({
      consumeNonce: async () => {
        throw new Error("storage unavailable");
      },
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_DEPENDENCY_UNAVAILABLE",
  );
});

test("fails closed for accessor and Proxy envelopes without reading them", async () => {
  let accessorCalls = 0;
  const accessorAttestation = { ...signedAttestation() };
  Object.defineProperty(accessorAttestation, "receiptDigest", {
    enumerable: true,
    get() {
      accessorCalls += 1;
      return deriveBotReplyStagingReceiptDigest(receipt());
    },
  });
  assert.equal(
    (await fixture({
      attestation: accessorAttestation,
      nonceResult: { status: "conflict" },
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID",
  );
  assert.equal(accessorCalls, 0);

  let proxyReads = 0;
  const proxiedAttestation = new Proxy(signedAttestation(), {
    get(target, property, receiver) {
      proxyReads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  assert.equal(
    (await fixture({
      attestation: proxiedAttestation,
      nonceResult: { status: "conflict" },
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID",
  );
  assert.equal(proxyReads, 0);

  const revoked = Proxy.revocable(signedAttestation(), {});
  revoked.revoke();
  assert.equal(
    (await fixture({
      attestation: revoked.proxy,
      nonceResult: { status: "conflict" },
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID",
  );

  const proxiedNonceResult = new Proxy({ status: "consumed" }, {});
  assert.equal(
    (await fixture({ nonceResult: proxiedNonceResult }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_DEPENDENCY_UNAVAILABLE",
  );
});

test("rejects schema extensions and non-public trusted key material", async () => {
  const extended = {
    ...signedAttestation(),
    operatorOverride: true,
  };
  const protoExtended = { ...signedAttestation() };
  Object.defineProperty(protoExtended, "__proto__", {
    configurable: true,
    enumerable: true,
    value: null,
    writable: true,
  });
  const privateKeyPkcs8Base64Url = privateKey
    .export({ format: "der", type: "pkcs8" })
    .toString("base64url");

  assert.equal(
    (await fixture({
      attestation: extended,
      nonceResult: { status: "conflict" },
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID",
  );
  assert.equal(
    (await fixture({
      attestation: protoExtended,
      nonceResult: { status: "conflict" },
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID",
  );
  assert.equal(
    (await fixture({
      trustedKeys: [trustedKey({
        publicKeySpkiBase64Url: privateKeyPkcs8Base64Url,
      })],
    }).verify()).code,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID",
  );
});

test("supports stateless verification without consuming the nonce", () => {
  const attestedReceipt = receipt();
  const result = verifyBotReplyStagingReceiptAttestation({
    receipt: attestedReceipt,
    attestation: signedAttestation(attestedReceipt),
    expected: expected(),
    trustedKeys: [trustedKey()],
    clock: { now: () => now },
  });
  assert.deepEqual(result, {
    status: "signature-valid-only",
    code: "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_SIGNATURE_VALID_ONLY",
    receiptDigest: deriveBotReplyStagingReceiptDigest(attestedReceipt),
    keyId,
    nonce: signedAttestation(attestedReceipt).nonce,
    expiresAt,
    replayProtected: false,
  });
  assert.equal("replayed" in result, false);
});

test("contains no randomized identity path", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(
      new URL(
        "../server/operations/botReplyStagingReceiptAttestation.ts",
        import.meta.url,
      ),
      "utf8",
    )
  );
  assert.doesNotMatch(source, /Math\.random|crypto\.randomUUID|randomBytes/);
});
