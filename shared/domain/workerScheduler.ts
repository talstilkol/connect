export const railwayWorkerSchedulerId =
  "connect-railway-worker-scheduler-v1" as const;

export const workerSchedulerOwnerKeyPattern =
  /^scheduler_owner_v1_[a-f0-9]{64}$/;

export const workerSchedulerMaximumCatchUpTicks = 5;
export const workerSchedulerMinimumLeaseSeconds = 60;
export const workerSchedulerMaximumLeaseSeconds = 300;

export interface WorkerSchedulerClaim {
  readonly schedulerId: typeof railwayWorkerSchedulerId;
  readonly ownerKey: string;
  readonly fencingToken: number;
  readonly tick: string;
  readonly claimedAt: string;
  readonly leaseExpiresAt: string;
}

export type WorkerSchedulerClaimResult =
  | Readonly<{
      outcome: "claimed";
      claim: Readonly<WorkerSchedulerClaim>;
    }>
  | Readonly<{
      outcome: "not-claimed";
      claim: null;
    }>;

export type WorkerSchedulerCompletionResult =
  | Readonly<{
      outcome: "completed";
      completedTick: string;
    }>
  | Readonly<{
      outcome: "claim-lost";
      completedTick: null;
    }>;

export interface WorkerSchedulerLeaseRepository {
  readonly claimNext: (
    command: Readonly<{
      schedulerId: typeof railwayWorkerSchedulerId;
      ownerKey: string;
      currentTick: string;
      observedAt: string;
      leaseSeconds: number;
      maximumCatchUpTicks: number;
    }>,
  ) => Promise<WorkerSchedulerClaimResult>;
  readonly complete: (
    command: Readonly<{
      schedulerId: typeof railwayWorkerSchedulerId;
      ownerKey: string;
      fencingToken: number;
      tick: string;
      completedAt: string;
    }>,
  ) => Promise<WorkerSchedulerCompletionResult>;
}
