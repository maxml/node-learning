// One choke point for the tenant filter, two variants.

class TenantFilterError extends Error {}

// A filter is tenant-scoped only if tenantId is a plain equality on a string,
// at the top level or inside a top-level $and. { tenantId: { $ne: "x" } } or
// { tenantId: { $exists: true } } has the key but matches other tenants.
function tenantOf(filter) {
  if (!filter || typeof filter !== "object") return null;
  if (typeof filter.tenantId === "string") return filter.tenantId;
  if (Array.isArray(filter.$and)) {
    for (const f of filter.$and) {
      const t = tenantOf(f);
      if (t) return t;
    }
  }
  return null;
}

function assertScoped(filter, op) {
  const t = tenantOf(filter);
  if (!t) throw new TenantFilterError(`${op}: filter without equality on tenantId: ${JSON.stringify(filter)}`);
  return t;
}

// Variant 1: scoped repository. The caller never passes tenantId; it comes from the
// request context (the credential, not the body) and is merged into every filter.
function scopedCollection(collection, tenantId) {
  if (typeof tenantId !== "string" || !tenantId) throw new TenantFilterError("tenantId required");
  const scope = (f = {}) => ({ $and: [{ tenantId }, f] });
  return {
    find: (f, o) => collection.find(scope(f), o),
    findOne: (f, o) => collection.findOne(scope(f), o),
    countDocuments: (f, o) => collection.countDocuments(scope(f), o),
    updateOne: (f, u, o) => collection.updateOne(scope(f), u, o),
    updateMany: (f, u, o) => collection.updateMany(scope(f), u, o),
    deleteMany: (f, o) => collection.deleteMany(scope(f), o),
    insertOne: (d, o) => collection.insertOne({ ...d, tenantId }, o),
    aggregate: (p, o) => collection.aggregate([{ $match: { tenantId } }, ...p], o),
  };
}

// Variant 2: guard. Wraps a raw driver Collection and rejects every read/write whose
// filter is not tenant-scoped. Fails closed: methods not on the list are blocked.
const FILTER_FIRST = new Set([
  "find", "findOne", "countDocuments", "updateOne", "updateMany",
  "replaceOne", "deleteOne", "deleteMany", "findOneAndUpdate", "findOneAndDelete",
  "findOneAndReplace",
]);

function guardedCollection(collection) {
  return new Proxy(collection, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (typeof v !== "function") return v; // plain properties (collectionName, …)
      if (FILTER_FIRST.has(prop)) {
        return (filter, ...rest) => {
          assertScoped(filter, prop);
          return v.call(target, filter, ...rest);
        };
      }
      if (prop === "distinct") {
        return (key, filter, ...rest) => { assertScoped(filter, prop); return v.call(target, key, filter, ...rest); };
      }
      if (prop === "insertOne") {
        return (doc, ...rest) => { assertScoped(doc, prop); return v.call(target, doc, ...rest); };
      }
      if (prop === "insertMany") {
        return (docs, ...rest) => { docs.forEach((d) => assertScoped(d, prop)); return v.call(target, docs, ...rest); };
      }
      if (prop === "aggregate") {
        return (pipeline = [], ...rest) => {
          assertScoped(pipeline[0]?.$match, prop); // first stage must be the tenant $match
          return v.call(target, pipeline, ...rest);
        };
      }
      return () => { throw new TenantFilterError(`${prop}: not allowed through the tenant guard`); };
    },
  });
}

module.exports = { TenantFilterError, tenantOf, assertScoped, scopedCollection, guardedCollection };
