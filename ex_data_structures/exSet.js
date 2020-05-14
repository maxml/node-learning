function simpleSet() {
    let set = new Set();

    let john = { name: "John" };
    let pete = { name: "Pete" };
    let mary = { name: "Mary" };

    set.add(john);
    set.add(pete);
    set.add(mary);
    set.add(john);
    set.add(mary);

    console.log(set.size);

    for (let user of set) {
        console.log(user.name);
    }
}
// simpleSet();

function exSetMoves() {
    let set = new Set(["апельсин", "яблоко", "банан"]);

    for (let value of set) {
        console.log(value);
    }

    set.forEach((value) => {
        console.log(value);
    });
}
// exSetMoves();

function exAnotherExample() {
    let animals = new Set();

    animals.add('🐷');
    animals.add('🐼');
    animals.add('🐢');
    animals.add('🐿');
    console.log(animals.size);

    animals.add('🐼');
    console.log(animals.size);

    console.log(animals.has('🐷'));
    animals.delete('🐷');
    console.log(animals.has('🐷'));

    animals.forEach(animal => {
        console.log(`Hey ${animal}!`);
    });

    animals.clear();
    console.log(animals.size);
}
// exAnotherExample()

function exStringForSets() {
    console.log('Only unique characters will be in this set.'.length);

    let sentence = new Set('Only unique characters will be in this set.');
    console.log(sentence.size);

    console.log(sentence);
}
// exStringForSets();