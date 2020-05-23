import { RequestHandler, Response } from 'express'
import { RequestWithCustomProperties } from '../models/request'
import { Users } from "../entity/Users"
import { getRepository, getConnection } from "typeorm"
import bcrypt from 'bcrypt'
import * as auth from '../utils/authentication'
import * as users from '../utils/users'
import { VerificationTokens } from '../entity/VerificationTokens'
import { 
    sendResetPasswordLink,
    sendEmailConfirmation,
    sanitazeFirstOrLastname,
    sanitazeUsername } from '../utils/helpers'
import { ResetPasswordTokens } from '../entity/ResetPasswordTokens'


export const verifyUserEmail = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const verificationToken = req.body.token
        const verificationTokensRepo = getRepository(VerificationTokens)
        
        const decodedToken = await auth.verifyAndDecodeEmailVerificationToken(verificationToken)

        if (!decodedToken) {
            throw new Error('Verification failed!')           
        }
        if (decodedToken.exp < Date.now()) {
            throw new Error('Verification link is expired. Please request new verification link.')
          }

        const usersRepo = getRepository(Users)
        const user  = await usersRepo.findOne({userId: decodedToken.userId})//if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
        //this is unreliable, should rewrite it probably
        
        if (!user || user.verifiedAt) {
            throw new Error('Verification failed!')           
        }
    
        await verificationTokensRepo
            .createQueryBuilder('tokens')
            .delete()
            .where("tokenId = :tokenId", { tokenId: verificationToken })
            .execute();
    
        const time = Date.now()/1000 //postgres func to_timestamp accepts unix time in sec
        const verifiedAt = () => `to_timestamp(${time})`
        
        await users.updateUser(user.userId, {verifiedAt})
    
        req.session!.userId = user.userId
        res.cookie(process.env.USER_COOKIE_ID || 'id', user.userId, {
            maxAge: parseInt(process.env.SESSION_LIFETIME || '3600000'),
            sameSite: 'none', //smasite true does not allow to acces cookie in firefox
            httpOnly: false, 
            //secure: process.env.ENV === 'production' ? true : false //should be true in production
        })
    
        const userProfile = await users.getUserProfile(user.userId)
    
        res.status(200).json({user: userProfile, status: "ok"})
    }
    catch (err) {
        console.log(err.message)
        res.status(400).json({error: err.message, status:"error"})
    }
}

export const login: RequestHandler = async (req, res) => {
    try {
        const {password, userId} = req.body as {password: string, userId: string}
        if (!(userId && password)) {
            throw new Error('All fields must be filled!')
        }
        if (userId.length > 30 || password.length > 50) throw new Error('Input too long.')

        const usersRepo = getRepository(Users)
        
        //this is unreliable, should rewrite it probably
        const user  = await usersRepo.findOne({userId})//if i use select options, then if userId is undefined, it wont return first value in column but returns undefined

        //if user used social auth
        if(user && !user.password) {
            throw new Error('Username and password do not match!')
        }
        if (user && !user.verifiedAt) {
            //? chekck token, if expired delete account if it was created more that 24h ago? if yes, delete account
            await auth.checkAndDeleteExpiredUnverifiedAccount(user)            
            throw new Error('Username and password do not match!') //for security dont want to give away any extra info
            //maybe just throw same error and on client side add to make sure that account is verified first
        }
        if (!user) {
            throw new Error('Username and password do not match!')           
        }

        const match = await bcrypt.compare(password, user.password!)
        if (!match) {
            throw new Error('Username and password do not match!')
        } 

        req.session!.userId = userId
        
        //add userId cookie
        res.cookie(process.env.USER_COOKIE_ID || 'id', user.userId, {
            maxAge: parseInt(process.env.SESSION_LIFETIME || '3600000'),
            sameSite: 'none',
            httpOnly: false, 
            //secure: process.env.ENV === 'production' ? true : false //should be true in production
        })

        const userProfile = await users.getUserProfile(userId)

        res.status(200).json({user: userProfile, status: "ok"})
    }
    catch (err) {
        console.log(err)
        res.status(403).json({error: err.message, status:"error"})
    }
}

export const logout = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        req.session!.destroy(err => {
            if (err) {
                throw new Error('Oop, something went wrong. Please try again.')
            }
        })
        res.clearCookie(process.env.SESSION_NAME as string || 'sid')
        res.clearCookie(process.env.USER_COOKIE_ID || 'id')
        res.clearCookie(process.env.CSRF_COOKIE_KEY || 'XSRF-TOKEN')

        res.status(200).json({message: "success", status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(500).json({error: err.message, status: "error"})
    }
}

