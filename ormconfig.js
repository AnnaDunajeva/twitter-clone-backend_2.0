//issue with typeorm/postgres. After `@` you can have only url, not a path to unix socket. So when env is production, we just hardoce
//some url (localhost:5432). Since from Cloud Run we connect to db through unix socket, we pass thi path as an extra in typeorm config
const pgConString = process.env.ENV ==='production'
    ? `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@localhost:5432/${process.env.DB_NAME}`
    : `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`

module.exports = {
    "type": "postgres",
    "url": pgConString,
    "extra": {
        "host": `${process.env.DB_HOST}`
    },
    "synchronize": false,
    "logging": false,
    "entities": [
        `${process.env.SOURCE_DIR}/entity/**/*.${process.env.SOURCE_EXT}`
    ],
    "migrations": [
        `${process.env.SOURCE_DIR}/migration/**/*.${process.env.SOURCE_EXT}`
    ],
    "subscribers": [
        `${process.env.SOURCE_DIR}/subscriber/**/*.${process.env.SOURCE_EXT}`
    ],
    "cli": {
        "entitiesDir": `${process.env.SOURCE_DIR}/entity`,
         "migrationsDir": "src/migration",
         "subscribersDir": "src/subscriber"
    }
}

