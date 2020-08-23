function exSpreadOperator() {
  const { a, b, c, ...z } = { x: 1, y: 2, a: 2, b: 4, c: 5 };

  console.log(z);
  console.log(a);
  console.log(b);
  console.log(a);
  console.log(c);

  const p = [1, 2, 3, 4];
  const arr = [...p, ...[7, 8, 9, 10]];
  console.log(arr);

  const fn = (...arr) => {
    console.log(arr);
  };
  // fn.apply(null, arr);
  fn(100000000, ...arr);
}
exSpreadOperator();

function exAssignForObjects() {
  const a = {
    key: "value",
    key2: "value",
  };
  const b = {
    key2: "value2",
    key3: "value3",
  };

  console.log({
    ...a,
    ...b,
  });

  const f = { key: "valur" };
  const g = { key2: "valur2" };
  const obj = { ...f, ...g };

  console.log(obj);

  const f2 = { key: "valur", key34: "skljfnbdf" };
  const g2 = { key: "valur2", key78: "sdfsdfs" };
  const obj2 = { ...f2, ...g2 };

  console.log(obj2);
}
// exAssignForObjects();
