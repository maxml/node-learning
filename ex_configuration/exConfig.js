process.env["NODE_CONFIG_DIR"] = __dirname + "/conf/";

const config = require('config');

config.ex2 = 's;fngsd;l';

let dbConfig = config.get('key');
console.log(dbConfig);

dbConfig = config.get('ex2');
console.log(dbConfig);

// https://github.com/lorenwest/node-config/wiki/Configuration-Files