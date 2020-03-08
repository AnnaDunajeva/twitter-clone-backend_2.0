import jwt from 'jsonwebtoken'
import {Tokens} from '../entity/Tokens'
import {getRepository} from "typeorm"

export const privateKey = process.env.JWT_TOKEN as string

export const generateAuthToken = (userId: string) => {
  const token = jwt.sign({userId: userId}, privateKey) 
  return token
}

export const decodeToken = async (token: string) => {
    const decoded = jwt.verify(token, privateKey) as {userId: string}
    const tokensRepo = getRepository(Tokens)
    const databaseToken = await tokensRepo.findOne({userId: decoded.userId, tokenId: token})
    return databaseToken
}