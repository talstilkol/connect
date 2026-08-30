export type TeamInvitationAcceptanceIdentityResolution =
  | Readonly<{
      status: "verified";
      verifiedEmail: string;
    }>
  | Readonly<{
      status: "rejected" | "unavailable";
    }>;

export interface TeamInvitationAcceptanceIdentityResolver {
  resolve(
    externalUserId: unknown,
  ): Promise<TeamInvitationAcceptanceIdentityResolution>;
}
