// callbacks
function askPassword(ok, fail) {
    let password = true;
    if (password) ok();
    else fail();
}

let user07 = {
    name: 'John',

    login(result) {
        console.log(this.name + (result ? ' logged in' : ' failed to log in'));
    }
};

// askPassword(() => user07.login(true), () => user07.login(false));




// call 
function sayHi04(arg) {
    console.log(this.name + arg);
}

let user06 = { name: "John" };
let admin = { name: "Admin" };

// sayHi04.call(user06, 'd'); // John
// sayHi04.call(admin); // Admin





// borrowing
function hash() {
    console.log([].join.call(arguments)); // 1,2
}

hash(1, 2);





// partial 
function mul(a, b) {
    return a * b;
}

let double = mul.bind(null, 2);

// console.log(double(3));
// console.log(double(4));
// console.log(double(5));











// binding, 
function f() {
    console.log(this.name + this.surname);
}

const f2 = f.bind({ name: "John" }).bind({ surname: "Pete" });

// f2();











// advanced example
function sum(a) {

    let currentSum = a;

    function f(state, b) {
        currentSum += b;
        return f;
    }

    f.toString = function () {
        return currentSum;
    };

    return f;
}

console.log(sum(1)(2).toString()); // 3
console.log(sum(5)(-1)(2).toString()); // 6
console.log(sum(6)(-1)(-2)(-3).toString()); // 0
console.log(sum(0)(1)(2)(3)(4)(5).toString()); // 15







function exCreateArray() {
    console.log('heelo')
    const position = {
        id: '',
        name: '',

        createRandom: function () {
            this.id = Math.random();
            this.name = Math.random();

            return this;
        }
    }


    const obj = {
        id: '',
        date: new Date(),
        positions: [],
        createRandom() {
            this.id = Math.random();
            this.date = Math.random();

            for (let index = 0; index < Math.random() * 20; index++) {
                this.positions.push(position.createRandom())
            }

            console.log(this);

        }
    };

    obj.createRandom()
}
// exCreateArray();

const arr = function exName() {
    // console.log(arguments);

    // console.log('sdfsd' + exName);
    {
        const i = 0;

        // local
        if (true) {
            const s = '';
        }


    }

}



// console.log(arr);
// arr();

// console.log(arguments);


const f3 = () => {
    console.log('sdfsd' + this);
}

// f3();