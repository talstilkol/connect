import type {
  BusinessProfileDraft,
} from "./businessProfileDraft.ts";

export interface SystemAdminBusinessProfileView
  extends BusinessProfileDraft {
  version: number;
  createdAt: string;
  updatedAt: string;
}
