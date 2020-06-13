function exInterface() {
  interface SquareConfig {
    color?: string;
    width?: number;
  }

  function initSquare(config: SquareConfig): { color: string; area: number } {
    let newSquare = { color: "white", area: 0 };
    if (config.color) {
      newSquare.color = config.color;
    }
    if (config.width) {
      newSquare.area = config.width * config.width;
    }
    return newSquare;
  }

  let mySquare = initSquare({});
  console.log(mySquare);

  mySquare = initSquare({ color: "black" });
  console.log(mySquare);

  mySquare = initSquare({ color: "black", width: 10 });
  console.log(mySquare);
}
// exInterface();

// readonly vs const
function exReadonly() {
  interface Point {
    readonly x: number;
    readonly y: number;
  }

  let p1: Point = { x: 10, y: 20 };
  console.log(p1);

  class Octopus {
    readonly name: string;
    readonly numberOfLegs: number = 8;
    constructor(theName: string) {
      this.name = theName;
    }
  }
  let dad = new Octopus("Man with the 8 strong legs");
  // dad.name = "Man with the 3-piece suit";

  class Octopus2 {
    readonly numberOfLegs: number = 8;
    constructor(readonly name: string) {}
  }
  console.log(new Octopus2("test").name);
}
// exReadonly();

function exDeclarations() {
  interface SearchFunc {
    (source: string, subString: string): boolean;
  }

  let mySearch: SearchFunc;
  mySearch = function (src: string, sub: string): boolean {
    let result = src.search(sub);
    return result > -1;
  };
  console.log(mySearch);

  interface StringArray {
    [index: number]: string;
  }

  let myArray: StringArray;
  myArray = ["Bob", "Fred"];

  let myStr: string = myArray[0];
  console.log(myStr);

  interface IClock {
    new (hour: number, minute: number): IClock;
    tick(): void;
  }

  function createClock(ctor: IClock, hour: number, minute: number): IClock {
    return new ctor(hour, minute);
  }
}
// exDeclarations();

function exHybrid() {
  interface Counter {
    (start: number): string;
    interval: number;
    reset(): void;
  }

  function getCounter(): Counter {
    let counter = function (start: number) {} as Counter;
    counter.interval = 123;
    counter.reset = function () {};
    return counter;
  }

  let counter = getCounter();
  counter(10);
  counter.reset();
  counter.interval = 5.0;

  console.log(counter);
}
// exHybrid();

function exImplementation() {
  interface ClockInterface {
    currentTime: Date;
    setTime(d: Date): void;
  }

  class Clock implements ClockInterface {
    currentTime: Date = new Date();
    constructor(h: number, m: number) {}
    setTime(d: Date) {
      this.currentTime = d;
    }
  }

  console.log(new Clock(1, 1));
}
// exImplementation();

function exStatic() {
  // class DigitalClock implements ClockInterface {
  //   constructor(h: number, m: number) {}
  //   tick() {
  //     console.log("beep beep");
  //   }
  // }
  // class AnalogClock implements ClockInterface {
  //   constructor(h: number, m: number) {}
  //   tick() {
  //     console.log("tick tock");
  //   }
  // }

  // let digital = createClock(DigitalClock, 12, 17);
  // let analog = createClock(AnalogClock, 7, 32);
  // console.log(digital);
  // console.log(analog);

  // interface ClockConstructor2 {
  //   new (hour: number, minute: number): any;
  // }

  // interface ClockInterface2 {
  //   tick(): any;
  // }

  // const Clock: ClockConstructor2 = class Clock implements ClockInterface2 {
  //   constructor(h: number, m: number) {}
  //   tick() {
  //     console.log("beep beep");
  //   }
  // };

  // console.log(new Clock(1, 1));

  class Grid {
    static origin = { x: 1, y: 1 };
    constructor(public scale: number) {}
    calculateDistanceFromOrigin(point: { x: number; y: number }) {
      let xDist = point.x - Grid.origin.x;
      let yDist = point.y - Grid.origin.y;
      return Math.sqrt(xDist * xDist + yDist * yDist) / this.scale;
    }
  }

  let grid1 = new Grid(1.0); // 1x scale
  let grid2 = new Grid(5.0); // 5x scale

  console.log(grid1.calculateDistanceFromOrigin({ x: 10, y: 10 }));
  console.log(grid2.calculateDistanceFromOrigin({ x: 10, y: 10 }));

  class Pizza {
    private constructor() {}
    static create(event: { name: string; toppings: string[] }): Pizza {
      return { name: event.name, toppings: event.toppings };
    }
  }

  const pizza = Pizza.create({
    name: "Inferno",
    toppings: ["cheese", "peppers"],
  });

  console.log(pizza);
}
// exStatic();

function exExtendingInterfaces() {
  interface Shape {
    color: string;
  }

  interface PenStroke {
    penWidth: number;
  }

  interface Square extends Shape, PenStroke {
    sideLength: number;
  }

  let square = {} as Square;
  square.color = "blue";
  square.sideLength = 10;
  square.penWidth = 5.0;

  console.log(square);
}
// exExtendingInterfaces();

