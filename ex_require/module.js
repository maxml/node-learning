console.log("evaluating example.js");

const invisible = function () {
    console.log("invisible");
}

module.exports.message = "hi";

module.exports.say = function () {
    console.log(exports.message);
}

module.exports.rand = Math.random();