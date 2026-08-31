import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const unavailableCloudflareEnvironment = path.join(
  projectRoot,
  "server/platform/vercelUnavailableCloudflareEnvironment.ts",
);

const nextConfig: NextConfig = {
  webpack(configuration, { webpack }) {
    configuration.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^cloudflare:workers$/,
        unavailableCloudflareEnvironment,
      ),
    );

    return configuration;
  },
};

export default nextConfig;
