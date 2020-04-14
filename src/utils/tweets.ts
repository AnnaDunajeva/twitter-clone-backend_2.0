import {getRepository, Brackets, SelectQueryBuilder} from "typeorm" //Brackets, SelectQueryBuilder, In
import {Tweets} from "../entity/Tweets"
import {Users} from '../entity/Users'
import {Likes} from '../entity/Likes'
// import {Followings} from '../entity/Followings'
import {smallTweetAuthorInterface, ExtendedTweet} from '../models/tweets' //TweetsInterface, 
import {smallAuthor} from '../models/users'
import {formatTweetsFromDB} from '../utils/helpers'
import * as usersFunctions from '../utils/users'
import {TweetsResponse} from '../models/reponses'
import {uniq, mapValues} from 'lodash'
//import { formatTweet } from "./helpers"

// export const getAllTweetIds = async (userId: string) => {
//     //finds all tweets related to user (user tweet Ids plus following and followers users tweet Ids)
//     //a lot of stupid code, needs revision. Not even sure it works correctly
//     const tweetsRepo = getRepository(Tweets) 
//     // const followingsRepo = getRepository(Followings)

//     console.log('getting tweet ids')

//     const userTweetIds = await getUserTweetIds(userId)

//     const followingsIds = await usersFunctions.getFollowingsIds(userId)
//     const followingTweetObjects = followingsIds.length > 0 ? await tweetsRepo.find({select: ["tweetId"], where: [{userId: In(followingsIds)}]}) : []
//     const followingTweetIds = followingTweetObjects.map(tweet => tweet.tweetId)

//     const repliesObjects = userTweetIds.length > 0 ? await tweetsRepo.find({select: ["tweetId"], where: [{parentId: In(userTweetIds)}]}) : []
//     const repliesIds = repliesObjects.map(tweet => tweet.tweetId)

//     const allTweetIds = [...userTweetIds, ...followingTweetIds, ...repliesIds]

//     // let followingsTweetsIdsObject: Tweets[] = []
//     // if (userFollowingIds.length !== 0) {
//     //     followingsTweetsIdsObject = await tweetsRepo.find({select: ["tweetId"], where: [{userId: In(userFollowingIds)}]})

//     // }
//     // const followingsTweetsIds = followingsTweetsIdsObject.map(tweet => tweet.tweetId)
    
//     // const userTweetIdsObjects = await tweetsRepo.find({select: ["tweetId"], where: [{userId: userId}]}) //[Tweets { tweetId: '87292a2c-f3c9-47cb-9daf-72371e002a77' }]
//     // const userTweetIds = userTweetIdsObjects.map(tweet => tweet.tweetId)
//     // const allUserTweetIds = [...followingsTweetsIds, ...userTweetIds]
//     // console.log(allUserTweetIds)

//     return allTweetIds
// }

