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
  createTeamInvitationDeliveryRepository,
} from "../db/teamInvitationDeliveryRepository.ts";
import {
  createTeamInvitationRepository,
} from "../db/teamInvitationRepository.ts";
import {
  createTeamInvitationDispatchProcessor,
} from "../server/team/teamInvitationDispatchProcessor.ts";
import {
  createUnavailableTeamInvitationProvider,
} from "../server/team/teamInvitationProvider.ts";

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
  const binding =
    new SqliteD1Database(database);

  return {
    database,
    invitations:
      createTeamInvitationRepository(
        binding,
      ),
    deliveries:
      createTeamInvitationDeliveryRepository(
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
    "team.member@example.com",
  role: "agent",
  expectedVersion: 0,
  actorExternalUserId:
    "manager-user",
  requestedAt,
  expiresAt,
};

async function stage(
  fixture,
) {
  const result =
    await fixture.invitations
      .request(requestCommand);
  const row =
    fixture.database
      .prepare(`
        SELECT
          delivery_key AS deliveryKey
        FROM team_invitation_deliveries
      `)
      .get();

  return {
    invitation:
      result.invitation,
    deliveryKey:
      row.deliveryKey,
  };
}

function clock(...timestamps) {
  let index = 0;

  return () => {
    const value =
      timestamps[
        Math.min(
          index,
          timestamps.length - 1,
        )
      ];

    index += 1;
    return value;
  };
}

test("stages one deterministic outbox delivery in the invitation transaction", async () => {
  const fixture =
    await createFixture();
  const first =
    await fixture.invitations
      .request(requestCommand);
  const repeated =
    await fixture.invitations
      .request(requestCommand);
  const rows =
    fixture.database
      .prepare(`
        SELECT
          delivery_key AS deliveryKey,
          invitation_version AS invitationVersion,
          status,
          attempt_count AS attemptCount
        FROM team_invitation_deliveries
      `)
      .all();

  assert.equal(
    first.outcome,
    "created",
  );
  assert.equal(
    repeated.outcome,
    "unchanged",
  );
  assert.equal(rows.length, 1);
  assert.match(
    rows[0].deliveryKey,
    /^team_invitation_delivery_v1_[0-9a-f]{64}$/,
  );
  assert.deepEqual(
    {
      invitationVersion:
        rows[0]
          .invitationVersion,
      status:
        rows[0].status,
      attemptCount:
        rows[0].attemptCount,
    },
    {
      invitationVersion: 1,
      status: "pending",
      attemptCount: 0,
    },
  );
});

test("claims and submits one provider-accepted delivery exactly once", async () => {
  const fixture =
    await createFixture();
  const staged =
    await stage(fixture);
  const providerCalls = [];
  const processor =
    createTeamInvitationDispatchProcessor(
      fixture.deliveries,
      {
        async invite(command) {
          providerCalls.push(
            command,
          );
          return {
            status:
              "submitted",
          };
        },
      },
      clock(
        "2026-08-05T10:01:00.000Z",
        "2026-08-05T10:02:00.000Z",
      ),
    );
  const submitted =
    await processor.process(
      7,
      staged.deliveryKey,
    );
  const duplicate =
    await processor.process(
      7,
      staged.deliveryKey,
    );
  const delivery =
    await fixture.deliveries.find(
      7,
      staged.deliveryKey,
    );

  assert.deepEqual(
    submitted,
    { outcome: "submitted" },
  );
  assert.deepEqual(
    duplicate,
    { outcome: "duplicate" },
  );
  assert.equal(
    providerCalls.length,
    1,
  );
  assert.equal(
    providerCalls[0].requestKey,
    staged.deliveryKey,
  );
  assert.equal(
    providerCalls[0].email,
    "team.member@example.com",
  );
  assert.equal(
    delivery.status,
    "submitted",
  );
  assert.equal(
    delivery.attemptCount,
    1,
  );
});

test("records explicit provider unavailability as blocked without retry", async () => {
  const fixture =
    await createFixture();
  const staged =
    await stage(fixture);
  const processor =
    createTeamInvitationDispatchProcessor(
      fixture.deliveries,
      createUnavailableTeamInvitationProvider(),
      clock(
        "2026-08-05T10:01:00.000Z",
        "2026-08-05T10:02:00.000Z",
      ),
    );

  assert.deepEqual(
    await processor.process(
      7,
      staged.deliveryKey,
    ),
    { outcome: "blocked" },
  );
  assert.deepEqual(
    await processor.process(
      7,
      staged.deliveryKey,
    ),
    { outcome: "duplicate" },
  );
  const delivery =
    await fixture.deliveries.find(
      7,
      staged.deliveryKey,
    );

  assert.equal(
    delivery.status,
    "blocked",
  );
  assert.equal(
    delivery.lastErrorCode,
    "PROVIDER_UNAVAILABLE",
  );
});

test("records thrown and malformed provider outcomes as ambiguous", async () => {
  for (
    const provider of [
      {
        async invite() {
          throw new Error(
            "private provider failure",
          );
        },
      },
      {
        async invite() {
          return {
            status:
              "submitted",
            providerId:
              "private",
          };
        },
      },
    ]
  ) {
    const fixture =
      await createFixture();
    const staged =
      await stage(fixture);
    const processor =
      createTeamInvitationDispatchProcessor(
        fixture.deliveries,
        provider,
        clock(
          "2026-08-05T10:01:00.000Z",
          "2026-08-05T10:02:00.000Z",
        ),
      );

    assert.deepEqual(
      await processor.process(
        7,
        staged.deliveryKey,
      ),
      { outcome: "ambiguous" },
    );
    const delivery =
      await fixture.deliveries.find(
        7,
        staged.deliveryKey,
      );

    assert.equal(
      delivery.status,
      "ambiguous",
    );
    assert.equal(
      delivery.lastErrorCode,
      "PROVIDER_OUTCOME_UNKNOWN",
    );
  }
});

test("cancels an obsolete or expired delivery before provider access", async () => {
  for (
    const mode of [
      "revoked",
      "expired-by-time",
    ]
  ) {
    const fixture =
      await createFixture();
    const staged =
      await stage(fixture);

    if (mode === "revoked") {
      await fixture.invitations
        .transition({
          tenantId: 7,
          invitationKey:
            staged.invitation
              .invitationKey,
          expectedVersion: 1,
          toStatus: "revoked",
          actorExternalUserId:
            "manager-user",
          occurredAt:
            "2026-08-05T11:00:00.000Z",
        });
    }

    let providerCalls = 0;
    const processor =
      createTeamInvitationDispatchProcessor(
        fixture.deliveries,
        {
          async invite() {
            providerCalls += 1;
            return {
              status:
                "submitted",
            };
          },
        },
        clock(
          mode === "revoked"
            ? "2026-08-05T12:00:00.000Z"
            : "2026-08-12T10:00:00.000Z",
        ),
      );

    assert.deepEqual(
      await processor.process(
        7,
        staged.deliveryKey,
      ),
      { outcome: "cancelled" },
    );
    assert.equal(
      providerCalls,
      0,
    );
  }
});

test("marks a second claim ambiguous and blocks invitation transition while sending", async () => {
  const fixture =
    await createFixture();
  const staged =
    await stage(fixture);

  assert.equal(
    (
      await fixture.deliveries
        .claim(
          7,
          staged.deliveryKey,
          "2026-08-05T10:01:00.000Z",
        )
    ).outcome,
    "claimed",
  );
  await assert.rejects(
    fixture.invitations
      .transition({
        tenantId: 7,
        invitationKey:
          staged.invitation
            .invitationKey,
        expectedVersion: 1,
        toStatus: "revoked",
        actorExternalUserId:
          "manager-user",
        occurredAt:
          "2026-08-05T10:02:00.000Z",
      }),
    /persistence failed/,
  );
  const processor =
    createTeamInvitationDispatchProcessor(
      fixture.deliveries,
      {
        async invite() {
          throw new Error(
            "must not run",
          );
        },
      },
      clock(
        "2026-08-05T10:03:00.000Z",
        "2026-08-05T10:04:00.000Z",
      ),
    );

  assert.deepEqual(
    await processor.process(
      7,
      staged.deliveryKey,
    ),
    { outcome: "ambiguous" },
  );
});

test("rolls back invitation and audit when outbox staging fails", async () => {
  const fixture =
    await createFixture();

  fixture.database.exec(`
    CREATE TRIGGER reject_delivery
    BEFORE INSERT
    ON team_invitation_deliveries
    BEGIN
      SELECT RAISE(
        ABORT,
        'delivery rejected'
      );
    END
  `);

  await assert.rejects(
    fixture.invitations
      .request(requestCommand),
    /persistence failed/,
  );

  for (
    const table of [
      "team_invitations",
      "team_invitation_events",
      "team_invitation_deliveries",
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

test("database rejects invalid delivery transitions and active deletion", async () => {
  const fixture =
    await createFixture();
  const staged =
    await stage(fixture);

  assert.throws(
    () =>
      fixture.database.exec(`
        UPDATE team_invitation_deliveries
        SET status = 'submitted'
        WHERE delivery_key =
          '${staged.deliveryKey}'
      `),
    /transition is invalid|state_shape_valid/,
  );
  assert.throws(
    () =>
      fixture.database.exec(`
        DELETE FROM team_invitation_deliveries
        WHERE delivery_key =
          '${staged.deliveryKey}'
      `),
    /active team invitation deliveries cannot be deleted/,
  );
});
