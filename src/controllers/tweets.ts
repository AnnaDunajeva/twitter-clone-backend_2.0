import { getRepository } from "typeorm"
import { Tweets } from "../entity/Tweets"
import { Response } from 'express'
import { RequestWithCustomProperties } from '../models/request'
import * as tweetsFunc from '../utils/tweets'
import { TweetsInterface } from "../models/tweets"
import { IoFuncInterface } from '../models/ioFuncs'
import { pick } from 'lodash'

export const saveLikeToggle = async (req: RequestWithCustomProperties, res: Response, ioFuncs: IoFuncInterface) => {
    try {
        const userId = req.userId as string
        const tweetId = parseInt(req.params.tweetId)

        if (!tweetId) {
            throw new Error('Invalid rewuest')
        }

        const tweet = await tweetsFunc.toggleTweetLike(userId, tweetId)
        
        res.status(200).json({message: "success", status: "ok", tweet: {...tweet}})

        // ioFuncs.sendTweetUpdate(tweetId, tweet)
        //cant do that because liked is for user who liked, so all tweets who are subscribed thinkthey liked not somebody else. Same with replies
        //tweet contains data related to user that modifies it, cant just broadcast this tweet like that to everybody who subscribed to it
        //maybe i should not even manipulate with this tweet that has other user info, but make another func to get tweet that i can broadcast to many users
            // - decided to just send data that was changed: ['id', 'likesCount']
        
        ioFuncs.sendTweetUpdate(tweetId, {[tweetId]: pick(tweet[tweetId], ['id', 'likesCount'])})
        //problem: if user has his account open in two different windows and toggles like from one, in the other window liked status
        //wont get updated despite count being updated
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const saveTweet = async (req: RequestWithCustomProperties, res: Response, ioFuncs: IoFuncInterface) => {
    try {
        const data = JSON.parse(req.body.tweet)
        const userId = req.userId as string
        const file = req.file?.buffer || null

        if (Object.keys(data).length === 0 && !file) {
            throw new Error('Invalid request')
        }
        
        if (file && !data.crop) {
            throw new Error('Crop options not specified.')
        }
        let parentTweet: TweetsInterface | null = null
        if (data.replyingTo) {
            data.replyingTo = parseInt(data.replyingTo) //making sure its number
            parentTweet = await tweetsFunc.getTweetsbyId(userId, [data.replyingTo])
            if (parentTweet[data.replyingTo].deleted) {
                throw new Error('Could not leave reply for deleted tweet.')
            }
        }
        const newFormatedTweet = await tweetsFunc.saveTweet(userId, data.text, data.replyingTo, file, data.crop)

        res.status(200).json({
            tweet: newFormatedTweet,
            status: "ok"
        })

        if (parentTweet) {
            const updatedParentTweet = {
                [data.replyingTo]: {
                    id: parentTweet[data.replyingTo].id,
                    repliesCount: parentTweet[data.replyingTo].repliesCount! + 1
                }
            }
            ioFuncs.sendTweetUpdate(data.replyingTo, updatedParentTweet)
        }

    } catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getTweetMedia = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const tweetId = parseInt(req.params.tweetId)

        if(!tweetId) {
            throw new Error('Invalid request')
        }

        const tweetsRepo = getRepository(Tweets)
        const tweet = await tweetsRepo.findOne({tweetId})
        if (!tweet) {
            throw new Error('Not found.')
        }

        let tweetImage = tweet.media

        res.set('Content-Type', 'image/jpeg')
        res.status(200).send(tweetImage)
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err, status: "error"})
    }
}