export const getTweetsbyId = async (userId: string, ids: number[]) => {
    if (ids.length === 0) {
        return {}
    }
    const tweetRepo = getRepository(Tweets)
    const tweetsWithDeleted  = await tweetRepo //I have no clue what am i doing here...
    .createQueryBuilder("tweets")
    .leftJoin("tweets.likes", "likes", "likes.deletedAt is null") //need to account for deleted likes
    .leftJoin("tweets.replies", "replies", "replies.deletedAt is null") //need to accout for deleted tweets
    .where("tweets.tweetId IN (:...ids)", { ids: ids })
    // .andWhere('tweets.deletedAt is null')
    .select(['tweets', 'likes.userId', 'replies.tweetId'])
    .getMany()

    if (tweetsWithDeleted.length === 0) {
        return {}
    }

    const deletedTweets = tweetsWithDeleted
        .filter(tweet => tweet.deletedAt !== null)
        .map(tweet => ({
            tweetId: tweet.tweetId, 
            deletedAt: tweet.deletedAt
        }))//pick(tweet, ['tweetId', 'deletedAt'])
    
        const tweets = tweetsWithDeleted.filter(tweet => tweet.deletedAt === null)

    const parentTweetIds = uniq(tweets.filter(tweet => tweet.parentId !== null).map(tweet => tweet.parentId!))
    const parentAuthorData = parentTweetIds.length !== 0 ?  await getTweetsAuthorDataSmall(parentTweetIds) : {}

    const tweetsWithParentAuthorData = tweets.map(tweet => {
        const newTweet: ExtendedTweet = {
            ...tweet,
            media: tweet.media ? true : false
        }
        if (tweet.parentId) {
            newTweet.parentAuthorData = parentAuthorData[tweet.parentId]
        }
        return newTweet
    })

    const formatedTweets = formatTweetsFromDB(tweetsWithParentAuthorData, userId)
    const formatedDeletedTweets = formatTweetsFromDB(deletedTweets, userId)
    // deletedTweets.forEach(
    //     tweet => formatedTweets[tweet.tweetId] = {
    //         id: tweet.tweetId,
    //         deleted: true
    // })
    return {...formatedTweets, ...formatedDeletedTweets}
}
export const getTweetsbyIdWithoutDeleted = async (userId: string, ids: number[]) => {
    if (ids.length === 0) {
        return {}
    }
    const tweetRepo = getRepository(Tweets)
    const tweets  = await tweetRepo //I have no clue what am i doing here...
    .createQueryBuilder("tweets")
    .leftJoin("tweets.likes", "likes", "likes.deletedAt is null") //need to account for deleted likes
    .leftJoin("tweets.replies", "replies", "replies.deletedAt is null") //need to accout for deleted tweets
    .where("tweets.tweetId IN (:...ids)", { ids: ids })
    .andWhere('tweets.deletedAt is null')
    .select(['tweets', 'likes.userId', 'replies.tweetId'])
    .getMany()

    if (tweets.length === 0) {
        return {}
    }

    const parentTweetIds = uniq(tweets.filter(tweet => tweet.parentId !== null).map(tweet => tweet.parentId!))
    const parentAuthorData = parentTweetIds.length !== 0 ?  await getTweetsAuthorDataSmall(parentTweetIds) : {}

    const tweetsWithParentAuthorData = tweets.map(tweet => {
        const newTweet: ExtendedTweet = {
            ...tweet,
            media: tweet.media ? true : false
        }
        if (tweet.parentId) {
            newTweet.parentAuthorData = parentAuthorData[tweet.parentId]
        }
        return newTweet
    })

    const formatedTweets = formatTweetsFromDB(tweetsWithParentAuthorData, userId)

    return formatedTweets
}

// export const getTweetsByIdWithOptionalParameters = async (ids: string[], getUsers: boolean, getParents: boolean) => {
//     console.log('getTweetsbyId ', ids)
//     const tweetRepo = getRepository(Tweets)
//     const tweets  = await tweetRepo //I have no clue what am i doing here...
//     .createQueryBuilder("tweets")
//     .leftJoin("tweets.likes", "likes")
//     .leftJoin("tweets.replies", "replies")
//     .where("tweets.tweetId IN (:...ids)", { ids: ids })
//     .select(['tweets', 'likes.userId', 'replies.tweetId'])
//     .getMany()

//     const formatedTweets = formatTweetsFromDB(tweets)

//     const response: TweetsResponse = {tweets: formatedTweets}
//     //also need to add parent tweet for each tweet if it has one...
//     if (getParents) {
//         const parentTweetIds = tweets.filter(tweet => tweet.parentId !== null).map(tweet => tweet.parentId!)
//         const parentTweets = parentTweetIds.length > 0 ? await getTweetsbyId(parentTweetIds) : {}
//         response.parents = parentTweets
//     }
//     if (getUsers) {
//         const userIds = tweets.map(tweet => tweet.userId) 
//         const users = await usersFunctions.getUsersByIds(userIds)
//         response.users = users
//     }

//     return response
// }

// export const getUserTweetIds = async (userId: string) => {
//     const tweetsRepo = getRepository(Tweets)
//     const tweets = await tweetsRepo.find({where: {userId}, select: ['tweetId']})
//     const tweetIds = tweets.map(tweet => tweet.tweetId)
//     return tweetIds
// }

