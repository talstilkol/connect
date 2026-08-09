const maximumBundleLength = 65_536;
const maximumCookiesPerProfile = 100;
const maximumLocalStorageEntries = 100;
const maximumCookieNameLength = 256;
const maximumCookieValueLength = 4_096;
const maximumCookieDomainLength = 253;
const maximumCookiePathLength = 1_024;
const maximumLocalStorageNameLength = 256;
const maximumLocalStorageValueLength = 8_192;
const maximumUnixSeconds = 8_640_000_000_000;
const maximumValidationLifetimeMilliseconds =
  2 * 60 * 60 * 1_000;
const cookieNamePattern =
  /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const printableAsciiPattern = /^[\x20-\x7e]*$/;

export const teamInvitationBrowserAuthenticatedProfiles =
  Object.freeze([
    "unverified-primary-email",
    "verified-matching-email",
    "verified-mismatched-email",
    "verified-expired-invitation",
    "verified-accepted-invitation",
    "verified-accessibility",
  ]);

export class TeamInvitationBrowserAuthenticationStateError
  extends Error {
  constructor() {
    super("AUTHENTICATION_STATE_INVALID");
    this.name =
      "TeamInvitationBrowserAuthenticationStateError";
    this.code = "AUTHENTICATION_STATE_INVALID";
  }
}

function fail() {
  throw new TeamInvitationBrowserAuthenticationStateError();
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

function requireConfiguration(value) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "origin",
      "now",
      "minimumRemainingLifetimeMilliseconds",
    ]) ||
    typeof value.origin !== "string" ||
    !(value.now instanceof Date) ||
    !Number.isFinite(value.now.getTime()) ||
    !Number.isSafeInteger(
      value.minimumRemainingLifetimeMilliseconds,
    ) ||
    value.minimumRemainingLifetimeMilliseconds < 1 ||
    value.minimumRemainingLifetimeMilliseconds >
      maximumValidationLifetimeMilliseconds
  ) {
    fail();
  }

  let origin;

  try {
    origin = new URL(value.origin);
  } catch {
    fail();
  }

  if (
    origin.href !== `${origin.origin}/` ||
    origin.origin !== value.origin ||
    origin.protocol !== "https:" ||
    origin.username !== "" ||
    origin.password !== "" ||
    [
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(origin.hostname)
  ) {
    fail();
  }

  return Object.freeze({
    origin: origin.origin,
    hostname: origin.hostname,
    nowMilliseconds: value.now.getTime(),
    minimumRemainingLifetimeMilliseconds:
      value.minimumRemainingLifetimeMilliseconds,
  });
}

function isCookieDomainInScope(
  rawDomain,
  hostname,
) {
  if (
    typeof rawDomain !== "string" ||
    rawDomain.length === 0 ||
    rawDomain.length >
      maximumCookieDomainLength ||
    rawDomain !== rawDomain.toLowerCase() ||
    rawDomain.trim() !== rawDomain ||
    rawDomain.includes("\0")
  ) {
    return false;
  }

  const domain = rawDomain.startsWith(".")
    ? rawDomain.slice(1)
    : rawDomain;

  return (
    domain.split(".").length >= 2 &&
    (
      hostname === domain ||
      hostname.endsWith(`.${domain}`)
    )
  );
}

