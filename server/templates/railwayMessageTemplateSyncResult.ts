import type { RailwayMessageTemplateSyncState } from "../platform/railwayMessageTemplateSyncMutationExecutor.ts";
import { isTemplateSyncTimestamp } from "../platform/railwayMessageTemplateSyncMutationExecutor.ts";
import { parseRailwayMessageTemplateView } from "./railwayMessageTemplateDraftResult.ts";

const countKeys = ["received", "eligible", "updated", "unchanged", "stale", "unmatched", "unsupported"] as const;

export function parseRailwayMessageTemplateSyncState(value: unknown): RailwayMessageTemplateSyncState | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(",") !== "summary,templates" ||
    !Array.isArray(data.templates) || data.templates.length > 100 ||
    typeof data.summary !== "object" || data.summary === null || Array.isArray(data.summary)) return null;
  const summary = data.summary as Record<string, unknown>;
  if (Object.keys(summary).sort().join(",") !== [...countKeys, "observedAt"].sort().join(",") ||
    !isTemplateSyncTimestamp(summary.observedAt) ||
    countKeys.some((key) => !Number.isSafeInteger(summary[key]) || Number(summary[key]) < 0 || Number(summary[key]) > 2000)) return null;
  const counts = Object.fromEntries(countKeys.map((key) => [key, Number(summary[key])])) as Record<typeof countKeys[number], number>;
  if (counts.received !== counts.eligible + counts.unsupported ||
    counts.eligible !== counts.updated + counts.unchanged + counts.stale + counts.unmatched) return null;
  const templates = data.templates.map(parseRailwayMessageTemplateView);
  const seen = new Set<string>();
  for (let i = 0; i < templates.length; i += 1) {
    const current = templates[i];
    const previous = templates[i - 1];
    if (current === null || seen.has(current.templateKey) ||
      (previous && (previous.updatedAt < current.updatedAt ||
        (previous.updatedAt === current.updatedAt && previous.templateKey >= current.templateKey)))) return null;
    seen.add(current.templateKey);
  }
  return Object.freeze({
    templates: Object.freeze(templates as NonNullable<typeof templates[number]>[]),
    summary: Object.freeze({ ...counts, observedAt: summary.observedAt }),
  });
}
