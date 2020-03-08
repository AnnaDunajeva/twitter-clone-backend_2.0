import {Router} from 'express'
import {getPaginatedFeed, saveTweet, getConversationPaginated, getUserTweetsPaginated, saveLikeToggle} from '../controllers/tweets' //saveLikeToggle, getTweet, getTweetsbyId, getAllTweetsIds, 
import {addUser, getUserProfile, getAllUsersPaginated, updateUser, getUser} from '../controllers/users' //getUser, getAllUsers, updateUser, getUsersByIds, getUserTweetsPaginated, getRepliesPaginated
import {login, logout, logoutAll} from '../controllers/authentication'
import {authentication} from '../middleware/authentication'
import {addFollowing, getFollowings, deleteFollowing, getFollowers} from '../controllers/followings'

const router = Router()

//router.get('/test', authentication, getUserTweetsPaginated)

router.post('/user', addUser)
//router.post('/users', authentication, getUsersByIds) //not very RESTful
router.get('/user', authentication, getUserProfile)
router.get('/users', authentication, getAllUsersPaginated) //without authed user

router.patch('/user', authentication, updateUser)
// router.delete('/user')

router.get('/users/:userId', authentication, getUser)

router.get('/user/feed',authentication, getPaginatedFeed)
//router.post('/tweets', authentication, getTweetsbyId) //not very RESTful
//router.get('/user/tweets/:tweetId', authentication, getTweet)
router.get('/users/:userId/tweets', authentication, getUserTweetsPaginated)
router.get('/user/tweets/:tweetId/conversation', authentication, getConversationPaginated)

router.post('/user/tweet', authentication, saveTweet)
// router.delete('/user/tweet/:tweetId')

router.post('/user/tweets/like/:tweetId', authentication, saveLikeToggle)

router.get('/user/followings', authentication, getFollowings)
router.get('/user/followers', authentication, getFollowers)
router.post('/user/followings/:userId', authentication, addFollowing)
router.delete('/user/followings/:userId', authentication, deleteFollowing)

router.post('/user/login', login)
//maybe i dont need authentication to logOut?
router.post('/user/logout', authentication, logout)
router.post('/user/logoutAll', authentication, logoutAll)

export default router