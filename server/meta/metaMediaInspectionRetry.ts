import { parseMetaMediaInspectionRetryInput, type MetaMediaInspectionRetryInput } from "../../shared/domain/metaMediaInspectionRetry.ts";
import { sha256Hex } from "./metaWebhookSecurity.ts";
import type { TenantSession } from "../auth/tenantSession.ts";
export class MetaMediaInspectionRetryError extends Error {
  readonly code: "INVALID_REQUEST" | "PERMISSION_DENIED" | "CONFLICT" | "DEPENDENCY_UNAVAILABLE";
  constructor(code: MetaMediaInspectionRetryError["code"]) { super(`Inspection retry failed: ${code}`); this.code = code; }
}
export interface MetaMediaInspectionRetryRepository {
  request(session: TenantSession, input: MetaMediaInspectionRetryInput, idempotencyKey: string): Promise<"queued" | "already-requested">;
}
export async function metaMediaInspectionRetryKey(raw: MetaMediaInspectionRetryInput): Promise<string> {
  const input = parseMetaMediaInspectionRetryInput(raw);
  if (!input) throw new MetaMediaInspectionRetryError("INVALID_REQUEST");
  return `connect_idempotency_v1_${await sha256Hex(new TextEncoder().encode(JSON.stringify({ operation: "meta.media-inspection.retry", input })))}`;
}
