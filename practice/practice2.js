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
// exArraySample();

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

function exBubbleSort() {
  function buublesSort() {
    // all is ok
  }

  const arr1 = [6, 12, 16];
  const arr2 = [4, 7, 18, 19];

  function mergeArrays(arr1, arr2) {
    return arr1 + arr2; // with sorting order, without using buuble sort
  }

  // TBD: findIndex
}

function exArrayMethodsOnExample() {
  function exCutObjectFromFields1(object, fields) {
    const result = {};

    const keys = Object.keys(object);
    for (let index = 0; index < keys.length; index++) {
      const field = keys[index];
      if (fields.includes(field)) {
        result[field] = object[field];
      }
    }

    return result;
  }
  console.log(
    exCutObjectFromFields1(
      {
        id: "sdnfksdlfsd",
        name: "sdfsdfsdfsdf",
      },
      ["id"]
    )
  );

  function exCutObjectFromFields2(object, fields) {
    function getNeededKeys(inputKeys, validKeys) {
      return inputKeys.filter((key) => validKeys.includes(key));
    }
    function generateObject(object, fields) {
      return Object.entries(object).map((item) => {
        return fields.includes(item[0]) ? item : false;
      });
    }
    function removeAllFalsyValues(array) {
      const res = [];
      array.forEach((item) => {
        if (item) {
          res.push(item);
        }
      });

      return res;
    }

    return Object.fromEntries(
      removeAllFalsyValues(
        generateObject(object, getNeededKeys(Object.keys(object), fields))
      )
    );
  }
  console.log(
    exCutObjectFromFields2(
      {
        id: "sdnfksdlfsd",
        name: "sdfsdfsdfsdf",
      },
      ["id", "age"]
    )
  );

  // console.log([1, 2, 3].filter((number) => number > 1));
  // console.log([1, 2, 3].map((number) => number + 1));
  // [1, 2, 3].forEach((number) => console.log(number + 1));

  function exCutObjectFromFields3(object, fields) {
    return Object.fromEntries(
      Object.entries(object).filter((item) => fields.includes(item[0]))
    );
  }
  console.log(
    exCutObjectFromFields3(
      {
        id: "sdnfksdlfsd",
        name: "sdfsdfsdfsdf",
      },
      ["id", "age"]
    )
  );

  function exCutObjectFromFields4(object, fields) {
    const result = {};

    Object.keys(object).forEach((field) => {
      if (fields.includes(field)) {
        result[field] = object[field];
      }
    });

    return result;
  }
  console.log(
    exCutObjectFromFields4(
      {
        id: "sdnfksdlfsd",
        name: "sdfsdfsdfsdf",
      },
      ["id", "age"]
    )
  );
}
// exArrayMethodsOnExample();

function exFunctions() {
  const b = -2;

  function test(b = 3) {
    // let a = 2;
    // console.log(a);
    console.log(b);
    return 23;
  }
  test(b);
  test();
  console.log(b);
  console.log(test());
}
// exFunctions();

function exUsingFunctions() {
  // declaration
  function test() {
    console.log("H");
  }
  test();

  // expresssion
  let test2 = function () {
    console.log("G");
  };
  test2();

  test2 = 12;

  test2 = function () {
    console.log("F");
  };
  test2();

  console.log(test2);
}
// exUsingFunctions();

function exLuckyNumber() {
  const getDigits = (number) => {
    let buff = number;
    const digits = [];
    while (buff > 0) {
      digits.push(buff % 10);
      buff = Math.floor(buff / 10);
    }
    return digits.reverse();
  };
  const numbersToBeChecked = [1, 23, 33, 123, 121, 111, 1221, 78293];

  const res = numbersToBeChecked.map((number) => {
    const digits = getDigits(number);
    let res = true;
    for (let index = 0; index < digits.length / 2; index++) {
      res = res && digits[index] === digits[digits.length - index - 1];
    }
    return res;
  });

  // console.log(getDigits(123));
  // console.log(res);
  return res.reduce((count, item) => {
    return item ? ++count : count;
  }, 0);
}
// console.log(exLuckyNumber());

