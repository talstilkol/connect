export interface BotReplyStagingRunClaimInput {
  readonly runKey: string;
  readonly tenantId: number;
  readonly requestDigest: string;
  readonly actorExternalUserId: string;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly recipientFingerprint: string;
  readonly rateLimitMethodFingerprint: string;
  readonly leaseDurationSeconds: number;
  readonly auditKey: string;
}

export interface BotReplyStagingRunReadInput {
  readonly tenantId: number;
  readonly runKey: string;
  readonly requestDigest: string;
  readonly auditKey: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly claimVersion: number;
}

export interface BotReplyStagingRunCompleteInput
  extends BotReplyStagingRunReadInput {
  readonly leaseExpiresAt: string;
  readonly receipt: unknown;
}

export type BotReplyStagingRunClaimResult = Readonly<
  | {
      outcome: "claimed";
      runKey: string;
      auditKey: string;
      claimVersion: number;
      leaseExpiresAt: string;
    }
  | {
      outcome: "replayed";
      runKey: string;
      auditKey: string;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "conflict" | "in-progress";
      runKey: string;
    }
>;

export type BotReplyStagingRunReadResult = Readonly<
  | {
      outcome: "running";
      runKey: string;
      auditKey: string;
      claimVersion: number;
      leaseExpiresAt: string;
    }
  | {
      outcome: "completed";
      runKey: string;
      auditKey: string;
      claimVersion: number;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "expired" | "missing-or-conflict";
      runKey: string;
    }
>;

export type BotReplyStagingRunCompleteResult = Readonly<
  | {
      outcome: "completed" | "replayed";
      runKey: string;
      auditKey: string;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "conflict" | "lease-expired";
      runKey: string;
    }
>;

export type BotReplyStagingRunClaimCapabilityPort = Readonly<{
  claim(
    input: Readonly<BotReplyStagingRunClaimInput>,
  ): Promise<BotReplyStagingRunClaimResult>;
}>;

export type BotReplyStagingRunReadCapabilityPort = Readonly<{
  read(
    input: Readonly<BotReplyStagingRunReadInput>,
  ): Promise<BotReplyStagingRunReadResult>;
}>;

export type BotReplyStagingRunCompleteCapabilityPort = Readonly<{
  complete(
    input: Readonly<BotReplyStagingRunCompleteInput>,
  ): Promise<BotReplyStagingRunCompleteResult>;
}>;

export type BotReplyStagingRunApiCapabilityPort =
  BotReplyStagingRunClaimCapabilityPort &
  BotReplyStagingRunReadCapabilityPort;

export type BotReplyStagingRunWorkerCapabilityPort =
  BotReplyStagingRunCompleteCapabilityPort;
