import {RequestHandler, Response} from 'express'
import {RequestWithCustomProperties} from '../models/request'
import {Users} from "../entity/Users"
import {getRepository, getConnection} from "typeorm"
import bcrypt from 'bcrypt'
import * as auth from '../utils/authentication'
import * as users from '../utils/users'
import { VerificationTokens } from '../entity/VerificationTokens'
import {sendResetPasswordLink} from '../utils/helpers'
import { ResetPasswordTokens } from '../entity/ResetPasswordTokens'
// import { Tokens } from '../entity/Tokens'
// import {REFRESH_TOKEN_VALID_DURATION, JWT_VALID_DURATION} from '../utils/constants'
// import {v4 as uuidv4} from 'uuid'

// export const verifyUserEmail: RequestHandler = async (req, res) => {
//     try {
//         const verificationToken = req.params.token
//         const verificationTokensRepo = getRepository(VerificationTokens)
        
//         const decodedToken = await auth.verifyAndDecodeEmailVerificationToken(verificationToken)

//         if (!decodedToken) {
//             throw new Error('Verification failed!')           
//         }
//         if (decodedToken.exp < Date.now()) {
//             throw new Error('Verification link is expired. Please request new verification link.')
//           }

//         const usersRepo = getRepository(Users)
//         const user  = await usersRepo.findOne({userId: decodedToken.userId})//if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
//         //this is unreliable, should rewrite it probably
        
//         if (!user || user.verifiedAt) {
//             throw new Error('Verification failed!')           
//         }
    
//         await verificationTokensRepo
//             .createQueryBuilder('tokens')
//             .delete()
//             .where("tokenId = :tokenId", { tokenId: verificationToken })
//             .execute();
    
//         const time = Date.now()/1000 //postgres func to_timestamp accepts unix time in sec
//         const verifiedAt = () => `to_timestamp(${time})`
        
//         await users.updateUser(user.userId, {verifiedAt})
    
//         const token = auth.generateAuthToken(user.userId)
//         await tokens.saveToken(user.userId, token)
    
//         const userProfile = await users.getUserProfile(user.userId)
    
//         res.status(201).json({user: userProfile, token, status: "ok"})
//     }
//     catch (err) {
//         console.log(err.message)
//         res.status(400).json({error: err.message, status:"error"})
//     }
// }

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
            sameSite: true,
            httpOnly: false, 
            secure: false //should be true in production
        })
    
        const userProfile = await users.getUserProfile(user.userId)
    
        res.status(201).json({user: userProfile, status: "ok"})
    }
    catch (err) {
        console.log(err.message)
        res.status(400).json({error: err.message, status:"error"})
    }
}

// export const login: RequestHandler = async (req, res) => {
//     try {
//         const {password, userId} = req.body as {password: string, userId: string}
//         const usersRepo = getRepository(Users)
//         const user  = await usersRepo.findOne({userId})//if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
//         //this is unreliable, should rewrite it probably

//         if (user && !user.verifiedAt) {
//             //? chekck token, if expired delete account if it was created more that 24h ago? if yes, delete account
//             await auth.checkAndDeleteExpiredUnverifiedAccount(user)            
//             throw new Error('Username and password do not match!') //for security dont want to give away any extra info
//             //maybe just throw same error and on client side add to make sure that account is verified first
//         }
//         if (!user) {
//             throw new Error('Username and password do not match!')           
//         }

//         const match = await bcrypt.compare(password, user.password)
//         if (!match) {
//             throw new Error('Username and password do not match!')
//         } 

//         const token = auth.generateAuthToken(user.userId)
//         await tokens.saveToken(user.userId, token) //will error be caught if it happens inside this function - it should 

//         const userProfile = await users.getUserProfile(userId)

//         res.status(201).json({user: userProfile, token, status: "ok"})
//     }
//     catch (err) {
//         res.status(400).json({error: err.message, status:"error"})
//     }
// }

export const login: RequestHandler = async (req, res) => {
    try {
        const {password, userId} = req.body as {password: string, userId: string}
        const usersRepo = getRepository(Users)
        const user  = await usersRepo.findOne({userId})//if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
        //this is unreliable, should rewrite it probably

        if (user && !user.verifiedAt) {
            //? chekck token, if expired delete account if it was created more that 24h ago? if yes, delete account
            await auth.checkAndDeleteExpiredUnverifiedAccount(user)            
            throw new Error('Username and password do not match!') //for security dont want to give away any extra info
            //maybe just throw same error and on client side add to make sure that account is verified first
        }
        if (!user) {
            throw new Error('Username and password do not match!')           
        }

        const match = await bcrypt.compare(password, user.password)
        if (!match) {
            throw new Error('Username and password do not match!')
        } 

        req.session!.userId = userId
        
        //add userId cookie
        res.cookie(process.env.USER_COOKIE_ID || 'id', user.userId, {
            maxAge: parseInt(process.env.SESSION_LIFETIME || '3600000'),
            sameSite: true,
            httpOnly: false, 
            secure: false //should be true in production
        })

        const userProfile = await users.getUserProfile(userId)

        res.status(200).json({user: userProfile, status: "ok"})
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status:"error"})
    }
}

