import {
  mkdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import {
  createInterface,
} from "node:readline/promises";
import {
  dirname,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  chromium,
} from "playwright";

import {
  parseTeamInvitationBrowserAuthenticationStates,
  teamInvitationBrowserAuthenticatedProfiles,
} from "./team-invitation-browser-auth-state-bundle.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const authenticationStatePath = join(
  projectRoot,
  ".artifacts",
  "team-invitation-browser-auth-states.json",
);
const minimumRemainingLifetimeMilliseconds =
  8 * 60 * 1_000;
const cookieKeys = Object.freeze([
  "name",
  "value",
  "domain",
  "path",
  "expires",
  "httpOnly",
  "secure",
  "sameSite",
]);

export class TeamInvitationBrowserAuthenticationCaptureError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      "TeamInvitationBrowserAuthenticationCaptureError";
    this.code = code;
  }
}

function fail(code) {
  throw new TeamInvitationBrowserAuthenticationCaptureError(
    code,
  );
}

function isObject(value) {
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

function requireStagingOrigin(value) {
  let origin;

  try {
    origin = new URL(value);
  } catch {
    fail("AUTH_CAPTURE_CONFIGURATION_INVALID");
  }

  if (
    typeof value !== "string" ||
    origin.origin !== value ||
    origin.href !== `${value}/` ||
    origin.protocol !== "https:" ||
    origin.username !== "" ||
    origin.password !== "" ||
    [
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(origin.hostname)
  ) {
    fail("AUTH_CAPTURE_CONFIGURATION_INVALID");
  }

  return Object.freeze({
    origin: origin.origin,
    hostname: origin.hostname,
  });
}

function isCookieDomainInScope(
  value,
  hostname,
) {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    return false;
  }

  const domain = value.startsWith(".")
    ? value.slice(1)
    : value;

  return (
    hostname === domain ||
    hostname.endsWith(`.${domain}`)
  );
}

function sanitizeStorageState(
  value,
  staging,
) {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      "cookies",
      "origins",
    ]) ||
    !Array.isArray(value.cookies) ||
    !Array.isArray(value.origins)
  ) {
    fail("AUTH_CAPTURE_STATE_INVALID");
  }

  const cookies = [];

  for (const cookie of value.cookies) {
    if (
      !isObject(cookie) ||
      typeof cookie.domain !== "string"
    ) {
      fail("AUTH_CAPTURE_STATE_INVALID");
    }

    if (
      !isCookieDomainInScope(
        cookie.domain,
        staging.hostname,
      )
    ) {
      continue;
    }

    if (!hasExactKeys(cookie, cookieKeys)) {
      fail("AUTH_CAPTURE_STATE_INVALID");
    }

    cookies.push(
      Object.fromEntries(
        cookieKeys.map((key) => [
          key,
          cookie[key],
        ]),
      ),
    );
  }

  const origins = [];

  for (const originState of value.origins) {
    if (
      !isObject(originState) ||
      typeof originState.origin !== "string"
    ) {
      fail("AUTH_CAPTURE_STATE_INVALID");
    }

    if (originState.origin !== staging.origin) {
      continue;
    }

    if (
      !hasExactKeys(originState, [
        "origin",
        "localStorage",
      ])
    ) {
      fail("AUTH_CAPTURE_STATE_INVALID");
    }

    origins.push({
      origin: originState.origin,
      localStorage: originState.localStorage,
    });
  }

  return { cookies, origins };
}

function validateRuntime(
  browser,
  prompt,
  clock,
) {
  if (
    !isObject(browser) ||
    typeof browser.newContext !== "function" ||
    typeof prompt !== "function" ||
    typeof clock !== "function"
  ) {
    fail("AUTH_CAPTURE_CONFIGURATION_INVALID");
  }
}

export async function captureTeamInvitationBrowserAuthenticationStates({
  origin,
  browser,
  prompt,
  clock = () => new Date(),
}) {
  const staging = requireStagingOrigin(origin);
  validateRuntime(browser, prompt, clock);
  const states = {};

  for (
    const profile of
      teamInvitationBrowserAuthenticatedProfiles
  ) {
    const context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [],
      },
    });

    if (
      !isObject(context) ||
      typeof context.newPage !== "function" ||
      typeof context.storageState !== "function" ||
      typeof context.close !== "function"
    ) {
      if (
        isObject(context) &&
        typeof context.close === "function"
      ) {
        await context.close();
      }

      fail("AUTH_CAPTURE_BROWSER_INVALID");
    }

    try {
      const page = await context.newPage();

      if (
        !isObject(page) ||
        typeof page.goto !== "function" ||
        typeof page.url !== "function"
      ) {
        fail("AUTH_CAPTURE_BROWSER_INVALID");
      }

      await page.goto(
        `${staging.origin}/login`,
        { waitUntil: "domcontentloaded" },
      );
      await prompt(profile);

      let observedOrigin;

      try {
        observedOrigin = new URL(
          page.url(),
        ).origin;
      } catch {
        fail("AUTH_CAPTURE_NAVIGATION_INVALID");
      }

      if (observedOrigin !== staging.origin) {
        fail("AUTH_CAPTURE_NAVIGATION_INVALID");
      }

      states[profile] = sanitizeStorageState(
        await context.storageState(),
        staging,
      );
    } finally {
      await context.close();
    }
  }

  const now = clock();

  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    fail("AUTH_CAPTURE_CONFIGURATION_INVALID");
  }

  try {
    return parseTeamInvitationBrowserAuthenticationStates(
      JSON.stringify(states),
      {
        origin: staging.origin,
        now,
        minimumRemainingLifetimeMilliseconds,
      },
    );
  } catch {
    fail("AUTH_CAPTURE_STATE_INVALID");
  }
}

async function writeAuthenticationStates(value) {
  const temporaryPath =
    `${authenticationStatePath}.tmp-${process.pid}`;

  await mkdir(dirname(authenticationStatePath), {
    recursive: true,
  });

  try {
    await writeFile(
      temporaryPath,
      JSON.stringify(value),
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      },
    );
    await rename(
      temporaryPath,
      authenticationStatePath,
    );
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

async function runCli() {
  if (
    process.argv.length !== 2 ||
    !process.stdin.isTTY ||
    !process.stdout.isTTY
  ) {
    fail("AUTH_CAPTURE_INTERACTIVE_TERMINAL_REQUIRED");
  }

  const origin =
    process.env
      .TEAM_INVITATION_BROWSER_E2E_ORIGIN;
  const browser = await chromium.launch({
    headless: false,
  });
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const states =
      await captureTeamInvitationBrowserAuthenticationStates({
        origin,
        browser,
        prompt: async (profile) => {
          await terminal.question(
            `Authenticate the ${profile} profile in the opened staging window, then press Enter. `,
          );
        },
      });

    await writeAuthenticationStates(states);
    console.log(
      `Team invitation browser auth capture: PASS (${teamInvitationBrowserAuthenticatedProfiles.length} profiles, ${origin})`,
    );
  } finally {
    terminal.close();
    await browser.close();
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(`file://${process.argv[1]}`),
    )
) {
  try {
    await runCli();
  } catch (error) {
    const code =
      error instanceof Error &&
      /^[A-Z][A-Z0-9_]+$/.test(
        error.message,
      )
        ? error.message
        : "AUTH_CAPTURE_FAILED";

    console.error(
      `Team invitation browser auth capture: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
