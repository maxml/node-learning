"use strict";
var Context = /** @class */ (function () {
    function Context(strategy) {
        this.strategy = strategy;
    }
    Context.prototype.setStrategy = function (strategy) {
        this.strategy = strategy;
    };
    Context.prototype.doSomeBusinessLogic = function () {
        console.log("Context: Sorting data using the strategy (not sure how it'll do it)");
        var result = this.strategy.doAlgorithm(["a", "b", "c", "d", "e"]);
        console.log(result.join(","));
    };
    return Context;
}());
var ConcreteStrategyA = /** @class */ (function () {
    function ConcreteStrategyA() {
    }
    ConcreteStrategyA.prototype.doAlgorithm = function (data) {
        return data.sort();
    };
    return ConcreteStrategyA;
}());
var ConcreteStrategyB = /** @class */ (function () {
    function ConcreteStrategyB() {
    }
    ConcreteStrategyB.prototype.doAlgorithm = function (data) {
        return data.reverse();
    };
    return ConcreteStrategyB;
}());
var context = new Context(new ConcreteStrategyA());
console.log("Client: Strategy is set to normal sorting.");
context.doSomeBusinessLogic();
console.log("");
console.log("Client: Strategy is set to reverse sorting.");
context.setStrategy(new ConcreteStrategyB());
context.doSomeBusinessLogic();
