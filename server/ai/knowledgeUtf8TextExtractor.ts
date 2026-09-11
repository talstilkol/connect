import type { KnowledgeTextExtractor, KnowledgeExtractionResult } from "./knowledgeIngestionPorts.ts";

const maximumBytes = 1_048_576;
const maximumSectionCharacters = 4_096;

// Runs only on an already scanned immutable object. It never fetches links,
// evaluates Markdown/HTML, opens archives, or follows embedded instructions.
export const knowledgeUtf8TextExtractor: KnowledgeTextExtractor = Object.freeze({
  async extract(input: Parameters<KnowledgeTextExtractor["extract"]>[0]): Promise<KnowledgeExtractionResult> {
    if (!input || !/^knowledge_source_v1_[a-f0-9]{64}$/.test(input.sourceKey) ||
      !(input.bytes instanceof ArrayBuffer) || input.bytes.byteLength === 0 || input.bytes.byteLength > maximumBytes) {
      return { outcome: "rejected", errorCode: "KNOWLEDGE_TEXT_INVALID" };
    }
    if (input.mediaType !== "text/plain" && input.mediaType !== "text/markdown") {
      return { outcome: "rejected", errorCode: "KNOWLEDGE_TEXT_MEDIA_TYPE_UNSUPPORTED" };
    }
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(input.bytes).replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim(); }
    catch { return { outcome: "rejected", errorCode: "KNOWLEDGE_TEXT_ENCODING_INVALID" }; }
    if (text.length === 0 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
      return { outcome: "rejected", errorCode: "KNOWLEDGE_TEXT_INVALID" };
    }
    const sections: { content: string }[] = [];
    let offset = 0;
    while (offset < text.length) {
      let end = Math.min(offset + maximumSectionCharacters, text.length);
      if (end < text.length) {
        const boundary = text.lastIndexOf("\n", end - 1);
        if (boundary > offset + maximumSectionCharacters / 2) end = boundary + 1;
        // Keep surrogate pairs intact when a long line has no newline boundary.
        else if (/[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end--;
      }
      const content = text.slice(offset, end).trim();
      if (content.length > 0) sections.push(Object.freeze({ content }));
      offset = end;
    }
    return { outcome: "extracted", sections: Object.freeze(sections) };
  },
});
