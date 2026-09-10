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
  createTeamInvitationAcceptanceRepository,
} from "../db/teamInvitationAcceptanceRepository.ts";
import {
  createTeamInvitationExpirationRepository,
} from "../db/teamInvitationExpirationRepository.ts";
import {
  createTeamInvitationRepository,
} from "../db/teamInvitationRepository.ts";
import {
  createTeamInvitationExpirationScheduler,
} from "../server/team/teamInvitationExpirationScheduler.ts";
import {
  deriveTeamInvitationKey,
} from "../server/team/teamInvitationKey.ts";

class SqliteD1Statement {
  constructor(
    statement,
    beforeFirst,
  ) {
    this.statement = statement;
    this.beforeFirst = beforeFirst;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    await this.beforeFirst?.();

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
  constructor(
    database,
    options = {},
  ) {
    this.database = database;
    this.beforeFirst =
      options.beforeFirst;
    this.batchTail =
      Promise.resolve();
  }

  prepare(sql) {
    return new SqliteD1Statement(
      this.database.prepare(sql),
      this.beforeFirst
        ? () =>
            this.beforeFirst(sql)
        : undefined,
    );
  }

  batch(statements) {
    const execute = async () => {
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
    };
    const pending = this.batchTail.then(
      execute,
      execute,
    );

    this.batchTail = pending.then(
      () => undefined,
      () => undefined,
    );

    return pending;
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

  const binding =
    new SqliteD1Database(
      database,
    );

  return {
    database,
    repository:
      createTeamInvitationRepository(
        binding,
      ),
    expirationRepository:
      createTeamInvitationExpirationRepository(
        binding,
      ),
    acceptanceRepository:
      createTeamInvitationAcceptanceRepository(
        binding,
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
          invitation_version AS invitationVersion,
          status,
          last_error_code AS lastErrorCode
        FROM team_invitation_deliveries
        ORDER BY invitation_version ASC
      `)
      .all()
      .map((row) => ({
        ...row,
      })),
    [
      {
        invitationVersion: 1,
        status: "cancelled",
        lastErrorCode:
          "INVITATION_REVOKED",
      },
      {
        invitationVersion: 3,
        status: "pending",
        lastErrorCode: null,
      },
    ],
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
          "manager-user",
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
  assert.deepEqual(
    {
      ...fixture.database
        .prepare(`
          SELECT
            status,
            last_error_code AS lastErrorCode
          FROM team_invitation_deliveries
        `)
        .get(),
    },
    {
      status: "cancelled",
      lastErrorCode:
        "INVITATION_EXPIRED",
    },
  );
});

test("records scheduled expiration under the approved system actor", async () => {
  const fixture =
    await createFixture();
  const created =
    await fixture.repository.request(
      requestCommand,
    );
  const systemActorId =
    "team-invitation-expiration-scheduler-v1";
  const expired =
    await fixture.repository.transition({
      tenantId: 7,
      invitationKey:
        created.invitation
          .invitationKey,
      expectedVersion: 1,
      toStatus: "expired",
      systemActorId,
      occurredAt: expiresAt,
    });
  const repeated =
    await fixture.repository.transition({
      tenantId: 7,
      invitationKey:
        created.invitation
          .invitationKey,
      expectedVersion: 1,
      toStatus: "expired",
      systemActorId,
      occurredAt: expiresAt,
    });

  assert.equal(
    expired.outcome,
    "updated",
  );
  assert.equal(
    repeated.outcome,
    "unchanged",
  );
  assert.deepEqual(
    expired.invitation.lastActor,
    {
      kind: "system",
      id: systemActorId,
    },
  );
  assert.deepEqual(
    {
      ...fixture.database
        .prepare(`
          SELECT
            actor_kind AS actorKind,
            actor_external_user_id AS actorId
          FROM team_invitation_events
          WHERE event_type = 'expired'
        `)
        .get(),
    },
    {
      actorKind: "system",
      actorId: systemActorId,
    },
  );
});

test("scans due invitations by exclusive keyset and expires one bounded run", async () => {
  const fixture =
    await createFixture();
  const invitations = [
    {
      email:
        "first@example.com",
      expiresAt:
        "2026-08-10T10:00:00.000Z",
    },
    {
      email:
        "second@example.com",
      expiresAt:
        "2026-08-11T10:00:00.000Z",
    },
    {
      email:
        "future@example.com",
      expiresAt:
        "2026-08-13T10:00:00.000Z",
    },
  ];

  for (
    const invitation of
      invitations
  ) {
    await fixture.repository.request({
      ...requestCommand,
      email: invitation.email,
      expiresAt:
        invitation.expiresAt,
    });
  }

  const firstPage =
    await fixture
      .expirationRepository
      .listDuePage(
        expiresAt,
        null,
        1,
      );
  const secondPage =
    await fixture
      .expirationRepository
      .listDuePage(
        expiresAt,
        firstPage.nextCursor,
        1,
      );
  const finalPage =
    await fixture
      .expirationRepository
      .listDuePage(
        expiresAt,
        secondPage.nextCursor,
        1,
      );

  assert.equal(
    firstPage.invitations[0]
      .expiresAt,
    "2026-08-10T10:00:00.000Z",
  );
  assert.equal(
    secondPage.invitations[0]
      .expiresAt,
    "2026-08-11T10:00:00.000Z",
  );
  assert.deepEqual(
    finalPage,
    {
      invitations: [],
      nextCursor: null,
    },
  );
  for (
    const input of [
      {
        cutoff: "invalid",
        cursor: null,
        limit: 1,
      },
      {
        cutoff: expiresAt,
        cursor: {
          ...firstPage
            .nextCursor,
          extra: true,
        },
        limit: 1,
      },
      {
        cutoff: expiresAt,
        cursor: null,
        limit: 51,
      },
    ]
  ) {
    await assert.rejects(
      fixture
        .expirationRepository
        .listDuePage(
          input.cutoff,
          input.cursor,
          input.limit,
        ),
      /expiration|timestamp/,
    );
  }

  const scheduler =
    createTeamInvitationExpirationScheduler(
      fixture
        .expirationRepository,
      fixture.repository,
      {
        now() {
          return new Date(
            expiresAt,
          );
        },
      },
    );

  assert.deepEqual(
    await scheduler.run(),
    {
      scanned: 2,
      expired: 2,
      idempotent: 0,
      skipped: 0,
      limitReached: false,
    },
  );
  assert.deepEqual(
    await scheduler.run(),
    {
      scanned: 0,
      expired: 0,
      idempotent: 0,
      skipped: 0,
      limitReached: false,
    },
  );
  assert.deepEqual(
    fixture.database
      .prepare(`
        SELECT status, count(*) AS count
        FROM team_invitations
        GROUP BY status
        ORDER BY status ASC
      `)
      .all()
      .map((row) => ({
        ...row,
      })),
    [
      {
        status: "expired",
        count: 2,
      },
      {
        status: "pending",
        count: 1,
      },
    ],
  );
  assert.equal(
    fixture.database
      .prepare(`
        SELECT count(*) AS count
        FROM team_invitation_events
        WHERE actor_kind = 'system'
      `)
      .get().count,
    2,
  );
});

test("accepts one verified invitation atomically and keeps retries idempotent", async () => {
  const fixture =
    await createFixture();
  const created =
    await fixture.repository.request(
      requestCommand,
    );
  const command = {
    invitationKey:
      created.invitation
        .invitationKey,
    externalUserId:
      "accepted-user",
    verifiedEmail:
      "team.member@example.com",
    acceptedAt:
      "2026-08-06T10:00:00.000Z",
  };
  const accepted =
    await fixture
      .acceptanceRepository
      .accept(command);
  const repeated =
    await fixture
      .acceptanceRepository
      .accept(command);

  assert.equal(
    accepted.outcome,
    "created",
  );
  assert.equal(
    repeated.outcome,
    "unchanged",
  );
  assert.equal(
    accepted.invitation.status,
    "accepted",
  );
  assert.equal(
    accepted.invitation.version,
    2,
  );
  assert.deepEqual(
    accepted.membership,
    {
      tenantId: 7,
      externalUserId:
        "accepted-user",
      role: "agent",
      status: "active",
      version: 1,
    },
  );
  assert.deepEqual(
    {
      ...fixture.database
        .prepare(`
          SELECT
            status,
            last_error_code AS lastErrorCode
          FROM team_invitation_deliveries
        `)
        .get(),
    },
    {
      status: "cancelled",
      lastErrorCode:
        "INVITATION_ACCEPTED",
    },
  );
  assert.equal(
    fixture.database
      .prepare(`
        SELECT count(*) AS count
        FROM team_invitation_acceptances
      `)
      .get().count,
    1,
  );
  assert.deepEqual(
    await fixture
      .expirationRepository
      .listDuePage(
        expiresAt,
        null,
        10,
      ),
    {
      invitations: [],
      nextCursor: null,
    },
  );
  assert.throws(
    () =>
      fixture.database.exec(`
        UPDATE team_invitations
        SET updated_at =
          '2026-08-07T10:00:00.000Z'
        WHERE invitation_key =
          '${created.invitation.invitationKey}'
      `),
    /accepted team invitations are immutable/,
  );
});

test("rejects mismatched, expired, revoked, sending, and existing-member acceptance", async () => {
  const cases = [
    {
      setup: "email",
      expected:
        "email-mismatch",
    },
    {
      setup: "expired",
      expected:
        "invalid-transition",
    },
    {
      setup: "revoked",
      expected:
        "invalid-transition",
    },
    {
      setup: "sending",
      expected:
        "invalid-transition",
    },
    {
      setup: "member",
      expected: "conflict",
    },
  ];

  for (
    const testCase of cases
  ) {
    const fixture =
      await createFixture();
    const created =
      await fixture.repository
        .request(requestCommand);
    const invitationKey =
      created.invitation
        .invitationKey;

    if (
      testCase.setup ===
      "revoked"
    ) {
      await fixture.repository
        .transition({
          tenantId: 7,
          invitationKey,
          expectedVersion: 1,
          toStatus: "revoked",
          actorExternalUserId:
            "manager-user",
          occurredAt:
            "2026-08-05T11:00:00.000Z",
        });
    }

    if (
      testCase.setup ===
      "sending"
    ) {
      fixture.database.exec(`
        UPDATE team_invitation_deliveries
        SET
          status = 'sending',
          attempt_count = 1,
          updated_at =
            '2026-08-05T11:00:00.000Z'
      `);
    }

    if (
      testCase.setup ===
      "member"
    ) {
      fixture.database.exec(`
        INSERT INTO tenant_memberships (
          tenant_id,
          external_user_id,
          role,
          status,
          version,
          created_at,
          updated_at
        )
        VALUES (
          7,
          'accepted-user',
          'viewer',
          'active',
          1,
          '2026-08-05T11:00:00.000Z',
          '2026-08-05T11:00:00.000Z'
        )
      `);
    }

    const result =
      await fixture
        .acceptanceRepository
        .accept({
          invitationKey,
          externalUserId:
            "accepted-user",
          verifiedEmail:
            testCase.setup ===
            "email"
              ? "other@example.com"
              : "team.member@example.com",
          acceptedAt:
            testCase.setup ===
            "expired"
              ? expiresAt
              : "2026-08-06T10:00:00.000Z",
        });

    assert.equal(
      result.outcome,
      testCase.expected,
    );
    assert.equal(
      fixture.database
        .prepare(`
          SELECT count(*) AS count
          FROM team_invitation_acceptances
        `)
        .get().count,
      0,
    );
  }
});

test("rolls back invitation, membership, outbox, and acceptance audit together", async () => {
  const fixture =
    await createFixture();
  const created =
    await fixture.repository.request(
      requestCommand,
    );

  fixture.database.exec(`
    CREATE TRIGGER reject_acceptance_audit
    BEFORE INSERT
    ON team_invitation_acceptances
    BEGIN
      SELECT RAISE(
        ABORT,
        'acceptance rejected'
      );
    END
  `);

  await assert.rejects(
    fixture
      .acceptanceRepository
      .accept({
        invitationKey:
          created.invitation
            .invitationKey,
        externalUserId:
          "accepted-user",
        verifiedEmail:
          "team.member@example.com",
        acceptedAt:
          "2026-08-06T10:00:00.000Z",
      }),
    /persistence failed/,
  );
  assert.deepEqual(
    {
      ...fixture.database
        .prepare(`
          SELECT status, version
          FROM team_invitations
        `)
        .get(),
    },
    {
      status: "pending",
      version: 1,
    },
  );
  assert.deepEqual(
    {
      ...fixture.database
        .prepare(`
          SELECT
            status,
            last_error_code AS lastErrorCode
          FROM team_invitation_deliveries
        `)
        .get(),
    },
    {
      status: "pending",
      lastErrorCode: null,
    },
  );

  for (
    const table of [
      "team_invitation_acceptances",
      "tenant_memberships",
    ]
  ) {
    assert.equal(
      fixture.database
        .prepare(
          `SELECT count(*) AS count FROM ${table}`,
        )
        .get().count,
      0,
    );
  }
});

test("keeps concurrent acceptance exact and single-use", async () => {
  const fixture =
    await createFixture();
  const created =
    await fixture.repository.request(
      requestCommand,
    );
  const command = {
    invitationKey:
      created.invitation
        .invitationKey,
    externalUserId:
      "accepted-user",
    verifiedEmail:
      "team.member@example.com",
    acceptedAt:
      "2026-08-06T10:00:00.000Z",
  };
  const outcomes = (
    await Promise.all([
      fixture
        .acceptanceRepository
        .accept(command),
      fixture
        .acceptanceRepository
        .accept(command),
    ])
  )
    .map(({ outcome }) =>
      outcome,
    )
    .sort();

  assert.deepEqual(
    outcomes,
    ["created", "unchanged"],
  );
  assert.equal(
    fixture.database
      .prepare(`
        SELECT count(*) AS count
        FROM tenant_memberships
      `)
      .get().count,
    1,
  );
});

test("reclassifies an identical acceptance completed between state reads", async () => {
  const fixture =
    await createFixture();
  const createdInvitation =
    await fixture.repository.request(
      requestCommand,
    );
  const command = {
    invitationKey:
      createdInvitation.invitation
        .invitationKey,
    externalUserId:
      "accepted-user",
    verifiedEmail:
      "team.member@example.com",
    acceptedAt:
      "2026-08-06T10:00:00.000Z",
  };
  const membershipReadReached =
    Promise.withResolvers();
  const continueMembershipRead =
    Promise.withResolvers();
  let membershipReadPaused = false;
  const delayedRepository =
    createTeamInvitationAcceptanceRepository(
      new SqliteD1Database(
        fixture.database,
        {
          async beforeFirst(sql) {
            if (
              membershipReadPaused ||
              !/FROM tenant_memberships\s+WHERE tenant_id = \?1/.test(
                sql,
              )
            ) {
              return;
            }

            membershipReadPaused = true;
            membershipReadReached.resolve();
            await continueMembershipRead.promise;
          },
        },
      ),
    );
  const delayedAcceptance =
    delayedRepository.accept(command);

  await membershipReadReached.promise;

  const firstAcceptance =
    await fixture.acceptanceRepository.accept(
      command,
    );

  continueMembershipRead.resolve();

  const repeatedAcceptance =
    await delayedAcceptance;

  assert.equal(
    firstAcceptance.outcome,
    "created",
  );
  assert.equal(
    repeatedAcceptance.outcome,
    "unchanged",
  );
  assert.deepEqual(
    repeatedAcceptance.membership,
    firstAcceptance.membership,
  );
});

test("rejects ambiguous and unapproved transition actors before persistence", async () => {
  const commands = [
    {
      actorExternalUserId:
        "manager-user",
      systemActorId:
        "team-invitation-expiration-scheduler-v1",
    },
    {
      systemActorId:
        "unknown-scheduler",
    },
    {
      systemActorId:
        "team-invitation-expiration-scheduler-v1",
      toStatus: "revoked",
    },
    {},
  ];

  for (const actor of commands) {
    const fixture =
      await createFixture();
    const created =
      await fixture.repository.request(
        requestCommand,
      );

    await assert.rejects(
      fixture.repository.transition({
        tenantId: 7,
        invitationKey:
          created.invitation
            .invitationKey,
        expectedVersion: 1,
        toStatus:
          actor.toStatus ??
          "expired",
        occurredAt: expiresAt,
        ...actor,
      }),
      /actor|system actor/,
    );
    assert.deepEqual(
      {
        ...fixture.database
          .prepare(`
            SELECT status, version
            FROM team_invitations
          `)
          .get(),
      },
      {
        status: "pending",
        version: 1,
      },
    );
  }
});

test("rejects stale, active re-request, cross-tenant, and non-terminal transition input", async () => {
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
    /transition status is invalid/,
  );
  await assert.rejects(
    fixture.repository.transition(
      {
        tenantId: 7,
        invitationKey:
          created.invitation
            .invitationKey,
        expectedVersion: 1,
        toStatus: "accepted",
        actorExternalUserId:
          "manager-user",
        occurredAt:
          "2026-08-05T11:00:00.000Z",
      },
    ),
    /transition status is invalid/,
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

test("rolls back transition and delivery cancellation when audit persistence fails", async () => {
  const fixture =
    await createFixture();
  const created =
    await fixture.repository.request(
      requestCommand,
    );

  fixture.database.exec(`
    CREATE TRIGGER reject_transition_event
    BEFORE INSERT
    ON team_invitation_events
    WHEN NEW.event_type = 'revoked'
    BEGIN
      SELECT RAISE(
        ABORT,
        'transition event rejected'
      );
    END
  `);

  await assert.rejects(
    fixture.repository.transition({
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
    }),
    /persistence failed/,
  );
  assert.deepEqual(
    {
      ...fixture.database
        .prepare(`
          SELECT status, version
          FROM team_invitations
        `)
        .get(),
    },
    {
      status: "pending",
      version: 1,
    },
  );
  assert.deepEqual(
    {
      ...fixture.database
        .prepare(`
          SELECT
            status,
            last_error_code AS lastErrorCode
          FROM team_invitation_deliveries
        `)
        .get(),
    },
    {
      status: "pending",
      lastErrorCode: null,
    },
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
    /exact version transition|active invitation delivery/,
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

  fixture.database.exec(`
    UPDATE team_invitation_deliveries
    SET
      status = 'cancelled',
      last_error_code =
        'INVITATION_EXPIRED'
    WHERE invitation_key =
      '${invitationKey}'
  `);
  assert.throws(
    () =>
      fixture.database.exec(`
        UPDATE team_invitations
        SET
          status = 'expired',
          version = 2,
          last_actor_kind = 'system',
          last_actor_external_user_id =
            'unknown-scheduler',
          updated_at =
            '${expiresAt}'
        WHERE invitation_key =
          '${invitationKey}'
      `),
    /last_actor_kind_valid/,
  );
  assert.throws(
    () =>
      fixture.database.exec(`
        UPDATE team_invitations
        SET
          status = 'revoked',
          version = 2,
          last_actor_kind = 'system',
          last_actor_external_user_id =
            'team-invitation-expiration-scheduler-v1',
          updated_at =
            '${expiresAt}'
        WHERE invitation_key =
          '${invitationKey}'
      `),
    /last_actor_kind_valid/,
  );
});
