import {
  spawnSync,
} from "node:child_process";
import {
  mkdir,
  writeFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  buildCiExecutionEvidence,
} from "../server/operations/ciExecutionEvidence.ts";
import {
  buildSourceControlGovernanceEvidence,
  requiredPullRequestStatusChecks,
} from "../server/operations/sourceControlGovernanceEvidence.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const artifactDirectory = join(
  projectRoot,
  ".artifacts",
);
const maximumApiResponseBytes =
  2_097_152;
const repositoryPattern =
  /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const commitPattern = /^[a-f0-9]{40}$/;
const gitObjectPattern = /^[a-f0-9]{40}$/;
const githubApiVersion = "2026-03-10";

function isObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function fail(code) {
  throw new Error(code);
}

function canonicalTimestamp(value) {
  if (typeof value !== "string") {
    fail("GITHUB_EVIDENCE_TIMESTAMP_INVALID");
  }

  const milliseconds = Date.parse(value);

  if (!Number.isFinite(milliseconds)) {
    fail("GITHUB_EVIDENCE_TIMESTAMP_INVALID");
  }

  return new Date(milliseconds).toISOString();
}

export function parseGithubRepository(
  rawValue,
) {
  if (
    typeof rawValue !== "string" ||
    !repositoryPattern.test(rawValue)
  ) {
    fail("GITHUB_REPOSITORY_INVALID");
  }

  const [owner, repository] =
    rawValue.split("/");

  return Object.freeze({
    owner,
    repository,
    nameWithOwner: rawValue,
  });
}

export function parseGithubApiJson(
  rawValue,
) {
  if (
    typeof rawValue !== "string" ||
    rawValue.length < 2 ||
    rawValue.length > maximumApiResponseBytes
  ) {
    fail("GITHUB_API_RESPONSE_INVALID");
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    fail("GITHUB_API_RESPONSE_INVALID");
  }
}

