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
var Component = /** @class */ (function () {
    function Component(parent) {
        this.parent = parent ? parent : null;
    }
    Component.prototype.setParent = function (parent) {
        this.parent = parent;
    };
    Component.prototype.getParent = function () {
        return this.parent;
    };
    Component.prototype.add = function (component) { };
    Component.prototype.remove = function (component) { };
    Component.prototype.isComposite = function () {
        return false;
    };
    return Component;
}());
var Leaf = /** @class */ (function (_super) {
    __extends(Leaf, _super);
    function Leaf() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Leaf.prototype.operation = function () {
        return "Leaf";
    };
    return Leaf;
}(Component));
var Composite = /** @class */ (function (_super) {
    __extends(Composite, _super);
    function Composite() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.children = [];
        return _this;
    }
    Composite.prototype.add = function (component) {
        this.children.push(component);
        component.setParent(this);
    };
    Composite.prototype.remove = function (component) {
        var componentIndex = this.children.indexOf(component);
        this.children.splice(componentIndex, 1);
        component.setParent(null);
    };
    Composite.prototype.isComposite = function () {
        return true;
    };
    Composite.prototype.operation = function () {
        var results = [];
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            results.push(child.operation());
        }
        return "Branch(" + results.join("+") + ")";
    };
    return Composite;
}(Component));
function exComposite(component) {
    console.log("RESULT: " + component.operation());
}
var simple = new Leaf();
console.log("Client: I've got a simple component:");
exComposite(simple);
console.log("");
var tree = new Composite();
var branch1 = new Composite();
branch1.add(new Leaf());
branch1.add(new Leaf());
var branch2 = new Composite();
branch2.add(new Leaf());
tree.add(branch1);
tree.add(branch2);
console.log("Client: Now I've got a composite tree:");
exComposite(tree);
console.log("");
function exComposite2(component1, component2) {
    if (component1.isComposite()) {
        component1.add(component2);
    }
    console.log("RESULT: " + component1.operation());
}
console.log("Client: I don't need to check the components classes even when managing the tree:");
exComposite2(tree, simple);
