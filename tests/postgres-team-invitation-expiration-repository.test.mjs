import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresTeamInvitationExpirationRepository,
  postgresTeamInvitationExpirationSql,
} from "../server/platform/postgresTeamInvitationExpirationRepository.ts";

const firstKey =
  "team_invitation_v1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const secondKey =
  "team_invitation_v1_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const cutoff = "2026-08-18T08:00:00.000Z";

function createRepository(rows, observed = []) {
  return createPostgresTeamInvitationExpirationRepository({
    queries: {
      async query(sql, parameters) {
        observed.push({ sql, parameters });
        assert.equal(sql, postgresTeamInvitationExpirationSql.listDuePage);
        return { rows, rowCount: rows.length };
      },
    },
  });
}

test("reads one bounded ordered expiration page with an exact cursor", async () => {
  const observed = [];
  const repository = createRepository(
    [
      {
        tenantId: "7",
        invitationKey: firstKey,
        expectedVersion: "2",
        expiresAt: "2026-08-18T07:00:00.000Z",
      },
      {
        tenantId: "8",
        invitationKey: secondKey,
        expectedVersion: "3",
        expiresAt: cutoff,
      },
    ],
    observed,
  );
  const page = await repository.listDuePage(cutoff, null, 2);

  assert.deepEqual(page.invitations, [
    {
      tenantId: 7,
      invitationKey: firstKey,
      expectedVersion: 2,
      expiresAt: "2026-08-18T07:00:00.000Z",
    },
    {
      tenantId: 8,
      invitationKey: secondKey,
      expectedVersion: 3,
      expiresAt: cutoff,
    },
  ]);
  assert.deepEqual(page.nextCursor, {
    expiresAt: cutoff,
    invitationKey: secondKey,
  });
  assert.deepEqual(observed[0].parameters, [cutoff, null, null, 2]);
});

test("binds an exclusive cursor and returns no continuation for a short page", async () => {
  const observed = [];
  const repository = createRepository([], observed);
  const cursor = {
    expiresAt: "2026-08-18T07:00:00.000Z",
    invitationKey: firstKey,
  };
  const page = await repository.listDuePage(cutoff, cursor, 50);

  assert.deepEqual(page, { invitations: [], nextCursor: null });
  assert.deepEqual(observed[0].parameters, [
    cutoff,
    cursor.expiresAt,
    cursor.invitationKey,
    50,
  ]);
});

test("rejects unordered, post-cutoff, excessive, and malformed results", async () => {
  await assert.rejects(
    createRepository([
      {
        tenantId: 7,
        invitationKey: firstKey,
        expectedVersion: 1,
        expiresAt: "2026-08-18T09:00:00.000Z",
      },
    ]).listDuePage(cutoff, null, 1),
    /after the expiration cutoff/,
  );

  await assert.rejects(
    createRepository([
      {
        tenantId: 7,
        invitationKey: secondKey,
        expectedVersion: 1,
        expiresAt: cutoff,
      },
      {
        tenantId: 7,
        invitationKey: firstKey,
        expectedVersion: 1,
        expiresAt: cutoff,
      },
    ]).listDuePage(cutoff, null, 2),
    /invalid invitation expiration ordering/,
  );

  const excessive = createPostgresTeamInvitationExpirationRepository({
    queries: {
      async query() {
        return { rows: [], rowCount: 51 };
      },
    },
  });
  await assert.rejects(
    excessive.listDuePage(cutoff, null, 50),
    /invalid result/,
  );

  assert.throws(
    () => createPostgresTeamInvitationExpirationRepository({}),
    /dependencies are invalid/,
  );
});
