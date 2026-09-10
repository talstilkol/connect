import {
  createHash,
} from "node:crypto";

import type {
  BotReplyStagingLiveSafetySnapshot,
} from "../operations/botReplyStagingLiveDriver.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const eventKeyPattern =
  /^bot_reply_staging_authorization_v1_[a-f0-9]{64}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const unsafeControlCharacters = /[\u0000-\u001f\u007f]/;

const eventRowKeys = Object.freeze([
  "actorExternalUserId",
  "authorizationVersion",
  "connectionMode",
  "connectionVersion",
  "createdAt",
  "environment",
  "eventKey",
  "policyVersion",
  "rateLimitApprovedAt",
  "rateLimitApprovedBy",
  "rateLimitExpiresAt",
  "rateLimitMethodFingerprint",
  "recipientExpiresAt",
  "recipientFingerprint",
  "recipientOptInRecorded",
  "recipientOptInRecordedAt",
  "recordedAt",
  "status",
  "tenantId",
]);

const safetyRowKeys = Object.freeze([
  "approvedAt",
  "approvedBy",
  "connectionMode",
  "connectionStatus",
  "connectionVersion",
  "credentialSource",
  "deliveryState",
  "environment",
  "evidenceSource",
  "executionBoundary",
  "graphApiVersion",
  "methodFingerprint",
  "optInRecorded",
  "policyEvidenceExpiresAt",
  "policyVersion",
  "rateLimitExpiresAt",
  "rateLimitStatus",
  "recipientExpiresAt",
  "recipientFingerprint",
  "recipientStatus",
]);

const eventColumns = `
  event_key AS "eventKey",
  tenant_id AS "tenantId",
  authorization_version AS "authorizationVersion",
  status,
  environment,
  connection_mode AS "connectionMode",
  connection_version AS "connectionVersion",
  policy_version AS "policyVersion",
  recipient_fingerprint AS "recipientFingerprint",
  recipient_opt_in_recorded AS "recipientOptInRecorded",
  recipient_opt_in_recorded_at AS "recipientOptInRecordedAt",
  recipient_expires_at AS "recipientExpiresAt",
  rate_limit_approved_by AS "rateLimitApprovedBy",
  rate_limit_approved_at AS "rateLimitApprovedAt",
  rate_limit_expires_at AS "rateLimitExpiresAt",
  rate_limit_method_fingerprint AS "rateLimitMethodFingerprint",
  actor_external_user_id AS "actorExternalUserId",
  recorded_at AS "recordedAt",
  created_at AS "createdAt"
`;

