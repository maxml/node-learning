// Resolves ranges with the same library npm itself uses (node-semver).
// Each row: range -> desugared comparator set -> which candidate versions satisfy it.
import semver from 'semver';

const candidates = [
  '0.0.3', '0.0.4', '0.2.3', '0.2.9', '0.3.0',
  '1.2.3', '1.2.9', '1.3.0', '1.9.9', '2.0.0',
  '1.2.3-beta.2', '1.2.3-beta.4', '1.2.4-beta.1', '2.0.0-rc.1',
];

const ranges = [
  '^1.2.3', '~1.2.3', '1.2.x', '*',
  '^0.2.3', '~0.2.3', '^0.0.3',
  '^1.2.3-beta.2', '>=1.2.3-beta.2',
];

for (const r of ranges) {
  const desugared = new semver.Range(r).range;
  const ok = candidates.filter((v) => semver.satisfies(v, r));
  console.log(`${r.padEnd(15)} => ${desugared.padEnd(28)} matches: ${ok.join(' ')}`);
}

console.log('\n-- what npm would pick (maxSatisfying) from the candidates --');
for (const r of ['^1.2.3', '~1.2.3', '^0.2.3', '^0.0.3', '*']) {
  console.log(`${r.padEnd(8)} -> ${semver.maxSatisfying(candidates, r)}`);
}

console.log('\n-- prerelease rule: only the same [major,minor,patch] tuple, unless includePrerelease --');
console.log("satisfies('1.2.4-beta.1', '^1.2.3')                    =", semver.satisfies('1.2.4-beta.1', '^1.2.3'));
console.log("satisfies('1.2.4-beta.1', '^1.2.3', {includePrerelease}) =",
  semver.satisfies('1.2.4-beta.1', '^1.2.3', { includePrerelease: true }));
console.log("satisfies('2.0.0-rc.1', '*')                           =", semver.satisfies('2.0.0-rc.1', '*'));

console.log('\n-- ordering: prerelease < release, build metadata ignored --');
console.log("compare('1.0.0-rc.1', '1.0.0')        =", semver.compare('1.0.0-rc.1', '1.0.0'));
console.log("compare('1.0.0-alpha.10', '1.0.0-alpha.9') =", semver.compare('1.0.0-alpha.10', '1.0.0-alpha.9'));
console.log("compare('1.0.0+build.1', '1.0.0+build.2')  =", semver.compare('1.0.0+build.1', '1.0.0+build.2'));
console.log("valid('v1.2.3') =", semver.valid('v1.2.3'), "  valid('1.2') =", semver.valid('1.2'));
