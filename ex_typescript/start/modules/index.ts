import { StringValidator } from "./entity";
import { StringValidator as MainValdator } from "./entity";

import "./app";

import utils from "./app";

// import type {APIResponseType} from "./api";

import * as validator from "./entity";
import * as myLargeModule from "./app";

import * as URL from "url";

function exImporting() {
  let myValidator = new validator.Car();
  console.log(myValidator);

  utils.hey();

  new MainValdator().isAcceptable("");

  let myUrl = URL.parse("http://www.typescriptlang.org");
  console.log(myUrl);

  let dog = new myLargeModule.Dog();
  console.log(dog);
}
// exImporting();

import { Validation } from "./namespaces";

function exNamespaces() {
  let strings = ["Hello", "98052", "101"];

  let validators: { [s: string]: Validation.StringValidator } = {};
  validators["ZIP code"] = new Validation.ZipCodeValidator();
  validators["Letters only"] = new Validation.LettersOnlyValidator();

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

import { Bar } from "./entity";

function exAdvancedDeclarations() {
  let x: Bar = Bar.a;
  console.log(x.count);
}
// exAdvancedDeclarations();
