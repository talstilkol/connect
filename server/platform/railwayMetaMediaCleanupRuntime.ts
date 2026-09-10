import { createMetaMediaCleanupWorker } from '../meta/metaMediaCleanup.ts';
import { createPostgresMetaMediaCleanupRepository } from './postgresMetaMediaCleanupRepository.ts';
import { createS3MetaMediaCleanupStorage } from './s3MetaMediaCleanupStorage.ts';
import { createMetaMediaWorkerLoop } from './metaMediaWorkerLoop.ts';
import type { S3MetaMediaQuarantineEnvironment } from './s3MetaMediaQuarantineConfiguration.ts';
import type { PostgresTransactionManager } from './postgresTransaction.ts';
export function createRailwayMetaMediaCleanupRuntime(dependencies:Readonly<{
  environment:S3MetaMediaQuarantineEnvironment;transactions:PostgresTransactionManager;recordFailure:()=>void;
  timers?:Parameters<typeof createMetaMediaWorkerLoop>[0]['timers'];storageOptions?:Parameters<typeof createS3MetaMediaCleanupStorage>[1];
}>){
  let closed=false;
  const storage=createS3MetaMediaCleanupStorage(dependencies.environment,dependencies.storageOptions);
  const worker=createMetaMediaCleanupWorker({jobs:createPostgresMetaMediaCleanupRepository(dependencies.transactions),storage,stopping:()=>closed});
  const loop=createMetaMediaWorkerLoop({run:worker.run,recordFailure:dependencies.recordFailure,timers:dependencies.timers});
  return Object.freeze({start:loop.start,async close(){closed=true;storage.close();await loop.close();}});
}
