import type {
  BusinessProfileDraft,
} from "./businessProfileDraft.ts";

export interface BusinessProfileView extends BusinessProfileDraft {
  version: number;
}

export interface BusinessProfileSaveView {
  createdTenant: boolean;
  profile: BusinessProfileView;
}
