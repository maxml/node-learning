"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validation = void 0;
var Validation;
(function (Validation) {
    var lettersRegexp = /^[A-Za-z]+$/;
    var numberRegexp = /^[0-9]+$/;
    var LettersOnlyValidator = /** @class */ (function () {
        function LettersOnlyValidator() {
        }
        LettersOnlyValidator.prototype.isAcceptable = function (s) {
            return lettersRegexp.test(s);
        };
        return LettersOnlyValidator;
    }());
    Validation.LettersOnlyValidator = LettersOnlyValidator;
    var ZipCodeValidator = /** @class */ (function () {
        function ZipCodeValidator() {
        }
        ZipCodeValidator.prototype.isAcceptable = function (s) {
            return s.length === 5 && numberRegexp.test(s);
        };
        return ZipCodeValidator;
    }());
    Validation.ZipCodeValidator = ZipCodeValidator;
})(Validation = exports.Validation || (exports.Validation = {}));
function exInitializing() {
    var e_1, _a;
    // Some samples to try
    var strings = ["Hello", "98052", "101"];
    // Validators to use
    var validators = {};
    validators["ZIP code"] = new Validation.ZipCodeValidator();
    validators["Letters only"] = new Validation.LettersOnlyValidator();
    try {
        // Show whether each string passed each validator
        for (var strings_1 = __values(strings), strings_1_1 = strings_1.next(); !strings_1_1.done; strings_1_1 = strings_1.next()) {
            var s = strings_1_1.value;
            for (var name_1 in validators) {
                console.log("\"" + s + "\" - " + (validators[name_1].isAcceptable(s) ? "matches" : "does not match") + " " + name_1);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (strings_1_1 && !strings_1_1.done && (_a = strings_1.return)) _a.call(strings_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
// exInitializing();
var X;
(function (X) {
    var Z = /** @class */ (function () {
        function Z() {
        }
        return Z;
    }());
    X.Z = Z;
})(X || (X = {}));
// ... elsewhere ...
(function (X) {
    X.y = 0;
    var Z;
    (function (Z) {
        var C = /** @class */ (function () {
            function C() {
            }
            return C;
        }());
        Z.C = C;
    })(Z = X.Z || (X.Z = {}));
})(X || (X = {}));
function exAdvanced() {
    console.log(new X.Z.C());
    X.y = 9;
    console.log(new X.Z());
    var a = "asd";
    console.log(a);
}
// exAdvanced();
