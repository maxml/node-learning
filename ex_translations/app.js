const i18n = require('i18n');


module.exports = () => {
    console.log(i18n.__("Hello"))
    console.log(i18n.__("test", "success"))
}

