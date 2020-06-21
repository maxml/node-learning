"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
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
function exVariables() {
    // =========== constiable types
    console.log(Number.MAX_SAFE_INTEGER);
    console.log(Number.MAX_SAFE_INTEGER + 1);
    console.log(Number.MAX_VALUE);
    console.log(Number.MIN_VALUE);
    // boolean, number, string
    var isBegginer;
    isBegginer = true;
    var decimal = 6;
    var hex = 0xf00d;
    var binary = 10;
    var octal = 484;
    var sentence = "dsfgsd\nsdfgsd sfdgsdfg " + isBegginer;
    console.log("Sentence: " + sentence);
    var a = null;
    var b;
    console.log(typeof a);
    console.log(typeof b);
    var list = [1, 2, 3];
    var list2 = [1, 2, 3];
    console.log(list);
    // tuple
    var x;
    x = ["hello", 10];
    x = ["true", 10];
    console.log(x[0].substring(1));
    // console.log(x[1].substring(1));
    // any
    var notSure2 = 4;
    notSure2 = "maybe a string instead";
    notSure2 = false;
    var notSure = 4.23;
    // console.log(notSure.toFixed());
    // notSure.ifItExists();
    // Object
    var prettySure = {
        caount: 4,
    };
    console.log(prettySure.toString());
    console.log(prettySure.valueOf());
    Object.create({ prop: 0 });
    Object.create(null);
    // Object.create(42);
    // Object.create("string");
    // Object.create(false);
    // Object.create(undefined);
    // void
    function warnUser() {
        console.log("This is my warning message");
    }
    var unusable = undefined;
    // unusable = null;
    // never
    function error(message) {
        throw new Error(message);
    }
    function fail() {
        return error("Something failed");
    }
    //   fail();
}
// exVariables();
function exAny() {
    var sayHello = function (name) {
        console.log("Hello, " + name + "!");
    };
    var x = { field: "value" };
    // sayHello(x);
    sayHello(x);
    sayHello(x);
    var value = "sdf";
    var value2 = 10;
    // (value2 as string).toUpperCase()
}
// exAny();
function exObjects() {
    var myObj = {
        name: "my_obj",
        value: 24,
        tag: null,
    };
    if (myObj.value > 20) {
        // myObj.tag = {};
    }
}
// exObjects();
function nullVsObject() {
    // https://github.com/Microsoft/TypeScript/pull/7140
    var a = { name: "Bob", salary: 40000 };
    // const b: Employee1 = { name: "Bob" };
    // const c: Employee1 = { name: "Bob", salary: undefined };
    // const d: Employee1 = { name: null, salary: undefined };
}
// nullVsObject();
function exEnums() {
    console.log(4 /* Large */);
    console.log(4 /* "Large" */);
    var Color;
    (function (Color) {
        Color[Color["Red"] = 2] = "Red";
        Color[Color["Green"] = 8] = "Green";
        Color[Color["Blue"] = 10] = "Blue";
    })(Color || (Color = {}));
    console.log(Color.Red);
    console.log(Color.Blue);
    console.log(Color[Color.Blue]);
    var Direction;
    (function (Direction) {
        Direction["Up"] = "UP";
        Direction["Down"] = "DOWN";
        Direction["Left"] = "LEFT";
        Direction["Right"] = "RIGHT";
    })(Direction || (Direction = {}));
    console.log(Direction.Up);
    console.log("====" + Direction.Left.toString());
    console.log("====" + Direction.Left.valueOf());
    console.log(Direction["Up"]);
    var HeterogeneousEnum;
    (function (HeterogeneousEnum) {
        HeterogeneousEnum[HeterogeneousEnum["No"] = 0] = "No";
        HeterogeneousEnum["Yes"] = "YES";
    })(HeterogeneousEnum || (HeterogeneousEnum = {}));
    console.log(HeterogeneousEnum.Yes);
    console.log(HeterogeneousEnum.No);
    var user = "sdfsdf";
    var FileAccess;
    (function (FileAccess) {
        // constant members
        FileAccess[FileAccess["None"] = 0] = "None";
        FileAccess[FileAccess["Read"] = 2] = "Read";
        FileAccess[FileAccess["Write"] = user.length] = "Write";
        FileAccess[FileAccess["ReadWrite"] = FileAccess.Read | FileAccess.Write] = "ReadWrite";
        // computed member
        FileAccess[FileAccess["G"] = "123".length] = "G";
    })(FileAccess || (FileAccess = {}));
    console.log(FileAccess.None);
    console.log(FileAccess.G);
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
        LogLevel[LogLevel["WARN"] = 1] = "WARN";
        LogLevel[LogLevel["INFO"] = 2] = "INFO";
        LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
    })(LogLevel || (LogLevel = {}));
    function printImportant(key, message) {
        var num = LogLevel[key];
        if (num <= LogLevel.WARN) {
            console.log("Log level key is:", key);
            console.log("Log level value is:", num);
            console.log("Log level message is:", message);
        }
    }
    printImportant("ERROR", "This is a message");
}
// exEnums();
function exAssertions() {
    var someValue = "this is a string";
    var strLength = someValue.length;
    var someValue2 = "this is a string";
    var strLength2 = someValue2.length;
    var code = "123";
    var employeeCode = code.length;
    console.log(typeof employeeCode);
    console.log(employeeCode);
    var code2 = { field: "value" };
    var employeeCode2 = code2.length;
    console.log(typeof employeeCode2);
    console.log(employeeCode2);
    var code3 = 123;
    var employeeCode3 = code3;
    console.log(typeof employeeCode3);
    console.log(employeeCode3);
    var Foo = /** @class */ (function () {
        function Foo() {
            this.bar = 0;
            this.bas = "";
        }
        return Foo;
    }());
    var foo = {
    // for the compiler
    // easy to forget adding all the properties
    // break if Foo gets refactored
    };
    function handler(event) {
        var element = event;
    }
}
// exAssertions();
function varErrors() {
    function sumMatrix(matrix) {
        var sum = 0;
        for (var i = 0; i < matrix.length; i++) {
            var currentRow = matrix[i];
            for (var i = 0; i < currentRow.length; i++) {
                sum += currentRow[i];
            }
        }
        return sum;
    }
    console.log("Sum = " +
        sumMatrix([
            [1, 2, 3],
            [1, 2, 3],
            [1, 2, 3],
        ]));
    for (var i = 0; i < 10; i++) {
        setTimeout(function () {
            console.log(i);
        }, 100 * i);
    }
    for (var i = 0; i < 10; i++) {
        // IIFE
        (function (i) {
            setTimeout(function () {
                console.log(i);
            }, 100 * i);
        })(i);
    }
}
// varErrors();
function exUnions() {
    function log(message, color) {
        console.log(message);
        console.log(color);
    }
    log("hey", "black");
    function assertNever(x) {
        throw new Error("Unexpected object: " + x);
    }
    function area(s) {
        switch (s.kind) {
            case "square":
                return s.size * s.size;
            case "rectangle":
                return s.height * s.width;
            case "circle":
                return Math.PI * Math.pow(s.radius, 2);
            default:
                return assertNever(s);
        }
    }
}
// exUnions();
function exDestructuring() {
    var _a, _b, _c;
    var input = [1, 2];
    var _d = __read(input, 2), first = _d[0], second = _d[1];
    console.log(first);
    console.log(second);
    input = [1, 2, 3];
    _a = __read(input, 2), first = _a[0], second = _a[1];
    console.log(first);
    console.log(second);
    input = [1, 2, 3];
    _b = input, _c = __read(_b), first = _c[0], input = _c.slice(1);
    console.log(first);
    console.log(input);
    var tuple = [7, "hello", true];
    var _e = __read(tuple, 3), a2 = _e[0], b2 = _e[1], c2 = _e[2];
    var _f = __read(tuple, 2), d = _f[1];
    var o = {
        a: "foo",
        b: 12,
        c: "bar",
    };
    // let { a, c } = o;
    // let { e, f } = o;
    var newName1 = o.a, newName2 = o.b;
    function f(_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.a, a = _c === void 0 ? "" : _c, _d = _b.b, b = _d === void 0 ? 0 : _d;
    }
    f();
    function keepWholeObject(wholeObject) {
        var a = wholeObject.a, _a = wholeObject.b, b = _a === void 0 ? 1001 : _a;
    }
}
// exDestructuring();
function exLiteral() {
    var UIElement = /** @class */ (function () {
        function UIElement() {
        }
        UIElement.prototype.animate = function (dx, dy, easing) {
            if (easing === "ease-in") {
                // ...
            }
            else if (easing === "ease-out") {
            }
            else if (easing === "ease-in-out") {
            }
            else {
                // It's possible that someone could reach this
                // by ignoring your types though.
            }
            console.log(easing);
        };
        return UIElement;
    }());
    var button = new UIElement();
    button.animate(0, 0, "ease-in");
    // button.animate(0, 0, "uneasy");
    function rollDice() {
        return (Math.floor(Math.random() * 5) + 1);
    }
    console.log(rollDice());
    console.log({ lng: -73.935242, lat: 40.73061, tileSize: 16 });
}
// exLiteral();
function exTypeOf() {
    function isNumber(x) {
        return typeof x === "number";
    }
    function isString(x) {
        return typeof x === "string";
    }
    function paddingLeft(value, padding) {
        if (isNumber(padding)) {
            return Array(padding + 1).join(" ") + value;
        }
        if (isString(padding)) {
            return padding + value;
        }
        throw new Error("Expected string or number, got '" + padding + "'.");
    }
    console.log(paddingLeft("10", 10));
    console.log(paddingLeft("10", "10"));
}
// exTypeOf();
function exInstanceOf() {
    var SpaceRepeatingPadder = /** @class */ (function () {
        function SpaceRepeatingPadder(numSpaces) {
            this.numSpaces = numSpaces;
        }
        SpaceRepeatingPadder.prototype.getPaddingString = function () {
            return Array(this.numSpaces + 1).join(" ");
        };
        return SpaceRepeatingPadder;
    }());
    var StringPadder = /** @class */ (function () {
        function StringPadder(value) {
            this.value = value;
        }
        StringPadder.prototype.getPaddingString = function () {
            return this.value;
        };
        return StringPadder;
    }());
    function getRandomPadder() {
        return Math.random() < 0.5
            ? new SpaceRepeatingPadder(4)
            : new StringPadder("  ");
    }
    var padder = getRandomPadder();
    if (padder instanceof SpaceRepeatingPadder) {
        console.log("1" + JSON.stringify(padder));
    }
    if (padder instanceof StringPadder) {
        console.log("2" + JSON.stringify(padder));
    }
}
// exInstanceOf();
function exPredicates() {
    function getSmallPet() {
        if (Math.random() > 0.5) {
            return {
                fly: function () { },
            };
        }
        else {
            return {
                swim: function () { },
            };
        }
    }
    var pet = getSmallPet();
    // type guards
    function hasName(obj) {
        return !!obj && typeof obj === "object" && name in obj;
    }
    console.log(hasName);
    // https://github.com/microsoft/TypeScript/issues/33792
    if (pet.fly === undefined) {
        pet.swim();
    }
    else {
        pet.fly();
    }
    console.log(pet.swim);
    console.log(pet.fly);
    function isFish(pet) {
        return pet.swim !== undefined;
    }
    // let pet2: unknown = undefined;
    if (isFish(pet)) {
        pet.swim();
    }
    else {
        pet.fly();
    }
    function move(pet) {
        if ("swim" in pet) {
            return pet.swim();
        }
        return pet.fly();
    }
    var isOfType = function (varToBeChecked, propertyToCheckFor) {
        return varToBeChecked[propertyToCheckFor] !== undefined;
    };
    console.log(isOfType(pet, "swim"));
    console.log(isOfType(pet, "fly"));
    console.log(isOfType(pet, "wadfdf"));
}
// exPredicates();
function exNullable() {
    function broken(name) {
        function postfix(epithet) {
            return ""; //name.charAt(0) + ".  the " + epithet;
        }
        name = name || "Bob";
        return postfix("great");
    }
    function f(sn) {
        if (sn == null) {
            return "default";
        }
        else {
            return sn;
        }
    }
    function f2(sn) {
        return sn || "default";
    }
    function fixed(name) {
        function postfix(epithet) {
            return name.charAt(0) + ".  the " + epithet;
        }
        name = name || "Bob";
        return postfix("great");
    }
    console.log(fixed("test"));
    console.log(fixed(null));
}
// exNullable();
function exTypes() {
    var people = {};
    var s = people.name;
    var s1 = people.next.name;
    var s2 = people.next.next.name;
    var s3 = people.next.next.next.name;
}
function interfacesVsAliases() {
    // declare function aliased(arg: Alias): Alias;
    // declare function interfaced(arg: Interface): Interface;
}
function exFields() {
    function pluck(o, propertyNames) {
        return propertyNames.map(function (n) { return o[n]; });
    }
    var taxi = {
        manufacturer: "Toyota",
        model: "Camry",
        year: 2014,
    };
    var makeAndModel = pluck(taxi, ["manufacturer", "model"]);
    console.log(makeAndModel);
    var modelYear = pluck(taxi, ["model", "year"]);
    console.log(modelYear);
    var carProps;
    function getProperty(o, propertyName) {
        return o[propertyName]; // o[propertyName] is of type T[K]
    }
    var name = getProperty(taxi, "manufacturer");
    var year = getProperty(taxi, "year");
    // let unknown = getProperty(taxi, "unknown");
    console.log(name);
    console.log(year);
    var obj = {};
    obj.prop = "value";
    obj.prop2 = 88;
    console.log(obj);
    var obj2;
    obj2 = { requiredProp1: "foo" }; // valid
    // obj2 = {};
    // obj2.typesafeProp1 = "bar";
    obj.prop = "value";
    obj.prop2 = 88;
    console.log(obj);
}
// exFields();
function exMappedTypes() {
}
// exMappedTypes();
/**
 * https://www.staging-typescript.org/docs/handbook/advanced-types.html
 */
