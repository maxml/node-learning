// Single Responsibility Principle
class Book {
  getTitle() {
    return "A Great Book";
  }

  getAuthor() {
    return "John Doe";
  }

  turnPage() {
    // pointer to next page
  }

  printCurrentPage() {
    return "current page content";
  }
}

class Printer {
  printPageInHTML(pageContent: any) {
    // your logic
  }

  printPageInJSON(pageContent: any) {
    // your logic
  }

  printPageInXML(pageContent: any) {
    // your logic
  }

  printPageUnformatted(pageContent: any) {
    // your logic
  }
}

class Pager {
  gotoPrevPage() {
    // pointer to prev page
  }

  gotoNextPage() {
    // pointer to next page
  }

  gotoPageByPageNumber(pagerNumber: number) {
    // pointer to specific page
  }
}

// Open Closed Principle
class BookOC {
  getAuthor() {
    return {
      name: "Ashutosh Singh",
      age: 27,
      address: "India",
    };
  }
}

class BookOC2 {
  private name: string = "";
  private age: number = 0;
  private adress: string = "";

  constructor(name: string, age: number, adress: string) {
    this.name = name;
    this.age = age;
    this.adress = adress;
  }

  getAuthor() {
    return {
      name: this.name,
      age: this.age,
      address: this.adress,
    };
  }
}

class Rectangle {
  public width: number;
  public height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

class Circle {
  public radius: number;
  constructor(radius: number) {
    this.radius = radius;
  }
}

function calculateAreasOfMultipleShapes(shapes: Array<Rectangle | Circle>) {
  return shapes.reduce<number>((calculatedArea, shape) => {
    // let calculatedArea = 0;
    if (shape instanceof Rectangle) {
      return calculatedArea + shape.width * shape.height;
    }
    if (shape instanceof Circle) {
      return calculatedArea + shape.radius * Math.PI;
    }

    return calculatedArea;
  }, 0);
}

interface Shape {
  getArea(): number;
}

function calculateAreasOfMultipleShapes2(shapes: Shape[]) {
  return shapes.reduce((calculatedArea, shape) => {
    return calculatedArea + shape.getArea();
  }, 0);
}

class CreditCard {
  private code: String;
  private expiration: Date;
  protected monthlyCost: number;

  constructor(code: String, expiration: Date, monthlyCost: number) {
    this.code = code;
    this.expiration = expiration;
    this.monthlyCost = monthlyCost;
  }

  getCode(): String {
    return this.code;
  }

  getExpiration(): Date {
    return this.expiration;
  }

  monthlyDiscount(): number {
    return this.monthlyCost * 0.02;
  }
}

class GoldCreditCard extends CreditCard {
  monthlyDiscount(): number {
    return this.monthlyCost * 0.05;
  }
}

// Liskov Substitution Principle
class Bird {
  fly() {
    console.log("I can fly!");
  }
}

class Kingfisher extends Bird {
  constructor() {
    super();
  }
}

class Ostrich extends Bird {
  constructor() {
    super();
  }

  fly() {
    // throw new Error("I don't fly rather I run");
    console.log("I don't fly rather I run");
  }

  run() {
    console.log("I will run forever!");
  }
}

let kingfisherBird: Bird = new Kingfisher();
let ostrichBird: Bird = new Ostrich();

kingfisherBird.fly();
ostrichBird.fly();

// Interface Segregation Principle
interface IBird {
  fly(): void;
  run(): void;
}

class Kingfisher2 implements IBird {
  fly() {}
  run() {}
}

class Ostrich2 implements IBird {
  fly() {}
  run() {}
}

// Dependency Inversion Principle
interface IhttpClient {
  get(arg0: string): Promise<IhttpClient>;
}

class WeatherProvider {
  httpClient: IhttpClient;

  constructor(httpClient: IhttpClient) {
    this.httpClient = httpClient;
  }

  getWeather() {
    return this.httpClient.get("some api url");
  }
}

class CarWindow {
  open() {
    //...
  }

  close() {
    //...
  }
}

class WindowSwitch {
  private isOn = false;

  constructor(private window: CarWindow) {}

  onPress() {
    if (this.isOn) {
      this.window.close();
      this.isOn = false;
    } else {
      this.window.open();
      this.isOn = true;
    }
  }
}
