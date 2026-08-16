import {
  notFound,
} from "next/navigation";

import {
  SystemAdminWhatsappDeliveryPolicyPanel,
} from "../../../../features/admin/SystemAdminWhatsappDeliveryPolicyPanel.tsx";
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

export default async function SystemAdminWhatsappDeliveryPolicyPage({
  params,
}: {
  params: Promise<{
    tenantId: string;
  }>;
}) {
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
