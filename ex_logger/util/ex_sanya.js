'use strict';

var winston = require('winston');
var pathModule = require('path');

const {
    combine,
    timestamp,
    label,
    printf
} = winston.format;

const logPath = __dirname + '../logs/';

const DEBUG = true;

module.exports = function (module, idName) {
    var logger = {};

    logger.log = function (msg) {
        if (module && idName) {
            getLogger(module, idName).info(msg)
        }
        if (DEBUG) {
            console.log(msg)
        }
    }

    return logger;
}

function getLogger(module, idName) {
    var path = module.filename.split(pathModule.sep).slice(-2).join(pathModule.sep);

    const defFormat = printf(info => {
        return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
    });


    return winston.createLogger({
        format: combine(
            label({
                label: path
            }),
            timestamp(),
            defFormat
        ),
        transports: [
            new winston.transports.Console({
                colorize: true,
                format: combine(winston.format.colorize(), defFormat)
            }),
            new winston.transports.File({
                filename: logPath + 'debug_' + idName + '.log',
                json: false
            })
        ],

        exceptionHandlers: [
            new winston.transports.File({
                filename: logPath + 'exceptions.log',
                json: false
            })
        ],
        exitOnError: false
    });

}