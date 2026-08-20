const compactJwtPattern =
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const maximumTokenLength = 8_192;
const maximumExternalUserIdLength = 255;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export type RailwayApiServerIdentityState =
  | Readonly<{
      status: "authenticated";
      oidcToken: string;
      userSessionToken: string;
    }>
  | Readonly<{
      status: "unauthenticated" | "unavailable";
      oidcToken: null;
      userSessionToken: null;
    }>;

interface ClerkServerAuth {
  readonly userId: string | null;
  readonly getToken: () => Promise<string | null>;
}

export interface RailwayApiServerIdentityDependencies {
  readonly readClerkAuth: () => Promise<Readonly<ClerkServerAuth>>;
  readonly readVercelOidcToken: () => Promise<string>;
}

function validToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumTokenLength &&
    compactJwtPattern.test(value)
  );
}

function validExternalUserId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumExternalUserIdLength &&
    value.trim() === value &&
    !controlCharacterPattern.test(value)
  );
}

function requireDependencies(
  dependencies: Readonly<RailwayApiServerIdentityDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "readClerkAuth,readVercelOidcToken" ||
    typeof dependencies.readClerkAuth !== "function" ||
    typeof dependencies.readVercelOidcToken !== "function"
  ) {
    throw new Error("Railway API server identity dependencies are invalid");
  }
}

export async function resolveRailwayApiServerIdentity(
  dependencies: Readonly<RailwayApiServerIdentityDependencies>,
): Promise<RailwayApiServerIdentityState> {
  requireDependencies(dependencies);

  let clerkState: Readonly<ClerkServerAuth>;

  try {
    clerkState = await dependencies.readClerkAuth();
  } catch {
    return Object.freeze({
      status: "unavailable",
      oidcToken: null,
      userSessionToken: null,
    });
  }

  if (clerkState.userId === null) {
    return Object.freeze({
      status: "unauthenticated",
      oidcToken: null,
      userSessionToken: null,
    });
  }

  if (
    !validExternalUserId(clerkState.userId) ||
    typeof clerkState.getToken !== "function"
  ) {
    return Object.freeze({
      status: "unavailable",
      oidcToken: null,
      userSessionToken: null,
    });
  }

  let userSessionToken: string | null;
  let oidcToken: string;

  try {
    [userSessionToken, oidcToken] = await Promise.all([
      clerkState.getToken(),
      dependencies.readVercelOidcToken(),
    ]);
  } catch {
    return Object.freeze({
      status: "unavailable",
      oidcToken: null,
      userSessionToken: null,
    });
  }

  if (!validToken(userSessionToken) || !validToken(oidcToken)) {
    return Object.freeze({
      status: "unavailable",
      oidcToken: null,
      userSessionToken: null,
    });
  }

  return Object.freeze({
    status: "authenticated",
    oidcToken,
    userSessionToken,
  });
}
