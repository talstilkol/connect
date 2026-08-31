import assert from "node:assert/strict";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  inspectSourceGuardrails,
} from "../scripts/verify-source-guardrails.mjs";
import * as compositionModule from
  "../server/platform/railwayBotReplyPinnedBoundaryComposition.ts";

const {
  createRailwayBotReplyPinnedBoundaryComposition,
  railwayBotReplyPinnedBoundaryCompositionStatus,
} = compositionModule;

const compositionRelativePath =
  "server/platform/railwayBotReplyPinnedBoundaryComposition.ts";
const driverRelativePath =
  "server/platform/railwayBotReplyPinnedBoundaryDriver.ts";
const transportRelativePath =
  "server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";

function validFixture(overrides = {}) {
  const calls = [];
  const pool = overrides.pool ?? {
    connect() {
      calls.push("connect");
      throw new Error("construction must not connect");
    },
  };
  const provider = overrides.provider ?? {
    async sendOnce() {
      calls.push("provider-send");
      throw new Error("construction must not send");
    },
  };
  const dependencies = {
    clock: {
      now() {
        return new Date("2026-08-26T12:00:00.000Z");
      },
    },
    deadlines: {
      cleanupMilliseconds: 1_000,
      databaseMilliseconds: 5_000,
      providerMilliseconds: 3_000,
      scheduler: {
        monotonicNowMilliseconds() {
          return 1_000;
        },
        schedule() {
          return Object.freeze({ cancel() {} });
        },
      },
    },
    pool,
    provider,
  };
  return { calls, dependencies, pool, provider };
}

function assertInvalidDependencyError(action) {
  assert.throws(
    action,
    (error) => error?.code === "invalid-dependencies",
  );
}

test("composes the reviewed transport and driver without construction I/O", () => {
  const fixture = validFixture();

  const driver = createRailwayBotReplyPinnedBoundaryComposition(
    fixture.dependencies,
  );

  assert.equal(typeof driver.run, "function");
  assert.deepEqual(Object.keys(driver), ["run"]);
  assert.equal(Object.isFrozen(driver), true);
  assert.deepEqual(fixture.calls, []);
});

test("supports a Pool method on a prototype without invoking it", () => {
  const calls = [];
  const poolPrototype = {
    connect() {
      calls.push("connect");
      throw new Error("construction must not connect");
    },
  };
  const pool = Object.create(poolPrototype);
  const fixture = validFixture({ pool });

  const driver = createRailwayBotReplyPinnedBoundaryComposition(
    fixture.dependencies,
  );

  assert.equal(Object.isFrozen(driver), true);
  assert.deepEqual(calls, []);
});

test("a failed checkout is attempted once, never sends, and consumes the driver", async () => {
  const fixture = validFixture();
  const driver = createRailwayBotReplyPinnedBoundaryComposition(
    fixture.dependencies,
  );

  assert.deepEqual(await driver.run({
    permitKey:
      `bot_reply_staging_pre_send_permit_v1_${"a".repeat(64)}`,
  }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 0,
    reason: "session-open-ack-unknown",
  });
  assert.deepEqual(fixture.calls, ["connect"]);
  await assert.rejects(
    driver.run({
      permitKey:
        `bot_reply_staging_pre_send_permit_v1_${"a".repeat(64)}`,
    }),
    (error) => error?.code === "driver-already-used",
  );
  assert.deepEqual(fixture.calls, ["connect"]);
});

