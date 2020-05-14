
function exTimerPhase() {
    const fs = require('fs');

    function someAsyncOperation(callback) {
        // Assume this takes 95ms to complete
        fs.readFile('/path/to/file', callback);
    }

    const timeoutScheduled = Date.now();

    setTimeout(() => {
        const delay = Date.now() - timeoutScheduled;

        console.log(`${delay}ms have passed since I was scheduled`);
    }, 100);

    // do someAsyncOperation which takes 95 ms to complete
    someAsyncOperation(() => {
        const startCallback = Date.now();

        // do something that will take 10ms...
        while (Date.now() - startCallback < 10) {
            // do nothing
        }
    });
}

function exRace() {
    // setTimeout(() => {
    //     console.log('timeout');
    // }, 0);

    // setImmediate(() => {
    //     console.log('immediate');
    // });

    const fs = require('fs');

    fs.readFile(__filename, () => {
        setTimeout(() => {
            console.log('timeout');
        }, 0);
        setImmediate(() => {
            console.log('immediate');
        });
    });
}
// exRace();

function exTick() {
    let bar;

    function someAsyncApiCall(callback) {
        process.nextTick(callback);
    }

    someAsyncApiCall(() => {
        console.log('bar=' + bar);
    });

    bar = 1;
}
// exTick();

function exImmediate() {
    console.log('before immediate');

    setImmediate((arg) => {
        console.log(`executing immediate: ${arg}`);
    }, 'so immediate');

    console.log('after immediate');
}
// exImmediate();

function exCancel() {
    const timeoutObj = setTimeout(() => {
        console.log('timeout beyond time');
    }, 1500);

    const immediateObj = setImmediate(() => {
        console.log('immediately executing immediate');
    });

    const intervalObj = setInterval(() => {
        console.log('interviewing the interval');
    }, 500);

    clearTimeout(timeoutObj);
    clearImmediate(immediateObj);
    clearInterval(intervalObj);
}
// exCancel();

function exConnections() {
    const timerObj = setTimeout(() => {
        console.log('will i run?');
    });

    timerObj.unref();

    setImmediate(() => {
        timerObj.ref();
    });
}
// exConnections();

function addit() {
    setImmediate(() => console.log('this is set immediate 1'));
    setImmediate(() => console.log('this is set immediate 2'));
    setImmediate(() => console.log('this is set immediate 3'));

    setTimeout(() => console.log('this is set timeout 1'), 0);
    setTimeout(() => {
        console.log('this is set timeout 2');
        process.nextTick(() => console.log('this is process.nextTick added inside setTimeout'));
    }, 0);
    setTimeout(() => console.log('this is set timeout 3'), 0);
    setTimeout(() => console.log('this is set timeout 4'), 0);
    setTimeout(() => console.log('this is set timeout 5'), 0);

    process.nextTick(() => console.log('this is process.nextTick 1'));
    process.nextTick(() => {
        process.nextTick(console.log.bind(console, 'this is the inner next tick inside next tick'));
    });
    process.nextTick(() => console.log('this is process.nextTick 2'));
    process.nextTick(() => console.log('this is process.nextTick 3'));
    process.nextTick(() => console.log('this is process.nextTick 4'));
}
// addit();

function addit2() {
    console.log('sdfsdf');

    Promise.resolve().then(() => console.log('promise1 resolved'));
    Promise.resolve().then(() => console.log('promise2 resolved'));
    Promise.resolve().then(() => {
        console.log('promise3 resolved');
        process.nextTick(() => console.log('next tick inside promise resolve handler'));
    });
    Promise.resolve().then(() => console.log('promise4 resolved'));
    Promise.resolve().then(() => console.log('promise5 resolved'));

    setImmediate(() => console.log('set immediate1'));
    setImmediate(() => console.log('set immediate2'));

    process.nextTick(() => console.log('next tick1'));
    process.nextTick(() => console.log('next tick2'));
    process.nextTick(() => console.log('next tick3'));

    setTimeout(() => console.log('set timeout'), 10);

    setImmediate(() => console.log('set immediate3'));
    setImmediate(() => console.log('set immediate4'));
}
// addit2();