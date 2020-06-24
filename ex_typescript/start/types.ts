function exVariables() {
  // =========== constiable types
  console.log(Number.MAX_SAFE_INTEGER);
  console.log(Number.MAX_SAFE_INTEGER + 1);
  console.log(Number.MAX_VALUE);
  console.log(Number.MIN_VALUE);

  // boolean, number, string
  let isBegginer: boolean;
  isBegginer = true;

  let decimal: number = 6;
  let hex: number = 0xf00d;
  let binary: number = 0b1010;
  let octal: number = 0o744;

  let sentence: string = `dsfgsd
sdfgsd sfdgsdfg ${isBegginer}`;

  console.log("Sentence: " + sentence);

  let a: null = null;
  let b;
  console.log(typeof a);
  console.log(typeof b);

  let list: number[] = [1, 2, 3];
  let list2: Array<number> = [1, 2, 3];

  console.log(list);

  // tuple
  let x: [string, number];
  x = ["hello", 10];
  x = ["true", 10];

  console.log(x[0].substring(1));
  // console.log(x[1].substring(1));

  // any
  let notSure2: any = 4;
  notSure2 = "maybe a string instead";
  notSure2 = false;

  let notSure: any = 4.23;
  // console.log(notSure.toFixed());
  // notSure.ifItExists();

  // Object
  let prettySure: Object = {
    caount: 4,
  };
  console.log(prettySure.toString());
  console.log(prettySure.valueOf());

  Object.create({ prop: 0 });
  Object.create(null);

  // Object.create(42);
  // Object.create("string");
  // Object.create(false);
  // Object.create(undefined);

  // void
  function warnUser(): void {
    console.log("This is my warning message");
  }
  let unusable: void = undefined;
  // unusable = null;

  // never
  function error(message: string): never {
    throw new Error(message);
  }

  function fail() {
    return error("Something failed");
  }
  //   fail();
}
// exVariables();

function exAny() {
  let sayHello = (name: string) => {
    console.log(`Hello, ${name}!`);
  };

  let x = { field: "value" };

  // sayHello(x);

  sayHello(x as any);
  sayHello(<any>x);

  let value: any = "sdf";

  let value2: unknown = 10;
  // (value2 as string).toUpperCase()
}
// exAny();

function exObjects() {
  let myObj = {
    name: "my_obj",
    value: 24,
    tag: null,
  };

  if (myObj.value > 20) {
    // myObj.tag = {};
  }
}
// exObjects();

function nullVsObject() {
  interface Employee1 {
    name: string;
    salary: number;
  }

  // https://github.com/Microsoft/TypeScript/pull/7140
  const a: Employee1 = { name: "Bob", salary: 40000 };
  // const b: Employee1 = { name: "Bob" };
  // const c: Employee1 = { name: "Bob", salary: undefined };
  // const d: Employee1 = { name: null, salary: undefined };
}
// nullVsObject();

function exEnums() {
  const enum Size {
    Small = 2,
    Medium,
    Large,
  }

  console.log(Size.Large);
  console.log(Size["Large"]);

  enum Color {
    Red = 2,
    Green = 8,
    Blue = 10,
  }
  console.log(Color.Red);
  console.log(Color.Blue);
  console.log(Color[Color.Blue]);

  enum Direction {
    Up = "UP",
    Down = "DOWN",
    Left = "LEFT",
    Right = "RIGHT",
  }
  console.log(Direction.Up);
  console.log("====" + Direction.Left.toString());
  console.log("====" + Direction.Left.valueOf());
  console.log(Direction["Up"]);

  enum HeterogeneousEnum {
    No = 0,
    Yes = "YES",
  }
  console.log(HeterogeneousEnum.Yes);
  console.log(HeterogeneousEnum.No);

  let user: string = "sdfsdf";
  enum FileAccess {
    // constant members
    None,
    Read = 1 << 1,
    Write = user.length,
    ReadWrite = Read | Write,
    // computed member
    G = "123".length,
  }
  console.log(FileAccess.None);
  console.log(FileAccess.G);

  enum LogLevel {
    ERROR,
    WARN,
    INFO,
    DEBUG,
  }

  /**
   * This is equivalent to:
   * type LogLevelStrings = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
   */
  type LogLevelStrings = keyof typeof LogLevel;

  function printImportant(key: LogLevelStrings, message: string) {
    const num = LogLevel[key];
    if (num <= LogLevel.WARN) {
      console.log("Log level key is:", key);
      console.log("Log level value is:", num);
      console.log("Log level message is:", message);
    }
  }
  printImportant("ERROR", "This is a message");
}
// exEnums();

