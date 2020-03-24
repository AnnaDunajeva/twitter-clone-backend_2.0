import {TweetsInterface} from './tweets'
import { UsersInterface } from './users';
export interface IoFuncInterface {
    sendTweetUpdate: (tweetId: number, tweet: TweetsInterface) => void;
    sendUserUpdate: (userId: string, user: UsersInterface)=> void;
}