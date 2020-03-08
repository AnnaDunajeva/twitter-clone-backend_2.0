// import { Tweets } from '../entity/Tweets'
import {TweetsInterface} from './tweets'
import {UsersInterface} from './users'

export interface TweetsResponse {
    tweets: TweetsInterface;
    parents?: TweetsInterface;
    users?: UsersInterface;
}
// export interface PaginatedUserTweetsResponse {
//     tweets: TweetsInterface;
//     parents?: TweetsInterface;
//     users?: UsersInterface;
// }