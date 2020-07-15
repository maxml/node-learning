"use strict";
var RealSubject = /** @class */ (function () {
    function RealSubject() {
    }
    RealSubject.prototype.request = function () {
        console.log("RealSubject: Handling request.");
    };
    return RealSubject;
}());
var ExProxy = /** @class */ (function () {
    function ExProxy(subject) {
        this.subject = subject;
    }
    ExProxy.prototype.request = function () {
        if (this.checkAccess()) {
            this.subject.request();
            this.logAccess();
        }
    };
    ExProxy.prototype.checkAccess = function () {
        console.log("Proxy: Checking access prior to firing a real request.");
        return true;
    };
    ExProxy.prototype.logAccess = function () {
        console.log("Proxy: Logging the time of request.");
    };
    return ExProxy;
}());
console.log("Client: Executing the client code with a real subject:");
var realSubject = new RealSubject();
realSubject.request();
console.log("");
console.log("Client: Executing the same client code with a proxy:");
var proxy = new ExProxy(realSubject);
proxy.request();
