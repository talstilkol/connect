import type { PersistedContact } from "../../db/contactRepository";
import type { ContactRecord } from "../../shared/domain/contactRecord";

export function toContactRecord(
  contact: PersistedContact,
): ContactRecord {
  return {
    id: contact.id,
    phoneNumber: contact.phoneNumber,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    company: contact.company,
    mailingStatus: contact.mailingStatus,
    consentStatus: contact.consentStatus,
    consentSource: contact.consentSource,
    consentRecordedAt: contact.consentRecordedAt,
    consentWithdrawnAt: contact.consentWithdrawnAt,
    version: contact.version,
  };
}
