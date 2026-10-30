// `instanceof` для помилок ламається, коли клас існує в двох копіях (два модулі) або помилку
// створено в іншому realm (vm, worker, iframe). TypeScript не бачить різниці: обидва класи
// структурно однакові, тож `catch` компілюється й звужує, а в рантаймі гілка не спрацьовує.
import { NotFoundError } from "./dup/v1/errors.ts";             // копія, яку імпортує застосунок
import { NotFoundError as NotFoundErrorV2 } from "./dup/v2/errors.ts"; // копія, яку імпортує бібліотека
import vm from "node:vm";

// «Бібліотека» кидає помилку зі своєї копії пакета.
function repoFindUser(id: string): never {
  throw new NotFoundErrorV2(`user ${id}`, { cause: new Error("0 rows") });
}

// Тип без жодних касти приймає помилку з іншої копії: структурна сумісність.
const fromOtherCopy: NotFoundError = new NotFoundErrorV2("x");
void fromOtherCopy;

function httpStatus(e: unknown): number {
  if (e instanceof NotFoundError) return 404;
  return 500;
}
function httpStatusBranded(e: unknown): number {
  if (NotFoundError.is(e)) return 404;   // бренд через Symbol.for: спільний для всіх копій
  return 500;
}

try {
  repoFindUser("42");
} catch (e) {
  console.log("1. instanceof NotFoundError (copy v1):", e instanceof NotFoundError, "→ status", httpStatus(e));
  console.log("   instanceof Error:", e instanceof Error, "| name:", (e as Error).name, "| code:", (e as NotFoundError).code);
  console.log("   branded is():", NotFoundError.is(e), "→ status", httpStatusBranded(e));
  console.log("   cause:", ((e as Error).cause as Error).message);
}

// Інший realm: навіть вбудований Error має інший прототип.
const foreign: unknown = vm.runInNewContext("new TypeError('from vm')");
console.log("2. vm error instanceof Error:", foreign instanceof Error, "| Error.isError:", Error.isError(foreign));

// Кинути можна що завгодно, і тип `catch` це знає (useUnknownInCatchVariables).
try {
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw { message: "plain object" };
} catch (e) {
  console.log("3. thrown plain object: instanceof Error:", e instanceof Error, "| Error.isError:", Error.isError(e));
}

// Відхилений проміс не має типу помилки: Promise<T> параметризований лише значенням.
// І `useUnknownInCatchVariables` сюди не дотягується: reason у .catch() має тип `any`.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
const p: Promise<number> = Promise.reject("just a string");
p.catch((reason) => {
  type _reasonIsAny = Expect<Equal<typeof reason, any>>;
  console.log("4. rejection reason typeof:", typeof reason, "(static type: any)");
});
