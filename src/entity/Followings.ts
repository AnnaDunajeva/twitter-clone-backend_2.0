import {Entity, ManyToOne, PrimaryColumn, JoinColumn} from "typeorm";
import { Users } from "./Users";

@Entity()
export class Followings {

    @PrimaryColumn()
    userId!: string

    @PrimaryColumn()
    followingId!: string

    @ManyToOne(() => Users, users => users.followings)
    @JoinColumn({name: 'userId'})
    user!: string;

    @ManyToOne(() => Users)
    @JoinColumn({name: 'followingId'})
    following!: string;

}