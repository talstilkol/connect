import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";
import hostingConfig from "./.openai/hosting.json" with {
  type: "json",
};
import { sites } from "./build/sites-vite-plugin.ts";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const CLERK_SAFE_NODE_APIS_IMPORT = "#safe-node-apis";
const CLERK_ESM_PATH_FRAGMENT =
  "/@clerk/nextjs/dist/esm/";
const CLERK_SAFE_NODE_APIS_VIRTUAL_ID =
  "\0connect:clerk-safe-node-apis";
const RSC_DEPENDENCY_OPTIMIZATION_EXCLUSIONS = [
  "@clerk/nextjs",
  "next/link",
];

/**
 * Clerk's ESM-only Node adapter currently contains raw CommonJS `require()`
 * calls. Production builds rewrite those calls, but Cloudflare's Vite module
 * runner executes the dependency as native ESM during development and has no
 * global `require`. Resolve only Clerk's private import to an equivalent ESM
 * module while serving; production continues to use Clerk's published code.
 */
function clerkSafeNodeApisDevInterop(): Plugin {
  return {
    name: "connect:clerk-safe-node-apis-dev-interop",
    apply: "serve",
    enforce: "pre",
    resolveId(source, importer) {
      if (
        source !== CLERK_SAFE_NODE_APIS_IMPORT ||
        !importer
          ?.split("?", 1)[0]
          .includes(CLERK_ESM_PATH_FRAGMENT)
      ) {
        return null;
      }

      return CLERK_SAFE_NODE_APIS_VIRTUAL_ID;
    },
    load(id) {
      if (id !== CLERK_SAFE_NODE_APIS_VIRTUAL_ID) {
        return null;
      }

      return `
        import {
          appendFileSync,
          existsSync,
          mkdirSync,
          readFileSync,
          rmSync,
          writeFileSync,
        } from "node:fs";
        import * as path from "node:path";

        const fs = {
          appendFileSync,
          existsSync,
          mkdirSync,
          readFileSync,
          rmSync,
          writeFileSync,
        };
        const cwd = () => process.cwd();

        export default { fs, path, cwd };
      `;
    },
  };
}

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
  queues: {
    producers: [
      {
        binding: "META_WEBHOOK_QUEUE",
        queue: "connect-meta-webhooks",
      },
      {
        binding: "CAMPAIGN_DELIVERY_QUEUE",
        queue: "connect-campaign-deliveries",
      },
      {
        binding: "TEAM_INVITATION_QUEUE",
        queue: "connect-team-invitations",
      },
    ],
    consumers: [
      {
        queue: "connect-meta-webhooks",
        max_batch_size: 10,
        max_batch_timeout: 5,
        max_retries: 10,
        dead_letter_queue: "connect-meta-webhooks-dlq",
      },
      {
        queue: "connect-campaign-deliveries",
        max_batch_size: 10,
        max_batch_timeout: 5,
        max_retries: 10,
        dead_letter_queue:
          "connect-campaign-deliveries-dlq",
      },
      {
        queue: "connect-team-invitations",
        max_batch_size: 10,
        max_batch_timeout: 5,
        max_retries: 10,
        dead_letter_queue:
          "connect-team-invitations-dlq",
      },
    ],
  },
  triggers: {
    crons: ["* * * * *"],
  },
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    // Clerk exposes both RSC and client boundaries from one package. Keeping
    // it out of pre-bundling prevents Vite from assigning inconsistent module
    // identities to those boundaries during dependency re-optimization.
    optimizeDeps: {
      exclude: [...RSC_DEPENDENCY_OPTIMIZATION_EXCLUSIONS],
    },
    environments: {
      client: {
        optimizeDeps: {
          exclude: [...RSC_DEPENDENCY_OPTIMIZATION_EXCLUSIONS],
        },
      },
      rsc: {
        optimizeDeps: {
          exclude: [...RSC_DEPENDENCY_OPTIMIZATION_EXCLUSIONS],
        },
      },
      ssr: {
        optimizeDeps: {
          exclude: [...RSC_DEPENDENCY_OPTIMIZATION_EXCLUSIONS],
        },
      },
    },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      clerkSafeNodeApisDevInterop(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
