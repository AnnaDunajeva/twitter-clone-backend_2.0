import "reflect-metadata";
import {createConnection} from "typeorm";
import express from 'express' 
import {json} from 'body-parser'
import router from './routes/routes'
import cors from 'cors'

createConnection({
    "type": "postgres",
    "host": process.env.DB_HOST,
    "port": parseInt(process.env.DB_PORT as string),
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_NAME,
    "synchronize": true,
    "logging": true,
    "entities": [
       "src/entity/**/*.ts"
    ],
    "migrations": [
       "src/migration/**/*.ts"
    ],
    "subscribers": [
       "src/subscriber/**/*.ts"
    ],
    "cli": {
       "entitiesDir": "src/entity",
       "migrationsDir": "src/migration",
       "subscribersDir": "src/subscriber"
    }
}).then(async () => {

   console.log("connectiong to database...");
   
   const app = express()
   app.use(cors())
   app.use(json())
   app.use('/', router)

   const port = process.env.PORT
   app.listen(port)

   console.log('server is listening on port ', port)

}).catch(error => console.log(error));

//todos:
//1. where should types go, to dev dependencies or to dependencies?