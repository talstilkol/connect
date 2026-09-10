"use server";

import {
  createCurrentRailwayBusinessProfileHandler,
} from "./currentRailwayBusinessProfileHandler.ts";
import type {
  SaveBusinessProfileActionResult,
} from "./businessProfileActionResult.ts";

export type { SaveBusinessProfileActionResult } from
  "./businessProfileActionResult.ts";

export async function saveBusinessProfileAction(
  input: unknown,
): Promise<SaveBusinessProfileActionResult> {
  return createCurrentRailwayBusinessProfileHandler().save(input);
}
