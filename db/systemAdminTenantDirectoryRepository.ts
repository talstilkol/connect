import type {
  SystemAdminTenantDirectoryPage,
  SystemAdminTenantRecord,
} from "../shared/domain/systemAdminTenantDirectory.ts";
import {
  isSubscriptionStatus,
  requireCanonicalTimestamp,
  requirePositiveTenantId,
  requireSubscriptionWindow,
} from "../server/billing/tenantSubscriptionValidation.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const PAGE_SIZE = 50;

const LIST_TENANTS_SQL = `
  SELECT
    tenants.id AS tenantId,
    tenants.display_name AS displayName,
    tenants.status AS tenantStatus,
    tenant_subscriptions.tenant_id AS subscriptionTenantId,
    tenant_subscriptions.status AS subscriptionStatus,
    tenant_subscriptions.starts_at AS startsAt,
    tenant_subscriptions.ends_at AS endsAt,
    tenant_subscriptions.cancelled_at AS cancelledAt,
    tenant_subscriptions.version AS subscriptionVersion,
    tenant_subscriptions.created_at AS subscriptionCreatedAt,
    tenant_subscriptions.updated_at AS subscriptionUpdatedAt
  FROM tenants
  LEFT JOIN tenant_subscriptions
    ON tenant_subscriptions.tenant_id = tenants.id
  WHERE (?1 IS NULL OR tenants.id > ?1)
  ORDER BY tenants.id ASC
  LIMIT ?2
`;

interface DirectoryRow {
  tenantId: number;
  displayName: string;
  tenantStatus: string;
  subscriptionTenantId: number | null;
  subscriptionStatus: string | null;
  startsAt: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
  subscriptionVersion: number | null;
  subscriptionCreatedAt: string | null;
  subscriptionUpdatedAt: string | null;
}

export interface SystemAdminTenantDirectoryRepository {
  listPage(
    afterTenantId: number | null,
  ): Promise<SystemAdminTenantDirectoryPage>;
}

function validStoredText(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 500 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function parseRow(
  row: DirectoryRow,
): SystemAdminTenantRecord {
  const tenantId =
    requirePositiveTenantId(row.tenantId);
  const tenantStatus =
    isSubscriptionStatus(
      row.tenantStatus,
    )
      ? row.tenantStatus
      : null;

  if (
    !tenantStatus ||
    !validStoredText(row.displayName)
  ) {
    throw new Error(
      "D1 returned an invalid system admin tenant",
    );
  }

  if (row.subscriptionTenantId === null) {
    if (
      row.subscriptionStatus !== null ||
      row.startsAt !== null ||
      row.endsAt !== null ||
      row.cancelledAt !== null ||
      row.subscriptionVersion !== null ||
      row.subscriptionCreatedAt !== null ||
      row.subscriptionUpdatedAt !== null
    ) {
      throw new Error(
        "D1 returned an incomplete system admin subscription",
      );
    }

    return {
      tenantId,
      displayName: row.displayName,
      tenantStatus,
      subscription: null,
    };
  }

  const subscriptionStatus =
    row.subscriptionStatus &&
    isSubscriptionStatus(
      row.subscriptionStatus,
    )
      ? row.subscriptionStatus
      : null;

  if (
    row.subscriptionTenantId !== tenantId ||
    !subscriptionStatus ||
    subscriptionStatus !== tenantStatus ||
    typeof row.startsAt !== "string" ||
    typeof row.endsAt !== "string" ||
    !Number.isSafeInteger(
      row.subscriptionVersion,
    ) ||
    (row.subscriptionVersion ?? 0) <= 0 ||
    !validStoredText(
      row.subscriptionCreatedAt,
    ) ||
    !validStoredText(
      row.subscriptionUpdatedAt,
    ) ||
    (
      subscriptionStatus === "cancelled"
        ? row.cancelledAt === null
        : row.cancelledAt !== null
    )
  ) {
    throw new Error(
      "D1 returned an invalid system admin subscription",
    );
  }

  const period =
    requireSubscriptionWindow(
      row.startsAt,
      row.endsAt,
    );

  if (row.cancelledAt !== null) {
    requireCanonicalTimestamp(
      row.cancelledAt,
    );
  }

  return {
    tenantId,
    displayName: row.displayName,
    tenantStatus,
    subscription: {
      status: subscriptionStatus,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      cancelledAt: row.cancelledAt,
      version:
        row.subscriptionVersion as number,
      createdAt:
        row.subscriptionCreatedAt,
      updatedAt:
        row.subscriptionUpdatedAt,
    },
  };
}

export function createSystemAdminTenantDirectoryRepository(
  database: D1DatabaseBinding,
): SystemAdminTenantDirectoryRepository {
  return {
    async listPage(afterTenantId) {
      const cursor =
        afterTenantId === null
          ? null
          : requirePositiveTenantId(
              afterTenantId,
            );
      const result = await database
        .prepare(LIST_TENANTS_SQL)
        .bind(cursor, PAGE_SIZE + 1)
        .all<DirectoryRow>();

      if (!result.success) {
        throw new Error(
          "D1 system admin tenant directory read failed",
        );
      }

      const rows = result.results ?? [];
      const parsedRows = rows.map(parseRow);

      for (
        let index = 1;
        index < parsedRows.length;
        index += 1
      ) {
        if (
          parsedRows[index - 1].tenantId >=
          parsedRows[index].tenantId
        ) {
          throw new Error(
            "D1 system admin tenant ordering is invalid",
          );
        }
      }

      const tenants =
        parsedRows.slice(0, PAGE_SIZE);
      const nextCursor =
        parsedRows.length > PAGE_SIZE
          ? tenants.at(-1)?.tenantId ??
            null
          : null;

      return {
        tenants,
        nextCursor,
      };
    },
  };
}
