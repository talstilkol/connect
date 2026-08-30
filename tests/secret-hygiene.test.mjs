import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectSecretText,
} from "../scripts/verify-secret-hygiene.mjs";

const environmentNames = [
  ["DATABASE", "URL"].join("_"),
  ["POSTGRES", "API", "URL"].join("_"),
  ["POSTGRES", "WORKER", "URL"].join("_"),
  ["POSTGRES", "VERIFIER", "URL"].join("_"),
  ["POSTGRES", "MIGRATION", "URL"].join("_"),
  ["POSTGRES", "OWNER", "URL"].join("_"),
  ["REDIS", "URL"].join("_"),
  ["BETTER", "STACK", "SOURCE", "TOKEN"].join("_"),
  ["BETTER", "STACK", "INCIDENT", "API", "TOKEN"].join("_"),
  ["RAILWAY", "WORKER", "SCHEDULER", "OWNER", "KEY"].join("_"),
  ["CLOUDFLARE", "API", "TOKEN"].join("_"),
  [
    "TEAM",
    "INVITATION",
    "BROWSER",
    "CLOUDFLARE",
    "D1",
    "READ",
    "TOKEN",
  ].join("_"),
];

test("detects concrete values for the runtime secret environment names", () => {
  for (const environmentName of environmentNames) {
    for (const assignment of [
      `${environmentName}=bounded-test-value`,
      `  export ${environmentName} = "bounded-test-value"`,
      `\t${environmentName}='bounded-test-value'`,
    ]) {
      assert.deepEqual(
        inspectSecretText(assignment),
        [
          {
            code: "SECRET_ENVIRONMENT_VALUE_TRACKED",
          },
        ],
      );
    }
  }
});

test("does not treat empty declarations or environment references as secret values", () => {
  for (const environmentName of environmentNames) {
    for (const safeText of [
      `${environmentName}=`,
      `${environmentName}=   `,
      `${environmentName}=""`,
      `${environmentName}=''`,
      `${environmentName}= # configured by the deployment platform`,
      `const value = process.env.${environmentName};`,
      `readonly ${environmentName}?: string;`,
    ]) {
      assert.deepEqual(
        inspectSecretText(safeText),
        [],
      );
    }
  }
});

test("detects fine-grained GitHub personal access tokens without matching short labels", () => {
  const tokenPrefix =
    "github" + "_pat_";
  const token =
    tokenPrefix + "A".repeat(24);

  assert.deepEqual(
    inspectSecretText(token),
    [
      {
        code: "SECRET_CONTENT_DETECTED",
      },
    ],
  );
  assert.deepEqual(
    inspectSecretText(
      tokenPrefix + "short-label",
    ),
    [],
  );
});

test("secret scan distinguishes risk-management text from a bounded secret token", () => {
  assert.deepEqual(
    inspectSecretText(
      "https://www.nist.gov/artificial-intelligence-risk-management-framework",
    ),
    [],
  );

  const token =
    ["s", "k"].join("") +
    "-" +
    "A".repeat(24);
  assert.deepEqual(
    inspectSecretText(token),
    [
      {
        code: "SECRET_CONTENT_DETECTED",
      },
    ],
  );
});
