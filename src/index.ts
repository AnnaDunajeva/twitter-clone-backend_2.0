import "reflect-metadata";
import {createConnection} from "typeorm";
import express from 'express' 
import {json} from 'body-parser'
import {createRouter} from './routes/routes'
import cors from 'cors'
import * as http from 'http'
import socketio from 'socket.io';

//TODO: app socket io. Client will connect to socket server. Then socket will emmit event update for each tweet when something happens 
//with this tweet. On client side I will subcscribe on tweet level each tweet to listen for update. When tweet is unmounted I will
//unsubscribe it, shoul work I think....

//i can listen for join-room event (on client socket.emit('join-room' , roomName or RoomId and socketId); on server socket.on("join-room", cb), 
//then join client to room. And romm name is for example tweetId. Then when smth happens with tweet i send updated tweet data to 
//all subscribed to this room

// io.sockets.on('connection', function(socket) {
//    socket.on('join', function(room,) {
//    socket.join(room);
//    });
// });

// io.to('some room').emit('update', {tweet: updatedTweet});

//to get some socket by id:
//io.connected[socketId] or ?io.sockets.connected[socketId]
//============================================================
const setUpSocketIo = (server: http.Server) => {
   const io = socketio(server);

   io.sockets.on('connection', function(socket) {
      socket.on('subscribe_to_tweet_update', function(roomId: number | string) {
         // console.log('about to join ', roomId)
         socket.join(roomId.toString());
      });
      socket.on('unsubscribe_to_tweet_update', function(roomId: number | string) {
         // console.log('about to leave ', roomId)
         socket.leave(roomId.toString());
      });
   });
   return io
}

createConnection({
    "type": "postgres",
    "host": process.env.DB_HOST,
    "port": parseInt(process.env.DB_PORT as string),
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_NAME,
    "synchronize": true,
    "logging": false,
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
   const  server = http.createServer(app);

   const port = process.env.PORT
   // app.listen(port)
   server.listen(port)

   console.log('server is listening on port ', port)
   
   const io = setUpSocketIo(server)

   app.use('/', createRouter(io))

}).catch(error => console.log(error));



//todos:
//1. where should types go, to dev dependencies or to dependencies?



