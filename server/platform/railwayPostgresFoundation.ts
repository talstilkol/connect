import {
  createNodePostgresPool,
  inspectNodePostgresPoolConfiguration,
  type NodePostgresPoolEnvironment,
  type NodePostgresPoolTelemetry,
} from "./nodePostgresPoolConfiguration.ts";
import {
  createNodePostgresQueryExecutor,
  createNodePostgresTransactionManager,
} from "./nodePostgresAdapter.ts";
import {
  createContactListService,
} from "../contacts/contactService.ts";
import {
  createOperationalReportService,
} from "../reports/operationalReportService.ts";
import {
  createPostgresBusinessProfileRepository,
} from "./postgresBusinessProfileRepository.ts";
import {
  createPostgresContactReadRepository,
} from "./postgresContactReadRepository.ts";
import {
  createPostgresOperationalReportRepository,
} from "./postgresOperationalReportRepository.ts";
import {
  createPostgresRailwayApiMutationExecutor,
} from "./postgresRailwayApiMutationExecutor.ts";
import {
  createPostgresTeamInvitationAcceptanceRepository,
} from "./postgresTeamInvitationAcceptanceRepository.ts";
import {
  createPostgresTeamInvitationDeliveryRepository,
} from "./postgresTeamInvitationDeliveryRepository.ts";
import {
  createPostgresTeamInvitationExpirationRepository,
} from "./postgresTeamInvitationExpirationRepository.ts";
import {
  createPostgresTeamInvitationRepository,
} from "./postgresTeamInvitationRepository.ts";
import {
  createPostgresTenantMembershipMutationRepository,
} from "./postgresTenantMembershipMutationRepository.ts";
import {
  createPostgresTenantMembershipRepository,
} from "./postgresTenantMembershipRepository.ts";
import {
  createPostgresTenantSelectionRepository,
} from "./postgresTenantSelectionRepository.ts";

export type RailwayPostgresFoundationErrorCode =
  | "configuration-disabled"
  | "configuration-incomplete"
  | "configuration-invalid"
  | "options-invalid";

export class RailwayPostgresFoundationError extends Error {
  readonly code: RailwayPostgresFoundationErrorCode;

  constructor(code: RailwayPostgresFoundationErrorCode) {
    super(`Railway PostgreSQL foundation failed: ${code}`);
    this.name = "RailwayPostgresFoundationError";
    this.code = code;
  }
}

export interface RailwayPostgresFoundationOptions {
  readonly environment?: NodePostgresPoolEnvironment;
  readonly telemetry: NodePostgresPoolTelemetry;
}

export interface RailwayPostgresFoundation {
  readonly contacts: ReturnType<typeof createContactListService>;
  readonly reports: ReturnType<typeof createOperationalReportService>;
  readonly memberships: ReturnType<
    typeof createPostgresTenantMembershipRepository
  >;
  readonly membershipMutations: ReturnType<
    typeof createPostgresTenantMembershipMutationRepository
  >;
  readonly selections: ReturnType<
    typeof createPostgresTenantSelectionRepository
  >;
  readonly businessProfiles: ReturnType<
    typeof createPostgresBusinessProfileRepository
  >;
  readonly railwayApiMutations: ReturnType<
    typeof createPostgresRailwayApiMutationExecutor
  >;
  readonly invitations: ReturnType<
    typeof createPostgresTeamInvitationRepository
  >;
  readonly invitationExpirations: ReturnType<
    typeof createPostgresTeamInvitationExpirationRepository
  >;
  readonly invitationDeliveries: ReturnType<
    typeof createPostgresTeamInvitationDeliveryRepository
  >;
  readonly invitationAcceptances: ReturnType<
    typeof createPostgresTeamInvitationAcceptanceRepository
  >;
  readonly close: () => Promise<void>;
}

function requireOptions(
  options: Readonly<RailwayPostgresFoundationOptions>,
): void {
  if (!options || typeof options !== "object") {
    throw new RailwayPostgresFoundationError("options-invalid");
  }

  const keys = Object.keys(options).sort();
  const expectedKeys = options.environment === undefined
    ? ["telemetry"]
    : ["environment", "telemetry"];

  if (
    JSON.stringify(keys) !== JSON.stringify(expectedKeys) ||
    !options.telemetry ||
    typeof options.telemetry.recordIdleClientError !== "function"
  ) {
    throw new RailwayPostgresFoundationError("options-invalid");
  }
}

function configurationError(
  status: "disabled" | "incomplete" | "invalid",
): RailwayPostgresFoundationError {
  return new RailwayPostgresFoundationError(
    status === "disabled"
      ? "configuration-disabled"
      : status === "incomplete"
        ? "configuration-incomplete"
        : "configuration-invalid",
  );
}

export function createRailwayPostgresFoundation(
  options: Readonly<RailwayPostgresFoundationOptions>,
): Readonly<RailwayPostgresFoundation> {
  requireOptions(options);
  const configurationState = inspectNodePostgresPoolConfiguration(
    options.environment,
  );

  if (configurationState.status !== "configured") {
    throw configurationError(configurationState.status);
  }

  const pool = createNodePostgresPool(
    configurationState.configuration,
    options.telemetry,
  );
  const queries = createNodePostgresQueryExecutor(pool);
  const transactions = createNodePostgresTransactionManager(pool);
  const contactReads = createPostgresContactReadRepository(queries);
  let closed = false;

  return Object.freeze({
    contacts: createContactListService({ contacts: contactReads }),
    reports: createOperationalReportService(
      createPostgresOperationalReportRepository(queries),
    ),
    memberships: createPostgresTenantMembershipRepository(queries),
    membershipMutations:
      createPostgresTenantMembershipMutationRepository({
        queries,
        transactions,
      }),
    selections: createPostgresTenantSelectionRepository({
      queries,
      transactions,
    }),
    businessProfiles: createPostgresBusinessProfileRepository({
      queries,
      transactions,
    }),
    railwayApiMutations:
      createPostgresRailwayApiMutationExecutor(transactions),
    invitations: createPostgresTeamInvitationRepository({
      queries,
      transactions,
    }),
    invitationExpirations:
      createPostgresTeamInvitationExpirationRepository({ queries }),
    invitationDeliveries:
      createPostgresTeamInvitationDeliveryRepository({ queries }),
    invitationAcceptances:
      createPostgresTeamInvitationAcceptanceRepository({ transactions }),
    async close() {
      if (closed) {
        return;
      }

      closed = true;
      await pool.end();
    },
  });
}
