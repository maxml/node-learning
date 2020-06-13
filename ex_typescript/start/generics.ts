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
  loggingIdentity2("");
  loggingIdentity2(new NewLength(10));
}
// exExtends();

function exConstraint() {
  function getProperty<T, K extends keyof T>(obj: T, key: K) {
    return obj[key];
  }

  let x = { a: 1, b: 2, c: 3, d: 4 };

  console.log(getProperty(x, "a"));
  //   getProperty(x, "m");
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
    keeper: ZooKeeper = { nametag: "" };
  }

  function createInstance<A extends Animal>(c: new () => A): A {
    return new c();
  }

  console.log(createInstance(Lion).keeper.nametag);
  console.log(createInstance(Bee).keeper.hasMask);
}
// exClassTypes();
