import type { KnowledgePassageCursor, KnowledgePassageRepository } from "../../db/knowledgePassageRepository.ts";
import type { AiKnowledgePassage, AiKnowledgeRetriever, AiKnowledgeRetrievalRequest, AiKnowledgeRetrievalResult } from "../../shared/domain/aiRuntime.ts";
import { deriveKnowledgePassageKey } from "./aiAgentKey.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";

const sourcePattern = /^knowledge_source_v1_[a-f0-9]{64}$/;
const maximumPagePassages = 100;
const maximumRankedPassages = 100;
const maximumPassagesPerSource = 1_000;
const maximumSelectedPassages = 20;
const maximumSelectedBytes = 65_536;

function terms(text: string): ReadonlySet<string> {
  return new Set(text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

// The score is lexical query-term coverage, not a probability or a claim of
// semantic correctness. The response is still a draft requiring human review.
export function createApprovedKnowledgeRetriever(
  repository: Pick<KnowledgePassageRepository, "listApprovedBySourceKeys">,
): AiKnowledgeRetriever {
  if (typeof repository?.listApprovedBySourceKeys !== "function") throw new Error("Knowledge retrieval dependency is invalid");
  return Object.freeze({
    async retrieve(request: AiKnowledgeRetrievalRequest): Promise<AiKnowledgeRetrievalResult> {
      if (!request || !Number.isSafeInteger(request.tenantId) || request.tenantId <= 0 ||
        !/^ai_provider_request_v1_[a-f0-9]{64}$/.test(request.requestKey) ||
        !/^ai_agent_version_v1_[a-f0-9]{64}$/.test(request.aiAgentVersionKey) ||
        !Array.isArray(request.sourceKeys) || request.sourceKeys.length > 100 ||
        request.sourceKeys.some((source) => typeof source !== "string" || !sourcePattern.test(source)) ||
        new Set(request.sourceKeys).size !== request.sourceKeys.length ||
        typeof request.query !== "string" || request.query.length === 0 || request.query.length > 4096) {
        return { outcome: "unavailable" };
      }
      const tenantId = request.tenantId;
      const sourceKeys = [...request.sourceKeys];
      const queryTerms = terms(request.query);
      if (sourceKeys.length === 0 || queryTerms.size === 0) return { outcome: "no-approved-knowledge" };
      const allowed = new Set(sourceKeys);
      try {
        const ranked: { passage: AiKnowledgePassage; matches: Set<string>; score: number }[] = [];
        const compare = (a: typeof ranked[number], b: typeof ranked[number]) =>
          b.score - a.score || (a.passage.passageKey < b.passage.passageKey ? -1 : 1);
        let cursor: KnowledgePassageCursor | undefined;
        let scanned = 0;
        // Keyset pages cover every approved source before the global ranking cap.
        // Storage admits at most 1,000 passages per source; only one page and
        // the best 100 candidates remain in memory throughout the scan.
        for (;;) {
          const candidates = await repository.listApprovedBySourceKeys(tenantId, sourceKeys, maximumPagePassages, cursor);
          if (!Array.isArray(candidates) || candidates.length > maximumPagePassages ||
            (scanned += candidates.length) > sourceKeys.length * maximumPassagesPerSource) return { outcome: "unavailable" };
          for (const candidate of candidates.map((value) => ({ ...value }))) {
            if (!candidate || candidate.tenantId !== tenantId || !allowed.has(candidate.sourceKey) ||
              typeof candidate.content !== "string" || candidate.content.length === 0 || candidate.content.length > 16_384 ||
              candidate.content !== candidate.content.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(candidate.content) ||
              !Number.isSafeInteger(candidate.passageOrdinal) || candidate.passageOrdinal <= 0 ||
              (cursor && (candidate.sourceKey < cursor.sourceKey ||
                (candidate.sourceKey === cursor.sourceKey && candidate.passageOrdinal <= cursor.passageOrdinal)))) {
              return { outcome: "unavailable" };
            }
            const digest = await sha256Hex(new TextEncoder().encode(candidate.content));
            if (digest !== candidate.contentSha256 || candidate.passageKey !==
              await deriveKnowledgePassageKey(tenantId, candidate.sourceKey, candidate.passageOrdinal, digest)) return { outcome: "unavailable" };
            cursor = { sourceKey: candidate.sourceKey, passageOrdinal: candidate.passageOrdinal };
            const contentTerms = terms(candidate.content);
            const matches = new Set([...queryTerms].filter((term) => contentTerms.has(term)));
            if (matches.size === 0) continue;
            ranked.push({
              passage: { passageKey: candidate.passageKey, sourceKey: candidate.sourceKey, content: candidate.content },
              matches, score: matches.size,
            });
          }
          ranked.sort(compare);
          ranked.splice(maximumRankedPassages);
          if (candidates.length < maximumPagePassages) break;
        }
        const selected: AiKnowledgePassage[] = [];
        const matched = new Set<string>();
        let bytes = 0;
        for (const item of ranked) {
          const size = new TextEncoder().encode(item.passage.content).byteLength;
          if (bytes + size > maximumSelectedBytes) continue;
          selected.push(Object.freeze(item.passage)); bytes += size;
          for (const term of item.matches) matched.add(term);
          if (selected.length === maximumSelectedPassages) break;
        }
        return selected.length === 0 ? { outcome: "no-approved-knowledge" } : {
          outcome: "grounded", scoreBasisPoints: Math.floor(matched.size * 10_000 / queryTerms.size),
          passages: Object.freeze(selected),
        };
      } catch {
        return { outcome: "unavailable" };
      }
    },
  });
}
