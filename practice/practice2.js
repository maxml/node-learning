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

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions#differences
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

function exNamedExpression() {
  let math = {
    factit: function factorial(n) {
      console.log(n);
      if (n <= 1) {
        return 1;
      }
      return n * factorial(n - 1);
    },
  };
  console.log(math.factit(3));
}

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

  const findMin = (array) => Math.min(...array);

  const findNextMinValue = (array, index) => {
    const arrayWithFoundMark = array.map((i) => {
      return { value: i, isFound: false };
    });

    let res = findMin(array);
    index++;

    while (index > 0) {
      // findMin => delete array min => findMin
      // {value, isFound: false} => filter => findMin => isFound: true
      const buff = arrayWithFoundMark
        .filter((i) => !i.isFound)
        .map((i) => i.value);

      res = findMin(buff);
      const nextMinIndex = arrayWithFoundMark.findIndex(
        (item) => item.value === res
      );
      arrayWithFoundMark[nextMinIndex].isFound = true;

      index--;
    }

    console.log("findNextMinValue, res: " + res);
    return res;
  };
  // findNextMinValue([7, 4, 120, 1], 0);
  // findNextMinValue([7, 4, 120, 1], 1);
  // findNextMinValue([7, 4, 120, 1], 2);
  // findNextMinValue([7, 4, 120, 1], 3);

  let arrayWithMetaInfo = [];

  // index for every value, isUsed: true on array
  function findNext(arrays, prevMinValue, index) {
    // let alreadyFoundIndex = index;
    // console.log(prevMinValue);

    if (!arrayWithMetaInfo.length) {
      arrayWithMetaInfo = arrays.map((array) => {
        return {
          array: array.map((item) => {
            return {
              item: item,
              index: -1,
            };
          }),
          isUsed: false,
        };
      });
    }
    // console.log(JSON.stringify(arrayWithMetaInfo));

    const mins = arrayWithMetaInfo
      .filter((a) => !a.isUsed)
      .map((arrayObj) => {
        const filteredItems = arrayObj.array.filter((i) => i.index === -1);
        const onlyItems = filteredItems.map((i) => i.item);

        return findMin(onlyItems);
      });
    let minValue = findMin(mins);
    console.log(mins);

    let changedItemPosition = -1;
    const changedArrayPosition = arrayWithMetaInfo.findIndex((arrayObj) => {
      const neededIndex = arrayObj.array.findIndex((itemObj, indexObj) => {
        if (itemObj.item === minValue) {
          changedItemPosition = indexObj;
          return true;
        }
      });

      if (neededIndex !== -1) {
        return true;
      }
    });

    arrayWithMetaInfo[changedArrayPosition].array[changedItemPosition].index =
      index;
    arrayWithMetaInfo[changedArrayPosition].isUsed = arrayWithMetaInfo[
      changedArrayPosition
    ].array.every((item) => item.index !== -1);

    console.log(JSON.stringify(arrayWithMetaInfo));
    return minValue;
  }

  function mergeArray2(...arrays) {
    const res = [];
    const length = arrays.reduce((res, array) => res + array.length, 0);

    if (length === 0) {
      return res;
    }

    let lastValue = res.length <= 0 ? arrays[0][0] : res[res.length - 1];
    let index = 0;
    while (index < length) {
      res.push(findNext(arrays, lastValue, index));
      index++;
    }

    arrayWithMetaInfo = [];
    console.log(res);
    return res;
  }
  // mergeArray2([1, 2, 3], [4, 5, 6], [7, 45], [120, 240]);
  // mergeArray2([4, 5, 6], [7, 45], [120, 240], [1, 2, 3]);
  mergeArray2([7, 45], [4, 5, 6], [120, 240], [1, 2, 3], [10, 11]);
  // TODO: mergeArray2([7, 45], [4, 5, 6, 10], [120, 240], [1, 2, 3], [10, 11]);

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
  // mergeArrayUniq(
  //   { key: "value", key2: "value2" },
  //   { key: "value2" },
  //   { key: "value", key2: "value2" },
  //   { key2: "value2", key: "value" },
  //   { key: "value", key2: "value3" },
  //   { key2: "value" }
  // );
}
// exMergeExample();

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

function exMergeThirdExample() {
  // TASK3 equals
  const isFoundHere = (array, obj) => {
    return array.find((item) => equals(item, obj));
  };

  function isObject(object) {
    return object != null && typeof object === "object";
  }
  const equals = function (item1, item2) {
    const keys1 = Object.keys(item1);
    const keys2 = Object.keys(item2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    //проверка на несовпадение ключей!!!!!
    //проверка на массивы и другие типы
    for (let key of keys1) {
      //every
      const val1 = item1[key];
      const val2 = item2[key];
      const areObjects = isObject(val1) && isObject(val2);
      if (
        (areObjects && !equals(val1, val2)) ||
        (!areObjects && val1 !== val2)
      ) {
        return false;
      }
    }

    return true;
  };

  function mergeArrayUniq(...arrayObjects) {
    const res = [];
    arrayObjects.forEach((item) => {
      if (typeof item === "object" && !Array.isArray(item)) {
        if (!isFoundHere(res, item)) {
          res.push(item);
        }
      }
    });
    return res;
  }
  console.log(
    "TASK 3: " +
      JSON.stringify(
        mergeArrayUniq(
          // { key: "value", key2: "value2" },
          // { key: "value2" },
          // { key: "value", key2: "value2" }, //delete
          // { key2: "value2", key: "value" }, //delete
          // { key: "value", key2: "value3" },
          // { key: "value1", key2: "value3" },
          // { key2: "value" },
          // { key: "value" },
          // { id: 1, code: 1234 },
          // { code: 1234, id: 1 }, //delete
          // { code: 1234, key: { id: 1, key: 8 } },
          // { code: 1234, key: { id: 1, key: 8 } }, //delete
          // { code: 1234, key: { id: 1, key: { key: 1 } } },
          // { code: 1234, key: { id: 1, key: {} } },
          // { code: 1234, key: { id: 1, key: [1, 2, 3] } },
          // { code: 1234, key: { id: 1, key: [1, 2, 3] } }, //delete
          { code: 12345, key: [1, 2, 3] },
          { code: 12345, key: [1, 2, 3] }
        )
      )
  );
}
// exMergeThirdExample();

function exSplice() {
  const arr = [1, 2, 3, 4, 5];
  const splicedArr = arr.splice(1, 2);
  console.log(splicedArr);

  arr.splice(1, 2, ...splicedArr);
  console.log(arr);
}
// exSplice();
