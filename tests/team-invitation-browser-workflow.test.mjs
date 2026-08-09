import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const workflowPath = new URL(
  "../.github/workflows/team-invitation-browser-e2e.yml",
  import.meta.url,
);

test("keeps the staging proof workflow manual, read-only, and environment protected", async () => {
  const workflow = await readFile(
    workflowPath,
    "utf8",
  );

  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(
    workflow,
    /pull_request_target|\n  push:|\n  pull_request:/,
  );
  assert.match(
    workflow,
    /permissions:\n  contents: read/,
  );
  assert.match(
    workflow,
    /environment: staging-e2e/,
  );
  assert.match(
    workflow,
    /cancel-in-progress: false/,
  );
});

test("pins every external action and supplies secrets only to the browser step", async () => {
  const workflow = await readFile(
    workflowPath,
    "utf8",
  );
  const actionReferences = [
    ...workflow.matchAll(
      /uses: [^@\s]+@([^\s]+)/g,
    ),
  ].map((match) => match[1]);

  assert.equal(actionReferences.length, 3);
  assert.equal(
    actionReferences.every((reference) =>
      /^[a-f0-9]{40}$/.test(reference),
    ),
    true,
  );
  assert.match(
    workflow,
    /TEAM_INVITATION_BROWSER_AUTH_STATES_JSON: \$\{\{ secrets\.TEAM_INVITATION_BROWSER_AUTH_STATES_JSON \}\}/,
  );
  assert.match(
    workflow,
    /TEAM_INVITATION_BROWSER_CLOUDFLARE_D1_READ_TOKEN: \$\{\{ secrets\.TEAM_INVITATION_BROWSER_CLOUDFLARE_D1_READ_TOKEN \}\}/,
  );
  assert.match(
    workflow,
    /TEAM_INVITATION_BROWSER_E2E_CASES_JSON: \$\{\{ secrets\.TEAM_INVITATION_BROWSER_E2E_CASES_JSON \}\}/,
  );
  assert.match(
    workflow,
    /retention-days: 1/,
  );
});
