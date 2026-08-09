import {
  mkdir,
  rename,
  unlink,
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
  executeTeamInvitationBrowserRun,
} from "../server/operations/teamInvitationBrowserExecutor.ts";
import {
  resolvePublicOrigin,
} from "../server/operations/publicOrigin.ts";
import {
  createTeamInvitationBrowserExecutorBrowserPort,
} from "../server/operations/teamInvitationBrowserSessionDriver.ts";
import {
  createTeamInvitationBrowserScenarioCaseResolver,
} from "../server/operations/teamInvitationBrowserScenarioCaseInventory.ts";
import {
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";
import {
  requireTeamInvitationPolicy,
} from "../server/team/teamInvitationPolicy.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";
import {
  createTeamInvitationCloudflareD1ProofPort,
} from "./team-invitation-cloudflare-d1-proof-port.mjs";
import {
  openPlaywrightTeamInvitationBrowserSession,
} from "./team-invitation-playwright-session-driver.mjs";
import {
  parseTeamInvitationBrowserAuthenticationStates,
  teamInvitationBrowserAuthenticatedProfiles,
} from "./team-invitation-browser-auth-state-bundle.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const receiptPath = join(
  projectRoot,
  ".artifacts",
  "team-invitation-browser-receipt.json",
);
const scenarioTimeoutMilliseconds = 60_000;
const inventorySafetyMarginMilliseconds = 60_000;
const maximumAuthenticationStateLength = 65_536;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern =
  /^sha256:[a-f0-9]{64}$/;

export class TeamInvitationBrowserLauncherError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      "TeamInvitationBrowserLauncherError";
    this.code = code;
  }
}

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) => key === expected[index],
    )
  );
}

function failConfiguration() {
  throw new TeamInvitationBrowserLauncherError(
    "CONFIGURATION_INVALID",
  );
}

function requireEnvironmentValue(
  environment,
  name,
  maximumLength,
) {
  const value = environment[name];

  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value ||
    value.includes("\0")
  ) {
    failConfiguration();
  }

  return value;
}

function requireReleaseManifest(value) {
  if (
    !isPlainObject(value) ||
    value.schemaVersion !== 1 ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha)
  ) {
    failConfiguration();
  }

  return value;
}

function requireStagingOrigin(value) {
  let resolved;

  try {
    resolved = resolvePublicOrigin({
      APP_PUBLIC_ORIGIN: value,
      NODE_ENV: "production",
    });
  } catch {
    failConfiguration();
  }

  if (resolved !== value) {
    failConfiguration();
  }

  const hostname = new URL(resolved).hostname;

  if (
    [
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(hostname)
  ) {
    failConfiguration();
  }

  return resolved;
}

export function parseTeamInvitationBrowserLauncherConfiguration({
  environment,
  releaseManifest,
  now = new Date(),
}) {
  if (
    !isPlainObject(environment) ||
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    failConfiguration();
  }

  const manifest =
    requireReleaseManifest(releaseManifest);
  const origin = requireStagingOrigin(
    requireEnvironmentValue(
      environment,
      "TEAM_INVITATION_BROWSER_E2E_ORIGIN",
      2_048,
    ),
  );
  const artifactDigest =
    requireEnvironmentValue(
      environment,
      "APP_DEPLOYMENT_ARTIFACT_DIGEST",
      71,
    );

  if (
    !artifactDigestPattern.test(
      artifactDigest,
    )
  ) {
    failConfiguration();
  }

  let policy;

  try {
    policy = requireTeamInvitationPolicy({
      TEAM_INVITATION_TTL_HOURS:
        environment
          .TEAM_INVITATION_TTL_HOURS,
      TEAM_INVITATION_REREQUEST_POLICY:
        environment
          .TEAM_INVITATION_REREQUEST_POLICY,
    });
  } catch {
    failConfiguration();
  }

  return Object.freeze({
    origin,
    releaseId: manifest.releaseId,
    commitSha: manifest.commitSha,
    artifactDigest,
    policy: Object.freeze(policy),
    scenarioCasesJson:
      requireEnvironmentValue(
        environment,
        "TEAM_INVITATION_BROWSER_E2E_CASES_JSON",
        24_000,
      ),
    authenticationStates: (() => {
      try {
        return parseTeamInvitationBrowserAuthenticationStates(
          requireEnvironmentValue(
            environment,
            "TEAM_INVITATION_BROWSER_AUTH_STATES_JSON",
            maximumAuthenticationStateLength,
          ),
          {
            origin,
            now,
            minimumRemainingLifetimeMilliseconds:
              teamInvitationBrowserScenarioRegistry.length *
                scenarioTimeoutMilliseconds +
              inventorySafetyMarginMilliseconds,
          },
        );
      } catch {
        failConfiguration();
      }
    })(),
    cloudflare: Object.freeze({
      accountId: requireEnvironmentValue(
        environment,
        "TEAM_INVITATION_BROWSER_CLOUDFLARE_ACCOUNT_ID",
        32,
      ),
      databaseId: requireEnvironmentValue(
        environment,
        "TEAM_INVITATION_BROWSER_CLOUDFLARE_DATABASE_ID",
        36,
      ),
      apiToken: requireEnvironmentValue(
        environment,
        "TEAM_INVITATION_BROWSER_CLOUDFLARE_D1_READ_TOKEN",
        2_048,
      ),
    }),
  });
}

function createStorageStateResolver(
  authenticationStates,
) {
  return async (profile, signal) => {
    if (
      signal?.aborted ||
      !teamInvitationBrowserAuthenticatedProfiles.includes(
        profile,
      )
    ) {
      throw new TeamInvitationBrowserLauncherError(
        "AUTHENTICATION_STATE_UNAVAILABLE",
      );
    }

    return authenticationStates[profile];
  };
}

async function writeReceipt(value) {
  const temporaryPath =
    `${receiptPath}.tmp-${process.pid}`;

  await mkdir(dirname(receiptPath), {
    recursive: true,
  });

  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      },
    );
    await rename(
      temporaryPath,
      receiptPath,
    );
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

