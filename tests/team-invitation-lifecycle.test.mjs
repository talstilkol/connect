import assert from "node:assert/strict";
import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  DatabaseSync,
} from "node:sqlite";
import test from "node:test";

import {
  createTeamInvitationRepository,
} from "../db/teamInvitationRepository.ts";
import {
  deriveTeamInvitationKey,
} from "../server/team/teamInvitationKey.ts";

class SqliteD1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return (
      this.statement.get(
        ...this.values,
      ) ?? null
    );
  }

  async all() {
    return {
      success: true,
      results:
        this.statement.all(
          ...this.values,
        ),
    };
  }

  async run() {
    const result =
      this.statement.run(
        ...this.values,
      );

    return {
      success: true,
      meta: {
        changes:
          Number(result.changes),
      },
    };
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(
      this.database.prepare(sql),
    );
  }

  async batch(statements) {
    const results = [];

    this.database.exec(
      "BEGIN IMMEDIATE",
    );

    try {
      for (
        const statement of statements
      ) {
        results.push(
          await statement.run(),
        );
      }

      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

async function createFixture() {
  const directory =
    new URL(
      "../drizzle/",
      import.meta.url,
    );
  const migrations = (
    await readdir(directory)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();
  const database =
    new DatabaseSync(":memory:");

  database.exec(
    "PRAGMA foreign_keys = ON",
  );

  for (
    const fileName of migrations
  ) {
    const source =
      await readFile(
        new URL(
          fileName,
          directory,
        ),
        "utf8",
      );

    for (
      const statement of source.split(
        "--> statement-breakpoint",
      )
    ) {
      if (statement.trim()) {
        database.exec(statement);
      }
    }
  }

  database.exec(`
    INSERT INTO tenants (
      id,
      display_name,
      status
    )
    VALUES
      (7, 'workspace', 'active'),
      (8, 'other-workspace', 'active')
  `);

  return {
    database,
    repository:
      createTeamInvitationRepository(
        new SqliteD1Database(
          database,
        ),
      ),
  };
}

const requestedAt =
  "2026-08-05T10:00:00.000Z";
const expiresAt =
  "2026-08-12T10:00:00.000Z";
const requestCommand = {
  tenantId: 7,
  email:
    "TEAM.MEMBER@EXAMPLE.COM",
  role: "agent",
  expectedVersion: 0,
  actorExternalUserId:
    "manager-user",
  requestedAt,
  expiresAt,
};

test("creates one normalized pending invitation and immutable request event", async () => {
  const fixture =
    await createFixture();
  const created =
    await fixture.repository.request(
      requestCommand,
    );
  const repeated =
    await fixture.repository.request(
      requestCommand,
    );

  assert.equal(
    created.outcome,
    "created",
  );
  assert.equal(
    repeated.outcome,
    "unchanged",
  );
  assert.deepEqual(
    created.invitation,
    repeated.invitation,
  );
  assert.equal(
    created.invitation
      .normalizedEmail,
    "team.member@example.com",
  );
  assert.equal(
    created.invitation.status,
    "pending",
  );
  assert.equal(
    created.invitation.version,
    1,
  );
  assert.equal(
    fixture.database
      .prepare(`
        SELECT count(*) AS count
        FROM team_invitation_events
      `)
      .get().count,
    1,
  );
});

test("revokes and re-requests one stable invitation with exact versions", async () => {
  const fixture =
    await createFixture();
  const created =
    await fixture.repository.request(
      requestCommand,
    );
  const revoked =
    await fixture.repository.transition(
      {
        tenantId: 7,
        invitationKey:
          created.invitation
            .invitationKey,
        expectedVersion: 1,
        toStatus: "revoked",
        actorExternalUserId:
          "manager-user",
        occurredAt:
          "2026-08-05T11:00:00.000Z",
      },
    );
  const repeated =
    await fixture.repository.transition(
      {
        tenantId: 7,
        invitationKey:
          created.invitation
            .invitationKey,
        expectedVersion: 1,
        toStatus: "revoked",
        actorExternalUserId:
          "manager-user",
        occurredAt:
          "2026-08-05T11:00:00.000Z",
      },
    );
  const reopened =
    await fixture.repository.request(
      {
        ...requestCommand,
        role: "viewer",
        expectedVersion: 2,
        requestedAt:
          "2026-08-06T10:00:00.000Z",
        expiresAt:
          "2026-08-13T10:00:00.000Z",
      },
    );

  assert.equal(
    revoked.outcome,
    "updated",
  );
  assert.equal(
    repeated.outcome,
    "unchanged",
  );
  assert.equal(
    reopened.outcome,
    "updated",
  );
  assert.equal(
    reopened.invitation.status,
    "pending",
  );
  assert.equal(
    reopened.invitation.role,
    "viewer",
  );
  assert.equal(
    reopened.invitation.version,
    3,
  );
  assert.deepEqual(
    fixture.database
      .prepare(`
        SELECT
          event_type AS eventType,
          from_version AS fromVersion,
          to_version AS toVersion
        FROM team_invitation_events
        ORDER BY to_version ASC
      `)
      .all()
      .map((row) => ({
        ...row,
      })),
    [
      {
        eventType: "requested",
        fromVersion: 0,
        toVersion: 1,
      },
      {
        eventType: "revoked",
        fromVersion: 1,
        toVersion: 2,
      },
      {
        eventType:
          "re-requested",
        fromVersion: 2,
        toVersion: 3,
      },
    ],
  );
});

test("expires a pending invitation without changing its original expiry", async () => {
  const fixture =
    await createFixture();
  const created =
    await fixture.repository.request(
      requestCommand,
    );
  const expired =
    await fixture.repository.transition(
      {
        tenantId: 7,
        invitationKey:
          created.invitation
            .invitationKey,
        expectedVersion: 1,
        toStatus: "expired",
        actorExternalUserId:
          "system-expiry-worker",
        occurredAt: expiresAt,
      },
    );

  assert.equal(
    expired.outcome,
    "updated",
  );
  assert.equal(
    expired.invitation.status,
    "expired",
  );
  assert.equal(
    expired.invitation.expiresAt,
    expiresAt,
  );
});

test("rejects stale, active re-request, cross-tenant, and pending transition input", async () => {
  const fixture =
    await createFixture();
  const created =
    await fixture.repository.request(
      requestCommand,
    );

  assert.equal(
    (
      await fixture.repository.request(
        {
          ...requestCommand,
          expectedVersion: 1,
        },
      )
    ).outcome,
    "invalid-transition",
  );
  assert.equal(
    (
      await fixture.repository.transition(
        {
          tenantId: 7,
          invitationKey:
            created.invitation
              .invitationKey,
          expectedVersion: 9,
          toStatus: "revoked",
          actorExternalUserId:
            "manager-user",
          occurredAt:
            "2026-08-05T11:00:00.000Z",
        },
      )
    ).outcome,
    "conflict",
  );
  assert.equal(
    (
      await fixture.repository.transition(
        {
          tenantId: 8,
          invitationKey:
            created.invitation
              .invitationKey,
          expectedVersion: 1,
          toStatus: "revoked",
          actorExternalUserId:
            "foreign-user",
          occurredAt:
            "2026-08-05T11:00:00.000Z",
        },
      )
    ).outcome,
    "not-found",
  );
  await assert.rejects(
    fixture.repository.transition(
      {
        tenantId: 7,
        invitationKey:
          created.invitation
            .invitationKey,
        expectedVersion: 1,
        toStatus: "pending",
        actorExternalUserId:
          "manager-user",
        occurredAt:
          "2026-08-05T11:00:00.000Z",
      },
    ),
    /pending requires/,
  );
});

test("rolls back invitation state when audit persistence fails", async () => {
  const fixture =
    await createFixture();

  fixture.database.exec(`
    CREATE TRIGGER reject_invitation_event
    BEFORE INSERT
    ON team_invitation_events
    BEGIN
      SELECT RAISE(
        ABORT,
        'event rejected'
      );
    END
  `);

  await assert.rejects(
    fixture.repository.request(
      requestCommand,
    ),
    /persistence failed/,
  );
  assert.equal(
    fixture.database
      .prepare(`
        SELECT count(*) AS count
        FROM team_invitations
      `)
      .get().count,
    0,
  );
});

test("database guards pending deletion, state versions, and event immutability", async () => {
  const fixture =
    await createFixture();
  const invitationKey =
    await deriveTeamInvitationKey({
      tenantId: 7,
      email:
        requestCommand.email,
    });

  await fixture.repository.request(
    requestCommand,
  );

  assert.throws(
    () =>
      fixture.database.exec(`
        DELETE FROM team_invitations
        WHERE invitation_key =
          '${invitationKey}'
      `),
    /pending team invitations cannot be deleted/,
  );
  assert.throws(
    () =>
      fixture.database.exec(`
        UPDATE team_invitations
        SET status = 'revoked'
        WHERE invitation_key =
          '${invitationKey}'
      `),
    /exact version transition/,
  );
  assert.throws(
    () =>
      fixture.database.exec(`
        UPDATE team_invitation_events
        SET event_type = 'expired'
      `),
    /events are immutable/,
  );
  assert.throws(
    () =>
      fixture.database.exec(`
        DELETE FROM team_invitation_events
      `),
    /events are immutable/,
  );
});