export const postgresBotReplyStagingSafetySql = Object.freeze({
  insert: `
    INSERT INTO bot_reply_staging_authorization_events (
      event_key,
      tenant_id,
      authorization_version,
      status,
      environment,
      connection_mode,
      connection_version,
      policy_version,
      recipient_fingerprint,
      recipient_opt_in_recorded,
      recipient_opt_in_recorded_at,
      recipient_expires_at,
      rate_limit_approved_by,
      rate_limit_approved_at,
      rate_limit_expires_at,
      rate_limit_method_fingerprint,
      actor_external_user_id,
      recorded_at,
      created_at
    ) VALUES (
      $1, $2, $3, $4, 'staging', 'approved-staging-waba',
      $5, $6, $7, TRUE, $8::timestamptz, $9::timestamptz,
      'tal', $10::timestamptz, $11::timestamptz, $12, $13,
      $14::timestamptz, $14::timestamptz
    )
    ON CONFLICT DO NOTHING
    RETURNING ${eventColumns}
  `,
  findByEventKey: `
    SELECT ${eventColumns}
    FROM bot_reply_staging_authorization_events
    WHERE event_key = $1
    LIMIT 1
  `,
  findLatest: `
    SELECT ${eventColumns}
    FROM bot_reply_staging_authorization_events
    WHERE tenant_id = $1
    ORDER BY authorization_version DESC
    LIMIT 1
  `,
  readCurrent: `
    SELECT
      safety_event.environment,
      safety_event.connection_mode AS "connectionMode",
      connection.status AS "connectionStatus",
      safety_event.connection_version AS "connectionVersion",
      safety_event.policy_version AS "policyVersion",
      policy.delivery_state AS "deliveryState",
      policy.evidence_expires_at AS "policyEvidenceExpiresAt",
      policy.meta_graph_api_version AS "graphApiVersion",
      'encrypted-vault' AS "credentialSource",
      'railway-bullmq-bot-reply-worker' AS "executionBoundary",
      'durable-postgres' AS "evidenceSource",
      safety_event.status AS "recipientStatus",
      safety_event.recipient_opt_in_recorded AS "optInRecorded",
      safety_event.recipient_expires_at AS "recipientExpiresAt",
      safety_event.recipient_fingerprint AS "recipientFingerprint",
      safety_event.status AS "rateLimitStatus",
      safety_event.rate_limit_approved_by AS "approvedBy",
      safety_event.rate_limit_approved_at AS "approvedAt",
      safety_event.rate_limit_expires_at AS "rateLimitExpiresAt",
      safety_event.rate_limit_method_fingerprint AS "methodFingerprint"
    FROM bot_reply_staging_authorization_events AS safety_event
    INNER JOIN meta_connections AS connection
      ON connection.tenant_id = safety_event.tenant_id
    INNER JOIN whatsapp_campaign_delivery_policy_events AS policy
      ON policy.tenant_id = safety_event.tenant_id
      AND policy.policy_version = safety_event.policy_version
    INNER JOIN meta_credential_envelopes AS credential
      ON credential.tenant_id = safety_event.tenant_id
    WHERE safety_event.tenant_id = $1
      AND safety_event.authorization_version = (
        SELECT max(latest.authorization_version)
        FROM bot_reply_staging_authorization_events AS latest
        WHERE latest.tenant_id = safety_event.tenant_id
      )
      AND safety_event.status = 'approved'
      AND safety_event.environment = 'staging'
      AND safety_event.connection_mode = 'approved-staging-waba'
      AND safety_event.recipient_opt_in_recorded
      AND safety_event.recipient_opt_in_recorded_at <= $2::timestamptz
      AND $2::timestamptz < safety_event.recipient_expires_at
      AND safety_event.rate_limit_approved_by = 'tal'
      AND safety_event.rate_limit_approved_at <= $2::timestamptz
      AND $2::timestamptz < safety_event.rate_limit_expires_at
      AND connection.status = 'connected'
      AND connection.version = safety_event.connection_version
      AND policy.connection_version = safety_event.connection_version
      AND policy.policy_version = (
        SELECT max(latest_policy.policy_version)
        FROM whatsapp_campaign_delivery_policy_events AS latest_policy
        WHERE latest_policy.tenant_id = safety_event.tenant_id
      )
      AND policy.delivery_state = 'enabled'
      AND policy.evidence_checked_at <= $2::timestamptz
      AND policy.recorded_at <= $2::timestamptz
      AND $2::timestamptz < policy.evidence_expires_at
    LIMIT 1
  `,
});

export type BotReplyStagingAuthorizationStatus = "approved" | "revoked";

export interface RecordBotReplyStagingAuthorizationCommand {
  readonly tenantId: number;
  readonly authorizationVersion: number;
  readonly status: BotReplyStagingAuthorizationStatus;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly recipientFingerprint: string;
  readonly recipientOptInRecordedAt: string;
  readonly recipientExpiresAt: string;
  readonly rateLimitApprovedAt: string;
  readonly rateLimitExpiresAt: string;
  readonly rateLimitMethodFingerprint: string;
  readonly actorExternalUserId: string;
  readonly recordedAt: string;
}

export interface BotReplyStagingAuthorizationEvent
  extends RecordBotReplyStagingAuthorizationCommand {
  readonly eventKey: string;
  readonly environment: "staging";
  readonly connectionMode: "approved-staging-waba";
  readonly recipientOptInRecorded: true;
  readonly rateLimitApprovedBy: "tal";
  readonly createdAt: string;
}

export interface PostgresBotReplyStagingSafetyDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly clock?: Readonly<{ now(): Date }>;
}

function requirePositiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error(`${label} is invalid`);
  }
  return Number(value);
}