export const getPaginatedFeed = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string

        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const firstRequestTime = parseInt(req.query.time)
        const update = req.query.update === 'true' ? true : false

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userFeed = await tweetsFunc.getPaginatedUserFeed(userId, skip, take, firstRequestTime, getUsers, update) //{tweets: {...}, users?: {...}}
        res.status(200).json({...userFeed, status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getUserTweetsPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const user = req.params.userId
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const getParents = req.query.getParents === 'true' ? true : false
        const firstRequestTime = parseInt(req.query.time)
        const update = req.query.update === 'true' ? true : false

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userTweets = await tweetsFunc.getUserTweetsPaginated(userId, skip, take, firstRequestTime, user, getUsers, getParents, update)
        res.status(200).json({...userTweets, status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getConversationPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const parentId = parseInt(req.params.tweetId)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const getMainTweet = req.query.getMainTweet === 'true' ? true : false

        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const firstRequestTime = parseInt(req.query.time)

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const response = await tweetsFunc.getConversationPaginated(userId, skip, take, firstRequestTime, parentId, getUsers, getMainTweet)
        res.status(200).json({...response, status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getConversationUpdate = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const parentId = parseInt(req.params.tweetId)
        const getUsers = req.query.getUsers === 'true' ? true : false

        const take = parseInt(req.query.take)
        const time = parseInt(req.query.time)

        if (isNaN(take) || isNaN(time) || take === undefined || time === undefined) {
            throw new Error('missing pagination parameters')
        }

        const response = await tweetsFunc.getConversationUpdate(userId, take, time, parentId, getUsers)
        res.status(200).json({...response, status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getUserTweetImagesPaginates = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const user = req.params.userId
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const getParents = req.query.getParents === 'true' ? true : false
        const firstRequestTime = parseInt(req.query.time)
        const update = req.query.update === 'true' ? true : false

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userTweets = await tweetsFunc.getUserTweetImagesPaginates(userId,skip, take, firstRequestTime, user, getUsers, getParents, update)
        res.status(200).json({...userTweets, status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getUserTweetLikesPaginates = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const user = req.params.userId
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const firstRequestTime = parseInt(req.query.time)
        const update = req.query.update === 'true' ? true : false

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userTweets = await tweetsFunc.getUserTweetLikesPaginates(userId,skip, take, firstRequestTime, user, getUsers, update)
        res.status(200).json({...userTweets, status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getUserRepliesPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const user = req.params.userId
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const firstRequestTime = parseInt(req.query.time)
        const update = req.query.update === 'true' ? true : false

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userTweets = await tweetsFunc.getUserRepliesPaginated(userId, skip, take, firstRequestTime, user, getUsers, update)
        res.status(200).json({...userTweets, status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const deleteTweet = async (req: RequestWithCustomProperties, res: Response, ioFuncs: IoFuncInterface) => {
    try {
        const userId = req.userId as string
        const tweetId = parseInt(req.params.tweetId)
        
        const tweetToDelete = await tweetsFunc.getTweetsbyId(userId, [tweetId])
        if (tweetToDelete[tweetId].deleted) {
            throw new Error('Tweet already deleted.')
        }
        await tweetsFunc.deleteTweet(userId, tweetId)
        
        const deletedFormatedTweet = await tweetsFunc.getTweetsbyId(userId, [tweetId])

        const parentTweetId = tweetToDelete[tweetId].replyingToTweetId 
        if (parentTweetId) {
            const parentTweet = await tweetsFunc.getTweetsbyIdWithoutDeleted(userId, [parentTweetId])
            if (Object.keys(parentTweet).length !== 0) {//parent tweet might have been deleted
                const parentDataToUpdate = pick(parentTweet[parentTweetId], ['id', 'repliesCount'])
                // console.log('updating parent tweet after child delete: ', parentDataToUpdate)
                ioFuncs.sendTweetUpdate(parentTweetId, {[parentTweetId]: parentDataToUpdate})
            }
        }

        ioFuncs.sendTweetUpdate(tweetId, deletedFormatedTweet)

        res.status(200).json({message: 'success', status: "ok"})

        ioFuncs.unsubscribeFromTweet(tweetId)
        //what to do if this deleted tweet had replies?
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"}) 
    }
}

export const getTweetLikesPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string
        const tweetId = parseInt(req.params.tweetId)
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const firstRequestTime = parseInt(req.query.time)

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || isNaN(tweetId) || take === undefined || skip === undefined || firstRequestTime === undefined || tweetId === undefined) {
            throw new Error('missing pagination parameters')
        }

        const users = await tweetsFunc.getTweetLikesPaginated(userId, tweetId, skip, take, firstRequestTime)

        res.status(200).json({ users, status: "ok" })
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}