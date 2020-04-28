import {createConnection, getConnection, getRepository} from "typeorm";
import {Users} from "../entity/Users"
import bcrypt from 'bcrypt'
import {Tweets} from "../entity/Tweets"
//============
// CREATE TABLE "session" (
//    "sid" varchar NOT NULL COLLATE "default",
// 	"sess" json NOT NULL,
// 	"expire" timestamp(6) NOT NULL
// )
// WITH (OIDS=FALSE);

// ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

// CREATE INDEX "IDX_session_expire" ON "session" ("expire");
//===============
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
export const setupDB = async () => {
    try {
        console.log("connectiong to test database...")
        await createConnection({
            "type": "postgres",
            "host": process.env.DB_HOST,
            "port": parseInt(process.env.DB_PORT as string),
            "username": process.env.DB_USERNAME,
            "password": process.env.DB_PASSWORD,
            "database": process.env.DB_NAME,
            "dropSchema": true,
            "synchronize": true,
            "logging": false,
            "entities": [
            "src/entity/**/*.ts"
            ],
            "cli": {
            "entitiesDir": "src/entity"
            }
        })
        console.log('setting up test db...')
    
        getConnection().query(`
        CREATE TABLE "session" (
            "sid" varchar NOT NULL COLLATE "default",
             "sess" json NOT NULL,
             "expire" timestamp(6) NOT NULL
         )
         WITH (OIDS=FALSE);
         
         ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
         
         CREATE INDEX "IDX_session_expire" ON "session" ("expire");`)

        //download to DB default profile image

        await getRepository(Users)
            .insert([{
                ...userOne,
                password: await bcrypt.hash(userOne.password, 8)
            }, {
                ...userTwo,
                password: await bcrypt.hash(userTwo.password, 8)
            }])
    
        const tweetOne = { 
            userId: userOne.userId,
            text: 'test',
            parentId: null,
            media: null,
            createdAt: () => `to_timestamp(${Date.now()/1000})`
        }
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