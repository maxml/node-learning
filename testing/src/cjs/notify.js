'use strict';
const mailer = require('./mailer');          // keeps the module object: looks up .send on every call
const { send } = require('./mailer');        // copies the function reference once, at load time

exports.notifyViaObject = (to) => mailer.send(to, 'hello');
exports.notifyViaDestructured = (to) => send(to, 'hello');
