export type SectionId =
  | "dashboard"
  | "onboarding"
  | "contacts"
  | "templates"
  | "campaigns"
  | "inbox"
  | "bot"
  | "ai"
  | "reports"
  | "billing"
  | "team"
  | "decisions";

export interface WorkspaceNavigationItem {
  id: SectionId;
  icon: string;
  group?: WorkspaceNavigationGroupId;
}

export type WorkspaceNavigationGroupId =
  | "workspace"
  | "automation"
  | "account";

export const workspaceNavigation: readonly WorkspaceNavigationItem[] = [
  { id: "dashboard", icon: "⌂", group: "workspace" },
  { id: "onboarding", icon: "→" },
  { id: "contacts", icon: "♙" },
  { id: "templates", icon: "▤" },
  { id: "campaigns", icon: "◒" },
  { id: "inbox", icon: "◌" },
  { id: "bot", icon: "⌘", group: "automation" },
  { id: "ai", icon: "✦" },
  { id: "reports", icon: "↗" },
  { id: "billing", icon: "◇", group: "account" },
  { id: "team", icon: "◎" },
  { id: "decisions", icon: "✓" },
];

const sectionIds = new Set<SectionId>(
  workspaceNavigation.map((item) => item.id),
);

export function isSectionId(value: string): value is SectionId {
  return sectionIds.has(value as SectionId);
}

export function workspaceSectionPath(
  section: SectionId,
  language: "he" | "en" | "ar" = "he",
): string {
  const path =
    section === "dashboard"
      ? "/workspace"
      : `/workspace/${section}`;

  return language === "he"
    ? path
    : `${path}?lang=${language}`;
}
