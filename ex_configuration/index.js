// requires
const _ = require('lodash');

// module variables
const config = require('./config.json');
// const config = require('./conf/development.json');

const defaultConfig = config;
const environment = process.env.NODE_ENV || 'development';
const environment2 = process.env.NODE_ENV2 || 'development';
const environment3 = process.env.NODE_ENV3 || 'development';
// const environmentConfig = config[environment];
// const finalConfig = _.merge(defaultConfig, environmentConfig);

// global.gConfig = finalConfig;

// log global.gConfig
console.log(`default: ${JSON.stringify(config[environment])}, 
    environment: ${JSON.stringify(config[environment2])}`);

console.log(config[environment3]);
console.log(defaultConfig);

