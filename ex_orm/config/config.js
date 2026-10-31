// Конфіг для models/index.js у розкладці sequelize-cli (`sequelize init` створює
// config/config.json). Секретів у файлі немає: production бере рядок підключення з
// DATABASE_URL, development працює на SQLite в пам'яті без сервера.
module.exports = {
    development: {
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false
    },
    production: {
        use_env_variable: 'DATABASE_URL',
        dialect: 'postgres'
    }
};
