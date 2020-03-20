import {FormatedUser, ExtendedUser} from '../models/users'
import {TweetsInterface, ExtendedTweet, FormatedTweet} from '../models/tweets' //FormatedTweet
// import {Tweets} from '../entity/Tweets'
//import {smallTweetAuthor} from '../models/tweets'
import {v4 as uuidv4} from 'uuid';

const URL = 'http://localhost:3001'

export const formatUser = (user: ExtendedUser) => {
    const formatedUser: FormatedUser = {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar ?`${URL}/user/${user.userId}/avatar?${uuidv4()}`: `${URL}/user/${user.userId}/avatar/default`,
        createdAt: Date.parse(user.createdAt),
        backgroundColor: user.backgroundColor,
    //   backgroundImage: user.backgroundImage?.toString('base64') || null,
        backgroundImage: user.backgroundImage ? `${URL}/user/${user.userId}/background?${uuidv4()}` : null,
        description: user.description,
        location: user.location,
        followersCount: user.followersCount,
        followingsCount: user.followingsCount
      }
      if (user.email) {
          formatedUser.email = user.email
      }
      if (user.hasOwnProperty('following')) {
          formatedUser.following = user.following
      }
      if (user.hasOwnProperty('sortindex')) {
          formatedUser.sortindex = user.sortindex
      }
      return formatedUser
}

// export const formatTweet = (tweet: ExtendedTweet) => {
//     return <FormatedTweet> {
//         id: tweet.tweetId,
//         user: tweet.userId,
//         createdAt: Date.parse(tweet.createdAt),
//         text: tweet.text,
//         replyingToUserId: tweet.replyingToUserId,
//         replyingToUserName: tweet.replyingToUserName,
//         replyingToTweetId: tweet.replyingToTweetId,
//         sortindex: Date.parse(tweet.createdAt),
//         repliesCount: tweet.repliesCount,
//         likesCount: tweet.likesCount,
//         liked: tweet.liked
//     }
// }

export const formatTweet = (tweet: ExtendedTweet, userId: string) => {
    // console.log(tweet.likes, tweet.likes.map(like => like.userId), userId)
    if (tweet.deletedAt) {
        const deletedTweet: FormatedTweet = {id: tweet.tweetId, deleted: true}
        return deletedTweet
    } else {
        const formatedTweet: FormatedTweet = {
            id: tweet.tweetId,
            user: tweet.userId,
            createdAt: Date.parse(tweet.createdAt as string),
            text: tweet.text,
            media: tweet.media ? `${URL}/user/tweet/${tweet.tweetId}/media` : null, 
            replyingToUserId: tweet.parentAuthorData ? tweet.parentAuthorData.userId : null,
            replyingToUserName: tweet.parentAuthorData ? tweet.parentAuthorData.name || `${tweet.parentAuthorData.firstName} ${tweet.parentAuthorData.lastName}` : null,
            replyingToTweetId: tweet.parentId,
            repliesCount: tweet.replies!.length,
            likesCount: tweet.likes!.length,
            liked: tweet.likes!.map(like => like.userId).includes(userId)
        }
        if (tweet.hasOwnProperty('sortindex')) {
          formatedTweet.sortindex = tweet.sortindex
        } else {
            formatedTweet.sortindex = Date.parse(tweet.createdAt as string)
        }
        if (tweet.hasOwnProperty('type')) {
          formatedTweet.type = tweet.type
        }
    
        return formatedTweet
    }
}

export const formatTweetsFromDB = (tweets: ExtendedTweet[], userId: string) => {
  const formatedTweets: TweetsInterface = {};

  tweets.forEach(tweet => {
      formatedTweets[tweet.tweetId] = formatTweet(tweet, userId)
  })
  return formatedTweets
}
