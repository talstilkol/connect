import assert from "node:assert/strict";
import test from "node:test";

import {
  createCurrentGithubEvidence,
  createGithubCiExecutionEvidence,
  createGithubGovernanceEvidence,
  parseGithubRepository,
  readGithubApiJson,
} from "../scripts/create-github-evidence.mjs";
import {
  inspectCiExecutionEvidence,
} from "../server/operations/ciExecutionEvidence.ts";
import {
  inspectSourceControlGovernanceEvidence,
  requiredPullRequestStatusChecks,
} from "../server/operations/sourceControlGovernanceEvidence.ts";

const repository =
  "repository-owner/repository-name";
const commitSha = "1".repeat(40);
const releaseId =
  `connect_release_v1_${"2".repeat(
    64,
  )}`;
const verifiedAt =
  "2026-08-14T12:00:00.000Z";
const now = new Date(verifiedAt);

function releaseManifest() {
  return {
    releaseId,
    commitSha,
  };
}

function repositoryResponse() {
  return {
    full_name: repository,
    private: true,
    visibility: "private",
    default_branch: "main",
    security_and_analysis: {
      secret_scanning: {
        status: "enabled",
      },
      secret_scanning_push_protection: {
        status: "enabled",
      },
    },
  };
}

function protectionResponse() {
  return {
    required_status_checks: {
      strict: true,
      contexts:
        requiredPullRequestStatusChecks,
      checks: [],
    },
    enforce_admins: {
      enabled: true,
    },
    required_pull_request_reviews: {
      require_code_owner_reviews: true,
      dismiss_stale_reviews: true,
      required_approving_review_count: 1,
    },
    required_conversation_resolution: {
      enabled: true,
    },
    allow_force_pushes: {
      enabled: false,
    },
    allow_deletions: {
      enabled: false,
    },
  };
}

function codeOwnersResponse() {
  return {
    type: "file",
    sha: "3".repeat(40),
    size: 42,
  };
}

function checkRunsResponse() {
  return {
    total_count:
      requiredPullRequestStatusChecks.length,
    check_runs:
      requiredPullRequestStatusChecks.map(
        (name, index) => ({
          id: index + 1,
          name,
          head_sha: commitSha,
          status: "completed",
          conclusion: "success",
          started_at:
            "2026-08-14T10:00:00Z",
          completed_at:
            "2026-08-14T11:00:00Z",
          check_suite: {
            id: index + 101,
          },
          app: {
            id: 7,
          },
        }),
      ),
  };
}

test("accepts only one bounded GitHub repository coordinate and read-only API call", () => {
  assert.deepEqual(
    parseGithubRepository(repository),
    {
      owner: "repository-owner",
      repository: "repository-name",
      nameWithOwner: repository,
    },
  );

  for (const value of [
    "repository-name",
    "owner/repository/extra",
    "owner/repository name",
    "owner/repository?ref=main",
  ]) {
    assert.throws(
      () => parseGithubRepository(value),
      /GITHUB_REPOSITORY_INVALID/,
    );
  }

  let invocation;
  const response = readGithubApiJson(
    "/repos/repository-owner/repository-name",
    (command, argumentsList, options) => {
      invocation = {
        command,
        argumentsList,
        options,
      };

      return {
        status: 0,
        signal: null,
        stdout: "{\"default_branch\":\"main\"}",
      };
    },
  );

  assert.deepEqual(response, {
    default_branch: "main",
  });
  assert.equal(invocation.command, "gh");
  assert.equal(
    invocation.argumentsList.includes("GET"),
    true,
  );
  assert.deepEqual(
    invocation.options.stdio,
    ["ignore", "pipe", "pipe"],
  );
});

test("builds bounded GitHub governance and CI evidence from verified responses", () => {
  const governance =
    createGithubGovernanceEvidence({
      repository,
      repositoryResponse:
        repositoryResponse(),
      protectionResponse:
        protectionResponse(),
      codeOwnersResponse:
        codeOwnersResponse(),
      releaseManifest:
        releaseManifest(),
      verifiedAt,
    });
  const ciExecution =
    createGithubCiExecutionEvidence({
      checkRunsResponse:
        checkRunsResponse(),
      releaseManifest:
        releaseManifest(),
      verifiedAt,
    });
  const serialized = JSON.stringify({
    governance,
    ciExecution,
  });

  assert.equal(
    serialized.includes(repository),
    false,
  );
  assert.equal(
    serialized.includes("main"),
    false,
  );
  assert.equal(
    inspectSourceControlGovernanceEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          commitSha,
        SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
          JSON.stringify(governance),
      },
      now,
    ).status,
    "configured",
  );
  assert.equal(
    inspectCiExecutionEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          commitSha,
        APP_RELEASE_ID: releaseId,
        CI_EXECUTION_EVIDENCE_JSON:
          JSON.stringify(ciExecution),
      },
      now,
    ).status,
    "configured",
  );
});

