import {Request} from 'express'

export interface RequestWithCustomProperties extends Request {
    userId?: string;
    tokenId?: string;
    sesssion?: Express.Session;
}