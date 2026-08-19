import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  POSTGRES_MIGRATION_PARITY_REGISTRY,
  POSTGRES_TARGET_ONLY_MIGRATIONS,
} from "../postgres/postgresMigrationParityRegistry.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const migrationNamePattern = /^\d{4}_[a-z0-9_]+\.sql$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function fail(code) {
  throw new Error(`POSTGRES_MIGRATION_PARITY_${code}`);
}

function normalizeSql(value) {
  return value
    .toLowerCase()
    .replaceAll("`", "")
    .replaceAll('"', "")
    .replace(/\s+/g, " ")
    .trim();
}

function requireMigrationName(value) {
  if (typeof value !== "string" || !migrationNamePattern.test(value)) {
    fail("MIGRATION_NAME_INVALID");
  }
  return value;
}

function requireText(value, fieldName) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 500 ||
    value !== value.trim() ||
    controlCharacterPattern.test(value)
  ) {
    fail(`${fieldName}_INVALID`);
  }
  return value;
}

function requireExactKeys(value, expectedKeys, code) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...expectedKeys].sort())
  ) {
    fail(code);
  }
}

function requireUnique(values, code) {
  if (new Set(values).size !== values.length) {
    fail(code);
  }
}

function requireInventory(actual, expected, code) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(code);
  }
}

function extractCreatedTables(source) {
  return [...source.matchAll(
    /CREATE TABLE (?:IF NOT EXISTS )?[`"]?([A-Za-z0-9_]+)/gi,
  )]
    .map((match) => match[1])
    .filter((tableName) => !tableName.startsWith("__new_"));
}

async function migrationFiles(directory) {
  return (await readdir(directory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
}

async function migrationSources(directory, files) {
  return new Map(await Promise.all(files.map(async (fileName) => [
    fileName,
    await readFile(join(directory, fileName), "utf8"),
  ])));
}

export async function inspectPostgresMigrationParityContract(options = {}) {
  requireExactKeys(
    options,
    Object.hasOwn(options, "registry") || Object.hasOwn(options, "targetOnly")
      ? ["registry", "targetOnly"]
      : [],
    "OPTIONS_INVALID",
  );
  const registry = options.registry ?? POSTGRES_MIGRATION_PARITY_REGISTRY;
  const targetOnly = options.targetOnly ?? POSTGRES_TARGET_ONLY_MIGRATIONS;
  if (!Array.isArray(registry) || !Array.isArray(targetOnly)) {
    fail("REGISTRY_INVALID");
  }

  const d1Directory = join(projectRoot, "drizzle");
  const postgresDirectory = join(projectRoot, "postgres", "migrations");
  const d1Files = await migrationFiles(d1Directory);
  const postgresFiles = await migrationFiles(postgresDirectory);
  const d1Sources = await migrationSources(d1Directory, d1Files);
  const postgresSources = await migrationSources(
    postgresDirectory,
    postgresFiles,
  );
  const registeredD1Files = [];
  const mappedPostgresFiles = [];

  for (const entry of registry) {
    requireExactKeys(
      entry,
      [
        "d1Migration",
        "postgresMigrations",
        "status",
        "summary",
        "targetEvidence",
      ],
      "ENTRY_SHAPE_INVALID",
    );
    const d1Migration = requireMigrationName(entry.d1Migration);
    if (entry.status !== "covered") fail("ENTRY_STATUS_INVALID");
    requireText(entry.summary, "ENTRY_SUMMARY");
    if (
      !Array.isArray(entry.postgresMigrations) ||
      entry.postgresMigrations.length === 0 ||
      !Array.isArray(entry.targetEvidence) ||
      entry.targetEvidence.length === 0
    ) {
      fail("ENTRY_EVIDENCE_INVALID");
    }
    requireUnique(entry.postgresMigrations, "ENTRY_TARGET_DUPLICATE");
    registeredD1Files.push(d1Migration);

    for (const targetMigration of entry.postgresMigrations) {
      const migration = requireMigrationName(targetMigration);
      if (!postgresSources.has(migration)) fail("TARGET_MISSING");
      mappedPostgresFiles.push(migration);
    }
    for (const evidence of entry.targetEvidence) {
      requireExactKeys(
        evidence,
        ["migration", "token"],
        "EVIDENCE_SHAPE_INVALID",
      );
      const migration = requireMigrationName(evidence.migration);
      const token = requireText(evidence.token, "EVIDENCE_TOKEN");
      if (!entry.postgresMigrations.includes(migration)) {
        fail("EVIDENCE_TARGET_UNDECLARED");
      }
      if (
        !normalizeSql(postgresSources.get(migration)).includes(
          normalizeSql(token),
        )
      ) {
        fail("EVIDENCE_TOKEN_MISSING");
      }
    }
  }

  requireUnique(registeredD1Files, "D1_MAPPING_DUPLICATE");
  requireInventory(
    registeredD1Files,
    d1Files,
    "D1_INVENTORY_MISMATCH",
  );

  const targetOnlyFiles = [];
  for (const entry of targetOnly) {
    requireExactKeys(
      entry,
      ["migration", "summary", "token"],
      "TARGET_ONLY_SHAPE_INVALID",
    );
    const migration = requireMigrationName(entry.migration);
    const token = requireText(entry.token, "TARGET_ONLY_TOKEN");
    requireText(entry.summary, "TARGET_ONLY_SUMMARY");
    if (!postgresSources.has(migration)) fail("TARGET_ONLY_MISSING");
    if (mappedPostgresFiles.includes(migration)) {
      fail("TARGET_ONLY_IS_MAPPED");
    }
    if (
      !normalizeSql(postgresSources.get(migration)).includes(
        normalizeSql(token),
      )
    ) {
      fail("TARGET_ONLY_TOKEN_MISSING");
    }
    targetOnlyFiles.push(migration);
  }
  requireUnique(targetOnlyFiles, "TARGET_ONLY_DUPLICATE");
  requireInventory(
    [...new Set([...mappedPostgresFiles, ...targetOnlyFiles])].sort(),
    postgresFiles,
    "POSTGRES_INVENTORY_MISMATCH",
  );

  const d1Tables = new Set(
    [...d1Sources.values()].flatMap(extractCreatedTables),
  );
  const postgresTables = new Set(
    [...postgresSources.values()].flatMap(extractCreatedTables),
  );
  const missingTables = [...d1Tables]
    .filter((tableName) => !postgresTables.has(tableName))
    .sort();
  if (missingTables.length > 0) fail("D1_TABLE_MISSING");

  return Object.freeze({
    status: "passed",
    d1MigrationCount: d1Files.length,
    postgresMigrationCount: postgresFiles.length,
    coveredD1TableCount: d1Tables.size,
    targetOnlyMigrationCount: targetOnlyFiles.length,
  });
}

async function runCli() {
  if (process.argv.length !== 2) fail("ARGUMENTS_INVALID");
  const report = await inspectPostgresMigrationParityContract();
  process.stdout.write(
    `PostgreSQL migration parity: PASS (${report.d1MigrationCount} D1 migrations, ${report.postgresMigrationCount} PostgreSQL migrations, ${report.coveredD1TableCount} D1 tables)\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  runCli().catch(() => {
    process.stderr.write("PostgreSQL migration parity: FAIL\n");
    process.exitCode = 1;
  });
}
