'use strict;'

const t = require("i18n");

t.configure({
    locales: ['en', 'de'],
    directory: __dirname + '/locales',
    defaultLocale: "en"
});

console.log(t.__('Hello'))
t.setLocale("de")
console.log(t.__('Hello'))

require("./app")()

t.setLocale("en")

require("./app")()
