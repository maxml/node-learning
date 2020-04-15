const models = require('./models');
const User = models.User;
const Company = models.Company;
const WorkingDay = models.WorkingDay;

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// ########################## DATABASE PART
function createCompany() {
    const input = {
        name: "My super company"
    };
    Company.create(input)
        .then((newCompany) => {
            // The get() function allows you to recover only the DataValues of the object
            console.log(newCompany.get())
        })
        .catch((err) => {
            console.log("Error while company creation : ", err)
        })
}
// createCompany();

function createUsers() {
    const users = [
        { email: 'john-doe@domain.com', firstName: 'John', lastName: 'DOE', companyId: 7 },
        { email: 'log_w@domain.com', firstName: 'Logan', lastName: 'WOLVERINE', companyId: 7 },
        { email: 'john-connor@domain.com', firstName: 'John', lastName: 'CONNOR', companyId: 7 }
    ];

    User.bulkCreate(users)
        .then((newUsers) => {
            console.log(newUsers)
        })
        .catch((err) => {
            console.log("Error while users creation : ", err)
        })
}
// createUsers();

function findUser() {
    User.findOne({
        where: { email: 'john-connor@domain.com' }, include: 'company'
    }).then((findedUser) => {
        // Get the User with Company datas included
        console.log(findedUser)
        // Get the company record only
        console.log(findedUser.company)
    }).catch((err) => {
        console.log("Error while find user : ", err)
    })
}
// findUser();

// 1:N
function getUsersByCompany() {
    Company.findByPk(7, { include: ['employes'] })
        .then((company) => {
            // Get the Company with Users (employes) datas included
            console.log(company)
            // Get the Users (employes) records only
            console.log(company.get().employes)
        })
        .catch((err) => {
            console.log("Error while find company : ", err)
        })
}
// getUsersByCompany();

function createWorkingDays() {
    let currentDate = new Date();

    WorkingDay.bulkCreate([
        {
            weekDay: 'Monday',
            workingDate: currentDate,
            isWorking: true
        },
        {
            weekDay: 'Tuesday',
            workingDate: currentDate,
            isWorking: true
        },
        {
            weekDay: 'Wednesday',
            workingDate: currentDate,
            isWorking: false
        }
    ]).then((workingDays) => {
        User.findAll({ where: { id: [13, 14, 15] }, include: ['days'] })
            .then((users) => {

                users.forEach(user => {
                    user.setDays(workingDays) // workingDays is an array (one user hasMany workingDays)
                        .then((joinedUsersWorkingDays) => {
                            console.log(joinedUsersWorkingDays)
                        })
                        .catch((err) => console.log("Error while joining Users and WorkingDays : ", err))
                });

            }).catch((err) => console.log("Error while Users search : ", err))
    }).catch((err) => console.log("Error while WorkingDay creation : ", err))

}
// createWorkingDays();

// N:N
function findNtoNRelations() {
    User.findByPk(13, { include: ['days'] })
        .then((user) => {
            console.log(user.get())
        })
        .catch((err) => console.log("Error while searching user : ", err))

    // Get Users for a given WorkingDay
    WorkingDay.findByPk(13, { include: ['employes'] })
        .then((workingDay) => {
            console.log(workingDay.get())
        })
        .catch((err) => console.log("Error while searching workingDay : ", err))
}
// findNtoNRelations();

module.exports = app;