import {setupDB, closeDB} from '../utils/testDBsetup'
import request from 'supertest'
import server, {sessionStoreDbConnection} from '../server'
import {getRepository} from "typeorm";
import {Users} from "../entity/Users"
import bcrypt from 'bcrypt'
import { MailSlurp } from "mailslurp-client";

const mailslurp = new MailSlurp({ apiKey: process.env.MAILSLURP_API_KEY! })
const testuserThreeInboxAdress = process.env.MAILSLURP_INBOX_ADRESS
const testuserThreeInboxId = process.env.MAILSLURP_INBOX_ID
let sessionCookie: string;
let csrfCookie: string;
let sessionCookieSecond: string;

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

const testUserTwo = {
    userId: 'testusertwo',
    firstName: 'testusertwo', 
    lastName: 'testusertwo',
    email: 'testusertwo@test.com',
    password: 'test',
    createdAt: () => `to_timestamp(${time/1000})`, //postgres func to_timestamp accepts unix time in sec 
    verifiedAt: null  
}

const testUserThree = {
    userId: 'testuserthree',
    firstName: 'testuserthree', 
    lastName: 'testuserthree',
    password: 'test',
    email: testuserThreeInboxAdress
}


beforeAll(async () => {
    await setupDB()
    
    await getRepository(Users)
        .insert([{
            ...testUser,
            password: await bcrypt.hash(testUser.password, 8)
        },
        {
            ...testUserTwo,
            password: await bcrypt.hash(testUserTwo.password, 8)
        },
    ]) 
})

afterAll(async () => { 
    //should close sessionstore connection first, otherwise will be errors cause session table will be already destroyed i think...
    sessionStoreDbConnection.close()
    await closeDB()
})

test('should not signup user when not all fields filled', async () => {
    //no email
    await agent
        .put('/user')
        .send({
            userId: testUserThree.userId,
            firstName: testUserThree.firstName, 
            lastName: testUserThree.lastName,
            password: testUserThree.password
        })
        .expect(400)
        .expect('Content-Type', /json/)
})

test('should not signup user when username is taken', async () => {
 //username already taken
    await agent
        .put('/user')
        .send({
            ...testUserThree,
            userId: testUser
        })
        .expect(400)
        .expect('Content-Type', /json/)
})
test('should not signup user when email is not valid', async () => {     
       //wrong email
       await agent
           .put('/user')
           .send({
               ...testUserThree,
               email: 'notanemail'
           })
           .expect(400)
           .expect('Content-Type', /json/)
   })

