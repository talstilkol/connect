export interface MetaGraphEnvironment {
  META_GRAPH_API_VERSION?: string;
}

export interface MetaGraphConfiguration {
  apiVersion: string;
}

export function requireMetaGraphConfiguration(
  environment: MetaGraphEnvironment,
): MetaGraphConfiguration {
  const apiVersion = environment.META_GRAPH_API_VERSION?.trim();

  if (!apiVersion) {
    throw new Error(
      "Missing required Meta configuration: META_GRAPH_API_VERSION",
    );
  }

  if (
    apiVersion.length > 20 ||
    !/^v[1-9][0-9]*\.[0-9]+$/.test(apiVersion)
  ) {
    throw new Error(
      "META_GRAPH_API_VERSION must use an explicit v<major>.<minor> value",
    );
  }

  return { apiVersion };
}
