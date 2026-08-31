import {
  createClerkClient,
} from "@clerk/backend";

import type {
  ClerkOrganizationBindingRepository,
} from "../../db/clerkOrganizationBindingRepository.ts";
import type {
  TenantId,
} from "../../shared/domain/model.ts";
import type {
  TeamInvitationRole,
} from "../../shared/domain/teamInvitation.ts";
import {
  createRateLimitGuard,
  type RateLimitGuard,
} from "../security/rateLimit.ts";
import type {
  TeamInvitationProvider,
  TeamInvitationProviderCommand,
  TeamInvitationProviderLookupCommand,
  TeamInvitationProviderLookupResult,
  TeamInvitationProviderResult,
} from "../team/teamInvitationProvider.ts";
import {
  requireTeamInvitationDeliveryKey,
  requireTeamInvitationEmail,
  requireTeamInvitationRole,
} from "../team/teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
  requireTeamTenantId,
  requireTeamTimestamp,
} from "../team/teamMembershipValidation.ts";
import {
  observeProviderRequest,
  type ProviderRequestTelemetryClock,
  type ProviderRequestTelemetryScope,
} from "../operations/providerRequestTelemetry.ts";
import type {
  RailwayApiIdentityConfiguration,
} from "./railwayApiIdentityConfiguration.ts";
import type {
  PostgresMutationRateLimitPolicy,
} from "./postgresMutationRateLimitBinding.ts";
import type {
  RailwayTeamInvitationProviderFactory,
} from "./railwayTeamInvitationProviderFactory.ts";

const CLERK_INVITATION_EXPIRY_DAYS = 3;
const LOOKUP_PAGE_SIZE = 100;
const MAXIMUM_LOOKUP_RESULTS = 500;
const CREATION_RATE_LIMIT_SUBJECT =
  "clerk-organization-invitation:create";
const CLERK_MEMBER_ROLE = "org:member";
const CLERK_INVITATION_RATE_LIMIT_POLICY =
  "clerk-organization-invitation";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const invitationStatuses = Object.freeze([
  "pending",
  "accepted",
  "revoked",
  "expired",
] as const);

interface ClerkOrganizationInvitationApi {
  createOrganizationInvitation(
    input: Readonly<{
      organizationId: string;
      emailAddress: string;
      role: string;
      expiresInDays: number;
      inviterUserId: string;
      privateMetadata: Readonly<Record<string, unknown>>;
      redirectUrl: string;
    }>,
  ): Promise<unknown>;
  getOrganizationInvitationList(
    input: Readonly<{
      organizationId: string;
      status: readonly string[];
      limit: number;
      offset: number;
    }>,
  ): Promise<unknown>;
}

interface ClerkOrganizationInvitationClient {
  readonly organizations: ClerkOrganizationInvitationApi;
}

interface ClerkInvitationProviderTelemetry {
  readonly scope: ProviderRequestTelemetryScope;
  readonly clock: ProviderRequestTelemetryClock;
}

export interface ClerkOrganizationInvitationClientFactory {
  create(configuration: Readonly<{
    publishableKey: string;
    secretKey: string;
  }>): ClerkOrganizationInvitationClient;
}

const defaultFactory: Readonly<ClerkOrganizationInvitationClientFactory> =
  Object.freeze({
    create(configuration: Readonly<{
      publishableKey: string;
      secretKey: string;
    }>) {
      return createClerkClient(configuration) as unknown as
        ClerkOrganizationInvitationClient;
    },
  });

interface NormalizedCommand {
  readonly requestKey: string;
  readonly tenantId: TenantId;
  readonly inviterExternalUserId: string;
  readonly email: string;
  readonly role: TeamInvitationRole;
  readonly requestedAt: string;
  readonly expiresAt: string;
}

interface InvitationIdentity {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly role: string;
  readonly requestKey: string;
  readonly tenantId: TenantId;
}

type DeferredProviderResult = Readonly<{
  status: "deferred";
  retryAfterSeconds: number;
}>;

