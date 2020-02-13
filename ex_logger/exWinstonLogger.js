'use strict';

const { createLogger, format, transports } = require('winston');
const {
    combine,
    label,
    timestamp,
    errors,
    splat,
    printf,
    colorize,
} = format;
require('winston-daily-rotate-file');
require("./util/util");

module.exports = logThis

const logFolder = __dirname + "/logs/";

function logThis(producerId) {
    const messageFormat = printf(info => {
        return `${info.timestamp} [${info.label}] ${info.level}: ${info.message} ${restFields(info)}`
    });

    const logger = createLogger({
        level: 'silly', // default
        format: combine(
            label({ label: producerId }),
            timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            errors({ stack: true }),
            splat(),
            messageFormat,
        ),
        defaultMeta: { service: producerId },
        transports: [
            new transports.Console({
                format: combine(
                    colorize({ all: true })
                )
            }),
            new transports.DailyRotateFile({
                filename: logFolder + 'error.log',
                datePattern: 'YYYY-MM-DD-HH',
                maxSize: '20m',
                level: 'error',
            }),
            new transports.DailyRotateFile({
                filename: logFolder + 'warn.log',
                level: 'warn',
                datePattern: 'YYYY-MM-DD-HH',
                maxSize: '20m',
                format: combine(
                    ignoreOtherLevels('warn')()
                ),
            }),
            new transports.DailyRotateFile({
                filename: logFolder + 'all.log',
                datePattern: 'YYYY-MM-DD-HH',
                maxSize: '20m',
            }),
        ],
        exceptionHandlers: [
            new transports.File({
                filename: logFolder + 'fatal.log',
            })
        ],
        exitOnError: false
    });

    return logger
}

/*
 * Simple helper for stringifying all remaining
 * properties.
 */
function restFields(info) {
    const defaultLogMessage = {
        level: undefined,
        message: undefined,
        timestamp: undefined,
        service: undefined,
        label: undefined,
    };

    const infoKeys = Object.keys(info).sort();
    const defaultKeys = Object.keys(info).sort();

    // console.log("rest, keys: " + infoKeys + ", def: " + defaultKeys)
    if (infoKeys.equals(defaultKeys)) {
        return ""
    }

    return "\n" + JSON.stringify(Object.assign({}, info, defaultLogMessage));
}

// Ignore log messages if they have { private: true }
const ignoreOtherLevels = (level) => {
    return format((info) => {
        if (info.level !== level) { return false; }
        return info;
    });
}
