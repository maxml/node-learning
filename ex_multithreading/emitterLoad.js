const EventEmitter = require('events');

function listeners() {
    const myEmitter = new EventEmitter();

    // First listener
    myEmitter.on('event', function firstListener() {
        console.log('Helloooo! first listener');
    });
    // Second listener
    myEmitter.on('event', function secondListener(arg1, arg2) {
        console.log(`event with parameters ${arg1}, ${arg2} in second listener`);
    });
    // Third listener
    myEmitter.on('event', function thirdListener(...args) {
        const parameters = args.join(', ');
        console.log(`event with parameters ${parameters} in third listener`);
    });

    console.log(myEmitter.listeners('event'));

    myEmitter.emit('event', 1, 2, 3, 4, 5);
}
// listeners();

function load() {
    let emitter = new EventEmitter()

    let allExecutionTime = process.hrtime();
    let time = 0;

    const events = [
        "EVENT1", "EVENT2", "EVENT3"
    ]
    const indexes = [];

    events.forEach(event => {
        emitter.on(event, () => {
            console.log("event on " + event);
            let eventIndex = events.findIndex(x => x === event)
            indexes[eventIndex] = indexes[eventIndex] + 1 || 0;

            let end = process.hrtime(time)
            console.info('Execution time (hr): %dms', end[1] / 1000000)
        });
    });

    for (let i = 0; i < 100000; i++) {
        time = process.hrtime();
        emitter.emit(events[Math.floor(Math.random() * events.length)]);
    }

    console.log("All execution time: " + process.hrtime(allExecutionTime)[1] / 1000000)
    console.log(indexes)
}
// load();
