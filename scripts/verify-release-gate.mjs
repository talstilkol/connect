import {
  spawnSync,
} from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const localOnly =
  process.argv.length === 3 &&
  process.argv[2] === "--local";

if (
  process.argv.length > (localOnly ? 3 : 2)
) {
  console.error("Release gate: INVALID_ARGUMENTS");
  process.exit(1);
}

const steps = [
  {
    id: "source-guardrails",
    command: process.execPath,
    arguments: [
      "scripts/verify-source-guardrails.mjs",
    ],
  },
  {
    id: "secret-hygiene",
    command: process.execPath,
    arguments: [
      "scripts/verify-secret-hygiene.mjs",
      "--history",
    ],
  },
  {
    id: "interface-guardrails",
    command: process.execPath,
    arguments: [
      "scripts/verify-interface-guardrails.mjs",
    ],
  },
  {
    id: "dependency-lock",
    command: process.execPath,
    arguments: [
      "scripts/verify-dependency-lock.mjs",
    ],
  },
  {
    id: "migrations",
    command: process.execPath,
    arguments: [
      "scripts/verify-migrations.mjs",
    ],
  },
  {
    id: "typecheck",
    command: "npm",
    arguments: ["run", "typecheck"],
  },
  {
    id: "lint",
    command: "npm",
    arguments: ["run", "lint"],
  },
  {
    id: "tests-and-build",
    command: "npm",
    arguments: ["test"],
  },
  ...(
    localOnly
      ? []
      : [
          {
            id: "production-readiness",
            command: "npm",
            arguments: [
              "run",
              "verify:production-readiness",
            ],
          },
        ]
  ),
];

for (const step of steps) {
  const result = spawnSync(
    step.command,
    step.arguments,
    {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    console.error(
      `Release gate: FAIL (${step.id})`,
    );
    process.exit(1);
  }

  console.log(
    `Release gate: PASS (${step.id})`,
  );
}

console.log(
  localOnly
    ? "Release gate: LOCAL PASS"
    : "Release gate: PRODUCTION PASS",
);
