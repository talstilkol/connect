"use server";

import type { MetaEmbeddedSignupFlow } from "../../shared/domain/metaEmbeddedSignupView.ts";
import type { MetaSignupBeginResult } from './metaSignupLaunch.ts';
import type { MetaEmbeddedSignupCompletionResult } from "./metaEmbeddedSignupCompletion.ts";
import { createCurrentRailwayMetaSignupHandler } from "./currentRailwayMetaSignupHandler.ts";

export async function beginMetaEmbeddedSignupAction(flow?: MetaEmbeddedSignupFlow): Promise<MetaSignupBeginResult> {
  return createCurrentRailwayMetaSignupHandler().begin(flow);
}

export async function completeMetaEmbeddedSignupAction(input: unknown): Promise<MetaEmbeddedSignupCompletionResult> {
  return createCurrentRailwayMetaSignupHandler().complete(input);
}
