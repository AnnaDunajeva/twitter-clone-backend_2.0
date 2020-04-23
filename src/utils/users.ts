import {getRepository} from "typeorm"
import {Users} from "../entity/Users"
import {Followings} from '../entity/Followings'
import {FormatedUser, UpdateUserData, ExtendedUser, UsersInterface} from '../models/users'
import {formatUser} from '../utils/helpers'
//import {mapKeys} from 'lodash'
// import * as tweetsFunctions from '../utils/tweets'

export const getUserProfile = async (userId: string) => {
    const usersRepo = getRepository(Users)
    const userFromDB = await usersRepo
    .createQueryBuilder("users")
    .leftJoin("users.followings", "followings")
    .where("users.userId =:id", { id: userId })
    .andWhere("users.verifiedAt is not null")
    .select(['followings.followingId', 'users.userId','users.firstName', 'users.lastName','users.createdAt', 'users.avatar', 'users.backgroundColor', 'users.backgroundImage','users.email', 'users.description', 'users.location']) 
    // .addSelect('extract(epoch from users.createdAt)', 'createdAt') //in sec, ??is it number or string?
    //.addSelect('COUNT(followings.followingId)', 'followingsCount') //weird error, dont know how to solve
    .getOne()
    console.log(userFromDB)

    if(!userFromDB) {
        return {}
    }
    
    const user = {
        ...userFromDB,
        followingsCount: userFromDB.followings.length,
        avatar: userFromDB.avatar ? true : false,
        backgroundImage: userFromDB.backgroundImage ? true : false
    } as ExtendedUser

    const followersIds: string[] = await getFollowersIds(userId)
    user.followersCount = followersIds.length
    
    const formatedUser: FormatedUser = formatUser(user)
    
    return {[user.userId]: formatedUser}
}

export const getUnverifiedUserProfile = async (userId: string) => {
    const usersRepo = getRepository(Users)
    const userFromDB = await usersRepo
    .createQueryBuilder("users")
    .leftJoin("users.followings", "followings")
    .where("users.userId =:id", { id: userId })
    .select(['followings.followingId', 'users.userId','users.firstName', 'users.lastName','users.createdAt', 'users.avatar', 'users.backgroundColor', 'users.backgroundImage','users.email', 'users.description', 'users.location', 'users.verifiedAt']) 
    // .addSelect('extract(epoch from users.createdAt)', 'createdAt') //in sec, ??is it number or string?
    //.addSelect('COUNT(followings.followingId)', 'followingsCount') //weird error, dont know how to solve
    .getOne()
    console.log(userFromDB)

    if(!userFromDB) {
        return {}
    }
    
    const user = {
        ...userFromDB,
        followingsCount: userFromDB.followings.length,
        avatar: userFromDB.avatar ? true : false,
        backgroundImage: userFromDB.backgroundImage ? true : false
    } as ExtendedUser

    const followersIds: string[] = await getFollowersIds(userId)
    user.followersCount = followersIds.length
    
    const formatedUser: FormatedUser = formatUser(user)
    
    return {[user.userId]: formatedUser}
}

export const getFollowingsIds = async (userId: string) => {
    const followingsRepo = getRepository(Followings)
    const followings = await followingsRepo.find({where: {userId}, select: ["followingId"], order: {createdAt: 'DESC'}})
    const followingsIds: string[] = followings.map(following => following.followingId)
    return followingsIds
}

export const getFollowersIds = async (userId: string) => {
    const followingsRepo = getRepository(Followings)
    const followers = await followingsRepo.find({where: {followingId: userId}, select: ["userId"], order: {createdAt: 'DESC'}})
    const followersIds: string[] = followers.map(follower => follower.userId)
    return followersIds
}

export const getAllUserIds = async () => {
    const usersRepo = getRepository(Users)
    const users = await usersRepo.find({select: ['userId']})
    const userIds = users.map(user => user.userId)
    return userIds
}