type NormalizedLookupResult =
  | TeamInvitationProviderLookupResult
  | DeferredProviderResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseClerkRateLimitError(
  value: unknown,
): DeferredProviderResult | Readonly<{
  status: "unavailable";
}> | null {
  if (
    !isRecord(value) ||
    value.clerkError !== true ||
    value.status !== 429
  ) {
    return null;
  }

  if (
    !Number.isSafeInteger(
      value.retryAfter,
    ) ||
    Number(value.retryAfter) < 1 ||
    Number(value.retryAfter) > 86_400
  ) {
    return Object.freeze({
      status: "unavailable",
    });
  }

  return Object.freeze({
    status: "deferred",
    retryAfterSeconds:
      Number(value.retryAfter),
  });
}

function requireSafeIdentifier(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 255 ||
    value.trim() !== value ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    throw new Error("Clerk invitation identity is invalid");
  }
  return value;
}

function normalizeCommand(
  value: TeamInvitationProviderCommand,
): Readonly<NormalizedCommand> {
  const tenantId = requireTeamTenantId(value?.tenantId) as TenantId;
  const requestedAt = requireTeamTimestamp(value?.requestedAt);
  const expiresAt = requireTeamTimestamp(value?.expiresAt);
  const expectedExpiry =
    Date.parse(requestedAt) + CLERK_INVITATION_EXPIRY_DAYS * 86_400_000;

  if (Date.parse(expiresAt) !== expectedExpiry) {
    throw new Error("Clerk invitation expiry is invalid");
  }

  return Object.freeze({
    requestKey: requireTeamInvitationDeliveryKey(value?.requestKey),
    tenantId,
    inviterExternalUserId: requireTeamExternalUserId(
      value?.inviterExternalUserId,
    ),
    email: requireTeamInvitationEmail(value?.email),
    role: requireTeamInvitationRole(value?.role),
    requestedAt,
    expiresAt,
  });
}

function normalizeLookup(
  value: TeamInvitationProviderLookupCommand,
): Readonly<{ requestKey: string; tenantId: TenantId }> {
  return Object.freeze({
    requestKey: requireTeamInvitationDeliveryKey(value?.requestKey),
    tenantId: requireTeamTenantId(value?.tenantId) as TenantId,
  });
}

function metadataFor(
  requestKey: string,
  tenantId: TenantId,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    connectContract: "team-invitation-v1",
    connectRequestKey: requestKey,
    connectTenantId: tenantId,
  });
}

function parseMatchingInvitation(
  value: unknown,
  expected: Readonly<{
    requestKey: string;
    tenantId: TenantId;
    organizationId: string;
  }>,
): Readonly<InvitationIdentity> | null {
  if (!isRecord(value) || !isRecord(value.privateMetadata)) {
    return null;
  }

  const metadata = value.privateMetadata;
  if (metadata.connectRequestKey !== expected.requestKey) {
    return null;
  }

  if (
    Object.keys(metadata).sort().join(",") !==
      "connectContract,connectRequestKey,connectTenantId" ||
    metadata.connectContract !== "team-invitation-v1" ||
    requireTeamTenantId(metadata.connectTenantId) !== expected.tenantId ||
    requireSafeIdentifier(value.organizationId) !== expected.organizationId
  ) {
    throw new Error("Clerk invitation reconciliation evidence is invalid");
  }

  return Object.freeze({
    id: requireSafeIdentifier(value.id),
    organizationId: expected.organizationId,
    email: requireTeamInvitationEmail(value.emailAddress),
    role: requireSafeIdentifier(value.role),
    requestKey: expected.requestKey,
    tenantId: expected.tenantId,
  });
}

function parseListPage(value: unknown): Readonly<{
  data: readonly unknown[];
  totalCount: number;
}> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.data) ||
    !Number.isSafeInteger(value.totalCount) ||
    Number(value.totalCount) < value.data.length
  ) {
    throw new Error("Clerk invitation list evidence is invalid");
  }

  return Object.freeze({
    data: Object.freeze([...value.data]),
    totalCount: Number(value.totalCount),
  });
}

function sameCreatedInvitation(
  invitation: Readonly<InvitationIdentity>,
  command: Readonly<NormalizedCommand>,
): boolean {
  return (
    invitation.requestKey === command.requestKey &&
    invitation.tenantId === command.tenantId &&
    invitation.email === command.email &&
    invitation.role === CLERK_MEMBER_ROLE
  );
}