function parseCookie(
  value,
  configuration,
) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "name",
      "value",
      "domain",
      "path",
      "expires",
      "httpOnly",
      "secure",
      "sameSite",
    ]) ||
    typeof value.name !== "string" ||
    value.name.length === 0 ||
    value.name.length > maximumCookieNameLength ||
    !cookieNamePattern.test(value.name) ||
    typeof value.value !== "string" ||
    value.value.length > maximumCookieValueLength ||
    !printableAsciiPattern.test(value.value) ||
    !isCookieDomainInScope(
      value.domain,
      configuration.hostname,
    ) ||
    typeof value.path !== "string" ||
    value.path.length === 0 ||
    value.path.length > maximumCookiePathLength ||
    !value.path.startsWith("/") ||
    !printableAsciiPattern.test(value.path) ||
    typeof value.expires !== "number" ||
    !Number.isFinite(value.expires) ||
    value.expires > maximumUnixSeconds ||
    (
      value.expires !== -1 &&
      value.expires * 1_000 <
        configuration.nowMilliseconds +
          configuration.minimumRemainingLifetimeMilliseconds
    ) ||
    typeof value.httpOnly !== "boolean" ||
    value.secure !== true ||
    !["Strict", "Lax", "None"].includes(
      value.sameSite,
    )
  ) {
    fail();
  }

  return Object.freeze({
    name: value.name,
    value: value.value,
    domain: value.domain,
    path: value.path,
    expires: value.expires,
    httpOnly: value.httpOnly,
    secure: true,
    sameSite: value.sameSite,
  });
}

function parseLocalStorageEntry(value) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "name",
      "value",
    ]) ||
    typeof value.name !== "string" ||
    value.name.length === 0 ||
    value.name.length >
      maximumLocalStorageNameLength ||
    !printableAsciiPattern.test(value.name) ||
    typeof value.value !== "string" ||
    value.value.length >
      maximumLocalStorageValueLength ||
    value.value.includes("\0")
  ) {
    fail();
  }

  return Object.freeze({
    name: value.name,
    value: value.value,
  });
}

function parseOrigin(value, expectedOrigin) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "origin",
      "localStorage",
    ]) ||
    value.origin !== expectedOrigin ||
    !Array.isArray(value.localStorage) ||
    value.localStorage.length >
      maximumLocalStorageEntries
  ) {
    fail();
  }

  const localStorage =
    value.localStorage.map(
      parseLocalStorageEntry,
    );
  const names = localStorage.map(
    (entry) => entry.name,
  );

  if (new Set(names).size !== names.length) {
    fail();
  }

  return Object.freeze({
    origin: expectedOrigin,
    localStorage:
      Object.freeze(localStorage),
  });
}

function parseState(
  value,
  configuration,
) {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "cookies",
      "origins",
    ]) ||
    !Array.isArray(value.cookies) ||
    value.cookies.length === 0 ||
    value.cookies.length >
      maximumCookiesPerProfile ||
    !Array.isArray(value.origins) ||
    value.origins.length > 1
  ) {
    fail();
  }

  const cookies = value.cookies.map(
    (cookie) =>
      parseCookie(cookie, configuration),
  );
  const cookieIdentities = cookies.map(
    (cookie) =>
      `${cookie.name}\0${cookie.domain}\0${cookie.path}`,
  );

  if (
    new Set(cookieIdentities).size !==
    cookieIdentities.length
  ) {
    fail();
  }

  const origins = value.origins.map(
    (origin) =>
      parseOrigin(
        origin,
        configuration.origin,
      ),
  );

  return Object.freeze({
    cookies: Object.freeze(cookies),
    origins: Object.freeze(origins),
  });
}

export function parseTeamInvitationBrowserAuthenticationStates(
  rawValue,
  rawConfiguration,
) {
  if (
    typeof rawValue !== "string" ||
    rawValue.length === 0 ||
    rawValue.length > maximumBundleLength ||
    rawValue.trim() !== rawValue
  ) {
    fail();
  }

  const configuration =
    requireConfiguration(rawConfiguration);
  let value;

  try {
    value = JSON.parse(rawValue);
  } catch {
    fail();
  }

  if (
    !isPlainObject(value) ||
    !hasExactKeys(
      value,
      teamInvitationBrowserAuthenticatedProfiles,
    )
  ) {
    fail();
  }

  return Object.freeze(
    Object.fromEntries(
      teamInvitationBrowserAuthenticatedProfiles.map(
        (profile) => [
          profile,
          parseState(
            value[profile],
            configuration,
          ),
        ],
      ),
    ),
  );
}
