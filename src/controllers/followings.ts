import {getRepository} from "typeorm"
import {Response} from 'express'
import {RequestWithCustomProperties} from '../models/request'
import { Followings } from "../entity/Followings"
import * as users from '../utils/users'

//needs also paginated paginated
export const getFollowings = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        const followingsIds = await users.getFollowingsIds(userId)
        const followingsFormated = followingsIds.length > 0 ? await users.getUsersByIds(userId, followingsIds) : {}

        res.status(201).json({ users: followingsFormated, status: "ok" })
    } catch (err) {
        res.status(400).json({error: err, status: "error"})
    }
}

//needs also paginated version paginated
export const getFollowers = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        const followersIds = await users.getFollowersIds(userId)
        const followersFormated = followersIds.length > 0 ? await users.getUsersByIds(userId, followersIds) : {}

        res.status(201).json({ users: followersFormated, status: "ok" })
    } catch (err) {
        res.status(400).json({error: err, status: "error"})
    }

}
export const addFollowing = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const followingId = req.params.userId
        const userId = req.userId as string
        const followingsRepo = getRepository(Followings)
        const createdAt = Date.now()
        const following = { 
            userId: userId.toLowerCase(),
            followingId,
            createdAt: () => `to_timestamp(${createdAt/1000})` //postgres func to_timestamp accepts unix time in sec
        }
        await followingsRepo
        .createQueryBuilder('followings')
        .insert()
        .values(following)
        .execute();
        // const following = new Followings()
        // following.userId = userId
        // following.followingId = followingId
        // following.createdAt = `to_timestamp(${Date.now()/1000})` //postgres func to_timestamp accepts unix time in sec
        // await followingsRepo.save(following)
        // const userProfile = await users.getUserProfile(userId)
        const updatedUsers = await users.getUsersByIds(userId, [userId, followingId])
        res.status(200).json({users: updatedUsers, status: "ok"})
    }
    catch(err) {
        res.status(400).json({error: err, status: "error"})
    }
}

export const deleteFollowing = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const followingId = req.params.userId
        const userId = req.userId as string

        await users.deleteFollowing(userId, followingId)

        const updatedUsers = await users.getUsersByIds(userId, [userId, followingId])
        res.status(200).json({users: updatedUsers, status: "ok"})

        // const userProfile = await users.getUserProfile(userId)
        // res.status(200).json({user: userProfile})
    }
    catch(err) {
        res.status(400).json({error: err, status: "error"})
    }
}