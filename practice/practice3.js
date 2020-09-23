function exObject() {
  let user = {
    name: 12,
    hi() {
      console.log("sdfkjsnd");
      return "sdfsd";
    },
  };

  console.log(user.hi());

  let hi = user.hi;
  hi();

  let variable = undefined; // falsy values
  if (!user.name || !user.ldkjgf) {
    console.log("not");
  }

  console.log(user);
  for (let field in user) {
    console.log("field type:" + typeof field);
    if (typeof field === "function") {
      console.log("we found function!");
    }
  }

  console.log(Object.keys(user));
  console.log(Object.values(user));

  let admin = user;
  admin.name = "sdfs";

  console.log(user.name);

  let a = 0;
  let b = a;
  a = 2;
  b = 1;
  console.log(a);
  console.log(b);
}
// exObject();

function exChangingfObject() {
  function shdbf(person, variable) {
    person.name = "jnsdfklgj";
    // variable = 'sdfhkjds';
    return variable;
  }

  console.log(shdbf(admin, variable));
  console.log(variable);

  console.log(admin);
}
// exChangingfObject();

function exReferential() {
  let a = {
    key: "vaue",
  };
  let b = {
    key: "vaue",
  };
  let c = a;

  console.log(a == b);
  console.log(a === b);

  console.log(c === a);
  console.log(c === b);

  console.log(c == a);
  console.log(c == b);
}
// exReferential();

function exAssign() {
  let target = { a: 1, b: 2 };
  let source = { b: 4, c: 5 };

  Object.assign(target, source);
  console.log(target);
  console.log(source);
}
// exAssign();

function exShallowCopy() {
  let d = {
    sdfs: "sdfs",
    kay: "value",
    obj: {
      valud: "vasdsas",
    },
  };
  const d2 = Object.assign({ kay: "value2" }, d);
  console.log(d2);
  d.obj.valud = "fsjb skbjdf";
  console.log(d);
  console.log(d2);
}
// exShallowCopy();

function exObjectsWithMethods() {
  let obj03 = {
    ex: function () {
      console.log("sdf");
      function ab() {
        console.log(";lmgbn");
      }
      ab();
      return ab;
    },
  };

  console.log(obj03.ex());
}
// exObjectsWithMethods();

function exNewObjectsReferential() {
  function ExObject() {
    this.name = "wdf";
    this.isAdmin = false;
    console.log(new.target);
    this.ex = function () {
      console.log("xkdfbd");
    };
  }

  console.log(new ExObject());
  new ExObject().ex();
  console.log(new ExObject() === new ExObject());
  console.log(new ExObject() == new ExObject());
}
// exNewObjectsReferential();

// TODO:
function exConstructor() {
  function ExampleClass() {
    console.log("Object is creating");
  }

  const ex = new ExampleClass();
}
// exConstructor();

function exAdvancedConstructor() {
  function Calculator() {
    const ce = 3;
    const de = 4;

    // TODO:
    ab: 4;

    console.log("ce" + ce);

    console.log(Calculator.de);

    this.read = function () {
      this.a = 10;
      return sum(a + b);
    };

    read2 = function () {
      this.a = 10;
      return this.a + this.b;
    };

    function sum() {
      return a + b;
    }

    const a = 1;
    const b = 2;
    const ex = function () {
      console.log("de" + de);
    };

    ex();

    this.a = 0;

    // console.log(this)
    console.log("======================");
    // return;
  }

  let calculator = new Calculator();
  // console.log(calculator.read());
  // console.log(calculator.read2());

  // console.log(calculator.b)
  // console.log(calculator.ex)

  // console.log(Calculator.a)
  // console.log(calculator.a)

  // console.log(calculator.ab)
  // console.log(Calculator.ab)
}
// exAdvancedConstructor()

// SYMBOLS
function exSymbols() {
  let obj02 = {
    name: "dfg",
  };

  let id = Symbol("id_ex");
  let id2 = Symbol("id_ex");

  obj02[id] = "d;f;mhdflkg";
  obj02[id2] = "dsfd";

  console.log(obj02);

  // console.log('sdfsdf' + id)
  // console.log(Object.keys(obj02));
  // console.log('==================');

  // console.log(obj02.id)
  // console.log(obj02[id])
  // console.log(obj02['id_ex2'])
  // Reflect.ownKeys

  const id4 = Symbol.for("id_ex");
  // console.log(obj02)
  // console.log(obj02[id])
  // console.log(obj02[id4])

  obj02[id4] = "kjlbhvjkglb;lk";

  // console.log(obj02['id_ex']);
  // console.log(obj02[id4]);

  obj02[Symbol.for("id_ex")] = "ffsdf";
  console.log(obj02["id_ex"]);
  console.log(obj02[id4]);
  console.log(obj02[Symbol.for("id_ex")]);

  obj02 = {
    [id]: 123,
    [id2]: 2342,
  };

  console.log(obj02);
  console.log(obj02[id]);
}
// exSymbols();

