import {
  createHash,
} from "node:crypto";
import {
  chromium,
} from "playwright";

const sessionProfiles = Object.freeze([
  "signed-out",
  "unverified-primary-email",
  "verified-matching-email",
  "verified-mismatched-email",
  "verified-expired-invitation",
  "verified-accepted-invitation",
  "verified-accessibility",
]);

const focusReferences = Object.freeze([
  "skip-link",
  "brand-link",
  "accept-button",
  "home-link",
]);

const privateFieldSelector = [
  "[data-private-field]",
  "[data-tenant-id]",
  "[data-external-user-id]",
  'input[type="email"]',
  'input[name*="email" i]',
].join(",");

const invitationDetailSelector =
  "[data-invitation-private-detail]";
const statusSelector =
  "[data-invitation-status]";
const completedStatusSelector =
  `${statusSelector}:not([data-invitation-status="ready"])`;
const acceptButtonSelector =
  '[data-e2e-focus-ref="accept-button"]';

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

function requireCanonicalTimestamp(value) {
  if (!(value instanceof Date)) {
    throw new Error("CLOCK_RESULT_INVALID");
  }

  const timestamp = value.toISOString();

  if (
    !Number.isFinite(Date.parse(timestamp)) ||
    new Date(timestamp).toISOString() !== timestamp
  ) {
    throw new Error("CLOCK_RESULT_INVALID");
  }

  return timestamp;
}

function requireStorageState(value) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, ["cookies", "origins"]) ||
    !Array.isArray(value.cookies) ||
    !Array.isArray(value.origins)
  ) {
    throw new Error("STORAGE_STATE_INVALID");
  }

  return value;
}

function requireInput(value) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "scenarioName",
      "invitationUrl",
      "sessionProfile",
      "interaction",
    ]) ||
    typeof value.scenarioName !== "string" ||
    typeof value.invitationUrl !== "string" ||
    !sessionProfiles.includes(value.sessionProfile) ||
    !["submit", "keyboard-submit"].includes(
      value.interaction,
    ) ||
    (
      value.interaction === "keyboard-submit" &&
      value.sessionProfile !== "verified-accessibility"
    ) ||
    (
      value.interaction === "submit" &&
      value.sessionProfile === "verified-accessibility"
    )
  ) {
    throw new Error("DRIVER_INPUT_INVALID");
  }

  const invitationUrl = new URL(value.invitationUrl);

  if (
    invitationUrl.protocol !== "https:" ||
    invitationUrl.origin === "null" ||
    invitationUrl.username !== "" ||
    invitationUrl.password !== "" ||
    invitationUrl.search !== "" ||
    invitationUrl.hash !== "" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(
      invitationUrl.hostname,
    )
  ) {
    throw new Error("DRIVER_INPUT_INVALID");
  }

  return Object.freeze({
    ...value,
    invitationUrl: invitationUrl.href,
    origin: invitationUrl.origin,
  });
}

async function withAbort(operation, signal) {
  if (signal.aborted) {
    throw new Error("ABORTED");
  }

  let removeAbortListener = () => {};
  const aborted = new Promise((_, reject) => {
    const onAbort = () => reject(new Error("ABORTED"));
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    removeAbortListener = () =>
      signal.removeEventListener("abort", onAbort);
  });

  try {
    return await Promise.race([
      Promise.resolve(operation),
      aborted,
    ]);
  } finally {
    removeAbortListener();
  }
}

function requireOutcome(value) {
  if (
    ![
      "sign-in-required",
      "identity-verification-required",
      "accepted",
      "invitation-unavailable",
      "already-accepted",
    ].includes(value)
  ) {
    throw new Error("BROWSER_OUTCOME_INVALID");
  }

  return value;
}

async function collectFocusEvidence(page, signal) {
  const focusOrder = [];
  let focusIndicatorVisible = true;

  for (const expectedReference of focusReferences) {
    await withAbort(
      page.keyboard.press("Tab"),
      signal,
    );
    const focusedReference = await withAbort(
      page
        .locator(":focus")
        .getAttribute("data-e2e-focus-ref"),
      signal,
    );
    const visibleFocusCount = await withAbort(
      page.locator(":focus-visible").count(),
      signal,
    );

    focusOrder.push(
      typeof focusedReference === "string"
        ? focusedReference
        : "untracked-focus-target",
    );
    focusIndicatorVisible =
      focusIndicatorVisible &&
      visibleFocusCount === 1 &&
      focusedReference === expectedReference;
  }

  await withAbort(
    page.keyboard.press("Shift+Tab"),
    signal,
  );
  await withAbort(
    page.keyboard.press("Enter"),
    signal,
  );

  return Object.freeze({
    focusOrder: Object.freeze(focusOrder),
    focusIndicatorVisible,
  });
}

