import { requireDatabase } from "./d1.ts";

export async function requireRuntimeDatabase() {
  const { env } = await import("cloudflare:workers");

  return requireDatabase(env);
}
