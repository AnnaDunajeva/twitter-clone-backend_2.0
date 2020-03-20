import {TweetsInterface} from './tweets'
export interface IoFuncInterface {
    sendTweetUpdate: (tweetId: number, tweet: TweetsInterface) => void
}