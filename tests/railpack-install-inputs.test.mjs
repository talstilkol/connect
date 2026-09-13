import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import test from "node:test";

test("Railpack install inputs support a locked install in an empty stage", async (t) => {
  const config = JSON.parse(await readFile(new URL("../railpack.json", import.meta.url), "utf8"));
  const root = join(tmpdir(), `connect-railpack-install-inputs-${process.pid}`);
  await mkdir(root); // Never reuse or remove another test's directory.
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = join(root, "context");
  const stage = join(root, "stage");
  await mkdir(context);
  await mkdir(stage);

  // A dependency-free local fixture exercises npm's real lockfile requirement
  // without reaching a registry, running package scripts or installing app deps.
  const fixture = { name: "connect-railpack-install-fixture", version: "1.0.0", private: true };
  await writeFile(join(context, "package.json"), JSON.stringify(fixture));
  await writeFile(join(context, "package-lock.json"), JSON.stringify({
    name: fixture.name, version: fixture.version, lockfileVersion: 3,
    requires: true, packages: { "": { name: fixture.name, version: fixture.version } },
  }));
  const userConfig = join(root, "empty-user.npmrc");
  const globalConfig = join(root, "empty-global.npmrc");
  await writeFile(userConfig, "");
  await writeFile(globalConfig, "");
  const npmCli = [
    process.env.npm_execpath,
    resolve(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
    resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
  ].find((path) => path && existsSync(path));
  assert.ok(npmCli, "The Node/npm test runtime must provide npm-cli.js");

  let installations = 0;
  for (const command of config.steps.install.commands) {
    if (typeof command === "object" && typeof command.src === "string") {
      const from = resolve(context, command.src);
      const to = resolve(stage, command.dest);
      assert.ok(from.startsWith(context + sep) && to.startsWith(stage + sep));
      await copyFile(from, to);
      continue;
    }
    assert.equal(command, "npm ci --include=dev", "Use one locked install, without a preceding unlocked npm install");
    const result = spawnSync(process.execPath, [npmCli, ...command.split(" ").slice(1),
      "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", join(root, "cache")], {
      cwd: stage,
      env: { PATH: dirname(process.execPath), CI: "true", NODE_ENV: "production",
        NPM_CONFIG_USERCONFIG: userConfig, NPM_CONFIG_GLOBALCONFIG: globalConfig },
      encoding: "utf8", timeout: 30_000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0,
      `Locked install requires its package and lock inputs before execution:\n${result.stderr}`);
    installations++;
  }
  assert.equal(installations, 1);
  assert.deepEqual(JSON.parse(await readFile(join(stage, "package.json"), "utf8")), fixture);
});
