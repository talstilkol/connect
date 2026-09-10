import {
  execFileSync,
} from "node:child_process";
import {
  createHash,
} from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const outputPath = join(
  projectRoot,
  ".artifacts",
  "release-manifest.json",
);
const gitObjectPattern = /^[a-f0-9]{40}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const migrationNamePattern =
  /^\d{4}_[a-z0-9_]+\.sql$/;

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function requireGitObject(value, field) {
  if (!gitObjectPattern.test(value)) {
    throw new Error(
      `INVALID_${field.toUpperCase()}`,
    );
  }

  return value;
}

function freezeMigrations(migrations) {
  return Object.freeze(
    migrations.map((migration) =>
      Object.freeze({
        file: migration.file,
        sha256: migration.sha256,
      }),
    ),
  );
}

function normalizeMigrations(migrations, errorCode) {
  if (!Array.isArray(migrations) || migrations.length === 0) {
    throw new Error(errorCode);
  }

  return migrations.map((migration, index) => {
    if (
      typeof migration?.file !== "string" ||
      migration.file.slice(0, 4) !== String(index).padStart(4, "0") ||
      !migrationNamePattern.test(migration.file) ||
      typeof migration.sha256 !== "string" ||
      !sha256Pattern.test(migration.sha256)
    ) {
      throw new Error(errorCode);
    }

    return { file: migration.file, sha256: migration.sha256 };
  });
}

function migrationSetDigest(migrations) {
  return sha256(
    migrations.map(({ file, sha256: digest }) => `${file}:${digest}`).join("\n"),
  );
}

export function buildReleaseManifest({
  commitSha,
  treeSha,
  packageJson,
  packageLockText,
  migrations,
  postgresMigrations,
}) {
  const validatedCommitSha =
    requireGitObject(commitSha, "commit_sha");
  const validatedTreeSha =
    requireGitObject(treeSha, "tree_sha");

  if (
    !packageJson ||
    typeof packageJson.name !== "string" ||
    typeof packageJson.version !== "string" ||
    typeof packageJson.engines?.node !==
      "string" ||
    typeof packageLockText !== "string" ||
    packageLockText.length === 0 ||
    !Array.isArray(migrations) ||
    migrations.length === 0
  ) {
    throw new Error(
      "INVALID_RELEASE_INPUT",
    );
  }

  const normalizedMigrations = normalizeMigrations(
    migrations,
    "INVALID_MIGRATION_INVENTORY",
  );
  // Keep the v1 D1 identity contract used by existing evidence readers.
  // Current release creation always supplies PostgreSQL; legacy callers may omit it.
  const normalizedPostgresMigrations = postgresMigrations === undefined
    ? null
    : normalizeMigrations(postgresMigrations, "INVALID_POSTGRES_MIGRATION_INVENTORY");
  const migrationSetSha256 = migrationSetDigest(normalizedMigrations);
  const identity = {
    schemaVersion: 1,
    commitSha: validatedCommitSha,
    treeSha: validatedTreeSha,
    packageLockSha256:
      sha256(packageLockText),
    migrationSetSha256,
  };
  const releaseId =
    `connect_release_v1_${sha256(
      JSON.stringify(identity),
    )}`;

  return Object.freeze({
    schemaVersion: 1,
    releaseId,
    commitSha: validatedCommitSha,
    treeSha: validatedTreeSha,
    package: Object.freeze({
      name: packageJson.name,
      version: packageJson.version,
      nodeEngine:
        packageJson.engines.node,
    }),
    packageLockSha256:
      identity.packageLockSha256,
    migrationSetSha256,
    migrations:
      freezeMigrations(
        normalizedMigrations,
      ),
    ...(normalizedPostgresMigrations === null ? {} : {
      postgres: Object.freeze({
        directory: "postgres/migrations",
        migrationSetSha256: migrationSetDigest(normalizedPostgresMigrations),
        migrations: freezeMigrations(normalizedPostgresMigrations),
      }),
    }),
  });
}

function git(argumentsList) {
  return execFileSync(
    "git",
    argumentsList,
    {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: [
        "ignore",
        "pipe",
        "ignore",
      ],
    },
  ).trim();
}

export async function readCommittedReleaseManifest() {
  const [
    packageText,
    packageLockText,
    migrationFiles,
    postgresMigrationFiles,
  ] = await Promise.all([
    readFile(
      join(projectRoot, "package.json"),
      "utf8",
    ),
    readFile(
      join(
        projectRoot,
        "package-lock.json",
      ),
      "utf8",
    ),
    readdir(
      join(projectRoot, "drizzle"),
    ),
    readdir(join(projectRoot, "postgres", "migrations"), { withFileTypes: true }),
  ]);
  const sortedMigrationFiles =
    migrationFiles
      .filter((fileName) =>
        fileName.endsWith(".sql"),
      )
      .sort();
  const migrations = await Promise.all(
    sortedMigrationFiles.map(
      async (fileName) => ({
        file: fileName,
        sha256: sha256(
          await readFile(
            join(
              projectRoot,
              "drizzle",
              fileName,
            ),
          ),
        ),
      }),
    ),
  );
  const postgresMigrations = await Promise.all(
    postgresMigrationFiles
      .filter((entry) => entry.name.endsWith(".sql"))
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
      .map(async (entry) => {
        if (!entry.isFile()) {
          throw new Error("INVALID_POSTGRES_MIGRATION_INVENTORY");
        }
        return {
          file: entry.name,
          sha256: sha256(await readFile(join(projectRoot, "postgres", "migrations", entry.name))),
        };
      }),
  );

  return buildReleaseManifest({
    commitSha: requireGitObject(
      git(["rev-parse", "HEAD"]),
      "commit_sha",
    ),
    treeSha: requireGitObject(
      git(["rev-parse", "HEAD^{tree}"]),
      "tree_sha",
    ),
    packageJson:
      JSON.parse(packageText),
    packageLockText,
    migrations,
    postgresMigrations,
  });
}

export async function createCurrentReleaseManifest() {
  if (git(["status", "--porcelain"])) {
    throw new Error(
      "RELEASE_MANIFEST_DIRTY_WORKTREE",
    );
  }

  return readCommittedReleaseManifest();
}

async function runCli() {
  if (process.argv.length !== 2) {
    console.error(
      "Release manifest: INVALID_ARGUMENTS",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const manifest =
      await createCurrentReleaseManifest();

    await mkdir(dirname(outputPath), {
      recursive: true,
    });
    await writeFile(
      outputPath,
      `${JSON.stringify(
        manifest,
        null,
        2,
      )}\n`,
      {
        encoding: "utf8",
        flag: "w",
      },
    );
    console.log(
      `Release manifest: PASS (${manifest.releaseId})`,
    );
  } catch (error) {
    console.error(
      `Release manifest: FAIL (${
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR"
      })`,
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(
        `file://${process.argv[1]}`,
      ),
    )
) {
  await runCli();
}
