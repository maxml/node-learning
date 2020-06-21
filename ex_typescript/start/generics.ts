function exGeneric() {
  function identity<T>(arg: T): T {
    return arg;
  }

  let output = identity<string>("myString");
  console.log(output);

  let output2 = identity<number>(1);
  console.log(output2);

  let output3 = identity<Object>({ field: "value" });
  console.log(output3);

  function loggingIdentity<T>(arg: T[]): T[] {
    console.log(arg.length); // Array has a .length, so no more error
    return arg;
  }
}
// exGeneric();

function exExtends() {
  interface Lengthwise {
    length: number;
  }

  class NewLength implements Lengthwise {
    length: number;
    constructor(input: number) {
      this.length = input;
    }
  }

  function loggingIdentity2<T extends Lengthwise>(arg: T): T {
    console.log(arg.length);
    return arg;
  }

  loggingIdentity2({ length: 10, value: 3 });
  loggingIdentity2([]);
  loggingIdentity2("a");
  loggingIdentity2(new NewLength(11));
}
exExtends();

function exConstraint() {
  function getProperty<T, K extends keyof T>(obj: T, key: K) {
    return obj[key];
  }

  let x = { a: 1, b: 2, c: 3, d: 4 };

  console.log(getProperty(x, "a"));
  // getProperty(x, "m");
}
// exConstraint();

function exClassTypes() {
  class BeeKeeper {
    hasMask: boolean = true;
  }

  class ZooKeeper {
    nametag: string = "";
  }

  class Animal {
    numLegs: number = 0;
  }

  class Bee extends Animal {
    keeper: BeeKeeper = { hasMask: true };
  }

  class Lion extends Animal {
    keeper: ZooKeeper = { nametag: "tag" };
  }

  function createInstance<A extends Animal>(Clazz: new () => A): A {
    return new Clazz();
  }

  console.log(createInstance(Lion).keeper.nametag);
  console.log(createInstance(Bee).keeper.hasMask);
}
// exClassTypes();

function exMemoize() {
  function memoize<TS extends any[], R>(
    fn: (...args: TS) => R,
    keyFn?: (...args: TS) => string
  ): (...args: TS) => R {
    const cache: Record<string, { value: R }> = {};
    return (...args: TS) => {
      const key = (
        keyFn ||
        ((args) =>
          args.reduce((acc: any, arg: any) => (acc += String(arg)), ""))
      )(args);
      return (cache[key] || (cache[key] = { value: fn(...args) })).value;
    };
  }

  const fn1 = (a: string) => 1;
  const fn2 = (a: string, b: boolean) => true;
  const fn3 = (a: string, b: boolean, f: (x: number) => void) => 1;
  const fn4 = (a: string, b: boolean, o: object) => 1;

  // (a: string) => number
  const mfn1 = memoize(fn1);

  // (a: string, b: boolean) => boolean
  const mfn2 = memoize(fn2);

  // (a: string, b: boolean, f: (x: number) => void) => number
  const mfn3 = memoize(fn3, (a, b, fn) => `${a}, ${b}, ${fn(1)}`);

  // (a: string, b: boolean, o: object) => number
  const mfn4 = memoize(fn4);
}
