// RegExp semantics that bite: lastIndex, flags, unicode, groups, replace, escape, URL parsing.
const show = (label, v) => console.log(label.padEnd(46), typeof v === 'string' ? v : JSON.stringify(v));

// 1) A /g or /y regex is stateful: test/exec start at lastIndex and move it.
const re = /a/g;
show('/a/g.test("a") x3', [re.test('a'), re.test('a'), re.test('a')]);
const isId = /^\d+$/g; // shared "validator" with a stray g
show('same validator on ["1","2","3"]', ['1', '2', '3'].map((s) => isId.test(s)));
show('without g', ['1', '2', '3'].map((s) => /^\d+$/.test(s)));
const sticky = /foo/y;
sticky.lastIndex = 3;
show('/foo/y at lastIndex 3 on "barfoo"', sticky.test('barfoo'));
sticky.lastIndex = 2;
show('/foo/y at lastIndex 2 (no scanning ahead)', sticky.test('barfoo'));

// 2) match with g drops groups; matchAll keeps them and requires g.
const s = 'id=7, id=42';
show('match(/id=(\\d+)/g)', s.match(/id=(\d+)/g));
show('matchAll groups', [...s.matchAll(/id=(?<n>\d+)/g)].map((m) => m.groups.n));
try { s.matchAll(/id=(\d+)/); } catch (e) { show('matchAll without g', `${e.name}: ${e.message}`); }
try { s.replaceAll(/id/, 'x'); } catch (e) { show('replaceAll without g', `${e.name}: ${e.message}`); }
show('matchAll leaves regex.lastIndex alone', (() => { const r = /\d/g; [...'12'.matchAll(r)]; return r.lastIndex; })());

// 3) d flag: indices of the match and of each group.
show('/(?<y>\\d{4})/d indices.groups.y', /(?<y>\d{4})/d.exec('in 2026').indices.groups.y);

// 4) Unicode: without u, an astral char is two code units.
show('"😀".length, /^.$/.test, /^.$/u.test', ['😀'.length, /^.$/.test('😀'), /^.$/u.test('😀')]);
show('\\w and \\b are ASCII-only even with u', [/\w/u.test('ї'), 'київ'.match(/\bки/u)]);
show('\\p{L} with u', 'Київ 2026'.match(/\p{L}+/gu));
show('/s: dot matches \\n only with s', [/a.b/.test('a\nb'), /a.b/s.test('a\nb')]);
show('/m: ^ per line', 'a\nb'.match(/^\w/gm));

// 5) v flag: set operations and string properties.
show('[\\p{L}--[a-z]] (v)', 'abcДЕ'.match(/[\p{L}--[a-z]]/gv));
show('[\\p{L}&&\\p{Script=Cyrillic}] (v)', 'abКД'.match(/[\p{L}&&\p{Script=Cyrillic}]/gv));
show('\\p{RGI_Emoji} matches a family emoji whole', '👨‍👩‍👧'.match(/^\p{RGI_Emoji}$/v)?.[0].length);
try { new RegExp('[a-z]', 'uv'); } catch (e) { show('u and v together', `${e.name}`); }
show('modifiers (?i:a)b on "Ab" / "AB"', [/(?i:a)b/.test('Ab'), /(?i:a)b/.test('AB')]);
show('duplicate named groups in alternatives', ['2026-10', '10/2026'].map((s) => s.match(/(?<y>\d{4})-\d\d|\d\d\/(?<y>\d{4})/).groups.y));

// 6) Lookbehind, named groups, replace with $<name> and functions.
show('lookbehind price', 'USD 10, EUR 20'.match(/(?<=EUR )\d+/)[0]);
show("replace $<d>.$<m>.$<y>", '2026-10-30'.replace(/(?<y>\d{4})-(?<m>\d\d)-(?<d>\d\d)/, '$<d>.$<m>.$<y>'));
show('replace with a function', 'a1b22'.replace(/\d+/g, (m, offset) => `[${m.length}@${offset}]`));
show('string pattern replaces only first', 'a.a.a'.replace('.', '-'));
show('"$&" in replacement string is special', 'cost'.replace('cost', '$&: $$5'));

// 7) Building a regex from data: escape it.
const user = 'a.b';
show('new RegExp("a.b").test("aXb")', new RegExp(user).test('aXb'));
show('RegExp.escape("a.b")', RegExp.escape(user));
show('escaped: test("aXb"), test("a.b")', [new RegExp(RegExp.escape(user)).test('aXb'), new RegExp(RegExp.escape(user)).test('a.b')]);
try { new RegExp('price (USD'); } catch (e) { show('new RegExp("price (USD")', `${e.name}`); }
show('RegExp.escape("price (USD")', RegExp.escape('price (USD'));

// 8) Validate structure with a parser, not a regex.
for (const u of ['https://example.com/a?b=1', 'javascript:alert(1)', 'http://exa mple.com', 'https://user:pw@evil.com@good.com/']) {
  const ok = URL.canParse(u);
  const p = ok ? new URL(u) : null;
  show(`URL ${JSON.stringify(u)}`, ok ? `protocol=${p.protocol} host=${p.host}` : 'invalid');
}
