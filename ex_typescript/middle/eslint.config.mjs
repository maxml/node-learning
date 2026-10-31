// Заміна tslint.json (TSLint deprecated з 2019): recommended-набори ESLint і
// typescript-eslint; "no-any": true з TSLint → @typescript-eslint/no-explicit-any.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // резолвер GraphQL має позиційні параметри (parent, args, context): _-префікс = не використовується
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
