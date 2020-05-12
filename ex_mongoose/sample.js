const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: {
        firstName: String,
        lastName: String
    },
    created: Date
});

const authorSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: {
        firstName: {
            type: String,
            required: true
        },
        lastName: String
    },
    biography: String,
    twitter: {
        type: String,
        validate: {
            validator: function (text) {
                return text.indexOf('https://twitter.com/') === 0;
            },
            message: 'Twitter handle must start with https://twitter.com/'
        }
    },
    facebook: {
        type: String,
        validate: {
            validator: function (text) {
                return text.indexOf('https://www.facebook.com/') === 0;
            },
            message: 'Facebook must start with https://www.facebook.com/'
        }
    },
    linkedin: {
        type: String,
        validate: {
            validator: function (text) {
                return text.indexOf('https://www.linkedin.com/') === 0;
            },
            message: 'LinkedIn must start with https://www.linkedin.com/'
        }
    },
    profilePicture: Buffer,
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    }
});
const Author = mongoose.model('Author', authorSchema);

const bookSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    title: String,
    summary: String,
    isbn: String,
    thumbnail: Buffer,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Author'
    },
    ratings: [
        {
            summary: String,
            detail: String,
            numberOfStars: Number,
            created: {
                type: Date,
                default: Date.now
            }
        }
    ],
    created: {
        type: Date,
        default: Date.now
    }
});
const Book = mongoose.model('Book', bookSchema);

mongoose.connect('mongodb://localhost/test',
    { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => {
        console.log('Connected to mongo');
    })
    .catch(err => {
        console.log(`Error: ${err}`);
        throw err;
    });

function createAuthor() {
    const jamieAuthor = new Author(
        {
            _id: new mongoose.Types.ObjectId(),
            name: {
                firstName: 'Jamie',
                lastName: 'Munro'
            },
            biography: 'Jamie is the author of ASP.NET MVC 5 with Bootstrap and Knockout.js.',
            twitter: 'https://twitter.com/endyourif',
            facebook: 'https://www.facebook.com/End-Your-If-194251957252562/'
        });

    jamieAuthor.save(function (err) {
        if (err) {
            throw err;
        }

        console.log('Author successfully saved.');

        var mvcBook = new Book({
            _id: new mongoose.Types.ObjectId(),
            title: 'ASP.NET MVC 5 with Bootstrap and Knockout.js',
            author: jamieAuthor._id,
            ratings: [{
                summary: 'Great read'
            }]
        });

        mvcBook.save(function (err) {
            if (err) throw err;

            console.log('Book successfully saved.');
        });

        var knockoutBook = new Book({
            _id: new mongoose.Types.ObjectId(),
            title: 'Knockout.js: Building Dynamic Client-Side Web Applications',
            author: jamieAuthor._id
        });

        knockoutBook.save(function (err) {
            if (err) throw err;

            console.log('Book successfully saved.');
        });
    });
}
// createAuthor();

function findAllAuthors() {
    Author.find().exec((err, authors) => {
        if (err) {
            throw err;
        }

        console.log(authors);
    });
}
// findAllAuthors();

function findBooks() {
    Book.find({
        title: /mvc/i
    }).exec(function (err, books) {
        if (err) throw err;

        console.log(books);
    });

    Book.find({
        title: /mvc/i
    })
        .sort('created')
        .limit(5)
        .exec(function (err, books) {
            if (err) throw err;

            console.log(books);
        });
}
// findBooks();

function findById() {
    Author.findById('5ea4c7182cf0ca61c12d1cda', function (err, author) {
        if (err) throw err;

        console.log(author);
    });
}
findById();

function update() {
    Author.defindByIdAndUpdate('5ea4c7182cf0ca61c12d1cda',
        { linkedin: 'https://www.linkedin.com/in/jamie-munro-3/' },
        function (err, author) {
            if (err) throw err;

            console.log(author);

            findAllAuthors();
        });
}
update();

// TODO: delete