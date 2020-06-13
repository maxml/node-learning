// tsconfig experimentalDecorators
function exDecorators() {
  class IceCreamComponent {
    toppings: string[] = [];

    @Confirmable("Are you sure?")
    @Confirmable("Are you super, super sure? There is no going back!")
    addTopping(topping: string) {
      this.toppings.push(topping);
    }
  }

  // Method Decorator
  function Confirmable(message: string) {
    return function (
      target: Object,
      key: string | symbol,
      descriptor: PropertyDescriptor
    ) {
      const original = descriptor.value;

      descriptor.value = function (...args: any[]) {
        const allow = confirm(message);

        if (allow) {
          const result = original.apply(this, args);
          return result;
        } else {
          return null;
        }
      };

      return descriptor;
    };

    function confirm(message: string): boolean {
      console.log(message);
      return true;
    }
  }

  new IceCreamComponent().addTopping("ex");
}
// exDecorators();

function exMethodDecorator() {
  function logMethod(
    target: Object,
    propertyName: string,
    propertyDesciptor: PropertyDescriptor
  ): PropertyDescriptor {
    // target === Employee.prototype
    // propertyName === "greet"
    // propertyDesciptor === Object.getOwnPropertyDescriptor(Employee.prototype, "greet")
    const method = propertyDesciptor.value;

    propertyDesciptor.value = function (...args: any[]) {
      // convert list of greet arguments to string
      const params = args.map((a) => JSON.stringify(a)).join();

      // invoke greet() and get its return value
      const result = method.apply(this, args);

      // convert result to string
      const r = JSON.stringify(result);

      // display in console the function call details
      console.log(`Call: ${propertyName}(${params}) => ${r}`);

      // return the result of invoking the method
      return result;
    };
    return propertyDesciptor;
  }

  class Employee {
    constructor(private firstName: string, private lastName: string) {}

    @logMethod
    greet(message: string): string {
      return `${this.firstName} ${this.lastName} says: ${message}`;
    }
  }

  const emp = new Employee("Test", "Test");
  emp.greet("hello");
}
// exMethodDecorator();

function exClass() {
  function SelfDriving(constructorFunction: Function) {
    console.log("-- decorator function invoked --");
    constructorFunction.prototype.selfDrivable = true;
  }

  @SelfDriving
  class Car {
    private _make: string;
    constructor(make: string) {
      console.log("-- this constructor invoked --");
      this._make = make;
    }
  }
}
// exClass();

function exParameters() {
  function DecoratedParameter(
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    console.log(target);
    console.log(propertyKey);
    console.log(parameterIndex);
  }

  class TargetDemo {
    public foo1(baz: any, @DecoratedParameter bar: any) {
      console.log("Class method foo");
    }
  }

  const test = new TargetDemo();
  test.foo1("class baz", "class bar");
}
// exParameters();

function exAccessor() {
  function Enumerable(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    //make the method enumerable
    descriptor.enumerable = true;
  }

  class Person {
    simpleField: number = 0;
    _name: string;
    [key: string]: any;

    constructor(name: string) {
      this._name = name;
    }

    @Enumerable
    get name() {
      return this._name + " addit";
    }
  }

  console.log("-- creating instance --");
  const person = new Person("Diana");
  console.log("-- looping --");
  for (let key in person) {
    console.log(key + " = " + person[key]);
  }
}
// exAccessor();

function exProperty() {
  function notNull(target: any, propertyKey: string) {
    Validator.registerNotNull(target, propertyKey);
  }

  class Validator {
    private static notNullValidatorMap: Map<any, string[]> = new Map();

    //todo add more validator maps

    static registerNotNull(target: any, property: any): void {
      let keys: string[] | undefined = this.notNullValidatorMap.get(target);
      if (!keys) {
        keys = [];
        this.notNullValidatorMap.set(target, keys);
      }
      keys.push(property);
    }

    static validate(target: any): boolean {
      let notNullProps: string[] | undefined = this.notNullValidatorMap.get(
        Object.getPrototypeOf(target)
      );
      if (!notNullProps) {
        return true;
      }
      let hasErrors: boolean = false;
      for (const property of notNullProps) {
        let value = target[property];
        if (!value) {
          console.error(property + " value cannot be null");
          hasErrors = true;
        }
      }
      return hasErrors;
    }
  }

  class Person {
    @notNull
    name: string;

    constructor(name: any) {
      this.name = name;
    }
  }

  console.log("-- creating instance --");
  let person: Person = new Person(null);
  console.log(person);
  let b = Validator.validate(person);
  console.log("validation passed: " + !b);
  console.log("-- creating another instance --");
  let person2: Person = new Person("Tina");
  console.log(person2);
  b = Validator.validate(person2);
  console.log("validation passed: " + !b);
}
// exProperty();