test("rejects dependency proxies, accessors, extensions, and Pool accessors before I/O", () => {
  const proxyFixture = validFixture();
  let proxyTrapCalls = 0;
  const proxiedDependencies = new Proxy(proxyFixture.dependencies, {
    ownKeys() {
      proxyTrapCalls += 1;
      return Reflect.ownKeys(proxyFixture.dependencies);
    },
  });
  assertInvalidDependencyError(() =>
    createRailwayBotReplyPinnedBoundaryComposition(proxiedDependencies)
  );
  assert.equal(proxyTrapCalls, 0);
  assert.deepEqual(proxyFixture.calls, []);

  let dependencyGetterCalls = 0;
  const accessorDependencies = {};
  for (const key of ["clock", "deadlines", "pool", "provider"]) {
    Object.defineProperty(accessorDependencies, key, {
      enumerable: true,
      get() {
        dependencyGetterCalls += 1;
        return proxyFixture.dependencies[key];
      },
    });
  }
  assertInvalidDependencyError(() =>
    createRailwayBotReplyPinnedBoundaryComposition(accessorDependencies)
  );
  assert.equal(dependencyGetterCalls, 0);

  assertInvalidDependencyError(() =>
    createRailwayBotReplyPinnedBoundaryComposition({
      ...validFixture().dependencies,
      forbidden: true,
    })
  );
  const missingFixture = validFixture();
  const missingDependencies = {
    clock: missingFixture.dependencies.clock,
    deadlines: missingFixture.dependencies.deadlines,
    pool: missingFixture.dependencies.pool,
  };
  assertInvalidDependencyError(() =>
    createRailwayBotReplyPinnedBoundaryComposition(missingDependencies)
  );
  const symbolFixture = validFixture();
  const symbolDependencies = {
    ...symbolFixture.dependencies,
    [Symbol("forbidden")]: true,
  };
  assertInvalidDependencyError(() =>
    createRailwayBotReplyPinnedBoundaryComposition(symbolDependencies)
  );

  let poolGetterCalls = 0;
  const accessorPool = {};
  Object.defineProperty(accessorPool, "connect", {
    enumerable: true,
    get() {
      poolGetterCalls += 1;
      return () => undefined;
    },
  });
  const poolFixture = validFixture({ pool: accessorPool });
  assertInvalidDependencyError(() =>
    createRailwayBotReplyPinnedBoundaryComposition(poolFixture.dependencies)
  );
  assert.equal(poolGetterCalls, 0);
  assert.deepEqual(poolFixture.calls, []);
});

test("an invalid Pool does not claim the provider binding", () => {
  const provider = {
    async sendOnce() {
      throw new Error("construction must not send");
    },
  };
  const invalidPool = {};
  Object.defineProperty(invalidPool, "connect", {
    enumerable: true,
    get() {
      throw new Error("the Pool getter must not run");
    },
  });
  const invalid = validFixture({ pool: invalidPool, provider });
  assertInvalidDependencyError(() =>
    createRailwayBotReplyPinnedBoundaryComposition(invalid.dependencies)
  );

  const corrected = validFixture({ provider });
  const driver = createRailwayBotReplyPinnedBoundaryComposition(
    corrected.dependencies,
  );
  assert.equal(Object.isFrozen(driver), true);
  assert.deepEqual(corrected.calls, []);
});

test("preserves provider-binding one-shot ownership across compositions", () => {
  const first = validFixture();
  createRailwayBotReplyPinnedBoundaryComposition(first.dependencies);

  const second = validFixture({ provider: first.provider });
  assert.throws(
    () => createRailwayBotReplyPinnedBoundaryComposition(second.dependencies),
    (error) => error?.code === "provider-binding-reused",
  );
  assert.deepEqual(first.calls, []);
  assert.deepEqual(second.calls, []);
});

test("does not invoke a provider accessor while rejecting it", () => {
  let providerGetterCalls = 0;
  const provider = {};
  Object.defineProperty(provider, "sendOnce", {
    enumerable: true,
    get() {
      providerGetterCalls += 1;
      return async () => ({ outcome: "accepted" });
    },
  });
  const fixture = validFixture({ provider });

  assert.throws(
    () => createRailwayBotReplyPinnedBoundaryComposition(
      fixture.dependencies,
    ),
    (error) => error?.code === "invalid-dependencies",
  );
  assert.equal(providerGetterCalls, 0);
  assert.deepEqual(fixture.calls, []);
});

