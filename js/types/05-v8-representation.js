// Engine detail, not language semantics: how V8 represents some values.
// Needs V8 natives syntax, and %DebugPrint is verbose, so filter it:
//   node --allow-natives-syntax 05-v8-representation.js | grep -E '^#|DebugPrint|- type'
// %DebugPrint output in a release build is terse and its format is not a stable API.

console.log('# pointer compression in this build:', process.config.variables.v8_enable_pointer_compression);

const values = {
  smallInt: 42,
  'max 31-bit Smi (2**30-1)': 2 ** 30 - 1,
  'max 32-bit Smi (2**31-1)': 2 ** 31 - 1,
  '2**31': 2 ** 31,
  fraction: 1.5,
  negZero: -0,
  nan: NaN,
  undef: undefined,
  nul: null,
  bool: true,
};

for (const [name, value] of Object.entries(values)) {
  console.log(`# ${name}`);
  %DebugPrint(value);
}

// A string literal is internalized (one copy per content in the string table);
// a runtime-built string with the same content is a separate, non-internalized object.
// Language-level === compares content anyway, so this is invisible to programs.
const literal = 'hello world';
const built = ['hello', 'world'].join(' ');
console.log('# literal === built (content comparison):', literal === built);
console.log('# literal');
%DebugPrint(literal);
console.log('# built');
%DebugPrint(built);
