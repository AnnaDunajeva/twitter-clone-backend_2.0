import {RequestHandler, Response} from 'express'
import {RequestWithCustomProperties} from '../models/request'
import {Users} from "../entity/Users"
import {getRepository} from "typeorm"
import bcrypt from 'bcrypt'
import * as tokens from '../utils/tokens'
import * as auth from '../utils/authentication'
import * as users from '../utils/users'

export const login: RequestHandler = async (req, res) => {
    try {
        const {password, userId} = req.body as {password: string, userId: string}
        const usersRepo = getRepository(Users)
        const user  = await usersRepo.findOne(userId)
        if (!user) {
            throw new Error('Username and password does not match!')           
        }
        const match = await bcrypt.compare(password, user.password)
        if (!match) {
            throw new Error('Username and password does not match!')
        } 

        const token = auth.generateAuthToken(user.userId)
        await tokens.saveToken(user.userId, token) //will error be caught if it happens inside this function - it should 

        const userProfile = await users.getUserProfile(userId)

        res.status(201).json({user: userProfile, token, status: "ok"})
    }
    catch (err) {
        res.status(400).json({error: err.message, status:"error"})
    }
}

export const logout = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const tokenId = req.tokenId as string
        await tokens.deleteToken(tokenId)

        res.status(201).json({message: "success", status: "ok"})
    }
    catch(err) {
        res.status(500).json({error: err.message, status: "error"})
    }
}

export const logoutAll = async (req: RequestWithCustomProperties, res: Response) => {
    try {
        const userId = req.userId as string
        await tokens.deleteAllTokens(userId)

        res.status(201).json({message: "success", status: "ok"})
    }
    catch(err) {
        res.status(500).json({error: err.message, status: "error"})
    }
}