test("exports an immutable explicit dormant status", () => {
  assert.deepEqual(Object.keys(compositionModule).sort(), [
    "createRailwayBotReplyPinnedBoundaryComposition",
    "railwayBotReplyPinnedBoundaryCompositionStatus",
  ]);
  assert.deepEqual(railwayBotReplyPinnedBoundaryCompositionStatus, {
    activationAllowed: false,
    compositionStatus: "dormant",
    concreteAdapterStatus: "missing",
    runtimeImporters: 0,
    trustedWriters: "missing",
  });
  assert.equal(
    Object.isFrozen(railwayBotReplyPinnedBoundaryCompositionStatus),
    true,
  );
});

test("contains no provider adapter, activation, retry, environment, or randomness path", async () => {
  const source = await readFile(
    new URL(`../${compositionRelativePath}`, import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /from "\.\/nodePostgresBotReplyPinnedSessionTransport\.ts";/,
  );
  assert.match(
    source,
    /from "\.\/railwayBotReplyPinnedBoundaryDriver\.ts";/,
  );
  assert.doesNotMatch(
    source,
    /metaBotReply|railwayBotReplyRuntime|BotReplyStagingLiveDriver/,
  );
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|\bretry\b/i);
  assert.doesNotMatch(source, /Math\.random|crypto\.randomUUID/);
});

async function productionSource(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

async function createGuardFixture(name) {
  const root = join(
    tmpdir(),
    `connect-d1fb-${process.pid}-${name}`,
  );
  await Promise.all(
    [
      "app",
      "features",
      "server/operations",
      "server/platform",
      "shared",
      "db",
      "worker",
      "scripts",
    ].map((directory) =>
      mkdir(join(root, directory), { recursive: true })
    ),
  );
  await Promise.all([
    writeFile(
      join(root, "server/operations/productionImplementationState.ts"),
      await productionSource(
        "server/operations/productionImplementationState.ts",
      ),
    ),
    ...[
      compositionRelativePath,
      driverRelativePath,
      transportRelativePath,
    ].map(async (relativePath) =>
      writeFile(
        join(root, relativePath),
        await productionSource(relativePath),
      )
    ),
  ]);
  return root;
}

function findingCodes(report, file) {
  return report.findings
    .filter((finding) => finding.file === file)
    .map((finding) => finding.code)
    .sort();
}

test("allows only the exact dormant pinned-boundary composition", async () => {
  const root = await createGuardFixture("clean");

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks Worker activation of the dormant composition", async () => {
  const root = await createGuardFixture("worker");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import { createRailwayBotReplyPinnedBoundaryComposition } from "../server/platform/railwayBotReplyPinnedBoundaryComposition.ts";',
      "export const activation = createRailwayBotReplyPinnedBoundaryComposition;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);
});

test("blocks literal dynamic and transitive Worker activation", async () => {
  const dynamicRoot = await createGuardFixture("worker-dynamic");
  await writeFile(
    join(dynamicRoot, "worker/index.ts"),
    [
      "export const activation = import(",
      '  "../server/platform/railwayBotReplyPinnedBoundaryComposition.ts",',
      ");",
      "",
    ].join("\n"),
  );
  const dynamicReport = await inspectSourceGuardrails(dynamicRoot);
  assert.deepEqual(dynamicReport.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);

  const transitiveRoot = await createGuardFixture("worker-transitive");
  await writeFile(
    join(transitiveRoot, "server/bridge.ts"),
    [
      'export { createRailwayBotReplyPinnedBoundaryComposition as activate } from "./platform/railwayBotReplyPinnedBoundaryComposition.ts";',
      "",
    ].join("\n"),
  );
  await writeFile(
    join(transitiveRoot, "worker/index.ts"),
    [
      'import { activate } from "../server/bridge.ts";',
      "export const retained = activate;",
      "",
    ].join("\n"),
  );
  const transitiveReport = await inspectSourceGuardrails(transitiveRoot);
  assert.deepEqual(transitiveReport.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);
});

test("allows a type-only Worker reference without loading the composition", async () => {
  const root = await createGuardFixture("worker-type-only");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import type { RailwayBotReplyPinnedBoundaryComposition } from "../server/platform/railwayBotReplyPinnedBoundaryComposition.ts";',
      "export type DormantComposition =",
      "  RailwayBotReplyPinnedBoundaryComposition;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks every unapproved server importer of the dormant composition", async () => {
  const root = await createGuardFixture("importer");
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { createRailwayBotReplyPinnedBoundaryComposition } from "./platform/railwayBotReplyPinnedBoundaryComposition.ts";',
      "export { createRailwayBotReplyPinnedBoundaryComposition };",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "server/orphan.ts",
    },
  ]);
});

