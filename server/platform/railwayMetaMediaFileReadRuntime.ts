import { createMetaMediaFileReadService } from "../meta/metaMediaFileRead.ts";
import { createPostgresMetaMediaFileAuthorization } from "./postgresMetaMediaFileAuthorization.ts";
import { createPostgresMetaMediaScanRepository } from "./postgresMetaMediaScanRepository.ts";
import { createS3MetaMediaFileReader } from "./s3MetaMediaFileReader.ts";
import type { S3MetaMediaQuarantineEnvironment } from "./s3MetaMediaQuarantineConfiguration.ts";
import type { PostgresTransactionManager } from "./postgresTransaction.ts";
import { createPostgresMetaMediaFileAdmission } from "./postgresMetaMediaFileAdmission.ts";

// Binary transport composition; admission is recorded before any S3 work.
// The JSON API and Inbox DTO do not carry buffers, storage locators or permits.
export function createRailwayMetaMediaFileReadRuntime(dependencies: Readonly<{
  environment: S3MetaMediaQuarantineEnvironment; transactions: PostgresTransactionManager;
  readOptions?: Parameters<typeof createS3MetaMediaFileReader>[1];
}>) {
  const reader = createS3MetaMediaFileReader(dependencies.environment, dependencies.readOptions);
  const service = createMetaMediaFileReadService({ reader,
    authorization: createPostgresMetaMediaFileAuthorization(dependencies.transactions),
    scans: createPostgresMetaMediaScanRepository(dependencies.transactions) });
  return Object.freeze({ withFile: service.withFile,
    admit: createPostgresMetaMediaFileAdmission(dependencies.transactions), close: reader.close });
}
