"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
}
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
var entity_1 = require("./entity");
var car = new entity_1.Car();
car.colour = "sdf";
car.diesel = false;
car.model = "adasdsa";
console.log("Hello new car: " + JSON.stringify(car));
__exportStar(require("./entity"), exports);
__exportStar(require("./index"), exports);
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
