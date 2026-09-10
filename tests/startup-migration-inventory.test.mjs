import assert from "node:assert/strict";
import { copyFile, mkdir, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { applyPostgresMigrations } from "../scripts/verify-railway-api-startup.mjs";

test("startup migration inventory rejects incomplete sources before requesting a database client", async (t) => {
  const source = fileURLToPath(new URL("../postgres/migrations/", import.meta.url));
  const files = (await readdir(source)).filter((file) => file.endsWith(".sql")).sort();
  const root = join(tmpdir(), `connect-startup-migration-inventory-${process.pid}`);
  await mkdir(root);
  t.after(() => rm(root, { recursive: true, force: true }));

  await t.test("an empty directory is rejected", async () => {
    // No pool is supplied: malformed inventory must fail before connecting.
    await assert.rejects(applyPostgresMigrations(undefined, root),
      /RAILWAY_API_STARTUP_REHEARSAL_MIGRATION_INVENTORY_INVALID/);
  });

  await t.test("a missing initial migration is rejected", async () => {
    const directory = join(root, "missing-first");
    await mkdir(directory);
    await copyFile(join(source, files[1]), join(directory, files[1]));
    await assert.rejects(applyPostgresMigrations(undefined, directory),
      /RAILWAY_API_STARTUP_REHEARSAL_MIGRATION_INVENTORY_INVALID/);
  });

  await t.test("a symlink to a real migration is rejected", async () => {
    const directory = join(root, "symlink");
    await mkdir(directory);
    await symlink(join(source, files[0]), join(directory, files[0]));
    await assert.rejects(applyPostgresMigrations(undefined, directory),
      /RAILWAY_API_STARTUP_REHEARSAL_MIGRATION_INVENTORY_INVALID/);
  });

  for (const [name, contents] of [["empty-file", ""], ["blank-file", " \n\t\r\n"]]) {
    await t.test(`${name} migration is rejected before connecting`, async () => {
      const directory = join(root, name);
      await mkdir(directory);
      await copyFile(join(source, files[0]), join(directory, files[0]));
      await copyFile(join(source, files[1]), join(directory, files[1]));
      // Damage a copied real migration, leaving the ordered filenames intact.
      await writeFile(join(directory, files[1]), contents);
      await assert.rejects(applyPostgresMigrations(undefined, directory),
        /RAILWAY_API_STARTUP_REHEARSAL_MIGRATION_INVENTORY_INVALID/);
    });
  }
});
