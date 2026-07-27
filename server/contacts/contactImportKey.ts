import { createHash } from "node:crypto";
import type {
  ContactImportProfileMapping,
} from "../../shared/domain/contactImportJob";

export interface ContactImportKeyInput {
  tenantId: number;
  sourceDigest: string;
  mapping: ContactImportProfileMapping;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function deriveContactImportJobKey(
  input: ContactImportKeyInput,
): string {
  const canonicalMapping = [
    input.mapping.phoneNumber,
    input.mapping.firstName,
    input.mapping.lastName,
    input.mapping.email,
    input.mapping.company,
  ].join(":");

  return `contact_import_v1_${digest(
    [
      String(input.tenantId),
      input.sourceDigest,
      canonicalMapping,
    ].join("\n"),
  )}`;
}

export function deriveContactPhoneFingerprint(
  phoneNumber: string,
): string {
  return digest(`contact_phone_v1\n${phoneNumber}`);
}
