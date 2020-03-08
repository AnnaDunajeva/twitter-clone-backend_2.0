import {Tokens} from '../entity/Tokens'
import {getRepository} from "typeorm"

export const saveToken = async (userId: string, token: string) => {
    const tokensRepo = getRepository(Tokens)

    const databaseToken = new Tokens()
    databaseToken.tokenId = token
    databaseToken.userId = userId
    await tokensRepo.save(databaseToken)
}

export const deleteToken = async (tokenId: string) => {
    const tokensRepo = getRepository(Tokens)
    await tokensRepo
        .createQueryBuilder('tokens')
        .delete()
        .where("tokenId = :tokenId", { tokenId })
        .execute();
}

export const deleteAllTokens = async (userId: string) => {
    const tokensRepo = getRepository(Tokens)
    await tokensRepo
        .createQueryBuilder('tokens')
        .delete()
        .where("userId = :userId", { userId })
        .execute();
}