function requireCreationPolicy(
  value: Readonly<PostgresMutationRateLimitPolicy>,
): Readonly<PostgresMutationRateLimitPolicy> {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).sort().join(",") !==
      "capacity,policyId,policyVersion,refillPeriodSeconds" ||
    value.policyId !== CLERK_INVITATION_RATE_LIMIT_POLICY ||
    !Number.isSafeInteger(value.policyVersion) ||
    value.policyVersion < 1 ||
    !Number.isSafeInteger(value.capacity) ||
    value.capacity < 1 ||
    value.capacity > 125 ||
    !Number.isSafeInteger(value.refillPeriodSeconds) ||
    value.refillPeriodSeconds < 3_600 ||
    value.refillPeriodSeconds > 86_400
  ) {
    throw new Error("Clerk invitation rate-limit policy is invalid");
  }

  return Object.freeze({ ...value });
}

export function createClerkRailwayTeamInvitationProviderFactory(
  configuration: Readonly<RailwayApiIdentityConfiguration>,
  creationPolicy: Readonly<PostgresMutationRateLimitPolicy>,
  factory: Readonly<ClerkOrganizationInvitationClientFactory> = defaultFactory,
): RailwayTeamInvitationProviderFactory {
  const policy = requireCreationPolicy(creationPolicy);

  return Object.freeze((dependencies) => {
    if (
      !dependencies ||
      typeof dependencies !== "object" ||
      Object.keys(dependencies).sort().join(",") !==
        "createMutationRateLimitBinding,identityOrganizations,providerRequestTelemetry,telemetryClock" ||
      typeof dependencies.createMutationRateLimitBinding !== "function" ||
      typeof dependencies.identityOrganizations?.findByTenantId !== "function" ||
      typeof dependencies.providerRequestTelemetry?.record !== "function" ||
      typeof dependencies.telemetryClock?.now !== "function"
    ) {
      throw new Error("Clerk invitation provider foundation is invalid");
    }

    const binding = dependencies.createMutationRateLimitBinding(policy);
    const guard = createRateLimitGuard(
      binding,
      CLERK_INVITATION_RATE_LIMIT_POLICY,
    );

    return createClerkRailwayTeamInvitationProvider(
      configuration,
      dependencies.identityOrganizations,
      guard,
      factory,
      Object.freeze({
        scope: dependencies.providerRequestTelemetry,
        clock: dependencies.telemetryClock,
      }),
    );
  });
}

