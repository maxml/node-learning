"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// declare function require(name: string): any;
var sampleModule = require("./entity");
var entity_1 = require("./entity");
require("./app");
var app_1 = __importDefault(require("./app"));
// import type {APIResponseType} from "./api";
var validator = __importStar(require("./entity"));
var myLargeModule = __importStar(require("./app"));
var URL = __importStar(require("url"));
function exImporting() {
    console.log(sampleModule);
    var myValidator = new validator.Car();
    console.log(myValidator);
    console.log("JSON = " + myValidator.toJSON());
    console.log(JSON.stringify(myValidator));
    app_1.default.hey();
    new entity_1.StringValidator().isAcceptable("");
    var myUrl = URL.parse("http://www.typescriptlang.org");
    console.log(myUrl);
    var dog = new myLargeModule.Dog();
    console.log(dog);
}
exImporting();
var namespaces_1 = require("./namespaces");
function exNamespaces() {
    var e_1, _a;
    var strings = ["Hello", "98052", "101"];
    var validators = {};
    validators["ZIP code"] = new namespaces_1.Validation.ZipCodeValidator();
    validators["Letters only"] = new namespaces_1.Validation.LettersOnlyValidator();
    try {
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
// exNamespaces();
var entity_2 = require("./entity");
function exAdvancedDeclarations() {
    var x = entity_2.Bar.a;
    console.log(x.count);
}
// exAdvancedDeclarations();
