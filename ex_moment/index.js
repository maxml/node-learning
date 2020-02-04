const moment = require('moment');

// console.log(moment().format());

// console.log(moment());
// console.log(moment.utc());
console.log('============================');

const dates = [
    "1995-12-25", "20130208T080910,123", "2013-02-08 09:30:26.123", "20130208T0809", "20130208T08", '2013-W06-5 09',
    '2013-02-08 09:30:26.123+07:00', '2013-02-08 09-0100', 'Mon 06 Mar 2017 21:22:23 z', 'Mon, 06 Mar 2017 21:22:23 +0000'
];

dates.map((d) => {
    console.log(moment(d).format());
})

console.log(moment("12-25-1995", "MM-DD-YYYY").format());
console.log(moment("12/25/1995", "MM-DD-YYYY").format());

console.log(moment('2012-10-14', 'YYYY-MM-DD', 'fr', true).format());

console.log(moment([2010, 1, 14, 15, 25, 50, 125]).format());

console.log(moment().get('year'));
// moment().get('month');  // 0 to 11
// moment().get('date');
// moment().get('hour');
// moment().get('minute');
// moment().get('second');
// moment().get('millisecond');

// set, max, min, add
// before, same, after
// locale, lang

var halloween = moment([2011, 9, 31]); // October 31st
moment.locale('ru');
console.log(halloween.fromNow());
