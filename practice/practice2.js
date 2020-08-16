function exSwitch() {
  function checkAge(age) {
    if (!Number.isInteger(age)) {
      console.log("not a number");
      return false;
    }

    // TODO: get age as range

    const Ranges = {
      CHILD: {
        type: "CHILD",
        max: 18,
        min: 0,
      },
      TEENS: {
        type: "TEENS",
        min: 19,
        max: 30,
      },
      BOYS: {
        type: "BOYS",
        min: 31,
        max: 45,
      },
      MANS: {
        type: "MANS",
        min: 46,
        max: 100,
      },
    };

    const range = "BOYS";
    switch (range) {
      case Ranges.CHILD:
        console.log("You are " + new String(Ranges.CHILD).toLowerCase());
        break;
      case Ranges.TEENS:
      case Ranges.BOYS:
      case Ranges.MANS:
        console.log("All is ok!");
        break;
      default:
        console.log("I don't know such values");
    }
  }

  // checkAge();
  checkAge(0);
}
// exSwitch();

function exArraySample() {
  let array = new Array();

  console.log("length:" + array.length);
  console.log("0:" + array[0]);
  array[0] = 0;

  array.push("jdf", "sdfsdf");
  console.log(array.pop());
  console.log(array);

  array.unshift("sdfs", "sdfsd");
  array.unshift(["sdfs", "sdfsd"]);
  console.log(array);

  console.log(array.shift());
  console.log(array);

  // delete array[3];

  // console.log(array);

  function f(c) {
    let d = c || 3;
    // if (c === undefined) {
    //     c = 3;
    // }

    let a = 0;
    console.log(a);

    console.log("array" + array);

    console.log(d);

    return +"2" + "4";
  }

  let a = undefined;
  // console.log(f(a));

  // checkArrayMethodExecutionTime();

  // doArraySplice();
}
exArraySample();

function checkArrayMethodExecutionTime() {
  let arr2 = [];
  // arr2[2] = 3;
  console.log(arr2);

  function someFunction() {
    for (let i = 0; i < 100; i++) {
      arr2[i] = 1;
    }
  }

  function someFunction2() {
    for (let i = 0; i < 100; i++) {
      arr2.push(1);
    }
  }

  function someFunction3() {
    for (let i = 0; i < 100; i++) {
      arr2.unshift(1);
    }
  }

  arr2 = [];
  console.time("someFunction");

  someFunction(); // Whatever is timed goes between the two "console.time"
  console.log(arr2.length);

  console.timeEnd("someFunction");

  arr2 = [];
  console.time("someFunction2");

  someFunction2(); // Whatever is timed goes between the two "console.time"
  console.log(arr2.length);

  console.timeEnd("someFunction2");

  arr2 = [];
  console.time("someFunction3");

  someFunction3(); // Whatever is timed goes between the two "console.time"
  console.log(arr2.length);

  console.timeEnd("someFunction3");
}

function doArraySplice() {
  [["Bilbo", "dsfd"], "Gandalf", "Nazgul", "test"].forEach(
    (item, index, array) => {
      // console.log(`${item} is at index `);
      if (item === "Gandalf") {
        // console.log(array.slice());
        // console.log(array)
      }
    }
  );
}

function exArray2() {
  let array2 = [["Bilbo2", "dsfd2"], "Gandalf", "Nazgul", "test"];
  for (let index = 0; index < array2.length; index++) {
    const element = array2[index];
    // console.log(element);
  }

  const myAwesomeArray = [
    [1, 2],
    [3, 4],
  ];

  console.log(myAwesomeArray.concat(11, 23, [11, 23]));
  console.log();

  let newArr = myAwesomeArray.flat().filter((item) => {
    return item > 2;
  });

  newArr = myAwesomeArray.flat().map((item) => {
    return item * 2;
  });

  newArr = myAwesomeArray.flat().reduce((item, aggregator) => {
    return aggregator + item;
  }, 1000);

  // console.log(newArr);
}

function exArray3() {
  const input = {
    sjfdhbsdklfnsdl: "vaue",
  };
  const input2 = [
    {
      key: "valye",
    },
    {
      key2: "valye",
    },
    {
      key3: "valye",
      key3s2342: "valye",
      key234233: "valye",
      key3dgdfgf: "valye",
    },
    {
      key3: "valye",
      key45: "sdfdsf",
    },
  ];

  const garbage = [];
  function create(input) {
    if (!input) {
      return;
    }

    if (Array.isArray(input)) {
      const validated = input.map((obj) => {
        return validateObjectFields(obj);
      });
      garbage.push(...validated);
    } else {
      garbage.push(validateObjectFields(input));
    }
  }

  function validateObjectFields(input) {
    for (let index = 0; index < Object.keys(input).length; index++) {
      const element = Object.keys(input)[index];
      if (!input[element]) {
        delete input[element];
      }
    }
    return input;
  }

  create(input);
  create(input2);

  create(undefined);
  create(null);
  create(NaN);
  create("");
  create(0);
  create(false);

  create({
    key: "sadfasdf",
    key2: undefined,
  });
  create([
    {
      key: "sadfasdf",
      key2: undefined,
    },
  ]);
  create(() => {});

  console.log(garbage);
}
// exArray3();

function exSort() {
  const arr = [
    {
      name: "Mike",
      age: 2,
    },
    {
      name: "Mzx",
      age: 16,
    },
    {
      name: "Farhad",
      age: 100,
    },
    {
      name: "Abdul",
      age: 3,
    },
  ];

  const res = arr.sort((a, b) => {
    console.log("=======");
    return a.age - b.age;
  });

  console.log(arr);
  console.log(res);
}
// exSort();

function exObjectArray() {
  console.log("Hello world");
  function analyzeArray(input, fields) {
    if (!Array.isArray(input)) {
      console.log("input is not arrray");
      return [];
    }
    if (!Array.isArray(fields)) {
      console.log("fields is not arrray");
      return [];
    }

    // for(let i=0; i<)

    let output = [];

    return output;
  }
  //analyzeArray();
  const input = [
    { id: 1, name: "Maks", surname: "Bro" },
    { id: 1, name: "Vova", surname: "Ne Bro", status: "bad-guy " },
    { id: 1, name: "Vanya", age: 30 },
  ];
  const fields = ["id", "name", "surname"];
  console.log(analyzeArray(input, fields));
}
// exObjectArray();
