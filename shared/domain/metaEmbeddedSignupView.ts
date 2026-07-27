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
    };

export const configurationRequiredMetaEmbeddedSignup:
MetaEmbeddedSignupView = {
  status: "configuration-required",
};
