function exSimpleRegexp() {
    let str = "We will, we will rock you";
    console.log(str.match(/we/gi));

    let result = str.match(/we/i);

    console.log(result[0]);
    console.log(result.length);
    console.log(result.index);
    console.log(result.input);

    console.log('====================')
    let matches = "JavaScript".match(/HTML/) || [];

    if (!matches.length) {
        console.log("No matches");
    }

    console.log('====================')
    str = "I love JavaScript";
    let regexp = /LOVE/i;

    console.log(regexp.test(str));

    console.log('====================')
    str = "+7(903)-123-45-67";

    regexp = /\d/g;
    console.log(str.match(regexp).join('+'));

    console.log("I love HTML5!".match(/\s\w\w\w\w\d/));

    console.log("A\nB".match(/A.B/));

    console.log("ACB".match(/A.B/s));

    console.log('====================')

    console.log("1 - 5".match(/\d\s-\s\d/));


    let str1 = "Mary had a little lamb";
    console.log(/^Mari/.test(str1));

    str1 = "it's fleece was white as snow";
    console.log(/snow$/.test(str1));

    console.log('====================')

    let goodInput = "12:34";
    let badInput = "12:345";

    regexp = /^\d\d:\d\d$/;
    console.log(regexp.test(goodInput));
    console.log(regexp.test(badInput));

    regexp = /^$/
    console.log(regexp.test(''));

    console.log('====================')

    str = `1st place: Winnie
2nd place: Piglet
3rd place: Eeyore`;

    console.log(str.match(/^\d/gm));

    console.log('====================')

    console.log("Hello, Java!".match(/\bJava\b/));
    console.log("Hello, JavaScript!".match(/\bJava\b/));

    console.log("1 23 456 78".match(/\b\d\d\b/g));
    console.log("12,34,56".match(/\b\d\d\b/g));
    console.log("12,34,56,2345,4566767".match(/\d{3}/g));

    console.log('====================')
    let regStr = "\\d\\.\\d";
    console.log(regStr);

    regexp = new RegExp(regStr);

    console.log("Chapter 5.1".match(regexp));
}
// exSimpleRegexp();

function exReplace() {
    console.log("We will, we will".replace(/we/i, "I"));
    console.log("We will, we will".replace(/we/ig, "I"));

    let str = "+7(903)-123-45-67";
    console.log(str.replace(/\D/g, ""));

    str = "John Bull";
    let regexp = /(\w+) (\w+)/;
    console.log(str.replace(regexp, '$2, $1'));
}
// exReplace();

function exUnicode() {
    let regexp = /x\p{Decimal_Number}\p{Hex_Digit}/u;
    console.log("number: x9A x2E".match(regexp));

    regexp = /\p{Sc}\d/gu;
    let str = `Prices: $2, €1, ¥9 *1&1^1%1$1#1@1`;
    console.log(str.match(regexp));

    regexp = /[\p{Alpha}\p{M}\p{Nd}\p{Pc}\p{Join_C}]/gu;
    str = `Hi 你 好 12`;
    console.log(str.match(regexp));
}
// exUnicode();

function exSetRange() {
    // console.log("Mop top".match(/[tm]op/gi));

    // console.log("Exception 0xAF".match(/x[0-9A-F][0-9A-F]/g));

    // console.log("alice15@gmail.com ".match(/[\d\sA-Z]/gi));

    // console.log("JavaScript".match(/Java[^script]/i));

    // console.log("Breakfast at 09:00. Dinner at 21-30".match(/\d\d[-:]\d\d/g));

}
// exSetRange();

function exQuantifiers() {

    // console.log("I'm 12345 years old".match(/\d{5}/));

    // console.log("I'm not 12, but 345678 years old".match(/\d{1,}/g));

    // let str = "+7(903)-123-45-67";
    // console.log(str.match(/\d+/g)); // one or more

    // str = "Should I write color or colour?";
    // console.log(str.match(/colou?r/g)); // zero or one

    // console.log("100 10 1".match(/\d0*/g)); // zero or more

    // let regexp = /.{3,}/g;
    // console.log("Hello!... How goes?......".match(regexp));

    let regexp = '';
    let str = "color:#121212; background-color:#AA00ef bad-colors:f#fddee #fd2"
    console.log(str.match(regexp));
}
// exQuantifiers()

function exMatchAll() {
    let results = '<h1> <h2>'.matchAll(/<(.*?)>/gi);

    console.log(results);
    console.log(results[0]);

    results = Array.from(results);
    console.log(results[0]);
    console.log(results[1]);
}
// exMatchAll()

function exGroups() {
    let dateRegexp = /(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})/;
    let str = "2019-04-30";
    let res = str.match(dateRegexp);

    let groups = res.groups;
    console.log(res);
    console.log(groups.year);
    console.log(groups.month);
    console.log(groups.day);

    str = "Gogogo John!";
    let regexp = /(go)+ (\w+)/i;
    let result = str.match(regexp);
    console.log(result);
    console.log(result[1]);
    console.log(result.length);

    regexp = '//i'; //?
    // console.log(regexp.test('01:32:54:67:89:AB')); // true
    // console.log(regexp.test('0132546789AB')); // false (no colons)
    // console.log(regexp.test('01:32:54:67:89')); // false (5 numbers, need 6)
    // console.log(regexp.test('01:32:54:67:89:ZZ')) // false (ZZ in the end)

    regexp = /-?\d+(\.\d+)?/g;
    str = "-1.5 0 2 -123.4.";
    console.log(str.match(regexp));

    function parse(expr) {
        let regexp = /(-?\d+(?:\.\d+)?)\s*([-+*\/])\s*(-?\d+(?:\.\d+)?)/;

        let result = expr.match(regexp);

        if (!result) return [];
        result.shift();

        return result;
    }

    console.log(parse("-1.23 * 3.45"));
}
// exGroups();

function exAlternation() {
    let regexp = /html|php|css|java(script)?/gi;
    let str = "Java First HTML appeared, then CSS, then JavaScript";
    console.log(str.match(regexp));

    regexp = /([01]\d|2[0-3]):[0-5]\d/g;
    console.log("00:00 10:10 23:59 25:99 1:2".match(regexp));

    regexp = /"(\\.|[^"\\])*"/g;
    str = ' .. "test me" .. "Say \\"Hello\\"!" .. "\\\\ \\"" .. ';
    console.log(str.match(regexp));

    let str1 = 'Just like \"here\".'
    let str2 = '"test me"'
    let str3 = '"\\"'
    let str4 = '"\\ \""'
    let str5 = '"Say \"Hello\"!"'

    regexp = /"(\\.|[^"\\])*"/g

    console.log(str1.match(regexp))
    console.log(str2.match(regexp))
    console.log(str3.match(regexp))
    console.log(str4.match(regexp))
    console.log(str5.match(regexp))
}
// exAlternation()