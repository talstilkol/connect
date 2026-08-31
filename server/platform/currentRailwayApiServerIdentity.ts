import {
  auth,
} from "@clerk/nextjs/server";
import {
  getVercelOidcToken,
} from "@vercel/oidc";
import {
  resolveRailwayApiServerIdentity,
  type RailwayApiServerIdentityState,
} from "./railwayApiServerIdentity.ts";

export async function resolveCurrentRailwayApiServerIdentity(): Promise<
  RailwayApiServerIdentityState
> {
  return resolveRailwayApiServerIdentity({
    async readClerkAuth() {
      const state = await auth();

      return Object.freeze({
        userId: state.userId,
        getToken: () => state.getToken(),
      });
    },
    readVercelOidcToken:
      getVercelOidcToken,
  });
}
