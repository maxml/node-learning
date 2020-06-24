"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
function exInterface() {
    function initSquare(config) {
        var newSquare = { color: "white", area: 0 };
        if (config.color) {
            newSquare.color = config.color;
        }
        if (config.width) {
            newSquare.area = config.width * config.width;
        }
        return newSquare;
    }
    var mySquare = initSquare({});
    console.log(mySquare);
    mySquare = initSquare({ color: "black" });
    console.log(mySquare);
    mySquare = initSquare({ color: "black", width: 10 });
    console.log(mySquare);
}
// exInterface();
// readonly vs const
function exReadonly() {
    var p1 = { x: 10, y: 20 };
    console.log(p1);
    var Octopus = /** @class */ (function () {
        function Octopus(theName) {
            this.numberOfLegs = 8;
            this.name = theName;
        }
        return Octopus;
    }());
    var dad = new Octopus("Man with the 8 strong legs");
    // dad.name = "Man with the 3-piece suit";
    var Octopus2 = /** @class */ (function () {
        function Octopus2(name) {
            this.name = name;
            this.numberOfLegs = 8;
        }
        return Octopus2;
    }());
    console.log(new Octopus2("test").name);
}
// exReadonly();
function readOnlyClass() {
    var props = {
        firstName: "Brian",
        lastName: "Gonzalez",
    };
    // props.firstName = "Jose";
    console.log(props);
}
// readOnlyClass();
function exDeclarations() {
    var mySearch;
    mySearch = function (src, sub) {
        var result = src.search(sub);
        return result > -1;
    };
    console.log(mySearch);
    var myArray;
    myArray = ["Bob", "Fred"];
    var myStr = myArray[0];
    console.log(myStr);
    function createClock(ctor, hour, minute) {
        return new ctor(hour, minute);
    }
}
// exDeclarations();
function exHybrid() {
    function getCounter() {
        var counter = function (start) { };
        counter.interval = 123;
        counter.reset = function () { };
        return counter;
    }
    var counter = getCounter();
    counter(10);
    counter.reset();
    counter.interval = 5.0;
    console.log(counter);
}
// exHybrid();
function exImplementation() {
    var Clock = /** @class */ (function () {
        function Clock(h, m) {
            this.currentTime = new Date();
        }
        Clock.prototype.setTime = function (d) {
            this.currentTime = d;
        };
        return Clock;
    }());
    console.log(new Clock(1, 1));
}
// exImplementation();
function exStatic() {
    var Grid = /** @class */ (function () {
        function Grid(scale) {
            this.scale = scale;
        }
        Grid.prototype.calculateDistanceFromOrigin = function (point) {
            var xDist = point.x - Grid.origin.x;
            var yDist = point.y - Grid.origin.y;
            return Math.sqrt(xDist * xDist + yDist * yDist) / this.scale;
        };
        Grid.origin = { x: 1, y: 1 };
        return Grid;
    }());
    var grid1 = new Grid(1.0); // 1x scale
    var grid2 = new Grid(5.0); // 5x scale
    console.log(grid1.calculateDistanceFromOrigin({ x: 10, y: 10 }));
    console.log(grid2.calculateDistanceFromOrigin({ x: 10, y: 10 }));
    var Pizza = /** @class */ (function () {
        function Pizza() {
        }
        Pizza.create = function (event) {
            return { name: event.name, toppings: event.toppings };
        };
        return Pizza;
    }());
    var pizza = Pizza.create({
        name: "Inferno",
        toppings: ["cheese", "peppers"],
    });
    console.log(pizza);
}
// exStatic();
function exExtendingInterfaces() {
    var square = {};
    square.color = "blue";
    square.sideLength = 10;
    square.penWidth = 5.0;
    console.log(square);
}
// exExtendingInterfaces();
function exExtendingClassViaInterfaces() {
    var Point = /** @class */ (function () {
        function Point() {
            this.x = 0;
            this.y = 0;
        }
        return Point;
    }());
    var point3d = { x: 1, y: 2, z: 3 };
    console.log(point3d);
    var Control = /** @class */ (function () {
        function Control() {
        }
        return Control;
    }());
    var Button = /** @class */ (function (_super) {
        __extends(Button, _super);
        function Button() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Button.prototype.select = function () { };
        return Button;
    }(Control));
    var TextBox = /** @class */ (function (_super) {
        __extends(TextBox, _super);
        function TextBox() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        TextBox.prototype.select = function () { };
        return TextBox;
    }(Control));
    var Image2 = /** @class */ (function () {
        function Image2() {
        }
        Image2.prototype.select = function () { };
        return Image2;
    }());
    var A = /** @class */ (function () {
        function A() {
        }
        A.prototype.f = function () {
            console.log("f");
        };
        A.prototype.g = function () {
            console.log("G");
        };
        return A;
    }());
    var B = /** @class */ (function (_super) {
        __extends(B, _super);
        function B() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        B.prototype.g = function () {
            console.log("g");
        };
        return B;
    }(A));
    console.log(new B().g());
    // console.log(new B().f());
}
// exExtendingClassViaInterfaces();
function exPrivateFieldDetail() {
    var Animal = /** @class */ (function () {
        function Animal(theName) {
            this.name = theName;
        }
        return Animal;
    }());
    var Rhino = /** @class */ (function (_super) {
        __extends(Rhino, _super);
        function Rhino() {
            return _super.call(this, "Rhino") || this;
        }
        return Rhino;
    }(Animal));
    var animal = new Animal("Goat");
    var rhino = new Rhino();
    animal = rhino;
    var Employee = /** @class */ (function () {
        function Employee(theName) {
            this.name = theName;
        }
        return Employee;
    }());
    var employee = new Employee("Bob");
    // animal = employee;
    console.log(animal);
    console.log(rhino);
    console.log(employee);
}
// exPrivateFieldDetail();
function exProtecredField() {
    var Person = /** @class */ (function () {
        function Person(name) {
            this.name = name;
        }
        return Person;
    }());
    var Employee = /** @class */ (function (_super) {
        __extends(Employee, _super);
        function Employee(name, department) {
            var _this = _super.call(this, name) || this;
            _this.department = department;
            return _this;
        }
        Employee.prototype.getElevatorPitch = function () {
            return "Hello, my name is " + this.name + " and I work in " + this.department + ".";
        };
        return Employee;
    }(Person));
    var howard = new Employee("Howard", "Sales");
    console.log(howard.getElevatorPitch());
    // console.log(howard.name);
}
// exProtecredField();
function exGettersSetters() {
    var fullNameMaxLength = 10;
    var Employee = /** @class */ (function () {
        function Employee() {
            this._fullName = "";
        }
        Object.defineProperty(Employee.prototype, "fullName", {
            get: function () {
                console.log("getter");
                return this._fullName;
            },
            set: function (newName) {
                if (newName && newName.length > fullNameMaxLength) {
                    throw new Error("fullName has a max length of " + fullNameMaxLength);
                }
                this._fullName = newName;
            },
            enumerable: false,
            configurable: true
        });
        return Employee;
    }());
    var employee = new Employee();
    employee.fullName = "Bob Smith";
    if (employee.fullName) {
        console.log(employee.fullName);
    }
}
// exGettersSetters();
function exStaticFieldChanging() {
    var Greeter = /** @class */ (function () {
        function Greeter() {
            this.greeting = "";
        }
        Greeter.prototype.greet = function () {
            if (this.greeting) {
                return "Hello, " + this.greeting;
            }
            else {
                return Greeter.standardGreeting;
            }
        };
        Greeter.standardGreeting = "Hello, there";
        return Greeter;
    }());
    var greeter1 = new Greeter();
    console.log(greeter1.greet());
    var GreeterMaker = Greeter;
    GreeterMaker.standardGreeting = "Hey there!";
    var greeter2 = new GreeterMaker();
    console.log(greeter2.greet());
    console.log(greeter1.greet());
}
// exStaticFieldChanging();
function exUnion() {
    var NetworkLoadingState = /** @class */ (function () {
        function NetworkLoadingState() {
            this.state = "loading";
        }
        return NetworkLoadingState;
    }());
    var NetworkFailedState = /** @class */ (function () {
        function NetworkFailedState() {
            this.state = "failed";
            this.code = 0;
        }
        return NetworkFailedState;
    }());
    var NetworkSuccessState = /** @class */ (function () {
        function NetworkSuccessState() {
            this.state = "success";
            this.response = {
                title: "",
                duration: 0,
                summary: "",
            };
        }
        return NetworkSuccessState;
    }());
    console.log({});
    function networkStatus(state) {
        // By switching on state, TypeScript can narrow the union
        // down in code flow analysis
        switch (state.state) {
            case "loading":
                return "Downloading...";
            case "failed":
                // The type must be NetworkFailedState here,
                // so accessing the `code` field is safe
                return "Error " + state.code + " downloading";
            case "success":
                return "Downloaded " + state.response.title + " - " + state.response.summary;
        }
    }
    console.log(networkStatus({ state: "failed", code: 100 }));
}
// exUnion();
function exIntersection() {
    var handleArtistsResponse = function (response) {
        if (response.error) {
            console.error(response.error.message);
            return;
        }
        console.log(response.artists);
    };
    handleArtistsResponse({ artists: [{ name: "Test" }], success: true });
}
// exIntersection();
function exToString() {
    var Foo = /** @class */ (function () {
        function Foo() {
            var _this = this;
            this.id = 23423;
            this.toString = function () {
                return "Foo (id: " + _this.id + ")";
            };
        }
        return Foo;
    }());
    var Bar = /** @class */ (function (_super) {
        __extends(Bar, _super);
        function Bar() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.name = "Some name";
            _this.toString = function () {
                return "Bar (" + _this.name + ")";
            };
            return _this;
        }
        return Bar;
    }(Foo));
    var a = new Foo();
    console.log(a);
    console.log("" + a);
    console.log("" + a);
    var b = new Bar();
    console.log(b);
    console.log("" + b);
    console.log("" + b);
    var c = new Bar();
    console.log(c);
    console.log("" + c);
    console.log("" + c);
}
// exToString();
