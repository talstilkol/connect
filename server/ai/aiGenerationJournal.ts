import type { AiResponseGenerationRequest, AiResponseGenerationResult } from "../../shared/domain/aiRuntime.ts";

// A durable claim or an uncertain database acknowledgement must not be converted
// into a handoff by a competing worker while the original request is running.
export class AiResponseDeferredError extends Error {
  constructor() { super("AI_GENERATION_DEFERRED"); this.name = "AiResponseDeferredError"; }
}

export interface AiGenerationBinding {
  readonly tenantId: number;
  readonly requestKey: string;
  readonly aiAgentVersionKey: string;
  readonly inputDigest: string;
  readonly policyDigest: string;
}

export type AiGenerationObservation =
  | Readonly<{ status: "missing" }>
  | Readonly<{ status: "claimed"; expired: boolean }>
  | Readonly<{ status: "settled" | "uncertain"; result: AiResponseGenerationResult }>;

export interface AiGenerationClaim {
  readonly binding: AiGenerationBinding;
  readonly request: AiResponseGenerationRequest;
  readonly countedInputTokens: number;
  readonly reservedMinorUnits: number;
  readonly timeoutMs: number;
}

export interface AiGenerationJournal {
  admit(binding: AiGenerationBinding): Promise<boolean>;
  observe(binding: AiGenerationBinding): Promise<AiGenerationObservation>;
  claim(input: AiGenerationClaim): Promise<AiGenerationObservation | Readonly<{ status: "acquired" }> | Readonly<{ status: "denied" }>>;
  settle(binding: AiGenerationBinding, result: AiResponseGenerationResult): Promise<AiResponseGenerationResult>;
}
