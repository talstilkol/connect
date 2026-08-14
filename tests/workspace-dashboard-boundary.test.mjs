import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

test("keeps dashboard behavior behind the workspace dashboard feature boundary", async () => {
  const [workspaceSource, dashboardSource, setupStepsSource] =
    await Promise.all([
      readSource(
        "features/workspace/WorkspaceApp.tsx",
      ),
      readSource(
        "features/workspace/WorkspaceDashboard.tsx",
      ),
      readSource(
        "features/workspace/workspaceSetupSteps.ts",
      ),
    ]);

  assert.match(
    workspaceSource,
    /<WorkspaceDashboard/,
  );
  assert.doesNotMatch(
    workspaceSource,
    /function Dashboard\b|inspectDashboardSetup/,
  );
  assert.match(
    dashboardSource,
    /export function WorkspaceDashboard/,
  );
  assert.match(
    dashboardSource,
    /workspaceSetupSteps\.slice\(0, 5\)/,
  );
  assert.match(
    setupStepsSource,
    /export const workspaceSetupSteps = Object\.freeze\(\[/,
  );
});

test("keeps onboarding state and persistence behind its feature boundary", async () => {
  const [workspaceSource, onboardingSource, featurePageSource] =
    await Promise.all([
      readSource(
        "features/workspace/WorkspaceApp.tsx",
      ),
      readSource(
        "features/workspace/WorkspaceOnboarding.tsx",
      ),
      readSource(
        "features/workspace/WorkspaceFeaturePage.tsx",
      ),
    ]);

  assert.match(
    workspaceSource,
    /<WorkspaceOnboarding/,
  );
  assert.doesNotMatch(
    workspaceSource,
    /function Onboarding\b|saveBusinessProfileAction|inspectBusinessProfileCompleteness/,
  );
  assert.match(
    onboardingSource,
    /export function WorkspaceOnboarding/,
  );
  assert.match(
    onboardingSource,
    /saveBusinessProfileAction\(draft\)/,
  );
  assert.match(
    featurePageSource,
    /export function FeaturePage/,
  );
});
