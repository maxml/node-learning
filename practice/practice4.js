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

askPassword(() => user07.login(true), () => user07.login(false));




// call apply
function sayHi04(a) {
    console.log(this.name + a);
}

let user06 = { name: "John" };
let admin = { name: "Admin" };

sayHi04.call(user06, 'd'); // John
sayHi04.call(admin); // Admin





// borrowing
function hash() {
    console.log([].join.call(arguments)); // 1,2
}

// hash(1, 2);





// binding, partial 
function mul(a, b) {
    return a * b;
}

let double = mul.bind(null, 2);

// console.log(double(3));
// console.log(double(4));
// console.log(double(5));

function f() {
    console.log(this.name);
}

f = f.bind({ name: "John" }).bind({ name: "Pete" });

// f(); 





// advanced example
function sum(a) {

    let currentSum = a;

    function f(b) {
        currentSum += b;
        return f;
    }

    f.toString = function () {
        return currentSum;
    };

    return f;
}

// console.log(sum(1)(2).toString()); // 3
// console.log(sum(5)(-1)(2).toString()); // 6
// console.log(sum(6)(-1)(-2)(-3).toString()); // 0
// console.log(sum(0)(1)(2)(3)(4)(5).toString()); // 15

