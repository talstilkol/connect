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
  const [
    workspaceSource,
    sectionSource,
    dashboardSource,
    setupStepsSource,
  ] =
    await Promise.all([
      readSource(
        "features/workspace/WorkspaceApp.tsx",
      ),
      readSource(
        "features/workspace/WorkspaceSectionContent.tsx",
      ),
      readSource(
        "features/workspace/WorkspaceDashboard.tsx",
      ),
      readSource(
        "features/workspace/workspaceSetupSteps.ts",
      ),
    ]);

  assert.match(
    sectionSource,
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
    /setupSteps\.slice\(0, 5\)/,
  );
  assert.match(
    setupStepsSource,
    /const setupStepsByLanguage = Object\.freeze\(\{/,
  );
});

test("keeps onboarding state and persistence behind its feature boundary", async () => {
  const [
    workspaceSource,
    sectionSource,
    onboardingSource,
    featurePageSource,
  ] =
    await Promise.all([
      readSource(
        "features/workspace/WorkspaceApp.tsx",
      ),
      readSource(
        "features/workspace/WorkspaceSectionContent.tsx",
      ),
      readSource(
        "features/workspace/WorkspaceOnboarding.tsx",
      ),
      readSource(
        "features/workspace/WorkspaceFeaturePage.tsx",
      ),
    ]);

  assert.match(
    sectionSource,
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

test("keeps Meta signup lifecycle and dialog behavior behind its feature boundary", async () => {
  const [workspaceSource, metaPanelSource, guardrailSource] =
    await Promise.all([
      readSource(
        "features/workspace/WorkspaceApp.tsx",
      ),
      readSource(
        "features/workspace/MetaConnectionPanel.tsx",
      ),
      readSource(
        "scripts/verify-interface-guardrails.mjs",
      ),
    ]);

  assert.match(
    workspaceSource,
    /<MetaConnectionPanel/,
  );
  assert.doesNotMatch(
    workspaceSource,
    /useAccessibleDialog|completeMetaEmbeddedSignupAction|META_SIGNUP_FLOW_TIMEOUT_MS/,
  );
  assert.match(
    metaPanelSource,
    /export function MetaConnectionPanel/,
  );
  assert.match(
    metaPanelSource,
    /useAccessibleDialog\(onClose\)/,
  );
  assert.match(
    metaPanelSource,
    /role="dialog"[\s\S]{0,80}aria-modal="true"/,
  );
  assert.match(
    guardrailSource,
    /file: "features\/workspace\/MetaConnectionPanel\.tsx"/,
  );
});

test("keeps section selection outside the workspace navigation shell", async () => {
  const [workspaceSource, sectionSource] =
    await Promise.all([
      readSource(
        "features/workspace/WorkspaceApp.tsx",
      ),
      readSource(
        "features/workspace/WorkspaceSectionContent.tsx",
      ),
    ]);

  assert.match(
    workspaceSource,
    /<WorkspaceSectionContent/,
  );
  assert.doesNotMatch(
    workspaceSource,
    /activeSection === "(?:dashboard|onboarding|contacts|templates|campaigns|inbox|bot|ai|reports|billing|team|decisions)"/,
  );
  assert.match(
    sectionSource,
    /export function WorkspaceSectionContent/,
  );
  assert.match(
    sectionSource,
    /activeSection === "dashboard"/,
  );
  assert.match(
    sectionSource,
    /activeSection === "decisions"/,
  );
  assert.doesNotMatch(
    sectionSource,
    /useRouter|UserButton|TenantWorkspaceSwitcher/,
  );
});
