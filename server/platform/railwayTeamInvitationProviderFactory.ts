import type {
  ClerkOrganizationBindingRepository,
} from "../../db/clerkOrganizationBindingRepository.ts";
import type {
  RateLimitBinding,
} from "../security/rateLimit.ts";
import type {
  TeamInvitationProvider,
} from "../team/teamInvitationProvider.ts";
import type {
  PostgresMutationRateLimitPolicy,
} from "./postgresMutationRateLimitBinding.ts";
import type {
  ProviderRequestTelemetryClock,
  ProviderRequestTelemetryScope,
} from "../operations/providerRequestTelemetry.ts";

export interface RailwayTeamInvitationProviderFactoryDependencies {
  readonly identityOrganizations: Pick<
    ClerkOrganizationBindingRepository,
    "findByTenantId"
  >;
  readonly createMutationRateLimitBinding: (
    policy: Readonly<PostgresMutationRateLimitPolicy>,
  ) => Readonly<RateLimitBinding>;
  readonly providerRequestTelemetry: ProviderRequestTelemetryScope;
  readonly telemetryClock: ProviderRequestTelemetryClock;
}

export type RailwayTeamInvitationProviderFactory = (
  dependencies: Readonly<
    RailwayTeamInvitationProviderFactoryDependencies
  >,
) => Readonly<TeamInvitationProvider>;
