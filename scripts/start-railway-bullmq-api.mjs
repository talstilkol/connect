import {
  startRailwayBullMqApiExecutable,
} from "../server/platform/railwayBullMqApiMain.ts";

let activeController = null;
let closing = null;

function removeTelemetryShutdownListeners() {
  process.off("SIGINT", handleTelemetryShutdownSignal);
  process.off("SIGTERM", handleTelemetryShutdownSignal);
}

async function closeActiveController() {
  if (activeController === null) {
    return;
  }
  if (closing === null) {
    closing = activeController.close().finally(() => {
      activeController = null;
      removeTelemetryShutdownListeners();
    });
  }
  await closing;
}

function handleTelemetryShutdownSignal() {
  void closeActiveController().catch(() => {
    try {
      process.stderr.write("Railway BullMQ API shutdown failed\n");
    } finally {
      process.exitCode = 1;
    }
  });
}

export async function runRailwayBullMqApiExecutable() {
  try {
    const controller = await startRailwayBullMqApiExecutable();
    activeController = controller;
    process.on("SIGINT", handleTelemetryShutdownSignal);
    process.on("SIGTERM", handleTelemetryShutdownSignal);
    return controller;
  } catch (error) {
    removeTelemetryShutdownListeners();
    throw error;
  }
}

runRailwayBullMqApiExecutable().catch(() => {
  try {
    process.stderr.write("Railway BullMQ API startup failed\n");
  } finally {
    process.exitCode = 1;
  }
});
