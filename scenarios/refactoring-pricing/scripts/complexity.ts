// Cyclomatic (ESLint `complexity`) and cognitive (sonarjs) complexity of every
// function, legacy vs refactored. Types are stripped in memory with Node's own
// stripTypeScriptTypes, so plain ESLint parses the result (no typescript-eslint).
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { ESLint } from 'eslint';
import sonarjs from 'eslint-plugin-sonarjs';

const files = [
  'src/legacy/pricing.service.ts',
  'src/pricing/decide.ts',
  'src/pricing/rules.ts',
  'src/pricing/spec.ts',
  'src/pricing/money.ts',
  'src/pricing/pricing.service.ts',
  'src/pricing/pricing.router.ts',
];

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [{
    files: ['**/*.js'],
    plugins: { sonarjs },
    rules: { complexity: ['warn', { max: 1 }], 'sonarjs/cognitive-complexity': ['warn', 0] },
  }],
});

const rows: { file: string; line: number; kind: string; value: number }[] = [];
for (const file of files) {
  const js = stripTypeScriptTypes(readFileSync(file, 'utf8'));
  const [res] = await eslint.lintText(js, { filePath: file.replace(/\.ts$/, '.js') });
  for (const m of res.messages) {
    const v = /complexity of (\d+)/.exec(m.message) ?? /from (\d+) to the 0 allowed/.exec(m.message);
    if (!v) continue;
    rows.push({ file, line: m.line, kind: m.ruleId === 'complexity' ? 'cyclomatic' : 'cognitive', value: Number(v[1]) });
  }
}

for (const file of files) {
  const mine = rows.filter((r) => r.file === file);
  // ESLint reports cyclomatic only above 1 and sonarjs cognitive only above 0
  const max = (k: string, floor: string) => {
    const v = mine.filter((r) => r.kind === k).map((r) => r.value);
    return v.length ? String(Math.max(...v)) : floor;
  };
  console.log(`${file.padEnd(32)} max cyclomatic ${max('cyclomatic', '<=1').padStart(3)}   max cognitive ${max('cognitive', '0').padStart(3)}`);
}
