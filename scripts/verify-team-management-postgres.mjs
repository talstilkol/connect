import assert from "node:assert/strict";
import { createPostgresTenantMembershipRepository } from "../server/platform/postgresTenantMembershipRepository.ts";
import { createPostgresTenantMembershipMutationRepository } from "../server/platform/postgresTenantMembershipMutationRepository.ts";
import { createNodePostgresQueryExecutor, createNodePostgresTransactionManager } from "../server/platform/nodePostgresAdapter.ts";
import { createTeamDirectoryService } from "../server/team/teamDirectoryService.ts";
import { createTeamMembershipMutationService } from "../server/team/teamMembershipMutationService.ts";
import { createUnavailableTeamIdentityDirectory } from "../server/team/teamIdentityDirectory.ts";
import { resolveTenantSessionFromMemberships } from "../server/auth/tenantSession.ts";
import { deriveTeamMemberKey } from "../server/team/teamMemberKey.ts";

// Integration-only fixtures in the harness database; no Clerk account grants.
export async function verifyTeamManagementPostgres(pool) {
  const cases = [];
  const tenantId = Number((await pool.query("INSERT INTO tenants (display_name,status) VALUES ('Team management integration','active') RETURNING id")).rows[0].id);
  const ownerId = "team-management-integration-owner";
  const memberId = "team-management-integration-member";
  for (const [id, role] of [[ownerId, "owner"], [memberId, "agent"]]) {
    await pool.query("INSERT INTO tenant_memberships (tenant_id,external_user_id,role,status,version,created_at,updated_at) VALUES ($1,$2,$3,'active',1,now(),now())", [tenantId,id,role]);
  }
  const queries = createNodePostgresQueryExecutor(pool);
  const memberships = createPostgresTenantMembershipRepository(queries);
  const mutations = createTeamMembershipMutationService(createPostgresTenantMembershipMutationRepository({ queries, transactions: createNodePostgresTransactionManager(pool) }));
  const directory = createTeamDirectoryService({ identities: createUnavailableTeamIdentityDirectory(), memberships });
  const sessionFor = async (externalUserId) => resolveTenantSessionFromMemberships({ externalUserId }, await memberships.findActiveByExternalUserId(externalUserId), tenantId);
  const owner = await sessionFor(ownerId);
  const key = deriveTeamMemberKey(tenantId, memberId);
  let read = await directory.list(owner);
  assert.equal(read.members.length, 2);
  assert.ok(read.members.every((member) => member.status === "active"));
  cases.push("owner-directory-loads-current-versions");

  const changed = await mutations.changeRole(owner, { memberKey: key, expectedVersion: 1, role: "viewer" });
  assert.equal(changed.membership.version, 2);
  assert.equal((await sessionFor(memberId)).role, "viewer");
  cases.push("changed-role-is-used-by-the-next-session-read");
  await assert.rejects(mutations.changeRole(owner, { memberKey: key, expectedVersion: 1, role: "manager" }), (error) => error.code === "CONFLICT");
  cases.push("stale-role-change-is-rejected");

  const suspended = await mutations.changeStatus(owner, { memberKey: key, expectedVersion: 2, status: "suspended" });
  read = await directory.list(owner);
  const inactive = read.members.find((member) => member.memberKey === key);
  assert.equal(inactive.status, "suspended");
  assert.equal(inactive.version, suspended.membership.version);
  await assert.rejects(sessionFor(memberId), (error) => error.code === "TENANT_MEMBERSHIP_REQUIRED");
  cases.push("suspended-member-remains-visible-to-owner-and-cannot-resolve-a-session");

  const restored = await mutations.changeStatus(owner, { memberKey: key, expectedVersion: inactive.version, status: "active" });
  assert.equal((await sessionFor(memberId)).role, "viewer");
  assert.equal((await directory.list(owner)).members.find((member) => member.memberKey === key).status, "active");
  cases.push("owner-can-restore-access-after-a-fresh-directory-read");

  const moved = await mutations.transferOwner(owner, { newOwnerMemberKey: key, formerOwnerExpectedVersion: 1, newOwnerExpectedVersion: restored.membership.version, formerOwnerRole: "manager" });
  assert.equal(moved.formerOwner.role, "manager");
  assert.equal(moved.newOwner.role, "owner");
  await assert.rejects(mutations.changeRole(owner, { memberKey: key, expectedVersion: moved.newOwner.version, role: "viewer" }), (error) => error.code === "STALE_SESSION");
  await assert.rejects(directory.list(owner));
  cases.push("ownership-transfer-revokes-stale-owner-writes-and-owner-directory-reads");

  const newOwner = await sessionFor(memberId);
  const returned = await mutations.transferOwner(newOwner, { newOwnerMemberKey: deriveTeamMemberKey(tenantId, ownerId), formerOwnerExpectedVersion: moved.newOwner.version, newOwnerExpectedVersion: moved.formerOwner.version, formerOwnerRole: "agent" });
  assert.equal(returned.newOwner.role, "owner");
  assert.equal((await sessionFor(ownerId)).role, "owner");
  cases.push("new-owner-can-transfer-back-with-current-versions");

  await assert.rejects(mutations.changeRole(await sessionFor(ownerId), { memberKey: deriveTeamMemberKey(tenantId + 1, memberId), expectedVersion: returned.formerOwner.version, role: "viewer" }), (error) => error.code === "NOT_FOUND");
  cases.push("foreign-tenant-member-key-is-rejected");
  return { status: "passed", cases, caseCount: cases.length };
}