export const generateAndSendResetPasswordLink = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const email = req.body.email

        if (email.length > 300) throw new Error('Input too long.')

        const usersRepo = getRepository(Users)
        const user  = await usersRepo.findOne({email})

        if (user && !user.verifiedAt) {
            //chekck token, if expired delete account if it was created more that 24h ago
            await auth.checkAndDeleteExpiredUnverifiedAccount(user)            
            throw new Error('Could not send link to provided email adress.') //for security dont want to give away any extra info
            //maybe just throw same error and on client side add to make sure that account is verified first
        }
        if (!user) {
            throw new Error('Could not send link to provided email adress.')           
        }

        const resetPasswordToken = await auth.generateRestPasswordToken(email)

        await sendResetPasswordLink(email, resetPasswordToken, process.env.URL+'/resetPassword')

        res.status(200).json({message: "success", status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(500).json({error: err.message, status: "error"})
    }
}

export const resetPassword = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const resetPasswordToken = req.body.token
        const password = req.body.password

        if(password.length > 50) throw new Error('Input too long.')

        const ResetPasswordTokensRepo = getRepository(ResetPasswordTokens)
        
        const decodedToken = await auth.verifyAndDecodeResetPasswordToken(resetPasswordToken)
        
        if (!decodedToken) { //maybe move these to auth.verifyAndDecodeResetPasswordToken util?
            throw new Error('Could not reset password!')           
        }
        if (decodedToken.exp < Date.now()) {
            throw new Error('Link is expired!')
        }

        const usersRepo = getRepository(Users)
        //if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
        //this is unreliable, should rewrite it probably
        const user  = await usersRepo.findOne({email: decodedToken.email})
        if (!user || !user.verifiedAt) {
            throw new Error('Could not reset password!')           
        }

        //TODO: check if password is strong enough

        const hashedPassword = await bcrypt.hash(password.toString(), 8)
        await users.updateUser(user.userId, {password: hashedPassword})
    
        await ResetPasswordTokensRepo
            .createQueryBuilder('tokens')
            .delete()
            .where("tokenId = :tokenId", { tokenId: resetPasswordToken })
            .execute();

        //logOut user from all devices
        await getConnection().query(`delete from session where sess ->> 'userId'='${user.userId}'`) 
    
        res.status(200).json({message: "success", status: "ok"})
    }
    catch (err) {
        console.log(err.message)
        res.status(403).json({error: err.message, status:"error"})
    }
}

export const generateNewEmailVerificationToken = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const email = req.body.email

        if (email.length > 300) throw new Error('Input too long.')

        const usersRepo = getRepository(Users)
        const user  = await usersRepo.findOne({email})
       
        if (!user) {
            throw new Error('Could not send link to provided email adress.')           
        }
        
        //delete account if it was created more that 24h ago
        const userWasDeleted = await auth.checkAndDeleteExpiredUnverifiedAccount(user)            
        if (userWasDeleted) {
            throw new Error('Could not send link to provided email adress.') 
        }

        const verificationToken = await auth.generateEmailVerificationToken(user.userId)

        await sendEmailConfirmation(email, verificationToken, process.env.URL+'/verify')     
    
        res.status(200).json({status: "ok", message: "success"})
    }
    catch (err) {
        console.log(err)
        res.status(403).json({error: err.message, status:"error"})
    }
}

