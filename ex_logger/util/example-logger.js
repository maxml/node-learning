const winston = require('winston');
const { createLogger, format, transports } = winston
const {
    combine,
    timestamp,
    label,
    errors,
    splat,
    printf
} = winston.format;

const logFolder = __dirname + '/logs/';

const defFormat = printf(info => {
    return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

const levelFormat = (level) => {
    return printf(info => {
        return onlyOneLevel(info, level)
    })
}

const logger = createLogger({
    level: 'silly',
    format: combine(
        label({ label: "label" }),
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        errors({ stack: true }),
        splat(),
        defFormat
    ),
    defaultMeta: { service: 'your-service-name' },
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new transports.File({ filename: logFolder + 'quick-start-error.log', level: 'error' }),
        new transports.File({ filename: logFolder + 'quick-start-combined.log' })
    ],
    exitOnError: false

});

module.exports = logger