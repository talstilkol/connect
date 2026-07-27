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
  label: string;
  icon: string;
  group?: string;
}

export const workspaceNavigation: readonly WorkspaceNavigationItem[] = [
  { id: "dashboard", label: "סקירה כללית", icon: "⌂", group: "מרחב עבודה" },
  { id: "onboarding", label: "אשף הקמה", icon: "→" },
  { id: "contacts", label: "אנשי קשר", icon: "♙" },
  { id: "templates", label: "תבניות הודעה", icon: "▤" },
  { id: "campaigns", label: "קמפיינים", icon: "◒" },
  { id: "inbox", label: "תיבת שיחות", icon: "◌" },
  { id: "bot", label: "תהליכי בוט", icon: "⌘", group: "אוטומציה ונתונים" },
  { id: "ai", label: "סוכן AI", icon: "✦" },
  { id: "reports", label: "דוחות", icon: "↗" },
  { id: "billing", label: "מנוי וחיוב", icon: "◇", group: "חשבון" },
  { id: "team", label: "צוות והרשאות", icon: "◎" },
  { id: "decisions", label: "מרכז החלטות", icon: "✓" },
];

const sectionIds = new Set<SectionId>(
  workspaceNavigation.map((item) => item.id),
);

export function isSectionId(value: string): value is SectionId {
  return sectionIds.has(value as SectionId);
}

export function workspaceSectionPath(section: SectionId): string {
  return section === "dashboard" ? "/workspace" : `/workspace/${section}`;
}
