// NOT recognised: the export names only exist at run time.
function build() {
  const api = {};
  for (const name of ['epsilon', 'zeta']) api[name] = name.length;
  return api;
}
module.exports = build();
