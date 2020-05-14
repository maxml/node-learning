const { pipe, curry } = require('lodash/fp');

function exSimpleFpExample() {
    // const curry = fn => (...args) => fn.bind(null, ...args);

    const map = curry((fn, arr) => arr.map(fn));

    const join = curry((str, arr) => arr.join(str));

    const toLowerCase = str => str.toLowerCase();

    const split = curry((splitOn, str) => str.split(splitOn));

    const trace = curry((label, x) => {
        console.log(`== ${label}:  ${x}`);
        return x;
    });

    const toSlug = pipe(
        trace('input'),
        split(' '),
        map(toLowerCase),
        trace('after map'),
        join('-'),
        encodeURIComponent
    );

    console.log(toSlug('JS Cheerleader'));
}
// exSimpleFpExample();

function exRealLifeExample() {
    function log(date, importance, message) {
        console.log(`[${date.getHours()}:${date.getMinutes()}] [${importance}] ${message}`);
    }

    log = curry(log);

    log(new Date(), "DEBUG", "some debug");

    log(new Date())("DEBUG")("some debug");

    let logNow = log(new Date());

    logNow("INFO", "message");

    let debugNow = logNow("DEBUG");
    debugNow("message");
}
// exRealLifeExample();

function exAdvancedCurry() {
    function curry(func) {

        return function curried(...args) {
            if (args.length >= func.length) {
                return func.apply(this, args);
            } else {
                return function (...args2) {
                    return curried.apply(this, args.concat(args2));
                }
            }
        };

    }

    function sum(a, b, c) {
        return a + b + c;
    }

    let curriedSum = curry(sum);

    // console.log(curriedSum(1, 2, 3));
    // const ex = curriedSum(1);
    // console.log(ex(2, 3));

    console.log(curriedSum(1, (2, 3)));
    // console.log(curriedSum(1)(2)(3));

}
// exAdvancedCurry()

function exPartial() {
    var commandTable = {
        north: movePlayer.bind(null, "north"),
        east: movePlayer.bind(null, "east"),
        south: movePlayer.bind(null, "south"),
        west: movePlayer.bind(null, "west"),
        look: describeLocation,
        backpack: showBackpack
    };

    function processUserInput(command) {
        commandTable[command]();
    }
}

function exUserLanguage() {
    let joeUser = {
        name: 'joe',
        email: 'joe@example.com',
        prefs: {
            languages: {
                primary: 'sp',
                secondary: 'en'
            }
        }
    };

    let indexURLs = {
        'en': 'http://mysite.com/en',
        'sp': 'http://mysite.com/sp',
        'jp': 'http://mysite.com/jp'
    }

    const showIndexPage;// = (url) => { window.location = url };

    const getUrlForUser = (user) => {
        if (!user) {
            return indexURLs['en'];
        }
        if (!user.prefs.languages.primary) {
            if (indexURLs[user.prefs.languages.primary]) {
                return indexURLs[user.prefs.languages.primary];
            } else {
                return indexURLs['en'];
            }
        }
    }

    showIndexPage(getUrlForUser(joeUser));

    const R = require('ramda');
    const path = R.path;
    const curry = R.curry;
    const Maybe = requirme('ramda-fantasy').Maybe;

    const getURLForUser = (user) => {
        return Maybe(user)
            .map(path(['prefs', 'languages', 'primary']))
            .chain(maybeGetUrl);
    }

    const maybeGetUrl = curry(function (allUrls, language) {
        return Maybe(allUrls[language]);
    })(indexURLs);

    function boot(user, defaultURL) {
        showIndexPage(getURLForUser(user).getOrElse(defaultURL));
    }

    boot(joeUser, 'http://site.com/en');
}


function exFunctors() {
    const add1 = (a) => a + 1;

    function MyFunctor(value) {
        this.val = value;

        this.map = function (fn) {
            return new MyFunctor(fn(this.val));
        }
    }

    let temp = new MyFunctor(1);
    console.log(temp.map(add1));

}
exFunctors()