import {
  enforceCurrentSystemAdminMutationRateLimit,
} from "../security/systemAdminMutationRateLimit.ts";
import {
  requireCurrentSystemAdminSession,
} from "./currentSystemAdminSession.ts";
import type {
  SystemAdminSession,
} from "./systemAdminSession.ts";

export async function requireCurrentSystemAdminMutationSession():
  Promise<SystemAdminSession> {
  const session =
    await requireCurrentSystemAdminSession();

  await enforceCurrentSystemAdminMutationRateLimit(
    session.externalUserId,
  );

  return session;
}
