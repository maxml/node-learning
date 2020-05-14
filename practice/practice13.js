function simple() {
    let animal = {
        eats: 2,
        walk: () => {
            console.log("Animal walk");
        }
    };
    let rabbit = {
        jumps: 1,
        __proto__: animal
    };

    console.log(rabbit.jumps);
    console.log(rabbit.eats);
    rabbit.walk();
}
// simple();

function checkThisInPrototype() {
    let animal = {
        eats: 2,
        walk() {
            if (!this.isSleeping) {
                console.log(`I walk`);
            }
        },
        sleep() {
            this.isSleeping = true;
        }
    };
    let rabbit = {
        jumps: 1,
        __proto__: animal
    };

    rabbit.walk();
    rabbit.sleep();

    console.log(rabbit.isSleeping);

    rabbit.walk();
    console.log(animal.isSleeping);
}
// checkThisInPrototype();

function iteration() {
    let animal = {
        eats: 2,
        walk: () => {
            console.log("Animal walk");
        }
    };
    let rabbit = {
        jumps: 1,
        __proto__: animal
    };

    console.log(Object.keys(rabbit));

    for (let prop in rabbit)
        console.log(prop);

    for (let prop in rabbit) {
        if (rabbit.hasOwnProperty(prop)) {
            console.log(`rabbit field: ${prop}`);
        }
    }

}
// iteration();

function checkField() {
    let animal = {
        jumps: null
    };
    let rabbit = {
        __proto__: animal,
        jumps: true
    };

    console.log(rabbit.jumps);

    delete rabbit.jumps;

    console.log(rabbit.jumps);

    delete animal.jumps;

    console.log(rabbit.jumps)
}
// checkField();

function anotherNotation() {
    function Human(firstName, lastName) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.fullName = function () {
            console.log(this.firstName + " " + this.lastName);
        }
    }

    var human = new Human("Virat", "Kohli");

    console.log(human)
    human.fullName();

    Human.prototype.firstName = "Ashwin";
    console.log(Human.prototype.firstName)

    Human.prototype["age"] = 26;
    console.log(Human.prototype["age"]);

    console.log(Human.prototype);
    console.log(human);

    function Person() {
    }

    Person.prototype = Human.prototype;
    Person.prototype.firstName = "Maksym";
    Person.prototype.age = 27;
    Person.prototype.sayName = function () {
        console.log(this.firstName);
    }

    const person = new Person();

    console.log(person.firstName)
    console.log(person.age)
    person.sayName();

    human.fullName();

    delete human.firstName;

    human.fullName();
    person.sayName();
}
// anotherNotation();

function referenceTypes() {
    function Person() {
    }

    Person.prototype.name = "Ashwin";
    Person.prototype.age = 26;
    Person.prototype.friends = ['Jadeja', 'Vijay'];
    Person.prototype.sayName = function () {
        console.log(this.name);
    }

    var person1 = new Person();
    var person2 = new Person();

    person1.friends.push("Amit");

    console.log(person1.friends);
    console.log(person2.friends);
}
// referenceTypes();