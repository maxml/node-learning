function simpleExample() {
    let map = new Map();

    map.set("1", "str1");
    map.set(1, "num1");
    map.set(true, "bool1");

    console.log(map.get(1));
    console.log(map.get("1"));
    console.log(map.get(true));

    console.log(map.size);
}
// simpleExample();

function fields() {
    let john = { name: "John" };
    let john2 = { name: "John" };

    let visitsCountMap = new Map();
    visitsCountMap.set(john, 123);
    visitsCountMap.set(john2, 456);

    console.log(visitsCountMap.get(john));
    console.log(visitsCountMap.get({
        name: 'John'
    }));

    console.log(visitsCountMap.keys());
    console.log(visitsCountMap.values());
    console.log(visitsCountMap.entries());

    for (let key of visitsCountMap.keys()) {
        console.log(key);
    }

    for (let value of visitsCountMap.values()) {
        console.log(value);
    }

    for (let entry of visitsCountMap) {
        console.log(entry);
    }
}
// fields();

function beweenMapAndObject() {
    let obj = {
        name: "John",
        age: 30
    };
    let map = new Map(Object.entries(obj));
    console.log(map);

    let map2 = new Map();
    map2.set('banana', 1);
    map2.set('orange', 2);
    map2.set('meat', 4);

    let obj2 = Object.fromEntries(map2);
    console.log(obj2);
}
// beweenMapAndObject();
