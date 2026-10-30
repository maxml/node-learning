// The string export name "module.exports" tells require(esm) what to return instead of the namespace.
class Client { constructor(url) { this.url = url; } }
export { Client as 'module.exports' };
