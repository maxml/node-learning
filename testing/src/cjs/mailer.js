'use strict';
exports.send = async (to, body) => {
  throw new Error(`real mailer called (to=${to}, ${body.length} chars): tests must not reach the network`);
};
