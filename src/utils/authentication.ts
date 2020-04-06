import jwt from 'jsonwebtoken'
import {Tokens} from '../entity/Tokens'
import {getRepository} from "typeorm"
import { VerificationTokens } from '../entity/VerificationTokens'
import cryptoRandomString = require('crypto-random-string');
import { Users } from '../entity/Users';
import { ResetPasswordTokens } from '../entity/ResetPasswordTokens';

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

export const generateEmailVerificationToken = async (userId: string) => {
  const time = Date.now()
  const exp = time + 900000 //15 min
  const code = cryptoRandomString({length: 12, type: "base64"})
  const token = jwt.sign({tokenId: code, userId, exp }, privateKey) 
  
  const emailVerificationTokensRepo = getRepository(VerificationTokens)
  const databaseToken = {
    tokenId: token,
    userId,
    createdAt: () => `to_timestamp(${time/1000})`
  }
  await emailVerificationTokensRepo
    .createQueryBuilder('verificationTokens')
    .insert()
    .values(databaseToken)
    .execute();
    
  return token
}

export const verifyAndDecodeEmailVerificationToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, privateKey) as {tokenId: string, userId: string, exp: number}

    const emailVerificationTokensRepo = getRepository(VerificationTokens)
    const databaseTokenData = await emailVerificationTokensRepo.findOne({userId: decoded.userId, tokenId: token})
    if (databaseTokenData) {
      return decoded
    }
    return null
  }
  catch (err) { //dont really want to show weird jwt errors on client side
    throw new Error('Verification failed!')
  }
}

export const checkAndDeleteExpiredUnverifiedAccount = async (user: Users) => {
  const time = Date.now()
  
  const verificationTokensRepo = getRepository(VerificationTokens)
  const usersRepo = getRepository(Users)
  
  const verificationTokenData = await verificationTokensRepo.findOne({userId: user.userId}) //?can be undefined
  const tokenCreatedAt = verificationTokenData ? new Date(verificationTokenData.createdAt) : null
  const isTokenValid = tokenCreatedAt 
                          ? time - tokenCreatedAt.getTime() > 900000
                              ?false
                              :true
                          : false
  if (!isTokenValid) {
    console.log('about to delete expired verification token')
      await verificationTokensRepo
      .createQueryBuilder('verificationTokens')
      .delete()
      .where("userId = :id", { id: user.userId })
      .execute();
  }
  
  const userCreatedAt = new Date(user.createdAt as string)
  if (time - userCreatedAt.getTime() > 86400000) { //24h
    console.log('about to delete verification token and user account')
      await usersRepo //maybe cascade?
      .createQueryBuilder('users')
      .delete()
      .where("userId = :id", { id: user.userId })
      .execute();
      //return true to signify that user account was deleted. 
      return true
  }
  return false
}

export const generateRestPasswordToken = async (email: string) => {
  const time = Date.now()
  const exp = time + 900000 //15 min
  const token = jwt.sign({email, exp }, privateKey) //has iat property for some reason as well
  
  const emailVerificationTokensRepo = getRepository(ResetPasswordTokens)
  const prevToken = await emailVerificationTokensRepo.findOne({email})
  if (prevToken) {
    await emailVerificationTokensRepo
    .createQueryBuilder('emailVerificationTokensRepo')
    .delete()
    .where("email = :email", { email })
    .execute();
  }
  const databaseToken = {
    tokenId: token,
    email,
    createdAt: () => `to_timestamp(${time/1000})`
  }
  await emailVerificationTokensRepo
    .createQueryBuilder('ResetPasswordTokens')
    .insert()
    .values(databaseToken)
    .execute();
    
  return token
}

export const verifyAndDecodeResetPasswordToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, privateKey) as {email: string, exp: number}

    const resetPasswordTokensRepo = getRepository(ResetPasswordTokens)
    const databaseTokenData = await resetPasswordTokensRepo.findOne({email: decoded.email, tokenId: token})
    if (databaseTokenData) {
      return decoded
    }
    return null
  }
  catch (err) { //dont really want to show weird jwt errors on client side
    console.log(err)
    throw new Error('Could not reset password!')
  }
}