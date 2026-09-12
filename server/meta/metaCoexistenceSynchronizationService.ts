import { requireTenantPermission, type TenantSession } from '../auth/tenantSession.ts';
import type { MetaEmbeddedSignupView } from '../../shared/domain/metaEmbeddedSignupView.ts';
import { MetaDataSyncError, type MetaDataSyncRepository, type createMetaDataSyncService } from './metaDataSync.ts';
import { isMetaSignupLaunchId } from './metaSignupLaunch.ts';
import { deriveMetaSignupConfigurationKey } from './metaSignupService.ts';
import type { MetaCoexistenceSynchronizationResult } from './metaCoexistenceSignupService.ts';

const terminalFailures = new Set(['unknown','rejected','expired','cancelled']);
const recoverableScopeErrors = new Set(['SYNC_OFFBOARDING_EVIDENCE_REQUIRED','SYNC_SIGNUP_NOT_COMPLETED','SYNC_SIGNUP_CONNECTION_CHANGED','SYNC_REQUEST_ALREADY_BOUND','SYNC_DEADLINE_EXPIRED','SYNC_PHONE_NOT_VERIFIED']);

export function createMetaCoexistenceSynchronizationService(dependencies: Readonly<{
  configuration: MetaEmbeddedSignupView;
  requests: Pick<MetaDataSyncRepository,'prepareFromSignupLaunch'>;
  synchronization: Pick<ReturnType<typeof createMetaDataSyncService>,'execute'> | null;
}>) {
  async function resume(session: TenantSession, launchId: number): Promise<MetaCoexistenceSynchronizationResult> {
    requireTenantPermission(session,'workspace.manage');
    if (!isMetaSignupLaunchId(launchId)) return { status:'recovery-required' };
    if (dependencies.configuration.status !== 'configured') return { status:dependencies.configuration.status };
    if (dependencies.synchronization === null) return { status:'configuration-required' };
    try {
      const configurationKey = await deriveMetaSignupConfigurationKey(dependencies.configuration,true);
      await dependencies.requests.prepareFromSignupLaunch(session,launchId,configurationKey);
      const contacts = await dependencies.synchronization.execute(session,'smb_app_state_sync');
      if (terminalFailures.has(contacts.status)) return { status:'recovery-required' };
      if (contacts.status === 'dispatching') return { status:'in-progress' };
      if (contacts.status !== 'accepted') return { status:'server-error' };
      const history = await dependencies.synchronization.execute(session,'history');
      if (terminalFailures.has(history.status)) return { status:'recovery-required' };
      if (history.status === 'accepted') return { status:'requests-accepted' };
      if (history.status === 'dispatching' || history.status === 'waiting-for-contacts') return { status:'in-progress' };
      return { status:'server-error' };
    } catch (error) {
      return { status:error instanceof MetaDataSyncError && recoverableScopeErrors.has(error.code) ? 'recovery-required' : 'server-error' };
    }
  }
  return Object.freeze({ resume });
}
