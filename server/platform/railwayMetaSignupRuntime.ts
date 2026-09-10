import type { MetaConnectionService } from "../meta/metaConnectionService.ts";
import type { MetaCredentialRepository } from "../../db/metaCredentialRepository.ts";
import { createMetaCredentialVault } from "../meta/metaCredentialVault.ts";
import { createMetaConnectionRuntime } from "../meta/metaConnectionRuntime.ts";
import { createMetaSignupService } from "../meta/metaSignupService.ts";
import type { MetaSignupLaunchRepository } from '../meta/metaSignupLaunch.ts';
import type { MetaSignupAttemptRepository } from "../meta/metaSignupAttempt.ts";
import { inspectMetaEmbeddedSignupConfiguration, toMetaEmbeddedSignupView } from "../meta/metaEmbeddedSignupConfiguration.ts";
import { inspectMetaEmbeddedSignupServerReadiness, type MetaEmbeddedSignupServerEnvironment } from "../meta/metaEmbeddedSignupServerReadiness.ts";
import { createMetaCoexistenceSignupService } from '../meta/metaCoexistenceSignupService.ts';
import { createRailwayMetaDataSyncRuntime } from './railwayMetaDataSyncRuntime.ts';
import type { MetaDataSyncRepository } from '../meta/metaDataSync.ts';
import type { MetaConnectionRuntimeOptions } from '../meta/metaConnectionRuntime.ts';
import type { MetaSignupService } from '../meta/metaSignupService.ts';
import { requireTenantPermission } from '../auth/tenantSession.ts';

export function readRailwayMetaSignupEnvironment(): MetaEmbeddedSignupServerEnvironment {
  return {
    META_APP_ID: process.env.META_APP_ID,
    META_APP_SECRET: process.env.META_APP_SECRET,
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
    META_EMBEDDED_SIGNUP_CONFIGURATION_ID: process.env.META_EMBEDDED_SIGNUP_CONFIGURATION_ID,
    META_CREDENTIAL_ENCRYPTION_KEY_V1: process.env.META_CREDENTIAL_ENCRYPTION_KEY_V1,
    META_COEXISTENCE_ONBOARDING_MODE: process.env.META_COEXISTENCE_ONBOARDING_MODE,
  };
}

interface RailwayMetaSignupRuntimeDependencies {
  environment: MetaEmbeddedSignupServerEnvironment;
  webhookEnvironment: Readonly<{ META_APP_SECRET?: string }> | null;
  connections: MetaConnectionService;
  credentials: MetaCredentialRepository;
  attempts: MetaSignupAttemptRepository;
  launches: MetaSignupLaunchRepository;
  transportOptions?: MetaConnectionRuntimeOptions;
}

function createSignupContext(dependencies: Readonly<RailwayMetaSignupRuntimeDependencies>) {
  // Signup must use the same app as the configured webhook publisher. A
  // PostgreSQL-only process cannot offer onboarding without that publisher.
  const environment = dependencies.webhookEnvironment === null ? {} : dependencies.environment;
  const readiness = inspectMetaEmbeddedSignupServerReadiness(environment);
  if (readiness.status === "configured" &&
    environment.META_APP_SECRET !== dependencies.webhookEnvironment?.META_APP_SECRET) {
    throw new Error("Railway Meta signup and webhook configuration do not match");
  }
  const configuration = readiness.status === "configured"
    ? toMetaEmbeddedSignupView(inspectMetaEmbeddedSignupConfiguration(environment))
    : { status: readiness.status === "disabled" ? "configuration-required" as const : "configuration-invalid" as const };
  const orchestrator = readiness.status === "configured"
    ? createMetaConnectionRuntime({
        environment,
        connectionService: dependencies.connections,
        credentialVault: createMetaCredentialVault(dependencies.credentials, environment),
        options: dependencies.transportOptions,
      })
    : null;
  return { configuration, orchestrator, environment };
}

export function createRailwayMetaSignupRuntime(dependencies: Readonly<RailwayMetaSignupRuntimeDependencies>) {
  const { configuration, orchestrator } = createSignupContext(dependencies);
  return createMetaSignupService({ configuration, orchestrator,
    connections: dependencies.connections, attempts: dependencies.attempts, launches: dependencies.launches });
}

// Shared internal composition. The API wrapper below selects background
// continuation only when the server explicitly enables the controlled pilot.
export function createRailwayMetaCoexistenceSignupRuntime(dependencies: Readonly<RailwayMetaSignupRuntimeDependencies & {
  requests: MetaDataSyncRepository;
  deferSynchronization?: boolean;
}>) {
  const { configuration, orchestrator, environment } = createSignupContext(dependencies);
  const synchronization = configuration.status === 'configured' && orchestrator !== null
    ? createRailwayMetaDataSyncRuntime({ environment,requests:dependencies.requests,credentials:dependencies.credentials,transportOptions:dependencies.transportOptions })
    : null;
  return createMetaCoexistenceSignupService({ configuration,orchestrator,synchronization,
    deferSynchronization:dependencies.deferSynchronization,
    connections:dependencies.connections,attempts:dependencies.attempts,launches:dependencies.launches,requests:dependencies.requests });
}

// Rollout selection is server-owned. It permits controlled account testing;
// it is not proof that Meta approved an account or that history is complete.
export function createRailwayMetaSignupApiRuntime(dependencies: Readonly<RailwayMetaSignupRuntimeDependencies & {
  requests: MetaDataSyncRepository;
}>): MetaSignupService {
  const cloud = createRailwayMetaSignupRuntime(dependencies);
  const configured = cloud.readConfiguration();
  const enabled = configured.status==='configured' && dependencies.environment.META_COEXISTENCE_ONBOARDING_MODE==='controlled-pilot';
  const business = enabled ? createRailwayMetaCoexistenceSignupRuntime({ ...dependencies,deferSynchronization:true }) : null;
  return Object.freeze({
    readConfiguration: () => enabled ? { ...configured,businessAppEnabled:true as const } : configured,
    async begin(session,flow='cloud-api') {
      requireTenantPermission(session,'workspace.manage');
      if (flow==='business-app') return business === null ? { status:'configuration-required' } : business.begin(session);
      if (flow!=='cloud-api') return { status:'configuration-invalid' };
      return cloud.begin(session);
    },
    async complete(session,input) {
      requireTenantPermission(session,'workspace.manage');
      if (typeof input==='object' && input!==null && 'flow' in input && input.flow==='business-app') {
        if (business===null) return { status:'synchronization-required' };
        const result = await business.complete(session,input);
        return result.registration.status==='connected'
          ? { ...result.registration,synchronization:'background' as const } : result.registration;
      }
      return cloud.complete(session,input);
    },
  } satisfies MetaSignupService);
}
