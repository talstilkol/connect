export type MetaEmbeddedSignupFlow = "cloud-api" | "business-app";

export type MetaEmbeddedSignupView =
  | {
      status: "configuration-required";
    }
  | {
      status: "configuration-invalid";
    }
  | {
      status: "configured";
      appId: string;
      configurationId: string;
      apiVersion: string;
      // Advertised only by the server's explicitly enabled controlled pilot.
      businessAppEnabled?: true;
    };

export const configurationRequiredMetaEmbeddedSignup:
MetaEmbeddedSignupView = {
  status: "configuration-required",
};
