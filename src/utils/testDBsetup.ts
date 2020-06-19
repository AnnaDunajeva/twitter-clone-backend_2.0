import {createConnection, getConnection, getRepository, getConnectionOptions} from "typeorm";
import {Users} from "../entity/Users"
import bcrypt from 'bcrypt'
import {Tweets} from "../entity/Tweets"

export const userOne = { 
    userId: 'userone',
    firstName: 'userone', 
    lastName: 'userone',
    email: 'userone@test.com',
    password: 'test',
    createdAt: () => `to_timestamp(${Date.now()/1000})`, //postgres func to_timestamp accepts unix time in sec
    verifiedAt: () => `to_timestamp(${Date.now()/1000})`
}
export const userTwo = { 
    userId: 'usertwo',
    firstName: 'usertwo', 
    lastName: 'usertwo',
    email: 'usertwo@test.com',
    password: 'test',
    createdAt: () => `to_timestamp(${Date.now()/1000})`, 
    verifiedAt: () => `to_timestamp(${Date.now()/1000})`
}

export const tweetOne = { 
    userId: userOne.userId,
    text: 'test',
    parentId: null,
    media: null,
    createdAt: () => `to_timestamp(${Date.now()/1000})`
}

export const setupDB = async () => {
    try {
        console.log('some envs: ', process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_NAME)
        console.log("connecting to test database...")
        // read connection options from ormconfig file 
        const connectionOptions = await getConnectionOptions()

        // create a connection using modified connection options
        await createConnection({
            ...connectionOptions,
            dropSchema: process.env.ENV === 'test' ? true : false //just extra check so we dont delete db we dont want to
        })

        console.log('setting up test db...')
        const connection = await getConnection();
        console.log(await connection.query(`SELECT c.relname FROM pg_class c WHERE c.relkind = 'S'`));

        await getConnection().runMigrations()

        await getRepository(Users)
            .insert([{
                ...userOne,
                password: await bcrypt.hash(userOne.password, 8)
            }, {
                ...userTwo,
                password: await bcrypt.hash(userTwo.password, 8)
            }])

        const insertedTweetOne = await getRepository(Tweets) 
            .insert(tweetOne)
        const insertedTweet = insertedTweetOne.generatedMaps[0]
    
        const tweetTwo = {
            userId: userTwo.userId,
            text: 'test reply',
            parentId: insertedTweet.tweetId,
            media: null,
            createdAt: () => `to_timestamp(${Date.now()/1000})`
        }
        await getRepository(Tweets)
            .insert(tweetTwo)
    }
    catch (err) {
        console.log(err)
    }
}

export const closeDB = async () => {
    try {
        console.log('closing test DB...')
        const connection = getConnection();
        await connection.close();
    }
    catch (err) {
        console.log(err)
    }
}