function requireFingerprint(value: unknown, label: string): string {
  if (typeof value !== "string" || !fingerprintPattern.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function requireTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length > 40) {
    throw new Error(`${label} is invalid`);
  }
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function requireActor(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 255 ||
    value.trim() !== value ||
    unsafeControlCharacters.test(value)
  ) {
    throw new Error("actorExternalUserId is invalid");
  }
  return value;
}

function requireCommand(
  value: Readonly<RecordBotReplyStagingAuthorizationCommand>,
): Readonly<RecordBotReplyStagingAuthorizationCommand> {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).sort().join(",") !== [
      "actorExternalUserId",
      "authorizationVersion",
      "connectionVersion",
      "policyVersion",
      "rateLimitApprovedAt",
      "rateLimitExpiresAt",
      "rateLimitMethodFingerprint",
      "recipientExpiresAt",
      "recipientFingerprint",
      "recipientOptInRecordedAt",
      "recordedAt",
      "status",
      "tenantId",
    ].sort().join(",") ||
    (value.status !== "approved" && value.status !== "revoked")
  ) {
    throw new Error("Bot reply staging authorization command is invalid");
  }

  const normalized = Object.freeze({
    tenantId: requirePositiveInteger(value.tenantId, "tenantId"),
    authorizationVersion: requirePositiveInteger(
      value.authorizationVersion,
      "authorizationVersion",
    ),
    status: value.status,
    connectionVersion: requirePositiveInteger(
      value.connectionVersion,
      "connectionVersion",
    ),
    policyVersion: requirePositiveInteger(value.policyVersion, "policyVersion"),
    recipientFingerprint: requireFingerprint(
      value.recipientFingerprint,
      "recipientFingerprint",
    ),
    recipientOptInRecordedAt: requireTimestamp(
      value.recipientOptInRecordedAt,
      "recipientOptInRecordedAt",
    ),
    recipientExpiresAt: requireTimestamp(
      value.recipientExpiresAt,
      "recipientExpiresAt",
    ),
    rateLimitApprovedAt: requireTimestamp(
      value.rateLimitApprovedAt,
      "rateLimitApprovedAt",
    ),
    rateLimitExpiresAt: requireTimestamp(
      value.rateLimitExpiresAt,
      "rateLimitExpiresAt",
    ),
    rateLimitMethodFingerprint: requireFingerprint(
      value.rateLimitMethodFingerprint,
      "rateLimitMethodFingerprint",
    ),
    actorExternalUserId: requireActor(value.actorExternalUserId),
    recordedAt: requireTimestamp(value.recordedAt, "recordedAt"),
  });

  const recordedAt = Date.parse(normalized.recordedAt);
  const recipientRecordedAt = Date.parse(normalized.recipientOptInRecordedAt);
  const recipientExpiresAt = Date.parse(normalized.recipientExpiresAt);
  const approvedAt = Date.parse(normalized.rateLimitApprovedAt);
  const approvalExpiresAt = Date.parse(normalized.rateLimitExpiresAt);
  if (
    recipientRecordedAt > recordedAt ||
    recipientRecordedAt >= recipientExpiresAt ||
    approvedAt > recordedAt ||
    approvedAt >= approvalExpiresAt ||
    (normalized.status === "approved" &&
      (recordedAt >= recipientExpiresAt || recordedAt >= approvalExpiresAt))
  ) {
    throw new Error("Bot reply staging authorization timeline is invalid");
  }

  return normalized;
}

export function deriveBotReplyStagingAuthorizationEventKey(
  command: Readonly<RecordBotReplyStagingAuthorizationCommand>,
): string {
  const normalized = requireCommand(command);
  const digest = createHash("sha256").update(JSON.stringify(normalized))
    .digest("hex");
  return `bot_reply_staging_authorization_v1_${digest}`;
}

