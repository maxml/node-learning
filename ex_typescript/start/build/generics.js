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
function exGeneric() {
    function identity(arg) {
        return arg;
    }
    var output = identity("myString");
    console.log(output);
    var output2 = identity(1);
    console.log(output2);
    var output3 = identity({ field: "value" });
    console.log(output3);
    function loggingIdentity(arg) {
        console.log(arg.length); // Array has a .length, so no more error
        return arg;
    }
}
// exGeneric();
function exExtends() {
    var NewLength = /** @class */ (function () {
        function NewLength(input) {
            this.length = input;
        }
        return NewLength;
    }());
    function loggingIdentity2(arg) {
        console.log(arg.length);
        return arg;
    }
    loggingIdentity2({ length: 10, value: 3 });
    loggingIdentity2([]);
    loggingIdentity2("a");
    loggingIdentity2(new NewLength(11));
}
exExtends();
function exConstraint() {
    function getProperty(obj, key) {
        return obj[key];
    }
    var x = { a: 1, b: 2, c: 3, d: 4 };
    console.log(getProperty(x, "a"));
    // getProperty(x, "m");
}
// exConstraint();
function exClassTypes() {
    var BeeKeeper = /** @class */ (function () {
        function BeeKeeper() {
            this.hasMask = true;
        }
        return BeeKeeper;
    }());
    var ZooKeeper = /** @class */ (function () {
        function ZooKeeper() {
            this.nametag = "";
        }
        return ZooKeeper;
    }());
    var Animal = /** @class */ (function () {
        function Animal() {
            this.numLegs = 0;
        }
        return Animal;
    }());
    var Bee = /** @class */ (function (_super) {
        __extends(Bee, _super);
        function Bee() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.keeper = { hasMask: true };
            return _this;
        }
        return Bee;
    }(Animal));
    var Lion = /** @class */ (function (_super) {
        __extends(Lion, _super);
        function Lion() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.keeper = { nametag: "tag" };
            return _this;
        }
        return Lion;
    }(Animal));
    function createInstance(Clazz) {
        return new Clazz();
    }
    console.log(createInstance(Lion).keeper.nametag);
    console.log(createInstance(Bee).keeper.hasMask);
}
// exClassTypes();