export const getUserFollowingsPaginated = async (authedUser: string, userId: string, skip: number, take: number, firstRequestTime: number) => {
    const followingsRepo = getRepository(Followings)
    const followings  = await followingsRepo
    .createQueryBuilder("followings")
    .select(['followings.followingId', 'followings.createdAt']) 
    .where("followings.userId = :id", { id: userId })
    .andWhere(`followings.createdAt < to_timestamp(${firstRequestTime/1000})`)
    .andWhere('followings.deletedAt is null')
    .take(take)
    .skip(skip)
    .orderBy('followings.createdAt', 'DESC')
    .getMany()

    if (followings.length === 0) {
        return {}
    }

    const followingsIds = followings.map(following => following.followingId)

    const usersRepo = getRepository(Users)
    const users  = await usersRepo
    .createQueryBuilder("users")
    .leftJoin("users.followings", "followings")
    .select(['followings.followingId', 'users.userId','users.firstName', 'users.lastName','users.createdAt', 'users.avatar', 'users.backgroundColor', 'users.backgroundImage','users.description', 'users.location']) 
    .where("users.userId in (:...ids)", { ids: followingsIds })
    // .andWhere("users.verifiedAt is not null")
    .getMany()

    const formatedUsers: UsersInterface = {};

    await Promise.all(followings.map(async(following) => {
        if (following.followingId === authedUser) {
            const authedUserProfile = await getUserProfile(authedUser)
            formatedUsers[authedUser] = authedUserProfile[authedUser]
        } else {
            const userFromDB = users.find(user => user.userId === following.followingId)!
            const user = { 
                ...userFromDB,
                avatar: userFromDB.avatar ? true : false,
                backgroundImage: userFromDB.backgroundImage ? true : false
            } as ExtendedUser
            const followersIds: string[] = await getFollowersIds(userFromDB.userId)
            //const followingsIds = userFromDB.followings.map(following => following.followingId)
    
            user.followersCount = followersIds.length
            user.followingsCount = userFromDB.followings.length
            // user.sortindex = Date.parse(userFromDB.createdAt)
            user.sortindex = Date.parse(following.createdAt)
            user.following = followersIds.includes(authedUser)
    
            formatedUsers[userFromDB.userId] = formatUser(user)
        }
    }))

    return formatedUsers
}

export const getUserFollowersPaginated = async (authedUser: string, userId: string, skip: number, take: number, firstRequestTime: number) => {
    const followingsRepo = getRepository(Followings)
    const followers  = await followingsRepo
    .createQueryBuilder("followings")
    .select(['followings.userId', 'followings.createdAt']) 
    .where("followings.followingId = :id", { id: userId })
    .andWhere(`followings.createdAt < to_timestamp(${firstRequestTime/1000})`)
    .andWhere('followings.deletedAt is null')
    .take(take)
    .skip(skip)
    .orderBy('followings.createdAt', 'DESC')
    .getMany()

    if (followers.length === 0) {
        return {}
    }

    const followersIds = followers.map(follower => follower.userId)

    const usersRepo = getRepository(Users)
    const users  = await usersRepo
        .createQueryBuilder("users")
        .leftJoin("users.followings", "followings")
        .select(['followings.followingId', 'users.userId','users.firstName', 'users.lastName','users.createdAt', 'users.avatar', 'users.backgroundColor', 'users.backgroundImage','users.description', 'users.location']) 
        .where("users.userId in (:...ids)", { ids: followersIds })
        // .andWhere("users.verifiedAt is not null")
        .getMany()

    const formatedUsers: UsersInterface = {};

    await Promise.all(followers.map(async(following) => {
        if (following.userId === authedUser) {
            const authedUserProfile = await getUserProfile(authedUser)
            formatedUsers[authedUser] = authedUserProfile[authedUser]
        } else {
            const userFromDB = users.find(user => user.userId === following.userId)!
            const user = { 
                ...userFromDB,
                avatar: userFromDB.avatar ? true : false,
                backgroundImage: userFromDB.backgroundImage ? true : false
            } as ExtendedUser
            const userFollowersIds: string[] = await getFollowersIds(userFromDB.userId)
    
            user.followersCount = userFollowersIds.length
            user.followingsCount = userFromDB.followings.length
            user.sortindex = Date.parse(following.createdAt)
            user.following = userFollowersIds.includes(authedUser)
    
            formatedUsers[userFromDB.userId] = formatUser(user)
        }
    }))
    return formatedUsers
}

