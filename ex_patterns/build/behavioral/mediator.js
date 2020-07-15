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
var ConcreteMediator = /** @class */ (function () {
    function ConcreteMediator(c1, c2) {
        this.component1 = c1;
        this.component1.setMediator(this);
        this.component2 = c2;
        this.component2.setMediator(this);
    }
    ConcreteMediator.prototype.notify = function (sender, event) {
        if (event === "A") {
            console.log("Mediator reacts on A and triggers following operations:");
            this.component2.doC();
        }
        if (event === "D") {
            console.log("Mediator reacts on D and triggers following operations:");
            this.component1.doB();
            this.component2.doC();
        }
    };
    return ConcreteMediator;
}());
var BaseComponent = /** @class */ (function () {
    function BaseComponent(mediator) {
        this.mediator = null;
        this.mediator = mediator ? mediator : null;
    }
    BaseComponent.prototype.setMediator = function (mediator) {
        this.mediator = mediator;
    };
    return BaseComponent;
}());
/**
 * Конкретные Компоненты реализуют различную функциональность. Они не зависят от
 * других компонентов. Они также не зависят от каких-либо конкретных классов
 * посредников.
 */
var Component1 = /** @class */ (function (_super) {
    __extends(Component1, _super);
    function Component1() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Component1.prototype.doA = function () {
        console.log("Component 1 does A.");
        this.mediator ? this.mediator.notify(this, "A") : null;
    };
    Component1.prototype.doB = function () {
        console.log("Component 1 does B.");
        this.mediator ? this.mediator.notify(this, "B") : null;
    };
    return Component1;
}(BaseComponent));
var Component2 = /** @class */ (function (_super) {
    __extends(Component2, _super);
    function Component2() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Component2.prototype.doC = function () {
        console.log("Component 2 does C.");
        this.mediator ? this.mediator.notify(this, "C") : null;
    };
    Component2.prototype.doD = function () {
        console.log("Component 2 does D.");
        this.mediator ? this.mediator.notify(this, "D") : null;
    };
    return Component2;
}(BaseComponent));
/**
 * Клиентский код.
 */
var c1 = new Component1();
var c2 = new Component2();
var mediator = new ConcreteMediator(c1, c2);
console.log("Client triggers operation A.");
c1.doA();
console.log("");
console.log("Client triggers operation D.");
c2.doD();
