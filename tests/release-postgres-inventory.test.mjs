import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import {
  buildReleaseManifest,
  readCommittedReleaseManifest,
} from "../scripts/create-release-manifest.mjs";
import { createCurrentChangeLog } from "../scripts/create-change-log.mjs";
import { inspectReleaseArtifacts } from "../scripts/verify-release-artifacts.mjs";

const projectRoot = new URL("../", import.meta.url);
const expectedManifest = await readCommittedReleaseManifest();
const expectedChangeLog = createCurrentChangeLog();
const input = {
  commitSha: expectedManifest.commitSha,
  treeSha: expectedManifest.treeSha,
  packageJson: JSON.parse(await readFile(new URL("package.json", projectRoot), "utf8")),
  packageLockText: await readFile(new URL("package-lock.json", projectRoot), "utf8"),
  migrations: expectedManifest.migrations,
  postgresMigrations: expectedManifest.postgres.migrations,
};

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function inspect(actualManifestText) {
  return inspectReleaseArtifacts({
    expectedManifest,
    actualManifestText,
    expectedChangeLog,
    actualChangeLog: expectedChangeLog,
  });
}

test("current release lists and hashes every real PostgreSQL migration in order", async () => {
  const directory = new URL("postgres/migrations/", projectRoot);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  const actualInventory = await Promise.all(files.map(async (file) => ({
    file,
    sha256: digest(await readFile(new URL(file, directory))),
  })));

  assert.ok(actualInventory.length > 0);
  assert.equal(expectedManifest.postgres.directory, "postgres/migrations");
  assert.deepEqual(expectedManifest.postgres.migrations, actualInventory);
  assert.equal(expectedManifest.postgres.migrationSetSha256, digest(
    actualInventory.map(({ file, sha256 }) => `${file}:${sha256}`).join("\n"),
  ));
  assert.deepEqual(inspect(JSON.stringify(expectedManifest)), { status: "passed", findings: [] });
});

test("PostgreSQL inventory is deterministic and cannot be mutated through its input", () => {
  const postgresMigrations = input.postgresMigrations.map((migration) => ({ ...migration }));
  const first = buildReleaseManifest({ ...input, postgresMigrations });
  assert.deepEqual(first, buildReleaseManifest(input));
  postgresMigrations.pop();
  assert.deepEqual(first.postgres.migrations, expectedManifest.postgres.migrations);
  assert.ok(Object.isFrozen(first.postgres));
  assert.ok(Object.isFrozen(first.postgres.migrations));
  assert.ok(first.postgres.migrations.every(Object.isFrozen));
});

test("adding PostgreSQL inventory preserves the existing D1 v1 identity contract", () => {
  const legacyInput = { ...input };
  delete legacyInput.postgresMigrations;
  const legacy = buildReleaseManifest(legacyInput);
  assert.equal(expectedManifest.schemaVersion, 1);
  assert.equal(expectedManifest.releaseId, legacy.releaseId);
  assert.equal(expectedManifest.migrationSetSha256, legacy.migrationSetSha256);
  assert.deepEqual(expectedManifest.migrations, legacy.migrations);
  assert.deepEqual(inspect(JSON.stringify(legacy)), {
    status: "failed", findings: [{ code: "RELEASE_MANIFEST_STALE" }],
  });
});

test("rejects empty, malformed, duplicate, reordered and unsafe PostgreSQL inventories", () => {
  const migrations = input.postgresMigrations;
  for (const postgresMigrations of [
    null,
    [],
    {},
    [migrations[0], migrations[0], ...migrations.slice(2)],
    [migrations[1], migrations[0], ...migrations.slice(2)],
    [{ ...migrations[0], file: `../${migrations[0].file}` }, ...migrations.slice(1)],
    [{ ...migrations[0], sha256: null }, ...migrations.slice(1)],
    [{ ...migrations[0], sha256: migrations[0].sha256.slice(1) }, ...migrations.slice(1)],
  ]) {
    assert.throws(() => buildReleaseManifest({ ...input, postgresMigrations }),
      /INVALID_POSTGRES_MIGRATION_INVENTORY/);
  }
});

test("rejects a truncated PostgreSQL inventory even when the legacy release ID matches", () => {
  const truncated = buildReleaseManifest({ ...input, postgresMigrations: input.postgresMigrations.slice(0, -1) });
  assert.equal(truncated.releaseId, expectedManifest.releaseId);
  assert.deepEqual(inspect(JSON.stringify(truncated)), {
    status: "failed", findings: [{ code: "RELEASE_MANIFEST_STALE" }],
  });
});

test("detects replaced PostgreSQL content hashes even with an internally recomputed set digest", () => {
  const replaced = buildReleaseManifest({
    ...input,
    postgresMigrations: input.postgresMigrations.map((migration, index, migrations) =>
      index === 0 ? { ...migration, sha256: migrations[1].sha256 } : migration),
  });
  assert.notEqual(replaced.postgres.migrationSetSha256, expectedManifest.postgres.migrationSetSha256);
  assert.deepEqual(inspect(JSON.stringify(replaced)), {
    status: "failed", findings: [{ code: "RELEASE_MANIFEST_STALE" }],
  });
});

test("rejects every JSON primitive and arrays instead of accepting falsy manifests", () => {
  for (const value of [null, false, true, 0, "", [], [expectedManifest]]) {
    assert.deepEqual(inspect(JSON.stringify(value)), {
      status: "failed", findings: [{ code: "RELEASE_MANIFEST_INVALID" }],
    });
  }
});

test("rejects malformed JSON, missing fields and simultaneous change log corruption", () => {
  assert.deepEqual(inspect("{"), {
    status: "failed", findings: [{ code: "RELEASE_MANIFEST_INVALID" }],
  });
  assert.deepEqual(inspect("{}"), {
    status: "failed", findings: [{ code: "RELEASE_MANIFEST_STALE" }],
  });
  assert.deepEqual(inspectReleaseArtifacts({
    expectedManifest, actualManifestText: "null", expectedChangeLog, actualChangeLog: "",
  }), {
    status: "failed",
    findings: [{ code: "RELEASE_MANIFEST_INVALID" }, { code: "CHANGE_LOG_STALE" }],
  });
});