export const getTweetsAuthorDataSmall = async (tweetIds: number[]) => {
    //super stupid code, need something smarter, 2 request to DB, come on...
    if (tweetIds.length === 0) {
        return {}
    }
    const tweetsRepo = getRepository(Tweets) 
    const tweetsAuthors = await tweetsRepo
    .createQueryBuilder('tweets')
    .select(['tweets.tweetId', 'tweets.userId'])
    .where("tweets.tweetId IN (:...tweetIds)", { tweetIds })
    .andWhere('tweets.deletedAt is null')
    .getMany()

    if (tweetsAuthors.length === 0) {
        return {}
    }
    const tweetsAuthorsUserName = uniq(tweetsAuthors.map(tweet => tweet.userId))

    const usersRepo = getRepository(Users)
    const tweetsAuthorsName = await usersRepo
    .createQueryBuilder('users')
    .select(['users.userId', 'users.firstName', 'users.lastName'])
    .where('users.userId IN (:...userIds)', {userIds: tweetsAuthorsUserName})
    //dont need to check deletedAt as all deleted accounts tweets will be marked deleted 
    .getMany()

    const tweetsAuthorsNameObj: smallAuthor = {}
    tweetsAuthorsName.forEach((author) => {
        tweetsAuthorsNameObj[author.userId] = {...author}
    })

    const tweetsAuthorDataSmall = tweetsAuthors.map(tweet => ({...tweet, ...tweetsAuthorsNameObj[tweet.userId]}))
    const tweetsAuthorDataSmallObj: smallTweetAuthorInterface = {}
    tweetsAuthorDataSmall.forEach(tweet => {
        tweetsAuthorDataSmallObj[tweet.tweetId] = {...tweet}
    })

    console.log('tweetsAuthorDataSmallObj ', tweetsAuthorDataSmallObj)
    return tweetsAuthorDataSmallObj
}

export const getPaginatedUserFeed = async (userId: string, skip: number, take: number, firstRequestTime: number, getUsers: boolean, getParents: boolean) => {
    const tweetsRepo = getRepository(Tweets) 
    
    const followingsIds = await usersFunctions.getFollowingsIds(userId)

    const tweets = await tweetsRepo
    .createQueryBuilder('tweets')
    .leftJoin("tweets.likes", "likes", "likes.deletedAt is null")
    .leftJoin("tweets.replies", "replies", "replies.deletedAt is null")
    .where(new Brackets(qb => {
        qb.where((qb: SelectQueryBuilder<Tweets>) => {
            const subQuery = qb.subQuery()
                .from(Tweets, "userTweets")
                .select("userTweets.tweetId")
                .where("userTweets.userId = :userId", {userId})
                .andWhere('userTweets.deletedAt is null')
                .getQuery()
                return "tweets.parentId IN " + subQuery
        })
        .orWhere("tweets.userId IN (:...userIds)", { userIds: [userId, ...followingsIds] })
    }))
    .andWhere('tweets.deletedAt is null')
    .andWhere(`tweets.createdAt < to_timestamp(${firstRequestTime/1000})`)
    .select(['tweets', 'likes.userId', 'replies.tweetId'])
    .orderBy("tweets.createdAt", "DESC")
    .printSql()
    .take(take)
    .skip(skip)
    .getMany()

    // console.log(tweets)

    if (tweets.length === 0) {
        return {
            tweets: {},
            users: {}
        }
    }

    const parentTweetIds = uniq(tweets.filter(tweet => tweet.parentId !== null).map(tweet => tweet.parentId!))
    const parentAuthorData = parentTweetIds.length !== 0 ?  await getTweetsAuthorDataSmall(parentTweetIds) : {}

    const tweetsWithParentAuthorData = tweets.map(tweet => {
        const newTweet: ExtendedTweet = {
            ...tweet,
            sortindex: Date.parse(tweet.createdAt),
            media: tweet.media ? true : false
        }
        if (tweet.parentId) {
            newTweet.parentAuthorData = parentAuthorData[tweet.parentId]
        }
        return newTweet
    })

    const formatedTweets = formatTweetsFromDB(tweetsWithParentAuthorData, userId)

    const response: TweetsResponse = {tweets: formatedTweets, users: {}}

    if (getUsers) {
        const userIds = uniq(tweets.map(tweet => tweet.userId))
        const users = await usersFunctions.getUsersByIds(userId, userIds)
        response.users = users
    }
    if (getParents) {
        const parentTweets = parentTweetIds.length > 0 ? await getTweetsbyId(userId, parentTweetIds) : {}
        response.parents = parentTweets
    }

    return response
}

