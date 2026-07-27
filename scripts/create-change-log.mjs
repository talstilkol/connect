import {
  execFileSync,
} from "node:child_process";
import {
  mkdir,
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
  "CHANGELOG.md",
);
const commitPattern = /^[a-f0-9]{40}$/;
const subjectPattern =
  /^(feat|fix|security|ci|docs|refactor|perf|test|build|chore)(?:\([a-z0-9._/-]+\))?!?: [^\r\n]{1,160}$/;
const categoryOrder = Object.freeze([
  "security",
  "fix",
  "feat",
  "perf",
  "refactor",
  "ci",
  "build",
  "test",
  "docs",
  "chore",
]);
const categoryTitles = Object.freeze({
  security: "Security",
  fix: "Fixes",
  feat: "Features",
  perf: "Performance",
  refactor: "Refactoring",
  ci: "CI and release",
  build: "Build",
  test: "Tests",
  docs: "Documentation",
  chore: "Maintenance",
});

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

export function parseCommitHistory(rawHistory) {
  if (
    typeof rawHistory !== "string" ||
    rawHistory.length === 0
  ) {
    throw new Error(
      "CHANGE_LOG_HISTORY_REQUIRED",
    );
  }

  const commits = rawHistory
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const separatorIndex =
        line.indexOf("\t");

      if (separatorIndex < 1) {
        throw new Error(
          "CHANGE_LOG_HISTORY_INVALID",
        );
      }

      const commitSha =
        line.slice(0, separatorIndex);
      const subject =
        line.slice(separatorIndex + 1);
      const type =
        subject.match(subjectPattern)?.[1];

      if (
        !commitPattern.test(commitSha) ||
        !type
      ) {
        throw new Error(
          "CHANGE_LOG_HISTORY_INVALID",
        );
      }

      return Object.freeze({
        commitSha,
        subject,
        type,
      });
    });

  if (commits.length === 0) {
    throw new Error(
      "CHANGE_LOG_HISTORY_REQUIRED",
    );
  }

  return Object.freeze(commits);
}

export function buildChangeLog(commits) {
  if (
    !Array.isArray(commits) ||
    commits.length === 0
  ) {
    throw new Error(
      "CHANGE_LOG_COMMITS_REQUIRED",
    );
  }

  const sections = categoryOrder
    .map((type) => {
      const matching = commits.filter(
        (commit) =>
          commit.type === type,
      );

      if (matching.length === 0) {
        return null;
      }

      return [
        `## ${categoryTitles[type]}`,
        "",
        ...matching.map(
          (commit) =>
            `- ${commit.subject} (\`${commit.commitSha.slice(0, 12)}\`)`,
        ),
      ].join("\n");
    })
    .filter(Boolean);

  return [
    "# Connect Change Log",
    "",
    "Generated deterministically from the committed Git history.",
    "",
    ...sections,
    "",
  ].join("\n");
}

export function createCurrentChangeLog() {
  const history = git([
    "log",
    "--reverse",
    "--format=%H%x09%s",
  ]);

  return buildChangeLog(
    parseCommitHistory(history),
  );
}

async function runCli() {
  if (process.argv.length !== 2) {
    console.error(
      "Change log: INVALID_ARGUMENTS",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const changeLog =
      createCurrentChangeLog();

    await mkdir(dirname(outputPath), {
      recursive: true,
    });
    await writeFile(
      outputPath,
      changeLog,
      {
        encoding: "utf8",
        flag: "w",
      },
    );
    console.log(
      "Change log: PASS",
    );
  } catch (error) {
    console.error(
      `Change log: FAIL (${
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
