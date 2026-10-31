// A real ES module: both its export and function body are used by the factcheck.
export const config = { timeoutMs: 5000 };

export function writeStringIndex() {
  const text = 'car';
  text[0] = 'b'; // Module code is strict even without a directive.
}
