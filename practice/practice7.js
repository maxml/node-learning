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
    console.log(str.match(regexp).join(''));

    console.log("I love HTML5!".match(/\s\w\w\w\w\d/));

    console.log("A\nB".match(/A.B/));

    console.log("A\nB".match(/A.B/s));

    console.log('====================')

    console.log("1 - 5".match(/\d\s-\s\d/));

    let str1 = "Mary had a little lamb";
    console.log(/^Mary/.test(str1));

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
exSimpleRegexp();

function exReplace() {
    console.log("We will, we will".replace(/we/i, "I"));
    console.log("We will, we will".replace(/we/ig, "I"));

    const str = "+7(903)-123-45-67";
    console.log(str.replace(/\D/g, ""));
}
// exReplace();

function exUnicode() {
    let regexp = /x\p{Hex_Digit}\p{Hex_Digit}/u;
    console.log("number: xAF".match(regexp));

    regexp = /\p{Sc}\d/gu;
    let str = `Prices: $2, €1, ¥9`;
    console.log(str.match(regexp));
}
// exUnicode();

function exSetRange() {
    console.log("Mop top".match(/[tm]op/gi));

    console.log("Exception 0xAF".match(/x[0-9A-F][0-9A-F]/g));

    console.log("alice15@gmail.com".match(/[^\d\sA-Z]/gi));

}
exSetRange();