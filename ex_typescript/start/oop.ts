function exAbstractClass() {
  abstract class Department {
    constructor(public name: string) {
      console.log("from abstract class");
    }

    printName(): void {
      console.log("Department name: " + this.name);
    }

    abstract printMeeting(): void;
  }

  class AccountingDepartment extends Department {
    constructor() {
      super("Accounting and Auditing");
    }

    printMeeting(): void {
      console.log("The Accounting Department meets each Monday at 10am.");
    }

    generateReports(): void {
      console.log("Generating accounting reports...");
    }
  }

  let department: Department;
  // department = new Department();
  department = new AccountingDepartment();
  department.printName();
  department.printMeeting();
  // department.generateReports();

  console.log(department);

  new AccountingDepartment().generateReports();
}
// exAbstractClass();

function exInheritance() {
  class Animal {
    name: string;
    constructor(theName: string) {
      this.name = theName;
    }
    move(distanceInMeters: number = 0) {
      console.log(`${this.name} moved ${distanceInMeters}m.`);
    }
  }

  class Snake extends Animal {
    constructor(name: string) {
      super(name);
    }
    move(distanceInMeters = 5) {
      console.log("Slithering...");
      super.move(distanceInMeters);
    }
  }

  class Horse extends Animal {
    constructor(name: string) {
      super(name);
    }
    move(distanceInMeters = 45) {
      console.log("Galloping...");
      super.move(distanceInMeters);
    }
  }

  let sam = new Snake("Sammy the Python");
  let tom: Animal = new Horse("Tommy the Palomino");

  sam.move();
  tom.move(34);
}
// exInheritance();

function exPolymorphism() {
  class CheckingAccount {
    open(initialAmount: number) {
      console.log(`Initial amount: ${initialAmount}`);
    }
  }

  class BusinessCheckingAccount extends CheckingAccount {
    open(initialAmount: number) {
      if (initialAmount < 1000) {
        throw new Error(
          "Business accounts must have an initial deposit of 1.000 Euros"
        );
      }
      super.open(initialAmount);
    }
  }

  class PersonalCheckingAccount extends CheckingAccount {
    open(initialAmount: number) {
      if (initialAmount <= 0) {
        throw new Error(
          "Personal accounts must have an initial deposit of more than zero Euros"
        );
      }
      super.open(initialAmount);
    }
  }

  const account1: CheckingAccount = new BusinessCheckingAccount();
  try {
    account1.open(301);
  } catch (ex) {
    console.log((ex as Error).message);
  }
  account1.open(1001);

  const account2: CheckingAccount = new PersonalCheckingAccount();
  try {
    account2.open(-1);
  } catch (ex) {
    console.log((ex as Error).message);
  }
  account2.open(1);
}
// exPolymorphism();

function exEncapsulation() {
  class BankMember {
    private _savingsBalance: number;

    constructor(savingsBalance: number) {
      this._savingsBalance = savingsBalance;
    }

    public get savingsBalance(): number {
      return this._savingsBalance;
    }

    public set savingsBalance(newBalance: number) {
      if (newBalance < 0) {
        console.log("Wrong value");
        return;
      }

      this._savingsBalance = newBalance;
    }

    public deposit(amount: number): void {
      this._savingsBalance += amount;
    }

    public withdraw(amount: number): void {
      if (this.savingsBalance < amount) {
        console.log("Insufficient Funds");
        return;
      }

      this._savingsBalance -= amount;
    }
  }
  const chuck: BankMember = new BankMember(3000);

  console.log("\nDepositing Funds");
  chuck.deposit(150);
  console.log(`Chuck's Savings Balance: $${chuck.savingsBalance} \n`);

  console.log("Malicious Account Fraud Happening here.... \n");
  chuck.savingsBalance = -1;
  chuck.savingsBalance = 0;

  console.log("Withdrawing Funds");
  chuck.withdraw(1650);
  console.log(`Chuck's Savings Balance: $${chuck.savingsBalance} \n`);
}
// exEncapsulation();

function exProtectedConstructor() {
  class Person {
    protected name: string;
    protected constructor(theName: string) {
      this.name = theName;
    }
  }

  // Employee can extend Person
  class Employee extends Person {
    private department: string;

    constructor(name: string, department: string) {
      super(name);
      this.department = department;
    }

    public getElevatorPitch() {
      return `Hello, my name is ${this.name} and I work in ${this.department}.`;
    }
  }

  let howard = new Employee("Howard", "Sales");
  // let john = new Person("John");
  console.log(howard.getElevatorPitch());
}
// exProtectedConstructor();

function exSimilarNamesDifferentSense() {
  interface Foo {
    x: number;
  }
  interface Foo {
    y: number;
  }

  let a: Foo = { x: 5, y: 4 };
  console.log(a.x + a.y);

  class Foo2 {
    x: number = 0;
  }

  interface Foo2 {
    y: number;
  }
  let a2: Foo2 = {
    x: 5,
    y: 5,
  };
  console.log(a2.x + a2.y);
}
// exSimilarNamesDifferentSense();

