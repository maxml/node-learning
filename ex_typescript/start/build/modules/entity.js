"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bar = exports.mainValidator = exports.StringValidator = exports.Car = void 0;
var Car = /** @class */ (function () {
    function Car() {
        this.colour = "";
        this.model = "";
        this.diesel = false;
        this._keys = Object.keys(this);
    }
    Car.prototype.toJSON = function () {
        // return this.setAttribute()
    };
    return Car;
}());
exports.Car = Car;
var StringValidator = /** @class */ (function () {
    function StringValidator() {
    }
    StringValidator.prototype.isAcceptable = function (s) {
        console.log("isAcceptable");
        return true;
    };
    return StringValidator;
}());
exports.StringValidator = StringValidator;
exports.mainValidator = StringValidator;
exports.Bar = { a: { count: 5 } };