export function readGithubApiJson(
  endpoint,
  runCommand = spawnSync,
) {
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("/repos/") ||
    endpoint.length > 1_024 ||
    /[\s\0]/.test(endpoint)
  ) {
    fail("GITHUB_API_ENDPOINT_INVALID");
  }

  const result = runCommand(
    "gh",
    [
      "api",
      "--method",
      "GET",
      "-H",
      "Accept: application/vnd.github+json",
      "-H",
      `X-GitHub-Api-Version: ${githubApiVersion}`,
      endpoint,
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: maximumApiResponseBytes,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (
    !result ||
    result.error ||
    result.status !== 0 ||
    result.signal !== null ||
    typeof result.stdout !== "string"
  ) {
    fail("GITHUB_API_READ_FAILED");
  }

  return parseGithubApiJson(result.stdout);
}

function requireReleaseManifest(value) {
  if (
    !isObject(value) ||
    typeof value.releaseId !== "string" ||
    !/^connect_release_v1_[a-f0-9]{64}$/.test(
      value.releaseId,
    ) ||
    typeof value.commitSha !== "string" ||
    !commitPattern.test(value.commitSha)
  ) {
    fail("GITHUB_RELEASE_MANIFEST_INVALID");
  }

  return value;
}

function requiredCheckNames(protection) {
  const requiredStatusChecks =
    protection.required_status_checks;

  if (
    !isObject(requiredStatusChecks) ||
    requiredStatusChecks.strict !== true
  ) {
    fail("GITHUB_BRANCH_PROTECTION_INVALID");
  }

  const names = [
    ...(
      Array.isArray(
        requiredStatusChecks.contexts,
      )
        ? requiredStatusChecks.contexts
        : []
    ),
    ...(
      Array.isArray(
        requiredStatusChecks.checks,
      )
        ? requiredStatusChecks.checks.map(
            (check) =>
              isObject(check)
                ? check.context
                : null,
          )
        : []
    ),
  ];
  const uniqueNames = [...new Set(names)];

  if (
    uniqueNames.length !==
      requiredPullRequestStatusChecks.length ||
    uniqueNames.some(
      (name) => typeof name !== "string",
    ) ||
    requiredPullRequestStatusChecks.some(
      (name) => !uniqueNames.includes(name),
    )
  ) {
    fail("GITHUB_REQUIRED_CHECKS_INVALID");
  }

  return uniqueNames;
}

export function createGithubGovernanceEvidence({
  repository,
  repositoryResponse,
  protectionResponse,
  codeOwnersResponse,
  releaseManifest,
  verifiedAt,
}) {
  const parsedRepository =
    parseGithubRepository(repository);
  const manifest =
    requireReleaseManifest(releaseManifest);

  if (
    !isObject(repositoryResponse) ||
    typeof repositoryResponse.full_name !==
      "string" ||
    repositoryResponse.full_name.toLowerCase() !==
      parsedRepository.nameWithOwner.toLowerCase() ||
    repositoryResponse.private !== true ||
    repositoryResponse.visibility !== "private" ||
    typeof repositoryResponse.default_branch !==
      "string" ||
    repositoryResponse.default_branch.length < 1 ||
    repositoryResponse.default_branch.length > 255 ||
    !isObject(
      repositoryResponse.security_and_analysis,
    ) ||
    !isObject(
      repositoryResponse.security_and_analysis
        .secret_scanning,
    ) ||
    repositoryResponse.security_and_analysis
      .secret_scanning.status !== "enabled" ||
    !isObject(
      repositoryResponse.security_and_analysis
        .secret_scanning_push_protection,
    ) ||
    repositoryResponse.security_and_analysis
      .secret_scanning_push_protection.status !==
        "enabled" ||
    !isObject(protectionResponse) ||
    !isObject(protectionResponse.enforce_admins) ||
    protectionResponse.enforce_admins.enabled !==
      true ||
    !isObject(
      protectionResponse
        .required_pull_request_reviews,
    ) ||
    protectionResponse
      .required_pull_request_reviews
      .require_code_owner_reviews !== true ||
    protectionResponse
      .required_pull_request_reviews
      .dismiss_stale_reviews !== true ||
    !Number.isSafeInteger(
      protectionResponse
        .required_pull_request_reviews
        .required_approving_review_count,
    ) ||
    !isObject(
      protectionResponse
        .required_conversation_resolution,
    ) ||
    protectionResponse
      .required_conversation_resolution.enabled !==
        true ||
    !isObject(
      protectionResponse.allow_force_pushes,
    ) ||
    protectionResponse.allow_force_pushes.enabled !==
      false ||
    !isObject(
      protectionResponse.allow_deletions,
    ) ||
    protectionResponse.allow_deletions.enabled !==
      false ||
    !isObject(codeOwnersResponse) ||
    codeOwnersResponse.type !== "file" ||
    typeof codeOwnersResponse.sha !== "string" ||
    !gitObjectPattern.test(codeOwnersResponse.sha) ||
    !Number.isSafeInteger(codeOwnersResponse.size) ||
    codeOwnersResponse.size < 1 ||
    codeOwnersResponse.size > 1_048_576
  ) {
    fail("GITHUB_GOVERNANCE_SNAPSHOT_INVALID");
  }

  return buildSourceControlGovernanceEvidence({
    verifiedAt:
      canonicalTimestamp(verifiedAt),
    repositoryIdentity:
      repositoryResponse.full_name,
    defaultBranchIdentity:
      `${repositoryResponse.full_name}:${repositoryResponse.default_branch}`,
    releaseCommitSha: manifest.commitSha,
    requiredReviewCount:
      protectionResponse
        .required_pull_request_reviews
        .required_approving_review_count,
    requiredStatusChecks:
      requiredCheckNames(
        protectionResponse,
      ),
    controls: {
      repositoryPrivate: true,
      branchProtection: true,
      codeOwnerReview: true,
      dismissStaleApprovals: true,
      conversationResolution: true,
      forcePushBlocked: true,
      branchDeletionBlocked: true,
      secretScanning: true,
      pushProtection: true,
    },
  });
}

function requireCheckRun(
  rawCheckRun,
  name,
  commitSha,
) {
  if (
    !isObject(rawCheckRun) ||
    rawCheckRun.name !== name ||
    !Number.isSafeInteger(rawCheckRun.id) ||
    rawCheckRun.id < 1 ||
    rawCheckRun.head_sha !== commitSha ||
    rawCheckRun.status !== "completed" ||
    rawCheckRun.conclusion !== "success" ||
    !isObject(rawCheckRun.check_suite) ||
    !Number.isSafeInteger(
      rawCheckRun.check_suite.id,
    ) ||
    rawCheckRun.check_suite.id < 1 ||
    !isObject(rawCheckRun.app) ||
    !Number.isSafeInteger(rawCheckRun.app.id) ||
    rawCheckRun.app.id < 1
  ) {
    fail("GITHUB_CHECK_RUN_INVALID");
  }

  const completedAt = canonicalTimestamp(
    rawCheckRun.completed_at,
  );
  const startedAt = canonicalTimestamp(
    rawCheckRun.started_at,
  );

  if (
    Date.parse(startedAt) >
      Date.parse(completedAt)
  ) {
    fail("GITHUB_CHECK_RUN_INVALID");
  }

  return {
    name,
    conclusion: "success",
    completedAt,
    runIdentity:
      `${rawCheckRun.id}:${rawCheckRun.check_suite.id}:${rawCheckRun.app.id}`,
    outputIdentity: JSON.stringify({
      name,
      headSha: rawCheckRun.head_sha,
      status: rawCheckRun.status,
      conclusion: rawCheckRun.conclusion,
      startedAt,
      completedAt,
      checkSuiteId:
        rawCheckRun.check_suite.id,
      appId: rawCheckRun.app.id,
    }),
  };
}

export function createGithubCiExecutionEvidence({
  checkRunsResponse,
  releaseManifest,
  verifiedAt,
}) {
  const manifest =
    requireReleaseManifest(releaseManifest);

  if (
    !isObject(checkRunsResponse) ||
    !Array.isArray(
      checkRunsResponse.check_runs,
    ) ||
    checkRunsResponse.check_runs.length > 100
  ) {
    fail("GITHUB_CHECK_RUNS_RESPONSE_INVALID");
  }

  const checks =
    requiredPullRequestStatusChecks.map(
      (name) => {
        const matches =
          checkRunsResponse.check_runs.filter(
            (checkRun) =>
              isObject(checkRun) &&
              checkRun.name === name,
          );

        if (matches.length !== 1) {
          fail("GITHUB_REQUIRED_CHECK_RUN_INVALID");
        }

        return requireCheckRun(
          matches[0],
          name,
          manifest.commitSha,
        );
      },
    );

  return buildCiExecutionEvidence({
    verifiedAt:
      canonicalTimestamp(verifiedAt),
    releaseId: manifest.releaseId,
    commitSha: manifest.commitSha,
    checks,
  });
}

export async function createCurrentGithubEvidence({
  repository,
  now = new Date(),
  runCommand = spawnSync,
  createReleaseManifest =
    createCurrentReleaseManifest,
}) {
  const parsedRepository =
    parseGithubRepository(repository);

  if (!Number.isFinite(now.getTime())) {
    fail("GITHUB_EVIDENCE_CLOCK_INVALID");
  }

  const manifest =
    await createReleaseManifest();
  const baseEndpoint =
    `/repos/${parsedRepository.owner}/${parsedRepository.repository}`;
  const repositoryResponse =
    readGithubApiJson(
      baseEndpoint,
      runCommand,
    );
  const defaultBranch =
    typeof repositoryResponse?.default_branch ===
      "string"
      ? repositoryResponse.default_branch
      : "";
  const encodedBranch =
    encodeURIComponent(defaultBranch);
  const protectionResponse =
    readGithubApiJson(
      `${baseEndpoint}/branches/${encodedBranch}/protection`,
      runCommand,
    );
  const codeOwnersResponse =
    readGithubApiJson(
      `${baseEndpoint}/contents/.github/CODEOWNERS?ref=${manifest.commitSha}`,
      runCommand,
    );
  const checkRunsResponse =
    readGithubApiJson(
      `${baseEndpoint}/commits/${manifest.commitSha}/check-runs?filter=latest&per_page=100`,
      runCommand,
    );
  const verifiedAt = now.toISOString();

  return Object.freeze({
    governance:
      createGithubGovernanceEvidence({
        repository:
          parsedRepository.nameWithOwner,
        repositoryResponse,
        protectionResponse,
        codeOwnersResponse,
        releaseManifest: manifest,
        verifiedAt,
      }),
    ciExecution:
      createGithubCiExecutionEvidence({
        checkRunsResponse,
        releaseManifest: manifest,
        verifiedAt,
      }),
  });
}

async function writeEvidence(
  fileName,
  evidence,
) {
  await mkdir(artifactDirectory, {
    recursive: true,
  });
  await writeFile(
    join(artifactDirectory, fileName),
    `${JSON.stringify(evidence, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "w",
      mode: 0o644,
    },
  );
}

async function runCli() {
  if (process.argv.length !== 2) {
    fail("GITHUB_EVIDENCE_ARGUMENTS_INVALID");
  }

  const evidence =
    await createCurrentGithubEvidence({
      repository:
        process.env.GITHUB_REPOSITORY,
    });

  await Promise.all([
    writeEvidence(
      "source-control-governance-evidence.json",
      evidence.governance,
    ),
    writeEvidence(
      "ci-execution-evidence.json",
      evidence.ciExecution,
    ),
  ]);

  console.log(
    `GitHub evidence: PASS (${evidence.governance.evidenceDigest}, ${evidence.ciExecution.evidenceDigest})`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(`file://${process.argv[1]}`),
    )
) {
  try {
    await runCli();
  } catch (error) {
    const code =
      error instanceof Error &&
      /^[A-Z][A-Z0-9_]+$/.test(
        error.message,
      )
        ? error.message
        : "GITHUB_EVIDENCE_FAILED";

    console.error(
      `GitHub evidence: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
