var Mutex = require('./library');

var mutex = new Mutex('should_happen_one_at_a_time');

mutex.lock();

console.log('sdfsdf');

mutex.unlock();