let EmailModel = require('./db/models/email');

function createEmail() {
    let msg = new EmailModel({
        email: 'ADA.LOVELACE@GMAIL.COM'
    })

    msg.save()
        .then(doc => {
            console.log(doc)
        })
        .catch(err => {
            console.error(err)
        })
}

function fetch() {
    EmailModel
        .find({
            email: 'ada.lovelace@gmail.com'   // search query
        })
        .then(doc => {
            console.log(doc)
        })
        .catch(err => {
            console.error(err)
        })
}

function updateRecord() {
    EmailModel
        .findOneAndUpdate(
            {
                email: 'ada.lovelace@gmail.com'  // search query
            },
            {
                email: 'theoutlander@live.com'   // field:values to update
            },
            {
                new: true,                       // return updated doc
                runValidators: true              // validate before update
            })
        .then(doc => {
            console.log(doc)
        })
        .catch(err => {
            console.error(err)
        })
}

function deleteRecord() {
    EmailModel
        .findOneAndRemove({
            email: 'theoutlander@live.com'
        })
        .then(response => {
            console.log(response)
        })
        .catch(err => {
            console.error(err)
        })
}