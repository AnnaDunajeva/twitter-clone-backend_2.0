import {Response, NextFunction} from 'express'
import {RequestWithCustomProperties} from '../models/request'
// import * as auth from '../utils/authentication'
// import { getRepository } from 'typeorm'
// import { Tokens } from '../entity/Tokens'

export const authentication = async (req: RequestWithCustomProperties, res: Response, next: NextFunction) => {
    // console.log('req.session: ', req.session)
    // console.log('req.cookies: ', req.cookies)
    if (req.session?.userId) {
        req.userId = req.session.userId
        next()
    } else {
        res.status(401).json({error: 'authentication failed'})
    }
}
