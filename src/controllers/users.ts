import { getRepository } from "typeorm"
import { Users } from "../entity/Users"
import { RequestHandler, Response } from 'express'
import { RequestWithCustomProperties  } from '../models/request'
import bcrypt from 'bcrypt'
import * as users from '../utils/users'
import * as auth from '../utils/authentication'
import { DefaultProfileImage } from "../entity/DefaultProfileImage"
import {
    sendEmailConfirmation, 
    validateEmail, 
    removeBlacklistCharsForSearch, 
    sanitazeFirstOrLastname, 
    sanitazeUsername } from '../utils/helpers'

export const getUserProfile = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        const userProfile = await users.getUserProfile(userId)
    
        res.status(200).json({user: userProfile, status: "ok"})
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getUser = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        const userIdToGet = req.params.userId as string

        if (!userIdToGet) {
            throw new Error('Invalid request')
        }

        const user = await users.getUsersByIds(userId, [userIdToGet])

        res.status(200).json({user: user, status: "ok"})
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err, status: "error"})
    }
}

export const getUserAvatar = async (req: RequestWithCustomProperties, res: Response) => {
    try {
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
            // console.log(avatarResponse)
            avatar = avatarResponse?.image || null
        }

        res.set('Content-Type', 'image/jpeg')
        res.status(200).send(avatar)
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err, status: "error"})
    }
}

export const getUserAvatarDefault = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const avatarResponse = await getRepository(DefaultProfileImage)
            .createQueryBuilder("image")
            .take(1)
            .getOne()

        res.set('Content-Type', 'image/jpg')
        res.status(200).send(avatarResponse?.image || null)
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err, status: "error"})
    }
}

export const getUserBackground = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userIdToGet = req.params.userId as string

        const usersRepo = getRepository(Users)
        const user = await usersRepo.findOne({userId: userIdToGet})
        if (!user || !user.backgroundImage) {
            throw new Error('not found')
        }
        const backgroundImage = user.backgroundImage

        res.set('Content-Type', 'image/jpg')
        res.status(200).send(backgroundImage)
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err, status: "error"})
    }
}

export const addUser: RequestHandler = async (req, res) => {
    try {
        const usersRepo = getRepository(Users)
        const {userId, firstName, lastName, password, email} = req.body as {userId: string, firstName: string, lastName: string,  password: string, email: string}
        
        if (!(userId && firstName && lastName && email && password)) {
            throw new Error('All fields must be filled!')
        }
        //if i use select options, then if userId is undefined, it wont return first value in column but returns undefined
        //this is unreliable, should rexrite it probably
        const userInDbWithSameUsername = await usersRepo.findOne({userId})

        //chekck token, if expired delete account if it was created more that 24h ago
        //then allow to register with this username again
        if (userInDbWithSameUsername && !userInDbWithSameUsername.verifiedAt) {
            const userDeleted = await auth.checkAndDeleteExpiredUnverifiedAccount(userInDbWithSameUsername)
            if (!userDeleted) { 
                throw new Error('Username already exists!')
            }
        }
        const userInDbWithSameEmail = await usersRepo.findOne({email})
        if (userInDbWithSameEmail && !userInDbWithSameEmail.verifiedAt) { 
            const userDeleted = await auth.checkAndDeleteExpiredUnverifiedAccount(userInDbWithSameEmail)
            if (!userDeleted) {
                throw new Error('Email already taken!')
            }
        }

        if (!validateEmail(email)) {
            throw new Error('Provided email adress is invalid!')
        }
        
        //TODO: check if password is strong enough
        if (userId.length > 20 || firstName.length > 100 || lastName.length > 100 || email.length > 300 || password.length > 50) {
            throw new Error('Input too long.')
        }
        const user = { 
            userId: sanitazeUsername(userId.toLowerCase()),
            firstName: sanitazeFirstOrLastname(firstName), 
            lastName: sanitazeFirstOrLastname(lastName),
            email: email,
            password: await bcrypt.hash(password.toString(), 8), //8 should be changed to 12!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            createdAt: () => `to_timestamp(${Date.now()/1000})`, //postgres func to_timestamp accepts unix time in sec
        }
        //?wrap in try catch to send custom error message if error occurs
        await usersRepo
                .createQueryBuilder('users')
                .insert()
                .values(user)
                .execute();
        
        const verificationToken = await auth.generateEmailVerificationToken(user.userId)

        await sendEmailConfirmation(email, verificationToken, process.env.URL+'/verify') //bad that url is hardcoded, maybe send it with request?
        //I think in case of email error no need really to delete user from db here as it will be eligible for delete 
        //after 24h anyway if not verified    
    
        res.status(200).json({ status: "ok"})
    } catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"}) //how to send error properly? Do i need to serialize error object somehow?
    }
}

export const updateUser = async (req: RequestWithCustomProperties, res: Response) => {
    //handels only 1 file, so avatar and background cant be updated at the same time
    try {
        const userDataToUpdate = JSON.parse(req.body.user)
        const userId = req.userId as string
        const file = req.file?.buffer || null
        const crop = userDataToUpdate.crop || null
        
        const supportedProperties = ['firstName', 'lastName', 'location', 'description', 'avatar', 'backgroundColor', 'backgroundImage', 'crop']
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

        await users.updateUser(userId, userDataToUpdate, file)

        const newUserProfile = await users.getUserProfile(userId)

        res.status(200).json({user: newUserProfile, status: "ok"})
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

export const getAllUsersPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const firstRequestTime = parseInt(req.query.time)

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }
        if (take > 300 || skip > 300) {
            res.status(200).json({ users: {}, status: "ok" })
            return
        }

        const userProfiles = await users.getAllUsersPaginated(userId, skip, take, firstRequestTime)

        res.status(200).json({ users: userProfiles, status: "ok" })
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const findUserPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    //findUserPaginated
    try{
        const userId = req.userId as string
        const userTofind = removeBlacklistCharsForSearch(req.params.userId) 
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const firstRequestTime = parseInt(req.query.time)
        // console.log('userTofind: ', userTofind)

        if (userTofind.length > 50) throw new Error('Input too long.')
        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined || userId === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userProfiles = await users.findUserPaginated(userId, userTofind, skip, take, firstRequestTime)

        res.status(200).json({ users: userProfiles, status: "ok" })
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}