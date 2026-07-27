import {
  inspectSystemAdminConfiguration,
} from "./systemAdminConfiguration.ts";
import {
  readClerkIdentity,
} from "./clerkIdentity.ts";
import {
  resolveSystemAdminSession,
  type SystemAdminSession,
} from "./systemAdminSession.ts";

export class SystemAdminConfigurationError extends Error {
  constructor() {
    super(
      "System administrator configuration is unavailable",
    );
    this.name =
      "SystemAdminConfigurationError";
  }
}

export async function requireCurrentSystemAdminSession():
  Promise<SystemAdminSession> {
  const configuration =
    inspectSystemAdminConfiguration();

  if (
    configuration.status !==
    "configured"
  ) {
    throw new SystemAdminConfigurationError();
  }

  const identity = await readClerkIdentity();

  return resolveSystemAdminSession(
    identity,
    configuration.externalUserIds,
  );
}