export function createClerkRailwayTeamInvitationProvider(
  configuration: Readonly<RailwayApiIdentityConfiguration>,
  bindings: Pick<ClerkOrganizationBindingRepository, "findByTenantId">,
  creationRateLimit: Pick<RateLimitGuard, "consume">,
  factory: Readonly<ClerkOrganizationInvitationClientFactory> = defaultFactory,
  telemetry?: Readonly<ClerkInvitationProviderTelemetry>,
): Readonly<TeamInvitationProvider> {
  if (
    typeof configuration?.clerkPublishableKey !== "string" ||
    configuration.clerkPublishableKey.length === 0 ||
    typeof configuration.clerkSecretKey !== "string" ||
    configuration.clerkSecretKey.length === 0 ||
    typeof configuration.appPublicOrigin !== "string" ||
    configuration.appPublicOrigin.length === 0 ||
    typeof bindings?.findByTenantId !== "function" ||
    typeof creationRateLimit?.consume !== "function" ||
    typeof factory?.create !== "function" ||
    (telemetry !== undefined && (
      typeof telemetry.scope?.record !== "function" ||
      typeof telemetry.clock?.now !== "function"
    ))
  ) {
    throw new Error("Clerk invitation provider is unavailable");
  }

  const client = factory.create({
    publishableKey: configuration.clerkPublishableKey,
    secretKey: configuration.clerkSecretKey,
  });
  if (
    typeof client?.organizations?.createOrganizationInvitation !==
      "function" ||
    typeof client.organizations.getOrganizationInvitationList !== "function"
  ) {
    throw new Error("Clerk invitation provider is unavailable");
  }

  async function resolveOrganizationId(tenantId: TenantId) {
    const binding = await bindings.findByTenantId(tenantId);
    if (binding === null || binding.tenantId !== tenantId) {
      return null;
    }
    return requireSafeIdentifier(binding.externalOrganizationId);
  }

  async function lookupNormalized(
    command: Readonly<{ requestKey: string; tenantId: TenantId }>,
  ): Promise<NormalizedLookupResult> {
    let organizationId: string | null;
    try {
      organizationId = await resolveOrganizationId(command.tenantId);
    } catch {
      return Object.freeze({ status: "unavailable" });
    }
    if (organizationId === null) {
      return Object.freeze({ status: "unavailable" });
    }

    let offset = 0;
    while (offset < MAXIMUM_LOOKUP_RESULTS) {
      let page;
      try {
        const request = () =>
          client.organizations.getOrganizationInvitationList({
            organizationId,
            status: [...invitationStatuses],
            limit: LOOKUP_PAGE_SIZE,
            offset,
          });
        page = parseListPage(
          telemetry === undefined
            ? await request()
            : await observeProviderRequest(
                telemetry.scope,
                telemetry.clock,
                Object.freeze({
                  provider: "clerk",
                  operation: "organization-invitation.list",
                }),
                request,
              ),
        );
      } catch (error) {
        return parseClerkRateLimitError(
          error,
        ) ?? Object.freeze({ status: "unavailable" });
      }

      for (const candidate of page.data) {
        try {
          if (
            parseMatchingInvitation(candidate, {
              ...command,
              organizationId,
            }) !== null
          ) {
            return Object.freeze({ status: "submitted" });
          }
        } catch {
          return Object.freeze({ status: "unavailable" });
        }
      }

      const nextOffset = offset + page.data.length;
      if (nextOffset >= page.totalCount) {
        return Object.freeze({ status: "not-found" });
      }
      if (page.data.length === 0 || nextOffset > MAXIMUM_LOOKUP_RESULTS) {
        return Object.freeze({ status: "unavailable" });
      }
      offset = nextOffset;
    }

    return Object.freeze({ status: "unavailable" });
  }

  return Object.freeze({
    isConfigured() {
      return true;
    },

    async lookup(
      value: TeamInvitationProviderLookupCommand,
    ): Promise<TeamInvitationProviderLookupResult> {
      let command;
      try {
        command = normalizeLookup(value);
      } catch {
        return Object.freeze({ status: "unavailable" });
      }
      const result =
        await lookupNormalized(
          command,
        );

      return result.status ===
        "deferred"
        ? Object.freeze({
            status: "unavailable",
          })
        : result;
    },

    async invite(
      value: TeamInvitationProviderCommand,
    ): Promise<TeamInvitationProviderResult> {
      let command;
      try {
        command = normalizeCommand(value);
      } catch {
        return Object.freeze({ status: "unavailable" });
      }

      const existing = await lookupNormalized(command);
      if (existing.status === "submitted") {
        return Object.freeze({ status: "already-pending" });
      }
      if (existing.status === "deferred") {
        return existing;
      }
      if (existing.status !== "not-found") {
        return Object.freeze({ status: "unavailable" });
      }

      let rateLimitDecision;
      try {
        rateLimitDecision = await creationRateLimit.consume(
          CREATION_RATE_LIMIT_SUBJECT,
        );
      } catch {
        return Object.freeze({ status: "unavailable" });
      }
      if (rateLimitDecision.outcome !== "allowed") {
        return Object.freeze({ status: "unavailable" });
      }

      const organizationId = await resolveOrganizationId(command.tenantId);
      if (organizationId === null) {
        return Object.freeze({ status: "unavailable" });
      }
      let created: unknown;
      try {
        const request = () =>
          client.organizations.createOrganizationInvitation({
          organizationId,
          emailAddress: command.email,
          role: CLERK_MEMBER_ROLE,
          expiresInDays: CLERK_INVITATION_EXPIRY_DAYS,
          inviterUserId: command.inviterExternalUserId,
          privateMetadata: metadataFor(command.requestKey, command.tenantId),
          redirectUrl: configuration.appPublicOrigin,
        });
        created = telemetry === undefined
          ? await request()
          : await observeProviderRequest(
              telemetry.scope,
              telemetry.clock,
              Object.freeze({
                provider: "clerk",
                operation: "organization-invitation.create",
              }),
              request,
            );
      } catch (error) {
        const rateLimit =
          parseClerkRateLimitError(
            error,
          );

        if (rateLimit !== null) {
          return rateLimit;
        }

        throw error;
      }
      const parsed = parseMatchingInvitation(created, {
        requestKey: command.requestKey,
        tenantId: command.tenantId,
        organizationId,
      });
      if (parsed === null || !sameCreatedInvitation(parsed, command)) {
        throw new Error("Clerk invitation creation evidence is invalid");
      }

      return Object.freeze({ status: "submitted" });
    },
  });
}