function parseEventRow(value: unknown): BotReplyStagingAuthorizationEvent {
  const row = requireExactPostgresRow(value, eventRowKeys);
  const status = row.status === "approved" || row.status === "revoked"
    ? row.status
    : null;
  if (
    status === null ||
    row.environment !== "staging" ||
    row.connectionMode !== "approved-staging-waba" ||
    row.recipientOptInRecorded !== true ||
    row.rateLimitApprovedBy !== "tal"
  ) {
    throw new Error("PostgreSQL returned invalid staging authorization scope");
  }

  const event = Object.freeze({
    eventKey: typeof row.eventKey === "string" &&
        eventKeyPattern.test(row.eventKey)
      ? row.eventKey
      : "",
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    authorizationVersion: parsePostgresPositiveInteger(
      row.authorizationVersion,
    ),
    status,
    environment: row.environment,
    connectionMode: row.connectionMode,
    connectionVersion: parsePostgresPositiveInteger(row.connectionVersion),
    policyVersion: parsePostgresPositiveInteger(row.policyVersion),
    recipientFingerprint: requireFingerprint(
      row.recipientFingerprint,
      "recipientFingerprint",
    ),
    recipientOptInRecorded: row.recipientOptInRecorded,
    recipientOptInRecordedAt: parsePostgresTimestamp(
      row.recipientOptInRecordedAt,
    ),
    recipientExpiresAt: parsePostgresTimestamp(row.recipientExpiresAt),
    rateLimitApprovedBy: row.rateLimitApprovedBy,
    rateLimitApprovedAt: parsePostgresTimestamp(row.rateLimitApprovedAt),
    rateLimitExpiresAt: parsePostgresTimestamp(row.rateLimitExpiresAt),
    rateLimitMethodFingerprint: requireFingerprint(
      row.rateLimitMethodFingerprint,
      "rateLimitMethodFingerprint",
    ),
    actorExternalUserId: requireActor(row.actorExternalUserId),
    recordedAt: parsePostgresTimestamp(row.recordedAt),
    createdAt: parsePostgresTimestamp(row.createdAt),
  });
  if (event.eventKey.length === 0) {
    throw new Error("PostgreSQL returned invalid staging authorization key");
  }
  const command = Object.freeze({
    tenantId: event.tenantId,
    authorizationVersion: event.authorizationVersion,
    status: event.status,
    connectionVersion: event.connectionVersion,
    policyVersion: event.policyVersion,
    recipientFingerprint: event.recipientFingerprint,
    recipientOptInRecordedAt: event.recipientOptInRecordedAt,
    recipientExpiresAt: event.recipientExpiresAt,
    rateLimitApprovedAt: event.rateLimitApprovedAt,
    rateLimitExpiresAt: event.rateLimitExpiresAt,
    rateLimitMethodFingerprint: event.rateLimitMethodFingerprint,
    actorExternalUserId: event.actorExternalUserId,
    recordedAt: event.recordedAt,
  });
  if (
    event.eventKey !== deriveBotReplyStagingAuthorizationEventKey(command) ||
    event.createdAt !== event.recordedAt
  ) {
    throw new Error("PostgreSQL returned conflicting staging authorization");
  }
  return event;
}

function parseSafetyRow(value: unknown): BotReplyStagingLiveSafetySnapshot {
  const row = requireExactPostgresRow(value, safetyRowKeys);
  if (
    row.environment !== "staging" ||
    row.connectionMode !== "approved-staging-waba" ||
    row.connectionStatus !== "connected" ||
    row.deliveryState !== "enabled" ||
    row.credentialSource !== "encrypted-vault" ||
    row.executionBoundary !== "railway-bullmq-bot-reply-worker" ||
    row.evidenceSource !== "durable-postgres" ||
    row.recipientStatus !== "approved" ||
    row.optInRecorded !== true ||
    row.rateLimitStatus !== "approved" ||
    row.approvedBy !== "tal" ||
    typeof row.graphApiVersion !== "string" ||
    !/^v[1-9][0-9]{0,2}\.0$/.test(row.graphApiVersion)
  ) {
    throw new Error("PostgreSQL returned invalid staging safety evidence");
  }

  return Object.freeze({
    environment: row.environment,
    connectionMode: row.connectionMode,
    connectionStatus: row.connectionStatus,
    connectionVersion: parsePostgresPositiveInteger(row.connectionVersion),
    policyVersion: parsePostgresPositiveInteger(row.policyVersion),
    deliveryState: row.deliveryState,
    policyEvidenceExpiresAt: parsePostgresTimestamp(
      row.policyEvidenceExpiresAt,
    ),
    graphApiVersion: row.graphApiVersion,
    credentialSource: row.credentialSource,
    executionBoundary: row.executionBoundary,
    evidenceSource: row.evidenceSource,
    recipientAuthorization: Object.freeze({
      status: row.recipientStatus,
      optInRecorded: row.optInRecorded,
      expiresAt: parsePostgresTimestamp(row.recipientExpiresAt),
      recipientFingerprint: requireFingerprint(
        row.recipientFingerprint,
        "recipientFingerprint",
      ),
    }),
    rateLimitTestApproval: Object.freeze({
      status: row.rateLimitStatus,
      approvedBy: row.approvedBy,
      approvedAt: parsePostgresTimestamp(row.approvedAt),
      expiresAt: parsePostgresTimestamp(row.rateLimitExpiresAt),
      methodFingerprint: requireFingerprint(
        row.methodFingerprint,
        "methodFingerprint",
      ),
    }),
  });
}

