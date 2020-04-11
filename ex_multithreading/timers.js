const crypto = require('crypto')

const arr = new Array(2000).fill('something')
function processChunk() {
    if (arr.length === 0) {
        // code that runs after the whole array is executed
    } else {
        console.log(`processing chunk, length = ${arr.length}`);
        // pick 10 items and remove them from the array
        const subarr = arr.splice(0, 100)
        for (const item of subarr) {
            // do heavy stuff for each item on the array
            doHeavyStuff(item)
        }
        // Put the function back in the queue
        setImmediate(processChunk)
    }
}

// This is just for confirming that we can continue
// doing things
let interval = setInterval(() => {
    console.log('tick!')
    if (arr.length === 0)
        clearInterval(interval)
}, 0)

processChunk()

function doHeavyStuff(item) {
    const res = crypto.createHmac('sha256', 'secret').update(new Array(100000).fill(item).join('.')).digest('hex')
    // console.log(res);
}

