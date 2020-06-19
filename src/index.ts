import "reflect-metadata";
import {createConnection} from "typeorm";
import server from './server'

createConnection().then(async () => {

   console.log("connecting to database...");

   const port = process.env.PORT
   server.listen(port)

   console.log('server is listening on port ', port)

}).catch(error => console.log(error));







