import type {
  ConsentStatus,
  MailingStatus,
} from "./model";

export interface ContactRecord {
  id: number;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  mailingStatus: MailingStatus;
  consentStatus: ConsentStatus;
  consentSource: string | null;
  consentRecordedAt: string | null;
  consentWithdrawnAt: string | null;
  version: number;
}

export const CONTACT_PAGE_SIZE = 50;

export interface ContactRecordPage {
  contacts: readonly ContactRecord[];
  nextCursor: number | null;
}
