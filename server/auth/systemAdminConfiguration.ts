import type {
  UserId,
} from "../../shared/domain/model.ts";

export const systemAdminEnvironmentKey =
  "CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS";

const MAX_SYSTEM_ADMINS = 50;
const MAX_EXTERNAL_USER_ID_LENGTH = 255;
const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u001f\u007f]/;

export type SystemAdminConfigurationState =
  | {
      status: "configured";
      externalUserIds: readonly UserId[];
    }
  | {
      status: "disabled";
      externalUserIds: readonly [];
    }
  | {
      status: "invalid";
      externalUserIds: readonly [];
    };

export type SystemAdminEnvironment = Partial<
  Record<
    typeof systemAdminEnvironmentKey,
    string | undefined
  >
>;

function readProcessEnvironment():
  SystemAdminEnvironment {
  return {
    CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
      process.env
        .CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS,
  };
}

function isValidExternalUserId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <=
      MAX_EXTERNAL_USER_ID_LENGTH &&
    value.trim() === value &&
    !CONTROL_CHARACTER_PATTERN.test(value)
  );
}

export function inspectSystemAdminConfiguration(
  environment:
    SystemAdminEnvironment =
      readProcessEnvironment(),
): SystemAdminConfigurationState {
  const rawValue =
    environment[
      systemAdminEnvironmentKey
    ];

  if (
    typeof rawValue !== "string" ||
    rawValue.trim().length === 0
  ) {
    return {
      status: "disabled",
      externalUserIds: [],
    };
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    return {
      status: "invalid",
      externalUserIds: [],
    };
  }

  if (
    !Array.isArray(parsedValue) ||
    parsedValue.length === 0 ||
    parsedValue.length > MAX_SYSTEM_ADMINS ||
    !parsedValue.every(
      isValidExternalUserId,
    ) ||
    new Set(parsedValue).size !==
      parsedValue.length
  ) {
    return {
      status: "invalid",
      externalUserIds: [],
    };
  }

  return {
    status: "configured",
    externalUserIds: Object.freeze(
      parsedValue.map(
        (value) => value as UserId,
      ),
    ),
  };
}

export function hasSystemAdminConfiguration(
  environment:
    SystemAdminEnvironment =
      readProcessEnvironment(),
): boolean {
  return (
    inspectSystemAdminConfiguration(
      environment,
    ).status === "configured"
  );
}