function exAnonymousClass() {
  abstract class Runnable {
    public abstract run(): any;
  }

  const runnable = new (class extends Runnable {
    run() {
      console.log("Hi");
    }
  })();

  runnable.run();
}
// exAnonymousClass();

function exInterfaceCallback() {
  interface IFetcher {
    getObject(done: (data: any, elapsedTime?: number) => void): void;
  }

  class Fetcher implements IFetcher {
    getObject(done: (data: any, elapsedTime?: number) => void) {
      console.log("getObject");
      done(1);
    }
  }

  new Fetcher().getObject(({ field = "value" }) => {
    console.log(field);
  });
  new Fetcher().getObject(({ field = "value", time = 10 }) => {
    console.log(field);
    console.log(time);
  });
  new Fetcher().getObject(() => {
    console.log("no fields");
  });

  interface IGetObjectCallback {
    (data: any): void;
    (data: any, elapsedTime: number): void;
  }

  interface IFetcher2 {
    getObject(done: IGetObjectCallback): void;
  }

  class Fetcher2 implements IFetcher2 {
    getObject(done: IGetObjectCallback): void {
      console.log("getObject2");
      done(1);
    }
  }
  new Fetcher2().getObject(({ field = "value" }) => {
    console.log(field);
  });
  new Fetcher2().getObject(({ field = "value", time = 10 }) => {
    console.log(field);
    console.log(time);
  });
  new Fetcher2().getObject(() => {
    console.log("no fields");
  });
}
// exInterfaceCallback();

function exOverloadingConstructors() {
  interface IBox {
    x: number;
    y: number;
    height: number;
    width: number;
  }

  // union
  class Foo {
    private _name: any;
    constructor(name: string | number) {
      this._name = name;
    }
  }
  const f1 = new Foo("bar");
  const f2 = new Foo(1);

  console.log(f1);
  console.log(f2);

  // optional param
  class Box {
    public x: number;
    public y: number;
    public height: number;
    public width: number;

    constructor();
    constructor(obj: IBox);
    constructor(obj?: any) {
      this.x = (obj && obj.x) || 0;
      this.y = (obj && obj.y) || 0;
      this.height = (obj && obj.height) || 0;
      this.width = (obj && obj.width) || 0;
    }
  }

  // default param
  class Box2 {
    public x: number;
    public y: number;
    public height: number;
    public width: number;

    constructor(obj: IBox = { x: 0, y: 0, height: 0, width: 0 }) {
      this.x = obj.x;
      this.y = obj.y;
      this.height = obj.height;
      this.width = obj.width;
    }
  }

  // static factory
  class Person {
    static fromData(data: PersonData) {
      let { first, last, birthday, gender = "M" } = data;
      return new this(`${last}, ${first}`, birthday, gender);
    }

    private constructor(
      public fullName: string,
      public age: string,
      public gender: "M" | "F"
    ) {}
  }

  interface PersonData {
    first: string;
    last: string;
    birthday: string;
    gender?: "M" | "F";
  }

  // let personA = new Person("Doe, John", "31", "M");
  let personB = Person.fromData({
    first: "John",
    last: "Doe",
    birthday: "10-09-1986",
  });
  console.log(personB);
}
// exOverloadingConstructors();

function exMixin() {
  class Disposable {
    isDisposed: boolean = true;
    dispose() {
      this.isDisposed = true;
    }
  }

  class Activatable {
    isActive: boolean = true;
    activate() {
      this.isActive = true;
    }
    deactivate() {
      this.isActive = false;
    }
  }

  class SmartObject {
    index: number = -1;
    constructor() {
      setInterval(() => {
        console.log(`${this.index}: ${this.isActive} : ${this.isDisposed}`);
        this.index++;
      }, 500);
    }

    interact() {
      this.activate();
      this.dispose();
    }
  }

  interface SmartObject extends Disposable, Activatable {}
  applyMixins(SmartObject, [Disposable, Activatable]);

  let smartObj = new SmartObject();
  setTimeout(() => smartObj.interact(), 1000);

  function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach((baseCtor) => {
      Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) as any
        );
      });
    });
  }
}
// exMixin();

function exMixin2() {
  class Person {
    constructor(public name: string) {}
  }

  interface Loggable {
    log(name: string): void;
  }

  class ConsoleLogger implements Loggable {
    log(name: string) {
      console.log(`Hello, I'm ${name}.`);
    }
  }

  // Takes two objects and merges them together
  function extend<First extends {}, Second extends {}>(
    first: First,
    second: Second
  ): First & Second {
    const result: Partial<First & Second> = {};
    for (const prop in first) {
      if (first.hasOwnProperty(prop)) {
        (result as First)[prop] = first[prop];
      }
    }
    for (const prop in second) {
      if (second.hasOwnProperty(prop)) {
        (result as Second)[prop] = second[prop];
      }
    }
    return result as First & Second;
  }

  const jim = extend(new Person("Jim"), ConsoleLogger.prototype);
  jim.log(jim.name);
}
// exMixin2();
