import {setupDB, closeDB, userOne} from '../utils/testDBsetup'
import request from 'supertest'
import server, {sessionStoreDbConnection} from '../server'
import {getRepository} from "typeorm";
import {Users} from "../entity/Users"
import bcrypt from 'bcrypt'

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
//not verifies user
const testUserTwo = {
    userId: 'testuserforuserstwo',
    firstName: 'testuserforuserstwo', 
    lastName: 'testuserforuserstwo',
    email: 'testuserforuserstwo@test.com',
    password: 'test',
    createdAt: () => `to_timestamp(${time/1000})`
}


beforeAll(async () => {
    await setupDB()
    
    await getRepository(Users)
        .insert({
            ...testUser,
            password: await bcrypt.hash(testUser.password, 8)
        })
    
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

test('should get testuser profile', async () => {
    const response = await agent
        .get('/user') 
        .expect(200)
        .expect('Content-Type', /json/)
    
    csrfCookie = response.header['set-cookie'].find((cookie: string) => cookie.includes(process.env.CSRF_COOKIE_KEY!)).split('; ')[0].slice(process.env.CSRF_COOKIE_KEY!.length + 1)

    expect(response.body).toMatchObject({
        user: {
            [testUser.userId]: {
                userId: testUser.userId,
                firstName: testUser.firstName,
                lastName: testUser.lastName,
                email: testUser.email,
                createdAt: time,
                description: null,
                location: null,
                backgroundColor: null,
                backgroundImage: null,
                followersCount: 0,
                followingsCount: 0
            }
        },
        status: 'ok'
    })
    expect(response.body.user[testUser.userId]).toHaveProperty('avatar')
    expect(response.body.user[testUser.userId].avatar).not.toBe(null)
    expect(response.body.user[testUser.userId]).not.toHaveProperty('password')
    expect(response.body.user[testUser.userId]).not.toHaveProperty('following')
    expect(response.body.user[testUser.userId]).not.toHaveProperty('verifiedAt')
})

test('should get userone public profile data', async () => {
    const response = await agent
        .get(`/users/${userOne.userId}`)
        .expect(200)
        .expect('Content-Type', /json/)

    expect(response.body).toMatchObject({
        user: {
            [userOne.userId]: {
                userId: userOne.userId,
                firstName: userOne.firstName,
                lastName: userOne.lastName,
                description: null,
                location: null,
                backgroundColor: null,
                backgroundImage: null,
                followersCount: 0,
                followingsCount: 0,
                following: false
            }
        },
        status: 'ok'
    })
    expect(response.body.user[userOne.userId]).toHaveProperty('avatar')
    expect(response.body.user[userOne.userId]).toHaveProperty('createdAt')
    expect(response.body.user[userOne.userId].avatar).not.toBe(null)
    expect(response.body.user[userOne.userId].createdAt).not.toBe(null)
    expect(response.body.user[userOne.userId]).not.toHaveProperty('password')
    expect(response.body.user[userOne.userId]).not.toHaveProperty('email')
    expect(response.body.user[userOne.userId]).not.toHaveProperty('verifiedAt')
})

test('should not get profile of unverified user', async () => {
    const response = await agent
        .get(`/users/${testUserTwo.userId}`)
        .expect(200)
        .expect('Content-Type', /json/)
    
    expect(response.body.user.userId).toBeUndefined()
})

test('should follow and unfollow userone', async () => {
    const response = await agent
        .put(`/user/followings/${userOne.userId}`)
        .set('CSRF-Token', csrfCookie)
        .expect(201)
        .expect('Content-Type', /json/)
    
    expect(response.body).toMatchObject({
        users: {
            [testUser.userId]: {
                followingsCount: 1
            },
            [userOne.userId]: {
                followersCount: 1
            }
        },
        status: 'ok'
    })

    const secondREsponse = await agent
        .delete(`/user/followings/${userOne.userId}`)
        .set('CSRF-Token', csrfCookie)
        .expect(200)
        .expect('Content-Type', /json/)
    
    expect(secondREsponse.body).toMatchObject({
        users: {
            [testUser.userId]: {
                followingsCount: 0
            },
            [userOne.userId]: {
                followersCount: 0
            }
        },
        status: 'ok'
    })
})

test('should NOT update testuser profile data', async () => {
    // const supportedProperties = ['firstName', 'lastName', 'location', 'description', 'avatar', 'backgroundColor', 'backgroundImage', 'crop']

    await agent
        .patch('/user')
        .set('CSRF-Token', csrfCookie)
        .send({
            user: JSON.stringify({
                userId: 'someId'
            })
        })
        .expect(400)
        .expect('Content-Type', /json/)
    
})

test('should update testuser profile data', async () => {
    testUser.firstName = 'newfirstname'

    const response = await agent
        .patch('/user')
        .set('CSRF-Token', csrfCookie)
        .send({
            user: JSON.stringify({
                firstName: testUser.firstName
            })
        })
        .expect(201)
        .expect('Content-Type', /json/)
    
    expect(response.body).toMatchObject({
        user: {
            [testUser.userId]: {
                firstName: testUser.firstName
            }
        },
        status: 'ok'
    })
})
