import passport from 'passport'
import { Strategy as GoogleStrategy }  from 'passport-google-oauth20'
import { authWithGoogleCallback } from './controllers/authentication'
import { Express, NextFunction, Response } from 'express'
import { Users } from "./entity/Users"
import { getRepository } from "typeorm"
import { v4 as uuidv4 } from 'uuid';
import { RequestWithCustomProperties } from './models/request'
import * as auth from './utils/authentication'

export const checkIfUsefIsAlreadyAuthenticated = async (req: RequestWithCustomProperties, res: Response, next: NextFunction) => {
    if (req.session?.userId) {
        //no need for authed user to be here at all
        res.status(403).redirect(`${process.env.URL}/`)
    } 
    else if (req.session?.verificationToken) {
        try {
            //error will be thrown if token is expired
            auth.verifyAndDecodeGoogleAuthVerificationToken(req.session?.verificationToken)

            //if valid, then no need to authenticate with google again
            res.redirect('/user/login/google/callback')// - not completely sure why this works if we redirect to callback like that
        } catch (err){
            //if expirred, then continue with google authentication
            next()
        }
    } 
    else {
        next()
    }
}

const passportSetup = (app:Express) => {
    const strategyOptions = {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
        callbackURL: `${process.env.URL}/api/user/login/google/callback`
    }

    const verifyCallback = async (accessToke: any, refreshToken: any, profile:any, done:any) => {
        const verifiedEmail = profile.emails.find((email:any) => email.verified) || profile.emails[0]

        const usersRepo = getRepository(Users)
        const user = await usersRepo.findOne({email: verifiedEmail.value})

        if (user) {
            return done(null, user)
        } else {
            const usersRepo = getRepository(Users)
            
            const newUser = { 
                userId: uuidv4(),
                firstName: profile.name.givenName, 
                lastName: profile.name.familyName,
                email: verifiedEmail.value,
                password: null, 
                googleAuth: true,
                createdAt: () => `to_timestamp(${Date.now()/1000})`, //postgres func to_timestamp accepts unix time in sec
            }
            await usersRepo
                    .createQueryBuilder('users')
                    .insert()
                    .values(newUser)
                    .execute();
               
            return done(null, newUser)
        }
    }

    passport.use(new GoogleStrategy(strategyOptions, verifyCallback))

    //not really sure what these two do, but without them it wont work
    passport.serializeUser(function(user, done) {
        done(null, user);
    });
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/user/login/google', 
        checkIfUsefIsAlreadyAuthenticated,
        passport.authenticate('google', { scope: [
            'openid',
            'email',
            'profile'] }))

    app.get('/user/login/google/callback',
        passport.authenticate('google', { failureRedirect: `${process.env.URL}/login` }), 
        authWithGoogleCallback)
}

export default passportSetup