function exAssertions() {
  let someValue: any = "this is a string";
  let strLength: number = (<string>someValue).length;

  let someValue2: any = "this is a string";
  let strLength2: number = (someValue2 as string).length;

  let code: any = "123";
  let employeeCode = (<string>code).length;
  console.log(typeof employeeCode);
  console.log(employeeCode);

  let code2: any = { field: "value" };
  let employeeCode2 = (<string>code2).length;
  console.log(typeof employeeCode2);
  console.log(employeeCode2);

  let code3: any = 123;
  let employeeCode3 = <string>code3;
  console.log(typeof employeeCode3);
  console.log(employeeCode3);

  class Foo {
    bar: number = 0;
    bas: string = "";
  }

  const foo = {
    // for the compiler
    // easy to forget adding all the properties
    // break if Foo gets refactored
  } as Foo;

  function handler(event: Event) {
    let element = (event as any) as HTMLElement;
  }
}
// exAssertions();

function varErrors() {
  function sumMatrix(matrix: number[][]) {
    var sum = 0;
    for (var i = 0; i < matrix.length; i++) {
      var currentRow = matrix[i];
      for (var i = 0; i < currentRow.length; i++) {
        sum += currentRow[i];
      }
    }

    return sum;
  }
  console.log(
    "Sum = " +
      sumMatrix([
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
      ])
  );

  for (var i = 0; i < 10; i++) {
    setTimeout(function () {
      console.log(i);
    }, 100 * i);
  }

  for (var i = 0; i < 10; i++) {
    // IIFE
    (function (i) {
      setTimeout(function () {
        console.log(i);
      }, 100 * i);
    })(i);
  }
}
// varErrors();

function exUnions() {
  type Color = "red" | "black" | "white";
  function log(message: string, color: Color) {
    console.log(message);
    console.log(color);
  }

  log("hey", "black");
  // log('ho', 'yellow');

  interface Square {
    kind: "square";
    size: number;
  }
  interface Rectangle {
    kind: "rectangle";
    width: number;
    height: number;
  }
  interface Circle {
    kind: "circle";
    radius: number;
  }

  type Shape = Square | Rectangle | Circle;

  function assertNever(x: never): unknown {
    throw new Error("Unexpected object: " + x);
  }
  function area(s: Shape) {
    switch (s.kind) {
      case "square":
        return s.size * s.size;
      case "rectangle":
        return s.height * s.width;
      case "circle":
        return Math.PI * s.radius ** 2;
      default:
        return assertNever(s);
    }
  }
}
// exUnions();

function exDestructuring() {
  let input = [1, 2];
  let [first, second] = input;
  console.log(first);
  console.log(second);

  input = [1, 2, 3];
  [first, second] = input;
  console.log(first);
  console.log(second);

  input = [1, 2, 3];
  [first, ...input] = input;
  console.log(first);
  console.log(input);

  let tuple: [number, string, boolean] = [7, "hello", true];
  let [a2, b2, c2] = tuple;
  let [, d] = tuple;

  let o = {
    a: "foo",
    b: 12,
    c: "bar",
  };
  // let { a, c } = o;
  // let { e, f } = o;

  let { a: newName1, b: newName2 } = o;

  function f({ a = "", b = 0 } = {}): void {}
  f();

  function keepWholeObject(wholeObject: { a: string; b?: number }) {
    let { a, b = 1001 } = wholeObject;
  }
}
// exDestructuring();