export const getPaginatedFeedUpdate = async (userId: string, take: number, firstRequestTime: number, getUsers: boolean) => {
    const tweetsRepo = getRepository(Tweets) 
    
    const followingsIds = await usersFunctions.getFollowingsIds(userId)

    const tweets = await tweetsRepo
    .createQueryBuilder('tweets')
    .leftJoin("tweets.likes", "likes", "likes.deletedAt is null")
    .leftJoin("tweets.replies", "replies", "replies.deletedAt is null")
    .where(new Brackets(qb => {
        qb.where((qb: SelectQueryBuilder<Tweets>) => {
            const subQuery = qb.subQuery()
                .from(Tweets, "userTweets")
                .select("userTweets.tweetId")
                .where("userTweets.userId = :userId", {userId})
                .andWhere('userTweets.deletedAt is null')
                .getQuery()
                return "tweets.parentId IN " + subQuery
        })
        .orWhere("tweets.userId IN (:...userIds)", { userIds: [userId, ...followingsIds] })
    }))
    .andWhere('tweets.deletedAt is null')
    .andWhere(`tweets.createdAt > to_timestamp(${firstRequestTime/1000})`)
    .select(['tweets', 'likes.userId', 'replies.tweetId'])
    .orderBy("tweets.createdAt", "ASC")
    .printSql()
    .take(take)
    .getMany()

    // console.log(tweets)

    if (tweets.length === 0) {
        return {
            tweets: {},
            users: {}
        }
    }

    const parentTweetIds = uniq(tweets.filter(tweet => tweet.parentId !== null).map(tweet => tweet.parentId!))
    const parentAuthorData = parentTweetIds.length !== 0 ?  await getTweetsAuthorDataSmall(parentTweetIds) : {}

    const tweetsWithParentAuthorData = tweets.map(tweet => {
        const newTweet: ExtendedTweet = {
            ...tweet,
            sortindex: Date.parse(tweet.createdAt),
            media: tweet.media ? true : false
        }
        if (tweet.parentId) {
            newTweet.parentAuthorData = parentAuthorData[tweet.parentId]
        }
        return newTweet
    })

    const formatedTweets = formatTweetsFromDB(tweetsWithParentAuthorData, userId)

    const response: TweetsResponse = {tweets: formatedTweets, users: {}}

    if (getUsers) {
        const userIds = uniq(tweets.map(tweet => tweet.userId))
        const users = await usersFunctions.getUsersByIds(userId, userIds)
        response.users = users
    }

    return response
}

export const getUserTweetsPaginated = async (userId: string, skip: number, take: number, firstRequestTime: number, user: string, getUsers: boolean, getParents: boolean) => {
    const tweetsRepo = getRepository(Tweets) 
    
    const tweets = await tweetsRepo
    .createQueryBuilder('tweets')
    .leftJoin("tweets.likes", "likes", "likes.deletedAt is null")
    .leftJoin("tweets.replies", "replies", "replies.deletedAt is null")
    .where("tweets.userId = :userId", {userId: user})
    .andWhere("tweets.parentId is null")
    .andWhere('tweets.deletedAt is null')
    .andWhere(`tweets.createdAt < to_timestamp(${firstRequestTime/1000})`)
    .select(['tweets', 'likes.userId', 'replies.tweetId'])
    .orderBy("tweets.createdAt", "DESC")
    .take(take)
    .skip(skip)
    .getMany()

    if (tweets.length === 0) {
        return {
            tweets: {},
            users: {}
        }
    }

    const parentTweetIds = uniq(tweets.filter(tweet => tweet.parentId !== null).map(tweet => tweet.parentId!))
    const parentAuthorData = parentTweetIds.length !== 0 ?  await getTweetsAuthorDataSmall(parentTweetIds) : {}

    const tweetsWithParentAuthorData = tweets.map(tweet => {
        const newTweet: ExtendedTweet = {
            ...tweet,
            sortindex: Date.parse(tweet.createdAt),
            media: tweet.media ? true : false
        }
        if (tweet.parentId) {
            newTweet.parentAuthorData = parentAuthorData[tweet.parentId]
        }
        return newTweet
    })

    const formatedTweets = formatTweetsFromDB(tweetsWithParentAuthorData, userId)

    const response: TweetsResponse = {tweets: formatedTweets, users: {}}

    if (getUsers) {
        const userIds = uniq(tweets.map(tweet => tweet.userId))
        const users = await usersFunctions.getUsersByIds(userId, userIds)
        response.users = users
    }
    if (getParents) {
        const parentTweets = parentTweetIds.length > 0 ? await getTweetsbyId(userId, parentTweetIds) : {}
        response.parents = parentTweets
    }

    return response
}

