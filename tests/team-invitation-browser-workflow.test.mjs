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
    /permissions:\n  contents: read\n  id-token: write\n  attestations: write\n  artifact-metadata: write/,
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

test("pins every external action and supplies secrets only to preflight and browser execution", async () => {
  const workflow = await readFile(
    workflowPath,
    "utf8",
  );
  const actionReferences = [
    ...workflow.matchAll(
      /uses: [^@\s]+@([^\s]+)/g,
    ),
  ].map((match) => match[1]);

  assert.equal(actionReferences.length, 4);
  assert.equal(
    actionReferences.every((reference) =>
      /^[a-f0-9]{40}$/.test(reference),
    ),
    true,
  );
  for (const secretName of [
    "TEAM_INVITATION_BROWSER_AUTH_STATES_JSON",
    "TEAM_INVITATION_BROWSER_CLOUDFLARE_D1_READ_TOKEN",
    "TEAM_INVITATION_BROWSER_E2E_CASES_JSON",
  ]) {
    const secretReference =
      `${secretName}: ` +
      "${{ secrets." +
      secretName +
      " }}";

    assert.equal(
      workflow.split(secretReference).length - 1,
      2,
    );
  }
  assert.match(
    workflow,
    /retention-days: 1/,
  );
  assert.match(
    workflow,
    /uses: actions\/attest@508db95dd578ae2727ebd6217d5ba78e4fbda05d # v4\.2\.1/,
  );
  assert.match(
    workflow,
    /subject-path: \.artifacts\/team-invitation-browser-evidence\.json/,
  );
  assert.match(
    workflow,
    /team-invitation-browser-evidence-attestation\.json/,
  );
  assert.ok(
    workflow.indexOf(
      "npm run preflight:team-invitation-browser",
    ) <
      workflow.indexOf(
        "npx playwright install --with-deps chromium",
      ),
  );
});
