// Prints golden lines whose key matches a regex, e.g.
//   node scripts/golden-show.ts '^retail\|DE\|service'
import { readGolden } from '../test/support/matrix.ts';

const pattern = new RegExp(process.argv[2] ?? '.');
let shown = 0;
for (const [k, o] of readGolden()) {
  if (!pattern.test(k)) continue;
  console.log(k, o);
  if (++shown >= 50) break;
}
