import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  workspaceShellMessages,
} from "../shared/i18n/workspace.ts";
import {
  readWorkspaceSetupMessages,
} from "../shared/i18n/workspaceSetup.ts";
import {
  readWorkspaceSetupSteps,
} from "../features/workspace/workspaceSetupSteps.ts";
import {
  presentMetaConnection,
} from "../features/workspace/metaConnectionPresentation.ts";
import {
  isMetaEmbeddedSignupSdkErrorStatus,
  metaEmbeddedSignupSdkErrorStatuses,
  metaEmbeddedSignupSdkStatuses,
  metaSignupAttemptStatuses,
  readMetaConnectionPanelMessages,
} from "../features/workspace/metaConnectionPanelMessages.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

test("provides ten immutable, complete setup steps in every workspace language", () => {
  for (const language of ["he", "en", "ar"]) {
    const steps = readWorkspaceSetupSteps(language);

    assert.equal(steps.length, 10);
    assert.equal(Object.isFrozen(steps), true);
    assert.equal(
      new Set(steps.map((step) => step.title)).size,
      10,
    );
    assert.ok(
      steps.every(
        (step) =>
          step.title.trim().length > 0 &&
          step.description.trim().length > 0,
      ),
    );
  }
});

test("keeps Dashboard and Onboarding dynamic messages complete", () => {
  for (const language of ["he", "en", "ar"]) {
    const { dashboard, onboarding } =
      readWorkspaceSetupMessages(language);

    assert.match(
      dashboard.greetingWithBusiness("Connect"),
      /Connect/,
    );
    assert.match(dashboard.progress(3, 10), /3.*10/);
    assert.match(dashboard.blockingDecisions(11), /11/);
    assert.equal(dashboard.metrics.length, 4);
    assert.ok(dashboard.metrics.every((label) => label.trim().length > 0));
    assert.equal(onboarding.checks.length, 4);
    assert.equal(Object.keys(onboarding.saveFailures).length, 6);
    assert.match(onboarding.progress.profile(2, 4), /2\/4/);
  }
});

test("localizes every Meta presentation without changing readiness semantics", () => {
  const statuses = Object.keys(
    workspaceShellMessages.he.metaConnectionStatuses,
  );

  assert.equal(statuses.length, 12);

  for (const status of statuses) {
    const hebrew = presentMetaConnection({ status }, "he");
    const english = presentMetaConnection({ status }, "en");
    const arabic = presentMetaConnection({ status }, "ar");

    for (const presentation of [hebrew, english, arabic]) {
      assert.ok(presentation.statusLabel.trim().length > 0);
      assert.ok(presentation.heading.trim().length > 0);
      assert.ok(presentation.description.trim().length > 0);
      assert.ok(presentation.actionLabel.trim().length > 0);
      assert.ok(presentation.panelNotice.trim().length > 0);
    }

    assert.equal(english.tone, hebrew.tone);
    assert.equal(arabic.tone, hebrew.tone);
    assert.equal(english.setupComplete, hebrew.setupComplete);
    assert.equal(arabic.setupComplete, hebrew.setupComplete);
  }

  assert.equal(
    presentMetaConnection({ status: "connected" }, "en").heading,
    "Meta connection active",
  );
  assert.equal(
    presentMetaConnection({ status: "connected" }, "ar").heading,
    "ربط Meta نشط",
  );
});

test("localizes every Meta connection panel SDK and attempt state", () => {
  assert.equal(metaEmbeddedSignupSdkErrorStatuses.length, 7);
  assert.equal(metaEmbeddedSignupSdkStatuses.length, 10);
  assert.equal(metaSignupAttemptStatuses.length, 19);

  for (const errorStatus of metaEmbeddedSignupSdkErrorStatuses) {
    assert.equal(
      isMetaEmbeddedSignupSdkErrorStatus(errorStatus),
      true,
    );
  }

  assert.equal(
    isMetaEmbeddedSignupSdkErrorStatus("UNKNOWN_SDK_ERROR"),
    false,
  );

  for (const language of ["he", "en", "ar"]) {
    const messages = readMetaConnectionPanelMessages(language);

    assert.equal(
      Object.keys(messages.sdkDetails).length,
      metaEmbeddedSignupSdkStatuses.length + 1,
    );
    assert.equal(
      Object.keys(messages.attemptDetails).length,
      metaSignupAttemptStatuses.length,
    );
    assert.ok(
      metaEmbeddedSignupSdkStatuses.every(
        (status) =>
          messages.sdkDetails[status].trim().length > 0,
      ),
    );
    assert.ok(
      metaSignupAttemptStatuses.every((status) =>
        status === "idle"
          ? messages.attemptDetails[status] === null
          : messages.attemptDetails[status].trim().length > 0,
      ),
    );
    assert.ok(
      Object.values(messages.actions).every(
        (label) => label.trim().length > 0,
      ),
    );
  }

  assert.equal(
    readMetaConnectionPanelMessages("en").header.title,
    "Connect Meta and WhatsApp",
  );
  assert.equal(
    readMetaConnectionPanelMessages("ar").header.title,
    "ربط Meta وWhatsApp",
  );
});

test("passes the validated workspace language through setup feature boundaries", async () => {
  const [
    workspaceApp,
    sectionContent,
    dashboard,
    onboarding,
    metaPanel,
  ] =
    await Promise.all([
      readSource("features/workspace/WorkspaceApp.tsx"),
      readSource("features/workspace/WorkspaceSectionContent.tsx"),
      readSource("features/workspace/WorkspaceDashboard.tsx"),
      readSource("features/workspace/WorkspaceOnboarding.tsx"),
      readSource("features/workspace/MetaConnectionPanel.tsx"),
    ]);

  assert.match(
    workspaceApp,
    /<WorkspaceSectionContent[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(sectionContent, /language: InterfaceLanguage/);
  assert.match(
    sectionContent,
    /<WorkspaceDashboard[\s\S]{0,220}language=\{language\}/,
  );
  assert.match(
    sectionContent,
    /<WorkspaceOnboarding[\s\S]{0,140}language=\{language\}/,
  );
  assert.match(
    dashboard,
    /readWorkspaceSetupMessages\(language\)\.dashboard/,
  );
  assert.match(
    onboarding,
    /readWorkspaceSetupMessages\(language\)\.onboarding/,
  );
  assert.match(
    dashboard,
    /presentMetaConnection\([\s\S]{0,80}language/,
  );
  assert.match(
    onboarding,
    /presentMetaConnection\([\s\S]{0,80}language/,
  );
  assert.match(
    workspaceApp,
    /<MetaConnectionPanel[\s\S]{0,180}language=\{language\}/,
  );
  assert.match(
    metaPanel,
    /language: InterfaceLanguage/,
  );
  assert.match(
    metaPanel,
    /readMetaConnectionPanelMessages\(language\)/,
  );
  assert.match(
    metaPanel,
    /presentMetaConnection\([\s\S]{0,80}language/,
  );
  assert.doesNotMatch(metaPanel, /[\u0590-\u05ff]/);
});
