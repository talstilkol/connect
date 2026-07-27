import {
  configurationRequiredMetaEmbeddedSignup,
  type MetaEmbeddedSignupView,
} from "../../shared/domain/metaEmbeddedSignupView.ts";
import {
  inspectMetaEmbeddedSignupConfiguration,
  toMetaEmbeddedSignupView,
} from "./metaEmbeddedSignupConfiguration.ts";
import {
  inspectMetaEmbeddedSignupServerReadiness,
} from "./metaEmbeddedSignupServerReadiness.ts";

export async function readCurrentMetaEmbeddedSignup():
Promise<MetaEmbeddedSignupView> {
  try {
    const { env } = await import("cloudflare:workers");
    const clientConfiguration =
      inspectMetaEmbeddedSignupConfiguration(env);
    const serverReadiness =
      inspectMetaEmbeddedSignupServerReadiness(env);

    if (serverReadiness.status === "disabled") {
      return configurationRequiredMetaEmbeddedSignup;
    }

    if (serverReadiness.status === "incomplete") {
      return { status: "configuration-invalid" };
    }

    return toMetaEmbeddedSignupView(clientConfiguration);
  } catch {
    return configurationRequiredMetaEmbeddedSignup;
  }
}
