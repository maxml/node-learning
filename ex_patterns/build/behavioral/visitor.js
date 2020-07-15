"use strict";
/**
 * Каждый Конкретный Компонент должен реализовать метод accept таким образом,
 * чтобы он вызывал метод посетителя, соответствующий классу компонента.
 */
var ConcreteComponentA = /** @class */ (function () {
    function ConcreteComponentA() {
    }
    /**
     * Обратите внимание, мы вызываем visitConcreteComponentA, что соответствует
     * названию текущего класса. Таким образом мы позволяем посетителю узнать, с
     * каким классом компонента он работает.
     */
    ConcreteComponentA.prototype.accept = function (visitor) {
        visitor.visitConcreteComponentA(this);
    };
    /**
     * Конкретные Компоненты могут иметь особые методы, не объявленные в их
     * базовом классе или интерфейсе. Посетитель всё же может использовать эти
     * методы, поскольку он знает о конкретном классе компонента.
     */
    ConcreteComponentA.prototype.exclusiveMethodOfConcreteComponentA = function () {
        return "A";
    };
    return ConcreteComponentA;
}());
var ConcreteComponentB = /** @class */ (function () {
    function ConcreteComponentB() {
    }
    /**
     * То же самое здесь: visitConcreteComponentB => ConcreteComponentB
     */
    ConcreteComponentB.prototype.accept = function (visitor) {
        visitor.visitConcreteComponentB(this);
    };
    ConcreteComponentB.prototype.specialMethodOfConcreteComponentB = function () {
        return "B";
    };
    return ConcreteComponentB;
}());
/**
 * Конкретные Посетители реализуют несколько версий одного и того же алгоритма,
 * которые могут работать со всеми классами конкретных компонентов.
 *
 * Максимальную выгоду от паттерна Посетитель вы почувствуете, используя его со
 * сложной структурой объектов, такой как дерево Компоновщика. В этом случае
 * было бы полезно хранить некоторое промежуточное состояние алгоритма при
 * выполнении методов посетителя над различными объектами структуры.
 */
var ConcreteVisitor1 = /** @class */ (function () {
    function ConcreteVisitor1() {
    }
    ConcreteVisitor1.prototype.visitConcreteComponentA = function (element) {
        console.log(element.exclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor1");
    };
    ConcreteVisitor1.prototype.visitConcreteComponentB = function (element) {
        console.log(element.specialMethodOfConcreteComponentB() + " + ConcreteVisitor1");
    };
    return ConcreteVisitor1;
}());
var ConcreteVisitor2 = /** @class */ (function () {
    function ConcreteVisitor2() {
    }
    ConcreteVisitor2.prototype.visitConcreteComponentA = function (element) {
        console.log(element.exclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor2");
    };
    ConcreteVisitor2.prototype.visitConcreteComponentB = function (element) {
        console.log(element.specialMethodOfConcreteComponentB() + " + ConcreteVisitor2");
    };
    return ConcreteVisitor2;
}());
/**
 * Клиентский код может выполнять операции посетителя над любым набором
 * элементов, не выясняя их конкретных классов. Операция принятия направляет
 * вызов к соответствующей операции в объекте посетителя.
 */
function clientCode(components, visitor) {
    // ...
    for (var _i = 0, components_1 = components; _i < components_1.length; _i++) {
        var component = components_1[_i];
        component.accept(visitor);
    }
    // ...
}
var components = [new ConcreteComponentA(), new ConcreteComponentB()];
console.log("The client code works with all visitors via the base Visitor interface:");
var visitor1 = new ConcreteVisitor1();
clientCode(components, visitor1);
console.log("");
console.log("It allows the same client code to work with different types of visitors:");
var visitor2 = new ConcreteVisitor2();
clientCode(components, visitor2);
