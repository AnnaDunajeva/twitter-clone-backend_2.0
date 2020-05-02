import {Router} from 'express'
import {getTweetMedia} from '../controllers/tweets' //saveLikeToggle, getTweet, getTweetsbyId, getAllTweetsIds, 
import {addUser, getUserAvatar, getUserBackground, getUserAvatarDefault} from '../controllers/users' //getUser, getAllUsers, updateUser, getUsersByIds, getUserTweetsPaginated, getRepliesPaginated
import {login, verifyUserEmail, generateAndSendResetPasswordLink, resetPassword} from '../controllers/authentication'
import {getBackground} from '../utils/helpers'


const router = Router()


    router.put('/user', addUser)

    router.put('/identity/verify', verifyUserEmail)
    router.put('/identity/getResetPasswordLink', generateAndSendResetPasswordLink)
    router.put('/identity/resetPassword', resetPassword)

    router.get('/user/:userId/avatar', getUserAvatar) //donno, no auth kinda sucks, but twitter doesnt have it either
    router.get('/user/:userId/avatar/default', getUserAvatarDefault) //donno, no auth kinda sucks, but twitter doesnt have it either
    router.get('/user/:userId/background', getUserBackground)
    
    router.get('/user/tweet/:tweetId/media', getTweetMedia)
    router.get('/background', getBackground)
    
    router.put('/user/login', login)


export default router