"use strict";
var Foo;
(function (Foo) {
    var InnerFoo = /** @class */ (function () {
        function InnerFoo() {
        }
        InnerFoo.prototype.doIt = function () {
            console.log("Foo");
        };
        return InnerFoo;
    }());
    Foo.InnerFoo = InnerFoo;
})(Foo || (Foo = {}));
new Foo.InnerFoo();
var Foo2 = /** @class */ (function () {
    function Foo2() {
    }
    Foo2.prototype.doSomethingWithInnerFoo = function () {
        new Foo.InnerFoo().doIt();
    };
    return Foo2;
}());
(function (Foo2) {
    var InnerFoo = /** @class */ (function () {
        function InnerFoo() {
        }
        InnerFoo.prototype.doIt2 = function () {
            console.log("doIt");
        };
        return InnerFoo;
    }());
    Foo2.InnerFoo = InnerFoo;
})(Foo2 || (Foo2 = {}));
new Foo2().doSomethingWithInnerFoo();
new Foo2.InnerFoo().doIt2();
