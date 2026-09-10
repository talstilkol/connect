import {createRailwayMetaMediaCleanupRuntime} from './railwayMetaMediaCleanupRuntime.ts';
import { inspectMetaCredentialEncryptionConfiguration, type MetaCredentialEncryptionEnvironment } from "../meta/metaCredentialVault.ts";
import { requireMetaGraphConfiguration, type MetaGraphEnvironment } from "../meta/metaGraphConfiguration.ts";
import { createMetaMediaWorker } from "../meta/metaMediaWorker.ts";
import { MetaMediaTaskError, requireMetaMediaTaskKind, type MetaMediaTask } from "../meta/metaMediaTasks.ts";
import { MetaMediaUploadJournalError } from "../meta/metaMediaUploadJournal.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { createMetaMediaWorkerLoop } from "./metaMediaWorkerLoop.ts";
import { createPostgresMetaCredentialRepository } from "./postgresMetaCredentialRepository.ts";
import { createPostgresMetaHistoryMediaRepository } from "./postgresMetaHistoryMediaRepository.ts";
import { createPostgresMetaMediaTaskRepository } from "./postgresMetaMediaTaskRepository.ts";
import { createPostgresMetaMediaUploadJournal } from "./postgresMetaMediaUploadJournal.ts";
import { createPostgresTenantMembershipRepository } from "./postgresTenantMembershipRepository.ts";
import { createRailwayMetaHistoryMediaQuarantineRuntime } from "./railwayMetaHistoryMediaRuntime.ts";
import { createRailwayMetaMediaInspectionRuntime } from "./railwayMetaMediaInspectionRuntime.ts";
import { requireS3MetaMediaQuarantineConfiguration, type S3MetaMediaQuarantineEnvironment } from "./s3MetaMediaQuarantineConfiguration.ts";
import type { PostgresQueryExecutor, PostgresTransactionManager } from "./postgresTransaction.ts";

export interface MetaMediaWorkerEnvironment extends S3MetaMediaQuarantineEnvironment, MetaGraphEnvironment, MetaCredentialEncryptionEnvironment {
  META_MEDIA_WORKER_MODE?: string;
}

// Separate processes use separate AWS roles. Missing mode preserves dormant
// startup; an explicit mode fails before a pool or provider client is created.
export function requireMetaMediaWorkerConfiguration(environment: MetaMediaWorkerEnvironment = {}) {
  const mode = environment.META_MEDIA_WORKER_MODE;
  if (mode === undefined || mode === "disabled") return null;
  const kind = mode === "cleanup" ? "cleanup" : requireMetaMediaTaskKind(mode);
  requireS3MetaMediaQuarantineConfiguration(environment);
  if (kind === "upload") {
    requireMetaGraphConfiguration(environment);
    if (inspectMetaCredentialEncryptionConfiguration(environment) !== "configured") throw new MetaMediaTaskError("INVALID_INPUT");
  }
  return kind;
}

export function createRailwayMetaMediaWorkerRuntime(dependencies: Readonly<{
  environment: MetaMediaWorkerEnvironment;
  transactions: PostgresTransactionManager;
  queries: PostgresQueryExecutor;
  recordFailure: () => void;
  transportOptions?: Parameters<typeof createRailwayMetaHistoryMediaQuarantineRuntime>[0]["transportOptions"];
  quarantineOptions?: Parameters<typeof createRailwayMetaHistoryMediaQuarantineRuntime>[0]["quarantineOptions"];
  cleanupOptions?: Parameters<typeof createRailwayMetaMediaCleanupRuntime>[0]["storageOptions"];
  inspectionOptions?: Parameters<typeof createRailwayMetaMediaInspectionRuntime>[0]["inspectionOptions"];
  timers?: Parameters<typeof createMetaMediaWorkerLoop>[0]["timers"];
}>) {
  const environment = Object.freeze({ ...dependencies.environment });
  const kind = requireMetaMediaWorkerConfiguration(environment);
  if (kind === null) throw new MetaMediaTaskError("INVALID_INPUT");
  if (kind === "cleanup") return createRailwayMetaMediaCleanupRuntime({ environment, transactions: dependencies.transactions, recordFailure: dependencies.recordFailure, timers: dependencies.timers, storageOptions: dependencies.cleanupOptions });
  const tasks = createPostgresMetaMediaTaskRepository(dependencies.transactions);
  const journal = createPostgresMetaMediaUploadJournal(dependencies.transactions);
  const memberships = createPostgresTenantMembershipRepository(dependencies.queries);
  const credentials = createPostgresMetaCredentialRepository(dependencies.queries);
  const media = createPostgresMetaHistoryMediaRepository(dependencies.transactions);
  let closed = false;
  async function authorize(task: MetaMediaTask) {
    if (closed || !await tasks.check(task)) throw new MetaMediaTaskError("STALE_CLAIM");
  }
  const worker = createMetaMediaWorker({
    kind, tasks, journal, memberships, stopping: () => closed,
    async upload(task, session) {
      let workFailure: unknown = null;
      const runtime = createRailwayMetaHistoryMediaQuarantineRuntime({
        environment, quarantineEnvironment: environment, media, memberships, credentials, uploadJournal: journal,
        transportOptions: dependencies.transportOptions, quarantineOptions: dependencies.quarantineOptions,
        async authorizeWork(bound) {
          try { await authorize(task); }
          catch (error) { workFailure = error; throw error; }
          if (bound.scope.tenantId !== task.tenantId || bound.scope.connectionVersion !== task.connectionVersion ||
            await sha256Hex(new TextEncoder().encode(JSON.stringify(bound))) !== task.sourceSha256) {
            throw new MetaMediaUploadJournalError("AUTHORIZATION_CHANGED");
          }
        },
      });
      try { return await runtime.downloadAndQuarantine(session, task.messageKey); }
      // The storage boundary sanitizes authorization errors. Retain the local
      // lease/DB failure so it cannot become a permanent owner cancellation.
      catch (error) { throw workFailure ?? error; }
      finally { runtime.close(); }
    },
    async inspect(task, session) {
      let workFailure: unknown = null;
      const runtime = createRailwayMetaMediaInspectionRuntime({
        environment, transactions: dependencies.transactions, inspectionOptions: dependencies.inspectionOptions,
        async authorizeWork() {
          try { await authorize(task); }
          catch (error) { workFailure = error; throw error; }
        },
      });
      try { return await runtime.inspect(session, task.jobKey); }
      catch (error) { throw workFailure ?? error; }
      finally { runtime.close(); }
    },
  });
  const loop = createMetaMediaWorkerLoop({ run: worker.run, recordFailure: dependencies.recordFailure, timers: dependencies.timers });
  return Object.freeze({ start: loop.start, async close() { closed = true; await loop.close(); } });
}
