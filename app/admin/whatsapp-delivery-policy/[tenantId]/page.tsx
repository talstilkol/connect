import { auth } from "@clerk/nextjs/server";
import {
  notFound,
} from "next/navigation";

import {
  SystemAdminWhatsappDeliveryPolicyPanel,
} from "../../../../features/admin/SystemAdminWhatsappDeliveryPolicyPanel.tsx";
import { hasClerkServerConfiguration } from "../../../../server/auth/clerkConfiguration.ts";
import {
  readCurrentSystemAdminWhatsappDeliveryPolicy,
} from "../../../../server/campaigns/currentSystemAdminWhatsappDeliveryPolicy.ts";

export const dynamic = "force-dynamic";

function parseTenantId(
  value: string,
): number | null {
  if (!/^[1-9][0-9]*$/.test(value)) {
    return null;
  }

  const tenantId = Number(value);

  return Number.isSafeInteger(tenantId)
    ? tenantId
    : null;
}

// Clerk's experimental lint rule cannot follow the intentional config-disabled rehearsal branch; source-contract tests enforce the conditional direct protection.
// eslint-disable-next-line @clerk/next/require-auth-protection
export default async function SystemAdminWhatsappDeliveryPolicyPage({
  params,
}: {
  params: Promise<{
    tenantId: string;
  }>;
}) {
  if (hasClerkServerConfiguration()) {
    await auth.protect();
  }

  const { tenantId: rawTenantId } =
    await params;
  const tenantId = parseTenantId(
    rawTenantId,
  );

  if (tenantId === null) {
    notFound();
  }

  const result =
    await readCurrentSystemAdminWhatsappDeliveryPolicy(
      tenantId,
    );

  return (
    <SystemAdminWhatsappDeliveryPolicyPanel
      initialResult={result}
    />
  );
}
