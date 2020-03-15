import { Likes } from "../entity/Likes";
import { Tweets } from "../entity/Tweets";

export interface FormatedTweet {
    id: number;
    user: string;
    createdAt: number;
    text: string;
    replyingToUserId: string | null;
    replyingToUserName: string | null;
    replyingToTweetId: number | null;
    repliesCount: number;
    likesCount: number;
    liked: boolean;    
    media: string | null;
    sortindex?: number;
    type?: string;
}

export interface TweetsInterface {
    [key: string]: FormatedTweet;
}

export interface ExtendedTweet {
    tweetId: number;
    userId: string;
    text: string;
    createdAt: string;
    parentId: number | null;
    replies: Tweets[];
    likes: Likes[];
    media: Boolean;
    sortindex?: number;
    parentAuthorData?: smallTweetAuthor;
    type?: string;
}
export interface ExtendedTweetsInterface {
    [key: number]: ExtendedTweet
}

export interface smallTweetAuthorInterface {
    [key: string]: smallTweetAuthor
}
export interface smallTweetAuthor {
    tweetId: number;
    userId: string;
    firstName?: string;
    lastName?: string;
    name?:string;
}
