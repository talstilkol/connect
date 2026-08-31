import {
  spawnSync,
} from "node:child_process";
import {
  readdir,
  rm,
} from "node:fs/promises";
import {
  isAbsolute,
  join,
  sep,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);

function fail(code) {
  return Object.freeze({
    status: "failed",
    code,
  });
}

export function buildDrizzleToolingCommands({
  root = projectRoot,
  processIdentifier = process.pid,
} = {}) {
  if (
    typeof root !== "string" ||
    !isAbsolute(root) ||
    !Number.isSafeInteger(processIdentifier) ||
    processIdentifier <= 0
  ) {
    throw new Error(
      "DRIZZLE_TOOLING_INPUT_INVALID",
    );
  }

  const outputRoot = join(
    root,
    ".wrangler",
    `drizzle-tooling-${processIdentifier}`,
  );
  const binaryPath = join(
    root,
    "node_modules",
    "drizzle-kit",
    "bin.cjs",
  );

  return Object.freeze({
    outputRoot,
    commands: Object.freeze([
      Object.freeze({
        id: "check",
        command: process.execPath,
        arguments: Object.freeze([
          binaryPath,
          "check",
          "--config",
          join(root, "drizzle.config.ts"),
        ]),
      }),
      Object.freeze({
        id: "generate",
        command: process.execPath,
        arguments: Object.freeze([
          binaryPath,
          "generate",
          "--schema",
          join(root, "db", "schema.ts"),
          "--dialect",
          "sqlite",
          "--out",
          outputRoot,
          "--name",
          "dependency_compatibility",
          "--breakpoints",
        ]),
      }),
    ]),
  });
}

export async function inspectDrizzleToolingCompatibility({
  root = projectRoot,
  processIdentifier = process.pid,
  runCommand = spawnSync,
  readDirectory = readdir,
  removeDirectory = rm,
} = {}) {
  let plan;

  try {
    plan = buildDrizzleToolingCommands({
      root,
      processIdentifier,
    });
  } catch {
    return fail("DRIZZLE_TOOLING_INPUT_INVALID");
  }

  const expectedParent = `${join(
    root,
    ".wrangler",
  )}${sep}`;

  if (!plan.outputRoot.startsWith(expectedParent)) {
    return fail("DRIZZLE_TOOLING_OUTPUT_INVALID");
  }

  try {
    await removeDirectory(plan.outputRoot, {
      recursive: true,
      force: true,
    });

    for (const command of plan.commands) {
      const result = runCommand(
        command.command,
        command.arguments,
        {
          cwd: root,
          encoding: "utf8",
          timeout: 30_000,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      if (
        !result ||
        result.error ||
        result.signal !== null ||
        result.status !== 0
      ) {
        return fail(
          command.id === "check"
            ? "DRIZZLE_TOOLING_CHECK_FAILED"
            : "DRIZZLE_TOOLING_GENERATE_FAILED",
        );
      }
    }

    const generatedFiles = (
      await readDirectory(plan.outputRoot, {
        recursive: true,
      })
    ).map((fileName) =>
      String(fileName).split(sep).join("/"),
    );

    if (
      !generatedFiles.some((fileName) =>
        fileName.endsWith(".sql"),
      ) ||
      !generatedFiles.includes(
        "meta/_journal.json",
      )
    ) {
      return fail(
        "DRIZZLE_TOOLING_OUTPUT_INVALID",
      );
    }

    return Object.freeze({
      status: "passed",
      code: null,
    });
  } catch {
    return fail("DRIZZLE_TOOLING_EXECUTION_FAILED");
  } finally {
    try {
      await removeDirectory(plan.outputRoot, {
        recursive: true,
        force: true,
      });
    } catch {
      // The deterministic path is inside .wrangler. A later invocation
      // removes it before running, and no generated artifact is accepted.
    }
  }
}

async function runCli() {
  if (process.argv.length !== 2) {
    console.error(
      "Drizzle tooling compatibility: INVALID_ARGUMENTS",
    );
    process.exitCode = 1;
    return;
  }

  const report =
    await inspectDrizzleToolingCompatibility();

  if (report.status === "passed") {
    console.log(
      "Drizzle tooling compatibility: PASS (check + isolated generate)",
    );
    return;
  }

  console.error(
    `Drizzle tooling compatibility: FAIL (${report.code})`,
  );
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(`file://${process.argv[1]}`),
    )
) {
  await runCli();
}
