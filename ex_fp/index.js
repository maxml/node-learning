const _ = require('lodash');
const ramda = require('ramda');
const { curry, compose, inRange, cond, constant, stubTrue } = require('lodash/fp')

const moment = require('moment');

function lessFunction() {
    const split = curry((symbol, str) => str.split(symbol));

    const words = split(' ');

    console.log(words('sdf sdf sdf sdfsdf'));
}
// lessFunction();

function exPartial() {
    const commandTable = {
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

    processUserInput('north');
}

function exComposition() {
    add10 = num => num + 10;
    add100 = num => num + 100;

    minus10 = num => num - 10;
    minus100 = num => num - 100;

    add110 = compose(add10, add100);
    minus110 = compose(minus10, minus100);

    console.log(add110(20));
}
// exComposition();

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
// exFunctors()

function exFpLodash() {
    const isBetween0and5 = (value) => inRange(value, 0, 5)
    const isBetween5and10 = (value) => inRange(value, 5, 10)

    const returnRed = () => 'red';
    const returnGreen = () => 'green';
    const returnBlue = () => 'blue';

    const returnTrue = () => true;

    const getColor = cond([
        [isBetween0and5, returnRed],
        [isBetween5and10, returnBlue],
        [returnTrue, returnGreen] // default case
    ])

    // console.log(getColor(3));
    // console.log(getColor(7));
    // console.log(getColor(15));

    const getColor2 = cond([
        [inRange(0, 5), constant('red')],
        [inRange(5, 10), constant('blue')],
        [stubTrue, constant('green')]
    ]);

    console.log(getColor2(3));
    console.log(getColor2(7));
    console.log(getColor2(15));
}
// exFpLodash();

function exRearg() {
    const rearged = _.rearg(function (a, b, c) {
        return [a, b, c];
    }, [2, 0, 1]);

    console.log(rearged('b', 'c', 'a'));
}
// exRearg();

function exRamda() {
    console.log(ramda.add(ramda.add(2, 5), ramda.subtract(2, 10)));

    console.log(ramda.prop('name', { name: 'John', age: 25 }));
    console.log(ramda.prop('age', { name: 'John', age: 25 }));

    const users = [
        { name: 'John', age: 25 },
        { name: 'Lenny', age: 51 },
        { name: 'Andrew', age: 43 },
        { name: 'Peter', age: 81 },
        { name: 'Anna', age: 43 },
        { name: 'Albert', age: 76 },
        { name: 'Adam', age: 47 },
        { name: 'Robert', age: 72 }
    ];

    console.log(ramda.pluck('age', users));
    console.log(ramda.pluck('name', users));

    let maxAge = ramda.apply(Math.max, ramda.pluck('age', users));
    // let maxAge = Math.max(... R.pluck('age', users));

    console.log(`The oldest person is ${maxAge} years old.`);

    console.log(ramda.contains('John', ramda.pluck('name', users)));

    let nums = [3, 1, 4, 2, 8, 5, 6];

    console.log('sorting:')

    // sort ascending
    console.log(ramda.sort((x, y) => x - y, nums));

    // sort descending
    console.log(ramda.sort((x, y) => y - x, nums));

    console.log('reversing:')

    // reversing
    console.log(ramda.reverse(nums));
    console.log(ramda.reverse('forest'));

    console.log('Sorted by age:');

    let sortedByAge = ramda.sortBy(ramda.prop('age'), users);
    console.log(sortedByAge);

    console.log('Sorted by name:');

    let sortedByName = ramda.sortBy(ramda.prop('name'), users);
    console.log(sortedByName);

    const users2 = [
        { name: 'John', city: 'London', born: '2001-04-01' },
        { name: 'Lenny', city: 'New York', born: '1997-12-11' },
        { name: 'Andrew', city: 'Boston', born: '1987-02-22' },
        { name: 'Peter', city: 'Prague', born: '1936-03-24' },
        { name: 'Anna', city: 'Bratislava', born: '1973-11-12' },
        { name: 'Albert', city: 'Bratislava', born: '1940-18-19' },
        { name: 'Adam', city: 'Trnava', born: '1983-12-01' },
        { name: 'Robert', city: 'Bratislava', born: '1935-05-15' },
        { name: 'Robert', city: 'Prague', born: '1998-03-14' }
    ];

    let res = ramda.reject(ramda.propEq('city', 'Bratislava'))(users2);
    console.log(res);

    let res2 = ramda.filter(ramda.propEq('city', 'Bratislava'))(users2);
    console.log(res2);

    let res1 = ramda.filter(ramda.where({ city: ramda.equals('Bratislava') }))(users);
    console.log(res1);

    res2 = ramda.filter(ramda.where({
        city: ramda.equals('Bratislava'),
        name: ramda.startsWith('A')
    }))(users);

    console.log(res2);

    let res3 = ramda.filter(ramda.where({
        born: (dt) => getAge(dt) > 40
    }))(users);

    console.log(res3);

    function getAge(dt) {
        return moment.duration(moment() - moment(dt, 'YYYY-MM-DD', true)).years();
    }
}
// exRamda();

function exDifference() {
    const tasks = [];
    const incompleteTasks = _.filter(tasks, { complete: false });

    // const sortUserTasks = R.compose(
    //     R.map(R.sortBy(R.prop('dueDate'))),
    //     groupByUser,
    //     R.filter(R.where({ complete: false }))
    // );

    const incomplete = ramda.filter(ramda.whereEq({ complete: false }));
    const sortByDate = ramda.sortBy(ramda.prop('dueDate'));
    const sortByDateDescend = ramda.compose(ramda.reverse, sortByDate);
    const importantFields = ramda.project(['title', 'dueDate']);
    const groupByUser = ramda.partition(ramda.prop('username'));
    const activeByUser = ramda.compose(groupByUser, incomplete);

    const topDataAllUsers = ramda.compose(ramda.map(ramda.compose(importantFields,
        ramda.take(5), sortByDateDescend)), activeByUser);
}
// exDifference();

function notFunctional() {
    const average = xs => reduce(add, 0, xs) / xs.length;

    const averageDollarValue = (cars) => {
        const dollarValues = _.map(c => c.dollar_value, cars);
        return average(dollarValues);
    };

    const averageDollarValue2 = compose(average, _.map(_.property('dollar_value')));

    const fastestCar = (cars) => {
        const sorted = _.sortBy(cars, car => car.horsepower);
        const fastest = _.last(sorted);
        return fastest.name.concat(' is the fastest');
    };

    const fastestCar2 = compose(
        // ' is the fastest'.concat,
        _.property('name'),
        _.last,
        _.sortBy(_.property('horsepower'))
    );

    console.log(fastestCar([
        {
            name: 'a',
            horsepower: 200
        },
        {
            name: 'b',
            horsepower: 100
        }
    ]));
}
notFunctional();