export const authWithGoogleCallback = async (req: RequestWithCustomProperties, res: Response) => {
    try {   
        const user = req.user as Users
        console.log('authWithGoogleCallback', user)
        if (!user) {
            throw new Error('Oops, something went wrong. Try signing in again.')
        }
        //user signed up previously using signup form, but did not verify email
        if (user && !user.verifiedAt && !user.googleAuth) {
            console.log('user && !user.verifiedAt && !user.googleAuth')
            //if account was created more than 24h ago, we delete it and as user to signup again
            //(in case e.g somebody else used user email to create an account but couldnt verify)
            const userWasDeleted = await auth.checkAndDeleteExpiredUnverifiedAccount(user)            

            if (userWasDeleted) {
                throw new Error('Account with this email was removed because it was not verified during 24 hours after it was created. Please sign in again.')
            }

            //if it was created less than 24h aga, we verify it
            const time = Date.now()/1000
            const verifiedAt = () => `to_timestamp(${time})`

            await users.updateUser(user.userId, {verifiedAt})
            user.verifiedAt = 'somestring' //does not really matter, we only need it to be truthy - we continue to next step
        }

        //here we dont care if user.googleAuth is true or false, because it does not matter - in both cases
        //account is verified and user went through google oauth
        if (user && user.verifiedAt) {
            console.log('user && user.verifiedAt')
            req.session!.userId = user.userId
        
            //add userId cookie
            res.cookie(process.env.USER_COOKIE_ID || 'id', user.userId, {
                maxAge: parseInt(process.env.SESSION_LIFETIME || '3600000'),
                sameSite: 'none',
                httpOnly: false, 
                //secure: process.env.ENV === 'production' ? true : false 
            })
        
            //we cant send data and redirect at the same time so i cant send profile data back, 
            //client will have to fetch profile after getting session cookie
            res.status(200).redirect(`${process.env.URL}/`);
        }

        //user signed up with google, but did not complete account creation 
        if (user && !user.verifiedAt && user.googleAuth) {
            console.log('user && !user.verifiedAt && user.googleAuth')
            //send userData that we have plus token to use when completing account creation (similar to email verification)
            
            const verificationToken = await auth.generateGoogleAuthlVerificationToken(user.userId, user.email)
            req.session!.verificationToken = verificationToken
            console.log('verificationToken', verificationToken)

            //send some data to client so it will be able to show user what first and lastname we got from oauth
            const oauthData = JSON.stringify({
                firstName: encodeURI(user.firstName || ''),
                lastName: encodeURI(user.lastName || '')
            })
            console.log('oauthData', oauthData)
            res.cookie(process.env.COOKIE_OAUTH_USER_DATA_NAME || 'oauth_user_data', oauthData, {
                maxAge: parseInt(process.env.COOKIE_OAUTH_VERIFICATION_TOKEN_LIFETIME || '3600000'),
                sameSite: 'none',
                httpOnly: false, 
                encode: String,
                //secure: process.env.ENV === 'production' ? true : false 
            })
            res
                .status(200)
                .redirect(`${process.env.URL}/login`);
        }

    }
    catch (err) {
        console.log(err)
        res.status(403).redirect(`${process.env.URL}/login`)
    }
}

export const completeGoogleAuthAccountCreation = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const usersRepo = getRepository(Users)

        const {userId, firstName, lastName} = req.body as {userId: string, firstName: string, lastName: string}
        
        const verificationToken = req.session!.verificationToken
        if (!verificationToken) {
            throw new Error('Oops, something went wrong. Try signing in again.')
        }

        if (!(userId && firstName && lastName)) {
            throw new Error('All fields must be filled!')
        }
        if (userId.length > 20 || firstName.length > 100 || lastName.length > 100) {
            throw new Error('Input too long.')
        }

        let decodedToken;
        try {
            decodedToken = await auth.verifyAndDecodeGoogleAuthVerificationToken(verificationToken)
        } catch (err) {
            req.session!.destroy(err => console.log(err))
            res.clearCookie(process.env.SESSION_NAME as string || 'sid')
            res.clearCookie(process.env.COOKIE_OAUTH_USER_DATA_NAME || 'oauth_user_data')
            throw new Error('Invalid verification token. Please sign in again.')
        }

        const user = await usersRepo.findOne({email: decodedToken.email})
        
        if (!user || user.verifiedAt) {
            throw new Error('Verification failed!')           
        }

        //check if we have already user with such username
        const userInDb = await usersRepo.findOne({userId})

        //delete account if it was created more that 24h ago then allow to use this username again
        if (userInDb) {
            if (userInDb.verifiedAt) {
                throw new Error('Username already exists!')
            }
            const userDeleted = await auth.checkAndDeleteExpiredUnverifiedAccount(userInDb)
            if (!userDeleted) {
                throw new Error('Username already exists!')
            }
        }

        const time = Date.now()/1000 //postgres func to_timestamp accepts unix time in sec
        const userDataToUpdate = { 
            userId: sanitazeUsername(userId.toLowerCase()),
            firstName: sanitazeFirstOrLastname(firstName), 
            lastName: sanitazeFirstOrLastname(lastName),
            verifiedAt: () => `to_timestamp(${time})`
        }
                
        await users.updateUser(user.userId, userDataToUpdate)
    
        req.session!.userId = userDataToUpdate.userId
        res.cookie(process.env.USER_COOKIE_ID || 'id', userDataToUpdate.userId, {
            maxAge: parseInt(process.env.SESSION_LIFETIME || '3600000'),
            sameSite: 'none', //smasite true does not allow to acces cookie in firefox
            httpOnly: false, 
            //secure: process.env.ENV === 'production' ? true : false //should be true in production
        })
    
        const newUserProfile = await users.getUserProfile(userId)
        
        //do i need to remove token from session?
        delete req.session!.verificationToken
        res.clearCookie(process.env.COOKIE_OAUTH_USER_DATA_NAME || 'oauth_user_data')
        res.status(200).json({user: newUserProfile, status: "ok"})
    }
    catch (err) {
        console.log(err)
        res.status(403).json({error: err.message, status:"error"})
    }
}