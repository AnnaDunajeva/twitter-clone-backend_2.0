import {getRepository} from "typeorm"
import {Users} from "../entity/Users"
// import {Tweets} from "../entity/Tweets"
import {RequestHandler, Response} from 'express'
import {RequestWithCustomProperties} from '../models/request'
//import {UpdateUserData} from '../models/users'
import bcrypt from 'bcrypt'
// import {formatUser} from '../utils/helpers'
// import * as tokens from '../utils/tokens'
// import * as auth from '../utils/authentication'
import * as users from '../utils/users'
import * as auth from '../utils/authentication'
import { DefaultProfileImage } from "../entity/DefaultProfileImage"
import sharp from 'sharp'
import {omit} from 'lodash'
import {sendEmailConfirmation} from '../utils/helpers'
import {validateEmail} from '../utils/helpers'
// import {IoFuncInterface} from '../models/ioFuncs'

export const getUserProfile = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        const userProfile = await users.getUserProfile(userId)
    
        res.status(201).json({user: userProfile, status: "ok"})
    }
    catch (err) {
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getUser = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        const userIdToGet = req.params.userId as string
        const user = await users.getUsersByIds(userId, [userIdToGet])

        res.status(201).json({user: user, status: "ok"})
    }
    catch (err) {
        res.status(400).json({error: err, status: "error"})
    }
}

// export const getUserAvatar = async (req: RequestWithCustomProperties, res: Response) => {
//     try {
//         // const userId = req.userId as string
//         const userIdToGet = req.params.userId as string

//         const usersRepo = getRepository(Users)
//         const user = await usersRepo.findOne({userId: userIdToGet})
//         const avatar = user?.avatar?.toString('base64') || null

//         res.status(201).json({image: avatar, status: "ok"})
//     }
//     catch (err) {
//         res.status(400).json({error: err, status: "error"})
//     }
// }
export const getUserAvatar = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        // const userId = req.userId as string
        const userIdToGet = req.params.userId as string

        const usersRepo = getRepository(Users)
        const user = await usersRepo.findOne({userId: userIdToGet})
        if (!user) {
            throw new Error('not found')
        }

        let avatar = user.avatar
        if(!avatar) {
            const avatarResponse = await getRepository(DefaultProfileImage)
                .createQueryBuilder("image")
                .take(1)
                .getOne()
            console.log(avatarResponse)
            avatar = avatarResponse?.image || null
        }

        res.set('Content-Type', 'image/jpeg')
        res.status(201).send(avatar)
    }
    catch (err) {
        res.status(400).json({error: err, status: "error"})
    }
}

export const getUserAvatarDefault = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const avatarResponse = await getRepository(DefaultProfileImage)
            .createQueryBuilder("image")
            .take(1)
            .getOne()
        console.log(avatarResponse)

        res.set('Content-Type', 'image/jpg')
        res.status(201).send(avatarResponse?.image || null)
    }
    catch (err) {
        res.status(400).json({error: err, status: "error"})
    }
}

export const getUserBackground = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        // const userId = req.userId as string
        const userIdToGet = req.params.userId as string

        const usersRepo = getRepository(Users)
        const user = await usersRepo.findOne({userId: userIdToGet})
        if (!user || !user.backgroundImage) {
            throw new Error('not found')
        }
        const backgroundImage = user.backgroundImage

        res.set('Content-Type', 'image/jpg')
        res.status(201).send(backgroundImage)
    }
    catch (err) {
        res.status(400).json({error: err, status: "error"})
    }
}

export const addUser: RequestHandler = async (req, res) => {
    try {
        const usersRepo = getRepository(Users)
        const {userId, firstName, lastName, password, email} = req.body as {userId: string, firstName: string, lastName: string,  password: string, email: string}
        // const problem = await usersRepo.findOne(undefined)
        // console.log(problem)
        if (!(userId && firstName && lastName && email && password)) {
            throw new Error('All fields must be filled!')
        }
        const userInDb = await usersRepo.findOne({userId})//if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
        //this is unreliable, should rexrite it probably

        //? chekck token, if expired delete account if it was created more that 24h ago? 
        //then allow to register with this username again?
        let userDeleted = false
        if (userInDb && !userInDb.verifiedAt) {
            userDeleted = await auth.checkAndDeleteExpiredUnverifiedAccount(userInDb)
        }

        if (userInDb && !userDeleted) { 
            throw new Error('Username already exists!')
        }

        // if (await usersRepo.findOne({email})) { //if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
        //                                         //this is unreliable, should rexrite it probably
        //     throw new Error('Email already taken!')
        // }
        if (!validateEmail(email)) {
            throw new Error('Provided email adress is invalid!')
        }
        
        const user = { 
            userId: userId.toLowerCase(),
            firstName: firstName, 
            lastName: lastName,
            email: email,
            password: await bcrypt.hash(password.toString(), 8), //8 should be changed to 12!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            createdAt: () => `to_timestamp(${Date.now()/1000})`, //postgres func to_timestamp accepts unix time in sec
            avatar: null, //can remove all these nulls really
            backgroundImage: null,
            backgroundColor: null,
            description: null,
            location: null,
            verifiedAt: null
        }
        await usersRepo
                .createQueryBuilder('users')
                .insert()
                .values(user)
                .execute();
        
        const verificationToken = await auth.generateEmailVerificationToken(user.userId)

        await sendEmailConfirmation(email, verificationToken, 'http://localhost:3000/verify') //dunno how to get it from req

        // const userProfile = await users.getUserProfile(userId)
        res.status(201).json({ status: "ok"})

        // const token = auth.generateAuthToken(user.userId)
        // await tokens.saveToken(user.userId, token)
        
        // const userProfile = await users.getUserProfile(userId)
        // res.status(201).json({ user: userProfile, token, status: "ok"})
    } catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"}) //how to send error properly? Do i need to serialize error object somehow?
    }
}

