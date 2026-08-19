import {
  startRailwayApiExecutable,
} from "../server/platform/railwayApiMain.ts";

export async function runRailwayApiExecutable() {
  return startRailwayApiExecutable();
}

runRailwayApiExecutable().catch(() => {
  try {
    process.stderr.write("Railway API startup failed\n");
  } finally {
    process.exitCode = 1;
  }
});
