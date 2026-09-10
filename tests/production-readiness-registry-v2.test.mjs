import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../shared/domain/productionReadinessRegistryV2.ts";
import {
  productionReadinessV2CheckIds,
} from "../shared/domain/productionReadinessV2.ts";
import {
  deriveProductionReadinessRegistryV2Digest,
  ProductionReadinessV2ContractError,
  PRODUCTION_READINESS_REGISTRY_V2_DIGEST,
  requireProductionReadinessRegistryV2,
} from "../server/operations/productionReadinessV2.ts";

function replaceDefinition(id, transform) {
  return PRODUCTION_READINESS_REGISTRY_V2.map((definition) =>
    definition.id === id ? transform(definition) : definition
  );
}

test("defines one closed deterministic registry for the six target services", () => {
  requireProductionReadinessRegistryV2(
    PRODUCTION_READINESS_REGISTRY_V2,
  );

  assert.deepEqual(
    PRODUCTION_READINESS_REGISTRY_V2.map(({ id }) => id),
    [...productionReadinessV2CheckIds],
  );
  assert.equal(
    new Set(PRODUCTION_READINESS_REGISTRY_V2.map(({ id }) => id)).size,
    6,
  );
  assert.match(
    PRODUCTION_READINESS_REGISTRY_V2_DIGEST,
    /^production_readiness_registry_v2_[a-f0-9]{64}$/,
  );
  assert.equal(
    deriveProductionReadinessRegistryV2Digest(),
    PRODUCTION_READINESS_REGISTRY_V2_DIGEST,
  );
  assert.equal(Object.isFrozen(PRODUCTION_READINESS_REGISTRY_V2), true);
  assert.equal(
    PRODUCTION_READINESS_REGISTRY_V2.every(
      (definition) =>
        definition.criticality === "production-blocking" &&
        definition.releaseBound === true &&
        Object.isFrozen(definition) &&
        Object.isFrozen(definition.dependencies) &&
        Object.isFrozen(definition.requiredEvidence) &&
        Object.isFrozen(definition.allowedIssuer) &&
        Object.isFrozen(definition.codes),
    ),
    true,
  );
});

test("keeps object storage decision-required under D14 only", () => {
  const objectStorage = PRODUCTION_READINESS_REGISTRY_V2.find(
    ({ id }) => id === "storage.object",
  );

  assert.equal(objectStorage?.decisionId, "D14");
  assert.deepEqual(objectStorage?.requiredEvidence, [
    "object-canary-integrity",
    "object-provider-policy",
  ]);
  assert.equal(
    PRODUCTION_READINESS_REGISTRY_V2.every(
      (definition) =>
        definition.id === "storage.object" || definition.decisionId === null,
    ),
    true,
  );
});

test("fails closed for duplicate, unknown, extended or cyclic definitions", () => {
  const duplicate = [
    ...PRODUCTION_READINESS_REGISTRY_V2.slice(0, -1),
    PRODUCTION_READINESS_REGISTRY_V2[0],
  ];
  const unknown = replaceDefinition(
    "runtime.vercel-web",
    (definition) => ({ ...definition, id: "runtime.unknown" }),
  );
  const extended = replaceDefinition(
    "runtime.vercel-web",
    (definition) => ({ ...definition, extension: true }),
  );
  const cyclic = replaceDefinition(
    "queue.redis-bullmq",
    (definition) => ({
      ...definition,
      dependencies: ["runtime.railway-api"],
    }),
  );
  const unknownOwner = replaceDefinition(
    "runtime.vercel-web",
    (definition) => ({ ...definition, owner: "unassigned-role" }),
  );

  for (const registry of [
    duplicate,
    unknown,
    extended,
    cyclic,
    unknownOwner,
  ]) {
    assert.throws(
      () => requireProductionReadinessRegistryV2(registry),
      (error) =>
        error instanceof ProductionReadinessV2ContractError &&
        error.code === "registry-invalid",
    );
  }
});

test("changes the registry digest when an approved policy field changes", () => {
  const changedOwner = replaceDefinition(
    "runtime.vercel-web",
    (definition) => ({
      ...definition,
      owner: "backend-deployment",
    }),
  );

  assert.notEqual(
    deriveProductionReadinessRegistryV2Digest(changedOwner),
    PRODUCTION_READINESS_REGISTRY_V2_DIGEST,
  );
});
