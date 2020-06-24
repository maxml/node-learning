"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flower = exports.Tree = exports.Cat = exports.Dog = void 0;
exports.default = {
    hi: hi,
    hey: hey,
};
function hi() {
    console.log("hi");
}
function hey() {
    console.log("hey");
}
// console.log("sdfds");
var entity_1 = require("./entity");
function exUsingCar() {
    var car = new entity_1.Car();
    car.color = "sdf";
    car.diesel = false;
    car.model = "adasdsa";
    console.log("Hello new car: " + JSON.stringify(car));
}
// exUsingCar();
// export * from "./entity";
// export * from "./index";
var Dog = /** @class */ (function () {
    function Dog() {
    }
    return Dog;
}());
exports.Dog = Dog;
var Cat = /** @class */ (function () {
    function Cat() {
    }
    return Cat;
}());
exports.Cat = Cat;
var Tree = /** @class */ (function () {
    function Tree() {
    }
    return Tree;
}());
exports.Tree = Tree;
var Flower = /** @class */ (function () {
    function Flower() {
    }
    return Flower;
}());
exports.Flower = Flower;
