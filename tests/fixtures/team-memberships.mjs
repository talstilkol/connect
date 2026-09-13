// Shared versions and roles from the existing membership-state regression tests.
// These records are only used in isolated tests, never in a product database.
export const owner = {
  memberKey: "owner", referenceCode: "owner", displayName: null, primaryEmail: null,
  role: "owner", status: "active", version: 2, currentUser: true,
};
export const agent = {
  memberKey: "agent", referenceCode: "agent", displayName: null, primaryEmail: null,
  role: "agent", status: "active", version: 1, currentUser: false,
};
export const teamDirectoryFixture = () => ({
  identityStatus: "unavailable", members: [{ ...owner }, { ...agent }],
});