function exLiteral() {
  type Easing = "ease-in" | "ease-out" | "ease-in-out";

  class UIElement {
    animate(dx: number, dy: number, easing: Easing) {
      if (easing === "ease-in") {
        // ...
      } else if (easing === "ease-out") {
      } else if (easing === "ease-in-out") {
      } else {
        // It's possible that someone could reach this
        // by ignoring your types though.
      }

      console.log(easing);
    }
  }

  let button = new UIElement();
  button.animate(0, 0, "ease-in");
  // button.animate(0, 0, "uneasy");

  function rollDice(): 1 | 2 | 3 | 4 | 5 | 6 {
    return (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
  }

  console.log(rollDice());

  interface MapConfig {
    lng: number;
    lat: number;
    tileSize: 8 | 16 | 32;
  }

  console.log({ lng: -73.935242, lat: 40.73061, tileSize: 16 });
}
// exLiteral();

function exTypeOf() {
  function isNumber(x: any): x is number {
    return typeof x === "number";
  }

  function isString(x: any): x is string {
    return typeof x === "string";
  }

  function paddingLeft(value: string, padding: string | number) {
    if (isNumber(padding)) {
      return Array(padding + 1).join(" ") + value;
    }
    if (isString(padding)) {
      return padding + value;
    }
    throw new Error(`Expected string or number, got '${padding}'.`);
  }

  console.log(paddingLeft("10", 10));
  console.log(paddingLeft("10", "10"));
}
// exTypeOf();

function exInstanceOf() {
  interface Padder {
    getPaddingString(): string;
  }

  class SpaceRepeatingPadder implements Padder {
    constructor(private numSpaces: number) {}
    getPaddingString() {
      return Array(this.numSpaces + 1).join(" ");
    }
  }

  class StringPadder implements Padder {
    constructor(private value: string) {}
    getPaddingString() {
      return this.value;
    }
  }

  function getRandomPadder() {
    return Math.random() < 0.5
      ? new SpaceRepeatingPadder(4)
      : new StringPadder("  ");
  }

  let padder: Padder = getRandomPadder();

  if (padder instanceof SpaceRepeatingPadder) {
    console.log("1" + JSON.stringify(padder));
  }
  if (padder instanceof StringPadder) {
    console.log("2" + JSON.stringify(padder));
  }
}
// exInstanceOf();

function exPredicates() {
  interface Bird {
    fly(): any;
    layEggs(): any;
  }

  interface Fish {
    swim(): any;
    layEggs(): any;
  }

  function getSmallPet(): Fish | Bird {
    if (Math.random() > 0.5) {
      return {
        fly: () => {},
      } as Bird;
    } else {
      return {
        swim: () => {},
      } as Fish;
    }
  }
  let pet = getSmallPet();

  // type guards
  function hasName(obj: any): obj is { name: string } {
    return !!obj && typeof obj === "object" && name in obj;
  }

  console.log(hasName);

  // https://github.com/microsoft/TypeScript/issues/33792
  if ((pet as Bird).fly === undefined) {
    (<Fish>pet).swim();
  } else {
    (<Bird>pet).fly();
  }

  console.log((pet as Fish).swim);
  console.log((pet as Bird).fly);

  function isFish(pet: Fish | Bird): pet is Fish {
    return (pet as Fish).swim !== undefined;
  }

  // let pet2: unknown = undefined;
  if (isFish(pet)) {
    pet.swim();
  } else {
    pet.fly();
  }

  function move(pet: Fish | Bird) {
    if ("swim" in pet) {
      return pet.swim();
    }
    return pet.fly();
  }

  const isOfType = <T>(
    varToBeChecked: any,
    propertyToCheckFor: keyof T
  ): varToBeChecked is T =>
    (varToBeChecked as T)[propertyToCheckFor] !== undefined;

  console.log(isOfType<Fish>(pet, "swim"));
  console.log(isOfType<Bird>(pet, "fly"));
  console.log(isOfType(pet, "wadfdf"));
}
// exPredicates();

function exNullable() {
  function broken(name: string | null): string {
    function postfix(epithet: string) {
      return ""; //name.charAt(0) + ".  the " + epithet;
    }
    name = name || "Bob";
    return postfix("great");
  }

  function f(sn: string | null): string {
    if (sn == null) {
      return "default";
    } else {
      return sn;
    }
  }

  function f2(sn: string | null): string {
    return sn || "default";
  }

  function fixed(name: string | null): string {
    function postfix(epithet: string) {
      return name!.charAt(0) + ".  the " + epithet;
    }
    name = name || "Bob";
    return postfix("great");
  }

  console.log(fixed("test"));
  console.log(fixed(null));
}
// exNullable();

function exTypes() {
  type Tree<T> = {
    value: T;
    left: Tree<T>;
    right: Tree<T>;
  };

  type LinkedList<T> = T & { next: LinkedList<T> };

  interface Person {
    name: string;
  }

  const people: LinkedList<Person> = {} as LinkedList<Person>;
  const s = people.name;
  const s1 = people.next.name;
  const s2 = people.next.next.name;
  const s3 = people.next.next.next.name;
}

function interfacesVsAliases() {
  type Alias = { num: number };
  interface Interface {
    num: number;
  }
  // declare function aliased(arg: Alias): Alias;
  // declare function interfaced(arg: Interface): Interface;
}

function exFields() {
  function pluck<T, K extends keyof T>(o: T, propertyNames: K[]): T[K][] {
    return propertyNames.map((n) => o[n]);
  }

  interface ICar {
    manufacturer: string;
    model: string;
    year: number;
  }

  let taxi: ICar = {
    manufacturer: "Toyota",
    model: "Camry",
    year: 2014,
  };

  let makeAndModel: string[] = pluck(taxi, ["manufacturer", "model"]);
  console.log(makeAndModel);

  let modelYear = pluck(taxi, ["model", "year"]);
  console.log(modelYear);

  let carProps: keyof ICar;

  function getProperty<T, K extends keyof T>(o: T, propertyName: K): T[K] {
    return o[propertyName]; // o[propertyName] is of type T[K]
  }
  let name: string = getProperty(taxi, "manufacturer");
  let year: number = getProperty(taxi, "year");
  // let unknown = getProperty(taxi, "unknown");

  console.log(name);
  console.log(year);

  interface LooseObject {
    [key: string]: any;
  }

  const obj: LooseObject = {};
  obj.prop = "value";
  obj.prop2 = 88;

  console.log(obj);

  interface MyType {
    typesafeProp1?: number;
    requiredProp1: string;
    [key: string]: any;
  }

  var obj2: MyType;
  obj2 = { requiredProp1: "foo" }; // valid
  // obj2 = {};
  // obj2.typesafeProp1 = "bar";

  obj.prop = "value";
  obj.prop2 = 88;

  console.log(obj);
}
// exFields();

function exMappedTypes() {
  type Readonly<T> = {
    readonly [P in keyof T]: T[P];
  };
  type Partial<T> = {
    [P in keyof T]?: T[P];
  };

  type PersonPartial = Partial<Person>;
  type ReadonlyPerson = Readonly<Person>;

  type PartialWithNewMember<T> = {
    [P in keyof T]?: T[P];
  } & { newMember: boolean };
}
// exMappedTypes();

/**
 * https://www.staging-typescript.org/docs/handbook/advanced-types.html
 */
function exConditionalTypes() {
  type TypeName<T> = T extends string
    ? "string"
    : T extends number
    ? "number"
    : T extends boolean
    ? "boolean"
    : T extends undefined
    ? "undefined"
    : T extends Function
    ? "function"
    : "object";

  type T0 = TypeName<string>; // "string"
  type T1 = TypeName<"a">; // "string"
  type T2 = TypeName<true>; // "boolean"
  type T3 = TypeName<() => void>; // "function"
  type T4 = TypeName<string[]>; // "object"

  type T10 = TypeName<string | (() => void)>; // "string" | "function"
  type T12 = TypeName<string | string[] | undefined>; // "string" | "object" | "undefined"
  type T11 = TypeName<string[] | number[]>; // "object"

  type BoxedValue<T> = { value: T };
  type BoxedArray<T> = { array: T[] };
  type Boxed<T> = T extends any[] ? BoxedArray<T[number]> : BoxedValue<T>;

  type T20 = Boxed<string>; // BoxedValue<string>;
  type T21 = Boxed<number[]>; // BoxedArray<number>;
  type T22 = Boxed<string | number[]>; // BoxedValue<string> | BoxedArray<number>;

  type Diff<T, U> = T extends U ? never : T; // Remove types from T that are assignable to U
  type Filter<T, U> = T extends U ? T : never; // Remove types from T that are not assignable to U

  type T30 = Diff<"a" | "b" | "c" | "d", "a" | "c" | "f">; // "b" | "d"
  type T31 = Filter<"a" | "b" | "c" | "d", "a" | "c" | "f">; // "a" | "c"
  type T32 = Filter<"a", "f">; // never

  type T33 = Diff<string | number | (() => void), Function>; // string | number
  type T34 = Filter<string | number | (() => void), Function>; // () => void

  type NonNullable<T> = Diff<T, null | undefined>; // Remove null and undefined from T

  type T35 = NonNullable<string | number | undefined>; // string | number
  type T36 = NonNullable<string | string[] | null | undefined>; // string | string[]

  function f1<T>(x: T, y: NonNullable<T>) {
    x = y; // Ok
    // y = x; // Error
  }

  function f2<T extends string | undefined>(x: T, y: NonNullable<T>) {
    x = y; // Ok
    // y = x; // Error
    // let s1: string = x; // Error
    let s2: string = y; // Ok
  }

  type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? K : never;
  }[keyof T];
  type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

  type NonFunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
  }[keyof T];
  type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

  interface Part {
    id: number;
    name: string;
    subparts: Part[];
    updatePart(newName: string): void;
    deletePart(newName: string): void;
  }

  type T40 = FunctionPropertyNames<Part>; // ?
  type T41 = NonFunctionPropertyNames<Part>; // "id" | "name" | "subparts"
  type T42 = FunctionProperties<Part>; // ?
  type T43 = NonFunctionProperties<Part>; // { id: number, name: string, subparts: Part[] }
}