function currentTimestamp(
  clock: Readonly<{ now(): Date }>,
): string {
  const value = clock.now();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("Bot reply staging safety clock is invalid");
  }
  return value.toISOString();
}

export function createPostgresBotReplyStagingSafetyRepository(
  dependencies: Readonly<PostgresBotReplyStagingSafetyDependencies>,
) {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    typeof dependencies.queries?.query !== "function" ||
    (dependencies.clock !== undefined &&
      typeof dependencies.clock?.now !== "function") ||
    Object.keys(dependencies).some(
      (key) => key !== "queries" && key !== "clock",
    )
  ) {
    throw new Error("PostgreSQL Bot reply staging safety dependencies invalid");
  }
  const clock = dependencies.clock ?? Object.freeze({
    now: () => new Date(),
  });

  return Object.freeze({
    async findLatest(
      targetTenantId: number,
    ): Promise<Readonly<BotReplyStagingAuthorizationEvent> | null> {
      const tenantId = requirePositiveInteger(targetTenantId, "tenantId");
      const rows = requirePostgresRows(await dependencies.queries.query(
        postgresBotReplyStagingSafetySql.findLatest,
        [tenantId],
      ), 1);
      return rows.length === 0 ? null : parseEventRow(rows[0]);
    },

    async record(
      command: Readonly<RecordBotReplyStagingAuthorizationCommand>,
    ): Promise<Readonly<BotReplyStagingAuthorizationEvent>> {
      const normalized = requireCommand(command);
      const eventKey = deriveBotReplyStagingAuthorizationEventKey(normalized);
      const rows = requirePostgresRows(await dependencies.queries.query(
        postgresBotReplyStagingSafetySql.insert,
        [
          eventKey,
          normalized.tenantId,
          normalized.authorizationVersion,
          normalized.status,
          normalized.connectionVersion,
          normalized.policyVersion,
          normalized.recipientFingerprint,
          normalized.recipientOptInRecordedAt,
          normalized.recipientExpiresAt,
          normalized.rateLimitApprovedAt,
          normalized.rateLimitExpiresAt,
          normalized.rateLimitMethodFingerprint,
          normalized.actorExternalUserId,
          normalized.recordedAt,
        ],
      ), 1);
      if (rows.length === 1) {
        return parseEventRow(rows[0]);
      }
      const existingRows = requirePostgresRows(
        await dependencies.queries.query(
          postgresBotReplyStagingSafetySql.findByEventKey,
          [eventKey],
        ),
        1,
      );
      if (existingRows.length !== 1) {
        throw new Error("PostgreSQL staging authorization conflicts");
      }
      return parseEventRow(existingRows[0]);
    },

    async read(
      targetTenantId: number,
    ): Promise<Readonly<BotReplyStagingLiveSafetySnapshot> | null> {
      const tenantId = requirePositiveInteger(targetTenantId, "tenantId");
      const checkedAt = currentTimestamp(clock);
      const rows = requirePostgresRows(await dependencies.queries.query(
        postgresBotReplyStagingSafetySql.readCurrent,
        [tenantId, checkedAt],
      ), 1);
      return rows.length === 0 ? null : parseSafetyRow(rows[0]);
    },
  });
}
