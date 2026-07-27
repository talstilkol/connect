import type {
  CampaignSummary,
  ContactSummary,
  TenantContext,
} from "../domain/model";
import type { BusinessProfileDraft } from "../domain/businessProfileDraft";

export type { BusinessProfileDraft } from "../domain/businessProfileDraft";

export interface ListResult<TItem> {
  items: readonly TItem[];
  nextCursor: string | null;
}

export interface ContactQuery {
  search: string | null;
  mailingStatus: "subscribed" | "unsubscribed" | null;
  cursor: string | null;
}

export interface CampaignQuery {
  status:
    | "draft"
    | "scheduled"
    | "running"
    | "paused"
    | "completed"
    | "cancelled"
    | "failed"
    | null;
  cursor: string | null;
}

export interface WorkspaceReader {
  getTenantContext(): Promise<TenantContext>;
  listContacts(query: ContactQuery): Promise<ListResult<ContactSummary>>;
  listCampaigns(query: CampaignQuery): Promise<ListResult<CampaignSummary>>;
}

export interface OnboardingWriter {
  saveBusinessProfile(draft: BusinessProfileDraft): Promise<void>;
}

export interface AuthPort {
  requestSignIn(email: string, password: string): Promise<void>;
  requestRegistration(input: {
    fullName: string;
    businessName: string;
    email: string;
    phoneNumber: string;
    password: string;
  }): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
}

/**
 * These are application ports, not HTTP endpoints.
 * Concrete paths and providers remain intentionally undefined until the
 * backend and identity decisions are approved.
 */
export interface ConnectApplicationPorts {
  auth: AuthPort;
  workspace: WorkspaceReader;
  onboarding: OnboardingWriter;
}
