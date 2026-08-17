import type {
  Permission,
} from "../../shared/domain/model.ts";
import type {
  ContactService,
} from "../contacts/contactService.ts";
import {
  ContactCursorInputError,
} from "../contacts/contactService.ts";
import {
  toContactRecord,
} from "../contacts/contactRecordMapper.ts";
import type {
  OperationalReportService,
} from "../reports/operationalReportService.ts";
import {
  OperationalReportInputError,
  validateOperationalReportInput,
} from "../reports/operationalReportService.ts";
import {
  requireTenantPermission,
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";
import type {
  RailwayApiJsonObject,
  RailwayApiRequestKind,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import type {
  RailwayTenantSessionResolver,
} from "./railwayTenantSessionResolver.ts";

export interface RailwayApiOperationPolicy {
  readonly id: string;
  readonly requestKind: RailwayApiRequestKind;
  readonly permission: Permission | null;
}

export const railwayApiOperationPolicies = Object.freeze([
  Object.freeze({
    id: "workspace.context.read",
    requestKind: "query" as const,
    permission: null,
  }),
  Object.freeze({
    id: "contacts.list",
    requestKind: "query" as const,
    permission: "contacts.read" as const,
  }),
  Object.freeze({
    id: "reports.read",
    requestKind: "query" as const,
    permission: "reports.read" as const,
  }),
] as const satisfies readonly Readonly<RailwayApiOperationPolicy>[]);

export interface RailwayApiOperationRegistryDependencies {
  readonly tenantSessions: RailwayTenantSessionResolver;
  readonly contacts: Pick<ContactService, "list">;
  readonly reports: Pick<OperationalReportService, "read">;
}

export interface RailwayApiOperationRegistry {
  readonly operations: readonly Readonly<RailwayApiOperation>[];
}

type OperationPayloadParser<TPayload> = (
  payload: RailwayApiJsonObject,
) => TPayload;

type OperationExecutor<TPayload> = (
  session: Readonly<TenantSession>,
  payload: TPayload,
) => Promise<unknown>;

function hasExactKeys(
  value: RailwayApiJsonObject,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every(
      (key, index) => key === sortedExpectedKeys[index],
    )
  );
}

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function parseEmptyPayload(
  payload: RailwayApiJsonObject,
): RailwayApiJsonObject {
  if (!hasExactKeys(payload, [])) {
    invalidRequest();
  }

  return payload;
}

function parseContactListPayload(
  payload: RailwayApiJsonObject,
): number | null {
  if (!hasExactKeys(payload, ["beforeContactId"])) {
    invalidRequest();
  }

  const value = payload.beforeContactId;

  if (
    value !== null &&
    (!Number.isSafeInteger(value) || Number(value) <= 0)
  ) {
    invalidRequest();
  }

  return value === null ? null : Number(value);
}

function parseReportPayload(
  payload: RailwayApiJsonObject,
): Readonly<{
  startDate: string;
  endDate: string;
}> {
  if (!hasExactKeys(payload, ["startDate", "endDate"])) {
    invalidRequest();
  }

  if (
    typeof payload.startDate !== "string" ||
    typeof payload.endDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.endDate)
  ) {
    invalidRequest();
  }

  validateOperationalReportInput(payload);

  return Object.freeze({
    startDate: payload.startDate,
    endDate: payload.endDate,
  });
}

function mapOperationError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }

  if (error instanceof TenantSessionError) {
    throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
  }

  if (
    error instanceof ContactCursorInputError ||
    error instanceof OperationalReportInputError
  ) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  throw error;
}

function createOperation<TPayload>(
  policy: Readonly<RailwayApiOperationPolicy>,
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
  parsePayload: OperationPayloadParser<TPayload>,
  execute: OperationExecutor<TPayload>,
): Readonly<RailwayApiOperation> {
  return Object.freeze({
    id: policy.id,
    requestKind: policy.requestKind,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
    ) {
      try {
        const parsedPayload = parsePayload(payload);
        const session = await dependencies.tenantSessions.resolve(
          context.userIdentity,
        );

        if (policy.permission !== null) {
          requireTenantPermission(session, policy.permission);
        }

        return await execute(session, parsedPayload);
      } catch (error) {
        mapOperationError(error);
      }
    },
  });
}

export function createRailwayApiOperationRegistry(
  dependencies: Readonly<RailwayApiOperationRegistryDependencies>,
): Readonly<RailwayApiOperationRegistry> {
  if (
    typeof dependencies.tenantSessions?.resolve !== "function" ||
    typeof dependencies.contacts?.list !== "function" ||
    typeof dependencies.reports?.read !== "function"
  ) {
    throw new Error(
      "Railway API operation dependencies are invalid",
    );
  }

  const [workspacePolicy, contactsPolicy, reportsPolicy] =
    railwayApiOperationPolicies;
  const operations = [
    createOperation(
      workspacePolicy,
      dependencies,
      parseEmptyPayload,
      async (session) => {
        return {
          displayName: session.displayName,
          status: session.status,
          role: session.role,
        };
      },
    ),
    createOperation(
      contactsPolicy,
      dependencies,
      parseContactListPayload,
      async (session, beforeContactId) => {
        const page = await dependencies.contacts.list(
          session,
          beforeContactId,
        );

        return {
          contacts: page.contacts.map(toContactRecord),
          nextCursor: page.nextCursor,
        };
      },
    ),
    createOperation(
      reportsPolicy,
      dependencies,
      parseReportPayload,
      async (session, reportInput) =>
        dependencies.reports.read(
          session,
          reportInput,
        ),
    ),
  ];

  return Object.freeze({
    operations: Object.freeze(operations),
  });
}
