import { createMetaMediaInspectionService } from "../meta/metaMediaInspection.ts";
import { createPostgresMetaMediaUploadJournal } from "./postgresMetaMediaUploadJournal.ts";
import { createPostgresMetaMediaScanRepository } from "./postgresMetaMediaScanRepository.ts";
import { createS3MetaMediaInspector } from "./s3MetaMediaInspector.ts";
import type { S3MetaMediaQuarantineEnvironment } from "./s3MetaMediaQuarantineConfiguration.ts";
import type { PostgresTransactionManager } from "./postgresTransaction.ts";

// Internal composition used by the explicitly enabled inspection Worker. No
// HTTP/serving path, Meta download or S3 upload is exposed by this runtime.
export function createRailwayMetaMediaInspectionRuntime(dependencies: Readonly<{
  environment: S3MetaMediaQuarantineEnvironment;
  transactions: PostgresTransactionManager;
  inspectionOptions?: Parameters<typeof createS3MetaMediaInspector>[1];
  authorizeWork?: () => Promise<void>;
}>) {
  const inspector = createS3MetaMediaInspector(dependencies.environment, dependencies.inspectionOptions);
  const service = createMetaMediaInspectionService({
    inspector, journal: createPostgresMetaMediaUploadJournal(dependencies.transactions),
    scans: createPostgresMetaMediaScanRepository(dependencies.transactions),
    authorizeWork: dependencies.authorizeWork,
  });
  return Object.freeze({ inspect: service.inspect, close: inspector.close });
}
