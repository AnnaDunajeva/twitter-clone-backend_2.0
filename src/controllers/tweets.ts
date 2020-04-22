import {getRepository} from "typeorm"
import {Tweets} from "../entity/Tweets"
import {Likes} from '../entity/Likes'
import {Response} from 'express' //RequestHandler
// import uuidv4 from 'uuid/v4'
// import {TweetsInterface} from '../models/tweets'
// import {formatTweet} from '../utils/helpers'
import {RequestWithCustomProperties} from '../models/request'
//import {TweetsResponse} from '../models/reponses'
import * as tweetsFunc from '../utils/tweets'
import { ExtendedTweet, TweetsInterface } from "../models/tweets"
//import * as userFunc from '../utils/users'
import sharp from 'sharp'
import {IoFuncInterface} from '../models/ioFuncs'
import {pick} from 'lodash'

export const saveLikeToggle = async (req: RequestWithCustomProperties, res: Response, ioFuncs: IoFuncInterface) => {
    try {
        // const {hasLiked} = req.body as {hasLiked: boolean}
        const userId = req.userId as string
        console.log(userId)
        const tweetId = parseInt(req.params.tweetId)

        const tweet = await tweetsFunc.getTweetsbyId(userId, [tweetId])
        if (tweet[tweetId].deleted) {
            throw new Error('Could not add like for deleted tweet.')
        }
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
        const oldLikesCount = tweet[tweetId].likesCount as number
        tweet[tweetId].likesCount = tweet[tweetId].liked ? oldLikesCount + 1 : oldLikesCount - 1

        //cant do that because liked is for user who liked, so all tweets who are subscribed thinkthey liked not somebody else. Same with replies
        //tweet contains data related to user that modifies it, cant just broadcast this tweet like that to everybody who subscribed to it
        //maybe i should not even manipulate with this tweet that has other user info, but make another func to get tweet that i can broadcast to many users
                // ioFuncs.sendTweetUpdate(tweetId, tweet)
        
        res.status(201).json({message: "success", status: "ok", tweet: {...tweet}})
        ioFuncs.sendTweetUpdate(tweetId, {[tweetId]: pick(tweet[tweetId], ['id', 'likesCount'])})
    }
    catch (err) {
        res.status(400).json({error: err.message, status: "error"})
    }
}

export const saveTweet = async (req: RequestWithCustomProperties, res: Response, ioFuncs: IoFuncInterface) => {
    try {
        const data = JSON.parse(req.body.tweet)
        console.log(data)
        const userId = req.userId as string
        const file = req.file?.buffer || null
        
        if (file && !data.crop) {
            throw new Error('Crop options not specified.')
        }
        let parentTweet: TweetsInterface | null = null
        if (data.replyingTo) {
            parentTweet = await tweetsFunc.getTweetsbyId(userId, [data.replyingTo])
            if (parentTweet[data.replyingTo].deleted) {
                throw new Error('Could not leave reply for deleted tweet.')
            }
        }

        const createdAt = Date.now()

        const tweet = { 
            userId: userId.toLowerCase(),
            text: data.text ? data.text.trim() : '',
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

        //not a good idea cause i add a lot of stuff to tweet like repleyngToUserId and stuff, pain in the ass to do it manualltyhere
        const insertedTweetRaw = insertedResult.generatedMaps[0] as ExtendedTweet
        // insertedTweetRaw.replies = []
        // insertedTweetRaw.likes = []
        // insertedTweetRaw.media = insertedTweetRaw.media ? true : false

        // console.log(tweetFromDB)

        const newFormatedTweet =  await tweetsFunc.getTweetsbyId(userId, [insertedTweetRaw.tweetId])

        res.status(201).json({
            tweet: newFormatedTweet,
            status: "ok"
        })

        if (parentTweet) {
            // const parentAuthorData = await tweetsFunc.getTweetsAuthorDataSmall([tweetFromDB.parentId!])
            // tweetFromDB.parentAuthorData = parentAuthorData[tweetFromDB.parentId!]
            // const parentTweet = await tweetsFunc.getTweetsbyIdWithoutDeleted(userId, [tweet.parentId]) //we checked before that parent is not deleted
            const updatedParentTweet = {
                [tweet.parentId]: {
                    id: parentTweet[tweet.parentId].id,
                    repliesCount: parentTweet[tweet.parentId].repliesCount! + 1
                }
            }
            ioFuncs.sendTweetUpdate(tweet.parentId, updatedParentTweet)
        }

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

export const getPaginatedFeedUpdate = async (req: RequestWithCustomProperties, res: Response) => {
    try{
        const userId = req.userId as string

        const take = parseInt(req.query.take)
        const getUsers = req.query.getUsers === 'true' ? true : false
        const firstRequestTime = parseInt(req.query.time)
        console.log(take, firstRequestTime)

        if (isNaN(take) || isNaN(firstRequestTime) || take === undefined || firstRequestTime === undefined) {
            throw new Error('missing pagination parameters')
        }

        const userFeed = await tweetsFunc.getPaginatedFeedUpdate(userId, take, firstRequestTime, getUsers) //{tweets: {...}, users?: {...}, parents?: {...}}
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
        console.log(err)
        res.status(500).json({error: err.message, status: "error"})
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
        console.log(err)
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
                console.log('updating parent tweet after child delete: ', parentDataToUpdate)
                ioFuncs.sendTweetUpdate(parentTweetId, {[parentTweetId]: parentDataToUpdate})
            }
        }

        ioFuncs.sendTweetUpdate(tweetId, deletedFormatedTweet)

        res.status(201).json({message: 'success', status: "ok"})

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

        res.status(201).json({ users, status: "ok" })
    }
    catch (err) {
        console.log(err)
        res.status(400).json({error: err.message, status: "error"})
    }
}