test("blocks local, external, and non-literal composition dependencies", async () => {
  const cases = [
    {
      name: "local",
      prefix:
        'import { forbidden } from "./forbiddenCompositionDependency.ts";\nvoid forbidden;\n',
      setup: async (root) =>
        writeFile(
          join(
            root,
            "server/platform/forbiddenCompositionDependency.ts",
          ),
          "export const forbidden = true;\n",
        ),
    },
    {
      name: "external",
      prefix: 'import { readFileSync } from "node:fs";\nvoid readFileSync;\n',
      setup: async () => undefined,
    },
    {
      name: "non-literal",
      prefix: [
        'const forbiddenModule = "node:fs";',
        "void import(forbiddenModule);",
        "",
      ].join("\n"),
      setup: async () => undefined,
    },
  ];

  for (const testCase of cases) {
    const root = await createGuardFixture(`dependency-${testCase.name}`);
    await testCase.setup(root);
    const path = join(root, compositionRelativePath);
    const source = await readFile(path, "utf8");
    await writeFile(path, `${testCase.prefix}${source}`);

    const report = await inspectSourceGuardrails(root);

    assert.equal(
      findingCodes(report, compositionRelativePath).includes(
        "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      ),
      true,
      testCase.name,
    );
  }
});

test("blocks package metadata from executing the dormant composition", async () => {
  const target = `./${compositionRelativePath}`;
  const cases = [
    ["scripts", { scripts: { start: `node ${target}` } }],
    ["browser", { browser: target }],
    [
      "browser-map",
      { browser: { "./safe.ts": target } },
    ],
    ["bin", { bin: target }],
    ["main", { main: target }],
    ["module", { module: target }],
    ["exports", { exports: target }],
    ["imports", { imports: { "#d1fb": target } }],
  ];

  for (const [name, fields] of cases) {
    const root = await createGuardFixture(`package-${name}`);
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify({ private: true, ...fields }, null, 2)}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "package.json"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
  }
});

test("follows a production package-script bridge to the composition", async () => {
  const root = await createGuardFixture("package-bridge");
  await writeFile(
    join(root, "scripts/activate-composition.mjs"),
    [
      'import { createRailwayBotReplyPinnedBoundaryComposition } from "../server/platform/railwayBotReplyPinnedBoundaryComposition.ts";',
      "export const activation = createRailwayBotReplyPinnedBoundaryComposition;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      scripts: { start: "node scripts/activate-composition.mjs" },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, "scripts/activate-composition.mjs"),
    ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
  );
});

test("locks every reviewed composition byte behind a SHA-256 contract", async () => {
  const root = await createGuardFixture("digest");
  const path = join(root, compositionRelativePath);
  const source = await readFile(path, "utf8");
  await writeFile(path, `${source}// unreviewed byte change\n`);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, compositionRelativePath),
    ["BOT_REPLY_STAGING_PINNED_BOUNDARY_COMPOSITION_CONTRACT_INVALID"],
  );
});
