import assert from "node:assert/strict";
import {
  readFile,
  readdir,
} from "node:fs/promises";
import test from "node:test";

import {
  buildReleaseManifest,
} from "../scripts/create-release-manifest.mjs";
import {
  inspectMigrations,
  validateMigrationInventory,
} from "../scripts/verify-migrations.mjs";
import {
  inspectSecretHygiene,
  inspectSecretText,
  inspectTrackedFileName,
} from "../scripts/verify-secret-hygiene.mjs";

const repositoryRoot =
  new URL("../", import.meta.url);

const localPullRequestChecks = [
  "source-guardrails",
  "secret-hygiene",
  "interface-guardrails",
  "dependency-lock",
  "migrations",
  "typecheck",
  "lint",
  "tests-and-build",
];

async function currentMigrationInput() {
  const migrationFiles = (
    await readdir(
      new URL(
        "../drizzle/",
        import.meta.url,
      ),
    )
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();

  return {
    migrationFiles,
    journal: JSON.parse(
      await readFile(
        new URL(
          "../drizzle/meta/_journal.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  };
}

function releaseInput() {
  return {
    commitSha: "1".repeat(40),
    treeSha: "2".repeat(40),
    packageJson: {
      name: "connect-whatsapp-platform",
      version: "0.1.0",
      engines: {
        node: ">=24.18.1",
      },
    },
    packageLockText:
      "{\"lockfileVersion\":3}",
    migrations: [
      {
        file:
          "0000_connect_foundation.sql",
        sha256: "3".repeat(64),
      },
    ],
  };
}

test("applies every migration and verifies the current journal", async () => {
  const report = await inspectMigrations(
    repositoryRoot.pathname,
  );

  assert.deepEqual(report, {
    status: "passed",
    migrationCount: 30,
    findings: [],
  });
});

test("rejects missing, reordered, and mismatched migration journal entries", async () => {
  const current =
    await currentMigrationInput();

  assert.deepEqual(
    validateMigrationInventory({
      migrationFiles:
        current.migrationFiles.slice(1),
      journal: current.journal,
    }).map(({ code }) => code),
    [
      ...Array.from(
        {
          length:
            current.migrationFiles.length -
            1,
        },
        () =>
          "MIGRATION_SEQUENCE_INVALID",
      ),
      "MIGRATION_COUNT_MISMATCH",
    ],
  );

  assert.deepEqual(
    validateMigrationInventory({
      migrationFiles:
        current.migrationFiles,
      journal: {
        ...current.journal,
        entries:
          current.journal.entries.slice(
            0,
            -1,
          ),
      },
    }).map(({ code }) => code),
    [
      "MIGRATION_JOURNAL_MISMATCH",
      "MIGRATION_COUNT_MISMATCH",
    ],
  );
});

test("builds one deterministic release identity from committed evidence", () => {
  const input = releaseInput();
  const first =
    buildReleaseManifest(input);
  const second =
    buildReleaseManifest(input);

  assert.deepEqual(first, second);
  assert.match(
    first.releaseId,
    /^connect_release_v1_[a-f0-9]{64}$/,
  );
  assert.equal(
    first.commitSha,
    input.commitSha,
  );
  assert.equal(
    first.treeSha,
    input.treeSha,
  );
  assert.equal(
    first.migrations.length,
    1,
  );
  assert.notEqual(
    buildReleaseManifest({
      ...input,
      treeSha: "4".repeat(40),
    }).releaseId,
    first.releaseId,
  );
});

test("rejects malformed release and migration identities", () => {
  const input = releaseInput();

  assert.throws(
    () =>
      buildReleaseManifest({
        ...input,
        commitSha: "not-a-commit",
      }),
    /INVALID_COMMIT_SHA/,
  );
  assert.throws(
    () =>
      buildReleaseManifest({
        ...input,
        migrations: [
          {
            file:
              "0001_connect_foundation.sql",
            sha256: "3".repeat(64),
          },
        ],
      }),
    /INVALID_MIGRATION_INVENTORY/,
  );
});

test("keeps tracked secret files and private key material out of source", async () => {
  assert.deepEqual(
    inspectTrackedFileName(
      "config/.env.production",
    ),
    [
      {
        code: "SECRET_FILE_TRACKED",
      },
    ],
  );
  assert.deepEqual(
    inspectTrackedFileName(
      ".env.example",
    ),
    [],
  );
  assert.deepEqual(
    inspectSecretText(
      "-----BEGIN " +
        "PRIVATE KEY-----",
    ),
    [
      {
        code:
          "SECRET_CONTENT_DETECTED",
      },
    ],
  );

  const report =
    await inspectSecretHygiene({
      includeHistory: true,
    });

  assert.equal(report.status, "passed");
  assert.equal(
    report.historyIncluded,
    true,
  );
  assert.equal(
    report.trackedFileCount > 0,
    true,
  );
  assert.deepEqual(report.findings, []);
});

test("runs every local release gate as a separately named pull request check", async () => {
  const workflowUrls = [
    "pull-request-quality-gates.yml",
    "dependency-audit-evidence.yml",
    "team-invitation-browser-e2e.yml",
  ].map(
    (fileName) =>
      new URL(
        `../.github/workflows/${fileName}`,
        import.meta.url,
      ),
  );
  const [workflow, ...supportingWorkflows] =
    await Promise.all(
      workflowUrls.map((url) =>
        readFile(url, "utf8"),
      ),
    );
  const dependencyAuditWorkflow =
    supportingWorkflows[0];
  const nodeVersion = (
    await readFile(
      new URL(
        "../.node-version",
        import.meta.url,
      ),
      "utf8",
    )
  ).trim();

  assert.equal(nodeVersion, "24.18.1");

  for (const candidate of [
    workflow,
    ...supportingWorkflows,
  ]) {
    assert.match(
      candidate,
      /node-version-file: \.node-version/,
    );
    assert.doesNotMatch(
      candidate,
      /node-version: /,
    );
  }

  assert.match(workflow, /^on:\n  pull_request:\n/m);
  assert.match(
    workflow,
    /^permissions:\n  contents: read$/m,
  );
  assert.doesNotMatch(
    workflow,
    /uses:\s+[^\s]+@(?![a-f0-9]{40}(?:\s|$))[^\s]+/,
  );

  for (const check of localPullRequestChecks) {
    assert.match(
      workflow,
      new RegExp(
        `^  ${check}:\\n    name: ${check}$`,
        "m",
      ),
    );
  }

  assert.match(
    workflow,
    /secret-hygiene:[\s\S]*?fetch-depth: 0[\s\S]*?npm run verify:secret-hygiene/,
  );
  assert.match(
    workflow,
    /tests-and-build:[\s\S]*?fetch-depth: 0[\s\S]*?npm ci[\s\S]*?npm test/,
  );
  assert.equal(
    dependencyAuditWorkflow.match(
      /if: \$\{\{ github\.event\.repository\.private == false \}\}/g,
    )?.length,
    2,
  );
  assert.match(
    dependencyAuditWorkflow,
    /path: \.artifacts\/dependency-audit-evidence\*\.json/,
  );
});