export const getConversationPaginated = async (userId: string, skip: number, take: number, firstRequestTime: number, parentId: number, getUsers: boolean, getMainTweet: boolean) => {
    const tweetsRepo = getRepository(Tweets) 

    let mainTweet =  await getTweetsbyId(userId, [parentId]) //we want to know if it was deleted, that why i dont use getTweetsByIdWithoutDeleted
    if (Object.keys(mainTweet).length === 0) {
        return {
            tweets: {},
            users: {}
        }
    }
    mainTweet[parentId].type = 'main tweet'

    const parentUserId = mainTweet[parentId].user as string
    const mainTweetAuthor = mainTweet[parentId].deleted ? undefined : await usersFunctions.getUsersByIds(userId, [parentUserId])
    console.log('main tweet author: ', mainTweetAuthor)


    if (!mainTweet.deleted && mainTweet[parentId].repliesCount === 0) {
        return {
            tweets: {...mainTweet},
            users: {...mainTweetAuthor}
        }
    }

    const replies = await tweetsRepo
    .createQueryBuilder('tweets')
    .leftJoin("tweets.likes", "likes", "likes.deletedAt is null")
    .leftJoin("tweets.replies", "replies", "replies.deletedAt is null")
    .where("tweets.parentId = :parentId", {parentId})
    .andWhere('tweets.deletedAt is null')
    .andWhere(`tweets.createdAt < to_timestamp(${firstRequestTime/1000})`)
    .select(['tweets', 'likes.userId', 'replies.tweetId'])
    .orderBy("tweets.createdAt", "DESC")
    .take(take)
    .skip(skip)
    .getMany()

    const tweetsWithParentAuthorData: ExtendedTweet[] = replies.map(tweet => ({
        ...tweet,
        sortindex: Date.parse(tweet.createdAt),
        type: 'reply',
        media: tweet.media ? true : false,
        parentAuthorData: !mainTweetAuthor ? undefined : {
            tweetId: parentId,
            name: `${mainTweetAuthor[parentUserId].firstName } ${mainTweetAuthor[parentUserId].lastName}`,
            userId: mainTweetAuthor[parentUserId].userId
        }
    }))
    const formatedTweets = formatTweetsFromDB(tweetsWithParentAuthorData, userId)

    const response: TweetsResponse = {tweets: {...formatedTweets}, users: {}}

    if (getUsers) {
        const userIds = uniq(replies.map(tweet => tweet.userId))
        const users = await usersFunctions.getUsersByIds(userId, userIds)
        response.users = users
    }
    if (getMainTweet) {
        response.tweets = {...response.tweets, ...mainTweet}
        response.users = {...response.users, ...mainTweetAuthor}
    }

    return response
}

export const getConversationUpdate = async (userId: string, take: number, time: number, parentId: number, getUsers: boolean) => {
    const tweetsRepo = getRepository(Tweets) 

    const replies = await tweetsRepo
    .createQueryBuilder('tweets')
    .leftJoin("tweets.likes", "likes", "likes.deletedAt is null")
    .leftJoin("tweets.replies", "replies", "replies.deletedAt is null")
    .where("tweets.parentId = :parentId", {parentId})
    .andWhere('tweets.deletedAt is null')
    .andWhere(`tweets.createdAt > to_timestamp(${time/1000})`)
    .select(['tweets', 'likes.userId', 'replies.tweetId'])
    .orderBy("tweets.createdAt", "ASC")
    .take(take)
    .getMany()

    const parentAuthorData = await getTweetsAuthorDataSmall([parentId])

    const tweetsWithParentAuthorData = replies.map(tweet => ({
        ...tweet,
        sortindex: Date.parse(tweet.createdAt),
        media: tweet.media ? true : false,
        type: 'reply',
        parentAuthorData: parentAuthorData[parentId]
    }))

    const formatedTweets = formatTweetsFromDB(tweetsWithParentAuthorData, userId)

    const response: TweetsResponse = {tweets: {...formatedTweets}, users: {}}

    if (getUsers) {
        const userIds = uniq(replies.map(tweet => tweet.userId))
        const users = await usersFunctions.getUsersByIds(userId, userIds)
        response.users = users
    }
    console.log('replies response ', response)
    return response
}

