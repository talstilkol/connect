import { lstatSync } from "node:fs";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import {
  D1DataMigrationSnapshotError,
} from "./read-d1-data-migration-snapshot.mjs";
import {
  readD1FullDataMigrationSnapshot,
} from "./read-d1-full-data-migration-snapshot.mjs";

const environmentKey = "CONNECT_D1_FULL_MIGRATION_SOURCE_PATH";

export class D1FullDataMigrationSourceError extends Error {
  constructor(code) {
    super(`D1 full migration source failed: ${code}`);
    this.name = "D1FullDataMigrationSourceError";
    this.code = code;
  }
}

function sourceInvalid() {
  throw new D1FullDataMigrationSourceError("source-invalid");
}

function inspectSource(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    !isAbsolute(value) ||
    !value.endsWith(".sqlite") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    sourceInvalid();
  }

  let sourceStat;
  try {
    sourceStat = lstatSync(value);
  } catch {
    sourceInvalid();
  }
  if (
    !sourceStat.isFile() ||
    sourceStat.isSymbolicLink() ||
    sourceStat.nlink !== 1 ||
    (sourceStat.mode & 0o077) !== 0 ||
    (typeof process.geteuid === "function" &&
      sourceStat.uid !== process.geteuid())
  ) {
    sourceInvalid();
  }
  return Object.freeze({
    path: value,
    device: sourceStat.dev,
    inode: sourceStat.ino,
    size: sourceStat.size,
    modifiedAt: sourceStat.mtimeMs,
  });
}

export function requireD1FullDataMigrationSourcePath(value) {
  return inspectSource(value).path;
}

export function readVerifiedD1FullDataMigrationSnapshot(sourcePath) {
  const source = inspectSource(sourcePath);
  let database;
  try {
    database = new DatabaseSync(source.path, {
      readOnly: true,
      allowExtension: false,
    });
  } catch {
    throw new D1FullDataMigrationSourceError("source-open-failed");
  }

  let snapshot;
  try {
    snapshot = readD1FullDataMigrationSnapshot(database);
  } finally {
    database.close();
  }
  const after = inspectSource(source.path);
  if (
    after.device !== source.device ||
    after.inode !== source.inode ||
    after.size !== source.size ||
    after.modifiedAt !== source.modifiedAt
  ) {
    throw new D1FullDataMigrationSourceError("source-changed");
  }
  return snapshot;
}

export function verifyD1FullDataMigrationSnapshot(sourcePath) {
  const snapshot = readVerifiedD1FullDataMigrationSnapshot(sourcePath);
  return Object.freeze({
    sliceCount: snapshot.slices.length,
    tableCount: snapshot.tableCount,
    totalRowCount: snapshot.totalRowCount,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const report = verifyD1FullDataMigrationSnapshot(
      process.env[environmentKey],
    );
    process.stdout.write(
      `D1 full migration source snapshot: PASS (${report.sliceCount} slices, ${report.tableCount} tables, ${report.totalRowCount} rows)\n`,
    );
  } catch (error) {
    const code = error instanceof D1FullDataMigrationSourceError ||
      error instanceof D1DataMigrationSnapshotError
      ? error.code
      : "verification-failed";
    process.stderr.write(
      `D1 full migration source snapshot: FAIL (${code})\n`,
    );
    process.exitCode = 1;
  }
}