// STRINGS
function exStrings() {
  console.log("sdfs" + "sdfsdf" + JSON.stringify(user04) + "sdfs");
  console.log("sdgs");

  console.log("sdgs"[0]);
  console.log("sdgs".length);

  console.log(`sdfsd ${JSON.stringify(user04)}`);

  console.log("\n");
  console.log("\r\n");
  console.log("'");
  console.log("/");
  console.log("\u00A9"); // ©
  console.log("\u{20331}"); // 佫, a rare Chinese hieroglyph (long unicode)
  console.log("\u{1F60D}"); // 😍, a smiling face symbol (another long unicode)

  let str01 = "";

  for (let i = 65; i <= 220; i++) {
    str01 += String.fromCodePoint(i);
  }

  console.log(str01);

  console.log("Österreich".localeCompare("Zealand"));
}
// exStrings()

function exChangeBetween() {
  let str = "stringify";

  console.log(str.substring(-2, 6));
  console.log(str.substring(6, 2));

  console.log(str.slice(2, 6));
  console.log(str.slice(6, 2));

  console.log(str.substr(-4, 2));
}
// exChangeBetween()

function exVarLetConst() {
  function sayHi01() {
    phrase01 = "Hello";

    console.log(phrase01);

    var phrase01;
  }
  // console.log(phrase01);

  function sayHi02() {
    phrase02 = "Hello";

    if (false) {
      var phrase02;
    }

    console.log(phrase02);
  }

  let sdfs = "sdf";
  const ssdf = {};

  const one = function () {
    function asd() {
      console.log(ab);
    }
    var ab = 1;
  };
  sayHi01();
  sayHi02();
  one();
}
// exVarLetConst();

// IIFE - immediately-invoked function expressions
function exIIFE() {
  (function () {
    console.log("Parentheses around the function");
  })();

  (function () {
    console.log("Parentheses around the whole thing");
  })();

  !(function () {
    console.log("Bitwise NOT operator starts the expression");
  })();

  +(function () {
    console.log("Unary plus starts the expression");
  })();
}
// exIIFE();

function exTimers() {
  setTimeout(() => {
    console.log("Hello1");
  }, 0);

  console.log("Hello2");

  setTimeout(() => {
    console.log("Hello3");
  }, 0);

  console.log("Hello4");

  setTimeout(() => {
    console.log("Hello5");
  }, 0);

  console.log("Hello6");
}
// exTimers();

const EXECUTE_RANDOM_ITERATIONS = 15;
function exHomework() {
  const ex = {
    createRandom: function () {
      this.name = Math.random();
      this.surname = Math.random();
      return this;
    },
  };

  // console.log(new ex().createRandom());
  // console.log(ex().createRandom());
  console.log(ex.createRandom());

  const arr = [];
  for (let index = 0; index < EXECUTE_RANDOM_ITERATIONS; index++) {
    const method = ex.createRandom;
    arr.push(method());
  }
  console.log(arr);
}
// exHomework();

function exThis() {
  function makeUser() {
    return {
      name: "John",
      ref: this,
      ref2: function () {
        return this;
      },
    };
  }
  let user05 = makeUser();
  console.log(user05.ref);
  console.log(user05.ref2().name);
}
// exThis();

function exThisLost() {
  let user04 = {
    name: "John",
    hi() {
      console.log("Hi " + this.name);
    },
    bye() {
      console.log("Bye");
    },
  };
  user04.hi();
  user04.bye();
  user04.name == "John" ? user04.hi() : user04.bye();
  (user04.name == "John" ? user04.hi : user04.bye)();
  console.log(this);
}
// exThisLost();

// TODO:
function exThisLost2() {
  let method;
  let obj01 = function () {
    //
    function go() {
      console.log(3);
      console.log(this);
    }
  };
  method = obj01.go;
  // obj01.go();
  method();
  (obj01.go || obj01.stop)();
  console.log(new.target);
  console.log(new obj01());
}

function exWeekendDay() {
  function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  function minusOneDay(date) {
    const dateOffset = 24 * 60 * 60 * 1000;
    const buff = new Date(date);
    buff.setTime(buff.getTime() - dateOffset);
    return buff;
  }

  // Date vs ms
  // timezone <- country
  // UTC +0
  // ms -> UTC vs UNIX, 1000
  const inputDate = new Date();
  let workedDaysAgo = 10;

  let res = inputDate;
  // console.log(res.toISOString());
  // console.log(res.toUTCString());
  // console.log(res.toJSON());

  while (workedDaysAgo >= 0) {
    const copy = new Date(res);
    res = minusOneDay(copy);

    if (!isWeekend(res)) {
      workedDaysAgo--;
    }
  }

  console.log(res.toJSON());
  return res;
}
exWeekendDay();
