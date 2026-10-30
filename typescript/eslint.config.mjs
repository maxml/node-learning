// typescript-eslint flat config: the type-aware `strictTypeChecked` preset plus
// three rules that are in NO preset but matter for a strict codebase.
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
    },
  },
);
