import type {
  ContactConsentEventType,
} from "../../shared/validation/contactConsent";

const eventNamespace = "connect:contact-consent:v1";

export interface ContactConsentEventKeyInput {
  tenantId: number;
  contactId: number;
  eventType: ContactConsentEventType;
  source: string;
  occurredAt: string;
  evidenceReference: string | null;
  actorExternalUserId: string;
}

export async function deriveContactConsentEventKey(
  input: ContactConsentEventKeyInput,
): Promise<string> {
  const canonicalInput = JSON.stringify([
    eventNamespace,
    input.tenantId,
    input.contactId,
    input.eventType,
    input.source,
    input.occurredAt,
    input.evidenceReference,
    input.actorExternalUserId,
  ]);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalInput),
  );
  const hexadecimalDigest = Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

  return `contact_consent_v1_${hexadecimalDigest}`;
}
