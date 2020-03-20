import {getRepository} from "typeorm"
import {Tweets} from "../entity/Tweets"
import {Likes} from '../entity/Likes'
import {Response} from 'express' //RequestHandler
// import uuidv4 from 'uuid/v4'
// import {TweetsInterface} from '../models/tweets'
import {formatTweet} from '../utils/helpers'
import {RequestWithCustomProperties} from '../models/request'
//import {TweetsResponse} from '../models/reponses'
import * as tweetsFunc from '../utils/tweets'
import { ExtendedTweet } from "../models/tweets"
//import { ExtendedTweet } from "../models/tweets"
//import * as userFunc from '../utils/users'
import sharp from 'sharp'

export const saveLikeToggle = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        // const {hasLiked} = req.body as {hasLiked: boolean}
        const userId = req.userId as string
        console.log(userId)
        const tweetId = parseInt(req.params.tweetId)

        const tweet = await tweetsFunc.getTweetsbyId(userId, [tweetId])
        const createdAt = Date.now()

        if (!tweet[tweetId].liked) {
            const like = { 
                userId: userId.toLowerCase(),
                tweetId,
                createdAt: () => `to_timestamp(${createdAt/1000})` //postgres func to_timestamp accepts unix time in sec
            }
            await getRepository(Likes) 
            .createQueryBuilder('likes')
            .insert()
            .values(like)
            .execute();
            // const like  = new Likes()
            // like.userId = userId
            // like.tweetId = tweetId
            // like.createdAt = `to_timestamp(${Date.now()/1000})` //postgres func to_timestamp accepts unix time in sec
            // await getRepository(Likes).save(like)
                
        } else {
            await getRepository(Likes)
            .createQueryBuilder('likes')
            .delete()
            .where("userId = :userId", { userId })
            .andWhere('tweetId = :tweetId', { tweetId })
            .execute();
        } 

        tweet[tweetId].liked = !tweet[tweetId].liked
        tweet[tweetId].likesCount = tweet[tweetId].liked ? tweet[tweetId].likesCount as number + 1 : tweet[tweetId].likesCount as number - 1

        res.status(201).json({message: "success", status: "ok", tweet: {...tweet}})
    }
    catch (err) {
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const saveTweet = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        // throw new Error('error check')
        const data = JSON.parse(req.body.tweet)
        console.log(data)
        const userId = req.userId as string
        const file = req.file?.buffer || null
        
        if (file && !data.crop) {
            throw new Error('Crop options not specified.')
        }
        const createdAt = Date.now()

        const tweet = { 
            userId: userId.toLowerCase(),
            text: data.text,
            parentId: data.replyingTo ? data.replyingTo : null,
            media: file ? await sharp(file).extract({left: Math.round(data.crop.x), top: Math.round(data.crop.y), width: Math.round(data.crop.width), height: Math.round(data.crop.height)}).resize({width: 700, height: 700}).jpeg().toBuffer() : null,
            createdAt: () => `to_timestamp(${createdAt/1000})` //postgres func to_timestamp accepts unix time in sec
        }

    
        const insertedResult = await getRepository(Tweets) 
            .createQueryBuilder('tweets')
            .insert()
            .values(tweet)
            .returning(['tweetId', 'userId','text', 'createdAt', 'parentId', 'media'])
            .execute();

        const tweetFromDB = insertedResult.generatedMaps[0] as ExtendedTweet
        tweetFromDB.replies = []
        tweetFromDB.likes = []
        tweetFromDB.media = tweetFromDB.media ? true : false

        console.log(tweetFromDB)

        if (tweet.parentId) {
            const parentAuthorData = await tweetsFunc.getTweetsAuthorDataSmall([tweetFromDB.parentId!])
            tweetFromDB.parentAuthorData = parentAuthorData[tweetFromDB.parentId!]
        }

        res.status(201).json({
            tweet: {
                [tweetFromDB.tweetId]: formatTweet(tweetFromDB, userId)
            },
            status: "ok"
        })

    } catch (err) {
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const getTweetMedia = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const tweetId = parseInt(req.params.tweetId)

        const tweetsRepo = getRepository(Tweets)
        const tweet = await tweetsRepo.findOne({tweetId})
        if (!tweet) {
            throw new Error('Not found.')
        }

        let tweetImage = tweet.media

        res.set('Content-Type', 'image/jpeg')
        res.status(201).send(tweetImage)
    }
    catch (err) {
        res.status(400).json({error: err, status: "error"})
    }
}
// export const getAllTweets = async (req: RequestWithCustomProperties, res: Response) => { //implementation using relations
//     try {
//         const userId = req.userId as string
//         const tweetIds = await tweets.getAllTweetIds(userId)
        
//         const formatedTweets = tweetIds.length > 0 ? await tweets.getTweetsbyId(tweetIds) : {}

//         res.status(201).json({ tweets: formatedTweets })
//     } catch (err) {
//         res.status(500).json({error: err})
//     }
// }

// export const getTweet: RequestHandler = async (req, res) => {
//     try {
//         const tweetId = req.params.tweetId
//         const getParents = req.query.getParents === 'true' ? true : false
//         const getUsers = req.query.getUsers === 'true' ? true : false

