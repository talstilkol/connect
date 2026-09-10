import type {
  ProductionReadinessV2Definition,
} from "./productionReadinessV2.ts";

function codes(prefix: string) {
  return Object.freeze({
    ready: `${prefix}_READY`,
    blocked: `${prefix}_BLOCKED`,
    decisionRequired: `${prefix}_DECISION_REQUIRED`,
    unavailable: `${prefix}_UNAVAILABLE`,
    stale: `${prefix}_STALE`,
  });
}

/**
 * Phase 1 policy registry only. It defines what future runtime attestations
 * must prove; it does not claim that any provider or service is currently
 * available. Owner values are stable role identifiers; named primary and
 * backup people remain a D19 assignment outside this phase.
 */
export const PRODUCTION_READINESS_REGISTRY_V2 = Object.freeze([
  Object.freeze({
    id: "queue.redis-bullmq",
    category: "queue",
    criticality: "production-blocking",
    owner: "backend-operations",
    decisionId: null,
    dependencies: Object.freeze([] as const),
    requiredEvidence: Object.freeze([
      "redis-connectivity",
      "redis-durability",
    ] as const),
    allowedIssuer: Object.freeze([
      "railway-api",
      "railway-worker",
    ] as const),
    maximumAgeSeconds: 120,
    releaseBound: true,
    codes: codes("REDIS_BULLMQ"),
  }),
  Object.freeze({
    id: "runtime.railway-api",
    category: "runtime",
    criticality: "production-blocking",
    owner: "backend-deployment",
    decisionId: null,
    dependencies: Object.freeze([
      "queue.redis-bullmq",
      "storage.postgresql",
    ] as const),
    requiredEvidence: Object.freeze([
      "railway-api-release",
    ] as const),
    allowedIssuer: Object.freeze([
      "railway-api",
    ] as const),
    maximumAgeSeconds: 120,
    releaseBound: true,
    codes: codes("RAILWAY_API"),
  }),
  Object.freeze({
    id: "runtime.railway-worker",
    category: "runtime",
    criticality: "production-blocking",
    owner: "backend-operations",
    decisionId: null,
    dependencies: Object.freeze([
      "queue.redis-bullmq",
      "storage.object",
      "storage.postgresql",
    ] as const),
    requiredEvidence: Object.freeze([
      "railway-worker-heartbeat",
    ] as const),
    allowedIssuer: Object.freeze([
      "railway-worker",
    ] as const),
    maximumAgeSeconds: 180,
    releaseBound: true,
    codes: codes("RAILWAY_WORKER"),
  }),
  Object.freeze({
    id: "runtime.vercel-web",
    category: "runtime",
    criticality: "production-blocking",
    owner: "frontend-deployment",
    decisionId: null,
    dependencies: Object.freeze([
      "runtime.railway-api",
    ] as const),
    requiredEvidence: Object.freeze([
      "vercel-deployment-provenance",
      "vercel-railway-auth",
    ] as const),
    allowedIssuer: Object.freeze([
      "vercel-web",
    ] as const),
    maximumAgeSeconds: 600,
    releaseBound: true,
    codes: codes("VERCEL_WEB"),
  }),
  Object.freeze({
    id: "storage.object",
    category: "storage",
    criticality: "production-blocking",
    owner: "security-operations",
    decisionId: "D14",
    dependencies: Object.freeze([] as const),
    requiredEvidence: Object.freeze([
      "object-canary-integrity",
      "object-provider-policy",
    ] as const),
    allowedIssuer: Object.freeze([
      "railway-worker",
    ] as const),
    maximumAgeSeconds: 300,
    releaseBound: true,
    codes: codes("OBJECT_STORAGE"),
  }),
  Object.freeze({
    id: "storage.postgresql",
    category: "storage",
    criticality: "production-blocking",
    owner: "backend-operations",
    decisionId: null,
    dependencies: Object.freeze([] as const),
    requiredEvidence: Object.freeze([
      "postgres-connectivity",
      "postgres-schema",
    ] as const),
    allowedIssuer: Object.freeze([
      "railway-api",
      "railway-worker",
    ] as const),
    maximumAgeSeconds: 120,
    releaseBound: true,
    codes: codes("POSTGRESQL"),
  }),
] satisfies readonly ProductionReadinessV2Definition[]);
