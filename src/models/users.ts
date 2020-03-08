// import { Tweets } from '../entity/Tweets'
// import {Users} from '../entity/Users'

export interface FormatedUser {
    userId: string;
    name: string;
    createdAt: number;
    avatarURL: string | null;
    backgroundURL: string | null;
    description: string | null;
    location: string | null;
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
    avatar: string | null;
    background: string | null;
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
    avatar?: string;
    background?: string;
    description?: string;
    location?: string;
    email?: string;
}

export interface smallAuthor {
    [key: string]: {
        userId: string;
        firstName: string;
        lastName: string;
    }
}