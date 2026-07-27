"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { BusinessProfileDraft } from "../../shared/domain/businessProfileDraft";
import type { CampaignDraft } from "../../shared/domain/campaignDraft";
import type { ContactImportDraft } from "../../shared/domain/contactImportDraft";
import type { TemplateDraft } from "../../shared/domain/templateDraft";

export type BusinessProfilePersistence = "local" | "server";

type WorkspaceDraftContextValue = {
  templateDraft: TemplateDraft | null;
  contactImportDraft: ContactImportDraft | null;
  campaignDraft: CampaignDraft | null;
  businessProfileDraft: BusinessProfileDraft | null;
  businessProfilePersistence: BusinessProfilePersistence | null;
  saveTemplateDraft: (draft: TemplateDraft) => void;
  saveContactImportDraft: (draft: ContactImportDraft) => void;
  saveCampaignDraft: (draft: CampaignDraft) => void;
  saveBusinessProfileDraft: (
    draft: BusinessProfileDraft,
    persistence?: BusinessProfilePersistence,
  ) => void;
  clearTemplateDraft: () => void;
  clearContactImportDraft: () => void;
  clearCampaignDraft: () => void;
  clearBusinessProfileDraft: () => void;
};

const WorkspaceDraftContext =
  createContext<WorkspaceDraftContextValue | null>(null);

export function WorkspaceDraftProvider({
  children,
  initialBusinessProfileDraft = null,
}: {
  children: ReactNode;
  initialBusinessProfileDraft?: BusinessProfileDraft | null;
}) {
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(
    null,
  );
  const [contactImportDraft, setContactImportDraft] =
    useState<ContactImportDraft | null>(null);
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft | null>(
    null,
  );
  const [businessProfileDraft, setBusinessProfileDraft] =
    useState<BusinessProfileDraft | null>(initialBusinessProfileDraft);
  const [
    businessProfilePersistence,
    setBusinessProfilePersistence,
  ] = useState<BusinessProfilePersistence | null>(
    initialBusinessProfileDraft ? "server" : null,
  );

  const saveTemplateDraft = useCallback((draft: TemplateDraft) => {
    setTemplateDraft({
      ...draft,
      variableExamples: { ...draft.variableExamples },
      quickReplies: [...draft.quickReplies],
      urlButton: { ...draft.urlButton },
      phoneButton: { ...draft.phoneButton },
    });
    setCampaignDraft(null);
  }, []);

  const clearTemplateDraft = useCallback(() => {
    setTemplateDraft(null);
    setCampaignDraft(null);
  }, []);

  const saveContactImportDraft = useCallback((draft: ContactImportDraft) => {
    setContactImportDraft({
      ...draft,
      headers: [...draft.headers],
      rows: draft.rows.map((row) => [...row]),
      mapping: { ...draft.mapping },
      quality: { ...draft.quality },
      schema: {
        ...draft.schema,
        emptyHeaderColumns: [...draft.schema.emptyHeaderColumns],
        duplicateHeaders: draft.schema.duplicateHeaders.map((duplicate) => ({
          ...duplicate,
          columnNumbers: [...duplicate.columnNumbers],
        })),
        rowIssueSamples: draft.schema.rowIssueSamples.map((issue) => ({
          ...issue,
        })),
      },
    });
    setCampaignDraft(null);
  }, []);

  const clearContactImportDraft = useCallback(() => {
    setContactImportDraft(null);
    setCampaignDraft(null);
  }, []);

  const saveCampaignDraft = useCallback((draft: CampaignDraft) => {
    setCampaignDraft({
      ...draft,
      variableColumnMapping: { ...draft.variableColumnMapping },
    });
  }, []);

  const clearCampaignDraft = useCallback(() => {
    setCampaignDraft(null);
  }, []);

  const saveBusinessProfileDraft = useCallback(
    (
      draft: BusinessProfileDraft,
      persistence: BusinessProfilePersistence = "local",
    ) => {
      setBusinessProfileDraft({ ...draft });
      setBusinessProfilePersistence(persistence);
    },
    [],
  );

  const clearBusinessProfileDraft = useCallback(() => {
    setBusinessProfileDraft(null);
    setBusinessProfilePersistence(null);
  }, []);

  const value = useMemo(
    () => ({
      templateDraft,
      contactImportDraft,
      campaignDraft,
      businessProfileDraft,
      businessProfilePersistence,
      saveTemplateDraft,
      saveContactImportDraft,
      saveCampaignDraft,
      saveBusinessProfileDraft,
      clearTemplateDraft,
      clearContactImportDraft,
      clearCampaignDraft,
      clearBusinessProfileDraft,
    }),
    [
      businessProfileDraft,
      businessProfilePersistence,
      campaignDraft,
      clearBusinessProfileDraft,
      clearCampaignDraft,
      clearContactImportDraft,
      clearTemplateDraft,
      contactImportDraft,
      saveBusinessProfileDraft,
      saveCampaignDraft,
      saveContactImportDraft,
      saveTemplateDraft,
      templateDraft,
    ],
  );

  return (
    <WorkspaceDraftContext.Provider value={value}>
      {children}
    </WorkspaceDraftContext.Provider>
  );
}

export function useWorkspaceDrafts(): WorkspaceDraftContextValue {
  const context = useContext(WorkspaceDraftContext);

  if (!context) {
    throw new Error(
      "useWorkspaceDrafts must be used inside WorkspaceDraftProvider.",
    );
  }

  return context;
}
