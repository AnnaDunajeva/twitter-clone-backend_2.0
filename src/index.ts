import "reflect-metadata";
import {createConnection} from "typeorm";
import server from './server'


//if you don't support CORS and your APIs are strictly JSON, there is absolutely no point in adding CSRF tokens to your AJAX calls.
//But to be safe, you should still enable them whenever possible and especially when it's non-trivial to implement.

//============
// CREATE TABLE "session" (
//    "sid" varchar NOT NULL COLLATE "default",
// 	"sess" json NOT NULL,
// 	"expire" timestamp(6) NOT NULL
// )
// WITH (OIDS=FALSE);

// ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

// CREATE INDEX "IDX_session_expire" ON "session" ("expire");
//===============

const pgConString = process.env.ENV ==='production'
    ? `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@localhost:5432/${process.env.DB_NAME}`
    : `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`


createConnection({
    "type": "postgres",
    "url": pgConString,

    "extra": {
      "host": `${process.env.DB_HOST}`
    },
  
   //  "host": process.env.DB_HOST,
   //  "port": parseInt(process.env.DB_PORT as string),
   //  "username": process.env.DB_USERNAME,
   //  "password": process.env.DB_PASSWORD,
   //  "database": process.env.DB_NAME,
    "synchronize": true,
    "logging": false,
    "entities": [
       `${process.env.SOURCE_DIR}/entity/**/*.${process.env.SOURCE_EXT}`
    ],
   //  "migrations": [
   //     "src/migration/**/*.ts"
   //  ],
   //  "subscribers": [
   //     "src/subscriber/**/*.ts"
   //  ],
    "cli": {
       "entitiesDir": `${process.env.SOURCE_DIR}/entity`,
      //  "migrationsDir": "src/migration",
      //  "subscribersDir": "src/subscriber"
    }
}).then(async () => {

   console.log("connecting to database...");

   const port = process.env.PORT
   server.listen(port)

   console.log('server is listening on port ', port)

}).catch(error => console.log(error));







