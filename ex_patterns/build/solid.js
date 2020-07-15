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
// Single Responsibility Principle
var Book = /** @class */ (function () {
    function Book() {
    }
    Book.prototype.getTitle = function () {
        return "A Great Book";
    };
    Book.prototype.getAuthor = function () {
        return "John Doe";
    };
    Book.prototype.turnPage = function () {
        // pointer to next page
    };
    Book.prototype.printCurrentPage = function () {
        return "current page content";
    };
    return Book;
}());
var Printer = /** @class */ (function () {
    function Printer() {
    }
    Printer.prototype.printPageInHTML = function (pageContent) {
        // your logic
    };
    Printer.prototype.printPageInJSON = function (pageContent) {
        // your logic
    };
    Printer.prototype.printPageInXML = function (pageContent) {
        // your logic
    };
    Printer.prototype.printPageUnformatted = function (pageContent) {
        // your logic
    };
    return Printer;
}());
var Pager = /** @class */ (function () {
    function Pager() {
    }
    Pager.prototype.gotoPrevPage = function () {
        // pointer to prev page
    };
    Pager.prototype.gotoNextPage = function () {
        // pointer to next page
    };
    Pager.prototype.gotoPageByPageNumber = function (pagerNumber) {
        // pointer to specific page
    };
    return Pager;
}());
// Open Closed Principle
var BookOC = /** @class */ (function () {
    function BookOC() {
    }
    BookOC.prototype.getAuthor = function () {
        return {
            name: "Ashutosh Singh",
            age: 27,
            address: "India",
        };
    };
    return BookOC;
}());
var BookOC2 = /** @class */ (function () {
    function BookOC2(name, age, adress) {
        this.name = "";
        this.age = 0;
        this.adress = "";
        this.name = name;
        this.age = age;
        this.adress = adress;
    }
    BookOC2.prototype.getAuthor = function () {
        return {
            name: this.name,
            age: this.age,
            address: this.adress,
        };
    };
    return BookOC2;
}());
var Rectangle = /** @class */ (function () {
    function Rectangle(width, height) {
        this.width = width;
        this.height = height;
    }
    return Rectangle;
}());
var Circle = /** @class */ (function () {
    function Circle(radius) {
        this.radius = radius;
    }
    return Circle;
}());
function calculateAreasOfMultipleShapes(shapes) {
    return shapes.reduce(function (calculatedArea, shape) {
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
function calculateAreasOfMultipleShapes2(shapes) {
    return shapes.reduce(function (calculatedArea, shape) {
        return calculatedArea + shape.getArea();
    }, 0);
}
var CreditCard = /** @class */ (function () {
    function CreditCard(code, expiration, monthlyCost) {
        this.code = code;
        this.expiration = expiration;
        this.monthlyCost = monthlyCost;
    }
    CreditCard.prototype.getCode = function () {
        return this.code;
    };
    CreditCard.prototype.getExpiration = function () {
        return this.expiration;
    };
    CreditCard.prototype.monthlyDiscount = function () {
        return this.monthlyCost * 0.02;
    };
    return CreditCard;
}());
var GoldCreditCard = /** @class */ (function (_super) {
    __extends(GoldCreditCard, _super);
    function GoldCreditCard() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    GoldCreditCard.prototype.monthlyDiscount = function () {
        return this.monthlyCost * 0.05;
    };
    return GoldCreditCard;
}(CreditCard));
// Liskov Substitution Principle
var Bird = /** @class */ (function () {
    function Bird() {
    }
    Bird.prototype.fly = function () {
        console.log("I can fly!");
    };
    return Bird;
}());
var Kingfisher = /** @class */ (function (_super) {
    __extends(Kingfisher, _super);
    function Kingfisher() {
        return _super.call(this) || this;
    }
    return Kingfisher;
}(Bird));
var Ostrich = /** @class */ (function (_super) {
    __extends(Ostrich, _super);
    function Ostrich() {
        return _super.call(this) || this;
    }
    Ostrich.prototype.fly = function () {
        // throw new Error("I don't fly rather I run");
        console.log("I don't fly rather I run");
    };
    Ostrich.prototype.run = function () {
        console.log("I will run forever!");
    };
    return Ostrich;
}(Bird));
var kingfisherBird = new Kingfisher();
var ostrichBird = new Ostrich();
kingfisherBird.fly();
ostrichBird.fly();
var Kingfisher2 = /** @class */ (function () {
    function Kingfisher2() {
    }
    Kingfisher2.prototype.fly = function () { };
    Kingfisher2.prototype.run = function () { };
    return Kingfisher2;
}());
var Ostrich2 = /** @class */ (function () {
    function Ostrich2() {
    }
    Ostrich2.prototype.fly = function () { };
    Ostrich2.prototype.run = function () { };
    return Ostrich2;
}());
var WeatherProvider = /** @class */ (function () {
    function WeatherProvider(httpClient) {
        this.httpClient = httpClient;
    }
    WeatherProvider.prototype.getWeather = function () {
        return this.httpClient.get("some api url");
    };
    return WeatherProvider;
}());
var CarWindow = /** @class */ (function () {
    function CarWindow() {
    }
    CarWindow.prototype.open = function () {
        //...
    };
    CarWindow.prototype.close = function () {
        //...
    };
    return CarWindow;
}());
var WindowSwitch = /** @class */ (function () {
    function WindowSwitch(window) {
        this.window = window;
        this.isOn = false;
    }
    WindowSwitch.prototype.onPress = function () {
        if (this.isOn) {
            this.window.close();
            this.isOn = false;
        }
        else {
            this.window.open();
            this.isOn = true;
        }
    };
    return WindowSwitch;
}());
