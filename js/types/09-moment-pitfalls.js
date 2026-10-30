'use strict';
// Why the moment-based examples (examples/ex_moment/index.js) teach habits worth unlearning.
// Run: npm ci && TZ=Europe/Kyiv node 09-moment-pitfalls.js

const moment = require('moment');
const log = (label, value) => console.log(label.padEnd(52), value);

log('moment.version', moment.version);

// 1. Moment objects are mutable: add() changes the receiver and returns it.
const start = moment('2026-10-30T10:00:00Z');
const end = start.add(1, 'day');
log('end === start after start.add(1, "day")', end === start);
log('start after add (start moved too)', start.toISOString());

// 2. Non-ISO strings fall back to new Date(string) with a deprecation warning.
const origWarn = console.warn;
let warned = false;
console.warn = () => { warned = true; };
const fallback = moment('2026/10/30');
const invalid = moment('30.10.2026');
console.warn = origWarn;
log("'2026/10/30': valid? / deprecation warning?", `${fallback.isValid()} / ${warned}`);
log("'30.10.2026' (falls back to Date, which rejects it)", invalid.isValid());

// 3. Format-based parsing is forgiving unless strict mode is on.
log("moment('12/25/1995', 'MM-DD-YYYY').isValid()", moment('12/25/1995', 'MM-DD-YYYY').isValid());
log("same with strict=true", moment('12/25/1995', 'MM-DD-YYYY', true).isValid());

// 4. Array constructor uses 0-based months, like Date.
log('moment([2011, 9, 31]) (9 = October)', moment([2011, 9, 31]).format('YYYY-MM-DD'));

// 5. moment.locale() is global state: it changes formatting for every later caller.
moment.locale('uk');
log("after moment.locale('uk'): moment(0).format('MMMM')", moment(0).format('MMMM'));
moment.locale('en');

// The same tasks without a library:
const d = new Date('2026-10-30T10:00:00Z');
const plusDay = new Date(d.getTime() + 24 * 3600 * 1000); // new object, d untouched
log('Date: original untouched', d.toISOString());
log('Intl.DateTimeFormat uk month name', new Intl.DateTimeFormat('uk', { month: 'long', timeZone: 'UTC' }).format(new Date(0)));
log('Intl.RelativeTimeFormat uk', new Intl.RelativeTimeFormat('uk', { numeric: 'auto' }).format(-1, 'day'));
void plusDay;
