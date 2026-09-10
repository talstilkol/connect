import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  DatabaseSync,
} from "node:sqlite";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

import {
  inspectDrizzleToolingCompatibility,
} from "./verify-drizzle-tooling.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const migrationNamePattern =
  /^(\d{4})_[a-z0-9_]+\.sql$/;
const statementBreakpoint =
  "--> statement-breakpoint";

function rootUrl(root) {
  return pathToFileURL(
    root.endsWith("/") ? root : `${root}/`,
  );
}

function finding(code, index = null) {
  return Object.freeze({
    code,
    index,
  });
}

export function validateMigrationInventory({
  migrationFiles,
  journal,
}) {
  const findings = [];

  if (
    journal?.dialect !== "sqlite" ||
    !Array.isArray(journal.entries)
  ) {
    return Object.freeze([
      finding("MIGRATION_JOURNAL_INVALID"),
    ]);
  }

  for (
    let index = 0;
    index < migrationFiles.length;
    index += 1
  ) {
    const fileName = migrationFiles[index];
    const match =
      migrationNamePattern.exec(fileName);
    const expectedPrefix =
      String(index).padStart(4, "0");

    if (!match || match[1] !== expectedPrefix) {
      findings.push(
        finding(
          "MIGRATION_SEQUENCE_INVALID",
          index,
        ),
      );
      continue;
    }

    const journalEntry =
      journal.entries[index];
    const expectedTag =
      fileName.slice(0, -4);

    if (
      !journalEntry ||
      journalEntry.idx !== index ||
      journalEntry.tag !== expectedTag ||
      journalEntry.breakpoints !== true
    ) {
      findings.push(
        finding(
          "MIGRATION_JOURNAL_MISMATCH",
          index,
        ),
      );
    }
  }

  if (
    journal.entries.length !==
    migrationFiles.length
  ) {
    findings.push(
      finding("MIGRATION_COUNT_MISMATCH"),
    );
  }

  return Object.freeze(findings);
}

export async function inspectMigrations(
  root = projectRoot,
) {
  const baseUrl = rootUrl(root);
  const migrationsUrl =
    new URL("drizzle/", baseUrl);
  const journalUrl =
    new URL(
      "drizzle/meta/_journal.json",
      baseUrl,
    );
  const migrationFiles = (
    await readdir(migrationsUrl)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();
  let journal;

  try {
    journal = JSON.parse(
      await readFile(journalUrl, "utf8"),
    );
  } catch {
    return Object.freeze({
      status: "failed",
      migrationCount: migrationFiles.length,
      findings: Object.freeze([
        finding("MIGRATION_JOURNAL_INVALID"),
      ]),
    });
  }

  const inventoryFindings =
    validateMigrationInventory({
      migrationFiles,
      journal,
    });

  if (inventoryFindings.length > 0) {
    return Object.freeze({
      status: "failed",
      migrationCount: migrationFiles.length,
      findings: inventoryFindings,
    });
  }

  const database =
    new DatabaseSync(":memory:");
  const findings = [];

  try {
    database.exec(
      "PRAGMA foreign_keys = ON;",
    );

    for (
      let index = 0;
      index < migrationFiles.length;
      index += 1
    ) {
      try {
        const sql = (
          await readFile(
            new URL(
              migrationFiles[index],
              migrationsUrl,
            ),
            "utf8",
          )
        ).replaceAll(
          statementBreakpoint,
          "",
        );

        database.exec(sql);
      } catch {
        findings.push(
          finding(
            "MIGRATION_APPLY_FAILED",
            index,
          ),
        );
        break;
      }
    }

    if (findings.length === 0) {
      const integrity =
        database
          .prepare("PRAGMA integrity_check;")
          .get();
      const foreignKeyViolation =
        database
          .prepare(
            "PRAGMA foreign_key_check;",
          )
          .get();

      if (
        integrity?.integrity_check !== "ok"
      ) {
        findings.push(
          finding(
            "MIGRATION_INTEGRITY_FAILED",
          ),
        );
      }

      if (foreignKeyViolation) {
        findings.push(
          finding(
            "MIGRATION_FOREIGN_KEY_FAILED",
          ),
        );
      }
    }
  } finally {
    database.close();
  }

  return Object.freeze({
    status:
      findings.length === 0
        ? "passed"
        : "failed",
    migrationCount: migrationFiles.length,
    findings: Object.freeze(findings),
  });
}

async function runCli() {
  if (process.argv.length !== 2) {
    console.error(
      "Migration validation: INVALID_ARGUMENTS",
    );
    process.exitCode = 1;
    return;
  }

  const report = await inspectMigrations();

  if (report.status === "passed") {
    const toolingReport =
      await inspectDrizzleToolingCompatibility();

    if (toolingReport.status !== "passed") {
      console.error(
        `Drizzle tooling compatibility: FAIL (${toolingReport.code})`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      "Drizzle tooling compatibility: PASS (check + isolated generate)",
    );
    console.log(
      `Migration validation: PASS (${report.migrationCount} migrations)`,
    );
    return;
  }

  console.error(
    `Migration validation: FAIL (${report.findings.length} findings)`,
  );
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      pathToFileURL(process.argv[1]),
    )
) {
  await runCli();
}
