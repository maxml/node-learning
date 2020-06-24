// tsconfig: experimentalDecorators
function exDecorators() {
  class IceCreamComponent {
    toppings: string[] = [];

    @Confirmable("Are you sure?")
    @Confirmable("Are you super, super sure? There is no going back!")
    addTopping(topping: string) {
      console.log("addTopping");
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
          return original.apply(this, args);
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
  function LogMethod(
    target: Object,
    propertyName: string,
    propertyDesciptor: PropertyDescriptor
  ): PropertyDescriptor {
    // target === Employee.prototype
    // propertyName === "greet"
    // propertyDesciptor === Object.getOwnPropertyDescriptor(Employee.prototype, "greet")
    const method = propertyDesciptor.value;

    propertyDesciptor.value = function (...args: any[]) {
      const params = args.map((a) => JSON.stringify(a)).join();
      const result = method.apply(this, args);
      const jsonResult = JSON.stringify(result);

      console.log(`Call: ${propertyName}(${params}) => ${jsonResult}`);

      return result;
    };
    return propertyDesciptor;
  }

  class Employee {
    constructor(private firstName: string, private lastName: string) {}

    @LogMethod
    greet(message: string): string {
      return `${this.firstName} ${this.lastName} says: ${message}`;
    }
  }

  const emp = new Employee("Test", "Test");
  emp.greet("hello");
}
// exMethodDecorator();

function exClassDecorator() {
  function SelfDriving(constructorFunction: Function) {
    console.log("-- decorator function invoked --");
    constructorFunction.prototype.selfDrivable = "true";
  }

  @SelfDriving
  class Car {
    private _make: string;
    constructor(make: string) {
      console.log("-- this constructor invoked --");
      this._make = make;
    }
  }

  const car = new Car("makeTest");
  // @ts-ignore
  console.log(car.selfDrivable);
}
// exClassDecorator();

function exParameterDecorator() {
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
// exParameterDecorator();

function exAccessorDecorator() {
  function Enumerable(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
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
// exAccessorDecorator();

function exPropertyDecorator() {
  function NotNull(target: any, propertyKey: string) {
    Validator.registerNotNull(target, propertyKey);
  }

  class Validator {
    private static notNullValidatorMap: Map<any, string[]> = new Map();

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
    @NotNull
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
// exPropertyDecorator();

// https://github.com/darrylhodgins/typescript-memoize
function exMemoize(that: any) {
  function Memoize() {
    return (
      target: Object,
      propertyKey: string,
      descriptor: TypedPropertyDescriptor<any>
    ) => {
      if (descriptor.value != null) {
        descriptor.value = getNewFunction(that, descriptor.value);
      } else if (descriptor.get != null) {
        descriptor.get = getNewFunction(that, descriptor.get);
      } else {
        throw "Only put a Memoize() decorator on a method or get accessor.";
      }
    };
  }

  let counter = 0;
  function getNewFunction(that: any, originalMethod: () => void) {
    const identifier = ++counter;

    return (...args: any[]) => {
      const propValName = `__memoized_value_${identifier}`;
      const propMapName = `__memoized_map_${identifier}`;

      let returnedValue: any;

      if (args.length > 0) {
        if (!that.hasOwnProperty(propMapName)) {
          Object.defineProperty(that, propMapName, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: new Map<any, any>(),
          });
        }
        let myMap: Map<any, any> = that[propMapName];

        let hashKey: any;

        hashKey = args[0];

        if (myMap.has(hashKey)) {
          returnedValue = myMap.get(hashKey);
        } else {
          returnedValue = originalMethod.apply(that, args as []);
          myMap.set(hashKey, returnedValue);
        }
      } else {
        if (that.hasOwnProperty(propValName)) {
          returnedValue = that[propValName];
        } else {
          returnedValue = originalMethod.apply(that, args as []);
          Object.defineProperty(that, propValName, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: returnedValue,
          });
        }
      }

      return returnedValue;
    };
  }

  class SimpleFoo {
    @Memoize()
    public getAllTheData() {
      return 1;
    }

    @Memoize()
    public get someValue() {
      return "value";
    }
  }

  let simpleFoo = new SimpleFoo();

  let methodVal1 = simpleFoo.getAllTheData();
  let methodVal2 = simpleFoo.getAllTheData();

  let getterVal1 = simpleFoo.someValue;
  let getterVal2 = simpleFoo.someValue;

  console.log(methodVal1);
  console.log(methodVal2);

  console.log(getterVal1);
  console.log(getterVal2);
}
// exMemoize(this);
