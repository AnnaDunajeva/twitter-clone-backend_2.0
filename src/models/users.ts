// import { Tweets } from '../entity/Tweets'
// import {Users} from '../entity/Users'

export interface FormatedUser {
    userId: string;
    firstName?: string;
    lastName?: string;
    createdAt?: number;
    avatar?: string;
    backgroundColor?: string | null;
    backgroundImage?: string | null;
    description?: string | null;
    location?: string | null;
    following?: boolean; //only for nonAuthed
    email?: string; //only for authedUser
    followingsCount?: number;
    followersCount?: number;
    sortindex?: number;
}

export interface ExtendedUser {
    userId: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    avatar: boolean;
    backgroundColor: string | null;
    backgroundImage: boolean;
    description: string | null;
    location: string | null;
    following?: boolean; //only for nonAuthed
    email?: string; //only for authedUser
    followingsCount?: number;
    followersCount?: number;
    sortindex?: number;
}

export interface UsersInterface {
    [key: string]: FormatedUser
}

export interface UpdateUserData {
    firstName?: string;
    lastName?: string;
    avatar?: Buffer | null;
    backgroundColor?: string;
    backgroundImage?: Buffer | null;
    description?: string;
    location?: string;
    email?: string;
    verifiedAt?: () => string;
}

export interface smallAuthor {
    [key: string]: {
        userId: string;
        firstName: string;
        lastName: string;
    }
}