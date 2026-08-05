import {
  createHash,
} from "node:crypto";

import type {
  TenantId,
  UserId,
} from "../../shared/domain/model.ts";
import {
  requireTeamExternalUserId,
  requireTeamMemberKey,
  requireTeamTenantId,
} from "./teamMembershipValidation.ts";

export function deriveTeamMemberKey(
  tenantIdInput: TenantId | number,
  externalUserIdInput: UserId | string,
): string {
  const tenantId =
    requireTeamTenantId(tenantIdInput);
  const externalUserId =
    requireTeamExternalUserId(
      externalUserIdInput,
    );
  const key = `team_member_v1_${createHash(
    "sha256",
  )
    .update(
      JSON.stringify({
        purpose:
          "team-member-reference",
        tenantId,
        externalUserId,
      }),
    )
    .digest("hex")}`;

  return requireTeamMemberKey(key);
}
