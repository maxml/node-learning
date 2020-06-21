export namespace Validation {
  export interface StringValidator {
    isAcceptable(s: string): boolean;
  }

  const lettersRegexp = /^[A-Za-z]+$/;
  const numberRegexp = /^[0-9]+$/;

  export class LettersOnlyValidator implements StringValidator {
    isAcceptable(s: string) {
      return lettersRegexp.test(s);
    }
  }

  export class ZipCodeValidator implements StringValidator {
    isAcceptable(s: string) {
      return s.length === 5 && numberRegexp.test(s);
    }
  }
}

function exInitializing() {
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
// exInitializing();

namespace X {
  export interface Y {}
  export class Z {}
}

// ... elsewhere ...
namespace X {
  export let y: number = 0;
  export namespace Z {
    export class C {}
  }
}
type X = string;

function exAdvanced() {
  console.log(new X.Z.C());

  X.y = 9;
  console.log(new X.Z());

  const a: X = "asd";
  console.log(a);
}
// exAdvanced();
