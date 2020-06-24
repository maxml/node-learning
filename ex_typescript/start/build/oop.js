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
function exAbstractClass() {
    var Department = /** @class */ (function () {
        function Department(name) {
            this.name = name;
            console.log("from abstract class");
        }
        Department.prototype.printName = function () {
            console.log("Department name: " + this.name);
        };
        return Department;
    }());
    var AccountingDepartment = /** @class */ (function (_super) {
        __extends(AccountingDepartment, _super);
        function AccountingDepartment() {
            return _super.call(this, "Accounting and Auditing") || this;
        }
        AccountingDepartment.prototype.printMeeting = function () {
            console.log("The Accounting Department meets each Monday at 10am.");
        };
        AccountingDepartment.prototype.generateReports = function () {
            console.log("Generating accounting reports...");
        };
        return AccountingDepartment;
    }(Department));
    var department;
    // department = new Department();
    department = new AccountingDepartment();
    department.printName();
    department.printMeeting();
    // department.generateReports();
    console.log(department);
    new AccountingDepartment().generateReports();
}
// exAbstractClass();
function exInheritance() {
    var Animal = /** @class */ (function () {
        function Animal(theName) {
            this.name = theName;
        }
        Animal.prototype.move = function (distanceInMeters) {
            if (distanceInMeters === void 0) { distanceInMeters = 0; }
            console.log(this.name + " moved " + distanceInMeters + "m.");
        };
        return Animal;
    }());
    var Snake = /** @class */ (function (_super) {
        __extends(Snake, _super);
        function Snake(name) {
            return _super.call(this, name) || this;
        }
        Snake.prototype.move = function (distanceInMeters) {
            if (distanceInMeters === void 0) { distanceInMeters = 5; }
            console.log("Slithering...");
            _super.prototype.move.call(this, distanceInMeters);
        };
        return Snake;
    }(Animal));
    var Horse = /** @class */ (function (_super) {
        __extends(Horse, _super);
        function Horse(name) {
            return _super.call(this, name) || this;
        }
        Horse.prototype.move = function (distanceInMeters) {
            if (distanceInMeters === void 0) { distanceInMeters = 45; }
            console.log("Galloping...");
            _super.prototype.move.call(this, distanceInMeters);
        };
        return Horse;
    }(Animal));
    var sam = new Snake("Sammy the Python");
    var tom = new Horse("Tommy the Palomino");
    sam.move();
    tom.move(34);
}
// exInheritance();
function exPolymorphism() {
    var CheckingAccount = /** @class */ (function () {
        function CheckingAccount() {
        }
        CheckingAccount.prototype.open = function (initialAmount) {
            console.log("Initial amount: " + initialAmount);
        };
        return CheckingAccount;
    }());
    var BusinessCheckingAccount = /** @class */ (function (_super) {
        __extends(BusinessCheckingAccount, _super);
        function BusinessCheckingAccount() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        BusinessCheckingAccount.prototype.open = function (initialAmount) {
            if (initialAmount < 1000) {
                throw new Error("Business accounts must have an initial deposit of 1.000 Euros");
            }
            _super.prototype.open.call(this, initialAmount);
        };
        return BusinessCheckingAccount;
    }(CheckingAccount));
    var PersonalCheckingAccount = /** @class */ (function (_super) {
        __extends(PersonalCheckingAccount, _super);
        function PersonalCheckingAccount() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PersonalCheckingAccount.prototype.open = function (initialAmount) {
            if (initialAmount <= 0) {
                throw new Error("Personal accounts must have an initial deposit of more than zero Euros");
            }
            _super.prototype.open.call(this, initialAmount);
        };
        return PersonalCheckingAccount;
    }(CheckingAccount));
    var account1 = new BusinessCheckingAccount();
    try {
        account1.open(301);
    }
    catch (ex) {
        console.log(ex.message);
    }
    account1.open(1001);
    var account2 = new PersonalCheckingAccount();
    try {
        account2.open(-1);
    }
    catch (ex) {
        console.log(ex.message);
    }
    account2.open(1);
}
// exPolymorphism();
function exEncapsulation() {
    var BankMember = /** @class */ (function () {
        function BankMember(savingsBalance) {
            this._savingsBalance = savingsBalance;
        }
        Object.defineProperty(BankMember.prototype, "savingsBalance", {
            get: function () {
                return this._savingsBalance;
            },
            set: function (newBalance) {
                if (newBalance < 0) {
                    console.log("Wrong value");
                    return;
                }
                this._savingsBalance = newBalance;
            },
            enumerable: false,
            configurable: true
        });
        BankMember.prototype.deposit = function (amount) {
            this._savingsBalance += amount;
        };
        BankMember.prototype.withdraw = function (amount) {
            if (this.savingsBalance < amount) {
                console.log("Insufficient Funds");
                return;
            }
            this._savingsBalance -= amount;
        };
        return BankMember;
    }());
    var chuck = new BankMember(3000);
    console.log("\nDepositing Funds");
    chuck.deposit(150);
    console.log("Chuck's Savings Balance: $" + chuck.savingsBalance + " \n");
    console.log("Malicious Account Fraud Happening here.... \n");
    chuck.savingsBalance = -1;
    chuck.savingsBalance = 0;
    console.log("Withdrawing Funds");
    chuck.withdraw(1650);
    console.log("Chuck's Savings Balance: $" + chuck.savingsBalance + " \n");
}
// exEncapsulation();
function exProtectedConstructor() {
    var Person = /** @class */ (function () {
        function Person(theName) {
            this.name = theName;
        }
        return Person;
    }());
    // Employee can extend Person
    var Employee = /** @class */ (function (_super) {
        __extends(Employee, _super);
        function Employee(name, department) {
            var _this = _super.call(this, name) || this;
            _this.department = department;
            return _this;
        }
        Employee.prototype.getElevatorPitch = function () {
            return "Hello, my name is " + this.name + " and I work in " + this.department + ".";
        };
        return Employee;
    }(Person));
    var howard = new Employee("Howard", "Sales");
    // let john = new Person("John");
    console.log(howard.getElevatorPitch());
}
// exProtectedConstructor();
function exSimilarNamesDifferentSense() {
    var a = { x: 5, y: 4 };
    console.log(a.x + a.y);
    var Foo2 = /** @class */ (function () {
        function Foo2() {
            this.x = 0;
        }
        return Foo2;
    }());
    var a2 = {
        x: 5,
        y: 5,
    };
    console.log(a2.x + a2.y);
}
// exSimilarNamesDifferentSense();
function exAnonymousClass() {
    var Runnable = /** @class */ (function () {
        function Runnable() {
        }
        return Runnable;
    }());
    var runnable = new (/** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.run = function () {
            console.log("Hi");
        };
        return class_1;
    }(Runnable)))();
    runnable.run();
}
// exAnonymousClass();
function exInterfaceCallback() {
    var Fetcher = /** @class */ (function () {
        function Fetcher() {
        }
        Fetcher.prototype.getObject = function (done) {
            console.log("getObject");
            done(1);
        };
        return Fetcher;
    }());
    new Fetcher().getObject(function (_a) {
        var _b = _a.field, field = _b === void 0 ? "value" : _b;
        console.log(field);
    });
    new Fetcher().getObject(function (_a) {
        var _b = _a.field, field = _b === void 0 ? "value" : _b, _c = _a.time, time = _c === void 0 ? 10 : _c;
        console.log(field);
        console.log(time);
    });
    new Fetcher().getObject(function () {
        console.log("no fields");
    });
    var Fetcher2 = /** @class */ (function () {
        function Fetcher2() {
        }
        Fetcher2.prototype.getObject = function (done) {
            console.log("getObject2");
            done(1);
        };
        return Fetcher2;
    }());
    new Fetcher2().getObject(function (_a) {
        var _b = _a.field, field = _b === void 0 ? "value" : _b;
        console.log(field);
    });
    new Fetcher2().getObject(function (_a) {
        var _b = _a.field, field = _b === void 0 ? "value" : _b, _c = _a.time, time = _c === void 0 ? 10 : _c;
        console.log(field);
        console.log(time);
    });
    new Fetcher2().getObject(function () {
        console.log("no fields");
    });
}
// exInterfaceCallback();
function exOverloadingConstructors() {
    // union
    var Foo = /** @class */ (function () {
        function Foo(name) {
            this._name = name;
        }
        return Foo;
    }());
    var f1 = new Foo("bar");
    var f2 = new Foo(1);
    console.log(f1);
    console.log(f2);
    // optional param
    var Box = /** @class */ (function () {
        function Box(obj) {
            this.x = (obj && obj.x) || 0;
            this.y = (obj && obj.y) || 0;
            this.height = (obj && obj.height) || 0;
            this.width = (obj && obj.width) || 0;
        }
        return Box;
    }());
    // default param
    var Box2 = /** @class */ (function () {
        function Box2(obj) {
            if (obj === void 0) { obj = { x: 0, y: 0, height: 0, width: 0 }; }
            this.x = obj.x;
            this.y = obj.y;
            this.height = obj.height;
            this.width = obj.width;
        }
        return Box2;
    }());
    // static factory
    var Person = /** @class */ (function () {
        function Person(fullName, age, gender) {
            this.fullName = fullName;
            this.age = age;
            this.gender = gender;
        }
        Person.fromData = function (data) {
            var first = data.first, last = data.last, birthday = data.birthday, _a = data.gender, gender = _a === void 0 ? "M" : _a;
            return new this(last + ", " + first, birthday, gender);
        };
        return Person;
    }());
    // let personA = new Person("Doe, John", "31", "M");
    var personB = Person.fromData({
        first: "John",
        last: "Doe",
        birthday: "10-09-1986",
    });
    console.log(personB);
}
// exOverloadingConstructors();
function exMixin() {
    var Disposable = /** @class */ (function () {
        function Disposable() {
            this.isDisposed = true;
        }
        Disposable.prototype.dispose = function () {
            this.isDisposed = true;
        };
        return Disposable;
    }());
    var Activatable = /** @class */ (function () {
        function Activatable() {
            this.isActive = true;
        }
        Activatable.prototype.activate = function () {
            this.isActive = true;
        };
        Activatable.prototype.deactivate = function () {
            this.isActive = false;
        };
        return Activatable;
    }());
    var SmartObject = /** @class */ (function () {
        function SmartObject() {
            var _this = this;
            this.index = -1;
            setInterval(function () {
                console.log(_this.index + ": " + _this.isActive + " : " + _this.isDisposed);
                _this.index++;
            }, 500);
        }
        SmartObject.prototype.interact = function () {
            this.activate();
            this.dispose();
        };
        return SmartObject;
    }());
    applyMixins(SmartObject, [Disposable, Activatable]);
    var smartObj = new SmartObject();
    setTimeout(function () { return smartObj.interact(); }, 1000);
    function applyMixins(derivedCtor, baseCtors) {
        baseCtors.forEach(function (baseCtor) {
            Object.getOwnPropertyNames(baseCtor.prototype).forEach(function (name) {
                Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
            });
        });
    }
}
// exMixin();
function exMixin2() {
    var Person = /** @class */ (function () {
        function Person(name) {
            this.name = name;
        }
        return Person;
    }());
    var ConsoleLogger = /** @class */ (function () {
        function ConsoleLogger() {
        }
        ConsoleLogger.prototype.log = function (name) {
            console.log("Hello, I'm " + name + ".");
        };
        return ConsoleLogger;
    }());
    // Takes two objects and merges them together
    function extend(first, second) {
        var result = {};
        for (var prop in first) {
            if (first.hasOwnProperty(prop)) {
                result[prop] = first[prop];
            }
        }
        for (var prop in second) {
            if (second.hasOwnProperty(prop)) {
                result[prop] = second[prop];
            }
        }
        return result;
    }
    var jim = extend(new Person("Jim"), ConsoleLogger.prototype);
    jim.log(jim.name);
}
// exMixin2();
