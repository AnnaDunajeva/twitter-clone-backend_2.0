import {Router, Response, Request, NextFunction} from 'express'
import multer, { FileFilterCallback } from 'multer'
//import path from 'path'
import {getPaginatedFeed, getPaginatedFeedUpdate, saveTweet, getConversationPaginated, getUserTweetsPaginated, saveLikeToggle, getTweetMedia, getUserTweetImagesPaginates, getUserTweetLikesPaginates, getUserRepliesPaginated, deleteTweet, getConversationUpdate} from '../controllers/tweets' //saveLikeToggle, getTweet, getTweetsbyId, getAllTweetsIds, 
import {addUser, getUserProfile, getAllUsersPaginated, updateUser, getUser, getUserAvatar, getUserBackground, getUserAvatarDefault, deleteAvatar, deleteBackground} from '../controllers/users' //getUser, getAllUsers, updateUser, getUsersByIds, getUserTweetsPaginated, getRepliesPaginated
import {login, logout, verifyUserEmail, generateAndSendResetPasswordLink, resetPassword} from '../controllers/authentication'
import {authentication} from '../middleware/authentication'
import {addFollowing, getUserFollowersPaginated, deleteFollowing, getUserFollowingsPaginated} from '../controllers/followings'
import { RequestWithCustomProperties } from '../models/request'
import { TweetsInterface } from '../models/tweets'
import {IoFuncInterface} from '../models/ioFuncs'
import { UsersInterface } from '../models/users'

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
        // console.log('about to send tweet update ', tweetId)
        io.to(tweetId.toString()).emit('tweet_update', {tweetId, tweet})
    }
    const sendUserUpdate = (userId: string, user: UsersInterface) => {
        io.to(userId).emit('user_update', {userId, user})
    }
    const unsubscribeFromTweet = (tweetId: number) => {
        console.log('about to unsubscribe all sockets from deleted tweet')
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

    //router.get('/test', authentication, getUserTweetsPaginated)

    router.post('/user', addUser)

    router.get('/identity/verify/:token', verifyUserEmail)
    router.post('/identity/getResetPasswordLink', generateAndSendResetPasswordLink)
    router.post('/identity/resetPassword/:token', resetPassword)

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
    router.get('/user/feed/update', authentication, getPaginatedFeedUpdate)
    //router.post('/tweets', authentication, getTweetsbyId) //not very RESTful
    //router.get('/user/tweets/:tweetId', authentication, getTweet)
    router.get('/user/tweets/:tweetId/conversation', authentication, getConversationPaginated)
    router.get('/user/tweets/:tweetId/conversation/update', authentication, getConversationUpdate)
    router.get('/users/:userId/tweets', authentication, getUserTweetsPaginated)
    router.get('/users/:userId/tweets/media', authentication, getUserTweetImagesPaginates)
    router.get('/users/:userId/tweets/likes', authentication, getUserTweetLikesPaginates)
    router.get('/users/:userId/tweets/replies', authentication, getUserRepliesPaginated)

    router.get('/user/tweet/:tweetId/media', getTweetMedia)
    
    router.delete('/user/tweet/:tweetId', authentication, (req, res) => deleteTweet(req, res, ioFuncs))
    router.post('/user/tweet', authentication, upload.single('file'), (req: RequestWithCustomProperties, res: Response) => saveTweet(req, res, ioFuncs), (err: Error, req: Request, res: Response, next: NextFunction) => res.status(400).json({error: err.message, status: "error"}))
    // router.delete('/user/tweet/:tweetId')
    router.post('/user/tweets/like/:tweetId', authentication, (req, res)=>saveLikeToggle(req, res, ioFuncs))

    router.get('/user/:userId/followings', authentication, getUserFollowingsPaginated)
    router.get('/user/:userId/followers', authentication, getUserFollowersPaginated)
   
    router.post('/user/followings/:userId', authentication, (req, res) => addFollowing(req, res, ioFuncs))
    router.delete('/user/followings/:userId', authentication, (req, res) => deleteFollowing(req, res, ioFuncs))

    router.post('/user/login', login)
    //maybe i dont need authentication to logOut?
    router.post('/user/logout', authentication, logout)
    // router.post('/user/logoutAll', authentication, logoutAll)

    return router
}

// export default router