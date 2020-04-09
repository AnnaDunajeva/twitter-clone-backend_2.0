import "reflect-metadata";
import {createConnection} from "typeorm";
import express from 'express' 
import {json} from 'body-parser'
import {createRouter} from './routes/routes'
// import cors from 'cors'
import * as http from 'http'
import socketio from 'socket.io';
// import cookieParser from 'cookie-parser'
import session from 'express-session'
import pgSessionStore from 'connect-pg-simple'



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
      console.log('somebody connected through socket')
      socket.on('subscribe_to_tweet_update', function(roomId: number | string) {
         // console.log('about to join ', roomId)
         socket.join(roomId.toString());
      });
      socket.on('unsubscribe_to_tweet_update', function(roomId: number | string) {
         // console.log('about to leave ', roomId)
         socket.leave(roomId.toString());
      });
      socket.on('subscribe_to_user_update', function(roomId: string) {
         socket.join(roomId);
      });
      socket.on('unsubscribe_to_user_update', function(roomId: string) {
         socket.leave(roomId);
      });
      socket.on('disconnect', (reason)=>console.log('some socket disconnected, reason: ', reason))
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

   // const corsOptions = {
   //    origin: 'http://localhost:3000',
   //    methods: "GET,HEAD,POST,PATCH,DELETE,OPTIONS",
   //    credentials: true,                // required to pass
   //    allowedHeaders: "Content-Type, Authorization, X-Requested-With",
   //  }
   //  // intercept pre-flight check for all routes
   //  app.options('*', cors(corsOptions))

   // app.use(cors(corsOptions))
   
   app.use(json())

   app.use(session({
      name: process.env.SESSION_NAME || 'sid',
      resave: false,
      saveUninitialized: false,
      store: new (pgSessionStore(session))({
         conString: `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
      }),
      secret: process.env.SESSION_SECRET as string || '8437698t3ginjssfu98452-irokrgkl78t6rertvcx',
      cookie: {
         maxAge: parseInt(process.env.SESSION_LIFETIME || '3600000'),
         sameSite: true,
         httpOnly: true, 
         // path: '/',
         // domain: 'http://localhost:3001',
         secure: false //should be true in production
      }
   }))

   const  server = http.createServer(app);

   const port = process.env.PORT
   server.listen(port)

   console.log('server is listening on port ', port)
   
   const io = setUpSocketIo(server)

   app.use('/', createRouter(io))

}).catch(error => console.log(error));



//todos:
//1. where should types go, to dev dependencies or to dependencies?



