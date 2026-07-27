import type {
  MetaConnectionRecord,
  PersistedMetaConnectionStatus,
} from "./metaConnection";

export type MetaConnectionViewStatus =
  | PersistedMetaConnectionStatus
  | "configuration-required"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "disconnected"
  | "server-error";

export interface MetaConnectionView {
  status: MetaConnectionViewStatus;
}

export const configurationRequiredMetaConnection: MetaConnectionView = {
  status: "configuration-required",
};

export function toMetaConnectionView(
  connection: MetaConnectionRecord | null,
): MetaConnectionView {
  return {
    status: connection?.status ?? "disconnected",
  };
}