//can receive only 100 emails per month, cant run it all the time
test.skip('should singup testuserthree', async () => {
    jest.setTimeout(30000);
    // const testuserThreeInbox = await mailslurp.createInbox()
    await mailslurp.emptyInbox(testuserThreeInboxId!)
    const response = await agent
        .put('/user')
        .send(testUserThree)
        .expect(201)
        .expect('Content-Type', /json/)
    
    expect(response.body).toMatchObject({
        status: 'ok'
    })
    
    const verificationEmail = await mailslurp.waitForLatestEmail(testuserThreeInboxId);
    const token = verificationEmail.body?.split(/(?:<a href='http:\/\/localhost\/verify\/)|(?:' style=")/)[1]
    console.log(token)

    const responseFromVerification = await agent
        .put('/identity/verify')
        .send({
            token 
        })
        .expect(201)
        .expect('Content-Type', /json/)
    
    expect(responseFromVerification.body).toMatchObject({
        user: {
            [testUserThree.userId]:{
                userId: testUserThree.userId,
                firstName: testUserThree.firstName,
                lastName: testUserThree.lastName,
                email: testuserThreeInboxAdress,
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
    expect(responseFromVerification.body.user[testUserThree.userId]).toHaveProperty('avatar')
    expect(responseFromVerification.body.user[testUserThree.userId]).toHaveProperty('createdAt')
    expect(responseFromVerification.body.user[testUserThree.userId]).not.toHaveProperty('password')
    expect(responseFromVerification.body.user[testUserThree.userId]).not.toHaveProperty('following')
    expect(responseFromVerification.body.user[testUserThree.userId]).not.toHaveProperty('verifiedAt')

    const userInDb = await getRepository(Users).findOne({userId: testUserThree.userId})
    expect(userInDb?.userId).toBe(testUserThree.userId)
})


test('should not login nonexisting user', async () => {
    const response = await agent
        .put('/user/login')
        .send({
            password: 'nonexistenuser', 
            userId: 'nonexistentpassword'
        })
        .expect(400)
        .expect('Content-Type', /json/)

    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('status')
    expect(response.body.status).toBe('error')
    expect(response.body.error).toBe('Username and password do not match!')
})

test('should not login testuser with wrong password', async () => {
    const response = await agent
        .put('/user/login')
        .send({
            password: testUser.userId, 
            userId: 'wrongpassword'
        })
        .expect(400)
        .expect('Content-Type', /json/)

    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('status')
    expect(response.body.status).toBe('error')
    expect(response.body.error).toBe('Username and password do not match!')
})

test('should not login testuser with wrong username', async () => {
    const response = await agent
        .put('/user/login')
        .send({
            password: 'wrongusername', 
            userId: testUser.password
        })
        .expect(400)
        .expect('Content-Type', /json/)

    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('status')
    expect(response.body.status).toBe('error')
    expect(response.body.error).toBe('Username and password do not match!')
})

test('should not login user with unverified account', async () => {
    const response = await agent
        .put('/user/login')
        .send({
            password: testUserTwo.userId, 
            userId: testUserTwo.password
        })
        .expect(400)
        .expect('Content-Type', /json/)

    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('status')
    expect(response.body.status).toBe('error')
    expect(response.body.error).toBe('Username and password do not match!')
})

test('should not logout non-logged user', async () => {
    await agent
        .put('/user/logout')
        .expect(403)  
})

test('should login testuser', async () => {
    const response = await agent
        .put('/user/login')
        .send({
            password: testUser.password, 
            userId: testUser.userId
        })
        .expect(200)
        .expect('Content-Type', /json/)
    
    sessionCookie = response.header['set-cookie'].filter((cookie: string) => cookie.includes('sid='))[0]
    console.log(sessionCookie)

    const responseTwo = await agent
        .get('/user') 
        .expect(200)
        .expect('Content-Type', /json/)
    csrfCookie = responseTwo.header['set-cookie'].find((cookie: string) => cookie.includes(process.env.CSRF_COOKIE_KEY!)).split('; ')[0].slice(process.env.CSRF_COOKIE_KEY!.length + 1)
    console.log(csrfCookie)

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
    expect(response.body.user[testUser.userId]).not.toHaveProperty('password')
    expect(response.body.user[testUser.userId]).not.toHaveProperty('verifiedAt')
    expect(response.body.user[testUser.userId]).not.toHaveProperty('following')
})

test('should login testuser with another session', async () => {
    const response = await agent
        .put('/user/login')
        .send({
            password: testUser.password, 
            userId: testUser.userId
        })
        .expect(200)
        .expect('Content-Type', /json/)
    
    sessionCookieSecond = response.header['set-cookie'].filter((cookie: string) => cookie.includes('sid='))[0]

    expect(sessionCookieSecond).not.toEqual(sessionCookie)
})

test('should logout testuser', async () => {
    const response = await agent
        .put('/user/logout')
        .set('CSRF-Token', csrfCookie)
        .expect(200)
        .expect('Content-Type', /json/)
    
    expect(response.body).toHaveProperty('message')
    expect(response.body).toHaveProperty('status')
    expect(response.body.status).toBe('ok')
    expect(response.body.message).toBe('success')
})

//generateAndSendResentPasswordLink and ResetPassword
//cant run it with signup test
test.skip('should reset password', async () => {
    jest.setTimeout(30000);

    await getRepository(Users)
    .insert({
        ...testUserThree,
        createdAt: () => `to_timestamp(${time/1000})`, 
        verifiedAt: () => `to_timestamp(${time/1000})`
    }) 

    await mailslurp.emptyInbox(testuserThreeInboxId!)
    const response = await agent
        .put('/identity/getResetPasswordLink')
        .send({
            email: testUserThree.email
        })
        .expect(201)
        .expect('Content-Type', /json/)
    
    expect(response.body).toMatchObject({
        status: 'ok'
    })
    
    const resetPasswordEmail = await mailslurp.waitForLatestEmail(testuserThreeInboxId);
    const token = resetPasswordEmail.body?.split(/(?:<a href='http:\/\/localhost\/resetPassword\/)|(?:' style=")/)[1]
    console.log(token)

    testUserThree.password = 'newpassword'

    const responseFromResetPassword = await agent
        .put('/identity/resetPassword')
        .send({
            token,
            password: testUserThree.password
        })
        .expect(201)
        .expect('Content-Type', /json/)
    
    expect(responseFromResetPassword.body).toMatchObject({
        message: 'success',
        status: 'ok'
    })

    await agent
        .put('/user/login')
        .send({
            password: testUserThree.password, 
            userId: testUserThree.userId
        })
        .expect(200)
        .expect('Content-Type', /json/)
})