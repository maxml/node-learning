// console.log(2 ** 3);

function getters() {
    const obj = {
        real_a: 1,
        get a() { return this.real_a * 2; },
        set a(input) { this.real_a = input / 2; }
    };

    console.log(obj.real_a);
    obj.a = 9;
    console.log(obj.real_a);
    console.log(obj.a);

    console.log(obj.__lookupGetter__('a'));
}
// getters();

function exObjects() {
    const cityField = 'field';
    const job = 'exJob';

    const person = {
        age: 26,
        name: 'Irina',
        job,
        [cityField]: 'ks;dnfls',
        'country-live': 'Russia',
        print() { return 'Person' },
    }
}
// exObjects();

function simpleClass() {
    class Person {
        type = 'human'

        constructor(name) {
            this.name = name
        }

        greet() {
            console.log(this.name + ' says')
        }
    }

    const max = new Person('Max')
    max.greet()
    console.log(max.type)

    console.log(max.__proto__ === Person.prototype)
}
// simpleClass();

function extendClass() {
    class Person {
        type = 'human'

        constructor(name) {
            this.name = name
        }

        greet() {
            console.log(this.name + ' says')
        }
    }

    class Programmer extends Person {
        constructor(name, job) {
            super(name)

            this._job = job
        }

        get job() {
            return this._job.toUpperCase()
        }

        set job(job) {
            if (job.length < 2) {
                console.log('Validation failed')
            } else {
                this._job = job
            }
        }

        greet() {
            super.greet()
            console.log('Rewritten')
        }
    }

    const backend = new Programmer('Max', 'Frontend')
    console.log(backend)
    backend.greet()
    console.log(backend.job)
    backend.job = 'Backend'
    console.log(backend.job)
}
// extendClass();

function staticFields() {
    class Util {
        static average(...args) {
            return args.reduce((acc, i) => acc += i, 0) / args.length
        }
    }

    const res = Util.average(1, 1, 2, 3, 5, 8, 13)
    console.log(res)

    const util = new Util();
    console.log(util.constructor.average(1, 1, 2, 3, 5, 8, 13))
}
// staticFields();

function differBetweenStatic() {
    class Super {
        static whoami() {
            return "Super";
        }
        lognameA() {
            console.log(Super.whoami());
        }
        lognameB() {
            console.log(this.constructor.whoami());
        }
    }
    class Sub extends Super {
        static whoami() {
            return "Sub";
        }
    }

    new Sub().lognameA();
    new Sub().lognameB();
}
// differBetweenStatic();

function promise() {
    const delay = ms => new Promise(((resolve, reject) => {
        setTimeout(() => {
            console.log('sdfsdfsd' + ms);

            resolve(`Done! ${ms}`)
        }, ms)
    }))

    // delay(1000)
    //     .then(() => delay(500))
    //     .then(data => console.log(data))
    //     .catch(err => console.log(err))
    //     .finally(() => console.log('Finally'))

    async function asyncDelay() {
        try {
            const data = await delay(2000);
            console.log(data);
        } catch (e) {
            console.log('Error', e)
        }
    }

    // asyncDelay();

    // Promise.all([
    //     delay(1000),
    //     delay(500),
    //     delay(2000)
    // ]).then(data => console.log(data))

    // Promise.race([
    //     delay(2000),
    //     delay(5000),
    //     delay(1000)
    // ]).then(data => console.log('Result=' + data))
}
// promise();

function race2() {
    const resolvedPromisesArray = [Promise.resolve(33), Promise.resolve(44)];

    const p = Promise.race(resolvedPromisesArray);
    console.log(p);

    setTimeout(function () {
        console.log('empty stack');
        console.log(p);
    });
}
// race2();

function typedArrays() {
    const typedArray1 = new Int8Array(8);
    typedArray1[0] = 32;

    const typedArray2 = new Int8Array(typedArray1);
    typedArray2[1] = 42;

    console.log(typedArray1);
    console.log(typedArray2);

    // new TypedArray();
    // new TypedArray(length);
    // new TypedArray(typedArray);
    // new TypedArray(object);
    // new TypedArray(buffer[, byteOffset[, length]]);

    // where TypedArray is one of:
    // Int8Array();
    // Uint8Array();
    // Uint8ClampedArray();
    // Int16Array();
    // Uint16Array();
    // Int32Array();
    // Uint32Array();
    // Float32Array();
    // Float64Array();
    // BigInt64Array();
    // BigUint64Array();
}
// typedArrays();

function iterators() {
    const array = ['a', 'b', 'c', 'd', 'e'];
    const iterator = array[Symbol.iterator]();

    const newArray = [];
    for (let nextValue = iterator.next(); nextValue.done !== true; nextValue = iterator.next()) {
        newArray.push(nextValue.value);
    }

    console.log(newArray);
}
// iterators();

