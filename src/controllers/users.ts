import {getRepository} from "typeorm"
import {Users} from "../entity/Users"
// import {Tweets} from "../entity/Tweets"
import {RequestHandler, Response} from 'express'
import {RequestWithCustomProperties} from '../models/request'
//import {UpdateUserData} from '../models/users'
import bcrypt from 'bcrypt'
// import {formatUser} from '../utils/helpers'
import * as tokens from '../utils/tokens'
import * as auth from '../utils/authentication'
import * as users from '../utils/users'


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

export const addUser: RequestHandler = async (req, res) => {
    try {
        const usersRepo = getRepository(Users)
        const {userId, firstName, lastName, avatarURL, password, backgroundURL, description, location, email} = req.body as {userId: string, firstName: string, lastName: string, avatarURL: string, password: string, backgroundURL: string | null | undefined, description: string | null | undefined, location: string | null | undefined, email: string}
        // const problem = await usersRepo.findOne(undefined)
        // console.log(problem)
        if (!(userId && firstName && lastName && avatarURL && password)) {
            throw new Error('All fields must be filled!')
        }
        if (await usersRepo.findOne({userId})) { //if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
            throw new Error('Username already exists!')
        }

        const user = { 
            userId: userId.toLowerCase(),
            firstName: firstName, 
            lastName: lastName,
            avatar: avatarURL || null,
            background: backgroundURL || null,
            description: description || null,
            location: location || null,
            email: email,
            password: await bcrypt.hash(password.toString(), 8),
            createdAt: () => `to_timestamp(${Date.now()/1000})` //postgres func to_timestamp accepts unix time in sec
        }

        await usersRepo
                .createQueryBuilder('users')
                .insert()
                .values(user)
                .execute();

        const token = auth.generateAuthToken(user.userId)
        await tokens.saveToken(user.userId, token)
        
        const userProfile = await users.getUserProfile(userId)
        res.status(201).json({ user: userProfile, token, status: "ok"})

        // const formatedUser: FormatedUser = formatUser(userId, firstName, lastName, avatarURL, [], [], [])
    
        // res.json({ user: {[userId]:formatedUser}, token})
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

export const updateUser = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userDataToUpdate = req.body
        console.log(userDataToUpdate)
        const userId = req.userId as string
        
        //need to somehow validate data that user wants to change
        const supportedProperties = ['firstName', 'lastName', 'location', 'description', 'avatar', 'background', 'email']
        if (Object.keys(userDataToUpdate).length === 0) {
            throw new Error('no fields provided')
        }
        for (let key in userDataToUpdate) {
            if (!supportedProperties.includes(key)) {
                throw new Error('invalid field')
            }
        }

        await users.updateUser(userId, userDataToUpdate)

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