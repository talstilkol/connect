import {
  createBotReplyStagingProviderCaseInventory,
} from "../operations/botReplyStagingProviderCaseInventory.ts";
import {
  createBotReplyStagingPrivateCaseSource,
  type BotReplyStagingPrivateCaseEnvironment,
} from "../operations/botReplyStagingPrivateCaseSource.ts";
import {
  createBotReplyStagingProviderDriver,
} from "../operations/botReplyStagingProviderDriver.ts";
import {
  createBotReplyStagingObservationSource,
  type BotReplyStagingGraphObservationReader,
  type BotReplyStagingObservationEnvironment,
} from "../operations/botReplyStagingObservationSource.ts";
import {
  createBotReplyStagingRecipientFingerprintDeriver,
  type BotReplyStagingRecipientFingerprintEnvironment,
} from "../operations/botReplyStagingRecipientFingerprint.ts";
import type {
  RailwayBotReplyStagingScenarioDriverFactory,
} from "./railwayPostgresWorkerService.ts";

export interface RailwayBotReplyStagingProviderDriverFactoryOptions {
  readonly environment: BotReplyStagingRecipientFingerprintEnvironment &
    BotReplyStagingPrivateCaseEnvironment &
    BotReplyStagingObservationEnvironment;
}

function requireOptions(
  options:
    Readonly<RailwayBotReplyStagingProviderDriverFactoryOptions>,
): void {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).sort().join(",") !== "environment" ||
    !options.environment || typeof options.environment !== "object"
  ) {
    throw new Error(
      "Railway bot reply staging provider driver options are invalid",
    );
  }
}

export function createRailwayBotReplyStagingProviderDriverFactory(
  options:
    Readonly<RailwayBotReplyStagingProviderDriverFactoryOptions>,
): RailwayBotReplyStagingScenarioDriverFactory {
  requireOptions(options);
  const recipientFingerprints =
    createBotReplyStagingRecipientFingerprintDeriver(options.environment);
  if (
    recipientFingerprints.isConfigured() !== true
  ) {
    throw new Error(
      "Railway bot reply staging provider driver is unavailable",
    );
  }

  return (dependencies) => {
    const graphObservations: BotReplyStagingGraphObservationReader =
      dependencies.graphObservations;
    const securityObservations = dependencies.securityObservations;
    let runtimeConfigured = false;
    try {
      runtimeConfigured =
        typeof graphObservations?.isConfigured === "function" &&
        graphObservations.isConfigured() === true &&
        typeof securityObservations?.isConfigured === "function" &&
        securityObservations.isConfigured() === true &&
        dependencies.durableObservations.isConfigured() === true &&
        dependencies.webhookObservations.isConfigured() === true &&
        dependencies.providerDeferralObservations.isConfigured() === true &&
        dependencies.sendObservations.isConfigured() === true &&
        dependencies.killSwitch.isConfigured() === true;
    } catch {
      runtimeConfigured = false;
    }
    if (!runtimeConfigured) {
      throw new Error(
        "Railway bot reply staging provider driver is unavailable",
      );
    }
    const definitions = createBotReplyStagingPrivateCaseSource(
      options.environment,
      dependencies.clock,
    );
    if (definitions.isConfigured() !== true) {
      throw new Error(
        "Railway bot reply staging provider driver is unavailable",
      );
    }
    const observations = createBotReplyStagingObservationSource(
      options.environment,
      {
        graph: graphObservations,
        durable: dependencies.durableObservations,
        security: securityObservations,
        webhook: dependencies.webhookObservations,
        providerDeferrals: dependencies.providerDeferralObservations,
        send: dependencies.sendObservations,
      },
      dependencies.clock,
    );
    if (observations.isConfigured() !== true) {
      throw new Error(
        "Railway bot reply staging provider driver is unavailable",
      );
    }
    return createBotReplyStagingProviderDriver({
      cases: createBotReplyStagingProviderCaseInventory({
        definitions,
        deliveries: dependencies.deliveries,
        recipientFingerprints,
        serviceWindows: dependencies.serviceWindows,
      }),
      deliveryWorker: dependencies.deliveryWorker,
      observations,
      killSwitch: dependencies.killSwitch,
    });
  };
}
