import type {
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import type {
  TenantSelectionRepository,
} from "../../db/tenantSelectionRepository.ts";
import type {
  ContactService,
} from "../contacts/contactService.ts";
import type {
  OperationalReportService,
} from "../reports/operationalReportService.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import {
  createRailwayApiIdentityAdapters,
  type RailwayApiIdentityAdapterDependencies,
} from "./railwayApiIdentityAdapters.ts";
import type {
  RailwayApiIdentityEnvironment,
} from "./railwayApiIdentityConfiguration.ts";
import {
  createRailwayApiHttpHandler,
  type RailwayApiHttpHandler,
} from "./railwayApiHttpHandler.ts";
import {
  createRailwayApiOperationRegistry,
} from "./railwayApiOperationRegistry.ts";
import type {
  RailwayApiMutationExecutor,
} from "./railwayApiMutationExecutor.ts";
import {
  createRailwaySystemAdminBusinessProfileOperation,
  type RailwaySystemAdminBusinessProfileOperationDependencies,
} from "./railwaySystemAdminBusinessProfileOperation.ts";
import {
  createRailwaySystemAdminSubscriptionOperations,
  type RailwaySystemAdminSubscriptionOperationDependencies,
} from "./railwaySystemAdminSubscriptionOperations.ts";
import {
  createRailwayTenantSessionResolver,
} from "./railwayTenantSessionResolver.ts";

export interface RailwayApiRuntimeOptions {
  readonly environment?: RailwayApiIdentityEnvironment;
  readonly identityDependencies?: Readonly<RailwayApiIdentityAdapterDependencies>;
  readonly memberships: TenantMembershipRepository;
  readonly selections: TenantSelectionRepository;
  readonly contacts: Pick<ContactService, "list">;
  readonly reports: Pick<OperationalReportService, "read">;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly mutations: RailwayApiMutationExecutor;
  readonly systemAdmin?: Readonly<
    RailwaySystemAdminBusinessProfileOperationDependencies &
      RailwaySystemAdminSubscriptionOperationDependencies
  >;
  readonly maximumBodyBytes?: number;
  readonly maximumResponseBytes?: number;
}

export function createRailwayApiRuntime(
  options: Readonly<RailwayApiRuntimeOptions>,
): RailwayApiHttpHandler {
  const identity = createRailwayApiIdentityAdapters(
    options.environment,
    options.identityDependencies,
  );
  const tenantSessions = createRailwayTenantSessionResolver({
    memberships: options.memberships,
    selections: options.selections,
  });
  const operations = createRailwayApiOperationRegistry({
    tenantSessions,
    contacts: options.contacts,
    reports: options.reports,
    mutationRateLimit: options.mutationRateLimit,
    mutations: options.mutations,
  });
  const systemAdminOperation =
    options.systemAdmin === undefined
      ? []
      : [
          createRailwaySystemAdminBusinessProfileOperation(
            {
              allowedExternalUserIds:
                options.systemAdmin.allowedExternalUserIds,
              mutationRateLimit:
                options.systemAdmin.mutationRateLimit,
              businessProfiles:
                options.systemAdmin.businessProfiles,
            },
          ),
          ...createRailwaySystemAdminSubscriptionOperations(
            {
              allowedExternalUserIds:
                options.systemAdmin.allowedExternalUserIds,
              mutationRateLimit:
                options.systemAdmin.mutationRateLimit,
              subscriptions:
                options.systemAdmin.subscriptions,
            },
          ),
        ];

  return createRailwayApiHttpHandler({
    expectedServiceIdentity: identity.expectedServiceIdentity,
    oidcVerifier: identity.oidcVerifier,
    endUserSessionVerifier: identity.endUserSessionVerifier,
    operations: [
      ...operations.operations,
      ...systemAdminOperation,
    ],
    maximumBodyBytes: options.maximumBodyBytes,
    maximumResponseBytes: options.maximumResponseBytes,
  });
}
