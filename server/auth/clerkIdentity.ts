import { auth } from "@clerk/nextjs/server";
import type { UserId } from "../../shared/domain/model";
import { hasClerkServerConfiguration } from "./clerkConfiguration.ts";
import type { AuthenticatedIdentity } from "./tenantSession";

export async function readClerkIdentity(): Promise<AuthenticatedIdentity | null> {
  if (!hasClerkServerConfiguration()) {
    throw new Error("Clerk server configuration is unavailable");
  }

  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return null;
  }

  return {
    externalUserId: userId as UserId,
    externalOrganizationId: orgId,
  };
}
