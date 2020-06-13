import "./app";

import { StringValidator } from "./entity";
import { StringValidator as MainValdator } from "./entity";

// import type {APIResponseType} from "./api";
import utils from "./app";

import * as validator from "./entity";
let myValidator = new validator.Car();

utils.hey();
new MainValdator().isAcceptable("");

import * as URL from "url";
let myUrl = URL.parse("http://www.typescriptlang.org");
console.log(myUrl);

import * as myLargeModule from "./app";
let dog = new myLargeModule.Dog();
console.log(dog);

import { Validation } from "./namespaces";

function exNamespaces() {
  // Some samples to try
  let strings = ["Hello", "98052", "101"];

  // Validators to use
  let validators: { [s: string]: Validation.StringValidator } = {};
  validators["ZIP code"] = new Validation.ZipCodeValidator();
  validators["Letters only"] = new Validation.LettersOnlyValidator();

  // Show whether each string passed each validator
  for (let s of strings) {
    for (let name in validators) {
      console.log(
        `"${s}" - ${
          validators[name].isAcceptable(s) ? "matches" : "does not match"
        } ${name}`
      );
    }
  }
}
// exNamespaces();
