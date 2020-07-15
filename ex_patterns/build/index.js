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
    Ostrich.prototype.run = function () { };
    return Ostrich;
}(Bird));
var kingfisherBird = new Kingfisher();
var ostrichBird = new Ostrich();
kingfisherBird.fly();
ostrichBird.fly();