export const getUserTweetImagesPaginates = async (userId: string, skip: number, take: number, firstRequestTime: number, user: string, getUsers: boolean, getParents: boolean) => {
    const tweetsRepo = getRepository(Tweets) 
    
    const tweets = await tweetsRepo
    .createQueryBuilder('tweets')
    .leftJoin("tweets.likes", "likes", "likes.deletedAt is null")
    .leftJoin("tweets.replies", "replies", "replies.deletedAt is null")
    .where("tweets.userId = :userId", {userId: user})
    .andWhere(`tweets.media IS NOT NULL`)
    .andWhere('tweets.parentId IS NULL')
    .andWhere('tweets.deletedAt is null')
    .andWhere(`tweets.createdAt < to_timestamp(${firstRequestTime/1000})`)
    .select(['tweets', 'likes.userId', 'replies.tweetId'])
    .orderBy("tweets.createdAt", "DESC")
    .take(take)
    .skip(skip)
    .getMany()

    if (tweets.length === 0) {
        return {
            tweets: {},
            users: {}
        }
    }

    const parentTweetIds = uniq(tweets.filter(tweet => tweet.parentId !== null).map(tweet => tweet.parentId!))
    const parentAuthorData = parentTweetIds.length !== 0 ?  await getTweetsAuthorDataSmall(parentTweetIds) : {}

    const tweetsWithParentAuthorData = tweets.map(tweet => {
        const newTweet: ExtendedTweet = {
            ...tweet,
            sortindex: Date.parse(tweet.createdAt),
            media: tweet.media ? true : false
        }
        if (tweet.parentId) {
            newTweet.parentAuthorData = parentAuthorData[tweet.parentId]
        }
        return newTweet
    })

    const formatedTweets = formatTweetsFromDB(tweetsWithParentAuthorData, userId)

    const response: TweetsResponse = {tweets: formatedTweets, users: {}}

    if (getUsers) {
        const userIds = uniq(tweets.map(tweet => tweet.userId))
        const users = await usersFunctions.getUsersByIds(userId, userIds)
        response.users = users
    }
    if (getParents) {
        const parentTweets = parentTweetIds.length > 0 ? await getTweetsbyId(userId, parentTweetIds) : {}
        response.parents = parentTweets
    }

    return response
}

export const getUserTweetLikesPaginates = async (userId: string, skip: number, take: number, firstRequestTime: number, user: string, getUsers: boolean) => {
    const likesRepo = getRepository(Likes)
    const likes = await likesRepo
    .createQueryBuilder('likes')
    .select(['likes.tweetId', 'likes.createdAt'])
    .where('likes.userId = :userId', {userId: user})
    .andWhere(`likes.createdAt < to_timestamp(${firstRequestTime/1000})`)
    .andWhere('likes.deletedAt is null')
    .orderBy("likes.createdAt", "DESC")
    .take(take)
    .skip(skip)
    .getMany()
    
    if (likes.length === 0) {
        return {
            tweets: {},
            users: {}
        }
    }

    const likedTweetIds = likes.map(like => like.tweetId)

    const likedTweets = await getTweetsbyIdWithoutDeleted(userId, likedTweetIds)
    const likedTweetIdsWithoutDeleted = Object.keys(likedTweets)
    if (likedTweetIdsWithoutDeleted.length === 0) {
        return {
            tweets: {},
            users: {}
        }
    }
    const likedTweetsWithSortindex = mapValues(likedTweets, (tweet)=>({...tweet, sortindex: Date.parse(likes.find((like)=>like.tweetId === tweet.id)!.createdAt)}))

    const response: TweetsResponse = {tweets: likedTweetsWithSortindex, users: {}}

    if (getUsers) {
        const userIds = uniq(likedTweetIdsWithoutDeleted.map(tweetId => likedTweets[tweetId].user)) as string[]
        const users = await usersFunctions.getUsersByIds(userId, userIds)
        response.users = users
    }

    return response
}