function exInference() {
  type Unpacked<T> = T extends (infer U)[]
    ? U
    : T extends (...args: any[]) => infer U
    ? U
    : T extends Promise<infer U>
    ? U
    : T;

  type T0 = Unpacked<string>; // string
  type T1 = Unpacked<string[]>; // string
  type T2 = Unpacked<() => string>; // string
  type T3 = Unpacked<Promise<string>>; // string
  type T4 = Unpacked<Promise<string>[]>; // Promise<string>
  type T5 = Unpacked<Unpacked<Promise<string>[]>>; // string

  type Foo<T> = T extends { a: infer U; b: infer U } ? U : never;
  type T10 = Foo<{ a: string; b: string }>; // string
  type T11 = Foo<{ a: string; b: number }>; // string | number

  type Bar<T> = T extends { a: (x: infer U) => void; b: (x: infer U) => void }
    ? U
    : never;
  type T20 = Bar<{ a: (x: string) => void; b: (x: string) => void }>; // string
  type T21 = Bar<{ a: (x: string) => void; b: (x: number) => void }>; // string & number
}

// changed tsconfig
function exIterators() {
  let someArray = [1, "string", false];

  for (let entry of someArray) {
    console.log(entry);
  }

  let list = [4, 5, 6];
  for (let i in list) {
    console.log(i);
  }
  for (let i of list) {
    console.log(i);
  }
}
// exIterators();