function exExtendingClassViaInterfaces() {
  class Point {
    x: number = 0;
    y: number = 0;
  }

  interface Point3d extends Point {
    z: number;
  }

  let point3d: Point3d = { x: 1, y: 2, z: 3 };
  console.log(point3d);

  class Control {
    private state: any;
  }

  interface IControl {
    state: any;
  }

  interface SelectableControl extends Control {
    select(): void;
  }

  class Button extends Control implements SelectableControl {
    select() {}
  }

  class TextBox extends Control {
    select() {}
  }

  // Error: Property 'state' is missing in type 'Image'.
  // class Image implements SelectableControl {
  //   state: any;
  //   select() {}
  // }

  class Image2 implements IControl {
    state: any;
    select() {}
  }

  class A {
    private f() {
      console.log("f");
    }
    public g() {
      console.log("G");
    }
  }

  class B implements Pick<A, keyof A> {
    public g() {
      console.log("g");
    }
  }

  console.log(new B().g());
  // console.log(new B().f());
}
// exExtendingClassViaInterfaces();

function exPrivateFieldDetail() {
  class Animal {
    private name: string;
    constructor(theName: string) {
      this.name = theName;
    }
  }

  class Rhino extends Animal {
    constructor() {
      super("Rhino");
    }
  }

  class Employee {
    private name: string;
    constructor(theName: string) {
      this.name = theName;
    }
  }

  let animal = new Animal("Goat");
  let rhino = new Rhino();
  let employee = new Employee("Bob");

  animal = rhino;
  // animal = employee;

  console.log(animal);
  console.log(rhino);
  console.log(employee);
}
// exPrivateFieldDetail();

function exProtecredField() {
  class Person {
    protected name: string;
    constructor(name: string) {
      this.name = name;
    }
  }

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
  console.log(howard.getElevatorPitch());
  // console.log(howard.name);
}
// exProtecredField();

function exGettersSetters() {
  const fullNameMaxLength = 10;

  class Employee {
    private _fullName: string = "";

    get fullName(): string {
      console.log("getter");

      return this._fullName;
    }

    set fullName(newName: string) {
      if (newName && newName.length > fullNameMaxLength) {
        throw new Error("fullName has a max length of " + fullNameMaxLength);
      }

      this._fullName = newName;
    }
  }

  let employee = new Employee();
  employee.fullName = "Bob Smith";
  if (employee.fullName) {
    console.log(employee.fullName);
  }
}
// exGettersSetters();

function exAbstractClass() {
  abstract class Department {
    constructor(public name: string) {}

    printName(): void {
      console.log("Department name: " + this.name);
    }

    abstract printMeeting(): void; // must be implemented in derived classes
  }

  class AccountingDepartment extends Department {
    constructor() {
      super("Accounting and Auditing"); // constructors in derived classes must call super()
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

function exStaticFieldChanging() {
  class Greeter {
    static standardGreeting = "Hello, there";
    greeting: string = "";
    greet() {
      if (this.greeting) {
        return "Hello, " + this.greeting;
      } else {
        return Greeter.standardGreeting;
      }
    }
  }

  let greeter1: Greeter;
  greeter1 = new Greeter();
  console.log(greeter1.greet());

  let greeterMaker: typeof Greeter = Greeter;
  greeterMaker.standardGreeting = "Hey there!";

  let greeter2: Greeter = new greeterMaker();
  console.log(greeter2.greet());
}
// exStaticFieldChanging();

function exUnion() {
  class NetworkLoadingState {
    state: string = "loading";
  }

  class NetworkFailedState {
    state: string = "failed";
    code: number = 0;
  }

  class NetworkSuccessState {
    state: string = "success";
    response = {
      title: "",
      duration: 0,
      summary: "",
    };
  }

  // Create a type which represents only one of the above types
  // but you aren't sure which it is yet.
  type NetworkState =
    | NetworkLoadingState
    | NetworkFailedState
    | NetworkSuccessState;

  console.log({} as NetworkState);

  function networkStatus(state: NetworkState): string | undefined {
    // By switching on state, TypeScript can narrow the union
    // down in code flow analysis
    switch (state.state) {
      case "loading":
        return "Downloading...";
      case "failed":
        // The type must be NetworkFailedState here,
        // so accessing the `code` field is safe
        return `Error ${(state as NetworkFailedState).code} downloading`;
      case "success":
        return `Downloaded ${(state as NetworkSuccessState).response.title} - ${
          (state as NetworkSuccessState).response.summary
        }`;
    }
  }

  console.log(networkStatus({ state: "failed", code: 100 }));
}
// exUnion();

function exIntersection() {
  interface ErrorHandling {
    success: boolean;
    error?: { message: string };
  }

  interface ArtworksData {
    artworks: { title: string }[];
  }

  interface ArtistsData {
    artists: { name: string }[];
  }

  type ArtworksResponse = ArtworksData & ErrorHandling;
  type ArtistsResponse = ArtistsData & ErrorHandling;

  const handleArtistsResponse = (response: ArtistsResponse) => {
    if (response.error) {
      console.error(response.error.message);
      return;
    }

    console.log(response.artists);
  };

  handleArtistsResponse({ artists: [{ name: "Test" }], success: true });
}
// exIntersection();

function exMixin() {
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
// exMixin();

function exToString() {
  class Foo {
    private id: number = 23423;
    public toString = (): string => {
      return `Foo (id: ${this.id})`;
    };
  }

  class Bar extends Foo {
    private name: string = "Some name";
    public toString = (): string => {
      return `Bar (${this.name})`;
    };
  }

  let a: Foo = new Foo();
  console.log(a);
  console.log("" + a);
  console.log(`${a}`);

  let b: Bar = new Bar();
  console.log(b);
  console.log("" + b);
  console.log(`${b}`);

  let c: Foo = new Bar();
  console.log(c);
  console.log("" + c);
  console.log(`${c}`);
}
// exToString();