function exAuthors() {
    const myFavouriteAuthors = {
        allAuthors: {
            fiction: [
                'Agatha Christie',
                'J. K. Rowling',
                'Dr. Seuss'
            ],
            scienceFiction: [
                'Neal Stephenson',
                'Arthur Clarke',
                'Isaac Asimov',
                'Robert Heinlein'
            ],
            fantasy: [
                'J. R. R. Tolkien',
                'J. K. Rowling',
                'Terry Pratchett'
            ],
        },
        [Symbol.iterator]() {
            const genres = Object.values(this.allAuthors);

            let currentAuthorIndex = 0;
            let currentGenreIndex = 0;

            return {
                next() {
                    const authors = genres[currentGenreIndex];

                    const doNothaveMoreAuthors = !(currentAuthorIndex < authors.length);
                    if (doNothaveMoreAuthors) {
                        currentGenreIndex++;
                        currentAuthorIndex = 0;
                    }

                    const doNotHaveMoreGenres = !(currentGenreIndex < genres.length);
                    if (doNotHaveMoreGenres) {
                        return {
                            value: undefined,
                            done: true
                        };
                    }

                    return {
                        value: genres[currentGenreIndex][currentAuthorIndex++],
                        done: false
                    }
                }
            };
        }
    };

    for (const author of myFavouriteAuthors) {
        console.log(author);
    }

    console.log(...myFavouriteAuthors)
}
// exAuthors();

function simpleGenerator() {
    function* fibonacci() {
        let fn1 = 1;
        let fn2 = 1;
        while (true) {
            const current = fn2;
            fn2 = fn1;
            fn1 = fn1 + current;
            const reset = yield current;
            if (reset) {
                fn1 = 1;
                fn2 = 1;
            }
        }
    }

    const sequence = fibonacci();
    console.log(sequence.next().value);
    console.log(sequence.next().value);
    console.log(sequence.next().value);
    console.log(sequence.next().value);
    console.log(sequence.next().value);
    console.log(sequence.next().value);
    console.log(sequence.next().value);

    console.log(sequence.next(true).value);
    console.log(sequence.next().value);
    console.log(sequence.next().value);
    console.log(sequence.next().value);
}
// simpleGenerator();

function uuidGenerator() {
    function* UUIDGenerator() {
        while (true) {
            yield 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                let randomNumber = (new Date().getTime() + Math.random() * 16) % 16 | 0;
                return (c === 'x' ? randomNumber : (randomNumber & 0x3 | 0x8)).toString(16);
            });
        }
    };

    const UUID = UUIDGenerator();
    console.log(UUID.next());
}
// uuidGenerator();

async function simpleAsyncAwait() {
    let promise = new Promise((resolve) => {
        setTimeout(() => resolve("done!"), 1000)
    });

    let result = await promise;

    console.log(result);
}
// simpleAsyncAwait();
// console.log('1');

function promiseIntegration() {
    class Waiter {
        async wait() {
            return await Promise.resolve(42);
        }
    }

    new Waiter()
        .wait()
        .then(console.log);
}
// promiseIntegration();

function simpleReflection() {
    class Student {
        constructor(name) {
            this.name = name
        }

        greetings() {
            console.log(`Hi! My name is ${this.name}`)
        }
    }

    class ProtoStudent {
        university = 'Oxford'
    }

    const student = Reflect.construct(Student, ['Igor'])
    const student2 = Reflect.construct(Student, ['Igor'], ProtoStudent)

    console.log(student);
    console.log(student2);

    console.log(student2.__proto__ === Student.prototype)
    console.log(student2.__proto__ === ProtoStudent.prototype)

    Reflect.apply(student.greetings, { name: 'Tester' }, [])
    console.log(Reflect.ownKeys(student))

    Reflect.preventExtensions(student)

    student.age = 25

    console.log(Reflect.isExtensible(student))

    console.log(student)
}
// simpleReflection();

function simpleProxy() {
    const handler = {
        get(target, prop) {
            return prop in target ? target[prop] : `${prop} field is not existing`
        },

        set(target, prop, value) {
            if (value.length > 2) {
                Reflect.set(target, prop, value)
            } else {
                console.log('Wrong field length')
            }
        }
    }

    const form = {
        login: 'tester',
        password: '12345'
    }

    const formProxy = new Proxy(form, handler)

    console.log(formProxy.login)
    console.log(formProxy.password)
    console.log(formProxy['username'])

    formProxy.password = '12'
    console.log(formProxy.password)




    function log(message) {
        console.log('[Log]: ', message);
    }

    const proxy = new Proxy(log, {
        apply(target, thisArg, argArray) {
            if (argArray.length === 1) {
                Reflect.apply(target, thisArg, argArray)
            } else {
                console.error('Invalid argument number')
            }
        }
    })

    proxy('Custom message')
    proxy('Message', 2)
}
// simpleProxy();

function trailingComa() {
    const arr = [1,
        2,
        3,
    ]
    let obj = {
        a: 1,
        b: 2,
        c: 3,
    }

    console.log(arr.length);
    console.log(Object.keys(obj).length);
}
// trailingComa();

function asyncIterables() {
    // for await (const value of asyncIterable) {
    //     console.log(value);
    // }
}

function exAsyncIterables() {
    function delay(time) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(time);
            }, time);
        });
    }

    const arr = [delay(2000), delay(5000), delay(400)];

    (async () => {
        for await (const v of arr) {
            console.log(v);
        }
    })();
}
// exAsyncIterables();

function asyncGenerator() {
    async function* range(start, stop) {
        for (let i = start; i <= stop; i++) {
            yield i;
        }
    }

    const arr = range(4, 8);

    arr.next();

    (async () => {
        console.log(await arr.next());
    })();
    (async () => {
        console.log(await arr.next());
    })();


    const arr1 = range(1, 3);
    (async () => {
        for await (let n of arr1) {
            console.log(n);
        }
    })();
}
asyncGenerator();

function exFs() {
    const stream = fs.createReadStream('file_name', {
        highWaterMark: 5
    });

    // for await (const chunk of stream) {
    //     res.write(`Read ${chunk}`);
    // }
}