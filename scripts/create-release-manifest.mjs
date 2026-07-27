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

export function buildReleaseManifest({
  commitSha,
  treeSha,
  packageJson,
  packageLockText,
  migrations,
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

  const normalizedMigrations =
    migrations.map((migration, index) => {
      if (
        typeof migration?.file !== "string" ||
        migration?.file !==
          `${String(index).padStart(4, "0")}_${migration.file.slice(5)}` ||
        !migrationNamePattern.test(
          migration.file,
        ) ||
        !sha256Pattern.test(
          migration.sha256,
        )
      ) {
        throw new Error(
          "INVALID_MIGRATION_INVENTORY",
        );
      }

      return {
        file: migration.file,
        sha256: migration.sha256,
      };
    });
  const migrationSetSha256 = sha256(
    normalizedMigrations
      .map(
        (migration) =>
          `${migration.file}:${migration.sha256}`,
      )
      .join("\n"),
  );
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

export async function createCurrentReleaseManifest() {
  if (git(["status", "--porcelain"])) {
    throw new Error(
      "RELEASE_MANIFEST_DIRTY_WORKTREE",
    );
  }

  const [
    packageText,
    packageLockText,
    migrationFiles,
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
  });
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
