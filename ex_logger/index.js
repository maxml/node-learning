var logLevelsMap = {
    'DEBUG': 1, 'INFO': 2, 'WARNING': 3, 'ERROR': 4, 'CRITICAL': 5
};

function log(level, location, message) {
    const logLevel = logLevelsMap[level];

    const configuredLogLevel = logLevelsMap[process.env.P_LOG_LEVEL || 'ERROR'];

    if (logLevel >= configuredLogLevel) {
        console.error(level + ':' + location + ':' + message);
    }
}

// log('DEBUG', 'processor.js', 'City');
// log('INFO', 'processor.js', 'City');
// log('WARNING', 'processor.js', 'City');
// log('ERROR', 'processor.js', 'City');
// log('CRITICAL', 'processor.js', 'Country');

function exDebug() {
    const debug = require("debug")("ex")
    debug("exDebug", "some inputs")
}
// exDebug()
// DEBUG=ex npm start
// https://www.npmjs.com/package/debug

function exWinston() {
    // const logger = require("./logger")("ex")
    const logger = require("./exWinstonLogger")('index');

    // require("./util/util");

    // logger.log('info', 'Hello created log files!', { 'foo': 'bar' });

    // ***************
    // Allows for JSON logging
    // ***************

    logger.log({
        level: 'info',
        message: 'Pass an object and this works',
        additional: 'properties',
        are: 'passed along'
    });

    logger.info({
        message: 'Use a helper method if you want',
        additional: 'properties',
        are: 'passed along'
    });

    // ***************
    // Allows for parameter-based logging
    // ***************

    logger.log('info', 'Pass a message and this works', {
        additional: 'properties',
        are: 'passed along'
    });

    logger.info('Use a helper method if you want', {
        additional: 'properties',
        are: 'passed along'
    });

    // ***************
    // Allows for string interpolation
    // ***************

    // info: test message my string {}
    logger.log('info', 'test message %s', 'my string');

    // info: test message my 123 {}
    logger.log('info', 'test message %d', 123);

    // info: test message first second {number: 123}
    logger.log('info', 'test message %s, %s', 'first', 'second', { number: 123 });

    // prints "Found error at %s"
    logger.info('Found %s at %s', 'error', new Date());
    logger.info('Found %s at %s', 'error', new Error('chill winston'));
    logger.info('Found %s at %s', 'error', /WUT/);
    logger.info('Found %s at %s', 'error', true);
    logger.info('Found %s at %s', 'error', 100.00);
    logger.info('Found %s at %s', 'error', ['1, 2, 3']);

    // ***************
    // Allows for logging Error instances
    // ***************

    logger.warn(new Error('Error passed as info'));
    logger.log('error', new Error('Error passed as message'));

    logger.warn('Maybe important error: ', new Error('Error passed as meta'));
    logger.log('error', 'Important error: ', new Error('Error passed as meta'));

    logger.error(new Error('Error as info'));

    // util testing
    // console.log([1, 2, [3, 4]].equals([1, 2, [3, 2]]))
    // console.log([1, 2, [3, 4]].equals([1, 2, [3, 4]]))
    // console.log(({ a: 1, foo: "bar", numberOfTheBeast: 666 }) == ({ a: 1, foo: "bar", numberOfTheBeast: 666 }));
    // console.log(({ a: 1, foo: "bar", numberOfTheBeast: 666 }).equals({ a: 1, foo: "bar", numberOfTheBeast: 666 }));

}
// exWinston()

function exSanya() {
    const logger = require('./util/ex_sanya')(module, 'post_login');

    logger.log('login, user try to aut...');
    logger.log('handleError, user error: ' + 111);
    logger.log('callbackHandler, user success');

}
// exSanya()