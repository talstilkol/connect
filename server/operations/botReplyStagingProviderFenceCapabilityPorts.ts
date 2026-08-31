export interface BotReplyStagingProviderFenceReserveInput {
  readonly runKey: string;
  readonly tenantId: number;
  readonly requestDigest: string;
  readonly auditKey: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly runClaimVersion: number;
  readonly runLeaseExpiresAt: string;
  readonly operationKey: string;
  readonly operationKind:
    | "text-send"
    | "button-send"
    | "customer-window-expired"
    | "provider-retry"
    | "pair-limit"
    | "duplicate-safety";
  readonly deliveryKey: string;
  readonly deliveryClaimVersion: number;
  readonly reservationKey: string;
}

export type BotReplyStagingProviderFenceReserveResult = Readonly<
  | {
      outcome: "authorized";
      operationKey: string;
      providerRequestKey: string;
      state: "reserved";
      requestedAt: string;
    }
  | {
      outcome: "replay-blocked";
      operationKey: string;
      state: "reserved" | "completed" | "indeterminate";
    }
>;

export type BotReplyStagingProviderFenceFinalizeInput =
  BotReplyStagingProviderFenceReserveInput;

export type BotReplyStagingProviderFenceFinalizeResult = Readonly<
  | {
      outcome: "pending";
      operationKey: string;
      state: "reserved";
    }
  | {
      outcome: "finalized" | "replayed";
      operationKey: string;
      state: "completed";
      providerOutcomeKind:
        | "accepted"
        | "sender-deferred"
        | "pair-deferred"
        | "service-window-rejected";
      observationKey: string;
      finalizedAt: string;
    }
  | {
      outcome: "finalized" | "replayed";
      operationKey: string;
      state: "indeterminate";
      providerOutcomeKind:
        | "ambiguous"
        | "lease-expired-without-outcome";
      observationKey: string;
      finalizedAt: string;
    }
>;

export type BotReplyStagingProviderFenceReserveCapabilityPort = Readonly<{
  reserve(
    input: Readonly<BotReplyStagingProviderFenceReserveInput>,
  ): Promise<BotReplyStagingProviderFenceReserveResult>;
}>;

export type BotReplyStagingProviderFenceFinalizeCapabilityPort = Readonly<{
  finalize(
    input: Readonly<BotReplyStagingProviderFenceFinalizeInput>,
  ): Promise<BotReplyStagingProviderFenceFinalizeResult>;
}>;

export type BotReplyStagingProviderFenceWorkerCapabilityPort =
  BotReplyStagingProviderFenceReserveCapabilityPort &
  BotReplyStagingProviderFenceFinalizeCapabilityPort;
