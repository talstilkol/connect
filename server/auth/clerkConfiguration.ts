export const clerkEnvironmentKeys = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
] as const;

export type ClerkConfigurationState =
  | {
      status: "configured";
      missingKeys: readonly [];
    }
  | {
      status: "disabled";
      missingKeys: typeof clerkEnvironmentKeys;
    }
  | {
      status: "incomplete";
      missingKeys: readonly (typeof clerkEnvironmentKeys)[number][];
    };

type ClerkEnvironment = Partial<
  Record<(typeof clerkEnvironmentKeys)[number], string | undefined>
>;

function readProcessEnvironment(): ClerkEnvironment {
  return {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  };
}

function hasValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function inspectClerkConfiguration(
  environment: ClerkEnvironment = readProcessEnvironment(),
): ClerkConfigurationState {
  const missingKeys = clerkEnvironmentKeys.filter(
    (key) => !hasValue(environment[key]),
  );

  if (missingKeys.length === 0) {
    return {
      status: "configured",
      missingKeys: [],
    };
  }

  if (missingKeys.length === clerkEnvironmentKeys.length) {
    return {
      status: "disabled",
      missingKeys: clerkEnvironmentKeys,
    };
  }

  return {
    status: "incomplete",
    missingKeys,
  };
}

export function hasClerkServerConfiguration(
  environment: ClerkEnvironment = readProcessEnvironment(),
): boolean {
  return inspectClerkConfiguration(environment).status === "configured";
}
