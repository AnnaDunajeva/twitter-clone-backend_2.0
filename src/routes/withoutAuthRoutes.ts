import { Router } from 'express'
import { getTweetMedia } from '../controllers/tweets' 
import { 
    addUser, 
    getUserAvatar, 
    getUserBackground, 
    getUserAvatarDefault } from '../controllers/users' 
import { 
    login, 
    verifyUserEmail, 
    generateAndSendResetPasswordLink, 
    resetPassword,
    generateNewEmailVerificationToken,
    completeGoogleAuthAccountCreation } from '../controllers/authentication'
import { getBackground } from '../utils/helpers'


const router = Router()


    router.put('/user', addUser)

    router.put('/identity/verify', verifyUserEmail)
    router.put('/identity/getResetPasswordLink', generateAndSendResetPasswordLink)
    router.put('/identity/resetPassword', resetPassword)
    router.put('/identity/getVerifyAccountLink', generateNewEmailVerificationToken)
    router.put('/identity/googleAuth/completeAccount', completeGoogleAuthAccountCreation)

    router.get('/user/:userId/avatar', getUserAvatar) //donno, no auth kinda sucks, but twitter doesnt have it either
    router.get('/user/avatar/default', getUserAvatarDefault) 
    router.get('/user/:userId/background', getUserBackground)
    
    router.get('/user/tweet/:tweetId/media', getTweetMedia)
    router.get('/background', getBackground)
    
    router.put('/user/login', login)


export default router