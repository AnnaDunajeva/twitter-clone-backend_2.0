import {FormatedUser, ExtendedUser} from '../models/users'
import {TweetsInterface, ExtendedTweet, FormatedTweet} from '../models/tweets' //FormatedTweet
import {v4 as uuidv4} from 'uuid';
import sgMail from '@sendgrid/mail'
// const sgMail = require('@sendgrid/mail')
import { promises as fsPromises } from 'fs';
import { Background } from '../entity/Background';
import { getRepository } from 'typeorm';
import { RequestHandler } from 'express';
const URL = process.env.URL+'/api'

export const formatUser = (user: ExtendedUser) => {
    const createdAt = new Date(user.createdAt as string)
    const formatedUser: FormatedUser = {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar ?`${URL}/user/${user.userId}/avatar?${uuidv4()}`: `${URL}/user/${user.userId}/avatar/default`,
        createdAt: createdAt.getTime(),
        backgroundColor: user.backgroundColor,
    //   backgroundImage: user.backgroundImage?.toString('base64') || null,
        backgroundImage: user.backgroundImage ? `${URL}/user/${user.userId}/background?${uuidv4()}` : null,
        description: user.description,
        location: user.location,
        followersCount: user.followersCount,
        followingsCount: user.followingsCount
      }
      if (user.email) {
          formatedUser.email = user.email
      }
      if (user.hasOwnProperty('following')) {
          formatedUser.following = user.following
      }
      if (user.hasOwnProperty('sortindex')) {
          formatedUser.sortindex = user.sortindex
      }
      return formatedUser
}

export const formatTweet = (tweet: ExtendedTweet, userId: string) => {
    if (tweet.deletedAt) {
        const deletedTweet: FormatedTweet = {id: tweet.tweetId, deleted: true}
        return deletedTweet
    } else {
        const createdAt = new Date(tweet.createdAt as string)
        const formatedTweet: FormatedTweet = {
            id: tweet.tweetId,
            user: tweet.userId,
            createdAt: createdAt.getTime(),
            text: tweet.text,
            media: tweet.media ? `${URL}/user/tweet/${tweet.tweetId}/media` : null, 
            replyingToUserId: tweet.parentAuthorData ? tweet.parentAuthorData.userId : null,
            replyingToUserName: tweet.parentAuthorData ? tweet.parentAuthorData.name || `${tweet.parentAuthorData.firstName} ${tweet.parentAuthorData.lastName}` : null,
            replyingToTweetId: tweet.parentId,
            repliesCount: tweet.replies!.length,
            likesCount: tweet.likes!.length,
            liked: tweet.likes!.map(like => like.userId).includes(userId)
        }
        if (tweet.hasOwnProperty('sortindex')) {
          formatedTweet.sortindex = tweet.sortindex
        } else {
            formatedTweet.sortindex = Date.parse(tweet.createdAt as string)
        }
        if (tweet.hasOwnProperty('type')) {
          formatedTweet.type = tweet.type
        }
    
        return formatedTweet
    }
}

export const formatTweetsFromDB = (tweets: ExtendedTweet[], userId: string) => {
  const formatedTweets: TweetsInterface = {};

  tweets.forEach(tweet => {
      formatedTweets[tweet.tweetId] = formatTweet(tweet, userId)
  })
  return formatedTweets
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);
export const sendEmailConfirmation = async (to: string, token: string, url: string) => {
    try {
        const link = url+'/'+token

        const emailTemplate = await fsPromises.readFile('assets/email-confirmation.html', 'utf8')
        const email = emailTemplate.replace('email verification link', link)
        const msg = {
            to,
            from: process.env.SENDGRID_FROM_EMAIL as string,
            subject: 'Thank you for regestering with Twitter Clone!',
            html: email
            // html: `<p>Please confirm your email adress by clicking on the following <a href="${link}">link</a>.</p><p>If you did not request this, please ignore this email.</p> <p>Please do not reply to this email.</p>`
        };
        console.log('about to send email confirmation')
        await sgMail.send(msg);
    }
    catch (err) {
        console.error(err.toString());
        throw new Error('Could not send verification email.')
    }
}
export const sendResetPasswordLink = async (to: string, token: string, url: string) => {
    try {
        const link = url+'/'+token

        const emailTemplate = await fsPromises.readFile('assets/password-email.html', 'utf8')
        const email = emailTemplate.replace('reset password link', link)
        const msg = {
            to,
            from: process.env.SENDGRID_FROM_EMAIL as string,
            subject: 'Your Twitter Clone reset password link is ready!',
            html: email
        };
        console.log('about to send reset password email...')
        await sgMail.send(msg);
    }
    catch (err) {
        console.error(err.toString());
        throw new Error('Could not send reset password link.')
    }
}

//! # $ % & ‘ * + – / = ? ^ ` . { | } ~ characters are legal in the local part of an e-mail 
//address but in this regular expression those characters are filtered out. 
export const validateEmail = (email: string) => {
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,4})+$/.test(email)) {
      return (true)
    }
    return (false)
  }

export const removeBlacklistCharsForSearch = (input: string) => {
    return input
        .trim()
        .replace(/[^\w\s\-]/g, "")
        .replace(/\s+/g, " & ")
}

export const sanitazeUsername = (input: string) => {
    return input
        .trim()
        .replace(/[^\w\s\-]/g, "")
}
export const sanitazeFirstOrLastname = (input: string) => {
    return input
    .trim()
    .replace(/[^a-zA-Z-]/g, "")
}


export const getBackground:RequestHandler = async (req, res) =>{
    try {
        const background = await getRepository(Background)
            .createQueryBuilder("image")
            .take(1)
            .getOne()

        res.set('Content-Type', 'image/jpg')
        res.status(200).send(background?.image || null)
    }
    catch (err) {
        res.status(400).json({error: err, status: "error"})
    }
}