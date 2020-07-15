"use strict";
var WinButton = /** @class */ (function () {
    function WinButton() {
    }
    WinButton.prototype.paint = function () {
        console.log("Win");
    };
    return WinButton;
}());
var MacButton = /** @class */ (function () {
    function MacButton() {
    }
    MacButton.prototype.paint = function () {
        console.log("Mac");
    };
    return MacButton;
}());
var WinCheckbox = /** @class */ (function () {
    function WinCheckbox() {
    }
    WinCheckbox.prototype.paint = function () { };
    return WinCheckbox;
}());
var MacCheckbox = /** @class */ (function () {
    function MacCheckbox() {
    }
    MacCheckbox.prototype.paint = function () { };
    return MacCheckbox;
}());
var WinFactory = /** @class */ (function () {
    function WinFactory() {
    }
    WinFactory.prototype.createButton = function () {
        return new WinButton();
    };
    WinFactory.prototype.createCheckbox = function () {
        return new WinCheckbox();
    };
    return WinFactory;
}());
var MacFactory = /** @class */ (function () {
    function MacFactory() {
    }
    MacFactory.prototype.createButton = function () {
        return new MacButton();
    };
    MacFactory.prototype.createCheckbox = function () {
        return new MacCheckbox();
    };
    return MacFactory;
}());
var Application = /** @class */ (function () {
    function Application(factory) {
        this.factory = factory;
    }
    Application.prototype.createUI = function () {
        this.button = this.factory.createButton();
    };
    Application.prototype.paint = function () {
        this.button.paint();
    };
    return Application;
}());
var ApplicationConfigurator = /** @class */ (function () {
    function ApplicationConfigurator() {
    }
    ApplicationConfigurator.prototype.main = function () {
        var config = {
            OS: "",
        };
        config.OS = "Windows";
        var factory;
        if (config.OS == "Windows") {
            factory = new WinFactory();
        }
        else if (config.OS == "Mac") {
            factory = new MacFactory();
        }
        else
            throw new Error("Error! Unknown operating system.");
        var app = new Application(factory);
        app.createUI();
        app.paint();
    };
    return ApplicationConfigurator;
}());
new ApplicationConfigurator().main();
