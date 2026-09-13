import assert from "node:assert/strict";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  canonicalExistingPath,
  listProjectPackageManifests,
  listSourceFiles,
  listSymbolicLinks,
} from "../scripts/source-guardrails/file-discovery.mjs";
import {
  packageTargetPatternMatchesCanonicalFile,
  resolvePackageTargetPath,
} from "../scripts/source-guardrails/package-targets.mjs";
import {
  relativePath,
  stripResourceSuffix,
} from "../scripts/source-guardrails/paths.mjs";

let fixtureIndex = 0;

async function fixture(t) {
  const directory = join(
    tmpdir(),
    `connect-source-discovery-${process.pid}-${fixtureIndex++}`,
  );
  await mkdir(directory);
  t.after(() => rm(directory, { recursive: true }));
  const root = join(directory, "project");
  await mkdir(root);
  return { directory, root };
}

test("source discovery retains internal aliases without following cycles or external directories", async (t) => {
  const { directory, root } = await fixture(t);
  await mkdir(join(root, "server"));
  await mkdir(join(root, "node_modules"));
  await mkdir(join(directory, "external"));
  await writeFile(join(root, "server/private.ts"), "export const value = 1;");
  await writeFile(join(root, "node_modules/ignored.ts"), "");
  await writeFile(join(directory, "external/outside.ts"), "");
  await symlink("server", join(root, "alias"), "dir");
  await symlink("..", join(root, "server/loop"), "dir");
  await symlink("../external", join(root, "outside"), "dir");
  await symlink("node_modules", join(root, "ignored-alias"), "dir");

  const discovered = (await listSourceFiles(root))
    .map((file) => relativePath(root, file)).sort();
  assert.deepEqual(discovered, ["alias/private.ts", "server/private.ts"]);
  assert.equal(
    await canonicalExistingPath(join(root, "alias/private.ts")),
    await canonicalExistingPath(join(root, "server/private.ts")),
  );
  const aliases = (await listSymbolicLinks(root))
    .map((file) => relativePath(root, file)).sort();
  assert.deepEqual(aliases, ["alias", "ignored-alias", "outside", "server/loop"]);
});

test("source discovery tolerates missing paths and broken links while keeping package manifests separate", async (t) => {
  const { root } = await fixture(t);
  await mkdir(join(root, "nested"));
  for (const name of ["client.tsx", "loader.cts", "worker.mjs", "asset.json", "package.json", "nested/package.json"]) {
    await writeFile(join(root, name), "");
  }
  await symlink("missing.ts", join(root, "broken.ts"));
  assert.deepEqual(await listSourceFiles(join(root, "missing")), []);
  assert.deepEqual(await listSymbolicLinks(join(root, "missing")), []);
  assert.deepEqual(
    (await listSourceFiles(root)).map((file) => relativePath(root, file)).sort(),
    ["client.tsx", "loader.cts", "worker.mjs"],
  );
  assert.deepEqual(
    (await listProjectPackageManifests(root))
      .map((file) => relativePath(root, file)).sort(),
    ["nested/package.json", "package.json"],
  );
});

test("package targets retain percent decoding, repeated wildcard binding and file alias resolution", async (t) => {
  const { root } = await fixture(t);
  await mkdir(join(root, "actual"));
  const file = join(root, "actual/module.ts");
  await writeFile(file, "");
  const alias = join(root, "public-module-module.ts");
  await symlink("actual/module.ts", alias);
  const canonicalFile = await canonicalExistingPath(file);
  const aliases = new Map([[alias, canonicalFile]]);
  const manifest = join(root, "package.json");

  assert.equal(await packageTargetPatternMatchesCanonicalFile(
    manifest, "./public-%2A-*.ts?runtime#entry", file, canonicalFile, aliases,
  ), true);
  assert.equal(await packageTargetPatternMatchesCanonicalFile(
    manifest, "./public-*-different.ts", file, canonicalFile, aliases,
  ), false);
  assert.equal(await packageTargetPatternMatchesCanonicalFile(
    manifest, "./public-%ZZ-*.ts", file, canonicalFile, aliases,
  ), false);
  assert.equal(resolvePackageTargetPath(manifest, "./actual/module.ts?runtime#entry"), file);
  assert.equal(resolvePackageTargetPath(manifest, "https://example.com/module.ts"), null);
});

test("resource suffix removal preserves package import names beginning with a hash", () => {
  assert.equal(stripResourceSuffix("#internal/private"), "#internal/private");
  assert.equal(stripResourceSuffix("#internal/private?runtime"), "#internal/private");
  assert.equal(stripResourceSuffix("./private.ts#entry?runtime"), "./private.ts");
  assert.equal(stripResourceSuffix("./private.ts?runtime#entry"), "./private.ts");
});
