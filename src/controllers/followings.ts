import { Response } from 'express'
import { RequestWithCustomProperties } from '../models/request'
import * as users from '../utils/users'
import { IoFuncInterface } from '../models/ioFuncs'
import { pick } from 'lodash'

export const getUserFollowingsPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const firstRequestTime = parseInt(req.query.time)
        const userToGet = req.params.userId

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userFollowings = await users.getUserFollowingsPaginated(userId, userToGet, skip, take, firstRequestTime)

        res.status(200).json({ users: userFollowings, status: "ok" })
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getUserFollowersPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const firstRequestTime = parseInt(req.query.time)
        const userToGet = req.params.userId

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userFollowers = await users.getUserFollowersPaginated(userId, userToGet, skip, take, firstRequestTime)

        res.status(200).json({ users: userFollowers, status: "ok" })
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const addFollowing = async (req: RequestWithCustomProperties, res: Response, ioFuncs: IoFuncInterface) => {
    try {
        const followingId = req.params.userId
        const userId = req.userId as string
        // const followingsRepo = getRepository(Followings)
        // const createdAt = Date.now()
        // const following = { 
        //     userId: userId.toLowerCase(),
        //     followingId,
        //     createdAt: () => `to_timestamp(${createdAt/1000})` //postgres func to_timestamp accepts unix time in sec
        // }
        // await followingsRepo
        // .createQueryBuilder('followings')
        // .insert()
        // .values(following)
        // .execute();

        const updatedUsers = await users.addFollowing(userId, followingId)

        res.status(201).json({users: updatedUsers, status: "ok"})
        ioFuncs.sendUserUpdate(userId, {[userId]: pick(updatedUsers[userId], ['userId', 'followingsCount'])})
        ioFuncs.sendUserUpdate(followingId, {[followingId]: pick(updatedUsers[followingId], ['userId', 'followersCount'])})
    }
    catch(err) {
        console.log(err)
        res.status(400).json({error: err, status: "error"})
    }
}

export const deleteFollowing = async (req: RequestWithCustomProperties, res: Response, ioFuncs: IoFuncInterface) => {
    try {
        const followingId = req.params.userId
        const userId = req.userId as string

        await users.deleteFollowing(userId, followingId)

        const updatedUsers = await users.getUsersByIds(userId, [userId, followingId])

        res.status(200).json({users: updatedUsers, status: "ok"})
        ioFuncs.sendUserUpdate(userId, {[userId]: pick(updatedUsers[userId], ['userId', 'followingsCount'])})
        ioFuncs.sendUserUpdate(followingId, {[followingId]: pick(updatedUsers[followingId], ['userId', 'followersCount'])})
        // const userProfile = await users.getUserProfile(userId)
        // res.status(200).json({user: userProfile})
    }
    catch(err) {
        console.log(err)
        res.status(400).json({error: err, status: "error"})
    }
}