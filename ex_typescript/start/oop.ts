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
  //   let john = new Person("John");
}
// exProtectedConstructor();