// https://www.typescriptlang.org/docs/handbook/symbols.html
function exSymbols() {
  const sym = Symbol();

  let obj = {
    [sym]: "value",
  };

  console.log(obj[sym]);

  const getClassNameSymbol = Symbol();

  class C {
    [getClassNameSymbol]() {
      return "C";
    }
  }

  let c = new C();
  let className = c[getClassNameSymbol]();

  // Symbol.
}
// exSymbols();

function exUtility() {
  // https://www.typescriptlang.org/docs/handbook/utility-types.html

  type T00 = Exclude<"a" | "b" | "c" | "d", "a" | "c" | "f">; // "b" | "d"
  type T01 = Extract<"a" | "b" | "c" | "d", "a" | "c" | "f">; // "a" | "c"

  type T02 = Exclude<string | number | (() => void), Function>; // string | number
  type T03 = Extract<string | number | (() => void), Function>; // () => void

  type T04 = NonNullable<string | number | undefined>; // string | number
  type T05 = NonNullable<(() => string) | string[] | null | undefined>; // (() => string) | string[]

  function f1(s: string) {
    return { a: 1, b: s };
  }

  class C {
    x = 0;
    y = 0;
  }

  type T10 = ReturnType<() => string>; // string
  type T11 = ReturnType<(s: string) => void>; // void
  type T12 = ReturnType<<T>() => T>; // {}
  type T13 = ReturnType<<T extends U, U extends number[]>() => T>; // number[]
  type T14 = ReturnType<typeof f1>; // { a: number, b: string }
  type T15 = ReturnType<any>; // any
  type T16 = ReturnType<never>; // never
  // type T17 = ReturnType<string>; // Error
  // type T18 = ReturnType<Function>; // Error

  type T20 = InstanceType<typeof C>; // C
  type T21 = InstanceType<any>; // any
  type T22 = InstanceType<never>; // never
  // type T23 = InstanceType<string>; // Error
  // type T24 = InstanceType<Function>; // Error
}