// export const getAllUsersExeptAuthedUser = async (authedUser: string) => {
//     const usersRepo = getRepository(Users)
//     const users  = await usersRepo
//     .createQueryBuilder("users")
//     .leftJoin("users.followings", "followings")
//     .where("users.userId <> :id", { id: authedUser })
//     .select(['users.userId', 'users.firstName', 'users.lastName', 'users.avatar','followings.followingId'])
//     .getMany()
//     const formatedUsers: UsersInterface = {};

//     for (let user of users) {

//         const tweetIds: string[] = await tweetsFunctions.getUserTweetIds(user.userId)
//         const followersIds: string[] = await getFollowersIds(user.userId)
//         const followingsIds = user.followings.map(following => following.followingId)

//         formatedUsers[user.userId] = formatUser(user.userId, user.firstName, user.lastName, user.avatar, tweetIds, followingsIds, followersIds)
//     }
//     return formatedUsers
// }

export const getUsersByIds = async (authedUser: string, ids: string[]) => {
    // const ids = receivedIds.filter(id => id !== authedUser)
    const usersRepo = getRepository(Users)
    console.log('inside getUsersByIds, ids: ', ids)
    const idsWithoutAuthedUser = ids.filter(id => id !== authedUser)
    if (ids.length !== 0) {
        const formatedUsers: UsersInterface = {};
        if (ids.includes(authedUser)) {
            const authedUserProfile = await getUserProfile(authedUser)
            formatedUsers[authedUser] = authedUserProfile[authedUser]
        } 
        if (idsWithoutAuthedUser.length !== 0) {
            const users  = await usersRepo
            .createQueryBuilder("users")
            .leftJoin("users.followings", "followings")
            .where("users.userId IN (:...ids)", { ids: idsWithoutAuthedUser})
            .andWhere("users.verifiedAt is not null")
            .select(['followings.followingId', 'users.userId','users.firstName', 'users.lastName','users.createdAt', 'users.avatar', 'users.backgroundColor', 'users.backgroundImage','users.description', 'users.location']) 
            .getMany()

        
            for (let userFromDB of users) {
                const user = {
                     ...userFromDB, 
                     avatar: userFromDB.avatar ? true : false,
                     backgroundImage: userFromDB.backgroundImage ? true : false
                } as ExtendedUser
                const followersIds: string[] = await getFollowersIds(userFromDB.userId)
        
                user.followersCount = followersIds.length
                user.followingsCount = userFromDB.followings.length
                user.sortindex = Date.parse(userFromDB.createdAt)
                if (user.userId !== authedUser) {
                    user.following = followersIds.includes(authedUser)
                }
        
                formatedUsers[userFromDB.userId] = formatUser(user)
            }
        }
        return formatedUsers
    }
    return {}
}

export const updateUser = async (userId: string, dataToUpdate: UpdateUserData) => {
    console.log(dataToUpdate)
    const usersRepo = getRepository(Users)
    await usersRepo
    .createQueryBuilder('users')
    .update()
    .set(dataToUpdate)
    .where("userId = :userId", { userId })
    .execute();
}

export const deleteFollowing = async (userId: string, followingId: string) => {
    await getRepository(Followings)
    .createQueryBuilder('followings')
    .delete()
    .where("userId = :userId", { userId })
    .andWhere("followingId =:followingId", {followingId})
    .execute();
}

