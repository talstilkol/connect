"use server";

import type {
  ProcessContactImportChunkActionResult,
  StartContactImportActionResult,
} from "./contactImportActionResult.ts";
import { createCurrentRailwayContactImportHandler } from "./currentRailwayContactImportHandler.ts";

export type {
  ProcessContactImportChunkActionResult,
  StartContactImportActionResult,
} from "./contactImportActionResult.ts";

export async function startContactImportAction(
  input: unknown,
): Promise<StartContactImportActionResult> {
  return createCurrentRailwayContactImportHandler().start(input);
}

export async function processContactImportChunkAction(
  input: unknown,
): Promise<ProcessContactImportChunkActionResult> {
  return createCurrentRailwayContactImportHandler().processChunk(input);
}
