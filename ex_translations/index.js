'use strict;'

const transalations = require("i18n");

transalations.configure({
    locales: ['en', 'de'],
    directory: __dirname + '/locales',
    defaultLocale: "en"
});

console.log(transalations.__('greetings_v2'))
transalations.setLocale("de");
console.log(transalations.__('greetings_v2'))

transalations.setLocale("en");
require("./app")()
transalations.setLocale("de")
require("./app")()

