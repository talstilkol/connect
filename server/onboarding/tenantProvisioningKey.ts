import type { UserId } from "../../shared/domain/model";

const provisioningNamespace = "connect:tenant-provisioning:v1:";

export async function deriveTenantProvisioningKey(
  externalUserId: UserId,
): Promise<string> {
  const normalizedExternalUserId = externalUserId.trim();

  if (normalizedExternalUserId.length === 0) {
    throw new Error("externalUserId must not be blank");
  }

  const encodedIdentity = new TextEncoder().encode(
    `${provisioningNamespace}${normalizedExternalUserId}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", encodedIdentity);
  const hexadecimalDigest = Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

  return `tenant_v1_${hexadecimalDigest}`;
}
