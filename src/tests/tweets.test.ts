import {setupDB, closeDB, userOne} from '../utils/testDBsetup'
import request from 'supertest'
import server, {sessionStoreDbConnection} from '../server'
import {getRepository} from "typeorm";
import {Users} from "../entity/Users"
import bcrypt from 'bcrypt'
import { Tweets } from '../entity/Tweets';

//addUser is tested in auth

let sessionCookie;
let csrfCookie: string;

const agent = request.agent(server)
const time = Date.now()
const testUser = {
    userId: 'testuserforusers',
    firstName: 'testuserforusers', 
    lastName: 'testuserforusers',
    email: 'testuserforusers@test.com',
    password: 'test',
    createdAt: () => `to_timestamp(${time/1000})`, //postgres func to_timestamp accepts unix time in sec 
    verifiedAt: () => `to_timestamp(${time/1000})`  
}

const testTweetOne = {
    userId: testUser.userId,
    text: 'test1',
    parentId: null,
    media: null,
    createdAt: () => `to_timestamp(${Date.now()/1000})`
}
const testTweetTwo = {
    userId: testUser.userId,
    text: 'test2',
    parentId: null,
    media: null,
    createdAt: () => `to_timestamp(${Date.now()/1000})`
}

beforeAll(async () => {
    await setupDB()
    
    await getRepository(Users)
        .insert({
            ...testUser,
            password: await bcrypt.hash(testUser.password, 8)
        })
    await getRepository(Tweets)
        .insert([
            testTweetOne,
            testTweetTwo
        ])
    
    const response = await agent
        .put('/user/login')
        .send({
            password: testUser.password, 
            userId: testUser.userId
        })
        .expect(200)
    
    sessionCookie = response.header['set-cookie'].filter((cookie: string) => cookie.includes('sid='))[0]
    console.log(sessionCookie)
})

afterAll(async () => {
    sessionStoreDbConnection.close()
    await closeDB()
})

test('should get userOne paginated tweets', async () => {
    const response = await agent
        .get(`/users/${userOne.userId}/tweets?take=5&skip=0&getUsers=true&time=${Date.now()}`)
        .expect(201)
        .expect('Content-Type', /json/)
    
    csrfCookie = response.header['set-cookie'].find((cookie: string) => cookie.includes(process.env.CSRF_COOKIE_KEY!)).split('; ')[0].slice(process.env.CSRF_COOKIE_KEY!.length + 1)//+1 for '='

    expect(response.body).toMatchObject({
        tweets:{
            //...
        },
        users:{
            [userOne.userId]:{
                userId: userOne.userId
                //...
            }
        },
        status: 'ok'
    })

    const tweetIds = Object.keys(response.body.tweets)

    expect(tweetIds.length).toBeGreaterThan(0)
})

test('should save testuser tweet', async () => {
    const response = await agent
        .put('/user/tweet') 
        .set('CSRF-Token', csrfCookie)
        .send({
            tweet: JSON.stringify({
                text: 'new test tweet'
            })
        })
        .expect(201)
        .expect('Content-Type', /json/)
    
    expect(response.body).toMatchObject({
        status: 'ok',
        tweet: {}
    })
    const tweetId = Object.keys(response.body.tweet)[0]
    expect(response.body.tweet).toMatchObject({
        [tweetId]: {
            id: parseInt(tweetId),
            user: testUser.userId,
            text: 'new test tweet',
            replyingToUserId: null,
            replyingToUserName: null,
            replyingToTweetId: null,
            repliesCount: 0,
            likesCount: 0,
            liked: false,
            media: null
        }
    })
    expect(response.body.tweet[tweetId]).toHaveProperty('createdAt')
    expect(response.body.tweet[tweetId]).toHaveProperty('sortindex')
    expect(response.body.tweet[tweetId]).not.toHaveProperty('deleted')
    expect(response.body.tweet[tweetId]).not.toHaveProperty('type')
})

test('should like and dislike testuser tweet', async () => {
    const tweetId = (await getRepository(Tweets).findOne({userId: testUser.userId}))!.tweetId

    const response = await agent
        .put(`/user/tweets/like/${tweetId}`) 
        .set('CSRF-Token', csrfCookie)
        .expect(201)
        .expect('Content-Type', /json/)
    
    expect(response.body).toMatchObject({
        status: 'ok',
        tweet: {
            [tweetId]: {
                likesCount: 1,
                liked: true
            }
        }
    })

    const secondResponse = await agent
    .put(`/user/tweets/like/${tweetId}`) 
    .set('CSRF-Token', csrfCookie)
    .expect(201)
    .expect('Content-Type', /json/)

    expect(secondResponse.body).toMatchObject({
        status: 'ok',
        tweet: {
            [tweetId]: {
                likesCount: 0,
                liked: false
            }
        }
    })
})


