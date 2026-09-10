import { createMetaCoexistenceSynchronizationService } from './metaCoexistenceSynchronizationService.ts';
import { requireTenantPermission, type TenantSession } from '../auth/tenantSession.ts';
import type { MetaEmbeddedSignupView } from '../../shared/domain/metaEmbeddedSignupView.ts';
import type { MetaConnectionService } from './metaConnectionService.ts';
import type { MetaConnectionOrchestrator } from './metaConnectionOrchestrator.ts';
import type { MetaDataSyncRepository, createMetaDataSyncService } from './metaDataSync.ts';
import type { MetaSignupAttemptRepository } from './metaSignupAttempt.ts';
import type { MetaSignupLaunchRepository } from './metaSignupLaunch.ts';
import { createMetaSignupService } from './metaSignupService.ts';

export type MetaCoexistenceSynchronizationResult = Readonly<{
  // Acceptance of the two requests is not completion of history ingestion.
  status: 'requests-accepted' | 'in-progress' | 'recovery-required' | 'server-error' | 'configuration-required' | 'configuration-invalid';
}>;
// Internal composition; public API activation requires the complete Coexistence
// client/read path and provider evidence.
export function createMetaCoexistenceSignupService(dependencies: Readonly<{
  configuration: MetaEmbeddedSignupView;
  connections: Pick<MetaConnectionService, 'read'>;
  attempts: MetaSignupAttemptRepository;
  launches: MetaSignupLaunchRepository;
  orchestrator: MetaConnectionOrchestrator | null;
  requests: Pick<MetaDataSyncRepository, 'prepareFromSignupLaunch'>;
  synchronization: Pick<ReturnType<typeof createMetaDataSyncService>, 'execute'> | null;
  deferSynchronization?: boolean;
}>) {
  const registration = createMetaSignupService({ ...dependencies,
    businessApp: { async completeBusinessAppSignup(session, input, context) {
      if (dependencies.orchestrator === null) throw new Error('Business app registration is unavailable');
      return dependencies.orchestrator.completeBusinessAppSignup(session,input,context);
    } },
  });
  const { resume } = createMetaCoexistenceSynchronizationService(dependencies);
  return Object.freeze({
    readConfiguration: registration.readConfiguration,
    async begin(session: TenantSession) {
      requireTenantPermission(session,'workspace.manage');
      if (dependencies.configuration.status !== 'configured') return { status:dependencies.configuration.status };
      if (dependencies.synchronization === null) return { status:'configuration-required' as const };
      return registration.begin(session);
    },
    async complete(session: TenantSession, input: unknown) {
      requireTenantPermission(session,'workspace.manage');
      if (dependencies.configuration.status !== 'configured') return { registration:{ status:dependencies.configuration.status },synchronization:null };
      if (dependencies.synchronization === null) return { registration:{ status:'configuration-required' as const },synchronization:null };
      const submitted = typeof input === 'object' && input !== null && !Array.isArray(input) ? Object.freeze({ ...input }) : input;
      const completed = await registration.complete(session,submitted);
      if (completed.status !== 'connected') return { registration:completed,synchronization:null };
      if (dependencies.deferSynchronization) return { registration:completed,synchronization:null };
      // A connected receipt has committed before preparation or either POST.
      const launchId = (submitted as { launchId:number }).launchId;
      return { registration:completed,synchronization:await resume(session,launchId) };
    },
    resume,
  });
}
