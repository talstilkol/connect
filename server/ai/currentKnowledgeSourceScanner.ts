import type {
  KnowledgeSourceScanner,
} from "./knowledgeIngestionPorts.ts";

export type CurrentKnowledgeSourceScanner =
  | {
      status: "configured";
      scanner: KnowledgeSourceScanner;
    }
  | {
      status: "configuration-required";
    };

export function readCurrentKnowledgeSourceScanner(): CurrentKnowledgeSourceScanner {
  return {
    status: "configuration-required",
  };
}