test("fails closed for incomplete governance and ambiguous CI checks", () => {
  const publicRepository =
    repositoryResponse();
  publicRepository.private = false;
  publicRepository.visibility = "public";
  const inconsistentVisibility =
    repositoryResponse();
  inconsistentVisibility.visibility = "public";
  const disabledSecurity =
    repositoryResponse();
  disabledSecurity.security_and_analysis
    .secret_scanning.status = "disabled";
  const missingRequiredCheck =
    protectionResponse();
  missingRequiredCheck.required_status_checks
    .contexts =
      requiredPullRequestStatusChecks.slice(1);
  const duplicateCheckRuns =
    checkRunsResponse();
  duplicateCheckRuns.check_runs.push({
    ...duplicateCheckRuns.check_runs[0],
    id: 999,
  });

  for (const value of [
    {
      repositoryResponse:
        publicRepository,
      protectionResponse:
        protectionResponse(),
      codeOwnersResponse:
        codeOwnersResponse(),
    },
    {
      repositoryResponse:
        inconsistentVisibility,
      protectionResponse:
        protectionResponse(),
      codeOwnersResponse:
        codeOwnersResponse(),
    },
    {
      repositoryResponse:
        disabledSecurity,
      protectionResponse:
        protectionResponse(),
      codeOwnersResponse:
        codeOwnersResponse(),
    },
    {
      repositoryResponse:
        repositoryResponse(),
      protectionResponse:
        missingRequiredCheck,
      codeOwnersResponse:
        codeOwnersResponse(),
    },
    {
      repositoryResponse:
        repositoryResponse(),
      protectionResponse:
        protectionResponse(),
      codeOwnersResponse: {
        ...codeOwnersResponse(),
        size: 0,
      },
    },
  ]) {
    assert.throws(
      () =>
        createGithubGovernanceEvidence({
          repository,
          ...value,
          releaseManifest:
            releaseManifest(),
          verifiedAt,
        }),
      /GITHUB_(?:GOVERNANCE_SNAPSHOT|REQUIRED_CHECKS)_INVALID/,
    );
  }

  assert.throws(
    () =>
      createGithubCiExecutionEvidence({
        checkRunsResponse:
          duplicateCheckRuns,
        releaseManifest:
          releaseManifest(),
        verifiedAt,
      }),
    /GITHUB_REQUIRED_CHECK_RUN_INVALID/,
  );
});

test("reads the exact four release-bound endpoints before building current evidence", async () => {
  const responses = new Map([
    [
      "/repos/repository-owner/repository-name",
      repositoryResponse(),
    ],
    [
      "/repos/repository-owner/repository-name/branches/main/protection",
      protectionResponse(),
    ],
    [
      `/repos/repository-owner/repository-name/contents/.github/CODEOWNERS?ref=${commitSha}`,
      codeOwnersResponse(),
    ],
    [
      `/repos/repository-owner/repository-name/commits/${commitSha}/check-runs?filter=latest&per_page=100`,
      checkRunsResponse(),
    ],
  ]);
  const observedEndpoints = [];
  const evidence =
    await createCurrentGithubEvidence({
      repository,
      now,
      createReleaseManifest: async () =>
        releaseManifest(),
      runCommand:
        (_command, argumentsList) => {
          const endpoint =
            argumentsList.at(-1);
          observedEndpoints.push(endpoint);

          return {
            status: 0,
            signal: null,
            stdout: JSON.stringify(
              responses.get(endpoint),
            ),
          };
        },
    });

  assert.deepEqual(
    observedEndpoints,
    [...responses.keys()],
  );
  assert.equal(
    evidence.governance.releaseCommitSha,
    commitSha,
  );
  assert.equal(
    evidence.ciExecution.releaseId,
    releaseId,
  );
});
