import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDrizzleToolingCommands,
  inspectDrizzleToolingCompatibility,
} from "../scripts/verify-drizzle-tooling.mjs";

const root = "/workspace/connect";

function successfulRun() {
  return {
    status: 0,
    signal: null,
    stdout: "",
    stderr: "",
  };
}

test("builds deterministic check and isolated generation commands", () => {
  const plan = buildDrizzleToolingCommands({
    root,
    processIdentifier: 42,
  });

  assert.equal(
    plan.outputRoot,
    "/workspace/connect/.wrangler/drizzle-tooling-42",
  );
  assert.deepEqual(
    plan.commands.map(({ id }) => id),
    ["check", "generate"],
  );
  assert.equal(
    plan.commands[0].arguments.includes(
      "/workspace/connect/drizzle.config.ts",
    ),
    true,
  );
  assert.equal(
    plan.commands[1].arguments.includes(
      "/workspace/connect/db/schema.ts",
    ),
    true,
  );
  assert.equal(
    plan.commands[1].arguments.includes(
      plan.outputRoot,
    ),
    true,
  );
});

test("accepts only a successful check and generated migration inventory", async () => {
  const invocations = [];
  const removals = [];
  const report =
    await inspectDrizzleToolingCompatibility({
      root,
      processIdentifier: 42,
      runCommand(command, arguments_, options) {
        invocations.push({
          command,
          arguments_,
          options,
        });
        return successfulRun();
      },
      async readDirectory() {
        return [
          "0000_dependency_compatibility.sql",
          "meta",
          "meta/0000_snapshot.json",
          "meta/_journal.json",
        ];
      },
      async removeDirectory(path, options) {
        removals.push({ path, options });
      },
    });

  assert.deepEqual(report, {
    status: "passed",
    code: null,
  });
  assert.equal(invocations.length, 2);
  assert.equal(
    invocations.every(
      ({ options }) =>
        options.cwd === root &&
        options.timeout === 30_000 &&
        options.stdio[0] === "ignore",
    ),
    true,
  );
  assert.equal(removals.length, 2);
  assert.equal(
    removals.every(
      ({ path, options }) =>
        path.endsWith("drizzle-tooling-42") &&
        options.recursive === true &&
        options.force === true,
    ),
    true,
  );
});

test("fails closed for a command failure or incomplete output", async () => {
  const commandFailure =
    await inspectDrizzleToolingCompatibility({
      root,
      processIdentifier: 42,
      runCommand() {
        return {
          status: 1,
          signal: null,
        };
      },
      async readDirectory() {
        throw new Error("must not read");
      },
      async removeDirectory() {},
    });

  assert.deepEqual(commandFailure, {
    status: "failed",
    code: "DRIZZLE_TOOLING_CHECK_FAILED",
  });

  const incompleteOutput =
    await inspectDrizzleToolingCompatibility({
      root,
      processIdentifier: 42,
      runCommand: successfulRun,
      async readDirectory() {
        return ["meta/_journal.json"];
      },
      async removeDirectory() {},
    });

  assert.deepEqual(incompleteOutput, {
    status: "failed",
    code: "DRIZZLE_TOOLING_OUTPUT_INVALID",
  });
});

test("rejects relative roots and unsafe process identifiers", () => {
  assert.throws(
    () =>
      buildDrizzleToolingCommands({
        root: "relative",
        processIdentifier: 42,
      }),
    {
      message: "DRIZZLE_TOOLING_INPUT_INVALID",
    },
  );
  assert.throws(
    () =>
      buildDrizzleToolingCommands({
        root,
        processIdentifier: 0,
      }),
    {
      message: "DRIZZLE_TOOLING_INPUT_INVALID",
    },
  );
});
