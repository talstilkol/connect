import { defineConfig, globalIgnores } from "eslint/config";
import clerkNext from "@clerk/eslint-plugin/next";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}"],
    plugins: {
      "@clerk/next": clerkNext,
    },
    rules: {
      "@clerk/next/require-auth-protection": [
        "error",
        {
          protected: [
            "app/workspace/**",
            "app/admin/**",
          ],
          resources: {
            routeHandlers: true,
            serverFunctions: false,
            serverComponentEntrypoints: true,
          },
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