export const getUserRepliesPaginated = async (userId: string, skip: number, take: number, firstRequestTime: number, user: string, getUsers: boolean) => {
    const tweetsRepo = getRepository(Tweets) 
    
    const tweets = await tweetsRepo
    .createQueryBuilder('tweets')
    .leftJoin("tweets.likes", "likes", "likes.deletedAt is null") //nedd also to account for deleted likes
    .leftJoin("tweets.replies", "replies", "replies.deletedAt is null") //nedd also to account for deleted tweets
    .where("tweets.userId = :userId", {userId: user})
    .andWhere("tweets.parentId is not null")
    .andWhere('tweets.deletedAt is null')
    .andWhere(`tweets.createdAt < to_timestamp(${firstRequestTime/1000})`)
    .select(['tweets', 'likes.userId', 'replies.tweetId'])
    .orderBy("tweets.createdAt", "DESC")
    .take(take)
    .skip(skip)
    .getMany()

    if (tweets.length === 0) {
        return {
            tweets: {},
            users: {}
        }
    }

    const parentTweetIds = uniq(tweets.filter(tweet => tweet.parentId !== null).map(tweet => tweet.parentId!))
    const parentAuthorData = parentTweetIds.length !== 0 ?  await getTweetsAuthorDataSmall(parentTweetIds) : {}

    const tweetsWithParentAuthorData = tweets.map(tweet => {
        const newTweet: ExtendedTweet = {
            ...tweet,
            sortindex: Date.parse(tweet.createdAt),
            media: tweet.media ? true : false
        }
        if (tweet.parentId) {
            newTweet.parentAuthorData = parentAuthorData[tweet.parentId]
        }
        return newTweet
    })

    const formatedTweets = formatTweetsFromDB(tweetsWithParentAuthorData, userId)

    const response: TweetsResponse = {tweets: formatedTweets, users: {}}

    if (getUsers) {
        const userIds = uniq(tweets.map(tweet => tweet.userId))
        const users = await usersFunctions.getUsersByIds(userId, userIds)
        response.users = users
    }

    return response
}

export const deleteTweet = async (userId: string, tweetId: number) => {
    const tweetToDelete = await getTweetsbyIdWithoutDeleted(userId, [tweetId])
    if (!tweetToDelete[tweetId]) {
        return; //should i notify user that tweet does not exist?
    }
    if (tweetToDelete[tweetId].user !== userId) {
        throw new Error('Unathorized operation')
    }
    const updateData = {deletedAt: () => `to_timestamp(${Date.now()/1000})`}
    await getRepository(Tweets)
    .createQueryBuilder('tweets')
    .update()
    .set(updateData)
    .where("tweetId = :tweetId", { tweetId })
    .andWhere("userId =:userId", {userId})
    .execute();

    await getRepository(Likes)
    .createQueryBuilder('likes')
    .update()
    .set(updateData)
    .where("tweetId = :tweetId", { tweetId })
    .execute();
}

export const getTweetLikesPaginated = async (userId: string, tweetId: number, skip: number, take: number, firstRequestTime: number) => {
    const likesRepo = getRepository(Likes) 
    const likes = await likesRepo
    .createQueryBuilder('likes')
    .where("likes.tweetId = :tweetId", {tweetId})
    .andWhere('likes.deletedAt is null')
    .andWhere(`likes.createdAt < to_timestamp(${firstRequestTime/1000})`)
    .select(['likes.userId'])
    .orderBy("likes.createdAt", "DESC")
    .take(take)
    .skip(skip)
    .getMany()

    if (likes.length === 0) {
        return {
            users: {}
        }
    }

    const userIds = likes.map(like => like.userId)

    const users = await usersFunctions.getUsersByIds(userId, userIds)

    return users
    
}