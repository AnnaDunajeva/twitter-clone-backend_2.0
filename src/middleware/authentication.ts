import {Response, NextFunction} from 'express'
import {RequestWithCustomProperties} from '../models/request'
import * as auth from '../utils/authentication'


export const authentication = async (req: RequestWithCustomProperties, res: Response, next: NextFunction) => {
    if (req.session?.userId) {
        req.userId = req.session.userId
        next()
    } else {
        res.status(401).json({error: 'authentication failed'})
    }
}

export const checkIfGoogleOuthIsNeeded = async (req: RequestWithCustomProperties, res: Response, next: NextFunction) => {
    console.log('checkIfGoogleOuthIsNeeded')
    if (req.session?.userId) {
        console.log('req.session?.userId', req.session?.userId)
        //no need for authed user to be here at all
        res.status(403).redirect(`${process.env.URL}/`)
    } 
    else if (req.session?.verificationToken) {
        try {
            console.log('req.session?.verificationToken', req.session?.verificationToken)
            //error will be thrown if token is expired
            await auth.verifyAndDecodeGoogleAuthVerificationToken(req.session?.verificationToken)

            //if valid, then no need to authenticate with google again

            //does not seem to work like that
            //res.redirect(`/user/login/google/callback`) - cause has passport middleware before it
            //I think I need a separate redirect route for authWithGoogleCallback without passport

            //so just authenticate again for now
            next()
        } catch (err){
            console.log(err)
            console.log('new google auth is needed')
            //if expirred, then continue with google authentication
            next()
        }
    } 
    else {
        next()
    }
}