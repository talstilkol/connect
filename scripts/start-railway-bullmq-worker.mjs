import {
  startRailwayBullMqWorkerMain,
} from "../server/platform/railwayBullMqWorkerMain.ts";

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
      process.stderr.write("Railway BullMQ worker shutdown failed\n");
    } finally {
      process.exitCode = 1;
    }
  });
}

export async function runRailwayBullMqWorkerExecutable() {
  try {
    const controller = await startRailwayBullMqWorkerMain();
    activeController = controller;
    process.on("SIGINT", handleTelemetryShutdownSignal);
    process.on("SIGTERM", handleTelemetryShutdownSignal);
    return controller;
  } catch (error) {
    removeTelemetryShutdownListeners();
    throw error;
  }
}

runRailwayBullMqWorkerExecutable().catch(() => {
  try {
    process.stderr.write("Railway BullMQ worker startup failed\n");
  } finally {
    process.exitCode = 1;
  }
});
