import "reflect-metadata";
import {createConnection, getConnection} from "typeorm";
import server from './server'

createConnection().then(async () => {

   console.log("connected to database");
   console.log("checking to running migrations...");
   await getConnection().runMigrations()

   const port = process.env.PORT
   server.listen(port)

   console.log('server is listening on port ', port)

}).catch(error => console.log(error));