// export const getAllUsers: RequestHandler = async (req, res) => {
//     try {
//         const userIds = await users.getAllUserIds()
//         const userProfiles = await users.getUsersByIds(userIds)

//         res.status(201).json({users: userProfiles})
//     }
//     catch (err) {
//         res.status(400).json({error: err.message})
//     }
// }
// export const getAllUsersExeptAuthedUser = async (req: RequestWithCustomProperties, res: Response) => {
//     try {
//         const userId = req.userId as string
//         const userProfiles = await users.getAllUsersExeptAuthedUser(userId)

//         res.status(201).json({users: userProfiles})
//     }
//     catch (err) {
//         res.status(400).json({error: err.message})
//     }
// }

// export const updateUser = async (req: RequestWithCustomProperties, res: Response) => {
//     try {
//         const userDataToUpdate = req.body
//         console.log(userDataToUpdate)
//         const userId = req.userId as string
        
//         //need to somehow validate data that user wants to change
//         const supportedProperties = ['firstName', 'lastName', 'location', 'description', 'avatar', 'background', 'email']
//         if (Object.keys(userDataToUpdate).length === 0) {
//             throw new Error('no fields provided')
//         }
//         for (let key in userDataToUpdate) {
//             if (!supportedProperties.includes(key)) {
//                 throw new Error('invalid field')
//             }
//         }

//         await users.updateUser(userId, userDataToUpdate)

//         const newUserProfile = await users.getUserProfile(userId)

//         res.status(201).json({user: newUserProfile, status: "ok"})
//     }
//     catch (err) {
//         console.log(err)
//         res.status(400).json({error: err.message, status: "error"}) 
//     }
// }

export const updateUser = async (req: RequestWithCustomProperties, res: Response) => {
    //handels only 1 file, so avatar and background cant be updated at the same time
    try {
        const userDataToUpdate = JSON.parse(req.body.user)
        console.log(userDataToUpdate)
        // throw new Error('test from backend')
        const userId = req.userId as string
        const file = req.file?.buffer || null
        const crop = userDataToUpdate.crop || null
        
        //need to somehow validate data that user wants to change
        const supportedProperties = ['firstName', 'lastName', 'location', 'description', 'avatar', 'email', 'backgroundColor', 'backgroundImage', 'crop']
        if (Object.keys(userDataToUpdate).length === 0) {
            throw new Error('No fields provided.')
        }
        for (let key in userDataToUpdate) {
            if (!supportedProperties.includes(key)) {
                throw new Error('Invalid field.')
            }
        }
        if (file && !crop) {
            throw new Error('Crop options not specified.')
        }
        
        if (file && userDataToUpdate.backgroundImage) {
            userDataToUpdate.backgroundImage = await sharp(file).extract({left: Math.round(crop.x), top: Math.round(crop.y), width: Math.round(crop.width), height: Math.round(crop.height)}).resize({width: 1000, height: 200}).jpeg().toBuffer()
        } else if (file && userDataToUpdate.avatar) {
            userDataToUpdate.avatar = await sharp(file).extract({left: Math.round(crop.x), top: Math.round(crop.y), width: Math.round(crop.width), height: Math.round(crop.height)}).resize({width: 200, height: 200}).jpeg().toBuffer()
        }
        console.log(userDataToUpdate)

        await users.updateUser(userId, omit(userDataToUpdate, 'crop'))

        const newUserProfile = await users.getUserProfile(userId)

        res.status(201).json({user: newUserProfile, status: "ok"})
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"}) 
    }
}

export const deleteAvatar = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        await users.updateUser(userId, {avatar: null})
        const newUserProfile = await users.getUserProfile(userId)

        res.status(201).json({user: newUserProfile, status: "ok"})
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"}) 
    }
}
export const deleteBackground = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        await users.updateUser(userId, {backgroundImage: null})
        const newUserProfile = await users.getUserProfile(userId)

        res.status(201).json({user: newUserProfile, status: "ok"})
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"}) 
    }
}
// export const getUsersByIds = async (req: RequestWithCustomProperties, res: Response) => { 
//     try {
//         const userIds = req.body.users as string[]
//         const formatedUsers = userIds.length > 0 ? await users.getUsersByIds(userIds) : {}

//         res.status(201).json({ users: formatedUsers })
//     } catch (err) {
//         res.status(500).json({error: err})
//     }
// }
export const getAllUsersPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const firstRequestTime = parseInt(req.query.time)

        if (!take && !skip && !firstRequestTime) {
            throw new Error('Wrong query!')
        }

        const userProfiles = await users.getAllUsersPaginated(userId, skip, take, firstRequestTime)

        res.status(201).json({ users: userProfiles, status: "ok" })
    }
    catch (err) {
        res.status(400).json({error: err.message, status: "error"})
    }
}
// export const deleteUser = async (req: RequestWithCustomProperties, res: Response) => {
//     try {
//         const userId = req.userId as string
//         const usersRepo = getRepository(Users)
//     }
//     catch (err) {
//         res.status(400).json({error: err})
//     }
// }