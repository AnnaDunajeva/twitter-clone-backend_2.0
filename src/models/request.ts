import {Request} from 'express'
// import { Users } from '../entity/Users';

export interface RequestWithCustomProperties extends Request {
    userId?: string;
    tokenId?: string;
    sesssion?: Express.Session;
    // users?: Users | undefined;
}