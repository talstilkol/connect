/**
 * Vercel must never receive a Cloudflare binding. Next's production build
 * replaces the Cloudflare-only virtual module with this empty environment so
 * legacy paths remain fail-closed until their Railway adapters are complete.
 */
export const env: Readonly<Record<string, never>> = Object.freeze({});
