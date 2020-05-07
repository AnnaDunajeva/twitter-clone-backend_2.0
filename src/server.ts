import express from 'express' 
import {json} from 'body-parser'
import {createRouter} from './routes/routes'
import setUpSocketIo from './socket'
import routesWithoutAuth from './routes/withoutAuthRoutes'
// import cors from 'cors'
import * as http from 'http'
import session from 'express-session'
import pgSessionStore from 'connect-pg-simple'
// import cookieParser from "cookie-parser";
import csurf from 'csurf'
import pg from 'pg';


const pgConfig: any = {
  max: 1,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST
};

if (process.env.ENV !== 'production') {
  pgConfig.port = process.env.DB_PORT;
}



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

//app.disable( 'x-powered-by' ) ;
// app.use( function( req, res, next ) {
//    res.header( 'Strict-Transport-Security', 7776000000 ) ;
//    res.header( 'X-Frame-Options', 'SAMEORIGIN' ) ;
//    res.header( 'X-XSS-Protection', 0 ) ;
//    res.header( 'X-Content-Type-Options', 'nosniff' ) ;
//    next() ;
//  } ) ;

// const pgConString = process.env.ENV ==='production'
//     ? `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@localhost:5432/${process.env.DB_NAME}?host=${process.env.DB_HOST}`
//     : `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
// console.log(`pgConString=${pgConString}`)
//export it so that i can close it in tests
export const sessionStoreDbConnection = new (pgSessionStore(session))({
    pool : new pg.Pool(pgConfig)
})
//If you have your node.js behind a proxy and are using cookie secure: true, you need to set "trust proxy" in express
if (process.env.ENV === 'production') app.set('trust proxy', 1)

app.use(session({
    name: process.env.SESSION_NAME || 'sid',
    resave: false,
    saveUninitialized: false,
    store: sessionStoreDbConnection,
    secret: process.env.SESSION_SECRET as string || '8437698t3ginjssfu98452-irokrgkl78t6rertvcx',
    cookie: {
        maxAge: parseInt(process.env.SESSION_LIFETIME || '3600000'),
        sameSite: true,
        httpOnly: true, 
        secure: process.env.ENV === 'production' ? true : false //should be true in production
    }
}))

app.use('/', routesWithoutAuth)

const csrfProtection = csurf()
app.use(csrfProtection)

app.use(function (req, res, next) { //new token on each request BREACH attack protection
    res.cookie(process.env.CSRF_COOKIE_KEY || 'XSRF-TOKEN', req.csrfToken(), {
      sameSite: 'none', //samesite true does not allow to access cookie in firefox
      secure: process.env.ENV === 'production' ? true : false
    })
    next()
})

const  server = http.createServer(app);
    
const io = setUpSocketIo(server)

app.use('/', createRouter(io))

export default server








