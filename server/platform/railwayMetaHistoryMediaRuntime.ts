import type { MetaMediaUploadJournal } from "../meta/metaMediaUploadJournal.ts";
import { createS3MetaMediaQuarantineStorage } from "./s3MetaMediaQuarantineStorage.ts";
import { requireS3MetaMediaQuarantineConfiguration, type S3MetaMediaQuarantineEnvironment } from "./s3MetaMediaQuarantineConfiguration.ts";
import type { MetaCredentialRepository } from "../../db/metaCredentialRepository.ts";
import type { TenantMembershipRepository } from "../../db/tenantMembershipRepository.ts";
import { createMetaCredentialVault, type MetaCredentialEncryptionEnvironment } from "../meta/metaCredentialVault.ts";
import { requireMetaGraphConfiguration, type MetaGraphEnvironment } from "../meta/metaGraphConfiguration.ts";
import { createMetaHistoryMediaAcquisition } from "../meta/metaHistoryMediaAcquisition.ts";
import type { MetaHistoryMediaSource, BoundMetaHistoryMedia } from "../meta/metaHistoryMediaBinding.ts";
import { createMetaMediaDownloader, type MetaMediaDownloadOptions } from "../meta/metaMediaDownload.ts";

// Internal acquisition only: no HTTP route, scheduler activation or file
// publication. The automatic Worker uses the quarantined runtime below.
export function createRailwayMetaHistoryMediaRuntime(dependencies: Readonly<{
  environment: MetaGraphEnvironment & MetaCredentialEncryptionEnvironment;
  media: MetaHistoryMediaSource;
  memberships: Pick<TenantMembershipRepository, "findActiveByExternalUserId">;
  credentials: MetaCredentialRepository;
  transportOptions?: MetaMediaDownloadOptions;
  authorizeWork?: (bound: Readonly<BoundMetaHistoryMedia>) => Promise<void>;
}>) {
  return createMetaHistoryMediaAcquisition({
    media: dependencies.media,
    memberships: dependencies.memberships,
    credentials: createMetaCredentialVault(dependencies.credentials, dependencies.environment),
    downloader: createMetaMediaDownloader(requireMetaGraphConfiguration(dependencies.environment), dependencies.transportOptions),
    authorizeWork: dependencies.authorizeWork,
  });
}


// Internal composition used by the explicitly enabled upload Worker. API
// startup and disabled media Workers never create this storage client.
export function createRailwayMetaHistoryMediaQuarantineRuntime(dependencies: Parameters<typeof createRailwayMetaHistoryMediaRuntime>[0] & Readonly<{
  quarantineEnvironment: S3MetaMediaQuarantineEnvironment;
  uploadJournal: MetaMediaUploadJournal;
  quarantineOptions?: Parameters<typeof createS3MetaMediaQuarantineStorage>[1];
}>) {
  if (!dependencies.uploadJournal) throw new Error("Media upload journal is required");
  const configuration = requireS3MetaMediaQuarantineConfiguration(dependencies.quarantineEnvironment);
  const quarantine = createS3MetaMediaQuarantineStorage(dependencies.quarantineEnvironment, dependencies.quarantineOptions);
  try {
    const service = createMetaHistoryMediaAcquisition({
      media: dependencies.media, memberships: dependencies.memberships,
      credentials: createMetaCredentialVault(dependencies.credentials, dependencies.environment),
      downloader: createMetaMediaDownloader(requireMetaGraphConfiguration(dependencies.environment), dependencies.transportOptions),
      quarantine, uploadJournal: dependencies.uploadJournal,
      authorizeWork: dependencies.authorizeWork,
      uploadTarget: { bucket: configuration.bucket, kmsKeyArn: configuration.kmsKeyArn },
    });
    return Object.freeze({ downloadAndQuarantine: service.downloadAndQuarantine, close: quarantine.close });
  } catch (error) { quarantine.close(); throw error; }
}
