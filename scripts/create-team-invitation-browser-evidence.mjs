import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  buildTeamInvitationBrowserEvidence,
} from "../server/operations/teamInvitationBrowserEvidence.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";

const maximumReceiptLength = 24_000;
const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const outputPath = join(
  projectRoot,
  ".artifacts",
  "team-invitation-browser-evidence.json",
);

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function createTeamInvitationBrowserEvidenceFromReceipt({
  receipt,
  releaseManifest,
  now = new Date(),
}) {
  const evidence =
    buildTeamInvitationBrowserEvidence(
      receipt,
      now,
    );

  if (
    !isPlainObject(releaseManifest) ||
    releaseManifest.schemaVersion !== 1 ||
    releaseManifest.releaseId !==
      evidence.releaseId ||
    releaseManifest.commitSha !==
      evidence.commitSha
  ) {
    throw new Error(
      "TEAM_INVITATION_BROWSER_E2E_RELEASE_MISMATCH",
    );
  }

  return evidence;
}

function parseArguments(argumentsList) {
  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== "--receipt" ||
    typeof argumentsList[1] !== "string" ||
    argumentsList[1].length === 0 ||
    argumentsList[1].length > 4_096 ||
    argumentsList[1].includes("\0")
  ) {
    throw new Error(
      "TEAM_INVITATION_BROWSER_E2E_ARGUMENTS_INVALID",
    );
  }

  return argumentsList[1];
}

async function readReceipt(path) {
  const text = await readFile(
    path,
    "utf8",
  );

  if (
    text.length === 0 ||
    text.length > maximumReceiptLength
  ) {
    throw new Error(
      "TEAM_INVITATION_BROWSER_E2E_RECEIPT_INVALID",
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "TEAM_INVITATION_BROWSER_E2E_RECEIPT_INVALID",
    );
  }
}

async function runCli() {
  try {
    const receiptPath =
      parseArguments(
        process.argv.slice(2),
      );
    const [receipt, releaseManifest] =
      await Promise.all([
        readReceipt(receiptPath),
        createCurrentReleaseManifest(),
      ]);
    const evidence =
      createTeamInvitationBrowserEvidenceFromReceipt({
        receipt,
        releaseManifest,
      });

    await mkdir(dirname(outputPath), {
      recursive: true,
    });
    await writeFile(
      outputPath,
      `${JSON.stringify(
        evidence,
        null,
        2,
      )}\n`,
      {
        encoding: "utf8",
        flag: "w",
      },
    );
    console.log(
      `Team invitation browser evidence: PASS (${evidence.evidenceDigest})`,
    );
  } catch (error) {
    const code =
      error instanceof Error &&
      /^[A-Z][A-Z0-9_]+$/.test(
        error.message,
      )
        ? error.message
        : "TEAM_INVITATION_BROWSER_E2E_GENERATION_FAILED";

    console.error(
      `Team invitation browser evidence: FAIL (${code})`,
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
