import { 
    getRepository, 
    SelectQueryBuilder } from "typeorm"
import { Users } from "../entity/Users"
import { Followings } from '../entity/Followings'
import { 
    FormatedUser, 
    UpdateUserData, 
    ExtendedUser, 
    UsersInterface } from '../models/users'
import { formatUser } from '../utils/helpers'
import sharp from 'sharp'
import { omit } from 'lodash'
import {
    sanitazeFirstOrLastname, 
    sanitazeLocation } from '../utils/helpers'


export const getUserProfile = async (userId: string) => {
    const usersRepo = getRepository(Users)
    const userFromDB = await usersRepo
    .createQueryBuilder("users")
    .leftJoin("users.followings", "followings")
    .where("users.userId =:id", { id: userId })
    .andWhere("users.verifiedAt is not null")
    .select(['followings.followingId', 'users.userId','users.firstName', 'users.lastName','users.createdAt', 'users.avatar', 'users.backgroundColor', 'users.backgroundImage','users.email', 'users.description', 'users.location']) 
    .getOne()

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
    .getOne()

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

export const getUsersByIds = async (authedUser: string, ids: string[]) => {
    const usersRepo = getRepository(Users)
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

export const updateUser = async (userId: string, userDataToUpdate: UpdateUserData, file?: Buffer) => {
    
    if (file && userDataToUpdate.backgroundImage && userDataToUpdate.crop) {
        userDataToUpdate.backgroundImage = await sharp(file)
        .extract({
            left: Math.round(userDataToUpdate.crop.x), 
            top: Math.round(userDataToUpdate.crop.y), 
            width: Math.round(userDataToUpdate.crop.width), 
            height: Math.round(userDataToUpdate.crop.height)
        })
        .resize({width: 1000, height: 200})
        .jpeg()
        .toBuffer()
    } else if (file && userDataToUpdate.avatar && userDataToUpdate.crop) {
        userDataToUpdate.avatar = await sharp(file)
        .extract({
            left: Math.round(userDataToUpdate.crop.x), 
            top: Math.round(userDataToUpdate.crop.y), 
            width: Math.round(userDataToUpdate.crop.width), 
            height: Math.round(userDataToUpdate.crop.height)
        })
        .resize({width: 200, height: 200})
        .jpeg()
        .toBuffer()
    }
    if (userDataToUpdate.firstName) {
        if (userDataToUpdate.firstName.length > 100) throw new Error('First name too long.')
        userDataToUpdate.firstName = sanitazeFirstOrLastname(userDataToUpdate.firstName)
    }
    if (userDataToUpdate.lastName) {
        if (userDataToUpdate.lastName.length > 100) throw new Error('Last name too long.')
        userDataToUpdate.lastName = sanitazeFirstOrLastname(userDataToUpdate.lastName)
    }
    if (userDataToUpdate.location) {
        if (userDataToUpdate.location.length > 100) throw new Error('Location too long.')
        userDataToUpdate.location = sanitazeLocation(userDataToUpdate.location.trim())
    }
    if (userDataToUpdate.description) {
        if (userDataToUpdate.description.length > 150) throw new Error('Description too long.')
        userDataToUpdate.description = userDataToUpdate.description.trim().replace(/\s+/g, ' ') //replace whitespaces
    }

    const usersRepo = getRepository(Users)
    await usersRepo
    .createQueryBuilder('users')
    .update()
    .set(omit(userDataToUpdate, 'crop'))
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

//returns paginated users that authedUser is not following, sorted by followersCount
export const getAllUsersPaginated = async (authedUser: string, skip: number, take: number, firstRequestTime: number) => {
    const usersRepo = getRepository(Users)

    const users  = await usersRepo
    .createQueryBuilder("users")
    .leftJoin("users.followings", "followings")
    .leftJoin('users.followers', 'followers')
    .select('users.userId', 'userId') 
    .addSelect('users.firstName', 'firstName')
    .addSelect('users.lastName', 'lastName')
    .addSelect('users.createdAt', 'createdAt')
    .addSelect('users.avatar', 'avatar')
    .addSelect('users.backgroundColor', 'backgroundColor')
    .addSelect('users.backgroundImage', 'backgroundImage')
    .addSelect('users.description', 'description')
    .addSelect('users.location', 'location')
    .addSelect('count(distinct "followings"."followingId")', 'followingsCount')
    .addSelect('count(distinct "followers"."userId")', 'followersCount')
    .addSelect('array_agg(distinct "followers"."userId")', 'followersIds')
    .where("users.userId <> :id", { id: authedUser })
    .andWhere(`users.createdAt < to_timestamp(${firstRequestTime/1000})`) 
    .andWhere("users.verifiedAt is not null")
    .andWhere((qb:SelectQueryBuilder<Users>) => {
        const subQuery = qb.subQuery()
        .from(Followings, "followingsTable")
        .select("followingsTable.followingId")
        .where("followingsTable.userId = :userId", {userId: authedUser})
        .andWhere('followingsTable.deletedAt is null')
        .getQuery()
        return "users.userId not IN " + subQuery
    })
    .take(take)
    .skip(skip)
    .groupBy('users.userId')
    .addGroupBy('users.firstName')
    .addGroupBy('users.lastName')
    .addGroupBy('users.createdAt')
    .addGroupBy('users.avatar')
    .addGroupBy('users.backgroundColor')
    .addGroupBy('users.backgroundImage')
    .addGroupBy('users.description')
    .addGroupBy('users.location')
    .orderBy('count(distinct "followers"."userId")', 'DESC')
    .getRawMany()
    
    console.log(users)

    if(users.length === 0) {
        return {}
    }

    const formatedUsers: UsersInterface = {};

    users.map((userFromDB, index) => {
        const user: ExtendedUser = { 
            ...userFromDB,
            followersCount: parseInt(userFromDB.followersCount),
            followingsCount: parseInt(userFromDB.followingsCount),
            avatar: userFromDB.avatar ? true : false,
            backgroundImage: userFromDB.backgroundImage ? true : false
        }
        user.sortindex = index
        user.following = userFromDB.followersIds.includes(authedUser)

        formatedUsers[userFromDB.userId] = formatUser(user)
    })

    return formatedUsers
}

//finds users by username, first and lastname, sorted by relevance
export const findUserPaginated = async (authedUser: string, userToFind: string, skip: number, take: number, firstRequestTime: number) => {
    const usersRepo = getRepository(Users)
    const users  = await usersRepo

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

    return formatedUsers
}

export const addFollowing = async (userId: string, followingId: string) => {
    const followingsRepo = getRepository(Followings)
        const createdAt = Date.now()
        const following = { 
            userId: userId.toLowerCase(),
            followingId,
            createdAt: () => `to_timestamp(${createdAt/1000})` 
        }
        await followingsRepo
        .createQueryBuilder('followings')
        .insert()
        .values(following)
        .execute();

        const updatedUsers = await getUsersByIds(userId, [userId, followingId])

        return updatedUsers
}