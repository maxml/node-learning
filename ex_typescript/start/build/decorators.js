"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
// tsconfig: experimentalDecorators
function exDecorators() {
    var IceCreamComponent = /** @class */ (function () {
        function IceCreamComponent() {
            this.toppings = [];
        }
        IceCreamComponent.prototype.addTopping = function (topping) {
            console.log("addTopping");
            this.toppings.push(topping);
        };
        __decorate([
            Confirmable("Are you sure?"),
            Confirmable("Are you super, super sure? There is no going back!")
        ], IceCreamComponent.prototype, "addTopping", null);
        return IceCreamComponent;
    }());
    // Method Decorator
    function Confirmable(message) {
        return function (target, key, descriptor) {
            var original = descriptor.value;
            descriptor.value = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var allow = confirm(message);
                if (allow) {
                    return original.apply(this, args);
                }
                else {
                    return null;
                }
            };
            return descriptor;
        };
        function confirm(message) {
            console.log(message);
            return true;
        }
    }
    new IceCreamComponent().addTopping("ex");
}
// exDecorators();
function exMethodDecorator() {
    function LogMethod(target, propertyName, propertyDesciptor) {
        // target === Employee.prototype
        // propertyName === "greet"
        // propertyDesciptor === Object.getOwnPropertyDescriptor(Employee.prototype, "greet")
        var method = propertyDesciptor.value;
        propertyDesciptor.value = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var params = args.map(function (a) { return JSON.stringify(a); }).join();
            var result = method.apply(this, args);
            var jsonResult = JSON.stringify(result);
            console.log("Call: " + propertyName + "(" + params + ") => " + jsonResult);
            return result;
        };
        return propertyDesciptor;
    }
    var Employee = /** @class */ (function () {
        function Employee(firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        }
        Employee.prototype.greet = function (message) {
            return this.firstName + " " + this.lastName + " says: " + message;
        };
        __decorate([
            LogMethod
        ], Employee.prototype, "greet", null);
        return Employee;
    }());
    var emp = new Employee("Test", "Test");
    emp.greet("hello");
}
// exMethodDecorator();
function exClassDecorator() {
    function SelfDriving(constructorFunction) {
        console.log("-- decorator function invoked --");
        constructorFunction.prototype.selfDrivable = "true";
    }
    var Car = /** @class */ (function () {
        function Car(make) {
            console.log("-- this constructor invoked --");
            this._make = make;
        }
        Car = __decorate([
            SelfDriving
        ], Car);
        return Car;
    }());
    var car = new Car("makeTest");
    // @ts-ignore
    console.log(car.selfDrivable);
}
// exClassDecorator();
function exParameterDecorator() {
    function DecoratedParameter(target, propertyKey, parameterIndex) {
        console.log(target);
        console.log(propertyKey);
        console.log(parameterIndex);
    }
    var TargetDemo = /** @class */ (function () {
        function TargetDemo() {
        }
        TargetDemo.prototype.foo1 = function (baz, bar) {
            console.log("Class method foo");
        };
        __decorate([
            __param(1, DecoratedParameter)
        ], TargetDemo.prototype, "foo1", null);
        return TargetDemo;
    }());
    var test = new TargetDemo();
    test.foo1("class baz", "class bar");
}
// exParameterDecorator();
function exAccessorDecorator() {
    function Enumerable(target, propertyKey, descriptor) {
        descriptor.enumerable = true;
    }
    var Person = /** @class */ (function () {
        function Person(name) {
            this.simpleField = 0;
            this._name = name;
        }
        Object.defineProperty(Person.prototype, "name", {
            get: function () {
                return this._name + " addit";
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            Enumerable
        ], Person.prototype, "name", null);
        return Person;
    }());
    console.log("-- creating instance --");
    var person = new Person("Diana");
    console.log("-- looping --");
    for (var key in person) {
        console.log(key + " = " + person[key]);
    }
}
// exAccessorDecorator();
function exPropertyDecorator() {
    function NotNull(target, propertyKey) {
        Validator.registerNotNull(target, propertyKey);
    }
    var Validator = /** @class */ (function () {
        function Validator() {
        }
        Validator.registerNotNull = function (target, property) {
            var keys = this.notNullValidatorMap.get(target);
            if (!keys) {
                keys = [];
                this.notNullValidatorMap.set(target, keys);
            }
            keys.push(property);
        };
        Validator.validate = function (target) {
            var e_1, _a;
            var notNullProps = this.notNullValidatorMap.get(Object.getPrototypeOf(target));
            if (!notNullProps) {
                return true;
            }
            var hasErrors = false;
            try {
                for (var notNullProps_1 = __values(notNullProps), notNullProps_1_1 = notNullProps_1.next(); !notNullProps_1_1.done; notNullProps_1_1 = notNullProps_1.next()) {
                    var property = notNullProps_1_1.value;
                    var value = target[property];
                    if (!value) {
                        console.error(property + " value cannot be null");
                        hasErrors = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (notNullProps_1_1 && !notNullProps_1_1.done && (_a = notNullProps_1.return)) _a.call(notNullProps_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return hasErrors;
        };
        Validator.notNullValidatorMap = new Map();
        return Validator;
    }());
    var Person = /** @class */ (function () {
        function Person(name) {
            this.name = name;
        }
        __decorate([
            NotNull
        ], Person.prototype, "name", void 0);
        return Person;
    }());
    console.log("-- creating instance --");
    var person = new Person(null);
    console.log(person);
    var b = Validator.validate(person);
    console.log("validation passed: " + !b);
    console.log("-- creating another instance --");
    var person2 = new Person("Tina");
    console.log(person2);
    b = Validator.validate(person2);
    console.log("validation passed: " + !b);
}
// exPropertyDecorator();