export const getAllUsersPaginated = async (authedUser: string, skip: number, take: number, firstRequestTime: number) => {
    const usersRepo = getRepository(Users)
    const users  = await usersRepo
    .createQueryBuilder("users")
    .leftJoin("users.followings", "followings")
    .select(['followings.followingId', 'users.userId','users.firstName', 'users.lastName','users.createdAt', 'users.avatar', 'users.backgroundColor', 'users.backgroundImage','users.description', 'users.location']) 
    .where("users.userId <> :id", { id: authedUser })
    .andWhere(`users.createdAt < to_timestamp(${firstRequestTime/1000})`) //doesnt work
    .andWhere("users.verifiedAt is not null")
    .take(take)
    .skip(skip)
    .getMany()

    if(users.length === 0) {
        return {}
    }

    const formatedUsers: UsersInterface = {};

    for (let userFromDB of users) {
        const user = { 
            ...userFromDB,
            avatar: userFromDB.avatar ? true : false,
            backgroundImage: userFromDB.backgroundImage ? true : false
        } as ExtendedUser
        const followersIds: string[] = await getFollowersIds(userFromDB.userId)
        //const followingsIds = userFromDB.followings.map(following => following.followingId)

        user.followersCount = followersIds.length
        user.followingsCount = userFromDB.followings.length
        user.sortindex = Date.parse(userFromDB.createdAt)
        user.following = followersIds.includes(authedUser)

        formatedUsers[userFromDB.userId] = formatUser(user)
    }

    //we need sortindex and following properties here (which for now is just createAt in unix)

    return formatedUsers
}

export const findUserPaginated = async (authedUser: string, userToFind: string, skip: number, take: number, firstRequestTime: number) => {
    const usersRepo = getRepository(Users)
    const users  = await usersRepo
    // .createQueryBuilder("users")
    // .leftJoin("users.followings", "followings")
    // .select(['followings.followingId', 'users.userId','users.firstName', 'users.lastName','users.createdAt', 'users.avatar', 'users.backgroundColor', 'users.backgroundImage','users.description', 'users.location']) 
    // .where('users.userId like :id', {id: userToFind+'%'})
    // .andWhere(`users.createdAt < to_timestamp(${firstRequestTime/1000})`) 
    // .andWhere("users.verifiedAt is not null")
    // // .orderBy(`"users"."userId" like '${userToFind}%' or null`)
    // .take(take)
    // .skip(skip)
    // .getMany()

    .createQueryBuilder("users")
    .leftJoin("users.followings", "followings")
    .select(['followings.followingId', 'users.userId','users.firstName', 'users.lastName','users.createdAt', 'users.avatar', 'users.backgroundColor', 'users.backgroundImage','users.description', 'users.location']) 
    .addSelect(
        `ts_rank(
            (
                setweight(to_tsvector('simple', "users"."userId"), 'A') || 
                setweight(to_tsvector('english', "firstName"), 'B') || 
                setweight(to_tsvector('english', "lastName"), 'C')            
            ),
            to_tsquery('simple', '${userToFind}')
        ) +
        ts_rank(
            (
                setweight(to_tsvector('simple', "users"."userId"), 'A') || 
                setweight(to_tsvector('english', "firstName"), 'B') || 
                setweight(to_tsvector('english', "lastName"), 'C')            
            ),
            to_tsquery('simple', '${userToFind}:*')
        )
        `, "result_rank"
    )
    .where(`(
        (
            setweight(to_tsvector('simple', "users"."userId"), 'A') || 
            setweight(to_tsvector('english', "firstName"), 'B') || 
            setweight(to_tsvector('english', "lastName"), 'C')
        ) @@
        (
            to_tsquery('simple', '${userToFind}:*')
        )
    )`)
    .andWhere(`users.createdAt < to_timestamp(${firstRequestTime/1000})`) 
    .andWhere("users.verifiedAt is not null")
    .orderBy("result_rank", 'DESC')
    .take(take)
    .skip(skip)
    .getMany()

    console.log(users)

    if(users.length === 0) {
        return {}
    }

    const formatedUsers: UsersInterface = {};
    await Promise.all(
        users.map(async (userFromDB, index) => {
            const user = { 
                ...userFromDB,
                avatar: userFromDB.avatar ? true : false,
                backgroundImage: userFromDB.backgroundImage ? true : false
            } as ExtendedUser
            const followersIds: string[] = await getFollowersIds(userFromDB.userId)

            user.followersCount = followersIds.length
            user.followingsCount = userFromDB.followings.length
            user.sortindex = index
            user.following = followersIds.includes(authedUser)

            formatedUsers[userFromDB.userId] = formatUser(user)
        })
    )

    //we need sortindex and following properties here (which for now is just createAt in unix)

    return formatedUsers
}