import {Response, NextFunction} from 'express'
import {RequestWithCustomProperties} from '../models/request'
// import * as auth from '../utils/authentication'
// import { getRepository } from 'typeorm'
// import { Tokens } from '../entity/Tokens'

export const authentication = async (req: RequestWithCustomProperties, res: Response, next: NextFunction) => {
    console.log(req.session)
    if (req.session?.userId) {
        req.userId = req.session.userId
        next()
    } else {
        res.status(401).json({error: 'authentication failed'})
    }
}

// export const authentication = async (req: RequestWithCustomProperties, res: Response, next: NextFunction) => {
//     try {
//         if (!req.header('Authorization')) {
//             throw new Error('authorization header not provided')
//         }
//         const token = req.header('Authorization')!.replace('Bearer ','') 

//         const tokenData = await auth.decodeToken(token)
//         if (!tokenData || Object.keys(tokenData).length < 2) {
//             throw new Error('authentication failed')
//         }
//         req.userId = tokenData.userId
//         req.tokenId = tokenData.tokenId
//         next()
//     } 
//     catch(err) {
//         res.status(401).json({error: err.message})
//     }
// }