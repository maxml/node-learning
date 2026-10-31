// Records what the legacy method does TODAY for every combination of the full
// matrix, quirks included, into test/golden/pricing.golden.jsonl.gz.
// Run once, review (npm run golden:show), commit. Re-run only for a deliberate
// behaviour change, in its own PR.
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LegacyPricingService } from '../src/legacy/pricing.service.ts';
import { cases, GOLDEN_PATH, observe } from '../test/support/matrix.ts';

const lines: string[] = [];
for (const { key, seed } of cases('full')) {
  const o = await observe(seed, (db, n) => {
    const svc = new LegacyPricingService(db, n);
    return { price: (id) => svc.calculatePrice(id) };
  });
  lines.push(JSON.stringify({ k: key, o }));
}
mkdirSync(new URL('.', GOLDEN_PATH), { recursive: true });
// mtime 0 in the gzip header keeps the file byte-identical across re-approvals
writeFileSync(GOLDEN_PATH, gzipSync(lines.join('\n') + '\n', { level: 9 }));
console.log(`approved ${lines.length} cases -> test/golden/pricing.golden.jsonl.gz`);
