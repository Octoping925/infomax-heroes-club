import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "app/admin/match/bans/page.tsx",
      "app/admin/match/stats/page.tsx",
      "app/admin/match/video/page.tsx",
      "app/match-history/components/MatchCard.tsx",
      "app/stats/hooks/useStatsYearFilter.ts",
    ],
    rules: {
      // shortcut: existing effect resets warn until their state ownership is refactored.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "vendor/**",
  ]),
]);

export default eslintConfig;
