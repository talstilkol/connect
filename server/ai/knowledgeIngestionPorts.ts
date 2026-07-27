export interface KnowledgeFileDescriptor {
  fileName: string;
  mediaType: string;
  sizeBytes: number;
}

export type KnowledgeUploadPolicyResult =
  | { outcome: "accepted" }
  | {
      outcome: "rejected";
      errorCode: string;
    }
  | { outcome: "unavailable" };

export interface KnowledgeUploadPolicy {
  evaluate(
    file: KnowledgeFileDescriptor,
  ): Promise<unknown>;
}

export type KnowledgeScanResult =
  | { outcome: "clean" }
  | {
      outcome: "rejected";
      errorCode: string;
    }
  | { outcome: "unavailable" };

export interface KnowledgeSourceScanner {
  scan(input: {
    sourceKey: string;
    mediaType: string;
    bytes: ArrayBuffer;
  }): Promise<unknown>;
}

export interface ExtractedKnowledgeSection {
  content: string;
}

export type KnowledgeExtractionResult =
  | {
      outcome: "extracted";
      sections:
        readonly ExtractedKnowledgeSection[];
    }
  | {
      outcome: "rejected";
      errorCode: string;
    }
  | { outcome: "unavailable" };

export interface KnowledgeTextExtractor {
  extract(input: {
    sourceKey: string;
    mediaType: string;
    bytes: ArrayBuffer;
  }): Promise<unknown>;
}

export const unavailableKnowledgeUploadPolicy:
KnowledgeUploadPolicy = {
  async evaluate() {
    return { outcome: "unavailable" };
  },
};

export const unavailableKnowledgeSourceScanner:
KnowledgeSourceScanner = {
  async scan() {
    return { outcome: "unavailable" };
  },
};

export const unavailableKnowledgeTextExtractor:
KnowledgeTextExtractor = {
  async extract() {
    return { outcome: "unavailable" };
  },
};