// export const logout = async (req: RequestWithCustomProperties, res: Response) => {
//     try {
//         const tokenId = req.tokenId as string
//         await tokens.deleteToken(tokenId)

//         res.status(201).json({message: "success", status: "ok"})
//     }
//     catch(err) {
//         res.status(500).json({error: err.message, status: "error"})
//     }
// }

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
        res.status(500).json({error: err.message, status: "error"})
    }
}

// export const logoutAll = async (req: RequestWithCustomProperties, res: Response) => {
//     try {
//         const userId = req.userId as string
//         await tokens.deleteAllTokens(userId)

//         res.status(201).json({message: "success", status: "ok"})
//     }
//     catch(err) {
//         res.status(500).json({error: err.message, status: "error"})
//     }
// }


export const generateAndSendResetPasswordLink = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const email = req.body.email
        const usersRepo = getRepository(Users)
        const user  = await usersRepo.findOne({email})

        if (user && !user.verifiedAt) {
            //? chekck token, if expired delete account if it was created more that 24h ago?
            await auth.checkAndDeleteExpiredUnverifiedAccount(user)            
            throw new Error('Could not send link to provided email adress.') //for security dont want to give away any extra info
            //maybe just throw same error and on client side add to make sure that account is verified first
        }
        if (!user) {
            throw new Error('Could not send link to provided email adress.')           
        }

        const resetPasswordToken = await auth.generateRestPasswordToken(email)

        await sendResetPasswordLink(email, resetPasswordToken, process.env.URL+'/resetPassword')

        res.status(201).json({message: "success", status: "ok"})
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

        const ResetPasswordTokensRepo = getRepository(ResetPasswordTokens)
        
        const decodedToken = await auth.verifyAndDecodeResetPasswordToken(resetPasswordToken)
        
        if (!decodedToken) { //maybe move these to auth.verifyAndDecodeResetPasswordToken util?
            throw new Error('Could not reset password!')           
        }
        if (decodedToken.exp < Date.now()) {
            throw new Error('Link is expired!')
          }

        const usersRepo = getRepository(Users)
        const user  = await usersRepo.findOne({email: decodedToken.email})//if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
        //this is unreliable, should rewrite it probably
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
    
        // const time = Date.now()/1000 //postgres func to_timestamp accepts unix time in sec
        // const updatedAt = () => `to_timestamp(${time})`
        // await users.updateUser(user.userId, {updatedAt})
    
        await getConnection().query(`delete from session where sess ->> 'userId'='${user.userId}'`) //logOut user from all devices
    
        res.status(201).json({message: "success", status: "ok"})
    }
    catch (err) {
        console.log(err.message)
        res.status(400).json({error: err.message, status:"error"})
    }
}

// export const getNewJwtToken = async (req: RequestWithCustomProperties, res: Response) => {
//     try {
//         const refreshToken = req.cookies.refreshToken
//         const userId = req.userId as string
//         const tokensRepo = getRepository(Tokens)

//         const refreshTokenInDb = await tokensRepo.findOne({tokenId: refreshToken})
        
//         if (!refreshTokenInDb) {
//             res.status(401).json({error: 'Invalid refresh token!', status:"error"})
//             return
//         }

//         const time = Date.now()
        
//         const tokenExpiresAt = new Date(refreshTokenInDb.createdAt).getTime() + REFRESH_TOKEN_VALID_DURATION
//         if (tokenExpiresAt > time) {
//             res.status(401).json({error: 'Refresh token expired!', status:"error"})
//             return
//         }
        
//         await tokensRepo
//         .createQueryBuilder('tokens')
//         .delete()
//         .where("tokenId = :tokenId", { tokenId: refreshToken })
//         .execute();
        
//         res.clearCookie('refreshToken', {httpOnly: true, secure: false}) //how to delete old refresh token on browser and then change to new one?

//         const newRefreshToken = await auth.generateRefreshToken(userId, time)
//         res.cookie('refreshToken', newRefreshToken, {
//             expires: new Date(time + REFRESH_TOKEN_VALID_DURATION),
//             httpOnly: true,
//             secure: false
//           });

//         const newJwtToken = auth.generateJwtToken(userId, time)


//         res.status(201).json({
//             message: "success", 
//             status: "ok", 
//             jwtToken: {
//                 userId,
//                 token: newJwtToken,
//                 expiresAt: time + JWT_VALID_DURATION
//             }
//         })
//     }
//     catch (err) {
//         console.log(err.message)
//         res.status(400).json({error: err.message, status:"error"})
//     }
// }