function fingerprintFor(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

export function createPlaywrightTeamInvitationBrowserSessionDriver(
  configuration,
) {
  if (
    !isPlainObject(configuration) ||
    !hasExactKeys(configuration, [
      "browser",
      "clock",
      "resolveStorageState",
    ]) ||
    !isPlainObject(configuration.browser) ||
    typeof configuration.browser.newContext !== "function" ||
    typeof configuration.clock !== "function" ||
    typeof configuration.resolveStorageState !== "function"
  ) {
    throw new Error("DRIVER_CONFIGURATION_INVALID");
  }

  return Object.freeze({
    async runIsolatedScenario(rawInput, signal) {
      const input = requireInput(rawInput);
      const storageState =
        input.sessionProfile === "signed-out"
          ? Object.freeze({
              cookies: Object.freeze([]),
              origins: Object.freeze([]),
            })
          : requireStorageState(
              await withAbort(
                configuration.resolveStorageState(
                  input.sessionProfile,
                  signal,
                ),
                signal,
              ),
            );
      const context = await withAbort(
        configuration.browser.newContext({
          storageState,
        }),
        signal,
      );
      let closed = false;

      try {
        const page = await withAbort(
          context.newPage(),
          signal,
        );
        const response = await withAbort(
          page.goto(input.invitationUrl, {
            waitUntil: "domcontentloaded",
          }),
          signal,
        );
        const referer =
          response?.request().headers().referer;

        if (
          typeof referer === "string" &&
          referer !== ""
        ) {
          throw new Error("REFERRER_POLICY_FAILED");
        }

        const landedUrl = new URL(page.url());

        if (landedUrl.origin !== input.origin) {
          throw new Error("CROSS_ORIGIN_NAVIGATION");
        }

        const status = page.locator(statusSelector);
        const liveRegion =
          await withAbort(
            status.getAttribute("aria-live"),
            signal,
          );
        let accessibility = null;

        if (input.interaction === "keyboard-submit") {
          if (liveRegion !== "polite") {
            throw new Error("LIVE_REGION_INVALID");
          }

          const focusEvidence =
            await collectFocusEvidence(
              page,
              signal,
            );
          accessibility = {
            focusOrder:
              focusEvidence.focusOrder,
            submittedWith: "keyboard",
            statusLiveRegion: "polite",
            announcementObserved: false,
            focusIndicatorVisible:
              focusEvidence
                .focusIndicatorVisible,
          };
        } else {
          await withAbort(
            page
              .locator(acceptButtonSelector)
              .click(),
            signal,
          );
        }

        await withAbort(
          page
            .locator(completedStatusSelector)
            .waitFor({ state: "visible" }),
          signal,
        );
        const outcome = requireOutcome(
          await withAbort(
            status.getAttribute(
              "data-invitation-status",
            ),
            signal,
          ),
        );
        const exposedPrivateFieldCount =
          await withAbort(
            page
              .locator(privateFieldSelector)
              .count(),
            signal,
          );
        const exposedInvitationDetailCount =
          await withAbort(
            page
              .locator(invitationDetailSelector)
              .count(),
            signal,
          );

        if (accessibility !== null) {
          accessibility = Object.freeze({
            ...accessibility,
            announcementObserved:
              outcome === "already-accepted",
          });
        }

        await withAbort(
          context.close(),
          signal,
        );
        closed = true;

        const completedAt =
          requireCanonicalTimestamp(
            configuration.clock(),
          );
        const safeEvidence = {
          completedAt,
          scenarioName: input.scenarioName,
          sessionProfile:
            input.sessionProfile,
          outcome,
          exposedPrivateFieldCount,
          exposedInvitationDetailCount,
          accessibility,
        };

        return Object.freeze({
          completedAt,
          runFingerprint:
            fingerprintFor(safeEvidence),
          sessionIsolation:
            "isolated-and-closed",
          navigatedOrigin: input.origin,
          outcome,
          exposedPrivateFieldCount,
          exposedInvitationDetailCount,
          accessibility,
        });
      } finally {
        if (!closed) {
          await context.close().catch(() => {});
        }
      }
    },
  });
}

export async function openPlaywrightTeamInvitationBrowserSession(
  configuration,
) {
  if (
    !isPlainObject(configuration) ||
    !hasExactKeys(configuration, [
      "clock",
      "resolveStorageState",
    ]) ||
    typeof configuration.clock !== "function" ||
    typeof configuration.resolveStorageState !== "function"
  ) {
    throw new Error("DRIVER_CONFIGURATION_INVALID");
  }

  const browser = await chromium.launch({
    headless: true,
  });
  let closed = false;

  return Object.freeze({
    driver:
      createPlaywrightTeamInvitationBrowserSessionDriver({
        browser,
        clock: configuration.clock,
        resolveStorageState:
          configuration.resolveStorageState,
      }),
    async close() {
      if (closed) {
        return;
      }

      await browser.close();
      closed = true;
    },
  });
}
