import assert from "node:assert/strict";
import {
  readFile,
  readdir,
} from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function readProjectFile(path) {
  return readFile(
    new URL(path, projectRoot),
    "utf8",
  );
}

function ecosystemSection(configuration, ecosystem) {
  const marker =
    `  - package-ecosystem: "${ecosystem}"`;
  const start = configuration.indexOf(marker);

  assert.notEqual(start, -1);

  const next = configuration.indexOf(
    "\n  - package-ecosystem:",
    start + marker.length,
  );

  return configuration.slice(
    start,
    next === -1 ? undefined : next,
  );
}

test("configures bounded weekly npm and GitHub Actions updates", async () => {
  const configuration = await readProjectFile(
    ".github/dependabot.yml",
  );
  const npm = ecosystemSection(
    configuration,
    "npm",
  );
  const actions = ecosystemSection(
    configuration,
    "github-actions",
  );

  assert.match(configuration, /^version: 2$/m);
  assert.equal(
    configuration.match(
      /package-ecosystem:/g,
    )?.length,
    2,
  );

  for (const section of [npm, actions]) {
    assert.match(section, /directory: "\/"/);
    assert.match(section, /interval: "weekly"/);
    assert.match(
      section,
      /timezone: "Asia\/Jerusalem"/,
    );
    assert.doesNotMatch(
      section,
      /open-pull-requests-limit: 0/,
    );
  }

  assert.match(
    npm,
    /open-pull-requests-limit: 6/,
  );
  assert.match(
    actions,
    /open-pull-requests-limit: 3/,
  );
});

test("groups only minor and patch version updates by risk boundary", async () => {
  const configuration = await readProjectFile(
    ".github/dependabot.yml",
  );
  const npm = ecosystemSection(
    configuration,
    "npm",
  );
  const actions = ecosystemSection(
    configuration,
    "github-actions",
  );

  assert.match(
    npm,
    /production-minor-patch:[\s\S]*dependency-type: "production"/,
  );
  assert.match(
    npm,
    /development-minor-patch:[\s\S]*dependency-type: "development"/,
  );
  assert.match(
    actions,
    /actions-minor-patch:[\s\S]*patterns:[\s\S]*- "\*"/,
  );
  assert.equal(
    configuration.match(
      /applies-to: "version-updates"/g,
    )?.length,
    3,
  );
  assert.equal(
    configuration.match(/- "minor"/g)?.length,
    3,
  );
  assert.equal(
    configuration.match(/- "patch"/g)?.length,
    3,
  );
  assert.doesNotMatch(
    configuration,
    /- "major"/,
  );
});

test("keeps dependency automation free of bypasses and mutable action refs", async () => {
  const configuration = await readProjectFile(
    ".github/dependabot.yml",
  );

  assert.doesNotMatch(
    configuration,
    /^\s*(?:ignore|allow|registries|target-branch|insecure-external-code-execution):/m,
  );

  const workflowDirectory = new URL(
    ".github/workflows/",
    projectRoot,
  );
  const workflowFiles = (
    await readdir(workflowDirectory)
  ).filter((fileName) =>
    fileName.endsWith(".yml"),
  );

  for (const fileName of workflowFiles) {
    const workflow = await readFile(
      new URL(fileName, workflowDirectory),
      "utf8",
    );
    const references = [
      ...workflow.matchAll(
        /^\s*uses:\s+([^\s#]+)(?:\s+#.*)?$/gm,
      ),
    ];

    assert.equal(references.length > 0, true);

    for (const [, reference] of references) {
      assert.match(
        reference,
        /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[a-f0-9]{40}$/,
      );
    }
  }
});
