"use strict";
var Singleton = /** @class */ (function () {
    function Singleton() {
    }
    Singleton.getInstance = function () {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }
        return Singleton.instance;
    };
    Singleton.prototype.someBusinessLogic = function () { };
    return Singleton;
}());
function exSingleton() {
    var s1 = Singleton.getInstance();
    var s2 = Singleton.getInstance();
    if (s1 === s2) {
        console.log("Singleton works, both variables contain the same instance.");
    }
    else {
        console.log("Singleton failed, variables contain different instances.");
    }
}
exSingleton();
