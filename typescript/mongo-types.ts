// Типізація шару MongoDB: що драйвер (mongodb 7.7.0) і Mongoose (9.11.4) перевіряють,
// а що компілюється й бреше. Функції нижче НЕ викликаються з сервером: файл перевіряє
// `tsc -p tsconfig.backend.json`, а `node mongo-types.ts` запускає лише частину без сервера
// (JSON round trip справжніх ObjectId і Date).
import { ObjectId, type Collection, type WithId, type OptionalUnlessRequiredId } from "mongodb";
import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

interface User {
  _id?: ObjectId;
  email: string;
  name: string;
  createdAt: Date;
  passwordHash: string;
  profile: { age: number };
}

export async function driverDemo(users: Collection<User>) {
  // 1. Вставка: `_id` необов'язковий (OptionalUnlessRequiredId), драйвер згенерує ObjectId.
  await users.insertOne({ email: "a@x", name: "Ann", createdAt: new Date(), passwordHash: "h", profile: { age: 30 } });

  // 2. Читання: WithId<User>, `_id` вже обов'язковий.
  const u = await users.findOne({ email: "a@x" });
  type _readHasId = Expect<Equal<NonNullable<typeof u>["_id"], ObjectId>>;

  // 3. Проєкція змінює форму документа, тип ні. Компілюється, у рантаймі name === undefined.
  const rows = await users.find({}, { projection: { email: 1 } }).toArray();
  type _projectionIgnored = Expect<Equal<typeof rows, WithId<User>[]>>;
  const shout = rows.map((r) => r.name.toUpperCase()); // TypeError у рантаймі, 0 помилок tsc

  // 3b. Generic у findOne<T> драйвер не звіряє з проєкцією: це той самий каст.
  const p = await users.findOne<{ email: string; passwordHash: string }>({}, { projection: { email: 1 } });

  // 4. Filter: неправильний тип відомого поля ловиться...
  // @ts-expect-error TS2769: No overload matches this call (number замість string)
  await users.findOne({ email: 42 });
  // ...а одруківка в імені поля ні: Filter<T> розширює Document.
  await users.findOne({ emial: "a@x" });
  // ...і dot notation теж ні (з драйвера 5.0 за замовчуванням не перевіряється).
  await users.findOne({ "profile.age": "thirty" });

  return { shout, p };
}

// 5. Тип вставки: OptionalUnlessRequiredId робить `_id` необов'язковим, лише якщо в типі його немає
//    або він необов'язковий; з обов'язковим `_id: ObjectId` вставка без нього не компілюється.
interface StrictUser { _id: ObjectId; email: string }
type _strictInsert = Expect<Equal<OptionalUnlessRequiredId<StrictUser>, StrictUser>>;

// 6. Mongoose: тип зі схеми.
const userSchema = new Schema({
  email: { type: String, required: true },
  nickname: String,
  createdAt: { type: Date, default: Date.now },
});
type UserRaw = InferSchemaType<typeof userSchema>;
type _req = Expect<Equal<UserRaw["email"], string>>;
type _opt = Expect<Equal<UserRaw["nickname"], string | null | undefined>>;
const UserModel = model("User", userSchema);
export async function mongooseDemo() {
  const doc = await UserModel.findOne({ email: "a@x" }).orFail();
  const hydrated: HydratedDocument<UserRaw> = doc; // методи документа: save(), toJSON() …
  const lean = await UserModel.findOne().select("email").lean().orFail();
  return { hydrated, len: lean.createdAt.getTime() }; // select("email") тип не звужує
}

// 7. Рантайм без сервера: ObjectId і Date після JSON стають рядками, а тип лишається.
if (import.meta.main) {
  const fromDb: WithId<User> = {
    _id: new ObjectId(), email: "a@x", name: "Ann", createdAt: new Date(), passwordHash: "h", profile: { age: 30 },
  };
  const overHttp = JSON.parse(JSON.stringify(fromDb)) as WithId<User>; // так типізують відповідь API
  console.log("typeof _id       =", typeof overHttp._id, overHttp._id instanceof ObjectId);
  console.log("typeof createdAt =", typeof overHttp.createdAt);
  try {
    overHttp.createdAt.getTime();
  } catch (e) {
    console.log("createdAt.getTime():", (e as Error).message);
  }
  console.log("_id.equals:", (() => { try { return overHttp._id.equals(fromDb._id); } catch (e) { return (e as Error).message; } })());
}
