import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";

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
  sourceControlChecksAppId,
} from "../server/operations/sourceControlGovernanceEvidence.ts";

const repository =
  "talstilkol/connect";
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
    owner: {login: "talstilkol", type: "User"},
    private: false,
    visibility: "public",
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
  sourceControlChecksAppId,
      checks: requiredPullRequestStatusChecks.map((context) => ({context, app_id: sourceControlChecksAppId})),
    },
    enforce_admins: {
      enabled: true,
    },
    required_pull_request_reviews: {
      require_code_owner_reviews: false,
      dismiss_stale_reviews: true,
      required_approving_review_count: 0,
      require_last_push_approval: false,
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

function collaboratorsResponse() {
  return [{login: "talstilkol", permissions: {admin: true, push: true}}];
}

function codeOwnersResponse(bytes = readFileSync(new URL("../.github/CODEOWNERS", import.meta.url))) {
  return {
    type: "file", path: ".github/CODEOWNERS", encoding: "base64",
    sha: createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"),
    size: bytes.length, content: bytes.toString("base64"),
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
            id: sourceControlChecksAppId,
          },
        }),
      ),
  };
}

test("accepts only one bounded GitHub repository coordinate and read-only API call", () => {
  assert.deepEqual(
    parseGithubRepository(repository),
    {
      owner: "talstilkol",
      repository: "connect",
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
    "/repos/talstilkol/connect",
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
      collaboratorsResponse: collaboratorsResponse(),
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
  const privateRepository =
    repositoryResponse();
  privateRepository.private = true;
  privateRepository.visibility = "private";
  const inconsistentVisibility =
    repositoryResponse();
  inconsistentVisibility.visibility = "private";
  const disabledSecurity =
    repositoryResponse();
  disabledSecurity.security_and_analysis
    .secret_scanning.status = "disabled";
  const missingRequiredCheck =
    protectionResponse();
  missingRequiredCheck.required_status_checks
    .contexts =
      requiredPullRequestStatusChecks.slice(1);
  missingRequiredCheck.required_status_checks.checks = missingRequiredCheck.required_status_checks.checks.slice(1);
  const duplicateCheckRuns =
    checkRunsResponse();
  duplicateCheckRuns.check_runs.push({
    ...duplicateCheckRuns.check_runs[0],
    id: 999,
  });

  for (const value of [
    {
      repositoryResponse:
        privateRepository,
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
          collaboratorsResponse: collaboratorsResponse(),
          ...value,
          releaseManifest:
            releaseManifest(),
          verifiedAt,
        }),
      /GITHUB_(?:GOVERNANCE_SNAPSHOT|REQUIRED_CHECKS|BRANCH_PROTECTION)_INVALID/,
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

test("reads the exact five endpoints with release-bound files and checks before building current evidence", async () => {
  const responses = new Map([
    [
      "/repos/talstilkol/connect",
      repositoryResponse(),
    ],
    [
      "/repos/talstilkol/connect/collaborators?affiliation=all&per_page=100",
      collaboratorsResponse(),
    ],
    [
      "/repos/talstilkol/connect/branches/main/protection",
      protectionResponse(),
    ],
    [
      `/repos/talstilkol/connect/contents/.github/CODEOWNERS?ref=${commitSha}`,
      codeOwnersResponse(),
    ],
    [
      `/repos/talstilkol/connect/commits/${commitSha}/check-runs?filter=latest&per_page=100`,
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

function governanceInput() {
  return {repository, repositoryResponse: repositoryResponse(), collaboratorsResponse: collaboratorsResponse(),
    protectionResponse: protectionResponse(), codeOwnersResponse: codeOwnersResponse(),
    releaseManifest: releaseManifest(), verifiedAt};
}

test("single-owner governance requires the real sole account and write/admin permissions", () => {
  const input = governanceInput();
  assert.equal(createGithubGovernanceEvidence(input).reviewPolicy, "single-owner");
  assert.equal(createGithubGovernanceEvidence(input).requiredReviewCount, 0);
  for (const collaborators of [undefined, [], [...collaboratorsResponse(), ...collaboratorsResponse()],
    [{...collaboratorsResponse()[0], permissions: {push: true, admin: false}}],
    [{...collaboratorsResponse()[0], permissions: {push: false, admin: true}}]]) {
    assert.throws(() => createGithubGovernanceEvidence({...input, collaboratorsResponse: collaborators}), /GITHUB_GOVERNANCE_SNAPSHOT_INVALID/);
  }
  for (const owner of [undefined, {login: "talstilkol", type: "Organization"}, {login: "another-owner", type: "User"}]) {
    assert.throws(() => createGithubGovernanceEvidence({...input, repositoryResponse: {...input.repositoryResponse, owner}}), /GITHUB_GOVERNANCE_SNAPSHOT_INVALID/);
  }
});

test("CODEOWNERS requires checked content and hash, and cannot hide ownership overrides", () => {
  const input = governanceInput();
  const bytes = readFileSync(new URL("../.github/CODEOWNERS", import.meta.url));
  for (const file of [
    {...input.codeOwnersResponse, content: undefined},
    {...input.codeOwnersResponse, content: input.codeOwnersResponse.content + "!"},
    {...input.codeOwnersResponse, sha: "3".repeat(40)},
    {...input.codeOwnersResponse, size: bytes.length + 1},
    {...input.codeOwnersResponse, path: "CODEOWNERS"},
    codeOwnersResponse(Buffer.from("# no ownership rule\n")),
    codeOwnersResponse(Buffer.from("* @another-owner\n")),
    codeOwnersResponse(Buffer.concat([bytes, Buffer.from("/server/ @another-owner\n")])),
  ]) {
    assert.throws(() => createGithubGovernanceEvidence({...input, codeOwnersResponse: file}), /GITHUB_GOVERNANCE_SNAPSHOT_INVALID/);
  }
});

test("zero approving reviews still requires protected PRs without a bypass or second-person gate", () => {
  const input = governanceInput();
  const reviews = input.protectionResponse.required_pull_request_reviews;
  for (const value of [undefined, null, {...reviews, required_approving_review_count: 1},
    {...reviews, require_code_owner_reviews: true}, {...reviews, require_last_push_approval: true},
    {...reviews, bypass_pull_request_allowances: null},
    {...reviews, bypass_pull_request_allowances: {users: [{login: "talstilkol"}], teams: [], apps: []}}]) {
    assert.throws(() => createGithubGovernanceEvidence({...input, protectionResponse: {...input.protectionResponse,
      required_pull_request_reviews: value}}), /GITHUB_GOVERNANCE_SNAPSHOT_INVALID/);
  }
  const empty = {...reviews, bypass_pull_request_allowances: {users: [], teams: [], apps: []}};
  assert.equal(createGithubGovernanceEvidence({...input, protectionResponse: {...input.protectionResponse,
    required_pull_request_reviews: empty}}).controls.pullRequestsRequired, true);
});

test("required checks and successful CI runs remain bound to the observed GitHub Actions app", () => {
  const input = governanceInput();
  const required = input.protectionResponse.required_status_checks;
  for (const value of [{...required, strict: false}, {...required, checks: []},
    {...required, checks: required.checks.map((check) => ({...check, app_id: -1}))},
    {...required, checks: [...required.checks.slice(1), required.checks[1]]}]) {
    assert.throws(() => createGithubGovernanceEvidence({...input, protectionResponse: {...input.protectionResponse,
      required_status_checks: value}}), /GITHUB_(?:BRANCH_PROTECTION|REQUIRED_CHECKS)_INVALID/);
  }
  const runs = checkRunsResponse();
  runs.check_runs[0].app.id = 7;
  assert.throws(() => createGithubCiExecutionEvidence({checkRunsResponse: runs, releaseManifest: releaseManifest(), verifiedAt}), /GITHUB_CHECK_RUN_INVALID/);
});