//         const tweetResponse = await tweets.getTweetsByIdWithOptionalParameters([tweetId], getUsers, getParents)

//         // const tweet = await tweets.getTweetsbyId([tweetId])

//         // const response: TweetsResponse = {tweets: tweet}

//         // if (getParent) {
//         //     const parentId = tweet[tweetId].replyingTo
//         //     const parent = parentId ? await tweets.getTweetsbyId([parentId]) : {}
//         //     response.parents = parent
//         // } 
//         // if (getUser) {
//         //     const userId = tweet[tweetId].author
//         //     const user = await userFunc.getUsersByIds([userId])
//         //     response.users = user
//         // }
//         res.status(201).json(tweetResponse)
//     }
//     catch (err) {
//         res.status(500).json({error: err})
//     }
// }

// export const getUsertweets = async (req: RequestWithCustomProperties, res: Response) => {
//     try {
//         // const userId = req.userId as string
//         const userId = req.params.userId
//         const userTweetIds = await tweets.getUserTweetIds(userId)
//         const userTweets = await tweets.getTweetsbyId(userTweetIds)

//         res.status(201).json({ tweets: userTweets })
//     } catch (err) {
//         res.status(500).json({error: err})
//     }
// }

// export const getTweetsbyId = async (req: RequestWithCustomProperties, res: Response) => { //implementation using relations
//     try {
//         const tweetIds = req.body.tweets as string[]
//         console.log(tweetIds)
//         const formatedTweets = tweetIds.length > 0 ? await tweets.getTweetsbyId(tweetIds) : {}

//         res.status(201).json({ tweets: formatedTweets })
//     } catch (err) {
//         res.status(500).json({error: err})
//     }
// }

// export const getAllTweetsIds = async (req: RequestWithCustomProperties, res: Response) => {
//     try {
//         const userId = req.userId as string
//         const tweetIds = await tweets.getAllTweetIds(userId)
        
//         res.status(201).json({ tweets: tweetIds })
//     } catch (err) {
//         res.status(500).json({error: err})
//     }
// }

export const getPaginatedFeed = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string

        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const getParents = req.query.getParents === 'true' ? true : false
        const firstRequestTime = parseInt(req.query.time)
        console.log(skip, take, firstRequestTime)

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userFeed = await tweetsFunc.getPaginatedUserFeed(userId, skip, take, firstRequestTime, getUsers, getParents) //{tweets: {...}, users?: {...}, parents?: {...}}
        res.status(201).json({...userFeed, status: "ok"})
    }
    catch(err) {
        console.log(err)
        res.status(500).json({error: err.message, status: "error"})
    }
}

export const getUserTweetsPaginated = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        console.log('inside getUserTweetsPaginated')
        const userId = req.userId as string
        const user = req.params.userId
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const getParents = req.query.getParents === 'true' ? true : false
        const firstRequestTime = parseInt(req.query.time)
        console.log(take, skip, firstRequestTime)

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userTweets = await tweetsFunc.getUserTweetsPaginated(userId, skip, take, firstRequestTime, user, getUsers, getParents)
        res.status(201).json({...userTweets, status: "ok"})
    }
    catch(err) {
        res.status(500).json({error: err.message, status: "error"})
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
        console.log(skip, take, firstRequestTime)

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const response = await tweetsFunc.getConversationPaginated(userId, skip, take, firstRequestTime, parentId, getUsers, getMainTweet)
        res.status(201).json({...response, status: "ok"})
    }
    catch(err) {
        res.status(500).json({error: err.message, status: "error"})
    }
}

export const getUserTweetImagesPaginates = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        console.log('inside getUserTweetImagesPaginates')
        const userId = req.userId as string
        const user = req.params.userId
        const take = parseInt(req.query.take)
        const skip = parseInt(req.query.skip)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const getParents = req.query.getParents === 'true' ? true : false
        const firstRequestTime = parseInt(req.query.time)
        console.log(take, skip, firstRequestTime)

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userTweets = await tweetsFunc.getUserTweetImagesPaginates(userId,skip, take, firstRequestTime, user, getUsers, getParents)
        res.status(201).json({...userTweets, status: "ok"})
    }
    catch(err) {
        res.status(500).json({error: err.message, status: "error"})
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
        console.log(take, skip, firstRequestTime)

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userTweets = await tweetsFunc.getUserTweetLikesPaginates(userId,skip, take, firstRequestTime, user, getUsers)
        res.status(201).json({...userTweets, status: "ok"})
    }
    catch(err) {
        res.status(500).json({error: err.message, status: "error"})
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
        console.log(take, skip, firstRequestTime)

        if (isNaN(take) || isNaN(skip) || isNaN(firstRequestTime) || take === undefined || skip === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userTweets = await tweetsFunc.getUserRepliesPaginated(userId, skip, take, firstRequestTime, user, getUsers)
        res.status(201).json({...userTweets, status: "ok"})
    }
    catch(err) {
        res.status(500).json({error: err.message, status: "error"})
    }
}

export const deleteTweet = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        const tweetId = parseInt(req.params.tweetId)
        await tweetsFunc.deleteTweet(userId, tweetId)

        res.status(201).json({message: 'success', status: "ok"})
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"}) 
    }
}