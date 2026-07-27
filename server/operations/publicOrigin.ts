export interface PublicOriginEnvironment {
  APP_PUBLIC_ORIGIN?: string;
  NODE_ENV?: string;
}

function isLocalDevelopmentHost(
  url: URL,
): boolean {
  return (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]"
  );
}

export function resolvePublicOrigin(
  environment: PublicOriginEnvironment,
): string | null {
  const candidate =
    environment.APP_PUBLIC_ORIGIN?.trim();

  if (!candidate) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  const developmentLocalOrigin =
    environment.NODE_ENV === "development" &&
    url.protocol === "http:" &&
    isLocalDevelopmentHost(url);
  const secureProductionOrigin =
    url.protocol === "https:";

  if (
    (!developmentLocalOrigin &&
      !secureProductionOrigin) ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.pathname !== "/" ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    return null;
  }

  return url.origin;
}
