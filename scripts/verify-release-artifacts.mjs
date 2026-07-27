import {
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  createCurrentChangeLog,
} from "./create-change-log.mjs";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);

export function inspectReleaseArtifacts({
  expectedManifest,
  actualManifestText,
  expectedChangeLog,
  actualChangeLog,
}) {
  const findings = [];
  let actualManifest;

  try {
    actualManifest =
      JSON.parse(actualManifestText);
  } catch {
    findings.push({
      code:
        "RELEASE_MANIFEST_INVALID",
    });
  }

  if (
    actualManifest &&
    JSON.stringify(actualManifest) !==
      JSON.stringify(expectedManifest)
  ) {
    findings.push({
      code:
        "RELEASE_MANIFEST_STALE",
    });
  }

  if (
    actualChangeLog !==
    expectedChangeLog
  ) {
    findings.push({
      code: "CHANGE_LOG_STALE",
    });
  }

  return Object.freeze({
    status:
      findings.length === 0
        ? "passed"
        : "failed",
    findings: Object.freeze(
      findings.map((finding) =>
        Object.freeze(finding),
      ),
    ),
  });
}

export async function inspectCurrentReleaseArtifacts() {
  const [
    expectedManifest,
    actualManifestText,
    actualChangeLog,
  ] = await Promise.all([
    createCurrentReleaseManifest(),
    readFile(
      join(
        projectRoot,
        ".artifacts",
        "release-manifest.json",
      ),
      "utf8",
    ),
    readFile(
      join(
        projectRoot,
        ".artifacts",
        "CHANGELOG.md",
      ),
      "utf8",
    ),
  ]);

  return inspectReleaseArtifacts({
    expectedManifest,
    actualManifestText,
    expectedChangeLog:
      createCurrentChangeLog(),
    actualChangeLog,
  });
}

async function runCli() {
  if (process.argv.length !== 2) {
    console.error(
      "Release artifacts: INVALID_ARGUMENTS",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const report =
      await inspectCurrentReleaseArtifacts();

    if (report.status === "passed") {
      console.log(
        "Release artifacts: PASS",
      );
      return;
    }

    console.error(
      `Release artifacts: FAIL (${report.findings.length} findings)`,
    );
    process.exitCode = 1;
  } catch (error) {
    console.error(
      `Release artifacts: FAIL (${
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR"
      })`,
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(
        `file://${process.argv[1]}`,
      ),
    )
) {
  await runCli();
}
