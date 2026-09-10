import { requireTenantPermission, resolveTenantSessionFromMemberships, TenantSessionError } from '../auth/tenantSession.ts';
import type { TenantMembershipRepository } from '../../db/tenantMembershipRepository.ts';
import type { MetaCredentialRepository } from '../../db/metaCredentialRepository.ts';
import type { MetaDataSyncRepository } from '../meta/metaDataSync.ts';
import { createMetaCoexistenceSynchronizationService } from '../meta/metaCoexistenceSynchronizationService.ts';
import { inspectMetaEmbeddedSignupConfiguration, toMetaEmbeddedSignupView } from '../meta/metaEmbeddedSignupConfiguration.ts';
import { inspectMetaEmbeddedSignupServerReadiness, type MetaEmbeddedSignupServerEnvironment } from '../meta/metaEmbeddedSignupServerReadiness.ts';
import type { MetaGraphTransportOptions } from '../meta/metaGraphTransport.ts';
import type { createPostgresMetaCoexistenceSyncJobRepository, MetaCoexistenceJobOutcome } from './postgresMetaCoexistenceSyncJobRepository.ts';
import { createRailwayMetaDataSyncRuntime } from './railwayMetaDataSyncRuntime.ts';

export function createRailwayMetaCoexistenceMaintenance(dependencies: Readonly<{
  jobs: ReturnType<typeof createPostgresMetaCoexistenceSyncJobRepository>;
  memberships: Pick<TenantMembershipRepository,'findActiveByExternalUserId'>;
  requests: MetaDataSyncRepository;
  credentials: MetaCredentialRepository;
  environment: MetaEmbeddedSignupServerEnvironment;
  transportOptions?: MetaGraphTransportOptions;
}>) {
  const readiness = inspectMetaEmbeddedSignupServerReadiness(dependencies.environment);
  const configuration = readiness.status==='configured'
    ? toMetaEmbeddedSignupView(inspectMetaEmbeddedSignupConfiguration(dependencies.environment))
    : { status:readiness.status==='disabled' ? 'configuration-required' as const : 'configuration-invalid' as const };
  const synchronization = readiness.status==='configured' ? createRailwayMetaDataSyncRuntime(dependencies) : null;
  const continuation = createMetaCoexistenceSynchronizationService({ configuration,synchronization,requests:dependencies.requests });
  return Object.freeze({
    async runNext(): Promise<'idle' | 'processed'> {
      const job = await dependencies.jobs.claimNext();
      if (job===null) return 'idle';
      let outcome: MetaCoexistenceJobOutcome = 'retry';
      try {
        // A durable provider result remains true even after expiry/revocation.
        if (job.settled) outcome='requests-accepted';
        else if (job.expired) outcome='recovery-required';
        else {
          const memberships = await dependencies.memberships.findActiveByExternalUserId(job.actor);
          const session = resolveTenantSessionFromMemberships({ externalUserId:job.actor },memberships,job.tenantId);
          requireTenantPermission(session,'workspace.manage');
          const result = await continuation.resume(session,job.launchId);
          if (result.status==='requests-accepted' || result.status==='recovery-required') outcome=result.status;
        }
      } catch (error) {
        // A failed directory read is retried; an authoritative denial is final.
        if (error instanceof TenantSessionError) outcome='cancelled';
      }
      // CAS rejects completion by an expired worker after another worker claims.
      await dependencies.jobs.finish(job,outcome);
      return 'processed';
    },
    async run() {
      for (let index=0; index<10; index++) if (await this.runNext()==='idle') break;
    },
  });
}
