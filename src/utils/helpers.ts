import {FormatedUser, ExtendedUser} from '../models/users'
import {TweetsInterface, ExtendedTweet, FormatedTweet} from '../models/tweets' //FormatedTweet
// import {Tweets} from '../entity/Tweets'
//import {smallTweetAuthor} from '../models/tweets'

export const formatUser = (user: ExtendedUser) => {
    const formatedUser: FormatedUser = {
          userId: user.userId,
          name: `${user.firstName} ${user.lastName}`,
          avatarURL: user.avatar,
          createdAt: Date.parse(user.createdAt),
          backgroundURL: user.background,
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
    const formatedTweet: FormatedTweet = {
        id: tweet.tweetId,
        user: tweet.userId,
        createdAt: Date.parse(tweet.createdAt),
        text: tweet.text,
        replyingToUserId: tweet.parentAuthorData ? tweet.parentAuthorData.userId : null,
        replyingToUserName: tweet.parentAuthorData ? tweet.parentAuthorData.name || `${tweet.parentAuthorData.firstName} ${tweet.parentAuthorData.lastName}` : null,
        replyingToTweetId: tweet.parentId,
        repliesCount: tweet.replies.length,
        likesCount: tweet.likes.length,
        liked: tweet.likes.map(like => like.userId).includes(userId)
    }
    if (tweet.hasOwnProperty('sortindex')) {
      formatedTweet.sortindex = tweet.sortindex
    }
    if (tweet.hasOwnProperty('type')) {
      formatedTweet.type = tweet.type
    }

    return formatedTweet
}

export const formatTweetsFromDB = (tweets: ExtendedTweet[], userId: string) => {
  const formatedTweets: TweetsInterface = {};

  tweets.forEach(tweet => {
      formatedTweets[tweet.tweetId] = formatTweet(tweet, userId)
  })
  return formatedTweets
}