const _ = require('lodash');

// intersection();
// filter();
// map();
// is();
mixin();
// implicitChaining();
// toTruthyArray();
// bind();
// partial();
// workWithObjects();
// assign();

function intersection() {
    const all = ["60000055660577", "60000055663302", "60000055669932", "60000055671776", "60000055674179", "60000055677156", "60000072113390", "60000072175031", "60000076623636", "60000076623638", "60000078675938", "60000078676113", "60000055664188", "60000055665441", "60000055666910", "60000055670131", "60000055670655", "60000055671713", "60000055671770", "60000055672391", "60000055673564", "60000055695774", "60000055716708", "60000060131783", "60000072116479", "60000055670143", "60000055671340", "60000055716116", "60000055716290", "60000060131784", "60000060133512", "60000060133619", "60000060133789", "60000072176941", "60000074858837", "60000078675909", "60000078675979", "60000055660614", "60000055660889", "60000055660927", "60000055661041", "60000055670426", "60000055670658", "60000055679974", "60000055702116", "60000055716355", "60000060131398", "60000060134479", "60000072115977"];
    const brand = ["60000055660577", "60000076623618", "60000076623632", "60000076623633", "60000076623641", "60000076623644", "60000076623646", "60000076623646", "60000078785609", "60000055716116", "60000076623630", "60000076623631", "60000076623633", "60000076623630", "60000076623632"];
    const meetings = ["60000055660577", "60000079877986", "60000079870636", "60000079968796", "60000079961566", "60000079948989", "60000079956556", "60000079960142", "60000079957228", "60000079984618", "60000079948904", "60000079903466", "60000079918990", "60000079907132"];
    const geoUsers = ["60000055660577", "60000078787984", "60000078788633", "60000078788888", "60000078789205", "60000078789457", "60000078789853", "60000078790627", "60000078790938", "60000078792433", "60000078793539", "60000078793540", "60000078794174", "60000078796475", "60000078799468", "60000078800175", "60000078800206", "60000078800339", "60000078800851", "60000078801272", "60000078801934", "60000078802459", "60000078805186", "60000078805457", "60000078807127", "60000078807551", "60000078807918", "60000078808265", "60000078808926", "60000078810347", "60000078810667", "60000078815906", "60000078821486", "60000078861289", "60000079850178", "60000079850840"]
    const customersUsers = ["60000055660577", "60000055660577", "60000055663302", "60000055669932", "60000055671776", "60000055674179", "60000055677156", "60000072113390", "60000072175031", "60000076623636", "60000076623638", "60000078675938", "60000078676113", "60000055664188", "60000055665441", "60000055666910", "60000055670131", "60000055670655", "60000055671713", "60000055671770", "60000055672391", "60000055673564", "60000055695774", "60000055716708", "60000060131783", "60000072116479", "60000055670143", "60000055671340", "60000055716116", "60000055716290", "60000060133512", "60000072176941", "60000055660614", "60000055660889", "60000055661041", "60000055670426", "60000055679974", "60000055716355", "60000060131398", "60000060134479"]
    const poaUsers = ["60000055660577", "60000078786123", "60000078788703", "60000078789206", "60000078789288", "60000078789474", "60000078789595", "60000078789717", "60000078790247", "60000078791590", "60000078791816", "60000078792149", "60000078792260", "60000078792304", "60000078792508", "60000078793726", "60000078795242", "60000078796303", "60000078796407", "60000078797924", "60000078798164", "60000078798253", "60000078798541", "60000078798543", "60000078798729", "60000078798957", "60000078799128", "60000078799432", "60000078799488", "60000078799799", "60000078800168", "60000078800212", "60000078801284", "60000078801436", "60000078801515"]

    console.log(_.intersection(all, brand, meetings, geoUsers, customersUsers, poaUsers))

}

function filter() {
    const objects = [{ a: true, b: false }, { a: false }, { b: true }, { a: true, c: true }];

    const results = _.filter(objects, 'a');

    console.log(results);
}

function map() {
    const numbers = { a: 1, b: 2, c: 3 };

    const result = _.map(numbers, function (value, key) {
        console.log('key: ' + key);
        return value * 2;
    });

    console.log('Final Result:');
    console.log(result);
}

function is() {
    // .isArguments:
    console.log((function () { return _.isArguments(arguments) }()));

    // .isArray
    const myObviousArray = [1, 2, 4];

    console.log(_.isArray(myObviousArray));

    // .isBoolean
    const yep = true;
    const nope = "dog";
    console.log(_.isBoolean(yep));
    console.log(_.isBoolean(nope));

    // .isDate
    const myDate = _.isDate(new Date);
    console.log(myDate);

    // .isEmpty
    const myEmptyVariable = {};
    console.log('object= ' + _.isEmpty(myEmptyVariable));

    // .isEqual
    const oneThing = [
        { 'firstThing': 1 },
        { 'secondThing': 2 }
    ];
    const anotherThing = [
        { 'firstThing': 1 },
        { 'secondThing': 2 }
    ];
    console.log(_.isEqual(oneThing, anotherThing));

    // .isFinite
    console.log(_.isFinite(1000000000000000));
    console.log(_.isFinite(""));

    // .isFunction
    console.log(_.isFunction("dog"));
    console.log(_.isFunction(function () { return true }));

    // .isNaN
    console.log(_.isNaN(NaN));
}

