// Schema versioning: дві версії документа, валідація на перехідний період,
// ледача й пакетна міграції, рівень validationLevel "constraint" (9.0).
// Запуск: mongosh --quiet /work/schema_versioning.js (див. README.md)
const d = db.getSiblingDB("sv");
d.dropDatabase();
const ok = (label, f) => {
  try { f(); print(`${label}: OK`); }
  catch (e) { print(`${label}: ${e.codeName || e.name} (code ${e.code})`); }
};

// v1: телефони окремими полями, без schemaVersion (неявна версія 1)
d.createCollection("users");
d.users.insertMany([
  { _id: 1, name: "Ann", home: "111", work: "222" },
  { _id: 2, name: "Bob", work: "333" },
  { _id: 3, name: "Eve", home: "444" },
]);

const v1 = {
  bsonType: "object", required: ["name"],
  properties: { _id: {}, name: { bsonType: "string" }, home: { bsonType: "string" },
                work: { bsonType: "string" }, schemaVersion: { enum: [1] } },
  additionalProperties: false,
};
const v2 = {
  bsonType: "object", required: ["name", "schemaVersion", "contacts"],
  properties: { _id: {}, name: { bsonType: "string" }, schemaVersion: { enum: [2] },
                contacts: { bsonType: "array", items: { bsonType: "object", required: ["type", "value"] } } },
  additionalProperties: false,
};

// 1. Пастка additionalProperties:false без _id у properties
d.runCommand({ collMod: "users", validator: { $jsonSchema: {
  bsonType: "object", properties: { name: { bsonType: "string" } }, additionalProperties: false } } });
ok("1. additionalProperties:false, _id не описано, insert {name}", () => d.users.insertOne({ name: "X" }));

// 2. oneOf із двох версій
d.runCommand({ collMod: "users", validator: { $jsonSchema: { oneOf: [v1, v2] } },
               validationLevel: "strict", validationAction: "error" });
ok("2a. insert v2", () => d.users.insertOne({ _id: 10, name: "Dan", schemaVersion: 2, contacts: [{ type: "work", value: "555" }] }));
ok("2b. insert v1 без schemaVersion", () => d.users.insertOne({ _id: 11, name: "Old", work: "1" }));
ok("2c. insert з полем-опечаткою", () => d.users.insertOne({ _id: 12, name: "Typo", wrok: "1" }));

// 3. oneOf: документ, що підходить під ОБИДВІ схеми, відхиляється
const loose1 = { bsonType: "object", required: ["name"] };
const loose2 = { bsonType: "object", required: ["name", "schemaVersion"] };
d.runCommand({ collMod: "users", validator: { $jsonSchema: { oneOf: [loose1, loose2] } } });
ok("3a. oneOf, нечіткі схеми, insert {name, schemaVersion:2}", () => d.users.insertOne({ _id: 13, name: "Both", schemaVersion: 2 }));
d.runCommand({ collMod: "users", validator: { $jsonSchema: { anyOf: [loose1, loose2] } } });
ok("3b. те саме з anyOf", () => d.users.insertOne({ _id: 13, name: "Both", schemaVersion: 2 }));
d.users.deleteOne({ _id: 13 });

// 4. strict: оновлення наявного невалідного документа падає; moderate пропускає
d.runCommand({ collMod: "users", validator: { $jsonSchema: v2 }, validationLevel: "strict" });
ok("4a. strict, валідатор лише v2, $set name на v1-документі", () => d.users.updateOne({ _id: 1 }, { $set: { name: "Ann B" } }));
d.runCommand({ collMod: "users", validationLevel: "moderate" });
ok("4b. moderate, той самий $set", () => d.users.updateOne({ _id: 1 }, { $set: { name: "Ann B" } }));
ok("4c. moderate, insert v1", () => d.users.insertOne({ _id: 14, name: "New old", work: "1" }));
d.users.deleteOne({ _id: 14 });

// Повертаємо перехідний валідатор
d.runCommand({ collMod: "users", validator: { $jsonSchema: { oneOf: [v1, v2] } }, validationLevel: "strict" });

// 5. Ледача міграція при читанні: читаємо, якщо v1, переписуємо в v2 умовним оновленням
function toV2(doc) {
  const contacts = [];
  if (doc.home) contacts.push({ type: "home", value: doc.home });
  if (doc.work) contacts.push({ type: "work", value: doc.work });
  return { _id: doc._id, name: doc.name, schemaVersion: 2, contacts };
}
function getUser(id) {
  const doc = d.users.findOne({ _id: id });
  if (!doc || doc.schemaVersion === 2) return doc;
  const nd = toV2(doc);
  // умова на відсутність schemaVersion: якщо паралельний процес уже мігрував, нічого не робимо
  const r = d.users.replaceOne({ _id: id, schemaVersion: { $exists: false } }, nd);
  return r.modifiedCount === 1 ? nd : d.users.findOne({ _id: id });
}
printjson(getUser(1));
print(`5. після ледачої міграції _id 1: v1 лишилось ${d.users.countDocuments({ schemaVersion: { $exists: false } })}`);

// 6. constraint (9.0) відмовляє, поки є документи старої версії
d.runCommand({ collMod: "users", validator: { $jsonSchema: v2 } });
ok("6a. prepareConstraintValidationLevel", () => d.runCommand({ collMod: "users", prepareConstraintValidationLevel: true }));
ok("6b. validationLevel constraint при наявних v1", () => d.runCommand({ collMod: "users", validationLevel: "constraint", validationAction: "error" }));

// 7. Пакетна міграція решти одним pipeline-оновленням (на великих колекціях — батчами)
const r = d.users.updateMany({ schemaVersion: { $exists: false } }, [
  { $set: { schemaVersion: 2, contacts: { $concatArrays: [
      { $cond: [{ $ifNull: ["$home", false] }, [{ type: "home", value: "$home" }], []] },
      { $cond: [{ $ifNull: ["$work", false] }, [{ type: "work", value: "$work" }], []] } ] } } },
  { $unset: ["home", "work"] },
]);
print(`7. пакетна міграція: modified=${r.modifiedCount}`);
ok("7b. validationLevel constraint після міграції", () => d.runCommand({ collMod: "users", validationLevel: "constraint", validationAction: "error" }));
ok("7c. insert v1 при constraint", () => d.users.insertOne({ _id: 20, name: "Late", work: "1" }));
// runCommand({insert}) не кидає виняток на помилку запису: дивимось writeErrors
const byp = d.runCommand({ insert: "users", documents: [{ _id: 21, name: "Bypass" }], bypassDocumentValidation: true });
print(`7d. bypassDocumentValidation при constraint: n=${byp.n} ${byp.writeErrors ? byp.writeErrors[0].errmsg : "без помилки"}`);
ok("7e. зміна validator при constraint", () => d.runCommand({ collMod: "users", validator: { $jsonSchema: { oneOf: [v1, v2] } } }));
// 8. Пошук документів, що не проходять валідатор (так радить і повідомлення сервера)
d.runCommand({ collMod: "users", validationLevel: "strict" });
d.users.insertOne({ _id: 30, name: "Bad", schemaVersion: 2 }, { bypassDocumentValidation: true });
print(`8. невалідні документи через $nor + $jsonSchema: ${d.users.countDocuments({ $nor: [{ $jsonSchema: v2 }] })}`);
