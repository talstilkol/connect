import assert from "node:assert/strict";
import test from "node:test";

import {
  parseTeamInvitationBrowserAuthenticationStates,
  teamInvitationBrowserAuthenticatedProfiles,
  TeamInvitationBrowserAuthenticationStateError,
} from "../scripts/team-invitation-browser-auth-state-bundle.mjs";

const now = new Date(
  "2026-08-09T10:00:00.000Z",
);
const origin =
  "https://staging.connect.example";
const minimumRemainingLifetimeMilliseconds =
  8 * 60 * 1_000;

function cookie(
  profile,
  overrides = {},
) {
  return {
    name: "__session",
    value: `session-${profile}`,
    domain: "staging.connect.example",
    path: "/",
    expires:
      Date.parse(
        "2026-08-10T10:00:00.000Z",
      ) / 1_000,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    ...overrides,
  };
}

function bundle() {
  return Object.fromEntries(
    teamInvitationBrowserAuthenticatedProfiles.map(
      (profile) => [
        profile,
        {
          cookies: [cookie(profile)],
          origins: [],
        },
      ],
    ),
  );
}

function configuration(overrides = {}) {
  return {
    origin,
    now,
    minimumRemainingLifetimeMilliseconds,
    ...overrides,
  };
}

function expectsInvalid(error) {
  return (
    error instanceof
      TeamInvitationBrowserAuthenticationStateError &&
    error.code ===
      "AUTHENTICATION_STATE_INVALID" &&
    error.message ===
      "AUTHENTICATION_STATE_INVALID"
  );
}

test("accepts six deeply frozen staging-scoped Playwright states", () => {
  const value = bundle();
  value["verified-accessibility"].origins = [
    {
      origin,
      localStorage: [
        {
          name: "session-status",
          value: "active",
        },
      ],
    },
  ];
  value["verified-accessibility"]
    .cookies[0].domain =
    ".connect.example";
  value["verified-accessibility"]
    .cookies[0].expires = -1;

  const parsed =
    parseTeamInvitationBrowserAuthenticationStates(
      JSON.stringify(value),
      configuration(),
    );

  assert.deepEqual(
    Object.keys(parsed),
    teamInvitationBrowserAuthenticatedProfiles,
  );
  assert.ok(Object.isFrozen(parsed));
  assert.ok(
    Object.isFrozen(
      parsed["verified-accessibility"],
    ),
  );
  assert.ok(
    Object.isFrozen(
      parsed["verified-accessibility"]
        .cookies[0],
    ),
  );
  assert.ok(
    Object.isFrozen(
      parsed["verified-accessibility"]
        .origins[0].localStorage[0],
    ),
  );
});

test("rejects missing, expired, insecure, foreign, duplicate, or extended cookies", () => {
  const mutations = [
    (value) => {
      value["verified-matching-email"]
        .cookies = [];
    },
    (value) => {
      value["verified-matching-email"]
        .cookies[0].expires =
        Date.parse(
          "2026-08-09T10:07:59.000Z",
        ) / 1_000;
    },
    (value) => {
      value["verified-matching-email"]
        .cookies[0].secure = false;
    },
    (value) => {
      value["verified-matching-email"]
        .cookies[0].domain =
        "foreign.example";
    },
    (value) => {
      const state =
        value["verified-matching-email"];
      state.cookies.push({
        ...state.cookies[0],
      });
    },
    (value) => {
      value["verified-matching-email"]
        .cookies[0].partitionKey =
        "https://foreign.example";
    },
    (value) => {
      value["verified-matching-email"]
        .cookies[0].path = "/\nunsafe";
    },
  ];

  for (const mutate of mutations) {
    const value = bundle();
    mutate(value);

    assert.throws(
      () =>
        parseTeamInvitationBrowserAuthenticationStates(
          JSON.stringify(value),
          configuration(),
        ),
      expectsInvalid,
    );
  }
});

test("rejects foreign origins, duplicate local storage, and extended origin state", () => {
  const mutations = [
    (state) => {
      state.origins = [
        {
          origin:
            "https://foreign.example",
          localStorage: [],
        },
      ];
    },
    (state) => {
      state.origins = [
        {
          origin,
          localStorage: [
            { name: "key", value: "one" },
            { name: "key", value: "two" },
          ],
        },
      ];
    },
    (state) => {
      state.origins = [
        {
          origin,
          localStorage: [],
          indexedDB: [],
        },
      ];
    },
  ];

  for (const mutate of mutations) {
    const value = bundle();
    mutate(
      value["verified-matching-email"],
    );

    assert.throws(
      () =>
        parseTeamInvitationBrowserAuthenticationStates(
          JSON.stringify(value),
          configuration(),
        ),
      expectsInvalid,
    );
  }
});

test("rejects local, non-canonical, and invalid-clock validation boundaries", () => {
  for (const invalidConfiguration of [
    configuration({
      origin: "http://localhost:3000",
    }),
    configuration({
      origin:
        "https://staging.connect.example/",
    }),
    configuration({
      now: new Date("invalid"),
    }),
    configuration({
      minimumRemainingLifetimeMilliseconds:
        0,
    }),
    configuration({
      minimumRemainingLifetimeMilliseconds:
        2 * 60 * 60 * 1_000 + 1,
    }),
  ]) {
    assert.throws(
      () =>
        parseTeamInvitationBrowserAuthenticationStates(
          JSON.stringify(bundle()),
          invalidConfiguration,
        ),
      expectsInvalid,
    );
  }
});
