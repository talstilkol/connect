import type { TenantSession } from '../auth/tenantSession.ts';

export const META_SIGNUP_BEGIN_OPERATION = 'meta.embedded-signup.begin' as const;
export type MetaSignupLaunch = Readonly<{ status: 'ready'; launchId: number; expiresAt: string }>;
export type MetaSignupBeginResult = MetaSignupLaunch | Readonly<{ status: 'attempt-in-progress' | 'configuration-required' | 'configuration-invalid' | 'unauthenticated' | 'onboarding-required' | 'tenant-selection-required' | 'permission-denied' | 'server-error' }>;
export interface MetaSignupLaunchRepository {
  begin(session: TenantSession, configurationKey: string): Promise<MetaSignupLaunch | { status: 'attempt-in-progress' }>;
}
export function isMetaSignupLaunchId(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) > 0; }
export function parseMetaSignupBeginResult(value: unknown): MetaSignupBeginResult | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !('status' in value)) return null;
  if (value.status === 'ready') {
    if (Object.keys(value).sort().join(',') !== 'expiresAt,launchId,status' || !('launchId' in value) || !isMetaSignupLaunchId(value.launchId) ||
      !('expiresAt' in value) || typeof value.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expiresAt) ||
      !Number.isFinite(Date.parse(value.expiresAt)) || new Date(value.expiresAt).toISOString() !== value.expiresAt) return null;
    return Object.freeze({ status: 'ready', launchId: value.launchId, expiresAt: value.expiresAt });
  }
  const statuses = ['attempt-in-progress','configuration-required','configuration-invalid','unauthenticated','onboarding-required','tenant-selection-required','permission-denied','server-error'] as const;
  const status = statuses.find((status) => status === value.status);
  return status && Object.keys(value).join(',') === 'status' ? { status } : null;
}