function exMergeExample() {
  function mergeArray(source, ...arrays) {
    const index = findNextIndex();
  }
  // mergeArray([1, 2, 3], [4, 5, 6], [7, 45], [120, 240]);

  function findNextIndex(array, number) {
    if (!Array.isArray(array)) {
      throw new Exception("No-no-no, you're wrong");
    }

    if (number < array[0]) {
      return 0;
    }
    if (number >= array[array.length - 1]) {
      return array.length;
    }

    return array.findIndex((item) => number < item);
  }
  // console.log(findNextIndex([1, 7, 9], -5));
  // console.log(findNextIndex([1, 7, 9], 5));
  // console.log(findNextIndex([1, 5, 5, 5, 9], 5));
  // console.log(findNextIndex([1, 5, 5, 5, 9], 6));
  // console.log(findNextIndex([1, 5, 5, 5, 9], 9));
  // console.log(findNextIndex([1, 7, 9], 10));

  function getIterationLength() {}

  function findNextByIndex(arrays, neededIndex) {
    let index = neededIndex;

    return arrays.find((array) => {
      if (index >= array.length) {
        index -= array.length;
      } else {
        return array[index];
      }
    })[index];
  }
  // console.log(
  //   findNextByIndex(
  //     [
  //       [1, 2, 3],
  //       [8, 12],
  //       [4, 5],
  //     ],
  //     0
  //   )
  // );
  // console.log(
  //   findNextByIndex(
  //     [
  //       [1, 2, 3],
  //       [8, 12],
  //       [4, 5],
  //     ],
  //     6
  //   )
  // );
  // console.log(
  //   findNextByIndex(
  //     [
  //       [1, 2, 3],
  //       [8, 12],
  //       [4, 5],
  //     ],
  //     3
  //   )
  // );

  function findNext(arrays, prevMinValue, index) {
    const alreadyFoundIndex = index;
    const minValue = prevMinValue;

    arrays.forEach((array) => {
      array.forEach((item) => {
        if (item < minValue) {
          minValue = item;
          alreadyFoundIndex--;
        }
      });
    });
  }

  function mergeArray2(...arrays) {
    const res = [];

    const length = arrays.reduce((res, array) => res + array.length, 0);

    let index = 0;
    while (index < length) {
      res.push(findNext(arrays, res[res.length - 1], res.length));
      index++;
    }

    console.log(res);
    return res;
  }
  // mergeArray2([1, 2, 3], [4, 5, 6], [7, 45], [120, 240]);

  const isFoundHere = (array, obj) => {
    return array.find((item) => equals(item, obj));
  };

  const equals = function (item1, item2) {
    // TODO
  };

  function mergeArrayUniq(...arrayObjects) {
    const res = [];
    arrayObjects.forEach((item) => {
      if (!isFoundHere(res, item)) {
        res.push(item);
      }
    });
    return res;
  }
  mergeArrayUniq(
    { key: "value", key2: "value2" },
    { key: "value2" },
    { key: "value", key2: "value2" },
    { key2: "value2", key: "value" },
    { key: "value", key2: "value3" },
    { key2: "value" }
  );
}
exMergeExample();

function exRestOperatorIsShallow() {
  const obj1 = {
    key: "value",
    inner: {
      structure: "inner-value",
    },
  };
  const obj2 = {
    key: "value2",
    inner: {
      strucutre: "inner-value2",
      check_field: "inner-value3",
    },
  };

  const obj3 = {
    ...obj1,
    ...obj2,
  };
  console.log(obj3);

  obj1.inner.structure = "check";
  obj2.inner.check_field = "check2";

  console.log("====================");
  console.log(obj1);
  console.log(obj2);
  console.log(obj3);

  obj2.inner.strucutre = "check-sndlf";
  console.log("====================");
  console.log(obj1);
  console.log(obj2);
  console.log(obj3);
}
// exRestOperatorIsShallow();

function exFalsyInMap() {
  const array = [1, 2, 3, 4, 5, null, undefined, false, 0, { key: "value" }];
  array.map((item) => console.log(item));
}
// exFalsyInMap();

function exChangeInForEach() {
  const array = [
    {
      key: "value",
    },
    3,
  ];

  array.forEach((item) => {
    if (typeof item === "object") {
      item.key = "value2";
    } else {
      item = 4;
    }
  });

  console.log(array);
}
// exChangeInForEach();
