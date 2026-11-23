import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // A leading underscore marks a parameter that a signature requires but
      // the function does not read, such as a server action's previous state.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      // Dependency and build folders moved aside by scripts/shield-from-icloud.mjs.
      "**/*.nosync/**",
      "next-env.d.ts",
      "cloudflare-env.d.ts",
    ],
  },
]

export default config
