import {setupDB, closeDB, userOne} from '../utils/testDBsetup'
import request from 'supertest'
import server, {sessionStoreDbConnection} from '../server'
import {getRepository} from "typeorm";
import {Users} from "../entity/Users"
import bcrypt from 'bcrypt'

//addUser is tested in auth

let sessionCookie;

const agent = request.agent(server)
const time = Date.now()
const testUser = {
    userId: 'testuser',
    firstName: 'testuser', 
    lastName: 'testuser',
    email: 'testuser@test.com',
    password: 'test',
    createdAt: () => `to_timestamp(${time/1000})`, //postgres func to_timestamp accepts unix time in sec 
    verifiedAt: () => `to_timestamp(${time/1000})`  
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

test('should get user profile', async () => {
    const response = await agent
        .get('/user') 
        .expect(200)
        .expect('Content-Type', /json/)

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

test('should get userOne public profile data', async () => {
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
