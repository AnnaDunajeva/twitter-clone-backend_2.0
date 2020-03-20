import {Router, Response, Request, NextFunction} from 'express'
import multer, { FileFilterCallback } from 'multer'
//import path from 'path'
import {getPaginatedFeed, saveTweet, getConversationPaginated, getUserTweetsPaginated, saveLikeToggle, getTweetMedia, getUserTweetImagesPaginates, getUserTweetLikesPaginates, getUserRepliesPaginated, deleteTweet} from '../controllers/tweets' //saveLikeToggle, getTweet, getTweetsbyId, getAllTweetsIds, 
import {addUser, getUserProfile, getAllUsersPaginated, updateUser, getUser, getUserAvatar, getUserBackground, getUserAvatarDefault, deleteAvatar, deleteBackground} from '../controllers/users' //getUser, getAllUsers, updateUser, getUsersByIds, getUserTweetsPaginated, getRepliesPaginated
import {login, logout, logoutAll} from '../controllers/authentication'
import {authentication} from '../middleware/authentication'
import {addFollowing, getFollowings, deleteFollowing, getFollowers} from '../controllers/followings'
import { RequestWithCustomProperties } from '../models/request'
import { TweetsInterface } from '../models/tweets'
import {IoFuncInterface} from '../models/ioFuncs'

const router = Router()

const storage = multer.memoryStorage()
const upload = multer({
    // dest: path.resolve(__dirname, '..', 'images/uploads'),
    dest: 'images/uploads',
    limits: {
        fileSize: 1000000
    },
    storage,
    fileFilter (req: RequestWithCustomProperties, file: Express.Multer.File, cb: FileFilterCallback) {
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Format not supported.'))
        }
        cb(null, true)
    }
})

export const createRouter = (io: SocketIO.Server) => {

    const sendTweetUpdate = (tweetId: number, tweet: TweetsInterface) => {
        console.log('about to send tweet update ', tweetId)
        io.to(tweetId.toString()).emit('tweet_update', tweet)
    }
    const ioFuncs: IoFuncInterface = {
        sendTweetUpdate
    }

    //router.get('/test', authentication, getUserTweetsPaginated)

    router.post('/user', addUser)
    //router.post('/users', authentication, getUsersByIds) //not very RESTful
    router.get('/user', authentication, getUserProfile)
    router.get('/user/:userId/avatar', getUserAvatar) //donno, no auth kinda sucks, but twitter doesnt have it either
    router.get('/user/:userId/avatar/default', getUserAvatarDefault) //donno, no auth kinda sucks, but twitter doesnt have it either
    router.get('/user/:userId/background', getUserBackground)
    router.delete('/user/avatar', authentication, deleteAvatar)
    router.delete('/user/background', authentication, deleteBackground)
    router.get('/users', authentication, getAllUsersPaginated) //without authed user

    // router.patch('/user', authentication, updateUser)
    router.patch('/user', authentication, upload.single('file'), updateUser, (err: Error, req: Request, res: Response, next: NextFunction) => res.status(400).json({error: err.message, status: "error"}))
    // router.delete('/user')

    router.get('/users/:userId', authentication, getUser)

    router.get('/user/feed',authentication, getPaginatedFeed)
    //router.post('/tweets', authentication, getTweetsbyId) //not very RESTful
    //router.get('/user/tweets/:tweetId', authentication, getTweet)
    router.get('/user/tweets/:tweetId/conversation', authentication, getConversationPaginated)
    router.get('/users/:userId/tweets', authentication, getUserTweetsPaginated)
    router.get('/users/:userId/tweets/media', authentication, getUserTweetImagesPaginates)
    router.get('/users/:userId/tweets/likes', authentication, getUserTweetLikesPaginates)
    router.get('/users/:userId/tweets/replies', authentication, getUserRepliesPaginated)

    router.get('/user/tweet/:tweetId/media', getTweetMedia)
    
    router.delete('/user/tweet/:tweetId', authentication, (req, res) => deleteTweet(req, res, ioFuncs))
    router.post('/user/tweet', authentication, upload.single('file'), (req: RequestWithCustomProperties, res: Response) => saveTweet(req, res, ioFuncs), (err: Error, req: Request, res: Response, next: NextFunction) => res.status(400).json({error: err.message, status: "error"}))
    // router.delete('/user/tweet/:tweetId')
    router.post('/user/tweets/like/:tweetId', authentication, (req, res)=>saveLikeToggle(req, res, ioFuncs))

    router.get('/user/followings', authentication, getFollowings)
    router.get('/user/followers', authentication, getFollowers)
   
    router.post('/user/followings/:userId', authentication, addFollowing)
    router.delete('/user/followings/:userId', authentication, deleteFollowing)

    router.post('/user/login', login)
    //maybe i dont need authentication to logOut?
    router.post('/user/logout', authentication, logout)
    router.post('/user/logoutAll', authentication, logoutAll)

    return router
}

// export default router