function exConditionalTypes() {
    function f1(x, y) {
        x = y; // Ok
        // y = x; // Error
    }
    function f2(x, y) {
        x = y; // Ok
        // y = x; // Error
        // let s1: string = x; // Error
        var s2 = y; // Ok
    }
}
function exInference() {
}
// changed tsconfig
function exIterators() {
    var e_1, _a, e_2, _b;
    var someArray = [1, "string", false];
    try {
        for (var someArray_1 = __values(someArray), someArray_1_1 = someArray_1.next(); !someArray_1_1.done; someArray_1_1 = someArray_1.next()) {
            var entry = someArray_1_1.value;
            console.log(entry);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (someArray_1_1 && !someArray_1_1.done && (_a = someArray_1.return)) _a.call(someArray_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var list = [4, 5, 6];
    for (var i in list) {
        console.log(i);
    }
    try {
        for (var list_1 = __values(list), list_1_1 = list_1.next(); !list_1_1.done; list_1_1 = list_1.next()) {
            var i = list_1_1.value;
            console.log(i);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (list_1_1 && !list_1_1.done && (_b = list_1.return)) _b.call(list_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
}
// exIterators();
function exSymbols() {
    var _a;
    var sym = Symbol();
    var obj = (_a = {},
        _a[sym] = "value",
        _a);
    console.log(obj[sym]);
    var getClassNameSymbol = Symbol();
    var C = /** @class */ (function () {
        function C() {
        }
        C.prototype[getClassNameSymbol] = function () {
            return "C";
        };
        return C;
    }());
    var c = new C();
    var className = c[getClassNameSymbol]();
    // Symbol.
}
// exSymbols();
function exUtility() {
    // https://www.typescriptlang.org/docs/handbook/utility-types.html
    function f1(s) {
        return { a: 1, b: s };
    }
    var C = /** @class */ (function () {
        function C() {
            this.x = 0;
            this.y = 0;
        }
        return C;
    }());
    // type T23 = InstanceType<string>; // Error
    // type T24 = InstanceType<Function>; // Error
}
