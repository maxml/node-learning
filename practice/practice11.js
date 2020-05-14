function exSimplePromise() {

    function ex(successCallback, errorCallback) {
        setTimeout(() => {
            const randomNymber = Math.random();
            if (randomNymber > 0.5) {
                errorCallback('error, number=' + randomNymber);
            } else {
                successCallback(randomNymber);
            }
        }, 1000);
    }

    function ex2(callback, error) {
        /// ...
        callback();
        // ...
        error()
    }

    for (let index = 0; index < 100000; index++) {
        new Promise((resolve, reject) => {
            ex(resolve, reject);
        }).then((res) => {
            console.log('success' + res);
        }).catch((err) => {
            console.log(err);
        });
    }
}
// exSimplePromise();

function exPromises() {
    doSomething()
        .then(result => doSomethingElse(result))
        .then(newResult => doThirdThing(newResult))
        .then(finalResult => {
            console.log(`Got the final result: ${finalResult}`);
        })
        .catch(failureCallback);

    new Promise((resolve) => {
        console.log('Initial');

        resolve();
    })
        .then(() => {
            // throw new Error('Something failed');
            console.log('Do this');
        })
        .catch((err) => {
            console.error('Do that');
        })
        .then(() => {
            console.log('Do this, no matter what happened before');
        });

    // try {
    //     const result = syncDoSomething();
    //     const newResult = syncDoSomethingElse(result);
    //     const finalResult = syncDoThirdThing(newResult);
    //     console.log(`Got the final result: ${finalResult}`);
    // } catch (error) {
    //     failureCallback(error);
    // }

    // doSomethingCritical()
    //     .then(result =>
    //         doSomethingOptional(result)
    //             .then(optionalResult => doSomethingExtraNice(optionalResult))
    //             .catch(e => { })) // Ignore if optional stuff fails; proceed.
    //     .then(() => moreCriticalStuff())
    //     .catch(e => console.error("Critical failure: " + e.message));

    // doSomething()
    //     .then(function (result) {
    //         return doSomethingElse(result);
    //     })
    //     .then(newResult => doThirdThing(newResult))
    //     .then(() => doFourthThing())
    //     .catch(() => error);

    // new Promise((resolve, reject) => {
    //     throw new Error("error");
    // })
    //     .then(res => console.log(res))
    //     .catch(err => console.log(err))
    //     .finally(() => console.log("Промис завершён"));
}
// exPromises()

function exStatuses() {
    // Promise.resolve().reject();

    function inner() {
        return new Promise(function (resolve, reject) {
            resolve("done");

            reject(new Error("…")); // игнорируется
            setTimeout(() => resolve("…")); // игнорируется
        });
    }

    inner().then(result => console.log(result)).catch(err => console.log(err));
}
// exStatuses();

function exOldApi() {
    const wait = ms => new Promise(resolve => setTimeout(reject, ms));

    wait(1000)
        .then(() => console.log("10 seconds"))
        .catch(err => console.log(err));
}
// exOldApi();

function exComposition() {
    // Promise.all([func1(), func2(), func3()])
    //     .then(([result1, result2, result3]) => { /* use result1, result2 and result3 */ }).catch(error);

    let message = "";

    promise1 = new Promise((resolve) => {
        setTimeout(() => {
            message += "my";
            resolve(message);
        }, 2000)
    })

    promise2 = new Promise((resolve) => {
        setTimeout(() => {
            message += " first";
            resolve(message);
        }, 2000)
    })

    promise3 = new Promise((resolve) => {
        setTimeout(() => {
            message += " promise";
            resolve(message);
        }, 2000)
    })

    let printResult = (results) => { console.log("Results = ", results, "message = ", message) }

    function main() {
        // See the order of promises. Final result will be according to it
        Promise.all([promise1, promise2, promise3]).then(printResult);
        Promise.all([promise2, promise1, promise3]).then(printResult);
        Promise.all([promise3, promise2, promise1]).then(printResult);
        console.log("\"\"" + message);
    }

    main();
}
// exComposition();

function exCancelation() {
    const wait = (
        time,
        cancel = Promise.reject()
    ) => new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, time);
        const noop = () => { };

        cancel.then(() => {
            clearTimeout(timer);
            reject(new Error('Cancelled'));
        }, noop);
    });

    const shouldCancel = Promise.resolve();
    // const shouldCancel = Promise.reject();

    wait(2000, shouldCancel).then(
        () => console.log('Hello!'),
        (e) => console.log(e)
    );
}
// exCancelation();



function exCustomError() {
    function MyError(message) {
        this.name = 'MyError';
        this.message = message;
        // this.stack = (new Error()).stack;
        // MyError.prototype = new Error;
        this.stack = Error.captureStackTrace(this, this.constructor);
    }

    throw new MyError('Alert');
}
// exCustomError();

function exSimpleTry() {
    try {
        throw new ReferenceError('Ой-ой!');
    } catch (e) {
        console.error(e.name + ': ' + e.message);
        console.log(e.stack);
    }

    try {
        throw new Error('Ой-ой!');
    } catch {
        console.log('ouch');
    }


    try {
        setTimeout(function () {
            noSuchVariable;
        }, 1000);
    } catch (error) {
        console.log("won't work");
    }
}
// exSimpleTry();

function exJSON() {
    let json = "{ \"name\": \"json\" }";
    try {

        let user = JSON.parse(json);
        console.log(user.name);

    } catch (e) {
        console.log("Our apologies, the data has errors, we'll try to request it one more time.");
        console.log(e.name);
        console.log(e.message);
        console.log(e.stack);
    }
}
// exJSON();

function exFinally() {
    function func() {

        try {
            return 1;

        } catch (e) {
            /* ... */
        } finally {
            console.log('finally');
        }
    }

    console.log(func());
}
// exFinally();

// console.log(Error.ERR_ASSERTION);

function exException() {
    function asyncOperation() {
        return new Promise((resolve) => {
            setTimeout(() => {
                reject(new Error('Test error'));
            }, 100);
        });
    }

    asyncOperation()
        .then((result) => {
            console.log(result);
        })
        .catch(err => console.log(err));
}
// exException()

process.abort();