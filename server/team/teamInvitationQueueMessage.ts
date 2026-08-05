import {
  requireTeamInvitationDeliveryKey,
} from "./teamInvitationValidation.ts";
import {
  requireTeamTenantId,
} from "./teamMembershipValidation.ts";

export interface TeamInvitationQueueMessage {
  version: 1;
  tenantId: number;
  deliveryKey: string;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function createTeamInvitationQueueMessage(
  tenantIdInput: unknown,
  deliveryKeyInput: unknown,
): TeamInvitationQueueMessage {
  return {
    version: 1,
    tenantId:
      requireTeamTenantId(
        tenantIdInput,
      ),
    deliveryKey:
      requireTeamInvitationDeliveryKey(
        deliveryKeyInput,
      ),
  };
}

export function parseTeamInvitationQueueMessage(
  value: unknown,
): TeamInvitationQueueMessage | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 3 ||
    value.version !== 1
  ) {
    return null;
  }

  try {
    return createTeamInvitationQueueMessage(
      value.tenantId,
      value.deliveryKey,
    );
  } catch {
    return null;
  }
}
