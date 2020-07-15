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
var ConcreteComponent = /** @class */ (function () {
    function ConcreteComponent() {
    }
    ConcreteComponent.prototype.operation = function () {
        return "ConcreteComponent";
    };
    return ConcreteComponent;
}());
var Decorator = /** @class */ (function () {
    function Decorator(component) {
        this.component = component;
    }
    Decorator.prototype.operation = function () {
        return this.component.operation();
    };
    return Decorator;
}());
var ConcreteDecoratorA = /** @class */ (function (_super) {
    __extends(ConcreteDecoratorA, _super);
    function ConcreteDecoratorA() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ConcreteDecoratorA.prototype.operation = function () {
        return "ConcreteDecoratorA(" + _super.prototype.operation.call(this) + ")";
    };
    return ConcreteDecoratorA;
}(Decorator));
var ConcreteDecoratorB = /** @class */ (function (_super) {
    __extends(ConcreteDecoratorB, _super);
    function ConcreteDecoratorB() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ConcreteDecoratorB.prototype.operation = function () {
        return "ConcreteDecoratorB(" + _super.prototype.operation.call(this) + ")";
    };
    return ConcreteDecoratorB;
}(Decorator));
function exDecorator(component) {
    console.log("RESULT: " + component.operation());
}
var simple2 = new ConcreteComponent();
console.log("Client: I've got a simple component:");
exDecorator(simple2);
console.log("");
var decorator1 = new ConcreteDecoratorA(simple2);
var decorator2 = new ConcreteDecoratorB(decorator1);
console.log("Client: Now I've got a decorated component:");
exDecorator(decorator2);
