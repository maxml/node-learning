// Thresholds set to report every function, so the output lists the measured value.
// Real projects: ESLint `complexity` default max is 20; sonarjs cognitive-complexity default is 15.
import sonarjs from "eslint-plugin-sonarjs";

export default [
  {
    files: ["**/*.js"],
    plugins: { sonarjs },
    rules: {
      complexity: ["warn", { max: 1 }],
      "sonarjs/cognitive-complexity": ["warn", 0],
    },
  },
];
