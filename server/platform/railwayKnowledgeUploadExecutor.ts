import type { TenantSession } from "../auth/tenantSession.ts";
import type { KnowledgeUploadPayload } from "../ai/knowledgeUploadRequest.ts";
import type { KnowledgeSourceView } from "../../shared/domain/aiAgentView.ts";
export type KnowledgeUploadExecutor = (session: TenantSession, payload: KnowledgeUploadPayload, idempotencyKey: string, requestDigest: string) =>
  Promise<{ source: KnowledgeSourceView; outcome: "processing" | "unchanged" }>;
