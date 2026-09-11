import { isPaddleCustomerPortalUrl } from "../../shared/domain/paddleCustomerPortal.ts";
import { PaddleError, paddleId, type PaddlePlan } from "./paddleProtocol.ts";
export interface PaddleRuntimeEnvironment {
  readonly PADDLE_CUSTOMER_PORTAL_URL?: string;
  readonly PADDLE_ENABLED?: string;
  readonly PADDLE_ENVIRONMENT?: string;
  readonly PADDLE_API_KEY?: string;
  readonly PADDLE_CLIENT_TOKEN?: string;
  readonly PADDLE_WEBHOOK_SECRET?: string;
  readonly PADDLE_PRICE_ID?: string;
  readonly PADDLE_PRODUCT_ID?: string;
  readonly PADDLE_CHECKOUT_BASE_URL?: string;
}
export interface PaddleConfiguration extends PaddlePlan { readonly apiKey: string; readonly webhookSecret: string; readonly clientToken: string; readonly customerPortalUrl: string; }
export function readPaddleEnvironment(): PaddleRuntimeEnvironment {
  return { PADDLE_CUSTOMER_PORTAL_URL: process.env.PADDLE_CUSTOMER_PORTAL_URL, PADDLE_ENABLED: process.env.PADDLE_ENABLED, PADDLE_ENVIRONMENT: process.env.PADDLE_ENVIRONMENT,
    PADDLE_API_KEY: process.env.PADDLE_API_KEY, PADDLE_CLIENT_TOKEN: process.env.PADDLE_CLIENT_TOKEN, PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET,
    PADDLE_PRICE_ID: process.env.PADDLE_PRICE_ID, PADDLE_PRODUCT_ID: process.env.PADDLE_PRODUCT_ID,
    PADDLE_CHECKOUT_BASE_URL: process.env.PADDLE_CHECKOUT_BASE_URL };
}
export function requirePaddleConfiguration(env: PaddleRuntimeEnvironment): PaddleConfiguration | null {
  if (env.PADDLE_ENABLED === undefined || env.PADDLE_ENABLED === "false") return null;
  try {
    if (env.PADDLE_ENABLED !== "true" || !["sandbox", "production"].includes(env.PADDLE_ENVIRONMENT ?? "")) throw Error();
    for (const secret of [env.PADDLE_API_KEY, env.PADDLE_WEBHOOK_SECRET]) if (typeof secret !== "string" || secret.length < 16 || secret.length > 1024 || /\s|[\u0000-\u001f\u007f]/u.test(secret)) throw Error();
    if (!new RegExp(`^${env.PADDLE_ENVIRONMENT === "sandbox" ? "test" : "live"}_[a-zA-Z0-9]{27}$`).test(env.PADDLE_CLIENT_TOKEN ?? "")) throw Error();
    if (!isPaddleCustomerPortalUrl(env.PADDLE_CUSTOMER_PORTAL_URL, env.PADDLE_ENVIRONMENT)) throw Error();
    const url = new URL(env.PADDLE_CHECKOUT_BASE_URL ?? "");
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.port || url.href !== env.PADDLE_CHECKOUT_BASE_URL) throw Error();
    return Object.freeze({ customerPortalUrl: env.PADDLE_CUSTOMER_PORTAL_URL, environment: env.PADDLE_ENVIRONMENT as "sandbox" | "production", apiKey: env.PADDLE_API_KEY!, clientToken: env.PADDLE_CLIENT_TOKEN!, webhookSecret: env.PADDLE_WEBHOOK_SECRET!,
      priceId: paddleId(env.PADDLE_PRICE_ID, "pri"), productId: paddleId(env.PADDLE_PRODUCT_ID, "pro"), checkoutBaseUrl: url.href });
  } catch { throw new PaddleError("CONFIGURATION_REQUIRED"); }
}
