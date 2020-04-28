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

//export it so that i can close it in tests
export const sessionStoreDbConnection = new (pgSessionStore(session))({
    conString: `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
})

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
        secure: false //should be true in production
    }
}))

app.use('/', routesWithoutAuth)

const csrfProtection = csurf()
app.use(csrfProtection)
app.use(function (req, res, next) { //new token on each request BREACH attack protection
    res.cookie(process.env.CSRF_COOKIE_KEY || 'XSRF-TOKEN', req.csrfToken())
    next()
})

const  server = http.createServer(app);
    
const io = setUpSocketIo(server)

app.use('/', createRouter(io))

export default server








