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

// Mongoose 7+ не приймає колбеки: усі виклики нижче через async/await.
// Опції useUnifiedTopology/useNewUrlParser з Mongoose 6 не потрібні.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test';

async function createAuthor() {
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

    await jamieAuthor.save();
    console.log('Author successfully saved.');

    const mvcBook = new Book({
        _id: new mongoose.Types.ObjectId(),
        title: 'ASP.NET MVC 5 with Bootstrap and Knockout.js',
        author: jamieAuthor._id,
        ratings: [{
            summary: 'Great read'
        }]
    });

    const knockoutBook = new Book({
        _id: new mongoose.Types.ObjectId(),
        title: 'Knockout.js: Building Dynamic Client-Side Web Applications',
        author: jamieAuthor._id
    });

    await Promise.all([mvcBook.save(), knockoutBook.save()]);
    console.log('Books successfully saved.');

    return jamieAuthor._id;
}

async function findAllAuthors() {
    const authors = await Author.find().exec();
    console.log(authors);
}

async function findBooks() {
    const books = await Book.find({
        title: /mvc/i
    }).exec();
    console.log(books);

    const sorted = await Book.find({
        title: /mvc/i
    })
        .sort('created')
        .limit(5)
        .exec();
    console.log(sorted);
}

async function findById(id) {
    const author = await Author.findById(id);
    console.log(author);
}

async function update(id) {
    const author = await Author.findByIdAndUpdate(id,
        { linkedin: 'https://www.linkedin.com/in/jamie-munro-3/' },
        { returnDocument: 'after', runValidators: true });  // `new: true` у Mongoose 9 deprecated
    console.log(author);

    await findAllAuthors();
}

// TODO: delete

async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to mongo');
    try {
        // id автора, створеного в цьому ж прогоні, а не захардкоджений з чужої бази
        const id = await createAuthor();
        await findBooks();
        await findById(id);
        await update(id);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(err => {
    console.log(`Error: ${err}`);
    process.exitCode = 1;
});