import {Router, Response, Request, NextFunction} from 'express'
import multer, { FileFilterCallback } from 'multer'
import {
    getPaginatedFeed, 
    saveTweet, 
    getConversationPaginated, 
    getUserTweetsPaginated, 
    saveLikeToggle, 
    getUserTweetImagesPaginates, 
    getUserTweetLikesPaginates, 
    getUserRepliesPaginated, 
    deleteTweet, 
    getConversationUpdate, 
    getTweetLikesPaginated} from '../controllers/tweets' 
import {
    getUserProfile, 
    findUserPaginated, 
    getAllUsersPaginated, 
    updateUser, 
    getUser, 
    deleteAvatar, 
    deleteBackground} from '../controllers/users' //getUser, getAllUsers, updateUser, getUsersByIds, getUserTweetsPaginated, getRepliesPaginated
import {logout} from '../controllers/authentication'
import {authentication} from '../middleware/authentication'
import {
    addFollowing, 
    getUserFollowersPaginated, 
    deleteFollowing, 
    getUserFollowingsPaginated} from '../controllers/followings'
import { RequestWithCustomProperties } from '../models/request'
import { TweetsInterface } from '../models/tweets'
import {IoFuncInterface} from '../models/ioFuncs'
import { UsersInterface } from '../models/users'

const router = Router()

const storage = multer.memoryStorage()
const upload = multer({
    dest: 'images/uploads',
    limits: {
        fileSize: 10000000 //10MB
    },
    storage,
    fileFilter (req: RequestWithCustomProperties, file: Express.Multer.File, cb: FileFilterCallback) {
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
            return cb(new Error('Format not supported.'))
        }
        cb(null, true)
    }
})

export const createRouter = (io: SocketIO.Server) => {

    const sendTweetUpdate = (tweetId: number, tweet: TweetsInterface) => {
        // console.log('about to send tweet update ', tweetId)
        io.to(tweetId.toString()).emit('tweet_update', {tweetId, tweet})
    }
    const sendUserUpdate = (userId: string, user: UsersInterface) => {
        io.to(userId).emit('user_update', {userId, user})
    }
    const unsubscribeFromTweet = (tweetId: number) => {
        // console.log('about to unsubscribe all sockets from deleted tweet')
        io.in(tweetId.toString()).clients((error: Error, socketIds: any[]) => {
            if (error) {console.log(error);}
            else {socketIds.forEach(socketId => io.sockets.connected[socketId].leave(tweetId.toString()));}
          });
          
        io.to(tweetId.toString())
    }
    const ioFuncs: IoFuncInterface = {
        sendTweetUpdate,
        sendUserUpdate,
        unsubscribeFromTweet
    }

    router.get('/user', authentication, getUserProfile)
    router.delete('/user/avatar', authentication, deleteAvatar)
    router.delete('/user/background', authentication, deleteBackground)
    router.get('/users', authentication, getAllUsersPaginated) //without authed user

    router.patch('/user', authentication, upload.single('file'), updateUser, (err: Error, req: Request, res: Response, next: NextFunction) => res.status(400).json({error: err.message, status: "error"}))

    router.get('/users/:userId', authentication, getUser)
    router.get('/users/find/:userId', authentication, findUserPaginated)

    router.get('/user/feed',authentication, getPaginatedFeed)

    router.get('/user/tweets/:tweetId/conversation', authentication, getConversationPaginated)
    router.get('/tweet/:tweetId/likes', authentication, getTweetLikesPaginated)
    router.get('/user/tweets/:tweetId/conversation/update', authentication, getConversationUpdate)
    router.get('/users/:userId/tweets', authentication, getUserTweetsPaginated)
    router.get('/users/:userId/tweets/media', authentication, getUserTweetImagesPaginates)
    router.get('/users/:userId/tweets/likes', authentication, getUserTweetLikesPaginates)
    router.get('/users/:userId/tweets/replies', authentication, getUserRepliesPaginated)

    
    router.delete('/user/tweet/:tweetId', authentication, (req, res) => deleteTweet(req, res, ioFuncs))
    router.put('/user/tweet', authentication, upload.single('file'), (req: RequestWithCustomProperties, res: Response) => saveTweet(req, res, ioFuncs), (err: Error, req: Request, res: Response, next: NextFunction) => res.status(400).json({error: err.message, status: "error"}))
    router.put('/user/tweets/like/:tweetId', authentication, (req, res)=>saveLikeToggle(req, res, ioFuncs))

    router.get('/user/:userId/followings', authentication, getUserFollowingsPaginated)
    router.get('/user/:userId/followers', authentication, getUserFollowersPaginated)
   
    router.put('/user/followings/:userId', authentication, (req, res) => addFollowing(req, res, ioFuncs))
    router.delete('/user/followings/:userId', authentication, (req, res) => deleteFollowing(req, res, ioFuncs))

    router.put('/user/logout', authentication, logout)

    return router
}

