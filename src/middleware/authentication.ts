import {Response, NextFunction} from 'express'
import {RequestWithCustomProperties} from '../models/request'
import * as auth from '../utils/authentication'

export const authentication = async (req: RequestWithCustomProperties, res: Response, next: NextFunction) => {
    try {
        if (!req.header('Authorization')) {
            throw new Error('authorization header not provided')
        }
        const token = req.header('Authorization')!.replace('Bearer ','')
        const tokenData = await auth.decodeToken(token)
        if (!tokenData) {
            throw new Error('authentication failed')
        }
        req.userId = tokenData.userId
        req.tokenId = tokenData.tokenId
        next()
    } 
    catch(err) {
        res.status(401).json({error: err})
    }
}