const productionDependencies = Object.freeze({
  createReleaseManifest:
    createCurrentReleaseManifest,
  createCaseResolver:
    createTeamInvitationBrowserScenarioCaseResolver,
  createD1Port:
    createTeamInvitationCloudflareD1ProofPort,
  openBrowserSession:
    openPlaywrightTeamInvitationBrowserSession,
  createBrowserPort:
    createTeamInvitationBrowserExecutorBrowserPort,
  executeRun:
    executeTeamInvitationBrowserRun,
  writeReceipt,
});

function validateLauncherRuntime(
  clock,
  dependencies,
) {
  if (
    typeof clock !== "function" ||
    !isPlainObject(dependencies) ||
    !hasExactKeys(dependencies, [
      "createReleaseManifest",
      "createCaseResolver",
      "createD1Port",
      "openBrowserSession",
      "createBrowserPort",
      "executeRun",
      "writeReceipt",
    ]) ||
    Object.values(dependencies).some(
      (dependency) =>
        typeof dependency !== "function",
    )
  ) {
    failConfiguration();
  }
}

async function prepareTeamInvitationBrowserLauncher(
  environment,
  clock,
  dependencies,
) {
  validateLauncherRuntime(
    clock,
    dependencies,
  );

  const now = clock();

  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    failConfiguration();
  }

  const releaseManifest =
    await dependencies.createReleaseManifest();
  const configuration =
    parseTeamInvitationBrowserLauncherConfiguration({
      environment,
      releaseManifest,
      now,
    });
  const caseResolver =
    dependencies.createCaseResolver(
      configuration.scenarioCasesJson,
      {
        origin: configuration.origin,
        releaseId: configuration.releaseId,
        commitSha: configuration.commitSha,
        artifactDigest:
          configuration.artifactDigest,
        policy: configuration.policy,
        minimumRemainingLifetimeMilliseconds:
          teamInvitationBrowserScenarioRegistry.length *
            scenarioTimeoutMilliseconds +
          inventorySafetyMarginMilliseconds,
      },
      now,
    );
  const d1Port = dependencies.createD1Port({
    ...configuration.cloudflare,
    fetchImpl: fetch,
  });

  return Object.freeze({
    configuration,
    caseResolver,
    d1Port,
  });
}

export async function preflightTeamInvitationBrowserLauncher({
  environment = process.env,
  clock = () => new Date(),
  dependencies = productionDependencies,
} = {}) {
  const prepared =
    await prepareTeamInvitationBrowserLauncher(
      environment,
      clock,
      dependencies,
    );

  return Object.freeze({
    releaseId:
      prepared.configuration.releaseId,
    scenarioCount:
      teamInvitationBrowserScenarioRegistry.length,
  });
}

export async function runTeamInvitationBrowserLauncher({
  environment = process.env,
  clock = () => new Date(),
  dependencies = productionDependencies,
} = {}) {
  const {
    configuration,
    caseResolver,
    d1Port,
  } = await prepareTeamInvitationBrowserLauncher(
    environment,
    clock,
    dependencies,
  );
  const browserSession =
    await dependencies.openBrowserSession({
      clock,
      resolveStorageState:
        createStorageStateResolver(
          configuration.authenticationStates,
        ),
    });

  if (
    !isPlainObject(browserSession) ||
    !hasExactKeys(browserSession, [
      "driver",
      "close",
    ]) ||
    typeof browserSession.close !== "function"
  ) {
    throw new TeamInvitationBrowserLauncherError(
      "BROWSER_SESSION_INVALID",
    );
  }

  let receipt;

  try {
    const browserPort =
      dependencies.createBrowserPort(
        { origin: configuration.origin },
        browserSession.driver,
      );

    receipt = await dependencies.executeRun(
      {
        origin: configuration.origin,
        releaseId: configuration.releaseId,
        commitSha: configuration.commitSha,
        artifactDigest:
          configuration.artifactDigest,
        policy: configuration.policy,
        scenarioTimeoutMilliseconds,
      },
      {
        resolveScenarioCase:
          caseResolver.resolveScenarioCase,
        executeBrowserScenario:
          browserPort.executeBrowserScenario,
        readDatabaseProof:
          d1Port.readDatabaseProof,
      },
    );
  } finally {
    await browserSession.close();
  }

  await dependencies.writeReceipt(receipt);

  return Object.freeze({
    receiptPath,
    releaseId: configuration.releaseId,
  });
}

async function runCli() {
  const argumentsList = process.argv.slice(2);
  const preflightOnly =
    argumentsList.length === 1 &&
    argumentsList[0] === "--preflight";

  if (
    argumentsList.length > 0 &&
    !preflightOnly
  ) {
    console.error(
      "Team invitation browser E2E: FAIL (INVALID_ARGUMENTS)",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const result = preflightOnly
      ? await preflightTeamInvitationBrowserLauncher()
      : await runTeamInvitationBrowserLauncher();

    console.log(
      preflightOnly
        ? `Team invitation browser preflight: PASS (${result.releaseId}, ${result.scenarioCount} scenarios)`
        : `Team invitation browser E2E: PASS (${result.releaseId})`,
    );
  } catch (error) {
    const code =
      error instanceof Error &&
      /^[A-Z][A-Z0-9_]+$/.test(
        error.message,
      )
        ? error.message
        : "EXECUTION_FAILED";

    console.error(
      preflightOnly
        ? `Team invitation browser preflight: FAIL (${code})`
        : `Team invitation browser E2E: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
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
