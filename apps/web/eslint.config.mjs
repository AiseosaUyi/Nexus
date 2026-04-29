import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Codebase-wide rule downgrades. These rules cover ~200 pre-existing
// findings accumulated before lint was wired into CI; treating them as
// warnings keeps awareness without blocking deploys. Tighten back to
// "error" rule-by-rule as cleanup happens.
const downgradedToWarn = {
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": "warn",
  "@typescript-eslint/ban-ts-comment": "warn",
  "@typescript-eslint/no-require-imports": "warn",
  "@next/next/no-img-element": "warn",
  "react/no-unescaped-entities": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/immutability": "warn",
  "react-hooks/exhaustive-deps": "warn",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: downgradedToWarn,
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
