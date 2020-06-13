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
function exFunctions() {
    var myAdd = function (x, y) {
        return x + y;
    };
    var myAdd2 = function (x, y) {
        return x + y;
    };
    var myAdd3 = function (x, y) {
        return x + y;
    };
    console.log(myAdd(1, 1));
    console.log(myAdd2(1, 2));
    console.log(myAdd3(1, 3));
    function doAction(action, title) {
        if (title) {
            console.log("Doing action " + title + "...");
        }
        console.log("doAction:" + action);
    }
    doAction(function () {
        console.log("Files were removed!");
    }, "Delete");
    doAction(1, "");
    // doAction(() => { console.log('Project was created!') });
}
// exFunctions();
function exDefaultOptionaRest() {
    function executeCommand(command, options) {
        console.log("executeCommand");
    }
    function buildName(firstName, lastName) {
        if (firstName === void 0) { firstName = "Will"; }
        var restOfName = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            restOfName[_i - 2] = arguments[_i];
        }
        return firstName + " " + lastName + " " + restOfName.join(",");
    }
    console.log(buildName("Bob"));
    console.log(buildName("Bob", "Adams"));
    console.log(buildName(undefined, "Adams"));
    console.log(buildName("", "Adams"));
    console.log(buildName("Joseph", "Samuel", "Lucas"));
    console.log(buildName("Joseph", "Samuel", "Lucas", "MacKinzie"));
}
// exDefaultOptionaRest();
function exThis() {
    var deck0 = {
        suits: ["hearts", "spades", "clubs", "diamonds"],
        cards: Array(52),
        createCardPicker: function () {
            return function () {
                var pickedCard = Math.floor(Math.random() * 52);
                var pickedSuit = Math.floor(pickedCard / 13);
                // return { suit: this.suits[pickedSuit], card: pickedCard % 13 };
            };
        },
    };
    var deck1 = {
        suits: ["hearts", "spades", "clubs", "diamonds"],
        cards: Array(52),
        createCardPicker: function () {
            var _this = this;
            return function () {
                var pickedCard = Math.floor(Math.random() * 52);
                var pickedSuit = Math.floor(pickedCard / 13);
                return { suit: _this.suits[pickedSuit], card: (pickedCard % 13) + 1 };
            };
        },
    };
    var pickedCard = deck1.createCardPicker()();
    console.log("card: " + pickedCard.card + " of " + pickedCard.suit);
    var deck2 = {
        suits: ["hearts", "spades", "clubs", "diamonds"],
        cards: Array(52),
        createCardPicker: function () {
            function _privateFunction() {
                var pickedCard = Math.floor(Math.random() * 52);
                var pickedSuit = Math.floor(pickedCard / 13);
                return { suit: this.suits[pickedSuit], card: (pickedCard % 13) + 1 };
            }
            return _privateFunction.bind(this);
        },
    };
    pickedCard = deck2.createCardPicker()();
    console.log("card: " + pickedCard.card + " of " + pickedCard.suit);
}
// exThis();
var deck3 = {
    suits: ["hearts", "spades", "clubs", "diamonds"],
    cards: Array(52),
    createCardPicker: function () {
        return function () {
            var pickedCard = Math.floor(Math.random() * 52);
            var pickedSuit = Math.floor(pickedCard / 13);
            return { suit: that.suits[pickedSuit], card: (pickedCard % 13) + 1 };
        };
    },
};
var that = deck3;
var pickedCard = deck3.createCardPicker()();
// console.log("card: " + pickedCard.card + " of " + pickedCard.suit);
var Deck4 = /** @class */ (function () {
    function Deck4() {
        this.suits = ["hearts", "spades", "clubs", "diamonds"];
        this.cards = Array(52);
    }
    Deck4.prototype.createCardPicker = function () {
        var that2 = this;
        return function () {
            var pickedCard = Math.floor(Math.random() * 52);
            var pickedSuit = Math.floor(pickedCard / 13);
            return { suit: that2.suits[pickedSuit], card: (pickedCard % 13) + 1 };
        }.bind(that2);
    };
    return Deck4;
}());
pickedCard = new Deck4().createCardPicker()();
// console.log("card: " + pickedCard.card + " of " + pickedCard.suit);
function exOverloading() {
    var suits = ["hearts", "spades", "clubs", "diamonds"];
    function pickCard(x) {
        // Check to see if we're working with an object/array
        // if so, they gave us the deck and we'll pick the card
        if (typeof x == "object") {
            var pickedCard_1 = Math.floor(Math.random() * x.length);
            return pickedCard_1;
        }
        // Otherwise just let them pick the card
        else if (typeof x == "number") {
            console.log("number");
            var pickedSuit = Math.floor(x / 13);
            return { suit: suits[pickedSuit], card: x % 13 };
        }
    }
    var myDeck = [
        { suit: "diamonds", card: 2 },
        { suit: "spades", card: 10 },
        { suit: "hearts", card: 4 },
    ];
    var pickedCard1 = myDeck[pickCard(myDeck)];
    console.log("card: " + pickedCard1.card + " of " + pickedCard1.suit);
    var pickedCard2 = pickCard(15);
    console.log("card: " + pickedCard2.card + " of " + pickedCard2.suit);
}
// exOverloading();
function exLiteralOverloading() {
    function createElement(tagName) {
        return {};
    }
}
// exLiteralOverloading();
function exOverriding() {
    var Person = /** @class */ (function () {
        function Person() {
            this.name = "";
        }
        Person.prototype.eat = function () {
            console.log(this.name + " eats when hungry.");
        };
        return Person;
    }());
    var Student = /** @class */ (function (_super) {
        __extends(Student, _super);
        function Student(rollnumber, name1) {
            var _this = _super.call(this) || this;
            _this.rollnumber = rollnumber;
            _this.name = name1;
            return _this;
        }
        Student.prototype.displayInformation = function () {
            console.log("Name : " + this.name + ", Roll Number : " + this.rollnumber);
        };
        Student.prototype.eat = function () {
            console.log(this.name + " eats during break.");
        };
        return Student;
    }(Person));
    var student1 = new Student(2, "Rohit");
    student1.displayInformation();
    student1.eat();
}
// exOverriding();