function mixin() {
    // use _.mixin to extend the lodash api

    _.mixin({
        average: function (collection) {
            return _(collection)
                .map()
                .reduce(function (result, item) {
                    return result + item;
                }) / _.size(collection);
        }
    });


    var scores = [4, 5, 4, 4, 5, 5, 3];
    var avgScore = _.average(scores).toFixed(2);

    console.log(avgScore);
}

function implicitChaining() {
    var people = [
        { id: 1, name: "Jim", age: 20, gender: 'm', enabled: true },
        { id: 1, name: "Jim", age: 20, gender: 'm', enabled: false },
        { id: 2, name: "Bob", age: 34, gender: 'm', enabled: true },
        { id: 3, name: "Steve", age: 30, gender: 'm', enabled: true },
        { id: 4, name: "Nancy", age: 42, gender: 'f', enabled: true },
        { id: 5, name: "Frank", age: 30, gender: 'm', enabled: true },
        { id: 6, name: "Larry", age: 68, gender: 'm', enabled: true }
    ];

    // Implicit Chaining : Chainable functions return wrapped values, must call 'value()' to get the result

    var r2 = _(people)
        .filter({ enabled: true })
        .filter({ gender: 'm' })
        .map('id')
        .value();

    console.log(r2);


    // Implicit Chaining : Non-chainable functions return primitive values		

    r2 = _(people)
        .filter({ enabled: true })
        .filter({ gender: 'm' })
        .first();

    console.log(r2);

    // Chaining can wrap plain objects and strings 

    var i = _(r2)
        .extend({ something: true })
        .extend({ another: 12 })
        .value();


    console.log(i);

    // reject is similar to filter, but it will remove matches from the collection

    var r2 = _.chain(people)
        .reject(function (p) { return p.age < 30; })
        .filter({ gender: 'm' })
        .value();

    console.log(r2);

    var string = 'asdfasdfasdfasdfasdfasdef';

    var x = _(string)
        .reject(function (l) { return l === 'a'; })
        .join('');

    console.log(x);
}


function toTruthyArray() {
    // get an array with any non truthy values removed
    var values = [0, null, 1, false, undefined, 2, 3, 4];

    var truthy = _.compact(values);
    console.log(truthy);


    // get an array of the values, changing any subarrays to flattend values
    var values2 = [1, 3, 4, [6, 8, 9]];

    var v2 = _.flatten(values2);
    console.log(v2);
}

function bind() {
    function describe() {
        console.log('I am ' + this.name);
    }

    var describePerson = _.bind(describe, { name: 'John' });

    var describePlace = _.bind(describe, { name: 'Chicago' });

    describePerson();

    describePlace();
}

function partial() {
    function describe(clazz, animal) {
        console.log('A ' + animal + ' is a ' + clazz);
    }

    var describeMammal = _.partial(describe, 'mammal');

    var describeFish = _.partial(describe, 'fish');

    describeMammal('dog');

    describeFish('trout');
}

function workWithObjects() {
    // defaults
    var shapes = [{ name: 'Square' },
    { name: 'Rectangle' },
    { name: 'Triangle', sides: 3 },
    { name: 'Pentagon', sides: 5 },
    { name: 'Circle', sides: NaN }];


    _.each(shapes, function (shape) {
        _.defaults(shape, { sides: 4 });
    });


    console.log(shapes);

    // pick/omit
    var person = {
        name: 'Bob',
        age: 32,
        ssn: '555-55-5555',
        password: '123456'
    };

    var someInfo = _.pick(person, ['name', 'age']);

    console.log(someInfo);

    var someInfo2 = _.omit(person, ['ssn', 'password']);

    console.log(someInfo2);

    // create
    var people = [
        { id: 1, name: "Jim", age: 20, gender: 'm', enabled: true },
        { id: 1, name: "Jim", age: 20, gender: 'm', enabled: false },
        { id: 2, name: "Bob", age: 34, gender: 'm', enabled: true },
        { id: 3, name: "Steve", age: 30, gender: 'm', enabled: true },
        { id: 4, name: "Nancy", age: 42, gender: 'f', enabled: true },
        { id: 5, name: "Frank", age: 30, gender: 'm', enabled: true },
        { id: 6, name: "Larry", age: 68, gender: 'm', enabled: true }
    ];

    function Employee() {
        greet = function () {
            console.log('Hello ' + this.name);
        }
    }
    greet()

    // var employees = [];
    // _.each(people, function (item) {
    //     employees.push(_.create(new Employee(), item));
    // });

    // _.each(employees, function (e) { e.greet(); });

    // extend
    var people2 = [
        { id: 1, name: "Jim", age: 20, gender: 'm', enabled: true },
        { id: 2, name: "Bob", age: 34, gender: 'm', enabled: true },
        { id: 4, name: "Nancy", age: 42, gender: 'f', enabled: true },
    ];


    var p2 = _.map(people2, function (p) {
        return _.extend({ yearsOfExperience: p.age - 20 }, p);
    });

    console.log(p2);

    // get
    var object = { 'a': [{ 'b': { 'c': 3 } }] };

    _.get(object, 'a[0].b.c');
    _.get(object, ['a', '0', 'b', 'c']);
    _.get(object, 'a.b.c', 'default');
}

function assign() {
    var foo = { a: "a property" };
    var bar = { a: "a nw property", b: 4, c: "an other property" }

    var result = _.assign({ a: "an old property" }, foo, bar);

    console.log(result);

}


function Ex() {
    ad = 2;
}

// console.log(new Ex().ad);
// console.log(ad);
